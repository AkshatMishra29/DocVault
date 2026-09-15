from pydantic import BaseModel, EmailStr
from typing import Optional


class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = "Akshat"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class MobileOTPRequest(BaseModel):
    mobile: str


class VerifyOTPRequest(BaseModel):
    target: str  # mobile or email
    otp: str


class GoogleLoginRequest(BaseModel):
    credential: str  # Google token or email identifier
    email: Optional[str] = None
    name: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: Optional[str] = None
    mobile: Optional[str] = None
    name: Optional[str] = "Akshat"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
