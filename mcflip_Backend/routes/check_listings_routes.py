# from fastapi import APIRouter, HTTPException
# import aiohttp
# import asyncio
# import pyotp
# import os
# from typing import Dict

# # Create an API router
# router = APIRouter()

# # Gameflip API credentials and base URL
# BASE_URL = os.getenv("BASE_URL")
# API_KEY = os.getenv("API_KEY")
# API_SECRET = os.getenv("API_SECRET")

# # Initialize TOTP
# totp = pyotp.TOTP(API_SECRET)
# headers = {"Authorization": f"GFAPI {API_KEY}:{totp.now()}"}

# async def reset_totp():
#     """Reset TOTP token and update headers."""
#     await asyncio.sleep(1)
#     totp_code = totp.now()
#     headers["Authorization"] = f"GFAPI {API_KEY}:{totp_code}"
#     return headers

# def restart_if_failed(func):
#     """Decorator to handle API failures and retry with new TOTP."""
#     async def wrapper(*args, **kwargs):
#         max_retries = 3
#         for attempt in range(max_retries):
#             try:
#                 data = await func(*args, **kwargs)
#                 if isinstance(data, dict) and data.get("status") == "FAILURE":
#                     error_msg = data.get("error", {}).get("message", "")
#                     if "Invalid api otp" in error_msg:
#                         await reset_totp()
#                         continue
#                     elif "Too many attempts" in error_msg:
#                         await asyncio.sleep(2)
#                         continue
#                 return data
#             except Exception as e:
#                 if attempt == max_retries - 1:
#                     raise HTTPException(status_code=500, detail=f"API Error: {str(e)}")
#                 await asyncio.sleep(1)
#                 await reset_totp()
#         return None
#     return wrapper

# @restart_if_failed
# async def get_my_account_id(session: aiohttp.ClientSession) -> str:
#     """Get the current user's account ID."""
#     async with session.get("https://production-gameflip.fingershock.com/api/v1/account/me/profile", headers=headers) as response:
#         data = await response.json()
#         return data["data"].get("owner")

# @restart_if_failed
# async def get_my_listings(session: aiohttp.ClientSession, account_id: str, start_param: int) -> Dict:
#     """Get a page of listings."""
#     params = {"owner": account_id, "start": start_param, "limit": 100, "status": "onsale"}
#     async with session.get("https://production-gameflip.fingershock.com/api/v1/listing", params=params, headers=headers) as response:
#         return await response.json()

# async def count_listings():
#     """Count all listings."""
#     async with aiohttp.ClientSession() as session:
#         account_id = await get_my_account_id(session)
#         if not account_id:
#             raise HTTPException(status_code=400, detail="Failed to retrieve account ID")
        
#         total_listings = 0
#         start_param = 0
#         while True:
#             results = await get_my_listings(session, account_id, start_param)
#             batch_listings = len(results.get("data", []))
#             total_listings += batch_listings
#             if batch_listings < 100:
#                 break
#             start_param += 100
#         return {"total_listings": total_listings}

# @router.get("/count-listings")
# async def get_listing_count():
#     """API endpoint to count listings."""
#     return await count_listings()


from fastapi import APIRouter, HTTPException, Query
import aiohttp
import asyncio
import pyotp
from typing import Dict, Optional

router = APIRouter()

BASE_URL = "https://production-gameflip.fingershock.com/api/v1"

async def get_auth_headers(api_key: str, api_secret: str):
    """Generate authentication headers dynamically."""
    try:
        totp = pyotp.TOTP(api_secret)
        otp = totp.now()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid API Secret format: {str(e)}")

    return {
        "Authorization": f"GFAPI {api_key}:{otp}",
        "Content-Type": "application/json"
    }

async def get_my_account_id(session: aiohttp.ClientSession, headers: dict) -> str:
    """Get the current user's account ID."""
    url = f"{BASE_URL}/account/me/profile"
    async with session.get(url, headers=headers) as response:
        data = await response.json()
        if response.status != 200 or "data" not in data:
            raise HTTPException(status_code=400, detail=f"Failed to fetch account ID: {data}")
        return data["data"].get("owner")

async def get_my_listings(session: aiohttp.ClientSession, account_id: str, headers: dict, start_param: int) -> Dict:
    """Get a page of listings."""
    params = {"owner": account_id, "start": start_param, "limit": 100, "status": "onsale"}
    url = f"{BASE_URL}/listing"

    async with session.get(url, params=params, headers=headers) as response:
        if response.status != 200:
            raise HTTPException(status_code=response.status, detail="Failed to fetch listings")
        return await response.json()

@router.get("/count-listings")
async def get_listing_count(
    apiKey: Optional[str] = Query(None), 
    apiSecret: Optional[str] = Query(None)
):
    """API endpoint to count listings using API key and secret from query params."""
    if not apiKey or not apiSecret:
        raise HTTPException(status_code=400, detail="Missing API key or secret in query parameters")

    async with aiohttp.ClientSession() as session:
        headers = await get_auth_headers(apiKey, apiSecret)

        try:
            account_id = await get_my_account_id(session, headers)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

        total_listings = 0
        start_param = 0

        while True:
            try:
                results = await get_my_listings(session, account_id, headers, start_param)
                batch_listings = len(results.get("data", []))
                total_listings += batch_listings
                if batch_listings < 100:
                    break
                start_param += 100
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error fetching listings: {str(e)}")

        return {"total_listings": total_listings}
