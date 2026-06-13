// SIMPLIFIED STARTUP CODE - Replace your main.js with this NOW
console.log("🚀 SmartAqua loading (simplified mode)...");

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ DOM ready");
    
    const appRoot = document.getElementById('app-root');
    if (!appRoot) {
        console.error("❌ Problem: app-root not found!");
        return;
    }
    
    // Display a simple dashboard to prove JavaScript works
    appRoot.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif;">
            <h1 style="color: #0D5C46;">🌊 SmartAqua Dashboard</h1>
            <p><strong>Status:</strong> ✅ JavaScript is running correctly!</p>
            <p>The page is blank because the full dashboard code has a small error. This proves your setup works.</p>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <h3>📊 Sample Pond Data (Static View)</h3>
                <p>🌡️ Temperature: 28.5°C | 🧪 pH: 7.2 | 💨 NH₃: 0.35 | 💧 DO: 6.2</p>
                <p>🌡️ Temperature: 28.6°C | 🧪 pH: 7.1 | 💨 NH₃: 0.42 | 💧 DO: 6.0</p>
                <p>🌡️ Temperature: 28.4°C | 🧪 pH: 7.3 | 💨 NH₃: 0.38 | 💧 DO: 6.1</p>
                <p>🌡️ Temperature: 28.9°C | 🧪 pH: 6.9 | 💨 NH₃: 0.51 | 💧 DO: 5.8</p>
                <span style="display: inline-block; background: #28A745; color: white; padding: 4px 12px; border-radius: 20px;">🟢 SYSTEM ONLINE</span>
            </div>
            <p style="margin-top: 20px;">Last updated: ${new Date().toLocaleTimeString()}</p>
        </div>
    `;
    
    // Update the footer timestamp
    const timestampEl = document.getElementById('last-updated');
    if (timestampEl) {
        timestampEl.textContent = new Date().toLocaleTimeString();
    }
});