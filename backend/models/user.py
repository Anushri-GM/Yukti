import uuid
from sqlalchemy import Column, String, DateTime, Boolean, UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Citizen")  # Citizen, Officer, MP
    preferred_language = Column(String, default="en")
    phone_number = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    suggestions = relationship("Suggestion", back_populates="citizen", cascade="all, delete-orphan")

