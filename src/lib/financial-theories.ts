export type FinancialTheoryLang = 'ar' | 'en' | 'fr';

export type LocalizedText = Record<FinancialTheoryLang, string>;

export type FinancialTheoryCategoryId =
  | 'all'
  | 'budget-saving'
  | 'investing'
  | 'debt-risk'
  | 'financial-planning'
  | 'financial-freedom';

export type FinancialTheory = {
  id: string;
  slug: string;
  number: number;
  title: LocalizedText;
  category: Exclude<FinancialTheoryCategoryId, 'all'>;
  isEssential: boolean;
  short: LocalizedText;
  details: Record<FinancialTheoryLang, string[]>;
  examples?: Record<FinancialTheoryLang, string[]>;
  tableRows?: Record<FinancialTheoryLang, Array<{ label: string; value: string }>>;
  keyTakeaway: LocalizedText;
  sfmTool: LocalizedText;
  sfmToolHref?: string;
};

export type FeaturedFinancialTheory = {
  theoryId: string;
  why: LocalizedText;
};

export type FinancialTheoryTool = {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  cta: LocalizedText;
  href?: string;
};

const ESSENTIAL_FINANCIAL_THEORY_IDS = new Set([
  'personal-budgeting',
  'pay-yourself-first',
  'emergency-fund',
  'smart-goals',
  'diversification',
  'reduce-bad-debt',
  'multiple-income-streams',
  'financial-freedom',
]);

export const FINANCIAL_THEORY_PAGE_TEXT = {
  ar: {
    title: 'النظريات المالية',
    subtitle: 'تعلّم أهم النظريات المالية بطريقة بسيطة وعملية تساعدك على إدارة دخلك، مصروفاتك، ادخارك، استثماراتك، ديونك، وبناء حريتك المالية.',
    badge: 'مكتبة مالية ذكية',
    startLearning: 'ابدأ التعلّم',
    exploreTools: 'استكشف الأدوات الذكية',
    introTitle: 'لماذا تحتاج إلى فهم النظريات المالية؟',
    introBody: 'لأن إدارة المال ما تعتمد فقط على تسجيل الدخل والمصروفات. تحتاج تفهم القواعد التي تساعدك على اتخاذ قرارات أفضل: كيف تقسّم راتبك، كيف تدخر، متى تستثمر، كيف تتجنب الديون السيئة، وكيف تبني حرية مالية على المدى الطويل.',
    educationNote: 'هذه الصفحة تعليمية وليست استشارة مالية شخصية.',
    categories: 'التصنيفات',
    theoryLibrary: 'مكتبة النظريات',
    theoryLibrarySubtitle: 'اختر تصنيفاً، افتح النظرية، وشوف كيف يمكن تطبيقها داخل أدوات THE SFM.',
    readMore: 'اقرأ أكثر',
    hideDetails: 'إخفاء التفاصيل',
    keyTakeaway: 'الخلاصة',
    example: 'مثال',
    relatedSfmTool: 'الأداة المرتبطة في THE SFM',
    applyInSfm: 'كيف تطبقها داخل THE SFM',
    openTool: 'فتح الأداة',
    comingSoon: 'قريباً',
    featuredTitle: 'أفضل النظريات داخل THE SFM',
    featuredSubtitle: 'هذه النظريات هي الأقرب لأدوات المنصة وتساعدك على تحويل المعرفة إلى خطوات عملية.',
    smartToolsTitle: 'أدوات وحاسبات ذكية',
    smartToolsSubtitle: 'أدوات عملية مرتبطة بالنظريات المالية لمساعدتك على اتخاذ قرارات أفضل.',
    practicalTitle: 'أمثلة عملية',
    practicalSubtitle: 'أمثلة تعليمية فقط، لا تعرض بيانات حقيقية أو نتائج من حسابك.',
    educationalExample: 'مثال تعليمي',
    noTheories: 'لا توجد نظريات في هذا التصنيف.',
  },
  en: {
    title: 'Financial Theories',
    subtitle: 'Learn the most important financial theories in a simple, practical way to manage income, expenses, savings, investments, debt, and long-term financial freedom.',
    badge: 'Smart financial library',
    startLearning: 'Start Learning',
    exploreTools: 'Explore Smart Tools',
    introTitle: 'Why should you understand financial theories?',
    introBody: 'Money management is not only about recording income and expenses. You need principles that help you decide how to divide income, save, invest, avoid harmful debt, and build financial freedom over time.',
    educationNote: 'This page is educational and not personal financial advice.',
    categories: 'Categories',
    theoryLibrary: 'Theory Library',
    theoryLibrarySubtitle: 'Choose a category, expand a theory, and see how THE SFM tools help you apply it.',
    readMore: 'Read More',
    hideDetails: 'Hide Details',
    keyTakeaway: 'Key Takeaway',
    example: 'Example',
    relatedSfmTool: 'Related SFM Tool',
    applyInSfm: 'How to apply it in THE SFM',
    openTool: 'Open Tool',
    comingSoon: 'Coming soon',
    featuredTitle: 'Best Theories inside THE SFM',
    featuredSubtitle: 'These theories map most closely to THE SFM tools and help turn learning into practical steps.',
    smartToolsTitle: 'Smart Tools & Calculators',
    smartToolsSubtitle: 'Practical tools connected to financial theories to help you make clearer decisions.',
    practicalTitle: 'Practical Examples',
    practicalSubtitle: 'Educational examples only, not real account data or generated user results.',
    educationalExample: 'Educational example',
    noTheories: 'No theories in this category.',
  },
  fr: {
    title: 'Théories financières',
    subtitle: 'Apprenez les théories financières essentielles de façon simple et pratique pour gérer revenus, dépenses, épargne, investissements, dettes et liberté financière.',
    badge: 'Bibliothèque financière intelligente',
    startLearning: 'Commencer',
    exploreTools: 'Explorer les outils intelligents',
    introTitle: 'Pourquoi comprendre les théories financières ?',
    introBody: 'Gérer son argent ne consiste pas seulement à enregistrer revenus et dépenses. Il faut comprendre les règles qui aident à répartir le revenu, épargner, investir, éviter les mauvaises dettes et construire une liberté financière durable.',
    educationNote: 'Cette page est éducative et ne constitue pas un conseil financier personnel.',
    categories: 'Catégories',
    theoryLibrary: 'Bibliothèque des théories',
    theoryLibrarySubtitle: 'Choisissez une catégorie, ouvrez une théorie et voyez comment les outils THE SFM aident à l’appliquer.',
    readMore: 'Lire plus',
    hideDetails: 'Masquer',
    keyTakeaway: 'À retenir',
    example: 'Exemple',
    relatedSfmTool: 'Outil SFM lié',
    applyInSfm: 'Comment l’appliquer dans THE SFM',
    openTool: 'Ouvrir l’outil',
    comingSoon: 'Bientôt disponible',
    featuredTitle: 'Meilleures théories dans THE SFM',
    featuredSubtitle: 'Ces théories sont les plus proches des outils de la plateforme et transforment l’apprentissage en actions.',
    smartToolsTitle: 'Outils et calculateurs intelligents',
    smartToolsSubtitle: 'Des outils pratiques liés aux théories financières pour prendre des décisions plus claires.',
    practicalTitle: 'Exemples pratiques',
    practicalSubtitle: 'Exemples éducatifs uniquement, sans données réelles de compte ni résultats utilisateur.',
    educationalExample: 'Exemple éducatif',
    noTheories: 'Aucune théorie dans cette catégorie.',
  },
} as const;

export const FINANCIAL_THEORY_STATS: Array<{ label: LocalizedText }> = [
  {
    label: {
      ar: '15 نظرية مالية',
      en: '15 financial theories',
      fr: '15 théories financières',
    },
  },
  {
    label: {
      ar: '8 نظريات أساسية لـ SFM',
      en: '8 core SFM theories',
      fr: '8 théories clés SFM',
    },
  },
  {
    label: {
      ar: 'أدوات وحاسبات ذكية',
      en: 'Smart tools and calculators',
      fr: 'Outils et calculateurs intelligents',
    },
  },
  {
    label: {
      ar: 'أمثلة عملية',
      en: 'Practical examples',
      fr: 'Exemples pratiques',
    },
  },
];

export const FINANCIAL_THEORY_CATEGORIES: Array<{
  id: FinancialTheoryCategoryId;
  label: LocalizedText;
}> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' } },
  { id: 'budget-saving', label: { ar: 'الميزانية والادخار', en: 'Budgeting & Saving', fr: 'Budget et épargne' } },
  { id: 'investing', label: { ar: 'الاستثمار', en: 'Investing', fr: 'Investissement' } },
  { id: 'debt-risk', label: { ar: 'الديون والمخاطر', en: 'Debt & Risk', fr: 'Dette et risque' } },
  { id: 'financial-planning', label: { ar: 'التخطيط المالي', en: 'Financial Planning', fr: 'Planification financière' } },
  { id: 'financial-freedom', label: { ar: 'الحرية المالية', en: 'Financial Freedom', fr: 'Liberté financière' } },
];

export const FINANCIAL_THEORIES: FinancialTheory[] = [
  {
    id: 'personal-budgeting',
    slug: 'personal-budgeting',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('personal-budgeting'),
    number: 1,
    title: { ar: 'نظرية الميزانية الشخصية', en: 'Personal Budgeting Theory', fr: 'Théorie du budget personnel' },
    category: 'budget-saving',
    short: {
      ar: 'قسّم دخلك إلى أقسام واضحة بدل الصرف العشوائي.',
      en: 'Divide your income into clear buckets instead of spending randomly.',
      fr: 'Répartissez votre revenu en catégories claires au lieu de dépenser au hasard.',
    },
    details: {
      ar: ['تقول إن الشخص لازم يقسم دخله إلى أقسام واضحة بدل ما يصرف عشوائيًا.'],
      en: ['This theory says income should be divided into clear categories so daily spending does not absorb the whole salary.'],
      fr: ['Cette théorie recommande de diviser le revenu en catégories claires pour éviter que les dépenses quotidiennes absorbent tout le salaire.'],
    },
    examples: {
      ar: ['قاعدة 50 / 30 / 20'],
      en: ['The 50 / 30 / 20 rule'],
      fr: ['La règle 50 / 30 / 20'],
    },
    tableRows: {
      ar: [
        { label: '50%', value: 'احتياجات أساسية: إيجار، أكل، فواتير' },
        { label: '30%', value: 'رغبات: مطاعم، سفر، مشتريات' },
        { label: '20%', value: 'ادخار، استثمار، سداد ديون' },
      ],
      en: [
        { label: '50%', value: 'Needs: rent, food, bills' },
        { label: '30%', value: 'Wants: restaurants, travel, purchases' },
        { label: '20%', value: 'Saving, investing, debt repayment' },
      ],
      fr: [
        { label: '50 %', value: 'Besoins : loyer, nourriture, factures' },
        { label: '30 %', value: 'Envies : restaurants, voyages, achats' },
        { label: '20 %', value: 'Épargne, investissement, remboursement de dettes' },
      ],
    },
    keyTakeaway: {
      ar: 'لا تخلي الراتب كله يروح على المصاريف اليومية.',
      en: 'Do not let your entire salary disappear into daily expenses.',
      fr: 'Ne laissez pas tout votre salaire partir dans les dépenses quotidiennes.',
    },
    sfmTool: { ar: 'حاسبة تقسيم الراتب', en: 'Salary Split Calculator', fr: 'Calculateur de répartition du revenu' },
  },
  {
    id: 'pay-yourself-first',
    slug: 'pay-yourself-first',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('pay-yourself-first'),
    number: 2,
    title: { ar: 'نظرية ادفع لنفسك أولًا', en: 'Pay Yourself First', fr: 'Se payer en premier' },
    category: 'budget-saving',
    short: {
      ar: 'خصص مبلغًا للادخار أو الاستثمار أول ما ينزل الراتب.',
      en: 'Set aside savings or investment money as soon as income arrives.',
      fr: 'Mettez de côté l’épargne ou l’investissement dès que le revenu arrive.',
    },
    details: {
      ar: ['قبل لا تصرف، خصص مبلغ للادخار أو الاستثمار أول ما ينزل الراتب.'],
      en: ['Before spending, transfer a fixed amount to savings or investments first.'],
      fr: ['Avant de dépenser, transférez d’abord un montant fixe vers l’épargne ou l’investissement.'],
    },
    examples: {
      ar: ['راتبك 1000 دينار. أول شيء تحوّل 150 دينار للادخار. وبعدين تعيش على الباقي.'],
      en: ['If your salary is 1000 KWD, move 150 KWD to savings first, then live on the rest.'],
      fr: ['Si votre salaire est de 1000 KWD, transférez d’abord 150 KWD vers l’épargne, puis vivez avec le reste.'],
    },
    keyTakeaway: {
      ar: 'الادخار لا يكون من الباقي، لأن غالبًا قد لا يبقى شيء.',
      en: 'Saving should not depend on leftovers, because leftovers often disappear.',
      fr: 'L’épargne ne doit pas dépendre du reste, car il ne reste souvent rien.',
    },
    sfmTool: { ar: 'خطة الادخار', en: 'Savings Plan', fr: 'Plan d’épargne' },
    sfmToolHref: '/savings',
  },
  {
    id: 'compound-interest',
    slug: 'compound-interest',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('compound-interest'),
    number: 3,
    title: { ar: 'نظرية الفائدة المركبة', en: 'Compound Interest Theory', fr: 'Théorie des intérêts composés' },
    category: 'investing',
    short: {
      ar: 'أرباحك تولّد أرباحًا جديدة مع الوقت.',
      en: 'Your gains can generate new gains over time.',
      fr: 'Vos gains peuvent générer de nouveaux gains avec le temps.',
    },
    details: {
      ar: ['الفائدة المركبة من أقوى النظريات المالية. معناها أن أرباحك تولّد أرباحًا جديدة مع الوقت.'],
      en: ['Compound growth is one of the strongest financial ideas: returns can earn additional returns over time.'],
      fr: ['La croissance composée est une idée financière puissante : les gains peuvent eux-mêmes produire de nouveaux gains.'],
    },
    examples: {
      ar: ['تستثمر 1000 دينار بعائد 10% سنويًا. السنة الأولى: 1000 تصبح 1100. السنة الثانية: الربح يكون على 1100 وليس 1000. مع الوقت، النمو يتضاعف.'],
      en: ['Invest 1000 KWD at 10% annually. After year one it becomes 1100. In year two, growth happens on 1100, not only 1000.'],
      fr: ['Investissez 1000 KWD à 10 % par an. Après un an, cela devient 1100. La deuxième année, la croissance porte sur 1100, pas seulement 1000.'],
    },
    keyTakeaway: {
      ar: 'كل ما بدأت أبكر، النتيجة تكبر أكثر.',
      en: 'The earlier you start, the more time compounding has to work.',
      fr: 'Plus vous commencez tôt, plus la capitalisation a le temps d’agir.',
    },
    sfmTool: { ar: 'حاسبة النمو المركب', en: 'Compound Growth Calculator', fr: 'Calculateur de croissance composée' },
  },
  {
    id: 'diversification',
    slug: 'diversification',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('diversification'),
    number: 4,
    title: { ar: 'نظرية تنويع الاستثمار', en: 'Investment Diversification', fr: 'Diversification des investissements' },
    category: 'investing',
    short: {
      ar: 'لا تضع كل أموالك في أصل واحد.',
      en: 'Do not put all your money into one asset.',
      fr: 'Ne mettez pas tout votre argent dans un seul actif.',
    },
    details: {
      ar: ['لا تضع كل أموالك في مكان واحد. وزّع أموالك بين أكثر من أصل لتقليل المخاطر.'],
      en: ['Spread money across more than one asset type to reduce the impact of one asset performing badly.'],
      fr: ['Répartissez l’argent entre plusieurs types d’actifs pour réduire l’impact d’un actif en difficulté.'],
    },
    tableRows: {
      ar: [
        { label: 'أسهم', value: 'شركات' },
        { label: 'صناديق', value: 'ETFs أو صناديق استثمار' },
        { label: 'ذهب', value: 'حفظ القيمة' },
        { label: 'عقار', value: 'دخل طويل المدى' },
        { label: 'كاش', value: 'للطوارئ' },
      ],
      en: [
        { label: 'Stocks', value: 'Companies' },
        { label: 'Funds', value: 'ETFs or investment funds' },
        { label: 'Gold', value: 'Value preservation' },
        { label: 'Real estate', value: 'Long-term income' },
        { label: 'Cash', value: 'Emergency access' },
      ],
      fr: [
        { label: 'Actions', value: 'Entreprises' },
        { label: 'Fonds', value: 'ETF ou fonds d’investissement' },
        { label: 'Or', value: 'Préservation de valeur' },
        { label: 'Immobilier', value: 'Revenu long terme' },
        { label: 'Cash', value: 'Urgences' },
      ],
    },
    keyTakeaway: {
      ar: 'إذا خسر جزء، ما تخسر كل شيء.',
      en: 'If one part loses value, you do not lose everything.',
      fr: 'Si une partie baisse, vous ne perdez pas tout.',
    },
    sfmTool: { ar: 'تحليل المحفظة', en: 'Portfolio Analysis', fr: 'Analyse du portefeuille' },
    sfmToolHref: '/invest',
  },
  {
    id: 'risk-return',
    slug: 'risk-return',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('risk-return'),
    number: 5,
    title: { ar: 'نظرية المخاطرة والعائد', en: 'Risk and Return Theory', fr: 'Théorie risque-rendement' },
    category: 'debt-risk',
    short: {
      ar: 'كلما زاد العائد المتوقع، غالبًا زادت المخاطرة.',
      en: 'Higher expected return usually comes with higher risk.',
      fr: 'Un rendement attendu plus élevé implique souvent un risque plus élevé.',
    },
    details: {
      ar: ['كل ما زاد العائد المتوقع، غالبًا تزيد المخاطرة.'],
      en: ['Most financial choices involve a trade-off between potential reward and possible loss.'],
      fr: ['La plupart des décisions financières impliquent un compromis entre gain potentiel et perte possible.'],
    },
    examples: {
      ar: ['الوديعة البنكية: مخاطرتها قليلة وربحها قليل.', 'الأسهم: عائد أعلى ومخاطرة أعلى.', 'الكريبتو: مخاطرة عالية جدًا.'],
      en: ['A bank deposit usually has lower risk and lower return.', 'Stocks can offer higher return with higher risk.', 'Crypto is often very high risk.'],
      fr: ['Un dépôt bancaire a généralement un risque et un rendement faibles.', 'Les actions peuvent offrir plus de rendement avec plus de risque.', 'La crypto est souvent très risquée.'],
    },
    keyTakeaway: {
      ar: 'لا تطارد الربح العالي بدون ما تفهم المخاطرة.',
      en: 'Do not chase high return without understanding the risk.',
      fr: 'Ne poursuivez pas un rendement élevé sans comprendre le risque.',
    },
    sfmTool: { ar: 'تحليل المخاطر', en: 'Risk Analysis', fr: 'Analyse du risque' },
    sfmToolHref: '/invest',
  },
  {
    id: 'emergency-fund',
    slug: 'emergency-fund',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('emergency-fund'),
    number: 6,
    title: { ar: 'نظرية صندوق الطوارئ', en: 'Emergency Fund Theory', fr: 'Théorie du fonds d’urgence' },
    category: 'budget-saving',
    short: {
      ar: 'احتفظ بمبلغ يغطي مصاريف 3 إلى 6 أشهر.',
      en: 'Keep enough money to cover 3 to 6 months of expenses.',
      fr: 'Gardez assez d’argent pour couvrir 3 à 6 mois de dépenses.',
    },
    details: {
      ar: ['لازم يكون عندك مبلغ يغطي مصاريفك من 3 إلى 6 أشهر.'],
      en: ['An emergency fund protects your budget when income stops or unexpected expenses appear.'],
      fr: ['Un fonds d’urgence protège votre budget en cas d’arrêt de revenu ou de dépense imprévue.'],
    },
    examples: {
      ar: ['مصروفك الشهري 500 دينار. صندوق الطوارئ المطلوب: 1500 إلى 3000 دينار.'],
      en: ['If monthly expenses are 500 KWD, the target emergency fund is 1500 to 3000 KWD.'],
      fr: ['Si vos dépenses mensuelles sont de 500 KWD, le fonds cible est de 1500 à 3000 KWD.'],
    },
    keyTakeaway: {
      ar: 'هذا المبلغ للطوارئ فقط، وليس للاستثمار أو السفر.',
      en: 'This money is for emergencies, not investing or travel.',
      fr: 'Cet argent est réservé aux urgences, pas aux investissements ou aux voyages.',
    },
    sfmTool: { ar: 'حاسبة صندوق الطوارئ', en: 'Emergency Fund Calculator', fr: 'Calculateur de fonds d’urgence' },
  },
  {
    id: 'multiple-income-streams',
    slug: 'multiple-income-streams',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('multiple-income-streams'),
    number: 7,
    title: { ar: 'نظرية الدخل المتعدد', en: 'Multiple Income Streams', fr: 'Sources de revenus multiples' },
    category: 'financial-planning',
    short: {
      ar: 'لا تعتمد على مصدر دخل واحد.',
      en: 'Do not rely on only one income source.',
      fr: 'Ne dépendez pas d’une seule source de revenu.',
    },
    details: {
      ar: ['لا تعتمد على مصدر دخل واحد. وجود أكثر من مصدر دخل يحميك إذا توقف مصدر معين.'],
      en: ['More than one income source can reduce vulnerability if one source stops.'],
      fr: ['Plusieurs sources de revenus réduisent la fragilité si une source s’arrête.'],
    },
    tableRows: {
      ar: [
        { label: 'راتب', value: 'الوظيفة' },
        { label: 'مشروع', value: 'متجر، خدمة، تطبيق' },
        { label: 'استثمار', value: 'أسهم، صناديق' },
        { label: 'دخل سلبي', value: 'إيجار، أرباح، اشتراكات' },
        { label: 'عمل جانبي', value: 'تصميم، تسويق، بيع' },
      ],
      en: [
        { label: 'Salary', value: 'Employment' },
        { label: 'Business', value: 'Store, service, app' },
        { label: 'Investment', value: 'Stocks, funds' },
        { label: 'Passive income', value: 'Rent, dividends, subscriptions' },
        { label: 'Side work', value: 'Design, marketing, selling' },
      ],
      fr: [
        { label: 'Salaire', value: 'Emploi' },
        { label: 'Projet', value: 'Boutique, service, application' },
        { label: 'Investissement', value: 'Actions, fonds' },
        { label: 'Revenu passif', value: 'Loyer, dividendes, abonnements' },
        { label: 'Activité secondaire', value: 'Design, marketing, vente' },
      ],
    },
    keyTakeaway: {
      ar: 'إذا توقف مصدر، عندك غيره يغطيك.',
      en: 'If one source stops, another can support you.',
      fr: 'Si une source s’arrête, une autre peut vous soutenir.',
    },
    sfmTool: { ar: 'مصادر الدخل', en: 'Income Sources', fr: 'Sources de revenus' },
    sfmToolHref: '/income',
  },
  {
    id: 'reduce-bad-debt',
    slug: 'reduce-bad-debt',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('reduce-bad-debt'),
    number: 8,
    title: { ar: 'نظرية تقليل الديون السيئة', en: 'Reducing Bad Debt', fr: 'Réduire les mauvaises dettes' },
    category: 'debt-risk',
    short: {
      ar: 'تجنب الديون التي لا تبني أصلًا أو دخلًا.',
      en: 'Avoid debt that does not build an asset or income.',
      fr: 'Évitez les dettes qui ne créent ni actif ni revenu.',
    },
    details: {
      ar: ['ليست كل الديون سيئة، لكن بعض الديون تضر الخطة المالية.', 'الدين السيئ: قرض لاستهلاك شيء لا يزيد قيمته.', 'الدين الجيد: دين يساعدك تزيد دخلك أو تملك أصلًا، مثل مشروع مدروس أو عقار مؤجر.'],
      en: ['Not all debt is harmful, but some debt weakens financial stability.', 'Bad debt funds consumption that does not grow in value.', 'Good debt can help build income or own an asset, such as a studied project or rental property.'],
      fr: ['Toutes les dettes ne sont pas mauvaises, mais certaines fragilisent la situation financière.', 'Une mauvaise dette finance une consommation qui ne prend pas de valeur.', 'Une bonne dette peut aider à créer un revenu ou posséder un actif, comme un projet étudié ou un bien locatif.'],
    },
    keyTakeaway: {
      ar: 'لا تدخل في قرض إلا إذا كنت تعرف كيف ستسدده وما فائدته.',
      en: 'Do not take debt unless you know how you will repay it and why it helps.',
      fr: 'Ne prenez pas de dette sans savoir comment la rembourser et en quoi elle aide.',
    },
    sfmTool: { ar: 'خطة سداد الديون', en: 'Debt Repayment Plan', fr: 'Plan de remboursement des dettes' },
  },
  {
    id: 'time-value-money',
    slug: 'time-value-money',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('time-value-money'),
    number: 9,
    title: { ar: 'نظرية القيمة الزمنية للمال', en: 'Time Value of Money', fr: 'Valeur temporelle de l’argent' },
    category: 'investing',
    short: {
      ar: 'الدينار اليوم قيمته أعلى من الدينار بعد سنة.',
      en: 'Money today is usually worth more than money later.',
      fr: 'L’argent aujourd’hui vaut souvent plus que l’argent plus tard.',
    },
    details: {
      ar: ['الدينار اليوم قيمته أعلى من الدينار بعد سنة لأنك تقدر تستثمره، ولأن التضخم يرفع الأسعار.'],
      en: ['Money now has more potential because it can be invested, while inflation can reduce future purchasing power.'],
      fr: ['L’argent disponible maintenant a plus de potentiel car il peut être investi, tandis que l’inflation réduit le pouvoir d’achat futur.'],
    },
    examples: {
      ar: ['100 دينار اليوم تشتري أكثر من 100 دينار بعد خمس سنوات.'],
      en: ['100 KWD today can buy more than 100 KWD five years from now if prices rise.'],
      fr: ['100 KWD aujourd’hui peuvent acheter plus que 100 KWD dans cinq ans si les prix augmentent.'],
    },
    keyTakeaway: {
      ar: 'لا تترك أموالك دون هدف واضح.',
      en: 'Do not leave money idle without a purpose.',
      fr: 'Ne laissez pas l’argent immobile sans objectif.',
    },
    sfmTool: { ar: 'تحليل القرار المالي', en: 'Financial Decision Analysis', fr: 'Analyse de décision financière' },
    sfmToolHref: '/decisions',
  },
  {
    id: 'long-term-investing',
    slug: 'long-term-investing',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('long-term-investing'),
    number: 10,
    title: { ar: 'نظرية الاستثمار طويل المدى', en: 'Long-Term Investing', fr: 'Investissement à long terme' },
    category: 'investing',
    short: {
      ar: 'الاستثمار الحقيقي يحتاج وقت وصبر.',
      en: 'Real investing needs time and patience.',
      fr: 'Le vrai investissement demande du temps et de la patience.',
    },
    details: {
      ar: ['الناس تخسر غالبًا لأنها تدخل وتطلع بسرعة بسبب الخوف أو الطمع. الاستثمار طويل المدى يعتمد على الصبر، التوزيع، والاستمرار.'],
      en: ['Many losses happen when people enter and exit quickly because of fear or greed. Long-term investing depends on patience, diversification, and consistency.'],
      fr: ['Beaucoup de pertes viennent d’entrées et sorties rapides motivées par la peur ou l’avidité. Le long terme repose sur la patience, la diversification et la régularité.'],
    },
    keyTakeaway: {
      ar: 'الصبر والتوزيع أهم من محاولة توقيت السوق.',
      en: 'Patience and diversification matter more than trying to time the market.',
      fr: 'La patience et la diversification comptent plus que le timing du marché.',
    },
    sfmTool: { ar: 'تحليل الاستثمارات', en: 'Investment Analysis', fr: 'Analyse des investissements' },
    sfmToolHref: '/invest',
  },
  {
    id: 'lifestyle-inflation',
    slug: 'lifestyle-inflation',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('lifestyle-inflation'),
    number: 11,
    title: { ar: 'نظرية التحكم بالتضخم الشخصي', en: 'Lifestyle Inflation Control', fr: 'Contrôle de l’inflation du mode de vie' },
    category: 'budget-saving',
    short: {
      ar: 'لا ترفع مصاريفك بنفس سرعة ارتفاع دخلك.',
      en: 'Do not let expenses rise as fast as income.',
      fr: 'Ne laissez pas les dépenses augmenter aussi vite que le revenu.',
    },
    details: {
      ar: ['لما يزيد دخلك، لا ترفع مصاريفك بنفس السرعة.'],
      en: ['When income increases, avoid increasing expenses at the same speed.'],
      fr: ['Quand le revenu augmente, évitez d’augmenter les dépenses au même rythme.'],
    },
    examples: {
      ar: ['راتبك كان 800 وصار 1000. لا تخلي مصروفك يزيد من 700 إلى 950. الأفضل تزيد الادخار والاستثمار.'],
      en: ['If salary rises from 800 to 1000 KWD, avoid raising expenses from 700 to 950. Increase saving or investing instead.'],
      fr: ['Si le salaire passe de 800 à 1000 KWD, évitez de faire passer les dépenses de 700 à 950. Augmentez plutôt l’épargne ou l’investissement.'],
    },
    keyTakeaway: {
      ar: 'الثراء لا يعتمد فقط على زيادة الدخل، بل على التحكم بالمصاريف.',
      en: 'Wealth is not only higher income; it is also expense control.',
      fr: 'La richesse n’est pas seulement un revenu plus élevé, c’est aussi la maîtrise des dépenses.',
    },
    sfmTool: { ar: 'تحليل المصروفات', en: 'Expense Analysis', fr: 'Analyse des dépenses' },
    sfmToolHref: '/expenses',
  },
  {
    id: 'smart-goals',
    slug: 'smart-goals',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('smart-goals'),
    number: 12,
    title: { ar: 'نظرية الأهداف المالية الذكية', en: 'SMART Financial Goals', fr: 'Objectifs financiers SMART' },
    category: 'financial-planning',
    short: {
      ar: 'الهدف المالي لازم يكون واضحًا وقابلًا للحساب.',
      en: 'A financial goal must be clear and measurable.',
      fr: 'Un objectif financier doit être clair et mesurable.',
    },
    details: {
      ar: ['أي هدف مالي لازم يكون واضح وقابل للحساب.'],
      en: ['A strong financial goal includes an amount, a time frame, and a monthly action.'],
      fr: ['Un objectif financier solide inclut un montant, une durée et une action mensuelle.'],
    },
    examples: {
      ar: ['مثال ضعيف: أريد ادخار المال.', 'مثال قوي: أريد ادخار 3000 دينار خلال 12 شهرًا، أي أحتاج إلى ادخار 250 دينارًا شهريًا.'],
      en: ['Weak: I want to save money.', 'Strong: I want to save 3000 KWD in 12 months, so I need 250 KWD monthly.'],
      fr: ['Faible : je veux économiser.', 'Fort : je veux économiser 3000 KWD en 12 mois, donc 250 KWD par mois.'],
    },
    keyTakeaway: {
      ar: 'الهدف دون رقم ومدة يصبح أمنية، وليس خطة.',
      en: 'A goal without a number and time frame is a wish, not a plan.',
      fr: 'Un objectif sans montant ni durée est un souhait, pas un plan.',
    },
    sfmTool: { ar: 'الأهداف المالية', en: 'Financial Goals', fr: 'Objectifs financiers' },
    sfmToolHref: '/goals',
  },
  {
    id: 'liquidity',
    slug: 'liquidity',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('liquidity'),
    number: 13,
    title: { ar: 'نظرية السيولة', en: 'Liquidity Theory', fr: 'Théorie de la liquidité' },
    category: 'debt-risk',
    short: {
      ar: 'احتفظ بجزء من المال يمكن الوصول له بسرعة.',
      en: 'Keep part of your money quickly accessible.',
      fr: 'Gardez une partie de l’argent rapidement accessible.',
    },
    details: {
      ar: ['من المهم أن يكون لديك جزء من المال سهل الوصول إليه بسرعة. لا ينبغي أن تكون كل أموالك في عقار أو استثمار يصعب بيعه.'],
      en: ['Some money should be easy to access. Not all wealth should be locked in real estate or hard-to-sell investments.'],
      fr: ['Une partie de l’argent doit être facilement accessible. Tout ne doit pas être bloqué dans l’immobilier ou des actifs difficiles à vendre.'],
    },
    keyTakeaway: {
      ar: 'السيولة تحميك وقت الحاجة.',
      en: 'Liquidity protects you when you need money quickly.',
      fr: 'La liquidité protège quand il faut de l’argent rapidement.',
    },
    sfmTool: { ar: 'ملخص السيولة', en: 'Liquidity Summary', fr: 'Résumé de liquidité' },
    sfmToolHref: '/dashboard',
  },
  {
    id: 'opportunity-cost',
    slug: 'opportunity-cost',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('opportunity-cost'),
    number: 14,
    title: { ar: 'نظرية تكلفة الفرصة البديلة', en: 'Opportunity Cost Theory', fr: 'Coût d’opportunité' },
    category: 'financial-planning',
    short: {
      ar: 'كل قرار مالي له ثمن مخفي.',
      en: 'Every financial choice has a hidden trade-off.',
      fr: 'Chaque décision financière a un compromis caché.',
    },
    details: {
      ar: ['كل قرار مالي له ثمن مخفي.'],
      en: ['Choosing one use of money means giving up another possible use.'],
      fr: ['Choisir une utilisation de l’argent signifie renoncer à une autre possibilité.'],
    },
    examples: {
      ar: ['إذا صرفت 200 دينار على شيء غير ضروري، فأنت خسرت فرصة استثمارها أو ادخارها.'],
      en: ['If you spend 200 KWD on something unnecessary, you lose the chance to save or invest it.'],
      fr: ['Si vous dépensez 200 KWD pour quelque chose de non essentiel, vous perdez l’occasion de l’épargner ou de l’investir.'],
    },
    keyTakeaway: {
      ar: 'قبل أن تشتري، اسأل نفسك: ما الخيار الآخر الذي يمكنني استخدام هذا المبلغ فيه؟',
      en: 'Before buying, ask what else this money could do.',
      fr: 'Avant d’acheter, demandez ce que cet argent pourrait faire d’autre.',
    },
    sfmTool: { ar: 'مركز القرارات', en: 'Decisions Center', fr: 'Centre de décisions' },
    sfmToolHref: '/decisions',
  },
  {
    id: 'financial-freedom',
    slug: 'financial-freedom',
    isEssential: ESSENTIAL_FINANCIAL_THEORY_IDS.has('financial-freedom'),
    number: 15,
    title: { ar: 'نظرية الحرية المالية', en: 'Financial Freedom Theory', fr: 'Théorie de la liberté financière' },
    category: 'financial-freedom',
    short: {
      ar: 'الحرية المالية تعني أن دخلك السلبي يغطي مصاريفك.',
      en: 'Financial freedom means passive income covers expenses.',
      fr: 'La liberté financière signifie que le revenu passif couvre les dépenses.',
    },
    details: {
      ar: ['الحرية المالية تعني إن دخلك السلبي يغطي مصاريفك.'],
      en: ['Financial freedom is reached when recurring or passive income can cover essential expenses without full dependence on a job.'],
      fr: ['La liberté financière arrive lorsque le revenu récurrent ou passif couvre les dépenses essentielles sans dépendance totale au travail.'],
    },
    examples: {
      ar: ['مصروفك الشهري 1000 دينار. إذا عندك استثمارات أو مشاريع تدخل لك 1000 دينار شهريًا بدون اعتماد كامل على الوظيفة، فأنت قريب من الحرية المالية.'],
      en: ['If monthly expenses are 1000 KWD and investments or projects generate 1000 KWD monthly without full job dependence, you are close to financial freedom.'],
      fr: ['Si vos dépenses mensuelles sont de 1000 KWD et que des investissements ou projets génèrent 1000 KWD par mois sans dépendre totalement du travail, vous êtes proche de la liberté financière.'],
    },
    keyTakeaway: {
      ar: 'الهدف ليس جمع المال فقط، بل بناء دخل مستمر.',
      en: 'The goal is not only to collect money; it is to build recurring income.',
      fr: 'L’objectif n’est pas seulement d’accumuler de l’argent, mais de créer un revenu durable.',
    },
    sfmTool: { ar: 'لوحة القيادة التنفيذية', en: 'Executive Dashboard', fr: 'Tableau de bord exécutif' },
    sfmToolHref: '/dashboard',
  },
];

export const FEATURED_FINANCIAL_THEORIES: FeaturedFinancialTheory[] = [
  {
    theoryId: 'personal-budgeting',
    why: {
      ar: 'تساعدك على رؤية الراتب كخطة، وليس كرصيد يصرف عشوائياً.',
      en: 'Turns income into a plan instead of a balance that disappears randomly.',
      fr: 'Transforme le revenu en plan plutôt qu’en solde qui disparaît au hasard.',
    },
  },
  {
    theoryId: 'pay-yourself-first',
    why: {
      ar: 'تجعل الادخار خطوة تلقائية قبل المصاريف.',
      en: 'Makes saving an automatic step before spending.',
      fr: 'Fait de l’épargne une étape automatique avant les dépenses.',
    },
  },
  {
    theoryId: 'emergency-fund',
    why: {
      ar: 'تحميك من كسر الخطة عند ظهور مصروف مفاجئ.',
      en: 'Protects the plan when unexpected expenses appear.',
      fr: 'Protège le plan lors d’une dépense imprévue.',
    },
  },
  {
    theoryId: 'smart-goals',
    why: {
      ar: 'تحوّل الهدف من أمنية إلى رقم ومدة وخطوة شهرية.',
      en: 'Turns a wish into an amount, deadline, and monthly action.',
      fr: 'Transforme un souhait en montant, délai et action mensuelle.',
    },
  },
  {
    theoryId: 'diversification',
    why: {
      ar: 'تقلل الاعتماد على أصل واحد وتوضح توزيع المحفظة.',
      en: 'Reduces dependence on one asset and clarifies portfolio mix.',
      fr: 'Réduit la dépendance à un seul actif et clarifie le portefeuille.',
    },
  },
  {
    theoryId: 'multiple-income-streams',
    why: {
      ar: 'تربط بين الدخل الشخصي، المشاريع، والاستثمار.',
      en: 'Connects personal income, projects, and investments.',
      fr: 'Relie revenus personnels, projets et investissements.',
    },
  },
  {
    theoryId: 'reduce-bad-debt',
    why: {
      ar: 'تساعدك تميّز بين دين يبني قيمة ودين يضغط الميزانية.',
      en: 'Helps separate value-building debt from budget pressure.',
      fr: 'Distingue la dette créatrice de valeur de la dette qui pèse sur le budget.',
    },
  },
  {
    theoryId: 'financial-freedom',
    why: {
      ar: 'تجمع كل الأدوات حول هدف طويل المدى: دخل مستمر يغطي المصاريف.',
      en: 'Connects the platform around a long-term goal: recurring income that covers expenses.',
      fr: 'Relie les outils autour d’un objectif long terme : un revenu durable couvrant les dépenses.',
    },
  },
];

export const FINANCIAL_THEORY_TOOLS: FinancialTheoryTool[] = [
  {
    id: 'salary-split',
    title: { ar: 'حاسبة تقسيم الراتب', en: 'Salary Split Calculator', fr: 'Calculateur de répartition du revenu' },
    description: {
      ar: 'قسّم دخلك حسب قاعدة 50 / 30 / 20 أو حسب نسبك الخاصة.',
      en: 'Split income using the 50 / 30 / 20 rule or your own percentages.',
      fr: 'Répartissez le revenu avec la règle 50 / 30 / 20 ou vos propres pourcentages.',
    },
    cta: { ar: 'فتح الحاسبة', en: 'Open Calculator', fr: 'Ouvrir le calculateur' },
  },
  {
    id: 'emergency-fund',
    title: { ar: 'حاسبة صندوق الطوارئ', en: 'Emergency Fund Calculator', fr: 'Calculateur de fonds d’urgence' },
    description: {
      ar: 'احسب المبلغ المناسب لتغطية مصاريفك من 3 إلى 6 أشهر.',
      en: 'Estimate the amount needed to cover 3 to 6 months of expenses.',
      fr: 'Estimez le montant pour couvrir 3 à 6 mois de dépenses.',
    },
    cta: { ar: 'احسب الآن', en: 'Calculate Now', fr: 'Calculer' },
  },
  {
    id: 'debt-plan',
    title: { ar: 'خطة سداد الديون', en: 'Debt Repayment Plan', fr: 'Plan de remboursement des dettes' },
    description: {
      ar: 'رتّب ديونك وحدد خطة سداد أوضح.',
      en: 'Organize debts and define a clearer repayment plan.',
      fr: 'Organisez les dettes et définissez un plan plus clair.',
    },
    cta: { ar: 'إنشاء خطة', en: 'Create Plan', fr: 'Créer un plan' },
  },
  {
    id: 'goal-plan',
    title: { ar: 'خطة الوصول للهدف', en: 'Goal Progress Plan', fr: 'Plan d’atteinte d’objectif' },
    description: {
      ar: 'حوّل هدفك المالي إلى مبلغ شهري واضح.',
      en: 'Turn a financial goal into a clear monthly amount.',
      fr: 'Transformez un objectif financier en montant mensuel clair.',
    },
    cta: { ar: 'فتح الأهداف', en: 'Open Goals', fr: 'Ouvrir les objectifs' },
    href: '/goals',
  },
  {
    id: 'financial-health',
    title: { ar: 'تحليل صحة وضعك المالي', en: 'Financial Health Analysis', fr: 'Analyse de santé financière' },
    description: {
      ar: 'اعرف هل وضعك المالي متوازن بناءً على دخلك ومصاريفك ومدخراتك.',
      en: 'Review balance using your real income, expenses, and savings data.',
      fr: 'Évaluez l’équilibre à partir de vos revenus, dépenses et épargne réels.',
    },
    cta: { ar: 'فتح لوحة القيادة', en: 'Open Dashboard', fr: 'Ouvrir le tableau' },
    href: '/dashboard',
  },
];

export const FINANCIAL_THEORY_EXAMPLES = [
  {
    title: {
      ar: 'تقسيم الراتب بدون عشوائية',
      en: 'Split salary without randomness',
      fr: 'Répartir le salaire sans hasard',
    },
    body: {
      ar: 'استخدم قاعدة 50 / 30 / 20 كنقطة بداية، ثم عدّل النسب حسب واقع مصاريفك.',
      en: 'Use the 50 / 30 / 20 rule as a starting point, then adapt it to your real expenses.',
      fr: 'Utilisez la règle 50 / 30 / 20 comme point de départ, puis adaptez-la à vos dépenses réelles.',
    },
  },
  {
    title: {
      ar: 'هدف مالي يتحول إلى خطة',
      en: 'A financial goal becomes a plan',
      fr: 'Un objectif financier devient un plan',
    },
    body: {
      ar: 'بدل “أريد الادخار”، اكتب المبلغ والمدة، ثم حوّلها إلى ادخار شهري واضح.',
      en: 'Instead of “I want to save,” define the amount and deadline, then convert it into a monthly action.',
      fr: 'Au lieu de “je veux économiser”, définissez le montant et le délai, puis une action mensuelle.',
    },
  },
  {
    title: {
      ar: 'قرار شراء له تكلفة فرصة',
      en: 'A purchase decision has opportunity cost',
      fr: 'Un achat a un coût d’opportunité',
    },
    body: {
      ar: 'قبل أي مصروف كبير، قارن بين الشراء الآن، التأجيل، أو استخدام المبلغ لهدف أهم.',
      en: 'Before a large purchase, compare buying now, delaying, or using the amount for a more important goal.',
      fr: 'Avant un gros achat, comparez acheter maintenant, attendre ou utiliser le montant pour un objectif plus important.',
    },
  },
] as const;

export function getFinancialTheoryText(value: LocalizedText, lang: FinancialTheoryLang) {
  return value[lang] ?? value.ar;
}
