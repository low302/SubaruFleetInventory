#!/bin/bash

echo "🚗 Vehicle Inventory Management System - Docker Setup"
echo "=================================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if docker-compose is available
if command -v docker-compose > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif command -v docker > /dev/null 2>&1 && docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Error: docker-compose not found. Please install Docker Compose."
    exit 1
fi

echo "📦 Building and starting the container..."
echo ""

# Stop any existing container
$COMPOSE_CMD down 2>/dev/null

# Build and start
$COMPOSE_CMD up -d --build

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "✅ Vehicle Inventory System is now running!"
    echo "=================================================="
    echo ""
    echo "🌐 Access your application at: http://localhost:8080"
    echo ""
    echo "Useful commands:"
    echo "  Stop:     $COMPOSE_CMD down"
    echo "  Restart:  $COMPOSE_CMD restart"
    echo "  Logs:     $COMPOSE_CMD logs -f"
    echo "  Status:   $COMPOSE_CMD ps"
    echo ""
else
    echo ""
    echo "❌ Error: Failed to start the container"
    echo "Check the logs with: $COMPOSE_CMD logs"
    exit 1
fi
