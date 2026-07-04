from sqlalchemy.orm import Session
from models.user import User
from repositories.base import BaseRepository
from typing import Optional

class UserRepository(BaseRepository[User]):
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(self.model).filter(self.model.email == email).first()

user_repository = UserRepository(User)
