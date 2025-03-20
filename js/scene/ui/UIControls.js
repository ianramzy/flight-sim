class UIControls {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.settingsOpen = false;
        
        // Create the main settings panel
        this.createSettingsPanel();
        
        // Get the existing view toggle button and move it to settings
        this.moveViewToggleToSettings();
        
        // Move controls info to settings
        this.moveControlsInfoToSettings();
    }
    
    createSettingsPanel() {
        // Create settings button
        const settingsButton = document.createElement('button');
        settingsButton.textContent = '⚙️ Settings';
        settingsButton.id = 'settings-toggle';
        settingsButton.style.position = 'fixed';
        settingsButton.style.top = '20px';
        settingsButton.style.left = '20px';
        settingsButton.style.padding = '5px 10px';
        settingsButton.style.background = 'rgba(0, 0, 0, 0.5)';
        settingsButton.style.color = 'white';
        settingsButton.style.border = 'none';
        settingsButton.style.borderRadius = '5px';
        settingsButton.style.cursor = 'pointer';
        settingsButton.style.zIndex = '1001';
        settingsButton.style.fontWeight = 'bold';
        document.body.appendChild(settingsButton);
        
        // Create settings panel
        const settingsPanel = document.createElement('div');
        settingsPanel.id = 'settings-panel';
        settingsPanel.style.position = 'fixed';
        settingsPanel.style.top = '60px';
        settingsPanel.style.left = '20px';
        settingsPanel.style.padding = '15px';
        settingsPanel.style.background = 'rgba(0, 0, 0, 0.5)';
        settingsPanel.style.color = 'white';
        settingsPanel.style.border = 'none';
        settingsPanel.style.borderRadius = '5px';
        settingsPanel.style.zIndex = '1000';
        settingsPanel.style.display = 'none';
        settingsPanel.style.flexDirection = 'column';
        settingsPanel.style.gap = '15px';
        settingsPanel.style.minWidth = '250px';
        settingsPanel.style.maxHeight = '80vh';
        settingsPanel.style.overflowY = 'auto';
        document.body.appendChild(settingsPanel);
        
        // Settings header
        const header = document.createElement('div');
        header.innerHTML = '<h3 style="margin: 0 0 10px 0; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.3); padding-bottom: 5px;">Settings</h3>';
        settingsPanel.appendChild(header);
        
        // Create controls sections
        const controlsSection = this.createControlSection('Controls');
        const viewSection = this.createControlSection('View Controls');
        const lightingSection = this.createControlSection('Lighting');
        const fogSection = this.createControlSection('Fog Controls');
        const mistSection = this.createControlSection('Mist Controls');
        
        // Add sections to panel
        settingsPanel.appendChild(controlsSection);
        settingsPanel.appendChild(viewSection);
        settingsPanel.appendChild(lightingSection);
        settingsPanel.appendChild(fogSection);
        settingsPanel.appendChild(mistSection);
        
        // Store references to sections for later use
        this.controlsSection = controlsSection;
        this.viewSection = viewSection;
        this.lightingSection = lightingSection;
        this.fogSection = fogSection;
        this.mistSection = mistSection;
        
        // Add lighting toggle
        this.createLightingToggle(lightingSection);
        
        // Add fog controls
        this.createFogControls(fogSection);
        
        // Add mist controls
        this.createMistControls(mistSection);
        
        // Toggle settings panel
        settingsButton.addEventListener('click', () => {
            this.settingsOpen = !this.settingsOpen;
            settingsPanel.style.display = this.settingsOpen ? 'flex' : 'none';
        });
    }
    
    createControlSection(title) {
        const section = document.createElement('div');
        section.style.display = 'flex';
        section.style.flexDirection = 'column';
        section.style.gap = '10px';
        section.style.padding = '10px';
        section.style.background = 'rgba(0, 0, 0, 0.3)';
        section.style.borderRadius = '5px';
        
        const titleElem = document.createElement('div');
        titleElem.textContent = title;
        titleElem.style.fontWeight = 'bold';
        titleElem.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
        titleElem.style.paddingBottom = '5px';
        section.appendChild(titleElem);
        
        return section;
    }
    
    moveViewToggleToSettings() {
        // Get the existing view toggle
        const viewToggle = document.getElementById('view-toggle');
        
        if (viewToggle) {
            // Remove it from its current position
            viewToggle.remove();
            
            // Reset its styles for our panel
            viewToggle.style.position = 'static';
            viewToggle.style.margin = '5px 0';
            viewToggle.style.width = '100%';
            viewToggle.style.border = 'none';
            viewToggle.style.borderRadius = '5px';
            viewToggle.style.display = 'block';
            
            // Add to our view section
            this.viewSection.appendChild(viewToggle);
        }
    }
    
    moveControlsInfoToSettings() {
        // Create comprehensive controls list
        const controlsDiv = document.createElement('div');
        
        // Add title
        const title = document.createElement('h3');
        title.textContent = 'Controls';
        title.style.margin = '0 0 10px 0';
        controlsDiv.appendChild(title);
        
        // Create list of controls
        const controlsList = [
            { key: 'W / S', action: 'Pitch Down / Up' },
            { key: 'A / D', action: 'Yaw Left / Right' },
            { key: 'Shift', action: 'Increase Throttle' },
            { key: 'Ctrl', action: 'Decrease Throttle' }
        ];
        
        // Add each control to the div
        controlsList.forEach(control => {
            const controlItem = document.createElement('div');
            controlItem.style.display = 'flex';
            controlItem.style.justifyContent = 'space-between';
            controlItem.style.margin = '5px 0';
            
            const keySpan = document.createElement('span');
            keySpan.textContent = control.key;
            keySpan.style.fontWeight = 'bold';
            keySpan.style.marginRight = '10px';
            
            const actionSpan = document.createElement('span');
            actionSpan.textContent = control.action;
            
            controlItem.appendChild(keySpan);
            controlItem.appendChild(actionSpan);
            controlsDiv.appendChild(controlItem);
        });
        
        // Remove the original controls info element if it exists
        const controlsInfo = document.getElementById('controls-info');
        if (controlsInfo) {
            controlsInfo.remove();
        }
        
        // Add the controls content to our controls section
        this.controlsSection.appendChild(controlsDiv);
    }
    
    createLightingToggle(container) {
        // Create a button for toggling lighting
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Switch to Daytime'; // Updated for sunset default
        toggleButton.style.padding = '5px 10px';
        toggleButton.style.background = 'rgba(0, 0, 0, 0.5)';
        toggleButton.style.color = 'white';
        toggleButton.style.border = 'none';
        toggleButton.style.borderRadius = '5px';
        toggleButton.style.cursor = 'pointer';
        toggleButton.style.width = '100%';
        
        // Add event listener for toggle
        toggleButton.addEventListener('click', () => {
            const newMode = this.sceneManager.lighting.toggleLightingMode();
            toggleButton.textContent = newMode === 'sunset' ? 'Switch to Daytime' : 'Switch to Sunset';
            
            // Update dependent systems
            this.sceneManager.skybox.updateFog();
            this.sceneManager.mist.updateMistColors();
        });
        
        container.appendChild(toggleButton);
    }
    
    createFogControls(container) {
        // Create slider for fog density
        const fogSlider = document.createElement('input');
        fogSlider.type = 'range';
        fogSlider.min = '0';
        fogSlider.max = '5';
        fogSlider.step = '0.1';
        fogSlider.value = this.sceneManager.skybox.getFogDensity();
        fogSlider.style.width = '100%';
        
        // Value display
        const fogValueDisplay = document.createElement('div');
        fogValueDisplay.textContent = `Fog: ${this.sceneManager.skybox.getFogDensity()}`;
        fogValueDisplay.style.textAlign = 'center';
        
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
        resetButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        resetButton.style.color = 'white';
        resetButton.style.border = 'none';
        resetButton.style.borderRadius = '5px';
        resetButton.style.width = '100%';
        
        resetButton.addEventListener('click', () => {
            this.sceneManager.skybox.setFogDensity(1.5);
            fogSlider.value = 1.5;
            fogValueDisplay.textContent = `Fog: ${1.5.toFixed(1)}`;
        });
        
        // Add elements to container
        container.appendChild(fogSlider);
        container.appendChild(fogValueDisplay);
        container.appendChild(resetButton);
    }
    
    createMistControls(container) {
        // Create slider for mist intensity
        const mistSlider = document.createElement('input');
        mistSlider.type = 'range';
        mistSlider.min = '0';
        mistSlider.max = '2';
        mistSlider.step = '0.1';
        mistSlider.value = this.sceneManager.mist.getMistIntensity();
        mistSlider.style.width = '100%';
        
        // Value display
        const mistValueDisplay = document.createElement('div');
        mistValueDisplay.textContent = `Intensity: ${this.sceneManager.mist.getMistIntensity().toFixed(1)}`;
        mistValueDisplay.style.textAlign = 'center';
        
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
        toggleMistButton.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        toggleMistButton.style.color = 'white';
        toggleMistButton.style.border = 'none';
        toggleMistButton.style.borderRadius = '5px';
        toggleMistButton.style.width = '100%';
        
        toggleMistButton.addEventListener('click', () => {
            const newState = !this.sceneManager.mist.getMistEnabled();
            this.sceneManager.mist.setMistEnabled(newState);
            toggleMistButton.textContent = newState ? 'Disable Mist' : 'Enable Mist';
        });
        
        // Add elements to container
        container.appendChild(mistSlider);
        container.appendChild(mistValueDisplay);
        container.appendChild(toggleMistButton);
    }
}

export { UIControls }; 