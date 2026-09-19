import type { AnalysisResult } from '@/domain/intelligence/contracts';

export function shariaEvidenceFromAnalysis(result: AnalysisResult | null | undefined) {
  const factor = result?.factors.find(item => item.factor === 'SHARIA');
  if (!factor || factor.availability === 'UNAVAILABLE') return null;
  return factor.evidence.find(item => item.labelKey.replace(/^intelligence_evidence_/, '') === 'verified_sharia_status') ?? null;
}
