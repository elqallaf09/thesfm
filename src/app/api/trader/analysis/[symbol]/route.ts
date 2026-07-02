import { NextRequest, NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import { createServerSupabaseAdmin } from '@/lib/server/adminAccess';
import { classifyShariahCompliance, shariahClassificationFields } from '@/lib/market/shariah-screening';
import { toTraderRecommendation } from '@/lib/trader/apiFormat';
import { getCachedScannerResults } from '@/lib/trader/scannerService';
import {
  isMarketAgentSuccess,
  normalizeTraderDetailSymbol,
  resolveTraderDetailCandidates,
  runTraderDetailAnalysis,
  type TraderDetailCandidate,
} from '@/lib/trader/detailAnalysisService';
import type { MarketAgentSuccessResponse } from '@/lib/market/marketAgent';
import type { StockAnalysisResult } from '@/lib/trader/types';

export const dynamic = 'force-dynamic';

type DetailCacheEntry = {
  createdAt: number;
  payload: Record<string, unknown>;
};

type StoredScanRow = {
  id: string;
  symbol: string;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number | null;
  current_price: number | null;
  target_price: number | null;
  stop_loss: number | null;
  timeframe: string | null;
  risk_level: 'low' | 'medium' | 'high' | 'unknown' | null;
  total_score: number | null;
  score_breakdown: Record<string, unknown> | null;
  reasons: string[] | null;
  warnings: string[] | null;
  data_timestamp: string | null;
  provider: string | null;
  delayed: boolean | null;
  created_at: string | null;
};

const DETAIL_CACHE_MS = 10 * 60 * 1000;
const detailAnalysisCache = new Map<string, DetailCacheEntry>();

function noStoreJson(payload: Record<string, unknown>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(payload, { ...init, headers });
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function percentMove(currentPrice: number, targetPrice: number | null) {
  if (targetPrice === null || currentPrice <= 0) return null;
  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

function riskRewardRatio(currentPrice: number, targetPrice: number | null, stopLoss: number | null) {
  if (targetPrice === null || stopLoss === null || currentPrice === stopLoss) return null;
  return Math.abs((targetPrice - currentPrice) / (currentPrice - stopLoss));
}

function actionFromAgent(action: MarketAgentSuccessResponse['suggestedAction']) {
  return action === 'wait' ? 'hold' : action;
}

function candidateName(candidate: TraderDetailCandidate | null, fallbackSymbol: string) {
  return candidate?.name || candidate?.nameAr || fallbackSymbol;
}

function candidateMarketLabel(candidate: TraderDetailCandidate | null) {
  return candidate?.exchangeLabelAr || candidate?.marketLabel || candidate?.exchange || 'السوق';
}

function candidateMarketLabelEn(candidate: TraderDetailCandidate | null) {
  return candidate?.exchangeLabelEn || candidate?.exchange || 'Market';
}

function shariahForDetail(symbol: string, candidate: TraderDetailCandidate | null, extra?: { name?: string | null; assetType?: string | null; sector?: string | null }) {
  const fields = shariahClassificationFields(classifyShariahCompliance({
    symbol,
    name: extra?.name ?? candidateName(candidate, symbol),
    assetType: extra?.assetType ?? candidate?.responseAssetType,
    exchange: candidate?.exchangeLabelEn ?? candidate?.exchange,
    country: candidate?.region,
    sector: extra?.sector ?? candidate?.marketLabel,
  }));
  return {
    ...fields,
    shariaStatus: fields.shariahStatus,
    shariaSource: fields.shariahSource,
    shariaCheckedAt: fields.shariahLastReviewedAt,
  };
}

function buildStockDetailPayload(result: StockAnalysisResult) {
  const recommendation = toTraderRecommendation(result);
  const shariah = shariahForDetail(result.symbol, null, {
    name: result.name,
    assetType: 'stock',
    sector: result.sector,
  });
  const expectedMovePct = percentMove(result.currentPrice, result.targetPrice);
  const riskReward = riskRewardRatio(result.currentPrice, result.targetPrice, result.stopLoss);

  return {
    cached: true,
    status: 'success',
    symbol: result.symbol,
    profile: {
      symbol: result.symbol,
      name: result.name,
      summary: `${result.name} is a US-listed instrument analyzed with real delayed market data and technical-rule scoring.`,
      specialty: result.sector || 'US equities',
      marketLabel: 'السوق الأمريكي',
      marketLabelEn: 'US market',
      region: 'Americas',
      exchangeName: result.exchange || 'US exchange',
      currency: result.currency,
      ...shariah,
    },
    market: {
      label: 'السوق الأمريكي',
      labelEn: 'US market',
      region: 'Americas',
      note: result.delayed ? 'Delayed provider data' : 'Provider data',
    },
    recommendation: {
      ...recommendation,
      actionLabel: result.signal,
      expectedPrice: result.targetPrice,
      target1: result.targetPrice,
      target2: result.target2 ?? null,
      support: result.technicals.support,
      resistance: result.technicals.resistance,
      riskReward,
      expectedMovePct,
      duration: result.expectedTimeframeLabel,
      marketState: result.delayed ? 'Delayed data' : 'Provider data',
      providerDelayNote: result.delayed ? 'Yahoo Finance delayed quote' : 'Yahoo Finance quote',
      relativeVolume: result.technicals.volumeRatio,
      indicators: {
        rsi14: result.technicals.rsi14,
        macd: result.technicals.macd,
        macdSignal: result.technicals.macdSignal,
        sma20: result.technicals.sma20,
        sma50: result.technicals.sma50,
        sma200: result.technicals.sma200,
        atr14: result.technicals.atr14,
      },
      timeframeConsensus: {
        agreementPct: Math.round(result.confidence),
        conflict: result.warnings.length > 0 && result.signal === 'hold',
      },
      timeframes: [
        {
          id: '1d',
          label: 'Daily',
          action: result.signal,
          actionLabel: result.signal,
          confidence: result.confidence,
          rsi14: result.technicals.rsi14 !== null ? Number(result.technicals.rsi14.toFixed(2)) : '--',
          momentum20: result.technicals.momentum20,
          trend: result.technicals.trend,
        },
      ],
      upsideOutlook: result.targetPrice ? [
        {
          label: result.expectedTimeframeLabel || 'Expected target',
          targetPrice: result.targetPrice,
          movePct: expectedMovePct,
          confidence: result.confidence,
        },
      ] : [],
      risk: {
        level: result.riskLevel,
        label: result.riskLevel,
        notes: result.warnings,
      },
      backtest: result.backtest ?? {
        label: 'Not calculated',
        samples: null,
        horizonDays: null,
        avgReturnPct: null,
      },
      analysisQuality: {
        score: result.confidence,
        label: result.analysisMethod,
      },
      dataHealth: {
        score: Math.round(result.scoreBreakdown.technicalScore),
        label: result.delayed ? 'Delayed provider data' : 'Provider data',
      },
      tradePlan: {
        note: result.warnings[0] || 'Use risk management and confirm the signal before execution.',
      },
      sparkline: [],
    },
  };
}

function buildAgentDetailPayload(
  analysis: MarketAgentSuccessResponse,
  candidate: TraderDetailCandidate | null,
  sparkline: number[],
  cached: boolean,
  providerStatus?: Record<string, unknown>,
) {
  const analysisCurrency = candidate?.currency || 'USD';
  const action = actionFromAgent(analysis.suggestedAction);
  const target1 = analysis.takeProfit[0] ?? null;
  const target2 = analysis.takeProfit[1] ?? null;
  const expectedMovePct = percentMove(analysis.currentPrice, target1);
  const riskReward = riskRewardRatio(analysis.currentPrice, target1, analysis.stopLoss);
  const marketLabel = candidateMarketLabel(candidate);
  const marketLabelEn = candidateMarketLabelEn(candidate);
  const name = candidateName(candidate, analysis.symbol);
  const shariah = shariahForDetail(analysis.symbol, candidate, {
    name,
    assetType: analysis.assetType,
  });
  const reasons = [
    analysis.summaryArabic,
    analysis.trends.shortTerm !== 'neutral' ? `Short-term trend: ${analysis.trends.shortTerm}` : null,
    analysis.indicators.rsi !== null ? `RSI: ${analysis.indicators.rsi.toFixed(2)}` : null,
    analysis.indicators.macd !== 'neutral' ? `MACD: ${analysis.indicators.macd}` : null,
  ].filter((reason): reason is string => Boolean(reason));

  return {
    cached,
    status: 'success',
    symbol: analysis.symbol,
    analysis,
    providerStatus,
    profile: {
      symbol: analysis.symbol,
      name,
      summary: analysis.summaryArabic,
      specialty: candidate?.marketLabel || candidate?.exchange || analysis.assetType,
      marketLabel,
      marketLabelEn,
      region: candidate?.region || marketLabelEn,
      exchangeName: marketLabelEn,
      currency: analysisCurrency,
      ...shariah,
    },
    market: {
      label: marketLabel,
      labelEn: marketLabelEn,
      region: candidate?.region || marketLabelEn,
      note: analysis.source,
    },
    recommendation: {
      id: `${analysis.symbol}-${analysis.updatedAt}`,
      symbol: analysis.symbol,
      providerSymbol: candidate?.providerSymbol || analysis.symbol,
      name,
      market: marketLabel,
      exchange: marketLabelEn,
      sector: candidate?.marketLabel || analysis.assetType,
      currency: analysisCurrency,
      currentPrice: analysis.currentPrice,
      price: analysis.currentPrice,
      expectedPrice: target1,
      target1,
      target2,
      targetPrice: target1,
      stopLoss: analysis.stopLoss,
      confidence: analysis.confidence,
      signal: action,
      action,
      actionLabel: action,
      precisionMode: analysis.precisionMode ?? null,
      risk: { level: analysis.riskLevel, label: analysis.riskLevel, notes: analysis.riskLevel === 'high' ? ['High volatility relative to the current signal.'] : [] },
      riskLevel: analysis.riskLevel,
      duration: '1 day to 6 weeks',
      timeframe: analysis.timeframe,
      expectedMovePct,
      finalScore: analysis.confidence,
      score: analysis.confidence,
      generatedAt: analysis.updatedAt,
      dataTimestamp: analysis.updatedAt,
      provider: analysis.source,
      providerStatus,
      delayed: false,
      support: analysis.support[0] ?? null,
      resistance: analysis.resistance[0] ?? null,
      riskReward,
      marketState: analysis.dataStatus,
      providerDelayNote: analysis.source,
      ...shariah,
      relativeVolume: null,
      indicators: {
        rsi14: analysis.indicators.rsi,
        macd: analysis.indicators.macdValue,
        macdSignal: analysis.indicators.macdSignal,
        ema20: analysis.indicators.ema20,
        ema50: analysis.indicators.ema50,
        ema200: analysis.indicators.ema200,
        atr14: analysis.indicators.atr,
        vwap: null,
      },
      timeframeConsensus: {
        agreementPct: analysis.confidence,
        conflict: analysis.suggestedAction === 'wait',
      },
      timeframes: [
        {
          id: '1d',
          label: 'Daily',
          action,
          actionLabel: action,
          confidence: analysis.confidence,
          rsi14: analysis.indicators.rsi !== null ? Number(analysis.indicators.rsi.toFixed(2)) : '--',
          momentum20: null,
          trend: analysis.trends.shortTerm,
        },
      ],
      upsideOutlook: analysis.takeProfit.map((targetPrice, index) => ({
        label: index === 0 ? 'Primary target' : `Target ${index + 1}`,
        targetPrice,
        movePct: percentMove(analysis.currentPrice, targetPrice),
        confidence: Math.max(35, analysis.confidence - index * 7),
      })),
      backtest: analysis.backtest ?? {
        label: 'Not calculated',
        samples: null,
        horizonDays: null,
        avgReturnPct: null,
      },
      analysisQuality: {
        score: analysis.confidence,
        label: 'technical_rules',
      },
      dataHealth: {
        score: analysis.dataStatus === 'available' ? 100 : 0,
        label: providerStatus?.dataQuality === 'partial' ? 'partial' : analysis.source,
      },
      tradePlan: {
        note: 'Use risk management and confirm market liquidity before execution.',
      },
      reasons,
      warnings: [],
      sparkline,
    },
  };
}

function buildStoredDetailPayload(row: StoredScanRow, candidate: TraderDetailCandidate | null) {
  const currentPrice = finiteNumber(row.current_price);
  if (currentPrice === null) return null;
  const targetPrice = finiteNumber(row.target_price);
  const stopLoss = finiteNumber(row.stop_loss);
  const confidence = Math.round(finiteNumber(row.confidence) ?? 0);
  const score = Math.round(finiteNumber(row.total_score) ?? confidence);
  const currency = candidate?.currency || 'USD';
  const name = candidateName(candidate, row.symbol);
  const marketLabel = candidateMarketLabel(candidate);
  const marketLabelEn = candidateMarketLabelEn(candidate);
  const expectedMovePct = percentMove(currentPrice, targetPrice);
  const riskReward = riskRewardRatio(currentPrice, targetPrice, stopLoss);
  const shariah = shariahForDetail(row.symbol, candidate, { name });

  return {
    cached: true,
    status: 'success',
    symbol: row.symbol,
    profile: {
      symbol: row.symbol,
      name,
      summary: 'Stored scanner analysis result.',
      specialty: candidate?.marketLabel || candidate?.exchange || 'Market instrument',
      marketLabel,
      marketLabelEn,
      region: candidate?.region || marketLabelEn,
      exchangeName: marketLabelEn,
      currency,
      ...shariah,
    },
    market: {
      label: marketLabel,
      labelEn: marketLabelEn,
      region: candidate?.region || marketLabelEn,
      note: row.provider || 'stored scanner result',
    },
    recommendation: {
      id: row.id,
      symbol: row.symbol,
      providerSymbol: candidate?.providerSymbol || row.symbol,
      name,
      market: marketLabel,
      exchange: marketLabelEn,
      sector: candidate?.marketLabel || null,
      currency,
      currentPrice,
      price: currentPrice,
      expectedPrice: targetPrice,
      target1: targetPrice,
      target2: null,
      targetPrice,
      stopLoss,
      confidence,
      signal: row.signal,
      action: row.signal,
      actionLabel: row.signal,
      risk: { level: row.risk_level || 'unknown', label: row.risk_level || 'unknown', notes: row.warnings || [] },
      riskLevel: row.risk_level || 'unknown',
      duration: row.timeframe,
      timeframe: row.timeframe,
      expectedMovePct,
      finalScore: score,
      score,
      generatedAt: row.created_at,
      dataTimestamp: row.data_timestamp,
      provider: row.provider,
      delayed: Boolean(row.delayed),
      support: null,
      resistance: null,
      riskReward,
      marketState: row.delayed ? 'Delayed data' : 'Provider data',
      providerDelayNote: row.provider || 'stored scanner result',
      ...shariah,
      relativeVolume: null,
      indicators: {},
      timeframeConsensus: {
        agreementPct: confidence,
        conflict: row.signal === 'hold',
      },
      timeframes: [],
      upsideOutlook: targetPrice ? [{
        label: row.timeframe || 'Stored target',
        targetPrice,
        movePct: expectedMovePct,
        confidence,
      }] : [],
      backtest: {
        label: 'Not calculated',
        samples: null,
        horizonDays: null,
        avgReturnPct: null,
      },
      analysisQuality: {
        score,
        label: 'stored_scanner_result',
      },
      dataHealth: {
        score: row.delayed ? 80 : 100,
        label: row.provider || 'stored scanner result',
      },
      tradePlan: {
        note: row.warnings?.[0] || 'Use risk management and confirm the signal before execution.',
      },
      reasons: row.reasons || [],
      warnings: row.warnings || [],
      sparkline: [],
    },
  };
}

function getCachedDetail(symbol: string) {
  const cached = detailAnalysisCache.get(symbol);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > DETAIL_CACHE_MS) {
    detailAnalysisCache.delete(symbol);
    return null;
  }
  return cached.payload;
}

function setCachedDetail(symbol: string, payload: Record<string, unknown>) {
  detailAnalysisCache.set(symbol, {
    createdAt: Date.now(),
    payload,
  });
}

async function getStoredScanResult(symbol: string) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return null;

  const symbolVariants = Array.from(new Set([symbol, symbol.toUpperCase(), symbol.toLowerCase()]));
  const { data, error } = await supabase
    .from('trader_scan_results')
    .select('id,symbol,signal,confidence,current_price,target_price,stop_loss,timeframe,risk_level,total_score,score_breakdown,reasons,warnings,data_timestamp,provider,delayed,created_at')
    .in('symbol', symbolVariants)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<StoredScanRow>();

  if (error) {
    throw new Error(`scan_result_lookup_failed:${error.code || 'unknown'}`);
  }
  return data;
}

async function buildStoredPayload(symbol: string) {
  const row = await getStoredScanResult(symbol);
  if (!row) return null;
  const candidates = await resolveTraderDetailCandidates(symbol);
  return buildStoredDetailPayload(row, candidates[0] ?? null);
}

function getCachedUsResult(symbol: string) {
  const results = getCachedScannerResults();
  return results.find((item) => item.symbol.toUpperCase() === symbol || item.providerSymbol.toUpperCase() === symbol) ?? null;
}

async function requireTraderAccess() {
  const access = await getTraderAccess();
  if (!access.allowed) {
    return {
      allowed: false as const,
      response: noStoreJson(
        {
          ok: false,
          status: access.reason === 'unauthenticated' ? 'unauthorized' : 'forbidden',
          error: access.reason === 'unauthenticated' ? 'unauthenticated' : 'trader_access_denied',
        },
        { status: access.reason === 'unauthenticated' ? 401 : 403 },
      ),
    };
  }
  return { allowed: true as const };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ symbol: string }> },
) {
  const access = await requireTraderAccess();
  if (!access.allowed) return access.response;

  const { symbol } = await context.params;
  const normalized = normalizeTraderDetailSymbol(decodeURIComponent(symbol));
  if (!normalized) {
    return noStoreJson({ ok: false, status: 'error', error: 'missing_symbol' }, { status: 422 });
  }

  const cachedDetail = getCachedDetail(normalized);
  if (cachedDetail) return noStoreJson({ ok: true, ...cachedDetail, cached: true });

  const cachedUs = getCachedUsResult(normalized);
  if (cachedUs) {
    const payload = buildStockDetailPayload(cachedUs);
    return noStoreJson({ ok: true, analysis: { ...toTraderRecommendation(cachedUs), raw: cachedUs }, ...payload });
  }

  let storedPayload: Record<string, unknown> | null;
  try {
    storedPayload = await buildStoredPayload(normalized);
  } catch {
    return noStoreJson({
      ok: false,
      status: 'error',
      symbol: normalized,
      error: 'scan_lookup_failed',
      message: '\u062a\u0639\u0630\u0631 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0646\u062a\u064a\u062c\u0629 \u0627\u0644\u0641\u062d\u0635 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629.',
    }, { status: 500 });
  }
  if (storedPayload) return noStoreJson({ ok: true, ...storedPayload });

  return noStoreJson({
    ok: true,
    status: 'not_scanned',
    symbol: normalized,
    canScan: true,
    message: 'not_scanned',
  });
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ symbol: string }> },
) {
  const access = await requireTraderAccess();
  if (!access.allowed) return access.response;

  const { symbol } = await context.params;
  const normalized = normalizeTraderDetailSymbol(decodeURIComponent(symbol));
  if (!normalized) {
    return noStoreJson({ ok: false, status: 'error', error: 'missing_symbol' }, { status: 422 });
  }

  try {
    const result = await runTraderDetailAnalysis(normalized);
    if (!isMarketAgentSuccess(result.analysis)) {
      return noStoreJson({
        ok: true,
        status: 'no_data',
        symbol: normalized,
        canScan: true,
        code: result.analysis.code,
        message: result.analysis.message,
        provider: result.provider,
        providerStatus: result.providerStatus,
      });
    }

    const payload = buildAgentDetailPayload(result.analysis, result.candidate, result.sparkline, false, result.providerStatus);
    setCachedDetail(normalized, payload);
    return noStoreJson({ ok: true, ...payload });
  } catch {
    return noStoreJson({
      ok: false,
      status: 'error',
      symbol: normalized,
      error: 'analysis_failed',
      message: 'تعذر إجراء الفحص الآن. حاول مرة أخرى بعد قليل.',
    }, { status: 500 });
  }
}
