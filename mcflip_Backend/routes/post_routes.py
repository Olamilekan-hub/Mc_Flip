from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import aiohttp
import asyncio
import pyotp
import logging
import os
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
router = APIRouter()

# -------------------------------
# Define Models and Classes First
# -------------------------------
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
    price: float
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

# -------------------------------
# Global Variables (after models)
# -------------------------------
GLOBAL_STOP_FLAG = False

# Global batch storage for listing requests submitted from the frontend.
listing_batch: List[ListingRequest] = []  # Holds all listing requests submitted
global_batch_state: Optional[ListingState] = None
global_batch_task_running: bool = False

# Store active posting tasks (for status reporting)
active_tasks: Dict[str, Any] = {}

# -------------------------------
# Helper Functions
# -------------------------------
def get_auth_headers(api_key: str, api_secret: str, content_type="application/json") -> Dict[str, str]:
    """
    Generate authentication headers with a TOTP based on user-provided API Key and Secret.
    """
    totp = pyotp.TOTP(api_secret)
    return {
        "Authorization": f"GFAPI {api_key}:{totp.now()}",
        "Content-Type": content_type
    }

async def api_request(session, method, endpoint, api_key, api_secret, data=None, retries=3):
    """
    Make an API request with retry logic, generating a fresh TOTP each time.
    """
    BASE_URL = os.getenv("BASE_URL", "https://production-gameflip.fingershock.com/api/v1")
    url = BASE_URL + endpoint
    content_type = "application/json-patch+json" if method.upper() == 'PATCH' else "application/json"
    for attempt in range(retries):
        headers = get_auth_headers(api_key, api_secret, content_type)
        try:
            async with getattr(session, method.lower())(url, headers=headers, json=data) as response:
                response_data = await response.json()
                if response.status == 200:
                    return response_data
                elif response_data.get('error', {}).get('message') == 'Invalid api otp':
                    logging.warning(f"Invalid OTP. Attempt {attempt+1}/{retries}")
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

async def upload_photo(session, listing_id: str, photo_data: PhotoData, api_key: str, api_secret: str):
    """Upload a photo to a listing with improved error handling."""
    try:
        # 1) Request an upload URL
        photo_response = await api_request(session, 'POST', f'/listing/{listing_id}/photo', api_key, api_secret)
        if not photo_response or photo_response.get('status') != 'SUCCESS':
            logging.error(f"Failed to get photo upload URL: {photo_response}")
            return None
        upload_url = photo_response.get('data', {}).get('upload_url')
        photo_id   = photo_response.get('data', {}).get('id')
        if not upload_url or not photo_id:
            logging.error("Missing upload URL or photo ID")
            return None
        # 2) Download the image
        async with session.get(photo_data.url) as img_response:
            if img_response.status != 200:
                logging.error(f"Failed to download image from URL: {photo_data.url}")
                return None
            image_data = await img_response.read()
        # 3) PUT the image data to the upload_url
        async with session.put(upload_url, data=image_data) as upload_response:
            if upload_response.status != 200:
                logging.error(f"Failed to upload image to storage: {upload_response.status}")
                return None
        # 4) Update photo status and display order
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
            patch_response = await api_request(session, 'PATCH', f'/listing/{listing_id}', api_key, api_secret, data=patch_ops)
            if not patch_response or patch_response.get('status') != 'SUCCESS':
                logging.error("Failed to update photo metadata")
                return None
        return photo_id
    except Exception as e:
        logging.error(f"Error in upload_photo: {str(e)}")
        return None

async def set_cover_photo(session, listing_id: str, photo_id: str, api_key: str, api_secret: str):
    """Set the cover photo for a listing."""
    try:
        patch_ops = [{
            "op": "replace",
            "path": "/cover_photo",
            "value": photo_id
        }]
        patch_response = await api_request(session, 'PATCH', f'/listing/{listing_id}', api_key, api_secret, data=patch_ops)
        return patch_response and patch_response.get('status') == 'SUCCESS'
    except Exception as e:
        logging.error(f"Error setting cover photo: {str(e)}")
        return False

async def update_listing_status(session, listing_id: str, status: str, api_key: str, api_secret: str):
    """Update listing status (e.g. to 'onsale')."""
    try:
        patch_ops = [{
            "op": "replace",
            "path": "/status",
            "value": status
        }]
        patch_response = await api_request(session, 'PATCH', f'/listing/{listing_id}', api_key, api_secret, data=patch_ops)
        return patch_response and patch_response.get('status') == 'SUCCESS'
    except Exception as e:
        logging.error(f"Error updating listing status: {str(e)}")
        return False

# -------------------------------
# Continuous Batch Posting Function
# -------------------------------
async def continuous_posting_batch(api_key: str, api_secret: str, time_between_listings: int):
    """
    Continuously cycles through the global listing batch and posts each listing one at a time.
    After finishing the batch, it starts over until stopped.
    """
    global GLOBAL_STOP_FLAG, listing_batch, global_batch_state, global_batch_task_running
    if global_batch_state is None:
        global_batch_state = ListingState(task_id="global_batch")
    while global_batch_state.is_active and not GLOBAL_STOP_FLAG:
        if not listing_batch:
            # No listings yet—wait briefly.
            await asyncio.sleep(1)
            continue
        # Iterate over a snapshot of the current batch
        current_batch = list(listing_batch)
        for listing_data in current_batch:
            if not global_batch_state.is_active or GLOBAL_STOP_FLAG:
                break
            try:
                async with aiohttp.ClientSession() as session:
                    # Create listing in draft status
                    initial_listing = listing_data.dict(exclude={'image_url', 'additional_images'})
                    initial_response = await api_request(session, 'POST', '/listing', api_key, api_secret, data=initial_listing)
                    if not initial_response or initial_response.get('status') != 'SUCCESS':
                        global_batch_state.errors += 1
                        logging.error("Failed to create listing in batch")
                        await asyncio.sleep(time_between_listings)
                        continue
                    listing_id = initial_response['data']['id']
                    main_photo_id = None
                    # Upload main image if provided
                    if listing_data.image_url:
                        photo_data = PhotoData(url=listing_data.image_url, status="active", display_order=0)
                        main_photo_id = await upload_photo(session, listing_id, photo_data, api_key, api_secret)
                        if not main_photo_id:
                            global_batch_state.errors += 1
                            logging.warning("Failed to upload main photo in batch")
                        else:
                            cover_success = await set_cover_photo(session, listing_id, main_photo_id, api_key, api_secret)
                            if not cover_success:
                                global_batch_state.errors += 1
                                logging.warning("Failed to set cover photo in batch")
                    # Upload additional images if any
                    if listing_data.additional_images:
                        for index, img_url in enumerate(listing_data.additional_images, start=1):
                            photo_data = PhotoData(url=img_url, status="active", display_order=index)
                            success_photo = await upload_photo(session, listing_id, photo_data, api_key, api_secret)
                            if not success_photo:
                                global_batch_state.errors += 1
                                logging.warning(f"Failed to upload additional image {index} in batch")
                    # Update status to onsale
                    success_status = await update_listing_status(session, listing_id, "onsale", api_key, api_secret)
                    if not success_status:
                        global_batch_state.errors += 1
                        logging.warning("Failed to update listing status in batch")
                    else:
                        global_batch_state.total_posts += 1
                        global_batch_state.last_post_time = datetime.now()
                        logging.info(f"Successfully created listing {listing_id} in batch")
                    # Wait the specified delay before posting the next listing
                    await asyncio.sleep(time_between_listings)
            except Exception as e:
                global_batch_state.errors += 1
                logging.error(f"Error in batch posting: {str(e)}")
                await asyncio.sleep(time_between_listings)
    # When stopping, clean up the global task state
    global_batch_task_running = False
    global_batch_state = None

# -------------------------------
# Endpoint: Post Listing with Image
# -------------------------------
@router.post("/post-listing-with-image")
async def post_listing_with_image(
    request: Request,
    background_tasks: BackgroundTasks,
    stop: Optional[bool] = False,
    global_stop: Optional[bool] = False
):
    """
    Accepts a single listing (with API credentials and time_between_listings) as sent by the frontend.
    The listing is added to a global batch; a background task will post listings one at a time in sequence.
    To stop all posting, send global_stop=true.
    """
    global GLOBAL_STOP_FLAG, listing_batch, global_batch_task_running, global_batch_state

    body = await request.json()
    api_key = body.get("api_key")
    api_secret = body.get("api_secret")
    time_between_listings = int(body.get("time_between_listings", 60))

    if global_stop:
        GLOBAL_STOP_FLAG = True
        listing_batch.clear()
        if global_batch_state:
            global_batch_state.is_active = False
        active_tasks.clear()
        return {
            "message": "Stopping all listing creation tasks",
            "status": "SUCCESS",
            "stopped_tasks": ["global_batch"]
        }

    if stop:
        # In global batch mode, individual stop is not supported.
        raise HTTPException(status_code=400, detail="Individual stop not supported in global batch mode. Use global_stop.")

    # Reset the global stop flag when starting a new batch
    if GLOBAL_STOP_FLAG:
        GLOBAL_STOP_FLAG = False
        logging.info("GLOBAL_STOP_FLAG reset to False to allow new postings.")

    # Build a ListingRequest from the body (exclude credentials and timing)
    try:
        listing_fields = {k: v for k, v in body.items() if k not in ("api_key", "api_secret", "time_between_listings")}
        listing_data = ListingRequest(**listing_fields)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid listing data: {str(exc)}")

    # Add the listing to the global batch
    listing_batch.append(listing_data)
    logging.info(f"Added new listing to batch. Total listings in batch: {len(listing_batch)}")

    # If no global batch task is running, start it
    if not global_batch_task_running:
        global_batch_task_running = True
        global_batch_state = ListingState(task_id="global_batch")
        active_tasks["global_batch"] = global_batch_state
        background_tasks.add_task(continuous_posting_batch, api_key, api_secret, time_between_listings)
        return {
            "message": "Started global batch posting task and added listing to batch",
            "status": "SUCCESS",
            "task_id": "global_batch"
        }
    else:
        return {
            "message": "Added listing to existing global batch",
            "status": "SUCCESS",
            "task_id": "global_batch"
        }

@router.get("/listing-tasks")
async def get_listing_tasks():
    """Get status of the global batch posting task."""
    return {
        task_id: {
            "active": s.is_active,
            "total_posts": s.total_posts,
            "errors": s.errors,
            "start_time": s.start_time.isoformat(),
            "last_post_time": s.last_post_time.isoformat() if s.last_post_time else None,
            "duration": str(datetime.now() - s.start_time)
        }
        for task_id, s in active_tasks.items()
    }
