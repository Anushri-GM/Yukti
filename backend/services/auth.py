from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status
from models.user import User
from schemas.user import UserCreate, LoginRequest, UserUpdateProfile, ChangePasswordRequest
from repositories.user import user_repository
from utils.security import hash_password, verify_password
from auth.jwt import create_access_token, create_refresh_token, decode_token
from core.logging import logger

def register_user(db: Session, user_in: UserCreate) -> User:
    """
    Registers a new user after verifying email uniqueness and hashing password.
    """
    existing_user = user_repository.get_by_email(db, email=user_in.email)
    if existing_user:
        logger.warning(f"Registration failed: Email {user_in.email} is already registered.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered in system.",
        )
        
    hashed = hash_password(user_in.password)
    user_data = user_in.model_dump()
    user_data.pop("password")
    user_data["password_hash"] = hashed
    
    logger.info(f"Registering new user: {user_in.email} with role {user_in.role}")
    return user_repository.create(db, user_data)

def authenticate_user(db: Session, login_in: LoginRequest) -> User:
    """
    Verifies user credentials. On success, updates last login time and returns the user.
    """
    user = user_repository.get_by_email(db, email=login_in.email)
    if not user:
        logger.warning(f"Authentication failure: User {login_in.email} not found.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    if not verify_password(login_in.password, user.password_hash):
        logger.warning(f"Authentication failure: Incorrect password for user {login_in.email}.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
        
    if not user.is_active:
        logger.warning(f"Authentication failure: User {login_in.email} is inactive.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive",
        )
        
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    logger.info(f"Successful login for user: {login_in.email}")
    return user

def refresh_access_token(token: str) -> str:
    """
    Validates a refresh token and generates a new access token.
    """
    payload = decode_token(token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
        
    email = payload.get("sub")
    role = payload.get("role")
    
    # Generate new access token
    new_access_token = create_access_token(data={"sub": email, "role": role})
    return new_access_token
