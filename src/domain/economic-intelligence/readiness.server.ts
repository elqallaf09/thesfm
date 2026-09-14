import 'server-only';
import { loadCrossWorkspaceEvidence } from './crossWorkspaceBrain.server';
import { buildEconomicIntelligenceReadiness } from './readiness';
import { clearReadinessConfirmation, loadReadinessConfirmations } from './readinessConfirmations.server';

export async function loadEconomicIntelligenceReadiness(userId: string) {
  const [evidence, confirmations] = await Promise.all([
    loadCrossWorkspaceEvidence(userId),
    loadReadinessConfirmations(userId),
  ]);
  const readiness = buildEconomicIntelligenceReadiness(evidence, confirmations);
  if (readiness.invalidatedConfirmations.length > 0) {
    await Promise.all(readiness.invalidatedConfirmations.map(key => clearReadinessConfirmation(userId, key).catch(() => undefined)));
  }
  return readiness;
}
