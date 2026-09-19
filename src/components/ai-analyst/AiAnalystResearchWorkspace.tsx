'use client';

import { useEffect, useState } from 'react';
import type { IntelligenceAssetType, IntelligenceHorizon } from '@/domain/intelligence/contracts';
import type { InvestmentAnalysisContext } from '@/lib/investments/center';
import { useLanguage } from '@/hooks/useLanguage';
import { AiAnalystAssetPicker } from './AiAnalystAssetPicker';
import { AiAnalystAssetDetails } from './AiAnalystAssetDetails';
import { AiAnalystAnalysis } from './AiAnalystAnalysis';
import { AiAnalystAllHorizons } from './AiAnalystAllHorizons';
import { AiAnalystRuleEngine } from './AiAnalystRuleEngine';
import { aiAnalystLocale } from './copy';
import { RESEARCH_COPY } from './researchCopy';
import styles from './AiAnalystWorkspace.module.css';
import researchStyles from './AiAnalystResearchWorkspace.module.css';

type Props = { symbol?: string; assetType?: IntelligenceAssetType; horizon?: IntelligenceHorizon; allHorizons?: boolean; investmentContext?: InvestmentAnalysisContext | null };

export function AiAnalystResearchWorkspace({ symbol = '', assetType = 'STOCK', horizon = 'SWING', allHorizons = false, investmentContext }: Props) {
  const { lang } = useLanguage();
  const locale = aiAnalystLocale(lang);
  const copy = RESEARCH_COPY[locale];
  const [detailsOpen, setDetailsOpen] = useState(false);
  useEffect(() => { if (window.location.hash === '#details') setDetailsOpen(true); }, [symbol]);
  const privateAsset = investmentContext?.privateAsset === true;
  return (
    <div className={researchStyles.workspace} data-testid="ai-analyst-research-workspace">
      <section className={styles.card} aria-labelledby="ai-research-title">
        <header className={styles.cardHeader}><div><h2 id="ai-research-title">{copy.title}</h2><p>{copy.body}</p></div></header>
        <AiAnalystAssetPicker key={`${symbol}:${assetType}:${horizon}`} initialSymbol={symbol} initialAssetType={assetType} initialHorizon={horizon} allHorizons={allHorizons} autoRun={false} submitLabel={copy.select} compact />
      </section>
      {!privateAsset && symbol ? <details id="details" open={detailsOpen} className={styles.card} onToggle={event => setDetailsOpen(event.currentTarget.open)}><summary className={styles.panelTitle}>{copy.details}</summary>{detailsOpen ? <AiAnalystAssetDetails key={`${symbol}:${assetType}`} symbol={symbol} assetType={assetType} embedded /> : null}</details> : null}
      {symbol ? <div id="research">{allHorizons && !privateAsset ? <AiAnalystAllHorizons symbol={symbol} assetType={assetType} /> : <AiAnalystAnalysis key={`${symbol}:${assetType}:${horizon}`} symbol={symbol} assetType={assetType} horizon={horizon} autoRun={false} investmentContext={investmentContext} />}</div> : <>
        <section id="research" className={styles.card}><h2 className={styles.panelTitle}>{copy.research}</h2><p className={styles.mutedText}>{copy.idle}</p><button className={styles.primaryAction} type="button" disabled>{copy.run}</button></section>
        <AiAnalystRuleEngine />
      </>}
    </div>
  );
}
