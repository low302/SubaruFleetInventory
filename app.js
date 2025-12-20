const API_BASE = '/api';
let vehicles = [];
let soldVehicles = [];
let tradeIns = [];
let currentVehicle = null;
let currentFilter = { search: '', make: '', status: '' };

// Custom notification system to replace browser alerts
function showNotification(message, type = 'info') {
    const modal = document.getElementById('notificationModal');
    const icon = document.getElementById('notificationIcon');
    const messageEl = document.getElementById('notificationMessage');
    const okBtn = document.getElementById('notificationOkBtn');

    // Set icon based on type
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠️',
        info: 'ℹ️'
    };
    icon.textContent = icons[type] || icons.info;

    // Set icon color
    const colors = {
        success: 'var(--joy-success-500)',
        error: 'var(--joy-danger-500)',
        warning: 'var(--joy-warning-500)',
        info: 'var(--joy-primary-500)'
    };
    icon.style.color = colors[type] || colors.info;

    messageEl.textContent = message;
    modal.style.display = 'flex';

    // Close on OK button
    okBtn.onclick = () => {
        modal.style.display = 'none';
    };

    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Custom confirmation dialog to replace browser confirms
function showConfirmation(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        messageEl.textContent = message;
        modal.style.display = 'flex';

        // Handle OK button
        okBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };

        // Handle Cancel button
        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };

        // Close on outside click (treat as cancel)
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                resolve(false);
            }
        };
    });
}

async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/status`, { credentials: 'include' });
        const data = await response.json();
        if (data.authenticated) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            
            // Update user display
            const userName = document.getElementById('userName');
            const userAvatar = document.getElementById('userAvatar');
            if (userName && data.username) {
                userName.textContent = data.username;
            }
            if (userAvatar && data.username) {
                userAvatar.textContent = data.username.charAt(0).toUpperCase();
            }
            
            await loadAllData();
        } else {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainApp').style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
}

async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            await checkAuth();
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Connection error. Please try again.', 'error');
    }
}

async function logout() {
    try {
        await fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

async function loadAllData() {
    await Promise.all([loadInventory(), loadSoldVehicles(), loadTradeIns()]);
    updateDashboard();
    renderCurrentPage();
}

async function loadInventory() {
    try {
        const response = await fetch(`${API_BASE}/inventory`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load inventory');
        vehicles = await response.json();
    } catch (error) {
        console.error('Error loading inventory:', error);
        vehicles = [];
    }
}

async function loadSoldVehicles() {
    try {
        const response = await fetch(`${API_BASE}/sold-vehicles`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load sold vehicles');
        soldVehicles = await response.json();
    } catch (error) {
        console.error('Error loading sold vehicles:', error);
        soldVehicles = [];
    }
}

async function loadTradeIns() {
    try {
        const response = await fetch(`${API_BASE}/trade-ins`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load trade-ins');
        tradeIns = await response.json();
    } catch (error) {
        console.error('Error loading trade-ins:', error);
        tradeIns = [];
    }
}

// Auto-generate stock number from VIN (CDXXXXX format where XXXXX = last 5 of VIN)
function autoGenerateStockNumber() {
    const vinInput = document.getElementById('vin').value.toUpperCase();
    const stockNumberInput = document.getElementById('stockNumber');

    // Only generate if VIN is 17 characters
    if (vinInput.length === 17) {
        const lastFive = vinInput.slice(-5);
        stockNumberInput.value = 'CD' + lastFive;
    } else {
        stockNumberInput.value = '';
    }
}

async function addVehicle(event) {
    event.preventDefault();

    // Disable submit button to prevent double submission
    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn.disabled) return; // Already submitting
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    // Validate VIN format (17 alphanumeric characters, no I, O, or Q)
    const vinInput = document.getElementById('vin').value.toUpperCase();
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinPattern.test(vinInput)) {
        showNotification('Invalid VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Vehicle';
        return;
    }

    // Get in stock date - only set if user manually provides it
    const inStockDateInput = document.getElementById('inStockDate').value;
    const vehicleStatus = document.getElementById('status').value;
    const inStockDate = inStockDateInput ? inStockDateInput + 'T00:00:00.000Z' : null;

    const vehicle = {
        id: Date.now(),
        stockNumber: document.getElementById('stockNumber').value,
        vin: vinInput,
        year: parseInt(document.getElementById('year').value),
        make: document.getElementById('make').value,
        model: document.getElementById('model').value,
        trim: document.getElementById('trim').value,
        color: document.getElementById('color').value,
        fleetCompany: document.getElementById('fleetCompany').value,
        operationCompany: document.getElementById('addOperationCompany').value,
        status: vehicleStatus,
        dateAdded: new Date().toISOString(),
        inStockDate: inStockDate,
        customer: null,
        documents: []
    };
    
    try {
        const response = await fetch(`${API_BASE}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(vehicle)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add vehicle');
        }
        
        await loadInventory();
        closeAddModal();
        updateDashboard();
        renderCurrentPage();
        document.getElementById('vehicleForm').reset();
        showNotification('Vehicle added successfully!', 'success');
        
    } catch (error) {
        console.error('Error adding vehicle:', error);
        showNotification('Failed to add vehicle: ' + error.message, 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Vehicle';
    }
}

async function updateVehicleStatus() {
    if (!currentVehicle) return;
    const newStatus = document.getElementById('detailStatus').value;
    const currentlyInSold = soldVehicles.some(v => v.id === currentVehicle.id);
    
    // Moving TO sold status - show sold modal
    if (newStatus === 'sold' && !currentlyInSold) {
        closeDetailModal();
        openSoldModal();
        return;
    } 
    // Moving FROM sold back to inventory
    else if (newStatus !== 'sold' && currentlyInSold) {
        const inventoryVehicle = { ...currentVehicle, status: newStatus };
        try {
            // First add back to inventory
            const inventoryResponse = await fetch(`${API_BASE}/inventory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(inventoryVehicle)
            });
            
            if (!inventoryResponse.ok) {
                const errorData = await inventoryResponse.json();
                throw new Error(errorData.error || 'Failed to add to inventory');
            }
            
            // Then delete from sold vehicles
            const deleteResponse = await fetch(`${API_BASE}/sold-vehicles/${currentVehicle.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!deleteResponse.ok) {
                throw new Error('Failed to remove from sold vehicles');
            }
            
            await loadAllData();
            closeDetailModal();
            updateDashboard();
            renderCurrentPage();
            showNotification('Vehicle moved back to inventory successfully!', 'success');
            
        } catch (error) {
            console.error('Error moving vehicle from sold:', error);
            showNotification('Failed to update vehicle status: ' + error.message, 'error');
        }
    }
    // Pickup scheduled (requires additional info)
    else if (newStatus === 'pickup-scheduled') {
        openPickupScheduleModal();
    } 
    // Regular status update within inventory
    else {
        currentVehicle.status = newStatus;

        try {
            const response = await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(currentVehicle)
            });
            if (!response.ok) throw new Error('Failed to update vehicle');
            await loadInventory();
            closeDetailModal();
            updateDashboard();
            renderCurrentPage();
        } catch (error) {
            console.error('Error updating vehicle:', error);
            showNotification('Failed to update vehicle status. Please try again.', 'error');
        }
    }
}

async function deleteVehicle(vehicleId) {
    const confirmed = await showConfirmation('Are you sure you want to delete this vehicle? This action cannot be undone.');
    if (!confirmed) return;

    try {
        // Check if vehicle is in sold vehicles
        const isInSold = soldVehicles.some(v => v.id === vehicleId);
        
        if (isInSold) {
            // Delete from sold vehicles table
            const response = await fetch(`${API_BASE}/sold-vehicles/${vehicleId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete sold vehicle');
            }
            console.log('Deleted vehicle from sold_vehicles table');
        } else {
            // Delete from inventory table
            const response = await fetch(`${API_BASE}/inventory/${vehicleId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete vehicle');
            }
            console.log('Deleted vehicle from inventory table');
        }
        
        // Reload all data
        await loadAllData();
        closeDetailModal();
        updateDashboard();
        renderCurrentPage();
        showNotification('Vehicle deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        showNotification('Failed to delete vehicle: ' + error.message, 'error');
    }
}

async function saveCustomerInfo(event) {
    event.preventDefault();
    if (!currentVehicle) return;
    currentVehicle.customer = {
        firstName: document.getElementById('customerFirstName').value,
        lastName: document.getElementById('customerLastName').value,
        phone: document.getElementById('customerPhone').value,
        saleAmount: parseFloat(document.getElementById('saleAmount').value) || 0,
        saleDate: document.getElementById('saleDate').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        paymentReference: document.getElementById('paymentReference').value,
        notes: document.getElementById('notes').value
    };
    try {
        const response = await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(currentVehicle)
        });
        if (!response.ok) throw new Error('Failed to save customer info');
        await loadInventory();
        showNotification('Customer information saved successfully!', 'success');
        renderDetailModal(currentVehicle);
    } catch (error) {
        console.error('Error saving customer info:', error);
        showNotification('Failed to save customer information. Please try again.', 'error');
    }
}

function enableEditMode(vehicleId) {
    window.currentlyEditingVehicle = vehicleId;
    const vehicle = vehicles.find(v => v.id === vehicleId) || soldVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
        currentVehicle = vehicle;
        renderDetailModal(vehicle);
    }
}

function cancelEditMode() {
    window.currentlyEditingVehicle = null;
    if (currentVehicle) {
        renderDetailModal(currentVehicle);
    }
}

async function saveVehicleEdit(event) {
    event.preventDefault();
    if (!currentVehicle) return;

    // Validate VIN format (17 alphanumeric characters, no I, O, or Q)
    const vinInput = document.getElementById('editVin').value.toUpperCase();
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinPattern.test(vinInput)) {
        showNotification('Invalid VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).', 'error');
        return;
    }

    // Get in stock date - allow it to be cleared (null)
    const inStockDateInput = document.getElementById('editInStockDate').value;
    const inStockDate = inStockDateInput ? inStockDateInput + 'T00:00:00.000Z' : null;

    // Update only the edited fields, preserve everything else
    const updatedVehicle = {
        ...currentVehicle,
        stockNumber: document.getElementById('editStockNumber').value,
        vin: vinInput,
        year: parseInt(document.getElementById('editYear').value),
        make: document.getElementById('editMake').value,
        model: document.getElementById('editModel').value,
        trim: document.getElementById('editTrim').value,
        color: document.getElementById('editColor').value,
        fleetCompany: document.getElementById('editFleetCompany').value,
        operationCompany: document.getElementById('editOperationCompany').value,
        inStockDate: inStockDate
    };

    console.log('Saving vehicle with inStockDate:', inStockDate);
    console.log('Updated vehicle object:', updatedVehicle);

    try {
        const isInSold = soldVehicles.some(v => v.id === currentVehicle.id);
        const endpoint = isInSold ? 'sold-vehicles' : 'inventory';

        const response = await fetch(`${API_BASE}/${endpoint}/${updatedVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updatedVehicle)
        });

        console.log('Server response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save vehicle changes');
        }
        
        await loadAllData();

        // Check what was loaded from database
        const reloadedVehicle = vehicles.find(v => v.id === updatedVehicle.id) || soldVehicles.find(v => v.id === updatedVehicle.id);
        console.log('Vehicle reloaded from database:', reloadedVehicle);
        console.log('Reloaded inStockDate:', reloadedVehicle?.inStockDate);

        window.currentlyEditingVehicle = null;
        currentVehicle = reloadedVehicle || updatedVehicle;
        renderDetailModal(currentVehicle);
        updateDashboard();
        renderCurrentPage();
        showNotification('Vehicle updated successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving vehicle:', error);
        showNotification('Failed to save vehicle changes: ' + error.message, 'error');
    }
}

async function addTradeIn(event) {
    event.preventDefault();

    // Validate VIN format (17 alphanumeric characters, no I, O, or Q)
    const vinInput = document.getElementById('tradeVin').value.toUpperCase();
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinPattern.test(vinInput)) {
        showNotification('Invalid VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).', 'error');
        return;
    }

    // Get stock number - use provided value or generate from timestamp
    let stockNumber = document.getElementById('tradeStockNumber').value.trim();
    if (!stockNumber) {
        // Auto-generate stock number if not provided
        stockNumber = 'TI-' + Date.now();
    }

    const tradeIn = {
        id: Date.now(),
        stockNumber: stockNumber,
        vin: vinInput,
        year: parseInt(document.getElementById('tradeYear').value),
        make: document.getElementById('tradeMake').value,
        model: document.getElementById('tradeModel').value,
        trim: document.getElementById('tradeTrim').value || '',
        color: document.getElementById('tradeColor').value,
        mileage: parseInt(document.getElementById('tradeMileage').value) || 0,
        notes: document.getElementById('tradeNotes').value,
        pickedUp: false,
        pickedUpDate: null,
        dateAdded: new Date().toISOString()
    };
    try {
        const response = await fetch(`${API_BASE}/trade-ins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(tradeIn)
        });
        if (!response.ok) throw new Error('Failed to add trade-in');
        if (currentVehicle) {
            currentVehicle.tradeInId = tradeIn.id;
            await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(currentVehicle)
            });
        }
        await loadAllData();
        closeTradeInModal();
        closeDetailModal();
        updateDashboard();
        renderCurrentPage();
        document.getElementById('tradeInForm').reset();
        showNotification('Trade-in vehicle added successfully!', 'success');
    } catch (error) {
        console.error('Error adding trade-in:', error);
        showNotification('Failed to add trade-in vehicle. Please try again.', 'error');
    }
}

async function toggleTradeInPickup(tradeInId) {
    const tradeIn = tradeIns.find(t => t.id === tradeInId);
    if (!tradeIn) return;
    if (!tradeIn.pickedUp) {
        // Mark as picked up immediately
        tradeIn.pickedUp = true;
        tradeIn.pickedUpDate = new Date().toISOString();
        try {
            await fetch(`${API_BASE}/trade-ins/${tradeInId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(tradeIn)
            });
            await loadTradeIns();
            renderCurrentPage();
        } catch (error) {
            console.error('Error updating trade-in:', error);
            showNotification('Failed to update trade-in. Please try again.', 'error');
        }
    } else {
        // Unmark as picked up
        tradeIn.pickedUp = false;
        tradeIn.pickedUpDate = null;
        try {
            await fetch(`${API_BASE}/trade-ins/${tradeInId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(tradeIn)
            });
            await loadTradeIns();
            renderCurrentPage();
        } catch (error) {
            console.error('Error updating trade-in:', error);
            showNotification('Failed to update trade-in. Please try again.', 'error');
        }
    }
}

function openTradeInDetail(tradeInId) {
    const tradeIn = tradeIns.find(t => t.id === tradeInId);
    if (!tradeIn) return;

    window.currentTradeInId = tradeInId;
    window.currentTradeIn = tradeIn;
    window.currentlyEditingTradeIn = null;

    renderTradeInDetailModal(tradeIn);
    document.getElementById('tradeInDetailModal').style.display = 'flex';
}

function closeTradeInDetailModal() {
    document.getElementById('tradeInDetailModal').style.display = 'none';
    window.currentTradeInId = null;
    window.currentTradeIn = null;
    window.currentlyEditingTradeIn = null;
}

function enableTradeInEditMode(tradeInId) {
    window.currentlyEditingTradeIn = tradeInId;
    const tradeIn = tradeIns.find(t => t.id === tradeInId);
    if (tradeIn) {
        renderTradeInDetailModal(tradeIn);
    }
}

function cancelTradeInEditMode() {
    window.currentlyEditingTradeIn = null;
    const tradeIn = tradeIns.find(t => t.id === window.currentTradeInId);
    if (tradeIn) {
        renderTradeInDetailModal(tradeIn);
    }
}

async function saveTradeInEdit(event) {
    event.preventDefault();

    const tradeIn = tradeIns.find(t => t.id === window.currentTradeInId);
    if (!tradeIn) return;

    tradeIn.stockNumber = document.getElementById('editTradeStockNumber').value;
    tradeIn.vin = document.getElementById('editTradeVin').value.toUpperCase();
    tradeIn.year = parseInt(document.getElementById('editTradeYear').value);
    tradeIn.make = document.getElementById('editTradeMake').value;
    tradeIn.model = document.getElementById('editTradeModel').value;
    tradeIn.trim = document.getElementById('editTradeTrim').value;
    tradeIn.color = document.getElementById('editTradeColor').value;
    tradeIn.mileage = parseInt(document.getElementById('editTradeMileage').value) || 0;
    tradeIn.notes = document.getElementById('editTradeNotes').value;

    try {
        await fetch(`${API_BASE}/trade-ins/${tradeIn.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(tradeIn)
        });

        await loadTradeIns();
        showNotification('Trade-in updated successfully!', 'success');
        window.currentlyEditingTradeIn = null;
        renderTradeInDetailModal(tradeIn);
        renderCurrentPage();
    } catch (error) {
        console.error('Error saving trade-in:', error);
        showNotification('Failed to save trade-in changes: ' + error.message, 'error');
    }
}

function renderTradeInDetailModal(tradeIn) {
    const content = document.getElementById('tradeInDetailContent');
    const isEditing = window.currentlyEditingTradeIn === tradeIn.id;

    if (!isEditing) {
        // Display mode
        content.innerHTML = `
            <div class="vehicle-info">
                <div class="info-item"><div class="info-label">Stock #</div><div class="info-value">${tradeIn.stockNumber || 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">VIN</div><div class="info-value">${tradeIn.vin}</div></div>
                <div class="info-item"><div class="info-label">Year</div><div class="info-value">${tradeIn.year}</div></div>
                <div class="info-item"><div class="info-label">Make</div><div class="info-value">${tradeIn.make}</div></div>
                <div class="info-item"><div class="info-label">Model</div><div class="info-value">${tradeIn.model}</div></div>
                <div class="info-item"><div class="info-label">Trim</div><div class="info-value">${tradeIn.trim || 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">Color</div><div class="info-value">${tradeIn.color}</div></div>
                <div class="info-item"><div class="info-label">Mileage</div><div class="info-value">${tradeIn.mileage ? tradeIn.mileage.toLocaleString() : 'N/A'}</div></div>
                ${tradeIn.notes ? `<div class="info-item"><div class="info-label">Notes</div><div class="info-value">${tradeIn.notes}</div></div>` : ''}
                <div class="info-item"><div class="info-label">Status</div><div class="info-value">${tradeIn.pickedUp ? '<span class="picked-up-badge">✓ Picked Up</span>' : '<span class="status-badge status-pending-pickup">Awaiting Pickup</span>'}</div></div>
                ${tradeIn.pickedUp && tradeIn.pickedUpDate ? `<div class="info-item"><div class="info-label">Picked Up Date</div><div class="info-value">${new Date(tradeIn.pickedUpDate).toLocaleDateString()}</div></div>` : ''}
            </div>
            <div style="margin-top: 2rem;">
                <label class="custom-checkbox">
                    <input type="checkbox" ${tradeIn.pickedUp ? 'checked' : ''} onchange="toggleTradeInPickup(${tradeIn.id})">
                    <span class="checkbox-label">
                        <span class="checkbox-box"></span>
                        <span class="checkbox-text">Mark as Picked Up</span>
                    </span>
                </label>
            </div>
            <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                <button class="btn" onclick="enableTradeInEditMode(${tradeIn.id})" style="flex: 1;">✏️ Edit Trade-In</button>
            </div>
        `;
    } else {
        // Edit mode
        content.innerHTML = `
            <form id="editTradeInForm" onsubmit="saveTradeInEdit(event)">
                <div class="form-group">
                    <label for="editTradeStockNumber">Stock #</label>
                    <input type="text" id="editTradeStockNumber" value="${tradeIn.stockNumber || ''}">
                </div>
                <div class="form-group">
                    <label for="editTradeVin">VIN</label>
                    <input type="text" id="editTradeVin" value="${tradeIn.vin}" maxlength="17" minlength="17" pattern="[A-HJ-NPR-Z0-9]{17}" title="VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q)" required style="text-transform: uppercase;">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editTradeYear">Year</label>
                        <input type="number" id="editTradeYear" value="${tradeIn.year}" min="1980" max="2030" required title="Vehicle year must be between 1980 and 2030">
                    </div>
                    <div class="form-group">
                        <label for="editTradeMake">Make</label>
                        <input type="text" id="editTradeMake" value="${tradeIn.make}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editTradeModel">Model</label>
                        <input type="text" id="editTradeModel" value="${tradeIn.model}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTradeTrim">Trim</label>
                        <input type="text" id="editTradeTrim" value="${tradeIn.trim || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editTradeColor">Color</label>
                        <input type="text" id="editTradeColor" value="${tradeIn.color}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTradeMileage">Mileage</label>
                        <input type="number" id="editTradeMileage" value="${tradeIn.mileage || ''}" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label for="editTradeNotes">Notes</label>
                    <textarea id="editTradeNotes" rows="3">${tradeIn.notes || ''}</textarea>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="submit" class="btn" style="flex: 1;">💾 Save Changes</button>
                    <button type="button" class="btn btn-secondary" onclick="cancelTradeInEditMode()" style="flex: 1;">✖ Cancel</button>
                </div>
            </form>
        `;
    }
}

async function deleteTradeIn(tradeInId) {
    const confirmed = await showConfirmation('Are you sure you want to delete this trade-in? This action cannot be undone.');
    if (!confirmed) return;

    try {
        await fetch(`${API_BASE}/trade-ins/${tradeInId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        await loadTradeIns();
        closeTradeInDetailModal();
        showNotification('Trade-in deleted successfully!', 'success');
        renderCurrentPage();
    } catch (error) {
        console.error('Error deleting trade-in:', error);
        showNotification('Failed to delete trade-in: ' + error.message, 'error');
    }
}

async function schedulePickup(event) {
    event.preventDefault();
    if (!currentVehicle) return;
    currentVehicle.pickupDate = document.getElementById('pickupDate').value;
    currentVehicle.pickupTime = document.getElementById('pickupTime').value;
    currentVehicle.pickupNotes = document.getElementById('pickupNotes').value;
    currentVehicle.status = 'pickup-scheduled';
    try {
        await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(currentVehicle)
        });
        await loadInventory();
        closePickupScheduleModal();
        closeDetailModal();
        updateDashboard();
        renderCurrentPage();
        document.getElementById('pickupScheduleForm').reset();
    } catch (error) {
        console.error('Error scheduling pickup:', error);
        showNotification('Failed to schedule pickup. Please try again.', 'error');
    }
}

function completePickup(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    // Set the current vehicle
    currentVehicle = vehicle;
    
    // Open the sold modal to complete the sale
    openSoldModal();
}

function generateLabel(vehicle) {
    currentVehicle = vehicle;

    // Set stock number
    document.getElementById('labelStockNumber').textContent = `Stock #${vehicle.stockNumber}`;

    // Set vehicle description
    document.getElementById('labelVehicle').textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

    // Set additional info
    const labelInfo = document.getElementById('labelInfo');
    labelInfo.innerHTML = `
        <div><strong>VIN:</strong> ${vehicle.vin}</div>
        <div><strong>Trim:</strong> ${vehicle.trim} • <strong>Color:</strong> ${vehicle.color}</div>
    `;

    // Generate QR code with VIN only
    const qrContainer = document.getElementById('labelQR');
    qrContainer.innerHTML = '';

    // Create QR code - qrcode.js library auto-generates it
    try {
        // Using the qrcode.js library (different from qrcodejs)
        if (typeof QRCode !== 'undefined' && QRCode) {
            new QRCode(qrContainer, {
                text: vehicle.vin,
                width: 140,
                height: 140,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
            });
        } else {
            throw new Error('QRCode library not available');
        }
    } catch (error) {
        console.error('QRCode error:', error);
        // Fallback: display VIN as text
        qrContainer.innerHTML = `<div style="width: 140px; height: 140px; background: #f0f0f0; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 9px; text-align: center; padding: 8px; word-break: break-all; font-family: monospace; font-weight: 600;">${vehicle.vin}</div>`;
    }

    openLabelModal();
}

// Global variable to store selected label position
let selectedLabelPosition = null;

// OL125 label positions (2 columns × 5 rows)
const OL125_POSITIONS = [
    { row: 1, col: 1, top: '0.5in', left: '0.25in' },
    { row: 1, col: 2, top: '0.5in', left: '4.25in' },
    { row: 2, col: 1, top: '2.5in', left: '0.25in' },
    { row: 2, col: 2, top: '2.5in', left: '4.25in' },
    { row: 3, col: 1, top: '4.5in', left: '0.25in' },
    { row: 3, col: 2, top: '4.5in', left: '4.25in' },
    { row: 4, col: 1, top: '6.5in', left: '0.25in' },
    { row: 4, col: 2, top: '6.5in', left: '4.25in' },
    { row: 5, col: 1, top: '8.5in', left: '0.25in' },
    { row: 5, col: 2, top: '8.5in', left: '4.25in' }
];

function printLabel() {
    // Open position selector modal instead of printing directly
    openLabelPositionModal();
}

function openLabelPositionModal() {
    const modal = document.getElementById('labelPositionModal');
    const grid = document.getElementById('labelGrid');

    // Generate grid buttons
    grid.innerHTML = OL125_POSITIONS.map((pos, index) => `
        <button class="label-position-btn" onclick="selectLabelPosition(${index})">
            Row ${pos.row}, Col ${pos.col}
        </button>
    `).join('');

    modal.classList.add('active');
}

function closeLabelPositionModal() {
    document.getElementById('labelPositionModal').classList.remove('active');
    selectedLabelPosition = null;

    // Remove selected class from all buttons
    document.querySelectorAll('.label-position-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
}

function selectLabelPosition(index) {
    selectedLabelPosition = index;

    // Update button states
    document.querySelectorAll('.label-position-btn').forEach((btn, i) => {
        if (i === index) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function printSelectedPosition() {
    if (selectedLabelPosition === null) {
        showNotification('Please select a label position first', 'error');
        return;
    }

    const position = OL125_POSITIONS[selectedLabelPosition];
    const label = document.getElementById('label');

    // Set data attribute for CSS to use
    label.setAttribute('data-print-position', selectedLabelPosition);

    // Debug log
    console.log('Print position:', selectedLabelPosition, 'Position:', position);

    // Close modal
    closeLabelPositionModal();

    // Small delay to ensure styles are applied, then print
    setTimeout(() => {
        window.print();

        // Reset after print dialog closes (longer delay)
        setTimeout(() => {
            label.removeAttribute('data-print-position');
        }, 500);
    }, 200);
}

async function saveLabel() {
    const label = document.getElementById('label');
    try {
        const canvas = await html2canvas(label, { backgroundColor: '#ffffff', scale: 2 });
        const link = document.createElement('a');
        link.download = `label-${currentVehicle.stockNumber}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (error) {
        console.error('Error saving label:', error);
        showNotification('Failed to save label. Please try again.', 'error');
    }
}

async function copyLabel() {
    const label = document.getElementById('label');
    try {
        const canvas = await html2canvas(label, { backgroundColor: '#ffffff', scale: 2 });
        canvas.toBlob(async (blob) => {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                showNotification('Label copied to clipboard!', 'success');
            } catch (error) {
                console.error('Error copying to clipboard:', error);
                showNotification('Failed to copy label. Try saving instead.', 'error');
            }
        });
    } catch (error) {
        console.error('Error copying label:', error);
        showNotification('Failed to copy label. Please try again.', 'error');
    }
}

async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        showNotification('Please select a PDF file.', 'error');
        return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification('File size must be less than 10MB.', 'error');
        return;
    }

    if (!currentVehicle) {
        showNotification('No vehicle selected.', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('vehicleId', currentVehicle.id);
        formData.append('fileName', file.name);

        const response = await fetch(`${API_BASE}/documents/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload document');
        }

        const result = await response.json();

        // Add document to current vehicle
        if (!currentVehicle.documents) {
            currentVehicle.documents = [];
        }
        currentVehicle.documents.push(result.document);

        // Update vehicle in database
        const isInSold = soldVehicles.some(v => v.id === currentVehicle.id);
        const endpoint = isInSold ? 'sold-vehicles' : 'inventory';

        await fetch(`${API_BASE}/${endpoint}/${currentVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(currentVehicle)
        });

        await loadAllData();
        renderDocumentList();
        showNotification('Document uploaded successfully!', 'success');

        // Reset file input
        event.target.value = '';

    } catch (error) {
        console.error('Error uploading document:', error);
        showNotification('Failed to upload document: ' + error.message, 'error');
    }
}

function renderDocumentList() {
    const container = document.getElementById('documentList');
    if (!container || !currentVehicle) return;

    const documents = currentVehicle.documents || [];

    if (documents.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--joy-text-tertiary); font-size: 0.875rem;">No documents uploaded</div>';
        return;
    }

    container.innerHTML = documents.map((doc, index) => `
        <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem;
            background: var(--joy-bg-level1);
            border: 1px solid var(--joy-divider);
            border-radius: var(--joy-radius-sm);
            margin-bottom: 0.5rem;
            transition: all 0.2s;
        " onmouseover="this.style.background='var(--joy-bg-level2)'" onmouseout="this.style.background='var(--joy-bg-level1)'">
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    📄 ${doc.fileName}
                </div>
                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.25rem;">
                    ${doc.uploadDate ? `Uploaded: ${new Date(doc.uploadDate).toLocaleDateString()}` : ''}
                    ${doc.fileSize ? ` • ${formatFileSize(doc.fileSize)}` : ''}
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                <button class="btn btn-sm btn-secondary" onclick="viewPDFDocument(${index})" title="View Document">
                    👁️
                </button>
                <button class="btn btn-sm btn-secondary" onclick="downloadPDFDocument(${index})" title="Download">
                    💾
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePDFDocument(${index})" title="Delete">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function viewPDFDocument(index) {
    if (!currentVehicle || !currentVehicle.documents || !currentVehicle.documents[index]) {
        showNotification('Document not found.', 'error');
        return;
    }

    const doc = currentVehicle.documents[index];

    try {
        const response = await fetch(`${API_BASE}/documents/view/${doc.id}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load document');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Open in new tab
        window.open(url, '_blank');

        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);

    } catch (error) {
        console.error('Error viewing document:', error);
        showNotification('Failed to view document. Please try again.', 'error');
    }
}

async function downloadPDFDocument(index) {
    if (!currentVehicle || !currentVehicle.documents || !currentVehicle.documents[index]) {
        showNotification('Document not found.', 'error');
        return;
    }

    const doc = currentVehicle.documents[index];

    try {
        const response = await fetch(`${API_BASE}/documents/download/${doc.id}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to download document');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error downloading document:', error);
        showNotification('Failed to download document. Please try again.', 'error');
    }
}

async function deletePDFDocument(index) {
    if (!currentVehicle || !currentVehicle.documents || !currentVehicle.documents[index]) {
        showNotification('Document not found.', 'error');
        return;
    }

    const doc = currentVehicle.documents[index];

    const confirmed = await showConfirmation(`Are you sure you want to delete "${doc.fileName}"?`);
    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/documents/delete/${doc.id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete document');
        }

        // Remove document from current vehicle
        currentVehicle.documents.splice(index, 1);

        // Update vehicle in database
        const isInSold = soldVehicles.some(v => v.id === currentVehicle.id);
        const endpoint = isInSold ? 'sold-vehicles' : 'inventory';

        await fetch(`${API_BASE}/${endpoint}/${currentVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(currentVehicle)
        });

        await loadAllData();
        renderDocumentList();
        showNotification('Document deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting document:', error);
        showNotification('Failed to delete document: ' + error.message, 'error');
    }
}

async function saveVehicleDetailPDF() {
    if (!currentVehicle) return;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;
        
        // Add Brandon Tomes Subaru Logo (if you have it as base64 or URL)
        // For now, we'll create a text-based header
        
        // Header - Logo Area
        doc.setFillColor(41, 98, 255);
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        // Company Name (in place of logo)
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('BRANDON TOMES', pageWidth / 2, 18, { align: 'center' });
        
        doc.setFontSize(20);
        doc.text('SUBARU', pageWidth / 2, 30, { align: 'center' });
        
        // Fleet Department title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Fleet Department', pageWidth / 2, 55, { align: 'center' });
        
        let yPos = 70;
        
        // Helper function to create section with table
        const createSection = (title, fields, startY) => {
            let y = startY;
            
            // Section title
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(title, margin, y);
            y += 5;
            
            // Table settings
            const rowHeight = 10;
            const labelColWidth = 60;
            const valueColWidth = pageWidth - margin * 2 - labelColWidth;
            
            fields.forEach((field, index) => {
                const rowY = y;
                
                // Draw cell borders
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.3);
                
                // Label cell
                doc.setFillColor(245, 245, 245);
                doc.rect(margin, rowY, labelColWidth, rowHeight, 'FD');
                
                // Value cell
                doc.setFillColor(255, 255, 255);
                doc.rect(margin + labelColWidth, rowY, valueColWidth, rowHeight, 'FD');
                
                // Label text
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(field.label, margin + 3, rowY + 6.5);
                
                // Value text
                doc.setFont('helvetica', 'normal');
                const valueText = field.value || '';
                const splitValue = doc.splitTextToSize(valueText, valueColWidth - 6);
                doc.text(splitValue, margin + labelColWidth + 3, rowY + 6.5);
                
                y += rowHeight;
            });
            
            return y + 8;
        };
        
        // Vehicle Details Section
        const vehicleFields = [
            { label: 'Stock #', value: currentVehicle.stockNumber },
            { label: 'Year', value: currentVehicle.year.toString() },
            { label: 'Make', value: currentVehicle.make },
            { label: 'Model', value: currentVehicle.model },
            { label: 'Trim', value: currentVehicle.trim },
            { label: 'Color', value: currentVehicle.color },
            { label: 'VIN', value: currentVehicle.vin }
        ];
        yPos = createSection('Vehicle Details', vehicleFields, yPos);
        
        // Pickup Information Section
        const pickupFields = [
            { 
                label: 'Current Status', 
                value: currentVehicle.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
            }
        ];
        
        if (currentVehicle.pickupDate) {
            pickupFields.push({ 
                label: 'Pickup Date', 
                value: new Date(currentVehicle.pickupDate).toLocaleDateString() 
            });
        }
        
        if (currentVehicle.pickupTime) {
            pickupFields.push({ 
                label: 'Pickup Time', 
                value: currentVehicle.pickupTime 
            });
        }
        
        yPos = createSection('Pickup Information', pickupFields, yPos);
        
        // Customer / Fleet Information Section
        const customerFields = [];
        
        // Customer Name
        if (currentVehicle.customer && (currentVehicle.customer.firstName || currentVehicle.customer.lastName)) {
            const fullName = `${currentVehicle.customer.firstName || ''} ${currentVehicle.customer.lastName || ''}`.trim();
            customerFields.push({ label: 'Customer Name', value: fullName });
        } else {
            customerFields.push({ label: 'Customer Name', value: '' });
        }
        
        // Phone
        customerFields.push({ 
            label: 'Phone', 
            value: currentVehicle.customer?.phone || '' 
        });
        
        // Fleet Company
        customerFields.push({ 
            label: 'Fleet Company', 
            value: currentVehicle.fleetCompany || '' 
        });
        
        // Operating Company
        customerFields.push({ 
            label: 'Operating Company', 
            value: currentVehicle.operationCompany || '' 
        });
        
        yPos = createSection('Customer / Fleet Information', customerFields, yPos);
        
        // Notes Section
        let notesText = '';
        
        // Combine all notes
        if (currentVehicle.customer?.notes) {
            notesText += currentVehicle.customer.notes;
        }
        
        if (currentVehicle.pickupNotes) {
            if (notesText) notesText += '\n\n';
            notesText += 'Pickup Notes: ' + currentVehicle.pickupNotes;
        }
        
        const notesFields = [
            { label: 'Additional Notes', value: notesText }
        ];
        
        // Create notes section with larger height if needed
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Notes', margin, yPos);
        yPos += 5;
        
        // Draw notes box
        const notesHeight = Math.max(20, Math.min(60, notesText.length / 4));
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, yPos, pageWidth - margin * 2, notesHeight, 'FD');
        
        // Add notes text
        if (notesText) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const splitNotes = doc.splitTextToSize(notesText, pageWidth - margin * 2 - 6);
            doc.text(splitNotes, margin + 3, yPos + 6);
        }
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont('helvetica', 'normal');
        const footerText = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });
        
        // Save the PDF
        const fileName = `Fleet_Vehicle_${currentVehicle.stockNumber}_${currentVehicle.year}_${currentVehicle.make}_${currentVehicle.model}.pdf`.replace(/\s+/g, '_');
        doc.save(fileName);
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Failed to generate PDF. Please try again.', 'error');
    }
}

function updateDashboard() {
    // Update stat cards
    const totalVehicles = document.getElementById('totalVehicles');
    if (totalVehicles) totalVehicles.textContent = vehicles.length;

    const inStockVehicles = document.getElementById('inStockVehicles');
    if (inStockVehicles) inStockVehicles.textContent = vehicles.filter(v => v.status === 'in-stock').length;

    const inTransitCount = document.getElementById('inTransitCount');
    if (inTransitCount) inTransitCount.textContent = vehicles.filter(v => v.status === 'in-transit').length;

    const pendingPickupCount = document.getElementById('pendingPickupCount');
    if (pendingPickupCount) pendingPickupCount.textContent = vehicles.filter(v => v.status === 'pending-pickup').length;

    const pickupScheduledCount = document.getElementById('pickupScheduledCount');
    if (pickupScheduledCount) pickupScheduledCount.textContent = vehicles.filter(v => v.status === 'pickup-scheduled').length;

    const soldCount = document.getElementById('soldCount');
    if (soldCount) soldCount.textContent = soldVehicles.length;

    const tradeInsCount = document.getElementById('tradeInsCount');
    // Only count trade-ins that haven't been picked up yet
    if (tradeInsCount) tradeInsCount.textContent = tradeIns.filter(t => !t.pickedUp).length;

    // Helper function to get color based on vehicle age
    function getAgeColor(days) {
        if (days <= 45) return 'var(--joy-success-500)'; // Green
        if (days <= 60) return 'rgb(255, 152, 0)'; // Orange
        return 'var(--joy-danger-500)'; // Red
    }

    // Oldest Units Section
    const oldestVehicles = [...vehicles]
        .sort((a, b) => {
            const dateA = new Date(a.inStockDate || a.dateAdded);
            const dateB = new Date(b.inStockDate || b.dateAdded);
            return dateA - dateB;
        })
        .slice(0, 5);

    const oldestContainer = document.getElementById('oldestVehicles');
    if (oldestContainer) {
        if (oldestVehicles.length === 0) {
            oldestContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No vehicles in inventory</div>';
        } else {
            oldestContainer.innerHTML = oldestVehicles.map(v => {
                const stockDate = new Date(v.inStockDate || v.dateAdded);
                const daysOld = Math.floor((new Date() - stockDate) / (1000 * 60 * 60 * 24));
                const ageColor = getAgeColor(daysOld);
                const statusClass = `status-${v.status}`;
                const statusText = v.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return `
                    <div style="padding: 0.5rem; border-bottom: 1px solid var(--joy-divider);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.375rem; cursor: pointer;" onclick="openVehicleDetail(${v.id})">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.125rem;">
                                    Stock: ${v.stockNumber}
                                </div>
                            </div>
                            <div style="text-align: right; margin-left: 0.5rem;">
                                <div style="font-size: 0.75rem; font-weight: 600; color: ${ageColor};">
                                    ${daysOld} days
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.375rem; align-items: center;">
                            <span class="status-badge ${statusClass}" style="font-size: 0.6875rem; padding: 0.125rem 0.375rem;">${statusText}</span>
                            ${v.status === 'pending-pickup' ? `<button class="btn btn-sm btn-secondary" onclick="openPickupScheduleModal(); currentVehicle = vehicles.find(veh => veh.id === ${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.6875rem;">Schedule</button>` : ''}
                            ${v.status === 'pickup-scheduled' ? `<button class="btn btn-sm btn-primary" onclick="completePickup(${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.6875rem;">Complete</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Newest Units Section (exclude in-transit)
    const newestVehicles = [...vehicles]
        .filter(v => v.status !== 'in-transit')
        .sort((a, b) => {
            const dateA = new Date(a.inStockDate || a.dateAdded);
            const dateB = new Date(b.inStockDate || b.dateAdded);
            return dateB - dateA;
        })
        .slice(0, 5);

    const newestContainer = document.getElementById('newestVehicles');
    if (newestContainer) {
        if (newestVehicles.length === 0) {
            newestContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No vehicles in inventory</div>';
        } else {
            newestContainer.innerHTML = newestVehicles.map(v => {
                const stockDate = new Date(v.inStockDate || v.dateAdded);
                const daysOld = Math.floor((new Date() - stockDate) / (1000 * 60 * 60 * 24));
                const ageColor = getAgeColor(daysOld);
                const statusClass = `status-${v.status}`;
                const statusText = v.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                return `
                    <div style="padding: 0.5rem; border-bottom: 1px solid var(--joy-divider);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.375rem; cursor: pointer;" onclick="openVehicleDetail(${v.id})">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.125rem;">
                                    Stock: ${v.stockNumber}
                                </div>
                            </div>
                            <div style="text-align: right; margin-left: 0.5rem;">
                                <div style="font-size: 0.75rem; font-weight: 600; color: ${ageColor};">
                                    ${daysOld === 0 ? 'Today' : daysOld + ' days'}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.375rem; align-items: center;">
                            <span class="status-badge ${statusClass}" style="font-size: 0.6875rem; padding: 0.125rem 0.375rem;">${statusText}</span>
                            ${v.status === 'pending-pickup' ? `<button class="btn btn-sm btn-secondary" onclick="openPickupScheduleModal(); currentVehicle = vehicles.find(veh => veh.id === ${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.6875rem;">Schedule</button>` : ''}
                            ${v.status === 'pickup-scheduled' ? `<button class="btn btn-sm btn-primary" onclick="completePickup(${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.6875rem;">Complete</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Pending Pickups Section
    const pendingPickups = vehicles.filter(v => v.status === 'pending-pickup');
    const pendingContainer = document.getElementById('pendingPickups');

    if (pendingContainer) {
        if (pendingPickups.length === 0) {
            pendingContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No pending pickups</div>';
        } else {
            pendingContainer.innerHTML = pendingPickups.map(v => {
                const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : 'No customer';
                return `
                    <div style="padding: 0.5rem; border-bottom: 1px solid var(--joy-divider); cursor: pointer; transition: background 0.2s;"
                         onclick="openVehicleDetail(${v.id})"
                         onmouseover="this.style.background='var(--joy-bg-level1)'"
                         onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.125rem;">
                                    ${customerName}
                                </div>
                            </div>
                            <button class="btn btn-sm btn-secondary" onclick="openPickupScheduleModal(); currentVehicle = vehicles.find(v => v.id === ${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                Schedule
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
    
    // Scheduled Pickups Section
    const scheduledPickups = vehicles.filter(v => v.status === 'pickup-scheduled');
    const pickupsContainer = document.getElementById('scheduledPickups');

    if (pickupsContainer) {
        if (scheduledPickups.length === 0) {
            pickupsContainer.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--joy-text-tertiary); font-size: 0.875rem;">No pickups scheduled</div>';
        } else {
            pickupsContainer.innerHTML = scheduledPickups.map(v => {
                const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : 'No customer';
                return `
                    <div style="padding: 0.5rem; border-bottom: 1px solid var(--joy-divider); cursor: pointer; transition: background 0.2s;"
                         onclick="openVehicleDetail(${v.id})"
                         onmouseover="this.style.background='var(--joy-bg-level1)'"
                         onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.375rem;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-weight: 600; font-size: 0.875rem; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.125rem;">
                                    ${customerName}
                                </div>
                            </div>
                            <div style="text-align: right; margin-left: 0.5rem;">
                                <div style="font-size: 0.75rem; font-weight: 600; color: var(--joy-primary-500);">
                                    ${v.pickupDate ? new Date(v.pickupDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 'No date'}
                                </div>
                                <div style="font-size: 0.6875rem; color: var(--joy-text-tertiary);">
                                    ${v.pickupTime || 'No time'}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.375rem;">
                            <button class="btn btn-sm btn-primary" onclick="completePickup(${v.id}); event.stopPropagation();" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                                Complete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function renderCurrentPage() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    const pageId = activePage.id;
    switch(pageId) {
        case 'dashboard': updateDashboard(); break;
        case 'inventory': renderInventoryPage(); break;
        case 'in-transit': renderStatusPage('in-transit', 'transitGrid', 'transitSearchInput', 'transitMakeFilter'); break;
        case 'pdi': renderStatusPage('pdi', 'pdiGrid', 'pdiSearchInput', 'pdiMakeFilter'); break;
        case 'pending-pickup': renderStatusPage('pending-pickup', 'pendingPickupGrid', 'pendingPickupSearchInput', 'pendingPickupMakeFilter'); break;
        case 'pickup-scheduled': renderStatusPage('pickup-scheduled', 'pickupScheduledGrid', 'pickupScheduledSearchInput', 'pickupScheduledMakeFilter'); break;
        case 'sold': renderSoldPage(); break;
        case 'tradeins': renderTradeInsPage(); break;
        case 'payments': renderPaymentsPage(); break;
        case 'analytics': renderAnalytics(); break;
    }
}

function renderInventoryPage() {
    // Filter out in-transit vehicles from inventory view
    const nonTransitVehicles = vehicles.filter(v => v.status !== 'in-transit');
    const filtered = filterVehicles(nonTransitVehicles);
    const container = document.getElementById('inventoryGrid');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><p>No vehicles found</p></div>';
    } else {
        container.innerHTML = `
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>Stock #</th>
                        <th>Vehicle</th>
                        <th>VIN</th>
                        <th>Color</th>
                        <th>Fleet</th>
                        <th>Operation</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(v => createVehicleRow(v)).join('')}
                </tbody>
            </table>
        `;
    }
    updateMakeFilter('makeFilter', nonTransitVehicles);
}

function renderStatusPage(status, gridId, searchId, makeFilterId) {
    const filtered = vehicles.filter(v => v.status === status);
    const container = document.getElementById(gridId);
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><p>No vehicles in this status</p></div>';
    } else {
        container.innerHTML = `
            <table class="modern-table">
                <thead>
                    <tr>
                        <th>Stock #</th>
                        <th>Vehicle</th>
                        <th>VIN</th>
                        <th>Color</th>
                        <th>Fleet</th>
                        <th>Operation</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(v => createVehicleRow(v)).join('')}
                </tbody>
            </table>
        `;
    }
    updateMakeFilter(makeFilterId, filtered);
}

function renderSoldPage() {
    const container = document.getElementById('soldGrid');
    if (soldVehicles.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div><p>No sold vehicles</p></div>';
    } else {
        container.innerHTML = `
            <table class="vehicle-table" style="width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 12px; overflow: hidden;">
                <thead style="background: rgba(10, 132, 255, 0.1); border-bottom: 2px solid var(--border); position: sticky; top: 0; z-index: 10;">
                    <tr>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem;">Stock #</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem;">Vehicle</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem;">VIN</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem;">Color</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem;">Fleet</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem;">Operation</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem;">Customer</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem;">Status</th>
                        <th style="padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${soldVehicles.map(v => createVehicleRow(v)).join('')}
                </tbody>
            </table>
        `;
    }
    updateMakeFilter('soldMakeFilter', soldVehicles);
}

function renderTradeInsPage() {
    const container = document.getElementById('tradeInGrid');

    // Separate trade-ins into picked up and awaiting pickup
    const awaitingPickup = tradeIns.filter(t => !t.pickedUp);
    const pickedUp = tradeIns.filter(t => t.pickedUp);

    if (tradeIns.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔄</div><p>No fleet returns</p></div>';
    } else {
        container.innerHTML = `
            ${awaitingPickup.length > 0 ? `
                <div style="margin-bottom: 2rem;">
                    <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: var(--joy-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                        <span>⏳</span> Awaiting Pickup <span style="background: var(--joy-warning-500); color: white; padding: 0.125rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${awaitingPickup.length}</span>
                    </h3>
                    <div class="vehicle-grid">
                        ${awaitingPickup.map(t => createTradeInCard(t)).join('')}
                    </div>
                </div>
            ` : ''}

            ${pickedUp.length > 0 ? `
                <div>
                    <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: var(--joy-text-primary); display: flex; align-items: center; gap: 0.5rem;">
                        <span>✓</span> Picked Up <span style="background: var(--joy-success-500); color: white; padding: 0.125rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${pickedUp.length}</span>
                    </h3>
                    <div class="vehicle-grid">
                        ${pickedUp.map(t => createTradeInCard(t)).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }
    updateMakeFilter('tradeInMakeFilter', tradeIns);
}

function createVehicleRow(vehicle) {
    const statusClass = `status-${vehicle.status}`;
    const statusText = vehicle.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const customerName = vehicle.customer ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim() : '';
    const dateAdded = new Date(vehicle.dateAdded).toLocaleDateString();

    return `
        <tr class="vehicle-row" onclick="openVehicleDetail(${vehicle.id})" style="cursor: pointer;">
            <td>
                <div style="font-weight: 600; font-size: 0.875rem; color: var(--accent);">${vehicle.stockNumber}</div>
            </td>
            <td>
                <div style="font-weight: 600; font-size: 0.875rem;">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.125rem;">${vehicle.trim}</div>
            </td>
            <td>
                <div style="font-size: 0.8125rem;">${vehicle.vin}</div>
            </td>
            <td>
                <div style="font-size: 0.8125rem;">${vehicle.color}</div>
            </td>
            <td>
                ${vehicle.fleetCompany ? `<div style="font-size: 0.8125rem;">${vehicle.fleetCompany}</div>` : '<div style="font-size: 0.8125rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td>
                ${vehicle.operationCompany ? `<div style="font-size: 0.8125rem;">${vehicle.operationCompany}</div>` : '<div style="font-size: 0.8125rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td>
                ${customerName ? `<div style="font-size: 0.8125rem;">${customerName}</div>` : '<div style="font-size: 0.8125rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td onclick="event.stopPropagation();">
                <div style="display: flex; gap: 0.375rem;">
                    <button class="btn btn-small btn-secondary" onclick="openVehicleDetail(${vehicle.id})" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Details</button>
                    <button class="btn btn-small btn-secondary" onclick="openStatusPopup(${vehicle.id}, event)" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;">Status</button>
                </div>
            </td>
        </tr>
    `;
}

// Compact card for dashboard
function createVehicleCard(vehicle) {
    const statusClass = `status-${vehicle.status}`;
    const statusText = vehicle.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    return `
        <div class="vehicle-card" onclick="openVehicleDetail(${vehicle.id})" style="cursor: pointer;">
            <div class="vehicle-header">
                <div class="vehicle-stock">${vehicle.stockNumber}</div>
                <div class="vehicle-title">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
            </div>
            <div class="vehicle-body" style="padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${vehicle.vin}</div>
                        <div style="font-size: 0.875rem; margin-top: 0.25rem;">${vehicle.trim} • ${vehicle.color}</div>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        </div>
    `;
}

function createTradeInCard(tradeIn) {
    return `
        <div class="vehicle-card ${tradeIn.pickedUp ? 'picked-up-card' : ''}" onclick="openTradeInDetail(${tradeIn.id})" style="cursor: pointer;">
            <div class="vehicle-header">
                <div class="vehicle-stock">${tradeIn.stockNumber || 'Fleet Return'}</div>
                <div class="vehicle-title">${tradeIn.year} ${tradeIn.make} ${tradeIn.model}</div>
            </div>
            <div class="vehicle-body">
                <div class="vehicle-info">
                    <div class="info-item"><div class="info-label">VIN</div><div class="info-value">${tradeIn.vin}</div></div>
                    <div class="info-item"><div class="info-label">Color</div><div class="info-value">${tradeIn.color}</div></div>
                    <div class="info-item"><div class="info-label">Mileage</div><div class="info-value">${tradeIn.mileage ? tradeIn.mileage.toLocaleString() : 'N/A'}</div></div>
                    <div class="info-item"><div class="info-label">Status</div><div class="info-value">${tradeIn.pickedUp ? '<span class="picked-up-badge">✓ Picked Up</span>' : '<span class="status-badge status-pending-pickup">Awaiting Pickup</span>'}</div></div>
                </div>
                ${tradeIn.notes ? `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);"><div class="info-label">Notes</div><div class="info-value">${tradeIn.notes}</div></div>` : ''}
                ${tradeIn.pickedUp && tradeIn.pickedUpDate ? `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);"><div class="info-label">Picked Up</div><div class="info-value">${formatDate(tradeIn.pickedUpDate)}</div></div>` : ''}
                <div class="vehicle-actions" onclick="event.stopPropagation();">
                    <label class="custom-checkbox">
                        <input type="checkbox" id="pickup-${tradeIn.id}" ${tradeIn.pickedUp ? 'checked' : ''} onchange="toggleTradeInPickup(${tradeIn.id})">
                        <span class="checkbox-label">
                            <span class="checkbox-box"></span>
                            <span class="checkbox-text">Mark as Picked Up</span>
                        </span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

function renderDetailModal(vehicle) {
    const isFromSold = soldVehicles.some(v => v.id === vehicle.id);
    const isFromTradeIn = tradeIns.some(t => t.id === vehicle.id);
    const vehicleJson = JSON.stringify(vehicle).replace(/"/g, '&quot;');
    const content = document.getElementById('detailContent');
    
    const isEditing = window.currentlyEditingVehicle === vehicle.id;
    
    if (!isEditing) {
        // Display mode
        content.innerHTML = `
            <div class="vehicle-info">
                <div class="info-item"><div class="info-label">Stock #</div><div class="info-value">${vehicle.stockNumber}</div></div>
                <div class="info-item"><div class="info-label">VIN</div><div class="info-value">${vehicle.vin}</div></div>
                <div class="info-item"><div class="info-label">Year</div><div class="info-value">${vehicle.year}</div></div>
                <div class="info-item"><div class="info-label">Make</div><div class="info-value">${vehicle.make}</div></div>
                <div class="info-item"><div class="info-label">Model</div><div class="info-value">${vehicle.model}</div></div>
                <div class="info-item"><div class="info-label">Trim</div><div class="info-value">${vehicle.trim}</div></div>
                <div class="info-item"><div class="info-label">Color</div><div class="info-value">${vehicle.color}</div></div>
                <div class="info-item"><div class="info-label">Fleet Company</div><div class="info-value">${vehicle.fleetCompany || 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">Operation Company</div><div class="info-value">${vehicle.operationCompany || 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">In Stock Date</div><div class="info-value">${vehicle.inStockDate ? new Date(vehicle.inStockDate).toLocaleDateString() : 'N/A'}</div></div>
                <div class="info-item"><div class="info-label">Days in Stock</div><div class="info-value">${Math.floor((new Date() - new Date(vehicle.inStockDate || vehicle.dateAdded)) / (1000 * 60 * 60 * 24))} days</div></div>
            </div>
            <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                <button class="btn btn-secondary" onclick='generateLabel(${vehicleJson})' style="flex: 1;">🏷️ Generate Label</button>
                ${!isFromTradeIn ? `<button class="btn" onclick="enableEditMode(${vehicle.id})" style="flex: 1;">✏️ Edit Vehicle</button>` : ''}
            </div>
        `;
    } else {
        // Edit mode
        content.innerHTML = `
            <form id="editVehicleForm" onsubmit="saveVehicleEdit(event)">
                <div class="form-group">
                    <label for="editStockNumber">Stock #</label>
                    <input type="text" id="editStockNumber" value="${vehicle.stockNumber}" required>
                </div>
                <div class="form-group">
                    <label for="editVin">VIN</label>
                    <input type="text" id="editVin" value="${vehicle.vin}" maxlength="17" minlength="17" pattern="[A-HJ-NPR-Z0-9]{17}" title="VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q)" required style="text-transform: uppercase;">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editYear">Year</label>
                        <input type="number" id="editYear" value="${vehicle.year}" min="2000" max="2030" required title="Vehicle year must be between 2000 and 2030">
                    </div>
                    <div class="form-group">
                        <label for="editMake">Make</label>
                        <input type="text" id="editMake" value="${vehicle.make}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editModel">Model</label>
                        <input type="text" id="editModel" value="${vehicle.model}" required>
                    </div>
                    <div class="form-group">
                        <label for="editTrim">Trim</label>
                        <input type="text" id="editTrim" value="${vehicle.trim}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editColor">Color</label>
                        <input type="text" id="editColor" value="${vehicle.color}" required>
                    </div>
                    <div class="form-group">
                        <label for="editFleetCompany">Fleet Company</label>
                        <input type="text" id="editFleetCompany" value="${vehicle.fleetCompany || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="editOperationCompany">Operation Company</label>
                    <input type="text" id="editOperationCompany" value="${vehicle.operationCompany || ''}">
                </div>
                <div class="form-group">
                    <label for="editInStockDate">In Stock Date</label>
                    <input type="date" id="editInStockDate" value="${vehicle.inStockDate ? new Date(vehicle.inStockDate).toISOString().split('T')[0] : ''}">
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="submit" class="btn" style="flex: 1;">💾 Save Changes</button>
                    <button type="button" class="btn btn-secondary" onclick="cancelEditMode()" style="flex: 1;">✖ Cancel</button>
                </div>
            </form>
        `;
    }
    
    document.getElementById('detailStatus').value = vehicle.status;
    
    if (vehicle.customer) {
        document.getElementById('customerFirstName').value = vehicle.customer.firstName || '';
        document.getElementById('customerLastName').value = vehicle.customer.lastName || '';
        document.getElementById('customerPhone').value = vehicle.customer.phone || '';
        document.getElementById('saleAmount').value = vehicle.customer.saleAmount || '';
        document.getElementById('saleDate').value = vehicle.customer.saleDate || '';
        document.getElementById('paymentMethod').value = vehicle.customer.paymentMethod || '';
        document.getElementById('paymentReference').value = vehicle.customer.paymentReference || '';
        document.getElementById('notes').value = vehicle.customer.notes || '';
    } else {
        document.getElementById('customerForm').reset();
    }

    // Render document list
    renderDocumentList();
}

// Store chart instances to destroy them before re-rendering
let chartInstances = {};

function renderAnalytics() {
    // Destroy existing charts to prevent memory leaks and rendering issues
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    chartInstances = {};

    const period = document.getElementById('revenuePeriodFilter')?.value || 'monthly';

    // Chart color palette
    const colors = {
        primary: 'rgba(10, 132, 255, 0.8)',
        success: 'rgba(50, 215, 75, 0.8)',
        warning: 'rgba(255, 159, 10, 0.8)',
        danger: 'rgba(255, 69, 58, 0.8)',
        purple: 'rgba(191, 90, 242, 0.8)',
        teal: 'rgba(100, 210, 255, 0.8)',
        pink: 'rgba(255, 55, 95, 0.8)',
        orange: 'rgba(255, 149, 0, 0.8)'
    };

    const textColor = '#cbd5e1';
    const gridColor = 'rgba(226, 232, 240, 0.12)';

    // 1. Revenue Tracker Chart
    renderRevenueChart(period, colors, textColor, gridColor);

    // 2. Average Days to Sale Chart
    renderAgeChart(colors, textColor, gridColor);

    // 3. Inventory Status Distribution Chart
    renderStatusChart(colors, textColor);

    // 4. Vehicles by Make Chart
    renderMakeChart(colors, textColor, gridColor);

    // 5. Payment Method Distribution Chart
    renderPaymentChart(colors, textColor);

    // 6. Top Selling Models Chart
    renderTopModelsChart(colors, textColor, gridColor);

    // 7. Fleet Company Distribution Chart
    renderFleetCompanyChart(colors, textColor, gridColor);
}

function renderRevenueChart(period, colors, textColor, gridColor) {
    const soldVehicles = vehicles.filter(v => v.status === 'sold' && v.saleDate && v.saleAmount);

    if (soldVehicles.length === 0) {
        const canvas = document.getElementById('revenueChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No sales data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const revenueData = {};

    soldVehicles.forEach(v => {
        const date = new Date(v.saleDate);
        let key;

        if (period === 'weekly') {
            const weekNum = getWeekNumber(date);
            key = `Week ${weekNum}, ${date.getFullYear()}`;
        } else if (period === 'monthly') {
            key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        } else {
            key = date.getFullYear().toString();
        }

        revenueData[key] = (revenueData[key] || 0) + parseFloat(v.saleAmount || 0);
    });

    const sortedKeys = Object.keys(revenueData).sort((a, b) => {
        const dateA = parsePeriodKey(a, period);
        const dateB = parsePeriodKey(b, period);
        return dateA - dateB;
    });

    const canvas = document.getElementById('revenueChart');
    if (canvas) {
        chartInstances.revenue = new Chart(canvas, {
            type: 'line',
            data: {
                labels: sortedKeys,
                datasets: [{
                    label: 'Revenue ($)',
                    data: sortedKeys.map(k => revenueData[k]),
                    backgroundColor: 'rgba(50, 215, 75, 0.2)',
                    borderColor: colors.success,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: colors.success,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Revenue: $${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: (value) => '$' + value.toLocaleString()
                        },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

function renderAgeChart(colors, textColor, gridColor) {
    const soldVehicles = vehicles.filter(v => v.status === 'sold' && v.saleDate && v.inStockDate);

    if (soldVehicles.length === 0) {
        const canvas = document.getElementById('ageChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No sold vehicle data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const ageByMake = {};

    soldVehicles.forEach(v => {
        const inStockDate = new Date(v.inStockDate);
        const saleDate = new Date(v.saleDate);
        const daysInInventory = Math.floor((saleDate - inStockDate) / (1000 * 60 * 60 * 24));

        if (!ageByMake[v.make]) {
            ageByMake[v.make] = { total: 0, count: 0 };
        }
        ageByMake[v.make].total += daysInInventory;
        ageByMake[v.make].count += 1;
    });

    const averages = Object.keys(ageByMake).map(make => ({
        make,
        avg: ageByMake[make].total / ageByMake[make].count
    })).sort((a, b) => b.avg - a.avg);

    const canvas = document.getElementById('ageChart');
    if (canvas) {
        chartInstances.age = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: averages.map(a => a.make),
                datasets: [{
                    label: 'Avg Days in Inventory',
                    data: averages.map(a => a.avg),
                    backgroundColor: colors.warning,
                    borderColor: colors.warning.replace('0.8', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `Avg Days: ${Math.round(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            callback: (value) => Math.round(value) + ' days'
                        },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

function renderStatusChart(colors, textColor) {
    const statusData = {
        'In Stock': 0,
        'In-Transit': 0,
        'PDI': 0,
        'Pending Pickup': 0,
        'Pickup Scheduled': 0,
        'Sold': 0
    };

    vehicles.forEach(v => {
        switch(v.status) {
            case 'in-stock': statusData['In Stock']++; break;
            case 'in-transit': statusData['In-Transit']++; break;
            case 'pdi': statusData['PDI']++; break;
            case 'pending-pickup': statusData['Pending Pickup']++; break;
            case 'pickup-scheduled': statusData['Pickup Scheduled']++; break;
            case 'sold': statusData['Sold']++; break;
        }
    });

    const canvas = document.getElementById('statusChart');
    if (canvas) {
        chartInstances.status = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: [
                        colors.primary,
                        colors.warning,
                        colors.purple,
                        colors.orange,
                        colors.success,
                        colors.teal
                    ],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textColor,
                            font: { size: 11, weight: '600' },
                            padding: 10
                        }
                    }
                }
            }
        });
    }
}

function renderMakeChart(colors, textColor, gridColor) {
    const makeData = {};
    vehicles.forEach(v => { makeData[v.make] = (makeData[v.make] || 0) + 1; });

    const canvas = document.getElementById('makeChart');
    if (canvas) {
        chartInstances.make = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Object.keys(makeData),
                datasets: [{
                    label: 'Vehicles by Make',
                    data: Object.values(makeData),
                    backgroundColor: colors.primary,
                    borderColor: colors.primary.replace('0.8', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            stepSize: 1
                        },
                        grid: { color: gridColor }
                    },
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

function renderPaymentChart(colors, textColor) {
    const soldVehicles = vehicles.filter(v => v.status === 'sold' && v.paymentMethod);

    if (soldVehicles.length === 0) {
        const canvas = document.getElementById('paymentChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No payment data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const paymentData = {};
    soldVehicles.forEach(v => {
        paymentData[v.paymentMethod] = (paymentData[v.paymentMethod] || 0) + 1;
    });

    const canvas = document.getElementById('paymentChart');
    if (canvas) {
        chartInstances.payment = new Chart(canvas, {
            type: 'pie',
            data: {
                labels: Object.keys(paymentData),
                datasets: [{
                    data: Object.values(paymentData),
                    backgroundColor: [
                        colors.success,
                        colors.primary,
                        colors.purple
                    ],
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: { size: 11, weight: '600' },
                            padding: 15
                        }
                    }
                }
            }
        });
    }
}

function renderTopModelsChart(colors, textColor, gridColor) {
    const soldVehicles = vehicles.filter(v => v.status === 'sold');

    if (soldVehicles.length === 0) {
        const canvas = document.getElementById('modelsChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No sold vehicle data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const modelData = {};
    soldVehicles.forEach(v => {
        const modelKey = `${v.make} ${v.model}`;
        modelData[modelKey] = (modelData[modelKey] || 0) + 1;
    });

    const sortedModels = Object.entries(modelData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const canvas = document.getElementById('modelsChart');
    if (canvas) {
        chartInstances.models = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sortedModels.map(m => m[0]),
                datasets: [{
                    label: 'Units Sold',
                    data: sortedModels.map(m => m[1]),
                    backgroundColor: colors.teal,
                    borderColor: colors.teal.replace('0.8', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            stepSize: 1
                        },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

function renderFleetCompanyChart(colors, textColor, gridColor) {
    // Filter for vehicles currently on lot (not sold)
    const onLotVehicles = vehicles.filter(v => v.status !== 'sold' && v.fleetCompany);

    if (onLotVehicles.length === 0) {
        const canvas = document.getElementById('fleetCompanyChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = textColor;
            ctx.font = '14px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('No fleet company data available', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const companyData = {};
    onLotVehicles.forEach(v => {
        const company = v.fleetCompany || 'Unknown';
        companyData[company] = (companyData[company] || 0) + 1;
    });

    const sortedCompanies = Object.entries(companyData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const canvas = document.getElementById('fleetCompanyChart');
    if (canvas) {
        chartInstances.fleetCompany = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: sortedCompanies.map(c => c[0]),
                datasets: [{
                    label: 'Units on Lot',
                    data: sortedCompanies.map(c => c[1]),
                    backgroundColor: colors.pink,
                    borderColor: colors.pink.replace('0.8', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12, weight: '600' } }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    x: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            stepSize: 1
                        },
                        grid: { color: gridColor }
                    }
                }
            }
        });
    }
}

// Helper function to get week number
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Helper function to parse period keys for sorting
function parsePeriodKey(key, period) {
    if (period === 'yearly') {
        return new Date(parseInt(key), 0, 1);
    } else if (period === 'monthly') {
        const parts = key.split(' ');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames.indexOf(parts[0]);
        const year = parseInt(parts[1]);
        return new Date(year, month, 1);
    } else {
        const parts = key.split(', ');
        const year = parseInt(parts[1]);
        const week = parseInt(parts[0].split(' ')[1]);
        return new Date(year, 0, 1 + (week - 1) * 7);
    }
}

function filterVehicles(vehicleList) {
    return vehicleList.filter(v => {
        const searchTerm = currentFilter.search.toLowerCase();
        const matchesSearch = !searchTerm || v.stockNumber.toLowerCase().includes(searchTerm) || v.vin.toLowerCase().includes(searchTerm) || v.make.toLowerCase().includes(searchTerm) || v.model.toLowerCase().includes(searchTerm);
        const matchesMake = !currentFilter.make || v.make === currentFilter.make;
        const matchesStatus = !currentFilter.status || v.status === currentFilter.status;
        return matchesSearch && matchesMake && matchesStatus;
    });
}

function updateMakeFilter(selectId, vehicleList) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const makes = [...new Set(vehicleList.map(v => v.make))].sort();
    const currentValue = select.value;
    select.innerHTML = '<option value="">All Makes</option>' + makes.map(make => `<option value="${make}" ${make === currentValue ? 'selected' : ''}>${make}</option>`).join('');
}

function openAddModal() { document.getElementById('addModal').classList.add('active'); }
function closeAddModal() { document.getElementById('addModal').classList.remove('active'); document.getElementById('vehicleForm').reset(); }
function openVehicleDetail(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId) || soldVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    currentVehicle = vehicle;
    window.currentVehicleId = vehicleId; // Set for delete button
    renderDetailModal(vehicle);
    document.getElementById('detailModal').classList.add('active');
}
function closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); currentVehicle = null; }
function openLabelModal() { document.getElementById('labelModal').classList.add('active'); }
function closeLabelModal() { document.getElementById('labelModal').classList.remove('active'); }
function openTradeInModal() {
    document.getElementById('tradeInModal').classList.add('active');
}
function openManualTradeInModal() {
    // This is for manually adding trade-ins from the trade-ins page
    document.getElementById('tradeInModalTitle').textContent = 'Add Trade-In Vehicle';
    const stockNumberInput = document.getElementById('tradeStockNumber');
    const stockNumberHint = document.getElementById('tradeStockNumberHint');

    // Make stock number editable and show hint
    stockNumberInput.removeAttribute('readonly');
    stockNumberInput.style.background = '';
    stockNumberInput.style.cursor = '';
    stockNumberInput.placeholder = 'Enter stock number';
    if (stockNumberHint) stockNumberHint.style.display = 'inline';

    openTradeInModal();
}
function closeTradeInModal() {
    document.getElementById('tradeInModal').classList.remove('active');
    document.getElementById('tradeInForm').reset();

    // Reset stock number hint visibility
    const stockNumberHint = document.getElementById('tradeStockNumberHint');
    if (stockNumberHint) stockNumberHint.style.display = 'none';
}
function openPickupScheduleModal() { document.getElementById('pickupScheduleModal').classList.add('active'); }
function closePickupScheduleModal() { document.getElementById('pickupScheduleModal').classList.remove('active'); document.getElementById('pickupScheduleForm').reset(); }
function openSoldModal() {
    document.getElementById('soldModal').classList.add('active');
    // Reset trade-in section
    document.getElementById('hasTradeIn').value = 'no';
    toggleTradeInSection();
}
function closeSoldModal() {
    document.getElementById('soldModal').classList.remove('active');
    document.getElementById('soldForm').reset();
    // Reset trade-in section
    document.getElementById('hasTradeIn').value = 'no';
    toggleTradeInSection();
}

// Open status popup
function openStatusPopup(vehicleId, event) {
    event.stopPropagation();
    
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    const button = event.target;
    const popup = document.getElementById('statusPopup');
    const rect = button.getBoundingClientRect();
    
    // Create status options
    const statuses = [
        { value: 'in-stock', label: 'In Stock', class: 'status-in-stock' },
        { value: 'in-transit', label: 'In-Transit', class: 'status-in-transit' },
        { value: 'pdi', label: 'PDI', class: 'status-pdi' },
        { value: 'pending-pickup', label: 'Pending Pickup', class: 'status-pending-pickup' },
        { value: 'pickup-scheduled', label: 'Pickup Scheduled', class: 'status-pickup-scheduled' },
        { value: 'sold', label: 'Sold', class: 'status-sold' }
    ];
    
    popup.innerHTML = statuses.map(status => `
        <div class="status-popup-option ${vehicle.status === status.value ? 'selected' : ''}" 
             onclick="quickStatusChange(${vehicleId}, '${status.value}')">
            <span class="status-badge ${status.class}" style="margin-right: 0.5rem;">${status.label}</span>
        </div>
    `).join('');
    
    // Show popup temporarily to get its height
    popup.style.visibility = 'hidden';
    popup.classList.add('active');
    
    // Calculate positions
    const popupHeight = popup.offsetHeight;
    const popupWidth = popup.offsetWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let top = rect.bottom + window.scrollY + 5;
    let left = rect.left + window.scrollX;
    
    // Check if popup goes off bottom of screen
    if (rect.bottom + popupHeight + 5 > viewportHeight) {
        // Position above button instead
        top = rect.top + window.scrollY - popupHeight - 5;
    }
    
    // Check if popup goes off right of screen
    if (left + popupWidth > viewportWidth) {
        // Align to right edge of button
        left = rect.right + window.scrollX - popupWidth;
    }
    
    // Make sure it doesn't go off left edge
    if (left < 0) {
        left = 10;
    }
    
    // Make sure it doesn't go off top edge
    if (top < window.scrollY) {
        top = window.scrollY + 10;
    }
    
    // Position popup
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
    popup.style.visibility = 'visible';
    
    // Close popup when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeStatusPopup);
    }, 0);
}

function closeStatusPopup() {
    const popup = document.getElementById('statusPopup');
    popup.classList.remove('active');
    document.removeEventListener('click', closeStatusPopup);
}

// Quick status change from card dropdown
async function quickStatusChange(vehicleId, newStatus) {
    closeStatusPopup(); // Close the popup immediately
    
    if (!newStatus) return;
    
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    
    currentVehicle = vehicle;
    
    // If changing to sold, show sold modal
    if (newStatus === 'sold') {
        openSoldModal();
        return;
    }
    
    // If changing to pickup-scheduled, show pickup schedule modal
    if (newStatus === 'pickup-scheduled') {
        openPickupScheduleModal();
        return;
    }
    
    // Regular status change
    vehicle.status = newStatus;
    try {
        const response = await fetch(`${API_BASE}/inventory/${vehicleId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(vehicle)
        });
        if (!response.ok) throw new Error('Failed to update vehicle');
        await loadInventory();
        updateDashboard();
        renderCurrentPage();
    } catch (error) {
        console.error('Error updating vehicle:', error);
        alert('Failed to update vehicle status. Please try again.');
    }
}

function toggleTradeInSection() {
    const hasTradeIn = document.getElementById('hasTradeIn').value;
    const tradeInSection = document.getElementById('tradeInSection');
    const tradeInFields = ['tradeInVin', 'tradeInYear', 'tradeInMake', 'tradeInModel', 'tradeInColor'];

    if (hasTradeIn === 'yes') {
        tradeInSection.style.display = 'block';
        // Set required attributes
        tradeInFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.required = true;
        });

        // Generate stock number based on current vehicle
        if (currentVehicle && currentVehicle.stockNumber) {
            document.getElementById('tradeInStockNumber').value = currentVehicle.stockNumber + '-A';
        }
    } else {
        tradeInSection.style.display = 'none';
        // Remove required attributes and clear values
        tradeInFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.required = false;
                field.value = '';
            }
        });
        document.getElementById('tradeInStockNumber').value = '';
    }
}

async function handleSoldSubmit(event) {
    event.preventDefault();
    if (!currentVehicle) return;

    // Get payment information
    const saleInfo = {
        saleAmount: parseFloat(document.getElementById('soldAmount').value) || 0,
        saleDate: document.getElementById('soldDate').value,
        paymentMethod: document.getElementById('soldPaymentMethod').value,
        paymentReference: document.getElementById('soldReference').value,
        notes: document.getElementById('soldNotes').value
    };

    // Preserve existing customer info if it exists
    currentVehicle.customer = {
        ...(currentVehicle.customer || {}),
        ...saleInfo
    };

    const soldVehicle = { ...currentVehicle, status: 'sold' };

    try {
        // Check if vehicle already exists in sold_vehicles table
        const existsInSold = soldVehicles.some(v => v.id === currentVehicle.id);

        if (existsInSold) {
            // Update existing sold vehicle
            const updateResponse = await fetch(`${API_BASE}/sold-vehicles/${currentVehicle.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(soldVehicle)
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.error || 'Failed to update sold vehicle');
            }
        } else {
            // Add to sold vehicles
            const soldResponse = await fetch(`${API_BASE}/sold-vehicles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(soldVehicle)
            });

            if (!soldResponse.ok) {
                const errorData = await soldResponse.json();
                throw new Error(errorData.error || 'Failed to add sold vehicle');
            }
        }

        // Delete from inventory (if it exists there)
        const existsInInventory = vehicles.some(v => v.id === currentVehicle.id);
        if (existsInInventory) {
            const deleteResponse = await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!deleteResponse.ok) {
                throw new Error('Failed to remove from inventory');
            }
        }

        // Check if there's a trade-in
        const hasTradeIn = document.getElementById('hasTradeIn').value;
        if (hasTradeIn === 'yes') {
            // Validate VIN format
            const tradeInVin = document.getElementById('tradeInVin').value.toUpperCase();
            const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
            if (!vinPattern.test(tradeInVin)) {
                throw new Error('Invalid trade-in VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).');
            }

            // Create trade-in vehicle
            const tradeIn = {
                id: Date.now(),
                stockNumber: document.getElementById('tradeInStockNumber').value,
                vin: tradeInVin,
                year: parseInt(document.getElementById('tradeInYear').value),
                make: document.getElementById('tradeInMake').value,
                model: document.getElementById('tradeInModel').value,
                trim: '',
                color: document.getElementById('tradeInColor').value,
                mileage: 0,
                notes: `Trade-in for ${currentVehicle.stockNumber} (${currentVehicle.year} ${currentVehicle.make} ${currentVehicle.model})`,
                pickedUp: false,
                pickedUpDate: null,
                dateAdded: new Date().toISOString()
            };

            // Add trade-in to database
            const tradeInResponse = await fetch(`${API_BASE}/trade-ins`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(tradeIn)
            });

            if (!tradeInResponse.ok) {
                throw new Error('Failed to add trade-in vehicle');
            }
        }

        await loadAllData();
        closeSoldModal();
        closeDetailModal();
        updateDashboard();
        renderCurrentPage();

        // Clear the form and reset trade-in section
        document.getElementById('soldForm').reset();
        document.getElementById('hasTradeIn').value = 'no';
        toggleTradeInSection();

        showNotification('Vehicle marked as sold successfully!' + (hasTradeIn === 'yes' ? ' Trade-in vehicle added.' : ''), 'success');

    } catch (error) {
        console.error('Error marking vehicle as sold:', error);
        showNotification('Failed to mark vehicle as sold: ' + error.message, 'error');
    }
}

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
        const pageNames = {
            'dashboard': 'Dashboard',
            'inventory': 'Inventory',
            'in-transit': 'In-Transit',
            'pdi': 'PDI',
            'pending-pickup': 'Pending Pickup',
            'pickup-scheduled': 'Pickup Scheduled',
            'sold': 'Sold Vehicles',
            'tradeins': 'Trade-Ins',
            'payments': 'Payments',
            'analytics': 'Analytics'
        };
        breadcrumb.textContent = pageNames[pageId] || 'Dashboard';
    }

    renderCurrentPage();
}

// Helper function for navigating from dashboard cards
function navigateTo(pageId) {
    switchPage(pageId);
}

function formatDate(dateString) { if (!dateString) return 'N/A'; return new Date(dateString).toLocaleDateString(); }

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    
    // Add event listeners only if elements exist
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', login);
    
    const vehicleForm = document.getElementById('vehicleForm');
    if (vehicleForm) vehicleForm.addEventListener('submit', addVehicle);
    
    const customerForm = document.getElementById('customerForm');
    if (customerForm) customerForm.addEventListener('submit', saveCustomerInfo);
    
    const tradeInForm = document.getElementById('tradeInForm');
    if (tradeInForm) tradeInForm.addEventListener('submit', addTradeIn);
    
    const pickupScheduleForm = document.getElementById('pickupScheduleForm');
    if (pickupScheduleForm) pickupScheduleForm.addEventListener('submit', schedulePickup);
    
    const soldForm = document.getElementById('soldForm');
    if (soldForm) soldForm.addEventListener('submit', handleSoldSubmit);
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) { 
            e.preventDefault(); 
            const pageId = this.getAttribute('data-page'); 
            switchPage(pageId); 
        });
    });
    
    if (document.getElementById('searchInput')) {
        document.getElementById('searchInput').addEventListener('input', function(e) { 
            currentFilter.search = e.target.value; 
            renderCurrentPage(); 
        });
    }
    
    if (document.getElementById('makeFilter')) {
        document.getElementById('makeFilter').addEventListener('change', function(e) { 
            currentFilter.make = e.target.value; 
            renderCurrentPage(); 
        });
    }
    
    if (document.getElementById('statusFilter')) {
        document.getElementById('statusFilter').addEventListener('change', function(e) { 
            currentFilter.status = e.target.value; 
            renderCurrentPage(); 
        });
    }
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) { 
            if (e.target === this) this.classList.remove('active'); 
        });
    });
});

// Payment Tracking Functions
function renderPaymentsPage() {
    const soldVehiclesWithPayments = soldVehicles.filter(v => 
        v.customer && 
        v.customer.saleDate && 
        (v.customer.paymentMethod || v.customer.paymentReference || v.customer.saleAmount)
    );
    
    const tbody = document.getElementById('paymentsTableBody');
    const tfoot = document.getElementById('paymentsTableFooter');
    if (!tbody || !tfoot) return;
    
    if (soldVehiclesWithPayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No payment records found</td></tr>';
        tfoot.innerHTML = '';
        return;
    }
    
    let totalAmount = 0;
    
    tbody.innerHTML = soldVehiclesWithPayments.map(vehicle => {
        const customerName = `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim() || 'N/A';
        const saleDate = vehicle.customer.saleDate ? new Date(vehicle.customer.saleDate).toLocaleDateString() : 'N/A';
        const saleAmount = parseFloat(vehicle.customer.saleAmount) || 0;
        const paymentMethod = vehicle.customer.paymentMethod || 'N/A';
        const paymentRef = vehicle.customer.paymentReference || 'N/A';
        
        totalAmount += saleAmount;
        
        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 1rem;">${vehicle.stockNumber}</td>
                <td style="padding: 1rem;">${vehicle.year} ${vehicle.make} ${vehicle.model}</td>
                <td style="padding: 1rem;">${customerName}</td>
                <td style="padding: 1rem;">${saleDate}</td>
                <td style="padding: 1rem; text-align: right; font-weight: 600; font-family: monospace;">$${saleAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="padding: 1rem;">
                    <span class="status-badge ${
                        paymentMethod === 'ACH' ? 'status-in-stock' :
                        paymentMethod === 'Check' ? 'status-pending-pickup' :
                        paymentMethod === 'Credit Card' ? 'status-pickup-scheduled' :
                        'status-pdi'
                    }">${paymentMethod}</span>
                </td>
                <td style="padding: 1rem; font-family: monospace;">${paymentRef}</td>
                <td style="padding: 1rem;">
                    <button class="btn btn-small btn-secondary" onclick="openVehicleDetail(${vehicle.id})">View</button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Add total row
    tfoot.innerHTML = `
        <tr>
            <td colspan="4" style="padding: 1rem; text-align: right; font-weight: 700; font-size: 1.1rem;">Total:</td>
            <td style="padding: 1rem; text-align: right; font-weight: 700; font-size: 1.1rem; font-family: monospace; color: var(--accent);">$${totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td colspan="3"></td>
        </tr>
    `;
}

function filterPayments() {
    const searchTerm = document.getElementById('paymentSearchInput')?.value.toLowerCase() || '';
    const methodFilter = document.getElementById('paymentMethodFilter')?.value || '';
    
    const rows = document.querySelectorAll('#paymentsTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const methodCell = row.cells[5]?.textContent.trim() || ''; // Updated index for payment method column
        
        const matchesSearch = text.includes(searchTerm);
        const matchesMethod = !methodFilter || methodCell.includes(methodFilter);
        
        row.style.display = (matchesSearch && matchesMethod) ? '' : 'none';
    });
}

// ==================== UTILITY FUNCTIONS ====================

// Utility function to fix in-stock dates for all in-transit vehicles
// Can be called from browser console or triggered by a button
async function fixInTransitDates() {
    const confirmed = await showConfirmation(
        'This will clear the in-stock date for ALL vehicles currently in "In-Transit" status. Continue?'
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_BASE}/inventory/fix-intransit-dates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fix in-transit dates');
        }

        const result = await response.json();
        showNotification(result.message || 'Successfully fixed in-transit dates!', 'success');

        // Reload data to reflect changes
        await loadAllData();
        updateDashboard();
        renderCurrentPage();

        console.log('Fixed in-transit dates:', result);
    } catch (error) {
        console.error('Error fixing in-transit dates:', error);
        showNotification('Failed to fix in-transit dates: ' + error.message, 'error');
    }
}

// Make function available globally for console access
window.fixInTransitDates = fixInTransitDates;
