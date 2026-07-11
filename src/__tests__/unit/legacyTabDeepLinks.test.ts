import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizeBusinessHubTab, type BusinessHubTab } from '@/app/business-hub/_lib';
import { normalizeMarketTab } from '@/components/market-analysis/utils';
import type { MarketTab } from '@/components/market-analysis/types';
import { canonicalizeUrlTabState, readUrlTabValue } from '@/lib/navigation/urlTabState';

const marketTabs = [
  'analyze',
  'traderTools',
  'economicCalendar',
  'sessions',
  'technicalAnalysis',
  'newsSentiment',
  'watchlist',
  'alerts',
  'comparison',
  'assetReport',
] as const satisfies readonly MarketTab[];

const businessTabs = [
  'readiness',
  'funding',
  'jurisdiction',
  'documents',
  'directory',
  'copilot',
] as const satisfies readonly BusinessHubTab[];

const marketOptions = {
  param: 'tab',
  values: marketTabs,
  defaultValue: 'analyze' as const,
  omitDefault: true,
  legacyValueResolver: normalizeMarketTab,
  legacyHash: true,
};

const businessOptions = {
  param: 'tab',
  values: businessTabs,
  defaultValue: 'readiness' as const,
  omitDefault: true,
  legacyValueResolver: normalizeBusinessHubTab,
  legacyHash: true,
};

describe('legacy workspace tab deep links', () => {
  it('keeps the previous Market Analysis aliases, including #watchlist', () => {
    expect(normalizeMarketTab('#watchlist')).toBe('watchlist');
    expect(normalizeMarketTab('#trader-tools')).toBe('traderTools');
    expect(normalizeMarketTab('#calendar')).toBe('economicCalendar');
    expect(readUrlTabValue('?symbol=AAPL', marketOptions, '#watchlist')).toBe('watchlist');
    expect(canonicalizeUrlTabState(
      'https://www.the-sfm.com/market-analysis?symbol=AAPL#watchlist',
      marketOptions,
    )).toBe('/market-analysis?symbol=AAPL&tab=watchlist');
  });

  it('keeps the previous Business Hub aliases, including #funding', () => {
    expect(normalizeBusinessHubTab('#funding')).toBe('funding');
    expect(normalizeBusinessHubTab('#business-readiness')).toBe('readiness');
    expect(normalizeBusinessHubTab('#strategic-documents')).toBe('documents');
    expect(readUrlTabValue('?project=project-1', businessOptions, '#funding')).toBe('funding');
    expect(canonicalizeUrlTabState(
      'https://www.the-sfm.com/business-hub?project=project-1#funding',
      businessOptions,
    )).toBe('/business-hub?project=project-1&tab=funding');
  });

  it('configures both pages to use shared legacy hash normalization', () => {
    const root = process.cwd();
    const marketPage = readFileSync(join(root, 'src/app/market-analysis/page.tsx'), 'utf8');
    const businessPage = readFileSync(join(root, 'src/app/business-hub/page.tsx'), 'utf8');
    const hook = readFileSync(join(root, 'src/hooks/useUrlTabState.ts'), 'utf8');

    expect(marketPage).toContain('legacyValueResolver: normalizeMarketTab');
    expect(marketPage).toContain('legacyHash: true');
    expect(businessPage).toContain('legacyValueResolver: normalizeBusinessHubTab');
    expect(businessPage).toContain('legacyHash: true');
    expect(hook).toContain("window.addEventListener('popstate', listener)");
    expect(hook).toContain("window.addEventListener('hashchange', listener)");
    expect(hook).toContain("window.history.replaceState(window.history.state, '', canonicalUrl)");
    expect(hook).not.toContain('window.location.assign');
  });
});
