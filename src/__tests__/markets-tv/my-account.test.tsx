import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TvMyAccountPanel } from '@/components/markets-tv/TvMyAccountPanel';

vi.mock('@/components/markets-tv/TvQr', () => ({
  TvQr: ({ value, label }: { value: string; label: string }) => <span data-qr-value={value} aria-label={label}/>,
}));

afterEach(() => vi.unstubAllGlobals());

describe('TV account profile handoff', () => {
  it.each([
    { page: 'https://www.the-sfm.com/tv?next=https://evil.example/#ABCDEF123456', configured: undefined, profile: 'https://www.the-sfm.com/profile' },
    { page: 'https://the-sfm.com/tv?token=private-device-token', configured: undefined, profile: 'https://the-sfm.com/profile' },
    { page: 'https://appassets.androidplatform.net/index.html?code=ABCDEF123456#private-device-token', configured: 'https://www.the-sfm.com', profile: 'https://www.the-sfm.com/profile' },
  ])('uses the normal profile route for $page without reading or forwarding paired credentials', ({ page, configured, profile }) => {
    const getItem = vi.fn(() => 'c'.repeat(64));
    vi.stubGlobal('React', React);
    vi.stubGlobal('window', { location: new URL(page), SFM_TV_ORIGIN: configured, localStorage: { getItem } });
    for (const language of ['ar', 'en', 'fr'] as const) {
      const html = renderToStaticMarkup(<TvMyAccountPanel language={language}/>);
      expect(html).toContain(`href="${profile}"`);
      expect(html).toContain(`data-qr-value="${profile}"`);
      expect(html).toContain('referrerPolicy="no-referrer"');
      for (const privateValue of ['ABCDEF123456', 'private-device-token', 'c'.repeat(64), 'evil.example']) expect(html).not.toContain(privateValue);
    }
    expect(getItem).not.toHaveBeenCalled();
  });
});
