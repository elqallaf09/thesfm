#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const [productionPath, previewPath] = process.argv.slice(2)

if (!productionPath || !previewPath) {
  console.error('Usage: audit-supabase-env-isolation.mjs <production-env> <preview-env>')
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

function decodeLegacyJwt(value) {
  if (!value?.startsWith('eyJ')) return null
  try {
    return JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

function projectRef(value) {
  if (!value) return null
  const patterns = [
    /https:\/\/([a-z0-9]{20})\.supabase\.co/u,
    /db\.([a-z0-9]{20})\.supabase\.co/u,
    /postgres\.([a-z0-9]{20}):/u,
  ]
  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (match) return match[1]
  }

  const payload = decodeLegacyJwt(value)
  if (typeof payload?.ref === 'string' && /^[a-z0-9]{20}$/u.test(payload.ref)) {
    return payload.ref
  }
  const issuerMatch = String(payload?.iss ?? '').match(
    /https:\/\/([a-z0-9]{20})\.supabase\.co/u,
  )
  return issuerMatch?.[1] ?? null
}

function credentialClass(value) {
  if (!value) return 'absent'
  if (/encrypted|sensitive|unavailable|redacted/iu.test(value)) {
    return 'provider-redacted'
  }
  if (value.startsWith('sb_publishable_')) return 'publishable'
  if (value.startsWith('sb_secret_')) return 'secret/server-only'
  const payload = decodeLegacyJwt(value)
  if (payload?.role === 'anon') return 'legacy anon/public'
  if (payload?.role === 'service_role') return 'legacy service-role/privileged'
  if (payload) return 'legacy JWT'
  return 'opaque'
}

function fingerprint(value) {
  if (!value) return null
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

const production = parseDotEnv(productionPath)
const preview = parseDotEnv(previewPath)
const names = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'NEXT_PUBLIC_DATABASE_URL',
  'NEXT_PUBLIC_DATABASE_PUBLISHABLE_KEY',
  'DATABASE_URL',
  'DATABASE_SERVICE_ROLE_KEY',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
]

const rows = names.map((name) => {
  const productionValue = production.get(name) ?? ''
  const previewValue = preview.get(name) ?? ''
  return {
    name,
    production: productionValue ? 'present' : 'absent',
    productionRef: projectRef(productionValue),
    productionClass: credentialClass(productionValue),
    productionFingerprint: fingerprint(productionValue),
    productionLength: productionValue.length,
    preview: previewValue ? 'present' : 'absent',
    previewRef: projectRef(previewValue),
    previewClass: credentialClass(previewValue),
    previewFingerprint: fingerprint(previewValue),
    previewLength: previewValue.length,
    sameValue:
      productionValue && previewValue ? productionValue === previewValue : null,
  }
})

console.log(JSON.stringify(rows, null, 2))
