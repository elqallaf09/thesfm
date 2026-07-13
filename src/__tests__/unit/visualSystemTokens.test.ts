import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const themes = read('src/styles/themes.css');
const tokens = read('src/styles/tokens.css');
const globals = read('src/app/globals.css');
const normalizedGlobals = globals.replace(/\r\n/g, '\n');
const layout = read('src/app/layout.tsx');
const loginPage = read('src/app/(auth)/login/page.tsx');
const loginStyles = loginPage.slice(loginPage.indexOf('<style jsx global>'));
const traderAccessGate = read('src/app/thesfm-trader-own/TraderAccessGate.tsx');
const appHeader = read('src/components/AppHeader.tsx');
const shariaNewsStyles = read('src/components/shariah-stocks/ShariahStocksNewsPage.module.css');
const tabs = read('src/components/ui/tabs.tsx');
const toaster = read('src/components/ui/sonner.tsx');
const sheet = read('src/components/ui/sheet.tsx');
const alertDialog = read('src/components/ui/alert-dialog.tsx');
const drawer = read('src/components/ui/drawer.tsx');
const sidebarPrimitive = read('src/components/ui/sidebar.tsx');

const requiredSemanticTokens = [
  'background',
  'surface',
  'surface-elevated',
  'surface-muted',
  'foreground',
  'foreground-secondary',
  'foreground-muted',
  'border',
  'border-strong',
  'primary',
  'primary-hover',
  'primary-foreground',
  'accent',
  'accent-hover',
  'success',
  'warning',
  'danger',
  'info',
  'focus-ring',
  'sidebar-background',
  'sidebar-foreground',
  'sidebar-active',
  'sidebar-hover',
  'chart-grid',
  'chart-label',
] as const;

function themeBlock(selector: ':root' | '.dark') {
  const start = themes.indexOf(`${selector} {`);
  expect(start, `${selector} theme exists`).toBeGreaterThanOrEqual(0);
  const nextSelector = selector === ':root' ? themes.indexOf('\n.dark {', start) : themes.length;
  return themes.slice(start, nextSelector);
}

function hexToken(block: string, token: string) {
  const value = block.match(new RegExp(`--${token}:\\s*(#[0-9A-F]{6})`, 'i'))?.[1];
  expect(value, `${token} uses an auditable hex source value`).toBeDefined();
  return value!;
}

function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g)!.map(channel => parseInt(channel, 16) / 255);
    const linear = channels.map(channel => channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

describe('central visual-system contract', () => {
  it('defines every required semantic token in light and dark mode', () => {
    for (const block of [themeBlock(':root'), themeBlock('.dark')]) {
      for (const token of requiredSemanticTokens) {
        expect(block, token).toMatch(new RegExp(`--${token}\\s*:`));
      }
    }
  });

  it('locks the approved light palette at the semantic source', () => {
    const light = themeBlock(':root');
    const approved = {
      background: '#F4F7FB',
      surface: '#FFFFFF',
      'surface-muted': '#F8FAFC',
      foreground: '#0F2742',
      'foreground-secondary': '#334155',
      'foreground-muted': '#627287',
      border: '#E2E8F0',
      'border-strong': '#CBD5E1',
      primary: '#1769D2',
      'primary-hover': '#1258B3',
      'primary-soft': '#EAF3FF',
      accent: '#0F9F9A',
      'accent-hover': '#0B7F7A',
      'accent-soft': '#E6F8F6',
      success: '#15803D',
      warning: '#B45309',
      danger: '#C62828',
      info: '#0369A1',
      'focus-ring': '#2563EB',
    } as const;

    for (const [token, value] of Object.entries(approved)) {
      expect(light, token).toContain(`--${token}: ${value};`);
    }
  });

  it('keeps core text, button, accent, and sidebar pairs at WCAG AA contrast', () => {
    for (const block of [themeBlock(':root'), themeBlock('.dark')]) {
      const pairs = [
        ['foreground', 'background'],
        ['foreground-secondary', 'surface'],
        ['foreground-muted', 'surface'],
        ['foreground-muted', 'background'],
        ['primary-foreground', 'primary'],
        ['accent-foreground', 'accent'],
        ['sidebar-active-foreground', 'sidebar-active'],
      ] as const;

      for (const [foreground, background] of pairs) {
        expect(
          contrastRatio(hexToken(block, foreground), hexToken(block, background)),
          `${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      for (const heroStop of ['hero-gradient-start', 'hero-gradient-mid', 'hero-gradient-end']) {
        expect(
          contrastRatio(hexToken(block, 'hero-foreground-muted'), hexToken(block, heroStop)),
          `hero-foreground-muted on ${heroStop}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('bridges popovers, tooltips, shadcn colors, and active legacy aliases', () => {
    for (const token of [
      'popover',
      'popover-foreground',
      'tooltip',
      'tooltip-foreground',
      'card',
      'input',
      'ring',
      'sfm-card-bg',
      'sfm-canvas',
      'sfm-surface',
      'sfm-secondary',
      'sfm-success',
    ]) {
      expect(themes, token).toMatch(new RegExp(`--${token}\\s*:`));
    }
    expect(globals).toContain('--color-popover: var(--popover)');
    expect(globals).toContain('--color-tooltip: var(--tooltip)');
  });

  it('uses IBM Plex Sans Arabic globally and scopes IBM Plex Mono to data roles', () => {
    const htmlTag = layout.match(/<html[\s\S]*?>/)?.[0] ?? '';
    const bodyTag = layout.match(/<body[\s\S]*?>/)?.[0] ?? '';

    expect(layout).toContain('IBM_Plex_Sans_Arabic');
    expect(layout).toContain('IBM_Plex_Mono');
    expect(layout).not.toMatch(/\bCairo\b|\bTajawal\b/);
    expect(htmlTag).toContain('ibmPlexSansArabic.variable');
    expect(htmlTag).toContain('ibmPlexMono.variable');
    expect(bodyTag).not.toContain('ibmPlexSansArabic.variable');
    expect(bodyTag).not.toContain('ibmPlexMono.variable');
    expect(tokens).toContain('--font-ui: var(--font-ibm-plex-sans-arabic');
    expect(tokens).toContain('--font-data: var(--font-ibm-plex-mono');
    expect(globals).toContain('--font-sans: "IBM Plex Sans Arabic", "IBM Plex Sans Arabic Fallback"');
    expect(globals).toContain('--font-mono: "IBM Plex Mono", "IBM Plex Mono Fallback"');
    expect(globals).not.toContain('--font-sans: var(--font-ui)');
    expect(globals).not.toContain('--font-mono: var(--font-data)');
    expect(globals).toContain('font-family:var(--font-ui)');
    expect(globals).toContain('font-family: var(--font-data) !important');
    expect(globals).not.toMatch(/body\s*\{[^}]*font-family\s*:\s*var\(--font-data\)/);
    expect(globals).not.toMatch(/font(?:-family)?\s*:[^;]*(?:Tajawal|Cairo)[^;]*!important/i);
    expect(globals).toContain('.monaco-editor *,');
    expect(globals).toContain('.cm-editor *,');
    expect(globals).toContain('[data-editor-root] *,');
    expect(globals).toContain('.katex *,');
    expect(globals).toContain('mjx-container *');
    expect(globals).toContain('body :where(input, textarea, select):not(');
    expect(globals).toContain('[class*="Button"]{font-family:var(--font-ui) !important;');
    expect(globals.indexOf('font-family: var(--font-data) !important'))
      .toBeGreaterThan(globals.indexOf('.auth-input {'));
  });

  it('keeps authoritative legacy buttons and cards on flat semantic surfaces', () => {
    const primaryStart = normalizedGlobals.indexOf('.gold-btn,\n.mini-gold,');
    const primaryEnd = normalizedGlobals.indexOf('\n}', primaryStart) + 2;
    const primaryBlock = normalizedGlobals.slice(primaryStart, primaryEnd);
    const cardStart = normalizedGlobals.indexOf('.sfm-app-card,\n.sfm-card,');
    const cardEnd = normalizedGlobals.indexOf('\n}\n\n.sfm-app-card {', cardStart) + 2;
    const cardBlock = normalizedGlobals.slice(cardStart, cardEnd);

    expect(primaryStart).toBeGreaterThanOrEqual(0);
    expect(primaryBlock).toContain('background: var(--primary) !important');
    expect(primaryBlock).toContain('color: var(--primary-foreground) !important');
    expect(primaryBlock).toContain('border-color: var(--primary) !important');
    expect(primaryBlock).toContain('box-shadow: var(--shadow-xs) !important');
    expect(primaryBlock).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|gradient\(/i);

    expect(cardStart).toBeGreaterThanOrEqual(0);
    expect(cardBlock).toContain('border-color: var(--border) !important');
    expect(cardBlock).toContain('box-shadow: var(--shadow-card) !important');
    expect(cardBlock).not.toMatch(/border-color:\s*rgba|box-shadow:\s*[^;]*rgba/i);
    expect(globals).not.toContain('box-shadow: 0 16px 40px rgba(24, 212, 212, 0.28) !important');
  });

  it('keeps the authoritative application modal flat and theme-semantic', () => {
    const modalStart = normalizedGlobals.indexOf('html:has(:where(.sfm-modal-overlay');
    const modalEnd = normalizedGlobals.indexOf('@media (max-width: 760px)', modalStart);
    const modalLayer = normalizedGlobals.slice(modalStart, modalEnd);

    expect(modalStart).toBeGreaterThanOrEqual(0);
    expect(modalEnd).toBeGreaterThan(modalStart);
    expect(modalLayer).toContain('background: var(--background-overlay) !important');
    expect(modalLayer).toContain('border: 1px solid var(--border) !important');
    expect(modalLayer).toContain('background: var(--surface-elevated) !important');
    expect(modalLayer).toContain('box-shadow: var(--shadow-popover) !important');
    expect(modalLayer).toContain('background: var(--surface-muted) !important');
    expect(modalLayer).toContain('color: var(--foreground) !important');
    expect(modalLayer).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|(?:linear|radial)-gradient\(/i);
    expect(globals).not.toContain('.dark .sfm-modal-header');
    expect(globals).not.toContain('.dark .sfm-modal-footer');
  });

  it('keeps the app header on semantic surfaces and restrained UI typography', () => {
    expect(appHeader).toContain('font-family: var(--font-ui)');
    expect(appHeader).toContain('background: var(--surface)');
    expect(appHeader).toContain('color: var(--foreground-muted)');
    expect(appHeader).not.toMatch(/\bTajawal\b|\bCairo\b|#[0-9a-f]{3,8}|rgba\(|(?:linear|radial)-gradient/i);
    expect(appHeader).not.toMatch(/font-weight:\s*(?:[789]00|[789]\d\d)/);
    expect(globals).not.toContain('body.energy-route-active .sfm-global-header');
    expect(globals).not.toContain('body.energy-route-active .sfm-app-layout');
  });

  it('provides a semantic secondary news accent with safe fallbacks', () => {
    const shellStart = globals.indexOf('.news-page-shell[data-news-page-shell="true"] {');
    const shellEnd = globals.indexOf('.news-page-shell[data-news-page-shell="true"],', shellStart);
    const newsShellTokens = globals.slice(shellStart, shellEnd);

    expect(globals).toContain('--news-accent-2: var(--accent)');
    expect(globals).toContain('var(--news-accent-2, var(--primary))');
    expect(shariaNewsStyles).toContain('--sharia-primary: var(--primary)');
    expect(shariaNewsStyles).toContain('--sharia-accent: var(--accent)');
    expect(shariaNewsStyles).toContain('background: var(--sharia-surface)');
    expect(shariaNewsStyles).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|\bTajawal\b|\bArial\b/i);
    expect(globals).not.toContain('var(--news-accent-2)');
    expect(shariaNewsStyles).not.toContain('var(--news-accent-2)');
    expect(newsShellTokens).toContain('--news-bg: var(--background)');
    expect(newsShellTokens).toContain('--news-card: var(--surface)');
    expect(newsShellTokens).toContain('--news-accent: var(--primary)');
    expect(newsShellTokens).toContain('font-family: var(--font-ui)');
    expect(newsShellTokens).not.toMatch(/\bTajawal\b|#[0-9a-f]{3,8}|rgba\(/i);
    expect(globals).toContain('--news-bg-base: var(--background) !important');
    expect(globals).toContain('--news-bg-pattern: none !important');
  });

  it('keeps authentication and trader access states on the semantic contract', () => {
    expect(loginStyles).toContain('background:var(--background)');
    expect(loginStyles).toContain('background:var(--hero-gradient)');
    expect(loginStyles).toContain('background:var(--primary)');
    expect(loginStyles).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|\bTajawal\b|\bArial\b/i);

    expect(traderAccessGate).toContain('background:var(--background)');
    expect(traderAccessGate).toContain('background:var(--surface-elevated)');
    expect(traderAccessGate).toContain('outline:2px solid var(--focus-ring)');
    expect(traderAccessGate).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|(?:linear|radial)-gradient/i);
  });

  it('keeps navigation and shared primitives flat and theme-safe', () => {
    expect(globals).not.toContain('SFM PREMIUM DAYLIGHT UI');
    expect(globals).not.toContain('.sfm-mobile-view-mode');
    expect(tabs).not.toMatch(/bg-gradient|from-blue|to-cyan|border-cyan/);
    expect(toaster).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/i);
    expect(toaster).toContain('bg-popover');
  });

  it('keeps modal overlays, sheets, and sidebar utilities on direct semantic tokens', () => {
    for (const source of [sheet, alertDialog, drawer]) {
      expect(source).toContain('bg-[var(--background-overlay)]');
      expect(source).not.toContain('bg-black/80');
    }
    expect(sheet).toContain('border border-border bg-popover');
    expect(sheet).toContain('text-popover-foreground');
    expect(sheet).toContain('shadow-[var(--shadow-popover)]');
    expect(globals).toContain('--color-sidebar-ring: var(--focus-ring)');
    expect(sidebarPrimitive).not.toContain('hsl(var(--sidebar-');
    expect(sidebarPrimitive).toContain('shadow-[0_0_0_1px_var(--sidebar-border)]');
    expect(sidebarPrimitive).toContain('hover:shadow-[0_0_0_1px_var(--sidebar-accent)]');
  });
});
