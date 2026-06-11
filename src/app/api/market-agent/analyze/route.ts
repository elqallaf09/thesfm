import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { proxyHistory } from '@/lib/market/openbbProxy';
import { normalizeMarketSymbol } from '@/lib/market/normalizeSymbol';
import type { MarketAssetType } from '@/lib/market/marketService';
import { validateSymbol } from '@/lib/market/marketService';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import {
  aggregateMarketAgentPoints,
  agentAssetTypeFromProvider,
  analyzeMarketAgentFromHistory,
  insufficientMarketAgentData,
  MARKET_AGENT_TIMEFRAME_CONFIG,
  normalizeMarketAgentAssetType,
  normalizeMarketAgentCurrencyPoints,
  normalizeMarketAgentPoints,
  normalizeMarketAgentTimeframe,
  providerAssetTypeForAgent,
  type MarketAgentAssetType,
  type MarketAgentSuccessResponse,
} from '@/lib/market/marketAgent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_MARKET_AGENT_AI_MODEL = 'gpt-4o-mini';
const MARKET_AGENT_AI_TIMEOUT_MS = 8000;
const FORBIDDEN_ADVICE_WORDS = /مضمون|أكيد|فرصة لا تعوض|اربح الآن|guaranteed|sure signal|100%\s*accurate|risk[-\s]?free/i;

function json(body: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init?.headers,
    },
  });
}

function bearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null;
}

function uniqueCandidates(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values
    .map(value => validateSymbol(value))
    .filter((value): value is string => Boolean(value))
    .filter(value => {
      const key = value.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

async function explainAnalysisWithAi(analysis: MarketAgentSuccessResponse) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return analysis.summaryArabic;

  const openai = new OpenAI({ apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MARKET_AGENT_AI_TIMEOUT_MS);

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MARKET_AGENT_MODEL || process.env.OPENAI_MODEL || DEFAULT_MARKET_AGENT_AI_MODEL,
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content: [
            'You are THE SFM market analysis explanation assistant.',
            'Use only the supplied rule-based market analysis JSON.',
            'Do not invent prices, indicators, news, fundamentals, or reasons.',
            'Do not change the suggested action, confidence, risk level, or levels.',
            'Write one concise professional Arabic paragraph only.',
            'Frame it as an automated analytical reading, not financial advice.',
            'Avoid exaggerated wording such as مضمون، أكيد، فرصة لا تعوض، اربح الآن, guaranteed, risk-free.',
          ].join(' '),
        },
        {
          role: 'user',
          content: JSON.stringify({
            symbol: analysis.symbol,
            assetType: analysis.assetType,
            timeframe: analysis.timeframe,
            currentPrice: analysis.currentPrice,
            direction: analysis.direction,
            suggestedAction: analysis.suggestedAction,
            confidence: analysis.confidence,
            riskLevel: analysis.riskLevel,
            entryZone: analysis.entryZone,
            stopLoss: analysis.stopLoss,
            takeProfit: analysis.takeProfit,
            support: analysis.support,
            resistance: analysis.resistance,
            trends: analysis.trends,
            indicators: analysis.indicators,
            disclaimer: analysis.disclaimerArabic,
          }),
        },
      ],
    }, { signal: controller.signal });

    const text = completion.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 40 || text.length > 900 || FORBIDDEN_ADVICE_WORDS.test(text)) {
      return analysis.summaryArabic;
    }
    return text.replace(/^["'`]+|["'`]+$/g, '').trim();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[market-agent] AI explanation fallback used', error instanceof Error ? error.message : error);
    }
    return analysis.summaryArabic;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveProviderAssetType(assetType: MarketAgentAssetType, normalizedAssetType?: MarketAssetType): MarketAssetType {
  if (normalizedAssetType && (assetType !== 'metal' || normalizedAssetType === 'gold' || normalizedAssetType === 'commodity')) {
    return normalizedAssetType;
  }
  return providerAssetTypeForAgent(assetType);
}

async function saveHistory(token: string | null, analysis: MarketAgentSuccessResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return;

  const user = await getUserFromBearerToken(token);
  if (!user?.id) return;

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { error } = await (client as any).from('market_agent_history').insert({
    user_id: user.id,
    symbol: analysis.symbol,
    asset_type: analysis.assetType,
    timeframe: analysis.timeframe,
    suggested_action: analysis.suggestedAction,
    confidence: analysis.confidence,
    risk_level: analysis.riskLevel,
    current_price: analysis.currentPrice,
    summary: analysis.summaryArabic,
  });

  if (error && process.env.NODE_ENV !== 'production') {
    console.warn('[market-agent] failed to save history', {
      code: error.code,
      message: error.message,
    });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const rawSymbol = String(body?.symbol ?? '').trim();
  const assetType = normalizeMarketAgentAssetType(body?.assetType);
  const timeframe = normalizeMarketAgentTimeframe(body?.timeframe);
  const displayInput = rawSymbol.toUpperCase();

  if (!rawSymbol) {
    return json(insufficientMarketAgentData({
      symbol: '',
      assetType,
      timeframe,
      source: 'openbb',
      updatedAt: new Date().toISOString(),
    }, 'INVALID_SYMBOL'), { status: 400 });
  }

  const normalized = normalizeMarketSymbol(rawSymbol, providerAssetTypeForAgent(assetType));
  if (!normalized) {
    return json(insufficientMarketAgentData({
      symbol: displayInput || rawSymbol,
      assetType,
      timeframe,
      source: 'openbb',
      updatedAt: new Date().toISOString(),
    }, 'INVALID_SYMBOL'), { status: 422 });
  }

  const providerAssetType = resolveProviderAssetType(assetType, normalized.assetType);
  const responseAssetType = assetType === 'stock' ? agentAssetTypeFromProvider(providerAssetType) : assetType;
  const candidates = uniqueCandidates([
    normalized.providerSymbol,
    rawSymbol,
    ...normalized.alternatives,
  ]);
  const config = MARKET_AGENT_TIMEFRAME_CONFIG[timeframe];
  let lastSource = 'openbb';

  for (const candidate of candidates) {
    const result = await proxyHistory(candidate, providerAssetType, config.period, config.interval);
    lastSource = String((result as Record<string, unknown>).source ?? 'openbb');
    if (!result.success || !Array.isArray(result.history) || result.history.length === 0) continue;

    const rawPoints = normalizeMarketAgentPoints(result.history);
    const normalizedCurrency = normalizeMarketAgentCurrencyPoints(rawPoints, {
      symbol: displayInput || normalized.displaySymbol,
      providerSymbol: candidate,
      assetType: providerAssetType,
      providerCurrency: (result as Record<string, unknown>).currency,
    });
    const points = aggregateMarketAgentPoints(normalizedCurrency.points, config.aggregateHours);
    const analysis = analyzeMarketAgentFromHistory({
      symbol: displayInput || normalized.displaySymbol,
      assetType: responseAssetType,
      timeframe,
      providerSymbol: candidate,
      providerAssetType,
      currency: normalizedCurrency.currency,
      source: lastSource,
      updatedAt: new Date().toISOString(),
    }, points);

    if (!analysis.ok) continue;

    const summaryArabic = await explainAnalysisWithAi(analysis);
    const response = summaryArabic === analysis.summaryArabic ? analysis : { ...analysis, summaryArabic };

    await saveHistory(bearerToken(request), response);
    return json(response);
  }

  return json(insufficientMarketAgentData({
    symbol: displayInput || normalized.displaySymbol,
    assetType: responseAssetType,
    timeframe,
    source: lastSource,
    updatedAt: new Date().toISOString(),
  }, 'INSUFFICIENT_MARKET_DATA'));
}

export async function GET(request: NextRequest) {
  const token = bearerToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) {
    return json({ ok: true, success: true, items: [] });
  }

  const user = await getUserFromBearerToken(token);
  if (!user?.id) return json({ ok: true, success: true, items: [] });

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await (client as any)
    .from('market_agent_history')
    .select('id,symbol,asset_type,timeframe,suggested_action,confidence,risk_level,current_price,summary,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[market-agent] failed to load history', { code: error.code, message: error.message });
    }
    return json({ ok: true, success: true, items: [] });
  }

  return json({ ok: true, success: true, items: data ?? [] });
}
