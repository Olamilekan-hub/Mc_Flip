from fastapi import APIRouter, HTTPException, Query
import aiohttp
import asyncio
import pyotp
from typing import Dict, Optional, List

router = APIRouter()

BASE_URL = "https://production-gameflip.fingershock.com/api/v1"

async def reset_totp(api_key: str, api_secret: str):
    """Reset TOTP token and update headers."""
    await asyncio.sleep(1)
    totp = pyotp.TOTP(api_secret)
    totp_code = totp.now()
    headers = {
        "Authorization": f"GFAPI {api_key}:{totp_code}",
        "Content-Type": "application/json"
    }
    print(f"[AUTH] TOTP token reset: {totp_code}")
    return headers

def restart_if_failed(func):
    """Decorator to handle API failures and retry with new TOTP."""
    async def wrapper(*args, **kwargs):
        api_key = kwargs.get('api_key')
        api_secret = kwargs.get('api_secret')
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                data = await func(*args, **kwargs)
                if isinstance(data, dict) and data.get("status") == "FAILURE":
                    error_msg = data.get("error", {}).get("message", "")
                    if "Invalid api otp" in error_msg:
                        print(f"[ERROR] Invalid TOTP token, resetting... (Attempt {attempt + 1})")
                        kwargs['headers'] = await reset_totp(api_key, api_secret)
                        continue
                    elif "Too many attempts" in error_msg:
                        print(f"[ERROR] Too many attempts, waiting... (Attempt {attempt + 1})")
                        await asyncio.sleep(2)
                        continue
                return data
            except Exception as e:
                print(f"[ERROR] Error in {func.__name__}: {str(e)} (Attempt {attempt + 1})")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(1)
                kwargs['headers'] = await reset_totp(api_key, api_secret)
        return None
    return wrapper

@restart_if_failed
async def get_my_account_id(session: aiohttp.ClientSession, headers: dict, api_key: str = None, api_secret: str = None) -> Optional[str]:
    """Get the current user's account ID."""
    print("[ACCOUNT] Getting account ID...")
    url = f"{BASE_URL}/account/me/profile"
    async with session.get(url, headers=headers) as response:
        data = await response.json()
        if 'data' not in data or 'owner' not in data['data']:
            print(f"[ACCOUNT] Unexpected response from get_my_account_id: {data}")
            return None
        account_id = data["data"]["owner"]
        print(f"[ACCOUNT] Account ID retrieved: {account_id}")
        return account_id

@restart_if_failed
async def get_my_listings(session: aiohttp.ClientSession, account_id: str, start_param: int, headers: dict, api_key: str = None, api_secret: str = None) -> Dict:
    """Get a page of listings with count."""
    print(f"[LISTINGS] Fetching listings starting at index {start_param}...")
    params = {
        "owner": account_id,
        "start": start_param,
        "limit": 100,
        "status": "onsale"
    }
    url = f"{BASE_URL}/listing"
    try:
        async with session.get(url, params=params, headers=headers) as response:
            # Check HTTP status first
            if response.status == 429:  # Too Many Requests
                print(f"[LISTINGS] Rate limited (429) at index {start_param}, waiting and retrying...")
                await asyncio.sleep(2)  # Wait 2 seconds before retry
                return await get_my_listings(session, account_id, start_param, headers, api_key, api_secret)
            elif response.status != 200:
                print(f"[LISTINGS] HTTP error {response.status} at index {start_param}")
                return {"data": [], "http_error": response.status}
                
            data = await response.json()
            if 'data' not in data:
                print(f"[LISTINGS] Unexpected response from get_my_listings: {data}")
                return {"data": []}
                
            listings_count = len(data["data"])
            print(f"[LISTINGS] Found {listings_count} listings in batch starting at {start_param}")
            
            # Check if we got fewer than the requested limit (indicator of end of data)
            is_last_page = listings_count < 100
            return {"data": data["data"], "is_last_page": is_last_page}
    except Exception as e:
        print(f"[LISTINGS] Error fetching listings at index {start_param}: {str(e)}")
        return {"data": [], "error": str(e)}

async def fetch_listings_page(session: aiohttp.ClientSession, account_id: str, start_param: int, headers: dict, api_key: str, api_secret: str):
    """Fetch a single page of listings."""
    try:
        listings = await get_my_listings(session, account_id, start_param, headers, api_key, api_secret)
        return listings if listings is not None else {"data": []}
    except Exception as e:
        print(f"[ERROR] Error in fetch_listings_page at index {start_param}: {str(e)}")
        return {"data": []}

@router.get("/count-listings")
async def get_listing_count(
    apiKey: Optional[str] = Query(None), 
    apiSecret: Optional[str] = Query(None),
    parallelRequests: Optional[int] = Query(5),  # Default to 5 parallel requests
    maxRetries: Optional[int] = Query(3),        # Number of retries for rate-limited requests
    maxPages: Optional[int] = Query(1000)        # Safety limit for maximum pages to fetch
):
    """API endpoint to count listings using API key and secret from query params."""
    print(f"[ENDPOINT] /count-listings endpoint called with API key: {apiKey[:4] + '...' if apiKey else 'None'}")
    
    if not apiKey or not apiSecret:
        print("[ENDPOINT ERROR] Missing API credentials")
        raise HTTPException(status_code=400, detail="Missing API key or secret in query parameters")

    # Validate and cap parameters
    parallel_requests = max(1, min(parallelRequests, 10))
    max_retries = max(1, min(maxRetries, 5))
    max_pages = max(1, min(maxPages, 1000))
    
    print(f"[ENDPOINT] Using {parallel_requests} parallel requests with {max_retries} max retries")
    
    async with aiohttp.ClientSession() as session:
        try:
            # Initialize TOTP
            headers = await reset_totp(apiKey, apiSecret)
            
            # Get account ID
            account_id = await get_my_account_id(session, headers, apiKey, apiSecret)
            if account_id is None:
                print("[ENDPOINT ERROR] Failed to get account ID")
                raise HTTPException(status_code=400, detail="Failed to get account ID")

            print("[ENDPOINT] Beginning listing count...")
            total_listings = 0
            start_param = 0
            batch_number = 1
            consecutive_empty_batches = 0
            max_empty_batches = 2  # Stop after this many consecutive empty batches
            rate_limit_count = 0
            page_count = 0

            # Keep track of requests that need to be retried
            retry_queue = []
            
            while batch_number <= max_pages:
                print(f"[ENDPOINT] Processing batch {batch_number}...")
                
                # First, handle any retries from previous batches
                if retry_queue:
                    print(f"[ENDPOINT] Processing {len(retry_queue)} retries from previous batches")
                    current_batch = retry_queue
                    retry_queue = []
                else:
                    # Normal processing - create tasks for new pages
                    current_batch = [
                        (start_param + i * 100) for i in range(parallel_requests)
                    ]
                
                tasks = [
                    fetch_listings_page(session, account_id, page_start, headers, apiKey, apiSecret) 
                    for page_start in current_batch
                ]
                
                print(f"[ENDPOINT] Waiting for {len(tasks)} requests to complete...")
                results = await asyncio.gather(*tasks, return_exceptions=False)
                
                # Process results and update metrics
                batch_listings = 0
                end_of_data_detected = False
                rate_limited = False
                
                for i, result in enumerate(results):
                    page_start = current_batch[i]
                    
                    if not result or not isinstance(result, dict):
                        print(f"[ENDPOINT] Invalid result for page at {page_start}")
                        continue
                        
                    if "http_error" in result and result["http_error"] == 429:
                        # This page was rate limited
                        rate_limit_count += 1
                        if rate_limit_count < max_retries:
                            print(f"[ENDPOINT] Rate limited at {page_start}, adding to retry queue")
                            retry_queue.append(page_start)
                            rate_limited = True
                        continue
                    
                    # Count listings from this page
                    page_listings = len(result.get("data", []))
                    batch_listings += page_listings
                    
                    # Check if this is the last page of data
                    if "is_last_page" in result and result["is_last_page"]:
                        print(f"[ENDPOINT] End of data detected at page {page_start}")
                        end_of_data_detected = True
                
                # Update total count
                total_listings += batch_listings
                print(f"[ENDPOINT] Batch {batch_number} complete: Found {batch_listings} listings")
                print(f"[ENDPOINT] Running total: {total_listings} listings")
                
                # Handle empty batches
                if batch_listings == 0 and not rate_limited:
                    consecutive_empty_batches += 1
                    print(f"[ENDPOINT] Empty batch detected ({consecutive_empty_batches}/{max_empty_batches})")
                else:
                    consecutive_empty_batches = 0
                
                # Determine if we should stop
                if end_of_data_detected or consecutive_empty_batches >= max_empty_batches:
                    print(f"[ENDPOINT] Reached end of listings.")
                    break
                
                # If we have retries, process them before moving to the next batch
                if retry_queue:
                    print(f"[ENDPOINT] Will retry {len(retry_queue)} pages before moving to next batch")
                    await asyncio.sleep(1)  # Small delay before retries
                    continue
                    
                # Move to next batch
                start_param += parallel_requests * 100
                batch_number += 1
                page_count += parallel_requests
                
                # Rate limiting protection - sleep briefly between batches
                await asyncio.sleep(0.5)
                
                # Refresh TOTP periodically
                if batch_number % 10 == 0:
                    print("[AUTH] Refreshing TOTP token")
                    headers = await reset_totp(apiKey, apiSecret)

            print(f"[ENDPOINT] Final count - Total active listings: {total_listings}")
            return {
                "total_listings": total_listings,
                "pages_processed": page_count,
                "complete": True
            }

        except Exception as e:
            print(f"[ENDPOINT ERROR] An error occurred: {str(e)}")
            # Return partial results if we have them
            if total_listings > 0:
                return {
                    "total_listings": total_listings,
                    "complete": False,
                    "error": str(e)
                }
            else:
                raise HTTPException(status_code=500, detail=f"Error counting listings: {str(e)}")
