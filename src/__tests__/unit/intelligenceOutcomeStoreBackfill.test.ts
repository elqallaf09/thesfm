import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import { SupabaseIntelligenceOutcomeStore } from '@/services/intelligence/outcomeStore';

const createServerSupabaseAdmin = vi.fn();

vi.mock('@/lib/server/adminAccess', () => ({
  createServerSupabaseAdmin: (...args: unknown[]) => createServerSupabaseAdmin(...args),
}));

type QueryState = {
  table: string;
  selected: string | null;
  filters: Array<{ method: string; column: string; value: unknown }>;
  order: { column: string; ascending: boolean } | null;
  limit: number | null;
};

function legacyAnalysisRow(id: string, generatedAt: string) {
  const result = {
    analysisId: id,
    generatedAt,
    dataAsOf: generatedAt,
    horizon: 'SWING',
    scope: 'SHARED',
    recommendation: 'BUY',
    factors: [],
    asset: {
      canonicalSymbol: 'TEST',
      providerSymbol: 'TEST',
      displaySymbol: 'TEST',
      assetType: 'STOCK',
    },
  } as unknown as AnalysisResult;

  return {
    id,
    user_id: null,
    created_at: generatedAt,
    result_snapshot: result,
  };
}

function createAdminFixture(input: {
  recentlyCompletedRows: ReturnType<typeof legacyAnalysisRow>[];
  eligibleLegacyRow: ReturnType<typeof legacyAnalysisRow>;
}) {
  const queries: QueryState[] = [];
  const completedIds = new Set(input.recentlyCompletedRows.map(row => row.id));

  const admin = {
    from(table: string) {
      const state: QueryState = {
        table,
        selected: null,
        filters: [],
        order: null,
        limit: null,
      };
      queries.push(state);
      const query = {
        select(value: string) {
          state.selected = value;
          return query;
        },
        eq(column: string, value: unknown) {
          state.filters.push({ method: 'eq', column, value });
          return query;
        },
        lte(column: string, value: unknown) {
          state.filters.push({ method: 'lte', column, value });
          return query;
        },
        is(column: string, value: unknown) {
          state.filters.push({ method: 'is', column, value });
          return query;
        },
        in(column: string, values: unknown[]) {
          state.filters.push({ method: 'in', column, value: values });
          return query;
        },
        order(column: string, options: { ascending: boolean }) {
          state.order = { column, ascending: options.ascending };
          return query;
        },
        limit(value: number) {
          state.limit = value;
          return query;
        },
        then(resolve: (value: { data: unknown[]; error: null }) => unknown) {
          if (table === 'intelligence_analysis_outcomes') {
            const pending = state.filters.some(filter => filter.method === 'eq'
              && filter.column === 'evaluation_status' && filter.value === 'pending');
            if (pending) return Promise.resolve(resolve({ data: [], error: null }));
            const requested = state.filters.find(filter => filter.method === 'in' && filter.column === 'analysis_id');
            const ids = Array.isArray(requested?.value) ? requested.value : [];
            return Promise.resolve(resolve({
              data: ids.filter((id): id is string => typeof id === 'string' && completedIds.has(id))
                .map(analysis_id => ({ analysis_id })),
              error: null,
            }));
          }

          const antiJoin = state.selected?.includes('intelligence_analysis_outcomes!left(analysis_id)')
            && state.filters.some(filter => filter.method === 'is'
              && filter.column === 'intelligence_analysis_outcomes.analysis_id' && filter.value === null);
          return Promise.resolve(resolve({
            // This branch models the database relation. Without the anti-join, the
            // legacy implementation only sees the newest completed parents.
            data: antiJoin ? [input.eligibleLegacyRow] : input.recentlyCompletedRows,
            error: null,
          }));
        },
      };
      return query;
    },
  };

  return { admin, queries };
}

describe('SupabaseIntelligenceOutcomeStore legacy backfill', () => {
  beforeEach(() => {
    createServerSupabaseAdmin.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('selects an eligible legacy parent after more than 48 newer completed analyses', async () => {
    const recentlyCompletedRows = Array.from({ length: 60 }, (_, index) => legacyAnalysisRow(
      `recent-${index + 1}`,
      `2026-07-${String((index % 18) + 1).padStart(2, '0')}T00:00:00.000Z`,
    ));
    const eligibleLegacyRow = legacyAnalysisRow('legacy-eligible', '2024-01-01T00:00:00.000Z');
    const fixture = createAdminFixture({ recentlyCompletedRows, eligibleLegacyRow });
    createServerSupabaseAdmin.mockReturnValue(fixture.admin);

    const selected = await new SupabaseIntelligenceOutcomeStore()
      .listEligibleAnalyses('2026-07-19T00:00:00.000Z', 4);

    expect(selected.map(analysis => analysis.result.analysisId)).toEqual(['legacy-eligible']);
    const parentBackfillQuery = fixture.queries.find(query => query.table === 'intelligence_analyses');
    expect(parentBackfillQuery?.selected).toContain('intelligence_analysis_outcomes!left(analysis_id)');
    expect(parentBackfillQuery?.filters).toContainEqual({
      method: 'is',
      column: 'intelligence_analysis_outcomes.analysis_id',
      value: null,
    });
    expect(parentBackfillQuery?.order).toEqual({ column: 'generated_at', ascending: true });
  });

  it('does not let one malformed legacy snapshot abort the scheduled backfill', async () => {
    const fixture = createAdminFixture({
      recentlyCompletedRows: [],
      eligibleLegacyRow: legacyAnalysisRow('legacy-malformed-window', 'not-an-iso-timestamp'),
    });
    createServerSupabaseAdmin.mockReturnValue(fixture.admin);

    await expect(new SupabaseIntelligenceOutcomeStore()
      .listEligibleAnalyses('2026-07-19T00:00:00.000Z', 1))
      .resolves.toMatchObject([{ result: { analysisId: 'legacy-malformed-window' } }]);
  });
});
