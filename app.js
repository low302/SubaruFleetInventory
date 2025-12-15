const API_BASE = '/api';
let vehicles = [];
let soldVehicles = [];
let tradeIns = [];
let currentVehicle = null;
let currentFilter = { search: '', make: '', status: '' };

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
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Connection error. Please try again.');
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
        alert('Invalid VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Vehicle';
        return;
    }

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
        status: document.getElementById('status').value,
        dateAdded: new Date().toISOString(),
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
        alert('Vehicle added successfully!');
        
    } catch (error) {
        console.error('Error adding vehicle:', error);
        alert('Failed to add vehicle: ' + error.message);
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
            alert('Vehicle moved back to inventory successfully!');
            
        } catch (error) {
            console.error('Error moving vehicle from sold:', error);
            alert('Failed to update vehicle status: ' + error.message);
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
            alert('Failed to update vehicle status. Please try again.');
        }
    }
}

async function deleteVehicle(vehicleId) {
    if (!confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) return;
    
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
        alert('Vehicle deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        alert('Failed to delete vehicle: ' + error.message);
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
        alert('Customer information saved successfully!');
        renderDetailModal(currentVehicle);
    } catch (error) {
        console.error('Error saving customer info:', error);
        alert('Failed to save customer information. Please try again.');
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
        alert('Invalid VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).');
        return;
    }

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
        operationCompany: document.getElementById('editOperationCompany').value
    };
    
    try {
        const isInSold = soldVehicles.some(v => v.id === currentVehicle.id);
        const endpoint = isInSold ? 'sold-vehicles' : 'inventory';
        
        const response = await fetch(`${API_BASE}/${endpoint}/${updatedVehicle.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updatedVehicle)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save vehicle changes');
        }
        
        await loadAllData();
        window.currentlyEditingVehicle = null;
        currentVehicle = updatedVehicle;
        renderDetailModal(currentVehicle);
        updateDashboard();
        renderCurrentPage();
        alert('Vehicle updated successfully!');
        
    } catch (error) {
        console.error('Error saving vehicle:', error);
        alert('Failed to save vehicle changes: ' + error.message);
    }
}

async function addTradeIn(event) {
    event.preventDefault();

    // Validate VIN format (17 alphanumeric characters, no I, O, or Q)
    const vinInput = document.getElementById('tradeVin').value.toUpperCase();
    const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinPattern.test(vinInput)) {
        alert('Invalid VIN format. VIN must be exactly 17 characters (letters and numbers, excluding I, O, Q).');
        return;
    }

    const tradeIn = {
        id: Date.now(),
        stockNumber: document.getElementById('tradeStockNumber').value,
        vin: vinInput,
        year: parseInt(document.getElementById('tradeYear').value),
        make: document.getElementById('tradeMake').value,
        model: document.getElementById('tradeModel').value,
        trim: document.getElementById('tradeTrim').value,
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
    } catch (error) {
        console.error('Error adding trade-in:', error);
        alert('Failed to add fleet return. Please try again.');
    }
}

async function toggleTradeInPickup(tradeInId) {
    const tradeIn = tradeIns.find(t => t.id === tradeInId);
    if (!tradeIn) return;
    if (!tradeIn.pickedUp) {
        currentVehicle = tradeIn;
        openTradePickupModal();
    } else {
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
            alert('Failed to update fleet return. Please try again.');
        }
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
        alert('Failed to schedule pickup. Please try again.');
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
    document.getElementById('labelStockNumber').textContent = vehicle.stockNumber;
    const labelInfo = document.getElementById('labelInfo');
    labelInfo.innerHTML = `
        <div style="color: #000;"><strong>VIN:</strong> ${vehicle.vin}</div>
        <div style="color: #000;"><strong>Year:</strong> ${vehicle.year}</div>
        <div style="color: #000;"><strong>Make:</strong> ${vehicle.make}</div>
        <div style="color: #000;"><strong>Model:</strong> ${vehicle.model}</div>
        <div style="color: #000;"><strong>Trim:</strong> ${vehicle.trim}</div>
        <div style="color: #000;"><strong>Color:</strong> ${vehicle.color}</div>
    `;
    const qrContainer = document.getElementById('labelQR');
    qrContainer.innerHTML = '';
    const qrData = JSON.stringify({
        stockNumber: vehicle.stockNumber,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model
    });
    new QRCode(qrContainer, {
        text: qrData,
        width: 80,
        height: 80,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    openLabelModal();
}

function printLabel() { window.print(); }

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
        alert('Failed to save label. Please try again.');
    }
}

async function copyLabel() {
    const label = document.getElementById('label');
    try {
        const canvas = await html2canvas(label, { backgroundColor: '#ffffff', scale: 2 });
        canvas.toBlob(async (blob) => {
            try {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                alert('Label copied to clipboard!');
            } catch (error) {
                console.error('Error copying to clipboard:', error);
                alert('Failed to copy label. Try saving instead.');
            }
        });
    } catch (error) {
        console.error('Error copying label:', error);
        alert('Failed to copy label. Please try again.');
    }
}

function updateDashboard() {
    // Update stat cards
    const totalVehicles = document.getElementById('totalVehicles');
    if (totalVehicles) totalVehicles.textContent = vehicles.length;
    
    const inStockVehicles = document.getElementById('inStockVehicles');
    if (inStockVehicles) inStockVehicles.textContent = vehicles.filter(v => v.status === 'in-stock').length;
    
    const soldCount = document.getElementById('soldCount');
    if (soldCount) soldCount.textContent = soldVehicles.length;
    
    const tradeInsCount = document.getElementById('tradeInsCount');
    if (tradeInsCount) tradeInsCount.textContent = tradeIns.length;
    
    // Oldest Units Section
    const oldestVehicles = [...vehicles]
        .sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded))
        .slice(0, 5);
    
    const oldestContainer = document.getElementById('oldestVehicles');
    if (oldestContainer) {
        if (oldestVehicles.length === 0) {
            oldestContainer.innerHTML = '<div class="empty-state" style="padding: 2rem;"><div class="empty-state-icon">🚗</div><p>No vehicles in inventory</p></div>';
        } else {
            oldestContainer.innerHTML = oldestVehicles.map(v => {
                const daysOld = Math.floor((new Date() - new Date(v.dateAdded)) / (1000 * 60 * 60 * 24));
                return `
                    <div style="padding: 0.75rem; border-bottom: 1px solid var(--joy-divider); cursor: pointer; transition: background 0.2s;" 
                         onclick="openVehicleDetail(${v.id})"
                         onmouseover="this.style.background='var(--joy-bg-level1)'" 
                         onmouseout="this.style.background='transparent'">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <div style="font-weight: 600; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.8125rem; color: var(--joy-text-tertiary); margin-top: 0.25rem;">
                                    Stock: ${v.stockNumber} • ${v.trim}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <span class="status-badge status-${v.status}">${v.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary); margin-top: 0.25rem;">
                                    ${daysOld} days old
                                </div>
                            </div>
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
            pickupsContainer.innerHTML = '<div class="empty-state" style="padding: 2rem;"><div class="empty-state-icon">📅</div><p>No pickups scheduled</p></div>';
        } else {
            pickupsContainer.innerHTML = scheduledPickups.map(v => {
                const customerName = v.customer ? `${v.customer.firstName || ''} ${v.customer.lastName || ''}`.trim() : 'No customer';
                return `
                    <div style="padding: 0.75rem; border-bottom: 1px solid var(--joy-divider);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <div>
                                <div style="font-weight: 600; color: var(--joy-text-primary);">${v.year} ${v.make} ${v.model}</div>
                                <div style="font-size: 0.8125rem; color: var(--joy-text-tertiary); margin-top: 0.25rem;">
                                    ${customerName}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 0.8125rem; font-weight: 600; color: var(--joy-primary-500);">
                                    ${v.pickupDate ? new Date(v.pickupDate).toLocaleDateString() : 'No date'}
                                </div>
                                <div style="font-size: 0.75rem; color: var(--joy-text-tertiary);">
                                    ${v.pickupTime || 'No time'}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-sm btn-secondary" onclick="openVehicleDetail(${v.id}); event.stopPropagation();">
                                View Details
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="completePickup(${v.id}); event.stopPropagation();">
                                ✓ Complete
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
    const filtered = filterVehicles(vehicles);
    const container = document.getElementById('inventoryGrid');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><p>No vehicles found</p></div>';
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
                    ${filtered.map(v => createVehicleRow(v)).join('')}
                </tbody>
            </table>
        `;
    }
    updateMakeFilter('makeFilter', vehicles);
}

function renderStatusPage(status, gridId, searchId, makeFilterId) {
    const filtered = vehicles.filter(v => v.status === status);
    const container = document.getElementById(gridId);
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🚗</div><p>No vehicles in this status</p></div>';
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
    if (tradeIns.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔄</div><p>No fleet returns</p></div>';
    } else {
        container.innerHTML = tradeIns.map(t => createTradeInCard(t)).join('');
    }
    updateMakeFilter('tradeInMakeFilter', tradeIns);
}

function createVehicleRow(vehicle) {
    const statusClass = `status-${vehicle.status}`;
    const statusText = vehicle.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const customerName = vehicle.customer ? `${vehicle.customer.firstName || ''} ${vehicle.customer.lastName || ''}`.trim() : '';
    const dateAdded = new Date(vehicle.dateAdded).toLocaleDateString();
    
    return `
        <tr class="vehicle-row" onclick="openVehicleDetail(${vehicle.id})" style="cursor: pointer; border-bottom: 1px solid var(--border); transition: background 0.2s;">
            <td style="padding: 0.875rem 1rem;">
                <div style="font-weight: 600; color: var(--accent);">${vehicle.stockNumber}</div>
            </td>
            <td style="padding: 0.875rem 1rem;">
                <div style="font-weight: 600;">${vehicle.year} ${vehicle.make} ${vehicle.model}</div>
                <div style="font-size: 0.8125rem; color: var(--text-secondary); margin-top: 0.25rem;">${vehicle.trim}</div>
            </td>
            <td style="padding: 0.875rem 1rem;">
                <div style="font-size: 0.875rem;">${vehicle.vin}</div>
            </td>
            <td style="padding: 0.875rem 1rem;">
                <div style="font-size: 0.875rem;">${vehicle.color}</div>
            </td>
            <td style="padding: 0.875rem 1rem;">
                ${vehicle.fleetCompany ? `<div style="font-size: 0.875rem;">${vehicle.fleetCompany}</div>` : '<div style="font-size: 0.875rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td style="padding: 0.875rem 1rem;">
                ${vehicle.operationCompany ? `<div style="font-size: 0.875rem;">${vehicle.operationCompany}</div>` : '<div style="font-size: 0.875rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td style="padding: 0.875rem 1rem;">
                ${customerName ? `<div style="font-size: 0.875rem;">${customerName}</div>` : '<div style="font-size: 0.875rem; color: var(--text-secondary);">-</div>'}
            </td>
            <td style="padding: 0.875rem 1rem;">
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td style="padding: 0.875rem 1rem;" onclick="event.stopPropagation();">
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-small btn-secondary" onclick="openVehicleDetail(${vehicle.id})">Details</button>
                    <button class="btn btn-small btn-secondary" onclick="openStatusPopup(${vehicle.id}, event)">Status</button>
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
        <div class="vehicle-card">
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
                <div class="vehicle-actions">
                    <div class="checkbox-group" style="flex: 1;">
                        <input type="checkbox" id="pickup-${tradeIn.id}" ${tradeIn.pickedUp ? 'checked' : ''} onchange="toggleTradeInPickup(${tradeIn.id})">
                        <label for="pickup-${tradeIn.id}">Mark as Picked Up</label>
                    </div>
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
}

function renderAnalytics() {
    const makeData = {};
    vehicles.forEach(v => { makeData[v.make] = (makeData[v.make] || 0) + 1; });
    
    const canvas = document.getElementById('makeChart');
    if (canvas) {
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Object.keys(makeData),
                datasets: [{ 
                    label: 'Vehicles by Make', 
                    data: Object.values(makeData), 
                    backgroundColor: 'rgba(11, 107, 203, 0.8)', 
                    borderColor: 'rgba(11, 107, 203, 1)', 
                    borderWidth: 1 
                }]
            },
            options: {
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        labels: { color: '#171A1C' } 
                    } 
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { color: '#555E68' }, 
                        grid: { color: 'rgba(205, 215, 225, 0.3)' } 
                    }, 
                    x: { 
                        ticks: { color: '#555E68' }, 
                        grid: { color: 'rgba(205, 215, 225, 0.3)' } 
                    } 
                }
            }
        });
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
function openTradeInModal() { document.getElementById('tradeInModal').classList.add('active'); }
function closeTradeInModal() { document.getElementById('tradeInModal').classList.remove('active'); document.getElementById('tradeInForm').reset(); }
function openPickupScheduleModal() { document.getElementById('pickupScheduleModal').classList.add('active'); }
function closePickupScheduleModal() { document.getElementById('pickupScheduleModal').classList.remove('active'); document.getElementById('pickupScheduleForm').reset(); }
function openSoldModal() { document.getElementById('soldModal').classList.add('active'); }
function closeSoldModal() { document.getElementById('soldModal').classList.remove('active'); document.getElementById('soldForm').reset(); }

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

async function handleSoldSubmit(event) {
    event.preventDefault();
    if (!currentVehicle) return;
    
    // Get customer information from form
    currentVehicle.customer = {
        firstName: document.getElementById('soldFirstName').value,
        lastName: document.getElementById('soldLastName').value,
        phone: document.getElementById('soldPhone').value,
        saleAmount: parseFloat(document.getElementById('soldAmount').value) || 0,
        saleDate: document.getElementById('soldDate').value,
        notes: document.getElementById('soldNotes').value
    };
    
    const soldVehicle = { ...currentVehicle, status: 'sold' };
    
    try {
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
        
        // Delete from inventory
        const deleteResponse = await fetch(`${API_BASE}/inventory/${currentVehicle.id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!deleteResponse.ok) {
            throw new Error('Failed to remove from inventory');
        }
        
        await loadAllData();
        closeSoldModal();
        closeDetailModal();
        updateDashboard();
        renderCurrentPage();
        alert('Vehicle marked as sold successfully!');
        
    } catch (error) {
        console.error('Error marking vehicle as sold:', error);
        alert('Failed to mark vehicle as sold: ' + error.message);
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
