'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { AnalysisResult, IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { useLanguage } from '@/hooks/useLanguage';
import { IntelligencePanel } from '@/components/intelligence/IntelligencePanel';
import { AI_ANALYST_HORIZONS, HORIZON_LABELS, aiAnalystLocale } from './copy';
import styles from './AiAnalystWorkspace.module.css';

/** One explicit action runs all five methods sequentially, sharing provider caches. */
export function AiAnalystAllHorizons({ symbol, assetType }: { symbol: string; assetType: IntelligenceAssetType }) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const [results, setResults] = useState<Partial<Record<IntelligenceHorizon, AnalysisResult>>>({});
  const [failures, setFailures] = useState<Partial<Record<IntelligenceHorizon, string>>>({});
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<IntelligenceHorizon | null>(null);
  const request = useRef<AbortController | null>(null);
  const copy = {
    ar: { title: 'جميع الآفاق الزمنية', run: 'تحليل جميع الآفاق', running: 'جارٍ التحليل', empty: 'لم تُحفظ قراءة لهذا الأفق بعد.', error: 'تعذر إكمال هذا الأفق. افتح التحليل لإعادة المحاولة.', open: 'فتح التحليل', saved: 'كل أفق له بياناته وقراءته المستقلة.' },
    en: { title: 'All time horizons', run: 'Analyze all horizons', running: 'Analyzing', empty: 'No saved reading for this horizon yet.', error: 'This horizon could not finish. Open its analysis to retry.', open: 'Open analysis', saved: 'Each horizon has its own evidence and reading.' },
    fr: { title: 'Tous les horizons', run: 'Analyser tous les horizons', running: 'Analyse en cours', empty: 'Aucune lecture enregistrée pour cet horizon.', error: 'Cet horizon n’a pas abouti. Ouvrez l’analyse pour réessayer.', open: 'Ouvrir l’analyse', saved: 'Chaque horizon possède ses propres preuves et sa lecture.' },
  }[locale];

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    setResults({}); setFailures({}); setRunning(false); setActive(null);
    void Promise.all(AI_ANALYST_HORIZONS.map(async horizon => {
      const params = new URLSearchParams({ symbol, assetType, horizon, locale });
      try {
        const response = await fetch(`/api/intelligence/latest?${params}`, { credentials: 'same-origin', signal: controller.signal });
        const payload = await response.json();
        if (!controller.signal.aborted && response.ok && payload.ok && payload.result) setResults(previous => ({ ...previous, [horizon]: payload.result }));
      } catch { /* A missing saved reading never starts a paid provider request. */ }
    }));
    return () => { controller.abort(); request.current?.abort(); };
  }, [assetType, locale, symbol]);

  async function run() {
    if (running) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setRunning(true); setResults({}); setFailures({});
    try {
      for (const horizon of AI_ANALYST_HORIZONS) {
        if (controller.signal.aborted) break;
        setActive(horizon);
        try {
          const response = await fetch('/api/intelligence/analyze', {
            method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(65_000)]),
            body: JSON.stringify({ asset: { symbol, assetType }, horizon, locale, source: 'SMART_MARKET_ANALYSIS', requestedModules: [], forceRefresh: false }),
          });
          const payload = await response.json();
          if (controller.signal.aborted) break;
          if (response.ok && payload.ok && payload.result) setResults(previous => ({ ...previous, [horizon]: payload.result }));
          else {
            setFailures(previous => ({ ...previous, [horizon]: copy.error }));
            if ([401, 403, 429].includes(response.status)) break;
          }
        } catch { if (!controller.signal.aborted) setFailures(previous => ({ ...previous, [horizon]: copy.error })); }
      }
    } finally { if (!controller.signal.aborted) { setRunning(false); setActive(null); } }
  }

  return <section className={styles.card} aria-label={copy.title}>
    <header className={styles.cardHeader}><div><h2>{copy.title}</h2><p>{copy.saved}</p></div><button type="button" className={styles.primaryAction} disabled={running} onClick={() => void run()}>{running ? copy.running : copy.run}</button></header>
    {AI_ANALYST_HORIZONS.map(horizon => <details key={horizon} open={Boolean(results[horizon]) || active === horizon}>
      <summary>{HORIZON_LABELS[locale][horizon]}{active === horizon ? ` · ${copy.running}` : ''}</summary>
      {results[horizon] ? <IntelligencePanel result={results[horizon]!} loading={false} errorCode={null} onRetry={() => void run()} /> : <p role={failures[horizon] ? 'alert' : 'status'}>{failures[horizon] ?? copy.empty}</p>}
      <Link className={styles.linkAction} href={`/ai-analyst/analyze/${encodeURIComponent(symbol)}?${new URLSearchParams({ assetType, horizon })}`}>{copy.open}</Link>
    </details>)}
  </section>;
}
