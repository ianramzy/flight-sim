class MountainGenerator {
    constructor(scene) {
        this.scene = scene;
        this.onLoaded = null; // Callback function for loading completion
        this.addMountains();
    }
    
    addMountains() {
        try {
            // Add larger mountain ranges
            const mountainCount = 360; // 90 mountains * 4 for the large map area
            const groundSize = 20000; // Match the terrain ground size
            
            for (let i = 0; i < mountainCount; i++) {
                // Random position throughout the map instead of just edges
                let x = (Math.random() * 2 - 1) * groundSize * 0.45; // Random position across map
                let z = (Math.random() * 2 - 1) * groundSize * 0.45; // Random position across map
                
                // Create jagged mountain
                const mountainBaseRadius = 150 + Math.random() * 550;
                const mountainHeight = 300 + Math.random() * 1000;
                
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
            
            console.log('Mountains generation complete');
        } catch (error) {
            console.error('Error generating mountains:', error);
        } finally {
            // Signal that mountains are loaded, even if there was an error
            if (typeof this.onLoaded === 'function') {
                console.log('MountainGenerator signaling onLoaded callback');
                this.onLoaded();
            }
        }
    }
}

export { MountainGenerator }; 