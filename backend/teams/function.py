"""
AWS Lambda handler for the Teams service.
Provides RESTful endpoints to perform CRUD operations on teams.
"""
import os
import json
from typing import Dict, Any, Optional, Tuple

from pymongo.errors import PyMongoError

from shared.db_utils import get_db_connection
from shared.auth import require_role_and_ownership
from shared.response import build_response


@require_role_and_ownership
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler function. Parases the API Gateway event to route
    to the appropriate CRUD operation based on HTTP method and path.

    Args:
        event (Dict[str, Any]): The API Gateway event payload.
        context (Any): The Lambda execution context.

    Returns:
        Dict[str, Any]: AWS API Gateway formatted response.
    """
    try:
        http_method: str = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method") or event.get("method") or "").upper()
        path_parameters: Optional[Dict[str, str]] = event.get("pathParameters") or {}
        body: str = event.get("body", "")
        
        team_id: Optional[str] = path_parameters.get("id")
        RESERVED_IDS = ["teams", "individuals", "employees", "achievements", "metadata", "api"]
        if team_id in RESERVED_IDS:
            team_id = None
        
        # Fallback for V2 Function URLs
        if not team_id:
            raw_path = event.get("rawPath", "") or event.get("path", "")
            parts = [p for p in raw_path.split("/") if p]
            if parts:
                possible_id = parts[-1]
                if possible_id not in RESERVED_IDS:
                    team_id = possible_id

        client = get_db_connection()
        db_name: str = os.environ.get("MONGO_NAME", "acme_team_mgmt")
        db = client[db_name]
        collection = db.teams

        if http_method == "POST":
            return create_team(collection, body)
        elif http_method == "GET":
            if team_id:
                return get_team(collection, team_id)
            else:
                return list_teams(collection)
        elif http_method == "PUT":
            if not team_id:
                return build_response(400, {"error": "Missing team ID"})
            return update_team(collection, team_id, body)
        elif http_method == "DELETE":
            if not team_id:
                return build_response(400, {"error": "Missing team ID"})
            return delete_team(collection, team_id)
        else:
            return build_response(405, {"error": "Method Not Allowed"})

    except ValueError as ve:
        # Typically environment variable errors or similar
        return build_response(500, {"error": str(ve)})
    except PyMongoError as pe:
        return build_response(500, {"error": f"Database error: {str(pe)}"})
    except Exception as e:
        return build_response(500, {"error": "Internal server error: " + str(e)})


def create_team(collection: Any, body_str: str) -> Dict[str, Any]:
    """
    Creates a new team in the database.

    Args:
        collection (Any): The database collection.
        body_str (str): JSON string containing team data.

    Returns:
        Dict[str, Any]: HTTP Response indicating success or failure.
    """
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return build_response(400, {"error": "Invalid JSON body"})

    if "name" not in data or not data["name"]:
        return build_response(400, {"error": "Missing required field: name"})

    existing = collection.find_one({"name": data["name"]})
    if existing:
        return build_response(409, {"error": f"A team with the name '{data['name']}' already exists"})

    employee_ids = data.get("employee_ids", [])
    if len(employee_ids) > 5:
        return build_response(400, {"error": "A team can have a maximum of 5 employees."})

    # Optional: explicitly ensure _id gets populated by Mongo or custom ID if passed
    if "_id" not in data:
        pass # Let mongo create it or assume caller provides it, tests provide `_id="t_001"`

    collection.insert_one(data)
    
    # Return the inserted data
    return build_response(201, data)


def list_teams(collection: Any) -> Dict[str, Any]:
    """
    Retrieves all teams from the database.

    Args:
        collection (Any): The database collection.

    Returns:
        Dict[str, Any]: HTTP Response containing list of teams.
    """
    teams_cursor = collection.find({})
    teams_list = list(teams_cursor)
    return build_response(200, teams_list)


def get_team(collection: Any, team_id: str) -> Dict[str, Any]:
    """
    Retrieves a specific team by ID.

    Args:
        collection (Any): The database collection.
        team_id (str): The unique identifier of the team.

    Returns:
        Dict[str, Any]: HTTP Response containing the team data or 404.
    """
    team = collection.find_one({"_id": team_id})
    if not team:
        return build_response(404, {"error": "Team not found"})
    return build_response(200, team)


def update_team(collection: Any, team_id: str, body_str: str) -> Dict[str, Any]:
    """
    Updates an existing team.

    Args:
        collection (Any): The database collection.
        team_id (str): The unique identifier of the team.
        body_str (str): JSON string containing updated properties.

    Returns:
        Dict[str, Any]: HTTP Response indicating success or failure.
    """
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return build_response(400, {"error": "Invalid JSON body"})

    employee_ids = data.get("employee_ids")
    if employee_ids is not None and len(employee_ids) > 5:
        return build_response(400, {"error": "A team can have a maximum of 5 employees."})

    # Perform the update
    result = collection.update_one({"_id": team_id}, {"$set": data})
    
    if result.matched_count == 0:
        return build_response(404, {"error": "Team not found"})
        
    return build_response(200, {"message": "Team updated"})


def delete_team(collection: Any, team_id: str) -> Dict[str, Any]:
    """
    Deletes a specific team by ID.

    Args:
        collection (Any): The database collection.
        team_id (str): The unique identifier of the team.

    Returns:
        Dict[str, Any]: HTTP Response indicating success (204).
    """
    result = collection.delete_one({"_id": team_id})
    if result.deleted_count == 0:
        return build_response(404, {"error": "Team not found"})
    
    return build_response(204)
