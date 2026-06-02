export type EbookLocale = 'ar' | 'en' | 'fr';
export type EbookLanguage = 'ar' | 'en' | 'fr';
export type EbookCategory = 'personal-finance' | 'trading' | 'feasibility';
export type EbookCoverType = 'finance' | 'trading' | 'feasibility';

export type LocalizedText = Record<EbookLocale, string>;

export type Ebook = {
  id: string;
  slug: string;
  title: LocalizedText;
  originalTitle: string;
  language: EbookLanguage;
  category: EbookCategory;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  coverType: EbookCoverType;
  description: LocalizedText;
  topics: LocalizedText[];
  learningPoints: LocalizedText[];
  publishedLabel: LocalizedText;
};

export const EBOOK_CATEGORY_LABELS: Record<EbookCategory, LocalizedText> = {
  'personal-finance': {
    ar: 'إدارة الأموال الشخصية',
    en: 'Personal Finance',
    fr: 'Finances personnelles',
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

export const ebooks: Ebook[] = [
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
      ar: 'Feasibility Study: Practical Guide',
      en: 'Feasibility Study: Practical Guide',
      fr: 'Feasibility Study: Practical Guide',
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
      ar: 'L’Étude de Faisabilité : Guide Pratique',
      en: 'Feasibility Study: Practical Guide',
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

