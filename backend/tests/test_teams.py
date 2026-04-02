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
        with patch("shared.auth.get_db_connection", return_value=db_client):
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

def create_api_event(http_method, path, path_parameters=None, body=None,
                     user_id="test_admin", system_role="Admin"):
    """Helper function to mock AWS API Gateway events."""
    return {
        "httpMethod": http_method,
        "path": path,
        "pathParameters": path_parameters,
        "headers": {
            "x-user-id": user_id,
            "x-system-role": system_role,
        },
        "requestContext": {},
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
        with patch("shared.auth.get_db_connection", side_effect=ConnectionFailure("DB Connection Failed")):
            event = create_api_event("GET", "/teams")
            response = handler(event, None)
            assert response.get("statusCode") == 500


# ==========================================
# LEADERSHIP TRANSFER TESTS
# ==========================================

def test_leadership_transfer_succeeds(mock_db, sample_team_data):
    """Leader changes leader_id to another existing employee -> 200."""
    mock_db["test_db"].teams.insert_one(sample_team_data)
    mock_db["test_db"].employees.insert_one({"_id": "e_003", "name": "New Leader", "email": "nl@test.com", "system_role": "Employee", "region": "NAM"})

    event = create_api_event(
        "PUT", f"/teams/{sample_team_data['_id']}",
        path_parameters={"id": sample_team_data["_id"]},
        body={"leader_id": "e_003"},
        user_id="e_001", system_role="Employee",
    )
    response = handler(event, None)
    assert response.get("statusCode") == 200

    # Verify DB was updated
    team = mock_db["test_db"].teams.find_one({"_id": "t_001"})
    assert team["leader_id"] == "e_003"


def test_leadership_transfer_invalid_leader(mock_db, sample_team_data):
    """Leader changes leader_id to a non-existent employee -> 400."""
    mock_db["test_db"].teams.insert_one(sample_team_data)

    event = create_api_event(
        "PUT", f"/teams/{sample_team_data['_id']}",
        path_parameters={"id": sample_team_data["_id"]},
        body={"leader_id": "e_nonexistent"},
        user_id="e_001", system_role="Employee",
    )
    response = handler(event, None)
    assert response.get("statusCode") == 400
    body = json.loads(response["body"])
    assert "existing employee" in body["error"]


def test_leadership_transfer_old_leader_forbidden(mock_db, sample_team_data):
    """After transfer, old leader PUT returns 403."""
    mock_db["test_db"].teams.insert_one(sample_team_data)
    mock_db["test_db"].employees.insert_one({"_id": "e_003", "name": "New Leader", "email": "nl@test.com", "system_role": "Employee", "region": "NAM"})

    # Step 1: Old leader transfers leadership
    transfer_event = create_api_event(
        "PUT", f"/teams/{sample_team_data['_id']}",
        path_parameters={"id": sample_team_data["_id"]},
        body={"leader_id": "e_003"},
        user_id="e_001", system_role="Employee",
    )
    response = handler(transfer_event, None)
    assert response.get("statusCode") == 200

    # Step 2: Old leader attempts to edit the team -> 403
    edit_event = create_api_event(
        "PUT", f"/teams/{sample_team_data['_id']}",
        path_parameters={"id": sample_team_data["_id"]},
        body={"name": "Old Leader Edit"},
        user_id="e_001", system_role="Employee",
    )
    response = handler(edit_event, None)
    assert response.get("statusCode") == 403


def test_leadership_transfer_new_leader_can_edit(mock_db, sample_team_data):
    """After transfer, new leader PUT succeeds."""
    mock_db["test_db"].teams.insert_one(sample_team_data)
    mock_db["test_db"].employees.insert_one({"_id": "e_003", "name": "New Leader", "email": "nl@test.com", "system_role": "Employee", "region": "NAM"})

    # Step 1: Old leader transfers
    transfer_event = create_api_event(
        "PUT", f"/teams/{sample_team_data['_id']}",
        path_parameters={"id": sample_team_data["_id"]},
        body={"leader_id": "e_003"},
        user_id="e_001", system_role="Employee",
    )
    handler(transfer_event, None)

    # Step 2: New leader edits
    edit_event = create_api_event(
        "PUT", f"/teams/{sample_team_data['_id']}",
        path_parameters={"id": sample_team_data["_id"]},
        body={"name": "New Leader Edit"},
        user_id="e_003", system_role="Employee",
    )
    response = handler(edit_event, None)
    assert response.get("statusCode") == 200


def test_employee_list_teams_scoped(mock_db, sample_team_data):
    """Employee list returns only teams the employee belongs to."""
    mock_db["test_db"].teams.insert_one(sample_team_data)
    other_team = {
        "_id": "t_002", "name": "Bravo Team",
        "leader_id": "e_999", "employee_ids": ["e_999"],
    }
    mock_db["test_db"].teams.insert_one(other_team)

    event = create_api_event(
        "GET", "/teams",
        user_id="e_002", system_role="Employee",
    )
    response = handler(event, None)
    assert response.get("statusCode") == 200
    body = json.loads(response["body"])
    assert len(body) == 1
    assert body[0]["_id"] == "t_001"


# ==========================================
# TEAM HUB AGGREGATION TESTS
# ==========================================

def test_hub_returns_aggregated_data(mock_db, sample_team_data):
    """GET /teams/{id}/hub returns team, members, achievements, metadata."""
    mock_db["test_db"].teams.insert_one(sample_team_data)
    mock_db["test_db"].employees.insert_many([
        {"_id": "e_001", "name": "Alice", "email": "a@t.com", "system_role": "Employee", "region": "NAM", "password_hash": "secret"},
        {"_id": "e_002", "name": "Bob", "email": "b@t.com", "system_role": "Employee", "region": "NAM", "password_hash": "secret2"},
        {"_id": "e_003", "name": "Charlie", "email": "c@t.com", "system_role": "Employee", "region": "NAM"},
    ])
    mock_db["test_db"].achievements.insert_many([
        {"_id": "a_001", "team_id": "t_001", "title": "Q1 Win", "month": "March"},
        {"_id": "a_002", "team_id": "t_999", "title": "Other Team", "month": "April"},
    ])
    mock_db["test_db"].metadata.insert_many([
        {"_id": "m_001", "team_id": "t_001", "key": "budget", "value": "100k"},
        {"_id": "m_002", "team_id": "t_999", "key": "budget", "value": "50k"},
    ])

    event = create_api_event(
        "GET", f"/teams/{sample_team_data['_id']}/hub",
        path_parameters={"id": sample_team_data["_id"]},
    )
    response = handler(event, None)
    assert response.get("statusCode") == 200

    body = json.loads(response["body"])
    assert body["team"]["_id"] == "t_001"
    assert len(body["members"]) == 3
    assert len(body["achievements"]) == 1
    assert body["achievements"][0]["_id"] == "a_001"
    assert len(body["metadata"]) == 1
    assert body["metadata"][0]["_id"] == "m_001"


def test_hub_excludes_password_hash(mock_db, sample_team_data):
    """Hub endpoint must not expose password_hash in member profiles."""
    mock_db["test_db"].teams.insert_one(sample_team_data)
    mock_db["test_db"].employees.insert_one(
        {"_id": "e_001", "name": "Alice", "email": "a@t.com", "password_hash": "hashed_pw"}
    )

    event = create_api_event(
        "GET", f"/teams/{sample_team_data['_id']}/hub",
        path_parameters={"id": sample_team_data["_id"]},
    )
    response = handler(event, None)
    body = json.loads(response["body"])

    for member in body["members"]:
        assert "password_hash" not in member


def test_hub_team_not_found(mock_db):
    """Hub returns 404 for a non-existent team."""
    event = create_api_event(
        "GET", "/teams/nonexistent/hub",
        path_parameters={"id": "nonexistent"},
    )
    response = handler(event, None)
    assert response.get("statusCode") == 404


def test_hub_missing_team_id(mock_db):
    """Hub returns 400 when no team ID can be extracted."""
    event = create_api_event("GET", "/teams/hub")
    response = handler(event, None)
    assert response.get("statusCode") == 400


def test_hub_employee_member_allowed(mock_db, sample_team_data):
    """Employee who is a team member can access the hub."""
    mock_db["test_db"].teams.insert_one(sample_team_data)
    mock_db["test_db"].employees.insert_one(
        {"_id": "e_002", "name": "Bob", "email": "b@t.com", "system_role": "Employee", "region": "NAM"}
    )

    event = create_api_event(
        "GET", f"/teams/{sample_team_data['_id']}/hub",
        path_parameters={"id": sample_team_data["_id"]},
        user_id="e_002", system_role="Employee",
    )
    response = handler(event, None)
    assert response.get("statusCode") == 200
    body = json.loads(response["body"])
    assert body["team"]["_id"] == "t_001"


def test_hub_employee_non_member_forbidden(mock_db, sample_team_data):
    """Employee who is NOT a team member gets 403 on hub."""
    mock_db["test_db"].teams.insert_one(sample_team_data)

    event = create_api_event(
        "GET", f"/teams/{sample_team_data['_id']}/hub",
        path_parameters={"id": sample_team_data["_id"]},
        user_id="e_outsider", system_role="Employee",
    )
    response = handler(event, None)
    assert response.get("statusCode") == 403
