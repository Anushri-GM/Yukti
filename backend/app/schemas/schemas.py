from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CitizenSubmissionCreate(BaseModel):
    text: Optional[str] = None
    voice_url: Optional[str] = None
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ward: Optional[str] = None

class CitizenSubmissionOut(BaseModel):
    id: int
    text: Optional[str]
    voice_url: Optional[str]
    image_url: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    ward: Optional[str]
    category: Optional[str]
    urgency: int
    summary: Optional[str]
    affected_infrastructure: Optional[str]
    confidence: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DemographicStatsOut(BaseModel):
    id: int
    ward: str
    population: int
    literacy_rate: float
    vulnerability_index: float
    water_access_pct: float
    road_connectivity_pct: float
    health_center_distance_km: float

    class Config:
        from_attributes = True

class DevelopmentProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    cost: float
    affected_population: int
    ward: str
    urgency_score: int
    submission_id: Optional[int] = None

class DevelopmentProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    category: str
    cost: float
    affected_population: int
    ward: str
    urgency_score: int
    priority_score: float
    status: str
    justification: Optional[str]
    submission_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class WeightWeights(BaseModel):
    urgency: float = 0.3
    impact: float = 0.3
    demographics: float = 0.2
    cost_efficiency: float = 0.2

class SimulationRequest(BaseModel):
    budget: float
    weights: WeightWeights
    priority_focus: Optional[str] = None  # e.g., "Health", "Water", "Roads"
    vulnerability_multiplier: float = 1.0

class OptimizedProjectOut(DevelopmentProjectOut):
    is_selected: bool

class SimulationResult(BaseModel):
    total_cost: float
    total_impact_score: float
    projects: List[OptimizedProjectOut]
    explanation: str
