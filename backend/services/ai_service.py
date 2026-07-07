import json
import logging
import time
import traceback
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.config import settings
from models.suggestion import Suggestion
from schemas.ai import (
    AIAnalysisResponse,
    AISummaryResponse,
    AIRecommendResponse,
    AIPriorityResponse,
    AIExplainResponse
)

logger = logging.getLogger("yukti.ai_service")

# Simple in-memory cache: key -> response_dict
AI_CACHE: Dict[str, Dict[str, Any]] = {}

client = None

def get_cache_key(prefix: str, text: str, extra: str = "") -> str:
    return f"{prefix}:{hash(text)}:{extra}"

def check_cache(key: str) -> Optional[Any]:
    if key in AI_CACHE:
        logger.info(f"AI Cache Hit: {key}")
        return AI_CACHE[key]
    return None

def write_cache(key: str, val: Any) -> None:
    AI_CACHE[key] = val

# ========================================================
# LAZY CLIENT RESOLUTION & EXCEPTION LOGGING
# ========================================================

def get_gemini_client():
    """Lazily imports and instantiates the Gemini client to support dynamic runtime installation."""
    global client
    if client is not None:
        return client

    try:
        from google import genai
        # If imported, initialize client explicitly using AI Studio key
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "MOCK_KEY":
            try:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Google GenAI client initialized dynamically with API key.")
                return client
            except Exception as e:
                logger.error(f"Failed to initialize Google GenAI client: {e}")
                return None
    except ImportError:
        pass
    return None

def log_gemini_error(action: str, e: Exception):
    """Formats and logs detailed Gemini API exception details."""
    err_type = type(e).__name__
    err_msg = str(e)
    
    # Try to extract HTTP status and error details from the Google GenAI SDK exception
    status_code = getattr(e, 'code', None) or getattr(e, 'status_code', None)
    response_body = getattr(e, 'message', None)
    
    log_msg = (
        f"Gemini request failed in {action} | "
        f"Exception Type: {err_type} | "
        f"Message: {err_msg}"
    )
    if status_code is not None:
        log_msg += f" | HTTP Status: {status_code}"
    if response_body is not None:
        log_msg += f" | Response Body: {response_body}"
        
    logger.error(log_msg)
    
    # Check if debug mode is active (using getattr to prevent configuration mismatches)
    is_debug = getattr(settings, 'DEBUG', True)
    if is_debug:
        logger.debug(f"Gemini stack trace for {action}:\n{traceback.format_exc()}")

# ========================================================
# RULE-BASED FALLBACKS
# ========================================================

def _fallback_category(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ["road", "pothole", "bridge", "street", "highway", "path"]):
        return "Roads"
    if any(k in t for k in ["water", "pipe", "leak", "drain", "sewage", "drinking"]):
        return "Water"
    if any(k in t for k in ["trash", "garbage", "clean", "waste", "toilet", "sanitation"]):
        return "Sanitation"
    if any(k in t for k in ["hospital", "clinic", "health", "doctor", "medicine", "nurse"]):
        return "Healthcare"
    if any(k in t for k in ["school", "education", "teacher", "class", "student"]):
        return "Education"
    if any(k in t for k in ["light", "police", "crime", "safety", "robbery", "dark"]):
        return "Safety"
    return "Other"

def _fallback_subcategory(text: str, category: str) -> str:
    t = text.lower()
    if category == "Roads":
        return "Pothole Repair" if "pothole" in t else "Street Resurfacing"
    if category == "Water":
        return "Leakage Repair" if "leak" in t else "New Pipeline Connection"
    if category == "Sanitation":
        return "Garbage Collection" if "garbage" in t else "Public Toilet Cleanliness"
    if category == "Healthcare":
        return "Medical Supplies" if "medicine" in t else "Facility Maintenance"
    if category == "Education":
        return "School Infrastructure" if "building" in t else "Teacher Availability"
    return "General Maintenance"

def _fallback_department(category: str) -> str:
    dept_map = {
        "Roads": "Ministry of Road Transport and Highways",
        "Water": "Ministry of Jal Shakti",
        "Sanitation": "Ministry of Jal Shakti (Drinking Water & Sanitation)",
        "Healthcare": "Ministry of Health and Family Welfare",
        "Education": "Ministry of Education",
        "Safety": "Ministry of Home Affairs",
        "Other": "Department of Public Grievances"
    }
    return dept_map.get(category, "Department of Public Grievances")

def _fallback_scheme(category: str) -> str:
    scheme_map = {
        "Roads": "Pradhan Mantri Gram Sadak Yojana (PMGSY)",
        "Water": "Jal Jeevan Mission",
        "Sanitation": "Swachh Bharat Mission (Grameen)",
        "Healthcare": "Ayushman Bharat Pradhan Mantri Jan Arogya Yojana",
        "Education": "Samagra Shiksha Abhiyan",
        "Safety": "Safe City Project Initiative",
        "Other": "National Constituency Development Fund (MPLADS)"
    }
    return scheme_map.get(category, "National Constituency Development Fund (MPLADS)")

def _fallback_urgency(text: str) -> int:
    t = text.lower()
    if any(k in t for k in ["hazard", "flood", "collapse", "danger", "blocked", "immediate", "emergency"]):
        return 5
    if any(k in t for k in ["broken", "leak", "damage", "accident"]):
        return 4
    if any(k in t for k in ["delay", "needs clean", "slow"]):
        return 3
    return 2

def _fallback_priority(text: str, category: str, urgency: int) -> float:
    score = urgency * 15
    t = text.lower()
    if any(k in t for k in ["many", "all", "community", "village", "town", "everyone"]):
        score += 15
    else:
        score += 5
    infra_multipliers = {
        "Healthcare": 10,
        "Water": 10,
        "Roads": 8,
        "Sanitation": 7,
        "Education": 6,
        "Safety": 8,
        "Other": 4
    }
    score += infra_multipliers.get(category, 5)
    return min(max(score, 10.0), 100.0)

def _fallback_explain(category: str, department: str, priority_level: str, scheme: str) -> str:
    return (
        f"This complaint is classified under '{category}' due to references to local infrastructure issues. "
        f"It is assigned to the '{department}' and prioritized as '{priority_level}' to address safety and public health risks. "
        f"We suggest funding and action through the '{scheme}' to resolve it efficiently."
    )

# ========================================================
# Pydantic Schemas for Gemini Structured JSON Outputs
# ========================================================

class GeminiCategoryOutput(BaseModel):
    category: str
    subcategory: str

class GeminiPriorityOutput(BaseModel):
    urgency: int
    priority_score: float

class GeminiSchemeOutput(BaseModel):
    recommended_scheme: str
    reason: str
    confidence: float

class GeminiDuplicateOutput(BaseModel):
    whether_duplicate: bool
    similarity_score: float
    original_request_ids: List[str]
    recommend_merge: bool

# ========================================================
# SERVICE METHODS
# ========================================================

def categorize_request(text: str) -> Dict[str, str]:
    cache_key = get_cache_key("categorize", text)
    cached = check_cache(cache_key)
    if cached:
        return cached

    ai_client = get_gemini_client()
    if not ai_client:
        logger.info("Gemini client unavailable. Fallback activated for categorize_request.")
        cat = _fallback_category(text)
        sub = _fallback_subcategory(text, cat)
        res = {"category": cat, "subcategory": sub}
        write_cache(cache_key, res)
        return res

    logger.info("Gemini request started: categorize_request")
    try:
        from google.genai import types
        t0 = time.time()
        prompt = (
            f"Classify this citizen grievance into a category and subcategory.\n"
            f"Allowed categories: Roads, Water, Sanitation, Healthcare, Education, Safety, Other.\n"
            f"Text: {text}"
        )
        response = ai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiCategoryOutput
            )
        )
        logger.info(f"Gemini request succeeded: categorize_request in {time.time() - t0:.2f}s")
        data = json.loads(response.text)
        write_cache(cache_key, data)
        return data
    except Exception as e:
        log_gemini_error("categorize_request", e)
        logger.info("Fallback activated for categorize_request due to error.")
        cat = _fallback_category(text)
        sub = _fallback_subcategory(text, cat)
        return {"category": cat, "subcategory": sub}

def summarize_request(text: str) -> str:
    cache_key = get_cache_key("summarize", text)
    cached = check_cache(cache_key)
    if cached:
        return cached["summary"]

    ai_client = get_gemini_client()
    if not ai_client:
        logger.info("Gemini client unavailable. Fallback activated for summarize_request.")
        summary = text[:80] + "..." if len(text) > 80 else text
        write_cache(cache_key, {"summary": summary})
        return summary

    logger.info("Gemini request started: summarize_request")
    try:
        t0 = time.time()
        prompt = f"Summarize the following grievance in one short sentence (under 50 words):\n\nText: {text}"
        response = ai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        logger.info(f"Gemini request succeeded: summarize_request in {time.time() - t0:.2f}s")
        summary = response.text.strip()
        write_cache(cache_key, {"summary": summary})
        return summary
    except Exception as e:
        log_gemini_error("summarize_request", e)
        logger.info("Fallback activated for summarize_request due to error.")
        return text[:80] + "..." if len(text) > 80 else text

def estimate_priority(text: str, category: str) -> Dict[str, Any]:
    cache_key = get_cache_key("priority", text, category)
    cached = check_cache(cache_key)
    if cached:
        return cached

    ai_client = get_gemini_client()
    if not ai_client:
        logger.info("Gemini client unavailable. Fallback activated for estimate_priority.")
        urgency = _fallback_urgency(text)
        score = _fallback_priority(text, category, urgency)
        res = {"urgency": urgency, "priority_score": score}
        write_cache(cache_key, res)
        return res

    logger.info("Gemini request started: estimate_priority")
    try:
        from google.genai import types
        t0 = time.time()
        prompt = (
            f"Estimate the urgency rating (1 to 5) and developmental priority score (0.0 to 100.0) for this issue.\n"
            f"Category: {category}\n"
            f"Text: {text}"
        )
        response = ai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiPriorityOutput
            )
        )
        logger.info(f"Gemini request succeeded: estimate_priority in {time.time() - t0:.2f}s")
        data = json.loads(response.text)
        write_cache(cache_key, data)
        return data
    except Exception as e:
        log_gemini_error("estimate_priority", e)
        logger.info("Fallback activated for estimate_priority due to error.")
        urgency = _fallback_urgency(text)
        score = _fallback_priority(text, category, urgency)
        return {"urgency": urgency, "priority_score": score}

def recommend_department(category: str) -> str:
    return _fallback_department(category)

def recommend_scheme(text: str, category: str) -> Dict[str, Any]:
    cache_key = get_cache_key("scheme", text, category)
    cached = check_cache(cache_key)
    if cached:
        return cached

    ai_client = get_gemini_client()
    if not ai_client:
        logger.info("Gemini client unavailable. Fallback activated for recommend_scheme.")
        scheme = _fallback_scheme(category)
        res = {"recommended_scheme": scheme, "confidence": 0.85, "reason": "Default department rule allocation."}
        write_cache(cache_key, res)
        return res

    logger.info("Gemini request started: recommend_scheme")
    try:
        from google.genai import types
        t0 = time.time()
        prompt = (
            f"Recommend a standard Indian government scheme or development fund (e.g. PMGSY, Jal Jeevan Mission) "
            f"for this issue. Give the scheme name, reason, and confidence (0.0 to 1.0).\n"
            f"Category: {category}\n"
            f"Text: {text}"
        )
        response = ai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiSchemeOutput
            )
        )
        logger.info(f"Gemini request succeeded: recommend_scheme in {time.time() - t0:.2f}s")
        data = json.loads(response.text)
        write_cache(cache_key, data)
        return data
    except Exception as e:
        log_gemini_error("recommend_scheme", e)
        logger.info("Fallback activated for recommend_scheme due to error.")
        return {
            "recommended_scheme": _fallback_scheme(category),
            "confidence": 0.70,
            "reason": "Rule-based category fallback alignment."
        }

def generate_reasoning(category: str, department: str, priority_level: str, scheme: str) -> str:
    return _fallback_explain(category, department, priority_level, scheme)

def detect_duplicates(db: Session, text: str, category: str) -> Dict[str, Any]:
    existing = db.query(Suggestion).filter(
        Suggestion.user_selected_category == category
    ).order_by(Suggestion.created_at.desc()).limit(20).all()

    if not existing:
        return {
            "whether_duplicate": False,
            "similarity_score": 0.0,
            "original_request_ids": []
        }

    ai_client = get_gemini_client()
    if not ai_client:
        logger.info("Gemini client unavailable. Fallback activated for duplicate detection.")
        words = set(text.lower().split())
        for old in existing:
            old_words = set(old.description.lower().split())
            intersection = words.intersection(old_words)
            union = words.union(old_words)
            if union:
                sim = len(intersection) / len(union)
                if sim > 0.45:
                    return {
                        "whether_duplicate": True,
                        "similarity_score": round(sim, 2),
                        "original_request_ids": [old.id],
                        "recommend_merge": True
                    }
        return {
            "whether_duplicate": False,
            "similarity_score": 0.0,
            "original_request_ids": []
        }

    logger.info("Gemini request started: duplicate_detection")
    try:
        from google.genai import types
        records_str = ""
        for item in existing:
            records_str += f"- ID: {item.id} | Description: {item.description[:120]}\n"

        prompt = (
            f"Analyze if the new citizen complaint matches any of these existing reports.\n"
            f"New complaint:\n\"{text}\"\n\n"
            f"Existing complaints:\n{records_str}"
        )
        t0 = time.time()
        response = ai_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiDuplicateOutput
            )
        )
        logger.info(f"Gemini request succeeded: duplicate_detection in {time.time() - t0:.2f}s")
        data = json.loads(response.text)
        
        ids = []
        for id_str in data.get("original_request_ids", []):
            try:
                ids.append(UUID(id_str))
            except Exception:
                pass
        data["original_request_ids"] = ids
        return data
    except Exception as e:
        log_gemini_error("duplicate_detection", e)
        logger.info("Fallback activated for duplicate_detection due to error.")
        return {
            "whether_duplicate": False,
            "similarity_score": 0.0,
            "original_request_ids": []
        }

def analyze_full_request(db: Session, text: str) -> AIAnalysisResponse:
    cat_data = categorize_request(text)
    category = cat_data.get("category", "Other")
    subcategory = cat_data.get("subcategory", "General")

    pri_data = estimate_priority(text, category)
    urgency = pri_data.get("urgency", 3)
    priority_score = pri_data.get("priority_score", 50.0)

    department = recommend_department(category)
    dup_data = detect_duplicates(db, text, category)

    whether_incomplete = len(text.strip().split()) < 6
    confidence_score = 0.95 if get_gemini_client() is not None else 0.75

    return AIAnalysisResponse(
        category=category,
        subcategory=subcategory,
        department=department,
        urgency=urgency,
        priority_score=priority_score,
        estimated_impact="Constituency Infrastructure & Public Welfare",
        whether_duplicate=dup_data.get("whether_duplicate", False),
        whether_incomplete=whether_incomplete,
        confidence_score=confidence_score,
        original_request_ids=dup_data.get("original_request_ids", []),
        similarity_score=dup_data.get("similarity_score"),
        recommend_merge=dup_data.get("recommend_merge")
    )
