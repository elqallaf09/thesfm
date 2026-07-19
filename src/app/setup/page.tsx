'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  ChevronDown,
  CheckCircle2,
  CircleDollarSign,
  Flag,
  HandHeart,
  LineChart,
  ListChecks,
  Loader2,
  PiggyBank,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';
import { formatCurrency } from '@/lib/format';
import { getCurrency } from '@/lib/currencies';
import { useCurrency } from '@/lib/useCurrency';
import { investmentValueInCurrency } from '@/lib/investments/currencyIntegrity';
import {
  ExistingDataCard,
  Field,
  IncomeDecisionCard,
  ProgressPanel,
  RecurringIncomeToggle,
  ReportCard,
  SelectField,
  Stepper,
  SummaryCard,
  ToggleRow,
} from '@/components/setup/SetupSubComponents';

type Lang = 'ar' | 'en' | 'fr';
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type SetupSummary = {
  income: number;
  expenses: number;
  goals: number;
  savings: number;
  investments: number;
  projects: number;
  incomeTotal: number;
  expenseTotal: number;
  savingsTotal: number;
  investmentTotal: number;
  goalTargetTotal: number;
  goalRemainingTotal: number;
  additionalIncomeSources: number;
  expectedRemaining: number;
  recommendedSavingPercent: number;
  monthlySavingSuggestion: number;
  firstGoalCompletionDate: string;
};

type ExistingSetupData = {
  profile: any | null;
  income: any[];
  expenses: any[];
  goals: any[];
  savings: any[];
  investments: any[];
  projects: any[];
};

const EMPTY_EXISTING_DATA: ExistingSetupData = {
  profile: null,
  income: [],
  expenses: [],
  goals: [],
  savings: [],
  investments: [],
  projects: [],
};

const COPY = {
  ar: {
    pageName: 'إعداد الحساب',
    eyebrow: 'إعداد الحساب',
    title: 'مرحباً بك في THE SFM',
    subtitle: 'سنساعدك على إعداد مديرك المالي الذكي خلال دقائق، بناءً على بياناتك الحقيقية فقط.',
    realData: 'لا يتم إنشاء أي بيانات تجريبية. يتم حفظ ما تدخله فقط.',
    start: 'ابدأ إعداد حسابك',
    skipNow: 'تخطي حالياً',
    useExisting: 'استخدام البيانات الحالية',
    editData: 'تعديل البيانات',
    existingIncomeFound: 'تم العثور على دخلك الشهري الحالي',
    existingIncomeHint: 'يمكنك استخدام هذه البيانات أو تعديلها.',
    existingExpensesFound: 'تم العثور على مصروفاتك الحالية',
    existingGoalsFound: 'تم العثور على أهدافك المالية الحالية',
    existingDataHint: 'يمكنك استخدام البيانات الحالية أو تعديلها قبل المتابعة.',
    insufficientData: 'لم يتم العثور على بيانات كافية',
    builtFromExisting: 'تم بناء خطتك المالية الأولية بناءً على بياناتك الحالية',
    next: 'التالي',
    back: 'السابق',
    finish: 'إنهاء الإعداد',
    saving: 'جاري حفظ الإعداد...',
    goDashboard: 'الانتقال إلى لوحة التحكم',
    setupPlanTitle: 'ما الذي ستقوم بإعداده؟',
    setupPlanSubtitle: 'خطوات إرشادية فقط. يمكنك تخطي أي خطوة والعودة لها لاحقاً.',
    currentStep: 'الخطوة الحالية',
    completedStep: 'مكتملة',
    upcomingStep: 'قادمة',
    realDataLong: 'لن تتم إضافة أي بيانات مالية تلقائياً. سيتم حفظ البيانات التي أدخلتها فقط، ويمكنك تعديلها أو إكمالها لاحقاً.',
    optional: 'اختياري',
    required: 'مطلوب',
    yes: 'نعم، إضافة بيانات',
    skip: 'تخطي',
    incomeYes: 'إضافة بيانات الدخل',
    skipCurrently: 'تخطي حاليًا',
    loading: 'جاري التحميل...',
    signInTitle: 'سجّل الدخول لإعداد حسابك.',
    signInAction: 'تسجيل الدخول',
    errorAuth: 'سجّل الدخول قبل حفظ الإعداد.',
    errorRequired: 'أكمل الحقول المطلوبة أو اختر تخطي هذه الخطوة.',
    errorAmount: 'يجب أن تكون المبالغ أرقاماً صحيحة أكبر من أو تساوي صفر.',
    errorGoalCurrent: 'المبلغ الحالي لا يمكن أن يتجاوز المبلغ المستهدف.',
    errorDate: 'أدخل تاريخاً صحيحاً.',
    saved: 'تم إعداد حسابك بنجاح',
    savedSub: 'تم حفظ البيانات التي أدخلتها فقط. الخطوات التي تخطيتها بقيت فارغة.',
    initialPlanBuilt: 'تم بناء خطتك المالية الأولية',
    completionTitle: 'تم بناء خطتك المالية الأولية بنجاح',
    completionDescription: 'تم حفظ البيانات التي أدخلتها فقط، ويمكنك تعديل أو إضافة أي بيانات لاحقاً من لوحة التحكم.',
    dashboardMiniTitle: 'لوحة خطتك المالية الأولية',
    dashboardMiniSubtitle: 'نظرة تنفيذية مختصرة على ما حفظته، وما يحتاج إلى استكمال، والخطوة التالية داخل THE SFM.',
    planSnapshotTitle: 'ملخص سريع للخطة',
    planSnapshotSubtitle: 'كل بطاقة تعرض بيانات محفوظة فعلياً من إعدادك فقط.',
    financialPulse: 'المؤشرات الأساسية',
    dataHealthTitle: 'جاهزية بيانات الخطة',
    dataHealthSubtitle: 'توضح ما اكتمل وما يحتاج إلى بيانات إضافية لتحسين التحليل.',
    nextStepTitle: 'الخطوة التالية',
    nextStepBody: 'افتح لوحة التحكم لمراجعة الأرقام، متابعة الفائض، وربط الخطة بالتقارير اليومية.',
    dashboardPrimaryHint: 'ابدأ من هنا لمتابعة الخطة وتعديلها.',
    readyStatus: 'جاهزة',
    needsMoreData: 'تحتاج بيانات',
    currencyReady: 'العملة الافتراضية محددة',
    incomeReady: 'الدخل الشهري محفوظ',
    expensesReady: 'المصروفات الشهرية محفوظة',
    goalsReady: 'هدف مالي واحد على الأقل',
    growthDataReady: 'ادخار أو استثمار أو مشروع',
    expenseRatio: 'نسبة المصروفات',
    surplusRatio: 'نسبة الفائض',
    reportMiniHint: 'افتح ملخصاً سريعاً قبل الانتقال إلى التقارير.',
    expectedSurplus: 'الفائض المتوقع',
    expectedRemaining: 'المتبقي من دخلك المتوقع',
    expectedMonthlyIncome: 'الدخل الشهري المتوقع',
    recommendedSavingPercent: 'أفضل نسبة ادخار لك',
    monthlySavingSuggestion: 'اقتراح الادخار الشهري',
    firstGoalCompletion: 'موعد إنجاز الهدف الأول المتوقع',
    notEnoughForEstimate: 'بيانات غير كافية للتقدير',
    noGoalEstimateTitle: 'لا توجد بيانات كافية لتقدير موعد تحقيق الهدف',
    noGoalEstimateHint: 'أضف مبلغ الهدف والمبلغ الشهري المخصص له للحصول على تقدير أدق.',
    goalEstimateDesc: 'تقدير مبني على المبلغ المتبقي ونسبة الادخار المقترحة.',
    currencyCardDesc: 'سيتم استخدام هذه العملة في العرض والتحليلات.',
    incomeCardDesc: 'إجمالي مصادر الدخل التي حفظتها.',
    noIncomeCardDesc: 'لم يتم حفظ دخل بعد. يمكنك إضافته لاحقاً من لوحة التحكم.',
    remainingCardDesc: 'الدخل بعد طرح المصروفات الشهرية المحفوظة.',
    savingPercentCardDesc: 'نسبة مبدئية مبنية على الفائض المتاح.',
    expensesCardDesc: 'بنود مصروفات شهرية محفوظة فعلياً.',
    investmentsCardDesc: 'استثمارات أضفتها أنت أو كانت محفوظة سابقاً.',
    goalsCardDesc: 'أهداف مالية حقيقية محفوظة للمتابعة.',
    projectsCardDesc: 'مشاريع أو أفكار مشاريع أضفتها أنت.',
    savingsCardDesc: 'مدخرات محفوظة يمكن متابعتها لاحقاً.',
    additionalIncomeSources: 'مصادر الدخل الإضافية',
    additionalIncomeCardDesc: 'مصادر دخل غير الراتب ضمن بياناتك المحفوظة.',
    dataPoints: 'نقاط بيانات محفوظة',
    recommendationTitle: 'التوصية الأولية من THE SFM',
    recommendationBasedOn: 'مبنية على البيانات المحفوظة في الإعداد فقط.',
    recNoIncome: 'أضف دخلك الشهري حتى يتمكن النظام من حساب الفائض ونسب الادخار بدقة.',
    recNoIncomeMeta: 'لا توجد مصادر دخل محفوظة حالياً.',
    recGoodRemaining: 'وضعك المالي الأولي جيد، ويمكنك البدء بتوزيع الفائض بين الادخار والاستثمار.',
    recGoodRemainingMeta: 'الفائض المتوقع {amount}، ويمثل {percent} من الدخل.',
    recHighExpenses: 'مصروفاتك تبدو مرتفعة مقارنة بالدخل. ننصح بمراجعة البنود المتكررة.',
    recHighExpensesMeta: 'المصروفات تمثل {percent} من الدخل الشهري المتوقع.',
    recNoGoals: 'أضف هدفاً مالياً واحداً على الأقل حتى يتمكن النظام من بناء خطة أوضح.',
    recNoGoalsMeta: 'لم يتم حفظ أي هدف مالي حتى الآن.',
    recNoInvestments: 'يمكنك لاحقاً إضافة استثماراتك لتحليل أدائها ومقارنتها بعملتك الافتراضية.',
    recNoInvestmentsMeta: 'لا توجد استثمارات محفوظة ضمن الإعداد الحالي.',
    recBalanced: 'تم حفظ بياناتك الأولية، والخطوة التالية هي مراجعتها من لوحة التحكم وربطها بالتقارير.',
    recBalancedMeta: 'يعتمد الملخص على {count} نقاط بيانات محفوظة.',
    progressTitle: 'الخطوة المالية 9 - إنهاء الإعداد',
    progressSubtitle: 'اكتمل إعداد الخطة الأولية بنسبة 100%.',
    progressComplete: 'مكتمل 100%',
    stepListTitle: 'خطوات الإعداد',
    addMoreData: 'إضافة بيانات أخرى',
    viewInitialReport: 'عرض التقرير الأولي',
    reportTitle: 'التقرير المالي الأولي',
    reportSubtitle: 'ملخص سريع من البيانات التي أدخلتها أو كانت محفوظة مسبقاً فقط.',
    reportIncome: 'ملخص الدخل',
    reportExpenses: 'ملخص المصروفات',
    reportSavings: 'ملخص الادخار',
    reportInvestments: 'ملخص الاستثمار',
    reportGoals: 'ملخص الأهداف',
    reportRecommendation: 'التوصية الأولية',
    reportNoData: 'لا توجد بيانات كافية لهذا القسم بعد.',
    reportGo: 'الانتقال للتقارير',
    closeReport: 'إغلاق التقرير',
    steps: [
      'مرحباً بك',
      'العملة الافتراضية',
      'الدخل الشهري',
      'المصروفات الشهرية',
      'الأهداف المالية',
      'المدخرات والاستثمارات',
      'الزكاة والأعمال الخيرية',
      'المشاريع',
      'إنهاء الإعداد',
    ],
    currencyTitle: 'اختر عملتك الافتراضية',
    currencyBody: 'ستستخدم THE SFM هذه العملة في العرض والتحليلات. يمكنك تغييرها لاحقاً من الملف الشخصي.',
    incomeTitle: 'هل تريد إضافة دخلك الشهري الآن؟',
    incomeBody: 'أضف دخلك الفعلي فقط إذا كنت جاهزًا، أو يمكنك تخطي هذه الخطوة وإكمالها لاحقًا.',
    incomeFormTitle: 'بيانات الدخل الشهري',
    incomeFormBody: 'أدخل بيانات دخلك الفعلي فقط. لن يتم حفظ الحقول الفارغة أو إنشاء بيانات تلقائية.',
    incomeName: 'اسم الدخل',
    incomeNamePh: 'مثال: الراتب الشهري',
    incomeAmount: 'المبلغ',
    incomeType: 'نوع الدخل',
    receivedDate: 'تاريخ الاستلام',
    recurringMonthly: 'دخل متكرر شهريًا',
    recurringMonthlyHint: 'فعّل هذا الخيار إذا كان هذا الدخل يتكرر كل شهر.',
    expensesTitle: 'أضف مصروفاتك الأساسية إن رغبت',
    expensesBody: 'احفظ فقط البنود التي تعرف مبلغها الفعلي أو تقديرك الشخصي لها. البنود الفارغة لن يتم حفظها.',
    rent: 'السكن / الإيجار',
    food: 'الطعام',
    transport: 'المواصلات',
    subscriptions: 'الاشتراكات',
    loans: 'القروض',
    other: 'أخرى',
    goalsTitle: 'هل لديك هدف مالي تريد متابعته؟',
    goalName: 'اسم الهدف',
    goalNamePh: 'مثال: صندوق طوارئ',
    targetAmount: 'المبلغ المستهدف',
    currentAmount: 'المبلغ الحالي',
    targetDate: 'تاريخ الهدف',
    priority: 'الأولوية',
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
    savingsTitle: 'المدخرات والاستثمارات',
    hasSavings: 'لدي مدخرات',
    hasInvestments: 'لدي استثمارات',
    savingsType: 'نوع المدخرات',
    savingsTypePh: 'مثال: حساب توفير',
    investmentType: 'نوع الاستثمار',
    investmentTypePh: 'مثال: صندوق استثماري',
    zakatTitle: 'الزكاة والأعمال الخيرية',
    zakatBody: 'اختر ما تريد متابعته لاحقاً. لن يتم إنشاء أصول زكاة أو تبرعات وهمية.',
    followZakat: 'أريد متابعة الزكاة',
    followCharity: 'أريد متابعة التبرعات',
    notNow: 'ليس الآن',
    projectsTitle: 'هل لديك مشروع تجاري أو فكرة مشروع؟',
    projectName: 'اسم المشروع',
    projectType: 'نوع المشروع',
    capital: 'رأس المال',
    projectStatus: 'الحالة',
    summaryCurrency: 'العملة المختارة',
    addedIncome: 'الدخل المضاف',
    addedExpenses: 'المصروفات المضافة',
    addedGoals: 'الأهداف المضافة',
    addedSavings: 'المدخرات المضافة',
    addedInvestments: 'الاستثمارات المضافة',
    addedProjects: 'المشاريع المضافة',
    openZakat: 'فتح صفحة الزكاة',
    openCharity: 'فتح صفحة الأعمال الخيرية',
  },
  en: {
    pageName: 'Account Setup',
    eyebrow: 'Account Setup',
    title: 'Welcome to THE SFM',
    subtitle: 'We’ll help you set up your smart financial manager in a few minutes, based only on your real data.',
    realData: 'No demo data is created. Only what you enter will be saved.',
    start: 'Start setup',
    skipNow: 'Skip for now',
    useExisting: 'Use existing data',
    editData: 'Edit data',
    existingIncomeFound: 'We found your current monthly income',
    existingIncomeHint: 'You can use this data or edit it.',
    existingExpensesFound: 'We found your current expenses',
    existingGoalsFound: 'We found your current financial goals',
    existingDataHint: 'You can use the existing data or edit it before continuing.',
    insufficientData: 'Not enough data found',
    builtFromExisting: 'Your initial financial plan has been built from your existing data',
    next: 'Next',
    back: 'Back',
    finish: 'Finish Setup',
    saving: 'Saving setup...',
    goDashboard: 'Go to Dashboard',
    setupPlanTitle: 'What will you set up?',
    setupPlanSubtitle: 'Guided steps only. You can skip any step and return later.',
    currentStep: 'Current step',
    completedStep: 'Completed',
    upcomingStep: 'Upcoming',
    realDataLong: 'No financial data will be added automatically. Only the data you entered will be saved, and you can edit or complete it later.',
    optional: 'Optional',
    required: 'Required',
    yes: 'Yes, add data',
    skip: 'Skip',
    incomeYes: 'Add income data',
    skipCurrently: 'Skip for now',
    loading: 'Loading...',
    signInTitle: 'Sign in to set up your account.',
    signInAction: 'Sign In',
    errorAuth: 'Sign in before saving setup.',
    errorRequired: 'Complete the required fields or skip this step.',
    errorAmount: 'Amounts must be valid numbers greater than or equal to zero.',
    errorGoalCurrent: 'Current amount cannot exceed the target amount.',
    errorDate: 'Enter a valid date.',
    saved: 'Your account is set up',
    savedSub: 'Only the data you entered was saved. Skipped steps stayed empty.',
    initialPlanBuilt: 'Your initial financial plan has been built',
    completionTitle: 'Your initial financial plan has been built successfully',
    completionDescription: 'Only the data you entered was saved, and you can edit or add more data later from the dashboard.',
    dashboardMiniTitle: 'Your initial financial plan dashboard',
    dashboardMiniSubtitle: 'An executive snapshot of what you saved, what still needs data, and the next step inside THE SFM.',
    planSnapshotTitle: 'Quick plan snapshot',
    planSnapshotSubtitle: 'Every card shows only real data saved from your setup.',
    financialPulse: 'Core indicators',
    dataHealthTitle: 'Plan data readiness',
    dataHealthSubtitle: 'Shows what is complete and what needs more data to improve analysis.',
    nextStepTitle: 'Next step',
    nextStepBody: 'Open the dashboard to review the numbers, track surplus, and connect the plan to daily reports.',
    dashboardPrimaryHint: 'Start here to follow and adjust your plan.',
    readyStatus: 'Ready',
    needsMoreData: 'Needs data',
    currencyReady: 'Default currency selected',
    incomeReady: 'Monthly income saved',
    expensesReady: 'Monthly expenses saved',
    goalsReady: 'At least one financial goal',
    growthDataReady: 'Savings, investment, or project data',
    expenseRatio: 'Expense ratio',
    surplusRatio: 'Surplus ratio',
    reportMiniHint: 'Open a quick summary before going to reports.',
    expectedSurplus: 'Expected surplus',
    expectedRemaining: 'Expected remaining salary',
    expectedMonthlyIncome: 'Expected monthly income',
    recommendedSavingPercent: 'Recommended saving percentage',
    monthlySavingSuggestion: 'Monthly saving suggestion',
    firstGoalCompletion: 'Estimated first goal completion',
    notEnoughForEstimate: 'Not enough data to estimate',
    noGoalEstimateTitle: 'Not enough data to estimate goal completion',
    noGoalEstimateHint: 'Add the goal amount and the monthly amount assigned to it for a more accurate estimate.',
    goalEstimateDesc: 'Estimate based on the remaining amount and the recommended saving percentage.',
    currencyCardDesc: 'This currency will be used for display and analysis.',
    incomeCardDesc: 'Total saved income sources.',
    noIncomeCardDesc: 'No income has been saved yet. You can add it later from the dashboard.',
    remainingCardDesc: 'Income after subtracting saved monthly expenses.',
    savingPercentCardDesc: 'An initial percentage based on available surplus.',
    expensesCardDesc: 'Monthly expense items actually saved.',
    investmentsCardDesc: 'Investments you added or had already saved.',
    goalsCardDesc: 'Real financial goals saved for tracking.',
    projectsCardDesc: 'Projects or project ideas you added.',
    savingsCardDesc: 'Saved balances you can track later.',
    additionalIncomeSources: 'Additional income sources',
    additionalIncomeCardDesc: 'Non-salary income sources in your saved data.',
    dataPoints: 'Saved data points',
    recommendationTitle: 'Initial recommendation from THE SFM',
    recommendationBasedOn: 'Based only on the data saved during setup.',
    recNoIncome: 'Add your monthly income so the system can calculate surplus and saving ratios accurately.',
    recNoIncomeMeta: 'No income sources are saved yet.',
    recGoodRemaining: 'Your initial financial position looks good. You can start distributing the surplus between savings and investment.',
    recGoodRemainingMeta: 'Expected surplus is {amount}, equal to {percent} of income.',
    recHighExpenses: 'Your expenses look high compared with income. We recommend reviewing recurring items.',
    recHighExpensesMeta: 'Expenses represent {percent} of expected monthly income.',
    recNoGoals: 'Add at least one financial goal so the system can build a clearer plan.',
    recNoGoalsMeta: 'No financial goals have been saved yet.',
    recNoInvestments: 'You can add your investments later to analyze performance and compare them with your default currency.',
    recNoInvestmentsMeta: 'No investments are saved in the current setup.',
    recBalanced: 'Your initial data has been saved. The next step is reviewing it from the dashboard and connecting it to reports.',
    recBalancedMeta: 'The summary is based on {count} saved data points.',
    progressTitle: 'Financial step 9 - Finish setup',
    progressSubtitle: 'The initial plan setup is 100% complete.',
    progressComplete: '100% complete',
    stepListTitle: 'Setup steps',
    addMoreData: 'Add more data',
    viewInitialReport: 'View initial report',
    reportTitle: 'Initial financial report',
    reportSubtitle: 'A quick summary from only the data you entered or had already saved.',
    reportIncome: 'Income summary',
    reportExpenses: 'Expenses summary',
    reportSavings: 'Savings summary',
    reportInvestments: 'Investment summary',
    reportGoals: 'Goals summary',
    reportRecommendation: 'Initial recommendation',
    reportNoData: 'There is not enough data for this section yet.',
    reportGo: 'Go to Reports',
    closeReport: 'Close report',
    steps: [
      'Welcome',
      'Default currency',
      'Monthly income',
      'Monthly expenses',
      'Financial goals',
      'Savings and investments',
      'Zakat and charity',
      'Projects',
      'Finish setup',
    ],
    currencyTitle: 'Choose your default currency',
    currencyBody: 'THE SFM will use this currency for display and analysis. You can change it later in Profile.',
    incomeTitle: 'Do you want to add monthly income now?',
    incomeBody: 'Add your actual income only if you are ready, or skip this step and complete it later.',
    incomeFormTitle: 'Monthly income details',
    incomeFormBody: 'Enter your real income details only. Empty fields will not be saved and no automatic data will be created.',
    incomeName: 'Income name',
    incomeNamePh: 'Example: Monthly salary',
    incomeAmount: 'Amount',
    incomeType: 'Income type',
    receivedDate: 'Received date',
    recurringMonthly: 'Recurring monthly income',
    recurringMonthlyHint: 'Turn this on if this income repeats every month.',
    expensesTitle: 'Add basic monthly expenses if you want',
    expensesBody: 'Only filled rows will be saved. Empty expense rows will stay empty.',
    rent: 'Rent / housing',
    food: 'Food',
    transport: 'Transport',
    subscriptions: 'Subscriptions',
    loans: 'Loans',
    other: 'Other',
    goalsTitle: 'Do you have a financial goal to track?',
    goalName: 'Goal name',
    goalNamePh: 'Example: Emergency fund',
    targetAmount: 'Target amount',
    currentAmount: 'Current amount',
    targetDate: 'Target date',
    priority: 'Priority',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    savingsTitle: 'Savings and investments',
    hasSavings: 'I have savings',
    hasInvestments: 'I have investments',
    savingsType: 'Savings type',
    savingsTypePh: 'Example: Savings account',
    investmentType: 'Investment type',
    investmentTypePh: 'Example: Investment fund',
    zakatTitle: 'Zakat and charity',
    zakatBody: 'Choose what you want to track later. No fake zakat assets or donations will be created.',
    followZakat: 'I want to track zakat',
    followCharity: 'I want to track donations',
    notNow: 'Not now',
    projectsTitle: 'Do you have a business or project?',
    projectName: 'Project name',
    projectType: 'Project type',
    capital: 'Capital amount',
    projectStatus: 'Status',
    summaryCurrency: 'Selected currency',
    addedIncome: 'Income added',
    addedExpenses: 'Expenses added',
    addedGoals: 'Goals added',
    addedSavings: 'Savings added',
    addedInvestments: 'Investments added',
    addedProjects: 'Projects added',
    openZakat: 'Open Zakat',
    openCharity: 'Open Charity',
  },
  fr: {
    pageName: 'Configuration du compte',
    eyebrow: 'Configuration du compte',
    title: 'Bienvenue sur THE SFM',
    subtitle: 'Nous allons vous aider à configurer votre gestionnaire financier intelligent en quelques minutes, uniquement avec vos données réelles.',
    realData: 'Aucune donnée de démonstration n’est créée. Seules les données saisies seront enregistrées.',
    start: 'Commencer la configuration',
    skipNow: 'Ignorer pour l’instant',
    useExisting: 'Utiliser les données existantes',
    editData: 'Modifier les données',
    existingIncomeFound: 'Nous avons trouvé votre revenu mensuel actuel',
    existingIncomeHint: 'Vous pouvez utiliser ces données ou les modifier.',
    existingExpensesFound: 'Nous avons trouvé vos dépenses actuelles',
    existingGoalsFound: 'Nous avons trouvé vos objectifs financiers actuels',
    existingDataHint: 'Vous pouvez utiliser les données existantes ou les modifier avant de continuer.',
    insufficientData: 'Données insuffisantes',
    builtFromExisting: 'Votre plan financier initial a été construit à partir de vos données existantes',
    next: 'Suivant',
    back: 'Retour',
    finish: 'Terminer la configuration',
    saving: 'Enregistrement...',
    goDashboard: 'Aller au tableau de bord',
    setupPlanTitle: 'Qu’allez-vous configurer ?',
    setupPlanSubtitle: 'Étapes guidées uniquement. Vous pouvez ignorer une étape et revenir plus tard.',
    currentStep: 'Étape actuelle',
    completedStep: 'Terminée',
    upcomingStep: 'À venir',
    realDataLong: 'Aucune donnée financière ne sera ajoutée automatiquement. Seules les données saisies seront enregistrées, et vous pourrez les modifier ou les compléter plus tard.',
    optional: 'Facultatif',
    required: 'Requis',
    yes: 'Oui, ajouter des données',
    skip: 'Ignorer',
    incomeYes: 'Ajouter les données de revenu',
    skipCurrently: 'Ignorer pour le moment',
    loading: 'Chargement...',
    signInTitle: 'Connectez-vous pour configurer votre compte.',
    signInAction: 'Connexion',
    errorAuth: 'Connectez-vous avant d’enregistrer la configuration.',
    errorRequired: 'Complétez les champs requis ou ignorez cette étape.',
    errorAmount: 'Les montants doivent être des nombres valides supérieurs ou égaux à zéro.',
    errorGoalCurrent: 'Le montant actuel ne peut pas dépasser le montant cible.',
    errorDate: 'Saisissez une date valide.',
    saved: 'Votre compte est configuré',
    savedSub: 'Seules les données saisies ont été enregistrées. Les étapes ignorées sont restées vides.',
    initialPlanBuilt: 'Votre plan financier initial a été créé',
    completionTitle: 'Votre plan financier initial a été créé avec succès',
    completionDescription: 'Seules les données saisies ont été enregistrées. Vous pourrez les modifier ou ajouter d’autres données plus tard depuis le tableau de bord.',
    dashboardMiniTitle: 'Tableau de bord de votre plan financier initial',
    dashboardMiniSubtitle: 'Un aperçu exécutif de ce qui est enregistré, de ce qui reste à compléter, et de la prochaine étape dans THE SFM.',
    planSnapshotTitle: 'Aperçu rapide du plan',
    planSnapshotSubtitle: 'Chaque carte affiche uniquement les données réellement enregistrées pendant la configuration.',
    financialPulse: 'Indicateurs principaux',
    dataHealthTitle: 'Préparation des données du plan',
    dataHealthSubtitle: 'Indique ce qui est complet et ce qui nécessite plus de données pour améliorer l’analyse.',
    nextStepTitle: 'Prochaine étape',
    nextStepBody: 'Ouvrez le tableau de bord pour vérifier les chiffres, suivre le surplus et relier le plan aux rapports quotidiens.',
    dashboardPrimaryHint: 'Commencez ici pour suivre et ajuster votre plan.',
    readyStatus: 'Prêt',
    needsMoreData: 'Données requises',
    currencyReady: 'Devise par défaut sélectionnée',
    incomeReady: 'Revenu mensuel enregistré',
    expensesReady: 'Dépenses mensuelles enregistrées',
    goalsReady: 'Au moins un objectif financier',
    growthDataReady: 'Données d’épargne, d’investissement ou de projet',
    expenseRatio: 'Ratio de dépenses',
    surplusRatio: 'Ratio de surplus',
    reportMiniHint: 'Ouvrez un résumé rapide avant d’accéder aux rapports.',
    expectedSurplus: 'Surplus estimé',
    expectedRemaining: 'Salaire restant estimé',
    expectedMonthlyIncome: 'Revenu mensuel estimé',
    recommendedSavingPercent: 'Pourcentage d’épargne recommandé',
    monthlySavingSuggestion: 'Suggestion d’épargne mensuelle',
    firstGoalCompletion: 'Date estimée du premier objectif',
    notEnoughForEstimate: 'Données insuffisantes pour estimer',
    noGoalEstimateTitle: 'Données insuffisantes pour estimer la réalisation de l’objectif',
    noGoalEstimateHint: 'Ajoutez le montant de l’objectif et le montant mensuel qui lui est alloué pour obtenir une estimation plus précise.',
    goalEstimateDesc: 'Estimation basée sur le montant restant et le pourcentage d’épargne recommandé.',
    currencyCardDesc: 'Cette devise sera utilisée pour l’affichage et l’analyse.',
    incomeCardDesc: 'Total des sources de revenu enregistrées.',
    noIncomeCardDesc: 'Aucun revenu n’a encore été enregistré. Vous pourrez l’ajouter plus tard depuis le tableau de bord.',
    remainingCardDesc: 'Revenu après déduction des dépenses mensuelles enregistrées.',
    savingPercentCardDesc: 'Pourcentage initial basé sur le surplus disponible.',
    expensesCardDesc: 'Postes de dépenses mensuelles réellement enregistrés.',
    investmentsCardDesc: 'Investissements que vous avez ajoutés ou déjà enregistrés.',
    goalsCardDesc: 'Objectifs financiers réels enregistrés pour le suivi.',
    projectsCardDesc: 'Projets ou idées de projets que vous avez ajoutés.',
    savingsCardDesc: 'Épargne enregistrée à suivre plus tard.',
    additionalIncomeSources: 'Sources de revenu complémentaires',
    additionalIncomeCardDesc: 'Sources de revenu hors salaire dans vos données enregistrées.',
    dataPoints: 'Points de données enregistrés',
    recommendationTitle: 'Recommandation initiale de THE SFM',
    recommendationBasedOn: 'Basée uniquement sur les données enregistrées pendant la configuration.',
    recNoIncome: 'Ajoutez votre revenu mensuel afin que le système calcule précisément le surplus et les ratios d’épargne.',
    recNoIncomeMeta: 'Aucune source de revenu n’est enregistrée pour le moment.',
    recGoodRemaining: 'Votre situation financière initiale semble bonne. Vous pouvez commencer à répartir le surplus entre épargne et investissement.',
    recGoodRemainingMeta: 'Le surplus estimé est de {amount}, soit {percent} du revenu.',
    recHighExpenses: 'Vos dépenses semblent élevées par rapport au revenu. Nous recommandons de revoir les postes récurrents.',
    recHighExpensesMeta: 'Les dépenses représentent {percent} du revenu mensuel estimé.',
    recNoGoals: 'Ajoutez au moins un objectif financier afin que le système construise un plan plus clair.',
    recNoGoalsMeta: 'Aucun objectif financier n’a encore été enregistré.',
    recNoInvestments: 'Vous pourrez ajouter vos investissements plus tard pour analyser leur performance et les comparer à votre devise par défaut.',
    recNoInvestmentsMeta: 'Aucun investissement n’est enregistré dans cette configuration.',
    recBalanced: 'Vos données initiales ont été enregistrées. L’étape suivante consiste à les revoir depuis le tableau de bord et à les relier aux rapports.',
    recBalancedMeta: 'Le résumé est basé sur {count} points de données enregistrés.',
    progressTitle: 'Étape financière 9 - Fin de la configuration',
    progressSubtitle: 'La configuration du plan initial est terminée à 100 %.',
    progressComplete: '100 % terminé',
    stepListTitle: 'Étapes de configuration',
    addMoreData: 'Ajouter d’autres données',
    viewInitialReport: 'Voir le rapport initial',
    reportTitle: 'Rapport financier initial',
    reportSubtitle: 'Résumé rapide basé uniquement sur les données saisies ou déjà enregistrées.',
    reportIncome: 'Résumé du revenu',
    reportExpenses: 'Résumé des dépenses',
    reportSavings: 'Résumé de l’épargne',
    reportInvestments: 'Résumé de l’investissement',
    reportGoals: 'Résumé des objectifs',
    reportRecommendation: 'Recommandation initiale',
    reportNoData: 'Données insuffisantes pour cette section.',
    reportGo: 'Aller aux rapports',
    closeReport: 'Fermer le rapport',
    steps: [
      'Bienvenue',
      'Devise par défaut',
      'Revenu mensuel',
      'Dépenses mensuelles',
      'Objectifs financiers',
      'Épargne et investissements',
      'Zakat et charité',
      'Projets',
      'Terminer',
    ],
    currencyTitle: 'Choisissez votre devise par défaut',
    currencyBody: 'THE SFM utilisera cette devise pour l’affichage et l’analyse. Vous pourrez la modifier plus tard.',
    incomeTitle: 'Voulez-vous ajouter votre revenu mensuel maintenant ?',
    incomeBody: 'Ajoutez votre revenu réel uniquement si vous êtes prêt, ou ignorez cette étape et complétez-la plus tard.',
    incomeFormTitle: 'Détails du revenu mensuel',
    incomeFormBody: 'Saisissez uniquement les données réelles de votre revenu. Les champs vides ne seront pas enregistrés.',
    incomeName: 'Nom du revenu',
    incomeNamePh: 'Exemple : salaire mensuel',
    incomeAmount: 'Montant',
    incomeType: 'Type de revenu',
    receivedDate: 'Date de réception',
    recurringMonthly: 'Revenu mensuel récurrent',
    recurringMonthlyHint: 'Activez cette option si ce revenu se répète chaque mois.',
    expensesTitle: 'Ajoutez vos dépenses mensuelles de base si vous le souhaitez',
    expensesBody: 'Seules les lignes remplies seront enregistrées. Les lignes vides resteront vides.',
    rent: 'Loyer / logement',
    food: 'Alimentation',
    transport: 'Transport',
    subscriptions: 'Abonnements',
    loans: 'Prêts',
    other: 'Autre',
    goalsTitle: 'Avez-vous un objectif financier à suivre ?',
    goalName: 'Nom de l’objectif',
    goalNamePh: 'Exemple : fonds d’urgence',
    targetAmount: 'Montant cible',
    currentAmount: 'Montant actuel',
    targetDate: 'Date cible',
    priority: 'Priorité',
    low: 'Faible',
    medium: 'Moyenne',
    high: 'Élevée',
    savingsTitle: 'Épargne et investissements',
    hasSavings: 'J’ai de l’épargne',
    hasInvestments: 'J’ai des investissements',
    savingsType: 'Type d’épargne',
    savingsTypePh: 'Exemple : compte épargne',
    investmentType: 'Type d’investissement',
    investmentTypePh: 'Exemple : fonds d’investissement',
    zakatTitle: 'Zakat et charité',
    zakatBody: 'Choisissez ce que vous voulez suivre plus tard. Aucun actif zakat ou don fictif ne sera créé.',
    followZakat: 'Je veux suivre la zakat',
    followCharity: 'Je veux suivre les dons',
    notNow: 'Pas maintenant',
    projectsTitle: 'Avez-vous une entreprise ou un projet ?',
    projectName: 'Nom du projet',
    projectType: 'Type de projet',
    capital: 'Capital',
    projectStatus: 'Statut',
    summaryCurrency: 'Devise sélectionnée',
    addedIncome: 'Revenus ajoutés',
    addedExpenses: 'Dépenses ajoutées',
    addedGoals: 'Objectifs ajoutés',
    addedSavings: 'Épargne ajoutée',
    addedInvestments: 'Investissements ajoutés',
    addedProjects: 'Projets ajoutés',
    openZakat: 'Ouvrir Zakat',
    openCharity: 'Ouvrir Charité',
  },
} as const;

const INCOME_TYPES = ['salary', 'side', 'investment', 'bonus', 'rent', 'other'] as const;
const PROJECT_TYPES = ['ecommerce', 'restaurant', 'services', 'saas', 'trading', 'real_estate', 'other'] as const;
const PROJECT_STATUSES = ['idea', 'study', 'setup', 'launch', 'growth', 'paused', 'completed'] as const;
const PRIORITIES = ['low', 'medium', 'high'] as const;

const OPTION_LABELS = {
  ar: {
    salary: 'راتب', side: 'دخل جانبي', investment: 'استثمار', bonus: 'مكافأة', rent: 'إيجار', other: 'أخرى',
    ecommerce: 'متجر إلكتروني', restaurant: 'مطعم / كافيه', services: 'خدمات', saas: 'SaaS / تطبيق', trading: 'تجارة عامة', real_estate: 'عقار',
    idea: 'فكرة', study: 'دراسة', setup: 'تأسيس', launch: 'إطلاق', growth: 'نمو', paused: 'متوقف', completed: 'مكتمل',
  },
  en: {
    salary: 'Salary', side: 'Side income', investment: 'Investment', bonus: 'Bonus', rent: 'Rent', other: 'Other',
    ecommerce: 'E-commerce', restaurant: 'Restaurant / Cafe', services: 'Services', saas: 'SaaS / App', trading: 'General Trading', real_estate: 'Real Estate',
    idea: 'Idea', study: 'Study', setup: 'Setup', launch: 'Launch', growth: 'Growth', paused: 'Paused', completed: 'Completed',
  },
  fr: {
    salary: 'Salaire', side: 'Revenu complémentaire', investment: 'Investissement', bonus: 'Prime', rent: 'Loyer', other: 'Autre',
    ecommerce: 'E-commerce', restaurant: 'Restaurant / Café', services: 'Services', saas: 'SaaS / Application', trading: 'Commerce général', real_estate: 'Immobilier',
    idea: 'Idée', study: 'Étude', setup: 'Mise en place', launch: 'Lancement', growth: 'Croissance', paused: 'En pause', completed: 'Terminé',
  },
} as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toAmount(value: string) {
  if (!value.trim()) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : Number.NaN;
}

function monthsUntil(date: string) {
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
}

function dateAfterMonths(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + Math.max(0, Math.ceil(months)));
  return date.toISOString().slice(0, 10);
}

function amountFrom(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function amountFromAny(row: any, keys: string[]) {
  for (const key of keys) {
    const value = amountFrom(row?.[key]);
    if (value > 0) return value;
  }
  return 0;
}

function parseGoalNotes(row: any) {
  try {
    return typeof row?.notes === 'string' ? JSON.parse(row.notes) : row?.notes || {};
  } catch {
    return {};
  }
}

function goalTargetAmount(row: any) {
  return amountFrom(row?.amount ?? row?.target_amount);
}

function goalCurrentAmount(row: any) {
  const notes = parseGoalNotes(row);
  return amountFrom(row?.current_amount ?? notes.currentAmount);
}

function isAdditionalIncome(row: any) {
  const type = String(row?.income_type || row?.category || row?.type || '').trim().toLowerCase();
  const label = String(row?.source_name || row?.label || row?.name || '').trim().toLowerCase();
  if (amountFrom(row?.amount) <= 0) return false;
  if (['salary', 'راتب', 'salaire'].includes(type)) return false;
  if (!type && /salary|راتب|salaire/.test(label)) return false;
  return true;
}

function summarizeExistingData(data: ExistingSetupData): SetupSummary {
  const incomeRows = data.income.filter(row => amountFrom(row?.amount) > 0);
  const expenseRows = data.expenses.filter(row => amountFrom(row?.amount) > 0);
  const savingsRows = data.savings.filter(row => amountFromAny(row, ['amount', 'current_value']) > 0);
  const investmentRows = data.investments.filter(row => amountFromAny(row, ['amount', 'current_value', 'converted_market_value', 'current_market_value', 'native_market_value']) > 0);
  const goalRows = data.goals.filter(row => goalTargetAmount(row) > 0);
  const projectRows = data.projects.filter(row => String(row?.name || '').trim());

  const incomeTotal = incomeRows.reduce((total, row) => total + amountFrom(row.amount), 0);
  const expenseTotal = expenseRows.reduce((total, row) => total + amountFrom(row.amount), 0);
  const savingsTotal = savingsRows.reduce((total, row) => total + amountFromAny(row, ['amount', 'current_value']), 0);
  const reportingCurrency = String(data.profile?.preferred_currency ?? data.profile?.default_currency ?? data.profile?.currency ?? '').trim().toUpperCase();
  const investmentTotal = reportingCurrency
    ? investmentRows.reduce((total, row) => total + (investmentValueInCurrency(row, reportingCurrency)?.amount ?? 0), 0)
    : 0;
  const goalTargetTotal = goalRows.reduce((total, row) => total + goalTargetAmount(row), 0);
  const goalRemainingTotal = goalRows.reduce((total, row) => total + Math.max(0, goalTargetAmount(row) - goalCurrentAmount(row)), 0);
  const expectedRemaining = Math.max(0, incomeTotal - expenseTotal);
  const recommendedSavingPercent = incomeTotal > 0 && expectedRemaining > 0 ? Math.min(20, Math.max(10, Math.round((expectedRemaining / incomeTotal) * 50))) : 0;
  const monthlySavingSuggestion = incomeTotal > 0 ? Math.min(expectedRemaining, Math.round(incomeTotal * (recommendedSavingPercent / 100))) : 0;

  return {
    income: incomeRows.length,
    expenses: expenseRows.length,
    goals: goalRows.length,
    savings: savingsRows.length,
    investments: investmentRows.length,
    projects: projectRows.length,
    incomeTotal,
    expenseTotal,
    savingsTotal,
    investmentTotal,
    goalTargetTotal,
    goalRemainingTotal,
    additionalIncomeSources: incomeRows.filter(isAdditionalIncome).length,
    expectedRemaining,
    recommendedSavingPercent,
    monthlySavingSuggestion,
    firstGoalCompletionDate: goalRemainingTotal > 0 && monthlySavingSuggestion > 0 ? dateAfterMonths(goalRemainingTotal / monthlySavingSuggestion) : '',
  };
}

function setupIntlLocale(lang: Lang) {
  if (lang === 'ar') return 'ar-KW-u-nu-latn';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

function cleanIntl(value: string) {
  return value.replace(/[\u061c\u200e\u200f]/g, '').replace(/\u00a0/g, ' ').trim();
}

function formatSetupMoney(amount: number, currencyCode: string, lang: Lang) {
  const currency = getCurrency(currencyCode);
  try {
    const formatted = cleanIntl(new Intl.NumberFormat(setupIntlLocale(lang), {
      style: 'currency',
      currency: currency.code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(Number.isFinite(amount) ? amount : 0));
    return lang === 'ar' && currency.code === 'KWD' ? formatted.replace(/د\.ك\.$/u, 'د.ك') : formatted;
  } catch {
    return cleanIntl(new Intl.NumberFormat(setupIntlLocale(lang), {
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(Number.isFinite(amount) ? amount : 0)) + ` ${currency.code}`;
  }
}

function formatSetupNumber(value: number, lang: Lang) {
  return cleanIntl(new Intl.NumberFormat(setupIntlLocale(lang)).format(Number.isFinite(value) ? value : 0));
}

function formatSetupPercent(value: number, lang: Lang) {
  return cleanIntl(new Intl.NumberFormat(setupIntlLocale(lang), {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format((Number.isFinite(value) ? value : 0) / 100));
}

function formatSetupDate(value: string, lang: Lang) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return cleanIntl(new Intl.DateTimeFormat(setupIntlLocale(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date));
}

function rowCurrency(row: any, fallback = 'KWD') {
  return String(row?.currency || row?.notes?.currency || fallback || 'KWD');
}

function firstExistingIncome(rows: any[]) {
  return rows.find(row => amountFrom(row?.amount) > 0) ?? rows[0] ?? null;
}

function goalName(row: any) {
  return String(row?.goal || row?.name || row?.title || '').trim();
}

function safeLang(value: string): Lang {
  return value === 'en' || value === 'fr' || value === 'ar' ? value : 'ar';
}

export default function SetupPage() {
  const router = useRouter();
  const { user, loading: authLoading, isGuest } = useAuth();
  const { lang: rawLang, dir } = useLanguage();
  const lang = safeLang(rawLang);
  const text = COPY[lang];
  const labels = OPTION_LABELS[lang];
  const { setCurrency: setGlobalCurrency } = useCurrency();
  const db = supabase as any;

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<SetupSummary | null>(null);
  const [existingData, setExistingData] = useState<ExistingSetupData>(EMPTY_EXISTING_DATA);
  const [existingLoading, setExistingLoading] = useState(true);
  const [prefilledFromExisting, setPrefilledFromExisting] = useState(false);
  const [editingExisting, setEditingExisting] = useState<Record<number, boolean>>({});
  const [showInitialReport, setShowInitialReport] = useState(false);

  const [defaultCurrency, setDefaultCurrency] = useState('KWD');
  const [incomeEnabled, setIncomeEnabled] = useState(false);
  const [income, setIncome] = useState({
    name: '',
    amount: '',
    currency: 'KWD',
    incomeType: 'salary',
    receivedDate: today(),
    recurring: true,
  });
  const [expensesEnabled, setExpensesEnabled] = useState(false);
  const [expenses, setExpenses] = useState<Record<string, string>>({
    rent: '',
    food: '',
    transport: '',
    subscriptions: '',
    loans: '',
    other: '',
  });
  const [goalEnabled, setGoalEnabled] = useState(false);
  const [goal, setGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '0',
    targetDate: '',
    priority: 'medium',
  });
  const [savingsEnabled, setSavingsEnabled] = useState(false);
  const [savings, setSavings] = useState({ type: '', amount: '', currency: 'KWD' });
  const [investmentsEnabled, setInvestmentsEnabled] = useState(false);
  const [investment, setInvestment] = useState({ type: '', amount: '', currency: 'KWD' });
  const [focus, setFocus] = useState<{ zakat: boolean; charity: boolean }>({ zakat: false, charity: false });
  const [projectEnabled, setProjectEnabled] = useState(false);
  const [project, setProject] = useState({
    name: '',
    type: 'other',
    capital: '',
    status: 'idea',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && !user && !isGuest) router.replace(loginHrefForCurrentLocation('/setup'));
  }, [authLoading, isGuest, router, user]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;
    async function loadExistingSetupData() {
      setExistingLoading(true);
      const [profileRes, incomeRes, expensesRes, goalsRes, savingsRes, investmentsRes, projectsRes] = await Promise.all([
        db.from('profiles').select('*').eq('id', userId).maybeSingle(),
        db.from('monthly_income_sources').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        db.from('expense_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
        db.from('financial_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        db.from('savings_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        db.from('investment_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
        db.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      ]);
      if (cancelled) return;
      const nextExisting: ExistingSetupData = {
        profile: profileRes.data ?? null,
        income: incomeRes.data ?? [],
        expenses: expensesRes.data ?? [],
        goals: goalsRes.data ?? [],
        savings: savingsRes.data ?? [],
        investments: investmentsRes.data ?? [],
        projects: projectsRes.data ?? [],
      };
      setExistingData(nextExisting);
      if (nextExisting.profile?.onboarding_skipped === true) {
        router.replace('/dashboard');
        return;
      }
      const currency = nextExisting.profile?.default_currency || nextExisting.profile?.preferred_currency || rowCurrency(firstExistingIncome(nextExisting.income), 'KWD');
      setDefaultCurrency(currency);
      setIncome(prev => ({ ...prev, currency }));
      setSavings(prev => ({ ...prev, currency }));
      setInvestment(prev => ({ ...prev, currency }));
      if (!prefilledFromExisting) {
        const existingIncome = firstExistingIncome(nextExisting.income);
        if (existingIncome) {
          setIncome({
            name: String(existingIncome.source_name || existingIncome.label || existingIncome.name || ''),
            amount: String(existingIncome.amount ?? ''),
            currency: rowCurrency(existingIncome, currency),
            incomeType: String(existingIncome.income_type || existingIncome.category || 'salary'),
            receivedDate: String(existingIncome.received_date || existingIncome.recurrence_start_date || today()).slice(0, 10),
            recurring: existingIncome.is_recurring !== false,
          });
        }
        const existingGoal = nextExisting.goals[0];
        if (existingGoal) {
          let notes: any = {};
          try {
            notes = typeof existingGoal.notes === 'string' ? JSON.parse(existingGoal.notes) : existingGoal.notes || {};
          } catch {
            notes = {};
          }
          setGoal({
            name: goalName(existingGoal),
            targetAmount: String(existingGoal.amount ?? existingGoal.target_amount ?? ''),
            currentAmount: String(existingGoal.current_amount ?? notes.currentAmount ?? 0),
            targetDate: String(notes.deadline || existingGoal.target_date || '').slice(0, 10),
            priority: String(notes.priority || 'medium'),
          });
        }
        setPrefilledFromExisting(true);
      }
      const hasRequiredExistingData = Boolean(currency) && nextExisting.income.some(row => amountFrom(row.amount) > 0) && nextExisting.expenses.some(row => amountFrom(row.amount) > 0) && nextExisting.goals.length > 0;
      if (hasRequiredExistingData && nextExisting.profile?.onboarding_completed !== true) {
        setSummary(summarizeExistingData(nextExisting));
        setStep(8);
      } else if (nextExisting.profile?.onboarding_completed !== true) {
        const hasAnyExistingData = Boolean(
          nextExisting.profile?.default_currency ||
          nextExisting.profile?.preferred_currency ||
          nextExisting.income.length ||
          nextExisting.expenses.length ||
          nextExisting.goals.length ||
          nextExisting.savings.length ||
          nextExisting.investments.length ||
          nextExisting.projects.length,
        );
        if (hasAnyExistingData) {
          const hasIncome = nextExisting.income.some(row => amountFrom(row.amount) > 0);
          const hasExpenses = nextExisting.expenses.some(row => amountFrom(row.amount) > 0);
          const hasGoals = nextExisting.goals.length > 0;
          const firstMissing = !currency ? 1 : !hasIncome ? 2 : !hasExpenses ? 3 : !hasGoals ? 4 : 8;
          setStep(firstMissing as Step);
        }
      }
      setExistingLoading(false);
    }
    void loadExistingSetupData();
    return () => { cancelled = true; };
  }, [db, prefilledFromExisting, router, user]);

  const stepStatuses = useMemo(() => {
    const hasCurrency = Boolean(defaultCurrency || existingData.profile?.default_currency || existingData.profile?.preferred_currency);
    const hasIncome = existingData.income.some(row => amountFrom(row.amount) > 0) || (incomeEnabled && toAmount(income.amount) > 0);
    const hasExpenses = existingData.expenses.some(row => amountFrom(row.amount) > 0) || (expensesEnabled && Object.values(expenses).some(value => toAmount(value) > 0));
    const hasGoals = existingData.goals.length > 0 || (goalEnabled && goal.name.trim() && toAmount(goal.targetAmount) > 0);
    const hasSavings = existingData.savings.length > 0 || existingData.investments.length > 0 || savingsEnabled || investmentsEnabled;
    const hasFocus = Boolean(existingData.profile?.financial_focus) || focus.zakat || focus.charity;
    const hasProjects = existingData.projects.length > 0 || projectEnabled;
    return {
      0: step === 0 ? 'current' : 'completed',
      1: hasCurrency ? 'completed' : step === 1 ? 'current' : 'missing',
      2: hasIncome ? 'completed' : step === 2 ? 'current' : 'missing',
      3: hasExpenses ? 'completed' : step === 3 ? 'current' : 'missing',
      4: hasGoals ? 'completed' : step === 4 ? 'current' : 'missing',
      5: hasSavings ? 'completed' : step === 5 ? 'current' : 'optional',
      6: hasFocus ? 'completed' : step === 6 ? 'current' : 'optional',
      7: hasProjects ? 'completed' : step === 7 ? 'current' : 'optional',
      8: step === 8 ? 'current' : 'missing',
    } as Record<Step, 'completed' | 'current' | 'optional' | 'missing' | 'skipped'>;
  }, [defaultCurrency, existingData, expenses, expensesEnabled, focus, goal.name, goal.targetAmount, goalEnabled, income.amount, incomeEnabled, investmentsEnabled, projectEnabled, savingsEnabled, step]);

  const nextIncompleteStep = useMemo(() => {
    for (const candidate of [1, 2, 3, 4] as Step[]) {
      if (stepStatuses[candidate] !== 'completed') return candidate;
    }
    return 8 as Step;
  }, [stepStatuses]);

  const progress = useMemo(() => {
    if (step === 8) return 100;
    const completed = ([1, 2, 3, 4, 5, 6, 7] as Step[]).filter(item => stepStatuses[item] === 'completed' || stepStatuses[item] === 'skipped').length;
    return Math.max(12, Math.round((completed / 7) * 100));
  }, [step, stepStatuses]);

  function setCurrencyEverywhere(code: string) {
    setDefaultCurrency(code);
    setIncome(prev => ({ ...prev, currency: code }));
    setSavings(prev => ({ ...prev, currency: code }));
    setInvestment(prev => ({ ...prev, currency: code }));
    setGlobalCurrency(code);
  }

  function validateCurrentStep() {
    setError('');
    if (step === 2 && incomeEnabled) {
      if (!income.name.trim() || !income.amount || !income.incomeType || !income.receivedDate) {
        setError(text.errorRequired);
        return false;
      }
      if (toAmount(income.amount) <= 0) {
        setError(text.errorAmount);
        return false;
      }
    }
    if (step === 3 && expensesEnabled) {
      const invalid = Object.values(expenses).some(value => value.trim() && (Number.isNaN(toAmount(value)) || toAmount(value) < 0));
      if (invalid) {
        setError(text.errorAmount);
        return false;
      }
    }
    if (step === 4 && goalEnabled) {
      const target = toAmount(goal.targetAmount);
      const current = toAmount(goal.currentAmount);
      if (!goal.name.trim() || !goal.targetAmount || !goal.targetDate) {
        setError(text.errorRequired);
        return false;
      }
      if (target <= 0 || current < 0 || Number.isNaN(target) || Number.isNaN(current)) {
        setError(text.errorAmount);
        return false;
      }
      if (current > target) {
        setError(text.errorGoalCurrent);
        return false;
      }
      if (Number.isNaN(new Date(goal.targetDate).getTime())) {
        setError(text.errorDate);
        return false;
      }
    }
    if (step === 5) {
      if (savingsEnabled && (!savings.type.trim() || toAmount(savings.amount) <= 0)) {
        setError(text.errorRequired);
        return false;
      }
      if (investmentsEnabled && (!investment.type.trim() || toAmount(investment.amount) <= 0)) {
        setError(text.errorRequired);
        return false;
      }
    }
    if (step === 7 && projectEnabled) {
      const capital = project.capital.trim() ? toAmount(project.capital) : 0;
      if (!project.name.trim() || !project.type || !project.status) {
        setError(text.errorRequired);
        return false;
      }
      if (Number.isNaN(capital) || capital < 0) {
        setError(text.errorAmount);
        return false;
      }
    }
    return true;
  }

  function existingIncomeTotal() {
    return existingData.income.reduce((total, row) => total + amountFrom(row.amount), 0);
  }

  function existingExpensesTotal() {
    return existingData.expenses.reduce((total, row) => total + amountFrom(row.amount), 0);
  }

  function buildSetupSummary(countOverrides?: Partial<SetupSummary>): SetupSummary {
    const existing = summarizeExistingData(existingData);
    const usesNewIncome = incomeEnabled && (editingExisting[2] || existingData.income.length === 0) && toAmount(income.amount) > 0;
    const usesNewExpenses = expensesEnabled && (editingExisting[3] || existingData.expenses.length === 0);
    const usesNewGoal = goalEnabled && (editingExisting[4] || existingData.goals.length === 0) && toAmount(goal.targetAmount) > 0;
    const newExpenseEntries = Object.values(expenses).filter(value => Number.isFinite(toAmount(value)) && toAmount(value) > 0);
    const newIncomeAmount = usesNewIncome ? toAmount(income.amount) : 0;
    const editedIncome = editingExisting[2] ? firstExistingIncome(existingData.income) : null;
    const editedIncomeAmount = editedIncome ? amountFrom(editedIncome.amount) : 0;
    const editedIncomeWasAdditional = editedIncome ? isAdditionalIncome(editedIncome) : false;
    const incomeTotal = usesNewIncome
      ? Math.max(0, existing.incomeTotal - editedIncomeAmount) + newIncomeAmount
      : existing.incomeTotal;
    const expenseTotal = usesNewExpenses
      ? (editingExisting[3] ? existing.expenseTotal : 0) + newExpenseEntries.reduce((total, value) => total + Math.max(0, toAmount(value) || 0), 0)
      : existing.expenseTotal;
    const savingsAmount = savingsEnabled ? toAmount(savings.amount) : 0;
    const investmentAmount = investmentsEnabled ? toAmount(investment.amount) : 0;
    const goalTarget = usesNewGoal ? toAmount(goal.targetAmount) : 0;
    const goalCurrent = usesNewGoal ? toAmount(goal.currentAmount) : 0;
    const editedGoal = editingExisting[4] ? existingData.goals[0] : null;
    const editedGoalTarget = editedGoal ? goalTargetAmount(editedGoal) : 0;
    const editedGoalRemaining = editedGoal ? Math.max(0, goalTargetAmount(editedGoal) - goalCurrentAmount(editedGoal)) : 0;
    const goalTargetTotal = usesNewGoal ? Math.max(0, existing.goalTargetTotal - editedGoalTarget) + goalTarget : existing.goalTargetTotal;
    const goalRemainingTotal = usesNewGoal ? Math.max(0, existing.goalRemainingTotal - editedGoalRemaining) + Math.max(0, goalTarget - goalCurrent) : existing.goalRemainingTotal;
    const expectedRemaining = Math.max(0, incomeTotal - expenseTotal);
    const recommendedSavingPercent = incomeTotal > 0 && expectedRemaining > 0 ? Math.min(20, Math.max(10, Math.round((expectedRemaining / incomeTotal) * 50))) : 0;
    const monthlySavingSuggestion = incomeTotal > 0 ? Math.min(expectedRemaining, Math.round(incomeTotal * (recommendedSavingPercent / 100))) : 0;
    const firstGoalCompletionDate = goalRemainingTotal > 0 && monthlySavingSuggestion > 0 ? dateAfterMonths(goalRemainingTotal / monthlySavingSuggestion) : '';

    return {
      income: usesNewIncome ? Math.max(0, existing.income - (editedIncomeAmount > 0 ? 1 : 0)) + 1 : existing.income,
      expenses: usesNewExpenses ? (editingExisting[3] ? existing.expenses : 0) + newExpenseEntries.length : existing.expenses,
      goals: usesNewGoal ? Math.max(0, existing.goals - (editedGoalTarget > 0 ? 1 : 0)) + 1 : existing.goals,
      savings: existing.savings + (savingsEnabled && savingsAmount > 0 ? 1 : 0),
      investments: existing.investments + (investmentsEnabled && investmentAmount > 0 ? 1 : 0),
      projects: existing.projects + (projectEnabled && project.name.trim() ? 1 : 0),
      incomeTotal,
      expenseTotal,
      savingsTotal: existing.savingsTotal + (savingsEnabled && savingsAmount > 0 ? savingsAmount : 0),
      investmentTotal: existing.investmentTotal + (investmentsEnabled && investmentAmount > 0 ? investmentAmount : 0),
      goalTargetTotal,
      goalRemainingTotal,
      additionalIncomeSources: usesNewIncome
        ? Math.max(0, existing.additionalIncomeSources - (editedIncomeWasAdditional ? 1 : 0)) + (income.incomeType !== 'salary' ? 1 : 0)
        : existing.additionalIncomeSources,
      expectedRemaining,
      recommendedSavingPercent,
      monthlySavingSuggestion,
      firstGoalCompletionDate,
      ...countOverrides,
    };
  }

  function nextStepAfter(current: Step) {
    for (let candidate = current + 1; candidate <= 7; candidate += 1) {
      const typed = candidate as Step;
      if (stepStatuses[typed] !== 'completed') return typed;
    }
    return 8 as Step;
  }

  function addMoreDataStep() {
    for (const candidate of [2, 3, 4, 5, 7] as Step[]) {
      if (stepStatuses[candidate] !== 'completed') return candidate;
    }
    return 5 as Step;
  }

  function openMoreData() {
    setShowInitialReport(false);
    setStep(addMoreDataStep());
  }

  function recommendationItems(activeSummary: SetupSummary) {
    const items: Array<{ title: string; meta: string }> = [];
    const incomeTotal = activeSummary.incomeTotal;
    const expenseRatio = incomeTotal > 0 ? activeSummary.expenseTotal / incomeTotal : 0;
    const remainingRatio = incomeTotal > 0 ? activeSummary.expectedRemaining / incomeTotal : 0;
    const savedDataPoints = activeSummary.income + activeSummary.expenses + activeSummary.goals + activeSummary.savings + activeSummary.investments + activeSummary.projects;

    if (incomeTotal <= 0) {
      items.push({ title: text.recNoIncome, meta: text.recNoIncomeMeta });
    }

    if (incomeTotal > 0 && expenseRatio >= 0.7) {
      items.push({
        title: text.recHighExpenses,
        meta: text.recHighExpensesMeta.replace('{percent}', formatSetupPercent(expenseRatio * 100, lang)),
      });
    }

    if (incomeTotal > 0 && remainingRatio >= 0.2) {
      items.push({
        title: text.recGoodRemaining,
        meta: text.recGoodRemainingMeta
          .replace('{amount}', formatSetupMoney(activeSummary.expectedRemaining, defaultCurrency, lang))
          .replace('{percent}', formatSetupPercent(remainingRatio * 100, lang)),
      });
    }

    if (activeSummary.goals === 0) {
      items.push({ title: text.recNoGoals, meta: text.recNoGoalsMeta });
    }

    if (activeSummary.investments === 0) {
      items.push({ title: text.recNoInvestments, meta: text.recNoInvestmentsMeta });
    }

    if (items.length === 0) {
      items.push({
        title: text.recBalanced,
        meta: text.recBalancedMeta.replace('{count}', formatSetupNumber(savedDataPoints, lang)),
      });
    }

    return items.slice(0, 4);
  }

  function confirmExistingStep(stepId: Step) {
    setEditingExisting(prev => ({ ...prev, [stepId]: false }));
    if (stepId === 2) setIncomeEnabled(false);
    if (stepId === 3) setExpensesEnabled(false);
    if (stepId === 4) setGoalEnabled(false);
    setStep(nextStepAfter(stepId));
  }

  async function skipSetup() {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const username = String(user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`);
      const now = new Date().toISOString();
      const { error: profileError } = await db.from('profiles').upsert({
        id: user.id,
        username,
        email: user.email ?? null,
        default_currency: defaultCurrency,
        preferred_currency: defaultCurrency,
        currency: defaultCurrency,
        onboarding_completed: false,
        onboarding_skipped: true,
        onboarding_skipped_at: now,
        updated_at: now,
      }, { onConflict: 'id' });
      if (profileError) throw profileError;
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : text.errorRequired);
    } finally {
      setSaving(false);
    }
  }

  async function completeAndGoDashboard() {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const username = String(user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`);
      const now = new Date().toISOString();
      const focusValues = [focus.zakat ? 'zakat' : '', focus.charity ? 'charity' : ''].filter(Boolean).join(',');
      const activeSummary = buildSetupSummary();
      const { error: profileError } = await db.from('profiles').upsert({
        id: user.id,
        username,
        email: user.email ?? null,
        default_currency: defaultCurrency,
        preferred_currency: defaultCurrency,
        currency: defaultCurrency,
        financial_focus: focusValues || existingData.profile?.financial_focus || null,
        monthly_income_target: activeSummary.incomeTotal,
        onboarding_completed: true,
        onboarding_completed_at: now,
        onboarding_skipped: false,
        onboarding_skipped_at: null,
        updated_at: now,
      }, { onConflict: 'id' });
      if (profileError) throw profileError;
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : text.errorRequired);
    } finally {
      setSaving(false);
    }
  }

  async function insertWithFallback(
    table: string,
    payload: Record<string, unknown> | Array<Record<string, unknown>>,
    fallback?: Record<string, unknown> | Array<Record<string, unknown>>,
  ) {
    const first = await db.from(table).insert(payload);
    if (!first.error) return;
    if (!fallback || !/column|schema|PGRST|cache/i.test(first.error.message ?? '')) throw first.error;
    const second = await db.from(table).insert(fallback);
    if (second.error) throw second.error;
  }

  async function finishSetup() {
    if (!validateCurrentStep()) return;
    if (!user) {
      setError(text.errorAuth);
      return;
    }
    if (supabaseConfigError) {
      setError(supabaseConfigError);
      return;
    }

    setSaving(true);
    setError('');
    const counts: SetupSummary = buildSetupSummary();
    const incomeAmount = counts.incomeTotal;
    const focusValues = [focus.zakat ? 'zakat' : '', focus.charity ? 'charity' : ''].filter(Boolean).join(',');

    try {
      const username = String(user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`);
      const now = new Date().toISOString();
      const { error: profileError } = await db.from('profiles').upsert({
        id: user.id,
        username,
        email: user.email ?? null,
        default_currency: defaultCurrency,
        preferred_currency: defaultCurrency,
        currency: defaultCurrency,
        financial_focus: focusValues || null,
        monthly_income_target: incomeAmount,
        onboarding_completed: true,
        onboarding_completed_at: now,
        onboarding_skipped: false,
        onboarding_skipped_at: null,
        updated_at: now,
      }, { onConflict: 'id' });
      if (profileError) throw profileError;
      setGlobalCurrency(defaultCurrency);

      if (incomeEnabled && (editingExisting[2] || existingData.income.length === 0)) {
        const amount = toAmount(income.amount);
        const payload = {
          user_id: user.id,
          label: income.name.trim(),
          category: income.incomeType,
          amount,
          amount_kwd: income.currency === 'KWD' ? amount : null,
          exchange_rate: null,
          income_type: income.incomeType,
          status: 'received',
          received_date: income.receivedDate,
          currency: income.currency,
          source_name: income.name.trim(),
          notes: null,
          is_recurring: income.recurring,
          frequency: income.recurring ? 'monthly' : null,
          recurrence_start_date: income.recurring ? income.receivedDate : null,
          recurrence_end_date: null,
          confirmed_at: new Date().toISOString(),
        };
        const existingIncome = firstExistingIncome(existingData.income);
        if (editingExisting[2] && existingIncome?.id) {
          const { error: updateError } = await db.from('monthly_income_sources').update(payload).eq('id', existingIncome.id).eq('user_id', user.id);
          if (updateError) throw updateError;
        } else {
          await insertWithFallback('monthly_income_sources', payload, {
            user_id: user.id,
            label: income.name.trim(),
            category: income.incomeType,
            amount,
          });
        }
      }

      if (expensesEnabled && (editingExisting[3] || existingData.expenses.length === 0)) {
        const expenseEntries = [
          ['rent', text.rent],
          ['food', text.food],
          ['transport', text.transport],
          ['subscriptions', text.subscriptions],
          ['loans', text.loans],
          ['other', text.other],
        ].map(([key, label]) => ({ key, label, amount: toAmount(expenses[key] || '') }))
          .filter(item => Number.isFinite(item.amount) && item.amount > 0);
        if (expenseEntries.length > 0) {
          const rows = expenseEntries.map(item => ({
            user_id: user.id,
            name: item.label,
            amount: item.amount,
            category: item.key === 'rent' ? 'housing' : item.key,
            date: today(),
            currency: defaultCurrency,
          }));
          const fallbackRows = rows.map(row => ({
            user_id: row.user_id,
            name: row.name,
            amount: row.amount,
            category: row.category,
          }));
          await insertWithFallback('expense_items', rows, fallbackRows);
        }
      }

      if (goalEnabled && (editingExisting[4] || existingData.goals.length === 0)) {
        const target = toAmount(goal.targetAmount);
        const current = toAmount(goal.currentAmount);
        const duration = monthsUntil(goal.targetDate);
        const notes = JSON.stringify({
          currentAmount: current,
          deadline: goal.targetDate,
          category: 'setup',
          priority: goal.priority,
          currency: defaultCurrency,
          description: null,
          source: 'account_setup',
        });
        const existingGoal = existingData.goals[0];
        const goalPayload = {
          user_id: user.id,
          goal: goal.name.trim(),
          amount: target,
          current_amount: current,
          duration: duration ? String(duration) : null,
          duration_unit: duration ? 'month' : null,
          notes,
        };
        if (editingExisting[4] && existingGoal?.id) {
          const { error: updateError } = await db.from('financial_goals').update(goalPayload).eq('id', existingGoal.id).eq('user_id', user.id);
          if (updateError) throw updateError;
        } else {
          await insertWithFallback('financial_goals', goalPayload, {
            user_id: user.id,
            goal: goal.name.trim(),
            amount: target,
            duration: duration ? String(duration) : null,
            duration_unit: duration ? 'month' : null,
            notes,
          });
        }
      }

      if (savingsEnabled) {
        const label = `${savings.type.trim()} (${savings.currency})`;
        await insertWithFallback('savings_items', {
          user_id: user.id,
          name: label,
          amount: toAmount(savings.amount),
          currency: savings.currency,
        }, {
          user_id: user.id,
          name: label,
          amount: toAmount(savings.amount),
        });
      }

      if (investmentsEnabled) {
        const label = `${investment.type.trim()} (${investment.currency})`;
        await insertWithFallback('investment_items', {
          user_id: user.id,
          name: label,
          amount: toAmount(investment.amount),
          type: investment.type.trim(),
          current_value: toAmount(investment.amount),
          notes: JSON.stringify({ currency: investment.currency, source: 'account_setup' }),
        }, {
          user_id: user.id,
          name: label,
          amount: toAmount(investment.amount),
        });
      }

      if (projectEnabled) {
        const capital = project.capital.trim() ? toAmount(project.capital) : null;
        const notes = {
          type: project.type,
          status: project.status,
          capital: capital ?? '',
          currency: defaultCurrency,
          setupCreated: true,
        };
        await db.from('projects').insert({
          user_id: user.id,
          name: project.name.trim(),
          emoji: null,
          budget: capital,
          timeline: null,
          duration_unit: null,
          steps: [],
          notes,
        });
      }

      setSummary(counts);
      setStep(8);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.errorRequired);
    } finally {
      setSaving(false);
    }
  }

  function nextStep() {
    if (!validateCurrentStep()) return;
    if (step === 7) {
      void finishSetup();
      return;
    }
    const next = nextStepAfter(step);
    if (next === 8) {
      setSummary(buildSetupSummary());
    }
    setStep(next);
  }

  if (!mounted || authLoading || (user && existingLoading)) {
    return (
      <main className="setup-loading" dir={dir}>
        <Loader2 className="spin" size={34} />
        <span>{text.loading}</span>
        <style jsx>{`.setup-loading{min-height:100vh;display:grid;place-items:center;align-content:center;gap:12px;background:var(--background);color:var(--primary);font-family:var(--font-ui)}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="setup-auth" dir={dir}>
        <section>
          <h1>{text.signInTitle}</h1>
          <button type="button" onClick={() => router.push(loginHrefForCurrentLocation('/setup'))}>{text.signInAction}</button>
        </section>
        <style jsx>{`.setup-auth{min-height:100vh;display:grid;place-items:center;background:var(--background);color:var(--foreground);font-family:var(--font-ui)}.setup-auth section{width:min(480px,calc(100% - 32px));background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);padding:24px;text-align:center;box-shadow:var(--shadow-card)}.setup-auth button{margin-top:16px;min-height:44px;border:1px solid var(--primary);border-radius:var(--radius-control);background:var(--primary);color:var(--primary-foreground);padding:0 18px;font-weight:600;cursor:pointer}`}</style>
      </main>
    );
  }

  return (
    <div className="setup-page" dir={dir}>
      <DashboardPageShell
        ariaLabel={text.pageName}
        className="account-setup-workspace-page"
        contentClassName="setup-content"
      >
        <header className="setup-top">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.pageName}</h1>
          </div>
        </header>

        <section className={`setup-hero ${step === 8 ? 'finish-hero' : ''}`}>
          <div>
            <span className="hero-badge">{text.realData}</span>
            <h2>{step === 8 ? text.saved : text.title}</h2>
            <p>{step === 8 ? text.progressSubtitle : text.subtitle}</p>
          </div>
          <div className="progress-orb" aria-label={`${progress}%`}>
            <strong>{progress}%</strong>
            <small>{text.steps[step]}</small>
          </div>
        </section>

        <section className={`setup-card ${step === 8 ? 'setup-card-final' : ''}`} aria-labelledby="setup-step-title">
          {step < 8 && (
            <Stepper
              step={step}
              steps={text.steps}
              statuses={stepStatuses}
              ariaLabel={text.pageName}
              labels={{
                completed: text.completedStep,
                current: text.currentStep,
                upcoming: text.upcomingStep,
              }}
            />
          )}
          <div className="step-layout">
            <div className="step-main">
              {step < 8 && (
                <div className="setup-info-alert">
                  <ShieldCheck size={18} aria-hidden="true" />
                  <span>{text.realDataLong}</span>
                </div>
              )}
              {renderStep()}
              {error && <div className="setup-error" role="alert">{error}</div>}
              {step > 0 && step < 8 && (
                <div className="wizard-actions">
                  <button type="button" className="ghost-btn" onClick={() => setStep(current => Math.max(0, current - 1) as Step)} disabled={saving}>
                    <ArrowLeft size={16} />
                    {text.back}
                  </button>
                  <button type="button" className="primary-btn" onClick={nextStep} disabled={saving}>
                    {saving ? <Loader2 className="spin" size={16} /> : step === 7 ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
                    {saving ? text.saving : step === 7 ? text.finish : text.next}
                  </button>
                </div>
              )}
            </div>
            <aside className="step-side" aria-label={text.progressTitle}>
              <div className="step-side-head">
                <span>{step + 1}</span>
                <div>
                  <small>{text.currentStep}</small>
                  <strong>{text.steps[step]}</strong>
                </div>
              </div>
              <div className="step-progress" aria-label={`${progress}%`}><i style={{ width: `${progress}%` }} /></div>
              <ProgressPanel
                step={step}
                progress={progress}
                steps={text.steps}
                statuses={stepStatuses}
                labels={{
                  title: text.progressTitle,
                  subtitle: text.progressSubtitle,
                  complete: text.progressComplete,
                  listTitle: text.stepListTitle,
                  completed: text.completedStep,
                  current: text.currentStep,
                  upcoming: text.upcomingStep,
                  optional: text.optional,
                }}
              />
            </aside>
          </div>
        </section>
      </DashboardPageShell>
      <style jsx>{`
        .setup-page{min-height:100vh;background:var(--background);color:var(--foreground);font-family:var(--font-ui);overflow-x:hidden}
        :global(.setup-page .account-setup-workspace-page){inline-size:100%;max-inline-size:none}
        .setup-content{display:grid;inline-size:100%;max-inline-size:none;margin-inline:0;gap:22px;min-width:0}
        .setup-top{display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:0}
        .setup-top span{display:block;color:var(--foreground-muted);font-size:12px;font-weight:600}
        .setup-top h1{margin:3px 0 0;font-size:clamp(24px,4vw,36px);font-weight:700;color:var(--foreground)}
        .setup-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;background:var(--hero-gradient);border:1px solid color-mix(in srgb,var(--hero-foreground) 18%,transparent);border-radius:var(--radius-panel);padding:clamp(28px,5vw,52px);color:var(--hero-foreground);box-shadow:var(--shadow-lg);overflow:hidden}
        .setup-hero:after{display:none}
        .hero-badge{display:inline-flex;border:1px solid color-mix(in srgb,var(--hero-foreground) 25%,transparent);background:color-mix(in srgb,var(--hero-foreground) 10%,transparent);color:var(--hero-foreground);border-radius:var(--radius-pill);padding:8px 13px;font-size:12px;font-weight:600}
        .setup-hero h2{margin:18px 0 10px;color:var(--hero-foreground);font-size:clamp(30px,5vw,56px);line-height:1.04;font-weight:700;letter-spacing:0}
        .setup-hero p{margin:0;max-width:760px;color:var(--hero-foreground-muted);font-size:clamp(15px,2vw,18px);font-weight:400;line-height:1.8}
        .setup-hero.finish-hero{background:var(--success-soft);border-color:color-mix(in srgb,var(--success) 28%,var(--border));color:var(--foreground);padding:clamp(20px,3vw,30px);box-shadow:var(--shadow-card)}
        .setup-hero.finish-hero:after{display:none}
        .setup-hero.finish-hero .hero-badge{background:var(--surface);border-color:color-mix(in srgb,var(--success) 30%,var(--border));color:var(--success)}
        .setup-hero.finish-hero h2{margin:12px 0 7px;color:var(--foreground);font-size:clamp(24px,3vw,34px);line-height:1.18}
        .setup-hero.finish-hero p{max-width:660px;color:var(--foreground-secondary);font-size:14px;line-height:1.75}
        .progress-orb{position:relative;z-index:1;width:150px;height:150px;border-radius:var(--radius-pill);display:grid;place-items:center;text-align:center;align-content:center;background:color-mix(in srgb,var(--hero-foreground) 9%,transparent);border:1px solid color-mix(in srgb,var(--hero-foreground) 25%,transparent);box-shadow:var(--shadow-md)}
        .progress-orb strong{font-size:34px;color:var(--hero-foreground);font-family:var(--font-data)}.progress-orb small{max-width:108px;color:var(--hero-foreground-muted);font-weight:500;line-height:1.35}
        .setup-hero.finish-hero .progress-orb{width:118px;height:118px;background:var(--surface);border-color:color-mix(in srgb,var(--success) 28%,var(--border));box-shadow:var(--shadow-sm)}
        .setup-hero.finish-hero .progress-orb strong{font-size:30px;color:var(--success)}
        .setup-hero.finish-hero .progress-orb small{max-width:92px;color:var(--foreground-secondary)}
        .setup-card{background:var(--surface-elevated);border:1px solid var(--border);border-radius:var(--radius-panel);padding:22px;box-shadow:var(--shadow-card);min-width:0}
        .setup-card-final{padding:18px}
        .step-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,320px);gap:20px;align-items:start;min-width:0}
        .step-side{position:sticky;top:calc(var(--app-header-height) + var(--workspace-page-padding-block));align-self:start;background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-panel);padding:18px;display:grid;gap:14px;box-shadow:var(--shadow-xs);min-width:0}
        .step-side-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center}
        .step-side-head>span{width:48px;height:48px;border-radius:var(--radius-card);background:var(--primary);color:var(--primary-foreground);display:grid;place-items:center;font-weight:700;font-size:18px}
        .step-side small{display:block;color:var(--primary-hover);font-size:12px;font-weight:600;margin-bottom:4px}.step-side strong{display:block;font-size:19px;color:var(--foreground);line-height:1.35}.step-progress{height:11px;border-radius:var(--radius-pill);background:var(--border);overflow:hidden}.step-progress i{display:block;height:100%;border-radius:var(--radius-pill);background:var(--primary);transition:width .28s ease}
        .setup-plan{display:grid;gap:9px;border-top:1px solid var(--border);padding-top:13px}.setup-plan h3{margin:0;color:var(--foreground);font-size:17px}.setup-plan p{margin:0;color:var(--foreground-secondary);font-size:12px;font-weight:400;line-height:1.65}.setup-plan ul{display:grid;gap:8px;margin:0;padding:0;list-style:none}.setup-plan li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-control);padding:9px;min-width:0}.setup-plan li svg{color:var(--foreground-muted)}.setup-plan li span{color:var(--foreground);font-weight:600;font-size:12px;line-height:1.35;overflow-wrap:anywhere}.setup-plan li em{font-style:normal;border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-secondary);padding:4px 7px;font-size:12px;font-weight:600;white-space:nowrap}.setup-plan li.done svg{color:var(--success)}.setup-plan li.done em{background:var(--success-soft);color:var(--success)}.setup-plan li.active{border-color:color-mix(in srgb,var(--primary) 34%,var(--border));background:var(--primary-soft)}.setup-plan li.active svg{color:var(--primary)}.setup-plan li.active em{background:var(--primary);color:var(--primary-foreground)}
        .step-main{min-width:0;display:grid;gap:18px;align-content:start;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-panel);padding:clamp(18px,3vw,28px);box-shadow:var(--shadow-xs);min-height:420px}
        .setup-info-alert{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;border:1px solid color-mix(in srgb,var(--info) 28%,var(--border));background:var(--info-soft);color:var(--foreground);border-radius:var(--radius-card);padding:12px 14px;font-weight:500;line-height:1.65}.setup-info-alert svg{color:var(--info);margin-top:2px}
        .step-panel{display:grid;gap:16px;min-width:0}
        .step-heading{display:flex;align-items:flex-start;gap:13px}.step-heading svg{color:var(--primary);flex:0 0 auto}.step-heading h2{margin:0;color:var(--foreground);font-size:clamp(24px,3vw,32px);line-height:1.22}.step-heading p{margin:7px 0 0;color:var(--foreground-secondary);line-height:1.8;font-weight:400;font-size:15px}
        .choice-row{display:flex;gap:10px;flex-wrap:wrap}.choice-btn,.toggle-card{min-height:48px;border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted);color:var(--foreground);padding:0 16px;font:600 14px var(--font-ui);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,border-color .18s ease}.choice-btn:hover,.toggle-card:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--primary) 38%,var(--border));box-shadow:var(--shadow-sm)}.choice-btn:focus-visible,.toggle-card:focus-visible,.focus-card:focus-visible{outline:3px solid var(--focus-ring);outline-offset:3px}.choice-btn.active,.toggle-card.active{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}
        .income-decision-card{display:grid;justify-items:center;text-align:center;gap:18px;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);padding:clamp(22px,4vw,34px);box-shadow:var(--shadow-card);min-width:0;overflow:hidden}.income-decision-card.active{border-color:color-mix(in srgb,var(--primary) 42%,var(--border));box-shadow:var(--shadow-md)}.income-decision-icon{width:76px;height:76px;border-radius:var(--radius-pill);display:grid;place-items:center;background:var(--primary-soft);border:1px solid color-mix(in srgb,var(--primary) 28%,var(--border));color:var(--primary);box-shadow:var(--shadow-xs)}.income-decision-copy{display:grid;gap:10px;max-width:620px}.income-decision-copy h3{margin:0;color:var(--foreground);font-size:clamp(24px,3.5vw,34px);line-height:1.25;font-weight:700}.income-decision-copy p{margin:0;color:var(--foreground-secondary);font-size:15px;font-weight:400;line-height:1.9}.income-decision-actions{margin-top:8px;display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:340px}.income-action-btn{width:100%;min-height:52px;border-radius:var(--radius-card);padding:0 22px;font:600 15px var(--font-ui);display:inline-flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;white-space:nowrap;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,border-color .18s ease,filter .18s ease,color .18s ease;min-width:0}.income-action-btn.primary{border:1px solid var(--primary);background:var(--primary);color:var(--primary-foreground);box-shadow:var(--shadow-sm)}.income-action-btn:active{transform:translateY(0) scale(.985)}.income-action-btn:focus-visible{outline:3px solid var(--focus-ring);outline-offset:3px}.income-action-btn.primary:hover{transform:translateY(-2px);background:var(--primary-hover);border-color:var(--primary-hover);box-shadow:var(--shadow-md)}.income-skip-link{display:inline-flex;align-items:center;justify-content:center;gap:7px;background:none;border:none;padding:6px 12px;border-radius:var(--radius-sm);font:700 13px var(--font-ui);color:var(--foreground-secondary);cursor:pointer;transition:color .18s,background .18s;white-space:nowrap}.income-skip-link:hover{color:var(--primary);background:var(--primary-soft)}.income-skip-link:active{transform:scale(.97)}
        .welcome-actions{margin-top:10px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;min-width:0}
        .welcome-actions .setup-start-btn{min-height:52px;border-radius:var(--radius-card);padding:0 22px;gap:12px;font-size:15px;white-space:nowrap;box-shadow:var(--shadow-sm)}
        .welcome-actions .setup-start-btn span{line-height:1.2}
        .welcome-actions .setup-start-btn .cta-icon{flex:0 0 auto}
        .welcome-actions .setup-skip-btn{min-height:48px;border-radius:var(--radius-card);padding:0 18px;background:var(--surface);border-color:var(--border-strong);white-space:nowrap}
        .existing-data-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:13px;align-items:start;border:1px solid color-mix(in srgb,var(--success) 30%,var(--border));background:var(--success-soft);border-radius:var(--radius-card);padding:16px;box-shadow:var(--shadow-xs)}.existing-data-card>svg{color:var(--success);margin-top:3px}.existing-data-card h3{margin:0;color:var(--foreground);font-size:16px;font-weight:700}.existing-data-card strong{display:block;margin-top:6px;color:var(--success);font-size:24px;font-weight:700;overflow-wrap:anywhere;font-family:var(--font-data)}.existing-data-card p{margin:6px 0 0;color:var(--foreground-secondary);font-weight:400;line-height:1.65}.existing-actions{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap}.existing-actions .primary-btn,.existing-actions .ghost-btn{min-height:44px}
        .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .form-field{display:grid;gap:7px;min-width:0}.form-field.full{grid-column:1/-1}.form-field span{font-weight:600;color:var(--foreground-secondary);font-size:13px}.form-field input,.form-field select{width:100%;min-height:46px;border:1px solid var(--border-strong);background:var(--control-background);color:var(--foreground);border-radius:var(--radius-control);padding:0 12px;font:500 14px var(--font-ui);outline:none}.form-field input:focus,.form-field select:focus{border-color:var(--focus-ring);box-shadow:var(--focus-shadow);background:var(--surface)}
        .income-form-card{display:grid;gap:18px;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);padding:clamp(18px,3vw,26px);box-shadow:var(--shadow-card);min-width:0}.income-form-head{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start;gap:13px;min-width:0}.income-form-icon{width:48px;height:48px;border-radius:var(--radius-card);display:grid;place-items:center;background:var(--primary-soft);border:1px solid color-mix(in srgb,var(--primary) 28%,var(--border));color:var(--primary);box-shadow:var(--shadow-xs)}.income-form-head h3{margin:0;color:var(--foreground);font-size:20px;font-weight:700;line-height:1.35}.income-form-head p{margin:6px 0 0;color:var(--foreground-secondary);font-size:14px;font-weight:400;line-height:1.8}.income-form-grid{background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-panel);padding:14px}
        .recurring-income-card{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:16px;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-card);padding:16px;min-width:0;box-shadow:var(--shadow-xs)}.recurring-income-copy{display:grid;gap:5px;min-width:0;text-align:start}.recurring-income-copy strong{color:var(--foreground);font-size:15px;font-weight:600;line-height:1.45}.recurring-income-copy p{margin:0;color:var(--foreground-secondary);font-size:13px;font-weight:400;line-height:1.7}.recurring-income-switch{width:58px;height:32px;border-radius:var(--radius-pill);border:1px solid var(--border-strong);background:var(--surface-muted);padding:3px;display:flex;align-items:center;justify-content:flex-start;cursor:pointer;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease;flex:0 0 auto}.recurring-income-switch span{width:26px;height:26px;border-radius:var(--radius-pill);background:var(--surface-elevated);box-shadow:var(--shadow-sm);transition:transform .18s ease}.recurring-income-switch.active{justify-content:flex-end;border-color:var(--primary);background:var(--primary);box-shadow:var(--shadow-xs)}.recurring-income-switch:focus-visible{outline:3px solid var(--focus-ring);outline-offset:3px}
        .expense-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.summary-card{background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-card);padding:13px;min-width:0}.summary-card small{display:block;color:var(--foreground-muted);font-weight:500}.summary-card strong{display:block;margin-top:5px;color:var(--foreground);font-size:22px;font-family:var(--font-data)}
        :global(.setup-page .progress-panel){display:grid;gap:13px;border-top:1px solid var(--border);padding-top:13px;min-width:0}
        :global(.setup-page .progress-panel-head){display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}
        :global(.setup-page .progress-panel-head svg){width:38px;height:38px;border-radius:var(--radius-control);background:var(--primary-soft);color:var(--primary);padding:9px}
        :global(.setup-page .progress-panel-head h3){margin:0;color:var(--foreground);font-size:16px;font-weight:600;line-height:1.35}
        :global(.setup-page .progress-panel-head p){margin:4px 0 0;color:var(--foreground-secondary);font-size:12px;font-weight:400;line-height:1.6}
        :global(.setup-page .progress-panel-meter){display:grid;gap:8px}
        :global(.setup-page .progress-panel-meter strong){font-size:18px;color:var(--success);font-family:var(--font-data)}
        :global(.setup-page .progress-panel-meter span){height:10px;border-radius:var(--radius-pill);background:var(--border);overflow:hidden}
        :global(.setup-page .progress-panel-meter i){display:block;height:100%;border-radius:var(--radius-pill);background:var(--success)}
        :global(.setup-page .progress-details){display:grid;gap:9px;min-width:0}
        :global(.setup-page .progress-details summary){display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;list-style:none;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-control);padding:10px 11px;color:var(--foreground);font-weight:600}
        :global(.setup-page .progress-details summary::-webkit-details-marker){display:none}
        :global(.setup-page .progress-details summary svg){color:var(--primary);transition:transform .18s ease}
        :global(.setup-page .progress-details[open] summary svg){transform:rotate(180deg)}
        :global(.setup-page .progress-details ol){display:grid;gap:7px;margin:9px 0 0;padding:0;list-style:none;max-height:390px;overflow:auto}
        :global(.setup-page .progress-details li){display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"icon title badge" "icon state badge";gap:3px 9px;align-items:center;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-control);padding:9px;min-width:0}
        :global(.setup-page .progress-row-icon){grid-area:icon;width:30px;height:30px;border-radius:var(--radius-pill);display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);font-size:12px;font-weight:600}
        :global(.setup-page .progress-details li b){grid-area:title;min-width:0;color:var(--foreground);font-size:12px;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        :global(.setup-page .progress-details li small){grid-area:state;color:var(--foreground-secondary);font-size:12px;font-weight:500}
        :global(.setup-page .progress-details li em){grid-area:badge;font-style:normal;border-radius:var(--radius-pill);background:var(--primary-soft);color:var(--primary-hover);font-size:12px;font-weight:600;padding:4px 7px;white-space:nowrap}
        :global(.setup-page .progress-details li.done){background:var(--success-soft);border-color:color-mix(in srgb,var(--success) 30%,var(--border))}
        :global(.setup-page .progress-details li.done .progress-row-icon){background:var(--success-soft);color:var(--success)}
        :global(.setup-page .progress-details li.done b){color:var(--success)}
        :global(.setup-page .progress-details li.active){background:var(--primary-soft);border-color:color-mix(in srgb,var(--primary) 34%,var(--border))}
        :global(.setup-page .progress-details li.optional){background:var(--surface-muted)}
        .completion-panel{gap:16px}
        .completion-dashboard{background:var(--surface);border-color:var(--border);box-shadow:var(--shadow-card)}
        .completion-compact{max-width:100%;align-content:start}
        .completion-hero{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:center;border:1px solid color-mix(in srgb,var(--success) 28%,var(--border));background:var(--success-soft);border-radius:var(--radius-panel);padding:18px 20px;box-shadow:var(--shadow-sm);min-width:0}
        .completion-success-icon{width:66px;height:66px;border-radius:var(--radius-panel);display:grid;place-items:center;background:var(--success);color:var(--foreground-inverse);box-shadow:var(--shadow-sm);flex:0 0 auto}
        .completion-copy{min-width:0}
        .completion-copy span{display:inline-flex;border-radius:var(--radius-pill);background:var(--surface);color:var(--success);padding:5px 10px;font-size:12px;font-weight:600}
        .completion-copy h2{margin:9px 0 6px;color:var(--foreground);font-size:clamp(24px,3vw,34px);line-height:1.2;font-weight:700}
        .completion-copy p{margin:0;max-width:760px;color:var(--foreground-secondary);font-size:14px;line-height:1.75;font-weight:400}
        .completion-summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;min-width:0}
        .completion-summary-grid :global(.completion-summary-card){display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-card);padding:15px;min-width:0;min-height:122px;box-shadow:var(--shadow-xs)}
        .completion-summary-grid :global(.summary-icon){width:42px;height:42px;border-radius:var(--radius-card);display:grid;place-items:center;background:var(--primary-soft);color:var(--primary);flex:0 0 auto}
        .completion-summary-grid :global(.completion-summary-card.currency .summary-icon){background:var(--info-soft);color:var(--info)}
        .completion-summary-grid :global(.completion-summary-card.income .summary-icon){background:var(--success-soft);color:var(--success)}
        .completion-summary-grid :global(.completion-summary-card.saving .summary-icon){background:var(--warning-soft);color:var(--warning)}
        .completion-summary-grid :global(.completion-summary-card small){display:block;color:var(--foreground-secondary);font-size:12px;font-weight:600;line-height:1.35}
        .completion-summary-grid :global(.completion-summary-card strong){display:block;margin-top:6px;color:var(--foreground);font-size:clamp(19px,2vw,25px);line-height:1.18;font-weight:700;overflow-wrap:anywhere;unicode-bidi:isolate;font-family:var(--font-data)}
        .completion-summary-grid :global(.completion-summary-card p){margin:7px 0 0;color:var(--foreground-secondary);font-size:12px;font-weight:400;line-height:1.55}
        .financial-snapshot-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,0.95fr);gap:14px;align-items:center;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-panel);padding:16px;box-shadow:var(--shadow-xs);min-width:0}
        .snapshot-copy{min-width:0}.snapshot-copy span{display:inline-flex;border-radius:var(--radius-pill);background:var(--primary-soft);color:var(--primary);padding:5px 10px;font-size:12px;font-weight:600}.snapshot-copy h3{margin:8px 0 5px;color:var(--foreground);font-size:19px;font-weight:700}.snapshot-copy p{margin:0;color:var(--foreground-secondary);font-size:13px;font-weight:400;line-height:1.65}
        .snapshot-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;min-width:0}.snapshot-metric{min-width:0;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px;box-shadow:var(--shadow-xs)}.snapshot-metric.primary{border-color:color-mix(in srgb,var(--primary) 32%,var(--border));background:var(--primary-soft)}.snapshot-metric small{display:block;color:var(--foreground-secondary);font-size:12px;font-weight:600;line-height:1.35}.snapshot-metric strong{display:block;margin-top:6px;color:var(--foreground);font-size:clamp(18px,2vw,23px);font-weight:700;line-height:1.16;overflow-wrap:anywhere;unicode-bidi:isolate;font-family:var(--font-data)}
        .recommendation-panel{display:grid;gap:12px;border:1px solid color-mix(in srgb,var(--accent) 28%,var(--border));background:var(--accent-soft);border-radius:var(--radius-panel);padding:16px;min-width:0;box-shadow:var(--shadow-xs)}
        .recommendation-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}
        .recommendation-head>svg{width:38px;height:38px;border-radius:var(--radius-control);background:var(--accent);color:var(--accent-foreground);padding:9px}
        .recommendation-head h3{margin:0;color:var(--foreground);font-size:18px;font-weight:700}
        .recommendation-head p{margin:4px 0 0;color:var(--foreground-secondary);font-size:13px;font-weight:400;line-height:1.6}
        .recommendation-list{display:grid;grid-template-columns:1fr;gap:8px}
        .recommendation-list article{display:grid;grid-template-columns:auto minmax(0,1fr);gap:9px;align-items:start;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-control);padding:10px 12px;min-width:0}
        .recommendation-list article>svg{color:var(--success);margin-top:2px}
        .recommendation-list strong{display:block;color:var(--foreground);font-size:13px;line-height:1.5}
        .recommendation-list span{display:block;margin-top:3px;color:var(--foreground-secondary);font-size:12px;font-weight:400;line-height:1.5}
        .recommendation-single{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;border:1px solid var(--border);background:var(--surface);border-radius:var(--radius-card);padding:12px;min-width:0}.recommendation-single>svg{color:var(--success);margin-top:2px}.recommendation-single strong{display:block;color:var(--foreground);font-size:14px;line-height:1.55}.recommendation-single span{display:block;margin-top:4px;color:var(--foreground-secondary);font-size:12px;font-weight:400;line-height:1.55}
        .recommendation-surplus{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid color-mix(in srgb,var(--success) 28%,var(--border));background:var(--success-soft);border-radius:var(--radius-card);padding:11px 13px;min-width:0}.recommendation-surplus small{color:var(--success);font-size:12px;font-weight:600}.recommendation-surplus strong{color:var(--success);font-size:clamp(18px,2vw,24px);font-weight:700;overflow-wrap:anywhere;unicode-bidi:isolate;font-family:var(--font-data)}
        .completion-actions{justify-content:flex-end;border-top:1px solid var(--border);padding-top:14px;margin-top:0}
        .completion-actions button{min-height:52px;border-radius:var(--radius-card);padding:0 18px;box-shadow:var(--shadow-xs)}
        .completion-actions button.primary{min-width:min(300px,100%);font-size:15px;box-shadow:var(--shadow-sm)}
        .completion-actions .secondary-action{border-color:var(--border-strong);background:var(--surface)}
        .completion-actions .tertiary-action{background:var(--surface-muted)}
        .report-modal-backdrop{position:fixed;inset:0;z-index:160;display:grid;place-items:center;background:var(--background-overlay);backdrop-filter:blur(10px);padding:18px}
        .initial-report-modal{width:min(860px,100%);max-height:min(88dvh,860px);overflow:auto;background:var(--surface-elevated);border:1px solid var(--border);border-radius:var(--radius-panel);padding:18px;box-shadow:var(--shadow-popover);display:grid;gap:14px}
        .report-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.report-modal-head span{display:block;color:var(--primary);font-size:12px;font-weight:600}.report-modal-head h3{margin:4px 0;color:var(--foreground);font-size:26px;font-weight:700}.report-modal-head p{margin:0;color:var(--foreground-secondary);line-height:1.7;font-weight:400}.report-modal-head button{width:40px;height:var(--control-h);border-radius:var(--radius-control);border:1px solid var(--border);background:var(--surface-muted);color:var(--foreground);display:grid;place-items:center;cursor:pointer;flex:0 0 auto}
        .report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.report-grid :global(.report-card){display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:13px;min-width:0}.report-grid :global(.report-card svg){width:38px;height:38px;border-radius:var(--radius-control);background:var(--primary-soft);color:var(--primary);padding:9px}.report-grid :global(.report-card small){display:block;color:var(--foreground-secondary);font-weight:600}.report-grid :global(.report-card strong){display:block;margin-top:5px;color:var(--foreground);font-size:21px;font-weight:700;overflow-wrap:anywhere;unicode-bidi:isolate;font-family:var(--font-data)}.report-grid :global(.report-card p){margin:5px 0 0;color:var(--foreground-secondary);font-size:12px;font-weight:400;line-height:1.6}
        .report-recommendation{border:1px solid color-mix(in srgb,var(--accent) 28%,var(--border));background:var(--accent-soft);border-radius:var(--radius-card);padding:13px}.report-recommendation h4{margin:0 0 8px;color:var(--foreground);font-size:16px}.report-recommendation p{margin:6px 0 0;color:var(--foreground-secondary);font-weight:400;line-height:1.6}
        .report-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.report-actions button{min-height:44px;border-radius:var(--radius-control);border:1px solid var(--border);background:var(--surface-muted);color:var(--foreground);padding:0 15px;font-weight:600;font-family:var(--font-ui);cursor:pointer}.report-actions button.primary{border:1px solid var(--primary);background:var(--primary);color:var(--primary-foreground)}.report-data-points{color:var(--foreground-secondary);font-weight:500}
        .focus-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.focus-card{border:1px solid var(--border);border-radius:var(--radius-card);background:var(--surface-muted);padding:14px;text-align:start;display:grid;gap:8px;color:var(--foreground);font-weight:600;cursor:pointer}.focus-card.active{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}
        .setup-error{border:1px solid color-mix(in srgb,var(--danger) 30%,var(--border));background:var(--danger-soft);color:var(--danger);border-radius:var(--radius-control);padding:12px;font-weight:600}
        .wizard-actions{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:18px;margin-top:auto}.primary-btn,.ghost-btn{min-height:52px;border-radius:var(--radius-card);padding:0 20px;font:600 14px var(--font-ui);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease,border-color .18s ease,background .18s ease}.primary-btn{border:1px solid var(--primary);background:var(--primary);color:var(--primary-foreground);box-shadow:var(--shadow-sm)}.primary-btn:not(:disabled):hover{transform:translateY(-2px);background:var(--primary-hover);border-color:var(--primary-hover);box-shadow:var(--shadow-md)}.primary-btn:not(:disabled):active{transform:translateY(0) scale(.985)}.primary-btn:focus-visible,.ghost-btn:focus-visible,.finish-actions button:focus-visible{outline:3px solid var(--focus-ring);outline-offset:3px}.ghost-btn{border:1px solid var(--border-strong);background:var(--surface-muted);color:var(--foreground)}.ghost-btn:not(:disabled):hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--primary) 38%,var(--border));background:var(--surface-hover);box-shadow:var(--shadow-sm)}.primary-btn:disabled,.ghost-btn:disabled{opacity:.65;cursor:not-allowed;transform:none;box-shadow:none}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .finish-actions{display:flex;gap:10px;flex-wrap:wrap}.finish-actions button{min-height:46px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground);padding:0 15px;font-weight:600;font-family:var(--font-ui);cursor:pointer}.finish-actions button.primary{border:1px solid var(--primary);background:var(--primary);color:var(--primary-foreground)}
        @media(max-width:960px){.setup-page .sfm-dashboard-page-shell{margin-inline-start:0}.setup-hero,.step-layout,.financial-snapshot-card{grid-template-columns:minmax(0,1fr)}.progress-orb{width:124px;height:124px}.step-side{position:static;top:auto}.setup-plan ul{grid-template-columns:repeat(2,minmax(0,1fr))}.completion-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.recommendation-list{grid-template-columns:1fr}}
        @media(max-width:720px){:global(.setup-page .sfm-dashboard-page-shell){padding-inline:16px!important}.setup-top{align-items:flex-start}.setup-hero{grid-template-columns:1fr;border-radius:var(--radius-panel);padding:20px}.setup-hero.finish-hero .progress-orb,.progress-orb{width:108px;height:108px}.setup-card{padding:14px;border-radius:var(--radius-panel)}.setup-card-final{padding:12px}.form-grid,.expense-grid,.summary-grid,.focus-grid,.setup-plan ul,.completion-summary-grid,.snapshot-metrics,.report-grid{grid-template-columns:1fr}.wizard-actions,.choice-row,.welcome-actions,.finish-actions,.report-actions{display:grid;grid-template-columns:1fr}.income-decision-actions{max-width:100%}.income-skip-link{width:100%;justify-content:center}.primary-btn,.ghost-btn,.choice-btn,.toggle-card,.finish-actions button,.income-action-btn,.report-actions button{width:100%;min-width:0}.income-decision-card{padding:22px 16px;border-radius:var(--radius-panel)}.income-decision-icon{width:68px;height:68px}.recurring-income-card{grid-template-columns:minmax(0,1fr) auto;align-items:start;padding:14px;border-radius:var(--radius-card)}.step-main{padding:14px;min-height:auto}.step-heading h2{font-size:22px}.completion-hero{grid-template-columns:1fr;text-align:center;justify-items:center;border-radius:var(--radius-card);padding:18px}.completion-copy h2{font-size:24px}.completion-summary-grid :global(.completion-summary-card){grid-template-columns:minmax(0,1fr);text-align:start}.financial-snapshot-card,.recommendation-panel{border-radius:var(--radius-card);padding:14px}.recommendation-head,.recommendation-single{grid-template-columns:minmax(0,1fr)}.recommendation-surplus{display:grid;justify-items:start}.report-modal-backdrop{align-items:end;padding:10px}.initial-report-modal{max-height:88dvh;border-radius:var(--radius-panel) var(--radius-panel) 0 0;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))}.report-modal-head{display:grid}.report-modal-head button{justify-self:end}:global(.setup-page .progress-details ol){max-height:280px}:global(.setup-page .progress-details li){grid-template-columns:auto minmax(0,1fr);grid-template-areas:"icon title" "icon state" "icon badge"}:global(.setup-page .progress-details li em){justify-self:start}.report-grid :global(.report-card){grid-template-columns:minmax(0,1fr)}}
      `}</style>
    </div>
  );

  function renderStep() {
    if (step === 0) {
      return (
        <section className="step-panel">
          <div className="step-heading">
            <Wallet size={28} />
            <div>
              <h2 id="setup-step-title">{text.title}</h2>
              <p>{text.subtitle}</p>
            </div>
          </div>
          <div className="welcome-actions" style={{marginTop:'10px',display:'flex',alignItems:'center',gap:'14px',flexWrap:'wrap',minWidth:0}}>
                  <button type="button" style={{minHeight:'52px',borderRadius:'var(--radius-card)',padding:'0 22px',gap:'12px',fontSize:'15px',border:0,background:'var(--primary)',color:'var(--primary-foreground)',boxShadow:'var(--shadow-sm)',fontFamily:'var(--font-ui)',fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',whiteSpace:'nowrap'}} onClick={() => {
              setSummary(buildSetupSummary());
              setStep(nextIncompleteStep);
            }}>
              <span>{text.start}</span>
              {dir === 'rtl' ? <ArrowLeft className="cta-icon" size={18} aria-hidden="true" /> : <ArrowRight className="cta-icon" size={18} aria-hidden="true" />}
            </button>
                  <button type="button" style={{minHeight:'48px',borderRadius:'var(--radius-card)',padding:'0 18px',background:'var(--surface)',border:'1px solid var(--border-strong)',color:'var(--foreground)',fontFamily:'var(--font-ui)',fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',whiteSpace:'nowrap'}} onClick={skipSetup} disabled={saving}>
              {text.skipNow}
            </button>
          </div>
        </section>
      );
    }

    if (step === 1) {
      return (
        <section className="step-panel">
          <div className="step-heading">
            <CircleDollarSign size={28} />
            <div>
              <h2 id="setup-step-title">{text.currencyTitle}</h2>
              <p>{text.currencyBody}</p>
            </div>
          </div>
          <CurrencySelect value={defaultCurrency} onChange={setCurrencyEverywhere} lang={lang} label={text.currencyTitle} ariaLabel={text.currencyTitle} />
        </section>
      );
    }

    if (step === 2) {
      const existingIncome = firstExistingIncome(existingData.income);
      const showExistingIncome = existingIncome && !editingExisting[2];
      const showIncomeDecision = !showExistingIncome && !incomeEnabled;
      return (
        <section className="step-panel">
          {!showIncomeDecision && (
            <div className="step-heading">
              <Wallet size={28} />
              <div>
                <h2 id="setup-step-title">{text.incomeTitle}</h2>
                <p>{text.incomeBody}</p>
              </div>
            </div>
          )}
          {showExistingIncome ? (
            <ExistingDataCard
              title={text.existingIncomeFound}
              value={formatCurrency(amountFrom(existingIncome.amount), rowCurrency(existingIncome, defaultCurrency), lang)}
              hint={text.existingIncomeHint}
              confirmLabel={text.useExisting}
              editLabel={text.editData}
              onConfirm={() => confirmExistingStep(2)}
              onEdit={() => { setEditingExisting(prev => ({ ...prev, 2: true })); setIncomeEnabled(true); }}
            />
          ) : incomeEnabled ? (
            <section className="income-form-card" aria-labelledby="income-form-title">
              <div className="income-form-head">
                <div className="income-form-icon" aria-hidden="true">
                  <CircleDollarSign size={24} />
                </div>
                <div>
                  <h3 id="income-form-title">{text.incomeFormTitle}</h3>
                  <p>{text.incomeFormBody}</p>
                </div>
              </div>
              <div className="form-grid income-form-grid">
                <Field id="income-name" label={text.incomeName} value={income.name} placeholder={text.incomeNamePh} onChange={value => setIncome(prev => ({ ...prev, name: value }))} />
                <Field id="income-amount" label={text.incomeAmount} value={income.amount} type="number" onChange={value => setIncome(prev => ({ ...prev, amount: value }))} />
                <SelectField id="income-type" label={text.incomeType} value={income.incomeType} options={INCOME_TYPES.map(item => ({ value: item, label: labels[item] }))} onChange={value => setIncome(prev => ({ ...prev, incomeType: value }))} />
                <Field id="income-date" label={text.receivedDate} value={income.receivedDate} type="date" onChange={value => setIncome(prev => ({ ...prev, receivedDate: value }))} />
                <div className="form-field full">
                  <CurrencySelect value={income.currency} onChange={value => setIncome(prev => ({ ...prev, currency: value }))} lang={lang} label={text.currencyTitle} ariaLabel={text.currencyTitle} />
                </div>
                <RecurringIncomeToggle
                  checked={income.recurring}
                  label={text.recurringMonthly}
                  description={text.recurringMonthlyHint}
                  onChange={checked => setIncome(prev => ({ ...prev, recurring: checked }))}
                />
              </div>
            </section>
          ) : (
            <IncomeDecisionCard
              title={text.incomeTitle}
              body={text.incomeBody}
              primaryLabel={text.incomeYes}
              secondaryLabel={text.skipCurrently}
              onAdd={() => setIncomeEnabled(true)}
              onSkip={() => {
                setIncomeEnabled(false);
                setStep(nextStepAfter(2));
              }}
            />
          )}
        </section>
      );
    }

    if (step === 3) {
      const existingExpenseTotal = existingExpensesTotal();
      const showExistingExpenses = existingData.expenses.length > 0 && !editingExisting[3];
      const items = [
        ['rent', text.rent],
        ['food', text.food],
        ['transport', text.transport],
        ['subscriptions', text.subscriptions],
        ['loans', text.loans],
        ['other', text.other],
      ];
      return (
        <section className="step-panel">
          <div className="step-heading">
            <Flag size={28} />
            <div>
              <h2 id="setup-step-title">{text.expensesTitle}</h2>
              <p>{text.expensesBody}</p>
            </div>
          </div>
          {showExistingExpenses ? (
            <ExistingDataCard
              title={text.existingExpensesFound}
              value={formatCurrency(existingExpenseTotal, defaultCurrency, lang)}
              hint={text.existingDataHint}
              confirmLabel={text.useExisting}
              editLabel={text.editData}
              onConfirm={() => confirmExistingStep(3)}
              onEdit={() => { setEditingExisting(prev => ({ ...prev, 3: true })); setExpensesEnabled(true); }}
            />
          ) : (
            <ToggleRow active={expensesEnabled} setActive={setExpensesEnabled} yes={text.yes} no={text.skip} />
          )}
          {expensesEnabled && (!showExistingExpenses || editingExisting[3]) && (
            <div className="expense-grid">
              {items.map(([key, label]) => (
                <Field key={key} id={`expense-${key}`} label={label} value={expenses[key]} type="number" onChange={value => setExpenses(prev => ({ ...prev, [key]: value }))} />
              ))}
            </div>
          )}
        </section>
      );
    }

    if (step === 4) {
      const existingGoal = existingData.goals[0];
      const showExistingGoal = existingGoal && !editingExisting[4];
      return (
        <section className="step-panel">
          <div className="step-heading">
            <Target size={28} />
            <div>
              <h2 id="setup-step-title">{text.goalsTitle}</h2>
              <p>{text.realData}</p>
            </div>
          </div>
          {showExistingGoal ? (
            <ExistingDataCard
              title={text.existingGoalsFound}
              value={goalName(existingGoal) || formatCurrency(amountFrom(existingGoal.amount), defaultCurrency, lang)}
              hint={text.existingDataHint}
              confirmLabel={text.useExisting}
              editLabel={text.editData}
              onConfirm={() => confirmExistingStep(4)}
              onEdit={() => { setEditingExisting(prev => ({ ...prev, 4: true })); setGoalEnabled(true); }}
            />
          ) : (
            <ToggleRow active={goalEnabled} setActive={setGoalEnabled} yes={text.yes} no={text.skip} />
          )}
          {goalEnabled && (!showExistingGoal || editingExisting[4]) && (
            <div className="form-grid">
              <Field id="goal-name" label={text.goalName} value={goal.name} placeholder={text.goalNamePh} onChange={value => setGoal(prev => ({ ...prev, name: value }))} />
              <Field id="goal-target" label={text.targetAmount} value={goal.targetAmount} type="number" onChange={value => setGoal(prev => ({ ...prev, targetAmount: value }))} />
              <Field id="goal-current" label={text.currentAmount} value={goal.currentAmount} type="number" onChange={value => setGoal(prev => ({ ...prev, currentAmount: value }))} />
              <Field id="goal-date" label={text.targetDate} value={goal.targetDate} type="date" onChange={value => setGoal(prev => ({ ...prev, targetDate: value }))} />
              <SelectField id="goal-priority" label={text.priority} value={goal.priority} options={PRIORITIES.map(item => ({ value: item, label: text[item] }))} onChange={value => setGoal(prev => ({ ...prev, priority: value }))} />
            </div>
          )}
        </section>
      );
    }

    if (step === 5) {
      return (
        <section className="step-panel">
          <div className="step-heading">
            <PiggyBank size={28} />
            <div>
              <h2 id="setup-step-title">{text.savingsTitle}</h2>
              <p>{text.realData}</p>
            </div>
          </div>
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginTop:'8px'}}>
            {([
              [savingsEnabled, () => setSavingsEnabled(v => !v), text.hasSavings],
              [investmentsEnabled, () => setInvestmentsEnabled(v => !v), text.hasInvestments],
            ] as [boolean, () => void, string][]).map(([on, toggle, label]) => (
              <button key={label} type="button" onClick={toggle} aria-pressed={on}
                style={on ? {
                  minHeight:'48px',borderRadius:'var(--radius-control)',padding:'0 22px',fontSize:'15px',
                  fontWeight:600,cursor:'pointer',fontFamily:'var(--font-ui)',
                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                  background:'var(--primary)',color:'var(--primary-foreground)',
                  border:'1px solid var(--primary)',boxShadow:'var(--shadow-xs)',
                  transition:'all .18s ease',whiteSpace:'nowrap',
                } : {
                  minHeight:'48px',borderRadius:'var(--radius-control)',padding:'0 22px',fontSize:'15px',
                  fontWeight:600,cursor:'pointer',fontFamily:'var(--font-ui)',
                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                  background:'var(--surface)',color:'var(--foreground)',
                  border:'1px solid var(--border)',transition:'all .18s ease',
                  whiteSpace:'nowrap',
                }}>{label}</button>
            ))}
          </div>
          {(savingsEnabled || investmentsEnabled) && (
            <div className="form-grid">
              {savingsEnabled && (
                <>
                  <Field id="savings-type" label={text.savingsType} value={savings.type} placeholder={text.savingsTypePh} onChange={value => setSavings(prev => ({ ...prev, type: value }))} />
                  <Field id="savings-amount" label={text.incomeAmount} value={savings.amount} type="number" onChange={value => setSavings(prev => ({ ...prev, amount: value }))} />
                  <div className="form-field full">
                    <CurrencySelect value={savings.currency} onChange={value => setSavings(prev => ({ ...prev, currency: value }))} lang={lang} label={text.currencyTitle} ariaLabel={text.currencyTitle} />
                  </div>
                </>
              )}
              {investmentsEnabled && (
                <>
                  <Field id="investment-type" label={text.investmentType} value={investment.type} placeholder={text.investmentTypePh} onChange={value => setInvestment(prev => ({ ...prev, type: value }))} />
                  <Field id="investment-amount" label={text.incomeAmount} value={investment.amount} type="number" onChange={value => setInvestment(prev => ({ ...prev, amount: value }))} />
                  <div className="form-field full">
                    <CurrencySelect value={investment.currency} onChange={value => setInvestment(prev => ({ ...prev, currency: value }))} lang={lang} label={text.currencyTitle} ariaLabel={text.currencyTitle} />
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      );
    }

    if (step === 6) {
      return (
        <section className="step-panel">
          <div className="step-heading">
            <HandHeart size={28} />
            <div>
              <h2 id="setup-step-title">{text.zakatTitle}</h2>
              <p>{text.zakatBody}</p>
            </div>
          </div>
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginTop:'8px'}}>
            {([
              [focus.zakat, () => setFocus(prev => ({ ...prev, zakat: !prev.zakat })), text.followZakat],
              [focus.charity, () => setFocus(prev => ({ ...prev, charity: !prev.charity })), text.followCharity],
              [!focus.zakat && !focus.charity, () => setFocus({ zakat: false, charity: false }), text.notNow],
            ] as [boolean, () => void, string][]).map(([on, toggle, label]) => (
              <button key={label} type="button" onClick={toggle} aria-pressed={on}
                style={on ? {
                  minHeight:'48px',borderRadius:'var(--radius-control)',padding:'0 22px',fontSize:'15px',
                  fontWeight:600,cursor:'pointer',fontFamily:'var(--font-ui)',
                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                  background:'var(--primary)',color:'var(--primary-foreground)',
                  border:'1px solid var(--primary)',boxShadow:'var(--shadow-xs)',
                  transition:'all .18s ease',whiteSpace:'nowrap',
                } : {
                  minHeight:'48px',borderRadius:'var(--radius-control)',padding:'0 22px',fontSize:'15px',
                  fontWeight:600,cursor:'pointer',fontFamily:'var(--font-ui)',
                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                  background:'var(--surface)',color:'var(--foreground)',
                  border:'1px solid var(--border)',transition:'all .18s ease',
                  whiteSpace:'nowrap',
                }}>{label}</button>
            ))}
          </div>
        </section>
      );
    }

    if (step === 7) {
      return (
        <section className="step-panel">
          <div className="step-heading">
            <BriefcaseBusiness size={28} />
            <div>
              <h2 id="setup-step-title">{text.projectsTitle}</h2>
              <p>{text.realData}</p>
            </div>
          </div>
          <ToggleRow active={projectEnabled} setActive={setProjectEnabled} yes={text.yes} no={text.skip} />
          {projectEnabled && (
            <div className="form-grid">
              <Field id="project-name" label={text.projectName} value={project.name} onChange={value => setProject(prev => ({ ...prev, name: value }))} />
              <SelectField id="project-type" label={text.projectType} value={project.type} options={PROJECT_TYPES.map(item => ({ value: item, label: labels[item] }))} onChange={value => setProject(prev => ({ ...prev, type: value }))} />
              <Field id="project-capital" label={text.capital} value={project.capital} type="number" onChange={value => setProject(prev => ({ ...prev, capital: value }))} />
              <SelectField id="project-status" label={text.projectStatus} value={project.status} options={PROJECT_STATUSES.map(item => ({ value: item, label: labels[item] }))} onChange={value => setProject(prev => ({ ...prev, status: value }))} />
            </div>
          )}
        </section>
      );
    }

    const activeSummary = summary ?? buildSetupSummary();
    const recommendations = recommendationItems(activeSummary);
    const savedDataPoints = activeSummary.income + activeSummary.expenses + activeSummary.goals + activeSummary.savings + activeSummary.investments + activeSummary.projects;
    const primaryRecommendation = recommendations[0] ?? {
      title: text.recBalanced,
      meta: text.recBalancedMeta.replace('{count}', formatSetupNumber(savedDataPoints, lang)),
    };
    const goalEstimateValue = activeSummary.firstGoalCompletionDate ? formatSetupDate(activeSummary.firstGoalCompletionDate, lang) : text.noGoalEstimateTitle;
    const surplusValue = formatSetupMoney(activeSummary.expectedRemaining, defaultCurrency, lang);
    const savingPercentValue = formatSetupPercent(activeSummary.recommendedSavingPercent, lang);

    return (
      <section className="step-panel completion-panel completion-dashboard completion-compact">
          <div style={{display:'grid',gridTemplateColumns:'auto minmax(0,1fr)',gap:'16px',alignItems:'center',border:'1px solid color-mix(in srgb, var(--success) 28%, var(--border))',background:'var(--success-soft)',borderRadius:'var(--radius-panel)',padding:'20px 22px',boxShadow:'var(--shadow-sm)',minWidth:0}}>
            <div style={{width:'58px',height:'58px',borderRadius:'var(--radius-pill)',display:'grid',placeItems:'center',background:'var(--surface)',color:'var(--success)',border:'1px solid color-mix(in srgb, var(--success) 30%, var(--border))',boxShadow:'var(--shadow-xs)'}} aria-hidden="true">
            <CheckCircle2 size={28} />
          </div>
          <div style={{minWidth:0}}>
              <span style={{display:'inline-flex',borderRadius:'var(--radius-pill)',background:'var(--surface)',color:'var(--success)',padding:'4px 10px',fontSize:'12px',fontWeight:600,marginBottom:'8px'}}>{text.initialPlanBuilt}</span>
            <h2 id="setup-step-title" style={{margin:'0 0 6px',color:'var(--foreground)',fontSize:'clamp(22px,3vw,30px)',lineHeight:1.2,fontWeight:700}}>{text.completionTitle}</h2>
            <p style={{margin:0,color:'var(--foreground-secondary)',fontSize:'13px',lineHeight:1.75,fontWeight:400}}>{text.completionDescription}</p>
          </div>
        </div>

        <section style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"12px",minWidth:0}} aria-label={text.planSnapshotTitle}>
          <SummaryCard icon={CircleDollarSign} label={text.summaryCurrency} value={defaultCurrency} description={text.currencyCardDesc} tone="currency" />
          <SummaryCard
            icon={Banknote}
            label={text.expectedMonthlyIncome}
            value={formatSetupMoney(activeSummary.incomeTotal, defaultCurrency, lang)}
            description={activeSummary.income > 0 ? text.incomeCardDesc : text.noIncomeCardDesc}
            tone="income"
          />
          <SummaryCard
            icon={ReceiptText}
            label={text.reportExpenses}
            value={formatSetupMoney(activeSummary.expenseTotal, defaultCurrency, lang)}
            description={activeSummary.expenses > 0 ? text.expensesCardDesc : text.reportNoData}
            tone="count"
          />
          <SummaryCard
            icon={PiggyBank}
            label={text.reportSavings}
            value={formatSetupMoney(activeSummary.savingsTotal, defaultCurrency, lang)}
            description={text.savingsCardDesc}
            tone="saving"
          />
          <SummaryCard
            icon={LineChart}
            label={text.reportInvestments}
            value={formatSetupMoney(activeSummary.investmentTotal, defaultCurrency, lang)}
            description={text.investmentsCardDesc}
            tone="count"
          />
          <SummaryCard
            icon={Target}
            label={text.reportGoals}
            value={formatSetupNumber(activeSummary.goals, lang)}
            description={text.goalsCardDesc}
            tone="count"
          />
        </section>

        <section style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"18px",alignItems:"center",border:"1px solid var(--border)",background:"var(--surface)",borderRadius:'var(--radius-panel)',padding:"20px 22px",boxShadow:"var(--shadow-xs)",minWidth:0}} aria-labelledby="setup-snapshot-title">
          <div style={{display:"grid",gap:"5px",minWidth:0}}>
            <span>{text.financialPulse}</span>
            <h3 id="setup-snapshot-title">{text.planSnapshotTitle}</h3>
            <p>{text.planSnapshotSubtitle}</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"10px"}}>
            <article className="snapshot-metric primary">
              <small>{text.expectedSurplus}</small>
              <strong>{surplusValue}</strong>
            </article>
            <article className="snapshot-metric">
              <small>{text.recommendedSavingPercent}</small>
              <strong>{savingPercentValue}</strong>
            </article>
            <article className="snapshot-metric">
              <small>{text.dataPoints}</small>
              <strong>{formatSetupNumber(savedDataPoints, lang)}</strong>
            </article>
          </div>
        </section>

        <section style={{display:"grid",gap:"12px",border:"1px solid color-mix(in srgb, var(--accent) 28%, var(--border))",background:"var(--accent-soft)",borderRadius:'var(--radius-card)',padding:"18px 20px"}} aria-labelledby="setup-recommendation-title">
          <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"12px",alignItems:"start"}}>
            <Sparkles size={22} aria-hidden="true" />
            <div>
              <h3 id="setup-recommendation-title">{text.recommendationTitle}</h3>
              <p>{text.recommendationBasedOn}</p>
            </div>
          </div>
              <article style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"10px",alignItems:"start",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:'var(--radius-control)',padding:"12px 14px"}}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <div>
              <strong>{primaryRecommendation.title}</strong>
              <span>{primaryRecommendation.meta}</span>
            </div>
          </article>
          {activeSummary.expectedRemaining > 0 && (
            <div className="recommendation-surplus">
              <small>{text.expectedSurplus}</small>
              <strong>{surplusValue}</strong>
            </div>
          )}
        </section>

        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',justifyContent:'flex-end',borderTop:'1px solid var(--border)',paddingTop:'14px',marginTop:'4px'}}>
          <button type="button" style={{minHeight:'52px',borderRadius:'var(--radius-card)',padding:'0 22px',border:0,background:'var(--primary)',color:'var(--primary-foreground)',fontFamily:'var(--font-ui)',fontWeight:600,fontSize:'15px',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'8px',boxShadow:'var(--shadow-sm)',minWidth:'min(260px,100%)',whiteSpace:'nowrap'}} onClick={completeAndGoDashboard} disabled={saving}>
            {saving ? text.saving : text.goDashboard}
          </button>
          <button type="button" style={{minHeight:'52px',borderRadius:'var(--radius-card)',padding:'0 18px',border:'1px solid var(--border-strong)',background:'var(--surface)',color:'var(--foreground)',fontFamily:'var(--font-ui)',fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'8px',whiteSpace:'nowrap'}} onClick={openMoreData}>{text.addMoreData}</button>
          <button type="button" style={{minHeight:'52px',borderRadius:'var(--radius-card)',padding:'0 18px',border:'1px solid var(--border)',background:'var(--surface-muted)',color:'var(--foreground)',fontFamily:'var(--font-ui)',fontWeight:600,cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'8px',whiteSpace:'nowrap'}} onClick={() => setShowInitialReport(true)}>{text.viewInitialReport}</button>
        </div>

        {showInitialReport && (
          <div className="report-modal-backdrop" role="presentation">
            <section className="initial-report-modal" role="dialog" aria-modal="true" aria-labelledby="initial-report-title">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"12px",marginBottom:"16px"}}>
                <div>
                  <span>{text.viewInitialReport}</span>
                  <h3 id="initial-report-title">{text.reportTitle}</h3>
                  <p>{text.reportSubtitle}</p>
                </div>
                <button type="button" aria-label={text.closeReport} onClick={() => setShowInitialReport(false)}>
                  <X size={18} />
                </button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"10px"}}>
                <ReportCard icon={Banknote} title={text.reportIncome} value={formatSetupMoney(activeSummary.incomeTotal, defaultCurrency, lang)} detail={activeSummary.income > 0 ? `${formatSetupNumber(activeSummary.income, lang)} ${text.addedIncome}` : text.reportNoData} />
                <ReportCard icon={ReceiptText} title={text.reportExpenses} value={formatSetupMoney(activeSummary.expenseTotal, defaultCurrency, lang)} detail={activeSummary.expenses > 0 ? `${formatSetupNumber(activeSummary.expenses, lang)} ${text.addedExpenses}` : text.reportNoData} />
                <ReportCard icon={PiggyBank} title={text.reportSavings} value={formatSetupMoney(activeSummary.savingsTotal, defaultCurrency, lang)} detail={activeSummary.savings > 0 ? `${formatSetupNumber(activeSummary.savings, lang)} ${text.addedSavings}` : text.reportNoData} />
                <ReportCard icon={LineChart} title={text.reportInvestments} value={formatSetupMoney(activeSummary.investmentTotal, defaultCurrency, lang)} detail={activeSummary.investments > 0 ? `${formatSetupNumber(activeSummary.investments, lang)} ${text.addedInvestments}` : text.reportNoData} />
                <ReportCard icon={Target} title={text.reportGoals} value={formatSetupMoney(activeSummary.goalRemainingTotal, defaultCurrency, lang)} detail={activeSummary.goals > 0 ? goalEstimateValue : text.noGoalEstimateHint} />
              </div>
              <section className="report-recommendation">
                <h4>{text.reportRecommendation}</h4>
                {recommendations.map(item => <p key={item.title}>{item.title}</p>)}
              </section>
              <div className="report-actions">
                <button type="button" onClick={() => setShowInitialReport(false)}>{text.closeReport}</button>
                <button type="button" className="primary" onClick={() => router.push('/reports')}>{text.reportGo}</button>
              </div>
              <small className="report-data-points">{text.dataPoints}: {formatSetupNumber(savedDataPoints, lang)}</small>
            </section>
          </div>
        )}
      </section>
    );
  }
}
