import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appRoot = path.join(root, 'src', 'app');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function routeFromPage(file) {
  const relative = path.relative(appRoot, path.dirname(file)).replaceAll('\\', '/');
  const segments = relative.split('/').filter(segment => segment && !/^\(.+\)$/.test(segment));
  const route = `/${segments.join('/')}`;
  return route === '/' ? route : route.replace(/\/$/, '');
}

function quotedRoutes(source) {
  return [...source.matchAll(/'((?:\/)[^']*)'/g)].map(match => match[1]);
}

function segmentMatches(route, prefix) {
  return route === prefix || route.startsWith(`${prefix}/`);
}

const middleware = fs.readFileSync(path.join(root, 'src', 'middleware.ts'), 'utf8');
const workspaceIndex = fs.readFileSync(path.join(root, 'src', 'config', 'workspaces', 'workspace-route-index.ts'), 'utf8');
const publicShell = fs.readFileSync(path.join(root, 'src', 'config', 'workspaces', 'public-shell-routes.ts'), 'utf8');

const protectedBlock = middleware.match(/const protectedPrefixes = \[([\s\S]*?)\];/)?.[1] || '';
const protectedPrefixes = quotedRoutes(protectedBlock);
const workspacePrefixes = quotedRoutes(workspaceIndex);
const publicShellRoutes = quotedRoutes(publicShell);
const explicitInfrastructureRoutes = new Set(['/guest', '/setup']);

const pages = walk(appRoot)
  .filter(file => /page\.(?:ts|tsx|js|jsx)$/.test(file))
  .map(file => ({ route: routeFromPage(file), file: path.relative(root, file).replaceAll('\\', '/') }))
  .sort((a, b) => a.route.localeCompare(b.route));

const unowned = pages.filter(({ route }) => {
  if (route === '/') return false;
  if (explicitInfrastructureRoutes.has(route)) return false;
  if (protectedPrefixes.some(prefix => segmentMatches(route, prefix))) return false;
  if (workspacePrefixes.some(prefix => segmentMatches(route, prefix))) return false;
  if (publicShellRoutes.some(prefix => segmentMatches(route, prefix))) return false;
  return true;
});

if (unowned.length > 0) {
  console.error('Page route ownership check failed. Every page must belong to middleware protection, a workspace route family, the public shell, or the explicit infrastructure allowlist.');
  for (const item of unowned) console.error(`- ${item.route} (${item.file})`);
  process.exit(1);
}

console.log(`Page route ownership check passed (${pages.length} pages).`);
