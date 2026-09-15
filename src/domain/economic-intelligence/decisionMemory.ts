export type DecisionMemoryRecord = {
  id: string;
  decisionType: string;
  amount: number | null;
  monthlyImpact: number | null;
  riskScore: number | null;
  status: string | null;
  currency: string | null;
  createdAt: string | null;
  resolvedEvents: number;
  recurringEvents: number;
};

export type DecisionMemoryInsight = {
  comparableCount: number;
  averageRiskScore: number | null;
  medianAmount: number | null;
  resolvedEventRate: number | null;
  recurringEventRate: number | null;
  evidenceLevel: 'none' | 'limited' | 'moderate';
  comparableDecisionIds: string[];
  causalClaim: false;
};

function finite(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function comparableAmount(candidateAmount: number | null, historicalAmount: number | null) {
  if (candidateAmount === null || historicalAmount === null) return true;
  if (candidateAmount <= 0 || historicalAmount <= 0) return false;
  const ratio = historicalAmount / candidateAmount;
  return ratio >= 0.5 && ratio <= 2;
}

export function buildDecisionMemoryInsight(
  candidate: { decisionType: string; amount?: number | null; currency?: string | null },
  history: DecisionMemoryRecord[],
): DecisionMemoryInsight {
  const candidateAmount = finite(candidate.amount);
  const currency = String(candidate.currency ?? '').trim().toUpperCase();
  const comparable = history.filter(record => {
    if (record.decisionType !== candidate.decisionType) return false;
    if (currency && String(record.currency ?? '').toUpperCase() !== currency) return false;
    return comparableAmount(candidateAmount, record.amount);
  });

  const riskScores = comparable.map(record => record.riskScore).filter((value): value is number => value !== null);
  const amounts = comparable.map(record => record.amount).filter((value): value is number => value !== null);
  const resolved = comparable.filter(record => record.resolvedEvents > 0).length;
  const recurring = comparable.filter(record => record.recurringEvents > 0).length;

  return {
    comparableCount: comparable.length,
    averageRiskScore: riskScores.length ? riskScores.reduce((sum, value) => sum + value, 0) / riskScores.length : null,
    medianAmount: median(amounts),
    resolvedEventRate: comparable.length >= 2 ? resolved / comparable.length : null,
    recurringEventRate: comparable.length >= 2 ? recurring / comparable.length : null,
    evidenceLevel: comparable.length >= 5 ? 'moderate' : comparable.length >= 2 ? 'limited' : 'none',
    comparableDecisionIds: comparable.map(record => record.id),
    causalClaim: false,
  };
}
