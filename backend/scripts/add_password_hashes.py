"""One-time migration: add password_hash to all existing employees."""

import pymongo
from werkzeug.security import generate_password_hash

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "acme_team_mgmt"

DEFAULT_PASSWORD = "Password123!"


def add_password_hashes() -> None:
    """Hash the default password with werkzeug and set it on every employee."""
    password_hash = generate_password_hash(DEFAULT_PASSWORD)

    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]

    result = db.employees.update_many(
        {"password_hash": {"$exists": False}},
        {"$set": {"password_hash": password_hash}},
    )

    print(
        f"Updated {result.modified_count} employees with password_hash "
        f"(matched {result.matched_count})."
    )


if __name__ == "__main__":
    add_password_hashes()
