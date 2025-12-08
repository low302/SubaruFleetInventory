#!/bin/bash
# Quick Start Script for Wheel Inventory System v2.0

set -e

echo "🚗 OEM Subaru Wheel Inventory System v2.0"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if required ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $1 is already in use. Please free it up and try again."
        exit 1
    fi
}

echo "🔍 Checking ports..."
check_port 3000
check_port 3001
check_port 5432
check_port 6379
echo "✅ All ports available"
echo ""

# Build and start services
echo "🔨 Building and starting services..."
docker compose up -d --build

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health
echo ""
echo "🏥 Health Check:"

# Backend health
if curl -s http://localhost:3001/api/health | grep -q "healthy"; then
    echo "✅ Backend:  Healthy"
else
    echo "❌ Backend:  Not responding"
fi

# Frontend health
if curl -s http://localhost:3000/health | grep -q "healthy"; then
    echo "✅ Frontend: Healthy"
else
    echo "⚠️  Frontend: Not ready yet (may need a few more seconds)"
fi

# Database health
if docker exec wheel_inventory_db pg_isready -U wheeluser -q 2>/dev/null; then
    echo "✅ Database: Healthy"
else
    echo "❌ Database: Not responding"
fi

# Redis health
if docker exec wheel_inventory_redis redis-cli PING 2>/dev/null | grep -q "PONG"; then
    echo "✅ Redis:    Healthy"
else
    echo "⚠️  Redis:    Not available (optional - system will work without it)"
fi

echo ""
echo "=========================================="
echo "🎉 System is ready!"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📚 Quick commands:"
echo "   make logs         - View all logs"
echo "   make status       - Check service status"
echo "   make test         - Run all tests"
echo "   make backup       - Create manual backup"
echo "   make stop         - Stop all services"
echo ""
echo "📖 For more information, see README.md"
echo "=========================================="
