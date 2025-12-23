const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to your database file
const DB_PATH = path.join(__dirname, 'data', 'fleet-inventory.db');

console.log('Starting database migration to add inStockDate column...');
console.log('Database path:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to database successfully');
});

// Run migrations in sequence
db.serialize(() => {
    // Check if column exists in inventory table
    db.all("PRAGMA table_info(inventory)", (err, columns) => {
        if (err) {
            console.error('Error checking inventory table:', err.message);
            db.close();
            return;
        }

        const hasInStockDate = columns.some(col => col.name === 'inStockDate');

        if (!hasInStockDate) {
            console.log('Adding inStockDate column to inventory table...');
            db.run(`ALTER TABLE inventory ADD COLUMN inStockDate TEXT`, (err) => {
                if (err) {
                    console.error('Error adding inStockDate to inventory:', err.message);
                } else {
                    console.log('✓ Successfully added inStockDate to inventory table');

                    // Set inStockDate to dateAdded for existing records
                    db.run(`UPDATE inventory SET inStockDate = dateAdded WHERE inStockDate IS NULL`, (err) => {
                        if (err) {
                            console.error('Error updating existing inventory records:', err.message);
                        } else {
                            console.log('✓ Updated existing inventory records with dateAdded values');
                        }
                    });
                }
            });
        } else {
            console.log('✓ inStockDate column already exists in inventory table');
        }
    });

    // Check if column exists in sold_vehicles table
    db.all("PRAGMA table_info(sold_vehicles)", (err, columns) => {
        if (err) {
            console.error('Error checking sold_vehicles table:', err.message);
            db.close();
            return;
        }

        const hasInStockDate = columns.some(col => col.name === 'inStockDate');

        if (!hasInStockDate) {
            console.log('Adding inStockDate column to sold_vehicles table...');
            db.run(`ALTER TABLE sold_vehicles ADD COLUMN inStockDate TEXT`, (err) => {
                if (err) {
                    console.error('Error adding inStockDate to sold_vehicles:', err.message);
                } else {
                    console.log('✓ Successfully added inStockDate to sold_vehicles table');

                    // Set inStockDate to dateAdded for existing records
                    db.run(`UPDATE sold_vehicles SET inStockDate = dateAdded WHERE inStockDate IS NULL`, (err) => {
                        if (err) {
                            console.error('Error updating existing sold_vehicles records:', err.message);
                        } else {
                            console.log('✓ Updated existing sold_vehicles records with dateAdded values');
                        }

                        // Close database after all operations
                        setTimeout(() => {
                            db.close((err) => {
                                if (err) {
                                    console.error('Error closing database:', err.message);
                                } else {
                                    console.log('\n✓ Migration completed successfully!');
                                    console.log('You can now restart your server.');
                                }
                            });
                        }, 500);
                    });
                }
            });
        } else {
            console.log('✓ inStockDate column already exists in sold_vehicles table');

            // Close database
            setTimeout(() => {
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    } else {
                        console.log('\n✓ Migration check completed!');
                        console.log('All columns already exist. No changes needed.');
                    }
                });
            }, 500);
        }
    });
});
