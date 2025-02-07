import aiohttp
import asyncio
import os
import pyotp
import base64
import json
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Credentials
API_KEY = os.getenv('API_KEY')
API_SECRET = os.getenv('API_SECRET')
BASE_URL = 'https://production-gameflip.fingershock.com/api/v1'

# Generate OTP for authentication
def get_auth_headers(content_type="application/json"):
    try:
        base64.b32decode(API_SECRET)
        secret = API_SECRET
    except:
        secret = base64.b32encode(API_SECRET.encode()).decode()

    totp = pyotp.TOTP(secret)
    otp = totp.now()

    return {
        "Authorization": f"GFAPI {API_KEY}:{otp}",
        "Content-Type": content_type
    }

# API request function
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
                    continue
                else:
                    logging.error(f"API Error: {response_data}")
                    return None
        except Exception as e:
            logging.error(f"Request Error: {str(e)}")
            await asyncio.sleep(1)
    return None



# To integrate your new script into your existing FastAPI backend (main.py), you'll need to break it down into manageable steps. Here’s how you can do it:

# Step 1: Understand the Purpose of Each Script
# Current main.py Functionality
# Imports listings from Gameflip based on given URLs.
# Extracts listing details (title, price, status, images).
# Saves listing information into a JSON file.
# New Script Functionality
# Loads listings from a JSON file.
# Uses authentication to create new listings on Gameflip.
# Uploads images associated with the listing.
# Sets listings to "onsale" status.
# Repeats the process at a defined interval (time_between_listings).
# Step 2: Modifying main.py to Integrate New Functionality
# Tasks to Accomplish:
# Move reusable utility functions (get_auth_headers, api_request, etc.) into a separate module.
# Add an endpoint in main.py to trigger listing creation.
# Store listings in a centralized location to be accessed by both scripts.
# Manage authentication securely with environment variables.
# Refactor the new script so it can be started as part of the FastAPI app.
# Step 3: Implementing the Changes
# 1️⃣ Create a New Utility File: utils.py
# Move all reusable functions into utils.py so they can be used by both main.py and the new script.

# utils.py