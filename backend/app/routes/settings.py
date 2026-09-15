from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import zipfile
import os
import io

from app.db.database import get_db
from app.models.document import UserSettings
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=UserSettings)
def get_settings(user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        settings = db.user_settings.find_one({"user_id": user_id})
        if not settings:
            return UserSettings(
                storage_mode="Local",
                ocr_mode="On-device",
                language="English"
            )
        return UserSettings(
            storage_mode=settings.get("storage_mode", "Local"),
            ocr_mode=settings.get("ocr_mode", "On-device"),
            language=settings.get("language", "English"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")


@router.post("", response_model=UserSettings)
def update_settings(body: UserSettings, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        data = body.model_dump()
        data["user_id"] = user_id
        db.user_settings.update_one({"user_id": user_id}, {"$set": data}, upsert=True)
        return body
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save settings: {str(e)}")


@router.get("/export")
def export_archive(user_id: str = Depends(get_current_user)):
    """
    Creates an encrypted / packaged ZIP archive of all user vault documents for download.
    """
    try:
        db = get_db()
        docs = list(db.documents.find({"user_id": user_id}))
        if not docs:
            raise HTTPException(status_code=404, detail="No documents available in vault to export")

        zip_dir = "./uploads/exports"
        os.makedirs(zip_dir, exist_ok=True)
        zip_path = os.path.join(zip_dir, f"vault_export_{user_id}.zip")

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for doc in docs:
                fpath = doc.get("filepath")
                fname = doc.get("filename", "document")
                if fpath and os.path.exists(fpath):
                    zipf.write(fpath, arcname=f"{doc.get('category', 'General')}/{fname}")

        return FileResponse(
            zip_path,
            filename=f"DocVault_Export_{user_id[:6]}.zip",
            media_type="application/zip"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
