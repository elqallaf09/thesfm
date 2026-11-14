import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('TV welcome session', () => {
  it('survives document reloads and resets for a new app session', async () => {
    const data = new Map<string, string>();
    vi.stubGlobal('window', { sessionStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    } });
    let session = await import('@/lib/markets-tv/welcome-session');
    expect(session.claimTvWelcome()).toBe(true);
    expect(session.claimTvWelcome()).toBe(false);
    vi.resetModules();
    session = await import('@/lib/markets-tv/welcome-session');
    expect(session.claimTvWelcome()).toBe(false);
    data.clear(); vi.resetModules();
    session = await import('@/lib/markets-tv/welcome-session');
    expect(session.claimTvWelcome()).toBe(true);
  });

  it('does not claim startup during server rendering', async () => {
    vi.stubGlobal('window', undefined);
    const session = await import('@/lib/markets-tv/welcome-session');
    expect(session.claimTvWelcome()).toBe(false);
  });

  it('falls back to document memory when storage is blocked', async () => {
    vi.stubGlobal('window', { get sessionStorage() { throw new Error('blocked'); } });
    const session = await import('@/lib/markets-tv/welcome-session');
    expect(session.claimTvWelcome()).toBe(true);
    expect(session.claimTvWelcome()).toBe(false);
  });
});
