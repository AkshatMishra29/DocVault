"""
Groq LLM service — generates answers grounded in retrieved document context
and extracts document update proposals from natural language requests.
"""
import os
import json
import re
from typing import List, Dict, Optional

from dotenv import load_dotenv
from groq import Groq

load_dotenv()


def _get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in environment variables")
    return Groq(api_key=api_key)


def generate_answer(query: str, context_documents: List[Dict]) -> str:
    """
    Calls Groq with user query and retrieved document context.
    Strictly answers using provided context.
    """
    client = _get_client()

    if not context_documents:
        system_prompt = (
            "You are a helpful assistant for Doc Vault, a personal document management app. "
            "The user has asked a question, but no relevant documents were found in their vault. "
            "Tell them clearly that you couldn't find a relevant document in their vault and "
            "suggest they upload the relevant document first."
        )
        user_message = f"User question: {query}"
    else:
        # Cap each document text to 1500 chars to avoid 413 Payload Too Large
        context_blocks = "\n\n".join(
            f"[Document {i + 1} - ID: {doc.get('doc_id')}]\n{doc['text'][:1500]}"
            for i, doc in enumerate(context_documents)
        )
        system_prompt = (
            "You are a helpful assistant for Doc Vault, a personal document management app. "
            "Answer the user's question using ONLY the document context provided below. "
            "Do NOT make up information that is not present in the context. "
            "If the context doesn't contain enough information to answer, say so clearly."
        )
        user_message = (
            f"Document Context:\n{context_blocks}\n\n"
            f"User Question: {query}"
        )

    # 1. Try Groq fast models
    groq_models = ["groq/compound-mini", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]
    for model_name in groq_models:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=512,
                temperature=0.1,
            )
            msg = response.choices[0].message
            content = (msg.content or "").strip()
            # If content is empty (e.g. reasoning model that placed output in reasoning field)
            if not content and getattr(msg, "reasoning", None):
                content = str(msg.reasoning).strip()
            if content:
                return content
        except Exception as e:
            print(f"[LLM] Groq {model_name} failed: {e}")
            continue

    # 2. Fallback to Gemini 3.5 Flash if configured
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            from google import genai
            g_client = genai.Client(api_key=gemini_key)
            full_prompt = f"{system_prompt}\n\n{user_message}"
            g_res = g_client.models.generate_content(
                model="gemini-3.5-flash",
                contents=full_prompt,
            )
            if g_res.text:
                return g_res.text.strip()
        except Exception as ge:
            print(f"[LLM] Gemini fallback failed: {ge}")

    return "I couldn't process your request at this moment. Please try again."


def generate_update_proposal(query: str, context_documents: List[Dict]) -> Optional[Dict]:
    """
    Extracts structured update intention from user prompt:
    e.g., "Change my car insurance expiry to 2026-08-30" or "Set category of passport to Identity".
    Returns:
    {
       "doc_id": "...",
       "field": "category" | "expiry_date",
       "new_value": "...",
       "explanation": "..."
    } or None
    """
    if not context_documents:
        return None

    client = _get_client()
    context_blocks = "\n\n".join(
        f"[Doc ID: {doc.get('doc_id')}]\n{doc['text']}"
        for doc in context_documents
    )

    system_prompt = (
        "You are an AI assistant in Doc Vault that analyzes user update commands on their documents.\n"
        "The user wants to update/edit a document's metadata (either 'expiry_date' in YYYY-MM-DD format or 'category').\n"
        "Allowed categories: Insurance, Vehicle, Identity, Education, Property, Medical, Other.\n\n"
        "Based on the user's command and the candidate documents, identify:\n"
        "1. Which doc_id the user wants to update\n"
        "2. Which field to update ('expiry_date' or 'category')\n"
        "3. What the new value is (for date, ALWAYS format as YYYY-MM-DD)\n"
        "4. A brief user-friendly explanation of what will be changed\n\n"
        "Output ONLY a raw JSON object with no markdown fences, no backticks, no comments:\n"
        "{\n"
        '  "doc_id": "<document id from context>",\n'
        '  "field": "category" or "expiry_date",\n'
        '  "new_value": "<new value>",\n'
        '  "explanation": "<short summary>"\n'
        "}\n"
        "If you cannot identify a clear document or field to change, respond with: {\"error\": \"unclear\"}"
    )

    user_message = f"Candidate Documents:\n{context_blocks}\n\nUser Request: {query}"
    content = ""
    for model_name in ["groq/compound-mini", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"]:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=256,
                temperature=0.0,
            )
            msg = response.choices[0].message
            content = (msg.content or "").strip()
            if not content and getattr(msg, "reasoning", None):
                content = str(msg.reasoning).strip()
            if content:
                break
        except Exception:
            continue

    if not content:
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                from google import genai
                g_client = genai.Client(api_key=gemini_key)
                g_res = g_client.models.generate_content(
                    model="gemini-3.5-flash",
                    contents=f"{system_prompt}\n\n{user_message}",
                )
                content = g_res.text.strip() if g_res.text else ""
            except Exception:
                pass

    # Strip code fences if present
    content = re.sub(r"^```(json)?", "", content, flags=re.MULTILINE).strip()
    content = re.sub(r"```$", "", content, flags=re.MULTILINE).strip()

    try:
        data = json.loads(content)
        if "doc_id" in data and "field" in data and "new_value" in data:
            if data.get("field") in ["category", "expiry_date"]:
                return data
    except Exception:
        pass

    return None
