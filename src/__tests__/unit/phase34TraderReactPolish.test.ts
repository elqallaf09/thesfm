import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canOpenCalendarDiagnostics, resolveCalendarAvailability } from '@/components/market-analysis/EconomicCalendarPanel';
import type { ApiListState } from '@/components/market-analysis/types';
import { evaluationScorePresentation } from '@/components/market-analysis/utils';
import { TR_MARKET } from '@/lib/translations/market';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

function calendarState(
  overrides: Partial<ApiListState<Record<string, unknown>>> = {},
): ApiListState<Record<string, unknown>> {
  return {
    loading: false,
    items: [],
    message: '',
    ...overrides,
  };
}

describe('Phase 3.4 React Trader presentation contracts', () => {
  it('uses danger below 50 and success from the exact 50 boundary without changing the score', () => {
    expect(evaluationScorePresentation(49)).toEqual({
      tone: 'danger',
      statusKey: 'market_score_below_threshold',
    });
    expect(evaluationScorePresentation(50)).toEqual({
      tone: 'success',
      statusKey: 'market_score_meets_threshold',
    });
    expect(evaluationScorePresentation(100).tone).toBe('success');
  });

  it('distinguishes safe calendar diagnostic categories and preserves partial or stale events', () => {
    expect(resolveCalendarAvailability(calendarState({ loading: true }), 0)).toBe('loading');
    expect(resolveCalendarAvailability(calendarState({ code: 'PROVIDER_NOT_CONFIGURED' }), 0)).toBe('not_configured');
    expect(resolveCalendarAvailability(calendarState({ code: 'PROVIDER_NOT_ENTITLED' }), 0)).toBe('not_entitled');
    expect(resolveCalendarAvailability(calendarState({ code: 'PROVIDER_RATE_LIMITED' }), 0)).toBe('rate_limited');
    expect(resolveCalendarAvailability(calendarState({ code: 'MARKET_DATA_UNAVAILABLE' }), 0)).toBe('error');
    expect(resolveCalendarAvailability(calendarState({ code: 'CALENDAR_NO_EVENTS' }), 0)).toBe('empty');
    expect(resolveCalendarAvailability(calendarState({ providerStatus: 'limited' }), 2)).toBe('partial');
    expect(resolveCalendarAvailability(calendarState({ stale: true, code: 'PROVIDER_RATE_LIMITED' }), 2)).toBe('stale');
    expect(resolveCalendarAvailability(calendarState(), 2)).toBe('ready');
    expect(canOpenCalendarDiagnostics('error', false)).toBe(false);
    expect(canOpenCalendarDiagnostics('empty', true)).toBe(false);
    expect(canOpenCalendarDiagnostics('not_entitled', true)).toBe(true);
  });

  it('keeps symbol, asset type, timeframe, and Analyze in one responsive toolbar', () => {
    const marketPage = read('src/app/market-analysis/page.tsx');
    const symbolIndex = marketPage.indexOf('className="market-search-field"');
    const typeIndex = marketPage.indexOf("t('market_asset_type')", symbolIndex);
    const timeframeIndex = marketPage.indexOf('className="market-timeframe-field"', typeIndex);
    const submitIndex = marketPage.indexOf('className="market-search-submit"', timeframeIndex);

    expect(symbolIndex).toBeGreaterThan(-1);
    expect(typeIndex).toBeGreaterThan(symbolIndex);
    expect(timeframeIndex).toBeGreaterThan(typeIndex);
    expect(submitIndex).toBeGreaterThan(timeframeIndex);
    expect(marketPage).toContain('grid-template-columns:minmax(280px,1.6fr) minmax(160px,.7fr) minmax(150px,.65fr) max-content');
    expect(marketPage).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(marketPage).toContain('@media(max-width:720px)');
    expect(marketPage).toContain('className="market-shell" dir={dir}');
    expect(marketPage).not.toContain('className="timeframe-row"');
  });

  it('renders score status text and meter semantics so color is not the only indicator', () => {
    const marketPage = read('src/app/market-analysis/page.tsx');

    expect(marketPage).toContain('analysisConfidenceStatus');
    expect(marketPage).toContain('role="meter"');
    expect(marketPage).toContain('aria-valuenow={analysisConfidence}');
    expect(marketPage).toContain('.analysis-confidence-track.success i');
    expect(marketPage).toContain('.analysis-confidence-track.danger i');
  });

  it('keeps unavailable calendar states compact, diagnostic, and fail-closed for administrators', () => {
    const calendar = read('src/components/market-analysis/EconomicCalendarPanel.tsx');
    const marketPage = read('src/app/market-analysis/page.tsx');
    const diagnosticsPage = read('src/app/sfm-admin-control/market-diagnostics/page.tsx');

    for (const contract of [
      'market_calendar_provider_label',
      'market_calendar_last_checked',
      'market_calendar_last_successful',
      'market_calendar_safe_reason',
      'market_calendar_next_action',
      'is-compact-state',
    ]) {
      expect(calendar).toContain(contract);
    }

    expect(calendar).not.toContain("t('market_retry')");
    expect(calendar).not.toContain('href="/sfm-admin-control"');
    expect(calendar.match(/<button type="button" onClick=\{\(\) => onRefresh\(true\)\}/g) ?? []).toHaveLength(1);
    expect(calendar).toMatch(/\{calendarHasEvents \? \(\r?\n\s+<MarketSectionRefreshButton/);
    expect(calendar).toContain('showDiagnosticsAction ?');
    expect(calendar).toContain('href="/sfm-admin-control/market-diagnostics"');
    expect(marketPage).toContain("useAdminAccess(activeTab === 'economicCalendar' ? user?.id : null)");
    expect(marketPage).toContain('canViewDiagnostics={canViewMarketDiagnostics}');
    expect(diagnosticsPage).toContain("requireAdminPageAccess('/sfm-admin-control/market-diagnostics', 'admin_dashboard')");
  });

  it('keeps calendar controls touch-sized and disables motion when requested', () => {
    const calendar = read('src/components/market-analysis/EconomicCalendarPanel.tsx');

    expect(calendar).toContain('.calendar-filter-row button{flex:0 0 auto;min-height:44px');
    expect(calendar).toContain('.economic-calendar-empty-state button,.economic-calendar-empty-state a{width:max-content;max-width:100%;min-height:44px');
    expect(calendar).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('provides Arabic, English, and French status copy for new diagnostics and score states', () => {
    for (const key of [
      'market_score_below_threshold',
      'market_score_meets_threshold',
      'market_calendar_last_checked',
      'market_calendar_last_successful',
      'market_calendar_safe_reason',
      'market_calendar_next_action',
      'market_calendar_action_not_configured',
      'market_calendar_action_not_entitled',
      'market_calendar_action_rate_limited',
      'market_calendar_action_error',
      'market_calendar_action_empty',
    ]) {
      expect(TR_MARKET[key]?.ar, key).toBeTruthy();
      expect(TR_MARKET[key]?.en, key).toBeTruthy();
      expect(TR_MARKET[key]?.fr, key).toBeTruthy();
    }
  });
});
