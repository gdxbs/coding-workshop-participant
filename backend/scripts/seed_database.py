import pymongo
from datetime import datetime
import random
from werkzeug.security import generate_password_hash

# Connection string provided
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "acme_team_mgmt"

# Default password for all seeded employees
DEFAULT_PASSWORD = "Password123!"
DEFAULT_PASSWORD_HASH = generate_password_hash(DEFAULT_PASSWORD)

def seed_database():
    print(f"Connecting to {MONGO_URI}...")
    client = pymongo.MongoClient(MONGO_URI)
    db = client[DB_NAME]

    # Clear existing collections for a fresh start
    print("Clearing existing collections (employees, teams, achievements)...")
    for collection in ["teams", "employees", "achievements"]:
        db[collection].drop()

    regions = ["NAM", "LATAM", "APAC", "EU"]
    orgs = ["Credit Cards", "Private Banking", "Enterprise Tech", "Cybersecurity", "ESG Finance", "Mobile Payments"]
    roles = ["Admin", "Employee"]

    # 1. GENERATE INDIVIDUALS (51 Total)
    individuals_data = []
    # Fixed IDs to ensure Alice Smith is e_001 (Admin from NAM)
    individuals_data.append({"_id": "e_001", "name": "Alice Smith", "email": "alice@acme.com", "system_role": "Admin", "region": "NAM", "password_hash": DEFAULT_PASSWORD_HASH})
    
    first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley", "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle", "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa", "Timothy", "Deborah"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"]

    for i in range(2, 52):
        id_str = f"e_{str(i).zfill(3)}"
        fname = first_names[(i-2) % len(first_names)]
        lname = last_names[(i-2) % len(last_names)]
        individuals_data.append({
            "_id": id_str,
            "name": f"{fname} {lname}",
            "email": f"{fname.lower()}.{lname.lower()}@acme.com",
            "system_role": random.choice(roles) if i > 5 else "Admin", # Ensure some early admins
            "region": random.choice(regions),
            "password_hash": DEFAULT_PASSWORD_HASH
        })

    # 2. GENERATE TEAMS (16 Total)
    teams_data = []
    team_names = [
        "NAM Alpha Cards", "NAM Beta Tech", "EU Wealth Hub", "EU Core Systems", 
        "APAC Credit Issuance", "LATAM Private Client", "Cyber Knights", "Green Finance",
        "Mobile Pay NAM", "Cloud Wizards", "Data Miners", "Global Security",
        "APAC Expansion", "EU Compliance", "LATAM Fintech", "Strategy One"
    ]
    
    for i, name in enumerate(team_names):
        team_id = f"t_{str(i+1).zfill(3)}"
        region = "NAM" if "NAM" in name else random.choice(regions)
        org = random.choice(orgs)
        if "Cards" in name or "Pay" in name: org = "Credit Cards"
        if "Wealth" in name or "Private" in name: org = "Private Banking"
        if "Tech" in name or "Cloud" in name or "Security" in name: org = "Enterprise Tech"
        if "Cyber" in name: org = "Cybersecurity"
        if "Green" in name: org = "ESG Finance"
        
        # Pick a leader from the same region
        region_folks = [ind["_id"] for ind in individuals_data if ind["region"] == region]
        leader_id = random.choice(region_folks)
        
        # Pick 1-5 members (including leader)
        member_count = random.randint(2, 5)
        # Get random members from same region, ensure leader is included
        other_members = random.sample(region_folks, min(member_count-1, len(region_folks)))
        employee_ids = list(set([leader_id] + other_members))
        
        teams_data.append({
            "_id": team_id,
            "name": name,
            "organization": org,
            "region": region,
            "leader_id": leader_id,
            "employee_ids": employee_ids,
            "created_at": datetime.utcnow()
        })

    # 3. GENERATE ACHIEVEMENTS (42 Total)
    achievements_data = []
    achievement_titles = [
        "Launched New Feature", "Exceeded KPI", "Security Audit Passed", "Compliance Milestone",
        "Record Sales Quarter", "System Migration Complete", "AWS Optimization", "Mobile App v2.0",
        "ESG Report Published", "Partner Integration", "Customer Support Win", "Market Entry Successful",
        "Zero Downtime Stretch", "Award for Innovation", "Team Offsite Goal Met", "Legacy Code Cleanup",
        "API Response Time Improved", "User Growth Milestone", "Internal Tool Launch", "Training Completed"
    ]
    
    months = [f"2025-{str(m).zfill(2)}" for m in range(1, 13)] + [f"2026-{str(m).zfill(2)}" for m in range(1, 7)]
    impacts = ["High", "Medium", "Low"]

    for i in range(1, 43):
        ach_id = f"a_{str(i).zfill(3)}"
        team = random.choice(teams_data)
        month = random.choice(months)
        title = f"{random.choice(achievement_titles)} - {i}"
        
        achievements_data.append({
            "_id": ach_id,
            "team_id": team["_id"],
            "title": title,
            "description": f"Successfully completed the {title.lower()} phase with positive stakeholder feedback.",
            "month": month,
            "impact": random.choice(impacts)
        })

    # Insert Data
    print(f"Inserting {len(individuals_data)} individuals...")
    db.employees.insert_many(individuals_data)
    print(f"Inserting {len(teams_data)} teams...")
    db.teams.insert_many(teams_data)
    print(f"Inserting {len(achievements_data)} achievements...")
    db.achievements.insert_many(achievements_data)

    # Indexes
    print("Creating indexes...")
    db.teams.create_index("region")
    db.teams.create_index("organization")
    db.teams.create_index("employee_ids")
    db.achievements.create_index([("team_id", 1), ("month", -1)])
    db.employees.create_index("region")

    print("✅ Database seeding complete with variety!")

if __name__ == "__main__":
    seed_database()