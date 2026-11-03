import { describe, expect, it } from 'vitest';
import { authWebsiteUrl } from '../../../apps/expo-go/src/authPresentation';

describe('mobile authentication website navigation', () => {
  it.each(['explore', 'privacy', 'terms'] as const)('opens the public %s destination without an auth redirect', action => {
    const url = new URL(authWebsiteUrl('https://www.the-sfm.com', 'finance', action, 'fr'));
    expect(url.pathname).toBe(action === 'explore' ? '/' : `/${action}`);
    expect(url.searchParams.get('lang')).toBe('fr');
    expect(url.searchParams.has('next')).toBe(false);
    expect(url.searchParams.has('mode')).toBe(false);
  });
});
