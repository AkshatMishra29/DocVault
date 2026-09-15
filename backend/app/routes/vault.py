from typing import List, Optional
import os

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.db.database import get_db
from app.models.document import DocumentOut, DocumentUpdate
from app.services.embedding_service import delete_document, add_document
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/vault", tags=["vault"])


def _doc_to_out(doc: dict, db=None) -> DocumentOut:
    member_name = "Me (Akshat)"
    m_id = doc.get("member_id", "me")
    if db is not None and m_id and m_id != "me":
        try:
            m = db.family_members.find_one({"_id": ObjectId(m_id)})
            if m:
                member_name = f"{m.get('name')} ({m.get('relation')})"
        except Exception:
            pass

    return DocumentOut(
        id=str(doc["_id"]),
        filename=doc.get("filename", ""),
        category=doc.get("category", ""),
        expiry_date=doc.get("expiry_date"),
        ocr_text=doc.get("ocr_text", ""),
        member_id=m_id,
        member_name=member_name,
        remind_me=doc.get("remind_me", True),
        created_at=doc.get("created_at", ""),
    )


def _resolve_id(doc_id: str) -> ObjectId:
    try:
        return ObjectId(doc_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("", response_model=List[DocumentOut])
def list_vault(member_id: Optional[str] = None, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        query = {"user_id": user_id}
        if member_id and member_id != "all":
            if member_id == "me":
                query["$or"] = [{"member_id": "me"}, {"member_id": None}]
            else:
                query["member_id"] = member_id

        docs = list(db.documents.find(query).sort("created_at", -1))
        return [_doc_to_out(d, db) for d in docs]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch vault: {str(e)}")


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(doc_id: str, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        doc = db.documents.find_one({"_id": _resolve_id(doc_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return _doc_to_out(doc, db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch document: {str(e)}")


@router.patch("/{doc_id}", response_model=DocumentOut)
def update_vault_document(doc_id: str, payload: DocumentUpdate, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        oid = _resolve_id(doc_id)
        doc = db.documents.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        update_fields = {}
        if payload.category is not None:
            update_fields["category"] = payload.category
        if payload.expiry_date is not None:
            update_fields["expiry_date"] = payload.expiry_date if payload.expiry_date != "" else None
        if payload.member_id is not None:
            update_fields["member_id"] = payload.member_id
        if payload.remind_me is not None:
            update_fields["remind_me"] = payload.remind_me

        if update_fields:
            db.documents.update_one({"_id": oid}, {"$set": update_fields})
            doc = db.documents.find_one({"_id": oid})

            # Update ChromaDB vector index embedding
            ocr_text = doc.get("ocr_text", "")
            embed_text = (
                f"Filename: {doc.get('filename', '')}\n"
                f"Category: {doc.get('category', '')}\n"
                f"Expiry Date: {doc.get('expiry_date') or 'None'}\n"
                f"Content: {ocr_text}"
            )
            add_document(doc_id, embed_text, user_id)

        return _doc_to_out(doc, db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.get("/{doc_id}/file")
def get_document_file(doc_id: str, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        doc = db.documents.find_one({"_id": _resolve_id(doc_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        filepath = doc.get("filepath")
        if not filepath or not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Original file not found on disk")

        return FileResponse(filepath, filename=doc.get("filename", "document"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File download failed: {str(e)}")


@router.delete("/{doc_id}")
def delete_vault_document(doc_id: str, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        oid = _resolve_id(doc_id)
        doc = db.documents.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        filepath = doc.get("filepath")
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass

        db.documents.delete_one({"_id": oid})
        delete_document(doc_id)
        return {"message": "Document deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
