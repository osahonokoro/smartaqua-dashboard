/**
 * energy.js - Energy savings calculator
 * Calculates energy savings from duty-cycle control vs continuous operation
 * Baseline: 1.20 kWh/day (continuous pump operation)
 * Based on thesis Chapter 3 energy model
 */

// Constants from thesis (Chapter 3, Section 3.3.4)
const BASELINE_KWH_DAY = 1.20;      // Continuous pump: 0.05kW × 24h
const PUMP_POWER_KW = 0.05;         // Pump power rating (50W)
const UV_POWER_KW = 0.04;           // UV sterilizer power (40W)
const ELECTRICITY_RATE_NGN = 150;   // Nigerian Naira per kWh (approximate)

// Duty cycle multipliers
const DUTY_CYCLE = {
    safe: 0,
    moderate: 0.5,
    hazardous: 1.0
};

/**
 * Calculate energy savings based on classification history
 * @param {Array} history - Array of historical readings with classification
 * @returns {Object} - Savings calculation results
 */
export function calculateEnergySavings(history) {
    if (!history || history.length === 0) {
        return {
            kwhSaved: 0,
            nairaSaved: 0,
            percentSaved: 0,
            optimizedKwhDay: BASELINE_KWH_DAY,
            pumpRuntimeHours: 0,
            co2ReductionKg: 0
        };
    }
    
    // Calculate average duty cycle from history
    let totalPumpDuty = 0;
    let totalUvDuty = 0;
    let hazardousCount = 0;
    let moderateCount = 0;
    
    for (const reading of history) {
        const classification = reading.classification || reading.status;
        
        if (classification === 'hazardous') {
            totalPumpDuty += DUTY_CYCLE.hazardous;
            totalUvDuty += DUTY_CYCLE.hazardous;
            hazardousCount++;
        } else if (classification === 'moderate') {
            totalPumpDuty += DUTY_CYCLE.moderate;
            // UV not activated in moderate
            moderateCount++;
        }
        // Safe adds nothing
    }
    
    const avgPumpDuty = totalPumpDuty / history.length;
    const avgUvDuty = totalUvDuty / history.length;
    
    // Calculate energy consumption
    const optimizedPumpKwh = PUMP_POWER_KW * 24 * avgPumpDuty;
    const optimizedUvKwh = UV_POWER_KW * 24 * avgUvDuty;
    const optimizedTotalKwh = optimizedPumpKwh + optimizedUvKwh;
    
    // Baseline assumes continuous pump, UV only when needed (simplified)
    const baselineTotalKwh = BASELINE_KWH_DAY;
    
    const kwhSaved = baselineTotalKwh - optimizedTotalKwh;
    const percentSaved = (kwhSaved / baselineTotalKwh) * 100;
    const nairaSaved = kwhSaved * ELECTRICITY_RATE_NGN;
    
    // CO2 reduction estimate (0.45 kg CO2 per kWh - Nigerian grid average)
    const co2ReductionKg = kwhSaved * 0.45;
    
    // Calculate pump runtime hours per day
    const pumpRuntimeHours = 24 * avgPumpDuty;
    
    return {
        kwhSaved: Math.max(0, Math.round(kwhSaved * 100) / 100),
        nairaSaved: Math.max(0, Math.round(nairaSaved)),
        percentSaved: Math.max(0, Math.round(percentSaved)),
        optimizedKwhDay: Math.round(optimizedTotalKwh * 100) / 100,
        baselineKwhDay: BASELINE_KWH_DAY,
        pumpRuntimeHours: Math.round(pumpRuntimeHours * 10) / 10,
        co2ReductionKg: Math.round(co2ReductionKg * 100) / 100,
        hazardousCount,
        moderateCount,
        totalReadings: history.length
    };
}

/**
 * Calculate energy savings for a single day based on classification distribution
 * @param {number} hazardousPercent - Percentage of time in hazardous state (0-100)
 * @param {number} moderatePercent - Percentage of time in moderate state (0-100)
 * @returns {Object} - Savings calculation
 */
export function calculateDailySavings(hazardousPercent, moderatePercent) {
    const safePercent = 100 - hazardousPercent - moderatePercent;
    
    const dutyCycle = (hazardousPercent / 100) * DUTY_CYCLE.hazardous +
                      (moderatePercent / 100) * DUTY_CYCLE.moderate +
                      (safePercent / 100) * DUTY_CYCLE.safe;
    
    const optimizedKwh = PUMP_POWER_KW * 24 * dutyCycle;
    const kwhSaved = BASELINE_KWH_DAY - optimizedKwh;
    const percentSaved = (kwhSaved / BASELINE_KWH_DAY) * 100;
    
    return {
        kwhSaved: Math.max(0, Math.round(kwhSaved * 100) / 100),
        nairaSaved: Math.max(0, Math.round(kwhSaved * ELECTRICITY_RATE_NGN)),
        percentSaved: Math.max(0, Math.round(percentSaved)),
        optimizedKwhDay: Math.round(optimizedKwh * 100) / 100,
        dutyCycle: Math.round(dutyCycle * 100)
    };
}

/**
 * Format currency in Nigerian Naira
 * @param {number} naira - Amount in Naira
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(naira) {
    return `₦${naira.toLocaleString()}`;
}

/**
 * Get baseline daily consumption
 * @returns {number} - Baseline kWh per day
 */
export function getDailyBaseline() {
    return BASELINE_KWH_DAY;
}

/**
 * Get electricity rate
 * @returns {number} - Rate in Naira per kWh
 */
export function getElectricityRate() {
    return ELECTRICITY_RATE_NGN;
}

/**
 * Calculate monthly savings projection
 * @param {Object} dailySavings - Daily savings object from calculateEnergySavings
 * @returns {Object} - Monthly projections (30 days)
 */
export function getMonthlyProjection(dailySavings) {
    return {
        kwhSavedMonth: Math.round(dailySavings.kwhSaved * 30 * 100) / 100,
        nairaSavedMonth: Math.round(dailySavings.nairaSaved * 30),
        co2ReductionMonth: Math.round(dailySavings.co2ReductionKg * 30 * 100) / 100
    };
}

/**
 * Calculate yearly savings projection
 * @param {Object} dailySavings - Daily savings object from calculateEnergySavings
 * @returns {Object} - Yearly projections (365 days)
 */
export function getYearlyProjection(dailySavings) {
    return {
        kwhSavedYear: Math.round(dailySavings.kwhSaved * 365 * 100) / 100,
        nairaSavedYear: Math.round(dailySavings.nairaSaved * 365),
        co2ReductionYear: Math.round(dailySavings.co2ReductionKg * 365 * 100) / 100
    };
}