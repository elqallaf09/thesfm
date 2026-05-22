import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'lib', 'translations.ts');
const source = fs.readFileSync(file, 'utf8');
const missing = [];
const entryPattern = /(?:^|\n)\s*['"]?([\w.-]+)['"]?\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\s*,/g;

for (const match of source.matchAll(entryPattern)) {
  const [, key, body] = match;
  if (!/\bar\s*:/.test(body)) missing.push(`${key}: ar`);
  if (!/\ben\s*:/.test(body)) missing.push(`${key}: en`);
  if (!/\bfr\s*:/.test(body)) missing.push(`${key}: fr`);
}

if (missing.length) {
  console.error('Missing translations:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('All translation entries include ar, en, and fr.');
