import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  user: vi.fn(), rate: vi.fn(), evidence: vi.fn(), confirmations: vi.fn(), history: vi.fn(),
  brief: vi.fn(), readiness: vi.fn(), provenance: vi.fn(), actions: vi.fn(), priority: vi.fn(), narrative: vi.fn(), drift: vi.fn(),
}));
vi.mock('@/lib/server/adminAccess', () => ({ getCurrentUserFromRequest: mocks.user }));
vi.mock('@/lib/server/rateLimiter', () => ({ checkRateLimitWithMetadata: mocks.rate }));
vi.mock('@/domain/economic-intelligence/crossWorkspaceBrain.server', () => ({ loadCrossWorkspaceEvidence: mocks.evidence }));
vi.mock('@/domain/economic-intelligence/readinessConfirmations.server', () => ({ loadReadinessConfirmations: mocks.confirmations }));
vi.mock('@/domain/economic-intelligence/dailyBriefHistory.server', () => ({ loadDailyBriefHistory: mocks.history }));
vi.mock('@/domain/economic-intelligence/crossWorkspaceBrain', () => ({ buildCrossWorkspaceBrief: mocks.brief }));
vi.mock('@/domain/economic-intelligence/readiness', () => ({ buildEconomicIntelligenceReadiness: mocks.readiness }));
vi.mock('@/domain/economic-intelligence/evidenceProvenance', () => ({ buildEvidenceProvenance: mocks.provenance }));
vi.mock('@/domain/economic-intelligence/dailyPriority', () => ({ buildDailyPriorityActions: mocks.actions, highestDailyPriority: mocks.priority }));
vi.mock('@/domain/economic-intelligence/dailyBriefNarrative', () => ({ buildDailyBriefNarrative: mocks.narrative }));
vi.mock('@/domain/economic-intelligence/evidenceDrift', () => ({ compareHistoricalEvidence: mocks.drift }));

import { GET } from '@/app/api/economic-intelligence/daily-brief/route';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const evidence = { recordCounts: { projects: 0 } };
const brief = { state: 'clear', items: [] };
const readiness = { overallScore: 0 };
const provenance = { entries: [] };
const priority = { fingerprint: 'test-only-priority' };
const request = (lang = 'ar') => new NextRequest(`https://www.the-sfm.com/api/economic-intelligence/daily-brief?lang=${lang}&user_id=other-user`);

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  await expect(response.json()).resolves.toEqual({ ok: false, error: { code } });
}

describe('daily brief failures do not become fabricated empty evidence', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: USER_ID });
    mocks.rate.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.evidence.mockResolvedValue(evidence);
    mocks.confirmations.mockResolvedValue([]);
    mocks.history.mockResolvedValue({ entries: [], change: { changed: false } });
    mocks.brief.mockReturnValue(brief);
    mocks.readiness.mockReturnValue(readiness);
    mocks.provenance.mockReturnValue(provenance);
    mocks.actions.mockReturnValue([]);
    mocks.priority.mockReturnValue(priority);
    mocks.narrative.mockReturnValue({ headline: 'test fixture' });
    mocks.drift.mockReturnValue({ available: false, causalClaim: false });
  });

  it('denies anonymous requests before reading any private source', async () => {
    mocks.user.mockResolvedValue(null);
    await expectError(await GET(request()), 401, 'UNAUTHENTICATED');
    expect(mocks.evidence).not.toHaveBeenCalled();
    expect(mocks.confirmations).not.toHaveBeenCalled();
    expect(mocks.history).not.toHaveBeenCalled();
  });

  it('fails closed if session validation rejects', async () => {
    mocks.user.mockRejectedValue(new Error('private auth details'));
    await expectError(await GET(request()), 401, 'UNAUTHENTICATED');
    expect(mocks.evidence).not.toHaveBeenCalled();
  });

  it('preserves the rate-limit contract before storage access', async () => {
    mocks.rate.mockReturnValue({ allowed: false, retryAfterSeconds: 19 });
    const response = await GET(request());
    expect(response.headers.get('retry-after')).toBe('19');
    await expectError(response, 429, 'APPLICATION_RATE_LIMITED');
    expect(mocks.evidence).not.toHaveBeenCalled();
  });

  it.each(['evidence', 'confirmations', 'history'] as const)('returns a safe 502 when %s storage fails, not a successful empty result', async source => {
    mocks[source].mockRejectedValue(new Error('private database details and credentials'));
    await expectError(await GET(request()), 502, 'DAILY_BRIEF_UNAVAILABLE');
    if (source === 'confirmations') expect(mocks.readiness).not.toHaveBeenCalled();
  });

  it('retains genuine empty history only after a successful scoped read', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.history.entries).toEqual([]);
    expect(mocks.evidence).toHaveBeenCalledWith(USER_ID);
    expect(mocks.confirmations).toHaveBeenCalledWith(USER_ID);
    expect(mocks.history).toHaveBeenCalledWith(USER_ID, priority);
    expect(mocks.drift).not.toHaveBeenCalled();
  });

  it('compares the stored snapshot without replacing it with current evidence', async () => {
    const snapshot = { version: 1, capturedAt: '2026-09-01T00:00:00Z' };
    mocks.history.mockResolvedValue({ entries: [{ id: 'test-entry', evidenceSnapshot: snapshot, historicalEvidenceAvailable: true }], change: { changed: true } });
    const payload = await (await GET(request())).json();
    expect(payload.history.entries[0].evidenceSnapshot).toEqual(snapshot);
    expect(mocks.drift).toHaveBeenCalledWith(snapshot, readiness, provenance);
    expect(payload.history.entries[0].evidenceDrift.causalClaim).toBe(false);
  });

  it.each([['ar', 'ar'], ['en', 'en'], ['fr', 'fr'], ['invalid', 'ar']])('keeps narrative locale normalization for %s', async (input, expected) => {
    expect((await GET(request(input))).status).toBe(200);
    expect(mocks.narrative).toHaveBeenCalledWith(brief, expected, readiness);
  });
});

describe('archive UI failure-state source contracts (not browser execution)', () => {
  const page = readFileSync('src/app/economic-intelligence/history/page.tsx', 'utf8');

  it('separates the error/retry surface from the successful empty-state rendering', () => {
    expect(page).toContain("status: 'error', entries: EMPTY_ENTRIES");
    expect(page).toContain('{failed ? <section');
    expect(page).toContain('role="alert"');
    expect(page).toContain('onClick={() => setAttempt(value => value + 1)}');
    expect(page).toContain("payload?.ok !== true || !Array.isArray(payload.history?.entries)");
  });

  it('keys loaded records by owner, language and retry before displaying them', () => {
    expect(page).toContain('`${user.id}:${locale}:${attempt}`');
    expect(page).toContain('archive.key === requestKey');
    expect(page).toContain("current && archive.status === 'ready' ? archive.entries : EMPTY_ENTRIES");
    expect(page).toContain('if (!user) return');
  });

  it('bounds requests and cancels obsolete responses without caching personalized history', () => {
    expect(page).toContain('setTimeout(() => controller.abort(), 15_000)');
    expect(page).toContain("cache: 'no-store', signal: controller.signal");
    expect(page).toContain('cancelled = true; clearTimeout(timer); controller.abort();');
    expect(page).toContain('if (!cancelled) setArchive');
  });
});
