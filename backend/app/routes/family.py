from typing import List, Optional
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from app.db.database import get_db
from app.models.document import FamilyMemberOut, FamilyMemberCreate
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/family", tags=["family"])


def _init_default_members(user_id: str, db):
    """Initializes default members (Me, Dad, Mom) if user has none."""
    count = db.family_members.count_documents({"user_id": user_id})
    if count == 0:
        defaults = [
            {"user_id": user_id, "name": "Me", "relation": "Self", "initials": "ME"},
            {"user_id": user_id, "name": "Dad", "relation": "Father", "initials": "DA"},
            {"user_id": user_id, "name": "Mom", "relation": "Mother", "initials": "MO"},
        ]
        db.family_members.insert_many(defaults)


@router.get("", response_model=List[FamilyMemberOut])
def list_family_members(user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        _init_default_members(user_id, db)

        members = list(db.family_members.find({"user_id": user_id}))
        result = []
        for m in members:
            m_id = str(m["_id"])
            doc_count = db.documents.count_documents({"user_id": user_id, "member_id": m_id})
            # Also account for legacy or default "me"
            if m.get("relation") == "Self":
                doc_count += db.documents.count_documents({
                    "user_id": user_id,
                    "$or": [{"member_id": "me"}, {"member_id": None}],
                })

            result.append(
                FamilyMemberOut(
                    id=m_id,
                    name=m["name"],
                    relation=m["relation"],
                    initials=m.get("initials", m["name"][:2].upper()),
                    document_count=doc_count,
                )
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch family members: {str(e)}")


@router.post("", response_model=FamilyMemberOut)
def add_family_member(body: FamilyMemberCreate, user_id: str = Depends(get_current_user)):
    try:
        db = get_db()
        name = body.name.strip()
        relation = body.relation.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")

        initials = (name[:2]).upper()
        doc = {
            "user_id": user_id,
            "name": name,
            "relation": relation or "Family",
            "initials": initials,
        }
        res = db.family_members.insert_one(doc)
        return FamilyMemberOut(
            id=str(res.inserted_id),
            name=name,
            relation=relation or "Family",
            initials=initials,
            document_count=0,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add member: {str(e)}")
