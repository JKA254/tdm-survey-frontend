// Frontend logic for Land Parcel Management
// Handles UI switching, Excel import/export, Shapefile import, and API calls

// Dynamic API URL configuration
const API_URL = (() => {
    // Check if we're running on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    
    // GitHub Pages - Try HTTPS first, fallback to demo data if Mixed Content blocked
    if (window.location.hostname.includes('github.io')) {
        // We'll try both HTTPS and HTTP, but expect Mixed Content issues
        return 'https://tdmbackup.synology.me/api'; // Try HTTPS first
    }
    
    // Other development environments
    if (window.location.hostname.includes('ngrok') || 
        window.location.hostname.includes('192.168.')) {
        return `${window.location.protocol}//${window.location.host}/api`;
    }
    
    // Default fallback
    return `${window.location.protocol}//${window.location.host}/api`;
})();

console.log('🌐 API URL configured:', API_URL);

// Global variables
let parcels = [];
let organizations = [];
let currentParcel = null;
let selectedOrganization = 'all';
let isOffline = false;

// Check if app is working offline
function checkOfflineStatus() {
    isOffline = !navigator.onLine;
    return isOffline;
}

// Enhanced API call with offline support and Mixed Content warning
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (response.ok) {
            return response;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ API Error:', error.message);
        
        // Check if it's a Mixed Content error
        if (error.message.includes('Mixed Content') || 
            error.message.includes('HTTPS') ||
            window.location.protocol === 'https:' && url.startsWith('http:')) {
            
            showMixedContentWarning();
        }
        
        throw error;
    }
}

// Show Mixed Content warning to user
function showMixedContentWarning() {
    const warning = document.createElement('div');
    warning.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #ff4444;
        color: white;
        padding: 15px;
        border-radius: 5px;
        z-index: 9999;
        max-width: 300px;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    warning.innerHTML = `
        <strong>🔒 Mixed Content Blocked</strong><br>
        กรุณาคลิกไอคอน "โล่" หรื้อ "ไม่ปลอดภัย" ข้างบาร์ URL<br>
        แล้วเลือก "Load unsafe scripts" เพื่อใช้งานแอป
        <button onclick="this.parentNode.remove()" style="float:right;background:none;border:none;color:white;cursor:pointer;font-size:18px;">×</button>
    `;
    document.body.appendChild(warning);
}

// Check if app is working offline
function checkOfflineStatus() {
    isOffline = !navigator.onLine;
    return isOffline;
}

// Enhanced API call with offline support
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if this was served from cache (offline mode)
        if (data.offline) {
            showNotification('💾 ข้อมูลถูกเก็บไว้ จะส่งเมื่อออนไลน์', 'info');
        }
        
        return data;
    } catch (error) {
        console.error('❌ API Error:', error.message);
        
        // Check if it's a Mixed Content error
        if (error.message.includes('Mixed Content') || 
            error.message.includes('HTTPS') ||
            (window.location.protocol === 'https:' && url.startsWith('http:'))) {
            
            showMixedContentWarning();
        }
        
        // If it's a POST request and we're offline, the service worker will handle it
        if (options.method === 'POST' && !navigator.onLine) {
            return { success: true, offline: true, message: 'ข้อมูลถูกเก็บไว้แล้ว' };
        }
        
        throw error;
    }
}
}

// Load organizations
async function loadOrganizations() {
    try {
        const data = await apiCall(`${API_URL}/organizations`);
        organizations = data;
        updateOrganizationSelectors();
    } catch (error) {
        console.error('Error loading organizations:', error);
        // Fallback organizations for offline use
        organizations = [
            { org_name: 'อบต.ไชยคราม', parcel_count: 0 },
            { org_name: 'อบต.บางแก้ว', parcel_count: 0 },
            { org_name: 'อบต.คลองขุด', parcel_count: 0 },
            { org_name: 'อบต.บางไผ่', parcel_count: 0 },
            { org_name: 'อบต.สามโคก', parcel_count: 0 }
        ];
        updateOrganizationSelectors();
        showNotification('⚠️ ใช้ข้อมูลแบบออฟไลน์', 'warning');
    }
}

// Update organization selectors
function updateOrganizationSelectors() {
    const selectors = ['organizationSelect', 'ieOrgSelect', 'shapeOrgSelect'];
    
    selectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            // Keep "all" option for main selector only
            if (selectorId === 'organizationSelect') {
                selector.innerHTML = '<option value="all">ทั้งหมด (แสดงทุก อบต.)</option>';
            } else {
                selector.innerHTML = '';
            }
            
            organizations.forEach(org => {
                const option = document.createElement('option');
                option.value = org.org_name;
                option.textContent = `${org.org_name} (${org.parcel_count || 0} รายการ)`;
                selector.appendChild(option);
            });
            
            // Set default selection to first organization for non-main selectors
            if (selectorId !== 'organizationSelect' && organizations.length > 0) {
                selector.value = organizations[0].org_name;
            }
        }
    });
}

// Select organization and update display
function selectOrganization(orgName) {
    selectedOrganization = orgName;
    
    // Update header title with organization name
    const headerTitle = document.getElementById('headerTitle');
    if (orgName === 'all') {
        headerTitle.textContent = 'ระบบจัดการที่ดิน - ทุก อบท.';
    } else {
        headerTitle.textContent = orgName;
    }
    
    // Update organization selector
    const orgSelect = document.getElementById('organizationSelect');
    if (orgSelect) {
        orgSelect.value = orgName;
    }
    
    // Update bottom navigation active state
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-org') === orgName) {
            item.classList.add('active');
        }
    });
    
    // Show loading and reload parcels
    showLoading(true);
    loadParcels().then(() => {
        showLoading(false);
    });
}

// Change organization from dropdown
function changeOrganization() {
    const orgSelect = document.getElementById('organizationSelect');
    selectOrganization(orgSelect.value);
}

// Load parcels from database with organization filter
async function loadParcels() {
    try {
        console.log('🔄 Loading parcels for organization:', selectedOrganization);
        const orgParam = selectedOrganization === 'all' ? '' : `?org=${encodeURIComponent(selectedOrganization)}`;
        
        // Try multiple API endpoints for better reliability
        const endpoints = [
            `${API_URL}/land_parcels${orgParam}`,
            `http://tdmbackup.synology.me:8080/api/land_parcels${orgParam}`, // Direct HTTP fallback
            `https://tdmbackup.synology.me/api/land_parcels${orgParam}` // HTTPS fallback
        ];
        
        let response = null;
        let lastError = null;
        
        for (const endpoint of endpoints) {
            try {
                console.log('� Trying endpoint:', endpoint);
                response = await fetch(endpoint, {
                    method: 'GET',
                    mode: 'cors'
                });
                
                if (response.ok) {
                    console.log('✅ Success with endpoint:', endpoint);
                    parcels = await response.json();
                    console.log('✅ Loaded parcels:', parcels.length);
                    
                    // Filter by organization if needed
                    if (selectedOrganization !== 'all') {
                        parcels = parcels.filter(p => p.organization_name === selectedOrganization);
                        console.log('🔍 Filtered parcels:', parcels.length);
                    }
                    
                    renderParcelList();
                    updateParcelCount();
                    return; // Success, exit function
                }
            } catch (error) {
                console.warn(`❌ Failed endpoint ${endpoint}:`, error.message);
                lastError = error;
                continue; // Try next endpoint
            }
        }
        
        // If all endpoints failed, show real data from known working API
        console.warn('⚠️ All API endpoints failed, trying direct data fetch...');
        await loadRealDataFallback();
        
    } catch (error) {
        console.error('❌ Critical error loading parcels:', error);
        await loadRealDataFallback();
    }
}

// Fallback function to load real data directly
async function loadRealDataFallback() {
    try {
        // Use direct fetch without CORS restrictions if possible
        const response = await fetch('http://tdmbackup.synology.me:8080/api/land_parcels', {
            method: 'GET'
        });
        
        if (response.ok) {
            const realData = await response.json();
            console.log('✅ Loaded real fallback data:', realData.length);
            
            // Filter by organization
            if (selectedOrganization !== 'all') {
                parcels = realData.filter(p => p.organization_name === selectedOrganization);
            } else {
                parcels = realData;
            }
            
            renderParcelList();
            updateParcelCount();
            showNotification('✅ โหลดข้อมูลจากฐานข้อมูลสำเร็จ', 'success');
            return;
        }
    } catch (error) {
        console.error('❌ Fallback also failed:', error);
    }
    
    // Final fallback - use demo data but mark it clearly
    console.log('📝 Using demo data as final fallback');
    parcels = [
        { parcel_cod: '02A001', organization_name: 'อบต.ลำนาว', owner_name: 'ข้อมูลตัวอย่าง (ไม่ได้เชื่อมต่อฐานข้อมูล)', ryw: '47-0-0', coordinates: '9.2774653641324,99.6308034154171' },
        { parcel_cod: '02B001', organization_name: 'อบต.ลำนาว', owner_name: 'ข้อมูลตัวอย่าง (ไม่ได้เชื่อมต่อฐานข้อมูล)', ryw: '43845', coordinates: '9.27538969077421,99.6326572522743' },
        { parcel_cod: '02C001', organization_name: 'อบต.ลำนาว', owner_name: 'ข้อมูลตัวอย่าง (ไม่ได้เชื่อมต่อฐานข้อมูล)', ryw: '29233', coordinates: '9.27763149696953,99.6330194589285' }
    ];
    
    renderParcelList();
    updateParcelCount();
    showNotification('⚠️ ใช้ข้อมูลตัวอย่าง - ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'warning');
}

// Update parcel count display
function updateParcelCount(count = null) {
    const parcelCountSpan = document.getElementById('parcelCount');
    if (parcelCountSpan) {
        const displayCount = count !== null ? count : parcels.length;
        const orgText = selectedOrganization === 'all' ? 'ทุก อบต.' : selectedOrganization;
        parcelCountSpan.textContent = `รายการ: ${displayCount} (${orgText})`;
    }
    
    // Update dashboard statistics
    updateDashboardStats();
}

// Update dashboard statistics
function updateDashboardStats() {
    const stats = calculateParcelStats();
    updateStatsDisplay(stats);
}

// Calculate parcel statistics
function calculateParcelStats() {
    if (!parcels || parcels.length === 0) {
        return {
            total: 0,
            totalValue: 0,
            averageValue: 0,
            byOrganization: {},
            byLandType: {},
            recentUpdates: 0
        };
    }
    
    const stats = {
        total: parcels.length,
        totalValue: 0,
        byOrganization: {},
        byLandType: {},
        recentUpdates: 0
    };
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    parcels.forEach(parcel => {
        // Count by organization
        const org = parcel.org_name || parcel.organization_name || 'ไม่ระบุ';
        stats.byOrganization[org] = (stats.byOrganization[org] || 0) + 1;
        
        // Count by land type
        const landType = parcel.land_type || 'ไม่ระบุ';
        stats.byLandType[landType] = (stats.byLandType[landType] || 0) + 1;
        
        // Calculate total value
        if (parcel.assessed_value) {
            stats.totalValue += parseFloat(parcel.assessed_value) || 0;
        }
        
        // Count recent updates
        if (parcel.timestamp) {
            const updateDate = new Date(parcel.timestamp);
            if (updateDate >= oneWeekAgo) {
                stats.recentUpdates++;
            }
        }
    });
    
    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;
    
    return stats;
}

// Update stats display in the UI
function updateStatsDisplay(stats) {
    // Update total count
    const totalElement = document.getElementById('totalParcels');
    if (totalElement) {
        totalElement.textContent = stats.total.toLocaleString('th-TH');
    }
    
    // Update total value
    const valueElement = document.getElementById('totalValue');
    if (valueElement) {
        valueElement.textContent = stats.totalValue.toLocaleString('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }) + ' บาท';
    }
    
    // Update average value
    const avgElement = document.getElementById('averageValue');
    if (avgElement) {
        avgElement.textContent = stats.averageValue.toLocaleString('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }) + ' บาท';
    }
    
    // Update recent updates count
    const recentElement = document.getElementById('recentUpdates');
    if (recentElement) {
        recentElement.textContent = stats.recentUpdates + ' รายการ';
    }
}

// Render charts for dashboard
function renderCharts() {
    const stats = calculateParcelStats();
    renderOrganizationChart(stats.byOrganization);
    renderLandTypeChart(stats.byLandType);
}

// Render organization chart
function renderOrganizationChart(orgData) {
    const container = document.getElementById('orgChart');
    if (!container || !orgData) return;
    
    container.innerHTML = '';
    
    const maxValue = Math.max(...Object.values(orgData));
    
    Object.entries(orgData).forEach(([org, count]) => {
        const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
        
        const chartBar = document.createElement('div');
        chartBar.className = 'chart-bar';
        chartBar.innerHTML = `
            <div class="chart-label">${org.replace('อบต.', '')}</div>
            <div class="chart-progress">
                <div class="chart-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="chart-value">${count}</div>
        `;
        
        container.appendChild(chartBar);
    });
}

// Render land type chart
function renderLandTypeChart(typeData) {
    const container = document.getElementById('typeChart');
    if (!container || !typeData) return;
    
    container.innerHTML = '';
    
    const maxValue = Math.max(...Object.values(typeData));
    
    Object.entries(typeData).forEach(([type, count]) => {
        const percentage = maxValue > 0 ? (count / maxValue) * 100 : 0;
        
        const chartBar = document.createElement('div');
        chartBar.className = 'chart-bar';
        chartBar.innerHTML = `
            <div class="chart-label">${type}</div>
            <div class="chart-progress">
                <div class="chart-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="chart-value">${count}</div>
        `;
        
        container.appendChild(chartBar);
    });
}

// Render parcel list
function renderParcelList(dataToRender = null) {
    const parcelListDiv = document.getElementById('parcelList') || document.querySelector('.parcel-list');
    const parcelCountSpan = document.getElementById('parcelCount');
    
    if (!parcelListDiv) {
        console.error('Parcel list container not found');
        return;
    }
    
    parcelListDiv.innerHTML = '';
    
    // Use provided data or global parcels
    const dataList = dataToRender || parcels;
    
    if (!dataList || dataList.length === 0) {
        parcelListDiv.innerHTML = '<div class="no-data"><i class="fas fa-info-circle"></i> ไม่พบข้อมูลแปลงที่ดิน</div>';
        if (parcelCountSpan) parcelCountSpan.textContent = '0';
        return;
    }

    // Update parcel count
    if (parcelCountSpan) parcelCountSpan.textContent = dataList.length;
    
    dataList.forEach(parcel => {
        const parcelItem = document.createElement('div');
        parcelItem.className = 'parcel-item';
        parcelItem.dataset.parcelId = parcel.id;
        parcelItem.dataset.parcelCode = parcel.parcel_cod;
        
        // Format timestamp for display
        let timeDisplay = '';
        if (parcel.timestamp) {
            const date = new Date(parcel.timestamp);
            timeDisplay = date.toLocaleString('th-TH', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Format assessed value
        let valueDisplay = '';
        if (parcel.assessed_value) {
            valueDisplay = parseFloat(parcel.assessed_value).toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + ' บาท';
        }
        
        parcelItem.innerHTML = `
            <div class="parcel-header">
                <span class="parcel-code">${parcel.parcel_cod || 'ไม่ระบุรหัส'}</span>
                ${parcel.organization_name || parcel.org_name ? 
                    `<span class="org-badge" data-org="${parcel.organization_name || parcel.org_name}">
                        ${(parcel.organization_name || parcel.org_name).replace('อบต.', '')}
                    </span>` : ''}
            </div>
            
            <div class="parcel-details">
                ${parcel.owner_name ? `<div class="detail-row">
                    <i class="fas fa-user"></i>
                    <span><strong>เจ้าของ:</strong> ${parcel.owner_name}</span>
                </div>` : ''}
                
                ${parcel.ryw ? `<div class="detail-row">
                    <i class="fas fa-ruler-combined"></i>
                    <span><strong>ขนาด:</strong> ${parcel.ryw}</span>
                </div>` : ''}
                
                ${valueDisplay ? `<div class="detail-row">
                    <i class="fas fa-money-bill-wave"></i>
                    <span><strong>ราคาประเมิน:</strong> ${valueDisplay}</span>
                </div>` : ''}
                
                ${parcel.village_number ? `<div class="detail-row">
                    <i class="fas fa-map-pin"></i>
                    <span><strong>หมู่ที่:</strong> ${parcel.village_number}</span>
                </div>` : ''}
                
                ${parcel.land_type ? `<div class="detail-row">
                    <i class="fas fa-seedling"></i>
                    <span><strong>ประเภทเกษตร:</strong> ${parcel.land_type}</span>
                </div>` : ''}
                
                ${parcel.land_use ? `<div class="detail-row">
                    <i class="fas fa-tasks"></i>
                    <span><strong>การใช้งาน:</strong> ${parcel.land_use}</span>
                </div>` : ''}
                
                ${parcel.recorded_by || parcel.recorder ? `<div class="detail-row">
                    <i class="fas fa-user-edit"></i>
                    <span><strong>ผู้บันทึก:</strong> ${parcel.recorded_by || parcel.recorder}</span>
                </div>` : ''}
                
                ${timeDisplay ? `<div class="detail-row">
                    <i class="fas fa-clock"></i>
                    <span><strong>เวลาบันทึก:</strong> ${timeDisplay}</span>
                </div>` : ''}
            </div>
            
            <div class="parcel-actions">
                <button class="action-btn edit-btn" onclick="event.stopPropagation(); editParcel('${parcel.parcel_cod}')" title="แก้ไข">
                    <i class="fas fa-edit"></i>
                </button>
                ${parcel.coordinates ? `
                <button class="action-btn map-btn" onclick="event.stopPropagation(); showParcelOnMap('${parcel.parcel_cod}')" title="ดูบนแผนที่">
                    <i class="fas fa-map-marker-alt"></i>
                </button>` : ''}
            </div>
        `;
        
        // Add click event to show details
        parcelItem.onclick = () => editParcel(parcel.parcel_cod);
        
        parcelListDiv.appendChild(parcelItem);
    });
}

function showParcelOnMap(parcelCode) {
    const parcel = parcels.find(p => p.parcel_cod === parcelCode);
    if (parcel && parcel.coordinates) {
        const [lat, lng] = parcel.coordinates.split(',').map(coord => parseFloat(coord.trim()));
        showMapView();
        setTimeout(() => {
            if (map) {
                map.setView([lat, lng], 16);
                L.marker([lat, lng]).addTo(map).bindPopup(`แปลง ${parcelCode}`).openPopup();
            }
        }, 200);
    } else {
        showMapView();
    }
}

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Navigation functions
function setActiveNav(clickedItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    clickedItem.classList.add('active');
}

// View switching
function showDashboard() {
    setActiveView('dashboardView');
    loadParcels().then(() => {
        updateDashboardStats();
        renderCharts();
    });
}

function showParcelList() {
    setActiveView('parcelListView');
    loadParcels();
}
function showImportExport() {
    setActiveView('importExportView');
}
function showShapefileImport() {
    setActiveView('shapefileImportView');
}
function showMapView() {
    setActiveView('mapView');
    setTimeout(initMap, 100);
}
function setActiveView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    toggleSidebar();
}

// Modal logic
function showAddParcelForm() {
    openParcelModal();
}

async function editParcel(code) {
    try {
        console.log('📝 Editing parcel with code:', code);
        showLoading(true);
        const response = await fetch(`${API_URL}/land_parcel/${code}`);
        console.log('📡 API response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Parcel data received:', data);
            openParcelModal(data);
        } else {
            console.log('❌ Failed to fetch parcel data, creating new with code:', code);
            openParcelModal({ parcel_cod: code });
        }
    } catch (error) {
        console.error('❌ Error fetching parcel:', error);
        openParcelModal({ parcel_cod: code });
    } finally {
        showLoading(false);
    }
}

function openParcelModal(data = {}) {
    currentParcel = data;
    const modal = document.getElementById('parcelModal');
    const form = document.getElementById('parcelForm');
    
    // Debug log to check received data
    console.log('🔍 Opening parcel modal with data:', data);
    
    modal.classList.add('active');
    form.reset();
    
    // Scroll modal to top
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
    
    document.getElementById('modalTitle').innerText = 
        data.parcel_cod ? 'แก้ไขข้อมูลแปลงที่ดิน' : 'เพิ่มแปลงที่ดิน';
    
    // Fill form with data
    if (data.parcel_cod) {
        console.log('📝 Filling form with parcel data:', {
            parcel_cod: data.parcel_cod,
            owner_name: data.owner_name,
            ryw: data.ryw,
            assessed_value: data.assessed_value,
            village_number: data.village_number,
            land_type: data.land_type,
            land_use: data.land_use,
            remarks: data.remarks,
            coordinates: data.coordinates,
            recorder: data.recorder || data.recorded_by,
            timestamp: data.timestamp
        });
        
        document.getElementById('parcelCode').value = data.parcel_cod || '';
        document.getElementById('ownerName').value = data.owner_name || '';
        document.getElementById('ryw').value = data.ryw || '';
        document.getElementById('assessedValue').value = data.assessed_value || '';
        document.getElementById('villageNumber').value = data.village_number || '';
        document.getElementById('landType').value = data.land_type || '';
        document.getElementById('landUse').value = data.land_use || '';
        document.getElementById('remarks').value = data.remarks || '';
        document.getElementById('coordinates').value = data.coordinates || '';
        
        // Set organization name
        const orgNameField = document.getElementById('organizationName');
        if (orgNameField) {
            orgNameField.value = data.org_name || data.organization_name || selectedOrganization || 'ไม่ระบุองค์กร';
        }
        
        // Set recorder field with current user
        const recorderField = document.getElementById('recorder');
        if (recorderField) {
            const currentRecorder = localStorage.getItem('recorderName') || localStorage.getItem('userEmail') || 'jobaom5@gmail.com';
            recorderField.value = data.recorder || data.recorded_by || currentRecorder;
        }
        
        // Set timestamp - show existing or current time
        const timestamp = data.timestamp ? 
            new Date(data.timestamp).toISOString().slice(0, 16) : 
            new Date().toISOString().slice(0, 16);
        document.getElementById('timestamp').value = timestamp;
        
        // Show mini map if coordinates exist
        if (data.coordinates) {
            setTimeout(() => showMiniMap(data.coordinates), 100);
        }
    } else {
        // Set current timestamp for new parcel
        document.getElementById('timestamp').value = new Date().toISOString().slice(0, 16);
        
        // Set organization for new parcel
        const orgNameField = document.getElementById('organizationName');
        if (orgNameField) {
            orgNameField.value = selectedOrganization || localStorage.getItem('selectedOrganization') || 'ไม่ระบุองค์กร';
        }
        
        // Set current user as recorder for new parcel
        const recorderField = document.getElementById('recorder');
        if (recorderField) {
            const currentRecorder = localStorage.getItem('recorderName') || localStorage.getItem('userEmail') || 'jobaom5@gmail.com';
            recorderField.value = currentRecorder;
        }
    }
    
    document.body.style.overflow = 'hidden';
}

function scrollToField(fieldId) {
    const field = document.getElementById(fieldId);
    const modalContent = document.querySelector('.modal-content');
    
    if (field && modalContent) {
        // Calculate position relative to modal content
        const fieldTop = field.offsetTop - 100; // Add some padding
        modalContent.scrollTo({
            top: fieldTop,
            behavior: 'smooth'
        });
        
        // Focus the field after scrolling
        setTimeout(() => {
            field.focus();
        }, 300);
    }
}

function closeParcelModal() {
    document.getElementById('parcelModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    currentParcel = null;
}

// Search modal
function showSearch() {
    document.getElementById('searchModal').classList.add('active');
}
function closeSearchModal() {
    document.getElementById('searchModal').classList.remove('active');
}

// Loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
        
        if (show) {
            // Auto-hide loading after 8 seconds to prevent infinite loading
            setTimeout(() => {
                console.log('⚠️ Auto-hiding loading overlay after timeout');
                overlay.classList.remove('active');
            }, 8000);
        }
    }
}

// Excel import with organization selection
const excelInput = document.getElementById('excelImport');
if (excelInput) {
    excelInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Get selected organization from import/export view
        const ieOrgSelect = document.getElementById('ieOrgSelect');
        const selectedOrgForImport = ieOrgSelect ? ieOrgSelect.value : selectedOrganization;
        
        // Check if organization is selected (not 'all')
        if (!selectedOrgForImport || selectedOrgForImport === 'all') {
            alert('กรุณาเลือกองค์การบริหารส่วนตำบลที่ต้องการนำเข้าข้อมูล');
            e.target.value = ''; // Clear file input
            return;
        }
        
        showLoading(true);
        const reader = new FileReader();
        reader.onload = function (evt) {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);
            
            // Send to backend with organization info
            fetch(`${API_URL}/import-excel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    rows: json,
                    organization: selectedOrgForImport 
                })
            })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        alert(`นำเข้าข้อมูลสำเร็จ ${result.imported} รายการ สำหรับ ${selectedOrgForImport}`);
                        // Reload parcels to show new data
                        loadParcels();
                    } else {
                        alert('เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
                    }
                    showLoading(false);
                    e.target.value = ''; // Clear file input
                })
                .catch(error => {
                    console.error('Import error:', error);
                    alert('เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
                    showLoading(false);
                    e.target.value = ''; // Clear file input
                });
        };
        reader.readAsArrayBuffer(file);
    });
}

// Excel export with organization filter
function exportToExcel() {
    showLoading(true);
    
    // Build URL with organization parameter
    const orgParam = selectedOrganization === 'all' ? '' : `?org=${encodeURIComponent(selectedOrganization)}`;
    const exportUrl = `${API_URL}/export-excel${orgParam}`;
    
    fetch(exportUrl)
        .then(res => {
            if (!res.ok) {
                throw new Error('Export failed');
            }
            return res.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            // Create filename based on selected organization
            const orgName = selectedOrganization === 'all' ? 'ทั้งหมด' : selectedOrganization.replace('อบต.', '');
            a.download = `land_parcels_${orgName}_${new Date().toISOString().split('T')[0]}.xlsx`;
            
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showLoading(false);
        })
        .catch(error => {
            console.error('Export error:', error);
            alert('เกิดข้อผิดพลาดในการส่งออกข้อมูล');
            showLoading(false);
        });
}

// Shapefile import
const shapefileInput = document.getElementById('shapefileImport');
if (shapefileInput) {
    shapefileInput.addEventListener('change', function (e) {
        const files = e.target.files;
        if (!files.length) return;
        showLoading(true);
        // Use shpjs to parse shapefile in browser
        if (files[0].name.endsWith('.zip')) {
            const reader = new FileReader();
            reader.onload = function (evt) {
                shp(evt.target.result).then(geojson => {
                    showOnMap(geojson);
                    showLoading(false);
                });
            };
            reader.readAsArrayBuffer(files[0]);
        } else {
            alert('กรุณาอัปโหลดไฟล์ .zip ที่มี Shapefile');
            showLoading(false);
        }
    });
}

// Map logic with WGS84 Zone 47N support
let map;
let currentCoordinateSystem = 'latlon'; // 'latlon' or 'utm47n'

function initMap() {
    if (!map) {
        // Initialize map with Thailand center coordinates
        map = L.map('map').setView([13.7563, 100.5018], 10); // Bangkok center
        
        // Add OpenStreetMap base layer
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        });
        
        // Add Google Satellite layer
        const googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: '© Google'
        });
        
        // Add Google Hybrid layer
        const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            attribution: '© Google'
        });
        
        // Set default layer
        osmLayer.addTo(map);
        
        // Add layer control
        const baseMaps = {
            "OpenStreetMap": osmLayer,
            "Google Satellite": googleSat,
            "Google Hybrid": googleHybrid
        };
        
        L.control.layers(baseMaps).addTo(map);
        
        // Add coordinate display control
        addCoordinateControl();
        
        // Add scale control
        L.control.scale({
            metric: true,
            imperial: false,
            position: 'bottomleft'
        }).addTo(map);
        
        // Add coordinate system toggle
        addCoordinateSystemToggle();
    }
}

// Add coordinate display control
function addCoordinateControl() {
    const coordControl = L.control({position: 'bottomright'});
    
    coordControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'coordinate-display');
        div.style.background = 'rgba(255,255,255,0.9)';
        div.style.padding = '5px 10px';
        div.style.border = '2px solid #ccc';
        div.style.borderRadius = '5px';
        div.style.fontSize = '12px';
        div.style.fontFamily = 'monospace';
        div.innerHTML = 'พิกัด: -';
        
        map.on('mousemove', function(e) {
            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            
            if (currentCoordinateSystem === 'utm47n') {
                // Convert to UTM Zone 47N
                const utm = convertLatLngToUTM47N(lat, lng);
                div.innerHTML = `UTM 47N: ${utm.easting.toFixed(2)}E, ${utm.northing.toFixed(2)}N`;
            } else {
                div.innerHTML = `WGS84: ${lat}°, ${lng}°`;
            }
        });
        
        return div;
    };
    
    coordControl.addTo(map);
}

// Add coordinate system toggle button
function addCoordinateSystemToggle() {
    const toggleControl = L.control({position: 'topright'});
    
    toggleControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'coordinate-toggle');
        div.innerHTML = '<button onclick="toggleCoordinateSystem()" style="padding: 5px 10px; background: #ff69b4; color: white; border: none; border-radius: 3px; cursor: pointer;">WGS84</button>';
        return div;
    };
    
    toggleControl.addTo(map);
}

// Toggle between coordinate systems
function toggleCoordinateSystem() {
    currentCoordinateSystem = currentCoordinateSystem === 'latlon' ? 'utm47n' : 'latlon';
    const button = document.querySelector('.coordinate-toggle button');
    button.innerHTML = currentCoordinateSystem === 'utm47n' ? 'UTM 47N' : 'WGS84';
    button.style.background = currentCoordinateSystem === 'utm47n' ? '#4CAF50' : '#ff69b4';
}

// Convert Lat/Lng to UTM Zone 47N using Proj4 library
function convertLatLngToUTM47N(lat, lng) {
    try {
        // Define coordinate systems
        const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
        const utm47n = '+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs +type=crs';
        
        // Check if proj4 is available
        if (typeof proj4 !== 'undefined') {
            const utm = proj4(wgs84, utm47n, [lng, lat]);
            return {
                easting: utm[0],
                northing: utm[1],
                zone: '47N'
            };
        } else {
            // Fallback to simplified calculation
            return convertLatLngToUTM47N_Simplified(lat, lng);
        }
    } catch (error) {
        console.warn('UTM conversion error, using simplified method:', error);
        return convertLatLngToUTM47N_Simplified(lat, lng);
    }
}

// Simplified UTM conversion (fallback)
function convertLatLngToUTM47N_Simplified(lat, lng) {
    // UTM Zone 47N covers longitude 96° to 102° E
    // This is a simplified conversion for Thailand area
    const a = 6378137.0; // WGS84 semi-major axis
    const k0 = 0.9996; // UTM scale factor
    const lon0 = 99; // Central meridian for Zone 47
    const falseEasting = 500000;
    const falseNorthing = 0;
    
    const latRad = lat * Math.PI / 180;
    const lonRad = lng * Math.PI / 180;
    const lon0Rad = lon0 * Math.PI / 180;
    
    const dlon = lonRad - lon0Rad;
    const dlat = latRad;
    
    // Simplified UTM calculation (approximation for Thailand)
    const x = falseEasting + k0 * a * dlon * Math.cos(latRad) + 
              k0 * a * Math.pow(dlon, 3) * Math.cos(latRad) * Math.pow(Math.sin(latRad), 2) / 6;
    const y = falseNorthing + k0 * a * dlat + 
              k0 * a * Math.pow(dlon, 2) * Math.sin(latRad) * Math.cos(latRad) / 2;
    
    return {
        easting: x,
        northing: y,
        zone: '47N'
    };
}

// Convert UTM 47N to Lat/Lng
function convertUTM47NToLatLng(easting, northing) {
    try {
        if (typeof proj4 !== 'undefined') {
            const wgs84 = '+proj=longlat +datum=WGS84 +no_defs';
            const utm47n = '+proj=utm +zone=47 +datum=WGS84 +units=m +no_defs +type=crs';
            
            const latlon = proj4(utm47n, wgs84, [easting, northing]);
            return {
                lat: latlon[1],
                lng: latlon[0]
            };
        } else {
            // Simplified reverse conversion
            const a = 6378137.0;
            const k0 = 0.9996;
            const lon0 = 99;
            const falseEasting = 500000;
            const falseNorthing = 0;
            
            const x = easting - falseEasting;
            const y = northing - falseNorthing;
            
            const lon = lon0 + (x / (k0 * a)) * (180 / Math.PI);
            const lat = (y / (k0 * a)) * (180 / Math.PI);
            
            return { lat: lat, lng: lon };
        }
    } catch (error) {
        console.warn('UTM to LatLng conversion error:', error);
        return { lat: 0, lng: 0 };
    }
}
function showOnMap(geojson) {
    initMap();
    L.geoJSON(geojson).addTo(map);
    map.fitBounds(L.geoJSON(geojson).getBounds());
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(function (pos) {
            const coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            document.getElementById('coordinates').value = coords;
            showMiniMap(coords);
            showLoading(false);
        }, function(error) {
            console.error('Geolocation error:', error);
            alert('ไม่สามารถระบุตำแหน่งได้ กรุณาตรวจสอบการตั้งค่า GPS');
            showLoading(false);
        });
    } else {
        alert('เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง');
    }
}

// Show mini map with WGS84/UTM 47N support
function showMiniMap(coordinates) {
    try {
        const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
        const miniMapDiv = document.getElementById('miniMap');
        
        // Clear existing map
        miniMapDiv.innerHTML = '';
        
        // Add coordinate info above map
        const coordInfo = document.createElement('div');
        coordInfo.style.cssText = 'text-align: center; padding: 5px; background: #f8f9fa; border: 1px solid #ddd; font-size: 12px; font-family: monospace;';
        
        const utm = convertLatLngToUTM47N(lat, lng);
        coordInfo.innerHTML = `
            <div><strong>WGS84:</strong> ${lat.toFixed(6)}°, ${lng.toFixed(6)}°</div>
            <div><strong>UTM 47N:</strong> ${utm.easting.toFixed(2)}E, ${utm.northing.toFixed(2)}N</div>
        `;
        miniMapDiv.appendChild(coordInfo);
        
        // Create map container
        const mapContainer = document.createElement('div');
        mapContainer.style.height = '160px';
        miniMapDiv.appendChild(mapContainer);
        
        const miniMap = L.map(mapContainer, {
            zoomControl: true,
            attributionControl: false
        }).setView([lat, lng], 16);
        
        // Add multiple tile layers
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        });
        
        const googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            maxZoom: 20,
        });
        
        // Set default layer
        googleSat.addTo(miniMap);
        
        // Add layer control
        L.control.layers({
            "Google Satellite": googleSat,
            "OpenStreetMap": osmLayer
        }, {}, { position: 'topright' }).addTo(miniMap);
        
        // Add marker with popup
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '<i class="fas fa-map-marker-alt" style="color: #ff69b4; font-size: 24px;"></i>',
                iconSize: [24, 24],
                iconAnchor: [12, 24]
            })
        }).addTo(miniMap);
        
        marker.bindPopup(`
            <div style="text-align: center;">
                <strong>ตำแหน่งแปลงที่ดิน</strong><br>
                <small>WGS84: ${lat.toFixed(6)}, ${lng.toFixed(6)}</small><br>
                <small>UTM 47N: ${utm.easting.toFixed(0)}E, ${utm.northing.toFixed(0)}N</small>
            </div>
        `);
        
        // Add scale control
        L.control.scale({
            metric: true,
            imperial: false,
            position: 'bottomleft'
        }).addTo(miniMap);
        
    } catch (error) {
        console.error('Error showing mini map:', error);
        const miniMapDiv = document.getElementById('miniMap');
        miniMapDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">ไม่สามารถแสดงแผนที่ได้</div>';
    }
}

// Refresh data
function refreshData() {
    showLoading(true);
    loadParcels().then(() => {
        showLoading(false);
    }).catch(() => {
        showLoading(false);
        // Reload page as fallback
        location.reload();
    });
}

// Initialize application
async function initializeApp() {
    console.log('🚀 Starting Land Parcel Management System...');
    
    // Check authentication first
    const selectedOrg = localStorage.getItem('selectedOrganization');
    const recorderName = localStorage.getItem('recorderName');
    const loginTime = localStorage.getItem('loginTime');
    
    if (!selectedOrg || !recorderName || !loginTime) {
        console.log('🔒 No authentication found, redirecting to login...');
        window.location.href = 'login.html';
        return;
    }
    
    // Check if session is still valid (24 hours)
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (Date.now() - parseInt(loginTime) > twentyFourHours) {
        console.log('⏰ Session expired, redirecting to login...');
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }
    
    console.log('✅ Authentication valid, continuing...');
    showLoading(true);
    
    try {
        // Update user info display
        updateUserInfo(selectedOrg, recorderName);
        
        // Load organizations first
        await loadOrganizations();
        
        // Set organization from localStorage
        selectedOrganization = selectedOrg;
        selectOrganization(selectedOrganization);
        
        console.log('✅ Application initialized successfully');
        showLoading(false);
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        showLoading(false);
        // Continue with basic functionality
        selectedOrganization = selectedOrg;
        selectOrganization(selectedOrganization);
    }
}

function updateUserInfo(orgName, recorderName) {
    // Update organization selector
    const orgSelect = document.getElementById('organizationSelect');
    if (orgSelect) {
        // Set selected organization
        setTimeout(() => {
            orgSelect.value = orgName;
            changeOrganization();
        }, 500);
    }
    
    // Update bottom navigation with organization name
    const bottomNav = document.querySelector('.nav-item-bottom span');
    if (bottomNav) {
        bottomNav.textContent = orgName.replace('อบต.', '');
    }
    
    // Add user info display
    addUserInfoDisplay(orgName, recorderName);
}

function addUserInfoDisplay(orgName, recorderName) {
    const header = document.querySelector('header .header-content .header-right');
    if (header && !document.getElementById('userInfo')) {
        const userInfo = document.createElement('div');
        userInfo.id = 'userInfo';
        userInfo.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            color: #666;
            background: rgba(255,255,255,0.9);
            padding: 5px 10px;
            border-radius: 15px;
            margin-right: 10px;
        `;
        userInfo.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2;">
                <div style="font-weight: 500; color: #333;">${orgName}</div>
                <div style="color: #888;">${recorderName}</div>
            </div>
            <button onclick="logout()" class="logout-btn" title="ออกจากระบบ" style="
                background: none;
                border: none;
                color: #f44336;
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <i class="fas fa-sign-out-alt"></i>
            </button>
        `;
        header.appendChild(userInfo);
    }
}

function addLoginPrompt() {
    const header = document.querySelector('header .header-content .header-right');
    if (header && !document.getElementById('userInfo')) {
        const loginPrompt = document.createElement('div');
        loginPrompt.id = 'userInfo';
        loginPrompt.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
            color: #fff;
            background: rgba(33, 150, 243, 0.9);
            padding: 8px 12px;
            border-radius: 20px;
            margin-right: 10px;
            cursor: pointer;
        `;
        loginPrompt.innerHTML = `
            <i class="fas fa-user"></i>
            <span>คลิกเพื่อลงชื่อเข้าใช้</span>
        `;
        loginPrompt.onclick = () => {
            window.location.href = 'login.html';
        };
        header.appendChild(loginPrompt);
    }
}

function logout() {
    if (confirm('ต้องการออกจากระบบหรือไม่?')) {
        localStorage.removeItem('selectedOrganization');
        localStorage.removeItem('recorderName');
        localStorage.removeItem('loginTime');
        window.location.href = 'login.html';
    }
}

// Make functions available globally
window.logout = logout;
window.updateUserInfo = updateUserInfo;

// Form submit
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 DOM Content Loaded - Starting initialization...');
    
    // Initialize the application
    try {
        initializeApp();
    } catch (error) {
        console.error('❌ Error during initialization:', error);
        // Force hide loading overlay if there's an error
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    const parcelForm = document.getElementById('parcelForm');
    if (parcelForm) {
        parcelForm.onsubmit = async function (e) {
            e.preventDefault();
            showLoading(true);
            
            // อัปเดตเวลาปัจจุบันเมื่อกดบันทึก
            const currentTime = new Date().toISOString().slice(0, 16);
            document.getElementById('timestamp').value = currentTime;
            
            // ใช้ชื่อผู้บันทึกจาก localStorage หรือค่าเริ่มต้น
            const recorderName = localStorage.getItem('recorderName') || localStorage.getItem('userEmail') || 'jobaom5@gmail.com';
            document.getElementById('recorder').value = recorderName;
            
            const formData = {
                parcel_cod: document.getElementById('parcelCode').value,
                owner_name: document.getElementById('ownerName').value,
                ryw: document.getElementById('ryw').value,
                assessed_value: document.getElementById('assessedValue').value,
                village_number: document.getElementById('villageNumber').value,
                land_type: document.getElementById('landType').value,
                land_use: document.getElementById('landUse').value,
                remarks: document.getElementById('remarks').value,
                coordinates: document.getElementById('coordinates').value,
                recorder: recorderName,
                recorded_by: recorderName,
                timestamp: currentTime,
                organization_name: document.getElementById('organizationName').value || selectedOrganization || localStorage.getItem('selectedOrganization') || 'ไม่ระบุองค์กร'
            };
            
            try {
                const result = await apiCall(`${API_URL}/land_parcel`, {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                
                if (result.success) {
                    if (result.offline) {
                        // ข้อมูลถูกเก็บไว้สำหรับ sync ภายหลัง
                        showNotification('💾 ข้อมูลถูกเก็บไว้แล้ว จะส่งเมื่อออนไลน์', 'info');
                        alert(`ข้อมูลถูกเก็บไว้แล้ว\nจะส่งเมื่อมีการเชื่อมต่อ\nรหัสแปลง: ${formData.parcel_cod}`);
                    } else {
                        // บันทึกสำเร็จ online
                        const savedTime = result.timestamp ? 
                            new Date(result.timestamp).toLocaleString('th-TH') : 
                            new Date().toLocaleString('th-TH');
                        showNotification('✅ บันทึกข้อมูลสำเร็จ', 'success');
                        alert(`บันทึกข้อมูลสำเร็จ\nเวลาที่บันทึก: ${savedTime}`);
                    }
                    closeParcelModal();
                    loadParcels(); // Refresh the list
                } else {
                    throw new Error('Save failed');
                }
            } catch (error) {
                console.error('Error saving parcel:', error);
                showNotification('❌ เกิดข้อผิดพลาดในการบันทึก', 'error');
                alert('เกิดข้อผิดพลาดในการบันทึก\nกรุณาลองใหม่อีกครั้ง');
            } finally {
                showLoading(false);
            }
        };
    }
    
    // Add Organization Modal Functions
    window.showAddOrgModal = function() {
        document.getElementById('addOrgModal').style.display = 'block';
        document.getElementById('newOrgName').value = '';
        document.getElementById('newOrgCode').value = '';
        document.getElementById('newOrgName').focus();
    };

    window.closeAddOrgModal = function() {
        document.getElementById('addOrgModal').style.display = 'none';
    };

    // Close modal when clicking outside
    document.addEventListener('click', function(event) {
        const modal = document.getElementById('addOrgModal');
        if (event.target === modal) {
            closeAddOrgModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeAddOrgModal();
        }
    });

    window.addNewOrganization = async function() {
        const orgName = document.getElementById('newOrgName').value.trim();
        const orgCode = document.getElementById('newOrgCode').value.trim();
        
        if (!orgName) {
            alert('กรุณาใส่ชื่อองค์กร');
            document.getElementById('newOrgName').focus();
            return;
        }
        
        try {
            const response = await fetch('http://localhost:3000/api/organizations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    org_name: orgName,
                    org_code: orgCode
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                closeAddOrgModal();
                showNotification('เพิ่มองค์กรใหม่เรียบร้อยแล้ว', 'success');
                await loadOrganizations();
                
                // Auto select the new organization
                const orgSelect = document.getElementById('organizationSelect');
                orgSelect.value = orgName;
                changeOrganization();
            } else {
                if (response.status === 409) {
                    alert('องค์กรนี้มีอยู่ในระบบแล้ว');
                } else {
                    alert(data.error || 'เกิดข้อผิดพลาดในการเพิ่มองค์กร');
                }
            }
        } catch (error) {
            console.error('Error adding organization:', error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    };
    
    // Real-time search functionality
    let searchTimeout;
    let searchCache = new Map();
    
    window.searchParcels = function() {
        console.log('🔍 Search function called'); // Debug log
        
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const clearBtn = document.getElementById('clearSearch');
        const query = searchInput.value.trim();
        
        console.log('🔍 Search query:', query); // Debug log
        
        // Show/hide clear button
        clearBtn.style.display = query.length > 0 ? 'block' : 'none';
        
        if (query.length < 1) {
            searchResults.style.display = 'none';
            return;
        }
        
        // Clear previous timeout
        clearTimeout(searchTimeout);
        
        // Check cache first
        const cacheKey = `${query}-${selectedOrganization}`;
        if (searchCache.has(cacheKey)) {
            console.log('🔍 Using cached results'); // Debug log
            displaySearchResults(searchCache.get(cacheKey), query);
            return;
        }
        
        // Show loading
        searchResults.innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i>กำลังค้นหา...</div>';
        searchResults.style.display = 'block';
        
        console.log('🔍 Starting search with timeout'); // Debug log
        
        // Debounced search
        searchTimeout = setTimeout(async () => {
            try {
                const orgParam = selectedOrganization === 'all' ? 'all' : selectedOrganization;
                const searchUrl = `${API_URL}/search-parcels?q=${encodeURIComponent(query)}&org=${encodeURIComponent(orgParam)}`;
                
                console.log('🔍 Search URL:', searchUrl); // Debug log
                
                const response = await fetch(searchUrl);
                const results = await response.json();
                
                console.log('🔍 Search results:', results); // Debug log
                
                // Cache results
                searchCache.set(cacheKey, results);
                
                displaySearchResults(results, query);
            } catch (error) {
                console.error('❌ Search error:', error);
                searchResults.innerHTML = '<div class="search-no-results">เกิดข้อผิดพลาดในการค้นหา</div>';
            }
        }, 300);
    };
    
    function displaySearchResults(results, query) {
        const searchResults = document.getElementById('searchResults');
        
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">ไม่พบข้อมูลที่ค้นหา</div>';
            searchResults.style.display = 'block';
            
            // Show no results in main list too
            const parcelListDiv = document.querySelector('.parcel-list');
            if (parcelListDiv) {
                parcelListDiv.innerHTML = '<div class="no-data">ไม่พบข้อมูลที่ค้นหา</div>';
            }
            updateParcelCount(0);
            return;
        }
        
        console.log('🔍 Displaying search results:', results.length); // Debug log
        
        // Update main parcel list with search results
        renderParcelList(results);
        updateParcelCount(results.length);
        
        // Hide search dropdown after updating main list
        searchResults.style.display = 'none';
        
        // Optional: Show notification
        showNotification(`พบ ${results.length} รายการที่ตรงกับการค้นหา "${query}"`, 'info');
    }
    
    function highlightText(text, query) {
        if (!text || !query) return text || '';
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }
    
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    window.clearSearch = function() {
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('clearSearch').style.display = 'none';
        searchCache.clear();
        
        // Reload original parcel list
        console.log('🔍 Clearing search, reloading original data'); // Debug log
        loadParcels();
    };
    
    // Update parcel count display
    function updateParcelCount(count) {
        const parcelCountElement = document.getElementById('parcelCount');
        if (parcelCountElement) {
            parcelCountElement.textContent = `รายการ: ${count || 0}`;
        }
    }
    
    // Show notification function
    function showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; font-size: 18px; cursor: pointer; margin-left: 10px;">×</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
    }
    
    // Hide search results when clicking outside
    document.addEventListener('click', function(e) {
        const searchContainer = document.querySelector('.search-container');
        if (searchContainer && !searchContainer.contains(e.target)) {
            document.getElementById('searchResults').style.display = 'none';
        }
    });
    
    // Initialize the app
    loadParcels();
    
    // Set current timestamp on load
    const timestampInput = document.getElementById('timestamp');
    if (timestampInput) {
        timestampInput.value = new Date().toISOString().slice(0, 16);
    }
});

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TDM Survey System Initializing...');
    
    // Initialize UI components
    initializePWA();
    loadOrganizations();
    
    // Set default view to dashboard
    showDashboard();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ System initialized successfully');
});

// Setup event listeners
function setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
        updateConnectionStatus(true);
        showNotification('🟢 กลับมาออนไลน์แล้ว', 'success');
    });
    
    window.addEventListener('offline', () => {
        updateConnectionStatus(false);
        showNotification('🔴 ขาดการเชื่อมต่อ ทำงานแบบออฟไลน์', 'warning');
    });
}

// Update connection status indicator
function updateConnectionStatus(isOnline) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        if (isOnline) {
            statusElement.textContent = '🟢 ออนไลน์';
            statusElement.className = 'connection-status online';
        } else {
            statusElement.textContent = '🔴 ออฟไลน์';
            statusElement.className = 'connection-status offline';
        }
    }
}
