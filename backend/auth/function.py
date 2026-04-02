import os
import json
import datetime
from typing import Dict, Any

import jwt
from werkzeug.security import check_password_hash
from pymongo.errors import PyMongoError

from shared.db_utils import get_db_connection
from shared.response import build_response

# Secret used to sign JWTs. In production this should come from a secrets manager.
JWT_SECRET: str = os.environ.get("JWT_SECRET", "change-me-to-a-real-secret")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRATION_HOURS: int = 1


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda entry-point for the auth service.

    Supported routes:
        POST /api/auth/login  – authenticate with email + password
        GET  /api/auth/me     – return the current user from a valid JWT
    """
    try:
        http_method: str = (
            event.get("httpMethod")
            or event.get("requestContext", {}).get("http", {}).get("method")
            or event.get("method")
            or ""
        ).upper()

        raw_path: str = event.get("rawPath", "") or event.get("path", "")

        if http_method == "POST" and raw_path.rstrip("/").endswith("/login"):
            return _handle_login(event)

        if http_method == "GET" and raw_path.rstrip("/").endswith("/me"):
            return _handle_me(event)

        return build_response(405, {"error": "Method Not Allowed"})

    except PyMongoError as pe:
        return build_response(500, {"error": f"Database error: {str(pe)}"})
    except Exception as e:
        return build_response(500, {"error": f"Internal server error: {str(e)}"})


# ---------- POST /api/auth/login ----------


def _handle_login(event: Dict[str, Any]) -> Dict[str, Any]:
    """Validate credentials and return a signed JWT + sanitised user object."""
    body_str: str = event.get("body", "") or ""
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        return build_response(400, {"error": "Invalid JSON body"})

    email: str = (data.get("email") or "").strip()
    password: str = data.get("password") or ""

    if not email or not password:
        return build_response(400, {"error": "Email and password are required"})

    client = get_db_connection()
    db_name: str = os.environ.get("MONGO_NAME", "acme_team_mgmt")
    db = client[db_name]

    user = db.employees.find_one({"email": email})
    if not user:
        return build_response(401, {"error": "Invalid email or password"})

    stored_hash: str = user.get("password_hash", "")
    if not stored_hash or not check_password_hash(stored_hash, password):
        return build_response(401, {"error": "Invalid email or password"})

    token: str = _generate_token(user)
    sanitised_user = _sanitise_user(user)

    return build_response(200, {"token": token, "user": sanitised_user})


# ---------- GET /api/auth/me ----------


def _handle_me(event: Dict[str, Any]) -> Dict[str, Any]:
    """Return the current user's profile from a valid JWT."""
    headers_raw: Dict[str, str] = event.get("headers") or {}
    headers = {k.lower(): v for k, v in headers_raw.items()}

    auth_header: str = headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return build_response(401, {"error": "Missing or invalid Authorization header"})

    token: str = auth_header[7:]
    try:
        payload: Dict[str, Any] = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return build_response(401, {"error": "Token has expired"})
    except jwt.InvalidTokenError:
        return build_response(401, {"error": "Invalid token"})

    client = get_db_connection()
    db_name: str = os.environ.get("MONGO_NAME", "acme_team_mgmt")
    db = client[db_name]

    user = db.employees.find_one({"_id": payload.get("sub")})
    if not user:
        return build_response(401, {"error": "User not found"})

    return build_response(200, _sanitise_user(user))


# ---------- helpers ----------


def _generate_token(user: Dict[str, Any]) -> str:
    """Create a signed JWT containing the user's identity claims."""
    now = datetime.datetime.utcnow()
    payload: Dict[str, Any] = {
        "sub": user["_id"],
        "email": user["email"],
        "system_role": user.get("system_role", "Employee"),
        "iat": now,
        "exp": now + datetime.timedelta(hours=JWT_EXPIRATION_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _sanitise_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """Return a user dict without sensitive fields."""
    return {
        "_id": user["_id"],
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "system_role": user.get("system_role", "Employee"),
        "region": user.get("region", ""),
    }
