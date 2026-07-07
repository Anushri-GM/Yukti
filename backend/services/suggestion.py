from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.user import User
from models.suggestion import Suggestion, SuggestionImage, SuggestionStatusHistory, SuggestionStatus, VerificationStatus
from schemas.suggestion import SuggestionCreate, SuggestionUpdate, StatusUpdateRequest
from repositories.suggestion import suggestion_repository, suggestion_image_repository, status_history_repository
from core.logging import logger

def create_suggestion(db: Session, citizen_id: int, suggestion_in: SuggestionCreate) -> Suggestion:
    """
    Creates a new suggestion, logs the initial status history, and processes attached images.
    """
    logger.info(f"Creating new suggestion for citizen {citizen_id}: {suggestion_in.title}")
    
    suggestion_data = suggestion_in.model_dump(exclude={"images"})
    suggestion_data["citizen_id"] = citizen_id
    suggestion_data["raw_submission"] = suggestion_in.description  # Set description as raw submission
    
    # Defaults
    suggestion_data["status"] = SuggestionStatus.SUBMITTED.value
    suggestion_data["verification_status"] = VerificationStatus.PENDING.value
    
    # Save suggestion
    suggestion = suggestion_repository.create(db, suggestion_data)
    
    # Create initial status history
    history_in = {
        "suggestion_id": suggestion.id,
        "status": SuggestionStatus.SUBMITTED.value,
        "remarks": "Initial submission.",
        "changed_by": citizen_id
    }
    status_history_repository.create(db, history_in)
    
    # Save images if provided
    if suggestion_in.images:
        for img_url in suggestion_in.images:
            img_data = {
                "suggestion_id": suggestion.id,
                "image_url": img_url
            }
            suggestion_image_repository.create(db, img_data)
            
    # Refresh to load relationships
    db.refresh(suggestion)
    return suggestion


def get_suggestion_by_id(db: Session, current_user: User, suggestion_id: any) -> Suggestion:
    """
    Retrieves a suggestion by ID. Verifies citizen ownership.
    """
    suggestion = suggestion_repository.get(db, suggestion_id)
    if not suggestion:
        logger.warning(f"Suggestion {suggestion_id} not found.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found"
        )
        
    # Check ownership: Citizens can only see their own suggestions
    if current_user.role == "Citizen" and suggestion.citizen_id != current_user.id:
        logger.warning(f"Access denied: User {current_user.id} tried to access suggestion {suggestion_id} owned by {suggestion.citizen_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this suggestion"
        )
        
    return suggestion


def get_suggestions(
    db: Session,
    current_user: User,
    *,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    limit: int = 20
) -> Tuple[List[Suggestion], int]:
    """
    Lists suggestions with filters, search, and pagination.
    Citizens can ONLY view their own suggestions. Other roles (Officers, MPs) can view all.
    """
    # Enforce default page/limit constraints
    if limit < 1:
        limit = 20
    elif limit > 100:
        limit = 100
        
    if page < 1:
        page = 1
        
    skip = (page - 1) * limit
    
    citizen_id = None
    if current_user.role == "Citizen":
        citizen_id = current_user.id
        
    results, total = suggestion_repository.get_filtered(
        db,
        citizen_id=citizen_id,
        category=category,
        status=status_filter,
        date_from=date_from,
        date_to=date_to,
        search=search,
        sort=sort,
        skip=skip,
        limit=limit
    )
    return results, total


def update_suggestion(db: Session, current_user: User, suggestion_id: any, suggestion_in: SuggestionUpdate) -> Suggestion:
    """
    Updates a suggestion's basic details. Verifies citizen ownership.
    """
    suggestion = get_suggestion_by_id(db, current_user, suggestion_id)
    
    logger.info(f"User {current_user.id} is updating suggestion {suggestion_id}")
    
    update_data = suggestion_in.model_dump(exclude_unset=True, exclude={"images"})
    
    # If the user changed the description, we should also update raw_submission
    if "description" in update_data:
        update_data["raw_submission"] = update_data["description"]
        
    suggestion = suggestion_repository.update(db, suggestion, update_data)
    
    # Handle images update if provided
    if suggestion_in.images is not None:
        # Delete existing images
        existing_imgs = suggestion_image_repository.get_by_suggestion(db, suggestion.id)
        for img in existing_imgs:
            db.delete(img)
        db.commit()
        
        # Add new images
        for img_url in suggestion_in.images:
            img_data = {
                "suggestion_id": suggestion.id,
                "image_url": img_url
            }
            suggestion_image_repository.create(db, img_data)
            
    db.refresh(suggestion)
    return suggestion


def delete_suggestion(db: Session, current_user: User, suggestion_id: any) -> None:
    """
    Deletes a suggestion by ID. Verifies citizen ownership.
    """
    # Ensure existence and ownership check
    suggestion = get_suggestion_by_id(db, current_user, suggestion_id)
    
    logger.info(f"User {current_user.id} is deleting suggestion {suggestion_id}")
    suggestion_repository.remove(db, suggestion_id)


def change_suggestion_status(db: Session, current_user: User, suggestion_id: any, status_in: StatusUpdateRequest) -> Suggestion:
    """
    Updates suggestion status and creates a status history log entry.
    Requires ownership for citizens.
    """
    suggestion = get_suggestion_by_id(db, current_user, suggestion_id)
    
    logger.info(f"User {current_user.id} is updating status of suggestion {suggestion_id} to '{status_in.status}'")
    
    old_status = suggestion.status
    suggestion.status = status_in.status
    
    # Update verification status automatically based on suggestion status
    if status_in.status == SuggestionStatus.VERIFIED.value:
        suggestion.verification_status = VerificationStatus.VERIFIED.value
    elif status_in.status == SuggestionStatus.REJECTED.value:
        suggestion.verification_status = VerificationStatus.REJECTED.value
        
    db.commit()
    
    # Create status history record
    history_in = {
        "suggestion_id": suggestion.id,
        "status": status_in.status,
        "remarks": status_in.remarks or f"Status changed from {old_status} to {status_in.status}.",
        "changed_by": current_user.id
    }
    status_history_repository.create(db, history_in)
    
    db.refresh(suggestion)
    return suggestion
