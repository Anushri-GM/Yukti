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


