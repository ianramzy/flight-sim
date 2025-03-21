import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';

class EffectsSystem {
    constructor(scene) {
        this.scene = scene;
        this.hitEffects = [];
        this.muzzleFlashes = [];
        this.bulletTrails = [];
        this.lastShakeTime = 0;
        this.shakeIntensity = 0;
        this.shakeDecay = 5.0; // How quickly the shake effect decays
        
        // Create textures
        this.particleTexture = this.createParticleTexture();
        this.smokeTexture = this.createSmokeTexture();
    }
    
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createSmokeTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Create base radial gradient
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(150, 150, 150, 0.8)');
        gradient.addColorStop(0.4, 'rgba(120, 120, 120, 0.6)');
        gradient.addColorStop(0.7, 'rgba(100, 100, 100, 0.2)');
        gradient.addColorStop(1, 'rgba(80, 80, 80, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        // Add some noise for smoke texture
        for (let i = 0; i < 800; i++) {
            const x = Math.random() * 128;
            const y = Math.random() * 128;
            const size = 1 + Math.random() * 3;
            const alpha = Math.random() * 0.05;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }
    
    createHitEffect(position, isAircraft, objectVelocity = null) {
        // Create particle system for impact
        // For aircraft/terrain, increase particle count
        const isTerrain = position.y <= 0.5 && !isAircraft; // Detect if this is a terrain hit (low height and not aircraft)
        const particleCount = isTerrain ? 50 : (isAircraft ? 120 : 30); // Reduced particles for terrain
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        const particleColors = new Float32Array(particleCount * 3);
        const particleVelocities = [];
        
        // Different colors based on target type
        let baseColor;
        if (isTerrain) {
            baseColor = new THREE.Color(0xaaaaaa); // Gray dust for terrain
        } else if (isAircraft) {
            baseColor = new THREE.Color(0xff5500); // Orange/red for aircraft
        } else {
            baseColor = new THREE.Color(0xffcc00); // Yellow for balloons
        }
        
        // Create particles
        for (let i = 0; i < particleCount; i++) {
            // Initial position at impact point with slight random offset
            // For terrain, create wider but smaller spread for dust cloud effect
            const spreadRadius = isTerrain ? 4 : (isAircraft ? 6 : 3);
            particlePositions[i * 3] = position.x + (Math.random() - 0.5) * spreadRadius;
            particlePositions[i * 3 + 1] = position.y + (Math.random() - 0.5) * spreadRadius * 0.5; // Flatter for terrain
            particlePositions[i * 3 + 2] = position.z + (Math.random() - 0.5) * spreadRadius;
            
            // Random size for each particle - smaller for terrain
            particleSizes[i] = isTerrain ? 
                (2 + Math.random() * 3) : (isAircraft ? 
                    (5 + Math.random() * 7) : 
                    (3 + Math.random() * 4));
            
            // Color with slight variation
            const colorVariation = isTerrain ? 0.15 : 0.2;
            const color = baseColor.clone();
            color.r += (Math.random() - 0.5) * colorVariation;
            color.g += (Math.random() - 0.5) * colorVariation;
            color.b += (Math.random() - 0.5) * colorVariation;
            
            particleColors[i * 3] = color.r;
            particleColors[i * 3 + 1] = color.g;
            particleColors[i * 3 + 2] = color.b;
            
            // Random velocity in all directions
            // For terrain, create more outward dust effect with less upward movement
            let speed, elevation;
            if (isTerrain) {
                speed = 4 + Math.random() * 8; // Slower for terrain
                // More horizontal distribution for dust
                elevation = (Math.random() * Math.PI / 4) - Math.PI / 8; // -22.5 to +22.5 degrees
            } else if (isAircraft) {
                speed = 10 + Math.random() * 25;
                elevation = Math.random() * Math.PI - Math.PI/2;
            } else {
                speed = 5 + Math.random() * 15;
                elevation = Math.random() * Math.PI - Math.PI/2;
            }
                
            const angle = Math.random() * Math.PI * 2;
            
            const velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed,
                Math.sin(angle) * Math.cos(elevation) * speed
            );
            
            // Add target object velocity if provided
            if (objectVelocity) {
                velocity.addScaledVector(objectVelocity, 0.7);
            }
            
            particleVelocities.push(velocity);
        }
        
        // Set attributes
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        // Create material
        const particleMaterial = new THREE.PointsMaterial({
            size: isTerrain ? 6 : (isAircraft ? 10 : 5), // Smaller size for terrain
            map: isTerrain ? this.smokeTexture : this.particleTexture,
            blending: isTerrain ? THREE.NormalBlending : THREE.AdditiveBlending, // Normal blending for dust
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });
        
        // Create the particle system
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particleSystem);
        
        // Add hit marker (a ring that expands)
        // Make the ring smaller for terrain hits
        const ringRadius = isTerrain ? 1 : (isAircraft ? 2 : 1);
        const ringThickness = isTerrain ? 2 : (isAircraft ? 4 : 2);
        const ringGeometry = new THREE.RingGeometry(ringRadius, ringRadius + ringThickness, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: isTerrain ? 0xcccccc : (isAircraft ? 0xff0000 : 0xffcc00),
            transparent: true,
            opacity: isTerrain ? 0.3 : 0.7, // More transparent for terrain
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        
        // Orient the ring to face the camera
        ring.lookAt(new THREE.Vector3(0, 0, 0));
        ring.position.copy(position);
        this.scene.add(ring);
        
        // Store effect data
        this.hitEffects.push({
            particles: particleSystem,
            velocities: particleVelocities,
            ring: ring,
            ringScale: 1,
            lifetime: 0,
            maxLifetime: isTerrain ? 0.8 : (isAircraft ? 1.5 : 1.2), // Shorter lifetime for terrain
            isAircraft: isAircraft,
            isTerrain: isTerrain
        });
        
        // Return true to indicate success
        return true;
    }
    
    createMuzzleFlash(gun, playerVelocity = null) {
        if (!gun) return null; // Guard against undefined gun
        
        // Get world position of the gun
        const gunWorldPosition = new THREE.Vector3();
        try {
            gun.getWorldPosition(gunWorldPosition);
        } catch (error) {
            console.warn("Error getting gun position:", error);
            return null; // Return early if we can't get the position
        }
        
        // Get forward direction from gun
        const forward = new THREE.Vector3(0, 0, 1);
        try {
            gun.parent.localToWorld(forward.add(gun.position));
            forward.sub(gunWorldPosition).normalize();
        } catch (error) {
            console.warn("Error calculating forward direction:", error);
            // Fallback to default forward direction
            forward.set(0, 0, 1);
        }
        
        // Position the effect further forward (10 units ahead)
        const effectPosition = gunWorldPosition.clone().addScaledVector(forward, 10);
        
        // Create flash particles (no point light, which was causing the error)
        const particleCount = 12; // Reduced from 15 for performance
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        const particleColors = new Float32Array(particleCount * 3);
        const particleVelocities = [];
        
        // Create orthogonal vectors
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(forward, up).normalize();
        up.crossVectors(right, forward).normalize();
        
        // Create flash particles in a cone shape
        for (let i = 0; i < particleCount; i++) {
            // Start at effect position (already positioned forward)
            const particlePos = effectPosition.clone();
            
            // Random direction in forward cone
            const spreadAngle = Math.PI / 10; // 18 degrees spread
            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = Math.random() * Math.sin(spreadAngle);
            
            // Calculate direction with spread
            const direction = forward.clone();
            direction.addScaledVector(right, Math.cos(randomAngle) * randomRadius);
            direction.addScaledVector(up, Math.sin(randomAngle) * randomRadius);
            
            // Move particle slightly forward from effect position
            const distance = 2 + Math.random() * 4;
            particlePos.addScaledVector(direction, distance);
            
            particlePositions[i * 3] = particlePos.x;
            particlePositions[i * 3 + 1] = particlePos.y;
            particlePositions[i * 3 + 2] = particlePos.z;
            
            // Size
            particleSizes[i] = 2 + Math.random() * 3;
            
            // Color (yellow-orange-white gradient)
            const colorRandom = Math.random();
            if (colorRandom < 0.3) {
                // White core
                particleColors[i * 3] = 1.0;
                particleColors[i * 3 + 1] = 1.0;
                particleColors[i * 3 + 2] = 0.7;
            } else if (colorRandom < 0.7) {
                // Orange middle
                particleColors[i * 3] = 1.0;
                particleColors[i * 3 + 1] = 0.6;
                particleColors[i * 3 + 2] = 0.1;
            } else {
                // Yellow outer
                particleColors[i * 3] = 1.0;
                particleColors[i * 3 + 1] = 0.9;
                particleColors[i * 3 + 2] = 0.0;
            }
            
            // Create base velocity - faster in the forward direction
            const baseSpeed = 30 + Math.random() * 15;
            const vel = direction.clone().multiplyScalar(baseSpeed);
            
            // Add player velocity if provided (scaled up to be faster than the player)
            if (playerVelocity) {
                // Add 120% of player velocity so particles move faster than the aircraft
                vel.addScaledVector(playerVelocity, 1.2);
                
                // Also add an extra boost in the forward direction
                vel.addScaledVector(forward, 40);
            }
            
            particleVelocities.push(vel);
        }
        
        // Set attributes
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        // Create material
        const particleMaterial = new THREE.PointsMaterial({
            size: 2,
            map: this.particleTexture,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });
        
        // Create the particle system
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particleSystem);
        
        // Store muzzle flash data with just particles (no light)
        this.muzzleFlashes.push({
            particles: particleSystem,
            velocities: particleVelocities,
            lifetime: 0,
            maxLifetime: 0.08 // 80ms
        });
        
        // Return the effect position and forward direction for bullet trail
        return {
            position: effectPosition,
            direction: forward
        };
    }
    
    createBulletTrail(startPosition, direction, playerVelocity = null) {
        // Create trail particles
        const particleCount = 20; // Reduced from 25 for performance
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        const particleColors = new Float32Array(particleCount * 3);
        const particleVelocities = [];
        
        // Trail length
        const trailLength = 15;
        
        // Position the trail further forward (5 units ahead of the starting position)
        const effectStartPosition = startPosition.clone().addScaledVector(direction, 5);
        
        // Create particles along trail
        for (let i = 0; i < particleCount; i++) {
            // Position along line from gun, with small random offset
            const t = i / particleCount; // 0 at gun, 1 at end
            const pos = effectStartPosition.clone();
            pos.addScaledVector(direction, t * trailLength);
            
            // Add small random offset for smoke spread
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            );
            pos.add(offset);
            
            particlePositions[i * 3] = pos.x;
            particlePositions[i * 3 + 1] = pos.y;
            particlePositions[i * 3 + 2] = pos.z;
            
            // Size - smaller near gun, larger at end
            particleSizes[i] = 0.5 + t * 2;
            
            // Color - brighter near gun, darker at end
            const brightness = 1 - t * 0.8; // 1.0 to 0.2
            particleColors[i * 3] = brightness;
            particleColors[i * 3 + 1] = brightness;
            particleColors[i * 3 + 2] = brightness;
            
            // Initial velocity - random spread but biased in forward direction
            const randomSpread = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 3 - 3,  // Slight downward tendency
                (Math.random() - 0.5) * 3
            );
            
            // Start with a forward velocity for the trail
            const vel = direction.clone().multiplyScalar(50 + Math.random() * 20);
            vel.add(randomSpread);
            
            // Add player velocity if provided (scaled up to be faster than the player)
            if (playerVelocity) {
                // Add 120% of player velocity so particles move faster than the aircraft
                vel.addScaledVector(playerVelocity, 1.2);
                
                // Add extra velocity in the forward direction
                vel.addScaledVector(direction, 60 * (1 - t)); // More boost for particles closer to gun
            }
            
            particleVelocities.push(vel);
        }
        
        // Set attributes
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        // Create material
        const particleMaterial = new THREE.PointsMaterial({
            size: 1,
            map: this.smokeTexture,
            blending: THREE.NormalBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.5, // Reduced from 0.6
            vertexColors: true
        });
        
        // Create the particle system
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particleSystem);
        
        // Store trail data with velocities
        this.bulletTrails.push({
            particles: particleSystem,
            velocities: particleVelocities,
            lifetime: 0,
            maxLifetime: 0.8 // Reduced from 1.0 second for better performance
        });
    }
    
    // Create camera shake effect
    addCameraShake(intensity = 0.5) {
        this.lastShakeTime = performance.now();
        this.shakeIntensity = Math.min(intensity + this.shakeIntensity, 1.0); // Allow stacking to a max
    }
    
    // Apply camera shake to a camera
    applyCameraShake(camera, deltaTime) {
        if (this.shakeIntensity > 0) {
            // Calculate elapsed time since last shake
            const now = performance.now();
            const elapsed = (now - this.lastShakeTime) / 1000;
            
            // Reduce shake intensity over time
            this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * deltaTime);
            
            // Apply random shake to camera
            const amount = this.shakeIntensity * 0.1;
            
            // Get current camera rotation
            const origRotation = {
                x: camera.rotation.x,
                y: camera.rotation.y,
                z: camera.rotation.z
            };
            
            // Apply random rotation
            camera.rotation.x = origRotation.x + (Math.random() - 0.5) * amount;
            camera.rotation.y = origRotation.y + (Math.random() - 0.5) * amount;
            camera.rotation.z = origRotation.z + (Math.random() - 0.5) * amount;
            
            // Save shake time
            this.lastShakeTime = now;
            
            return {
                original: origRotation, 
                modified: {
                    x: camera.rotation.x,
                    y: camera.rotation.y,
                    z: camera.rotation.z
                }
            };
        }
        
        return null;
    }
    
    // Restore camera rotation after shake
    restoreCameraRotation(camera, originalRotation) {
        if (originalRotation) {
            camera.rotation.x = originalRotation.x;
            camera.rotation.y = originalRotation.y;
            camera.rotation.z = originalRotation.z;
        }
    }
    
    update(deltaTime, camera) {
        // Update hit effects
        for (let i = this.hitEffects.length - 1; i >= 0; i--) {
            const effect = this.hitEffects[i];
            effect.lifetime += deltaTime;
            
            if (effect.lifetime > effect.maxLifetime) {
                // Remove effect if lifetime is over
                this.scene.remove(effect.particles);
                this.scene.remove(effect.ring);
                this.hitEffects.splice(i, 1);
            } else {
                // Update particle positions
                const positions = effect.particles.geometry.attributes.position.array;
                const sizes = effect.particles.geometry.attributes.size.array;
                
                for (let j = 0; j < effect.velocities.length; j++) {
                    // Update position based on velocity
                    positions[j * 3] += effect.velocities[j].x * deltaTime;
                    positions[j * 3 + 1] += effect.velocities[j].y * deltaTime;
                    positions[j * 3 + 2] += effect.velocities[j].z * deltaTime;
                    
                    // For terrain hits, apply different physics - more horizontal, less vertical
                    if (effect.isTerrain) {
                        // Lighter gravity for terrain dust
                        effect.velocities[j].y -= 5 * deltaTime;
                        
                        // Keep particles close to the ground
                        if (positions[j * 3 + 1] < 0.1) {
                            positions[j * 3 + 1] = 0.1 + Math.random() * 0.2;
                            // Almost no bounce
                            effect.velocities[j].y = Math.abs(effect.velocities[j].y) * 0.1;
                            // Slow down horizontal movement over time
                            effect.velocities[j].x *= 0.98;
                            effect.velocities[j].z *= 0.98;
                        }
                        
                        // Reduce sizes more quickly for dust
                        sizes[j] *= 0.97;
                    } else {
                        // Regular gravity for other effects
                        effect.velocities[j].y -= 9.8 * deltaTime;
                        // Gradually reduce size
                        sizes[j] *= 0.98;
                    }
                }
                
                // Update the ring (expand and fade)
                const progress = effect.lifetime / effect.maxLifetime;
                
                // Make the ring face the camera
                effect.ring.lookAt(camera.position);
                
                // Increase ring size - smaller expansion for terrain explosions
                const expansionRate = effect.isTerrain ? 8 : (effect.isAircraft ? 15 : 10);
                const newScale = 1 + progress * expansionRate;
                effect.ring.scale.set(newScale, newScale, newScale);
                
                // Fade out ring
                effect.ring.material.opacity = (effect.isTerrain ? 0.3 : 0.7) * (1 - progress);
                
                // Mark attributes as needing update
                effect.particles.geometry.attributes.position.needsUpdate = true;
                effect.particles.geometry.attributes.size.needsUpdate = true;
            }
        }
        
        // Update muzzle flashes
        for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
            const flash = this.muzzleFlashes[i];
            flash.lifetime += deltaTime;
            
            if (flash.lifetime > flash.maxLifetime) {
                // Remove flash if lifetime is over
                this.scene.remove(flash.particles);
                this.muzzleFlashes.splice(i, 1);
            } else {
                // Update particles with velocity
                if (flash.velocities) {
                    const positions = flash.particles.geometry.attributes.position.array;
                    for (let j = 0; j < flash.velocities.length; j++) {
                        positions[j * 3] += flash.velocities[j].x * deltaTime;
                        positions[j * 3 + 1] += flash.velocities[j].y * deltaTime;
                        positions[j * 3 + 2] += flash.velocities[j].z * deltaTime;
                    }
                    flash.particles.geometry.attributes.position.needsUpdate = true;
                }
                
                // Fade out particles
                const progress = flash.lifetime / flash.maxLifetime;
                flash.particles.material.opacity = 1 - progress;
            }
        }
        
        // Update bullet trails
        for (let i = this.bulletTrails.length - 1; i >= 0; i--) {
            const trail = this.bulletTrails[i];
            trail.lifetime += deltaTime;
            
            if (trail.lifetime > trail.maxLifetime) {
                // Remove trail if lifetime is over
                this.scene.remove(trail.particles);
                this.bulletTrails.splice(i, 1);
            } else {
                // Update particle positions if we have velocities
                if (trail.velocities) {
                    const positions = trail.particles.geometry.attributes.position.array;
                    const sizes = trail.particles.geometry.attributes.size.array;
                    
                    for (let j = 0; j < trail.velocities.length; j++) {
                        // Update position
                        positions[j * 3] += trail.velocities[j].x * deltaTime;
                        positions[j * 3 + 1] += trail.velocities[j].y * deltaTime;
                        positions[j * 3 + 2] += trail.velocities[j].z * deltaTime;
                        
                        // Add slight gravity effect
                        trail.velocities[j].y -= 4 * deltaTime;
                        
                        // Slightly reduce size
                        if (sizes[j] > 0.2) {
                            sizes[j] *= 0.99;
                        }
                    }
                    
                    trail.particles.geometry.attributes.position.needsUpdate = true;
                    trail.particles.geometry.attributes.size.needsUpdate = true;
                }
                
                // Fade out trail
                const progress = trail.lifetime / trail.maxLifetime;
                trail.particles.material.opacity = 0.5 * (1 - progress);
            }
        }
        
        // Apply camera shake
        if (camera) {
            return this.applyCameraShake(camera, deltaTime);
        }
        
        return null;
    }
}

export { EffectsSystem }; 