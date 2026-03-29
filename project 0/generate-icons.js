// generate-icons.js
// Run with: node generate-icons.js
// Requires: npm install sharp

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const SOURCE = path.join(__dirname, 'icon-source.png');
const OUT    = path.join(__dirname, 'icons');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

Promise.all(
  sizes.map(size =>
    sharp(SOURCE)
      .resize(size, size)
      .png()
      .toFile(path.join(OUT, `icon-${size}.png`))
      .then(() => console.log(`✅ icon-${size}.png`))
  )
)
.then(() => {
  // Also make a favicon.ico from the 32x32
  return sharp(SOURCE).resize(32, 32).png().toFile(path.join(__dirname, 'favicon.png'));
})
.then(() => console.log('✅ All icons generated!'))
.catch(err => console.error('Error:', err));
