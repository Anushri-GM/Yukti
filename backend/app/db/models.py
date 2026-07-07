from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base
from models.suggestion import Suggestion

class DemographicStats(Base):
    __tablename__ = "demographic_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    ward = Column(String, unique=True, index=True)
    population = Column(Integer, default=1000)
    literacy_rate = Column(Float, default=70.0)
    vulnerability_index = Column(Float, default=0.5)  # 0 to 1 scale
    water_access_pct = Column(Float, default=80.0)
    road_connectivity_pct = Column(Float, default=70.0)
    health_center_distance_km = Column(Float, default=5.0)

class DevelopmentProject(Base):
    __tablename__ = "development_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    category = Column(String, index=True)
    cost = Column(Float, default=100000.0)  # INR or budget currency
    affected_population = Column(Integer, default=500)
    ward = Column(String, index=True)
    urgency_score = Column(Integer, default=3)
    
    # Calculated values
    priority_score = Column(Float, default=0.0)
    status = Column(String, default="proposed")  # proposed, approved, active, completed
    justification = Column(Text, nullable=True)
    
    submission_id = Column(UUID(as_uuid=True), ForeignKey("suggestions.id"), nullable=True)
    submission = relationship("Suggestion")
    
    created_at = Column(DateTime, default=datetime.utcnow)
