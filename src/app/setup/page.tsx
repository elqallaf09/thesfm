'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  Flag,
  HandHeart,
  Loader2,
  PiggyBank,
  ShieldCheck,
  Target,
  Wallet,
} from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { useCurrency } from '@/lib/useCurrency';

type Lang = 'ar' | 'en' | 'fr';
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type SetupSummary = {
  income: number;
  expenses: number;
  goals: number;
  savings: number;
  investments: number;
  projects: number;
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
    start: 'ابدأ الآن',
    skipNow: 'تخطي الإعداد',
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
    realDataLong: 'لن يتم إنشاء أي دخل أو مصروف أو هدف تلقائياً. سيتم حفظ البيانات التي تدخلها أنت فقط.',
    optional: 'اختياري',
    required: 'مطلوب',
    yes: 'نعم، إضافة بيانات',
    skip: 'تخطي',
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
    expectedRemaining: 'باقي من راتبك المتوقع',
    recommendedSavingPercent: 'أفضل نسبة ادخار لك',
    monthlySavingSuggestion: 'اقتراح الادخار الشهري',
    firstGoalCompletion: 'موعد إنجاز الهدف الأول المتوقع',
    notEnoughForEstimate: 'بيانات غير كافية للتقدير',
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
    incomeBody: 'أضف دخلاً فعلياً فقط. إذا لم تكن جاهزاً، اترك هذه الخطوة فارغة.',
    incomeName: 'اسم الدخل',
    incomeNamePh: 'مثال: الراتب الشهري',
    incomeAmount: 'المبلغ',
    incomeType: 'نوع الدخل',
    receivedDate: 'تاريخ الاستلام',
    recurringMonthly: 'دخل متكرر شهرياً',
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
    start: 'Start now',
    skipNow: 'Skip setup',
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
    realDataLong: 'No income, expense, or goal will be created automatically. Only the data you enter will be saved.',
    optional: 'Optional',
    required: 'Required',
    yes: 'Yes, add data',
    skip: 'Skip',
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
    expectedRemaining: 'Expected remaining salary',
    recommendedSavingPercent: 'Recommended saving percentage',
    monthlySavingSuggestion: 'Monthly saving suggestion',
    firstGoalCompletion: 'Estimated first goal completion',
    notEnoughForEstimate: 'Not enough data to estimate',
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
    incomeBody: 'Add actual income only. If you are not ready, leave this step empty.',
    incomeName: 'Income name',
    incomeNamePh: 'Example: Monthly salary',
    incomeAmount: 'Amount',
    incomeType: 'Income type',
    receivedDate: 'Received date',
    recurringMonthly: 'Recurring monthly income',
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
    start: 'Commencer maintenant',
    skipNow: 'Ignorer la configuration',
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
    realDataLong: 'Aucun revenu, dépense ou objectif ne sera créé automatiquement. Seules les données saisies seront enregistrées.',
    optional: 'Facultatif',
    required: 'Requis',
    yes: 'Oui, ajouter des données',
    skip: 'Ignorer',
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
    expectedRemaining: 'Salaire restant estimé',
    recommendedSavingPercent: 'Pourcentage d’épargne recommandé',
    monthlySavingSuggestion: 'Suggestion d’épargne mensuelle',
    firstGoalCompletion: 'Date estimée du premier objectif',
    notEnoughForEstimate: 'Données insuffisantes pour estimer',
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
    incomeBody: 'Ajoutez uniquement un revenu réel. Si vous n’êtes pas prêt, laissez cette étape vide.',
    incomeName: 'Nom du revenu',
    incomeNamePh: 'Exemple : salaire mensuel',
    incomeAmount: 'Montant',
    incomeType: 'Type de revenu',
    receivedDate: 'Date de réception',
    recurringMonthly: 'Revenu mensuel récurrent',
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
    if (!authLoading && !user && !isGuest) router.replace('/login?next=/setup');
  }, [authLoading, isGuest, router, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadExistingSetupData() {
      setExistingLoading(true);
      const [profileRes, incomeRes, expensesRes, goalsRes, savingsRes, investmentsRes, projectsRes] = await Promise.all([
        db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        db.from('monthly_income_sources').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        db.from('expense_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        db.from('financial_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        db.from('savings_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        db.from('investment_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        db.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
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
        const incomeTotal = nextExisting.income.reduce((total, row) => total + amountFrom(row.amount), 0);
        const expenseTotal = nextExisting.expenses.reduce((total, row) => total + amountFrom(row.amount), 0);
        const expectedRemaining = Math.max(0, incomeTotal - expenseTotal);
        const recommendedSavingPercent = incomeTotal > 0 && expectedRemaining > 0 ? Math.min(20, Math.max(10, Math.round((expectedRemaining / incomeTotal) * 50))) : 0;
        const monthlySavingSuggestion = incomeTotal > 0 ? Math.min(expectedRemaining, Math.round(incomeTotal * (recommendedSavingPercent / 100))) : 0;
        setSummary({
          income: nextExisting.income.length,
          expenses: nextExisting.expenses.length,
          goals: nextExisting.goals.length,
          savings: nextExisting.savings.length,
          investments: nextExisting.investments.length,
          projects: nextExisting.projects.length,
          expectedRemaining,
          recommendedSavingPercent,
          monthlySavingSuggestion,
          firstGoalCompletionDate: '',
        });
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
    const incomeAmount = incomeEnabled && (editingExisting[2] || existingData.income.length === 0) ? toAmount(income.amount) : existingIncomeTotal();
    const essentialExpenseTotal = expensesEnabled && (editingExisting[3] || existingData.expenses.length === 0)
      ? Object.values(expenses).reduce((total, value) => total + Math.max(0, toAmount(value) || 0), 0)
      : existingExpensesTotal();
    const expectedRemaining = Math.max(0, incomeAmount - essentialExpenseTotal);
    const recommendedSavingPercent = incomeAmount > 0 && expectedRemaining > 0 ? Math.min(20, Math.max(10, Math.round((expectedRemaining / incomeAmount) * 50))) : 0;
    const monthlySavingSuggestion = incomeAmount > 0 ? Math.min(expectedRemaining, Math.round(incomeAmount * (recommendedSavingPercent / 100))) : 0;
    const existingGoal = existingData.goals[0];
    const existingGoalAmount = amountFrom(existingGoal?.amount ?? existingGoal?.target_amount);
    const existingGoalCurrent = amountFrom(existingGoal?.current_amount);
    const goalRemaining = goalEnabled && (editingExisting[4] || existingData.goals.length === 0)
      ? Math.max(0, toAmount(goal.targetAmount) - toAmount(goal.currentAmount))
      : Math.max(0, existingGoalAmount - existingGoalCurrent);
    const firstGoalCompletionDate = goalRemaining > 0 && monthlySavingSuggestion > 0 ? dateAfterMonths(goalRemaining / monthlySavingSuggestion) : '';
    return {
      income: existingData.income.length,
      expenses: existingData.expenses.length,
      goals: existingData.goals.length,
      savings: existingData.savings.length,
      investments: existingData.investments.length,
      projects: existingData.projects.length,
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
      const { error: profileError } = await db.from('profiles').upsert({
        id: user.id,
        username,
        email: user.email ?? null,
        default_currency: defaultCurrency,
        preferred_currency: defaultCurrency,
        updated_at: new Date().toISOString(),
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
      const focusValues = [focus.zakat ? 'zakat' : '', focus.charity ? 'charity' : ''].filter(Boolean).join(',');
      const { error: profileError } = await db.from('profiles').upsert({
        id: user.id,
        username,
        email: user.email ?? null,
        default_currency: defaultCurrency,
        preferred_currency: defaultCurrency,
        financial_focus: focusValues || existingData.profile?.financial_focus || null,
        monthly_income_target: buildSetupSummary().expectedRemaining + existingExpensesTotal(),
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
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
    const incomeAmount = counts.income > 0 && !editingExisting[2] ? existingIncomeTotal() : (incomeEnabled ? toAmount(income.amount) : 0);
    const essentialExpenseTotal = counts.expenses > 0 && !editingExisting[3] ? existingExpensesTotal() : (expensesEnabled
      ? Object.values(expenses).reduce((total, value) => total + Math.max(0, toAmount(value) || 0), 0)
      : 0);
    const focusValues = [focus.zakat ? 'zakat' : '', focus.charity ? 'charity' : ''].filter(Boolean).join(',');

    try {
      const username = String(user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`);
      const { error: profileError } = await db.from('profiles').upsert({
        id: user.id,
        username,
        email: user.email ?? null,
        default_currency: defaultCurrency,
        preferred_currency: defaultCurrency,
        financial_focus: focusValues || null,
        monthly_income_target: incomeAmount,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
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
        counts.income = 1;
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
          counts.expenses = rows.length;
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
        counts.goals = 1;
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
        counts.savings = 1;
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
        counts.investments = 1;
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
        counts.projects = 1;
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
        <style jsx>{`.setup-loading{min-height:100vh;display:grid;place-items:center;align-content:center;gap:12px;background:var(--sfm-background);color:var(--sfm-primary);font-family:Tajawal,Arial,sans-serif}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="setup-auth" dir={dir}>
        <section>
          <h1>{text.signInTitle}</h1>
          <button type="button" onClick={() => router.push('/login?next=/setup')}>{text.signInAction}</button>
        </section>
        <style jsx>{`.setup-auth{min-height:100vh;display:grid;place-items:center;background:var(--sfm-background);font-family:Tajawal,Arial,sans-serif}.setup-auth section{width:min(480px,calc(100% - 32px));background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);border-radius:22px;padding:24px;text-align:center}.setup-auth button{margin-top:16px;min-height:44px;border:0;border-radius:13px;background:var(--sfm-primary);color:var(--sfm-card);padding:0 18px;font-weight:900;cursor:pointer}`}</style>
      </main>
    );
  }

  return (
    <div className="setup-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell contentClassName="setup-content">
        <header className="setup-top">
          <div>
            <span>{text.eyebrow}</span>
            <h1>{text.pageName}</h1>
          </div>
          <LanguageSwitcher variant="gold" compact />
        </header>

        <section className="setup-hero">
          <div>
            <span className="hero-badge">{text.realData}</span>
            <h2>{text.title}</h2>
            <p>{text.subtitle}</p>
          </div>
          <div className="progress-orb" aria-label={`${progress}%`}>
            <strong>{progress}%</strong>
            <small>{text.steps[step]}</small>
          </div>
        </section>

        <section className="setup-card" aria-labelledby="setup-step-title">
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
          <div className="step-layout">
            <aside className="step-side">
              <div className="step-side-head">
                <span>{step + 1}</span>
                <div>
                  <small>{text.currentStep}</small>
                  <strong>{text.steps[step]}</strong>
                </div>
              </div>
              <div className="step-progress" aria-label={`${progress}%`}><i style={{ width: `${progress}%` }} /></div>
              <div className="setup-plan">
                <h3>{text.setupPlanTitle}</h3>
                <p>{text.setupPlanSubtitle}</p>
                <ul>
                  {text.steps.slice(1, 8).map((item, index) => {
                    const stepIndex = index + 1;
                    const status = stepStatuses[stepIndex as Step];
                    const state = status === 'completed' ? 'done' : step === stepIndex ? 'active' : 'upcoming';
                    const stateLabel = state === 'done' ? text.completedStep : state === 'active' ? text.currentStep : text.upcomingStep;
                    return (
                      <li key={item} className={state}>
                        <CheckCircle2 size={15} aria-hidden="true" />
                        <span>{item}</span>
                        <em>{stateLabel}</em>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </aside>
            <main className="step-main">
              <div className="setup-info-alert">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>{text.realDataLong}</span>
              </div>
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
            </main>
          </div>
        </section>
      </DashboardPageShell>
      <style jsx>{`
        .setup-page{min-height:100vh;background:radial-gradient(circle at 14% 8%,rgba(29,140,255,.10),transparent 32%),linear-gradient(160deg,var(--sfm-background) 0%,#F8FBFF 58%,#E7F1FF 100%);color:var(--sfm-primary-dark);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
        :global(.setup-page .sfm-dashboard-page-content){max-inline-size:1120px!important;margin-inline:auto!important}
        .setup-content{display:grid;gap:22px;min-width:0}
        .setup-top{display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:0}
        .setup-top span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}
        .setup-top h1{margin:3px 0 0;font-size:clamp(24px,4vw,36px);font-weight:950;color:var(--sfm-primary-dark)}
        .setup-hero{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;background:radial-gradient(circle at 12% 10%,rgba(167,243,240,.26),transparent 34%),linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 145%);border:1px solid rgba(167,243,240,.18);border-radius:30px;padding:clamp(28px,5vw,52px);color:var(--sfm-card);box-shadow:0 24px 70px rgba(3,18,37,.2);overflow:hidden}
        .setup-hero:after{content:'';position:absolute;inset:auto -80px -120px auto;width:320px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(24,212,212,.22),transparent 65%);pointer-events:none}
        .hero-badge{display:inline-flex;border:1px solid rgba(167,243,240,.25);background:rgba(167,243,240,.1);color:var(--sfm-soft-cyan);border-radius:999px;padding:8px 13px;font-size:12px;font-weight:950}
        .setup-hero h2{margin:18px 0 10px;font-size:clamp(30px,5vw,56px);line-height:1.04;font-weight:950;letter-spacing:0}
        .setup-hero p{margin:0;max-width:760px;color:rgba(234,246,255,.78);font-size:clamp(15px,2vw,18px);font-weight:800;line-height:1.8}
        .progress-orb{position:relative;z-index:1;width:150px;height:150px;border-radius:50%;display:grid;place-items:center;text-align:center;align-content:center;background:rgba(234,246,255,.09);border:1px solid rgba(167,243,240,.25);box-shadow:inset 0 0 0 11px rgba(167,243,240,.08),0 20px 46px rgba(3,18,37,.24)}
        .progress-orb strong{font-size:34px;color:var(--sfm-soft-cyan)}.progress-orb small{max-width:108px;color:rgba(234,246,255,.78);font-weight:900;line-height:1.35}
        .setup-card{background:rgba(255,255,255,.94);border:1px solid rgba(29,140,255,.16);border-radius:28px;padding:22px;box-shadow:0 20px 56px rgba(3,18,37,.10);min-width:0}
        .step-layout{display:grid;grid-template-columns:minmax(300px,.36fr) minmax(0,1fr);gap:20px;align-items:stretch}
        .step-side{position:sticky;top:18px;align-self:start;background:linear-gradient(180deg,var(--sfm-light-card),#FFFFFF);border:1px solid rgba(29,140,255,.14);border-radius:22px;padding:18px;display:grid;gap:14px;box-shadow:0 12px 32px rgba(3,18,37,.06)}
        .step-side-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center}
        .step-side-head>span{width:48px;height:48px;border-radius:16px;background:var(--sfm-midnight);color:var(--sfm-soft-cyan);display:grid;place-items:center;font-weight:950;font-size:18px}
        .step-side small{display:block;color:var(--sfm-primary-hover);font-size:11px;font-weight:950;margin-bottom:4px}.step-side strong{display:block;font-size:19px;color:var(--sfm-primary-dark);line-height:1.35}.step-progress{height:11px;border-radius:999px;background:rgba(29,140,255,.10);overflow:hidden}.step-progress i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--sfm-soft-cyan),var(--sfm-primary));transition:width .28s ease}
        .setup-plan{display:grid;gap:9px;border-top:1px solid rgba(29,140,255,.10);padding-top:13px}.setup-plan h3{margin:0;color:var(--sfm-midnight);font-size:17px}.setup-plan p{margin:0;color:var(--sfm-muted-readable);font-size:12px;font-weight:850;line-height:1.65}.setup-plan ul{display:grid;gap:8px;margin:0;padding:0;list-style:none}.setup-plan li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid rgba(29,140,255,.10);background:#FFFFFF;border-radius:14px;padding:9px;min-width:0}.setup-plan li svg{color:#94A3B8}.setup-plan li span{color:var(--sfm-midnight);font-weight:900;font-size:12px;line-height:1.35;overflow-wrap:anywhere}.setup-plan li em{font-style:normal;border-radius:999px;background:rgba(29,140,255,.08);color:var(--sfm-muted-readable);padding:4px 7px;font-size:10px;font-weight:950;white-space:nowrap}.setup-plan li.done svg{color:#10B981}.setup-plan li.done em{background:#ECFDF5;color:#047857}.setup-plan li.active{border-color:rgba(24,212,212,.30);background:rgba(24,212,212,.07)}.setup-plan li.active svg{color:var(--sfm-primary)}.setup-plan li.active em{background:var(--sfm-midnight);color:var(--sfm-soft-cyan)}
        .step-main{min-width:0;display:grid;gap:18px;align-content:start;background:#FFFFFF;border:1px solid rgba(29,140,255,.14);border-radius:24px;padding:clamp(18px,3vw,28px);box-shadow:0 14px 34px rgba(3,18,37,.06);min-height:420px}
        .setup-info-alert{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start;border:1px solid rgba(24,212,212,.20);background:rgba(24,212,212,.07);color:var(--sfm-midnight);border-radius:16px;padding:12px 14px;font-weight:900;line-height:1.65}.setup-info-alert svg{color:var(--sfm-primary);margin-top:2px}
        .step-panel{display:grid;gap:16px;min-width:0}
        .step-heading{display:flex;align-items:flex-start;gap:13px}.step-heading svg{color:var(--sfm-primary);flex:0 0 auto}.step-heading h2{margin:0;color:var(--sfm-primary-dark);font-size:clamp(24px,3vw,32px);line-height:1.22}.step-heading p{margin:7px 0 0;color:var(--sfm-muted-readable);line-height:1.8;font-weight:820;font-size:15px}
        .choice-row{display:flex;gap:10px;flex-wrap:wrap}.choice-btn,.toggle-card{min-height:48px;border:1px solid rgba(29,140,255,.18);border-radius:15px;background:var(--sfm-light-card);color:var(--sfm-midnight);padding:0 16px;font:950 14px Tajawal,Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,border-color .18s ease}.choice-btn:hover,.toggle-card:hover{transform:translateY(-1px);border-color:rgba(24,212,212,.34);box-shadow:0 10px 26px rgba(3,18,37,.08)}.choice-btn:focus-visible,.toggle-card:focus-visible,.focus-card:focus-visible{outline:3px solid rgba(24,212,212,.32);outline-offset:3px}.choice-btn.active,.toggle-card.active{background:var(--sfm-primary-dark);color:var(--sfm-soft-cyan);border-color:rgba(167,243,240,.28)}
        .welcome-actions{margin-top:4px}.existing-data-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:13px;align-items:start;border:1px solid rgba(16,185,129,.22);background:linear-gradient(180deg,#F0FDF4,#FFFFFF);border-radius:18px;padding:16px;box-shadow:0 12px 30px rgba(3,18,37,.06)}.existing-data-card>svg{color:#059669;margin-top:3px}.existing-data-card h3{margin:0;color:var(--sfm-primary-dark);font-size:16px;font-weight:950}.existing-data-card strong{display:block;margin-top:6px;color:#047857;font-size:24px;font-weight:950;overflow-wrap:anywhere}.existing-data-card p{margin:6px 0 0;color:var(--sfm-muted-readable);font-weight:850;line-height:1.65}.existing-actions{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap}.existing-actions .primary-btn,.existing-actions .ghost-btn{min-height:44px}
        .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .form-field{display:grid;gap:7px;min-width:0}.form-field.full{grid-column:1/-1}.form-field span{font-weight:950;color:var(--sfm-muted);font-size:13px}.form-field input,.form-field select{width:100%;min-height:46px;border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-primary-dark);border-radius:13px;padding:0 12px;font:900 14px Tajawal,Arial,sans-serif;outline:none}.form-field input:focus,.form-field select:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.15);background:var(--sfm-card)}
        .checkbox-line{display:flex;align-items:center;gap:9px;background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.12);border-radius:13px;padding:12px;font-weight:900;color:var(--sfm-muted)}.checkbox-line input{width:18px;height:18px;accent-color:var(--sfm-primary)}
        .expense-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.summary-card{background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.14);border-radius:16px;padding:13px;min-width:0}.summary-card small{display:block;color:var(--sfm-muted);font-weight:900}.summary-card strong{display:block;margin-top:5px;color:var(--sfm-primary-dark);font-size:22px}
        .focus-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.focus-card{border:1px solid rgba(29,140,255,.16);border-radius:16px;background:var(--sfm-light-card);padding:14px;text-align:start;display:grid;gap:8px;color:var(--sfm-midnight);font-weight:950;cursor:pointer}.focus-card.active{background:var(--sfm-primary-dark);color:var(--sfm-soft-cyan);border-color:rgba(167,243,240,.28)}
        .setup-error{border:1px solid rgba(185,28,28,.16);background:#FEF2F2;color:#B91C1C;border-radius:14px;padding:12px;font-weight:950}
        .wizard-actions{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid rgba(29,140,255,.12);padding-top:18px;margin-top:auto}.primary-btn,.ghost-btn{min-height:52px;border-radius:16px;padding:0 20px;font:950 14px Tajawal,Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease,border-color .18s ease,background .18s ease}.primary-btn{border:0;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 14px 34px rgba(29,140,255,.22)}.primary-btn:not(:disabled):hover{transform:translateY(-2px);filter:saturate(1.06) brightness(1.04);box-shadow:0 18px 42px rgba(24,212,212,.28)}.primary-btn:not(:disabled):active{transform:translateY(0) scale(.985)}.primary-btn:focus-visible,.ghost-btn:focus-visible,.finish-actions button:focus-visible{outline:3px solid rgba(24,212,212,.32);outline-offset:3px}.ghost-btn{border:1px solid rgba(29,140,255,.20);background:var(--sfm-light-card);color:var(--sfm-midnight)}.ghost-btn:not(:disabled):hover{transform:translateY(-1px);border-color:rgba(24,212,212,.34);background:var(--sfm-surface-hover);box-shadow:0 10px 26px rgba(3,18,37,.08)}.primary-btn:disabled,.ghost-btn:disabled{opacity:.65;cursor:not-allowed;transform:none;box-shadow:none}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .finish-actions{display:flex;gap:10px;flex-wrap:wrap}.finish-actions button{min-height:46px;border:1px solid rgba(29,140,255,.18);border-radius:14px;background:var(--sfm-light-card);color:var(--sfm-midnight);padding:0 15px;font-weight:950;font-family:inherit;cursor:pointer}.finish-actions button.primary{border:0;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}
        @media(max-width:1024px){.setup-page .sfm-dashboard-page-shell{margin-inline-start:0}.setup-hero,.step-layout{grid-template-columns:1fr}.progress-orb{width:124px;height:124px}.step-side{position:static}.setup-plan ul{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:720px){:global(.setup-page .sfm-dashboard-page-shell){padding-inline:16px!important}.setup-hero{border-radius:22px}.setup-card{padding:14px;border-radius:22px}.progress-orb{width:112px;height:112px}.form-grid,.expense-grid,.summary-grid,.focus-grid,.setup-plan ul{grid-template-columns:1fr}.wizard-actions,.choice-row,.finish-actions{display:grid;grid-template-columns:1fr}.primary-btn,.ghost-btn,.choice-btn,.toggle-card,.finish-actions button{width:100%}.setup-top{align-items:flex-start}.step-main{padding:16px;min-height:auto}.step-heading h2{font-size:22px}}
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
          <div className="choice-row welcome-actions">
            <button type="button" className="primary-btn" onClick={() => {
              setSummary(buildSetupSummary());
              setStep(nextIncompleteStep);
            }}>
              <ArrowRight size={16} />
              {text.start}
            </button>
            <button type="button" className="ghost-btn" onClick={skipSetup} disabled={saving}>
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
      return (
        <section className="step-panel">
          <div className="step-heading">
            <Wallet size={28} />
            <div>
              <h2 id="setup-step-title">{text.incomeTitle}</h2>
              <p>{text.incomeBody}</p>
            </div>
          </div>
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
          ) : (
            <ToggleRow active={incomeEnabled} setActive={setIncomeEnabled} yes={text.yes} no={text.skip} />
          )}
          {incomeEnabled && (!showExistingIncome || editingExisting[2]) && (
            <div className="form-grid">
              <Field id="income-name" label={text.incomeName} value={income.name} placeholder={text.incomeNamePh} onChange={value => setIncome(prev => ({ ...prev, name: value }))} />
              <Field id="income-amount" label={text.incomeAmount} value={income.amount} type="number" onChange={value => setIncome(prev => ({ ...prev, amount: value }))} />
              <SelectField id="income-type" label={text.incomeType} value={income.incomeType} options={INCOME_TYPES.map(item => ({ value: item, label: labels[item] }))} onChange={value => setIncome(prev => ({ ...prev, incomeType: value }))} />
              <Field id="income-date" label={text.receivedDate} value={income.receivedDate} type="date" onChange={value => setIncome(prev => ({ ...prev, receivedDate: value }))} />
              <div className="form-field full">
                <CurrencySelect value={income.currency} onChange={value => setIncome(prev => ({ ...prev, currency: value }))} lang={lang} label={text.currencyTitle} ariaLabel={text.currencyTitle} />
              </div>
              <label className="checkbox-line form-field full" htmlFor="income-recurring">
                <input id="income-recurring" type="checkbox" checked={income.recurring} onChange={event => setIncome(prev => ({ ...prev, recurring: event.target.checked }))} />
                {text.recurringMonthly}
              </label>
            </div>
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
          <div className="choice-row">
            <button type="button" className={savingsEnabled ? 'toggle-card active' : 'toggle-card'} onClick={() => setSavingsEnabled(value => !value)}>{text.hasSavings}</button>
            <button type="button" className={investmentsEnabled ? 'toggle-card active' : 'toggle-card'} onClick={() => setInvestmentsEnabled(value => !value)}>{text.hasInvestments}</button>
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
          <div className="focus-grid">
            <button type="button" className={focus.zakat ? 'focus-card active' : 'focus-card'} onClick={() => setFocus(prev => ({ ...prev, zakat: !prev.zakat }))}>{text.followZakat}</button>
            <button type="button" className={focus.charity ? 'focus-card active' : 'focus-card'} onClick={() => setFocus(prev => ({ ...prev, charity: !prev.charity }))}>{text.followCharity}</button>
            <button type="button" className={!focus.zakat && !focus.charity ? 'focus-card active' : 'focus-card'} onClick={() => setFocus({ zakat: false, charity: false })}>{text.notNow}</button>
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

    return (
      <section className="step-panel">
        <div className="step-heading">
          <CheckCircle2 size={30} />
          <div>
            <h2 id="setup-step-title">{summary ? text.initialPlanBuilt : text.builtFromExisting}</h2>
            <p>{text.savedSub}</p>
          </div>
        </div>
        <div className="summary-grid">
          <Summary label={text.summaryCurrency} value={defaultCurrency} />
          <Summary label={text.expectedRemaining} value={formatCurrency(summary?.expectedRemaining ?? 0, defaultCurrency, lang)} />
          <Summary
            label={text.recommendedSavingPercent}
            value={summary?.recommendedSavingPercent ? formatPercent(summary.recommendedSavingPercent / 100, lang) : text.notEnoughForEstimate}
          />
          <Summary label={text.monthlySavingSuggestion} value={formatCurrency(summary?.monthlySavingSuggestion ?? 0, defaultCurrency, lang)} />
          <Summary
            label={text.firstGoalCompletion}
            value={summary?.firstGoalCompletionDate ? formatDate(summary.firstGoalCompletionDate, lang) : text.notEnoughForEstimate}
          />
          <Summary label={text.addedIncome} value={summary?.income ?? 0} />
          <Summary label={text.addedExpenses} value={summary?.expenses ?? 0} />
          <Summary label={text.addedGoals} value={summary?.goals ?? 0} />
          <Summary label={text.addedSavings} value={summary?.savings ?? 0} />
          <Summary label={text.addedInvestments} value={summary?.investments ?? 0} />
          <Summary label={text.addedProjects} value={summary?.projects ?? 0} />
        </div>
        <div className="finish-actions">
          {focus.zakat && <button type="button" onClick={() => router.push('/zakat')}>{text.openZakat}</button>}
          {focus.charity && <button type="button" onClick={() => router.push('/charity')}>{text.openCharity}</button>}
          <button type="button" className="primary" onClick={completeAndGoDashboard} disabled={saving}>{saving ? text.saving : text.goDashboard}</button>
        </div>
      </section>
    );
  }
}

function Stepper({
  step,
  steps,
  statuses,
  ariaLabel,
  labels,
}: {
  step: number;
  steps: readonly string[];
  statuses: Record<Step, 'completed' | 'current' | 'optional' | 'missing' | 'skipped'>;
  ariaLabel: string;
  labels: { completed: string; current: string; upcoming: string };
}) {
  return (
    <ol className="setup-stepper" aria-label={ariaLabel}>
      {steps.map((item, index) => {
        const status = statuses[index as Step];
        const state = status === 'completed' ? 'done' : index === step ? 'active' : 'upcoming';
        const stateLabel = state === 'done' ? labels.completed : state === 'active' ? labels.current : labels.upcoming;
        return (
          <li key={item} className={state} aria-current={index === step ? 'step' : undefined}>
            <span>{index < step ? <CheckCircle2 size={14} aria-hidden="true" /> : index + 1}</span>
            <b>{item}</b>
            <em>{stateLabel}</em>
          </li>
        );
      })}
      <style jsx>{`
        .setup-stepper{display:flex;flex-wrap:wrap;gap:9px;overflow-x:visible;padding:2px 2px 16px;margin:0 0 18px;list-style:none;scrollbar-width:none;max-width:100%;min-width:0}
        .setup-stepper::-webkit-scrollbar{display:none}
        .setup-stepper li{flex:1 1 170px;min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"icon title" "icon state";align-items:center;gap:3px 8px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);color:var(--sfm-muted-readable);border-radius:18px;padding:9px 11px;font-weight:900;font-size:12px;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
        .setup-stepper li.active{background:linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-card-dark));color:#FFFFFF;border-color:rgba(167,243,240,.30);box-shadow:0 12px 28px rgba(29,140,255,.18),inset 0 -2px 0 rgba(24,212,212,.50)}
        .setup-stepper li.done{background:#ECFDF5;color:#047857;border-color:rgba(16,185,129,.22)}
        .setup-stepper li.upcoming{background:#FFFFFF}
        .setup-stepper span{grid-area:icon;width:28px;height:28px;border-radius:999px;background:rgba(29,140,255,.13);display:grid;place-items:center;flex:0 0 auto;color:var(--sfm-primary-dark)}
        .setup-stepper li.active span{background:rgba(234,246,255,.14);color:var(--sfm-soft-cyan)}
        .setup-stepper li.done span{background:#D1FAE5;color:#047857}
        .setup-stepper b{grid-area:title;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25}
        .setup-stepper em{grid-area:state;font-style:normal;font-size:10px;font-weight:950;color:inherit;opacity:.78;line-height:1.15}
        @media(max-width:720px){.setup-stepper{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;overscroll-behavior-inline:contain;padding-bottom:12px;margin-bottom:14px}.setup-stepper li{flex:0 0 min(78vw,250px)}}
      `}</style>
    </ol>
  );
}

function ToggleRow({ active, setActive, yes, no }: { active: boolean; setActive: (value: boolean) => void; yes: string; no: string }) {
  return (
    <div className="choice-row">
      <button type="button" className={active ? 'choice-btn active' : 'choice-btn'} onClick={() => setActive(true)}>{yes}</button>
      <button type="button" className={!active ? 'choice-btn active' : 'choice-btn'} onClick={() => setActive(false)}>{no}</button>
    </div>
  );
}

function ExistingDataCard({
  title,
  value,
  hint,
  confirmLabel,
  editLabel,
  onConfirm,
  onEdit,
}: {
  title: string;
  value: string;
  hint: string;
  confirmLabel: string;
  editLabel: string;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="existing-data-card">
      <CheckCircle2 size={22} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <strong>{value}</strong>
        <p>{hint}</p>
      </div>
      <div className="existing-actions">
        <button type="button" className="primary-btn" onClick={onConfirm}>{confirmLabel}</button>
        <button type="button" className="ghost-btn" onClick={onEdit}>{editLabel}</button>
      </div>
    </article>
  );
}

function Field({ id, label, value, onChange, type = 'text', placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        value={value}
        type={type}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.001' : undefined}
        inputMode={type === 'number' ? 'decimal' : undefined}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="summary-card">
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}
