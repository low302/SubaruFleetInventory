const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Middleware - FIXED CORS CONFIGURATION
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        // Allow localhost on any port (development)
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        // In production, you would specify exact origins
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// FIXED SESSION CONFIGURATION
app.use(session({
    secret: 'brandon-tomes-subaru-fleet-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,      // Set to true only if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax',    // Works for same-origin requests through nginx
        path: '/'           // Explicit path
    },
    name: 'fleet.sid'       // Custom session name for easier debugging
}));

// Debug middleware (comment out in production)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('Session ID:', req.sessionID);
    console.log('User ID:', req.session?.userId);
    next();
});

// Initialize SQLite database
const db = new sqlite3.Database('./fleet-inventory.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Inventory table
        db.run(`CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY,
            stockNumber TEXT NOT NULL,
            vin TEXT NOT NULL,
            year INTEGER NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            trim TEXT NOT NULL,
            color TEXT NOT NULL,
            fleetCompany TEXT,
            status TEXT NOT NULL,
            dateAdded DATETIME NOT NULL,
            customer TEXT,
            documents TEXT,
            pickupDate TEXT,
            pickupTime TEXT,
            pickupNotes TEXT,
            tradeInId INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Sold Vehicles table
        db.run(`CREATE TABLE IF NOT EXISTS sold_vehicles (
            id INTEGER PRIMARY KEY,
            stockNumber TEXT NOT NULL,
            vin TEXT NOT NULL,
            year INTEGER NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            trim TEXT NOT NULL,
            color TEXT NOT NULL,
            fleetCompany TEXT,
            status TEXT NOT NULL,
            dateAdded DATETIME NOT NULL,
            customer TEXT,
            documents TEXT,
            tradeInId INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Trade-Ins (Fleet Returns) table
        db.run(`CREATE TABLE IF NOT EXISTS trade_ins (
            id INTEGER PRIMARY KEY,
            stockNumber TEXT,
            vin TEXT NOT NULL,
            year INTEGER NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            trim TEXT,
            color TEXT NOT NULL,
            mileage INTEGER,
            notes TEXT,
            pickedUp INTEGER DEFAULT 0,
            pickedUpDate TEXT,
            dateAdded DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create default admin user (username: Zaid, password: 1234)
        const hashedPassword = bcrypt.hashSync('1234', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, 
            ['Zaid', hashedPassword],
            (err) => {
                if (err) {
                    console.error('Error creating default user:', err);
                } else {
                    console.log('Default admin user created/verified (username: Zaid, password: 1234)');
                }
            }
        );
    });
}

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    console.log('Authentication failed - no session or userId');
    res.status(401).json({ error: 'Not authenticated' });
}

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('Login attempt:', username);

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.status(500).json({ error: 'Authentication error' });
            }

            if (!isMatch) {
                console.log('Password mismatch for user:', username);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Set session data
            req.session.userId = user.id;
            req.session.username = user.username;
            
            // Save session explicitly before responding
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Session creation failed' });
                }
                
                console.log('Login successful for user:', username, 'Session ID:', req.sessionID);
                res.json({ success: true, username: user.username });
            });
        });
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    console.log('Logout request for session:', req.sessionID);
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('fleet.sid');
        console.log('Logout successful');
        res.json({ success: true });
    });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
    console.log('Auth status check - Session ID:', req.sessionID, 'User ID:', req.session?.userId);
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// ==================== INVENTORY ROUTES ====================

// Get all inventory
app.get('/api/inventory', isAuthenticated, (req, res) => {
    db.all('SELECT * FROM inventory ORDER BY dateAdded DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching inventory:', err);
            return res.status(500).json({ error: err.message });
        }
        // Parse JSON fields
        const inventory = rows.map(row => ({
            ...row,
            customer: row.customer ? JSON.parse(row.customer) : null,
            documents: row.documents ? JSON.parse(row.documents) : []
        }));
        res.json(inventory);
    });
});

// Add vehicle to inventory
app.post('/api/inventory', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `INSERT INTO inventory 
        (id, stockNumber, vin, year, make, model, trim, color, fleetCompany, status, dateAdded, customer, documents)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        vehicle.id,
        vehicle.stockNumber,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.color,
        vehicle.fleetCompany || '',
        vehicle.status,
        vehicle.dateAdded,
        vehicle.customer ? JSON.stringify(vehicle.customer) : null,
        vehicle.documents ? JSON.stringify(vehicle.documents) : '[]'
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error adding vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Vehicle added successfully, ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

// Update vehicle
app.put('/api/inventory/:id', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `UPDATE inventory SET 
        stockNumber = ?, vin = ?, year = ?, make = ?, model = ?, trim = ?, 
        color = ?, fleetCompany = ?, status = ?, customer = ?, documents = ?,
        pickupDate = ?, pickupTime = ?, pickupNotes = ?, tradeInId = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;
    
    const params = [
        vehicle.stockNumber,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.color,
        vehicle.fleetCompany || '',
        vehicle.status,
        vehicle.customer ? JSON.stringify(vehicle.customer) : null,
        vehicle.documents ? JSON.stringify(vehicle.documents) : '[]',
        vehicle.pickupDate || null,
        vehicle.pickupTime || null,
        vehicle.pickupNotes || null,
        vehicle.tradeInId || null,
        vehicle.id
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error updating vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Vehicle updated successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// Delete vehicle
app.delete('/api/inventory/:id', isAuthenticated, (req, res) => {
    db.run('DELETE FROM inventory WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            console.error('Error deleting vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Vehicle deleted successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// ==================== SOLD VEHICLES ROUTES ====================

// Get all sold vehicles
app.get('/api/sold-vehicles', isAuthenticated, (req, res) => {
    db.all('SELECT * FROM sold_vehicles ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching sold vehicles:', err);
            return res.status(500).json({ error: err.message });
        }
        const soldVehicles = rows.map(row => ({
            ...row,
            customer: row.customer ? JSON.parse(row.customer) : null,
            documents: row.documents ? JSON.parse(row.documents) : []
        }));
        res.json(soldVehicles);
    });
});

// Add sold vehicle
app.post('/api/sold-vehicles', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `INSERT INTO sold_vehicles 
        (id, stockNumber, vin, year, make, model, trim, color, fleetCompany, status, dateAdded, customer, documents, tradeInId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        vehicle.id,
        vehicle.stockNumber,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.color,
        vehicle.fleetCompany || '',
        vehicle.status,
        vehicle.dateAdded,
        vehicle.customer ? JSON.stringify(vehicle.customer) : null,
        vehicle.documents ? JSON.stringify(vehicle.documents) : '[]',
        vehicle.tradeInId || null
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error adding sold vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Sold vehicle added successfully, ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

// ==================== TRADE-INS (FLEET RETURNS) ROUTES ====================

// Get all trade-ins
app.get('/api/trade-ins', isAuthenticated, (req, res) => {
    db.all('SELECT * FROM trade_ins ORDER BY dateAdded DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching trade-ins:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Add trade-in
app.post('/api/trade-ins', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `INSERT INTO trade_ins 
        (id, stockNumber, vin, year, make, model, trim, color, mileage, notes, pickedUp, pickedUpDate, dateAdded)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
        vehicle.id,
        vehicle.stockNumber || null,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim || '',
        vehicle.color,
        vehicle.mileage || null,
        vehicle.notes || '',
        vehicle.pickedUp ? 1 : 0,
        vehicle.pickedUpDate || null,
        vehicle.dateAdded
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error adding trade-in:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Trade-in added successfully, ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

// Update trade-in
app.put('/api/trade-ins/:id', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `UPDATE trade_ins SET 
        stockNumber = ?, vin = ?, year = ?, make = ?, model = ?, trim = ?,
        color = ?, mileage = ?, notes = ?, pickedUp = ?, pickedUpDate = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;
    
    const params = [
        vehicle.stockNumber || null,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim || '',
        vehicle.color,
        vehicle.mileage || null,
        vehicle.notes || '',
        vehicle.pickedUp ? 1 : 0,
        vehicle.pickedUpDate || null,
        vehicle.id
    ];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error updating trade-in:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Trade-in updated successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// Delete trade-in
app.delete('/api/trade-ins/:id', isAuthenticated, (req, res) => {
    db.run('DELETE FROM trade_ins WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            console.error('Error deleting trade-in:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Trade-in deleted successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`===========================================`);
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Default login: username=Zaid, password=1234`);
    console.log(`===========================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});
