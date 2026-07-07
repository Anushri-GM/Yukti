import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database.session import Base, get_db
from models.user import User
from utils.security import hash_password
from auth.jwt import create_access_token
from core.config import settings

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
def officer_token(test_officer) -> str:
    return create_access_token({"sub": test_officer.email, "role": test_officer.role})

client = TestClient(app)

# ----------------------------------------------------
# GCS and Speech Mocks
# ----------------------------------------------------

@pytest.fixture(autouse=True)
def mock_gcs():
    with patch("services.storage_service.storage.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_bucket = MagicMock()
        mock_blob = MagicMock()
        
        mock_client_cls.return_value = mock_client
        mock_client.bucket.return_value = mock_bucket
        mock_bucket.blob.return_value = mock_blob
        
        # Mock upload and exists
        mock_blob.upload_from_string.return_value = True
        mock_blob.exists.return_value = True
        mock_blob.generate_signed_url.return_value = "https://storage.googleapis.com/test-bucket/mocked-file"
        
        yield {
            "client": mock_client,
            "bucket": mock_bucket,
            "blob": mock_blob
        }

@pytest.fixture(autouse=True)
def mock_speech():
    with patch("services.speech_service.speech.SpeechClient") as mock_speech_cls:
        mock_client = MagicMock()
        mock_speech_cls.return_value = mock_client
        
        # Mock response structure
        mock_response = MagicMock()
        mock_result = MagicMock()
        mock_alternative = MagicMock()
        
        mock_client.recognize.return_value = mock_response
        mock_response.results = [mock_result]
        mock_result.alternatives = [mock_alternative]
        mock_alternative.transcript = "Test speech transcription."
        mock_alternative.confidence = 0.98
        
        yield mock_client

# ----------------------------------------------------
# Tests
# ----------------------------------------------------

def test_image_upload_success(citizen_token):
    # Valid PNG image under 5MB
    files = {"file": ("test.png", b"fake_png_data", "image/png")}
    headers = {"Authorization": f"Bearer {citizen_token}"}
    
    response = client.post("/api/upload/image", files=files, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert "image_url" in data
    assert "blob_name" in data
    assert data["size"] == len(b"fake_png_data")
    assert data["blob_name"].startswith("images/")

def test_image_upload_invalid_type(citizen_token):
    # Invalid extension/MIME type
    files = {"file": ("test.exe", b"fake_executable_data", "application/octet-stream")}
    headers = {"Authorization": f"Bearer {citizen_token}"}
    
    response = client.post("/api/upload/image", files=files, headers=headers)
    assert response.status_code == 400
    assert "Unsupported image type" in response.json()["detail"]

def test_image_upload_file_too_large(citizen_token):
    # Exceeds settings.MAX_IMAGE_SIZE (5MB)
    large_data = b"x" * (settings.MAX_IMAGE_SIZE + 100)
    files = {"file": ("test.jpg", large_data, "image/jpeg")}
    headers = {"Authorization": f"Bearer {citizen_token}"}
    
    response = client.post("/api/upload/image", files=files, headers=headers)
    assert response.status_code == 413
    assert "File too large" in response.json()["detail"]

def test_audio_upload_success(citizen_token):
    # Valid WAV audio under 10MB
    files = {"file": ("test.wav", b"fake_wav_data", "audio/wav")}
    headers = {"Authorization": f"Bearer {citizen_token}"}
    
    response = client.post("/api/upload/audio", files=files, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert "audio_url" in data
    assert data["transcript"] == "Test speech transcription."
    assert data["confidence"] == 0.98

def test_audio_upload_invalid_type(citizen_token):
    # Invalid extension/MIME type
    files = {"file": ("test.txt", b"fake_txt_data", "text/plain")}
    headers = {"Authorization": f"Bearer {citizen_token}"}
    
    response = client.post("/api/upload/audio", files=files, headers=headers)
    assert response.status_code == 400
    assert "Unsupported audio type" in response.json()["detail"]

def test_delete_image_file_success(citizen_token):
    headers = {"Authorization": f"Bearer {citizen_token}"}
    response = client.delete("/api/upload/image/images/fake-image.png", headers=headers)
    assert response.status_code == 204

def test_delete_image_file_invalid_path(citizen_token):
    headers = {"Authorization": f"Bearer {citizen_token}"}
    # Path traversal attack or invalid folder
    response = client.delete("/api/upload/image/voice/fake-image.png", headers=headers)
    assert response.status_code == 400
    assert "Invalid image path" in response.json()["detail"]

def test_upload_unauthorized():
    files = {"file": ("test.png", b"fake_png_data", "image/png")}
    response = client.post("/api/upload/image", files=files)
    assert response.status_code == 401

def test_upload_forbidden_role(officer_token):
    # Restricted to Citizen only
    files = {"file": ("test.png", b"fake_png_data", "image/png")}
    headers = {"Authorization": f"Bearer {officer_token}"}
    response = client.post("/api/upload/image", files=files, headers=headers)
    assert response.status_code == 403
