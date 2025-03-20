class HotAirBalloon {
    constructor(scene) {
        this.scene = scene;
        this.balloons = [];
        this.onLoaded = null; // Callback function for loading completion
        this.createBalloons();
    }
    
    createBalloons() {
        try {
            // Create several hot air balloons at different positions
            const balloonCount = 15;
            const groundSize = 20000; // Match the terrain size
            
            for (let i = 0; i < balloonCount; i++) {
                // Create random position
                const x = (Math.random() * 2 - 1) * groundSize * 0.35;
                const z = (Math.random() * 2 - 1) * groundSize * 0.35;
                // Random height between 200 and 600
                const y = 200 + Math.random() * 400;
                
                // Create balloon model using simple geometry
                const balloon = this.createBalloonModel();
                balloon.position.set(x, y, z);
                
                // Add some data for animation
                balloon.userData = {
                    baseHeight: y,
                    bobSpeed: 0.2 + Math.random() * 0.3, // Random speed between 0.2 and 0.5
                    bobAmount: 10 + Math.random() * 15,  // Random amount between 10 and 25
                    timeOffset: Math.random() * Math.PI * 2 // Random phase offset
                };
                
                this.balloons.push(balloon);
                this.scene.add(balloon);
            }
            
            console.log(`Created ${balloonCount} hot air balloons`);
            
            // Use setTimeout to ensure the onLoaded callback is called after all balloons are created
            setTimeout(() => {
                if (this.onLoaded) {
                    this.onLoaded();
                }
            }, 50);
            
        } catch (error) {
            console.error("Error creating hot air balloons:", error);
        }
    }
    
    createBalloonModel() {
        // Create a group to hold all balloon parts
        const balloonGroup = new THREE.Group();
        
        // Create balloon envelope (the big inflated part)
        const balloonRadius = 20;
        const balloonGeometry = new THREE.SphereGeometry(balloonRadius, 16, 16);
        
        // Slightly squash the balloon to make it more balloon-shaped
        balloonGeometry.scale(1, 1.2, 1);
        
        // Random balloon color
        const hue = Math.random();
        const balloonMaterial = new THREE.MeshPhongMaterial({ 
            color: new THREE.Color().setHSL(hue, 0.8, 0.6),
            shininess: 30
        });
        
        const balloonMesh = new THREE.Mesh(balloonGeometry, balloonMaterial);
        balloonMesh.castShadow = true;
        balloonMesh.receiveShadow = true;
        balloonGroup.add(balloonMesh);
        
        // Add some stripes or patterns to the balloon
        this.addBalloonPatterns(balloonMesh, hue);
        
        // Create basket
        const basketWidth = 8;
        const basketHeight = 6;
        const basketGeometry = new THREE.BoxGeometry(basketWidth, basketHeight, basketWidth);
        const basketMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8B4513,  // Brown color for basket
            shininess: 5
        });
        
        const basketMesh = new THREE.Mesh(basketGeometry, basketMaterial);
        basketMesh.position.y = -balloonRadius * 1.5;
        basketMesh.castShadow = true;
        basketMesh.receiveShadow = true;
        balloonGroup.add(basketMesh);
        
        // Create ropes connecting balloon to basket
        const ropeColor = 0x888888;
        const ropeRadius = 0.3;
        
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const xOffset = Math.cos(angle) * balloonRadius * 0.7;
            const zOffset = Math.sin(angle) * balloonRadius * 0.7;
            
            const ropeHeight = balloonRadius * 1.5 - basketHeight / 2;
            const ropeGeometry = new THREE.CylinderGeometry(ropeRadius, ropeRadius, ropeHeight, 8);
            const ropeMaterial = new THREE.MeshBasicMaterial({ color: ropeColor });
            
            const rope = new THREE.Mesh(ropeGeometry, ropeMaterial);
            rope.position.set(xOffset, -balloonRadius * 0.75, zOffset);
            rope.rotation.x = Math.PI / 2;
            balloonGroup.add(rope);
        }
        
        return balloonGroup;
    }
    
    addBalloonPatterns(balloonMesh, baseHue) {
        // Create stripes or patterns on the balloon
        // This is a simplified approach - for a more detailed balloon, you might use textures
        
        // Increase probability of pattern 0 (rings/stripes) to 80% as the user likes it
        // Reduce patterns 1 and 2 to 10% each
        const rand = Math.random();
        const pattern = rand < 0.8 ? 0 : (rand < 0.9 ? 1 : 2);
        
        if (pattern === 0) {
            // Add stripes/rings
            const stripeCount = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < stripeCount; i++) {
                const stripeHeight = 5 + Math.random() * 5;
                const y = -10 + i * 10;
                
                const stripeGeometry = new THREE.TorusGeometry(balloonMesh.geometry.parameters.radius * 1.01, stripeHeight / 2, 8, 32);
                
                // Create contrasting color for stripe
                const stripeMaterial = new THREE.MeshPhongMaterial({
                    color: new THREE.Color().setHSL((baseHue + 0.5) % 1, 0.8, 0.6),
                    shininess: 30
                });
                
                const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
                stripe.rotation.x = Math.PI / 2;
                stripe.position.y = y;
                balloonMesh.add(stripe);
            }
        } else if (pattern === 1) {
            // Add better-looking vertical panels without cone appearance
            const panelCount = 6 + Math.floor(Math.random() * 4);
            const balloonRadius = balloonMesh.geometry.parameters.radius;
            
            for (let i = 0; i < panelCount; i++) {
                const angle = (i / panelCount) * Math.PI * 2;
                const nextAngle = ((i + 1) / panelCount) * Math.PI * 2;
                const angleSize = nextAngle - angle;
                
                // Create panels using curved planes instead of cones
                // Use a Box geometry with custom UV mapping instead of cylinder
                const width = 2 * Math.sin(angleSize / 2) * balloonRadius;
                const height = balloonRadius * 2 * 1.2; // Match the squashed balloon height
                
                const panelGeometry = new THREE.PlaneGeometry(width, height, 4, 8);
                
                // Bend the plane to follow balloon curvature
                const verts = panelGeometry.attributes.position;
                const midAngle = angle + angleSize / 2;
                
                for (let v = 0; v < verts.count; v++) {
                    const x = verts.getX(v);
                    const y = verts.getY(v);
                    const z = verts.getZ(v);
                    
                    // Calculate distance from center of plane
                    const distFromCenter = x;
                    const angleOffset = (distFromCenter / width) * angleSize;
                    
                    // Calculate new position on circle
                    const curveRadius = Math.sqrt(balloonRadius * balloonRadius - y * y);
                    const vertAngle = midAngle + angleOffset;
                    
                    verts.setX(v, Math.cos(vertAngle) * curveRadius);
                    verts.setZ(v, Math.sin(vertAngle) * curveRadius);
                }
                
                // Alternate panel colors
                const panelMaterial = new THREE.MeshPhongMaterial({
                    color: i % 2 === 0 
                        ? new THREE.Color().setHSL(baseHue, 0.8, 0.6)
                        : new THREE.Color().setHSL((baseHue + 0.1) % 1, 0.8, 0.7),
                    shininess: 30,
                    side: THREE.DoubleSide
                });
                
                const panel = new THREE.Mesh(panelGeometry, panelMaterial);
                balloonMesh.add(panel);
            }
        }
        // For pattern === 2, we just keep the solid color
    }
    
    update() {
        // Animate balloons - bob up and down
        const time = performance.now() / 1000; // Current time in seconds
        
        for (const balloon of this.balloons) {
            const userData = balloon.userData;
            
            // Simple bobbing motion using sin wave
            const yOffset = Math.sin(time * userData.bobSpeed + userData.timeOffset) * userData.bobAmount;
            balloon.position.y = userData.baseHeight + yOffset;
            
            // Slight rotation for a drifting effect
            balloon.rotation.y = Math.sin(time * 0.1 + userData.timeOffset) * 0.05;
        }
    }
}

export { HotAirBalloon }; 