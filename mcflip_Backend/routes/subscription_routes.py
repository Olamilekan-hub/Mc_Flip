from fastapi import APIRouter, HTTPException, Header
from datetime import datetime, timedelta
from typing import Optional
import uuid, secrets, string, base64
from pydantic import BaseModel

router = APIRouter()

# --- Pydantic Models ---
class SubscriptionRequest(BaseModel):
    user_token: str
    subscription_code: str

class SubscriptionResponse(BaseModel):
    subscription_key: str
    expires_at: datetime
    time_remaining: str

# --- Subscription Management Class (in‑memory) ---
class SubscriptionManager:
    # In-memory storage (for production you’d use a persistent DB)
    _subscriptions = {}      # key: subscription_key, value: {user_token, expires_at}
    _user_tokens = {}        # (for registration purposes)
    _admin_codes = {}        # mapping: generated_code -> duration (timedelta)

    @classmethod
    def generate_subscription_key(cls) -> str:
        return str(uuid.uuid4())

    @classmethod
    def register_user_token(cls, user_token: str):
        cls._user_tokens[user_token] = datetime.now()

    @classmethod
    def generate_subscription_code(cls, duration: timedelta) -> str:
        # Create an 8-character random string and combine with the duration (in seconds)
        random_part = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        duration_seconds = int(duration.total_seconds())
        plain = f"{duration_seconds}:{random_part}"
        # URL-safe base64 encoding (remove padding)
        code = base64.urlsafe_b64encode(plain.encode()).decode().rstrip("=")
        cls._admin_codes[code] = duration
        return code

    @classmethod
    def activate_subscription(cls, user_token: str, subscription_code: str):
        if user_token not in cls._user_tokens:
            cls.register_user_token(user_token)
        if subscription_code not in cls._admin_codes:
            raise HTTPException(status_code=400, detail="Invalid subscription code")
        # Remove the code once used
        duration = cls._admin_codes.pop(subscription_code)
        # Check for an existing subscription for this user
        existing_key = None
        for key, sub in cls._subscriptions.items():
            if sub['user_token'] == user_token:
                existing_key = key
                break
        if existing_key:
            current_sub = cls._subscriptions[existing_key]
            # If still active, extend; otherwise start fresh
            if current_sub['expires_at'] > datetime.now():
                new_expires = current_sub['expires_at'] + duration
            else:
                new_expires = datetime.now() + duration
            current_sub['expires_at'] = new_expires
            return {
                'subscription_key': existing_key,
                'expires_at': new_expires,
                'time_remaining': str(new_expires - datetime.now())
            }
        else:
            sub_key = cls.generate_subscription_key()
            expires_at = datetime.now() + duration
            cls._subscriptions[sub_key] = {
                'user_token': user_token,
                'expires_at': expires_at,
            }
            return {
                'subscription_key': sub_key,
                'expires_at': expires_at,
                'time_remaining': str(expires_at - datetime.now())
            }

# --- API Endpoints ---
@router.post("/activate-subscription", response_model=SubscriptionResponse)
async def activate_subscription(
    request: SubscriptionRequest,
    x_user_token: Optional[str] = Header(None)
):
    user_token = x_user_token or request.user_token
    details = SubscriptionManager.activate_subscription(user_token, request.subscription_code)
    return details

def parse_duration(duration_str: str) -> timedelta:
    """
    Parse a numeric string representing days into a timedelta.
    For example, "30" means 30 days.
    """
    try:
        days = float(duration_str)
        return timedelta(days=days)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid duration format; please enter a number (days)")

@router.get("/generate-subscription-code")
async def generate_subscription_code_endpoint(user_token: str, duration: str):
    # Only allow the admin user to generate codes.
    if user_token != "pcSsHaAKZQdJb7lPNZIZq3wuwZJ2":
        raise HTTPException(status_code=403, detail="Not authorized to generate subscription codes")
    duration_td = parse_duration(duration)
    code = SubscriptionManager.generate_subscription_code(duration_td)
    return {"subscription_code": code, "duration_seconds": int(duration_td.total_seconds())}
