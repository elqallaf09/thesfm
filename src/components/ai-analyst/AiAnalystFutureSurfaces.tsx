'use client';

import { Bot, GitCompareArrows, ShieldAlert, Sparkles } from 'lucide-react';
import { AiAnalystAssetPicker } from './AiAnalystAssetPicker';
import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY, aiAnalystLocale } from './copy';
import styles from './AiAnalystWorkspace.module.css';

export function AiAnalystAgent({
  initialSymbol,
  initialAssetType,
  initialHorizon,
}: {
  initialSymbol?: string;
  initialAssetType?: IntelligenceAssetType;
  initialHorizon?: IntelligenceHorizon;
}) {
  const { lang } = useLanguage();
  const copy = AI_ANALYST_COPY[aiAnalystLocale(lang)];
  return (
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-agent-title">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{copy.tabs.agent}</p>
            <h2 id="ai-analyst-agent-title">{copy.agent.title}</h2>
            <p>{copy.agent.body}</p>
          </div>
          <Bot aria-hidden="true" className={styles.placeholderIcon} />
        </header>
        <p className={styles.statusRail}><ShieldAlert size={16} aria-hidden="true" />{copy.agent.guardrail}</p>
        <AiAnalystAssetPicker
          initialSymbol={initialSymbol}
          initialAssetType={initialAssetType}
          initialHorizon={initialHorizon}
        />
      </section>
    </div>
  );
}

export function AiAnalystCompare() {
  const { lang } = useLanguage();
  const copy = AI_ANALYST_COPY[aiAnalystLocale(lang)];
  return (
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-compare-title">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{copy.tabs.compare}</p>
            <h2 id="ai-analyst-compare-title">{copy.compare.title}</h2>
            <p>{copy.compare.body}</p>
          </div>
          <GitCompareArrows aria-hidden="true" className={styles.placeholderIcon} />
        </header>
        <AiAnalystAssetPicker destination="history" autoRun={false} />
      </section>
      <article className={`${styles.card} ${styles.placeholderCard}`}>
        <Sparkles size={20} aria-hidden="true" className={styles.placeholderIcon} />
        <h2>{copy.compare.ruleEngine}</h2>
        <p>{copy.compare.openTimeline}</p>
        <span className={styles.statusPill} data-tone="available">{copy.compare.active}</span>
      </article>
    </div>
  );
}

export function AiAnalystOpportunities() {
  const { lang } = useLanguage();
  const copy = AI_ANALYST_COPY[aiAnalystLocale(lang)];
  return (
    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-analyst-future-title">
        <header className={styles.cardHeader}>
          <div>
            <p className={styles.sectionEyebrow}>{copy.tabs.future}</p>
            <h2 id="ai-analyst-future-title">{copy.future.title}</h2>
            <p>{copy.future.body}</p>
          </div>
          <Sparkles aria-hidden="true" className={styles.placeholderIcon} />
        </header>
        <p className={styles.mutedText}>{copy.future.reserved}</p>
      </section>
    </div>
  );
}
