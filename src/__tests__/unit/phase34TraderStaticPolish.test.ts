import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const indexHtml = read('src/trader-app/public/index.html');
const detailHtml = read('src/trader-app/public/detail.html');
const appSource = read('src/trader-app/public/app.js');
const themeBridge = read('src/trader-app/public/theme-bridge.js');
const cinema = read('src/trader-app/public/cinema.css');
const assetRoute = read('src/app/thesfm-trader-own/app/[[...path]]/route.ts');

function phase34InteractionLayer() {
  const start = cinema.indexOf('Phase 3.4 authoritative interaction lock');
  const end = cinema.length;
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return cinema.slice(start, end);
}

describe('Phase 3.4 standalone Trader contracts', () => {
  it('prepaints from the global theme preference before either Trader stylesheet loads', () => {
    for (const html of [indexHtml, detailHtml]) {
      const bridgeAt = html.indexOf('/theme-bridge.js?v=20260714-phase34');
      const tokensAt = html.indexOf('/semantic-tokens.css?v=20260713-central-system');
      const cinemaAt = html.indexOf('/cinema.css?v=20260717-shell-unify');

      expect(bridgeAt).toBeGreaterThan(-1);
      expect(tokensAt).toBeGreaterThan(bridgeAt);
      expect(cinemaAt).toBeGreaterThan(tokensAt);
    }

    expect(themeBridge).toContain('const GLOBAL_THEME_STORAGE_KEY = "the-sfm-theme"');
    expect(themeBridge).toContain('const initialPreference = readGlobalPreference()');
    expect(themeBridge).toContain('applyTheme(initialPreference, resolveTheme(initialPreference))');
    expect(themeBridge).toContain('if (event.key !== GLOBAL_THEME_STORAGE_KEY) return');
    expect(themeBridge).toContain('if (!preferenceChanged && !resolvedThemeChanged && !bodyNeedsSync)');
    expect(themeBridge).toContain('if (resolvedThemeChanged)');
    expect(themeBridge).not.toMatch(/sfmTraderTheme|sfmTraderSettings:v1|the-sfm-trader-settings|sfm_settings/);
  });

  it('uses an origin-checked, theme-only parent handshake', () => {
    expect(themeBridge).toContain('event.origin !== window.location.origin');
    expect(themeBridge).toContain('event.source !== window.parent');
    expect(themeBridge).toContain('window.parent.postMessage(message, window.location.origin)');
    expect(themeBridge).toContain('keys.join(",") !== "preference,resolvedTheme,type,version"');
    expect(themeBridge).not.toMatch(/postMessage\([^)]*,\s*["']\*["']\s*\)/);
    expect(themeBridge).not.toMatch(/auth|session|serviceRole|accessToken|refreshToken/i);
    expect(assetRoute).toContain(".replaceAll('src=\"/theme-bridge.js', 'src=\"/thesfm-trader-own/app/theme-bridge.js')");
  });

  it('removes local theme, language, and return-to-platform controls from every Trader shell', () => {
    for (const obsoleteMarkup of [
      'data-language=',
      'terminal-language-switcher',
      'theme-switcher-host',
      'id="theme-switcher"',
      'workspace-exit-link',
      'workspace-exit-chip',
      'target="_top"',
    ]) {
      expect(indexHtml, obsoleteMarkup).not.toContain(obsoleteMarkup);
    }

    for (const obsoleteHandler of [
      'function setTerminalLanguage',
      'function syncLanguageButtons',
      'function selectThemePreference',
      'function persistThemePreference',
      'data-theme-menu-toggle',
      'data-theme-option',
    ]) {
      expect(appSource, obsoleteHandler).not.toContain(obsoleteHandler);
    }

    expect(appSource).not.toContain('localStorage.setItem("sfmTraderTheme"');
    expect(appSource).toContain('localStorage.removeItem("sfmTraderTheme")');
    expect(indexHtml).toContain('class="provider-pill"');
    expect(indexHtml).toContain('data-toggle-ticker');
    expect(indexHtml).toContain('id="topbar-market-selector"');
  });

  it('keeps language synchronized through the shared global key and events without local buttons', () => {
    expect(appSource).toContain('const LANG_STORAGE_KEY = "sfm_lang"');
    expect(appSource).toContain('const LANG_EVENT = "sfm-language-change"');
    expect(appSource).toContain('if ([LANG_STORAGE_KEY, keys.settings].includes(event.key || ""))');
    expect(appSource).toContain('window.addEventListener(LANG_EVENT, () =>');
    expect(appSource).toContain('document.documentElement.dir = dir');
    expect(appSource).toContain('document.documentElement.lang = lang');
  });

  it('defines semantic button variants with tactile, accessible, reduced-motion states', () => {
    const layer = phase34InteractionLayer();

    for (const variant of [
      '.primary-button',
      '.secondary-button',
      '.outline-button',
      '.ghost-btn',
      '.danger-btn',
      '.icon-only-button',
      '.toolbar-button',
      '.seg-tabs button',
      '.filter-chip',
      '.tab-button',
    ]) {
      expect(layer, variant).toContain(variant);
    }

    expect(layer).toContain('min-height: var(--control-h)');
    expect(layer).toContain('font-family: var(--font-ui) !important');
    expect(layer).toContain('transition:');
    expect(layer).toContain('var(--duration-fast) var(--ease)');
    expect(layer).toContain(':not(:disabled):hover');
    expect(layer).toContain(':not(:disabled):active');
    expect(layer).toContain(':is(:disabled, [aria-disabled="true"])');
    expect(layer).toContain('@media (prefers-reduced-motion: reduce)');
    expect(layer).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|(?:linear|radial|conic)-gradient\(/i);
    expect(layer).not.toMatch(/animation(?:-name)?\s*:/i);
    expect(cinema).toMatch(/button:focus-visible,[\s\S]*?box-shadow:\s*var\(--focus-shadow\)/);
  });
});
