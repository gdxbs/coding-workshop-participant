import json
import os
import pytest
from datetime import datetime

from teams.function import handler
from shared.db_utils import get_db_connection

def create_api_event(http_method, path, path_parameters=None, body=None):
    """Helper function to mock AWS API Gateway events."""
    return {
        "httpMethod": http_method,
        "path": path,
        "pathParameters": path_parameters,
        "headers": {
            "x-user-id": "integration_admin",
            "x-system-role": "Admin",
        },
        "requestContext": {},
        "body": json.dumps(body) if body else None
    }

@pytest.fixture(scope="module", autouse=True)
def live_env():
    """Ensure environment variables are set for the integration test."""
    original_is_local = os.environ.get("IS_LOCAL")
    original_host = os.environ.get("MONGO_HOST")
    original_port = os.environ.get("MONGO_PORT")
    original_name = os.environ.get("MONGO_NAME")
    
    os.environ["IS_LOCAL"] = "true"
    os.environ["MONGO_HOST"] = "localhost"
    os.environ["MONGO_PORT"] = "27017"
    os.environ["MONGO_NAME"] = "acme_team_mgmt"
    
    yield
    
    if original_is_local is not None:
        os.environ["IS_LOCAL"] = original_is_local
    else:
        os.environ.pop("IS_LOCAL", None)
        
    if original_host is not None:
        os.environ["MONGO_HOST"] = original_host
    else:
        os.environ.pop("MONGO_HOST", None)

    if original_port is not None:
        os.environ["MONGO_PORT"] = original_port
    else:
        os.environ.pop("MONGO_PORT", None)

    if original_name is not None:
        os.environ["MONGO_NAME"] = original_name
    else:
        os.environ.pop("MONGO_NAME", None)

@pytest.fixture
def managed_test_team(live_env):
    """Setup and teardown a specific test document to not pollute the DB."""
    # Prefix with test_integration_ to explicitly track test artifacts
    test_team_id = f"test_integration_{int(datetime.utcnow().timestamp())}"
    db_name = os.environ.get("MONGO_NAME", "acme_team_mgmt")
    
    yield test_team_id
    
    # Teardown: ensure the test team is safely deleted from the actual database
    try:
        client = get_db_connection()
        db = client[db_name]
        db.teams.delete_one({"_id": test_team_id})
        client.close()
    except Exception as e:
        print(f"Failed to clean up test team {test_team_id}: {e}")

def test_team_lifecycle_integration(managed_test_team):
    """
    Test a full lifecycle of a Team directly against the live database:
    1. Create a Team (POST)
    2. Retrieve the Team (GET)
    3. Update the Team (PUT)
    4. Delete the Team (DELETE)
    5. Verify deletion (GET returns 404)
    """
    test_team_id = managed_test_team
    
    team_data = {
        "_id": test_team_id,
        "name": "Live Integration Test Team",
        "organization": "Integration Org",
        "region": "WW",
        "leader_id": "test_leader_int",
        "employee_ids": ["emp_int_1", "emp_int_2"]
    }

    # 1. Create a Team (POST)
    post_event = create_api_event("POST", "/teams", body=team_data)
    post_response = handler(post_event, None)
    
    assert post_response.get("statusCode") == 201, f"POST failed: {post_response}"
    body = json.loads(post_response.get("body", "{}"))
    assert body["_id"] == test_team_id

    # 2. Retrieve the Team (GET)
    get_event = create_api_event("GET", f"/teams/{test_team_id}", path_parameters={"id": test_team_id})
    get_response = handler(get_event, None)
    
    assert get_response.get("statusCode") == 200, f"GET failed: {get_response}"
    get_body = json.loads(get_response.get("body", "{}"))
    assert get_body["name"] == "Live Integration Test Team"

    # 3. Update the Team (PUT)
    update_data = {
        "name": "Live Integration Test Team - Updated"
    }
    put_event = create_api_event("PUT", f"/teams/{test_team_id}", path_parameters={"id": test_team_id}, body=update_data)
    put_response = handler(put_event, None)
    
    assert put_response.get("statusCode") == 200, f"PUT failed: {put_response}"

    # Secondary GET to confirm the update actually persisted
    get_update_response = handler(get_event, None)
    assert get_update_response.get("statusCode") == 200
    updated_body = json.loads(get_update_response.get("body", "{}"))
    assert updated_body["name"] == "Live Integration Test Team - Updated"

    # 4. Delete the Team (DELETE)
    delete_event = create_api_event("DELETE", f"/teams/{test_team_id}", path_parameters={"id": test_team_id})
    delete_response = handler(delete_event, None)
    
    assert delete_response.get("statusCode") == 204, f"DELETE failed: {delete_response}"

    # 5. Verify deletion (GET returns 404)
    get_deleted_response = handler(get_event, None)
    assert get_deleted_response.get("statusCode") == 404, f"Expected 404: {get_deleted_response}"
