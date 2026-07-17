import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appRoot = path.join(root, 'src', 'app');
const baseUrlArg = process.argv.find(argument => argument.startsWith('--base-url='));
const baseUrl = baseUrlArg?.slice('--base-url='.length).replace(/\/$/, '') || '';

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function routeFromFile(file) {
  const relative = path.relative(appRoot, path.dirname(file)).replaceAll('\\', '/');
  const segments = relative.split('/').filter(segment => segment && !/^\(.+\)$/.test(segment));
  const route = `/${segments.join('/')}`
    .replace(/\/\[\.\.\.([^\]]+)\]/g, '/:$1*')
    .replace(/\/\[\[\.\.\.([^\]]+)\]\]/g, '/:$1*?')
    .replace(/\/\[([^\]]+)\]/g, '/:$1');
  return route === '/' ? route : route.replace(/\/$/, '');
}

const middleware = fs.readFileSync(path.join(root, 'src', 'middleware.ts'), 'utf8');
const accessPolicy = fs.readFileSync(path.join(root, 'src', 'lib', 'auth', 'accessPolicy.ts'), 'utf8');
const protectedBlock = middleware.match(/const protectedPrefixes = \[([\s\S]*?)\];/)?.[1] || '';
const protectedPrefixes = [...protectedBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
const guestBlock = middleware.match(/const guestAllowedPaths = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';
const guestAllowed = new Set([...guestBlock.matchAll(/'([^']+)'/g)].map(match => match[1]));
const protectedApiBlock = accessPolicy.match(/const protectedApiPrefixes = \[([\s\S]*?)\] as const;/)?.[1] || '';
const protectedApiPrefixes = [...protectedApiBlock.matchAll(/'([^']+)'/g)].map(match => match[1]);
const cronApiBlock = accessPolicy.match(/const cronApiPaths = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';
const cronApiPaths = new Set([...cronApiBlock.matchAll(/'([^']+)'/g)].map(match => match[1]));

function pageAccess(route) {
  if (route.startsWith('/sfm-admin-control')) return 'admin-only';
  if (route.includes('/owner') || route.startsWith('/company-owner')) return 'owner-only';
  if (route === '/alerts' || route === '/notif') return 'redirect';
  const prefix = protectedPrefixes.find(value => route === value || route.startsWith(`${value}/`));
  if (prefix) return guestAllowed.has(route) ? 'authenticated-or-guest-demo' : 'authenticated';
  return 'public';
}

function apiAccess(route, source) {
  if (!route.startsWith('/api/')) return 'hidden/internal';
  if (route.startsWith('/api/admin/') || route.startsWith('/api/debug/')) return 'admin-only-api';
  if (cronApiPaths.has(route) || /CRON_SECRET|isCronAuthorized/.test(source)) return 'cron-secret-api';
  const protectedPrefix = protectedApiPrefixes.find(value => route === value || route.startsWith(`${value}/`));
  if (protectedPrefix) return 'authenticated-api';
  if (/requireAdmin|isAdmin|SUPER_ADMIN|ADMIN_EMAIL/.test(source)) return 'admin-only-api';
  if (/requireAuthenticated|requireUser|auth\.getUser|inspectSession|user\.id/.test(source)) return 'authenticated-api';
  return 'public-api';
}

function csv(value) {
  const normalized = String(value ?? '');
  return /[",\n]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
}

const files = walk(appRoot).filter(file => /(?:page|route)\.(?:ts|tsx|js|jsx)$/.test(file));
const rows = files.map(file => {
  const kind = /page\.(?:ts|tsx|js|jsx)$/.test(file) ? 'page' : 'route-handler';
  const route = routeFromFile(file);
  const source = path.relative(root, file).replaceAll('\\', '/');
  const body = fs.readFileSync(file, 'utf8');
  return {
    route,
    kind,
    access: kind === 'page' ? pageAccess(route) : apiAccess(route, body),
    source,
    dynamic: route.includes(':'),
    observedStatus: '',
    observedLocation: '',
    evidence: kind === 'page' ? 'filesystem+middleware' : 'filesystem+handler-source',
  };
}).sort((left, right) => left.route.localeCompare(right.route) || left.kind.localeCompare(right.kind));

if (baseUrl) {
  for (const row of rows) {
    if (row.kind !== 'page') {
      row.evidence += '; runtime requires method/fixture';
      continue;
    }
    if (row.dynamic) {
      row.evidence += '; runtime requires fixture identifier';
      continue;
    }
    try {
      const response = await fetch(`${baseUrl}${row.route}`, {
        redirect: 'manual',
        headers: { 'user-agent': 'THE-SFM-release-audit/5.0D' },
      });
      row.observedStatus = response.status;
      row.observedLocation = response.headers.get('location') || '';
      row.evidence += '; production GET';
    } catch (error) {
      row.observedStatus = 'unavailable';
      row.evidence += `; production GET failed: ${error instanceof Error ? error.name : 'unknown'}`;
    }
  }
}

const headers = ['route', 'kind', 'access', 'source', 'observed_status', 'observed_location', 'evidence'];
process.stdout.write(`${headers.join(',')}\n`);
for (const row of rows) {
  process.stdout.write([
    row.route,
    row.kind,
    row.access,
    row.source,
    row.observedStatus,
    row.observedLocation,
    row.evidence,
  ].map(csv).join(',') + '\n');
}
