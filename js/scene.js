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
        
        // Update lake colors
        this.updateLakeColors();
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
    
    updateLakeColors() {
        // Find all lake meshes and update their colors
        this.scene.children.forEach(child => {
            if (child.isMesh && child.material && 
                (child.material.opacity === 0.85 || child.material.opacity === 0.8) && 
                child.material.transparent) {
                
                // Create a fresh color to avoid accumulation
                const color = this.lightingMode === 'sunset' ? 0xFF9966 : 0x4287f5;
                
                // Reset and update material properties
                child.material.color.set(color);
                child.material.metalness = this.lightingMode === 'sunset' ? 0.4 : 0.2;
                child.material.needsUpdate = true;
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
        const groundSize = 10000; // Consistent scale definition
        console.log('World scale values:');
        console.log('- Ground size: ' + groundSize);
        console.log('- Fog distance: ' + (1/0.00015) + ' units'); // Log fog visibility distance
        
        this.updateSkybox(groundSize);
        
        // Add fog to create distance haze effect
        this.updateFog(groundSize);
    }
    
    updateSkybox(groundSize) {
        // Use consistent groundSize for skybox calculation
        groundSize = groundSize || 10000; // Default if not provided
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
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                
                // Calculate distance from camera for fog
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vDistance = -mvPosition.z;
                
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
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    vec3 skyColor;
                    
                    if (h > 0.15) {
                        skyColor = mix(middleColor, topColor, max(pow((h - 0.15) / 0.85, exponent), 0.0));
                    } else {
                        skyColor = mix(bottomColor, middleColor, max(pow(h / 0.15, exponent), 0.0));
                    }
                    
                    // Apply fog
                    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vDistance * vDistance);
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
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    vec3 skyColor = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                    
                    // Apply fog
                    float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vDistance * vDistance);
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
            fog: true // Enable fog for the skybox
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
        console.log('Added skybox with radius:', skyboxRadius, 'and fog density:', fogDensity);
    }

    updateFog(groundSize) {
        // Use consistent groundSize for fog calculation
        groundSize = groundSize || 10000; // Default if not provided
        const fogDensity = this.fogDensityFactor / groundSize; // Use the fog density factor from the slider
        
        console.log('Updating fog with density:', fogDensity, 'factor:', this.fogDensityFactor);
        
        // Create fog that matches the skybox colors
        if (this.lightingMode === 'sunset') {
            // Sunset fog - warm orange/pink tint
            this.scene.fog = new THREE.FogExp2(0xFF8844, fogDensity);
        } else {
            // Daytime fog - light blue/white tint
            this.scene.fog = new THREE.FogExp2(0xCCDDFF, fogDensity);
        }
        
        // Update skybox with new fog settings
        this.updateSkybox(groundSize);
    }

    createTerrain() {
        // Use consistent groundSize across the application
        const groundSize = 10000;
        console.log('Creating terrain with ground size:', groundSize);
        console.log('Creating terrain with steep hills and canyons');
        // Create terrain with rolling hills
        const resolution = 128; // Higher resolution for better detail
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
                
                // Add color based on height for better visual cues
                const heightRatio = height / heightScale;
                // Apply more subtle color variations that won't overpower the texture
                const r = 0.95 - heightRatio * 0.05; // Very subtle variation
                const g = 0.95 + heightRatio * 0.05; // Very subtle variation
                const b = 0.95 - heightRatio * 0.05; // Very subtle variation
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
        
        // Track lake positions
        this.lakePositions = [];
        
        // Identify potential lake areas (low spots)
        for (let z = 0; z < heightMapSize; z++) {
            for (let x = 0; x < heightMapSize; x++) {
                const lakeLevelThreshold = 0.75; // Increased from 0.25 to allow lakes at higher elevations
                if (heightMap[z][x] < lakeLevelThreshold) {
                    // Convert to world coordinates
                    const worldX = (x / resolution - 0.5) * groundSize;
                    const worldZ = (z / resolution - 0.5) * groundSize;
                    const worldY = heightMap[z][x] * heightScale;
                    
                    this.lakePositions.push({
                        x: worldX,
                        y: worldY,
                        z: worldZ,
                        radius: 30 + Math.random() * 120
                    });
                }
            }
        }
        
        // Create terrain material with vertex colors for better visual cues
        const terrainMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,  // Use vertex colors
            roughness: 0.9,      // Increased roughness for grass
            metalness: 0.0,      // No metalness for natural look
            flatShading: false,  // Smooth shading for more natural look
            map: null            // Will set this later
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
        
        // Add lakes, trees and bushes
        this.addLakes();
        this.addTreesAndBushes(heightMap, resolution, groundSize);
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
    
    createTerrainMaterial() {
        // Create a more detailed ground material with brighter color
        const terrainMaterial = new THREE.MeshStandardMaterial({
            color: 0x9CCC65, // Brighter green color
            roughness: 0.7,
            metalness: 0.1,
            flatShading: false
        });
        
        return terrainMaterial;
    }
    
    addLakes() {
        // Process and filter lake positions to avoid overlapping
        const filteredLakes = [];
        
        // Sort lakes by size (largest first)
        this.lakePositions.sort((a, b) => b.radius - a.radius);
        
        // Filter to avoid overlapping lakes (keep only the largest in an area)
        for (let i = 0; i < this.lakePositions.length; i++) {
            let overlap = false;
            
            // Only process some of the potential lake positions to avoid having too many
            // Increased probability from 0.2 to 0.5 to create more lakes
            if (filteredLakes.length > 30 || Math.random() > 0.5) continue;
            
            // Check if this lake overlaps with any existing filtered lake
            for (let j = 0; j < filteredLakes.length; j++) {
                const dx = this.lakePositions[i].x - filteredLakes[j].x;
                const dz = this.lakePositions[i].z - filteredLakes[j].z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance < this.lakePositions[i].radius + filteredLakes[j].radius + 50) {
                    overlap = true;
                    break;
                }
            }
            
            if (!overlap) {
                filteredLakes.push(this.lakePositions[i]);
            }
        }
        
        // Create lakes
        for (const lake of filteredLakes) {
            // Lake surface (water) - blue color for daytime, will be updated if in sunset mode
            const lakeGeometry = new THREE.CircleGeometry(lake.radius, 32);
            const lakeMaterial = new THREE.MeshStandardMaterial({
                color: this.lightingMode === 'sunset' ? 0xFF9966 : 0x4287f5, // Blue for daytime, orange for sunset
                roughness: 0.0,
                metalness: this.lightingMode === 'sunset' ? 0.4 : 0.2,
                transparent: true,
                opacity: 0.85
            });
            
            const lakeMesh = new THREE.Mesh(lakeGeometry, lakeMaterial);
            lakeMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
            lakeMesh.position.set(lake.x, lake.y, lake.z); // Position exactly at terrain height, not above it
            lakeMesh.receiveShadow = true;
            
            this.scene.add(lakeMesh);
        }
    }
    
    addTreesAndBushes(heightMap, resolution, groundSize) {
        console.log('Adding trees and bushes using instanced meshes for better performance');
        // Increase vegetation density
        const treeCount = 5000 * 5; // Increased from 5000 to 25000
        const bushCount = 8000 * 10; // Increased from 8000 to 80000
        
        // Use instanced meshes for better performance
        // Create template geometries
        const trunkGeometry = new THREE.CylinderGeometry(2, 3, 20, 8);
        const leavesGeometry = new THREE.ConeGeometry(12, 30, 8);
        const bushGeometry = new THREE.SphereGeometry(3, 8, 8);
        
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
        
        const bushMaterial = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            roughness: 0.8,
            metalness: 0.1,
            vertexColors: true
        });
        
        // Create instanced meshes
        const trunkMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeCount);
        const leavesMesh = new THREE.InstancedMesh(leavesGeometry, leavesMaterial, treeCount);
        // const bushMesh = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount); // Commenting out bush mesh
        
        // Set up for instanced rendering
        const dummyObject = new THREE.Object3D();
        
        // Track tree heights for debugging
        const treeHeights = [];
        let treeInstanceCount = 0;
        
        // Add trees on higher ground
        for (let i = 0; i < treeCount; i++) {
            // Random position
            const x = (Math.random() - 0.5) * groundSize * 0.8;
            const z = (Math.random() - 0.5) * groundSize * 0.8;
            
            // Convert to height map coordinates
            const heightMapX = Math.floor((x / groundSize + 0.5) * resolution);
            const heightMapZ = Math.floor((z / groundSize + 0.5) * resolution);
            
            // Check height and only place trees on medium-high ground
            let y = 0;
            if (heightMapX >= 0 && heightMapX < resolution && heightMapZ >= 0 && heightMapZ < resolution) {
                // Use the same height scale as defined in createTerrain
                y = heightMap[heightMapZ][heightMapX] * this.terrainHeightScale;
                
                // Only place trees on medium to high ground (not on lakes)
                if (heightMap[heightMapZ][heightMapX] < 0.45) { // Only avoid lakes, allow trees in canyons
                    continue;
                }
            } else {
                continue;
            }
            
            // Store tree heights for debugging
            treeHeights.push(y);
            
            // Set trunk position and rotation
            dummyObject.position.set(x, y + 10, z); // Position trunk with Y offset for proper placement
            dummyObject.rotation.y = Math.random() * Math.PI * 2;
            dummyObject.updateMatrix();
            
            // Apply to instanced mesh
            trunkMesh.setMatrixAt(treeInstanceCount, dummyObject.matrix);
            
            // Set leaves position
            dummyObject.position.set(x, y + 32, z); // Position leaves above trunk
            dummyObject.updateMatrix();
            
            // Apply to instanced mesh
            leavesMesh.setMatrixAt(treeInstanceCount, dummyObject.matrix);
            
            treeInstanceCount++;
            
            // Break early if we've reached the limit
            if (treeInstanceCount >= treeCount) break;
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
        
        // Log tree placement stats
        if (treeHeights.length > 0) {
            console.log('Tree heights - min:', Math.min(...treeHeights), 'max:', Math.max(...treeHeights), 'avg:', treeHeights.reduce((a, b) => a + b, 0) / treeHeights.length);
            console.log('Trees placed: ' + treeInstanceCount);
        } else {
            console.log('No trees were placed');
        }
        
        // Track bush heights for debugging
        const bushHeights = [];
        let bushInstanceCount = 0;
        
        // Add bushes (mostly on lower ground)
        /* Commenting out bushes for now
        for (let i = 0; i < bushCount; i++) {
            // Random position
            const x = (Math.random() - 0.5) * groundSize * 0.9;
            const z = (Math.random() - 0.5) * groundSize * 0.9;
            
            // Convert to height map coordinates
            const heightMapX = Math.floor((x / groundSize + 0.5) * resolution);
            const heightMapZ = Math.floor((z / groundSize + 0.5) * resolution);
            
            // Check height and avoid placing bushes in lakes
            let y = 0;
            if (heightMapX >= 0 && heightMapX < resolution && heightMapZ >= 0 && heightMapZ < resolution) {
                // Use the same height scale as defined in createTerrain
                y = heightMap[heightMapZ][heightMapX] * this.terrainHeightScale;
                
                // Avoid placing bushes in lake areas
                if (heightMap[heightMapZ][heightMapX] < 0.75) { // Updated to match lake threshold of 0.75
                    continue;
                }
            } else {
                continue;
            }
            
            // Store bush heights for debugging
            bushHeights.push(y);
            
            // Random scale for variety
            const scale = 0.5 + Math.random() * 0.5;
            
            // Set bush position, scale, and rotation
            dummyObject.position.set(x, y + 3, z); // Position with Y offset for proper placement
            dummyObject.scale.set(scale, scale * 0.8, scale); // Make slightly flatter
            dummyObject.rotation.y = Math.random() * Math.PI * 2;
            dummyObject.updateMatrix();
            
            // Apply to instanced mesh
            bushMesh.setMatrixAt(bushInstanceCount, dummyObject.matrix);
            
            // Set color
            bushMesh.setColorAt(bushInstanceCount, new THREE.Color(
                0.2 + Math.random() * 0.1,
                0.5 + Math.random() * 0.2,
                0.2
            ));
            
            bushInstanceCount++;
            
            // Break early if we've reached the limit
            if (bushInstanceCount >= bushCount) break;
        }
        
        // Update instance count
        bushMesh.count = bushInstanceCount;
        
        // Enable shadows
        bushMesh.castShadow = true;
        bushMesh.receiveShadow = true;
        
        // Add to scene
        this.scene.add(bushMesh);
        
        // Log bush height stats
        if (bushHeights.length > 0) {
            console.log('Bush heights - min:', Math.min(...bushHeights), 'max:', Math.max(...bushHeights), 'avg:', bushHeights.reduce((a, b) => a + b, 0) / bushHeights.length);
            console.log('Bushes placed: ' + bushInstanceCount);
        } else {
            console.log('No bushes were placed');
        }
        */
    }

    addMountains() {
        // Add larger mountain ranges
        const mountainCount = 90; // Increased from 30 to 90 (3x as many)
        const groundSize = 10000;
        
        for (let i = 0; i < mountainCount; i++) {
            // Random position throughout the map instead of just edges
            let x = (Math.random() * 2 - 1) * groundSize * 0.45; // Random position across map
            let z = (Math.random() * 2 - 1) * groundSize * 0.45; // Random position across map
            
            // Create mountain
            const mountainSize = 150 + Math.random() * 350;
            const mountainHeight = 400 + Math.random() * 800; // Increased height
            
            // Add some clustering for more natural mountain ranges
            const clusterChance = 0.4; // 40% chance of being in a cluster
            if (i > 0 && Math.random() < clusterChance) {
                // Choose a random previous mountain to cluster near
                const previousIndex = Math.floor(Math.random() * i);
                const previousMountain = this.scene.children.find(child => 
                    child.isMesh && 
                    child.geometry instanceof THREE.ConeGeometry && 
                    child.position.y > 200 &&
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
            
            const mountainGeometry = new THREE.ConeGeometry(mountainSize, mountainHeight, 8);
            
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
            for (let j = 0; j < 20; j++) {
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
            
            const mountainTexture = new THREE.CanvasTexture(mountainCanvas);
            const mountainMaterial = new THREE.MeshStandardMaterial({
                map: mountainTexture,
                roughness: 0.9,
                metalness: 0.1
            });
            
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            mountain.position.set(x, mountainHeight / 2, z);
            mountain.castShadow = true;
            mountain.receiveShadow = true;
            mountain.position.index = i; // Track index for clustering
            
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