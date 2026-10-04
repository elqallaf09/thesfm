import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiGenerationIdentities, checkPrivateAiHealth, generateAssistantReply } from '@/lib/server/aiProvider';
import { __resetAiGenerationTelemetryForTests, readAiGenerationOutcomes } from '@/lib/server/aiProviderTelemetry';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(), writes: [] as unknown[], scheduled: [] as Array<() => Promise<void>>,
}));
vi.mock('next/server', () => ({ after: (task: () => Promise<void>) => { mocks.scheduled.push(task); } }));
vi.mock('@/lib/server/adminAccess', () => ({
  createServerSupabaseAdmin: () => ({ from: () => ({
    upsert: (payload: unknown) => ({ abortSignal: async () => { mocks.writes.push(payload); return { error: null }; } }),
    update: () => ({ eq: () => ({ lte: () => ({ abortSignal: async () => ({ error: null }) }) }) }),
  }) }),
}));

const environment = [
  'SFM_AI_BASE_URL', 'SFM_AI_MODEL', 'SFM_AI_API_KEY',
  'SFM_AI_FALLBACK_BASE_URL', 'SFM_AI_FALLBACK_MODEL', 'SFM_AI_FALLBACK_API_KEY',
  'SFM_AI_VISION_BASE_URL', 'SFM_AI_VISION_MODEL', 'SFM_AI_VISION_API_KEY',
  'SFM_AI_VISION_FALLBACK_BASE_URL', 'SFM_AI_VISION_FALLBACK_MODEL', 'SFM_AI_VISION_FALLBACK_API_KEY',
];
const completion = (text: string, status = 200) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.writes.length = 0;
  mocks.scheduled.length = 0;
  __resetAiGenerationTelemetryForTests();
  for (const key of environment) vi.stubEnv(key, '');
  vi.stubEnv('SFM_AI_BASE_URL', 'https://private.example.test/v1');
  vi.stubEnv('SFM_AI_MODEL', 'sfm-text');
  vi.stubEnv('SFM_AI_API_KEY', 'private-api-credential');
  vi.stubGlobal('fetch', mocks.fetch);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('private AI operational telemetry', () => {
  it('records only a completed actual request, without private input or output, after the response', async () => {
    mocks.fetch.mockResolvedValue(completion('private answer'));
    const result = await generateAssistantReply({
      system: 'private system instruction', messages: [{ role: 'user', content: 'private financial prompt' }],
      correlationId: 'private-correlation-id',
    });
    expect(result?.text).toBe('private answer');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.writes).toHaveLength(0);
    const observed = await readAiGenerationOutcomes(aiGenerationIdentities(), null);
    expect(observed.outcomes).toMatchObject([{ outcome: 'success', capability: 'text', provider: 'sfm-private-primary', reasonCode: null }]);
    await Promise.all(mocks.scheduled.map(task => task()));
    const serialized = JSON.stringify(mocks.writes);
    for (const privateValue of ['private answer', 'private system instruction', 'private financial prompt', 'private-correlation-id', 'private-api-credential', 'private.example.test']) {
      expect(serialized).not.toContain(privateValue);
    }
    expect(mocks.writes).toHaveLength(1);
  });

  it('records a successful fallback as a successful service request', async () => {
    vi.stubEnv('SFM_AI_FALLBACK_BASE_URL', 'https://fallback.example.test/v1');
    vi.stubEnv('SFM_AI_FALLBACK_API_KEY', 'fallback-private-key');
    mocks.fetch.mockResolvedValueOnce(completion('unavailable', 503)).mockResolvedValueOnce(completion('fallback answer'));
    await generateAssistantReply({ system: 'test', messages: [{ role: 'user', content: 'test' }], correlationId: 'test' });
    const observed = await readAiGenerationOutcomes(aiGenerationIdentities(), null);
    expect(observed.outcomes).toHaveLength(1);
    expect(observed.outcomes[0]).toMatchObject({ outcome: 'success', provider: 'sfm-private-fallback' });
  });

  it('preserves the last success separately from a sanitized subsequent failure', async () => {
    mocks.fetch.mockResolvedValueOnce(completion('answer')).mockResolvedValueOnce(completion('upstream private error', 401));
    await generateAssistantReply({ system: 'test', messages: [], correlationId: 'test' });
    await generateAssistantReply({ system: 'test', messages: [], correlationId: 'test' });
    const observed = await readAiGenerationOutcomes(aiGenerationIdentities(), null);
    expect(observed.outcomes.map(row => row.outcome).sort()).toEqual(['failure', 'success']);
    expect(observed.outcomes.find(row => row.outcome === 'failure')?.reasonCode).toBe('AI_PROVIDER_AUTH_REJECTED');
    expect(JSON.stringify(observed)).not.toContain('upstream private error');
  });

  it('does not reuse generation evidence after an endpoint or credential change', async () => {
    mocks.fetch.mockResolvedValue(completion('answer'));
    await generateAssistantReply({ system: 'test', messages: [], correlationId: 'test' });
    vi.stubEnv('SFM_AI_API_KEY', 'rotated-credential');
    expect((await readAiGenerationOutcomes(aiGenerationIdentities(), null)).outcomes).toEqual([]);
  });

  it('requires the configured model in a valid discovery response and never counts discovery as generation', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('<html>proxy page</html>'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'different-model' }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 'sfm-text' }] })));
    expect((await checkPrivateAiHealth())[0]).toMatchObject({ reachable: false, modelAvailable: false, reasonCode: 'AI_PROVIDER_INVALID_MODELS_RESPONSE' });
    expect((await checkPrivateAiHealth())[0]).toMatchObject({ reachable: true, modelAvailable: false, reasonCode: 'AI_PROVIDER_MODEL_NOT_LISTED' });
    expect((await checkPrivateAiHealth())[0]).toMatchObject({ reachable: true, modelAvailable: true, reasonCode: null });
    expect((await readAiGenerationOutcomes(aiGenerationIdentities(), null)).outcomes).toEqual([]);
    expect(mocks.scheduled).toHaveLength(0);
  });

  it('bounds model-discovery body consumption and runs configured nodes in parallel', async () => {
    vi.useFakeTimers();
    vi.stubEnv('SFM_AI_FALLBACK_BASE_URL', 'https://fallback.example.test/v1');
    vi.stubEnv('SFM_AI_FALLBACK_API_KEY', 'fallback-key');
    mocks.fetch.mockImplementation(async () => ({ ok: true, status: 200, json: () => new Promise(() => undefined) }));
    const result = checkPrivateAiHealth({ timeoutMs: 500 });
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(500);
    expect(await result).toMatchObject([
      { reachable: false, reasonCode: 'AI_PROVIDER_TIMEOUT' },
      { reachable: false, reasonCode: 'AI_PROVIDER_TIMEOUT' },
    ]);
    for (const call of mocks.fetch.mock.calls) expect((call[1] as RequestInit).signal?.aborted).toBe(true);
  });
});
