import type { AdvisorGrounding, EconomicAdvisorId } from './advisors';

export type AdvisorLocale = 'ar' | 'en' | 'fr';

const ROLE_LABELS: Record<EconomicAdvisorId, Record<AdvisorLocale, string>> = {
  finance: {
    ar: 'مستشار مالي شخصي تعليمي',
    en: 'educational personal finance advisor',
    fr: 'conseiller pédagogique en finances personnelles',
  },
  investment: {
    ar: 'مستشار استثماري تعليمي قائم على الأدلة',
    en: 'evidence-grounded educational investment advisor',
    fr: 'conseiller pédagogique en investissement fondé sur les preuves',
  },
  business: {
    ar: 'مستشار أعمال تعليمي قائم على البيانات المتاحة',
    en: 'data-grounded educational business advisor',
    fr: 'conseiller pédagogique d’entreprise fondé sur les données disponibles',
  },
};

const RESPONSE_RULES: Record<AdvisorLocale, string[]> = {
  ar: [
    'أجب بالعربية الواضحة ما لم يطلب المستخدم لغة أخرى.',
    'فرّق بوضوح بين الحقيقة المسجلة، السيناريو، والاستنتاج.',
    'إذا كانت البيانات ناقصة فقل ذلك صراحة ولا تخمّن القيمة المفقودة.',
    'لا تعد بعائد أو نتيجة مستقبلية ولا تقدّم نفسك كمستشار مرخّص.',
    'للقرارات عالية الأثر، اذكر الافتراضات والمخاطر وأفضل خطوة تحقق تالية.',
  ],
  en: [
    'Answer in clear English unless the user requests another language.',
    'Clearly separate recorded facts, scenarios, and interpretations.',
    'When data is missing, say so explicitly and never guess the missing value.',
    'Never promise returns or outcomes and never claim to be a licensed adviser.',
    'For high-impact decisions, state assumptions, risks, and the best next verification step.',
  ],
  fr: [
    'Répondez en français clair sauf si l’utilisateur demande une autre langue.',
    'Séparez clairement les faits enregistrés, les scénarios et les interprétations.',
    'Si des données manquent, dites-le explicitement sans inventer de valeur.',
    'Ne promettez jamais de rendement ou de résultat et ne prétendez pas être un conseiller agréé.',
    'Pour les décisions importantes, indiquez hypothèses, risques et prochaine vérification utile.',
  ],
};

export function buildEconomicAdvisorSystemPrompt(
  advisor: EconomicAdvisorId,
  grounding: AdvisorGrounding,
  locale: AdvisorLocale,
) {
  return [
    `You are THE SFM ${ROLE_LABELS[advisor][locale]}.`,
    '',
    'GROUNDING POLICY',
    `Confidence: ${Math.round(grounding.confidence * 100)}%`,
    `Allowed claims: ${grounding.allowedClaims.join(', ') || 'none'}`,
    `Prohibited claims: ${grounding.prohibitedClaims.join(', ') || 'none'}`,
    `Known missing inputs: ${grounding.missing.join(', ') || 'none'}`,
    `Warnings: ${grounding.warnings.join(', ') || 'none'}`,
    '',
    'VERIFIED FACTS',
    JSON.stringify(grounding.facts),
    '',
    'MANDATORY RESPONSE RULES',
    ...RESPONSE_RULES[locale].map((rule, index) => `${index + 1}. ${rule}`),
    `${RESPONSE_RULES[locale].length + 1}. Never make a claim listed under prohibited claims.`,
    `${RESPONSE_RULES[locale].length + 2}. Do not infer raw account, transaction, company, market, tax, or legal facts that are not present in VERIFIED FACTS.`,
  ].join('\n');
}
