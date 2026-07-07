import os
from dotenv import load_dotenv
from pathlib import Path
from pydantic_settings import BaseSettings

# Try current working directory, backend folder, and the directory of this file
env_file_paths = [
    Path(os.getcwd()) / ".env",
    Path(os.getcwd()) / "backend" / ".env",
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",
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
    
    # SQLite fallback for easy local MVP setup
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./yukti.db")
    
    # Gemini API Key
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    class Config:
        case_sensitive = True

settings = Settings()
