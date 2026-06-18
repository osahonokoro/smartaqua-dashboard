/**
 * dashboard.js - Dashboard renderer and UI updates
 * Manages the 4 pond cards, updates sensor values, and handles button actions
 */

import { classifyReading, getStatusClass } from '../core/classify.js';
import { formatTimestamp } from '../utils/helpers.js';

// Pond configurations
export const PONDS = [
    { id: 'nursery', name: 'Nursery Pond', icon: '🥚' },
    { id: 'feeding', name: 'Feeding Area', icon: '🍽️' },
    { id: 'filtration', name: 'Filtration Unit', icon: '💧' },
    { id: 'growout', name: 'Grow-out Pond', icon: '🐟' }
];

// Store current button states
let overrideStates = {};

/**
 * Render the main dashboard HTML
 * @returns {string} - Dashboard HTML
 */
export function renderDashboard() {
    return `
        <div class="energy-savings" id="energy-savings">
            <h3>⚡ Energy Savings (Today)</h3>
            <div class="savings-number" id="savings-amount">0 kWh</div>
            <p id="savings-naira">₦0 saved</p>
            <div class="savings-details">
                <small>Baseline: 1.20 kWh/day | Optimized: <span id="optimized-kwh">0.78</span> kWh/day</small>
                <small>🌍 CO₂ Reduction: <span id="co2-reduction">0</span> kg</small>
            </div>
        </div>
        
        <div class="dashboard-grid" id="dashboard-grid">
            ${PONDS.map(pool => `
                <div class="card" id="card-${pool.id}" data-pool="${pool.id}">
                    <div class="card-header">
                        <h2 class="card-title">${pool.icon} ${pool.name}</h2>
                        <span class="status-badge status-safe" id="status-${pool.id}">SAFE</span>
                    </div>
                    <div class="sensor-grid">
                        <div class="sensor-item">
                            <div class="sensor-label">🌡️ Temperature</div>
                            <div class="sensor-value" id="temp-${pool.id}">--</div>
                            <div class="sensor-unit">°C</div>
                        </div>
                        <div class="sensor-item">
                            <div class="sensor-label">🧪 pH</div>
                            <div class="sensor-value" id="ph-${pool.id}">--</div>
                        </div>
                        <div class="sensor-item">
                            <div class="sensor-label">💨 Ammonia</div>
                            <div class="sensor-value" id="ammonia-${pool.id}">--</div>
                            <div class="sensor-unit">mg/L</div>
                        </div>
                        <div class="sensor-item">
                            <div class="sensor-label">💧 Dissolved O₂</div>
                            <div class="sensor-value" id="do-${pool.id}">--</div>
                            <div class="sensor-unit">mg/L</div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="timestamp" id="timestamp-${pool.id}">--:--:--</div>
                        <div class="card-actions">
                            <button class="btn btn-secondary pump-btn" data-pool="${pool.id}" data-action="pump">
                                🚰 Pump: OFF
                            </button>
                            <button class="btn btn-secondary uv-btn" data-pool="${pool.id}" data-action="uv">
                                💡 UV: OFF
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Attach event listeners to dashboard buttons
 */
export function attachDashboardEvents() {
    document.querySelectorAll('.pump-btn, .uv-btn').forEach(btn => {
        btn.removeEventListener('click', handleOverride);
        btn.addEventListener('click', handleOverride);
    });
}

/**
 * Handle manual override button clicks
 * @param {Event} event - Click event
 */
function handleOverride(event) {
    const btn = event.currentTarget;
    const poolId = btn.dataset.pool;
    const action = btn.dataset.action;
    
    // Toggle override state
    const key = `${poolId}_${action}`;
    overrideStates[key] = !overrideStates[key];
    
    // Update button appearance
    if (overrideStates[key]) {
        btn.classList.add('btn-danger');
        btn.classList.remove('btn-secondary');
        btn.innerHTML = action === 'pump' ? '🚰 Pump: MANUAL ON' : '💡 UV: MANUAL ON';
        
        // Show toast notification
        showToast(`Manual override: ${action.toUpperCase()} activated on ${poolId}`);
        
        // Auto-reset after 5 minutes
        setTimeout(() => {
            if (overrideStates[key]) {
                overrideStates[key] = false;
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-secondary');
                btn.innerHTML = action === 'pump' ? '🚰 Pump: OFF' : '💡 UV: OFF';
                showToast(`Manual override: ${action.toUpperCase()} reset on ${poolId}`, 3000);
            }
        }, 300000);
    } else {
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-secondary');
        btn.innerHTML = action === 'pump' ? '🚰 Pump: OFF' : '💡 UV: OFF';
    }
    
    // Simulate GPIO control signal
    console.log(`[GPIO] ${action.toUpperCase()} on ${poolId}: ${overrideStates[key] ? 'ON' : 'OFF'}`);
}

/**
 * Update a single pond card with new data
 * @param {Object} pool - Pool configuration object
 * @param {Object} data - Sensor data
 * @param {Object} classification - Classification result
 */
export function updatePondCard(pool, data, classification) {
    const tempEl = document.getElementById(`temp-${pool.id}`);
    const phEl = document.getElementById(`ph-${pool.id}`);
    const ammoniaEl = document.getElementById(`ammonia-${pool.id}`);
    const doEl = document.getElementById(`do-${pool.id}`);
    const statusEl = document.getElementById(`status-${pool.id}`);
    const cardEl = document.getElementById(`card-${pool.id}`);
    const timestampEl = document.getElementById(`timestamp-${pool.id}`);
    const pumpBtn = document.querySelector(`.pump-btn[data-pool="${pool.id}"]`);
    const uvBtn = document.querySelector(`.uv-btn[data-pool="${pool.id}"]`);
    
    // Update sensor values with animation
    if (tempEl) {
        animateValue(tempEl, parseFloat(tempEl.textContent) || data.temperature, data.temperature, '°C');
    }
    if (phEl) animateValue(phEl, parseFloat(phEl.textContent) || data.ph, data.ph, '');
    if (ammoniaEl) animateValue(ammoniaEl, parseFloat(ammoniaEl.textContent) || data.ammonia, data.ammonia, '');
    if (doEl) animateValue(doEl, parseFloat(doEl.textContent) || data.dissolvedOxygen, data.dissolvedOxygen, '');
    
    // Update status badge
    if (statusEl) {
        statusEl.textContent = classification.label;
        statusEl.className = getStatusClass(classification.status);
    }
    
    // Update timestamp
    if (timestampEl) {
        timestampEl.textContent = formatTimestamp(data.timestamp);
    }
    
    // Update card border animation for hazardous
    if (cardEl) {
        if (classification.status === 'hazardous') {
            cardEl.classList.add('hazardous-pulse');
        } else {
            cardEl.classList.remove('hazardous-pulse');
        }
        // Add fade-in animation
        cardEl.classList.add('card-update');
        setTimeout(() => cardEl.classList.remove('card-update'), 300);
    }
    
    // Update pump button (check override first)
    const pumpOverride = overrideStates[`${pool.id}_pump`];
    if (pumpBtn && !pumpOverride) {
        const pumpText = classification.pumpDuty === 0 ? 'OFF' : `${classification.pumpDuty}%`;
        pumpBtn.innerHTML = `🚰 Pump: ${pumpText}`;
        if (classification.pumpDuty > 0) {
            pumpBtn.classList.add('btn-primary');
            pumpBtn.classList.remove('btn-secondary');
        } else {
            pumpBtn.classList.remove('btn-primary');
            pumpBtn.classList.add('btn-secondary');
        }
    }
    
    // Update UV button (check override first)
    const uvOverride = overrideStates[`${pool.id}_uv`];
    if (uvBtn && !uvOverride) {
        const uvText = classification.uvDuty === 100 ? 'ON' : 'OFF';
        uvBtn.innerHTML = `💡 UV: ${uvText}`;
        if (classification.uvDuty === 100) {
            uvBtn.classList.add('btn-danger');
            uvBtn.classList.remove('btn-secondary');
        } else {
            uvBtn.classList.remove('btn-danger');
            uvBtn.classList.add('btn-secondary');
        }
    }
}

/**
 * Animate numeric value change
 * @param {HTMLElement} element - DOM element
 * @param {number} start - Starting value
 * @param {number} end - Ending value
 * @param {string} unit - Unit suffix
 */
function animateValue(element, start, end, unit) {
    if (start === end || isNaN(start) || isNaN(end)) {
        element.textContent = `${end}${unit}`;
        return;
    }
    
    const duration = 300;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = (end - start) / steps;
    let current = start;
    let step = 0;
    
    const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
            element.textContent = `${end}${unit}`;
            clearInterval(timer);
        } else {
            element.textContent = `${Math.round(current * 10) / 10}${unit}`;
        }
    }, stepTime);
}

/**
 * Update energy savings display
 * @param {Object} savings - Energy savings object
 */
export function updateEnergySavingsDisplay(savings) {
    const savingsEl = document.getElementById('savings-amount');
    const nairaEl = document.getElementById('savings-naira');
    const optimizedEl = document.getElementById('optimized-kwh');
    const co2El = document.getElementById('co2-reduction');
    
    if (savingsEl && savingsEl.textContent !== `${savings.kwhSaved} kWh`) {
        savingsEl.classList.add('energy-count-up');
        savingsEl.textContent = `${savings.kwhSaved} kWh`;
        setTimeout(() => savingsEl.classList.remove('energy-count-up'), 500);
    }
    
    if (nairaEl) {
        nairaEl.innerHTML = `₦${savings.nairaSaved.toLocaleString()} saved`;
    }
    
    if (optimizedEl) {
        optimizedEl.textContent = savings.optimizedKwhDay;
    }
    
    if (co2El) {
        co2El.textContent = savings.co2ReductionKg;
    }
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, duration = 5000) {
    let toast = document.querySelector('.toast-notification');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #0D5C46;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.opacity = '1';
        }, 300);
    }, duration);
}

/**
 * Get override state for a specific control
 * @param {string} poolId - Pool identifier
 * @param {string} action - Action ('pump' or 'uv')
 * @returns {boolean} - Override state
 */
export function getOverrideState(poolId, action) {
    return overrideStates[`${poolId}_${action}`] || false;
}

/**
 * Reset all override states
 */
export function resetAllOverrides() {
    overrideStates = {};
    // UI will update on next refresh
}