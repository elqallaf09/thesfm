import { analyzeDecision, type DecisionAnalysis, type DecisionInputs, type DecisionSourceData } from './decisionAnalysis';
import { missingTemplateInputs } from './decisionTemplates';

export type DecisionComparisonCandidate = {
  id: string;
  label: string;
  inputs: DecisionInputs;
};

export type DecisionComparisonEntry = {
  id: string;
  label: string;
  inputs: DecisionInputs;
  analysis: DecisionAnalysis;
  completenessIssues: string[];
  comparable: boolean;
};

export type DecisionComparisonResult = {
  entries: DecisionComparisonEntry[];
  recommendedId: string | null;
  reason: 'best_risk_adjusted_fit' | 'insufficient_data' | 'currency_mismatch' | 'no_candidates';
};

const statusWeight: Record<DecisionAnalysis['status'], number> = {
  initially_suitable: 4,
  needs_review: 3,
  high_risk: 2,
  insufficient_data: 1,
};

function numeric(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : Number.NEGATIVE_INFINITY;
}

function compareEntries(a: DecisionComparisonEntry, b: DecisionComparisonEntry) {
  const statusDelta = statusWeight[b.analysis.status] - statusWeight[a.analysis.status];
  if (statusDelta !== 0) return statusDelta;

  const scoreDelta = numeric(b.analysis.score) - numeric(a.analysis.score);
  if (scoreDelta !== 0) return scoreDelta;

  const netDelta = numeric(b.analysis.netAfterDecision) - numeric(a.analysis.netAfterDecision);
  if (netDelta !== 0) return netDelta;

  const savingsDelta = numeric(b.analysis.savingsAfterDecision) - numeric(a.analysis.savingsAfterDecision);
  if (savingsDelta !== 0) return savingsDelta;

  return a.label.localeCompare(b.label);
}

export function compareFinancialDecisions(
  candidates: DecisionComparisonCandidate[],
  data: DecisionSourceData,
): DecisionComparisonResult {
  if (candidates.length === 0) return { entries: [], recommendedId: null, reason: 'no_candidates' };

  const currencies = new Set(candidates.map(candidate => candidate.inputs.currency));
  const entries = candidates.map(candidate => {
    const completenessIssues = missingTemplateInputs(candidate.inputs);
    const analysis = analyzeDecision(candidate.inputs, data);
    return {
      ...candidate,
      analysis,
      completenessIssues,
      comparable: completenessIssues.length === 0 && analysis.status !== 'insufficient_data',
    };
  });

  if (currencies.size > 1) return { entries, recommendedId: null, reason: 'currency_mismatch' };

  const comparable = entries.filter(entry => entry.comparable);
  if (comparable.length !== entries.length || comparable.length === 0) {
    return { entries, recommendedId: null, reason: 'insufficient_data' };
  }

  const ranked = [...comparable].sort(compareEntries);
  return {
    entries,
    recommendedId: ranked[0]?.id ?? null,
    reason: ranked[0] ? 'best_risk_adjusted_fit' : 'insufficient_data',
  };
}
