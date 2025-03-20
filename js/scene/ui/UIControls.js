class UIControls {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.createLightingToggle();
        this.createFogControls();
        this.createMistControls();
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
            const newMode = this.sceneManager.lighting.toggleLightingMode();
            toggleButton.textContent = newMode === 'sunset' ? 'Switch to Daytime' : 'Switch to Sunset';
            
            // Update dependent systems
            this.sceneManager.skybox.updateFog();
            this.sceneManager.mist.updateMistColors();
        });
        
        document.body.appendChild(toggleButton);
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
        fogSlider.value = this.sceneManager.skybox.getFogDensity();
        fogSlider.style.width = '150px';
        
        // Value display
        const fogValueDisplay = document.createElement('div');
        fogValueDisplay.textContent = `Fog: ${this.sceneManager.skybox.getFogDensity()}`;
        
        // Add event listener
        fogSlider.addEventListener('input', (event) => {
            const newDensity = parseFloat(event.target.value);
            this.sceneManager.skybox.setFogDensity(newDensity);
            fogValueDisplay.textContent = `Fog: ${newDensity.toFixed(1)}`;
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
            this.sceneManager.skybox.setFogDensity(1.5);
            fogSlider.value = 1.5;
            fogValueDisplay.textContent = `Fog: ${1.5.toFixed(1)}`;
        });
        
        // Add elements to container
        fogControlContainer.appendChild(fogSlider);
        fogControlContainer.appendChild(fogValueDisplay);
        fogControlContainer.appendChild(resetButton);
        
        // Add to document
        document.body.appendChild(fogControlContainer);
    }
    
    createMistControls() {
        // Create container for mist controls
        const mistControlContainer = document.createElement('div');
        mistControlContainer.style.position = 'fixed';
        mistControlContainer.style.bottom = '20px';
        mistControlContainer.style.right = '200px'; // Position next to fog controls
        mistControlContainer.style.padding = '10px';
        mistControlContainer.style.background = 'rgba(0, 0, 0, 0.5)';
        mistControlContainer.style.color = 'white';
        mistControlContainer.style.border = '1px solid white';
        mistControlContainer.style.zIndex = '1000';
        mistControlContainer.style.display = 'flex';
        mistControlContainer.style.flexDirection = 'column';
        mistControlContainer.style.alignItems = 'center';
        mistControlContainer.style.gap = '5px';
        
        // Add label
        const mistLabel = document.createElement('div');
        mistLabel.textContent = 'Valley Mist';
        mistControlContainer.appendChild(mistLabel);
        
        // Create slider for mist intensity
        const mistSlider = document.createElement('input');
        mistSlider.type = 'range';
        mistSlider.min = '0';
        mistSlider.max = '2';
        mistSlider.step = '0.1';
        mistSlider.value = this.sceneManager.mist.getMistIntensity();
        mistSlider.style.width = '150px';
        
        // Value display
        const mistValueDisplay = document.createElement('div');
        mistValueDisplay.textContent = `Intensity: ${this.sceneManager.mist.getMistIntensity().toFixed(1)}`;
        
        // Add event listener
        mistSlider.addEventListener('input', (event) => {
            const intensity = parseFloat(event.target.value);
            this.sceneManager.mist.setMistIntensity(intensity);
            mistValueDisplay.textContent = `Intensity: ${intensity.toFixed(1)}`;
        });
        
        // Toggle button for enabling/disabling mist
        const toggleMistButton = document.createElement('button');
        toggleMistButton.textContent = this.sceneManager.mist.getMistEnabled() ? 'Disable Mist' : 'Enable Mist';
        toggleMistButton.style.padding = '5px';
        toggleMistButton.style.cursor = 'pointer';
        toggleMistButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        toggleMistButton.style.color = 'white';
        toggleMistButton.style.border = '1px solid white';
        
        toggleMistButton.addEventListener('click', () => {
            const newState = !this.sceneManager.mist.getMistEnabled();
            this.sceneManager.mist.setMistEnabled(newState);
            toggleMistButton.textContent = newState ? 'Disable Mist' : 'Enable Mist';
        });
        
        // Add elements to container
        mistControlContainer.appendChild(mistSlider);
        mistControlContainer.appendChild(mistValueDisplay);
        mistControlContainer.appendChild(toggleMistButton);
        
        // Add to document
        document.body.appendChild(mistControlContainer);
    }
}

export { UIControls }; 