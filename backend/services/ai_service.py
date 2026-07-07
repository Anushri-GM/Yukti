import json
import logging
import time
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
import google.generativeai as genai
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

# Simple in-memory cache: key -> (timestamp, response_dict)
AI_CACHE: Dict[str, Dict[str, Any]] = {}

# Set up Gemini
if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "MOCK_KEY":
    genai.configure(api_key=settings.GEMINI_API_KEY)
    gemini_available = True
else:
    logger.warning("GEMINI_API_KEY is not configured or set to MOCK_KEY. Falling back to rule-based engine.")
    gemini_available = False

def get_cache_key(prefix: str, text: str, extra: str = "") -> str:
    """Generates a stable cache key based on prompt parameters."""
    return f"{prefix}:{hash(text)}:{extra}"

def check_cache(key: str) -> Optional[Any]:
    """Retrieves cached response if present."""
    if key in AI_CACHE:
        logger.info(f"AI Cache Hit: {key}")
        return AI_CACHE[key]
    return None

def write_cache(key: str, val: Any) -> None:
    """Caches response value."""
    AI_CACHE[key] = val

# ========================================================
# RULE-BASED FALLBACK IMPLEMENTATIONS
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
    # Severity rules
    score = urgency * 15  # Up to 75
    t = text.lower()
    
    # Population impact
    if any(k in t for k in ["many", "all", "community", "village", "town", "everyone"]):
        score += 15
    else:
        score += 5
        
    # Infrastructure type multiplier
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
# EXPOSED SERVICE METHODS WITH GEMINI & FALLBACK
# ========================================================

def categorize_request(text: str) -> Dict[str, str]:
    """Determines category and subcategory of a request."""
    cache_key = get_cache_key("categorize", text)
    cached = check_cache(cache_key)
    if cached:
        return cached

    if not gemini_available:
        cat = _fallback_category(text)
        sub = _fallback_subcategory(text, cat)
        res = {"category": cat, "subcategory": sub}
        write_cache(cache_key, res)
        return res

    try:
        t0 = time.time()
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = (
            f"Classify the following citizen grievance text into a category and subcategory.\n"
            f"Allowed categories: Roads, Water, Sanitation, Healthcare, Education, Safety, Other.\n"
            f"Output as structured JSON with keys: category, subcategory.\n\n"
            f"Text: {text}"
        )
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        logger.info(f"Gemini latency (categorize): {time.time() - t0:.2f}s")
        data = json.loads(response.text)
        write_cache(cache_key, data)
        return data
    except Exception as e:
        logger.error(f"Gemini error in categorize_request: {e}. Switching to rule fallback.")
        cat = _fallback_category(text)
        sub = _fallback_subcategory(text, cat)
        return {"category": cat, "subcategory": sub}

def summarize_request(text: str) -> str:
    """Summarizes a citizen request in under 50 words."""
    cache_key = get_cache_key("summarize", text)
    cached = check_cache(cache_key)
    if cached:
        return cached["summary"]

    if not gemini_available:
        summary = text[:80] + "..." if len(text) > 80 else text
        write_cache(cache_key, {"summary": summary})
        return summary

    try:
        t0 = time.time()
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = (
            f"Summarize the following infrastructure grievance concisely in one or two clear sentences (under 50 words).\n\n"
            f"Text: {text}"
        )
        response = model.generate_content(prompt)
        logger.info(f"Gemini latency (summarize): {time.time() - t0:.2f}s")
        summary = response.text.strip()
        write_cache(cache_key, {"summary": summary})
        return summary
    except Exception as e:
        logger.error(f"Gemini error in summarize_request: {e}")
        return text[:80] + "..." if len(text) > 80 else text

def estimate_priority(text: str, category: str) -> Dict[str, Any]:
    """Computes urgency (1-5) and priority score (0-100)."""
    cache_key = get_cache_key("priority", text, category)
    cached = check_cache(cache_key)
    if cached:
        return cached

    if not gemini_available:
        urgency = _fallback_urgency(text)
        score = _fallback_priority(text, category, urgency)
        res = {"urgency": urgency, "priority_score": score}
        write_cache(cache_key, res)
        return res

    try:
        t0 = time.time()
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = (
            f"Estimate the urgency (1 to 5) and developmental priority score (0 to 100) for this complaint.\n"
            f"Priority should consider severity, safety, population affected, and infrastructure type.\n"
            f"Output as structured JSON with keys: urgency, priority_score.\n\n"
            f"Category: {category}\n"
            f"Text: {text}"
        )
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        logger.info(f"Gemini latency (priority): {time.time() - t0:.2f}s")
        data = json.loads(response.text)
        write_cache(cache_key, data)
        return data
    except Exception as e:
        logger.error(f"Gemini error in estimate_priority: {e}. Switching to rule fallback.")
        urgency = _fallback_urgency(text)
        score = _fallback_priority(text, category, urgency)
        return {"urgency": urgency, "priority_score": score}

def recommend_department(category: str) -> str:
    """Recommends department based on category."""
    return _fallback_department(category)

def recommend_scheme(text: str, category: str) -> Dict[str, Any]:
    """Suggests government scheme and confidence score."""
    cache_key = get_cache_key("scheme", text, category)
    cached = check_cache(cache_key)
    if cached:
        return cached

    if not gemini_available:
        scheme = _fallback_scheme(category)
        res = {"recommended_scheme": scheme, "confidence": 0.85, "reason": "Default department rule allocation."}
        write_cache(cache_key, res)
        return res

    try:
        t0 = time.time()
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = (
            f"Suggest a standard Indian Government Welfare or Development scheme (e.g. Jal Jeevan Mission, PMGSY, Swachh Bharat) "
            f"that is best suited to address this citizen complaint. Provide the scheme name, reason, and confidence (0.0 to 1.0).\n"
            f"Output as structured JSON with keys: recommended_scheme, reason, confidence.\n\n"
            f"Category: {category}\n"
            f"Text: {text}"
        )
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        logger.info(f"Gemini latency (scheme): {time.time() - t0:.2f}s")
        data = json.loads(response.text)
        write_cache(cache_key, data)
        return data
    except Exception as e:
        logger.error(f"Gemini error in recommend_scheme: {e}. Switching to rule fallback.")
        return {
            "recommended_scheme": _fallback_scheme(category),
            "confidence": 0.70,
            "reason": "Rule-based category fallback alignment."
        }

def generate_reasoning(category: str, department: str, priority_level: str, scheme: str) -> str:
    """Generates explainability text suitable for officers and MPs."""
    return _fallback_explain(category, department, priority_level, scheme)

# ========================================================
# SEMANTIC DUPLICATE DETECTION
# ========================================================

def detect_duplicates(db: Session, text: str, category: str) -> Dict[str, Any]:
    """Compares current text against previous complaints to detect semantic duplicates."""
    # Fetch latest 20 suggestions in the same category
    existing = db.query(Suggestion).filter(
        Suggestion.user_selected_category == category
    ).order_by(Suggestion.created_at.desc()).limit(20).all()

    if not existing:
        return {
            "whether_duplicate": False,
            "similarity_score": 0.0,
            "original_request_ids": []
        }

    # If Gemini is not available, do a simple keyword matching fallback
    if not gemini_available:
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

    try:
        # Ask Gemini to run semantic match
        model = genai.GenerativeModel('gemini-2.5-flash')
        records_str = ""
        for item in existing:
            records_str += f"- ID: {item.id} | Title: {item.title} | Description: {item.description[:120]}\n"

        prompt = (
            f"You are YUKTI's Duplicate Detection Engine.\n"
            f"Analyze if the new citizen complaint description matches any of the existing reports.\n"
            f"Determine if they report the exact same issue/hazard at the same proximity location.\n\n"
            f"New complaint:\n\"{text}\"\n\n"
            f"Existing complaints:\n{records_str}\n"
            f"Output as structured JSON with keys: whether_duplicate (boolean), similarity_score (float 0.0 to 1.0), "
            f"original_request_ids (array of matching UUID strings), recommend_merge (boolean)."
        )
        t0 = time.time()
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        logger.info(f"Gemini latency (duplicates): {time.time() - t0:.2f}s")
        data = json.loads(response.text)
        
        # Convert UUID strings back to UUID objects
        ids = []
        for id_str in data.get("original_request_ids", []):
            try:
                ids.append(UUID(id_str))
            except Exception:
                pass
        data["original_request_ids"] = ids
        return data
    except Exception as e:
        logger.error(f"Gemini error in duplicate detection: {e}")
        return {
            "whether_duplicate": False,
            "similarity_score": 0.0,
            "original_request_ids": []
        }

# ========================================================
# COMBINED ANALYZE ENDPOINT PIPELINE
# ========================================================

def analyze_full_request(db: Session, text: str) -> AIAnalysisResponse:
    """Runs the complete AI analysis pipeline for a request."""
    # 1. Categorize
    cat_data = categorize_request(text)
    category = cat_data.get("category", "Other")
    subcategory = cat_data.get("subcategory", "General")

    # 2. Priority
    pri_data = estimate_priority(text, category)
    urgency = pri_data.get("urgency", 3)
    priority_score = pri_data.get("priority_score", 50.0)

    # 3. Department
    department = recommend_department(category)

    # 4. Duplicate Check
    dup_data = detect_duplicates(db, text, category)

    # 5. Incomplete detection rule fallback
    whether_incomplete = len(text.strip().split()) < 6

    # 6. Confidence estimate
    confidence_score = 0.95 if gemini_available else 0.75

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
