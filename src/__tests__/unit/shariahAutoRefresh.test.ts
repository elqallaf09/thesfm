import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchExternalShariahClassification } from '@/lib/market/shariahAutoRefresh';

const apple = {
  id: '00000000-0000-0000-0000-000000000001',
  symbol: 'AAPL',
  provider_symbol: 'AAPL',
  name: 'Apple Inc.',
  asset_type: 'stock',
  exchange: 'NASDAQ',
  country: 'US',
  shariah_manual_override: false,
  shariah_screening_data: {},
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('automatic Shariah provider refresh', () => {
  it('uses Zoya live compliance data and maps COMPLIANT conservatively', async () => {
    vi.stubEnv('SHARIAH_SCREENING_PROVIDER', 'zoya');
    vi.stubEnv('SHARIAH_SCREENING_API_KEY', 'live-test-key');
    vi.stubEnv('SHARIAH_SCREENING_BASE_URL', 'https://api.zoya.finance/graphql');
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      data: {
        basicCompliance: {
          report: {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            exchange: 'XNAS',
            status: 'COMPLIANT',
            purificationRatio: 0.001,
            reportDate: '2026-09-01T00:00:00.000Z',
          },
        },
      },
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchExternalShariahClassification(apple);

    expect(result.attempted).toBe(true);
    expect(result.classification).toMatchObject({
      shariahStatus: 'compliant',
      shariahSource: 'Zoya AAOIFI API',
      shariahLastReviewedAt: '2026-09-01T00:00:00.000Z',
      shariahManualOverride: false,
      shariahMethod: 'external_provider',
    });
    expect(result.classification?.shariahScreeningData).toMatchObject({
      provider: 'zoya',
      methodology: 'AAOIFI',
      purificationRatio: 0.001,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://api.zoya.finance/graphql');
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('basicCompliance');
  });

  it('maps QUESTIONABLE to needs_review instead of non-compliant', async () => {
    vi.stubEnv('SHARIAH_SCREENING_PROVIDER', 'zoya');
    vi.stubEnv('SHARIAH_SCREENING_API_KEY', 'live-test-key');
    vi.stubEnv('SHARIAH_SCREENING_BASE_URL', 'https://api.zoya.finance/graphql');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({
      data: {
        basicCompliance: {
          report: {
            symbol: 'AAPL',
            status: 'QUESTIONABLE',
            reportDate: '2026-09-01T00:00:00.000Z',
          },
        },
      },
    }), { status: 200 })));

    const result = await fetchExternalShariahClassification(apple);

    expect(result.classification?.shariahStatus).toBe('needs_review');
  });

  it('never uses randomized Zoya sandbox results as real compliance data', async () => {
    vi.stubEnv('SHARIAH_SCREENING_PROVIDER', 'zoya');
    vi.stubEnv('SHARIAH_SCREENING_API_KEY', 'sandbox-test-key');
    vi.stubEnv('SHARIAH_SCREENING_BASE_URL', 'https://sandbox-api.zoya.finance/graphql');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchExternalShariahClassification(apple);

    expect(result.classification).toBeNull();
    expect(result.attempted).toBe(false);
    expect(result.reason).toBe('sandbox_provider_not_allowed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falls back cleanly when no external provider is configured', async () => {
    vi.stubEnv('SHARIAH_SCREENING_PROVIDER', '');
    vi.stubEnv('SHARIAH_SCREENING_API_KEY', '');
    vi.stubEnv('SHARIAH_SCREENING_BASE_URL', '');
    vi.stubEnv('ZOYA_API_KEY', '');

    const result = await fetchExternalShariahClassification(apple);

    expect(result.classification).toBeNull();
    expect(result.attempted).toBe(false);
    expect(result.reason).toBe('provider_not_configured');
  });
});
