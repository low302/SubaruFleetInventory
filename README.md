# Vehicle Inventory Management System - Docker Setup

A modern, feature-rich vehicle inventory management system for dealerships, running in a Docker container with persistent storage.

## Features

- 🚗 Complete vehicle inventory management
- 📊 Dashboard with statistics and analytics
- 🚚 Track vehicles through different statuses (In-Stock, In-Transit, PDI, etc.)
- 💰 Sold vehicles tracking with customer information
- 🔄 Trade-in vehicle management
- 📅 Pickup scheduling system
- 🏷️ QR code label generation
- 📈 Analytics and reporting
- 💾 **Persistent data storage** via browser localStorage

## Prerequisites

- Docker installed on your system
- Docker Compose (usually included with Docker Desktop)

## Quick Start

### 1. Build and Run with Docker Compose (Recommended)

```bash
# Navigate to the project directory
cd vehicle-inventory

# Build and start the container
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

The application will be available at: **http://localhost:8080**

### 2. Build and Run with Docker Commands

```bash
# Build the image
docker build -t vehicle-inventory .

# Run the container
docker run -d \
  --name vehicle-inventory-system \
  -p 8080:80 \
  -v vehicle-data:/var/lib/nginx \
  vehicle-inventory
```

## Data Persistence

This application uses browser **localStorage** for data persistence. This means:

- ✅ All vehicle data, customer information, and settings are saved in your browser
- ✅ Data persists across page refreshes
- ✅ Data persists as long as you use the same browser
- ⚠️  Data is browser-specific (clearing browser data will remove it)
- ⚠️  Different browsers or incognito mode will have separate data

### Backing Up Your Data

Since data is stored in browser localStorage, you can:

1. **Export manually**: The browser's developer tools (F12) → Application → Local Storage
2. **Use browser export extensions**: Various browser extensions can export localStorage data
3. **Recommended**: Periodically export important records or customer data

## Container Management

### Stop the container
```bash
docker-compose down
# or
docker stop vehicle-inventory-system
```

### Restart the container
```bash
docker-compose restart
# or
docker restart vehicle-inventory-system
```

### View logs
```bash
docker-compose logs -f
# or
docker logs -f vehicle-inventory-system
```

### Remove container and volumes
```bash
docker-compose down -v
# or
docker rm -f vehicle-inventory-system
docker volume rm vehicle-data
```

## Configuration

### Change Port

Edit `docker-compose.yml` and modify the ports section:
```yaml
ports:
  - "YOUR_PORT:80"  # Change YOUR_PORT to desired port
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Timezone

The container is set to America/New_York timezone. To change it, edit `docker-compose.yml`:
```yaml
environment:
  - TZ=Your/Timezone  # e.g., America/Los_Angeles, Europe/London
```

## Usage Guide

### Adding Vehicles
1. Click the **+** button (bottom right)
2. Fill in vehicle details
3. Select initial status
4. Click "Add Vehicle"

### Managing Status
1. Click on any vehicle card
2. Click "Details"
3. Use the "Update Status" dropdown
4. Update customer information as needed

### Scheduling Pickups
1. Change vehicle status to "Pickup Scheduled"
2. Enter date and time
3. System will show on Dashboard

### Trade-Ins
1. When marking a vehicle as sold, select "Yes" for trade-in
2. Enter trade-in vehicle details
3. Track pickup status with checkbox

### Generating Labels
1. Click "Label" on any vehicle
2. Print, save as image, or copy to clipboard
3. Labels include QR codes with vehicle data

## Troubleshooting

### Container won't start
```bash
# Check if port 8080 is already in use
docker-compose down
docker-compose up -d
```

### Data not persisting
- Check that you're using the same browser
- Verify browser settings allow localStorage
- Ensure you're not in incognito/private mode

### Cannot access application
```bash
# Verify container is running
docker ps | grep vehicle-inventory

# Check logs for errors
docker logs vehicle-inventory-system

# Verify port is exposed
curl http://localhost:8080
```

## Development

To modify the application:

1. Edit `index.html` or `app.js`
2. Rebuild the container:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

## System Requirements

- **Minimum**: 512MB RAM, 100MB disk space
- **Recommended**: 1GB RAM, 500MB disk space
- **Browser**: Modern browser with JavaScript enabled (Chrome, Firefox, Safari, Edge)

## Security Notes

⚠️ **Important**: This application stores all data in the browser's localStorage:
- No server-side database
- No authentication system
- Suitable for single-user or trusted environment deployments
- For production use with multiple users, consider adding authentication
- Data is stored client-side - ensure browser security settings are appropriate

## License

This project is provided as-is for vehicle inventory management.

## Support

For issues or questions:
1. Check logs: `docker logs vehicle-inventory-system`
2. Verify Docker is running: `docker ps`
3. Ensure port 8080 is available

---

**Access your Vehicle Inventory System at: http://localhost:8080**
