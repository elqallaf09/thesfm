import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const cinema = read('src/trader-app/public/cinema.css');
const indexHtml = read('src/trader-app/public/index.html');
const detailHtml = read('src/trader-app/public/detail.html');
const serviceWorker = read('src/trader-app/public/service-worker.js');
const themes = read('src/styles/themes.css');
const tokens = read('src/styles/tokens.css');
const themeBridge = read('src/trader-app/public/theme-bridge.js');
const traderAssetRoute = read('src/app/thesfm-trader-own/app/[[...path]]/route.ts');
const finalMarker = 'Final semantic visual-system lock';
const finalLayer = cinema.slice(cinema.indexOf(finalMarker));
const activeComponentsStart = finalLayer.indexOf('html[data-theme] body,');
const finalAliasBridgeStart = finalLayer.indexOf('The final selector intentionally');
const activeComponents = finalLayer.slice(activeComponentsStart, finalAliasBridgeStart);

function themeBlock(selector: ':root' | '.dark') {
  const start = themes.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const end = selector === ':root' ? themes.indexOf('\n.dark {', start) : themes.length;
  return themes.slice(start, end);
}

function declarationValues(source: string, property: string) {
  const pattern = new RegExp(`(?:^|[;{]\\s*)${property}\\s*:\\s*([^;}]+)`, 'gim');
  return [...source.matchAll(pattern)].map(match => match[1].trim());
}

function usesOnlyNamedDepth(values: string[]) {
  return values.every((rawValue) => {
    const value = rawValue.replace(/\s*!important\s*$/, '').trim();
    if (value === 'none') return true;
    return value.split(',').every(part => /^var\(--[a-z0-9-]+\)$/i.test(part.trim()));
  });
}

describe('standalone Trader visual-system contract', () => {
  it('keeps the semantic lock last so legacy cinema layers cannot override it', () => {
    expect(cinema.indexOf(finalMarker)).toBeGreaterThan(cinema.indexOf('PREMIUM DAYLIGHT TERMINAL'));
    expect(finalLayer).toContain('html[data-theme] .terminal-sidebar');
    expect(finalLayer).toContain('html[data-theme] :is(.action-btn');
    expect(finalLayer).toContain('html[data-theme] :is(.chart-grid line');
  });

  it('keeps the complete cinema bundle free of raw palette, gradient, font, and depth declarations', () => {
    const fontFamilies = declarationValues(cinema, 'font-family');
    const radii = declarationValues(cinema, 'border-radius');
    const shadows = [
      ...declarationValues(cinema, 'box-shadow'),
      ...declarationValues(cinema, 'text-shadow'),
    ];

    expect(cinema).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i);
    expect(cinema).not.toMatch(/(?:linear|radial|conic)-gradient\(/i);
    expect(cinema).not.toMatch(/\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto|JetBrains Mono)\b/i);
    expect(fontFamilies.every((value) => /^var\(--font-(?:ui|data)\)$/.test(value.replace(/\s*!important\s*$/, '')))).toBe(true);
    expect(radii.every((value) => {
      const normalized = value.replace(/\s*!important\s*$/, '').trim();
      return normalized === '0' || normalized === 'inherit' || /^var\(--[a-z0-9-]+\)$/i.test(normalized);
    })).toBe(true);
    expect(usesOnlyNamedDepth(shadows)).toBe(true);
  });

  it('consumes the approved central light palette and coherent dark palette', () => {
    const light = themeBlock(':root');
    const approved = {
      background: '#F7F8FE',
      surface: '#FFFFFF',
      'surface-muted': '#EFF1FA',
      foreground: '#14183A',
      'foreground-secondary': '#3A4160',
      'foreground-muted': '#5B6178',
      border: '#E9EBF7',
      'border-strong': '#6E759C',
      primary: '#4F46E5',
      'primary-hover': '#4338CA',
      'primary-soft': '#ECEDFB',
      accent: '#0B7C72',
      success: '#18794E',
      warning: '#8A4B0F',
      danger: '#C21744',
      info: '#1D65A6',
      'focus-ring': '#4F46E5',
    } as const;
    for (const [token, value] of Object.entries(approved)) {
      expect(light, token).toContain(`--${token}: ${value};`);
    }

    const dark = themeBlock('.dark');
    for (const token of ['background', 'surface', 'surface-elevated', 'foreground', 'border', 'primary', 'accent', 'success', 'warning', 'danger', 'chart-grid']) {
      expect(dark, token).toMatch(new RegExp(`--${token}\\s*:`));
    }
    expect(cinema).not.toMatch(/--(?:terminal-|light-|film-(?:black|ink|panel|panel-strong|steel|cyan|emerald|gold|red|violet|edge|edge-hot|shadow-deep|shadow-raised|button-depth(?:-dark)?)|sfm-(?:terminal-bg|panel|panel-soft|card|card-strong|line|line-strong|gold|gold-soft|green|red|blue|text|muted)|cyan\b|green\b|red\b|blue\b|teal\b)/);
    expect(finalLayer).not.toMatch(/^\s*--trader-(?:background|primary|chart-grid)\s*:/m);
    expect(finalLayer).not.toMatch(/^\s*--(?:background|surface|foreground|primary|accent|success|warning|danger|info):\s*#/m);
    expect(finalLayer).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i);
    expect(activeComponents).not.toMatch(/var\(--trader-/);
    expect(activeComponents).not.toMatch(/#[\da-f]{3,8}\b/i);
  });

  it('wins the cascade for every rendered workspace alias and high-impact surface', () => {
    const bridge = finalLayer.slice(finalAliasBridgeStart);
    for (const mapping of [
      '--trader-deck: var(--surface-muted);',
      '--trader-surface-raised: var(--surface-elevated);',
      '--trader-surface-muted: var(--surface-muted);',
      '--trader-edge: var(--border-strong);',
      '--trader-edge-soft: var(--border);',
      '--trader-text: var(--foreground);',
      '--trader-muted: var(--foreground-muted);',
      '--trader-positive: var(--success);',
      '--trader-negative: var(--danger);',
      '--trader-neutral: var(--foreground-muted);',
      '--trader-selected: var(--primary);',
      '--trader-accent: var(--accent);',
      '--trader-focus: var(--focus-shadow);',
      '--session-americas: var(--chart-1);',
      '--session-europe: var(--chart-5);',
      '--session-gulf: var(--chart-4);',
      '--session-fx: var(--chart-2);',
      '--session-crypto: var(--chart-3);',
    ]) expect(bridge, mapping).toContain(mapping);

    for (const selector of [
      'html[data-theme] .provider-status-card',
      'html[data-theme] :is(.trader-command-deck, .analysis-terminal, .market-map-workspace)',
      'html[data-theme] :is(.session-track, .market-session-terminal .st-track)',
      'html[data-theme] .heatmap-tile',
      'html[data-theme] .mobile-more-menu',
      'html[data-theme] .form-field-error',
    ]) expect(bridge, selector).toContain(selector);

    expect(bridge).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|(?:linear|radial|conic)-gradient\(/i);
  });

  it('loads one UI family and scopes mono to market-data roles', () => {
    for (const html of [indexHtml, detailHtml]) {
      expect(html).toContain('family=IBM+Plex+Mono');
      expect(html).toContain('family=IBM+Plex+Sans+Arabic');
      expect(html).not.toMatch(/family=(?:Cairo|Tajawal|Inter)/);
    }
    expect(tokens).toContain('--font-ui: var(--font-ibm-plex-sans-arabic');
    expect(tokens).toContain('--font-data: var(--font-ibm-plex-mono');
    expect(finalLayer).toContain('html[data-theme] body *');
    expect(finalLayer).toContain('[data-market-value]');
    expect(finalLayer).toContain('font-family: var(--font-ui);');
    expect(finalLayer).toContain('font-family: var(--font-data);');
    expect(finalLayer.indexOf('font-family: var(--font-data);'))
      .toBeGreaterThan(finalLayer.indexOf('html[data-theme] body *'));
    expect(finalLayer).toMatch(/html\[data-theme\] :is\([\s\S]*?\.market-value,[\s\S]*?\[data-numeric="true"\][\s\S]*?\) \{\s*font-family: var\(--font-data\);/);

    for (const uiRule of [
      /\.brand-mark\s*\{[^}]*font-family:\s*var\(--font-ui\)/,
      /\.brand-fallback\s*\{[^}]*font-family:\s*var\(--font-ui\)/,
      /\.nav-group-label\s*\{[^}]*font-family:\s*var\(--font-ui\)/,
      /\.session-pill\s*\{[^}]*font-family:\s*var\(--font-ui\)/,
      /\.settings-section-label\s*\{[^}]*font-family:\s*var\(--font-ui\)/,
      /\.brand-card small,\s*\.sidebar-nav small,\s*\.sidebar-status small,\s*\.card-kicker,\s*\.eyebrow\s*\{[^}]*font-family:\s*var\(--font-ui\)/,
    ]) expect(cinema).toMatch(uiRule);

    expect(cinema).not.toMatch(/(?:\.brand-mark|\.brand-fallback|\.nav-group-label|\.session-pill|\.settings-section-label)\s*\{[^}]*font-family:\s*var\(--font-data\)/);
  });

  it('serves and loads the shared token source before the cache-busted cinema bridge', () => {
    for (const html of [indexHtml, detailHtml]) {
      expect(html).toContain('/theme-bridge.js?v=20260714-phase34');
      expect(html).toContain('/semantic-tokens.css?v=20260713-central-system');
      expect(html).toContain('/cinema.css?v=20260714-phase34');
      expect(html.indexOf('/theme-bridge.js')).toBeLessThan(html.indexOf('/semantic-tokens.css'));
      expect(html.indexOf('/semantic-tokens.css')).toBeLessThan(html.indexOf('/cinema.css'));
      expect(html).not.toMatch(/<meta name="theme-color" content="#[0-9a-f]+"/i);
      expect(html).not.toMatch(/\/(?:styles|desktop-balance)\.css/);
    }
    expect(themeBridge).toContain('getPropertyValue("--background")');
    expect(traderAssetRoute).not.toContain('href="/styles.css');
    expect(traderAssetRoute).not.toContain('href="/desktop-balance.css');
    expect(traderAssetRoute).toContain("params.path?.join('/') === 'semantic-tokens.css'");
    expect(traderAssetRoute).toContain("path.join(process.cwd(), 'src', 'styles', 'tokens.css')");
    expect(traderAssetRoute).toContain("path.join(process.cwd(), 'src', 'styles', 'themes.css')");
    expect(traderAssetRoute).toContain(".replaceAll('src=\"/theme-bridge.js', 'src=\"/thesfm-trader-own/app/theme-bridge.js')");
    expect(serviceWorker).toContain('/semantic-tokens.css?v=20260713-central-system');
    expect(serviceWorker).toContain('/theme-bridge.js?v=20260714-phase34');
    expect(serviceWorker).toContain('/cinema.css?v=20260714-phase34');
    expect(serviceWorker).not.toMatch(/\/(?:styles|desktop-balance)\.css/);
  });

  it('keeps ordinary high-impact surfaces flat while reserving a gradient for heroes', () => {
    expect(themes).toContain('--hero-gradient: linear-gradient');
    expect(finalLayer).not.toContain('--trader-hero-gradient');
    for (const selector of ['.terminal-sidebar {', '.sidebar-nav a {', '.terminal-topbar,', '.table-shell,']) {
      const start = finalLayer.indexOf(selector);
      expect(start, selector).toBeGreaterThanOrEqual(0);
      const block = finalLayer.slice(start, finalLayer.indexOf('}', start));
      expect(block, selector).not.toContain('gradient(');
    }

    expect(cinema).toMatch(/html\[data-theme="light"\]\s+:is\(\.page-hero,\s*\.command-hero\)\s*\{[^}]*background:\s*var\(--hero-gradient\)\s*!important/);
    expect(cinema).not.toMatch(/html\[data-theme="light"\]\s+:is\([^)]*\.market-leadership\s+\.leadership-card[^)]*\)\s*\{[^}]*var\(--hero-gradient\)/);
    expect(cinema).not.toMatch(/(?:\.terminal-topbar|\.ticker-strip|\.panel)::before[^{}]*\{[^{}]*background:\s*var\(--hero-gradient\)/);
  });

  it('keeps high-specificity light controls and ordinary metadata on semantic surfaces', () => {
    expect(cinema).toMatch(/html\[data-theme="light"\]\s+\.market-overview\s+\.mo-timeframes button\s*\{[^}]*background:\s*var\(--control-background\)\s*!important/);
    expect(cinema).not.toMatch(/html\[data-theme="light"\]\s+:is\([^)]*\.market-overview\s+\.mo-timeframes button[^)]*\)\s*\{[^}]*background:\s*var\(--info-soft\)/);
    expect(cinema).not.toMatch(/html\[data-theme="light"\][^{]*(?:\.about-panel\s+\.fact-row|\.detail-chart-wrap|\.chart-empty)[^{]*\{[^}]*background:\s*var\(--danger-soft\)/);
    expect(cinema).toMatch(/html\[data-theme\]\s+\.settings-section-label\s*\{[^}]*color:\s*var\(--foreground-secondary\)\s*!important;[^}]*font-family:\s*var\(--font-ui\)/);
    expect(finalLayer).toMatch(/html\[data-theme\]\s+\.detail-chart-wrap:is\(\.up,\s*\.down\)\s*\{[^}]*background:\s*var\(--surface-muted\)\s*!important/);

    expect(cinema).toMatch(/html\[data-theme="light"\]\s+\.market-overview\s+\.mo-timeframes button\.is-active\s*\{[^}]*background:\s*var\(--primary\)\s*!important;[^}]*color:\s*var\(--primary-foreground\)\s*!important/);
  });

  it('keeps ordinary provider diagnostics neutral and status colors explicit', () => {
    expect(cinema).not.toMatch(/\.(?:provider-state-panel|provider-state-card|provider-market-summary-card|provider-market-diagnostics|provider-market-state|provider-status-banner|provider-metric-card|provider-feature-strip|provider-diagnostics-panel|provider-diagnostic-group|provider-symbol-list)\s*\{[^}]*(?:var\(--info(?:-soft)?\)|var\(--warning(?:-soft)?\))/);
    expect(cinema).toMatch(/\.provider-status-banner p,\s*\.provider-clean-note\s*\{[^}]*color:\s*var\(--foreground-secondary\)/);
    expect(cinema).toMatch(/\.provider-warning\s*\{[^}]*background:\s*var\(--warning-soft\)/);
    expect(finalLayer).toMatch(/\.provider-status-banner\.ok[^)]*\.provider-metric-card\.ok[^)]*\.provider-market-state\.ok[^)]*\)\s*\{[^}]*background:\s*var\(--success-soft\)\s*!important/);
    expect(finalLayer).toMatch(/\.provider-status-banner\.warn[^)]*\.provider-metric-card\.warn[^)]*\.provider-market-state\.warn[^)]*\.provider-warning[^)]*\)\s*\{[^}]*background:\s*var\(--warning-soft\)\s*!important/);
  });

  it('keeps sidebar edge and scroll spacing logical for RTL and LTR', () => {
    expect(cinema).toContain('border-inline-end: 1px solid var(--border);');
    expect(cinema).not.toContain('var(--terminal-border)');
    expect(cinema).toContain('padding-inline-end: 4px;');
    expect(cinema).not.toMatch(/\.terminal-sidebar\s*\{[^}]*border-left(?:-color)?\s*:/);
    expect(cinema).not.toMatch(/\.sidebar-nav\s*\{[^}]*padding-left\s*:/);
  });
});
