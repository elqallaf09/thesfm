#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const SCAN_ROOTS = [
  'src/app',
  'src/components',
  'src/hooks',
  'src/lib',
  'src/integrations',
  'src/trader-app',
  'middleware.ts',
  'next.config.ts',
  '.github/workflows',
];

const ALLOWED_FILES = new Set([
  path.normalize('src/lib/server/imageUrlResolver.ts'),
]);

const ALLOWED_PATH_PARTS = [
  `${path.sep}__tests__${path.sep}`,
  `${path.sep}tests${path.sep}`,
  `${path.sep}test${path.sep}`,
];

const ENDPOINT_PATTERNS = [
  { label: 'localhost HTTP endpoint', regex: /https?:\/\/(?:localhost|0\.0\.0\.0)(?::\d+)?(?:[/"'`\s)]|$)/gi },
  { label: 'loopback HTTP endpoint', regex: /https?:\/\/(?:127(?:\.\d{1,3}){3}|\[?::1\]?)(?::\d+)?(?:[/"'`\s)]|$)/gi },
  { label: 'private 10.x HTTP endpoint', regex: /https?:\/\/10(?:\.\d{1,3}){3}(?::\d+)?(?:[/"'`\s)]|$)/gi },
  { label: 'private 192.168.x HTTP endpoint', regex: /https?:\/\/192\.168(?:\.\d{1,3}){2}(?::\d+)?(?:[/"'`\s)]|$)/gi },
  { label: 'private 172.16-31.x HTTP endpoint', regex: /https?:\/\/172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}(?::\d+)?(?:[/"'`\s)]|$)/gi },
];

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.js',
  '.jsx',
  '.json',
  '.mjs',
  '.ts',
  '.tsx',
  '.yml',
  '.yaml',
]);

function walk(targetPath) {
  const fullPath = path.join(root, targetPath);
  if (!existsSync(fullPath)) return [];
  const stat = statSync(fullPath);
  if (stat.isFile()) return [fullPath];
  const files = [];
  for (const entry of readdirSync(fullPath)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'coverage' || entry === 'dist') continue;
    files.push(...walk(path.join(targetPath, entry)));
  }
  return files;
}

function isAllowed(fullPath) {
  const relative = path.normalize(path.relative(root, fullPath));
  if (ALLOWED_FILES.has(relative)) return true;
  return ALLOWED_PATH_PARTS.some(part => fullPath.includes(part));
}

const findings = [];

for (const scanRoot of SCAN_ROOTS) {
  for (const filePath of walk(scanRoot)) {
    if (isAllowed(filePath)) continue;
    if (!TEXT_EXTENSIONS.has(path.extname(filePath))) continue;
    const text = readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    for (const pattern of ENDPOINT_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(text))) {
        const line = text.slice(0, match.index).split(/\r?\n/).length;
        findings.push({
          file: path.relative(root, filePath).replaceAll(path.sep, '/'),
          line,
          label: pattern.label,
          match: match[0].trim(),
          source: lines[line - 1]?.trim() ?? '',
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error('Production endpoint guard failed. Remove localhost/private HTTP endpoints from production paths:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.label} (${finding.match})`);
    console.error(`  ${finding.source}`);
  }
  process.exit(1);
}

console.log('Production endpoint guard passed: no localhost or private HTTP endpoints found in production paths.');
