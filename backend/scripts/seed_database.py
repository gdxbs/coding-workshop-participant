import pymongo
from datetime import datetime

# Connection string provided
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "acme_team_mgmt"

def seed_database():
    print(f"Connecting to {MONGO_URI}...")
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # Clear existing collections for a fresh start
    print("Clearing existing collections...")
    for collection in ["teams", "employees", "achievements"]:
        db[collection].drop()

    # ==========================================
    # 1. MOCK DATA: EMPLOYEES
    # System Roles: "Admin" or "Employee"
    # Regions: NAM, LATAM, APAC, EU
    # ==========================================
    employees_data = [
        # NAM Employees
        {"_id": "e_001", "name": "Alice Smith", "email": "alice@acme.com", "system_role": "Admin", "region": "NAM"},
        {"_id": "e_002", "name": "Bob Jones", "email": "bob@acme.com", "system_role": "Employee", "region": "NAM"},
        {"_id": "e_003", "name": "Charlie Davis", "email": "charlie@acme.com", "system_role": "Employee", "region": "NAM"},
        {"_id": "e_004", "name": "Diana Prince", "email": "diana@acme.com", "system_role": "Employee", "region": "NAM"},
        
        # EU Employees
        {"_id": "e_005", "name": "Evan Wright", "email": "evan@acme.com", "system_role": "Admin", "region": "EU"},
        {"_id": "e_006", "name": "Fiona Gallagher", "email": "fiona@acme.com", "system_role": "Employee", "region": "EU"},
        {"_id": "e_007", "name": "George King", "email": "george@acme.com", "system_role": "Employee", "region": "EU"},
        
        # APAC Employees
        {"_id": "e_008", "name": "Hannah Lee", "email": "hannah@acme.com", "system_role": "Employee", "region": "APAC"},
        {"_id": "e_009", "name": "Ian Chen", "email": "ian@acme.com", "system_role": "Employee", "region": "APAC"},
        
        # LATAM Employees
        {"_id": "e_010", "name": "Julia Silva", "email": "julia@acme.com", "system_role": "Admin", "region": "LATAM"},
        {"_id": "e_011", "name": "Kevin Cruz", "email": "kevin@acme.com", "system_role": "Employee", "region": "LATAM"},
    ]

    # ==========================================
    # 2. MOCK DATA: TEAMS (Exactly 6 Teams)
    # Rules: Max 5 employees, 1 leader, matching regions.
    # Organizations: credit cards, private banking, enterprise technology
    # ==========================================
    teams_data = [
        {
            "_id": "t_001",
            "name": "NAM Alpha Cards",
            "organization": "credit cards",
            "region": "NAM",
            "leader_id": "e_001",
            "employee_ids": ["e_001", "e_002", "e_003"], # Max 5. Leader is in the team.
            "created_at": datetime.utcnow()
        },
        {
            "_id": "t_002",
            "name": "NAM Beta Tech",
            "organization": "enterprise technology",
            "region": "NAM",
            "leader_id": "e_002", # Bob is leader here
            "employee_ids": ["e_002", "e_001", "e_004"], # Alice (e_001) is on multiple teams!
            "created_at": datetime.utcnow()
        },
        {
            "_id": "t_003",
            "name": "EU Wealth Hub",
            "organization": "private banking",
            "region": "EU",
            "leader_id": "e_005",
            "employee_ids": ["e_005", "e_006", "e_007"],
            "created_at": datetime.utcnow()
        },
        {
            "_id": "t_004",
            "name": "EU Core Systems",
            "organization": "enterprise technology",
            "region": "EU",
            "leader_id": "e_006",
            "employee_ids": ["e_006", "e_005"], # Employees on multiple EU teams
            "created_at": datetime.utcnow()
        },
        {
            "_id": "t_005",
            "name": "APAC Credit Issuance",
            "organization": "credit cards",
            "region": "APAC",
            "leader_id": "e_008",
            "employee_ids": ["e_008", "e_009"],
            "created_at": datetime.utcnow()
        },
        {
            "_id": "t_006",
            "name": "LATAM Private Client",
            "organization": "private banking",
            "region": "LATAM",
            "leader_id": "e_010",
            "employee_ids": ["e_010", "e_011"],
            "created_at": datetime.utcnow()
        }
    ]

    # ==========================================
    # 3. MOCK DATA: ACHIEVEMENTS
    # Application Logic Note: The UI/Backend should verify the user adding 
    # the achievement is the `leader_id` of the respective team.
    # ==========================================
    achievements_data = [
        {"_id": "a_001", "team_id": "t_001", "title": "Launched Platinum Card Series", "month": "2026-01"},
        {"_id": "a_002", "team_id": "t_002", "title": "Migrated 50TB to Cloud Infrastructure", "month": "2026-02"},
        {"_id": "a_003", "team_id": "t_003", "title": "Onboarded 100 High Net Worth Clients", "month": "2026-02"},
        {"_id": "a_004", "team_id": "t_005", "title": "Expanded APAC Merchant Network by 15%", "month": "2026-03"},
        {"_id": "a_005", "team_id": "t_006", "title": "Opened 3 New Boutique Branches", "month": "2026-03"},
    ]

    # Insert Data
    print("Inserting mock data...")
    db.employees.insert_many(employees_data)
    db.teams.insert_many(teams_data)
    db.achievements.insert_many(achievements_data)

    # ==========================================
    # 4. ORDERING & INDEXING
    # ==========================================
    print("Creating indexes for optimal querying...")
    
    # Fast lookups by region and organization
    db.teams.create_index([("region", pymongo.ASCENDING)])
    db.teams.create_index([("organization", pymongo.ASCENDING)])
    
    # Fast lookups for an employee's teams (since employee_ids is an array, 
    # MongoDB automatically creates a multikey index here)
    db.teams.create_index([("employee_ids", pymongo.ASCENDING)])
    
    # Achievements by Team
    db.achievements.create_index([("team_id", pymongo.ASCENDING), ("month", pymongo.DESCENDING)])

    print("✅ Database seeding complete! Data is mapped perfectly to your new structure.")

if __name__ == "__main__":
    seed_database()