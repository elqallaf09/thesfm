import { describe, it, expect, vi } from 'vitest';
import {
  assertNotProductionRef,
  isValidProjectRef,
  createBranch,
  getBranchStatus,
  waitForBranchHealthy,
  getProjectApiKeys,
  deleteBranch,
  branchNameFor,
  shouldCreateBranch,
  SupabaseManagementError,
} from '../supabase-branch.mjs';

const PARENT_REF = 'aaaaaaaaaaaaaaaaaaaa';
const PRODUCTION_REF = 'aaaaaaaaaaaaaaaaaaaa';
const BRANCH_REF = 'bbbbbbbbbbbbbbbbbbbb';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

describe('assertNotProductionRef', () => {
  it('throws when the resolved ref equals the production ref', () => {
    expect(() => assertNotProductionRef(PRODUCTION_REF, PRODUCTION_REF)).toThrow(/equals SUPABASE_PRODUCTION_REF/);
  });

  it('does not throw for a different ref', () => {
    expect(() => assertNotProductionRef(BRANCH_REF, PRODUCTION_REF)).not.toThrow();
  });

  it('throws when the production ref is not configured', () => {
    expect(() => assertNotProductionRef(BRANCH_REF, '')).toThrow(/SUPABASE_PRODUCTION_REF is not set/);
  });

  it('throws when the resolved ref is empty', () => {
    expect(() => assertNotProductionRef('', PRODUCTION_REF)).toThrow(/is empty/);
  });
});

describe('isValidProjectRef', () => {
  it('accepts a 20-char lowercase-alnum ref', () => {
    expect(isValidProjectRef(BRANCH_REF)).toBe(true);
  });

  it('rejects wrong length or uppercase', () => {
    expect(isValidProjectRef('short')).toBe(false);
    expect(isValidProjectRef('AAAAAAAAAAAAAAAAAAAA')).toBe(false);
    expect(isValidProjectRef(undefined)).toBe(false);
  });
});

describe('createBranch', () => {
  it('returns branchId and ref on a well-formed response', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      expect(url).toBe(`https://api.supabase.com/v1/projects/${PARENT_REF}/branches`);
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer test-token');
      const body = JSON.parse(init.body);
      expect(body).toEqual({ branch_name: 'ci-pr-53-abc1234', persistent: false });
      return jsonResponse(201, { id: 'branch-123', project_ref: BRANCH_REF });
    });
    const result = await createBranch({
      parentRef: PARENT_REF,
      branchName: 'ci-pr-53-abc1234',
      accessToken: 'test-token',
      fetchImpl,
    });
    expect(result).toEqual({ branchId: 'branch-123', ref: BRANCH_REF });
  });

  it('fails closed when the response is missing project_ref', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(201, { id: 'branch-123' }));
    await expect(
      createBranch({ parentRef: PARENT_REF, branchName: 'x', accessToken: 't', fetchImpl }),
    ).rejects.toThrow(SupabaseManagementError);
  });

  it('fails closed on a non-2xx response, surfacing the API error message', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(422, { message: 'branch limit reached' }));
    await expect(
      createBranch({ parentRef: PARENT_REF, branchName: 'x', accessToken: 't', fetchImpl }),
    ).rejects.toThrow(/branch limit reached/);
  });

  it('rejects an invalid parent ref before making any request', async () => {
    const fetchImpl = vi.fn();
    await expect(
      createBranch({ parentRef: 'not-a-ref', branchName: 'x', accessToken: 't', fetchImpl }),
    ).rejects.toThrow(/valid Supabase project ref/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('getBranchStatus / waitForBranchHealthy', () => {
  it('resolves as soon as a healthy status is observed', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      const status = calls < 3 ? 'RUNNING_MIGRATIONS' : 'MIGRATIONS_PASSED';
      return jsonResponse(200, { status });
    });
    const status = await waitForBranchHealthy({
      branchId: 'branch-123',
      accessToken: 't',
      fetchImpl,
      timeoutMs: 100_000,
      intervalMs: 0,
      sleep: async () => undefined,
    });
    expect(status).toBe('MIGRATIONS_PASSED');
    expect(calls).toBe(3);
  });

  it('treats ACTIVE_HEALTHY as healthy (the confirmed real terminal status)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { status: 'ACTIVE_HEALTHY' }));
    const status = await waitForBranchHealthy({
      branchId: 'branch-123',
      accessToken: 't',
      fetchImpl,
      timeoutMs: 100_000,
      intervalMs: 0,
      sleep: async () => undefined,
    });
    expect(status).toBe('ACTIVE_HEALTHY');
  });

  it('throws immediately on a known failure status without further polling', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return jsonResponse(200, { status: 'MIGRATIONS_FAILED' });
    });
    await expect(
      waitForBranchHealthy({
        branchId: 'branch-123',
        accessToken: 't',
        fetchImpl,
        timeoutMs: 100_000,
        intervalMs: 0,
        sleep: async () => undefined,
      }),
    ).rejects.toThrow(/failure status MIGRATIONS_FAILED/);
    expect(calls).toBe(1);
  });

  it('times out and reports the last observed status if never healthy or failed', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { status: 'RUNNING_MIGRATIONS' }));
    let now = 0;
    await expect(
      waitForBranchHealthy({
        branchId: 'branch-123',
        accessToken: 't',
        fetchImpl,
        timeoutMs: 30,
        intervalMs: 10,
        now: () => now,
        sleep: async () => {
          now += 10;
        },
      }),
    ).rejects.toThrow(/did not become healthy within 30ms.*RUNNING_MIGRATIONS/s);
  });

  it('getBranchStatus fails closed on a response missing status', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, {}));
    await expect(getBranchStatus({ branchId: 'b', accessToken: 't', fetchImpl })).rejects.toThrow(SupabaseManagementError);
  });
});

describe('getProjectApiKeys', () => {
  it('returns anon and service_role keys plus the constructed URL', async () => {
    const fetchImpl = vi.fn(async (url) => {
      expect(url).toBe(`https://api.supabase.com/v1/projects/${BRANCH_REF}/api-keys`);
      return jsonResponse(200, [
        { name: 'anon', api_key: 'anon-key-value' },
        { name: 'service_role', api_key: 'service-role-key-value' },
      ]);
    });
    const result = await getProjectApiKeys({ ref: BRANCH_REF, accessToken: 't', fetchImpl });
    expect(result).toEqual({
      anonKey: 'anon-key-value',
      serviceRoleKey: 'service-role-key-value',
      url: `https://${BRANCH_REF}.supabase.co`,
    });
  });

  it('fails closed if either key is missing from the response', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, [{ name: 'anon', api_key: 'only-anon' }]));
    await expect(getProjectApiKeys({ ref: BRANCH_REF, accessToken: 't', fetchImpl })).rejects.toThrow(/both an anon and a service_role/);
  });

  it('rejects an invalid ref before making any request', async () => {
    const fetchImpl = vi.fn();
    await expect(getProjectApiKeys({ ref: 'bad', accessToken: 't', fetchImpl })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('deleteBranch', () => {
  it('issues a DELETE to the branch endpoint', async () => {
    const fetchImpl = vi.fn(async (url, init) => {
      expect(url).toBe('https://api.supabase.com/v1/branches/branch-123');
      expect(init.method).toBe('DELETE');
      return jsonResponse(200, {});
    });
    await deleteBranch({ branchId: 'branch-123', accessToken: 't', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('propagates a non-2xx failure rather than swallowing it', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(404, { message: 'not found' }));
    await expect(deleteBranch({ branchId: 'gone', accessToken: 't', fetchImpl })).rejects.toThrow(/not found/);
  });
});

describe('shouldCreateBranch', () => {
  it('reuses an existing externally-resolved ref instead of creating one', () => {
    expect(shouldCreateBranch(BRANCH_REF)).toBe(false);
  });

  it('falls back to creation when no external ref was resolved', () => {
    expect(shouldCreateBranch('')).toBe(true);
    expect(shouldCreateBranch(undefined)).toBe(true);
  });
});

describe('branchNameFor', () => {
  it('builds a PR-scoped name from the short SHA', () => {
    expect(branchNameFor('53', '94a7ed775048abec7ec216aadbc362af7a0b6322')).toBe('ci-pr-53-94a7ed7');
  });

  it('falls back to a SHA-only name when no PR number is given', () => {
    expect(branchNameFor('', '94a7ed775048abec7ec216aadbc362af7a0b6322')).toBe('ci-sha-94a7ed7');
  });
});
