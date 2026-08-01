import { describe, expect, it } from 'vitest';
import { ADMINISTRATION_TRANSLATIONS } from '@/lib/translations/bundles/administration';
import { BUSINESS_PROJECTS_TRANSLATIONS } from '@/lib/translations/bundles/businessProjects';
import { MARKETS_TRADING_TRANSLATIONS } from '@/lib/translations/bundles/marketsTrading';
import { PERSONAL_FINANCE_TRANSLATIONS } from '@/lib/translations/bundles/personalFinance';
import type { TranslationDictionary } from '@/lib/translations/types';
import { TR } from '@/lib/translations';
import { resolveWorkspaceRouteId } from '@/config/workspaces/workspace-route-index';

describe('workspace translation bundles', () => {
  it('routes each workspace to its isolated translation graph', () => {
    expect(resolveWorkspaceRouteId('/dashboard')).toBe('personal-finance');
    expect(resolveWorkspaceRouteId('/market-analysis?tab=alerts')).toBe('markets-trading');
    expect(resolveWorkspaceRouteId('/profile/companies')).toBe('business-projects');
    expect(resolveWorkspaceRouteId('/sfm-admin-control/market-diagnostics')).toBe('administration');
    expect(resolveWorkspaceRouteId('/unknown')).toBeNull();
  });

  it('keeps shared shell copy in every workspace and domain copy isolated', () => {
    const bundles: TranslationDictionary[] = [
      PERSONAL_FINANCE_TRANSLATIONS,
      MARKETS_TRADING_TRANSLATIONS,
      BUSINESS_PROJECTS_TRANSLATIONS,
      ADMINISTRATION_TRANSLATIONS,
    ];

    for (const bundle of bundles) {
      expect(bundle.nav_group_main?.en).toBeTruthy();
      expect(bundle.common_backToDashboard?.ar).toBeTruthy();
      for (const [key, entry] of Object.entries(bundle)) {
        expect(entry, key).toEqual(TR[key]);
      }
    }

    const personal = PERSONAL_FINANCE_TRANSLATIONS as TranslationDictionary;
    const markets = MARKETS_TRADING_TRANSLATIONS as TranslationDictionary;
    const business = BUSINESS_PROJECTS_TRANSLATIONS as TranslationDictionary;
    const administration = ADMINISTRATION_TRANSLATIONS as TranslationDictionary;

    expect(personal.dashboard_exec_title?.en).toBeTruthy();
    expect(personal.market_news_feed).toBeUndefined();
    expect(markets.market_news_feed?.en).toBeTruthy();
    expect(markets.company_access_denied).toBeUndefined();
    expect(business.company_access_denied?.en).toBeTruthy();
    expect(business.admin_permissions_title).toBeUndefined();
    expect(administration.admin_permissions_title?.en).toBeTruthy();
  });
});
