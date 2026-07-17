import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const indexHtml = readFileSync(join(projectRoot, 'src/trader-app/public/index.html'), 'utf8');
const detailHtml = readFileSync(join(projectRoot, 'src/trader-app/public/detail.html'), 'utf8');
const appJs = readFileSync(join(projectRoot, 'src/trader-app/public/app.js'), 'utf8');
const cinemaCss = readFileSync(join(projectRoot, 'src/trader-app/public/cinema.css'), 'utf8');

function densityLayer(): string {
  const marker = cinemaCss.indexOf('sfm-density-layer:start');
  expect(marker).toBeGreaterThan(-1);
  // The start marker sits inside a header comment — begin after it closes.
  const start = cinemaCss.indexOf('*/', marker) + 2;
  const end = cinemaCss.indexOf('/* == sfm-density-layer:end', start);
  expect(end).toBeGreaterThan(start);
  const raw = cinemaCss.slice(start, end);
  // Strip inner comments so prose does not trip the color/control guards.
  return raw.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('trader terminal density (phase 2.7)', () => {
  it('stamps the shared density preference on <html> before cinema.css paints', () => {
    for (const html of [indexHtml, detailHtml]) {
      const stampAt = html.indexOf('document.documentElement.dataset.density');
      const cssAt = html.indexOf('href="/cinema.css');
      expect(stampAt).toBeGreaterThan(-1);
      expect(cssAt).toBeGreaterThan(stampAt);
      // Reads the same keys as src/lib/ui/density.ts and falls back to auto.
      expect(html).toContain('localStorage.getItem("sfm-density")');
      expect(html).toContain('"auto"');
    }
  });

  it('keeps the terminal in step when the parent app changes the preference', () => {
    expect(appJs).toContain('["sfm-density", "sfm_settings"].includes(event.key || "")');
    expect(appJs).toContain('document.documentElement.dataset.density = density;');
  });

  it('applies the compact tier on desktop only — mobile and tablet stay comfortable', () => {
    const layer = densityLayer();
    expect(layer).toContain('@media (min-width: 1024px)');
    expect(layer).toContain('html[data-density="auto"]');
    expect(layer).toContain('html[data-density="compact"]');
    // Comfortable is the untouched approved appearance — no rules for it.
    expect(layer).not.toContain('data-density="comfortable"');
    // Every rule lives inside the desktop media query: nothing precedes it
    // and only the media block (plus the end marker) follows.
    const beforeMedia = layer.slice(0, layer.indexOf('@media'));
    expect(beforeMedia.trim()).toBe('');
  });

  it('never touches colors, fonts or controls — identity and touch floors survive', () => {
    const layer = densityLayer();
    expect(layer).not.toMatch(/(?:^|[;{\s])(?:background|color|border-color|box-shadow|fill|stroke|opacity)\s*:/);
    expect(layer).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    expect(layer).not.toMatch(/(?:^|[,{\s])(?:input|select|textarea|button)\b/);
    expect(layer).not.toMatch(/font-size\s*:/);
    // RTL-safe: symmetric or logical spacing only.
    expect(layer).not.toMatch(/padding-(left|right)|margin-(left|right)|\b(left|right)\s*:/);
  });

  it('busts stale caches with a bumped asset version', () => {
    expect(indexHtml).toContain('/semantic-tokens.css?v=20260713-central-system');
    expect(indexHtml).toContain('/theme-bridge.js?v=20260714-phase34');
    expect(indexHtml).toContain('/cinema.css?v=20260717-shell-unify');
    expect(indexHtml).toContain('/app.js?v=20260717-shell-unify');
    expect(detailHtml).toContain('/semantic-tokens.css?v=20260713-central-system');
    expect(detailHtml).toContain('/theme-bridge.js?v=20260714-phase34');
    expect(detailHtml).toContain('/cinema.css?v=20260717-shell-unify');
    expect(detailHtml).toContain('/detail.css?v=20260714-phase34');
    expect(detailHtml).toContain('/detail.js?v=20260714-phase34');
  });
});
