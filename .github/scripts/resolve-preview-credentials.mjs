import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const validRef = value => typeof value === 'string' && /^[a-z0-9]{20}$/.test(value);

// Branch keys are project-specific. Never reuse a repository-wide Preview key
// after the Supabase integration has resolved a different ephemeral branch.
export async function resolvePreviewCredentials(env, fetchImpl = fetch) {
  const ref = env.SUPABASE_PREVIEW_REF;
  const production = env.SUPABASE_PRODUCTION_REF;
  if (!validRef(ref) || !validRef(production) || ref === production) {
    throw new Error('Credential resolution requires a valid isolated Preview ref, never Production.');
  }
  if (env.SUPABASE_PREVIEW_URL !== `https://${ref}.supabase.co`) {
    throw new Error('Preview URL does not match the verified Preview ref.');
  }
  const token = env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required to resolve the branch credentials.');
  let response;
  try {
    response = await fetchImpl(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Preview credential lookup failed before an HTTP response.');
  }
  if (!response.ok) throw new Error(`Preview credential lookup failed HTTP ${response.status}.`);
  const keys = await response.json().catch(() => null);
  if (!Array.isArray(keys)) throw new Error('Preview credential response is not a key list.');
  // Existing observability probes use Authorization: Bearer with PostgREST;
  // a modern sb_secret key is not a JWT, so do not silently substitute one.
  const candidates = keys.filter(key => key?.disabled !== true && key?.name === 'service_role'
    && (key.type === 'legacy' || key.type === undefined));
  if (candidates.length !== 1) throw new Error('Expected exactly one active Preview service-role JWT.');
  const key = candidates[0].api_key;
  if (typeof key !== 'string' || /\s/.test(key) || key.split('.').length !== 3) {
    throw new Error('Preview service-role credential is not a valid JWT-shaped value.');
  }
  let claims;
  try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')); } catch {
    throw new Error('Preview service-role credential has invalid claims.');
  }
  if (claims?.ref !== ref || claims?.role !== 'service_role') {
    throw new Error('Preview service-role credential does not belong to the resolved branch.');
  }
  if (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now()) {
    throw new Error('Preview service-role credential has expired.');
  }
  return key;
}

export async function writePreviewCredentials(env = process.env, fetchImpl = fetch, log = console.log, append = appendFileSync) {
  if (!env.GITHUB_ENV) throw new Error('GITHUB_ENV is required; credentials are never printed as output.');
  const key = await resolvePreviewCredentials(env, fetchImpl);
  // Mask before writing the job-scoped environment; never emit GITHUB_OUTPUT,
  // reusable artifacts, storage state, API response bodies, or plaintext keys.
  log(`::add-mask::${key}`);
  append(env.GITHUB_ENV, `SUPABASE_SERVICE_ROLE_KEY=${key}\n`, { encoding: 'utf8', mode: 0o600 });
  log('Resolved a branch-specific Preview service-role credential.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writePreviewCredentials();
}
