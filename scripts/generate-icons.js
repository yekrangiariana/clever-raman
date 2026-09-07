import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, colorR, colorG, colorB) {
  // Simple uncompressed PNG encoder
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 2; // Color type: Truecolor (RGB)
  ihdr[10] = 0; // Compression method
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace method

  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk (raw RGB image data with 0 filter byte per scanline)
  const lineLength = width * 3 + 1;
  const rawData = Buffer.alloc(height * lineLength);

  for (let y = 0; y < height; y++) {
    const lineStart = y * lineLength;
    rawData[lineStart] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const idx = lineStart + 1 + x * 3;
      // Draw a subtle gradient with music accent (#FA2D48 / red-pink accent)
      const distFromCenter = Math.sqrt(Math.pow(x - width / 2, 2) + Math.pow(y - height / 2, 2));
      const maxDist = width / 2;
      const factor = Math.max(0, 1 - distFromCenter / maxDist);
      
      rawData[idx] = Math.min(255, Math.floor(colorR * (0.6 + 0.4 * factor)));
      rawData[idx + 1] = Math.min(255, Math.floor(colorG * (0.6 + 0.4 * factor)));
      rawData[idx + 2] = Math.min(255, Math.floor(colorB * (0.6 + 0.4 * factor)));
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  
  // CRC32 calculation
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 80x80 icon.png and 130x130 largeIcon.png (#FA2D48 -> RGB: 250, 45, 72)
const icon80 = createPNG(80, 80, 250, 45, 72);
const icon130 = createPNG(130, 130, 250, 45, 72);

fs.writeFileSync(path.join(publicDir, 'icon.png'), icon80);
fs.writeFileSync(path.join(publicDir, 'largeIcon.png'), icon130);

console.log('Generated public/icon.png (80x80) and public/largeIcon.png (130x130)');
