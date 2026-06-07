/**
 * history.js - History view with localStorage and CSV export
 * Displays historical data table with filters and export functionality
 */

import { getHistory, clearHistory, STORAGE_KEYS } from '../utils/storage.js';
import { formatTimestamp, formatDate } from '../utils/helpers.js';
import { getStatusClass } from '../core/classify.js';

// Pagination settings
const PAGE_SIZE = 20;
let currentPage = 1;
let currentFilteredHistory = [];

/**
 * Render the history view HTML
 * @returns {string} - History view HTML
 */
export function renderHistoryView() {
    const history = getHistory(1000);
    currentFilteredHistory = [...history];
    currentPage = 1;
    
    return `
        <div class="history-view">
            <div class="history-header">
                <h1>📋 Historical Data Logs</h1>
                <p>View, filter, and export your water quality history</p>
            </div>
            
            <div class="history-controls">
                <div class="filter-group">
                    <label>📊 Filter by Pond:</label>
                    <select id="filter-pond">
                        <option value="all">All Ponds</option>
                        <option value="nursery">🥚 Nursery Pond</option>
                        <option value="feeding">🍽️ Feeding Area</option>
                        <option value="filtration">💧 Filtration Unit</option>
                        <option value="growout">🐟 Grow-out Pond</option>
                        <option value="simulation">🎮 Simulation</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>📅 Date Range:</label>
                    <input type="date" id="filter-start" placeholder="Start Date">
                    <span>to</span>
                    <input type="date" id="filter-end" placeholder="End Date">
                </div>
                <div class="filter-group">
                    <label>🔍 Status:</label>
                    <select id="filter-status">
                        <option value="all">All Status</option>
                        <option value="safe">🟢 Safe</option>
                        <option value="moderate">🟡 Moderate</option>
                        <option value="hazardous">🔴 Hazardous</option>
                    </select>
                </div>
                <div class="action-buttons">
                    <button class="btn btn-primary" id="apply-filter">🔍 Apply Filters</button>
                    <button class="btn btn-secondary" id="clear-filter">🗑️ Clear Filters</button>
                    <button class="btn btn-primary" id="export-csv">📥 Export CSV</button>
                    <button class="btn btn-danger" id="clear-history">⚠️ Clear All History</button>
                </div>
            </div>
            
            <div class="stats-bar">
                <span>📊 Total Records: <strong id="total-records">${history.length}</strong></span>
                <span>🟢 Safe: <strong id="safe-count">${history.filter(h => h.classification === 'safe').length}</strong></span>
                <span>🟡 Moderate: <strong id="moderate-count">${history.filter(h => h.classification === 'moderate').length}</strong></span>
                <span>🔴 Hazardous: <strong id="hazardous-count">${history.filter(h => h.classification === 'hazardous').length}</strong></span>
            </div>
            
            <div class="table-container">
                <table id="history-table">
                    <thead>
                        <tr>
                            <th>🕐 Timestamp</th>
                            <th>🏞️ Pond</th>
                            <th>🌡️ Temp (°C)</th>
                            <th>🧪 pH</th>
                            <th>💨 NH₃ (mg/L)</th>
                            <th>💧 DO (mg/L)</th>
                            <th>📊 Status</th>
                        </tr>
                    </thead>
                    <tbody id="history-body">
                        ${renderHistoryRows(currentFilteredHistory.slice(0, PAGE_SIZE))}
                    </tbody>
                </table>
            </div>
            
            <div class="pagination" id="pagination">
                ${renderPagination(currentFilteredHistory.length)}
            </div>
        </div>
    `;
}

/**
 * Render history table rows
 * @param {Array} history - Array of history entries
 * @returns {string} - Table rows HTML
 */
function renderHistoryRows(history) {
    if (!history || history.length === 0) {
        return '<tr><td colspan="7" class="no-data">📭 No history data available. Sensor readings will appear here.</td></tr>';
    }
    
    return history.map(entry => {
        const classification = entry.classification || 'safe';
        const statusText = classification.toUpperCase();
        const statusClass = getStatusClass(classification);
        
        return `
            <tr class="history-row status-${classification}">
                <td class="timestamp-col">${formatTimestamp(entry.timestamp)}<br><small>${formatDate(entry.timestamp)}</small></td>
                <td class="pond-col">${getPondIcon(entry.pond)} ${entry.pond || 'Unknown'}</td>
                <td>${entry.temperature ?? '--'} °C</td>
                <td>${entry.ph ?? '--'}</td>
                <td class="${entry.ammonia > 2.0 ? 'warning-value' : ''}">${entry.ammonia ?? '--'} mg/L</td>
                <td class="${entry.dissolvedOxygen < 3.0 ? 'warning-value' : ''}">${entry.dissolvedOxygen ?? '--'} mg/L</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

/**
 * Get icon for pond name
 * @param {string} pondName - Pond name
 * @returns {string} - Emoji icon
 */
function getPondIcon(pondName) {
    const icons = {
        'nursery': '🥚',
        'feeding': '🍽️',
        'filtration': '💧',
        'growout': '🐟',
        'simulation': '🎮'
    };
    const lowerName = (pondName || '').toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
        if (lowerName.includes(key)) return icon;
    }
    return '🏞️';
}

/**
 * Render pagination controls
 * @param {number} totalItems - Total number of items
 * @returns {string} - Pagination HTML
 */
function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);
    if (totalPages <= 1) return '';
    
    let html = '<div class="pagination-controls">';
    html += `<button class="page-btn" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>◀ Prev</button>`;
    
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    if (totalPages > 5) {
        html += '<span>...</span>';
        html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    html += `<button class="page-btn" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>Next ▶</button>`;
    html += '</div>';
    
    return html;
}

/**
 * Attach event listeners to history view
 */
export function attachHistoryEvents() {
    // Filter buttons
    document.getElementById('apply-filter')?.addEventListener('click', applyFilters);
    document.getElementById('clear-filter')?.addEventListener('click', clearFilters);
    document.getElementById('export-csv')?.addEventListener('click', exportToCSV);
    document.getElementById('clear-history')?.addEventListener('click', confirmClearHistory);
    
    // Pagination buttons
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const page = btn.dataset.page;
            if (page === 'prev' && currentPage > 1) {
                currentPage--;
            } else if (page === 'next' && currentPage < Math.ceil(currentFilteredHistory.length / PAGE_SIZE)) {
                currentPage++;
            } else if (!isNaN(parseInt(page))) {
                currentPage = parseInt(page);
            }
            updateTableDisplay();
        });
    });
}

/**
 * Apply filters to history
 */
function applyFilters() {
    const pond = document.getElementById('filter-pond')?.value || 'all';
    const startDate = document.getElementById('filter-start')?.value;
    const endDate = document.getElementById('filter-end')?.value;
    const status = document.getElementById('filter-status')?.value || 'all';
    
    let history = getHistory(1000);
    
    // Apply pond filter
    if (pond !== 'all') {
        history = history.filter(entry => (entry.pond || '').toLowerCase() === pond.toLowerCase());
    }
    
    // Apply date range filter
    if (startDate) {
        history = history.filter(entry => new Date(entry.timestamp) >= new Date(startDate));
    }
    if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59);
        history = history.filter(entry => new Date(entry.timestamp) <= endDateTime);
    }
    
    // Apply status filter
    if (status !== 'all') {
        history = history.filter(entry => (entry.classification || 'safe') === status);
    }
    
    currentFilteredHistory = history;
    currentPage = 1;
    updateTableDisplay();
}

/**
 * Clear all filters
 */
function clearFilters() {
    const pondSelect = document.getElementById('filter-pond');
    const startInput = document.getElementById('filter-start');
    const endInput = document.getElementById('filter-end');
    const statusSelect = document.getElementById('filter-status');
    
    if (pondSelect) pondSelect.value = 'all';
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    if (statusSelect) statusSelect.value = 'all';
    
    currentFilteredHistory = getHistory(1000);
    currentPage = 1;
    updateTableDisplay();
}

/**
 * Update table display after filter or pagination change
 */
function updateTableDisplay() {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const paginatedHistory = currentFilteredHistory.slice(start, end);
    
    const tbody = document.getElementById('history-body');
    const paginationDiv = document.getElementById('pagination');
    
    if (tbody) {
        tbody.innerHTML = renderHistoryRows(paginatedHistory);
    }
    if (paginationDiv) {
        paginationDiv.innerHTML = renderPagination(currentFilteredHistory.length);
        attachHistoryEvents(); // Reattach pagination events
    }
    
    // Update stats
    const total = currentFilteredHistory.length;
    const safeCount = currentFilteredHistory.filter(h => h.classification === 'safe').length;
    const moderateCount = currentFilteredHistory.filter(h => h.classification === 'moderate').length;
    const hazardousCount = currentFilteredHistory.filter(h => h.classification === 'hazardous').length;
    
    document.getElementById('total-records').textContent = total;
    document.getElementById('safe-count').textContent = safeCount;
    document.getElementById('moderate-count').textContent = moderateCount;
    document.getElementById('hazardous-count').textContent = hazardousCount;
}

/**
 * Export history to CSV file
 */
export function exportToCSV() {
    const history = getHistory(1000);
    
    if (!history || history.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Define CSV headers
    const headers = [
        'Timestamp',
        'Pond',
        'Temperature (°C)',
        'pH',
        'Ammonia (mg/L)',
        'Dissolved Oxygen (mg/L)',
        'Status',
        'Pump Duty (%)',
        'UV Duty (%)'
    ];
    
    // Build CSV rows
    const rows = history.map(entry => [
        entry.timestamp,
        entry.pond || 'Unknown',
        entry.temperature ?? '',
        entry.ph ?? '',
        entry.ammonia ?? '',
        entry.dissolvedOxygen ?? '',
        (entry.classification || 'safe').toUpperCase(),
        entry.pumpDuty ?? '',
        entry.uvDuty ?? ''
    ]);
    
    // Create CSV content
    const csvContent = [headers, ...rows].map(row => 
        row.map(cell => {
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',')
    ).join('\n');
    
    // Add BOM for UTF-8 support
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    a.href = url;
    a.download = `smartaqua-history-${timestamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('✅ History exported successfully!');
}

/**
 * Confirm and clear all history
 */
function confirmClearHistory() {
    if (confirm('⚠️ Are you sure you want to clear ALL history? This action cannot be undone.')) {
        clearHistory();
        currentFilteredHistory = [];
        updateTableDisplay();
        showToast('🗑️ History cleared successfully');
    }
}

/**
 * Show toast message
 * @param {string} message - Message to display
 */
function showToast(message) {
    let toast = document.querySelector('.history-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'history-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #0D5C46;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            z-index: 1000;
            animation: fadeInOut 2s ease;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}
