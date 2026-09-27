import { CASES, LIMITS, parseInput, simulate, type CaseId, type EventKind, type Input, type Scenario } from './engine';

export type SensitivityPoint = Pick<Scenario, 'returns' | 'impact' | 'value'> & {
  magnitude: number;
  baseline: boolean;
  /** Percentage-point difference, not a relative percentage or a probability. */
  deltaImpact: number;
};
export type SensitivitySweep = {
  input: Input;
  kind: EventKind;
  caseId: CaseId;
  points: SensitivityPoint[];
};

/** Five legal magnitudes; vary only one input, with all other assumptions fixed.
 * Uses the existing uncalibrated model, never market data or fitted coefficients.
 * Near a boundary the window shifts instead of duplicating clipped endpoints.
 */
export function sensitivitySweep(value: unknown, kind: EventKind, caseId: CaseId = 'reference'): SensitivitySweep {
  const input = parseInput(value);
  if (!CASES.includes(caseId)) throw new Error('case');
  const shock = input.shocks.find(item => item.kind === kind);
  if (!shock) throw new Error('shock');
  const { min, max, step } = LIMITS[kind];
  const ticks = Math.round((max - min) / step);
  const center = Math.round((shock.magnitude - min) / step);
  const start = Math.max(0, Math.min(ticks - 4, center - 2));
  const scenarioIndex = CASES.indexOf(caseId);
  const baseline = simulate(input).scenarios[scenarioIndex];
  const points = Array.from({ length: 5 }, (_, offset): SensitivityPoint => {
    const isBaseline = start + offset === center;
    // Preserve the exact baseline input; remove floating-point step artifacts elsewhere.
    const candidate = isBaseline ? shock.magnitude : Number((min + (start + offset) * step).toFixed(10));
    const magnitude = candidate === 0 ? 0 : candidate;
    const scenario = isBaseline ? baseline : simulate({
      ...input,
      shocks: input.shocks.map(item => item.kind === kind ? { ...item, magnitude } : item),
    }).scenarios[scenarioIndex];
    const difference = scenario.impact - baseline.impact;
    return { magnitude, baseline: isBaseline, returns: { ...scenario.returns }, impact: scenario.impact,
      value: scenario.value, deltaImpact: difference === 0 ? 0 : difference };
  });
  return { input, kind, caseId, points };
}
