import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { MarketAnalysis, MarketAiInsight } from '@/lib/market/marketService';

const AI_TIMEOUT_MS = 10000;
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

type AiInsightFailureCode =
  | 'AI_PROVIDER_NOT_CONFIGURED'
  | 'MARKET_DATA_REQUIRED'
  | 'AI_PROVIDER_AUTH_FAILED'
  | 'AI_PROVIDER_RATE_LIMITED'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_BAD_REQUEST'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_INSIGHT_INTERNAL_ERROR';

type OpenAiErrorLike = {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
  type?: string;
};

function isRealMarketAnalysis(value: unknown): value is MarketAnalysis {
  const data = value && typeof value === 'object' ? value as Partial<MarketAnalysis> : {};
  return Boolean(
    data.success === true
    && data.source === 'openbb'
    && data.fallback !== true
    && Number.isFinite(data.latestPrice)
    && Number(data.latestPrice) > 0
    && Array.isArray(data.history)
    && data.history.length > 0,
  );
}

function statusForFailure(code: AiInsightFailureCode) {
  const statusMap: Record<AiInsightFailureCode, number> = {
    AI_PROVIDER_NOT_CONFIGURED: 200,
    MARKET_DATA_REQUIRED: 400,
    AI_PROVIDER_AUTH_FAILED: 401,
    AI_PROVIDER_RATE_LIMITED: 429,
    AI_PROVIDER_TIMEOUT: 504,
    AI_PROVIDER_BAD_REQUEST: 400,
    AI_PROVIDER_UNAVAILABLE: 503,
    AI_INSIGHT_INTERNAL_ERROR: 500,
  };
  return statusMap[code];
}

function failureResponse(code: AiInsightFailureCode) {
  return NextResponse.json({
    ok: false,
    success: false,
    code,
    insight: null,
    updated_at: null,
  }, { status: statusForFailure(code) });
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function safeErrorInfo(error: unknown): OpenAiErrorLike {
  if (!error || typeof error !== 'object') return {};
  const record = error as Record<string, unknown>;
  return {
    name: typeof record.name === 'string' ? record.name : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
  };
}

function mapOpenAiError(error: unknown): AiInsightFailureCode {
  if (isTimeoutError(error)) return 'AI_PROVIDER_TIMEOUT';
  const info = safeErrorInfo(error);
  if (info.status === 401 || info.status === 403) return 'AI_PROVIDER_AUTH_FAILED';
  if (info.status === 429) return 'AI_PROVIDER_RATE_LIMITED';
  if (info.status === 400) return 'AI_PROVIDER_BAD_REQUEST';
  if (typeof info.status === 'number' && info.status >= 500) return 'AI_PROVIDER_UNAVAILABLE';
  if (info.code === 'model_not_found' || info.type === 'invalid_request_error') return 'AI_PROVIDER_BAD_REQUEST';
  return 'AI_INSIGHT_INTERNAL_ERROR';
}

function parseProviderJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const marketData = body?.marketData;
  const language = body?.language === 'en' || body?.language === 'fr' || body?.language === 'ar' ? body.language : 'ar';
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

  if (process.env.NODE_ENV !== 'production') {
    console.log('AI insight env check:', {
      hasOpenAIKey,
      nodeEnv: process.env.NODE_ENV,
    });
  }

  if (!isRealMarketAnalysis(marketData)) {
    return failureResponse('MARKET_DATA_REQUIRED');
  }

  if (!hasOpenAIKey) {
    return failureResponse('AI_PROVIDER_NOT_CONFIGURED');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      max_tokens: 650,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are THE SFM market analysis assistant.',
            'Use only the supplied real market JSON.',
            'Do not invent prices, news, fundamentals, or events.',
            'Do not give buy, sell, hold, guaranteed return, or personalized investment advice.',
            `Write in this language only: ${language}.`,
            'Return strict JSON only with: summary, trendStatus, riskNotes, watchNext array, riskScore number 0-100.',
            'Keep summary, trendStatus, and riskNotes concise. watchNext must contain 2 to 4 short educational monitoring points.',
            'Mention data limitations when fundamentals, news, or other fields are missing.',
            'Frame everything as educational analysis, not investment advice.',
          ].join(' '),
        },
        {
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
        },
      ],
    }, { signal: controller.signal });

    const text = completion.choices?.[0]?.message?.content;
    const parsed = typeof text === 'string' ? parseProviderJson(text) : null;
    if (!parsed || typeof parsed !== 'object') {
      return failureResponse('AI_INSIGHT_INTERNAL_ERROR');
    }
    const insight: MarketAiInsight & { riskScore?: number } = {
      status: 'ready',
      provider: 'openai',
      summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
      trendStatus: typeof parsed.trendStatus === 'string' ? parsed.trendStatus : undefined,
      riskNotes: typeof parsed.riskNotes === 'string' ? parsed.riskNotes : undefined,
      watchNext: Array.isArray(parsed.watchNext) ? parsed.watchNext.map(String).slice(0, 4) : undefined,
      riskScore: Number.isFinite(Number(parsed.riskScore)) ? Math.max(0, Math.min(100, Number(parsed.riskScore))) : undefined,
    };

    return NextResponse.json({
      ok: true,
      success: true,
      code: 'AI_INSIGHT_READY',
      insight,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[market-ai-insight] request failed', error instanceof Error ? error.message : error);
    }
    console.error('AI insight route error:', safeErrorInfo(error));
    return failureResponse(mapOpenAiError(error));
  } finally {
    clearTimeout(timeout);
  }
}
