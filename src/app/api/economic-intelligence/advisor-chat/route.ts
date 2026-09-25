import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { aiProviderConfigured, generateAssistantReply } from '@/lib/server/aiProvider';
import { z } from 'zod';
import { advisorRequestSchema } from '@/domain/economic-intelligence/advisorCapabilities';
import { loadCapabilityReport } from '@/domain/economic-intelligence/advisorCapabilities.server';
import { loadAdvisorGrounding } from '@/domain/economic-intelligence/advisors.server';
import { buildEconomicAdvisorPrompt } from '@/lib/ai-analyst/economicAdvisorPrompt';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NO_STORE = { 'cache-control': 'private, no-store' };

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4_000),
}).strict();

const requestSchema = z.object({
  advisor: z.enum(['finance', 'investment', 'business']),
  plan: advisorRequestSchema.omit({ save: true }).optional(),
  messages: z.array(messageSchema).min(1).max(40),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  country: z.string().trim().min(2).max(64).regex(/^[\p{L}\s.-]+$/u).optional(),
  locale: z.enum(['ar', 'en', 'fr']).default('ar'),
}).strict();

function unavailable(locale: 'ar' | 'en' | 'fr') {
  if (locale === 'ar') return 'المستشار غير متاح حالياً. حاول مرة أخرى بعد قليل.';
  if (locale === 'fr') return 'Le conseiller est indisponible pour le moment. Veuillez réessayer plus tard.';
  return 'The advisor is unavailable right now. Please try again shortly.';
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: { code: 'UNAUTHENTICATED' }, correlationId }, { status: 401, headers: NO_STORE });

  const limit = checkRateLimitWithMetadata(`user:${user.id}`, {
    max: 20,
    windowMs: 60_000,
    prefix: 'economic-intelligence-advisor-chat',
  });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' }, correlationId }, {
      status: 429,
      headers: { ...NO_STORE, 'Retry-After': String(Math.max(1, limit.retryAfterSeconds ?? 60)) },
    });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: { code: 'INVALID_REQUEST' }, correlationId }, { status: 400, headers: NO_STORE });

  const { advisor, messages, currency, country, locale } = parsed.data;
  if (parsed.data.plan && parsed.data.plan.currency !== currency) return NextResponse.json({ ok: false, error: { code: 'INVALID_REQUEST' }, correlationId }, { status: 400, headers: NO_STORE });
  let grounding;
  try {
    grounding = await loadAdvisorGrounding({
      userId: user.id,
      advisor,
      currency,
      country,
      hasMarketEvidence: false,
    });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'GROUNDING_UNAVAILABLE' }, correlationId }, { status: 502, headers: NO_STORE });
  }

  if (!aiProviderConfigured()) {
    return NextResponse.json({
      ok: false,
      error: { code: 'AI_PROVIDER_NOT_CONFIGURED' },
      text: unavailable(locale),
      source: 'unavailable',
      advisor,
      confidence: grounding.confidence,
      missing: grounding.missing,
      correlationId,
    }, { status: 503, headers: NO_STORE });
  }

  let planContext = '';
  if (parsed.data.plan) {
    try {
      const report = await loadCapabilityReport(user.id, { ...parsed.data.plan, save: false });
      planContext = `\nThe following server-calculated capability report is authoritative over aggregate grounding for this month. Explain this task only. Values are recorded evidence and fixed-assumption simulations; never invent missing inputs or probability/confidence scores. Report: ${JSON.stringify(report)}`;
    } catch {
      return NextResponse.json({ ok: false, error: { code: 'GROUNDING_UNAVAILABLE' }, correlationId }, { status: 503, headers: NO_STORE });
    }
  }
  let usage;
  try {
    usage = await consumeAiUsage({
    userId: user.id,
    feature: advisor === 'business' ? 'project_ai_advisor' : 'market_ai_insight',
    metadata: {
      route: '/api/economic-intelligence/advisor-chat',
      advisor,
      messageCount: messages.length,
      groundingConfidence: grounding.confidence,
    },
    });
  } catch {
    return NextResponse.json({ ok: false, error: { code: 'AI_USAGE_UNAVAILABLE' }, correlationId }, { status: 503, headers: NO_STORE });
  }
  if (!usage.allowed) {
    const response = aiUsageLimitResponse(usage);
    response.headers.set('cache-control', 'private, no-store');
    return response;
  }

  const generation = await generateAssistantReply({
    system: buildEconomicAdvisorPrompt(grounding, locale) + planContext,
    messages: messages.map(message => ({ role: message.role, content: message.content })),
    correlationId,
    maxTokens: 900,
  });
  if (!generation) {
    return NextResponse.json({
      ok: false, error: { code: 'AI_PROVIDER_UNAVAILABLE' }, text: unavailable(locale),
      source: 'unavailable', advisor, correlationId,
    }, { status: 503, headers: { ...NO_STORE, 'X-Correlation-ID': correlationId } });
  }
  return NextResponse.json({
    ok: true, text: generation.text, source: 'ai', provider: generation.provider, model: generation.model,
    advisor, confidence: grounding.confidence, missing: grounding.missing, warnings: grounding.warnings, correlationId,
  }, { headers: { ...NO_STORE, 'X-Correlation-ID': correlationId } });
}
