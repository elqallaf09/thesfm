#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(projectRoot, 'scripts', 'eslint-debt-baseline.json');

function countWarnings(results) {
  const counts = {};
  for (const result of results) {
    for (const message of result.messages) {
      if (message.severity !== 1) continue;
      const rule = message.ruleId ?? 'unknown-warning';
      counts[rule] = (counts[rule] ?? 0) + 1;
    }
  }
  return counts;
}

function errorOnlyResults(results) {
  return results
    .map(result => ({
      ...result,
      messages: result.messages.filter(message => message.severity === 2),
      warningCount: 0,
      fixableWarningCount: 0,
    }))
    .filter(result => result.messages.length > 0);
}

async function main() {
  const probeRule = process.argv.find(argument => argument.startsWith('--probe-rule='))?.slice('--probe-rule='.length) ?? null;
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  if (baseline.version !== 1 || !baseline.rules || Object.values(baseline.rules).some(value => !Number.isInteger(value))) {
    throw new Error('Invalid ESLint debt baseline');
  }

  const eslint = new ESLint({ cwd: projectRoot });
  const results = await eslint.lintFiles(['.']);
  const errorResults = errorOnlyResults(results);
  const warningCounts = countWarnings(results);
  if (probeRule) warningCounts[probeRule] = (warningCounts[probeRule] ?? 0) + 1;

  if (errorResults.length > 0) {
    const formatter = await eslint.loadFormatter('stylish');
    console.error(await formatter.format(errorResults));
  }

  const regressions = [];
  const allWarningRules = new Set([...Object.keys(baseline.rules), ...Object.keys(warningCounts)]);
  for (const rule of [...allWarningRules].sort()) {
    const actual = warningCounts[rule] ?? 0;
    const allowed = baseline.rules[rule] ?? 0;
    if (actual > allowed) regressions.push(`${rule}: ${actual} > baseline ${allowed}`);
  }

  if (regressions.length > 0) {
    console.error('ESLint debt guard failed:');
    for (const regression of regressions) console.error(`  - ${regression}`);
  }

  if (errorResults.length > 0 || regressions.length > 0) {
    process.exitCode = 1;
    return;
  }

  const debtSummary = Object.entries(baseline.rules)
    .map(([rule, allowed]) => `${rule}=${warningCounts[rule] ?? 0}/${allowed}`)
    .join(', ');
  console.log(`ESLint guard passed: no errors or warning-debt growth (${debtSummary}).`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
