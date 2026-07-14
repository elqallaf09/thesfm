import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const panelFiles = [
  'src/components/market-analysis/EconomicCalendarPanel.tsx',
  'src/components/market-analysis/NewsSentimentPanel.tsx',
  'src/components/market-analysis/TraderToolsDashboard.tsx',
  'src/components/market-analysis/TradingSessionsPanel.tsx',
] as const;

const panels = panelFiles.map(file => ({ file, source: read(file) }));
const combinedPanels = panels.map(panel => panel.source).join('\n');
const marketPage = read('src/app/market-analysis/page.tsx');

describe('active Market Analysis panels visual-system contract', () => {
  it('keeps every production panel on centralized tokens without a local palette', () => {
    for (const { file, source } of panels) {
      expect(source, file).not.toMatch(
        /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|(?:linear|radial|conic)-gradient\(/i,
      );
      expect(source, file).not.toMatch(
        /\b(?:Tajawal|Arial|Tahoma|Helvetica|sans-serif|monospace)\b|(?::global\()?\.dark\b|var\(--sfm-|--trader-/i,
      );
      expect(source, file).not.toMatch(/font-weight:\s*(?:8\d{2}|9\d{2}|7(?:[1-9]\d|\d[1-9]))/);

      const radiusValues = [...source.matchAll(/border(?:-[\w]+)?-radius:\s*([^;}\r\n]+)/g)]
        .map(match => match[1].trim());
      expect(radiusValues.filter(value => /\d+(?:\.\d+)?px/.test(value)), file).toEqual([]);

      const shadowValues = [...source.matchAll(/box-shadow:\s*([^;}\r\n]+)/g)]
        .map(match => match[1].trim());
      expect(
        shadowValues.filter(value => !/^var\(--(?:shadow|focus-shadow)/.test(value) && !/^none(?:\s*!important)?$/.test(value)),
        file,
      ).toEqual([]);
    }
  });

  it('uses flat semantic surfaces, semantic states, and the approved UI/data font roles', () => {
    for (const token of [
      '--surface', '--surface-muted', '--foreground', '--foreground-muted',
      '--border', '--primary', '--primary-foreground', '--accent', '--success',
      '--warning', '--danger', '--focus-shadow', '--font-ui', '--font-data',
    ]) {
      expect(combinedPanels).toContain(`var(${token})`);
    }
    expect(combinedPanels).not.toContain('var(--hero-gradient)');
    expect(combinedPanels).toContain('font-family:var(--font-data)');
    expect(combinedPanels).toContain('font-family: var(--font-data)');
  });

  it('preserves provider, sentiment, liquidity, selection, and financial-data states', () => {
    const economic = panels[0].source;
    expect(economic).toContain('.calendar-provider-pill.connected');
    expect(economic).toContain('.calendar-provider-pill.warning');
    expect(economic).toContain('.calendar-provider-pill.error');
    expect(economic).toContain('.calendar-impact-badge.high');
    expect(economic).toContain('.calendar-impact-badge.medium');
    expect(economic).toContain('.calendar-impact-badge.low');

    const news = panels[1].source;
    expect(news).toContain('.market-news-sentiment-bar span.positive');
    expect(news).toContain('.market-news-sentiment-bar span.neutral');
    expect(news).toContain('.market-news-sentiment-bar span.negative');
    expect(news).toContain('.market-news-evidence-rail.official');
    expect(news).toContain('.market-news-evidence-rail.conflicting');

    const trader = panels[2].source;
    expect(trader).toContain('.trader-tool-switcher > button[aria-selected="true"]');
    expect(trader).toContain('.tool-segmented-row button[aria-pressed="true"]');
    expect(trader).toContain('.tool-input-shell:focus-within');
    expect(trader).toContain('font-variant-numeric: tabular-nums');

    const sessions = panels[3].source;
    expect(sessions).toContain('.session-overlap-card.active');
    expect(sessions).toContain('.session-overlap-zone.highest');
    expect(sessions).toContain('.session-row.sydney .session-bar{background:var(--chart-1)}');
    expect(sessions).toContain('.session-row.tokyo .session-bar{background:var(--chart-3)}');
    expect(sessions).toContain('.session-row.newyork .session-bar{background:var(--chart-4)}');
  });

  it('retains keyboard focus, RTL/LTR, overflow, and responsive panel behavior', () => {
    const compactPanels = combinedPanels.replace(/\s+/g, '');
    expect(combinedPanels).toContain('box-shadow:var(--focus-shadow)');
    expect(combinedPanels).toContain('dir={isRtlLocale ? \'rtl\' : \'ltr\'}');
    expect(combinedPanels).toContain("dir={lang === 'ar' ? 'rtl' : 'ltr'}");
    expect(combinedPanels).toContain('dir="ltr"');
    expect(combinedPanels).toContain('overflow-x:auto');
    expect(combinedPanels).toContain('min-width:760px');

    for (const breakpoint of ['1280px', '1180px', '980px', '760px', '720px', '640px']) {
      expect(compactPanels).toContain(`max-width:${breakpoint}`);
    }
  });

  it('keeps all four migrated panels connected to the active Market Analysis route', () => {
    for (const component of [
      'EconomicCalendarPanel',
      'NewsSentimentPanel',
      'TraderToolsDashboard',
      'TradingSessionsPanel',
    ]) {
      expect(marketPage).toContain(`mod.${component}`);
      expect(marketPage).toContain(`<${component}`);
    }
  });
});
