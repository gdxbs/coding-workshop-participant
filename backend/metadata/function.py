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
        
        metadata_id: Optional[str] = path_parameters.get("id")
        RESERVED_IDS = ["teams", "individuals", "employees", "achievements", "metadata", "api"]
        if metadata_id in RESERVED_IDS:
            metadata_id = None
            
        # Fallback for V2 Function URLs
        if not metadata_id:
            raw_path = event.get("rawPath", "") or event.get("path", "")
            parts = [p for p in raw_path.split("/") if p]
            if parts:
                possible_id = parts[-1]
                if possible_id not in RESERVED_IDS:
                    metadata_id = possible_id

        client = get_db_connection()
        db_name: str = os.environ.get("MONGO_NAME", "acme_team_mgmt")
        db = client[db_name]
        collection = db.metadata

        if http_method == "POST":
            return create_metadata(collection, body_str)
        elif http_method == "GET":
            if metadata_id:
                return get_metadata(collection, metadata_id)
            else:
                return list_metadata(collection)
        elif http_method == "PUT":
            if not metadata_id:
                return build_response(400, {"error": "Missing metadata ID"})
            return update_metadata(collection, metadata_id, body_str)
        elif http_method == "DELETE":
            if not metadata_id:
                return build_response(400, {"error": "Missing metadata ID"})
            return delete_metadata(collection, metadata_id)
        else:
            return build_response(418, {
                "error": "I am a teapot (and you used an unrecognized method)",
                "method_detected": http_method,
                "event_keys": list(event.keys()),
                "request_context_keys": list(event.get("requestContext", {}).keys())
            })

    except ValueError as ve:
        return build_response(500, {"error": str(ve)})
    except PyMongoError as pe:
        return build_response(500, {"error": f"Database error: {str(pe)}"})
    except Exception as e:
        return build_response(500, {"error": "Internal server error: " + str(e)})

def create_metadata(collection: Any, body_str: str) -> Dict[str, Any]:
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return build_response(400, {"error": "Invalid JSON body"})

    if "_id" not in data:
        return build_response(400, {"error": "Missing required field: _id"})

    collection.insert_one(data)
    return build_response(201, data)

def list_metadata(collection: Any) -> Dict[str, Any]:
    cursor = collection.find({})
    return build_response(200, list(cursor))

def get_metadata(collection: Any, metadata_id: str) -> Dict[str, Any]:
    item = collection.find_one({"_id": metadata_id})
    if not item:
        return build_response(404, {"error": "Metadata not found"})
    return build_response(200, item)

def update_metadata(collection: Any, metadata_id: str, body_str: str) -> Dict[str, Any]:
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return build_response(400, {"error": "Invalid JSON body"})

    result = collection.update_one({"_id": metadata_id}, {"$set": data})
    if result.matched_count == 0:
        return build_response(404, {"error": "Metadata not found"})
        
    return build_response(200, {"message": "Metadata updated"})

def delete_metadata(collection: Any, metadata_id: str) -> Dict[str, Any]:
    result = collection.delete_one({"_id": metadata_id})
    if result.deleted_count == 0:
        return build_response(404, {"error": "Metadata not found"})
    return build_response(204)
