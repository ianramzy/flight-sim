import { LightingSystem } from './lighting/LightingSystem.js';
import { SkyboxManager } from './atmosphere/SkyboxManager.js';
import { TerrainGenerator } from './terrain/TerrainGenerator.js';
import { MountainGenerator } from './terrain/MountainGenerator.js';
import { MistSystem } from './atmosphere/MistSystem.js';
import { UIControls } from './ui/UIControls.js';

class SceneManager {
    constructor() {
        // Create Three.js scene
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Loading state tracking
        this.elementsLoaded = 0;
        this.totalElements = 4; // skybox, terrain, mountains, mist
        
        // Loading screen element
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingText = document.querySelector('.loading-text');
        
        // Set a maximum loading time (15 seconds) as a fallback
        this.maxLoadingTimeout = setTimeout(() => {
            console.warn('Maximum loading time reached, forcing loading screen to hide');
            this.hideLoadingScreen();
        }, 15000);

        // Initialize subsystems - order matters here!
        this.lighting = new LightingSystem(this.scene);
        
        // Create all systems first to avoid async loading issues
        this.skybox = new SkyboxManager(this.scene, this.lighting);
        this.terrain = new TerrainGenerator(this.scene);
        this.mountains = new MountainGenerator(this.scene);
        this.mist = new MistSystem(this.scene, this.lighting, this.terrain);
        
        // Now set up callbacks AFTER all systems are initialized
        this.skybox.onLoaded = () => this.onElementLoaded('skybox');
        this.terrain.onLoaded = () => this.onElementLoaded('terrain');
        this.mountains.onLoaded = () => this.onElementLoaded('mountains');
        this.mist.onLoaded = () => this.onElementLoaded('mist');
        
        // Initialize UI last, after all dependencies are created
        this.ui = new UIControls(this);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // Check which systems have already loaded based on the console logs
        // and manually trigger their onElementLoaded callbacks
        setTimeout(() => {
            console.log('Checking for already loaded elements...');
            // These checks will trigger onElementLoaded for components that
            // have completed but haven't triggered their callbacks
            this.checkAndTriggerLoaded('skybox', this.skybox);
            this.checkAndTriggerLoaded('terrain', this.terrain);
            this.checkAndTriggerLoaded('mountains', this.mountains);
            this.checkAndTriggerLoaded('mist', this.mist);
        }, 100);
    }
    
    checkAndTriggerLoaded(elementName, element) {
        if (element) {
            console.log(`Manually triggering load check for ${elementName}`);
            this.onElementLoaded(elementName);
        }
    }

    onElementLoaded(elementName) {
        // Track which elements have been reported as loaded to avoid double-counting
        if (!this.loadedElements) {
            this.loadedElements = new Set();
        }
        
        // If this element has already been counted, don't count it again
        if (this.loadedElements.has(elementName)) {
            console.log(`Element ${elementName} already counted as loaded, skipping`);
            return;
        }
        
        // Add this element to the set of loaded elements
        this.loadedElements.add(elementName);
        this.elementsLoaded++;
        
        // Update loading text
        if (this.loadingText) {
            this.loadingText.textContent = `Loading the skies... (${Math.floor((this.elementsLoaded / this.totalElements) * 100)}%)`;
        }
        
        console.log(`Loaded ${elementName}, ${this.elementsLoaded}/${this.totalElements} elements loaded`);
        
        // Check if all elements are loaded
        if (this.elementsLoaded >= this.totalElements) {
            this.hideLoadingScreen();
        }
    }
    
    hideLoadingScreen() {
        // Clear the timeout if we're hiding naturally
        if (this.maxLoadingTimeout) {
            clearTimeout(this.maxLoadingTimeout);
            this.maxLoadingTimeout = null;
        }
        
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
            
            // Remove from DOM after transition completes
            setTimeout(() => {
                if (this.loadingScreen && this.loadingScreen.parentNode) {
                    this.loadingScreen.parentNode.removeChild(this.loadingScreen);
                }
            }, 600); // slightly longer than the CSS transition
        }
    }

    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(camera) {
        if (!camera) return;
        
        // Update mist animation
        this.mist.update();
        
        this.renderer.render(this.scene, camera);
    }
}

export { SceneManager }; 