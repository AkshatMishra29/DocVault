import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from app.db.database import get_db
from app.services.embedding_service import query_documents
from app.services.llm_service import generate_answer, generate_update_proposal
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/search", tags=["search"])


class SearchRequest(BaseModel):
    query: str


# Intent detection pattern for update commands
UPDATE_PATTERNS = [
    r"\b(update|change|modify|set|alter|mark|edit|renew)\b",
    r"\b(expiry|category|date|validity)\s+to\b",
]


def is_update_intent(query: str) -> bool:
    q_lower = query.lower()
    for pat in UPDATE_PATTERNS:
        if re.search(pat, q_lower):
            return True
    return False


@router.post("")
def search(body: SearchRequest, user_id: str = Depends(get_current_user)):
    try:
        if not body.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")

        # Retrieve top 3 semantically relevant docs for this user
        results = query_documents(body.query, user_id, top_k=3)

        # Enrich with filenames and details from MongoDB
        db = get_db()
        referenced_documents = []
        for r in results:
            try:
                from bson import ObjectId
                doc = db.documents.find_one({"_id": ObjectId(r["doc_id"])})
                if doc:
                    referenced_documents.append({
                        "id": r["doc_id"],
                        "filename": doc.get("filename", ""),
                        "category": doc.get("category", ""),
                        "expiry_date": doc.get("expiry_date"),
                    })
            except Exception:
                pass

        # Check for UPDATE intention
        if is_update_intent(body.query):
            proposal = generate_update_proposal(body.query, results)
            if proposal and "doc_id" in proposal:
                # Verify document ownership
                try:
                    from bson import ObjectId
                    target_doc = db.documents.find_one({"_id": ObjectId(proposal["doc_id"])})
                    if target_doc and target_doc.get("user_id") == user_id:
                        field = proposal.get("field")
                        old_value = target_doc.get(field)
                        return {
                            "type": "update_proposal",
                            "answer": (
                                f"I found **{target_doc.get('filename')}**. "
                                f"Would you like me to update **{field.replace('_', ' ')}** "
                                f"from `{old_value or 'None'}` to `{proposal.get('new_value')}`?"
                            ),
                            "proposal": {
                                "doc_id": proposal["doc_id"],
                                "doc_filename": target_doc.get("filename"),
                                "field": field,
                                "old_value": old_value,
                                "new_value": proposal.get("new_value"),
                                "explanation": proposal.get("explanation"),
                            },
                            "referenced_documents": referenced_documents,
                        }
                except Exception:
                    pass

        # Default: Grounded Q&A
        answer = generate_answer(body.query, results)

        return {
            "type": "answer",
            "answer": answer,
            "referenced_documents": referenced_documents,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
