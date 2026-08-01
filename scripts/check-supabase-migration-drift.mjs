#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function parseMigrationStatus(output) {
  const rows = [];
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes('|')) continue;
    const [localRaw = '', remoteRaw = ''] = line.split('|');
    const local = localRaw.trim();
    const remote = remoteRaw.trim();
    if (!local && !remote) continue;
    if (/^local$/i.test(local) || /^-+$/.test(local) || /^remote$/i.test(remote) || /^-+$/.test(remote)) continue;
    if (!/^\d+$/.test(local) && !/^\d+$/.test(remote)) continue;
    rows.push({ local: /^\d+$/.test(local) ? local : null, remote: /^\d+$/.test(remote) ? remote : null });
  }
  return rows;
}

export function migrationDrift(rows) {
  return rows.filter(row => !row.local || !row.remote || row.local !== row.remote);
}

function selfTest() {
  const clean = parseMigrationStatus(`Local | Remote | Time\n------|--------|-----\n001 | 001 | x\n20260731 | 20260731 | y`);
  if (clean.length !== 2 || migrationDrift(clean).length !== 0) throw new Error('clean migration fixture failed');
  const drifted = parseMigrationStatus(`Local | Remote | Time\n------|--------|-----\n001 | 001 | x\n002 |     | y\n    | 003 | z`);
  if (migrationDrift(drifted).length !== 2) throw new Error('drift migration fixture failed');
  console.log('Supabase migration drift parser self-test passed.');
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const inputPath = process.argv[2];
  const output = inputPath ? readFileSync(inputPath, 'utf8') : readFileSync(0, 'utf8');
  const rows = parseMigrationStatus(output);
  if (!rows.length) {
    console.error('Supabase migration drift check failed closed: no migration rows were parsed.');
    process.exit(1);
  }
  const drift = migrationDrift(rows);
  if (drift.length) {
    console.error('Supabase migration drift detected:');
    for (const row of drift) console.error(`- local=${row.local ?? 'missing'} remote=${row.remote ?? 'missing'}`);
    process.exit(1);
  }
  console.log(`Supabase migration history matches: ${rows.length} local and remote versions are aligned.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main();
