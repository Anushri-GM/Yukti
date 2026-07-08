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

    # Temporary diagnostics run
    try:
        import os
        frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
        log_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "build_log.txt"))
        logger.info(f"Running diagnostics npm run build in: {frontend_path}")
        res = subprocess.run(["npm.cmd", "run", "build"], cwd=frontend_path, capture_output=True, text=True)
        with open(log_path, "w") as f:
            f.write("Exit Code: " + str(res.returncode) + "\n\n")
            f.write("STDOUT:\n" + res.stdout + "\n\n")
            f.write("STDERR:\n" + res.stderr + "\n")
        logger.info("Diagnostics completed. Log written.")
    except Exception as e:
        logger.error(f"Failed to run diagnostics build: {e}")

    # Auto-create all tables in PostgreSQL
    from database.session import engine, Base
    from models.user import User
    from models.suggestion import Suggestion, SuggestionImage, SuggestionStatusHistory
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas verified and created successfully.")

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


