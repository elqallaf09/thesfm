import { NextRequest, NextResponse } from 'next/server';
import { getTraderAccess } from '@/lib/server/traderAccess';
import { toTraderRecommendation } from '@/lib/trader/apiFormat';
import { getScannerResults } from '@/lib/trader/scannerService';
import type { StockAnalysisResult } from '@/lib/trader/types';

export const dynamic = 'force-dynamic';

function percentMove(currentPrice: number, targetPrice: number | null) {
  if (!targetPrice || currentPrice <= 0) return null;
  return ((targetPrice - currentPrice) / currentPrice) * 100;
}

function buildDetailPayload(result: StockAnalysisResult) {
  const recommendation = toTraderRecommendation(result);
  const expectedMovePct = percentMove(result.currentPrice, result.targetPrice);
  const riskReward = result.targetPrice && result.stopLoss && result.currentPrice !== result.stopLoss
    ? Math.abs((result.targetPrice - result.currentPrice) / (result.currentPrice - result.stopLoss))
    : null;

  return {
    cached: true,
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
      shariaStatus: 'unknown',
      shariaSource: 'Internal classification requires review',
      shariaCheckedAt: null,
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
      target2: null,
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
      backtest: {
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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ symbol: string }> },
) {
  const access = await getTraderAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { error: access.reason === 'unauthenticated' ? 'unauthenticated' : 'trader_access_denied' },
      { status: access.reason === 'unauthenticated' ? 401 : 403 },
    );
  }

  const { symbol } = await context.params;
  const normalized = symbol.trim().toUpperCase();
  const results = await getScannerResults({ market: 'US', symbols: [normalized] });
  const result = results.find((item) => item.symbol === normalized);
  if (!result) return NextResponse.json({ error: 'analysis_not_available' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    analysis: {
      ...toTraderRecommendation(result),
      raw: result,
    },
    ...buildDetailPayload(result),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
