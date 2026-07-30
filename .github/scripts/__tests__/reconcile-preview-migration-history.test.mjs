// Black-box tests for reconcile-preview-migration-history.mjs.
//
// The script is exercised as a real CLI subprocess (not imported), with
// SUPABASE_MANAGEMENT_API_BASE_URL pointed at a local HTTP server standing in
// for the Supabase Management API's read-only query endpoint. This proves the
// actual entrypoint behavior — argument parsing, exit codes, and everything
// printed to stdout/stderr — rather than just the internals.
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const SCRIPT_PATH = fileURLToPath(new URL('../reconcile-preview-migration-history.mjs', import.meta.url));

// 20 lowercase-alnum chars each, matching the script's project-ref format check.
const PREVIEW_REF = 'abcdefghij0123456789';
const PRODUCTION_REF = 'zzzzzzzzzz9999999999';
const FAKE_TOKEN = 'sbp_test_secret_should_never_leak_abc123';
const VERSION = '20260101000000';

const MIGRATION_SQL = `
create table if not exists public.widgets (
  id uuid primary key
);
create unique index if not exists widgets_id_idx on public.widgets (id);
`;

function makeTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'reconcile-test-'));
  const migrationsDir = join(dir, 'supabase', 'migrations');
  mkdirSync(migrationsDir, { recursive: true });
  writeFileSync(join(migrationsDir, `${VERSION}_widgets.sql`), MIGRATION_SQL, 'utf8');
  return dir;
}

// Must use async spawn (not spawnSync): the mock Management API server below
// lives in this same process, so a synchronous spawnSync would block this
// process's event loop for the child's entire lifetime and the mock server
// could never accept or answer the child's request — a self-deadlock that
// only spawnSync's own timeout would break.
function runScript({ args, env, cwd }) {
  const baseEnv = { PATH: process.env.PATH };
  if (process.env.SystemRoot) baseEnv.SystemRoot = process.env.SystemRoot;
  if (process.env.TEMP) baseEnv.TEMP = process.env.TEMP;
  if (process.env.TMP) baseEnv.TMP = process.env.TMP;

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, ...args], {
      cwd,
      env: { ...baseEnv, ...env },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

let server;
let serverUrl;
let handler;
let receivedRequests;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      receivedRequests.push({ method: req.method, url: req.url, headers: req.headers, body });
      handler(req, res, body);
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  serverUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  receivedRequests = [];
  handler = () => {
    throw new Error('no mock handler configured for this test');
  };
});

describe('reconcile-preview-migration-history.mjs', () => {
  it('refuses when the target ref equals SUPABASE_PRODUCTION_REF, without contacting the API', async () => {
    const dir = makeTempRepo();
    try {
      const result = await runScript({
        args: [PRODUCTION_REF, VERSION],
        cwd: dir,
        env: {
          SUPABASE_ACCESS_TOKEN: FAKE_TOKEN,
          SUPABASE_PRODUCTION_REF: PRODUCTION_REF,
          SUPABASE_MANAGEMENT_API_BASE_URL: serverUrl,
        },
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/Refusing to run against Production/);
      expect(receivedRequests).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses when SUPABASE_ACCESS_TOKEN is missing', async () => {
    const dir = makeTempRepo();
    try {
      const result = await runScript({
        args: [PREVIEW_REF, VERSION],
        cwd: dir,
        env: {
          SUPABASE_PRODUCTION_REF: PRODUCTION_REF,
          SUPABASE_MANAGEMENT_API_BASE_URL: serverUrl,
        },
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/SUPABASE_ACCESS_TOKEN is not set/);
      expect(receivedRequests).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('proposes reconciliation when the read-only query proves the table and index exist', async () => {
    handler = (req, res) => {
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify([{ found: 1 }]));
    };
    const dir = makeTempRepo();
    try {
      const result = await runScript({
        args: [PREVIEW_REF, VERSION],
        cwd: dir,
        env: {
          SUPABASE_ACCESS_TOKEN: FAKE_TOKEN,
          SUPABASE_PRODUCTION_REF: PRODUCTION_REF,
          SUPABASE_MANAGEMENT_API_BASE_URL: serverUrl,
        },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/Proposing reconciliation/);
      expect(result.stdout).toMatch(new RegExp(`supabase migration repair --status applied ${VERSION}`));
      expect(receivedRequests.length).toBeGreaterThan(0);
      expect(receivedRequests[0].method).toBe('POST');
      expect(receivedRequests[0].url).toBe(`/v1/projects/${PREVIEW_REF}/database/query/read-only`);
      expect(receivedRequests[0].headers.authorization).toBe(`Bearer ${FAKE_TOKEN}`);
      expect(JSON.parse(receivedRequests[0].body)).toHaveProperty('query');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not propose reconciliation when the read-only query proves an object is missing', async () => {
    handler = (req, res) => {
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify([]));
    };
    const dir = makeTempRepo();
    try {
      const result = await runScript({
        args: [PREVIEW_REF, VERSION],
        cwd: dir,
        env: {
          SUPABASE_ACCESS_TOKEN: FAKE_TOKEN,
          SUPABASE_PRODUCTION_REF: PRODUCTION_REF,
          SUPABASE_MANAGEMENT_API_BASE_URL: serverUrl,
        },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toMatch(/NOT proven equivalent/);
      expect(result.stdout).toMatch(/Not proposed for reconciliation/);
      expect(result.stdout).not.toMatch(/supabase migration repair --status applied/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails closed (nonzero exit, no plan printed) when the Management API returns an error status', async () => {
    handler = (req, res) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: 'internal error' }));
    };
    const dir = makeTempRepo();
    try {
      const result = await runScript({
        args: [PREVIEW_REF, VERSION],
        cwd: dir,
        env: {
          SUPABASE_ACCESS_TOKEN: FAKE_TOKEN,
          SUPABASE_PRODUCTION_REF: PRODUCTION_REF,
          SUPABASE_MANAGEMENT_API_BASE_URL: serverUrl,
        },
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/Could not verify version/);
      expect(result.stdout).not.toMatch(/Proposing reconciliation/);
      expect(result.stdout).not.toMatch(/supabase migration repair --status applied/);
      expect(result.stdout).not.toMatch(/Reconciliation plan/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails closed when the Management API response body is not the documented array shape', async () => {
    handler = (req, res) => {
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ unexpected: 'shape' }));
    };
    const dir = makeTempRepo();
    try {
      const result = await runScript({
        args: [PREVIEW_REF, VERSION],
        cwd: dir,
        env: {
          SUPABASE_ACCESS_TOKEN: FAKE_TOKEN,
          SUPABASE_PRODUCTION_REF: PRODUCTION_REF,
          SUPABASE_MANAGEMENT_API_BASE_URL: serverUrl,
        },
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/unexpected \(non-array\) response shape/);
      expect(result.stdout).not.toMatch(/supabase migration repair --status applied/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never prints the access token, in success, in the not-proposed path, or on API failure', async () => {
    const dir = makeTempRepo();
    try {
      // Success path.
      handler = (req, res) => {
        res.writeHead(201, { 'content-type': 'application/json' });
        res.end(JSON.stringify([{ found: 1 }]));
      };
      const ok = await runScript({
        args: [PREVIEW_REF, VERSION],
        cwd: dir,
        env: {
          SUPABASE_ACCESS_TOKEN: FAKE_TOKEN,
          SUPABASE_PRODUCTION_REF: PRODUCTION_REF,
          SUPABASE_MANAGEMENT_API_BASE_URL: serverUrl,
        },
      });
      expect(ok.stdout).not.toContain(FAKE_TOKEN);
      expect(ok.stderr).not.toContain(FAKE_TOKEN);

      // API failure path.
      handler = (req, res) => {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ message: 'internal error' }));
      };
      const failed = await runScript({
        args: [PREVIEW_REF, VERSION],
        cwd: dir,
        env: {
          SUPABASE_ACCESS_TOKEN: FAKE_TOKEN,
          SUPABASE_PRODUCTION_REF: PRODUCTION_REF,
          SUPABASE_MANAGEMENT_API_BASE_URL: serverUrl,
        },
      });
      expect(failed.stdout).not.toContain(FAKE_TOKEN);
      expect(failed.stderr).not.toContain(FAKE_TOKEN);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
