import { readdir } from 'node:fs/promises';
import path from 'node:path';

const NEXT_STATIC_PREFIX = '/_next/static/';

function readAttribute(tag, name) {
  for (const match of tag.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    if (match[1].toLowerCase() === name.toLowerCase()) {
      return match[2] ?? match[3] ?? match[4] ?? null;
    }
  }
  return null;
}

function toStaticAssetPath(rawUrl) {
  try {
    const url = new URL(rawUrl, 'https://the-sfm.invalid');
    if (!url.pathname.startsWith(NEXT_STATIC_PREFIX)) return null;
    const decoded = decodeURIComponent(url.pathname.slice('/_next/'.length));
    const normalized = path.posix.normalize(decoded);
    if (normalized === '.' || normalized === '..' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) return null;
    return normalized;
  } catch {
    return null;
  }
}

export function extractStaticAssetsFromHtml(html) {
  const javascript = new Set();
  const stylesheets = new Set();
  for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tagName = match[1].toLowerCase();
    const tag = match[0];
    if (tagName === 'script') {
      const source = readAttribute(tag, 'src');
      const asset = source ? toStaticAssetPath(source) : null;
      if (asset?.endsWith('.js')) javascript.add(asset);
      continue;
    }
    const href = readAttribute(tag, 'href');
    const asset = href ? toStaticAssetPath(href) : null;
    if (!asset) continue;
    const rel = (readAttribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
    const as = (readAttribute(tag, 'as') ?? '').toLowerCase();
    if (asset.endsWith('.js') && ((rel.includes('preload') && as === 'script') || rel.includes('modulepreload'))) javascript.add(asset);
    if (asset.endsWith('.css') && (rel.includes('stylesheet') || (rel.includes('preload') && as === 'style'))) stylesheets.add(asset);
  }
  return { js: [...javascript].sort(), css: [...stylesheets].sort() };
}

export function routeFromHtmlRelativePath(relativePath) {
  const segments = relativePath.split(/[\\/]+/).filter(Boolean);
  if (segments.some(segment => segment.startsWith('@'))) return null;
  const routeSegments = segments.filter(segment => !(segment.startsWith('(') && segment.endsWith(')')));
  if (routeSegments.length === 0) return null;
  const last = routeSegments[routeSegments.length - 1];
  if (!last.endsWith('.html')) return null;
  const basename = last.slice(0, -'.html'.length);
  if (basename === 'index' || basename === 'page') routeSegments.pop();
  else routeSegments[routeSegments.length - 1] = basename;
  return routeSegments.length > 0 ? '/' + routeSegments.join('/') : '/';
}

export async function findPrerenderedHtml(nextDir, route) {
  const appDir = path.join(nextDir, 'server', 'app');
  const htmlFiles = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(path.relative(appDir, target));
    }
  }
  await walk(appDir);
  const matches = htmlFiles.filter(file => routeFromHtmlRelativePath(file) === route);
  if (matches.length === 0) throw new Error('No prerendered HTML found for ' + route + ' under .next/server/app; route budgets must not be skipped when Next.js changes build manifests.');
  matches.sort((left, right) => {
    const count = file => file.split(/[\\/]+/).filter(segment => segment.startsWith('(') && segment.endsWith(')')).length;
    return count(left) - count(right) || left.length - right.length || left.localeCompare(right);
  });
  return path.join(appDir, matches[0]);
}
