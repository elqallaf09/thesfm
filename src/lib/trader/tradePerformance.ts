import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchTraderQuotes, CONNECTED_PROVIDER, type TraderQuote } from '@/lib/trader/marketQuotes';
import type { MarketSignal } from '@/lib/market/signalEngine';

type DbClient = SupabaseClient<any, 'public', any>;

export type TradeAction = 'buy' | 'sell' | 'wait' | 'watch';
export type TradeStatus = 'open' | 'won' | 'lost' | 'waiting' | 'watching' | 'expired';
export type TradeRiskLevel = 'low' | 'medium' | 'high';

export type TradePerformanceRecord = {
  id?: string;
  userId?: string | null;
  symbol: string;
  assetName: string;
  assetLogo: string | null;
  market: string;
  action: TradeAction;
  entryPrice: number | null;
  currentPrice: number | null;
  targetPrice: number | null;
  stopLoss: number | null;
  confidence: number | null;
  riskLevel: TradeRiskLevel;
  timeframe: string;
  status: TradeStatus;
  openedAt: string;
  updatedAt: string;
  provider: string;
  sourceSignalId: string | null;
  sourceType: string;
  notes: string | null;
  priceMessage?: string | null;
  priceUpdated: boolean;
  profitLossPercent: number | null;
  currency: string | null;
  payload?: Record<string, unknown>;
};

type TradeRow = {
  id?: string;
  user_id?: string | null;
  symbol?: string | null;
  asset_name?: string | null;
  asset_logo?: string | null;
  market?: string | null;
  action?: string | null;
  entry_price?: number | string | null;
  current_price?: number | string | null;
  target_price?: number | string | null;
  stop_loss?: number | string | null;
  confidence?: number | string | null;
  risk_level?: string | null;
  timeframe?: string | null;
  status?: string | null;
  opened_at?: string | null;
  updated_at?: string | null;
  provider?: string | null;
  source_signal_id?: string | null;
  source_type?: string | null;
  notes?: string | null;
  price_message?: string | null;
  price_updated_at?: string | null;
  payload?: Record<string, unknown> | null;
};

type RecommendationRow = {
  id?: string;
  symbol?: string | null;
  market_id?: string | null;
  action?: string | null;
  confidence?: number | string | null;
  current_price?: number | string | null;
  target_price?: number | string | null;
  stop_loss?: number | string | null;
  provider?: string | null;
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
};

type WatchlistRow = {
  symbol?: string | null;
  asset_type?: string | null;
  name?: string | null;
  created_at?: string | null;
};

type InvestmentRow = {
  id?: string;
  symbol?: string | null;
  provider_symbol?: string | null;
  name?: string | null;
  asset_name?: string | null;
  market?: string | null;
  exchange?: string | null;
  asset_type?: string | null;
  currency?: string | null;
  purchase_price?: number | string | null;
  average_buy_price?: number | string | null;
  current_price?: number | string | null;
  last_price?: number | string | null;
  profit_loss_percent?: number | string | null;
  risk_level?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  price_updated_at?: string | null;
};

export type TradePerformanceSummary = {
  total: number;
  won: number;
  lost: number;
  open: number;
  waiting: number;
  watching: number;
  expired: number;
  successRate: number | null;
};

export type TradePerformanceDataStatus = {
  provider: string;
  lastUpdated: string;
  savedTrades: number;
  updatedPrices: number;
  missingPrices: number;
  sourceCounts: Record<string, number>;
  message: string | null;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number | null, digits = 4) {
  if (value === null) return null;
  return Number(value.toFixed(digits));
}

export function normalizeTradeSymbol(value: unknown) {
  return String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

export function normalizeTradeAction(value: unknown): TradeAction {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw.includes('buy') || raw.includes('long') || raw.includes('شراء')) return 'buy';
  if (raw.includes('sell') || raw.includes('short') || raw.includes('بيع')) return 'sell';
  if (raw.includes('wait') || raw.includes('hold') || raw.includes('انتظار')) return 'wait';
  return 'watch';
}

export function normalizeTradeStatus(value: unknown, action: TradeAction = 'watch'): TradeStatus {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw.includes('won') || raw.includes('win') || raw.includes('target') || raw.includes('رابح')) return 'won';
  if (raw.includes('lost') || raw.includes('loss') || raw.includes('stop') || raw.includes('خاسر')) return 'lost';
  if (raw.includes('expire') || raw.includes('منتهي')) return 'expired';
  if (raw.includes('wait') || raw.includes('pending') || raw.includes('انتظار')) return 'waiting';
  if (raw.includes('watch') || raw.includes('متابعة') || raw.includes('مراقبة')) return 'watching';
  if (raw.includes('open') || raw.includes('مفتوح')) return 'open';
  if (action === 'wait') return 'waiting';
  if (action === 'watch') return 'watching';
  return 'open';
}

function normalizeRiskLevel(value: unknown): TradeRiskLevel {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw.includes('low') || raw.includes('منخفض')) return 'low';
  if (raw.includes('high') || raw.includes('مرتفع') || raw.includes('عالي')) return 'high';
  return 'medium';
}

function inferMarket(symbol: string, fallback?: string | null) {
  if (fallback) return fallback;
  if (symbol.endsWith('.KW')) return 'Kuwait';
  if (symbol.endsWith('.SR') || symbol.endsWith('.SA')) return 'Saudi';
  if (symbol.endsWith('.AE')) return 'UAE';
  if (symbol.endsWith('.QA')) return 'Qatar';
  if (symbol.endsWith('.BH')) return 'Bahrain';
  if (symbol.endsWith('.OM')) return 'Oman';
  if (symbol.endsWith('-USD') || /^(BTC|ETH|SOL|BNB|XRP|ADA|DOGE)USD$/.test(symbol)) return 'Crypto';
  if (/^(XAUUSD|XAGUSD|WTI|BRENT|GC=F|SI=F|CL=F|BZ=F)$/.test(symbol)) return 'Commodities';
  if (/^[A-Z]{6}$/.test(symbol)) return 'Forex';
  return 'US';
}

function profitLossPercent(record: Pick<TradePerformanceRecord, 'action' | 'entryPrice' | 'currentPrice'>) {
  if (!record.entryPrice || record.currentPrice === null || record.currentPrice === undefined) return null;
  const direction = record.action === 'sell' ? -1 : 1;
  return round(((record.currentPrice - record.entryPrice) / record.entryPrice) * 100 * direction, 2);
}

export function classifyTradePerformance(record: TradePerformanceRecord): TradePerformanceRecord {
  const action = normalizeTradeAction(record.action);
  const currentPrice = toNumber(record.currentPrice);
  const targetPrice = toNumber(record.targetPrice);
  const stopLoss = toNumber(record.stopLoss);

  if (currentPrice === null) {
    return {
      ...record,
      action,
      currentPrice: null,
      status: record.status === 'won' || record.status === 'lost' || record.status === 'expired' ? record.status : 'watching',
      priceMessage: 'بيانات السعر غير متاحة حالياً',
      priceUpdated: false,
      profitLossPercent: null,
    };
  }

  let status = normalizeTradeStatus(record.status, action);
  if (status !== 'won' && status !== 'lost' && status !== 'expired') {
    if (action === 'buy') {
      if (targetPrice !== null && currentPrice >= targetPrice) status = 'won';
      else if (stopLoss !== null && currentPrice <= stopLoss) status = 'lost';
      else status = 'open';
    } else if (action === 'sell') {
      if (targetPrice !== null && currentPrice <= targetPrice) status = 'won';
      else if (stopLoss !== null && currentPrice >= stopLoss) status = 'lost';
      else status = 'open';
    } else if (action === 'wait') {
      status = 'waiting';
    } else {
      status = 'watching';
    }
  }

  return {
    ...record,
    action,
    currentPrice,
    targetPrice,
    stopLoss,
    status,
    priceMessage: null,
    priceUpdated: true,
    profitLossPercent: profitLossPercent({ ...record, action, currentPrice }),
  };
}

export function tradeRowToRecord(row: TradeRow): TradePerformanceRecord | null {
  const symbol = normalizeTradeSymbol(row.symbol);
  if (!symbol) return null;
  const action = normalizeTradeAction(row.action);
  const openedAt = row.opened_at || row.updated_at || new Date().toISOString();
  const updatedAt = row.updated_at || openedAt;
  const entryPrice = toNumber(row.entry_price);
  const currentPrice = toNumber(row.current_price);
  return {
    id: row.id,
    userId: row.user_id ?? null,
    symbol,
    assetName: String(row.asset_name || symbol),
    assetLogo: row.asset_logo || null,
    market: inferMarket(symbol, row.market),
    action,
    entryPrice,
    currentPrice,
    targetPrice: toNumber(row.target_price),
    stopLoss: toNumber(row.stop_loss),
    confidence: toNumber(row.confidence),
    riskLevel: normalizeRiskLevel(row.risk_level),
    timeframe: row.timeframe || (action === 'watch' ? 'تحت المتابعة' : '1-3 أسابيع'),
    status: normalizeTradeStatus(row.status, action),
    openedAt,
    updatedAt,
    provider: row.provider || CONNECTED_PROVIDER.provider,
    sourceSignalId: row.source_signal_id || null,
    sourceType: row.source_type || 'followed_trade',
    notes: row.notes || null,
    priceMessage: row.price_message || null,
    priceUpdated: Boolean(row.price_updated_at || currentPrice !== null),
    profitLossPercent: profitLossPercent({ action, entryPrice, currentPrice }),
    currency: null,
    payload: row.payload || {},
  };
}

export function signalToTradeRecord(signal: MarketSignal & { id?: string | null }, sourceType = 'market_signal'): TradePerformanceRecord | null {
  const symbol = normalizeTradeSymbol(signal.symbol);
  if (!symbol) return null;
  const action = normalizeTradeAction(signal.action);
  const openedAt = signal.lastUpdated || new Date().toISOString();
  return {
    symbol,
    assetName: signal.assetName || symbol,
    assetLogo: null,
    market: inferMarket(symbol, signal.market),
    action,
    entryPrice: toNumber(signal.currentPrice),
    currentPrice: toNumber(signal.currentPrice),
    targetPrice: toNumber(signal.targetPrice),
    stopLoss: toNumber(signal.stopLoss),
    confidence: toNumber(signal.confidence),
    riskLevel: normalizeRiskLevel(signal.riskLevel),
    timeframe: signal.timeframe || (action === 'watch' ? 'تحت المتابعة' : '1-3 أسابيع'),
    status: normalizeTradeStatus(null, action),
    openedAt,
    updatedAt: openedAt,
    provider: signal.provider || CONNECTED_PROVIDER.provider,
    sourceSignalId: signal.id || null,
    sourceType,
    notes: signal.reasons?.[0] || null,
    priceMessage: null,
    priceUpdated: signal.currentPrice !== null,
    profitLossPercent: null,
    currency: signal.currency || null,
    payload: { reasons: signal.reasons, warnings: signal.warnings },
  };
}

function recommendationToRecord(row: RecommendationRow): TradePerformanceRecord | null {
  const payload = row.payload || {};
  const symbol = normalizeTradeSymbol(row.symbol || payload.symbol);
  if (!symbol) return null;
  const action = normalizeTradeAction(row.action || payload.action || payload.signal);
  const openedAt = row.created_at || new Date().toISOString();
  const currentPrice = toNumber(row.current_price ?? payload.currentPrice ?? payload.price);
  return {
    id: row.id ? `recommendation:${row.id}` : undefined,
    symbol,
    assetName: String(payload.name || payload.assetName || symbol),
    assetLogo: String(payload.assetLogo || payload.logoUrl || '') || null,
    market: inferMarket(symbol, row.market_id || String(payload.market || '')),
    action,
    entryPrice: currentPrice,
    currentPrice,
    targetPrice: toNumber(row.target_price ?? payload.targetPrice ?? payload.target ?? payload.target1),
    stopLoss: toNumber(row.stop_loss ?? payload.stopLoss ?? payload.stop),
    confidence: toNumber(row.confidence ?? payload.confidence ?? payload.score),
    riskLevel: normalizeRiskLevel(payload.riskLevel || (payload.risk as Record<string, unknown> | undefined)?.level),
    timeframe: String(payload.timeframe || payload.duration || '1-3 أسابيع'),
    status: normalizeTradeStatus(payload.status, action),
    openedAt,
    updatedAt: openedAt,
    provider: row.provider || String(payload.provider || CONNECTED_PROVIDER.provider),
    sourceSignalId: null,
    sourceType: 'saved_recommendation',
    notes: Array.isArray(payload.reasons) ? String(payload.reasons[0] || '') || null : null,
    priceMessage: null,
    priceUpdated: currentPrice !== null,
    profitLossPercent: null,
    currency: String(payload.currency || '') || null,
    payload,
  };
}

function watchlistSignalToRecord(row: WatchlistRow, signal?: TradePerformanceRecord | null): TradePerformanceRecord | null {
  const symbol = normalizeTradeSymbol(row.symbol);
  if (!symbol) return null;
  if (signal) {
    return {
      ...signal,
      id: signal.id ? `watchlist:${signal.id}` : undefined,
      sourceType: 'watchlist_signal',
      status: signal.status === 'open' ? 'watching' : signal.status,
      openedAt: row.created_at || signal.openedAt,
    };
  }
  const openedAt = row.created_at || new Date().toISOString();
  return {
    symbol,
    assetName: row.name || symbol,
    assetLogo: null,
    market: inferMarket(symbol),
    action: 'watch',
    entryPrice: null,
    currentPrice: null,
    targetPrice: null,
    stopLoss: null,
    confidence: null,
    riskLevel: 'medium',
    timeframe: 'تحت المتابعة',
    status: 'watching',
    openedAt,
    updatedAt: openedAt,
    provider: CONNECTED_PROVIDER.provider,
    sourceSignalId: null,
    sourceType: 'watchlist_signal',
    notes: null,
    priceMessage: 'بيانات السعر غير متاحة حالياً',
    priceUpdated: false,
    profitLossPercent: null,
    currency: null,
    payload: { assetType: row.asset_type },
  };
}

function investmentToRecord(row: InvestmentRow): TradePerformanceRecord | null {
  const symbol = normalizeTradeSymbol(row.symbol || row.provider_symbol);
  if (!symbol) return null;
  const openedAt = row.created_at || new Date().toISOString();
  const entryPrice = toNumber(row.purchase_price ?? row.average_buy_price);
  const currentPrice = toNumber(row.current_price ?? row.last_price);
  return {
    id: row.id ? `investment:${row.id}` : undefined,
    symbol,
    assetName: String(row.asset_name || row.name || symbol),
    assetLogo: null,
    market: inferMarket(symbol, row.market || row.exchange),
    action: 'watch',
    entryPrice,
    currentPrice,
    targetPrice: null,
    stopLoss: null,
    confidence: null,
    riskLevel: normalizeRiskLevel(row.risk_level),
    timeframe: 'مركز محفوظ',
    status: 'watching',
    openedAt,
    updatedAt: row.updated_at || row.price_updated_at || openedAt,
    provider: CONNECTED_PROVIDER.provider,
    sourceSignalId: null,
    sourceType: 'user_saved_trade',
    notes: null,
    priceMessage: currentPrice === null ? 'بيانات السعر غير متاحة حالياً' : null,
    priceUpdated: currentPrice !== null,
    profitLossPercent: toNumber(row.profit_loss_percent) ?? profitLossPercent({ action: 'buy', entryPrice, currentPrice }),
    currency: row.currency || null,
    payload: { providerSymbol: row.provider_symbol, assetType: row.asset_type },
  };
}

function dedupeRecords(records: TradePerformanceRecord[]) {
  const seen = new Set<string>();
  const output: TradePerformanceRecord[] = [];
  for (const record of records) {
    const key = record.id || `${record.sourceType}:${record.sourceSignalId || ''}:${record.symbol}:${record.action}:${record.openedAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(record);
  }
  return output.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
}

function latestSignalBySymbol(signals: TradePerformanceRecord[]) {
  const map = new Map<string, TradePerformanceRecord>();
  for (const signal of signals) {
    if (!map.has(signal.symbol)) map.set(signal.symbol, signal);
  }
  return map;
}

async function maybeSelect<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

async function loadFollowedTradeRows(admin: DbClient | null, userId: string | null) {
  if (!admin || !userId) return [];
  return maybeSelect<TradeRow>(
    admin
      .from('trader_followed_trades')
      .select('id,user_id,symbol,asset_name,asset_logo,market,action,entry_price,current_price,target_price,stop_loss,confidence,risk_level,timeframe,status,opened_at,updated_at,provider,source_signal_id,source_type,notes,price_message,price_updated_at,payload')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false })
      .limit(250),
  );
}

async function loadMarketSignalRecords(admin: DbClient | null) {
  if (!admin) return [];
  const rows = await maybeSelect<Record<string, unknown>>(
    admin
      .from('market_signals')
      .select('id,symbol,asset_name,asset_type,market,currency,action,action_label_ar,confidence,risk_level,current_price,target_price,stop_loss,timeframe,reasons,warnings,provider,data_quality,score_breakdown,technical_summary,created_at,expires_at')
      .order('created_at', { ascending: false })
      .limit(120),
  );
  const seen = new Set<string>();
  return rows.flatMap(row => {
    const symbol = normalizeTradeSymbol(row.symbol);
    if (!symbol || seen.has(symbol)) return [];
    const action = normalizeTradeAction(row.action);
    const currentPrice = toNumber(row.current_price);
    const openedAt = String(row.created_at || new Date().toISOString());
    const record: TradePerformanceRecord = {
      id: String(row.id || '') ? `signal:${String(row.id)}` : undefined,
      symbol,
      assetName: String(row.asset_name || symbol),
      assetLogo: null,
      market: inferMarket(symbol, String(row.market || '')),
      action,
      entryPrice: currentPrice,
      currentPrice,
      targetPrice: toNumber(row.target_price),
      stopLoss: toNumber(row.stop_loss),
      confidence: toNumber(row.confidence),
      riskLevel: normalizeRiskLevel(row.risk_level),
      timeframe: String(row.timeframe || (action === 'watch' ? 'تحت المتابعة' : '1-3 أسابيع')),
      status: normalizeTradeStatus(null, action),
      openedAt,
      updatedAt: openedAt,
      provider: String(row.provider || CONNECTED_PROVIDER.provider),
      sourceSignalId: String(row.id || '') || null,
      sourceType: 'market_signal',
      notes: Array.isArray(row.reasons) ? String(row.reasons[0] || '') || null : null,
      priceMessage: currentPrice === null ? 'بيانات السعر غير متاحة حالياً' : null,
      priceUpdated: currentPrice !== null,
      profitLossPercent: null,
      currency: String(row.currency || '') || null,
      payload: {
        assetType: row.asset_type,
        reasons: row.reasons,
        warnings: row.warnings,
        dataQuality: row.data_quality,
      },
    };
    seen.add(record.symbol);
    return [record];
  });
}

async function loadRecommendationRecords(admin: DbClient | null, userId: string | null) {
  if (!admin || !userId) return [];
  const rows = await maybeSelect<RecommendationRow>(
    admin
      .from('trader_recommendation_history')
      .select('id,symbol,market_id,action,confidence,current_price,target_price,stop_loss,provider,payload,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
  );
  return rows.map(recommendationToRecord).filter((record): record is TradePerformanceRecord => Boolean(record));
}

async function loadWatchlistRecords(admin: DbClient | null, userId: string | null, signalRecords: TradePerformanceRecord[]) {
  if (!admin || !userId) return [];
  const rows = await maybeSelect<WatchlistRow>(
    admin
      .from('market_watchlist')
      .select('symbol,asset_type,name,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
  );
  const signalsBySymbol = latestSignalBySymbol(signalRecords);
  return rows
    .map(row => watchlistSignalToRecord(row, signalsBySymbol.get(normalizeTradeSymbol(row.symbol))))
    .filter((record): record is TradePerformanceRecord => Boolean(record));
}

async function loadInvestmentRecords(admin: DbClient | null, userId: string | null) {
  if (!admin || !userId) return [];
  const rows = await maybeSelect<InvestmentRow>(
    admin
      .from('investment_items')
      .select('id,symbol,provider_symbol,name,asset_name,market,exchange,asset_type,currency,purchase_price,average_buy_price,current_price,last_price,profit_loss_percent,risk_level,created_at,updated_at,price_updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
  );
  return rows.map(investmentToRecord).filter((record): record is TradePerformanceRecord => Boolean(record));
}

async function loadSignalHistory(admin: DbClient | null) {
  if (!admin) return [];
  return maybeSelect<Record<string, unknown>>(
    admin
      .from('signal_history')
      .select('id,symbol,old_action,new_action,old_confidence,new_confidence,reason,created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  );
}

function quoteForRecord(record: TradePerformanceRecord, quotes: Map<string, TraderQuote>) {
  const exact = quotes.get(record.symbol);
  if (exact) return exact;
  if (record.symbol === 'BTC-USD') return quotes.get('BTCUSD') || exact;
  if (record.symbol === 'BTCUSD') return quotes.get('BTC-USD') || exact;
  return exact;
}

async function refreshCurrentPrices(records: TradePerformanceRecord[], forceFresh: boolean) {
  const symbols = Array.from(new Set(records.map(record => record.symbol).filter(Boolean)));
  const quotes = symbols.length
    ? await fetchTraderQuotes(symbols, { forceFresh, concurrency: 5 }).catch(() => [])
    : [];
  const quoteMap = new Map(quotes.map(quote => [quote.symbol, quote]));
  return records.map(record => {
    const quote = quoteForRecord(record, quoteMap);
    if (!quote || !quote.available || quote.price === null) {
      return classifyTradePerformance({
        ...record,
        currentPrice: null,
        currency: record.currency || quote?.currency || null,
        provider: quote?.source || record.provider,
      });
    }
    return classifyTradePerformance({
      ...record,
      currentPrice: quote.price,
      currency: quote.currency || record.currency,
      provider: quote.source || record.provider,
      updatedAt: quote.updatedAt || new Date().toISOString(),
    });
  });
}

async function persistStatusUpdates(admin: DbClient | null, records: TradePerformanceRecord[]) {
  if (!admin) return;
  await Promise.all(records
    .filter(record => record.id && !record.id.includes(':'))
    .map(record => admin
      .from('trader_followed_trades')
      .update({
        current_price: record.currentPrice,
        status: record.status,
        price_message: record.priceMessage || null,
        price_updated_at: record.priceUpdated ? new Date().toISOString() : null,
        provider: record.provider,
      })
      .eq('id', record.id as string)));
}

export function summarizeTrades(records: TradePerformanceRecord[]): TradePerformanceSummary {
  const won = records.filter(record => record.status === 'won').length;
  const lost = records.filter(record => record.status === 'lost').length;
  const resolved = won + lost;
  return {
    total: records.length,
    won,
    lost,
    open: records.filter(record => record.status === 'open').length,
    waiting: records.filter(record => record.status === 'waiting').length,
    watching: records.filter(record => record.status === 'watching').length,
    expired: records.filter(record => record.status === 'expired').length,
    successRate: resolved ? Math.round((won / resolved) * 100) : null,
  };
}

function sourceCounts(records: TradePerformanceRecord[]) {
  return records.reduce<Record<string, number>>((acc, record) => {
    acc[record.sourceType] = (acc[record.sourceType] || 0) + 1;
    return acc;
  }, {});
}

export async function buildTradePerformancePayload(input: {
  admin: DbClient | null;
  userId: string | null;
  forceFresh?: boolean;
}) {
  const followedRows = await loadFollowedTradeRows(input.admin, input.userId);
  const followedRecords = followedRows.map(tradeRowToRecord).filter((record): record is TradePerformanceRecord => Boolean(record));
  const signalRecords = await loadMarketSignalRecords(input.admin);
  const recommendationRecords = await loadRecommendationRecords(input.admin, input.userId);
  const watchlistRecords = await loadWatchlistRecords(input.admin, input.userId, signalRecords);
  const investmentRecords = await loadInvestmentRecords(input.admin, input.userId);
  const signalHistory = await loadSignalHistory(input.admin);

  const records = dedupeRecords([
    ...followedRecords,
    ...recommendationRecords,
    ...watchlistRecords,
    ...signalRecords.filter(record => ['buy', 'sell', 'wait', 'watch'].includes(record.action)),
    ...investmentRecords,
  ]);

  const refreshed = await refreshCurrentPrices(records, input.forceFresh === true);
  await persistStatusUpdates(input.admin, refreshed);

  const dataStatus: TradePerformanceDataStatus = {
    provider: CONNECTED_PROVIDER.provider,
    lastUpdated: new Date().toISOString(),
    savedTrades: refreshed.length,
    updatedPrices: refreshed.filter(record => record.priceUpdated).length,
    missingPrices: refreshed.filter(record => !record.priceUpdated).length,
    sourceCounts: { ...sourceCounts(refreshed), signal_history: signalHistory.length },
    message: refreshed.length ? null : 'لا توجد صفقات متابعة محفوظة أو إشارات محفوظة حالياً.',
  };

  // التتبع الحي لإشارات الدقة العالية: نسبة النجاح الفعلية المقاسة على الأهداف المنشورة
  const precisionRecords = refreshed.filter(record => record.sourceType === 'precision_signal');
  const precisionLive = summarizeTrades(precisionRecords);

  return {
    ok: true,
    followedTrades: refreshed,
    trades: refreshed,
    items: refreshed,
    summary: summarizeTrades(refreshed),
    precisionLive,
    signalHistory,
    dataStatus,
    dataProvider: CONNECTED_PROVIDER,
  };
}

export function recordToDbInsert(record: TradePerformanceRecord, userId: string) {
  return {
    user_id: userId,
    symbol: record.symbol,
    asset_name: record.assetName,
    asset_logo: record.assetLogo,
    market: record.market,
    action: record.action,
    entry_price: record.entryPrice,
    current_price: record.currentPrice,
    target_price: record.targetPrice,
    stop_loss: record.stopLoss,
    confidence: record.confidence,
    risk_level: record.riskLevel,
    timeframe: record.timeframe,
    status: record.status,
    opened_at: record.openedAt,
    provider: record.provider,
    source_signal_id: record.sourceSignalId,
    source_type: record.sourceType,
    notes: record.notes,
    price_message: record.priceMessage || null,
    payload: record.payload || {},
  };
}

export function manualInputToRecord(input: Record<string, unknown>): TradePerformanceRecord | null {
  const nested = (input.recommendation || input.signal || input.trade || {}) as Record<string, unknown>;
  const source = { ...nested, ...input };
  const symbol = normalizeTradeSymbol(source.symbol || source.ticker || source.asset);
  if (!symbol) return null;
  const action = normalizeTradeAction(source.action || source.signal || source.recommendation);
  const entryPrice = toNumber(source.entryPrice ?? source.entry_price ?? source.entry ?? source.currentPrice ?? source.price);
  const currentPrice = toNumber(source.currentPrice ?? source.current_price ?? source.price ?? entryPrice);
  const openedAt = new Date().toISOString();
  return {
    symbol,
    assetName: String(source.assetName || source.asset_name || source.name || symbol),
    assetLogo: String(source.assetLogo || source.asset_logo || source.logoUrl || '') || null,
    market: inferMarket(symbol, typeof source.market === 'string' ? source.market : null),
    action,
    entryPrice,
    currentPrice,
    targetPrice: toNumber(source.targetPrice ?? source.target_price ?? source.target ?? source.target1),
    stopLoss: toNumber(source.stopLoss ?? source.stop_loss ?? source.stop),
    confidence: toNumber(source.confidence ?? source.score),
    riskLevel: normalizeRiskLevel(source.riskLevel || source.risk),
    timeframe: String(source.timeframe || source.duration || (action === 'watch' ? 'تحت المتابعة' : '1-3 أسابيع')),
    status: normalizeTradeStatus(source.status, action),
    openedAt,
    updatedAt: openedAt,
    provider: String(source.provider || CONNECTED_PROVIDER.provider),
    sourceSignalId: typeof source.sourceSignalId === 'string' ? source.sourceSignalId : typeof source.source_signal_id === 'string' ? source.source_signal_id : null,
    sourceType: String(source.sourceType || source.source_type || (input.manual ? 'manual' : 'recommendation_card')),
    notes: typeof source.notes === 'string' ? source.notes : typeof source.reason === 'string' ? source.reason : null,
    priceMessage: currentPrice === null ? 'بيانات السعر غير متاحة حالياً' : null,
    priceUpdated: currentPrice !== null,
    profitLossPercent: null,
    currency: typeof source.currency === 'string' ? source.currency : null,
    payload: source,
  };
}

export async function autoTrackSignalTrades(admin: DbClient | null, signal: MarketSignal, sourceSignalId: string | null) {
  if (!admin) return { inserted: 0 };
  const action = normalizeTradeAction(signal.action);
  if (action === 'buy' || action === 'sell') {
    if (signal.confidence < 70) return { inserted: 0 };
  }

  const precisionPassed = signal.precisionMode?.passed === true;
  const baseRecord = signalToTradeRecord({ ...signal, id: sourceSignalId }, precisionPassed ? 'precision_signal' : 'market_signal');
  if (!baseRecord) return { inserted: 0 };

  let preferenceRows: Array<Record<string, unknown>> = [];
  try {
    const { data } = await admin
      .from('user_signal_preferences')
      .select('user_id,min_confidence,buy_alerts_enabled,sell_alerts_enabled,wait_alerts_enabled');
    preferenceRows = Array.isArray(data) ? data as Array<Record<string, unknown>> : [];
  } catch {
    preferenceRows = [];
  }

  const inserts = [];
  for (const preference of preferenceRows) {
    const userId = String(preference.user_id || '');
    if (!userId) continue;
    const minConfidence = toNumber(preference.min_confidence) ?? 70;
    if ((action === 'buy' || action === 'sell') && (signal.confidence < minConfidence)) continue;
    if (action === 'buy' && preference.buy_alerts_enabled === false) continue;
    if (action === 'sell' && preference.sell_alerts_enabled === false) continue;
    if (action === 'wait' && preference.wait_alerts_enabled !== true) continue;
    if (action === 'watch') continue;

    const existing = await admin
      .from('trader_followed_trades')
      .select('id')
      .eq('user_id', userId)
      .eq('symbol', baseRecord.symbol)
      .eq('action', baseRecord.action)
      .in('source_type', ['market_signal', 'precision_signal'])
      .in('status', ['open', 'waiting', 'watching'])
      .limit(1)
      .maybeSingle();
    if (existing.data) continue;
    inserts.push(recordToDbInsert(baseRecord, userId));
  }

  if (!inserts.length) return { inserted: 0 };
  const { error } = await admin.from('trader_followed_trades').insert(inserts);
  return { inserted: error ? 0 : inserts.length };
}
