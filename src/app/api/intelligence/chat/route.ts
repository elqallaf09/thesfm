import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { intelligenceChatInputSchema } from '@/domain/intelligence/schemas';
import {
  ChatDomainMismatchError,
  MARKET_CHAT_DOMAINS,
  assertChatDomain,
  buildMarketChatSystemPrompt,
  type VerifiedChatAsset,
} from '@/lib/ai-analyst/marketChat';
import { INTELLIGENCE_RESPONSE_HEADERS, readBoundedJson } from '@/lib/intelligence/api';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { resolveCanonicalIntelligenceAsset } from '@/services/intelligence/assetResolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const getProvider = () => {
  const gatewayToken = process.env.AI_GATEWAY_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (gatewayToken) {
    return createAnthropic({ apiKey: gatewayToken, baseURL: 'https://ai-gateway.vercel.sh/v1/anthropic' });
  }
  return anthropicKey ? createAnthropic({ apiKey: anthropicKey }) : null;
};

function unavailableResponse(locale: 'ar' | 'en' | 'fr') {
  if (locale === 'ar') return 'الخدمة غير متاحة حالياً. حاول مرة أخرى بعد قليل.';
  if (locale === 'fr') return 'Le service est indisponible pour l’instant. Veuillez réessayer dans quelques instants.';
  return 'The service is unavailable right now. Please try again shortly.';
}

function errorResponse(status: number, code: string, correlationId: string) {
  return NextResponse.json({ ok: false, error: { code }, correlationId }, {
    status,
    headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId },
  });
}

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();

  let body: unknown;
  try {
    body = await readBoundedJson(request, 32_768);
  } catch {
    return errorResponse(400, 'INVALID_REQUEST', correlationId);
  }

  const parsed = intelligenceChatInputSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, 'INVALID_REQUEST', correlationId);

  // Fail closed: this endpoint only ever serves market/finance conversations.
  // A caller that mistakenly (or maliciously) sends domain: "projects" is
  // rejected here, before any system prompt is built or any AI call is made
  // — it must never silently answer as if it were the projects assistant.
  try {
    assertChatDomain(parsed.data.domain, MARKET_CHAT_DOMAINS);
  } catch (error) {
    if (error instanceof ChatDomainMismatchError) return errorResponse(400, 'DOMAIN_MISMATCH', correlationId);
    throw error;
  }

  const user = await getCurrentUserFromRequest(request).catch(() => null);
  if (!user) return errorResponse(401, 'UNAUTHENTICATED', correlationId);

  const identity = `user:${user.id}`;
  const limit = checkRateLimitWithMetadata(identity, { max: 20, windowMs: 60_000, prefix: 'intelligence-chat' });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false, error: { code: 'APPLICATION_RATE_LIMITED' }, correlationId }, {
      status: 429,
      headers: {
        ...INTELLIGENCE_RESPONSE_HEADERS,
        'X-Correlation-ID': correlationId,
        'Retry-After': String(Math.max(1, limit.retryAfterSeconds ?? 60)),
      },
    });
  }

  const { domain, messages, asset: requestedAsset, locale, analysisId } = parsed.data;

  let verifiedAsset: VerifiedChatAsset | null = null;
  let requestedUnresolvedSymbol = false;
  if (requestedAsset) {
    try {
      const resolved = await resolveCanonicalIntelligenceAsset({ symbol: requestedAsset.symbol, assetType: requestedAsset.assetType });
      verifiedAsset = resolved;
    } catch {
      // Never guess: an unresolved symbol is surfaced to the model as an
      // explicit instruction to ask for clarification, not silently dropped
      // or replaced by an invented identity.
      requestedUnresolvedSymbol = true;
    }
  }

  const anthropic = getProvider();
  if (!anthropic) {
    return NextResponse.json({
      ok: true,
      text: unavailableResponse(locale),
      source: 'unavailable',
      domain,
      asset: verifiedAsset,
      correlationId,
    }, { headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId } });
  }

  const usage = await consumeAiUsage({
    userId: user.id,
    feature: 'market_ai_insight',
    metadata: { route: '/api/intelligence/chat', domain, analysisId: analysisId ?? null, messageCount: messages.length },
  });
  if (!usage.allowed) return aiUsageLimitResponse(usage);

  try {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: buildMarketChatSystemPrompt({
        domain,
        asset: verifiedAsset,
        requestedUnresolvedSymbol,
        locale,
      }),
      messages: messages.map(message => ({ role: message.role, content: message.content })),
      maxTokens: 800,
    });

    return NextResponse.json({
      ok: true,
      text,
      source: 'ai',
      domain,
      asset: verifiedAsset,
      correlationId,
    }, { headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId } });
  } catch {
    return NextResponse.json({
      ok: true,
      text: unavailableResponse(locale),
      source: 'error',
      domain,
      asset: verifiedAsset,
      correlationId,
    }, { headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId } });
  }
}
