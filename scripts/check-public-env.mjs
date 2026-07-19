#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const SCAN_ROOTS = [
  'src',
  'scripts',
  '.github/workflows',
  '.env.example',
  'next.config.ts',
  'middleware.ts',
  'package.json',
];

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.env',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.yml',
  '.yaml',
]);

const SAFE_PUBLIC_ENV_NAMES = new Set([
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_INSTAGRAM_URL',
  'NEXT_PUBLIC_DEBUG_BUSINESS_SAVE',
  'NEXT_PUBLIC_ADMIN_EMAILS',
]);

const SENSITIVE_PUBLIC_NAME = /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|WEBHOOK|TOKEN|ACCESS_TOKEN|REFRESH_TOKEN|API_KEY|CLIENT_SECRET|SIGNING_SECRET)[A-Z0-9_]*/g;

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

const findings = [];

for (const scanRoot of SCAN_ROOTS) {
  for (const filePath of walk(scanRoot)) {
    if (!TEXT_EXTENSIONS.has(path.extname(filePath))) continue;
    const text = readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    let match;
    SENSITIVE_PUBLIC_NAME.lastIndex = 0;
    while ((match = SENSITIVE_PUBLIC_NAME.exec(text))) {
      const envName = match[0];
      if (SAFE_PUBLIC_ENV_NAMES.has(envName)) continue;
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      findings.push({
        file: path.relative(root, filePath).replaceAll(path.sep, '/'),
        line,
        envName,
        source: lines[line - 1]?.trim() ?? '',
      });
    }
  }
}

if (findings.length > 0) {
  console.error('Public environment guard failed. Do not expose secret-like variables through NEXT_PUBLIC_* names:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.envName}`);
    console.error(`  ${finding.source}`);
  }
  process.exit(1);
}

console.log('Public environment guard passed: no secret-like NEXT_PUBLIC_* variables found.');
