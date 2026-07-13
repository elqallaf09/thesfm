import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const cinema = read('src/trader-app/public/cinema.css');
const detailStyles = read('src/trader-app/public/styles.css');
const indexHtml = read('src/trader-app/public/index.html');
const detailHtml = read('src/trader-app/public/detail.html');
const finalMarker = 'Final semantic visual-system lock';
const finalLayer = cinema.slice(cinema.indexOf(finalMarker));
const activeComponents = finalLayer.slice(finalLayer.indexOf('html[data-theme] body,'));

function semanticBlock(selector: ':root' | 'html[data-theme="light"]') {
  const start = finalLayer.indexOf(`${selector},`) >= 0
    ? finalLayer.indexOf(`${selector},`)
    : finalLayer.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  const end = selector === ':root'
    ? finalLayer.indexOf('html[data-theme="light"] {', start)
    : finalLayer.indexOf('html[data-theme] body,', start);
  return finalLayer.slice(start, end);
}

describe('standalone Trader visual-system contract', () => {
  it('keeps the semantic lock last so legacy cinema layers cannot override it', () => {
    expect(cinema.indexOf(finalMarker)).toBeGreaterThan(cinema.indexOf('PREMIUM DAYLIGHT TERMINAL'));
    expect(finalLayer).toContain('html[data-theme] .terminal-sidebar');
    expect(finalLayer).toContain('html[data-theme] :is(.action-btn');
    expect(finalLayer).toContain('html[data-theme] :is(.chart-grid line');
  });

  it('uses the approved light palette and a coherent dark palette', () => {
    const light = semanticBlock('html[data-theme="light"]');
    const approved = {
      background: '#F4F7FB',
      surface: '#FFFFFF',
      'surface-muted': '#F8FAFC',
      foreground: '#0F2742',
      'foreground-secondary': '#334155',
      'foreground-muted': '#64748B',
      border: '#E2E8F0',
      'border-strong': '#CBD5E1',
      primary: '#1769D2',
      'primary-hover': '#1258B3',
      'primary-soft': '#EAF3FF',
      accent: '#0F9F9A',
      success: '#15803D',
      warning: '#B45309',
      danger: '#C62828',
      info: '#0369A1',
      'focus-ring': '#2563EB',
    } as const;
    for (const [token, value] of Object.entries(approved)) {
      expect(light, token).toContain(`--${token}: ${value};`);
    }

    const dark = semanticBlock(':root');
    for (const token of ['background', 'surface', 'surface-elevated', 'foreground', 'border', 'primary', 'accent', 'success', 'warning', 'danger', 'chart-grid']) {
      expect(dark, token).toMatch(new RegExp(`--${token}\\s*:`));
    }
    expect(dark).toContain('--trader-background: var(--background);');
    expect(dark).toContain('--trader-primary: var(--primary);');
    expect(dark).toContain('--trader-chart-grid: var(--chart-grid);');
    expect(activeComponents).not.toMatch(/var\(--trader-/);
    expect(activeComponents).not.toMatch(/#[\da-f]{3,8}\b/i);
  });

  it('loads one UI family and scopes mono to market-data roles', () => {
    for (const html of [indexHtml, detailHtml]) {
      expect(html).toContain('family=IBM+Plex+Mono');
      expect(html).toContain('family=IBM+Plex+Sans+Arabic');
      expect(html).not.toMatch(/family=(?:Cairo|Tajawal|Inter)/);
    }
    expect(finalLayer).toContain('--font-ui: "IBM Plex Sans Arabic"');
    expect(finalLayer).toContain('--font-data: "IBM Plex Mono"');
    expect(finalLayer).toContain('html[data-theme] body *');
    expect(finalLayer).toContain('[data-market-value]');
    expect(finalLayer).toContain('font-family: var(--font-data) !important');
    expect(finalLayer.indexOf('font-family: var(--font-data) !important'))
      .toBeGreaterThan(finalLayer.indexOf('html[data-theme] body *'));
    expect(finalLayer).toMatch(/html\[data-theme\] :is\([\s\S]*?\.market-value,[\s\S]*?\[data-numeric="true"\][\s\S]*?\) \{\s*font-family: var\(--font-data\) !important;/);
  });

  it('maps the detail stylesheet and cache-busts the consolidated cinema layer', () => {
    for (const token of ['--background:', '--surface:', '--foreground:', '--border:', '--primary:', '--accent:', '--chart-grid:']) {
      expect(detailStyles).toContain(token);
    }
    for (const html of [indexHtml, detailHtml]) {
      expect(html).toContain('/cinema.css?v=20260712-visual-system');
      expect(html).toContain('resolved === "light" ? "#F4F7FB" : "#071522"');
    }
  });

  it('keeps ordinary high-impact surfaces flat while reserving a gradient for heroes', () => {
    expect(finalLayer).toContain('--hero-gradient: linear-gradient');
    expect(finalLayer).toContain('--trader-hero-gradient: var(--hero-gradient);');
    for (const selector of ['.terminal-sidebar {', '.sidebar-nav a {', '.theme-menu,', '.table-shell,']) {
      const start = finalLayer.indexOf(selector);
      expect(start, selector).toBeGreaterThanOrEqual(0);
      const block = finalLayer.slice(start, finalLayer.indexOf('}', start));
      expect(block, selector).not.toContain('gradient(');
    }
  });
});
