import chromadb
from sentence_transformers import SentenceTransformer
from typing import List, Dict
import os
from dotenv import load_dotenv

load_dotenv()

# Set HuggingFace token for authenticated model downloads (avoids rate limits)
hf_token = os.getenv("HF_TOKEN")
if hf_token:
    os.environ["HUGGINGFACE_HUB_TOKEN"] = hf_token


_model: SentenceTransformer = None
_collection = None

CHROMA_PATH = "./chroma_db"
COLLECTION_NAME = "doc_vault_documents"


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_document(doc_id: str, text: str, user_id: str) -> None:
    """Embed text and upsert into ChromaDB with user_id metadata."""
    try:
        model = _get_model()
        collection = _get_collection()
        embedding = model.encode(text).tolist()
        collection.upsert(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[text],
            metadatas=[{"user_id": user_id, "doc_id": doc_id}],
        )
    except Exception as e:
        print(f"[embedding_service] add_document error: {e}")
        raise


def query_documents(query_text: str, user_id: str, top_k: int = 3) -> List[Dict]:
    """Embed query and retrieve top_k docs filtered strictly to user_id."""
    try:
        model = _get_model()
        collection = _get_collection()

        total = collection.count()
        if total == 0:
            return []

        embedding = model.encode(query_text).tolist()

        try:
            results = collection.query(
                query_embeddings=[embedding],
                n_results=min(top_k, total),
                where={"user_id": user_id},
            )
        except Exception as inner_e:
            # ChromaDB raises when where-filter matches 0 docs in some versions
            err_str = str(inner_e).lower()
            if "no documents" in err_str or "number of requested results" in err_str or "where" in err_str:
                return []
            raise

        output = []
        if results and results.get("ids") and results["ids"][0]:
            for i, doc_id in enumerate(results["ids"][0]):
                output.append({
                    "doc_id": doc_id,
                    "text": (results["documents"][0][i]
                             if results.get("documents") else ""),
                    "distance": (results["distances"][0][i]
                                 if results.get("distances") else 1.0),
                })
        return output

    except Exception as e:
        print(f"[embedding_service] query_documents error: {e}")
        return []


def delete_document(doc_id: str) -> None:
    """Remove a document from ChromaDB by its ID."""
    try:
        collection = _get_collection()
        collection.delete(ids=[doc_id])
    except Exception as e:
        # Non-critical — log but don't raise
        print(f"[embedding_service] delete_document error: {e}")
