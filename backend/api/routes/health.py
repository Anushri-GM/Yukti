from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database.session import get_db

router = APIRouter()

@router.get("/")
def get_root():
    return {
        "application": "YUKTI",
        "status": "running",
        "version": "1.0"
    }

@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {e}")

@router.get("/api/version")
def get_version():
    return {
        "version": "1.0.0"
    }
