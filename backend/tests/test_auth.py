import json
import pytest
import mongomock
from unittest.mock import patch
from datetime import datetime

from teams.function import handler
from achievements.function import handler as achievements_handler

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
        with patch("achievements.function.get_db_connection", return_value=db_client):
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
    headers = {}
    if user_id:
        headers["x-user-id"] = user_id
    if system_role:
        headers["x-system-role"] = system_role

    return {
        "httpMethod": http_method,
        "path": path,
        "headers": headers,
        "requestContext": {},
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

def test_employee_get_member_allowed(mock_db, sample_team):
    """Employee who is a team member has read access."""
    mock_db["test_db"]["teams"].insert_one(sample_team)
    
    event = create_event(
        "GET", f"/teams/{sample_team['_id']}",
        user_id="e_002", system_role="Employee",
        path_parameters={"id": sample_team["_id"]}
    )
    response = handler(event, None)
    assert response.get("statusCode") == 200

def test_employee_get_non_member_forbidden(mock_db, sample_team):
    """Employee who is NOT a member of the team gets 403."""
    mock_db["test_db"]["teams"].insert_one(sample_team)

    event = create_event(
        "GET", f"/teams/{sample_team['_id']}",
        user_id="random_emp", system_role="Employee",
        path_parameters={"id": sample_team["_id"]}
    )
    response = handler(event, None)
    assert response.get("statusCode") == 403

def test_employee_list_teams_scoped(mock_db, sample_team):
    """Employee list only returns teams the employee belongs to."""
    mock_db["test_db"]["teams"].insert_one(sample_team)
    other_team = {
        "_id": "t_002", "name": "Bravo Team",
        "leader_id": "e_999", "employee_ids": ["e_999"],
    }
    mock_db["test_db"]["teams"].insert_one(other_team)

    event = create_event("GET", "/teams", user_id="e_002", system_role="Employee")
    response = handler(event, None)

    assert response.get("statusCode") == 200
    body = json.loads(response["body"])
    assert len(body) == 1
    assert body[0]["_id"] == "t_001"

def test_team_leader_put_own_team_allowed(mock_db, sample_team):
    """Team leader (dynamic) can PUT their own team."""
    mock_db["test_db"]["teams"].insert_one(sample_team)
    
    event = create_event(
        "PUT", f"/teams/{sample_team['_id']}",
        user_id="e_001", system_role="Employee",
        path_parameters={"id": sample_team["_id"]},
        body={"name": "Updated Alpha Team"}
    )
    response = handler(event, None)
    assert response.get("statusCode") == 200

def test_employee_put_not_leader_forbidden(mock_db, sample_team):
    """Employee who is a member but NOT the leader cannot PUT."""
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


# --- Team Leader achievement management ---

def test_team_leader_post_achievement_allowed(mock_db, sample_team):
    """Team leader can create an achievement for their team."""
    mock_db["test_db"]["teams"].insert_one(sample_team)

    achievement = {"_id": "a_100", "team_id": "t_001", "title": "Q1 Win", "month": "March"}
    event = create_event(
        "POST", "/achievements",
        user_id="e_001", system_role="Employee",
        body=achievement,
    )
    response = achievements_handler(event, None)
    assert response.get("statusCode") == 201


def test_non_leader_post_achievement_forbidden(mock_db, sample_team):
    """Non-leader employee cannot create an achievement."""
    mock_db["test_db"]["teams"].insert_one(sample_team)

    achievement = {"_id": "a_100", "team_id": "t_001", "title": "Q1 Win", "month": "March"}
    event = create_event(
        "POST", "/achievements",
        user_id="e_002", system_role="Employee",
        body=achievement,
    )
    response = achievements_handler(event, None)
    assert response.get("statusCode") == 403


def test_employee_get_achievement_scoped(mock_db, sample_team):
    """Employee can only see achievements for teams they belong to."""
    mock_db["test_db"]["teams"].insert_one(sample_team)
    other_team = {
        "_id": "t_002", "name": "Bravo Team",
        "leader_id": "e_999", "employee_ids": ["e_999"],
    }
    mock_db["test_db"]["teams"].insert_one(other_team)

    mock_db["test_db"]["achievements"].insert_one(
        {"_id": "a_001", "team_id": "t_001", "title": "Own", "month": "Jan"}
    )
    mock_db["test_db"]["achievements"].insert_one(
        {"_id": "a_002", "team_id": "t_002", "title": "Other", "month": "Feb"}
    )

    event = create_event(
        "GET", "/achievements",
        user_id="e_002", system_role="Employee",
    )
    response = achievements_handler(event, None)
    assert response.get("statusCode") == 200
    body = json.loads(response["body"])
    assert len(body) == 1
    assert body[0]["_id"] == "a_001"
