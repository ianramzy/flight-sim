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
            if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'control'].includes(event.key.toLowerCase())) {
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
        
        // Handle pitch (W/S)
        if (this.keys['w']) controls.pitch = -1;
        if (this.keys['s']) controls.pitch = 1;
        
        // Handle yaw (A/D)
        if (this.keys['a']) controls.yaw = 1;
        if (this.keys['d']) controls.yaw = -1;
        
        // Handle roll (Q/E)
        if (this.keys['q']) controls.roll = -1;
        if (this.keys['e']) controls.roll = 1;
        
        // Handle throttle (Shift/Ctrl)
        if (this.keys['shift']) {
            controls.throttle += 0.01;
            if (controls.throttle > 1) controls.throttle = 1;
        }
        if (this.keys['control']) {
            controls.throttle -= 0.01;
            if (controls.throttle < 0) controls.throttle = 0;
        }
        
        // Update aircraft controls
        this.aircraft.updateControls(controls);
    }
} 