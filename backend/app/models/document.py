from pydantic import BaseModel
from typing import Optional, List


class DocumentOut(BaseModel):
    id: str
    filename: str
    category: str
    expiry_date: Optional[str] = None
    ocr_text: Optional[str] = None
    member_id: Optional[str] = "me"
    member_name: Optional[str] = "Me (Akshat)"
    remind_me: Optional[bool] = True
    created_at: str


class DocumentUpdate(BaseModel):
    category: Optional[str] = None
    expiry_date: Optional[str] = None
    member_id: Optional[str] = None
    remind_me: Optional[bool] = None


class CardOut(BaseModel):
    id: str
    caption: str
    created_at: str
    image_url: Optional[str] = None
    text_content: Optional[str] = None
    category: Optional[str] = None


class CardCreate(BaseModel):
    caption: Optional[str] = ""
    text_content: Optional[str] = ""
    category: Optional[str] = "General"


class FamilyMemberOut(BaseModel):
    id: str
    name: str
    relation: str
    initials: str
    document_count: Optional[int] = 0


class FamilyMemberCreate(BaseModel):
    name: str
    relation: str


class ShareLinkOut(BaseModel):
    id: str
    document_id: str
    document_name: str
    token: str
    share_url: str
    status: str  # "Active" or "Revoked"
    expires_at: Optional[str] = None
    created_at: str


class ShareLinkCreate(BaseModel):
    document_id: str
    expiry_days: Optional[int] = 7


class UserSettings(BaseModel):
    storage_mode: str = "Local"  # "Cloud" or "Local"
    ocr_mode: str = "On-device"  # "Server" or "On-device"
    language: str = "English"
