# from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
# from pydantic import BaseModel, Field
# from typing import List, Optional, Dict, Any
# import aiohttp
# import asyncio
# import pyotp
# import json
# import logging
# import os
# import random
# from dotenv import load_dotenv

# # Set up logging
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# # Initialize router and environment
# router = APIRouter()
# load_dotenv()
# BASE_URL = os.getenv("BASE_URL")
# API_KEY = os.getenv("API_KEY")
# API_SECRET = os.getenv("API_SECRET")
# totp = pyotp.TOTP(API_SECRET)

# class PhotoData(BaseModel):
#     url: str
#     status: str = "active"
#     display_order: Optional[int] = None

# class ListingRequest(BaseModel):
#     kind: str
#     owner: str
#     status: str = "draft"
#     name: str
#     description: str
#     category: str
#     platform: str
#     upc: str
#     price: int
#     accept_currency: str
#     shipping_within_days: int
#     expire_in_days: int
#     shipping_fee: int = 0
#     shipping_paid_by: str
#     shipping_predefined_package: str
#     cognitoidp_client: str
#     tags: List[str]
#     digital: bool
#     digital_region: str
#     digital_deliverable: str
#     visibility: str
#     image_url: Optional[str] = None
#     additional_images: Optional[List[str]] = None

# class AutomatedListingConfig(BaseModel):
#     username: str
#     time_between_listings: int = 300
#     listings_file: str

# def get_auth_headers(content_type="application/json"):
#     """Generate authentication headers with current TOTP"""
#     return {
#         "Authorization": f"GFAPI {API_KEY}:{totp.now()}",
#         "Content-Type": content_type
#     }

# async def api_request(session, method, endpoint, data=None, retries=3):
#     """Make an API request with retry logic"""
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
#                     logging.warning(f"Invalid OTP. Attempt {attempt + 1}/{retries}")
#                     await asyncio.sleep(1)
#                 else:
#                     logging.error(f" request failed: {response_data}")
#                     raise HTTPException(
#                         status_code=response.status,
#                         detail=response_data.get('error', {}).get('message', 'Unknown error')
#                     )
                    
#         except Exception as e:
#             logging.error(f"Request error: {str(e)}")
#             if attempt == retries - 1:
#                 raise HTTPException(status_code=500, detail=str(e))
#             await asyncio.sleep(1)
    
#     raise HTTPException(status_code=500, detail="Maximum retries reached")

# async def upload_photo(session, listing_id: str, photo_data: PhotoData):
#     """Upload a photo to a listing with improved error handling"""
#     try:
#         # First get the upload URL
#         photo_response = await api_request(
#             session,
#             'POST',
#             f'/listing/{listing_id}/photo'
#         )
        
#         if not photo_response or photo_response.get('status') != 'SUCCESS':
#             logging.error(f"Failed to get photo upload URL: {photo_response}")
#             return None
            
#         upload_url = photo_response.get('data', {}).get('upload_url')
#         photo_id = photo_response.get('data', {}).get('id')
        
#         if not upload_url or not photo_id:
#             logging.error("Missing upload URL or photo ID")
#             return None

#         # Download the image from the provided URL
#         async with session.get(photo_data.url) as img_response:
#             if img_response.status != 200:
#                 logging.error(f"Failed to download image from URL: {photo_data.url}")
#                 return None
            
#             image_data = await img_response.read()

#         # Upload the image to Gameflip's storage
#         async with session.put(upload_url, data=image_data) as upload_response:
#             if upload_response.status != 200:
#                 logging.error(f"Failed to upload image to storage: {upload_response.status}")
#                 return None

#         # Update photo status and display order
#         patch_ops = []
#         if photo_data.status:
#             patch_ops.append({
#                 "op": "replace",
#                 "path": f"/photo/{photo_id}/status",
#                 "value": photo_data.status
#             })
        
#         if photo_data.display_order is not None:
#             patch_ops.append({
#                 "op": "replace",
#                 "path": f"/photo/{photo_id}/display_order",
#                 "value": photo_data.display_order
#             })
        
#         if patch_ops:
#             patch_response = await api_request(
#                 session,
#                 'PATCH',
#                 f'/listing/{listing_id}',
#                 data=patch_ops
#             )
            
#             if not patch_response or patch_response.get('status') != 'SUCCESS':
#                 logging.error("Failed to update photo metadata")
#                 return None
            
#         return photo_id
        
#     except Exception as e:
#         logging.error(f"Error in upload_photo: {str(e)}")
#         return None

# async def set_cover_photo(session, listing_id: str, photo_id: str):
#     """Set the cover photo for a listing"""
#     try:
#         patch_ops = [{
#             "op": "replace",
#             "path": "/cover_photo",
#             "value": photo_id
#         }]
        
#         patch_response = await api_request(
#             session,
#             'PATCH',
#             f'/listing/{listing_id}',
#             data=patch_ops
#         )
#         return patch_response and patch_response.get('status') == 'SUCCESS'
#     except Exception as e:
#         logging.error(f"Error setting cover photo: {str(e)}")
#         return False

# async def update_listing_status(session, listing_id: str, status: str = "onsale"):
#     """Update listing status"""
#     try:
#         patch_ops = [{
#             "op": "replace",
#             "path": "/status",
#             "value": status
#         }]
        
#         patch_response = await api_request(
#             session,
#             'PATCH',
#             f'/listing/{listing_id}',
#             data=patch_ops
#         )
#         return patch_response and patch_response.get('status') == 'SUCCESS'
#     except Exception as e:
#         logging.error(f"Error updating listing status: {str(e)}")
#         return False

# async def automated_listing_process(config: AutomatedListingConfig):
#     """Background process for automated listing creation"""
#     async with aiohttp.ClientSession() as session:
#         while True:
#             try:
#                 # Read listings from file
#                 with open(config.listings_file, 'r') as f:
#                     listings = json.load(f)
                
#                 if not listings:
#                     logging.warning("No listings available. Waiting for 60 seconds...")
#                     await asyncio.sleep(60)
#                     continue

#                 listing_to_post = random.choice(listings)
                
#                 # Convert the listing data to match ListingRequest format
#                 listing_request = ListingRequest(**listing_to_post)
                
#                 # Create listing using the existing endpoint logic
#                 result = await post_listing_with_image(listing_request)
                
#                 if result:
#                     logging.info(f"Successfully created listing with ID: {result['listing_id']}")
#                 else:
#                     logging.error("Failed to create listing")

#                 # Wait for specified time between listings
#                 await asyncio.sleep(config.time_between_listings)

#             except Exception as e:
#                 logging.error(f"Error in automated listing process: {str(e)}")
#                 await asyncio.sleep(60)

# @router.post("/post-listing-with-image")
# async def post_listing_with_image(listing_data: ListingRequest):
#     """Creates a listing with images on Gameflip"""
#     async with aiohttp.ClientSession() as session:
#         try:
#             # Step 1: Create initial listing in draft status
#             initial_listing = listing_data.dict(
#                 exclude={'image_url', 'additional_images'}
#             )
            
#             initial_response = await api_request(
#                 session,
#                 'POST',
#                 '/listing',
#                 data=initial_listing
#             )

#             if not initial_response or initial_response.get('status') != 'SUCCESS':
#                 raise HTTPException(status_code=400, detail="Failed to create listing")

#             listing_id = initial_response['data']['id']
#             main_photo_id = None

#             # Step 2: Upload main image if provided
#             if listing_data.image_url:
#                 photo_data = PhotoData(
#                     url=listing_data.image_url,
#                     status="active",
#                     display_order=0
#                 )
#                 main_photo_id = await upload_photo(session, listing_id, photo_data)
                
#                 if not main_photo_id:
#                     logging.warning("Failed to upload main photo")
#                 else:
#                     # Set cover photo while still in draft status
#                     cover_success = await set_cover_photo(session, listing_id, main_photo_id)
#                     if not cover_success:
#                         logging.warning("Failed to set cover photo")

#             # Step 3: Upload additional images if provided
#             if listing_data.additional_images:
#                 for index, image_url in enumerate(listing_data.additional_images, start=1):
#                     photo_data = PhotoData(
#                         url=image_url,
#                         status="active",
#                         display_order=index
#                     )
#                     await upload_photo(session, listing_id, photo_data)

#             # Step 4: Update listing status to onsale after all photos are handled
#             success = await update_listing_status(session, listing_id, "onsale")
            
#             if not success:
#                 logging.warning("Failed to update listing status")

#             return {
#                 "message": "Listing created successfully",
#                 "listing_id": listing_id,
#                 "status": "SUCCESS",
#                 "main_photo_id": main_photo_id
#             }

#         except Exception as e:
#             logging.error(f"Error in post_listing_with_image: {str(e)}")
#             raise HTTPException(status_code=500, detail=str(e))

# @router.post("/start-automated-listing")
# async def start_automated_listing(config: AutomatedListingConfig, background_tasks: BackgroundTasks):
#     """Start automated listing process"""
#     try:
#         # Validate listings file exists
#         if not os.path.exists(config.listings_file):
#             raise HTTPException(status_code=400, detail="Listings file not found")
            
#         # Add the automated listing process to background tasks
#         background_tasks.add_task(automated_listing_process, config)
        
#         return {
#             "message": "Automated listing process started",
#             "status": "SUCCESS",
#             "config": config.dict()
#         }
#     except Exception as e:
#         logging.error(f"Error starting automated listing: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))


from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import aiohttp
import asyncio
import pyotp
import json
import logging
import os
import random
from datetime import datetime
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

# Store active posting tasks with their state
active_tasks: Dict[str, Any] = {}

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

class ListingState:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.is_active = True
        self.start_time = datetime.now()
        self.last_post_time = None
        self.total_posts = 0
        self.errors = 0

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
    """Upload a photo to a listing with improved error handling"""
    try:
        # First get the upload URL
        photo_response = await api_request(
            session,
            'POST',
            f'/listing/{listing_id}/photo'
        )
        
        if not photo_response or photo_response.get('status') != 'SUCCESS':
            logging.error(f"Failed to get photo upload URL: {photo_response}")
            return None
            
        upload_url = photo_response.get('data', {}).get('upload_url')
        photo_id = photo_response.get('data', {}).get('id')
        
        if not upload_url or not photo_id:
            logging.error("Missing upload URL or photo ID")
            return None

        # Download the image from the provided URL
        async with session.get(photo_data.url) as img_response:
            if img_response.status != 200:
                logging.error(f"Failed to download image from URL: {photo_data.url}")
                return None
            
            image_data = await img_response.read()

        # Upload the image to Gameflip's storage
        async with session.put(upload_url, data=image_data) as upload_response:
            if upload_response.status != 200:
                logging.error(f"Failed to upload image to storage: {upload_response.status}")
                return None

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
            patch_response = await api_request(
                session,
                'PATCH',
                f'/listing/{listing_id}',
                data=patch_ops
            )
            
            if not patch_response or patch_response.get('status') != 'SUCCESS':
                logging.error("Failed to update photo metadata")
                return None
            
        return photo_id
        
    except Exception as e:
        logging.error(f"Error in upload_photo: {str(e)}")
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

async def update_listing_status(session, listing_id: str, status: str = "onsale"):
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

async def continuous_posting(listing_data: ListingRequest, task_id: str, state: ListingState):
    """Background task to continuously post listings with improved state management"""
    try:
        while state.is_active:
            try:
                async with aiohttp.ClientSession() as session:
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
                        state.errors += 1
                        logging.error(f"Failed to create listing for task {task_id}")
                        await asyncio.sleep(60)
                        continue
                        
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
                            state.errors += 1
                            logging.warning(f"Failed to upload main photo for task {task_id}")
                        else:
                            # Set cover photo while still in draft status
                            cover_success = await set_cover_photo(session, listing_id, main_photo_id)
                            if not cover_success:
                                state.errors += 1
                                logging.warning(f"Failed to set cover photo for task {task_id}")

                    # Step 3: Upload additional images if provided
                    if listing_data.additional_images:
                        for index, image_url in enumerate(listing_data.additional_images, start=1):
                            photo_data = PhotoData(
                                url=image_url,
                                status="active",
                                display_order=index
                            )
                            if not await upload_photo(session, listing_id, photo_data):
                                state.errors += 1
                                logging.warning(f"Failed to upload additional image {index} for task {task_id}")

                    # Step 4: Update listing status to onsale after all photos are handled
                    success = await update_listing_status(session, listing_id, "onsale")
                    
                    if not success:
                        state.errors += 1
                        logging.warning(f"Failed to update listing status for task {task_id}")
                    else:
                        state.total_posts += 1
                        state.last_post_time = datetime.now()
                        logging.info(f"Successfully created listing {listing_id} for task {task_id}")
                    
                    # Wait for 3 seconds before next iteration
                    await asyncio.sleep(60)
                    
            except Exception as e:
                state.errors += 1
                logging.error(f"Error in continuous posting for task {task_id}: {str(e)}")
                await asyncio.sleep(60)
                
    finally:
        # Cleanup when the task ends
        if task_id in active_tasks:
            del active_tasks[task_id]
        logging.info(f"Continuous posting task {task_id} ended. Total posts: {state.total_posts}, Errors: {state.errors}")

@router.post("/post-listing-with-image")
async def post_listing_with_image(
    listing_data: ListingRequest,
    background_tasks: BackgroundTasks,
    task_id: Optional[str] = None,
    stop: Optional[bool] = False
):
    """Creates listings continuously with images on Gameflip until stopped"""
    # Generate a task ID if not provided
    if not task_id:
        task_id = f"task_{len(active_tasks) + 1}_{int(datetime.now().timestamp())}"
    
    # Handle stop request
    if stop:
        if task_id in active_tasks:
            state = active_tasks[task_id]
            state.is_active = False
            return {
                "message": f"Stopping continuous listing creation for task {task_id}",
                "status": "SUCCESS",
                "total_posts": state.total_posts,
                "errors": state.errors,
                "duration": str(datetime.now() - state.start_time)
            }
        else:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    
    # Check if task already exists
    if task_id in active_tasks:
        raise HTTPException(status_code=400, detail=f"Task {task_id} is already running")
    
    # Create new state for this task
    state = ListingState(task_id)
    active_tasks[task_id] = state
    
    # Start continuous posting in the background
    background_tasks.add_task(continuous_posting, listing_data, task_id, state)
    
    return {
        "message": "Started continuous listing creation",
        "status": "SUCCESS",
        "task_id": task_id
    }

@router.get("/listing-tasks")
async def get_listing_tasks():
    """Get status of all active listing tasks"""
    return {
        task_id: {
            "active": state.is_active,
            "total_posts": state.total_posts,
            "errors": state.errors,
            "start_time": state.start_time.isoformat(),
            "last_post_time": state.last_post_time.isoformat() if state.last_post_time else None,
            "duration": str(datetime.now() - state.start_time)
        }
        for task_id, state in active_tasks.items()
    }