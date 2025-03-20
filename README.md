# Three.js Flight Simulator

A browser-based flight simulator built with Three.js that allows users to control an aircraft in a 3D environment using keyboard inputs.

## Features

- 3D environment with skybox and ground plane
- Basic aircraft physics (lift, drag, gravity)
- Controls for pitch, yaw, roll, and throttle
- Third-person and first-person camera views
- Flight instruments (altitude, speed, throttle, artificial horizon)
- Procedurally generated clouds

## Controls

- **W/S**: Pitch up/down
- **A/D**: Yaw left/right
- **Q/E**: Roll left/right
- **Shift/Ctrl**: Increase/decrease throttle
- **Toggle View Button**: Switch between third-person and first-person views

## Getting Started

### Running the Simulator

1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, etc.)
2. The flight simulator will start automatically
3. Use the keyboard controls to fly the aircraft

### Local Development Server

For the best experience, run the simulator using a local development server to avoid CORS issues with textures and models.

Using Python:
```
# Python 3
python -m http.server

# Python 2
python -m SimpleHTTPServer
```

Using Node.js:
```
# Install http-server globally
npm install -g http-server

# Run server
http-server
```

## Code Structure

- **index.html**: Main HTML file with UI elements
- **js/scene.js**: Handles 3D scene setup, skybox, and ground
- **js/aircraft.js**: Aircraft model, physics, and cameras
- **js/controls.js**: Keyboard input handling
- **js/physics.js**: Flight physics calculations and environment elements
- **js/ui.js**: User interface and flight instruments
- **js/main.js**: Main application logic and animation loop

## Customization

### Modifying Aircraft Physics

Aircraft physics parameters can be adjusted in the `Aircraft` class constructor in `aircraft.js`:

```javascript
// Physical constants
this.maxSpeed = 200;          // Maximum speed in km/h
this.minSpeed = 50;           // Minimum speed to stay airborne
this.throttleAcceleration = 20; // Acceleration per second at full throttle
this.dragFactor = 0.01;       // Air resistance
this.liftFactor = 0.005;      // Lift generation factor
this.weight = 15;             // Aircraft weight (gravity influence)
this.rotationSensitivity = {  // Rotation rates
    pitch: 0.03,
    yaw: 0.02,
    roll: 0.05
};
```

### Changing Aircraft Model

To use a different 3D model, modify the `loadDetailedModel` method in `aircraft.js`. The simulator currently uses a simple placeholder model, but you can replace it with a more detailed GLTF or OBJ model.

### Modifying the Environment

The environment is created in the `SceneManager` class in `scene.js`. You can modify the skybox, ground plane, and lighting to create different environments.

## Performance Optimization

The simulator is optimized for performance with:
- Frustum culling (built into Three.js)
- Simplified physics calculations
- Low-poly models for clouds and aircraft
- Efficient rendering techniques

If you experience performance issues:
1. Reduce the number of clouds in the `createClouds` method in `physics.js`
2. Simplify the ground texture in the `createGround` method in `scene.js`
3. Use a simpler aircraft model

## Browser Compatibility

The simulator works best in modern browsers that support WebGL:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Safari

Mobile devices are supported but not recommended due to the lack of keyboard controls.

## License

Feel free to use, modify, and distribute this code as you wish. Attribution is appreciated but not required. 