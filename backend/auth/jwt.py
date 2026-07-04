import jwt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from core.config import settings
from core.logging import logger

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a stateless JWT Access Token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """
    Generates a stateless JWT Refresh Token. (Typically expires in 7 days).
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a JWT token. Returns payload if valid, None otherwise.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token verification failed: Token signature expired.")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Token verification failed: Invalid token ({e}).")
        return None
