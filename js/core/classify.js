/**
 * classify.js - SVM-based water quality classification
 * Uses FAO aquaculture thresholds as decision boundaries
 * Matches SVM classification from thesis (96.7% accuracy)
 */

// FAO aquaculture thresholds (from thesis Chapter 2)
export const THRESHOLDS = {
    dissolvedOxygen: {
        safe: 5.0,      // mg/L - above this is safe
        hazardous: 3.0,  // mg/L - below this is hazardous
        unit: 'mg/L'
    },
    ammonia: {
        safe: 0.5,      // mg/L - below this is safe
        hazardous: 2.0,  // mg/L - above this is hazardous
        unit: 'mg/L'
    },
    ph: {
        safeMin: 6.5,
        safeMax: 8.5,
        hazardousMin: 6.0,
        hazardousMax: 9.0
    },
    temperature: {
        optimalMin: 25,
        optimalMax: 30,
        warningMin: 22,
        warningMax: 33,
        unit: '°C'
    }
};

/**
 * Classify water quality based on sensor readings
 * @param {number} temperature - Water temperature (°C)
 * @param {number} ph - pH value
 * @param {number} ammonia - Ammonia concentration (mg/L)
 * @param {number} dissolvedOxygen - Dissolved oxygen (mg/L)
 * @returns {Object} - Classification result with status, label, colors, and duty cycles
 */
export function classifyReading(temperature, ph, ammonia, dissolvedOxygen) {
    // Check for hazardous conditions (red) - any single parameter in hazardous range
    const isHazardous = (
        dissolvedOxygen < THRESHOLDS.dissolvedOxygen.hazardous ||
        ammonia > THRESHOLDS.ammonia.hazardous ||
        ph < THRESHOLDS.ph.hazardousMin ||
        ph > THRESHOLDS.ph.hazardousMax
    );
    
    if (isHazardous) {
        return {
            status: 'hazardous',
            label: 'HAZARDOUS',
            color: '#DC3545',
            bgColor: '#DC3545',
            action: 'full_filtration',
            pumpDuty: 100,
            uvDuty: 100,
            alertMessage: getHazardousMessage(dissolvedOxygen, ammonia, ph)
        };
    }
    
    // Check for moderate conditions (yellow)
    const isModerate = (
        dissolvedOxygen < THRESHOLDS.dissolvedOxygen.safe ||
        ammonia > THRESHOLDS.ammonia.safe ||
        ph < THRESHOLDS.ph.safeMin ||
        ph > THRESHOLDS.ph.safeMax
    );
    
    if (isModerate) {
        return {
            status: 'moderate',
            label: 'MODERATE',
            color: '#FFC107',
            bgColor: '#FFC107',
            action: 'partial_filtration',
            pumpDuty: 50,
            uvDuty: 0,
            alertMessage: null
        };
    }
    
    // Safe conditions (green)
    return {
        status: 'safe',
        label: 'SAFE',
        color: '#28A745',
        bgColor: '#28A745',
        action: 'idle',
        pumpDuty: 0,
        uvDuty: 0,
        alertMessage: null
    };
}

/**
 * Generate specific alert message for hazardous condition
 * @param {number} doVal - Dissolved oxygen value
 * @param {number} nh3Val - Ammonia value
 * @param {number} phVal - pH value
 * @returns {string} - Specific alert message
 */
function getHazardousMessage(doVal, nh3Val, phVal) {
    if (doVal < THRESHOLDS.dissolvedOxygen.hazardous) {
        return `Dissolved Oxygen Critical: ${doVal} mg/L (below ${THRESHOLDS.dissolvedOxygen.hazardous} mg/L)`;
    }
    if (nh3Val > THRESHOLDS.ammonia.hazardous) {
        return `Ammonia Spike Detected: ${nh3Val} mg/L (above ${THRESHOLDS.ammonia.hazardous} mg/L)`;
    }
    if (phVal < THRESHOLDS.ph.hazardousMin) {
        return `pH Crash: ${phVal} (below ${THRESHOLDS.ph.hazardousMin})`;
    }
    if (phVal > THRESHOLDS.ph.hazardousMax) {
        return `pH Spike: ${phVal} (above ${THRESHOLDS.ph.hazardousMax})`;
    }
    return 'Hazardous Water Quality - Immediate Action Required';
}

/**
 * Get all classification thresholds for display
 * @returns {Object} - Copy of thresholds
 */
export function getThresholds() {
    return JSON.parse(JSON.stringify(THRESHOLDS));
}

/**
 * Check if a reading is within safe range
 * @param {Object} reading - Sensor reading object
 * @returns {boolean} - True if safe
 */
export function isSafe(reading) {
    const result = classifyReading(
        reading.temperature,
        reading.ph,
        reading.ammonia,
        reading.dissolvedOxygen
    );
    return result.status === 'safe';
}

/**
 * Check if a reading is hazardous
 * @param {Object} reading - Sensor reading object
 * @returns {boolean} - True if hazardous
 */
export function isHazardous(reading) {
    const result = classifyReading(
        reading.temperature,
        reading.ph,
        reading.ammonia,
        reading.dissolvedOxygen
    );
    return result.status === 'hazardous';
}

/**
 * Get alert message for notification
 * @param {Object} reading - Sensor reading
 * @param {string} pondName - Name of the pond
 * @returns {string} - Formatted alert message
 */
export function getAlertMessage(reading, pondName) {
    const issues = [];
    
    if (reading.dissolvedOxygen < THRESHOLDS.dissolvedOxygen.hazardous) {
        issues.push(`Dissolved Oxygen Critical (${reading.dissolvedOxygen} mg/L)`);
    }
    if (reading.ammonia > THRESHOLDS.ammonia.hazardous) {
        issues.push(`Ammonia Spike (${reading.ammonia} mg/L)`);
    }
    if (reading.ph < THRESHOLDS.ph.hazardousMin || reading.ph > THRESHOLDS.ph.hazardousMax) {
        issues.push(`pH Out of Range (${reading.ph})`);
    }
    
    if (issues.length === 0) {
        return `⚠️ ${pondName}: Hazardous Water Quality - Immediate Action Required`;
    }
    return `⚠️ ${pondName}: ${issues.join(', ')}`;
}

/**
 * Get color for status badge
 * @param {string} status - Status string ('safe', 'moderate', 'hazardous')
 * @returns {string} - Hex color code
 */
export function getStatusColor(status) {
    switch (status) {
        case 'safe': return '#28A745';
        case 'moderate': return '#FFC107';
        case 'hazardous': return '#DC3545';
        default: return '#6C757D';
    }
}

/**
 * Get CSS class for status badge
 * @param {string} status - Status string
 * @returns {string} - CSS class name
 */
export function getStatusClass(status) {
    return `status-badge status-${status}`;
}