# from fastapi import APIRouter, HTTPException, Depends
# from pydantic import BaseModel
# from typing import List
# import aiohttp
# import asyncio
# import pyotp
# import json
# import logging
# import os
# from dotenv import load_dotenv

# # Configure logging to track API calls and errors
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# # Create a FastAPI router for handling listing-related operations
# router = APIRouter()

# # Load environment variables from .env file
# load_dotenv()
# BASE_URL = os.getenv("BASE_URL")
# API_KEY = os.getenv("API_KEY")
# API_SECRET = os.getenv("API_SECRET")

# # Generate OTP authentication instance using API secret
# totp = pyotp.TOTP(API_SECRET)

# def get_auth_headers(content_type="application/json"):
#     return {
#         "Authorization": f"GFAPI {API_KEY}:{totp.now()}",
#         "Content-Type": content_type
#     }

# async def api_request(session, method, endpoint, data=None, retries=3):
#     url = BASE_URL + endpoint
#     content_type = "application/json-patch+json" if method.upper() == 'PATCH' else "application/json"
#     for attempt in range(retries):
#         headers = get_auth_headers(content_type)
#         try:
#             async with getattr(session, method.lower())(url, headers=headers, json=data) as response:
#                 response_data = await response.json()
#                 if response.status == 200:
#                     return response_data
#                 elif response_data.get('error', {}).get('message') == 'Invalid api otp':
#                     logging.warning("Invalid OTP. Retrying...")
#                     await asyncio.sleep(1)
#                 else:
#                     logging.error(f"API request failed: {response_data}")
#                     return None
#         except Exception as e:
#             logging.error(f"Request error: {str(e)}")
#             await asyncio.sleep(1)
#     return None

# # Pydantic models
# class ListingModel(BaseModel):
#     id: str
#     kind: str
#     description: str
#     owner: str
#     category: str
#     name: str
#     price: int
#     accept_currency: str
#     upc: str
#     cognitoidp_client: str
#     tags: List[str]
#     digital: bool
#     digital_deliverable: str
#     photo: dict
#     status: str
#     shipping_fee: int
#     shipping_paid_by: str
#     shipping_within_days: int
#     expire_in_days: int
#     visibility: str

# class ListingsData(BaseModel):
#     listings: List[ListingModel]

# class ListingData(BaseModel):
#     listing: dict

# @router.post("/post-listings")
# async def post_listings(data: ListingsData):
#     """
#     Creates multiple listings on Gameflip.
#     """
#     async with aiohttp.ClientSession() as session:
#         results = []
#         for listing in data.listings:
#             logging.info(f"Posting listing: {listing.name}")
            
#             response = await api_request(session, 'POST', '/listing', data=listing.dict())
#             if response and response.get('status') == 'SUCCESS':
#                 results.append({
#                     "listing": listing.name,
#                     "status": "Success",
#                     "data": response['data']
#                 })
#             else:
#                 results.append({
#                     "listing": listing.name,
#                     "status": "Failed"
#                 })

#         successful_listings = len([r for r in results if r["status"] == "Success"])
#         if successful_listings == 0:
#             raise HTTPException(status_code=400, detail="Failed to create any listings")

#         return {
#             "message": f"Successfully created {successful_listings} out of {len(data.listings)} listings",
#             "results": results
#         }

# # @router.post("/post-listing")
# # async def post_listing(data: ListingData):
# #     """
# #     Creates a single listing on Gameflip.
# #     """
# #     async with aiohttp.ClientSession() as session:
# #         response = await api_request(session, 'POST', '/listing', data=data.listing)
# #         if response and response.get('status') == 'SUCCESS':
# #             return {"message": "Listing created successfully", "data": response['data']}
# #         raise HTTPException(status_code=400, detail="Failed to create listing")


######################################################################################
######################################################################################

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import aiohttp
import asyncio
import pyotp
import json
import logging
import os
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize router and environment
router = APIRouter()
load_dotenv()
BASE_URL = os.getenv("BASE_URL")
API_KEY = os.getenv("API_KEY")
API_SECRET = os.getenv("API_SECRET")
totp = pyotp.TOTP(API_SECRET)

class PhotoData(BaseModel):
    url: str
    status: str = "active"
    display_order: Optional[int] = None

class ListingRequest(BaseModel):
    kind: str
    owner: str
    status: str = "draft"
    name: str
    description: str
    category: str
    platform: str
    upc: str
    price: int
    accept_currency: str
    shipping_within_days: int
    expire_in_days: int
    shipping_fee: int = 0
    shipping_paid_by: str
    shipping_predefined_package: str
    cognitoidp_client: str
    tags: List[str]
    digital: bool
    digital_region: str
    digital_deliverable: str
    visibility: str
    image_url: Optional[str] = None
    additional_images: Optional[List[str]] = None

def get_auth_headers(content_type="application/json"):
    """Generate authentication headers with current TOTP"""
    return {
        "Authorization": f"GFAPI {API_KEY}:{totp.now()}",
        "Content-Type": content_type
    }

async def api_request(session, method, endpoint, data=None, retries=3):
    """Make an API request with retry logic"""
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
                    logging.warning(f"Invalid OTP. Attempt {attempt + 1}/{retries}")
                    await asyncio.sleep(1)
                else:
                    logging.error(f"API request failed: {response_data}")
                    raise HTTPException(
                        status_code=response.status,
                        detail=response_data.get('error', {}).get('message', 'Unknown error')
                    )
                    
        except Exception as e:
            logging.error(f"Request error: {str(e)}")
            if attempt == retries - 1:
                raise HTTPException(status_code=500, detail=str(e))
            await asyncio.sleep(1)
    
    raise HTTPException(status_code=500, detail="Maximum retries reached")

async def upload_photo(session, listing_id: str, photo_data: PhotoData):
    """Upload a photo to a listing"""
    try:
        photo_response = await api_request(
            session,
            'POST',
            f'/listing/{listing_id}/photo',
            data=photo_data.dict(exclude_none=True)
        )
        
        if not photo_response or photo_response.get('status') != 'SUCCESS':
            logging.error(f"Failed to create photo entry: {photo_response}")
            return None
            
        photo_id = photo_response.get('data', {}).get('id')
        
        # Update photo status and display order
        patch_ops = []
        if photo_data.status:
            patch_ops.append({
                "op": "replace",
                "path": f"/photo/{photo_id}/status",
                "value": photo_data.status
            })
        
        if photo_data.display_order is not None:
            patch_ops.append({
                "op": "replace",
                "path": f"/photo/{photo_id}/display_order",
                "value": photo_data.display_order
            })
        
        if patch_ops:
            await api_request(
                session,
                'PATCH',
                f'/listing/{listing_id}',
                data=patch_ops
            )
            
        return photo_id
        
    except Exception as e:
        logging.error(f"Error uploading photo: {str(e)}")
        return None

async def set_cover_photo(session, listing_id: str, photo_id: str):
    """Set the cover photo for a listing"""
    try:
        patch_ops = [{
            "op": "replace",
            "path": "/cover_photo",
            "value": photo_id
        }]
        
        patch_response = await api_request(
            session,
            'PATCH',
            f'/listing/{listing_id}',
            data=patch_ops
        )
        return patch_response and patch_response.get('status') == 'SUCCESS'
    except Exception as e:
        logging.error(f"Error setting cover photo: {str(e)}")
        return False

async def update_listing_status(session, listing_id: str, status: str = "draf"):
    """Update listing status"""
    try:
        patch_ops = [{
            "op": "replace",
            "path": "/status",
            "value": status
        }]
        
        patch_response = await api_request(
            session,
            'PATCH',
            f'/listing/{listing_id}',
            data=patch_ops
        )
        return patch_response and patch_response.get('status') == 'SUCCESS'
    except Exception as e:
        logging.error(f"Error updating listing status: {str(e)}")
        return False

@router.post("/post-listing-with-image")
async def post_listing_with_image(listing_data: ListingRequest):
    """Creates a listing with images on Gameflip"""
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Create initial listing in draft status
            initial_listing = listing_data.dict(
                exclude={'image_url', 'additional_images'}
            )
            
            initial_response = await api_request(
                session,
                'POST',
                '/listing',
                data=initial_listing
            )

            if not initial_response or initial_response.get('status') != 'SUCCESS':
                raise HTTPException(status_code=400, detail="Failed to create listing")

            listing_id = initial_response['data']['id']
            main_photo_id = None

            # Step 2: Upload main image if provided
            if listing_data.image_url:
                photo_data = PhotoData(
                    url=listing_data.image_url,
                    status="active",
                    display_order=0
                )
                main_photo_id = await upload_photo(session, listing_id, photo_data)
                
                if not main_photo_id:
                    logging.warning("Failed to upload main photo")
                else:
                    # Set cover photo while still in draft status
                    cover_success = await set_cover_photo(session, listing_id, main_photo_id)
                    if not cover_success:
                        logging.warning("Failed to set cover photo")

            # Step 3: Upload additional images if provided
            if listing_data.additional_images:
                for index, image_url in enumerate(listing_data.additional_images, start=1):
                    photo_data = PhotoData(
                        url=image_url,
                        status="active",
                        display_order=index
                    )
                    await upload_photo(session, listing_id, photo_data)

            # Step 4: Update listing status to onsale after all photos are handled
            success = await update_listing_status(session, listing_id, "draft")
            
            if not success:
                logging.warning("Failed to update listing status")

            return {
                "message": "Listing created successfully",
                "listing_id": listing_id,
                "status": "SUCCESS",
                "main_photo_id": main_photo_id
            }

        except Exception as e:
            logging.error(f"Error in post_listing_with_image: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
