from datetime import datetime, timedelta
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.db.database import get_db
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("")
def get_reminders(user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        today = datetime.utcnow().date()
        cutoff = today + timedelta(days=180)  # Show expiring docs

        # Fetch all documents that have an expiry_date
        docs = list(
            db.documents.find(
                {"user_id": user_id, "expiry_date": {"$exists": True, "$ne": None, "$ne": ""}}
            )
        )

        reminders = []
        for doc in docs:
            expiry_str = doc.get("expiry_date")
            if not expiry_str:
                continue
            try:
                expiry_date = datetime.strptime(expiry_str, "%Y-%m-%d").date()
            except ValueError:
                continue

            days_remaining = (expiry_date - today).days

            # Determine status
            status = "Expired" if days_remaining < 0 else "Expiring Soon"

            # Member attribution
            member_name = "Me (Akshat)"
            m_id = doc.get("member_id", "me")
            if m_id and m_id != "me":
                try:
                    m = db.family_members.find_one({"_id": ObjectId(m_id)})
                    if m:
                        member_name = f"{m.get('name')} ({m.get('relation')})"
                except Exception:
                    pass

            reminders.append({
                "id": str(doc["_id"]),
                "filename": doc.get("filename", ""),
                "category": doc.get("category", ""),
                "expiry_date": expiry_str,
                "status": status,
                "days_remaining": days_remaining,
                "remind_me": doc.get("remind_me", True),
                "member_name": member_name,
            })

        # Sort soonest / most urgent first
        reminders.sort(key=lambda x: x["days_remaining"])
        return reminders

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reminders: {str(e)}")


@router.patch("/{doc_id}/toggle")
def toggle_reminder(doc_id: str, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        doc = db.documents.find_one({"_id": ObjectId(doc_id)})
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        if doc["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        current = doc.get("remind_me", True)
        db.documents.update_one({"_id": ObjectId(doc_id)}, {"$set": {"remind_me": not current}})
        return {"remind_me": not current}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Toggle failed: {str(e)}")
