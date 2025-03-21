class Controls {
    constructor(aircraft) {
        this.aircraft = aircraft;
        this.keys = {};
        this.isShooting = false;
        this.lastShotTime = 0;
        
        // Mouse control variables
        this.mouseEnabled = false;
        this.mouseSensitivity = 0.004; // Doubled from 0.002
        this.mouseX = 0;
        this.mouseY = 0;
        this.mousePitch = 0;
        this.mouseYaw = 0;
        this.mouseMaxMovement = 10; // Maximum movement to record for smoothing
        
        // Key state tracking
        this.setupKeyListeners();
        
        // Setup mouse controls but don't activate by default
        this.setupMouseControls();
        
        // Camera view toggle button
        document.getElementById('view-toggle').addEventListener('click', () => {
            this.aircraft.toggleCamera();
        });
    }
    
    setupKeyListeners() {
        // Key down event
        window.addEventListener('keydown', (event) => {
            this.keys[event.key.toLowerCase()] = true;
            
            // Set shooting flag when Space is pressed
            if (event.key === ' ') {
                this.isShooting = true;
            }
            
            // ESC key disables mouse lock
            if (event.key === 'Escape') {
                this.disableMouseControls();
            }
            
            // Prevent default action for control keys
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'z', 'x', ' '].includes(event.key.toLowerCase())) {
                event.preventDefault();
            }
        });
        
        // Key up event
        window.addEventListener('keyup', (event) => {
            this.keys[event.key.toLowerCase()] = false;
            
            // Clear shooting flag when Space is released
            if (event.key === ' ') {
                this.isShooting = false;
            }
        });
    }
    
    setupMouseControls() {
        // Get the canvas element (first canvas in the document)
        this.canvas = document.querySelector('canvas');
        
        if (!this.canvas) {
            console.error('No canvas element found for mouse controls');
            return;
        }
        
        // Get mouse lock overlay - no longer needed, but keep reference to avoid errors
        this.mouseLockOverlay = document.getElementById('mouse-lock-overlay');
        this.mouseControlMessage = document.getElementById('mouse-control-message');
        
        // Setup pointer lock event listeners
        document.addEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
        document.addEventListener('pointerlockerror', this.handlePointerLockError.bind(this));
        
        // Mouse movement for pitch and yaw
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        
        // Enable mouse controls automatically when game starts
        window.addEventListener('load', () => {
            // Small delay to ensure all elements are loaded
            setTimeout(() => {
                this.enableMouseControls();
            }, 1000);
        });
        
        // Also enable on canvas click as fallback
        this.canvas.addEventListener('click', () => {
            this.enableMouseControls();
        });
    }
    
    handlePointerLockChange() {
        // Check if we have pointer lock
        this.mouseEnabled = document.pointerLockElement === this.canvas;
        
        if (this.mouseEnabled) {
            // Mouse is locked
            if (this.mouseLockOverlay) {
                this.mouseLockOverlay.classList.remove('active');
            }
            if (this.mouseControlMessage) {
                this.mouseControlMessage.classList.add('visible');
                
                // Hide the message after 3 seconds
                setTimeout(() => {
                    this.mouseControlMessage.classList.remove('visible');
                }, 3000);
            }
            
            // Close settings panel if open
            const settingsPanel = document.getElementById('settings-panel');
            if (settingsPanel && settingsPanel.style.display === 'flex') {
                settingsPanel.style.display = 'none';
                // Update the settings toggle state in UIControls if available
                if (window.simulatorInstance && window.simulatorInstance.ui && 
                    window.simulatorInstance.ui.uiControls) {
                    window.simulatorInstance.ui.uiControls.settingsOpen = false;
                }
            }
        } else {
            // Mouse lock is disabled
            if (this.mouseLockOverlay) {
                this.mouseLockOverlay.classList.add('active');
            }
            if (this.mouseControlMessage) {
                this.mouseControlMessage.classList.remove('visible');
            }
            
            // Reset mouse control values
            this.mousePitch = 0;
            this.mouseYaw = 0;
        }
    }
    
    handlePointerLockError() {
        console.error('Error getting pointer lock');
        this.mouseEnabled = false;
        if (this.mouseLockOverlay) {
            this.mouseLockOverlay.classList.add('active');
        }
    }
    
    handleMouseMove(event) {
        if (!this.mouseEnabled) return;
        
        // Get mouse movement
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        // Check if pitch inversion is enabled
        const invertPitch = window.invertPitch || false;
        const pitchDirection = invertPitch ? -1 : 1;
        
        // Update yaw (horizontal) and pitch (vertical) based on mouse movement
        // Clamp the values to prevent extreme movements
        this.mouseYaw = -Math.max(-this.mouseMaxMovement, Math.min(this.mouseMaxMovement, movementX * this.mouseSensitivity));
        this.mousePitch = pitchDirection * Math.max(-this.mouseMaxMovement, Math.min(this.mouseMaxMovement, movementY * this.mouseSensitivity));
    }
    
    enableMouseControls() {
        if (!this.mouseEnabled && this.canvas) {
            this.canvas.requestPointerLock();
        }
    }
    
    disableMouseControls() {
        if (this.mouseEnabled) {
            document.exitPointerLock();
        }
    }
    
    update() {
        const controls = {
            pitch: 0,
            yaw: 0,
            roll: 0,
            throttle: this.aircraft.controls.throttle
        };
        
        // Control gain factor (increased by 40%)
        const gainFactor = 1.4;
        
        // Check if pitch inversion is enabled
        const invertPitch = window.invertPitch || false;
        
        // Handle pitch (W/S or Up/Down arrows)
        // When inverted, W/Up is positive pitch (pull up) and S/Down is negative pitch (push down)
        if (this.keys['w'] || this.keys['arrowup']) {
            controls.pitch = invertPitch ? 1 * gainFactor : -1 * gainFactor;
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            controls.pitch = invertPitch ? -1 * gainFactor : 1 * gainFactor;
        }
        
        // Add mouse pitch control if enabled
        if (this.mouseEnabled) {
            controls.pitch += this.mousePitch * 15; // Increased 3x from 5 to 15
        }
        
        // Handle yaw (A/D or Left/Right arrows)
        if (this.keys['a'] || this.keys['arrowleft']) controls.yaw = 1 * gainFactor;
        if (this.keys['d'] || this.keys['arrowright']) controls.yaw = -1 * gainFactor;
        
        // Add mouse yaw control if enabled
        if (this.mouseEnabled) {
            controls.yaw += this.mouseYaw * 15; // Increased 3x from 5 to 15
        }
        
        // Roll controls removed (Q/E no longer control roll)
        
        // Handle throttle (X/Z) - X increases, Z decreases (swapped from previous Z/X)
        if (this.keys['x']) {
            controls.throttle += 0.025; // Faster throttle increase
            if (controls.throttle > 2.5) controls.throttle = 2.5; // Allow up to 250% throttle
        }
        if (this.keys['z']) {
            controls.throttle -= 0.025; // Faster throttle decrease
            if (controls.throttle < 0) controls.throttle = 0;
        }
        
        // Handle continuous shooting if Space is held down
        if (this.isShooting) {
            // We'll let the aircraft handle the shooting cooldown
            this.aircraft.shoot();
        }
        
        // Gradually reduce mouse movement values (so aircraft returns to neutral)
        this.mousePitch *= 0.9;
        this.mouseYaw *= 0.9;
        
        // Update aircraft controls
        this.aircraft.updateControls(controls);
    }
}

export { Controls }; 