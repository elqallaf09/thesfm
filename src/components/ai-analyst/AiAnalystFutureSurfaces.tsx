'use client';

import { GitCompareArrows, Sparkles } from 'lucide-react';
import { AiAnalystAssetPicker } from './AiAnalystAssetPicker';
import { useLanguage } from '@/hooks/useLanguage';
import { AI_ANALYST_COPY, aiAnalystLocale } from './copy';
import styles from './AiAnalystWorkspace.module.css';

import Link from 'next/link';
import { RESEARCH_COPY } from './researchCopy';

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
      <article className={`${styles.card} ${styles.placeholderCard} ${styles.spanFull}`} data-testid="ai-analyst-rule-engine-placeholder">
        <Sparkles size={20} aria-hidden="true" className={styles.placeholderIcon} />
        <h2>{copy.compare.ruleEngine}</h2>
        <p>{copy.compare.openTimeline}</p>
        <Link className={styles.linkAction} href="/ai-analyst/analyze#rules">{RESEARCH_COPY[aiAnalystLocale(lang)].openRules}</Link>
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
