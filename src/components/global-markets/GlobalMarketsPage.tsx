'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Globe2, RefreshCcw, Settings2 } from 'lucide-react';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { useLanguage } from '@/hooks/useLanguage';
import { MarketStrip } from '@/components/market/MarketStrip';
import { GlobalMarketsExplorer, type GlobalExplorerRequest } from '@/components/global-markets/GlobalMarketsExplorer';
import { GlobalMarketsNews } from '@/components/global-markets/GlobalMarketsNews';
import { GlobalMarketsLayoutStyles } from '@/components/global-markets/GlobalMarketsLayoutStyles';
import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';
import { GlobalMarketsPicker } from '@/components/global-markets/GlobalMarketsPicker';
import { useGlobalMarketSelection } from '@/hooks/useGlobalMarketSelection';
import { GLOBAL_MARKETS_SELECTION_SIZE } from '@/lib/market/globalMarketPreferences';
import type { TechStockPrice } from '@/lib/market/fetchStockPrices';
import { t } from '@/lib/translations';
import marketLinkStyles from './RealEstateMarketLink.module.css';

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
  const activeRequestRef = useRef<AbortController | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [browseRequest, setBrowseRequest] = useState<GlobalExplorerRequest | null>(null);
  const { selectedIds, setSelectedIds, hydrated } = useGlobalMarketSelection();
  const selectedStrips = useMemo(() => selectedIds.flatMap(id => {
    const strip = GLOBAL_MARKET_STRIPS.find(candidate => candidate.id === id);
    return strip ? [strip] : [];
  }), [selectedIds]);
  const selectedIdsKey = selectedIds.join(',');

  const customizeLabel = lang === 'ar' ? 'تخصيص الأسواق' : lang === 'fr' ? 'Personnaliser les marchés' : 'Customize markets';
  const refreshLabel = lang === 'ar' ? 'تحديث الأسعار' : lang === 'fr' ? 'Actualiser les cours' : 'Refresh prices';
  const selectedLabel = lang === 'ar' ? 'الأسواق المختارة' : lang === 'fr' ? 'Marchés sélectionnés' : 'Selected markets';
  const realEstateLabel = lang === 'ar' ? 'مركز السوق العقاري' : lang === 'fr' ? 'Centre du marché immobilier' : 'Real Estate Market Center';

  const load = useCallback(async (showLoader: boolean, idsKey: string) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const { signal } = controller;
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError(false);
    try {
      const response = await fetch(`/api/market-strips?ids=${encodeURIComponent(idsKey)}`, { signal });
      const json = await response.json() as MarketStripsResponse;
      if (signal.aborted) return;
      if (!response.ok || !json.success) throw new Error('market_strips_unavailable');
      setPrices(json.prices);
      setLastUpdated(json.lastUpdated);
      hasLoadedRef.current = true;
    } catch (loadError) {
      if (signal.aborted || (loadError instanceof DOMException && loadError.name === 'AbortError')) return;
      setError(true);
    } finally {
      if (!signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void load(!hasLoadedRef.current, selectedIdsKey);
    return () => activeRequestRef.current?.abort();
  }, [hydrated, load, selectedIdsKey]);

  const lastUpdatedLabel = lastUpdated
    && Number.isFinite(Date.parse(lastUpdated)) ? new Intl.DateTimeFormat(localeFor(lang), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastUpdated))
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
            <p className={error ? 'gm-header-feedback is-error' : 'gm-header-feedback'} role={error ? 'alert' : undefined}>
              {t(error ? 'global_markets_strip_unavailable' : 'global_markets_subtitle', lang)}
            </p>
          </div>
          <div className="gm-header-actions">
            <span className="gm-header-updated" dir="auto" title={lastUpdatedLabel}>
              {t('global_markets_last_updated', lang)}: {lastUpdatedLabel || '—'}
            </span>
            <Link href="/global-markets/real-estate" className={marketLinkStyles.link} aria-label={realEstateLabel}>
              <Building2 size={16} aria-hidden="true" /><span>{realEstateLabel}</span>
            </Link>
            <button
              type="button"
              className="gm-header-refresh"
              onClick={() => void load(false, selectedIdsKey)}
              disabled={!hydrated || loading || refreshing}
              aria-label={refreshLabel}
            >
              <RefreshCcw size={16} aria-hidden="true" className={refreshing ? 'is-spinning' : ''} /><span>{refreshLabel}</span>
            </button>
          </div>
        </header>

        <section className="gm-selection" aria-label={selectedLabel}>
          <div>
            <strong>{selectedLabel}: {selectedIds.length} / {GLOBAL_MARKETS_SELECTION_SIZE}</strong>
            <ul className="gm-selection-chips">{selectedStrips.map(strip => <li key={strip.id} title={lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn}>{lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn}</li>)}</ul>
          </div>
          <button type="button" onClick={() => setPickerOpen(true)}>
            <Settings2 size={17} aria-hidden="true" /> {customizeLabel}
          </button>
        </section>

        <section className="gm-strips" aria-label={t('global_markets_strips_heading', lang)}>
          {selectedStrips.map(strip => (
            <MarketStrip key={strip.id} strip={strip} prices={prices} lang={lang} dir={dir} loading={loading} onBrowse={() => setBrowseRequest(current => ({ id: strip.id, sequence: (current?.sequence || 0) + 1 }))} />
          ))}
        </section>

        <GlobalMarketsExplorer prices={prices} lang={lang} dir={dir} browseRequest={browseRequest} />

        <GlobalMarketsNews lang={lang} dir={dir} selectedStrips={selectedStrips} ready={hydrated} />

        <p className="gm-disclaimer" dir="auto">{t('global_markets_disclaimer', lang)}</p>
      </WorkspacePageContainer>
      {hydrated ? (
        <GlobalMarketsPicker
          open={pickerOpen}
          lang={lang}
          selectedIds={selectedIds}
          onClose={() => setPickerOpen(false)}
          onSave={setSelectedIds}
        />
      ) : null}
    </div>
  );
}

export default GlobalMarketsPage;
