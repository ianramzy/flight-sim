class SkyboxManager {
    constructor(scene, lighting) {
        this.scene = scene;
        this.lighting = lighting;
        this.fogDensityFactor = 2.5; // Default fog density factor
        
        this.createSkybox();
    }
    
    createSkybox() {
        console.log('Creating skybox with consistent scale with terrain and fog');
        const groundSize = 20000; // Consistent scale definition
        console.log('World scale values:');
        console.log('- Ground size: ' + groundSize);
        console.log('- Fog distance: ' + (1/0.00015) + ' units'); // Log fog visibility distance
        
        this.updateSkybox(groundSize);
        
        // Add fog to create distance haze effect
        this.updateFog(groundSize);
    }
    
    updateSkybox(groundSize) {
        groundSize = groundSize || 20000; // Default if not provided
        const skyboxRadius = groundSize * 0.8; // Make skybox proportional to ground size
        
        console.log('Updating skybox with radius:', skyboxRadius);
        
        // Remove existing skybox if it exists
        this.scene.children.forEach(child => {
            if (child.isMesh && child.geometry instanceof THREE.SphereGeometry && 
                child.geometry.parameters.radius >= groundSize * 0.7) {
                this.scene.remove(child);
                if (child.material) {
                    child.material.dispose();
                }
                if (child.geometry) {
                    child.geometry.dispose();
                }
            }
        });
        
        // Get fog details to apply to skybox
        const fogColor = this.lighting.getLightingMode() === 'sunset' ? new THREE.Color(0xFF8844) : new THREE.Color(0xCCDDFF);
        const fogDensity = this.fogDensityFactor / groundSize; // Use the fog density factor from the slider
        
        // Create vertex shader
        const vertexShader = `
            varying vec3 vWorldPosition;
            varying float vDistance;
            varying vec3 vViewVector;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                
                // Calculate distance from camera for fog
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vDistance = -mvPosition.z;
                
                // Save view vector for directional fog
                vViewVector = normalize(worldPosition.xyz - cameraPosition);
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        let fragmentShader, uniforms;
        
        if (this.lighting.getLightingMode() === 'sunset') {
            // Sunset sky
            fragmentShader = `
                uniform vec3 topColor;
                uniform vec3 middleColor;
                uniform vec3 bottomColor;
                uniform vec3 fogColor;
                uniform float fogDensity;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                varying float vDistance;
                varying vec3 vViewVector;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    vec3 skyColor;
                    
                    if (h > 0.15) {
                        skyColor = mix(middleColor, topColor, max(pow((h - 0.15) / 0.85, exponent), 0.0));
                    } else {
                        skyColor = mix(bottomColor, middleColor, max(pow(h / 0.15, exponent), 0.0));
                    }
                    
                    // Apply fog only for horizontal viewing angles
                    // Calculate how much we're looking "up" (y component of view vector)
                    float upFactor = max(0.0, vViewVector.y);
                    
                    // Reduce fog effect as we look more upward
                    // 1.0 when looking horizontally, 0.0 when looking straight up
                    // Using a higher power creates a sharper transition between foggy and clear
                    float horizontalFactor = 1.0 - pow(upFactor, 0.2);
                    
                    // Apply standard fog calculation but weight by horizontal factor
                    float fogFactor = (1.0 - exp(-fogDensity * fogDensity * vDistance * vDistance)) * horizontalFactor;
                    skyColor = mix(skyColor, fogColor, fogFactor);
                    
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `;

            uniforms = {
                topColor: { value: new THREE.Color(0x0033AA) },    // Deep blue at zenith
                middleColor: { value: new THREE.Color(0xFF8844) }, // Orange at horizon
                bottomColor: { value: new THREE.Color(0xFF5522) }, // Deep orange-red at bottom
                fogColor: { value: fogColor },
                fogDensity: { value: fogDensity * 0.8 }, // Slightly less dense for skybox
                offset: { value: 400 },
                exponent: { value: 0.4 }
            };
        } else {
            // Daytime sky
            fragmentShader = `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform vec3 fogColor;
                uniform float fogDensity;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                varying float vDistance;
                varying vec3 vViewVector;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    vec3 skyColor = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                    
                    // Apply fog only for horizontal viewing angles
                    // Calculate how much we're looking "up" (y component of view vector)
                    float upFactor = max(0.0, vViewVector.y);
                    
                    // Reduce fog effect as we look more upward
                    // 1.0 when looking horizontally, 0.0 when looking straight up
                    // Using a higher power creates a sharper transition between foggy and clear
                    float horizontalFactor = 1.0 - pow(upFactor, 0.2);
                    
                    // Apply standard fog calculation but weight by horizontal factor
                    float fogFactor = (1.0 - exp(-fogDensity * fogDensity * vDistance * vDistance)) * horizontalFactor;
                    skyColor = mix(skyColor, fogColor, fogFactor);
                    
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `;

            uniforms = {
                topColor: { value: new THREE.Color(0x0077FF) },    // Blue at top
                bottomColor: { value: new THREE.Color(0xAAAAAA) }, // Light gray at horizon
                fogColor: { value: fogColor },
                fogDensity: { value: fogDensity * 0.8 }, // Slightly less dense for skybox
                offset: { value: 400 },
                exponent: { value: 0.6 }
            };
        }

        // Create skybox with consistent scale
        const skyGeo = new THREE.SphereGeometry(skyboxRadius, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.BackSide,
            fog: false // Disable automatic fog for the skybox as we're handling it in the shader
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        console.log('Added skybox with radius:', skyboxRadius, 'and fog density:', fogDensity);
    }

    updateFog(groundSize) {
        groundSize = groundSize || 20000; // Default if not provided
        const fogDensity = this.fogDensityFactor / groundSize; // Use the fog density factor from the slider
        
        console.log('Updating fog with density:', fogDensity, 'factor:', this.fogDensityFactor);
        
        // Create fog that matches the skybox colors but only affects horizontal visibility
        if (this.lighting.getLightingMode() === 'sunset') {
            // Sunset fog - warm orange/pink tint
            this.scene.fog = new THREE.FogExp2(0xFF8844, fogDensity * 0.5); // Reduced density for less vertical fog
        } else {
            // Daytime fog - light blue/white tint
            this.scene.fog = new THREE.FogExp2(0xCCDDFF, fogDensity * 0.5); // Reduced density for less vertical fog
        }
        
        // Update skybox with new fog settings
        this.updateSkybox(groundSize);
    }
    
    setFogDensity(density) {
        this.fogDensityFactor = density;
        this.updateFog();
    }
    
    getFogDensity() {
        return this.fogDensityFactor;
    }
}

export { SkyboxManager }; 