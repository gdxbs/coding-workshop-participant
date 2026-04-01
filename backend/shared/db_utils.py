import os
from pymongo import MongoClient

def get_db_connection():
    """
    Creates a MongoDB connection.
    Environment variables used:
        - IS_LOCAL
        - MONGO_HOST
        - MONGO_PORT
        - MONGO_NAME
        - MONGO_USER (optional)
        - MONGO_PASS (optional)
    """
    host = os.environ.get("MONGO_HOST")
    port = os.environ.get("MONGO_PORT")
    db_name = os.environ.get("MONGO_NAME") or "acme_team_mgmt"
    is_local = os.environ.get("IS_LOCAL", "true").lower() == "true"
    
    if not all([host, port, db_name]):
        raise ValueError("Missing required database environment variables (MONGO_HOST, MONGO_PORT, MONGO_NAME).")
        
    user = os.environ.get("MONGO_USER")
    password = os.environ.get("MONGO_PASS")
    
    auth_part = ""
    if user and password:
        auth_part = f"{user}:{password}@"
        
    uri = f"mongodb://{auth_part}{host}:{port}/{db_name}"
    
    if not is_local:
        uri += "?tls=true&tlsAllowInvalidCertificates=true&retryWrites=false"
        
    return MongoClient(uri, serverSelectionTimeoutMS=5000)
