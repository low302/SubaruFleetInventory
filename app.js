let inventory = JSON.parse(localStorage.getItem('vehicleInventory')) || [];
let soldVehicles = JSON.parse(localStorage.getItem('soldVehicles')) || [];
let tradeIns = JSON.parse(localStorage.getItem('tradeIns')) || [];
let currentVehicle = null;
let makeChart = null;
let timelineChart = null;

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    renderInventory();
    renderInTransit();
    renderPDI();
    renderPendingPickup();
    renderPickupScheduled();
    renderSoldVehicles();
    renderTradeIns();
    setupNavigation();
    setupSearch();
    updateStats();
});

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.dataset.page;
            
            // Update active states
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show page
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById(pageName).classList.add('active');
            
            // Render page-specific content
            if (pageName === 'analytics') {
                renderAnalytics();
            }
        });
    });
}

// Search and Filter
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const makeFilter = document.getElementById('makeFilter');
    const statusFilter = document.getElementById('statusFilter');

    searchInput.addEventListener('input', renderInventory);
    makeFilter.addEventListener('change', renderInventory);
    statusFilter.addEventListener('change', renderInventory);

    // Populate make filter
    const makes = [...new Set(inventory.filter(v => v.status !== 'sold').map(v => v.make))];
    makes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeFilter.appendChild(option);
    });

    // Sold vehicles search
    const soldSearchInput = document.getElementById('soldSearchInput');
    const soldMakeFilter = document.getElementById('soldMakeFilter');

    if (soldSearchInput) soldSearchInput.addEventListener('input', renderSoldVehicles);
    if (soldMakeFilter) soldMakeFilter.addEventListener('change', renderSoldVehicles);

    // Trade-ins search
    const tradeInSearchInput = document.getElementById('tradeInSearchInput');
    const tradeInMakeFilter = document.getElementById('tradeInMakeFilter');

    if (tradeInSearchInput) tradeInSearchInput.addEventListener('input', renderTradeIns);
    if (tradeInMakeFilter) tradeInMakeFilter.addEventListener('change', renderTradeIns);

    // In-Transit search
    const transitSearchInput = document.getElementById('transitSearchInput');
    const transitMakeFilter = document.getElementById('transitMakeFilter');

    if (transitSearchInput) transitSearchInput.addEventListener('input', renderInTransit);
    if (transitMakeFilter) transitMakeFilter.addEventListener('change', renderInTransit);

    // PDI search
    const pdiSearchInput = document.getElementById('pdiSearchInput');
    const pdiMakeFilter = document.getElementById('pdiMakeFilter');

    if (pdiSearchInput) pdiSearchInput.addEventListener('input', renderPDI);
    if (pdiMakeFilter) pdiMakeFilter.addEventListener('change', renderPDI);

    // Pending Pickup search
    const pendingPickupSearchInput = document.getElementById('pendingPickupSearchInput');
    const pendingPickupMakeFilter = document.getElementById('pendingPickupMakeFilter');

    if (pendingPickupSearchInput) pendingPickupSearchInput.addEventListener('input', renderPendingPickup);
    if (pendingPickupMakeFilter) pendingPickupMakeFilter.addEventListener('change', renderPendingPickup);

    // Pickup Scheduled search
    const pickupScheduledSearchInput = document.getElementById('pickupScheduledSearchInput');
    const pickupScheduledMakeFilter = document.getElementById('pickupScheduledMakeFilter');

    if (pickupScheduledSearchInput) pickupScheduledSearchInput.addEventListener('input', renderPickupScheduled);
    if (pickupScheduledMakeFilter) pickupScheduledMakeFilter.addEventListener('change', renderPickupScheduled);
}

// Add Vehicle
document.getElementById('vehicleForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const vehicle = {
        id: Date.now(),
        stockNumber: document.getElementById('stockNumber').value,
        vin: document.getElementById('vin').value,
        year: document.getElementById('year').value,
        make: document.getElementById('make').value,
        model: document.getElementById('model').value,
        trim: document.getElementById('trim').value,
        color: document.getElementById('color').value,
        fleetCompany: document.getElementById('fleetCompany').value,
        status: document.getElementById('status').value,
        dateAdded: new Date().toISOString(),
        customer: null
    };

    inventory.unshift(vehicle);
    localStorage.setItem('vehicleInventory', JSON.stringify(inventory));
    
    closeAddModal();
    this.reset();
    renderDashboard();
    renderInventory();
    updateStats();
    
    // Update make filter
    const makeFilter = document.getElementById('makeFilter');
    if (![...makeFilter.options].some(opt => opt.value === vehicle.make)) {
        const option = document.createElement('option');
        option.value = vehicle.make;
        option.textContent = vehicle.make;
        makeFilter.appendChild(option);
    }
});

// Render Dashboard
function renderDashboard() {
    // Render scheduled pickups
    const pickupScheduledVehicles = inventory.filter(v => v.status === 'pickup-scheduled');
    const pickupsContainer = document.getElementById('scheduledPickups');
    
    if (pickupScheduledVehicles.length === 0) {
        pickupsContainer.innerHTML = '<div class="empty-state" style="padding: 2rem;"><p>No scheduled pickups</p></div>';
    } else {
        // Sort by pickup date/time
        const sortedPickups = pickupScheduledVehicles.sort((a, b) => {
            const dateA = new Date(`${a.pickupDate}T${a.pickupTime}`);
            const dateB = new Date(`${b.pickupDate}T${b.pickupTime}`);
            return dateA - dateB;
        });
        
        pickupsContainer.innerHTML = '<ul class="pickup-list">' + sortedPickups.map(vehicle => {
            const pickupDateTime = new Date(`${vehicle.pickupDate}T${vehicle.pickupTime}`);
            const formattedDate = pickupDateTime.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            const formattedTime = pickupDateTime.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit'
            });
            
            const customerName = vehicle.customer?.firstName || vehicle.customer?.lastName 
                ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim()
                : 'Customer not set';
            
            return `
                <li class="pickup-item">
                    <div class="pickup-info">
                        <div class="pickup-vehicle">${vehicle.year} ${vehicle.make} ${vehicle.model} - #${vehicle.stockNumber}</div>
                        <div class="pickup-customer">👤 ${customerName}</div>
                        <div class="pickup-datetime">📅 ${formattedDate} at ${formattedTime}</div>
                    </div>
                    <button class="btn btn-small btn-secondary" onclick="viewDetails(${vehicle.id})">View</button>
                </li>
            `;
        }).join('') + '</ul>';
    }
    
    // Get oldest vehicles (sorted by dateAdded, ascending)
    const activeInventory = inventory.filter(v => v.status !== 'sold');
    const oldestVehicles = [...activeInventory].sort((a, b) => 
        new Date(a.dateAdded) - new Date(b.dateAdded)
    ).slice(0, 6);
    
    const container = document.getElementById('oldestVehicles');
    
    if (oldestVehicles.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><p>No vehicles in inventory yet</p></div>';
        return;
    }
    
    container.innerHTML = oldestVehicles.map(vehicle => createVehicleCard(vehicle)).join('');
}

// Render Inventory
function renderInventory() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const makeFilter = document.getElementById('makeFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    // Filter out sold vehicles from main inventory
    let filtered = inventory.filter(vehicle => {
        if (vehicle.status === 'sold') return false;
        
        const matchesSearch = !searchTerm || 
            vehicle.stockNumber.toLowerCase().includes(searchTerm) ||
            vehicle.vin.toLowerCase().includes(searchTerm) ||
            vehicle.make.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm);
        
        const matchesMake = !makeFilter || vehicle.make === makeFilter;
        const matchesStatus = !statusFilter || vehicle.status === statusFilter;
        
        return matchesSearch && matchesMake && matchesStatus;
    });
    
    const container = document.getElementById('inventoryGrid');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No vehicles found</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(vehicle => createVehicleCard(vehicle)).join('');
}

// Render Sold Vehicles
function renderSoldVehicles() {
    const searchTerm = document.getElementById('soldSearchInput')?.value.toLowerCase() || '';
    const makeFilter = document.getElementById('soldMakeFilter')?.value || '';
    
    let filtered = soldVehicles.filter(vehicle => {
        const matchesSearch = !searchTerm || 
            vehicle.stockNumber.toLowerCase().includes(searchTerm) ||
            vehicle.vin.toLowerCase().includes(searchTerm) ||
            vehicle.make.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm);
        
        const matchesMake = !makeFilter || vehicle.make === makeFilter;
        
        return matchesSearch && matchesMake;
    });
    
    const container = document.getElementById('soldGrid');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><p>No sold vehicles yet</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(vehicle => createSoldVehicleCard(vehicle)).join('');
    
    // Populate make filter
    const makeFilterEl = document.getElementById('soldMakeFilter');
    const makes = [...new Set(soldVehicles.map(v => v.make))];
    makeFilterEl.innerHTML = '<option value="">All Makes</option>';
    makes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeFilterEl.appendChild(option);
    });
}

// Render Trade-Ins
function renderTradeIns() {
    const searchTerm = document.getElementById('tradeInSearchInput')?.value.toLowerCase() || '';
    const makeFilter = document.getElementById('tradeInMakeFilter')?.value || '';
    
    let filtered = tradeIns.filter(vehicle => {
        const matchesSearch = !searchTerm || 
            (vehicle.stockNumber && vehicle.stockNumber.toLowerCase().includes(searchTerm)) ||
            vehicle.vin.toLowerCase().includes(searchTerm) ||
            vehicle.make.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm);
        
        const matchesMake = !makeFilter || vehicle.make === makeFilter;
        
        return matchesSearch && matchesMake;
    });
    
    // Sort: non-picked-up first, then picked-up at the bottom
    filtered.sort((a, b) => {
        if (a.pickedUp && !b.pickedUp) return 1;
        if (!a.pickedUp && b.pickedUp) return -1;
        // If both have same picked up status, sort by date added (newest first)
        return new Date(b.dateAdded) - new Date(a.dateAdded);
    });
    
    const container = document.getElementById('tradeInGrid');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔄</div><p>No trade-ins yet</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(vehicle => createTradeInCard(vehicle)).join('');
    
    // Populate make filter
    const makeFilterEl = document.getElementById('tradeInMakeFilter');
    const makes = [...new Set(tradeIns.map(v => v.make))];
    makeFilterEl.innerHTML = '<option value="">All Makes</option>';
    makes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeFilterEl.appendChild(option);
    });
}

// Render In-Transit
function renderInTransit() {
    const searchTerm = document.getElementById('transitSearchInput')?.value.toLowerCase() || '';
    const makeFilter = document.getElementById('transitMakeFilter')?.value || '';
    
    let filtered = inventory.filter(vehicle => {
        if (vehicle.status !== 'in-transit') return false;
        
        const matchesSearch = !searchTerm || 
            vehicle.stockNumber.toLowerCase().includes(searchTerm) ||
            vehicle.vin.toLowerCase().includes(searchTerm) ||
            vehicle.make.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm);
        
        const matchesMake = !makeFilter || vehicle.make === makeFilter;
        
        return matchesSearch && matchesMake;
    });
    
    const container = document.getElementById('transitGrid');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚚</div><p>No vehicles in transit</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(vehicle => createVehicleCard(vehicle)).join('');
    
    // Populate make filter
    const makeFilterEl = document.getElementById('transitMakeFilter');
    const makes = [...new Set(inventory.filter(v => v.status === 'in-transit').map(v => v.make))];
    makeFilterEl.innerHTML = '<option value="">All Makes</option>';
    makes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeFilterEl.appendChild(option);
    });
}

// Render PDI
function renderPDI() {
    const searchTerm = document.getElementById('pdiSearchInput')?.value.toLowerCase() || '';
    const makeFilter = document.getElementById('pdiMakeFilter')?.value || '';
    
    let filtered = inventory.filter(vehicle => {
        if (vehicle.status !== 'pdi') return false;
        
        const matchesSearch = !searchTerm || 
            vehicle.stockNumber.toLowerCase().includes(searchTerm) ||
            vehicle.vin.toLowerCase().includes(searchTerm) ||
            vehicle.make.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm);
        
        const matchesMake = !makeFilter || vehicle.make === makeFilter;
        
        return matchesSearch && matchesMake;
    });
    
    const container = document.getElementById('pdiGrid');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔧</div><p>No vehicles in PDI</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(vehicle => createVehicleCard(vehicle)).join('');
    
    // Populate make filter
    const makeFilterEl = document.getElementById('pdiMakeFilter');
    const makes = [...new Set(inventory.filter(v => v.status === 'pdi').map(v => v.make))];
    makeFilterEl.innerHTML = '<option value="">All Makes</option>';
    makes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeFilterEl.appendChild(option);
    });
}

// Render Pending Pickup
function renderPendingPickup() {
    const searchTerm = document.getElementById('pendingPickupSearchInput')?.value.toLowerCase() || '';
    const makeFilter = document.getElementById('pendingPickupMakeFilter')?.value || '';
    
    let filtered = inventory.filter(vehicle => {
        if (vehicle.status !== 'pending-pickup') return false;
        
        const matchesSearch = !searchTerm || 
            vehicle.stockNumber.toLowerCase().includes(searchTerm) ||
            vehicle.vin.toLowerCase().includes(searchTerm) ||
            vehicle.make.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm);
        
        const matchesMake = !makeFilter || vehicle.make === makeFilter;
        
        return matchesSearch && matchesMake;
    });
    
    const container = document.getElementById('pendingPickupGrid');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⏳</div><p>No vehicles pending pickup</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(vehicle => createVehicleCard(vehicle)).join('');
    
    // Populate make filter
    const makeFilterEl = document.getElementById('pendingPickupMakeFilter');
    const makes = [...new Set(inventory.filter(v => v.status === 'pending-pickup').map(v => v.make))];
    makeFilterEl.innerHTML = '<option value="">All Makes</option>';
    makes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeFilterEl.appendChild(option);
    });
}

// Render Pickup Scheduled
function renderPickupScheduled() {
    const searchTerm = document.getElementById('pickupScheduledSearchInput')?.value.toLowerCase() || '';
    const makeFilter = document.getElementById('pickupScheduledMakeFilter')?.value || '';
    
    let filtered = inventory.filter(vehicle => {
        if (vehicle.status !== 'pickup-scheduled') return false;
        
        const matchesSearch = !searchTerm || 
            vehicle.stockNumber.toLowerCase().includes(searchTerm) ||
            vehicle.vin.toLowerCase().includes(searchTerm) ||
            vehicle.make.toLowerCase().includes(searchTerm) ||
            vehicle.model.toLowerCase().includes(searchTerm);
        
        const matchesMake = !makeFilter || vehicle.make === makeFilter;
        
        return matchesSearch && matchesMake;
    });
    
    // Sort by pickup date/time
    filtered.sort((a, b) => {
        const dateA = new Date(`${a.pickupDate}T${a.pickupTime}`);
        const dateB = new Date(`${b.pickupDate}T${b.pickupTime}`);
        return dateA - dateB;
    });
    
    const container = document.getElementById('pickupScheduledGrid');
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><p>No scheduled pickups</p></div>';
        return;
    }
    
    container.innerHTML = filtered.map(vehicle => createPickupScheduledCard(vehicle)).join('');
    
    // Populate make filter
    const makeFilterEl = document.getElementById('pickupScheduledMakeFilter');
    const makes = [...new Set(inventory.filter(v => v.status === 'pickup-scheduled').map(v => v.make))];
    makeFilterEl.innerHTML = '<option value="">All Makes</option>';
    makes.forEach(make => {
        const option = document.createElement('option');
        option.value = make;
        option.textContent = make;
        makeFilterEl.appendChild(option);
    });
}

// Create Vehicle Card
function createVehicleCard(vehicle) {
    const statusClass = `status-${vehicle.status}`;
    const statusText = vehicle.status.replace('-', ' ').toUpperCase();
    
    return `
        <div class="vehicle-card">
            <div class="vehicle-header">
                <div class="vehicle-stock">#${vehicle.stockNumber}</div>
                <div class="vehicle-title">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
            </div>
            <div class="vehicle-body">
                <div style="margin-bottom: 1rem;">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="vehicle-info">
                    <div class="info-item">
                        <div class="info-label">VIN</div>
                        <div class="info-value">${vehicle.vin}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Trim</div>
                        <div class="info-value">${vehicle.trim}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Color</div>
                        <div class="info-value">${vehicle.color}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Fleet</div>
                        <div class="info-value">${vehicle.fleetCompany || 'N/A'}</div>
                    </div>
                </div>
                <div class="vehicle-actions">
                    <button class="btn btn-small btn-secondary" onclick="viewDetails(${vehicle.id})">Details</button>
                    <button class="btn btn-small btn-secondary" onclick="generateLabel(${vehicle.id})">Label</button>
                    <button class="btn btn-small btn-danger" onclick="deleteVehicle(${vehicle.id})">Delete</button>
                </div>
            </div>
        </div>
    `;
}

// Create Sold Vehicle Card
function createSoldVehicleCard(vehicle) {
    return `
        <div class="vehicle-card">
            <div class="vehicle-header">
                <div class="vehicle-stock">#${vehicle.stockNumber}</div>
                <div class="vehicle-title">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
            </div>
            <div class="vehicle-body">
                <div style="margin-bottom: 1rem;">
                    <span class="status-badge status-sold">SOLD</span>
                    ${vehicle.customer?.paymentType ? `<span class="status-badge" style="background: rgba(10, 132, 255, 0.2); color: var(--accent); border: 1px solid rgba(10, 132, 255, 0.3); margin-left: 0.5rem;">${vehicle.customer.paymentType.toUpperCase()}</span>` : ''}
                </div>
                <div class="vehicle-info">
                    <div class="info-item">
                        <div class="info-label">Customer</div>
                        <div class="info-value">${vehicle.customer?.firstName || ''} ${vehicle.customer?.lastName || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Payment Type</div>
                        <div class="info-value">${vehicle.customer?.paymentType || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">VIN</div>
                        <div class="info-value">${vehicle.vin}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Sale Date</div>
                        <div class="info-value">${vehicle.customer?.saleDate ? new Date(vehicle.customer.saleDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                </div>
                <div class="vehicle-actions">
                    <button class="btn btn-small btn-secondary" onclick="viewSoldDetails(${vehicle.id})">View Details</button>
                    ${vehicle.tradeInId ? `<button class="btn btn-small btn-secondary" onclick="viewTradeInDetails(${vehicle.tradeInId})">View Trade-In</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Create Trade-In Card
function createTradeInCard(vehicle) {
    const pickedUpChecked = vehicle.pickedUp ? 'checked' : '';
    const pickedUpDate = vehicle.pickedUpDate ? new Date(vehicle.pickedUpDate).toLocaleDateString() : '';
    
    return `
        <div class="vehicle-card">
            <div class="vehicle-header" style="background: linear-gradient(135deg, #ff9f0a, #ff6b35);">
                <div class="vehicle-stock">${vehicle.stockNumber ? '#' + vehicle.stockNumber : 'TRADE-IN'}</div>
                <div class="vehicle-title">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
            </div>
            <div class="vehicle-body">
                ${vehicle.pickedUp ? `
                <div style="margin-bottom: 1rem;">
                    <span class="picked-up-badge">✓ Picked Up - ${pickedUpDate}</span>
                </div>
                ` : ''}
                <div class="checkbox-group">
                    <input type="checkbox" id="pickedUp-${vehicle.id}" ${pickedUpChecked} onchange="toggleTradeInPickup(${vehicle.id}, this.checked)">
                    <label for="pickedUp-${vehicle.id}">Picked Up</label>
                </div>
                <div class="vehicle-info">
                    <div class="info-item">
                        <div class="info-label">VIN</div>
                        <div class="info-value">${vehicle.vin}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Trim</div>
                        <div class="info-value">${vehicle.trim || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Color</div>
                        <div class="info-value">${vehicle.color}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Mileage</div>
                        <div class="info-value">${vehicle.mileage ? vehicle.mileage.toLocaleString() + ' mi' : 'N/A'}</div>
                    </div>
                </div>
                <div class="vehicle-actions">
                    <button class="btn btn-small btn-secondary" onclick="viewTradeInDetails(${vehicle.id})">View Details</button>
                    <button class="btn btn-small btn-danger" onclick="deleteTradeIn(${vehicle.id})">Delete</button>
                </div>
            </div>
        </div>
    `;
}

// Create Pickup Scheduled Card
function createPickupScheduledCard(vehicle) {
    const pickupDateTime = new Date(`${vehicle.pickupDate}T${vehicle.pickupTime}`);
    const formattedDate = pickupDateTime.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
    const formattedTime = pickupDateTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit'
    });
    
    const customerName = vehicle.customer?.firstName || vehicle.customer?.lastName 
        ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim()
        : 'Not set';
    
    return `
        <div class="vehicle-card">
            <div class="vehicle-header" style="background: linear-gradient(135deg, #64d2ff, #4facfe);">
                <div class="vehicle-stock">#${vehicle.stockNumber}</div>
                <div class="vehicle-title">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
            </div>
            <div class="vehicle-body">
                <div style="margin-bottom: 1rem;">
                    <span class="status-badge status-pickup-scheduled">PICKUP SCHEDULED</span>
                </div>
                <div class="vehicle-info">
                    <div class="info-item">
                        <div class="info-label">Customer</div>
                        <div class="info-value">${customerName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Pickup Date</div>
                        <div class="info-value">${formattedDate}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Pickup Time</div>
                        <div class="info-value">${formattedTime}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">VIN</div>
                        <div class="info-value">${vehicle.vin}</div>
                    </div>
                </div>
                <div class="vehicle-actions">
                    <button class="btn btn-small btn-secondary" onclick="viewDetails(${vehicle.id})">Details</button>
                    <button class="btn btn-small btn-secondary" onclick="generateLabel(${vehicle.id})">Label</button>
                    <button class="btn btn-small btn-danger" onclick="deleteVehicle(${vehicle.id})">Delete</button>
                </div>
            </div>
        </div>
    `;
}

// Update Stats
function updateStats() {
    const total = inventory.filter(v => v.status !== 'sold').length;
    const inStock = inventory.filter(v => v.status === 'in-stock').length;
    const sold = soldVehicles.length;
    const tradeInCount = tradeIns.length;
    
    document.getElementById('totalVehicles').textContent = total;
    document.getElementById('inStockVehicles').textContent = inStock;
    document.getElementById('soldVehicles').textContent = sold;
    document.getElementById('tradeInVehicles').textContent = tradeInCount;
}

// View Details
function viewDetails(id) {
    const vehicle = inventory.find(v => v.id === id);
    if (!vehicle) return;
    
    // Store current vehicle ID for updates
    window.currentVehicleId = id;
    
    const statusClass = `status-${vehicle.status}`;
    const statusText = vehicle.status.replace('-', ' ').toUpperCase();
    
    let content = `
        <div style="margin-bottom: 1.5rem;">
            <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="vehicle-info" style="grid-template-columns: 1fr;">
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Stock Number</div>
                <div class="info-value" style="font-size: 1.5rem;">${vehicle.stockNumber}</div>
            </div>
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">VIN</div>
                <div class="info-value">${vehicle.vin}</div>
            </div>
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Vehicle</div>
                <div class="info-value">${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}</div>
            </div>
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Color</div>
                <div class="info-value">${vehicle.color}</div>
            </div>
            ${vehicle.fleetCompany ? `
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Fleet Company</div>
                <div class="info-value">${vehicle.fleetCompany}</div>
            </div>
            ` : ''}
            <div class="info-item">
                <div class="info-label">Date Added</div>
                <div class="info-value">${new Date(vehicle.dateAdded).toLocaleString()}</div>
            </div>
        </div>
    `;

    // Add customer information display if exists
    if (vehicle.customer) {
        content += `
            <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border);">
                <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">Customer Information</h3>
                <div class="vehicle-info" style="grid-template-columns: 1fr;">
                    ${vehicle.customer.firstName || vehicle.customer.lastName ? `
                    <div class="info-item" style="margin-bottom: 1rem;">
                        <div class="info-label">Customer Name</div>
                        <div class="info-value">${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}</div>
                    </div>
                    ` : ''}
                    ${vehicle.customer.email ? `
                    <div class="info-item" style="margin-bottom: 1rem;">
                        <div class="info-label">Email</div>
                        <div class="info-value">${vehicle.customer.email}</div>
                    </div>
                    ` : ''}
                    ${vehicle.customer.phone ? `
                    <div class="info-item" style="margin-bottom: 1rem;">
                        <div class="info-label">Phone</div>
                        <div class="info-value">${vehicle.customer.phone}</div>
                    </div>
                    ` : ''}
                    ${vehicle.customer.address ? `
                    <div class="info-item" style="margin-bottom: 1rem;">
                        <div class="info-label">Address</div>
                        <div class="info-value">${vehicle.customer.address}${vehicle.customer.city ? ', ' + vehicle.customer.city : ''}${vehicle.customer.state ? ', ' + vehicle.customer.state : ''}${vehicle.customer.zip ? ' ' + vehicle.customer.zip : ''}</div>
                    </div>
                    ` : ''}
                    ${vehicle.customer.salePrice ? `
                    <div class="info-item" style="margin-bottom: 1rem;">
                        <div class="info-label">Sale Price</div>
                        <div class="info-value">$${parseFloat(vehicle.customer.salePrice).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    </div>
                    ` : ''}
                    ${vehicle.customer.notes ? `
                    <div class="info-item">
                        <div class="info-label">Notes</div>
                        <div class="info-value">${vehicle.customer.notes}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    document.getElementById('detailContent').innerHTML = content;
    
    // Set the status dropdown
    document.getElementById('detailStatus').value = vehicle.status;
    
    // Populate customer form if customer data exists
    if (vehicle.customer) {
        document.getElementById('customerFirstName').value = vehicle.customer.firstName || '';
        document.getElementById('customerLastName').value = vehicle.customer.lastName || '';
        document.getElementById('customerEmail').value = vehicle.customer.email || '';
        document.getElementById('customerPhone').value = vehicle.customer.phone || '';
        document.getElementById('customerAddress').value = vehicle.customer.address || '';
        document.getElementById('customerCity').value = vehicle.customer.city || '';
        document.getElementById('customerState').value = vehicle.customer.state || '';
        document.getElementById('customerZip').value = vehicle.customer.zip || '';
        document.getElementById('paymentType').value = vehicle.customer.paymentType || '';
        document.getElementById('saleDate').value = vehicle.customer.saleDate || '';
        document.getElementById('notes').value = vehicle.customer.notes || '';
    } else {
        // Clear form if no customer data
        document.getElementById('customerForm').reset();
    }
    
    document.getElementById('detailModal').classList.add('active');
}

// Generate Label
function generateLabel(id) {
    const vehicle = inventory.find(v => v.id === id);
    if (!vehicle) return;
    
    currentVehicle = vehicle;
    
    // Set stock number header
    document.getElementById('labelStockNumber').textContent = vehicle.stockNumber;

    // Set vehicle info
    const labelInfo = document.getElementById('labelInfo');
    labelInfo.innerHTML = `
        <div><strong>VIN:</strong> ${vehicle.vin}</div>
        <div><strong>Year:</strong> ${vehicle.year}</div>
        <div><strong>Make:</strong> ${vehicle.make}</div>
        <div><strong>Model:</strong> ${vehicle.model}</div>
        <div><strong>Trim:</strong> ${vehicle.trim}</div>
        <div><strong>Color:</strong> ${vehicle.color}</div>
        ${vehicle.fleetCompany ? `<div><strong>Fleet:</strong> ${vehicle.fleetCompany}</div>` : ''}
    `;

    // Generate QR code
    const qrContainer = document.getElementById('labelQR');
    qrContainer.innerHTML = '';
    
    const qrData = JSON.stringify({
        stockNumber: vehicle.stockNumber,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        color: vehicle.color,
        fleetCompany: vehicle.fleetCompany
    });

    new QRCode(qrContainer, {
        text: qrData,
        width: 80,
        height: 80,
        correctLevel: QRCode.CorrectLevel.M
    });
    
    document.getElementById('labelModal').classList.add('active');
}

// Update Vehicle Status
function updateVehicleStatus() {
    const vehicleId = window.currentVehicleId;
    const newStatus = document.getElementById('detailStatus').value;
    const oldStatus = inventory.find(v => v.id === vehicleId)?.status;
    
    const vehicleIndex = inventory.findIndex(v => v.id === vehicleId);
    if (vehicleIndex === -1) return;
    
    // If changing to pickup-scheduled status, show pickup schedule modal
    if (newStatus === 'pickup-scheduled') {
        window.pendingStatusChangeVehicleId = vehicleId;
        closeDetailModal();
        openPickupScheduleModal();
        return;
    }
    
    // If changing to sold status, prompt for trade-in
    if (newStatus === 'sold' && oldStatus !== 'sold') {
        const hasTradeIn = confirm('Was there a trade-in vehicle with this sale?');
        
        if (hasTradeIn) {
            // Store the vehicle ID for later association
            window.pendingSoldVehicleId = vehicleId;
            closeDetailModal();
            openTradeInModal();
            return;
        } else {
            // Move to sold vehicles without trade-in
            const vehicle = inventory[vehicleIndex];
            vehicle.status = 'sold';
            soldVehicles.unshift(vehicle);
            localStorage.setItem('soldVehicles', JSON.stringify(soldVehicles));
            
            renderDashboard();
            renderInventory();
            renderSoldVehicles();
            updateStats();
            closeDetailModal();
            alert('Vehicle marked as sold!');
            return;
        }
    }
    
    inventory[vehicleIndex].status = newStatus;
    localStorage.setItem('vehicleInventory', JSON.stringify(inventory));
    
    renderDashboard();
    renderInventory();
    renderInTransit();
    renderPDI();
    renderPendingPickup();
    renderPickupScheduled();
    updateStats();
    
    // Refresh the detail view
    viewDetails(vehicleId);
    
    alert('Vehicle status updated successfully!');
}

// Save Customer Information
function saveCustomerInfo(event) {
    event.preventDefault();
    
    const vehicleId = window.currentVehicleId;
    const vehicleIndex = inventory.findIndex(v => v.id === vehicleId);
    if (vehicleIndex === -1) return;
    
    const customerData = {
        firstName: document.getElementById('customerFirstName').value,
        lastName: document.getElementById('customerLastName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        address: document.getElementById('customerAddress').value,
        city: document.getElementById('customerCity').value,
        state: document.getElementById('customerState').value,
        zip: document.getElementById('customerZip').value,
        paymentType: document.getElementById('paymentType').value,
        saleDate: document.getElementById('saleDate').value,
        notes: document.getElementById('notes').value
    };
    
    inventory[vehicleIndex].customer = customerData;
    
    // If vehicle is marked as sold, move it to sold vehicles
    if (inventory[vehicleIndex].status === 'sold') {
        const vehicle = inventory[vehicleIndex];
        soldVehicles.unshift(vehicle);
        localStorage.setItem('soldVehicles', JSON.stringify(soldVehicles));
    }
    
    localStorage.setItem('vehicleInventory', JSON.stringify(inventory));
    
    renderDashboard();
    renderInventory();
    renderSoldVehicles();
    
    // Refresh the detail view
    viewDetails(vehicleId);
    
    alert('Customer information saved successfully!');
}

// Delete Vehicle
function deleteVehicle(id) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    
    inventory = inventory.filter(v => v.id !== id);
    localStorage.setItem('vehicleInventory', JSON.stringify(inventory));
    
    renderDashboard();
    renderInventory();
    updateStats();
}

// Delete Trade-In
function deleteTradeIn(id) {
    if (!confirm('Are you sure you want to delete this trade-in?')) return;
    
    tradeIns = tradeIns.filter(v => v.id !== id);
    localStorage.setItem('tradeIns', JSON.stringify(tradeIns));
    
    renderTradeIns();
    updateStats();
}

// Trade-In Form Submission
document.getElementById('tradeInForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const tradeIn = {
        id: Date.now(),
        stockNumber: document.getElementById('tradeStockNumber').value,
        vin: document.getElementById('tradeVin').value,
        year: document.getElementById('tradeYear').value,
        make: document.getElementById('tradeMake').value,
        model: document.getElementById('tradeModel').value,
        trim: document.getElementById('tradeTrim').value,
        color: document.getElementById('tradeColor').value,
        mileage: document.getElementById('tradeMileage').value,
        notes: document.getElementById('tradeNotes').value,
        dateAdded: new Date().toISOString()
    };

    tradeIns.unshift(tradeIn);
    localStorage.setItem('tradeIns', JSON.stringify(tradeIns));
    
    // If this trade-in was part of a sale, associate it
    if (window.pendingSoldVehicleId) {
        const vehicleIndex = inventory.findIndex(v => v.id === window.pendingSoldVehicleId);
        if (vehicleIndex !== -1) {
            const vehicle = inventory[vehicleIndex];
            vehicle.status = 'sold';
            vehicle.tradeInId = tradeIn.id;
            soldVehicles.unshift(vehicle);
            localStorage.setItem('soldVehicles', JSON.stringify(soldVehicles));
            localStorage.setItem('vehicleInventory', JSON.stringify(inventory));
        }
        window.pendingSoldVehicleId = null;
    }
    
    closeTradeInModal();
    this.reset();
    renderDashboard();
    renderInventory();
    renderSoldVehicles();
    renderTradeIns();
    updateStats();
    
    alert('Trade-in vehicle added successfully!');
});

// Pickup Schedule Form Submission
document.getElementById('pickupScheduleForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const pickupDate = document.getElementById('pickupDate').value;
    const pickupTime = document.getElementById('pickupTime').value;
    const pickupNotes = document.getElementById('pickupNotes').value;
    
    const vehicleId = window.pendingStatusChangeVehicleId;
    const vehicleIndex = inventory.findIndex(v => v.id === vehicleId);
    
    if (vehicleIndex !== -1) {
        inventory[vehicleIndex].status = 'pickup-scheduled';
        inventory[vehicleIndex].pickupDate = pickupDate;
        inventory[vehicleIndex].pickupTime = pickupTime;
        inventory[vehicleIndex].pickupNotes = pickupNotes;
        
        localStorage.setItem('vehicleInventory', JSON.stringify(inventory));
        
        renderDashboard();
        renderInventory();
        renderInTransit();
        renderPDI();
        renderPendingPickup();
        renderPickupScheduled();
        updateStats();
    }
    
    closePickupScheduleModal();
    this.reset();
    window.pendingStatusChangeVehicleId = null;
    
    alert('Pickup scheduled successfully!');
});

// Toggle Trade-In Pickup
function toggleTradeInPickup(id, isChecked) {
    if (isChecked) {
        // Store the ID and open the pickup date modal
        window.pendingTradeInPickupId = id;
        openTradePickupModal();
    } else {
        // Uncheck - remove pickup status
        const tradeInIndex = tradeIns.findIndex(v => v.id === id);
        if (tradeInIndex !== -1) {
            tradeIns[tradeInIndex].pickedUp = false;
            tradeIns[tradeInIndex].pickedUpDate = null;
            localStorage.setItem('tradeIns', JSON.stringify(tradeIns));
            renderTradeIns();
        }
    }
}

// Trade Pickup Form Submission
document.getElementById('tradePickupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const pickupDate = document.getElementById('tradePickupDate').value;
    const tradeInId = window.pendingTradeInPickupId;
    const tradeInIndex = tradeIns.findIndex(v => v.id === tradeInId);
    
    if (tradeInIndex !== -1) {
        tradeIns[tradeInIndex].pickedUp = true;
        tradeIns[tradeInIndex].pickedUpDate = pickupDate;
        localStorage.setItem('tradeIns', JSON.stringify(tradeIns));
        renderTradeIns();
    }
    
    closeTradePickupModal();
    this.reset();
    window.pendingTradeInPickupId = null;
});

// View Sold Vehicle Details
function viewSoldDetails(id) {
    const vehicle = soldVehicles.find(v => v.id === id);
    if (!vehicle) return;
    
    const content = `
        <div style="margin-bottom: 1.5rem;">
            <span class="status-badge status-sold">SOLD</span>
            ${vehicle.customer?.paymentType ? `<span class="status-badge" style="background: rgba(10, 132, 255, 0.2); color: var(--accent); border: 1px solid rgba(10, 132, 255, 0.3); margin-left: 0.5rem;">${vehicle.customer.paymentType.toUpperCase()}</span>` : ''}
        </div>
        <div class="vehicle-info" style="grid-template-columns: 1fr;">
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Stock Number</div>
                <div class="info-value" style="font-size: 1.5rem;">${vehicle.stockNumber}</div>
            </div>
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">VIN</div>
                <div class="info-value">${vehicle.vin}</div>
            </div>
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Vehicle</div>
                <div class="info-value">${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}</div>
            </div>
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Color</div>
                <div class="info-value">${vehicle.color}</div>
            </div>
            ${vehicle.customer ? `
            <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border);">
                <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">Customer Information</h3>
                ${vehicle.customer.firstName || vehicle.customer.lastName ? `
                <div class="info-item" style="margin-bottom: 1rem;">
                    <div class="info-label">Customer Name</div>
                    <div class="info-value">${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}</div>
                </div>
                ` : ''}
                ${vehicle.customer.email ? `
                <div class="info-item" style="margin-bottom: 1rem;">
                    <div class="info-label">Email</div>
                    <div class="info-value">${vehicle.customer.email}</div>
                </div>
                ` : ''}
                ${vehicle.customer.phone ? `
                <div class="info-item" style="margin-bottom: 1rem;">
                    <div class="info-label">Phone</div>
                    <div class="info-value">${vehicle.customer.phone}</div>
                </div>
                ` : ''}
                ${vehicle.customer.paymentType ? `
                <div class="info-item" style="margin-bottom: 1rem;">
                    <div class="info-label">Payment Type</div>
                    <div class="info-value">${vehicle.customer.paymentType}</div>
                </div>
                ` : ''}
                ${vehicle.customer.saleDate ? `
                <div class="info-item" style="margin-bottom: 1rem;">
                    <div class="info-label">Sale Date</div>
                    <div class="info-value">${new Date(vehicle.customer.saleDate).toLocaleDateString()}</div>
                </div>
                ` : ''}
            </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('detailContent').innerHTML = content;
    document.getElementById('detailModal').classList.add('active');
}

// View Trade-In Details
function viewTradeInDetails(id) {
    const vehicle = tradeIns.find(v => v.id === id);
    if (!vehicle) return;
    
    const content = `
        ${vehicle.pickedUp ? `
        <div style="margin-bottom: 1.5rem;">
            <span class="picked-up-badge">✓ Picked Up - ${new Date(vehicle.pickedUpDate).toLocaleDateString()}</span>
        </div>
        ` : ''}
        <div class="vehicle-info" style="grid-template-columns: 1fr;">
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">${vehicle.stockNumber ? 'Stock Number' : 'Trade-In ID'}</div>
                <div class="info-value" style="font-size: 1.5rem;">${vehicle.stockNumber || 'TRADE-' + vehicle.id}</div>
            </div>
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">VIN</div>
                <div class="info-value">${vehicle.vin}</div>
            </div>
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Vehicle</div>
                <div class="info-value">${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}</div>
            </div>
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Color</div>
                <div class="info-value">${vehicle.color}</div>
            </div>
            ${vehicle.mileage ? `
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Mileage</div>
                <div class="info-value">${parseInt(vehicle.mileage).toLocaleString()} miles</div>
            </div>
            ` : ''}
            ${vehicle.notes ? `
            <div class="info-item" style="margin-bottom: 1rem;">
                <div class="info-label">Notes</div>
                <div class="info-value">${vehicle.notes}</div>
            </div>
            ` : ''}
            <div class="info-item">
                <div class="info-label">Date Added</div>
                <div class="info-value">${new Date(vehicle.dateAdded).toLocaleString()}</div>
            </div>
        </div>
    `;
    
    document.getElementById('detailContent').innerHTML = content;
    document.getElementById('detailModal').classList.add('active');
}

// Render Analytics
function renderAnalytics() {
    renderMakeChart();
    renderTimelineChart();
}

function renderMakeChart() {
    const ctx = document.getElementById('makeChart');
    if (!ctx) return;
    
    const makeCounts = {};
    inventory.forEach(v => {
        makeCounts[v.make] = (makeCounts[v.make] || 0) + 1;
    });
    
    if (makeChart) {
        makeChart.destroy();
    }
    
    makeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(makeCounts),
            datasets: [{
                data: Object.values(makeCounts),
                backgroundColor: [
                    '#0071e3',
                    '#34c759',
                    '#ff9500',
                    '#ff3b30',
                    '#5856d6',
                    '#af52de',
                    '#00c7be',
                    '#ff2d55'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderTimelineChart() {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;
    
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    
    const counts = last7Days.map(() => 0);
    inventory.forEach(v => {
        const vehicleDate = new Date(v.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const index = last7Days.indexOf(vehicleDate);
        if (index !== -1) {
            counts[index]++;
        }
    });
    
    if (timelineChart) {
        timelineChart.destroy();
    }
    
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Vehicles Added',
                data: counts,
                borderColor: '#0071e3',
                backgroundColor: 'rgba(0, 113, 227, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Modal Functions
function openAddModal() {
    document.getElementById('addModal').classList.add('active');
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

function closeLabelModal() {
    document.getElementById('labelModal').classList.remove('active');
}

function openTradeInModal() {
    document.getElementById('tradeInModal').classList.add('active');
}

function closeTradeInModal() {
    document.getElementById('tradeInModal').classList.remove('active');
    document.getElementById('tradeInForm').reset();
}

function openPickupScheduleModal() {
    document.getElementById('pickupScheduleModal').classList.add('active');
}

function closePickupScheduleModal() {
    document.getElementById('pickupScheduleModal').classList.remove('active');
    document.getElementById('pickupScheduleForm').reset();
}

function openTradePickupModal() {
    document.getElementById('tradePickupModal').classList.add('active');
}

function closeTradePickupModal() {
    document.getElementById('tradePickupModal').classList.remove('active');
    document.getElementById('tradePickupForm').reset();
    // Uncheck the checkbox if user cancels
    if (window.pendingTradeInPickupId) {
        const checkbox = document.getElementById(`pickedUp-${window.pendingTradeInPickupId}`);
        if (checkbox) checkbox.checked = false;
        window.pendingTradeInPickupId = null;
    }
}

// Label Functions
function printLabel() {
    const labelContent = document.getElementById('label').outerHTML;
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>Print Label</title>
            <style>
                body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; }
                .label { width: 192px; height: 192px; background: white; border: 2px solid #000; padding: 8px; font-family: 'Courier New', monospace; }
                .label-header { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #000; }
                .label-content { display: flex; gap: 8px; }
                .label-info { flex: 1; font-size: 8px; line-height: 1.4; }
                .label-info div { margin-bottom: 2px; }
                .label-qr { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
                .label-qr canvas { max-width: 100%; max-height: 100%; }
            </style>
        </head>
        <body>${labelContent}</body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
}

async function saveLabel() {
    const labelElement = document.getElementById('label');
    
    try {
        const canvas = await html2canvas(labelElement, {
            backgroundColor: '#ffffff',
            scale: 4
        });
        
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `label-${currentVehicle.stockNumber}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    } catch (error) {
        console.error('Error saving label:', error);
        alert('Error saving label. Please try again.');
    }
}

async function copyLabel() {
    const labelElement = document.getElementById('label');
    
    try {
        const canvas = await html2canvas(labelElement, {
            backgroundColor: '#ffffff',
            scale: 4
        });
        
        canvas.toBlob(async blob => {
            try {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'image/png': blob
                    })
                ]);
                alert('Label copied to clipboard!');
            } catch (err) {
                console.error('Error copying to clipboard:', err);
                alert('Error copying label. Please try the Save option instead.');
            }
        });
    } catch (error) {
        console.error('Error copying label:', error);
        alert('Error copying label. Please try again.');
    }
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
