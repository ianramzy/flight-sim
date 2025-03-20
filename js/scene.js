class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        this.setupLights();
        this.createSkybox();
        this.createTerrain();
        this.addMountains();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    setupLights() {
        // Ambient light - reduced to make shadows more pronounced
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
        
        // Add a helper to visualize the light direction (for debugging)
        // const helper = new THREE.DirectionalLightHelper(directionalLight, 10);
        // this.scene.add(helper);
    }

    createSkybox() {
        // Create a more visually appealing sky with gradient
        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition + offset).y;
                gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
            }
        `;

        const uniforms = {
            topColor: { value: new THREE.Color(0x0077FF) },
            bottomColor: { value: new THREE.Color(0xAAAAAA) },
            offset: { value: 400 },
            exponent: { value: 0.6 }
        };

        const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }

    createTerrain() {
        console.log('Creating terrain with steep hills and canyons');
        // Create terrain with rolling hills
        const groundSize = 10000;
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
                
                // Add color based on height for better visual cues
                const heightRatio = height / heightScale;
                // Colors for Hollywood hills - brown for lower parts, greener for higher
                const r = 0.5 - heightRatio * 0.2; // Less red for higher areas
                const g = 0.4 + heightRatio * 0.3; // More green for higher areas
                const b = 0.2 + heightRatio * 0.1; // Slight blue increase for higher areas
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
        terrainGeometry.computeVertexNormals();
        
        // Track lake positions
        this.lakePositions = [];
        
        // Identify potential lake areas (low spots)
        for (let z = 0; z < heightMapSize; z++) {
            for (let x = 0; x < heightMapSize; x++) {
                const lakeLevelThreshold = 0.25;
                if (heightMap[z][x] < lakeLevelThreshold) {
                    // Convert to world coordinates
                    const worldX = (x / resolution - 0.5) * groundSize;
                    const worldZ = (z / resolution - 0.5) * groundSize;
                    const worldY = heightMap[z][x] * heightScale;
                    
                    this.lakePositions.push({
                        x: worldX,
                        y: worldY,
                        z: worldZ,
                        radius: 50 + Math.random() * 150
                    });
                }
            }
        }
        
        // Create terrain material with vertex colors for better visual cues
        const terrainMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,  // Use vertex colors
            roughness: 0.8,
            metalness: 0.2,
            flatShading: true    // Makes the hills more visible with sharp edges
        });
        
        // Create and position the terrain mesh
        const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
        terrain.receiveShadow = true;
        terrain.castShadow = true;
        terrain.name = 'terrain';
        
        this.scene.add(terrain);
        
        // Add a simple flat ground plane underneath as a fallback (much lower now)
        const groundGeometry = new THREE.PlaneGeometry(groundSize * 2, groundSize * 2);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x5D4037,  // Brown color for the ground
            roughness: 0.9,
            metalness: 0.0
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -50; // Much lower below the terrain
        ground.receiveShadow = true;
        ground.name = 'ground';
        
        this.scene.add(ground);
        
        // Save the height scale for other methods to use
        this.terrainHeightScale = heightScale;
        
        // Add wireframe overlay to make terrain more visible
        const wireframe = new THREE.WireframeGeometry(terrainGeometry);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            opacity: 0.2,
            transparent: true
        });
        const terrainWireframe = new THREE.LineSegments(wireframe, lineMaterial);
        this.scene.add(terrainWireframe);
        
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
            if (filteredLakes.length > 15 || Math.random() > 0.2) continue;
            
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
            // Lake surface (water)
            const lakeGeometry = new THREE.CircleGeometry(lake.radius, 32);
            const lakeMaterial = new THREE.MeshStandardMaterial({
                color: 0x1E88E5, // Blue water color
                roughness: 0.0,
                metalness: 0.1,
                transparent: true,
                opacity: 0.8
            });
            
            const lakeMesh = new THREE.Mesh(lakeGeometry, lakeMaterial);
            lakeMesh.rotation.x = -Math.PI / 2; // Rotate to be horizontal
            lakeMesh.position.set(lake.x, lake.y + 2, lake.z); // Slightly above terrain to avoid z-fighting
            lakeMesh.receiveShadow = true;
            
            this.scene.add(lakeMesh);
        }
    }
    
    addTreesAndBushes(heightMap, resolution, groundSize) {
        console.log('Adding trees and bushes');
        const treeCount = 300;
        const bushCount = 500;
        
        // Track tree heights for debugging
        const treeHeights = [];
        
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
                
                // Only place trees on medium to high ground (not on lakes or mountains)
                if (heightMap[heightMapZ][heightMapX] < 0.3 || heightMap[heightMapZ][heightMapX] > 0.7) {
                    continue;
                }
            } else {
                continue;
            }
            
            // Store tree heights for debugging
            treeHeights.push(y);
            
            // Create tree group
            const treeGroup = new THREE.Group();
            
            // Tree trunk (brown cylinder)
            const trunkGeometry = new THREE.CylinderGeometry(2, 3, 20, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.9,
                metalness: 0.1
            }); // Brown color
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            
            // Tree leaves (green cone) - make taller for more visibility
            const leavesGeometry = new THREE.ConeGeometry(12, 30, 8);
            const leavesMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x2E8B57,
                roughness: 0.8,
                metalness: 0.0
            }); // Green color
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = 22; // Position on top of trunk
            leaves.castShadow = true;
            leaves.receiveShadow = true;
            
            // Add trunk and leaves to tree group
            treeGroup.add(trunk);
            treeGroup.add(leaves);
            
            // Position the tree on the terrain - raise slightly to prevent z-fighting
            treeGroup.position.set(x, y + 0.5, z);
            
            // Add some random rotation for variety
            treeGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Add tree to scene
            this.scene.add(treeGroup);
        }
        
        // Log tree height stats
        if (treeHeights.length > 0) {
            console.log('Tree heights - min:', Math.min(...treeHeights), 'max:', Math.max(...treeHeights), 'avg:', treeHeights.reduce((a, b) => a + b, 0) / treeHeights.length);
        } else {
            console.log('No trees were placed');
        }
        
        // Track bush heights for debugging
        const bushHeights = [];
        
        // Add bushes (mostly on lower ground)
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
                
                // Avoid placing bushes in lake areas or very high
                if (heightMap[heightMapZ][heightMapX] < 0.25 || heightMap[heightMapZ][heightMapX] > 0.8) {
                    continue;
                }
            } else {
                continue;
            }
            
            // Store bush heights for debugging
            bushHeights.push(y);
            
            // Create bush (simple sphere with slightly more complex material)
            const bushGeometry = new THREE.SphereGeometry(3 + Math.random() * 2, 8, 8);
            const bushMaterial = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color(0.2 + Math.random() * 0.1, 0.5 + Math.random() * 0.2, 0.2),
                roughness: 0.8,
                metalness: 0.1
            });
            
            const bush = new THREE.Mesh(bushGeometry, bushMaterial);
            bush.position.set(x, y + 2, z); // Position slightly above terrain
            bush.castShadow = true;
            bush.receiveShadow = true;
            
            // Add random scale for variety
            const scale = 0.5 + Math.random() * 0.5;
            bush.scale.set(scale, scale * 0.8, scale); // Make slightly flatter
            
            // Add random rotation
            bush.rotation.y = Math.random() * Math.PI * 2;
            
            this.scene.add(bush);
        }
        
        // Log bush height stats
        if (bushHeights.length > 0) {
            console.log('Bush heights - min:', Math.min(...bushHeights), 'max:', Math.max(...bushHeights), 'avg:', bushHeights.reduce((a, b) => a + b, 0) / bushHeights.length);
        } else {
            console.log('No bushes were placed');
        }
    }

    addMountains() {
        // Add larger mountain ranges
        const mountainCount = 15;
        const groundSize = 10000;
        
        for (let i = 0; i < mountainCount; i++) {
            // Random position near edges of the map for mountains
            const distance = groundSize * 0.4; // Distance from center
            const angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * distance * Math.random();
            const z = Math.sin(angle) * distance * Math.random();
            
            // Create mountain
            const mountainSize = 150 + Math.random() * 350;
            const mountainHeight = 300 + Math.random() * 700;
            
            const mountainGeometry = new THREE.ConeGeometry(mountainSize, mountainHeight, 8);
            
            // Create a gradient texture for the mountain
            const mountainCanvas = document.createElement('canvas');
            mountainCanvas.width = 256;
            mountainCanvas.height = 256;
            const mountainContext = mountainCanvas.getContext('2d');
            
            // Draw mountain texture gradient
            const gradient = mountainContext.createLinearGradient(0, 0, 0, 256);
            gradient.addColorStop(0, '#FFFFFF'); // Snow at peak
            gradient.addColorStop(0.2, '#AAAAAA'); // Rock
            gradient.addColorStop(0.6, '#776655'); // Rock/dirt
            gradient.addColorStop(1, '#5D4037'); // Dirt at base
            
            mountainContext.fillStyle = gradient;
            mountainContext.fillRect(0, 0, 256, 256);
            
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
            
            this.scene.add(mountain);
        }
    }

    onWindowResize() {
        // Update renderer and cameras on window resize
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // The camera update will be handled by the aircraft class
    }

    render(camera) {
        this.renderer.render(this.scene, camera);
    }
} 