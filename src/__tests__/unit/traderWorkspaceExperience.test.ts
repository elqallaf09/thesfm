import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const app = read('src/trader-app/public/app.js');
const styles = read('src/trader-app/public/cinema.css');
const html = read('src/trader-app/public/index.html');

describe('SFM Trader workspace experience', () => {
  it('renders one active dashboard workspace instead of evaluating every chart view', () => {
    expect(app).toContain('function dashboardWorkspaceContent(active, rec)');
    expect(app).toContain('workspacePanel("dashboard", active, dashboardWorkspaceContent(active, rec))');
    expect(app).toContain('if (active === "sessions") return marketOverview(rec, "sessions")');
    expect(app).toContain('if (active === "heatmap") return opportunityHeatmap(rec)');
  });

  it('builds a hierarchical command center with every requested market-awareness surface', () => {
    for (const className of [
      'command-deck-status',
      'command-deck-opportunities',
      'command-deck-risks',
      'command-deck-ai',
      'command-deck-watchlist',
      'command-deck-sentiment',
      'command-deck-provider',
      'command-deck-sessions',
      'command-deck-actions',
      'command-deck-news',
    ]) {
      expect(app).toContain(className);
      expect(styles).toContain(`.${className}`);
    }
  });

  it('provides a grouped, searchable, selectable, zoomable heatmap', () => {
    expect(app).toContain('class="heatmap-treemap"');
    expect(app).toContain('class="heatmap-sector-group"');
    expect(app).toContain('data-heatmap-search-form');
    expect(app).toContain('data-heatmap-tone');
    expect(app).toContain('data-heatmap-sector');
    expect(app).toContain('data-heatmap-zoom');
    expect(app).toContain('data-heatmap-density');
    expect(app).toContain('aria-pressed="${selected}"');
    expect(styles).toContain('.heatmap-tile.size-lg');
    expect(styles).toContain('.heatmap-tile.is-selected');
  });

  it('uses an accessible 24-hour market session terminal in both themes', () => {
    expect(app).toContain('class="session-timeline market-session-terminal"');
    expect(app).toContain('session-now-label');
    expect(app).toContain('is-upcoming');
    expect(app).toContain('class="session-tooltip"');
    expect(styles).toContain('.session-row.is-upcoming .session-bar');
    expect(styles).toContain('html[data-theme="light"] .session-track');
    expect(styles).toContain('html[data-theme="light"] .market-session-terminal .st-track');
  });

  it('opens stock details in a loaded-data-only quick drawer with keyboard support', () => {
    expect(app).toContain('openSymbolDrawer(s, detail)');
    expect(app).toContain('role="dialog" aria-modal="true"');
    expect(app).toContain('function handleSymbolDrawerKeydown(event)');
    expect(app).toContain('if (event.key === "Escape")');
    expect(app).toContain('drawerTabs().map(([value, label])');
    for (const hook of [
      'data-drawer-watch',
      'data-drawer-alert',
      'data-drawer-compare',
      'data-drawer-export',
      'data-drawer-share',
      'data-drawer-full',
    ]) expect(app).toContain(hook);

    const loadedContext = app.slice(app.indexOf('function drawerLoadedContext'), app.indexOf('function openSymbolDrawer'));
    expect(loadedContext).not.toContain('get(`');
    expect(loadedContext).not.toContain('fetch(');
  });

  it('shares one information-dense stock card and chart language', () => {
    expect(app).toContain('class="leadership-card trader-stock-card');
    expect(app).toContain('class="rec-card trader-stock-card');
    expect(app).toContain('class="asset-card trader-stock-card');
    expect(app).toContain('function stockCardMeta(asset)');
    expect(app).toContain('stockFreshnessValue(asset)');
    expect(app).toContain('class="sparkline-grid"');
    expect(app).toContain('class="detail-chart-legend"');
    expect(styles).toContain('.stock-card-meta');
    expect(styles).toContain('.detail-chart-point');
  });

  it('mounts the drawer host, skip link, and cache-busted workspace assets', () => {
    expect(html).toContain('class="terminal-skip-link"');
    expect(html).toContain('id="symbol-drawer-host"');
    expect(html).toContain('cinema.css?v=20260712-density');
    expect(html).toContain('app.js?v=20260712-density');
  });

  it('includes mobile reflow, dark-mobile repair, RTL wrapping, and reduced motion', () => {
    expect(styles).toContain('@media (max-width: 680px)');
    expect(styles).toContain('html[data-theme="dark"] .ticker-chip');
    expect(styles).toContain('html[data-theme="dark"] .mobile-nav');
    expect(styles).toContain('html[dir="rtl"] :is(.stock-card-primary small');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('.watchlist-table table');
  });
});
