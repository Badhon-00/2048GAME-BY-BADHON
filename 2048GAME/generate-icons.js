const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function makePNG(size) {
  const w = size, h = size;

  // CRC table
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const t = Buffer.from(type);
    const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
    const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([l, t, data, cr]);
  }

  // Draw tile-style icon: gold bg, rounded label "2048"
  // We'll do RGBA (color type 6)
  const raw = Buffer.alloc(h * (w * 4 + 1));

  // Palette
  const BG   = [0xfa, 0xf8, 0xef, 0xff]; // page background
  const TILE  = [0xed, 0xc2, 0x2e, 0xff]; // gold tile
  const TEXT  = [0xf9, 0xf6, 0xf2, 0xff]; // near-white

  const cx = w / 2, cy = h / 2;
  const tileR = w * 0.42; // tile half-size (circular check for rounded square)
  const cornerR = w * 0.14;

  function inRoundedRect(px, py) {
    const dx = Math.abs(px - cx), dy = Math.abs(py - cy);
    if (dx > tileR || dy > tileR) return false;
    if (dx <= tileR - cornerR || dy <= tileR - cornerR) return true;
    const ex = dx - (tileR - cornerR), ey = dy - (tileR - cornerR);
    return ex * ex + ey * ey <= cornerR * cornerR;
  }

  // Simple bitmap font for "2048" — 5×7 pixel cells scaled up
  const GLYPHS = {
    '2': [0b01110,0b10001,0b00001,0b00010,0b00100,0b01000,0b11111],
    '0': [0b01110,0b10001,0b10011,0b10101,0b11001,0b10001,0b01110],
    '4': [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
    '8': [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
  };

  const CHARS = ['2','0','4','8'];
  const GSCALE = Math.max(1, Math.round(w / 48));   // pixel size
  const GW = 5 * GSCALE, GH = 7 * GSCALE;
  const GAP = GSCALE;
  const totalW = CHARS.length * GW + (CHARS.length - 1) * GAP;
  const startX = Math.round(cx - totalW / 2);
  const startY = Math.round(cy - GH / 2);

  function inGlyph(px, py) {
    for (let ci = 0; ci < CHARS.length; ci++) {
      const ox = startX + ci * (GW + GAP);
      const oy = startY;
      if (px < ox || px >= ox + GW || py < oy || py >= oy + GH) continue;
      const gx = Math.floor((px - ox) / GSCALE);
      const gy = Math.floor((py - oy) / GSCALE);
      const row = GLYPHS[CHARS[ci]][gy];
      if (row & (1 << (4 - gx))) return true;
    }
    return false;
  }

  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter = None
    for (let x = 0; x < w; x++) {
      const idx = y * (w * 4 + 1) + 1 + x * 4;
      let color;
      if (inRoundedRect(x, y)) {
        color = inGlyph(x, y) ? TEXT : TILE;
      } else {
        color = BG;
      }
      raw[idx]     = color[0];
      raw[idx + 1] = color[1];
      raw[idx + 2] = color[2];
      raw[idx + 3] = color[3];
    }
  }

  const compressed = zlib.deflateSync(raw);

  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const dir = path.join(__dirname, 'icons');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon-192.png'), makePNG(192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), makePNG(512));
console.log('Icons generated: icon-192.png, icon-512.png');
