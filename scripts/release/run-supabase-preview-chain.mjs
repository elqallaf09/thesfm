#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const [envPath, mode = 'dry-run'] = process.argv.slice(2)
const expectedPreviewRef = 'tilrkqdngnokvxuvllio'
const productionRef = 'hirjgsyfolsvfqjayyfz'

if (!envPath || !['dry-run', 'apply'].includes(mode)) {
  console.error('Usage: run-supabase-preview-chain.mjs <preview-env> [dry-run|apply]')
  process.exit(2)
}

function parseDotEnv(path) {
  const values = new Map()
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u)
    if (!match) continue
    let value = match[2]
    if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value)
      } catch {
        value = value.slice(1, -1)
      }
    }
    values.set(match[1], value)
  }
  return values
}

const values = parseDotEnv(envPath)
const databaseUrl =
  values.get('POSTGRES_URL_NON_POOLING') ?? values.get('POSTGRES_URL')

if (!databaseUrl) {
  console.error('Preview database URL is unavailable')
  process.exit(2)
}
if (!databaseUrl.includes(expectedPreviewRef) || databaseUrl.includes(productionRef)) {
  console.error('Refusing to run: the database URL is not the approved disposable Preview ref')
  process.exit(2)
}

const executable =
  process.platform === 'win32' ? process.execPath : 'npx'
const args = [
  ...(process.platform === 'win32'
    ? ['C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js']
    : []),
  '--yes',
  'supabase@2.109.1',
  'db',
  'push',
  '--db-url',
  databaseUrl,
  '--include-all',
  '--yes',
  '--output-format',
  'json',
]
if (mode === 'dry-run') args.push('--dry-run')

const result = spawnSync(executable, args, {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})

if (result.error) console.error(result.error.message)
if (result.stdout) process.stdout.write(result.stdout)
if (result.stderr) process.stderr.write(result.stderr)
process.exit(result.status ?? 1)
