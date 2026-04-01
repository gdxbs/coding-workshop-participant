import os
import json
from typing import Dict, Any, Optional
from pymongo.errors import PyMongoError
from shared.db_utils import get_db_connection
from shared.auth import require_role_and_ownership

def build_response(status_code: int, body: Any = None) -> Dict[str, Any]:
    response: Dict[str, Any] = {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    }
    if body is not None:
        response["body"] = json.dumps(body)
    return response

@require_role_and_ownership
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        http_method: str = event.get("httpMethod", "")
        path_parameters: Optional[Dict[str, str]] = event.get("pathParameters") or {}
        body_str: str = event.get("body", "")
        
        achievement_id: Optional[str] = path_parameters.get("id")

        client = get_db_connection()
        db_name: str = os.environ.get("MONGO_NAME", "acme_team_mgmt")
        db = client[db_name]
        collection = db.achievements

        if http_method == "POST":
            return create_achievement(collection, body_str)
        elif http_method == "GET":
            if achievement_id:
                return get_achievement(collection, achievement_id)
            else:
                return list_achievements(collection)
        elif http_method == "PUT":
            if not achievement_id:
                return build_response(400, {"error": "Missing achievement ID"})
            return update_achievement(collection, achievement_id, body_str)
        elif http_method == "DELETE":
            if not achievement_id:
                return build_response(400, {"error": "Missing achievement ID"})
            return delete_achievement(collection, achievement_id)
        else:
            return build_response(405, {"error": "Method Not Allowed"})

    except ValueError as ve:
        return build_response(500, {"error": str(ve)})
    except PyMongoError as pe:
        return build_response(500, {"error": f"Database error: {str(pe)}"})
    except Exception as e:
        return build_response(500, {"error": "Internal server error: " + str(e)})

def create_achievement(collection: Any, body_str: str) -> Dict[str, Any]:
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return build_response(400, {"error": "Invalid JSON body"})

    required_fields = ["team_id", "title", "month"]
    for field in required_fields:
        if field not in data or not data[field]:
            return build_response(400, {"error": f"Missing required field: {field}"})

    collection.insert_one(data)
    return build_response(201, data)

def list_achievements(collection: Any) -> Dict[str, Any]:
    cursor = collection.find({})
    return build_response(200, list(cursor))

def get_achievement(collection: Any, achievement_id: str) -> Dict[str, Any]:
    item = collection.find_one({"_id": achievement_id})
    if not item:
        return build_response(404, {"error": "Achievement not found"})
    return build_response(200, item)

def update_achievement(collection: Any, achievement_id: str, body_str: str) -> Dict[str, Any]:
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return build_response(400, {"error": "Invalid JSON body"})

    result = collection.update_one({"_id": achievement_id}, {"$set": data})
    if result.matched_count == 0:
        return build_response(404, {"error": "Achievement not found"})
        
    return build_response(200, {"message": "Achievement updated"})

def delete_achievement(collection: Any, achievement_id: str) -> Dict[str, Any]:
    result = collection.delete_one({"_id": achievement_id})
    if result.deleted_count == 0:
        return build_response(404, {"error": "Achievement not found"})
    return build_response(204)
