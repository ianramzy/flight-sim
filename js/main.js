import { SceneManager } from './scene/SceneManager.js';
import { Physics } from './physics.js';
import { Aircraft } from './aircraft.js';
import { AIAircraft } from './aiAircraft.js';
import { Controls } from './controls.js';
import { UI } from './ui.js';
import { EffectsSystem } from './effects.js';

class FlightSimulator {
    constructor() {
        // Create the scene
        this.sceneManager = new SceneManager();
        
        // Create physics
        this.physics = new Physics();
        
        // Create effects system
        this.effects = new EffectsSystem(this.sceneManager.scene);
        
        // Create aircraft
        this.aircraft = new Aircraft(this.sceneManager.scene);
        
        // Create 50 AI aircraft (reduced from 100)
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
        
        // Create 50 AI aircraft
        for (let i = 0; i < 50; i++) {
            // For first 10 aircraft, use predefined colors, then use random colors
            const color = i < 10 ? baseColors[i] : Math.random() * 0xFFFFFF;
            
            // Create safe starting position (avoid NaN or 0,0,0)
            const safeStartPosition = this.createSafeStartingPosition();
            
            const aircraft = new AIAircraft(this.sceneManager.scene, safeStartPosition, color);
            
            // Force planes to select a new target immediately to avoid all going in same direction
            aircraft.selectNewTarget();
            
            // Ensure the plane has valid vectors before adding to the scene
            aircraft.validateVectors();
            
            // Enable debugging for first 10 planes
            if (i < 10) {
                aircraft.isDebug = true;
                aircraft.planeId = i;
                console.log(`Debugging enabled for AI plane #${i} (color: ${color.toString(16)})`);
            } else {
                aircraft.planeId = i; // Still assign ID for all planes
            }
            
            this.aiAircraft.push(aircraft);
        }
        
        // Verify all aircraft were created successfully
        console.log(`Created ${this.aiAircraft.length} AI aircraft`);
        
        // Log all aircraft targets to verify they're not all going in the same direction
        console.log("Initial aircraft targets:");
        this.aiAircraft.forEach((aircraft, index) => {
            if (index < 10) { // Just log first 10 for readability
                console.log(`Plane #${index}: position=${aircraft.position.toArray().map(n => n.toFixed(1))}, target=${aircraft.targetPosition.toArray().map(n => n.toFixed(1))}`);
            }
        });
        
        // Calculate and log target directions to check diversity
        console.log("Target directions (normalized vectors from position to target):");
        let directions = {};
        this.aiAircraft.forEach((aircraft, index) => {
            const dir = new THREE.Vector3().subVectors(aircraft.targetPosition, aircraft.position).normalize();
            const dirKey = `${Math.round(dir.x * 10)},${Math.round(dir.y * 10)},${Math.round(dir.z * 10)}`;
            if (!directions[dirKey]) directions[dirKey] = [];
            directions[dirKey].push(index);
        });
        
        // Print summary of direction distribution
        console.log(`Found ${Object.keys(directions).length} different target directions for ${this.aiAircraft.length} planes`);
        Object.entries(directions).sort((a, b) => b[1].length - a[1].length).slice(0, 5).forEach(([dir, planes]) => {
            console.log(`Direction ${dir}: ${planes.length} planes (${(planes.length/this.aiAircraft.length*100).toFixed(1)}%)`);
        });
        
        // Make aircraft instance globally accessible for performance monitoring
        window.aircraftInstance = this.aircraft;
        
        // Create controls
        this.controls = new Controls(this.aircraft);
        
        // Create UI
        this.ui = new UI();
        
        // Create FPS counter 
        this.setupFPSCounter();
        
        // Animation variables
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.frameTime = 0;
        this.fps = 0;
        this.running = true;
        
        // Add a periodic check for NaN geometry issues
        this.lastModelCheckTime = 0;
        this.modelCheckInterval = 10000; // Check every 10 seconds
        
        // Start the animation loop
        this.animate();
    }
    
    setupFPSCounter() {
        // Find the existing UI pane and info panel
        const infoPanel = document.getElementById('info-panel');
        
        if (infoPanel) {
            // Make sure we insert the FPS counter after the score but before any other elements that might be added later
            const scoreItem = document.querySelector('#info-panel .info-item:last-child');
            
            // Create a new info item for FPS counter
            const fpsItem = document.createElement('div');
            fpsItem.className = 'info-item';
            
            const fpsLabel = document.createElement('span');
            fpsLabel.className = 'info-label';
            fpsLabel.textContent = 'FPS:';
            
            this.fpsCounter = document.createElement('span');
            this.fpsCounter.className = 'info-value';
            this.fpsCounter.id = 'fps-value';
            this.fpsCounter.textContent = '0';
            
            fpsItem.appendChild(fpsLabel);
            fpsItem.appendChild(this.fpsCounter);
            
            if (scoreItem) {
                // Insert after the score item
                scoreItem.after(fpsItem);
            } else {
                // Just append to the panel if we can't find the score item
                infoPanel.appendChild(fpsItem);
            }
        } else {
            // Fallback to floating element if info panel not found
            this.fpsCounter = document.createElement('div');
            this.fpsCounter.id = 'fps-counter';
            this.fpsCounter.style.position = 'fixed';
            this.fpsCounter.style.bottom = '20px';
            this.fpsCounter.style.left = '20px';
            this.fpsCounter.style.padding = '5px 10px';
            this.fpsCounter.style.background = 'rgba(0, 0, 0, 0.5)';
            this.fpsCounter.style.color = 'white';
            this.fpsCounter.style.fontFamily = 'monospace';
            this.fpsCounter.style.fontSize = '14px';
            this.fpsCounter.style.fontWeight = 'bold';
            this.fpsCounter.style.borderRadius = '5px';
            this.fpsCounter.style.zIndex = '1000';
            this.fpsCounter.textContent = 'FPS: 0';
            document.body.appendChild(this.fpsCounter);
        }
    }
    
    checkProjectileCollisions() {
        if (!this.aircraft.projectiles.length) return;
        
        // Hot air balloon collision detection
        const balloons = this.sceneManager.balloons ? this.sceneManager.balloons.balloons : [];
        const projectiles = this.aircraft.projectiles;
        
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const projectile = projectiles[i];
            const projectilePos = projectile.mesh.position;
            
            // Check collisions with hot air balloons - 10 points each
            for (let j = balloons.length - 1; j >= 0; j--) {
                const balloon = balloons[j];
                const balloonPos = balloon.position;
                
                // Simple distance-based collision detection (sphere vs sphere)
                const distance = projectilePos.distanceTo(balloonPos);
                if (distance < 25) { // Balloon radius is around 20
                    // Balloons don't have velocity, but we can use a small upward drift
                    const balloonVelocity = new THREE.Vector3(0, 2, 0);
                    
                    // Create hit effect at collision point, passing the balloon velocity
                    this.effects.createHitEffect(balloonPos, false, balloonVelocity);
                    
                    // Award 10 points
                    this.ui.addPoints(10);
                    
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
            
            // Check collisions with AI aircraft - 10 points each
            for (let j = this.aiAircraft.length - 1; j >= 0; j--) {
                const ai = this.aiAircraft[j];
                const aiPos = ai.position;
                
                // Simple distance-based collision detection
                const distance = projectilePos.distanceTo(aiPos);
                if (distance < 15) { // Aircraft size is smaller than balloon
                    // Create hit effect at collision point, passing the AI velocity
                    this.effects.createHitEffect(aiPos, true, ai.velocity);
                    
                    // Award 10 points
                    this.ui.addPoints(10);
                    
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
        
        // Calculate delta time and clamp to prevent large jumps
        let deltaTime = 0;
        if (this.lastFrameTime > 0) {
            deltaTime = (currentTime - this.lastFrameTime) / 1000;
            
            // Clamp deltaTime to prevent large jumps (e.g. when tab is inactive)
            if (deltaTime > 0.1) deltaTime = 0.1;
        }
        this.lastFrameTime = currentTime;
        
        // FPS calculation
        this.frameCount++;
        this.frameTime += deltaTime;
        if (this.frameTime >= 1) {
            this.fps = this.frameCount / this.frameTime;
            this.frameCount = 0;
            this.frameTime = 0;
            
            // Update the FPS counter display with the new FPS value
            if (this.fpsCounter) {
                if (this.fpsCounter.id === 'fps-counter') {
                    this.fpsCounter.textContent = `FPS: ${Math.round(this.fps)}`;
                } else {
                    this.fpsCounter.textContent = Math.round(this.fps);
                }
            }
        }
        
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
            
            // Check for and fix any NaN geometry issues
            this.checkAIModels(currentTime);
            
            // Check for collisions between projectiles and targets
            this.checkProjectileCollisions();
            
            // Update UI
            this.ui.update(this.aircraft, currentTime);
            
            // Update visual effects
            const camera = this.aircraft.getActiveCamera();
            const cameraState = this.effects.update(deltaTime, camera);
            
            // Render the scene
            this.sceneManager.render(camera);
            
            // Restore camera rotation after shake
            if (cameraState && cameraState.original) {
                this.effects.restoreCameraRotation(camera, cameraState.original);
            }
        }
        
        // Schedule the next frame
        requestAnimationFrame((time) => this.animate(time));
    }
    
    // Method to check for and fix NaN geometry issues in AI aircraft
    checkAIModels(currentTime) {
        // Only check periodically to avoid performance impact
        if (!this.lastModelCheckTime || currentTime - this.lastModelCheckTime >= this.modelCheckInterval) {
            this.lastModelCheckTime = currentTime;
            
            let modelsFixed = 0;
            const startingPosition = new THREE.Vector3(0, 500, 0);
            
            for (let i = 0; i < this.aiAircraft.length; i++) {
                const ai = this.aiAircraft[i];
                
                // Check for missing model
                if (!ai.model) {
                    console.log(`Aircraft ${i} has no model, recreating`);
                    ai.loadModel();
                    modelsFixed++;
                    continue;
                }
                
                // Check for NaN in position
                if (isNaN(ai.position.x) || isNaN(ai.position.y) || isNaN(ai.position.z)) {
                    console.log(`Fixing NaN position in aircraft ${i}`);
                    ai.position.copy(startingPosition);
                    ai.model.position.copy(startingPosition);
                    modelsFixed++;
                }
                
                // Check for NaN in model position
                if (isNaN(ai.model.position.x) || isNaN(ai.model.position.y) || isNaN(ai.model.position.z)) {
                    console.log(`Fixing NaN model position in aircraft ${i}`);
                    ai.model.position.copy(ai.position.isNaN() ? startingPosition : ai.position);
                    modelsFixed++;
                }
                
                // Check model's children for validity
                if (ai.model.children) {
                    let hasInvalidChildren = false;
                    
                    for (const child of ai.model.children) {
                        if (child.geometry && child.geometry.attributes.position) {
                            // Check for NaN in geometry positions
                            const positions = child.geometry.attributes.position.array;
                            for (let j = 0; j < positions.length; j++) {
                                if (isNaN(positions[j])) {
                                    hasInvalidChildren = true;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (hasInvalidChildren) {
                        console.log(`Aircraft ${i} has invalid geometry, recreating model`);
                        // Remove old model and create new one
                        this.sceneManager.scene.remove(ai.model);
                        ai.loadModel();
                        modelsFixed++;
                    }
                }
            }
            
            if (modelsFixed > 0) {
                console.log(`Fixed ${modelsFixed} AI aircraft with model/geometry issues`);
            }
        }
    }

    // Helper method to create a safe starting position for AI aircraft
    createSafeStartingPosition() {
        // Use smaller range than terrain bounds to avoid edge cases
        const safeRange = 6000;
        const safeAltitudeMin = 400;
        const safeAltitudeMax = 700;
        
        // Avoid creating planes too close to each other or to origin
        const minDistanceFromOrigin = 500;
        
        // Try a few times to get a good position if needed
        let x, y, z;
        let attempt = 0;
        
        do {
            // Get random coordinates
            x = (Math.random() - 0.5) * safeRange;
            z = (Math.random() - 0.5) * safeRange;
            
            // Check distance from origin
            const distanceFromOrigin = Math.sqrt(x*x + z*z);
            
            // Try up to 5 times, then just use what we have
            if (distanceFromOrigin > minDistanceFromOrigin || attempt >= 5) {
                break;
            }
            
            attempt++;
        } while (true);
        
        // Random altitude in safe range
        y = safeAltitudeMin + Math.random() * (safeAltitudeMax - safeAltitudeMin);
        
        return new THREE.Vector3(x, y, z);
    }
}

// Initialize the simulator when the page loads
window.addEventListener('load', () => {
    // Check for WebGL support
    if (!window.WebGLRenderingContext) {
        alert('Your browser does not support WebGL. Please use a modern browser to play this flight simulator.');
        return;
    }
    
    // Check for Pointer Lock API support
    if (!('pointerLockElement' in document)) {
        alert('Your browser doesn\'t support Pointer Lock API. Mouse controls may not work properly.');
    }
    
    // Create the flight simulator
    const simulator = new FlightSimulator();
    
    // Make simulator instance globally accessible for performance monitoring
    window.simulatorInstance = simulator;
    
    // Initialize pitch inversion from localStorage if available
    const invertPitchStored = localStorage.getItem('invertPitch');
    window.invertPitch = invertPitchStored ? invertPitchStored === 'true' : false;
    
    // Show mouse lock overlay
    const mouseLockOverlay = document.getElementById('mouse-lock-overlay');
    if (mouseLockOverlay) {
        mouseLockOverlay.classList.add('active');
    }
    
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
            <p>This flight simulator is designed for keyboard and mouse controls and may not work properly on mobile devices.</p>
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
                simulator.aircraft.controls.yaw = 1;
                break;
            case 'd':
                simulator.aircraft.controls.yaw = -1;
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