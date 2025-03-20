class PerformanceMonitor {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        
        // Setup performance monitoring
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        // Move the stats panel to bottom right
        this.stats.dom.style.position = 'absolute';
        this.stats.dom.style.bottom = '0px';
        this.stats.dom.style.right = '0px';
        this.stats.dom.style.top = 'auto';
        this.stats.dom.style.left = 'auto';
        document.body.appendChild(this.stats.dom);
        
        // Performance testing state
        this.isUncapped = false;
        this.frameCounter = 0;
        this.lastTime = performance.now();
        this.benchmarkData = {
            fps: [],
            frameTime: [],
            startTime: 0
        };
        
        this.createPerformanceTestButton();
    }
    
    createPerformanceTestButton() {
        // Create button to toggle performance mode
        const perfButton = document.createElement('button');
        perfButton.textContent = 'Uncap FPS';
        perfButton.style.position = 'fixed';
        perfButton.style.top = '20px';
        perfButton.style.left = '250px'; // Position to the right of the lighting toggle
        perfButton.style.padding = '5px 10px';
        perfButton.style.background = 'rgba(0, 0, 0, 0.5)';
        perfButton.style.color = 'white';
        perfButton.style.border = '1px solid white';
        perfButton.style.borderRadius = '0px';
        perfButton.style.cursor = 'pointer';
        perfButton.style.zIndex = '1000';
        
        // Add benchmark panel
        this.benchmarkPanel = document.createElement('div');
        this.benchmarkPanel.style.position = 'fixed';
        this.benchmarkPanel.style.bottom = '20px';
        this.benchmarkPanel.style.left = '20px';
        this.benchmarkPanel.style.padding = '10px';
        this.benchmarkPanel.style.background = 'rgba(0, 0, 0, 0.5)';
        this.benchmarkPanel.style.color = 'white';
        this.benchmarkPanel.style.border = '1px solid white';
        this.benchmarkPanel.style.fontFamily = 'monospace';
        this.benchmarkPanel.style.display = 'none';
        this.benchmarkPanel.style.zIndex = '1000';
        document.body.appendChild(this.benchmarkPanel);
        
        // Add event listener for toggle
        perfButton.addEventListener('click', () => {
            this.togglePerformanceTest();
            perfButton.textContent = this.isUncapped ? 'Cap FPS' : 'Uncap FPS';
        });
        
        document.body.appendChild(perfButton);
    }
    
    togglePerformanceTest() {
        this.isUncapped = !this.isUncapped;
        if (this.isUncapped) {
            // Start performance test
            this.benchmarkData = {
                fps: [],
                frameTime: [],
                startTime: performance.now()
            };
            this.renderer = this.sceneManager.renderer;
            this.renderer.setAnimationLoop(null); // Disable default animation loop
            this.uncapFrames();
            this.benchmarkPanel.style.display = 'block';
        } else {
            // End test
            this.benchmarkPanel.style.display = 'none';
        }
    }
    
    uncapFrames() {
        if (!this.isUncapped) return;
        
        this.stats.begin();
        
        // Get current time
        const now = performance.now();
        const elapsed = now - this.lastTime;
        this.lastTime = now;
        
        // Calculate FPS
        const fps = 1000 / elapsed;
        
        // Store data
        this.frameCounter++;
        this.benchmarkData.fps.push(fps);
        this.benchmarkData.frameTime.push(elapsed);
        
        // Update benchmark panel every ~10 frames
        if (this.frameCounter % 10 === 0) {
            const avgFps = this.benchmarkData.fps.slice(-100).reduce((sum, fps) => sum + fps, 0) / 
                           Math.min(this.benchmarkData.fps.length, 100);
            const minFps = Math.min(...this.benchmarkData.fps.slice(-100));
            const maxFps = Math.max(...this.benchmarkData.fps.slice(-100));
            
            this.benchmarkPanel.innerHTML = `
                <div>Current FPS: ${fps.toFixed(1)}</div>
                <div>Avg FPS: ${avgFps.toFixed(1)}</div>
                <div>Min FPS: ${minFps.toFixed(1)}</div>
                <div>Max FPS: ${maxFps.toFixed(1)}</div>
                <div>Frame time: ${elapsed.toFixed(2)}ms</div>
                <div>Test time: ${((now - this.benchmarkData.startTime)/1000).toFixed(0)}s</div>
            `;
        }
        
        // Update aircraft if available
        if (window.aircraftInstance) {
            // Update controls
            if (window.simulatorInstance && window.simulatorInstance.controls) {
                window.simulatorInstance.controls.update();
            }
            
            // Update aircraft with proper delta time
            window.aircraftInstance.update(Math.min(elapsed/1000, 0.1)); // Cap delta time to avoid physics issues
            
            // Update UI
            if (window.simulatorInstance && window.simulatorInstance.ui) {
                window.simulatorInstance.ui.update(window.aircraftInstance, now);
            }
            
            // Render scene
            this.sceneManager.render(window.aircraftInstance.getActiveCamera());
        }
        
        this.stats.end();
        
        // Use setTimeout with 0ms delay to bypass vsync
        setTimeout(() => this.uncapFrames(), 0);
    }
}

export { PerformanceMonitor }; 