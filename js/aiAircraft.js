import { Aircraft } from './aircraft.js';

class AIAircraft extends Aircraft {
    constructor(scene, startPosition, color) {
        super(scene);
        
        // Define terrain boundaries based on TerrainGenerator
        this.terrainBounds = {
            minX: -10000, // Half of groundSize from TerrainGenerator (20000)
            maxX: 10000,
            minZ: -10000,
            maxZ: 10000,
            minY: 400,  // Minimum altitude as requested
            maxY: 2000  // Maximum altitude as requested
        };
        
        // Override starting position
        if (startPosition) {
            this.position.copy(startPosition);
        } else {
            // Random starting position within terrain bounds
            this.position.set(
                (Math.random() - 0.5) * (this.terrainBounds.maxX - this.terrainBounds.minX),
                this.terrainBounds.minY + Math.random() * (this.terrainBounds.maxY - this.terrainBounds.minY),
                (Math.random() - 0.5) * (this.terrainBounds.maxZ - this.terrainBounds.minZ)
            );
        }
        
        // Override aircraft color if provided
        this.aircraftColor = color || 0xFF5252; // Default to red for AI aircraft
        
        // AI behavior parameters
        this.targetPosition = new THREE.Vector3().copy(this.position);
        this.changeDirectionInterval = 5 + Math.random() * 10; // Random interval between 5-15 seconds
        this.lastDirectionChange = 0;
        this.turnRate = 0.5 + Math.random() * 0.5; // Random turn rate
        
        // Override cameras - AI aircraft don't need cameras
        this.thirdPersonCamera = null;
        this.firstPersonCamera = null;
        this.activeCamera = null;
        
        // Immediately load model with our custom implementation
        this.loadModel();
        
        // Force additional properties required by parent class
        this.modelLoaded = true;
        this.propeller = null; // We'll create this in loadModel
    }
    
    // Completely override the parent's loadModel method with a simpler implementation
    loadModel() {
        // Create a new group for the aircraft
        if (this.model) {
            // If model already exists, remove it from the scene
            this.scene.remove(this.model);
        }
        
        this.model = new THREE.Group();
        
        // Create a simple aircraft shape using a single box for the fuselage
        const fuselageGeometry = new THREE.BoxGeometry(4, 2, 10);
        const material = new THREE.MeshStandardMaterial({ 
            color: this.aircraftColor,
            metalness: 0.3,
            roughness: 0.7
        });
        
        const fuselage = new THREE.Mesh(fuselageGeometry, material);
        this.model.add(fuselage);
        
        // Add a simple wings (single piece)
        const wingsGeometry = new THREE.BoxGeometry(16, 0.5, 3);
        const wings = new THREE.Mesh(wingsGeometry, material);
        wings.position.y = 0.5;
        this.model.add(wings);
        
        // Add a simple tail
        const tailGeometry = new THREE.BoxGeometry(6, 3, 1);
        const tail = new THREE.Mesh(tailGeometry, material);
        tail.position.z = -5;
        tail.position.y = 1;
        this.model.add(tail);
        
        // Simple propeller
        const propellerGeometry = new THREE.BoxGeometry(1, 5, 0.5);
        const propellerMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });
        this.propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        this.propeller.position.z = 5;
        this.model.add(this.propeller);
        
        // Set initial model position and rotation
        this.model.position.copy(this.position);
        this.model.rotation.copy(this.rotation);
        
        // Add model to scene
        this.scene.add(this.model);
        this.modelLoaded = true;
    }
    
    // Override updateCameras (AI planes don't have cameras)
    updateCameras() {
        // Intentionally left empty - AI aircraft don't need cameras
    }
    
    // Override getActiveCamera to return null so parent class update doesn't fail
    getActiveCamera() {
        return null;
    }
    
    // Override update with AI behavior
    update(deltaTime) {
        // First update our AI behavior
        // Set throttle to a constant value
        this.controls.throttle = 0.7;
        
        // Check if aircraft is out of bounds
        this.checkBounds();
        
        // Check if it's time to change direction
        this.lastDirectionChange += deltaTime;
        if (this.lastDirectionChange >= this.changeDirectionInterval) {
            this.selectNewTarget();
            this.lastDirectionChange = 0;
            this.changeDirectionInterval = 5 + Math.random() * 10;
        }
        
        // Steer toward target
        this.steerTowardTarget(deltaTime);
        
        // Update physics ourselves instead of calling super.update
        this.updatePhysics(deltaTime);
        
        // Update model position and rotation
        this.updateModel(deltaTime);
    }
    
    // Custom physics update instead of using parent class
    updatePhysics(deltaTime) {
        // Apply simplified physics
        
        // Convert throttle to thrust
        const thrust = this.controls.throttle * 320;
        
        // Get forward direction
        const forwardDir = new THREE.Vector3(0, 0, 1);
        forwardDir.applyEuler(this.rotation);
        
        // Apply thrust
        this.acceleration = new THREE.Vector3(
            forwardDir.x * thrust,
            forwardDir.y * thrust,
            forwardDir.z * thrust
        );
        
        // Apply gravity (simplified)
        this.acceleration.y -= 20;
        
        // Apply simplified drag
        const speed = this.velocity.length();
        const drag = 0.01 * speed * speed;
        const dragDirection = this.velocity.clone().normalize().negate();
        this.acceleration.addScaledVector(dragDirection, drag);
        
        // Update velocity
        this.velocity.addScaledVector(this.acceleration, deltaTime);
        
        // Limit max speed to prevent issues
        const maxSpeed = 800;
        if (this.velocity.length() > maxSpeed) {
            this.velocity.normalize().multiplyScalar(maxSpeed);
        }
        
        // Update position
        this.position.addScaledVector(this.velocity, deltaTime);
        
        // Validate vectors to prevent NaN
        this.validateVectors();
    }
    
    // Update model position and rotation
    updateModel(deltaTime) {
        if (!this.model) return;
        
        // Update position
        this.model.position.copy(this.position);
        
        // Apply rotation changes
        this.rotation.x += this.controls.pitch * this.turnRate * deltaTime;
        this.rotation.y += this.controls.yaw * this.turnRate * deltaTime;
        
        // Update model rotation
        this.model.rotation.copy(this.rotation);
        
        // Rotate propeller
        if (this.propeller) {
            this.propeller.rotation.x += this.controls.throttle * 15 * deltaTime;
        }
        
        // Validate model transforms
        this.validateModelTransform();
    }
    
    validateVectors() {
        // Prevent NaN values in position
        if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
            console.warn('NaN detected in AI aircraft position, resetting');
            this.position.set(
                (Math.random() - 0.5) * (this.terrainBounds.maxX - this.terrainBounds.minX - 2000) + 1000,
                this.terrainBounds.minY + 500,
                (Math.random() - 0.5) * (this.terrainBounds.maxZ - this.terrainBounds.minZ - 2000) + 1000
            );
        }
        
        // Prevent NaN values in velocity
        if (isNaN(this.velocity.x) || isNaN(this.velocity.y) || isNaN(this.velocity.z)) {
            console.warn('NaN detected in AI aircraft velocity, resetting');
            this.velocity.set(0, 0, 0);
        }
        
        // Prevent NaN values in rotation
        if (isNaN(this.rotation.x) || isNaN(this.rotation.y) || isNaN(this.rotation.z)) {
            console.warn('NaN detected in AI aircraft rotation, resetting');
            this.rotation.set(0, 0, 0, 'YXZ');
        }
        
        // Prevent NaN values in target position
        if (isNaN(this.targetPosition.x) || isNaN(this.targetPosition.y) || isNaN(this.targetPosition.z)) {
            console.warn('NaN detected in AI aircraft target position, resetting');
            this.targetPosition.copy(this.position);
            this.targetPosition.y += 100; // Set a slightly higher target to encourage climbing
        }
    }
    
    validateModelTransform() {
        if (!this.model) return;
        
        // Validate model position
        if (isNaN(this.model.position.x) || isNaN(this.model.position.y) || isNaN(this.model.position.z)) {
            console.warn('NaN detected in AI aircraft model position, resetting');
            this.model.position.copy(this.position);
        }
        
        // Validate model rotation
        if (isNaN(this.model.rotation.x) || isNaN(this.model.rotation.y) || isNaN(this.model.rotation.z)) {
            console.warn('NaN detected in AI aircraft model rotation, resetting');
            this.model.rotation.copy(this.rotation);
        }
    }
    
    checkBounds() {
        // Check if aircraft is going to leave terrain bounds
        const margin = 500; // Turn margin before reaching the boundary
        
        // Check if aircraft is getting close to boundaries
        if (this.position.x < this.terrainBounds.minX + margin || 
            this.position.x > this.terrainBounds.maxX - margin || 
            this.position.z < this.terrainBounds.minZ + margin || 
            this.position.z > this.terrainBounds.maxZ - margin) {
            // If close to boundary, turn back toward center
            this.selectNewTarget();
        }
        
        // Ensure the plane stays within the altitude constraints
        if (this.position.y < this.terrainBounds.minY) {
            this.position.y = this.terrainBounds.minY;
            this.velocity.y = Math.max(0, this.velocity.y); // Prevent downward velocity
        } else if (this.position.y > this.terrainBounds.maxY) {
            this.position.y = this.terrainBounds.maxY;
            this.velocity.y = Math.min(0, this.velocity.y); // Prevent upward velocity
        }
    }
    
    selectNewTarget() {
        // Generate a new random target within terrain bounds
        // Use a margin to keep aircraft away from the edges
        const margin = 1000;
        
        this.targetPosition.set(
            (Math.random() - 0.5) * (this.terrainBounds.maxX - this.terrainBounds.minX - 2 * margin) + margin,
            this.terrainBounds.minY + Math.random() * (this.terrainBounds.maxY - this.terrainBounds.minY),
            (Math.random() - 0.5) * (this.terrainBounds.maxZ - this.terrainBounds.minZ - 2 * margin) + margin
        );
        
        // If the aircraft is close to a boundary, make it turn toward the center
        if (this.position.x < this.terrainBounds.minX + margin) {
            this.targetPosition.x = this.position.x + margin * 2;
        } else if (this.position.x > this.terrainBounds.maxX - margin) {
            this.targetPosition.x = this.position.x - margin * 2;
        }
        
        if (this.position.z < this.terrainBounds.minZ + margin) {
            this.targetPosition.z = this.position.z + margin * 2;
        } else if (this.position.z > this.terrainBounds.maxZ - margin) {
            this.targetPosition.z = this.position.z - margin * 2;
        }
        
        // If too low or too high, adjust target altitude
        if (this.position.y < this.terrainBounds.minY + 100) {
            this.targetPosition.y = this.terrainBounds.minY + 300; // Target higher altitude
        } else if (this.position.y > this.terrainBounds.maxY - 100) {
            this.targetPosition.y = this.terrainBounds.maxY - 300; // Target lower altitude
        }
    }
    
    steerTowardTarget(deltaTime) {
        if (!this.model) return;
        
        // Calculate direction to target
        const directionToTarget = new THREE.Vector3().subVectors(this.targetPosition, this.position);
        
        // Check if the direction vector is valid before normalizing
        if (directionToTarget.lengthSq() < 0.0001) {
            // Target is too close, select a new one
            this.selectNewTarget();
            return;
        }
        
        // Now normalize safely
        directionToTarget.normalize();
        
        // Check if directionToTarget is valid (normalize can result in NaN if length is 0)
        if (isNaN(directionToTarget.x) || isNaN(directionToTarget.y) || isNaN(directionToTarget.z)) {
            // If invalid, set a default direction (forward)
            directionToTarget.set(0, 0, 1);
        }
        
        // Get current forward direction
        const forwardDir = new THREE.Vector3(0, 0, 1);
        forwardDir.applyEuler(this.rotation);
        
        // Ensure forward direction is valid
        if (isNaN(forwardDir.x) || isNaN(forwardDir.y) || isNaN(forwardDir.z)) {
            forwardDir.set(0, 0, 1);
        }
        
        // Calculate the angle between current direction and target direction
        const angle = forwardDir.angleTo(directionToTarget);
        
        // Check for NaN in angle calculation
        const safeAngle = isNaN(angle) ? 0 : angle;
        
        // Calculate the up vector in world space
        const worldUp = new THREE.Vector3(0, 1, 0);
        
        // Calculate the right vector
        const rightDir = new THREE.Vector3().crossVectors(forwardDir, worldUp).normalize();
        
        // Check if rightDir is valid
        if (isNaN(rightDir.x) || isNaN(rightDir.y) || isNaN(rightDir.z) || rightDir.lengthSq() < 0.0001) {
            rightDir.set(1, 0, 0); // Default to right direction
        }
        
        // Calculate pitch and yaw components
        const pitchComponent = directionToTarget.y - forwardDir.y;
        
        // Check for NaN in pitch calculation
        const safePitchComponent = isNaN(pitchComponent) ? 0 : pitchComponent;
        
        // Calculate yaw using the right vector to determine direction
        let yawDirection = Math.sign(rightDir.dot(directionToTarget));
        
        // If yaw direction is NaN or 0, use a default
        if (isNaN(yawDirection) || yawDirection === 0) {
            yawDirection = 1;
        }
        
        const yawComponent = yawDirection * safeAngle * 0.5;
        
        // Set controls based on calculated components, scaled by turn rate
        // Use Math.max and Math.min to ensure values are within range, and default to 0 if NaN
        this.controls.pitch = Math.max(-1, Math.min(1, safePitchComponent * this.turnRate)) || 0;
        this.controls.yaw = Math.max(-1, Math.min(1, yawComponent * this.turnRate)) || 0;
    }
    
    // Method to completely reset this aircraft if needed
    resetToSafeState() {
        // Reset position, rotation, and velocity to safe values
        this.position.set(
            (Math.random() - 0.5) * (this.terrainBounds.maxX - this.terrainBounds.minX - 2000) + 1000,
            this.terrainBounds.minY + 500,
            (Math.random() - 0.5) * (this.terrainBounds.maxZ - this.terrainBounds.minZ - 2000) + 1000
        );
        
        this.rotation.set(0, 0, 0, 'YXZ');
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        
        // Reset controls
        this.controls.pitch = 0;
        this.controls.yaw = 0;
        this.controls.throttle = 0.5;
        
        // Reset target position
        this.targetPosition.copy(this.position);
        this.targetPosition.x += 1000 * (Math.random() - 0.5);
        this.targetPosition.z += 1000 * (Math.random() - 0.5);
        this.targetPosition.y += 100;
        
        // Re-create model
        this.loadModel();
    }
}

export { AIAircraft }; 