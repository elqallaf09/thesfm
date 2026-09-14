import 'server-only';
import { loadCrossWorkspaceEvidence } from './crossWorkspaceBrain.server';
import { buildEconomicIntelligenceReadiness } from './readiness';

export async function loadEconomicIntelligenceReadiness(userId: string) {
  return buildEconomicIntelligenceReadiness(await loadCrossWorkspaceEvidence(userId));
}
