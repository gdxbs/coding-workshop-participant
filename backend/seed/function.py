"""Lambda function to seed the database with initial data.

Exposes a POST handler that populates employees, teams, achievements,
and metadata collections.  Idempotent — skips seeding when data already
exists unless ``force=true`` is sent in the request body.
"""

import os
import json
import random
from datetime import datetime
from typing import Any, Dict, List

from pymongo.errors import PyMongoError
from werkzeug.security import generate_password_hash

from shared.db_utils import get_db_connection
from shared.response import build_response

DEFAULT_PASSWORD: str = "Password123!"
DEFAULT_PASSWORD_HASH: str = generate_password_hash(DEFAULT_PASSWORD)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda entry-point for the seed service.

    Supported routes:
        POST /api/seed  – populate the database with seed data
    """
    try:
        http_method: str = (
            event.get("httpMethod")
            or event.get("requestContext", {}).get("http", {}).get("method")
            or event.get("method")
            or ""
        ).upper()

        if http_method == "OPTIONS":
            return build_response(200, {"message": "OK"})

        if http_method != "POST":
            return build_response(405, {"error": "Method Not Allowed"})

        return _handle_seed(event)

    except PyMongoError as pe:
        return build_response(500, {"error": f"Database error: {str(pe)}"})
    except Exception as e:
        return build_response(500, {"error": f"Internal server error: {str(e)}"})


def _handle_seed(event: Dict[str, Any]) -> Dict[str, Any]:
    """Seed the database with employees, teams, achievements and metadata."""
    body_str: str = event.get("body", "") or ""
    try:
        data: Dict[str, Any] = json.loads(body_str) if body_str else {}
    except json.JSONDecodeError:
        data = {}

    force: bool = str(data.get("force", "false")).lower() == "true"

    client = get_db_connection()
    db_name: str = os.environ.get("MONGO_NAME", "acme_team_mgmt")
    db = client[db_name]

    # Guard against duplicate seeding
    if not force and db.employees.count_documents({}) > 0:
        return build_response(200, {
            "message": "Database already seeded. Send {\"force\": true} to re-seed.",
            "employees": db.employees.count_documents({}),
            "teams": db.teams.count_documents({}),
            "achievements": db.achievements.count_documents({}),
            "metadata": db.metadata.count_documents({}),
        })

    # Clear existing data when (re-)seeding
    for collection_name in ["teams", "employees", "achievements", "metadata"]:
        db[collection_name].drop()

    individuals_data: List[Dict[str, Any]] = _build_employees()
    teams_data: List[Dict[str, Any]] = _build_teams(individuals_data)
    achievements_data: List[Dict[str, Any]] = _build_achievements(teams_data)
    metadata_data: List[Dict[str, Any]] = _build_metadata()

    db.employees.insert_many(individuals_data)
    db.teams.insert_many(teams_data)
    db.achievements.insert_many(achievements_data)
    db.metadata.insert_many(metadata_data)

    # Create indexes
    db.teams.create_index("region")
    db.teams.create_index("organization")
    db.teams.create_index("employee_ids")
    db.achievements.create_index([("team_id", 1), ("month", -1)])
    db.employees.create_index("region")

    return build_response(200, {
        "message": "Database seeded successfully",
        "employees": len(individuals_data),
        "teams": len(teams_data),
        "achievements": len(achievements_data),
        "metadata": len(metadata_data),
    })


# ---------------------------------------------------------------------------
# Data builders – ported from scripts/seed_database.py
# ---------------------------------------------------------------------------

_FIRST_NAMES: List[str] = [
    "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael",
    "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan",
    "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
    "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty",
    "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley", "Steven",
    "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George",
    "Melissa", "Timothy", "Deborah",
]

_LAST_NAMES: List[str] = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
    "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
    "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green",
    "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
    "Carter", "Roberts",
]

_REGIONS: List[str] = ["NAM", "LATAM", "APAC", "EU"]
_ORGS: List[str] = [
    "Credit Cards", "Private Banking", "Enterprise Tech",
    "Cybersecurity", "ESG Finance", "Mobile Payments",
]
_ROLES: List[str] = ["Admin", "Employee"]


def _build_employees() -> List[Dict[str, Any]]:
    """Generate 51 employee documents."""
    employees: List[Dict[str, Any]] = [
        {
            "_id": "e_001",
            "name": "Alice Smith",
            "email": "alice@acme.com",
            "system_role": "Admin",
            "region": "NAM",
            "password_hash": DEFAULT_PASSWORD_HASH,
        }
    ]

    for i in range(2, 52):
        id_str: str = f"e_{str(i).zfill(3)}"
        fname: str = _FIRST_NAMES[(i - 2) % len(_FIRST_NAMES)]
        lname: str = _LAST_NAMES[(i - 2) % len(_LAST_NAMES)]
        employees.append({
            "_id": id_str,
            "name": f"{fname} {lname}",
            "email": f"{fname.lower()}.{lname.lower()}@acme.com",
            "system_role": random.choice(_ROLES) if i > 5 else "Admin",
            "region": random.choice(_REGIONS),
            "password_hash": DEFAULT_PASSWORD_HASH,
        })

    return employees


def _build_teams(employees: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate 16 team documents."""
    team_names: List[str] = [
        "NAM Alpha Cards", "NAM Beta Tech", "EU Wealth Hub", "EU Core Systems",
        "APAC Credit Issuance", "LATAM Private Client", "Cyber Knights",
        "Green Finance", "Mobile Pay NAM", "Cloud Wizards", "Data Miners",
        "Global Security", "APAC Expansion", "EU Compliance", "LATAM Fintech",
        "Strategy One",
    ]

    teams: List[Dict[str, Any]] = []
    for i, name in enumerate(team_names):
        team_id: str = f"t_{str(i + 1).zfill(3)}"
        region: str = "NAM" if "NAM" in name else random.choice(_REGIONS)

        org: str = random.choice(_ORGS)
        if "Cards" in name or "Pay" in name:
            org = "Credit Cards"
        if "Wealth" in name or "Private" in name:
            org = "Private Banking"
        if "Tech" in name or "Cloud" in name or "Security" in name:
            org = "Enterprise Tech"
        if "Cyber" in name:
            org = "Cybersecurity"
        if "Green" in name:
            org = "ESG Finance"

        region_folks: List[str] = [
            e["_id"] for e in employees if e["region"] == region
        ]
        leader_id: str = random.choice(region_folks)

        member_count: int = random.randint(2, 5)
        other_members: List[str] = random.sample(
            region_folks, min(member_count - 1, len(region_folks))
        )
        employee_ids: List[str] = list(set([leader_id] + other_members))

        teams.append({
            "_id": team_id,
            "name": name,
            "organization": org,
            "region": region,
            "leader_id": leader_id,
            "employee_ids": employee_ids,
            "created_at": datetime.utcnow(),
        })

    return teams


def _build_achievements(teams: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate 42 achievement documents."""
    titles: List[str] = [
        "Launched New Feature", "Exceeded KPI", "Security Audit Passed",
        "Compliance Milestone", "Record Sales Quarter",
        "System Migration Complete", "AWS Optimization", "Mobile App v2.0",
        "ESG Report Published", "Partner Integration", "Customer Support Win",
        "Market Entry Successful", "Zero Downtime Stretch",
        "Award for Innovation", "Team Offsite Goal Met", "Legacy Code Cleanup",
        "API Response Time Improved", "User Growth Milestone",
        "Internal Tool Launch", "Training Completed",
    ]
    months: List[str] = (
        [f"2025-{str(m).zfill(2)}" for m in range(1, 13)]
        + [f"2026-{str(m).zfill(2)}" for m in range(1, 7)]
    )
    impacts: List[str] = ["High", "Medium", "Low"]

    achievements: List[Dict[str, Any]] = []
    for i in range(1, 43):
        ach_id: str = f"a_{str(i).zfill(3)}"
        team: Dict[str, Any] = random.choice(teams)
        month: str = random.choice(months)
        title: str = f"{random.choice(titles)} - {i}"

        achievements.append({
            "_id": ach_id,
            "team_id": team["_id"],
            "title": title,
            "description": (
                f"Successfully completed the {title.lower()} phase "
                "with positive stakeholder feedback."
            ),
            "month": month,
            "impact": random.choice(impacts),
        })

    return achievements


def _build_metadata() -> List[Dict[str, Any]]:
    """Generate 15 metadata documents."""
    now: str = datetime.utcnow().isoformat()
    return [
        {"_id": "app_version", "category": "System", "key": "app_version", "value": "2.4.1", "description": "Current application version", "lastUpdated": now},
        {"_id": "max_team_size", "category": "Thresholds", "key": "max_team_size", "value": "5", "description": "Maximum number of members allowed per team", "lastUpdated": now},
        {"_id": "default_region", "category": "Regions", "key": "default_region", "value": "NAM", "description": "Default region for new employees", "lastUpdated": now},
        {"_id": "supported_regions", "category": "Regions", "key": "supported_regions", "value": "NAM,LATAM,APAC,EU", "description": "Comma-separated list of supported regions", "lastUpdated": now},
        {"_id": "achievement_impacts", "category": "System", "key": "achievement_impacts", "value": "High,Medium,Low", "description": "Available impact levels for achievements", "lastUpdated": now},
        {"_id": "enable_notifications", "category": "Feature Flags", "key": "enable_notifications", "value": "true", "description": "Enable in-app notifications for users", "lastUpdated": now},
        {"_id": "enable_analytics", "category": "Feature Flags", "key": "enable_analytics", "value": "true", "description": "Enable the analytics dashboard page", "lastUpdated": now},
        {"_id": "enable_export", "category": "Feature Flags", "key": "enable_export", "value": "false", "description": "Enable CSV/PDF export functionality", "lastUpdated": now},
        {"_id": "session_timeout_minutes", "category": "Thresholds", "key": "session_timeout_minutes", "value": "60", "description": "Session timeout duration in minutes", "lastUpdated": now},
        {"_id": "password_min_length", "category": "Thresholds", "key": "password_min_length", "value": "8", "description": "Minimum password length for new accounts", "lastUpdated": now},
        {"_id": "org_credit_cards", "category": "Organizations", "key": "org_credit_cards", "value": "Credit Cards", "description": "Credit Cards business unit", "lastUpdated": now},
        {"_id": "org_private_banking", "category": "Organizations", "key": "org_private_banking", "value": "Private Banking", "description": "Private Banking business unit", "lastUpdated": now},
        {"_id": "org_enterprise_tech", "category": "Organizations", "key": "org_enterprise_tech", "value": "Enterprise Tech", "description": "Enterprise Tech business unit", "lastUpdated": now},
        {"_id": "maintenance_mode", "category": "Feature Flags", "key": "maintenance_mode", "value": "false", "description": "Put the application in maintenance mode", "lastUpdated": now},
        {"_id": "api_rate_limit", "category": "Thresholds", "key": "api_rate_limit", "value": "1000", "description": "Maximum API requests per minute per user", "lastUpdated": now},
    ]
