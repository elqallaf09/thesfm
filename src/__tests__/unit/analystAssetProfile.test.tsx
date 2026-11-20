import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AssetProfileFields } from '@/components/ai-analyst/AiAnalystAssetProfile';
import { ASSET_PROFILE_COPY } from '@/components/ai-analyst/assetProfileCopy';
import { assetProfileWebsite, readAnalystAssetProfile } from '@/components/ai-analyst/assetProfilePresentation';

const fund = { displaySymbol: 'QQQ', providerSymbol: 'QQQ', assetType: 'FUND' as const };
const stock = { displaySymbol: 'AAPL', providerSymbol: 'AAPL', assetType: 'STOCK' as const };
const response = (overrides: Record<string, unknown> = {}) => ({
  success: true, symbol: 'QQQ', assetType: 'fund', source: 'Fixture provider', lastUpdated: '2026-11-08T06:30:32Z',
  profileAvailable: true, profile: { name: 'Fixture fund', ticker: 'QQQ' }, ...overrides,
});

describe('canonical analyst asset profiles', () => {
  it('preserves provider fund fields and provenance without inferred replacements', () => {
    const profile = readAnalystAssetProfile(response({ profile: {
      ticker: 'QQQ', issuer: 'Fixture issuer', objective: 'Source-provided investment objective', indexTracked: 'Fixture index', sector: 'Do not show',
    } }), fund);
    expect(profile).toMatchObject({ issuer: 'Fixture issuer', objective: 'Source-provided investment objective', indexTracked: 'Fixture index', sector: null,
      source: 'Fixture provider', retrievedAt: '2026-11-08T06:30:32.000Z' });
  });

  it('does not infer issuer or index from the QQQ name, or objective from issuer/description', () => {
    const profile = readAnalystAssetProfile(response({ profile: { name: 'Invesco QQQ Trust', ticker: 'QQQ', description: 'An unclassified description', issuer: 'Provider issuer' } }), fund);
    expect(profile).toMatchObject({ issuer: 'Provider issuer', objective: null, indexTracked: null, description: null });
  });

  it('keeps absent and placeholder values unavailable, even with a valid identity', () => {
    const profile = readAnalystAssetProfile(response({ profile: { ticker: 'QQQ', issuer: 'N/A', objective: ' ', indexTracked: null } }), fund);
    expect(profile).toMatchObject({ issuer: null, objective: null, indexTracked: null });
    expect(readAnalystAssetProfile(response({ profileAvailable: false, profile: { issuer: 'Do not use' } }), fund).issuer).toBeNull();
    expect(readAnalystAssetProfile(response({ source: '', profile: { issuer: 'Unsourced' } }), fund).issuer).toBeNull();
  });

  it('renders stock sector and safe website, without fund-specific fields', () => {
    const profile = readAnalystAssetProfile(response({ symbol: 'AAPL', assetType: 'stock', source: 'Finnhub/Yahoo Finance/SEC EDGAR',
      profile: { ticker: 'AAPL', sector: 'Technology', industry: 'Technology Hardware', website: 'https://www.apple.com/', issuer: 'Wrong field' } }), stock);
    expect(profile).toMatchObject({ sector: 'Technology', website: 'https://www.apple.com/', issuer: null });
    const html = renderToStaticMarkup(<AssetProfileFields assetType="STOCK" profile={profile} locale="en" />);
    expect(html).toContain('Technology');
    expect(html).toContain('href="https://www.apple.com/"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('data-profile-field="issuer"');
  });

  it.each(['ar', 'en', 'fr'] as const)('shows each unavailable fund field in %s', locale => {
    const html = renderToStaticMarkup(<AssetProfileFields assetType="FUND" profile={null} locale={locale} />);
    for (const field of ['issuer', 'objective', 'indexTracked'] as const) {
      expect(html).toContain(`data-profile-field="${field}"`);
      expect(html).toContain(ASSET_PROFILE_COPY[locale][field]);
    }
    expect(html.split(ASSET_PROFILE_COPY[locale].unavailable)).toHaveLength(4);
    expect(html).not.toContain('data-profile-field="sector"');
  });

  it('does not expose mismatched assets, invalid response shapes, or fabricated dates', () => {
    for (const payload of [null, [], { success: false }, response({ symbol: 'SPY' }), response({ assetType: 'stock' }), response({ profile: { ticker: 'SPY', issuer: 'Other issuer' } })]) {
      expect(() => readAnalystAssetProfile(payload, fund)).toThrow();
    }
    expect(readAnalystAssetProfile(response({ lastUpdated: 'invalid date' }), fund).retrievedAt).toBeNull();
    expect(readAnalystAssetProfile(response({ profile: { issuer: { name: 'Not text' } } }), fund).issuer).toBeNull();
  });

  it.each(['javascript:alert(1)', 'data:text/html,hello', '//evil.example', '/relative', 'https://user:password@example.com', 'not a URL'])('rejects unsafe website %s', value => {
    expect(assetProfileWebsite(value)).toBeNull();
  });

  it('keeps all translations aligned', () => {
    expect(Object.keys(ASSET_PROFILE_COPY.ar).sort()).toEqual(Object.keys(ASSET_PROFILE_COPY.en).sort());
    expect(Object.keys(ASSET_PROFILE_COPY.fr).sort()).toEqual(Object.keys(ASSET_PROFILE_COPY.en).sort());
  });
});
