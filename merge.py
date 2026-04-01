import json
import os

with open("frontend/package.json") as f:
    front_pkg = json.load(f)

with open("backend/Team Management Tool UI Design/package.json") as f:
    back_pkg = json.load(f)

# Copy dependencies
front_pkg["dependencies"] = back_pkg.get("dependencies", {})
front_pkg["devDependencies"] = back_pkg.get("devDependencies", {})

# Ensure React 18 is explicitly in dependencies for our app
front_pkg["dependencies"]["react"] = "18.3.1"
front_pkg["dependencies"]["react-dom"] = "18.3.1"

# Copy other potential npm fields
if "peerDependencies" in back_pkg:
    front_pkg["peerDependencies"] = back_pkg["peerDependencies"]
if "peerDependenciesMeta" in back_pkg:
    front_pkg["peerDependenciesMeta"] = back_pkg["peerDependenciesMeta"]
if "pnpm" in back_pkg:
    front_pkg["pnpm"] = back_pkg["pnpm"]

# Write back to frontend package.json
with open("frontend/package.json", "w") as f:
    json.dump(front_pkg, f, indent=2)
