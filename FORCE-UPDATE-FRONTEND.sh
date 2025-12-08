#!/bin/bash

echo "=========================================="
echo "FORCE UPDATE FRONTEND FILES"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Stopping container...${NC}"
docker-compose down
echo -e "${GREEN}✓ Container stopped${NC}"
echo ""

echo -e "${YELLOW}Step 2: Removing old Docker image...${NC}"
docker rmi vehicle-inventory-system-vehicle-inventory 2>/dev/null || true
docker rmi vehicle-inventory 2>/dev/null || true
echo -e "${GREEN}✓ Old images removed${NC}"
echo ""

echo -e "${YELLOW}Step 3: Clearing Docker build cache...${NC}"
docker builder prune -f
echo -e "${GREEN}✓ Build cache cleared${NC}"
echo ""

echo -e "${YELLOW}Step 4: Rebuilding image (this will take a minute)...${NC}"
docker-compose build --no-cache --pull
echo -e "${GREEN}✓ Image rebuilt from scratch${NC}"
echo ""

echo -e "${YELLOW}Step 5: Starting container...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Container started${NC}"
echo ""

echo -e "${YELLOW}Step 6: Waiting for services to start...${NC}"
sleep 5
echo -e "${GREEN}✓ Services should be ready${NC}"
echo ""

echo -e "${YELLOW}Step 7: Verifying files in container...${NC}"
echo "Checking index.html date:"
docker exec vehicle-inventory-system ls -lh /usr/share/nginx/html/index.html
echo ""
echo "Checking app.js date:"
docker exec vehicle-inventory-system ls -lh /usr/share/nginx/html/app.js
echo ""
echo "Checking server.js date:"
docker exec vehicle-inventory-system ls -lh /app/server.js
echo -e "${GREEN}✓ Files verified${NC}"
echo ""

echo -e "${YELLOW}Step 8: Checking logs...${NC}"
docker-compose logs --tail=20
echo ""

echo "=========================================="
echo -e "${GREEN}UPDATE COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Access your application at: http://10.168.12.50:8080"
echo ""
echo "If you still see old UI:"
echo "1. Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "2. Clear browser cache"
echo "3. Try incognito/private browsing mode"
echo ""
