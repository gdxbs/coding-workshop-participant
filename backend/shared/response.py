import json
import datetime
from typing import Any, Dict
from bson import ObjectId


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)


def json_dumps(obj: Any) -> str:
    return json.dumps(obj, cls=DateTimeEncoder)


def build_response(status_code: int, body: Any = None) -> Dict[str, Any]:
    response: Dict[str, Any] = {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    }
    if body is not None:
        response["body"] = json_dumps(body)
    return response


def build_auth_response(status_code: int, message: str) -> Dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json_dumps({"error": message})
    }
