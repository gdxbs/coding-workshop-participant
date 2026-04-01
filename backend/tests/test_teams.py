import json
import pytest
import mongomock
from unittest.mock import patch
from datetime import datetime
from pymongo.errors import ConnectionFailure

# Assuming the main app handler is located here based on TDD expectations
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
    """Patch the db_utils connection method to return the mongomock client."""
    with patch("teams.function.get_db_connection", return_value=db_client):
        yield db_client

@pytest.fixture
def sample_team_data():
    """Mock payload data with required fields."""
    return {
        "_id": "t_001",
        "name": "Test Alpha Team",
        "organization": "credit cards",
        "region": "NAM",
        "leader_id": "e_001",
        "employee_ids": ["e_001", "e_002", "e_003"],
        "created_at": datetime.utcnow().isoformat()
    }

def create_api_event(http_method, path, path_parameters=None, body=None):
    """Helper function to mock AWS API Gateway events."""
    return {
        "httpMethod": http_method,
        "path": path,
        "pathParameters": path_parameters,
        "requestContext": {
            "authorizer": {
                "user_id": "test_admin",
                "system_role": "Admin"
            }
        },
        "body": json.dumps(body) if body else None
    }

# ==========================================
# TEST CASES
# ==========================================

def test_create_valid_team(mock_db, sample_team_data):
    """1. Test creating a valid team successfully (POST /teams -> Returns 201)."""
    event = create_api_event("POST", "/teams", body=sample_team_data)
    
    response = handler(event, None)
    
    assert response.get("statusCode") == 201
    
    # Verify the Database was correctly populated
    db = mock_db["test_db"]
    team_in_db = db.teams.find_one({"_id": sample_team_data["_id"]})
    assert team_in_db is not None
    assert team_in_db["name"] == sample_team_data["name"]

def test_retrieve_list_of_teams(mock_db, sample_team_data):
    """2. Test retrieving a list of teams (GET /teams -> Returns 200)."""
    # Pre-populate Mock DB
    mock_db["test_db"].teams.insert_one(sample_team_data)
    
    event = create_api_event("GET", "/teams")
    response = handler(event, None)
    
    assert response.get("statusCode") == 200
    
    # Verify response structure and size
    body = json.loads(response.get("body", "[]"))
    assert len(body) >= 1
    assert body[0]["_id"] == sample_team_data["_id"]

def test_retrieve_team_by_id(mock_db, sample_team_data):
    """3. Test retrieving a specific team by a valid ID (GET /teams/{id} -> Returns 200)."""
    # Pre-populate Mock DB
    mock_db["test_db"].teams.insert_one(sample_team_data)
    
    event = create_api_event(
        "GET", 
        f"/teams/{sample_team_data['_id']}", 
        path_parameters={"id": sample_team_data["_id"]}
    )
    response = handler(event, None)
    
    assert response.get("statusCode") == 200
    
    # Verify response body exactly matches our expected _id
    body = json.loads(response.get("body", "{}"))
    assert body["_id"] == sample_team_data["_id"]

def test_update_team(mock_db, sample_team_data):
    """4. Test updating a team successfully (PUT /teams/{id} -> Returns 200)."""
    mock_db["test_db"].teams.insert_one(sample_team_data)
    
    # Only changing the "name" property for testing the update
    event = create_api_event(
        "PUT", 
        f"/teams/{sample_team_data['_id']}", 
        path_parameters={"id": sample_team_data["_id"]},
        body={"name": "Updated Alpha Team"}
    )
    
    response = handler(event, None)
    
    assert response.get("statusCode") == 200
    
    # Verify the database directly to ensure mutation happened
    team_in_db = mock_db["test_db"].teams.find_one({"_id": sample_team_data["_id"]})
    assert team_in_db["name"] == "Updated Alpha Team"

def test_delete_team(mock_db, sample_team_data):
    """5. Test deleting a team successfully (DELETE /teams/{id} -> Returns 204)."""
    mock_db["test_db"].teams.insert_one(sample_team_data)
    
    event = create_api_event(
        "DELETE", 
        f"/teams/{sample_team_data['_id']}", 
        path_parameters={"id": sample_team_data["_id"]}
    )
    
    response = handler(event, None)
    
    assert response.get("statusCode") == 204
    
    # Verify the item has fully been dropped locally from Mock DB
    team_in_db = mock_db["test_db"].teams.find_one({"_id": sample_team_data["_id"]})
    assert team_in_db is None

def test_create_team_exceeds_max_employees(mock_db, sample_team_data):
    """6. Validation test ensuring employee_ids cannot contain more than 5 employees."""
    sample_team_data["employee_ids"] = ["e_001", "e_002", "e_003", "e_004", "e_005", "e_006"]
    
    event = create_api_event("POST", "/teams", body=sample_team_data)
    
    response = handler(event, None)
    
    # Expecting Bad Request (since requirements clearly stated the max rule)
    assert response.get("statusCode") == 400
    
    # Ensure team correctly failed to insert to Mock DB due to bad inputs
    team_in_db = mock_db["test_db"].teams.find_one({"_id": sample_team_data["_id"]})
    assert team_in_db is None


def test_create_team_missing_fields(mock_db, sample_team_data):
    """7. Test creating a team with missing required fields (POST /teams -> Returns 400)."""
    del sample_team_data["name"]
    event = create_api_event("POST", "/teams", body=sample_team_data)
    response = handler(event, None)
    assert response.get("statusCode") == 400

def test_get_non_existent_team(mock_db):
    """8. Test GET non-existent team."""
    event = create_api_event("GET", "/teams/invalid_id", path_parameters={"id": "invalid_id"})
    response = handler(event, None)
    assert response.get("statusCode") == 404

def test_put_non_existent_team(mock_db):
    """9. Test PUT non-existent team."""
    event = create_api_event("PUT", "/teams/invalid_id", path_parameters={"id": "invalid_id"}, body={"name": "New Name"})
    response = handler(event, None)
    assert response.get("statusCode") == 404

def test_delete_non_existent_team(mock_db):
    """10. Test DELETE non-existent team."""
    event = create_api_event("DELETE", "/teams/invalid_id", path_parameters={"id": "invalid_id"})
    response = handler(event, None)
    assert response.get("statusCode") == 404

def test_db_connection_exception():
    """11. Test database connection exception."""
    with patch("teams.function.get_db_connection", side_effect=ConnectionFailure("DB Connection Failed")):
        event = create_api_event("GET", "/teams")
        response = handler(event, None)
        assert response.get("statusCode") == 500
