/**
 * ScreenGuard – PWA Icon Generator
 * Creates all required icon sizes as valid PNG files
 * Uses only Node.js built-in modules (no npm install needed)
 * Run: node make-icons.js
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, 'icons');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// ─── Minimal PNG writer ─────────────────────────────────────────────────────
function crc32(buf, start, len) {
  let c = 0xFFFFFFFF;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let v = i;
      for (let j = 0; j < 8; j++) v = (v & 1) ? 0xEDB88320 ^ (v >>> 1) : (v >>> 1);
      t[i] = v;
    }
    return t;
  })());
  for (let i = start; i < start + len; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function u32(n) {
  return Buffer.from([(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]);
}

function chunk(type, data) {
  const len = u32(data.length);
  const code = Buffer.from(type, 'ascii');
  const joined = Buffer.concat([code, data]);
  const crc = u32(crc32(joined, 0, joined.length));
  return Buffer.concat([len, joined, crc]);
}

function makePNG(pixels, size) {
  // pixels = Uint8Array of RGBA
  // Build raw scanlines
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const si = (y * size + x) * 4;
      const di = y * (size * 4 + 1) + 1 + x * 4;
      raw[di]     = pixels[si];
      raw[di + 1] = pixels[si + 1];
      raw[di + 2] = pixels[si + 2];
      raw[di + 3] = pixels[si + 3];
    }
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig    = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  const ihdr   = chunk('IHDR', Buffer.concat([u32(size), u32(size),
    Buffer.from([8, 6, 0, 0, 0])])); // 8-bit RGBA
  const idat   = chunk('IDAT', compressed);
  const iend   = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// ─── Draw the icon ───────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4);

  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2;

  // Colors
  const bg1 = hexToRgb('#0a0a12');
  const bg2 = hexToRgb('#16162a');
  const c1  = hexToRgb('#a78bfa'); // purple
  const c2  = hexToRgb('#60a5fa'); // blue
  const white = [255, 255, 255];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx  = x - cx;
      const dy  = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // --- Background: rounded square ---
      const rx = Math.abs(dx) / r;
      const ry = Math.abs(dy) / r;
      const cornerR = 0.45; // roundness factor
      // SDF for rounded square
      const qx = Math.max(rx - (1 - cornerR), 0);
      const qy = Math.max(ry - (1 - cornerR), 0);
      const sdf = Math.sqrt(qx*qx + qy*qy) / cornerR;

      if (sdf > 1.0) { pixels[idx + 3] = 0; continue; } // transparent outside

      // Background gradient (radial)
      const bgT = dist / r;
      const bgR = Math.round(lerp(bg2[0], bg1[0], bgT));
      const bgG = Math.round(lerp(bg2[1], bg1[1], bgT));
      const bgB = Math.round(lerp(bg2[2], bg1[2], bgT));

      let pR = bgR, pG = bgG, pB = bgB, pA = 255;

      // --- Subtle glow halo ---
      const glowFactor = Math.max(0, 1 - dist / (r * 0.9));
      const glowR = Math.round(pR + (c1[0] - pR) * glowFactor * 0.2);
      const glowG = Math.round(pG + (c1[1] - pG) * glowFactor * 0.2);
      const glowB = Math.round(pB + (c1[2] - pB) * glowFactor * 0.2);
      pR = glowR; pG = glowG; pB = glowB;

      // --- Shield shape ---
      const sx = dx / r;  // normalised -1..1
      const sy = dy / r;

      // Shield SDF (simplified)
      const shieldW = 0.56;
      const shieldTop = -0.52;
      const shieldBot = 0.65;
      const shieldMid = 0.12; // where straight sides end

      let inShield = false;
      if (sy >= shieldTop && sy <= shieldBot) {
        // Top part: straight sides
        if (sy <= shieldMid) {
          inShield = Math.abs(sx) <= shieldW;
        } else {
          // Bottom: taper to a point
          const taper = 1 - (sy - shieldMid) / (shieldBot - shieldMid);
          inShield = Math.abs(sx) <= shieldW * taper;
        }
        // Rounded top corners
        if (sy < shieldTop + 0.1 && Math.abs(sx) > shieldW - 0.1) {
          const edgeX = Math.abs(sx) - (shieldW - 0.1);
          const edgeY = sy - (shieldTop + 0.1);
          inShield = (edgeX * edgeX + edgeY * edgeY) < 0.01;
        }
      }

      if (inShield) {
        // Gradient: purple → blue (diagonal)
        const gradT = (sx + 1) / 2; // 0 left, 1 right
        const sR = Math.round(lerp(c1[0], c2[0], gradT));
        const sG = Math.round(lerp(c1[1], c2[1], gradT));
        const sB = Math.round(lerp(c1[2], c2[2], gradT));
        pR = sR; pG = sG; pB = sB;

        // Slight shine at top
        const shine = Math.max(0, (-sy + shieldTop + 0.3) / 0.3) * 0.4;
        pR = Math.min(255, Math.round(pR + shine * 255));
        pG = Math.min(255, Math.round(pG + shine * 255));
        pB = Math.min(255, Math.round(pB + shine * 255));

        // --- Padlock inside shield ---
        const lw = 0.16 * r;  // lock body half-width
        const lh = 0.13 * r;  // lock body half-height
        const lcy = cy + size * 0.04; // lock center y (slightly below center)
        const lcx = cx;

        // Lock body (white rounded rect)
        const inBody =
          Math.abs(x - lcx) <= lw &&
          Math.abs(y - lcy) <= lh;

        if (inBody) { pR = 255; pG = 255; pB = 255; }

        // Lock shackle (white arc)
        const arcCy = lcy - lh;
        const arcR1 = lw * 0.55;
        const arcR2 = lw * 0.85;
        const aDist = Math.sqrt((x - lcx) ** 2 + (y - arcCy) ** 2);
        const inArc = aDist >= arcR1 && aDist <= arcR2 && y <= arcCy;
        if (inArc) { pR = 255; pG = 255; pB = 255; }
      }

      // Edge anti-aliasing (soften boundary by blending near sdf=1)
      const aa = sdf > 0.9 ? 1 - (sdf - 0.9) / 0.1 : 1;
      pA = Math.round(255 * aa);

      pixels[idx]     = pR;
      pixels[idx + 1] = pG;
      pixels[idx + 2] = pB;
      pixels[idx + 3] = pA;
    }
  }
  return pixels;
}

// ─── Main ────────────────────────────────────────────────────────────────────
console.log('🎨 Generating ScreenGuard PWA icons...\n');

SIZES.forEach(size => {
  const pixels = drawIcon(size);
  const png    = makePNG(pixels, size);
  const file   = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`  ✅  icons/icon-${size}.png  (${png.length} bytes)`);
});

// Also write a placeholder screenshot (solid bg)
function makeScreenshot(w, h) {
  const pixels = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    pixels[i*4]   = 10;
    pixels[i*4+1] = 10;
    pixels[i*4+2] = 18;
    pixels[i*4+3] = 255;
  }
  // Reuse PNG writer with custom dimensions
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      const di = y * (w * 4 + 1) + 1 + x * 4;
      raw[di]   = pixels[si]; raw[di+1] = pixels[si+1];
      raw[di+2] = pixels[si+2]; raw[di+3] = pixels[si+3];
    }
  }
  const compressed = require('zlib').deflateSync(raw, { level: 1 });
  function u32b(n) { return Buffer.from([(n>>>24)&0xFF,(n>>>16)&0xFF,(n>>>8)&0xFF,n&0xFF]); }
  function chnk(type, data) {
    const len=u32b(data.length), code=Buffer.from(type,'ascii');
    const j=Buffer.concat([code,data]);
    let c=0xFFFFFFFF;
    const table=crc32.table;
    for(let i=0;i<j.length;i++) c=table[(c^j[i])&0xFF]^(c>>>8);
    return Buffer.concat([len,j,u32b((c^0xFFFFFFFF)>>>0)]);
  }
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
    chnk('IHDR',Buffer.concat([u32b(w),u32b(h),Buffer.from([8,6,0,0,0])])),
    chnk('IDAT',compressed),
    chnk('IEND',Buffer.alloc(0))
  ]);
}

fs.writeFileSync(path.join(OUT_DIR, 'screenshot-mobile.png'), makeScreenshot(390, 844));
console.log('  ✅  icons/screenshot-mobile.png');

console.log('\n🚀 All icons generated! Your PWA is ready.\n');
