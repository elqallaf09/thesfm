import { describe, expect, it } from 'vitest';
import {
  buildUrlWithTabValue,
  canonicalizeUrlTabState,
  normalizeUrlTabValue,
  readUrlTabValue,
} from '@/lib/navigation/urlTabState';

const options = {
  param: 'tab',
  values: ['overview', 'data', 'issues'] as const,
  defaultValue: 'overview' as const,
};

const legacyOptions = {
  ...options,
  legacyHash: true,
  legacyValueResolver: (value: string | null | undefined) => {
    const normalized = String(value ?? '').replace(/^#/, '').trim().toLowerCase();
    if (normalized === 'records') return 'data' as const;
    if (normalized === 'problems') return 'issues' as const;
    if (normalized === 'home') return 'overview' as const;
    return null;
  },
};

describe('URL tab state helpers', () => {
  it('accepts only configured values and otherwise uses the default', () => {
    expect(normalizeUrlTabValue('data', options.values, options.defaultValue)).toBe('data');
    expect(normalizeUrlTabValue('unknown', options.values, options.defaultValue)).toBe('overview');
    expect(normalizeUrlTabValue(null, options.values, options.defaultValue)).toBe('overview');
  });

  it('reads a valid tab from either a query string or URLSearchParams', () => {
    expect(readUrlTabValue('?tab=issues&market=kw', options)).toBe('issues');
    expect(readUrlTabValue(new URLSearchParams('tab=data'), options)).toBe('data');
    expect(readUrlTabValue('?tab=invalid', options)).toBe('overview');
  });

  it('reads legacy query aliases and falls back to a recognized legacy hash', () => {
    expect(readUrlTabValue('?tab=records', legacyOptions, '#problems')).toBe('data');
    expect(readUrlTabValue('?tab=unknown', legacyOptions, '#problems')).toBe('issues');
    expect(readUrlTabValue('', legacyOptions, '#records')).toBe('data');
  });

  it('revalidates resolver output against the configured tab values', () => {
    expect(normalizeUrlTabValue(
      'legacy',
      options.values,
      options.defaultValue,
      () => 'not-configured' as 'data',
    )).toBe('overview');
  });

  it('canonicalizes a legacy hash with replaceState-ready URL semantics', () => {
    expect(canonicalizeUrlTabState(
      'https://www.the-sfm.com/market-analysis?symbol=AAPL#records',
      legacyOptions,
    )).toBe('/market-analysis?symbol=AAPL&tab=data');
    expect(canonicalizeUrlTabState(
      'https://www.the-sfm.com/market-analysis?tab=records#coverage',
      legacyOptions,
    )).toBe('/market-analysis?tab=data#coverage');
  });

  it('writes a legacy alias using its canonical query value', () => {
    expect(buildUrlWithTabValue(
      '/market-analysis?symbol=AAPL',
      'records' as 'data',
      legacyOptions,
    )).toBe('/market-analysis?symbol=AAPL&tab=data');
  });

  it('omits a legacy alias for the default tab during canonicalization', () => {
    expect(canonicalizeUrlTabState(
      'https://www.the-sfm.com/market-analysis?symbol=AAPL#home',
      legacyOptions,
    )).toBe('/market-analysis?symbol=AAPL');
  });

  it('updates only the tab while preserving unrelated query parameters and the hash', () => {
    expect(buildUrlWithTabValue(
      'https://www.the-sfm.com/market-news?market=kw&tab=overview#coverage',
      'issues',
      options,
    )).toBe('/market-news?market=kw&tab=issues#coverage');
  });

  it('omits the default tab by default without dropping other URL state', () => {
    expect(buildUrlWithTabValue('/market-news?market=kw&tab=data#latest', 'overview', options))
      .toBe('/market-news?market=kw#latest');
  });

  it('can retain an explicit default tab when requested', () => {
    expect(buildUrlWithTabValue('/market-news?market=kw#latest', 'overview', {
      ...options,
      omitDefault: false,
    })).toBe('/market-news?market=kw&tab=overview#latest');
  });

  it('normalizes an invalid runtime value before writing it', () => {
    expect(buildUrlWithTabValue('/market-news?tab=data', 'invalid' as 'data', options))
      .toBe('/market-news');
  });
});
