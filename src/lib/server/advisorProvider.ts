import 'server-only';
import { after } from 'next/server';
import { aiProviderConfigured, aiProviderEnv, generateAssistantReply, type ChatMessage, type GenerationResult } from './aiProvider';
import type { AiUsageTracking } from './aiUsage';
import { parseOpenAiTokenUsage, writeOpenAiAdvisorUsage, type OpenAiAdvisorUsage } from './openAiAdvisorUsage';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const MAX_INPUT_CHARS = 48_000;
const MAX_OUTPUT_TOKENS = 2_000;
const TIMEOUT_MS = 22_000;

type OpenAiConfiguration = { apiKey: string; model: string; organizationId: string | null; projectId: string | null };

function identifier(value: string | null) {
  return value && /^[a-zA-Z0-9_.-]{1,160}$/.test(value) ? value : null;
}

function openAiConfiguration(): OpenAiConfiguration | null {
  for (const name of ['SFM_OPENAI_API_KEY', 'SFM_OPENAI_MODEL', 'SFM_OPENAI_ORGANIZATION', 'SFM_OPENAI_PROJECT']) {
    if (process.env[name]?.trim() && !aiProviderEnv(name)) return null;
  }
  const apiKey = aiProviderEnv('SFM_OPENAI_API_KEY') ?? aiProviderEnv('OPENAI_API_KEY');
  const model = identifier(aiProviderEnv('SFM_OPENAI_MODEL'));
  const rawOrganization = aiProviderEnv('SFM_OPENAI_ORGANIZATION');
  const rawProject = aiProviderEnv('SFM_OPENAI_PROJECT');
  const organizationId = identifier(rawOrganization);
  const projectId = identifier(rawProject);
  if (!apiKey || !model || (rawOrganization && !organizationId) || (rawProject && !projectId)) return null;
  return { apiKey, model, organizationId, projectId };
}

/** The private provider remains the default and continues serving users outside the pilot. */
export function usesOpenAiAdvisor(userId: string) {
  if (aiProviderEnv('SFM_ADVISOR_PROVIDER') !== 'openai') return false;
  const users = (aiProviderEnv('SFM_OPENAI_PILOT_USER_IDS') ?? '').split(',').map(value => value.trim()).filter(Boolean);
  return Boolean(userId) && (users.includes('*') || users.includes(userId));
}

export function advisorProviderConfigured(userId: string) {
  return usesOpenAiAdvisor(userId) ? Boolean(openAiConfiguration()) : aiProviderConfigured();
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function responseText(payload: Record<string, unknown>) {
  if (!Array.isArray(payload.output)) return '';
  return payload.output.flatMap(item => {
    const message = object(item);
    if (message.type !== 'message' || message.role !== 'assistant' || !Array.isArray(message.content)) return [];
    return message.content.map(part => {
      const content = object(part);
      return content.type === 'output_text' && typeof content.text === 'string' ? content.text : '';
    });
  }).filter(Boolean).join('\n').trim();
}

async function persistFinal(tracking: AiUsageTracking, entry: OpenAiAdvisorUsage) {
  if (await writeOpenAiAdvisorUsage(tracking, entry)) return;
  // Preserve pending evidence if final recording fails; never call the model again.
  // The retry writes the same owner-bound record and contains no prompt or response text.
  try {
    after(async () => { await writeOpenAiAdvisorUsage(tracking, entry); });
  } catch {
    console.warn('[sfm-openai-advisor] final usage recording unavailable');
  }
}

export async function generateAdvisorReply(input: {
  userId: string;
  system: string;
  messages: ChatMessage[];
  correlationId: string;
  maxTokens?: number;
  tracking?: AiUsageTracking;
}): Promise<GenerationResult | { text: string; provider: 'openai'; model: string } | null> {
  if (!usesOpenAiAdvisor(input.userId)) return generateAssistantReply(input);
  const config = openAiConfiguration();
  const tracking = input.tracking;
  if (!config || !tracking || tracking.userId !== input.userId) return null;
  if (input.system.length + input.messages.reduce((total, message) => total + message.content.length, 0) > MAX_INPUT_CHARS) return null;
  const requestedTokens = input.maxTokens ?? 1_200;
  const maxOutputTokens = Number.isFinite(requestedTokens) ? Math.min(MAX_OUTPUT_TOKENS, Math.max(256, Math.trunc(requestedTokens))) : 1_200;
  const started = Date.now();
  const entry: OpenAiAdvisorUsage = {
    version: 1, application: 'sfm', provider: 'openai', endpoint: 'responses', requestedModel: config.model, model: null,
    organizationId: config.organizationId, projectId: config.projectId,
    outcome: 'pending', startedAt: new Date(started).toISOString(), completedAt: null, latencyMs: null,
    httpStatus: null, reasonCode: null, clientRequestId: identifier(input.correlationId), requestId: null, responseId: null, usage: null,
  };
  // A persisted reservation is required before any paid provider request.
  if (!await writeOpenAiAdvisorUsage(tracking, entry)) return null;
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => { controller.abort(); reject(new Error('PROVIDER_TIMEOUT')); }, TIMEOUT_MS);
    timeout.unref?.();
  });
  let result: { text: string; provider: 'openai'; model: string } | null = null;
  try {
    const request = async () => {
      const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST', signal: controller.signal, redirect: 'error', cache: 'no-store',
      headers: {
        'content-type': 'application/json', authorization: `Bearer ${config.apiKey}`,
        ...(config.organizationId ? { 'OpenAI-Organization': config.organizationId } : {}),
        ...(config.projectId ? { 'OpenAI-Project': config.projectId } : {}),
        ...(identifier(input.correlationId) ? { 'X-Client-Request-Id': input.correlationId } : {}),
      },
      body: JSON.stringify({
        model: config.model, instructions: input.system, input: input.messages,
        max_output_tokens: maxOutputTokens, store: false, stream: false,
        ...(config.model === 'gpt-6.1-sol' ? { reasoning: { effort: 'low' } } : {}),
      }),
      });
      // Headers are evidence even if the generated response body later times out.
      // A late fetch resolution after cancellation must not mutate the final record.
      if (!controller.signal.aborted) {
        entry.httpStatus = response.status;
        entry.requestId = identifier(response.headers.get('x-request-id'));
      }
      return { response, payload: object(await response.json().catch(() => null)) };
    };
    const { response, payload } = await Promise.race([request(), deadline]);
    entry.httpStatus = response.status;
    entry.requestId = identifier(response.headers.get('x-request-id'));
    entry.responseId = identifier(typeof payload.id === 'string' ? payload.id : null);
    entry.model = identifier(typeof payload.model === 'string' ? payload.model : null);
    entry.usage = parseOpenAiTokenUsage(payload.usage);
    const text = responseText(payload);
    if (response.ok && payload.status === 'completed' && text) {
      entry.outcome = 'success';
      result = { text, provider: 'openai', model: entry.model ?? config.model };
    } else {
      entry.outcome = response.ok && payload.status === 'incomplete' ? 'incomplete' : 'failure';
      entry.reasonCode = !response.ok ? `HTTP_${response.status}` : payload.status === 'incomplete' ? 'RESPONSE_INCOMPLETE' : 'RESPONSE_UNAVAILABLE';
    }
  } catch {
    entry.outcome = 'failure';
    entry.reasonCode = controller.signal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE';
  } finally {
    if (timeout) clearTimeout(timeout);
    entry.completedAt = new Date().toISOString();
    entry.latencyMs = Date.now() - started;
    await persistFinal(tracking, entry);
  }
  return result;
}
