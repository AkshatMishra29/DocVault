import random
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pymongo.errors import DuplicateKeyError

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.models.user import (
    UserSignup,
    UserLogin,
    MobileOTPRequest,
    VerifyOTPRequest,
    GoogleLoginRequest,
    TokenResponse,
    UserOut,
)
from app.db.database import get_db
from app.utils.auth_utils import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


@router.post("/signup", response_model=TokenResponse)
def signup(body: UserSignup):
    try:
        db = get_db()
        user_doc = {
            "email": body.email,
            "name": body.name or "Akshat",
            "password_hash": hash_password(body.password),
            "created_at": datetime.utcnow().isoformat(),
        }
        result = db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        token = create_access_token({"sub": user_id})
        return TokenResponse(
            access_token=token,
            user=UserOut(id=user_id, email=body.email, name=user_doc["name"]),
        )
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@router.post("/login", response_model=TokenResponse)
def login(body: UserLogin):
    try:
        db = get_db()
        user = db.users.find_one({"email": body.email})
        if not user or not verify_password(body.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        user_id = str(user["_id"])
        token = create_access_token({"sub": user_id})
        return TokenResponse(
            access_token=token,
            user=UserOut(id=user_id, email=user.get("email"), name=user.get("name", "Akshat")),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


@router.post("/otp/request")
def request_otp(body: MobileOTPRequest):
    """
    Generates a 6-digit OTP code for mobile or email, valid for 5 minutes.
    In local development, uses a reliable code or prints to log.
    """
    try:
        db = get_db()
        clean_target = body.mobile.strip()
        if not clean_target:
            raise HTTPException(status_code=400, detail="Target mobile/email cannot be empty")

        # Generate 6-digit OTP code
        otp_code = f"{random.randint(100000, 999999)}"
        expiry = datetime.utcnow() + timedelta(minutes=5)

        db.otp_verifications.update_one(
            {"target": clean_target},
            {"$set": {"otp": otp_code, "expiry": expiry.isoformat()}},
            upsert=True,
        )

        print(f"[OTP Service] Generated OTP for {clean_target}: {otp_code}")

        return {
            "message": f"OTP sent to {clean_target}",
            "expires_in": 300,
            # For demonstration smoothness if SMS gateway not configured
            "dev_otp": otp_code,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send OTP: {str(e)}")


@router.post("/otp/verify", response_model=TokenResponse)
def verify_otp(body: VerifyOTPRequest):
    """
    Verifies 6-digit OTP and logs in / creates account.
    """
    try:
        db = get_db()
        clean_target = body.target.strip()
        clean_otp = body.otp.strip()

        record = db.otp_verifications.find_one({"target": clean_target})

        # Allow default dev OTP '123456' or generated code
        valid_otp = record.get("otp") if record else None
        if clean_otp != valid_otp and clean_otp != "123456":
            raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

        # Find or create user
        is_email = "@" in clean_target
        query = {"email": clean_target} if is_email else {"mobile": clean_target}
        user = db.users.find_one(query)

        if not user:
            new_user = {
                "name": "Akshat",
                "created_at": datetime.utcnow().isoformat(),
            }
            if is_email:
                new_user["email"] = clean_target
            else:
                new_user["mobile"] = clean_target

            res = db.users.insert_one(new_user)
            user_id = str(res.inserted_id)
            user_name = "Akshat"
        else:
            user_id = str(user["_id"])
            user_name = user.get("name", "Akshat")

        # Invalidate OTP
        db.otp_verifications.delete_one({"target": clean_target})

        token = create_access_token({"sub": user_id})
        return TokenResponse(
            access_token=token,
            user=UserOut(
                id=user_id,
                email=clean_target if is_email else None,
                mobile=clean_target if not is_email else None,
                name=user_name,
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.post("/google", response_model=TokenResponse)
def google_auth(body: GoogleLoginRequest):
    """
    Google One-Tap / OAuth sign in.
    Verifies the Google ID token server-side and issues a DocVault JWT.
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID not configured on server")

    avatar = None
    try:
        # Verify the real Google ID token with Google's public key certs
        payload = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        email = payload.get("email")
        name = payload.get("name") or email.split("@")[0]
        google_id = payload.get("sub")
        avatar = payload.get("picture")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google authentication failed: {str(e)}")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email address")

    try:
        db = get_db()
        user = db.users.find_one({"email": email})

        if not user:
            new_user = {
                "email": email,
                "name": name,
                "google_id": google_id,
                "avatar": payload.get("picture"),
                "created_at": datetime.utcnow().isoformat(),
            }
            res = db.users.insert_one(new_user)
            user_id = str(res.inserted_id)
        else:
            user_id = str(user["_id"])
            name = user.get("name", name)
            # Keep google_id up to date if user previously signed up via email
            if not user.get("google_id"):
                db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"google_id": google_id, "avatar": payload.get("picture")}},
                )

        token = create_access_token({"sub": user_id})
        return TokenResponse(
            access_token=token,
            user=UserOut(id=user_id, email=email, name=name),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google login failed: {str(e)}")
