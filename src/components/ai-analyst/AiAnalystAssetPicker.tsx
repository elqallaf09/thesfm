'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import type { MarketSearchItem } from '@/lib/market/marketService';
import { intelligenceAssetTypeFromMarket } from '@/lib/intelligence/assetTypes';
import { ANALYST_QUERY_LIMIT, analystAssetSearchUrl, matchesAnalystAssetFilter, normalizeAnalystQuery, type AnalystAssetFilter } from '@/lib/ai-analyst/assetSearch';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_ASSET_TYPES, AI_ANALYST_COPY, AI_ANALYST_HORIZONS, ASSET_TYPE_LABELS, HORIZON_LABELS, aiAnalystLocale } from './copy';
import { normalizeAiAnalystHorizon, normalizeAiAnalystSymbol } from '@/lib/ai-analyst/legacyRoutes';
import styles from './AiAnalystWorkspace.module.css';

type AiAnalystAssetPickerProps = {
  initialSymbol?: string;
  initialAssetType?: IntelligenceAssetType;
  initialHorizon?: IntelligenceHorizon;
  allHorizons?: boolean;
  destination?: 'analysis' | 'history' | 'details';
  onSelect?: (asset: { symbol: string; assetType: IntelligenceAssetType; horizon: IntelligenceHorizon }) => void;
  submitLabel?: string;
  busy?: boolean;
  autoRun?: boolean;
  compact?: boolean;
};

export function AiAnalystAssetPicker({
  initialSymbol = '',
  initialAssetType = 'STOCK',
  initialHorizon = 'SWING',
  allHorizons = false,
  destination = 'analysis',
  autoRun = true,
  compact = false,
  onSelect,
  submitLabel,
  busy = false,
}: AiAnalystAssetPickerProps) {
  const router = useRouter();
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const id = useId();
  const [symbol, setSymbol] = useState(initialSymbol);
  const [assetType, setAssetType] = useState<AnalystAssetFilter>(initialSymbol ? initialAssetType : 'ALL');
  const [horizon, setHorizon] = useState<IntelligenceHorizon | 'ALL'>(allHorizons ? 'ALL' : initialHorizon);
  const [error, setError] = useState('');
  const [results, setResults] = useState<MarketSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const searchCopy = {
    ar: { all: 'الكل', metals: 'معادن', searching: 'جارٍ البحث…', choose: 'اختر الأصل المقصود من النتائج.', empty: 'لم يُعثر على أصل مطابق. جرّب اسمه أو رمزه.', failed: 'تعذر البحث الآن. حاول مرة أخرى.' },
    en: { all: 'All', metals: 'Metals', searching: 'Searching…', choose: 'Select the intended asset from the results.', empty: 'No matching asset. Try its name or symbol.', failed: 'Search failed. Please try again.' },
    fr: { all: 'Tous', metals: 'Métaux', searching: 'Recherche…', choose: 'Choisissez l’actif souhaité dans les résultats.', empty: 'Aucun actif correspondant. Essayez son nom ou symbole.', failed: 'Recherche indisponible. Réessayez.' },
  }[locale];

  // App Router compatibility redirects can keep this client component mounted
  // while the canonical dynamic-route props change. Keep the editable state in
  // sync with the authoritative route selection instead of retaining a stale
  // blank/previous asset after navigation.
  useEffect(() => {
    setSymbol(initialSymbol);
    setAssetType(initialSymbol ? initialAssetType : 'ALL');
    setHorizon(allHorizons ? 'ALL' : initialHorizon);
    setError('');
    setResults([]);
  }, [initialSymbol, initialAssetType, initialHorizon, allHorizons]);
  useEffect(() => () => requestRef.current?.abort(), []);

  const openAsset = (asset: MarketSearchItem) => {
    const normalizedSymbol = normalizeAiAnalystSymbol(asset.symbol);
    if (!normalizedSymbol || !matchesAnalystAssetFilter(asset, assetType)) return;
    setError('');
    const normalizedAssetType = intelligenceAssetTypeFromMarket(asset.assetType);
    const normalizedHorizon = normalizeAiAnalystHorizon(horizon);
    if (onSelect) { onSelect({ symbol: normalizedSymbol, assetType: normalizedAssetType, horizon: normalizedHorizon }); return; }
    const params = new URLSearchParams({ assetType: normalizedAssetType, horizon: normalizedHorizon });
    if (horizon === 'ALL') params.set('horizons', 'all');
    if (destination === 'analysis' && autoRun) params.set('autoRun', '1');
    const path = destination === 'analysis'
      ? `/ai-analyst/analyze/${encodeURIComponent(normalizedSymbol)}?${params.toString()}`
      : `/ai-analyst/history?symbol=${encodeURIComponent(normalizedSymbol)}&${params.toString()}`;
    router.push(destination === 'details' ? `/ai-analyst/assets?symbol=${encodeURIComponent(normalizedSymbol)}&assetType=${normalizedAssetType}` : path);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || searching) return;
    const query = normalizeAnalystQuery(symbol);
    if (!query) { setError(copy.picker.invalidSymbol); return; }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 20_000);
    setError(''); setResults([]); setSearching(true);
    try {
      const response = await fetch(analystAssetSearchUrl(query, assetType), { signal: controller.signal, credentials: 'same-origin' });
      const payload = await response.json();
      if (requestRef.current !== controller) return;
      if (!response.ok || payload.ok !== true) throw new Error('search_failed');
      const items = (Array.isArray(payload.results) ? payload.results as MarketSearchItem[] : []).filter(item => matchesAnalystAssetFilter(item, assetType));
      const resolved = payload.resolved as MarketSearchItem | null;
      if (resolved && matchesAnalystAssetFilter(resolved, assetType)) { openAsset(resolved); return; }
      setResults(items);
      setError(items.length ? searchCopy.choose : searchCopy.empty);
    } catch {
      if (requestRef.current === controller) setError(searchCopy.failed);
    } finally {
      clearTimeout(timer);
      if (requestRef.current === controller) { requestRef.current = null; setSearching(false); }
    }
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
            disabled={busy || searching}
            value={symbol}
            onChange={event => { setSymbol(event.target.value); setError(''); setResults([]); }}
            placeholder={copy.picker.symbolPlaceholder}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={ANALYST_QUERY_LIMIT}
            dir="auto"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-asset-type`}>{copy.picker.assetType}</label>
          <select disabled={busy || searching} id={`${id}-asset-type`} value={assetType} onChange={event => { setAssetType(event.target.value as AnalystAssetFilter); setResults([]); setError(''); }}>
            <option value="ALL">{searchCopy.all}</option>
            <option value="METAL">{searchCopy.metals}</option>
            {AI_ANALYST_ASSET_TYPES.map(type => <option value={type} key={type}>{ASSET_TYPE_LABELS[locale][type]}</option>)}
          </select>
        </div>
        {destination !== 'details' ? <div className={styles.field}>
          <label htmlFor={`${id}-horizon`}>{copy.picker.horizon}</label>
          <select disabled={busy || searching} id={`${id}-horizon`} value={horizon} onChange={event => setHorizon(event.target.value === 'ALL' ? 'ALL' : normalizeAiAnalystHorizon(event.target.value))}>
            {!onSelect ? <option value="ALL">{searchCopy.all}</option> : null}
            {AI_ANALYST_HORIZONS.map(value => <option value={value} key={value}>{HORIZON_LABELS[locale][value]}</option>)}
          </select>
        </div> : null}
        <button className={styles.primaryAction} type="submit" disabled={busy || searching}><Search size={16} aria-hidden="true" />{searching ? searchCopy.searching : submitLabel ?? copy.picker.submit}<ArrowUpRight size={15} aria-hidden="true" /></button>
      </form>
      {error ? <p id={`${id}-error`} className={styles.errorText} role="alert">{error}</p> : null}
      {results.length ? <ul className={styles.searchResults} aria-label={searchCopy.choose}>{results.map(item => <li key={`${item.symbol}:${item.exchange}:${item.assetType}`}><button type="button" onClick={() => openAsset(item)}><span dir="auto">{item.name}</span><span dir="ltr">{item.symbol} · {item.exchange ?? ''}</span></button></li>)}</ul> : null}
    </section>
  );
}
