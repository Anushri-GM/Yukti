from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class CitizenSubmission(Base):
    __tablename__ = "citizen_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=True)
    voice_url = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    ward = Column(String, nullable=True)
    
    # Extracted by Gemini
    category = Column(String, nullable=True)  # Roads, Water, Health, Education, Sanitation, Safety
    urgency = Column(Integer, default=3)      # 1 to 5 scale
    summary = Column(Text, nullable=True)
    affected_infrastructure = Column(String, nullable=True)
    confidence = Column(Float, default=1.0)
    
    status = Column(String, default="pending")  # pending, verified, rejected, converted
    created_at = Column(DateTime, default=datetime.utcnow)

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
    
    submission_id = Column(Integer, ForeignKey("citizen_submissions.id"), nullable=True)
    submission = relationship("CitizenSubmission")
    
    created_at = Column(DateTime, default=datetime.utcnow)
