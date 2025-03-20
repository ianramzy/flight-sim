import { LightingSystem } from './lighting/LightingSystem.js';
import { SkyboxManager } from './atmosphere/SkyboxManager.js';
import { TerrainGenerator } from './terrain/TerrainGenerator.js';
import { MountainGenerator } from './terrain/MountainGenerator.js';
import { MistSystem } from './atmosphere/MistSystem.js';
import { UIControls } from './ui/UIControls.js';
import { PerformanceMonitor } from './performance/PerformanceMonitor.js';

class SceneManager {
    constructor() {
        // Create Three.js scene
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Initialize subsystems - order matters here!
        this.performance = new PerformanceMonitor(this);
        this.lighting = new LightingSystem(this.scene);
        this.skybox = new SkyboxManager(this.scene, this.lighting);
        this.terrain = new TerrainGenerator(this.scene);
        this.mountains = new MountainGenerator(this.scene);
        this.mist = new MistSystem(this.scene, this.lighting, this.terrain);
        
        // Initialize UI last, after all dependencies are created
        this.ui = new UIControls(this);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(camera) {
        if (!camera) return;
        
        // Update mist animation
        this.mist.update();
        
        // When in performance test mode, disable vsync
        if (this.performance.isUncapped) {
            // These settings help break through the vsync/requestAnimationFrame limit
            this.renderer.setPixelRatio(window.devicePixelRatio || 1);
            this.renderer.setSize(window.innerWidth, window.innerHeight, false);
        }
        
        this.renderer.render(this.scene, camera);
    }
}

export { SceneManager }; 