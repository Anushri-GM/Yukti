from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: str = Field("Citizen", pattern="^(Citizen|Officer|MP)$")
    preferred_language: str = Field("en", min_length=2, max_length=5)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=50)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class UserOut(UserBase):
    id: UUID
    phone_number: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UserUpdateProfile(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    preferred_language: Optional[str] = Field(None, min_length=2, max_length=5)
    phone_number: Optional[str] = None
    profile_image: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=50)
    new_password_confirm: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
