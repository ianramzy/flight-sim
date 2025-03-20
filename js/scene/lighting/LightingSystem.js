class LightingSystem {
    constructor(scene) {
        this.scene = scene;
        this.lightingMode = 'sunset'; // Default to sunset mode
        
        this.setupLights();
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
        
        return this.lightingMode;
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
    
    getLightingMode() {
        return this.lightingMode;
    }
}

export { LightingSystem }; 