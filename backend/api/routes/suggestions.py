from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database.session import get_db
from schemas.suggestion import (
    SuggestionCreate,
    SuggestionUpdate,
    SuggestionResponse,
    SuggestionListResponse,
    StatusUpdateRequest
)
from auth.deps import get_current_user, RoleChecker
from models.user import User
from services.suggestion import (
    create_suggestion,
    get_suggestion_by_id,
    get_suggestions,
    update_suggestion,
    delete_suggestion,
    change_suggestion_status
)
from core.logging import logger
from datetime import datetime
from typing import Optional
import uuid

router = APIRouter(prefix="/api/suggestions", tags=["Suggestions"])

# Enforce that all routes in this file are restricted to citizens
citizen_dependency = Depends(RoleChecker(["Citizen"]))

@router.post(
    "",
    response_model=SuggestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new suggestion",
    description="Allows an authenticated Citizen to create a new suggestion, optionally attaching image URLs.",
    response_description="The created suggestion record with generated IDs and status details."
)
def create_new_suggestion(
    suggestion_in: SuggestionCreate,
    current_user: User = citizen_dependency,
    db: Session = Depends(get_db)
):
    try:
        return create_suggestion(db, citizen_id=current_user.id, suggestion_in=suggestion_in)
    except Exception as e:
        logger.error(f"Error creating suggestion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create suggestion due to an internal server error"
        )

@router.get(
    "",
    response_model=SuggestionListResponse,
    summary="Retrieve suggestions list",
    description="Returns a paginated list of suggestions for the authenticated Citizen. Users can only see their own suggestions.",
    response_description="A list containing suggestion records and total count."
)
def list_suggestions(
    category: Optional[str] = Query(None, description="Filter by category name"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (e.g. Submitted, Verified)"),
    date_from: Optional[datetime] = Query(None, description="Start date filter (ISO format)"),
    date_to: Optional[datetime] = Query(None, description="End date filter (ISO format)"),
    search: Optional[str] = Query(None, description="Search term in title or description"),
    sort: Optional[str] = Query("newest", description="Sort order: newest, oldest, title_asc, title_desc"),
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    limit: int = Query(20, ge=1, le=100, description="Records limit per page (default: 20, max: 100)"),
    current_user: User = citizen_dependency,
    db: Session = Depends(get_db)
):
    try:
        results, total = get_suggestions(
            db,
            current_user,
            category=category,
            status_filter=status_filter,
            date_from=date_from,
            date_to=date_to,
            search=search,
            sort=sort,
            page=page,
            limit=limit
        )
        return {
            "suggestions": results,
            "total": total,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Error fetching suggestions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve suggestions"
        )

@router.get(
    "/{id}",
    response_model=SuggestionResponse,
    summary="Get suggestion details by ID",
    description="Retrieve full details of a specific suggestion. A user can only access their own suggestion.",
    response_description="Detailed suggestion information including images and status history log."
)
def get_suggestion_details(
    id: uuid.UUID,
    current_user: User = citizen_dependency,
    db: Session = Depends(get_db)
):
    return get_suggestion_by_id(db, current_user, id)

@router.put(
    "/{id}",
    response_model=SuggestionResponse,
    summary="Update a suggestion",
    description="Modify description, title, category, location, or images. Restricted to the owner of the suggestion.",
    response_description="The updated suggestion record."
)
def modify_suggestion(
    id: uuid.UUID,
    suggestion_in: SuggestionUpdate,
    current_user: User = citizen_dependency,
    db: Session = Depends(get_db)
):
    try:
        return update_suggestion(db, current_user, id, suggestion_in)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating suggestion {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update suggestion"
        )

@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a suggestion",
    description="Remove a suggestion. Only the owner of the suggestion is authorized.",
    response_description="No content returned on successful deletion."
)
def remove_suggestion(
    id: uuid.UUID,
    current_user: User = citizen_dependency,
    db: Session = Depends(get_db)
):
    try:
        delete_suggestion(db, current_user, id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting suggestion {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete suggestion"
        )

@router.patch(
    "/{id}/status",
    response_model=SuggestionResponse,
    summary="Change suggestion status",
    description="Updates the status of a suggestion and appends a transition record to history. Citizens can update only their own suggestions.",
    response_description="The updated suggestion record."
)
def update_status(
    id: uuid.UUID,
    status_in: StatusUpdateRequest,
    current_user: User = citizen_dependency,
    db: Session = Depends(get_db)
):
    try:
        return change_suggestion_status(db, current_user, id, status_in)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing suggestion status {id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update status"
        )
