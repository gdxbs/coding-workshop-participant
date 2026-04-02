import os
import json
from functools import wraps
from typing import Dict, Any, Callable, List, Optional, Tuple

import jwt

from shared.db_utils import get_db_connection
from shared.response import build_auth_response

# Must match the secret used in backend/auth/function.py
JWT_SECRET: str = os.environ.get("JWT_SECRET", "change-me-to-a-real-secret")
JWT_ALGORITHM: str = "HS256"

RESERVED_SEGMENTS = {"teams", "individuals", "employees", "achievements", "metadata", "api", "hub"}


def _extract_http_method(event: Dict[str, Any]) -> str:
    """Return the upper-cased HTTP method from the event."""
    return (
        event.get("httpMethod")
        or event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("method")
        or ""
    ).upper()


def _extract_path(event: Dict[str, Any]) -> str:
    """Return the request path from the event."""
    return event.get("path") or event.get("rawPath", "")


def _extract_entity_id(event: Dict[str, Any]) -> Optional[str]:
    """Extract the resource ID from path parameters or the raw path."""
    path_parameters: Dict[str, str] = event.get("pathParameters") or {}
    entity_id: Optional[str] = path_parameters.get("id")

    if entity_id and entity_id not in RESERVED_SEGMENTS:
        return entity_id

    raw_path = event.get("rawPath", "") or event.get("path", "")
    parts = [p for p in raw_path.split("/") if p]
    for candidate in reversed(parts):
        if candidate not in RESERVED_SEGMENTS:
            return candidate
    return None


def _parse_body(event: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """Parse the JSON body. Returns (data, error_response)."""
    body_str: str = event.get("body", "") or ""
    try:
        data = json.loads(body_str) if body_str else {}
        return data, None
    except json.JSONDecodeError:
        return None, build_auth_response(400, "Invalid JSON body")


def _get_user_team_ids(db: Any, user_id: str) -> List[str]:
    """Return list of team _ids where the user is a member or leader."""
    cursor = db.teams.find(
        {"$or": [{"leader_id": user_id}, {"employee_ids": user_id}]},
        {"_id": 1},
    )
    return [t["_id"] for t in cursor]


def _is_team_member(db: Any, user_id: str, team_id: str) -> bool:
    """Check whether the user is a member or leader of a specific team."""
    team = db.teams.find_one({"_id": team_id})
    if not team:
        return False
    return user_id == team.get("leader_id") or user_id in team.get("employee_ids", [])


def decode_token(event: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """Extract and decode the Bearer JWT from the Authorization header.

    Returns:
        (claims_dict, None) on success.
        (None, error_response) on failure.
    """
    headers_raw: Dict[str, str] = event.get("headers") or {}
    headers = {k.lower(): v for k, v in headers_raw.items()} if headers_raw else {}

    auth_header: str = headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, build_auth_response(401, "Unauthorized: Missing or invalid Authorization header")

    token: str = auth_header[7:]
    try:
        claims: Dict[str, Any] = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return claims, None
    except jwt.ExpiredSignatureError:
        return None, build_auth_response(401, "Unauthorized: Token has expired")
    except jwt.InvalidTokenError:
        return None, build_auth_response(401, "Unauthorized: Invalid token")


def require_role_and_ownership(handler_func: Callable) -> Callable:
    """Decorator that enforces JWT authentication and three-tier RBAC.

    Roles:
        - **Admin**: Global access to all endpoints and methods.
        - **Team Leader** (dynamic): An Employee whose ``_id`` matches
          ``team.leader_id`` for the resource being accessed.  Grants
          write access (POST/PUT/DELETE) to that team and its
          achievements/metadata.
        - **Employee**: Read-only access scoped to teams the employee
          belongs to (as leader or member via ``employee_ids``).  No
          write privileges unless the employee is the Team Leader of the
          target resource.
        - Metadata writes are reserved for Admin only.
    """
    @wraps(handler_func)
    def wrapper(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
        # --- 1. Authenticate via JWT ---
        claims, err = decode_token(event)
        if err:
            # Fall back to legacy header-based auth so existing infra keeps working
            headers_raw = event.get("headers") or {}
            headers = {k.lower(): v for k, v in headers_raw.items()} if headers_raw else {}
            user_id = headers.get("x-user-id")
            system_role = headers.get("x-system-role")
            if not user_id or not system_role:
                return err
            claims = {"sub": user_id, "system_role": system_role}

        user_id: str = claims.get("sub", "")
        system_role: str = claims.get("system_role", "")

        if not system_role:
            return build_auth_response(401, "Unauthorized: Missing system_role in token")

        # Inject auth context so downstream handlers can use it
        event["auth_context"] = {"user_id": user_id, "system_role": system_role}

        # --- 2. Admin -> full access ---
        if system_role == "Admin":
            return handler_func(event, context)

        # --- 3. Employee / Team Leader (dynamic) rules ---
        if system_role == "Employee":
            http_method = _extract_http_method(event)
            path = _extract_path(event)

            try:
                client = get_db_connection()
                db_name = os.environ.get("MONGO_NAME", "acme_team_mgmt")
                db = client[db_name]
            except Exception as e:
                return build_auth_response(
                    500,
                    f"Authentication Error: Database connection failed. Details: {str(e)}",
                )

            # --- GET (scoped reads) ---
            if http_method == "GET":
                if "/teams" in path:
                    entity_id = _extract_entity_id(event)
                    if entity_id:
                        # Single team – must be a member
                        if not _is_team_member(db, user_id, entity_id):
                            return build_auth_response(
                                403, "Access Denied: You are not a member of this team"
                            )
                    else:
                        # List – attach user's team IDs for handler filtering
                        event["auth_context"]["team_ids"] = _get_user_team_ids(db, user_id)

                elif "/achievements" in path:
                    entity_id = _extract_entity_id(event)
                    if entity_id:
                        achievement = db.achievements.find_one({"_id": entity_id})
                        if achievement and not _is_team_member(
                            db, user_id, achievement.get("team_id", "")
                        ):
                            return build_auth_response(
                                403, "Access Denied: You are not a member of the associated team"
                            )
                    else:
                        event["auth_context"]["team_ids"] = _get_user_team_ids(db, user_id)

                # /employees and /metadata remain globally readable
                return handler_func(event, context)

            # --- WRITE (POST / PUT / DELETE) ---
            if http_method in ("POST", "PUT", "DELETE"):

                # --- POST ---
                if http_method == "POST":
                    data, parse_err = _parse_body(event)
                    if parse_err:
                        return parse_err

                    if "/teams" in path:
                        if data.get("leader_id") != user_id:
                            return build_auth_response(
                                403, "Access Denied: Employee cannot create a team for another leader"
                            )
                    elif "/individuals" in path or "/employees" in path:
                        if data.get("_id") != user_id:
                            return build_auth_response(
                                403, "Access Denied: Employee cannot create a profile for another user"
                            )
                    elif "/achievements" in path:
                        team_id = data.get("team_id")
                        if not team_id:
                            return build_auth_response(400, "Missing team_id in achievement payload")
                        team = db.teams.find_one({"_id": team_id})
                        if not team or team.get("leader_id") != user_id:
                            return build_auth_response(
                                403, "Access Denied: You are not the leader of this team"
                            )
                    elif "/metadata" in path:
                        return build_auth_response(403, "Access Denied: Only Admin can modify metadata")

                # --- PUT / DELETE ---
                elif http_method in ("PUT", "DELETE"):
                    entity_id = _extract_entity_id(event)
                    if not entity_id:
                        return build_auth_response(400, "Missing entity ID")

                    if "/teams" in path:
                        team = db.teams.find_one({"_id": entity_id})
                        if not team or team.get("leader_id") != user_id:
                            return build_auth_response(
                                403, "Access Denied: You do not own this resource"
                            )
                    elif "/individuals" in path or "/employees" in path:
                        if entity_id != user_id:
                            return build_auth_response(
                                403, "Access Denied: You can only edit your own profile"
                            )
                    elif "/achievements" in path:
                        achievement = db.achievements.find_one({"_id": entity_id})
                        if achievement:
                            team = db.teams.find_one({"_id": achievement.get("team_id")})
                            if not team or team.get("leader_id") != user_id:
                                return build_auth_response(
                                    403,
                                    "Access Denied: You are not the leader of the associated team",
                                )
                    elif "/metadata" in path:
                        return build_auth_response(403, "Access Denied: Only Admin can modify metadata")

            return handler_func(event, context)

        return build_auth_response(403, "Access Denied: Unrecognized role")

    return wrapper