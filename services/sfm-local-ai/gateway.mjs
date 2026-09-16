import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const HOST = process.env.SFM_LOCAL_BIND_HOST?.trim() || '127.0.0.1';
const PORT = boundedInt(process.env.SFM_LOCAL_GATEWAY_PORT, 8787, 1024, 65535);
const OLLAMA_URL = normalizeLoopbackUrl(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || 'qwen3:8b-q4_K_M';
const SERVED_MODEL = process.env.SFM_LOCAL_SERVED_MODEL?.trim() || 'sfm-local-primary';
const API_KEY = process.env.SFM_LOCAL_API_KEY?.trim() || '';
const NUM_CTX = boundedInt(process.env.SFM_LOCAL_NUM_CTX, 8192, 2048, 32768);
const MAX_OUTPUT_TOKENS = boundedInt(process.env.SFM_LOCAL_MAX_OUTPUT_TOKENS, 768, 64, 2048);
const OLLAMA_TIMEOUT_MS = boundedInt(process.env.SFM_LOCAL_OLLAMA_TIMEOUT_MS, 20_000, 5_000, 24_000);
const KEEP_ALIVE = process.env.SFM_LOCAL_KEEP_ALIVE?.trim() || '30m';
const MAX_BODY_BYTES = 96 * 1024;

if (API_KEY.length < 32 || /[\r\n]/.test(API_KEY)) {
  throw new Error('SFM_LOCAL_API_KEY must be a single-line secret with at least 32 characters.');
}
if (!/^[A-Za-z0-9/_.:-]{1,160}$/.test(SERVED_MODEL)) throw new Error('Invalid SFM_LOCAL_SERVED_MODEL.');
if (!OLLAMA_MODEL || OLLAMA_MODEL.length > 200 || /[\r\n]/.test(OLLAMA_MODEL)) throw new Error('Invalid OLLAMA_MODEL.');

function boundedInt(raw, fallback, min, max) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeLoopbackUrl(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid OLLAMA_BASE_URL.');
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error('OLLAMA_BASE_URL must stay on loopback; expose only this authenticated gateway.');
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(payload);
}

function authorized(req) {
  const header = req.headers.authorization || '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  const supplied = header.slice(prefix.length);
  const expected = Buffer.from(API_KEY);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  if (size === 0) throw new Error('EMPTY_REQUEST');
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) return null;
  let totalChars = 0;
  const messages = [];
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const role = item.role;
    const content = item.content;
    if (!['system', 'user', 'assistant'].includes(role) || typeof content !== 'string') return null;
    const clean = content.trim();
    if (!clean || clean.length > 16_000) return null;
    totalChars += clean.length;
    if (totalChars > 64_000) return null;
    messages.push({ role, content: clean });
  }
  return messages;
}

async function ollamaFetch(path, init = {}, timeoutMs = OLLAMA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('OLLAMA_TIMEOUT')), timeoutMs);
  timeout.unref?.();
  try {
    return await fetch(new URL(path, `${OLLAMA_URL.toString().replace(/\/$/, '')}/`), {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function models(_req, res) {
  try {
    const response = await ollamaFetch('/api/tags', { method: 'GET' }, 5_000);
    if (!response.ok) return json(res, 503, { error: { code: 'OLLAMA_UNAVAILABLE' } });
    const payload = await response.json().catch(() => null);
    const installed = Array.isArray(payload?.models)
      && payload.models.some(model => String(model?.name ?? model?.model ?? '') === OLLAMA_MODEL);
    if (!installed) return json(res, 503, { error: { code: 'MODEL_NOT_INSTALLED' } });
    return json(res, 200, {
      object: 'list',
      data: [{ id: SERVED_MODEL, object: 'model', owned_by: 'sfm-local' }],
    });
  } catch {
    return json(res, 503, { error: { code: 'OLLAMA_UNAVAILABLE' } });
  }
}

async function completion(req, res) {
  const started = Date.now();
  try {
    const body = await readJson(req);
    if (body?.stream === true) return json(res, 400, { error: { code: 'STREAMING_NOT_ENABLED' } });
    if (body?.model !== SERVED_MODEL) return json(res, 404, { error: { code: 'MODEL_NOT_FOUND' } });
    const messages = validMessages(body?.messages);
    if (!messages) return json(res, 400, { error: { code: 'INVALID_MESSAGES' } });
    const requestedTokens = boundedInt(body?.max_tokens, MAX_OUTPUT_TOKENS, 16, MAX_OUTPUT_TOKENS);

    const response = await ollamaFetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        think: false,
        keep_alive: KEEP_ALIVE,
        options: {
          num_ctx: NUM_CTX,
          num_predict: requestedTokens,
          temperature: 0.2,
        },
      }),
    });
    if (!response.ok) return json(res, 502, { error: { code: 'OLLAMA_GENERATION_FAILED' } });
    const payload = await response.json().catch(() => null);
    const content = typeof payload?.message?.content === 'string' ? payload.message.content.trim() : '';
    if (!content) return json(res, 502, { error: { code: 'EMPTY_MODEL_RESPONSE' } });

    console.info('[sfm-local-ai] completion', {
      model: SERVED_MODEL,
      elapsedMs: Date.now() - started,
      promptTokens: Number(payload?.prompt_eval_count) || null,
      completionTokens: Number(payload?.eval_count) || null,
    });

    return json(res, 200, {
      id: `chatcmpl-sfm-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: SERVED_MODEL,
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: payload?.done_reason === 'length' ? 'length' : 'stop',
      }],
      usage: {
        prompt_tokens: Number(payload?.prompt_eval_count) || 0,
        completion_tokens: Number(payload?.eval_count) || 0,
        total_tokens: (Number(payload?.prompt_eval_count) || 0) + (Number(payload?.eval_count) || 0),
      },
    });
  } catch (error) {
    const code = error instanceof Error && error.message === 'REQUEST_TOO_LARGE'
      ? 'REQUEST_TOO_LARGE'
      : error instanceof Error && error.message === 'OLLAMA_TIMEOUT'
        ? 'OLLAMA_TIMEOUT'
        : 'INVALID_REQUEST';
    return json(res, code === 'REQUEST_TOO_LARGE' ? 413 : code === 'OLLAMA_TIMEOUT' ? 504 : 400, { error: { code } });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (!authorized(req)) return json(res, 401, { error: { code: 'UNAUTHORIZED' } });
  if (req.method === 'GET' && url.pathname === '/v1/models') return models(req, res);
  if (req.method === 'POST' && url.pathname === '/v1/chat/completions') return completion(req, res);
  return json(res, 404, { error: { code: 'NOT_FOUND' } });
});

server.listen(PORT, HOST, () => {
  console.info(`[sfm-local-ai] listening on http://${HOST}:${PORT}/v1 with ${SERVED_MODEL} -> ${OLLAMA_MODEL}`);
});
