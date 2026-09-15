# Doc Vault
### An AI-Powered Personal Document Management System

> "Ask your documents, don't search for them."

---

## 1. Overview

Doc Vault is a personal (with a planned family) document management application that goes beyond simple file storage. It understands what a document is, tracks its validity proactively, and lets users search and update it using natural language — all while staying private-by-default.

Unlike generic storage tools, Doc Vault is built around **document intelligence**: OCR-driven understanding, automatic categorization, expiry tracking, and a conversational, ChatGPT-style interface as the primary way users interact with their documents.

---

## 2. Problem Statement & Market Gap

Existing solutions fail personal document management in specific ways:

| Platform | Limitation |
|---|---|
| **DigiLocker** | Government documents only, clunky UX, no offline resilience, no family support, no proactive intelligence |
| **Google Drive** | Generic file storage with zero understanding of document meaning, no expiry tracking, weak privacy guarantees for sensitive documents |
| **WhatsApp** (informal use) | Files get compressed/corrupted, no organization, easily lost when chats are cleared or phones are changed |

**The gap:** no existing tool combines document intelligence, proactive expiry tracking, natural-language interaction, and strict privacy in a single, purpose-built product for individuals and families.

---

## 3. Core Value Proposition

1. **Understands documents**, not just stores them — via OCR and automatic categorization
2. **Proactively tracks validity** — expiry dates surfaced before they become a problem
3. **Conversational interface** — a prompt-first, ChatGPT-style home screen instead of folder browsing
4. **Privacy by design** — strict per-user data isolation, minimal necessary data exposure
5. **Built for real households** (planned) — family-aware document management, not single-account-only

---

## 4. Feature List

### 4.1 Authentication
- Email + password signup/login (bcrypt hashing, JWT sessions)
- Google Sign-In (OAuth 2.0)
- Email OTP verification (custom-generated codes, delivered via SMTP)

### 4.2 Document Upload & Intelligence
- Upload via photo or file
- OCR text extraction (Tesseract)
- Automatic category detection (keyword-based classification)
- Automatic expiry date detection (regex-based, trigger-word driven)
- User confirmation step before finalizing detected fields

### 4.3 Quick Info Card (Instant Capture)
- Instagram-style instant photo/note capture
- No forced categorization at capture time — stays frictionless
- "Promote to Document" option to formally file it later through the full intelligence pipeline

### 4.4 Vault (Document Library)
- Full document list, color-coded by validity status (valid / expiring soon / expired)
- View, edit, and delete documents
- Strict per-user data isolation — no document is ever visible across accounts

### 4.5 Prompt-Based Home Page (Agentic RAG Core)
- ChatGPT-style conversational interface as the app's primary hub
- Natural language search: ask questions about your documents, get grounded, non-hallucinated answers
- Prompt-based document update: type instructions like "update my insurance expiry to March 2027," review a confirmation, then apply

### 4.6 Reminders
- Documents expiring within 30 days surfaced automatically, sorted soonest first
- Clear "Expiring Soon" / "Expired" status labeling

### 4.7 Design System — "Calm Vault"
- A deliberately warm, ledger-inspired visual identity — the opposite of a bureaucratic government portal or a generic SaaS dashboard
- Consistent, distinctive typography, color, and layout system across every screen

---

## 5. Planned Future Phases (Documented, Not Yet Built)

| Phase | What It Adds |
|---|---|
| **Family Vault** | Multi-member accounts, per-member/per-document permissions, family-aware natural language queries |
| **Sharing** | Scoped, expiring share links; Minimum Necessary Sharing (share only specific fields) |
| **Self-Learning Personalization** | Online learning classifier for auto-tagging; contextual bandits for reminder timing — learns from live usage, no pretrained dataset required |
| **Offline Mode** | On-device LLM (Qwen2.5-1.5B / Gemma-2-2B, quantized), tiered degradation by device capability, full offline search and reasoning |
| **Google Calendar Sync** | Auto-create/update calendar reminders tied to document expiry |
| **Version History & Vault Restore** | Document version tracking, whole-vault point-in-time restore |
| **Document Knowledge Graph** | Relationship modeling between documents (e.g., Person → Vehicle → Insurance), editable by the user |
| **Enhanced OCR** | Optional upgrade to a cloud OCR service if Tesseract's accuracy proves insufficient at scale |

---

## 6. System Architecture

```
┌────────────────────────────┐
│     Next.js Frontend        │
│  (Login, Home, Vault, etc.) │
└─────────────┬───────────────┘
              │ JWT on every request
              ▼
┌─────────────────────────────┐
│      FastAPI Backend         │
│  (routes: auth, upload,      │
│   vault, search, reminders,  │
│   cards)                     │
└──────┬───────────┬───────────┘
       │           │
       ▼           ▼
┌────────────┐ ┌─────────────────┐
│ MongoDB     │ │ SQLite           │
│ Atlas       │ │ (local doc data) │
│ (users,     │ └─────────────────┘
│  cards)     │
└────────────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│  ChromaDB    │─────▶│  Groq LLM API │
│ (embeddings) │      │ (RAG answers) │
└─────────────┘      └──────────────┘
       ▲
       │
┌─────────────┐
│ AWS S3       │
│ (cloud file  │
│  storage)    │
└─────────────┘
```

### Architectural Principles
1. **Privacy by scoping** — every database and vector query is filtered by the authenticated user's ID; no exceptions.
2. **Retrieval-Augmented Generation discipline** — the LLM only ever answers using retrieved document context. If nothing relevant is found, it explicitly says so rather than fabricating an answer.
3. **Minimal, purposeful LLM usage** — deterministic logic (category keyword-matching, expiry-date comparison, intent pre-classification) is handled in code, not by spending an LLM call.
4. **Graceful failure** — no raw errors or stack traces are ever exposed to the user; every failure path returns a clean, actionable message.

### Agentic RAG Flow (Home Page / Search)
```
User Query
   │
   ▼
Intent Detection (keyword/regex — search vs. update) — 0 LLM calls
   │
   ▼
Query Embedding (sentence-transformers) — 0 LLM calls
   │
   ▼
Retrieve Top-3 Documents (ChromaDB, filtered to current user) — 0 LLM calls
   │
   ▼
Groq LLM generates grounded answer, OR structured update proposal
   │
   ▼
[If update] → User confirmation required before any write
   │
   ▼
Response returned to Home Page
```

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js (TypeScript, App Router, Tailwind CSS) |
| Backend Framework | FastAPI + Pydantic |
| Authentication | bcrypt (password hashing) + JWT (python-jose) |
| OAuth | Google OAuth 2.0 |
| Email Delivery | SMTP (custom-generated OTP codes) |
| User/Card Database | MongoDB Atlas (via Motor, async driver) |
| Local Document Database | SQLite |
| Cloud File Storage | AWS S3 |
| Vector Database | ChromaDB (persistent local client) |
| Embedding Model | sentence-transformers — `all-MiniLM-L6-v2` |
| LLM (Reasoning/Search) | Groq API — `llama-3.1-8b-instant` |
| OCR Engine | Tesseract (via `pytesseract`) |

---

## 8. AI Models Used

### 8.1 Embedding Model — `all-MiniLM-L6-v2`
- Source: Hugging Face (`sentence-transformers/all-MiniLM-L6-v2`)
- Purpose: converts document text and user queries into 384-dimension vectors for semantic similarity search
- Why chosen: lightweight (~80MB), fast on CPU, no GPU required, strong performance for short-to-medium text

### 8.2 LLM — `llama-3.1-8b-instant` (via Groq)
- Purpose: generates grounded answers to user questions and structured update proposals
- Why chosen: extremely fast inference (Groq's LPU hardware), generous free tier, sufficient reasoning capability for RAG-style Q&A without needing a larger model

### 8.3 (Planned) On-Device Models for Offline Mode
- `Qwen2.5-1.5B-Instruct` (GGUF, Q4 quantized) — for low-end devices (6GB RAM, no GPU)
- `Gemma-2-2B-Instruct` (GGUF, Q4 quantized) — for mid/high-end devices
- Deployment via `llama.cpp` or `MLC-LLM`

### 8.4 (Planned) Classical ML for Self-Learning
- `scikit-learn` online learning classifier (`SGDClassifier` with `partial_fit`) for auto-tagging that improves from live user corrections — no pretrained dataset required
- Contextual bandit algorithm for learning which reminders/suggestions users act on

---

## 9. External APIs & Services

| Service | Purpose | Cost |
|---|---|---|
| Groq API | LLM reasoning for search and updates | Free tier |
| Google OAuth 2.0 | Google Sign-In | Free |
| SMTP (e.g., Gmail SMTP) | Email OTP delivery | Free |
| AWS S3 | Cloud file storage | Free tier, then usage-based |
| MongoDB Atlas | Hosted database | Free tier (M0 cluster) |
| (Planned) Google Calendar API | Auto-sync expiry reminders | Free within quota |

**Note:** Azure AI Document Intelligence was evaluated but replaced with Tesseract for the current build to keep the stack fully free and self-hosted; it remains a documented future upgrade path if OCR accuracy needs improvement at scale.

---

## 10. Databases

### MongoDB Atlas
**`users` collection**
```
{ _id, email (unique), password_hash, otp_code, otp_expiry, google_id (optional), created_at }
```

**`cards` collection** (Quick Info Cards)
```
{ _id, user_id, filepath, caption, created_at }
```

### SQLite
**`documents` table**
```
id, user_id, filename, filepath, category, ocr_text, expiry_date, created_at
```

### ChromaDB
Stores document embeddings with metadata `{ user_id, doc_id }` for filtered semantic search — ensuring retrieval never crosses user boundaries.

---

## 11. Design System — "Calm Vault"

Doc Vault's interface is designed to feel like a trusted personal ledger rather than a bureaucratic portal or a generic SaaS dashboard — a deliberate reaction to how stressful and clinical existing document tools feel.

**Colors:**
- Background — Vault Linen `#F6F3EC`
- Primary text — Ink Slate `#2B2E33`
- Accent — Deep Archive `#1F3B36`
- Status: Valid `#4C7A5E` · Expiring Soon `#C98A3B` · Expired `#B5502F`
- Dividers — Paper Line `#E4DFD3`

**Typography:**
- Headings/Display — Fraunces (warm editorial serif)
- Body/UI — Inter (clean sans-serif)

**Layout Principles:**
- Left-aligned, asymmetric layouts with generous whitespace
- Documents displayed as horizontal ledger-rows (not shadowed card grids)
- Status always shown as a colored dot **plus** a text label — never color alone (accessibility)
- Exactly one orchestrated motion moment per screen, tied to a real user action — no decorative hover effects scattered throughout

---

## 12. Security & Privacy Principles

- Every API route enforces per-user data ownership — verified before every read, update, or delete
- Passwords are never stored in plain text (bcrypt hashing only)
- JWT-based sessions with expiry
- No AI-generated action (e.g., document field updates) is ever applied without explicit user confirmation
- The LLM is architecturally prevented from directly writing to the database — it can only propose a structured change, which the backend validates and applies

---

## 13. Project Status

**Current build phase:** Personal Vault (V1) — Authentication, Upload & OCR, Quick Info Card, Vault, Prompt-Based Search & Update, Reminders, and the full Calm Vault design system.

**Next phase (planned):** Family Vault, Sharing, and the beginning of the self-learning personalization layer.

---

## 14. Summary Table (Quick Reference for Presentation)

| Category | Details |
|---|---|
| **Frontend** | Next.js, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, Pydantic |
| **Databases** | MongoDB Atlas, SQLite, ChromaDB |
| **Cloud Storage** | AWS S3 |
| **Auth** | bcrypt, JWT, Google OAuth 2.0, SMTP email OTP |
| **AI — Embeddings** | sentence-transformers (all-MiniLM-L6-v2) |
| **AI — LLM** | Groq (llama-3.1-8b-instant) |
| **AI — OCR** | Tesseract |
| **Architecture Pattern** | Retrieval-Augmented Generation (RAG), intent-routed |
| **Design Identity** | "Calm Vault" — ledger-inspired, warm, distinctive |