import os
from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.db.database import get_db
from app.models.document import CardOut, DocumentOut
from app.services.embedding_service import add_document
from app.services.ocr_service import extract_text, detect_category, detect_expiry_date
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/cards", tags=["cards"])

CARDS_UPLOAD_DIR = "./uploads/cards"
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"}


def _resolve_id(card_id: str) -> ObjectId:
    try:
        return ObjectId(card_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Card not found")


@router.post("/scan-text")
async def scan_text_from_snapshot(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """
    Live Camera / Image OCR scanner for Quick Cards:
    Extracts text instantly from camera snapshot or image file using Gemini Vision.
    """
    try:
        user_temp_dir = os.path.join(CARDS_UPLOAD_DIR, "temp", user_id)
        os.makedirs(user_temp_dir, exist_ok=True)
        temp_path = os.path.join(user_temp_dir, f"scan_{int(datetime.utcnow().timestamp())}_{file.filename or 'snapshot.jpg'}")

        contents = await file.read()
        with open(temp_path, "wb") as f:
            f.write(contents)

        extracted = extract_text(temp_path)
        try:
            os.remove(temp_path)
        except Exception:
            pass

        return {
            "text": extracted,
            "char_count": len(extracted),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR scan failed: {str(e)}")


@router.post("", response_model=CardOut)
async def create_card(
    file: Optional[UploadFile] = File(None),
    caption: str = Form(""),
    text_content: Optional[str] = Form(""),
    category: Optional[str] = Form("General"),
    user_id: str = Depends(get_current_user),
):
    """
    Quick capture: saves text card, image snapshot, or OCR scanned card into quick stash.
    """
    try:
        filepath = None
        safe_filename = None

        if file and file.filename:
            ext = os.path.splitext(file.filename or "")[1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(status_code=400, detail="Invalid card image format")

            user_card_dir = os.path.join(CARDS_UPLOAD_DIR, user_id)
            os.makedirs(user_card_dir, exist_ok=True)

            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_")
            safe_filename = timestamp + file.filename
            filepath = os.path.join(user_card_dir, safe_filename)

            contents = await file.read()
            with open(filepath, "wb") as f:
                f.write(contents)

        clean_caption = caption.strip() if caption and caption.strip() else (safe_filename or "Quick Text Card")
        clean_text = text_content.strip() if text_content else ""

        now = datetime.utcnow().isoformat()
        db = get_db()
        card_data = {
            "user_id": user_id,
            "filename": safe_filename or "Quick Note",
            "filepath": filepath,
            "caption": clean_caption,
            "text_content": clean_text,
            "category": category or "General",
            "created_at": now,
        }
        res = db.cards.insert_one(card_data)
        card_id = str(res.inserted_id)

        # Embed caption, category, and text_content into ChromaDB vector search
        embed_parts = [f"Card: {clean_caption}", f"Category: {category}"]
        if clean_text:
            embed_parts.append(f"Content: {clean_text}")
        if safe_filename:
            embed_parts.append(f"Filename: {safe_filename}")
        embed_text = "\n".join(embed_parts)
        add_document(card_id, embed_text, user_id)

        return CardOut(
            id=card_id,
            caption=clean_caption,
            created_at=now,
            image_url=f"/cards/{card_id}/image" if filepath else None,
            text_content=clean_text or None,
            category=category or "General",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create quick card: {str(e)}")


@router.get("", response_model=List[CardOut])
def list_cards(user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        cards = list(db.cards.find({"user_id": user_id}).sort("created_at", -1))
        return [
            CardOut(
                id=str(c["_id"]),
                caption=c.get("caption", "Quick Card"),
                created_at=c.get("created_at", ""),
                image_url=f"/cards/{str(c['_id'])}/image" if c.get("filepath") else None,
                text_content=c.get("text_content"),
                category=c.get("category", "General"),
            )
            for c in cards
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load cards: {str(e)}")


@router.get("/{card_id}/image")
def get_card_image(card_id: str, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        card = db.cards.find_one({"_id": _resolve_id(card_id)})
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        if card["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        filepath = card.get("filepath")
        if not filepath or not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Image file not found on disk")

        return FileResponse(filepath)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving image: {str(e)}")


@router.post("/{card_id}/promote", response_model=DocumentOut)
def promote_card(card_id: str, user_id: str = Depends(get_current_user)):
    """
    Promotes a Quick Card to a permanent Vault Document:
    Runs OCR, auto-categorizes, auto-detects expiry, and vector-indexes into ChromaDB.
    """
    try:
        db = get_db()
        oid = _resolve_id(card_id)
        card = db.cards.find_one({"_id": oid})
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        if card["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        filepath = card.get("filepath")
        filename = card.get("filename", "promoted_doc.jpg")

        # Run OCR or use stored text_content
        ocr_text = extract_text(filepath) if filepath and os.path.exists(filepath) else ""
        if not ocr_text and card.get("text_content"):
            ocr_text = card.get("text_content", "")

        detected_category = card.get("category") or detect_category(ocr_text) or "General"
        detected_expiry = detect_expiry_date(ocr_text)

        now = datetime.utcnow().isoformat()
        doc = {
            "user_id": user_id,
            "filename": filename,
            "filepath": filepath,
            "category": detected_category,
            "expiry_date": detected_expiry,
            "ocr_text": ocr_text,
            "created_at": now,
        }
        res = db.documents.insert_one(doc)
        doc_id = str(res.inserted_id)

        # Index in ChromaDB
        embed_text = (
            f"Filename: {filename}\n"
            f"Category: {detected_category}\n"
            f"Expiry Date: {detected_expiry or 'None'}\n"
            f"Content: {ocr_text}"
        )
        add_document(doc_id, embed_text, user_id)

        # Remove from cards
        db.cards.delete_one({"_id": oid})

        return DocumentOut(
            id=doc_id,
            filename=filename,
            category=detected_category,
            expiry_date=detected_expiry,
            ocr_text=ocr_text,
            created_at=now,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to promote card: {str(e)}")


@router.delete("/{card_id}")
def delete_card(card_id: str, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        oid = _resolve_id(card_id)
        card = db.cards.find_one({"_id": oid})
        if not card:
            raise HTTPException(status_code=404, detail="Card not found")
        if card["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        filepath = card.get("filepath")
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

        db.cards.delete_one({"_id": oid})
        return {"message": "Card deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete card: {str(e)}")
@router.post("/prompt", tags=["cards"])
def card_prompt(body: dict, user_id: str = Depends(get_current_user)):
    """Accept a free‑form prompt and return matching cards or documents via LLM."""
    from app.services.llm_service import generate_answer
    from app.services.embedding_service import query_documents
    from app.db.database import get_db

    query = body.get("prompt", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    db = get_db()
    # Retrieve top 4 relevant embeddings (cards and documents indexed in ChromaDB)
    results = query_documents(query, user_id, top_k=4)

    # Also retrieve user's cards directly from MongoDB to ensure high context coverage
    user_cards = list(db.cards.find({"user_id": user_id}).sort("created_at", -1).limit(10))
    for c in user_cards:
        cid = str(c["_id"])
        # Check if already present in results
        if not any(r.get("doc_id") == cid for r in results):
            parts = [f"Card: {c.get('caption', '')}", f"Category: {c.get('category', '')}"]
            if c.get("text_content"):
                parts.append(f"Content: {c.get('text_content')}")
            if c.get("filename"):
                parts.append(f"File: {c.get('filename')}")
            card_text = " | ".join(parts)
            results.append({"doc_id": cid, "text": card_text})

    referenced = []
    for r in results:
        try:
            from bson import ObjectId
            # Try document first
            doc = db.documents.find_one({"_id": ObjectId(r["doc_id"])})
            if doc:
                referenced.append({
                    "type": "document",
                    "id": r["doc_id"],
                    "filename": doc.get("filename", ""),
                    "category": doc.get("category", ""),
                    "expiry_date": doc.get("expiry_date"),
                })
                continue
            # Then card
            card = db.cards.find_one({"_id": ObjectId(r["doc_id"])})
            if card:
                referenced.append({
                    "type": "card",
                    "id": r["doc_id"],
                    "caption": card.get("caption", ""),
                    "filename": card.get("filename", ""),
                    "image_url": f"/cards/{r['doc_id']}/image",
                })
        except Exception:
            pass

    answer = generate_answer(query, results)
    return {
        "type": "answer",
        "answer": answer,
        "referenced_items": referenced,
    }

