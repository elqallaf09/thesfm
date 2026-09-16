const DEFAULT_TIMEOUT_MS = 22_000;
const MAX_RESPONSE_TOKENS = 1_200;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type SfmPrivateProvider = 'sfm-private-primary' | 'sfm-private-fallback';
type GenerationResult = { text: string; provider: SfmPrivateProvider; model: string };

type ProviderCandidate = {
  provider: SfmPrivateProvider;
  baseURL: string;
  apiKey: string | null;
  model: string;
};

type ProviderHealth = {
  provider: SfmPrivateProvider;
  configured: boolean;
  reachable: boolean;
  model: string | null;
  latencyMs: number | null;
  status: number | null;
};

export function aiProviderEnv(name: string) {
  let value = process.env[name]?.trim() ?? '';
  // Dashboard values copied from a .env file sometimes retain outer quotes.
  // Never alter the credential itself or accept a multi-line header value.
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value && !/[\r\n]/.test(value) ? value : null;
}

function providerTimeoutMs() {
  const parsed = Number(aiProviderEnv('SFM_AI_TIMEOUT_MS'));
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  return Math.min(25_000, Math.max(5_000, Math.trunc(parsed)));
}

function normalizeBaseURL(raw: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return null;
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function validModel(raw: string | null) {
  return raw && /^[a-zA-Z0-9/_.:-]{1,160}$/.test(raw) ? raw : null;
}

function candidate(input: {
  provider: SfmPrivateProvider;
  baseURLName: string;
  modelName: string;
  apiKeyName: string;
  fallbackModel?: string | null;
}): ProviderCandidate | null {
  const baseURL = normalizeBaseURL(aiProviderEnv(input.baseURLName));
  const model = validModel(aiProviderEnv(input.modelName)) ?? validModel(input.fallbackModel ?? null);
  const apiKey = aiProviderEnv(input.apiKeyName);
  if (!baseURL || !model) return null;
  // A remotely reachable production model must not be left unauthenticated.
  if (process.env.NODE_ENV === 'production' && !apiKey) return null;
  return { provider: input.provider, baseURL, apiKey, model };
}

function configuredCandidates() {
  const primaryModel = aiProviderEnv('SFM_AI_MODEL');
  return [
    candidate({
      provider: 'sfm-private-primary',
      baseURLName: 'SFM_AI_BASE_URL',
      modelName: 'SFM_AI_MODEL',
      apiKeyName: 'SFM_AI_API_KEY',
    }),
    candidate({
      provider: 'sfm-private-fallback',
      baseURLName: 'SFM_AI_FALLBACK_BASE_URL',
      modelName: 'SFM_AI_FALLBACK_MODEL',
      apiKeyName: 'SFM_AI_FALLBACK_API_KEY',
      fallbackModel: primaryModel,
    }),
  ].filter((value): value is ProviderCandidate => Boolean(value));
}

export function aiProviderConfigured() {
  return configuredCandidates().length > 0;
}

async function withProviderTimeout<T>(task: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const timeoutMs = providerTimeoutMs();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutTask = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error('AI_PROVIDER_TIMEOUT');
      reject(error);
      controller.abort(error);
    }, timeoutMs);
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
  const safeTag = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(value) ? value : undefined;
  return {
    name: safeTag(record.name) ?? 'Error',
    status: typeof record.status === 'number' ? record.status : undefined,
    code: safeTag(record.code) ?? (record.message === 'AI_PROVIDER_TIMEOUT' ? 'AI_PROVIDER_TIMEOUT' : record.message === 'AI_PROVIDER_EMPTY_RESPONSE' ? 'AI_PROVIDER_EMPTY_RESPONSE' : undefined),
    type: safeTag(record.type),
  };
}

function logProviderFailure(input: { correlationId: string; provider: string; model: string; error: unknown }) {
  console.warn('[sfm-ai] private provider attempt failed', {
    correlationId: input.correlationId,
    provider: input.provider,
    model: input.model,
    ...safeProviderError(input.error),
  });
}

function completionURL(baseURL: string) {
  return new URL('chat/completions', `${baseURL}/`).toString();
}

function modelsURL(baseURL: string) {
  return new URL('models', `${baseURL}/`).toString();
}

function headers(apiKey: string | null) {
  return {
    'content-type': 'application/json',
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  };
}

function providerHttpError(status: number) {
  const error = new Error('AI_PROVIDER_HTTP_ERROR') as Error & { status?: number; code?: string };
  error.status = status;
  error.code = status === 401 || status === 403 ? 'AI_PROVIDER_AUTH_REJECTED' : 'AI_PROVIDER_HTTP_ERROR';
  return error;
}

function textFromCompletion(payload: unknown) {
  if (!payload || typeof payload !== 'object') return '';
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return '';
  const message = (choices[0] as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return '';
  const content = (message as { content?: unknown }).content;
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map(part => part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string' ? (part as { text: string }).text : '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

/**
 * SFM Private AI transport.
 *
 * The application talks only to user-controlled OpenAI-compatible endpoints
 * such as vLLM, TGI adapters, LocalAI or an Ollama compatibility endpoint.
 * It does not read OPENAI_API_KEY, ANTHROPIC_API_KEY, or vendor gateway keys.
 */
export async function generateAssistantReply(input: {
  system: string;
  messages: ChatMessage[];
  correlationId: string;
  maxTokens?: number;
}): Promise<GenerationResult | null> {
  for (const current of configuredCandidates()) {
    try {
      const response = await withProviderTimeout(signal => fetch(completionURL(current.baseURL), {
        method: 'POST',
        headers: headers(current.apiKey),
        redirect: 'error',
        cache: 'no-store',
        signal,
        body: JSON.stringify({
          model: current.model,
          stream: false,
          max_tokens: input.maxTokens ?? MAX_RESPONSE_TOKENS,
          messages: [{ role: 'system', content: input.system }, ...input.messages],
        }),
      }));
      if (!response.ok) throw providerHttpError(response.status);
      const text = textFromCompletion(await response.json().catch(() => null));
      if (!text) throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
      return { text, provider: current.provider, model: current.model };
    } catch (error) {
      logProviderFailure({ correlationId: input.correlationId, provider: current.provider, model: current.model, error });
    }
  }
  return null;
}

export async function checkPrivateAiHealth(): Promise<ProviderHealth[]> {
  const configured = configuredCandidates();
  const results: ProviderHealth[] = [];
  for (const current of configured) {
    const started = Date.now();
    try {
      const response = await withProviderTimeout(signal => fetch(modelsURL(current.baseURL), {
        method: 'GET',
        headers: headers(current.apiKey),
        redirect: 'error',
        cache: 'no-store',
        signal,
      }));
      results.push({
        provider: current.provider,
        configured: true,
        reachable: response.ok,
        model: current.model,
        latencyMs: Date.now() - started,
        status: response.status,
      });
    } catch {
      results.push({
        provider: current.provider,
        configured: true,
        reachable: false,
        model: current.model,
        latencyMs: Date.now() - started,
        status: null,
      });
    }
  }
  return results;
}
