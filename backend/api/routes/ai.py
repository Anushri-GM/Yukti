from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from database.session import get_db
from auth.deps import get_current_user, RoleChecker
from models.user import User
from models.suggestion import Suggestion
from services.suggestion import get_suggestion_by_id
from services import ai_service
from schemas.ai import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AISummaryResponse,
    AIRecommendResponse,
    AIPriorityResponse,
    AIExplainResponse
)

router = APIRouter(prefix="/api/ai", tags=["AI Decision Engine"])

# Dependency to check access to a suggestion based on role
def verify_suggestion_access(suggestion_id: UUID, current_user: User, db: Session) -> Suggestion:
    suggestion = db.query(Suggestion).filter(Suggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found"
        )
    if current_user.role == "Citizen" and suggestion.citizen_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this suggestion"
        )
    return suggestion

@router.post("/analyze", response_model=AIAnalysisResponse)
def analyze_request(
    req: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Runs the complete citizen request analysis. 
    Accepts a suggestion_id or a raw text draft.
    """
    text = ""
    if req.suggestion_id:
        suggestion = verify_suggestion_access(req.suggestion_id, current_user, db)
        text = suggestion.description
    elif req.text:
        text = req.text
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either suggestion_id or text must be provided."
        )
        
    return ai_service.analyze_full_request(db, text)

@router.post("/summarize", response_model=AISummaryResponse)
def summarize_request(
    req: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Summarizes a complaint in one or two sentences.
    """
    text = ""
    if req.suggestion_id:
        suggestion = verify_suggestion_access(req.suggestion_id, current_user, db)
        text = suggestion.description
    elif req.text:
        text = req.text
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either suggestion_id or text must be provided."
        )
        
    summary = ai_service.summarize_request(text)
    return AISummaryResponse(summary=summary)

@router.post("/recommend", response_model=AIRecommendResponse)
def recommend_scheme(
    req: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Suggests suitable welfare/development schemes and confidence scores.
    """
    text = ""
    if req.suggestion_id:
        suggestion = verify_suggestion_access(req.suggestion_id, current_user, db)
        text = suggestion.description
    elif req.text:
        text = req.text
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either suggestion_id or text must be provided."
        )
        
    # Get category first to pass it to the scheme recommender
    cat_data = ai_service.categorize_request(text)
    category = cat_data.get("category", "Other")
    
    rec = ai_service.recommend_scheme(text, category)
    return AIRecommendResponse(
        recommended_scheme=rec.get("recommended_scheme", "MPLADS Fund"),
        existing_project=rec.get("existing_project"),
        department=ai_service.recommend_department(category),
        reason=rec.get("reason", "Standard welfare alignment."),
        confidence=rec.get("confidence", 0.8)
    )

@router.post("/priority", response_model=AIPriorityResponse)
def priority_request(
    req: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Runs the hybrid rules + AI priority engine.
    """
    text = ""
    if req.suggestion_id:
        suggestion = verify_suggestion_access(req.suggestion_id, current_user, db)
        text = suggestion.description
    elif req.text:
        text = req.text
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either suggestion_id or text must be provided."
        )
        
    cat_data = ai_service.categorize_request(text)
    category = cat_data.get("category", "Other")
    
    pri_data = ai_service.estimate_priority(text, category)
    score = pri_data.get("priority_score", 50.0)
    
    # Map score to level
    if score >= 80.0:
        level = "Very High"
    elif score >= 60.0:
        level = "High"
    elif score >= 40.0:
        level = "Medium"
    else:
        level = "Low"
        
    reasoning = f"Urgency estimated as {pri_data.get('urgency', 3)}/5. Severe infrastructure indicators identified."
    
    return AIPriorityResponse(
        priority_level=level,
        priority_score=score,
        reasoning=reasoning
    )

@router.post("/explain", response_model=AIExplainResponse)
def explain_request(
    req: AIAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates explainable decision rationale.
    """
    text = ""
    if req.suggestion_id:
        suggestion = verify_suggestion_access(req.suggestion_id, current_user, db)
        text = suggestion.description
    elif req.text:
        text = req.text
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either suggestion_id or text must be provided."
        )
        
    cat_data = ai_service.categorize_request(text)
    category = cat_data.get("category", "Other")
    department = ai_service.recommend_department(category)
    scheme_data = ai_service.recommend_scheme(text, category)
    scheme = scheme_data.get("recommended_scheme", "MPLADS Fund")
    
    pri_data = ai_service.estimate_priority(text, category)
    score = pri_data.get("priority_score", 50.0)
    if score >= 80.0:
        level = "Very High"
    elif score >= 60.0:
        level = "High"
    elif score >= 40.0:
        level = "Medium"
    else:
        level = "Low"
        
    explanation = ai_service.generate_reasoning(category, department, level, scheme)
    
    return AIExplainResponse(
        why_priority=f"Prioritized as {level} based on urgency level {pri_data.get('urgency', 3)}/5.",
        why_department=f"Assigned to {department} to align with category jurisdiction.",
        why_category=f"Categorized as {category} based on keywords inside user complaint.",
        why_scheme=f"Matched with {scheme} based on developmental category scope.",
        explanation=explanation
    )
