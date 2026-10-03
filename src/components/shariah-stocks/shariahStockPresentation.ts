import {
  boubyanSecurityKey,
  normalizeBoubyanExchange,
  type BoubyanReferenceProvenance,
  type BoubyanReferenceState,
} from '@/lib/market/boubyanReference';
import type { BoubyanSourceConflict } from '@/lib/market/boubyanDecision';
import type { ShariahAssetType, ShariahScreeningStatus } from '@/lib/market/shariahUniverse';

export type DataCompleteness = 'complete' | 'partial' | 'insufficient' | 'not_screened';
export type LocalizedScreeningText = { ar: string; en: string; fr: string };
export type SecurityIdentity = {
  symbol: string;
  name?: string;
  exchange?: string | null;
  providerSymbol?: string | null;
  country?: string | null;
};
export type SecurityAnalysisSelection = SecurityIdentity & { name: string };
export type IndependentScreening = {
  shariahStatus: ShariahScreeningStatus;
  reason: LocalizedScreeningText;
  screeningSource: string | null;
  methodology: LocalizedScreeningText;
  lastScreenedAt: string | null;
};
export type PublishedScreeningEvidence = {
  publishedShariahReference?: BoubyanReferenceProvenance | null;
  boubyanReferenceState?: BoubyanReferenceState | null;
  boubyanReferenceReason?: LocalizedScreeningText | null;
  sourceConflict?: BoubyanSourceConflict | null;
  independentScreening?: IndependentScreening | null;
};

export type ShariahQuote = PublishedScreeningEvidence & SecurityIdentity & {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  assetType: ShariahAssetType;
  exchange: string | null;
  price: number | null;
  currency: string;
  change: number | null;
  changePercent: number | null;
  source: string;
  available?: boolean;
  delayed: true;
  shariahStatus: ShariahScreeningStatus;
  statusLabelAr: string;
  screeningSource: string | null;
  screeningMethodology: string;
  lastScreenedAt: string | null;
};

export type ShariahTickerResponse =
  | {
      ok: true;
      source: string;
      updated_at: string;
      screeningSourceConnected: boolean;
      items: ShariahQuote[];
    }
  | {
      ok: false;
      code: string;
      source: string | null;
      updated_at: string | null;
      screeningSourceConnected: boolean;
      items: ShariahQuote[];
    };

export type ScreeningItem = PublishedScreeningEvidence & SecurityIdentity & {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  assetType: ShariahAssetType;
  shariahStatus: ShariahScreeningStatus;
  statusLabelAr: string;
  reason: { ar: string; en: string; fr: string };
  screeningSource: string | null;
  methodology: { ar: string; en: string; fr: string };
  lastScreenedAt: string | null;
  notes: { ar: string; en: string; fr: string };
};

export type ScreeningResponse = {
  ok: boolean;
  code?: string | null;
  catalogStorage?: { state: 'available' | 'unavailable' | 'error'; complete: boolean; manualOverridesChecked: boolean; loadedRows: number };
  updated_at: string;
  sourceConnected: boolean;
  screeningSource: string | null;
  sourceName: string | null;
  methodology: { ar: string; en: string; fr: string };
  emptyMessage: { ar: string; en: string; fr: string };
  counts: Record<ShariahScreeningStatus, number>;
  items: ScreeningItem[];
};

export type ShariahNewsItem = PublishedScreeningEvidence & {
  exchange?: string | null;
  providerSymbol?: string | null;
  country?: string | null;
  id: string;
  title?: string;
  headline?: string;
  summary?: string;
  titleOriginal?: string;
  summaryOriginal?: string;
  languageOriginal?: string;
  source: string;
  url: string;
  publishedAt: string;
  isTranslated?: boolean;
  translatedTo?: string;
  companyName?: string;
  ticker?: string;
  sector?: string;
  sectors?: string[];
  price?: number | null;
  change?: number | null;
  changePercent?: number | null;
  priceSource?: string | null;
  delayed?: true;
  shariahStatus?: ShariahScreeningStatus;
  screeningSource?: string | null;
};

export type ShariahNewsResponse =
  | {
      success: true;
      category: 'sharia';
      source: string;
      priceSource: string;
      lastUpdated: string;
      language: string;
      translationEnabled: boolean;
      screeningSourceConnected: boolean;
      items: ShariahNewsItem[];
      limit: number;
      message?: string;
    }
  | {
      success: false;
      error?: string;
      reason?: string;
      screeningSourceConnected?: boolean;
    };

export type SecurityRow = ScreeningItem & {
  quote?: ShariahQuote;
  dataCompleteness: DataCompleteness;
  stale: boolean;
};

/** Unresolved identities stay visible, but can never receive another venue's quote. */
export function securityKey(item: SecurityIdentity) {
  return boubyanSecurityKey(item) ?? `unresolved:${[
    item.exchange, item.symbol, item.providerSymbol, item.country, item.name,
  ].map(value => String(value ?? '').trim().toUpperCase()).join(':')}`;
}

export function securityMarket(item: SecurityIdentity) {
  const explicit = normalizeBoubyanExchange(item.exchange);
  if (explicit) return explicit;
  const key = boubyanSecurityKey(item);
  return key?.slice(0, key.indexOf(':')) ?? item.exchange?.trim() ?? null;
}

function sourceIsBoubyan(item: Pick<ScreeningItem, 'screeningSource'>) {
  return /boubyan|بوبيان/i.test(item.screeningSource ?? '');
}

export function isSecurityScreeningStale(item: Pick<ScreeningItem, 'lastScreenedAt' | 'screeningSource'> & PublishedScreeningEvidence, now = Date.now()) {
  if (item.publishedShariahReference && sourceIsBoubyan(item)) {
    const due = Date.parse(item.publishedShariahReference.nextReviewAt);
    return item.boubyanReferenceState === 'review_due' || !Number.isFinite(due) || now >= due;
  }
  const date = Date.parse(item.lastScreenedAt ?? '');
  return Number.isFinite(date) && now - date > 365 * 24 * 60 * 60 * 1000;
}

function completeness(item: ScreeningItem): DataCompleteness {
  if (!item.lastScreenedAt && item.shariahStatus === 'unclassified') return 'not_screened';
  if (item.shariahStatus === 'unclassified') return 'insufficient';
  if (item.shariahStatus === 'needs_review') return 'partial';
  return 'complete';
}

export function reconcileShariahSecurities(items: readonly ScreeningItem[], quotes: readonly ShariahQuote[], now = Date.now()): SecurityRow[] {
  const quotesByIdentity = new Map<string, ShariahQuote>();
  for (const quote of quotes) {
    const key = boubyanSecurityKey(quote);
    if (key && !quotesByIdentity.has(key)) quotesByIdentity.set(key, quote);
  }
  const rows: SecurityRow[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = securityKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    const identity = boubyanSecurityKey(item);
    rows.push({
      ...item,
      quote: identity ? quotesByIdentity.get(identity) : undefined,
      dataCompleteness: completeness(item),
      stale: isSecurityScreeningStale(item, now),
    });
  }
  for (const quote of quotes) {
    const key = securityKey(quote);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      ...quote,
      reason: { ar: '', en: '', fr: '' },
      methodology: { ar: quote.screeningMethodology, en: quote.screeningMethodology, fr: quote.screeningMethodology },
      notes: { ar: '', en: '', fr: '' },
      quote,
      dataCompleteness: quote.lastScreenedAt ? 'partial' : 'not_screened',
      stale: isSecurityScreeningStale(quote, now),
    });
  }
  return rows;
}

/** Unqualified news may link only when one resolved venue/issuer is possible. */
export function createShariahNewsLookup(rows: readonly SecurityRow[]) {
  const byIdentity = new Map<string, SecurityRow>();
  const bySymbol = new Map<string, Map<string, SecurityRow>>();
  for (const row of rows) {
    const key = boubyanSecurityKey(row);
    const symbol = key ? key.slice(key.indexOf(':') + 1) : row.symbol.trim().toUpperCase();
    if (key) byIdentity.set(key, row);
    const matches = bySymbol.get(symbol) ?? new Map<string, SecurityRow>();
    matches.set(securityKey(row), row);
    bySymbol.set(symbol, matches);
  }
  return (news: Pick<ShariahNewsItem, 'ticker' | 'exchange' | 'providerSymbol' | 'country'>): SecurityRow | undefined => {
    if (!news.ticker) return undefined;
    const key = boubyanSecurityKey({ ...news, symbol: news.ticker });
    if (key) return byIdentity.get(key);
    if (news.exchange || news.providerSymbol || news.country || /[:.]/.test(news.ticker)) return undefined;
    const matches = bySymbol.get(news.ticker.trim().toUpperCase());
    if (matches?.size !== 1) return undefined;
    const row = matches.values().next().value;
    return row && boubyanSecurityKey(row) ? row : undefined;
  };
}

const ANALYSIS_SUFFIXES: Readonly<Record<string, string>> = {
  BOURSA_KUWAIT: '.KW', TADAWUL: '.SR', DFM: '.DU', ADX: '.AD',
  QSE: '.QA', BAHRAIN_BOURSE: '.BH', MUSCAT: '.OM',
};

/** The legacy analysis API reads a provider symbol, not a separate exchange. */
export function securityAnalysisSymbol(item: SecurityIdentity): string | null {
  const key = boubyanSecurityKey(item);
  if (!key) return null;
  const exchange = key.slice(0, key.indexOf(':'));
  const symbol = key.slice(key.indexOf(':') + 1);
  const suffix = ANALYSIS_SUFFIXES[exchange];
  if (suffix) return `${symbol}${suffix}`;
  if (['NASDAQ', 'NYSE', 'AMEX', 'NYSE_ARCA', 'OTC'].includes(exchange)) return symbol;
  return null;
}

export function securityResearchQuery(item: SecurityIdentity) {
  return boubyanSecurityKey(item) ?? [item.exchange, item.symbol].filter(Boolean).join(':');
}

/** The legacy API may try alternative symbols; never render a different asset's result. */
export function matchesSecurityAnalysisResult(item: SecurityIdentity, result: { providerSymbol?: string; symbol?: string }) {
  const expected = securityAnalysisSymbol(item);
  const actual = (result.providerSymbol || result.symbol || '').trim().toUpperCase();
  return Boolean(expected && actual === expected);
}

export function screeningCatalogWarning(response: Pick<ScreeningResponse, 'code' | 'catalogStorage'>, locale: keyof LocalizedScreeningText) {
  if (response.code !== 'SCREENING_CATALOG_DEGRADED' && response.catalogStorage?.complete !== false) return '';
  return {
    ar: 'لم يكتمل تحميل سجل الفحص الداخلي. قد لا تتوفر بعض القرارات والاستثناءات اليدوية؛ تظل حالة المصدر المنشور منفصلة عن اكتمال هذا السجل.',
    en: 'The internal screening catalog did not load completely. Some manual decisions or exceptions may be unavailable; published-source availability is separate from catalog completeness.',
    fr: 'Le registre interne d’analyse n’a pas été chargé intégralement. Certaines décisions ou exceptions manuelles peuvent manquer ; la disponibilité de la publication reste distincte de celle du registre.',
  }[locale];
}
