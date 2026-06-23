import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { proxyHistory } from '@/lib/market/marketDataProvider';
import { normalizeMarketSymbol, type NormalizedMarketSymbol } from '@/lib/market/normalizeSymbol';
import { searchBundledMarketSymbols } from '@/lib/market/marketSymbolDirectory';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import type { MarketAssetType, MarketSearchItem } from '@/lib/market/marketService';
import { validateSymbol } from '@/lib/market/marketService';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { consumeAiUsage } from '@/lib/server/aiUsage';
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
const GLOBAL_STOCK_SUFFIXES = [
  '.KW', '.SR', '.SA', '.DU', '.AD', '.AE', '.QA', '.BH', '.OM',
  '.T', '.HK', '.SS', '.SZ', '.KS', '.KQ', '.TW', '.TWO', '.NS', '.BO', '.SI', '.JK', '.BK', '.KL', '.AX',
  '.L', '.DE', '.F', '.PA', '.AS', '.BR', '.LS', '.MC', '.MI', '.SW', '.VI', '.ST', '.OL', '.CO', '.HE', '.WA',
  '.TO', '.V', '.MX', '.JO', '.IS', '.CA',
];
type AgentSymbolCandidate = {
  displaySymbol: string;
  providerSymbol: string;
  providerAssetType: MarketAssetType;
  responseAssetType: MarketAgentAssetType;
  currency?: string | null;
};
const FORBIDDEN_ADVICE_WORDS = /Ù…Ø¶Ù…ÙˆÙ†|Ø£ÙƒÙŠØ¯|ÙØ±ØµØ© Ù„Ø§ ØªØ¹ÙˆØ¶|Ø§Ø±Ø¨Ø­ Ø§Ù„Ø¢Ù†|guaranteed|sure signal|100%\s*accurate|risk[-\s]?free/i;

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

function candidateFromNormalized(normalized: NormalizedMarketSymbol, requestedAssetType: MarketAgentAssetType): AgentSymbolCandidate {
  const providerAssetType = normalized.assetType;
  return {
    displaySymbol: normalized.displaySymbol,
    providerSymbol: normalized.providerSymbol,
    providerAssetType,
    responseAssetType: requestedAssetType === 'stock' ? agentAssetTypeFromProvider(providerAssetType) : requestedAssetType,
  };
}

function candidateFromSearchItem(item: MarketSearchItem, requestedAssetType: MarketAgentAssetType): AgentSymbolCandidate | null {
  const providerSymbol = validateSymbol(item.providerSymbol ?? item.symbol);
  const displaySymbol = validateSymbol(item.symbol);
  if (!providerSymbol || !displaySymbol) return null;
  const providerAssetType = resolveProviderAssetType(requestedAssetType, item.assetType);
  return {
    displaySymbol,
    providerSymbol,
    providerAssetType,
    responseAssetType: requestedAssetType === 'stock' ? agentAssetTypeFromProvider(providerAssetType) : requestedAssetType,
    currency: item.currency,
  };
}

function directGlobalStockCandidates(symbol: string, requestedAssetType: MarketAgentAssetType): AgentSymbolCandidate[] {
  if (requestedAssetType !== 'stock') return [];
  const raw = symbol.trim().toUpperCase();
  if (!raw || /[.^=:/-]/.test(raw) || raw.length > 12 || !/^[A-Z0-9]+$/.test(raw)) return [];
  const suffixes = /^[0-9]+$/.test(raw)
    ? [
      '.T', '.HK', '.SS', '.SZ', '.KS', '.KQ', '.TW', '.TWO', '.NS', '.BO', '.SI', '.JK', '.BK', '.KL', '.AX',
      ...GLOBAL_STOCK_SUFFIXES.filter(suffix => !['.T', '.HK', '.SS', '.SZ', '.KS', '.KQ', '.TW', '.TWO', '.NS', '.BO', '.SI', '.JK', '.BK', '.KL', '.AX'].includes(suffix)),
    ]
    : GLOBAL_STOCK_SUFFIXES;
  return suffixes.map(suffix => ({
    displaySymbol: raw,
    providerSymbol: `${raw}${suffix}`,
    providerAssetType: 'stock' as MarketAssetType,
    responseAssetType: 'stock' as MarketAgentAssetType,
  }));
}

function uniqueAgentCandidates(candidates: Array<AgentSymbolCandidate | null | undefined>) {
  const seen = new Set<string>();
  return candidates
    .filter((candidate): candidate is AgentSymbolCandidate => Boolean(candidate))
    .map(candidate => ({
      ...candidate,
      displaySymbol: validateSymbol(candidate.displaySymbol) ?? candidate.displaySymbol.toUpperCase(),
      providerSymbol: validateSymbol(candidate.providerSymbol),
    }))
    .filter((candidate): candidate is AgentSymbolCandidate => Boolean(candidate.providerSymbol))
    .filter(candidate => {
      const key = `${candidate.providerSymbol}:${candidate.providerAssetType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 48);
}

async function resolveAgentSymbolCandidates(rawSymbol: string, assetType: MarketAgentAssetType) {
  const providerAssetType = providerAssetTypeForAgent(assetType);
  const [resolved, directoryResults] = await Promise.all([
    resolveMarketSymbol(rawSymbol, providerAssetType).catch(() => null),
    Promise.resolve(searchBundledMarketSymbols({ query: rawSymbol, assetType: providerAssetType, limit: 12 })),
  ]);
  const normalized = normalizeMarketSymbol(rawSymbol, providerAssetType);
  const resolverItems = resolved
    ? resolved.ok
      ? [resolved.asset, ...resolved.suggestions]
      : resolved.suggestions
    : [];

  return uniqueAgentCandidates([
    ...directoryResults.map(item => candidateFromSearchItem(item, assetType)),
    ...resolverItems.map(item => candidateFromSearchItem(item, assetType)),
    normalized ? candidateFromNormalized(normalized, assetType) : null,
    ...directGlobalStockCandidates(rawSymbol, assetType),
  ]);
}

async function explainAnalysisWithAi(analysis: MarketAgentSuccessResponse, userId?: string | null) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || !userId) return analysis.summaryArabic;

  const usage = await consumeAiUsage({
    userId,
    feature: 'market_agent_explanation',
    metadata: {
      route: '/api/market-agent/analyze',
      symbol: analysis.symbol,
      assetType: analysis.assetType,
      timeframe: analysis.timeframe,
    },
  });
  if (!usage.allowed) return analysis.summaryArabic;

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
            'Avoid exaggerated wording such as Ù…Ø¶Ù…ÙˆÙ†ØŒ Ø£ÙƒÙŠØ¯ØŒ ÙØ±ØµØ© Ù„Ø§ ØªØ¹ÙˆØ¶ØŒ Ø§Ø±Ø¨Ø­ Ø§Ù„Ø¢Ù†, guaranteed, risk-free.',
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
  const token = bearerToken(request);
  const user = token ? await getUserFromBearerToken(token) : null;
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
      source: 'yahoo',
      updatedAt: new Date().toISOString(),
    }, 'INVALID_SYMBOL'), { status: 400 });
  }

  const candidates = await resolveAgentSymbolCandidates(rawSymbol, assetType);
  if (candidates.length === 0) {
    return json(insufficientMarketAgentData({
      symbol: displayInput || rawSymbol,
      assetType,
      timeframe,
      source: 'yahoo',
      updatedAt: new Date().toISOString(),
    }, 'INVALID_SYMBOL'), { status: 422 });
  }

  const config = MARKET_AGENT_TIMEFRAME_CONFIG[timeframe];
  let lastSource = 'yahoo';
  let lastCandidate = candidates[0];

  for (const candidate of candidates) {
    lastCandidate = candidate;
    const result = await proxyHistory(candidate.providerSymbol, candidate.providerAssetType, config.period, config.interval);
    lastSource = String((result as Record<string, unknown>).source ?? 'yahoo');
    if (!result.success || !Array.isArray(result.history) || result.history.length === 0) continue;

    const rawPoints = normalizeMarketAgentPoints(result.history);
    const normalizedCurrency = normalizeMarketAgentCurrencyPoints(rawPoints, {
      symbol: candidate.displaySymbol,
      providerSymbol: candidate.providerSymbol,
      assetType: candidate.providerAssetType,
      providerCurrency: (result as Record<string, unknown>).currency ?? candidate.currency,
    });
    const points = aggregateMarketAgentPoints(normalizedCurrency.points, config.aggregateHours);
    const analysis = analyzeMarketAgentFromHistory({
      symbol: candidate.displaySymbol,
      assetType: candidate.responseAssetType,
      timeframe,
      providerSymbol: candidate.providerSymbol,
      providerAssetType: candidate.providerAssetType,
      currency: normalizedCurrency.currency,
      source: lastSource,
      updatedAt: new Date().toISOString(),
    }, points);

    if (!analysis.ok) continue;

    const summaryArabic = await explainAnalysisWithAi(analysis, user?.id);
    const response = summaryArabic === analysis.summaryArabic ? analysis : { ...analysis, summaryArabic };

    await saveHistory(token, response);
    return json(response);
  }

  return json(insufficientMarketAgentData({
    symbol: lastCandidate?.displaySymbol ?? displayInput,
    assetType: lastCandidate?.responseAssetType ?? assetType,
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
