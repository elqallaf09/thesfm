import { describe, expect, it } from 'vitest';
import { buildCurrentRisk, isCurrentRiskSnapshot, type RiskPosition } from './current';
import { currentRiskText, isPortfolioRiskQuestion, riskUnavailableText } from './advisor';

const now = Date.parse('2026-11-12T10:00:00Z');
function position(id = 'a', amount = 100): RiskPosition {
  return {
    id, asset: { type: 'STOCK', identifier: id, symbol: id, exchangeCode: 'TEST' },
    valuation: { valueInBaseCurrency: amount, totalValue: amount, currency: 'KWD', baseCurrency: 'KWD', valuedAt: '2026-11-11T10:00:00Z', source: 'test-fixture', sourceQuality: 'verified' },
    fx: { rateToBaseCurrency: null, source: null, valuedAt: null }, dataStatus: { migrationState: 'VERIFIED' },
  };
}
describe('current recorded portfolio risk', () => {
  it('calculates concentration without inventing historical metrics or a risk score', () => {
    const result = buildCurrentRisk([position('a', 100), position('b', 300)], now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot).toMatchObject({ totalValue: 400, riskScore: null, historicalMetrics: null, concentration: { hhi: 0.625, largestWeight: 0.75 } });
    expect(isCurrentRiskSnapshot(result.snapshot)).toBe(true);
  });
  it('groups separate lots of the same asset', () => {
    const a = position('a'); const b = position('b'); b.asset.identifier = a.asset.identifier;
    const result = buildCurrentRisk([a, b], now);
    expect(result.ok && result.snapshot.assetsCount).toBe(1);
    expect(result.ok && result.snapshot.concentration.largestWeight).toBe(1);
  });
  it('does not count duplicate position rows or capped reads', () => {
    expect(buildCurrentRisk([position(), position()], now)).toMatchObject({ ok: false });
    expect(buildCurrentRisk(Array(5000).fill(position()), now)).toMatchObject({ code: 'POSITION_LIMIT_REACHED' });
  });
  it('refuses unverified positions', () => {
    const p = position(); p.dataStatus.migrationState = 'PENDING_VERIFICATION';
    expect(buildCurrentRisk([p], now)).toMatchObject({ ok: false });
  });
  it('requires documented fresh FX and checks the converted amount', () => {
    const p = position(); p.valuation.currency = 'USD'; p.valuation.totalValue = 325;
    expect(buildCurrentRisk([p], now)).toMatchObject({ code: 'MISSING_OR_STALE_FX' });
    p.fx = { rateToBaseCurrency: 100 / 325, source: 'test-fixture', valuedAt: '2026-11-10T10:00:00Z' };
    const result = buildCurrentRisk([p], now);
    expect(result.ok && result.snapshot.asOf).toBe('2026-11-10T10:00:00.000Z');
    p.fx.rateToBaseCurrency = 1;
    expect(buildCurrentRisk([p], now)).toMatchObject({ code: 'FX_VALUE_MISMATCH' });
    p.fx.valuedAt = '2026-10-01T10:00:00Z';
    expect(buildCurrentRisk([p], now)).toMatchObject({ code: 'MISSING_OR_STALE_FX' });
  });
  it('does not silently assign independent identities to unidentified public assets', () => {
    const p = position(); p.asset.identifier = null; p.asset.exchangeCode = null;
    expect(buildCurrentRisk([p], now)).toMatchObject({ code: 'ASSET_IDENTITY_UNAVAILABLE' });
  });
  it('rejects invalid browser payloads', () => {
    expect(isCurrentRiskSnapshot({})).toBe(false);
    const result = buildCurrentRisk([position()], now);
    if (!result.ok) throw new Error(result.code);
    expect(isCurrentRiskSnapshot({ ...result.snapshot, concentration: { hhi: NaN, largestWeight: 1 } })).toBe(false);
    expect(isCurrentRiskSnapshot({ ...result.snapshot, asOf: 'invalid' })).toBe(false);
    expect(isCurrentRiskSnapshot({ ...result.snapshot, holdingsCount: -1 })).toBe(false);
    expect(isCurrentRiskSnapshot({ ...result.snapshot, riskScore: 0 })).toBe(false);
  });
  it('recognizes explicit latest Arabic, English and French requests only', () => {
    for (const content of ['قيّم مخاطر محفظتي', 'قيم مخاطر محفظتي؟', 'Evaluate my portfolio risk', 'Assess the risk of my portfolio', 'Évalue les risques de mon portefeuille']) {
      expect(isPortfolioRiskQuestion([{ role: 'user', content }])).toBe(true);
    }
    expect(isPortfolioRiskQuestion([{ role: 'user', content: 'Do not assess my portfolio risk' }])).toBe(false);
    expect(isPortfolioRiskQuestion([{ role: 'assistant', content: 'قيّم مخاطر محفظتي' }])).toBe(false);
    expect(isPortfolioRiskQuestion([{ role: 'user', content: 'قيّم مخاطر محفظتي' }, { role: 'user', content: 'What is inflation?' }])).toBe(false);
  });
  it('explains only known current metrics and discloses missing historical evidence', () => {
    const result = buildCurrentRisk([position()], now);
    if (!result.ok) throw new Error(result.code);
    for (const locale of ['ar', 'en', 'fr'] as const) {
      expect(currentRiskText(result.snapshot, locale)).toContain('100%');
      expect(currentRiskText(result.snapshot, locale)).toContain('VaR');
      expect(riskUnavailableText('MFA_REQUIRED', locale).length).toBeGreaterThan(10);
    }
    expect(currentRiskText(result.snapshot, 'ar')).toContain('ليس تقييماً كاملاً');
  });
});
