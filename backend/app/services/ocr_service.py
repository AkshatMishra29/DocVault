"""
OCR Service — Document Text Extraction
Primary: Gemini 2.5 Flash (vision) for images and scanned PDFs
Fallback: pytesseract / RapidOCR
PDF text layer: pypdf
"""

import re
import os
from typing import Optional
from PIL import Image
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv()

# ── Optional legacy OCR engines ──────────────────────────────────────────────
try:
    import pytesseract
except Exception:
    pytesseract = None

try:
    from rapidocr_onnxruntime import RapidOCR
    _rapid_ocr_engine = None
except Exception:
    RapidOCR = None
    _rapid_ocr_engine = None

# ── Gemini client (new google-genai SDK) ─────────────────────────────────────
_gemini_client = None


def _get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                _gemini_client = genai.Client(api_key=api_key)
                print("[OCR] Gemini 2.5 Flash client initialized ✅")
            except Exception as e:
                print(f"[OCR] Could not initialize Gemini client: {e}")
    return _gemini_client


def _get_rapid_ocr_engine():
    global _rapid_ocr_engine
    if _rapid_ocr_engine is None and RapidOCR is not None:
        _rapid_ocr_engine = RapidOCR()
    return _rapid_ocr_engine


# ── Category keywords ─────────────────────────────────────────────────────────
CATEGORY_KEYWORDS = {
    "Insurance": [
        "insurance", "policy", "premium", "coverage", "insured", "claim", "underwriter",
        "beneficiary", "deductible", "mediclaim", "tpa", "sum assured"
    ],
    "Vehicle": [
        "registration certificate", "rc", "chassis", "engine no", "dl", "driving licence",
        "driving license", "puc", "pollution", "vehicle", "transport", "motor", "rto",
        "car", "bike", "scooter", "odometer"
    ],
    "Identity": [
        "aadhaar", "aadhar", "pan card", "income tax department", "passport", "voter",
        "election commission", "unique identification", "gov of india", "nationality", "uidai"
    ],
    "Education": [
        "degree", "diploma", "marksheet", "certificate", "university", "college", "school",
        "examination", "grade", "gpa", "bachelor", "master", "matriculation", "convocation"
    ],
    "Property": [
        "deed", "sale deed", "mortgage", "property", "lease", "rent agreement", "registry",
        "flat", "plot", "land", "municipal", "tax receipt", "allotment", "possession"
    ],
    "Medical": [
        "hospital", "prescription", "diagnostic", "doctor", "dr.", "patient", "lab report",
        "blood test", "clinic", "treatment", "discharge summary", "pharmacy", "medical"
    ]
}


# ── Gemini Vision extraction ──────────────────────────────────────────────────
def _extract_text_with_gemini(file_path: str) -> str:
    """Calls Gemini 2.5 Flash to extract full text from an image or PDF page."""
    client = _get_gemini_client()
    if client is None:
        return ""

    try:
        from google.genai import types

        ext = os.path.splitext(file_path)[1].lower()
        mime_map = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".gif": "image/gif",
            ".bmp": "image/bmp", ".tiff": "image/tiff",
            ".webp": "image/webp", ".pdf": "application/pdf",
        }
        mime_type = mime_map.get(ext, "image/jpeg")

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        prompt = (
            "You are an expert document OCR assistant. "
            "Extract ALL text from this document image EXACTLY as it appears. "
            "Preserve the layout and structure. "
            "Include every word, number, date, code, and symbol visible. "
            "Do NOT summarize or paraphrase. Do NOT add any commentary. "
            "Output ONLY the raw extracted text."
        )

        try:
            response = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=[
                    types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                    prompt,
                ],
            )
        except Exception:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                    prompt,
                ],
            )

        extracted = response.text.strip() if response.text else ""
        if extracted:
            print(f"[OCR] Gemini Vision extracted {len(extracted)} chars from {os.path.basename(file_path)}")
        return extracted

    except Exception as e:
        print(f"[OCR] Gemini Vision failed for {file_path}: {e}")
        return ""


def _extract_text_from_scanned_pdf(file_path: str) -> str:
    """For scanned PDFs, converts each page to image then runs Gemini Vision."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        parts = []
        for page_num, page in enumerate(doc):
            mat = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            tmp_path = f"/tmp/dvpage_{page_num}.png"
            pix.save(tmp_path)
            page_text = _extract_text_with_gemini(tmp_path)
            if page_text:
                parts.append(page_text)
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        return "\n".join(parts)
    except ImportError:
        return _extract_text_with_gemini(file_path)
    except Exception as e:
        print(f"[OCR] Scanned PDF processing error for {file_path}: {e}")
        return ""


def extract_text_from_image(file_path: str) -> str:
    """Extracts text from an image. Prefers Gemini 2.5 Flash, falls back to local OCR."""
    gemini_text = _extract_text_with_gemini(file_path)
    if gemini_text:
        return gemini_text

    try:
        image = Image.open(file_path)
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
        if pytesseract is not None:
            try:
                text = pytesseract.image_to_string(image).strip()
                if text:
                    print(f"[OCR] pytesseract fallback used for {os.path.basename(file_path)}")
                    return text
            except Exception as e:
                print(f"[OCR] pytesseract failed: {e}")
    except Exception:
        pass

    rapid_engine = _get_rapid_ocr_engine()
    if rapid_engine is not None:
        try:
            result, _ = rapid_engine(file_path)
            if result:
                lines = [item[1] for item in result if item and len(item) > 1]
                text = "\n".join(lines).strip()
                if text:
                    print(f"[OCR] RapidOCR fallback used for {os.path.basename(file_path)}")
                    return text
        except Exception as e:
            print(f"[OCR] RapidOCR failed: {e}")

    return ""


def extract_text_from_pdf(file_path: str) -> str:
    """Extracts text from a PDF. Tries native text layer first, then Gemini for scanned PDFs."""
    try:
        reader = PdfReader(file_path)
        text_parts = []
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text_parts.append(extracted)
        native_text = "\n".join(text_parts).strip()

        if len(native_text) > 50:
            return native_text

        print(f"[OCR] PDF has no text layer — using Gemini Vision for {os.path.basename(file_path)}")
        return _extract_text_from_scanned_pdf(file_path)

    except Exception as e:
        print(f"[OCR] PDF extraction error {file_path}: {e}")
        return ""


def extract_text(file_path: str) -> str:
    """Entry point — dispatches to PDF or image extraction."""
    lower_path = file_path.lower()
    if lower_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    return extract_text_from_image(file_path)


def detect_category(text: str) -> str:
    """Detects document category based on keyword density."""
    if not text:
        return "Other"

    text_lower = text.lower()
    best_category = "Other"
    max_matches = 0

    for cat, keywords in CATEGORY_KEYWORDS.items():
        matches = sum(1 for kw in keywords if re.search(r"\b" + re.escape(kw) + r"\b", text_lower))
        if matches > max_matches:
            max_matches = matches
            best_category = cat

    return best_category if max_matches > 0 else "Other"


def detect_expiry_date(text: str) -> Optional[str]:
    """Looks for date patterns near expiry-related trigger words."""
    if not text:
        return None

    date_regex = (
        r"(\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|"
        r"\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b|"
        r"\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b)"
    )

    trigger_patterns = [
        r"(?:expir(?:y|es|ed|ation)?|valid\s+(?:thru|through|till|until)|upto|due\s+date)[\s\:\-\.\\_]*" + date_regex,
        date_regex + r"[\s\:\-\.\\_]*(?:expir(?:y|es|ed)?|valid)"
    ]

    for pat in trigger_patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            raw_date = match.group(1) if match.lastindex else match.group(0)
            parsed = _standardize_date(raw_date)
            if parsed:
                return parsed

    return None


def _standardize_date(date_str: str) -> Optional[str]:
    """Normalizes extracted date string to YYYY-MM-DD format."""
    clean = date_str.strip()
    month_map = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
    }

    m = re.match(r"^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$", clean)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    m = re.match(r"^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$", clean)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}-{mo:02d}-{d:02d}"

    m = re.match(r"^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$", clean)
    if m:
        d, mon_str, y = int(m.group(1)), m.group(2).lower()[:3], int(m.group(3))
        if mon_str in month_map and 1 <= d <= 31:
            return f"{y:04d}-{month_map[mon_str]:02d}-{d:02d}"

    return None
