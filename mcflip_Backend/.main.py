from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import aiohttp
import asyncio
import json
import pyotp
import base64
import os
import re
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://172.20.10.8:3000"],  # Adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="."))  # Serve static files

BASE_URL = 'https://production-gameflip.fingershock.com/api/v1'
API_KEY = '37b97d0ef690166b4877d5fb3b89b3'
API_SECRET = '6IW2RZNBG5QENQDR34YPHWFZ2WEDQWSH'

class URLList(BaseModel):
    urls: list[str]

def get_auth_headers(content_type="application/json"):
    try:
        base64.b32decode(API_SECRET)
        secret = API_SECRET
    except:
        secret = base64.b32encode(API_SECRET.encode()).decode()

    totp = pyotp.TOTP(secret)
    otp = totp.now()

    headers = {
        "Authorization": f"GFAPI {API_KEY}:{otp}",
        "Content-Type": content_type
    }
    return headers

async def api_request(session, method, endpoint, data=None, params=None, retries=3):
    url = BASE_URL + endpoint
    content_type = "application/json-patch+json" if method.upper() == 'PATCH' else "application/json"

    for attempt in range(retries):
        headers = get_auth_headers(content_type)
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

async def process_url(session, url, batch_dir):
    try:
        listing_id = extract_listing_id(url)
        print(f"\nProcessing listing ID: {listing_id}")

        listing_info = await get_listing(session, listing_id)
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
                            # Crucial: Store the RELATIVE path
                            image_urls.append(os.path.relpath(image_filename, "."))  # Relative to current directory

            listing_info['image_urls'] = image_urls
            return listing_info
        else:
            print(f"Failed to get listing information for {url}")
            return None
    except Exception as e:
        print(f"Error processing {url}: {str(e)}")
        return None

@app.post("/import-listings")
async def import_listings(data: URLList):
    urls = data.urls
    if not urls:
        raise HTTPException(status_code=400, detail="No URLs provided")

    async with aiohttp.ClientSession() as session:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        batch_dir = f'gameflip_data_{timestamp}'
        os.makedirs(batch_dir, exist_ok=True)

        listings = []
        for url in urls:
            listing_data = await process_url(session, url, batch_dir)
            if listing_data:
                listings.append(listing_data)

    json_filename = os.path.join(batch_dir, 'listings.json')
    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump(listings, f, indent=2, ensure_ascii=False)

    return {"message": "Import completed", "count": len(listings), "data": listings, "json_file": json_filename}

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

async def get_listing(session, listing_id):
    endpoint = f'/listing/{listing_id}'
    data = await api_request(session, 'GET', endpoint)
    if data and 'data' in data:
        return data['data']
    return None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)


#  allow_origins=["http://localhost:3000", "http://172.20.10.8:3000"], 