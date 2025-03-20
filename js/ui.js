class UI {
    constructor() {
        // UI elements are already defined in the HTML
    }
    
    // Update UI elements based on aircraft data
    update(aircraft, currentTime) {
        // Update UI elements with aircraft data
        document.getElementById('altitude').textContent = Math.round(aircraft.position.y);
        document.getElementById('speed').textContent = Math.round(aircraft.velocity.length() * 3.6); // Convert m/s to km/h
        document.getElementById('throttle').textContent = Math.round(aircraft.controls.throttle * 100);
    }
}

export { UI }; 