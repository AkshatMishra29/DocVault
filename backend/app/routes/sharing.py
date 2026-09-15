import secrets
from datetime import datetime, timedelta
from typing import List
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import os

from app.db.database import get_db
from app.models.document import ShareLinkOut, ShareLinkCreate
from app.utils.auth_utils import get_current_user

router = APIRouter(tags=["sharing"])


def _resolve_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Resource not found")


@router.get("/sharing", response_model=List[ShareLinkOut])
def list_share_links(user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        links = list(db.shared_links.find({"user_id": user_id}).sort("created_at", -1))
        out = []
        for l in links:
            out.append(
                ShareLinkOut(
                    id=str(l["_id"]),
                    document_id=l["document_id"],
                    document_name=l.get("document_name", "Shared Document"),
                    token=l["token"],
                    share_url=f"http://localhost:3000/s/{l['token']}",
                    status=l.get("status", "Active"),
                    expires_at=l.get("expires_at"),
                    created_at=l.get("created_at", ""),
                )
            )
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch links: {str(e)}")


@router.post("/sharing", response_model=ShareLinkOut)
def create_share_link(body: ShareLinkCreate, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        doc_oid = _resolve_id(body.document_id)
        doc = db.documents.find_one({"_id": doc_oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        token = secrets.token_urlsafe(16)
        now = datetime.utcnow()
        expires_at = (now + timedelta(days=body.expiry_days or 7)).isoformat()

        link_data = {
            "user_id": user_id,
            "document_id": body.document_id,
            "document_name": doc.get("filename", "Shared Document"),
            "token": token,
            "status": "Active",
            "expires_at": expires_at,
            "created_at": now.isoformat(),
        }
        res = db.shared_links.insert_one(link_data)

        return ShareLinkOut(
            id=str(res.inserted_id),
            document_id=body.document_id,
            document_name=link_data["document_name"],
            token=token,
            share_url=f"http://localhost:3000/s/{token}",
            status="Active",
            expires_at=expires_at,
            created_at=link_data["created_at"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate share link: {str(e)}")


@router.patch("/sharing/{link_id}/revoke")
def revoke_share_link(link_id: str, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        oid = _resolve_id(link_id)
        link = db.shared_links.find_one({"_id": oid})
        if not link:
            raise HTTPException(status_code=404, detail="Link not found")
        if link["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        db.shared_links.update_one({"_id": oid}, {"$set": {"status": "Revoked"}})
        return {"message": "Share link revoked successfully", "status": "Revoked"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Revocation failed: {str(e)}")


@router.get("/public/share/{token}")
@router.get("/sharing/doc/{token}")
def get_public_share(token: str):
    """
    Public access endpoint for valid, unrevoked share links.
    """
    try:
        db = get_db()
        link = db.shared_links.find_one({"token": token})
        if not link:
            raise HTTPException(status_code=404, detail="Shared link does not exist")
        if link.get("status") == "Revoked":
            raise HTTPException(status_code=410, detail="This shared link has been revoked by the owner")

        # Check expiry
        if link.get("expires_at"):
            exp = datetime.fromisoformat(link["expires_at"])
            if datetime.utcnow() > exp:
                raise HTTPException(status_code=410, detail="This shared link has expired")

        doc = db.documents.find_one({"_id": ObjectId(link["document_id"])})
        if not doc:
            raise HTTPException(status_code=404, detail="Document no longer exists")

        return {
            "filename": doc.get("filename"),
            "category": doc.get("category"),
            "expiry_date": doc.get("expiry_date"),
            "created_at": doc.get("created_at"),
            "ocr_text": doc.get("ocr_text"),
            "download_available": bool(doc.get("filepath") and os.path.exists(doc.get("filepath"))),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error accessing shared document: {str(e)}")
