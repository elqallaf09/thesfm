import { describe, expect, it } from 'vitest';
import { waitForResponsive, warmup } from '../../../scripts/lighthouse-server.mjs';

function fakeResponse(status: number) {
  return { status, arrayBuffer: async () => new ArrayBuffer(0) };
}

describe('lighthouse server warmup', () => {
  it('resolves as soon as the server answers with HTTP 200', async () => {
    let calls = 0;
    await waitForResponsive('http://example.invalid/', {
      timeoutMs: 1000,
      intervalMs: 1,
      fetchImpl: async () => {
        calls += 1;
        return fakeResponse(200);
      },
    });
    expect(calls).toBe(1);
  });

  it('retries through connection errors and non-200 responses until responsive', async () => {
    let calls = 0;
    await waitForResponsive('http://example.invalid/', {
      timeoutMs: 1000,
      intervalMs: 1,
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) throw new Error('ECONNREFUSED');
        if (calls === 2) return fakeResponse(503);
        return fakeResponse(200);
      },
    });
    expect(calls).toBe(3);
  });

  it('times out if the server never becomes responsive', async () => {
    await expect(
      waitForResponsive('http://example.invalid/', {
        timeoutMs: 20,
        intervalMs: 5,
        fetchImpl: async () => {
          throw new Error('ECONNREFUSED');
        },
      }),
    ).rejects.toThrow(/did not become responsive/);
  });

  it('issues exactly the requested number of warmup requests when all succeed', async () => {
    let calls = 0;
    await warmup('http://example.invalid/', {
      count: 3,
      fetchImpl: async () => {
        calls += 1;
        return fakeResponse(200);
      },
    });
    expect(calls).toBe(3);
  });

  it('fails fast on the first non-200 warmup response instead of masking it', async () => {
    let calls = 0;
    await expect(
      warmup('http://example.invalid/', {
        count: 3,
        fetchImpl: async () => {
          calls += 1;
          return fakeResponse(calls === 2 ? 500 : 200);
        },
      }),
    ).rejects.toThrow('Warmup request 2/3 to http://example.invalid/ returned HTTP 500, expected 200');
    expect(calls).toBe(2);
  });
});
