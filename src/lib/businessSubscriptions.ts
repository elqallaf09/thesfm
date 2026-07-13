import { normalizeDigits, toLatinNumberLocale } from '@/lib/locale';
import { STATIC_EMAIL_VISUAL_STYLES, STATIC_LIGHT_VISUAL_TOKENS } from '@/styles/static-tokens';

export type SubscriptionLang = 'ar' | 'en' | 'fr';

export type SubscriptionType =
  | 'monthly'
  | 'weekly'
  | 'quarterly'
  | 'semi_annual'
  | 'yearly'
  | 'custom';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'partial'
  | 'advance'
  | 'missed'
  | 'late'
  | 'refunded'
  | 'overdue';

export type PaymentAction = 'paid' | 'partial' | 'advance' | 'missed' | 'late' | 'refund';

export type ClientRow = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  color_tag: string | null;
  avatar_url: string | null;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  client_id: string;
  amount: number | string;
  currency: string | null;
  subscription_type: SubscriptionType | string;
  custom_interval_days: number | string | null;
  start_date: string;
  next_payment_date: string;
  automatic_renewal: boolean | null;
  status: SubscriptionStatus | string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRow = {
  id: string;
  user_id: string;
  client_id: string;
  subscription_id: string;
  amount_due: number | string;
  amount_paid: number | string;
  currency: string | null;
  due_date: string;
  paid_at: string | null;
  status: PaymentStatus | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentHistoryRow = {
  id: string;
  user_id: string;
  payment_id: string | null;
  client_id: string;
  subscription_id: string | null;
  action: string;
  amount: number | string | null;
  currency: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ClientNoteRow = {
  id: string;
  user_id: string;
  client_id: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type ClientFileRow = {
  id: string;
  user_id: string;
  client_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | string | null;
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  user_id: string;
  client_id: string | null;
  subscription_id: string | null;
  payment_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ReminderNotificationRow = {
  id: string;
  user_id: string;
  client_id: string;
  subscription_id: string;
  payment_id: string | null;
  channel: string;
  reminder_type: string;
  scheduled_for: string;
  sent_at: string | null;
  status: string;
  dedupe_key: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ClientBundle = {
  client: ClientRow;
  subscription: SubscriptionRow | null;
  payments: PaymentRow[];
  history: PaymentHistoryRow[];
  notes: ClientNoteRow[];
  files: ClientFileRow[];
  activity: ActivityLogRow[];
  notifications: ReminderNotificationRow[];
};

export type DashboardMetrics = {
  totalClients: number;
  activeSubscriptions: number;
  expiringTomorrow: number;
  dueToday: number;
  overduePayments: number;
  monthlyRevenue: number;
  expectedRevenueThisMonth: number;
  collectedRevenue: number;
  outstandingRevenue: number;
};

export type ReminderCandidate = {
  payment: PaymentRow | null;
  client: ClientRow;
  subscription: SubscriptionRow;
  reminderType: string;
  daysRemaining: number;
  dueDate: string;
  dedupeKey: string;
};

const subscriptionTypes: SubscriptionType[] = ['monthly', 'weekly', 'quarterly', 'semi_annual', 'yearly', 'custom'];
const subscriptionStatuses: SubscriptionStatus[] = ['active', 'paused', 'cancelled', 'expired'];
const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'partial', 'advance', 'missed', 'late', 'refunded', 'overdue'];

export const SUBSCRIPTION_ASSET_BUCKET = 'subscription-client-assets';

export const SUBSCRIPTION_TEXT = {
  ar: {
    pageTitle: 'إدارة العملاء والاشتراكات',
    subtitle: 'تابع العملاء، المدفوعات، التجديدات، والإيرادات المتكررة من مساحة عمل واحدة.',
    businessBadge: 'إدارة الأعمال',
    addClient: 'إضافة عميل',
    addFirstClient: 'إضافة أول عميل',
    exportPdf: 'تصدير PDF',
    exportExcel: 'تصدير Excel',
    exportCsv: 'تصدير CSV',
    print: 'طباعة',
    loading: 'جار تحميل بيانات العملاء...',
    signIn: 'سجل الدخول لإدارة العملاء والاشتراكات.',
    retry: 'إعادة المحاولة',
    noData: 'لا توجد بيانات عملاء حتى الآن',
    noDataBody: 'أضف أول عميل لتتبع الاشتراك، الدفعات، التنبيهات، والإيرادات المتوقعة.',
    noMatches: 'لا توجد نتائج مطابقة للفلاتر الحالية.',
    clearFilters: 'مسح الفلاتر',
    totalClients: 'إجمالي العملاء',
    activeSubscriptions: 'الاشتراكات النشطة',
    expiringTomorrow: 'تستحق غداً',
    dueToday: 'مستحقة اليوم',
    overduePayments: 'مدفوعات متأخرة',
    monthlyRevenue: 'الإيراد الشهري',
    expectedRevenueThisMonth: 'الإيراد المتوقع هذا الشهر',
    collectedRevenue: 'الإيراد المحصل',
    outstandingRevenue: 'الإيراد المستحق',
    search: 'بحث عن اسم أو هاتف أو بريد...',
    allStatuses: 'كل الحالات',
    allTypes: 'كل الأنواع',
    allPayments: 'كل المدفوعات',
    today: 'اليوم',
    tomorrow: 'غداً',
    thisWeek: 'هذا الأسبوع',
    thisMonth: 'هذا الشهر',
    overdue: 'متأخر',
    cancelled: 'ملغي',
    paused: 'متوقف مؤقتاً',
    active: 'نشط',
    expired: 'منتهي',
    monthly: 'شهري',
    weekly: 'أسبوعي',
    quarterly: 'ربع سنوي',
    semi_annual: 'نصف سنوي',
    yearly: 'سنوي',
    custom: 'مخصص',
    clientList: 'قائمة العملاء',
    notifications: 'مركز التنبيهات',
    calendar: 'تقويم المدفوعات',
    statistics: 'الإحصاءات',
    clientProfile: 'ملف العميل',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    whatsapp: 'رقم واتساب',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    notes: 'ملاحظات',
    amount: 'مبلغ الاشتراك',
    currency: 'العملة',
    subscriptionType: 'نوع الاشتراك',
    startDate: 'تاريخ بداية الاشتراك',
    nextPaymentDate: 'تاريخ الدفعة القادمة',
    automaticRenewal: 'تجديد تلقائي',
    status: 'الحالة',
    colorTag: 'وسم اللون',
    avatarUpload: 'رفع صورة رمزية',
    profileUpload: 'رفع صورة الملف',
    saveClient: 'حفظ العميل',
    updateClient: 'حفظ التعديلات',
    formRequired: 'الاسم، الهاتف، المبلغ، وتاريخ الدفعة القادمة مطلوبة.',
    formInvalidAmount: 'المبلغ يجب أن يكون رقماً موجباً.',
    saved: 'تم حفظ بيانات العميل.',
    deleted: 'تم حذف العميل.',
    saveFailed: 'تعذر حفظ العميل حالياً.',
    loadFailed: 'تعذر تحميل بيانات العملاء.',
    markPaid: 'تسجيل مدفوع',
    partialPayment: 'دفعة جزئية',
    advancePayment: 'دفعة مقدمة',
    missedPayment: 'دفعة فائتة',
    latePayment: 'دفعة متأخرة',
    refund: 'استرداد',
    paymentActionFailed: 'تعذر تحديث الدفعة حالياً.',
    paymentUpdated: 'تم تحديث الدفعة وإنشاء السجل.',
    openProfile: 'فتح الملف',
    edit: 'تعديل',
    delete: 'حذف',
    lastPayment: 'آخر دفعة',
    nextPayment: 'الدفعة القادمة',
    outstandingBalance: 'الرصيد المستحق',
    files: 'الملفات',
    activityLog: 'سجل النشاط',
    paymentTimeline: 'مسار المدفوعات',
    subscriptionHistory: 'سجل الاشتراك',
    addNote: 'إضافة ملاحظة',
    uploadFile: 'رفع ملف',
    paid: 'مدفوع',
    pending: 'معلق',
    partial: 'جزئي',
    advance: 'مقدم',
    missed: 'فائت',
    late: 'متأخر',
    refunded: 'مسترد',
    upcoming: 'قادم',
    tomorrowColor: 'غداً',
    dueTodayColor: 'اليوم',
    paidColor: 'مدفوع',
    overdueColor: 'متأخر',
    upcomingColor: 'قادم',
    unread: 'غير مقروءة',
    reminder7: 'تذكير قبل 7 أيام',
    reminder3: 'تذكير قبل 3 أيام',
    reminder1: 'تذكير قبل يوم',
    reminder0: 'تذكير يوم الاستحقاق',
    reminderOverdue: 'تذكير تأخير',
    emailReady: 'البريد الإلكتروني جاهز عند إعداد SMTP.',
    integrations: 'تتكامل الدفعات المحصلة مع صفحة الدخل والتقارير.',
    unavailable: 'غير متاح',
  },
  en: {
    pageTitle: 'Clients & Subscriptions',
    subtitle: 'Manage clients, payments, renewals, and recurring revenue from one workspace.',
    businessBadge: 'Business Management',
    addClient: 'Add Client',
    addFirstClient: 'Add First Client',
    exportPdf: 'Export PDF',
    exportExcel: 'Export Excel',
    exportCsv: 'Export CSV',
    print: 'Print',
    loading: 'Loading client data...',
    signIn: 'Sign in to manage clients and subscriptions.',
    retry: 'Retry',
    noData: 'No clients yet',
    noDataBody: 'Add your first client to track subscriptions, payments, alerts, and expected revenue.',
    noMatches: 'No results match the current filters.',
    clearFilters: 'Clear filters',
    totalClients: 'Total Clients',
    activeSubscriptions: 'Active Subscriptions',
    expiringTomorrow: 'Expiring Tomorrow',
    dueToday: 'Due Today',
    overduePayments: 'Overdue Payments',
    monthlyRevenue: 'Monthly Revenue',
    expectedRevenueThisMonth: 'Expected Revenue This Month',
    collectedRevenue: 'Collected Revenue',
    outstandingRevenue: 'Outstanding Revenue',
    search: 'Search name, phone, or email...',
    allStatuses: 'All statuses',
    allTypes: 'All types',
    allPayments: 'All payments',
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
    paused: 'Paused',
    active: 'Active',
    expired: 'Expired',
    monthly: 'Monthly',
    weekly: 'Weekly',
    quarterly: 'Quarterly',
    semi_annual: 'Semi Annual',
    yearly: 'Yearly',
    custom: 'Custom',
    clientList: 'Client List',
    notifications: 'Notification Center',
    calendar: 'Payment Calendar',
    statistics: 'Statistics',
    clientProfile: 'Client Profile',
    fullName: 'Full Name',
    phone: 'Phone Number',
    whatsapp: 'WhatsApp Number',
    email: 'Email',
    address: 'Address',
    notes: 'Notes',
    amount: 'Subscription Amount',
    currency: 'Currency',
    subscriptionType: 'Subscription Type',
    startDate: 'Subscription Start Date',
    nextPaymentDate: 'Next Payment Date',
    automaticRenewal: 'Automatic Renewal',
    status: 'Status',
    colorTag: 'Color Tag',
    avatarUpload: 'Avatar upload',
    profileUpload: 'Profile photo upload',
    saveClient: 'Save Client',
    updateClient: 'Save Changes',
    formRequired: 'Name, phone, amount, and next payment date are required.',
    formInvalidAmount: 'Amount must be a positive number.',
    saved: 'Client saved.',
    deleted: 'Client deleted.',
    saveFailed: 'Could not save the client right now.',
    loadFailed: 'Could not load client data.',
    markPaid: 'Mark as Paid',
    partialPayment: 'Partial Payment',
    advancePayment: 'Advance Payment',
    missedPayment: 'Missed Payment',
    latePayment: 'Late Payment',
    refund: 'Refund',
    paymentActionFailed: 'Could not update the payment right now.',
    paymentUpdated: 'Payment updated and history created.',
    openProfile: 'Open Profile',
    edit: 'Edit',
    delete: 'Delete',
    lastPayment: 'Last Payment',
    nextPayment: 'Next Payment',
    outstandingBalance: 'Outstanding Balance',
    files: 'Files',
    activityLog: 'Activity Log',
    paymentTimeline: 'Payment Timeline',
    subscriptionHistory: 'Subscription History',
    addNote: 'Add Note',
    uploadFile: 'Upload File',
    paid: 'Paid',
    pending: 'Pending',
    partial: 'Partial',
    advance: 'Advance',
    missed: 'Missed',
    late: 'Late',
    refunded: 'Refunded',
    upcoming: 'Upcoming',
    tomorrowColor: 'Tomorrow',
    dueTodayColor: 'Today',
    paidColor: 'Paid',
    overdueColor: 'Overdue',
    upcomingColor: 'Upcoming',
    unread: 'Unread',
    reminder7: '7-day reminder',
    reminder3: '3-day reminder',
    reminder1: '1-day reminder',
    reminder0: 'Due-date reminder',
    reminderOverdue: 'Overdue reminder',
    emailReady: 'Email is ready when SMTP is configured.',
    integrations: 'Collected payments integrate with Income and Reports.',
    unavailable: 'Unavailable',
  },
  fr: {
    pageTitle: 'Clients et abonnements',
    subtitle: 'Gerez clients, paiements, renouvellements et revenus recurrents dans un seul espace.',
    businessBadge: 'Gestion commerciale',
    addClient: 'Ajouter un client',
    addFirstClient: 'Ajouter un premier client',
    exportPdf: 'Exporter PDF',
    exportExcel: 'Exporter Excel',
    exportCsv: 'Exporter CSV',
    print: 'Imprimer',
    loading: 'Chargement des clients...',
    signIn: 'Connectez-vous pour gerer les clients et abonnements.',
    retry: 'Reessayer',
    noData: 'Aucun client pour le moment',
    noDataBody: 'Ajoutez votre premier client pour suivre abonnements, paiements, alertes et revenus.',
    noMatches: 'Aucun resultat ne correspond aux filtres.',
    clearFilters: 'Effacer les filtres',
    totalClients: 'Total clients',
    activeSubscriptions: 'Abonnements actifs',
    expiringTomorrow: 'A echeance demain',
    dueToday: "A echeance aujourd'hui",
    overduePayments: 'Paiements en retard',
    monthlyRevenue: 'Revenu mensuel',
    expectedRevenueThisMonth: 'Revenu attendu ce mois',
    collectedRevenue: 'Revenu encaisse',
    outstandingRevenue: 'Revenu restant',
    search: 'Rechercher nom, telephone ou e-mail...',
    allStatuses: 'Tous les statuts',
    allTypes: 'Tous les types',
    allPayments: 'Tous les paiements',
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    thisWeek: 'Cette semaine',
    thisMonth: 'Ce mois',
    overdue: 'En retard',
    cancelled: 'Annule',
    paused: 'En pause',
    active: 'Actif',
    expired: 'Expire',
    monthly: 'Mensuel',
    weekly: 'Hebdomadaire',
    quarterly: 'Trimestriel',
    semi_annual: 'Semestriel',
    yearly: 'Annuel',
    custom: 'Personnalise',
    clientList: 'Liste des clients',
    notifications: 'Centre de notifications',
    calendar: 'Calendrier des paiements',
    statistics: 'Statistiques',
    clientProfile: 'Profil client',
    fullName: 'Nom complet',
    phone: 'Telephone',
    whatsapp: 'WhatsApp',
    email: 'E-mail',
    address: 'Adresse',
    notes: 'Notes',
    amount: 'Montant abonnement',
    currency: 'Devise',
    subscriptionType: "Type d'abonnement",
    startDate: "Date de debut",
    nextPaymentDate: 'Prochaine echeance',
    automaticRenewal: 'Renouvellement automatique',
    status: 'Statut',
    colorTag: 'Couleur',
    avatarUpload: 'Avatar',
    profileUpload: 'Photo de profil',
    saveClient: 'Enregistrer',
    updateClient: 'Enregistrer',
    formRequired: 'Nom, telephone, montant et prochaine echeance sont requis.',
    formInvalidAmount: 'Le montant doit etre positif.',
    saved: 'Client enregistre.',
    deleted: 'Client supprime.',
    saveFailed: "Impossible d'enregistrer le client.",
    loadFailed: 'Impossible de charger les clients.',
    markPaid: 'Marquer paye',
    partialPayment: 'Paiement partiel',
    advancePayment: 'Paiement avance',
    missedPayment: 'Paiement manque',
    latePayment: 'Paiement tardif',
    refund: 'Remboursement',
    paymentActionFailed: 'Impossible de mettre a jour le paiement.',
    paymentUpdated: 'Paiement mis a jour et historique cree.',
    openProfile: 'Ouvrir le profil',
    edit: 'Modifier',
    delete: 'Supprimer',
    lastPayment: 'Dernier paiement',
    nextPayment: 'Prochain paiement',
    outstandingBalance: 'Solde restant',
    files: 'Fichiers',
    activityLog: 'Journal',
    paymentTimeline: 'Chronologie',
    subscriptionHistory: 'Historique abonnement',
    addNote: 'Ajouter note',
    uploadFile: 'Importer fichier',
    paid: 'Paye',
    pending: 'En attente',
    partial: 'Partiel',
    advance: 'Avance',
    missed: 'Manque',
    late: 'Tardif',
    refunded: 'Rembourse',
    upcoming: 'A venir',
    tomorrowColor: 'Demain',
    dueTodayColor: "Aujourd'hui",
    paidColor: 'Paye',
    overdueColor: 'Retard',
    upcomingColor: 'A venir',
    unread: 'Non lu',
    reminder7: 'Rappel 7 jours',
    reminder3: 'Rappel 3 jours',
    reminder1: 'Rappel 1 jour',
    reminder0: "Rappel d'echeance",
    reminderOverdue: 'Rappel retard',
    emailReady: 'E-mail pret lorsque SMTP est configure.',
    integrations: 'Les paiements encaisses alimentent Revenus et Rapports.',
    unavailable: 'Indisponible',
  },
} as const;

export function normalizeSubscriptionLang(value: unknown): SubscriptionLang {
  return value === 'en' || value === 'fr' ? value : 'ar';
}

export function subscriptionTypeLabel(value: unknown, lang: SubscriptionLang) {
  const type = normalizeSubscriptionType(value);
  return SUBSCRIPTION_TEXT[lang][type];
}

export function subscriptionStatusLabel(value: unknown, lang: SubscriptionLang) {
  const status = normalizeSubscriptionStatus(value);
  return SUBSCRIPTION_TEXT[lang][status];
}

export function paymentStatusLabel(value: unknown, lang: SubscriptionLang) {
  const status = normalizePaymentStatus(value);
  return SUBSCRIPTION_TEXT[lang][status];
}

export function normalizeSubscriptionType(value: unknown): SubscriptionType {
  const normalized = String(value ?? '').trim().toLowerCase();
  return subscriptionTypes.includes(normalized as SubscriptionType) ? normalized as SubscriptionType : 'monthly';
}

export function normalizeSubscriptionStatus(value: unknown): SubscriptionStatus {
  const normalized = String(value ?? '').trim().toLowerCase();
  return subscriptionStatuses.includes(normalized as SubscriptionStatus) ? normalized as SubscriptionStatus : 'active';
}

export function normalizePaymentStatus(value: unknown): PaymentStatus {
  const normalized = String(value ?? '').trim().toLowerCase();
  return paymentStatuses.includes(normalized as PaymentStatus) ? normalized as PaymentStatus : 'pending';
}

export function numericValue(value: unknown, fallback = 0) {
  const parsed = Number(normalizeDigits(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseAmountInput(value: unknown) {
  const parsed = Number(normalizeDigits(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

export function formatMoney(value: unknown, currency = 'KWD', lang: SubscriptionLang = 'ar') {
  const amount = numericValue(value, 0);
  const locale = toLatinNumberLocale(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US');
  const digits = String(currency || '').toUpperCase() === 'KWD' ? 3 : 2;
  return normalizeDigits(`${new Intl.NumberFormat(locale, {
    numberingSystem: 'latn',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount)} ${currency || ''}`.trim());
}

export function formatDate(value: unknown, lang: SubscriptionLang = 'ar') {
  if (!value) return SUBSCRIPTION_TEXT[lang].unavailable;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return SUBSCRIPTION_TEXT[lang].unavailable;
  const locale = toLatinNumberLocale(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US');
  return normalizeDigits(new Intl.DateTimeFormat(locale, { dateStyle: 'medium', numberingSystem: 'latn' }).format(date));
}

export function todayIso(base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate()).toISOString().slice(0, 10);
}

export function isDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addDays(dateIso: string, days: number) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonthsClamped(dateIso: string, months: number) {
  const [year, month, day] = dateIso.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function calculateNextPaymentDate(
  fromDateIso: string,
  subscriptionType: unknown,
  customIntervalDays?: unknown,
) {
  const source = isDateInput(fromDateIso) ? fromDateIso : todayIso();
  const type = normalizeSubscriptionType(subscriptionType);
  if (type === 'weekly') return addDays(source, 7);
  if (type === 'quarterly') return addMonthsClamped(source, 3);
  if (type === 'semi_annual') return addMonthsClamped(source, 6);
  if (type === 'yearly') return addMonthsClamped(source, 12);
  if (type === 'custom') return addDays(source, Math.max(1, Math.round(numericValue(customIntervalDays, 30))));
  return addMonthsClamped(source, 1);
}

export function monthlyEquivalent(subscription: Pick<SubscriptionRow, 'amount' | 'subscription_type' | 'custom_interval_days' | 'status'>) {
  if (normalizeSubscriptionStatus(subscription.status) !== 'active') return 0;
  const amount = numericValue(subscription.amount);
  const type = normalizeSubscriptionType(subscription.subscription_type);
  if (type === 'weekly') return amount * 52 / 12;
  if (type === 'quarterly') return amount / 3;
  if (type === 'semi_annual') return amount / 6;
  if (type === 'yearly') return amount / 12;
  if (type === 'custom') {
    const days = Math.max(1, numericValue(subscription.custom_interval_days, 30));
    return amount * (365 / days) / 12;
  }
  return amount;
}

export function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86400000);
}

export function isPaymentOpen(payment: PaymentRow) {
  const status = normalizePaymentStatus(payment.status);
  return status === 'pending' || status === 'partial' || status === 'late' || status === 'missed' || status === 'overdue';
}

export function effectivePaymentStatus(payment: PaymentRow, baseDate = todayIso()): PaymentStatus {
  const status = normalizePaymentStatus(payment.status);
  if ((status === 'pending' || status === 'partial') && daysBetween(payment.due_date, baseDate) > 0) return 'overdue';
  return status;
}

export function buildClientBundles(input: {
  clients: ClientRow[];
  subscriptions: SubscriptionRow[];
  payments: PaymentRow[];
  history: PaymentHistoryRow[];
  notes: ClientNoteRow[];
  files: ClientFileRow[];
  activity: ActivityLogRow[];
  notifications: ReminderNotificationRow[];
}): ClientBundle[] {
  return input.clients.map(client => {
    const clientSubscriptions = input.subscriptions
      .filter(item => item.client_id === client.id)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return {
      client,
      subscription: clientSubscriptions[0] ?? null,
      payments: input.payments.filter(item => item.client_id === client.id).sort((a, b) => String(b.due_date).localeCompare(String(a.due_date))),
      history: input.history.filter(item => item.client_id === client.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
      notes: input.notes.filter(item => item.client_id === client.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
      files: input.files.filter(item => item.client_id === client.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
      activity: input.activity.filter(item => item.client_id === client.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
      notifications: input.notifications.filter(item => item.client_id === client.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    };
  });
}

export function calculateDashboardMetrics(bundles: ClientBundle[], baseDate = todayIso()): DashboardMetrics {
  const monthStart = baseDate.slice(0, 8) + '01';
  const monthEnd = addMonthsClamped(monthStart, 1);
  const activeSubscriptions = bundles
    .map(bundle => bundle.subscription)
    .filter((subscription): subscription is SubscriptionRow => {
      if (!subscription) return false;
      return normalizeSubscriptionStatus(subscription.status) === 'active';
    });
  const allPayments = bundles.flatMap(bundle => bundle.payments);
  const openPayments = allPayments.filter(isPaymentOpen);
  const paidThisMonth = allPayments.filter(payment => {
    const status = normalizePaymentStatus(payment.status);
    const date = String(payment.paid_at ?? payment.due_date ?? '').slice(0, 10);
    return (status === 'paid' || status === 'advance') && date >= monthStart && date < monthEnd;
  });
  const expectedThisMonth = allPayments.filter(payment => payment.due_date >= monthStart && payment.due_date < monthEnd);
  return {
    totalClients: bundles.length,
    activeSubscriptions: activeSubscriptions.length,
    expiringTomorrow: activeSubscriptions.filter(item => daysBetween(baseDate, item.next_payment_date) === 1).length,
    dueToday: openPayments.filter(item => daysBetween(baseDate, item.due_date) === 0).length,
    overduePayments: openPayments.filter(item => daysBetween(item.due_date, baseDate) > 0).length,
    monthlyRevenue: activeSubscriptions.reduce((sum, item) => sum + monthlyEquivalent(item), 0),
    expectedRevenueThisMonth: expectedThisMonth.reduce((sum, item) => sum + numericValue(item.amount_due), 0),
    collectedRevenue: paidThisMonth.reduce((sum, item) => sum + numericValue(item.amount_paid), 0),
    outstandingRevenue: openPayments.reduce((sum, item) => sum + Math.max(0, numericValue(item.amount_due) - numericValue(item.amount_paid)), 0),
  };
}

export function latestPayment(payments: PaymentRow[], statuses: PaymentStatus[]) {
  const allowed = new Set(statuses);
  return [...payments]
    .filter(payment => allowed.has(normalizePaymentStatus(payment.status)))
    .sort((a, b) => String(b.paid_at ?? b.updated_at ?? b.due_date).localeCompare(String(a.paid_at ?? a.updated_at ?? a.due_date)))[0] ?? null;
}

export function nextOpenPayment(payments: PaymentRow[]) {
  return [...payments]
    .filter(isPaymentOpen)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0] ?? null;
}

export function reminderTypeForPayment(payment: PaymentRow, baseDate = todayIso()) {
  const days = daysBetween(baseDate, payment.due_date);
  if (days === 7) return 'reminder_7_days';
  if (days === 3) return 'reminder_3_days';
  if (days === 1) return 'reminder_1_day';
  if (days === 0) return 'reminder_due_today';
  if (days < 0 && Math.abs(days) % 3 === 0) return 'reminder_overdue_3_days';
  return null;
}

export function reminderLabel(reminderType: string, lang: SubscriptionLang) {
  const text = SUBSCRIPTION_TEXT[lang];
  if (reminderType === 'reminder_7_days') return text.reminder7;
  if (reminderType === 'reminder_3_days') return text.reminder3;
  if (reminderType === 'reminder_1_day') return text.reminder1;
  if (reminderType === 'reminder_due_today') return text.reminder0;
  if (reminderType === 'reminder_overdue_3_days') return text.reminderOverdue;
  return reminderType;
}

export function buildReminderCandidates(bundles: ClientBundle[], baseDate = todayIso()): ReminderCandidate[] {
  return bundles.flatMap(bundle => {
    if (!bundle.subscription || normalizeSubscriptionStatus(bundle.subscription.status) !== 'active') return [];
    const isReminderCandidate = (item: ReminderCandidate | null): item is ReminderCandidate => Boolean(item);
    const openPaymentCandidates = bundle.payments
      .filter(isPaymentOpen)
      .map((payment): ReminderCandidate | null => {
        const reminderType = reminderTypeForPayment(payment, baseDate);
        if (!reminderType) return null;
        const daysRemaining = daysBetween(baseDate, payment.due_date);
        return {
          payment,
          client: bundle.client,
          subscription: bundle.subscription as SubscriptionRow,
          reminderType,
          daysRemaining,
          dueDate: payment.due_date,
          dedupeKey: `${payment.id}:${reminderType}:${baseDate}`,
        };
      })
      .filter(isReminderCandidate);

    const subscriptionDueDate = bundle.subscription.next_payment_date;
    const hasAnyPaymentForNextDate = bundle.payments.some(payment =>
      payment.subscription_id === bundle.subscription?.id &&
      payment.due_date === subscriptionDueDate
    );
    const subscriptionReminderType = !hasAnyPaymentForNextDate
      ? reminderTypeForPayment({
        id: bundle.subscription.id,
        user_id: bundle.subscription.user_id,
        client_id: bundle.subscription.client_id,
        subscription_id: bundle.subscription.id,
        amount_due: bundle.subscription.amount,
        amount_paid: 0,
        currency: bundle.subscription.currency || 'KWD',
        due_date: subscriptionDueDate,
        paid_at: null,
        status: 'pending',
        notes: null,
        created_at: bundle.subscription.created_at,
        updated_at: bundle.subscription.updated_at,
      }, baseDate)
      : null;

    if (!subscriptionReminderType) return openPaymentCandidates;

    return [
      ...openPaymentCandidates,
      {
        payment: null,
        client: bundle.client,
        subscription: bundle.subscription,
        reminderType: subscriptionReminderType,
        daysRemaining: daysBetween(baseDate, subscriptionDueDate),
        dueDate: subscriptionDueDate,
        dedupeKey: `subscription:${bundle.subscription.id}:${subscriptionReminderType}:${baseDate}`,
      },
    ];
  });
}

export function reminderCandidateAmount(candidate: ReminderCandidate) {
  return candidate.payment?.amount_due ?? candidate.subscription.amount;
}

export function reminderCandidateCurrency(candidate: ReminderCandidate, fallback = 'KWD') {
  return candidate.payment?.currency || candidate.subscription.currency || fallback;
}

export function clientInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'S';
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');
}

export function safeText(value: unknown) {
  return String(value ?? '').trim();
}

export function sanitizeColorTag(value: unknown) {
  const color = safeText(value);
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : STATIC_LIGHT_VISUAL_TOKENS.primary;
}

export function emailReminderTemplate(input: {
  clientName: string;
  phone: string;
  amount: string;
  currency: string;
  dueDate: string;
  daysRemaining: number;
  openClientUrl: string;
}) {
  const subject = 'Payment Reminder - Subscription Due';
  const daysLabel = input.daysRemaining > 0
    ? `${input.daysRemaining} day(s) remaining`
    : input.daysRemaining === 0
      ? 'Due today'
      : `${Math.abs(input.daysRemaining)} day(s) overdue`;
  const text = [
    `Client Name: ${input.clientName}`,
    `Phone Number: ${input.phone}`,
    `Subscription Amount: ${input.amount} ${input.currency}`,
    `Due Date: ${input.dueDate}`,
    `Days Remaining: ${daysLabel}`,
    `Open Client: ${input.openClientUrl}`,
  ].join('\n');
  const html = `
    <div style="${STATIC_EMAIL_VISUAL_STYLES.canvas}">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${STATIC_EMAIL_VISUAL_STYLES.panel};max-width:640px;margin:auto;overflow:hidden">
        <tr>
          <td style="background:${STATIC_LIGHT_VISUAL_TOKENS.primary};padding:28px;color:${STATIC_LIGHT_VISUAL_TOKENS.primaryForeground}">
            <div style="font-size:12px;font-weight:800;letter-spacing:.08em">THE SFM</div>
            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25">Payment Reminder</h1>
            <p style="margin:8px 0 0">A subscription payment is due.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
              ${[
                ['Client Name', input.clientName],
                ['Phone Number', input.phone],
                ['Subscription Amount', `${input.amount} ${input.currency}`],
                ['Due Date', input.dueDate],
                ['Days Remaining', daysLabel],
              ].map(([label, value]) => `
                <tr>
                  <td style="${STATIC_EMAIL_VISUAL_STYLES.dividerLabel};padding:10px 0;font-size:13px">${label}</td>
                  <td style="${STATIC_EMAIL_VISUAL_STYLES.dividerValue};padding:10px 0;font-size:14px;font-weight:800;text-align:right">${value}</td>
                </tr>
              `).join('')}
            </table>
            <div style="margin-top:24px">
              <a href="${input.openClientUrl}" style="${STATIC_EMAIL_VISUAL_STYLES.primaryAction};padding:12px 18px">Open Client</a>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
  return { subject, text, html };
}
