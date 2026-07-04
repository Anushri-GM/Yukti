from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from core.config import settings
from core.logging import logger
import time

# Connection pooling options
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def check_db_connection(retries: int = 5, delay: int = 2) -> bool:
    """
    Checks database connection on startup with automatic retries.
    """
    logger.info("Checking database connection...")
    for i in range(retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection verified successfully.")
            return True
        except Exception as e:
            logger.warning(f"Database connection attempt {i+1} failed: {e}")
            if i < retries - 1:
                time.sleep(delay)
    logger.error("Could not establish database connection.")
    return False

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
