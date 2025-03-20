class Aircraft {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.modelLoaded = false;
        
        // Aircraft properties
        this.position = new THREE.Vector3(0, 1000, 0);
        // Use YXZ order for Euler angles to prevent gimbal lock
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.acceleration = new THREE.Vector3(0, 0, 0);
        
        // Simplified controls state
        this.controls = {
            pitch: 0,
            yaw: 0,
            throttle: 1.0
        };
        
        // Physical constants
        this.maxSpeed = 1200;
        this.minSpeed = 50;
        this.throttleAcceleration = 320;
        this.dragFactor = 0.0008;
        this.liftFactor = 0.0001;
        this.weight = 20;
        this.rotationSensitivity = {
            pitch: 1.0,
            yaw: 1.0
        };
        
        // Debug logging
        this.lastControls = { ...this.controls };
        this.lastRotation = { ...this.rotation };
        
        // Camera setup
        this.setupCameras();
        
        // Load aircraft model
        this.loadModel();
    }
    
    setupCameras() {
        // Setup third-person camera
        this.thirdPersonCamera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 20000
        );
        this.thirdPersonCamera.position.set(0, 10, -30);
        
        // Setup first-person (cockpit) camera
        this.firstPersonCamera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 20000
        );
        this.firstPersonCamera.position.set(0, 3, 0);
        
        // Default to third-person camera
        this.activeCamera = this.thirdPersonCamera;
    }
    
    loadModel() {
        // Create a temporary aircraft representation (a simple plane shape)
        const geometry = new THREE.ConeGeometry(2, 10, 4);
        geometry.rotateX(Math.PI / 2);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x4285F4,
            metalness: 0.5,
            roughness: 0.5
        });
        
        this.model = new THREE.Group();
        const fuselage = new THREE.Mesh(geometry, material);
        this.model.add(fuselage);
        
        // Add wings
        const wingGeometry = new THREE.BoxGeometry(20, 0.5, 4);
        const wingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4285F4,
            metalness: 0.5,
            roughness: 0.5
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.position.set(0, 0, 0);
        this.model.add(wings);
        
        // Add tail
        const tailGeometry = new THREE.BoxGeometry(6, 0.5, 2);
        const tailMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4285F4,
            metalness: 0.5,
            roughness: 0.5
        });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0, -5);
        this.model.add(tail);
        
        // Add vertical stabilizer
        const stabilizerGeometry = new THREE.BoxGeometry(0.5, 3, 2);
        const stabilizerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4285F4,
            metalness: 0.5,
            roughness: 0.5
        });
        const stabilizer = new THREE.Mesh(stabilizerGeometry, stabilizerMaterial);
        stabilizer.position.set(0, 1.5, -5);
        this.model.add(stabilizer);
        
        // Add propeller
        const propellerGeometry = new THREE.BoxGeometry(0.5, 4, 0.5);
        const propellerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        this.propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        this.propeller.position.set(0, 0, 5);
        this.model.add(this.propeller);
        
        // Position the model and add to scene
        this.model.position.copy(this.position);
        this.model.rotation.copy(this.rotation);
        this.model.castShadow = true;
        this.model.receiveShadow = true;
        
        this.scene.add(this.model);
        this.modelLoaded = true;
    }
    
    update(deltaTime) {
        // Update propeller rotation based on throttle
        if (this.propeller) {
            this.propeller.rotation.z += this.controls.throttle * 20 * deltaTime;
        }
        
        // Calculate forces
        this.calculatePhysics(deltaTime);
        
        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // Prevent going below ground
        if (this.position.y < 1) {
            this.position.y = 1;
            this.velocity.y = 0;
            this.velocity.x *= 0.95;
            this.velocity.z *= 0.95;
        }
        
        // Update model position and rotation
        if (this.modelLoaded) {
            this.model.position.copy(this.position);
            
            // Create a temporary rotation object to store changes
            const rotationChange = new THREE.Euler(0, 0, 0, 'YXZ');
            
            // Apply yaw first (around Y axis)
            rotationChange.y = this.controls.yaw * this.rotationSensitivity.yaw * deltaTime;
            
            // Then apply pitch (around X axis)
            rotationChange.x = this.controls.pitch * this.rotationSensitivity.pitch * deltaTime;
            
            // Apply the rotation changes
            this.rotation.x += rotationChange.x;
            this.rotation.y += rotationChange.y;
            
            // Update model rotation
            this.model.rotation.copy(this.rotation);
        }
        
        // Update cameras
        this.updateCameras();
    }
    
    calculatePhysics(deltaTime) {
        // Convert throttle (0-1) to thrust force
        const thrust = this.controls.throttle * this.throttleAcceleration;
        
        // Get the forward direction based on aircraft's rotation
        const forwardDir = new THREE.Vector3(0, 0, 1);
        forwardDir.applyEuler(this.rotation);
        
        // Apply thrust in the forward direction
        this.acceleration.x = forwardDir.x * thrust;
        this.acceleration.y = forwardDir.y * thrust;
        this.acceleration.z = forwardDir.z * thrust;
        
        // Calculate current speed in km/h (for display purposes)
        const speed = this.velocity.length() * 3.6; // Convert m/s to km/h
        
        // Calculate drag (air resistance)
        const drag = this.velocity.clone().normalize().multiplyScalar(-this.dragFactor * speed * speed);
        this.acceleration.add(drag);
        
        // Calculate lift (depends on speed and angle of attack)
        const liftDirection = new THREE.Vector3(0, 1, 0);
        liftDirection.applyEuler(this.rotation);
        const lift = liftDirection.multiplyScalar(this.liftFactor * speed * speed);
        this.acceleration.add(lift);
        
        // Apply gravity
        this.acceleration.y -= this.weight;
        
        // Update velocity based on acceleration
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.velocity.z += this.acceleration.z * deltaTime;
        
        // Limit maximum speed
        if (speed > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed / 3.6); // Convert km/h back to m/s
        }
        
        // Update UI information
        document.getElementById('altitude').textContent = Math.round(this.position.y);
        document.getElementById('speed').textContent = Math.round(speed);
        document.getElementById('throttle').textContent = Math.round(this.controls.throttle * 100);
    }
    
    updateCameras() {
        if (!this.modelLoaded) return;
        
        // Calculate the camera offset based on aircraft rotation
        const thirdPersonOffset = new THREE.Vector3(0, 10, -30);
        thirdPersonOffset.applyEuler(this.rotation);
        
        // Position third-person camera behind the aircraft
        this.thirdPersonCamera.position.copy(this.position).add(thirdPersonOffset);
        this.thirdPersonCamera.lookAt(this.position);
        
        // Add some lag and smoothing to the camera for more natural following
        const lookAtPos = this.position.clone();
        const forwardDir = new THREE.Vector3(0, 0, 20);
        forwardDir.applyEuler(this.rotation);
        lookAtPos.add(forwardDir);
        this.thirdPersonCamera.lookAt(lookAtPos);
        
        // Update first-person camera
        const firstPersonOffset = new THREE.Vector3(0, 3, 0);
        firstPersonOffset.applyEuler(this.rotation);
        this.firstPersonCamera.position.copy(this.position).add(firstPersonOffset);
        
        // Make first-person camera look in the direction of travel
        const target = this.position.clone();
        const fpForwardDir = new THREE.Vector3(0, 0, 10);
        fpForwardDir.applyEuler(this.rotation);
        target.add(fpForwardDir);
        this.firstPersonCamera.lookAt(target);
    }
    
    toggleCamera() {
        this.activeCamera = (this.activeCamera === this.thirdPersonCamera) ? 
            this.firstPersonCamera : this.thirdPersonCamera;
    }
    
    getActiveCamera() {
        return this.activeCamera;
    }
    
    updateControls(controls) {
        this.controls = { ...this.controls, ...controls };
    }
} 