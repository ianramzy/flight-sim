import { SceneManager } from './scene/SceneManager.js';
import { Physics } from './physics.js';
import { Aircraft } from './aircraft.js';
import { AIAircraft } from './aiAircraft.js';
import { Controls } from './controls.js';
import { UI } from './ui.js';

class FlightSimulator {
    constructor() {
        // Create the scene
        this.sceneManager = new SceneManager();
        
        // Create physics
        this.physics = new Physics();
        
        // Create aircraft
        this.aircraft = new Aircraft(this.sceneManager.scene);
        
        // Create 100 AI aircraft with random colors
        this.aiAircraft = [];
        const baseColors = [
            0xFF5252, // Red
            0x4CAF50, // Green
            0x2196F3, // Blue
            0xFFC107, // Amber
            0x9C27B0, // Purple
            0xFF9800, // Orange
            0x795548, // Brown
            0x009688, // Teal
            0xE91E63, // Pink
            0xFFEB3B  // Yellow
        ];
        
        // Create 100 AI aircraft
        for (let i = 0; i < 100; i++) {
            // For first 10 aircraft, use predefined colors, then use random colors
            const color = i < 10 ? baseColors[i] : Math.random() * 0xFFFFFF;
            this.aiAircraft.push(new AIAircraft(this.sceneManager.scene, null, color));
        }
        
        // Make aircraft instance globally accessible for performance monitoring
        window.aircraftInstance = this.aircraft;
        
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
    
    checkProjectileCollisions() {
        if (!this.aircraft.projectiles.length) return;
        
        // Hot air balloon collision detection
        const balloons = this.sceneManager.balloons ? this.sceneManager.balloons.balloons : [];
        const projectiles = this.aircraft.projectiles;
        
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];
            const projectilePos = projectile.mesh.position;
            
            // Check collisions with hot air balloons - 1 point each
            for (let j = balloons.length - 1; j >= 0; j--) {
                const balloon = balloons[j];
                const balloonPos = balloon.position;
                
                // Simple distance-based collision detection (sphere vs sphere)
                const distance = projectilePos.distanceTo(balloonPos);
                if (distance < 25) { // Balloon radius is around 20
                    // Award 1 point
                    this.ui.addPoints(1);
                    
                    // Remove balloon
                    this.sceneManager.scene.remove(balloon);
                    balloons.splice(j, 1);
                    
                    // Remove projectile
                    this.sceneManager.scene.remove(projectile.mesh);
                    projectiles.splice(i, 1);
                    
                    // Skip checking other targets for this projectile
                    break;
                }
            }
            
            // If the projectile was removed, skip to the next one
            if (i >= projectiles.length) continue;
            
            // Check collisions with AI aircraft - 5 points each
            for (let j = this.aiAircraft.length - 1; j >= 0; j--) {
                const ai = this.aiAircraft[j];
                const aiPos = ai.position;
                
                // Simple distance-based collision detection
                const distance = projectilePos.distanceTo(aiPos);
                if (distance < 15) { // Aircraft size is smaller than balloon
                    // Award 5 points
                    this.ui.addPoints(5);
                    
                    // Reset AI position to somewhere random
                    ai.resetToSafeState();
                    
                    // Update AI aircraft count in UI
                    this.ui.updateAICount(this.aiAircraft.length);
                    
                    // Remove projectile
                    this.sceneManager.scene.remove(projectile.mesh);
                    projectiles.splice(i, 1);
                    break;
                }
            }
        }
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
            
            // Update player aircraft
            this.aircraft.update(deltaTime);
            
            // Update AI aircraft
            for (const ai of this.aiAircraft) {
                ai.update(deltaTime);
            }
            
            // Check for collisions between projectiles and targets
            this.checkProjectileCollisions();
            
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
    
    // Make simulator instance globally accessible for performance monitoring
    window.simulatorInstance = simulator;
    
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
            case 'enter':
                simulator.aircraft.shoot();
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