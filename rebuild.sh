#!/bin/bash

# Vehicle Inventory System - Complete Rebuild Script
# Optimized for Linux Mint with 'docker compose'

set -e  # Exit on error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "Vehicle Inventory - Complete Rebuild"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running!${NC}"
    echo "Start Docker and try again."
    exit 1
fi

echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Verify we're in the correct directory
if [ ! -f "Dockerfile" ] || [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗ Error: Not in project directory!${NC}"
    echo "Please cd to your vehicle-inventory-system directory"
    exit 1
fi

echo -e "${GREEN}✓ In correct directory${NC}"
echo ""

# Step 1: Verify source files
echo -e "${BLUE}Step 1: Verifying source files...${NC}"

if grep -q "const API_BASE = '/api'" index.html; then
    echo -e "${GREEN}✓ index.html is correct (has API)${NC}"
else
    echo -e "${RED}✗ ERROR: index.html missing API_BASE!${NC}"
    echo "You're using the wrong index.html file!"
    exit 1
fi

if grep -q "const API_BASE = '/api'" app.js; then
    echo -e "${GREEN}✓ app.js is correct (has API)${NC}"
else
    echo -e "${RED}✗ ERROR: app.js missing API_BASE!${NC}"
    exit 1
fi

if grep -q "currentUserDisplay.textContent" app.js; then
    echo -e "${GREEN}✓ app.js has username fix${NC}"
else
    echo -e "${YELLOW}⚠ WARNING: app.js missing username fix${NC}"
fi

if grep -q "/app/data/fleet-inventory.db" server.js; then
    echo -e "${GREEN}✓ server.js has correct DB path${NC}"
else
    echo -e "${RED}✗ ERROR: server.js has wrong DB path!${NC}"
    exit 1
fi

echo ""

# Step 2: Backup database
echo -e "${BLUE}Step 2: Backing up database...${NC}"
if docker ps | grep -q vehicle-inventory-system; then
    docker cp vehicle-inventory-system:/app/data/fleet-inventory.db \
        "./fleet-backup-$(date +%Y%m%d-%H%M%S).db" 2>/dev/null && \
        echo -e "${GREEN}✓ Database backed up${NC}" || \
        echo -e "${YELLOW}⚠ No database to backup${NC}"
else
    echo -e "${YELLOW}⚠ Container not running, no backup needed${NC}"
fi
echo ""

# Step 3: Stop and remove
echo -e "${BLUE}Step 3: Stopping containers...${NC}"
docker compose down 2>/dev/null || true
docker stop vehicle-inventory-system 2>/dev/null || true
docker rm vehicle-inventory-system 2>/dev/null || true
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

# Step 4: Remove images
echo -e "${BLUE}Step 4: Removing old images...${NC}"
docker rmi vehicle-inventory-system-vehicle-inventory 2>/dev/null || true
docker rmi vehicle-inventory 2>/dev/null || true
docker images | grep vehicle-inventory | awk '{print $3}' | xargs -r docker rmi 2>/dev/null || true
echo -e "${GREEN}✓ Images removed${NC}"
echo ""

# Step 5: Clear build cache
echo -e "${BLUE}Step 5: Clearing Docker build cache...${NC}"
docker builder prune -a -f
echo -e "${GREEN}✓ Build cache cleared${NC}"
echo ""

# Step 6: Build
echo -e "${BLUE}Step 6: Building new image (this takes ~30 seconds)...${NC}"
DOCKER_BUILDKIT=1 docker compose build --no-cache --pull
echo -e "${GREEN}✓ Image built successfully${NC}"
echo ""

# Step 7: Start
echo -e "${BLUE}Step 7: Starting container...${NC}"
docker compose up -d
echo -e "${GREEN}✓ Container started${NC}"
echo ""

# Step 8: Wait and verify
echo -e "${BLUE}Step 8: Waiting for services to initialize...${NC}"
sleep 5
echo ""

echo -e "${BLUE}Step 9: Verifying deployment...${NC}"
echo ""

# Check if app.js has API_BASE
echo -n "Checking app.js in container... "
if docker exec vehicle-inventory-system grep -q "const API_BASE = '/api'" /usr/share/nginx/html/app.js 2>/dev/null; then
    echo -e "${GREEN}✓ CORRECT${NC}"
else
    echo -e "${RED}✗ WRONG VERSION!${NC}"
    echo "Something went wrong. The container has the old files."
    exit 1
fi

# Check username fix
echo -n "Checking username fix... "
if docker exec vehicle-inventory-system grep -q "currentUserDisplay.textContent" /usr/share/nginx/html/app.js 2>/dev/null; then
    echo -e "${GREEN}✓ PRESENT${NC}"
else
    echo -e "${YELLOW}⚠ MISSING${NC}"
fi

# Check server.js
echo -n "Checking server.js DB path... "
if docker exec vehicle-inventory-system grep -q "/app/data/fleet-inventory.db" /app/server.js 2>/dev/null; then
    echo -e "${GREEN}✓ CORRECT${NC}"
else
    echo -e "${RED}✗ WRONG!${NC}"
fi

# Test API
echo -n "Testing API endpoint... "
if curl -s http://localhost:8080/api/auth/status | grep -q "authenticated" 2>/dev/null; then
    echo -e "${GREEN}✓ RESPONDING${NC}"
else
    echo -e "${YELLOW}⚠ Check manually${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ REBUILD COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "🌐 URL: http://10.168.12.50:8080"
echo ""
echo "📝 IMPORTANT:"
echo "1. Open in INCOGNITO/PRIVATE window first"
echo "2. Login: username=Zaid, password=1234"
echo "3. Check if username shows 'Zaid' (not 'User')"
echo ""
echo "If using regular browser:"
echo "• Hard refresh: Ctrl+Shift+R"
echo "• Or clear cache: Ctrl+Shift+Delete"
echo ""
echo "Useful commands:"
echo "• Logs: docker compose logs -f"
echo "• Stop: docker compose down"
echo "• Restart: docker compose restart"
echo ""
