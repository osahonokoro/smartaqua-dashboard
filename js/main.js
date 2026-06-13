/**
 * main.js - SmartAqua Application Entry Point
 * Initializes all modules and manages the application lifecycle
 */

import { fetchReadings, generateSimulatedReadings } from './api/thingspeak.js';
import { fetchReferenceData } from './api/usgs.js';
import { classifyReading, getAlertMessage } from './core/classify.js';
import { calculateEnergySavings, getMonthlyProjection } from './core/energy.js';
import { saveReading } from './utils/storage.js';
import { formatTimestamp, isOnline, debounce } from './utils/helpers.js';
import { renderDashboard, updatePondCard, updateEnergySavingsDisplay, attachDashboardEvents, PONDS } from './ui/dashboard.js';
import { checkAndSendAlert, requestNotificationPermission, showAlertMessage } from './ui/alerts.js';
import { renderHistoryView, attachHistoryEvents, exportToCSV } from './ui/history.js';
import { renderSimulationView, initSimulationEvents, stopRandomWalk } from './simulation/simulator.js';

// App state
let pollingInterval = null;
let currentData = null;
let currentView = 'dashboard';
let lastSavedData = null;

/**
 * Initialize the application
 */
async function initApp() {
    console.log('🚀 SmartAqua initializing...');
    
    // Request notification permission
    await requestNotificationPermission();
    
    // Setup navigation
    setupNavigation();
    
    // Render initial dashboard
    await renderView('dashboard');
    
    // Start polling for data
    startPolling();
    
    // Setup network listeners
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    window.addEventListener('simulation-data', handleSimulationData);
    
    // Update timestamp
    updateLastUpdated();
    
    // Show offline indicator if needed
    updateOfflineIndicator();
    
    console.log('✅ SmartAqua ready!');
}

/**
 * Setup navigation between views
 */
function setupNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !expanded);
            navMenu.classList.toggle('open');
        });
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            
            if (!page) return;
            
            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Stop any running simulations
            if (currentView === 'simulation') {
                stopRandomWalk();
            }
            
            // Stop polling when leaving dashboard
            if (currentView === 'dashboard' && page !== 'dashboard') {
                stopPolling();
            }
            
            // Render new view
            await renderView(page);
            
            // Restart polling when returning to dashboard
            if (page === 'dashboard') {
                startPolling();
                await refreshAllData();
            }
            
            currentView = page;
        });
    });
}

/**
 * Render the current view
 * @param {string} view - View name ('dashboard', 'simulation', 'history')
 */
async function renderView(view) {
    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;
    
    switch (view) {
        case 'dashboard':
            appRoot.innerHTML = renderDashboard();
            attachDashboardEvents();
            if (currentData) {
                await updateAllCards(currentData);
            }
            break;
        case 'simulation':
            appRoot.innerHTML = renderSimulationView();
            initSimulationEvents();
            break;
        case 'history':
            appRoot.innerHTML = renderHistoryView();
            attachHistoryEvents();
            break;
        default:
            appRoot.innerHTML = renderDashboard();
            attachDashboardEvents();
    }
}

/**
 * Start polling interval for sensor data
 */
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(refreshAllData, 10000);
    console.log('📡 Polling started (every 10 seconds)');
}

/**
 * Stop polling interval
 */
function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('📡 Polling stopped');
    }
}

/**
 * Refresh all dashboard data
 */
async function refreshAllData() {
    try {
        // Fetch sensor data (with fallback)
        let sensorData = await fetchReadings();
        
        // If offline and fetch returned mock data, use simulation mode
        if (!isOnline() && sensorData.isMock) {
            sensorData = generateSimulatedReadings();
        }
        
        currentData = sensorData;
        await updateAllCards(sensorData);
        
        // Save to history
        const historyEntry = {
            ...sensorData,
            classification: currentClassification?.status || 'safe',
            pond: 'growout',
            timestamp: new Date().toISOString()
        };
        saveReading(historyEntry);
        
        // Update energy savings
        await updateEnergyDisplay();
        
        // Update timestamp
        updateLastUpdated();
        
    } catch (error) {
        console.error('Refresh failed:', error);
        showAlertMessage('Failed to fetch sensor data. Using cached data.', 'warning');
    }
}

let currentClassification = null;

/**
 * Update all pond cards with new data
 * @param {Object} data - Sensor data
 */
async function updateAllCards(data) {
    const classification = classifyReading(
        data.temperature,
        data.ph,
        data.ammonia,
        data.dissolvedOxygen
    );
    currentClassification = classification;
    
    for (const pond of PONDS) {
        updatePondCard(pond, data, classification);
        checkAndSendAlert(pond, data, classification);
    }
}

/**
 * Update energy savings display
 */
async function updateEnergyDisplay() {
    const history = JSON.parse(localStorage.getItem('sensorHistory') || '[]');
    const savings = calculateEnergySavings(history);
    updateEnergySavingsDisplay(savings);
}

/**
 * Handle simulation data from simulation view
 * @param {Event} event - Custom event with simulation data
 */
function handleSimulationData(event) {
    const simData = event.detail;
    const classification = classifyReading(
        simData.temperature,
        simData.ph,
        simData.ammonia,
        simData.dissolvedOxygen
    );
    
    // Update all cards
    for (const pond of PONDS) {
        updatePondCard(pond, simData, classification);
    }
    
    // Save to history
    const historyEntry = {
        ...simData,
        classification: classification.status,
        pond: 'simulation',
        timestamp: new Date().toISOString()
    };
    saveReading(historyEntry);
    
    // Update energy display
    updateEnergyDisplay();
    
    showAlertMessage('✅ Simulation data loaded to dashboard', 'info');
}

/**
 * Handle online status change
 */
function handleOnlineStatus() {
    updateOfflineIndicator();
    showAlertMessage('🟢 Connection restored. Fetching live data...', 'info');
    refreshAllData();
}

/**
 * Handle offline status change
 */
function handleOfflineStatus() {
    updateOfflineIndicator();
    showAlertMessage('🔴 You are offline. Showing cached data.', 'warning');
}

/**
 * Update offline indicator in UI
 */
function updateOfflineIndicator() {
    let indicator = document.querySelector('.offline-indicator');
    
    if (!isOnline()) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'offline-badge offline-indicator';
            indicator.textContent = '⚠️ OFFLINE MODE - Using cached data';
            indicator.style.cssText = `
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: #6C757D;
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.75rem;
                z-index: 100;
            `;
            document.querySelector('.header')?.appendChild(indicator);
        }
    } else if (indicator) {
        indicator.remove();
    }
}

/**
 * Update last updated timestamp
 */
function updateLastUpdated() {
    const el = document.getElementById('last-updated');
    if (el) {
        el.textContent = formatTimestamp(new Date());
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}