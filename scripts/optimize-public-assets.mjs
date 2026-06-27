// One-shot optimizer for public/ PNG assets.
// - Re-encodes referenced PNGs with palette + max compression at sane sizes
// - Reports a per-file before/after table
// (Dead/unreferenced files are removed by git rm in the surrounding commit, not here.)
import sharp from 'sharp';
import { stat } from 'fs/promises';

const targets = [
  { path: 'public/sfm-logo.png',          width: 256, height: 256, fit: 'cover' },
  { path: 'public/icons/icon-512.png',    width: 512, height: 512, fit: 'cover' },
  { path: 'public/icons/og-image.png',    width: 1200, height: 630, fit: 'contain', bg: '#0b0e1c' },
];

let before = 0, after = 0;
console.log('file'.padEnd(34), 'before'.padStart(10), 'after'.padStart(10), '   delta');
for (const t of targets) {
  const sizeBefore = (await stat(t.path)).size;
  const pipeline = sharp(t.path).resize(t.width, t.height, {
    fit: t.fit,
    background: t.bg ?? { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const buf = await pipeline.png({ compressionLevel: 9, palette: true, quality: 85, effort: 10 }).toBuffer();
  await sharp(buf).toFile(t.path);
  const sizeAfter = (await stat(t.path)).size;
  before += sizeBefore; after += sizeAfter;
  const pct = Math.round((1 - sizeAfter / sizeBefore) * 100);
  console.log(
    t.path.padEnd(34),
    `${sizeBefore}`.padStart(10),
    `${sizeAfter}`.padStart(10),
    `   -${pct}%`,
  );
}
console.log('-'.repeat(70));
console.log(
  'total'.padEnd(34),
  `${before}`.padStart(10),
  `${after}`.padStart(10),
  `   -${Math.round((1 - after / before) * 100)}%`,
);
