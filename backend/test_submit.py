import sys
import os

# Adjust paths to import backend modules correctly
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "app"))

from app.db.session import SessionLocal
from app.db import models

db = SessionLocal()
try:
    print("Testing DB session Suggestion insertion...")
    db_submission = models.Suggestion(
        title="Test Title",
        description="Test Desc",
        raw_submission="Test Raw",
        user_selected_category="Roads",
        latitude=10.0,
        longitude=10.0,
        address="Test Ward",
        status="Submitted",
        verification_status="Pending",
        ai_category="Roads",
        priority_score=60.0,
        ai_summary="Test Summary",
        confidence_score=0.8
    )
    db.add(db_submission)
    db.commit()
    print("Success! Created Suggestion ID:", db_submission.id)
    # Cleanup test suggestion
    db.delete(db_submission)
    db.commit()
    print("Cleanup successful.")
except Exception as e:
    print("CRITICAL ERROR:", type(e), str(e))
finally:
    db.close()
