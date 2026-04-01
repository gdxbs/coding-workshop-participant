import json
import pytest
import mongomock
from unittest.mock import patch
from datetime import datetime

from teams.function import handler

@pytest.fixture
def mock_env(monkeypatch):
    """Setup mock environment variables."""
    monkeypatch.setenv("MONGO_NAME", "test_db")
    monkeypatch.setenv("MONGO_HOST", "localhost")
    monkeypatch.setenv("MONGO_PORT", "27017")
    monkeypatch.setenv("IS_LOCAL", "true")

@pytest.fixture
def db_client(mock_env):
    """Setup a mongomock client."""
    client = mongomock.MongoClient()
    return client

@pytest.fixture
def mock_db(db_client):
    """Patch the db_utils connection method."""
    # We patch db_utils because function and auth both call it
    with patch("teams.function.get_db_connection", return_value=db_client):
        with patch("shared.auth.get_db_connection", return_value=db_client):
            yield db_client

@pytest.fixture
def sample_team():
    return {
        "_id": "t_001",
        "name": "Alpha Team",
        "organization": "engineering",
        "region": "NAM",
        "leader_id": "e_001", # Important for ownership checks
        "employee_ids": ["e_001", "e_002"],
        "created_at": datetime.utcnow().isoformat()
    }

def create_event(http_method, path, user_id=None, system_role=None, body=None, path_parameters=None):
    authorizer = {}
    if user_id: authorizer["user_id"] = user_id
    if system_role: authorizer["system_role"] = system_role
        
    return {
        "httpMethod": http_method,
        "path": path,
        "requestContext": {
            "authorizer": authorizer
        },
        "pathParameters": path_parameters,
        "body": json.dumps(body) if body else None
    }

def test_admin_access_allowed(mock_db, sample_team):
    """Admin has full access."""
    mock_db["test_db"]["teams"].insert_one(sample_team)
    
    event = create_event(
        "DELETE", f"/teams/{sample_team['_id']}",
        user_id="admin_1", system_role="Admin",
        path_parameters={"id": sample_team["_id"]}
    )
    response = handler(event, None)
    assert response.get("statusCode") == 204

def test_employee_get_access_allowed(mock_db, sample_team):
    """Employee has read access without ownership."""
    mock_db["test_db"]["teams"].insert_one(sample_team)
    
    event = create_event(
        "GET", f"/teams/{sample_team['_id']}",
        user_id="random_emp", system_role="Employee",
        path_parameters={"id": sample_team["_id"]}
    )
    response = handler(event, None)
    assert response.get("statusCode") == 200

def test_employee_put_owner_allowed(mock_db, sample_team):
    """Employee owns this resource, PUT is allowed."""
    mock_db["test_db"]["teams"].insert_one(sample_team)
    
    event = create_event(
        "PUT", f"/teams/{sample_team['_id']}",
        user_id="e_001", system_role="Employee",
        path_parameters={"id": sample_team["_id"]},
        body={"name": "Updated Alpha Team"}
    )
    response = handler(event, None)
    assert response.get("statusCode") == 200

def test_employee_put_not_owner_forbidden(mock_db, sample_team):
    """Employee does not own this resource, PUT forbidden."""
    mock_db["test_db"]["teams"].insert_one(sample_team)
    
    event = create_event(
        "PUT", f"/teams/{sample_team['_id']}",
        user_id="e_002", system_role="Employee",
        path_parameters={"id": sample_team["_id"]},
        body={"name": "Attacked Alpha Team"}
    )
    response = handler(event, None)
    assert response.get("statusCode") == 403

def test_employee_delete_not_owner_forbidden(mock_db, sample_team):
    """Employee does not own this resource, DELETE forbidden."""
    mock_db["test_db"]["teams"].insert_one(sample_team)
    
    event = create_event(
        "DELETE", f"/teams/{sample_team['_id']}",
        user_id="e_bad", system_role="Employee",
        path_parameters={"id": sample_team["_id"]}
    )
    response = handler(event, None)
    assert response.get("statusCode") == 403

def test_employee_post_invalid_owner_forbidden(mock_db):
    """Employee trying to create a resource with leader_id not their own user_id."""
    new_team = {"_id": "new_1", "name": "New", "leader_id": "e_other"}
    event = create_event(
        "POST", "/teams",
        user_id="e_creator", system_role="Employee",
        body=new_team
    )
    response = handler(event, None)
    assert response.get("statusCode") == 403

def test_unauthorized_missing_role(mock_db):
    """Missing system_role -> 401."""
    event = create_event("GET", "/teams", user_id="e_admin") # no system_role
    response = handler(event, None)
    assert response.get("statusCode") == 401
