from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID

class AIAnalysisRequest(BaseModel):
    suggestion_id: Optional[UUID] = None
    text: Optional[str] = None

class AIAnalysisResponse(BaseModel):
    category: str = Field(..., description="E.g., Roads, Water, Sanitation, Healthcare, Education, Safety, Other")
    subcategory: str = Field(..., description="Specific sub-classification of the issue")
    department: str = Field(..., description="Recommended government department")
    urgency: int = Field(..., description="Urgency rating on a scale of 1 to 5")
    priority_score: float = Field(..., description="Priority score on a scale of 0 to 100")
    estimated_impact: str = Field(..., description="Description of the population or infrastructure impact")
    whether_duplicate: bool = Field(..., description="True if a semantically similar request exists")
    whether_incomplete: bool = Field(..., description="True if request lacks sufficient details")
    confidence_score: float = Field(..., description="AI confidence score between 0.0 and 1.0")
    original_request_ids: List[UUID] = Field(default=[], description="List of original request UUIDs if duplicate")
    similarity_score: Optional[float] = Field(None, description="Similarity score with the closest match")
    recommend_merge: Optional[bool] = Field(None, description="True if we recommend merging with an existing request")

class AISummaryResponse(BaseModel):
    summary: str = Field(..., description="A concise executive summary under 120 words")

class AIRecommendResponse(BaseModel):
    recommended_scheme: str = Field(..., description="Recommended government welfare or development scheme")
    existing_project: Optional[str] = Field(None, description="Recommended existing constituency project link, if any")
    department: str = Field(..., description="Target department responsible for the scheme")
    reason: str = Field(..., description="Reason for recommending this specific scheme/project")
    confidence: float = Field(..., description="Confidence score from 0.0 to 1.0")

class AIPriorityResponse(BaseModel):
    priority_level: str = Field(..., description="Very High, High, Medium, Low")
    priority_score: float = Field(..., description="Priority score between 0.0 and 100.0")
    reasoning: str = Field(..., description="Brief rule-based + AI priority reasoning")

class AIExplainResponse(BaseModel):
    why_priority: str = Field(..., description="Reasoning for the priority level")
    why_department: str = Field(..., description="Reasoning for the assigned department")
    why_category: str = Field(..., description="Reasoning for the category")
    why_scheme: str = Field(..., description="Reasoning for the suggested scheme")
    explanation: str = Field(..., description="Consise combined explainability output under 120 words")
