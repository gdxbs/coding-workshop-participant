import json
import pytest
import mongomock
from unittest.mock import patch

from metadata.function import handler

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
    with patch("metadata.function.get_db_connection", return_value=db_client):
        with patch("shared.auth.get_db_connection", return_value=db_client):
            yield db_client

@pytest.fixture
def sample_metadata():
    return {
        "_id": "regions",
        "values": ["NAM", "APAC", "EMEA", "LATAM"]
    }

def create_event(http_method, path, user_id="test_admin", system_role="Admin", body=None, path_parameters=None):
    return {
        "httpMethod": http_method,
        "path": path,
        "headers": {
            "x-user-id": user_id,
            "x-system-role": system_role,
        },
        "requestContext": {},
        "pathParameters": path_parameters,
        "body": json.dumps(body) if body else None
    }

def test_admin_create(mock_db, sample_metadata):
    event = create_event("POST", "/metadata", body=sample_metadata)
    response = handler(event, None)
    assert response.get("statusCode") == 201

def test_employee_create_forbidden(mock_db, sample_metadata):
    event = create_event("POST", "/metadata", user_id="e_001", system_role="Employee", body=sample_metadata)
    response = handler(event, None)
    assert response.get("statusCode") == 403

def test_employee_get_allowed(mock_db, sample_metadata):
    mock_db["test_db"]["metadata"].insert_one(sample_metadata)
    event = create_event("GET", f"/metadata/{sample_metadata['_id']}", user_id="e_001", system_role="Employee", path_parameters={"id": sample_metadata["_id"]})
    response = handler(event, None)
    assert response.get("statusCode") == 200

def test_employee_update_forbidden(mock_db, sample_metadata):
    mock_db["test_db"]["metadata"].insert_one(sample_metadata)
    event = create_event("PUT", f"/metadata/{sample_metadata['_id']}", user_id="e_001", system_role="Employee", path_parameters={"id": sample_metadata["_id"]}, body={"values": []})
    response = handler(event, None)
    assert response.get("statusCode") == 403

def test_employee_delete_forbidden(mock_db, sample_metadata):
    mock_db["test_db"]["metadata"].insert_one(sample_metadata)
    event = create_event("DELETE", f"/metadata/{sample_metadata['_id']}", user_id="e_001", system_role="Employee", path_parameters={"id": sample_metadata["_id"]})
    response = handler(event, None)
    assert response.get("statusCode") == 403
