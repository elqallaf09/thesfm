import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createTraderThemeSetMessage,
  isTraderThemeReadyMessage,
  TRADER_THEME_MESSAGE_VERSION,
  TRADER_THEME_READY_MESSAGE_TYPE,
  TRADER_THEME_SET_MESSAGE_TYPE,
} from '@/lib/trader/themeBridge';

const root = process.cwd();
const frameSource = readFileSync(
  resolve(root, 'src/app/thesfm-trader-own/TraderThemeFrame.tsx'),
  'utf8',
);
const accessFrameSource = readFileSync(
  resolve(root, 'src/app/thesfm-trader-own/TraderOwnFrame.tsx'),
  'utf8',
);
const rootLayoutSource = readFileSync(resolve(root, 'src/app/layout.tsx'), 'utf8');
const traderAssetRouteSource = readFileSync(
  resolve(root, 'src/app/thesfm-trader-own/app/[[...path]]/route.ts'),
  'utf8',
);

describe('Trader host theme bridge', () => {
  it('uses a minimal, versioned theme-only message contract', () => {
    expect(createTraderThemeSetMessage('system', 'dark')).toEqual({
      type: TRADER_THEME_SET_MESSAGE_TYPE,
      version: TRADER_THEME_MESSAGE_VERSION,
      preference: 'system',
      resolvedTheme: 'dark',
    });
    expect(createTraderThemeSetMessage('light', 'light')).toEqual({
      type: 'SFM_TRADER_THEME_SET',
      version: 1,
      preference: 'light',
      resolvedTheme: 'light',
    });
  });

  it('accepts only the exact Trader ready handshake', () => {
    expect(isTraderThemeReadyMessage({
      type: TRADER_THEME_READY_MESSAGE_TYPE,
      version: TRADER_THEME_MESSAGE_VERSION,
    })).toBe(true);

    for (const value of [
      null,
      [],
      { type: TRADER_THEME_READY_MESSAGE_TYPE },
      { type: TRADER_THEME_READY_MESSAGE_TYPE, version: 2 },
      { type: TRADER_THEME_SET_MESSAGE_TYPE, version: 1 },
      { type: TRADER_THEME_READY_MESSAGE_TYPE, version: 1, token: 'not-allowed' },
    ]) {
      expect(isTraderThemeReadyMessage(value)).toBe(false);
    }
  });

  it('validates both same origin and the exact iframe window before responding', () => {
    expect(frameSource).toContain("event.origin !== window.location.origin");
    expect(frameSource).toContain('event.source !== traderWindow');
    expect(frameSource).toContain("window.addEventListener('message', handleTraderMessage)");
    expect(frameSource).toContain("window.removeEventListener('message', handleTraderMessage)");
    expect(frameSource).toContain('target.postMessage(message, window.location.origin)');
    expect(frameSource).not.toMatch(/postMessage\([^)]*,\s*['"]\*['"]\s*\)/);
  });

  it('keeps the server authorization gate and iframe URL stable across theme changes', () => {
    expect(accessFrameSource).toContain('const access = await getTraderAccess()');
    expect(accessFrameSource).toContain("redirect(`/login?next=${encodeURIComponent(resolvePublicRoute(appRoute))}`)");
    expect(accessFrameSource).toContain('<TraderThemeFrame src={src} />');
    expect(frameSource).toContain('export default function TraderThemeFrame({ src }');
    expect(frameSource).not.toMatch(/setSrc|theme=.*src|key=.*theme/);
  });

  it('uses the system preference only when no application preference is stored', () => {
    expect(rootLayoutSource).toContain('defaultTheme="system"');
    expect(rootLayoutSource).toContain('storageKey="the-sfm-theme"');
    expect(rootLayoutSource).toContain('enableSystem');
  });

  it('allows embedding only from the same-origin application shell', () => {
    expect(traderAssetRouteSource).toContain("if (ext === '.html')");
    expect(traderAssetRouteSource).toContain("headers['X-Frame-Options'] = 'SAMEORIGIN'");
    expect(traderAssetRouteSource).toContain("headers['Content-Security-Policy'] = \"frame-ancestors 'self'\"");
  });
});
