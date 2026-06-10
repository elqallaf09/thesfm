'use client';

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit3,
  Gauge,
  Landmark,
  PauseCircle,
  PlayCircle,
  Plus,
  ReceiptText,
  RefreshCcw,
  Snowflake,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  WalletCards,
  X,
  Zap,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { calculateDebtSchedule, debtPaymentMonth, deriveFirstPaymentDate } from '@/lib/debts/calculateDebtSchedule';
import { formatMoney } from '@/lib/formatMoney';
import { useCurrency } from '@/lib/useCurrency';

type Lang = 'ar' | 'en' | 'fr';
type DebtStatus = 'active' | 'paid' | 'paused';
type InterestType = 'none' | 'annual' | 'monthly';

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  creditor_name: string | null;
  original_amount: number | string;
  remaining_amount: number | string;
  calculated_remaining_amount?: number | string | null;
  total_paid_amount?: number | string | null;
  total_interest_paid?: number | string | null;
  total_principal_paid?: number | string | null;
  last_calculated_at?: string | null;
  currency: string;
  start_date: string;
  first_payment_date?: string | null;
  monthly_payment: number | string;
  interest_rate: number | string | null;
  interest_type: InterestType | string | null;
  payment_day: number | string | null;
  notes: string | null;
  auto_add_to_expenses: boolean | null;
  status: DebtStatus | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DebtPaymentRow = {
  id: string;
  user_id: string;
  debt_id: string;
  payment_date: string;
  amount: number | string;
  interest_amount: number | string | null;
  principal_amount: number | string | null;
  currency: string | null;
  expense_id: string | null;
};

type DebtForm = {
  id?: string;
  name: string;
  creditorName: string;
  originalAmount: string;
  remainingAmount: string;
  currency: string;
  startDate: string;
  firstPaymentDate: string;
  monthlyPayment: string;
  interestRate: string;
  interestType: InterestType;
  paymentDay: string;
  notes: string;
  autoAddToExpenses: boolean;
  status: DebtStatus;
};

const SUPPORTED_CURRENCIES = ['KWD', 'USD', 'SAR', 'AED', 'QAR', 'BHD', 'OMR', 'EUR', 'GBP'];
const DEFAULT_START_DATE = new Date().toISOString().slice(0, 10);

const DEFAULT_FORM: DebtForm = {
  name: '',
  creditorName: '',
  originalAmount: '',
  remainingAmount: '',
  currency: 'KWD',
  startDate: DEFAULT_START_DATE,
  firstPaymentDate: deriveFirstPaymentDate(DEFAULT_START_DATE, '1'),
  monthlyPayment: '',
  interestRate: '0',
  interestType: 'annual',
  paymentDay: '1',
  notes: '',
  autoAddToExpenses: true,
  status: 'active',
};

function createDefaultForm(currency = 'KWD'): DebtForm {
  const startDate = new Date().toISOString().slice(0, 10);
  return {
    ...DEFAULT_FORM,
    currency,
    startDate,
    firstPaymentDate: deriveFirstPaymentDate(startDate, DEFAULT_FORM.paymentDay),
  };
}

const TEXT = {
  title: { ar: 'الديون', en: 'Debts', fr: 'Dettes' },
  subtitle: {
    ar: 'تابع التزاماتك الشهرية وخطط لسدادها دون التأثير على ميزانيتك.',
    en: 'Track monthly obligations and plan repayments without disrupting your budget.',
    fr: 'Suivez vos engagements mensuels et planifiez leur remboursement sans déséquilibrer votre budget.',
  },
  addDebt: { ar: 'إضافة دين', en: 'Add debt', fr: 'Ajouter une dette' },
  editDebt: { ar: 'تعديل الدين', en: 'Edit debt', fr: 'Modifier la dette' },
  totalDebts: { ar: 'إجمالي الديون', en: 'Total debts', fr: 'Total des dettes' },
  remainingToPay: { ar: 'المتبقي للسداد', en: 'Remaining to pay', fr: 'Reste à rembourser' },
  monthlyInstallments: { ar: 'إجمالي الأقساط الشهرية', en: 'Monthly payments', fr: 'Mensualités totales' },
  highestDebt: { ar: 'أعلى دين', en: 'Highest debt', fr: 'Dette la plus élevée' },
  debtToIncome: { ar: 'نسبة الديون من الدخل الشهري', en: 'Debt-to-income ratio', fr: 'Ratio dette/revenu' },
  debtAnalysis: { ar: 'تحليل الديون', en: 'Debt analysis', fr: 'Analyse des dettes' },
  educational: { ar: 'تحليل تعليمي محسوب من بياناتك', en: 'Educational analysis from your data', fr: 'Analyse éducative calculée à partir de vos données' },
  noDebts: { ar: 'لا توجد ديون بعد', en: 'No debts yet', fr: 'Aucune dette pour le moment' },
  noDebtsBody: {
    ar: 'أضف أول دين لتتبع الرصيد المتبقي، الأقساط، وتاريخ السداد القادم.',
    en: 'Add your first debt to track remaining balance, payments, and the next due date.',
    fr: 'Ajoutez votre première dette pour suivre le solde restant, les paiements et la prochaine échéance.',
  },
  name: { ar: 'اسم الدين', en: 'Debt name', fr: 'Nom de la dette' },
  namePlaceholder: { ar: 'مثال: قرض سيارة أو بطاقة ائتمان', en: 'Example: car loan or credit card', fr: 'Exemple : prêt auto ou carte de crédit' },
  creditor: { ar: 'الجهة الدائنة', en: 'Creditor', fr: 'Créancier' },
  creditorPlaceholder: { ar: 'بنك أو شركة تمويل أو شخص', en: 'Bank, finance company, or person', fr: 'Banque, société de financement ou personne' },
  originalAmount: { ar: 'مبلغ الدين الأصلي', en: 'Original amount', fr: 'Montant initial' },
  remainingAmount: { ar: 'المبلغ المتبقي', en: 'Remaining amount', fr: 'Montant restant' },
  currency: { ar: 'العملة', en: 'Currency', fr: 'Devise' },
  startDate: { ar: 'تاريخ بداية الدين', en: 'Start date', fr: 'Date de début' },
  firstPaymentDate: { ar: 'تاريخ أول دفعة شهرية', en: 'First monthly payment date', fr: 'Date de la première mensualité' },
  firstPaymentDateHelp: {
    ar: 'يُستخدم هذا التاريخ لحساب الدفعات الشهرية المستحقة وخصمها من الرصيد المتبقي.',
    en: 'This date is used to calculate due monthly payments and deduct them from the remaining balance.',
    fr: 'Cette date sert à calculer les mensualités dues et à les déduire du solde restant.',
  },
  monthlyPayment: { ar: 'قيمة الدفع الشهري', en: 'Monthly payment', fr: 'Paiement mensuel' },
  interestRate: { ar: 'نسبة الفائدة', en: 'Interest rate', fr: 'Taux d’intérêt' },
  interestType: { ar: 'نوع الفائدة', en: 'Interest type', fr: 'Type d’intérêt' },
  noInterest: { ar: 'بدون فائدة', en: 'No interest', fr: 'Sans intérêt' },
  annualInterest: { ar: 'فائدة سنوية', en: 'Annual interest', fr: 'Intérêt annuel' },
  monthlyInterest: { ar: 'فائدة شهرية', en: 'Monthly interest', fr: 'Intérêt mensuel' },
  paymentDay: { ar: 'يوم الدفع الشهري', en: 'Monthly payment day', fr: 'Jour de paiement mensuel' },
  autoExpense: { ar: 'إضافة الدفعة الشهرية إلى المصروفات تلقائيًا', en: 'Add monthly payment to expenses automatically', fr: 'Ajouter automatiquement la mensualité aux dépenses' },
  notes: { ar: 'ملاحظات', en: 'Notes', fr: 'Notes' },
  save: { ar: 'حفظ الدين', en: 'Save debt', fr: 'Enregistrer la dette' },
  saving: { ar: 'جارٍ الحفظ...', en: 'Saving...', fr: 'Enregistrement...' },
  cancel: { ar: 'إلغاء', en: 'Cancel', fr: 'Annuler' },
  active: { ar: 'نشط', en: 'Active', fr: 'Active' },
  paid: { ar: 'مدفوع', en: 'Paid', fr: 'Payée' },
  paused: { ar: 'متوقف', en: 'Paused', fr: 'Suspendue' },
  remaining: { ar: 'المتبقي', en: 'Remaining', fr: 'Restant' },
  paidAmount: { ar: 'المدفوع', en: 'Paid', fr: 'Payé' },
  totalPaidAmount: { ar: 'إجمالي المدفوع', en: 'Total paid', fr: 'Total payé' },
  totalInterestPaid: { ar: 'إجمالي الفائدة المدفوعة', en: 'Total interest paid', fr: 'Total des intérêts payés' },
  paidPaymentsCount: { ar: 'عدد الدفعات المدفوعة', en: 'Paid payments', fr: 'Paiements effectués' },
  lastPayment: { ar: 'آخر دفعة تم خصمها', en: 'Last deducted payment', fr: 'Dernier paiement déduit' },
  payoffRate: { ar: 'نسبة السداد', en: 'Payoff rate', fr: 'Taux de remboursement' },
  nextPayment: { ar: 'الدفعة القادمة', en: 'Next payment', fr: 'Prochain paiement' },
  paymentDayLabel: { ar: 'يوم الدفع', en: 'Payment day', fr: 'Jour de paiement' },
  recordPayment: { ar: 'تسجيل دفعة', en: 'Record payment', fr: 'Enregistrer un paiement' },
  pause: { ar: 'إيقاف مؤقت', en: 'Pause', fr: 'Suspendre' },
  resume: { ar: 'استئناف', en: 'Resume', fr: 'Reprendre' },
  markPaid: { ar: 'تم السداد', en: 'Mark paid', fr: 'Marquer payée' },
  delete: { ar: 'حذف', en: 'Delete', fr: 'Supprimer' },
  edit: { ar: 'تعديل', en: 'Edit', fr: 'Modifier' },
  monthlyRatio: { ar: 'نسبة الأقساط من الدخل الشهري', en: 'Payments as share of income', fr: 'Mensualités en part du revenu' },
  incomeUnavailable: { ar: 'لا توجد بيانات دخل كافية لحساب النسبة.', en: 'Not enough income data to calculate the ratio.', fr: 'Données de revenu insuffisantes pour calculer le ratio.' },
  ratioHigh: { ar: 'تتجاوز أقساط الديون 30% من الدخل الشهري المسجل. راجع الالتزامات بعناية.', en: 'Debt payments exceed 30% of recorded monthly income. Review obligations carefully.', fr: 'Les mensualités dépassent 30 % du revenu mensuel enregistré. Examinez les engagements avec attention.' },
  ratioOk: { ar: 'نسبة الأقساط ضمن نطاق يمكن متابعته وفق البيانات المسجلة.', en: 'The payment ratio is within a trackable range based on recorded data.', fr: 'Le ratio de mensualités reste dans une plage suivable selon les données enregistrées.' },
  highestImpact: { ar: 'أعلى دين تأثيرًا على الميزانية', en: 'Highest budget impact', fr: 'Impact budgétaire le plus élevé' },
  payoffOrder: { ar: 'اقتراح ترتيب السداد', en: 'Suggested payoff order', fr: 'Ordre de remboursement suggéré' },
  highestInterestFirst: { ar: 'الأعلى فائدة أولًا', en: 'Highest interest first', fr: 'Taux le plus élevé d’abord' },
  smallestDebtFirst: { ar: 'أصغر دين أولًا', en: 'Smallest debt first', fr: 'Plus petite dette d’abord' },
  payoffEstimate: { ar: 'تقدير مدة السداد', en: 'Estimated payoff period', fr: 'Durée estimée de remboursement' },
  months: { ar: 'شهر', en: 'months', fr: 'mois' },
  interestWarning: {
    ar: 'القسط الشهري لا يغطي الفائدة، وقد يزيد الدين بدلًا من أن ينقص.',
    en: 'The monthly payment does not cover interest, so the debt may increase instead of decrease.',
    fr: 'La mensualité ne couvre pas les intérêts, la dette peut donc augmenter au lieu de diminuer.',
  },
  unavailable: { ar: 'غير متاح', en: 'Unavailable', fr: 'Indisponible' },
  loading: { ar: 'جارٍ تحميل الديون...', en: 'Loading debts...', fr: 'Chargement des dettes...' },
  saved: { ar: 'تم حفظ الدين بنجاح.', en: 'Debt saved successfully.', fr: 'Dette enregistrée avec succès.' },
  deleted: { ar: 'تم حذف الدين.', en: 'Debt deleted.', fr: 'Dette supprimée.' },
  paymentRecorded: { ar: 'تم تسجيل الدفعة وتحديث الرصيد.', en: 'Payment recorded and balance updated.', fr: 'Paiement enregistré et solde mis à jour.' },
  generatedPayments: { ar: 'تمت إضافة الدفعات الشهرية المستحقة.', en: 'Due monthly payments were added.', fr: 'Les mensualités dues ont été ajoutées.' },
  updateDebtCalculations: { ar: 'تحديث حساب الديون', en: 'Update debt calculations', fr: 'Mettre à jour les calculs des dettes' },
  calculatingDebts: { ar: 'جارٍ تحديث الحساب...', en: 'Updating calculations...', fr: 'Mise à jour des calculs...' },
  debtCalculationUpdated: { ar: 'تم تحديث حساب الديون بنجاح.', en: 'Debt calculations updated successfully.', fr: 'Les calculs des dettes ont été mis à jour.' },
  noDueMonthlyPayments: { ar: 'لا توجد دفعات شهرية مستحقة حاليًا.', en: 'No monthly payments are currently due.', fr: 'Aucune mensualité n’est actuellement due.' },
  required: { ar: 'يرجى إكمال الحقول المطلوبة بقيم صحيحة.', en: 'Please complete required fields with valid values.', fr: 'Veuillez compléter les champs obligatoires avec des valeurs valides.' },
  completeRequired: { ar: 'يرجى إدخال الحقول المطلوبة قبل الحفظ.', en: 'Please complete the required fields before saving.', fr: 'Veuillez compléter les champs obligatoires avant l’enregistrement.' },
  completeRequiredButton: { ar: 'أكمل البيانات المطلوبة', en: 'Complete required fields', fr: 'Compléter les champs requis' },
  modalSubtitle: { ar: 'أدخل بيانات الدين لمتابعة السداد الشهري.', en: 'Enter debt details to track monthly repayment.', fr: 'Saisissez les données de la dette pour suivre le remboursement mensuel.' },
  saveErrorTitle: { ar: 'تعذر حفظ بيانات الدين', en: 'Could not save debt data', fr: 'Impossible d’enregistrer les données de la dette' },
  sectionDebtData: { ar: 'بيانات الدين', en: 'Debt details', fr: 'Détails de la dette' },
  sectionPaymentDetails: { ar: 'تفاصيل السداد', en: 'Repayment details', fr: 'Détails du remboursement' },
  sectionInterest: { ar: 'الفائدة', en: 'Interest', fr: 'Intérêt' },
  sectionSettings: { ar: 'الإعدادات والملاحظات', en: 'Settings and notes', fr: 'Paramètres et notes' },
  autoExpenseHelper: { ar: 'سيتم تسجيل الدفعة الشهرية ضمن المصروفات عند موعد الاستحقاق.', en: 'The monthly payment will be recorded as an expense when it becomes due.', fr: 'La mensualité sera enregistrée comme dépense à la date d’échéance.' },
  validationName: { ar: 'يرجى إدخال اسم الدين.', en: 'Please enter the debt name.', fr: 'Veuillez saisir le nom de la dette.' },
  validationCreditor: { ar: 'يرجى إدخال الجهة الدائنة.', en: 'Please enter the creditor.', fr: 'Veuillez saisir le créancier.' },
  validationOriginalAmount: { ar: 'يرجى إدخال مبلغ الدين الأصلي.', en: 'Please enter the original debt amount.', fr: 'Veuillez saisir le montant initial de la dette.' },
  validationRemainingAmount: { ar: 'يرجى إدخال المبلغ المتبقي.', en: 'Please enter the remaining amount.', fr: 'Veuillez saisir le montant restant.' },
  validationMonthlyPayment: { ar: 'يرجى إدخال قيمة الدفع الشهري.', en: 'Please enter the monthly payment amount.', fr: 'Veuillez saisir le montant de la mensualité.' },
  validationCurrency: { ar: 'يرجى اختيار العملة.', en: 'Please choose a currency.', fr: 'Veuillez choisir une devise.' },
  validationInterestRate: { ar: 'نسبة الفائدة يجب أن تكون بين 0 و100.', en: 'Interest rate must be between 0 and 100.', fr: 'Le taux d’intérêt doit être compris entre 0 et 100.' },
  validationPaymentDay: { ar: 'يوم الدفع الشهري يجب أن يكون بين 1 و31.', en: 'Monthly payment day must be between 1 and 31.', fr: 'Le jour de paiement mensuel doit être compris entre 1 et 31.' },
  validationStartDate: { ar: 'تاريخ بداية الدين غير صالح.', en: 'Debt start date is invalid.', fr: 'La date de début de la dette est invalide.' },
  validationFirstPaymentDate: { ar: 'تاريخ أول دفعة شهرية غير صالح.', en: 'First monthly payment date is invalid.', fr: 'La date de la première mensualité est invalide.' },
  debtCalculationError: { ar: 'تعذر تحديث بيانات الدين. يرجى مراجعة إعدادات قاعدة البيانات.', en: 'Could not update debt data. Please review database settings.', fr: 'Impossible de mettre à jour les données de la dette. Veuillez vérifier les paramètres de la base de données.' },
  authSaveError: { ar: 'يجب تسجيل الدخول لحفظ بيانات الدين.', en: 'You must sign in to save debt data.', fr: 'Vous devez vous connecter pour enregistrer les données de la dette.' },
  rlsSaveError: { ar: 'تعذر حفظ الدين بسبب صلاحيات الوصول. يرجى مراجعة إعدادات قاعدة البيانات.', en: 'Debt could not be saved because of access permissions. Please review database settings.', fr: 'La dette n’a pas pu être enregistrée en raison des autorisations d’accès. Veuillez vérifier les paramètres de la base de données.' },
  databaseSaveError: { ar: 'تعذر حفظ بيانات الدين. يرجى مراجعة إعدادات قاعدة البيانات والمحاولة مرة أخرى.', en: 'Debt data could not be saved. Please review the database settings and try again.', fr: 'Les données de la dette n’ont pas pu être enregistrées. Veuillez vérifier les paramètres de la base de données puis réessayer.' },
  networkSaveError: { ar: 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقًا.', en: 'Could not connect to the server. Please try again later.', fr: 'Impossible de se connecter au serveur. Veuillez réessayer plus tard.' },
  duplicatePayment: { ar: 'تم تسجيل دفعة لهذا الدين في هذا التاريخ مسبقًا.', en: 'A payment for this debt already exists on this date.', fr: 'Un paiement pour cette dette existe déjà à cette date.' },
  error: { ar: 'تعذر إكمال العملية. حاول مرة أخرى لاحقًا.', en: 'Could not complete the action. Please try again later.', fr: 'Impossible de terminer l’action. Réessayez plus tard.' },
  yes: { ar: 'نعم', en: 'Yes', fr: 'Oui' },
  no: { ar: 'لا', en: 'No', fr: 'Non' },
  dueToday: { ar: 'مستحق اليوم', en: 'Due today', fr: 'Dû aujourd’hui' },
  tableView: { ar: 'جدول الديون', en: 'Debts table', fr: 'Tableau des dettes' },
  // Payoff strategies
  payoffDate: { ar: 'تاريخ السداد المتوقع', en: 'Est. payoff date', fr: 'Date de remboursement estimée' },
  payoffStrategies: { ar: 'اقتراحات طريقة السداد', en: 'Payoff strategies', fr: 'Stratégies de remboursement' },
  payoffStrategiesBody: {
    ar: 'أدخل أي مبلغ إضافي تستطيع دفعه شهريًا واكتشف الفرق بين طريقة الكرة الثلجية وطريقة الانهيار الجليدي.',
    en: 'Enter any extra monthly amount and see the difference between the snowball and avalanche methods.',
    fr: 'Entrez un montant mensuel supplémentaire et découvrez la différence entre la méthode boule de neige et la méthode avalanche.',
  },
  snowballTitle: { ar: 'الكرة الثلجية', en: 'Snowball', fr: 'Boule de neige' },
  snowballDesc: {
    ar: 'سدِّد أصغر الديون أولًا، ثم أضف دفعتها إلى الدين التالي — تكسب زخمًا نفسيًا وتشعر بالتقدم بسرعة.',
    en: 'Pay off the smallest debts first, then roll that payment to the next — you build momentum and see quick wins.',
    fr: `Remboursez d'abord les plus petites dettes, puis cumulez ce paiement sur la suivante — vous gagnez en motivation.`,
  },
  avalancheTitle: { ar: 'الانهيار الجليدي', en: 'Avalanche', fr: 'Avalanche' },
  avalancheDesc: {
    ar: 'سدِّد الدين الأعلى فائدة أولًا — توفر أكبر قدر من المال على المدى الطويل.',
    en: 'Pay off the highest-interest debt first — you save the most money over time.',
    fr: `Remboursez d'abord la dette au taux le plus élevé — vous économisez le plus d'argent à long terme.`,
  },
  extraPaymentLabel: { ar: 'دفعة إضافية شهرية', en: 'Extra monthly payment', fr: 'Versement mensuel supplémentaire' },
  extraPaymentPlaceholder: { ar: 'مثال: 50', en: 'e.g. 50', fr: 'ex. 50' },
  totalInterestLabel: { ar: 'إجمالي الفائدة', en: 'Total interest', fr: 'Total des intérêts' },
  interestSaved: { ar: 'فائدة موفَّرة', en: 'Interest saved', fr: 'Intérêts économisés' },
  payoffInMonths: { ar: 'مدة السداد الكلية', en: 'Total payoff time', fr: 'Durée totale de remboursement' },
  debtOrderLabel: { ar: 'ترتيب السداد', en: 'Payoff order', fr: 'Ordre de remboursement' },
  payoffMonth: { ar: 'الشهر', en: 'Month', fr: 'Mois' },
  noActiveDebts: { ar: 'لا توجد ديون نشطة لحساب الاستراتيجية.', en: 'No active debts to calculate strategy.', fr: 'Aucune dette active pour calculer la stratégie.' },
  interestSavedVsSnowball: { ar: 'وفر مقارنةً بالكرة الثلجية', en: 'saved vs. snowball', fr: 'économisé vs. boule de neige' },
  fastestMethod: { ar: 'أسرع بـ', en: 'faster by', fr: 'plus rapide de' },
  sameSpeed: { ar: 'نفس المدة', en: 'Same duration', fr: 'Même durée' },
  recommended: { ar: 'الأفضل لتوفير المال', en: 'Best to save money', fr: 'Meilleure économie' },
  bestMomentum: { ar: 'الأفضل نفسيًا', en: 'Best for momentum', fr: 'Meilleure motivation' },
};

function tr(lang: string | undefined, key: keyof typeof TEXT) {
  const safeLang: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  return TEXT[key][safeLang];
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function remainingForDebt(debt: DebtRow) {
  return toNumber(debt.calculated_remaining_amount ?? debt.remaining_amount);
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanNumericInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole, ...fractionParts] = cleaned.split('.');
  return fractionParts.length ? `${whole}.${fractionParts.join('')}` : whole;
}

function formatDateToYYYYMMDD(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : trimmed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function mapInterestTypeToDb(value: unknown): InterestType {
  if (value === 'none' || value === 'monthly' || value === 'annual') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized.includes('بدون') || normalized.includes('none') || normalized.includes('sans')) return 'none';
  if (normalized.includes('شهري') || normalized.includes('monthly') || normalized.includes('mensuel')) return 'monthly';
  if (normalized.includes('سنوي') || normalized.includes('annual') || normalized.includes('annuel')) return 'annual';
  return 'annual';
}

function mapDebtStatusToDb(value: unknown): DebtStatus {
  if (value === 'paid' || value === 'paused' || value === 'active') return value;
  return 'active';
}

function clampPaymentDay(value: unknown) {
  return Math.min(31, Math.max(1, Math.round(toNumber(value, 1))));
}

function addOneDebtMonth(monthIso: string) {
  const [year, month] = monthIso.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return '';
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function debtFirstPaymentDate(debt: DebtRow) {
  return debt.first_payment_date || deriveFirstPaymentDate(debt.start_date, debt.payment_day);
}

function debtSchedule(debt: DebtRow) {
  return calculateDebtSchedule({
    originalAmount: toNumber(debt.original_amount),
    startDate: debt.start_date,
    firstPaymentDate: debtFirstPaymentDate(debt),
    monthlyPayment: toNumber(debt.monthly_payment),
    interestRate: toNumber(debt.interest_rate),
    interestType: debt.interest_type || 'annual',
    paymentDay: debt.payment_day,
  });
}

function formatDate(value: string | null | undefined, lang: Lang) {
  if (!value) return TEXT.unavailable[lang];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function monthlyInterestAmount(debt: DebtRow) {
  const remaining = remainingForDebt(debt);
  const rate = toNumber(debt.interest_rate);
  const type = debt.interest_type || 'annual';
  const monthlyRate = type === 'none' ? 0 : type === 'monthly' ? rate / 100 : rate / 100 / 12;
  return remaining * monthlyRate;
}

function calculateDebtPayment(debt: DebtRow, overrideAmount?: number) {
  const remaining = remainingForDebt(debt);
  const requestedAmount = Math.max(0, overrideAmount ?? toNumber(debt.monthly_payment));
  const interestDue = Math.max(0, monthlyInterestAmount(debt));
  const amount = Math.min(requestedAmount, remaining + interestDue);
  const interestAmount = Math.min(interestDue, amount);
  const principalAmount = Math.max(0, amount - interestAmount);
  const nextRemaining = Math.max(0, remaining - principalAmount);
  return {
    amount,
    interestAmount,
    principalAmount,
    nextRemaining,
    warning: interestDue > 0 && requestedAmount <= interestDue,
  };
}

function payoffProgress(debt: DebtRow) {
  const original = toNumber(debt.original_amount);
  if (original <= 0) return 0;
  const paid = Math.max(0, original - remainingForDebt(debt));
  return Math.min(100, Math.max(0, (paid / original) * 100));
}

function estimatePayoffMonths(debt: DebtRow) {
  let remaining = remainingForDebt(debt);
  const payment = toNumber(debt.monthly_payment);
  if (remaining <= 0) return 0;
  if (payment <= 0) return null;
  for (let month = 1; month <= 600; month += 1) {
    const interest = monthlyInterestAmount({ ...debt, remaining_amount: remaining });
    const principal = payment - interest;
    if (principal <= 0) return null;
    remaining = Math.max(0, remaining - principal);
    if (remaining <= 0) return month;
  }
  return null;
}

function estimatePayoffDate(debt: DebtRow): string | null {
  const months = estimatePayoffMonths(debt);
  if (months === null || months === 0) return null;
  const firstPayment = debtFirstPaymentDate(debt);
  const base = new Date(`${firstPayment}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

type StrategyEntry = { debt: DebtRow; payoffMonth: number; interestPaid: number };
type StrategyResult = { order: StrategyEntry[]; totalMonths: number; totalInterest: number } | null;

function simulatePayoffStrategy(
  debts: DebtRow[],
  extraMonthly: number,
  method: 'snowball' | 'avalanche',
): StrategyResult {
  const active = debts.filter(
    d => d.status === 'active' && toNumber(d.monthly_payment) > 0 && remainingForDebt(d) > 0,
  );
  if (active.length === 0) return null;

  const sorted = [...active].sort((a, b) =>
    method === 'snowball'
      ? remainingForDebt(a) - remainingForDebt(b)
      : toNumber(b.interest_rate) - toNumber(a.interest_rate),
  );

  type State = {
    debt: DebtRow;
    remaining: number;
    interestPaid: number;
    payoffMonth: number | null;
    minPayment: number;
    done: boolean;
  };

  const states: State[] = sorted.map(d => ({
    debt: d,
    remaining: remainingForDebt(d),
    interestPaid: 0,
    payoffMonth: null,
    minPayment: toNumber(d.monthly_payment),
    done: false,
  }));

  let extraPool = Math.max(0, extraMonthly);
  const MAX_MONTHS = 600;

  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    if (states.every(s => s.done)) break;

    // First undone debt in priority order gets the extra payment
    let extraApplied = false;
    for (const state of states) {
      if (state.done) continue;

      const interestType = state.debt.interest_type || 'annual';
      const rate = toNumber(state.debt.interest_rate);
      const monthlyRate =
        interestType === 'none' ? 0 : interestType === 'monthly' ? rate / 100 : rate / 100 / 12;
      const interestCharge = state.remaining * monthlyRate;

      let payment = state.minPayment;
      if (!extraApplied) {
        payment += extraPool;
        extraApplied = true;
      }

      const totalOwed = state.remaining + interestCharge;
      payment = Math.min(payment, totalOwed);

      const interestPortion = Math.min(interestCharge, Math.max(0, payment));
      const principal = Math.max(0, payment - interestPortion);
      state.interestPaid += interestPortion;
      state.remaining = Math.max(0, state.remaining - principal);

      if (state.remaining <= 0.005) {
        state.remaining = 0;
        state.done = true;
        state.payoffMonth = month;
        extraPool += state.minPayment;
      }
    }
  }

  const order: StrategyEntry[] = states.map(s => ({
    debt: s.debt,
    payoffMonth: s.payoffMonth ?? MAX_MONTHS,
    interestPaid: s.interestPaid,
  }));

  const totalMonths = Math.max(...order.map(o => o.payoffMonth));
  const totalInterest = order.reduce((sum, o) => sum + o.interestPaid, 0);
  return { order, totalMonths, totalInterest };
}

function payloadFromForm(form: DebtForm, userId: string) {
  const startDate = formatDateToYYYYMMDD(form.startDate);
  if (!startDate) throw new Error('INVALID_DATE');
  const firstPaymentDate = formatDateToYYYYMMDD(form.firstPaymentDate) || deriveFirstPaymentDate(startDate, form.paymentDay);
  if (!firstPaymentDate) throw new Error('INVALID_FIRST_PAYMENT_DATE');
  if (firstPaymentDate < startDate) throw new Error('INVALID_FIRST_PAYMENT_DATE');

  return {
    user_id: userId,
    name: form.name.trim(),
    creditor_name: form.creditorName.trim(),
    original_amount: toNumber(form.originalAmount),
    remaining_amount: toNumber(form.remainingAmount),
    currency: form.currency.trim() || 'KWD',
    start_date: startDate,
    first_payment_date: firstPaymentDate,
    monthly_payment: toNumber(form.monthlyPayment),
    interest_rate: toNumber(form.interestRate, 0),
    interest_type: mapInterestTypeToDb(form.interestType),
    payment_day: clampPaymentDay(form.paymentDay),
    notes: form.notes.trim() || null,
    auto_add_to_expenses: Boolean(form.autoAddToExpenses),
    status: form.id ? mapDebtStatusToDb(form.status) : 'active',
  };
}

function validateDebtForm(form: DebtForm): Array<keyof typeof TEXT> {
  const errors: Array<keyof typeof TEXT> = [];
  const originalAmount = optionalNumber(form.originalAmount);
  const remainingAmount = optionalNumber(form.remainingAmount);
  const monthlyPayment = optionalNumber(form.monthlyPayment);
  const interestRate = optionalNumber(form.interestRate || '0');
  const paymentDay = optionalNumber(form.paymentDay);

  if (!form.name.trim()) errors.push('validationName');
  if (!form.creditorName.trim()) errors.push('validationCreditor');
  if (originalAmount === null || originalAmount <= 0) errors.push('validationOriginalAmount');
  if (remainingAmount === null || remainingAmount < 0) errors.push('validationRemainingAmount');
  if (!form.currency.trim()) errors.push('validationCurrency');
  const startDate = formatDateToYYYYMMDD(form.startDate);
  const firstPaymentDate = formatDateToYYYYMMDD(form.firstPaymentDate);
  if (!startDate) errors.push('validationStartDate');
  if (!firstPaymentDate || (startDate && firstPaymentDate < startDate)) errors.push('validationFirstPaymentDate');
  if (monthlyPayment === null || monthlyPayment <= 0) errors.push('validationMonthlyPayment');
  if (interestRate === null || interestRate < 0 || interestRate > 100) errors.push('validationInterestRate');
  if (paymentDay === null || !Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) errors.push('validationPaymentDay');

  return errors;
}

function debtSaveErrorMessage(error: unknown, t: (key: keyof typeof TEXT) => string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return t('networkSaveError');
  const details = [
    error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message ?? '') : '',
    error && typeof error === 'object' && 'details' in error ? String((error as { details?: unknown }).details ?? '') : '',
    error && typeof error === 'object' && 'hint' in error ? String((error as { hint?: unknown }).hint ?? '') : '',
    error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '',
  ].join(' ').toLowerCase();
  if (details.includes('failed to fetch') || details.includes('network') || details.includes('timeout')) {
    return t('networkSaveError');
  }
  if (details.includes('invalid_date')) {
    return t('validationStartDate');
  }
  if (details.includes('invalid_first_payment_date')) {
    return t('validationFirstPaymentDate');
  }
  if (details.includes('row-level security') || details.includes('rls') || details.includes('42501') || details.includes('permission')) {
    return t('rlsSaveError');
  }
  return t('databaseSaveError');
}

function safeDebtSaveErrorDetails(error: unknown) {
  if (!error || typeof error !== 'object') {
    return {
      message: error instanceof Error ? error.message : String(error ?? ''),
      code: undefined,
      details: undefined,
      hint: undefined,
    };
  }

  const record = error as {
    message?: unknown;
    code?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  return {
    message: typeof record.message === 'string' ? record.message : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    details: typeof record.details === 'string' ? record.details : undefined,
    hint: typeof record.hint === 'string' ? record.hint : undefined,
  };
}

export default function DebtsPage() {
  const { user, session, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const { currency: baseCurrency } = useCurrency();
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<DebtPaymentRow[]>([]);
  const [incomeRows, setIncomeRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DebtForm>(() => createDefaultForm(baseCurrency || 'KWD'));
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [generationChecked, setGenerationChecked] = useState(false);
  const [extraPaymentAmount, setExtraPaymentAmount] = useState('0');
  const modalRef = useRef<HTMLFormElement>(null);

  const t = useCallback((key: keyof typeof TEXT) => tr(locale, key), [locale]);
  const validationKeys = useMemo(() => validateDebtForm(form), [form]);
  const formIsValid = validationKeys.length === 0;
  const visibleValidationKeys = submitAttempted && !formIsValid ? validationKeys : [];

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [debtsResult, paymentsResult, incomeResult] = await Promise.all([
        supabase.from('debts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('debt_payments').select('*').eq('user_id', user.id).order('payment_date', { ascending: false }),
        supabase.from('monthly_income_sources').select('*').eq('user_id', user.id),
      ]);

      if (debtsResult.error) throw debtsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      setDebts(debtsResult.data ?? []);
      setPayments(paymentsResult.data ?? []);
      setIncomeRows(incomeResult.error ? [] : incomeResult.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    if (baseCurrency) setForm(current => ({ ...current, currency: current.id ? current.currency : baseCurrency }));
  }, [baseCurrency]);

  useEffect(() => {
    if (!authLoading && user) void loadData();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, loadData, user]);

  useEffect(() => {
    async function generateDuePayments() {
      if (!user || !session?.access_token || generationChecked) return;
      const paymentDate = new Date().toISOString().slice(0, 10);
      const generationKey = `sfm:debts:monthly-generation:${user.id}:${paymentDate}`;
      if (typeof window !== 'undefined' && window.sessionStorage.getItem(generationKey)) {
        setGenerationChecked(true);
        return;
      }
      setGenerationChecked(true);
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(generationKey, 'checked');
        }
      } catch {
        // Session storage can be unavailable in some browser privacy modes.
      }
      try {
        const response = await fetch('/api/debts/generate-monthly-expenses', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json().catch(() => null) as { processed?: number } | null;
        if (response.ok && payload?.processed && payload.processed > 0) {
          setNotice(t('generatedPayments'));
          await loadData();
        }
      } catch {
        // The page remains usable even if automation is not configured locally.
      }
    }
    void generateDuePayments();
  }, [generationChecked, loadData, session?.access_token, t, user]);

  const activeDebts = useMemo(() => debts.filter(debt => debt.status !== 'paid'), [debts]);
  const monthlyIncome = useMemo(() => incomeRows.reduce((sum, row) => sum + toNumber(row.amount), 0), [incomeRows]);
  const totals = useMemo(() => {
    const totalOriginal = debts.reduce((sum, debt) => sum + toNumber(debt.original_amount), 0);
    const totalRemaining = activeDebts.reduce((sum, debt) => sum + remainingForDebt(debt), 0);
    const totalMonthly = activeDebts.reduce((sum, debt) => sum + toNumber(debt.monthly_payment), 0);
    const highest = activeDebts.reduce<DebtRow | null>((current, debt) => {
      if (!current || remainingForDebt(debt) > remainingForDebt(current)) return debt;
      return current;
    }, null);
    return {
      totalOriginal,
      totalRemaining,
      totalMonthly,
      highest,
      ratio: monthlyIncome > 0 ? (totalMonthly / monthlyIncome) * 100 : null,
    };
  }, [activeDebts, debts, monthlyIncome]);

  const payoffMonths = useMemo(() => {
    const estimates = activeDebts.map(estimatePayoffMonths).filter((item): item is number => typeof item === 'number');
    return estimates.length > 0 ? Math.max(...estimates) : null;
  }, [activeDebts]);

  const extraPayment = Math.max(0, parseFloat(extraPaymentAmount) || 0);

  const snowballResult = useMemo(
    () => simulatePayoffStrategy(activeDebts, extraPayment, 'snowball'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDebts, extraPayment],
  );
  const avalancheResult = useMemo(
    () => simulatePayoffStrategy(activeDebts, extraPayment, 'avalanche'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeDebts, extraPayment],
  );

  const interestRiskDebt = activeDebts.find(debt => calculateDebtPayment(debt).warning);
  const highestInterest = [...activeDebts].sort((a, b) => toNumber(b.interest_rate) - toNumber(a.interest_rate))[0];
  const smallestDebt = [...activeDebts].sort((a, b) => remainingForDebt(a) - remainingForDebt(b))[0];

  function resetForm() {
    setForm(createDefaultForm(baseCurrency || 'KWD'));
    setSubmitAttempted(false);
    setError('');
    setFormOpen(false);
  }

  function openAddForm() {
    setForm(createDefaultForm(baseCurrency || 'KWD'));
    setSubmitAttempted(false);
    setError('');
    setFormOpen(true);
  }

  function openEditForm(debt: DebtRow) {
    setForm({
      id: debt.id,
      name: debt.name,
      creditorName: debt.creditor_name ?? '',
      originalAmount: String(debt.original_amount ?? ''),
      remainingAmount: String(debt.calculated_remaining_amount ?? debt.remaining_amount ?? ''),
      currency: debt.currency || baseCurrency || 'KWD',
      startDate: debt.start_date,
      firstPaymentDate: debtFirstPaymentDate(debt),
      monthlyPayment: String(debt.monthly_payment ?? ''),
      interestRate: String(debt.interest_rate ?? '0'),
      interestType: (debt.interest_type === 'none' || debt.interest_type === 'monthly' || debt.interest_type === 'annual') ? debt.interest_type : 'annual',
      paymentDay: String(debt.payment_day ?? '1'),
      notes: debt.notes ?? '',
      autoAddToExpenses: debt.auto_add_to_expenses !== false,
      status: (debt.status === 'paid' || debt.status === 'paused' || debt.status === 'active') ? debt.status : 'active',
    });
    setSubmitAttempted(false);
    setError('');
    setFormOpen(true);
  }

  useEffect(() => {
    if (!formOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      const firstField = modalRef.current?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
      );
      firstField?.focus();
    }, 60);

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    function handleModalKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSubmitAttempted(false);
        setError('');
        setFormOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter(element => !element.hasAttribute('disabled') && element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleModalKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleModalKeyDown);
    };
  }, [formOpen]);

  async function saveDebt(event: FormEvent) {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!user) {
      setError(t('authSaveError'));
      return;
    }
    if (!formIsValid) {
      setError('');
      window.requestAnimationFrame(() => {
        const firstInvalidField = modalRef.current?.querySelector<HTMLElement>(
          '[data-invalid="true"] input, [data-invalid="true"] select, [data-invalid="true"] textarea',
        );
        firstInvalidField?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        firstInvalidField?.focus();
      });
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = payloadFromForm(form, user.id);
      const result = form.id
        ? await supabase.from('debts').update(payload).eq('id', form.id).eq('user_id', user.id)
        : await supabase.from('debts').insert(payload);
      if (result.error) throw result.error;
      setNotice(t('saved'));
      resetForm();
      await loadData();
    } catch (err) {
      console.error('Debt save failed:', safeDebtSaveErrorDetails(err));
      setError(debtSaveErrorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(debt: DebtRow, status: DebtStatus, remainingAmount?: number) {
    if (!user) return;
    setError('');
    const payload: Record<string, unknown> = { status };
    if (typeof remainingAmount === 'number') {
      payload.remaining_amount = remainingAmount;
      payload.calculated_remaining_amount = remainingAmount;
      payload.last_calculated_at = new Date().toISOString();
    }
    const { error: updateError } = await supabase.from('debts').update(payload).eq('id', debt.id).eq('user_id', user.id);
    if (updateError) setError(updateError.message);
    else {
      setNotice(status === 'paid' ? t('paid') : status === 'paused' ? t('paused') : t('active'));
      await loadData();
    }
  }

  async function deleteDebt(debt: DebtRow) {
    if (!user) return;
    const confirmed = window.confirm(`${t('delete')} - ${debt.name}?`);
    if (!confirmed) return;
    const { error: deleteError } = await supabase.from('debts').delete().eq('id', debt.id).eq('user_id', user.id);
    if (deleteError) setError(deleteError.message);
    else {
      setNotice(t('deleted'));
      await loadData();
    }
  }

  async function recordPayment(debt: DebtRow) {
    if (!user) return;
    setError('');
    const paymentDate = new Date().toISOString().slice(0, 10);
    const paymentMonth = debtPaymentMonth(paymentDate);
    const nextMonth = addOneDebtMonth(paymentMonth);
    const existing = await supabase
      .from('debt_payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('debt_id', debt.id)
      .gte('payment_date', paymentMonth || paymentDate)
      .lt('payment_date', nextMonth || paymentDate)
      .limit(1)
      .maybeSingle();
    if (existing.data?.id) {
      setError(t('duplicatePayment'));
      return;
    }

    const payment = calculateDebtPayment(debt);
    try {
      let expenseId: string | null = null;
      if (debt.auto_add_to_expenses !== false) {
        const expenseExisting = await supabase
          .from('expense_items')
          .select('id')
          .eq('user_id', user.id)
          .eq('debt_id', debt.id)
          .eq('source', 'debt')
          .gte('date', paymentMonth || paymentDate)
          .lt('date', nextMonth || paymentDate)
          .limit(1)
          .maybeSingle();
        expenseId = expenseExisting.data?.id ?? null;
        if (!expenseId) {
          const expenseInsert = await supabase.from('expense_items').insert({
            user_id: user.id,
            name: `${locale === 'ar' ? 'دفعة شهرية' : locale === 'fr' ? 'Mensualité' : 'Monthly payment'}: ${debt.name}`,
            amount: payment.amount,
            currency: debt.currency || 'KWD',
            category: 'debt',
            date: paymentDate,
            notes: debt.notes,
            source: 'debt',
            debt_id: debt.id,
            enhanced: { source: 'debt', debt_id: debt.id, manual: true },
          }).select('id').maybeSingle();
          if (expenseInsert.error) throw expenseInsert.error;
          expenseId = expenseInsert.data?.id ?? null;
        }
      }

      const paymentInsert = await supabase.from('debt_payments').insert({
        user_id: user.id,
        debt_id: debt.id,
        payment_date: paymentDate,
        amount: payment.amount,
        interest_amount: payment.interestAmount,
        principal_amount: payment.principalAmount,
        currency: debt.currency || 'KWD',
        expense_id: expenseId,
      });
      if (paymentInsert.error) throw paymentInsert.error;

      const status = payment.nextRemaining <= 0 ? 'paid' : debt.status || 'active';
      const debtPayments = payments.filter(item => item.debt_id === debt.id);
      const recordedTotalPaid = debtPayments.reduce((sum, item) => sum + toNumber(item.amount), 0);
      const recordedTotalInterest = debtPayments.reduce((sum, item) => sum + toNumber(item.interest_amount), 0);
      const recordedTotalPrincipal = debtPayments.reduce((sum, item) => sum + toNumber(item.principal_amount), 0);
      const update = await supabase.from('debts').update({
        remaining_amount: payment.nextRemaining,
        calculated_remaining_amount: payment.nextRemaining,
        total_paid_amount: (debt.total_paid_amount == null ? recordedTotalPaid : toNumber(debt.total_paid_amount)) + payment.amount,
        total_interest_paid: (debt.total_interest_paid == null ? recordedTotalInterest : toNumber(debt.total_interest_paid)) + payment.interestAmount,
        total_principal_paid: (debt.total_principal_paid == null ? recordedTotalPrincipal : toNumber(debt.total_principal_paid)) + payment.principalAmount,
        last_calculated_at: new Date().toISOString(),
        status,
      }).eq('id', debt.id).eq('user_id', user.id);
      if (update.error) throw update.error;
      setNotice(payment.warning ? t('interestWarning') : t('paymentRecorded'));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  }

  async function runDebtCalculations() {
    if (!session?.access_token || calculating) return;
    setCalculating(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/debts/generate-monthly-expenses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; success?: boolean; processed?: number; updated?: number; code?: string; message?: string } | null;
      if (!response.ok || payload?.ok === false || payload?.success === false) {
        throw new Error(payload?.code || payload?.message || 'DEBT_CALCULATION_FAILED');
      }
      const processed = toNumber(payload?.processed);
      setNotice(processed > 0 ? t('debtCalculationUpdated') : t('noDueMonthlyPayments'));
      await loadData();
    } catch (err) {
      console.error('Debt calculation refresh failed:', safeDebtSaveErrorDetails(err));
      setError(t('debtCalculationError'));
    } finally {
      setCalculating(false);
    }
  }

  const money = (value: unknown, currency = baseCurrency || 'KWD') => formatMoney(toNumber(value), currency, locale);
  const pageError = formOpen ? supabaseConfigError : error || supabaseConfigError;

  if (authLoading || loading) {
    return (
      <div className="debts-shell" dir={dir}>
        <Sidebar />
        <main className="debts-main">
          <div className="debts-loading">{t('loading')}</div>
        </main>
        <DebtStyles />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="debts-shell" dir={dir}>
        <Sidebar />
        <main className="debts-main">
          <section className="debts-empty">
            <CreditCard size={28} />
            <h1>{t('title')}</h1>
            <p>{t('noDebtsBody')}</p>
          </section>
        </main>
        <DebtStyles />
      </div>
    );
  }

  return (
    <div className="debts-shell" dir={dir}>
      <Sidebar />
      <main className="debts-main">
        <section className="debts-hero">
          <div>
            <span className="debts-eyebrow"><Landmark size={16} /> THE SFM</span>
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          <div className="debts-hero-actions">
            <button type="button" className="debts-secondary-hero" onClick={() => void runDebtCalculations()} disabled={calculating || !session?.access_token}>
              <RefreshCcw size={18} className={calculating ? 'spin' : undefined} />
              {calculating ? t('calculatingDebts') : t('updateDebtCalculations')}
            </button>
            <button type="button" className="debts-primary" onClick={openAddForm}>
              <Plus size={18} />
              {t('addDebt')}
            </button>
          </div>
        </section>

        {(notice || pageError) && (
          <section className={`debts-notice ${pageError ? 'error' : 'success'}`}>
            {pageError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{pageError || notice}</span>
          </section>
        )}

        <section className="debts-summary-grid">
          <SummaryCard icon={<WalletCards size={18} />} label={t('totalDebts')} value={money(totals.totalOriginal)} />
          <SummaryCard icon={<CreditCard size={18} />} label={t('remainingToPay')} value={money(totals.totalRemaining)} />
          <SummaryCard icon={<ReceiptText size={18} />} label={t('monthlyInstallments')} value={money(totals.totalMonthly)} />
          <SummaryCard icon={<Gauge size={18} />} label={t('highestDebt')} value={totals.highest ? money(remainingForDebt(totals.highest), totals.highest.currency) : t('unavailable')} />
          <SummaryCard icon={<Sparkles size={18} />} label={t('debtToIncome')} value={totals.ratio === null ? t('unavailable') : `${totals.ratio.toFixed(1)}%`} />
        </section>

        <section className="debts-layout">
          <div className="debts-list-panel">
            <div className="debts-section-head">
              <div>
                <span>{t('tableView')}</span>
                <h2>{t('title')}</h2>
              </div>
              <button type="button" onClick={openAddForm}><Plus size={16} />{t('addDebt')}</button>
            </div>

            {debts.length === 0 ? (
              <div className="debts-empty">
                <CreditCard size={30} />
                <h2>{t('noDebts')}</h2>
                <p>{t('noDebtsBody')}</p>
                <button type="button" className="debts-primary" onClick={openAddForm}>{t('addDebt')}</button>
              </div>
            ) : (
              <div className="debt-card-grid">
                {debts.map(debt => {
                  const progress = payoffProgress(debt);
                  const schedule = debtSchedule(debt);
                  const status = (debt.status === 'paid' || debt.status === 'paused' || debt.status === 'active') ? debt.status : 'active';
                  const effectiveRemaining = remainingForDebt(debt);
                  const debtPayments = payments.filter(item => item.debt_id === debt.id);
                  const totalPaid = debt.total_paid_amount == null
                    ? debtPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
                    : toNumber(debt.total_paid_amount);
                  const paidAmount = Math.max(0, toNumber(debt.original_amount) - effectiveRemaining);
                  const nextPayment = schedule.nextPaymentDate ?? '';
                  const lastPayment = debtPayments[0]?.payment_date ?? '';
                  const isDue = nextPayment === new Date().toISOString().slice(0, 10);
                  return (
                    <article className="debt-card" key={debt.id}>
                      <div className="debt-card-top">
                        <div>
                          <h3>{debt.name}</h3>
                          <p>{debt.creditor_name || t('unavailable')}</p>
                        </div>
                        <span className={`debt-status ${status}`}>{t(status)}</span>
                      </div>
                      <div className="debt-progress">
                        <span><b>{t('payoffRate')}</b><strong dir="ltr">{progress.toFixed(1)}%</strong></span>
                        <i><b style={{ width: `${progress}%` }} /></i>
                      </div>
                      <div className="debt-metrics">
                        <DebtMetric label={t('originalAmount')} value={money(debt.original_amount, debt.currency)} />
                        <DebtMetric label={t('remaining')} value={money(effectiveRemaining, debt.currency)} />
                        <DebtMetric label={t('monthlyPayment')} value={money(debt.monthly_payment, debt.currency)} />
                        <DebtMetric label={t('startDate')} value={formatDate(debt.start_date, locale)} />
                        <DebtMetric label={t('firstPaymentDate')} value={formatDate(debtFirstPaymentDate(debt), locale)} />
                        <DebtMetric label={t('lastPayment')} value={formatDate(lastPayment, locale)} />
                        <DebtMetric label={t('nextPayment')} value={formatDate(nextPayment, locale)} />
                        <DebtMetric label={t('paidPaymentsCount')} value={`${debtPayments.length}`} />
                        <DebtMetric label={t('totalPaidAmount')} value={money(totalPaid || paidAmount, debt.currency)} />
                        <DebtMetric label={t('interestRate')} value={`${toNumber(debt.interest_rate).toFixed(2)}%`} />
                        <DebtMetric label={t('totalInterestPaid')} value={money(debt.total_interest_paid ?? 0, debt.currency)} />
                        <DebtMetric label={t('paymentDayLabel')} value={`${clampPaymentDay(debt.payment_day)}`} />
                        {debt.status !== 'paid' && (
                          <DebtMetric
                            label={t('payoffDate')}
                            value={formatDate(estimatePayoffDate(debt), locale)}
                            highlight
                          />
                        )}
                      </div>
                      {(schedule.warning || calculateDebtPayment(debt).warning) && (
                        <div className="debt-warning"><AlertTriangle size={15} />{t('interestWarning')}</div>
                      )}
                      {isDue && status === 'active' && <div className="debt-due"><CalendarDays size={15} />{t('dueToday')}</div>}
                      <div className="debt-actions">
                        <button type="button" onClick={() => openEditForm(debt)}><Edit3 size={15} />{t('edit')}</button>
                        {status === 'active' && <button type="button" onClick={() => void recordPayment(debt)}><ReceiptText size={15} />{t('recordPayment')}</button>}
                        {status === 'paused'
                          ? <button type="button" onClick={() => void updateStatus(debt, 'active')}><PlayCircle size={15} />{t('resume')}</button>
                          : status === 'active' ? <button type="button" onClick={() => void updateStatus(debt, 'paused')}><PauseCircle size={15} />{t('pause')}</button> : null}
                        {status !== 'paid' && <button type="button" onClick={() => void updateStatus(debt, 'paid', 0)}><CheckCircle2 size={15} />{t('markPaid')}</button>}
                        <button type="button" className="danger" onClick={() => void deleteDebt(debt)}><Trash2 size={15} />{t('delete')}</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="debts-insight">
            <div className="debts-section-head compact">
              <div>
                <span>{t('educational')}</span>
                <h2>{t('debtAnalysis')}</h2>
              </div>
            </div>
            <InsightRow label={t('monthlyRatio')} value={totals.ratio === null ? t('incomeUnavailable') : `${totals.ratio.toFixed(1)}%`} />
            <p className={totals.ratio !== null && totals.ratio > 30 ? 'insight-alert' : 'insight-copy'}>
              {totals.ratio === null ? t('incomeUnavailable') : totals.ratio > 30 ? t('ratioHigh') : t('ratioOk')}
            </p>
            {interestRiskDebt && <p className="insight-alert">{t('interestWarning')}</p>}
            <InsightRow label={t('highestImpact')} value={totals.highest ? `${totals.highest.name} - ${money(remainingForDebt(totals.highest), totals.highest.currency)}` : t('unavailable')} />
            <InsightRow label={t('highestInterestFirst')} value={highestInterest ? highestInterest.name : t('unavailable')} />
            <InsightRow label={t('smallestDebtFirst')} value={smallestDebt ? smallestDebt.name : t('unavailable')} />
            <InsightRow label={t('payoffEstimate')} value={payoffMonths === null ? t('unavailable') : `${payoffMonths} ${t('months')}`} />
          </aside>
        </section>

        <PayoffStrategiesPanel
          locale={locale}
          dir={dir}
          t={t}
          money={money}
          snowball={snowballResult}
          avalanche={avalancheResult}
          extraPaymentAmount={extraPaymentAmount}
          setExtraPaymentAmount={setExtraPaymentAmount}
        />

        {payments.length > 0 && (
          <section className="payments-panel">
            <div className="debts-section-head">
              <div>
                <span>{t('recordPayment')}</span>
                <h2>{t('monthlyInstallments')}</h2>
              </div>
            </div>
            <div className="payments-list">
              {payments.slice(0, 8).map(payment => {
                const debt = debts.find(item => item.id === payment.debt_id);
                return (
                  <div className="payment-row" key={payment.id}>
                    <span>{debt?.name ?? t('unavailable')}</span>
                    <b dir="ltr">{money(payment.amount, debt?.currency || baseCurrency || 'KWD')}</b>
                    <small>{formatDate(payment.payment_date, locale)}</small>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {formOpen && (
        <div
          className="debt-modal-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) resetForm();
          }}
        >
          <form
            ref={modalRef}
            className="debt-modal"
            onSubmit={saveDebt}
            dir={dir}
            role="dialog"
            aria-modal="true"
            aria-labelledby="debt-modal-title"
            aria-describedby="debt-modal-description"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="debt-modal-head">
              <div>
                <span>THE SFM</span>
                <h2 id="debt-modal-title">{form.id ? t('editDebt') : t('addDebt')}</h2>
                <p id="debt-modal-description">{t('modalSubtitle')}</p>
              </div>
              <button type="button" onClick={resetForm} aria-label={t('cancel')}><X size={18} /></button>
            </div>
            {error && (
              <div className="debt-save-alert" role="alert">
                <AlertTriangle size={18} />
                <div>
                  <strong>{t('saveErrorTitle')}</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}
            {visibleValidationKeys.length > 0 && (
              <div className="debt-validation-panel">
                <AlertTriangle size={18} />
                <div>
                  <strong>{t('completeRequired')}</strong>
                  <ul>
                    {visibleValidationKeys.map(key => <li key={key}>{t(key)}</li>)}
                  </ul>
                </div>
              </div>
            )}
            <div className="debt-form-grid">
              <FormSectionTitle title={t('sectionDebtData')} />
              <DebtInput required invalid={submitAttempted && validationKeys.includes('validationName')} label={t('name')} value={form.name} placeholder={t('namePlaceholder')} onChange={value => setForm(current => ({ ...current, name: value }))} />
              <DebtInput required invalid={submitAttempted && validationKeys.includes('validationCreditor')} label={t('creditor')} value={form.creditorName} placeholder={t('creditorPlaceholder')} onChange={value => setForm(current => ({ ...current, creditorName: value }))} />
              <MoneyInput required invalid={submitAttempted && validationKeys.includes('validationOriginalAmount')} label={t('originalAmount')} currency={form.currency} value={form.originalAmount} onChange={value => setForm(current => ({ ...current, originalAmount: value, remainingAmount: current.remainingAmount || value }))} />
              <MoneyInput required invalid={submitAttempted && validationKeys.includes('validationRemainingAmount')} label={t('remainingAmount')} currency={form.currency} value={form.remainingAmount} onChange={value => setForm(current => ({ ...current, remainingAmount: value }))} />
              <label className={`debt-field ${submitAttempted && validationKeys.includes('validationCurrency') ? 'invalid' : ''}`} data-invalid={submitAttempted && validationKeys.includes('validationCurrency') ? 'true' : undefined}>
                <span>{t('currency')} <i>*</i></span>
                <select value={form.currency} onChange={event => setForm(current => ({ ...current, currency: event.target.value }))}>
                  {SUPPORTED_CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}
                </select>
              </label>
              <DebtInput
                required
                invalid={submitAttempted && validationKeys.includes('validationStartDate')}
                type="date"
                label={t('startDate')}
                value={form.startDate}
                onChange={value => setForm(current => ({
                  ...current,
                  startDate: value,
                  firstPaymentDate: current.id ? current.firstPaymentDate : deriveFirstPaymentDate(value, current.paymentDay),
                }))}
              />
              <DebtInput
                required
                invalid={submitAttempted && validationKeys.includes('validationFirstPaymentDate')}
                type="date"
                label={t('firstPaymentDate')}
                helper={t('firstPaymentDateHelp')}
                value={form.firstPaymentDate}
                onChange={value => setForm(current => ({ ...current, firstPaymentDate: value }))}
              />
              <FormSectionTitle title={t('sectionPaymentDetails')} />
              <MoneyInput required invalid={submitAttempted && validationKeys.includes('validationMonthlyPayment')} label={t('monthlyPayment')} currency={form.currency} value={form.monthlyPayment} onChange={value => setForm(current => ({ ...current, monthlyPayment: value }))} />
              <SuffixInput
                required
                invalid={submitAttempted && validationKeys.includes('validationPaymentDay')}
                label={t('paymentDay')}
                suffix="1 - 31"
                value={form.paymentDay}
                onChange={value => setForm(current => ({
                  ...current,
                  paymentDay: value,
                  firstPaymentDate: current.id ? current.firstPaymentDate : deriveFirstPaymentDate(current.startDate, value),
                }))}
              />
              <FormSectionTitle title={t('sectionInterest')} />
              <SuffixInput invalid={submitAttempted && validationKeys.includes('validationInterestRate')} label={t('interestRate')} suffix="%" value={form.interestRate} onChange={value => setForm(current => ({ ...current, interestRate: value }))} />
              <label className="debt-field">
                <span>{t('interestType')}</span>
                <select value={form.interestType} onChange={event => setForm(current => ({ ...current, interestType: event.target.value as InterestType }))}>
                  <option value="none">{t('noInterest')}</option>
                  <option value="annual">{t('annualInterest')}</option>
                  <option value="monthly">{t('monthlyInterest')}</option>
                </select>
              </label>
              <FormSectionTitle title={t('sectionSettings')} />
              <label className="debt-field wide toggle-row">
                <span>{t('autoExpense')} <small>{t('autoExpenseHelper')}</small></span>
                <button type="button" aria-pressed={form.autoAddToExpenses} onClick={() => setForm(current => ({ ...current, autoAddToExpenses: !current.autoAddToExpenses }))}>
                  {form.autoAddToExpenses ? t('yes') : t('no')}
                </button>
              </label>
              <label className="debt-field wide">
                <span>{t('notes')}</span>
                <textarea value={form.notes} rows={3} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            {!formIsValid && <p className="debt-form-helper">{t('completeRequired')}</p>}
            <div className="debt-modal-actions">
              <button type="button" className="debt-secondary-action" onClick={resetForm}>{t('cancel')}</button>
              <button type="submit" className="debts-primary" disabled={saving} aria-disabled={saving || !formIsValid}>{saving ? t('saving') : t('save')}</button>
            </div>
          </form>
        </div>
      )}
      <DebtStyles />
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="debt-summary-card">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong dir="ltr">{value}</strong>
      </div>
    </article>
  );
}

function DebtMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`debt-metric${highlight ? ' debt-metric--highlight' : ''}`}>
      <span>{label}</span>
      <b dir="auto">{value}</b>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="insight-row">
      <span>{label}</span>
      <b dir="auto">{value}</b>
    </div>
  );
}

function FormSectionTitle({ title }: { title: string }) {
  return <div className="debt-form-section"><span>{title}</span></div>;
}

function RequiredMark({ required }: { required?: boolean }) {
  return required ? <i>*</i> : null;
}

function DebtInput({ label, value, onChange, type = 'text', placeholder, helper, required, invalid = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; helper?: string; required?: boolean; invalid?: boolean }) {
  return (
    <label className={`debt-field ${invalid ? 'invalid' : ''}`} data-invalid={invalid ? 'true' : undefined}>
      <span>{label} <RequiredMark required={required} />{helper ? <small>{helper}</small> : null}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function MoneyInput({ label, currency, value, onChange, required, invalid = false }: { label: string; currency: string; value: string; onChange: (value: string) => void; required?: boolean; invalid?: boolean }) {
  return (
    <label className={`debt-field ${invalid ? 'invalid' : ''}`} data-invalid={invalid ? 'true' : undefined}>
      <span>{label} <RequiredMark required={required} /></span>
      <div className="affix-input">
        <em dir="ltr">{currency}</em>
        <input inputMode="decimal" dir="ltr" value={value} onChange={event => onChange(cleanNumericInput(event.target.value))} />
      </div>
    </label>
  );
}

function SuffixInput({ label, suffix, value, onChange, required, invalid = false }: { label: string; suffix: string; value: string; onChange: (value: string) => void; required?: boolean; invalid?: boolean }) {
  return (
    <label className={`debt-field ${invalid ? 'invalid' : ''}`} data-invalid={invalid ? 'true' : undefined}>
      <span>{label} <RequiredMark required={required} /></span>
      <div className="affix-input">
        <input inputMode="decimal" dir="ltr" value={value} onChange={event => onChange(cleanNumericInput(event.target.value))} />
        <em dir="ltr">{suffix}</em>
      </div>
    </label>
  );
}


function PayoffStrategiesPanel({
  locale, dir, t, money, snowball, avalanche, extraPaymentAmount, setExtraPaymentAmount,
}: {
  locale: Lang;
  dir: string;
  t: (key: keyof typeof TEXT) => string;
  money: (value: unknown, currency?: string) => string;
  snowball: StrategyResult;
  avalanche: StrategyResult;
  extraPaymentAmount: string;
  setExtraPaymentAmount: (v: string) => void;
}) {
  if (!snowball && !avalanche) {
    return null;
  }

  const interestSaved =
    snowball && avalanche ? Math.max(0, snowball.totalInterest - avalanche.totalInterest) : 0;
  const monthDiff =
    snowball && avalanche ? snowball.totalMonths - avalanche.totalMonths : 0;

  function monthsLabel(n: number) {
    return `${n} ${t('months')}`;
  }

  return (
    <section className="strategy-panel" dir={dir}>
      <div className="strategy-panel-head">
        <div>
          <span className="debts-eyebrow"><TrendingDown size={16} /> THE SFM</span>
          <h2>{t('payoffStrategies')}</h2>
          <p>{t('payoffStrategiesBody')}</p>
        </div>
        <label className="strategy-extra-input">
          <span>{t('extraPaymentLabel')}</span>
          <div className="affix-input">
            <input
              type="number"
              min="0"
              step="any"
              dir="ltr"
              value={extraPaymentAmount}
              onChange={e => setExtraPaymentAmount(e.target.value)}
              placeholder={t('extraPaymentPlaceholder')}
            />
          </div>
        </label>
      </div>

      <div className="strategy-cols">
        {/* ── SNOWBALL ── */}
        <div className="strategy-card snowball">
          <div className="strategy-card-head">
            <span className="strategy-badge snowball-badge">
              <Snowflake size={14} /> {t('snowballTitle')}
            </span>
            <span className="strategy-tag">{t('bestMomentum')}</span>
          </div>
          <p className="strategy-desc">{t('snowballDesc')}</p>
          {snowball && (
            <>
              <div className="strategy-stats">
                <div className="strategy-stat">
                  <small>{t('payoffInMonths')}</small>
                  <strong>{monthsLabel(snowball.totalMonths)}</strong>
                </div>
                <div className="strategy-stat">
                  <small>{t('totalInterestLabel')}</small>
                  <strong dir="ltr">{money(snowball.totalInterest)}</strong>
                </div>
              </div>
              <div className="strategy-order-label">{t('debtOrderLabel')}</div>
              <ol className="strategy-order">
                {snowball.order.map((entry, i) => (
                  <li key={entry.debt.id}>
                    <span className="strategy-rank">{i + 1}</span>
                    <span className="strategy-debt-name">{entry.debt.name}</span>
                    <span className="strategy-debt-detail">
                      <b dir="ltr">{money(entry.debt.remaining_amount, entry.debt.currency)}</b>
                      <small>{t('payoffMonth')} {entry.payoffMonth}</small>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        {/* ── AVALANCHE ── */}
        <div className="strategy-card avalanche">
          <div className="strategy-card-head">
            <span className="strategy-badge avalanche-badge">
              <Zap size={14} /> {t('avalancheTitle')}
            </span>
            <span className="strategy-tag recommended">{t('recommended')}</span>
          </div>
          <p className="strategy-desc">{t('avalancheDesc')}</p>
          {avalanche && (
            <>
              <div className="strategy-stats">
                <div className="strategy-stat">
                  <small>{t('payoffInMonths')}</small>
                  <strong>{monthsLabel(avalanche.totalMonths)}</strong>
                </div>
                <div className="strategy-stat">
                  <small>{t('totalInterestLabel')}</small>
                  <strong dir="ltr">{money(avalanche.totalInterest)}</strong>
                </div>
                {interestSaved > 0.01 && (
                  <div className="strategy-stat highlight">
                    <small>{t('interestSaved')}</small>
                    <strong dir="ltr" className="green">+{money(interestSaved)}</strong>
                  </div>
                )}
                {monthDiff !== 0 && (
                  <div className="strategy-stat highlight">
                    <small>{monthDiff > 0 ? t('fastestMethod') : t('fastestMethod')}</small>
                    <strong className="green">
                      {Math.abs(monthDiff)} {t('months')} {monthDiff > 0 ? '⬇' : '⬆'}
                    </strong>
                  </div>
                )}
              </div>
              <div className="strategy-order-label">{t('debtOrderLabel')}</div>
              <ol className="strategy-order">
                {avalanche.order.map((entry, i) => (
                  <li key={entry.debt.id}>
                    <span className="strategy-rank">{i + 1}</span>
                    <span className="strategy-debt-name">{entry.debt.name}</span>
                    <span className="strategy-debt-detail">
                      <b dir="ltr">{money(entry.debt.remaining_amount, entry.debt.currency)}</b>
                      <small>
                        {toNumber(entry.debt.interest_rate).toFixed(1)}%
                        {' · '}
                        {t('payoffMonth')} {entry.payoffMonth}
                      </small>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      {/* Comparison banner */}
      {snowball && avalanche && interestSaved > 0.01 && (
        <div className="strategy-banner">
          <Target size={18} />
          <span>
            {locale === 'ar'
              ? `طريقة الانهيار الجليدي توفر لك ${money(interestSaved)} من الفائدة${monthDiff > 0 ? ` وتنهي ديونك أسرع بـ ${monthDiff} شهر` : ''}.`
              : locale === 'fr'
              ? `La méthode avalanche vous fait économiser ${money(interestSaved)} d'intérêts${monthDiff > 0 ? ` et rembourse vos dettes ${monthDiff} mois plus tôt` : ''}.`
              : `The avalanche method saves you ${money(interestSaved)} in interest${monthDiff > 0 ? ` and pays off your debts ${monthDiff} month${monthDiff !== 1 ? 's' : ''} faster` : ''}.`}
          </span>
        </div>
      )}
    </section>
  );
}

function DebtStyles() {
  return (
    <style jsx global>{`
      .debts-shell {
        min-height: 100dvh;
        background:
          radial-gradient(circle at top left, rgba(47, 214, 192, .10), transparent 34%),
          var(--sfm-light-card);
        color: var(--sfm-foreground);
        font-family: Tajawal, Arial, sans-serif;
        overflow-x: hidden;
      }

      .debts-main {
        width: calc(100% - var(--sidebar-w, 230px));
        margin-inline-start: var(--sidebar-w, 230px);
        padding: 24px;
        display: grid;
        gap: 22px;
        box-sizing: border-box;
      }

      .debts-main > * {
        width: 100%;
        max-width: 1500px;
        margin-inline: auto;
        min-width: 0;
      }

      .debts-hero {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        border: 1px solid rgba(167, 243, 240, .24);
        border-radius: 30px;
        padding: clamp(22px, 3vw, 34px);
        color: #fff;
        background: linear-gradient(135deg, var(--sfm-foreground) 0%, var(--sfm-primary-dark) 58%, var(--sfm-soft-cyan) 145%);
        box-shadow: 0 22px 60px rgba(3, 18, 37, .14);
      }

      .debts-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(167, 243, 240, .28);
        background: rgba(167, 243, 240, .12);
        color: var(--sfm-soft-cyan);
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 950;
        margin-bottom: 14px;
      }

      .debts-hero h1 {
        margin: 0 0 10px;
        font-size: clamp(34px, 5vw, 58px);
        line-height: 1;
        font-weight: 950;
      }

      .debts-hero p {
        margin: 0;
        max-width: 760px;
        color: rgba(255, 255, 255, .74);
        font-size: 15px;
        font-weight: 800;
        line-height: 1.8;
      }

      .debts-hero-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        flex-wrap: wrap;
        flex-shrink: 0;
      }

      .debts-primary,
      .debts-section-head button,
      .debts-secondary-hero {
        border: 0;
        border-radius: 999px;
        min-height: 46px;
        padding: 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #fff;
        font: 950 13px Tajawal, Arial, sans-serif;
        cursor: pointer;
        box-shadow: 0 12px 28px rgba(29, 140, 255, .22);
        transition: transform .18s ease, box-shadow .18s ease, filter .18s ease, background .18s ease;
      }

      .debts-secondary-hero {
        border: 1px solid rgba(167, 243, 240, .26);
        background: rgba(255, 255, 255, .10);
        color: rgba(255, 255, 255, .92);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08);
      }

      .debts-primary:hover,
      .debts-section-head button:hover,
      .debts-secondary-hero:hover {
        transform: translateY(-1px);
        filter: saturate(1.08);
        box-shadow: 0 16px 34px rgba(29, 140, 255, .30);
      }

      .debts-primary:active,
      .debts-section-head button:active,
      .debts-secondary-hero:active {
        transform: translateY(0) scale(.99);
      }

      .debts-secondary-hero:disabled {
        cursor: not-allowed;
        opacity: .7;
        filter: none;
        transform: none;
      }

      .spin {
        animation: debt-spin .9s linear infinite;
      }

      @keyframes debt-spin {
        to { transform: rotate(360deg); }
      }

      .debts-notice,
      .payments-panel,
      .debts-list-panel,
      .debts-insight,
      .debt-summary-card,
      .debt-card,
      .debt-modal,
      .debts-empty {
        border: 1px solid rgba(47, 214, 192, .16);
        background:
          linear-gradient(135deg, rgba(255, 255, 255, .82), rgba(234, 246, 255, .64)),
          var(--sfm-card);
        box-shadow: 0 16px 42px rgba(3, 18, 37, .07);
      }

      .debts-notice {
        border-radius: 22px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #047857;
        font-weight: 900;
      }

      .debts-notice.error {
        color: #b91c1c;
        border-color: rgba(239, 68, 68, .22);
        background: rgba(239, 68, 68, .08);
      }

      .debts-summary-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 14px;
      }

      .debt-summary-card {
        min-height: 118px;
        border-radius: 26px;
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .debt-summary-card > span,
      .debt-card-top + .debt-progress + .debt-metrics + .debt-warning svg {
        flex: 0 0 auto;
      }

      .debt-summary-card > span {
        width: 42px;
        height: 42px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        color: var(--sfm-soft-cyan);
        background: rgba(47, 214, 192, .12);
        border: 1px solid rgba(47, 214, 192, .20);
      }

      .debt-summary-card small,
      .debt-metric span,
      .insight-row span,
      .payment-row small {
        display: block;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 900;
        line-height: 1.45;
      }

      .debt-summary-card strong {
        display: block;
        margin-top: 7px;
        color: var(--sfm-foreground);
        font-size: clamp(18px, 2vw, 24px);
        font-weight: 950;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }

      .debts-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 370px;
        gap: 18px;
        align-items: start;
      }

      .debts-list-panel,
      .debts-insight,
      .payments-panel {
        border-radius: 30px;
        padding: 20px;
        min-width: 0;
      }

      .debts-section-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: center;
        margin-bottom: 16px;
      }

      .debts-section-head.compact {
        margin-bottom: 10px;
      }

      .debts-section-head span {
        display: block;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 950;
        margin-bottom: 5px;
      }

      .debts-section-head h2 {
        margin: 0;
        color: var(--sfm-foreground);
        font-size: 20px;
        font-weight: 950;
      }

      .debt-card-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }

      .debt-card {
        border-radius: 26px;
        padding: 16px;
        display: grid;
        gap: 14px;
        min-width: 0;
      }

      .debt-card-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }

      .debt-card h3 {
        margin: 0 0 4px;
        color: var(--sfm-foreground);
        font-size: 18px;
        font-weight: 950;
        line-height: 1.35;
      }

      .debt-card p {
        margin: 0;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
      }

      .debt-status,
      .debt-due {
        width: max-content;
        border-radius: 999px;
        border: 1px solid rgba(47, 214, 192, .24);
        background: rgba(47, 214, 192, .12);
        color: #0f766e;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 950;
        white-space: nowrap;
      }

      .debt-status.paused {
        color: #92400e;
        background: rgba(245, 158, 11, .12);
        border-color: rgba(245, 158, 11, .24);
      }

      .debt-status.paid {
        color: #047857;
        background: #ccfbf1;
      }

      .debt-progress {
        display: grid;
        gap: 8px;
      }

      .debt-progress span {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 900;
      }

      .debt-progress strong {
        color: var(--sfm-foreground);
      }

      .debt-progress i {
        height: 10px;
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid rgba(47, 214, 192, .14);
        background: rgba(148, 163, 184, .14);
      }

      .debt-progress i b {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
      }

      .debt-metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
      }

      .debt-metric {
        min-width: 0;
        border: 1px solid rgba(47, 214, 192, .12);
        border-radius: 16px;
        background: var(--sfm-light-card);
        padding: 10px;
        display: grid;
        gap: 6px;
      }

      .debt-metric b,
      .insight-row b,
      .payment-row b {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .debt-warning,
      .debt-due {
        display: inline-flex;
        align-items: flex-start;
        gap: 8px;
        color: #92400e;
        background: rgba(245, 158, 11, .12);
        border: 1px solid rgba(245, 158, 11, .24);
        border-radius: 16px;
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 900;
        line-height: 1.6;
      }

      .debt-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .debt-actions button,
      .debt-modal-actions button {
        min-height: 38px;
        border: 1px solid rgba(47, 214, 192, .20);
        border-radius: 999px;
        background: rgba(47, 214, 192, .08);
        color: var(--sfm-primary-hover);
        padding: 0 12px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font: 900 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
      }

      .debt-actions .danger {
        color: #dc2626;
        background: rgba(220, 38, 38, .08);
        border-color: rgba(220, 38, 38, .18);
      }

      .debts-insight {
        position: sticky;
        top: 18px;
        display: grid;
        gap: 12px;
      }

      .insight-row,
      .payment-row {
        border: 1px solid rgba(47, 214, 192, .12);
        border-radius: 18px;
        background: var(--sfm-light-card);
        padding: 12px;
        display: grid;
        gap: 6px;
      }

      .insight-copy,
      .insight-alert {
        margin: 0;
        border-radius: 18px;
        padding: 12px;
        color: var(--sfm-muted);
        background: rgba(47, 214, 192, .08);
        border: 1px solid rgba(47, 214, 192, .15);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.75;
      }

      .insight-alert {
        color: #92400e;
        background: rgba(245, 158, 11, .12);
        border-color: rgba(245, 158, 11, .24);
      }

      .payments-list {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }

      .payment-row span {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .debts-empty,
      .debts-loading {
        border-radius: 28px;
        padding: 32px;
        display: grid;
        justify-items: center;
        gap: 12px;
        text-align: center;
        color: var(--sfm-muted);
        font-weight: 850;
        line-height: 1.8;
      }

      .debts-empty svg {
        color: var(--sfm-soft-cyan);
      }

      .debts-empty h1,
      .debts-empty h2 {
        margin: 0;
        color: var(--sfm-foreground);
        font-weight: 950;
      }

      .debts-empty p {
        margin: 0;
        max-width: 640px;
      }

      .debt-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 240;
        display: flex;
        align-items: center;
        justify-content: center;
        background:
          radial-gradient(circle at 50% 20%, rgba(47, 214, 192, .16), transparent 32%),
          rgba(3, 18, 37, .58);
        backdrop-filter: blur(12px);
        padding: clamp(14px, 3vw, 28px);
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .debt-modal {
        width: min(860px, 100%);
        max-height: min(90dvh, 940px);
        overflow-y: auto;
        border-radius: 32px;
        padding: clamp(18px, 2.5vw, 28px);
        margin: auto;
        outline: none;
        box-shadow: 0 30px 90px rgba(3, 18, 37, .32);
        scrollbar-gutter: stable;
      }

      .debt-modal-head {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: flex-start;
        margin-bottom: 18px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(47, 214, 192, .16);
      }

      .debt-modal-head span {
        display: inline-flex;
        width: max-content;
        border: 1px solid rgba(47, 214, 192, .18);
        border-radius: 999px;
        background: rgba(47, 214, 192, .10);
        color: var(--sfm-primary-hover);
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 950;
      }

      .debt-modal-head h2 {
        margin: 10px 0 0;
        color: var(--sfm-foreground);
        font-size: clamp(24px, 3vw, 32px);
        font-weight: 950;
        line-height: 1.15;
      }

      .debt-modal-head p {
        margin: 8px 0 0;
        max-width: 560px;
        color: var(--sfm-muted-readable, #475569);
        font-size: 14px;
        font-weight: 850;
        line-height: 1.7;
      }

      .debt-modal-head > button {
        width: 44px;
        height: 44px;
        border: 1px solid rgba(29, 140, 255, .18);
        border-radius: 16px;
        background: rgba(255, 255, 255, .76);
        color: var(--sfm-foreground);
        cursor: pointer;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .35);
        transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease;
      }

      .debt-modal-head > button:hover {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .32);
        box-shadow: 0 12px 26px rgba(3, 18, 37, .10);
      }

      .debt-modal-head > button:active {
        transform: translateY(1px);
      }

      .debt-validation-panel {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        border: 1px solid rgba(245, 158, 11, .28);
        border-radius: 20px;
        background: rgba(245, 158, 11, .10);
        color: #92400e;
        padding: 13px;
        margin-bottom: 16px;
      }

      .debt-save-alert {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        border: 1px solid rgba(220, 38, 38, .24);
        border-radius: 20px;
        background: rgba(220, 38, 38, .08);
        color: #b91c1c;
        padding: 14px;
        margin-bottom: 16px;
      }

      .debt-save-alert svg {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .debt-save-alert strong {
        display: block;
        color: #991b1b;
        font-size: 13px;
        font-weight: 950;
      }

      .debt-save-alert p {
        margin: 6px 0 0;
        color: #7f1d1d;
        font-size: 13px;
        font-weight: 850;
        line-height: 1.7;
      }

      .debt-validation-panel svg {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .debt-validation-panel strong {
        display: block;
        font-size: 13px;
        font-weight: 950;
      }

      .debt-validation-panel ul {
        margin: 8px 0 0;
        padding-inline-start: 18px;
        display: grid;
        gap: 4px;
        color: #78350f;
        font-size: 12px;
        font-weight: 800;
      }

      .debt-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .debt-form-section {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 6px;
      }

      .debt-form-section:first-child {
        margin-top: 0;
      }

      .debt-form-section::after {
        content: "";
        height: 1px;
        flex: 1;
        background: linear-gradient(90deg, rgba(47, 214, 192, .32), rgba(148, 163, 184, .10));
      }

      .debt-form-section span {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .debt-field {
        display: grid;
        gap: 9px;
        min-width: 0;
      }

      .debt-field.wide {
        grid-column: 1 / -1;
      }

      .debt-field > span {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .debt-field > span i {
        color: #dc2626;
        font-style: normal;
        margin-inline-start: 2px;
      }

      .debt-field > span small {
        display: block;
        margin-top: 5px;
        color: var(--sfm-muted-readable, #475569);
        font-size: 11px;
        font-weight: 850;
        line-height: 1.6;
      }

      .debt-field input,
      .debt-field select,
      .debt-field textarea,
      .affix-input {
        width: 100%;
        min-width: 0;
        min-height: 52px;
        border: 1.5px solid rgba(15, 118, 110, .22);
        border-radius: 18px;
        background: rgba(255, 255, 255, .92);
        color: var(--sfm-foreground);
        padding: 0 14px;
        font: 900 14px Tajawal, Arial, sans-serif;
        outline: none;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .55);
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
      }

      .debt-field input::placeholder,
      .debt-field textarea::placeholder {
        color: #64748b;
        opacity: 1;
      }

      .debt-field textarea {
        min-height: 104px;
        padding-block: 13px;
        resize: vertical;
      }

      .debt-field input:focus,
      .debt-field select:focus,
      .debt-field textarea:focus,
      .affix-input:focus-within {
        border-color: var(--sfm-soft-cyan);
        box-shadow: 0 0 0 4px rgba(47, 214, 192, .16), inset 0 1px 0 rgba(255, 255, 255, .55);
        background: #fff;
      }

      .debt-field.invalid input,
      .debt-field.invalid select,
      .debt-field.invalid textarea,
      .debt-field.invalid .affix-input {
        border-color: rgba(220, 38, 38, .58);
        box-shadow: 0 0 0 4px rgba(220, 38, 38, .10);
      }

      .affix-input {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-inline: 9px;
        direction: ltr;
      }

      .affix-input em {
        min-width: 58px;
        min-height: 36px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(29, 140, 255, .12), rgba(47, 214, 192, .18));
        color: #0f766e;
        border: 1px solid rgba(15, 118, 110, .16);
        font-style: normal;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: .02em;
      }

      .affix-input input {
        border: 0;
        box-shadow: none;
        background: transparent;
        padding-inline: 6px;
        min-height: 42px;
        text-align: start;
      }

      .affix-input input:focus {
        box-shadow: none;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border: 1.5px solid rgba(15, 118, 110, .18);
        border-radius: 18px;
        background: rgba(236, 254, 255, .44);
        padding: 14px;
      }

      .toggle-row button {
        border: 1px solid rgba(47, 214, 192, .22);
        border-radius: 999px;
        background: rgba(47, 214, 192, .12);
        color: var(--sfm-primary-hover);
        padding: 8px 14px;
        font: 950 12px Tajawal, Arial, sans-serif;
        cursor: pointer;
      }

      .toggle-row button[aria-pressed="true"] {
        background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
        color: #fff;
      }

      .debt-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 22px;
        padding-top: 16px;
        border-top: 1px solid rgba(47, 214, 192, .16);
        flex-wrap: wrap;
      }

      .debt-modal-actions .debts-primary {
        border: 0;
        color: #fff;
        width: auto;
        min-width: 190px;
        min-height: 50px;
        font-size: 14px;
        box-shadow: 0 16px 36px rgba(29, 140, 255, .30);
      }

      .debt-modal-actions .debts-primary:disabled,
      .debt-modal-actions .debts-primary[aria-disabled="true"] {
        background: rgba(15, 23, 42, .08);
        border: 1px solid rgba(15, 23, 42, .12);
        color: #475569;
        box-shadow: none;
        cursor: not-allowed;
        filter: none;
        transform: none;
        opacity: .78;
      }

      .debt-secondary-action {
        min-height: 50px;
        border: 1px solid rgba(47, 214, 192, .22);
        border-radius: 999px;
        background: rgba(255, 255, 255, .86);
        color: var(--sfm-foreground);
        padding: 0 20px;
        font: 950 13px Tajawal, Arial, sans-serif;
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, transform .18s ease;
      }

      .debt-secondary-action:hover {
        background: rgba(47, 214, 192, .10);
        border-color: rgba(47, 214, 192, .35);
      }

      .debt-secondary-action:active {
        transform: translateY(1px);
      }

      .debt-modal-head > button:focus-visible,
      .debt-modal-actions button:focus-visible,
      .debts-secondary-hero:focus-visible,
      .toggle-row button:focus-visible {
        outline: none;
        border-color: var(--sfm-soft-cyan);
        box-shadow: 0 0 0 4px rgba(47, 214, 192, .16);
      }

      .debt-form-helper {
        margin: 14px 0 0;
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 850;
      }

      .dark .debts-shell {
        background:
          radial-gradient(circle at top left, rgba(47, 214, 192, .08), transparent 34%),
          #0a1422;
      }

      .dark .debt-modal-backdrop {
        background:
          radial-gradient(circle at 50% 20%, rgba(47, 214, 192, .10), transparent 34%),
          rgba(2, 8, 23, .74);
      }

      .dark .debts-notice,
      .dark .payments-panel,
      .dark .debts-list-panel,
      .dark .debts-insight,
      .dark .debt-summary-card,
      .dark .debt-card,
      .dark .debt-modal,
      .dark .debts-empty {
        background:
          linear-gradient(135deg, rgba(29, 140, 255, .08), rgba(47, 214, 192, .07)),
          #0f1d31;
        border-color: #1d3050;
        box-shadow: 0 16px 42px rgba(0, 0, 0, .25);
      }

      .dark .debt-modal {
        box-shadow: 0 32px 95px rgba(0, 0, 0, .52);
      }

      .dark .debt-modal-head {
        border-bottom-color: #1d3050;
      }

      .dark .debt-modal-head span {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
        color: #2fd6c0;
      }

      .dark .debt-modal-head p,
      .dark .debt-field > span small,
      .dark .debt-form-helper {
        color: #b8c7d9;
      }

      .dark .debt-metric,
      .dark .insight-row,
      .dark .payment-row,
      .dark .debt-field input,
      .dark .debt-field select,
      .dark .debt-field textarea,
      .dark .affix-input,
      .dark .toggle-row,
      .dark .debt-modal-head > button {
        background: #0a1422;
        border-color: #1d3050;
      }

      .dark .debt-field input,
      .dark .debt-field select,
      .dark .debt-field textarea,
      .dark .affix-input {
        color: #e8eef6;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
      }

      .dark .debt-field input::placeholder,
      .dark .debt-field textarea::placeholder {
        color: #8ea6c3;
      }

      .dark .debt-field > span,
      .dark .debt-form-section span,
      .dark .debt-modal-head h2 {
        color: #e8eef6;
      }

      .dark .debt-field input:focus,
      .dark .debt-field select:focus,
      .dark .debt-field textarea:focus,
      .dark .affix-input:focus-within {
        background: #0f1d31;
        border-color: #2fd6c0;
        box-shadow: 0 0 0 4px rgba(47, 214, 192, .14), inset 0 1px 0 rgba(255, 255, 255, .04);
      }

      .dark .debt-field.invalid input,
      .dark .debt-field.invalid select,
      .dark .debt-field.invalid textarea,
      .dark .debt-field.invalid .affix-input {
        border-color: rgba(255, 91, 110, .64);
        box-shadow: 0 0 0 4px rgba(255, 91, 110, .12);
      }

      .dark .affix-input em {
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
        color: #2fd6c0;
      }

      .dark .toggle-row {
        background: #13243a;
      }

      .dark .debt-status.active,
      .dark .debt-status.paid {
        color: #2fd6c0;
        background: rgba(47, 214, 192, .12);
        border-color: rgba(47, 214, 192, .25);
      }

      .dark .debt-warning,
      .dark .debt-due,
      .dark .insight-alert {
        color: #f5b942;
        background: rgba(245, 185, 66, .12);
        border-color: rgba(245, 185, 66, .25);
      }

      .dark .debt-validation-panel {
        background: rgba(245, 185, 66, .12);
        border-color: rgba(245, 185, 66, .25);
        color: #f8d47a;
      }

      .dark .debt-validation-panel ul {
        color: #f5b942;
      }

      .dark .debt-save-alert {
        background: rgba(255, 91, 110, .12);
        border-color: rgba(255, 91, 110, .28);
        color: #ffb4bd;
      }

      .dark .debt-save-alert strong {
        color: #ffb4bd;
      }

      .dark .debt-save-alert p {
        color: #ffd7dc;
      }

      .dark .debt-modal-actions {
        border-top-color: #1d3050;
      }

      .dark .debt-modal-actions .debts-primary:disabled,
      .dark .debt-modal-actions .debts-primary[aria-disabled="true"] {
        background: rgba(19, 36, 58, .88);
        border-color: #1d3050;
        color: #b8c7d9;
      }

      .dark .debt-secondary-action {
        background: #0a1422;
        border-color: #1d3050;
        color: #e8eef6;
      }

      .dark .debt-secondary-action:hover,
      .dark .debt-modal-head > button:hover {
        background: #13243a;
        border-color: rgba(47, 214, 192, .35);
      }

      @media (max-width: 1180px) {
        .debts-summary-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .debts-layout {
          grid-template-columns: 1fr;
        }
        .debts-insight {
          position: static;
        }
        .payments-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 1024px) {
        .debts-main {
          width: 100%;
          margin-inline: 0;
          padding: calc(88px + env(safe-area-inset-top)) 16px 18px;
        }
      }

      @media (max-width: 720px) {
        .debts-hero {
          display: grid;
          border-radius: 24px;
        }
        .debts-primary,
        .debts-secondary-hero,
        .debts-section-head button {
          width: 100%;
        }
        .debts-summary-grid,
        .debt-card-grid,
        .payments-list,
        .debt-form-grid {
          grid-template-columns: 1fr;
        }
        .debt-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .debts-section-head {
          display: grid;
        }
        .debt-modal-backdrop {
          align-items: end;
          padding: 10px;
        }
        .debt-modal {
          width: 100%;
          max-height: calc(100dvh - 20px);
          overflow-y: auto;
          border-radius: 26px;
          padding: 18px;
        }
        .debt-modal-head {
          gap: 12px;
        }
        .debt-modal-head > button {
          width: 42px;
          height: 42px;
        }
        .toggle-row {
          display: grid;
        }
        .toggle-row button {
          width: 100%;
          min-height: 42px;
        }
        .debt-modal-actions {
          display: grid;
        }
        .debt-modal-actions .debts-primary,
        .debt-secondary-action {
          width: 100%;
        }
      }

      @media (max-width: 430px) {
        .debt-metrics {
          grid-template-columns: 1fr;
        }
        .debt-actions button {
          flex: 1 1 100%;
          justify-content: center;
        }
      }

      /* ─── Debt Metric Highlight ─────────────────────────────────── */
      .debt-metric--highlight {
        border-color: rgba(47, 214, 192, .30);
        background: rgba(47, 214, 192, .08);
      }
      .debt-metric--highlight b {
        color: var(--sfm-primary-hover);
      }

      /* ─── Strategy Panel ─────────────────────────────────────────── */
      .strategy-panel {
        border-radius: 30px;
        padding: 24px;
        display: grid;
        gap: 20px;
      }

      .strategy-panel-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        flex-wrap: wrap;
      }

      .strategy-panel-head h2 {
        margin: 8px 0 4px;
        color: var(--sfm-foreground);
        font-size: clamp(20px, 2.2vw, 26px);
        font-weight: 950;
        line-height: 1.2;
      }

      .strategy-panel-head p {
        margin: 0;
        max-width: 540px;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.75;
      }

      .strategy-extra-input {
        display: grid;
        gap: 7px;
        min-width: 200px;
        flex-shrink: 0;
      }

      .strategy-extra-input > span {
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 950;
      }

      .strategy-cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }

      .strategy-card {
        border-radius: 26px;
        padding: 20px;
        display: grid;
        gap: 16px;
        border: 1px solid rgba(47, 214, 192, .14);
        background: var(--sfm-light-card);
      }

      .strategy-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .strategy-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 950;
      }

      .snowball-badge {
        background: rgba(56, 189, 248, .12);
        border: 1px solid rgba(56, 189, 248, .28);
        color: #0369a1;
      }

      .avalanche-badge {
        background: rgba(168, 85, 247, .12);
        border: 1px solid rgba(168, 85, 247, .28);
        color: #7c3aed;
      }

      .strategy-tag {
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 950;
        background: rgba(148, 163, 184, .12);
        border: 1px solid rgba(148, 163, 184, .20);
        color: var(--sfm-muted);
      }

      .strategy-tag.recommended {
        background: rgba(34, 197, 94, .12);
        border-color: rgba(34, 197, 94, .28);
        color: #15803d;
      }

      .strategy-desc {
        margin: 0;
        color: var(--sfm-muted);
        font-size: 13px;
        font-weight: 850;
        line-height: 1.75;
      }

      .strategy-stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .strategy-stat {
        border-radius: 16px;
        padding: 12px;
        display: grid;
        gap: 6px;
        border: 1px solid rgba(47, 214, 192, .12);
        background: var(--sfm-canvas, #f8fafc);
      }

      .strategy-stat.highlight {
        border-color: rgba(34, 197, 94, .24);
        background: rgba(34, 197, 94, .06);
      }

      .strategy-stat small {
        display: block;
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 950;
      }

      .strategy-stat strong {
        display: block;
        color: var(--sfm-foreground);
        font-size: 15px;
        font-weight: 950;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      .strategy-stat strong.green {
        color: #15803d;
      }

      .strategy-order-label {
        color: var(--sfm-muted);
        font-size: 12px;
        font-weight: 950;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(47, 214, 192, .14);
      }

      .strategy-order {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 8px;
      }

      .strategy-order li {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 14px;
        padding: 10px 12px;
        border: 1px solid rgba(47, 214, 192, .10);
        background: var(--sfm-canvas, #f8fafc);
      }

      .strategy-rank {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 950;
        background: rgba(47, 214, 192, .14);
        color: var(--sfm-primary-hover);
        flex-shrink: 0;
      }

      .strategy-debt-name {
        flex: 1;
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .strategy-debt-detail {
        display: grid;
        gap: 2px;
        text-align: end;
        flex-shrink: 0;
      }

      .strategy-debt-detail b {
        color: var(--sfm-foreground);
        font-size: 13px;
        font-weight: 950;
      }

      .strategy-debt-detail small {
        color: var(--sfm-muted);
        font-size: 11px;
        font-weight: 850;
      }

      .strategy-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: 20px;
        padding: 14px 16px;
        background: rgba(34, 197, 94, .09);
        border: 1px solid rgba(34, 197, 94, .24);
        color: #15803d;
        font-size: 13px;
        font-weight: 900;
        line-height: 1.65;
      }

      .strategy-banner svg {
        flex-shrink: 0;
        color: #16a34a;
      }

      /* ─── Dark mode — strategy ───────────────────────────────────── */
      .dark .strategy-panel,
      .dark .strategy-card {
        border-color: rgba(47, 214, 192, .12);
        background: #0d1f35;
      }

      .dark .strategy-stat,
      .dark .strategy-order li {
        background: #07172a;
        border-color: rgba(47, 214, 192, .10);
      }

      .dark .strategy-stat.highlight {
        background: rgba(34, 197, 94, .08);
        border-color: rgba(34, 197, 94, .22);
      }

      .dark .snowball-badge {
        color: #38bdf8;
      }

      .dark .avalanche-badge {
        color: #c084fc;
      }

      .dark .strategy-tag.recommended {
        color: #4ade80;
      }

      .dark .strategy-stat strong.green,
      .dark .strategy-banner {
        color: #4ade80;
      }

      .dark .strategy-banner {
        background: rgba(34, 197, 94, .07);
        border-color: rgba(34, 197, 94, .18);
      }

      .dark .debt-metric--highlight {
        background: rgba(47, 214, 192, .10);
        border-color: rgba(47, 214, 192, .28);
      }

      /* ─── Strategy responsive ────────────────────────────────────── */
      @media (max-width: 900px) {
        .strategy-cols {
          grid-template-columns: 1fr;
        }
        .strategy-panel-head {
          flex-direction: column;
          align-items: flex-start;
        }
        .strategy-extra-input {
          width: 100%;
        }
      }
    `}</style>
  );
}
