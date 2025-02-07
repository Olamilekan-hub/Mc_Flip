import os
import pyotp
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
API_KEY = os.getenv('API_KEY')
API_SECRET = os.getenv('API_SECRET')

# Function to generate authentication headers
def get_auth_headers(content_type="application/json"):
    """
    Generates API authentication headers including the OTP.
    """
    try:
        # Validate API_SECRET format
        base64.b32decode(API_SECRET)
        secret = API_SECRET
    except:
        secret = base64.b32encode(API_SECRET.encode()).decode()

    # Generate OTP
    totp = pyotp.TOTP(secret)
    otp = totp.now()

    return {
        "Authorization": f"GFAPI {API_KEY}:{otp}",
        "Content-Type": content_type
    }
