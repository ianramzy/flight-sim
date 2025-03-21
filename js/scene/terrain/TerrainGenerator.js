class TerrainGenerator {
    constructor(scene) {
        this.scene = scene;
        this.terrainHeightScale = 250; // Default height scale for terrain
        this.onLoaded = null; // Callback function for loading completion
        
        this.createTerrain();
    }
    
    createTerrain() {
        try {
            // Use consistent groundSize across the application
            const groundSize = 20000; // Size for terrain
            console.log('Creating terrain with ground size:', groundSize);
            console.log('Creating terrain with steep hills and canyons');
            
            // Create terrain with rolling hills
            const resolution = 256; // Resolution for terrain
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
            const heightScale = this.terrainHeightScale; // Increased for more dramatic hills
            
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
            
            // Add trees and bushes
            this.addTreesAndBushes(heightMap, resolution, groundSize);
            
            // Add water surface
            this.createWaterSurface(heightMap, resolution, groundSize, waterThreshold, heightScale);
            
            // Store the height map for other modules to use
            this.heightMap = heightMap;
            this.resolution = resolution;
            this.groundSize = groundSize;
            
            console.log('Terrain generation complete');
        } catch (error) {
            console.error('Error generating terrain:', error);
        } finally {
            // Signal that terrain is loaded, even if there was an error
            if (typeof this.onLoaded === 'function') {
                console.log('TerrainGenerator signaling onLoaded callback');
                this.onLoaded();
            }
        }
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
    
    // Method to provide access to the terrain data
    getTerrainData() {
        return {
            heightMap: this.heightMap,
            resolution: this.resolution,
            groundSize: this.groundSize,
            heightScale: this.terrainHeightScale
        };
    }
    
    // Method to get terrain height at a specific world position
    getHeightAt(worldX, worldZ) {
        // Check if we have height map data
        if (!this.heightMap || !this.resolution || !this.groundSize) {
            console.warn('Height map data not available');
            return 0;
        }
        
        // Convert world position to heightmap coordinates
        const halfSize = this.groundSize / 2;
        const normalizedX = (worldX + halfSize) / this.groundSize;
        const normalizedZ = (worldZ + halfSize) / this.groundSize;
        
        // Convert to height map indices
        const heightMapX = Math.floor(normalizedX * (this.resolution - 1));
        const heightMapZ = Math.floor(normalizedZ * (this.resolution - 1));
        
        // Check if within bounds
        if (heightMapX < 0 || heightMapX >= this.resolution || 
            heightMapZ < 0 || heightMapZ >= this.resolution) {
            return 0; // Return 0 for out of bounds
        }
        
        // Get height from height map
        const heightValue = this.heightMap[heightMapZ][heightMapX];
        
        // Apply height scale
        return heightValue * this.terrainHeightScale;
    }
}

export { TerrainGenerator }; 