import type { AdvisorGrounding } from '@/domain/economic-intelligence/advisors';

const INTRO = {
  en: 'Economic Intelligence grounding for this authenticated user follows. Treat it as authoritative for the listed facts only.',
  ar: 'فيما يلي سياق الذكاء الاقتصادي للمستخدم الموثق. اعتبره مرجعاً للحقائق المذكورة فقط.',
  fr: 'Voici le contexte Economic Intelligence de cet utilisateur authentifié. Considérez-le comme autoritatif uniquement pour les faits listés.',
} as const;

const LIMIT = {
  en: 'If evidence is missing, say that clearly. Do not infer or invent a missing number. Forecast values are simulations, not guaranteed outcomes.',
  ar: 'إذا كانت الأدلة ناقصة فاذكر ذلك بوضوح. لا تستنتج أو تخترع رقماً مفقوداً. قيم التوقعات محاكاة وليست نتائج مضمونة.',
  fr: 'Si des preuves manquent, indiquez-le clairement. N’inférez ni n’inventez une valeur manquante. Les prévisions sont des simulations, pas des résultats garantis.',
} as const;

export function buildEconomicAdvisorPrompt(
  grounding: AdvisorGrounding,
  locale: 'ar' | 'en' | 'fr',
) {
  const facts = grounding.facts.map((fact) => `${fact.key}=${String(fact.value ?? 'unknown')} [${fact.source}]`).join('; ');
  return [
    INTRO[locale],
    `advisor=${grounding.advisor}`,
    `confidence=${grounding.confidence.toFixed(2)}`,
    `facts: ${facts || 'none'}`,
    `missing: ${grounding.missing.join(', ') || 'none'}`,
    `warnings: ${grounding.warnings.join(', ') || 'none'}`,
    `allowed claims: ${grounding.allowedClaims.join(', ') || 'none'}`,
    `prohibited claims: ${grounding.prohibitedClaims.join(', ') || 'none'}`,
    LIMIT[locale],
  ].join(' ');
}
