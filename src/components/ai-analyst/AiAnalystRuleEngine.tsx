'use client';

import { Sparkles } from 'lucide-react';
import type { AnalysisResult } from '@/domain/intelligence/contracts';
import { useLanguage } from '@/hooks/useLanguage';
import { aiAnalystLocale } from './copy';
import { RESEARCH_COPY } from './researchCopy';
import styles from './AiAnalystWorkspace.module.css';
import detailStyles from './AiAnalystAssetDetails.module.css';

export function AiAnalystRuleEngine({ result = null }: { result?: AnalysisResult | null }) {
  const { lang } = useLanguage();
  const copy = RESEARCH_COPY[aiAnalystLocale(lang)];
  const ready = result?.confidenceCalculation.minimumEvidenceMet === true;
  return (
    <section id="rules" className={`${styles.card} ${styles.spanFull}`} aria-labelledby="ai-rules-title" data-testid="ai-analyst-rule-engine">
      <header className={styles.cardHeader}><div><h2 id="ai-rules-title">{copy.rules}</h2><p>{copy.engineBody}</p></div><Sparkles size={20} aria-hidden="true" /></header>
      <span className={styles.statusPill} data-tone={result ? ready ? 'available' : 'degraded' : undefined}>{result ? ready ? copy.available : copy.limited : copy.pending}</span>
      {result ? <dl className={detailStyles.facts}>
        {[[copy.engine, result.engineVersion], [copy.version, result.rulesVersion], [copy.weights, result.weightingVersion]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd dir="ltr">{value}</dd></div>)}
      </dl> : <p className={styles.mutedText}>{copy.missing}</p>}
    </section>
  );
}
