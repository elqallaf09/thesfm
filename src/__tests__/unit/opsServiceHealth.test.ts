import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { __resetOperationalServiceHealthForTests, getOperationalServiceHealth } from '@/lib/admin/opsCenter/serviceHealth';

const mocks = vi.hoisted(() => ({
  models: vi.fn(), identities: vi.fn(), outcomes: vi.fn(), storage: vi.fn(),
  query: vi.fn(), history: [] as unknown[], writes: [] as unknown[],
  calls: [] as Array<{ table: string; select?: string; lowerBound?: string; limit?: number }>,
}));
vi.mock('@/lib/server/aiProvider', () => ({ checkPrivateAiHealth: mocks.models, aiGenerationIdentities: mocks.identities }));
vi.mock('@/lib/server/aiProviderTelemetry', () => ({ AI_GENERATION_FRESH_MS: 900_000, readAiGenerationOutcomes: mocks.outcomes }));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: () => null }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { listBuckets: mocks.storage } }) }));
vi.mock('next/server', () => ({ after: (task: () => Promise<void>) => { void task(); } }));

const buckets = ['avatars', 'receipts', 'income-attachments', 'project-documents', 'charity-documents', 'company-assets', 'subscription-client-assets'];
const identity = { capability: 'text', configurationId: 'a'.repeat(32) };

function adminClient(): SupabaseClient {
  return {
    from: (table: string) => {
      const entry: { table: string; select?: string; lowerBound?: string; limit?: number } = { table };
      mocks.calls.push(entry);
      let payload: unknown;
      let operation: 'read' | 'insert' | 'update' = 'read';
      const chain = {
        select: (columns: string) => { entry.select = columns; return chain; },
        gte: (_column: string, value: string) => { entry.lowerBound = value; return chain; },
        order: () => chain,
        limit: (value: number) => { entry.limit = value; return chain; },
        eq: () => chain,
        in: () => chain,
        lte: () => chain,
        maybeSingle: () => chain,
        upsert: (value: unknown) => { payload = value; operation = 'insert'; return chain; },
        update: () => { operation = 'update'; return chain; },
        abortSignal: async (signal: AbortSignal) => {
          if (operation === 'insert') { mocks.writes.push(...(Array.isArray(payload) ? payload : [payload])); return { error: null }; }
          if (operation === 'update') return { error: null };
          if (table === 'trader_cache') return { data: mocks.history, error: null };
          return mocks.query(table, signal);
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetOperationalServiceHealthForTests();
  mocks.calls.length = 0;
  mocks.writes.length = 0;
  mocks.history = [];
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'private-service-role');
  mocks.identities.mockReturnValue([identity]);
  mocks.outcomes.mockResolvedValue({ outcomes: [], available: true });
  mocks.models.mockImplementation(async () => [{
    provider: 'sfm-private-primary', configured: true, reachable: true, modelAvailable: true,
    model: 'private-model', status: 200, checkedAt: new Date().toISOString(), latencyMs: 10, reasonCode: null,
  }]);
  mocks.storage.mockResolvedValue({ data: buckets.map(id => ({ id })), error: null });
  mocks.query.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('operational service measurements', () => {
  it('does not turn configured credentials or successful model discovery into a generation success', async () => {
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.ai_services?.status).toBe('unmeasured');
    expect(result.ai_services?.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'ops_center_source_ai_models', status: 'healthy' }),
      expect.objectContaining({ source: 'ops_center_source_ai_generation', status: 'unmeasured', lastSuccessAt: null }),
    ]));
    expect(mocks.calls.some(call => call.table === 'ai_usage_events')).toBe(false);
  });

  it('uses an actual recent final generation outcome after fallback', async () => {
    mocks.outcomes.mockResolvedValue({ available: true, outcomes: [{
      ...identity, provider: 'sfm-private-fallback', outcome: 'success',
      checkedAt: new Date().toISOString(), latencyMs: 100, reasonCode: null,
    }] });
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.ai_services?.status).toBe('healthy');
    expect(result.ai_services?.evidence).toContainEqual(expect.objectContaining({
      source: 'ops_center_source_ai_generation', provider: 'sfm-private-fallback', status: 'healthy',
    }));
  });

  it('shows a newer generation failure even when model discovery still responds', async () => {
    const success = new Date(Date.now() - 10_000).toISOString();
    mocks.outcomes.mockResolvedValue({ available: true, outcomes: [
      { ...identity, provider: 'sfm-private-primary', outcome: 'success', checkedAt: success, latencyMs: 100, reasonCode: null },
      { ...identity, provider: 'sfm-private-primary', outcome: 'failure', checkedAt: new Date().toISOString(), latencyMs: 110, reasonCode: 'AI_PROVIDER_AUTH_REJECTED' },
    ] });
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.ai_services?.status).toBe('failed');
    expect(result.ai_services?.evidence).toContainEqual(expect.objectContaining({
      source: 'ops_center_source_ai_generation', status: 'failed', lastSuccessAt: success, reason: 'AI_PROVIDER_AUTH_REJECTED',
    }));
  });

  it('retains the timestamp but expires old successful generation as current health evidence', async () => {
    const checkedAt = new Date(Date.now() - 16 * 60_000).toISOString();
    mocks.outcomes.mockResolvedValue({ available: true, outcomes: [{ ...identity,
      provider: 'sfm-private-primary', outcome: 'success', checkedAt, latencyMs: 100, reasonCode: null,
    }] });
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.ai_services?.status).toBe('unmeasured');
    expect(result.ai_services?.evidence).toContainEqual(expect.objectContaining({
      checkedAt, lastSuccessAt: checkedAt, reasonKey: 'ops_center_probe_ai_generation_stale',
    }));
  });

  it('distinguishes missing monitoring credentials from a measured service failure', async () => {
    mocks.identities.mockReturnValue([]);
    const result = await getOperationalServiceHealth({ admin: null });
    expect(result.ai_services?.status).toBe('disabled');
    expect(result.notifications?.status).toBe('uninstrumented');
    expect(result.storage?.status).toBe('uninstrumented');
    expect(mocks.models).not.toHaveBeenCalled();
    expect(mocks.storage).not.toHaveBeenCalled();
  });

  it('distinguishes provider acceptance from recipient delivery and never uses enqueue time as delivery time', async () => {
    const createdAt = new Date(Date.now() - 20_000).toISOString();
    mocks.query.mockImplementation(async table => ({ data: table === 'sfm_notification_deliveries'
      ? [{ status: 'accepted', created_at: createdAt, error_code: null }] : [], error: null }));
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.notifications?.status).toBe('unmeasured');
    expect(result.notifications?.evidence).toContainEqual(expect.objectContaining({
      source: 'ops_center_source_notification_handoff', status: 'healthy', lastSuccessAt: null,
    }));
    expect(result.notifications?.evidence).toContainEqual(expect.objectContaining({
      source: 'ops_center_source_notification_delivery', status: 'unmeasured', lastSuccessAt: null,
    }));
    const ledgerRead = mocks.calls.find(call => call.table === 'sfm_notification_deliveries');
    expect(ledgerRead).toMatchObject({ select: 'status,error_code,created_at,available_at,locked_at', limit: 100 });
    expect(Date.parse(ledgerRead?.lowerBound ?? '')).toBeCloseTo(Date.now() - 24 * 60 * 60_000, -3);
    expect(JSON.stringify(mocks.calls)).not.toMatch(/destination|user_id|notification_id|provider_id/);
  });

  it('uses real delivered status while preserving the unavailable delivery timestamp', async () => {
    mocks.query.mockImplementation(async table => ({ data: table === 'sfm_notification_deliveries'
      ? [{ status: 'delivered', created_at: new Date().toISOString(), error_code: null }] : [], error: null }));
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.notifications?.status).toBe('healthy');
    expect(result.notifications?.evidence?.at(-1)).toMatchObject({ status: 'healthy', lastSuccessAt: null, reasonKey: 'ops_center_probe_notification_confirmed' });
  });

  it('surfaces a real recent delivery failure with a sanitized code', async () => {
    mocks.query.mockImplementation(async table => ({ data: table === 'sfm_notification_deliveries'
      ? [{ status: 'failed', created_at: new Date().toISOString(), error_code: 'private-user@example.test' }] : [], error: null }));
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.notifications?.status).toBe('partial');
    expect(result.notifications?.evidence?.at(-1)?.reason).toBe('DELIVERY_FAILED');
    expect(JSON.stringify(result)).not.toContain('private-user@example.test');
  });

  it.each(['PROVIDER_401', 'PROVIDER_403', 'PROVIDER_429', 'PROVIDER_503', 'DELIVERY_UNKNOWN', 'PROVIDER_DELIVERY_FAILED'])(
    'preserves the actual reviewed delivery failure code %s', async errorCode => {
      mocks.query.mockImplementation(async table => ({ data: table === 'sfm_notification_deliveries'
        ? [{ status: 'failed', created_at: new Date().toISOString(), error_code: errorCode }] : [], error: null }));
      const result = await getOperationalServiceHealth({ admin: adminClient() });
      expect(result.notifications?.status).toBe('partial');
      expect(result.notifications?.evidence?.at(-1)?.reason).toBe(errorCode);
    },
  );

  it.each(['PROVIDER_RATE_LIMITED', 'SOURCE_UNAVAILABLE', 'AUTH_UNAVAILABLE'])(
    'keeps an observed queued retry failure visible: %s', async errorCode => {
      mocks.query.mockImplementation(async table => ({ data: table === 'sfm_notification_deliveries'
        ? [{ status: 'queued', created_at: new Date().toISOString(), error_code: errorCode }] : [], error: null }));
      const result = await getOperationalServiceHealth({ admin: adminClient() });
      expect(result.notifications?.status).toBe('partial');
      expect(result.notifications?.evidence?.at(-1)).toMatchObject({ reason: errorCode, reasonKey: 'ops_center_probe_notification_pending' });
    },
  );

  it('does not turn arbitrary queued text into a diagnosis', async () => {
    mocks.query.mockImplementation(async table => ({ data: table === 'sfm_notification_deliveries'
      ? [{ status: 'queued', created_at: new Date().toISOString(), error_code: 'PROVIDER_403_private_user' }] : [], error: null }));
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.notifications?.status).toBe('unmeasured');
    expect(result.notifications?.evidence?.at(-1)?.reason).toBeNull();
  });

  it('reports unreadable delivery monitoring as a gap while preserving a successful inbox read', async () => {
    mocks.query.mockImplementation(async table => ({ data: [], error: table === 'sfm_notification_deliveries'
      ? { code: '42P01', message: 'private error response' } : null }));
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.notifications?.status).toBe('unmeasured');
    expect(result.notifications?.evidence?.at(-1)).toMatchObject({ reason: 'PROBE_TABLE_UNAVAILABLE' });
    expect(JSON.stringify(result)).not.toContain('private error response');
  });

  it('limits storage health to actual metadata reads and required buckets from migrations', async () => {
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.storage?.status).toBe('healthy');
    expect(result.storage?.detailKey).toBe('ops_center_probe_storage_admin_only');
    expect(mocks.storage).toHaveBeenCalledWith({ limit: 100, offset: 0 });
    mocks.storage.mockResolvedValue({ data: buckets.filter(id => id !== 'receipts').map(id => ({ id })), error: null });
    const missing = await getOperationalServiceHealth({ admin: adminClient(), forceFresh: true });
    expect(missing.storage?.status).toBe('partial');
    expect(missing.storage?.evidence).toContainEqual(expect.objectContaining({ reason: 'receipts', status: 'partial' }));
  });

  it('retains the real previous metadata-read success when the following probe fails', async () => {
    const first = await getOperationalServiceHealth({ admin: adminClient() });
    const lastSuccess = first.storage?.evidence?.[0].lastSuccessAt;
    mocks.storage.mockResolvedValue({ data: null, error: { status: 503, message: 'private error' } });
    const next = await getOperationalServiceHealth({ admin: adminClient(), forceFresh: true });
    expect(next.storage?.status).toBe('failed');
    expect(next.storage?.evidence?.[0].lastSuccessAt).toBe(lastSuccess);
    expect(JSON.stringify(mocks.writes)).not.toMatch(/private-service-role|private error|project.example.test/);
  });

  it('retains timestamp evidence across a cold instance using the existing server-owned cache', async () => {
    await getOperationalServiceHealth({ admin: adminClient() });
    expect(mocks.writes.length).toBeGreaterThan(0);
    mocks.history = [...mocks.writes];
    __resetOperationalServiceHealthForTests();
    mocks.storage.mockResolvedValue({ data: null, error: { status: 503 } });
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.storage?.status).toBe('failed');
    expect(result.storage?.evidence?.[0].lastSuccessAt).toBeTruthy();
  });

  it('does not mark buckets absent when the bounded metadata list reaches its scan limit', async () => {
    mocks.storage.mockResolvedValue({ data: Array.from({ length: 100 }, (_, index) => ({ id: `other-${index}` })), error: null });
    const result = await getOperationalServiceHealth({ admin: adminClient() });
    expect(result.storage?.status).toBe('unmeasured');
    expect(result.storage?.evidence?.at(-1)?.reason).toBe('BUCKET_SCAN_LIMIT_REACHED');
  });

  it('shares a short cache without fabricating new checkedAt times and supports an explicit fresh check', async () => {
    const first = await getOperationalServiceHealth({ admin: adminClient() });
    const second = await getOperationalServiceHealth({ admin: adminClient() });
    expect(second).toBe(first);
    expect(mocks.storage).toHaveBeenCalledTimes(1);
    await getOperationalServiceHealth({ admin: adminClient(), forceFresh: true });
    expect(mocks.storage).toHaveBeenCalledTimes(2);
  });

  it('finishes unavailable read-only probes within the deadline and aborts pending database reads', async () => {
    vi.useFakeTimers();
    mocks.query.mockImplementation(() => new Promise(() => undefined));
    mocks.storage.mockImplementation(() => new Promise(() => undefined));
    const result = getOperationalServiceHealth({ admin: adminClient() });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(3_500);
    const measured = await result;
    expect(measured.notifications?.status).toBe('failed');
    expect(measured.storage?.status).toBe('failed');
    expect(measured.storage?.evidence?.[0].reason).toBe('PROBE_TIMEOUT');
    for (const [, signal] of mocks.query.mock.calls) expect((signal as AbortSignal).aborted).toBe(true);
  });
});
