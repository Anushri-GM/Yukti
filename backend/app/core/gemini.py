import json
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from app.core.config import settings

logger = logging.getLogger("yukti.gemini")

class SubmissionAnalysis(BaseModel):
    category: str = Field(description="One of: Roads, Water, Sanitation, Healthcare, Education, Safety, or Other")
    urgency: int = Field(description="Urgency score from 1 (low urgency) to 5 (extreme emergency/hazard)")
    summary: str = Field(description="A concise 1-2 sentence summary of the issue")
    affected_infrastructure: str = Field(description="The specific road, school, hospital, pipeline, etc., affected")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")

# Import modern google-genai client
try:
    from google import genai
    from google.genai import types
    gemini_installed = True
except ImportError:
    gemini_installed = False
    logger.warning("google-genai is not yet installed. Will fallback to mock responses until server restarts.")

client = None
gemini_available = False

if gemini_installed and settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "MOCK_KEY":
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        gemini_available = True
        logger.info("Google GenAI client initialized in app/core/gemini.py with API key.")
    except Exception as e:
        logger.error(f"Failed to initialize Google GenAI client in core/gemini.py: {e}")
        gemini_available = False
else:
    logger.warning("GEMINI_API_KEY is not configured or google-genai not installed in app/core/gemini.py.")

def analyze_citizen_submission(text: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
    """
    Invokes Gemini to analyze a citizen submission, extracting category, urgency,
    summary, affected infrastructure, and confidence score in a structured schema.
    """
    if not gemini_available:
        # Return fallback deterministic mock structure if API key or package is not ready
        logger.info("Gemini unavailable in analyze_citizen_submission. Running fallback mock.")
        return {
            "category": "Water" if "water" in text.lower() or "pipe" in text.lower() else "Roads" if "road" in text.lower() or "pothole" in text.lower() else "Sanitation",
            "urgency": 4 if "emergency" in text.lower() or "broken" in text.lower() or "flood" in text.lower() else 3,
            "summary": f"Mock analysis: {text[:60]}...",
            "affected_infrastructure": "Main Street Pipeline" if "water" in text.lower() else "National Highway Sector 3",
            "confidence": 0.95
        }

    logger.info("Gemini request started: analyze_citizen_submission")
    try:
        prompt = (
            "Analyze this citizen complaint about constituency infrastructure. "
            "Extract structured details matching the schema provided."
        )
        
        contents = [prompt]
        if text:
            contents.append(f"Text description: {text}")
        if image_bytes:
            contents.append({
                "mime_type": "image/jpeg",
                "data": image_bytes
            })
            
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SubmissionAnalysis
            )
        )
        logger.info("Gemini request succeeded: analyze_citizen_submission")
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Gemini API Error in analyze_citizen_submission: {e}")
        # Fallback response
        return {
            "category": "Other",
            "urgency": 3,
            "summary": text[:80] if text else "Image-based feedback submission.",
            "affected_infrastructure": "Local Area",
            "confidence": 0.5
        }

def generate_scenario_explanation(
    budget: float,
    focus: Optional[str],
    selected: list,
    rejected: list
) -> str:
    """
    Asks Gemini to explain the optimization results in plain, professional terms for an MP dashboard.
    """
    if not gemini_available:
        logger.info("Gemini unavailable in generate_scenario_explanation. Running fallback mock.")
        selected_titles = ", ".join([p["title"] for p in selected[:3]])
        return (
            f"Scenario Analysis: With a budget of {budget:,.0f} INR and focus on '{focus or 'General Impact'}', "
            f"we optimized and selected {len(selected)} projects including: {selected_titles}. "
            f"We excluded {len(rejected)} projects due to budget constraints to maximize overall reach."
        )

    logger.info("Gemini request started: generate_scenario_explanation")
    try:
        prompt = (
            f"You are YUKTI, an AI Decision Support System for Members of Parliament.\n"
            f"Explain the constituency development scenario and optimization outcome in plain language.\n\n"
            f"Scenario Details:\n"
            f"- Total Available Budget: {budget} INR\n"
            f"- Special Priority Focus Area: {focus or 'None'}\n\n"
            f"Selected Projects (within budget):\n"
        )
        
        for p in selected:
            prompt += f"- {p['title']} ({p['category']}) in {p['ward']}. Cost: {p['cost']}. Score: {p['priority_score']:.2f}. Justification: {p['justification']}\n"
            
        prompt += "\nExcluded Projects (due to budget limit):\n"
        for p in rejected:
            prompt += f"- {p['title']} ({p['category']}). Cost: {p['cost']}. Score: {p['priority_score']:.2f}\n"
            
        prompt += (
            "\nProvide a short, professional, and clear executive summary (3-4 sentences max) explaining "
            "why this combination of projects is the optimal choice under these constraints, and "
            "what the direct impact on the constituency will be."
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        logger.info("Gemini request succeeded: generate_scenario_explanation")
        return response.text
    except Exception as e:
        logger.error(f"Gemini API Error in generate_scenario_explanation: {e}")
        return f"Optimization complete. Selected {len(selected)} projects and deferred {len(rejected)} due to budget constraints."
