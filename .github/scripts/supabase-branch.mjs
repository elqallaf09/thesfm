#!/usr/bin/env node
// Supabase Management API branch provisioning for Supabase Preview Validate.
//
// Used only to create/poll/inspect/delete WORKFLOW-OWNED ephemeral Preview
// branches, and to retrieve an already-resolved branch's own API keys. It
// never touches SUPABASE_PRODUCTION_REF as a target — every entrypoint that
// resolves a project ref refuses to proceed if that ref equals the
// configured production ref (see assertNotProductionRef).
//
// All Management API calls are plain fetch() against the documented
// https://api.supabase.com REST surface, following the same pattern already
// used by reconcile-preview-migration-history.mjs in this directory:
// Authorization: Bearer <SUPABASE_ACCESS_TOKEN>, and every response shape is
// validated explicitly — an unexpected shape fails closed with a clear
// message rather than being guessed at.
//
// Every function that returns a credential (an API key) never logs it; only
// the CLI's `get-keys` command prints an ::add-mask:: directive for each key
// before writing it anywhere, and only ever writes it to $GITHUB_ENV
// (job-scoped), never $GITHUB_OUTPUT (which crosses job boundaries and is
// more exposed).

import { appendFileSync } from 'node:fs';

export const MANAGEMENT_API_BASE = process.env.SUPABASE_MANAGEMENT_API_BASE_URL || 'https://api.supabase.com';

// ACTIVE_HEALTHY is the confirmed real terminal status observed against the
// live Management API (see PR #71's dispatch evidence). MIGRATIONS_PASSED /
// FUNCTIONS_DEPLOYED are kept as additional accepted states in case a
// different branch configuration surfaces them instead.
export const HEALTHY_BRANCH_STATUSES = new Set(['ACTIVE_HEALTHY', 'MIGRATIONS_PASSED', 'FUNCTIONS_DEPLOYED']);
export const FAILED_BRANCH_STATUSES = new Set(['MIGRATIONS_FAILED', 'FUNCTIONS_FAILED', 'CREATE_FAILED']);

export class SupabaseManagementError extends Error {}

export function assertNotProductionRef(ref, productionRef) {
  if (!ref) throw new SupabaseManagementError('Resolved project ref is empty.');
  if (!productionRef) throw new SupabaseManagementError('SUPABASE_PRODUCTION_REF is not set — refusing to proceed without a way to prove the target is not Production.');
  if (ref === productionRef) {
    throw new SupabaseManagementError(`Resolved project ref ${ref} equals SUPABASE_PRODUCTION_REF. Refusing to proceed.`);
  }
}

export function isValidProjectRef(ref) {
  return typeof ref === 'string' && /^[a-z0-9]{20}$/.test(ref);
}

async function managementRequest(path, { method = 'GET', accessToken, body, fetchImpl = fetch } = {}) {
  if (!accessToken) throw new SupabaseManagementError('SUPABASE_ACCESS_TOKEN is not set.');
  let response;
  try {
    response = await fetchImpl(`${MANAGEMENT_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (networkError) {
    throw new SupabaseManagementError(`Could not reach the Supabase Management API (${method} ${path}): ${networkError.message}`);
  }
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new SupabaseManagementError(`Supabase Management API returned a non-JSON response for ${method} ${path} (HTTP ${response.status}).`);
    }
  }
  if (!response.ok) {
    const detail = parsed?.message || parsed?.error || text.slice(0, 300) || '(no body)';
    throw new SupabaseManagementError(`Supabase Management API ${method} ${path} returned HTTP ${response.status}: ${detail}`);
  }
  return parsed;
}

// Creates a new ephemeral, non-persistent, schema-only branch (no data
// clone) under the parent project. Returns { branchId, ref } immediately
// after the create call succeeds — the branch is not necessarily healthy
// yet; call waitForBranchHealthy separately.
export async function createBranch({ parentRef, branchName, accessToken, fetchImpl = fetch }) {
  if (!isValidProjectRef(parentRef)) throw new SupabaseManagementError('parentRef does not look like a valid Supabase project ref.');
  if (!branchName) throw new SupabaseManagementError('branchName is required.');

  const created = await managementRequest(`/v1/projects/${parentRef}/branches`, {
    method: 'POST',
    accessToken,
    fetchImpl,
    body: { branch_name: branchName, persistent: false },
  });

  const branchId = created?.id;
  const ref = created?.project_ref ?? created?.ref;
  if (!branchId || !ref) {
    throw new SupabaseManagementError('Supabase Management API branch-create response did not include both an id and a project_ref.');
  }
  return { branchId: String(branchId), ref: String(ref) };
}

export async function getBranchStatus({ branchId, accessToken, fetchImpl = fetch }) {
  if (!branchId) throw new SupabaseManagementError('branchId is required.');
  const branch = await managementRequest(`/v1/branches/${branchId}`, { accessToken, fetchImpl });
  if (!branch || typeof branch.status !== 'string') {
    throw new SupabaseManagementError('Supabase Management API branch-status response did not include a status string.');
  }
  return branch.status;
}

export async function waitForBranchHealthy({
  branchId,
  accessToken,
  fetchImpl = fetch,
  timeoutMs,
  intervalMs = 15_000,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const deadline = now() + timeoutMs;
  let lastStatus = null;
  while (now() < deadline) {
    lastStatus = await getBranchStatus({ branchId, accessToken, fetchImpl });
    if (HEALTHY_BRANCH_STATUSES.has(lastStatus)) return lastStatus;
    if (FAILED_BRANCH_STATUSES.has(lastStatus)) {
      throw new SupabaseManagementError(`Branch ${branchId} entered failure status ${lastStatus}.`);
    }
    await sleep(intervalMs);
  }
  throw new SupabaseManagementError(`Branch ${branchId} did not become healthy within ${timeoutMs}ms (last observed status: ${lastStatus ?? 'none'}).`);
}

// Resolution-order decision (step 2 vs step 3): reuse a successful
// externally-resolved Preview ref for the exact target SHA if one exists;
// only fall back to workflow-owned creation when it doesn't. The workflow
// resolves `externalRef` via the GitHub "Supabase Preview" check before
// calling this — kept as a small pure function so the decision boundary
// itself has direct test coverage independent of that GitHub API call.
export function shouldCreateBranch(externalRef) {
  return !externalRef;
}

// Retrieves a project's own anon/service_role API keys. Works uniformly for
// a branch project ref or a regular project ref — a Supabase branch is
// itself a project with its own keys.
export async function getProjectApiKeys({ ref, accessToken, fetchImpl = fetch }) {
  if (!isValidProjectRef(ref)) throw new SupabaseManagementError('ref does not look like a valid Supabase project ref.');
  const keys = await managementRequest(`/v1/projects/${ref}/api-keys`, { accessToken, fetchImpl });
  if (!Array.isArray(keys)) {
    throw new SupabaseManagementError('Supabase Management API api-keys response was not an array.');
  }
  const anon = keys.find((k) => k?.name === 'anon')?.api_key;
  const serviceRole = keys.find((k) => k?.name === 'service_role')?.api_key;
  if (!anon || !serviceRole) {
    throw new SupabaseManagementError('Supabase Management API api-keys response did not include both an anon and a service_role key.');
  }
  return { anonKey: anon, serviceRoleKey: serviceRole, url: `https://${ref}.supabase.co` };
}

export async function deleteBranch({ branchId, accessToken, fetchImpl = fetch }) {
  if (!branchId) throw new SupabaseManagementError('branchId is required.');
  await managementRequest(`/v1/branches/${branchId}`, { method: 'DELETE', accessToken, fetchImpl });
}

// Deterministic, human-legible ephemeral branch name.
export function branchNameFor(prNumber, sha) {
  if (!sha) throw new SupabaseManagementError('branchNameFor requires a sha.');
  const shortSha = sha.slice(0, 7);
  return prNumber ? `ci-pr-${prNumber}-${shortSha}` : `ci-sha-${shortSha}`;
}

function githubOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) {
    console.log(`[supabase-branch] (no GITHUB_OUTPUT set) ${name}=${value}`);
    return;
  }
  appendFileSync(file, `${name}=${value}\n`);
}

function githubEnvMasked(name, value) {
  // Order matters: the mask directive must be emitted before the value is
  // written anywhere else the runner logs.
  console.log(`::add-mask::${value}`);
  const file = process.env.GITHUB_ENV;
  if (!file) {
    console.log(`[supabase-branch] (no GITHUB_ENV set) ${name}=<masked>`);
    return;
  }
  appendFileSync(file, `${name}=${value}\n`);
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      flags[key] = value;
      i += 1;
    }
  }
  return flags;
}

async function main() {
  const [, , command, ...rest] = process.argv;
  const flags = parseFlags(rest);
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (command === 'create') {
    const branchName = flags['branch-name'] || branchNameFor(flags['pr-number'], flags.sha);
    const { branchId, ref } = await createBranch({
      parentRef: flags['parent-ref'],
      branchName,
      accessToken,
    });
    assertNotProductionRef(ref, flags['production-ref']);
    console.log(`Created branch ${branchId} (ref ${ref}, name ${branchName}).`);
    githubOutput('branch_id', branchId);
    githubOutput('ref', ref);
    return;
  }

  if (command === 'wait-healthy') {
    const status = await waitForBranchHealthy({
      branchId: flags['branch-id'],
      accessToken,
      timeoutMs: Number(flags['timeout-ms'] || 600_000),
    });
    console.log(`Branch ${flags['branch-id']} is healthy (status ${status}).`);
    return;
  }

  if (command === 'get-keys') {
    const ref = flags.ref;
    assertNotProductionRef(ref, flags['production-ref']);
    const { anonKey, serviceRoleKey, url } = await getProjectApiKeys({ ref, accessToken });
    githubEnvMasked('SUPABASE_BRANCH_ANON_KEY', anonKey);
    githubEnvMasked('SUPABASE_BRANCH_SERVICE_ROLE_KEY', serviceRoleKey);
    const file = process.env.GITHUB_ENV;
    if (file) appendFileSync(file, `SUPABASE_BRANCH_URL=${url}\n`);
    console.log(`Retrieved and masked API keys for ${ref}. (values never printed)`);
    return;
  }

  if (command === 'delete') {
    await deleteBranch({ branchId: flags['branch-id'], accessToken });
    console.log(`Deleted branch ${flags['branch-id']}.`);
    return;
  }

  console.error(`Unknown command: ${command}. Expected one of: create, wait-healthy, get-keys, delete.`);
  process.exitCode = 1;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('supabase-branch.mjs');
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`[supabase-branch] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
