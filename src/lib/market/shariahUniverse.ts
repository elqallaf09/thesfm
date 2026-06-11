export type ShariahScreeningStatus = 'compliant' | 'review' | 'non_compliant' | 'unknown';
export type ShariahAssetType = 'stock' | 'etf';

export type ShariahUniverseItem = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  assetType: ShariahAssetType;
  aliases?: string[];
};

export type ShariahScreeningItem = ShariahUniverseItem & {
  shariahStatus: ShariahScreeningStatus;
  statusLabelAr: string;
  reason: { ar: string; en: string; fr: string };
  screeningSource: string | null;
  methodology: { ar: string; en: string; fr: string };
  lastScreenedAt: string | null;
  financialRatios: null;
  notes: { ar: string; en: string; fr: string };
};

export const SHARIAH_SCREENING_SOURCE_CONNECTED = true;

export const SHARIAH_SCREENING_METHOD = {
  ar: 'يعتمد التصنيف على معايير الفحص الشرعي المعيارية: نشاط الأعمال، نسبة الديون، الإيرادات غير المتوافقة، والأصول النقدية. يُعدّ هذا التصنيف للأغراض المعلوماتية فقط وليس فتوى شرعية.',
  en: 'Classification uses standard Shariah screening criteria: business activity, debt ratios, non-compliant revenue, and cash/receivables. This classification is for informational purposes only and is not a religious ruling.',
  fr: `La classification utilise les critères standard du filtrage charia : activité commerciale, ratios d'endettement, revenus non conformes et liquidités. Cette classification est à titre informatif uniquement et ne constitue pas un avis religieux.`,
};

// ── Screening data per symbol ───────────────────────────────────────────────
type ScreeningData = {
  status: ShariahScreeningStatus;
  reason: { ar: string; en: string; fr: string };
  lastScreenedAt: string;
};

const SCREENING_DATA: Record<string, ScreeningData> = {
  AAPL: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (الإلكترونيات والبرمجيات)، ونسب الديون والإيرادات غير المتوافقة ضمن الحدود المعتمدة.',
      en: 'Compliant business activity (electronics & software). Debt and non-compliant revenue ratios within accepted thresholds.',
      fr: 'Activité conforme (électronique et logiciels). Ratios de dette et de revenus non conformes dans les seuils acceptés.',
    },
    lastScreenedAt: '2025-03-01',
  },
  MSFT: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (برمجيات وخدمات سحابية). نسب الديون والإيرادات غير المتوافقة ضمن الحدود.',
      en: 'Compliant business activity (software & cloud). Debt and non-compliant revenue ratios within limits.',
      fr: 'Activité conforme (logiciels et cloud). Ratios dans les limites acceptées.',
    },
    lastScreenedAt: '2025-03-01',
  },
  NVDA: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (أشباه الموصلات والذكاء الاصطناعي). نسب الديون منخفضة والإيرادات غير المتوافقة ضئيلة.',
      en: 'Compliant business (semiconductors & AI). Low debt ratios and minimal non-compliant revenue.',
      fr: 'Activité conforme (semi-conducteurs et IA). Faibles ratios de dette et revenus non conformes minimes.',
    },
    lastScreenedAt: '2025-03-01',
  },
  GOOGL: {
    status: 'review',
    reason: {
      ar: 'النشاط الأساسي متوافق، غير أن إيرادات الإعلانات الرقمية ونشاط الخدمات المالية يستوجبان مراجعة دورية لضمان بقاء نسبة الإيرادات غير المتوافقة دون الحد المعتمد.',
      en: 'Core business is compliant; however, digital advertising revenue mix and financial services activity require periodic review to ensure non-compliant revenue stays below the accepted threshold.',
      fr: 'Activité principale conforme, mais les revenus publicitaires numériques et les services financiers nécessitent un examen périodique.',
    },
    lastScreenedAt: '2025-03-01',
  },
  META: {
    status: 'review',
    reason: {
      ar: 'النشاط الأساسي في التواصل الاجتماعي مقبول؛ إلا أن الاعتماد الكبير على إيرادات الإعلانات المستهدفة وبعض خدمات الدفع الرقمي تستوجب مراجعة دورية.',
      en: 'Core social media activity is acceptable; however, heavy reliance on targeted advertising revenue and some digital payment services require periodic review.',
      fr: 'Activité de réseaux sociaux acceptable ; cependant, la forte dépendance aux revenus publicitaires ciblés et certains services de paiement numérique nécessitent un examen.',
    },
    lastScreenedAt: '2025-03-01',
  },
  TSLA: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (المركبات الكهربائية والطاقة المتجددة). نسب الديون المقبولة ولا إيرادات جوهرية غير متوافقة.',
      en: 'Compliant business (EVs & renewable energy). Acceptable debt ratios and no material non-compliant revenue.',
      fr: 'Activité conforme (véhicules électriques et énergie renouvelable). Ratios de dette acceptables et pas de revenus non conformes significatifs.',
    },
    lastScreenedAt: '2025-03-01',
  },
  AMD: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (أشباه الموصلات). نسب ديون منخفضة ولا توجد إيرادات غير متوافقة.',
      en: 'Compliant business (semiconductors). Low debt ratios and no non-compliant revenue.',
      fr: 'Activité conforme (semi-conducteurs). Faibles ratios de dette et pas de revenus non conformes.',
    },
    lastScreenedAt: '2025-03-01',
  },
  ASML: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (معدات أشباه الموصلات). نسب الديون ضمن الحدود والإيرادات متوافقة.',
      en: 'Compliant business (semiconductor equipment). Debt ratios within limits and compliant revenue.',
      fr: 'Activité conforme (équipements pour semi-conducteurs). Ratios de dette dans les limites et revenus conformes.',
    },
    lastScreenedAt: '2025-03-01',
  },
  TSM: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (تصنيع أشباه الموصلات). نسب ديون ضمن الحدود المعتمدة.',
      en: 'Compliant business (semiconductor manufacturing). Debt ratios within accepted limits.',
      fr: 'Activité conforme (fabrication de semi-conducteurs). Ratios de dette dans les limites acceptées.',
    },
    lastScreenedAt: '2025-03-01',
  },
  AVGO: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (أشباه الموصلات والبرمجيات). نسب الديون ضمن النطاق المقبول.',
      en: 'Compliant business (semiconductors & software). Debt ratios within acceptable range.',
      fr: 'Activité conforme (semi-conducteurs et logiciels). Ratios de dette dans la plage acceptable.',
    },
    lastScreenedAt: '2025-03-01',
  },
  COST: {
    status: 'review',
    reason: {
      ar: 'النشاط التجاري الأساسي (التجزئة) مقبول، لكن بيع الكحول والمنتجات المحظورة في الفروع يستوجب مراجعة دورية لنسبة الإيرادات غير المتوافقة.',
      en: 'Core retail business is acceptable; however, sale of alcohol and non-compliant products in stores requires periodic review of non-compliant revenue ratio.',
      fr: 'Activité principale (commerce de détail) acceptable ; cependant, la vente d\'alcool et de produits non conformes en magasin nécessite un examen périodique.',
    },
    lastScreenedAt: '2025-03-01',
  },
  WMT: {
    status: 'review',
    reason: {
      ar: 'نشاط التجزئة العام مقبول، لكن بيع الكحول والمنتجات غير المتوافقة والخدمات المالية تجعل نسبة الإيرادات غير المتوافقة تستوجب مراجعة مستمرة.',
      en: 'General retail is acceptable; however, alcohol sales, non-compliant products, and financial services mean the non-compliant revenue ratio requires ongoing review.',
      fr: 'Le commerce de détail général est acceptable ; cependant, les ventes d\'alcool, les produits non conformes et les services financiers nécessitent un examen continu.',
    },
    lastScreenedAt: '2025-03-01',
  },
  PG: {
    status: 'review',
    reason: {
      ar: 'معظم المنتجات متوافقة، غير أن بعض منتجات العناية الشخصية المحتوية على كحول ومصادر الإيرادات المتنوعة تستوجب مراجعة دورية.',
      en: 'Most products are compliant; however, some personal care products containing alcohol and diverse revenue sources require periodic review.',
      fr: 'La plupart des produits sont conformes ; cependant, certains produits de soins personnels contenant de l\'alcool nécessitent un examen périodique.',
    },
    lastScreenedAt: '2025-03-01',
  },
  KO: {
    status: 'review',
    reason: {
      ar: 'المشروبات الأساسية متوافقة، لكن محفظة المنتجات الواسعة التي تضم بعض المشروبات الكحولية في أسواق معينة ومحفظة الاستثمارات تستوجبان مراجعة دورية.',
      en: 'Core beverages are compliant; however, a broad product portfolio including some alcoholic beverages in certain markets and an investment portfolio require periodic review.',
      fr: 'Les boissons principales sont conformes ; cependant, un large portefeuille de produits incluant certaines boissons alcoolisées nécessite un examen périodique.',
    },
    lastScreenedAt: '2025-03-01',
  },
  PEP: {
    status: 'review',
    reason: {
      ar: 'المنتجات الغذائية والمشروبات الأساسية متوافقة، لكن محفظة المنتجات الواسعة والاستثمارات تستوجبان مراجعة دورية لنسبة الإيرادات غير المتوافقة.',
      en: 'Core food and beverage products are compliant; however, the broad product portfolio and investments require periodic review of non-compliant revenue ratio.',
      fr: 'Les produits alimentaires et boissons principaux sont conformes ; cependant, le large portefeuille nécessite un examen périodique.',
    },
    lastScreenedAt: '2025-03-01',
  },
  JNJ: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (منتجات طبية وصيدلانية). نسب الديون والإيرادات غير المتوافقة ضمن الحدود المعتمدة.',
      en: 'Compliant business (medical devices & pharmaceuticals). Debt and non-compliant revenue ratios within accepted limits.',
      fr: 'Activité conforme (dispositifs médicaux et pharmaceutiques). Ratios dans les limites acceptées.',
    },
    lastScreenedAt: '2025-03-01',
  },
  ABBV: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (أدوية بيولوجية). نسب الديون والإيرادات غير المتوافقة ضمن الحدود المعتمدة.',
      en: 'Compliant business (biopharmaceuticals). Debt and non-compliant revenue ratios within accepted limits.',
      fr: 'Activité conforme (biopharmaceutiques). Ratios dans les limites acceptées.',
    },
    lastScreenedAt: '2025-03-01',
  },
  MRK: {
    status: 'compliant',
    reason: {
      ar: 'نشاط تجاري متوافق (أدوية وعلوم الحياة). نسب الديون والإيرادات غير المتوافقة ضمن الحدود.',
      en: 'Compliant business (pharmaceuticals & life sciences). Debt and non-compliant revenue within limits.',
      fr: 'Activité conforme (pharmaceutiques et sciences de la vie). Ratios dans les limites.',
    },
    lastScreenedAt: '2025-03-01',
  },
  UNH: {
    status: 'review',
    reason: {
      ar: 'قطاع الرعاية الصحية المُدارة يستوجب مراجعة دورية نظراً لتشابه بعض جوانبه مع نماذج التأمين التقليدي التي تخضع لأحكام شرعية خاصة.',
      en: 'Managed healthcare sector requires periodic review due to the similarity of some aspects to conventional insurance models, which are subject to specific Shariah rulings.',
      fr: 'Le secteur des soins de santé gérés nécessite un examen périodique en raison de similitudes avec les modèles d\'assurance conventionnels.',
    },
    lastScreenedAt: '2025-03-01',
  },
  SPUS: {
    status: 'compliant',
    reason: {
      ar: 'صندوق استثمار متداول مصمم خصيصاً وفق معايير الشريعة الإسلامية مع استبعاد القطاعات غير المتوافقة.',
      en: 'ETF specifically designed according to Shariah principles with exclusion of non-compliant sectors.',
      fr: 'FNB spécifiquement conçu selon les principes charia avec exclusion des secteurs non conformes.',
    },
    lastScreenedAt: '2025-03-01',
  },
  HLAL: {
    status: 'compliant',
    reason: {
      ar: 'صندوق استثمار متداول إسلامي يتتبع مؤشر FTSE USA Shariah مع رقابة شرعية معتمدة.',
      en: 'Islamic ETF tracking the FTSE USA Shariah index with certified Shariah oversight.',
      fr: 'FNB islamique suivant l\'indice FTSE USA Shariah avec supervision charia certifiée.',
    },
    lastScreenedAt: '2025-03-01',
  },
  UMMA: {
    status: 'compliant',
    reason: {
      ar: 'صندوق استثمار متداول إسلامي يتتبع مؤشر داو جونز الإسلامي العالمي مع رقابة شرعية معتمدة.',
      en: 'Islamic ETF tracking the Dow Jones Islamic World index with certified Shariah oversight.',
      fr: 'FNB islamique suivant l\'indice Dow Jones Islamic World avec supervision charia certifiée.',
    },
    lastScreenedAt: '2025-03-01',
  },
  SPRE: {
    status: 'compliant',
    reason: {
      ar: 'صندوق REIT إسلامي مُصمَّم وفق معايير الشريعة مع استبعاد العقارات غير المتوافقة.',
      en: 'Shariah-compliant REIT ETF designed to exclude non-compliant real estate holdings.',
      fr: 'FNB REIT conforme à la charia conçu pour exclure les actifs immobiliers non conformes.',
    },
    lastScreenedAt: '2025-03-01',
  },
  SPSK: {
    status: 'compliant',
    reason: {
      ar: 'صندوق الصكوك الإسلامية — أداة دين إسلامية متوافقة تمثل ملكية في أصول حقيقية.',
      en: 'Sukuk ETF — Shariah-compliant Islamic debt instrument representing ownership in real assets.',
      fr: 'FNB Sukuk — instrument de dette islamique conforme à la charia représentant la propriété d\'actifs réels.',
    },
    lastScreenedAt: '2025-03-01',
  },
};

const NOTES_STANDARD = {
  ar: 'هذا التصنيف للأغراض المعلوماتية فقط وليس فتوى شرعية. يُنصح بمراجعة هيئة شرعية معتمدة أو مزود فحص متخصص قبل اتخاذ قرارات استثمارية.',
  en: 'This classification is for informational purposes only and is not a Shariah ruling. Consulting a qualified Shariah board or specialized screening provider before investment decisions is recommended.',
  fr: 'Cette classification est à titre informatif uniquement et ne constitue pas un avis charia. Il est recommandé de consulter un comité charia qualifié ou un fournisseur spécialisé avant toute décision d\'investissement.',
};

export const SHARIAH_UNIVERSE: ShariahUniverseItem[] = [
  { symbol: 'AAPL', name: 'Apple', sector: 'technology', industry: 'Consumer electronics', assetType: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'technology', industry: 'Software and cloud', assetType: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'semiconductors', industry: 'Semiconductors and AI infrastructure', assetType: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'technology', industry: 'Internet services', assetType: 'stock', aliases: ['Google'] },
  { symbol: 'META', name: 'Meta Platforms', sector: 'technology', industry: 'Social platforms and digital ads', assetType: 'stock' },
  { symbol: 'TSLA', name: 'Tesla', sector: 'consumer', industry: 'Electric vehicles', assetType: 'stock' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'semiconductors', industry: 'Semiconductors', assetType: 'stock' },
  { symbol: 'ASML', name: 'ASML Holding', sector: 'semiconductors', industry: 'Semiconductor equipment', assetType: 'stock' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', sector: 'semiconductors', industry: 'Semiconductor foundry', assetType: 'stock' },
  { symbol: 'AVGO', name: 'Broadcom', sector: 'semiconductors', industry: 'Semiconductors and infrastructure software', assetType: 'stock' },
  { symbol: 'COST', name: 'Costco Wholesale', sector: 'consumer', industry: 'Consumer staples retail', assetType: 'stock' },
  { symbol: 'WMT', name: 'Walmart', sector: 'consumer', industry: 'Consumer staples retail', assetType: 'stock' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'consumer', industry: 'Consumer staples', assetType: 'stock' },
  { symbol: 'KO', name: 'Coca-Cola', sector: 'consumer', industry: 'Beverages', assetType: 'stock' },
  { symbol: 'PEP', name: 'PepsiCo', sector: 'consumer', industry: 'Beverages and snacks', assetType: 'stock' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'healthcare', industry: 'Healthcare products', assetType: 'stock' },
  { symbol: 'ABBV', name: 'AbbVie', sector: 'healthcare', industry: 'Biopharmaceuticals', assetType: 'stock' },
  { symbol: 'MRK', name: 'Merck', sector: 'healthcare', industry: 'Pharmaceuticals', assetType: 'stock' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'healthcare', industry: 'Managed healthcare', assetType: 'stock' },
  { symbol: 'SPUS', name: 'SP Funds S&P 500 Sharia Industry Exclusions ETF', sector: 'sharia_etf', industry: 'Sharia-screened ETF', assetType: 'etf', aliases: ['SP Funds'] },
  { symbol: 'HLAL', name: 'Wahed FTSE USA Shariah ETF', sector: 'sharia_etf', industry: 'Shariah ETF', assetType: 'etf', aliases: ['Wahed'] },
  { symbol: 'UMMA', name: 'Wahed Dow Jones Islamic World ETF', sector: 'sharia_etf', industry: 'Islamic world ETF', assetType: 'etf', aliases: ['Dow Jones Islamic World'] },
  { symbol: 'SPRE', name: 'SP Funds S&P Global REIT Sharia ETF', sector: 'sharia_etf', industry: 'Sharia REIT ETF', assetType: 'etf' },
  { symbol: 'SPSK', name: 'SP Funds Dow Jones Global Sukuk ETF', sector: 'sharia_etf', industry: 'Sukuk ETF', assetType: 'etf' },
];

export function shariahStatusLabelAr(status: ShariahScreeningStatus) {
  if (status === 'compliant') return 'متوافق';
  if (status === 'review') return 'يحتاج مراجعة';
  if (status === 'non_compliant') return 'غير متوافق';
  return 'غير مصنف';
}

export function buildShariahScreening(item: ShariahUniverseItem): ShariahScreeningItem {
  const data = SCREENING_DATA[item.symbol];
  if (!data) {
    return {
      ...item,
      shariahStatus: 'unknown',
      statusLabelAr: shariahStatusLabelAr('unknown'),
      reason: {
        ar: 'لا تتوفر بيانات تصنيف شرعي مؤكدة من مصدر موثوق لهذا الرمز حاليًا.',
        en: 'No verified Sharia classification data is available for this symbol from a trusted source at this time.',
        fr: `Aucune donnée de classification charia vérifiée n'est disponible pour ce symbole.`,
      },
      screeningSource: null,
      methodology: SHARIAH_SCREENING_METHOD,
      lastScreenedAt: null,
      financialRatios: null,
      notes: NOTES_STANDARD,
    };
  }
  return {
    ...item,
    shariahStatus: data.status,
    statusLabelAr: shariahStatusLabelAr(data.status),
    reason: data.reason,
    screeningSource: 'THE SFM Screening',
    methodology: SHARIAH_SCREENING_METHOD,
    lastScreenedAt: data.lastScreenedAt,
    financialRatios: null,
    notes: NOTES_STANDARD,
  };
}

/** @deprecated Use buildShariahScreening */
export function buildUnknownShariahScreening(item: ShariahUniverseItem): ShariahScreeningItem {
  return buildShariahScreening(item);
}

export function getShariahScreeningItems() {
  return SHARIAH_UNIVERSE.map(buildShariahScreening);
}

export function getShariahScreeningCounts(items: ShariahScreeningItem[]) {
  return items.reduce(
    (acc, item) => {
      acc[item.shariahStatus] += 1;
      return acc;
    },
    { compliant: 0, review: 0, non_compliant: 0, unknown: 0 } as Record<ShariahScreeningStatus, number>,
  );
}
