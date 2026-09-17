import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { MarketAnalysis, MarketAiInsight } from '@/lib/market/marketService';
import { getUserFromBearerToken } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';
import { aiProviderConfigured, generateAssistantReply } from '@/lib/server/aiProvider';

type AiInsightFailureCode =
  | 'AI_PROVIDER_NOT_CONFIGURED'
  | 'MARKET_DATA_REQUIRED'
  | 'UNAUTHORIZED'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_INSIGHT_INTERNAL_ERROR';

function bearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;
}

function isRealMarketAnalysis(value: unknown): value is MarketAnalysis {
  const data = value && typeof value === 'object' ? value as Partial<MarketAnalysis> : {};
  const source = String(data.source ?? data.provider ?? '').trim().toLowerCase();
  const isSupportedRealSource = source === 'yahoo' || source === 'yahoo finance';
  return Boolean(
    data.success === true
    && isSupportedRealSource
    && data.fallback !== true
    && Number.isFinite(data.latestPrice)
    && Number(data.latestPrice) > 0
    && Array.isArray(data.history)
    && data.history.length > 0,
  );
}

function statusForFailure(code: AiInsightFailureCode) {
  const statusMap: Record<AiInsightFailureCode, number> = {
    AI_PROVIDER_NOT_CONFIGURED: 503,
    MARKET_DATA_REQUIRED: 400,
    UNAUTHORIZED: 401,
    AI_PROVIDER_UNAVAILABLE: 503,
    AI_INSIGHT_INTERNAL_ERROR: 500,
  };
  return statusMap[code];
}

function failureResponse(code: AiInsightFailureCode, correlationId: string) {
  return NextResponse.json({
    ok: false,
    success: false,
    code,
    insight: null,
    updated_at: null,
    correlationId,
  }, {
    status: statusForFailure(code),
    headers: { 'Cache-Control': 'private, no-store', 'X-Correlation-ID': correlationId },
  });
}

function parseProviderJson(text: string) {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced) candidates.push(fenced);
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Try the next safe JSON candidate. Never infer missing market facts.
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  const token = bearerToken(request);
  const user = await getUserFromBearerToken(token);
  if (!user) return failureResponse('UNAUTHORIZED', correlationId);

  const body = await request.json().catch(() => ({}));
  const marketData = body?.marketData;
  const language = body?.language === 'en' || body?.language === 'fr' || body?.language === 'ar' ? body.language : 'ar';

  if (!isRealMarketAnalysis(marketData)) return failureResponse('MARKET_DATA_REQUIRED', correlationId);
  if (!aiProviderConfigured()) return failureResponse('AI_PROVIDER_NOT_CONFIGURED', correlationId);

  const usage = await consumeAiUsage({
    userId: user.id,
    feature: 'market_ai_insight',
    metadata: {
      route: '/api/market/ai-insight',
      symbol: marketData.symbol,
      assetType: marketData.assetType,
      language,
      provider: 'sfm-private-ai',
    },
  });
  if (!usage.allowed) return aiUsageLimitResponse(usage);

  const generation = await generateAssistantReply({
    correlationId,
    maxTokens: 650,
    system: [
      'You are THE SFM market analysis assistant running on SFM Private AI.',
      'Use only the supplied real market JSON.',
      'Do not invent prices, news, fundamentals, events, causes, or missing fields.',
      'Do not give buy, sell, hold, guaranteed return, or personalized investment advice.',
      `Write in this language only: ${language}.`,
      'Return strict JSON only with exactly: summary, trendStatus, riskNotes, watchNext, riskScore.',
      'watchNext must contain 2 to 4 short educational monitoring points.',
      'riskScore must be a number from 0 to 100 and must reflect only supplied evidence.',
      'Mention data limitations when fundamentals, news, or other fields are missing.',
      'Frame everything as educational analysis, not investment advice.',
    ].join(' '),
    messages: [{
      role: 'user',
      content: JSON.stringify({
        symbol: marketData.symbol,
        name: marketData.name,
        assetType: marketData.assetType,
        currency: marketData.currency,
        quote: marketData.quote,
        trend: marketData.trend,
        riskLevel: marketData.riskLevel,
        indicators: marketData.indicators,
        levels: marketData.levels,
        historyTail: marketData.history.slice(-30),
        language,
        disclaimer: 'Educational only, not investment advice.',
      }),
    }],
  });

  if (!generation) return failureResponse('AI_PROVIDER_UNAVAILABLE', correlationId);
  const parsed = parseProviderJson(generation.text);
  if (!parsed) return failureResponse('AI_INSIGHT_INTERNAL_ERROR', correlationId);

  const watchNext = Array.isArray(parsed.watchNext)
    ? parsed.watchNext.filter(item => typeof item === 'string' && item.trim()).map(String).slice(0, 4)
    : undefined;
  const riskScore = Number(parsed.riskScore);
  const insight: MarketAiInsight & { riskScore?: number } = {
    status: 'ready',
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : undefined,
    trendStatus: typeof parsed.trendStatus === 'string' ? parsed.trendStatus.trim() : undefined,
    riskNotes: typeof parsed.riskNotes === 'string' ? parsed.riskNotes.trim() : undefined,
    watchNext,
    riskScore: Number.isFinite(riskScore) ? Math.max(0, Math.min(100, riskScore)) : undefined,
  };

  return NextResponse.json({
    ok: true,
    success: true,
    code: 'AI_INSIGHT_READY',
    insight,
    provider: generation.provider,
    model: generation.model,
    updated_at: new Date().toISOString(),
    correlationId,
  }, {
    headers: { 'Cache-Control': 'private, no-store', 'X-Correlation-ID': correlationId },
  });
}
