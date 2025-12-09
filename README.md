# Brandon Tomes Subaru - Fleet Inventory System

A full-stack vehicle inventory management system with authentication, database persistence, and modern UI.

## Quick Start

```bash
# Build and start
docker-compose up -d --build

# Access at: http://localhost:8080
# Default login: username=Zaid, password=1234
```

## Features

- 🔐 Secure authentication with sessions
- 💾 SQLite database with persistent storage
- 🚗 Complete vehicle lifecycle management
- 📊 Dashboard with analytics
- 🏷️ QR code label generation
- 📤 CSV export functionality
- 🔄 Trade-in tracking
- 📅 Pickup scheduling

## Architecture

- **Frontend**: HTML/CSS/JavaScript (served by nginx on port 80)
- **Backend**: Node.js/Express API (port 3000)
- **Database**: SQLite (persistent volume at `/app/data`)
- **Proxy**: nginx routes `/api/*` to backend

## Common Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Access database
docker exec -it vehicle-inventory-system sh
cd /app/data
sqlite3 fleet-inventory.db
```

## Data Persistence

All vehicle data, sold vehicles, trade-ins, and user accounts are stored in:
- **Location**: Docker volume `vehicle-database` mounted at `/app/data`
- **Database**: `fleet-inventory.db`
- **Backup**: Data persists across container restarts/rebuilds

## Network Access

The system is configured to work on your local network:
- Access from same computer: `http://localhost:8080`
- Access from other devices: `http://YOUR_IP:8080`
- Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

## Troubleshooting

**Can't login:**
- Check browser console for errors
- Verify backend is running: `docker logs vehicle-inventory-system`
- Test API: `curl http://localhost:3000/api/auth/status`

**Port already in use:**
```yaml
# Edit docker-compose.yml
ports:
  - "8081:80"  # Change 8080 to any available port
```

**Database not persisting:**
- Verify volume: `docker volume ls | grep vehicle-database`
- Check permissions: `docker exec vehicle-inventory-system ls -la /app/data`

## Project Structure

```
.
├── index.html              # Frontend HTML
├── app.js                  # Frontend JavaScript
├── server.js               # Backend API
├── package.json            # Node dependencies
├── Dockerfile              # Container build
├── docker-compose.yml      # Service orchestration
├── nginx.conf              # Web server config
└── start-services.sh       # Startup script
```

## Default User

**Username**: Zaid  
**Password**: 1234

## Security Notes

- Sessions expire after 24 hours
- Passwords are bcrypt hashed
- CORS configured for local network access
- For production: enable HTTPS, change default password, restrict CORS

## License

Proprietary - Brandon Tomes Subaru Fleet Department
