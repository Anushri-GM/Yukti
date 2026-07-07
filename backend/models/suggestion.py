import uuid
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UUID
from sqlalchemy.orm import relationship
from database.session import Base

class SuggestionStatus(str, Enum):
    SUBMITTED = "Submitted"
    UNDER_REVIEW = "Under Review"
    VERIFIED = "Verified"
    PLANNING = "Planning"
    APPROVED = "Approved"
    REJECTED = "Rejected"

class VerificationStatus(str, Enum):
    PENDING = "Pending"
    VERIFIED = "Verified"
    REJECTED = "Rejected"

class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    citizen_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(100), nullable=False)
    description = Column(String, nullable=False)
    raw_submission = Column(String, nullable=False)
    user_selected_category = Column(String, nullable=False)
    
    voice_transcript = Column(String, nullable=True)
    voice_url = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address = Column(String, nullable=True)
    
    status = Column(String, default=SuggestionStatus.SUBMITTED.value, nullable=False)
    verification_status = Column(String, default=VerificationStatus.PENDING.value, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Future AI Fields (unpopulated for now)
    ai_summary = Column(String, nullable=True)
    ai_category = Column(String, nullable=True)
    priority_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)
    duplicate_group_id = Column(UUID(as_uuid=True), nullable=True)

    # Relationships
    citizen = relationship("User", back_populates="suggestions")
    images = relationship("SuggestionImage", back_populates="suggestion", cascade="all, delete-orphan")
    status_history = relationship("SuggestionStatusHistory", back_populates="suggestion", cascade="all, delete-orphan")

    @property
    def text(self):
        return self.description

    @property
    def category(self):
        return self.ai_category or self.user_selected_category

    @property
    def urgency(self):
        if self.priority_score is not None:
            return max(1, min(5, int(self.priority_score / 20.0)))
        return 3

    @property
    def summary(self):
        return self.ai_summary

    @property
    def affected_infrastructure(self):
        return self.address or "Local Area"

    @property
    def confidence(self):
        return self.confidence_score or 1.0


class SuggestionImage(Base):
    __tablename__ = "suggestion_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    suggestion_id = Column(UUID(as_uuid=True), ForeignKey("suggestions.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    suggestion = relationship("Suggestion", back_populates="images")


class SuggestionStatusHistory(Base):
    __tablename__ = "suggestion_status_histories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    suggestion_id = Column(UUID(as_uuid=True), ForeignKey("suggestions.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, nullable=False)
    remarks = Column(String, nullable=True)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    suggestion = relationship("Suggestion", back_populates="status_history")
    user = relationship("User")
