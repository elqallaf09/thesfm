/** Parsers for public exchange directories. Never execute downloaded JavaScript. */
export type ExchangeListing = {
  symbol: string;
  providerSymbol: string;
  name: string;
  localName?: string;
  sector?: string;
  currency: string;
  priceUnit?: 'fils';
  exchange?: string;
  assetType?: string;
};

export const LISTING_SOURCES = {
  kuwait: 'https://www.boursakuwait.com.kw/data-api/legacy-mix-services?RT=306&L=E&SRC=KSE',
  shanghai: 'https://www.sse.com.cn/js/common/ssesuggestdata.js',
  shenzhen: 'https://www.szse.cn/api/report/ShowReport?SHOWTYPE=xlsx&CATALOGID=1110&TABKEY=tab1',
  shenzhenB: 'https://www.szse.cn/api/report/ShowReport?SHOWTYPE=xlsx&CATALOGID=1110&TABKEY=tab2',
} as const;

const KW_SECTORS: Record<string, string> = {
  'real estate': 'real_estate', energy: 'energy', industrials: 'industrials', 'consumer staples': 'consumer_goods',
  telecommunications: 'telecom', banking: 'bank', banks: 'bank', insurance: 'insurance', 'financial services': 'financial_services',
  'consumer discretionary': 'consumer_services', 'basic materials': 'basic_materials', 'health care': 'healthcare', technology: 'technology',
};

export function parseKuwaitListings(payload: unknown): ExchangeListing[] {
  const data = payload as { DAT?: { WL?: { TD?: unknown[] }; SRC?: { SCTD?: string[] } } } | null;
  const rows = data?.DAT?.WL?.TD;
  if (!Array.isArray(rows)) throw new Error('invalid_kuwait_directory');
  const sectors = new Map((data?.DAT?.SRC?.SCTD || []).map(value => { const [code, name] = value.split('|'); return [code, KW_SECTORS[name?.trim().toLowerCase()]]; }));
  const result = new Map<string, ExchangeListing>();
  for (const raw of rows) {
    const p = String(raw).split('|');
    const symbol = (p[6] || p[19] || '').trim().toUpperCase();
    if (p[5] !== 'KWD' || p[9] !== '1' || (p[48] !== 'R' && !p[1]?.endsWith('`R'))) continue;
    if (!/^[A-Z0-9.-]+$/.test(symbol) || !p[3]?.trim()) continue;
    result.set(symbol, { symbol, providerSymbol: `${symbol}.KW`, name: p[3].trim(), sector: sectors.get(p[4]), currency: 'KWD', priceUnit: 'fils' });
  }
  return [...result.values()];
}

export function parseShanghaiListings(source: string): ExchangeListing[] {
  const result = new Map<string, ExchangeListing>();
  // Ordinary A/B shares and STAR depositary receipts. Exclude preferred shares.
  const pattern = /\{val:"((?:60|68|90)\d{4})",val2:"([^"\r\n]+)"/g;
  for (const match of source.matchAll(pattern)) {
    const [, symbol, name] = match;
    result.set(symbol, { symbol, providerSymbol: `${symbol}.SS`, name, localName: name, currency: symbol.startsWith('90') ? 'USD' : 'CNY' });
  }
  return [...result.values()];
}

export function parseShenzhenListings(rows: Record<string, unknown>[]): ExchangeListing[] {
  const result = new Map<string, ExchangeListing>();
  for (const raw of rows) {
    const row = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key.replace(/\s/g, ''), String(value ?? '').trim()]));
    for (const share of ['A', 'B']) {
      const symbol = row[`${share}股代码`];
      const localName = row[`${share}股简称`] || row['公司全称'];
      if (!/^\d{6}$/.test(symbol ?? '') || !localName) continue;
      result.set(symbol, { symbol, providerSymbol: `${symbol}.SZ`, name: row['英文名称'] || row['公司全称'] || localName, localName, currency: share === 'B' ? 'HKD' : 'CNY' });
    }
  }
  return [...result.values()];
}
