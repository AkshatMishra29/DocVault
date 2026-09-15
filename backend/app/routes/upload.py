import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.db.database import get_db
from app.models.document import DocumentOut
from app.services.embedding_service import add_document
from app.services.ocr_service import extract_text, detect_category, detect_expiry_date
from app.utils.auth_utils import get_current_user

router = APIRouter(tags=["upload"])

UPLOAD_DIR = "./uploads"
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"}


@router.post("/upload/analyze")
async def analyze_document_preupload(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """
    Analyzes an uploaded file without saving to permanent vault:
    Runs OCR and auto-detects category & expiry date to prefill upload UI.
    """
    try:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Allowed: PDF, PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP",
            )

        temp_dir = os.path.join(UPLOAD_DIR, "temp", user_id)
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"temp_{int(datetime.utcnow().timestamp())}_{file.filename}")

        contents = await file.read()
        with open(temp_path, "wb") as f:
            f.write(contents)

        # Run OCR
        ocr_text = extract_text(temp_path)
        detected_category = detect_category(ocr_text)
        detected_expiry = detect_expiry_date(ocr_text)

        # Cleanup temp file
        try:
            os.remove(temp_path)
        except Exception:
            pass

        return {
            "filename": file.filename,
            "detected_category": detected_category,
            "detected_expiry_date": detected_expiry,
            "ocr_preview": (ocr_text[:300] + "...") if len(ocr_text) > 300 else ocr_text,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form(None),
    expiry_date: str = Form(None),
    member_id: str = Form("me"),
    user_id: str = Depends(get_current_user),
):
    try:
        # Validate file extension
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Allowed: PDF, PNG, JPG, JPEG, GIF, BMP, TIFF, WEBP",
            )

        # Save file to disk
        user_dir = os.path.join(UPLOAD_DIR, user_id)
        os.makedirs(user_dir, exist_ok=True)

        # Avoid filename collisions
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_")
        safe_filename = timestamp + (file.filename or "document")
        filepath = os.path.join(user_dir, safe_filename)

        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        # Run OCR extraction
        ocr_text = extract_text(filepath)

        # Auto-detect if not provided or empty
        final_category = category.strip() if category and category.strip() else None
        if not final_category or final_category == "Auto-Detect":
            final_category = detect_category(ocr_text)

        final_expiry = expiry_date.strip() if expiry_date and expiry_date.strip() else None
        if not final_expiry:
            final_expiry = detect_expiry_date(ocr_text)

        # Insert into MongoDB
        db = get_db()
        now = datetime.utcnow().isoformat()
        doc = {
            "user_id": user_id,
            "filename": file.filename or safe_filename,
            "filepath": filepath,
            "category": final_category,
            "expiry_date": final_expiry,
            "ocr_text": ocr_text,
            "member_id": member_id or "me",
            "remind_me": True,
            "created_at": now,
        }
        result = db.documents.insert_one(doc)
        doc_id = str(result.inserted_id)

        # Embed into ChromaDB for semantic search with OCR text & metadata
        embed_text = (
            f"Filename: {file.filename or safe_filename}\n"
            f"Category: {final_category}\n"
            f"Expiry Date: {final_expiry or 'None'}\n"
            f"Content: {ocr_text}"
        )
        add_document(doc_id, embed_text, user_id)

        return DocumentOut(
            id=doc_id,
            filename=file.filename or safe_filename,
            category=final_category,
            expiry_date=final_expiry,
            ocr_text=ocr_text,
            created_at=now,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
