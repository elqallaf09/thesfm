#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_TRACKED_FILE_BYTES = 5 * 1024 * 1024;
const PROHIBITED_PREFIXES = [
  '.lighthouseci/',
  '.next/',
  'artifacts/',
  'node_modules/',
  'playwright-report/',
  'test-results/',
];

function isGeneratedOutput(filePath) {
  return PROHIBITED_PREFIXES.some(prefix => filePath.startsWith(prefix))
    || filePath.endsWith('.log')
    || filePath.endsWith('.trace.zip');
}

function parseProbe(argumentsList) {
  const probePath = argumentsList.find(argument => argument.startsWith('--probe-as='))?.slice('--probe-as='.length) ?? null;
  const rawBytes = argumentsList.find(argument => argument.startsWith('--probe-bytes='))?.slice('--probe-bytes='.length) ?? null;
  if (probePath === null && rawBytes === null) return null;
  if (!probePath || rawBytes === null || !/^\d+$/u.test(rawBytes)) {
    throw new Error('A probe requires --probe-as=<path> and --probe-bytes=<non-negative integer>');
  }
  return { path: probePath, bytes: Number(rawBytes) };
}

async function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const paths = output.split('\0').filter(Boolean);
  return Promise.all(paths.map(async filePath => ({
    path: filePath,
    bytes: (await stat(path.join(projectRoot, filePath))).size,
  })));
}

async function main() {
  const probe = parseProbe(process.argv.slice(2));
  const files = await trackedFiles();
  if (probe) files.push(probe);

  const failures = [];
  for (const file of files) {
    if (isGeneratedOutput(file.path)) failures.push(`${file.path}: generated output must not be tracked`);
    if (file.bytes > MAX_TRACKED_FILE_BYTES) {
      failures.push(`${file.path}: ${file.bytes} bytes exceeds the ${MAX_TRACKED_FILE_BYTES}-byte tracked-file limit`);
    }
  }

  if (failures.length > 0) {
    console.error(`Repository hygiene guard failed with ${failures.length} issue(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Repository hygiene guard passed across ${files.length} tracked files; no generated output or file above 5 MiB.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
