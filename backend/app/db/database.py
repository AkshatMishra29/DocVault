from pymongo import MongoClient
from pymongo.database import Database
import os
from dotenv import load_dotenv

load_dotenv()

_client: MongoClient = None
_db: Database = None


def connect_db():
    global _client, _db
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise ValueError("MONGODB_URI environment variable not set")
    _client = MongoClient(uri)
    _db = _client.get_database("docvault")
    # Ensure unique sparse index on users.email so null emails don't conflict
    try:
        # If old non-sparse index exists, drop it
        indices = _db.users.index_information()
        if "email_1" in indices and not indices["email_1"].get("sparse", False):
            _db.users.drop_index("email_1")
    except Exception:
        pass
    _db.users.create_index("email", unique=True, sparse=True)
    _db.users.create_index("mobile", unique=True, sparse=True)
    print("✅ Connected to MongoDB Atlas")


def get_db() -> Database:
    if _db is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    return _db
