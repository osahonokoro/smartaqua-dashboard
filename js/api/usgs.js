/**
 * usgs.js - USGS Water Quality API with offline fallback
 * Fetches real water quality data from USGS for reference/validation
 */

import { getCachedApiResponse, cacheApiResponse } from '../utils/storage.js';
import { normalizeUsgsReading } from '../utils/helpers.js';

const USGS_BASE_URL = 'https://waterservices.usgs.gov/nwis/iv';
const SITE_ID = '01646500'; // Potomac River reference station

// Fallback data when API fails or offline
const MOCK_USGS_DATA = {
    temperature: 15.2,
    ph: 7.3,
    dissolvedOxygen: 8.1,
    timestamp: new Date().toISOString(),
    siteName: 'Reference Data (Simulated)'
};

/**
 * Fetch reference water quality data from USGS
 * @returns {Promise<Object>} - Reference readings
 */
export async function fetchReferenceData() {
    const now = new Date();
    const startDate = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];
    const url = `${USGS_BASE_URL}/?format=json&sites=${SITE_ID}&parameterCd=00010,00020,00300&startDT=${startDate}`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const readings = parseUsgsResponse(data);
        
        // Cache successful response for offline use
        cacheApiResponse('usgs', readings);
        
        return readings;
        
    } catch (error) {
        console.warn('USGS API error:', error.message);
        
        // Try to return cached data
        const cached = getCachedApiResponse('usgs');
        if (cached) {
            console.log('Using cached USGS data');
            return { ...cached, fromCache: true };
        }
        
        // Fallback to mock data
        console.log('Using mock USGS data as fallback');
        return { ...MOCK_USGS_DATA, fromCache: false, isMock: true };
    }
}

/**
 * Parse USGS JSON response into standardized format
 * @param {Object} data - USGS API response
 * @returns {Object} - Standardized readings
 */
function parseUsgsResponse(data) {
    const result = {
        temperature: null,
        ph: null,
        dissolvedOxygen: null,
        timestamp: null,
        siteName: null
    };
    
    try {
        const timeSeries = data.value?.timeSeries || [];
        
        for (const series of timeSeries) {
            const variableCode = series.variable?.variableCode?.[0]?.value;
            const values = series.values?.[0]?.value;
            const latestValue = values?.[values.length - 1];
            
            if (!latestValue) continue;
            
            const value = parseFloat(latestValue.value);
            result.timestamp = latestValue.dateTime || new Date().toISOString();
            result.siteName = series.sourceInfo?.siteName || 'USGS Station';
            
            switch (variableCode) {
                case '00010': // Temperature (°C)
                    result.temperature = value;
                    break;
                case '00020': // pH
                    result.ph = value;
                    break;
                case '00300': // Dissolved oxygen
                    result.dissolvedOxygen = normalizeUsgsReading(value, '00300');
                    break;
                default:
                    break;
            }
        }
    } catch (error) {
        console.error('Error parsing USGS response:', error);
    }
    
    // Fill missing values with defaults
    return {
        temperature: result.temperature ?? MOCK_USGS_DATA.temperature,
        ph: result.ph ?? MOCK_USGS_DATA.ph,
        dissolvedOxygen: result.dissolvedOxygen ?? MOCK_USGS_DATA.dissolvedOxygen,
        timestamp: result.timestamp ?? new Date().toISOString(),
        siteName: result.siteName ?? 'USGS Reference Station'
    };
}

/**
 * Fetch multiple recent readings from USGS
 * @param {number} days - Number of days to fetch
 * @returns {Promise<Array>} - Array of readings
 */
export async function fetchRecentReferenceData(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    const url = `${USGS_BASE_URL}/?format=json&sites=${SITE_ID}&parameterCd=00010,00020,00300&startDT=${startDateStr}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const timeSeries = data.value?.timeSeries || [];
        
        // Build array of readings over time
        const readings = [];
        const timestamps = new Set();
        
        for (const series of timeSeries) {
            const variableCode = series.variable?.variableCode?.[0]?.value;
            const values = series.values?.[0]?.value || [];
            
            for (const val of values) {
                const timestamp = val.dateTime;
                if (!timestamps.has(timestamp)) {
                    timestamps.add(timestamp);
                    readings.push({
                        timestamp,
                        [getParamKey(variableCode)]: parseFloat(val.value),
                        siteName: series.sourceInfo?.siteName
                    });
                } else {
                    const existing = readings.find(r => r.timestamp === timestamp);
                    if (existing) {
                        existing[getParamKey(variableCode)] = parseFloat(val.value);
                    }
                }
            }
        }
        
        return readings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
    } catch (error) {
        console.warn('Failed to fetch recent USGS data:', error.message);
        return [];
    }
}

/**
 * Get parameter key from USGS parameter code
 * @param {string} code - USGS parameter code
 * @returns {string} - Standardized key name
 */
function getParamKey(code) {
    switch (code) {
        case '00010': return 'temperature';
        case '00020': return 'ph';
        case '00300': return 'dissolvedOxygen';
        default: return 'unknown';
    }
}