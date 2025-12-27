# Database Migration: Add inStockDate Column

This migration adds the `inStockDate` column to both the `inventory` and `sold_vehicles` tables.

## Instructions (Docker Environment)

### Step 1: Find your container name
First, find the name of your running container:

```bash
docker ps
```

Look for the container running your fleet inventory app. The name might be something like `subarufleetinventory_app_1` or similar.

### Step 2: Copy migration script to container
Copy the migration script into your running container:

```bash
docker cp migrate-add-inStockDate.js <container_name>:/app/
```

Replace `<container_name>` with your actual container name from Step 1.

### Step 3: Run the migration inside the container
Execute the migration script inside the container:

```bash
docker exec <container_name> node migrate-add-inStockDate.js
```

### Step 4: Verify the migration
You should see output like this:

```
Starting database migration to add inStockDate column...
Database path: /app/fleet-inventory.db
Connected to database successfully
Adding inStockDate column to inventory table...
✓ Successfully added inStockDate to inventory table
✓ Updated existing inventory records with dateAdded values
Adding inStockDate column to sold_vehicles table...
✓ Successfully added inStockDate to sold_vehicles table
✓ Updated existing sold_vehicles records with dateAdded values

✓ Migration completed successfully!
You can now restart your server.
```

### Step 5: Restart the container
Restart your Docker container:

```bash
docker restart <container_name>
```

## Alternative: Using docker-compose

If you're using docker-compose, you can also do it this way:

### Step 1: Copy the migration script
```bash
docker-compose cp migrate-add-inStockDate.js app:/app/
```

### Step 2: Run the migration
```bash
docker-compose exec app node migrate-add-inStockDate.js
```

### Step 3: Restart
```bash
docker-compose restart app
```

## What this migration does

1. **Adds `inStockDate` column** to the `inventory` table
2. **Adds `inStockDate` column** to the `sold_vehicles` table
3. **Backfills existing records** - Sets `inStockDate` to the same value as `dateAdded` for all existing vehicles
4. **Safe to run multiple times** - The script checks if columns already exist before adding them

## After migration

Once the migration is complete:
- You can set custom "In Stock Date" when adding new vehicles
- You can edit the "In Stock Date" for existing vehicles in the detail modal
- The dashboard's "Oldest Units" and "Newest Units" will use `inStockDate` instead of `dateAdded`
- All existing vehicles will have their `inStockDate` set to their original `dateAdded` value

## Troubleshooting

**If you get a "module not found" error for sqlite3:**
```bash
npm install sqlite3
```

**If the migration fails:**
1. Make sure the database file exists at `fleet-inventory.db`
2. Make sure no other process is using the database
3. Check that you have write permissions to the database file
