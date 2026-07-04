import json
from typing import Optional, Dict, Any
import google.generativeai as genai
from pydantic import BaseModel, Field
from app.core.config import settings

class SubmissionAnalysis(BaseModel):
    category: str = Field(description="One of: Roads, Water, Sanitation, Healthcare, Education, Safety, or Other")
    urgency: int = Field(description="Urgency score from 1 (low urgency) to 5 (extreme emergency/hazard)")
    summary: str = Field(description="A concise 1-2 sentence summary of the issue")
    affected_infrastructure: str = Field(description="The specific road, school, hospital, pipeline, etc., affected")
    confidence: float = Field(description="Confidence score between 0.0 and 1.0")

# Configure GenAI client
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    # Use a dummy environment key if not set
    genai.configure(api_key="MOCK_KEY")

def analyze_citizen_submission(text: str, image_bytes: Optional[bytes] = None) -> Dict[str, Any]:
    """
    Invokes Gemini to analyze a citizen submission, extracting category, urgency,
    summary, affected infrastructure, and confidence score in a structured schema.
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "MOCK_KEY":
        # Return fallback deterministic mock structure if API key is not configured
        return {
            "category": "Water" if "water" in text.lower() or "pipe" in text.lower() else "Roads" if "road" in text.lower() or "pothole" in text.lower() else "Sanitation",
            "urgency": 4 if "emergency" in text.lower() or "broken" in text.lower() or "flood" in text.lower() else 3,
            "summary": f"Mock analysis: {text[:60]}...",
            "affected_infrastructure": "Main Street Pipeline" if "water" in text.lower() else "National Highway Sector 3",
            "confidence": 0.95
        }

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
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
            
        response = model.generate_content(
            contents,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=SubmissionAnalysis
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error: {e}")
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
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "MOCK_KEY":
        # Mock explanation generator
        selected_titles = ", ".join([p["title"] for p in selected[:3]])
        return (
            f"Scenario Analysis: With a budget of {budget:,.0f} INR and focus on '{focus or 'General Impact'}', "
            f"we optimized and selected {len(selected)} projects including: {selected_titles}. "
            f"We excluded {len(rejected)} projects due to budget constraints to maximize overall reach."
        )

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
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
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Optimization complete. Selected {len(selected)} projects and deferred {len(rejected)} due to budget constraints."
