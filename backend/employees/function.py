import os
import json
from typing import Dict, Any, Optional
from pymongo.errors import PyMongoError
from shared.db_utils import get_db_connection
from shared.auth import require_role_and_ownership
from shared.response import build_response

@require_role_and_ownership
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    try:
        http_method: str = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method") or event.get("method") or "").upper()
        path_parameters: Optional[Dict[str, str]] = event.get("pathParameters") or {}
        body_str: str = event.get("body", "")
        
        individual_id: Optional[str] = path_parameters.get("id")
        RESERVED_IDS = ["teams", "individuals", "employees", "achievements", "metadata", "api"]
        if individual_id in RESERVED_IDS:
            individual_id = None
            
        # Fallback for V2 Function URLs
        if not individual_id:
            raw_path = event.get("rawPath", "") or event.get("path", "")
            parts = [p for p in raw_path.split("/") if p]
            if parts:
                possible_id = parts[-1]
                if possible_id not in RESERVED_IDS:
                    individual_id = possible_id

        client = get_db_connection()
        db_name: str = os.environ.get("MONGO_NAME", "acme_team_mgmt")
        db = client[db_name]
        collection = db.employees

        if http_method == "POST":
            return create_individual(collection, body_str)
        elif http_method == "GET":
            if individual_id:
                return get_individual(collection, individual_id)
            else:
                return list_individuals(collection)
        elif http_method == "PUT":
            if not individual_id:
                return build_response(400, {"error": "Missing individual ID"})
            return update_individual(collection, individual_id, body_str)
        elif http_method == "DELETE":
            if not individual_id:
                return build_response(400, {"error": "Missing individual ID"})
            return delete_individual(collection, individual_id)
        else:
            return build_response(405, {"error": "Method Not Allowed"})

    except ValueError as ve:
        return build_response(500, {"error": str(ve)})
    except PyMongoError as pe:
        return build_response(500, {"error": f"Database error: {str(pe)}"})
    except Exception as e:
        return build_response(500, {"error": "Internal server error: " + str(e)})

def create_individual(collection: Any, body_str: str) -> Dict[str, Any]:
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return build_response(400, {"error": "Invalid JSON body"})

    required_fields = ["name", "email", "system_role", "region"]
    for field in required_fields:
        if field not in data or not data[field]:
            return build_response(400, {"error": f"Missing required field: {field}"})

    collection.insert_one(data)
    return build_response(201, data)

def list_individuals(collection: Any) -> Dict[str, Any]:
    cursor = collection.find({})
    return build_response(200, list(cursor))

def get_individual(collection: Any, individual_id: str) -> Dict[str, Any]:
    item = collection.find_one({"_id": individual_id})
    if not item:
        return build_response(404, {"error": "Individual not found"})
    return build_response(200, item)

def update_individual(collection: Any, individual_id: str, body_str: str) -> Dict[str, Any]:
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return build_response(400, {"error": "Invalid JSON body"})

    result = collection.update_one({"_id": individual_id}, {"$set": data})
    if result.matched_count == 0:
        return build_response(404, {"error": "Individual not found"})
        
    return build_response(200, {"message": "Individual updated"})

def delete_individual(collection: Any, individual_id: str) -> Dict[str, Any]:
    result = collection.delete_one({"_id": individual_id})
    if result.deleted_count == 0:
        return build_response(404, {"error": "Individual not found"})
    return build_response(204)
