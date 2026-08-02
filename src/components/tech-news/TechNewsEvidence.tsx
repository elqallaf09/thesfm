'use client';

import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { TechNewsItem } from '@/lib/market/fetchTechNews';
import { resolveEvidenceState } from '@/lib/tech-news/newsProcessing';

export type EvidenceLabels = {
  official: string;
  confirmed: string;
  singleSource: string;
  conflicting: string;
  unverified: string;
  sourceCount: string;
  confirmations: string;
  singleSourceDetail: string;
  conflictDetail: string;
};

type TechNewsEvidenceProps = {
  item: Pick<TechNewsItem, 'verificationStatus' | 'isOfficial' | 'independentSourceCount'>;
  labels: EvidenceLabels;
};

export function TechNewsEvidence({ item, labels }: TechNewsEvidenceProps) {
  const { kind, independentCount } = resolveEvidenceState(item);
  const status = kind === 'conflicting'
    ? labels.conflicting
    : kind === 'official'
      ? labels.official
      : kind === 'confirmed'
        ? labels.confirmed
        : kind === 'single_source'
          ? labels.singleSource
          : labels.unverified;
  const detail = kind === 'conflicting'
    ? labels.conflictDetail
    : independentCount > 1
      ? labels.confirmations.replace('{count}', String(independentCount))
      : kind === 'official'
        ? labels.sourceCount.replace('{count}', String(independentCount))
        : labels.singleSourceDetail;

  return (
    <div className={`tech-news-evidence ${kind === 'conflicting' ? 'conflicting' : kind === 'official' ? 'official' : ''}`}>
      {kind === 'conflicting' ? <AlertTriangle size={14} /> : <ShieldCheck size={14} />}
      <div>
        <strong>{status}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

export default TechNewsEvidence;
