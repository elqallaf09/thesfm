import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
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
import { intelligenceAssetTypeFromMarket } from '@/lib/intelligence/assetTypes';
import { INTELLIGENCE_RESPONSE_HEADERS, readBoundedJson } from '@/lib/intelligence/api';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { resolveCanonicalIntelligenceAsset } from '@/services/intelligence/assetResolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PROVIDER_TIMEOUT_MS = 8_500;
const MAX_RESPONSE_TOKENS = 1_200;
const DEFAULT_GATEWAY_MODEL = 'anthropic/claude-opus-5';
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

type ChatLocale = 'ar' | 'en' | 'fr';
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type GenerationResult = { text: string; provider: 'vercel-ai-gateway' | 'anthropic' | 'openai'; model: string };

function env(name: string) {
  const value = process.env[name]?.trim();
  return value || null;
}

function unavailableResponse(locale: ChatLocale) {
  if (locale === 'ar') return 'تعذر الوصول إلى مزود الذكاء الآن. حاول إعادة الإرسال بعد لحظات.';
  if (locale === 'fr') return 'Le fournisseur d’IA est momentanément inaccessible. Veuillez réessayer dans quelques instants.';
  return 'The AI provider is temporarily unreachable. Please try sending your message again shortly.';
}

function errorResponse(status: number, code: string, correlationId: string, text?: string) {
  return NextResponse.json({ ok: false, error: { code }, correlationId, ...(text ? { text } : {}) }, {
    status,
    headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId },
  });
}

async function withProviderTimeout<T>(task: Promise<T>) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutTask = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('AI_PROVIDER_TIMEOUT')), PROVIDER_TIMEOUT_MS);
    timeout.unref?.();
  });
  try {
    return await Promise.race([task, timeoutTask]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function safeProviderError(error: unknown) {
  if (!error || typeof error !== 'object') return { name: 'UnknownError' };
  const record = error as Record<string, unknown>;
  const nested = record.error && typeof record.error === 'object' ? record.error as Record<string, unknown> : {};
  return {
    name: typeof record.name === 'string' ? record.name : 'Error',
    status: typeof record.status === 'number' ? record.status : undefined,
    code: typeof record.code === 'string'
      ? record.code
      : typeof nested.code === 'string'
        ? nested.code
        : record.message === 'AI_PROVIDER_TIMEOUT'
          ? 'AI_PROVIDER_TIMEOUT'
          : undefined,
    type: typeof record.type === 'string' ? record.type : typeof nested.type === 'string' ? nested.type : undefined,
  };
}

function logProviderFailure(input: { correlationId: string; provider: string; model: string; error: unknown }) {
  console.warn('[intelligence-chat] provider attempt failed', {
    correlationId: input.correlationId,
    provider: input.provider,
    model: input.model,
    ...safeProviderError(input.error),
  });
}

async function generateAssistantReply(input: {
  system: string;
  messages: ChatMessage[];
  correlationId: string;
}): Promise<GenerationResult | null> {
  // Vercel AI Gateway is the preferred path. AI_GATEWAY_API_KEY is the current
  // variable name; AI_GATEWAY_TOKEN remains supported so existing deployments
  // continue working while credentials are migrated.
  const gatewayKey = env('AI_GATEWAY_API_KEY') ?? env('AI_GATEWAY_TOKEN');
  if (gatewayKey) {
    const model = env('AI_ASSISTANT_GATEWAY_MODEL') ?? DEFAULT_GATEWAY_MODEL;
    try {
      const gateway = new OpenAI({ apiKey: gatewayKey, baseURL: 'https://ai-gateway.vercel.sh/v1' });
      const completion = await withProviderTimeout(gateway.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: MAX_RESPONSE_TOKENS,
        messages: [
          { role: 'system', content: input.system },
          ...input.messages.map(message => ({ role: message.role, content: message.content })),
        ],
      }));
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (text) return { text, provider: 'vercel-ai-gateway', model };
      throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
    } catch (error) {
      logProviderFailure({ correlationId: input.correlationId, provider: 'vercel-ai-gateway', model, error });
    }
  }

  // Direct Anthropic is a fully independent fallback. A broken Gateway token,
  // routing incident, or Gateway model outage must not take the assistant down.
  const anthropicKey = env('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    const model = env('AI_ASSISTANT_ANTHROPIC_MODEL') ?? DEFAULT_ANTHROPIC_MODEL;
    try {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      const result = await withProviderTimeout(generateText({
        model: anthropic(model),
        system: input.system,
        messages: input.messages,
        maxTokens: MAX_RESPONSE_TOKENS,
        temperature: 0.2,
      }));
      const text = result.text.trim();
      if (text) return { text, provider: 'anthropic', model };
      throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
    } catch (error) {
      logProviderFailure({ correlationId: input.correlationId, provider: 'anthropic', model, error });
    }
  }

  // OpenAI is the final independent fallback and reuses the deployment's
  // existing server-only key. It is intentionally conservative by default;
  // production can opt into a stronger model with AI_ASSISTANT_OPENAI_MODEL.
  const openAiKey = env('OPENAI_API_KEY');
  if (openAiKey) {
    const model = env('AI_ASSISTANT_OPENAI_MODEL') ?? DEFAULT_OPENAI_MODEL;
    try {
      const openai = new OpenAI({ apiKey: openAiKey });
      const completion = await withProviderTimeout(openai.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: MAX_RESPONSE_TOKENS,
        messages: [
          { role: 'system', content: input.system },
          ...input.messages.map(message => ({ role: message.role, content: message.content })),
        ],
      }));
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (text) return { text, provider: 'openai', model };
      throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
    } catch (error) {
      logProviderFailure({ correlationId: input.correlationId, provider: 'openai', model, error });
    }
  }

  return null;
}

function implicitSymbolCandidate(messages: ChatMessage[]) {
  const latestUserMessage = [...messages].reverse().find(message => message.role === 'user')?.content.trim();
  if (!latestUserMessage || latestUserMessage.length > 24) return null;
  return /^[A-Za-z0-9.^=:_/-]+$/u.test(latestUserMessage) ? latestUserMessage : null;
}

async function resolveChatAsset(input: {
  requestedAsset: { symbol: string; assetType: Parameters<typeof resolveCanonicalIntelligenceAsset>[0]['assetType'] } | null | undefined;
  messages: ChatMessage[];
}) {
  if (input.requestedAsset) {
    try {
      const asset = await resolveCanonicalIntelligenceAsset(input.requestedAsset);
      return { asset, requestedUnresolvedSymbol: false, inferredFromMessage: false };
    } catch {
      return { asset: null, requestedUnresolvedSymbol: true, inferredFromMessage: false };
    }
  }

  const candidate = implicitSymbolCandidate(input.messages);
  if (!candidate) return { asset: null, requestedUnresolvedSymbol: false, inferredFromMessage: false };

  try {
    const resolved = await resolveMarketSymbol(candidate);
    if (!resolved.ok) return { asset: null, requestedUnresolvedSymbol: false, inferredFromMessage: false };
    const assetType = intelligenceAssetTypeFromMarket(resolved.asset.assetType);
    const asset = await resolveCanonicalIntelligenceAsset({ symbol: resolved.asset.symbol, assetType });
    return { asset, requestedUnresolvedSymbol: false, inferredFromMessage: true };
  } catch {
    // A free-form one-word message must never be treated as a broken ticker
    // unless the user explicitly selected an asset. Let the model answer it as
    // normal financial/general terminology instead of forcing clarification.
    return { asset: null, requestedUnresolvedSymbol: false, inferredFromMessage: false };
  }
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
  const resolved = await resolveChatAsset({ requestedAsset, messages });
  const verifiedAsset: VerifiedChatAsset | null = resolved.asset;
  const effectiveDomain = verifiedAsset ? 'market' : domain;

  const usage = await consumeAiUsage({
    userId: user.id,
    feature: 'market_ai_insight',
    metadata: {
      route: '/api/intelligence/chat',
      domain: effectiveDomain,
      analysisId: analysisId ?? null,
      messageCount: messages.length,
      assetResolvedFromMessage: resolved.inferredFromMessage,
    },
  });
  if (!usage.allowed) return aiUsageLimitResponse(usage);

  const system = buildMarketChatSystemPrompt({
    domain: effectiveDomain,
    asset: verifiedAsset,
    requestedUnresolvedSymbol: resolved.requestedUnresolvedSymbol,
    locale,
  });
  const generation = await generateAssistantReply({ system, messages, correlationId });

  if (!generation) {
    return errorResponse(503, 'AI_PROVIDER_UNAVAILABLE', correlationId, unavailableResponse(locale));
  }

  return NextResponse.json({
    ok: true,
    text: generation.text,
    source: 'ai',
    provider: generation.provider,
    model: generation.model,
    domain: effectiveDomain,
    asset: verifiedAsset,
    assetResolvedFromMessage: resolved.inferredFromMessage,
    correlationId,
  }, { headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId } });
}
