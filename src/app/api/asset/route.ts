import { NextRequest, NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import {
  isMarketAgentSuccess,
  normalizeTraderDetailSymbol,
  runTraderDetailAnalysis,
  type TraderDetailCandidate,
} from '@/lib/trader/detailAnalysisService';
import { isValidPrice } from '@/lib/market/quoteNormalization';
import type { MarketAgentUnavailableResponse, MarketAgentSuccessResponse } from '@/lib/market/marketAgent';

export const dynamic = 'force-dynamic';

function json(payload: Record<string, unknown>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return NextResponse.json(payload, { ...init, headers });
}

async function requireTraderAccess() {
  const access = await getTraderAccess();
  if (!access.allowed) {
    return {
      allowed: false as const,
      response: json(
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

function candidateName(candidate: TraderDetailCandidate | null, fallbackSymbol: string) {
  return candidate?.name || candidate?.nameAr || fallbackSymbol;
}

function marketLabel(candidate: TraderDetailCandidate | null) {
  return candidate?.exchangeLabelAr || candidate?.marketLabel || candidate?.exchange || 'Market';
}

function marketLabelEn(candidate: TraderDetailCandidate | null) {
  return candidate?.exchangeLabelEn || candidate?.exchange || 'Market';
}

function riskRewardRatio(currentPrice: number, targetPrice: number | null, stopLoss: number | null) {
  if (!isValidPrice(currentPrice) || !isValidPrice(targetPrice) || !isValidPrice(stopLoss) || currentPrice === stopLoss) return null;
  return Math.abs((targetPrice - currentPrice) / (currentPrice - stopLoss));
}

function percentMove(currentPrice: number, targetPrice: number | null) {
  if (!isValidPrice(currentPrice) || !isValidPrice(targetPrice)) return null;
  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

function actionFromAnalysis(analysis: MarketAgentSuccessResponse) {
  return analysis.suggestedAction === 'wait' ? 'hold' : analysis.suggestedAction;
}

function profilePayload(symbol: string, candidate: TraderDetailCandidate | null, summary: string, currency?: string | null) {
  const label = marketLabel(candidate);
  const labelEn = marketLabelEn(candidate);
  return {
    symbol,
    name: candidateName(candidate, symbol),
    summary,
    specialty: candidate?.marketLabel || candidate?.exchange || candidate?.responseAssetType || 'Market instrument',
    marketLabel: label,
    marketLabelEn: labelEn,
    region: candidate?.region || labelEn,
    exchangeName: labelEn,
    currency: currency || candidate?.currency || null,
    shariaStatus: 'unclassified',
    shariahStatus: 'unclassified',
    shariahReason: 'No verified Shariah screening data is available.',
    shariaSource: null,
    shariahSource: null,
    shariaCheckedAt: null,
    shariahLastReviewedAt: null,
  };
}

function unavailablePayload(symbol: string, candidate: TraderDetailCandidate | null, analysis: MarketAgentUnavailableResponse, providerStatus: Record<string, unknown>) {
  const name = candidateName(candidate, symbol);
  const label = marketLabel(candidate);
  const labelEn = marketLabelEn(candidate);
  const updatedAt = String(providerStatus.lastUpdated ?? new Date().toISOString());

  return {
    ok: true,
    cached: false,
    status: 'no_data',
    symbol,
    providerStatus,
    profile: profilePayload(symbol, candidate, analysis.summaryArabic, candidate?.currency),
    market: {
      label,
      labelEn,
      region: candidate?.region || labelEn,
      note: analysis.source || 'Yahoo Finance',
    },
    recommendation: {
      id: `${symbol}-${updatedAt}`,
      symbol,
      providerSymbol: candidate?.providerSymbol ?? null,
      name,
      market: label,
      exchange: labelEn,
      sector: candidate?.marketLabel || analysis.assetType,
      currency: candidate?.currency ?? null,
      currentPrice: null,
      price: null,
      expectedPrice: null,
      target1: null,
      target2: null,
      targetPrice: null,
      stopLoss: null,
      confidence: null,
      signal: 'hold',
      action: 'hold',
      actionLabel: 'hold',
      risk: { level: 'unknown', label: 'unknown', notes: [analysis.message] },
      riskLevel: 'unknown',
      duration: null,
      timeframe: analysis.timeframe,
      expectedMovePct: null,
      finalScore: null,
      score: null,
      generatedAt: updatedAt,
      dataTimestamp: updatedAt,
      provider: analysis.source || 'Yahoo Finance',
      providerStatus,
      delayed: true,
      support: null,
      resistance: null,
      riskReward: null,
      marketState: 'unavailable',
      providerDelayNote: analysis.source || 'Yahoo Finance',
      relativeVolume: null,
      indicators: {
        rsi14: null,
        macd: null,
        macdSignal: null,
        ema20: null,
        ema50: null,
        ema200: null,
        atr14: null,
        vwap: null,
      },
      timeframeConsensus: {
        agreementPct: null,
        conflict: true,
        coverage: 0,
        total: 0,
        strategyCount: 0,
        label: 'Insufficient data',
        labelAr: 'بيانات غير كافية',
      },
      timeframes: [],
      upsideOutlook: [],
      backtest: {
        label: 'Not calculated',
        samples: null,
        horizonDays: null,
        avgReturnPct: null,
      },
      analysisQuality: {
        score: 0,
        label: 'unavailable',
      },
      dataHealth: {
        score: 0,
        label: 'unavailable',
      },
      tradePlan: {
        note: analysis.message,
      },
      reasons: [analysis.summaryArabic],
      warnings: [analysis.message],
      sparkline: [],
    },
  };
}

function successPayload(
  symbol: string,
  candidate: TraderDetailCandidate | null,
  analysis: MarketAgentSuccessResponse,
  sparkline: number[],
  providerStatus: Record<string, unknown>,
) {
  const name = candidateName(candidate, symbol);
  const label = marketLabel(candidate);
  const labelEn = marketLabelEn(candidate);
  const action = actionFromAnalysis(analysis);
  const target1 = analysis.takeProfit[0] ?? null;
  const target2 = analysis.takeProfit[1] ?? null;
  const expectedMovePct = percentMove(analysis.currentPrice, target1);
  const riskReward = riskRewardRatio(analysis.currentPrice, target1, analysis.stopLoss);

  return {
    ok: true,
    cached: false,
    status: 'success',
    symbol,
    analysis,
    providerStatus,
    profile: profilePayload(symbol, candidate, analysis.summaryArabic, analysis.indicators ? candidate?.currency : null),
    market: {
      label,
      labelEn,
      region: candidate?.region || labelEn,
      note: analysis.source,
    },
    recommendation: {
      id: `${symbol}-${analysis.updatedAt}`,
      symbol,
      providerSymbol: candidate?.providerSymbol || symbol,
      name,
      market: label,
      exchange: labelEn,
      sector: candidate?.marketLabel || analysis.assetType,
      currency: candidate?.currency || null,
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
      delayed: providerStatus.dataQuality !== 'live',
      support: analysis.support[0] ?? null,
      resistance: analysis.resistance[0] ?? null,
      riskReward,
      marketState: String(providerStatus.dataQuality ?? analysis.dataStatus),
      providerDelayNote: analysis.source,
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
        agreementPct: null,
        conflict: analysis.suggestedAction === 'wait',
        coverage: 1,
        total: 1,
        strategyCount: 1,
        label: 'Limited consensus',
        labelAr: 'توافق محدود',
      },
      timeframes: [
        {
          id: '1d',
          label: 'Daily',
          action,
          actionLabel: action,
          confidence: analysis.confidence,
          rsi14: analysis.indicators.rsi !== null ? Number(analysis.indicators.rsi.toFixed(2)) : null,
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
      backtest: {
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
        score: providerStatus.dataQuality === 'unavailable' ? 0 : providerStatus.dataQuality === 'partial' ? 60 : 90,
        label: providerStatus.dataQuality ?? analysis.source,
      },
      tradePlan: {
        note: 'Use risk management and confirm market liquidity before execution.',
      },
      reasons: [
        analysis.summaryArabic,
        analysis.indicators.rsi !== null ? `RSI: ${analysis.indicators.rsi.toFixed(2)}` : null,
        `Trend: ${analysis.trends.shortTerm}`,
      ].filter(Boolean),
      warnings: [],
      sparkline,
    },
  };
}

export async function GET(request: NextRequest) {
  const access = await requireTraderAccess();
  if (!access.allowed) return access.response;

  const symbol = normalizeTraderDetailSymbol(request.nextUrl.searchParams.get('symbol'));
  if (!symbol) {
    return json({ ok: false, status: 'error', error: 'missing_symbol' }, { status: 422 });
  }

  const result = await runTraderDetailAnalysis(symbol);
  if (!isMarketAgentSuccess(result.analysis)) {
    return json(unavailablePayload(result.symbol, result.candidate, result.analysis, result.providerStatus));
  }

  return json(successPayload(result.symbol, result.candidate, result.analysis, result.sparkline, result.providerStatus));
}
