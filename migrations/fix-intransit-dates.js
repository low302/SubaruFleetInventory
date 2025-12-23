// One-time script to clear in-stock dates for all in-transit vehicles
// Run this with: node fix-intransit-dates.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Update this path if your database is in a different location
const dbPath = '/app/data/fleet.db';

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        console.log('\nIf running locally, the database might be in a different location.');
        console.log('Check your docker-compose.yml or server.js for the correct path.');
        process.exit(1);
    }
    console.log('Connected to the database.');
});

// Clear in-stock dates for all in-transit vehicles
db.run(
    `UPDATE inventory SET inStockDate = NULL WHERE status = 'in-transit'`,
    function(err) {
        if (err) {
            console.error('Error updating vehicles:', err.message);
            process.exit(1);
        }

        console.log(`✅ Successfully cleared in-stock dates for ${this.changes} in-transit vehicle(s)`);

        // Show the updated vehicles
        db.all(
            `SELECT id, stockNumber, vin, status, inStockDate FROM inventory WHERE status = 'in-transit'`,
            [],
            (err, rows) => {
                if (err) {
                    console.error('Error fetching vehicles:', err.message);
                } else if (rows.length > 0) {
                    console.log('\nIn-transit vehicles after update:');
                    rows.forEach(row => {
                        console.log(`  - Stock #${row.stockNumber} (VIN: ${row.vin}) - In-Stock Date: ${row.inStockDate || 'NULL ✓'}`);
                    });
                } else {
                    console.log('\nNo in-transit vehicles found.');
                }

                db.close();
            }
        );
    }
);
