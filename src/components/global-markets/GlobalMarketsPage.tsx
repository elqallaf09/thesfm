'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Globe2, RefreshCcw, Settings2 } from 'lucide-react';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { useLanguage } from '@/hooks/useLanguage';
import { MarketStrip } from '@/components/market/MarketStrip';
import { GlobalMarketsExplorer } from '@/components/global-markets/GlobalMarketsExplorer';
import { GlobalMarketsNews } from '@/components/global-markets/GlobalMarketsNews';
import { GlobalMarketsLayoutStyles } from '@/components/global-markets/GlobalMarketsLayoutStyles';
import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';
import { GlobalMarketsPicker } from '@/components/global-markets/GlobalMarketsPicker';
import { useGlobalMarketSelection } from '@/hooks/useGlobalMarketSelection';
import { GLOBAL_MARKETS_SELECTION_SIZE } from '@/lib/market/globalMarketPreferences';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import { t } from '@/lib/translations';

type MarketStripsResponse = {
  success: true;
  lastUpdated: string;
  requestedIds: string[];
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
  const hasLoadedRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { selectedIds, setSelectedIds, restoreDefaults, hydrated } = useGlobalMarketSelection();
  const selectedStrips = useMemo(() => selectedIds.flatMap(id => {
    const strip = GLOBAL_MARKET_STRIPS.find(candidate => candidate.id === id);
    return strip ? [strip] : [];
  }), [selectedIds]);
  const selectedIdsKey = selectedIds.join(',');

  const customizeLabel = lang === 'ar' ? 'تخصيص الأسواق' : lang === 'fr' ? 'Personnaliser les marchés' : 'Customize markets';
  const selectedLabel = lang === 'ar' ? 'الأسواق المختارة' : lang === 'fr' ? 'Marchés sélectionnés' : 'Selected markets';

  const load = useCallback(async (showLoader: boolean, idsKey: string, signal?: AbortSignal) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError(false);
    try {
      const response = await fetch(`/api/market-strips?ids=${encodeURIComponent(idsKey)}`, { signal });
      const json = await response.json() as MarketStripsResponse;
      if (!json.success) throw new Error(json.error);
      setPrices(json.prices);
      setLastUpdated(json.lastUpdated);
      hasLoadedRef.current = true;
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(true);
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    void load(!hasLoadedRef.current, selectedIdsKey, controller.signal);
    return () => controller.abort();
  }, [hydrated, load, selectedIdsKey]);

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
              onClick={() => void load(false, selectedIdsKey)}
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

        <section className="gm-selection" aria-label={selectedLabel}>
          <div>
            <strong>{selectedLabel}: {selectedIds.length} / {GLOBAL_MARKETS_SELECTION_SIZE}</strong>
            <span>{selectedStrips.map(strip => lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn).join(' · ')}</span>
          </div>
          <button type="button" onClick={() => setPickerOpen(true)}>
            <Settings2 size={17} aria-hidden="true" /> {customizeLabel}
          </button>
        </section>

        <section className="gm-strips" aria-label={t('global_markets_strips_heading', lang)}>
          {loading ? (
            <div className="gm-strips-skeleton" role="status">
              {Array.from({ length: GLOBAL_MARKETS_SELECTION_SIZE }).map((_, index) => (
                <div className="gm-strips-skeleton-row" key={index} />
              ))}
            </div>
          ) : (
            selectedStrips.map(strip => (
              <MarketStrip key={strip.id} strip={strip} prices={prices} lang={lang} dir={dir} />
            ))
          )}
        </section>

        <GlobalMarketsExplorer prices={prices} lang={lang} dir={dir} />

        <GlobalMarketsNews lang={lang} dir={dir} />

        <p className="gm-disclaimer" dir="auto">{t('global_markets_disclaimer', lang)}</p>
      </WorkspacePageContainer>
      {hydrated ? (
        <GlobalMarketsPicker
          open={pickerOpen}
          lang={lang}
          selectedIds={selectedIds}
          onClose={() => setPickerOpen(false)}
          onSave={setSelectedIds}
          onRestoreDefaults={() => { restoreDefaults(); setPickerOpen(false); }}
        />
      ) : null}
    </div>
  );
}

export default GlobalMarketsPage;
