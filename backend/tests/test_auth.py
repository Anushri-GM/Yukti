import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.session import Base
from models.user import User
from utils.security import hash_password, verify_password
from auth.jwt import create_access_token, create_refresh_token, decode_token

# InMemory database config for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_password_hashing():
    password = "supersecretpassword123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrongpassword", hashed)

def test_jwt_generation_and_decoding():
    data = {"sub": "citizen@test.gov.in", "role": "Citizen"}
    access_token = create_access_token(data)
    refresh_token = create_refresh_token(data)
    
    # Verify access token
    payload = decode_token(access_token)
    assert payload is not None
    assert payload["sub"] == "citizen@test.gov.in"
    assert payload["role"] == "Citizen"
    assert payload["type"] == "access"
    
    # Verify refresh token
    payload_refresh = decode_token(refresh_token)
    assert payload_refresh is not None
    assert payload_refresh["sub"] == "citizen@test.gov.in"
    assert payload_refresh["role"] == "Citizen"
    assert payload_refresh["type"] == "refresh"
