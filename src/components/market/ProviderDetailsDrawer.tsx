'use client';

import { useLanguage } from '@/hooks/useLanguage';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { FeatureDataStatus, MarketSystemState } from '@/lib/market-state/types';
import { PROVIDER_STATUS_TONE } from './statusPresentation';

export function ProviderDetailsDrawer({
  open,
  onOpenChange,
  system,
  status,
  onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  system: MarketSystemState;
  status: FeatureDataStatus;
  onRetry: () => void;
}) {
  const { dir, t } = useLanguage();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="market-provider-drawer">
        <SheetHeader>
          <SheetTitle>{t('market_state_drawer_title')}</SheetTitle>
          <SheetDescription>
            {t('market_state_catalog_discovered')}: {system.catalog.discovered.toLocaleString()}
            {' · '}
            {t('market_state_catalog_live_quotes')}: {system.catalog.liveQuoteAvailable === null ? t('market_state_catalog_not_measured') : system.catalog.liveQuoteAvailable.toLocaleString()}
            {' · '}
            {t('market_state_catalog_delayed_quotes')}: {system.catalog.delayedQuoteAvailable === null ? t('market_state_catalog_not_measured') : system.catalog.delayedQuoteAvailable.toLocaleString()}
            {' · '}
            {t('market_state_catalog_metadata_only')}: {system.catalog.metadataAvailable.toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="market-provider-drawer-table" role="table" aria-colcount={3} aria-rowcount={system.capabilityMatrix.length + 1}>
          <div className="market-provider-drawer-row market-provider-drawer-head" role="row" aria-rowindex={1}>
            <span role="columnheader" aria-colindex={1}>{t('market_state_capability_column')}</span>
            <span role="columnheader" aria-colindex={2}>{t('market_state_provider_column')}</span>
            <span role="columnheader" aria-colindex={3}>{t('market_state_status_column')}</span>
          </div>
          {system.capabilityMatrix.map((cell, index) => (
            <div className="market-provider-drawer-row" role="row" aria-rowindex={index + 2} key={`${cell.provider}:${cell.capability}`}>
              <span role="cell" aria-colindex={1} data-label={t('market_state_capability_column')}>{cell.capability}</span>
              <span role="cell" aria-colindex={2} data-label={t('market_state_provider_column')}><span dir="ltr">{cell.provider}</span></span>
              <span role="cell" aria-colindex={3} data-label={t('market_state_status_column')}><span className={`market-status-badge ${PROVIDER_STATUS_TONE[cell.status]}`}>{t(`market_state_status_${cell.status}`)}</span></span>
            </div>
          ))}
        </div>

        {status === 'error' || status === 'unavailable' ? (
          <button type="button" onClick={onRetry}>{t('market_state_retry')}</button>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
