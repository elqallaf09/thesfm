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
import { CapabilityMatrixSection } from './CapabilityMatrixSection';

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

        <CapabilityMatrixSection system={system} />

        {status === 'error' || status === 'unavailable' ? (
          <button type="button" onClick={onRetry}>{t('market_state_retry')}</button>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
