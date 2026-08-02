'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Globe2, RefreshCcw } from 'lucide-react';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { useLanguage } from '@/hooks/useLanguage';
import { MarketStrip } from '@/components/market/MarketStrip';
import { GlobalMarketsExplorer } from '@/components/global-markets/GlobalMarketsExplorer';
import { GlobalMarketsNews } from '@/components/global-markets/GlobalMarketsNews';
import { GlobalMarketsLayoutStyles } from '@/components/global-markets/GlobalMarketsLayoutStyles';
import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import { t } from '@/lib/translations';

type MarketStripsResponse = {
  success: true;
  lastUpdated: string;
  prices: Record<string, TechStockPrice>;
} | {
  success: false;
  error: string;
};

function localeFor(lang: string) {
  return lang === 'ar' ? 'ar-SA-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
}

export function GlobalMarketsPage() {
  const { lang, dir } = useLanguage();
  const [prices, setPrices] = useState<Record<string, TechStockPrice> | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = async (showLoader: boolean, signal?: AbortSignal) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError(false);
    try {
      const response = await fetch('/api/market-strips', { signal });
      const json = await response.json() as MarketStripsResponse;
      if (!json.success) throw new Error(json.error);
      setPrices(json.prices);
      setLastUpdated(json.lastUpdated);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(true);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(true, controller.signal);
    return () => controller.abort();
    // Fetch exactly once on mount -- prices are refreshed via manual refresh only,
    // never re-fetched as a side effect of a language switch or re-render.
  }, []);

  const lastUpdatedLabel = lastUpdated
    ? new Intl.DateTimeFormat(localeFor(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastUpdated))
    : '';

  return (
    <div className="gm-shell" dir={dir}>
      <GlobalMarketsLayoutStyles />
      <WorkspacePageContainer as="main" variant="wide" className="gm-main">
        <header className="gm-header">
          <div className="gm-header-icon" aria-hidden="true">
            <Globe2 size={24} />
          </div>
          <div className="gm-header-copy">
            <h1>{t('global_markets_title', lang)}</h1>
            <p>{t('global_markets_subtitle', lang)}</p>
          </div>
          <div className="gm-header-actions">
            {lastUpdatedLabel ? (
              <span className="gm-header-updated" dir="auto">{t('global_markets_last_updated', lang)}: {lastUpdatedLabel}</span>
            ) : null}
            <button
              type="button"
              className="gm-header-refresh"
              onClick={() => void load(false)}
              disabled={refreshing}
              aria-label={t('global_markets_last_updated', lang)}
            >
              <RefreshCcw size={16} className={refreshing ? 'is-spinning' : ''} />
            </button>
          </div>
        </header>

        {error ? (
          <div className="gm-error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{t('global_markets_strip_unavailable', lang)}</span>
          </div>
        ) : null}

        <section className="gm-strips" aria-label={t('global_markets_strips_heading', lang)}>
          {loading ? (
            <div className="gm-strips-skeleton" role="status">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="gm-strips-skeleton-row" key={index} />
              ))}
            </div>
          ) : (
            GLOBAL_MARKET_STRIPS.map(strip => (
              <MarketStrip key={strip.id} strip={strip} prices={prices} lang={lang} dir={dir} />
            ))
          )}
        </section>

        <GlobalMarketsExplorer prices={prices} lang={lang} dir={dir} />

        <GlobalMarketsNews lang={lang} dir={dir} />

        <p className="gm-disclaimer" dir="auto">{t('global_markets_disclaimer', lang)}</p>
      </WorkspacePageContainer>
    </div>
  );
}

export default GlobalMarketsPage;
