/**
 * helpers.js - Pure utility functions
 * Reusable helper functions used across multiple modules
 */

/**
 * Format timestamp for display
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted time string (HH:MM:SS)
 */
export function formatTimestamp(date) {
    if (!date) return '--:--:--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--:--:--';
    return d.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
    });
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
export function formatDate(date) {
    if (!date) return '--/--/----';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--/--/----';
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Format full datetime for display
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted datetime string
 */
export function formatDateTime(date) {
    if (!date) return '--/--/---- --:--:--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '--/--/---- --:--:--';
    return `${formatDate(d)} ${formatTimestamp(d)}`;
}

/**
 * Debounce function to limit rate of execution
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Throttle function to limit rate of execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Calculate average of an array of numbers
 * @param {Array<number>} arr - Array of numbers
 * @returns {number} - Average value
 */
export function average(arr) {
    if (!arr || arr.length === 0) return 0;
    const validNumbers = arr.filter(n => typeof n === 'number' && !isNaN(n));
    if (validNumbers.length === 0) return 0;
    return validNumbers.reduce((a, b) => a + b, 0) / validNumbers.length;
}

/**
 * Convert Kelvin to Celsius
 * @param {number} kelvin - Temperature in Kelvin
 * @returns {number} - Temperature in Celsius
 */
export function kelvinToCelsius(kelvin) {
    if (kelvin === undefined || kelvin === null) return null;
    return parseFloat((kelvin - 273.15).toFixed(1));
}

/**
 * Validate if a value is within thresholds
 * @param {number} value - Value to validate
 * @param {number} min - Minimum acceptable value
 * @param {number} max - Maximum acceptable value
 * @returns {boolean} - Whether value is within range
 */
export function validateThreshold(value, min, max) {
    if (value === undefined || value === null || isNaN(value)) return false;
    return value >= min && value <= max;
}

/**
 * Normalize USGS reading values
 * @param {number} value - Raw USGS value
 * @param {string} parameterCode - USGS parameter code
 * @returns {number} - Normalized value
 */
export function normalizeUsgsReading(value, parameterCode) {
    if (value === undefined || value === null) return null;
    
    // 00010 = temperature (already °C)
    // 00020 = pH (already correct)
    // 00300 = dissolved oxygen (mg/L)
    
    if (parameterCode === '00300' && value > 20) {
        // If DO > 20, might be percent saturation - rough conversion
        // Standard conversion: DO (mg/L) = (percent saturation / 100) * 8
        return parseFloat(((value / 100) * 8).toFixed(1));
    }
    return parseFloat(value.toFixed(1));
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Generate a random ID
 * @returns {string} - Random ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} - Cloned object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if two objects are equal (shallow)
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {boolean} - Whether objects are equal
 */
export function shallowEqual(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (let key of keys1) {
        if (obj1[key] !== obj2[key]) return false;
    }
    return true;
}

/**
 * Sleep/delay for async functions
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format number with units (K, M, B)
 * @param {number} num - Number to format
 * @returns {string} - Formatted number with unit suffix
 */
export function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
}

/**
 * Get CSS variable value
 * @param {string} variableName - CSS variable name (e.g., '--primary')
 * @returns {string} - CSS variable value
 */
export function getCssVariable(variableName) {
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
}

/**
 * Detect if device is mobile
 * @returns {boolean} - Whether device is mobile
 */
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detect if user is online
 * @returns {boolean} - Whether user is online
 */
export function isOnline() {
    return navigator.onLine;
}

/**
 * Add event listener for online/offline status
 * @param {Function} onOnline - Callback when online
 * @param {Function} onOffline - Callback when offline
 */
export function watchNetworkStatus(onOnline, onOffline) {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
}

/**
 * Remove network status listeners
 * @param {Function} onOnline - Callback to remove
 * @param {Function} onOffline - Callback to remove
 */
export function unwatchNetworkStatus(onOnline, onOffline) {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
}
