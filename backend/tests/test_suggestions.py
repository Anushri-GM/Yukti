import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database.session import Base, get_db
from models.user import User
from models.suggestion import Suggestion, SuggestionStatus, VerificationStatus
from utils.security import hash_password
from auth.jwt import create_access_token

# InMemory database config for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    # Overriding dependency
    def override_get_db():
        try:
            yield session
        finally:
            session.close()
            
    app.dependency_overrides[get_db] = override_get_db
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture
def test_citizen(db) -> User:
    user = User(
        full_name="John Doe",
        email="john@test.gov.in",
        password_hash=hash_password("password123"),
        role="Citizen",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def test_citizen_other(db) -> User:
    user = User(
        full_name="Jane Doe",
        email="jane@test.gov.in",
        password_hash=hash_password("password123"),
        role="Citizen",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def test_officer(db) -> User:
    user = User(
        full_name="Officer Bob",
        email="bob@test.gov.in",
        password_hash=hash_password("password123"),
        role="Officer",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def citizen_token(test_citizen) -> str:
    return create_access_token({"sub": test_citizen.email, "role": test_citizen.role})

@pytest.fixture
def citizen_other_token(test_citizen_other) -> str:
    return create_access_token({"sub": test_citizen_other.email, "role": test_citizen_other.role})

@pytest.fixture
def officer_token(test_officer) -> str:
    return create_access_token({"sub": test_officer.email, "role": test_officer.role})

client = TestClient(app)

def test_create_suggestion(citizen_token):
    payload = {
        "title": "Clean water supply issue",
        "description": "The water supply in sector 4 has been muddy for 3 days.",
        "user_selected_category": "Water Sanitation",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "Sector 4, New Delhi",
        "images": ["http://example.com/image1.png"]
    }
    headers = {"Authorization": f"Bearer {citizen_token}"}
    response = client.post("/api/suggestions", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert data["user_selected_category"] == payload["user_selected_category"]
    assert data["status"] == "Submitted"
    assert len(data["images"]) == 1
    assert data["images"][0]["image_url"] == "http://example.com/image1.png"

def test_create_suggestion_validation_description_length(citizen_token):
    payload = {
        "title": "Clean water",
        "description": "Too short",  # Must be at least 10 chars
        "user_selected_category": "Water",
    }
    headers = {"Authorization": f"Bearer {citizen_token}"}
    response = client.post("/api/suggestions", json=payload, headers=headers)
    assert response.status_code == 422

def test_create_suggestion_validation_coordinates(citizen_token):
    payload = {
        "title": "Valid title",
        "description": "This is a long enough description.",
        "user_selected_category": "Water",
        "latitude": 95.0,  # Invalid (> 90)
        "longitude": 180.0
    }
    headers = {"Authorization": f"Bearer {citizen_token}"}
    response = client.post("/api/suggestions", json=payload, headers=headers)
    assert response.status_code == 422

def test_get_own_suggestions(citizen_token, citizen_other_token, db, test_citizen, test_citizen_other):
    # Add suggestions for both citizens
    s1 = Suggestion(
        citizen_id=test_citizen.id,
        title="Citizen 1 Suggestion",
        description="This is a description for suggestion 1.",
        user_selected_category="Roads",
        raw_submission="This is a description for suggestion 1."
    )
    s2 = Suggestion(
        citizen_id=test_citizen_other.id,
        title="Citizen 2 Suggestion",
        description="This is a description for suggestion 2.",
        user_selected_category="Electricity",
        raw_submission="This is a description for suggestion 2."
    )
    db.add_all([s1, s2])
    db.commit()

    # Get suggestions for Citizen 1
    response = client.get("/api/suggestions", headers={"Authorization": f"Bearer {citizen_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["suggestions"][0]["title"] == "Citizen 1 Suggestion"

    # Get suggestions for Citizen 2
    response = client.get("/api/suggestions", headers={"Authorization": f"Bearer {citizen_other_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["suggestions"][0]["title"] == "Citizen 2 Suggestion"

def test_get_suggestion_by_id_ownership(citizen_token, citizen_other_token, db, test_citizen):
    s = Suggestion(
        citizen_id=test_citizen.id,
        title="Citizen 1 Suggestion",
        description="This is a description for suggestion 1.",
        user_selected_category="Roads",
        raw_submission="This is a description for suggestion 1."
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    # Owner can get
    response = client.get(f"/api/suggestions/{s.id}", headers={"Authorization": f"Bearer {citizen_token}"})
    assert response.status_code == 200
    assert response.json()["title"] == "Citizen 1 Suggestion"

    # Other Citizen cannot get
    response = client.get(f"/api/suggestions/{s.id}", headers={"Authorization": f"Bearer {citizen_other_token}"})
    assert response.status_code == 403

def test_update_suggestion(citizen_token, db, test_citizen):
    s = Suggestion(
        citizen_id=test_citizen.id,
        title="Original Title",
        description="Original Description.",
        user_selected_category="Roads",
        raw_submission="Original Description."
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    payload = {
        "title": "Updated Title",
        "description": "Updated Description long enough."
    }
    response = client.put(f"/api/suggestions/{s.id}", json=payload, headers={"Authorization": f"Bearer {citizen_token}"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"
    assert response.json()["description"] == "Updated Description long enough."

def test_delete_suggestion(citizen_token, db, test_citizen):
    s = Suggestion(
        citizen_id=test_citizen.id,
        title="To Be Deleted",
        description="Original Description.",
        user_selected_category="Roads",
        raw_submission="Original Description."
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    response = client.delete(f"/api/suggestions/{s.id}", headers={"Authorization": f"Bearer {citizen_token}"})
    assert response.status_code == 204

    # Try to get deleted suggestion
    response = client.get(f"/api/suggestions/{s.id}", headers={"Authorization": f"Bearer {citizen_token}"})
    assert response.status_code == 404

def test_unauthorized_access():
    response = client.get("/api/suggestions")
    assert response.status_code == 401

def test_officer_access_denied_to_suggestions(officer_token):
    # The requirement says "Citizen only" for these APIs. 
    # Therefore, Officers and MPs get 403 Forbidden.
    response = client.get("/api/suggestions", headers={"Authorization": f"Bearer {officer_token}"})
    assert response.status_code == 403
