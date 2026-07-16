import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const root = process.cwd();
const nextDir = path.join(root, '.next');
const budget = JSON.parse(await readFile(path.join(root, 'performance-budget.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(nextDir, 'app-build-manifest.json'), 'utf8'));

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(target) : [target];
  }));
  return files.flat();
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function record(results, label, actual, maximum) {
  results.push({ label, actual, maximum, passes: actual <= maximum });
}

const results = [];
const chunkFiles = (await filesBelow(path.join(nextDir, 'static', 'chunks')))
  .filter(file => file.endsWith('.js'));
const chunkSizes = await Promise.all(chunkFiles.map(async file => ({
  file,
  size: (await stat(file)).size,
})));
const largestChunk = chunkSizes.sort((a, b) => b.size - a.size)[0];
record(results, `largest client chunk (${path.relative(nextDir, largestChunk.file)})`, largestChunk.size, budget.largestClientChunkBytes);

const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const publicImages = (await filesBelow(path.join(root, 'public')))
  .filter(file => imageExtensions.has(path.extname(file).toLowerCase()));
const imageSizes = await Promise.all(publicImages.map(async file => ({ file, size: (await stat(file)).size })));
const largestImage = imageSizes.sort((a, b) => b.size - a.size)[0];
record(results, `largest public image (${path.relative(root, largestImage.file)})`, largestImage.size, budget.largestPublicImageBytes);

const mediaFiles = await filesBelow(path.join(nextDir, 'static', 'media'));
const fontFiles = mediaFiles.filter(file => file.endsWith('.woff2'));
const fontSizes = await Promise.all(fontFiles.map(file => stat(file)));
record(results, `built font assets (${fontFiles.length} files)`, fontSizes.reduce((sum, item) => sum + item.size, 0), budget.builtFontTotalBytes);

for (const [route, routeBudget] of Object.entries(budget.routes)) {
  const routeFiles = [...new Set([
    ...(manifest.pages['/layout'] ?? []),
    ...(manifest.pages[routeBudget.manifestKey] ?? []),
  ])];
  if (routeFiles.length === 0) throw new Error(`No build assets found for ${route}`);

  let javascriptBytes = 0;
  let cssBytes = 0;
  for (const file of routeFiles) {
    if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
    const compressed = gzipSync(await readFile(path.join(nextDir, file)), { level: 9 }).length;
    if (file.endsWith('.js')) javascriptBytes += compressed;
    else cssBytes += compressed;
  }

  record(results, `${route} initial JavaScript (gzip)`, javascriptBytes, routeBudget.initialJavaScriptGzipBytes);
  record(results, `${route} initial CSS (gzip)`, cssBytes, routeBudget.initialCssGzipBytes);
}

console.table(results.map(result => ({
  budget: result.label,
  actual: formatBytes(result.actual),
  maximum: formatBytes(result.maximum),
  status: result.passes ? 'PASS' : 'FAIL',
})));

const failures = results.filter(result => !result.passes);
if (failures.length > 0) {
  console.error(`Performance budget failed: ${failures.length} regression${failures.length === 1 ? '' : 's'} detected.`);
  process.exitCode = 1;
}
