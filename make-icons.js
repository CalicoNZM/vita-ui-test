const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const TEAL = [53, 224, 192];
const MAGENTA = [255, 92, 138];
const BLUE = [79, 163, 255];
const GREEN = [79, 214, 117];
const BG = [10, 13, 18];

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function sdCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) - r;
}
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}
function sdTri(px, py) {
  const a = [0.5, 0.22], b = [0.3, 0.47], c = [0.7, 0.47];
  const e0 = b[0] - a[0], e1 = b[1] - a[1];
  const e2 = c[0] - b[0], e3 = c[1] - b[1];
  const e4 = a[0] - c[0], e5 = a[1] - c[1];
  const d0 = e0 * (py - a[1]) - e1 * (px - a[0]);
  const d1 = e2 * (py - b[1]) - e3 * (px - b[0]);
  const d2 = e4 * (py - c[1]) - e5 * (px - c[0]);
  if ((d0 >= 0 && d1 >= 0 && d2 >= 0) || (d0 <= 0 && d1 <= 0 && d2 <= 0)) {
    return -Math.min(Math.min(d0, d1), d2) / Math.hypot(0.2, 0.25);
  }
  const edge = [d0, d1, d2].map(d => Math.abs(d));
  return Math.min(...edge) / Math.hypot(0.2, 0.25);
}

function coverage(d, aa) {
  return Math.max(0, Math.min(1, 0.5 - d / aa));
}

function blend(px, size, u, v, cov, rgb, a) {
  const al = a * cov;
  if (al <= 0.001) return;
  const i = (Math.floor(v * size) * size + Math.floor(u * size)) * 4;
  const ia = px[i + 3] / 255;
  const outA = al + ia * (1 - al);
  if (outA <= 0) return;
  px[i] = Math.round((rgb[0] * al + (px[i] / 255) * ia * (1 - al)) / outA * 255);
  px[i + 1] = Math.round((rgb[1] * al + (px[i + 1] / 255) * ia * (1 - al)) / outA * 255);
  px[i + 2] = Math.round((rgb[2] * al + (px[i + 2] / 255) * ia * (1 - al)) / outA * 255);
  px[i + 3] = Math.round(outA * 255);
}

function render(size, opts) {
  const px = Buffer.alloc(size * size * 4);
  const aa = 1.6 / size;
  const pad = opts.maskable ? 0.08 : 0;
  const s = 1 - pad * 2;
  const cx = 0.5, cy = 0.5;
  for (let y = 0; y < size; y++) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      let d;

      if (opts.maskable) {
        d = sdRoundRect(u, v, 0.5, 0.5, 0.5, 0.5, 0);
        blend(px, size, u, v, coverage(d, aa), BG, 1);
      } else {
        d = sdRoundRect(u, v, cx, cy, 0.5, 0.5, 0.16);
        blend(px, size, u, v, coverage(d, aa), BG, 1);
      }

      const uu = (u - cx) / s + cx;
      const vv = (v - cy) / s + cy;

      blend(px, size, uu, vv, coverage(sdCircle(u, v, cx, cy, 0.27), aa), TEAL, 1);
      blend(px, size, uu, vv, coverage(Math.abs(sdCircle(u, v, cx, cy, 0.27)) - 0.022, aa), MAGENTA, 1);
      blend(px, size, uu, vv, coverage(sdRoundRect(u, v, 0.74, 0.30, 0.075, 0.075, 0.02), aa), BLUE, 1);
      blend(px, size, uu, vv, coverage(sdRoundRect(u, v, 0.27, 0.72, 0.075, 0.075, 0.02), aa), GREEN, 1);
      blend(px, size, uu, vv, coverage(sdRoundRect(u, v, 0.70, 0.72, 0.075, 0.075, 0.02), aa), MAGENTA, 1);
    }
  }
  return encodePNG(size, px);
}

const outDir = __dirname;
const targets = [
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'favicon-32.png', size: 32, maskable: false }
];
targets.forEach(t => {
  const buf = render(t.size, { maskable: t.maskable });
  fs.writeFileSync(path.join(outDir, t.file), buf);
  console.log('wrote ' + t.file + ' (' + buf.length + ' bytes)');
});