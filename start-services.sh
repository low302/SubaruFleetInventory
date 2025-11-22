#!/bin/sh

# Start Node.js backend in background
cd /app
node server.js &

# Start nginx in foreground
nginx -g 'daemon off;'
