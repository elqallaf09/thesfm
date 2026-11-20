import { afterEach, describe, expect, it, vi } from 'vitest';
import { pushTvBroadcastChannel, pushTvDisplayMode, pushTvFeature, tvDisplayModeFromPath, tvFeatureFromLocation } from '@/lib/markets-tv/display-navigation';

afterEach(() => vi.unstubAllGlobals());
describe('TV document-preserving navigation', () => {
  it('recognizes only the three display routes', () => {
    expect(tvDisplayModeFromPath('/tv/')).toBe('viewing');
    expect(tvDisplayModeFromPath('/tv/all-stocks')).toBe('browse');
    expect(tvDisplayModeFromPath('/tv/strips')).toBe('strips');
    for (const path of ['/tv/pair', '/tv/all-stocks/private', '/tv-other', '/index.html', '/assets/index.html']) expect(tvDisplayModeFromPath(path)).toBeNull();
  });
  it('restores feature identity only for its display mode, including packaged asset URLs', () => {
    for (const [address, feature] of [
      ['https://www.the-sfm.com/tv?view=brief', 'brief'],
      ['https://www.the-sfm.com/tv/all-stocks/?view=map', 'map'],
      ['https://appassets.androidplatform.net/assets/index.html?view=brief', 'brief'],
      ['file:///app/index.html?view=map', 'map'],
    ] as const) expect(tvFeatureFromLocation(new URL(address))).toBe(feature);
    for (const path of ['/tv?view=map', '/tv/all-stocks?view=brief', '/tv/strips?view=map', '/tv?view=unknown', '/tv?channel=technology']) {
      expect(tvFeatureFromLocation(new URL(path, 'https://www.the-sfm.com'))).toBeNull();
    }
  });
  it('gives the brief and map distinct history entries that survive a document reload', () => {
    for (const [feature, path] of [['brief', '/tv'], ['map', '/tv/all-stocks']] as const) {
      const pushState = vi.fn();
      vi.stubGlobal('window', { location: new URL('https://www.the-sfm.com/tv?channel=technology&display=tv#old'), history: { pushState } });
      pushTvFeature(feature);
      expect(pushState).toHaveBeenCalledOnce();
      const address = pushState.mock.calls[0][2] as URL;
      expect(address.href).toBe(`https://www.the-sfm.com${path}?display=tv&view=${feature}`);
      expect(tvFeatureFromLocation(address)).toBe(feature);
    }
  });
  it('persists packaged features without changing the asset path or native Back entries', () => {
    for (const start of ['https://appassets.androidplatform.net/assets/index.html', 'file:///app/index.html']) {
      const pushState = vi.fn(), replaceState = vi.fn(), state = { native: true };
      vi.stubGlobal('window', { location: new URL(`${start}?channel=technology&display=tv#app`), history: { pushState, replaceState, state } });
      pushTvFeature('map');
      expect(pushState).not.toHaveBeenCalled();
      expect(replaceState).toHaveBeenCalledWith(state, '', new URL(`${start}?display=tv&view=map#app`));
      expect(tvFeatureFromLocation(replaceState.mock.calls[0][2] as URL)).toBe('map');
    }
  });
  it('does not duplicate a selected feature or access a server-side window', () => {
    const pushState = vi.fn(), replaceState = vi.fn();
    for (const url of ['https://www.the-sfm.com/tv?view=brief', 'file:///app/index.html?view=brief']) {
      vi.stubGlobal('window', { location: new URL(url), history: { pushState, replaceState } });
      pushTvFeature('brief');
    }
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
    vi.stubGlobal('window', undefined);
    expect(() => pushTvFeature('map')).not.toThrow();
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
  it('clears feature identity when leaving for a display mode or broadcast', () => {
    for (const start of ['https://www.the-sfm.com/tv/all-stocks', 'https://appassets.androidplatform.net/assets/index.html', 'file:///app/index.html']) {
      for (const destination of ['browse', 'technology'] as const) {
        const pushState = vi.fn(), replaceState = vi.fn();
        vi.stubGlobal('window', { location: new URL(`${start}?view=map&display=tv`), history: { pushState, replaceState } });
        if (destination === 'browse') pushTvDisplayMode('browse'); else pushTvBroadcastChannel('technology');
        const address = (pushState.mock.calls[0] || replaceState.mock.calls[0])[2] as URL;
        expect(address.searchParams.has('view')).toBe(false);
        expect(address.searchParams.get('channel')).toBe(destination === 'technology' ? 'technology' : null);
        expect(address.searchParams.get('display')).toBe('tv');
        if (start.startsWith('https://www.')) expect(pushState).toHaveBeenCalledOnce();
        else { expect(pushState).not.toHaveBeenCalled(); expect(replaceState).toHaveBeenCalledOnce(); }
      }
    }
  });
});
