import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from typing import Optional

# Load environment variables from .env file
from pathlib import Path

# Try current working directory, backend folder, and the directory of this file
env_file_paths = [
    Path(os.getcwd()) / ".env",
    Path(os.getcwd()) / "backend" / ".env",
    Path(__file__).resolve().parent.parent / ".env",
]

for path in env_file_paths:
    if path.exists():
        load_dotenv(dotenv_path=path, override=True)
        break
else:
    load_dotenv(override=True)


class Settings(BaseSettings):

    PROJECT_NAME: str = "YUKTI"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5432/yukti")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "yuktisupersecretkeyjwt123")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # GCP configuration
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    GOOGLE_CLOUD_PROJECT: Optional[str] = os.getenv("GOOGLE_CLOUD_PROJECT")
    GCS_BUCKET_NAME: Optional[str] = os.getenv("GCS_BUCKET_NAME")
    CLOUD_STORAGE_BUCKET: Optional[str] = os.getenv("CLOUD_STORAGE_BUCKET")
    GOOGLE_MAPS_API_KEY: Optional[str] = os.getenv("GOOGLE_MAPS_API_KEY")
    
    # Upload limits
    MAX_IMAGE_SIZE: int = int(os.getenv("MAX_IMAGE_SIZE", 5 * 1024 * 1024))
    MAX_AUDIO_SIZE: int = int(os.getenv("MAX_AUDIO_SIZE", 10 * 1024 * 1024))

    class Config:
        case_sensitive = True

settings = Settings()

