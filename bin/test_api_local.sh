#!/bin/bash

BASE_URL="http://localhost:3001/api/teams"
TEAM_ID="t_script_12345"

echo "------------------------------------------------"
echo "1. POST (Create) a Team"
echo "------------------------------------------------"
curl -X POST "$BASE_URL" \
     -H "Content-Type: application/json" \
     -d '{
           "_id": "'"$TEAM_ID"'",
           "name": "Alpha Scripted Team",
           "organization": "Engineering",
           "region": "NA",
           "leader_id": "e_001",
           "employee_ids": ["e_001", "e_002"]
         }'
echo -e "\n"

echo "------------------------------------------------"
echo "2. GET (Retrieve) the created Team"
echo "------------------------------------------------"
curl -X GET "$BASE_URL/$TEAM_ID" \
     -H "Content-Type: application/json"
echo -e "\n"

echo "------------------------------------------------"
echo "3. PUT (Update) the Team"
echo "------------------------------------------------"
curl -X PUT "$BASE_URL/$TEAM_ID" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Alpha Scripted Team Updated",
           "region": "EMEA",
           "organization": "Engineering Leadership"
         }'
echo -e "\n"

echo "------------------------------------------------"
echo "4. DELETE the Team"
echo "------------------------------------------------"
curl -X DELETE "$BASE_URL/$TEAM_ID" \
     -H "Content-Type: application/json"
echo -e "\n"

echo "------------------------------------------------"
echo "5. GET (Verify Deletion) - Should return 404"
echo "------------------------------------------------"
curl -X GET "$BASE_URL/$TEAM_ID" \
     -H "Content-Type: application/json"
echo -e "\n"

# ==========================================================
# Local Logging Instructions
# ==========================================================
# To tail backend logs in real-time on your local stack, 
# you can use the awslocal CLI to read the Lambda's CloudWatch logs:
# 
# awslocal logs tail /aws/lambda/coding-workshop-teams-abcd1234 \
#          --follow --format short --color on
#
# (Replace 'coding-workshop-teams-abcd1234' with the actual function name deployed in LocalStack)
