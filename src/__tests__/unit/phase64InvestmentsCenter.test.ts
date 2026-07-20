import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canonicalInvestmentAssetType,
  investmentAnalysisContextFromQuery,
  investmentAnalysisHref,
  investmentCenterAssetClassFor,
  investmentMatchesCenterAssetClass,
} from '@/lib/investments/center';
import type { Investment } from '@/types/investment';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const migration = read('supabase/migrations/20260720041343_phase_6_4_investments_center_foundation.sql');
const center = read('src/components/investments/InvestmentCenter.tsx');
const navigation = read('src/components/navigationConfig.ts');
const middleware = read('src/middleware.ts');

function investment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: '89e7c6d8-ecdf-4d10-83d7-2ed37b3c5a04',
    name: 'Apple Inc.',
    type: 'stocks',
    currentValue: 200,
    displayValue: 200,
    displayValueStatus: 'valid',
    monthlyContribution: 0,
    startDate: '2026-01-01',
    riskLevel: 'medium',
    symbol: 'AAPL',
    providerSymbol: 'AAPL',
    market: 'NASDAQ',
    assetType: 'stock',
    currency: 'USD',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Phase 6.4 Investments Center foundation', () => {
  it('maps the approved asset classes without silently inventing a legacy type', () => {
    expect(canonicalInvestmentAssetType('stocks')).toBe('STOCK');
    expect(canonicalInvestmentAssetType('realEstate')).toBe('REAL_ESTATE');
    expect(canonicalInvestmentAssetType('cash')).toBeNull();
    expect(investmentCenterAssetClassFor('gold')).toBe('gold-silver');
    expect(investmentMatchesCenterAssetClass(investment(), 'stocks')).toBe(true);
  });

  it('uses one canonical AI Analyst handoff and preserves supported portfolio context', () => {
    const href = investmentAnalysisHref(investment({ currency: 'USD' }));
    const target = new URL(href, 'https://sfm.local');
    expect(target.pathname).toBe('/ai-analyst/analyze/AAPL');
    expect(Object.fromEntries(target.searchParams.entries())).toMatchObject({
      assetType: 'STOCK', horizon: 'POSITION', source: 'investments',
      investmentId: '89e7c6d8-ecdf-4d10-83d7-2ed37b3c5a04',
      investmentAssetType: 'STOCK', market: 'NASDAQ', currency: 'USD',
    });
  });

  it('sends a private asset to the canonical analyst route without a fabricated ticker or engine result', () => {
    const href = investmentAnalysisHref(investment({
      type: 'realEstate',
      assetType: 'realEstate',
      symbol: undefined,
      providerSymbol: undefined,
      market: undefined,
    }));
    const target = new URL(href, 'https://sfm.local');
    expect(target.pathname).toMatch(/^\/ai-analyst\/analyze\/INV-/);
    expect(target.searchParams.get('privateAsset')).toBe('1');
    expect(target.searchParams.get('investmentAssetType')).toBe('REAL_ESTATE');
    expect(target.searchParams.get('assetType')).toBe('STOCK');
    expect(investmentAnalysisContextFromQuery({
      source: 'investments',
      privateAsset: '1',
      investmentId: target.searchParams.get('investmentId'),
      investmentAssetType: target.searchParams.get('investmentAssetType'),
    })).toMatchObject({ privateAsset: true, investmentAssetType: 'REAL_ESTATE' });
  });

  it('keeps the catalog optional, preserves legacy UUIDs, and creates no legacy dual-write trigger', () => {
    expect(migration).toContain('catalog_asset_id uuid references public.investment_asset_catalog(id) on delete set null');
    expect(migration).toContain('id uuid primary key,');
    expect(migration).toContain('legacy_investment_item_id uuid unique references public.investment_items(id)');
    expect(migration).toContain('legacy_snapshot jsonb not null');
    expect(migration).toContain('to_jsonb(item)');
    expect(migration).toContain("'PENDING_VERIFICATION'");
    expect(migration).not.toMatch(/create\s+trigger[\s\S]{0,220}investment_items/i);
    expect(migration).not.toMatch(/update\s+public\.investment_items/i);
  });

  it('keeps position documents independent from Investment Offers and RLS-linked to the owning position', () => {
    expect(migration).toContain('create table if not exists public.investment_documents');
    expect(migration).toContain("'investment-documents', 'investment-documents', false");
    expect(migration).toContain('Users manage their own investment documents');
    expect(migration).toContain('position.user_id = (select auth.uid())');
    expect(migration).not.toContain('references public.project_documents');
  });

  it('uses the canonical asset resolver, a separate ownership identity, and no recommendation component', () => {
    expect(center).toContain("from '@/components/asset/AssetAvatar'");
    expect(center).toContain("from '@/components/invest/PlatformIdentity'");
    expect(center).toContain('investmentAnalysisHref(investment)');
    expect(center).not.toContain('IntelligencePanel');
    expect(center).not.toContain('BUY');
    expect(center).not.toContain('SELL');
  });

  it('keeps exactly one global Investments entry while leaving the legacy route reachable', () => {
    expect(navigation.match(/href: '\/investments'/g)?.length).toBe(1);
    expect(navigation).not.toContain("href: '/invest'");
    expect(middleware).toContain("'/invest',");
    expect(middleware).toContain("'/investments',");
  });
});
