import type { IntelligenceFactorKey } from '@/domain/intelligence/contracts';
import {
  DEFAULT_INTELLIGENCE_FACTOR_MODULES as CORE_MODULES,
  runIntelligenceFactors as runModules,
  type FactorContext,
  type IntelligenceFactorModule,
} from './coreFactors';
import { CONTEXT_FACTOR_KEYS, CONTEXT_FACTOR_MODULES } from './contextFactors';

export type { FactorContext, IntelligenceFactorModule } from './coreFactors';

// Preserve the released price/history factors byte-for-byte, while contextual
// evidence has its own freshness, provenance, and missing-direction boundary.
export const DEFAULT_INTELLIGENCE_FACTOR_MODULES: IntelligenceFactorModule[] = [
  ...CORE_MODULES.filter(module => !CONTEXT_FACTOR_KEYS.has(module.key)),
  ...CONTEXT_FACTOR_MODULES,
];

export function runIntelligenceFactors(
  context: FactorContext,
  modules: IntelligenceFactorKey[],
  availableModules: IntelligenceFactorModule[] = DEFAULT_INTELLIGENCE_FACTOR_MODULES,
) {
  return runModules(context, modules, availableModules);
}
