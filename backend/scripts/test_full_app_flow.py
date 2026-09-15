import os
import sys
import time
from pathlib import Path

import requests

BASE = Path(__file__).resolve().parents[2]
TEST_DIR = BASE / "test_samples"
API_BASE = "http://localhost:8000"


def ensure_backend_running():
    try:
        r = requests.get(f"{API_BASE}/", timeout=5)
        print("Backend health:", r.status_code, r.text)
        if r.status_code != 200:
            raise RuntimeError("Backend not responding")
    except Exception as exc:
        print("Backend is not running. Start it first with:")
        print("cd /Users/sanjaymishra/Desktop/DocVault/backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000")
        raise SystemExit(str(exc))


def signup_and_login(email: str, password: str):
    signup = requests.post(
        f"{API_BASE}/auth/signup",
        json={"email": email, "password": password, "name": "QA Demo User"},
        timeout=20,
    )
    print("Signup:", signup.status_code, signup.text)
    if signup.status_code == 400:
        login = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=20,
        )
        print("Login fallback:", login.status_code, login.text)
        return login.json().get("access_token")

    return signup.json().get("access_token")


def upload_file(token: str, file_path: Path):
    headers = {"Authorization": f"Bearer {token}"}
    with file_path.open("rb") as f:
        res = requests.post(
            f"{API_BASE}/upload",
            headers=headers,
            files={"file": (file_path.name, f, "image/png")},
            data={"category": "", "expiry_date": "", "member_id": "me"},
            timeout=60,
        )
    print(f"Upload {file_path.name}:", res.status_code, res.text)
    return res.json()


def main():
    ensure_backend_running()
    email = f"docvault.qa.{int(time.time())}@example.com"
    password = "TestPass123!"
    token = signup_and_login(email, password)
    if not token:
        raise SystemExit("No token returned")

    pngs = sorted(TEST_DIR.glob("*.png"))
    print(f"Uploading {len(pngs)} sample documents...")
    docs = []
    for png in pngs:
        doc = upload_file(token, png)
        docs.append(doc)

    headers = {"Authorization": f"Bearer {token}"}

    vault = requests.get(f"{API_BASE}/vault", headers=headers, timeout=20)
    print("Vault list:", vault.status_code, vault.text)

    search = requests.post(
        f"{API_BASE}/search",
        headers=headers,
        json={"query": "Which document has my health insurance expiry date and what is it?"},
        timeout=30,
    )
    print("Search:", search.status_code, search.text)

    reminders = requests.get(f"{API_BASE}/reminders", headers=headers, timeout=20)
    print("Reminders:", reminders.status_code, reminders.text)

    family = requests.get(f"{API_BASE}/family", headers=headers, timeout=20)
    print("Family:", family.status_code, family.text)

    add_family = requests.post(
        f"{API_BASE}/family",
        headers=headers,
        json={"name": "Aarav", "relation": "Child"},
        timeout=20,
    )
    print("Add family:", add_family.status_code, add_family.text)

    if docs:
        share = requests.post(
            f"{API_BASE}/sharing",
            headers=headers,
            json={"document_id": docs[0]["id"], "expiry_days": 7},
            timeout=20,
        )
        print("Share link:", share.status_code, share.text)

    settings = requests.get(f"{API_BASE}/settings", headers=headers, timeout=20)
    print("Settings:", settings.status_code, settings.text)

    save_settings = requests.post(
        f"{API_BASE}/settings",
        headers=headers,
        json={"storage_mode": "Local", "ocr_mode": "On-device", "language": "English"},
        timeout=20,
    )
    print("Save settings:", save_settings.status_code, save_settings.text)

    print("\nCompleted full app flow smoke test.")


if __name__ == "__main__":
    main()
