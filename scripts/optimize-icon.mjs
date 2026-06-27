import sharp from 'sharp';
import { stat } from 'fs/promises';

const SRC = 'src/app/icon.png';
const before = (await stat(SRC)).size;

// Re-encode as 512x512 with palette+max compression; keeps alpha if present.
// Tuned for app/route-handler icon (Next ships this verbatim).
// 256x256 is the upper size browsers actually request for /icon.png; the
// separate 192/180/32/16 variants under public/icons cover the rest.
const buf = await sharp(SRC)
  .resize(256, 256, { fit: 'cover' })
  .png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
  .toBuffer();

await sharp(buf).toFile(SRC);
const after = (await stat(SRC)).size;
console.log(`icon.png: ${before} -> ${after} bytes (${Math.round((1 - after / before) * 100)}% smaller)`);
