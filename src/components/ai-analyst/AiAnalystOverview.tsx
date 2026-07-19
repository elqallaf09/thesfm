'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BellRing, ChartNoAxesCombined, History, Landmark, LineChart, Sparkles, TrendingUp } from 'lucide-react';
import { AiAnalystAssetPicker } from './AiAnalystAssetPicker';
import { AccuracySummaryPanel } from './AccuracySummaryPanel';
import { RecentAnalysesPanel } from './RecentAnalysesPanel';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY, aiAnalystLocale } from './copy';
import styles from './AiAnalystWorkspace.module.css';

// The legacy command center remains an authenticated/guest-only compatibility
// surface while its remaining non-decision tools complete route-by-route parity.
// It is intentionally not linked from the global or grouped AI Analyst navigation.
const LegacyMarketAnalysisWorkspace = dynamic(
  () => import('@/app/market-analysis/page'),
  { ssr: false },
);

function PlaceholderCard({ icon: Icon, title, body, action }: {
  icon: typeof TrendingUp;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <section className={`${styles.card} ${styles.placeholderCard}`}>
      <Icon aria-hidden="true" size={20} className={styles.placeholderIcon} />
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <Link className={styles.linkAction} href={action.href}>{action.label}</Link> : null}
    </section>
  );
}

function OverviewSurface() {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = AI_ANALYST_COPY[locale];
  return (
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-overview-title">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{copy.overview.snapshot}</p>
            <h2 id="ai-analyst-overview-title">{copy.title}</h2>
            <p>{copy.overview.snapshotBody}</p>
          </div>
          <Sparkles aria-hidden="true" className={styles.placeholderIcon} />
        </header>
        <AiAnalystAssetPicker />
      </section>

      <RecentAnalysesPanel className={styles.spanEight} />
      <AccuracySummaryPanel className={styles.spanFour} compact />
      <PlaceholderCard
        icon={Landmark}
        title={copy.navigation.items.marketLeadership}
        body={copy.overview.snapshotBody}
        action={{ href: '/ai-analyst/market-leadership', label: copy.actions.open }}
      />
      <PlaceholderCard icon={TrendingUp} title={copy.overview.trending} body={copy.overview.trendingBody} />
      <PlaceholderCard
        icon={History}
        title={copy.overview.timeline}
        body={copy.overview.timelineBody}
        action={{ href: '/ai-analyst/history?view=timeline', label: copy.overview.openHistory }}
      />
      <PlaceholderCard
        icon={ChartNoAxesCombined}
        title={copy.overview.changes}
        body={copy.overview.changesBody}
        action={{ href: '/ai-analyst/history?view=timeline', label: copy.overview.openHistory }}
      />
      <PlaceholderCard
        icon={BellRing}
        title={copy.overview.alerts}
        body={copy.overview.alertsBody}
        action={{ href: '/ai-analyst/alerts', label: copy.navigation.items.alerts }}
      />
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-overview-next-title">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{copy.tabs.future}</p>
            <h2 id="ai-analyst-overview-next-title">{copy.tabs.compare}</h2>
            <p>{copy.compare.body}</p>
          </div>
          <LineChart aria-hidden="true" className={styles.placeholderIcon} />
        </header>
        <Link className={styles.linkAction} href="/ai-analyst/compare">{copy.actions.open}</Link>
      </section>
    </div>
  );
}

export function AiAnalystOverview() {
  const params = useSearchParams();
  if (params?.get('legacy') === 'market') return <LegacyMarketAnalysisWorkspace />;
  return <OverviewSurface />;
}
