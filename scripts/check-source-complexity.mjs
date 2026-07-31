#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(projectRoot, 'src');
const baselinePath = path.join(projectRoot, 'scripts', 'source-complexity-baseline.json');
const SOURCE_EXTENSIONS = new Set(['.css', '.js', '.jsx', '.ts', '.tsx']);
const DEFAULT_WARNING_LINES = 500;
const DEFAULT_MAX_NEW_FILE_LINES = 900;
const MAX_WARNING_ROWS = 15;

function toProjectPath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function countLines(source) {
  if (!source) return 0;
  return source.split(/\r?\n/u).length;
}

function countImportant(source) {
  return source.match(/!important\b/giu)?.length ?? 0;
}

function isTestSource(projectPath) {
  return projectPath.includes('/__tests__/') || /\.(?:spec|test)\.[cm]?[jt]sx?$/u.test(projectPath);
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    if (!entry.isFile() || !SOURCE_EXTENSIONS.has(path.extname(entry.name))) return [];
    return [entryPath];
  }));
  return nested.flat();
}

async function inspectSourceTree() {
  const files = await collectSourceFiles(sourceRoot);
  return Promise.all(files.map(async filePath => {
    const source = await readFile(filePath, 'utf8');
    const projectPath = toProjectPath(filePath);
    return {
      path: projectPath,
      lines: countLines(source),
      // Test fixtures may quote forbidden CSS to prove a guard works; they are
      // not shipped styling debt and must not consume the production allowance.
      important: isTestSource(projectPath) ? 0 : countImportant(source),
    };
  }));
}

function parseIntegerFlag(args, name, fallback = null) {
  const prefix = `--${name}=`;
  const raw = args.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return fallback;
  if (!/^\d+$/u.test(raw)) throw new Error(`${name} must be a non-negative integer`);
  return Number(raw);
}

function parseStringFlag(args, name) {
  const prefix = `--${name}=`;
  return args.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function createBaseline(records, warningLines, maxNewFileLines) {
  const files = {};
  for (const record of [...records].sort((a, b) => a.path.localeCompare(b.path))) {
    if (record.lines <= maxNewFileLines && record.important === 0) continue;
    files[record.path] = {
      ...(record.lines > maxNewFileLines ? { lines: record.lines } : {}),
      ...(record.important > 0 ? { important: record.important } : {}),
    };
  }
  return {
    version: 1,
    warningLines,
    maxNewFileLines,
    files,
  };
}

function evaluate(records, baseline) {
  const failures = [];
  const warnings = [];

  for (const record of records) {
    const allowance = baseline.files[record.path] ?? {};
    if (record.lines > baseline.maxNewFileLines) {
      if (typeof allowance.lines !== 'number') {
        failures.push(`${record.path}: new oversized source file (${record.lines} > ${baseline.maxNewFileLines} lines)`);
      } else if (record.lines > allowance.lines) {
        failures.push(`${record.path}: oversized file grew (${record.lines} > baseline ${allowance.lines} lines)`);
      }
    }

    const allowedImportant = typeof allowance.important === 'number' ? allowance.important : 0;
    if (record.important > allowedImportant) {
      failures.push(`${record.path}: !important debt grew (${record.important} > baseline ${allowedImportant})`);
    }

    if (record.lines > baseline.warningLines) warnings.push(record);
  }

  return { failures, warnings };
}

function printWarnings(warnings, warningLines) {
  if (warnings.length === 0) return;
  const largest = [...warnings].sort((a, b) => b.lines - a.lines).slice(0, MAX_WARNING_ROWS);
  console.warn(`Maintainability warning: ${warnings.length} source files exceed ${warningLines} lines.`);
  for (const record of largest) console.warn(`  ${record.lines.toString().padStart(5)}  ${record.path}`);
  if (warnings.length > largest.length) console.warn(`  … ${warnings.length - largest.length} more`);
}

async function main() {
  const args = process.argv.slice(2);
  const updateBaseline = args.includes('--update-baseline');
  const probePath = parseStringFlag(args, 'probe-as');
  const probeLines = parseIntegerFlag(args, 'probe-lines');
  const probeImportant = parseIntegerFlag(args, 'probe-important', 0);
  const hasProbe = probePath !== null || probeLines !== null || probeImportant !== 0;

  if (hasProbe && (!probePath || probeLines === null)) {
    throw new Error('A probe requires both --probe-as=<src/path> and --probe-lines=<count>');
  }
  if (probePath && (!probePath.startsWith('src/') || !SOURCE_EXTENSIONS.has(path.extname(probePath)))) {
    throw new Error('probe-as must be a supported source path under src/');
  }
  if (updateBaseline && hasProbe) throw new Error('Cannot update the baseline while probing');

  let records = await inspectSourceTree();
  if (probePath) {
    records = records.filter(record => record.path !== probePath);
    records.push({ path: probePath, lines: probeLines, important: probeImportant });
  }

  if (updateBaseline) {
    const baseline = createBaseline(records, DEFAULT_WARNING_LINES, DEFAULT_MAX_NEW_FILE_LINES);
    await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    console.log(`Updated ${toProjectPath(baselinePath)} with ${Object.keys(baseline.files).length} grandfathered debt entries.`);
    return;
  }

  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  if (baseline.version !== 1 || !baseline.files || !Number.isInteger(baseline.warningLines) || !Number.isInteger(baseline.maxNewFileLines)) {
    throw new Error('Invalid source complexity baseline');
  }

  const { failures, warnings } = evaluate(records, baseline);
  printWarnings(warnings, baseline.warningLines);
  if (failures.length > 0) {
    console.error(`Maintainability guard failed with ${failures.length} regression(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Maintainability guard passed across ${records.length} source files; no oversized-file growth or new !important debt.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
