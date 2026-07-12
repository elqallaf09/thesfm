import { EventEmitter } from 'node:events';
import type { ClientRequest, IncomingMessage, RequestOptions } from 'node:http';
import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const networkMocks = vi.hoisted(() => ({
  lookup: vi.fn(),
  httpRequest: vi.fn(),
  httpsRequest: vi.fn(),
}));

vi.mock('node:dns/promises', () => ({ lookup: networkMocks.lookup }));
vi.mock('node:http', async importOriginal => ({
  ...await importOriginal<typeof import('node:http')>(),
  request: networkMocks.httpRequest,
}));
vi.mock('node:https', async importOriginal => ({
  ...await importOriginal<typeof import('node:https')>(),
  request: networkMocks.httpsRequest,
}));

import {
  assertSafePublicUrl,
  clearSecureFetchStateForTests,
  secureFetch,
} from '@/lib/sharia-research/secureFetch';

type ResponseFixture = {
  status: number;
  headers?: Record<string, string>;
  body?: string;
};

function incomingResponse(fixture: ResponseFixture) {
  const response = Readable.from(fixture.body ? [Buffer.from(fixture.body)] : []) as IncomingMessage;
  response.statusCode = fixture.status;
  response.statusMessage = fixture.status === 200 ? 'OK' : 'Found';
  response.headers = fixture.headers ?? {};
  return response;
}

function installRequestMock(
  requestMock: typeof networkMocks.httpRequest,
  fixtures: ResponseFixture[],
  capturedOptions: RequestOptions[],
  dialedAddresses: string[],
) {
  let responseIndex = 0;
  requestMock.mockImplementation((options: RequestOptions, callback: (response: IncomingMessage) => void) => {
    capturedOptions.push(options);
    options.lookup?.(
      String(options.hostname),
      { all: false, family: options.family ?? 0, hints: 0 },
      (error, address) => {
        if (error) throw error;
        if (typeof address !== 'string') throw new Error('Expected the pinned lookup to return one address.');
        dialedAddresses.push(address);
      },
    );

    const request = new EventEmitter() as ClientRequest;
    request.end = vi.fn(() => {
      const fixture = fixtures[responseIndex++];
      if (!fixture) throw new Error('No mock response was configured for the request.');
      queueMicrotask(() => callback(incomingResponse(fixture)));
      return request;
    }) as unknown as ClientRequest['end'];
    return request;
  });
}

beforeEach(() => {
  networkMocks.lookup.mockReset();
  networkMocks.httpRequest.mockReset();
  networkMocks.httpsRequest.mockReset();
  clearSecureFetchStateForTests();
});

describe('secure fetch DNS pinning', () => {
  it('rejects a hostname when any DNS answer is private', async () => {
    networkMocks.lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);

    await expect(assertSafePublicUrl('https://mixed.example/research'))
      .rejects.toMatchObject({ code: 'PRIVATE_DNS_TARGET_BLOCKED' });
    expect(networkMocks.httpRequest).not.toHaveBeenCalled();
    expect(networkMocks.httpsRequest).not.toHaveBeenCalled();
  });

  it('dials only the validated address while preserving the original HTTPS hostname and SNI', async () => {
    networkMocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    const capturedOptions: RequestOptions[] = [];
    const dialedAddresses: string[] = [];
    installRequestMock(networkMocks.httpsRequest, [{
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: 'verified',
    }], capturedOptions, dialedAddresses);

    const result = await secureFetch('https://research.example/report', {
      respectRobots: false,
      retries: 0,
      minDomainIntervalMs: 0,
      acceptedContentTypes: ['text/plain'],
      headers: { Host: 'attacker.invalid' },
    });

    expect(new TextDecoder().decode(result.body)).toBe('verified');
    expect(dialedAddresses).toEqual(['93.184.216.34']);
    expect(capturedOptions[0]).toMatchObject({
      hostname: 'research.example',
      servername: 'research.example',
      family: 4,
    });
    expect(capturedOptions[0].headers).not.toHaveProperty('host');
    // One lookup validates the input and the second is the address pinned to this attempt.
    expect(networkMocks.lookup).toHaveBeenCalledTimes(2);
  });

  it('revalidates a redirect and blocks DNS rebinding before a second connection', async () => {
    let resolution = 0;
    networkMocks.lookup.mockImplementation(async () => {
      resolution += 1;
      return [{ address: resolution <= 2 ? '93.184.216.34' : '127.0.0.1', family: 4 }];
    });
    const capturedOptions: RequestOptions[] = [];
    const dialedAddresses: string[] = [];
    installRequestMock(networkMocks.httpsRequest, [{
      status: 302,
      headers: { location: '/private' },
    }], capturedOptions, dialedAddresses);

    await expect(secureFetch('https://research.example/start', {
      respectRobots: false,
      retries: 0,
      minDomainIntervalMs: 0,
    })).rejects.toMatchObject({ code: 'PRIVATE_DNS_TARGET_BLOCKED' });

    expect(networkMocks.httpsRequest).toHaveBeenCalledTimes(1);
    expect(networkMocks.httpRequest).not.toHaveBeenCalled();
    expect(dialedAddresses).toEqual(['93.184.216.34']);
    expect(networkMocks.lookup).toHaveBeenCalledTimes(3);
  });
});
