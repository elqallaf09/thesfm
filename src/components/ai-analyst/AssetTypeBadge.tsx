'use client';

import { Info } from 'lucide-react';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/hooks/useLanguage';
import { assetTypeDisplayFromResult } from './assetTypeDisplay';
import { AI_ANALYST_COPY, aiAnalystLocale } from './copy';
import styles from './AiAnalystWorkspace.module.css';

export function AssetTypeBadge({
  asset,
  loading,
  errorCode,
}: {
  asset: Pick<AnalysisResult['asset'], 'assetType'> | null | undefined;
  loading: boolean;
  errorCode: string | null;
}) {
  const { lang, dir } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale].assetType;
  const state = assetTypeDisplayFromResult(asset, loading, errorCode, locale);
  const label = state.status === 'resolved' ? state.label : state.status === 'loading' ? copy.loading : copy.unresolved;

  return (
    <div className={styles.assetTypeGroup} data-testid="asset-type-badge" data-status={state.status}>
      <span className={styles.metricPill} data-testid="asset-type-label">{copy.label}: {label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className={styles.assetTypeInfoTrigger} aria-label={copy.whatIsThisAria}>
            <Info size={14} aria-hidden="true" />
            {copy.whatIsThis}
          </button>
        </PopoverTrigger>
        <PopoverContent dir={dir} align="start" className={styles.assetTypePopover}>
          <p className={styles.assetTypePopoverTitle}>{copy.popoverTitle}</p>
          <p>{state.status === 'resolved' ? copy.popoverBodyResolved : copy.popoverBodyUnresolved}</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
