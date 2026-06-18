/**
 * main.js - SmartAqua Application Entry Point (Debug Version)
 * This version works step by step to identify issues
 */

console.log("🚀 main.js loaded");

// STEP 1: Import helpers (most basic - should always work)
import { formatTimestamp, isOnline, debounce } from './utils/helpers.js';
console.log("✅ helpers.js loaded");

// STEP 2: Import storage
import { saveReading } from './utils/storage.js';
console.log("✅ storage.js loaded");

// STEP 3: Import classification
import { classifyReading, getAlertMessage } from './core/classify.js';
console.log("✅ classify.js loaded");

// STEP 4: Import energy
import { calculateEnergySavings } from './core/energy.js';
console.log("✅ energy.js loaded");

// STEP 5: Import dashboard (this may fail if PONDS not exported)
import { renderDashboard, updatePondCard, updateEnergySavingsDisplay, attachDashboardEvents, PONDS } from './ui/dashboard.js';
console.log("✅ dashboard.js loaded - PONDS:", PONDS);

// STEP 6: Import alerts
import { checkAndSendAlert, requestNotificationPermission, showAlertMessage } from './ui/alerts.js';
console.log("✅ alerts.js loaded");

// STEP 7: Import history
import { renderHistoryView, attachHistoryEvents, exportToCSV } from './ui/history.js';
console.log("✅ history.js loaded");

// STEP 8: Import simulation
import { renderSimulationView, initSimulationEvents, stopRandomWalk } from './simulation/simulator.js';
console.log("✅ simulator.js loaded");

// STEP 9: Import API (these may fail if API keys not set)
import { fetchReadings, generateSimulatedReadings } from './api/thingspeak.js';
console.log("✅ thingspeak.js loaded");

import { fetchReferenceData } from './api/usgs.js';
console.log("✅ usgs.js loaded");

console.log("✅ ALL IMPORTS SUCCESSFUL!");

// --------------------------------
// Now initialize the app
// --------------------------------

let pollingInterval = null;
let currentData = null;
let currentView = 'dashboard';

async function initApp() {
    console.log("🚀 SmartAqua initializing...");
    
    await requestNotificationPermission();
    setupNavigation();
    await renderView('dashboard');
    startPolling();
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    window.addEventListener('simulation-data', handleSimulationData);
    
    updateLastUpdated();
    updateOfflineIndicator();
    
    console.log("✅ SmartAqua ready!");
}

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
            
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            if (currentView === 'simulation') stopRandomWalk();
            if (currentView === 'dashboard' && page !== 'dashboard') stopPolling();
            
            await renderView(page);
            
            if (page === 'dashboard') {
                startPolling();
                await refreshAllData();
            }
            
            currentView = page;
        });
    });
}

async function renderView(view) {
    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;
    
    switch (view) {
        case 'dashboard':
            appRoot.innerHTML = renderDashboard();
            attachDashboardEvents();
            if (currentData) await updateAllCards(currentData);
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

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(refreshAllData, 10000);
    console.log('📡 Polling started');
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('📡 Polling stopped');
    }
}

async function refreshAllData() {
    try {
        let sensorData = await fetchReadings();
        if (!isOnline() && sensorData.isMock) {
            sensorData = generateSimulatedReadings();
        }
        currentData = sensorData;
        await updateAllCards(sensorData);
        
        const historyEntry = {
            ...sensorData,
            classification: currentClassification?.status || 'safe',
            pond: 'growout',
            timestamp: new Date().toISOString()
        };
        saveReading(historyEntry);
        await updateEnergyDisplay();
        updateLastUpdated();
    } catch (error) {
        console.error('Refresh failed:', error);
        showAlertMessage('Failed to fetch sensor data. Using cached data.', 'warning');
    }
}

let currentClassification = null;

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

async function updateEnergyDisplay() {
    const history = JSON.parse(localStorage.getItem('sensorHistory') || '[]');
    const savings = calculateEnergySavings(history);
    updateEnergySavingsDisplay(savings);
}

function handleSimulationData(event) {
    const simData = event.detail;
    const classification = classifyReading(
        simData.temperature,
        simData.ph,
        simData.ammonia,
        simData.dissolvedOxygen
    );
    
    for (const pond of PONDS) {
        updatePondCard(pond, simData, classification);
    }
    
    const historyEntry = {
        ...simData,
        classification: classification.status,
        pond: 'simulation',
        timestamp: new Date().toISOString()
    };
    saveReading(historyEntry);
    updateEnergyDisplay();
    showAlertMessage('✅ Simulation data loaded to dashboard', 'info');
}

function handleOnlineStatus() {
    updateOfflineIndicator();
    showAlertMessage('🟢 Connection restored. Fetching live data...', 'info');
    refreshAllData();
}

function handleOfflineStatus() {
    updateOfflineIndicator();
    showAlertMessage('🔴 You are offline. Showing cached data.', 'warning');
}

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

function updateLastUpdated() {
    const el = document.getElementById('last-updated');
    if (el) {
        el.textContent = formatTimestamp(new Date());
    }
}

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}