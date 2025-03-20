class Controls {
    constructor(aircraft) {
        this.aircraft = aircraft;
        this.keys = {};
        
        // Key state tracking
        this.setupKeyListeners();
        
        // Camera view toggle button
        document.getElementById('view-toggle').addEventListener('click', () => {
            this.aircraft.toggleCamera();
        });
    }
    
    setupKeyListeners() {
        // Key down event
        window.addEventListener('keydown', (event) => {
            this.keys[event.key.toLowerCase()] = true;
            
            // Prevent default action for control keys
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright', 'q', 'e', 'shift', 'control'].includes(event.key.toLowerCase())) {
                event.preventDefault();
            }
        });
        
        // Key up event
        window.addEventListener('keyup', (event) => {
            this.keys[event.key.toLowerCase()] = false;
        });
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
        
        // Handle pitch (W/S or Up/Down arrows)
        if (this.keys['w'] || this.keys['arrowup']) controls.pitch = -1 * gainFactor;
        if (this.keys['s'] || this.keys['arrowdown']) controls.pitch = 1 * gainFactor;
        
        // Handle yaw (A/D or Left/Right arrows)
        if (this.keys['a'] || this.keys['arrowleft']) controls.yaw = 1 * gainFactor;
        if (this.keys['d'] || this.keys['arrowright']) controls.yaw = -1 * gainFactor;
        
        // Handle roll (Q/E)
        if (this.keys['q']) controls.roll = -1 * gainFactor;
        if (this.keys['e']) controls.roll = 1 * gainFactor;
        
        // Handle throttle (Shift/Ctrl) - 40% more responsive
        if (this.keys['shift']) {
            controls.throttle += 0.014; // Increased from 0.01
            if (controls.throttle > 1) controls.throttle = 1;
        }
        if (this.keys['control']) {
            controls.throttle -= 0.014; // Increased from 0.01
            if (controls.throttle < 0) controls.throttle = 0;
        }
        
        // Update aircraft controls
        this.aircraft.updateControls(controls);
    }
}

export { Controls }; 