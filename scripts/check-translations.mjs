import fs from 'node:fs';
import path from 'node:path';

const missing = [];
const entryPattern = /(?:^|\n)\s*['"]?([\w.-]+)['"]?\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\s*,/g;
const translationsDir = path.join(process.cwd(), 'src', 'lib', 'translations');
const files = fs.readdirSync(translationsDir)
  .filter(name => name.endsWith('.ts'))
  .map(name => path.join(translationsDir, name));

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(entryPattern)) {
    const [, key, body] = match;
    const label = `${path.basename(file)}:${key}`;
    if (!/\bar\s*:/.test(body)) missing.push(`${label}: ar`);
    if (!/\ben\s*:/.test(body)) missing.push(`${label}: en`);
    if (!/\bfr\s*:/.test(body)) missing.push(`${label}: fr`);
  }
}

if (missing.length) {
  console.error('Missing translations:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('All translation entries include ar, en, and fr.');
