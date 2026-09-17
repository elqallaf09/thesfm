import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  REAL_ESTATE_MARKET_CENTER_PATH,
  realEstateInvestmentHref,
  savedRealEstateContext,
  legacyRealEstateContext,
  validInvestmentId,
} from '@/lib/investments/realEstateHandoff';

const id = '11111111-1111-4111-8111-111111111111';

describe('Real Estate Market Center handoff', () => {
  it.each(['realEstate', 'REAL_ESTATE', 'property', 'LAND'])('routes %s to the market center without a synthetic stock ticker', type => {
    expect(realEstateInvestmentHref({ id, type })).toBe(`${REAL_ESTATE_MARKET_CENTER_PATH}?investmentId=${id}`);
  });

  it.each(['stocks', 'crypto', 'gold', 'fund', 'project'])('does not intercept the existing %s analyst route', type => {
    expect(realEstateInvestmentHref({ id, type })).toBeNull();
  });

  it('never embeds untrusted IDs, addresses or purchase values in the handoff', () => {
    expect(validInvestmentId('../../private')).toBe(false);
    expect(realEstateInvestmentHref({ id: '../../private', type: 'realEstate' })).toBe(REAL_ESTATE_MARKET_CENTER_PATH);
    expect(realEstateInvestmentHref({ id, type: 'realEstate' })).not.toMatch(/price|address|sourceUrl/);
  });

  it('hydrates recorded purchase and area facts without using current value as cost', () => {
    const context = savedRealEstateContext({ id, legacy_investment_item_id: id, display_name: 'Saved plot', country_code: 'BA', purchase_date: '2020-01-01', total_cost: '10000', purchase_currency: 'USD' }, { property_type: 'LAND', city: 'Sarajevo', land_area: '500', land_area_unit: 'M2' });
    expect(context.positionId).toBe(id);
    expect(context.asset).toMatchObject({ countryCode: 'BA', propertyType: 'LAND', city: 'Sarajevo', purchasePrice: 10000, purchaseCurrency: 'USD', landArea: 500, landAreaUnit: 'M2' });
  });

  it('keeps missing values missing instead of inferring country, area, or purchase cost', () => {
    const context = savedRealEstateContext({ id, total_cost: null, current_total_value: 999999, quantity: 500 });
    expect(context.asset.countryCode).toBe('');
    expect(context.asset.propertyType).toBe('');
    expect(context.asset.purchasePrice).toBeUndefined();
    expect(context.asset.landArea).toBeUndefined();
  });

  it('does not treat a legacy investment ID as a verified canonical position', () => {
    const context = legacyRealEstateContext({ id, type: 'realEstate', location: 'Recorded address', current_value: 999999, currency: 'KWD' });
    expect(context.investmentId).toBe(id);
    expect(context.positionId).toBeNull();
    expect(context.migrationState).toBe('LEGACY_ONLY');
    expect(context.asset.purchasePrice).toBeUndefined();
    expect(context.asset.address).toBe('Recorded address');
  });

  it('moves the real-estate destination under Global Markets and out of Investments navigation', () => {
    const nav = readFileSync('src/components/navigationConfig.ts', 'utf8');
    expect(nav).toContain("href: '/global-markets/real-estate'");
    expect(nav).toContain("labelKey: 'nav_real_estate_market'");
    const investments = readFileSync('src/components/investments/InvestmentCenter.tsx', 'utf8');
    expect(investments).toContain("filter(entry => entry !== 'real-estate')");
    expect(investments).not.toContain('<RealEstateIntelligenceEntry');
    expect(investments).toContain('realEstateInvestmentHref(investment) ?? investmentAnalysisHref(investment)');
  });

  it('keeps legacy property URLs as redirects instead of duplicate market workspaces', () => {
    const legacy = readFileSync('src/app/invest/real-estate/page.tsx', 'utf8');
    const legacySaved = readFileSync('src/app/invest/real-estate/[positionId]/page.tsx', 'utf8');
    expect(legacy).toContain('redirect(target)');
    expect(legacySaved).toContain('REAL_ESTATE_MARKET_CENTER_PATH');
    const assetClass = readFileSync('src/app/investments/[assetClass]/page.tsx', 'utf8');
    expect(assetClass).toContain("assetClass === 'real-estate'");
    expect(assetClass).toContain('redirect(REAL_ESTATE_MARKET_CENTER_PATH)');
  });

  it('preserves explicit history failures and resets the workspace on account changes', () => {
    const source = readFileSync('src/components/invest/RealEstateAnalystWorkspace.tsx', 'utf8');
    expect(source).toContain('key={`${user.id}:');
    expect(source).toContain('this does not mean there are no saved valuations');
    expect(source).toContain('Real Estate Market Center');
    expect(source).not.toContain('.catch(() => setItems([]))');
    const form = readFileSync('src/components/invest/RealEstateLandAnalyst.tsx', 'utf8');
    expect(form).toContain('revision === revisionRef.current');
    expect(form).toContain('initialAsset ??');
    expect(form).toContain("numberingSystem: 'latn'");
  });
});
