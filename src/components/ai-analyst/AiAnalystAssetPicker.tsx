'use client';

import { FormEvent, useId, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_ASSET_TYPES, AI_ANALYST_COPY, AI_ANALYST_HORIZONS, ASSET_TYPE_LABELS, HORIZON_LABELS, aiAnalystLocale } from './copy';
import { normalizeAiAnalystAssetType, normalizeAiAnalystHorizon, normalizeAiAnalystSymbol } from '@/lib/ai-analyst/legacyRoutes';
import styles from './AiAnalystWorkspace.module.css';

type AiAnalystAssetPickerProps = {
  initialSymbol?: string;
  initialAssetType?: IntelligenceAssetType;
  initialHorizon?: IntelligenceHorizon;
  destination?: 'analysis' | 'history';
  autoRun?: boolean;
  compact?: boolean;
};

export function AiAnalystAssetPicker({
  initialSymbol = '',
  initialAssetType = 'STOCK',
  initialHorizon = 'SWING',
  destination = 'analysis',
  autoRun = true,
  compact = false,
}: AiAnalystAssetPickerProps) {
  const router = useRouter();
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const id = useId();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [assetType, setAssetType] = useState<IntelligenceAssetType>(initialAssetType);
  const [horizon, setHorizon] = useState<IntelligenceHorizon>(initialHorizon);
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSymbol = normalizeAiAnalystSymbol(symbol);
    if (!normalizedSymbol) {
      setError(copy.picker.invalidSymbol);
      return;
    }
    const normalizedAssetType = normalizeAiAnalystAssetType(assetType);
    const normalizedHorizon = normalizeAiAnalystHorizon(horizon);
    const params = new URLSearchParams({ assetType: normalizedAssetType, horizon: normalizedHorizon });
    if (destination === 'analysis' && autoRun) params.set('autoRun', '1');
    const path = destination === 'analysis'
      ? `/ai-analyst/analyze/${encodeURIComponent(normalizedSymbol)}?${params.toString()}`
      : `/ai-analyst/history?symbol=${encodeURIComponent(normalizedSymbol)}&${params.toString()}`;
    router.push(path);
  };

  return (
    <section className={styles.picker} aria-labelledby={`${id}-title`}>
      <div className={styles.cardHeader}>
        <div>
          <h2 id={`${id}-title`}>{copy.picker.title}</h2>
          {compact ? null : <p>{copy.picker.body}</p>}
        </div>
      </div>
      <form className={styles.pickerForm} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor={`${id}-symbol`}>{copy.picker.symbol}</label>
          <input
            id={`${id}-symbol`}
            value={symbol}
            onChange={event => { setSymbol(event.target.value); setError(''); }}
            placeholder={copy.picker.symbolPlaceholder}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={32}
            dir="ltr"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-asset-type`}>{copy.picker.assetType}</label>
          <select id={`${id}-asset-type`} value={assetType} onChange={event => setAssetType(normalizeAiAnalystAssetType(event.target.value))}>
            {AI_ANALYST_ASSET_TYPES.map(type => <option value={type} key={type}>{ASSET_TYPE_LABELS[locale][type]}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-horizon`}>{copy.picker.horizon}</label>
          <select id={`${id}-horizon`} value={horizon} onChange={event => setHorizon(normalizeAiAnalystHorizon(event.target.value))}>
            {AI_ANALYST_HORIZONS.map(value => <option value={value} key={value}>{HORIZON_LABELS[locale][value]}</option>)}
          </select>
        </div>
        <button className={styles.primaryAction} type="submit"><Search size={16} aria-hidden="true" />{copy.picker.submit}<ArrowUpRight size={15} aria-hidden="true" /></button>
      </form>
      {error ? <p id={`${id}-error`} className={styles.errorText} role="alert">{error}</p> : null}
    </section>
  );
}
