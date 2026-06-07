/**
 * simulator.js - Simulation mode with 6 presets and manual sliders
 * Allows testing of the system without real sensors
 */

import { classifyReading, getStatusClass } from '../core/classify.js';

// Preset scenario configurations
const SCENARIOS = {
    normal: {
        name: 'Normal Operation',
        icon: '✅',
        temperature: 28.5,
        ph: 7.2,
        ammonia: 0.35,
        dissolvedOxygen: 6.2,
        description: 'Ideal water quality conditions'
    },
    ammoniaSpike: {
        name: 'Ammonia Spike',
        icon: '⚠️',
        temperature: 28.5,
        ph: 7.1,
        ammonia: 2.5,
        dissolvedOxygen: 5.5,
        description: 'Hazardous: Ammonia exceeds 2.0 mg/L'
    },
    oxygenDepletion: {
        name: 'Oxygen Depletion',
        icon: '⚠️',
        temperature: 28.5,
        ph: 7.0,
        ammonia: 0.8,
        dissolvedOxygen: 2.5,
        description: 'Hazardous: Dissolved oxygen below 3.0 mg/L'
    },
    phCrash: {
        name: 'pH Crash',
        icon: '⚠️',
        temperature: 28.0,
        ph: 5.5,
        ammonia: 0.5,
        dissolvedOxygen: 6.0,
        description: 'Hazardous: pH below 6.0'
    },
    temperatureStress: {
        name: 'Temperature Stress',
        icon: '🌡️',
        temperature: 32.0,
        ph: 7.3,
        ammonia: 0.6,
        dissolvedOxygen: 5.0,
        description: 'Moderate: Temperature above 30°C'
    },
    randomWalk: {
        name: 'Random Walk',
        icon: '🎲',
        temperature: null,
        ph: null,
        ammonia: null,
        dissolvedOxygen: null,
        description: 'Random values change every 2 seconds'
    }
};

let randomInterval = null;

/**
 * Render the simulation view HTML
 * @returns {string} - Simulation view HTML
 */
export function renderSimulationView() {
    return `
        <div class="simulation-view">
            <div class="simulation-header">
                <h1>🎮 Simulation Mode</h1>
                <p>Test the system without real sensors. Click a scenario or drag sliders below.</p>
            </div>
            
            <div class="scenario-grid">
                ${Object.entries(SCENARIOS).map(([key, scenario]) => `
                    <button class="scenario-btn ${key === 'randomWalk' ? 'random-btn' : ''}" data-scenario="${key}">
                        <span class="scenario-icon">${scenario.icon}</span>
                        <span class="scenario-name">${scenario.name}</span>
                        <span class="scenario-desc">${scenario.description}</span>
                    </button>
                `).join('')}
            </div>
            
            <div class="simulation-panel">
                <div class="slider-controls">
                    <h3>🎚️ Manual Controls</h3>
                    <div class="slider-control">
                        <label>🌡️ Temperature (°C): <span id="sim-temp-value">28.5</span></label>
                        <input type="range" id="sim-temp" min="20" max="35" step="0.1" value="28.5">
                        <div class="slider-range">
                            <span>20°C</span><span>Safe: 25-30°C</span><span>35°C</span>
                        </div>
                    </div>
                    <div class="slider-control">
                        <label>🧪 pH: <span id="sim-ph-value">7.2</span></label>
                        <input type="range" id="sim-ph" min="4" max="10" step="0.1" value="7.2">
                        <div class="slider-range">
                            <span>4</span><span>Safe: 6.5-8.5</span><span>10</span>
                        </div>
                    </div>
                    <div class="slider-control">
                        <label>💨 Ammonia (mg/L): <span id="sim-ammonia-value">0.35</span></label>
                        <input type="range" id="sim-ammonia" min="0" max="5" step="0.01" value="0.35">
                        <div class="slider-range">
                            <span>0</span><span>Safe: <0.5</span><span>Hazardous: >2</span><span>5</span>
                        </div>
                    </div>
                    <div class="slider-control">
                        <label>💧 Dissolved Oxygen (mg/L): <span id="sim-do-value">6.2</span></label>
                        <input type="range" id="sim-do" min="0" max="10" step="0.1" value="6.2">
                        <div class="slider-range">
                            <span>0</span><span>Hazardous: <3</span><span>Safe: >5</span><span>10</span>
                        </div>
                    </div>
                </div>
                
                <div class="preview-panel">
                    <h3>👁️ Live Preview</h3>
                    <div class="preview-readings">
                        <div class="preview-item">
                            <span class="preview-label">🌡️ Temperature:</span>
                            <strong id="preview-temp">28.5</strong> °C
                        </div>
                        <div class="preview-item">
                            <span class="preview-label">🧪 pH:</span>
                            <strong id="preview-ph">7.2</strong>
                        </div>
                        <div class="preview-item">
                            <span class="preview-label">💨 Ammonia:</span>
                            <strong id="preview-ammonia">0.35</strong> mg/L
                        </div>
                        <div class="preview-item">
                            <span class="preview-label">💧 Dissolved O₂:</span>
                            <strong id="preview-do">6.2</strong> mg/L
                        </div>
                    </div>
                    <div class="preview-status">
                        <span id="preview-badge" class="status-badge status-safe">SAFE</span>
                        <div id="preview-action" class="preview-action">💡 Pump: OFF | UV: OFF</div>
                    </div>
                    <button id="send-to-dashboard" class="btn btn-primary send-btn">
                        📤 Send to Dashboard
                    </button>
                </div>
            </div>
            
            <div class="simulation-info">
                <p>💡 <strong>Tip:</strong> Use simulation to test how the system responds to different water conditions.
                Send data to the dashboard to see real-time classification and pump controls in action.</p>
            </div>
        </div>
    `;
}

/**
 * Initialize simulation event listeners
 */
export function initSimulationEvents() {
    // Scenario buttons
    document.querySelectorAll('[data-scenario]').forEach(btn => {
        btn.addEventListener('click', () => {
            const scenario = btn.dataset.scenario;
            applyScenario(scenario);
        });
    });
    
    // Sliders
    const sliders = ['temp', 'ph', 'ammonia', 'do'];
    sliders.forEach(slider => {
        const input = document.getElementById(`sim-${slider}`);
        if (input) {
            input.addEventListener('input', () => {
                const values = getCurrentSliderValues();
                updatePreview(values);
            });
        }
    });
    
    // Send to dashboard button
    const sendBtn = document.getElementById('send-to-dashboard');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const values = getCurrentSliderValues();
            window.dispatchEvent(new CustomEvent('simulation-data', { detail: values }));
            showNotification('✅ Simulation data sent to dashboard!');
        });
    }
    
    // Initial preview update
    updatePreview(getCurrentSliderValues());
}

/**
 * Apply a preset scenario
 * @param {string} scenarioKey - Key of the scenario to apply
 */
function applyScenario(scenarioKey) {
    const scenario = SCENARIOS[scenarioKey];
    if (!scenario) return;
    
    // Stop random walk if running
    if (randomInterval) {
        clearInterval(randomInterval);
        randomInterval = null;
    }
    
    if (scenarioKey === 'randomWalk') {
        startRandomWalk();
        return;
    }
    
    // Update sliders to scenario values
    updateSliders({
        temperature: scenario.temperature,
        ph: scenario.ph,
        ammonia: scenario.ammonia,
        dissolvedOxygen: scenario.dissolvedOxygen
    });
    
    // Update preview
    const values = getCurrentSliderValues();
    updatePreview(values);
    
    // Show which scenario was applied
    showNotification(`🎮 Applied: ${scenario.name} - ${scenario.description}`);
}

/**
 * Start random walk mode (values change every 2 seconds)
 */
function startRandomWalk() {
    if (randomInterval) {
        clearInterval(randomInterval);
    }
    
    randomInterval = setInterval(() => {
        const randomValues = {
            temperature: +(27 + Math.random() * 4).toFixed(1),
            ph: +(6.5 + Math.random() * 2).toFixed(1),
            ammonia: +(0.2 + Math.random() * 2.5).toFixed(2),
            dissolvedOxygen: +(3 + Math.random() * 4).toFixed(1)
        };
        updateSliders(randomValues);
        updatePreview(randomValues);
    }, 2000);
    
    showNotification('🎲 Random Walk mode active - values change every 2 seconds');
}

/**
 * Update slider positions with given values
 * @param {Object} values - Sensor values
 */
function updateSliders(values) {
    const tempInput = document.getElementById('sim-temp');
    const phInput = document.getElementById('sim-ph');
    const ammoniaInput = document.getElementById('sim-ammonia');
    const doInput = document.getElementById('sim-do');
    
    if (tempInput) tempInput.value = values.temperature;
    if (phInput) phInput.value = values.ph;
    if (ammoniaInput) ammoniaInput.value = values.ammonia;
    if (doInput) doInput.value = values.dissolvedOxygen;
    
    // Update displayed values
    document.getElementById('sim-temp-value').textContent = values.temperature;
    document.getElementById('sim-ph-value').textContent = values.ph;
    document.getElementById('sim-ammonia-value').textContent = values.ammonia;
    document.getElementById('sim-do-value').textContent = values.dissolvedOxygen;
}

/**
 * Get current values from sliders
 * @returns {Object} - Current sensor values
 */
function getCurrentSliderValues() {
    return {
        temperature: parseFloat(document.getElementById('sim-temp')?.value || 28.5),
        ph: parseFloat(document.getElementById('sim-ph')?.value || 7.2),
        ammonia: parseFloat(document.getElementById('sim-ammonia')?.value || 0.35),
        dissolvedOxygen: parseFloat(document.getElementById('sim-do')?.value || 6.2)
    };
}

/**
 * Update preview panel based on values
 * @param {Object} values - Sensor values
 */
function updatePreview(values) {
    // Update display values
    document.getElementById('preview-temp').textContent = values.temperature;
    document.getElementById('preview-ph').textContent = values.ph;
    document.getElementById('preview-ammonia').textContent = values.ammonia;
    document.getElementById('preview-do').textContent = values.dissolvedOxygen;
    
    // Get classification
    const classification = classifyReading(
        values.temperature,
        values.ph,
        values.ammonia,
        values.dissolvedOxygen
    );
    
    // Update status badge
    const badge = document.getElementById('preview-badge');
    if (badge) {
        badge.textContent = classification.label;
        badge.className = `status-badge status-${classification.status}`;
    }
    
    // Update action preview
    const actionEl = document.getElementById('preview-action');
    if (actionEl) {
        if (classification.status === 'hazardous') {
            actionEl.innerHTML = '🚰 Pump: 100% | 💡 UV: ON 🔴';
            actionEl.style.color = '#DC3545';
        } else if (classification.status === 'moderate') {
            actionEl.innerHTML = '🚰 Pump: 50% | 💡 UV: OFF 🟡';
            actionEl.style.color = '#E6A017';
        } else {
            actionEl.innerHTML = '🚰 Pump: OFF | 💡 UV: OFF 🟢';
            actionEl.style.color = '#2B8C4A';
        }
    }
}

/**
 * Show notification message
 * @param {string} message - Message to display
 */
function showNotification(message) {
    let notification = document.querySelector('.sim-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'sim-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #0D5C46;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notification);
    }
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.style.opacity = '1';
        }, 300);
    }, 2000);
}

/**
 * Stop random walk mode (called when leaving simulation view)
 */
export function stopRandomWalk() {
    if (randomInterval) {
        clearInterval(randomInterval);
        randomInterval = null;
    }
}
