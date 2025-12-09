#!/bin/sh

echo "Starting Vehicle Inventory System..."

# Start Node.js backend in background
echo "Starting Node.js backend..."
cd /app
node server.js &

# Wait a moment for backend to start
sleep 3

# Start nginx in foreground
echo "Starting nginx..."
nginx -g 'daemon off;'
