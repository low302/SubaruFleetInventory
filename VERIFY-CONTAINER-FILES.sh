#!/bin/bash

echo "=========================================="
echo "CONTAINER FILE VERIFICATION"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if container is running
if ! docker ps | grep -q vehicle-inventory-system; then
    echo -e "${RED}✗ Container is not running!${NC}"
    echo "Start it with: docker-compose up -d"
    exit 1
fi

echo -e "${YELLOW}Checking index.html...${NC}"
echo "First 30 lines:"
docker exec vehicle-inventory-system head -30 /usr/share/nginx/html/index.html
echo ""
echo "Searching for '<script src=\"app.js\">':"
docker exec vehicle-inventory-system grep -n "script src" /usr/share/nginx/html/index.html
echo ""

echo -e "${YELLOW}Checking app.js...${NC}"
echo "First 20 lines:"
docker exec vehicle-inventory-system head -20 /usr/share/nginx/html/app.js
echo ""
echo "Checking for API_BASE:"
if docker exec vehicle-inventory-system grep -q "const API_BASE = '/api'" /usr/share/nginx/html/app.js; then
    echo -e "${GREEN}✓ Found: const API_BASE = '/api'${NC}"
else
    echo -e "${RED}✗ NOT FOUND: const API_BASE = '/api'${NC}"
    echo "This means you're using the OLD localStorage version!"
fi
echo ""

echo "Checking for username display fix:"
if docker exec vehicle-inventory-system grep -q "currentUserDisplay.textContent" /usr/share/nginx/html/app.js; then
    echo -e "${GREEN}✓ Found: currentUserDisplay.textContent${NC}"
else
    echo -e "${RED}✗ NOT FOUND: currentUserDisplay.textContent${NC}"
    echo "Username will show as 'User' instead of actual username"
fi
echo ""

echo -e "${YELLOW}Checking server.js...${NC}"
echo "Database path:"
docker exec vehicle-inventory-system grep "fleet-inventory.db" /app/server.js | head -5
echo ""
echo "CORS configuration:"
docker exec vehicle-inventory-system grep -A 10 "localNetworkPattern" /app/server.js
echo ""

echo -e "${YELLOW}File timestamps:${NC}"
docker exec vehicle-inventory-system ls -lh /usr/share/nginx/html/
echo ""
docker exec vehicle-inventory-system ls -lh /app/ | grep -E "server.js|package.json"
echo ""

echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
