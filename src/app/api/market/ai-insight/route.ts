import { NextRequest, NextResponse } from 'next/server';
import type { MarketAnalysis, MarketAiInsight } from '@/lib/market/marketService';

const AI_TIMEOUT_MS = 28000;

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

function fallbackUnavailable(error: string): MarketAiInsight {
  return { status: 'unavailable', provider: 'anthropic', error };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const marketData = body?.marketData;

  if (!isRealMarketAnalysis(marketData)) {
    return NextResponse.json({
      success: false,
      insight: { status: 'skipped', error: 'Real market data is required before AI analysis.' },
      error: 'Real market data is required before AI analysis.',
    }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      success: false,
      insight: fallbackUnavailable('ANTHROPIC_API_KEY is not configured.'),
      error: 'AI provider is not configured.',
    }, { status: 503 });
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
          'Return strict JSON only with: summary, trendStatus, riskNotes, watchNext array, riskScore number 0-100.',
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
            disclaimer: 'Educational only, not investment advice.',
          }),
        }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        insight: fallbackUnavailable(`Anthropic returned ${response.status}.`),
        error: 'AI analysis is unavailable right now.',
      }, { status: 503 });
    }

    const payload = await response.json();
    const text = payload?.content?.find?.((item: { type?: string; text?: string }) => item.type === 'text')?.text;
    const parsed = typeof text === 'string' ? JSON.parse(text) : {};
    const insight: MarketAiInsight & { riskScore?: number } = {
      status: 'ready',
      provider: 'anthropic',
      summary: typeof parsed.summary === 'string' ? parsed.summary : undefined,
      trendStatus: typeof parsed.trendStatus === 'string' ? parsed.trendStatus : undefined,
      riskNotes: typeof parsed.riskNotes === 'string' ? parsed.riskNotes : undefined,
      watchNext: Array.isArray(parsed.watchNext) ? parsed.watchNext.map(String).slice(0, 4) : undefined,
      riskScore: Number.isFinite(Number(parsed.riskScore)) ? Math.max(0, Math.min(100, Number(parsed.riskScore))) : undefined,
    };

    return NextResponse.json({ success: true, insight });
  } catch (error) {
    return NextResponse.json({
      success: false,
      insight: fallbackUnavailable(error instanceof Error && error.name === 'AbortError' ? 'AI analysis timed out.' : 'AI analysis failed.'),
      error: 'AI analysis is unavailable right now.',
    }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
