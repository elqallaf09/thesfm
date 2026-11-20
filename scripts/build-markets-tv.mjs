import { build } from 'vite';
import { resolve } from 'node:path';
import { mkdir, copyFile, readFile, writeFile, cp, readdir, rm } from 'node:fs/promises';
const root = process.cwd();
const origin = new URL(process.env.SFM_TV_ORIGIN || 'https://www.the-sfm.com');
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('SFM_TV_ORIGIN must be an HTTPS origin');
const out = resolve(root, '.tv-build/web');
await build({ configFile: false, root: resolve(root, 'apps/markets-tv/web'), base: './',
  resolve: { alias: { '@': resolve(root, 'src') } },
  esbuild: { jsx: 'automatic' },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: { outDir: out, emptyOutDir: true, target: 'chrome85', sourcemap: false, modulePreload: false, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } },
});
const htmlFile = resolve(out, 'index.html');
await writeFile(htmlFile, (await readFile(htmlFile, 'utf8')).replace(/type="module"\s*/g, 'defer ').replace(/crossorigin\s*/g, ''));
await writeFile(resolve(out, 'configuration.js'), `window.SFM_TV_ORIGIN = ${JSON.stringify(origin.origin)};\n`);
await mkdir(resolve(out, 'markets-tv'), { recursive: true });
await copyFile(resolve(root, 'public/markets-tv/world-dotted-map.png'), resolve(out, 'markets-tv/world-dotted-map.png'));
await copyFile(resolve(root, 'public/brand/sfm-original-logo.png'), resolve(out, 'markets-tv/sfm-logo.png'));
// Bundle the TV artwork and the original three-note startup ident for offline clients.
for (const name of ['sfm-emerald-mark.webp', 'exchange-panorama.webp', 'sfm-news-fallback.webp', 'sfm-ident.wav']) {
  await copyFile(resolve(root, 'public/markets-tv', name), resolve(out, 'markets-tv', name));
}
await cp(resolve(root, 'public/markets-tv/assets'), resolve(out, 'markets-tv/assets'), { recursive: true });
await cp(resolve(root, 'public/markets-tv/flags'), resolve(out, 'markets-tv/flags'), { recursive: true });
// CSS files resolve relative to assets/. The IIFE's injected styles resolve
// relative to index.html instead, including on file-based Tizen/webOS clients.
for (const name of await readdir(resolve(out, 'assets'))) {
  if (!name.endsWith('.css') && !name.endsWith('.js')) continue;
  const file = resolve(out, 'assets', name), prefix = name.endsWith('.css') ? '..' : '.';
  let content = await readFile(file, 'utf8');
  for (const image of ['world-dotted-map.png', 'exchange-panorama.webp']) {
    content = content.replaceAll(`/markets-tv/${image}`, `${prefix}/markets-tv/${image}`);
  }
  await writeFile(file, content);
}
for (const platform of ['tizen','webos']) {
  const target = resolve(root, `.tv-build/${platform}`);
  await rm(target, { recursive: true, force: true });
  await cp(out, target, { recursive: true, force: true });
  await cp(resolve(root,`apps/markets-tv/${platform}`), target, { recursive: true, force: true });
  await copyFile(resolve(root,'public/icons/icon-192.png'), resolve(target,'icon.png'));
  if (platform === 'webos') await copyFile(resolve(root,'public/icons/icon-192.png'),resolve(target,'large-icon.png'));
  if (platform === 'tizen') {
    const file=resolve(target,'config.xml'); await writeFile(file,(await readFile(file,'utf8')).replaceAll('https://www.the-sfm.com',origin.origin));
  }
}
await rm(resolve(root, 'apps/markets-tv/android/app/src/main/assets'), { recursive: true, force: true });
await cp(out, resolve(root, 'apps/markets-tv/android/app/src/main/assets'), { recursive: true, force: true });
console.log('Packaged web clients prepared in .tv-build; Android assets prepared. Vendor signing is separate.');
