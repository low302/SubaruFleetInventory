# Database Migration: Add inStockDate Column

This migration adds the `inStockDate` column to both the `inventory` and `sold_vehicles` tables.

## Instructions

### Step 1: Stop your server
Make sure your Node.js server is stopped before running the migration.

```bash
# Press Ctrl+C in the terminal running your server
```

### Step 2: Run the migration
From the project directory, run:

```bash
node migrate-add-inStockDate.js
```

### Step 3: Verify the migration
You should see output like this:

```
Starting database migration to add inStockDate column...
Database path: /Users/zaidalia/Documents/GitHub/SubaruFleetInventory/fleet-inventory.db
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

### Step 4: Restart your server
Start your server again:

```bash
node server.js
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
