from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List
import uuid
from uuid import UUID

from models.suggestion import SuggestionStatus, VerificationStatus


class SuggestionImageResponse(BaseModel):
    id: uuid.UUID
    suggestion_id: uuid.UUID
    image_url: str
    created_at: datetime

    class Config:
        from_attributes = True


class StatusHistoryResponse(BaseModel):
    id: uuid.UUID
    suggestion_id: uuid.UUID
    status: str
    remarks: Optional[str] = None
    changed_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class SuggestionResponse(BaseModel):
    id: uuid.UUID
    citizen_id: UUID
    title: str
    description: str
    raw_submission: str
    user_selected_category: str
    voice_transcript: Optional[str] = None
    voice_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    status: str
    verification_status: str
    created_at: datetime
    updated_at: datetime

    # Future AI Fields
    ai_summary: Optional[str] = None
    ai_category: Optional[str] = None
    priority_score: Optional[float] = None
    confidence_score: Optional[float] = None
    duplicate_group_id: Optional[uuid.UUID] = None

    # Relationships
    images: List[SuggestionImageResponse] = Field(default_factory=list)
    status_history: List[StatusHistoryResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class SuggestionCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, description="Title of the suggestion, max 100 characters")
    description: str = Field(..., min_length=10, description="Detailed description of the suggestion, min 10 characters")
    user_selected_category: str = Field(..., min_length=1, description="Required category name")
    voice_url: Optional[str] = None
    voice_transcript: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Latitude must be between -90 and 90")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Longitude must be between -180 and 180")
    address: Optional[str] = None
    images: List[str] = Field(
        default_factory=list,
        description="List of image URLs associated with the suggestion"
    )

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Title must not be empty or whitespace only")
        if len(v_stripped) > 100:
            raise ValueError("Title must be 100 characters or less")
        return v_stripped

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v_stripped = v.strip()
        if len(v_stripped) < 10:
            raise ValueError("Description must be at least 10 characters long")
        return v_stripped

    @field_validator("user_selected_category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Category is required and cannot be empty or whitespace")
        return v_stripped


class SuggestionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, min_length=10)
    user_selected_category: Optional[str] = Field(None, min_length=1)
    voice_url: Optional[str] = None
    voice_transcript: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address: Optional[str] = None
    images: Optional[List[str]] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Title must not be empty or whitespace only")
        if len(v_stripped) > 100:
            raise ValueError("Title must be 100 characters or less")
        return v_stripped

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v_stripped = v.strip()
        if len(v_stripped) < 10:
            raise ValueError("Description must be at least 10 characters long")
        return v_stripped

    @field_validator("user_selected_category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("Category must not be empty or whitespace")
        return v_stripped


class SuggestionListResponse(BaseModel):
    suggestions: List[SuggestionResponse]
    total: int
    page: int
    limit: int


class StatusUpdateRequest(BaseModel):
    status: str = Field(..., description="The new status to apply")
    remarks: Optional[str] = Field(None, description="Optional remarks explaining the status change")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = [status.value for status in SuggestionStatus]
        if v not in valid_statuses:
            raise ValueError(
                f"Invalid status value. Must be one of: {', '.join(valid_statuses)}"
            )
        return v