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
        for (let i = 0; i < 100; i++) {
            const x = (Math.random() - 0.5) * 5000;
            const y = 500 + Math.random() * 1000;
            const z = (Math.random() - 0.5) * 5000;
            
            this.clouds.push({
                position: new THREE.Vector3(x, y, z),
                size: 100 + Math.random() * 200
            });
        }
    }
    
    addCloudsToScene(scene) {
        // Create cloud material
        const cloudMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            flatShading: true
        });
        
        // Add clouds to the scene
        this.clouds.forEach(cloud => {
            // Create a simple cloud shape made of several spheres
            const cloudGroup = new THREE.Group();
            
            const sphereCount = 5 + Math.floor(Math.random() * 5);
            const baseSize = cloud.size / 10;
            
            for (let i = 0; i < sphereCount; i++) {
                const sphereGeometry = new THREE.SphereGeometry(
                    baseSize + Math.random() * baseSize,
                    8, 8
                );
                const sphereMesh = new THREE.Mesh(sphereGeometry, cloudMaterial);
                
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
            scene.add(cloudGroup);
        });
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