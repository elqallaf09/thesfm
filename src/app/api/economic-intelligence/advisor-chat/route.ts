import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { z } from 'zod';
import { loadAdvisorGrounding } from '@/domain/economic-intelligence/advisors.server';
import { buildEconomicAdvisorPrompt } from '@/lib/ai-analyst/economicAdvisorPrompt';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const NO_STORE = { 'cache-control': 'private, no-store' };

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4_000),
}).strict();

const requestSchema = z.object({
  advisor: z.enum(['finance', 'investment', 'business']),
  messages: z.array(messageSchema).min(1).max(40),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  country: z.string().trim().min(2).max(64).regex(/^[\p{L}\s.-]+$/u).optional(),
  locale: z.enum(['ar', 'en', 'fr']).default('ar'),
}).strict();

function provider() {
  const gatewayToken = process.env.AI_GATEWAY_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (gatewayToken) return createAnthropic({ apiKey: gatewayToken, baseURL: 'https://ai-gateway.vercel.sh/v1/anthropic' });
  return anthropicKey ? createAnthropic({ apiKey: anthropicKey }) : null;
}

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

  const ai = provider();
  if (!ai) {
    return NextResponse.json({
      ok: true,
      text: unavailable(locale),
      source: 'unavailable',
      advisor,
      confidence: grounding.confidence,
      missing: grounding.missing,
      correlationId,
    }, { headers: NO_STORE });
  }

  const usage = await consumeAiUsage({
    userId: user.id,
    feature: advisor === 'business' ? 'project_ai_advisor' : 'market_ai_insight',
    metadata: {
      route: '/api/economic-intelligence/advisor-chat',
      advisor,
      messageCount: messages.length,
      groundingConfidence: grounding.confidence,
    },
  });
  if (!usage.allowed) return aiUsageLimitResponse(usage);

  try {
    const { text } = await generateText({
      model: ai('claude-haiku-4-5-20251001'),
      system: buildEconomicAdvisorPrompt(grounding, locale),
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      maxTokens: 900,
    });

    return NextResponse.json({
      ok: true,
      text,
      source: 'ai',
      advisor,
      confidence: grounding.confidence,
      missing: grounding.missing,
      warnings: grounding.warnings,
      correlationId,
    }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({
      ok: true,
      text: unavailable(locale),
      source: 'error',
      advisor,
      confidence: grounding.confidence,
      missing: grounding.missing,
      correlationId,
    }, { headers: NO_STORE });
  }
}
