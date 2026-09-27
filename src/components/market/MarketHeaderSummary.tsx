'use client';

import { useState } from 'react';
import { AlertTriangle, Info, RefreshCw, Settings2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import { computeFreshness } from '@/lib/market-state/freshness';
import { useMarketSystemContext } from './MarketSystemStateProvider';
import { ProviderDetailsDrawer } from './ProviderDetailsDrawer';
import { PROVIDER_STATUS_ICON, PROVIDER_STATUS_TONE } from './statusPresentation';

function headerDeliveryPresentation(system: NonNullable<ReturnType<typeof useMarketSystemContext>['system']>) {
  const freshness = computeFreshness(system.lastSynchronizedAt, 'quotes');
  if (system.delivery?.source === 'unavailable') return { key: 'market_header_data_unavailable', tone: 'danger' as const };
  if (system.featuresFailed.length > 0) return { key: 'market_header_partial', tone: 'warning' as const };
  if (!system.lastSynchronizedAt) return { key: 'market_header_not_configured', tone: 'muted' as const };
  if (freshness.isStale || system.delivery?.cached) return { key: 'market_header_cached', tone: 'warning' as const };
  if (freshness.isDelayed || system.delivery?.delayed) return { key: 'market_header_delayed', tone: 'warning' as const };
  return { key: 'market_header_live', tone: 'success' as const };
}

/**
 * One compact market-data status header: a summary box, a freshness box, a feature-health box,
 * and a single button opening the full Provider Details Drawer — never large per-provider cards
 * in the header itself (those live only in the drawer). Mounted only on market-facing surfaces
 * (see the task's explicit visual-scope restriction), never on core personal-finance pages.
 */
export function MarketHeaderSummary() {
  const { lang, t } = useLanguage();
  const { system, status, isLoading, retry } = useMarketSystemContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="market-header-summary" role="status">
        <div className="market-header-box tone-muted">
          <span className="market-status-icon"><Info size={16} /></span>
          <small>{t('market_service_checking_short')}</small>
        </div>
      </div>
    );
  }

  if (!system) {
    const unavailable = status === 'error' || status === 'unavailable';
    return (
      <div className="market-header-summary" role={unavailable ? 'alert' : 'status'}>
        <div className={`market-header-box tone-${unavailable ? 'danger' : 'muted'}`}>
          <span className="market-status-icon"><AlertTriangle size={16} /></span>
          <div>
            <small dir="auto">{t(unavailable ? 'market_state_load_failed_title' : 'market_service_checking_short')}</small>
            {unavailable ? <p dir="auto">{t('market_state_load_failed_body')}</p> : null}
          </div>
        </div>
        {unavailable ? (
          <button type="button" className="market-header-details-button" onClick={retry}>
            <RefreshCw size={14} /> {t('market_state_retry')}
          </button>
        ) : null}
      </div>
    );
  }

  const tone = PROVIDER_STATUS_TONE[system.overall];
  const Icon = PROVIDER_STATUS_ICON[system.overall];
  const lastSync = system.lastSynchronizedAt ? formatDateTime(system.lastSynchronizedAt, lang) : '';

  const configuredProviders = system.providerProfiles.filter(profile => profile.configured);
  const availableConfigured = configuredProviders.filter(profile => profile.status === 'connected' || profile.status === 'degraded').length;
  const delivery = headerDeliveryPresentation(system);

  const microLabelKey = system.overall === 'degraded'
    ? (system.featuresFailed.length > 0 ? 'market_header_partial' : 'market_header_temporarily_limited')
    : system.overall === 'disconnected' && configuredProviders.length === 0
      ? 'market_header_not_configured'
      : null;

  return (
    <>
      <div className="market-header-summary" role="status">
        <div className={`market-header-box tone-${tone}`}>
          <span className="market-status-icon"><Icon size={16} /></span>
          <div>
            <small dir="auto">{t('market_header_status_title')}</small>
            <p dir="auto">
              <span className={`market-status-badge ${tone}`}>{t(`market_state_status_${system.overall}`)}</span>
              {microLabelKey ? <span className={`market-status-badge ${tone}`}>{t(microLabelKey)}</span> : null}
            </p>
            <p dir="auto">{t('market_header_active_sources')}: {availableConfigured}/{configuredProviders.length}</p>
          </div>
        </div>

        <div className={`market-header-box tone-${delivery.tone}`}>
          <div>
            <small dir="auto">{t(delivery.key)}</small>
            {lastSync ? <p dir="auto">{t('market_state_last_sync')}: {lastSync}</p> : null}
          </div>
        </div>

        <div className="market-header-box tone-muted">
          <div>
            <p dir="auto">{t('market_state_features_succeeded')}: {system.featuresSucceeded.length}</p>
            <p dir="auto">{t('market_state_features_degraded')}: {system.featuresDegraded.length}</p>
            <p dir="auto">{t('market_state_features_failed')}: {system.featuresFailed.length}</p>
          </div>
        </div>

        <button type="button" className="market-header-details-button" onClick={() => setDrawerOpen(true)}>
          <Settings2 size={14} /> {t('market_header_view_sources')}
        </button>
      </div>
      <ProviderDetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        system={system}
        status={status}
        onRetry={retry}
      />
    </>
  );
}
