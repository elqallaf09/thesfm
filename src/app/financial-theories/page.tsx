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
import { CardsGrid, StatGrid } from '@/components/layout/LayoutPrimitives';
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
  THEORY_CALCULATOR_CATEGORIES,
  THEORY_CALCULATOR_TEXT,
  getFinancialTheoryText,
  type FinancialTheory,
  type FinancialTheoryCategoryId,
  type FinancialTheoryLang,
  type LocalizedText,
  type TheoryCalculatorCategoryId,
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
  },
};

const STARTER_THEORIES: Array<{ theoryId: string; reason: LocalizedText }> = [
  {
    theoryId: 'personal-budgeting',
    reason: {
      ar: 'ابدأ بها لأنها تساعدك على فهم دخلك ومصاريفك قبل الانتقال للاستثمار.',
      en: 'Start here because it helps you understand income and expenses before moving into investing.',
      fr: 'Commencez ici, car elle aide à comprendre revenus et dépenses avant de passer à l’investissement.',
    },
  },
  {
    theoryId: 'emergency-fund',
    reason: {
      ar: 'تمنحك أساسًا يحمي خطتك من المصاريف المفاجئة.',
      en: 'It gives you a base that protects your plan from unexpected expenses.',
      fr: 'Elle donne une base qui protège votre plan contre les dépenses imprévues.',
    },
  },
  {
    theoryId: 'diversification',
    reason: {
      ar: 'تشرح لماذا لا ينبغي الاعتماد على أصل واحد عند بناء محفظة استثمارية.',
      en: 'It explains why a portfolio should not depend on a single asset.',
      fr: 'Elle explique pourquoi un portefeuille ne doit pas dépendre d’un seul actif.',
    },
  },
];

const THEORY_PROGRESS_STORAGE_KEY = 'sfm:financial-theories:read';

const SUMMARY_STATS: Array<{ kind: 'total' | 'essential' | 'static'; label: LocalizedText; value?: string; icon: typeof BookOpen }> = [
  {
    kind: 'total',
    label: { ar: 'نظرية مالية', en: 'financial theories', fr: 'théories financières' },
    icon: BookOpen,
  },
  {
    kind: 'essential',
    label: { ar: 'منها أساسية', en: 'are essential', fr: 'sont essentielles' },
    icon: Sparkles,
  },
  {
    kind: 'static',
    value: '5',
    label: { ar: 'أدوات ذكية', en: 'Smart Tools', fr: 'Outils intelligents' },
    icon: Calculator,
  },
  {
    kind: 'static',
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
      ar: 'بدل عبارة عامة مثل “أريد الادخار”، يتم تحديد مبلغ ومدة وخطوة شهرية.',
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
      ar: 'اسأل: ما الخيار الثاني الأفضل لهذا المبلغ؟',
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
          {isOpen ? text.hideTheory : text.readTheory}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {hasRelatedTool && theory.sfmToolHref ? (
          <Link href={theory.sfmToolHref} className="theory-secondary-action" aria-label={`${text.openTool}: ${tool}`}>
            {text.openTool}
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
            {text.openTool}
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
  const [activeCategory, setActiveCategory] = useState<FinancialTheoryCategoryId>('all');
  const [activeToolCategory, setActiveToolCategory] = useState<TheoryCalculatorCategoryId>('all');
  const [query, setQuery] = useState('');
  const [openTheory, setOpenTheory] = useState<string | null>(null);
  const [readTheoryIds, setReadTheoryIds] = useState<Set<string>>(() => new Set());
  const [activeCalculator, setActiveCalculator] = useState<CalculatorId | null>(null);
  const [healthSnapshot, setHealthSnapshot] = useState<FinancialHealthSnapshot>(EMPTY_HEALTH_SNAPSHOT);
  const defaultCurrency = userCurrency || 'KWD';

  useEffect(() => {
    setReadTheoryIds(readProgressFromStorage());
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

  function openCalculator(calculatorId: CalculatorId) {
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
  const essentialCount = useMemo(
    () => FINANCIAL_THEORIES.filter(theory => theory.isEssential).length,
    [],
  );
  const completedCount = useMemo(
    () => FINANCIAL_THEORIES.filter(theory => readTheoryIds.has(theory.id)).length,
    [readTheoryIds],
  );
  const progressPercent = totalTheories > 0 ? Math.round((completedCount / totalTheories) * 100) : 0;

  const categoryTabs: PageTabItem[] = useMemo(() => (
    FINANCIAL_THEORY_CATEGORIES.map(category => ({
      id: category.id,
      label: getFinancialTheoryText(category.label, locale),
      count: category.id === 'all'
        ? FINANCIAL_THEORIES.length
      : FINANCIAL_THEORIES.filter(theory => theory.category === category.id).length,
    }))
  ), [locale]);

  const toolCategoryTabs: PageTabItem[] = useMemo(() => (
    THEORY_CALCULATOR_CATEGORIES.map(category => ({
      id: category.id,
      label: getFinancialTheoryText(category.label, locale),
      count: category.id === 'all'
        ? THEORY_CALCULATORS.length
        : THEORY_CALCULATORS.filter(tool => tool.category === category.id).length,
    }))
  ), [locale]);

  const filteredCalculators = useMemo(() => (
    THEORY_CALCULATORS.filter(tool => activeToolCategory === 'all' || tool.category === activeToolCategory)
  ), [activeToolCategory]);

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

  const starterTheories = useMemo(() => (
    STARTER_THEORIES
      .map(item => {
        const theory = relatedTheory(item.theoryId);
        return theory ? { theory, reason: item.reason } : null;
      })
      .filter(Boolean) as Array<{ theory: FinancialTheory; reason: LocalizedText }>
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

        <AppCard className="learning-progress-card" aria-label={buildProgressText(text.progressText, completedCount, totalTheories)}>
          <div className="learning-progress-copy">
            <span>{buildProgressText(text.progressText, completedCount, totalTheories)}</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="learning-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </AppCard>

        <section className="learning-overview" aria-labelledby="why-theories-matter">
          <StatGrid className="learning-stats-grid">
            {SUMMARY_STATS.map(stat => {
              const Icon = stat.icon;
              const value = stat.kind === 'total'
                ? totalTheories.toString()
                : stat.kind === 'essential'
                  ? essentialCount.toString()
                  : stat.value ?? '';
              return (
                <AppCard key={getFinancialTheoryText(stat.label, locale)} className="theory-stat-card">
                  <span aria-hidden="true"><Icon size={20} /></span>
                  <div>
                    <strong>{value}</strong>
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
            <span>{text.educationalExample}</span>
            <h2 id="featured-theories-title">{text.starterTitle}</h2>
            <p>{text.starterSubtitle}</p>
          </div>

          <CardsGrid className="starter-theory-grid">
            {starterTheories.map(({ theory, reason }) => {
              const title = getFinancialTheoryText(theory.title, locale);
              return (
                <AppCard key={theory.id} className="starter-theory-card">
                  <span className="featured-index">{String(theory.number).padStart(2, '0')}</span>
                  <h3>{title}</h3>
                  <p>{getFinancialTheoryText(reason, locale)}</p>
                  {readTheoryIds.has(theory.id) ? <span className="theory-read-badge">{text.done}</span> : null}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCategory('all');
                      setQuery('');
                      setOpenTheory(theory.id);
                      markTheoryRead(theory.id);
                      document.getElementById('theory-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    aria-label={`${text.readTheory}: ${title}`}
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

          <PageTabs
            tabs={toolCategoryTabs}
            active={activeToolCategory}
            onChange={id => {
              setActiveToolCategory(id as TheoryCalculatorCategoryId);
              setActiveCalculator(null);
            }}
            ariaLabel={text.smartToolsTitle}
            className="financial-theory-tabs tool-category-tabs"
          />

          <CardsGrid className="tools-grid">
            {filteredCalculators.map((tool, index) => {
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
                    <Link href={tool.href} className="smart-tool-action" aria-label={`${getFinancialTheoryText(tool.cta, locale)}: ${title}`}>
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
        .dark .financial-theories-shell .starter-theory-card,
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
        .dark .financial-theories-shell .tool-block,
        .dark .financial-theories-shell .theory-mark-read {
          border-color: rgba(47, 214, 192, .25) !important;
          background: rgba(47, 214, 192, .10) !important;
        }

        .dark .financial-theories-shell .learning-progress-copy span,
        .dark .financial-theories-shell .theory-mark-read {
          color: #E8EEF6;
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
