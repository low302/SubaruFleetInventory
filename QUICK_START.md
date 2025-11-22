# Vehicle Inventory System - Quick Reference

## 🚀 Quick Start

```bash
# Option 1: Use the start script (easiest)
./start.sh

# Option 2: Use docker-compose directly
docker-compose up -d

# Option 3: Use docker commands
docker build -t vehicle-inventory .
docker run -d --name vehicle-inventory-system -p 8080:80 vehicle-inventory
```

**Access at:** http://localhost:8080

## 📋 Common Commands

| Action | Command |
|--------|---------|
| **Start** | `docker-compose up -d` |
| **Stop** | `docker-compose down` |
| **Restart** | `docker-compose restart` |
| **View Logs** | `docker-compose logs -f` |
| **Check Status** | `docker-compose ps` |
| **Rebuild** | `docker-compose up -d --build` |

## 📁 Project Structure

```
vehicle-inventory/
├── index.html          # Main HTML file
├── app.js             # JavaScript application
├── Dockerfile         # Docker image configuration
├── docker-compose.yml # Docker Compose configuration
├── start.sh          # Quick start script
├── README.md         # Full documentation
└── .dockerignore     # Files to exclude from build
```

## 🔧 Configuration

### Change Port
Edit `docker-compose.yml`:
```yaml
ports:
  - "YOUR_PORT:80"  # Change 8080 to your preferred port
```

### Change Timezone
Edit `docker-compose.yml`:
```yaml
environment:
  - TZ=America/Los_Angeles  # Your timezone
```

## 💾 Data Persistence

- **Storage:** Browser localStorage (client-side)
- **Location:** Your browser's local storage
- **Backup:** Use browser dev tools or export extensions
- **Note:** Data is browser-specific

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Use a different port in docker-compose.yml
ports:
  - "8081:80"  # or any other available port
```

### Can't Access Application
```bash
# Check container status
docker ps | grep vehicle-inventory

# View logs
docker logs vehicle-inventory-system

# Restart container
docker-compose restart
```

### Container Won't Start
```bash
# Check Docker is running
docker info

# Remove old container and restart
docker-compose down
docker-compose up -d
```

## 🎯 Key Features

- ✅ Vehicle inventory tracking
- ✅ Multiple status stages
- ✅ Customer management
- ✅ Trade-in tracking
- ✅ Pickup scheduling
- ✅ QR code labels
- ✅ Analytics dashboard
- ✅ Persistent storage

## 📱 Browser Compatibility

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ❌ Internet Explorer (not supported)

## 🔐 Security Notes

- Single-user system (no authentication)
- Data stored client-side only
- Suitable for trusted environments
- Consider adding auth for multi-user deployments

## 📞 Support

1. Check README.md for detailed documentation
2. View container logs: `docker logs vehicle-inventory-system`
3. Verify Docker status: `docker ps`

---

**Quick Access:** http://localhost:8080 (after starting)
