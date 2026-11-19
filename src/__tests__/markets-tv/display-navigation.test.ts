import { afterEach, describe, expect, it, vi } from 'vitest';
import { pushTvBroadcastChannel, pushTvDisplayMode, tvDisplayModeFromPath } from '@/lib/markets-tv/display-navigation';

afterEach(() => vi.unstubAllGlobals());
describe('TV document-preserving navigation', () => {
  it('recognizes only the three display routes', () => {
    expect(tvDisplayModeFromPath('/tv/')).toBe('viewing');
    expect(tvDisplayModeFromPath('/tv/all-stocks')).toBe('browse');
    expect(tvDisplayModeFromPath('/tv/strips')).toBe('strips');
    for (const path of ['/tv/pair', '/tv/all-stocks/private', '/tv-other', '/index.html', '/assets/index.html']) expect(tvDisplayModeFromPath(path)).toBeNull();
  });
  it('updates the URL without reloading and clears the previous channel', () => {
    const pushState = vi.fn();
    vi.stubGlobal('window', { location: new URL('https://www.the-sfm.com/tv?channel=newStocksNews#old'), history: { pushState } });
    pushTvDisplayMode('browse');
    expect(pushState).toHaveBeenCalledOnce();
    expect(String(pushState.mock.calls[0][2])).toBe('https://www.the-sfm.com/tv/all-stocks');
  });
  it('leaves packaged URLs and repeated selections untouched', () => {
    const pushState = vi.fn();
    for (const url of ['https://appassets.androidplatform.net/assets/index.html', 'file:///app/index.html', 'https://www.the-sfm.com/tv/all-stocks']) {
      vi.stubGlobal('window', { location: new URL(url), history: { pushState } });
      pushTvDisplayMode('browse');
    }
    expect(pushState).not.toHaveBeenCalled();
    vi.stubGlobal('window', undefined);
    expect(() => pushTvDisplayMode('strips')).not.toThrow();
  });
  it('keeps a broadcast in its own history entry from the hall and other modes', () => {
    for (const start of ['/tv', '/tv/strips?channel=technology', '/tv/all-stocks#old']) {
      const pushState = vi.fn();
      vi.stubGlobal('window', { location: new URL(`https://www.the-sfm.com${start}`), history: { pushState } });
      pushTvBroadcastChannel('investments');
      expect(pushState).toHaveBeenCalledOnce();
      expect(String(pushState.mock.calls[0][2])).toBe('https://www.the-sfm.com/tv?channel=investments');
    }
  });
  it('does not rewrite packaged asset URLs or duplicate a selected broadcast', () => {
    const pushState = vi.fn();
    for (const url of ['https://appassets.androidplatform.net/index.html', 'file:///app/index.html', 'https://www.the-sfm.com/tv?channel=kuwait']) {
      vi.stubGlobal('window', { location: new URL(url), history: { pushState } });
      pushTvBroadcastChannel('kuwait');
    }
    expect(pushState).not.toHaveBeenCalled();
    vi.stubGlobal('window', undefined);
    expect(() => pushTvBroadcastChannel('sessions')).not.toThrow();
  });
  it('refreshes packaged deep links without changing the asset path or adding native Back entries', () => {
    for (const start of ['https://appassets.androidplatform.net/index.html', 'file:///app/index.html']) {
      const pushState = vi.fn(), replaceState = vi.fn(), state = { native: true };
      vi.stubGlobal('window', { location: new URL(`${start}?channel=europeNews&display=tv#app`), history: { pushState, replaceState, state } });
      pushTvBroadcastChannel('technology');
      expect(pushState).not.toHaveBeenCalled();
      expect(replaceState).toHaveBeenCalledWith(state, '', new URL(`${start}?channel=technology&display=tv#app`));
    }
  });
  it('clears an obsolete packaged channel when choosing a different display mode', () => {
    const pushState = vi.fn(), replaceState = vi.fn();
    vi.stubGlobal('window', { location: new URL('https://appassets.androidplatform.net/index.html?channel=europeNews&display=tv'), history: { pushState, replaceState, state: null } });
    pushTvDisplayMode('browse');
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, '', new URL('https://appassets.androidplatform.net/index.html?display=tv'));
  });
});
