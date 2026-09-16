import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { CanonicalAssetIdentity } from '@/domain/intelligence/contracts';
import { aiProviderConfigured, generateAssistantReply, type ChatMessage } from '@/lib/server/aiProvider';
import { loadAdvisorGrounding } from '@/domain/economic-intelligence/advisors.server';
import { intelligenceChatInputSchema } from '@/domain/intelligence/schemas';
import { buildEconomicAdvisorPrompt } from '@/lib/ai-analyst/economicAdvisorPrompt';
import { implicitMarketAssetCandidates } from '@/lib/ai-analyst/marketAssetCandidate';
import {
  ChatDomainMismatchError,
  MARKET_CHAT_DOMAINS,
  assertChatDomain,
  buildMarketChatSystemPrompt,
  type VerifiedChatAsset,
  type VerifiedChatMarketSnapshot,
} from '@/lib/ai-analyst/marketChat';
import { intelligenceAssetTypeFromMarket } from '@/lib/intelligence/assetTypes';
import { INTELLIGENCE_RESPONSE_HEADERS, readBoundedJson } from '@/lib/intelligence/api';
import { resolveMarketSymbol } from '@/lib/market/symbolResolver';
import { getCurrentUserFromRequest } from '@/lib/server/adminAccess';
import { aiUsageLimitResponse, consumeAiUsage } from '@/lib/server/aiUsage';
import { checkRateLimitWithMetadata } from '@/lib/server/rateLimiter';
import { ExistingMarketDataIntelligenceProvider } from '@/providers/intelligence/existingMarketDataProvider';
import { resolveCanonicalIntelligenceAsset } from '@/services/intelligence/assetResolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Two bounded provider paths leave room for verified identity, owner
// grounding and quota storage. No third-party model-vendor credential is used.
export const maxDuration = 60;

type ChatLocale = 'ar' | 'en' | 'fr';

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

  const candidates = implicitMarketAssetCandidates(input.messages);
  if (candidates.length === 0) return { asset: null, requestedUnresolvedSymbol: false, inferredFromMessage: false };

  for (const candidate of candidates) {
    try {
      const resolved = await resolveMarketSymbol(candidate);
      if (!resolved.ok) continue;
      const assetType = intelligenceAssetTypeFromMarket(resolved.asset.assetType);
      const asset = await resolveCanonicalIntelligenceAsset({ symbol: resolved.asset.symbol, assetType });
      return { asset, requestedUnresolvedSymbol: false, inferredFromMessage: true };
    } catch {
      // Candidate text never becomes trusted identity without resolver evidence.
    }
  }

  return { asset: null, requestedUnresolvedSymbol: false, inferredFromMessage: false };
}

async function loadVerifiedMarketSnapshot(input: {
  userId: string;
  asset: CanonicalAssetIdentity;
  locale: ChatLocale;
  correlationId: string;
}): Promise<VerifiedChatMarketSnapshot | null> {
  try {
    const snapshot = await new ExistingMarketDataIntelligenceProvider().getSnapshot({
      userId: input.userId,
      asset: {
        symbol: input.asset.displaySymbol || input.asset.canonicalSymbol,
        assetType: input.asset.assetType,
        exchange: input.asset.exchange,
        market: input.asset.market,
        quoteCurrency: input.asset.quoteCurrency,
      },
      horizon: 'SWING',
      locale: input.locale,
      requestedModules: [],
      providerPreferences: null,
      source: 'INTERNAL',
      correlationId: input.correlationId,
      forceRefresh: false,
    }, input.asset);

    return {
      provider: snapshot.provider,
      dataAsOf: snapshot.dataAsOf,
      dataStatus: snapshot.dataStatus,
      fallbackUsed: snapshot.fallbackUsed,
      price: snapshot.quote.price,
      change: snapshot.quote.change,
      changePercent: snapshot.quote.changePercent,
      volume: snapshot.quote.volume,
      support: snapshot.levels.support,
      resistance: snapshot.levels.resistance,
      reportedRiskLevel: snapshot.reportedRiskLevel,
      currency: snapshot.asset.quoteCurrency,
      shariaStatus: snapshot.sharia.status,
      shariaSource: snapshot.sharia.source,
      shariaReviewedAt: snapshot.sharia.reviewedAt,
    };
  } catch {
    // Chat remains useful with verified identity/general knowledge if live market
    // evidence is unavailable; the system prompt forbids inventing missing facts.
    return null;
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
  if (!aiProviderConfigured()) {
    return errorResponse(503, 'AI_PROVIDER_NOT_CONFIGURED', correlationId, unavailableResponse(locale));
  }
  const resolved = await resolveChatAsset({ requestedAsset, messages });
  const canonicalAsset: CanonicalAssetIdentity | null = resolved.asset;
  const verifiedAsset: VerifiedChatAsset | null = canonicalAsset;
  const effectiveDomain = verifiedAsset ? 'market' : domain;

  // Preserve the economic-intelligence grounding added on main, scoped to
  // this authenticated owner and finance only, never an inferred stock chat.
  let advisorPrompt = '';
  let advisorGrounded = false;
  if (effectiveDomain === 'finance') {
    try {
      const grounding = await loadAdvisorGrounding({ userId: user.id, advisor: 'finance' });
      advisorPrompt = buildEconomicAdvisorPrompt(grounding, locale);
      advisorGrounded = true;
    } catch {
      // Missing profile data is not permission to invent a personal balance.
      advisorPrompt = '';
      advisorGrounded = false;
    }
  }

  const usage = await consumeAiUsage({
    userId: user.id,
    feature: 'market_ai_insight',
    metadata: {
      route: '/api/intelligence/chat',
      domain: effectiveDomain,
      analysisId: analysisId ?? null,
      messageCount: messages.length,
      assetResolvedFromMessage: resolved.inferredFromMessage,
      economicIntelligenceGrounded: advisorGrounded,
    },
  });
  if (!usage.allowed) return aiUsageLimitResponse(usage);

  // Fetch current values only after auth, rate-limit and AI allowance pass.
  // Failure is non-fatal: identity remains verified and the prompt explicitly
  // forbids inventing unavailable live values.
  const marketSnapshot = canonicalAsset
    ? await loadVerifiedMarketSnapshot({ userId: user.id, asset: canonicalAsset, locale, correlationId })
    : null;

  const baseSystemPrompt = buildMarketChatSystemPrompt({
    domain: effectiveDomain,
    asset: verifiedAsset,
    marketSnapshot,
    requestedUnresolvedSymbol: resolved.requestedUnresolvedSymbol,
    locale,
  });
  const system = advisorPrompt ? `${baseSystemPrompt} ${advisorPrompt}` : baseSystemPrompt;
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
    advisorGrounded,
    marketDataGrounded: Boolean(marketSnapshot),
    marketDataProvider: marketSnapshot?.provider ?? null,
    marketDataStatus: marketSnapshot?.dataStatus ?? null,
    marketDataAsOf: marketSnapshot?.dataAsOf ?? null,
    correlationId,
  }, { headers: { ...INTELLIGENCE_RESPONSE_HEADERS, 'X-Correlation-ID': correlationId } });
}
