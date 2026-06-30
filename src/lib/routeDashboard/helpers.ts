import {
  BellIcon, Bot, ChartPie, FolderKanban, GraduationCap, HandHeart,
  Home, PiggyBank, Receipt, ReceiptText, Target, TrendingUp, Upload, Wallet,
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { calculateGoalProgress, parseMoney } from '@/lib/goalProgress';
import { parseMoneyValue } from '@/lib/money';
import { isProjectLinkedExpenseRow } from '@/lib/data/financeData';
import type {
  ReceiptItem, PendingReceiptExpense, ReceiptScanApiResult,
  Snapshot, SectionCard,
  LangText, MoneyItem, IncomeSource, GoalItem, GoalRow,
  EntryKind, EntryFormState, ExpenseFormState, GoalFormState,
  AiExtractedData, ReceiptAmountCandidate, ReceiptScanDebug,
  ReceiptScanApiPayload, SmartExpense, ExpensePeriodPreset,
  ExpensePeriodState, ExpensePeriodRange, DataErrorKind,
  DataLoadError, DataResult, QueryResult, PageKind,
} from './types';

export const emptySnapshot: Snapshot = {
  income: [],
  expenses: [],
  savings: [],
  investments: [],
  debts: [],
  goals: [],
  error: null,
};

export function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}
export const emptyEntryForm = (defaultCurrency = 'KWD'): EntryFormState => ({
  name: '',
  amount: '',
  category: 'general',
  currency: defaultCurrency,
  savingType: '',
  savingMethod: '',
  savedAt: todayInputDate(),
  note: '',
  goalId: '',
});
export const emptyExpenseForm = (defaultCurrency = 'KWD'): ExpenseFormState => ({
  name: '',
  amount: '',
  currency: defaultCurrency,
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
export const emptyGoalForm: GoalFormState = {
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
export const entryTitleKeys = {
  expenses: 'expenses_entry_title',
  income: 'income_entry_title',
  invest: 'invest_entry_title',
  savings: 'savings_entry_title',
} as const;
export const deleteConfirmKeys = {
  expenses: 'expenses_deleteConfirmMessage',
  income: 'income_deleteConfirmMessage',
  invest: 'invest_deleteConfirmMessage',
  savings: 'savings_deleteConfirmMessage',
} as const;

export const navItems = [
  { href: '/dashboard', label: { ar: 'الرئيسية', en: 'Dashboard', fr: 'Tableau de bord' }, icon: Home },
  { href: '/expenses', label: { ar: 'المصروفات', en: 'Expenses', fr: 'Dépenses' }, icon: ReceiptText },
  { href: '/income', label: { ar: 'الدخل', en: 'Income', fr: 'Revenus' }, icon: Wallet },
  { href: '/invest', label: { ar: 'الاستثمارات', en: 'Investments', fr: 'Investissements' }, icon: TrendingUp },
  { href: '/savings', label: { ar: 'الإدخار', en: 'Savings', fr: 'Épargne' }, icon: PiggyBank },
  { href: '/goals', label: { ar: 'الأهداف', en: 'Goals', fr: 'Objectifs' }, icon: Target },
  { href: '/projects', label: { ar: 'مشاريعي', en: 'My Projects', fr: 'Mes projets' }, icon: FolderKanban },
  { href: '/reports-center', label: { ar: 'مركز التقارير', en: 'Reports Center', fr: 'Centre des rapports' }, icon: ChartPie },
  { href: '/ai', label: { ar: 'الذكاء المالي', en: 'AI', fr: 'IA' }, icon: Bot },
  { href: '/charity', label: { ar: 'الأعمال الخيرية', en: 'Charity', fr: 'Charité' }, icon: HandHeart },
  { href: '/notifications', label: { ar: 'الإشعارات', en: 'Notifications', fr: 'Notifications' }, icon: BellIcon },
  { href: '/profile', label: { ar: 'الملف الشخصي', en: 'Profile', fr: 'Profil' }, icon: GraduationCap },
];

export const EXPENSE_CATEGORIES = [
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

export const PAYMENT_METHODS = [
  { id: 'cash', label: { ar: 'كاش', en: 'Cash', fr: 'Especes' } },
  { id: 'knet', label: { ar: 'KNET', en: 'KNET', fr: 'KNET' } },
  { id: 'card', label: { ar: 'بطاقة بنكية', en: 'Bank card', fr: 'Carte bancaire' } },
  { id: 'transfer', label: { ar: 'تحويل بنكي', en: 'Bank transfer', fr: 'Virement bancaire' } },
  { id: 'apple_pay', label: { ar: 'Apple Pay', en: 'Apple Pay', fr: 'Apple Pay' } },
  { id: 'other', label: { ar: 'أخرى', en: 'Other', fr: 'Autre' } },
];

export const SAVING_TYPES = [
  { id: 'emergency_fund', label: { ar: 'صندوق طوارئ', en: 'Emergency fund', fr: 'Fonds d’urgence' } },
  { id: 'financial_goal', label: { ar: 'هدف مالي', en: 'Financial goal', fr: 'Objectif financier' } },
  { id: 'monthly_saving', label: { ar: 'ادخار شهري', en: 'Monthly saving', fr: 'Épargne mensuelle' } },
  { id: 'temporary_saving', label: { ar: 'ادخار مؤقت', en: 'Temporary saving', fr: 'Épargne temporaire' } },
  { id: 'future_investment', label: { ar: 'استثمار مستقبلي', en: 'Future investment', fr: 'Investissement futur' } },
  { id: 'other', label: { ar: 'أخرى', en: 'Other', fr: 'Autre' } },
];

export const SAVING_METHODS = [
  { id: 'cash', label: { ar: 'نقدي', en: 'Cash', fr: 'Espèces' } },
  { id: 'bank_account', label: { ar: 'حساب بنكي', en: 'Bank account', fr: 'Compte bancaire' } },
  { id: 'automatic_transfer', label: { ar: 'تحويل تلقائي', en: 'Automatic transfer', fr: 'Virement automatique' } },
  { id: 'digital_wallet', label: { ar: 'محفظة رقمية', en: 'Digital wallet', fr: 'Portefeuille numérique' } },
  { id: 'other', label: { ar: 'أخرى', en: 'Other', fr: 'Autre' } },
];

type SavingsOption = { id: string; label: LangText };

export function normalizeSavingsOption(value: unknown, options: SavingsOption[]) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  const matched = options.find(option => {
    const labels = [option.id, option.label.ar, option.label.en, option.label.fr].filter(Boolean);
    return labels.some(label => String(label).trim().toLowerCase() === normalized);
  });
  return matched?.id ?? '';
}

export function normalizeSavingsDate(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      parsed.getFullYear() === Number(year) &&
      parsed.getMonth() === Number(month) - 1 &&
      parsed.getDate() === Number(day)
    ) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : formatDateInput(parsed);
}

export function normalizeCurrencyCode(value: unknown, fallback = 'KWD') {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return fallback;
  const directCode = raw.match(/\b[A-Z]{3}\b/)?.[0];
  return directCode || fallback;
}

export const savingModalText = {
  title: { ar: 'إضافة إدخار جديد', en: 'Add new saving', fr: 'Ajouter une épargne' },
  editTitle: { ar: 'تعديل الإدخار', en: 'Edit saving', fr: 'Modifier l’épargne' },
  subtitle: {
    ar: 'سجّل مبلغ ادخار جديد ليتم احتسابه ضمن خطتك المالية.',
    en: 'Record a new saving amount so it counts toward your financial plan.',
    fr: 'Enregistrez un nouveau montant d’épargne pour l’intégrer à votre plan financier.',
  },
  name: { ar: 'اسم الإدخار', en: 'Saving name', fr: 'Nom de l’épargne' },
  namePlaceholder: { ar: 'مثال: حصالة، صندوق طوارئ، توفير للسيارة', en: 'Example: money box, emergency fund, car saving', fr: 'Exemple : tirelire, fonds d’urgence, voiture' },
  amount: { ar: 'المبلغ', en: 'Amount', fr: 'Montant' },
  type: { ar: 'نوع الإدخار', en: 'Saving type', fr: 'Type d’épargne' },
  method: { ar: 'طريقة الإدخار', en: 'Saving method', fr: 'Méthode d’épargne' },
  date: { ar: 'التاريخ', en: 'Date', fr: 'Date' },
  note: { ar: 'ملاحظة', en: 'Note', fr: 'Note' },
  notePlaceholder: { ar: 'اكتب ملاحظة قصيرة إن وجدت', en: 'Write a short note if needed', fr: 'Ajoutez une courte note si nécessaire' },
  linkedGoal: { ar: 'ربط بهدف مالي', en: 'Link to financial goal', fr: 'Lier à un objectif' },
  noGoal: { ar: 'بدون ربط', en: 'No linked goal', fr: 'Sans objectif lié' },
  save: { ar: 'حفظ الإدخار', en: 'Save saving', fr: 'Enregistrer' },
  saving: { ar: 'جاري الحفظ...', en: 'Saving...', fr: 'Enregistrement...' },
  success: { ar: 'تم حفظ الإدخار بنجاح', en: 'Saving saved successfully', fr: 'Épargne enregistrée' },
  failed: { ar: 'تعذر حفظ الادخار، الرجاء المحاولة مرة أخرى.', en: 'Could not save saving. Please try again.', fr: 'Impossible d’enregistrer l’épargne. Veuillez réessayer.' },
  nameRequired: { ar: 'يرجى إدخال اسم الإدخار', en: 'Please enter the saving name', fr: 'Veuillez saisir le nom' },
  amountRequired: { ar: 'يرجى إدخال مبلغ صحيح', en: 'Please enter a valid amount', fr: 'Veuillez saisir un montant valide' },
  typeRequired: { ar: 'يرجى اختيار نوع الإدخار', en: 'Please choose the saving type', fr: 'Veuillez choisir le type' },
  methodRequired: { ar: 'يرجى اختيار طريقة الإدخار', en: 'Please choose the saving method', fr: 'Veuillez choisir la méthode' },
  dateRequired: { ar: 'يرجى اختيار التاريخ', en: 'Please choose the date', fr: 'Veuillez choisir la date' },
};

export const expenseUi = {
  manualTab: { ar: 'إدخال يدوي', en: 'Manual Entry', fr: 'Saisie manuelle' },
  scanTab: { ar: 'رفع فاتورة بالذكاء الاصطناعي', en: 'AI Receipt Scan', fr: 'Scan IA de facture' },
  addExpense: { ar: 'إضافة مصروف', en: 'Add expense', fr: 'Ajouter une depense' },
  uploadReceipt: { ar: 'رفع صورة الفاتورة', en: 'Upload Receipt Image', fr: 'Téléverser l’image du reçu' },
  uploadOneReceipt: { ar: 'رفع فاتورة واحدة', en: 'Upload one receipt', fr: 'Importer une facture' },
  uploadMultipleReceipts: { ar: 'رفع عدة فواتير', en: 'Upload multiple receipts', fr: 'Importer plusieurs factures' },
  chooseImages: { ar: 'اختر الصور أو اسحبها هنا', en: 'Choose images or drag them here', fr: 'Choisissez des images ou glissez-les ici' },
  selectedOneReceipt: { ar: 'تم اختيار فاتورة واحدة', en: 'One receipt selected', fr: 'Une facture sélectionnée' },
  selectedReceipts: { ar: 'تم اختيار {count} فواتير', en: '{count} receipts selected', fr: '{count} factures sélectionnées' },
  smartTitle: { ar: 'إدارة المصروفات الذكية', en: 'Smart expense management', fr: 'Gestion intelligente des depenses' },
  smartSubtitle: { ar: 'سجل مصروفاتك يدويًا أو ارفع فاتورة ليقرأها الذكاء الاصطناعي ثم راجعها قبل الإضافة.', en: 'Add expenses manually or upload a receipt for AI extraction, then review before saving.', fr: 'Ajoutez manuellement ou telechargez une facture pour extraction IA, puis verifiez avant enregistrement.' },
  name: { ar: 'اسم المصروف', en: 'Expense name', fr: 'Nom de la depense' },
  amount: { ar: 'المبلغ', en: 'Amount', fr: 'Montant' },
  category: { ar: 'التصنيف', en: 'Category', fr: 'Categorie' },
  date: { ar: 'التاريخ', en: 'Date', fr: 'Date' },
  paymentMethod: { ar: 'طريقة الدفع', en: 'Payment method', fr: 'Mode de paiement' },
  notes: { ar: 'ملاحظات', en: 'Notes', fr: 'Notes' },
  attachReceipt: { ar: 'رفع صورة الفاتورة', en: 'Upload Receipt Image', fr: 'Téléverser l’image du reçu' },
  uploadTitle: { ar: 'رفع صورة الفاتورة', en: 'Upload Receipt Image', fr: 'Téléverser l’image du reçu' },
  uploadHint: { ar: 'اسحب الصورة هنا أو اختر من الجهاز', en: 'Drag image here or choose from device', fr: 'Glissez l’image ici ou choisissez un fichier' },
  uploadOptionalHint: {
    ar: 'يمكنك رفع صورة الفاتورة اختياريًا لاستخراج البيانات أو حفظها مع المصروف.',
    en: 'You can optionally upload a receipt image to extract data or attach it to the expense.',
    fr: 'Vous pouvez téléverser une image du reçu de manière facultative pour extraire les données ou l’ajouter à la dépense.',
  },
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
  providerUsed: { ar: 'المزوّد', en: 'Provider', fr: 'Fournisseur' },
  googleProvider: { ar: 'Google Document AI', en: 'Google Document AI', fr: 'Google Document AI' },
  openaiProvider: { ar: 'OpenAI Vision', en: 'OpenAI Vision', fr: 'OpenAI Vision' },
  manualProvider: { ar: 'إدخال يدوي', en: 'Manual entry', fr: 'Saisie manuelle' },
  highConfidence: { ar: 'ثقة عالية', en: 'High confidence', fr: 'Confiance élevée' },
  mediumConfidenceLabel: { ar: 'ثقة متوسطة', en: 'Medium confidence', fr: 'Confiance moyenne' },
  lowConfidenceLabel: { ar: 'ثقة منخفضة', en: 'Low confidence', fr: 'Confiance faible' },
  providerUnavailableTitle: { ar: 'خدمة قراءة الفواتير غير مفعلة حالياً.', en: 'Invoice scanning provider is not configured.', fr: 'Le service de lecture des factures n’est pas configuré.' },
  planBlocked: { ar: 'هذه الميزة متاحة في الخطة المدفوعة.', en: 'This feature is available on the paid plan.', fr: 'Cette fonctionnalité est disponible avec la formule payante.' },
  providerUnavailable: {
    ar: 'يمكنك إدخال بيانات المصروف يدوياً، وسيتم حفظ صورة الفاتورة كمرفق.',
    en: 'You can enter the expense manually and save the receipt as an attachment.',
    fr: 'Vous pouvez saisir la dépense manuellement et enregistrer le reçu en pièce jointe.',
  },
  scanFailedTitle: { ar: 'تعذر قراءة الفاتورة تلقائياً', en: 'Could not read the invoice automatically', fr: 'Impossible de lire la facture automatiquement' },
  scanFailedManualHint: {
    ar: 'يمكنك إدخال البيانات يدوياً، وسيتم حفظ الصورة كمرفق.',
    en: 'You can enter the details manually, and the image will be saved as an attachment.',
    fr: 'Vous pouvez saisir les données manuellement, et l’image sera enregistrée en pièce jointe.',
  },
  uploadFailed: { ar: 'تعذر رفع الصورة.', en: 'Could not upload the image.', fr: 'Impossible de téléverser l’image.' },
  noClearAmount: {
    ar: 'لم يتم العثور على بيانات كافية في الفاتورة. يمكنك إدخال البيانات يدوياً وسيتم حفظ الصورة كمرفق.',
    en: 'Not enough invoice data was found. You can enter the details manually and save the image as an attachment.',
    fr: 'Les données extraites de la facture sont insuffisantes. Vous pouvez saisir les informations manuellement et enregistrer l’image en pièce jointe.',
  },
  ready: { ar: 'جاهز للإضافة', en: 'Ready to add', fr: 'Prêt à ajouter' },
  needsReview: { ar: 'يحتاج مراجعة', en: 'Needs review', fr: 'À vérifier' },
  failed: { ar: 'فشل التحليل', en: 'Failed', fr: 'Échec' },
  amountNotDetected: { ar: 'لم نتمكن من قراءة مبلغ هذه الفاتورة. الرجاء إدخاله يدويًا أو رفع صورة أوضح.', en: 'We could not read this receipt amount. Please enter it manually or upload a clearer image.', fr: 'Nous n’avons pas pu lire le montant de cette facture. Veuillez le saisir manuellement ou importer une image plus claire.' },
  scanReviewTitle: { ar: 'مراجعة بيانات الفاتورة', en: 'Review invoice data', fr: 'Vérifier les données du reçu' },
  extractedBadge: { ar: 'مستخرج من الفاتورة', en: 'Extracted from receipt', fr: 'Extrait du reçu' },
  amountCandidates: { ar: 'المبالغ المقترحة', en: 'Amount candidates', fr: 'Montants proposés' },
  chooseAmount: { ar: 'اختر المبلغ الصحيح من الفاتورة', en: 'Choose the correct invoice amount', fr: 'Choisissez le bon montant de la facture' },
  mediumConfidence: { ar: 'راجع البيانات قبل الحفظ.', en: 'Review the data before saving.', fr: 'Vérifiez les données avant l’enregistrement.' },
  lowConfidence: { ar: 'لم نتمكن من تحديد كل البيانات بثقة. راجع النتائج أو أدخلها يدوياً.', en: 'We could not identify every field confidently. Review the results or enter them manually.', fr: 'Nous n’avons pas pu identifier toutes les données avec certitude. Vérifiez les résultats ou saisissez-les manuellement.' },
  partialExtraction: { ar: 'تم استخراج بعض البيانات. راجع القيم قبل الحفظ.', en: 'Some data was extracted. Review the values before saving.', fr: 'Certaines données ont été extraites. Vérifiez les valeurs avant l’enregistrement.' },
  partialCurrencyNoAmount: { ar: 'تم تحديد العملة من الفاتورة، لكن لم يتم تحديد المبلغ بثقة. اختر المبلغ الصحيح أو أدخله يدوياً.', en: 'Currency was detected, but the amount was not identified confidently. Choose the correct amount or enter it manually.', fr: 'La devise a été détectée, mais le montant n’a pas été identifié avec certitude. Choisissez le bon montant ou saisissez-le manuellement.' },
  saveManual: { ar: 'حفظ يدوي', en: 'Save manually', fr: 'Enregistrer manuellement' },
  saveWithAttachment: { ar: 'حفظ مع المرفق', en: 'Save with attachment', fr: 'Enregistrer avec la pièce jointe' },
  currency: { ar: 'العملة', en: 'Currency', fr: 'Devise' },
  tax: { ar: 'الضريبة', en: 'Tax', fr: 'Taxe' },
  discount: { ar: 'الخصم', en: 'Discount', fr: 'Remise' },
  invoiceNumber: { ar: 'رقم الفاتورة', en: 'Invoice number', fr: 'Numéro de facture' },
  currencyFallback: { ar: 'لم يتم تحديد العملة من الفاتورة، تم استخدام عملتك الافتراضية.', en: 'Currency was not detected from the receipt, so your default currency was used.', fr: 'La devise n’a pas été détectée sur le reçu, votre devise par défaut a donc été utilisée.' },
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
  emptyTitle: { ar: 'لا توجد مصروفات حتى الآن.', en: 'No expenses yet.', fr: 'Aucune depense pour le moment.' },
  emptyBody: { ar: 'ابدأ بإضافة أول مصروف يدوي أو مصروف تلقائي يتم تحليلها بالذكاء الاصطناعي.', en: 'Start by adding your first manual or automatic expense to analyze it with AI.', fr: 'Ajoutez votre premiere depense manuelle ou automatique pour l analyser avec l IA.' },
  fileLarge: { ar: 'حجم الملف كبير جدًا', en: 'File size is too large', fr: 'Le fichier est trop volumineux' },
  fileUnsupported: { ar: 'نوع الملف غير مدعوم', en: 'Unsupported file type', fr: 'Type de fichier non pris en charge' },
  unclear: { ar: 'الصورة غير واضحة، حاول رفع صورة أوضح', en: 'The image is unclear, try uploading a clearer one', fr: 'L image n est pas claire, essayez une image plus nette' },
  couldNotRead: { ar: 'لم نتمكن من قراءة الفاتورة بوضوح', en: 'We could not read the receipt clearly', fr: 'Nous n avons pas pu lire la facture clairement' },
  monthlySummary: { ar: 'ملخص الشهر', en: 'Monthly summary', fr: 'Resume mensuel' },
  aiInsights: { ar: 'رؤى الذكاء المالي', en: 'Financial AI insights', fr: 'Insights IA financiers' },
  nameRequired: { ar: 'الرجاء إدخال اسم المصروف.', en: 'Please enter the expense name.', fr: 'Veuillez saisir le nom de la depense.' },
  amountRequired: { ar: 'المبلغ يجب أن يكون أكبر من صفر.', en: 'Amount must be greater than zero.', fr: 'Le montant doit etre superieur a zero.' },
  dateRequired: { ar: 'الرجاء اختيار التاريخ.', en: 'Please choose the date.', fr: 'Veuillez choisir la date.' },
  categoryRequired: { ar: 'الرجاء اختيار تصنيف المصروف.', en: 'Please choose an expense category.', fr: 'Veuillez choisir une categorie de depense.' },
  saveSuccess: { ar: 'تمت إضافة المصروف بنجاح.', en: 'Expense added successfully.', fr: 'Depense ajoutee avec succes.' },
  saveFailed: { ar: 'تعذر إضافة المصروف. حاول مرة أخرى.', en: 'Could not add expense. Please try again.', fr: 'Impossible d ajouter la depense. Veuillez reessayer.' },
};

export const pageMeta: Record<PageKind, { title: LangText; subtitle: LangText; accent: string; icon: typeof ReceiptText }> = {
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
    accent: 'var(--sfm-soft-cyan)',
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

export function pick(text: LangText, langOrIsAr: string | boolean) {
  const lang = typeof langOrIsAr === 'boolean' ? (langOrIsAr ? 'ar' : 'en') : langOrIsAr;
  if (lang === 'ar') return text.ar;
  if (lang === 'fr') return text.fr ?? text.en;
  return text.en;
}

export function optionLabelById(options: Array<{ id: string; label: LangText }>, id: string | null | undefined, lang: string) {
  if (!id) return '';
  return pick(options.find(option => option.id === id)?.label || { ar: id, en: id, fr: id }, lang);
}

export function expenseText(key: keyof typeof expenseUi, lang: string) {
  return pick(expenseUi[key], lang);
}

// Flip this with a real subscription check when receipt scanning becomes a paid feature.
export const RECEIPT_SCANNING_REQUIRES_PAID_PLAN = false;

export function receiptScanningPlanGateEnabled() {
  return RECEIPT_SCANNING_REQUIRES_PAID_PLAN;
}

export const EXPENSE_OPTIONAL_SAVE_COLUMNS = [
  'currency',
  'category',
  'date',
  'payment_method',
  'notes',
  'receipt_image_url',
  'receipt_file_name',
  'ai_extracted_data',
  'ai_confidence_score',
  'updated_at',
] as const;

export function categoryLabel(category: string | null | undefined, lang: string) {
  return pick(EXPENSE_CATEGORIES.find(item => item.id === category)?.label ?? EXPENSE_CATEGORIES.at(-1)!.label, lang);
}

export function paymentLabel(paymentMethod: string | null | undefined, lang: string) {
  return pick(PAYMENT_METHODS.find(item => item.id === paymentMethod)?.label ?? PAYMENT_METHODS.at(-1)!.label, lang);
}

export function projectExpenseLabel(lang: string) {
  return pick({ ar: 'مصروف مشروع', en: 'Project Expense', fr: 'Dépense de projet' }, lang);
}

export function normalizeReceiptNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Number(value.toFixed(3));
  if (typeof value !== 'string') return undefined;
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const normalized = value
    .replace(/[٠-٩]/g, digit => String(arabic.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String(persian.indexOf(digit)))
    .replace(/\u066B/g, '.')
    .replace(/\u066C/g, ',')
    .replace(/(?:KWD|KD|USD|SAR|AED|EUR|GBP|EGP|جنيه(?:ا|ات)?|د\.?ك|د\s*ك|ر\.?\s*س|د\.?\s*إ|\$|€|£)/gi, '')
    .replace(/[^\d.,-]/g, '')
    .trim();
  if (!normalized) return undefined;
  const amount = Number((normalized.includes('.') ? normalized.replace(/,/g, '') : normalized.replace(',', '.')));
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(3)) : undefined;
}

export function extractedReceiptAmount(data: AiExtractedData) {
  return normalizeReceiptNumber(data.totalAmount)
    ?? data.amountCandidates?.find(candidate => ['amount_due', 'grand_total', 'invoice_total', 'total', 'computed'].includes(candidate.kind || '') && normalizeReceiptNumber(candidate.amount))?.amount
    ?? normalizeReceiptNumber(data.amount)
    ?? normalizeReceiptNumber(data.total)
    ?? normalizeReceiptNumber(data.finalTotal);
}

export function validReceiptCandidates(data: AiExtractedData | null | undefined) {
  return (data?.amountCandidates || [])
    .filter(candidate => typeof candidate.amount === 'number' && Number.isFinite(candidate.amount) && candidate.amount !== 0)
    .slice(0, 8);
}

export function receiptCandidateAmount(candidate: ReceiptAmountCandidate) {
  return typeof candidate.amount === 'number' && Number.isFinite(candidate.amount) ? Math.abs(candidate.amount) : 0;
}

export function receiptCandidateLabel(candidate: ReceiptAmountCandidate, lang: string) {
  const kind = candidate.kind || '';
  const fallback = candidate.label || pick({ ar: 'مبلغ', en: 'Amount', fr: 'Montant' }, lang);
  const labels: Record<string, LangText> = {
    amount_due: { ar: 'المبلغ المستحق', en: 'Amount Due', fr: 'Montant dû' },
    grand_total: { ar: 'الإجمالي النهائي', en: 'Grand Total', fr: 'Total général' },
    invoice_total: { ar: 'إجمالي الفاتورة', en: 'Invoice Total', fr: 'Total de la facture' },
    total: { ar: 'الإجمالي', en: 'Total', fr: 'Total' },
    subtotal: { ar: 'المجموع الفرعي', en: 'Subtotal', fr: 'Sous-total' },
    tax: { ar: 'الضريبة', en: 'Tax', fr: 'Taxe' },
    discount: { ar: 'الخصم', en: 'Discount', fr: 'Remise' },
    line_item: { ar: 'بند في الفاتورة', en: 'Line item', fr: 'Ligne' },
    computed: { ar: 'إجمالي محسوب', en: 'Computed total', fr: 'Total calculé' },
  };
  return labels[kind] ? pick(labels[kind], lang) : fallback;
}

export function receiptProviderLabel(provider: AiExtractedData['provider'] | undefined, lang: string) {
  if (provider === 'google-document-ai') return expenseText('googleProvider', lang);
  if (provider === 'openai-vision') return expenseText('openaiProvider', lang);
  if (provider === 'manual') return expenseText('manualProvider', lang);
  return '-';
}

export function receiptConfidenceLabel(level: AiExtractedData['confidenceLevel'] | undefined, lang: string) {
  if (level === 'high') return expenseText('highConfidence', lang);
  if (level === 'medium') return expenseText('mediumConfidenceLabel', lang);
  if (level === 'low') return expenseText('lowConfidenceLabel', lang);
  return '-';
}

export function normalizeReceiptScanCode(errorSource: string | undefined) {
  if (!errorSource) return '';
  if (/OCR_NOT_CONFIGURED/.test(errorSource)) return 'no_provider_configured';
  if (/google_credentials_json_invalid|invalid_google_credentials_json/.test(errorSource)) return 'google_credentials_json_invalid';
  if (/google_credentials_private_key_missing/.test(errorSource)) return 'google_credentials_private_key_missing';
  if (/google_credentials_private_key_invalid/.test(errorSource)) return 'google_credentials_private_key_invalid';
  if (/google_client_init_failed/.test(errorSource)) return 'google_client_init_failed';
  if (/google_processor_path_invalid/.test(errorSource)) return 'google_processor_path_invalid';
  if (/google_permission_denied/.test(errorSource)) return 'google_permission_denied';
  if (/google_processor_not_found/.test(errorSource)) return 'google_processor_not_found';
  if (/google_invalid_location/.test(errorSource)) return 'google_invalid_location';
  if (/google_api_not_enabled/.test(errorSource)) return 'google_api_not_enabled';
  if (/google_invalid_credentials/.test(errorSource)) return 'google_invalid_credentials';
  if (/google_invalid_argument/.test(errorSource)) return 'google_invalid_argument';
  if (/google_unsupported_file_type/.test(errorSource)) return 'google_unsupported_file_type';
  if (/google_quota_exceeded/.test(errorSource)) return 'google_quota_exceeded';
  if (/google_request_failed/.test(errorSource)) return 'google_request_failed';
  if (/google_process_document_failed|google_document_ai_request_failed/.test(errorSource)) return 'google_process_document_failed';
  if (/plan|subscription|paid|premium|business/.test(errorSource)) return 'plan_blocked';
  if (/openai_env_missing|openai_key_missing/.test(errorSource)) return 'openai_env_missing';
  if (/openai_fallback_failed|openai_vision_failed|openai_pdf_not_supported|openai_vision_empty_response/.test(errorSource)) return 'openai_fallback_failed';
  if (/file_type_unsupported|unsupported_file_type/.test(errorSource)) return 'file_type_unsupported';
  if (/file_missing/.test(errorSource)) return 'file_missing';
  if (/google_env_missing|missing_google_/.test(errorSource)) return 'google_env_missing';
  if (/no_provider_configured|all_providers_unavailable|missing_google_and_openai|provider_unavailable/.test(errorSource)) return 'no_provider_configured';
  return errorSource;
}

export function receiptScanSpecificErrorText(errorSource: string | undefined, lang: string) {
  const code = normalizeReceiptScanCode(errorSource);
  if (code === 'plan_blocked') {
    return receiptScanningPlanGateEnabled()
      ? expenseText('planBlocked', lang)
      : pick({
        ar: 'تعذر الاتصال بخدمة قراءة الفواتير.',
        en: 'Could not connect to the invoice reading service.',
        fr: 'Impossible de contacter le service de lecture des factures.',
      }, lang);
  }
  const messages: Record<string, LangText> = {
    google_env_missing: {
      ar: 'خدمة قراءة الفواتير غير مفعلة لأن متغيرات البيئة ناقصة أو غير صحيحة.',
      en: 'Invoice scanning is not active because required environment variables are missing or invalid.',
      fr: 'La lecture des factures n’est pas active car des variables d’environnement sont absentes ou invalides.',
    },
    google_credentials_json_invalid: {
      ar: 'إعدادات Google Document AI غير صالحة. تحقق من JSON الخاص بحساب الخدمة.',
      en: 'Google Document AI credentials are invalid. Check the service account JSON.',
      fr: 'Les identifiants Google Document AI sont invalides. Vérifiez le JSON du compte de service.',
    },
    google_credentials_private_key_invalid: {
      ar: 'مفتاح Google الخاص غير صالح. تحقق من private_key وتنسيق الأسطر الجديدة في Vercel.',
      en: 'The Google private key is invalid. Check private_key and newline formatting in Vercel.',
      fr: 'La clé privée Google est invalide. Vérifiez private_key et les retours à la ligne dans Vercel.',
    },
    google_credentials_private_key_missing: {
      ar: 'مفتاح Google Service Account الخاص غير موجود.',
      en: 'The Google service account private_key is missing.',
      fr: 'La clé privée du compte de service Google est absente.',
    },
    google_client_init_failed: {
      ar: 'تعذر تهيئة عميل Google Document AI. تحقق من صلاحيات حساب الخدمة.',
      en: 'Could not initialize Google Document AI. Check the service account permissions.',
      fr: 'Impossible d’initialiser Google Document AI. Vérifiez les permissions du compte de service.',
    },
    google_processor_path_invalid: {
      ar: 'مسار معالج Google Document AI غير صحيح. تحقق من المشروع والموقع ومعرّف المعالج.',
      en: 'The Google Document AI processor path is invalid. Check project, location, and processor ID.',
      fr: 'Le chemin du processeur Google Document AI est invalide. Vérifiez le projet, la région et l’identifiant.',
    },
    google_permission_denied: {
      ar: 'حساب الخدمة لا يملك صلاحية Document AI. تحقق من IAM في Google Cloud.',
      en: 'The service account does not have Document AI permission. Check IAM in Google Cloud.',
      fr: 'Le compte de service n’a pas l’autorisation Document AI. Vérifiez IAM dans Google Cloud.',
    },
    google_processor_not_found: {
      ar: 'لم يتم العثور على معالج الفواتير. تحقق من Processor ID والموقع.',
      en: 'The invoice processor was not found. Check the Processor ID and location.',
      fr: 'Le processeur de factures est introuvable. Vérifiez l’identifiant et la région.',
    },
    google_invalid_location: {
      ar: 'موقع المعالج غير صحيح. تحقق من GOOGLE_DOCUMENT_AI_LOCATION.',
      en: 'The processor location is invalid. Check GOOGLE_DOCUMENT_AI_LOCATION.',
      fr: 'La région du processeur est invalide. Vérifiez GOOGLE_DOCUMENT_AI_LOCATION.',
    },
    google_api_not_enabled: {
      ar: 'خدمة Document AI API غير مفعلة في Google Cloud.',
      en: 'The Document AI API is not enabled in Google Cloud.',
      fr: 'L’API Document AI n’est pas activée dans Google Cloud.',
    },
    google_invalid_credentials: {
      ar: 'بيانات حساب الخدمة غير صحيحة.',
      en: 'The service account credentials are invalid.',
      fr: 'Les identifiants du compte de service sont invalides.',
    },
    google_invalid_argument: {
      ar: 'نوع الملف أو طلب المعالجة غير صالح.',
      en: 'The file type or processing request is invalid.',
      fr: 'Le type de fichier ou la requête de traitement est invalide.',
    },
    google_unsupported_file_type: {
      ar: 'نوع الملف غير مدعوم. جرّب صورة PNG أو JPG أو PDF.',
      en: 'This file type is not supported. Try PNG, JPG, or PDF.',
      fr: 'Ce type de fichier n’est pas pris en charge. Essayez PNG, JPG ou PDF.',
    },
    google_quota_exceeded: {
      ar: 'تم تجاوز حد استخدام خدمة Document AI.',
      en: 'The Document AI quota has been exceeded.',
      fr: 'Le quota Document AI a été dépassé.',
    },
    google_request_failed: {
      ar: 'تعذر الاتصال بخدمة قراءة الفواتير.',
      en: 'Could not connect to the invoice reading service.',
      fr: 'Impossible de contacter le service de lecture des factures.',
    },
    google_process_document_failed: {
      ar: 'تعذر الاتصال بمعالج Google Document AI. تحقق من الموقع والمعالج والصلاحيات.',
      en: 'Google Document AI request failed. Check location, processor ID, and IAM permissions.',
      fr: 'La requête Google Document AI a échoué. Vérifiez la région, le processeur et les permissions IAM.',
    },
    openai_env_missing: {
      ar: 'مفتاح OpenAI الاحتياطي غير موجود، ولم تنجح قراءة Google.',
      en: 'OpenAI fallback key is missing, and Google scanning did not complete.',
      fr: 'La clé OpenAI de secours est absente et la lecture Google n’a pas abouti.',
    },
    openai_fallback_failed: {
      ar: 'فشل مزود OpenAI الاحتياطي في قراءة الفاتورة.',
      en: 'The OpenAI fallback provider could not read the invoice.',
      fr: 'Le fournisseur de secours OpenAI n’a pas pu lire la facture.',
    },
    file_type_unsupported: {
      ar: 'نوع الملف غير مدعوم.',
      en: 'This file type is not supported.',
      fr: 'Ce type de fichier n’est pas pris en charge.',
    },
    file_missing: {
      ar: 'لم يتم إرسال ملف فاتورة للتحليل.',
      en: 'No receipt file was sent for scanning.',
      fr: 'Aucun fichier de reçu n’a été envoyé pour analyse.',
    },
    no_provider_configured: {
      ar: 'خدمة قراءة الفواتير غير مفعلة حالياً.',
      en: 'Invoice scanning provider is not configured.',
      fr: 'Le service de lecture des factures n’est pas configuré.',
    },
  };
  return messages[code] ? pick(messages[code], lang) : '';
}

export function receiptScanErrorText(errorSource: string | undefined, lang: string, fallback: string) {
  if (!errorSource) return fallback;
  const specific = receiptScanSpecificErrorText(errorSource, lang);
  if (specific) return specific;
  if (/no_provider_configured|missing_google_and_openai|provider|not_configured|unavailable|all_providers_unavailable|provider_unavailable/.test(errorSource)) {
    return `${expenseText('providerUnavailableTitle', lang)} ${expenseText('providerUnavailable', lang)}`;
  }
  if (/unsupported_file_type|file_too_large|upload/.test(errorSource)) return expenseText('uploadFailed', lang);
  if (/parser_no_final_total|no_clear_total/.test(errorSource)) return expenseText('noClearAmount', lang);
  return fallback;
}

export function isReceiptProviderUnavailable(errorSource?: string, code?: string, message?: string) {
  return /OCR_NOT_CONFIGURED|no_provider_configured|missing_google_and_openai|all_providers_unavailable|provider_unavailable|google_env_missing|openai_env_missing/i.test(`${errorSource || ''} ${code || ''} ${message || ''}`);
}

export function receiptProviderDevDetail(errorSource: string | undefined, lang: string) {
  if (process.env.NODE_ENV === 'production' || !errorSource) return '';
  const code = normalizeReceiptScanCode(errorSource);
  const details: Record<string, Record<string, string>> = {
    google_env_missing: {
      ar: 'تحقق من GOOGLE_CLOUD_PROJECT_ID و GOOGLE_DOCUMENT_AI_LOCATION و GOOGLE_DOCUMENT_AI_PROCESSOR_ID و GOOGLE_APPLICATION_CREDENTIALS_JSON في الخادم.',
      en: 'Check GOOGLE_CLOUD_PROJECT_ID, GOOGLE_DOCUMENT_AI_LOCATION, GOOGLE_DOCUMENT_AI_PROCESSOR_ID, and GOOGLE_APPLICATION_CREDENTIALS_JSON on the server.',
      fr: 'Vérifiez GOOGLE_CLOUD_PROJECT_ID, GOOGLE_DOCUMENT_AI_LOCATION, GOOGLE_DOCUMENT_AI_PROCESSOR_ID et GOOGLE_APPLICATION_CREDENTIALS_JSON côté serveur.',
    },
    google_credentials_json_invalid: {
      ar: 'GOOGLE_APPLICATION_CREDENTIALS_JSON لا يمكن قراءته كـ JSON صالح أو تنقصه client_email / project_id.',
      en: 'GOOGLE_APPLICATION_CREDENTIALS_JSON cannot be parsed as valid JSON or is missing client_email / project_id.',
      fr: 'GOOGLE_APPLICATION_CREDENTIALS_JSON ne peut pas être lu comme JSON valide ou manque client_email / project_id.',
    },
    google_credentials_private_key_invalid: {
      ar: 'private_key داخل GOOGLE_APPLICATION_CREDENTIALS_JSON غير صالح. تحقق من تحويل \\n إلى أسطر جديدة.',
      en: 'private_key inside GOOGLE_APPLICATION_CREDENTIALS_JSON is invalid. Check escaped \\n newline handling.',
      fr: 'private_key dans GOOGLE_APPLICATION_CREDENTIALS_JSON est invalide. Vérifiez la gestion des \\n.',
    },
    google_credentials_private_key_missing: {
      ar: 'private_key غير موجود داخل GOOGLE_APPLICATION_CREDENTIALS_JSON.',
      en: 'private_key is missing inside GOOGLE_APPLICATION_CREDENTIALS_JSON.',
      fr: 'private_key est absent de GOOGLE_APPLICATION_CREDENTIALS_JSON.',
    },
    google_processor_path_invalid: {
      ar: 'تعذر بناء المسار projects/{projectId}/locations/{location}/processors/{processorId}.',
      en: 'Could not build projects/{projectId}/locations/{location}/processors/{processorId}.',
      fr: 'Impossible de construire projects/{projectId}/locations/{location}/processors/{processorId}.',
    },
    google_process_document_failed: {
      ar: 'فشل طلب processors:process من Google. تحقق من IAM، الموقع، ومعرّف المعالج.',
      en: 'Google processors:process failed. Check IAM, location, and processor ID.',
      fr: 'La requête Google processors:process a échoué. Vérifiez IAM, la région et le processeur.',
    },
    google_permission_denied: {
      ar: 'Google أعاد PERMISSION_DENIED. أضف صلاحية Document AI على المعالج/المشروع لحساب الخدمة.',
      en: 'Google returned PERMISSION_DENIED. Grant Document AI access to the service account on the processor/project.',
      fr: 'Google a renvoyé PERMISSION_DENIED. Accordez l’accès Document AI au compte de service.',
    },
    google_processor_not_found: {
      ar: 'Google أعاد NOT_FOUND. تحقق أن Processor ID هو المعرّف وليس الاسم، وأن الموقع مطابق لموقع المعالج.',
      en: 'Google returned NOT_FOUND. Verify the Processor ID is the ID, not display name, and the location matches the processor.',
      fr: 'Google a renvoyé NOT_FOUND. Vérifiez l’identifiant du processeur et sa région.',
    },
    google_invalid_location: {
      ar: 'الموقع المستخدم لا يطابق موقع المعالج. أمثلة شائعة: us أو eu.',
      en: 'The configured location does not match the processor location. Common values are us or eu.',
      fr: 'La région configurée ne correspond pas au processeur. Valeurs courantes : us ou eu.',
    },
    google_api_not_enabled: {
      ar: 'فعّل Document AI API في نفس مشروع Google Cloud المستخدم في GOOGLE_CLOUD_PROJECT_ID.',
      en: 'Enable the Document AI API in the same Google Cloud project used by GOOGLE_CLOUD_PROJECT_ID.',
      fr: 'Activez l’API Document AI dans le même projet Google Cloud.',
    },
    google_invalid_credentials: {
      ar: 'تحقق أن GOOGLE_APPLICATION_CREDENTIALS_JSON لحساب خدمة صالح ولم يتم نسخه ناقصاً.',
      en: 'Check that GOOGLE_APPLICATION_CREDENTIALS_JSON contains a valid, complete service account.',
      fr: 'Vérifiez que GOOGLE_APPLICATION_CREDENTIALS_JSON contient un compte de service valide.',
    },
    google_invalid_argument: {
      ar: 'Google رفض الطلب. تحقق من MIME type والملف المرفوع.',
      en: 'Google rejected the request. Check the MIME type and uploaded file.',
      fr: 'Google a rejeté la requête. Vérifiez le type MIME et le fichier.',
    },
    google_unsupported_file_type: {
      ar: 'ارفع PNG أو JPG أو PDF فقط.',
      en: 'Upload PNG, JPG, or PDF only.',
      fr: 'Téléversez uniquement PNG, JPG ou PDF.',
    },
    google_quota_exceeded: {
      ar: 'راجع حصص Document AI أو الفوترة في Google Cloud.',
      en: 'Check Document AI quota or billing in Google Cloud.',
      fr: 'Vérifiez le quota ou la facturation Document AI dans Google Cloud.',
    },
    google_request_failed: {
      ar: 'تعذر إرسال الطلب إلى Google. راجع سجلات الخادم للشبكة أو الاستجابة.',
      en: 'The request could not reach Google. Check server logs for network/response details.',
      fr: 'La requête n’a pas pu atteindre Google. Vérifiez les journaux serveur.',
    },
    openai_env_missing: {
      ar: 'OPENAI_API_KEY غير موجود في الخادم، لذلك لا يوجد مزود احتياطي بعد فشل Google.',
      en: 'OPENAI_API_KEY is missing on the server, so there is no fallback after Google fails.',
      fr: 'OPENAI_API_KEY est absent côté serveur, donc aucun secours après l’échec de Google.',
    },
    openai_fallback_failed: {
      ar: 'فشل مزود OpenAI الاحتياطي بعد محاولة Google.',
      en: 'OpenAI fallback failed after Google was attempted.',
      fr: 'Le secours OpenAI a échoué après la tentative Google.',
    },
    no_provider_configured: {
      ar: 'لا يوجد مزود OCR مفعّل في الخادم.',
      en: 'No OCR provider is configured on the server.',
      fr: 'Aucun fournisseur OCR n’est configuré côté serveur.',
    },
    missing_google_project_id: {
      ar: 'GOOGLE_CLOUD_PROJECT_ID غير موجود في الخادم.',
      en: 'GOOGLE_CLOUD_PROJECT_ID is missing on the server.',
      fr: 'GOOGLE_CLOUD_PROJECT_ID est absent côté serveur.',
    },
    missing_google_location: {
      ar: 'GOOGLE_DOCUMENT_AI_LOCATION غير موجود في الخادم.',
      en: 'GOOGLE_DOCUMENT_AI_LOCATION is missing on the server.',
      fr: 'GOOGLE_DOCUMENT_AI_LOCATION est absent côté serveur.',
    },
    missing_google_processor_id: {
      ar: 'GOOGLE_DOCUMENT_AI_PROCESSOR_ID غير موجود في الخادم.',
      en: 'GOOGLE_DOCUMENT_AI_PROCESSOR_ID is missing on the server.',
      fr: 'GOOGLE_DOCUMENT_AI_PROCESSOR_ID est absent côté serveur.',
    },
    missing_google_credentials_json: {
      ar: 'GOOGLE_APPLICATION_CREDENTIALS_JSON غير موجود في الخادم.',
      en: 'GOOGLE_APPLICATION_CREDENTIALS_JSON is missing on the server.',
      fr: 'GOOGLE_APPLICATION_CREDENTIALS_JSON est absent côté serveur.',
    },
    invalid_google_credentials_json: {
      ar: 'GOOGLE_APPLICATION_CREDENTIALS_JSON غير صالح أو لا يحتوي على client_email / private_key / project_id.',
      en: 'GOOGLE_APPLICATION_CREDENTIALS_JSON is invalid or missing client_email / private_key / project_id.',
      fr: 'GOOGLE_APPLICATION_CREDENTIALS_JSON est invalide ou ne contient pas client_email / private_key / project_id.',
    },
    google_client_init_failed: {
      ar: 'تعذر تهيئة عميل Google. تحقق من private_key وتنسيق \\n في Vercel.',
      en: 'Google client initialization failed. Check private_key and escaped \\n formatting in Vercel.',
      fr: 'L’initialisation du client Google a échoué. Vérifiez private_key et le format \\n dans Vercel.',
    },
    google_document_ai_request_failed: {
      ar: 'تعذر الاتصال بمعالج Google Document AI. تحقق من الموقع والمعالج والصلاحيات.',
      en: 'Google Document AI request failed. Check location, processor ID, and IAM permissions.',
      fr: 'La requête Google Document AI a échoué. Vérifiez la région, le processeur et les permissions IAM.',
    },
    openai_key_missing: {
      ar: 'OPENAI_API_KEY غير موجود في الخادم.',
      en: 'OPENAI_API_KEY is missing on the server.',
      fr: 'OPENAI_API_KEY est absent côté serveur.',
    },
    all_providers_unavailable: {
      ar: 'لا يوجد مزود OCR مفعّل في الخادم.',
      en: 'No OCR provider is configured on the server.',
      fr: 'Aucun fournisseur OCR n’est configuré côté serveur.',
    },
  };
  return details[code]?.[lang] || details[code]?.ar || details[errorSource]?.[lang] || details[errorSource]?.ar || '';
}

export function receiptProviderDebugDetail(debug: ReceiptScanDebug | null, lang: string) {
  const base = receiptProviderDevDetail(debug?.errorSource, lang);
  if (process.env.NODE_ENV === 'production' || !debug) return base;
  const parts = [
    debug.providerStatusCode ? `HTTP ${debug.providerStatusCode}` : '',
    debug.providerReason || '',
  ].filter(Boolean).join(' - ');
  return [base, parts].filter(Boolean).join(' ');
}

export function selectedReceiptsLabel(count: number, lang: string) {
  if (count === 1) return expenseText('selectedOneReceipt', lang);
  return textWithCount(expenseText('selectedReceipts', lang), { count });
}

export function inferClientReceiptMimeType(file: File) {
  const type = file.type?.toLowerCase();
  if (type) return type;
  const name = file.name.toLowerCase();
  if (/\.(jpe?g)$/.test(name)) return 'image/jpeg';
  if (/\.png$/.test(name)) return 'image/png';
  if (/\.webp$/.test(name)) return 'image/webp';
  if (/\.pdf$/.test(name)) return 'application/pdf';
  return '';
}

export function normalizeReceiptDate(data: AiExtractedData) {
  const value = data.receiptDate || data.date;
  return typeof value === 'string' && value ? value : new Date().toISOString().slice(0, 10);
}

export function normalizeReceiptCategory(value: string | undefined) {
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

export function normalizeReceiptPayment(value: string | undefined) {
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

export function receiptItemsNotes(items: ReceiptItem[] | undefined) {
  if (!items?.length) return '';
  return items
    .slice(0, 8)
    .map(item => {
      const amount = normalizeReceiptNumber(item.total) ?? normalizeReceiptNumber(item.price) ?? normalizeReceiptNumber(item.unitPrice);
      return amount ? `${item.name}: ${amount}` : item.name;
    })
    .join('\n');
}

export function receiptFallbackName(lang: string) {
  return pick({ ar: 'مصروف من فاتورة', en: 'Receipt expense', fr: 'Dépense de facture' }, lang);
}

export function textWithCount(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

export function pendingReceiptFromResult(
  file: File,
  previewUrl: string,
  result: { success?: boolean; data?: AiExtractedData; error?: string },
  lang: string,
  defaultCurrency = 'KWD',
): PendingReceiptExpense {
  const data = result.data ?? null;
  const amount = data ? extractedReceiptAmount(data) : undefined;
  const confidence = data?.confidenceScore ?? data?.confidence ?? (amount ? 0.84 : 0.3);
  const hasPartialData = Boolean(data && (data.currency || data.description || data.merchantName || data.amountCandidates?.length || data.rawText));
  const status: PendingReceiptExpense['status'] = !amount
    ? hasPartialData ? 'review' : 'failed'
    : data?.confidenceLevel === 'low' || confidence < 0.58 ? 'review' : confidence < 0.82 || data?.confidenceLevel === 'medium' ? 'review' : 'ready';
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${file.name}`,
    selected: Boolean(amount) && confidence >= 0.7,
    status,
    file,
    fileName: file.name,
    previewUrl,
    name: data?.description?.trim() || data?.merchantName?.trim() || receiptFallbackName(lang),
    amount: amount ? String(amount) : '',
    currency: data?.currency || defaultCurrency,
    date: data ? normalizeReceiptDate(data) : todayInputDate(),
    category: normalizeReceiptCategory(data?.category),
    paymentMethod: normalizeReceiptPayment(data?.paymentMethod),
    notes: receiptItemsNotes(data?.items),
    aiConfidenceScore: confidence,
    aiExtractedData: data,
    error: result.error || (!amount ? hasPartialData ? expenseText('partialCurrencyNoAmount', lang) : expenseText('amountNotDetected', lang) : null),
  };
}

export function receiptConfidenceMessage(data: AiExtractedData, lang: string) {
  if (data.confidenceLevel === 'low') return expenseText('lowConfidence', lang);
  if (data.confidenceLevel === 'medium') return expenseText('mediumConfidence', lang);
  return '';
}

export function dataErrorCopy(error: DataLoadError | null, lang: string) {
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

export function money(value: number, langOrIsAr: string | boolean, currency = 'KWD') {
  const lang = typeof langOrIsAr === 'boolean' ? (langOrIsAr ? 'ar' : 'en') : langOrIsAr;
  return formatCurrency(value, currency, lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en');
}

export function sum(items: MoneyItem[]) {
  return items.reduce((total, item) => total + parseMoney(item.amount), 0);
}

export function progress(current: number, target: number) {
  return calculateGoalProgress({ current_amount: current, target_amount: target }).progressPercent;
}

export function editableKind(kind: PageKind): kind is EntryKind {
  return kind === 'expenses' || kind === 'income' || kind === 'invest' || kind === 'savings';
}

export function guestKey(kind: EntryKind) {
  return `sfm_guest_${kind}`;
}

export function readGuestItems(kind: EntryKind): MoneyItem[] | IncomeSource[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(guestKey(kind)) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeGuestItems(kind: EntryKind, items: MoneyItem[] | IncomeSource[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(guestKey(kind), JSON.stringify(items));
}

export function parseGoalNotes(notes?: string | null): Record<string, unknown> {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { description: notes };
  }
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + Math.max(0, months));
  return next;
}

export function formatDateInput(date: Date) {
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const EXPENSE_PAGE_SIZE = 15;
export const EXPENSE_PERIOD_PRESETS: ExpensePeriodPreset[] = ['current', 'previous', 'last3', 'last6', 'year', 'all', 'custom'];

export function localDateFromInput(value?: string | null) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const dateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfLocalMonth(year: number, month: number) {
  return new Date(year, month - 1, 1);
}

export function addLocalMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function makeExpenseRange(start: Date, end: Date, months: number): ExpensePeriodRange {
  return {
    start,
    end,
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
    months,
  };
}

export function defaultExpensePeriodState(now = new Date()): ExpensePeriodState {
  return { preset: 'current', month: now.getMonth() + 1, year: now.getFullYear() };
}

export function parseExpenseMonthParam(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function expensePeriodFromSearch(search: string, now = new Date()): ExpensePeriodState {
  const params = new URLSearchParams(search);
  const customMonth = parseExpenseMonthParam(params.get('month'));
  if (customMonth) return { preset: 'custom', ...customMonth };
  const preset = params.get('period') as ExpensePeriodPreset | null;
  if (preset && EXPENSE_PERIOD_PRESETS.includes(preset)) {
    return { ...defaultExpensePeriodState(now), preset };
  }
  return defaultExpensePeriodState(now);
}

export function readExpensePeriodFromLocation(now = new Date()): ExpensePeriodState {
  if (typeof window === 'undefined') return defaultExpensePeriodState(now);
  return expensePeriodFromSearch(window.location.search, now);
}

export function writeExpensePeriodToLocation(period: ExpensePeriodState) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.delete('period');
  params.delete('month');
  if (period.preset === 'custom') {
    params.set('month', `${period.year}-${String(period.month).padStart(2, '0')}`);
  } else if (period.preset !== 'current') {
    params.set('period', period.preset);
  }
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

export function expensePeriodRange(period: ExpensePeriodState, now = new Date()) {
  if (period.preset === 'all') return null;
  const currentStart = startOfLocalMonth(now.getFullYear(), now.getMonth() + 1);
  if (period.preset === 'current') return makeExpenseRange(currentStart, addLocalMonths(currentStart, 1), 1);
  if (period.preset === 'previous') {
    const start = addLocalMonths(currentStart, -1);
    return makeExpenseRange(start, currentStart, 1);
  }
  if (period.preset === 'last3') {
    const start = addLocalMonths(currentStart, -2);
    return makeExpenseRange(start, addLocalMonths(currentStart, 1), 3);
  }
  if (period.preset === 'last6') {
    const start = addLocalMonths(currentStart, -5);
    return makeExpenseRange(start, addLocalMonths(currentStart, 1), 6);
  }
  if (period.preset === 'year') {
    const start = new Date(now.getFullYear(), 0, 1);
    return makeExpenseRange(start, new Date(now.getFullYear() + 1, 0, 1), 12);
  }
  const start = startOfLocalMonth(period.year, period.month);
  return makeExpenseRange(start, addLocalMonths(start, 1), 1);
}

export function previousExpensePeriodRange(period: ExpensePeriodState, now = new Date()) {
  const range = expensePeriodRange(period, now);
  if (!range) return null;
  const start = addLocalMonths(range.start, -range.months);
  return makeExpenseRange(start, range.start, range.months);
}

export function expenseFetchRange(period: ExpensePeriodState, now = new Date()) {
  const selected = expensePeriodRange(period, now);
  if (!selected) return null;
  const previous = previousExpensePeriodRange(period, now);
  return makeExpenseRange(previous?.start ?? selected.start, selected.end, selected.months + (previous?.months ?? 0));
}

export function expenseDisplayDate(item: SmartExpense) {
  return item.date || (item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : '');
}

function expenseEnhanced(item: SmartExpense) {
  return item.enhanced && typeof item.enhanced === 'object' ? item.enhanced : {};
}

export function recurringFrequency(item: SmartExpense) {
  const enhanced = expenseEnhanced(item);
  return String(
    item.frequency ||
    item.expense_type ||
    enhanced.billing_frequency ||
    enhanced.frequency ||
    enhanced.recurring_frequency ||
    '',
  ).trim().toLowerCase();
}

export function isTruthyFlag(value: unknown) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

export function isRecurringExpense(item: SmartExpense) {
  const frequency = recurringFrequency(item);
  return isTruthyFlag(item.is_recurring) ||
    isTruthyFlag(item.recurring) ||
    ['monthly', 'recurring', 'weekly', 'yearly', 'annual'].includes(frequency) ||
    ['subscriptions', 'bills', 'loans'].includes(item.category || '');
}

export function isMonthlyRecurringExpense(item: SmartExpense) {
  const frequency = recurringFrequency(item);
  return isTruthyFlag(item.is_recurring) ||
    isTruthyFlag(item.recurring) ||
    frequency === 'monthly' ||
    frequency === 'recurring' ||
    ['subscriptions', 'bills', 'loans'].includes(item.category || '');
}

export function isExpenseActiveDuringRange(item: SmartExpense, range: ExpensePeriodRange) {
  const enhanced = expenseEnhanced(item);
  const subscriptionStart = typeof enhanced.subscription_start_date === 'string' ? enhanced.subscription_start_date : null;
  const subscriptionEnd = typeof enhanced.subscription_end_date === 'string' ? enhanced.subscription_end_date : null;
  const start = localDateFromInput(item.start_date || subscriptionStart || item.date || item.created_at);
  const end = localDateFromInput(item.end_date || subscriptionEnd);
  return (!start || start < range.end) && (!end || end >= range.start);
}

export function isExpenseInPeriod(item: SmartExpense, range: ExpensePeriodRange | null) {
  if (!range) return true;
  if (isMonthlyRecurringExpense(item) && isExpenseActiveDuringRange(item, range)) return true;
  const date = localDateFromInput(item.date || item.created_at);
  return Boolean(date && date >= range.start && date < range.end);
}

export function expensePeriodDayCount(range: ExpensePeriodRange | null, expenses: SmartExpense[]) {
  if (range) return Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86400000));
  const days = new Set(expenses.map(item => expenseDisplayDate(item)).filter(Boolean));
  return Math.max(1, days.size || 1);
}

export function formatExpenseMonthYear(year: number, month: number, lang: string) {
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(startOfLocalMonth(year, month));
}

export function expensePeriodOptionLabel(preset: ExpensePeriodPreset, lang: string) {
  const labels: Record<ExpensePeriodPreset, LangText> = {
    current: { ar: 'الشهر الحالي', en: 'Current month', fr: 'Mois courant' },
    previous: { ar: 'الشهر السابق', en: 'Previous month', fr: 'Mois précédent' },
    last3: { ar: 'آخر 3 أشهر', en: 'Last 3 months', fr: '3 derniers mois' },
    last6: { ar: 'آخر 6 أشهر', en: 'Last 6 months', fr: '6 derniers mois' },
    year: { ar: 'السنة الحالية', en: 'Current year', fr: 'Année courante' },
    all: { ar: 'كل المصروفات', en: 'All expenses', fr: 'Toutes les dépenses' },
    custom: { ar: 'اختيار شهر مخصص', en: 'Custom month', fr: 'Mois personnalisé' },
  };
  return pick(labels[preset], lang);
}

export function expensePeriodLabel(period: ExpensePeriodState, lang: string, now = new Date()) {
  if (period.preset === 'custom') return formatExpenseMonthYear(period.year, period.month, lang);
  if (period.preset === 'current' || period.preset === 'previous') {
    const range = expensePeriodRange(period, now);
    return range ? formatExpenseMonthYear(range.start.getFullYear(), range.start.getMonth() + 1, lang) : expensePeriodOptionLabel(period.preset, lang);
  }
  return expensePeriodOptionLabel(period.preset, lang);
}

export function expensePeriodBadge(period: ExpensePeriodState, lang: string) {
  if (period.preset === 'all') {
    return pick({ ar: 'يعرض: كل المصروفات', en: 'Showing: all expenses', fr: 'Affiche : toutes les dépenses' }, lang);
  }
  return pick({ ar: 'يعرض مصروفات:', en: 'Showing expenses:', fr: 'Affiche les dépenses :' }, lang) + ` ${expensePeriodLabel(period, lang)}`;
}

export function expenseFilterTypeLabel(type: string, lang: string) {
  const labels: Record<string, LangText> = {
    all: { ar: 'كل الأنواع', en: 'All types', fr: 'Tous les types' },
    personal: { ar: 'شخصي', en: 'Personal', fr: 'Personnel' },
    project: { ar: 'مشروع', en: 'Project', fr: 'Projet' },
    recurring: { ar: 'متكرر', en: 'Recurring', fr: 'Récurrent' },
    one_time: { ar: 'غير متكرر', en: 'One-time', fr: 'Ponctuel' },
  };
  return pick(labels[type] || labels.all, lang);
}

export function expenseMatchesType(item: SmartExpense, type: string) {
  if (type === 'all') return true;
  if (type === 'project') return isProjectLinkedExpenseRow(item);
  if (type === 'personal') return !isProjectLinkedExpenseRow(item);
  if (type === 'recurring') return isRecurringExpense(item);
  if (type === 'one_time') return !isRecurringExpense(item);
  return true;
}

export function monthsBetween(from: Date, to?: string | null) {
  if (!to) return 0;
  const end = new Date(to);
  if (Number.isNaN(end.getTime()) || end <= from) return 0;
  const years = end.getFullYear() - from.getFullYear();
  const months = end.getMonth() - from.getMonth();
  const days = end.getDate() >= from.getDate() ? 0 : -1;
  return Math.max(1, years * 12 + months + days);
}

export function goalFromRow(item: GoalRow): GoalItem {
  const notes = parseGoalNotes(item.notes);
  const amounts = calculateGoalProgress(item);
  const deadline = item.target_date
    ?? item.targetDate
    ?? item.deadline
    ?? (typeof notes.deadline === 'string' ? notes.deadline : null)
    ?? (item.duration && item.duration_unit === 'month'
      ? formatDateInput(addMonths(new Date(), Number(item.duration) || 0))
      : null);

  return {
    id: item.id,
    name: item.goal ?? item.title ?? item.name ?? '',
    target_amount: amounts.targetAmount,
    current_amount: amounts.currentAmount,
    monthly_contribution: amounts.monthlyContribution,
    goal_type: typeof notes.goalType === 'string' ? notes.goalType : 'saving',
    category: typeof notes.category === 'string' ? notes.category : 'general',
    priority: typeof notes.priority === 'string' ? notes.priority : 'medium',
    funding_source: typeof notes.fundingSource === 'string' ? notes.fundingSource : 'salary',
    currency: item.currency || (typeof notes.currency === 'string' ? notes.currency : 'KWD'),
    ai_enabled: typeof notes.aiEnabled === 'boolean' ? notes.aiEnabled : true,
    icon: '🎯',
    color: 'var(--sfm-soft-cyan)',
    deadline,
    notes: item.notes,
    created_at: item.created_at,
  };
}

export function entryTitleKey(kind: EntryKind) {
  return entryTitleKeys[kind];
}

export function deleteConfirmKey(kind: EntryKind) {
  return deleteConfirmKeys[kind];
}

export function classifyDataError(message: string): DataErrorKind {
  const lower = message.toLowerCase();
  if (lower.includes('permission') || lower.includes('row-level') || lower.includes('rls') || lower.includes('not authorized') || lower.includes('42501')) return 'permission';
  if (lower.includes('jwt') || lower.includes('auth') || lower.includes('session')) return 'auth';
  if (lower.includes('relation') || lower.includes('column') || lower.includes('schema') || lower.includes('pgrst') || lower.includes('failed to fetch')) return 'database';
  return 'unknown';
}

export function missingColumnFromError(message: string) {
  const match = message.match(/column\s+["']?(?:\w+\.)?(\w+)["']?\s+(?:does not exist|not found)/i)
    ?? message.match(/could not find the ['"]?(\w+)['"]? column/i);
  return match?.[1];
}

export function isSchemaColumnError(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '');
  return /column|schema cache|pgrst204|does not exist|could not find/i.test(message);
}

export function logDataLoadError(error: DataLoadError, userId?: string) {
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

export async function safeQuery<T>(
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

