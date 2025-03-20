class UI {
    constructor() {
        // UI elements are already defined in the HTML
        this.frameCount = 0;
        this.lastFpsUpdateTime = 0;
        this.fps = 0;
    }
    
    // Update UI elements based on aircraft data
    update(aircraft, currentTime) {
        // Update UI elements with aircraft data
        document.getElementById('altitude').textContent = Math.round(aircraft.position.y);
        document.getElementById('speed').textContent = Math.round(aircraft.velocity.length() * 3.6); // Convert m/s to km/h
        document.getElementById('throttle').textContent = Math.round(aircraft.controls.throttle * 100);
        
        // Update FPS counter
        this.frameCount++;
        
        // Update FPS once per second
        if (currentTime - this.lastFpsUpdateTime >= 1000) {
            this.fps = this.frameCount;
            document.getElementById('fps').textContent = this.fps;
            this.frameCount = 0;
            this.lastFpsUpdateTime = currentTime;
        }
    }
}

export { UI }; 