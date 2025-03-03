from fastapi import APIRouter, HTTPException, Query
import aiohttp
import asyncio
import pyotp
import os
from typing import Dict, Optional

router = APIRouter()

BASE_URL = os.getenv("BASE_URL")

async def get_auth_headers(api_key: str, api_secret: str):
    """Generate authentication headers dynamically."""
    try:
        totp = pyotp.TOTP(api_secret)
        otp = totp.now()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid API Secret format: {str(e)}")

    return {
        "Authorization": f"GFAPI {api_key}:{otp}",
        "Content-Type": "application/json"
    }

async def get_my_account_id(session: aiohttp.ClientSession, headers: dict) -> str:
    """Get the current user's account ID."""
    url = f"{BASE_URL}/account/me/profile"
    async with session.get(url, headers=headers) as response:
        data = await response.json()
        if response.status != 200 or "data" not in data:
            raise HTTPException(status_code=400, detail=f"Failed to fetch account ID: {data}")
        return data["data"].get("owner")

async def get_my_listings(session: aiohttp.ClientSession, account_id: str, headers: dict, start_param: int) -> Dict:
    """Get a page of listings."""
    params = {"owner": account_id, "start": start_param, "limit": 100, "status": "onsale"}
    url = f"{BASE_URL}/listing"

    async with session.get(url, params=params, headers=headers) as response:
        if response.status != 200:
            raise HTTPException(status_code=response.status, detail="Failed to fetch listings")
        return await response.json()

@router.get("/count-listings")
async def get_listing_count(
    apiKey: Optional[str] = Query(None), 
    apiSecret: Optional[str] = Query(None)
):
    """API endpoint to count listings using API key and secret from query params."""
    if not apiKey or not apiSecret:
        raise HTTPException(status_code=400, detail="Missing API key or secret in query parameters")

    async with aiohttp.ClientSession() as session:
        headers = await get_auth_headers(apiKey, apiSecret)

        try:
            account_id = await get_my_account_id(session, headers)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

        total_listings = 0
        start_param = 0

        while True:
            try:
                results = await get_my_listings(session, account_id, headers, start_param)
                batch_listings = len(results.get("data", []))
                total_listings += batch_listings
                if batch_listings < 100:
                    break
                start_param += 100
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error fetching listings: {str(e)}")

        return {"total_listings": total_listings}
