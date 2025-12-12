// Migration script to add operationCompany column to existing database
// Run this ONCE to update your database schema

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath);

console.log('Starting migration to add operationCompany column...');

db.serialize(() => {
    // Add operationCompany column to inventory table
    db.run(`ALTER TABLE inventory ADD COLUMN operationCompany TEXT DEFAULT ''`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✓ inventory table already has operationCompany column');
            } else {
                console.error('Error adding operationCompany to inventory:', err.message);
            }
        } else {
            console.log('✓ Added operationCompany column to inventory table');
        }
    });

    // Add operationCompany column to sold_vehicles table
    db.run(`ALTER TABLE sold_vehicles ADD COLUMN operationCompany TEXT DEFAULT ''`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✓ sold_vehicles table already has operationCompany column');
            } else {
                console.error('Error adding operationCompany to sold_vehicles:', err.message);
            }
        } else {
            console.log('✓ Added operationCompany column to sold_vehicles table');
        }
    });

    console.log('\nMigration complete! You can now restart your server.');
});

db.close();
