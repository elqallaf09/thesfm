'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Edit3,
  Bot,
  Bell as BellIcon,
  Calendar,
  Camera,
  CheckCircle2,
  ChartPie,
  CreditCard,
  Download,
  Eye,
  Flag,
  Gauge,
  GraduationCap,
  HandHeart,
  Home,
  FolderKanban,
  LineChart,
  Menu,
  PiggyBank,
  Plus,
  Printer,
  Receipt,
  ReceiptText,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Target,
  TrendingUp,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Sidebar } from '@/components/Sidebar';
import { useCurrency } from '@/lib/useCurrency';
import { formatCurrency } from '@/lib/format';
import { getCurrency } from '@/lib/currencies';
import { CurrencySelect } from '@/components/CurrencySelect';
import { calculateGoalProgress, parseMoney } from '@/lib/goalProgress';

type PageKind = 'expenses' | 'income' | 'invest' | 'savings' | 'goals' | 'reports' | 'ai';
type LangText = { ar: string; en: string; fr?: string };
type TranslateFn = ReturnType<typeof useLanguage>['t'];
type MoneyItem = { id: string; name: string; amount: number; created_at?: string | null };
type IncomeSource = MoneyItem & { label?: string | null; category?: string | null };
type EntryKind = Extract<PageKind, 'expenses' | 'income' | 'invest' | 'savings'>;
type EntryFormState = { id?: string; name: string; amount: string; category: string };
type EntryRow = { id: string; title: string; subtitle: string; value: string; item?: MoneyItem | IncomeSource };
type GoalItem = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  goal_type: string;
  category: string;
  priority: string;
  funding_source: string;
  currency: string;
  ai_enabled: boolean;
  icon?: string | null;
  color?: string | null;
  deadline?: string | null;
  notes?: string | null;
  created_at?: string | null;
};
type GoalRow = {
  id: string;
  goal: string;
  amount: number | string | null;
  target_amount?: number | string | null;
  targetAmount?: number | string | null;
  current_amount?: number | string | null;
  currentAmount?: number | string | null;
  saved_amount?: number | string | null;
  savedAmount?: number | string | null;
  duration?: string | null;
  duration_unit?: string | null;
  notes?: string | null;
  created_at?: string | null;
};
type GoalFormState = {
  id: string;
  name: string;
  goalType: string;
  targetAmount: string;
  currentAmount: string;
  monthlyContribution: string;
  deadline: string;
  category: string;
  priority: string;
  fundingSource: string;
  currency: string;
  notes: string;
  aiEnabled: boolean;
};
type QueryResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type DataErrorKind = 'database' | 'permission' | 'auth' | 'unknown';
type DataLoadError = {
  page: string;
  functionName: string;
  queryName: string;
  table?: string;
  missingColumn?: string;
  message: string;
  kind: DataErrorKind;
};
type DataResult<T> = {
  data: T[];
  error: DataLoadError | null;
  source: 'database' | 'fallback';
};
type ReceiptItem = { name: string; price?: number; quantity?: number; unitPrice?: number; total?: number };
type AiExtractedData = {
  merchantName?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  subtotal?: number;
  amount?: number;
  total?: number;
  finalTotal?: number;
  currency?: string;
  taxAmount?: number;
  paidAmount?: number;
  changeAmount?: number;
  receiptDate?: string;
  date?: string;
  category?: string;
  paymentMethod?: string;
  rawText?: string;
  items?: ReceiptItem[];
  confidenceScore?: number;
  confidence?: number;
};
type SmartExpense = MoneyItem & {
  category?: string | null;
  date?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  enhanced?: Record<string, unknown> | null;
  receipt_image_url?: string | null;
  receipt_file_name?: string | null;
  ai_extracted_data?: AiExtractedData | null;
  ai_confidence_score?: number | null;
  updated_at?: string | null;
};
type ExpenseFormState = {
  id?: string;
  name: string;
  amount: string;
  category: string;
  date: string;
  paymentMethod: string;
  notes: string;
  receiptFile: File | null;
  receiptPreview: string;
  receiptImageUrl?: string | null;
  receiptFileName?: string | null;
  aiExtractedData?: AiExtractedData | null;
  aiConfidenceScore?: number | null;
};
type ExpenseModalMode = 'manual' | 'scan';
type PendingReceiptExpense = {
  id: string;
  selected: boolean;
  status: 'ready' | 'review' | 'failed';
  file: File;
  fileName: string;
  previewUrl: string;
  name: string;
  amount: string;
  date: string;
  category: string;
  paymentMethod: string;
  notes: string;
  aiConfidenceScore: number;
  aiExtractedData: AiExtractedData | null;
  error: string | null;
};

interface Snapshot {
  income: IncomeSource[];
  expenses: SmartExpense[];
  savings: MoneyItem[];
  investments: MoneyItem[];
  goals: GoalItem[];
  error: DataLoadError | null;
}

interface SectionCard {
  title: LangText;
  body: LangText;
  value?: string;
  tone: string;
}

const emptySnapshot: Snapshot = {
  income: [],
  expenses: [],
  savings: [],
  investments: [],
  goals: [],
  error: null,
};

const emptyEntryForm: EntryFormState = { name: '', amount: '', category: 'general' };
function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}
const emptyExpenseForm = (): ExpenseFormState => ({
  name: '',
  amount: '',
  category: 'other',
  date: todayInputDate(),
  paymentMethod: 'cash',
  notes: '',
  receiptFile: null,
  receiptPreview: '',
  receiptImageUrl: null,
  receiptFileName: null,
  aiExtractedData: null,
  aiConfidenceScore: null,
});
const emptyGoalForm: GoalFormState = {
  id: '',
  name: '',
  goalType: 'saving',
  targetAmount: '',
  currentAmount: '',
  monthlyContribution: '',
  deadline: '',
  category: 'general',
  priority: 'medium',
  fundingSource: 'salary',
  currency: 'KWD',
  notes: '',
  aiEnabled: true,
};
const entryTitleKeys = {
  expenses: 'expenses_entry_title',
  income: 'income_entry_title',
  invest: 'invest_entry_title',
  savings: 'savings_entry_title',
} as const;
const deleteConfirmKeys = {
  expenses: 'expenses_deleteConfirmMessage',
  income: 'income_deleteConfirmMessage',
  invest: 'invest_deleteConfirmMessage',
  savings: 'savings_deleteConfirmMessage',
} as const;

const navItems = [
  { href: '/', label: { ar: 'الرئيسية', en: 'Dashboard', fr: 'Tableau de bord' }, icon: Home },
  { href: '/expenses', label: { ar: 'المصروفات', en: 'Expenses', fr: 'Dépenses' }, icon: ReceiptText },
  { href: '/income', label: { ar: 'الدخل', en: 'Income', fr: 'Revenus' }, icon: Wallet },
  { href: '/invest', label: { ar: 'الاستثمارات', en: 'Investments', fr: 'Investissements' }, icon: TrendingUp },
  { href: '/savings', label: { ar: 'الإدخار', en: 'Savings', fr: 'Épargne' }, icon: PiggyBank },
  { href: '/goals', label: { ar: 'الأهداف', en: 'Goals', fr: 'Objectifs' }, icon: Target },
  { href: '/projects', label: { ar: 'مشاريعي', en: 'My Projects', fr: 'Mes projets' }, icon: FolderKanban },
  { href: '/reports', label: { ar: 'التقارير', en: 'Reports', fr: 'Rapports' }, icon: ChartPie },
  { href: '/ai', label: { ar: 'الذكاء المالي', en: 'AI', fr: 'IA' }, icon: Bot },
  { href: '/charity', label: { ar: 'الأعمال الخيرية', en: 'Charity', fr: 'Charité' }, icon: HandHeart },
  { href: '/notifications', label: { ar: 'الإشعارات', en: 'Notifications', fr: 'Notifications' }, icon: BellIcon },
  { href: '/profile', label: { ar: 'الملف الشخصي', en: 'Profile', fr: 'Profil' }, icon: GraduationCap },
];

const EXPENSE_CATEGORIES = [
  { id: 'restaurants', label: { ar: 'مطاعم', en: 'Restaurants', fr: 'Restaurants' } },
  { id: 'shopping', label: { ar: 'مشتريات', en: 'Shopping', fr: 'Achats' } },
  { id: 'bills', label: { ar: 'فواتير', en: 'Bills', fr: 'Factures' } },
  { id: 'transport', label: { ar: 'مواصلات', en: 'Transport', fr: 'Transport' } },
  { id: 'health', label: { ar: 'صحة', en: 'Health', fr: 'Sante' } },
  { id: 'education', label: { ar: 'تعليم', en: 'Education', fr: 'Education' } },
  { id: 'rent', label: { ar: 'إيجار', en: 'Rent', fr: 'Loyer' } },
  { id: 'loans', label: { ar: 'قروض', en: 'Loans', fr: 'Prets' } },
  { id: 'subscriptions', label: { ar: 'اشتراكات', en: 'Subscriptions', fr: 'Abonnements' } },
  { id: 'other', label: { ar: 'أخرى', en: 'Other', fr: 'Autre' } },
];

const PAYMENT_METHODS = [
  { id: 'cash', label: { ar: 'كاش', en: 'Cash', fr: 'Especes' } },
  { id: 'knet', label: { ar: 'KNET', en: 'KNET', fr: 'KNET' } },
  { id: 'card', label: { ar: 'بطاقة بنكية', en: 'Bank card', fr: 'Carte bancaire' } },
  { id: 'transfer', label: { ar: 'تحويل بنكي', en: 'Bank transfer', fr: 'Virement bancaire' } },
  { id: 'apple_pay', label: { ar: 'Apple Pay', en: 'Apple Pay', fr: 'Apple Pay' } },
  { id: 'other', label: { ar: 'أخرى', en: 'Other', fr: 'Autre' } },
];

const expenseUi = {
  manualTab: { ar: 'إدخال يدوي', en: 'Manual Entry', fr: 'Saisie manuelle' },
  scanTab: { ar: 'رفع فاتورة بالذكاء الاصطناعي', en: 'AI Receipt Scan', fr: 'Scan IA de facture' },
  addExpense: { ar: 'إضافة مصروف', en: 'Add expense', fr: 'Ajouter une depense' },
  uploadReceipt: { ar: 'رفع فاتورة', en: 'Upload receipt', fr: 'Telecharger une facture' },
  uploadOneReceipt: { ar: 'رفع فاتورة واحدة', en: 'Upload one receipt', fr: 'Importer une facture' },
  uploadMultipleReceipts: { ar: 'رفع عدة فواتير', en: 'Upload multiple receipts', fr: 'Importer plusieurs factures' },
  chooseImages: { ar: 'اختر الصور أو اسحبها هنا', en: 'Choose images or drag them here', fr: 'Choisissez des images ou glissez-les ici' },
  selectedReceipts: { ar: 'تم اختيار {count} فواتير', en: '{count} receipts selected', fr: '{count} factures sélectionnées' },
  smartTitle: { ar: 'إدارة المصروفات الذكية', en: 'Smart expense management', fr: 'Gestion intelligente des depenses' },
  smartSubtitle: { ar: 'سجل مصروفاتك يدويًا أو ارفع فاتورة ليقرأها الذكاء الاصطناعي ثم راجعها قبل الإضافة.', en: 'Add expenses manually or upload a receipt for AI extraction, then review before saving.', fr: 'Ajoutez manuellement ou telechargez une facture pour extraction IA, puis verifiez avant enregistrement.' },
  name: { ar: 'اسم المصروف', en: 'Expense name', fr: 'Nom de la depense' },
  amount: { ar: 'المبلغ', en: 'Amount', fr: 'Montant' },
  category: { ar: 'التصنيف', en: 'Category', fr: 'Categorie' },
  date: { ar: 'التاريخ', en: 'Date', fr: 'Date' },
  paymentMethod: { ar: 'طريقة الدفع', en: 'Payment method', fr: 'Mode de paiement' },
  notes: { ar: 'ملاحظات', en: 'Notes', fr: 'Notes' },
  attachReceipt: { ar: 'إرفاق صورة الفاتورة', en: 'Attach receipt image', fr: 'Joindre l image de facture' },
  uploadTitle: { ar: 'ارفع صورة الفاتورة', en: 'Upload receipt image', fr: 'Telecharger l image de la facture' },
  uploadHint: { ar: 'اسحب الصورة هنا أو اختر من الجهاز', en: 'Drag image here or choose from device', fr: 'Glissez l image ici ou choisissez un fichier' },
  analyze: { ar: 'تحليل الفاتورة بالذكاء الاصطناعي', en: 'Analyze receipt with AI', fr: 'Analyser la facture avec l IA' },
  analyzeAll: { ar: 'تحليل كل الفواتير', en: 'Analyze all receipts', fr: 'Analyser toutes les factures' },
  reading: { ar: 'جاري قراءة الفاتورة...', en: 'Reading receipt...', fr: 'Lecture de la facture...' },
  readingAll: { ar: 'جاري تحليل الفواتير...', en: 'Analyzing receipts...', fr: 'Analyse des factures...' },
  batchProgress: { ar: 'جاري تحليل {current} من {total}', en: 'Analyzing {current} of {total}', fr: 'Analyse {current} sur {total}' },
  extracted: { ar: 'تم استخراج البيانات', en: 'Data extracted successfully', fr: 'Donnees extraites avec succes' },
  review: { ar: 'راجع البيانات قبل الإضافة', en: 'Review before adding', fr: 'Verifiez avant l ajout' },
  confirmAdd: { ar: 'تأكيد وإضافة المصروف', en: 'Confirm and add expense', fr: 'Confirmer et ajouter la depense' },
  confirmAll: { ar: 'تأكيد كل المصروفات', en: 'Confirm all expenses', fr: 'Confirmer toutes les dépenses' },
  confirmSelected: { ar: 'تأكيد المحدد فقط', en: 'Confirm selected only', fr: 'Confirmer uniquement la sélection' },
  reanalyze: { ar: 'إعادة التحليل', en: 'Re-analyze', fr: 'Reanalyser' },
  reanalyzeThis: { ar: 'إعادة تحليل هذه الفاتورة', en: 'Re-analyze this receipt', fr: 'Réanalyser cette facture' },
  removeReceipt: { ar: 'حذف هذه الفاتورة', en: 'Remove this receipt', fr: 'Supprimer cette facture' },
  changeImage: { ar: 'تغيير الصورة', en: 'Change image', fr: 'Changer l image' },
  confirmOnly: { ar: 'تأكيد الإضافة', en: 'Confirm addition', fr: 'Confirmer l ajout' },
  editData: { ar: 'تعديل البيانات', en: 'Edit data', fr: 'Modifier les donnees' },
  merchant: { ar: 'المتجر', en: 'Merchant', fr: 'Commercant' },
  suggestedCategory: { ar: 'التصنيف المقترح', en: 'Suggested category', fr: 'Categorie suggeree' },
  confidence: { ar: 'الثقة', en: 'Confidence', fr: 'Confiance' },
  ready: { ar: 'جاهز للإضافة', en: 'Ready to add', fr: 'Prêt à ajouter' },
  needsReview: { ar: 'يحتاج مراجعة', en: 'Needs review', fr: 'À vérifier' },
  failed: { ar: 'فشل التحليل', en: 'Failed', fr: 'Échec' },
  amountNotDetected: { ar: 'لم نتمكن من قراءة مبلغ هذه الفاتورة. الرجاء إدخاله يدويًا أو رفع صورة أوضح.', en: 'We could not read this receipt amount. Please enter it manually or upload a clearer image.', fr: 'Nous n’avons pas pu lire le montant de cette facture. Veuillez le saisir manuellement ou importer une image plus claire.' },
  selectAll: { ar: 'تحديد الكل', en: 'Select all', fr: 'Tout sélectionner' },
  uploadLimit: { ar: 'يمكنك رفع 10 فواتير كحد أقصى في المرة الواحدة.', en: 'You can upload up to 10 receipts at once.', fr: 'Vous pouvez importer jusqu’à 10 factures à la fois.' },
  batchSaveResult: { ar: 'تمت إضافة {successCount} مصروفات بنجاح. فشل {failedCount}.', en: '{successCount} expenses added successfully. {failedCount} failed.', fr: '{successCount} dépenses ajoutées avec succès. {failedCount} ont échoué.' },
  aiAdded: { ar: 'مضاف بالذكاء الاصطناعي', en: 'Added by AI', fr: 'Ajoute par IA' },
  hasReceipt: { ar: 'يوجد فاتورة', en: 'Receipt attached', fr: 'Facture jointe' },
  noReceipt: { ar: 'بدون فاتورة', en: 'No receipt', fr: 'Sans facture' },
  viewReceipt: { ar: 'عرض الفاتورة', en: 'View receipt', fr: 'Voir la facture' },
  receiptDetails: { ar: 'تفاصيل الفاتورة', en: 'Receipt details', fr: 'Details de la facture' },
  extractedData: { ar: 'البيانات المستخرجة', en: 'Extracted data', fr: 'Donnees extraites' },
  receiptItems: { ar: 'عناصر الفاتورة', en: 'Receipt items', fr: 'Articles de la facture' },
  originalImage: { ar: 'عرض الصورة الأصلية', en: 'View original image', fr: 'Voir l image originale' },
  emptyTitle: { ar: 'لا توجد مصروفات حتى الآن', en: 'No expenses yet', fr: 'Aucune depense pour le moment' },
  emptyBody: { ar: 'ابدأ بإضافة أول مصروف يدويًا أو ارفع صورة فاتورة ليتم تحليلها بالذكاء الاصطناعي.', en: 'Start by adding an expense manually or upload a receipt to analyze it with AI.', fr: 'Ajoutez une depense manuellement ou telechargez une facture pour l analyser avec l IA.' },
  fileLarge: { ar: 'حجم الملف كبير جدًا', en: 'File size is too large', fr: 'Le fichier est trop volumineux' },
  fileUnsupported: { ar: 'نوع الملف غير مدعوم', en: 'Unsupported file type', fr: 'Type de fichier non pris en charge' },
  unclear: { ar: 'الصورة غير واضحة، حاول رفع صورة أوضح', en: 'The image is unclear, try uploading a clearer one', fr: 'L image n est pas claire, essayez une image plus nette' },
  couldNotRead: { ar: 'لم نتمكن من قراءة الفاتورة بوضوح', en: 'We could not read the receipt clearly', fr: 'Nous n avons pas pu lire la facture clairement' },
  monthlySummary: { ar: 'ملخص الشهر', en: 'Monthly summary', fr: 'Resume mensuel' },
  aiInsights: { ar: 'رؤى الذكاء المالي', en: 'Financial AI insights', fr: 'Insights IA financiers' },
};

const pageMeta: Record<PageKind, { title: LangText; subtitle: LangText; accent: string; icon: typeof ReceiptText }> = {
  expenses: {
    title: { ar: 'المصروفات', en: 'Expenses', fr: 'Dépenses' },
    subtitle: { ar: 'راقب الصرف الشهري، التصنيفات، وآخر العمليات في مكان واحد.', en: 'Track monthly spend, categories, and recent expense activity in one place.', fr: 'Suivez vos dépenses mensuelles, catégories et activités récentes en un seul endroit.' },
    accent: '#EF4444',
    icon: ReceiptText,
  },
  income: {
    title: { ar: 'الدخل', en: 'Income', fr: 'Revenus' },
    subtitle: { ar: 'نظرة واضحة على الراتب، الدخل الجانبي، ومصادر الدخل الشهرية.', en: 'A clean view of salary, side income, and monthly income sources.', fr: 'Vue claire du salaire, revenus annexes et sources de revenus mensuels.' },
    accent: '#22C55E',
    icon: Wallet,
  },
  invest: {
    title: { ar: 'الاستثمار', en: 'Investments', fr: 'Investissements' },
    subtitle: { ar: 'تابع المحفظة، فئات الاستثمار، المخاطر، والمساهمة الشهرية.', en: 'Follow portfolio value, investment categories, risk level, and monthly contribution.', fr: 'Suivez la valeur du portefeuille, les catégories, le risque et la contribution mensuelle.' },
    accent: '#3B82F6',
    icon: TrendingUp,
  },
  savings: {
    title: { ar: 'الإدخار', en: 'Savings', fr: 'Épargne' },
    subtitle: { ar: 'تتبّع مدخراتك وحقّق أهدافك المالية بخطوات واضحة ومنتظمة.', en: 'Track your savings and reach your financial goals with clear, consistent steps.', fr: 'Suivez votre épargne et atteignez vos objectifs financiers étape par étape.' },
    accent: '#22C55E',
    icon: PiggyBank,
  },
  goals: {
    title: { ar: 'الأهداف المالية', en: 'Financial Goals', fr: 'Objectifs financiers' },
    subtitle: { ar: 'حوّل أهدافك إلى بطاقات تقدم بمبلغ مستهدف ومتبقي واضح.', en: 'Turn targets into progress cards with clear target and remaining amounts.', fr: 'Transformez vos objectifs en cartes de progression avec montant cible et restant.' },
    accent: '#D8AE63',
    icon: Target,
  },
  reports: {
    title: { ar: 'التقارير', en: 'Reports', fr: 'Rapports' },
    subtitle: { ar: 'ملخص مالي قابل للطباعة للتدفقات، الادخار، الاستثمار، والتوازن الشهري.', en: 'Printable financial summaries for cash flow, savings, investments, and monthly balance.', fr: 'Résumés financiers imprimables : flux, épargne, investissements et solde mensuel.' },
    accent: '#8B5CF6',
    icon: ChartPie,
  },
  ai: {
    title: { ar: 'المساعد المالي الذكي', en: 'AI Financial Assistant', fr: 'Assistant financier IA' },
    subtitle: { ar: 'اقتراحات ذكية، رؤى فورية، وبطاقات عمل لتحسين قراراتك المالية.', en: 'Smart suggestions, instant insights, and action cards for better financial decisions.', fr: 'Suggestions intelligentes, insights instantanés et actions pour améliorer vos décisions.' },
    accent: '#06B6D4',
    icon: Bot,
  },
};

function pick(text: LangText, langOrIsAr: string | boolean) {
  const lang = typeof langOrIsAr === 'boolean' ? (langOrIsAr ? 'ar' : 'en') : langOrIsAr;
  if (lang === 'ar') return text.ar;
  if (lang === 'fr') return text.fr ?? text.en;
  return text.en;
}

function expenseText(key: keyof typeof expenseUi, lang: string) {
  return pick(expenseUi[key], lang);
}

function categoryLabel(category: string | null | undefined, lang: string) {
  return pick(EXPENSE_CATEGORIES.find(item => item.id === category)?.label ?? EXPENSE_CATEGORIES.at(-1)!.label, lang);
}

function paymentLabel(paymentMethod: string | null | undefined, lang: string) {
  return pick(PAYMENT_METHODS.find(item => item.id === paymentMethod)?.label ?? PAYMENT_METHODS.at(-1)!.label, lang);
}

function normalizeReceiptNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Number(value.toFixed(3));
  if (typeof value !== 'string') return undefined;
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const normalized = value
    .replace(/[٠-٩]/g, digit => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(persian.indexOf(digit)))
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',')
    .replace(/(?:KWD|KD|د\.?ك|د\s*ك)/gi, '')
    .replace(/[^\d.,-]/g, '')
    .trim();
  if (!normalized) return undefined;
  const amount = Number((normalized.includes('.') ? normalized.replace(/,/g, '') : normalized.replace(',', '.')));
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(3)) : undefined;
}

function extractedReceiptAmount(data: AiExtractedData) {
  return normalizeReceiptNumber(data.totalAmount)
    ?? normalizeReceiptNumber(data.amount)
    ?? normalizeReceiptNumber(data.total)
    ?? normalizeReceiptNumber(data.finalTotal);
}

function normalizeReceiptDate(data: AiExtractedData) {
  const value = data.receiptDate || data.date;
  return typeof value === 'string' && value ? value : new Date().toISOString().slice(0, 10);
}

function normalizeReceiptCategory(value: string | undefined) {
  if (!value) return 'other';
  const lower = value.toLowerCase();
  if (EXPENSE_CATEGORIES.some(item => item.id === lower)) return lower;
  if (/مطاعم|restaurant|cafe|food/.test(lower)) return 'restaurants';
  if (/مشتريات|shopping|market|store|تجارة|جمعية/.test(lower)) return 'shopping';
  if (/فواتير|bill|utility/.test(lower)) return 'bills';
  if (/مواصلات|transport|fuel|taxi/.test(lower)) return 'transport';
  if (/صحة|health|pharmacy|clinic/.test(lower)) return 'health';
  if (/تعليم|education|school/.test(lower)) return 'education';
  if (/إيجار|ايجار|rent/.test(lower)) return 'rent';
  if (/قروض|loan/.test(lower)) return 'loans';
  if (/اشتراكات|subscription/.test(lower)) return 'subscriptions';
  return 'other';
}

function normalizeReceiptPayment(value: string | undefined) {
  if (!value) return 'other';
  const lower = value.toLowerCase();
  if (PAYMENT_METHODS.some(item => item.id === lower)) return lower;
  if (/knet|كي\s?نت/.test(lower)) return 'knet';
  if (/cash|كاش|نقد/.test(lower)) return 'cash';
  if (/apple/.test(lower)) return 'apple_pay';
  if (/transfer|تحويل/.test(lower)) return 'transfer';
  if (/card|visa|master|بطاقة/.test(lower)) return 'card';
  return 'other';
}

function receiptItemsNotes(items: ReceiptItem[] | undefined) {
  if (!items?.length) return '';
  return items
    .slice(0, 8)
    .map(item => {
      const amount = normalizeReceiptNumber(item.total) ?? normalizeReceiptNumber(item.price) ?? normalizeReceiptNumber(item.unitPrice);
      return amount ? `${item.name}: ${amount}` : item.name;
    })
    .join('\n');
}

function receiptFallbackName(lang: string) {
  return pick({ ar: 'مصروف من فاتورة', en: 'Receipt expense', fr: 'Dépense de facture' }, lang);
}

function textWithCount(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

function pendingReceiptFromResult(
  file: File,
  previewUrl: string,
  result: { success?: boolean; data?: AiExtractedData; error?: string },
  lang: string,
): PendingReceiptExpense {
  const data = result.data ?? null;
  const amount = data ? extractedReceiptAmount(data) : undefined;
  const confidence = data?.confidenceScore ?? data?.confidence ?? (amount ? 0.84 : 0.3);
  const status: PendingReceiptExpense['status'] = !result.success || !amount ? 'failed' : confidence < 0.7 ? 'review' : 'ready';
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${file.name}`,
    selected: Boolean(amount) && confidence >= 0.7,
    status,
    file,
    fileName: file.name,
    previewUrl,
    name: data?.merchantName?.trim() || receiptFallbackName(lang),
    amount: amount ? String(amount) : '',
    date: data ? normalizeReceiptDate(data) : todayInputDate(),
    category: normalizeReceiptCategory(data?.category),
    paymentMethod: normalizeReceiptPayment(data?.paymentMethod),
    notes: receiptItemsNotes(data?.items),
    aiConfidenceScore: confidence,
    aiExtractedData: data,
    error: result.error || (!amount ? expenseText('amountNotDetected', lang) : null),
  };
}

function dataErrorCopy(error: DataLoadError | null, lang: string) {
  if (!error) return null;
  const copy: Record<DataErrorKind, { title: LangText; body: LangText }> = {
    database: {
      title: { ar: 'تعذر الاتصال بقاعدة البيانات', en: 'Could not connect to the database', fr: 'Connexion a la base de donnees impossible' },
      body: { ar: 'تحقق من إعدادات الاتصال أو حاول لاحقًا.', en: 'Check connection settings or try again later.', fr: 'Verifiez les parametres de connexion ou reessayez plus tard.' },
    },
    permission: {
      title: { ar: 'لا توجد صلاحية لعرض هذه البيانات', en: 'You do not have permission to view this data', fr: 'Vous n avez pas la permission de voir ces donnees' },
      body: { ar: 'تحقق من تسجيل الدخول وسياسات الوصول.', en: 'Check sign-in state and access policies.', fr: 'Verifiez la session et les regles d acces.' },
    },
    auth: {
      title: { ar: 'يرجى تسجيل الدخول لعرض بياناتك', en: 'Please sign in to view your data', fr: 'Connectez-vous pour voir vos donnees' },
      body: { ar: 'لم يتم العثور على جلسة مستخدم صالحة.', en: 'No valid user session was found.', fr: 'Aucune session utilisateur valide.' },
    },
    unknown: {
      title: { ar: 'حدث خطأ غير متوقع أثناء تحميل البيانات', en: 'Unexpected error while loading data', fr: 'Erreur inattendue pendant le chargement' },
      body: { ar: 'حاول إعادة تحميل البيانات.', en: 'Try loading the data again.', fr: 'Essayez de recharger les donnees.' },
    },
  };
  const selected = copy[error.kind];
  return { title: pick(selected.title, lang), body: pick(selected.body, lang), queryName: error.queryName };
}

function money(value: number, langOrIsAr: string | boolean, currency = 'KWD') {
  const lang = typeof langOrIsAr === 'boolean' ? (langOrIsAr ? 'ar' : 'en') : langOrIsAr;
  return formatCurrency(value, currency, lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en');
}

function sum(items: MoneyItem[]) {
  return items.reduce((total, item) => total + parseMoney(item.amount), 0);
}

function progress(current: number, target: number) {
  return calculateGoalProgress({ current_amount: current, target_amount: target }).progressPercent;
}

function editableKind(kind: PageKind): kind is EntryKind {
  return kind === 'expenses' || kind === 'income' || kind === 'invest' || kind === 'savings';
}

function guestKey(kind: EntryKind) {
  return `sfm_guest_${kind}`;
}

function readGuestItems(kind: EntryKind): MoneyItem[] | IncomeSource[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(guestKey(kind)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestItems(kind: EntryKind, items: MoneyItem[] | IncomeSource[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(guestKey(kind), JSON.stringify(items));
}

function parseGoalNotes(notes?: string | null): Record<string, unknown> {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { description: notes };
  }
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + Math.max(0, months));
  return next;
}

function formatDateInput(date: Date) {
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthsBetween(from: Date, to?: string | null) {
  if (!to) return 0;
  const end = new Date(to);
  if (Number.isNaN(end.getTime()) || end <= from) return 0;
  const years = end.getFullYear() - from.getFullYear();
  const months = end.getMonth() - from.getMonth();
  const days = end.getDate() >= from.getDate() ? 0 : -1;
  return Math.max(1, years * 12 + months + days);
}

function goalFromRow(item: GoalRow): GoalItem {
  const notes = parseGoalNotes(item.notes);
  const amounts = calculateGoalProgress(item);
  const deadline = typeof notes.deadline === 'string'
    ? notes.deadline
    : item.duration && item.duration_unit === 'month'
      ? formatDateInput(addMonths(new Date(), Number(item.duration) || 0))
      : null;

  return {
    id: item.id,
    name: item.goal,
    target_amount: amounts.targetAmount,
    current_amount: amounts.currentAmount,
    monthly_contribution: parseMoney(notes.monthlyContribution),
    goal_type: typeof notes.goalType === 'string' ? notes.goalType : 'saving',
    category: typeof notes.category === 'string' ? notes.category : 'general',
    priority: typeof notes.priority === 'string' ? notes.priority : 'medium',
    funding_source: typeof notes.fundingSource === 'string' ? notes.fundingSource : 'salary',
    currency: typeof notes.currency === 'string' ? notes.currency : 'KWD',
    ai_enabled: typeof notes.aiEnabled === 'boolean' ? notes.aiEnabled : true,
    icon: '🎯',
    color: '#D8AE63',
    deadline,
    notes: item.notes,
    created_at: item.created_at,
  };
}

function entryTitleKey(kind: EntryKind) {
  return entryTitleKeys[kind];
}

function deleteConfirmKey(kind: EntryKind) {
  return deleteConfirmKeys[kind];
}

function classifyDataError(message: string): DataErrorKind {
  const lower = message.toLowerCase();
  if (lower.includes('permission') || lower.includes('row-level') || lower.includes('rls') || lower.includes('not authorized') || lower.includes('42501')) return 'permission';
  if (lower.includes('jwt') || lower.includes('auth') || lower.includes('session')) return 'auth';
  if (lower.includes('relation') || lower.includes('column') || lower.includes('schema') || lower.includes('pgrst') || lower.includes('failed to fetch')) return 'database';
  return 'unknown';
}

function missingColumnFromError(message: string) {
  const match = message.match(/column\s+["']?(?:\w+\.)?(\w+)["']?\s+(?:does not exist|not found)/i)
    ?? message.match(/could not find the ['"]?(\w+)['"]? column/i);
  return match?.[1];
}

function logDataLoadError(error: DataLoadError, userId?: string) {
  console.error('Data loading failed:', {
    page: error.page,
    functionName: error.functionName,
    table: error.table,
    missingColumn: error.missingColumn,
    error: error.message,
    userId,
    queryName: error.queryName,
  });
}

async function safeQuery<T>(
  query: QueryResult<T>,
  meta: { page: string; functionName: string; queryName: string; userId?: string; table?: string },
): Promise<DataResult<T>> {
  try {
    const { data, error } = await query;
    if (error) {
      const structured: DataLoadError = {
        page: meta.page,
        functionName: meta.functionName,
        queryName: meta.queryName,
        table: meta.table,
        missingColumn: missingColumnFromError(error.message),
        message: error.message,
        kind: classifyDataError(error.message),
      };
      logDataLoadError(structured, meta.userId);
      return { data: [] as T[], error: structured, source: 'fallback' };
    }
    return { data: data ?? [], error: null, source: 'database' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown data error';
    const structured: DataLoadError = {
      page: meta.page,
      functionName: meta.functionName,
      queryName: meta.queryName,
      table: meta.table,
      missingColumn: missingColumnFromError(message),
      message,
      kind: classifyDataError(message),
    };
    logDataLoadError(structured, meta.userId);
    return { data: [] as T[], error: structured, source: 'fallback' };
  }
}

export function RouteDashboardPage({ kind }: { kind: PageKind }) {
  const router = useRouter();
  const { user, loading, isGuest } = useAuth();
  const { lang, isAr, dir, t } = useLanguage();
  const { currency } = useCurrency();
  const meta = pageMeta[kind];
  const Icon = meta.icon;

  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [dataLoading, setDataLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatValue, setChatValue] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormState>(emptyEntryForm);
  const [entryMode, setEntryMode] = useState<'create' | 'edit'>('create');
  const [entryOpen, setEntryOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(() => emptyExpenseForm());
  const [expenseModalMode, setExpenseModalMode] = useState<ExpenseModalMode>('manual');
  const [receiptAnalyzing, setReceiptAnalyzing] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [receiptBatchProgress, setReceiptBatchProgress] = useState('');
  const [receiptFiles, setReceiptFiles] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const [pendingReceiptExpenses, setPendingReceiptExpenses] = useState<PendingReceiptExpense[]>([]);
  const [receiptDetails, setReceiptDetails] = useState<SmartExpense | null>(null);
  const [entrySaving, setEntrySaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<(MoneyItem | IncomeSource) | null>(null);
  const [entryMessage, setEntryMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [goalEditOpen, setGoalEditOpen] = useState(false);
  const [goalMode, setGoalMode] = useState<'create' | 'edit'>('edit');
  const [goalForm, setGoalForm] = useState<GoalFormState>(emptyGoalForm);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState('');
  const [rowSearch, setRowSearch] = useState('');
  const [rowSort, setRowSort] = useState<'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc'>('dateDesc');
  const [rowRange, setRowRange] = useState<'all' | 'month' | 'last3' | 'year'>('all');
  const [visibleCount, setVisibleCount] = useState(30);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        if (isGuest) {
          setSnapshot({
            ...emptySnapshot,
            income: readGuestItems('income') as IncomeSource[],
            expenses: readGuestItems('expenses') as MoneyItem[],
            savings: readGuestItems('savings') as MoneyItem[],
            investments: readGuestItems('invest') as MoneyItem[],
          });
        }
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      const queryMeta = (queryName: string, table?: string) => ({
        page: kind,
        functionName: 'RouteDashboardPage.load',
        queryName,
        userId: user.id,
        table,
      });
      const expensesQuery = async () => {
        const currentSchema = await safeQuery<SmartExpense>(
          supabase.from('expense_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<SmartExpense>,
          queryMeta('expense_items', 'expense_items'),
        );
        if (!currentSchema.error || !/column|schema|pgrst/i.test(currentSchema.error.message)) return currentSchema;

        const legacy = await safeQuery<SmartExpense>(
          supabase.from('expense_items').select('id, name, amount, category, created_at, updated_at').eq('user_id', user.id).order('created_at', { ascending: false }) as unknown as QueryResult<SmartExpense>,
          queryMeta('expense_items.legacy', 'expense_items'),
        );
        return legacy.error ? currentSchema : legacy;
      };
      const [income, expenses, savings, investments, goals] = await Promise.all([
        safeQuery<IncomeSource>(supabase.from('monthly_income_sources').select('id, label, category, amount').eq('user_id', user.id) as unknown as QueryResult<IncomeSource>, queryMeta('monthly_income_sources', 'monthly_income_sources')),
        expensesQuery(),
        safeQuery<MoneyItem>(supabase.from('savings_items').select('id, name, amount, created_at').eq('user_id', user.id) as unknown as QueryResult<MoneyItem>, queryMeta('savings_items', 'savings_items')),
        safeQuery<MoneyItem>(supabase.from('investment_items').select('id, name, amount, created_at').eq('user_id', user.id) as unknown as QueryResult<MoneyItem>, queryMeta('investment_items', 'investment_items')),
        safeQuery<GoalRow>(supabase.from('financial_goals').select('*').eq('user_id', user.id) as unknown as QueryResult<GoalRow>, queryMeta('financial_goals', 'financial_goals')),
      ]);

      if (cancelled) return;

      setSnapshot({
        income: income.data.map(item => ({ ...item, name: item.label || item.category || item.name || 'Income' })),
        expenses: expenses.data,
        savings: savings.data,
        investments: investments.data,
        goals: goals.data.map(goalFromRow),
        error: [income.error, expenses.error, savings.error, investments.error, goals.error].find(Boolean) ?? null,
      });
      setDataLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isGuest, kind, user]);

  const data = useMemo(() => {
    const income = snapshot.income;
    const expenses = snapshot.expenses;
    const savings = snapshot.savings;
    const investments = snapshot.investments;
    const goals = snapshot.goals;
    const totalIncome = sum(income);
    const totalExpenses = sum(expenses);
    const totalSavings = sum(savings);
    const totalInvestments = sum(investments);
    const charityTotal = expenses.filter(item => item.name.startsWith('خيرية:')).reduce((total, item) => total + item.amount, 0);

    return {
      income,
      expenses,
      savings,
      investments,
      goals,
      totalIncome,
      totalExpenses,
      totalSavings,
      totalInvestments,
      charityTotal,
      balance: totalIncome - totalExpenses,
    };
  }, [snapshot]);

  const cards = useMemo<SectionCard[]>(() => buildCards(kind, data, lang, currency), [data, lang, kind, currency]);
  const rows = useMemo(() => buildRows(kind, data, lang, currency, t), [data, lang, kind, currency, t]);
  const insights = useMemo(() => buildInsights(kind, data, lang, currency, t), [data, lang, kind, currency, t]);
  const selectedGoalCurrency = useMemo(() => getCurrency(goalForm.currency || currency || 'KWD'), [currency, goalForm.currency]);
  const selectedCurrencySymbol = isAr ? selectedGoalCurrency.symbolAr : selectedGoalCurrency.symbolEn;
  const goalPreview = useMemo(() => buildGoalAnalysis({
    id: goalForm.id || 'preview',
    name: goalForm.name || t('goal_name_label'),
    target_amount: parseMoney(goalForm.targetAmount),
    current_amount: parseMoney(goalForm.currentAmount),
    monthly_contribution: parseMoney(goalForm.monthlyContribution),
    goal_type: goalForm.goalType,
    category: goalForm.category,
    priority: goalForm.priority,
    funding_source: goalForm.fundingSource,
    currency: goalForm.currency || currency || 'KWD',
    ai_enabled: goalForm.aiEnabled,
    deadline: goalForm.deadline || null,
    icon: '🎯',
    color: '#D8AE63',
    notes: goalForm.notes,
  }, data, lang, goalForm.currency || currency, t), [currency, data, goalForm, lang, t]);

  const filteredRows = useMemo(() => {
    if (!editableKind(kind)) return rows;
    let result = [...rows];
    if (rowSearch.trim()) {
      const q = rowSearch.toLowerCase();
      result = result.filter(r => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q));
    }
    if (rowRange !== 'all') {
      const now = new Date();
      result = result.filter(r => {
        const ca = r.item?.created_at;
        if (!ca) return true;
        const d = new Date(ca);
        if (rowRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (rowRange === 'last3') return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
        if (rowRange === 'year') return d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    if (rowSort === 'amountDesc') result.sort((a, b) => (b.item?.amount ?? 0) - (a.item?.amount ?? 0));
    else if (rowSort === 'amountAsc') result.sort((a, b) => (a.item?.amount ?? 0) - (b.item?.amount ?? 0));
    else if (rowSort === 'dateAsc') result.sort((a, b) => new Date(a.item?.created_at ?? 0).getTime() - new Date(b.item?.created_at ?? 0).getTime());
    else result.sort((a, b) => new Date(b.item?.created_at ?? 0).getTime() - new Date(a.item?.created_at ?? 0).getTime());
    return result;
  }, [rows, rowSearch, rowSort, rowRange, kind]);

  const filteredExpenses = useMemo(() => {
    let result = [...data.expenses];
    if (rowSearch.trim()) {
      const q = rowSearch.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(q) ||
        categoryLabel(item.category, lang).toLowerCase().includes(q) ||
        paymentLabel(item.payment_method, lang).toLowerCase().includes(q),
      );
    }
    if (rowRange !== 'all') {
      const now = new Date();
      result = result.filter(item => {
        const rawDate = item.date || item.created_at;
        if (!rawDate) return true;
        const d = new Date(rawDate);
        if (rowRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (rowRange === 'last3') return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
        if (rowRange === 'year') return d.getFullYear() === now.getFullYear();
        return true;
      });
    }
    if (rowSort === 'amountDesc') result.sort((a, b) => b.amount - a.amount);
    else if (rowSort === 'amountAsc') result.sort((a, b) => a.amount - b.amount);
    else if (rowSort === 'dateAsc') result.sort((a, b) => new Date(a.date || a.created_at || 0).getTime() - new Date(b.date || b.created_at || 0).getTime());
    else result.sort((a, b) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime());
    return result;
  }, [data.expenses, lang, rowRange, rowSearch, rowSort]);

  useEffect(() => { setVisibleCount(30); }, [rowSearch, rowSort, rowRange, kind]);

  function showEntryMessage(type: 'ok' | 'err', text: string) {
    setEntryMessage({ type, text });
    window.setTimeout(() => setEntryMessage(null), 2200);
  }

  function openCreateEntry() {
    if (!editableKind(kind)) return;
    if (kind === 'expenses') {
      setEntryMode('create');
      setExpenseModalMode('manual');
      setReceiptError('');
      setExpenseForm(emptyExpenseForm());
      setEntryOpen(true);
      return;
    }
    setEntryMode('create');
    setEntryForm(emptyEntryForm);
    setEntryOpen(true);
  }

  function openReceiptScan() {
    setEntryMode('create');
    setExpenseModalMode('scan');
    setReceiptError('');
    setExpenseForm(emptyExpenseForm());
    setEntryOpen(true);
  }

  function openEditEntry(item: MoneyItem | IncomeSource) {
    if (!editableKind(kind)) return;
    if (kind === 'expenses') {
      const expense = item as SmartExpense;
      setEntryMode('edit');
      setExpenseModalMode('manual');
      setReceiptError('');
      setExpenseForm({
        id: expense.id,
        name: expense.name,
        amount: String(expense.amount ?? ''),
        category: expense.category || 'other',
        date: expense.date || (expense.created_at ? expense.created_at.slice(0, 10) : todayInputDate()),
        paymentMethod: expense.payment_method || 'cash',
        notes: expense.notes || '',
        receiptFile: null,
        receiptPreview: expense.receipt_image_url || '',
        receiptImageUrl: expense.receipt_image_url || null,
        receiptFileName: expense.receipt_file_name || null,
        aiExtractedData: expense.ai_extracted_data || null,
        aiConfidenceScore: expense.ai_confidence_score || null,
      });
      setEntryOpen(true);
      return;
    }
    setEntryMode('edit');
    setEntryForm({
      id: item.id,
      name: 'label' in item && item.label ? item.label : item.name,
      amount: String(item.amount ?? ''),
      category: 'category' in item && item.category ? item.category : 'general',
    });
    setEntryOpen(true);
  }

  function applyEntryToSnapshot(entryKind: EntryKind, item: MoneyItem | IncomeSource, mode: 'create' | 'edit') {
    setSnapshot(prev => {
      const apply = <T extends MoneyItem>(items: T[]) => (
        mode === 'create'
          ? [item as T, ...items]
          : items.map(existing => existing.id === item.id ? { ...existing, ...item } as T : existing)
      );

      if (entryKind === 'income') return { ...prev, income: apply(prev.income) as IncomeSource[] };
      if (entryKind === 'expenses') return { ...prev, expenses: apply(prev.expenses) };
      if (entryKind === 'savings') return { ...prev, savings: apply(prev.savings) };
      return { ...prev, investments: apply(prev.investments) };
    });
  }

  function handleExpenseFile(file: File | null) {
    setReceiptError('');
    if (!file) {
      setExpenseForm(prev => ({ ...prev, receiptFile: null, receiptPreview: '', receiptFileName: null, aiExtractedData: null, aiConfidenceScore: null }));
      setReceiptFiles([]);
      setPendingReceiptExpenses([]);
      return;
    }
    console.log('Receipt image selected:', file);
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setReceiptError(expenseText('fileUnsupported', lang));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setReceiptError(expenseText('fileLarge', lang));
      return;
    }
    const preview = file.type === 'application/pdf' ? '' : URL.createObjectURL(file);
    setExpenseForm(prev => ({
      ...prev,
      receiptFile: file,
      receiptPreview: preview,
      receiptFileName: file.name,
    }));
    setReceiptFiles([{ file, previewUrl: preview }]);
    setPendingReceiptExpenses([]);
  }

  function handleExpenseFiles(files: FileList | File[] | null) {
    setReceiptError('');
    setReceiptBatchProgress('');
    setPendingReceiptExpenses([]);
    const selected = Array.from(files || []);
    if (!selected.length) {
      handleExpenseFile(null);
      return;
    }
    if (selected.length > 10) {
      setReceiptError(expenseText('uploadLimit', lang));
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const invalid = selected.find(file => !allowed.includes(file.type));
    if (invalid) {
      setReceiptError(expenseText('fileUnsupported', lang));
      return;
    }
    const large = selected.find(file => file.size > 10 * 1024 * 1024);
    if (large) {
      setReceiptError(expenseText('fileLarge', lang));
      return;
    }
    const entries = selected.map(file => ({ file, previewUrl: file.type === 'application/pdf' ? '' : URL.createObjectURL(file) }));
    setReceiptFiles(entries);
    const first = entries[0];
    setExpenseForm(prev => ({
      ...prev,
      receiptFile: first.file,
      receiptPreview: first.previewUrl,
      receiptFileName: first.file.name,
      aiExtractedData: null,
      aiConfidenceScore: null,
    }));
  }

  async function analyzeReceipt() {
    if (!expenseForm.receiptFile || receiptAnalyzing) {
      setReceiptError(expenseText('unclear', lang));
      return;
    }
    setReceiptAnalyzing(true);
    setReceiptError('');
    try {
      const form = new FormData();
      form.append('receipt', expenseForm.receiptFile);
      console.log('Sending receipt to AI scan API...');
      const response = await fetch('/api/ai/receipt-scan', { method: 'POST', body: form });
      const payload = await response.json() as { success?: boolean; error?: string; data?: AiExtractedData };
      if (!response.ok || !payload.data) throw new Error(payload.error || expenseText('couldNotRead', lang));
      const extracted = payload.data;
      console.log('AI receipt result:', payload);
      const amount = extractedReceiptAmount(extracted);
      const notes = receiptItemsNotes(extracted.items);
      setExpenseForm(prev => ({
        ...prev,
        name: extracted.merchantName?.trim() || prev.name || receiptFallbackName(lang),
        amount: amount ? String(amount) : prev.amount,
        category: normalizeReceiptCategory(extracted.category) || prev.category || 'other',
        date: normalizeReceiptDate(extracted) || prev.date,
        paymentMethod: normalizeReceiptPayment(extracted.paymentMethod) || prev.paymentMethod || 'other',
        notes: notes || prev.notes,
        aiExtractedData: extracted,
        aiConfidenceScore: extracted.confidenceScore ?? extracted.confidence ?? (amount ? 0.84 : 0.48),
      }));
      if (!amount) {
        setReceiptError(pick({
          ar: 'لم نتمكن من قراءة مبلغ الفاتورة. الرجاء إدخال المبلغ يدويًا أو رفع صورة أوضح.',
          en: 'We could not read the receipt amount. Please enter it manually or upload a clearer image.',
          fr: 'Nous n’avons pas pu lire le montant de la facture. Veuillez le saisir manuellement ou importer une image plus claire.',
        }, lang));
      }
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : expenseText('couldNotRead', lang));
    } finally {
      setReceiptAnalyzing(false);
    }
  }

  async function analyzeAllReceipts() {
    if (!receiptFiles.length || receiptAnalyzing) {
      setReceiptError(expenseText('unclear', lang));
      return;
    }
    setReceiptAnalyzing(true);
    setReceiptError('');
    setReceiptBatchProgress(textWithCount(expenseText('batchProgress', lang), { current: 1, total: receiptFiles.length }));
    try {
      const form = new FormData();
      receiptFiles.forEach(({ file }) => form.append('receipt', file));
      const response = await fetch('/api/ai/receipt-scan', { method: 'POST', body: form });
      const payload = await response.json() as {
        success?: boolean;
        error?: string;
        data?: AiExtractedData;
        results?: Array<{ fileName: string; success?: boolean; data?: AiExtractedData; error?: string }>;
      };
      if (!response.ok) throw new Error(payload.error || expenseText('couldNotRead', lang));
      const results = payload.results?.length
        ? payload.results
        : [{ fileName: receiptFiles[0].file.name, success: payload.success, data: payload.data, error: payload.error }];
      const pending = receiptFiles.map((entry, index) => pendingReceiptFromResult(entry.file, entry.previewUrl, results[index] || { success: false, error: expenseText('couldNotRead', lang) }, lang));
      setPendingReceiptExpenses(pending);
      const firstReady = pending.find(item => item.amount) || pending[0];
      if (firstReady) {
        setExpenseForm(prev => ({
          ...prev,
          name: firstReady.name,
          amount: firstReady.amount,
          category: firstReady.category,
          date: firstReady.date,
          paymentMethod: firstReady.paymentMethod,
          notes: firstReady.notes,
          receiptFile: firstReady.file,
          receiptPreview: firstReady.previewUrl,
          receiptFileName: firstReady.fileName,
          aiExtractedData: firstReady.aiExtractedData,
          aiConfidenceScore: firstReady.aiConfidenceScore,
        }));
      }
      if (pending.some(item => item.status === 'failed')) setReceiptError(expenseText('amountNotDetected', lang));
    } catch (err) {
      setReceiptError(err instanceof Error ? err.message : expenseText('couldNotRead', lang));
    } finally {
      setReceiptAnalyzing(false);
      setReceiptBatchProgress('');
    }
  }

  async function uploadReceiptFile(file: File | null, id: string, previewUrl?: string | null) {
    if (!file || !user || isGuest) {
      return {
        receiptImageUrl: previewUrl || null,
        receiptFileName: file?.name || null,
      };
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${user.id}/${id}-${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
    if (error) {
      return {
        receiptImageUrl: previewUrl || null,
        receiptFileName: file.name,
      };
    }
    const { data: publicUrl } = supabase.storage.from('receipts').getPublicUrl(path);
    return {
      receiptImageUrl: publicUrl.publicUrl,
      receiptFileName: file.name,
    };
  }

  async function uploadReceiptIfAvailable(id: string) {
    if (!expenseForm.receiptFile) {
      return {
        receiptImageUrl: expenseForm.receiptImageUrl || expenseForm.receiptPreview || null,
        receiptFileName: expenseForm.receiptFileName || null,
      };
    }
    return uploadReceiptFile(expenseForm.receiptFile, id, expenseForm.receiptImageUrl || expenseForm.receiptPreview || null);
  }

  async function saveExpense(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (entrySaving) return;

    const name = expenseForm.name.trim();
    const amount = Number(expenseForm.amount);
    if (!name || !amount || amount <= 0 || !expenseForm.category || !expenseForm.date) {
      showEntryMessage('err', t('entry_validation_error'));
      return;
    }

    setEntrySaving(true);
    const mode = entryMode;
    const id = expenseForm.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`);
    const now = new Date().toISOString();

    try {
      const uploaded = await uploadReceiptIfAvailable(id);
      const item: SmartExpense = {
        id,
        name,
        amount,
        category: expenseForm.category,
        date: expenseForm.date,
        payment_method: expenseForm.paymentMethod,
        notes: expenseForm.notes,
        receipt_image_url: uploaded.receiptImageUrl,
        receipt_file_name: uploaded.receiptFileName,
        ai_extracted_data: expenseForm.aiExtractedData,
        ai_confidence_score: expenseForm.aiConfidenceScore ?? expenseForm.aiExtractedData?.confidenceScore ?? null,
        created_at: mode === 'create' ? now : undefined,
        updated_at: now,
      };

      if (isGuest) {
        const current = readGuestItems('expenses') as SmartExpense[];
        const next = mode === 'create' ? [item, ...current] : current.map(existing => existing.id === id ? { ...existing, ...item } : existing);
        writeGuestItems('expenses', next);
      } else {
        if (!user) throw new Error(t('entry_auth_required'));
        const payload = {
          user_id: user.id,
          name,
          amount,
          category: expenseForm.category,
          date: expenseForm.date,
          payment_method: expenseForm.paymentMethod,
          notes: expenseForm.notes || null,
          receipt_image_url: uploaded.receiptImageUrl,
          receipt_file_name: uploaded.receiptFileName,
          ai_extracted_data: expenseForm.aiExtractedData ?? null,
          ai_confidence_score: expenseForm.aiConfidenceScore ?? expenseForm.aiExtractedData?.confidenceScore ?? null,
          updated_at: now,
        };
        if (mode === 'create') {
          const { data: created, error } = await supabase.from('expense_items').insert(payload).select('id,name,amount,category,date,payment_method,notes,receipt_image_url,receipt_file_name,ai_extracted_data,ai_confidence_score,created_at,updated_at').single();
          if (error) throw error;
          Object.assign(item, created);
        } else {
          const { error } = await supabase.from('expense_items').update(payload).eq('id', id);
          if (error) throw error;
        }
      }

      applyEntryToSnapshot('expenses', item, mode);
      setEntryOpen(false);
      setExpenseForm(emptyExpenseForm());
      showEntryMessage('ok', mode === 'create' ? t('success') : t('updateSuccess'));
    } catch (err) {
      showEntryMessage('err', err instanceof Error ? err.message : t('error'));
    } finally {
      setEntrySaving(false);
    }
  }

  async function savePendingReceiptExpenses(selectedOnly = true) {
    if (entrySaving) return;
    const candidates = pendingReceiptExpenses.filter(item => (!selectedOnly || item.selected) && item.name.trim() && Number(item.amount) > 0);
    if (!candidates.length) {
      showEntryMessage('err', expenseText('amountNotDetected', lang));
      return;
    }
    setEntrySaving(true);
    let successCount = 0;
    let failedCount = 0;
    const now = new Date().toISOString();
    const savedItems: SmartExpense[] = [];

    for (const receipt of candidates) {
      try {
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${successCount}`;
        const uploaded = await uploadReceiptFile(receipt.file, id, receipt.previewUrl);
        const item: SmartExpense = {
          id,
          name: receipt.name.trim() || receiptFallbackName(lang),
          amount: Number(receipt.amount),
          category: receipt.category,
          date: receipt.date,
          payment_method: receipt.paymentMethod,
          notes: receipt.notes,
          receipt_image_url: uploaded.receiptImageUrl,
          receipt_file_name: uploaded.receiptFileName,
          ai_extracted_data: receipt.aiExtractedData,
          ai_confidence_score: receipt.aiConfidenceScore,
          created_at: now,
          updated_at: now,
        };

        if (isGuest) {
          savedItems.push(item);
        } else {
          if (!user) throw new Error(t('entry_auth_required'));
          const payload = {
            user_id: user.id,
            name: item.name,
            amount: item.amount,
            category: item.category,
            date: item.date,
            payment_method: item.payment_method,
            notes: item.notes || null,
            receipt_image_url: item.receipt_image_url,
            receipt_file_name: item.receipt_file_name,
            ai_extracted_data: item.ai_extracted_data,
            ai_confidence_score: item.ai_confidence_score,
            updated_at: now,
          };
          const { data: created, error } = await supabase.from('expense_items').insert(payload).select('id,name,amount,category,date,payment_method,notes,receipt_image_url,receipt_file_name,ai_extracted_data,ai_confidence_score,created_at,updated_at').single();
          if (error) throw error;
          savedItems.push({ ...item, ...created });
        }
        successCount += 1;
      } catch (error) {
        console.error('Batch receipt save failed:', { fileName: receipt.fileName, error });
        failedCount += 1;
      }
    }

    if (isGuest && savedItems.length) {
      const current = readGuestItems('expenses') as SmartExpense[];
      writeGuestItems('expenses', [...savedItems, ...current]);
    }
    savedItems.reverse().forEach(item => applyEntryToSnapshot('expenses', item, 'create'));
    setPendingReceiptExpenses([]);
    setReceiptFiles([]);
    setExpenseForm(emptyExpenseForm());
    setEntryOpen(false);
    showEntryMessage('ok', textWithCount(expenseText('batchSaveResult', lang), { successCount, failedCount }));
    setEntrySaving(false);
  }

  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editableKind(kind) || entrySaving) return;

    const name = entryForm.name.trim();
    const amount = Number(entryForm.amount);
    if (!name || !amount || amount <= 0) {
      showEntryMessage('err', t('entry_validation_error'));
      return;
    }

    setEntrySaving(true);
    const mode = entryMode;
    const id = entryForm.id || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}`);

    try {
      if (isGuest) {
        const current = readGuestItems(kind);
        const item = kind === 'income'
          ? { id, name, label: name, category: entryForm.category || 'general', amount, created_at: new Date().toISOString() } as IncomeSource
          : { id, name, amount, created_at: new Date().toISOString() } as MoneyItem;
        const next = mode === 'create' ? [item, ...current] : current.map(existing => existing.id === id ? item : existing);
        writeGuestItems(kind, next);
        applyEntryToSnapshot(kind, item, mode);
      } else {
        if (!user) throw new Error(t('entry_auth_required'));
        if (kind === 'income') {
          if (mode === 'create') {
            const { data: created, error } = await supabase.from('monthly_income_sources').insert({
              user_id: user.id,
              category: entryForm.category || 'general',
              label: name,
              amount,
            }).select('id,label,category,amount').single();
            if (error) throw error;
            applyEntryToSnapshot(kind, { id: created.id, name: created.label || name, label: created.label, category: created.category, amount: Number(created.amount) || amount }, mode);
          } else {
            const { error } = await supabase.from('monthly_income_sources').update({
              category: entryForm.category || 'general',
              label: name,
              amount,
            }).eq('id', id);
            if (error) throw error;
            applyEntryToSnapshot(kind, { id, name, label: name, category: entryForm.category || 'general', amount }, mode);
          }
        } else {
          const table = kind === 'expenses' ? 'expense_items' : kind === 'savings' ? 'savings_items' : 'investment_items';
          if (mode === 'create') {
            const { data: created, error } = await supabase.from(table).insert({
              user_id: user.id,
              name,
              amount,
            }).select('id,name,amount,created_at').single();
            if (error) throw error;
            applyEntryToSnapshot(kind, { id: created.id, name: created.name, amount: Number(created.amount) || amount, created_at: created.created_at }, mode);
          } else {
            const { error } = await supabase.from(table).update({ name, amount }).eq('id', id);
            if (error) throw error;
            applyEntryToSnapshot(kind, { id, name, amount }, mode);
          }
        }
      }

      setEntryOpen(false);
      setEntryForm(emptyEntryForm);
      showEntryMessage('ok', mode === 'create' ? t('success') : t('updateSuccess'));
    } catch (err) {
      showEntryMessage('err', err instanceof Error ? err.message : t('error'));
    } finally {
      setEntrySaving(false);
    }
  }

  async function deleteEntry() {
    if (!editableKind(kind) || !confirmDelete || entrySaving) return;

    setEntrySaving(true);
    try {
      if (isGuest) {
        const next = readGuestItems(kind).filter(item => item.id !== confirmDelete.id);
        writeGuestItems(kind, next);
      } else {
        if (!user) throw new Error(t('entry_auth_required'));
        const table = kind === 'income' ? 'monthly_income_sources' : kind === 'expenses' ? 'expense_items' : kind === 'savings' ? 'savings_items' : 'investment_items';
        const { error } = await supabase.from(table).delete().eq('id', confirmDelete.id);
        if (error) throw error;
      }

      setSnapshot(prev => {
        if (kind === 'income') return { ...prev, income: prev.income.filter(item => item.id !== confirmDelete.id) };
        if (kind === 'expenses') return { ...prev, expenses: prev.expenses.filter(item => item.id !== confirmDelete.id) };
        if (kind === 'savings') return { ...prev, savings: prev.savings.filter(item => item.id !== confirmDelete.id) };
        return { ...prev, investments: prev.investments.filter(item => item.id !== confirmDelete.id) };
      });
      setConfirmDelete(null);
      showEntryMessage('ok', t('deleteSuccess'));
    } catch (err) {
      showEntryMessage('err', err instanceof Error ? err.message : t('error'));
    } finally {
      setEntrySaving(false);
    }
  }

  function openEditGoal(goal: GoalItem) {
    setGoalError('');
    const notes = parseGoalNotes(goal.notes);
    setGoalMode('edit');
    setGoalForm({
      id: goal.id,
      name: goal.name,
      goalType: goal.goal_type || 'saving',
      targetAmount: String(goal.target_amount || ''),
      currentAmount: String(goal.current_amount || ''),
      monthlyContribution: String(goal.monthly_contribution || ''),
      deadline: goal.deadline || '',
      category: goal.category || 'general',
      priority: goal.priority || 'medium',
      fundingSource: goal.funding_source || 'salary',
      currency: goal.currency || currency || 'KWD',
      notes: typeof notes.description === 'string' ? notes.description : '',
      aiEnabled: goal.ai_enabled,
    });
    setGoalEditOpen(true);
  }

  function openCreateGoal() {
    const nextMonth = addMonths(new Date(), 12);
    setGoalError('');
    setGoalMode('create');
    setGoalForm({
      ...emptyGoalForm,
      currency: currency || 'KWD',
      deadline: formatDateInput(nextMonth),
    });
    setGoalEditOpen(true);
  }

  async function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (goalSaving) return;

    const name = goalForm.name.trim();
    const targetAmount = parseMoney(goalForm.targetAmount);
    const currentAmount = parseMoney(goalForm.currentAmount);
    const monthlyContribution = parseMoney(goalForm.monthlyContribution);

    const deadlineDate = goalForm.deadline ? new Date(goalForm.deadline) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!name || !targetAmount || targetAmount <= 0) {
      setGoalError(t('goal_validation_required'));
      return;
    }
    if (currentAmount < 0 || monthlyContribution < 0) {
      setGoalError(t('goal_validation_positive'));
      return;
    }
    if (currentAmount > targetAmount) {
      setGoalError(t('goal_validation_current_over_target'));
      return;
    }
    if (!deadlineDate || Number.isNaN(deadlineDate.getTime()) || deadlineDate <= today) {
      setGoalError(t('goal_validation_future_deadline'));
      return;
    }

    setGoalSaving(true);
    setGoalError('');

    const notes = JSON.stringify({
      currentAmount,
      monthlyContribution,
      goalType: goalForm.goalType,
      deadline: goalForm.deadline || null,
      category: goalForm.category,
      priority: goalForm.priority,
      fundingSource: goalForm.fundingSource,
      currency: goalForm.currency,
      description: goalForm.notes.trim() || null,
      aiEnabled: goalForm.aiEnabled,
    });
    const months = monthsBetween(new Date(), goalForm.deadline);

    try {
      if (!user) throw new Error(t('entry_auth_required'));
      const payload = {
        goal: name,
        amount: targetAmount,
        current_amount: currentAmount,
        duration: months ? String(months) : null,
        duration_unit: months ? 'month' : null,
        notes,
      };

      if (goalMode === 'create') {
        let insertResult = await supabase.from('financial_goals').insert({
          ...payload,
          user_id: user.id,
        }).select('id, goal, amount, duration, duration_unit, notes, created_at').single();
        if (insertResult.error && /current_amount|column|schema|PGRST/i.test(insertResult.error.message)) {
          const { current_amount: _currentAmount, ...legacyPayload } = payload;
          insertResult = await supabase.from('financial_goals').insert({
            ...legacyPayload,
            user_id: user.id,
          }).select('id, goal, amount, duration, duration_unit, notes, created_at').single();
        }
        const { data: created, error } = insertResult;
        if (error) throw error;
        setSnapshot(prev => ({
          ...prev,
          goals: [goalFromRow(created as GoalRow), ...prev.goals],
        }));
      } else {
        let updateResult = await supabase.from('financial_goals').update(payload).eq('id', goalForm.id).eq('user_id', user.id);
        if (updateResult.error && /current_amount|column|schema|PGRST/i.test(updateResult.error.message)) {
          const { current_amount: _currentAmount, ...legacyPayload } = payload;
          updateResult = await supabase.from('financial_goals').update(legacyPayload).eq('id', goalForm.id).eq('user_id', user.id);
        }
        const { error } = updateResult;
        if (error) throw error;

        setSnapshot(prev => ({
          ...prev,
          goals: prev.goals.map(goal => goal.id === goalForm.id ? {
            ...goal,
            name,
            target_amount: targetAmount,
            current_amount: currentAmount,
            monthly_contribution: monthlyContribution,
            goal_type: goalForm.goalType,
            deadline: goalForm.deadline || null,
            category: goalForm.category,
            priority: goalForm.priority,
            funding_source: goalForm.fundingSource,
            currency: goalForm.currency,
            ai_enabled: goalForm.aiEnabled,
            notes,
          } : goal),
        }));
      }

      setGoalEditOpen(false);
      showEntryMessage('ok', goalMode === 'create' ? t('goal_create_success') : t('goal_update_success'));
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : t('goal_update_error'));
      showEntryMessage('err', err instanceof Error ? err.message : t('goal_update_error'));
    } finally {
      setGoalSaving(false);
    }
  }

  useEffect(() => {
    if (!entryOpen && !confirmDelete && !goalEditOpen && !receiptDetails) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEntryOpen(false);
        setConfirmDelete(null);
        setGoalEditOpen(false);
        setReceiptDetails(null);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [confirmDelete, entryOpen, goalEditOpen, receiptDetails]);

  async function sendAiMessage() {
    const content = chatValue.trim();
    if (!content || chatLoading) return;

    const nextHistory: ChatMessage[] = [...chatHistory, { role: 'user', content }];
    setChatHistory(nextHistory);
    setChatValue('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/projects-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory }),
      });
      const result = await response.json() as { text?: string };
      setChatHistory([...nextHistory, {
        role: 'assistant',
        content: result.text || t('ai_fallback'),
      }]);
    } catch {
      setChatHistory([...nextHistory, {
        role: 'assistant',
        content: t('ai_unavailable'),
      }]);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="sfm-shell" dir={dir}>
        <div className="sfm-spinner" />
        <style>{baseStyles}</style>
      </div>
    );
  }

  const dataError = dataErrorCopy(snapshot.error, lang);

  if (kind === 'expenses') {
    const visibleExpenses = filteredExpenses.slice(0, visibleCount);
    const monthlyExpenses = data.expenses.filter(item => {
      const d = new Date(item.date || item.created_at || 0);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthlyTotal = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
    const recurringTotal = data.expenses.filter(item => ['subscriptions', 'bills', 'loans'].includes(item.category || '')).reduce((sum, item) => sum + item.amount, 0);

    return (
      <div className="sfm-shell expense-smart-shell" dir={dir}>
        <Sidebar />
        <main className="sfm-main expense-smart-main">
          <section className="expense-hero">
            <div>
              <span className="eyebrow"><Sparkles size={14} /> {expenseText('aiInsights', lang)}</span>
              <h1>{expenseText('smartTitle', lang)}</h1>
              <p>{expenseText('smartSubtitle', lang)}</p>
            </div>
            <div className="expense-hero-actions">
              <button type="button" className="ghost-btn" onClick={openReceiptScan}>
                <Camera size={17} />
                {expenseText('uploadReceipt', lang)}
              </button>
              <button type="button" className="primary-btn" onClick={openCreateEntry}>
                <Plus size={17} />
                {expenseText('addExpense', lang)}
              </button>
            </div>
          </section>

          {dataError && (
            <div className="notice data-error-notice">
              <strong>{dataError.title}</strong>
              <span>{dataError.body}</span>
              <small>{dataError.queryName}</small>
              <button type="button" onClick={() => window.location.reload()}>{isAr ? 'إعادة المحاولة' : lang === 'fr' ? 'Reessayer' : 'Retry'}</button>
            </div>
          )}

          <section className="expense-kpi-grid">
            {cards.map(card => (
              <article key={pick(card.title, lang)} className="kpi-card">
                <span style={{ background: card.tone }} />
                <p>{pick(card.title, lang)}</p>
                <strong>{card.value}</strong>
                <small>{pick(card.body, lang)}</small>
              </article>
            ))}
          </section>

          <section className="expense-dashboard-grid">
            <div className="panel expense-list-panel">
              <div className="panel-head">
                <div>
                  <p>{t('page_details')}</p>
                  <h3>{sectionTitle(kind, lang)}</h3>
                </div>
                {dataLoading && <span className="loading-pill">{t('loading')}</span>}
              </div>

              <div className="row-controls">
                <input className="row-search" type="search" placeholder={t('search')} value={rowSearch} onChange={e => setRowSearch(e.target.value)} />
                <select className="row-select" value={rowRange} onChange={e => setRowRange(e.target.value as typeof rowRange)}>
                  <option value="all">{t('filter_all')}</option>
                  <option value="month">{t('filter_month')}</option>
                  <option value="last3">{t('filter_last3')}</option>
                  <option value="year">{t('filter_year')}</option>
                </select>
                <select className="row-select" value={rowSort} onChange={e => setRowSort(e.target.value as typeof rowSort)}>
                  <option value="dateDesc">{t('sort_newest')}</option>
                  <option value="dateAsc">{t('sort_oldest')}</option>
                  <option value="amountDesc">{t('sort_highest')}</option>
                  <option value="amountAsc">{t('sort_lowest')}</option>
                </select>
              </div>

              {data.expenses.length === 0 ? (
                <div className="expense-empty">
                  <div><Receipt size={34} /></div>
                  <h3>{expenseText('emptyTitle', lang)}</h3>
                  <p>{expenseText('emptyBody', lang)}</p>
                  <div>
                    <button type="button" className="primary-btn" onClick={openCreateEntry}>{expenseText('addExpense', lang)}</button>
                    <button type="button" className="ghost-form-btn" onClick={openReceiptScan}>{expenseText('uploadReceipt', lang)}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="row-count">
                    {isAr
                      ? `يعرض ${Math.min(visibleCount, filteredExpenses.length)} من ${filteredExpenses.length}`
                      : `Showing ${Math.min(visibleCount, filteredExpenses.length)} of ${filteredExpenses.length}`}
                    {' · '}
                    {money(visibleExpenses.reduce((s, item) => s + item.amount, 0), lang, currency)}
                  </div>
                  <div className="expense-card-list">
                    {visibleExpenses.map(item => {
                      const hasReceipt = Boolean(item.receipt_image_url || item.receipt_file_name);
                      const aiAdded = Boolean(item.ai_extracted_data || item.ai_confidence_score);
                      return (
                        <article className="expense-card-row" key={item.id}>
                          <div className="expense-row-main">
                            <div className="expense-row-icon"><ReceiptText size={19} /></div>
                            <div>
                              <strong>{item.name.replace(/^خيرية:\d{4}-\d{2}:/, '')}</strong>
                              <span>{item.date || (item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : '')} · {paymentLabel(item.payment_method, lang)}</span>
                              <div className="expense-badges">
                                <em>{categoryLabel(item.category, lang)}</em>
                                <em className={hasReceipt ? 'ok' : ''}>{hasReceipt ? expenseText('hasReceipt', lang) : expenseText('noReceipt', lang)}</em>
                                {aiAdded && <em className="ai">{expenseText('aiAdded', lang)}</em>}
                              </div>
                            </div>
                          </div>
                          <div className="expense-row-actions">
                            <b>{money(item.amount, lang, currency)}</b>
                            <div>
                              {hasReceipt && (
                                <button type="button" className="row-action" onClick={() => setReceiptDetails(item)} aria-label={expenseText('viewReceipt', lang)} title={expenseText('viewReceipt', lang)}>
                                  <Eye size={15} />
                                </button>
                              )}
                              <button type="button" className="row-action" onClick={() => openEditEntry(item)} aria-label={t('edit')} title={t('edit')}>
                                <Edit3 size={15} />
                              </button>
                              <button type="button" className="row-action" onClick={() => setConfirmDelete(item)} aria-label={t('delete')} title={t('delete')}>
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {filteredExpenses.length > visibleCount && (
                    <button type="button" className="load-more-btn" onClick={() => setVisibleCount(v => v + 30)}>
                      {t('load_more').replace('{n}', String(filteredExpenses.length - visibleCount))}
                    </button>
                  )}
                </>
              )}
            </div>

            <aside className="expense-side-stack">
              <section className="panel">
                <div className="panel-head compact">
                  <div>
                    <p>{expenseText('aiInsights', lang)}</p>
                    <h3>{t('suggestions_now')}</h3>
                  </div>
                  <Bot size={21} />
                </div>
                <div className="insight-list">
                  {insights.map(item => (
                    <div key={item.title}>
                      <Flag size={16} />
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.body}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel monthly-panel">
                <div className="panel-head compact">
                  <div>
                    <p>{expenseText('monthlySummary', lang)}</p>
                    <h3>{money(monthlyTotal, lang, currency)}</h3>
                  </div>
                  <ChartPie size={21} />
                </div>
                <div className="monthly-grid">
                  <div><span>{t('filter_month')}</span><b>{monthlyExpenses.length}</b></div>
                  <div><span>{expenseText('hasReceipt', lang)}</span><b>{monthlyExpenses.filter(item => item.receipt_image_url || item.receipt_file_name).length}</b></div>
                  <div><span>{expenseText('aiAdded', lang)}</span><b>{monthlyExpenses.filter(item => item.ai_extracted_data || item.ai_confidence_score).length}</b></div>
                  <div><span>{pick({ ar: 'المتكرر', en: 'Recurring', fr: 'Recurrent' }, lang)}</span><b>{money(recurringTotal, lang, currency)}</b></div>
                </div>
              </section>
            </aside>
          </section>

          <button type="button" className="expense-floating-add" onClick={openCreateEntry} aria-label={expenseText('addExpense', lang)}>
            <Plus size={22} />
          </button>
        </main>

        {entryOpen && (
          <div className="entry-overlay expense-modal-overlay" role="presentation" onMouseDown={() => setEntryOpen(false)}>
            <div className="entry-modal expense-smart-modal" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title" onMouseDown={event => event.stopPropagation()}>
              <div className="entry-modal-head">
                <div>
                  <p>{entryMode === 'edit' ? t('update') : expenseText('addExpense', lang)}</p>
                  <h3 id="expense-modal-title">{expenseModalMode === 'scan' ? expenseText('scanTab', lang) : expenseText('manualTab', lang)}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={() => setEntryOpen(false)} aria-label={t('close')}><X size={18} /></button>
              </div>

              <div className="expense-modal-tabs">
                <button type="button" className={expenseModalMode === 'manual' ? 'active' : ''} onClick={() => setExpenseModalMode('manual')}>{expenseText('manualTab', lang)}</button>
                <button type="button" className={expenseModalMode === 'scan' ? 'active' : ''} onClick={() => setExpenseModalMode('scan')}>{expenseText('scanTab', lang)}</button>
              </div>

              <form className="entry-form expense-form-grid" onSubmit={saveExpense}>
                {expenseModalMode === 'scan' && (
                  <div className="receipt-scan-area">
                    <label className="receipt-drop">
                      <input type="file" accept="image/*,.pdf,application/pdf" multiple onChange={event => handleExpenseFiles(event.target.files)} />
                      {receiptFiles.length ? (
                        <div className="receipt-preview-grid">
                          {receiptFiles.map(({ file, previewUrl }) => (
                            <div key={`${file.name}-${file.size}`}>
                              {previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={previewUrl} alt={file.name} />
                              ) : <ReceiptText size={28} />}
                              <small>{file.name}</small>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span><Upload size={26} />{expenseText('uploadMultipleReceipts', lang)}<small>{expenseText('chooseImages', lang)}</small></span>
                      )}
                    </label>
                    {!!receiptFiles.length && (
                      <div className="receipt-selected-count">
                        {textWithCount(expenseText('selectedReceipts', lang), { count: receiptFiles.length })}
                      </div>
                    )}
                    <div className="receipt-scan-actions">
                      <button type="button" className="ghost-form-btn" onClick={() => handleExpenseFile(null)}>{expenseText('changeImage', lang)}</button>
                      <button type="button" className="ghost-form-btn" onClick={() => void analyzeReceipt()} disabled={receiptAnalyzing || !expenseForm.receiptFile || receiptFiles.length > 1}>
                        {receiptAnalyzing ? <RefreshCw size={15} className="spin-icon" /> : <Sparkles size={15} />}
                        {receiptAnalyzing ? expenseText('reading', lang) : expenseText('analyze', lang)}
                      </button>
                      <button type="button" className="primary-form-btn" onClick={() => void analyzeAllReceipts()} disabled={receiptAnalyzing || !receiptFiles.length}>
                        {receiptAnalyzing ? <RefreshCw size={15} className="spin-icon" /> : <Sparkles size={15} />}
                        {receiptAnalyzing ? expenseText('readingAll', lang) : expenseText('analyzeAll', lang)}
                      </button>
                    </div>
                    {receiptBatchProgress && <div className="receipt-selected-count">{receiptBatchProgress}</div>}
                    {receiptError && <div className="receipt-error">{receiptError}</div>}
                    {!!pendingReceiptExpenses.length && (
                      <div className="receipt-batch-review">
                        <div className="receipt-batch-head">
                          <button type="button" className="ghost-form-btn" onClick={() => setPendingReceiptExpenses(prev => prev.map(item => ({ ...item, selected: true })))}>{expenseText('selectAll', lang)}</button>
                          <button type="button" className="primary-form-btn" onClick={() => void savePendingReceiptExpenses(true)} disabled={entrySaving}>{expenseText('confirmSelected', lang)}</button>
                          <button type="button" className="primary-form-btn" onClick={() => void savePendingReceiptExpenses(false)} disabled={entrySaving}>{expenseText('confirmAll', lang)}</button>
                        </div>
                        {pendingReceiptExpenses.map(item => (
                          <div key={item.id} className={`receipt-review-card ${item.status}`}>
                            <label className="receipt-review-select">
                              <input type="checkbox" checked={item.selected} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, selected: event.target.checked } : row))} />
                              <span>{item.status === 'ready' ? expenseText('ready', lang) : item.status === 'review' ? expenseText('needsReview', lang) : expenseText('failed', lang)}</span>
                            </label>
                            <div className="receipt-review-body">
                              {item.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.previewUrl} alt={item.fileName} />
                              ) : <ReceiptText size={34} />}
                              <div className="receipt-review-fields">
                                <input value={item.name} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, name: event.target.value } : row))} />
                                <input inputMode="decimal" value={item.amount} placeholder={expenseText('amount', lang)} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, amount: event.target.value, status: Number(event.target.value) > 0 && row.status === 'failed' ? 'review' : row.status } : row))} />
                                <input type="date" value={item.date} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, date: event.target.value } : row))} />
                                <select value={item.category} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, category: event.target.value } : row))}>{EXPENSE_CATEGORIES.map(category => <option key={category.id} value={category.id}>{pick(category.label, lang)}</option>)}</select>
                                <select value={item.paymentMethod} onChange={event => setPendingReceiptExpenses(prev => prev.map(row => row.id === item.id ? { ...row, paymentMethod: event.target.value } : row))}>{PAYMENT_METHODS.map(method => <option key={method.id} value={method.id}>{pick(method.label, lang)}</option>)}</select>
                              </div>
                            </div>
                            <div className="receipt-review-meta">
                              <span>{expenseText('confidence', lang)}: {Math.round(item.aiConfidenceScore * 100)}%</span>
                              {item.error && <span>{item.error}</span>}
                            </div>
                            <div className="receipt-scan-actions">
                              <button type="button" className="ghost-form-btn" onClick={() => setPendingReceiptExpenses(prev => prev.filter(row => row.id !== item.id))}>{expenseText('removeReceipt', lang)}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {expenseForm.aiExtractedData && (
                      <div className="ai-result-card">
                        <div><CheckCircle2 size={18} /><strong>{expenseText('extracted', lang)}</strong></div>
                        <p>{expenseText('review', lang)}</p>
                        <dl>
                          <dt>{expenseText('merchant', lang)}</dt><dd>{expenseForm.aiExtractedData.merchantName || expenseForm.name || '-'}</dd>
                          <dt>{expenseText('amount', lang)}</dt><dd>{expenseForm.amount ? money(Number(expenseForm.amount), lang, currency) : '-'}</dd>
                          <dt>{expenseText('date', lang)}</dt><dd>{expenseForm.date}</dd>
                          <dt>{expenseText('suggestedCategory', lang)}</dt><dd>{categoryLabel(expenseForm.category, lang)}</dd>
                          <dt>{expenseText('confidence', lang)}</dt><dd>{Math.round((expenseForm.aiConfidenceScore || expenseForm.aiExtractedData.confidenceScore || 0.82) * 100)}%</dd>
                        </dl>
                        <div className="receipt-scan-actions">
                          <button type="submit" className="primary-form-btn">{expenseText('confirmOnly', lang)}</button>
                          <button type="button" className="ghost-form-btn" onClick={() => setExpenseModalMode('manual')}>{expenseText('editData', lang)}</button>
                          <button type="button" className="ghost-form-btn" onClick={() => void analyzeReceipt()}>{expenseText('reanalyze', lang)}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <label><span>{expenseText('name', lang)}</span><input value={expenseForm.name} onChange={event => setExpenseForm(prev => ({ ...prev, name: event.target.value }))} autoFocus /></label>
                <label><span>{expenseText('amount', lang)}</span><input inputMode="decimal" value={expenseForm.amount} onChange={event => setExpenseForm(prev => ({ ...prev, amount: event.target.value }))} /></label>
                <label><span>{expenseText('category', lang)}</span><select value={expenseForm.category} onChange={event => setExpenseForm(prev => ({ ...prev, category: event.target.value }))}>{EXPENSE_CATEGORIES.map(item => <option key={item.id} value={item.id}>{pick(item.label, lang)}</option>)}</select></label>
                <label><span>{expenseText('date', lang)}</span><input type="date" value={expenseForm.date} onChange={event => setExpenseForm(prev => ({ ...prev, date: event.target.value }))} /></label>
                <label><span>{expenseText('paymentMethod', lang)}</span><select value={expenseForm.paymentMethod} onChange={event => setExpenseForm(prev => ({ ...prev, paymentMethod: event.target.value }))}>{PAYMENT_METHODS.map(item => <option key={item.id} value={item.id}>{pick(item.label, lang)}</option>)}</select></label>
                <label><span>{expenseText('attachReceipt', lang)}</span><input type="file" accept="image/*,application/pdf" capture="environment" onChange={event => handleExpenseFile(event.target.files?.[0] || null)} /></label>
                <label className="expense-notes"><span>{expenseText('notes', lang)}</span><textarea value={expenseForm.notes} onChange={event => setExpenseForm(prev => ({ ...prev, notes: event.target.value }))} /></label>

                <div className="entry-actions expense-actions">
                  <button type="button" className="ghost-form-btn" onClick={() => setEntryOpen(false)} disabled={entrySaving}>{t('cancel')}</button>
                  <button type="submit" className="primary-form-btn" disabled={entrySaving}>{entrySaving ? t('saving') : expenseText('confirmAdd', lang)}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {receiptDetails && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setReceiptDetails(null)}>
            <div className="entry-modal receipt-details-modal" role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
              <div className="entry-modal-head">
                <div><p>{expenseText('extractedData', lang)}</p><h3>{expenseText('receiptDetails', lang)}</h3></div>
                <button type="button" className="icon-btn" onClick={() => setReceiptDetails(null)} aria-label={t('close')}><X size={18} /></button>
              </div>
              {receiptDetails.receipt_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="receipt-detail-image" src={receiptDetails.receipt_image_url} alt={expenseText('originalImage', lang)} />
              )}
              <div className="receipt-detail-grid">
                <div><span>{expenseText('merchant', lang)}</span><b>{receiptDetails.ai_extracted_data?.merchantName || receiptDetails.name}</b></div>
                <div><span>{expenseText('amount', lang)}</span><b>{money(receiptDetails.amount, lang, currency)}</b></div>
                <div><span>{expenseText('date', lang)}</span><b>{receiptDetails.date || '-'}</b></div>
                <div><span>{expenseText('category', lang)}</span><b>{categoryLabel(receiptDetails.category, lang)}</b></div>
                <div><span>{expenseText('confidence', lang)}</span><b>{receiptDetails.ai_confidence_score ? `${Math.round(receiptDetails.ai_confidence_score * 100)}%` : '-'}</b></div>
              </div>
              {!!receiptDetails.ai_extracted_data?.items?.length && (
                <div className="receipt-items">
                  <strong>{expenseText('receiptItems', lang)}</strong>
                  {receiptDetails.ai_extracted_data.items.map((item, index) => <span key={`${item.name}-${index}`}>{item.name}<b>{money(normalizeReceiptNumber(item.total) ?? normalizeReceiptNumber(item.price) ?? 0, lang, currency)}</b></span>)}
                </div>
              )}
              <div className="entry-actions">
                <button type="button" className="ghost-form-btn" onClick={() => { openEditEntry(receiptDetails); setReceiptDetails(null); }}>{t('edit')}</button>
                <button type="button" className="danger-form-btn" onClick={() => { setConfirmDelete(receiptDetails); setReceiptDetails(null); }}>{t('delete')}</button>
              </div>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setConfirmDelete(null)}>
            <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" onMouseDown={event => event.stopPropagation()}>
              <div className="confirm-icon"><Trash2 size={24} /></div>
              <h3 id="confirm-delete-title">{t('confirmDelete')}</h3>
              <p>{t(deleteConfirmKey(kind))}</p>
              <small>{t('deleteWarning')}</small>
              <div className="entry-actions">
                <button type="button" className="ghost-form-btn" onClick={() => setConfirmDelete(null)} disabled={entrySaving}>{t('cancel')}</button>
                <button type="button" className="danger-form-btn" onClick={() => void deleteEntry()} disabled={entrySaving}>{entrySaving ? t('saving') : t('delete')}</button>
              </div>
            </div>
          </div>
        )}

        {entryMessage && <div className={`entry-toast ${entryMessage.type}`}>{entryMessage.text}</div>}
        <style>{baseStyles + expenseSmartStyles}</style>
      </div>
    );
  }

  return (
    <div className="sfm-shell" dir={dir}>
      <Sidebar />

      <main className="sfm-main">
        <header className="sfm-header">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="title-wrap">
            <div className="title-icon" style={{ '--accent': meta.accent } as CSSProperties}>
              <Icon size={22} />
            </div>
            <div>
              <p>{t('route_breadcrumb')}</p>
              <h1>{pick(meta.title, lang)}</h1>
            </div>
          </div>
          <div className="finance-header-lang">
            <LanguageSwitcher variant="gold" compact />
          </div>
          {isGuest && <span className="guest-pill">{t('guest_mode')}</span>}
        </header>

        {menuOpen && (
          <div className="mobile-panel">
            <div className="mobile-head">
              <span className="mobile-brand">
                <Image src="/sfm-logo.png" alt="THE SFM" width={32} height={32} priority />
                <strong>THE SFM</strong>
              </span>
              <button className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Close navigation">
                <X size={19} />
              </button>
            </div>
            {navItems.map(item => {
              const NavIcon = item.icon;
              return (
                <button key={item.href} onClick={() => { setMenuOpen(false); router.push(item.href); }}>
                  <NavIcon size={18} />
                  {pick(item.label, lang)}
                </button>
              );
            })}
          </div>
        )}

        <section className="hero">
          <div>
            <span className="eyebrow">{t('active_route')}</span>
            <h2>{pick(meta.title, lang)}</h2>
            <p>{pick(meta.subtitle, lang)}</p>
          </div>
          <div className="hero-actions">
            {buildPrimaryActions(kind, lang, openCreateEntry, openCreateGoal, () => {
              const input = document.getElementById('ai-chat-input');
              input?.focus();
            }).map(action => (
              <button key={action.label} className={action.variant === 'print' ? 'ghost-btn' : 'primary-btn'} onClick={action.onClick}>
                <action.icon size={17} />
                {action.label}
              </button>
            ))}
          </div>
        </section>

        {dataError && (
          <div className="notice data-error-notice">
            <strong>{dataError.title}</strong>
            <span>{dataError.body}</span>
            <small>{dataError.queryName}</small>
            <button type="button" onClick={() => window.location.reload()}>{isAr ? 'إعادة المحاولة' : lang === 'fr' ? 'Reessayer' : 'Retry'}</button>
          </div>
        )}

        <section className="kpi-grid">
          {cards.map(card => (
            <article key={pick(card.title, lang)} className="kpi-card">
              <span style={{ background: card.tone }} />
              <p>{pick(card.title, lang)}</p>
              <strong>{card.value}</strong>
              <small>{pick(card.body, lang)}</small>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="panel wide">
            <div className="panel-head">
              <div>
                <p>{t('page_details')}</p>
                <h3>{sectionTitle(kind, lang)}</h3>
              </div>
              {dataLoading && <span className="loading-pill">{t('loading')}</span>}
            </div>

            {editableKind(kind) && (
              <div className="row-controls">
                <input
                  type="search"
                  className="row-search"
                  placeholder={t('search')}
                  value={rowSearch}
                  onChange={e => setRowSearch(e.target.value)}
                />
                <select className="row-select" value={rowRange} onChange={e => setRowRange(e.target.value as typeof rowRange)}>
                  <option value="all">{t('filter_all')}</option>
                  <option value="month">{t('filter_month')}</option>
                  <option value="last3">{t('filter_last3')}</option>
                  <option value="year">{t('filter_year')}</option>
                </select>
                <select className="row-select" value={rowSort} onChange={e => setRowSort(e.target.value as typeof rowSort)}>
                  <option value="dateDesc">{t('sort_newest')}</option>
                  <option value="dateAsc">{t('sort_oldest')}</option>
                  <option value="amountDesc">{t('sort_highest')}</option>
                  <option value="amountAsc">{t('sort_lowest')}</option>
                </select>
              </div>
            )}

            {editableKind(kind) && rows.length > 0 && (
              <div className="row-count">
                {isAr
                  ? `يعرض ${Math.min(visibleCount, filteredRows.length)} من ${filteredRows.length} ${rows.length !== filteredRows.length ? `(المجموع ${rows.length})` : ''}`
                  : `Showing ${Math.min(visibleCount, filteredRows.length)} of ${filteredRows.length}${rows.length !== filteredRows.length ? ` (total ${rows.length})` : ''}`}
                {' · '}
                {money(filteredRows.slice(0, visibleCount).reduce((s, r) => s + (r.item?.amount ?? 0), 0), isAr, currency)}
              </div>
            )}

            <div className="row-list">
              {kind === 'goals' && data.goals.length === 0 && (
                <div className="empty-state">{t('goals_empty_state')}</div>
              )}
              {kind === 'goals' && data.goals.map(goal => {
                const analysis = buildGoalAnalysis(goal, data, lang, currency, t);
                const goalProgress = calculateGoalProgress(goal);
                const done = goalProgress.progressPercent;
                return (
                  <article className="goal-card" key={goal.id}>
                    <div className="goal-card-head">
                      <div className="goal-title-wrap">
                        <span className="goal-icon">{goal.icon || '🎯'}</span>
                        <div>
                          <strong>{goal.name}</strong>
                          <span>{t('goal_remaining_amount')}: {money(analysis.remainingAmount, lang, goal.currency || currency)}</span>
                        </div>
                      </div>
                      <button type="button" className="goal-edit-btn" onClick={() => openEditGoal(goal)}>
                        <Edit3 size={15} />
                        {t('goal_edit_button')}
                      </button>
                    </div>
                    <div className="goal-progress-row">
                      <div className="goal-progress-track">
                        <span style={{ width: `${done}%` }} />
                      </div>
                      <b>{done}%</b>
                    </div>
                    <div className="goal-meta-grid">
                      <div><span>{t('goal_target_amount')}</span><strong>{goalProgress.targetAmount > 0 ? money(goalProgress.targetAmount, lang, goal.currency || currency) : t('goal_missing_target_hint')}</strong></div>
                      <div><span>{t('goal_current_amount')}</span><strong>{money(goalProgress.currentAmount, lang, goal.currency || currency)}</strong></div>
                      <div><span>{t('goal_remaining_amount')}</span><strong>{money(goalProgress.remainingAmount, lang, goal.currency || currency)}</strong></div>
                      <div><span>{t('goal_monthly_contribution')}</span><strong>{money(goal.monthly_contribution, lang, goal.currency || currency)}</strong></div>
                    </div>
                    <div className="goal-ai-card">
                      <div className="goal-ai-head">
                        <Bot size={18} />
                        <strong>{t('goal_ai_title')}</strong>
                        <span className={`risk-pill ${analysis.riskClass}`}>{analysis.riskLabel}</span>
                      </div>
                      <div className="goal-ai-metrics">
                        <div><span>{t('goal_required_monthly')}</span><b>{money(analysis.requiredMonthlySaving, lang, goal.currency || currency)}</b></div>
                        <div><span>{t('goal_estimated_completion')}</span><b>{analysis.estimatedCompletion}</b></div>
                        <div><span>{t('goal_status_label')}</span><b>{analysis.statusLabel}</b></div>
                        <div><span>{t('goal_adjustment_label')}</span><b>{money(analysis.adjustment, lang, goal.currency || currency)}</b></div>
                      </div>
                      <p>{analysis.summary}</p>
                      <div className="goal-ai-plan">
                        <strong>{t('goal_plan_title')}</strong>
                        <ol>
                          {analysis.steps.map(step => <li key={step}>{step}</li>)}
                        </ol>
                      </div>
                    </div>
                  </article>
                );
              })}
              {kind !== 'goals' && filteredRows.length === 0 && (
                <div className="empty-state">{t('no_data_saved')}</div>
              )}
              {kind !== 'goals' && (editableKind(kind) ? filteredRows.slice(0, visibleCount) : filteredRows).map(row => (
                <div className="data-row" key={row.id}>
                  <div>
                    <strong>{row.title}</strong>
                    <span>{row.subtitle}</span>
                  </div>
                  <div className="row-actions-wrap">
                    <b>{row.value}</b>
                    {editableKind(kind) && row.item && (
                      <div className="row-actions">
                        <button type="button" className="row-action" onClick={() => openEditEntry(row.item!)} aria-label={t('edit')} title={t('edit')}>
                          <Edit3 size={15} />
                        </button>
                        <button type="button" className="row-action" onClick={() => setConfirmDelete(row.item!)} aria-label={t('delete')} title={t('delete')}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {editableKind(kind) && filteredRows.length > visibleCount && (
                <button type="button" className="load-more-btn" onClick={() => setVisibleCount(v => v + 30)}>
                  {t('load_more').replace('{n}', String(filteredRows.length - visibleCount))}
                </button>
              )}
            </div>
          </div>

          <aside className="panel">
            <div className="panel-head compact">
              <div>
                <p>{t('smart_insights')}</p>
                <h3>{t('suggestions_now')}</h3>
              </div>
              <Gauge size={21} />
            </div>
            <div className="insight-list">
              {insights.map(item => (
                <div key={item.title}>
                  <Flag size={16} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        {kind === 'ai' ? (
          <section className="ai-panel">
            <div>
              <h3>{t('ask_assistant')}</h3>
              <p>{t('ai_chat_hint')}</p>
            </div>
            <div className="chat-history">
              {(chatHistory.length ? chatHistory : [{ role: 'assistant' as const, content: t('ai_welcome') }]).map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role}>
                  {message.content}
                </div>
              ))}
            </div>
            <div className="chat-box">
              <input
                id="ai-chat-input"
                value={chatValue}
                onChange={event => setChatValue(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') void sendAiMessage();
                }}
                placeholder={t('ai_placeholder')}
              />
              <button aria-label="Send message" onClick={() => void sendAiMessage()} disabled={chatLoading}>
                <Send size={18} />
              </button>
            </div>
          </section>
        ) : (
          <section className="summary-band">
            <LineChart size={20} />
            <div>
              <strong>{summaryTitle(kind, lang)}</strong>
              <p>{summaryText(kind, data, lang, currency)}</p>
            </div>
          </section>
        )}

        {entryOpen && editableKind(kind) && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setEntryOpen(false)}>
            <div className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="entry-modal-title" onMouseDown={event => event.stopPropagation()}>
              <div className="entry-modal-head">
                <div>
                  <p>{entryMode === 'edit' ? t('update') : t('entry_save')}</p>
                  <h3 id="entry-modal-title">{t(entryTitleKey(kind))}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={() => setEntryOpen(false)} aria-label={t('close')}>
                  <X size={18} />
                </button>
              </div>
              <form className="entry-form" onSubmit={saveEntry}>
                <label>
                  <span>{t('entry_name')}</span>
                  <input
                    value={entryForm.name}
                    onChange={event => setEntryForm(prev => ({ ...prev, name: event.target.value }))}
                    autoFocus
                  />
                </label>
                <label>
                  <span>{t('entry_amount')}</span>
                  <input
                    inputMode="decimal"
                    value={entryForm.amount}
                    onChange={event => setEntryForm(prev => ({ ...prev, amount: event.target.value }))}
                  />
                </label>
                {kind === 'income' && (
                  <label>
                    <span>{t('entry_category')}</span>
                    <input
                      value={entryForm.category}
                      onChange={event => setEntryForm(prev => ({ ...prev, category: event.target.value }))}
                    />
                  </label>
                )}
                <div className="entry-actions">
                  <button type="button" className="ghost-form-btn" onClick={() => setEntryOpen(false)} disabled={entrySaving}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className="primary-form-btn" disabled={entrySaving}>
                    {entrySaving ? t('saving') : entryMode === 'edit' ? t('update') : t('entry_save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {goalEditOpen && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setGoalEditOpen(false)}>
            <div className="entry-modal goal-modal" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title" onMouseDown={event => event.stopPropagation()}>
              <div className="entry-modal-head">
                <div>
                  <p>{t('goal_edit_button')}</p>
                  <h3 id="goal-modal-title">{t('goal_edit_title')}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={() => setGoalEditOpen(false)} aria-label={t('close')}>
                  <X size={18} />
                </button>
              </div>
              <form className="entry-form goal-form-grid" onSubmit={saveGoal}>
                <label>
                  <span>{t('goal_name_label')}</span>
                  <input value={goalForm.name} onChange={event => setGoalForm(prev => ({ ...prev, name: event.target.value }))} autoFocus />
                </label>
                <label>
                  <span>{t('goal_type_label')}</span>
                  <select value={goalForm.goalType} onChange={event => setGoalForm(prev => ({ ...prev, goalType: event.target.value }))}>
                    <option value="debt">{t('goal_type_debt')}</option>
                    <option value="saving">{t('goal_type_saving')}</option>
                    <option value="investment">{t('goal_type_investment')}</option>
                    <option value="emergency">{t('goal_type_emergency')}</option>
                    <option value="asset">{t('goal_type_asset')}</option>
                    <option value="education">{t('goal_type_education')}</option>
                    <option value="travel">{t('goal_type_travel')}</option>
                    <option value="retirement">{t('goal_type_retirement')}</option>
                    <option value="custom">{t('goal_type_custom')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('goal_target_amount')}</span>
                  <div className="currency-input-wrap">
                    <span className="currency-symbol">{selectedCurrencySymbol}</span>
                    <input inputMode="decimal" value={goalForm.targetAmount} onChange={event => setGoalForm(prev => ({ ...prev, targetAmount: event.target.value }))} />
                  </div>
                </label>
                <label>
                  <span>{t('goal_current_amount')}</span>
                  <div className="currency-input-wrap">
                    <span className="currency-symbol">{selectedCurrencySymbol}</span>
                    <input inputMode="decimal" value={goalForm.currentAmount} onChange={event => setGoalForm(prev => ({ ...prev, currentAmount: event.target.value }))} />
                  </div>
                </label>
                <label>
                  <span>{t('goal_monthly_contribution')}</span>
                  <div className="currency-input-wrap">
                    <span className="currency-symbol">{selectedCurrencySymbol}</span>
                    <input inputMode="decimal" value={goalForm.monthlyContribution} onChange={event => setGoalForm(prev => ({ ...prev, monthlyContribution: event.target.value }))} />
                  </div>
                </label>
                <label>
                  <span>{t('goal_deadline')}</span>
                  <input type="date" value={goalForm.deadline} onChange={event => setGoalForm(prev => ({ ...prev, deadline: event.target.value }))} />
                </label>
                <label>
                  <span>{t('goal_category_label')}</span>
                  <select value={goalForm.category} onChange={event => setGoalForm(prev => ({ ...prev, category: event.target.value }))}>
                    <option value="general">{t('goal_category_general')}</option>
                    <option value="emergency">{t('goal_category_emergency')}</option>
                    <option value="home">{t('goal_category_home')}</option>
                    <option value="car">{t('goal_category_car')}</option>
                    <option value="education">{t('goal_category_education')}</option>
                    <option value="business">{t('goal_category_business')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('goal_priority_label')}</span>
                  <select value={goalForm.priority} onChange={event => setGoalForm(prev => ({ ...prev, priority: event.target.value }))}>
                    <option value="low">{t('goal_priority_low')}</option>
                    <option value="medium">{t('goal_priority_medium')}</option>
                    <option value="high">{t('goal_priority_high')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('goal_funding_source_label')}</span>
                  <select value={goalForm.fundingSource} onChange={event => setGoalForm(prev => ({ ...prev, fundingSource: event.target.value }))}>
                    <option value="salary">{t('goal_funding_salary')}</option>
                    <option value="investment_return">{t('goal_funding_investment_return')}</option>
                    <option value="expense_reduction">{t('goal_funding_expense_reduction')}</option>
                    <option value="extra_income">{t('goal_funding_extra_income')}</option>
                    <option value="automatic">{t('goal_funding_automatic')}</option>
                  </select>
                </label>
                <label>
                  <span>{t('goal_currency_label')}</span>
                  <CurrencySelect value={goalForm.currency} onChange={code => setGoalForm(prev => ({ ...prev, currency: code }))} lang={lang} ariaLabel={t('goal_currency_label')} />
                </label>
                <label className="goal-notes-field">
                  <span>{t('goal_notes_label')}</span>
                  <textarea value={goalForm.notes} onChange={event => setGoalForm(prev => ({ ...prev, notes: event.target.value }))} placeholder={t('optional')} />
                </label>
                <label className="goal-ai-toggle">
                  <span>{t('goal_ai_toggle')}</span>
                  <button
                    type="button"
                    className={goalForm.aiEnabled ? 'switch active' : 'switch'}
                    aria-pressed={goalForm.aiEnabled}
                    onClick={() => setGoalForm(prev => ({ ...prev, aiEnabled: !prev.aiEnabled }))}
                  >
                    <span />
                  </button>
                </label>
                {goalForm.aiEnabled && (
                  <div className="goal-modal-preview">
                    <div className="goal-ai-head">
                      <Bot size={18} />
                      <strong>{t('goal_ai_preview_title')}</strong>
                      <span className={`risk-pill ${goalPreview.riskClass}`}>{goalPreview.riskLabel}</span>
                    </div>
                    {goalPreview.missing.length > 0 ? (
                      <div className="preview-missing">
                        <strong>{t('goal_ai_missing_title')}</strong>
                        <ul>{goalPreview.missing.map(item => <li key={item}>{item}</li>)}</ul>
                      </div>
                    ) : (
                      <>
                        <div className="goal-ai-metrics">
                          <div><span>{t('goal_remaining_amount')}</span><b>{money(goalPreview.remainingAmount, lang, goalForm.currency || currency)}</b></div>
                          <div><span>{t('goal_required_monthly')}</span><b>{money(goalPreview.requiredMonthlySaving, lang, goalForm.currency || currency)}</b></div>
                          <div><span>{t('goal_current_contribution')}</span><b>{money(Number(goalForm.monthlyContribution) || 0, lang, goalForm.currency || currency)}</b></div>
                          <div><span>{t('goal_estimated_completion')}</span><b>{goalPreview.estimatedCompletion}</b></div>
                        </div>
                        <p>{goalPreview.summary}</p>
                        <div className="goal-ai-plan">
                          <strong>{t('goal_plan_title')}</strong>
                          <ol>{goalPreview.steps.map(step => <li key={step}>{step}</li>)}</ol>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {goalError && <div className="form-error">{goalError}</div>}
                <div className="entry-actions">
                  <button type="button" className="ghost-form-btn" onClick={() => setGoalEditOpen(false)} disabled={goalSaving}>
                    {t('cancel')}
                  </button>
                  <button type="submit" className="primary-form-btn" disabled={goalSaving}>
                    {goalSaving ? t('saving') : t('save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmDelete && editableKind(kind) && (
          <div className="entry-overlay" role="presentation" onMouseDown={() => setConfirmDelete(null)}>
            <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title" onMouseDown={event => event.stopPropagation()}>
              <div className="confirm-icon">
                <Trash2 size={24} />
              </div>
              <h3 id="confirm-delete-title">{t('confirmDelete')}</h3>
              <p>{t(deleteConfirmKey(kind))}</p>
              <small>{t('deleteWarning')}</small>
              <div className="entry-actions">
                <button type="button" className="ghost-form-btn" onClick={() => setConfirmDelete(null)} disabled={entrySaving}>
                  {t('cancel')}
                </button>
                <button type="button" className="danger-form-btn" onClick={() => void deleteEntry()} disabled={entrySaving}>
                  {entrySaving ? t('saving') : t('delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {entryMessage && (
          <div className={`entry-toast ${entryMessage.type}`}>
            {entryMessage.text}
          </div>
        )}
      </main>

      <style>{baseStyles}</style>
    </div>
  );
}

function buildCards(kind: PageKind, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD'): SectionCard[] {
  const isAr = lang === 'ar';
  const insufficient = pick({
    ar: 'بيانات غير كافية',
    en: 'Insufficient data',
    fr: 'Données insuffisantes',
  }, lang);
  const common = {
    income: money(data.totalIncome, lang, currency),
    expenses: money(data.totalExpenses, lang, currency),
    savings: money(data.totalSavings, lang, currency),
    investments: money(data.totalInvestments, lang, currency),
    balance: money(data.balance, lang, currency),
  };

  if (kind === 'expenses') {
    const categoryCount = new Set(data.expenses.map(item => item.category || 'other')).size;
    const aiCount = data.expenses.filter(item => item.ai_extracted_data || item.ai_confidence_score).length;
    const receiptCount = data.expenses.filter(item => item.receipt_image_url || item.receipt_file_name).length;
    return [
      { title: { ar: 'إجمالي المصروفات', en: 'Total expenses', fr: 'Total des depenses' }, body: { ar: 'كل المصروفات المسجلة لهذا الحساب.', en: 'All recorded expenses for this account.', fr: 'Toutes les depenses enregistrees.' }, value: common.expenses, tone: '#EF4444' },
      { title: { ar: 'مصروفات بالذكاء الاصطناعي', en: 'AI scanned expenses', fr: 'Depenses scannees IA' }, body: { ar: 'فواتير تمت قراءتها أو اقتراحها بالذكاء الاصطناعي.', en: 'Receipts read or suggested by AI.', fr: 'Factures lues ou suggerees par IA.' }, value: String(aiCount), tone: '#D8AE63' },
      { title: { ar: 'الفواتير المرفقة', en: 'Receipts attached', fr: 'Factures jointes' }, body: { ar: 'مصروفات تحتوي على صورة أو ملف فاتورة.', en: 'Expenses with receipt image or file.', fr: 'Depenses avec facture jointe.' }, value: String(receiptCount), tone: '#3B82F6' },
      { title: { ar: 'التصنيفات النشطة', en: 'Active categories', fr: 'Categories actives' }, body: { ar: 'تصنيفات مستخدمة في سجل المصروفات.', en: 'Categories used in your expense log.', fr: 'Categories utilisees dans le journal.' }, value: String(categoryCount), tone: '#22C55E' },
    ];
  }
  if (kind === 'income') return [
    { title: { ar: 'إجمالي الدخل', en: 'Total income' }, body: { ar: 'راتب، دخل جانبي، وأعمال.', en: 'Salary, side income, and business.' }, value: common.income, tone: '#22C55E' },
    { title: { ar: 'مصادر الدخل', en: 'Income sources' }, body: { ar: 'مصادر شهرية مسجلة فقط.', en: 'Recorded monthly sources only.', fr: 'Sources mensuelles enregistrées uniquement.' }, value: String(data.income.length), tone: '#D8AE63' },
    { title: { ar: 'الصافي المتوقع', en: 'Expected net' }, body: { ar: 'الدخل ناقص المصروفات الحالية.', en: 'Income minus current expenses.' }, value: common.balance, tone: '#111111' },
  ];
  if (kind === 'invest') return [
    { title: { ar: 'قيمة المحفظة', en: 'Portfolio value' }, body: { ar: 'إجمالي الاستثمارات المسجلة.', en: 'Total recorded investments.' }, value: common.investments, tone: '#3B82F6' },
    { title: { ar: 'المساهمة الشهرية', en: 'Monthly contribution', fr: 'Contribution mensuelle' }, body: { ar: 'أضف مساهمات شهرية فعلية لعرض هذا المؤشر.', en: 'Add real monthly contributions to show this metric.', fr: 'Ajoutez des contributions mensuelles réelles pour afficher cet indicateur.' }, value: insufficient, tone: '#22C55E' },
    { title: { ar: 'مستوى المخاطر', en: 'Risk level', fr: 'Niveau de risque' }, body: { ar: 'أضف توزيع الاستثمار لعرض مستوى المخاطر.', en: 'Add investment allocation to show risk level.', fr: 'Ajoutez la répartition des investissements pour afficher le risque.' }, value: insufficient, tone: '#D8AE63' },
  ];
  if (kind === 'savings') return [
    { title: { ar: 'إجمالي المدخرات', en: 'Total savings' }, body: { ar: 'مجموع عمليات الادخار المسجلة.', en: 'Total recorded savings entries.' }, value: common.savings, tone: '#22C55E' },
    { title: { ar: 'عدد السجلات', en: 'Entries count' }, body: { ar: 'سجلات الادخار النشطة.', en: 'Active saving records.' }, value: String(data.savings.length), tone: '#D8AE63' },
    { title: { ar: 'الصافي بعد الادخار', en: 'Net after savings' }, body: { ar: 'الدخل ناقص المصروفات والمدخرات.', en: 'Income minus expenses and savings.' }, value: money(data.balance - data.totalSavings, lang, currency), tone: '#3B82F6' },
  ];
  if (kind === 'goals') return [
    { title: { ar: 'الأهداف النشطة', en: 'Active goals' }, body: { ar: 'أهداف مالية قيد المتابعة.', en: 'Financial goals being tracked.' }, value: String(data.goals.length), tone: '#D8AE63' },
    { title: { ar: 'إجمالي المستهدف', en: 'Target total' }, body: { ar: 'مجموع مبالغ الأهداف.', en: 'Combined target amounts.' }, value: money(data.goals.reduce((total, goal) => total + goal.target_amount, 0), isAr, currency), tone: '#3B82F6' },
    { title: { ar: 'تقدم حالي', en: 'Current progress' }, body: { ar: 'مجموع المبالغ الحالية داخل الأهداف.', en: 'Combined current goal progress.' }, value: money(data.goals.reduce((total, goal) => total + goal.current_amount, 0), isAr, currency), tone: '#22C55E' },
  ];
  if (kind === 'reports') return [
    { title: { ar: 'الدخل مقابل المصروفات', en: 'Income vs expenses' }, body: { ar: 'مؤشر التوازن المالي الحالي.', en: 'Current financial balance signal.' }, value: common.balance, tone: '#111111' },
    { title: { ar: 'تقرير الادخار', en: 'Savings report' }, body: { ar: 'رصيد الادخار المسجل.', en: 'Recorded savings balance.' }, value: common.savings, tone: '#22C55E' },
    { title: { ar: 'تقرير الاستثمار', en: 'Investment report' }, body: { ar: 'إجمالي قيمة الاستثمارات.', en: 'Total investment value.' }, value: common.investments, tone: '#3B82F6' },
  ];
  return [
    { title: { ar: 'الصحة المالية', en: 'Financial health', fr: 'Santé financière' }, body: { ar: 'تحتاج إلى دخل ومصروفات فعلية لعرض النسبة.', en: 'Real income and expenses are required to show the score.', fr: 'Des revenus et dépenses réels sont requis pour afficher le score.' }, value: data.totalIncome > 0 && data.expenses.length > 0 ? `${progress(data.balance, data.totalIncome)}%` : insufficient, tone: '#06B6D4' },
    { title: { ar: 'فرصة ادخار', en: 'Savings opportunity' }, body: { ar: 'الفرق المتاح بعد المصروفات.', en: 'Potential surplus after expenses.' }, value: money(data.balance, lang, currency), tone: '#22C55E' },
    { title: { ar: 'تنبيه ذكي', en: 'Smart alert', fr: 'Alerte intelligente' }, body: { ar: 'أضف بيانات مالية كافية لعرض التنبيهات.', en: 'Add enough financial data to show alerts.', fr: 'Ajoutez suffisamment de données financières pour afficher les alertes.' }, value: insufficient, tone: '#D8AE63' },
  ];
}

function buildDataShape() {
  return {
    income: [] as IncomeSource[],
    expenses: [] as SmartExpense[],
    savings: [] as MoneyItem[],
    investments: [] as MoneyItem[],
    goals: [] as GoalItem[],
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    totalInvestments: 0,
    charityTotal: 0,
    balance: 0,
  };
}

function buildRows(kind: PageKind, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD', t?: TranslateFn): EntryRow[] {
  const isAr = lang === 'ar';
  if (kind === 'goals') {
    return data.goals.map(goal => {
      const goalProgress = calculateGoalProgress(goal);
      return {
        id: goal.id,
        title: goal.name,
        subtitle: pick({ ar: `تقدم ${goalProgress.progressPercent}%، المتبقي ${money(goalProgress.remainingAmount, lang, currency)}`, en: `${goalProgress.progressPercent}% complete, remaining ${money(goalProgress.remainingAmount, lang, currency)}`, fr: `${goalProgress.progressPercent}% accompli, reste ${money(goalProgress.remainingAmount, lang, currency)}` }, lang),
        value: money(goalProgress.targetAmount, lang, currency),
      };
    });
  }

  if (kind === 'reports') {
    return [
      { id: 'income-vs-expenses', title: pick({ ar: 'الدخل مقابل المصروفات', en: 'Income vs expenses', fr: 'Revenus vs dépenses' }, lang), subtitle: pick({ ar: 'ملخص التدفق النقدي الحالي', en: 'Current cash flow summary', fr: 'Résumé des flux de trésorerie' }, lang), value: money(data.balance, lang, currency) },
      { id: 'savings-report', title: pick({ ar: 'تقرير الادخار', en: 'Savings report', fr: "Rapport d'épargne" }, lang), subtitle: pick({ ar: 'رصيد الادخار المسجل', en: 'Recorded savings balance', fr: "Solde d'épargne enregistré" }, lang), value: money(data.totalSavings, lang, currency) },
      { id: 'investment-report', title: pick({ ar: 'تقرير الاستثمار', en: 'Investment report', fr: "Rapport d'investissement" }, lang), subtitle: pick({ ar: 'قيمة المحفظة الحالية', en: 'Current portfolio value', fr: 'Valeur actuelle du portefeuille' }, lang), value: money(data.totalInvestments, lang, currency) },
    ];
  }

  if (kind === 'ai') {
    return [
      { id: 'reduce-expenses', title: pick({ ar: 'خفض المصروفات', en: 'Reduce expenses', fr: 'Réduire les dépenses' }, lang), subtitle: pick({ ar: 'راجع أعلى 3 بنود صرف هذا الشهر.', en: 'Review the top 3 spending items this month.', fr: 'Examinez les 3 principales dépenses du mois.' }, lang), value: money(data.totalExpenses, lang, currency) },
      { id: 'increase-savings', title: pick({ ar: 'زيادة الادخار', en: 'Increase savings', fr: "Augmenter l'épargne" }, lang), subtitle: pick({ ar: 'حوّل جزءًا من الصافي إلى هدف واضح.', en: 'Move part of your surplus into a clear goal.', fr: 'Transférez une partie de votre excédent vers un objectif.' }, lang), value: money(Math.max(data.balance * 0.2, 0), lang, currency) },
      { id: 'recurring-investing', title: pick({ ar: 'استثمار منتظم', en: 'Recurring investing', fr: 'Investissement régulier' }, lang), subtitle: pick({ ar: 'مساهمة شهرية صغيرة تحافظ على الاستمرارية.', en: 'A small monthly contribution keeps momentum.', fr: 'Une petite contribution mensuelle maintient la dynamique.' }, lang), value: money(data.totalIncome * 0.1, lang, currency) },
    ];
  }

  const source = kind === 'income' ? data.income : kind === 'invest' ? data.investments : kind === 'savings' ? data.savings : data.expenses;
  return source.map(item => ({
    id: item.id,
    title: item.name.replace(/^خيرية:\d{4}-\d{2}:/, ''),
    subtitle: item.created_at ? new Date(item.created_at).toLocaleDateString() : pick({ ar: 'سجل مالي', en: 'Financial record', fr: 'Relevé financier' }, lang),
    value: money(item.amount, lang, currency),
    item,
  }));
}

function buildGoalAnalysis(goal: GoalItem, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD', t: TranslateFn) {
  const isAr = lang === 'ar';
  const remainingAmount = Math.max(goal.target_amount - goal.current_amount, 0);
  const monthsRemaining = monthsBetween(new Date(), goal.deadline);
  const missing = [
    goal.target_amount <= 0 ? t('goal_missing_target') : '',
    goal.current_amount < 0 ? t('goal_missing_current') : '',
    goal.monthly_contribution <= 0 ? t('goal_missing_contribution') : '',
    monthsRemaining <= 0 ? t('goal_missing_deadline') : '',
  ].filter(Boolean);
  const requiredMonthlySaving = monthsRemaining > 0
    ? remainingAmount / monthsRemaining
    : goal.monthly_contribution > 0
      ? goal.monthly_contribution
      : 0;
  const contribution = goal.monthly_contribution;
  const adjustment = Math.max(requiredMonthlySaving - contribution, 0);
  const expenseRatio = data.totalIncome > 0 ? data.totalExpenses / data.totalIncome : 0;
  const availableSurplus = Math.max(data.totalIncome - data.totalExpenses - data.totalSavings, 0);
  const estimatedMonths = contribution > 0 ? Math.ceil(remainingAmount / contribution) : 0;
  const estimatedCompletion = monthsRemaining > 0
    ? `${monthsRemaining} ${t('goal_months')}`
    : estimatedMonths > 0
      ? `${estimatedMonths} ${t('goal_months')}`
      : t('goal_unknown_completion');
  const ratio = requiredMonthlySaving > 0 ? contribution / requiredMonthlySaving : 1;
  const riskClass = contribution <= 0 || ratio < 0.55 ? 'high' : ratio < 0.95 ? 'medium' : 'low';
  const riskLabel = riskClass === 'low' ? t('goal_risk_low') : riskClass === 'medium' ? t('goal_risk_medium') : t('goal_risk_high');
  const statusLabel = riskClass === 'low' ? t('goal_status_on_track') : riskClass === 'medium' ? t('goal_status_needs_adjustment') : t('goal_status_high_risk');
  const suggestedExpenseReduction = data.totalExpenses > 0
    ? Math.min(15, Math.max(5, Math.ceil((adjustment / data.totalExpenses) * 100)))
    : 0;
  const suggestedSavingIncrease = availableSurplus > 0 ? Math.min(adjustment, availableSurplus) : adjustment;

  const summary = contribution <= 0
    ? t('goal_ai_no_contribution')
    : riskClass === 'low'
      ? t('goal_ai_on_track')
      : riskClass === 'medium'
        ? t('goal_ai_needs_adjustment')
        : t('goal_ai_high_risk');

  const steps = [
    contribution <= 0
      ? t('goal_step_add_contribution')
      : t('goal_step_raise_contribution').replace('{amount}', money(Math.max(requiredMonthlySaving, contribution), isAr, goal.currency || currency)),
    suggestedExpenseReduction > 0
      ? t('goal_step_reduce_expenses').replace('{percent}', String(suggestedExpenseReduction))
      : t('goal_step_review_spending'),
    t('goal_step_automate'),
    suggestedSavingIncrease > 0
      ? t('goal_step_increase_saving').replace('{amount}', money(suggestedSavingIncrease, lang, goal.currency || currency))
      : t('goal_step_monthly_review'),
  ];

  return {
    remainingAmount,
    requiredMonthlySaving,
    estimatedCompletion,
    adjustment,
    riskClass,
    riskLabel,
    statusLabel,
    missing,
    summary: summary
      .replace('{remaining}', money(remainingAmount, lang, goal.currency || currency))
      .replace('{required}', money(requiredMonthlySaving, lang, goal.currency || currency))
      .replace('{adjustment}', money(adjustment, lang, goal.currency || currency))
      .replace('{expenseRatio}', String(Math.round(expenseRatio * 100))),
    steps,
  };
}

function buildInsights(kind: PageKind, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD', t?: TranslateFn) {
  const isAr = lang === 'ar';
  const ratio = data.totalIncome ? Math.round((data.totalExpenses / data.totalIncome) * 100) : 0;
  if (kind === 'expenses') {
    const byCategory = data.expenses.reduce<Record<string, number>>((acc, item) => {
      const key = item.category || 'other';
      acc[key] = (acc[key] || 0) + item.amount;
      return acc;
    }, {});
    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    const avg = data.expenses.length ? data.totalExpenses / data.expenses.length : 0;
    const unusual = data.expenses.find(item => item.amount > avg * 2 && item.amount > 0);
    const recurring = data.expenses.filter(item => ['subscriptions', 'bills', 'loans'].includes(item.category || '')).reduce((sum, item) => sum + item.amount, 0);
    const saving = Math.max(recurring * 0.15, data.totalExpenses * 0.05);
    const trendLabel = ratio > 100
      ? pick({ ar: 'مصروفاتك أعلى من الدخل هذا الشهر.', en: 'Expenses are higher than income this month.', fr: 'Les depenses depassent les revenus ce mois-ci.' }, lang)
      : pick({ ar: `مصروفاتك تساوي ${ratio}% من الدخل.`, en: `Expenses equal ${ratio}% of income.`, fr: `Les depenses representent ${ratio}% des revenus.` }, lang);
    return [
      {
        title: pick({ ar: 'أعلى تصنيف', en: 'Highest category', fr: 'Categorie principale' }, lang),
        body: top
          ? pick({ ar: `أكثر تصنيف صرفت عليه هذا الشهر هو ${categoryLabel(top[0], lang)} بمبلغ ${money(top[1], lang, currency)}.`, en: `Your highest category is ${categoryLabel(top[0], lang)} at ${money(top[1], lang, currency)}.`, fr: `La categorie la plus elevee est ${categoryLabel(top[0], lang)} avec ${money(top[1], lang, currency)}.` }, lang)
          : pick({ ar: 'أضف مصروفات لعرض تحليل التصنيفات.', en: 'Add expenses to see category analysis.', fr: 'Ajoutez des depenses pour voir l analyse.' }, lang),
      },
      {
        title: pick({ ar: 'اتجاه الصرف', en: 'Spending trend', fr: 'Tendance des depenses' }, lang),
        body: trendLabel,
      },
      {
        title: pick({ ar: 'مراجعة ذكية', en: 'Smart review', fr: 'Revision intelligente' }, lang),
        body: unusual
          ? pick({ ar: `يوجد مصروف غير معتاد يحتاج مراجعة: ${unusual.name} (${money(unusual.amount, lang, currency)}).`, en: `Unusual expense needs review: ${unusual.name} (${money(unusual.amount, lang, currency)}).`, fr: `Depense inhabituelle a verifier: ${unusual.name} (${money(unusual.amount, lang, currency)}).` }, lang)
          : pick({ ar: 'لا توجد مصروفات غير معتادة حسب السجل الحالي.', en: 'No unusual expenses found in the current log.', fr: 'Aucune depense inhabituelle dans le journal actuel.' }, lang),
      },
      {
        title: pick({ ar: 'فرصة توفير', en: 'Saving opportunity', fr: 'Opportunite d economie' }, lang),
        body: pick({ ar: `يمكنك توفير ${money(saving, lang, currency)} إذا خفضت المصروفات المتكررة.`, en: `You could save ${money(saving, lang, currency)} by trimming repeated payments.`, fr: `Vous pourriez economiser ${money(saving, lang, currency)} en reduisant les paiements recurrents.` }, lang),
      },
    ];
  }
  const base = [
    {
      title: pick({ ar: 'نسبة الصرف', en: 'Spend ratio', fr: 'Ratio de dépenses' }, lang),
      body: pick({ ar: `مصروفاتك تساوي ${ratio}% من الدخل.`, en: `Expenses equal ${ratio}% of income.`, fr: `Vos dépenses représentent ${ratio}% des revenus.` }, lang),
    },
    {
      title: pick({ ar: 'مساحة الصافي', en: 'Net runway', fr: 'Marge nette' }, lang),
      body: pick({ ar: `الصافي الحالي ${money(data.balance, lang, currency)}.`, en: `Current net balance is ${money(data.balance, lang, currency)}.`, fr: `Solde net actuel: ${money(data.balance, lang, currency)}.` }, lang),
    },
  ];
  return [
    ...base,
    {
      title: pick({ ar: 'خطوة مقترحة', en: 'Suggested action', fr: 'Action suggérée' }, lang),
      body: suggestion(kind, lang),
    },
  ];
}

function suggestion(kind: PageKind, lang: string) {
  const isAr = lang === 'ar';
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'ابدأ بأكبر تصنيف مصروفات وخفّضه 5%.', en: 'Start with your largest expense category and reduce it by 5%.', fr: 'Commencez par votre plus grande catégorie de dépenses et réduisez-la de 5%.' },
    income: { ar: 'قسّم الدخل إلى راتب، دخل جانبي، وأعمال لقراءة أوضح.', en: 'Split income into salary, side income, and business for cleaner tracking.', fr: 'Divisez vos revenus en salaire, revenus annexes et activité pour un suivi plus clair.' },
    invest: { ar: 'حافظ على مساهمة شهرية ثابتة قبل زيادة المخاطر.', en: 'Keep a steady monthly contribution before increasing risk.', fr: 'Maintenez une contribution mensuelle stable avant d\'augmenter le risque.' },
    savings: { ar: 'حدد هدفًا شهريًا للادخار وراقب تقدمك في كل دورة.', en: 'Set a monthly savings target and track your progress each cycle.', fr: 'Fixez un objectif d\'épargne mensuel et suivez votre progression à chaque cycle.' },
    goals: { ar: 'اربط كل هدف بمبلغ شهري صغير قابل للاستمرار.', en: 'Attach every goal to a small sustainable monthly amount.', fr: 'Associez chaque objectif à un montant mensuel modeste et durable.' },
    reports: { ar: 'اطبع التقرير قبل نهاية الشهر لمراجعة قراراتك.', en: 'Print the report before month-end to review decisions.', fr: 'Imprimez le rapport avant la fin du mois pour revoir vos décisions.' },
    ai: { ar: 'اسأل المساعد عن أفضل قرار واحد لهذا الأسبوع.', en: 'Ask the assistant for one best action this week.', fr: 'Demandez à l\'assistant la meilleure action à prendre cette semaine.' },
  };
  return pick(text[kind], lang);
}

function sectionTitle(kind: PageKind, lang: string) {
  const isAr = lang === 'ar';
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'آخر المصروفات والتصنيفات', en: 'Recent expenses and categories', fr: 'Dépenses récentes et catégories' },
    income: { ar: 'مصادر الدخل والتوزيع', en: 'Income sources and distribution', fr: 'Sources de revenus et répartition' },
    invest: { ar: 'بطاقات المحفظة وفئات الاستثمار', en: 'Portfolio cards and investment categories', fr: 'Portefeuille et catégories d\'investissement' },
    savings: { ar: 'سجلات الادخار والمبالغ', en: 'Savings records and amounts', fr: 'Relevés d\'épargne et montants' },
    goals: { ar: 'بطاقات تقدم الأهداف', en: 'Goal progress cards', fr: 'Cartes de progression des objectifs' },
    reports: { ar: 'ملخص التقارير المالية', en: 'Financial report summary', fr: 'Résumé des rapports financiers' },
    ai: { ar: 'بطاقات العمل الذكية', en: 'Smart action cards', fr: 'Cartes d\'actions intelligentes' },
  };
  return pick(text[kind], lang);
}

function summaryTitle(kind: PageKind, lang: string) {
  const isAr = lang === 'ar';
  const text: Record<PageKind, LangText> = {
    expenses: { ar: 'ملخص المصروفات الشهري', en: 'Monthly expense summary', fr: 'Résumé des dépenses mensuelles' },
    income: { ar: 'ملخص توزيع الدخل', en: 'Income distribution summary', fr: 'Résumé de la répartition des revenus' },
    invest: { ar: 'ملخص المساهمة الاستثمارية', en: 'Investment contribution summary', fr: 'Résumé de la contribution investissement' },
    savings: { ar: 'ملخص المدخرات المسجلة', en: 'Recorded savings summary', fr: 'Résumé de l\'épargne enregistrée' },
    goals: { ar: 'ملخص تقدم الادخار', en: 'Savings progress summary', fr: 'Résumé de la progression de l\'épargne' },
    reports: { ar: 'جاهز للتصدير والطباعة', en: 'Ready to export and print', fr: 'Prêt à exporter et imprimer' },
    ai: { ar: 'واجهة المساعد', en: 'Assistant interface', fr: 'Interface de l\'assistant' },
  };
  return pick(text[kind], lang);
}

function summaryText(kind: PageKind, data: ReturnType<typeof buildDataShape>, lang: string, currency = 'KWD') {
  const isAr = lang === 'ar';
  const values: Record<PageKind, LangText> = {
    expenses: { ar: `إجمالي المصروفات الحالي ${money(data.totalExpenses, lang, currency)} مع ${data.expenses.length} سجل.`, en: `Current expenses total ${money(data.totalExpenses, lang, currency)} across ${data.expenses.length} records.`, fr: `Total des dépenses: ${money(data.totalExpenses, lang, currency)} sur ${data.expenses.length} relevés.` },
    income: { ar: `الدخل الشهري الحالي ${money(data.totalIncome, lang, currency)} موزع على ${data.income.length} مصادر.`, en: `Monthly income is ${money(data.totalIncome, lang, currency)} across ${data.income.length} sources.`, fr: `Revenus mensuels: ${money(data.totalIncome, lang, currency)} sur ${data.income.length} sources.` },
    invest: { ar: `قيمة المحفظة ${money(data.totalInvestments, lang, currency)} مع مساهمة مقترحة ${money(data.totalIncome * 0.15, lang, currency)}.`, en: `Portfolio value is ${money(data.totalInvestments, lang, currency)} with suggested contribution ${money(data.totalIncome * 0.15, lang, currency)}.`, fr: `Valeur du portefeuille: ${money(data.totalInvestments, lang, currency)}, contribution suggérée: ${money(data.totalIncome * 0.15, lang, currency)}.` },
    savings: { ar: `إجمالي المدخرات ${money(data.totalSavings, lang, currency)} موزع على ${data.savings.length} سجلات.`, en: `Total savings are ${money(data.totalSavings, lang, currency)} across ${data.savings.length} entries.`, fr: `Épargne totale: ${money(data.totalSavings, lang, currency)} sur ${data.savings.length} relevés.` },
    goals: { ar: `مدخراتك الحالية ${money(data.totalSavings, lang, currency)} تقيس تقدم ${data.goals.length} أهداف.`, en: `Current savings of ${money(data.totalSavings, lang, currency)} measure progress across ${data.goals.length} goals.`, fr: `Épargne actuelle ${money(data.totalSavings, lang, currency)} pour ${data.goals.length} objectifs.` },
    reports: { ar: 'استخدم أزرار الطباعة والتصدير لحفظ نسخة من ملخصك المالي.', en: 'Use print and export actions to save a copy of your financial summary.', fr: 'Utilisez impression et export pour sauvegarder votre résumé financier.' },
    ai: { ar: 'اكتب سؤالك للحصول على مساعدة مالية موجهة حسب بياناتك.', en: 'Type a prompt to get financial guidance shaped by your data.', fr: 'Posez votre question pour obtenir des conseils financiers personnalisés.' },
  };
  return pick(values[kind], lang);
}

function buildPrimaryActions(kind: PageKind, lang: string, openEntry: () => void, openGoal: () => void, focusAi: () => void, t?: TranslateFn) {
  const isAr = lang === 'ar';
  if (kind === 'reports') {
    return [
      { label: pick({ ar: 'طباعة', en: 'Print', fr: 'Imprimer' }, lang), icon: Printer, variant: 'print' as const, onClick: () => window.print() },
      { label: pick({ ar: 'تصدير', en: 'Export', fr: 'Exporter' }, lang), icon: Download, variant: 'default' as const, onClick: () => {
        const html = document.querySelector('.sfm-main')?.innerHTML || document.body.innerHTML;
        const blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>SFM Report</title></head><body>${html}</body></html>`], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sfm-report.html';
        a.click();
        URL.revokeObjectURL(url);
      } },
    ];
  }
  if (kind === 'ai') {
    return [
      { label: pick({ ar: 'اسأل الآن', en: 'Ask now', fr: 'Demander maintenant' }, lang), icon: Send, variant: 'default' as const, onClick: focusAi },
    ];
  }

  if (editableKind(kind)) {
    const labels: Record<EntryKind, LangText> = {
      expenses: { ar: 'إضافة مصروف', en: 'Add expense' },
      income: { ar: 'إضافة دخل', en: 'Add income' },
      invest: { ar: 'إضافة استثمار', en: 'Add investment' },
      savings: { ar: 'إضافة مدخرات', en: 'Add saving' },
    };
    return [
      { label: pick(labels[kind], lang), icon: Plus, variant: 'default' as const, onClick: openEntry },
    ];
  }

  const action: { label: LangText; onClick: () => void } = {
    label: { ar: 'إضافة هدف', en: 'Add goal' },
    onClick: openGoal,
  };
  return [
    { label: pick(action.label, lang), icon: Plus, variant: 'default' as const, onClick: action.onClick },
  ];
}

const baseStyles = `
  .sfm-shell{min-height:100vh;background:#F7F3EA;color:#111;display:flex;font-family:Tajawal,Arial,sans-serif}
  .sfm-spinner{width:44px;height:44px;border-radius:50%;border:3px solid rgba(216,174,99,.2);border-top-color:#D8AE63;animation:spin 1s linear infinite;margin:auto}
  @keyframes spin{to{transform:rotate(360deg)}}
  .sfm-sidebar{width:250px;background:#111;border-left:1px solid rgba(216,174,99,.22);padding:22px 16px;position:sticky;top:0;height:100vh;color:#FFFDFC;flex-shrink:0}
  [dir="ltr"] .sfm-sidebar{border-left:0;border-right:1px solid rgba(216,174,99,.22)}
  .brand{display:flex;align-items:center;gap:12px;margin-bottom:28px;cursor:pointer}
  .brand-mark{width:42px;height:42px;border-radius:12px;object-fit:cover;display:block}
  .brand strong{display:block;font-size:15px}.brand span{display:block;font-size:11px;color:rgba(255,255,255,.48);margin-top:2px}
  nav{display:grid;gap:7px}nav button,.mobile-panel button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;color:rgba(255,255,255,.62);padding:11px 12px;border-radius:12px;cursor:pointer;font:700 13px Tajawal,Arial,sans-serif;text-align:start}
  nav button:hover,nav button.active{background:rgba(216,174,99,.13);color:#D8AE63}
  .sfm-main{flex:1;padding:22px;max-width:1280px;margin:0 auto;width:100%;margin-inline-start:230px}
  .sfm-header{height:62px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}
  .guest-pill{display:inline-flex;align-items:center;padding:7px 11px;border-radius:999px;border:1px solid rgba(216,174,99,.24);background:rgba(216,174,99,.12);color:#9A6C3C;font-size:12px;font-weight:900;white-space:nowrap}
  .title-wrap{display:flex;align-items:center;gap:13px}.title-wrap p{font-size:11px;color:#9A6C3C;font-weight:700;margin:0 0 3px}.title-wrap h1{font-size:24px;margin:0;font-weight:900}
  .title-icon{width:44px;height:44px;border-radius:14px;background:color-mix(in srgb,var(--accent) 14%,#fff);color:var(--accent);display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 22%,transparent)}
  .icon-btn{width:40px;height:40px;border-radius:12px;border:1px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332;display:grid;place-items:center;cursor:pointer}.menu-btn{display:none}
  .hero{background:linear-gradient(135deg,#111 0%,#2B1A0D 62%,#D8AE63 140%);color:#FFFDFC;border-radius:24px;padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;box-shadow:0 18px 45px rgba(45,26,10,.16);margin-bottom:18px}
  .eyebrow{display:inline-flex;padding:4px 10px;border-radius:999px;background:rgba(216,174,99,.15);color:#D8AE63;font-size:11px;font-weight:800;margin-bottom:12px}.hero h2{font-size:34px;line-height:1.05;margin:0 0 9px}.hero p{max-width:640px;margin:0;color:rgba(255,255,255,.68);line-height:1.8;font-size:14px}
  .hero-actions{display:flex;gap:10px;flex-wrap:wrap}.primary-btn,.ghost-btn{height:42px;border-radius:13px;border:0;padding:0 15px;font:800 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:8px;cursor:pointer;white-space:nowrap}.primary-btn{background:#D8AE63;color:#111}.ghost-btn{background:rgba(255,255,255,.08);color:#FFFDFC;border:1px solid rgba(255,255,255,.12)}
  .notice{padding:12px 15px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.18);color:#B91C1C;border-radius:14px;margin-bottom:14px;font-size:13px;font-weight:700}
  .data-error-notice{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.data-error-notice strong{font-size:13px}.data-error-notice span{color:#7F1D1D}.data-error-notice small{color:#9A3412;background:rgba(255,255,255,.65);border-radius:999px;padding:4px 8px}.data-error-notice button{margin-inline-start:auto;border:0;border-radius:10px;background:#111;color:#D8AE63;height:34px;padding:0 12px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}.kpi-card,.panel{background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:20px;box-shadow:0 4px 22px rgba(90,67,51,.06)}
  .kpi-card{padding:18px;position:relative;overflow:hidden}.kpi-card>span{position:absolute;inset-inline-start:0;top:0;width:4px;height:100%}.kpi-card p{font-size:12px;color:#9A6C3C;font-weight:800;margin:0 0 7px}.kpi-card strong{font-size:23px;font-weight:900;display:block}.kpi-card small{display:block;margin-top:8px;color:#7C6A5D;font-size:12px;line-height:1.6}
  .content-grid{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(280px,.8fr);gap:18px}.panel{padding:20px}.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.panel-head p{margin:0 0 4px;font-size:11px;color:#9A6C3C;font-weight:800}.panel-head h3{margin:0;font-size:18px}.loading-pill{font-size:11px;font-weight:800;color:#D8AE63;background:rgba(216,174,99,.11);border-radius:999px;padding:5px 10px}
  .row-controls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}.row-search{flex:1;min-width:160px;height:38px;border:1.5px solid rgba(216,174,99,.22);border-radius:12px;padding:0 12px;background:#F7F3EA;font:700 13px Tajawal,Arial,sans-serif;color:#111;outline:none}.row-search:focus{border-color:#D8AE63;background:#FFFDFC}.row-select{height:38px;border:1.5px solid rgba(216,174,99,.22);border-radius:12px;padding:0 10px;background:#F7F3EA;font:700 13px Tajawal,Arial,sans-serif;color:#111;outline:none;cursor:pointer}.row-select:focus{border-color:#D8AE63}.row-count{font-size:12px;font-weight:800;color:#9A6C3C;margin-bottom:10px;padding:6px 0;border-bottom:1px solid rgba(216,174,99,.1)}.load-more-btn{width:100%;margin-top:12px;padding:12px;border-radius:14px;border:1.5px dashed rgba(216,174,99,.3);background:transparent;color:#9A6C3C;font:800 13px Tajawal,Arial,sans-serif;cursor:pointer;transition:all .2s}.load-more-btn:hover{background:rgba(216,174,99,.08);border-color:#D8AE63;color:#7a5a2a}
  .row-list{display:grid;gap:10px}.empty-state{padding:22px;border:1px dashed rgba(216,174,99,.25);border-radius:16px;color:#9A6C3C;text-align:center;font-size:13px;font-weight:800}.data-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid rgba(216,174,99,.08)}.data-row:last-child{border-bottom:0}.data-row strong{display:block;font-size:14px}.data-row span{display:block;color:#8B7A6D;font-size:12px;margin-top:4px}.data-row b{font-size:14px;color:#D8AE63;white-space:nowrap}.row-actions-wrap{display:flex;align-items:center;gap:10px}.row-actions{display:flex;align-items:center;gap:6px}.row-action{width:34px;height:34px;border-radius:11px;border:1px solid rgba(216,174,99,.16);background:#FFFDFC;color:#5B4332;display:grid;place-items:center;cursor:pointer;transition:all .18s ease}.row-action:hover{border-color:rgba(216,174,99,.45);color:#D8AE63;background:rgba(216,174,99,.08);transform:translateY(-1px)}
  .goal-card{background:#FFFDFC;border:1px solid rgba(216,174,99,.16);border-radius:22px;padding:18px;box-shadow:0 8px 28px rgba(90,67,51,.07);display:grid;gap:15px;transition:all .22s ease}.goal-card:hover{transform:translateY(-2px);box-shadow:0 16px 38px rgba(90,67,51,.11)}.goal-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.goal-title-wrap{display:flex;align-items:center;gap:12px}.goal-icon{width:42px;height:42px;border-radius:14px;background:rgba(216,174,99,.13);display:grid;place-items:center;font-size:20px}.goal-title-wrap strong{display:block;font-size:16px;font-weight:900;color:#111}.goal-title-wrap span{display:block;margin-top:4px;color:#9A6C3C;font-size:12px;font-weight:800}.goal-edit-btn{height:38px;border:1px solid rgba(216,174,99,.28);border-radius:13px;background:linear-gradient(135deg,rgba(216,174,99,.16),rgba(255,253,252,.95));color:#5B4332;padding:0 12px;font:900 12px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;gap:7px;cursor:pointer;box-shadow:0 6px 18px rgba(216,174,99,.12);transition:all .2s ease}.goal-edit-btn:hover{background:#D8AE63;color:#111;transform:translateY(-1px)}.goal-progress-row{display:flex;align-items:center;gap:10px}.goal-progress-track{height:10px;border-radius:999px;background:#F0E8DA;overflow:hidden;flex:1}.goal-progress-track span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#D8AE63,#9A6C3C)}.goal-progress-row b{color:#9A6C3C;font-size:13px}.goal-meta-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.goal-meta-grid div,.goal-ai-metrics div{background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:14px;padding:10px}.goal-meta-grid span,.goal-ai-metrics span{display:block;color:#9A6C3C;font-size:11px;font-weight:900;margin-bottom:5px}.goal-meta-grid strong,.goal-ai-metrics b{font-size:13px;color:#111}.goal-ai-card,.goal-modal-preview{border:1px solid rgba(216,174,99,.2);background:linear-gradient(180deg,#FFFDFC,#FFF8EA);border-radius:18px;padding:15px;display:grid;gap:12px}.goal-ai-head{display:flex;align-items:center;gap:9px;color:#5B4332}.goal-ai-head svg{color:#D8AE63}.goal-ai-head strong{font-size:14px;font-weight:900}.risk-pill{margin-inline-start:auto;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900}.risk-pill.low{background:rgba(34,197,94,.12);color:#15803D}.risk-pill.medium{background:rgba(216,174,99,.16);color:#9A6C3C}.risk-pill.high{background:rgba(239,68,68,.1);color:#B91C1C}.goal-ai-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.goal-ai-card p,.goal-modal-preview p{margin:0;color:#5B4332;font-size:13px;line-height:1.8;font-weight:700}.goal-ai-plan{background:rgba(255,255,255,.72);border-radius:14px;padding:12px}.goal-ai-plan strong{font-size:13px;color:#111}.goal-ai-plan ol{margin:8px 18px 0;padding:0;color:#5B4332;font-size:12.5px;line-height:1.8;font-weight:700}.goal-modal{width:min(860px,100%);max-height:min(88vh,980px);overflow:auto}.goal-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.goal-form-grid label:first-child,.goal-form-grid .entry-actions,.goal-notes-field,.goal-ai-toggle,.goal-modal-preview{grid-column:1/-1}.goal-form-grid select,.goal-form-grid textarea{border:1.5px solid rgba(216,174,99,.22);border-radius:14px;background:#F7F3EA;padding:0 13px;color:#111;font:800 14px Tajawal,Arial,sans-serif;outline:0}.goal-form-grid select{height:50px}.goal-form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}.goal-form-grid select:focus,.goal-form-grid textarea:focus{border-color:#D8AE63;box-shadow:0 0 0 4px rgba(216,174,99,.12);background:#FFFDFC}.currency-input-wrap{position:relative}.currency-input-wrap input{width:100%;padding-inline-start:58px}.currency-symbol{position:absolute;inset-inline-start:10px;top:50%;transform:translateY(-50%);min-width:38px;height:30px;border-radius:10px;background:rgba(216,174,99,.16);color:#5B4332;display:grid;place-items:center;font-size:12px;font-weight:900;z-index:1}.goal-ai-toggle{display:flex!important;align-items:center;justify-content:space-between;border:1px solid rgba(216,174,99,.14);background:#FFF8EA;border-radius:16px;padding:12px 14px}.switch{width:54px;height:30px;border:0;border-radius:999px;background:#D9CDBB;padding:3px;cursor:pointer;transition:.2s}.switch span{display:block;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:.2s}.switch.active{background:#D8AE63}.switch.active span{transform:translateX(24px)}[dir="rtl"] .switch.active span{transform:translateX(-24px)}.preview-missing{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.12);border-radius:14px;padding:12px;color:#B91C1C}.preview-missing strong{font-size:13px}.preview-missing ul{margin:8px 18px 0;padding:0;font-size:12.5px;line-height:1.8;font-weight:800}.form-error{grid-column:1/-1;border-radius:13px;padding:11px 13px;background:rgba(239,68,68,.08);color:#B91C1C;font-size:13px;font-weight:900}
  .insight-list{display:grid;gap:12px}.insight-list>div{display:flex;gap:10px;padding:12px;border-radius:14px;background:rgba(216,174,99,.07)}.insight-list svg{color:#D8AE63;flex-shrink:0}.insight-list strong{display:block;font-size:13px}.insight-list span{display:block;font-size:12px;color:#7C6A5D;line-height:1.6;margin-top:3px}
  .summary-band,.ai-panel{margin-top:18px;background:#FFFDFC;border:1px solid rgba(216,174,99,.14);border-radius:20px;padding:18px 20px;display:flex;align-items:center;gap:14px}.summary-band svg{color:#D8AE63}.summary-band strong,.ai-panel h3{font-size:16px}.summary-band p,.ai-panel p{margin:4px 0 0;color:#7C6A5D;line-height:1.7;font-size:13px}
  .ai-panel{align-items:stretch;justify-content:space-between}.chat-history{display:grid;gap:8px;min-width:min(460px,100%);max-height:190px;overflow:auto;margin-bottom:10px}.chat-history>div{padding:10px 12px;border-radius:14px;font-size:13px;line-height:1.6}.chat-history .user{background:#111;color:#FFFDFC}.chat-history .assistant{background:rgba(216,174,99,.11);color:#5B4332}.chat-box{display:flex;gap:10px;min-width:min(460px,100%)}.chat-box input{height:46px;border:1.5px solid rgba(216,174,99,.22);border-radius:14px;padding:0 14px;background:#F7F3EA;min-width:0;flex:1;font:600 14px Tajawal,Arial,sans-serif;color:#111}.chat-box button{width:46px;border-radius:14px;border:0;background:#111;color:#D8AE63;display:grid;place-items:center;cursor:pointer}.chat-box button:disabled{opacity:.55;cursor:wait}
  .mobile-panel{position:fixed;inset:12px;z-index:50;background:#111;border-radius:22px;padding:16px;color:#FFFDFC;box-shadow:0 24px 80px rgba(0,0,0,.35)}.mobile-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.mobile-brand{display:flex;align-items:center;gap:10px}.mobile-brand img{border-radius:10px;object-fit:cover}
  .entry-overlay{position:fixed;inset:0;background:rgba(17,17,17,.42);backdrop-filter:blur(8px);z-index:80;display:grid;place-items:center;padding:18px}.entry-modal,.confirm-modal{width:min(480px,100%);background:#FFFDFC;border:1px solid rgba(216,174,99,.2);border-radius:22px;box-shadow:0 26px 80px rgba(45,26,10,.26);padding:20px}.entry-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.entry-modal-head p{margin:0 0 4px;color:#9A6C3C;font-size:12px;font-weight:900}.entry-modal-head h3,.confirm-modal h3{margin:0;font-size:21px;font-weight:900}.entry-form{display:grid;gap:14px}.entry-form label{display:grid;gap:7px;font-weight:900;color:#5B4332;font-size:13px}.entry-form input{height:50px;border:1.5px solid rgba(216,174,99,.22);border-radius:14px;background:#F7F3EA;padding:0 14px;color:#111;font:800 14px Tajawal,Arial,sans-serif;outline:0}.entry-form input:focus{border-color:#D8AE63;box-shadow:0 0 0 4px rgba(216,174,99,.12);background:#FFFDFC}.entry-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}.primary-form-btn,.ghost-form-btn,.danger-form-btn{height:44px;border-radius:13px;padding:0 18px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}.primary-form-btn{border:0;background:linear-gradient(135deg,#111,#2D1A0A,#D8AE63);color:#fff}.ghost-form-btn{border:1px solid rgba(216,174,99,.22);background:#FFFDFC;color:#5B4332}.danger-form-btn{border:0;background:#C2410C;color:#fff}.primary-form-btn:disabled,.ghost-form-btn:disabled,.danger-form-btn:disabled{opacity:.58;cursor:wait}.confirm-modal{text-align:center}.confirm-icon{width:58px;height:58px;border-radius:18px;background:rgba(194,65,12,.09);color:#C2410C;display:grid;place-items:center;margin:0 auto 12px}.confirm-modal p{margin:8px 0 4px;color:#5B4332;font-weight:800}.confirm-modal small{display:block;color:#9A6C3C;line-height:1.6;margin-bottom:14px}.confirm-modal .entry-actions{justify-content:center}.entry-toast{position:fixed;z-index:90;inset-inline-end:22px;bottom:22px;max-width:min(360px,calc(100vw - 32px));padding:13px 16px;border-radius:15px;font:900 13px Tajawal,Arial,sans-serif;box-shadow:0 18px 45px rgba(45,26,10,.18);animation:slideUp .22s ease}.entry-toast.ok{background:#ECFDF5;color:#047857;border:1px solid rgba(34,197,94,.2)}.entry-toast.err{background:#FEF2F2;color:#B91C1C;border:1px solid rgba(239,68,68,.2)}@keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .finance-header-lang{display:block}
  @media(max-width:920px){.sfm-sidebar{display:none}.menu-btn{display:grid}.sfm-main{padding:16px;margin-inline-start:0}.hero{display:block}.hero-actions{margin-top:18px}.content-grid{grid-template-columns:1fr}.ai-panel{display:grid}.chat-box{min-width:0}}
  @media(max-width:640px){.kpi-grid{grid-template-columns:1fr}.sfm-header{height:auto}.title-wrap h1{font-size:20px}.hero{padding:22px}.hero h2{font-size:27px}.data-row{align-items:flex-start;flex-direction:column}.row-actions-wrap{width:100%;justify-content:space-between}.summary-band{align-items:flex-start}.primary-btn,.ghost-btn{width:100%;justify-content:center}.entry-actions{display:grid;grid-template-columns:1fr 1fr}.primary-form-btn,.ghost-form-btn,.danger-form-btn{width:100%}.goal-card-head{display:grid}.goal-edit-btn{width:100%;justify-content:center}.goal-meta-grid,.goal-ai-metrics,.goal-form-grid{grid-template-columns:1fr}.goal-form-grid label:first-child{grid-column:auto}}
`;

const expenseSmartStyles = `
  .expense-smart-main{max-width:1360px;padding:22px 24px 36px}
  .expense-hero{background:linear-gradient(135deg,#111 0%,#2B1A0D 60%,#D8AE63 150%);color:#FFFDFC;border-radius:26px;padding:28px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px;box-shadow:0 20px 50px rgba(45,26,10,.18);margin-bottom:16px}
  .expense-hero .eyebrow{display:inline-flex;align-items:center;gap:7px}
  .expense-hero h1{font-size:34px;line-height:1.08;margin:0 0 9px;font-weight:900}
  .expense-hero p{max-width:720px;margin:0;color:rgba(255,255,255,.7);font-size:14px;line-height:1.8;font-weight:700}
  .expense-hero-actions{display:flex;gap:10px;flex-wrap:wrap}
  .expense-kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:16px}
  .expense-dashboard-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(320px,.75fr);gap:16px;align-items:start}
  .expense-side-stack{display:grid;gap:16px}
  .expense-list-panel{min-width:0}
  .expense-card-list{display:grid;gap:10px}
  .expense-card-row{display:flex;justify-content:space-between;gap:14px;padding:15px;border:1px solid rgba(216,174,99,.13);border-radius:18px;background:linear-gradient(180deg,#FFFDFC,#FFF9EF);box-shadow:0 8px 26px rgba(90,67,51,.06)}
  .expense-row-main{display:flex;align-items:flex-start;gap:12px;min-width:0}
  .expense-row-icon{width:42px;height:42px;flex:0 0 42px;border-radius:14px;background:rgba(216,174,99,.13);color:#9A6C3C;display:grid;place-items:center}
  .expense-row-main strong{display:block;font-size:15px;font-weight:900;color:#111;line-height:1.35}
  .expense-row-main span{display:block;margin-top:4px;color:#8A7060;font-size:12px;font-weight:800}
  .expense-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
  .expense-badges em{font-style:normal;border-radius:999px;padding:5px 9px;background:#F2EBDD;color:#8A7060;border:1px solid rgba(216,174,99,.14);font-size:11px;font-weight:900}
  .expense-badges em.ok{background:rgba(34,197,94,.1);color:#15803D;border-color:rgba(34,197,94,.18)}
  .expense-badges em.ai{background:rgba(216,174,99,.16);color:#9A6C3C;border-color:rgba(216,174,99,.25)}
  .expense-row-actions{display:flex;align-items:center;gap:12px;flex-shrink:0}
  .expense-row-actions>b{font-size:16px;color:#111;font-weight:900;white-space:nowrap}
  .expense-row-actions>div{display:flex;gap:6px}
  .expense-empty{text-align:center;border:1.5px dashed rgba(216,174,99,.26);border-radius:22px;padding:34px 20px;background:#FFFDFC}
  .expense-empty>div:first-child{width:66px;height:66px;margin:0 auto 14px;border-radius:20px;background:rgba(216,174,99,.13);color:#9A6C3C;display:grid;place-items:center}
  .expense-empty h3{margin:0 0 8px;font-size:20px;font-weight:900}
  .expense-empty p{max-width:520px;margin:0 auto 18px;color:#7C6A5D;line-height:1.8;font-weight:700}
  .expense-empty>div:last-child{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
  .monthly-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
  .monthly-grid div{background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:15px;padding:12px}
  .monthly-grid span{display:block;color:#9A6C3C;font-size:11px;font-weight:900;margin-bottom:5px}
  .monthly-grid b{font-size:16px;color:#111}
  .expense-floating-add{display:none}
  .expense-smart-modal{width:min(920px,100%);max-height:min(92vh,980px);overflow:auto;padding:22px}
  .expense-modal-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#F7F3EA;border:1px solid rgba(216,174,99,.14);border-radius:16px;padding:5px;margin-bottom:16px}
  .expense-modal-tabs button{height:42px;border:0;border-radius:12px;background:transparent;color:#8A7060;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer}
  .expense-modal-tabs button.active{background:#111;color:#D8AE63;box-shadow:0 8px 22px rgba(45,26,10,.14)}
  .expense-form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .expense-form-grid select,.expense-form-grid textarea{border:1.5px solid rgba(216,174,99,.22);border-radius:14px;background:#F7F3EA;padding:0 13px;color:#111;font:800 14px Tajawal,Arial,sans-serif;outline:0}
  .expense-form-grid select{height:50px}
  .expense-form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}
  .expense-form-grid select:focus,.expense-form-grid textarea:focus{border-color:#D8AE63;box-shadow:0 0 0 4px rgba(216,174,99,.12);background:#FFFDFC}
  .receipt-scan-area,.expense-notes,.expense-actions{grid-column:1/-1}
  .receipt-drop{min-height:220px;border:1.5px dashed rgba(216,174,99,.34);border-radius:20px;background:linear-gradient(180deg,#FFFDFC,#FFF6E8);display:grid!important;place-items:center;text-align:center;cursor:pointer;overflow:hidden}
  .receipt-drop input{display:none}
  .receipt-drop img{width:100%;max-height:320px;object-fit:contain;border-radius:16px}
  .receipt-drop span{display:grid;place-items:center;gap:8px;color:#9A6C3C;font-weight:900}
  .receipt-drop small{display:block;color:#8A7060;font-size:12px;font-weight:800}
  .receipt-preview-grid{width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;padding:12px}
  .receipt-preview-grid>div{min-width:0;background:#FFFDFC;border:1px solid rgba(216,174,99,.16);border-radius:16px;padding:8px;display:grid;gap:7px;place-items:center}
  .receipt-preview-grid img{width:100%;height:112px;max-height:112px;object-fit:contain;border-radius:12px}
  .receipt-preview-grid small{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .receipt-selected-count{margin-top:9px;background:#FFF8EA;border:1px solid rgba(216,174,99,.18);border-radius:13px;padding:9px 11px;color:#5B4332;font-size:12px;font-weight:900}
  .receipt-scan-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end;margin-top:10px}
  .receipt-error{border:1px solid rgba(239,68,68,.18);background:rgba(239,68,68,.08);color:#B91C1C;border-radius:13px;padding:10px 12px;font-size:13px;font-weight:900;margin-top:10px}
  .receipt-batch-review{display:grid;gap:12px;margin-top:12px}
  .receipt-batch-head{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
  .receipt-review-card{border:1px solid rgba(216,174,99,.18);background:#FFFDFC;border-radius:18px;padding:12px;display:grid;gap:10px}
  .receipt-review-card.failed{border-color:rgba(239,68,68,.25);background:rgba(239,68,68,.04)}
  .receipt-review-card.review{border-color:rgba(216,174,99,.35);background:#FFF8EA}
  .receipt-review-select{display:flex!important;align-items:center!important;justify-content:space-between;gap:10px;color:#5B4332;font-weight:900}
  .receipt-review-select input{width:18px;height:18px}
  .receipt-review-body{display:grid;grid-template-columns:100px 1fr;gap:12px;align-items:start}
  .receipt-review-body>img{width:100px;height:110px;object-fit:contain;border-radius:13px;background:#F7F3EA;border:1px solid rgba(216,174,99,.12)}
  .receipt-review-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .receipt-review-fields input,.receipt-review-fields select{width:100%;min-width:0;border:1px solid rgba(216,174,99,.22);border-radius:11px;padding:9px;background:#fff;color:#111;font-family:Tajawal,Arial,sans-serif}
  .receipt-review-meta{display:flex;gap:8px;flex-wrap:wrap;color:#8A7060;font-size:12px;font-weight:900}
  .ai-result-card{margin-top:12px;border:1px solid rgba(216,174,99,.24);border-radius:18px;background:linear-gradient(180deg,#FFFDFC,#FFF8EA);padding:15px}
  .ai-result-card>div:first-child{display:flex;align-items:center;gap:8px;color:#15803D}
  .ai-result-card p{margin:8px 0 12px;color:#5B4332;font-weight:800}
  .ai-result-card dl{display:grid;grid-template-columns:150px 1fr;gap:8px 12px;margin:0}
  .ai-result-card dt{color:#9A6C3C;font-weight:900;font-size:12px}
  .ai-result-card dd{margin:0;color:#111;font-weight:900}
  .spin-icon{animation:spin 1s linear infinite}
  .receipt-details-modal{width:min(760px,100%);max-height:90vh;overflow:auto}
  .receipt-detail-image{width:100%;max-height:360px;object-fit:contain;border-radius:18px;background:#F7F3EA;border:1px solid rgba(216,174,99,.14);margin-bottom:14px}
  .receipt-detail-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
  .receipt-detail-grid div{background:#F7F3EA;border:1px solid rgba(216,174,99,.12);border-radius:14px;padding:11px}
  .receipt-detail-grid span{display:block;color:#9A6C3C;font-size:11px;font-weight:900;margin-bottom:5px}
  .receipt-detail-grid b{color:#111;font-size:13px}
  .receipt-items{display:grid;gap:8px;margin-bottom:12px}
  .receipt-items>strong{color:#111;font-size:14px}
  .receipt-items span{display:flex;justify-content:space-between;gap:10px;background:#FFF8EA;border-radius:12px;padding:9px 11px;color:#5B4332;font-weight:800}
  @media(max-width:1180px){.expense-dashboard-grid{grid-template-columns:1fr}.expense-kpi-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:920px){.expense-smart-main{margin-inline-start:0;padding:16px}.expense-hero{display:grid}.expense-hero-actions .primary-btn,.expense-hero-actions .ghost-btn{width:auto}.expense-side-stack{grid-template-columns:1fr}.expense-floating-add{position:fixed;display:grid;place-items:center;z-index:70;inset-inline-end:18px;bottom:18px;width:56px;height:56px;border-radius:18px;border:0;background:#D8AE63;color:#111;box-shadow:0 18px 40px rgba(45,26,10,.28)}}
  @media(max-width:640px){.expense-hero{padding:22px}.expense-hero h1{font-size:27px}.expense-kpi-grid,.expense-form-grid,.receipt-detail-grid,.monthly-grid{grid-template-columns:1fr}.expense-card-row{display:grid}.expense-row-actions{justify-content:space-between}.expense-row-actions>div{flex-wrap:wrap;justify-content:flex-end}.expense-modal-overlay{align-items:end;padding:10px}.expense-smart-modal{border-radius:22px 22px 0 0;max-height:94dvh;overflow-y:auto;max-width:100%;overflow-x:hidden}.expense-modal-tabs{grid-template-columns:1fr}.receipt-scan-actions,.expense-actions,.receipt-batch-head{display:grid;grid-template-columns:1fr}.ai-result-card dl{grid-template-columns:1fr}.expense-hero-actions{display:grid}.expense-hero-actions .primary-btn,.expense-hero-actions .ghost-btn{width:100%;justify-content:center}.receipt-preview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.receipt-review-body{grid-template-columns:1fr}.receipt-review-body>img{width:100%;height:150px}.receipt-review-fields{grid-template-columns:1fr}}
`;
