'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { History } from 'lucide-react';
import { AiAnalystAssetPicker } from './AiAnalystAssetPicker';
import { AccuracySummaryPanel } from './AccuracySummaryPanel';
import { useLanguage } from '@/hooks/useLanguage';
import { normalizeAiAnalystAssetType, normalizeAiAnalystHorizon, normalizeAiAnalystSymbol } from '@/lib/ai-analyst/legacyRoutes';
import { AI_ANALYST_COPY, aiAnalystLocale } from './copy';
import styles from './AiAnalystWorkspace.module.css';

const IntelligenceTimelinePanel = dynamic(
  () => import('@/components/intelligence/IntelligenceTimelinePanel').then(module => module.IntelligenceTimelinePanel),
  { ssr: false },
);

export function AiAnalystHistory() {
  const params = useSearchParams();
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  const symbol = normalizeAiAnalystSymbol(params?.get('symbol'));
  const assetType = normalizeAiAnalystAssetType(params?.get('assetType'));
  const horizon = normalizeAiAnalystHorizon(params?.get('horizon'));
  const view = params?.get('view') === 'accuracy' ? 'accuracy' : 'timeline';

  return (
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-history-title">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{view === 'accuracy' ? copy.tabs.history : copy.tabs.timeline}</p>
            <h2 id="ai-analyst-history-title">{copy.history.title}</h2>
            <p>{copy.history.body}</p>
          </div>
          <History aria-hidden="true" className={styles.placeholderIcon} />
        </header>
        <AiAnalystAssetPicker
          initialSymbol={symbol ?? ''}
          initialAssetType={assetType}
          initialHorizon={horizon}
          destination="history"
          autoRun={false}
          compact
        />
      </section>

      {view === 'accuracy' ? <AccuracySummaryPanel className={styles.spanFull} /> : null}

      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-history-timeline-title" data-testid="ai-analyst-history-timeline">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{copy.tabs.timeline}</p>
            <h2 id="ai-analyst-history-timeline-title">{copy.overview.timeline}</h2>
            <p>{copy.overview.timelineBody}</p>
          </div>
        </header>
        {symbol ? <IntelligenceTimelinePanel asset={{ canonicalSymbol: symbol, assetType }} horizon={horizon} activeAnalysisId={null} /> : <p className={styles.statusRail}>{copy.history.select}</p>}
      </section>

      {view !== 'accuracy' ? <AccuracySummaryPanel className={styles.spanFull} compact /> : null}
    </div>
  );
}
