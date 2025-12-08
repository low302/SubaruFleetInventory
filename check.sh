#!/bin/bash

# Quick diagnostic script for Linux Mint

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Quick Diagnostic Check"
echo "=========================================="
echo ""

# Check Docker
echo -n "Docker running: "
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓ YES${NC}"
else
    echo -e "${RED}✗ NO${NC}"
    exit 1
fi

# Check container
echo -n "Container running: "
if docker ps | grep -q vehicle-inventory-system; then
    echo -e "${GREEN}✓ YES${NC}"
else
    echo -e "${RED}✗ NO${NC}"
    echo "Start with: docker compose up -d"
    exit 1
fi

echo ""
echo "--- Source Files (on host) ---"
echo -n "index.html has API: "
if grep -q "const API_BASE = '/api'" index.html 2>/dev/null; then
    echo -e "${GREEN}✓ YES${NC}"
else
    echo -e "${RED}✗ NO - WRONG FILE!${NC}"
fi

echo -n "app.js has API: "
if grep -q "const API_BASE = '/api'" app.js 2>/dev/null; then
    echo -e "${GREEN}✓ YES${NC}"
else
    echo -e "${RED}✗ NO - WRONG FILE!${NC}"
fi

echo ""
echo "--- Container Files ---"
echo -n "Container app.js has API: "
if docker exec vehicle-inventory-system grep -q "const API_BASE = '/api'" /usr/share/nginx/html/app.js 2>/dev/null; then
    echo -e "${GREEN}✓ YES${NC}"
else
    echo -e "${RED}✗ NO - REBUILD NEEDED!${NC}"
fi

echo -n "Container has username fix: "
if docker exec vehicle-inventory-system grep -q "currentUserDisplay.textContent" /usr/share/nginx/html/app.js 2>/dev/null; then
    echo -e "${GREEN}✓ YES${NC}"
else
    echo -e "${YELLOW}⚠ NO${NC}"
fi

echo -n "Server.js DB path: "
if docker exec vehicle-inventory-system grep -q "/app/data/fleet-inventory.db" /app/server.js 2>/dev/null; then
    echo -e "${GREEN}✓ CORRECT${NC}"
else
    echo -e "${RED}✗ WRONG${NC}"
fi

echo ""
echo "--- API Test ---"
echo -n "API responding: "
if curl -s http://localhost:8080/api/auth/status | grep -q "authenticated" 2>/dev/null; then
    echo -e "${GREEN}✓ YES${NC}"
    echo ""
    curl -s http://localhost:8080/api/auth/status | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8080/api/auth/status
else
    echo -e "${RED}✗ NO${NC}"
fi

echo ""
echo "=========================================="
echo "Summary:"
echo "=========================================="

# Determine status
if docker exec vehicle-inventory-system grep -q "const API_BASE = '/api'" /usr/share/nginx/html/app.js 2>/dev/null; then
    echo -e "${GREEN}✓ Container has correct files${NC}"
    echo "If UI is old, it's a browser cache issue."
    echo "Try: Ctrl+Shift+R or incognito mode"
else
    echo -e "${RED}✗ Container has OLD files${NC}"
    echo "Run: ./rebuild.sh"
fi

echo ""
