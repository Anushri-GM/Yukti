from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.logging import logger
from database.session import check_db_connection
from api.routes import health, auth, users, suggestions, upload, ai

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="YUKTI AI Decision Intelligence System API Core",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    logger.info("Initializing YUKTI backend...")
    check_db_connection()
    
    # Programmatic check and install of google-genai
    import subprocess
    import sys
    try:
        from google import genai
        logger.info("google-genai package is already installed.")
    except ImportError:
        logger.info("google-genai package not found. Installing via pip...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "google-genai"])
            logger.info("google-genai package installed successfully.")
        except Exception as e:
            logger.error(f"Failed to install google-genai programmatically: {e}")

    # Programmatic check and install of faster-whisper
    try:
        from faster_whisper import WhisperModel
        logger.info("faster-whisper package is already installed.")
    except ImportError:
        logger.info("faster-whisper package not found. Installing via pip...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "faster-whisper"])
            logger.info("faster-whisper package installed successfully.")
        except Exception as e:
            logger.error(f"Failed to install faster-whisper programmatically: {e}")

    # Auto-create all tables in PostgreSQL
    from database.session import engine, Base
    import models as all_models
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas verified and created successfully.")

    # Verification run
    try:
        from fastapi.testclient import TestClient
        client = TestClient(app)
        res = client.post("/api/v1/citizens/submit", data={"text": "Verification run: road maintenance request", "ward": "Ward C (Subhash Nagar)"})
        with open(r"c:\Users\anush\OneDrive\Desktop\Projects\Yukti\Yukti\verification_log.txt", "w") as f:
            f.write(f"Status: {res.status_code}\nBody: {res.text}\n")
    except Exception as e:
        import traceback
        with open(r"c:\Users\anush\OneDrive\Desktop\Projects\Yukti\Yukti\verification_log.txt", "w") as f:
            f.write("ERROR:\n" + traceback.format_exc())

# Include routes
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(suggestions.router)
app.include_router(upload.router)
app.include_router(ai.router)

# Mount decision support sub-app
from app.main import app as app_v1
app.mount("/", app_v1)



