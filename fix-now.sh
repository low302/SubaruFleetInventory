#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "EMERGENCY FIX - Restore Full index.html"
echo "=========================================="
echo ""

# This will restore the COMPLETE index.html with all UI elements

cat > index.html << 'HTML_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vehicle Inventory Management System</title>
    <link href="https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --bg-primary: #1a1a1a;
            --bg-glass: rgba(30, 30, 30, 0.8);
            --text-primary: #ffffff;
            --text-secondary: #a0a0a0;
            --accent: #0a84ff;
            --accent-hover: #409cff;
            --border: rgba(255, 255, 255, 0.1);
            --shadow: rgba(0, 0, 0, 0.5);
            --success: #30d158;
            --warning: #ff9f0a;
            --danger: #ff453a;
            --card-bg: rgba(30, 30, 30, 0.95);
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            color: var(--text-primary);
        }
        .login-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }
        .login-container {
            background: rgba(30, 30, 30, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 3rem;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .login-header h1 {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--accent);
            margin-bottom: 0.5rem;
        }
        .login-header p {
            font-size: 1rem;
            color: var(--text-secondary);
        }
        .login-error {
            color: var(--danger);
            font-size: 0.875rem;
            margin: 1rem 0;
            text-align: center;
            min-height: 1.25rem;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.875rem 1rem;
            font-size: 1rem;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: rgba(40, 40, 40, 0.6);
            transition: all 0.3s ease;
            font-family: inherit;
            color: var(--text-primary);
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 4px rgba(10, 132, 255, 0.2);
            background: rgba(40, 40, 40, 0.9);
        }
        .btn {
            background: var(--accent);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            font-size: 0.9rem;
            font-weight: 600;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(10, 132, 255, 0.4);
        }
        .btn:hover {
            background: var(--accent-hover);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(10, 132, 255, 0.5);
        }
        .btn-secondary {
            background: rgba(60, 60, 60, 0.8);
            color: var(--text-primary);
            box-shadow: none;
        }
        .btn-secondary:hover {
            background: rgba(70, 70, 70, 0.9);
        }
        .btn-danger {
            background: var(--danger);
            box-shadow: 0 4px 16px rgba(255, 69, 58, 0.4);
        }
        .btn-danger:hover {
            background: #ff6961;
        }
        .btn-small {
            padding: 0.5rem 1rem;
            font-size: 0.85rem;
            flex: 1;
        }
        #mainApp {
            width: 100%;
            height: 100vh;
            display: none;
        }
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 280px;
            height: 100vh;
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(20px);
            padding: 2rem;
            box-shadow: 2px 0 20px var(--shadow);
            z-index: 100;
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
        }
        .logo {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 3rem;
            color: var(--accent);
            line-height: 1.3;
        }
        .nav-menu {
            list-style: none;
        }
        .nav-item {
            margin-bottom: 0.5rem;
        }
        .nav-link {
            display: flex;
            align-items: center;
            padding: 0.875rem 1rem;
            color: var(--text-primary);
            text-decoration: none;
            border-radius: 12px;
            transition: all 0.3s ease;
            font-weight: 500;
            cursor: pointer;
        }
        .nav-link:hover {
            background: rgba(10, 132, 255, 0.15);
            color: var(--accent);
        }
        .nav-link.active {
            background: var(--accent);
            color: white;
        }
        .nav-icon {
            margin-right: 0.75rem;
            font-size: 1.25rem;
        }
        .main-content {
            margin-left: 280px;
            padding: 2rem;
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            margin-bottom: 2rem;
        }
        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: white;
            margin-bottom: 0.5rem;
        }
        .page {
            display: none;
        }
        .page.active {
            display: block;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: var(--bg-glass);
            backdrop-filter: blur(20px) saturate(180%);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 1.5rem;
            box-shadow: 0 8px 32px var(--shadow);
        }
        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        .stat-change {
            font-size: 0.875rem;
            margin-top: 0.5rem;
            font-weight: 500;
        }
        .card {
            background: var(--bg-glass);
            backdrop-filter: blur(20px) saturate(180%);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 8px 32px var(--shadow);
            padding: 2rem;
            margin-bottom: 2rem;
        }
        .card h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: var(--text-primary);
        }
        .vehicle-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1.5rem;
        }
        .vehicle-card {
            background: rgba(30, 30, 30, 0.95);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid var(--border);
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .vehicle-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
            border-color: rgba(10, 132, 255, 0.3);
        }
        .vehicle-header {
            background: linear-gradient(135deg, #0a84ff, #0051a8);
            color: white;
            padding: 1.5rem;
        }
        .vehicle-stock {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.25rem;
        }
        .vehicle-title {
            font-size: 1.125rem;
            font-weight: 500;
            opacity: 0.9;
        }
        .vehicle-body {
            padding: 1.5rem;
        }
        .vehicle-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .info-item {
            font-size: 0.875rem;
        }
        .info-label {
            color: var(--text-secondary);
            font-weight: 500;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
            margin-bottom: 0.25rem;
        }
        .info-value {
            color: var(--text-primary);
            font-weight: 600;
        }
        .vehicle-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border);
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(10px);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        .modal.active {
            display: flex;
        }
        .modal-content {
            background: rgba(25, 25, 25, 0.98);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 2.5rem;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        .modal-header h2 {
            font-size: 1.75rem;
            font-weight: 700;
        }
        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-secondary);
            transition: color 0.3s ease;
        }
        .close-btn:hover {
            color: var(--text-primary);
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        .fab {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: var(--accent);
            color: white;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            box-shadow: 0 8px 24px rgba(10, 132, 255, 0.5);
            transition: all 0.3s ease;
            z-index: 50;
        }
        .fab:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 32px rgba(10, 132, 255, 0.6);
        }
        .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            color: var(--text-secondary);
        }
        .empty-state-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.5;
        }
        .search-filter-bar {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        .search-box {
            flex: 1;
            min-width: 300px;
        }
        .search-box input {
            width: 100%;
            padding: 0.875rem 1rem;
            font-size: 1rem;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: rgba(40, 40, 40, 0.6);
            transition: all 0.3s ease;
            color: var(--text-primary);
        }
        .filter-group {
            display: flex;
            gap: 1rem;
        }
        .filter-select {
            padding: 0.875rem 1rem;
            font-size: 1rem;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: rgba(40, 40, 40, 0.6);
            cursor: pointer;
            transition: all 0.3s ease;
            color: var(--text-primary);
        }
        .pickup-list {
            list-style: none;
        }
        .pickup-item {
            background: rgba(40, 40, 40, 0.6);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .pickup-info {
            flex: 1;
        }
        .pickup-vehicle {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }
        .pickup-customer {
            font-size: 0.9rem;
            color: var(--text-secondary);
            margin-bottom: 0.25rem;
        }
        .pickup-datetime {
            font-size: 0.875rem;
            color: var(--accent);
            font-weight: 500;
        }
        .label {
            width: 192px;
            height: 192px;
            background: white;
            border: 2px solid #000;
            padding: 8px;
            font-family: 'Courier New', monospace;
            margin: 0 auto;
        }
        .label-header {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 2px solid #000;
            color: #000;
        }
        .label-content {
            display: flex;
            gap: 8px;
        }
        .label-info {
            flex: 1;
            font-size: 8px;
            line-height: 1.4;
            color: #000;
        }
        .label-qr {
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .chart-container {
            position: relative;
            height: 300px;
            margin-top: 1rem;
        }
        .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .checkbox-group input[type="checkbox"] {
            width: 20px;
            height: 20px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div id="loginScreen" class="login-screen">
        <div class="login-container">
            <div class="login-header">
                <h1>Brandon Tomes Subaru</h1>
                <p>Fleet Department</p>
            </div>
            <form id="loginForm">
                <div class="form-group">
                    <label for="loginUsername">Username</label>
                    <input type="text" id="loginUsername" required autofocus>
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" required>
                </div>
                <div id="loginError" class="login-error"></div>
                <button type="submit" class="btn" style="width: 100%;">Sign In</button>
            </form>
        </div>
    </div>

    <div id="mainApp" style="display: none;">
        <div class="sidebar">
            <div class="logo">
                <div>Brandon Tomes Subaru</div>
                <div style="font-size: 0.85em; margin-top: 0.25rem;">Fleet Department</div>
            </div>
            <ul class="nav-menu">
                <li class="nav-item">
                    <a class="nav-link active" data-page="dashboard">
                        <span class="nav-icon">📊</span>
                        Dashboard
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-page="inventory">
                        <span class="nav-icon">🚘</span>
                        Inventory
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-page="in-transit">
                        <span class="nav-icon">🚚</span>
                        In-Transit
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-page="pdi">
                        <span class="nav-icon">🔧</span>
                        PDI
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-page="pending-pickup">
                        <span class="nav-icon">⏳</span>
                        Pending Pickup
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-page="pickup-scheduled">
                        <span class="nav-icon">📅</span>
                        Pickup Scheduled
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-page="sold">
                        <span class="nav-icon">💰</span>
                        Sold Vehicles
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-page="tradeins">
                        <span class="nav-icon">🔄</span>
                        Trade-Ins
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-page="analytics">
                        <span class="nav-icon">📈</span>
                        Analytics
                    </a>
                </li>
            </ul>
            
            <div style="margin-top: auto; padding: 1rem 0; border-top: 1px solid var(--border);">
                <div style="text-align: center; margin-bottom: 1rem;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Logged in as</div>
                    <div id="currentUserDisplay" style="font-weight: 600; color: var(--accent); margin-top: 0.25rem;">User</div>
                </div>
            </div>
            
            <div style="padding-top: 1rem; border-top: 1px solid var(--border);">
                <button class="btn btn-danger" onclick="logout()" style="width: 100%;">
                    <span>🚪</span>
                    <span>Logout</span>
                </button>
            </div>
        </div>

        <div class="main-content">
            <div class="container">
                <div id="dashboard" class="page active">
                    <div class="header">
                        <h1>Dashboard</h1>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">Total Vehicles</div>
                            <div class="stat-value" id="totalVehicles">0</div>
                            <div class="stat-change">Active inventory</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">In Stock</div>
                            <div class="stat-value" id="inStockVehicles">0</div>
                            <div class="stat-change">Available</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Sold</div>
                            <div class="stat-value" id="soldVehicles">0</div>
                            <div class="stat-change">Total sold</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Trade-Ins</div>
                            <div class="stat-value" id="tradeInVehicles">0</div>
                            <div class="stat-change">Total</div>
                        </div>
                    </div>
                    <div class="card">
                        <h2>Scheduled Pickups</h2>
                        <div id="scheduledPickups"></div>
                    </div>
                    <div class="card">
                        <h2>Oldest Inventory</h2>
                        <div id="oldestVehicles" class="vehicle-grid"></div>
                    </div>
                </div>

                <div id="inventory" class="page">
                    <div class="header">
                        <h1>Vehicle Inventory</h1>
                    </div>
                    <div class="search-filter-bar">
                        <div class="search-box">
                            <input type="text" id="searchInput" placeholder="Search...">
                        </div>
                        <div class="filter-group">
                            <select id="makeFilter" class="filter-select">
                                <option value="">All Makes</option>
                            </select>
                            <select id="statusFilter" class="filter-select">
                                <option value="">All Status</option>
                            </select>
                        </div>
                    </div>
                    <div id="inventoryGrid" class="vehicle-grid"></div>
                </div>

                <div id="in-transit" class="page">
                    <div class="header"><h1>In-Transit</h1></div>
                    <div id="transitGrid" class="vehicle-grid"></div>
                </div>

                <div id="pdi" class="page">
                    <div class="header"><h1>PDI</h1></div>
                    <div id="pdiGrid" class="vehicle-grid"></div>
                </div>

                <div id="pending-pickup" class="page">
                    <div class="header"><h1>Pending Pickup</h1></div>
                    <div id="pendingPickupGrid" class="vehicle-grid"></div>
                </div>

                <div id="pickup-scheduled" class="page">
                    <div class="header"><h1>Pickup Scheduled</h1></div>
                    <div id="pickupScheduledGrid" class="vehicle-grid"></div>
                </div>

                <div id="sold" class="page">
                    <div class="header"><h1>Sold Vehicles</h1></div>
                    <div id="soldGrid" class="vehicle-grid"></div>
                </div>

                <div id="tradeins" class="page">
                    <div class="header"><h1>Trade-Ins</h1></div>
                    <div id="tradeInGrid" class="vehicle-grid"></div>
                </div>

                <div id="analytics" class="page">
                    <div class="header"><h1>Analytics</h1></div>
                    <div class="card">
                        <h2>Inventory by Make</h2>
                        <div class="chart-container">
                            <canvas id="makeChart"></canvas>
                        </div>
                    </div>
                    <div class="card">
                        <h2>Inventory Timeline</h2>
                        <div class="chart-container">
                            <canvas id="timelineChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <button class="fab" onclick="openAddModal()">+</button>

        <div id="addModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add New Vehicle</h2>
                    <button class="close-btn" onclick="closeAddModal()">&times;</button>
                </div>
                <form id="vehicleForm">
                    <div class="form-group">
                        <label for="stockNumber">Stock #</label>
                        <input type="text" id="stockNumber" required>
                    </div>
                    <div class="form-group">
                        <label for="vin">VIN</label>
                        <input type="text" id="vin" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="year">Year</label>
                            <input type="number" id="year" required>
                        </div>
                        <div class="form-group">
                            <label for="make">Make</label>
                            <input type="text" id="make" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="model">Model</label>
                            <input type="text" id="model" required>
                        </div>
                        <div class="form-group">
                            <label for="trim">Trim</label>
                            <input type="text" id="trim" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="color">Color</label>
                            <input type="text" id="color" required>
                        </div>
                        <div class="form-group">
                            <label for="fleetCompany">Fleet Company</label>
                            <input type="text" id="fleetCompany">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="status">Status</label>
                        <select id="status" required>
                            <option value="in-stock">In Stock</option>
                            <option value="in-transit">In-Transit</option>
                            <option value="pdi">PDI</option>
                            <option value="pending-pickup">Pending Pickup</option>
                            <option value="pickup-scheduled">Pickup Scheduled</option>
                            <option value="sold">Sold</option>
                        </select>
                    </div>
                    <button type="submit" class="btn" style="width: 100%;">Add Vehicle</button>
                </form>
            </div>
        </div>

        <div id="detailModal" class="modal">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>Vehicle Details</h2>
                    <button class="close-btn" onclick="closeDetailModal()">&times;</button>
                </div>
                <div id="detailContent"></div>
                <div style="margin-top: 2rem;">
                    <h3>Update Status</h3>
                    <div class="form-group">
                        <label for="detailStatus">Vehicle Status</label>
                        <select id="detailStatus" class="filter-select" style="width: 100%;">
                            <option value="in-stock">In Stock</option>
                            <option value="in-transit">In-Transit</option>
                            <option value="pdi">PDI</option>
                            <option value="pending-pickup">Pending Pickup</option>
                            <option value="pickup-scheduled">Pickup Scheduled</option>
                            <option value="sold">Sold</option>
                        </select>
                    </div>
                    <button class="btn btn-secondary" onclick="updateVehicleStatus()" style="width: 100%;">Update Status</button>
                </div>
                <div style="margin-top: 2rem;">
                    <h3>Customer Information</h3>
                    <form id="customerForm" onsubmit="saveCustomerInfo(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="customerFirstName">First Name</label>
                                <input type="text" id="customerFirstName">
                            </div>
                            <div class="form-group">
                                <label for="customerLastName">Last Name</label>
                                <input type="text" id="customerLastName">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="customerEmail">Email</label>
                            <input type="email" id="customerEmail">
                        </div>
                        <div class="form-group">
                            <label for="customerPhone">Phone</label>
                            <input type="tel" id="customerPhone">
                        </div>
                        <div class="form-group">
                            <label for="customerAddress">Address</label>
                            <input type="text" id="customerAddress">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="customerCity">City</label>
                                <input type="text" id="customerCity">
                            </div>
                            <div class="form-group">
                                <label for="customerState">State</label>
                                <input type="text" id="customerState">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="customerZip">ZIP</label>
                                <input type="text" id="customerZip">
                            </div>
                            <div class="form-group">
                                <label for="paymentType">Payment Type</label>
                                <input type="text" id="paymentType">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="saleDate">Sale Date</label>
                            <input type="date" id="saleDate">
                        </div>
                        <div class="form-group">
                            <label for="notes">Notes</label>
                            <textarea id="notes" rows="3"></textarea>
                        </div>
                        <button type="submit" class="btn" style="width: 100%;">Save Customer Info</button>
                    </form>
                </div>
            </div>
        </div>

        <div id="labelModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Vehicle Label</h2>
                    <button class="close-btn" onclick="closeLabelModal()">&times;</button>
                </div>
                <div style="text-align: center;">
                    <div class="label" id="label">
                        <div class="label-header" id="labelStockNumber"></div>
                        <div class="label-content">
                            <div class="label-info" id="labelInfo"></div>
                            <div class="label-qr" id="labelQR"></div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button class="btn btn-secondary" onclick="printLabel()" style="flex: 1;">Print</button>
                        <button class="btn btn-secondary" onclick="saveLabel()" style="flex: 1;">Save</button>
                        <button class="btn btn-secondary" onclick="copyLabel()" style="flex: 1;">Copy</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="tradeInModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Trade-In</h2>
                    <button class="close-btn" onclick="closeTradeInModal()">&times;</button>
                </div>
                <form id="tradeInForm">
                    <div class="form-group">
                        <label for="tradeStockNumber">Stock #</label>
                        <input type="text" id="tradeStockNumber">
                    </div>
                    <div class="form-group">
                        <label for="tradeVin">VIN</label>
                        <input type="text" id="tradeVin" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tradeYear">Year</label>
                            <input type="number" id="tradeYear" required>
                        </div>
                        <div class="form-group">
                            <label for="tradeMake">Make</label>
                            <input type="text" id="tradeMake" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tradeModel">Model</label>
                            <input type="text" id="tradeModel" required>
                        </div>
                        <div class="form-group">
                            <label for="tradeTrim">Trim</label>
                            <input type="text" id="tradeTrim">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="tradeColor">Color</label>
                            <input type="text" id="tradeColor" required>
                        </div>
                        <div class="form-group">
                            <label for="tradeMileage">Mileage</label>
                            <input type="number" id="tradeMileage">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="tradeNotes">Notes</label>
                        <textarea id="tradeNotes" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn" style="width: 100%;">Add Trade-In</button>
                </form>
            </div>
        </div>

        <div id="tradePickupModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Trade-In Pickup Date</h2>
                    <button class="close-btn" onclick="closeTradePickupModal()">&times;</button>
                </div>
                <form id="tradePickupForm">
                    <div class="form-group">
                        <label for="tradePickupDate">Pickup Date</label>
                        <input type="date" id="tradePickupDate" required>
                    </div>
                    <button type="submit" class="btn" style="width: 100%;">Confirm Pickup</button>
                </form>
            </div>
        </div>

        <div id="pickupScheduleModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Schedule Pickup</h2>
                    <button class="close-btn" onclick="closePickupScheduleModal()">&times;</button>
                </div>
                <form id="pickupScheduleForm">
                    <div class="form-group">
                        <label for="pickupDate">Pickup Date</label>
                        <input type="date" id="pickupDate" required>
                    </div>
                    <div class="form-group">
                        <label for="pickupTime">Pickup Time</label>
                        <input type="time" id="pickupTime" required>
                    </div>
                    <div class="form-group">
                        <label for="pickupNotes">Notes</label>
                        <textarea id="pickupNotes" rows="3"></textarea>
                    </div>
                    <button type="submit" class="btn" style="width: 100%;">Schedule Pickup</button>
                </form>
            </div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>
HTML_EOF

echo -e "${GREEN}✓ Full index.html created${NC}"
echo ""

# Rebuild
echo -e "${YELLOW}Rebuilding container...${NC}"
docker compose down
docker compose build --no-cache
docker compose up -d
echo ""

sleep 5

echo "=========================================="
echo -e "${GREEN}✓ FIXED!${NC}"
echo "=========================================="
echo ""
echo "Test at: http://10.168.12.50:8080"
echo "Login: Zaid / 1234"
echo ""
echo "Hard refresh browser: Ctrl+Shift+R"
echo ""

