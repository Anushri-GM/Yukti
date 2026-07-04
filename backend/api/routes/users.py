from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.session import get_db
from schemas.user import UserUpdateProfile, ChangePasswordRequest, UserOut
from auth.deps import get_current_user
from models.user import User
from utils.security import hash_password, verify_password
from core.logging import logger

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.put("/profile", response_model=UserOut)
def update_profile(
    profile_in: UserUpdateProfile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the authenticated user's profile details. Modifying the role is restricted.
    """
    logger.info(f"Updating profile details for user: {current_user.email}")
    
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Changes the password for the current user after validating current password.
    """
    if not verify_password(req.current_password, current_user.password_hash):
        logger.warning(f"Password change failure: Incorrect current password for user {current_user.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
        
    if req.new_password != req.new_password_confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )
        
    current_user.password_hash = hash_password(req.new_password)
    db.commit()
    logger.info(f"Password changed successfully for user: {current_user.email}")
    return {"detail": "Password updated successfully"}
