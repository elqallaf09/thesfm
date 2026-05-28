'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Gauge,
  GraduationCap,
  Landmark,
  Layers3,
  Lightbulb,
  PiggyBank,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  WalletCards,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { CurrencySelect } from '@/components/CurrencySelect';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { CardsGrid, StatGrid } from '@/components/layout/LayoutPrimitives';
import { PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { EmptyState } from '@/components/layout/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/lib/useCurrency';
import { formatMoney } from '@/lib/formatMoney';
import {
  FEATURED_FINANCIAL_THEORIES,
  FINANCIAL_THEORIES,
  FINANCIAL_THEORY_CATEGORIES,
  FINANCIAL_THEORY_TOOLS,
  getFinancialTheoryText,
  type FinancialTheory,
  type FinancialTheoryCategoryId,
  type FinancialTheoryLang,
  type LocalizedText,
} from '@/lib/financial-theories';

const THEORY_ICONS = [
  WalletCards,
  PiggyBank,
  Sparkles,
  Layers3,
  ShieldAlert,
  Landmark,
  Brain,
  Gauge,
  Target,
  Calculator,
];

const UI_COPY: Record<FinancialTheoryLang, Record<string, string>> = {
  ar: {
    title: 'النظريات المالية',
    subtitle: 'تعلّم أهم المفاهيم المالية بطريقة واضحة، ثم طبّقها على دخلك، مصروفاتك، ادخارك، استثماراتك، وقراراتك داخل THE SFM.',
    badge: 'مكتبة مالية ذكية',
    startNow: 'ابدأ الآن',
    exploreTools: 'استكشف الأدوات الذكية',
    showBest: 'عرض أفضل النظريات',
    searchPlaceholder: 'ابحث عن نظرية مالية...',
    searchLabel: 'بحث في النظريات المالية',
    categories: 'التصنيفات',
    theoryLibrary: 'مكتبة النظريات المالية',
    theoryLibrarySubtitle: 'اختر تصنيفاً أو ابحث عن مفهوم، ثم افتح النظرية التي تريد فهمها بدون إطالة الصفحة.',
    whyTitle: 'ليش تحتاج تفهم النظريات المالية؟',
    whyBody: 'النظريات المالية تساعدك على اتخاذ قرارات أفضل، فهم مخاطر الديون والاستثمار، تنظيم الدخل والمصروفات، وبناء خطة مالية أوضح.',
    whyPoint1: 'تنظيم دخلك ومصروفاتك',
    whyPoint2: 'تقليل القرارات العشوائية',
    whyPoint3: 'ربط المعرفة بالأدوات داخل THE SFM',
    readTheory: 'عرض النظرية',
    hideTheory: 'إخفاء النظرية',
    keyTakeaway: 'الخلاصة',
    educationalExample: 'مثال تعليمي',
    examples: 'أمثلة',
    details: 'الشرح',
    relatedSfmTool: 'الأداة المرتبطة في THE SFM',
    applyInSfm: 'كيف تطبقها داخل THE SFM',
    openTool: 'فتح الأداة',
    useNow: 'استخدم الآن',
    available: 'متاح',
    comingSoon: 'قريباً',
    bestTitle: 'أفضل النظريات داخل THE SFM',
    bestSubtitle: 'هذه النظريات هي الأقرب لأدوات المنصة وتساعدك على تحويل المعرفة إلى خطوات عملية.',
    applyInsideSfm: 'تطبيق داخل SFM',
    practicalTitle: 'أمثلة عملية',
    practicalSubtitle: 'أمثلة تعليمية فقط لفهم الفكرة. لا تعرض بيانات مستخدم ولا نتائج من حسابك.',
    scenario: 'الموقف',
    lesson: 'الدرس',
    relatedTheory: 'النظرية المرتبطة',
    smartToolsTitle: 'أدوات وحاسبات ذكية',
    smartToolsSubtitle: 'أدوات عملية مرتبطة بالنظريات المالية لمساعدتك على اتخاذ قرارات أفضل.',
    status: 'الحالة',
    noResults: 'لا توجد نظريات مطابقة.',
    noResultsDescription: 'جرّب بحثاً آخر أو اختر تصنيفاً مختلفاً.',
    ctaTitle: 'ابدأ بتطبيق النظريات على وضعك المالي',
    ctaSubtitle: 'حوّل المعرفة إلى خطوات عملية داخل THE SFM من خلال الدخل، المصروفات، الأهداف، والاستثمارات.',
    openDashboard: 'فتح لوحة القيادة',
    openGoals: 'فتح الأهداف المالية',
    openTools: 'فتح أدوات وحاسبات',
    educationNote: 'هذه صفحة تعليمية وليست استشارة مالية شخصية.',
    calculatorTitle: 'الحاسبة الذكية',
    calculatorIntro: 'أدخل أرقامك الحقيقية فقط. لا يتم حفظ أي نتيجة تلقائياً.',
    close: 'إغلاق',
    reset: 'إعادة ضبط',
    result: 'النتيجة',
    currency: 'العملة',
    monthlyIncome: 'الدخل الشهري',
    monthlyExpenses: 'المصروف الشهري',
    currentSavings: 'المدخرات الحالية',
    needs: 'الاحتياجات',
    wants: 'الرغبات',
    savingsInvestingDebt: 'الادخار والاستثمار وسداد الديون',
    percentagesTotal: 'مجموع النسب',
    percentagesMustTotal: 'النسب يجب أن يكون مجموعها 100%.',
    incomeMustBePositive: 'الدخل الشهري يجب أن يكون أكبر من صفر.',
    amountMustBePositive: 'أدخل مبلغاً أكبر من صفر.',
    minimumEmergencyFund: 'الحد الأدنى لصندوق الطوارئ',
    recommendedAmount: 'المبلغ الموصى به',
    remainingAmount: 'المتبقي للوصول للهدف',
    emergencyComplete: 'صندوق الطوارئ مكتمل أو أعلى من المطلوب.',
    monthsCount: 'عدد الأشهر',
    customMonths: 'عدد أشهر مخصص',
    threeMonths: '3 أشهر',
    sixMonths: '6 أشهر',
    twelveMonths: '12 شهر',
    custom: 'مخصص',
    debtAmount: 'إجمالي الدين',
    monthlyPayment: 'الدفعة الشهرية',
    annualInterestRate: 'معدل الفائدة السنوي',
    estimatedMonths: 'عدد الأشهر التقريبي',
    totalPaid: 'إجمالي المدفوع',
    estimatedInterest: 'الفائدة التقديرية',
    approximateEndDate: 'تاريخ الانتهاء التقريبي',
    debtPaymentTooLow: 'الدفعة الشهرية غير كافية لتقليل الدين مع معدل الفائدة المدخل.',
    simplifiedEstimateNote: 'هذا تقدير مبسط ولا يشمل جميع الرسوم أو الشروط البنكية.',
  },
  en: {
    title: 'Financial Theories',
    subtitle: 'Learn the key financial concepts clearly, then apply them to your income, expenses, savings, investments, and decisions inside THE SFM.',
    badge: 'Smart Financial Library',
    startNow: 'Start Now',
    exploreTools: 'Explore Smart Tools',
    showBest: 'View Best Theories',
    searchPlaceholder: 'Search financial theories...',
    searchLabel: 'Search financial theories',
    categories: 'Categories',
    theoryLibrary: 'Financial Theory Library',
    theoryLibrarySubtitle: 'Choose a category or search for a concept, then open only the theory you want to study.',
    whyTitle: 'Why should you understand financial theories?',
    whyBody: 'Financial theories help you make better decisions, understand debt and investment risk, organize income and expenses, and build a clearer financial plan.',
    whyPoint1: 'Organize income and expenses',
    whyPoint2: 'Reduce random decisions',
    whyPoint3: 'Connect learning to THE SFM tools',
    readTheory: 'Read Theory',
    hideTheory: 'Hide Theory',
    keyTakeaway: 'Key Takeaway',
    educationalExample: 'Educational Example',
    examples: 'Examples',
    details: 'Explanation',
    relatedSfmTool: 'Related SFM Tool',
    applyInSfm: 'How to apply it in THE SFM',
    openTool: 'Open Tool',
    useNow: 'Use Now',
    available: 'Available',
    comingSoon: 'Coming Soon',
    bestTitle: 'Best Theories inside THE SFM',
    bestSubtitle: 'These theories map most closely to THE SFM tools and help turn learning into practical steps.',
    applyInsideSfm: 'Apply inside SFM',
    practicalTitle: 'Practical Examples',
    practicalSubtitle: 'Educational examples only. They do not show user data or results from your account.',
    scenario: 'Scenario',
    lesson: 'Lesson',
    relatedTheory: 'Related Theory',
    smartToolsTitle: 'Smart Tools and Calculators',
    smartToolsSubtitle: 'Practical tools connected to financial theories to help you make clearer decisions.',
    status: 'Status',
    noResults: 'No matching theories.',
    noResultsDescription: 'Try another search or choose a different category.',
    ctaTitle: 'Start applying theories to your financial life',
    ctaSubtitle: 'Turn learning into practical steps inside THE SFM through income, expenses, goals, and investments.',
    openDashboard: 'Open Dashboard',
    openGoals: 'Open Financial Goals',
    openTools: 'Open Tools',
    educationNote: 'This page is educational and is not personal financial advice.',
    calculatorTitle: 'Smart calculator',
    calculatorIntro: 'Enter your real numbers only. Results are not saved automatically.',
    close: 'Close',
    reset: 'Reset',
    result: 'Result',
    currency: 'Currency',
    monthlyIncome: 'Monthly Income',
    monthlyExpenses: 'Monthly Expenses',
    currentSavings: 'Current Savings',
    needs: 'Needs',
    wants: 'Wants',
    savingsInvestingDebt: 'Saving, investing, and debt repayment',
    percentagesTotal: 'Percentage total',
    percentagesMustTotal: 'Percentages must total 100%.',
    incomeMustBePositive: 'Monthly income must be greater than zero.',
    amountMustBePositive: 'Enter an amount greater than zero.',
    minimumEmergencyFund: 'Minimum emergency fund',
    recommendedAmount: 'Recommended amount',
    remainingAmount: 'Remaining amount',
    emergencyComplete: 'Your emergency fund is complete or above the target.',
    monthsCount: 'Number of months',
    customMonths: 'Custom number of months',
    threeMonths: '3 months',
    sixMonths: '6 months',
    twelveMonths: '12 months',
    custom: 'Custom',
    debtAmount: 'Debt Amount',
    monthlyPayment: 'Monthly Payment',
    annualInterestRate: 'Annual Interest Rate',
    estimatedMonths: 'Estimated months',
    totalPaid: 'Total paid',
    estimatedInterest: 'Estimated interest',
    approximateEndDate: 'Approximate end date',
    debtPaymentTooLow: 'The monthly payment is not enough to reduce the debt with this interest rate.',
    simplifiedEstimateNote: 'This is a simple estimate and does not include all fees or bank terms.',
  },
  fr: {
    title: 'Théories financières',
    subtitle: 'Apprenez clairement les concepts financiers clés, puis appliquez-les à vos revenus, dépenses, épargne, investissements et décisions dans THE SFM.',
    badge: 'Bibliothèque financière intelligente',
    startNow: 'Commencer',
    exploreTools: 'Explorer les outils',
    showBest: 'Voir les meilleures théories',
    searchPlaceholder: 'Rechercher une théorie financière...',
    searchLabel: 'Rechercher des théories financières',
    categories: 'Catégories',
    theoryLibrary: 'Bibliothèque des théories financières',
    theoryLibrarySubtitle: 'Choisissez une catégorie ou recherchez un concept, puis ouvrez seulement la théorie à étudier.',
    whyTitle: 'Pourquoi comprendre les théories financières ?',
    whyBody: 'Les théories financières aident à prendre de meilleures décisions, comprendre les risques, organiser revenus et dépenses, et bâtir un plan plus clair.',
    whyPoint1: 'Organiser revenus et dépenses',
    whyPoint2: 'Réduire les décisions aléatoires',
    whyPoint3: 'Relier l’apprentissage aux outils THE SFM',
    readTheory: 'Lire la théorie',
    hideTheory: 'Masquer',
    keyTakeaway: 'À retenir',
    educationalExample: 'Exemple éducatif',
    examples: 'Exemples',
    details: 'Explication',
    relatedSfmTool: 'Outil SFM lié',
    applyInSfm: 'Comment l’appliquer dans THE SFM',
    openTool: 'Ouvrir l’outil',
    useNow: 'Utiliser maintenant',
    available: 'Disponible',
    comingSoon: 'Bientôt',
    bestTitle: 'Meilleures théories dans THE SFM',
    bestSubtitle: 'Ces théories sont les plus proches des outils THE SFM et transforment l’apprentissage en actions.',
    applyInsideSfm: 'Appliquer dans SFM',
    practicalTitle: 'Exemples pratiques',
    practicalSubtitle: 'Exemples éducatifs uniquement. Ils ne montrent pas de données utilisateur ni de résultats de votre compte.',
    scenario: 'Situation',
    lesson: 'Leçon',
    relatedTheory: 'Théorie liée',
    smartToolsTitle: 'Outils et calculateurs intelligents',
    smartToolsSubtitle: 'Des outils pratiques liés aux théories financières pour prendre des décisions plus claires.',
    status: 'Statut',
    noResults: 'Aucune théorie correspondante.',
    noResultsDescription: 'Essayez une autre recherche ou choisissez une catégorie différente.',
    ctaTitle: 'Commencez à appliquer les théories à votre situation financière',
    ctaSubtitle: 'Transformez l’apprentissage en étapes pratiques dans THE SFM avec revenus, dépenses, objectifs et investissements.',
    openDashboard: 'Ouvrir le tableau',
    openGoals: 'Ouvrir les objectifs',
    openTools: 'Ouvrir les outils',
    educationNote: 'Cette page est éducative et ne constitue pas un conseil financier personnel.',
    calculatorTitle: 'Calculateur intelligent',
    calculatorIntro: 'Saisissez uniquement vos vrais chiffres. Les résultats ne sont pas enregistrés automatiquement.',
    close: 'Fermer',
    reset: 'Réinitialiser',
    result: 'Résultat',
    currency: 'Devise',
    monthlyIncome: 'Revenu mensuel',
    monthlyExpenses: 'Dépenses mensuelles',
    currentSavings: 'Épargne actuelle',
    needs: 'Besoins',
    wants: 'Envies',
    savingsInvestingDebt: 'Épargne, investissement et remboursement de dette',
    percentagesTotal: 'Total des pourcentages',
    percentagesMustTotal: 'Les pourcentages doivent totaliser 100 %.',
    incomeMustBePositive: 'Le revenu mensuel doit être supérieur à zéro.',
    amountMustBePositive: 'Saisissez un montant supérieur à zéro.',
    minimumEmergencyFund: 'Fonds d’urgence minimum',
    recommendedAmount: 'Montant recommandé',
    remainingAmount: 'Montant restant',
    emergencyComplete: 'Votre fonds d’urgence est complet ou supérieur à l’objectif.',
    monthsCount: 'Nombre de mois',
    customMonths: 'Nombre de mois personnalisé',
    threeMonths: '3 mois',
    sixMonths: '6 mois',
    twelveMonths: '12 mois',
    custom: 'Personnalisé',
    debtAmount: 'Montant de la dette',
    monthlyPayment: 'Paiement mensuel',
    annualInterestRate: 'Taux d’intérêt annuel',
    estimatedMonths: 'Mois estimés',
    totalPaid: 'Total payé',
    estimatedInterest: 'Intérêt estimé',
    approximateEndDate: 'Date de fin approximative',
    debtPaymentTooLow: 'Le paiement mensuel ne suffit pas à réduire la dette avec ce taux.',
    simplifiedEstimateNote: 'Il s’agit d’une estimation simple qui n’inclut pas tous les frais ou conditions bancaires.',
  },
};

const SUMMARY_STATS: Array<{ label: LocalizedText; value: string; icon: typeof BookOpen }> = [
  {
    value: '15',
    label: { ar: 'نظرية مالية', en: 'Financial Theories', fr: 'Théories financières' },
    icon: BookOpen,
  },
  {
    value: '8',
    label: { ar: 'نظريات أساسية', en: 'Core Theories', fr: 'Théories clés' },
    icon: Sparkles,
  },
  {
    value: '5',
    label: { ar: 'أدوات ذكية', en: 'Smart Tools', fr: 'Outils intelligents' },
    icon: Calculator,
  },
  {
    value: '6',
    label: { ar: 'أمثلة عملية', en: 'Practical Examples', fr: 'Exemples pratiques' },
    icon: Lightbulb,
  },
];

const PRACTICAL_EXAMPLES: Array<{
  title: LocalizedText;
  scenario: LocalizedText;
  lesson: LocalizedText;
  theoryId: string;
}> = [
  {
    theoryId: 'personal-budgeting',
    title: {
      ar: 'تقسيم الراتب بدون عشوائية',
      en: 'Split salary without randomness',
      fr: 'Répartir le salaire sans hasard',
    },
    scenario: {
      ar: 'بدل أن يبدأ الشهر بدون خطة، يتم تقسيم الدخل إلى احتياجات، رغبات، وادخار قبل الصرف.',
      en: 'Instead of starting the month without a plan, income is split into needs, wants, and saving before spending.',
      fr: 'Au lieu de commencer le mois sans plan, le revenu est réparti en besoins, envies et épargne avant de dépenser.',
    },
    lesson: {
      ar: 'الميزانية تحول الراتب إلى خطة واضحة.',
      en: 'Budgeting turns salary into a clear plan.',
      fr: 'Le budget transforme le salaire en plan clair.',
    },
  },
  {
    theoryId: 'smart-goals',
    title: {
      ar: 'هدف مالي يتحول إلى خطة',
      en: 'A financial goal becomes a plan',
      fr: 'Un objectif financier devient un plan',
    },
    scenario: {
      ar: 'بدل عبارة عامة مثل “أبي أوفر”، يتم تحديد مبلغ ومدة وخطوة شهرية.',
      en: 'Instead of “I want to save,” define an amount, deadline, and monthly action.',
      fr: 'Au lieu de “je veux économiser”, définissez un montant, un délai et une action mensuelle.',
    },
    lesson: {
      ar: 'الهدف بدون رقم ومدة يبقى أمنية.',
      en: 'A goal without amount and time remains a wish.',
      fr: 'Un objectif sans montant ni délai reste un souhait.',
    },
  },
  {
    theoryId: 'opportunity-cost',
    title: {
      ar: 'قرار شراء له تكلفة فرصة',
      en: 'A purchase has opportunity cost',
      fr: 'Un achat a un coût d’opportunité',
    },
    scenario: {
      ar: 'أي مبلغ يصرف على رغبة اليوم قد يكون فرصة ضائعة لهدف أو ادخار أو استثمار.',
      en: 'Money spent on a want today may be a missed chance for a goal, saving, or investment.',
      fr: 'L’argent dépensé aujourd’hui pour une envie peut être une occasion manquée pour un objectif, une épargne ou un investissement.',
    },
    lesson: {
      ar: 'اسأل: شنو الخيار الثاني الأفضل لهذا المبلغ؟',
      en: 'Ask: what is the next best use of this money?',
      fr: 'Demandez : quelle est la meilleure autre utilisation de cet argent ?',
    },
  },
  {
    theoryId: 'emergency-fund',
    title: {
      ar: 'صندوق طوارئ محسوب',
      en: 'A calculated emergency fund',
      fr: 'Un fonds d’urgence calculé',
    },
    scenario: {
      ar: 'يتم تقدير صندوق الطوارئ بناءً على مصروفات شهرية معروفة، وليس رقماً عشوائياً.',
      en: 'The emergency fund is estimated from known monthly expenses, not a random number.',
      fr: 'Le fonds d’urgence est estimé à partir de dépenses mensuelles connues, pas d’un chiffre aléatoire.',
    },
    lesson: {
      ar: 'الاحتياط المالي يحمي الخطة من المفاجآت.',
      en: 'A reserve protects the plan from surprises.',
      fr: 'Une réserve protège le plan contre les imprévus.',
    },
  },
  {
    theoryId: 'reduce-bad-debt',
    title: {
      ar: 'تقليل دين سيئ',
      en: 'Reduce harmful debt',
      fr: 'Réduire une mauvaise dette',
    },
    scenario: {
      ar: 'قبل الدخول في دين جديد، تتم مقارنة فائدته بضغطه على الميزانية الشهرية.',
      en: 'Before taking new debt, compare its benefit with its pressure on the monthly budget.',
      fr: 'Avant une nouvelle dette, comparez son bénéfice à sa pression sur le budget mensuel.',
    },
    lesson: {
      ar: 'الدين الجيد يحتاج خطة سداد واضحة.',
      en: 'Useful debt still needs a clear repayment plan.',
      fr: 'Même une dette utile demande un plan de remboursement clair.',
    },
  },
  {
    theoryId: 'long-term-investing',
    title: {
      ar: 'استثمار طويل المدى',
      en: 'Long-term investing',
      fr: 'Investissement à long terme',
    },
    scenario: {
      ar: 'بدل محاولة توقيت السوق، يتم التركيز على الصبر، التوزيع، والاستمرار.',
      en: 'Instead of timing the market, focus on patience, diversification, and consistency.',
      fr: 'Au lieu de prévoir le marché, concentrez-vous sur patience, diversification et régularité.',
    },
    lesson: {
      ar: 'الاستثمار الحقيقي يحتاج وقت وانضباط.',
      en: 'Real investing needs time and discipline.',
      fr: 'Un vrai investissement demande du temps et de la discipline.',
    },
  },
];

function localeFrom(value: string): FinancialTheoryLang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function relatedTheory(id: string) {
  return FINANCIAL_THEORIES.find(theory => theory.id === id);
}

function applyCopy(lang: FinancialTheoryLang, tool: string) {
  if (lang === 'en') {
    return `Use ${tool} as the practical workspace for this idea when your real data is available.`;
  }
  if (lang === 'fr') {
    return `Utilisez ${tool} comme espace pratique pour cette idée lorsque vos données réelles sont disponibles.`;
  }
  return `استخدم ${tool} كمساحة عملية لتطبيق هذه الفكرة عندما تكون بياناتك الحقيقية متوفرة.`;
}

type CalculatorId = 'salary-split' | 'emergency-fund' | 'debt-plan';

const ACTIVE_CALCULATORS = new Set<string>(['salary-split', 'emergency-fund', 'debt-plan']);

function isCalculatorId(value: string): value is CalculatorId {
  return ACTIVE_CALCULATORS.has(value);
}

function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCalculatorDate(months: number, lang: FinancialTheoryLang) {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.max(0, months));
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

function CalculatorField({
  label,
  value,
  onChange,
  min = 0,
  step = '0.01',
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  step?: string;
  suffix?: string;
}) {
  return (
    <label className="calculator-field">
      <span>{label}</span>
      <span className="calculator-input-wrap">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={event => onChange(event.target.value)}
        />
        {suffix ? <em>{suffix}</em> : null}
      </span>
    </label>
  );
}

function ResultCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'strong' | 'warning' }) {
  return (
    <div className={`calculator-result-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SmartCalculatorPanel({
  activeId,
  title,
  lang,
  text,
  defaultCurrency,
  onClose,
}: {
  activeId: CalculatorId;
  title: string;
  lang: FinancialTheoryLang;
  text: Record<string, string>;
  defaultCurrency: string;
  onClose: () => void;
}) {
  const [salary, setSalary] = useState({ income: '', needs: '50', wants: '30', savings: '20', currency: defaultCurrency });
  const [emergency, setEmergency] = useState({ expenses: '', months: '6', customMonths: '', savings: '', currency: defaultCurrency });
  const [debt, setDebt] = useState({ amount: '', payment: '', interest: '', currency: defaultCurrency });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function money(amount: number, currency: string) {
    return formatMoney(Number.isFinite(amount) ? amount : 0, currency || 'KWD', lang);
  }

  function reset() {
    if (activeId === 'salary-split') setSalary({ income: '', needs: '50', wants: '30', savings: '20', currency: defaultCurrency });
    if (activeId === 'emergency-fund') setEmergency({ expenses: '', months: '6', customMonths: '', savings: '', currency: defaultCurrency });
    if (activeId === 'debt-plan') setDebt({ amount: '', payment: '', interest: '', currency: defaultCurrency });
  }

  const salaryIncome = asNumber(salary.income);
  const needsPercent = asNumber(salary.needs);
  const wantsPercent = asNumber(salary.wants);
  const savingsPercent = asNumber(salary.savings);
  const percentageTotal = needsPercent + wantsPercent + savingsPercent;
  const salaryValid = salaryIncome > 0 && percentageTotal === 100;

  const emergencyExpenses = asNumber(emergency.expenses);
  const selectedEmergencyMonths = emergency.months === 'custom' ? asNumber(emergency.customMonths) : asNumber(emergency.months);
  const currentEmergencySavings = asNumber(emergency.savings);
  const minimumEmergencyTarget = emergencyExpenses * 3;
  const recommendedEmergencyTarget = emergencyExpenses * selectedEmergencyMonths;
  const emergencyRemaining = Math.max(0, recommendedEmergencyTarget - currentEmergencySavings);
  const emergencyValid = emergencyExpenses > 0 && selectedEmergencyMonths > 0;

  const debtAmount = asNumber(debt.amount);
  const monthlyPayment = asNumber(debt.payment);
  const annualRate = asNumber(debt.interest);
  const monthlyRate = annualRate > 0 ? annualRate / 100 / 12 : 0;
  const debtCanReduce = monthlyRate === 0 || monthlyPayment > debtAmount * monthlyRate;
  const debtValid = debtAmount > 0 && monthlyPayment > 0 && debtCanReduce;
  const estimatedMonths = debtValid
    ? monthlyRate > 0
      ? Math.ceil(-Math.log(1 - (debtAmount * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate))
      : Math.ceil(debtAmount / monthlyPayment)
    : 0;
  const totalPaid = estimatedMonths > 0 ? estimatedMonths * monthlyPayment : 0;
  const estimatedInterest = Math.max(0, totalPaid - debtAmount);

  return (
    <section className="calculator-panel" aria-labelledby="smart-calculator-title">
      <div className="calculator-panel-head">
        <div>
          <span>{text.calculatorTitle}</span>
          <h3 id="smart-calculator-title">{title}</h3>
          <p>{text.calculatorIntro}</p>
        </div>
        <button type="button" className="calculator-close" onClick={onClose} aria-label={text.close}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {activeId === 'salary-split' ? (
        <div className="calculator-layout">
          <div className="calculator-form-grid">
            <CalculatorField label={text.monthlyIncome} value={salary.income} onChange={value => setSalary(prev => ({ ...prev, income: value }))} />
            <CurrencySelect value={salary.currency} onChange={currency => setSalary(prev => ({ ...prev, currency }))} lang={lang} label={text.currency} ariaLabel={text.currency} />
            <CalculatorField label={text.needs} value={salary.needs} onChange={value => setSalary(prev => ({ ...prev, needs: value }))} step="1" suffix="%" />
            <CalculatorField label={text.wants} value={salary.wants} onChange={value => setSalary(prev => ({ ...prev, wants: value }))} step="1" suffix="%" />
            <CalculatorField label={text.savingsInvestingDebt} value={salary.savings} onChange={value => setSalary(prev => ({ ...prev, savings: value }))} step="1" suffix="%" />
            <div className={`calculator-total ${percentageTotal === 100 ? 'ok' : 'error'}`}>
              <span>{text.percentagesTotal}</span>
              <strong>{percentageTotal}%</strong>
            </div>
          </div>
          <div className="calculator-results" role="status" aria-live="polite">
            {salaryIncome <= 0 ? <p className="calculator-error">{text.incomeMustBePositive}</p> : null}
            {salaryIncome > 0 && percentageTotal !== 100 ? <p className="calculator-error">{text.percentagesMustTotal}</p> : null}
            {salaryValid ? (
              <>
                <ResultCard label={text.needs} value={money(salaryIncome * needsPercent / 100, salary.currency)} tone="strong" />
                <ResultCard label={text.wants} value={money(salaryIncome * wantsPercent / 100, salary.currency)} />
                <ResultCard label={text.savingsInvestingDebt} value={money(salaryIncome * savingsPercent / 100, salary.currency)} />
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeId === 'emergency-fund' ? (
        <div className="calculator-layout">
          <div className="calculator-form-grid">
            <CalculatorField label={text.monthlyExpenses} value={emergency.expenses} onChange={value => setEmergency(prev => ({ ...prev, expenses: value }))} />
            <CurrencySelect value={emergency.currency} onChange={currency => setEmergency(prev => ({ ...prev, currency }))} lang={lang} label={text.currency} ariaLabel={text.currency} />
            <label className="calculator-field">
              <span>{text.monthsCount}</span>
              <select value={emergency.months} onChange={event => setEmergency(prev => ({ ...prev, months: event.target.value }))}>
                <option value="3">{text.threeMonths}</option>
                <option value="6">{text.sixMonths}</option>
                <option value="12">{text.twelveMonths}</option>
                <option value="custom">{text.custom}</option>
              </select>
            </label>
            {emergency.months === 'custom' ? (
              <CalculatorField label={text.customMonths} value={emergency.customMonths} onChange={value => setEmergency(prev => ({ ...prev, customMonths: value }))} step="1" />
            ) : null}
            <CalculatorField label={text.currentSavings} value={emergency.savings} onChange={value => setEmergency(prev => ({ ...prev, savings: value }))} />
          </div>
          <div className="calculator-results" role="status" aria-live="polite">
            {!emergencyValid ? <p className="calculator-error">{text.amountMustBePositive}</p> : null}
            {emergencyValid ? (
              <>
                <ResultCard label={text.minimumEmergencyFund} value={money(minimumEmergencyTarget, emergency.currency)} />
                <ResultCard label={text.recommendedAmount} value={money(recommendedEmergencyTarget, emergency.currency)} tone="strong" />
                <ResultCard label={text.remainingAmount} value={money(emergencyRemaining, emergency.currency)} tone={emergencyRemaining === 0 ? 'strong' : 'warning'} />
                {currentEmergencySavings >= recommendedEmergencyTarget && currentEmergencySavings > 0 ? <p className="calculator-success">{text.emergencyComplete}</p> : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeId === 'debt-plan' ? (
        <div className="calculator-layout">
          <div className="calculator-form-grid">
            <CalculatorField label={text.debtAmount} value={debt.amount} onChange={value => setDebt(prev => ({ ...prev, amount: value }))} />
            <CalculatorField label={text.monthlyPayment} value={debt.payment} onChange={value => setDebt(prev => ({ ...prev, payment: value }))} />
            <CurrencySelect value={debt.currency} onChange={currency => setDebt(prev => ({ ...prev, currency }))} lang={lang} label={text.currency} ariaLabel={text.currency} />
            <CalculatorField label={text.annualInterestRate} value={debt.interest} onChange={value => setDebt(prev => ({ ...prev, interest: value }))} suffix="%" />
          </div>
          <div className="calculator-results" role="status" aria-live="polite">
            {debtAmount <= 0 || monthlyPayment <= 0 ? <p className="calculator-error">{text.amountMustBePositive}</p> : null}
            {debtAmount > 0 && monthlyPayment > 0 && !debtCanReduce ? <p className="calculator-error">{text.debtPaymentTooLow}</p> : null}
            {debtValid ? (
              <>
                <ResultCard label={text.estimatedMonths} value={`${estimatedMonths}`} tone="strong" />
                <ResultCard label={text.totalPaid} value={money(totalPaid, debt.currency)} />
                {annualRate > 0 ? <ResultCard label={text.estimatedInterest} value={money(estimatedInterest, debt.currency)} /> : null}
                <ResultCard label={text.approximateEndDate} value={formatCalculatorDate(estimatedMonths, lang)} />
                <p className="calculator-note">{text.simplifiedEstimateNote}</p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="calculator-actions">
        <button type="button" onClick={reset}>
          <RotateCcw size={16} aria-hidden="true" />
          {text.reset}
        </button>
      </div>
    </section>
  );
}

function TheoryCard({
  theory,
  lang,
  text,
  isOpen,
  onToggle,
}: {
  theory: FinancialTheory;
  lang: FinancialTheoryLang;
  text: Record<string, string>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = THEORY_ICONS[(theory.number - 1) % THEORY_ICONS.length];
  const title = getFinancialTheoryText(theory.title, lang);
  const short = getFinancialTheoryText(theory.short, lang);
  const category = FINANCIAL_THEORY_CATEGORIES.find(item => item.id === theory.category);
  const categoryLabel = category ? getFinancialTheoryText(category.label, lang) : '';
  const takeaway = getFinancialTheoryText(theory.keyTakeaway, lang);
  const tool = getFinancialTheoryText(theory.sfmTool, lang);
  const detailId = `theory-details-${theory.id}`;
  const examples = theory.examples?.[lang] ?? [];
  const rows = theory.tableRows?.[lang] ?? [];

  return (
    <article className={`theory-card ${isOpen ? 'expanded' : ''}`}>
      <div className="theory-card-head">
        <span className="theory-number">{String(theory.number).padStart(2, '0')}</span>
        <span className="theory-icon" aria-hidden="true"><Icon size={22} /></span>
        <div>
          <span className="theory-category">{categoryLabel}</span>
          <h3>{title}</h3>
        </div>
      </div>

      <p className="theory-short">{short}</p>

      <div className="theory-meta-row">
        <span>{text.keyTakeaway}</span>
        <strong>{takeaway}</strong>
      </div>

      <div className="theory-tool-pill">
        <span>{text.relatedSfmTool}</span>
        <strong>{tool}</strong>
      </div>

      <div className="theory-actions">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={detailId}
          onClick={onToggle}
        >
          {isOpen ? text.hideTheory : text.readTheory}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {theory.sfmToolHref ? (
          <Link href={theory.sfmToolHref} aria-label={`${text.openTool}: ${tool}`}>
            {text.openTool}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className="coming-soon-pill">{text.comingSoon}</span>
        )}
      </div>

      <div id={detailId} className="theory-details" hidden={!isOpen}>
        <div className="detail-block">
          <h4>{text.details}</h4>
          {theory.details[lang].map(line => <p key={line}>{line}</p>)}
        </div>

        {examples.length > 0 ? (
          <div className="detail-block">
            <h4>{text.educationalExample}</h4>
            <ul>
              {examples.map(example => <li key={example}>{example}</li>)}
            </ul>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="detail-block table-block">
            <table>
              <tbody>
                {rows.map(row => (
                  <tr key={`${row.label}-${row.value}`}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="detail-block tool-block">
          <h4>{text.applyInSfm}</h4>
          <p>{applyCopy(lang, tool)}</p>
        </div>
      </div>
    </article>
  );
}

export default function FinancialTheoriesPage() {
  const { lang, dir } = useLanguage();
  const { currency: userCurrency } = useCurrency();
  const locale = localeFrom(lang);
  const text = UI_COPY[locale];
  const [activeCategory, setActiveCategory] = useState<FinancialTheoryCategoryId>('all');
  const [query, setQuery] = useState('');
  const [openTheory, setOpenTheory] = useState<string | null>(null);
  const [activeCalculator, setActiveCalculator] = useState<CalculatorId | null>(null);
  const defaultCurrency = userCurrency || 'KWD';

  const categoryTabs: PageTabItem[] = useMemo(() => (
    FINANCIAL_THEORY_CATEGORIES.map(category => ({
      id: category.id,
      label: getFinancialTheoryText(category.label, locale),
      count: category.id === 'all'
        ? FINANCIAL_THEORIES.length
        : FINANCIAL_THEORIES.filter(theory => theory.category === category.id).length,
    }))
  ), [locale]);

  const filteredTheories = useMemo(() => {
    const normalizedQuery = normalize(query);
    return FINANCIAL_THEORIES.filter(theory => {
      const matchesCategory = activeCategory === 'all' || theory.category === activeCategory;
      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;
      const haystack = [
        theory.number.toString(),
        getFinancialTheoryText(theory.title, locale),
        getFinancialTheoryText(theory.short, locale),
        getFinancialTheoryText(theory.keyTakeaway, locale),
        getFinancialTheoryText(theory.sfmTool, locale),
        ...theory.details[locale],
        ...(theory.examples?.[locale] ?? []),
      ].join(' ');
      return normalize(haystack).includes(normalizedQuery);
    });
  }, [activeCategory, locale, query]);

  const featuredTheories = useMemo(() => (
    FEATURED_FINANCIAL_THEORIES
      .map(item => {
        const theory = relatedTheory(item.theoryId);
        return theory ? { theory, why: item.why } : null;
      })
      .filter(Boolean) as Array<{ theory: FinancialTheory; why: LocalizedText }>
  ), []);

  return (
    <div className="financial-theories-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="financial-theories-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          className="financial-theories-hero"
          eyebrow={text.badge}
          title={text.title}
          subtitle={text.subtitle}
          icon={<GraduationCap size={30} />}
          status={<span className="hero-note">{text.educationNote}</span>}
          actions={(
            <>
              <a className="theory-primary-link" href="#theory-library">{text.startNow}</a>
              <a className="theory-secondary-link" href="#smart-tools">{text.exploreTools}</a>
              <a className="theory-secondary-link" href="#featured-theories">{text.showBest}</a>
            </>
          )}
        />

        <section className="learning-overview" aria-labelledby="why-theories-matter">
          <StatGrid className="learning-stats-grid">
            {SUMMARY_STATS.map(stat => {
              const Icon = stat.icon;
              return (
                <AppCard key={getFinancialTheoryText(stat.label, locale)} className="theory-stat-card">
                  <span aria-hidden="true"><Icon size={20} /></span>
                  <div>
                    <strong>{stat.value}</strong>
                    <p>{getFinancialTheoryText(stat.label, locale)}</p>
                  </div>
                </AppCard>
              );
            })}
          </StatGrid>

          <AppCard className="why-card">
            <div className="why-icon" aria-hidden="true"><Brain size={26} /></div>
            <div className="why-copy">
              <span>{text.educationNote}</span>
              <h2 id="why-theories-matter">{text.whyTitle}</h2>
              <p>{text.whyBody}</p>
            </div>
            <ul className="why-list">
              {[text.whyPoint1, text.whyPoint2, text.whyPoint3].map(point => (
                <li key={point}>
                  <CheckCircle2 size={17} aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </AppCard>
        </section>

        <section id="theory-library" className="theory-section library-section section-panel" aria-labelledby="theory-library-title">
          <div className="theory-section-head">
            <span>{text.categories}</span>
            <h2 id="theory-library-title">{text.theoryLibrary}</h2>
            <p>{text.theoryLibrarySubtitle}</p>
          </div>

          <div className="theory-controls">
            <label className="theory-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{text.searchLabel}</span>
              <input
                type="search"
                value={query}
                placeholder={text.searchPlaceholder}
                onChange={event => {
                  setQuery(event.target.value);
                  setOpenTheory(null);
                }}
              />
            </label>

            <PageTabs
              tabs={categoryTabs}
              active={activeCategory}
              onChange={id => {
                setActiveCategory(id as FinancialTheoryCategoryId);
                setOpenTheory(null);
              }}
              ariaLabel={text.categories}
              className="financial-theory-tabs"
            />
          </div>

          {filteredTheories.length > 0 ? (
            <div className="theory-grid">
              {filteredTheories.map(theory => (
                <TheoryCard
                  key={theory.id}
                  theory={theory}
                  lang={locale}
                  text={text}
                  isOpen={openTheory === theory.id}
                  onToggle={() => setOpenTheory(current => current === theory.id ? null : theory.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen size={28} />}
              title={text.noResults}
              description={text.noResultsDescription}
            />
          )}
        </section>

        <section id="featured-theories" className="theory-section featured-section section-panel" aria-labelledby="featured-theories-title">
          <div className="theory-section-head">
            <span>{text.relatedSfmTool}</span>
            <h2 id="featured-theories-title">{text.bestTitle}</h2>
            <p>{text.bestSubtitle}</p>
          </div>

          <CardsGrid className="featured-theory-grid">
            {featuredTheories.map(({ theory, why }) => {
              const tool = getFinancialTheoryText(theory.sfmTool, locale);
              return (
                <AppCard key={theory.id} className="featured-theory-card">
                  <span className="featured-index">{String(theory.number).padStart(2, '0')}</span>
                  <h3>{getFinancialTheoryText(theory.title, locale)}</h3>
                  <p>{getFinancialTheoryText(why, locale)}</p>
                  <div className="featured-tool">
                    <small>{text.relatedSfmTool}</small>
                    <strong>{tool}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('all');
                      setQuery('');
                      setOpenTheory(theory.id);
                      document.getElementById('theory-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    aria-label={`${text.readTheory}: ${getFinancialTheoryText(theory.title, locale)}`}
                  >
                    {text.readTheory}
                  </button>
                </AppCard>
              );
            })}
          </CardsGrid>
        </section>

        <section className="theory-section examples-section section-panel" aria-labelledby="practical-examples-title">
          <div className="theory-section-head">
            <span>{text.educationalExample}</span>
            <h2 id="practical-examples-title">{text.practicalTitle}</h2>
            <p>{text.practicalSubtitle}</p>
          </div>

          <CardsGrid className="examples-grid">
            {PRACTICAL_EXAMPLES.map(example => {
              const theory = relatedTheory(example.theoryId);
              return (
                <AppCard key={getFinancialTheoryText(example.title, locale)} className="practical-example-card">
                  <span className="example-label">
                    <Lightbulb size={16} aria-hidden="true" />
                    {text.educationalExample}
                  </span>
                  <h3>{getFinancialTheoryText(example.title, locale)}</h3>
                  <div>
                    <small>{text.scenario}</small>
                    <p>{getFinancialTheoryText(example.scenario, locale)}</p>
                  </div>
                  <div>
                    <small>{text.lesson}</small>
                    <p>{getFinancialTheoryText(example.lesson, locale)}</p>
                  </div>
                  {theory ? (
                    <strong>{text.relatedTheory}: {getFinancialTheoryText(theory.title, locale)}</strong>
                  ) : null}
                </AppCard>
              );
            })}
          </CardsGrid>
        </section>

        <section id="smart-tools" className="theory-section tools-section section-panel" aria-labelledby="smart-tools-title">
          <div className="theory-section-head">
            <span>{text.smartToolsTitle}</span>
            <h2 id="smart-tools-title">{text.smartToolsTitle}</h2>
            <p>{text.smartToolsSubtitle}</p>
          </div>

          <CardsGrid className="tools-grid">
            {FINANCIAL_THEORY_TOOLS.map((tool, index) => {
              const Icon = [Calculator, Landmark, ShieldAlert, Target, Gauge][index] ?? Calculator;
              const title = getFinancialTheoryText(tool.title, locale);
              const calculatorAvailable = isCalculatorId(tool.id);
              return (
                <AppCard key={tool.id} className="smart-tool-card">
                  <div className="smart-tool-top">
                    <div className="smart-tool-icon" aria-hidden="true"><Icon size={22} /></div>
                    <span className={calculatorAvailable ? 'status available' : 'status soon'}>
                      {calculatorAvailable ? text.available : text.comingSoon}
                    </span>
                  </div>
                  <h3>{title}</h3>
                  <p>{getFinancialTheoryText(tool.description, locale)}</p>
                  {calculatorAvailable ? (
                    <button
                      type="button"
                      className="smart-tool-action"
                      aria-label={`${text.useNow}: ${title}`}
                      onClick={() => {
                        setActiveCalculator(tool.id);
                        window.setTimeout(() => document.getElementById('active-smart-calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                      }}
                    >
                      {text.useNow}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  ) : (
                    <button type="button" disabled aria-label={`${title}: ${text.comingSoon}`}>
                      {text.comingSoon}
                    </button>
                  )}
                </AppCard>
              );
            })}
          </CardsGrid>

          {activeCalculator ? (
            <div id="active-smart-calculator">
              <SmartCalculatorPanel
                activeId={activeCalculator}
                title={getFinancialTheoryText(FINANCIAL_THEORY_TOOLS.find(tool => tool.id === activeCalculator)?.title ?? FINANCIAL_THEORY_TOOLS[0].title, locale)}
                lang={locale}
                text={text}
                defaultCurrency={defaultCurrency}
                onClose={() => setActiveCalculator(null)}
              />
            </div>
          ) : null}
        </section>

        <section className="theories-cta" aria-labelledby="financial-theories-cta-title">
          <div>
            <span>{text.badge}</span>
            <h2 id="financial-theories-cta-title">{text.ctaTitle}</h2>
            <p>{text.ctaSubtitle}</p>
          </div>
          <div className="cta-actions">
            <Link href="/dashboard">{text.openDashboard}</Link>
            <Link href="/goals">{text.openGoals}</Link>
            <a href="#smart-tools">{text.openTools}</a>
          </div>
        </section>
      </DashboardPageShell>

      <style jsx global>{`
        .financial-theories-shell {
          min-height: 100vh;
          background: var(--sfm-page-gradient);
          color: var(--sfm-foreground);
          overflow-x: clip;
          scroll-behavior: smooth;
        }

        .financial-theories-content {
          display: grid;
          gap: 20px;
          min-width: 0;
        }

        .financial-theories-hero {
          position: relative;
          overflow: hidden;
          min-height: 220px;
          padding: 26px !important;
          align-items: center !important;
        }

        .financial-theories-hero::before {
          content: '';
          position: absolute;
          inset: 18px 22px auto auto;
          width: min(360px, 42%);
          height: 138px;
          opacity: .42;
          border-radius: 999px;
          background:
            repeating-linear-gradient(
              150deg,
              rgba(167, 243, 240, .2) 0 2px,
              transparent 2px 22px
            );
          transform: rotate(-7deg);
          pointer-events: none;
        }

        .hero-note {
          display: inline-flex;
          max-width: 330px;
          border-radius: 14px;
          border: 1px solid rgba(167, 243, 240, .18);
          background: rgba(255, 255, 255, .08);
          color: #D9ECFF;
          padding: 9px 11px;
          line-height: 1.55;
          font-size: 12px;
          font-weight: 900;
        }

        .theory-primary-link,
        .theory-secondary-link,
        .featured-theory-card button,
        .smart-tool-card a,
        .smart-tool-card button,
        .cta-actions a {
          min-height: 40px;
          border-radius: 13px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 13px Tajawal, Arial, sans-serif;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
          white-space: nowrap;
        }

        .theory-primary-link,
        .featured-theory-card button,
        .cta-actions a:first-child {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 16px 38px rgba(24, 212, 212, .24);
        }

        .theory-secondary-link,
        .cta-actions a {
          border: 1px solid rgba(167, 243, 240, .25);
          background: rgba(255, 255, 255, .09);
          color: #EAF6FF;
        }

        .theory-primary-link:hover,
        .theory-secondary-link:hover,
        .featured-theory-card button:hover,
        .smart-tool-card a:hover,
        .smart-tool-card button.smart-tool-action:hover,
        .cta-actions a:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 44px rgba(24, 212, 212, .24);
        }

        .learning-overview {
          display: grid;
          grid-template-columns: minmax(250px, .42fr) minmax(0, 1fr);
          gap: 16px;
          align-items: stretch;
          min-width: 0;
        }

        .learning-stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 10px !important;
          align-content: stretch;
        }

        .theory-stat-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 12px;
          min-height: 86px;
          padding: 14px !important;
          border: 1px solid var(--sfm-border) !important;
          background: var(--sfm-card) !important;
        }

        .theory-stat-card > span,
        .why-icon,
        .theory-icon,
        .smart-tool-icon {
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
          border: 1px solid rgba(29, 140, 255, .13);
        }

        .theory-stat-card > span {
          width: 38px;
          height: 38px;
          border-radius: 13px;
        }

        .theory-stat-card strong {
          display: block;
          color: var(--sfm-heading);
          font-size: 25px;
          line-height: 1;
        }

        .theory-stat-card p {
          margin: 3px 0 0;
          color: var(--sfm-muted-readable);
          font-weight: 900;
          line-height: 1.25;
          font-size: 12px;
        }

        .why-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) minmax(260px, .72fr);
          gap: 16px;
          align-items: center;
          padding: 18px !important;
          background:
            radial-gradient(circle at 0% 0%, rgba(24, 212, 212, .16), transparent 30%),
            var(--sfm-card) !important;
          border: 1px solid var(--sfm-border) !important;
        }

        .why-icon {
          width: 48px;
          height: 48px;
          border-radius: 16px;
        }

        .why-copy span,
        .theory-section-head span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .why-copy h2,
        .theory-section-head h2,
        .theories-cta h2 {
          margin: 6px 0;
          color: var(--sfm-heading);
          font-size: clamp(22px, 2.6vw, 30px);
          line-height: 1.15;
        }

        .why-copy p,
        .theory-section-head p,
        .theories-cta p {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.7;
          font-weight: 780;
        }

        .why-list {
          margin: 0;
          padding: 0;
          display: grid;
          gap: 8px;
          list-style: none;
        }

        .why-list li {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 9px;
          align-items: center;
          border: 1px solid rgba(24, 212, 212, .16);
          border-radius: 13px;
          background: rgba(24, 212, 212, .07);
          padding: 10px 12px;
          color: var(--sfm-heading);
          font-weight: 900;
        }

        .why-list svg {
          color: var(--sfm-success);
        }

        .theory-section {
          display: grid;
          gap: 16px;
          min-width: 0;
          scroll-margin-top: 22px;
        }

        .section-panel {
          border: 1px solid var(--sfm-border);
          border-radius: 26px;
          background: var(--sfm-card);
          box-shadow: 0 14px 34px rgba(3, 18, 37, .045);
          padding: 20px;
        }

        .theory-section-head {
          max-width: 860px;
          min-width: 0;
        }

        .theory-controls {
          display: grid;
          grid-template-columns: minmax(240px, .36fr) minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          min-width: 0;
          border: 1px solid var(--sfm-border);
          border-radius: 18px;
          background: var(--sfm-card);
          padding: 12px;
          box-shadow: 0 12px 30px rgba(3, 18, 37, .05);
        }

        .theory-search {
          min-width: 0;
          min-height: 42px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          border: 1px solid var(--sfm-border);
          border-radius: 14px;
          background: var(--sfm-input-bg);
          color: var(--sfm-primary-hover);
          padding: 0 14px;
        }

        .theory-search input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--sfm-foreground);
          font: 900 14px Tajawal, Arial, sans-serif;
        }

        .theory-search input::placeholder {
          color: var(--sfm-muted);
          opacity: .9;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .financial-theory-tabs {
          padding-bottom: 0 !important;
        }

        .theory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
          gap: 18px;
          align-items: stretch;
          min-width: 0;
        }

        .theory-card {
          position: relative;
          display: grid;
          grid-template-rows: auto auto auto auto 1fr auto;
          gap: 12px;
          min-width: 0;
          min-height: 100%;
          padding: 18px;
          border-radius: 20px;
          border: 1px solid var(--sfm-border);
          background: var(--sfm-card);
          box-shadow: 0 14px 32px rgba(3, 18, 37, .065);
          overflow: hidden;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
        }

        .theory-card:hover,
        .theory-card.expanded {
          border-color: rgba(24, 212, 212, .35);
          box-shadow: var(--sfm-interactive-glow);
          transform: translateY(-2px);
        }

        .theory-card-head {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr);
          gap: 9px;
          align-items: start;
          min-width: 0;
        }

        .theory-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: var(--sfm-midnight);
          color: var(--sfm-soft-cyan);
          font-size: 13px;
          font-weight: 950;
          box-shadow: inset 0 -2px 0 rgba(24, 212, 212, .28);
        }

        .theory-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
        }

        .theory-category {
          display: inline-flex;
          width: fit-content;
          max-width: 100%;
          border-radius: 999px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 950;
          line-height: 1;
          overflow-wrap: anywhere;
        }

        .theory-card h3 {
          margin: 8px 0 0;
          color: var(--sfm-heading);
          font-size: 19px;
          line-height: 1.3;
        }

        .theory-short {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.62;
          font-weight: 800;
        }

        .theory-meta-row {
          min-width: 0;
          border: 1px solid rgba(24, 212, 212, .14);
          border-radius: 13px;
          background: rgba(24, 212, 212, .065);
          padding: 9px 10px;
        }

        .theory-meta-row span,
        .theory-tool-pill span,
        .featured-tool small,
        .practical-example-card small {
          display: block;
          color: var(--sfm-muted);
          font-size: 11px;
          font-weight: 950;
          margin-bottom: 3px;
        }

        .theory-meta-row strong,
        .theory-tool-pill strong {
          display: block;
          color: var(--sfm-heading);
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .theory-tool-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 0;
          border-radius: 999px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: rgba(29, 140, 255, .055);
          padding: 8px 10px;
        }

        .theory-tool-pill span {
          margin: 0;
          flex: 0 0 auto;
        }

        .theory-tool-pill strong {
          min-width: 0;
          text-align: end;
          font-size: 12px;
        }

        .theory-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          min-width: 0;
          align-self: end;
        }

        .theory-actions button,
        .theory-actions a,
        .coming-soon-pill {
          min-height: 36px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 12px;
          font: 950 12px Tajawal, Arial, sans-serif;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
        }

        .theory-actions button {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          cursor: pointer;
        }

        .theory-actions button svg {
          transition: transform .18s ease;
        }

        .theory-card.expanded .theory-actions button svg {
          transform: rotate(180deg);
        }

        .theory-actions a {
          border: 1px solid var(--sfm-border);
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
        }

        .coming-soon-pill {
          border: 1px dashed rgba(29, 140, 255, .22);
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
        }

        .theory-actions button:hover,
        .theory-actions a:hover {
          transform: translateY(-1px);
          border-color: rgba(24, 212, 212, .34);
          box-shadow: 0 10px 28px rgba(3, 18, 37, .08);
        }

        .theory-details {
          display: grid;
          gap: 12px;
          border-top: 1px solid rgba(29, 140, 255, .12);
          padding-top: 14px;
        }

        .theory-details[hidden] {
          display: none;
        }

        .detail-block {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        .detail-block h4 {
          margin: 0;
          color: var(--sfm-heading);
          font-size: 15px;
        }

        .detail-block p,
        .detail-block li {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.72;
          font-weight: 760;
        }

        .detail-block ul {
          margin: 0;
          padding-inline-start: 20px;
          display: grid;
          gap: 7px;
        }

        .detail-block table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 8px;
        }

        .detail-block th,
        .detail-block td {
          border: 1px solid rgba(29, 140, 255, .12);
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
          padding: 10px 12px;
          text-align: start;
          line-height: 1.55;
        }

        .detail-block th {
          width: 104px;
          border-radius: 13px;
          color: var(--sfm-primary-hover);
          white-space: nowrap;
        }

        .detail-block td {
          border-radius: 13px;
          font-weight: 850;
        }

        .tool-block {
          border-radius: 16px;
          background: rgba(29, 140, 255, .07);
          border: 1px solid rgba(29, 140, 255, .12);
          padding: 12px;
        }

        .featured-theory-grid,
        .examples-grid,
        .tools-grid {
          align-items: stretch;
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)) !important;
          gap: 16px !important;
        }

        .featured-theory-card,
        .smart-tool-card,
        .practical-example-card {
          display: grid;
          align-content: start;
          gap: 11px;
          min-width: 0;
          min-height: 100%;
          padding: 16px !important;
          border: 1px solid var(--sfm-border) !important;
          background: var(--sfm-card) !important;
        }

        .featured-index {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: var(--sfm-midnight);
          color: var(--sfm-soft-cyan);
          font-weight: 950;
          font-size: 12px;
        }

        .featured-theory-card h3,
        .smart-tool-card h3,
        .practical-example-card h3 {
          margin: 0;
          color: var(--sfm-heading);
          font-size: 18px;
          line-height: 1.35;
        }

        .featured-theory-card p,
        .smart-tool-card p,
        .practical-example-card p {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.6;
          font-weight: 800;
        }

        .featured-tool {
          display: grid;
          gap: 4px;
          margin-top: auto;
          border-radius: 13px;
          border: 1px solid rgba(29, 140, 255, .12);
          background: rgba(29, 140, 255, .06);
          padding: 8px 9px;
        }

        .featured-tool strong {
          color: var(--sfm-heading);
          line-height: 1.45;
        }

        .featured-theory-card button {
          width: fit-content;
          cursor: pointer;
        }

        .example-label {
          width: fit-content;
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          border: 1px solid rgba(24, 212, 212, .18);
          background: rgba(24, 212, 212, .09);
          color: var(--sfm-primary-hover);
          padding: 0 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .practical-example-card strong {
          margin-top: auto;
          color: var(--sfm-heading);
          line-height: 1.55;
          font-size: 13px;
        }

        .smart-tool-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .smart-tool-icon {
          width: 40px;
          height: 40px;
          border-radius: 14px;
        }

        .financial-theories-shell .status {
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 950;
        }

        .financial-theories-shell .status.available {
          background: rgba(22, 163, 74, .1);
          color: #15803D;
          border: 1px solid rgba(22, 163, 74, .18);
        }

        .financial-theories-shell .status.soon {
          background: rgba(245, 158, 11, .11);
          color: #B45309;
          border: 1px solid rgba(245, 158, 11, .18);
        }

        .smart-tool-card a,
        .smart-tool-card button {
          width: fit-content;
          margin-top: auto;
        }

        .smart-tool-card a {
          border: 1px solid var(--sfm-border);
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
        }

        .smart-tool-card button {
          border: 1px dashed rgba(29, 140, 255, .22);
          background: rgba(29, 140, 255, .07);
          color: var(--sfm-primary-hover);
          cursor: not-allowed;
        }

        .smart-tool-card button.smart-tool-action {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(29, 140, 255, .18);
        }

        .calculator-panel {
          display: grid;
          gap: 18px;
          min-width: 0;
          border: 1px solid rgba(24, 212, 212, .22);
          border-radius: 22px;
          background:
            radial-gradient(circle at 10% 0%, rgba(24, 212, 212, .12), transparent 32%),
            var(--sfm-light-card);
          padding: 18px;
          box-shadow: 0 18px 44px rgba(3, 18, 37, .08);
          scroll-margin-top: 20px;
        }

        .calculator-panel-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          min-width: 0;
        }

        .calculator-panel-head span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .calculator-panel-head h3 {
          margin: 5px 0;
          color: var(--sfm-heading);
          font-size: 22px;
          line-height: 1.25;
        }

        .calculator-panel-head p,
        .calculator-note {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.65;
          font-weight: 820;
        }

        .calculator-close {
          width: 40px;
          height: 40px;
          border: 1px solid var(--sfm-border);
          border-radius: 13px;
          background: var(--sfm-card);
          color: var(--sfm-heading);
          cursor: pointer;
          display: grid;
          place-items: center;
        }

        .calculator-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, .72fr);
          gap: 16px;
          align-items: start;
          min-width: 0;
        }

        .calculator-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          min-width: 0;
        }

        .calculator-field {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .calculator-field > span,
        .calculator-total span {
          color: var(--sfm-muted-readable);
          font-size: 12px;
          font-weight: 950;
        }

        .calculator-input-wrap {
          position: relative;
          display: block;
          min-width: 0;
        }

        .calculator-field input,
        .calculator-field select {
          width: 100%;
          min-height: 50px;
          border: 1px solid rgba(29, 140, 255, .20);
          border-radius: 14px;
          background: var(--sfm-input-bg);
          color: var(--sfm-foreground);
          padding: 0 12px;
          font: 900 14px Tajawal, Arial, sans-serif;
          outline: none;
        }

        .calculator-input-wrap input {
          padding-inline-end: 46px;
        }

        .calculator-input-wrap em {
          position: absolute;
          inset-inline-end: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--sfm-primary-hover);
          font-style: normal;
          font-weight: 950;
          pointer-events: none;
        }

        .calculator-total {
          min-height: 50px;
          display: grid;
          align-content: center;
          gap: 4px;
          border-radius: 14px;
          border: 1px solid rgba(29, 140, 255, .16);
          background: var(--sfm-card);
          padding: 9px 12px;
        }

        .calculator-total strong {
          color: var(--sfm-heading);
          font-size: 18px;
        }

        .calculator-total.ok {
          border-color: rgba(16, 185, 129, .28);
          background: rgba(16, 185, 129, .08);
        }

        .calculator-total.error {
          border-color: rgba(239, 68, 68, .24);
          background: rgba(239, 68, 68, .08);
        }

        .calculator-results {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .calculator-result-card {
          border: 1px solid var(--sfm-border);
          border-radius: 16px;
          background: var(--sfm-card);
          padding: 12px;
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .calculator-result-card span {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 950;
        }

        .calculator-result-card strong {
          color: var(--sfm-heading);
          font-size: clamp(18px, 2vw, 24px);
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .calculator-result-card.strong {
          border-color: rgba(24, 212, 212, .28);
          background: linear-gradient(135deg, rgba(29, 140, 255, .10), rgba(24, 212, 212, .10));
        }

        .calculator-result-card.warning {
          border-color: rgba(245, 158, 11, .24);
          background: rgba(245, 158, 11, .08);
        }

        .calculator-error,
        .calculator-success {
          margin: 0;
          border-radius: 14px;
          padding: 11px 12px;
          line-height: 1.65;
          font-weight: 920;
        }

        .calculator-error {
          border: 1px solid rgba(239, 68, 68, .18);
          background: rgba(239, 68, 68, .08);
          color: #B91C1C;
        }

        .calculator-success {
          border: 1px solid rgba(16, 185, 129, .20);
          background: rgba(16, 185, 129, .10);
          color: #047857;
        }

        .calculator-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
        }

        .calculator-actions button {
          min-height: 40px;
          border-radius: 13px;
          border: 1px solid var(--sfm-border);
          background: var(--sfm-card);
          color: var(--sfm-heading);
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .theories-cta {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: center;
          border-radius: 26px;
          padding: 28px;
          color: #EAF6FF;
          background:
            radial-gradient(circle at 14% 14%, rgba(24, 212, 212, .22), transparent 30%),
            linear-gradient(135deg, #031225, #061B33 56%, #0B2748);
          border: 1px solid rgba(167, 243, 240, .18);
          box-shadow: 0 24px 70px rgba(3, 18, 37, .22);
        }

        .theories-cta span {
          color: #A7F3F0;
          font-size: 12px;
          font-weight: 950;
        }

        .theories-cta h2 {
          color: #FFFFFF;
          margin: 8px 0;
        }

        .theories-cta p {
          color: #D9ECFF;
          font-size: 15px;
          font-weight: 850;
          max-width: 760px;
        }

        .cta-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 9px;
        }

        .cta-actions a {
          min-height: 46px;
          border-color: rgba(167, 243, 240, .36);
          background: rgba(255, 255, 255, .10);
          color: #EAF6FF;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .04);
        }

        .cta-actions a:first-child {
          border-color: transparent;
          color: #FFFFFF;
        }

        .financial-theories-shell a:focus-visible,
        .financial-theories-shell button:focus-visible,
        .financial-theories-shell input:focus-visible,
        .financial-theories-shell select:focus-visible {
          outline: 3px solid rgba(24, 212, 212, .56);
          outline-offset: 3px;
        }

        .dark .financial-theories-shell .section-panel,
        .dark .financial-theories-shell .theory-controls,
        .dark .financial-theories-shell .theory-card,
        .dark .financial-theories-shell .theory-stat-card,
        .dark .financial-theories-shell .why-card,
        .dark .financial-theories-shell .featured-theory-card,
        .dark .financial-theories-shell .smart-tool-card,
        .dark .financial-theories-shell .practical-example-card {
          border-color: var(--sfm-border);
          background: var(--sfm-card) !important;
          box-shadow: 0 18px 44px rgba(0, 0, 0, .22);
        }

        .dark .financial-theories-shell .theory-search,
        .dark .financial-theories-shell .detail-block th,
        .dark .financial-theories-shell .detail-block td,
        .dark .financial-theories-shell .calculator-field input,
        .dark .financial-theories-shell .calculator-field select {
          background: var(--sfm-input-bg);
        }

        .dark .financial-theories-shell .calculator-panel,
        .dark .financial-theories-shell .calculator-result-card,
        .dark .financial-theories-shell .calculator-total,
        .dark .financial-theories-shell .calculator-actions button,
        .dark .financial-theories-shell .calculator-close {
          border-color: var(--sfm-border);
          background: var(--sfm-card);
        }

        .dark .financial-theories-shell .calculator-error {
          color: #FCA5A5;
        }

        .dark .financial-theories-shell .calculator-success {
          color: #86EFAC;
        }

        .dark .financial-theories-shell .status.available {
          background: rgba(16, 185, 129, .16);
          color: #86EFAC;
          border-color: rgba(16, 185, 129, .28);
        }

        .dark .financial-theories-shell .status.soon,
        .dark .financial-theories-shell .coming-soon-pill {
          background: rgba(245, 158, 11, .16);
          color: #FCD34D;
          border-color: rgba(245, 158, 11, .28);
        }

        @media (min-width: 1320px) {
          .theory-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1024px) {
          .learning-overview,
          .why-card,
          .theories-cta {
            grid-template-columns: 1fr;
          }

          .cta-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 720px) {
          .financial-theories-content {
            gap: 16px;
          }

          .financial-theories-hero {
            min-height: auto;
            padding: 22px !important;
          }

          .financial-theories-hero::before {
            width: 80%;
            opacity: .24;
          }

          .theory-primary-link,
          .theory-secondary-link,
          .theory-actions button,
          .theory-actions a,
          .coming-soon-pill,
          .smart-tool-card a,
          .smart-tool-card button,
          .calculator-actions button,
          .featured-theory-card button,
          .cta-actions a {
            width: 100%;
          }

          .theory-card-head {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .theory-controls {
            grid-template-columns: 1fr;
          }

          .calculator-panel {
            padding: 14px;
            border-radius: 20px;
          }

          .calculator-panel-head,
          .calculator-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .calculator-close {
            align-self: flex-end;
          }

          .calculator-layout,
          .calculator-form-grid {
            grid-template-columns: 1fr;
          }

          .section-panel {
            padding: 12px;
            border-radius: 22px;
          }

          .learning-stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .theory-icon {
            display: none;
          }

          .theory-grid {
            grid-template-columns: 1fr;
          }

          .detail-block table,
          .detail-block tbody,
          .detail-block tr,
          .detail-block th,
          .detail-block td {
            display: block;
            width: 100%;
          }

          .detail-block tr {
            display: grid;
            gap: 4px;
            margin-bottom: 8px;
          }

          .smart-tool-top {
            align-items: flex-start;
          }

          .theory-tool-pill {
            align-items: flex-start;
            border-radius: 14px;
            flex-direction: column;
          }

          .theory-tool-pill strong {
            text-align: start;
          }
        }

        @media (max-width: 460px) {
          .learning-stats-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
