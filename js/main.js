class FlightSimulator {
    constructor() {
        // Create the scene
        this.sceneManager = new SceneManager();
        
        // Create physics
        this.physics = new Physics();
        this.physics.addCloudsToScene(this.sceneManager.scene);
        
        // Create aircraft
        this.aircraft = new Aircraft(this.sceneManager.scene);
        
        // Create controls
        this.controls = new Controls(this.aircraft);
        
        // Create UI
        this.ui = new UI();
        
        // Animation variables
        this.lastTime = 0;
        this.running = true;
        
        // Start the animation loop
        this.animate();
    }
    
    animate(currentTime = 0) {
        if (!this.running) return;
        
        // Calculate delta time in seconds
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Skip the first frame (deltaTime would be too large)
        if (deltaTime > 0 && deltaTime < 1) {
            // Update controls
            this.controls.update();
            
            // Update aircraft
            this.aircraft.update(deltaTime);
            
            // Update UI
            this.ui.update(this.aircraft, currentTime);
            
            // Render the scene
            this.sceneManager.render(this.aircraft.getActiveCamera());
        }
        
        // Schedule the next frame
        requestAnimationFrame((time) => this.animate(time));
    }
}

// Initialize the simulator when the page loads
window.addEventListener('load', () => {
    // Check for WebGL support
    if (!window.WebGLRenderingContext) {
        alert('Your browser does not support WebGL. Please use a modern browser to play this flight simulator.');
        return;
    }
    
    // Create the flight simulator
    const simulator = new FlightSimulator();
    
    // Add a warning for mobile users
    if (/Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent)) {
        const mobileWarning = document.createElement('div');
        mobileWarning.style.position = 'fixed';
        mobileWarning.style.top = '50%';
        mobileWarning.style.left = '50%';
        mobileWarning.style.transform = 'translate(-50%, -50%)';
        mobileWarning.style.background = 'rgba(0, 0, 0, 0.7)';
        mobileWarning.style.color = 'white';
        mobileWarning.style.padding = '20px';
        mobileWarning.style.borderRadius = '10px';
        mobileWarning.style.zIndex = '1000';
        mobileWarning.style.textAlign = 'center';
        mobileWarning.style.width = '80%';
        mobileWarning.innerHTML = `
            <h2>Best Experienced on Desktop</h2>
            <p>This flight simulator is designed for keyboard controls and may not work properly on mobile devices.</p>
            <button id="continue-anyway" style="padding: 10px; margin-top: 10px; background: #4CAF50; border: none; color: white; cursor: pointer; border-radius: 5px;">Continue Anyway</button>
        `;
        document.body.appendChild(mobileWarning);
        
        document.getElementById('continue-anyway').addEventListener('click', () => {
            mobileWarning.style.display = 'none';
        });
    }

    // Handle keyboard input
    document.addEventListener('keydown', (event) => {
        switch(event.key.toLowerCase()) {
            case 'w':
                simulator.aircraft.controls.pitch = -1;
                break;
            case 's':
                simulator.aircraft.controls.pitch = 1;
                break;
            case 'a':
                simulator.aircraft.controls.yaw = -1;
                break;
            case 'd':
                simulator.aircraft.controls.yaw = 1;
                break;
            case 'shift':
                simulator.aircraft.controls.throttle = Math.min(1, simulator.aircraft.controls.throttle + 0.1);
                break;
            case 'control':
                simulator.aircraft.controls.throttle = Math.max(0, simulator.aircraft.controls.throttle - 0.1);
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch(event.key.toLowerCase()) {
            case 'w':
            case 's':
                simulator.aircraft.controls.pitch = 0;
                break;
            case 'a':
            case 'd':
                simulator.aircraft.controls.yaw = 0;
                break;
        }
    });
}); 