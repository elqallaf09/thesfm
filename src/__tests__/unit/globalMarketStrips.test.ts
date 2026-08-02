import { describe, expect, it } from 'vitest';
import { GLOBAL_MARKET_STRIPS, allGlobalMarketStripSymbols, inferStripCurrency } from '@/lib/market/globalMarketStrips';

describe('GLOBAL_MARKET_STRIPS', () => {
  it('never includes a European or Gulf/GCC exchange group', () => {
    const ids = GLOBAL_MARKET_STRIPS.map(strip => strip.id);
    const labels = GLOBAL_MARKET_STRIPS.map(strip => `${strip.labelAr} ${strip.labelEn} ${strip.labelFr}`).join(' ').toLowerCase();

    for (const forbiddenId of ['europe', 'eu', 'gcc', 'gulf', 'khaleej']) {
      expect(ids.some(id => id.includes(forbiddenId))).toBe(false);
    }
    for (const forbiddenTerm of ['europe', 'أوروب', 'gulf', 'خليج', 'gcc', 'tadawul', 'تداول', 'saudi', 'سعودي', 'dfm', 'دبي المالي']) {
      expect(labels).not.toContain(forbiddenTerm.toLowerCase());
    }
  });

  it('includes exactly the required country/exchange groups plus forex, commodities, crypto, and global indices', () => {
    const requiredEquityGroups = [
      'us_nasdaq', 'us_nyse', 'japan_tse', 'china_sse', 'china_szse', 'hongkong_hkex',
      'india_nse', 'india_bse', 'southkorea_krx', 'canada_tsx', 'australia_asx',
    ];
    const ids = GLOBAL_MARKET_STRIPS.map(strip => strip.id);
    for (const required of requiredEquityGroups) {
      expect(ids).toContain(required);
    }
    expect(ids).toContain('forex');
    expect(ids).toContain('commodities');
    expect(ids).toContain('crypto');
    expect(ids).toContain('global_indices');
  });

  it('never combines more than one country or more than one exchange into a single strip', () => {
    // China and India each have two exchanges; every one of the four must
    // be its own strip, never merged back into a combined "china"/"india" id.
    const ids = GLOBAL_MARKET_STRIPS.map(strip => strip.id);
    expect(ids).not.toContain('china');
    expect(ids).not.toContain('china_sse_szse');
    expect(ids).not.toContain('india');
    expect(ids).not.toContain('india_nse_bse');

    // Category strips (forex/commodities/crypto/indices) legitimately use "&"/"and" in
    // their own name (e.g. "Commodities & Metals" is one category, not two countries).
    // Only equity strips are checked for illegal country/exchange combining.
    const equityLabels = GLOBAL_MARKET_STRIPS.filter(s => s.kind === 'equity')
      .map(strip => `${strip.labelAr}|${strip.labelEn}|${strip.labelFr}`);
    for (const label of equityLabels) {
      expect(label).not.toMatch(/&|\band\b| و /i);
    }
    for (const forbidden of ['أوروبا وآسيا', 'الصين وهونغ كونغ', 'اليابان وكوريا', 'الأسهم الأوروبية', 'الأسهم الخليجية']) {
      for (const label of equityLabels) {
        expect(label).not.toContain(forbidden);
      }
    }
  });

  it('gives every equity item a real sector label, and gives no sector to forex/commodity/crypto/index items', () => {
    for (const strip of GLOBAL_MARKET_STRIPS) {
      for (const item of strip.items) {
        if (strip.kind === 'equity') {
          expect(item.sector).toBeDefined();
        } else {
          expect(item.sector).toBeUndefined();
        }
      }
    }
  });

  it('gives every strip a non-empty item list with a real symbol and a name in every supported locale', () => {
    for (const strip of GLOBAL_MARKET_STRIPS) {
      expect(strip.items.length).toBeGreaterThan(0);
      for (const item of strip.items) {
        expect(item.symbol.trim()).not.toBe('');
        expect(item.name.trim()).not.toBe('');
        expect(item.nameAr.trim()).not.toBe('');
      }
    }
  });

  it('never repeats the same symbol within a single strip', () => {
    for (const strip of GLOBAL_MARKET_STRIPS) {
      const symbols = strip.items.map(item => item.symbol);
      expect(new Set(symbols).size).toBe(symbols.length);
    }
  });

  it('collects every configured symbol for the batch quote request', () => {
    const expectedCount = GLOBAL_MARKET_STRIPS.reduce((total, strip) => total + strip.items.length, 0);
    expect(allGlobalMarketStripSymbols()).toHaveLength(expectedCount);
  });
});

describe('inferStripCurrency', () => {
  it('infers the real, documented currency for each supported international exchange suffix', () => {
    expect(inferStripCurrency('7203.T')).toBe('JPY');
    expect(inferStripCurrency('600519.SS')).toBe('CNY');
    expect(inferStripCurrency('000858.SZ')).toBe('CNY');
    expect(inferStripCurrency('0700.HK')).toBe('HKD');
    expect(inferStripCurrency('RELIANCE.NS')).toBe('INR');
    expect(inferStripCurrency('005930.KS')).toBe('KRW');
    expect(inferStripCurrency('SHOP.TO')).toBe('CAD');
    expect(inferStripCurrency('BHP.AX')).toBe('AUD');
  });

  it('defaults unsuffixed equity symbols to USD', () => {
    expect(inferStripCurrency('AAPL')).toBe('USD');
    expect(inferStripCurrency('JPM')).toBe('USD');
  });

  it('treats commodity futures and crypto pairs as USD-denominated', () => {
    expect(inferStripCurrency('GC=F')).toBe('USD');
    expect(inferStripCurrency('BTC-USD')).toBe('USD');
  });

  it('treats a forex pair as a bare exchange rate, not a currency amount', () => {
    expect(inferStripCurrency('EURUSD=X')).toBeNull();
  });

  it('treats an index as a bare points value, not a currency amount', () => {
    expect(inferStripCurrency('^GSPC')).toBeNull();
    expect(inferStripCurrency('^N225')).toBeNull();
  });
});
