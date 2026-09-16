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
// Three bounded provider attempts may take 25.5s. Leave room for verified
// identity, authentication and quota storage rather than a platform 30s kill.
export const maxDuration = 60;

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

async function withProviderTimeout<T>(task: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutTask = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error('AI_PROVIDER_TIMEOUT');
      reject(error);
      // A Promise.race alone leaves the billable SDK request/retries running.
      // Cancel the actual transport before moving to an independent provider.
      controller.abort(error);
    }, PROVIDER_TIMEOUT_MS);
    timeout.unref?.();
  });
  try {
    return await Promise.race([Promise.resolve().then(() => task(controller.signal)), timeoutTask]);
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
    status: typeof record.status === 'number' ? record.status : typeof record.statusCode === 'number' ? record.statusCode : undefined,
    code: typeof record.code === 'string'
      ? record.code
      : typeof nested.code === 'string'
        ? nested.code
        : record.message === 'AI_PROVIDER_TIMEOUT'
          ? 'AI_PROVIDER_TIMEOUT'
          : record.message === 'AI_PROVIDER_EMPTY_RESPONSE'
            ? 'AI_PROVIDER_EMPTY_RESPONSE'
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
  const gatewayKey = env('AI_GATEWAY_API_KEY') ?? env('AI_GATEWAY_TOKEN');
  if (gatewayKey) {
    const model = env('AI_ASSISTANT_GATEWAY_MODEL') ?? DEFAULT_GATEWAY_MODEL;
    try {
      const gateway = new OpenAI({ apiKey: gatewayKey, baseURL: 'https://ai-gateway.vercel.sh/v1', maxRetries: 0, timeout: PROVIDER_TIMEOUT_MS });
      const completion = await withProviderTimeout(signal => gateway.chat.completions.create({
        model,
        // Leave sampling at the model default: reasoning models can reject
        // a forced temperature even when the Gateway endpoint is correct.
        max_tokens: MAX_RESPONSE_TOKENS,
        messages: [
          { role: 'system', content: input.system },
          ...input.messages.map(message => ({ role: message.role, content: message.content })),
        ],
      }, { signal }));
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (text) return { text, provider: 'vercel-ai-gateway', model };
      throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
    } catch (error) {
      logProviderFailure({ correlationId: input.correlationId, provider: 'vercel-ai-gateway', model, error });
    }
  }

  const anthropicKey = env('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    const model = env('AI_ASSISTANT_ANTHROPIC_MODEL') ?? DEFAULT_ANTHROPIC_MODEL;
    try {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      const result = await withProviderTimeout(signal => generateText({
        model: anthropic(model),
        system: input.system,
        messages: input.messages,
        maxTokens: MAX_RESPONSE_TOKENS,
        maxRetries: 0,
        abortSignal: signal,
      }));
      const text = result.text.trim();
      if (text) return { text, provider: 'anthropic', model };
      throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
    } catch (error) {
      logProviderFailure({ correlationId: input.correlationId, provider: 'anthropic', model, error });
    }
  }

  const openAiKey = env('OPENAI_API_KEY');
  if (openAiKey) {
    const model = env('AI_ASSISTANT_OPENAI_MODEL') ?? DEFAULT_OPENAI_MODEL;
    try {
      const openai = new OpenAI({ apiKey: openAiKey, maxRetries: 0, timeout: PROVIDER_TIMEOUT_MS });
      const completion = await withProviderTimeout(signal => openai.chat.completions.create({
        model,
        max_tokens: MAX_RESPONSE_TOKENS,
        messages: [
          { role: 'system', content: input.system },
          ...input.messages.map(message => ({ role: message.role, content: message.content })),
        ],
      }, { signal }));
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
    // Free-form words are not classified as tickers without resolver evidence.
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
  // Missing server configuration is not a user's AI usage. Check it before
  // external identity lookup and before consuming the account allowance.
  if (!['AI_GATEWAY_API_KEY', 'AI_GATEWAY_TOKEN', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY'].some(name => env(name))) {
    return errorResponse(503, 'AI_PROVIDER_NOT_CONFIGURED', correlationId, unavailableResponse(locale));
  }
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
