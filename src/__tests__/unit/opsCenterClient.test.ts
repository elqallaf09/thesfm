import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpsAction } from '@/lib/admin/opsCenter/types';

vi.mock('@/lib/admin/opsCenter/healthTruth', () => ({ buildOperationsHealthSummary: (state: object) => state }));
import { executeOperationsAction, fetchOperationsCenterState } from '@/lib/admin/opsCenter/client';

const fetchMock = vi.fn();
const action: OpsAction = { id: 'refresh_symbol_catalog', kind: 'refresh_symbol_catalog', labelKey: 'catalog', available: true };
function state() {
  return {
    generatedAt: '2026-10-03T21:00:00Z', overview: {}, market: { capabilityMatrix: [] },
    featureHealth: [], rootCause: [], marketNews: [], subscriptionReminders: { recentRuns: [] },
  };
}
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } }); }

describe('Operations Center action transport', () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('uses the authenticated POST action contract rather than a snapshot-only GET', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, state: state(), result: { actionId: action.kind, messageKey: 'ops_center_action_catalog_refreshed', completedAt: '2026-10-03T21:01:00Z' } }));
    const signal = new AbortController().signal;
    const result = await executeOperationsAction(action, signal);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/ops-center', {
      method: 'POST', signal, cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh_symbol_catalog' }),
    });
    expect(result.result).toEqual({ actionId: action.id, ok: true, messageKey: 'ops_center_action_catalog_refreshed', completedAt: '2026-10-03T21:01:00Z' });
  });

  it.each([[401, 'access_denied'], [403, 'access_denied'], [429, 'rate_limited'], [500, 'failed']])('reports HTTP %s safely without treating it as a health payload', async (status, key) => {
    fetchMock.mockResolvedValue(json({ secret: 'private server failure' }, status as number));
    await expect(executeOperationsAction(action, new AbortController().signal)).rejects.toThrow(`ops_center_request_${key}`);
  });

  it('rejects an incorrect or missing action receipt instead of showing success', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, state: state(), result: { actionId: 'check_service_health', messageKey: 'ops_center_action_services_checked', completedAt: '2026-10-03T21:01:00Z' } }));
    await expect(executeOperationsAction(action, new AbortController().signal)).rejects.toThrow('ops_center_request_invalid_response');
    fetchMock.mockResolvedValue(json({ ok: true, state: state() }));
    await expect(executeOperationsAction(action, new AbortController().signal)).rejects.toThrow('ops_center_request_invalid_response');
  });

  it('rejects HTML and malformed snapshots while the store can preserve the last valid state', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Sign in</html>', { status: 200 }));
    await expect(fetchOperationsCenterState(new AbortController().signal)).rejects.toThrow('ops_center_request_invalid_response');
    fetchMock.mockResolvedValue(json({ ok: true, state: { generatedAt: 'not-a-date' } }));
    await expect(fetchOperationsCenterState(new AbortController().signal)).rejects.toThrow('ops_center_request_invalid_response');
  });

  it('keeps automatic polling a read-only request with cancellation', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, state: state() }));
    const signal = new AbortController().signal;
    await fetchOperationsCenterState(signal);
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/ops-center', { signal, cache: 'no-store' });
  });
});
