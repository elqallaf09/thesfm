export const DFM_SECURITIES_URL = 'https://api2.dfm.ae/web/sf/v1/securities';

// The upstream CMS has blank currencies, an old active flag for QBTC, and a
// sukuk under Funds. Exchange/issuer notices take precedence for these exact
// listings. Do not infer a currency, asset class, or venue from a bare ticker.
const DEPA_CURRENCY_SOURCE = 'https://depa.com/investors/market-announcements/depa-rings-market-bell-with-nasdaq-dubai-to-celebrate-start-of-share-trading-in-uae-dirhams/';
const DEPACLA_SOURCE = 'https://www.nasdaqdubai.com/trading/disclosures/503a5beb-7a78-4343-9291-818549634b3d';
const QBTC_SOURCE = 'https://www.newswire.ca/news-releases/3iq-to-delist-fund-on-nasdaq-dubai-834254913.html';
const INDONESIA_SOURCE = 'https://www.nasdaqdubai.com/listing/listed-securities/d36f199d-10b2-49cb-a288-181b72db2bed';
const ETIHAD_SOURCE = 'https://feeds.dfm.ae/documents/2026/Jun/20/ec8d2986-adcc-4281-bd12-a35d999573e7/Etihad%20Energy%20Holding%20PJSC%20Press%20Release%2020%20June%202.pdf';

const CORRECTIONS = {
  'NASDAQ_DUBAI:DEPA': { currency: 'AED', source: DEPA_CURRENCY_SOURCE },
  'NASDAQ_DUBAI:DEPACLA': { currency: 'AED', source: DEPACLA_SOURCE },
  // Issuer-confirmed suspension 24 July and delisting 31 July 2025.
  'NASDAQ_DUBAI:QBTC': { currency: 'USD', is_active: false, source: QBTC_SOURCE },
  // Still a listed sukuk, but outside this stock/fund directory. Preserve its
  // identity as an inactive debt record so an upsert also retires the old ETF.
  'NASDAQ_DUBAI:INDO21235USD': { currency: 'USD', asset_type: 'bond', sector: 'Sukuk', is_active: false, source: INDONESIA_SOURCE },
  // Effective from the first session after 19 June 2026 (22 June 2026).
  'DFM:GULFNAV': { is_active: false, source: ETIHAD_SOURCE },
};

// Verified USD listings shown separately from AED listings by DFM marketwatch:
// https://marketwatch.dfm.ae/?isRedirected=true . A new unknown Nasdaq listing
// with an empty currency must be reviewed instead of inheriting a USD default.
const NASDAQ_USD_SYMBOLS = new Set(['ABTC', 'ENBDREIT', 'HIK', 'NDAQ', 'QBTC', 'REIT', 'INDO21235USD']);

const cleanText = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const cleanSymbol = value => cleanText(value).toUpperCase().replace(/[^A-Z0-9.-]/g, '');
const keyOf = record => `${record.exchange}:${record.symbol}`;

function historicalRecord(exchange, symbol, name, assetType, currency, syncedAt) {
  return {
    exchange, market: exchange === 'DFM' ? 'Dubai Financial Market' : 'Nasdaq Dubai',
    symbol, display_symbol: symbol, provider_symbol: exchange === 'DFM' ? `${symbol}.DU` : symbol,
    name, company_name_ar: null, company_name_en: name, asset_type: assetType,
    sector: assetType === 'stock' ? 'Equities' : assetType === 'bond' ? 'Sukuk' : 'Funds',
    currency, country: 'AE', price_unit: 'major', is_active: false,
    source: CORRECTIONS[`${exchange}:${symbol}`].source, last_synced_at: syncedAt,
  };
}

/** Current directory metadata only; never rewrites portfolios or transactions. */
export function applyDfmListingCorrections(records, syncedAt) {
  const byKey = new Map(records.map(record => {
    const correction = CORRECTIONS[keyOf(record)];
    return [keyOf(record), correction ? { ...record, ...correction, last_synced_at: syncedAt } : { ...record }];
  }));

  const oldTicker = records.find(record => keyOf(record) === 'DFM:GULFNAV');
  // A current upstream record, including an inactive one, wins over the old
  // alias. This prevents a stale GULFNAV row from reactivating a suspended name.
  if (oldTicker?.is_active && !byKey.has('DFM:ETIHADENERGY')) {
    const name = 'Etihad Energy Holding PJSC';
    byKey.set('DFM:ETIHADENERGY', {
      ...oldTicker, symbol: 'ETIHADENERGY', display_symbol: 'ETIHADENERGY', provider_symbol: 'ETIHADENERGY.DU',
      name, company_name_en: name, company_name_ar: null, source: ETIHAD_SOURCE, last_synced_at: syncedAt,
    });
  }

  // Keep these exact old identities inactive even after the upstream CMS drops
  // them: sync uses upsert, so omitting them would leave an older DB row active.
  for (const record of [
    historicalRecord('DFM', 'GULFNAV', 'Gulf Navigation Holding PJSC', 'stock', 'AED', syncedAt),
    historicalRecord('NASDAQ_DUBAI', 'QBTC', 'The Bitcoin Fund', 'etf', 'USD', syncedAt),
    historicalRecord('NASDAQ_DUBAI', 'INDO21235USD', 'INDONESIA III 5.000% 01 Dec 35 - RegS', 'bond', 'USD', syncedAt),
  ]) if (!byKey.has(keyOf(record))) byKey.set(keyOf(record), record);

  return Array.from(byKey.values()).sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
}

function assetTypeFor(type) {
  const normalized = cleanText(type).toLowerCase();
  // Debt must be recognized before "trust" (sukuk are trust certificates).
  if (/bond|sukuk|debenture|trust certificate/.test(normalized)) return null;
  if (normalized.includes('exchange traded fund') || normalized.includes('fund') || normalized.includes('trust')) return 'etf';
  return normalized.includes('equities') ? 'stock' : null;
}

export function normalizeDfmRows(rows, syncedAt) {
  const normalized = [];
  for (const row of rows) {
    const exchange = row.Exchange === 'NASDAQ Dubai' ? 'NASDAQ_DUBAI' : row.Exchange === 'DFM' ? 'DFM' : null;
    const symbol = cleanSymbol(row.SecuritySymbol || row.Symbol);
    if (!exchange || !symbol) continue;
    const key = `${exchange}:${symbol}`;
    const correction = CORRECTIONS[key];
    const active = row.Active === true && row.ShowOnList === true;
    if (!active && !correction && key !== 'DFM:ETIHADENERGY') continue;
    const assetType = correction?.asset_type || assetTypeFor(row.SecurityType);
    if (!assetType) continue;
    const reportedCurrency = cleanText(row.Currency).toUpperCase();
    const currency = correction?.currency || (/^[A-Z]{3}$/.test(reportedCurrency) ? reportedCurrency
      : exchange === 'DFM' ? 'AED' : NASDAQ_USD_SYMBOLS.has(symbol) ? 'USD' : null);
    if (!currency) continue;
    const name = cleanText(row.FullName || row.SecurityName || symbol);
    normalized.push({
      exchange, market: exchange === 'DFM' ? 'Dubai Financial Market' : 'Nasdaq Dubai',
      symbol, display_symbol: symbol, provider_symbol: exchange === 'DFM' ? `${symbol}.DU` : symbol,
      name, company_name_ar: null, company_name_en: name, asset_type: assetType,
      sector: cleanText(row.SecurityType) || null, currency, country: 'AE', price_unit: 'major',
      is_active: active, source: DFM_SECURITIES_URL, last_synced_at: syncedAt,
    });
  }
  return applyDfmListingCorrections(normalized, syncedAt);
}
