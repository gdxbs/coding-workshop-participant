import os
import json
from functools import wraps
from typing import Dict, Any, Callable
from shared.db_utils import get_db_connection

def build_auth_response(status_code: int, message: str) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({"error": message})
    }

def require_role_and_ownership(handler_func: Callable) -> Callable:
    """
    Decorator to enforce complex RBAC rules across multiple services.
    Admin -> Full access.
    Employee -> Read-only, plus conditional write access:
        - teams (leader_id == user_id)
        - individuals (_id == user_id)
        - achievements (parent team leader_id == user_id)
        - metadata (read-only)
    """
    @wraps(handler_func)
    def wrapper(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        request_context = event.get("requestContext", {})
        authorizer = request_context.get("authorizer", {})
        
        user_id = authorizer.get("user_id")
        system_role = authorizer.get("system_role")
        
        if not system_role:
            return build_auth_response(401, "Unauthorized: Missing system_role")
            
        if system_role == "Admin":
            return handler_func(event, context)
            
        if system_role == "Employee":
            http_method = event.get("httpMethod", "")
            path = event.get("path", "")
            
            # GET is always allowed for employees across all datasets.
            if http_method == "GET":
                return handler_func(event, context)
                
            if http_method in ["POST", "PUT", "DELETE"]:
                try:
                    client = get_db_connection()
                    db_name = os.environ.get("MONGO_NAME", "acme_team_mgmt")
                    db = client[db_name]
                except Exception as e:
                    return build_auth_response(500, f"Error building db connection in auth: {str(e)}")

                if http_method == "POST":
                    body_str = event.get("body", "")
                    try:
                        data = json.loads(body_str) if body_str else {}
                    except json.JSONDecodeError:
                        return build_auth_response(400, "Invalid JSON body")
                        
                    if "/teams" in path:
                        if data.get("leader_id") != user_id:
                            return build_auth_response(403, "Forbidden: Employee cannot create a team for another leader")
                    elif "/individuals" in path:
                        if data.get("_id") != user_id:
                            return build_auth_response(403, "Forbidden: Employee cannot create an individual profile for another user")
                    elif "/achievements" in path:
                        team_id = data.get("team_id")
                        if not team_id:
                            return build_auth_response(400, "Missing team_id in achievement payload")
                        team = db.teams.find_one({"_id": team_id})
                        if not team or team.get("leader_id") != user_id:
                            return build_auth_response(403, "Forbidden: You are not the leader of this parent team")
                    elif "/metadata" in path:
                        return build_auth_response(403, "Forbidden: Only Admin can modify metadata")
                        
                elif http_method in ["PUT", "DELETE"]:
                    path_parameters = event.get("pathParameters") or {}
                    entity_id = path_parameters.get("id")
                    
                    if not entity_id:
                        return build_auth_response(400, "Missing entity ID")
                        
                    if "/teams" in path:
                        collection_name = "teams"
                    elif "/individuals" in path:
                        collection_name = "employees"
                    elif "/achievements" in path:
                        collection_name = "achievements"
                    elif "/metadata" in path:
                        collection_name = "metadata"
                    else:
                        return build_auth_response(400, "Unknown resource path for authorization")
                        
                    try:
                        item = db[collection_name].find_one({"_id": entity_id})
                        if item:
                            if collection_name == "teams" and item.get("leader_id") != user_id:
                                return build_auth_response(403, "Forbidden: You do not own this resource")
                            elif collection_name == "employees" and item.get("_id") != user_id:
                                return build_auth_response(403, "Forbidden: You can only edit your own profile")
                            elif collection_name == "achievements":
                                team = db.teams.find_one({"_id": item.get("team_id")})
                                if not team or team.get("leader_id") != user_id:
                                    return build_auth_response(403, "Forbidden: You are not the leader of the associated team")
                            elif collection_name == "metadata":
                                return build_auth_response(403, "Forbidden: Only Admin can modify metadata")
                    except Exception as e:
                        return build_auth_response(500, f"Error during authorization db check: {str(e)}")
                        
            return handler_func(event, context)
            
        return build_auth_response(403, "Forbidden: Unrecognized role")

    return wrapper
