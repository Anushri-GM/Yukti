from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.session import get_db
from schemas.user import UserCreate, LoginRequest, RefreshRequest, TokenResponse, UserOut
from services import auth as auth_service
from auth.jwt import create_access_token, create_refresh_token
from auth.deps import get_current_user
from models.user import User
from core.logging import logger

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = auth_service.register_user(db, user_in)
    
    # Generate tokens
    access = create_access_token(data={"sub": db_user.email, "role": db_user.role})
    refresh = create_refresh_token(data={"sub": db_user.email, "role": db_user.role})
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "user": db_user
    }

@router.post("/login", response_model=TokenResponse)
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    db_user = auth_service.authenticate_user(db, login_in)
    
    # Generate tokens
    access = create_access_token(data={"sub": db_user.email, "role": db_user.role})
    refresh = create_refresh_token(data={"sub": db_user.email, "role": db_user.role})
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "user": db_user
    }

@router.post("/refresh")
def refresh(req: RefreshRequest):
    new_access = auth_service.refresh_access_token(req.refresh_token)
    return {"access_token": new_access}

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    logger.info(f"User logged out: {current_user.email}")
    return {"detail": "Successfully logged out"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
