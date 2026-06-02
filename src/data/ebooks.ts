export type EbookLocale = 'ar' | 'en' | 'fr';
export type EbookBaseLanguage = 'ar' | 'en' | 'fr';
export type EbookLanguage = EbookBaseLanguage | 'multilingual';
export type EbookCategory = 'personal-finance' | 'trading' | 'feasibility' | 'investment';
export type EbookCoverType = 'finance' | 'trading' | 'feasibility';

export type LocalizedText = Record<EbookLocale, string>;

export type Ebook = {
  id: string;
  slug: string;
  title: LocalizedText;
  originalTitle: string;
  language: EbookLanguage;
  languages?: EbookBaseLanguage[];
  category: EbookCategory;
  categories?: EbookCategory[];
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  pages?: number;
  coverType: EbookCoverType;
  description: LocalizedText;
  topics: LocalizedText[];
  searchTerms?: LocalizedText[];
  learningPoints: LocalizedText[];
  publishedLabel: LocalizedText;
};

export const EBOOK_CATEGORY_LABELS: Record<EbookCategory, LocalizedText> = {
  'personal-finance': {
    ar: 'إدارة الأموال الشخصية',
    en: 'Personal Finance',
    fr: 'Finances personnelles',
  },
  investment: {
    ar: 'الاستثمار',
    en: 'Investment',
    fr: 'Investissement',
  },
  trading: {
    ar: 'التداول والأسواق',
    en: 'Trading & Markets',
    fr: 'Trading et marchés',
  },
  feasibility: {
    ar: 'المشاريع ودراسة الجدوى',
    en: 'Business & Feasibility',
    fr: 'Projets et faisabilité',
  },
};

export const EBOOK_LANGUAGE_LABELS: Record<EbookLanguage, LocalizedText> = {
  ar: { ar: 'العربية', en: 'Arabic', fr: 'Arabe' },
  en: { ar: 'الإنجليزية', en: 'English', fr: 'Anglais' },
  fr: { ar: 'الفرنسية', en: 'French', fr: 'Français' },
  multilingual: { ar: 'متعدد اللغات', en: 'Multilingual', fr: 'Multilingue' },
};

const commonFinancialLearning: LocalizedText[] = [
  {
    ar: 'فهم المفاهيم الأساسية بلغة واضحة.',
    en: 'Understand core concepts in clear language.',
    fr: 'Comprendre les notions essentielles dans un langage clair.',
  },
  {
    ar: 'تطبيق الأفكار على قراراتك المالية اليومية.',
    en: 'Apply the ideas to daily financial decisions.',
    fr: 'Appliquer les idées aux décisions financières quotidiennes.',
  },
  {
    ar: 'تجنب الأخطاء الشائعة عند التخطيط المالي.',
    en: 'Avoid common mistakes when planning financially.',
    fr: 'Éviter les erreurs courantes dans la planification financière.',
  },
];

const candlestickLearning: LocalizedText[] = [
  {
    ar: 'تشريح الشمعة اليابانية وفهم معنى جسم الشمعة وظلالها.',
    en: 'Understand candlestick anatomy, including bodies and shadows.',
    fr: 'Comprendre l’anatomie des chandeliers, y compris les corps et les mèches.',
  },
  {
    ar: 'فهم نفسية المشترين والبائعين خلف حركة السعر.',
    en: 'Read the psychology of buyers and sellers behind price movement.',
    fr: 'Comprendre la psychologie des acheteurs et des vendeurs derrière le mouvement des prix.',
  },
  {
    ar: 'التمييز بين نماذج الانعكاس ونماذج الاستمرار.',
    en: 'Distinguish reversal patterns from continuation patterns.',
    fr: 'Distinguer les figures de retournement des figures de continuation.',
  },
  {
    ar: 'استخدام الشموع ضمن خطة تداول منضبطة.',
    en: 'Use candlesticks within a disciplined trading plan.',
    fr: 'Utiliser les chandeliers dans un plan de trading discipliné.',
  },
  {
    ar: 'تجنب الاعتماد على الشمعة وحدها دون سياق فني واضح.',
    en: 'Avoid relying on a single candle without clear technical context.',
    fr: 'Éviter de s’appuyer sur un seul chandelier sans contexte technique clair.',
  },
];

const savingsInvestmentLearning: LocalizedText[] = [
  {
    ar: 'بناء عادة الادخار بطريقة عملية ومستدامة.',
    en: 'Build a practical and sustainable savings habit.',
    fr: 'Construire une habitude d’épargne pratique et durable.',
  },
  {
    ar: 'فهم الفرق بين الادخار والاستثمار.',
    en: 'Understand the difference between saving and investing.',
    fr: 'Comprendre la différence entre épargne et investissement.',
  },
  {
    ar: 'تطبيق قاعدة 50/30/20 وصندوق الطوارئ في التخطيط المالي.',
    en: 'Apply the 50/30/20 rule and emergency funds to financial planning.',
    fr: 'Appliquer la règle 50/30/20 et le fonds d’urgence à la planification financière.',
  },
  {
    ar: 'فهم الفائدة المركبة وأثر التضخم على القوة الشرائية.',
    en: 'Understand compounding and the impact of inflation on purchasing power.',
    fr: 'Comprendre les intérêts composés et l’effet de l’inflation sur le pouvoir d’achat.',
  },
  {
    ar: 'بناء محفظة استثمارية متوازنة وفق مستوى المخاطر المناسب.',
    en: 'Build a balanced investment portfolio aligned with suitable risk levels.',
    fr: 'Construire un portefeuille équilibré selon un niveau de risque adapté.',
  },
];

export const ebooks: Ebook[] = [
  {
    id: 'candlestick-analysis-ar-en-fr',
    slug: 'candlestick-analysis',
    title: {
      ar: 'قراءة شموع الأسهم وتحليلها',
      en: 'Reading and Analyzing Stock Candlesticks',
      fr: 'Lire et analyser les chandeliers des actions',
    },
    originalTitle: 'قراءة شموع الأسهم وتحليلها',
    language: 'multilingual',
    languages: ['ar', 'en', 'fr'],
    category: 'trading',
    fileUrl: '/ebooks/candlestick-analysis-ar-en-fr.pdf',
    fileName: 'candlestick-analysis-ar-en-fr.pdf',
    fileSizeBytes: 131818,
    pages: 24,
    coverType: 'trading',
    description: {
      ar: 'كتاب تفصيلي يشرح بنية الشمعة، نفسية السوق، أشهر نماذج الشموع، وشروط استخدامها ضمن خطة تداول منضبطة.',
      en: 'A detailed guide explaining candle anatomy, market psychology, common candlestick patterns, and how to use them within a disciplined trading plan.',
      fr: 'Un guide détaillé expliquant l’anatomie des chandeliers, la psychologie du marché, les figures courantes et leur utilisation dans un plan de trading discipliné.',
    },
    topics: [
      { ar: 'الشموع اليابانية', en: 'Candlesticks', fr: 'Chandeliers japonais' },
      { ar: 'قراءة الشارت', en: 'Chart reading', fr: 'Lecture graphique' },
      { ar: 'نماذج الانعكاس', en: 'Reversal patterns', fr: 'Figures de retournement' },
      { ar: 'نماذج الاستمرار', en: 'Continuation patterns', fr: 'Figures de continuation' },
      { ar: 'إدارة المخاطر', en: 'Risk management', fr: 'Gestion du risque' },
    ],
    searchTerms: [
      { ar: 'شموع', en: 'candlesticks', fr: 'chandeliers' },
      { ar: 'التداول', en: 'trading', fr: 'trading' },
      { ar: 'قراءة الشارت', en: 'chart reading', fr: 'lecture graphique' },
      { ar: 'التحليل الفني', en: 'technical analysis', fr: 'analyse technique' },
    ],
    learningPoints: candlestickLearning,
    publishedLabel: { ar: 'إضافة حديثة', en: 'Recently added', fr: 'Ajout récent' },
  },
  {
    id: 'savings-investment-ar',
    slug: 'savings-investment-ar',
    title: {
      ar: 'المدخرات والاستثمار',
      en: 'Savings and Investment',
      fr: 'Épargne et investissement',
    },
    originalTitle: 'المدخرات والاستثمار',
    language: 'ar',
    category: 'personal-finance',
    categories: ['personal-finance', 'investment'],
    fileUrl: '/ebooks/savings-investment-ar.pdf',
    fileName: 'savings-investment-ar.pdf',
    fileSizeBytes: 721190,
    pages: 49,
    coverType: 'finance',
    description: {
      ar: 'دليل شامل من أول مبلغ تدخره إلى بناء محفظة استثمارية متوازنة، مع شرح الادخار، صندوق الطوارئ، الفائدة المركبة، التضخم، وأساسيات الاستثمار.',
      en: 'A complete Arabic guide to saving, emergency funds, compounding, inflation, and building a balanced investment portfolio.',
      fr: 'Un guide arabe complet sur l’épargne, le fonds d’urgence, les intérêts composés, l’inflation et la construction d’un portefeuille équilibré.',
    },
    topics: [
      { ar: 'الادخار', en: 'Savings', fr: 'Épargne' },
      { ar: 'الاستثمار', en: 'Investment', fr: 'Investissement' },
      { ar: 'صندوق الطوارئ', en: 'Emergency fund', fr: 'Fonds d’urgence' },
      { ar: 'قاعدة 50/30/20', en: '50/30/20 rule', fr: 'Règle 50/30/20' },
      { ar: 'الفائدة المركبة', en: 'Compound interest', fr: 'Intérêts composés' },
      { ar: 'التضخم', en: 'Inflation', fr: 'Inflation' },
    ],
    searchTerms: [
      { ar: 'المدخرات', en: 'savings', fr: 'épargne' },
      { ar: 'الاستثمار', en: 'investment', fr: 'investissement' },
      { ar: 'صندوق الطوارئ', en: 'emergency fund', fr: 'fonds d’urgence' },
      { ar: 'الفائدة المركبة', en: 'compounding', fr: 'intérêts composés' },
    ],
    learningPoints: savingsInvestmentLearning,
    publishedLabel: { ar: 'إضافة حديثة', en: 'Recently added', fr: 'Ajout récent' },
  },
  {
    id: 'savings-investment-en',
    slug: 'savings-investment-en',
    title: {
      ar: 'المدخرات والاستثمار - النسخة الإنجليزية',
      en: 'Savings & Investment',
      fr: 'Épargne et investissement - Anglais',
    },
    originalTitle: 'Savings & Investment',
    language: 'en',
    category: 'personal-finance',
    categories: ['personal-finance', 'investment'],
    fileUrl: '/ebooks/savings-investment-en.pdf',
    fileName: 'savings-investment-en.pdf',
    fileSizeBytes: 709132,
    pages: 49,
    coverType: 'finance',
    description: {
      ar: 'النسخة الإنجليزية من دليل المدخرات والاستثمار، وتشرح بناء عادة الادخار، حماية المال، وتنمية المحفظة الاستثمارية.',
      en: 'A complete guide from the first unit you save to a balanced investment portfolio, covering concepts, examples, charts, and practical steps.',
      fr: 'La version anglaise du guide sur l’épargne et l’investissement.',
    },
    topics: [
      { ar: 'الادخار', en: 'Savings', fr: 'Épargne' },
      { ar: 'الاستثمار', en: 'Investment', fr: 'Investissement' },
      { ar: 'التخطيط المالي', en: 'Financial planning', fr: 'Planification financière' },
    ],
    searchTerms: [
      { ar: 'المدخرات', en: 'savings', fr: 'épargne' },
      { ar: 'الاستثمار', en: 'investment', fr: 'investissement' },
      { ar: 'صندوق الطوارئ', en: 'emergency fund', fr: 'fonds d’urgence' },
      { ar: 'الفائدة المركبة', en: 'compounding', fr: 'intérêts composés' },
    ],
    learningPoints: savingsInvestmentLearning,
    publishedLabel: { ar: 'إضافة حديثة', en: 'Recently added', fr: 'Ajout récent' },
  },
  {
    id: 'savings-investment-fr',
    slug: 'savings-investment-fr',
    title: {
      ar: 'المدخرات والاستثمار - النسخة الفرنسية',
      en: 'Savings & Investment - French',
      fr: 'L’Épargne et l’Investissement',
    },
    originalTitle: 'L’Épargne et l’Investissement',
    language: 'fr',
    category: 'personal-finance',
    categories: ['personal-finance', 'investment'],
    fileUrl: '/ebooks/savings-investment-fr.pdf',
    fileName: 'savings-investment-fr.pdf',
    fileSizeBytes: 736752,
    pages: 49,
    coverType: 'finance',
    description: {
      ar: 'النسخة الفرنسية من دليل المدخرات والاستثمار، وتشرح الادخار، الاستثمار، صندوق الطوارئ، والتخطيط المالي.',
      en: 'The French version of the savings and investment guide.',
      fr: 'Un guide complet, du premier euro épargné à un portefeuille équilibré, avec concepts, exemples, graphiques et étapes pratiques.',
    },
    topics: [
      { ar: 'الادخار', en: 'Savings', fr: 'Épargne' },
      { ar: 'الاستثمار', en: 'Investment', fr: 'Investissement' },
      { ar: 'التخطيط المالي', en: 'Financial planning', fr: 'Planification financière' },
    ],
    searchTerms: [
      { ar: 'المدخرات', en: 'savings', fr: 'épargne' },
      { ar: 'الاستثمار', en: 'investment', fr: 'investissement' },
      { ar: 'صندوق الطوارئ', en: 'emergency fund', fr: 'fonds d’urgence' },
      { ar: 'الفائدة المركبة', en: 'compounding', fr: 'intérêts composés' },
    ],
    learningPoints: savingsInvestmentLearning,
    publishedLabel: { ar: 'إضافة حديثة', en: 'Recently added', fr: 'Ajout récent' },
  },
  {
    id: 'financial-guide-ar',
    slug: 'financial-guide',
    title: {
      ar: 'الدليل المالي الشامل',
      en: 'Comprehensive Financial Guide',
      fr: 'Guide financier complet',
    },
    originalTitle: 'الدليل المالي الشامل',
    language: 'ar',
    category: 'personal-finance',
    categories: ['personal-finance', 'investment'],
    fileUrl: '/ebooks/financial-guide-ar.pdf',
    fileName: 'financial-guide-ar.pdf',
    fileSizeBytes: 1334715,
    coverType: 'finance',
    description: {
      ar: 'دليل عملي شامل لفهم المال، وإدارة المصروفات، والادخار، والاستثمار، وبناء نظام مالي شخصي واضح.',
      en: 'A practical guide to understanding money, managing expenses, saving, investing, and building a clear personal finance system.',
      fr: 'Un guide pratique pour comprendre l’argent, gérer les dépenses, épargner, investir et bâtir un système financier personnel clair.',
    },
    topics: [
      { ar: 'النظريات المالية', en: 'Financial theories', fr: 'Théories financières' },
      { ar: 'إدارة الأموال الشخصية', en: 'Personal finance', fr: 'Finances personnelles' },
      { ar: 'قاعدة 50/30/20', en: '50/30/20 rule', fr: 'Règle 50/30/20' },
      { ar: 'صندوق الطوارئ', en: 'Emergency fund', fr: 'Fonds d’urgence' },
      { ar: 'إدارة الديون', en: 'Debt management', fr: 'Gestion des dettes' },
      { ar: 'الادخار والاستثمار', en: 'Saving and investing', fr: 'Épargne et investissement' },
    ],
    learningPoints: commonFinancialLearning,
    publishedLabel: { ar: 'إضافة حديثة', en: 'Recently added', fr: 'Ajout récent' },
  },
  {
    id: 'trading-basics-ar',
    slug: 'trading-basics',
    title: {
      ar: 'أساسيات التداول',
      en: 'Trading Basics',
      fr: 'Bases du trading',
    },
    originalTitle: 'أساسيات التداول',
    language: 'ar',
    category: 'trading',
    fileUrl: '/ebooks/trading-basics-ar.pdf',
    fileName: 'trading-basics-ar.pdf',
    fileSizeBytes: 572628,
    coverType: 'trading',
    description: {
      ar: 'دليل للمبتدئين لفهم التداول، وأنواعه، ومصطلحاته، وقراءة الرسوم البيانية، وإدارة المخاطر.',
      en: 'A beginner guide to trading, market types, terminology, chart reading, and risk management.',
      fr: 'Un guide pour débutants sur le trading, ses types, sa terminologie, la lecture des graphiques et la gestion des risques.',
    },
    topics: [
      { ar: 'التداول', en: 'Trading', fr: 'Trading' },
      { ar: 'قراءة الرسم البياني', en: 'Chart reading', fr: 'Lecture des graphiques' },
      { ar: 'الشموع اليابانية', en: 'Candlesticks', fr: 'Chandeliers japonais' },
      { ar: 'الدعم والمقاومة', en: 'Support and resistance', fr: 'Support et résistance' },
      { ar: 'إدارة المخاطر', en: 'Risk management', fr: 'Gestion des risques' },
      { ar: 'وقف الخسارة', en: 'Stop loss', fr: 'Stop loss' },
    ],
    learningPoints: [
      {
        ar: 'فهم المصطلحات الأساسية قبل تنفيذ أي قرار تداول.',
        en: 'Understand essential terms before making any trading decision.',
        fr: 'Comprendre les termes essentiels avant toute décision de trading.',
      },
      {
        ar: 'قراءة الرسوم البيانية بطريقة تعليمية مبسطة.',
        en: 'Read charts through a simplified educational lens.',
        fr: 'Lire les graphiques avec une approche pédagogique simple.',
      },
      {
        ar: 'التعامل مع المخاطر من خلال قواعد واضحة.',
        en: 'Handle risk through clear rules.',
        fr: 'Gérer le risque avec des règles claires.',
      },
    ],
    publishedLabel: { ar: 'إضافة حديثة', en: 'Recently added', fr: 'Ajout récent' },
  },
  {
    id: 'feasibility-study-ar',
    slug: 'feasibility-study-ar',
    title: {
      ar: 'دراسة الجدوى: دليل عملي',
      en: 'Feasibility Study: Practical Guide',
      fr: 'Étude de faisabilité : guide pratique',
    },
    originalTitle: 'دراسة الجدوى: دليل عملي',
    language: 'ar',
    category: 'feasibility',
    fileUrl: '/ebooks/feasibility-study-ar.pdf',
    fileName: 'feasibility-study-ar.pdf',
    fileSizeBytes: 343493,
    coverType: 'feasibility',
    description: {
      ar: 'دليل عملي يشرح مفهوم دراسة الجدوى، وأنواعها، ومراحل إعدادها، والأدوات المالية، وكيفية اتخاذ قرار التنفيذ.',
      en: 'A practical guide explaining feasibility studies, their types, preparation stages, financial tools, and implementation decisions.',
      fr: 'Un guide pratique expliquant l’étude de faisabilité, ses types, ses étapes, ses outils financiers et la décision de mise en œuvre.',
    },
    topics: [
      { ar: 'دراسة الجدوى', en: 'Feasibility study', fr: 'Étude de faisabilité' },
      { ar: 'تحليل السوق', en: 'Market analysis', fr: 'Analyse du marché' },
      { ar: 'الجدوى المالية', en: 'Financial feasibility', fr: 'Faisabilité financière' },
      { ar: 'الجدوى الفنية', en: 'Technical feasibility', fr: 'Faisabilité technique' },
      { ar: 'المخاطر', en: 'Risks', fr: 'Risques' },
      { ar: 'قرار التنفيذ', en: 'Go / No-Go decision', fr: 'Décision Go / No-Go' },
    ],
    learningPoints: [
      {
        ar: 'فهم ما تعنيه دراسة الجدوى ومتى تحتاج إليها.',
        en: 'Understand what a feasibility study means and when it is needed.',
        fr: 'Comprendre ce qu’est une étude de faisabilité et quand elle est nécessaire.',
      },
      {
        ar: 'تنظيم دراسة السوق والجوانب المالية والفنية.',
        en: 'Organize market, financial, and technical analysis.',
        fr: 'Organiser l’analyse du marché, financière et technique.',
      },
      {
        ar: 'اتخاذ قرار تنفيذ أكثر وضوحًا بناءً على البيانات المتاحة.',
        en: 'Make a clearer implementation decision based on available data.',
        fr: 'Prendre une décision de mise en œuvre plus claire selon les données disponibles.',
      },
    ],
    publishedLabel: { ar: 'إضافة حديثة', en: 'Recently added', fr: 'Ajout récent' },
  },
  {
    id: 'feasibility-study-en',
    slug: 'feasibility-study-en',
    title: {
      ar: 'دراسة الجدوى: دليل عملي - النسخة الإنجليزية',
      en: 'Feasibility Study: Practical Guide',
      fr: 'Étude de faisabilité : guide pratique - Anglais',
    },
    originalTitle: 'Feasibility Study: Practical Guide',
    language: 'en',
    category: 'feasibility',
    fileUrl: '/ebooks/feasibility-study-en.pdf',
    fileName: 'feasibility-study-en.pdf',
    fileSizeBytes: 314194,
    coverType: 'feasibility',
    description: {
      ar: 'دليل عملي باللغة الإنجليزية يشرح ماهية دراسة الجدوى وأنواعها ومراحلها وأدواتها المالية وطريقة إعدادها خطوة بخطوة.',
      en: 'A practical guide explaining what a feasibility study is, its types, stages, financial tools, and how to prepare one step by step.',
      fr: 'Un guide pratique en anglais expliquant l’étude de faisabilité, ses types, ses étapes, ses outils financiers et sa préparation étape par étape.',
    },
    topics: [
      { ar: 'دراسة الجدوى', en: 'Feasibility study', fr: 'Étude de faisabilité' },
      { ar: 'جدوى السوق', en: 'Market feasibility', fr: 'Faisabilité du marché' },
      { ar: 'الجدوى المالية', en: 'Financial feasibility', fr: 'Faisabilité financière' },
      { ar: 'تقييم المخاطر', en: 'Risk assessment', fr: 'Évaluation des risques' },
      { ar: 'قرار التنفيذ', en: 'Go / No-Go decision', fr: 'Décision Go / No-Go' },
    ],
    learningPoints: [
      {
        ar: 'متابعة خطوات إعداد دراسة الجدوى من البداية إلى التقرير.',
        en: 'Follow feasibility preparation from initial idea to report.',
        fr: 'Suivre la préparation d’une étude de l’idée initiale au rapport.',
      },
      {
        ar: 'فهم أدوات الجدوى المالية وتقييم المخاطر.',
        en: 'Understand financial feasibility tools and risk assessment.',
        fr: 'Comprendre les outils de faisabilité financière et l’évaluation des risques.',
      },
      {
        ar: 'تنظيم قرار التنفيذ أو عدم التنفيذ بصورة عملية.',
        en: 'Structure the go or no-go decision practically.',
        fr: 'Structurer concrètement la décision Go / No-Go.',
      },
    ],
    publishedLabel: { ar: 'إضافة حديثة', en: 'Recently added', fr: 'Ajout récent' },
  },
  {
    id: 'feasibility-study-fr',
    slug: 'feasibility-study-fr',
    title: {
      ar: 'دراسة الجدوى: دليل عملي - النسخة الفرنسية',
      en: 'Feasibility Study: Practical Guide - French',
      fr: 'L’Étude de Faisabilité : Guide Pratique',
    },
    originalTitle: 'L’Étude de Faisabilité : Guide Pratique',
    language: 'fr',
    category: 'feasibility',
    fileUrl: '/ebooks/feasibility-study-fr.pdf',
    fileName: 'feasibility-study-fr.pdf',
    fileSizeBytes: 320628,
    coverType: 'feasibility',
    description: {
      ar: 'دليل عملي باللغة الفرنسية يشرح دراسة الجدوى وأنواعها ومراحلها وأدواتها المالية وإعداد تقريرها.',
      en: 'A French practical guide explaining feasibility studies, their types, stages, financial tools, and report preparation.',
      fr: 'Un guide pratique expliquant l’étude de faisabilité, ses types, ses étapes, ses outils financiers et la préparation d’un rapport.',
    },
    topics: [
      { ar: 'دراسة الجدوى', en: 'Feasibility study', fr: 'Étude de faisabilité' },
      { ar: 'تحليل السوق', en: 'Market analysis', fr: 'Analyse du marché' },
      { ar: 'الجدوى المالية', en: 'Financial feasibility', fr: 'Faisabilité financière' },
      { ar: 'تقييم المخاطر', en: 'Risk assessment', fr: 'Évaluation des risques' },
      { ar: 'قرار التنفيذ', en: 'Go / No-Go decision', fr: 'Décision Go / No-Go' },
    ],
    learningPoints: [
      {
        ar: 'فهم عناصر دراسة الجدوى بلغة فرنسية عملية.',
        en: 'Understand feasibility study elements in practical French.',
        fr: 'Comprendre les éléments d’une étude de faisabilité en français pratique.',
      },
      {
        ar: 'تنظيم تحليل السوق والمال والمخاطر.',
        en: 'Organize market, financial, and risk analysis.',
        fr: 'Organiser l’analyse du marché, financière et des risques.',
      },
      {
        ar: 'إعداد تقرير يساعد على قرار التنفيذ.',
        en: 'Prepare a report that supports the implementation decision.',
        fr: 'Préparer un rapport qui soutient la décision de mise en œuvre.',
      },
    ],
    publishedLabel: { ar: 'إضافة حديثة', en: 'Recently added', fr: 'Ajout récent' },
  },
];

export function getEbookBySlug(slug: string) {
  return ebooks.find(book => book.slug === slug);
}

export function ebookText(text: LocalizedText, locale: EbookLocale) {
  return text[locale] || text.ar;
}

export function formatEbookSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 1 ? 1 : 2)} MB`;
}
