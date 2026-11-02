import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { authWebsiteUrl } from '../../../apps/expo-go/src/authPresentation';

describe('mobile authentication website navigation', () => {
  for (const product of ['finance', 'investor', 'business'] as const) {
    for (const action of ['register', 'forgot'] as const) {
      it(`${product} ${action} opens the website form with a real return route`, () => {
        const url = new URL(authWebsiteUrl('https://www.the-sfm.com/', product, action, 'ar'));
        expect(url.origin).toBe('https://www.the-sfm.com');
        expect(url.pathname).toBe('/login');
        expect(url.searchParams.get('mode')).toBe(action);
        expect(existsSync(`src/app${url.searchParams.get('next')}/page.tsx`)).toBe(true);
        expect([...url.searchParams.keys()].sort()).toEqual(['lang', 'mode', 'next']);
      });
    }
  }
  it.each(['explore', 'privacy', 'terms'] as const)('opens the public %s destination without an auth redirect', action => {
    const url = new URL(authWebsiteUrl('https://www.the-sfm.com', 'finance', action, 'fr'));
    expect(url.pathname).toBe(action === 'explore' ? '/' : `/${action}`);
    expect(url.searchParams.get('lang')).toBe('fr');
    expect(url.searchParams.has('next')).toBe(false);
    expect(url.searchParams.has('mode')).toBe(false);
  });
});
