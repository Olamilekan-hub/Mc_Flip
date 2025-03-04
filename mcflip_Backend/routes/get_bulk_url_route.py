from fastapi import APIRouter, HTTPException, Header
import aiohttp
import asyncio
import pyotp
import hashlib
import os
from typing import List, Dict
from pathlib import Path

router = APIRouter()
BASE_URL = os.getenv("BASE_URL")

# Function to generate authentication headers for API requests
def get_auth_headers(api_key: str, api_secret: str) -> Dict[str, str]:
    """Generate authentication headers with a fresh TOTP token using user-provided API credentials."""
    totp = pyotp.TOTP(api_secret)
    return {
        "Authorization": f"GFAPI {api_key}:{totp.now()}",
        "Content-Type": "application/json"
    }

async def make_request(session: aiohttp.ClientSession, url: str, api_key: str, api_secret: str, params: Dict = None) -> Dict:
    """Make an API request with error handling and retry logic."""
    for _ in range(3):  # Max retries
        headers = get_auth_headers(api_key, api_secret)
        try:
            async with session.get(url, params=params, headers=headers) as response:
                data = await response.json()
                print(f"ijhugyf", data)
                if response.status == 200 and data.get('status') != 'FAILURE':
                    return data
                elif "Invalid api otp" in data.get("error", {}).get("message", ""):
                    await asyncio.sleep(1)  # Allow time for a new OTP
        except Exception as e:
            print(f"Request error: {e}")
            await asyncio.sleep(1)
    return {}

async def get_account_id(session: aiohttp.ClientSession, api_key: str, api_secret: str) -> str:
    """Fetch the authenticated user's account ID."""
    url = f"{BASE_URL}/account/me/profile"
    data = await make_request(session, url, api_key, api_secret)
    return data.get("data", {}).get("owner", "")

async def get_listings(session: aiohttp.ClientSession, account_id: str, api_key: str, api_secret: str) -> List[Dict]:
    """Fetch listings from GameFlip."""
    listings = []
    start = 0
    batch_size = 100

    while True:
        url = f"{BASE_URL}/listing"
        params = {"owner": account_id, "start": start, "limit": batch_size, "status": "onsale"}
        data = await make_request(session, url, api_key, api_secret, params)

        if not data or 'data' not in data:
            break

        listings.extend(data['data'])
        if len(data['data']) < batch_size:
            break  # End of listings

        start += batch_size
        await asyncio.sleep(0.1)
    
    return listings

def format_listing_url(listing: Dict) -> str:
    """Generate the listing's public URL."""
    return f"https://gameflip.com/item/{listing.get('id', '')}"

@router.get("/gameflip/listings")
async def fetch_listings(apiKey: str = Header(...), apiSecret: str = Header(...)):
    """Fetch and return unique GameFlip listings based on combined properties."""
    async with aiohttp.ClientSession() as session:
        account_id = await get_account_id(session, apiKey, apiSecret)
        if not account_id:
            raise HTTPException(status_code=400, detail="Failed to retrieve account ID.")

        listings = await get_listings(session, account_id, apiKey, apiSecret)
        
        # Dictionary to track unique listings
        unique_listings = {}
        
        for listing in listings:
            # Create a combined key for uniqueness check
            combined = (
                f"{listing.get('name', '').strip().lower()}"
                f"{str(listing.get('price', 0))}"
                f"{listing.get('description', '').strip().lower()}"
                f"{listing.get('platform', '').strip().lower()}"
                f"{listing.get('category', '').strip().lower()}"
                f"{str(listing.get('tags', []))}"
            )
            
            # Store the listing URL using the combined key
            unique_listings[combined] = format_listing_url(listing)
        
        # Get the unique URLs
        unique_urls = list(unique_listings.values())
    
    return {"count": len(unique_urls), "urls": unique_urls}
