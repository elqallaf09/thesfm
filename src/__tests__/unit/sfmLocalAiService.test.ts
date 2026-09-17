import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const gateway = readFileSync('services/sfm-local-ai/gateway.mjs', 'utf8');
const start = readFileSync('services/sfm-local-ai/start.ps1', 'utf8');
const docs = readFileSync('services/sfm-local-ai/README.md', 'utf8');

describe('SFM Local AI Windows node', () => {
  it('keeps Ollama loopback-only behind an authenticated bounded gateway', () => {
    expect(gateway).toContain("'127.0.0.1'");
    expect(gateway).toContain('OLLAMA_BASE_URL must stay on loopback');
    expect(gateway).toContain('req.headers.authorization');
    expect(gateway).toContain('timingSafeEqual');
    expect(gateway).toContain("url.pathname === '/v1/models'");
    expect(gateway).toContain("url.pathname === '/v1/chat/completions'");
    expect(gateway).toContain('REQUEST_TOO_LARGE');
    expect(gateway).toContain('think: false');
    expect(gateway).not.toContain('OPENAI_API_KEY');
    expect(gateway).not.toContain('ANTHROPIC_API_KEY');
  });

  it('uses the 12GB-friendly quantized baseline and persists a private local key', () => {
    expect(start).toContain('qwen3:8b-q4_K_M');
    expect(start).toContain('[System.Security.Cryptography.RandomNumberGenerator]::Create()');
    expect(start).toContain('$rng.GetBytes($bytes)');
    expect(start).toContain('$rng.Dispose()');
    expect(start).toContain('SFM_LOCAL_NUM_CTX=8192');
    expect(start).toContain('SFM_LOCAL_MAX_OUTPUT_TOKENS=768');
    expect(docs).toContain('RTX 4070 Ti 12 GB');
    expect(docs).toContain('SFM_AI_BASE_URL=http://127.0.0.1:8787/v1');
    expect(docs).toContain('cloudflared tunnel --url http://127.0.0.1:8787');
  });
});
