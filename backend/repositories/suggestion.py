from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models.suggestion import Suggestion, SuggestionImage, SuggestionStatusHistory
from repositories.base import BaseRepository

class SuggestionRepository(BaseRepository[Suggestion]):
    def get_by_citizen(self, db: Session, citizen_id: int, skip: int = 0, limit: int = 20) -> List[Suggestion]:
        """
        Retrieves suggestions created by a specific citizen.
        """
        return db.query(self.model).filter(self.model.citizen_id == citizen_id).offset(skip).limit(limit).all()

    def get_filtered(
        self,
        db: Session,
        *,
        citizen_id: Optional[int] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        search: Optional[str] = None,
        sort: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> tuple[List[Suggestion], int]:
        """
        Fetch suggestions with filters, search, sorting, and pagination.
        Returns a tuple of (results_list, total_count).
        """
        query = db.query(self.model)

        if citizen_id is not None:
            query = query.filter(self.model.citizen_id == citizen_id)

        if category:
            query = query.filter(self.model.user_selected_category == category)

        if status:
            query = query.filter(self.model.status == status)

        if date_from:
            query = query.filter(self.model.created_at >= date_from)

        if date_to:
            query = query.filter(self.model.created_at <= date_to)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    self.model.title.ilike(search_term),
                    self.model.description.ilike(search_term)
                )
            )

        # Apply sorting
        if sort == "oldest":
            query = query.order_by(self.model.created_at.asc())
        elif sort == "title_asc":
            query = query.order_by(self.model.title.asc())
        elif sort == "title_desc":
            query = query.order_by(self.model.title.desc())
        else:
            # Default to newest first
            query = query.order_by(self.model.created_at.desc())

        # Count total matches before pagination
        total = query.count()

        # Apply pagination
        results = query.offset(skip).limit(limit).all()
        return results, total

    def update(self, db: Session, db_obj: Suggestion, obj_in: dict) -> Suggestion:
        """
        Updates an existing suggestion object with dictionary values.
        """
        for field, value in obj_in.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        db_obj.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_obj)
        return db_obj


class SuggestionImageRepository(BaseRepository[SuggestionImage]):
    def get_by_suggestion(self, db: Session, suggestion_id: any) -> List[SuggestionImage]:
        """
        Retrieves all image URLs associated with a suggestion.
        """
        return db.query(self.model).filter(self.model.suggestion_id == suggestion_id).all()


class StatusHistoryRepository(BaseRepository[SuggestionStatusHistory]):
    def get_by_suggestion(self, db: Session, suggestion_id: any) -> List[SuggestionStatusHistory]:
        """
        Retrieves status transitions list for a suggestion.
        """
        return db.query(self.model).filter(self.model.suggestion_id == suggestion_id).order_by(self.model.created_at.desc()).all()


suggestion_repository = SuggestionRepository(Suggestion)
suggestion_image_repository = SuggestionImageRepository(SuggestionImage)
status_history_repository = StatusHistoryRepository(SuggestionStatusHistory)
