import type { ValuationEvidence } from './contracts';

/** Conservative eligibility policy, not a claim of a backtested valuation model. */
export function qualifiedTransactionEvidence(evidence: ValuationEvidence[], now = new Date()): ValuationEvidence[] {
  const counts = new Map<string, number>();
  for (const item of evidence) counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  return evidence.filter(item => {
    const observed = Date.parse(item.observedOn ?? ''), retrieved = Date.parse(item.retrievedAt);
    let linked = false;
    try { linked = new URL(item.sourceUrl ?? '').protocol === 'https:'; } catch { /* no source link */ }
    return Boolean(item.id && counts.get(item.id) === 1 && item.sourceName.trim() && linked)
      && ['OFFICIAL_TRANSACTION', 'MARKET_TRANSACTION'].includes(item.type)
      && ['EXACT', 'STRONG'].includes(item.assetMatch) && ['EXACT', 'STRONG'].includes(item.geographyMatch)
      && /^[A-Z]{3}$/.test(item.currency ?? '') && ['M2', 'FT2'].includes(item.unitCode ?? '')
      && typeof item.unitValue === 'number' && Number.isFinite(item.unitValue) && item.unitValue > 0
      && Number.isFinite(observed) && Number.isFinite(retrieved) && retrieved >= observed
      && observed <= now.getTime() && now.getTime() - observed <= 366 * 86_400_000
      && retrieved <= now.getTime() + 300_000;
  });
}
