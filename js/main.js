// SUPER SIMPLE TEST - Replace your main.js temporarily
console.log("Test script loaded!");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM ready!");
    
    const appRoot = document.getElementById('app-root');
    console.log("app-root found:", appRoot);
    
    if (appRoot) {
        appRoot.innerHTML = `
            <div style="padding: 2rem; text-align: center; background: white; border-radius: 8px;">
                <h2 style="color: #0D5C46;">✅ JavaScript is Working!</h2>
                <p>If you see this, the problem is in your original main.js code.</p>
                <p>Time: ${new Date().toLocaleTimeString()}</p>
            </div>
        `;
    } else {
        console.error("app-root NOT found!");
    }
});