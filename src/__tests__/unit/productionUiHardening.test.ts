import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');

const signalPanel = read('src/components/market/MarketSignalPanel.tsx');
const marketAnalysis = read('src/app/market-analysis/page.tsx');
const appModal = read('src/components/ui/AppModal.tsx');
const traderApp = read('src/trader-app/public/app.js');
const traderHtml = read('src/trader-app/public/index.html');
const traderDetailHtml = read('src/trader-app/public/detail.html');
const traderCss = read('src/trader-app/public/cinema.css');

describe('phase 2.10 production UI hardening', () => {
  it('keeps the market signal lifecycle distinct from a real Watch recommendation', () => {
    expect(signalPanel).toContain("const lifecycle = loading ? 'loading' : error ? 'error' : signal ? 'success' : 'empty'");
    expect(signalPanel).toContain("className: 'loading', label: text.loadingBadge");
    expect(signalPanel).toContain("className: 'error', label: text.errorBadge");
    expect(signalPanel).toContain("className: 'empty', label: text.emptyBadge");
    expect(signalPanel).not.toContain("actionLabel(signal?.action ?? 'watch')");
    expect(marketAnalysis).toContain('setMarketSignalError(true)');
    expect(marketAnalysis).toContain('error={marketSignalError}');
  });

  it('models every user-facing Trader data state without synthesizing a recommendation', () => {
    for (const state of [
      'loading',
      'empty',
      'partial',
      'stale',
      'delayed',
      'cached',
      'unavailable',
      'unsupported',
      'insufficient',
      'rate_limited',
      'misconfigured',
      'error',
      'available',
    ]) {
      expect(traderApp).toContain(`${state}: {`);
    }
    expect(traderApp).toContain('const evidenceReady = dataState.key === "available";');
    expect(traderApp).toContain('evidenceReady ? recommendationLabel(recommendation) : dataState.label');
    expect(traderApp).toContain('dataStateEmpty(recommendationFeedState(r))');
  });

  it('excludes invalid strategy rows and prevents unverified 100% agreement', () => {
    expect(traderApp).toContain('function strategyRowComparable(row)');
    expect(traderApp).toContain('const comparableRows = rows.filter(strategyRowComparable).map(comparableStrategyRow);');
    expect(traderApp).toContain('const completeCoverage = count >= 3');
    expect(traderApp).toContain('coverage.completeCoverage ? 100 : 99');
    expect(traderApp).toContain('consensusResult.completeCoverage === true');
  });

  it('traps modal focus, describes the dialog, hides background content, and restores focus', () => {
    expect(appModal).toContain('aria-describedby={subtitle ? descriptionId : undefined}');
    expect(appModal).toContain("if (event.key !== 'Tab') return;");
    expect(appModal).toContain('child.inert = true');
    expect(appModal).toContain("child.setAttribute('aria-hidden', 'true')");
    expect(appModal).toContain('previousFocus?.isConnected');
    expect(appModal).toContain('previousFocus.focus({ preventScroll: true })');
  });

  it('uses the approved fonts and exposes every mobile Trader route through an accessible More menu', () => {
    expect(traderHtml).toContain('family=IBM+Plex+Mono');
    expect(traderDetailHtml).toContain('family=IBM+Plex+Mono');
    expect(traderCss).toContain('--font-mono: "IBM Plex Mono"');
    expect(`${traderHtml}${traderDetailHtml}${traderCss}${traderApp}`).not.toContain('JetBrains Mono');
    expect(traderHtml).toContain('id="mobile-more-toggle"');
    expect(traderHtml).toContain('role="menu"');
    expect(traderApp).toContain('function handleMobileMoreKeydown(event)');
    expect(traderApp).toContain('node.dataset.tooltip = primary');
  });

  it('validates Trader writes and locks submit controls while saving', () => {
    expect(traderApp).toContain('function setFormBusy(form, busy)');
    expect(traderApp).toContain('form.dataset.submitting === "true"');
    expect(traderApp).toContain('Quantity must be a number greater than zero.');
    expect(traderApp).toContain('Confidence must be between 0 and 100.');
    expect(traderApp).toContain('type="number" inputmode="decimal"');
    expect(traderApp).toContain('aria-live="assertive" hidden');
  });
});
