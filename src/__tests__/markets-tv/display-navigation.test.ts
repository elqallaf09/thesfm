import { afterEach, describe, expect, it, vi } from 'vitest';
import { pushTvDisplayMode, tvDisplayModeFromPath } from '@/lib/markets-tv/display-navigation';

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
});
