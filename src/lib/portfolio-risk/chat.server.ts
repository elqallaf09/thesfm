import 'server-only';
import { NextResponse } from 'next/server';
import { loadCurrentRiskForRequest } from './service.server';
import { currentRiskText, riskUnavailableText } from './advisor';
import type { RiskLocale } from './current';

/** Deterministic grounded answer: never ask a language model to invent missing metrics. */
export async function portfolioRiskChatResponse(request: Request, locale: RiskLocale, correlationId: string) {
  const result = await loadCurrentRiskForRequest(request);
  return NextResponse.json({
    ok: result.ok,
    text: result.ok ? currentRiskText(result.snapshot, locale) : riskUnavailableText(result.code, locale),
    source: 'portfolio-risk', provider: 'deterministic', model: null,
    portfolioRisk: result.ok ? result.snapshot : null,
    ...(result.ok ? {} : { error: { code: result.code } }),
    correlationId,
  }, {
    status: result.ok ? 200 : result.status,
    headers: {
      'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization',
      'X-Content-Type-Options': 'nosniff', 'X-Correlation-ID': correlationId,
      ...(!result.ok && result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
    },
  });
}
