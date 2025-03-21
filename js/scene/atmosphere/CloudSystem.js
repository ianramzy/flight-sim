class CloudSystem {
    constructor(scene, lighting) {
        this.scene = scene;
        this.lighting = lighting;
        this.onLoaded = null; // Callback function for loading completion
        
        // Cloud settings
        this.cloudEnabled = true;
        this.cloudDensity = 0.7;
        this.cloudCoverage = 0.6;
        this.cloudHeight = 3000;
        this.cloudClock = new THREE.Clock();
        this.cloudMeshes = [];
        this.cloudMovementEnabled = false; // Disabled cloud movement
        
        this.createClouds();
    }
    
    update() {
        if (!this.cloudEnabled || this.cloudMeshes.length === 0 || !this.cloudMovementEnabled) return;
        
        const deltaTime = this.cloudClock.getDelta();
        const windSpeed = 5; // Units per second
        
        // Update cloud positions based on wind direction
        this.cloudMeshes.forEach(cloud => {
            cloud.position.x += deltaTime * windSpeed;
            
            // Wrap clouds around when they move out of view
            // Using the extended area size for wrapping
            if (cloud.position.x > 15000) {
                cloud.position.x = -15000;
                // Randomize z position when wrapping for more varied distribution
                cloud.position.z = Math.random() * 30000 - 15000;
                // Slightly randomize height when wrapping for more natural appearance
                cloud.position.y = this.cloudHeight + Math.random() * 800;
            }
            
            // Rotate clouds slowly for added realism
            cloud.rotation.y += deltaTime * 0.05;
        });
    }
    
    createClouds() {
        try {
            console.log('Creating cloud system');
            
            // Create cloud material with varying opacity
            const cloudMaterial = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.6, // Increased transparency (was 0.75)
                side: THREE.DoubleSide,
                depthWrite: false
            });
            
            // Create several distinct cloud shapes
            this.createCloudInstances(cloudMaterial);
            
            console.log(`Created ${this.cloudMeshes.length} cloud formations`);
            
            // Update cloud appearance based on lighting mode
            this.updateCloudColors();
        } catch (error) {
            console.error('Error creating clouds:', error);
        } finally {
            // Signal that clouds are loaded, even if there was an error
            if (typeof this.onLoaded === 'function') {
                console.log('CloudSystem signaling onLoaded callback');
                this.onLoaded();
            }
        }
    }
    
    createCloudInstances(material) {
        // Clear any existing cloud meshes
        this.cloudMeshes.forEach(cloud => {
            this.scene.remove(cloud);
            if (cloud.geometry) cloud.geometry.dispose();
        });
        this.cloudMeshes = [];
        
        // Number of clouds based on density setting, increased base amount by 50%
        const cloudCount = Math.floor(45 * this.cloudDensity);
        
        // Extended cloud distribution area
        const areaSize = 30000;
        
        for (let i = 0; i < cloudCount; i++) {
            const cloud = this.createCloudFormation(material.clone());
            
            // Position clouds randomly in the sky across a wider area
            cloud.position.set(
                Math.random() * areaSize - (areaSize/2),
                this.cloudHeight + Math.random() * 800,
                Math.random() * areaSize - (areaSize/2)
            );
            
            // Random rotation and scale (increased by 30%)
            cloud.rotation.y = Math.random() * Math.PI * 2;
            const baseScale = 200 + Math.random() * 400;
            const scale = baseScale * 1.3; // 30% bigger
            cloud.scale.set(scale, scale * 0.3, scale);
            
            this.scene.add(cloud);
            this.cloudMeshes.push(cloud);
        }
    }
    
    createCloudFormation(material) {
        // Create a cloud formation from multiple spheres
        const group = new THREE.Group();
        
        // The number of "puffs" in each cloud depends on coverage
        const puffCount = Math.floor(5 + 10 * this.cloudCoverage);
        
        for (let i = 0; i < puffCount; i++) {
            // Create geometry for cloud puff
            const radius = 1 + Math.random() * 1.5;
            const geometry = new THREE.SphereGeometry(radius, 7, 7);
            
            const puff = new THREE.Mesh(geometry, material);
            
            // Position puffs relative to each other to form cloud shape
            // More spread out for larger, fluffier clouds
            puff.position.set(
                Math.random() * 6 - 3,  // Wider spread (-3 to 3)
                Math.random() * 2 - 0.5, // More vertical variation
                Math.random() * 6 - 3   // Wider spread (-3 to 3)
            );
            
            // Add some noise to the scale for natural appearance
            const scaleNoise = 0.8 + Math.random() * 0.4;
            puff.scale.set(scaleNoise, scaleNoise, scaleNoise);
            
            group.add(puff);
        }
        
        return group;
    }
    
    updateCloudColors() {
        // Adjust cloud appearance based on lighting mode
        const lightingMode = this.lighting.getLightingMode();
        
        this.cloudMeshes.forEach(cloud => {
            cloud.traverse(child => {
                if (child.isMesh) {
                    if (lightingMode === 'sunset') {
                        // Warm orange tint for sunset clouds
                        child.material.color.set(0xffeedd);
                        // Add emissive glow for sunset
                        child.material.emissive = new THREE.Color(0xff8844);
                        child.material.emissiveIntensity = 0.2;
                        child.material.opacity = 0.5; // More transparent (was 0.7)
                    } else {
                        // White for daytime clouds
                        child.material.color.set(0xffffff);
                        // No emissive in daytime
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.emissiveIntensity = 0;
                        child.material.opacity = 0.6; // More transparent (was 0.75)
                    }
                }
            });
        });
    }
    
    // Public methods for external control
    setCloudEnabled(enabled) {
        this.cloudEnabled = enabled;
        this.cloudMeshes.forEach(cloud => {
            cloud.visible = enabled;
        });
    }
    
    setCloudDensity(density) {
        this.cloudDensity = density;
        this.createClouds(); // Recreate clouds with new density
    }
    
    setCloudCoverage(coverage) {
        this.cloudCoverage = coverage;
        this.createClouds(); // Recreate clouds with new coverage
    }
    
    setCloudHeight(height) {
        this.cloudHeight = height;
        
        // Update existing cloud heights
        this.cloudMeshes.forEach(cloud => {
            cloud.position.y = this.cloudHeight + Math.random() * 1000;
        });
    }
    
    getCloudEnabled() {
        return this.cloudEnabled;
    }
    
    getCloudDensity() {
        return this.cloudDensity;
    }
    
    getCloudCoverage() {
        return this.cloudCoverage;
    }
    
    getCloudHeight() {
        return this.cloudHeight;
    }
    
    // Add method to control cloud movement
    setCloudMovementEnabled(enabled) {
        this.cloudMovementEnabled = enabled;
    }
    
    getCloudMovementEnabled() {
        return this.cloudMovementEnabled;
    }
}

export { CloudSystem };