/**
 * storage.js - localStorage wrapper with error handling and quota management
 * Manages all persistent data storage for the SmartAqua application
 */

// Storage keys
export const STORAGE_KEYS = {
    SENSOR_HISTORY: 'sensorHistory',
    USER_SETTINGS: 'userSettings',
    SAVED_SCENARIOS: 'savedScenarios',
    CACHED_API_DATA: 'cachedApiData',
    ALERT_SETTINGS: 'alertSettings',
    DASHBOARD_PREFS: 'dashboardPrefs'
};

// Limits
const MAX_HISTORY_ENTRIES = 1000;
const MAX_CACHE_AGE_HOURS = 24;

/**
 * Safely set item in localStorage with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON.stringify'd)
 * @returns {boolean} - Success status
 */
export function setItem(key, value) {
    try {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
        return true;
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            console.warn(`Storage quota exceeded for key: ${key}`);
            clearOldestEntries();
            return setItem(key, value);
        }
        console.error(`Storage error for key ${key}:`, error);
        return false;
    }
}

/**
 * Safely get item from localStorage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any} - Retrieved value or defaultValue
 */
export function getItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        return JSON.parse(item);
    } catch (error) {
        console.error(`Error retrieving ${key}:`, error);
        return defaultValue;
    }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} - Success status
 */
export function removeItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing ${key}:`, error);
        return false;
    }
}

/**
 * Clear all SmartAqua data from localStorage
 * @returns {boolean} - Success status
 */
export function clearAll() {
    try {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        return true;
    } catch (error) {
        console.error('Error clearing storage:', error);
        return false;
    }
}

/**
 * Clear oldest entries when quota is exceeded
 */
function clearOldestEntries() {
    const history = getItem(STORAGE_KEYS.SENSOR_HISTORY, []);
    if (history.length > 0) {
        const trimmedHistory = history.slice(-Math.floor(MAX_HISTORY_ENTRIES / 2));
        setItem(STORAGE_KEYS.SENSOR_HISTORY, trimmedHistory);
        console.log(`Trimmed history from ${history.length} to ${trimmedHistory.length} entries`);
    }
}

/**
 * Save a sensor reading to history
 * @param {Object} reading - Sensor reading object
 * @returns {boolean} - Success status
 */
export function saveReading(reading) {
    const history = getItem(STORAGE_KEYS.SENSOR_HISTORY, []);
    
    // Add timestamp if not present
    const entry = {
        ...reading,
        savedAt: new Date().toISOString()
    };
    
    history.unshift(entry);
    
    // Trim to limit
    const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
    return setItem(STORAGE_KEYS.SENSOR_HISTORY, trimmed);
}

/**
 * Get history with optional filtering
 * @param {number} limit - Max entries to return
 * @param {string} pondId - Optional pond filter
 * @returns {Array} - Filtered history
 */
export function getHistory(limit = 100, pondId = null) {
    const history = getItem(STORAGE_KEYS.SENSOR_HISTORY, []);
    let filtered = history;
    
    if (pondId && pondId !== 'all') {
        filtered = history.filter(entry => {
            const entryPond = (entry.pond || '').toLowerCase();
            return entryPond === pondId.toLowerCase() || entryPond.includes(pondId.toLowerCase());
        });
    }
    
    return filtered.slice(0, limit);
}

/**
 * Clear all history
 * @returns {boolean} - Success status
 */
export function clearHistory() {
    return setItem(STORAGE_KEYS.SENSOR_HISTORY, []);
}

/**
 * Get history count
 * @returns {number} - Number of history entries
 */
export function getHistoryCount() {
    const history = getItem(STORAGE_KEYS.SENSOR_HISTORY, []);
    return history.length;
}

/**
 * Cache API response for offline fallback
 * @param {string} endpoint - API endpoint identifier
 * @param {any} data - Data to cache
 */
export function cacheApiResponse(endpoint, data) {
    const cache = getItem(STORAGE_KEYS.CACHED_API_DATA, {});
    cache[endpoint] = {
        data,
        timestamp: Date.now()
    };
    setItem(STORAGE_KEYS.CACHED_API_DATA, cache);
}

/**
 * Get cached API response
 * @param {string} endpoint - API endpoint identifier
 * @param {number} maxAgeMs - Maximum age in milliseconds (default 24 hours)
 * @returns {any|null} - Cached data or null
 */
export function getCachedApiResponse(endpoint, maxAgeMs = MAX_CACHE_AGE_HOURS * 60 * 60 * 1000) {
    const cache = getItem(STORAGE_KEYS.CACHED_API_DATA, {});
    const cached = cache[endpoint];
    
    if (cached && (Date.now() - cached.timestamp) < maxAgeMs) {
        return cached.data;
    }
    return null;
}

/**
 * Clear all cached API data
 * @returns {boolean} - Success status
 */
export function clearApiCache() {
    return setItem(STORAGE_KEYS.CACHED_API_DATA, {});
}

/**
 * Save user settings
 * @param {Object} settings - User settings object
 * @returns {boolean} - Success status
 */
export function saveUserSettings(settings) {
    const current = getItem(STORAGE_KEYS.USER_SETTINGS, {});
    const updated = { ...current, ...settings, updatedAt: Date.now() };
    return setItem(STORAGE_KEYS.USER_SETTINGS, updated);
}

/**
 * Get user settings
 * @param {string} key - Specific setting key (optional)
 * @returns {any} - Settings object or specific value
 */
export function getUserSettings(key = null) {
    const settings = getItem(STORAGE_KEYS.USER_SETTINGS, {});
    if (key) {
        return settings[key];
    }
    return settings;
}

/**
 * Save a custom simulation scenario
 * @param {string} name - Scenario name
 * @param {Object} values - Sensor values
 * @returns {boolean} - Success status
 */
export function saveSimulationScenario(name, values) {
    const scenarios = getItem(STORAGE_KEYS.SAVED_SCENARIOS, []);
    scenarios.unshift({
        id: Date.now(),
        name,
        values,
        createdAt: new Date().toISOString()
    });
    // Keep only last 20 scenarios
    const trimmed = scenarios.slice(0, 20);
    return setItem(STORAGE_KEYS.SAVED_SCENARIOS, trimmed);
}

/**
 * Get saved simulation scenarios
 * @returns {Array} - Array of saved scenarios
 */
export function getSavedScenarios() {
    return getItem(STORAGE_KEYS.SAVED_SCENARIOS, []);
}

/**
 * Delete a saved simulation scenario
 * @param {number} id - Scenario ID
 * @returns {boolean} - Success status
 */
export function deleteSimulationScenario(id) {
    const scenarios = getItem(STORAGE_KEYS.SAVED_SCENARIOS, []);
    const filtered = scenarios.filter(s => s.id !== id);
    return setItem(STORAGE_KEYS.SAVED_SCENARIOS, filtered);
}

/**
 * Check if storage is available
 * @returns {boolean} - Whether localStorage is available
 */
export function isStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Get storage usage information
 * @returns {Object} - Storage usage stats
 */
export function getStorageStats() {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        totalSize += (key.length + (value ? value.length : 0)) * 2; // Approximate bytes
    }
    return {
        usedBytes: totalSize,
        usedKB: Math.round(totalSize / 1024),
        itemCount: localStorage.length,
        maxBytes: 5 * 1024 * 1024, // 5MB typical limit
        percentUsed: Math.round((totalSize / (5 * 1024 * 1024)) * 100)
    };
}