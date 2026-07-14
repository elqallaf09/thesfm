import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getThemeScope, THEME_SCOPE_ROUTES } from '@/lib/navigation/themeScopes';

describe('getThemeScope', () => {
  it('maps every Core Finance area to the core-finance scope', () => {
    const financeRoutes = [
      '/dashboard',
      '/income',
      '/expenses',
      '/debts',
      '/savings',
      '/goals',
      '/reports',
      '/documents',
      '/projects',
      '/zakat',
      '/khums',
      '/charity',
      '/charity-projects',
    ];
    for (const route of financeRoutes) {
      expect(getThemeScope(route), route).toBe('core-finance');
    }
  });

  it('maps nested finance paths to the core-finance scope', () => {
    expect(getThemeScope('/expenses/add')).toBe('core-finance');
    expect(getThemeScope('/expenses/monthly-subscriptions')).toBe('core-finance');
    expect(getThemeScope('/goals/add')).toBe('core-finance');
    expect(getThemeScope('/projects/ad-calculator')).toBe('core-finance');
    expect(getThemeScope('/charity-projects/report')).toBe('core-finance');
  });

  it('maps the Business Center to the business scope', () => {
    expect(getThemeScope('/business')).toBe('business');
    expect(getThemeScope('/business-hub')).toBe('business');
    expect(getThemeScope('/business-operations')).toBe('business');
  });

  it('maps market and trading pages to the trader scope', () => {
    expect(getThemeScope('/market-analysis')).toBe('trader');
    expect(getThemeScope('/market-agent')).toBe('trader');
    expect(getThemeScope('/market-watchlist')).toBe('trader');
    expect(getThemeScope('/thesfm-trader-own/app')).toBe('trader');
    expect(getThemeScope('/growth-stocks')).toBe('trader');
  });

  it('maps admin and shariah areas to their own scopes', () => {
    expect(getThemeScope('/sfm-admin-control')).toBe('admin');
    expect(getThemeScope('/sfm-admin-control/shariah')).toBe('admin');
    expect(getThemeScope('/command-center')).toBe('admin');
    expect(getThemeScope('/sharia-stocks')).toBe('shariah');
  });

  it('does not swallow sibling routes that share a prefix', () => {
    // /reports is core-finance but /reports-center is a different workspace.
    expect(getThemeScope('/reports-center')).toBeNull();
  });

  it('leaves unscoped routes on the global defaults', () => {
    expect(getThemeScope('/')).toBeNull();
    expect(getThemeScope('/login')).toBeNull();
    expect(getThemeScope('/profile')).toBeNull();
    expect(getThemeScope('/settings')).toBeNull();
    expect(getThemeScope(null)).toBeNull();
    expect(getThemeScope(undefined)).toBeNull();
  });

  it('ignores query strings and hashes', () => {
    expect(getThemeScope('/documents?tab=archive')).toBe('core-finance');
    expect(getThemeScope('/khums#history')).toBe('core-finance');
  });

  it('declares all five product-area scopes', () => {
    expect(Object.keys(THEME_SCOPE_ROUTES).sort()).toEqual(
      ['admin', 'business', 'core-finance', 'shariah', 'trader'].sort(),
    );
  });
});

describe('scopes.css finance restoration', () => {
  const css = readFileSync(join(process.cwd(), 'src/styles/scopes.css'), 'utf8');

  it('restores the approved finance control metrics inside the finance scopes', () => {
    // Approved Core Finance identity: 42px button floor, 48px fields,
    // 50px fields on touch layouts.
    expect(css).toContain("--control-h: 42px");
    expect(css).toContain("--finance-field-h: 48px");
    expect(css).toContain("--finance-field-h: 50px");
  });

  it('keeps finance on the shared semantic radius scale', () => {
    expect(css).not.toMatch(/--r-(xs|sm|md|lg|xl|2xl)\s*:/);
    expect(css).not.toMatch(/--radius-(xs|sm|control|card|panel)\s*:/);
  });

  it('keeps trader, admin and shariah scopes free of metric overrides', () => {
    for (const scope of ['trader', 'admin', 'shariah']) {
      const blocks = css
        .split('}')
        .filter((block) => block.includes(`[data-theme-scope='${scope}']`));
      expect(blocks.length, scope).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(block, scope).not.toMatch(/--control-h|--finance-field-h|--r-(xs|sm|md|lg|xl|2xl)/);
      }
    }
  });
});
