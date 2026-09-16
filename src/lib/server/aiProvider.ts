import OpenAI from 'openai';

const PROVIDER_TIMEOUT_MS = 8_500;
const MAX_RESPONSE_TOKENS = 1_200;
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_GATEWAY_MODEL = 'openai/gpt-4o-mini';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
type GenerationResult = { text: string; provider: 'vercel-ai-gateway' | 'openai'; model: string };

export function aiProviderEnv(name: string) {
  let value = process.env[name]?.trim() ?? '';
  // Dashboard values copied from a .env file sometimes retain outer quotes.
  // Never alter the credential itself or accept a multi-line header value.
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value && !/[\r\n]/.test(value) ? value : null;
}

export function aiProviderConfigured() {
  return ['AI_GATEWAY_API_KEY', 'AI_GATEWAY_TOKEN', 'OPENAI_API_KEY'].some(name => aiProviderEnv(name));
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
  const message = typeof record.message === 'string' ? record.message : typeof nested.message === 'string' ? nested.message : '';
  const category = /free.*credit|free tier|paid credits|RestrictedModelsError/i.test(message)
    ? 'GATEWAY_CREDIT_TIER_RESTRICTION'
    : /allowlist|restricted access to this provider/i.test(message)
      ? 'PROVIDER_ALLOWLIST_RESTRICTION'
      : undefined;
  const safeTag = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(value) ? value : undefined;
  return {
    name: safeTag(record.name) ?? 'Error',
    category,
    status: typeof record.status === 'number' ? record.status : typeof record.statusCode === 'number' ? record.statusCode : undefined,
    code: typeof record.code === 'string'
      ? safeTag(record.code)
      : typeof nested.code === 'string'
        ? safeTag(nested.code)
        : record.message === 'AI_PROVIDER_TIMEOUT'
          ? 'AI_PROVIDER_TIMEOUT'
          : record.message === 'AI_PROVIDER_EMPTY_RESPONSE'
            ? 'AI_PROVIDER_EMPTY_RESPONSE'
            : undefined,
    type: safeTag(record.type) ?? safeTag(nested.type),
  };
}

function logProviderFailure(input: { correlationId: string; provider: string; model: string; error: unknown }) {
  console.warn('[sfm-ai] provider attempt failed', {
    correlationId: input.correlationId,
    provider: input.provider,
    model: input.model,
    ...safeProviderError(input.error),
  });
}

/** Existing OpenAI credentials are primary; Gateway is an optional alternative
 * transport. Neither path reads or requires an Anthropic credential. */
export async function generateAssistantReply(input: {
  system: string;
  messages: ChatMessage[];
  correlationId: string;
  maxTokens?: number;
}): Promise<GenerationResult | null> {
  const openaiKey = aiProviderEnv('OPENAI_API_KEY');
  const gatewayKey = aiProviderEnv('AI_GATEWAY_API_KEY') ?? aiProviderEnv('AI_GATEWAY_TOKEN');
  const configuredGatewayModel = aiProviderEnv('AI_ASSISTANT_GATEWAY_MODEL');
  // Migrate the previously rejected Anthropic Gateway setting without
  // changing any stored secret, billing setting or account access policy.
  const gatewayModel = configuredGatewayModel && !configuredGatewayModel.toLowerCase().startsWith('anthropic/')
    ? configuredGatewayModel : DEFAULT_GATEWAY_MODEL;
  const candidates = [
    { provider: 'openai' as const, key: openaiKey, model: aiProviderEnv('AI_ASSISTANT_OPENAI_MODEL') ?? DEFAULT_OPENAI_MODEL, baseURL: 'https://api.openai.com/v1' },
    { provider: 'vercel-ai-gateway' as const, key: gatewayKey, model: gatewayModel, baseURL: 'https://ai-gateway.vercel.sh/v1' },
  ];
  for (const candidate of candidates) {
    if (!candidate.key) continue;
    const model = /^[a-zA-Z0-9/_.-]{1,120}$/.test(candidate.model) ? candidate.model
      : candidate.provider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_GATEWAY_MODEL;
    try {
      const client = new OpenAI({ apiKey: candidate.key, baseURL: candidate.baseURL, maxRetries: 0, timeout: PROVIDER_TIMEOUT_MS });
      const completion = await withProviderTimeout(signal => client.chat.completions.create({
        model,
        max_completion_tokens: input.maxTokens ?? MAX_RESPONSE_TOKENS,
        messages: [{ role: 'system', content: input.system }, ...input.messages],
      }, { signal }));
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
      return { text, provider: candidate.provider, model };
    } catch (error) {
      logProviderFailure({ correlationId: input.correlationId, provider: candidate.provider, model, error });
    }
  }
  return null;
}
