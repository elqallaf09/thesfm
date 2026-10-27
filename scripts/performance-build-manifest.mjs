export const PERFORMANCE_MANIFEST_FILE = 'sfm-performance-manifest.json';

function entryFiles(entrypoint) {
  return entrypoint.getFiles()
    .filter(file => /(?<!\.hot-update)\.(js|css)($|\?)/.test(file))
    .map(file => file.replace(/\\/g, '/'));
}

// Next 16 removed app-build-manifest.json. Capture the same initial Webpack
// entrypoint files as Next 15 did; walking child chunks would include lazy code.
export function createPerformanceManifest(entrypoints) {
  const main = entrypoints.get('main-app');
  if (!main) throw new Error('Missing main-app client entrypoint.');
  const mainFiles = entryFiles(main);
  if (!mainFiles.some(file => /\.js($|\?)/.test(file))) {
    throw new Error('Missing main-app JavaScript assets.');
  }

  const pages = {};
  for (const [name, entrypoint] of entrypoints) {
    const normalizedName = name.replace(/\\/g, '/');
    if (!normalizedName.startsWith('app/')) continue;
    pages[normalizedName.slice(3)] = [...new Set([...mainFiles, ...entryFiles(entrypoint)])];
  }
  return { version: 1, bundler: 'webpack', pages };
}

export function routeFilesForBudget(manifest, manifestKey) {
  if (manifest?.version !== 1 || manifest.bundler !== 'webpack' || !manifest.pages) {
    throw new Error('Unsupported or missing SFM performance manifest.');
  }
  const files = [];
  for (const key of new Set(['/layout', manifestKey])) {
    const entry = manifest.pages[key];
    if (!Array.isArray(entry) || entry.length === 0) {
      throw new Error(`Missing initial build assets for ${key}.`);
    }
    for (const value of entry) {
      const file = typeof value === 'string' ? value.split('?')[0] : '';
      if (!file.startsWith('static/') || file.includes('\\')
        || file.split('/').some(part => part === '..' || part === '.')
        || !/\.(js|css)$/.test(file) || file.endsWith('.hot-update.js')) {
        throw new Error(`Invalid initial build asset for ${key}.`);
      }
      files.push(file);
    }
  }
  return [...new Set(files)];
}

export class PerformanceBuildManifestPlugin {
  apply(compiler) {
    const name = 'SfmPerformanceBuildManifest';
    const { Compilation, sources } = compiler.webpack;
    compiler.hooks.thisCompilation.tap(name, compilation => {
      compilation.hooks.processAssets.tap({
        name,
        stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
      }, () => {
        const manifest = createPerformanceManifest(compilation.entrypoints);
        compilation.emitAsset(PERFORMANCE_MANIFEST_FILE, new sources.RawSource(JSON.stringify(manifest, null, 2)));
      });
    });
  }
}
