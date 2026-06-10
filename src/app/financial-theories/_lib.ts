import {
  WalletCards, PiggyBank, Sparkles, Layers3, ShieldAlert, Landmark,
  Brain, Gauge, Target, Calculator, Search,
} from 'lucide-react';
import {
  FINANCIAL_THEORIES,
  THEORY_CALCULATORS,
  getFinancialTheoryText,
  type FinancialTheory,
  type FinancialTheoryLang,
  type LocalizedText,
  type TheoryCalculatorId,
} from '@/lib/financial-theories';

export const THEORY_ICONS = [
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

export const UI_COPY: Record<FinancialTheoryLang, Record<string, string>> = {
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
    toolSearchResults: 'نتائج البحث: {count}',
    allToolsDisplayed: 'تم عرض جميع الأدوات ({count})',
    toolsVisibleCount: 'يعرض {visible} من {total} أداة',
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
    toolSearchResults: 'Search results: {count}',
    allToolsDisplayed: 'All tools are displayed ({count})',
    toolsVisibleCount: 'Showing {visible} of {total} tools',
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
    toolSearchResults: 'Résultats de recherche : {count}',
    allToolsDisplayed: 'Tous les outils sont affichés ({count})',
    toolsVisibleCount: '{visible} outil(s) affiché(s) sur {total}',
    noTools: 'Aucun outil correspondant.',
    noToolsDescription: 'Essayez une autre recherche ou choisissez un autre onglet.',
  },
};

export const THEORY_PROGRESS_STORAGE_KEY = 'sfm:financial-theories:read';
export const TOOL_PROGRESS_STORAGE_KEY = 'sfm:financial-theories:tools-used';

export type LearningGoalId = 'spending' | 'saving' | 'debt' | 'investing' | 'emergency' | 'freedom';
export type LearningLevelId = 'beginner' | 'intermediate' | 'advanced';
export type LearningSectionId = 'budget-basics' | 'saving-emergency' | 'investing' | 'debt-risk' | 'long-planning' | 'freedom';
export type GuidedToolCategoryId = 'all' | 'budget' | 'saving' | 'debt' | 'investing' | 'risk';

export const LEARNING_GOALS: Array<{
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

export const LEARNING_LEVELS: Array<{ id: LearningLevelId; label: LocalizedText; description: LocalizedText }> = [
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

export const LEVEL_ORDER: Record<LearningLevelId, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export const THEORY_LEVELS: Record<string, LearningLevelId> = {
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

export const LEARNING_SECTIONS: Array<{
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

export const GUIDED_TOOL_TABS: Array<{ id: GuidedToolCategoryId; label: LocalizedText; toolIds: TheoryCalculatorId[] }> = [
  { id: 'all', label: { ar: 'الكل', en: 'All', fr: 'Tout' }, toolIds: THEORY_CALCULATORS.map(tool => tool.id) },
  { id: 'budget', label: { ar: 'الميزانية', en: 'Budget', fr: 'Budget' }, toolIds: ['financial-health', 'salary-split', 'affordability'] },
  { id: 'saving', label: { ar: 'الادخار', en: 'Saving', fr: 'Épargne' }, toolIds: ['goal-plan', 'emergency-fund', 'compound-interest'] },
  { id: 'debt', label: { ar: 'الديون', en: 'Debt', fr: 'Dette' }, toolIds: ['debt-plan', 'debt-payoff', 'loan-financing'] },
  { id: 'investing', label: { ar: 'الاستثمار', en: 'Investing', fr: 'Investissement' }, toolIds: ['compound-interest', 'risk-tolerance', 'opportunity-cost', 'retirement-fire'] },
  { id: 'risk', label: { ar: 'المخاطر', en: 'Risk', fr: 'Risque' }, toolIds: ['risk-tolerance', 'financial-health', 'rent-vs-buy', 'affordability'] },
];

export function localeFrom(value: string): FinancialTheoryLang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

export function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function buildProgressText(template: string, completed: number, total: number) {
  return template
    .replace('{completed}', completed.toString())
    .replace('{total}', total.toString());
}

export function readProgressFromStorage() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(THEORY_PROGRESS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

export function saveProgressToStorage(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(THEORY_PROGRESS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

export function readToolProgressFromStorage() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(TOOL_PROGRESS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

export function saveToolProgressToStorage(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOOL_PROGRESS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

export function relatedTheory(id: string) {
  return FINANCIAL_THEORIES.find(theory => theory.id === id);
}

export function theoryLevel(theory: FinancialTheory): LearningLevelId {
  return THEORY_LEVELS[theory.id] ?? 'intermediate';
}

export function levelAllows(theory: FinancialTheory, activeLevel: LearningLevelId) {
  return LEVEL_ORDER[theoryLevel(theory)] <= LEVEL_ORDER[activeLevel];
}

export function theoryMatchesQuery(theory: FinancialTheory, locale: FinancialTheoryLang, normalizedQuery: string) {
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

export function commonMistakeCopy(theory: FinancialTheory, lang: FinancialTheoryLang) {
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

export function applyCopy(lang: FinancialTheoryLang, tool: string) {
  if (lang === 'en') {
    return `Use ${tool} as the practical workspace for this idea when your real data is available.`;
  }
  if (lang === 'fr') {
    return `Utilisez ${tool} comme espace pratique pour cette idée lorsque vos données réelles sont disponibles.`;
  }
  return `استخدم ${tool} كمساحة عملية لتطبيق هذه الفكرة عندما تكون بياناتك الحقيقية متوفرة.`;
}

export type CalculatorId = Exclude<TheoryCalculatorId, 'zakat-shortcut'>;

export type FinancialHealthSnapshot = {
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

export const ACTIVE_CALCULATORS = new Set<string>(
  THEORY_CALCULATORS.filter(tool => !tool.href).map(tool => tool.id),
);
export const HEALTH_DATA_TABLES = [
  { key: 'income', table: 'monthly_income_sources' },
  { key: 'expenses', table: 'expense_items' },
  { key: 'savings', table: 'savings_items' },
];

export const EMPTY_HEALTH_SNAPSHOT: FinancialHealthSnapshot = {
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

export const THEORY_CALCULATOR_MAP: Record<string, CalculatorId> = {
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

export function isCalculatorId(value: string): value is CalculatorId {
  return ACTIVE_CALCULATORS.has(value);
}

export function calculatorForTheory(theory: FinancialTheory): CalculatorId | null {
  return THEORY_CALCULATOR_MAP[theory.id] ?? null;
}

export function asNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCalculatorDate(months: number, lang: FinancialTheoryLang) {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.max(0, months));
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

export function monthsUntil(targetDate: string) {
  if (!targetDate) return 0;
  const target = new Date(`${targetDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30.4375)));
}

export function formatPercent(value: number, lang: FinancialTheoryLang) {
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(Number.isFinite(value) ? value : 0) + '%';
}

export function ratioPercent(numerator: number, denominator: number) {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function financialHealthScore(income: number, expenses: number, savings: number, debts: number) {
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


export type DebtRow = { id: string; name: string; balance: string; rate: string; minimum: string };
export type LearningSection = (typeof LEARNING_SECTIONS)[number];
