import json
import pytest
import mongomock
from unittest.mock import patch

from achievements.function import handler

@pytest.fixture
def mock_env(monkeypatch):
    monkeypatch.setenv("MONGO_NAME", "test_db")
    monkeypatch.setenv("MONGO_HOST", "localhost")
    monkeypatch.setenv("MONGO_PORT", "27017")
    monkeypatch.setenv("IS_LOCAL", "true")

@pytest.fixture
def db_client(mock_env):
    return mongomock.MongoClient()

@pytest.fixture
def mock_db(db_client):
    with patch("achievements.function.get_db_connection", return_value=db_client):
        with patch("shared.auth.get_db_connection", return_value=db_client):
            yield db_client

@pytest.fixture
def sample_achievement():
    return {
        "_id": "a_001",
        "team_id": "t_001",
        "title": "Top Sales",
        "month": "October"
    }

@pytest.fixture
def sample_team():
    return {
        "_id": "t_001",
        "leader_id": "e_001"
    }

def create_event(http_method, path, user_id="test_admin", system_role="Admin", body=None, path_parameters=None):
    return {
        "httpMethod": http_method,
        "path": path,
        "requestContext": {
            "authorizer": {
                "user_id": user_id,
                "system_role": system_role
            }
        },
        "pathParameters": path_parameters,
        "body": json.dumps(body) if body else None
    }

def test_create_achievement(mock_db, sample_achievement, sample_team):
    mock_db["test_db"]["teams"].insert_one(sample_team) 
    event = create_event("POST", "/achievements", user_id="e_001", system_role="Employee", body=sample_achievement)
    response = handler(event, None)
    assert response.get("statusCode") == 201

def test_missing_fields(mock_db, sample_achievement, sample_team):
    mock_db["test_db"]["teams"].insert_one(sample_team)
    del sample_achievement["title"]
    event = create_event("POST", "/achievements", user_id="e_001", system_role="Employee", body=sample_achievement)
    response = handler(event, None)
    assert response.get("statusCode") == 400

def test_create_achievement_unauthorized(mock_db, sample_achievement, sample_team):
    mock_db["test_db"]["teams"].insert_one(sample_team)
    event = create_event("POST", "/achievements", user_id="e_999", system_role="Employee", body=sample_achievement)
    response = handler(event, None)
    assert response.get("statusCode") == 403

def test_employee_update_allowed(mock_db, sample_achievement, sample_team):
    mock_db["test_db"]["teams"].insert_one(sample_team)
    mock_db["test_db"]["achievements"].insert_one(sample_achievement)
    event = create_event("PUT", f"/achievements/{sample_achievement['_id']}", user_id="e_001", system_role="Employee", path_parameters={"id": sample_achievement["_id"]}, body={"title": "Better Sales"})
    response = handler(event, None)
    assert response.get("statusCode") == 200

def test_employee_update_forbidden(mock_db, sample_achievement, sample_team):
    mock_db["test_db"]["teams"].insert_one(sample_team)
    mock_db["test_db"]["achievements"].insert_one(sample_achievement)
    event = create_event("PUT", f"/achievements/{sample_achievement['_id']}", user_id="e_999", system_role="Employee", path_parameters={"id": sample_achievement["_id"]}, body={"title": "Hacked Sales"})
    response = handler(event, None)
    assert response.get("statusCode") == 403

def test_employee_delete_allowed(mock_db, sample_achievement, sample_team):
    mock_db["test_db"]["teams"].insert_one(sample_team)
    mock_db["test_db"]["achievements"].insert_one(sample_achievement)
    event = create_event("DELETE", f"/achievements/{sample_achievement['_id']}", user_id="e_001", system_role="Employee", path_parameters={"id": sample_achievement["_id"]})
    response = handler(event, None)
    assert response.get("statusCode") == 204
