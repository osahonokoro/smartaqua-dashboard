/**
 * alerts.js - Alert management and browser notifications
 * Manages threshold-based alerts, notifications, and visual warnings
 */

import { getAlertMessage, isHazardous } from '../core/classify.js';

// Alert cooldown tracking (prevent notification spam)
let alertCooldown = {};
let lastNotificationTime = {};

const COOLDOWN_SECONDS = 60; // Minimum seconds between notifications for same pond
const REQUIRED_CONSECUTIVE_SAFE = 3; // Number of safe readings needed to clear alert

// Track consecutive safe readings per pond
let consecutiveSafeCount = {};

/**
 * Check water quality and send alerts if needed
 * @param {Object} pond - Pond configuration object
 * @param {Object} data - Sensor reading data
 * @param {Object} classification - Classification result
 */
export function checkAndSendAlert(pond, data, classification) {
    // Initialize tracking for this pond if not exists
    if (!alertCooldown[pond.id]) {
        alertCooldown[pond.id] = { active: false, lastAlertTime: 0 };
        consecutiveSafeCount[pond.id] = 0;
    }
    
    // Handle hazardous condition
    if (classification.status === 'hazardous') {
        // Reset safe counter
        consecutiveSafeCount[pond.id] = 0;
        
        // Check if alert is already active or on cooldown
        const now = Date.now();
        const timeSinceLastAlert = (now - alertCooldown[pond.id].lastAlertTime) / 1000;
        
        if (!alertCooldown[pond.id].active && timeSinceLastAlert >= COOLDOWN_SECONDS) {
            // Activate alert and send notification
            alertCooldown[pond.id].active = true;
            alertCooldown[pond.id].lastAlertTime = now;
            
            // Send browser notification
            sendBrowserNotification(pond, data);
            
            // Show visual alert on the card
            flashCardBorder(pond.id);
            
            // Log to console (for debugging)
            console.warn(`[ALERT] ${pond.name}: Hazardous condition detected!`, {
                temperature: data.temperature,
                ph: data.ph,
                ammonia: data.ammonia,
                dissolvedOxygen: data.dissolvedOxygen
            });
        }
    } 
    // Handle safe condition - count consecutive safe readings
    else if (classification.status === 'safe') {
        consecutiveSafeCount[pond.id]++;
        
        // Clear alert after required consecutive safe readings
        if (alertCooldown[pond.id].active && 
            consecutiveSafeCount[pond.id] >= REQUIRED_CONSECUTIVE_SAFE) {
            alertCooldown[pond.id].active = false;
            clearCardAlert(pond.id);
            console.log(`[ALERT] ${pond.name}: Conditions returned to safe. Alert cleared.`);
        }
    }
    // Moderate condition - reset safe counter but don't trigger new alert
    else if (classification.status === 'moderate') {
        consecutiveSafeCount[pond.id] = 0;
        // Alert remains active if it was active
    }
}

/**
 * Send browser notification
 * @param {Object} pond - Pond configuration
 * @param {Object} data - Sensor reading data
 */
function sendBrowserNotification(pond, data) {
    // Check if notifications are supported and permission granted
    if (!('Notification' in window)) {
        console.log('Browser notifications not supported');
        return;
    }
    
    if (Notification.permission === 'granted') {
        const message = getAlertMessage(data, pond.name);
        
        const notification = new Notification('🚨 SmartAqua Emergency Alert', {
            body: message,
            icon: '/images/favicon.png',
            tag: `alert-${pond.id}-${Date.now()}`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            silent: false
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
        
        // Optional: Play sound alert
        playAlertSound();
        
    } else if (Notification.permission === 'default') {
        // Request permission (but don't auto-send)
        requestNotificationPermission();
    }
}

/**
 * Play alert sound (simple beep using Web Audio API)
 */
function playAlertSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 880; // A5 note
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 1);
        oscillator.stop(audioContext.currentTime + 1);
    } catch (e) {
        // Audio context might be blocked by browser policy
        console.log('Alert sound not played:', e.message);
    }
}

/**
 * Flash card border to indicate hazard
 * @param {string} pondId - Pond identifier
 */
function flashCardBorder(pondId) {
    const card = document.getElementById(`card-${pondId}`);
    if (!card) return;
    
    // Add flashing class
    card.classList.add('hazardous-flash');
    
    // Remove after animation completes
    setTimeout(() => {
        card.classList.remove('hazardous-flash');
    }, 2000);
}

/**
 * Clear alert styling from card
 * @param {string} pondId - Pond identifier
 */
function clearCardAlert(pondId) {
    const card = document.getElementById(`card-${pondId}`);
    if (card) {
        card.classList.remove('hazardous-pulse', 'hazardous-flash');
    }
}

/**
 * Request notification permission from user
 * @returns {Promise<boolean>} - Whether permission was granted
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Browser notifications not supported');
        return false;
    }
    
    if (Notification.permission === 'granted') {
        return true;
    }
    
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }
    
    return false;
}

/**
 * Show error message in the UI
 * @param {string} message - Error message to display
 * @param {string} type - Message type ('error', 'warning', 'info')
 */
export function showAlertMessage(message, type = 'error') {
    let alertEl = document.querySelector('.user-alert');
    
    if (!alertEl) {
        alertEl = document.createElement('div');
        alertEl.className = 'user-alert';
        alertEl.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideDown 0.3s ease;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(alertEl);
    }
    
    // Set styling based on type
    const colors = {
        error: { bg: '#DC3545', text: 'white' },
        warning: { bg: '#FFC107', text: '#1A1A1A' },
        info: { bg: '#0D5C46', text: 'white' }
    };
    const color = colors[type] || colors.info;
    
    alertEl.style.backgroundColor = color.bg;
    alertEl.style.color = color.text;
    alertEl.textContent = message;
    alertEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertEl.style.opacity = '0';
        setTimeout(() => {
            alertEl.style.display = 'none';
            alertEl.style.opacity = '1';
        }, 300);
    }, 5000);
}

/**
 * Reset alert state for a specific pond
 * @param {string} pondId - Pond identifier
 */
export function resetAlertState(pondId) {
    if (alertCooldown[pondId]) {
        alertCooldown[pondId].active = false;
        alertCooldown[pondId].lastAlertTime = 0;
    }
    consecutiveSafeCount[pondId] = 0;
    clearCardAlert(pondId);
}

/**
 * Get current alert status for a pond
 * @param {string} pondId - Pond identifier
 * @returns {Object} - Alert status
 */
export function getAlertStatus(pondId) {
    return {
        isActive: alertCooldown[pondId]?.active || false,
        consecutiveSafe: consecutiveSafeCount[pondId] || 0,
        lastAlertTime: alertCooldown[pondId]?.lastAlertTime || 0
    };
}

// Add CSS animation for slideDown if not already in stylesheet
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    .hazardous-flash {
        animation: flashRed 0.5s ease-in-out 3;
    }
    @keyframes flashRed {
        0%, 100% { border-color: #DC3545; box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
        50% { border-color: #ff6b6b; box-shadow: 0 0 0 8px rgba(220, 53, 69, 0.2); }
    }
`;
document.head.appendChild(styleSheet);