import { beforeEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ results: {} as Record<string, { data: unknown; error: { code: string } | null; count: number | null }>, owners: [] as string[], writes: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/adminAccess', () => ({ createServerSupabaseAdmin: () => ({ from: (table: string) => {
  const query = {
    select: () => query, limit: () => query, order: () => query, maybeSingle: () => query,
    eq: (_key: string, owner: string) => { mock.owners.push(owner); return query; },
    abortSignal: () => query, upsert: mock.writes, update: mock.writes,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(mock.results[table] ?? { data: [], error: null, count: 0 }).then(resolve),
  };
  return query;
} }) }));
vi.mock('@/domain/economic-intelligence/decisionMemory.server', () => ({ loadAdvisorDecisionMemoryFacts: async () => [] }));
vi.mock('@/domain/economic-intelligence/readinessConfirmations.server', () => ({ loadReadinessConfirmations: async () => [] }));
vi.mock('@/domain/economic-intelligence/economicContext.server', () => ({ loadEconomicContext: async () => null }));

import { loadCrossWorkspaceEvidence } from '@/domain/economic-intelligence/crossWorkspaceBrain.server';
import { loadAdvisorGrounding } from '@/domain/economic-intelligence/advisors.server';
import { loadProactiveEconomicEvents } from '@/domain/economic-intelligence/proactive.server';

beforeEach(() => {
  mock.results = { profiles: { data: { default_currency: 'KWD' }, error: null, count: null } };
  mock.owners = []; mock.writes.mockReset();
});

it('rejects silent row caps before presenting a complete financial snapshot', async () => {
  mock.results.expense_items = { data: [{ amount: 100, currency: 'KWD' }], error: null, count: 2100 };
  await expect(loadCrossWorkspaceEvidence('owner-a')).rejects.toThrow('SOURCE_INCOMPLETE:expense_items');
  await expect(loadAdvisorGrounding({ userId: 'owner-a', advisor: 'finance' })).rejects.toThrow('SOURCE_INCOMPLETE:expense_items');
  expect(mock.owners.every(owner => owner === 'owner-a')).toBe(true);
});

it('does not treat a failed profile as a valid default-currency snapshot', async () => {
  mock.results.profiles = { data: null, error: { code: '57014' }, count: null };
  await expect(loadCrossWorkspaceEvidence('owner-a')).rejects.toMatchObject({ code: '57014' });
  await expect(loadAdvisorGrounding({ userId: 'owner-a', advisor: 'finance' })).rejects.toThrow('SOURCE_FAILED:profile');
});

it('does not resolve durable alerts after a decision-source failure', async () => {
  mock.results.user_decisions = { data: null, error: { code: '57014' }, count: null };
  await expect(loadProactiveEconomicEvents('owner-a', 'ar')).rejects.toMatchObject({ code: '57014' });
  expect(mock.writes).not.toHaveBeenCalled();
});

it('does not promote a saved watchlist or price alert to verified market evidence', async () => {
  mock.results.market_watchlist = { data: [{ symbol: 'AAPL' }], error: null, count: 1 };
  mock.results.market_price_alerts = { data: [{ status: 'active' }], error: null, count: 1 };
  const grounding = await loadAdvisorGrounding({ userId: 'owner-a', advisor: 'investment' });
  expect(grounding.missing).toContain('market_evidence');
});

it('retains a complete owner-scoped snapshot', async () => {
  mock.results.monthly_income_sources = { data: [{ amount: 2000, currency: 'KWD' }], error: null, count: 1 };
  mock.results.expense_items = { data: [{ amount: 800, currency: 'KWD' }], error: null, count: 1 };
  const evidence = await loadCrossWorkspaceEvidence('owner-b');
  expect(evidence.finance.snapshot.monthlySurplus).toBe(1200);
  expect(mock.owners.every(owner => owner === 'owner-b')).toBe(true);
});
