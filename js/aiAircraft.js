import { Aircraft } from './aircraft.js';

class AIAircraft extends Aircraft {
    static terrainSize = 10000; // Default size of terrain - 10k x 10k
    static warningDistance = 2000; // Default warning distance
    static safeTurnAngle = 0.2; // Safe angle for turning (in radians)
    
    constructor(scene, startPosition, color) {
        // Must call super before accessing 'this'
        super(scene);
        
        // Define terrain boundaries based on TerrainGenerator
        this.terrainBounds = {
            minX: -10000, // Half of groundSize from TerrainGenerator (20000)
            maxX: 10000,
            minZ: -10000,
            maxZ: 10000,
            minY: 200,  // Lowered from 400 to make planes fly lower
            maxY: 1000  // Lowered from 2000 to make planes fly lower
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
        
        // Give each plane a random initial rotation (direction)
        const randomYaw = Math.random() * Math.PI * 2; // Random direction 0-360 degrees
        this.rotation.set(0, randomYaw, 0, 'YXZ');
        
        // Add some random initial velocity in their facing direction
        const randomSpeed = 50 + Math.random() * 100;
        const forwardDir = new THREE.Vector3(0, 0, 1).applyEuler(this.rotation);
        this.velocity.copy(forwardDir.multiplyScalar(randomSpeed));
        
        // Override aircraft color if provided
        this.aircraftColor = color || 0xFF5252; // Default to red for AI aircraft
        
        // AI behavior parameters - more varied behavior
        // Set target based on current position and direction instead of just copying position
        this.targetPosition = new THREE.Vector3();
        const targetDistance = 1000 + Math.random() * 2000;
        this.targetPosition.copy(this.position).add(forwardDir.multiplyScalar(targetDistance));
        
        // Ensure target is within bounds
        const margin = 1500;
        this.targetPosition.x = Math.max(this.terrainBounds.minX + margin, 
                                 Math.min(this.terrainBounds.maxX - margin, this.targetPosition.x));
        this.targetPosition.z = Math.max(this.terrainBounds.minZ + margin, 
                                 Math.min(this.terrainBounds.maxZ - margin, this.targetPosition.z));
        this.targetPosition.y = Math.max(this.terrainBounds.minY + 200, 
                                 Math.min(this.terrainBounds.maxY - 200, this.targetPosition.y));
        
        // Shorter direction change interval (3-8 seconds instead of 5-15)
        this.changeDirectionInterval = 3 + Math.random() * 5; 
        this.lastDirectionChange = Math.random() * this.changeDirectionInterval; // Randomize first change time
        // Increased turn rate by 50% for more agile turning
        this.turnRate = 0.75 + Math.random() * 0.75;
        
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
        this.boundsReportInterval = 5000; // Exactly 5 seconds for fleet reporting
        
        // Initialize plane status 
        this.isOutOfBounds = false;
        
        // Debug properties
        this.isDebug = false; // Will be set to true for first 10 planes
        this.planeId = -1; // Will be set from outside
        this.lastDebugTime = 0;
        this.debugInterval = 15000; // Increased from 2000 to 15000 (15 seconds) to reduce spam
        this.lastResetTime = null; // Track the last time this plane was reset
    }
    
    // Completely override the parent's loadModel method with a simpler implementation
    loadModel() {
        // Create a new group for the aircraft
        if (this.model) {
            // If model already exists, remove it from the scene
            this.scene.remove(this.model);
        }
        
        // Validate position before creating model
        this.validateVectors();
        
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
        
        // Ensure position is valid before setting model position
        if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
            console.warn(`Invalid position detected during model creation, resetting position`);
            this.position.set(0, 500, 0); // Use safe default position
        }
        
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
            this.changeDirectionInterval = 3 + Math.random() * 5;
        }
    
        // Check if position or other values are NaN
        this.validateVectors();
        
        // Call updatePhysics to update acceleration and velocity
        this.updatePhysics(deltaTime);
        
        // Update position based on velocity
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        
        // Check terrain bounds and adjust position/velocity if needed
        this.checkBounds();
        
        // Steer toward the current target
        this.steerTowardTarget(deltaTime);
        
        // Check for NaN values again after all updates
        this.validateVectors();
        
        // Update the model position and rotation
        if (this.model) {
            // Update position - ensure position is valid
            if (!isNaN(this.position.x) && !isNaN(this.position.y) && !isNaN(this.position.z)) {
                this.model.position.copy(this.position);
            } else {
                // Reset position if invalid
                this.position.set(0, 500, 0);
                this.model.position.copy(this.position);
                console.warn(`Reset invalid position during update`);
            }
            
            // Update rotation - face the direction of travel
            if (this.velocity.length() > 0.1) {
                // Calculate rotation from velocity vector
                const direction = this.velocity.clone().normalize();
                
                // Only use normalized direction if it's valid
                if (!isNaN(direction.x) && !isNaN(direction.y) && !isNaN(direction.z)) {
                    // Set model rotation to match direction of travel, with banking
                    this.model.rotation.set(
                        -this.controls.pitch * 0.4, // Pitch based on controls
                        Math.atan2(direction.x, direction.z), // Yaw to face direction
                        this.controls.roll * 0.6 // Roll based on controls
                    );
                    
                    // Update aircraft rotation to match model
                    this.rotation.set(
                        -this.controls.pitch * 0.4,
                        Math.atan2(direction.x, direction.z),
                        this.controls.roll * 0.6,
                        'YXZ'
                    );
                }
            }
            
            // Validate model transform to prevent NaN
            this.validateModelTransform();
            
            // Force matrix update to ensure valid rendering
            this.model.updateMatrix();
            this.model.updateMatrixWorld(true);
        } else {
            // If model was somehow lost, recreate it
            this.loadModel();
        }
        
        // Update propellers if they exist
        if (this.propeller) {
            this.propeller.rotation.x += this.controls.throttle * 15 * deltaTime;
        }
        
        // Update last bounds report time for fleet report
        this.lastBoundsReport = performance.now();
    }
    
    // Custom physics update instead of using parent class
    updatePhysics(deltaTime) {
        // Apply simplified physics
        
        // Convert throttle to thrust - increased by 30% for faster flight
        const thrust = this.controls.throttle * 650; // Increased from 500 to 650 (30% faster)
        
        // Get forward direction
        const forwardDir = new THREE.Vector3(0, 0, 1);
        forwardDir.applyEuler(this.rotation);
        
        // Ensure forward direction is valid
        if (isNaN(forwardDir.x) || isNaN(forwardDir.y) || isNaN(forwardDir.z) || forwardDir.lengthSq() < 0.0001) {
            // Removed debug logging to reduce spam
            forwardDir.set(0, 0, 1);
        }
        
        // Apply thrust - ensure we have a minimum thrust even at zero throttle to keep planes moving
        const minThrust = 130; // Increased from 100 to 130 (30% faster)
        const effectiveThrust = Math.max(minThrust, thrust);
        
        // Set acceleration based on forward direction and thrust
        this.acceleration.set(
            forwardDir.x * effectiveThrust,
            forwardDir.y * effectiveThrust,
            forwardDir.z * effectiveThrust
        );
        
        // Apply gravity (simplified)
        this.acceleration.y -= 20;
        
        // Apply simplified drag - reduce drag coefficient to allow more movement
        const speed = this.velocity.length();
        const dragCoefficient = 0.13; // Reduced from 0.15 to 0.13 for less drag (supporting faster flight)
        const drag = dragCoefficient * speed * speed;
        
        // Only apply drag if we have a valid velocity direction
        if (speed > 0.1) {
            const dragDirection = this.velocity.clone().normalize().negate();
            if (!isNaN(dragDirection.x) && !isNaN(dragDirection.y) || !isNaN(dragDirection.z)) {
                this.acceleration.addScaledVector(dragDirection, drag);
            }
        }
        
        // Ensure acceleration is not near-zero - apply a minimum acceleration in forward direction
        if (this.acceleration.length() < 5) {
            // Add a small random jitter to prevent planes from getting stuck
            this.acceleration.add(new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            ));
        }
        
        // Update velocity
        this.velocity.addScaledVector(this.acceleration, deltaTime);
        
        // Ensure minimum velocity to keep planes moving - increased by 30%
        const minVelocity = 105; // Increased from 80 to 105 (30% faster)
        if (this.velocity.length() < minVelocity) {
            // If speed is too low, boost in the forward direction
            this.velocity.addScaledVector(forwardDir, minVelocity - this.velocity.length());
        }
        
        // Limit max speed to prevent issues - increased by 30%
        const maxSpeed = 1560; // Increased from 1200 to 1560 (30% faster)
        if (this.velocity.length() > maxSpeed) {
            this.velocity.normalize().multiplyScalar(maxSpeed);
        }
        
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
        // Flag to track if any vectors were fixed
        let fixed = false;
        
        // Setup default terrain bounds if not initialized yet
        if (!this.terrainBounds) {
            this.terrainBounds = {
                minX: -10000,
                maxX: 10000,
                minZ: -10000,
                maxZ: 10000,
                minY: 200,
                maxY: 1000
            };
        }
        
        // Fix position vector if it has NaN values
        if (!this.position || isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
            // Create a safe position within bounds but away from edges
            const safeMargin = 2000;
            const safeX = (Math.random() - 0.5) * (this.terrainBounds.maxX - this.terrainBounds.minX - 2 * safeMargin);
            const safeZ = (Math.random() - 0.5) * (this.terrainBounds.maxZ - this.terrainBounds.minZ - 2 * safeMargin);
            const safeY = 400 + Math.random() * 200; // Safe altitude
            
            if (!this.position) {
                this.position = new THREE.Vector3(safeX, safeY, safeZ);
            } else {
                this.position.set(safeX, safeY, safeZ);
            }
            
            if (this.isDebug) {
                console.warn(`[DEBUG PLANE #${this.planeId}] Fixed invalid position: ${this.position.toArray()}`);
            }
            fixed = true;
        }
        
        // Fix velocity vector if it has NaN values
        if (!this.velocity || isNaN(this.velocity.x) || isNaN(this.velocity.y) || isNaN(this.velocity.z)) {
            // Set a safe initial velocity (slight forward movement)
            if (!this.velocity) {
                this.velocity = new THREE.Vector3(0, 0, 30);
            } else {
                this.velocity.set(0, 0, 30);
            }
            
            if (this.isDebug) {
                console.warn(`[DEBUG PLANE #${this.planeId}] Fixed invalid velocity: ${this.velocity.toArray()}`);
            }
            fixed = true;
        }
        
        // Fix acceleration vector if it has NaN values
        if (!this.acceleration || isNaN(this.acceleration.x) || isNaN(this.acceleration.y) || isNaN(this.acceleration.z)) {
            // Set a safe initial acceleration (none)
            if (!this.acceleration) {
                this.acceleration = new THREE.Vector3(0, 0, 0);
            } else {
                this.acceleration.set(0, 0, 0);
            }
            
            if (this.isDebug) {
                console.warn(`[DEBUG PLANE #${this.planeId}] Fixed invalid acceleration: ${this.acceleration.toArray()}`);
            }
            fixed = true;
        }
        
        // Fix rotation if it has NaN values
        if (!this.rotation || isNaN(this.rotation.x) || isNaN(this.rotation.y) || isNaN(this.rotation.z)) {
            // Set a safe initial rotation (facing forward)
            if (!this.rotation) {
                this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
            } else {
                this.rotation.set(0, 0, 0, 'YXZ');
            }
            
            if (this.isDebug) {
                console.warn(`[DEBUG PLANE #${this.planeId}] Fixed invalid rotation: ${[this.rotation.x, this.rotation.y, this.rotation.z]}`);
            }
            fixed = true;
        }
        
        // Fix target position if it has NaN values
        if (!this.targetPosition || isNaN(this.targetPosition.x) || isNaN(this.targetPosition.y) || isNaN(this.targetPosition.z)) {
            // Set target to a point in front of the aircraft
            if (!this.targetPosition) {
                this.targetPosition = new THREE.Vector3();
            }
            
            // Use a safe value for target - 1000 units ahead in current direction
            const forward = new THREE.Vector3(0, 0, 1);
            if (this.rotation) {
                forward.applyEuler(this.rotation);
            }
            
            // Check if forward direction is valid
            if (isNaN(forward.x) || isNaN(forward.y) || isNaN(forward.z)) {
                forward.set(0, 0, 1); // Default to forward
            }
            
            // Place target 1000 units in forward direction from current position
            this.targetPosition.copy(this.position || new THREE.Vector3(0, 500, 0));
            this.targetPosition.add(forward.multiplyScalar(1000));
            
            // Ensure target is within bounds
            const margin = 1000;
            this.targetPosition.x = Math.max(this.terrainBounds.minX + margin, 
                                     Math.min(this.terrainBounds.maxX - margin, this.targetPosition.x));
            this.targetPosition.z = Math.max(this.terrainBounds.minZ + margin, 
                                     Math.min(this.terrainBounds.maxZ - margin, this.targetPosition.z));
            this.targetPosition.y = Math.max(this.terrainBounds.minY + 200, 
                                     Math.min(this.terrainBounds.maxY - 200, this.targetPosition.y));
            
            if (this.isDebug) {
                console.warn(`[DEBUG PLANE #${this.planeId}] Fixed invalid target position: ${this.targetPosition.toArray()}`);
            }
            fixed = true;
        }
        
        // Fix controls if necessary
        if (!this.controls) {
            this.controls = {
                pitch: 0,
                roll: 0,
                yaw: 0,
                throttle: 0.7  // Default throttle
            };
            fixed = true;
        } else {
            // Fix individual control values if they are NaN
            if (isNaN(this.controls.pitch)) {
                this.controls.pitch = 0;
                fixed = true;
            }
            if (isNaN(this.controls.roll)) {
                this.controls.roll = 0;
                fixed = true;
            }
            if (isNaN(this.controls.yaw)) {
                this.controls.yaw = 0;
                fixed = true;
            }
            if (isNaN(this.controls.throttle)) {
                this.controls.throttle = 0.7;
                fixed = true;
            }
        }
        
        // Fix model matrix if necessary
        if (this.model) {
            this.validateModelTransform();
        }
        
        // Fix speed if it's NaN
        if (isNaN(this.speed)) {
            this.speed = this.velocity ? this.velocity.length() : 0;
            if (isNaN(this.speed)) {
                this.speed = 50; // Safe default speed
            }
            fixed = true;
        }
        
        return fixed;
    }
    
    validateModelTransform() {
        if (!this.model) return;
        
        // Validate model position
        if (isNaN(this.model.position.x) || isNaN(this.model.position.y) || isNaN(this.model.position.z)) {
            console.warn('NaN detected in AI aircraft model position, resetting');
            // Use a safe default if the aircraft position is also invalid
            if (isNaN(this.position.x) || isNaN(this.position.y) || isNaN(this.position.z)) {
                this.position.set(0, 500, 0);
            }
            this.model.position.copy(this.position);
        }
        
        // Validate model rotation
        if (isNaN(this.model.rotation.x) || isNaN(this.model.rotation.y) || isNaN(this.model.rotation.z)) {
            console.warn('NaN detected in AI aircraft model rotation, resetting');
            // Use a safe default if the aircraft rotation is also invalid
            if (isNaN(this.rotation.x) || isNaN(this.rotation.y) || isNaN(this.rotation.z)) {
                this.rotation.set(0, 0, 0, 'YXZ');
            }
            this.model.rotation.copy(this.rotation);
        }
        
        // Ensure model's children have valid matrices
        if (this.model && this.model.children) {
            this.model.children.forEach(child => {
                // Ensure child has valid matrix
                if (child.matrixAutoUpdate) {
                    child.updateMatrix();
                }
            });
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
            this.targetPosition.y = this.terrainBounds.minY + 200; // Target higher altitude (lowered from 400)
        } else if (this.position.y > this.terrainBounds.maxY) {
            this.position.y = this.terrainBounds.maxY - 50;
            this.velocity.y = -Math.abs(this.velocity.y) * 0.8; // Bounce downward
            this.targetPosition.y = this.terrainBounds.maxY - 200; // Target lower altitude (lowered from 400)
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
            const targetY = this.terrainBounds.minY + 200 + 
                          Math.random() * (this.terrainBounds.maxY - this.terrainBounds.minY - 400);
            
            // Set target position, ensuring it's within the safe bounds
            this.targetPosition.x = Math.max(safeMinX, Math.min(safeMaxX, targetX));
            this.targetPosition.y = targetY;
            this.targetPosition.z = Math.max(safeMinZ, Math.min(safeMaxZ, targetZ));
            
            // Increase turn rate for faster correction when outside bounds
            this.turnRate = Math.min(this.turnRate * 1.5, 2.5); // Increased max turn rate from 2.0 to 2.5
        } else {
            // Normal targeting within safe bounds - add more randomness for diverse flight paths
            // Ensure X and Z coordinates are within safe bounds
            let targetX = safeMinX + Math.random() * (safeMaxX - safeMinX);
            let targetZ = safeMinZ + Math.random() * (safeMaxZ - safeMinZ);
            
            // More varied targeting with reduced center bias (only 20% chance instead of 30%)
            if (Math.random() < 0.2) {
                // 20% chance to target more toward center (reduced from 30%)
                const centerBias = 0.3 + Math.random() * 0.3; // 30-60% bias toward center (reduced from 40-80%)
                targetX = targetX * (1 - centerBias) + centerBias * 0;
                targetZ = targetZ * (1 - centerBias) + centerBias * 0;
            } else if (Math.random() < 0.4) {
                // 20% chance to pick a target in a completely random direction relative to current position
                const radius = 2000 + Math.random() * 3000; // 2000-5000 units away
                const angle = Math.random() * Math.PI * 2; // Random angle in radians
                targetX = this.position.x + Math.cos(angle) * radius;
                targetZ = this.position.z + Math.sin(angle) * radius;
                
                // Ensure we stay within the safe bounds
                targetX = Math.max(safeMinX, Math.min(safeMaxX, targetX));
                targetZ = Math.max(safeMinZ, Math.min(safeMaxZ, targetZ));
            }
            
            // Ensure Y coordinate is within valid altitude range with safe margins
            let targetY = this.terrainBounds.minY + 100 + 
                          Math.random() * (this.terrainBounds.maxY - this.terrainBounds.minY - 300);
            
            // Set the target position
            this.targetPosition.set(targetX, targetY, targetZ);
            
            // Reset turn rate to normal, but with higher base value (0.75-1.5 instead of 0.5-1.0)
            this.turnRate = 0.75 + Math.random() * 0.75;
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
            // Removed debug logging to reduce spam
            this.selectNewTarget();
            return;
        }
        
        // Now normalize safely
        directionToTarget.normalize();
        
        // Check if directionToTarget is valid (normalize can result in NaN if length is 0)
        if (isNaN(directionToTarget.x) || isNaN(directionToTarget.y) || isNaN(directionToTarget.z)) {
            // If invalid, set a default direction (forward)
            // Removed debug logging to reduce spam
            directionToTarget.set(0, 0, 1);
        }
        
        // Get current forward direction
        const forwardDir = new THREE.Vector3(0, 0, 1);
        forwardDir.applyEuler(this.rotation);
        
        // Ensure forward direction is valid
        if (isNaN(forwardDir.x) || isNaN(forwardDir.y) || isNaN(forwardDir.z)) {
            // Removed debug logging to reduce spam
            forwardDir.set(0, 0, 1);
        }
        
        // Calculate the angle between current direction and target direction
        const angle = forwardDir.angleTo(directionToTarget);
        
        // Check for NaN in angle calculation
        const safeAngle = isNaN(angle) ? 0 : angle;
        // Removed debug logging to reduce spam
        
        // Calculate the up vector in world space
        const worldUp = new THREE.Vector3(0, 1, 0);
        
        // Calculate pitch component directly from y-component difference
        const pitchComponent = directionToTarget.y - forwardDir.y;
        const safePitchComponent = isNaN(pitchComponent) ? 0 : pitchComponent;
        
        // For yaw, use a more robust approach using the flat (XZ) direction vectors
        // Project both vectors to the XZ plane to determine yaw
        const forwardXZ = new THREE.Vector3(forwardDir.x, 0, forwardDir.z).normalize();
        const targetXZ = new THREE.Vector3(directionToTarget.x, 0, directionToTarget.z).normalize();
        
        // Calculate cross product to determine turn direction
        const crossProduct = new THREE.Vector3().crossVectors(forwardXZ, targetXZ);
        
        // The sign of the y component tells us which way to turn
        let yawDirection;
        
        // Check if the crossProduct is valid and has sufficient magnitude
        if (isNaN(crossProduct.y) || Math.abs(crossProduct.y) < 0.0001) {
            // If cross product is invalid or too small, try a different approach
            // Use the angle between the XZ projections
            const angleXZ = forwardXZ.angleTo(targetXZ);
            
            // Dot product helps determine if we're turning left or right
            const dotProduct = forwardXZ.dot(targetXZ);
            
            // If dot product is close to 1, vectors are nearly aligned
            if (Math.abs(dotProduct - 1) < 0.0001) {
                yawDirection = 0; // No need to turn
            } 
            // If dot product is close to -1, we should make a 180° turn, choose direction randomly
            else if (Math.abs(dotProduct + 1) < 0.0001) {
                yawDirection = Math.random() < 0.5 ? -1 : 1;
            }
            // Use the original forward and right vectors as a fallback
            else {
                // Create a right vector and use dot product with target to determine direction
                const rightXZ = new THREE.Vector3(forwardXZ.z, 0, -forwardXZ.x);
                yawDirection = Math.sign(rightXZ.dot(targetXZ));
                
                // If still invalid, use a default value
                if (isNaN(yawDirection) || yawDirection === 0) {
                    yawDirection = 1;
                }
            }
            
            // Removed debug logging to reduce spam
        } else {
            yawDirection = Math.sign(crossProduct.y);
        }
        
        // Calculate the yaw component using the direction and angle
        const yawComponent = yawDirection * safeAngle * 0.5;
        
        // Set controls based on calculated components, scaled by turn rate
        // Use Math.max and Math.min to ensure values are within range, and default to 0 if NaN
        const newPitch = Math.max(-1, Math.min(1, safePitchComponent * this.turnRate)) || 0;
        const newYaw = Math.max(-1, Math.min(1, yawComponent * this.turnRate)) || 0;
        
        // Remove debug controls log to reduce spam
        
        this.controls.pitch = newPitch;
        this.controls.yaw = newYaw;
    }
    
    // Method to completely reset this aircraft if needed
    resetToSafeState() {
        // Debug reset calls
        if (this.isDebug) {
            console.log(`[DEBUG PLANE #${this.planeId}] Resetting to safe state`);
            
            // Track time since last reset for debug planes
            const now = performance.now();
            if (!this.lastResetTime) {
                this.lastResetTime = now;
            } else {
                const timeSinceLastReset = now - this.lastResetTime;
                if (timeSinceLastReset < 5000) { // Less than 5 seconds
                    console.log(`[DEBUG PLANE #${this.planeId}] WARNING: Reset called too frequently! Only ${(timeSinceLastReset/1000).toFixed(2)}s since last reset`);
                }
                this.lastResetTime = now;
            }
        }
        
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
            this.terrainBounds.minY + 200 + Math.random() * 300,
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
        if (!aiAircrafts || aiAircrafts.length === 0) {
            console.log("No AI aircraft found to report status!");
            return;
        }
        
        const now = performance.now();
        
        // Only check the first aircraft's report time (they'll all be in sync)
        if (aiAircrafts[0] && now - aiAircrafts[0].lastBoundsReport < aiAircrafts[0].boundsReportInterval) {
            // Only run the report after interval has elapsed
            return;
        }
        
        // Count aircraft in and out of bounds
        let inBoundsCount = 0;
        let outOfBoundsCount = 0;
        let stationaryCount = 0;
        let slowCount = 0;
        let normalCount = 0;
        let fastCount = 0;
        let movingCount = 0;
        let totalVelocity = 0;
        let minVelocity = Infinity;
        let maxVelocity = 0;
        let zeroAccelerationCount = 0;
        let totalAltitude = 0;
        let minAltitude = Infinity;
        let maxAltitude = 0;
        
        // Count NaN issues
        let nanPositionCount = 0;
        let nanVelocityCount = 0;
        let nanRotationCount = 0;
        let noModelCount = 0;
        
        // Quadrant counters
        let q1Count = 0; // +X, +Z (North East)
        let q2Count = 0; // -X, +Z (North West)
        let q3Count = 0; // -X, -Z (South West)
        let q4Count = 0; // +X, -Z (South East)
        let centerCount = 0; // Near origin
        let outOfBoundsQuadCount = 0; // Outside any quadrant
        
        // Threshold for "center" region around origin
        const centerThreshold = 500;
        
        // Speed categories
        const stationaryThreshold = 10;
        const slowThreshold = 100;
        const fastThreshold = 300;
        
        // Track planes in each quadrant for debugging
        const planesInQ1 = [];
        const planesInQ2 = [];
        const planesInQ3 = [];
        const planesInQ4 = [];
        const planesInCenter = [];
        const planesOutOfBounds = [];
        
        // Track planes with issues for debugging
        const planesWithNaNPosition = [];
        const planesWithNaNVelocity = [];
        const planesWithNaNRotation = [];
        const planesWithoutModel = [];
        
        for (let i = 0; i < aiAircrafts.length; i++) {
            const aircraft = aiAircrafts[i];
            
            // Skip undefined aircraft
            if (!aircraft) {
                console.warn(`Aircraft at index ${i} is undefined`);
                continue;
            }
            
            // Check for NaN issues
            if (!aircraft.position || isNaN(aircraft.position.x) || isNaN(aircraft.position.y) || isNaN(aircraft.position.z)) {
                nanPositionCount++;
                planesWithNaNPosition.push(i);
                continue; // Skip further processing for aircraft with bad position
            }
            
            if (!aircraft.velocity || isNaN(aircraft.velocity.x) || isNaN(aircraft.velocity.y) || isNaN(aircraft.velocity.z)) {
                nanVelocityCount++;
                planesWithNaNVelocity.push(i);
            }
            
            if (!aircraft.rotation || isNaN(aircraft.rotation.x) || isNaN(aircraft.rotation.y) || isNaN(aircraft.rotation.z)) {
                nanRotationCount++;
                planesWithNaNRotation.push(i);
            }
            
            if (!aircraft.model) {
                noModelCount++;
                planesWithoutModel.push(i);
            }
            
            // Update bounds status
            if (aircraft.isOutOfBounds) {
                outOfBoundsCount++;
                outOfBoundsQuadCount++;
                planesOutOfBounds.push(i);
            } else {
                inBoundsCount++;
                
                // Determine quadrant based on X and Z coordinates
                const x = aircraft.position.x;
                const z = aircraft.position.z;
                
                // Check if aircraft is in the "center" region near origin
                if (Math.abs(x) < centerThreshold && Math.abs(z) < centerThreshold) {
                    centerCount++;
                    planesInCenter.push(i);
                } else if (x >= 0 && z >= 0) {
                    q1Count++; // North East
                    planesInQ1.push(i);
                } else if (x < 0 && z >= 0) {
                    q2Count++; // North West
                    planesInQ2.push(i);
                } else if (x < 0 && z < 0) {
                    q3Count++; // South West
                    planesInQ3.push(i);
                } else if (x >= 0 && z < 0) {
                    q4Count++; // South East
                    planesInQ4.push(i);
                }
            }
            
            // Check velocity if valid
            if (aircraft.velocity) {
                const speed = aircraft.velocity.length();
                if (!isNaN(speed)) {
                    totalVelocity += speed;
                    minVelocity = Math.min(minVelocity, speed);
                    maxVelocity = Math.max(maxVelocity, speed);
                    
                    // Count planes by speed category
                    if (speed < stationaryThreshold) {
                        stationaryCount++;
                    } else {
                        movingCount++;
                        if (speed < slowThreshold) {
                            slowCount++;
                        } else if (speed < fastThreshold) {
                            normalCount++;
                        } else {
                            fastCount++;
                        }
                    }
                }
            }
            
            // Check altitude if position is valid
            if (aircraft.position) {
                const altitude = aircraft.position.y;
                if (!isNaN(altitude)) {
                    totalAltitude += altitude;
                    minAltitude = Math.min(minAltitude, altitude);
                    maxAltitude = Math.max(maxAltitude, altitude);
                }
            }
            
            // Check acceleration
            if (aircraft.acceleration && aircraft.acceleration.length() < 0.1) {
                zeroAccelerationCount++;
            }
            
            // Update last report time for each aircraft
            aircraft.lastBoundsReport = now;
        }
        
        // Calculate average velocity and altitude
        const avgVelocity = inBoundsCount > 0 ? totalVelocity / inBoundsCount : 0;
        const avgAltitude = inBoundsCount > 0 ? totalAltitude / inBoundsCount : 0;
        
        // Determine if there are issues that require detailed reporting
        const hasIssues = nanPositionCount > 0 || nanVelocityCount > 0 || 
                          nanRotationCount > 0 || noModelCount > 0 || 
                          outOfBoundsCount > 0;
        
        // Log the status report with enhanced formatting
        console.log(`%c======= AI AIRCRAFT FLEET STATUS (${aiAircrafts.length} total) =======`, "font-weight: bold; color: #3498db");
        
        // Display health status
        const healthColor = hasIssues ? "color: #e74c3c; font-weight: bold" : "color: #2ecc71; font-weight: bold";
        const healthStatus = hasIssues ? "ISSUES DETECTED" : "HEALTHY";
        console.log(`%cFleet Status: ${healthStatus}`, healthColor);
        
        // Basic counts
        console.log(`In bounds: ${inBoundsCount} | Out of bounds: ${outOfBoundsCount}`);
        
        // Report issues if any
        if (hasIssues) {
            console.log(`%cRendering issues found:`, "color: #e74c3c");
            if (nanPositionCount > 0) console.log(`- NaN positions: ${nanPositionCount} planes - IDs: ${planesWithNaNPosition.join(', ')}`);
            if (nanVelocityCount > 0) console.log(`- NaN velocities: ${nanVelocityCount} planes - IDs: ${planesWithNaNVelocity.join(', ')}`);
            if (nanRotationCount > 0) console.log(`- NaN rotations: ${nanRotationCount} planes - IDs: ${planesWithNaNRotation.join(', ')}`);
            if (noModelCount > 0) console.log(`- Missing models: ${noModelCount} planes - IDs: ${planesWithoutModel.join(', ')}`);
        }
        
        // Quadrant distribution
        console.log(`%cPlanes by quadrant:`, "font-weight: bold");
        console.log(`- NE (Q1, +X/+Z): ${q1Count} (${(q1Count / aiAircrafts.length * 100).toFixed(1)}%)`);
        console.log(`- NW (Q2, -X/+Z): ${q2Count} (${(q2Count / aiAircrafts.length * 100).toFixed(1)}%)`);
        console.log(`- SW (Q3, -X/-Z): ${q3Count} (${(q3Count / aiAircrafts.length * 100).toFixed(1)}%)`);
        console.log(`- SE (Q4, +X/-Z): ${q4Count} (${(q4Count / aiAircrafts.length * 100).toFixed(1)}%)`);
        console.log(`- Center: ${centerCount} (${(centerCount / aiAircrafts.length * 100).toFixed(1)}%)`);
        
        // Log detailed plane indices by quadrant if there are issues
        if (hasIssues) {
            console.log("%cDetailed quadrant breakdown (plane indices):", "font-style: italic");
            if (planesInQ1.length > 0) console.log(`- NE (Q1): ${planesInQ1.join(', ')}`);
            if (planesInQ2.length > 0) console.log(`- NW (Q2): ${planesInQ2.join(', ')}`);
            if (planesInQ3.length > 0) console.log(`- SW (Q3): ${planesInQ3.join(', ')}`);
            if (planesInQ4.length > 0) console.log(`- SE (Q4): ${planesInQ4.join(', ')}`);
            if (planesInCenter.length > 0) console.log(`- Center: ${planesInCenter.join(', ')}`);
            if (planesOutOfBounds.length > 0) console.log(`- Out of bounds: ${planesOutOfBounds.join(', ')}`);
        }
        
        // Performance stats
        console.log(`%cPerformance metrics:`, "font-weight: bold");
        console.log(`Speed categories: Stationary=${stationaryCount}, Slow=${slowCount}, Normal=${normalCount}, Fast=${fastCount}`);
        console.log(`Velocity: Avg=${avgVelocity.toFixed(1)}, Min=${minVelocity === Infinity ? 'N/A' : minVelocity.toFixed(1)}, Max=${maxVelocity.toFixed(1)}`);
        console.log(`Altitude: Avg=${avgAltitude.toFixed(1)}, Min=${minAltitude === Infinity ? 'N/A' : minAltitude.toFixed(1)}, Max=${maxAltitude.toFixed(1)}`);
        
        console.log(`%c======= END OF REPORT =======`, "font-weight: bold; color: #3498db");
    }
}

export { AIAircraft }; 