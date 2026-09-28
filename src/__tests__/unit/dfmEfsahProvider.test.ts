import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  safeFetchText: vi.fn(),
}));

vi.mock('@/lib/market-news/security', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/market-news/security')>();
  return { ...actual, safeFetchText: mocks.safeFetchText };
});

import {
  dfmResourceDocumentUrl,
  parseDfmEfsahPayload,
  parseDfmPublicationDate,
} from '@/lib/market-news/providers/dfmEfsah';
import { buildFinancialNewsProviderRegistry } from '@/lib/market-news/registry';

const resourcePath = '/2026/Sep/25/a27fc37e-aff5-42ba-a68b-0ff5f850fc8a/ORIENT BOD 25 09 2026.Pdf.pdf';
const canonicalPdfUrl = 'https://feeds.dfm.ae/documents/2026/Sep/25/a27fc37e-aff5-42ba-a68b-0ff5f850fc8a/ORIENT%20BOD%2025%2009%202026.Pdf.pdf';
const payload = {
  root: [{
    id: 'a27fc37e-aff5-42ba-a68b-0ff5f850fc8a',
    publication_date: 'Sep 25, 2026 18:11:55',
    headline: 'Results of BOD Meeting',
    issuer_symbol: 'ORIENT',
    issuer: 'ORIENT - Orient Insurance PJSC',
    resources: [{
      description: 'ORIENT BOD 25 09 2026.Pdf',
      r_path: resourcePath,
    }],
  }],
};

function parseWithTimeZone(timeZone: string) {
  const original = process.env.TZ;
  try {
    process.env.TZ = timeZone;
    return parseDfmPublicationDate('Sep 25, 2026 18:11:55');
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
}

describe('DFM Efsah official disclosures provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeFetchText.mockResolvedValue({
      text: `\uFEFF${JSON.stringify(payload)}`,
      finalUrl: 'https://api2.dfm.ae/efsah/v1/prototype_efsah',
      contentType: 'application/json',
      status: 200,
    });
  });

  it('uses the verified first-party document and DFM UTC+4 publication time', () => {
    const [item] = parseDfmEfsahPayload(payload, '2026-09-27T08:00:00.000Z');

    expect(item).toMatchObject({
      id: 'official-dfm-disclosures-a27fc37e-aff5-42ba-a68b-0ff5f850fc8a',
      canonicalUrl: canonicalPdfUrl,
      originalUrl: canonicalPdfUrl,
      publishedAt: '2026-09-25T14:11:55.000Z',
      sourceType: 'official_exchange',
      sourceDomain: 'dfm.ae',
      isOfficial: true,
      marketCodes: ['GULF', 'DFM', 'AE', 'UAE', 'uae-dfm'],
      exchangeCodes: ['DFM'],
      countries: ['AE'],
      symbols: ['ORIENT'],
      verificationStatus: 'official',
    });
    expect(item.summary).toContain('Orient Insurance');
  });

  it('does not depend on the host timezone when parsing DFM publication timestamps', () => {
    expect(parseWithTimeZone('UTC')).toBe('2026-09-25T14:11:55.000Z');
    expect(parseWithTimeZone('Asia/Kuwait')).toBe('2026-09-25T14:11:55.000Z');
  });

  it.each([
    ['missing resource', undefined],
    ['external URL', 'https://example.com/disclosure.pdf'],
    ['network-path URL', '//example.com/disclosure.pdf'],
    ['path traversal', '/2026/Sep/25/../../secrets.pdf'],
    ['encoded path traversal', '/2026/Sep/%2e%2e/secrets.pdf'],
    ['encoded separator', '/2026/Sep%2f25/secrets.pdf'],
    ['backslash', '/2026\\Sep\\25\\secrets.pdf'],
    ['query string', '/2026/Sep/25/disclosure.pdf?download=1'],
    ['fragment', '/2026/Sep/25/disclosure.pdf#page=1'],
  ])('rejects a %s resource path', (_label, unsafePath) => {
    expect(dfmResourceDocumentUrl(unsafePath)).toBeNull();
    expect(parseDfmEfsahPayload({
      root: [{ ...payload.root[0], resources: [{ r_path: unsafePath }] }],
    })).toEqual([]);
  });

  it('skips an unsafe attachment and uses the next verified DFM resource', () => {
    const [item] = parseDfmEfsahPayload({
      root: [{
        ...payload.root[0],
        resources: [
          { r_path: 'https://example.com/disclosure.pdf' },
          { r_path: resourcePath },
        ],
      }],
    });

    expect(item?.canonicalUrl).toBe(canonicalPdfUrl);
  });

  it('registers and loads DFM disclosures only from the direct DFM API', async () => {
    const registry = buildFinancialNewsProviderRegistry({ marketCodes: ['uae-dfm'], officialOnly: true });
    const provider = registry.providers.find(item => item.id === 'official-dfm-disclosures');

    expect(provider).toMatchObject({
      sourceType: 'official_exchange',
      sourceDomain: 'dfm.ae',
      officialSource: true,
      supportedMarkets: expect.arrayContaining(['GULF', 'DFM', 'AE', 'UAE', 'uae-dfm']),
    });

    const items = await provider!.fetchNews({ marketCodes: ['uae-dfm'], officialOnly: true, limit: 10 });

    expect(items).toHaveLength(1);
    expect(items[0]?.canonicalUrl).toBe(canonicalPdfUrl);
    const [requestUrl, options] = mocks.safeFetchText.mock.calls[0] ?? [];
    const apiUrl = new URL(String(requestUrl));
    expect(apiUrl.origin).toBe('https://api2.dfm.ae');
    expect(apiUrl.pathname).toBe('/efsah/v1/prototype_efsah');
    expect(apiUrl.searchParams.get('announcement_type')).toBe('Disclosure');
    expect(apiUrl.searchParams.get('cms_resources')).toBe('true');
    expect(options).toMatchObject({
      providerId: 'official-dfm-disclosures',
      headers: { accept: 'application/json' },
    });
  });
});
