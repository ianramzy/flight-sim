class Aircraft {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.modelLoaded = false;
        
        // Aircraft properties
        this.position = new THREE.Vector3(0, 500, 0);
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
        
        // Shooting mechanics
        this.projectiles = [];
        this.lastShotTime = 0;
        this.shootingCooldown = 42; // Doubled fire rate from 83ms to 42ms
    }
    
    setupCameras() {
        // Setup third-person camera
        this.thirdPersonCamera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 40000
        );
        this.thirdPersonCamera.position.set(0, 10, -30);
        
        // Setup first-person (cockpit) camera
        this.firstPersonCamera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 40000
        );
        this.firstPersonCamera.position.set(0, 3, 0);
        
        // Default to third-person camera
        this.activeCamera = this.thirdPersonCamera;
    }
    
    loadModel() {
        // Create a cooler aircraft representation
        this.model = new THREE.Group();
        
        // Create fuselage (main body) - sleeker and more aerodynamic
        const fuselageGeometry = new THREE.CylinderGeometry(1.5, 1, 12, 12);
        fuselageGeometry.rotateX(Math.PI / 2);
        const fuselageMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2C3539, // Dark gunmetal color
            metalness: 0.8,
            roughness: 0.2
        });
        const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
        this.model.add(fuselage);
        
        // Create cockpit - glass canopy
        const cockpitGeometry = new THREE.SphereGeometry(1.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        cockpitGeometry.scale(1, 0.6, 1.5);
        cockpitGeometry.rotateX(Math.PI);
        cockpitGeometry.translate(0, 0, -2);
        const cockpitMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x87CEEB, // Sky blue
            transparent: true,
            opacity: 0.7,
            metalness: 0.9,
            roughness: 0.1
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 1, 0);
        this.model.add(cockpit);
        
        // Create a group for the wings so they can be rotated independently
        this.wingsGroup = new THREE.Group();
        this.model.add(this.wingsGroup);
        
        // Add wings - sleeker swept-back design
        const wingGeometry = new THREE.BoxGeometry(22, 0.3, 4);
        // Modify wing vertices to make them swept-back
        const wingPositions = wingGeometry.attributes.position;
        for (let i = 0; i < wingPositions.count; i++) {
            const x = wingPositions.getX(i);
            const z = wingPositions.getZ(i);
            // Apply sweep-back effect (move back vertices backward)
            if (x < 0) {
                wingPositions.setZ(i, z - 3);
            } else {
                wingPositions.setZ(i, z - 3);
            }
            // Add slight dihedral (upward angle)
            if (Math.abs(x) > 5) {
                wingPositions.setY(i, wingPositions.getY(i) + Math.abs(x) * 0.05);
            }
        }
        
        const wingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3D85C6, // Blue
            metalness: 0.7,
            roughness: 0.3
        });
        const wings = new THREE.Mesh(wingGeometry, wingMaterial);
        wings.position.set(0, 0, 0);
        this.wingsGroup.add(wings);
        
        // Add wingtips - vertical stabilizers at the ends of wings
        const wingtipGeometry = new THREE.BoxGeometry(0.5, 1.2, 2);
        const wingtipMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xE06666, // Red accent
            metalness: 0.7,
            roughness: 0.3
        });
        
        // Left wingtip
        const leftWingtip = new THREE.Mesh(wingtipGeometry, wingtipMaterial);
        leftWingtip.position.set(-11, 0.5, -2);
        this.wingsGroup.add(leftWingtip);
        
        // Right wingtip
        const rightWingtip = new THREE.Mesh(wingtipGeometry, wingtipMaterial);
        rightWingtip.position.set(11, 0.5, -2);
        this.wingsGroup.add(rightWingtip);
        
        // Add guns under the wings
        const gunBarrelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
        const gunHousingGeometry = new THREE.BoxGeometry(0.8, 0.8, 1.4);
        const gunMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111, // Almost black
            metalness: 0.9,
            roughness: 0.3
        });
        
        // Centered gun
        this.centerGun = new THREE.Group();
        const gunBarrel = new THREE.Mesh(gunBarrelGeometry, gunMaterial);
        gunBarrel.rotation.x = Math.PI / 2;
        gunBarrel.position.z = 1.2;
        const gunHousing = new THREE.Mesh(gunHousingGeometry, gunMaterial);
        this.centerGun.add(gunBarrel);
        this.centerGun.add(gunHousing);
        this.centerGun.position.set(0, -0.8, 3); // Position at nose of aircraft
        this.model.add(this.centerGun);
        
        // Add tail - more elaborate tail section
        const tailGeometry = new THREE.BoxGeometry(7, 0.3, 3);
        // Taper the tail
        const tailPositions = tailGeometry.attributes.position;
        for (let i = 0; i < tailPositions.count; i++) {
            const z = tailPositions.getZ(i);
            // Taper width at the back
            if (z < 0) {
                const factor = 1 + z * 0.2;
                tailPositions.setX(i, tailPositions.getX(i) * factor);
            }
        }
        
        const tailMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3D85C6, // Blue to match wings
            metalness: 0.7,
            roughness: 0.3
        });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.set(0, 0, -5);
        this.model.add(tail);
        
        // Add vertical stabilizer - taller and sleeker
        const stabilizerGeometry = new THREE.BoxGeometry(0.3, 3, 4);
        // Taper the stabilizer
        const stabPositions = stabilizerGeometry.attributes.position;
        for (let i = 0; i < stabPositions.count; i++) {
            const z = stabPositions.getZ(i);
            // Create a more aerodynamic shape
            if (z < 0) {
                const factor = 1 + z * 0.1;
                stabPositions.setY(i, stabPositions.getY(i) * factor);
            }
        }
        
        const stabilizerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xE06666, // Red accent
            metalness: 0.7,
            roughness: 0.3
        });
        const stabilizer = new THREE.Mesh(stabilizerGeometry, stabilizerMaterial);
        stabilizer.position.set(0, 1.7, -5);
        this.model.add(stabilizer);
        
        // Add horizontal stabilizers
        const hStabilizerGeometry = new THREE.BoxGeometry(7, 0.2, 2);
        const hStabilizerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3D85C6, // Blue
            metalness: 0.7,
            roughness: 0.3
        });
        const hStabilizer = new THREE.Mesh(hStabilizerGeometry, hStabilizerMaterial);
        hStabilizer.position.set(0, 1.5, -6);
        this.model.add(hStabilizer);
        
        // Add engines
        const engineGeometry = new THREE.CylinderGeometry(0.7, 0.8, 3, 12);
        const engineMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444, // Dark gray
            metalness: 0.9,
            roughness: 0.2
        });
        
        // Left engine
        const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
        leftEngine.rotation.x = Math.PI / 2;
        leftEngine.position.set(-5, -0.5, 1);
        this.model.add(leftEngine);
        
        // Right engine
        const rightEngine = new THREE.Mesh(engineGeometry, engineMaterial);
        rightEngine.rotation.x = Math.PI / 2;
        rightEngine.position.set(5, -0.5, 1);
        this.model.add(rightEngine);
        
        // Add propellers
        const propellerGeometry = new THREE.BoxGeometry(0.2, 3, 0.2);
        const propellerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333, // Dark gray
            metalness: 0.8,
            roughness: 0.2
        });
        
        // Left propeller
        this.leftPropeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        this.leftPropeller.position.set(-5, -0.5, 2.7);
        this.model.add(this.leftPropeller);
        
        // Right propeller
        this.rightPropeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        this.rightPropeller.position.set(5, -0.5, 2.7);
        this.model.add(this.rightPropeller);
        
        // Add a main propeller for backward compatibility
        this.propeller = this.leftPropeller;
        
        // Add small details - nose cone
        const noseConeGeometry = new THREE.ConeGeometry(1.5, 2, 12);
        noseConeGeometry.rotateX(-Math.PI / 2);
        const noseConeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xE06666, // Red accent
            metalness: 0.7,
            roughness: 0.3
        });
        const noseCone = new THREE.Mesh(noseConeGeometry, noseConeMaterial);
        noseCone.position.set(0, 0, 6);
        this.model.add(noseCone);
        
        // Position the model and add to scene
        this.model.position.copy(this.position);
        this.model.rotation.copy(this.rotation);
        this.model.castShadow = true;
        this.model.receiveShadow = true;
        
        this.scene.add(this.model);
        this.modelLoaded = true;
    }
    
    shoot() {
        const currentTime = performance.now();
        if (currentTime - this.lastShotTime < this.shootingCooldown) return;
        
        this.lastShotTime = currentTime;
        
        // Create single bullet from center gun
        this.createProjectile(this.centerGun, currentTime);
        
        // Add effects when shooting (if the effects system is available)
        if (window.simulatorInstance && window.simulatorInstance.effects) {
            // Get the effects system
            const effects = window.simulatorInstance.effects;
            
            try {
                // Create muzzle flash effect with aircraft velocity
                const flashInfo = effects.createMuzzleFlash(this.centerGun, this.velocity);
                
                // No longer creating bullet trail/smoke effects
                
                // Add camera shake only if muzzle flash was created successfully
                if (flashInfo) {
                    const activeCamera = this.getActiveCamera();
                    if (activeCamera === this.firstPersonCamera) {
                        // More intense shake in first person
                        effects.addCameraShake(0.4);
                    } else {
                        // Less intense shake in third person
                        effects.addCameraShake(0.2);
                    }
                }
            } catch (error) {
                console.warn("Error creating shooting effects:", error);
            }
        }
    }
    
    createProjectile(gun, currentTime) {
        // Create cylindrical projectile
        const projectileGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
        projectileGeometry.rotateX(Math.PI / 2); // Rotate to align with direction of travel
        const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        
        // Get the world position of the gun
        const gunWorldPosition = new THREE.Vector3();
        gun.getWorldPosition(gunWorldPosition);
        
        // Calculate spawn position (at the gun position)
        const spawnOffset = new THREE.Vector3(0, 0, 2); // Adjust to be in front of gun barrel
        spawnOffset.applyEuler(this.rotation);
        const spawnPosition = gunWorldPosition.clone().add(spawnOffset);
        projectile.position.copy(spawnPosition);
        
        // Calculate projectile direction (forward vector of the aircraft)
        const direction = new THREE.Vector3(0, 0, 1);
        direction.applyEuler(this.rotation);
        
        // Apply rotation to match direction
        projectile.setRotationFromEuler(this.rotation.clone());
        
        // Store projectile data
        const projectileData = {
            mesh: projectile,
            direction: direction,
            speed: 1200, // Doubled again from 600 to 1200 meters per second
            distance: 0,
            maxDistance: 2000, // Doubled from 1000 to 2000 meters
            createdAt: currentTime
        };
        
        this.projectiles.push(projectileData);
        this.scene.add(projectile);
    }
    
    updateProjectiles(deltaTime) {
        const projectilesToRemove = [];
        
        for (let i = 0; i < this.projectiles.length; i++) {
            const projectile = this.projectiles[i];
            
            // Update position
            const distanceThisFrame = projectile.speed * deltaTime;
            projectile.distance += distanceThisFrame;
            
            const movement = projectile.direction.clone().multiplyScalar(distanceThisFrame);
            projectile.mesh.position.add(movement);
            
            // Check if projectile should be removed (traveled max distance)
            if (projectile.distance >= projectile.maxDistance) {
                projectilesToRemove.push(i);
            }
        }
        
        // Remove projectiles that are out of range
        for (let i = projectilesToRemove.length - 1; i >= 0; i--) {
            const index = projectilesToRemove[i];
            const projectile = this.projectiles[index];
            
            this.scene.remove(projectile.mesh);
            this.projectiles.splice(index, 1);
        }
    }
    
    update(deltaTime) {
        // Update propeller rotations based on throttle
        if (this.leftPropeller) {
            this.leftPropeller.rotation.z += this.controls.throttle * 20 * deltaTime;
        }
        if (this.rightPropeller) {
            this.rightPropeller.rotation.z += this.controls.throttle * 20 * deltaTime;
        }
        
        // Update wing animations based on controls
        if (this.wingsGroup) {
            // Roll animation - tilt the wings in response to roll controls
            const targetRollAngle = this.controls.roll * 0.2; // Max 0.2 radians (~11.5 degrees) of roll
            const currentRollAngle = this.wingsGroup.rotation.z;
            this.wingsGroup.rotation.z = THREE.MathUtils.lerp(currentRollAngle, targetRollAngle, 0.1);
            
            // Pitch animation - flex the wings slightly when pitching
            const targetPitchFlex = this.controls.pitch * 0.05; // Slight flex of wings during pitch
            const currentPitchFlex = this.wingsGroup.rotation.x;
            this.wingsGroup.rotation.x = THREE.MathUtils.lerp(currentPitchFlex, targetPitchFlex, 0.1);
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
        
        // Update projectiles
        this.updateProjectiles(deltaTime);
        
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

export { Aircraft }; 