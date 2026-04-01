import json
import pytest
import mongomock
from unittest.mock import patch

from individuals.function import handler

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
    with patch("individuals.function.get_db_connection", return_value=db_client):
        with patch("shared.auth.get_db_connection", return_value=db_client):
            yield db_client

@pytest.fixture
def sample_individual():
    return {
        "_id": "e_001",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "system_role": "Employee",
        "region": "NAM"
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

def test_create_individual(mock_db, sample_individual):
    event = create_event("POST", "/individuals", body=sample_individual)
    response = handler(event, None)
    assert response.get("statusCode") == 201

def test_missing_fields(mock_db, sample_individual):
    del sample_individual["name"]
    event = create_event("POST", "/individuals", body=sample_individual)
    response = handler(event, None)
    assert response.get("statusCode") == 400

def test_get_individual(mock_db, sample_individual):
    mock_db["test_db"]["employees"].insert_one(sample_individual)
    event = create_event("GET", f"/individuals/{sample_individual['_id']}", path_parameters={"id": sample_individual["_id"]})
    response = handler(event, None)
    assert response.get("statusCode") == 200

def test_employee_update_self(mock_db, sample_individual):
    mock_db["test_db"]["employees"].insert_one(sample_individual)
    event = create_event("PUT", f"/individuals/{sample_individual['_id']}", user_id="e_001", system_role="Employee", path_parameters={"id": sample_individual["_id"]}, body={"name": "Jane D."})
    response = handler(event, None)
    assert response.get("statusCode") == 200

def test_employee_update_other_forbidden(mock_db, sample_individual):
    mock_db["test_db"]["employees"].insert_one(sample_individual)
    event = create_event("PUT", f"/individuals/{sample_individual['_id']}", user_id="e_999", system_role="Employee", path_parameters={"id": sample_individual["_id"]}, body={"name": "Hacked"})
    response = handler(event, None)
    assert response.get("statusCode") == 403

def test_employee_delete_self(mock_db, sample_individual):
    mock_db["test_db"]["employees"].insert_one(sample_individual)
    event = create_event("DELETE", f"/individuals/{sample_individual['_id']}", user_id="e_001", system_role="Employee", path_parameters={"id": sample_individual["_id"]})
    response = handler(event, None)
    assert response.get("statusCode") == 204
