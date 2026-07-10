'use client';

import { useState } from 'react';
import { Info, Settings2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/locale';
import { useMarketSystemContext } from './MarketSystemStateProvider';
import { ProviderDetailsDrawer } from './ProviderDetailsDrawer';
import { PROVIDER_STATUS_ICON, PROVIDER_STATUS_TONE } from './statusPresentation';

/**
 * Compact status pill reading the centralized market-state snapshot — never independently infers
 * provider connectivity. Opens a drawer for the full capability matrix rather than overcrowding
 * this header, per the task's explicit "drawer instead of overcrowding" requirement.
 */
export function MarketSystemStatusHeader() {
  const { lang, t } = useLanguage();
  const { system, status, isLoading, retry } = useMarketSystemContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isLoading || !system) {
    return (
      <div className="market-status-card tone-muted" role="status">
        <span className="market-status-icon"><Info size={16} /></span>
        <div className="market-status-body">
          <small>{t('market_service_checking_short')}</small>
        </div>
      </div>
    );
  }

  const tone = PROVIDER_STATUS_TONE[system.overall];
  const Icon = PROVIDER_STATUS_ICON[system.overall];
  const lastSync = system.lastSynchronizedAt ? formatDateTime(system.lastSynchronizedAt, lang) : '';

  return (
    <>
      <div className={`market-status-card tone-${tone}`} role="status">
        <span className="market-status-icon"><Icon size={16} /></span>
        <div className="market-status-body">
          <small dir="auto">{t(`market_state_status_${system.overall}`)}</small>
          <p dir="auto">
            {t('market_state_features_succeeded')}: {system.featuresSucceeded.length}
            {system.featuresDegraded.length > 0 ? ` · ${t('market_state_features_degraded')}: ${system.featuresDegraded.length}` : ''}
            {system.featuresFailed.length > 0 ? ` · ${t('market_state_features_failed')}: ${system.featuresFailed.length}` : ''}
          </p>
          {lastSync ? <p dir="auto">{t('market_state_last_sync')}: {lastSync}</p> : null}
          <button type="button" onClick={() => setDrawerOpen(true)}>
            <Settings2 size={14} /> {t('market_state_view_details')}
          </button>
        </div>
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
