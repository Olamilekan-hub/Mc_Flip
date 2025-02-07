from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
import aiohttp
import asyncio
import pyotp
import json
import logging
import os
from dotenv import load_dotenv

# Configure logging to track API calls and errors
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Create a FastAPI router for handling listing-related operations
router = APIRouter()

# Load environment variables from .env file
load_dotenv()
BASE_URL = os.getenv("BASE_URL")
API_KEY = os.getenv("API_KEY")
API_SECRET = os.getenv("API_SECRET")

# Generate OTP authentication instance using API secret
totp = pyotp.TOTP(API_SECRET)

def get_auth_headers(content_type="application/json"):
    return {
        "Authorization": f"GFAPI {API_KEY}:{totp.now()}",
        "Content-Type": content_type
    }

async def api_request(session, method, endpoint, data=None, retries=3):
    url = BASE_URL + endpoint
    content_type = "application/json-patch+json" if method.upper() == 'PATCH' else "application/json"
    for attempt in range(retries):
        headers = get_auth_headers(content_type)
        try:
            async with getattr(session, method.lower())(url, headers=headers, json=data) as response:
                response_data = await response.json()
                if response.status == 200:
                    return response_data
                elif response_data.get('error', {}).get('message') == 'Invalid api otp':
                    logging.warning("Invalid OTP. Retrying...")
                    await asyncio.sleep(1)
                else:
                    logging.error(f"API request failed: {response_data}")
                    return None
        except Exception as e:
            logging.error(f"Request error: {str(e)}")
            await asyncio.sleep(1)
    return None

# Pydantic models
class ListingModel(BaseModel):
    id: str
    kind: str
    description: str
    owner: str
    category: str
    name: str
    price: int
    accept_currency: str
    upc: str
    cognitoidp_client: str
    tags: List[str]
    digital: bool
    digital_deliverable: str
    photo: dict
    status: str
    shipping_fee: int
    shipping_paid_by: str
    shipping_within_days: int
    expire_in_days: int
    visibility: str

class ListingsData(BaseModel):
    listings: List[ListingModel]

class ListingData(BaseModel):
    listing: dict

@router.post("/post-listings")
async def post_listings(data: ListingsData):
    """
    Creates multiple listings on Gameflip.
    """
    async with aiohttp.ClientSession() as session:
        results = []
        for listing in data.listings:
            logging.info(f"Posting listing: {listing.name}")
            
            response = await api_request(session, 'POST', '/listing', data=listing.dict())
            if response and response.get('status') == 'SUCCESS':
                results.append({
                    "listing": listing.name,
                    "status": "Success",
                    "data": response['data']
                })
            else:
                results.append({
                    "listing": listing.name,
                    "status": "Failed"
                })

        successful_listings = len([r for r in results if r["status"] == "Success"])
        if successful_listings == 0:
            raise HTTPException(status_code=400, detail="Failed to create any listings")

        return {
            "message": f"Successfully created {successful_listings} out of {len(data.listings)} listings",
            "results": results
        }

# @router.post("/post-listing")
# async def post_listing(data: ListingData):
#     """
#     Creates a single listing on Gameflip.
#     """
#     async with aiohttp.ClientSession() as session:
#         response = await api_request(session, 'POST', '/listing', data=data.listing)
#         if response and response.get('status') == 'SUCCESS':
#             return {"message": "Listing created successfully", "data": response['data']}
#         raise HTTPException(status_code=400, detail="Failed to create listing")