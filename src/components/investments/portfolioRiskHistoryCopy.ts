export const RISK_HISTORY_COPY = {
  ar: {
    title: 'المقاييس التاريخية للمحفظة', loading: 'جارٍ تحليل بيانات المحفظة…', unavailable: 'لا تتوفر بيانات موثوقة كافية لعرض المخاطر التاريخية.',
    volatility: 'التقلب السنوي', var: 'الخسارة اليومية التاريخية عند مستوى 95%', cvar: 'متوسط خسارة أسوأ 5% من المشاهدات', drawdown: 'أقصى تراجع تاريخي',
    concentration: 'أكبر أصل', window: 'فترة التحليل', observations: 'عدد مشاهدات العوائد',
    caveat: 'هذه مقاييس تاريخية وليست توقعاً أو ضماناً. يمكن أن تتجاوز الخسارة الفعلية قيمة VaR، ولا تعني القيمة الصفرية انعدام المخاطر.',
  },
  en: {
    title: 'Historical portfolio metrics', loading: 'Analyzing portfolio data…', unavailable: 'Insufficient reliable data to display historical portfolio risk.',
    volatility: 'Annualized volatility', var: 'Daily historical loss quantile (95%)', cvar: 'Mean loss in the worst 5% of observations', drawdown: 'Maximum historical drawdown',
    concentration: 'Largest asset', window: 'Analysis window', observations: 'Return observations',
    caveat: 'Historical metrics are not forecasts or guarantees. Actual losses can exceed VaR; a zero value does not imply no risk.',
  },
  fr: {
    title: 'Indicateurs historiques du portefeuille', loading: 'Analyse des données du portefeuille…', unavailable: 'Données fiables insuffisantes pour afficher le risque historique.',
    volatility: 'Volatilité annualisée', var: 'Quantile de perte journalière historique (95 %)', cvar: 'Perte moyenne des 5 % pires observations', drawdown: 'Baisse maximale historique',
    concentration: 'Actif le plus important', window: 'Période analysée', observations: 'Observations de rendement',
    caveat: 'Les indicateurs historiques ne sont ni des prévisions ni des garanties. Les pertes réelles peuvent dépasser la VaR ; une valeur nulle ne signifie pas une absence de risque.',
  },
} as const;
