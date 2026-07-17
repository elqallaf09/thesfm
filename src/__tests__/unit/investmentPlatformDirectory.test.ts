import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildInvestmentPayload,
  buildPriceRefreshPayload,
  buildSnapshotFallbackPayload,
  mergeInvestmentForUpdate,
  mergeMarketPriceIntoInvestment,
  normalizeInvestment,
  PRICE_REFRESH_UPDATE_KEYS,
} from '@/lib/investments/investmentUtils';
import {
  cleanPlatformName,
  cleanPlatformWebsite,
  isPotentialPlatformDuplicate,
  normalizePlatformName,
  PlatformValidationError,
} from '@/lib/investments/platformDirectory';
import type { Investment, InvestmentInput } from '@/types/investment';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const migration = readSource('supabase/migrations/20260715062013_investment_platform_directory_tracking.sql');
const selector = readSource('src/components/invest/InvestmentPlatformSelector.tsx');
const row = readSource('src/components/invest/InvestmentRow.tsx');
const drawer = readSource('src/components/invest/InvestmentDetailDrawer.tsx');
const list = readSource('src/components/invest/InvestmentList.tsx');
const investCss = readSource('src/app/invest/invest.css');
const translations = readSource('src/lib/translations/invest.ts');
const reports = readSource('src/app/reports-center/page.tsx');
const publicApi = readSource('src/app/api/investment-platforms/route.ts');
const adminApi = readSource('src/app/api/admin/investment-platforms/route.ts');

const input: InvestmentInput = {
  name: 'XTB holding',
  type: 'stocks',
  currentValue: 125,
  monthlyContribution: 0,
  startDate: '2026-07-15',
  riskLevel: 'medium',
  symbol: 'AAPL',
  providerSymbol: 'AAPL',
  market: 'NASDAQ',
  currency: 'USD',
  quantity: 1,
  purchasePrice: 100,
  currentPrice: 125,
  dataSource: 'market-data-provider',
  priceSource: 'market-data-provider',
  purchasePlatformId: '11111111-1111-4111-8111-111111111111',
  purchasePlatformName: 'XTB',
  purchasePlatformType: 'multi_asset_broker',
  purchasePlatformStatus: 'approved',
};

const investment: Investment = {
  ...input,
  id: 'investment-1',
  displayValue: 125,
  displayValueStatus: 'valid',
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
};

describe('investment platform identity and validation', () => {
  it('deduplicates casing and trailing punctuation without merging distinct brands', () => {
    expect(['XTB', 'xtb', 'Xtb', 'XTB.'].map(normalizePlatformName)).toEqual(['xtb', 'xtb', 'xtb', 'xtb']);
    expect(isPotentialPlatformDuplicate('XTB', 'XTB.')).toBe(true);
    expect(normalizePlatformName('A-B')).not.toBe(normalizePlatformName('AB'));
  });

  it.each(['person@example.com', '+965 5555 1234', '<script>alert(1)</script>', 'IBAN KW81CBKU00000000000001'])(
    'rejects unsafe platform names: %s',
    value => expect(() => cleanPlatformName(value)).toThrow(PlatformValidationError),
  );

  it('allows only HTTPS official sites and removes tracking parameters', () => {
    expect(cleanPlatformWebsite('https://example.com/path?utm_source=test&lang=en#offer')).toBe('https://example.com/path?lang=en');
    expect(() => cleanPlatformWebsite('http://example.com')).toThrow(PlatformValidationError);
  });
});

describe('investment platform persistence', () => {
  it('writes dedicated platform fields while keeping market and data-source concepts separate', () => {
    const payload = buildInvestmentPayload(input, 'user-1');
    expect(payload).toMatchObject({
      market: 'NASDAQ',
      exchange: 'NASDAQ',
      data_source: 'market-data-provider',
      purchase_platform_id: input.purchasePlatformId,
      purchase_platform_name: 'XTB',
      purchase_platform_type: 'multi_asset_broker',
    });
    expect(payload.purchase_platform_name).not.toBe(payload.market);
    expect(payload.purchase_platform_name).not.toBe(payload.data_source);
  });

  it('round-trips database fields and the owner-visible catalog status snapshot', () => {
    const payload = buildInvestmentPayload(input, 'user-1');
    const normalized = normalizeInvestment({
      ...payload,
      id: 'investment-1',
      created_at: '2026-07-15T00:00:00.000Z',
      updated_at: '2026-07-15T00:00:00.000Z',
    });
    expect(normalized).toMatchObject({
      purchasePlatformId: input.purchasePlatformId,
      purchasePlatformName: 'XTB',
      purchasePlatformType: 'multi_asset_broker',
      purchasePlatformStatus: 'approved',
    });
  });

  it('preserves a pending custom platform through the schema fallback snapshot', () => {
    const pending = { ...input, purchasePlatformId: undefined, purchasePlatformName: 'My Broker', purchasePlatformType: 'stock_broker' as const, purchasePlatformStatus: 'pending' as const };
    const fallback = buildSnapshotFallbackPayload(pending, 'user-1');
    const restored = normalizeInvestment({
      id: 'investment-2',
      name: pending.name,
      amount: pending.currentValue,
      type: pending.type,
      ai_analysis: fallback.ai_analysis,
      created_at: '2026-07-15T00:00:00.000Z',
    });
    expect(restored).toMatchObject({ purchasePlatformName: 'My Broker', purchasePlatformType: 'stock_broker', purchasePlatformStatus: 'pending' });
  });

  it('keeps legacy investments valid when no platform was recorded', () => {
    const restored = normalizeInvestment({ id: 'legacy', name: 'Legacy holding', amount: 50, type: 'other', created_at: '2024-01-01T00:00:00.000Z' });
    expect(restored.purchasePlatformId).toBeUndefined();
    expect(restored.purchasePlatformName).toBeUndefined();
    expect(restored.currentValue).toBe(50);
  });

  it('preserves platform fields when an edit omits them', () => {
    const merged = mergeInvestmentForUpdate(investment, { ...input, name: 'Renamed holding', purchasePlatformId: undefined, purchasePlatformName: undefined, purchasePlatformType: undefined, purchasePlatformStatus: undefined });
    expect(merged).toMatchObject({ purchasePlatformId: input.purchasePlatformId, purchasePlatformName: 'XTB', purchasePlatformType: 'multi_asset_broker', purchasePlatformStatus: 'approved' });
  });

  it('cannot erase purchase-platform fields during a market-price refresh', () => {
    expect([...PRICE_REFRESH_UPDATE_KEYS].filter(key => key.startsWith('purchase_platform'))).toEqual([]);
    const payload = buildPriceRefreshPayload({ currentPrice: 140, dataSource: 'new-market-provider' });
    expect(Object.keys(payload)).not.toContain('purchase_platform_name');
    const refreshed = mergeMarketPriceIntoInvestment(investment, { currentPrice: 140, dataSource: 'new-market-provider' }, '2026-07-15T01:00:00.000Z');
    expect(refreshed).toMatchObject({ purchasePlatformId: input.purchasePlatformId, purchasePlatformName: 'XTB', purchasePlatformType: 'multi_asset_broker', market: 'NASDAQ' });
    expect(refreshed.dataSource).toBe('new-market-provider');
  });

  it('preserves the last valid account value when a native quote refresh has no FX conversion', () => {
    const crossCurrency: Investment = {
      ...investment,
      currentValue: 30.7,
      displayValue: 30.7,
      currency: 'USD',
      nativeCurrency: 'USD',
      priceCurrency: 'USD',
      currentMarketValue: 125,
      nativeMarketValue: 125,
      userCurrency: 'KWD',
      convertedMarketValue: 30.7,
      defaultCurrencyValue: 30.7,
    };
    const refresh = {
      currentPrice: 140,
      currentMarketValue: 140,
      nativeMarketValue: 140,
      nativeCurrency: 'USD',
      priceCurrency: 'USD',
      userCurrency: 'KWD',
      dataSource: 'live-provider',
    };

    const payload = buildPriceRefreshPayload(refresh);
    expect(payload).toMatchObject({ current_price: 140, current_market_value: 140, native_market_value: 140 });
    expect(payload).not.toHaveProperty('current_value');
    expect(payload).not.toHaveProperty('converted_market_value');

    const refreshed = mergeMarketPriceIntoInvestment(crossCurrency, refresh, '2026-07-17T01:00:00.000Z');
    expect(refreshed).toMatchObject({
      currentValue: 30.7,
      displayValue: 30.7,
      currentMarketValue: 140,
      nativeMarketValue: 140,
      convertedMarketValue: 30.7,
      userCurrency: 'KWD',
      nativeCurrency: 'USD',
    });
  });

  it('updates account value directly when native and account currencies match', () => {
    const payload = buildPriceRefreshPayload({
      currentPrice: 140,
      currentMarketValue: 140,
      nativeCurrency: 'USD',
      userCurrency: 'USD',
    });
    expect(payload).toMatchObject({ current_value: 140, converted_market_value: 140 });
  });

  it('keeps the complete platform snapshot in guest-mode JSON storage', () => {
    const stored = JSON.parse(JSON.stringify([investment])) as Investment[];
    expect(stored[0]).toMatchObject({ purchasePlatformName: 'XTB', purchasePlatformType: 'multi_asset_broker', purchasePlatformStatus: 'approved' });
  });
});

describe('platform directory database contract', () => {
  it('is non-destructive and leaves all new investment fields nullable', () => {
    expect(migration).not.toMatch(/drop\s+(?:table|column)\b/i);
    expect(migration).toMatch(/add column if not exists purchase_platform_id uuid[,;]/i);
    expect(migration).toMatch(/add column if not exists purchase_platform_name text[,;]/i);
    expect(migration).toMatch(/add column if not exists purchase_platform_type text;/i);
    expect(migration).toContain('on delete restrict');
  });

  it('enforces normalized uniqueness and idempotent controlled seeds', () => {
    expect(migration).toContain('investment_platforms_normalized_name_unique');
    expect(migration).toContain('on conflict (normalized_name) do nothing');
    expect((migration.match(/'XTB'/g) ?? []).length).toBeGreaterThan(0);
    expect(migration).toContain("'Interactive Brokers'");
    expect(migration).toContain("'Other platform or provider'");
  });

  it('limits the public directory to approved metadata and excludes submitter identity from grants', () => {
    expect(migration).toMatch(/status = 'approved'/);
    const publicGrant = migration.match(/grant select \([\s\S]*?\) on public\.investment_platforms to anon, authenticated;/i)?.[0] ?? '';
    expect(publicGrant).not.toContain('created_by');
    expect(publicGrant).not.toContain('approved_by');
    expect(migration).toMatch(/revoke all on table public\.investment_platforms from anon, authenticated/i);
    expect(migration).not.toMatch(/grant (?:insert|update|delete).*investment_platforms.*authenticated/i);
  });

  it('keeps investment ownership explicit and reserves moderation functions for service role', () => {
    expect(migration).toMatch(/for update to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/i);
    expect(migration).toMatch(/revoke all on function public\.merge_investment_platforms[\s\S]*?from public, anon, authenticated/i);
    expect(migration).toMatch(/grant execute on function public\.merge_investment_platforms[\s\S]*?to service_role/i);
  });
});

describe('platform directory API privacy and authorization', () => {
  it('returns only bounded approved public metadata and never selects submitter identity', () => {
    const publicColumns = publicApi.match(/const PUBLIC_COLUMNS = '([^']+)'/)?.[1] ?? '';
    expect(publicColumns).not.toContain('created_by');
    expect(publicColumns).not.toContain('approved_by');
    expect(publicApi).toContain(".eq('status', 'approved')");
    expect(publicApi).toContain("positiveInt(url.searchParams.get('limit'), 25, 50)");
    expect(publicApi).toContain('rateLimitRequest');
  });

  it('requires server-side administrator permission for every moderation action', () => {
    expect((adminApi.match(/requireAdminApiAccess\(request, 'company_reviews'\)/g) ?? [])).toHaveLength(2);
    expect(adminApi).toContain(".rpc('merge_investment_platforms'");
    expect(adminApi).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|DATABASE_SERVICE_ROLE_KEY/);
  });
});

describe('platform directory user experience contracts', () => {
  it('implements an accessible keyboard combobox and inline custom entry', () => {
    expect(selector).toContain('role="combobox"');
    expect(selector).toContain('aria-activedescendant');
    expect(selector).toContain("event.key === 'ArrowDown'");
    expect(selector).toContain("event.key === 'ArrowUp'");
    expect(selector).toContain("event.key === 'Enter'");
    expect(selector).toContain('async function submitCustom()');
    expect(selector).not.toContain('<Dialog');
  });

  it('shows platform information on cards, details, and a holdings-only filter without global counts', () => {
    expect(row).toContain('purchasePlatformName');
    expect(drawer).toContain('purchasePlatformName');
    expect(list).toContain('platformOptions');
    expect(list).toContain('investments.forEach');
    expect(list).not.toMatch(/global.*count|user_count|platform_usage/i);
  });

  it('contains complete Arabic, English, and French platform copy with ASCII digits', () => {
    expect(translations).toContain('جهة الشراء والحفظ');
    expect(translations).toContain('Purchase and custody platform');
    expect(translations).toContain('Plateforme d’achat et de conservation');
    expect(translations).not.toMatch(/[٠-٩۰-۹]/);
  });

  it('constrains results and controls for mobile touch and 320px layouts', () => {
    expect(investCss).toContain('max-height: min(18rem, 40vh)');
    expect(investCss).toMatch(/\.invest-platform-results > button \{[\s\S]*?min-height:\s*var\(--control-h-lg\)/);
    expect(investCss).toContain('@media (max-width: 47.5rem)');
    expect(investCss).not.toMatch(/\.invest-platform[^}]*100vw/);
  });

  it('adds nullable platform fields to the existing detailed investment report only', () => {
    expect(reports).toContain('purchasePlatformName');
    expect(reports).toContain('purchasePlatformType');
    expect(reports).toContain("firstText(row, ['purchasePlatformName', 'purchase_platform_name'])");
    expect(reports).toContain("firstText(row, ['purchasePlatformType', 'purchase_platform_type'])");
  });
});
