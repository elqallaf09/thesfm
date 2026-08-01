#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiRoot = path.join(root, 'src/app/api');
const factoryPattern = /createAdminApiRoute(?:<[^\n]+>)?\s*\(/;
const manualAdminCheckPattern = /require(?:Super)?AdminApiAccess\s*\(/;
const exceptionPattern = /\/\/ ADMIN_API_POLICY_EXCEPTION: ([a-z0-9-]+)/;
const allowedExceptions = new Map([
  ['src/app/api/admin/access/route.ts', 'admin-access-bootstrap'],
  ['src/app/api/admin/me/route.ts', 'admin-self-inspection'],
  ['src/app/api/health/database/route.ts', 'public-health-admin-details'],
  ['src/app/api/market-news/ingest/route.ts', 'cron-or-admin-news-ingest'],
  ['src/app/api/market/signals/refresh/route.ts', 'cron-or-admin-signal-refresh'],
]);
const sensitiveHybridRoutes = new Set([
  'src/app/api/receipts/provider-status/route.ts',
  'src/app/api/trader/provider-status/route.ts',
]);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : entry.name === 'route.ts' ? [target] : [];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function isAdminPath(file) {
  return relative(file).split('/').includes('admin');
}

function isSensitiveNonAdminPath(route) {
  return route.startsWith('src/app/api/debug/') || sensitiveHybridRoutes.has(route);
}

const failures = [];
let factoryRoutes = 0;
let exceptionRoutes = 0;

for (const file of walk(apiRoot)) {
  const source = readFileSync(file, 'utf8');
  const route = relative(file);
  const usesFactory = factoryPattern.test(source);
  const needsPolicy = isAdminPath(file) || isSensitiveNonAdminPath(route) || manualAdminCheckPattern.test(source);
  if (!needsPolicy) continue;
  if (usesFactory) {
    factoryRoutes += 1;
    continue;
  }

  const declared = source.match(exceptionPattern)?.[1];
  const expected = allowedExceptions.get(route);
  if (!expected || declared !== expected) {
    failures.push(`${route}: use createAdminApiRoute or declare the reviewed exact exception`);
    continue;
  }
  exceptionRoutes += 1;
}

for (const [route, marker] of allowedExceptions) {
  const file = path.join(root, route);
  if (!existsSync(file)) {
    failures.push(`${route}: reviewed exception target is missing; remove its stale allowance`);
    continue;
  }
  const source = readFileSync(file, 'utf8');
  if (!source.includes(`// ADMIN_API_POLICY_EXCEPTION: ${marker}`)) {
    failures.push(`${route}: reviewed exception marker changed or was removed`);
  }
}

if (failures.length) {
  console.error('Admin API policy guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Admin API policy guard passed: ${factoryRoutes} factory routes and ${exceptionRoutes} reviewed exceptions.`);
