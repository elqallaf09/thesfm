import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createPerformanceManifest,
  PERFORMANCE_MANIFEST_FILE,
  PerformanceBuildManifestPlugin,
  routeFilesForBudget,
} from '../../scripts/performance-build-manifest.mjs';

const entry = files => ({
  getFiles: () => files,
  get childrenIterable() { throw new Error('Lazy child chunks must not be visited.'); },
});

function fixture() {
  return new Map([
    ['main-app', entry(['static/chunks/runtime.js', 'static/chunks/main-app.js'])],
    ['app/layout', entry(['static/chunks/shared.js', 'static/chunks/layout.js', 'static/css/layout.css'])],
    ['app/dashboard/page', entry([
      'static/chunks/shared.js', 'static/chunks/dashboard.js', 'static/css/dashboard.css',
      'static/chunks/dashboard.js.map', 'static/chunks/old.hot-update.js',
    ])],
    ['pages/legacy', entry(['static/chunks/legacy.js'])],
  ]);
}

test('initial assets retain shared runtime, root layout and route files exactly once', () => {
  const manifest = createPerformanceManifest(fixture());
  assert.deepEqual(Object.keys(manifest.pages), ['/layout', '/dashboard/page']);
  assert.deepEqual(routeFilesForBudget(manifest, '/dashboard/page'), [
    'static/chunks/runtime.js', 'static/chunks/main-app.js', 'static/chunks/shared.js',
    'static/chunks/layout.js', 'static/css/layout.css',
    'static/chunks/dashboard.js', 'static/css/dashboard.css',
  ]);
});

test('Windows entrypoint and asset paths keep the same budget keys', () => {
  const entries = fixture();
  entries.delete('app/dashboard/page');
  entries.set('app\\dashboard\\page', entry(['static\\chunks\\dashboard.js']));
  const manifest = createPerformanceManifest(entries);
  assert.ok(routeFilesForBudget(manifest, '/dashboard/page').includes('static/chunks/dashboard.js'));
});

test('missing runtime, root layout or requested route fails instead of counting only shared assets', () => {
  const entries = fixture();
  entries.delete('main-app');
  assert.throws(() => createPerformanceManifest(entries), /Missing main-app/);
  entries.set('main-app', entry([]));
  assert.throws(() => createPerformanceManifest(entries), /Missing main-app JavaScript/);
  const manifest = createPerformanceManifest(fixture());
  assert.throws(() => routeFilesForBudget(manifest, '/missing/page'), /Missing initial build assets/);
  delete manifest.pages['/layout'];
  assert.throws(() => routeFilesForBudget(manifest, '/dashboard/page'), /Missing initial build assets/);
});

test('incompatible manifests and malformed assets cannot silently reduce measurements', () => {
  assert.throws(() => routeFilesForBudget({ pages: {} }, '/dashboard/page'), /Unsupported/);
  for (const invalid of [[], null, ['../outside.js'], ['static/../outside.js'], [42], ['static/data.json']]) {
    const manifest = createPerformanceManifest(fixture());
    manifest.pages['/dashboard/page'] = invalid;
    assert.throws(() => routeFilesForBudget(manifest, '/dashboard/page'), /Missing initial|Invalid initial/);
  }
});

test('Webpack compilation emits real initial assets and keeps an on-demand chunk out of the route budget', async () => {
  const require = createRequire(import.meta.url);
  const bundledWebpack = require('next/dist/compiled/webpack/webpack');
  // Next 15 initializes lazily; Next 16 exposes the compiler immediately.
  if (typeof bundledWebpack.init === 'function') bundledWebpack.init();
  assert.equal(typeof bundledWebpack.webpack, 'function');
  const root = await mkdtemp(path.join(tmpdir(), 'sfm-performance-manifest-'));
  let compiler;
  try {
    await Promise.all([
      writeFile(path.join(root, 'main.js'), 'globalThis.sfmRuntime = true;'),
      writeFile(path.join(root, 'shared.js'), 'export const shared = 42;'),
      writeFile(path.join(root, 'layout.js'), 'import { shared } from "./shared"; globalThis.sfmLayout = shared;'),
      writeFile(path.join(root, 'page.js'), 'import { shared } from "./shared"; globalThis.sfmPage = shared; globalThis.loadChart = () => import(/* webpackChunkName: "on-demand" */ "./lazy");'),
      writeFile(path.join(root, 'lazy.js'), 'export const chart = "Loaded on demand";'),
    ]);
    compiler = bundledWebpack.webpack({
      mode: 'production',
      context: root,
      entry: { 'main-app': './main.js', 'app/layout': './layout.js', 'app/dashboard/page': './page.js' },
      output: { path: path.join(root, 'out'), filename: 'static/chunks/[name].[contenthash].js', chunkFilename: 'static/chunks/[name].[contenthash].js' },
      optimization: {
        minimize: false,
        runtimeChunk: { name: 'runtime' },
        splitChunks: { cacheGroups: { shared: { test: /shared\.js$/, name: 'shared', chunks: 'all', enforce: true } } },
      },
      plugins: [new PerformanceBuildManifestPlugin()],
    });
    const stats = await new Promise((resolve, reject) => compiler.run((error, result) => error ? reject(error) : resolve(result)));
    assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
    const manifest = JSON.parse(await readFile(path.join(root, 'out', PERFORMANCE_MANIFEST_FILE), 'utf8'));
    const files = routeFilesForBudget(manifest, '/dashboard/page');
    assert.equal(files.filter(file => file.includes('/shared.')).length, 1);
    assert.equal(files.filter(file => file.includes('/runtime.')).length, 1);
    assert.ok(files.some(file => file.includes('/app/layout.')));
    assert.ok(files.some(file => file.includes('/app/dashboard/page.')));
    assert.ok((await readdir(path.join(root, 'out/static/chunks'))).some(file => file.startsWith('on-demand.')));
    assert.equal(files.some(file => file.includes('on-demand')), false);
    await Promise.all(files.map(file => readFile(path.join(root, 'out', file))));
  } finally {
    if (compiler) await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
