class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Setup performance monitoring
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        // Move the stats panel to bottom right
        this.stats.dom.style.position = 'absolute';
        this.stats.dom.style.bottom = '0px';
        this.stats.dom.style.right = '0px';
        this.stats.dom.style.top = 'auto';
        this.stats.dom.style.left = 'auto';
        document.body.appendChild(this.stats.dom);
        
        // Performance test button
        this.createPerformanceTestButton();
        
        // Add lighting mode state
        this.lightingMode = 'sunset'; // Default to sunset mode
        
        // Default fog density factor
        this.fogDensityFactor = 2.5;
        
        this.setupLights();
        this.createSkybox();
        this.createTerrain();
        this.addMountains();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // Add UI control for lighting toggle
        this.createLightingToggle();
        
        // Add UI control for fog
        this.createFogControls();
    }

    createLightingToggle() {
        // Create a simple button for toggling lighting
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Switch to Daytime'; // Updated for sunset default
        toggleButton.style.position = 'fixed';
        toggleButton.style.top = '20px'; // Same top position as view-toggle
        toggleButton.style.left = '120px'; // Position to the right of the toggle view button
        toggleButton.style.padding = '5px 10px'; // Match padding of view-toggle
        toggleButton.style.background = 'rgba(0, 0, 0, 0.5)'; // Match style of view-toggle
        toggleButton.style.color = 'white'; // Match style of view-toggle
        toggleButton.style.border = '1px solid white'; // Match style of view-toggle
        toggleButton.style.borderRadius = '0px'; // Remove border radius to match view-toggle
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.zIndex = '1000';
        
        // Add event listener for toggle
        toggleButton.addEventListener('click', () => {
            this.toggleLightingMode();
            toggleButton.textContent = this.lightingMode === 'sunset' ? 'Switch to Daytime' : 'Switch to Sunset';
        });
        
        document.body.appendChild(toggleButton);
    }
    
    createPerformanceTestButton() {
        // Create button to toggle performance mode
        const perfButton = document.createElement('button');
        perfButton.textContent = 'Uncap FPS';
        perfButton.style.position = 'fixed';
        perfButton.style.top = '20px';
        perfButton.style.left = '250px'; // Position to the right of the lighting toggle
        perfButton.style.padding = '5px 10px';
        perfButton.style.background = 'rgba(0, 0, 0, 0.5)';
        perfButton.style.color = 'white';
        perfButton.style.border = '1px solid white';
        perfButton.style.borderRadius = '0px';
        perfButton.style.cursor = 'pointer';
        perfButton.style.zIndex = '1000';
        
        // Add benchmark panel
        this.benchmarkPanel = document.createElement('div');
        this.benchmarkPanel.style.position = 'fixed';
        this.benchmarkPanel.style.bottom = '20px';
        this.benchmarkPanel.style.left = '20px';
        this.benchmarkPanel.style.padding = '10px';
        this.benchmarkPanel.style.background = 'rgba(0, 0, 0, 0.5)';
        this.benchmarkPanel.style.color = 'white';
        this.benchmarkPanel.style.border = '1px solid white';
        this.benchmarkPanel.style.fontFamily = 'monospace';
        this.benchmarkPanel.style.display = 'none';
        this.benchmarkPanel.style.zIndex = '1000';
        document.body.appendChild(this.benchmarkPanel);
        
        // Performance testing state
        this.isUncapped = false;
        this.frameCounter = 0;
        this.lastTime = performance.now();
        this.benchmarkData = {
            fps: [],
            frameTime: [],
            startTime: 0
        };
        
        // Add event listener for toggle
        perfButton.addEventListener('click', () => {
            this.togglePerformanceTest();
            perfButton.textContent = this.isUncapped ? 'Cap FPS' : 'Uncap FPS';
        });
        
        document.body.appendChild(perfButton);
    }
    
    createFogControls() {
        // Create container for fog controls
        const fogControlContainer = document.createElement('div');
        fogControlContainer.style.position = 'fixed';
        fogControlContainer.style.bottom = '20px';
        fogControlContainer.style.right = '20px';
        fogControlContainer.style.padding = '10px';
        fogControlContainer.style.background = 'rgba(0, 0, 0, 0.5)';
        fogControlContainer.style.color = 'white';
        fogControlContainer.style.border = '1px solid white';
        fogControlContainer.style.zIndex = '1000';
        fogControlContainer.style.display = 'flex';
        fogControlContainer.style.flexDirection = 'column';
        fogControlContainer.style.alignItems = 'center';
        fogControlContainer.style.gap = '5px';
        
        // Add label
        const fogLabel = document.createElement('div');
        fogLabel.textContent = 'Fog Intensity';
        fogControlContainer.appendChild(fogLabel);
        
        // Create slider for fog density
        const fogSlider = document.createElement('input');
        fogSlider.type = 'range';
        fogSlider.min = '0';
        fogSlider.max = '5';
        fogSlider.step = '0.1';
        fogSlider.value = this.fogDensityFactor;
        fogSlider.style.width = '150px';
        
        // Value display
        const fogValueDisplay = document.createElement('div');
        fogValueDisplay.textContent = `Fog: ${this.fogDensityFactor}`;
        
        // Add event listener
        fogSlider.addEventListener('input', (event) => {
            this.fogDensityFactor = parseFloat(event.target.value);
            fogValueDisplay.textContent = `Fog: ${this.fogDensityFactor.toFixed(1)}`;
            this.updateFog(); // Update fog with new density
        });
        
        // Add reset button
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset Fog';
        resetButton.style.padding = '5px';
        resetButton.style.cursor = 'pointer';
        resetButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        resetButton.style.color = 'white';
        resetButton.style.border = '1px solid white';
        resetButton.addEventListener('click', () => {
            this.fogDensityFactor = 1.5;
            fogSlider.value = 1.5;
            fogValueDisplay.textContent = `Fog: ${this.fogDensityFactor.toFixed(1)}`;
            this.updateFog();
        });
        
        // Add elements to container
        fogControlContainer.appendChild(fogSlider);
        fogControlContainer.appendChild(fogValueDisplay);
        fogControlContainer.appendChild(resetButton);
        
        // Add to document
        document.body.appendChild(fogControlContainer);
    }
    
    toggleLightingMode() {
        console.log('Toggling lighting mode from', this.lightingMode, 'to', 
            this.lightingMode === 'sunset' ? 'daytime' : 'sunset');
        
        // Switch between lighting modes
        this.lightingMode = this.lightingMode === 'sunset' ? 'daytime' : 'sunset';
        
        // Clear existing lights
        this.clearLights();
        
        // Set up new lights based on mode
        this.setupLights();
        
        // Update skybox
        this.updateSkybox();
        
        // Update fog to match lighting mode
        this.updateFog();
    }
    
    clearLights() {
        // Remove existing lights
        const lightsToRemove = [];
        this.scene.children.forEach(child => {
            if (child instanceof THREE.AmbientLight || 
                child instanceof THREE.DirectionalLight || 
                child instanceof THREE.HemisphereLight) {
                lightsToRemove.push(child);
            }
        });
        
        // Remove lights from the scene
        lightsToRemove.forEach(light => {
            this.scene.remove(light);
            if (light.dispose) {
                light.dispose();
            }
            if (light.shadow && light.shadow.map) {
                light.shadow.map.dispose();
            }
        });
    }
    
    setupLights() {
        if (this.lightingMode === 'sunset') {
            // Sunset lighting setup
            
            // Ambient light - warmer and dimmer for sunset
            const ambientLight = new THREE.AmbientLight(0x553322, 0.4);
            this.scene.add(ambientLight);

            // Directional light (sun) - higher position but still warm orange for sunset
            const directionalLight = new THREE.DirectionalLight(0xFF7722, 1.0);
            directionalLight.position.set(-300, 500, -100); // Raised from 300 to 500
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 1500;
            directionalLight.shadow.camera.left = -500;
            directionalLight.shadow.camera.right = 500;
            directionalLight.shadow.camera.top = 500;
            directionalLight.shadow.camera.bottom = -500;
            this.scene.add(directionalLight);
            
            // Add a secondary light - dimmer and blue for dusk shadow areas
            const secondaryLight = new THREE.DirectionalLight(0x5566AA, 0.5);
            secondaryLight.position.set(200, 100, 300);
            secondaryLight.castShadow = true;
            secondaryLight.shadow.mapSize.width = 1024;
            secondaryLight.shadow.mapSize.height = 1024;
            secondaryLight.shadow.camera.near = 0.5;
            secondaryLight.shadow.camera.far = 1000;
            secondaryLight.shadow.camera.left = -400;
            secondaryLight.shadow.camera.right = 400;
            secondaryLight.shadow.camera.top = 400;
            secondaryLight.shadow.camera.bottom = -400;
            this.scene.add(secondaryLight);
        } else {
            // Daytime lighting setup
            
            // Ambient light - brighter for daytime
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            this.scene.add(ambientLight);

            // Directional light (sun) with better angle for hill shadows
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
            directionalLight.position.set(300, 400, 300);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 1500;
            directionalLight.shadow.camera.left = -500;
            directionalLight.shadow.camera.right = 500;
            directionalLight.shadow.camera.top = 500;
            directionalLight.shadow.camera.bottom = -500;
            this.scene.add(directionalLight);
            
            // Add a secondary light from a different angle to enhance terrain features
            const secondaryLight = new THREE.DirectionalLight(0xffeecc, 0.8);
            secondaryLight.position.set(-200, 300, -100);
            secondaryLight.castShadow = true;
            secondaryLight.shadow.mapSize.width = 1024;
            secondaryLight.shadow.mapSize.height = 1024;
            secondaryLight.shadow.camera.near = 0.5;
            secondaryLight.shadow.camera.far = 1000;
            secondaryLight.shadow.camera.left = -400;
            secondaryLight.shadow.camera.right = 400;
            secondaryLight.shadow.camera.top = 400;
            secondaryLight.shadow.camera.bottom = -400;
            this.scene.add(secondaryLight);
        }
    }

    createSkybox() {
        // Add consistent scale logging
        console.log('Creating skybox with consistent scale with terrain and fog');
        const groundSize = 20000; // Consistent scale definition - doubled from 10000 to create 4x area
        console.log('World scale values:');
        console.log('- Ground size: ' + groundSize);
        console.log('- Fog distance: ' + (1/0.00015) + ' units'); // Log fog visibility distance
        
        this.updateSkybox(groundSize);
        
        // Add fog to create distance haze effect
        this.updateFog(groundSize);
    }
    
    updateSkybox(groundSize) {
        groundSize = groundSize || 20000; // Default if not provided - doubled from 10000
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
        const fogColor = this.lightingMode === 'sunset' ? new THREE.Color(0xFF8844) : new THREE.Color(0xCCDDFF);
        const fogDensity = this.fogDensityFactor / groundSize;
        
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
        
        if (this.lightingMode === 'sunset') {
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
        console.log('Added skybox with radius:', skyboxRadius, 'and fosssssssfg density:', fogDensity);
    }

    updateFog(groundSize) {
        groundSize = groundSize || 20000; // Default if not provided - doubled from 10000
        const fogDensity = this.fogDensityFactor / groundSize; // Use the fog density factor from the slider
        
        console.log('Updating fog with density:', fogDensity, 'factor:', this.fogDensityFactor);
        
        // Create fog that matches the skybox colors but only affects horizontal visibility
        if (this.lightingMode === 'sunset') {
            // Sunset fog - warm orange/pink tint
            this.scene.fog = new THREE.FogExp2(0xFF8844, fogDensity * 0.5); // Reduced density for less vertical fog
        } else {
            // Daytime fog - light blue/white tint
            this.scene.fog = new THREE.FogExp2(0xCCDDFF, fogDensity * 0.5); // Reduced density for less vertical fog
        }
        
        // Update skybox with new fog settings
        this.updateSkybox(groundSize);
    }

    createTerrain() {
        // Use consistent groundSize across the application
        const groundSize = 20000; // Doubled from 10000 to create 4x area
        console.log('Creating terrain with ground size:', groundSize);
        console.log('Creating terrain with steep hills and canyons');
        // Create terrain with rolling hills
        const resolution = 256; // Doubled from 128 to maintain terrain density with larger map
        const heightMapSize = resolution;
        
        // Create height map
        const heightMap = this.generateRollingHillsHeightMap(heightMapSize);
        
        // Log some height map values to check if they're reasonable
        console.log('Height map samples:');
        console.log('Center:', heightMap[Math.floor(heightMapSize/2)][Math.floor(heightMapSize/2)]);
        console.log('Top-left:', heightMap[0][0]);
        console.log('Bottom-right:', heightMap[heightMapSize-1][heightMapSize-1]);
        
        // Use BufferGeometry for better control over vertex positions
        const terrainGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const uvs = []; // Add UVs for texture mapping
        
        // Use a higher height scale for steeper hills
        const heightScale = 250; // Increased for more dramatic hills
        
        // Define water level threshold (points below this height will be water)
        const waterThreshold = 0.6;
        
        // Track water vertices for later use
        const waterVertices = [];
        const waterIndices = [];

        // Create vertices for the terrain
        for (let z = 0; z < resolution; z++) {
            for (let x = 0; x < resolution; x++) {
                // Calculate position
                const xPos = (x / (resolution - 1) - 0.5) * groundSize;
                const zPos = (z / (resolution - 1) - 0.5) * groundSize;
                
                // Get height from the heightmap
                let height = 0;
                if (x < heightMapSize && z < heightMapSize) {
                    height = heightMap[z][x] * heightScale;
                }
                
                // Add position (note: in THREE.js, Y is up)
                positions.push(xPos, height, zPos);
                
                // Add UV coordinates for texture mapping
                uvs.push(x / (resolution - 1), z / (resolution - 1));
                
                // Check if this is a water vertex (below threshold)
                const isWater = heightMap[z][x] < waterThreshold;
                
                // Save water vertex information for later creation of water surface
                if (isWater) {
                    // Store the index of this vertex
                    waterVertices.push(x + z * resolution);
                }
                
                // Add color based on height for better visual cues
                const heightRatio = height / heightScale;
                
                // Apply different colors based on height
                let r, g, b;
                if (isWater) {
                    // Water colors (blue instead of teal)
                    r = 0.0;
                    g = 0.3;
                    b = 0.9;
                } else {
                    // Land colors (similar to before but slightly adjusted)
                    r = 0.95 - heightRatio * 0.05;
                    g = 0.95 + heightRatio * 0.05;
                    b = 0.95 - heightRatio * 0.05;
                }
                
                colors.push(r, g, b);
            }
        }
        
        // Create indices for faces
        const indices = [];
        for (let z = 0; z < resolution - 1; z++) {
            for (let x = 0; x < resolution - 1; x++) {
                const a = x + z * resolution;
                const b = (x + 1) + z * resolution;
                const c = x + (z + 1) * resolution;
                const d = (x + 1) + (z + 1) * resolution;
                
                // Two triangles per grid square
                indices.push(a, c, b);
                indices.push(c, d, b);
            }
        }
        
        // Set the attributes
        terrainGeometry.setIndex(indices);
        terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        terrainGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        terrainGeometry.computeVertexNormals();
        
        // Create terrain material with vertex colors for better visual cues
        const terrainMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,  // Use vertex colors
            roughness: 0.9,      // Increased roughness for grass
            metalness: 0.0,      // No metalness for natural look
            flatShading: false,  // Smooth shading for more natural look
            map: null,           // Will set this later
            onBeforeCompile: (shader) => {
                // Add custom fog handling to the shader
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <fog_fragment>',
                    `
                    #include <fog_fragment>
                    // Custom fog handling that reduces fog at higher altitudes
                    // Use a sharper transition to keep fog very low to the ground
                    float heightFactor = 1.0 - smoothstep(0.0, 5.0, vViewPosition.y);
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor * heightFactor);
                    `
                );
            }
        });
        
        // Add grass texture to the terrain - using a different URL for better visibility
        const textureLoader = new THREE.TextureLoader();
        const grassTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg');
        grassTexture.wrapS = THREE.RepeatWrapping;
        grassTexture.wrapT = THREE.RepeatWrapping;
        // Make texture repeat much more frequently for visibility on the hills
        grassTexture.repeat.set(200, 200); // Much higher repeat value for better visibility
        
        // Apply the texture
        terrainMaterial.map = grassTexture;
        terrainMaterial.color = new THREE.Color(0xffffff); // Set color to white to let texture show through
        terrainMaterial.needsUpdate = true;
        
        // Create and position the terrain mesh
        const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        terrain.receiveShadow = true;
        terrain.castShadow = true;
        terrain.name = 'terrain';
        
        this.scene.add(terrain);
        
        // Save the height scale for other methods to use
        this.terrainHeightScale = heightScale;
        
        // Add trees and bushes
        this.addTreesAndBushes(heightMap, resolution, groundSize);
        
        // Add water surface
        this.createWaterSurface(heightMap, resolution, groundSize, waterThreshold, heightScale);
    }
    
    generateRollingHillsHeightMap(size) {
        console.log('Generating Hollywood-style hills with canyons');
        const heightMap = [];
        
        // Initialize with zeros
        for (let z = 0; z < size; z++) {
            heightMap[z] = [];
            for (let x = 0; x < size; x++) {
                heightMap[z][x] = 0;
            }
        }
        
        // Create noise-based terrain with steeper, narrower hills and canyons
        for (let z = 0; z < size; z++) {
            for (let x = 0; x < size; x++) {
                // Normalize coordinates to [-1, 1] range
                const nx = x / size * 2 - 1;
                const nz = z / size * 2 - 1;
                
                // Start with a base height
                let height = 0;
                
                // Create steep ridges with narrow bases
                height += 0.5 * Math.pow(Math.abs(Math.sin(nx * 10.0) * Math.sin(nz * 8.0)), 0.5);
                height += 0.3 * Math.pow(Math.abs(Math.sin(nx * 12.0 + 0.5) * Math.sin(nz * 9.0 + 0.3)), 0.7);
                
                // Add canyon-like features by creating sharp valleys
                const valleyFactor = 0.2 * Math.pow(Math.abs(Math.sin(nx * 15.0) * Math.sin(nz * 12.0)), 2.0);
                height -= valleyFactor;
                
                // Add some ridge lines in different directions
                height += 0.15 * Math.pow(Math.abs(Math.sin(nx * 20.0 + nz * 15.0)), 2.0);
                height += 0.1 * Math.pow(Math.abs(Math.sin(nx * 15.0 - nz * 20.0)), 2.0);
                
                // Add smaller detail variations
                height += 0.05 * (Math.random() * 2 - 1);
                
                // Apply mild dome shape with less effect at the edges
                const distFromCenter = Math.sqrt(nx * nx + nz * nz);
                height -= distFromCenter * 0.08; 
                
                // Normalize height values between 0 and 1
                heightMap[z][x] = Math.max(0, Math.min(1, height + 0.2));
            }
        }
        
        // Post-processing pass to enhance canyons
        const processedMap = [];
        for (let z = 0; z < size; z++) {
            processedMap[z] = [];
            for (let x = 0; x < size; x++) {
                // Get the current height
                let height = heightMap[z][x];
                
                // Check neighboring heights to enhance valleys/canyons
                const neighborOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                let maxNeighborHeight = 0;
                
                for (const [dx, dz] of neighborOffsets) {
                    const nx = x + dx;
                    const nz = z + dz;
                    
                    if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
                        maxNeighborHeight = Math.max(maxNeighborHeight, heightMap[nz][nx]);
                    }
                }
                
                // If there's a big neighbor and current point is low, make it even lower (canyon)
                if (maxNeighborHeight > height + 0.2 && height < 0.5) {
                    height *= 0.8; // Deepen canyons
                }
                
                // If current point is already high, make it even higher (steep hills)
                if (height > 0.6) {
                    height = height * 1.2;
                }
                
                // Store the processed height
                processedMap[z][x] = Math.max(0, Math.min(1, height));
            }
        }
        
        // Log a sample of height values
        console.log('Sample height values at middle row:');
        const middleRow = Math.floor(size / 2);
        console.log(processedMap[middleRow].filter((_, i) => i % 16 === 0));
        
        return processedMap;
    }
    
    createWaterSurface(heightMap, resolution, groundSize, waterThreshold, heightScale) {
        // Create water surface geometry
        const waterGeometry = new THREE.BufferGeometry();
        const positions = [];
        const colors = [];
        const indices = [];
        const waterHeight = waterThreshold * heightScale; // Set water level at the threshold
        
        // Create vertices for the water surface
        for (let z = 0; z < resolution; z++) {
            for (let x = 0; x < resolution; x++) {
                // Calculate position
                const xPos = (x / (resolution - 1) - 0.5) * groundSize;
                const zPos = (z / (resolution - 1) - 0.5) * groundSize;
                
                // Get terrain height from the heightmap
                let terrainHeight = 0;
                if (x < heightMap.length && z < heightMap.length) {
                    terrainHeight = heightMap[z][x] * heightScale;
                }
                
                // Add position (use water height if below threshold)
                if (heightMap[z][x] < waterThreshold) {
                    positions.push(xPos, waterHeight, zPos);
                    
                    // Blue color for water (changed from teal)
                    colors.push(0.0, 0.3, 0.9);
                } else {
                    // For non-water areas, place vertices below terrain (will not be visible)
                    positions.push(xPos, -1000, zPos);
                    
                    // Use same color for consistency
                    colors.push(0.0, 0.3, 0.9);
                }
            }
        }
        
        // Create indices for water faces (only where heightmap value is below threshold)
        for (let z = 0; z < resolution - 1; z++) {
            for (let x = 0; x < resolution - 1; x++) {
                const a = x + z * resolution;
                const b = (x + 1) + z * resolution;
                const c = x + (z + 1) * resolution;
                const d = (x + 1) + (z + 1) * resolution;
                
                // Check if any of the vertices is below water threshold
                if (
                    heightMap[z][x] < waterThreshold || 
                    heightMap[z][x+1] < waterThreshold || 
                    heightMap[z+1][x] < waterThreshold || 
                    heightMap[z+1][x+1] < waterThreshold
                ) {
                    // Two triangles per grid square
                    indices.push(a, c, b);
                    indices.push(c, d, b);
                }
            }
        }
        
        // Set the attributes
        waterGeometry.setIndex(indices);
        waterGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        waterGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        waterGeometry.computeVertexNormals();
        
        // Create water material with blue color
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x0044FF, // Blue color (changed from teal)
            roughness: 0.1,
            metalness: 0.2,
            transparent: true,
            opacity: 0.8,
            flatShading: false,
            vertexColors: true
        });
        
        // Create and position the water mesh
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.receiveShadow = true;
        water.name = 'water';
        
        this.scene.add(water);
    }
    
    createTerrainMaterial() {
        // Create a more detailed ground material with brighter color and custom fog handling
        const terrainMaterial = new THREE.MeshStandardMaterial({
            color: 0x9CCC65, // Brighter green color
            roughness: 0.7,
            metalness: 0.1,
            flatShading: false,
            onBeforeCompile: (shader) => {
                // Add custom fog handling to the shader
                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <fog_fragment>',
                    `
                    #include <fog_fragment>
                    // Custom fog handling that reduces fog at higher altitudes
                    // Use a sharper transition to keep fog very low to the ground
                    float heightFactor = 1.0 - smoothstep(0.0, 5.0, vViewPosition.y);
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor * heightFactor);
                    `
                );
            }
        });
        
        return terrainMaterial;
    }
    
    addTreesAndBushes(heightMap, resolution, groundSize) {
        console.log('Adding trees and bushes using instanced meshes for better performance');
        // Target 150,000 trees as requested
        const treeCount = 150000;
        
        console.log(`Attempting to place ${treeCount} trees on terrain...`);
        
        // Use instanced meshes for better performance
        // Create template geometries
        // Make trees 50% wider
        const trunkGeometry = new THREE.CylinderGeometry(3, 4.5, 20, 8); // 50% wider trunk
        const leavesGeometry = new THREE.ConeGeometry(18, 30, 8); // 50% wider cone
        
        // Create materials
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const leavesMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2E8B57,
            roughness: 0.8,
            metalness: 0.0
        });
        
        console.log('Creating instanced meshes for 150,000 trees...');
        
        // Use lower level Three.js APIs for more efficient memory usage
        const trunkMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
        const leavesMesh = new THREE.InstancedMesh(leavesGeometry, leavesMaterial, treeCount);
        
        // Process trees in batches to avoid call stack issues
        const batchSize = 5000; // Process this many trees at a time
        const totalBatches = Math.ceil(treeCount / batchSize);
        let treeInstanceCount = 0;
        
        // Temporary matrix and object for setting positions
        const dummyObject = new THREE.Object3D();
        const matrix = new THREE.Matrix4();
        
        console.log(`Processing trees in ${totalBatches} batches of ${batchSize}...`);
        
        // Track valid height ranges for rapid validation
        const validHeights = [];
        // Sample the height map first to understand valid height ranges
        for (let i = 0; i < 1000; i++) {
            const sampleX = Math.floor(Math.random() * resolution);
            const sampleZ = Math.floor(Math.random() * resolution);
            if (heightMap[sampleZ] && heightMap[sampleZ][sampleX]) {
                validHeights.push(heightMap[sampleZ][sampleX]);
            }
        }
        
        // Calculate height statistics for faster validation
        const minValidHeight = 0.45; // Only place on medium to high ground
        const avgHeight = validHeights.reduce((sum, h) => sum + h, 0) / validHeights.length;
        
        // Get water threshold used in createTerrain
        const waterThreshold = 0.5; // Match the water threshold from createTerrain
        
        // Add a margin above the water threshold to prevent trees at water edges
        const waterMargin = 0.05; // Margin above water level to prevent trees at edges
        const safeTreeHeight = waterThreshold + waterMargin;
        
        console.log(`Height map statistics - min valid: ${minValidHeight}, avg: ${avgHeight}, water threshold: ${waterThreshold}, safe tree height: ${safeTreeHeight}`);
        
        // Process trees in batches
        for (let batch = 0; batch < totalBatches; batch++) {
            console.log(`Processing batch ${batch + 1}/${totalBatches}...`);
            
            // Generate positions for this batch
            const batchPositions = [];
            let attempts = 0;
            const maxAttemptsPerBatch = batchSize * 3; // Allow 3 attempts per desired tree
            
            while (batchPositions.length < batchSize && attempts < maxAttemptsPerBatch) {
                attempts++;
                
                // Random position - distribute across the entire map
                const x = (Math.random() - 0.5) * groundSize * 0.95;
                const z = (Math.random() - 0.5) * groundSize * 0.95;
                
                // Convert to height map coordinates
                const heightMapX = Math.floor((x / groundSize + 0.5) * resolution);
                const heightMapZ = Math.floor((z / groundSize + 0.5) * resolution);
                
                // Fast validation check
                if (heightMapX >= 0 && heightMapX < resolution && 
                    heightMapZ >= 0 && heightMapZ < resolution) {
                    
                    const heightValue = heightMap[heightMapZ][heightMapX];
                    
                    // Check if this point is near water by examining surrounding cells
                    let isNearWater = false;
                    
                    // Check a small surrounding area to detect water proximity
                    const checkRadius = 2; // Check 2 cells in each direction
                    for (let dz = -checkRadius; dz <= checkRadius && !isNearWater; dz++) {
                        for (let dx = -checkRadius; dx <= checkRadius && !isNearWater; dx++) {
                            const checkX = heightMapX + dx;
                            const checkZ = heightMapZ + dz;
                            
                            // Check if the neighbor cell is within bounds
                            if (checkX >= 0 && checkX < resolution && checkZ >= 0 && checkZ < resolution) {
                                if (heightMap[checkZ][checkX] < waterThreshold) {
                                    isNearWater = true;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Only place on medium to high ground AND not in or near water
                    if (heightValue >= minValidHeight && heightValue >= safeTreeHeight && !isNearWater) {
                        const y = heightValue * this.terrainHeightScale;
                        batchPositions.push({ x, y, z });
                        
                        // Break early if we have enough positions for this batch
                        if (batchPositions.length >= batchSize) break;
                    }
                }
            }
            
            // Place trees for this batch
            for (let i = 0; i < batchPositions.length && treeInstanceCount < treeCount; i++) {
                const pos = batchPositions[i];
                
                // Add some size variation to each tree
                const treeScale = 0.8 + Math.random() * 0.4; // 80% to 120% of original size
                
                // Set trunk position and rotation
                dummyObject.position.set(pos.x, pos.y + 10, pos.z);
                dummyObject.rotation.y = Math.random() * Math.PI * 2;
                dummyObject.scale.set(treeScale, treeScale, treeScale);
                dummyObject.updateMatrix();
                
                // Apply to instanced mesh
                trunkMesh.setMatrixAt(treeInstanceCount, dummyObject.matrix);
                
                // Set leaves position
                dummyObject.position.set(pos.x, pos.y + 30, pos.z);
                dummyObject.updateMatrix();
                
                // Apply to instanced mesh
                leavesMesh.setMatrixAt(treeInstanceCount, dummyObject.matrix);
                
                treeInstanceCount++;
            }
            
            // Force garbage collection between batches
            batchPositions.length = 0;
            
            console.log(`Batch ${batch + 1} complete. ${treeInstanceCount} trees placed so far.`);
        }
        
        // Update instance counts
        trunkMesh.count = treeInstanceCount;
        leavesMesh.count = treeInstanceCount;
        
        // Enable shadows
        trunkMesh.castShadow = true;
        trunkMesh.receiveShadow = true;
        leavesMesh.castShadow = true;
        leavesMesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(trunkMesh);
        this.scene.add(leavesMesh);
        
        console.log(`Successfully placed ${treeInstanceCount} out of ${treeCount} trees (50% wider)`);
    }

    addMountains() {
        // Add larger mountain ranges
        const mountainCount = 90 * 4; // Quadrupled from 90 to 360 for 4x map area
        const groundSize = 20000; // Doubled from 10000 to create 4x area
        
        for (let i = 0; i < mountainCount; i++) {
            // Random position throughout the map instead of just edges
            let x = (Math.random() * 2 - 1) * groundSize * 0.45; // Random position across map
            let z = (Math.random() * 2 - 1) * groundSize * 0.45; // Random position across map
            
            // Create jagged mountain
            const mountainBaseRadius = 150 + Math.random() * 350;
            const mountainHeight = 400 + Math.random() * 800;
            
            // Add some clustering for more natural mountain ranges
            const clusterChance = 0.4; // 40% chance of being in a cluster
            if (i > 0 && Math.random() < clusterChance) {
                // Choose a random previous mountain to cluster near
                const previousIndex = Math.floor(Math.random() * i);
                const previousMountain = this.scene.children.find(child => 
                    child.isMesh && 
                    child.userData.isMountain && 
                    child.position.index === previousIndex
                );
                
                if (previousMountain) {
                    // Position near the previous mountain (200-800 units away)
                    const clusterDistance = 200 + Math.random() * 600;
                    const clusterAngle = Math.random() * Math.PI * 2;
                    x = previousMountain.position.x + Math.cos(clusterAngle) * clusterDistance;
                    z = previousMountain.position.z + Math.sin(clusterAngle) * clusterDistance;
                }
            }
            
            // Create jagged mountain using BufferGeometry for more control
            const segments = 16; // Higher segments for more detail
            const noiseStrength = 0.15 + Math.random() * 0.15; // Reduced noise strength
            const radialSegments = 16;
            const heightSegments = 8;
            
            // Create a custom geometry for the jagged mountain
            const mountainGeometry = new THREE.BufferGeometry();
            const positions = [];
            const normals = [];
            const uvs = [];
            const indices = [];
            
            // Create vertices
            // First create the peak - keep it exactly at center
            positions.push(0, mountainHeight, 0);
            normals.push(0, 1, 0);
            uvs.push(0.5, 0);
            
            // Add secondary peaks data - reduce count and influence to avoid geometry issues
            const secondaryPeakCount = Math.floor(Math.random() * 2) + 1; // 1-2 secondary peaks
            const secondaryPeaks = [];
            
            for (let p = 0; p < secondaryPeakCount; p++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = (0.3 + Math.random() * 0.3) * mountainBaseRadius; // Reduced range
                const peakHeight = mountainHeight * (0.4 + Math.random() * 0.2); // Reduced height
                
                secondaryPeaks.push({
                    x: Math.cos(angle) * distance,
                    y: peakHeight,
                    z: Math.sin(angle) * distance,
                    radius: distance * 0.3 // Reduced influence radius
                });
            }
            
            // Create ridge lines connecting peaks - reduce count and influence
            const ridgeLines = [];
            // Connect main peak to all secondary peaks
            for (let p = 0; p < secondaryPeaks.length; p++) {
                ridgeLines.push({
                    start: { x: 0, z: 0 },
                    end: { x: secondaryPeaks[p].x, z: secondaryPeaks[p].z },
                    width: mountainBaseRadius * (0.03 + Math.random() * 0.03), // Reduced width
                    height: Math.random() * 0.1 * mountainHeight // Reduced height
                });
            }
            
            // Reduce secondary peak connections to avoid geometry issues
            if (secondaryPeaks.length >= 2 && Math.random() > 0.5) {
                ridgeLines.push({
                    start: { x: secondaryPeaks[0].x, z: secondaryPeaks[0].z },
                    end: { x: secondaryPeaks[1].x, z: secondaryPeaks[1].z },
                    width: mountainBaseRadius * 0.03,
                    height: Math.random() * 0.05 * mountainHeight
                });
            }
            
            // Create rings of vertices from top to bottom
            for (let y = 0; y < heightSegments; y++) {
                const v = y / heightSegments;
                const radius = mountainBaseRadius * (y / heightSegments);
                const height = mountainHeight * (1 - v * v); // Curved slope
                const yPos = height;
                
                for (let x = 0; x <= radialSegments; x++) {
                    const u = x / radialSegments;
                    const theta = u * Math.PI * 2;
                    
                    // Add randomness to make jagged edges - reduce strength
                    const jaggedness = noiseStrength * mountainBaseRadius * 0.5 * 
                        Math.sin(theta * 4 + v * 15) * Math.sin(v * 8);
                    const radiusNoise = radius + jaggedness;
                    
                    // More noise for peaks and ridges - reduce strength
                    let ridgeNoise = mountainHeight * 0.1 * Math.sin(theta * 3) * Math.sin(v * 8);
                    
                    // Add fractal detail - reduce strength
                    ridgeNoise += mountainHeight * 0.03 * Math.sin(theta * 9) * Math.sin(v * 20);
                    
                    // Position with noise
                    let xPos = Math.cos(theta) * radiusNoise;
                    let zPos = Math.sin(theta) * radiusNoise;
                    
                    // Apply influence from secondary peaks - reduce strength
                    for (const peak of secondaryPeaks) {
                        const dx = xPos - peak.x;
                        const dz = zPos - peak.z;
                        const distToPeak = Math.sqrt(dx * dx + dz * dz);
                        
                        if (distToPeak < peak.radius) {
                            // Calculate influence factor (stronger when closer) - limit influence
                            const influence = Math.min(0.6, 1 - (distToPeak / peak.radius));
                            
                            // Add height based on proximity to secondary peak (stronger at top)
                            ridgeNoise += peak.y * influence * (1 - v) * 0.7;
                        }
                    }
                    
                    // Apply ridge lines influence - reduce strength
                    for (const ridge of ridgeLines) {
                        // Calculate distance to line segment
                        const startToEnd = { 
                            x: ridge.end.x - ridge.start.x,
                            z: ridge.end.z - ridge.start.z
                        };
                        const length = Math.sqrt(startToEnd.x * startToEnd.x + startToEnd.z * startToEnd.z);
                        
                        if (length === 0) continue;
                        
                        // Normalize
                        const dirX = startToEnd.x / length;
                        const dirZ = startToEnd.z / length;
                        
                        // Vector from start to point
                        const startToPoint = {
                            x: xPos - ridge.start.x,
                            z: zPos - ridge.start.z
                        };
                        
                        // Project onto line segment
                        const projection = startToPoint.x * dirX + startToPoint.z * dirZ;
                        const projectionRatio = Math.max(0, Math.min(1, projection / length));
                        
                        // Find closest point on line segment
                        const closestPoint = {
                            x: ridge.start.x + projectionRatio * startToEnd.x,
                            z: ridge.start.z + projectionRatio * startToEnd.z
                        };
                        
                        // Distance to ridge line
                        const dx = xPos - closestPoint.x;
                        const dz = zPos - closestPoint.z;
                        const distToRidge = Math.sqrt(dx * dx + dz * dz);
                        
                        if (distToRidge < ridge.width) {
                            // Apply ridge height increase with falloff from center - reduce influence
                            const ridgeInfluence = (1 - distToRidge / ridge.width) * 
                                                 Math.sin(Math.PI * projectionRatio) * 0.5;
                            ridgeNoise += ridge.height * ridgeInfluence;
                            
                            // Pull points slightly toward ridge line - reduce influence
                            const pullFactor = ridgeInfluence * 0.2;
                            xPos = xPos * (1 - pullFactor) + closestPoint.x * pullFactor;
                            zPos = zPos * (1 - pullFactor) + closestPoint.z * pullFactor;
                        }
                    }
                    
                    // Prevent extreme displacement to avoid self-intersections
                    const maxDisplacement = mountainBaseRadius * 0.15; // Limit displacement
                    const originalX = Math.cos(theta) * radius;
                    const originalZ = Math.sin(theta) * radius;
                    
                    const displacementX = xPos - originalX;
                    const displacementZ = zPos - originalZ;
                    const displacementLength = Math.sqrt(displacementX * displacementX + displacementZ * displacementZ);
                    
                    if (displacementLength > maxDisplacement) {
                        const scale = maxDisplacement / displacementLength;
                        xPos = originalX + displacementX * scale;
                        zPos = originalZ + displacementZ * scale;
                    }
                    
                    // Add position with all noise factors
                    // Also limit the vertical displacement to avoid extreme spikes
                    const maxHeightDisplacement = mountainHeight * 0.2;
                    ridgeNoise = Math.max(-maxHeightDisplacement, Math.min(maxHeightDisplacement, ridgeNoise));
                    
                    positions.push(xPos, yPos + ridgeNoise, zPos);
                    
                    // Calculate better normal based on surrounding vertices
                    // Y normal increases with height and is stronger at the top of the mountain
                    const normalY = 0.4 + 0.6 * (1 - v);
                    
                    // XZ normal points from center outward, scaled by how steep the mountain is
                    const normalLength = Math.sqrt(xPos * xPos + zPos * zPos);
                    
                    if (normalLength > 0) {
                        // For the sides of the mountain, normals should point outward from the center
                        const normalX = xPos / normalLength * (1 - normalY * 0.5);
                        const normalZ = zPos / normalLength * (1 - normalY * 0.5);
                        
                        // Normalize the combined normal
                        const combinedLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
                        normals.push(
                            normalX / combinedLength,
                            normalY / combinedLength,
                            normalZ / combinedLength
                        );
                    } else {
                        // If at center, normal points straight up
                        normals.push(0, 1, 0);
                    }
                    
                    // Add UV
                    uvs.push(u, v);
                }
            }
            
            // Add base vertices with slight irregularity
            for (let x = 0; x <= radialSegments; x++) {
                const u = x / radialSegments;
                const theta = u * Math.PI * 2;
                
                // Use very mild irregularity for the base to ensure stability
                const irregularity = 1 + (Math.random() * 0.06 - 0.03); // ±3% variation
                const radius = mountainBaseRadius * irregularity;
                
                const xPos = Math.cos(theta) * radius;
                const zPos = Math.sin(theta) * radius;
                
                positions.push(xPos, 0, zPos);
                normals.push(0, -1, 0); // Down-facing normal for base
                uvs.push(u, 1);
            }
            
            // Add center point for base to close the bottom
            positions.push(0, 0, 0);
            normals.push(0, -1, 0);
            uvs.push(0.5, 1);
            const bottomCenterIndex = positions.length / 3 - 1;
            
            // Create indices
            // Connect peak to first ring
            for (let x = 0; x < radialSegments; x++) {
                // Use modulo to ensure we don't go out of bounds on the last vertex
                const nextX = (x + 1) % (radialSegments + 1);
                // Make sure triangles face outward
                indices.push(0, nextX + 1, x + 1);
            }
            
            // Connect intermediate rings
            const verticesPerRing = radialSegments + 1;
            for (let y = 0; y < heightSegments - 1; y++) {
                const ringStart = 1 + y * verticesPerRing;
                const nextRingStart = ringStart + verticesPerRing;
                
                for (let x = 0; x < radialSegments; x++) {
                    // Calculate vertex indices with modulo to prevent out of bounds
                    const current = ringStart + x;
                    const next = ringStart + ((x + 1) % radialSegments);
                    const nextRingCurrent = nextRingStart + x;
                    const nextRingNext = nextRingStart + ((x + 1) % radialSegments);
                    
                    // Create two triangles for each quad
                    // Make sure triangles face outward
                    indices.push(current, next, nextRingCurrent);
                    indices.push(next, nextRingNext, nextRingCurrent);
                }
            }
            
            // Connect last ring to base
            const baseStart = 1 + (heightSegments - 1) * verticesPerRing;
            const bottomStart = baseStart + verticesPerRing;
            
            for (let x = 0; x < radialSegments; x++) {
                // Calculate vertex indices with modulo to prevent out of bounds
                const current = baseStart + x;
                const next = baseStart + ((x + 1) % radialSegments);
                const bottomCurrent = bottomStart + x;
                const bottomNext = bottomStart + ((x + 1) % radialSegments);
                
                // Create two triangles for each quad
                // Make sure triangles face outward
                indices.push(current, next, bottomCurrent);
                indices.push(next, bottomNext, bottomCurrent);
            }
            
            // Create triangles to close the bottom face
            for (let x = 0; x < radialSegments; x++) {
                const bottomVertex = bottomStart + x;
                const bottomNextVertex = bottomStart + ((x + 1) % radialSegments);
                // Connect to center point to form a triangle - face downward
                indices.push(bottomCenterIndex, bottomVertex, bottomNextVertex);
            }
            
            // Set attributes
            mountainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            mountainGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            mountainGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            mountainGeometry.setIndex(indices);
            mountainGeometry.computeVertexNormals(); // Recompute for better shading
            
            // Create a gradient texture for the mountain with more snow
            const mountainCanvas = document.createElement('canvas');
            mountainCanvas.width = 256;
            mountainCanvas.height = 256;
            const mountainContext = mountainCanvas.getContext('2d');
            
            // Draw mountain texture gradient with more snow coverage
            const gradient = mountainContext.createLinearGradient(0, 0, 0, 256);
            gradient.addColorStop(0, '#FFFFFF'); // Snow at peak
            gradient.addColorStop(0.4, '#EEEEEE'); // More snow coverage (was 0.2)
            gradient.addColorStop(0.5, '#AAAAAA'); // Rock transitioning from snow
            gradient.addColorStop(0.7, '#776655'); // Rock/dirt
            gradient.addColorStop(1, '#5D4037'); // Dirt at base
            
            mountainContext.fillStyle = gradient;
            mountainContext.fillRect(0, 0, 256, 256);
            
            // Add some snow texture variation
            mountainContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
            for (let j = 0; j < 50; j++) {
                const snowPatchSize = 5 + Math.random() * 20;
                mountainContext.beginPath();
                mountainContext.arc(
                    Math.random() * 256,
                    Math.random() * 256 * 0.5, // Only in top half
                    snowPatchSize,
                    0,
                    Math.PI * 2
                );
                mountainContext.fill();
            }
            
            // Add rock texture variations
            mountainContext.fillStyle = 'rgba(100, 90, 80, 0.7)';
            for (let j = 0; j < 30; j++) {
                const rockSize = 3 + Math.random() * 8;
                mountainContext.beginPath();
                mountainContext.arc(
                    Math.random() * 256,
                    128 + Math.random() * 128, // Bottom half
                    rockSize,
                    0,
                    Math.PI * 2
                );
                mountainContext.fill();
            }
            
            // Create second rock detail layer for more texture
            mountainContext.fillStyle = 'rgba(80, 70, 60, 0.5)';
            for (let j = 0; j < 20; j++) {
                const rockSize = 4 + Math.random() * 10;
                mountainContext.beginPath();
                mountainContext.arc(
                    Math.random() * 256,
                    100 + Math.random() * 156, // Bottom 2/3
                    rockSize,
                    0,
                    Math.PI * 2
                );
                mountainContext.fill();
            }
            
            const mountainTexture = new THREE.CanvasTexture(mountainCanvas);
            const mountainMaterial = new THREE.MeshStandardMaterial({
                map: mountainTexture,
                roughness: 0.9,
                metalness: 0.1,
                vertexColors: false,
                side: THREE.DoubleSide // Show both sides of faces
            });
            
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            mountain.position.set(x, 0, z);
            mountain.castShadow = true;
            mountain.receiveShadow = true;
            mountain.position.index = i; // Track index for clustering
            mountain.userData.isMountain = true; // Mark as mountain for finding later
            
            // Random rotation for more variety
            mountain.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(mountain);
        }
    }

    onWindowResize() {
        // Update renderer and cameras on window resize
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // The camera update will be handled by the aircraft class
    }

    render(camera) {
        if (!camera) return;
        
        // When in performance test mode, disable vsync
        if (this.isUncapped) {
            // These settings help break through the vsync/requestAnimationFrame limit
            this.renderer.setPixelRatio(window.devicePixelRatio || 1);
            this.renderer.setSize(window.innerWidth, window.innerHeight, false); // false to avoid auto-settings
        }
        
        this.renderer.render(this.scene, camera);
    }

    togglePerformanceTest() {
        this.isUncapped = !this.isUncapped;
        if (this.isUncapped) {
            // Start performance test
            this.benchmarkData = {
                fps: [],
                frameTime: [],
                startTime: performance.now()
            };
            this.renderer.setAnimationLoop(null); // Disable default animation loop
            this.uncapFrames();
            this.benchmarkPanel.style.display = 'block';
        } else {
            // End test
            this.benchmarkPanel.style.display = 'none';
        }
    }
    
    uncapFrames() {
        if (!this.isUncapped) return;
        
        this.stats.begin();
        
        // Get current time
        const now = performance.now();
        const elapsed = now - this.lastTime;
        this.lastTime = now;
        
        // Calculate FPS
        const fps = 1000 / elapsed;
        
        // Store data
        this.frameCounter++;
        this.benchmarkData.fps.push(fps);
        this.benchmarkData.frameTime.push(elapsed);
        
        // Update benchmark panel every ~10 frames
        if (this.frameCounter % 10 === 0) {
            const avgFps = this.benchmarkData.fps.slice(-100).reduce((sum, fps) => sum + fps, 0) / 
                           Math.min(this.benchmarkData.fps.length, 100);
            const minFps = Math.min(...this.benchmarkData.fps.slice(-100));
            const maxFps = Math.max(...this.benchmarkData.fps.slice(-100));
            
            this.benchmarkPanel.innerHTML = `
                <div>Current FPS: ${fps.toFixed(1)}</div>
                <div>Avg FPS: ${avgFps.toFixed(1)}</div>
                <div>Min FPS: ${minFps.toFixed(1)}</div>
                <div>Max FPS: ${maxFps.toFixed(1)}</div>
                <div>Frame time: ${elapsed.toFixed(2)}ms</div>
                <div>Test time: ${((now - this.benchmarkData.startTime)/1000).toFixed(0)}s</div>
            `;
        }
        
        // Update aircraft if available
        if (window.aircraftInstance) {
            // Update controls
            if (window.simulatorInstance && window.simulatorInstance.controls) {
                window.simulatorInstance.controls.update();
            }
            
            // Update aircraft with proper delta time
            window.aircraftInstance.update(Math.min(elapsed/1000, 0.1)); // Cap delta time to avoid physics issues
            
            // Update UI
            if (window.simulatorInstance && window.simulatorInstance.ui) {
                window.simulatorInstance.ui.update(window.aircraftInstance, now);
            }
            
            // Render scene
            this.render(window.aircraftInstance.getActiveCamera());
        }
        
        this.stats.end();
        
        // Use setTimeout with 0ms delay to bypass vsync
        setTimeout(() => this.uncapFrames(), 0);
    }
} 