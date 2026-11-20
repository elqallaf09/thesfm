export const RISK_COPY = {
  ar: {
    title: 'تحليل مخاطر محفظتي', back: 'العودة إلى الاستثمارات', loading: 'جارٍ فحص بيانات المحفظة…',
    partial: 'تحليل جزئي للمراكز المسجلة، وليس درجة مخاطر شاملة.', refresh: 'إعادة الفحص',
    largest: 'أكبر أصل بعد جمع مراكزه', concentration: 'مؤشر التركّز HHI', holdings: 'عدد المراكز', assets: 'عدد الأصول', value: 'القيمة المسجلة', asOf: 'أقدم تقييم أو سعر صرف',
    explanation: 'تفسير المستشار', stress: 'محاكاة تغيّر القيمة', shock: 'التغيّر الافتراضي (%)', simulate: 'احسب السيناريو',
    example: 'أدخل نسبة التغيّر بنفسك؛ السالب يعني انخفاضاً.', hypothetical: 'سيناريو حسابي افتراضي على قيمة الأصول المسجلة، وليس توقعاً أو احتمالاً للخسارة، ولا يشمل الرافعة والديون.',
    invalid: 'أدخل نسبة بين -100 و1000، وتأكد من أن النتيجة رقم صالح.', change: 'التغيّر الافتراضي', ending: 'القيمة بعد السيناريو', export: 'تصدير البيانات JSON',
  },
  en: {
    title: 'Portfolio risk analysis', back: 'Back to investments', loading: 'Checking portfolio evidence…',
    partial: 'Partial analysis of recorded positions, not an overall risk score.', refresh: 'Check again',
    largest: 'Largest grouped asset', concentration: 'Concentration HHI', holdings: 'Positions', assets: 'Assets', value: 'Recorded value', asOf: 'Oldest valuation or FX',
    explanation: 'Advisor explanation', stress: 'Value-change scenario', shock: 'Hypothetical change (%)', simulate: 'Calculate scenario',
    example: 'Enter your own percentage. A negative value means a decline.', hypothetical: 'A mechanical hypothetical scenario on recorded assets, not a forecast or loss probability. Debt and leverage are not included.',
    invalid: 'Enter a percentage between -100 and 1000 and check that the result is finite.', change: 'Hypothetical change', ending: 'Hypothetical ending value', export: 'Export JSON data',
  },
  fr: {
    title: 'Analyse du risque du portefeuille', back: 'Retour aux investissements', loading: 'Vérification des données du portefeuille…',
    partial: 'Analyse partielle des positions enregistrées, sans score global de risque.', refresh: 'Vérifier à nouveau',
    largest: 'Actif regroupé le plus important', concentration: 'Concentration HHI', holdings: 'Positions', assets: 'Actifs', value: 'Valeur enregistrée', asOf: 'Valorisation ou change le plus ancien',
    explanation: 'Explication du conseiller', stress: 'Scénario de variation', shock: 'Variation hypothétique (%)', simulate: 'Calculer le scénario',
    example: 'Saisissez votre pourcentage. Une valeur négative indique une baisse.', hypothetical: 'Scénario mécanique hypothétique sur les actifs enregistrés, et non prévision ou probabilité de perte. Dettes et levier exclus.',
    invalid: 'Saisissez un pourcentage entre -100 et 1000, avec un résultat fini.', change: 'Variation hypothétique', ending: 'Valeur finale hypothétique', export: 'Exporter les données JSON',
  },
} as const;
