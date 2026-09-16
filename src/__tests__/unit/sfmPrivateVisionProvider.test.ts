import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generatePrivateVisionReply, privateAiVisionConfigured } from '@/lib/server/aiProvider';

const fetchMock = vi.fn();
const ENV_KEYS = [
  'SFM_AI_BASE_URL', 'SFM_AI_MODEL', 'SFM_AI_API_KEY',
  'SFM_AI_FALLBACK_BASE_URL', 'SFM_AI_FALLBACK_MODEL', 'SFM_AI_FALLBACK_API_KEY',
  'SFM_AI_VISION_BASE_URL', 'SFM_AI_VISION_MODEL', 'SFM_AI_VISION_API_KEY',
  'SFM_AI_VISION_FALLBACK_BASE_URL', 'SFM_AI_VISION_FALLBACK_MODEL', 'SFM_AI_VISION_FALLBACK_API_KEY',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'AI_GATEWAY_API_KEY', 'AI_GATEWAY_TOKEN',
];

const imageDataUrl = `data:image/png;base64,${Buffer.from('private-fixture').toString('base64')}`;
const completion = (text: string, status = 200) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
  status,
  headers: { 'content-type': 'application/json' },
});

beforeEach(() => {
  vi.resetAllMocks();
  for (const key of ENV_KEYS) vi.stubEnv(key, '');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue(completion('{"total":12.5}'));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SFM Private AI vision transport', () => {
  it('does not treat vendor API keys as private vision configuration', () => {
    vi.stubEnv('OPENAI_API_KEY', 'unused');
    vi.stubEnv('ANTHROPIC_API_KEY', 'unused');
    expect(privateAiVisionConfigured()).toBe(false);
  });

  it('uses a dedicated private vision model and never sends vendor credentials', async () => {
    vi.stubEnv('SFM_AI_VISION_BASE_URL', 'https://vision.sfm.test/v1');
    vi.stubEnv('SFM_AI_VISION_MODEL', 'sfm-vision');
    vi.stubEnv('SFM_AI_VISION_API_KEY', 'vision-private-key');
    vi.stubEnv('OPENAI_API_KEY', 'must-not-be-used');

    const result = await generatePrivateVisionReply({
      system: 'Read only the supplied receipt image.',
      prompt: 'Return JSON only.',
      imageDataUrl,
      correlationId: 'vision-test',
      maxTokens: 400,
    });

    expect(result).toMatchObject({ provider: 'sfm-private-primary', model: 'sfm-vision', text: '{"total":12.5}' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://vision.sfm.test/v1/chat/completions');
    expect(init.headers).toMatchObject({ authorization: 'Bearer vision-private-key' });
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('sfm-vision');
    expect(body.messages[1].content).toEqual([
      { type: 'text', text: 'Return JSON only.' },
      { type: 'image_url', image_url: { url: imageDataUrl } },
    ]);
    expect(JSON.stringify(init)).not.toContain('must-not-be-used');
  });

  it('can share the private text node base URL and key while using a separate vision model', async () => {
    vi.stubEnv('SFM_AI_BASE_URL', 'https://primary.sfm.test/v1');
    vi.stubEnv('SFM_AI_API_KEY', 'shared-private-key');
    vi.stubEnv('SFM_AI_VISION_MODEL', 'sfm-vision-on-primary');

    expect(privateAiVisionConfigured()).toBe(true);
    await generatePrivateVisionReply({
      system: 'vision', prompt: 'read image', imageDataUrl, correlationId: 'shared-test',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://primary.sfm.test/v1/chat/completions');
    expect(init.headers).toMatchObject({ authorization: 'Bearer shared-private-key' });
  });

  it('fails over to a second private vision node', async () => {
    vi.stubEnv('SFM_AI_VISION_BASE_URL', 'https://vision-primary.sfm.test/v1');
    vi.stubEnv('SFM_AI_VISION_MODEL', 'sfm-vision-primary');
    vi.stubEnv('SFM_AI_VISION_API_KEY', 'primary-key');
    vi.stubEnv('SFM_AI_VISION_FALLBACK_BASE_URL', 'https://vision-fallback.sfm.test/v1');
    vi.stubEnv('SFM_AI_VISION_FALLBACK_MODEL', 'sfm-vision-fallback');
    vi.stubEnv('SFM_AI_VISION_FALLBACK_API_KEY', 'fallback-key');
    fetchMock.mockResolvedValueOnce(completion('down', 503)).mockResolvedValueOnce(completion('fallback vision'));

    const result = await generatePrivateVisionReply({
      system: 'vision', prompt: 'read image', imageDataUrl, correlationId: 'failover-test',
    });
    expect(result).toMatchObject({ provider: 'sfm-private-fallback', model: 'sfm-vision-fallback', text: 'fallback vision' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects non-image data URLs before any inference request', async () => {
    vi.stubEnv('SFM_AI_VISION_BASE_URL', 'https://vision.sfm.test/v1');
    vi.stubEnv('SFM_AI_VISION_MODEL', 'sfm-vision');
    const result = await generatePrivateVisionReply({
      system: 'vision', prompt: 'read', imageDataUrl: 'https://example.test/private.png', correlationId: 'invalid-test',
    });
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
