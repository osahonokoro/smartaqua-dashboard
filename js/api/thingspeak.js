/**
 * thingspeak.js - ThingSpeak API with offline fallback
 */

import { getCachedApiResponse, cacheApiResponse } from '../utils/storage.js';

const THINGSPEAK_BASE_URL = 'https://api.thingspeak.com/channels';
const CHANNEL_ID = '3402758';  // Your actual Channel ID
const READ_API_KEY = 'I2SI0R2FY5BCQPKL';  // Your actual Read API Key

const MOCK_SENSOR_DATA = {
    temperature: 28.6,
    ph: 7.5,
    ammonia: 0.42,
    dissolvedOxygen: 6.1,
    timestamp: new Date().toISOString()
};

export async function fetchReadings() {
    // URL to get the latest single feed
    const url = `${THINGSPEAK_BASE_URL}/${CHANNEL_ID}/feeds/last.json?api_key=${READ_API_KEY}`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        // Parse the response - field1=Temperature, field2=pH, field3=Ammonia, field4=DO
        const readings = {
            temperature: parseFloat(data.field1) || MOCK_SENSOR_DATA.temperature,
            ph: parseFloat(data.field2) || MOCK_SENSOR_DATA.ph,
            ammonia: parseFloat(data.field3) || MOCK_SENSOR_DATA.ammonia,
            dissolvedOxygen: parseFloat(data.field4) || MOCK_SENSOR_DATA.dissolvedOxygen,
            timestamp: data.created_at || new Date().toISOString()
        };
        
        // Cache successful response for offline use
        cacheApiResponse('thingspeak', readings);
        return readings;
        
    } catch (error) {
        console.warn('ThingSpeak API error:', error.message);
        
        // Try to return cached data
        const cached = getCachedApiResponse('thingspeak');
        if (cached) {
            console.log('Using cached ThingSpeak data');
            return { ...cached, fromCache: true };
        }
        
        // Fallback to mock data
        console.log('Using mock sensor data as fallback');
        return { ...MOCK_SENSOR_DATA, fromCache: false, isMock: true };
    }
}

// Optional: Fetch multiple recent readings (for history/populating charts)
export async function fetchRecentReadings(results = 20) {
    const url = `${THINGSPEAK_BASE_URL}/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}&results=${results}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const feeds = data.feeds || [];
        
        return feeds.map(feed => ({
            temperature: parseFloat(feed.field1),
            ph: parseFloat(feed.field2),
            ammonia: parseFloat(feed.field3),
            dissolvedOxygen: parseFloat(feed.field4),
            timestamp: feed.created_at
        }));
        
    } catch (error) {
        console.warn('Failed to fetch recent readings:', error.message);
        return [];
    }
}

export function generateSimulatedReadings() {
    return {
        temperature: +(28 + Math.random() * 2).toFixed(1),
        ph: +(7 + Math.random() * 1).toFixed(1),
        ammonia: +(0.3 + Math.random() * 0.4).toFixed(2),
        dissolvedOxygen: +(5.5 + Math.random() * 1.5).toFixed(1),
        timestamp: new Date().toISOString(),
        isSimulated: true
    };
}