import { NextRequest, NextResponse } from 'next/server';
import type { MarketAnalysis, MarketAiInsight } from '@/lib/market/marketService';

const AI_TIMEOUT_MS = 10000;
type AiInsightFailureCode =
  | 'AI_PROVIDER_NOT_CONFIGURED'
  | 'MARKET_DATA_REQUIRED'
  | 'AI_INSIGHT_TIMEOUT'
  | 'AI_PROVIDER_UNAVAILABLE';

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

function failureResponse(code: AiInsightFailureCode) {
  return NextResponse.json({
    ok: false,
    success: false,
    code,
    insight: null,
    updated_at: null,
  }, { status: 200 });
}

function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
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

  if (!isRealMarketAnalysis(marketData)) {
    return failureResponse('MARKET_DATA_REQUIRED');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return failureResponse('AI_PROVIDER_NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MARKET_MODEL || 'claude-3-5-haiku-latest',
        max_tokens: 650,
        temperature: 0.2,
        system: [
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
      }),
    });

    if (!response.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[market-ai-insight] provider unavailable', { status: response.status });
      }
      return failureResponse('AI_PROVIDER_UNAVAILABLE');
    }

    const payload = await response.json();
    const text = payload?.content?.find?.((item: { type?: string; text?: string }) => item.type === 'text')?.text;
    const parsed = typeof text === 'string' ? parseProviderJson(text) : null;
    if (!parsed || typeof parsed !== 'object') {
      return failureResponse('AI_PROVIDER_UNAVAILABLE');
    }
    const insight: MarketAiInsight & { riskScore?: number } = {
      status: 'ready',
      provider: 'anthropic',
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
    return failureResponse(isTimeoutError(error) ? 'AI_INSIGHT_TIMEOUT' : 'AI_PROVIDER_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
}
