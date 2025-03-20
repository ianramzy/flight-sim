class MistSystem {
    constructor(scene, lighting, terrain) {
        this.scene = scene;
        this.lighting = lighting;
        this.terrain = terrain;
        this.onLoaded = null; // Callback function for loading completion
        
        // Atmospheric mist settings
        this.mistEnabled = true;
        this.mistIntensity = 2.0;
        this.mistClock = new THREE.Clock();
        
        this.createAtmosphericMist();
    }
    
    update() {
        if (this.mistParticleSystem && this.mistEnabled) {
            // Update time uniform for mist animation
            const deltaTime = this.mistClock.getDelta();
            
            // Scale down time for slower, more gentle motion
            this.mistParticleMaterial.uniforms.time.value += deltaTime * 0.7;
            
            // Optional: gently move mist particles
            const positions = this.mistParticleSystem.geometry.attributes.position;
            const count = positions.count;
            
            // Less frequent updates for better performance
            if (Math.random() < 0.3) { // Only update some of the time
                // Only update a subset of particles each frame for better performance
                const updateCount = Math.min(count, 1000);
                const startIdx = Math.floor(Math.random() * (count - updateCount));
                
                for (let i = startIdx; i < startIdx + updateCount; i++) {
                    const idx = i * 3;
                    
                    // Gentler, more varied movement
                    // Use unique movement pattern for each particle
                    const particleOffset = i * 0.001;
                    const xMovement = Math.sin(particleOffset + this.mistParticleMaterial.uniforms.time.value * 0.05) * 0.1;
                    const zMovement = Math.cos(particleOffset + this.mistParticleMaterial.uniforms.time.value * 0.04) * 0.1;
                    
                    positions.array[idx] += xMovement;
                    positions.array[idx + 2] += zMovement;
                }
                
                positions.needsUpdate = true;
            }
        }
    }
    
    toggleMist() {
        if (this.mistParticleSystem) {
            this.mistParticleSystem.visible = this.mistEnabled;
        }
    }
    
    updateMistIntensity() {
        if (this.mistParticleSystem && this.mistParticleMaterial) {
            // Update opacity based on intensity
            this.mistParticleMaterial.opacity = 0.3 * this.mistIntensity;
            
            // Update scale of particles based on intensity
            const particles = this.mistParticleSystem.geometry.attributes.position;
            const count = particles.count;
            const sizes = this.mistParticleSystem.geometry.attributes.size;
            
            for (let i = 0; i < count; i++) {
                // Scale original size by intensity
                sizes.array[i] = this.mistParticleSizes[i] * this.mistIntensity;
            }
            
            sizes.needsUpdate = true;
        }
    }
    
    updateMistColors() {
        if (this.mistParticleSystem) {
            const colors = this.mistParticleSystem.geometry.attributes.color;
            const count = colors.count;
            
            for (let i = 0; i < count; i++) {
                const idx = i * 3;
                if (this.lighting.getLightingMode() === 'sunset') {
                    // Sunset mist has warmer orange/pink tints
                    colors.array[idx] = 0.98 + Math.random() * 0.02; // Red 
                    colors.array[idx + 1] = 0.92 + Math.random() * 0.05; // Green
                    colors.array[idx + 2] = 0.85 + Math.random() * 0.05; // Blue
                } else {
                    // Daytime mist is white/light blue
                    colors.array[idx] = 0.95 + Math.random() * 0.05;
                    colors.array[idx + 1] = 0.95 + Math.random() * 0.05;
                    colors.array[idx + 2] = 1.0;
                }
            }
            
            colors.needsUpdate = true;
        }
    }
    
    createAtmosphericMist() {
        console.log('Creating soft Bob Ross style atmospheric valley mist across the entire map');
        
        try {
            // Define mist parameters
            const groundSize = 20000; // Match terrain size
            const mistCount = 200000; // Reasonable particle count for performance
            const mistHeight = 300; // Height for volume
            
            // Store original sizes for intensity updates
            this.mistParticleSizes = new Float32Array(mistCount);
            
            // Create particle system for mist
            const mistGeometry = new THREE.BufferGeometry();
            const mistPositions = new Float32Array(mistCount * 3);
            const mistSizes = new Float32Array(mistCount);
            const mistColors = new Float32Array(mistCount * 3);
            const mistOpacities = new Float32Array(mistCount);
            
            // Get terrain for height sampling
            const terrain = this.scene.getObjectByName('terrain');
            const terrainPositions = terrain ? terrain.geometry.attributes.position : null;
            const terrainIndices = terrain ? terrain.geometry.index : null;
            
            // Create a map to quickly look up heights
            const heightMap = new Map();
            
            // Sample terrain to find low areas suitable for mist
            const mistPlacementPoints = [];
            if (terrainPositions && terrainIndices) {
                const resolution = Math.sqrt(terrainPositions.count);
                
                // Store heights at each position
                for (let i = 0; i < terrainPositions.count; i++) {
                    const x = terrainPositions.getX(i);
                    const y = terrainPositions.getY(i);
                    const z = terrainPositions.getZ(i);
                    
                    // Use x,z as key
                    const key = `${Math.round(x)},${Math.round(z)}`;
                    heightMap.set(key, y);
                }
                
                // Find valleys first (low points)
                const samplingInterval = 12; // Even lower interval for more sampling points
                for (let i = 0; i < terrainPositions.count; i += samplingInterval) {
                    const x = terrainPositions.getX(i);
                    const y = terrainPositions.getY(i);
                    const z = terrainPositions.getZ(i);
                    
                    // Skip points above certain height (only want mist in low areas)
                    if (y > mistHeight * 0.8) continue;
                    
                    // Check surrounding points to see if this is a local minimum
                    let isValley = true;
                    const checkRadius = 500; // Radius to check for valley
                    const checkPoints = 8; // Number of points to check
                    
                    for (let j = 0; j < checkPoints; j++) {
                        const angle = (j / checkPoints) * Math.PI * 2;
                        const checkX = Math.round(x + Math.cos(angle) * checkRadius);
                        const checkZ = Math.round(z + Math.sin(angle) * checkRadius);
                        const key = `${checkX},${checkZ}`;
                        
                        // If any surrounding point is lower, this isn't a valley
                        if (heightMap.has(key) && heightMap.get(key) < y) {
                            isValley = false;
                            break;
                        }
                    }
                    
                    // If it's a valley point, add it
                    if (isValley) {
                        mistPlacementPoints.push({ 
                            x, y, z, 
                            type: 'valley', 
                            priority: 1.0 // Valley points get highest priority
                        });
                    }
                }
                
                // Now add low areas that aren't necessarily valleys
                for (let i = 0; i < terrainPositions.count; i += samplingInterval * 2) {
                    const x = terrainPositions.getX(i);
                    const y = terrainPositions.getY(i);
                    const z = terrainPositions.getZ(i);
                    
                    // Only add low points that aren't already valleys
                    if (y < mistHeight * 1.5 && 
                        !mistPlacementPoints.some(p => 
                            Math.abs(p.x - x) < 300 && Math.abs(p.z - z) < 300)) {
                        
                        mistPlacementPoints.push({ 
                            x, y, z, 
                            type: 'lowPoint', 
                            priority: 0.7 // Lower priority than valleys
                        });
                    }
                }
            }
            
            // Add a dense grid of points across the entire map for complete coverage
            const gridSize = 32; // 32x32 grid for denser coverage
            const gridSpacing = groundSize / gridSize;
            const gridOffset = -groundSize / 2 + gridSpacing / 2;
            
            for (let x = 0; x < gridSize; x++) {
                for (let z = 0; z < gridSize; z++) {
                    // Calculate position
                    const worldX = gridOffset + x * gridSpacing;
                    const worldZ = gridOffset + z * gridSpacing;
                    
                    // Try to find height at this position
                    const key = `${Math.round(worldX)},${Math.round(worldZ)}`;
                    const y = heightMap.has(key) ? heightMap.get(key) : 0;
                    
                    // Only avoid duplicating existing points within a small radius
                    if (!mistPlacementPoints.some(p => 
                        Math.abs(p.x - worldX) < gridSpacing * 0.25 && 
                        Math.abs(p.z - worldZ) < gridSpacing * 0.25)) {
                        
                        mistPlacementPoints.push({
                            x: worldX,
                            y: y,
                            z: worldZ,
                            type: 'grid',
                            priority: 0.5 // Grid points get lowest priority
                        });
                    }
                }
            }
            
            // Create mist particles with a more natural distribution across all placement points
            for (let i = 0; i < mistCount; i++) {
                // Choose a placement point based on type and priority but ensure full coverage
                let placementPoint;
                
                if (i < mistCount * 0.4) {
                    // 40% of particles near valleys for concentrated effect
                    const valleyPoints = mistPlacementPoints.filter(p => p.type === 'valley');
                    if (valleyPoints.length > 0) {
                        const valleyIndex = Math.floor(Math.random() * valleyPoints.length);
                        placementPoint = valleyPoints[valleyIndex];
                    } else {
                        const randomIndex = Math.floor(Math.random() * mistPlacementPoints.length);
                        placementPoint = mistPlacementPoints[randomIndex];
                    }
                } 
                else if (i < mistCount * 0.7) {
                    // 30% near low points
                    const lowPoints = mistPlacementPoints.filter(p => p.type === 'lowPoint' || p.type === 'valley');
                    if (lowPoints.length > 0) {
                        const lowIndex = Math.floor(Math.random() * lowPoints.length);
                        placementPoint = lowPoints[lowIndex];
                    } else {
                        const randomIndex = Math.floor(Math.random() * mistPlacementPoints.length);
                        placementPoint = mistPlacementPoints[randomIndex];
                    }
                }
                else {
                    // 30% distributed across all grid points for broader coverage
                    const gridPoints = mistPlacementPoints.filter(p => p.type === 'grid');
                    if (gridPoints.length > 0) {
                        // Use grid index based on particle count to ensure even distribution
                        const gridIndex = Math.floor((i - mistCount * 0.7) / (mistCount * 0.3) * gridPoints.length);
                        placementPoint = gridPoints[gridIndex % gridPoints.length];
                    } else {
                        const randomIndex = Math.floor(Math.random() * mistPlacementPoints.length);
                        placementPoint = mistPlacementPoints[randomIndex];
                    }
                }
                
                // Use different radius based on point type but ensure overlapping coverage
                let radius, angle;
                
                if (placementPoint.type === 'valley') {
                    // Concentrated in valleys
                    radius = 300 + Math.random() * 600;
                } else if (placementPoint.type === 'lowPoint') {
                    // More spread in low areas
                    radius = 500 + Math.random() * 1000;
                } else {
                    // Cover the entire grid cell for complete coverage
                    radius = gridSpacing * (0.3 + Math.random() * 0.5);
                }
                
                angle = Math.random() * Math.PI * 2;
                
                const mistX = placementPoint.x + Math.cos(angle) * radius;
                const mistZ = placementPoint.z + Math.sin(angle) * radius;
                
                // Create layered mist with more at bottom, less at top
                // Exponential falloff in height distribution
                const heightRandom = Math.pow(Math.random(), 2); // Bias toward ground level
                const mistY = placementPoint.y + heightRandom * mistHeight;
                
                // Set position
                const idx = i * 3;
                mistPositions[idx] = mistX;
                mistPositions[idx + 1] = mistY;
                mistPositions[idx + 2] = mistZ;
                
                // Set size - larger particles for softer look, with variation
                // Particles near ground are larger
                const sizeVariation = 1.0 - (mistY - placementPoint.y) / mistHeight * 0.5; // Bigger at ground level
                const baseSize = (250 + Math.random() * 450) * sizeVariation * placementPoint.priority;
                mistSizes[i] = baseSize;
                this.mistParticleSizes[i] = baseSize; // Store original size
                
                // Set color based on lighting mode with subtle variations
                if (this.lighting.getLightingMode() === 'sunset') {
                    // Sunset mist with warmer tints - softer variation
                    const warmth = Math.random() * 0.05; // Subtle variation
                    mistColors[idx] = 0.98 - warmth; // Red 
                    mistColors[idx + 1] = 0.92 - warmth * 2; // Green
                    mistColors[idx + 2] = 0.85 - warmth * 3; // Blue
                } else {
                    // Daytime mist - softer blue tint
                    const blueAmount = Math.random() * 0.05; // Subtle blue variation
                    mistColors[idx] = 0.95 - blueAmount; // Less red for blue tint
                    mistColors[idx + 1] = 0.95; // Keep green
                    mistColors[idx + 2] = 1.0; // Full blue
                }
                
                // Lower opacity for a softer look - with height-based variation
                // Higher mist is more transparent
                const heightFactor = 1.0 - (mistY - placementPoint.y) / mistHeight * 0.6;
                
                // Adjust opacity based on point type - thicker in valleys, thinner across map
                // But ensure all mist is visible
                let opacityFactor = 1.0;
                if (placementPoint.type === 'valley') {
                    opacityFactor = 1.0;
                } else if (placementPoint.type === 'lowPoint') {
                    opacityFactor = 0.8;
                } else {
                    opacityFactor = 0.7; // Increased from 0.6 for better visibility
                }
                
                mistOpacities[i] = (0.12 + Math.random() * 0.15 * heightFactor) * opacityFactor; // Slightly higher base opacity
            }
            
            // Create attributes
            mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
            mistGeometry.setAttribute('size', new THREE.BufferAttribute(mistSizes, 1));
            mistGeometry.setAttribute('color', new THREE.BufferAttribute(mistColors, 3));
            mistGeometry.setAttribute('opacity', new THREE.BufferAttribute(mistOpacities, 1));
            
            // Create a much softer, higher quality texture for mist particles
            const mistCanvas = document.createElement('canvas');
            mistCanvas.width = 256; // Higher resolution
            mistCanvas.height = 256;
            const ctx = mistCanvas.getContext('2d');
            
            // Clear the canvas with transparent background
            ctx.clearRect(0, 0, 256, 256);
            
            // Create a very soft, multi-step radial gradient for more natural looking mist
            const gradient = ctx.createRadialGradient(
                128, 128, 0,  // Center
                128, 128, 128 // Edge
            );
            
            // Use more color stops for smoother transition
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)'); // Center - slightly less bright
            gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)');
            gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
            gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Completely transparent edge
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 256, 256);
            
            // Add subtle inner texture for more natural, non-uniform look
            ctx.globalCompositeOperation = 'overlay'; // Use overlay blend for subtle effect
            
            // Apply subtle noise texture for wispy effect
            for (let x = 0; x < 256; x += 2) {
                for (let y = 0; y < 256; y += 2) {
                    // Calculate distance from center
                    const dx = x - 128;
                    const dy = y - 128;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    // Only apply noise within the particle radius
                    if (dist < 128) {
                        // More subtle noise - only slight variations
                        const alpha = 0.05 + Math.random() * 0.05; // Very subtle
                        
                        // Use a small semi-transparent rectangle
                        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                        ctx.fillRect(x, y, 2, 2);
                    }
                }
            }
            
            // Reset to normal blending
            ctx.globalCompositeOperation = 'source-over';
            
            // Create soft feathered edge with another gradient pass
            const edgeGradient = ctx.createRadialGradient(
                128, 128, 90,   // Inner edge starts at 70% radius
                128, 128, 128   // Outer edge
            );
            edgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0)'); // Transparent inside
            edgeGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)'); // Very slight feathering
            
            ctx.globalCompositeOperation = 'destination-out'; // Cut out from existing content
            ctx.fillStyle = edgeGradient;
            ctx.fillRect(0, 0, 256, 256);
            
            const mistTexture = new THREE.CanvasTexture(mistCanvas);
            
            // Create shader material with improved vertex and fragment shaders
            const mistVertexShader = `
                attribute float size;
                attribute vec3 color;
                attribute float opacity;
                
                varying vec3 vColor;
                varying float vOpacity;
                
                uniform float time;
                
                void main() {
                    // Pass color and opacity to fragment shader
                    vColor = color;
                    vOpacity = opacity;
                    
                    // Calculate position with gentler wave motion
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // Use position-based frequency for more natural waves
                    // Each particle moves at slightly different rate and amplitude
                    float freq = 0.005 + 0.002 * sin(position.x * 0.001); // Varied frequency
                    float amp = 6.0 + 4.0 * cos(position.z * 0.001);    // Varied amplitude
                    
                    // Combine multiple sine waves for more organic motion
                    float wave1 = sin(position.x * freq + time * 0.05) * cos(position.z * freq * 1.1 + time * 0.03);
                    float wave2 = sin(position.x * freq * 1.3 + time * 0.04) * 0.5;
                    float finalWave = wave1 * 0.7 + wave2 * 0.3;
                    
                    // Apply smoother, gentler motion
                    mvPosition.y += finalWave * amp;
                    
                    // Distance-based size with smoother falloff
                    float sizeScale = 350.0 / -mvPosition.z;
                    sizeScale = min(sizeScale, 2.5); // Limit maximum scaling
                    
                    gl_PointSize = size * sizeScale;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `;
            
            const mistFragmentShader = `
                uniform sampler2D mistTexture;
                
                varying vec3 vColor;
                varying float vOpacity;
                
                void main() {
                    // Sample texture with soft edge handling
                    vec4 texColor = texture2D(mistTexture, gl_PointCoord);
                    
                    // Apply softer transparency curve
                    float alpha = texColor.a * vOpacity;
                    alpha = alpha * alpha * (3.0 - 2.0 * alpha); // Smooth step function for softer transition
                    
                    // Combine with color and opacity
                    gl_FragColor = vec4(vColor, alpha);
                    
                    // Discard near-transparent pixels
                    if (gl_FragColor.a < 0.01) discard;
                }
            `;
            
            // Create material with custom shaders
            this.mistParticleMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    mistTexture: { value: mistTexture },
                    time: { value: 0.0 }
                },
                vertexShader: mistVertexShader,
                fragmentShader: mistFragmentShader,
                transparent: true,
                depthWrite: false,
                blending: THREE.CustomBlending,
                blendSrc: THREE.SrcAlphaFactor,
                blendDst: THREE.OneMinusSrcAlphaFactor,
                blendEquation: THREE.AddEquation
            });
            
            // Create particle system
            this.mistParticleSystem = new THREE.Points(mistGeometry, this.mistParticleMaterial);
            this.scene.add(this.mistParticleSystem);
            
            console.log('Added soft atmospheric mist across the entire map');
            
            // Apply the initial intensity setting
            this.updateMistIntensity();
        } catch (error) {
            console.error('Error creating atmospheric mist:', error);
        } finally {
            // Always signal that mist is loaded, even if there was an error
            if (typeof this.onLoaded === 'function') {
                console.log('MistSystem signaling onLoaded callback');
                this.onLoaded();
            }
        }
    }
    
    setMistEnabled(enabled) {
        this.mistEnabled = enabled;
        this.toggleMist();
    }
    
    setMistIntensity(intensity) {
        this.mistIntensity = intensity;
        this.updateMistIntensity();
    }
    
    getMistEnabled() {
        return this.mistEnabled;
    }
    
    getMistIntensity() {
        return this.mistIntensity;
    }
}

export { MistSystem }; 