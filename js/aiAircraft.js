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
        
        // Periodic bounds reporting
        this.lastBoundsReport = 0;
        this.boundsReportInterval = 5000; // 5 seconds
        
        // Initialize plane status 
        this.isOutOfBounds = false;
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
        
        // Update direction change timer
        this.lastDirectionChange += deltaTime;
        if (this.lastDirectionChange >= this.changeDirectionInterval) {
            this.selectNewTarget();
            this.lastDirectionChange = 0;
            this.changeDirectionInterval = 5 + Math.random() * 10;
        }
    
        // Check if position or other values are NaN
        this.validateVectors();
        
        // Apply acceleration to velocity
        this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
        
        // Apply drag (air resistance)
        const drag = 0.01;
        this.velocity.multiplyScalar(1 - drag);
        
        // Limit max speed
        const maxSpeed = 300 + this.controls.throttle * 200; // Throttle affects max speed
        const currentSpeed = this.velocity.length();
        if (currentSpeed > maxSpeed) {
            this.velocity.normalize().multiplyScalar(maxSpeed);
        }
        
        // Update position based on velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Check terrain bounds and adjust position/velocity if needed
        this.checkBounds();
        
        // Steer toward the current target
        this.steerTowardTarget(deltaTime);
        
        // Update the model position and rotation
        if (this.model) {
            // Update position
            this.model.position.copy(this.position);
            
            // Update rotation - face the direction of travel
            if (this.velocity.length() > 0.1) {
                // Calculate rotation from velocity vector
                const direction = this.velocity.clone().normalize();
                
                // Set model rotation to match direction of travel, with banking
                this.model.rotation.set(
                    -this.controls.pitch * 0.4, // Pitch based on controls
                    Math.atan2(direction.x, direction.z), // Yaw to face direction
                    this.controls.roll * 0.6 // Roll based on controls
                );
            }
            
            // Validate model transform to prevent NaN
            this.validateModelTransform();
        }
        
        // Update propellers if they exist
        if (this.propeller) {
            this.propeller.rotation.x += this.controls.throttle * 15 * deltaTime;
        }
        
        // Update last report time for each aircraft
        const now = performance.now();
        if (now - this.lastBoundsReport >= this.boundsReportInterval) {
            this.lastBoundsReport = now;
            console.log(`AI Aircraft Status: ${this.isOutOfBounds ? 'Out of bounds' : 'In bounds'}`);
        }
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
        const drag = 0.5 * speed * speed;
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
        const margin = 1200; // Increased from 800 to 1200
        let needsNewTarget = false;
        
        // Force immediate position correction if aircraft is outside bounds
        if (this.position.x < this.terrainBounds.minX) {
            this.position.x = this.terrainBounds.minX + 100;
            this.velocity.x = Math.abs(this.velocity.x) * 0.8; // Stronger bounce back
            needsNewTarget = true;
        } else if (this.position.x > this.terrainBounds.maxX) {
            this.position.x = this.terrainBounds.maxX - 100;
            this.velocity.x = -Math.abs(this.velocity.x) * 0.8; // Stronger bounce back
            needsNewTarget = true;
        }
        
        if (this.position.z < this.terrainBounds.minZ) {
            this.position.z = this.terrainBounds.minZ + 100;
            this.velocity.z = Math.abs(this.velocity.z) * 0.8; // Stronger bounce back
            needsNewTarget = true;
        } else if (this.position.z > this.terrainBounds.maxZ) {
            this.position.z = this.terrainBounds.maxZ - 100;
            this.velocity.z = -Math.abs(this.velocity.z) * 0.8; // Stronger bounce back
            needsNewTarget = true;
        }
        
        // Check if aircraft is getting close to boundaries
        const distanceToMinX = this.position.x - this.terrainBounds.minX;
        const distanceToMaxX = this.terrainBounds.maxX - this.position.x;
        const distanceToMinZ = this.position.z - this.terrainBounds.minZ;
        const distanceToMaxZ = this.terrainBounds.maxZ - this.position.z;
        
        // Define warning levels for increasing urgency
        const warningLevel3 = margin; // First warning level
        const warningLevel2 = margin * 0.6; // Second warning level
        const warningLevel1 = margin * 0.3; // Most urgent level
        
        if (distanceToMinX < warningLevel3 || 
            distanceToMaxX < warningLevel3 || 
            distanceToMinZ < warningLevel3 || 
            distanceToMaxZ < warningLevel3) {
            
            // If close to boundary, turn back toward center with increasing urgency
            if (distanceToMinX < warningLevel1 || 
                distanceToMaxX < warningLevel1 || 
                distanceToMinZ < warningLevel1 || 
                distanceToMaxZ < warningLevel1) {
                
                // Level 1 warning (most urgent) - Immediate target toward center, higher turn rate
                this.targetPosition.x = 0;
                this.targetPosition.z = 0;
                this.targetPosition.y = this.position.y;
                this.turnRate = 2.0; // Maximum turn rate for urgent correction
                needsNewTarget = true;
                
            } else if (distanceToMinX < warningLevel2 || 
                      distanceToMaxX < warningLevel2 || 
                      distanceToMinZ < warningLevel2 || 
                      distanceToMaxZ < warningLevel2) {
                
                // Level 2 warning - bias target heavily toward center, increased turn rate
                this.selectNewTarget(); // Get a new target first
                
                // Apply strong bias toward center
                const centerBias = 0.8; // 80% bias toward center
                this.targetPosition.x = this.targetPosition.x * (1 - centerBias);
                this.targetPosition.z = this.targetPosition.z * (1 - centerBias);
                
                // Increase turn rate
                this.turnRate = 1.5;
                
            } else {
                // Level 3 warning - just ensure target is within safe bounds with new target
                needsNewTarget = true;
            }
        }
        
        // If needed, update target
        if (needsNewTarget) {
            this.selectNewTarget();
        }
        
        // Ensure the plane stays within the altitude constraints
        if (this.position.y < this.terrainBounds.minY) {
            this.position.y = this.terrainBounds.minY + 50;
            this.velocity.y = Math.abs(this.velocity.y) * 0.8; // Bounce upward
            this.targetPosition.y = this.terrainBounds.minY + 400; // Target higher altitude
        } else if (this.position.y > this.terrainBounds.maxY) {
            this.position.y = this.terrainBounds.maxY - 50;
            this.velocity.y = -Math.abs(this.velocity.y) * 0.8; // Bounce downward
            this.targetPosition.y = this.terrainBounds.maxY - 400; // Target lower altitude
        }
        
        // Update out of bounds status
        this.isOutOfBounds = this.position.x < this.terrainBounds.minX || this.position.x > this.terrainBounds.maxX ||
                             this.position.z < this.terrainBounds.minZ || this.position.z > this.terrainBounds.maxZ;
    }
    
    selectNewTarget() {
        // Generate a new random target within terrain bounds with larger safety margin
        const margin = 1500; // Increased from 1000 to 1500
        
        // Create target position with safe margins from boundaries
        const safeMinX = this.terrainBounds.minX + margin;
        const safeMaxX = this.terrainBounds.maxX - margin;
        const safeMinZ = this.terrainBounds.minZ + margin;
        const safeMaxZ = this.terrainBounds.maxZ - margin;
        
        // Check if aircraft is currently outside safe bounds
        const isOutsideSafeX = this.position.x < safeMinX || this.position.x > safeMaxX;
        const isOutsideSafeZ = this.position.z < safeMinZ || this.position.z > safeMaxZ;
        
        // Update out of bounds status
        this.isOutOfBounds = isOutsideSafeX || isOutsideSafeZ;
        
        // If aircraft is outside safe bounds, target directly toward center
        if (this.isOutOfBounds) {
            // Calculate vector toward center
            const centerX = 0;
            const centerZ = 0;
            
            // Target position is between current position and center, but within bounds
            const targetX = this.position.x + (centerX - this.position.x) * 0.5;
            const targetZ = this.position.z + (centerZ - this.position.z) * 0.5;
            
            // Calculate a random but safe altitude
            const targetY = this.terrainBounds.minY + 400 + 
                          Math.random() * (this.terrainBounds.maxY - this.terrainBounds.minY - 800);
            
            // Set target position, ensuring it's within the safe bounds
            this.targetPosition.x = Math.max(safeMinX, Math.min(safeMaxX, targetX));
            this.targetPosition.y = targetY;
            this.targetPosition.z = Math.max(safeMinZ, Math.min(safeMaxZ, targetZ));
            
            // Increase turn rate for faster correction when outside bounds
            this.turnRate = Math.min(this.turnRate * 1.5, 2.0);
            
            // No logging here - we'll do it in the update method
        } else {
            // Normal targeting within safe bounds
            // Ensure X and Z coordinates are within safe bounds
            let targetX = safeMinX + Math.random() * (safeMaxX - safeMinX);
            let targetZ = safeMinZ + Math.random() * (safeMaxZ - safeMinZ);
            
            // Biased target selection toward center of map
            if (Math.random() < 0.3) {
                // 30% chance to target more toward center
                const centerBias = 0.4 + Math.random() * 0.4; // 40-80% bias toward center
                targetX = targetX * (1 - centerBias) + centerBias * 0;
                targetZ = targetZ * (1 - centerBias) + centerBias * 0;
            }
            
            // Ensure Y coordinate is within valid altitude range with safe margins
            let targetY = this.terrainBounds.minY + 300 + 
                          Math.random() * (this.terrainBounds.maxY - this.terrainBounds.minY - 600);
            
            // Set the target position
            this.targetPosition.set(targetX, targetY, targetZ);
            
            // Reset turn rate to normal
            this.turnRate = 0.5 + Math.random() * 0.5;
        }
        
        // FINAL SAFETY CHECK: Ensure target is strictly within terrain bounds
        // This is an absolute guarantee that the target is valid
        this.targetPosition.x = Math.max(safeMinX, Math.min(safeMaxX, this.targetPosition.x));
        this.targetPosition.y = Math.max(this.terrainBounds.minY + 300, 
                               Math.min(this.terrainBounds.maxY - 300, this.targetPosition.y));
        this.targetPosition.z = Math.max(safeMinZ, Math.min(safeMaxZ, this.targetPosition.z));
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
        // Reset position to a guaranteed safe area (away from boundaries)
        const safeMargin = 3000; // Ensure aircraft is well within bounds
        
        // Use a radius from center for more central positioning
        const centerX = 0;
        const centerZ = 0;
        const maxRadius = Math.min(
            this.terrainBounds.maxX - safeMargin, 
            this.terrainBounds.maxZ - safeMargin
        );
        
        // Position in a random direction from center, but not too close to center either
        const minRadius = 1000; // Minimum distance from center
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        const angle = Math.random() * Math.PI * 2;
        
        // Calculate position
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        
        // Set position
        this.position.set(
            x, 
            this.terrainBounds.minY + 500 + Math.random() * 500,
            z
        );
        
        // Reset other properties
        this.rotation.set(0, 0, 0, 'YXZ');
        this.velocity.set(0, 0, 0);
        this.acceleration.set(0, 0, 0);
        
        // Reset controls
        this.controls.pitch = 0;
        this.controls.yaw = 0;
        this.controls.throttle = 0.5;
        
        // Reset target position to be closer to the new position
        this.targetPosition.copy(this.position);
        
        // Set target in general direction of center
        const targetDistance = 1000 + Math.random() * 1000;
        const targetAngle = Math.random() * Math.PI * 2; // Random direction
        
        this.targetPosition.x += Math.cos(targetAngle) * targetDistance;
        this.targetPosition.z += Math.sin(targetAngle) * targetDistance;
        this.targetPosition.y += 200;
        
        // Ensure target is also within bounds
        const safeMinX = this.terrainBounds.minX + safeMargin;
        const safeMaxX = this.terrainBounds.maxX - safeMargin;
        const safeMinZ = this.terrainBounds.minZ + safeMargin;
        const safeMaxZ = this.terrainBounds.maxZ - safeMargin;
        
        this.targetPosition.x = Math.max(safeMinX, Math.min(this.targetPosition.x, safeMaxX));
        this.targetPosition.z = Math.max(safeMinZ, Math.min(this.targetPosition.z, safeMaxZ));
        
        // Re-create model to ensure clean visual state
        this.loadModel();
    }
    
    // Add static method to report bounds status
    static reportBoundsStatus(aiAircrafts) {
        if (!aiAircrafts || aiAircrafts.length === 0) return;
        
        const now = performance.now();
        
        // Only check the first aircraft's report time (they'll all be in sync)
        if (now - aiAircrafts[0].lastBoundsReport < aiAircrafts[0].boundsReportInterval) {
            return;
        }
        
        // Count aircraft in and out of bounds
        let inBoundsCount = 0;
        let outOfBoundsCount = 0;
        
        for (const aircraft of aiAircrafts) {
            if (aircraft.isOutOfBounds) {
                outOfBoundsCount++;
            } else {
                inBoundsCount++;
            }
            
            // Update last report time for each aircraft
            aircraft.lastBoundsReport = now;
        }
        
        // Log the status report
        console.log(`AI Aircraft Status: ${inBoundsCount} in bounds, ${outOfBoundsCount} out of bounds (${(outOfBoundsCount / aiAircrafts.length * 100).toFixed(1)}% out of bounds)`);
    }
}

export { AIAircraft }; 