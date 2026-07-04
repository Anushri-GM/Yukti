import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "YUKTI"
    API_V1_STR: str = "/api/v1"
    
    # SQLite fallback for easy local MVP setup
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./yukti.db")
    
    # Gemini API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    class Config:
        case_sensitive = True

settings = Settings()
