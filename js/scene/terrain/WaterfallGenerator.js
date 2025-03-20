class WaterfallGenerator {
    constructor(scene) {
        this.scene = scene;
        this.waterfalls = [];
        this.onLoaded = null; // Callback function for loading completion
        
        // Parameters for waterfall customization
        this.particleCount = 1000; // Reduced from 2000 for performance
        this.particleSize = 15; // Increased from 5 to make water particles bigger
        this.waterSpeed = 20;
        this.waterColor = new THREE.Color(0x0088FF);
        this.particleOpacity = 0.7;
        
        // Performance optimization
        this.checkEveryNParticles = 20; // Increased from 5 - check fewer particles
        
        // Wait a brief moment to ensure mountains are loaded
        setTimeout(() => this.addWaterfalls(), 200);
    }
    
    addWaterfalls() {
        try {
            // Find all mountains in the scene
            const mountains = this.scene.children.filter(child => 
                child.isMesh && child.userData.isMountain
            );
            
            console.log(`Found ${mountains.length} mountains for potential waterfalls`);
            
            // Only add waterfalls to some mountains (taller ones are better candidates)
            const waterfallCount = Math.min(20, Math.floor(mountains.length * 0.05)); // 5% of mountains
            
            // Sort mountains by height (approximated by bounding box)
            mountains.forEach(mountain => {
                mountain.geometry.computeBoundingBox();
            });
            
            const sortedMountains = [...mountains].sort((a, b) => {
                const heightA = a.geometry.boundingBox.max.y - a.geometry.boundingBox.min.y;
                const heightB = b.geometry.boundingBox.max.y - b.geometry.boundingBox.min.y;
                return heightB - heightA; // Sort by descending height
            });
            
            // Select the tallest mountains for waterfalls
            const selectedMountains = sortedMountains.slice(0, waterfallCount);
            
            selectedMountains.forEach(mountain => {
                // Find a suitable position on the mountain side for the waterfall
                const startPosition = this.findWaterfallStartPosition(mountain);
                
                if (startPosition) {
                    // Create the waterfall
                    this.createWaterfall(startPosition, mountain);
                }
            });
            
            console.log(`Created ${this.waterfalls.length} waterfalls on mountains`);
        } catch (error) {
            console.error('Error generating waterfalls:', error);
        } finally {
            // Signal that waterfalls are loaded, even if there was an error
            if (typeof this.onLoaded === 'function') {
                console.log('WaterfallGenerator signaling onLoaded callback');
                this.onLoaded();
            }
        }
    }
    
    findWaterfallStartPosition(mountain) {
        // Get mountain geometry data
        const position = mountain.geometry.attributes.position;
        const mountainHeight = mountain.geometry.boundingBox.max.y;
        
        // Find a vertex near the top third of the mountain
        const vertices = [];
        for (let i = 0; i < position.count; i++) {
            const y = position.getY(i);
            
            // Consider vertices in the top third of the mountain
            if (y > mountainHeight * 0.6 && y < mountainHeight * 0.8) {
                vertices.push({
                    index: i,
                    x: position.getX(i),
                    y: y,
                    z: position.getZ(i)
                });
            }
        }
        
        if (vertices.length === 0) return null;
        
        // Choose a random vertex from candidates
        const randomVertex = vertices[Math.floor(Math.random() * vertices.length)];
        
        // Calculate world position
        const worldPosition = new THREE.Vector3(
            randomVertex.x,
            randomVertex.y,
            randomVertex.z
        ).applyMatrix4(mountain.matrixWorld);
        
        return {
            position: worldPosition,
            mountainHeight: mountainHeight,
            mountain: mountain
        };
    }
    
    createWaterfall(startInfo, mountain) {
        // Create particle system for the waterfall
        const particles = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const sizes = [];
        const velocity = [];
        const lifetime = [];
        
        // Generate initial particles along the mountain side
        for (let i = 0; i < this.particleCount; i++) {
            // Random starting point with slight variation around the start position
            const spread = 20;
            const x = startInfo.position.x + (Math.random() - 0.5) * spread;
            const y = startInfo.position.y;
            const z = startInfo.position.z + (Math.random() - 0.5) * spread;
            
            positions.push(x, y, z);
            
            // Create a slightly varied color for each particle
            const color = this.waterColor.clone();
            const hsl = { h: 0, s: 0, l: 0 };
            color.getHSL(hsl);
            hsl.s += (Math.random() - 0.5) * 0.1;
            hsl.l += (Math.random() - 0.5) * 0.1;
            color.setHSL(hsl.h, hsl.s, hsl.l);
            
            colors.push(color.r, color.g, color.b);
            
            // Random size variation
            sizes.push(this.particleSize * (0.8 + Math.random() * 0.4));
            
            // Initial velocity (downward with slight outward component)
            velocity.push(
                (Math.random() - 0.5) * 2,  // x velocity
                -this.waterSpeed * (0.8 + Math.random() * 0.4), // y velocity (downward)
                (Math.random() - 0.5) * 2   // z velocity
            );
            
            // Random lifetime for each particle
            lifetime.push(Math.random());
        }
        
        // Set particle attributes
        particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            size: this.particleSize,
            vertexColors: true,
            transparent: true,
            opacity: this.particleOpacity,
            alphaTest: 0.1,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            map: this.createParticleTexture()
        });
        
        // Create the particle system
        const particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(particleSystem);
        
        // Save the waterfall data for animation
        this.waterfalls.push({
            system: particleSystem,
            geometry: particles,
            velocities: velocity,
            lifetimes: lifetime,
            startPosition: startInfo.position,
            mountain: mountain,
            mountainHeight: startInfo.mountainHeight
        });
        
        // Create fog/mist at bottom of waterfall
        this.createWaterfallMist(startInfo.position);
    }
    
    createParticleTexture() {
        // Create a canvas for the particle texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        // Draw a soft, circular gradient
        const gradient = context.createRadialGradient(
            32, 32, 0, 
            32, 32, 32
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(150, 200, 255, 0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    createWaterfallMist(position) {
        // Create mist particles at the bottom of the waterfall
        const mistParticles = new THREE.BufferGeometry();
        const mistPositions = [];
        const mistColors = [];
        const mistSizes = [];
        
        // Parameters for mist
        const mistCount = 100;
        const mistSize = 20;
        const mistSpread = 25;
        
        // Generate mist particles around the base of the waterfall
        for (let i = 0; i < mistCount; i++) {
            // Position at the bottom of the waterfall with spread
            const x = position.x + (Math.random() - 0.5) * mistSpread;
            // Position slightly above ground
            const y = 5 + Math.random() * 20;
            const z = position.z + (Math.random() - 0.5) * mistSpread;
            
            mistPositions.push(x, y, z);
            
            // White/blue color with transparency
            mistColors.push(0.9, 0.95, 1.0);
            
            // Random size
            mistSizes.push(mistSize * (0.7 + Math.random() * 0.6));
        }
        
        // Set attributes
        mistParticles.setAttribute('position', new THREE.Float32BufferAttribute(mistPositions, 3));
        mistParticles.setAttribute('color', new THREE.Float32BufferAttribute(mistColors, 3));
        mistParticles.setAttribute('size', new THREE.Float32BufferAttribute(mistSizes, 1));
        
        // Create mist material
        const mistMaterial = new THREE.PointsMaterial({
            size: mistSize,
            vertexColors: true,
            transparent: true,
            opacity: 0.3,
            alphaTest: 0.1,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            map: this.createParticleTexture()
        });
        
        // Create mist particle system
        const mistSystem = new THREE.Points(mistParticles, mistMaterial);
        this.scene.add(mistSystem);
        
        // Add to waterfalls array for animation
        this.waterfalls.push({
            system: mistSystem,
            isMist: true,
            origin: position
        });
    }
    
    update() {
        // Update waterfalls every frame
        for (const waterfall of this.waterfalls) {
            // Skip mist updates (they're static)
            if (waterfall.isMist) continue;
            
            const positions = waterfall.geometry.attributes.position.array;
            const mountain = waterfall.mountain;
            
            // Instead of full raycast collision detection, use a simpler approach
            // with predetermined flow paths for better performance
            
            // Create raycaster for collision detection (used less frequently)
            const raycaster = new THREE.Raycaster();
            
            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                
                // Current particle position
                const x = positions[i3];
                const y = positions[i3 + 1];
                const z = positions[i3 + 2];
                
                // Apply velocity (simpler update without vector operations)
                positions[i3] += waterfall.velocities[i3];
                positions[i3 + 1] += waterfall.velocities[i3 + 1];
                positions[i3 + 2] += waterfall.velocities[i3 + 2];
                
                // Add gravity effect
                waterfall.velocities[i3 + 1] -= 0.2;
                
                // Very simplified collision check - only do for 1 in N particles
                // Using distance from mountain center as a proxy for collision
                if (i % this.checkEveryNParticles === 0) {
                    // Calculate horizontal distance from mountain center 
                    const mountainPos = new THREE.Vector3();
                    mountain.getWorldPosition(mountainPos);
                    
                    const dx = positions[i3] - mountainPos.x;
                    const dz = positions[i3 + 2] - mountainPos.z;
                    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
                    
                    // If close to mountain, adjust velocity to flow around it
                    const mountainRadius = 150; // Approximate radius
                    if (horizontalDist < mountainRadius) {
                        // Simplified flow direction - move outward from mountain center
                        const outwardDir = new THREE.Vector2(dx, dz).normalize();
                        
                        // Adjust velocity to flow outward and downward 
                        waterfall.velocities[i3] = outwardDir.x * 3;
                        waterfall.velocities[i3 + 2] = outwardDir.y * 3;
                        waterfall.velocities[i3 + 1] = -2; // Keep flowing down
                    }
                }
                
                // Update lifetime and reset if needed
                waterfall.lifetimes[i] += 0.02;
                
                // If particle lifetime is over, or if it's too far from mountain, reset it
                if (waterfall.lifetimes[i] > 1 || positions[i3 + 1] < 0) {
                    waterfall.lifetimes[i] = 0;
                    
                    // Reset to starting position with variation
                    const spread = 20;
                    positions[i3] = waterfall.startPosition.x + (Math.random() - 0.5) * spread;
                    positions[i3 + 1] = waterfall.startPosition.y;
                    positions[i3 + 2] = waterfall.startPosition.z + (Math.random() - 0.5) * spread;
                    
                    // Reset velocity
                    waterfall.velocities[i3] = (Math.random() - 0.5) * 2;
                    waterfall.velocities[i3 + 1] = -this.waterSpeed * (0.8 + Math.random() * 0.4);
                    waterfall.velocities[i3 + 2] = (Math.random() - 0.5) * 2;
                }
            }
            
            // Update the geometry
            waterfall.geometry.attributes.position.needsUpdate = true;
        }
    }
}

export { WaterfallGenerator }; 