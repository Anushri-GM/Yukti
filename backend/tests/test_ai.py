import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from services import ai_service
from core.config import settings

client = TestClient(app)

def test_fallback_category_detection():
    # Test keywords for category detection fallback
    assert ai_service._fallback_category("The main road has a huge pothole") == "Roads"
    assert ai_service._fallback_category("Water leakage in main street pipe") == "Water"
    assert ai_service._fallback_category("Garbage is piling up near school") == "Sanitation"
    assert ai_service._fallback_category("Need a hospital or clinic nearby") == "Healthcare"
    assert ai_service._fallback_category("Students need a school building") == "Education"
    assert ai_service._fallback_category("Crime rates are high near dark alleys") == "Safety"
    assert ai_service._fallback_category("Random unknown issue") == "Other"

def test_fallback_department_recommendation():
    assert ai_service.recommend_department("Roads") == "Ministry of Road Transport and Highways"
    assert ai_service.recommend_department("Water") == "Ministry of Jal Shakti"
    assert ai_service.recommend_department("Healthcare") == "Ministry of Health and Family Welfare"

def test_fallback_priority_calculation():
    # Urgency levels
    assert ai_service._fallback_urgency("This is a major flood hazard emergency") == 5
    assert ai_service._fallback_urgency("Broken pipeline") == 4
    assert ai_service._fallback_urgency("Normal maintenance request") == 3

    # Priority score
    score = ai_service._fallback_priority("Broken pipe affecting the whole community", "Water", 4)
    assert 0.0 <= score <= 100.0

@patch("services.ai_service.gemini_available", False)
def test_ai_analyze_endpoint_fallback():
    # Run the analyze endpoint using fallback mode
    payload = {"text": "A severe road pothole issue blocking traffic"}
    # Mock authentication to allow test call
    with patch("auth.deps.get_current_user") as mock_user:
        mock_user.return_value = MagicMock(role="Citizen", email="test@test.gov.in")
        
        response = client.post("/api/ai/analyze", json=payload, headers={"Authorization": "Bearer mock-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["category"] == "Roads"
        assert data["urgency"] == 5
        assert data["priority_score"] > 50.0

@patch("services.ai_service.gemini_available", False)
def test_ai_summarize_endpoint():
    payload = {"text": "There is a severe water leakage problem on the main street which is flooding the local shops."}
    with patch("auth.deps.get_current_user") as mock_user:
        mock_user.return_value = MagicMock(role="Citizen", email="test@test.gov.in")
        response = client.post("/api/ai/summarize", json=payload, headers={"Authorization": "Bearer mock-token"})
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data

@patch("services.ai_service.gemini_available", False)
def test_ai_recommend_endpoint():
    payload = {"text": "Need drinking water connection in our sector"}
    with patch("auth.deps.get_current_user") as mock_user:
        mock_user.return_value = MagicMock(role="Officer", email="officer@test.gov.in")
        response = client.post("/api/ai/recommend", json=payload, headers={"Authorization": "Bearer mock-token"})
        assert response.status_code == 200
        data = response.json()
        assert "recommended_scheme" in data
        assert "department" in data

@patch("services.ai_service.gemini_available", False)
def test_ai_priority_endpoint():
    payload = {"text": "Dangerous electrical wire dangling near the entrance of school"}
    with patch("auth.deps.get_current_user") as mock_user:
        mock_user.return_value = MagicMock(role="MP", email="mp@test.gov.in")
        response = client.post("/api/ai/priority", json=payload, headers={"Authorization": "Bearer mock-token"})
        assert response.status_code == 200
        data = response.json()
        assert "priority_level" in data
        assert "priority_score" in data

@patch("services.ai_service.gemini_available", False)
def test_ai_explain_endpoint():
    payload = {"text": "A pothole on the national highway causing accidents"}
    with patch("auth.deps.get_current_user") as mock_user:
        mock_user.return_value = MagicMock(role="Citizen", email="test@test.gov.in")
        response = client.post("/api/ai/explain", json=payload, headers={"Authorization": "Bearer mock-token"})
        assert response.status_code == 200
        data = response.json()
        assert "why_priority" in data
        assert "why_category" in data
        assert "explanation" in data
