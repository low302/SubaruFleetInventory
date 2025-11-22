# Multi-stage build
FROM node:18-alpine AS backend

WORKDIR /app

# Copy backend files
COPY package*.json ./
COPY server.js ./

# Install dependencies
RUN npm install --production

# Frontend stage with nginx
FROM nginx:alpine

# Install Node.js in nginx container
RUN apk add --update nodejs npm

# Copy backend from previous stage
COPY --from=backend /app /app

# Copy frontend files to nginx
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Set proper permissions for nginx
RUN chmod 644 /usr/share/nginx/html/index.html && \
    chmod 644 /usr/share/nginx/html/app.js && \
    chmod 755 /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create startup script
COPY start-services.sh /start-services.sh
RUN chmod +x /start-services.sh

# Expose ports
EXPOSE 80 3000

# Start both services
CMD ["/start-services.sh"]
