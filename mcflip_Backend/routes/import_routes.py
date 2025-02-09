from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
import aiohttp
import asyncio
import json
import pyotp
import base64
import os
import re
from datetime import datetime
from utils.auth import get_auth_headers 

# Create an API router for handling import-related endpoints
router = APIRouter()

# Gameflip API credentials and base URL
BASE_URL = os.getenv("BASE_URL")
# API_KEY = os.getenv("API_KEY")
# API_SECRET = os.getenv("API_SECRET")

# Define a Pydantic model to validate incoming request data
class URLList(BaseModel):
    urls: list[str]

# Function to generate authentication headers for API requests
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

# Function to make API requests with retry logic
async def api_request(session, method, endpoint, api_key, api_secret, data=None, params=None, retries=3):
    url = BASE_URL + endpoint
    content_type = "application/json-patch+json" if method.upper() == 'PATCH' else "application/json"

    for attempt in range(retries):
        headers = get_auth_headers(api_key, api_secret, content_type)
        try:
            async with getattr(session, method.lower())(url, headers=headers, json=data, params=params) as response:
                response_data = await response.json()
                if response.status == 200:
                    return response_data
                elif response_data.get('error', {}).get('message') == 'Invalid api otp':
                    print("Invalid OTP. Retrying...")
                    await asyncio.sleep(1)
                    continue
                else:
                    print(f"Error: {response_data}")
                    return None
        except Exception as e:
            print(f"Error: {str(e)}")
            await asyncio.sleep(1)
    return None


# Function to download an image from a URL and save it locally
async def download_image(session, url, filename):
    try:
        async with session.get(url) as response:
            if response.status == 200:
                with open(filename, 'wb') as f:
                    f.write(await response.read())
                return True
            else:
                print(f"Failed to download image: HTTP {response.status}")
                return False
    except Exception as e:
        print(f"Error downloading image: {str(e)}")
        return False

# Function to process a listing URL and extract relevant information
async def process_url(session, url, batch_dir, api_key, api_secret):
    try:
        listing_id = extract_listing_id(url)
        print(f"\nProcessing listing ID: {listing_id}")

        listing_info = await get_listing(session, api_key, api_secret, listing_id)
        if listing_info:
            print(f"Title: {listing_info.get('name', 'N/A')}")
            print(f"Price: ${listing_info.get('price', 'N/A')}")
            print(f"Status: {listing_info.get('status', 'N/A')}")

            image_urls = []
            if 'photo' in listing_info and listing_info['photo']:
                images_dir = os.path.join(batch_dir, 'images')
                os.makedirs(images_dir, exist_ok=True)

                for photo_id, photo_data in listing_info['photo'].items():
                    if 'view_url' in photo_data:
                        image_filename = os.path.join(images_dir, f"{listing_id}_{photo_id}.jpg")
                        if await download_image(session, photo_data['view_url'], image_filename):
                            print(f"Downloaded image to {image_filename}")
                            image_urls.append(os.path.relpath(image_filename, "."))

            listing_info['image_urls'] = image_urls
            return listing_info
        else:
            print(f"Failed to get listing information for {url}")
            return None
    except Exception as e:
        print(f"Error processing {url}: {str(e)}")
        return None

# API endpoint to import multiple listings from provided URLs
@router.post("/import-listings")
async def import_listings(request: Request, data: URLList):
    body = await request.json()
    api_key = body.get("api_key")
    api_secret = body.get("api_secret")

    if not api_key or not api_secret:
        raise HTTPException(status_code=400, detail="API Key and Secret required")

    urls = data.urls
    if not urls:
        raise HTTPException(status_code=400, detail="No URLs provided")

    async with aiohttp.ClientSession() as session:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        batch_dir = f'gameflip_data_{timestamp}'
        os.makedirs(batch_dir, exist_ok=True)

        listings = []
        for url in urls:
            listing_data = await process_url(session, url, batch_dir, api_key, api_secret)
            if listing_data:
                listings.append(listing_data)

    json_filename = os.path.join(batch_dir, 'listings.json')
    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump(listings, f, indent=2, ensure_ascii=False)

    return {"message": "Import completed", "count": len(listings), "data": listings, "json_file": json_filename}


# Function to extract listing ID from a given URL using regex patterns
def extract_listing_id(url):
    patterns = [
        r'gameflip\.com/(?:item|listing)/[^/]+/([a-zA-Z0-9-]+)',
        r'gameflip\.com/(?:i|p)/([a-zA-Z0-9-]+)',
        r'gameflip\.com/(?:item|listing)/([a-zA-Z0-9-]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError(f"Could not extract listing ID from the URL: {url}")

# Function to retrieve listing details from the API using listing ID
async def get_listing(session, api_key, api_secret, listing_id):
    endpoint = f'/listing/{listing_id}'
    data = await api_request(session, 'GET', endpoint, api_key, api_secret )
    if data and 'data' in data:
        return data['data']
    return None