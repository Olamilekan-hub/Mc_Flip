from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
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

# Function to create authentication headers for API requests
def get_auth_headers(content_type="application/json"):
    """
    Generates headers required for API authentication, including OTP.
    """
    return {
        "Authorization": f"GFAPI {API_KEY}:{totp.now()}",
        "Content-Type": content_type
    }

# Function to make API requests with retry logic
async def api_request(session, method, endpoint, data=None, retries=3):
    """
    Sends an API request and retries if an OTP error occurs.
    """
    url = BASE_URL + endpoint
    content_type = "application/json-patch+json" if method.upper() == 'PATCH' else "application/json"
    for attempt in range(retries):
        headers = get_auth_headers(content_type)
        try:
            async with getattr(session, method.lower())(url, headers=headers, json=data) as response:
                response_data = await response.json()
                if response.status == 200:
                    return response_data  # Return response if successful
                elif response_data.get('error', {}).get('message') == 'Invalid api otp':
                    logging.warning("Invalid OTP. Retrying...")
                    await asyncio.sleep(1)  # Wait before retrying with a new OTP
                else:
                    logging.error(f"API request failed: {response_data}")
                    return None
        except Exception as e:
            logging.error(f"Request error: {str(e)}")
            await asyncio.sleep(1)  # Wait before retrying
    return None

# Pydantic model to validate incoming listing data
class ListingData(BaseModel):
    listing: dict  # Dictionary containing listing details

# Endpoint to post a new listing
@router.post("/post-listing")
async def post_listing(data: ListingData):
    """
    Creates a new listing on Gameflip.
    """
    async with aiohttp.ClientSession() as session:
        response = await api_request(session, 'POST', '/listing', data=data.listing)
        if response and response.get('status') == 'SUCCESS':
            return {"message": "Listing created successfully", "data": response['data']}
        raise HTTPException(status_code=400, detail="Failed to create listing")


# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel
# import aiohttp
# import asyncio
# import logging
# import os
# from utils.auth import get_auth_headers
# from utils.file_handler import load_listings

# # Configure logging
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# router = APIRouter()
# BASE_URL = os.getenv("BASE_URL")

# # Function to make API requests with retry logic
# async def api_request(session, method, endpoint, data=None, retries=3):
#     """
#     Sends an API request and retries if an OTP error occurs.
#     """
#     url = BASE_URL + endpoint
#     content_type = "application/json-patch+json" if method.upper() == 'PATCH' else "application/json"
    
#     for attempt in range(retries):
#         headers = get_auth_headers(content_type)
#         try:
#             async with getattr(session, method.lower())(url, headers=headers, json=data) as response:
#                 response_data = await response.json()
#                 if response.status == 200:
#                     return response_data  # Return response if successful
#                 elif response_data.get('error', {}).get('message') == 'Invalid api otp':
#                     logging.warning("Invalid OTP. Retrying...")
#                     await asyncio.sleep(1)  # Wait before retrying
#                 else:
#                     logging.error(f"API request failed: {response_data}")
#                     return None
#         except Exception as e:
#             logging.error(f"Request error: {str(e)}")
#             await asyncio.sleep(1)  # Wait before retrying
#     return None

# # Pydantic model to validate incoming listing data
# class ListingData(BaseModel):
#     listing: dict  # Dictionary containing listing details

# # Endpoint to post all listings from JSON file
# @router.post("/post-listings")
# async def post_listings():
#     """
#     Posts all imported listings to Gameflip.
#     """
#     listings = load_listings()

#     if not listings:
#         raise HTTPException(status_code=400, detail="No listings found in listings.json")

#     async with aiohttp.ClientSession() as session:
#         results = []
#         for listing in listings:
#             logging.info(f"Posting listing: {listing.get('name', 'Unknown')}")
            
#             # Ensure image paths are converted if necessary
#             if "image_urls" in listing:
#                 listing["photo"] = await handle_images(listing["image_urls"])

#             response = await api_request(session, 'POST', '/listing', data=listing)
#             if response and response.get('status') == 'SUCCESS':
#                 results.append({"listing": listing.get("name", "Unknown"), "status": "Success"})
#             else:
#                 results.append({"listing": listing.get("name", "Unknown"), "status": "Failed"})

#     return {"message": "Listings processed", "results": results}

# # Function to handle local image conversion
# async def handle_images(image_paths):
#     """
#     Converts local image paths to a format required for upload.
#     """
#     # If images need to be uploaded first, implement that logic here
#     return {str(i): {"view_url": path} for i, path in enumerate(image_paths)}
