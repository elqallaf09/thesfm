#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const [productionPath, previewPath] = process.argv.slice(2)
if (!productionPath || !previewPath) {
  console.error('Usage: verify-supabase-cross-project-boundary.mjs <production-env> <preview-env>')
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

const production = parseDotEnv(productionPath)
const preview = parseDotEnv(previewPath)
const productionUrl = production.get('SUPABASE_URL')
const previewAnon = preview.get('SUPABASE_ANON_KEY')
const previewPrivileged =
  preview.get('SUPABASE_SECRET_KEY') ?? preview.get('SUPABASE_SERVICE_ROLE_KEY')

if (!productionUrl || !previewAnon || !previewPrivileged) {
  console.error('Required environment entries are unavailable')
  process.exit(2)
}

async function probe(name, url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) })
  await response.body?.cancel()
  return { name, status: response.status, denied: [401, 403].includes(response.status) }
}

const readProbe = await probe(
  'preview-public-credential-to-production-read',
  `${productionUrl}/rest/v1/profiles?select=id&limit=1`,
  {
    headers: {
      apikey: previewAnon,
      authorization: `Bearer ${previewAnon}`,
    },
  },
)

const writeAuthProbe = await probe(
  'preview-privileged-credential-to-production-write-auth',
  `${productionUrl}/rest/v1/rpc/__release_isolation_probe_018f70f4b69676c094296f9fb429b709`,
  {
    method: 'POST',
    headers: {
      apikey: previewPrivileged,
      authorization: `Bearer ${previewPrivileged}`,
      'content-type': 'application/json',
    },
    body: '{}',
  },
)

const result = {
  readProbe,
  writeAuthProbe,
  pass: readProbe.denied && writeAuthProbe.denied,
}

console.log(JSON.stringify(result, null, 2))
process.exitCode = result.pass ? 0 : 1
