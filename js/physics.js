class Physics {
    constructor() {
        // Constants for physics calculations
        this.gravity = 9.81; // m/s²
        this.airDensity = 1.225; // kg/m³ at sea level
        
        // Cloud system
        this.clouds = [];
        this.createClouds();
    }
    
    createClouds() {
        // Create a cloud system with random positions
        // Map size expanded from 10000 to 20000, so we need 4x the clouds to maintain density
        
        // Create cloud layers at different heights
        const layers = [
            { height: 500, count: 150 },
            { height: 1000, count: 150 },
            { height: 1500, count: 100 }
        ];
        
        // Total is still 400 clouds, distributed in layers
        layers.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                const x = (Math.random() - 0.5) * 20000;
                const y = layer.height + Math.random() * 200; // Variation within layer
                const z = (Math.random() - 0.5) * 20000;
                
                this.clouds.push({
                    position: new THREE.Vector3(x, y, z),
                    size: 100 + Math.random() * 200,
                    layer: layer.height
                });
            }
        });
    }
    
    addCloudsToScene(scene) {
        console.log("Adding clouds to scene, total clouds:", this.clouds.length);
        
        // Create cloud material
        const cloudMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            flatShading: true
        });
        
        // Create reusable geometries
        const sphereGeometries = [];
        for (let i = 0; i < 5; i++) {
            const baseSize = 10 + i * 5;
            sphereGeometries.push(new THREE.SphereGeometry(baseSize, 8, 8));
        }
        
        // For better performance, use instance meshes for clouds that are far away
        // and detailed meshes for closer clouds
        
        // Create instanced mesh for distant clouds
        const simpleCloudGeometry = new THREE.SphereGeometry(30, 8, 8);
        const simpleCloudMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            flatShading: true
        });
        
        // Determine max number of instances needed
        const maxInstances = this.clouds.length;
        const instancedMesh = new THREE.InstancedMesh(
            simpleCloudGeometry, 
            simpleCloudMaterial,
            maxInstances
        );
        
        // Temp object for position/rotation/scale
        const dummyObject = new THREE.Object3D();
        let instanceCount = 0;
        
        // Separate close and distant clouds
        const closeCloudCutoff = 5000; // Clouds closer than this get detailed rendering
        const closeDistanceClouds = this.clouds.filter(cloud => 
            new THREE.Vector3().copy(cloud.position).length() < closeCloudCutoff
        );
        const distantClouds = this.clouds.filter(cloud => 
            new THREE.Vector3().copy(cloud.position).length() >= closeCloudCutoff
        );
        
        console.log(`Cloud distribution: ${closeDistanceClouds.length} close, ${distantClouds.length} distant`);
        
        // Add detailed clouds for closer distances
        closeDistanceClouds.forEach(cloud => {
            // Create a simple cloud shape made of several spheres
            const cloudGroup = new THREE.Group();
            
            const sphereCount = 5 + Math.floor(Math.random() * 5);
            const baseSize = cloud.size / 10;
            
            for (let i = 0; i < sphereCount; i++) {
                // Use one of the pre-created geometries for better performance
                const sphereIndex = Math.floor(Math.random() * sphereGeometries.length);
                const sphereGeometry = sphereGeometries[sphereIndex];
                const sphereMesh = new THREE.Mesh(sphereGeometry, cloudMaterial);
                
                // Scale based on cloud size
                const scale = (baseSize + Math.random() * baseSize) / 10;
                sphereMesh.scale.set(scale, scale, scale);
                
                // Position spheres randomly to form a cloud shape
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * cloud.size * 0.6,
                    (Math.random() - 0.5) * cloud.size * 0.2,
                    (Math.random() - 0.5) * cloud.size * 0.6
                );
                
                sphereMesh.position.copy(offset);
                cloudGroup.add(sphereMesh);
            }
            
            cloudGroup.position.copy(cloud.position);
            
            // Add a bit of random rotation for variety
            cloudGroup.rotation.y = Math.random() * Math.PI * 2;
            
            scene.add(cloudGroup);
        });
        
        // Handle distant clouds with instanced mesh
        distantClouds.forEach(cloud => {
            if (instanceCount < maxInstances) {
                dummyObject.position.copy(cloud.position);
                
                // Random scale based on cloud size
                const scale = cloud.size / 100;
                dummyObject.scale.set(scale, scale * 0.5, scale);
                
                dummyObject.rotation.y = Math.random() * Math.PI * 2;
                dummyObject.updateMatrix();
                
                instancedMesh.setMatrixAt(instanceCount, dummyObject.matrix);
                instanceCount++;
            }
        });
        
        // Update instance count
        instancedMesh.count = instanceCount;
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        // Add the instance mesh to the scene
        scene.add(instancedMesh);
        
        // Log info about clouds
        console.log(`Added ${this.clouds.length} clouds covering the expanded map (${instanceCount} instances)`);
    }
    
    // Calculate lift based on airspeed and angle of attack
    calculateLift(velocity, angleOfAttack, wingArea) {
        const airspeed = velocity.length();
        const liftCoefficient = 0.3 + (angleOfAttack * 0.1); // Simplified lift coefficient
        return 0.5 * this.airDensity * airspeed * airspeed * wingArea * liftCoefficient;
    }
    
    // Calculate drag based on airspeed
    calculateDrag(velocity, frontalArea, dragCoefficient) {
        const airspeed = velocity.length();
        return 0.5 * this.airDensity * airspeed * airspeed * frontalArea * dragCoefficient;
    }
} 