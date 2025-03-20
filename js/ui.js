class UI {
    constructor() {
        // UI elements are already defined in the HTML
        this.score = 0;
        
        // Set the AI count in the UI
        document.getElementById('ai-count').textContent = '100';
    }
    
    // Update UI elements based on aircraft data
    update(aircraft, currentTime) {
        // Update UI elements with aircraft data
        document.getElementById('altitude').textContent = Math.round(aircraft.position.y);
        document.getElementById('speed').textContent = Math.round(aircraft.velocity.length() * 3.6); // Convert m/s to km/h
        document.getElementById('throttle').textContent = Math.round(aircraft.controls.throttle * 100);
        document.getElementById('score').textContent = this.score;
    }

    // Add points to the score
    addPoints(points) {
        this.score += points;
    }
    
    // Update AI count (useful if some get destroyed)
    updateAICount(count) {
        document.getElementById('ai-count').textContent = count;
    }
}

export { UI }; 