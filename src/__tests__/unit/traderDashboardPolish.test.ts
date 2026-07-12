import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const appJs = readFileSync(join(projectRoot, 'src/trader-app/public/app.js'), 'utf8');
const cinemaCss = readFileSync(join(projectRoot, 'src/trader-app/public/cinema.css'), 'utf8');

describe('trader dashboard polish (phase 2.6)', () => {
  it('replaces UI fragments only at word boundaries so "بيع" never corrupts "أسابيع"', () => {
    expect(appJs).toContain('function replaceFragmentWithBoundaries(output, from, to)');
    expect(appJs).toContain('replaceFragmentWithBoundaries(output, from, to);');
    // The Arabic-aware boundary guard.
    expect(appJs).toContain('[A-Za-z\\\\u0600-\\\\u06FF]');
    // The horizon phrase is registered as a whole fragment so it translates
    // wholesale instead of leaking a mid-word "Sell".
    expect(appJs).toContain('["1-3 weeks", "1-3 أسابيع", "1 à 3 semaines"]');
  });

  it('collapses repeated unavailable labels into one compact dash with an accessible tooltip', () => {
    expect(appJs).toContain('function dashCell(reason)');
    expect(appJs).toContain('class="cell-dash"');
    // Ticker chips: single unavailable state instead of price+change verbosity.
    expect(appJs).toContain('chip-unavailable');
    expect(appJs).toContain('chip-dash');
    // Sessions rows and heatmap tiles use the dash instead of the word.
    expect(appJs).toMatch(/st-quote is-empty"><small title=/);
    expect(appJs).toContain('chg === null ? dashCell(changeUnavailableText())');
  });

  it('gates confident numbers behind evidence completeness in the recommendations table', () => {
    expect(appJs).toContain('const ds = assetDataState(a, recommendation);');
    expect(appJs).toContain("const evidenceGated = ds.key !== \"available\";");
    expect(appJs).toContain('conf === null || evidenceGated ? dashCell(gateNote)');
    // Any non-complete evidence state (including unavailable/provider failure)
    // renders its real data state instead of a buy/sell/watch badge.
    expect(appJs).toContain('const recommendationHtml = evidenceGated');
  });

  it('sizes the ticker chip logo column to the unified 44px logo so prices are not covered', () => {
    expect(cinemaCss).toContain('grid-template-columns: 44px minmax(0, 1fr);');
    expect(cinemaCss).not.toMatch(/\.ticker-chip \{[^}]*grid-template-columns: 3[24]px/);
  });

  it('uses valid selectors for light-mode placeholders (no pseudo-element inside :is())', () => {
    expect(cinemaCss).toContain('html[data-theme="light"] input::placeholder');
    expect(cinemaCss).toContain('html[data-theme="light"] textarea::placeholder');
    expect(cinemaCss).not.toMatch(/:is\([^)]*::placeholder/);
  });

  it('renders command-center empty states as intentional boxes, not lost text', () => {
    expect(cinemaCss).toMatch(/\.command-deck-empty \{[^}]*border: 1px dashed/);
    expect(cinemaCss).toMatch(/\.command-deck-empty \{[^}]*place-content: center/);
  });

  it('keeps the muted dash styling theme-aware', () => {
    expect(cinemaCss).toContain('.heatmap-tile-performance.is-unavailable');
    expect(cinemaCss).toMatch(/html\[data-theme="light"\] :is\(\.cell-dash/);
  });
});
