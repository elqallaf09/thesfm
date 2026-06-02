'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
import { CardsGrid } from '@/components/layout/LayoutPrimitives';
import { PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { EmptyState } from '@/components/layout/EmptyState';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/lib/useCurrency';
import { formatMoney } from '@/lib/formatMoney';
import { supabase } from '@/integrations/supabase/client';
import { loadUserDataTables, personalExpenseRows, personalIncomeRows, sumAmounts } from '@/lib/data/financeData';
import {
  FINANCIAL_THEORIES,
  FINANCIAL_THEORY_CATEGORIES,
  THEORY_CALCULATORS,
  THEORY_CALCULATOR_TEXT,
  getFinancialTheoryText,
  type FinancialTheory,
  type FinancialTheoryLang,
  type LocalizedText,
  type TheoryCalculatorDefinition,
  type TheoryCalculatorId,
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
    showBest: 'ابدأ بهذه الثلاث',
    searchPlaceholder: 'ابحث عن نظرية مالية...',
    searchLabel: 'بحث في النظريات المالية',
    categories: 'التصنيفات',
    theoryLibrary: 'مكتبة النظريات المالية',
    theoryLibrarySubtitle: 'اختر تصنيفاً أو ابحث عن مفهوم، ثم افتح النظرية التي تريد فهمها بدون إطالة الصفحة.',
    whyTitle: 'لماذا تحتاج إلى فهم النظريات المالية؟',
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
    bestTitle: 'ابدأ بهذه الثلاث',
    bestSubtitle: 'ثلاث نظريات مختصرة تساعدك على البدء دون تكرار بطاقات المكتبة.',
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
    starterTitle: 'ابدأ بهذه الثلاث',
    starterSubtitle: 'ثلاث نظريات قصيرة تمنحك أساسًا واضحًا قبل التوسع في بقية المكتبة.',
    progressText: 'قرأت {completed} من {total}',
    markAsRead: 'تمت القراءة',
    done: 'تمّت',
    educationalDisclaimer: 'هذه أداة تعليمية وليست توصية مالية.',
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
    goalName: 'اسم الهدف',
    targetAmount: 'المبلغ المطلوب',
    currentAmount: 'المبلغ الحالي',
    targetDate: 'التاريخ المستهدف',
    monthsRemaining: 'عدد الأشهر المتبقية',
    monthlyRequired: 'المبلغ المطلوب شهرياً',
    targetDateFuture: 'التاريخ المستهدف يجب أن يكون في المستقبل.',
    goalLooksRealistic: 'الهدف يبدو واقعياً إذا كان هذا المبلغ الشهري مناسباً لميزانيتك.',
    goalNeedsAdjustment: 'الهدف يحتاج مراجعة. جرّب تمديد المدة أو تعديل المبلغ.',
    goalComplete: 'هذا الهدف مكتمل أو أعلى من المطلوب.',
    useCurrentData: 'استخدام بياناتي الحالية',
    manualEntry: 'إدخال يدوي',
    notEnoughData: 'لا توجد بيانات كافية. أدخل القيم يدوياً أو أضف بياناتك في صفحات الدخل والمصروفات.',
    dataLoading: 'جاري تحميل بياناتك...',
    monthlyDebts: 'الديون الشهرية',
    expenseIncomeRatio: 'نسبة المصروفات إلى الدخل',
    savingsRatio: 'نسبة الادخار',
    monthlyCashFlow: 'صافي التدفق الشهري',
    emergencyFundStatus: 'حالة صندوق الطوارئ',
    financialHealthScore: 'درجة الصحة المالية',
    strengths: 'نقاط القوة',
    reviewPoints: 'نقاط تحتاج مراجعة',
    suggestedSteps: 'خطوات مقترحة',
    highExpensesAlert: 'المصروفات عالية مقارنة بالدخل.',
    positiveCashFlow: 'التدفق الشهري موجب.',
    balancedExpenses: 'نسبة المصروفات ضمن نطاق جيد.',
    savingsPresent: 'توجد مدخرات مسجلة.',
    expensesNeedReview: 'راجع المصروفات وحاول خفض البنود غير الأساسية.',
    emergencyNeedsReview: 'صندوق الطوارئ أقل من 3 أشهر من المصروفات.',
    increaseSavingsStep: 'ارفع الادخار تدريجياً حتى يصل إلى 10% - 20% من الدخل.',
    keepTrackingStep: 'استمر في تحديث الدخل والمصروفات شهرياً.',
    monthsCovered: 'أشهر مغطاة',
    startByGoalTitle: 'ابدأ حسب هدفك المالي',
    startByGoalSubtitle: 'اختر هدفاً واحداً لتظهر لك النظريات والأدوات الأقرب إلى احتياجك الحالي.',
    learningLevel: 'مستوى التعلّم',
    featuredTheoryTitle: 'نظرية اليوم',
    featuredTheoryButton: 'طبّقها على وضعي المالي',
    featuredTheoryExample: 'مثال عملي',
    accordionSubtitle: 'افتح التصنيف المناسب، ثم اعرض المزيد عند الحاجة. لا تظهر كل البطاقات دفعة واحدة.',
    showMore: 'عرض المزيد',
    showLess: 'عرض أقل',
    theoriesInside: 'نظرية',
    quickExplanation: 'شرح سريع',
    practicalExampleAction: 'مثال عملي',
    applyTheory: 'طبّقها',
    commonMistake: 'خطأ شائع',
    recommendedTitle: 'مقترح لك حسب وضعك المالي',
    recommendedSubtitle: 'تظهر هذه المقترحات من بياناتك المسجلة فقط، ولا يتم افتراض أي بيانات غير موجودة.',
    recommendationsEmptyTitle: 'لا توجد بيانات مالية كافية بعد',
    recommendationsEmptyBody: 'أضف بياناتك المالية لعرض نظريات مناسبة لوضعك.',
    theoriesReadCount: 'النظريات التي قرأتها',
    toolsUsedCount: 'الأدوات المستخدمة',
    progressRatio: 'نسبة التقدم',
    toolSearchPlaceholder: 'ابحث عن أداة أو حاسبة',
    toolSearchLabel: 'بحث في الأدوات والحاسبات',
    noTools: 'لا توجد أدوات مطابقة.',
    noToolsDescription: 'جرّب بحثاً آخر أو اختر تبويباً مختلفاً.',
  },
  en: {
    title: 'Financial Theories',
    subtitle: 'Learn the key financial concepts clearly, then apply them to your income, expenses, savings, investments, and decisions inside THE SFM.',
    badge: 'Smart Financial Library',
    startNow: 'Start Now',
    exploreTools: 'Explore Smart Tools',
    showBest: 'Start with these three',
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
    bestTitle: 'Start with these three',
    bestSubtitle: 'Three compact theories to start with before exploring the full library.',
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
    starterTitle: 'Start with these three',
    starterSubtitle: 'Three short theories that give you a clear base before exploring the full library.',
    progressText: 'Read {completed} of {total}',
    markAsRead: 'Mark as read',
    done: 'Done',
    educationalDisclaimer: 'This is an educational tool, not financial advice.',
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
    goalName: 'Goal name',
    targetAmount: 'Target amount',
    currentAmount: 'Current amount',
    targetDate: 'Target date',
    monthsRemaining: 'Months remaining',
    monthlyRequired: 'Monthly required amount',
    targetDateFuture: 'Target date must be in the future.',
    goalLooksRealistic: 'The goal looks realistic if this monthly amount fits your budget.',
    goalNeedsAdjustment: 'This goal needs review. Try extending the timeline or adjusting the amount.',
    goalComplete: 'This goal is complete or above the target.',
    useCurrentData: 'Use my current data',
    manualEntry: 'Manual entry',
    notEnoughData: 'There is not enough data. Enter values manually or add your income and expenses data.',
    dataLoading: 'Loading your data...',
    monthlyDebts: 'Monthly debts',
    expenseIncomeRatio: 'Expense-to-income ratio',
    savingsRatio: 'Savings ratio',
    monthlyCashFlow: 'Net monthly cash flow',
    emergencyFundStatus: 'Emergency fund status',
    financialHealthScore: 'Financial health score',
    strengths: 'Strengths',
    reviewPoints: 'Points to review',
    suggestedSteps: 'Suggested steps',
    highExpensesAlert: 'Expenses are high compared with income.',
    positiveCashFlow: 'Monthly cash flow is positive.',
    balancedExpenses: 'Expense ratio is in a good range.',
    savingsPresent: 'Savings are recorded.',
    expensesNeedReview: 'Review expenses and reduce non-essential categories.',
    emergencyNeedsReview: 'Emergency fund is below 3 months of expenses.',
    increaseSavingsStep: 'Increase savings gradually toward 10% - 20% of income.',
    keepTrackingStep: 'Keep updating income and expenses monthly.',
    monthsCovered: 'Months covered',
    startByGoalTitle: 'Start by your financial goal',
    startByGoalSubtitle: 'Choose one goal to see the theories and tools closest to your current need.',
    learningLevel: 'Learning level',
    featuredTheoryTitle: 'Theory of the day',
    featuredTheoryButton: 'Apply it to my financial situation',
    featuredTheoryExample: 'Practical example',
    accordionSubtitle: 'Open the relevant category, then show more when needed. Cards are not all opened at once.',
    showMore: 'Show more',
    showLess: 'Show less',
    theoriesInside: 'theories',
    quickExplanation: 'Quick explanation',
    practicalExampleAction: 'Practical example',
    applyTheory: 'Apply it',
    commonMistake: 'Common mistake',
    recommendedTitle: 'Suggested for your financial situation',
    recommendedSubtitle: 'These suggestions use only your recorded data and do not assume missing information.',
    recommendationsEmptyTitle: 'Not enough financial data yet',
    recommendationsEmptyBody: 'Add your financial data to show theories that fit your situation.',
    theoriesReadCount: 'Theories read',
    toolsUsedCount: 'Tools used',
    progressRatio: 'Progress',
    toolSearchPlaceholder: 'Search for a tool or calculator',
    toolSearchLabel: 'Search tools and calculators',
    noTools: 'No matching tools.',
    noToolsDescription: 'Try another search or choose a different tab.',
  },
  fr: {
    title: 'Théories financières',
    subtitle: 'Apprenez clairement les concepts financiers clés, puis appliquez-les à vos revenus, dépenses, épargne, investissements et décisions dans THE SFM.',
    badge: 'Bibliothèque financière intelligente',
    startNow: 'Commencer',
    exploreTools: 'Explorer les outils',
    showBest: 'Commencez par ces trois',
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
    bestTitle: 'Commencez par ces trois',
    bestSubtitle: 'Trois théories compactes pour commencer avant d’explorer toute la bibliothèque.',
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
    starterTitle: 'Commencez par ces trois',
    starterSubtitle: 'Trois théories courtes qui donnent une base claire avant d’explorer toute la bibliothèque.',
    progressText: 'Lu {completed} sur {total}',
    markAsRead: 'Marquer comme lu',
    done: 'Terminé',
    educationalDisclaimer: 'Cet outil est éducatif et ne constitue pas un conseil financier.',
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
    goalName: 'Nom de l’objectif',
    targetAmount: 'Montant cible',
    currentAmount: 'Montant actuel',
    targetDate: 'Date cible',
    monthsRemaining: 'Mois restants',
    monthlyRequired: 'Montant mensuel requis',
    targetDateFuture: 'La date cible doit être dans le futur.',
    goalLooksRealistic: 'L’objectif semble réaliste si ce montant mensuel convient à votre budget.',
    goalNeedsAdjustment: 'Cet objectif doit être revu. Essayez de prolonger le délai ou d’ajuster le montant.',
    goalComplete: 'Cet objectif est atteint ou supérieur à la cible.',
    useCurrentData: 'Utiliser mes données actuelles',
    manualEntry: 'Saisie manuelle',
    notEnoughData: 'Données insuffisantes. Saisissez les valeurs manuellement ou ajoutez revenus et dépenses.',
    dataLoading: 'Chargement de vos données...',
    monthlyDebts: 'Dettes mensuelles',
    expenseIncomeRatio: 'Ratio dépenses / revenus',
    savingsRatio: 'Taux d’épargne',
    monthlyCashFlow: 'Flux mensuel net',
    emergencyFundStatus: 'État du fonds d’urgence',
    financialHealthScore: 'Score de santé financière',
    strengths: 'Points forts',
    reviewPoints: 'Points à revoir',
    suggestedSteps: 'Étapes suggérées',
    highExpensesAlert: 'Les dépenses sont élevées par rapport aux revenus.',
    positiveCashFlow: 'Le flux mensuel est positif.',
    balancedExpenses: 'Le ratio de dépenses est dans une bonne zone.',
    savingsPresent: 'Une épargne est enregistrée.',
    expensesNeedReview: 'Revoyez les dépenses et réduisez les catégories non essentielles.',
    emergencyNeedsReview: 'Le fonds d’urgence couvre moins de 3 mois de dépenses.',
    increaseSavingsStep: 'Augmentez progressivement l’épargne vers 10 % - 20 % du revenu.',
    keepTrackingStep: 'Continuez à mettre à jour revenus et dépenses chaque mois.',
    monthsCovered: 'Mois couverts',
    startByGoalTitle: 'Commencez selon votre objectif financier',
    startByGoalSubtitle: 'Choisissez un objectif pour afficher les théories et outils les plus proches de votre besoin actuel.',
    learningLevel: 'Niveau d’apprentissage',
    featuredTheoryTitle: 'Théorie du jour',
    featuredTheoryButton: 'L’appliquer à ma situation financière',
    featuredTheoryExample: 'Exemple pratique',
    accordionSubtitle: 'Ouvrez la catégorie utile, puis affichez davantage si nécessaire. Toutes les cartes ne sont pas ouvertes à la fois.',
    showMore: 'Afficher plus',
    showLess: 'Afficher moins',
    theoriesInside: 'théories',
    quickExplanation: 'Explication rapide',
    practicalExampleAction: 'Exemple pratique',
    applyTheory: 'Appliquer',
    commonMistake: 'Erreur courante',
    recommendedTitle: 'Suggéré selon votre situation financière',
    recommendedSubtitle: 'Ces suggestions utilisent uniquement vos données enregistrées et ne supposent aucune donnée manquante.',
    recommendationsEmptyTitle: 'Données financières insuffisantes',
    recommendationsEmptyBody: 'Ajoutez vos données financières pour afficher des théories adaptées à votre situation.',
    theoriesReadCount: 'Théories lues',
    toolsUsedCount: 'Outils utilisés',
    progressRatio: 'Progression',
    toolSearchPlaceholder: 'Rechercher un outil ou un calculateur',
    toolSearchLabel: 'Rechercher des outils et calculateurs',
    noTools: 'Aucun outil correspondant.',
    noToolsDescription: 'Essayez une autre recherche ou choisissez un autre onglet.',
  },
};

const THEORY_PROGRESS_STORAGE_KEY = 'sfm:financial-theories:read';
const TOOL_PROGRESS_STORAGE_KEY = 'sfm:financial-theories:tools-used';

type LearningGoalId = 'spending' | 'saving' | 'debt' | 'investing' | 'emergency' | 'freedom';
type LearningLevelId = 'beginner' | 'intermediate' | 'advanced';
type LearningSectionId = 'budget-basics' | 'saving-emergency' | 'investing' | 'debt-risk' | 'long-planning' | 'freedom';
type GuidedToolCategoryId = 'all' | 'budget' | 'saving' | 'debt' | 'investing' | 'risk';

const LEARNING_GOALS: Array<{
  id: LearningGoalId;
  label: LocalizedText;
  description: LocalizedText;
  theoryIds: string[];
  toolIds: TheoryCalculatorId[];
}> = [
  {
    id: 'spending',
    label: { ar: 'تنظيم المصروفات', en: 'Organize expenses', fr: 'Organiser les dépenses' },
    description: { ar: 'ابدأ من الميزانية وفهم أثر القرارات اليومية.', en: 'Start with budgeting and daily decision impact.', fr: 'Commencez par le budget et l’effet des décisions quotidiennes.' },
    theoryIds: ['personal-budgeting', 'pay-yourself-first', 'lifestyle-inflation', 'opportunity-cost'],
    toolIds: ['financial-health', 'salary-split', 'affordability', 'opportunity-cost'],
  },
  {
    id: 'saving',
    label: { ar: 'الادخار', en: 'Saving', fr: 'Épargne' },
    description: { ar: 'ابنِ عادة ادخار واضحة قبل التوسع في قرارات أكبر.', en: 'Build a clear saving habit before larger decisions.', fr: 'Construisez une habitude d’épargne claire avant les grandes décisions.' },
    theoryIds: ['pay-yourself-first', 'personal-budgeting', 'smart-goals', 'compound-interest'],
    toolIds: ['salary-split', 'goal-plan', 'compound-interest', 'financial-health'],
  },
  {
    id: 'debt',
    label: { ar: 'سداد الديون', en: 'Pay down debt', fr: 'Rembourser les dettes' },
    description: { ar: 'ركّز على الديون والمخاطر والسيولة قبل إضافة التزامات جديدة.', en: 'Focus on debt, risk, and liquidity before adding commitments.', fr: 'Concentrez-vous sur dette, risque et liquidité avant de nouveaux engagements.' },
    theoryIds: ['reduce-bad-debt', 'personal-budgeting', 'risk-return', 'liquidity'],
    toolIds: ['debt-plan', 'debt-payoff', 'loan-financing', 'financial-health'],
  },
  {
    id: 'investing',
    label: { ar: 'الاستثمار', en: 'Investing', fr: 'Investissement' },
    description: { ar: 'ابدأ بالمفاهيم الأساسية قبل المخاطر المتقدمة.', en: 'Start with core concepts before advanced risk topics.', fr: 'Commencez par les bases avant les risques avancés.' },
    theoryIds: ['diversification', 'compound-interest', 'time-value-money', 'risk-return', 'long-term-investing'],
    toolIds: ['compound-interest', 'risk-tolerance', 'opportunity-cost', 'retirement-fire'],
  },
  {
    id: 'emergency',
    label: { ar: 'صندوق الطوارئ', en: 'Emergency fund', fr: 'Fonds d’urgence' },
    description: { ar: 'جهّز حماية مالية قبل القرارات طويلة المدى.', en: 'Build financial protection before long-term decisions.', fr: 'Préparez une protection financière avant les décisions longues.' },
    theoryIds: ['emergency-fund', 'personal-budgeting', 'pay-yourself-first', 'liquidity'],
    toolIds: ['emergency-fund', 'financial-health', 'salary-split', 'goal-plan'],
  },
  {
    id: 'freedom',
    label: { ar: 'الحرية المالية', en: 'Financial freedom', fr: 'Liberté financière' },
    description: { ar: 'اربط الادخار، الاستثمار، والدخل المتعدد في مسار طويل المدى.', en: 'Connect saving, investing, and income streams for the long term.', fr: 'Reliez épargne, investissement et revenus multiples à long terme.' },
    theoryIds: ['financial-freedom', 'multiple-income-streams', 'long-term-investing', 'compound-interest', 'smart-goals'],
    toolIds: ['retirement-fire', 'compound-interest', 'goal-plan', 'financial-health'],
  },
];

const LEARNING_LEVELS: Array<{ id: LearningLevelId; label: LocalizedText; description: LocalizedText }> = [
  {
    id: 'beginner',
    label: { ar: 'مبتدئ', en: 'Beginner', fr: 'Débutant' },
    description: { ar: 'مفاهيم تأسيسية وسهلة التطبيق.', en: 'Foundational concepts that are easy to apply.', fr: 'Concepts de base faciles à appliquer.' },
  },
  {
    id: 'intermediate',
    label: { ar: 'متوسط', en: 'Intermediate', fr: 'Intermédiaire' },
    description: { ar: 'مفاهيم تربط التخطيط بالقرارات.', en: 'Concepts that connect planning to decisions.', fr: 'Concepts reliant planification et décisions.' },
  },
  {
    id: 'advanced',
    label: { ar: 'متقدم', en: 'Advanced', fr: 'Avancé' },
    description: { ar: 'مخاطر، استثمار، وتخطيط طويل المدى.', en: 'Risk, investing, and long-term planning.', fr: 'Risque, investissement et planification longue.' },
  },
];

const LEVEL_ORDER: Record<LearningLevelId, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const THEORY_LEVELS: Record<string, LearningLevelId> = {
  'personal-budgeting': 'beginner',
  'pay-yourself-first': 'beginner',
  'emergency-fund': 'beginner',
  'smart-goals': 'beginner',
  diversification: 'beginner',
  'compound-interest': 'beginner',
  'reduce-bad-debt': 'beginner',
  'multiple-income-streams': 'intermediate',
  'lifestyle-inflation': 'intermediate',
  liquidity: 'intermediate',
  'opportunity-cost': 'intermediate',
  'time-value-money': 'intermediate',
  'risk-return': 'advanced',
  'long-term-investing': 'advanced',
  'financial-freedom': 'advanced',
};

const LEARNING_SECTIONS: Array<{
  id: LearningSectionId;
  title: LocalizedText;
  description: LocalizedText;
  theoryIds: string[];
}> = [
  {
    id: 'budget-basics',
    title: { ar: 'أساسيات الميزانية', en: 'Budgeting foundations', fr: 'Bases du budget' },
    description: { ar: 'ابدأ بتنظيم الدخل والمصروفات والعادات اليومية.', en: 'Start with income, expenses, and daily habits.', fr: 'Commencez par revenus, dépenses et habitudes.' },
    theoryIds: ['personal-budgeting', 'pay-yourself-first', 'lifestyle-inflation'],
  },
  {
    id: 'saving-emergency',
    title: { ar: 'الادخار والطوارئ', en: 'Saving and emergencies', fr: 'Épargne et urgences' },
    description: { ar: 'ابنِ احتياطاً مالياً قبل القرارات الكبيرة.', en: 'Build a reserve before large decisions.', fr: 'Construisez une réserve avant les grandes décisions.' },
    theoryIds: ['emergency-fund', 'liquidity'],
  },
  {
    id: 'investing',
    title: { ar: 'الاستثمار', en: 'Investing', fr: 'Investissement' },
    description: { ar: 'افهم النمو، التنويع، والقيمة الزمنية للنقود.', en: 'Understand growth, diversification, and time value.', fr: 'Comprenez croissance, diversification et valeur temps.' },
    theoryIds: ['compound-interest', 'diversification', 'time-value-money', 'long-term-investing'],
  },
  {
    id: 'debt-risk',
    title: { ar: 'الديون والمخاطر', en: 'Debt and risk', fr: 'Dette et risque' },
    description: { ar: 'راجع أثر الالتزامات والمخاطر على خطتك.', en: 'Review how commitments and risk affect your plan.', fr: 'Analysez l’effet des engagements et risques.' },
    theoryIds: ['risk-return', 'reduce-bad-debt'],
  },
  {
    id: 'long-planning',
    title: { ar: 'التخطيط طويل المدى', en: 'Long-term planning', fr: 'Planification longue' },
    description: { ar: 'حوّل الأهداف والفرص إلى مسار قابل للمتابعة.', en: 'Turn goals and tradeoffs into a trackable path.', fr: 'Transformez objectifs et arbitrages en parcours suivi.' },
    theoryIds: ['multiple-income-streams', 'smart-goals', 'opportunity-cost'],
  },
  {
    id: 'freedom',
    title: { ar: 'الحرية المالية', en: 'Financial freedom', fr: 'Liberté financière' },
    description: { ar: 'اجمع الدخل، الادخار، والاستثمار ضمن هدف طويل المدى.', en: 'Connect income, saving, and investing to a long-term goal.', fr: 'Reliez revenu, épargne et investissement à long terme.' },
    theoryIds: ['financial-freedom'],
  },
];

const GUIDED_TOOL_TABS: Array<{ id: GuidedToolCategoryId; label: LocalizedText; toolIds: TheoryCalculatorId[] }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' }, toolIds: THEORY_CALCULATORS.map(tool => tool.id) },
  { id: 'budget', label: { ar: 'الميزانية', en: 'Budget', fr: 'Budget' }, toolIds: ['financial-health', 'salary-split', 'affordability'] },
  { id: 'saving', label: { ar: 'الادخار', en: 'Saving', fr: 'Épargne' }, toolIds: ['goal-plan', 'emergency-fund', 'compound-interest'] },
  { id: 'debt', label: { ar: 'الديون', en: 'Debt', fr: 'Dette' }, toolIds: ['debt-plan', 'debt-payoff', 'loan-financing'] },
  { id: 'investing', label: { ar: 'الاستثمار', en: 'Investing', fr: 'Investissement' }, toolIds: ['compound-interest', 'risk-tolerance', 'opportunity-cost', 'retirement-fire'] },
  { id: 'risk', label: { ar: 'المخاطر', en: 'Risk', fr: 'Risque' }, toolIds: ['risk-tolerance', 'financial-health', 'rent-vs-buy', 'affordability'] },
];

function localeFrom(value: string): FinancialTheoryLang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function buildProgressText(template: string, completed: number, total: number) {
  return template
    .replace('{completed}', completed.toString())
    .replace('{total}', total.toString());
}

function readProgressFromStorage() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(THEORY_PROGRESS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function saveProgressToStorage(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEORY_PROGRESS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

function readToolProgressFromStorage() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(TOOL_PROGRESS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function saveToolProgressToStorage(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOOL_PROGRESS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

function relatedTheory(id: string) {
  return FINANCIAL_THEORIES.find(theory => theory.id === id);
}

function theoryLevel(theory: FinancialTheory): LearningLevelId {
  return THEORY_LEVELS[theory.id] ?? 'intermediate';
}

function levelAllows(theory: FinancialTheory, activeLevel: LearningLevelId) {
  return LEVEL_ORDER[theoryLevel(theory)] <= LEVEL_ORDER[activeLevel];
}

function theoryMatchesQuery(theory: FinancialTheory, locale: FinancialTheoryLang, normalizedQuery: string) {
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
}

function commonMistakeCopy(theory: FinancialTheory, lang: FinancialTheoryLang) {
  const category = theory.category;
  if (lang === 'en') {
    if (category === 'investing') return 'Applying the idea without checking risk, time horizon, and available cash first.';
    if (category === 'debt-risk') return 'Treating the concept as a quick fix instead of linking it to a repayment or protection plan.';
    if (category === 'financial-freedom') return 'Looking only at the final target and ignoring monthly habits and consistency.';
    return 'Knowing the rule but not updating real income, expenses, and savings regularly.';
  }
  if (lang === 'fr') {
    if (category === 'investing') return 'Appliquer l’idée sans vérifier d’abord le risque, l’horizon et la liquidité disponible.';
    if (category === 'debt-risk') return 'Traiter le concept comme une solution rapide au lieu de le lier à un plan de remboursement ou de protection.';
    if (category === 'financial-freedom') return 'Regarder uniquement l’objectif final en oubliant les habitudes mensuelles et la régularité.';
    return 'Connaître la règle sans mettre à jour régulièrement les revenus, dépenses et économies réels.';
  }
  if (category === 'investing') return 'تطبيق الفكرة دون مراجعة المخاطر، المدة الزمنية، والسيولة المتاحة أولاً.';
  if (category === 'debt-risk') return 'اعتبار المفهوم حلاً سريعاً بدلاً من ربطه بخطة سداد أو حماية واضحة.';
  if (category === 'financial-freedom') return 'التركيز على الهدف النهائي فقط وتجاهل العادات الشهرية والاستمرارية.';
  return 'معرفة القاعدة دون تحديث الدخل والمصروفات والمدخرات الفعلية بانتظام.';
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

type CalculatorId = Exclude<TheoryCalculatorId, 'zakat-shortcut'>;

type FinancialHealthSnapshot = {
  income: number;
  expenses: number;
  savings: number;
  debts: number;
  hasIncome: boolean;
  hasExpenses: boolean;
  hasSavings: boolean;
  isLoading: boolean;
  error: string | null;
};

const ACTIVE_CALCULATORS = new Set<string>(
  THEORY_CALCULATORS.filter(tool => !tool.href).map(tool => tool.id),
);
const HEALTH_DATA_TABLES = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'savings', table: 'savings_items' },
];

const EMPTY_HEALTH_SNAPSHOT: FinancialHealthSnapshot = {
  income: 0,
  expenses: 0,
  savings: 0,
  debts: 0,
  hasIncome: false,
  hasExpenses: false,
  hasSavings: false,
  isLoading: false,
  error: null,
};

const THEORY_CALCULATOR_MAP: Record<string, CalculatorId> = {
  'compound-interest': 'compound-interest',
  'time-value-money': 'compound-interest',
  'long-term-investing': 'retirement-fire',
  'financial-freedom': 'retirement-fire',
  'opportunity-cost': 'opportunity-cost',
  'reduce-bad-debt': 'debt-payoff',
  'risk-return': 'risk-tolerance',
  diversification: 'risk-tolerance',
  liquidity: 'rent-vs-buy',
  'personal-budgeting': 'affordability',
};

function isCalculatorId(value: string): value is CalculatorId {
  return ACTIVE_CALCULATORS.has(value);
}

function calculatorForTheory(theory: FinancialTheory): CalculatorId | null {
  return THEORY_CALCULATOR_MAP[theory.id] ?? null;
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

function monthsUntil(targetDate: string) {
  if (!targetDate) return 0;
  const target = new Date(`${targetDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30.4375)));
}

function formatPercent(value: number, lang: FinancialTheoryLang) {
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Number.isFinite(value) ? value : 0) + '%';
}

function ratioPercent(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function financialHealthScore(income: number, expenses: number, savings: number, debts: number) {
  if (income <= 0) return 0;
  const expenseRatio = (expenses + debts) / income;
  const savingsRatio = savings / income;
  const netCashFlow = income - expenses - debts;
  const emergencyMonths = expenses > 0 ? savings / expenses : 0;
  return clampScore(
    25 +
    (expenseRatio <= 0.6 ? 25 : expenseRatio <= 0.8 ? 15 : 5) +
    (savingsRatio >= 0.2 ? 20 : savingsRatio >= 0.1 ? 12 : savingsRatio > 0 ? 6 : 0) +
    (netCashFlow > 0 ? 20 : 0) +
    (emergencyMonths >= 3 ? 10 : emergencyMonths >= 1 ? 5 : 0)
  );
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

type DebtRow = { id: string; name: string; balance: string; rate: string; minimum: string };

function positiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function hasPositive(value: number | null) {
  return value !== null && value > 0;
}

function monthlyPaymentForPrincipal(principal: number, annualRate: number, months: number) {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = Math.max(0, annualRate) / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}

function futureValue(initial: number, monthly: number, annualReturn: number, years: number) {
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = Math.max(0, annualReturn) / 100 / 12;
  if (monthlyRate === 0) return initial + monthly * months;
  return initial * Math.pow(1 + monthlyRate, months) + monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

function principalFromPayment(payment: number, annualRate: number, months: number) {
  if (payment <= 0 || months <= 0) return 0;
  const monthlyRate = Math.max(0, annualRate) / 100 / 12;
  if (monthlyRate === 0) return payment * months;
  return payment * (1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate;
}

function formatDuration(months: number, copy: Record<string, string>) {
  const rounded = Math.max(0, Math.ceil(months));
  if (rounded < 12) return `${rounded} ${copy.months}`;
  const years = rounded / 12;
  return `${years.toFixed(years >= 10 ? 0 : 1)} ${copy.yearsUnit}`;
}

function riskLabel(value: 'low' | 'medium' | 'high', copy: Record<string, string>) {
  if (value === 'low') return copy.low;
  if (value === 'medium') return copy.medium;
  return copy.high;
}

function simulateDebtPayoff(rows: DebtRow[], extraPayment: number, strategy: 'snowball' | 'avalanche') {
  const debts = rows
    .map((row, index) => ({
      id: row.id,
      index,
      name: row.name || `#${index + 1}`,
      balance: positiveNumber(row.balance) ?? 0,
      rate: positiveNumber(row.rate) ?? 0,
      minimum: positiveNumber(row.minimum) ?? 0,
    }))
    .filter(debt => debt.balance > 0 && debt.minimum > 0);

  if (debts.length === 0) return null;

  let months = 0;
  let totalInterest = 0;
  let rollingExtra = Math.max(0, extraPayment);
  const activeDebts = debts.map(debt => ({ ...debt }));

  while (activeDebts.some(debt => debt.balance > 0.005) && months < 1200) {
    months += 1;
    let freedMinimums = 0;
    activeDebts.forEach(debt => {
      if (debt.balance <= 0) return;
      const interest = debt.balance * (debt.rate / 100 / 12);
      debt.balance += interest;
      totalInterest += interest;
      const basePayment = Math.min(debt.balance, debt.minimum);
      debt.balance -= basePayment;
      if (debt.balance <= 0.005) {
        freedMinimums += debt.minimum;
        debt.balance = 0;
      }
    });

    rollingExtra += freedMinimums;
    const target = activeDebts
      .filter(debt => debt.balance > 0.005)
      .sort((a, b) => strategy === 'snowball' ? a.balance - b.balance : b.rate - a.rate)[0];
    if (target && rollingExtra > 0) {
      const extra = Math.min(target.balance, rollingExtra);
      target.balance -= extra;
      if (target.balance <= 0.005) target.balance = 0;
    }
  }

  return { months, totalInterest, stalled: months >= 1200 };
}

function ResultSection({
  copy,
  children,
  summary,
  interpretation,
  theory,
}: {
  copy: Record<string, string>;
  children: ReactNode;
  summary: string;
  interpretation: string;
  theory: string;
}) {
  return (
    <div className="calculator-results" role="status" aria-live="polite">
      <div className="calculator-list-card">
        <strong>{copy.inputSummary}</strong>
        <p>{summary}</p>
      </div>
      <div className="calculator-result-group">
        <strong>{copy.result}</strong>
        <div className="calculator-result-grid">{children}</div>
      </div>
      <div className="calculator-list-card">
        <strong>{copy.theoryConnection}</strong>
        <p>{theory}</p>
      </div>
      <div className="calculator-list-card">
        <strong>{copy.practicalInterpretation}</strong>
        <p>{interpretation}</p>
      </div>
      <p className="calculator-note">{copy.disclaimer}</p>
    </div>
  );
}

function SmartCalculatorPanel({
  activeId,
  tool,
  lang,
  defaultCurrency,
  healthSnapshot,
  onClose,
}: {
  activeId: CalculatorId;
  tool: TheoryCalculatorDefinition;
  lang: FinancialTheoryLang;
  defaultCurrency: string;
  healthSnapshot: FinancialHealthSnapshot;
  onClose: () => void;
}) {
  const copy = THEORY_CALCULATOR_TEXT[lang];
  const [currency, setCurrency] = useState(defaultCurrency);
  const [compound, setCompound] = useState({ initial: '', monthly: '', returnRate: '', years: '' });
  const [loan, setLoan] = useState({ amount: '', rate: '', months: '', income: '' });
  const [fire, setFire] = useState({ savings: '', monthly: '', returnRate: '', spending: '', swr: '4' });
  const [rentBuy, setRentBuy] = useState({ assetType: 'home', price: '', down: '', rate: '', termYears: '', rent: '', maintenance: '', fees: '', returnRate: '', years: '' });
  const [affordability, setAffordability] = useState({ income: '', fixed: '', debts: '', purchase: '', down: '', termYears: '', rate: '' });
  const [opportunity, setOpportunity] = useState({ amount: '', returnRate: '', years: '', monthly: '' });
  const [debtRows, setDebtRows] = useState<DebtRow[]>([{ id: 'debt-1', name: '', balance: '', rate: '', minimum: '' }]);
  const [debtExtra, setDebtExtra] = useState('');
  const [riskAnswers, setRiskAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function money(amount: number) {
    return formatMoney(Number.isFinite(amount) ? amount : 0, currency || 'KWD', lang);
  }

  function reset() {
    setCurrency(defaultCurrency);
    setCompound({ initial: '', monthly: '', returnRate: '', years: '' });
    setLoan({ amount: '', rate: '', months: '', income: '' });
    setFire({ savings: '', monthly: '', returnRate: '', spending: '', swr: '4' });
    setRentBuy({ assetType: 'home', price: '', down: '', rate: '', termYears: '', rent: '', maintenance: '', fees: '', returnRate: '', years: '' });
    setAffordability({ income: '', fixed: '', debts: '', purchase: '', down: '', termYears: '', rate: '' });
    setOpportunity({ amount: '', returnRate: '', years: '', monthly: '' });
    setDebtRows([{ id: 'debt-1', name: '', balance: '', rate: '', minimum: '' }]);
    setDebtExtra('');
    setRiskAnswers({});
  }

  function prefillIncome() {
    if (!healthSnapshot.hasIncome) return;
    const income = String(Math.round(healthSnapshot.income * 100) / 100);
    setLoan(prev => ({ ...prev, income }));
    setAffordability(prev => ({
      ...prev,
      income,
      fixed: healthSnapshot.hasExpenses ? String(Math.round(healthSnapshot.expenses * 100) / 100) : prev.fixed,
    }));
  }

  const relatedTheoryText = tool.relatedTheories.map(item => getFinancialTheoryText(item, lang)).join(' · ');
  const compoundValues = {
    initial: positiveNumber(compound.initial),
    monthly: positiveNumber(compound.monthly),
    returnRate: positiveNumber(compound.returnRate),
    years: positiveNumber(compound.years),
  };
  const compoundReady = compoundValues.initial !== null && compoundValues.monthly !== null && compoundValues.returnRate !== null && hasPositive(compoundValues.years);
  const compoundFinal = compoundReady ? futureValue(compoundValues.initial!, compoundValues.monthly!, compoundValues.returnRate!, compoundValues.years!) : 0;
  const compoundContributions = compoundReady ? compoundValues.initial! + compoundValues.monthly! * compoundValues.years! * 12 : 0;

  const loanPrincipal = positiveNumber(loan.amount);
  const loanRate = positiveNumber(loan.rate);
  const loanMonths = positiveNumber(loan.months);
  const loanIncome = positiveNumber(loan.income);
  const loanReady = hasPositive(loanPrincipal) && loanRate !== null && hasPositive(loanMonths) && hasPositive(loanIncome);
  const loanPayment = loanReady ? monthlyPaymentForPrincipal(loanPrincipal!, loanRate!, loanMonths!) : 0;
  const loanTotal = loanPayment * (loanMonths ?? 0);
  const loanDti = loanReady ? ratioPercent(loanPayment, loanIncome!) : 0;
  const loanRisk = loanDti <= 25 ? 'low' : loanDti <= 40 ? 'medium' : 'high';

  const fireSavings = positiveNumber(fire.savings);
  const fireMonthly = positiveNumber(fire.monthly);
  const fireReturn = positiveNumber(fire.returnRate);
  const fireSpending = positiveNumber(fire.spending);
  const fireSwr = positiveNumber(fire.swr);
  const fireReady = fireSavings !== null && fireMonthly !== null && fireReturn !== null && hasPositive(fireSpending) && hasPositive(fireSwr);
  const fireTarget = fireReady ? fireSpending! * 12 / (fireSwr! / 100) : 0;
  let fireMonths = 0;
  if (fireReady && fireTarget > fireSavings!) {
    let balance = fireSavings!;
    const monthlyRate = fireReturn! / 100 / 12;
    while (balance < fireTarget && fireMonths < 1200) {
      balance = balance * (1 + monthlyRate) + fireMonthly!;
      fireMonths += 1;
    }
  }
  const fifteenYearRate = fireReady ? fireReturn! / 100 / 12 : 0;
  const fifteenYearMonths = 180;
  const suggestedFireMonthly = fireReady && fireTarget > 0
    ? Math.max(0, (fireTarget - fireSavings! * Math.pow(1 + fifteenYearRate, fifteenYearMonths)) * (fifteenYearRate || 1 / fifteenYearMonths) / (fifteenYearRate ? Math.pow(1 + fifteenYearRate, fifteenYearMonths) - 1 : 1))
    : 0;

  const rentBuyNumbers = {
    price: positiveNumber(rentBuy.price),
    down: positiveNumber(rentBuy.down),
    rate: positiveNumber(rentBuy.rate),
    termYears: positiveNumber(rentBuy.termYears),
    rent: positiveNumber(rentBuy.rent),
    maintenance: positiveNumber(rentBuy.maintenance),
    fees: positiveNumber(rentBuy.fees),
    returnRate: positiveNumber(rentBuy.returnRate),
    years: positiveNumber(rentBuy.years),
  };
  const rentBuyReady = hasPositive(rentBuyNumbers.price) && rentBuyNumbers.down !== null && rentBuyNumbers.rate !== null && hasPositive(rentBuyNumbers.termYears) && hasPositive(rentBuyNumbers.rent) && rentBuyNumbers.maintenance !== null && rentBuyNumbers.fees !== null && rentBuyNumbers.returnRate !== null && hasPositive(rentBuyNumbers.years);
  const buyMonths = rentBuyReady ? Math.min(rentBuyNumbers.years! * 12, rentBuyNumbers.termYears! * 12) : 0;
  const buyPayment = rentBuyReady ? monthlyPaymentForPrincipal(Math.max(0, rentBuyNumbers.price! - rentBuyNumbers.down!), rentBuyNumbers.rate!, rentBuyNumbers.termYears! * 12) : 0;
  const buyingCost = rentBuyReady ? rentBuyNumbers.down! + buyPayment * buyMonths + (rentBuyNumbers.maintenance! + rentBuyNumbers.fees!) * rentBuyNumbers.years! * 12 : 0;
  const rentingCost = rentBuyReady ? rentBuyNumbers.rent! * rentBuyNumbers.years! * 12 : 0;
  const rentOpportunityCost = rentBuyReady ? Math.max(0, futureValue(rentBuyNumbers.down!, 0, rentBuyNumbers.returnRate!, rentBuyNumbers.years!) - rentBuyNumbers.down!) : 0;
  const rentDifference = buyingCost + rentOpportunityCost - rentingCost;
  const rentRecommendation = rentDifference < -rentingCost * 0.05 ? copy.buy : rentDifference > rentingCost * 0.05 ? copy.rent : copy.neutral;

  const affordableNumbers = {
    income: positiveNumber(affordability.income),
    fixed: positiveNumber(affordability.fixed),
    debts: positiveNumber(affordability.debts),
    purchase: positiveNumber(affordability.purchase),
    down: positiveNumber(affordability.down),
    termYears: positiveNumber(affordability.termYears),
    rate: positiveNumber(affordability.rate),
  };
  const affordabilityReady = hasPositive(affordableNumbers.income) && affordableNumbers.fixed !== null && affordableNumbers.debts !== null && hasPositive(affordableNumbers.purchase) && affordableNumbers.down !== null && hasPositive(affordableNumbers.termYears) && affordableNumbers.rate !== null;
  const affordabilityPayment = affordabilityReady ? monthlyPaymentForPrincipal(Math.max(0, affordableNumbers.purchase! - affordableNumbers.down!), affordableNumbers.rate!, affordableNumbers.termYears! * 12) : 0;
  const remainingCashFlow = affordabilityReady ? affordableNumbers.income! - affordableNumbers.fixed! - affordableNumbers.debts! - affordabilityPayment : 0;
  const affordabilityDti = affordabilityReady ? ratioPercent(affordableNumbers.debts! + affordabilityPayment, affordableNumbers.income!) : 0;
  const affordableRisk = affordabilityDti <= 35 ? 'low' : affordabilityDti <= 45 ? 'medium' : 'high';
  const affordableLimit = affordabilityReady ? principalFromPayment(Math.max(0, affordableNumbers.income! * 0.35 - affordableNumbers.debts!), affordableNumbers.rate!, affordableNumbers.termYears! * 12) + affordableNumbers.down! : 0;
  const affordabilityRecommendation = !affordabilityReady ? '' : affordabilityDti <= 35 && remainingCashFlow > 0 ? copy.affordable : affordabilityDti <= 45 && remainingCashFlow >= 0 ? copy.borderline : copy.notRecommended;

  const opportunityAmount = positiveNumber(opportunity.amount);
  const opportunityReturn = positiveNumber(opportunity.returnRate);
  const opportunityYears = positiveNumber(opportunity.years);
  const opportunityMonthly = positiveNumber(opportunity.monthly);
  const opportunityReady = hasPositive(opportunityAmount) && opportunityReturn !== null && hasPositive(opportunityYears) && opportunityMonthly !== null;
  const opportunityFuture = opportunityReady ? futureValue(opportunityAmount!, opportunityMonthly!, opportunityReturn!, opportunityYears!) : 0;
  const opportunityContributions = opportunityReady ? opportunityAmount! + opportunityMonthly! * opportunityYears! * 12 : 0;

  const extraPayment = positiveNumber(debtExtra) ?? 0;
  const snowballResult = simulateDebtPayoff(debtRows, extraPayment, 'snowball');
  const avalancheResult = simulateDebtPayoff(debtRows, extraPayment, 'avalanche');
  const debtReady = Boolean(snowballResult && avalancheResult && !snowballResult.stalled && !avalancheResult.stalled);
  const debtRecommended = debtReady && avalancheResult!.totalInterest <= snowballResult!.totalInterest ? copy.avalanche : copy.snowball;

  const riskQuestions = [
    { id: 'goal', label: copy.questionGoal, answers: [[copy.answerSafety, 1], [copy.answerBalance, 2], [copy.answerGrowth, 3], [copy.answerMaxGrowth, 4]] },
    { id: 'horizon', label: copy.questionHorizon, answers: [[copy.answerShort, 1], [copy.answerMedium, 2], [copy.answerLong, 3], [copy.answerVeryLong, 4]] },
    { id: 'loss', label: copy.questionLoss, answers: [[copy.answerSell, 1], [copy.answerWait, 2], [copy.answerBuyMore, 4]] },
    { id: 'emergency', label: copy.questionEmergency, answers: [[copy.answerNone, 1], [copy.answerPartial, 2], [copy.answerStrong, 4]] },
    { id: 'income', label: copy.questionIncome, answers: [[copy.answerUnstable, 1], [copy.answerStable, 3], [copy.answerVeryStable, 4]] },
    { id: 'experience', label: copy.questionExperience, answers: [[copy.answerBeginner, 1], [copy.answerSome, 3], [copy.answerAdvanced, 4]] },
    { id: 'preference', label: copy.questionPreference, answers: [[copy.answerSafety, 1], [copy.answerBalance, 2], [copy.answerGrowth, 3], [copy.answerMaxGrowth, 4]] },
    { id: 'liquidity', label: copy.questionLiquidity, answers: [[copy.answerNeedLiquidity, 1], [copy.answerBalance, 2], [copy.answerCanLock, 4]] },
  ] as const;
  const riskReady = riskQuestions.every(question => riskAnswers[question.id]);
  const riskScore = riskReady ? riskQuestions.reduce((total, question) => total + Number(riskAnswers[question.id]), 0) / riskQuestions.length : 0;
  const riskProfile = riskScore <= 1.75 ? copy.conservative : riskScore <= 2.5 ? copy.balanced : riskScore <= 3.25 ? copy.growth : copy.aggressive;
  const riskAllocation = riskScore <= 1.75 ? copy.allocationConservative : riskScore <= 2.5 ? copy.allocationBalanced : riskScore <= 3.25 ? copy.allocationGrowth : copy.allocationAggressive;

  return (
    <section className="calculator-panel" aria-labelledby="smart-calculator-title">
      <div className="calculator-panel-head">
        <div>
          <span>{copy.calculatorTitle}</span>
          <h3 id="smart-calculator-title">{getFinancialTheoryText(tool.title, lang)}</h3>
          <p>{copy.calculatorIntro}</p>
        </div>
        <button type="button" className="calculator-close" onClick={onClose} aria-label={copy.close}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="calculator-layout">
        <div className="calculator-form-grid">
          {activeId !== 'risk-tolerance' ? (
            <CurrencySelect value={currency} onChange={setCurrency} lang={lang} label={copy.currency} ariaLabel={copy.currency} />
          ) : null}

          {activeId === 'compound-interest' ? (
            <>
              <CalculatorField label={copy.initialAmount} value={compound.initial} onChange={value => setCompound(prev => ({ ...prev, initial: value }))} />
              <CalculatorField label={copy.monthlyContribution} value={compound.monthly} onChange={value => setCompound(prev => ({ ...prev, monthly: value }))} />
              <CalculatorField label={copy.annualReturn} value={compound.returnRate} onChange={value => setCompound(prev => ({ ...prev, returnRate: value }))} suffix="%" />
              <CalculatorField label={copy.years} value={compound.years} onChange={value => setCompound(prev => ({ ...prev, years: value }))} step="1" />
            </>
          ) : null}

          {activeId === 'loan-financing' ? (
            <>
              <CalculatorField label={copy.loanAmount} value={loan.amount} onChange={value => setLoan(prev => ({ ...prev, amount: value }))} />
              <CalculatorField label={copy.annualRate} value={loan.rate} onChange={value => setLoan(prev => ({ ...prev, rate: value }))} suffix="%" />
              <CalculatorField label={copy.termMonths} value={loan.months} onChange={value => setLoan(prev => ({ ...prev, months: value }))} step="1" />
              <CalculatorField label={copy.monthlyIncome} value={loan.income} onChange={value => setLoan(prev => ({ ...prev, income: value }))} />
              <button type="button" className="calculator-prefill" onClick={prefillIncome} disabled={!healthSnapshot.hasIncome}>{copy.monthlyIncome}</button>
            </>
          ) : null}

          {activeId === 'retirement-fire' ? (
            <>
              <CalculatorField label={copy.currentSavings} value={fire.savings} onChange={value => setFire(prev => ({ ...prev, savings: value }))} />
              <CalculatorField label={copy.monthlyInvestment} value={fire.monthly} onChange={value => setFire(prev => ({ ...prev, monthly: value }))} />
              <CalculatorField label={copy.annualReturn} value={fire.returnRate} onChange={value => setFire(prev => ({ ...prev, returnRate: value }))} suffix="%" />
              <CalculatorField label={copy.retirementSpending} value={fire.spending} onChange={value => setFire(prev => ({ ...prev, spending: value }))} />
              <CalculatorField label={copy.safeWithdrawalRate} value={fire.swr} onChange={value => setFire(prev => ({ ...prev, swr: value }))} suffix="%" />
            </>
          ) : null}

          {activeId === 'rent-vs-buy' ? (
            <>
              <label className="calculator-field">
                <span>{copy.assetType}</span>
                <select value={rentBuy.assetType} onChange={event => setRentBuy(prev => ({ ...prev, assetType: event.target.value }))}>
                  <option value="home">{copy.home}</option>
                  <option value="car">{copy.car}</option>
                  <option value="other">{copy.other}</option>
                </select>
              </label>
              <CalculatorField label={copy.purchasePrice} value={rentBuy.price} onChange={value => setRentBuy(prev => ({ ...prev, price: value }))} />
              <CalculatorField label={copy.downPayment} value={rentBuy.down} onChange={value => setRentBuy(prev => ({ ...prev, down: value }))} />
              <CalculatorField label={copy.annualRate} value={rentBuy.rate} onChange={value => setRentBuy(prev => ({ ...prev, rate: value }))} suffix="%" />
              <CalculatorField label={copy.termYears} value={rentBuy.termYears} onChange={value => setRentBuy(prev => ({ ...prev, termYears: value }))} step="1" />
              <CalculatorField label={copy.rentAlternative} value={rentBuy.rent} onChange={value => setRentBuy(prev => ({ ...prev, rent: value }))} />
              <CalculatorField label={copy.maintenance} value={rentBuy.maintenance} onChange={value => setRentBuy(prev => ({ ...prev, maintenance: value }))} />
              <CalculatorField label={copy.insuranceFees} value={rentBuy.fees} onChange={value => setRentBuy(prev => ({ ...prev, fees: value }))} />
              <CalculatorField label={copy.investmentReturn} value={rentBuy.returnRate} onChange={value => setRentBuy(prev => ({ ...prev, returnRate: value }))} suffix="%" />
              <CalculatorField label={copy.periodYears} value={rentBuy.years} onChange={value => setRentBuy(prev => ({ ...prev, years: value }))} step="1" />
            </>
          ) : null}

          {activeId === 'affordability' ? (
            <>
              <CalculatorField label={copy.monthlyIncome} value={affordability.income} onChange={value => setAffordability(prev => ({ ...prev, income: value }))} />
              <CalculatorField label={copy.fixedExpenses} value={affordability.fixed} onChange={value => setAffordability(prev => ({ ...prev, fixed: value }))} />
              <CalculatorField label={copy.existingDebtPayments} value={affordability.debts} onChange={value => setAffordability(prev => ({ ...prev, debts: value }))} />
              <CalculatorField label={copy.purchaseAmount} value={affordability.purchase} onChange={value => setAffordability(prev => ({ ...prev, purchase: value }))} />
              <CalculatorField label={copy.downPayment} value={affordability.down} onChange={value => setAffordability(prev => ({ ...prev, down: value }))} />
              <CalculatorField label={copy.termYears} value={affordability.termYears} onChange={value => setAffordability(prev => ({ ...prev, termYears: value }))} step="1" />
              <CalculatorField label={copy.annualRate} value={affordability.rate} onChange={value => setAffordability(prev => ({ ...prev, rate: value }))} suffix="%" />
              <button type="button" className="calculator-prefill" onClick={prefillIncome} disabled={!healthSnapshot.hasIncome}>{copy.monthlyIncome}</button>
            </>
          ) : null}

          {activeId === 'opportunity-cost' ? (
            <>
              <CalculatorField label={copy.spendingAmount} value={opportunity.amount} onChange={value => setOpportunity(prev => ({ ...prev, amount: value }))} />
              <CalculatorField label={copy.annualReturn} value={opportunity.returnRate} onChange={value => setOpportunity(prev => ({ ...prev, returnRate: value }))} suffix="%" />
              <CalculatorField label={copy.years} value={opportunity.years} onChange={value => setOpportunity(prev => ({ ...prev, years: value }))} step="1" />
              <CalculatorField label={copy.monthlyContribution} value={opportunity.monthly} onChange={value => setOpportunity(prev => ({ ...prev, monthly: value }))} />
            </>
          ) : null}

          {activeId === 'debt-payoff' ? (
            <div className="debt-payoff-fields">
              {debtRows.map((row, index) => (
                <div className="debt-row-card" key={row.id}>
                  <label className="calculator-field">
                    <span>{copy.debtName}</span>
                    <input value={row.name} onChange={event => setDebtRows(prev => prev.map(item => item.id === row.id ? { ...item, name: event.target.value } : item))} />
                  </label>
                  <CalculatorField label={copy.balance} value={row.balance} onChange={value => setDebtRows(prev => prev.map(item => item.id === row.id ? { ...item, balance: value } : item))} />
                  <CalculatorField label={copy.annualRate} value={row.rate} onChange={value => setDebtRows(prev => prev.map(item => item.id === row.id ? { ...item, rate: value } : item))} suffix="%" />
                  <CalculatorField label={copy.minimumPayment} value={row.minimum} onChange={value => setDebtRows(prev => prev.map(item => item.id === row.id ? { ...item, minimum: value } : item))} />
                  {debtRows.length > 1 ? (
                    <button type="button" className="calculator-remove" onClick={() => setDebtRows(prev => prev.filter(item => item.id !== row.id))}>{copy.remove}</button>
                  ) : null}
                </div>
              ))}
              <CalculatorField label={copy.extraMonthlyPayment} value={debtExtra} onChange={setDebtExtra} />
              <button type="button" className="calculator-prefill" onClick={() => setDebtRows(prev => [...prev, { id: `debt-${prev.length + 1}-${Date.now()}`, name: '', balance: '', rate: '', minimum: '' }])}>{copy.addDebt}</button>
            </div>
          ) : null}

          {activeId === 'risk-tolerance' ? (
            <div className="risk-question-list">
              {riskQuestions.map(question => (
                <fieldset className="risk-question" key={question.id}>
                  <legend>{question.label}</legend>
                  <div>
                    {question.answers.map(([label, score]) => (
                      <button
                        type="button"
                        key={label}
                        className={riskAnswers[question.id] === String(score) ? 'selected' : ''}
                        onClick={() => setRiskAnswers(prev => ({ ...prev, [question.id]: String(score) }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          ) : null}
        </div>

        {activeId === 'compound-interest' ? (
          compoundReady ? (
            <ResultSection copy={copy} summary={`${copy.initialAmount}: ${money(compoundValues.initial!)} · ${copy.monthlyContribution}: ${money(compoundValues.monthly!)} · ${copy.years}: ${compoundValues.years}`} theory={relatedTheoryText} interpretation={getFinancialTheoryText(tool.description, lang)}>
              <ResultCard label={copy.finalAmount} value={money(compoundFinal)} tone="strong" />
              <ResultCard label={copy.totalContributions} value={money(compoundContributions)} />
              <ResultCard label={copy.growthProfit} value={money(compoundFinal - compoundContributions)} />
              <ResultCard label={copy.ruleOf72} value={compoundValues.returnRate! > 0 ? formatDuration((72 / compoundValues.returnRate!) * 12, copy) : copy.notCalculable} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'loan-financing' ? (
          loanReady ? (
            <ResultSection copy={copy} summary={`${copy.loanAmount}: ${money(loanPrincipal!)} · ${copy.termMonths}: ${loanMonths} · ${copy.monthlyIncome}: ${money(loanIncome!)}`} theory={relatedTheoryText} interpretation={riskLabel(loanRisk, copy)}>
              <ResultCard label={copy.monthlyPayment} value={money(loanPayment)} tone="strong" />
              <ResultCard label={copy.totalRepayment} value={money(loanTotal)} />
              <ResultCard label={copy.interestCost} value={money(Math.max(0, loanTotal - loanPrincipal!))} />
              <ResultCard label={copy.dti} value={formatPercent(loanDti, lang)} tone={loanRisk === 'high' ? 'warning' : 'default'} />
              <ResultCard label={copy.risk} value={riskLabel(loanRisk, copy)} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'retirement-fire' ? (
          fireReady ? (
            <ResultSection copy={copy} summary={`${copy.currentSavings}: ${money(fireSavings!)} · ${copy.monthlyInvestment}: ${money(fireMonthly!)} · ${copy.safeWithdrawalRate}: ${formatPercent(fireSwr!, lang)}`} theory={relatedTheoryText} interpretation={fireMonths >= 1200 ? copy.notCalculable : formatDuration(fireMonths, copy)}>
              <ResultCard label={copy.fireTarget} value={money(fireTarget)} tone="strong" />
              <ResultCard label={copy.estimatedYears} value={fireSavings! >= fireTarget ? formatDuration(0, copy) : fireMonths >= 1200 ? copy.notCalculable : formatDuration(fireMonths, copy)} />
              <ResultCard label={copy.progress} value={formatPercent(Math.min(100, ratioPercent(fireSavings!, fireTarget)), lang)} />
              <ResultCard label={copy.suggestedMonthlyInvestment} value={money(suggestedFireMonthly)} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'rent-vs-buy' ? (
          rentBuyReady ? (
            <ResultSection copy={copy} summary={`${copy.purchasePrice}: ${money(rentBuyNumbers.price!)} · ${copy.downPayment}: ${money(rentBuyNumbers.down!)} · ${copy.rentAlternative}: ${money(rentBuyNumbers.rent!)}`} theory={relatedTheoryText} interpretation={rentRecommendation}>
              <ResultCard label={copy.buyingCost} value={money(buyingCost)} tone="strong" />
              <ResultCard label={copy.rentingCost} value={money(rentingCost)} />
              <ResultCard label={copy.opportunityCost} value={money(rentOpportunityCost)} />
              <ResultCard label={copy.difference} value={money(Math.abs(rentDifference))} />
              <ResultCard label={copy.recommendation} value={rentRecommendation} tone={rentRecommendation === copy.neutral ? 'default' : 'strong'} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'affordability' ? (
          affordabilityReady ? (
            <ResultSection copy={copy} summary={`${copy.monthlyIncome}: ${money(affordableNumbers.income!)} · ${copy.purchaseAmount}: ${money(affordableNumbers.purchase!)} · ${copy.existingDebtPayments}: ${money(affordableNumbers.debts!)}`} theory={relatedTheoryText} interpretation={affordabilityRecommendation}>
              <ResultCard label={copy.monthlyPayment} value={money(affordabilityPayment)} tone="strong" />
              <ResultCard label={copy.remainingCashFlow} value={money(remainingCashFlow)} tone={remainingCashFlow < 0 ? 'warning' : 'default'} />
              <ResultCard label={copy.dti} value={formatPercent(affordabilityDti, lang)} tone={affordableRisk === 'high' ? 'warning' : 'default'} />
              <ResultCard label={copy.safePurchaseLimit} value={money(affordableLimit)} />
              <ResultCard label={copy.risk} value={riskLabel(affordableRisk, copy)} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'opportunity-cost' ? (
          opportunityReady ? (
            <ResultSection copy={copy} summary={`${copy.spendingAmount}: ${money(opportunityAmount!)} · ${copy.years}: ${opportunityYears} · ${copy.annualReturn}: ${formatPercent(opportunityReturn!, lang)}`} theory={relatedTheoryText} interpretation={money(Math.max(0, opportunityFuture - opportunityContributions))}>
              <ResultCard label={copy.futureValueIfInvested} value={money(opportunityFuture)} tone="strong" />
              <ResultCard label={copy.contributions} value={money(opportunityContributions)} />
              <ResultCard label={copy.growthProfit} value={money(Math.max(0, opportunityFuture - opportunityContributions))} />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'debt-payoff' ? (
          debtReady ? (
            <ResultSection copy={copy} summary={`${copy.extraMonthlyPayment}: ${money(extraPayment)} · ${copy.debtName}: ${debtRows.filter(row => hasPositive(positiveNumber(row.balance))).length}`} theory={relatedTheoryText} interpretation={debtRecommended}>
              <ResultCard label={`${copy.snowball} - ${copy.payoffTime}`} value={formatDuration(snowballResult!.months, copy)} />
              <ResultCard label={`${copy.snowball} - ${copy.totalInterest}`} value={money(snowballResult!.totalInterest)} />
              <ResultCard label={`${copy.avalanche} - ${copy.payoffTime}`} value={formatDuration(avalancheResult!.months, copy)} tone="strong" />
              <ResultCard label={`${copy.avalanche} - ${copy.totalInterest}`} value={money(avalancheResult!.totalInterest)} />
              <ResultCard label={copy.interestSaved} value={money(Math.abs(snowballResult!.totalInterest - avalancheResult!.totalInterest))} />
              <ResultCard label={copy.recommendedStrategy} value={debtRecommended} tone="strong" />
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}

        {activeId === 'risk-tolerance' ? (
          riskReady ? (
            <ResultSection copy={copy} summary={`${copy.progress}: ${formatPercent((riskQuestions.filter(question => riskAnswers[question.id]).length / riskQuestions.length) * 100, lang)}`} theory={relatedTheoryText} interpretation={riskAllocation}>
              <ResultCard label={copy.risk} value={riskProfile} tone="strong" />
              <ResultCard label={copy.progress} value={formatPercent((riskScore / 4) * 100, lang)} />
              <div className="calculator-list-card calculator-wide">
                <strong>{copy.recommendation}</strong>
                <p>{riskAllocation}</p>
              </div>
            </ResultSection>
          ) : <p className="calculator-error">{copy.enterValues}</p>
        ) : null}
      </div>

      <div className="calculator-actions">
        <button type="button" onClick={reset}>
          <RotateCcw size={16} aria-hidden="true" />
          {copy.reset}
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
  isRead,
  onToggle,
  onMarkRead,
  onOpenRelatedTool,
}: {
  theory: FinancialTheory;
  lang: FinancialTheoryLang;
  text: Record<string, string>;
  isOpen: boolean;
  isRead: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onOpenRelatedTool: () => void;
}) {
  const Icon = THEORY_ICONS[(theory.number - 1) % THEORY_ICONS.length];
  const title = getFinancialTheoryText(theory.title, lang);
  const short = getFinancialTheoryText(theory.short, lang);
  const category = FINANCIAL_THEORY_CATEGORIES.find(item => item.id === theory.category);
  const categoryLabel = category ? getFinancialTheoryText(category.label, lang) : '';
  const level = LEARNING_LEVELS.find(item => item.id === theoryLevel(theory));
  const levelLabel = level ? getFinancialTheoryText(level.label, lang) : '';
  const takeaway = getFinancialTheoryText(theory.keyTakeaway, lang);
  const tool = getFinancialTheoryText(theory.sfmTool, lang);
  const detailId = `theory-details-${theory.id}`;
  const examples = theory.examples?.[lang] ?? [];
  const rows = theory.tableRows?.[lang] ?? [];
  const hasRelatedTool = Boolean(theory.sfmToolHref || calculatorForTheory(theory));

  return (
    <article className={`theory-card ${isOpen ? 'expanded' : ''}`}>
      <div className="theory-card-head">
        <span className="theory-number">{String(theory.number).padStart(2, '0')}</span>
        <span className="theory-icon" aria-hidden="true"><Icon size={22} /></span>
        <div>
          <div className="theory-card-badges">
            <span className="theory-category">{categoryLabel}</span>
            {levelLabel ? <span className="theory-category theory-level-badge">{levelLabel}</span> : null}
            {isRead ? <span className="theory-read-badge">{text.done}</span> : null}
          </div>
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
          className="theory-primary-action"
          aria-expanded={isOpen}
          aria-controls={detailId}
          onClick={onToggle}
        >
          {isOpen ? text.hideTheory : text.quickExplanation}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="theory-secondary-action"
          onClick={onToggle}
        >
          {text.practicalExampleAction}
          <Lightbulb size={15} aria-hidden="true" />
        </button>
        {hasRelatedTool && theory.sfmToolHref ? (
          <Link href={theory.sfmToolHref} className="theory-secondary-action" aria-label={`${text.openTool}: ${tool}`}>
            {text.applyTheory}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : null}
        {hasRelatedTool && !theory.sfmToolHref ? (
          <button
            type="button"
            className="theory-secondary-action"
            onClick={onOpenRelatedTool}
            aria-label={`${text.openTool}: ${tool}`}
          >
            {text.applyTheory}
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        ) : null}
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

        <div className="detail-block mistake-block">
          <h4>{text.commonMistake}</h4>
          <p>{commonMistakeCopy(theory, lang)}</p>
        </div>

        <div className="detail-block tool-block">
          <h4>{text.applyInSfm}</h4>
          <p>{applyCopy(lang, tool)}</p>
          {hasRelatedTool ? <small>{text.educationalDisclaimer}</small> : null}
        </div>

        <button type="button" className="theory-mark-read" onClick={onMarkRead} disabled={isRead}>
          {isRead ? text.done : text.markAsRead}
        </button>
      </div>
    </article>
  );
}

export default function FinancialTheoriesPage() {
  const { lang, dir } = useLanguage();
  const { user } = useAuth();
  const { currency: userCurrency } = useCurrency();
  const locale = localeFrom(lang);
  const text = UI_COPY[locale];
  const [activeGoal, setActiveGoal] = useState<LearningGoalId>('spending');
  const [activeLevel, setActiveLevel] = useState<LearningLevelId>('beginner');
  const [openSections, setOpenSections] = useState<Set<LearningSectionId>>(() => new Set(['budget-basics']));
  const [expandedSections, setExpandedSections] = useState<Set<LearningSectionId>>(() => new Set());
  const [activeToolCategory, setActiveToolCategory] = useState<GuidedToolCategoryId>('all');
  const [showAllTools, setShowAllTools] = useState(false);
  const [query, setQuery] = useState('');
  const [toolQuery, setToolQuery] = useState('');
  const [openTheory, setOpenTheory] = useState<string | null>(null);
  const [readTheoryIds, setReadTheoryIds] = useState<Set<string>>(() => new Set());
  const [usedToolIds, setUsedToolIds] = useState<Set<string>>(() => new Set());
  const [activeCalculator, setActiveCalculator] = useState<CalculatorId | null>(null);
  const [healthSnapshot, setHealthSnapshot] = useState<FinancialHealthSnapshot>(EMPTY_HEALTH_SNAPSHOT);
  const defaultCurrency = userCurrency || 'KWD';

  useEffect(() => {
    setReadTheoryIds(readProgressFromStorage());
    setUsedToolIds(readToolProgressFromStorage());
  }, []);

  const markTheoryRead = useCallback((theoryId: string) => {
    setReadTheoryIds(previous => {
      if (previous.has(theoryId)) return previous;
      const next = new Set(previous);
      next.add(theoryId);
      saveProgressToStorage(next);
      return next;
    });
  }, []);

  const markToolUsed = useCallback((toolId: string) => {
    setUsedToolIds(previous => {
      if (previous.has(toolId)) return previous;
      const next = new Set(previous);
      next.add(toolId);
      saveToolProgressToStorage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadHealthSnapshot() {
      if (!user?.id) {
        setHealthSnapshot(EMPTY_HEALTH_SNAPSHOT);
        return;
      }
      setHealthSnapshot(prev => ({ ...prev, isLoading: true, error: null }));
      const result = await loadUserDataTables(supabase, user.id, HEALTH_DATA_TABLES);
      if (!isMounted) return;
      const incomeRows = personalIncomeRows(result.records.income ?? []);
      const expenseRows = personalExpenseRows(result.records.expenses ?? []);
      const savingsRows = result.records.savings ?? [];
      setHealthSnapshot({
        income: sumAmounts(incomeRows, ['amount']),
        expenses: sumAmounts(expenseRows, ['amount']),
        savings: sumAmounts(savingsRows, ['current_amount', 'balance', 'current_value', 'amount']),
        debts: 0,
        hasIncome: incomeRows.length > 0,
        hasExpenses: expenseRows.length > 0,
        hasSavings: savingsRows.length > 0,
        isLoading: false,
        error: Object.values(result.errors).find(Boolean) ?? null,
      });
    }
    void loadHealthSnapshot();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const goal = LEARNING_GOALS.find(item => item.id === activeGoal) ?? LEARNING_GOALS[0];
    const goalIds = new Set(goal.theoryIds);
    const firstSection = LEARNING_SECTIONS.find(section => (
      section.theoryIds
        .map(relatedTheory)
        .some(theory => theory && goalIds.has(theory.id) && levelAllows(theory, activeLevel))
    ));
    setOpenSections(firstSection ? new Set([firstSection.id]) : new Set());
    setExpandedSections(new Set());
  }, [activeGoal, activeLevel]);

  function openCalculator(calculatorId: CalculatorId) {
    markToolUsed(calculatorId);
    setActiveCalculator(calculatorId);
    window.setTimeout(() => document.getElementById('active-smart-calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function openRelatedTheoryTool(theory: FinancialTheory) {
    markTheoryRead(theory.id);
    const calculatorId = calculatorForTheory(theory);
    if (calculatorId) {
      openCalculator(calculatorId);
      return;
    }
    setOpenTheory(theory.id);
    window.setTimeout(() => document.getElementById(`theory-details-${theory.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  }

  const totalTheories = FINANCIAL_THEORIES.length;
  const completedCount = useMemo(
    () => FINANCIAL_THEORIES.filter(theory => readTheoryIds.has(theory.id)).length,
    [readTheoryIds],
  );
  const usedToolsCount = usedToolIds.size;
  const progressPercent = totalTheories + THEORY_CALCULATORS.length > 0
    ? Math.round(((completedCount + Math.min(usedToolsCount, THEORY_CALCULATORS.length)) / (totalTheories + THEORY_CALCULATORS.length)) * 100)
    : 0;

  const selectedGoal = useMemo(
    () => LEARNING_GOALS.find(goal => goal.id === activeGoal) ?? LEARNING_GOALS[0],
    [activeGoal],
  );
  const selectedLevel = useMemo(
    () => LEARNING_LEVELS.find(level => level.id === activeLevel) ?? LEARNING_LEVELS[0],
    [activeLevel],
  );
  const goalTheoryIds = useMemo(() => new Set(selectedGoal.theoryIds), [selectedGoal]);

  const sectionGroups = useMemo(() => {
    const normalizedQuery = normalize(query);
    return LEARNING_SECTIONS.map(section => {
      const theories = section.theoryIds
        .map(relatedTheory)
        .filter((theory): theory is FinancialTheory => Boolean(theory))
        .filter(theory => goalTheoryIds.has(theory.id))
        .filter(theory => levelAllows(theory, activeLevel))
        .filter(theory => theoryMatchesQuery(theory, locale, normalizedQuery));
      return { section, theories };
    });
  }, [activeLevel, goalTheoryIds, locale, query]);

  const totalVisibleTheories = useMemo(
    () => sectionGroups.reduce((total, group) => total + group.theories.length, 0),
    [sectionGroups],
  );

  const featuredTheory = relatedTheory('personal-budgeting') ?? FINANCIAL_THEORIES[0];
  const featuredExample = featuredTheory.examples?.[locale]?.[0] ?? getFinancialTheoryText(featuredTheory.keyTakeaway, locale);

  const recommendedTheories = useMemo(() => {
    if (!healthSnapshot.hasIncome && !healthSnapshot.hasExpenses && !healthSnapshot.hasSavings) return [];
    const recommendations: string[] = [];
    if (healthSnapshot.hasExpenses || healthSnapshot.expenses > healthSnapshot.income * 0.75) recommendations.push('personal-budgeting', 'lifestyle-inflation');
    if (!healthSnapshot.hasSavings || healthSnapshot.savings <= 0) recommendations.push('emergency-fund', 'pay-yourself-first');
    if (healthSnapshot.hasIncome && healthSnapshot.hasSavings) recommendations.push('smart-goals', 'compound-interest');
    if (healthSnapshot.expenses > healthSnapshot.income && healthSnapshot.hasIncome) recommendations.push('reduce-bad-debt');
    recommendations.push(...selectedGoal.theoryIds);
    return [...new Set(recommendations)]
      .map(relatedTheory)
      .filter((theory): theory is FinancialTheory => Boolean(theory))
      .slice(0, 3);
  }, [healthSnapshot, selectedGoal]);

  const toolCategoryTabs: PageTabItem[] = useMemo(() => (
    GUIDED_TOOL_TABS.map(category => ({
      id: category.id,
      label: getFinancialTheoryText(category.label, locale),
      count: category.id === 'all'
        ? THEORY_CALCULATORS.length
        : THEORY_CALCULATORS.filter(tool => category.toolIds.includes(tool.id)).length,
    }))
  ), [locale]);

  const filteredCalculators = useMemo(() => {
    const normalizedQuery = normalize(toolQuery);
    const activeTab = GUIDED_TOOL_TABS.find(tab => tab.id === activeToolCategory) ?? GUIDED_TOOL_TABS[0];
    const selectedGoalToolIds = new Set(selectedGoal.toolIds);
    const tabToolIds = new Set(activeTab.toolIds);
    return THEORY_CALCULATORS
      .filter(tool => activeToolCategory === 'all' ? selectedGoalToolIds.has(tool.id) : tabToolIds.has(tool.id))
      .filter(tool => {
        if (!normalizedQuery) return true;
        const haystack = [
          getFinancialTheoryText(tool.title, locale),
          getFinancialTheoryText(tool.description, locale),
          ...tool.relatedTheories.map(item => getFinancialTheoryText(item, locale)),
        ].join(' ');
        return normalize(haystack).includes(normalizedQuery);
      });
  }, [activeToolCategory, locale, selectedGoal, toolQuery]);

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
              <a className="theory-secondary-link" href="#featured-theory">{text.featuredTheoryTitle}</a>
            </>
          )}
        />

        <AppCard className="learning-progress-card" aria-label={buildProgressText(text.progressText, completedCount, totalTheories)}>
          <div className="learning-progress-copy">
            <span>{buildProgressText(text.progressText, completedCount, totalTheories)}</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="learning-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="learning-progress-metrics">
            <span><b dir="ltr">{completedCount}</b>{text.theoriesReadCount}</span>
            <span><b dir="ltr">{usedToolsCount}</b>{text.toolsUsedCount}</span>
            <span><b dir="ltr">{progressPercent}%</b>{text.progressRatio}</span>
          </div>
        </AppCard>

        <section className="guided-goal-section section-panel" aria-labelledby="guided-goal-title">
          <div className="theory-section-head">
            <span>{text.educationNote}</span>
            <h2 id="guided-goal-title">{text.startByGoalTitle}</h2>
            <p>{text.startByGoalSubtitle}</p>
          </div>

          <div className="goal-path-grid">
            {LEARNING_GOALS.map(goal => {
              const isActive = activeGoal === goal.id;
              return (
                <button
                  key={goal.id}
                  type="button"
                  className={`goal-path-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveGoal(goal.id);
                    setOpenTheory(null);
                    setActiveCalculator(null);
                    setExpandedSections(new Set());
                    setOpenSections(new Set(['budget-basics']));
                  }}
                >
                  <strong>{getFinancialTheoryText(goal.label, locale)}</strong>
                  <span>{getFinancialTheoryText(goal.description, locale)}</span>
                </button>
              );
            })}
          </div>

          <div className="learning-level-panel">
            <div>
              <span>{text.learningLevel}</span>
              <strong>{getFinancialTheoryText(selectedLevel.label, locale)}</strong>
              <p>{getFinancialTheoryText(selectedLevel.description, locale)}</p>
            </div>
            <div className="learning-level-tabs" role="tablist" aria-label={text.learningLevel}>
              {LEARNING_LEVELS.map(level => (
                <button
                  key={level.id}
                  type="button"
                  className={activeLevel === level.id ? 'active' : ''}
                  onClick={() => {
                    setActiveLevel(level.id);
                    setOpenTheory(null);
                    setExpandedSections(new Set());
                  }}
                >
                  {getFinancialTheoryText(level.label, locale)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="featured-theory" className="theory-section theory-of-day-section section-panel" aria-labelledby="featured-theory-title">
          <div className="theory-of-day-card">
            <div className="theory-of-day-icon" aria-hidden="true"><Sparkles size={24} /></div>
            <div>
              <span>{text.featuredTheoryTitle}</span>
              <h2 id="featured-theory-title">{getFinancialTheoryText(featuredTheory.title, locale)}</h2>
              <p>{getFinancialTheoryText(featuredTheory.short, locale)}</p>
              <div className="featured-example-box">
                <small>{text.featuredTheoryExample}</small>
                <strong>{featuredExample}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveGoal('spending');
                setActiveLevel('beginner');
                setOpenSections(new Set(['budget-basics']));
                setOpenTheory(featuredTheory.id);
                markTheoryRead(featuredTheory.id);
                openRelatedTheoryTool(featuredTheory);
              }}
            >
              {text.featuredTheoryButton}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section id="theory-library" className="theory-section library-section section-panel" aria-labelledby="theory-library-title">
          <div className="theory-section-head">
            <span>{getFinancialTheoryText(selectedGoal.label, locale)} · {getFinancialTheoryText(selectedLevel.label, locale)}</span>
            <h2 id="theory-library-title">{text.theoryLibrary}</h2>
            <p>{text.accordionSubtitle}</p>
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
            <div className="guided-filter-summary">
              <span>{text.categories}</span>
              <strong dir="ltr">{totalVisibleTheories}</strong>
            </div>
          </div>

          {totalVisibleTheories > 0 ? (
            <div className="theory-accordion-list">
              {sectionGroups.map(({ section, theories }) => {
                if (theories.length === 0) return null;
                const isOpen = openSections.has(section.id);
                const isExpanded = expandedSections.has(section.id);
                const visibleTheories = isExpanded ? theories : theories.slice(0, 3);
                return (
                  <article className="theory-accordion" key={section.id}>
                    <button
                      type="button"
                      className="theory-accordion-head"
                      aria-expanded={isOpen}
                      onClick={() => {
                        setOpenSections(previous => {
                          const next = new Set(previous);
                          if (next.has(section.id)) next.delete(section.id);
                          else next.add(section.id);
                          return next;
                        });
                      }}
                    >
                      <div>
                        <span>{theories.length} {text.theoriesInside}</span>
                        <h3>{getFinancialTheoryText(section.title, locale)}</h3>
                        <p>{getFinancialTheoryText(section.description, locale)}</p>
                      </div>
                      <ChevronDown size={18} aria-hidden="true" />
                    </button>

                    {isOpen ? (
                      <div className="theory-accordion-body">
                        <div className="theory-grid">
                          {visibleTheories.map(theory => (
                            <TheoryCard
                              key={theory.id}
                              theory={theory}
                              lang={locale}
                              text={text}
                              isOpen={openTheory === theory.id}
                              isRead={readTheoryIds.has(theory.id)}
                              onToggle={() => {
                                setOpenTheory(current => current === theory.id ? null : theory.id);
                                markTheoryRead(theory.id);
                              }}
                              onMarkRead={() => markTheoryRead(theory.id)}
                              onOpenRelatedTool={() => openRelatedTheoryTool(theory)}
                            />
                          ))}
                        </div>
                        {theories.length > 3 ? (
                          <button
                            type="button"
                            className="show-more-button"
                            onClick={() => {
                              setExpandedSections(previous => {
                                const next = new Set(previous);
                                if (next.has(section.id)) next.delete(section.id);
                                else next.add(section.id);
                                return next;
                              });
                            }}
                          >
                            {isExpanded ? text.showLess : text.showMore}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen size={28} />}
              title={text.noResults}
              description={text.noResultsDescription}
            />
          )}
        </section>

        <section className="theory-section recommendations-section section-panel" aria-labelledby="personalized-recommendations-title">
          <div className="theory-section-head">
            <span>{text.progressRatio}</span>
            <h2 id="personalized-recommendations-title">{text.recommendedTitle}</h2>
            <p>{text.recommendedSubtitle}</p>
          </div>

          {recommendedTheories.length > 0 ? (
            <CardsGrid className="starter-theory-grid">
              {recommendedTheories.map(theory => {
                const title = getFinancialTheoryText(theory.title, locale);
                const targetGoal = LEARNING_GOALS.find(goal => goal.theoryIds.includes(theory.id))?.id ?? activeGoal;
                return (
                  <AppCard key={theory.id} className="starter-theory-card">
                    <span className="featured-index">{String(theory.number).padStart(2, '0')}</span>
                    <h3>{title}</h3>
                    <p>{getFinancialTheoryText(theory.short, locale)}</p>
                    {readTheoryIds.has(theory.id) ? <span className="theory-read-badge">{text.done}</span> : null}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveGoal(targetGoal);
                        setActiveLevel(theoryLevel(theory));
                        setQuery('');
                        setOpenTheory(theory.id);
                        markTheoryRead(theory.id);
                        window.setTimeout(() => {
                          document.getElementById('theory-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 0);
                      }}
                      aria-label={`${text.readTheory}: ${title}`}
                    >
                      {text.readTheory}
                    </button>
                  </AppCard>
                );
              })}
            </CardsGrid>
          ) : (
            <EmptyState
              icon={<Target size={28} />}
              title={text.recommendationsEmptyTitle}
              description={text.recommendationsEmptyBody}
            />
          )}
        </section>

        <section id="smart-tools" className="theory-section tools-section section-panel" aria-labelledby="smart-tools-title">
          <div className="theory-section-head">
            <span>{text.smartToolsTitle}</span>
            <h2 id="smart-tools-title">{text.smartToolsTitle}</h2>
            <p>{text.smartToolsSubtitle}</p>
          </div>

          <div className="tool-controls">
            <label className="theory-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">{text.toolSearchLabel}</span>
              <input
                type="search"
                value={toolQuery}
                placeholder={text.toolSearchPlaceholder}
                onChange={event => {
                  setToolQuery(event.target.value);
                  setShowAllTools(false);
                  setActiveCalculator(null);
                }}
              />
            </label>

            <PageTabs
              tabs={toolCategoryTabs}
              active={activeToolCategory}
              onChange={id => {
                setActiveToolCategory(id as GuidedToolCategoryId);
                setShowAllTools(false);
                setActiveCalculator(null);
              }}
              ariaLabel={text.smartToolsTitle}
              className="financial-theory-tabs tool-category-tabs"
            />
          </div>

          {filteredCalculators.length > 0 ? (
            <>
            <CardsGrid className="tools-grid">
              {(showAllTools ? filteredCalculators : filteredCalculators.slice(0, 6)).map((tool, index) => {
              const Icon = [Calculator, Landmark, PiggyBank, WalletCards, Gauge, Sparkles, ShieldAlert, Brain, Target][index] ?? Calculator;
              const title = getFinancialTheoryText(tool.title, locale);
              const calculatorId = isCalculatorId(tool.id) ? tool.id : null;
              return (
                <AppCard key={tool.id} className="smart-tool-card">
                  <div className="smart-tool-top">
                    <div className="smart-tool-icon" aria-hidden="true"><Icon size={22} /></div>
                    <span className="status available">{text.available}</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{getFinancialTheoryText(tool.description, locale)}</p>
                  <div className="tool-theory-badges" aria-label={THEORY_CALCULATOR_TEXT[locale].theoryConnection}>
                    {tool.relatedTheories.map(item => (
                      <span key={getFinancialTheoryText(item, locale)}>{getFinancialTheoryText(item, locale)}</span>
                    ))}
                  </div>
                  {tool.href ? (
                    <Link
                      href={tool.href}
                      className="smart-tool-action"
                      aria-label={`${getFinancialTheoryText(tool.cta, locale)}: ${title}`}
                      onClick={() => markToolUsed(tool.id)}
                    >
                      {getFinancialTheoryText(tool.cta, locale)}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                  ) : calculatorId ? (
                    <button
                      type="button"
                      className="smart-tool-action"
                      aria-label={`${getFinancialTheoryText(tool.cta, locale)}: ${title}`}
                      onClick={() => openCalculator(calculatorId)}
                    >
                      {getFinancialTheoryText(tool.cta, locale)}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  ) : null}
                </AppCard>
              );
              })}
            </CardsGrid>
            {filteredCalculators.length > 6 ? (
              <button type="button" className="show-more-button" onClick={() => setShowAllTools(value => !value)}>
                {showAllTools ? text.showLess : text.showMore}
              </button>
            ) : null}
            </>
          ) : (
            <EmptyState
              icon={<Calculator size={28} />}
              title={text.noTools}
              description={text.noToolsDescription}
            />
          )}

          {activeCalculator ? (
            <div id="active-smart-calculator">
              <SmartCalculatorPanel
                activeId={activeCalculator}
                tool={THEORY_CALCULATORS.find(tool => tool.id === activeCalculator) ?? THEORY_CALCULATORS[0]}
                lang={locale}
                defaultCurrency={defaultCurrency}
                healthSnapshot={healthSnapshot}
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
        .starter-theory-card button,
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
        .starter-theory-card button,
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
        .starter-theory-card button:hover,
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

        .learning-progress-card {
          display: grid;
          gap: 10px;
          padding: 14px 16px !important;
          border: 1px solid rgba(15, 118, 110, .20) !important;
          background: rgba(45, 212, 191, .14) !important;
        }

        .learning-progress-copy {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: var(--sfm-heading);
          font-weight: 950;
        }

        .learning-progress-copy span {
          color: #0F766E;
        }

        .learning-progress-copy strong {
          color: var(--sfm-heading);
        }

        .learning-progress-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(15, 118, 110, .15);
        }

        .learning-progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          transition: width .2s ease;
        }

        .learning-progress-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .learning-progress-metrics span {
          min-height: 44px;
          display: grid;
          align-content: center;
          gap: 2px;
          border-radius: 14px;
          border: 1px solid rgba(15, 118, 110, .16);
          background: rgba(255, 255, 255, .48);
          color: var(--sfm-muted-readable);
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 900;
        }

        .learning-progress-metrics b {
          color: var(--sfm-heading);
          font-size: 15px;
        }

        .guided-goal-section,
        .theory-of-day-section,
        .recommendations-section {
          scroll-margin-top: 22px;
        }

        .goal-path-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          min-width: 0;
        }

        .goal-path-card {
          min-width: 0;
          min-height: 108px;
          display: grid;
          align-content: start;
          gap: 7px;
          border: 1px solid var(--sfm-border);
          border-radius: 20px;
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
          padding: 15px;
          text-align: start;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(3, 18, 37, .045);
          transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease, color .18s ease;
        }

        .goal-path-card strong {
          color: var(--sfm-heading);
          font-size: 15px;
          line-height: 1.35;
        }

        .goal-path-card span {
          color: var(--sfm-muted-readable);
          font-size: 12px;
          font-weight: 820;
          line-height: 1.55;
        }

        .goal-path-card:hover,
        .goal-path-card.active {
          transform: translateY(-2px);
          border-color: rgba(24, 212, 212, .40);
          box-shadow: var(--sfm-interactive-glow);
        }

        .goal-path-card.active {
          background: linear-gradient(135deg, rgba(29, 140, 255, .14), rgba(24, 212, 212, .16));
        }

        .learning-level-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          border: 1px solid rgba(24, 212, 212, .18);
          border-radius: 20px;
          background: rgba(24, 212, 212, .07);
          padding: 14px;
        }

        .learning-level-panel span {
          display: block;
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .learning-level-panel strong {
          display: block;
          color: var(--sfm-heading);
          margin-top: 3px;
          font-size: 17px;
        }

        .learning-level-panel p {
          margin: 3px 0 0;
          color: var(--sfm-muted-readable);
          font-weight: 820;
          line-height: 1.55;
        }

        .learning-level-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .learning-level-tabs button,
        .show-more-button {
          min-height: 38px;
          border-radius: 999px;
          border: 1px solid var(--sfm-border);
          background: var(--sfm-card);
          color: var(--sfm-heading);
          padding: 0 14px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
          transition: transform .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
        }

        .learning-level-tabs button.active,
        .show-more-button:hover {
          border-color: transparent;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
        }

        .theory-of-day-card {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
          min-width: 0;
          border-radius: 24px;
          border: 1px solid rgba(24, 212, 212, .22);
          background:
            radial-gradient(circle at 0% 0%, rgba(24, 212, 212, .18), transparent 34%),
            linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(24, 212, 212, .07)),
            var(--sfm-card);
          padding: 18px;
        }

        .theory-of-day-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          color: #FFFFFF;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          box-shadow: 0 16px 34px rgba(29, 140, 255, .22);
        }

        .theory-of-day-card span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .theory-of-day-card h2 {
          margin: 5px 0;
          color: var(--sfm-heading);
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.16;
        }

        .theory-of-day-card p {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.65;
          font-weight: 820;
        }

        .featured-example-box {
          display: grid;
          gap: 4px;
          margin-top: 12px;
          border-radius: 16px;
          border: 1px solid rgba(15, 118, 110, .20);
          background: rgba(45, 212, 191, .13);
          padding: 11px 12px;
        }

        .featured-example-box small {
          color: var(--sfm-primary-hover);
          font-weight: 950;
        }

        .featured-example-box strong {
          color: var(--sfm-heading);
          line-height: 1.6;
        }

        .theory-of-day-card button {
          min-height: 46px;
          border: 0;
          border-radius: 15px;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 16px 34px rgba(29, 140, 255, .22);
        }

        .guided-filter-summary {
          min-height: 42px;
          border-radius: 14px;
          border: 1px solid rgba(24, 212, 212, .18);
          background: rgba(24, 212, 212, .08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 13px;
        }

        .guided-filter-summary span {
          color: var(--sfm-muted-readable);
          font-weight: 950;
          font-size: 12px;
        }

        .guided-filter-summary strong {
          color: var(--sfm-heading);
          font-size: 18px;
        }

        .theory-accordion-list {
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .theory-accordion {
          min-width: 0;
          border: 1px solid var(--sfm-border);
          border-radius: 22px;
          background: var(--sfm-light-card);
          overflow: hidden;
        }

        .theory-accordion-head {
          width: 100%;
          min-height: 78px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          border: 0;
          background: transparent;
          color: var(--sfm-heading);
          padding: 16px;
          text-align: start;
          cursor: pointer;
        }

        .theory-accordion-head span {
          color: var(--sfm-primary-hover);
          font-size: 12px;
          font-weight: 950;
        }

        .theory-accordion-head h3 {
          margin: 4px 0;
          color: var(--sfm-heading);
          font-size: 20px;
          line-height: 1.25;
        }

        .theory-accordion-head p {
          margin: 0;
          color: var(--sfm-muted-readable);
          line-height: 1.55;
          font-weight: 820;
        }

        .theory-accordion-head svg {
          transition: transform .18s ease;
        }

        .theory-accordion-head[aria-expanded="true"] svg {
          transform: rotate(180deg);
        }

        .theory-accordion-body {
          display: grid;
          gap: 12px;
          padding: 0 16px 16px;
        }

        .show-more-button {
          width: fit-content;
          justify-self: center;
          margin-top: 2px;
        }

        .tool-controls {
          display: grid;
          grid-template-columns: minmax(230px, .34fr) minmax(0, 1fr);
          gap: 12px;
          align-items: center;
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
          overflow-x: auto;
          scrollbar-width: thin;
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

        .theory-level-badge {
          border-color: rgba(24, 212, 212, .18);
          background: rgba(24, 212, 212, .09);
          color: #0F766E;
        }

        .theory-card-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          min-width: 0;
        }

        .theory-read-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          min-height: 22px;
          border-radius: 999px;
          border: 1px solid rgba(16, 185, 129, .22);
          background: rgba(16, 185, 129, .12);
          color: #047857;
          padding: 0 9px;
          font-size: 11px;
          font-weight: 950;
          line-height: 1;
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
          border: 1px solid rgba(15, 118, 110, .20);
          border-radius: 13px;
          background: rgba(45, 212, 191, .14);
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
        .theory-actions a {
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
          cursor: pointer;
        }

        .theory-actions .theory-primary-action {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
        }

        .theory-actions button svg {
          transition: transform .18s ease;
        }

        .theory-card.expanded .theory-actions button[aria-expanded="true"] svg {
          transform: rotate(180deg);
        }

        .theory-actions a,
        .theory-actions .theory-secondary-action {
          border: 1px solid var(--sfm-border);
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
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
          background: rgba(45, 212, 191, .14);
          border: 1px solid rgba(15, 118, 110, .20);
          padding: 12px;
        }

        .mistake-block {
          border-radius: 16px;
          border: 1px solid rgba(245, 158, 11, .22);
          background: rgba(245, 158, 11, .08);
          padding: 12px;
        }

        .tool-block small {
          display: block;
          margin-top: 8px;
          color: var(--sfm-muted-readable);
          font-weight: 850;
          line-height: 1.55;
        }

        .theory-mark-read {
          width: fit-content;
          min-height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(15, 118, 110, .22);
          background: rgba(45, 212, 191, .14);
          color: #0F766E;
          padding: 0 12px;
          font: 950 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .theory-mark-read:disabled {
          cursor: default;
          opacity: .72;
        }

        .starter-theory-grid,
        .examples-grid,
        .tools-grid {
          align-items: stretch;
          grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)) !important;
          gap: 16px !important;
        }

        .starter-theory-card,
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

        .starter-theory-card h3,
        .smart-tool-card h3,
        .practical-example-card h3 {
          margin: 0;
          color: var(--sfm-heading);
          font-size: 18px;
          line-height: 1.35;
        }

        .starter-theory-card p,
        .smart-tool-card p,
        .practical-example-card p {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.6;
          font-weight: 800;
        }

        .tool-category-tabs {
          border-radius: 18px;
          border: 1px solid var(--sfm-border);
          background: var(--sfm-card);
          padding: 10px !important;
        }

        .tool-theory-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          min-width: 0;
        }

        .tool-theory-badges span {
          min-height: 26px;
          display: inline-flex;
          align-items: center;
          max-width: 100%;
          border-radius: 999px;
          border: 1px solid rgba(24, 212, 212, .18);
          background: rgba(24, 212, 212, .08);
          color: var(--sfm-primary-hover);
          padding: 0 9px;
          font-size: 11px;
          font-weight: 950;
          overflow-wrap: anywhere;
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

        .starter-theory-card button {
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

        .debt-payoff-fields,
        .risk-question-list {
          grid-column: 1 / -1;
          display: grid;
          gap: 12px;
          min-width: 0;
        }

        .debt-row-card {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
          gap: 10px;
          align-items: end;
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: 16px;
          background: var(--sfm-card);
          padding: 12px;
        }

        .calculator-prefill,
        .calculator-remove {
          min-height: 44px;
          width: fit-content;
          border-radius: 13px;
          border: 1px solid rgba(24, 212, 212, .26);
          background: rgba(24, 212, 212, .10);
          color: var(--sfm-primary-hover);
          padding: 0 13px;
          font: 950 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .calculator-prefill:disabled {
          cursor: not-allowed;
          opacity: .6;
        }

        .calculator-remove {
          border-color: rgba(239, 68, 68, .22);
          background: rgba(239, 68, 68, .08);
          color: #B91C1C;
        }

        .risk-question {
          min-width: 0;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: 16px;
          background: var(--sfm-card);
          padding: 12px;
        }

        .risk-question legend {
          color: var(--sfm-heading);
          font-weight: 950;
          padding: 0 4px;
        }

        .risk-question div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .risk-question button {
          min-height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(29, 140, 255, .18);
          background: var(--sfm-light-card);
          color: var(--sfm-heading);
          padding: 0 12px;
          font: 900 12px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .risk-question button.selected {
          border-color: rgba(24, 212, 212, .42);
          background: linear-gradient(135deg, rgba(29, 140, 255, .18), rgba(24, 212, 212, .18));
          color: var(--sfm-primary-hover);
        }

        .calculator-mode-actions {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .calculator-mode-actions button {
          min-height: 40px;
          border: 0;
          border-radius: 13px;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          padding: 0 13px;
          font: 950 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
        }

        .calculator-mode-actions button:disabled {
          cursor: not-allowed;
          opacity: .58;
          filter: grayscale(.15);
        }

        .calculator-mode-actions span {
          color: var(--sfm-muted-readable);
          font-size: 12px;
          font-weight: 950;
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

        .calculator-result-group {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .calculator-result-group > strong {
          color: var(--sfm-heading);
          font-size: 14px;
        }

        .calculator-result-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
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

        .calculator-wide {
          grid-column: 1 / -1;
        }

        .calculator-success {
          border: 1px solid rgba(16, 185, 129, .20);
          background: rgba(16, 185, 129, .10);
          color: #047857;
        }

        .calculator-list-card {
          border: 1px solid var(--sfm-border);
          border-radius: 16px;
          background: var(--sfm-card);
          padding: 12px;
          display: grid;
          gap: 8px;
        }

        .calculator-list-card strong {
          color: var(--sfm-heading);
          font-size: 14px;
        }

        .calculator-list-card ul {
          margin: 0;
          padding-inline-start: 18px;
          display: grid;
          gap: 6px;
        }

        .calculator-list-card li {
          color: var(--sfm-body);
          line-height: 1.55;
          font-weight: 820;
        }

        .calculator-list-card p {
          margin: 0;
          color: var(--sfm-body);
          line-height: 1.65;
          font-weight: 820;
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
        .dark .financial-theories-shell .goal-path-card,
        .dark .financial-theories-shell .learning-level-panel,
        .dark .financial-theories-shell .theory-accordion,
        .dark .financial-theories-shell .theory-of-day-card,
        .dark .financial-theories-shell .learning-progress-metrics span,
        .dark .financial-theories-shell .starter-theory-card,
        .dark .financial-theories-shell .smart-tool-card,
        .dark .financial-theories-shell .practical-example-card {
          border-color: var(--sfm-border);
          background: var(--sfm-card) !important;
          box-shadow: 0 18px 44px rgba(0, 0, 0, .22);
        }

        .dark .financial-theories-shell .theory-search,
        .dark .financial-theories-shell .guided-filter-summary,
        .dark .financial-theories-shell .detail-block th,
        .dark .financial-theories-shell .detail-block td,
        .dark .financial-theories-shell .calculator-field input,
        .dark .financial-theories-shell .calculator-field select {
          background: var(--sfm-input-bg);
        }

        .dark .financial-theories-shell .calculator-panel,
        .dark .financial-theories-shell .calculator-result-card,
        .dark .financial-theories-shell .calculator-list-card,
        .dark .financial-theories-shell .calculator-total,
        .dark .financial-theories-shell .debt-row-card,
        .dark .financial-theories-shell .risk-question,
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

        .dark .financial-theories-shell .learning-progress-card,
        .dark .financial-theories-shell .theory-meta-row,
        .dark .financial-theories-shell .featured-example-box,
        .dark .financial-theories-shell .tool-block,
        .dark .financial-theories-shell .theory-mark-read {
          border-color: rgba(47, 214, 192, .25) !important;
          background: rgba(47, 214, 192, .10) !important;
        }

        .dark .financial-theories-shell .learning-progress-copy span,
        .dark .financial-theories-shell .theory-level-badge,
        .dark .financial-theories-shell .theory-mark-read {
          color: #E8EEF6;
        }

        .dark .financial-theories-shell .mistake-block {
          border-color: rgba(245, 185, 66, .25);
          background: rgba(245, 185, 66, .10);
        }

        .dark .financial-theories-shell .theory-read-badge {
          background: rgba(16, 185, 129, .16);
          color: #86EFAC;
          border-color: rgba(16, 185, 129, .28);
        }

        @media (min-width: 1320px) {
          .theory-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1024px) {
          .learning-overview,
          .why-card,
          .theory-of-day-card,
          .learning-level-panel,
          .tool-controls,
          .theories-cta {
            grid-template-columns: 1fr;
          }

          .goal-path-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .learning-level-tabs {
            justify-content: flex-start;
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
          .theory-of-day-card button,
          .smart-tool-card a,
          .smart-tool-card button,
          .calculator-actions button,
          .calculator-mode-actions button,
          .starter-theory-card button,
          .cta-actions a {
            width: 100%;
          }

          .theory-card-head {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .theory-controls {
            grid-template-columns: 1fr;
          }

          .goal-path-grid,
          .learning-progress-metrics {
            grid-template-columns: 1fr;
          }

          .goal-path-card {
            min-height: auto;
          }

          .theory-of-day-card {
            padding: 14px;
          }

          .theory-of-day-icon {
            width: 46px;
            height: 46px;
          }

          .theory-accordion-head,
          .theory-accordion-body {
            padding-inline: 12px;
          }

          .theory-accordion-body {
            padding-bottom: 12px;
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
          .calculator-form-grid,
          .calculator-result-grid,
          .debt-row-card {
            grid-template-columns: 1fr;
          }

          .debt-row-card {
            align-items: stretch;
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
