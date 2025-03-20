const fs = require('fs');
const sharp = require('sharp');

// Create a simple SVG with a mountain icon
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <!-- Transparent background - removed blue background -->
  <rect width="64" height="64" fill="transparent" rx="8" ry="8" />
  <!-- First mountain (large) -->
  <polygon points="8,48 32,16 56,48" fill="#2c3e50" />
  <!-- Second mountain (small) -->
  <polygon points="16,48 28,30 40,48" fill="#34495e" />
  <!-- Snow cap - made larger -->
  <polygon points="32,16 25,26 39,26" fill="white" />
</svg>
`;

// Create the SVG file
fs.writeFileSync('public/mountain-favicon.svg', svgContent);

// Convert SVG to PNG with different sizes
const sizes = [16, 32, 48, 64, 128, 192, 512];

// Ensure public directory exists
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

// Create favicon.ico (for older browsers)
sharp(Buffer.from(svgContent))
  .resize(32, 32)
  .toFile('public/favicon.ico', (err) => {
    if (err) console.error('Error creating favicon.ico:', err);
    else console.log('favicon.ico created');
  });

// Create favicon.png files
sizes.forEach(size => {
  sharp(Buffer.from(svgContent))
    .resize(size, size)
    .toFile(`public/favicon-${size}x${size}.png`, (err) => {
      if (err) console.error(`Error creating ${size}x${size} PNG:`, err);
      else console.log(`favicon-${size}x${size}.png created`);
    });
});

// Generate apple-touch-icon
sharp(Buffer.from(svgContent))
  .resize(180, 180)
  .toFile('public/apple-touch-icon.png', (err) => {
    if (err) console.error('Error creating apple-touch-icon:', err);
    else console.log('apple-touch-icon.png created');
  });

console.log('Favicon generation complete. Now update your HTML to include the favicon links.'); 