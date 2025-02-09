from fastapi import APIRouter, HTTPException, Depends, Request
import aiohttp
import asyncio
import json
import pyotp
import base64
import os
import logging
from datetime import datetime, timezone

# Initialize router
router = APIRouter()

# Set base URL for Gameflip API
BASE_URL = "https://production-gameflip.fingershock.com/api/v1"
LISTINGS_ENDPOINT = f"{BASE_URL}/listing"
PROFILE_ENDPOINT = f"{BASE_URL}/account/me/profile"

# Constants
DELETE_THRESHOLD_HOURS = 0  # Default, will be overridden by request
MAX_RETRIES = 2
DELAY_BETWEEN_OPERATIONS = 1

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# Function to generate authentication headers
def get_auth_headers(api_key: str, api_secret: str, content_type="application/json"):
    try:
        base64.b32decode(api_secret)  # Validate API_SECRET format
    except:
        api_secret = base64.b32encode(api_secret.encode()).decode()

    totp = pyotp.TOTP(api_secret)  # Generate one-time password (OTP)
    otp = totp.now()

    headers = {
        "Authorization": f"GFAPI {api_key}:{otp}",
        "Content-Type": content_type
    }
    return headers

# Function to make API requests with retries
async def api_request(session, method, url, headers, **kwargs):
    for attempt in range(MAX_RETRIES):
        try:
            async with session.request(method, url, headers=headers, **kwargs) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_data = await response.json()
                    logging.error(f"API Error: {error_data}")
                    if "Invalid api otp" in str(error_data):
                        headers = get_auth_headers(headers["Authorization"].split(" ")[1].split(":")[0], headers["Authorization"].split(" ")[1].split(":")[1])
                        await asyncio.sleep(1)
                    elif "Too many attempts" in str(error_data):
                        await asyncio.sleep(60)
                    else:
                        break
        except Exception as e:
            logging.error(f"Request error: {str(e)}")
            if attempt == MAX_RETRIES - 1:
                return None
        await asyncio.sleep(2 ** attempt)
    return None

# Function to get account ID
async def get_my_account_id(session, headers):
    data = await api_request(session, "GET", PROFILE_ENDPOINT, headers=headers)
    if data and "data" in data:
        return data["data"]["owner"]
    return None

# Function to get on-sale listings
async def get_my_listings(session, headers, account_id, start_param):
    params = {"owner": account_id, "start": start_param, "limit": 100, "status": "onsale"}
    data = await api_request(session, "GET", LISTINGS_ENDPOINT, headers=headers, params=params)
    return data["data"] if data and "data" in data else []

# Function to change a listing to draft
async def change_listing_to_draft(session, headers, listing_id):
    update = [{"op": "replace", "path": "/status", "value": "draft"}]
    patch_headers = {**headers, "Content-Type": "application/json-patch+json"}
    data = await api_request(session, "PATCH", f"{LISTINGS_ENDPOINT}/{listing_id}", headers=patch_headers, json=update)
    return data and data.get("status") == "SUCCESS"

# Function to delete a listing
async def delete_listing(session, headers, listing_id):
    data = await api_request(session, "DELETE", f"{LISTINGS_ENDPOINT}/{listing_id}", headers=headers)
    return data and data.get("status") == "SUCCESS"

# Function to process and delete old listings
async def process_old_onsale_listings(session, headers, account_id, delete_threshold_hours):
    start_param = 0
    drafted_count, deleted_count = 0, 0
    failed_draft_count, failed_delete_count = 0, 0

    logging.info(f"Starting deletion of listings older than {delete_threshold_hours} hours")

    while True:
        listings = await get_my_listings(session, headers, account_id, start_param)
        if not listings:
            break
        
        current_time = datetime.now(timezone.utc)
        for listing in listings:
            created_time = datetime.strptime(listing["created"], "%Y-%m-%dT%H:%M:%S.%fZ").replace(tzinfo=timezone.utc)
            age_hours = (current_time - created_time).total_seconds() / 3600

            if age_hours > delete_threshold_hours:
                logging.info(f"Processing listing {listing['id']} - Age: {age_hours:.2f} hours")
                
                if await change_listing_to_draft(session, headers, listing["id"]):
                    drafted_count += 1
                    logging.info(f"Listing {listing['id']} changed to draft")
                    await asyncio.sleep(DELAY_BETWEEN_OPERATIONS)
                    
                    if await delete_listing(session, headers, listing["id"]):
                        deleted_count += 1
                        logging.info(f"Deleted listing {listing['id']}")
                    else:
                        failed_delete_count += 1
                        logging.error(f"Failed to delete listing {listing['id']}")
                else:
                    failed_draft_count += 1
                    logging.error(f"Failed to change listing {listing['id']} to draft")
                
                await asyncio.sleep(DELAY_BETWEEN_OPERATIONS)
        
        start_param += 100
    
    return {
        "drafted": drafted_count,
        "deleted": deleted_count,
        "failed_draft": failed_draft_count,
        "failed_delete": failed_delete_count
    }

# API Route to delete old listings
@router.post("/delete-old-listings")
async def delete_old_listings(request: Request):
    body = await request.json()
    api_key = body.get("api_key")
    api_secret = body.get("api_secret")
    delete_threshold = float(body.get("delete_threshold", 0))

    if not api_key or not api_secret:
        raise HTTPException(status_code=400, detail="API Key and Secret are required")

    async with aiohttp.ClientSession() as session:
        headers = get_auth_headers(api_key, api_secret)
        account_id = await get_my_account_id(session, headers)

        if not account_id:
            raise HTTPException(status_code=400, detail="Failed to retrieve account ID")

        logging.info(f"Account ID: {account_id} - Deleting listings older than {delete_threshold} hours")
        results = await process_old_onsale_listings(session, headers, account_id, delete_threshold)

    return {"message": "Processing completed", "results": results}
