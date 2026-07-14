'use client';

import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Cloud,
  CreditCard,
  Edit3,
  ExternalLink,
  Film,
  Filter,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Layers3,
  MessageCircle,
  MoreHorizontal,
  PauseCircle,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  WalletCards,
  Wifi,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { CurrencySelect } from '@/components/CurrencySelect';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase, supabaseConfigError } from '@/integrations/supabase/client';
import { approximateFxRate, convertCurrencyAmount, fxKey, normalizeMoneyCurrencyCode } from '@/lib/currencyConversion';
import { formatMoney } from '@/lib/formatMoney';
import { normalizeNumberInput } from '@/lib/money';
import { useCurrency } from '@/lib/useCurrency';
import {
  BILLING_CYCLES,
  SUBSCRIPTION_CATEGORIES,
  SUBSCRIPTION_EXAMPLES,
  SUBSCRIPTION_STATUSES,
  TELECOM_REGIONS,
  annualEquivalent,
  isSpendActiveStatus,
  monthlyEquivalent,
  nextRenewalDate,
  normalizeSubscriptionSearch,
  type BillingCycle,
  type SubscriptionCategory,
  type SubscriptionExample,
  type SubscriptionRegion,
  type SubscriptionStatus,
} from '@/lib/subscriptions/monthlySubscriptions';

type Lang = 'ar' | 'en' | 'fr';
type FilterValue = 'all';
type RenewalFilter = FilterValue | 'today' | '7' | '30' | 'missing';
type SortKey = 'renewal_soon' | 'cost_desc' | 'cost_asc' | 'newest' | 'name';

type SubscriptionRow = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency?: string | null;
  category?: string | null;
  date?: string | null;
  notes?: string | null;
  payment_method?: string | null;
  source?: string | null;
  enhanced?: Record<string, unknown> | null;
  is_recurring?: boolean | null;
  frequency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FxRateResponse = {
  from?: string;
  to?: string;
  rate?: number | null;
  available?: boolean;
};

type FormState = {
  id?: string;
  name: string;
  category: SubscriptionCategory;
  provider: string;
  amount: string;
  currency: string;
  billingCycle: BillingCycle;
  startDate: string;
  nextRenewalDate: string;
  paymentMethod: string;
  status: SubscriptionStatus;
  isTrial: boolean;
  trialEndsAt: string;
  serviceUrl: string;
  notes: string;
};

type SubscriptionView = {
  row: SubscriptionRow;
  id: string;
  name: string;
  category: SubscriptionCategory;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  originalAmount: number;
  monthlyNative: number;
  annualNative: number;
  monthlyBase: number | null;
  currency: string;
  startDate: string;
  nextRenewalDate: string;
  paymentMethod: string;
  serviceUrl: string;
  notes: string;
  isTrial: boolean;
  trialEndsAt: string;
  daysUntilRenewal: number | null;
  createdAt: string;
};

const TEXT = {
  ar: {
    title: 'الاشتراكات الشهرية',
    subtitle: 'مساحة عملية لمتابعة الاشتراكات المتكررة، مواعيد التجديد، وفرص تقليل المصروفات بدون فوضى.',
    eyebrow: 'THE SFM / إدارة المصاريف',
    add: 'إضافة اشتراك',
    firstAdd: 'إضافة أول اشتراك',
    export: 'تصدير التقرير',
    exportDisabled: 'أضف اشتراكاً واحداً على الأقل لتصدير التقرير.',
    back: 'العودة إلى المصاريف',
    summaryMonthly: 'إجمالي الاشتراكات الشهرية',
    summaryAnnual: 'التكلفة السنوية المتوقعة',
    activeCount: 'عدد الاشتراكات النشطة',
    highest: 'أعلى اشتراك شهري',
    renewals30: 'التجديدات خلال 30 يوماً',
    upcoming: 'التجديدات القادمة',
    noRenewals: 'لا توجد تجديدات قريبة بتواريخ واضحة.',
    filters: 'البحث والتصفية',
    search: 'ابحث باسم الخدمة أو المزود',
    categoryFilter: 'الفئة',
    statusFilter: 'الحالة',
    cycleFilter: 'دورة الدفع',
    renewalFilter: 'فترة التجديد',
    sort: 'الترتيب',
    clear: 'مسح الفلاتر',
    results: 'نتيجة',
    listTitle: 'قائمة الاشتراكات',
    listHint: 'البطاقات مطوية افتراضياً لتبقى الصفحة قصيرة وقابلة للمراجعة.',
    emptyTitle: 'لا توجد اشتراكات بعد',
    emptyBody: 'أضف اشتراكك الأول لمعرفة تكلفته الشهرية والسنوية ومتابعة موعد التجديد.',
    examples: 'استعراض أمثلة الاشتراكات',
    examplesTitle: 'أمثلة حسب نوع الاشتراك',
    exampleSearch: 'ابحث عن خدمة أو مزود',
    loadMore: 'عرض المزيد',
    formTitleAdd: 'إضافة اشتراك',
    formTitleEdit: 'تعديل الاشتراك',
    name: 'اسم الاشتراك',
    provider: 'المزود',
    category: 'الفئة',
    amount: 'المبلغ',
    currency: 'العملة',
    billingCycle: 'دورة الدفع',
    startDate: 'تاريخ البداية',
    nextRenewal: 'تاريخ التجديد القادم',
    paymentMethod: 'وسيلة الدفع',
    status: 'حالة الاشتراك',
    freeTrial: 'تجربة مجانية',
    trialEnds: 'تاريخ نهاية التجربة',
    serviceUrl: 'رابط الخدمة',
    notes: 'ملاحظات',
    save: 'حفظ الاشتراك',
    update: 'تحديث الاشتراك',
    cancel: 'إلغاء',
    saving: 'جارٍ الحفظ...',
    saved: 'تم حفظ الاشتراك.',
    deleted: 'تم حذف الاشتراك.',
    error: 'تعذر تنفيذ العملية. حاول مرة أخرى.',
    authRequired: 'يجب تسجيل الدخول لإدارة الاشتراكات.',
    nameRequired: 'أدخل اسم الاشتراك.',
    amountRequired: 'أدخل مبلغاً صحيحاً.',
    renewalRequired: 'أدخل تاريخ تجديد صحيح.',
    deleteConfirm: 'هل تريد حذف هذا الاشتراك؟',
    monthlyEquivalent: 'المعادِل الشهري',
    annualEquivalent: 'المعادِل السنوي',
    remaining: 'متبقي',
    day: 'يوم',
    today: 'اليوم',
    tomorrow: 'غداً',
    missingDate: 'بدون تاريخ تجديد',
    edit: 'تعديل',
    pause: 'إيقاف مؤقت',
    resume: 'استئناف',
    markCancelled: 'تسجيل إلغاء',
    delete: 'حذف',
    openSite: 'فتح الموقع',
    insights: 'رؤى التوفير',
    noInsights: 'أضف اشتراكين أو أكثر للحصول على رؤى مقارنة أوضح.',
    categoryBreakdown: 'التكلفة حسب الفئة',
    steps: ['أضف الاشتراك', 'حدد المبلغ وموعد التجديد', 'تابع التكلفة والتنبيهات'],
    duplicateHint: 'قد يكون من المفيد مراجعة الاشتراكات المتقاربة.',
    reviewHint: 'قد يكون من المفيد مراجعة هذا الاشتراك.',
    statuses: { active: 'نشط', paused: 'متوقف مؤقتاً', cancelled: 'ملغي', trial: 'تجربة مجانية', expired: 'منتهي' },
    cycles: { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', quarterly: 'ربع سنوي', yearly: 'سنوي' },
    categories: {
      entertainment: 'وسائل الترفيه',
      ai: 'الذكاء الاصطناعي',
      social: 'وسائل التواصل الاجتماعي',
      telecom: 'اتصالات وإنترنت',
      productivity: 'إنتاجية وبرمجيات',
      cloud: 'تخزين سحابي',
      health: 'صحة ولياقة',
      education: 'تعليم',
      gaming: 'ألعاب',
      other: 'أخرى',
    },
    regions: { gulf: 'الخليج', arab: 'الدول العربية', asia: 'آسيا', europe: 'أوروبا', global: 'عالمي', other: 'أخرى' },
    renewalFilters: { all: 'كل التجديدات', today: 'اليوم', '7': 'خلال 7 أيام', '30': 'خلال 30 يوماً', missing: 'بدون تاريخ' },
    sorts: { renewal_soon: 'الأقرب للتجديد', cost_desc: 'الأعلى تكلفة', cost_asc: 'الأقل تكلفة', newest: 'الأحدث إضافة', name: 'الاسم' },
  },
  en: {
    title: 'Monthly Subscriptions',
    subtitle: 'Track recurring services, renewal dates, and savings opportunities without turning the page into a long catalog.',
    eyebrow: 'THE SFM / Expenses',
    add: 'Add subscription',
    firstAdd: 'Add first subscription',
    export: 'Export report',
    exportDisabled: 'Add at least one subscription to export the report.',
    back: 'Back to expenses',
    summaryMonthly: 'Total monthly subscriptions',
    summaryAnnual: 'Expected annual cost',
    activeCount: 'Active subscriptions',
    highest: 'Highest monthly subscription',
    renewals30: 'Renewals in 30 days',
    upcoming: 'Upcoming renewals',
    noRenewals: 'No upcoming renewals with clear dates.',
    filters: 'Search and filters',
    search: 'Search service or provider',
    categoryFilter: 'Category',
    statusFilter: 'Status',
    cycleFilter: 'Billing cycle',
    renewalFilter: 'Renewal window',
    sort: 'Sort',
    clear: 'Clear filters',
    results: 'results',
    listTitle: 'Subscription list',
    listHint: 'Cards stay collapsed by default so the page remains scannable.',
    emptyTitle: 'No subscriptions yet',
    emptyBody: 'Add your first subscription to see monthly and annual cost plus renewal alerts.',
    examples: 'Browse subscription examples',
    examplesTitle: 'Examples by subscription type',
    exampleSearch: 'Search service or provider',
    loadMore: 'Load more',
    formTitleAdd: 'Add subscription',
    formTitleEdit: 'Edit subscription',
    name: 'Subscription name',
    provider: 'Provider',
    category: 'Category',
    amount: 'Amount',
    currency: 'Currency',
    billingCycle: 'Billing cycle',
    startDate: 'Start date',
    nextRenewal: 'Next renewal date',
    paymentMethod: 'Payment method',
    status: 'Status',
    freeTrial: 'Free trial',
    trialEnds: 'Trial end date',
    serviceUrl: 'Service link',
    notes: 'Notes',
    save: 'Save subscription',
    update: 'Update subscription',
    cancel: 'Cancel',
    saving: 'Saving...',
    saved: 'Subscription saved.',
    deleted: 'Subscription deleted.',
    error: 'Could not complete the action. Try again.',
    authRequired: 'Please sign in to manage subscriptions.',
    nameRequired: 'Enter a subscription name.',
    amountRequired: 'Enter a valid amount.',
    renewalRequired: 'Enter a valid renewal date.',
    deleteConfirm: 'Delete this subscription?',
    monthlyEquivalent: 'Monthly equivalent',
    annualEquivalent: 'Annual equivalent',
    remaining: 'remaining',
    day: 'days',
    today: 'today',
    tomorrow: 'tomorrow',
    missingDate: 'No renewal date',
    edit: 'Edit',
    pause: 'Pause',
    resume: 'Resume',
    markCancelled: 'Mark cancelled',
    delete: 'Delete',
    openSite: 'Open site',
    insights: 'Savings insights',
    noInsights: 'Add two or more subscriptions for clearer comparison insights.',
    categoryBreakdown: 'Cost by category',
    steps: ['Add subscription', 'Set amount and renewal', 'Track cost and alerts'],
    duplicateHint: 'It may be useful to review similar subscriptions.',
    reviewHint: 'It may be useful to review this subscription.',
    statuses: { active: 'Active', paused: 'Paused', cancelled: 'Cancelled', trial: 'Free trial', expired: 'Expired' },
    cycles: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' },
    categories: {
      entertainment: 'Entertainment',
      ai: 'Artificial intelligence',
      social: 'Social media',
      telecom: 'Telecom and internet',
      productivity: 'Productivity and software',
      cloud: 'Cloud storage',
      health: 'Health and fitness',
      education: 'Education',
      gaming: 'Gaming',
      other: 'Other',
    },
    regions: { gulf: 'Gulf', arab: 'Arab countries', asia: 'Asia', europe: 'Europe', global: 'Global', other: 'Other' },
    renewalFilters: { all: 'All renewals', today: 'Today', '7': 'Within 7 days', '30': 'Within 30 days', missing: 'No date' },
    sorts: { renewal_soon: 'Closest renewal', cost_desc: 'Highest cost', cost_asc: 'Lowest cost', newest: 'Newest', name: 'Name' },
  },
  fr: {
    title: 'Abonnements mensuels',
    subtitle: 'Suivez les services r\u00e9currents, les renouvellements et les pistes d\u2019\u00e9conomie dans un espace compact.',
    eyebrow: 'THE SFM / D\u00e9penses',
    add: 'Ajouter un abonnement',
    firstAdd: 'Ajouter le premier',
    export: 'Exporter',
    exportDisabled: 'Ajoutez au moins un abonnement pour exporter le rapport.',
    back: 'Retour aux d\u00e9penses',
    summaryMonthly: 'Total mensuel',
    summaryAnnual: 'Co\u00fbt annuel pr\u00e9vu',
    activeCount: 'Abonnements actifs',
    highest: 'Plus \u00e9lev\u00e9',
    renewals30: 'Renouvellements sous 30 jours',
    upcoming: 'Renouvellements \u00e0 venir',
    noRenewals: 'Aucun renouvellement proche avec date claire.',
    filters: 'Recherche et filtres',
    search: 'Rechercher un service',
    categoryFilter: 'Cat\u00e9gorie',
    statusFilter: 'Statut',
    cycleFilter: 'Cycle',
    renewalFilter: 'Renouvellement',
    sort: 'Tri',
    clear: 'Effacer',
    results: 'r\u00e9sultats',
    listTitle: 'Liste des abonnements',
    listHint: 'Les cartes restent compactes par d\u00e9faut.',
    emptyTitle: 'Aucun abonnement',
    emptyBody: 'Ajoutez votre premier abonnement pour suivre le co\u00fbt et les renouvellements.',
    examples: 'Parcourir des exemples',
    examplesTitle: 'Exemples par type',
    exampleSearch: 'Rechercher un service',
    loadMore: 'Afficher plus',
    formTitleAdd: 'Ajouter un abonnement',
    formTitleEdit: 'Modifier l\u2019abonnement',
    name: 'Nom',
    provider: 'Fournisseur',
    category: 'Cat\u00e9gorie',
    amount: 'Montant',
    currency: 'Devise',
    billingCycle: 'Cycle',
    startDate: 'D\u00e9but',
    nextRenewal: 'Prochain renouvellement',
    paymentMethod: 'Paiement',
    status: 'Statut',
    freeTrial: 'Essai gratuit',
    trialEnds: 'Fin d\u2019essai',
    serviceUrl: 'Lien',
    notes: 'Notes',
    save: 'Enregistrer',
    update: 'Mettre \u00e0 jour',
    cancel: 'Annuler',
    saving: 'Enregistrement...',
    saved: 'Abonnement enregistr\u00e9.',
    deleted: 'Abonnement supprim\u00e9.',
    error: 'Action impossible. R\u00e9essayez.',
    authRequired: 'Connectez-vous pour g\u00e9rer les abonnements.',
    nameRequired: 'Saisissez un nom.',
    amountRequired: 'Saisissez un montant valide.',
    renewalRequired: 'Saisissez une date valide.',
    deleteConfirm: 'Supprimer cet abonnement ?',
    monthlyEquivalent: '\u00c9quivalent mensuel',
    annualEquivalent: '\u00c9quivalent annuel',
    remaining: 'restants',
    day: 'jours',
    today: 'aujourd\u2019hui',
    tomorrow: 'demain',
    missingDate: 'Sans date',
    edit: 'Modifier',
    pause: 'Pause',
    resume: 'Reprendre',
    markCancelled: 'Marquer annul\u00e9',
    delete: 'Supprimer',
    openSite: 'Ouvrir',
    insights: 'Pistes d\u2019\u00e9conomie',
    noInsights: 'Ajoutez au moins deux abonnements pour plus d\u2019analyse.',
    categoryBreakdown: 'Co\u00fbt par cat\u00e9gorie',
    steps: ['Ajoutez', 'D\u00e9finissez le co\u00fbt', 'Suivez les alertes'],
    duplicateHint: 'Il peut \u00eatre utile de revoir les abonnements similaires.',
    reviewHint: 'Il peut \u00eatre utile de revoir cet abonnement.',
    statuses: { active: 'Actif', paused: 'Suspendu', cancelled: 'Annul\u00e9', trial: 'Essai gratuit', expired: 'Expir\u00e9' },
    cycles: { daily: 'Quotidien', weekly: 'Hebdomadaire', monthly: 'Mensuel', quarterly: 'Trimestriel', yearly: 'Annuel' },
    categories: {
      entertainment: 'Divertissement',
      ai: 'IA',
      social: 'R\u00e9seaux sociaux',
      telecom: 'T\u00e9l\u00e9com et internet',
      productivity: 'Productivit\u00e9',
      cloud: 'Cloud',
      health: 'Sant\u00e9',
      education: '\u00c9ducation',
      gaming: 'Jeux',
      other: 'Autre',
    },
    regions: { gulf: 'Golfe', arab: 'Pays arabes', asia: 'Asie', europe: 'Europe', global: 'Global', other: 'Autre' },
    renewalFilters: { all: 'Tous', today: 'Aujourd\u2019hui', '7': 'Sous 7 jours', '30': 'Sous 30 jours', missing: 'Sans date' },
    sorts: { renewal_soon: 'Renouvellement proche', cost_desc: 'Co\u00fbt \u00e9lev\u00e9', cost_asc: 'Co\u00fbt bas', newest: 'R\u00e9cent', name: 'Nom' },
  },
} as const;

const CATEGORY_ICONS: Record<SubscriptionCategory, LucideIcon> = {
  entertainment: Film,
  ai: Bot,
  social: MessageCircle,
  telecom: Wifi,
  productivity: Layers3,
  cloud: Cloud,
  health: HeartPulse,
  education: GraduationCap,
  gaming: Gamepad2,
  other: MoreHorizontal,
};

const OPTIONAL_EXPENSE_COLUMNS = [
  'currency',
  'category',
  'date',
  'payment_method',
  'notes',
  'source',
  'enhanced',
  'is_recurring',
  'frequency',
  'start_date',
  'end_date',
  'updated_at',
] as const;

function todayInputDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cleanNumber(value: string) {
  return normalizeNumberInput(value).replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 1000) / 1000;
}

function metadata(row: SubscriptionRow) {
  return row.enhanced && typeof row.enhanced === 'object' ? row.enhanced : {};
}

function safeCategory(value: unknown): SubscriptionCategory {
  return SUBSCRIPTION_CATEGORIES.includes(value as SubscriptionCategory) ? value as SubscriptionCategory : 'other';
}

function safeCycle(value: unknown): BillingCycle {
  if (value === 'weekly' || value === 'monthly' || value === 'quarterly' || value === 'yearly' || value === 'daily') return value;
  return 'monthly';
}

function safeStatus(value: unknown): SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus) ? value as SubscriptionStatus : 'active';
}

function localDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(value: string, now = new Date()) {
  const date = localDate(value);
  if (!date) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function formatDate(value: string, locale: Lang) {
  const date = localDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatSubscriptionMoney(amount: number, currencyCode: string, locale: Lang) {
  const normalized = normalizeMoneyCurrencyCode(currencyCode, 'KWD');
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (normalized === 'KWD') {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: 'KWD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(safeAmount);
  }
  return formatMoney(safeAmount, normalized, locale);
}

function missingColumnFromError(message: string) {
  const match = message.match(/column\s+["']?(?:\w+\.)?(\w+)["']?\s+(?:does not exist|not found)/i)
    ?? message.match(/could not find the ['"]?(\w+)['"]? column/i);
  return match?.[1];
}

function isSchemaColumnError(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '');
  return /column|schema cache|pgrst204|does not exist|could not find/i.test(message);
}

function emptyForm(currency = 'KWD'): FormState {
  const today = todayInputDate();
  return {
    name: '',
    category: 'entertainment',
    provider: '',
    amount: '',
    currency,
    billingCycle: 'monthly',
    startDate: today,
    nextRenewalDate: nextRenewalDate(today, 'monthly') ?? today,
    paymentMethod: 'card',
    status: 'active',
    isTrial: false,
    trialEndsAt: '',
    serviceUrl: '',
    notes: '',
  };
}

export default function MonthlySubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale: Lang = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const copy = TEXT[locale];
  const { currency: userCurrency } = useCurrency();
  const baseCurrency = normalizeMoneyCurrencyCode(userCurrency, 'KWD');
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm(baseCurrency));
  const [formOpen, setFormOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [exampleCategory, setExampleCategory] = useState<SubscriptionCategory>('entertainment');
  const [exampleRegion, setExampleRegion] = useState<SubscriptionRegion>('gulf');
  const [exampleSearch, setExampleSearch] = useState('');
  const [exampleLimit, setExampleLimit] = useState(12);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SubscriptionCategory | FilterValue>('all');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | FilterValue>('all');
  const [cycleFilter, setCycleFilter] = useState<BillingCycle | FilterValue>('all');
  const [renewalFilter, setRenewalFilter] = useState<RenewalFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('renewal_soon');
  const [fxRates, setFxRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const examplesTriggerRef = useRef<HTMLButtonElement | null>(null);
  const examplesDialogRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const db = supabase as any;
    try {
      const { data, error: queryError } = await db
        .from('expense_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'subscriptions')
        .order('date', { ascending: true })
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      setRows((data ?? []) as SubscriptionRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.error);
    } finally {
      setLoading(false);
    }
  }, [copy.error, user]);

  useEffect(() => {
    if (!authLoading) void loadData();
  }, [authLoading, loadData]);

  useEffect(() => {
    if (!formOpen && !form.id) setForm(current => ({ ...current, currency: current.currency || baseCurrency }));
  }, [baseCurrency, form.id, formOpen]);

  useEffect(() => {
    const sourceCurrencies = Array.from(new Set(
      rows
        .map(row => normalizeMoneyCurrencyCode(row.currency, baseCurrency))
        .filter(code => code !== baseCurrency),
    ));

    if (!sourceCurrencies.length) return;
    let cancelled = false;

    const fallbackRates = sourceCurrencies.reduce<Record<string, number>>((next, from) => {
      const rate = approximateFxRate(from, baseCurrency);
      if (rate) next[fxKey(from, baseCurrency)] = rate;
      return next;
    }, {});
    if (Object.keys(fallbackRates).length) setFxRates(current => ({ ...current, ...fallbackRates }));

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/market/fx/batch', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairs: sourceCurrencies.map(from => ({ from, to: baseCurrency })) }),
        });
        const payload = await response.json() as { rates?: FxRateResponse[] };
        if (cancelled) return;
        const liveRates = (payload.rates ?? []).reduce<Record<string, number>>((next, item) => {
          const from = normalizeMoneyCurrencyCode(item.from, '');
          const to = normalizeMoneyCurrencyCode(item.to, '');
          const rate = Number(item.rate);
          if (item.available && from && to && Number.isFinite(rate) && rate > 0) next[fxKey(from, to)] = rate;
          return next;
        }, {});
        if (Object.keys(liveRates).length) setFxRates(current => ({ ...current, ...liveRates }));
      } catch {
        // Keep local fallback rates when live FX is unavailable.
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [baseCurrency, rows]);

  useEffect(() => {
    if (!examplesOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => {
      const first = examplesDialogRef.current?.querySelector<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])');
      first?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExamplesOpen(false);
        window.setTimeout(() => examplesTriggerRef.current?.focus(), 0);
      }
      if (event.key !== 'Tab' || !examplesDialogRef.current) return;
      const focusable = Array.from(examplesDialogRef.current.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])'))
        .filter(item => !item.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [examplesOpen]);

  const views = useMemo<SubscriptionView[]>(() => rows.map(row => {
    const meta = metadata(row);
    const category = safeCategory(meta.subscription_category ?? meta.subscription_type);
    const status = safeStatus(meta.subscription_status);
    const billingCycle = safeCycle(meta.billing_frequency);
    const currency = normalizeMoneyCurrencyCode(row.currency, baseCurrency);
    const originalAmount = toNumber(meta.billing_amount ?? row.amount);
    const monthlyNative = toNumber(meta.monthly_amount ?? row.amount ?? monthlyEquivalent(originalAmount, billingCycle));
    const annualNative = toNumber(meta.yearly_amount ?? annualEquivalent(originalAmount, billingCycle));
    const startDate = String(meta.subscription_start_date ?? row.start_date ?? row.date ?? '').slice(0, 10);
    const renewal = String(meta.next_renewal_date ?? row.date ?? nextRenewalDate(startDate, billingCycle) ?? '').slice(0, 10);
    const convertedMonthly = convertCurrencyAmount(monthlyNative, currency, baseCurrency, fxRates);
    return {
      row,
      id: row.id,
      name: row.name || String(meta.service_label ?? ''),
      category,
      status,
      billingCycle,
      originalAmount,
      monthlyNative: roundMoney(monthlyNative),
      annualNative: roundMoney(annualNative),
      monthlyBase: convertedMonthly === null ? null : roundMoney(convertedMonthly),
      currency,
      startDate,
      nextRenewalDate: renewal,
      paymentMethod: row.payment_method || String(meta.payment_method ?? ''),
      serviceUrl: String(meta.service_url ?? ''),
      notes: row.notes || '',
      isTrial: Boolean(meta.is_trial) || status === 'trial',
      trialEndsAt: String(meta.trial_end_date ?? '').slice(0, 10),
      daysUntilRenewal: daysUntil(renewal),
      createdAt: row.created_at || '',
    };
  }), [baseCurrency, fxRates, rows]);

  const activeViews = useMemo(() => views.filter(view => isSpendActiveStatus(view.status)), [views]);
  const totals = useMemo(() => {
    const monthly = activeViews.reduce((sum, view) => sum + (view.monthlyBase ?? 0), 0);
    const highest = activeViews.reduce<SubscriptionView | null>((current, view) => {
      if (view.monthlyBase === null) return current;
      if (!current || view.monthlyBase > (current.monthlyBase ?? 0)) return view;
      return current;
    }, null);
    const renewals30 = views.filter(view => view.daysUntilRenewal !== null && view.daysUntilRenewal >= 0 && view.daysUntilRenewal <= 30 && view.status !== 'cancelled' && view.status !== 'expired').length;
    return {
      monthly: roundMoney(monthly),
      yearly: roundMoney(monthly * 12),
      activeCount: activeViews.length,
      highest,
      renewals30,
    };
  }, [activeViews, views]);

  const filteredViews = useMemo(() => {
    const query = normalizeSubscriptionSearch(search);
    return views
      .filter(view => {
        if (query && !normalizeSubscriptionSearch(`${view.name} ${view.paymentMethod} ${view.notes}`).includes(query)) return false;
        if (categoryFilter !== 'all' && view.category !== categoryFilter) return false;
        if (statusFilter !== 'all' && view.status !== statusFilter) return false;
        if (cycleFilter !== 'all' && view.billingCycle !== cycleFilter) return false;
        if (renewalFilter === 'today' && view.daysUntilRenewal !== 0) return false;
        if (renewalFilter === '7' && (view.daysUntilRenewal === null || view.daysUntilRenewal < 0 || view.daysUntilRenewal > 7)) return false;
        if (renewalFilter === '30' && (view.daysUntilRenewal === null || view.daysUntilRenewal < 0 || view.daysUntilRenewal > 30)) return false;
        if (renewalFilter === 'missing' && view.nextRenewalDate) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === 'cost_desc') return (b.monthlyBase ?? 0) - (a.monthlyBase ?? 0);
        if (sortKey === 'cost_asc') return (a.monthlyBase ?? 0) - (b.monthlyBase ?? 0);
        if (sortKey === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortKey === 'name') return a.name.localeCompare(b.name);
        const aDays = a.daysUntilRenewal ?? 99999;
        const bDays = b.daysUntilRenewal ?? 99999;
        return aDays - bDays;
      });
  }, [categoryFilter, cycleFilter, renewalFilter, search, sortKey, statusFilter, views]);

  const upcomingRenewals = useMemo(() => views
    .filter(view => view.daysUntilRenewal !== null && view.daysUntilRenewal >= 0 && view.daysUntilRenewal <= 30 && view.status !== 'cancelled' && view.status !== 'expired')
    .sort((a, b) => (a.daysUntilRenewal ?? 0) - (b.daysUntilRenewal ?? 0))
    .slice(0, 4), [views]);

  const categoryBreakdown = useMemo(() => {
    const totalsByCategory = activeViews.reduce<Record<SubscriptionCategory, number>>((next, view) => {
      next[view.category] = (next[view.category] ?? 0) + (view.monthlyBase ?? 0);
      return next;
    }, {} as Record<SubscriptionCategory, number>);
    const entries = Object.entries(totalsByCategory)
      .map(([category, amount]) => ({ category: category as SubscriptionCategory, amount: roundMoney(amount) }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const max = entries[0]?.amount || 0;
    return entries.map(item => ({ ...item, percent: max ? Math.max(8, Math.round((item.amount / max) * 100)) : 0 }));
  }, [activeViews]);

  const insightItems = useMemo(() => {
    const insights: string[] = [];
    const topCategory = categoryBreakdown[0];
    if (topCategory) {
      insights.push(`${copy.categories[topCategory.category]}: ${formatSubscriptionMoney(topCategory.amount, baseCurrency, locale)} ${locale === 'ar' ? 'شهرياً' : 'monthly'}.`);
    }
    const duplicateGroups = Object.values(activeViews.reduce<Record<string, SubscriptionView[]>>((next, view) => {
      const key = view.category;
      next[key] = [...(next[key] ?? []), view];
      return next;
    }, {})).filter(group => group.length >= 3);
    if (duplicateGroups.length) insights.push(copy.duplicateHint);
    const oldReview = activeViews.find(view => view.createdAt && Date.now() - new Date(view.createdAt).getTime() > 180 * 86400000);
    if (oldReview) insights.push(`${copy.reviewHint}: ${oldReview.name}`);
    return insights;
  }, [activeViews, baseCurrency, categoryBreakdown, copy, locale]);

  const filteredExamples = useMemo(() => {
    const query = normalizeSubscriptionSearch(exampleSearch);
    return SUBSCRIPTION_EXAMPLES
      .filter(example => example.category === exampleCategory)
      .filter(example => example.category !== 'telecom' || example.region === exampleRegion)
      .filter(example => {
        if (!query) return true;
        return normalizeSubscriptionSearch([example.name, ...(example.aliases ?? [])].join(' ')).includes(query);
      });
  }, [exampleCategory, exampleRegion, exampleSearch]);

  const pageError = error || supabaseConfigError;
  const hasActiveFilters = Boolean(search || categoryFilter !== 'all' || statusFilter !== 'all' || cycleFilter !== 'all' || renewalFilter !== 'all');
  const formCurrency = normalizeMoneyCurrencyCode(form.currency, baseCurrency);
  const formAmount = toNumber(form.amount);
  const projectedMonthly = roundMoney(monthlyEquivalent(formAmount, form.billingCycle));
  const projectedYearly = roundMoney(annualEquivalent(formAmount, form.billingCycle));

  function clearFilters() {
    setSearch('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setCycleFilter('all');
    setRenewalFilter('all');
    setSortKey('renewal_soon');
  }

  function openNewForm() {
    setForm(emptyForm(baseCurrency));
    setFormOpen(true);
    setNotice('');
    setError('');
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function closeExamples() {
    setExamplesOpen(false);
    window.setTimeout(() => examplesTriggerRef.current?.focus(), 0);
  }

  function selectExample(example: SubscriptionExample) {
    const today = todayInputDate();
    const cycle = example.defaultBillingCycle ?? 'monthly';
    setForm({
      ...emptyForm(baseCurrency),
      name: example.name,
      provider: example.name,
      category: example.category,
      billingCycle: cycle,
      nextRenewalDate: nextRenewalDate(today, cycle) ?? today,
    });
    setFormOpen(true);
    closeExamples();
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function editRow(view: SubscriptionView) {
    const meta = metadata(view.row);
    setForm({
      id: view.id,
      name: view.name,
      category: view.category,
      provider: String(meta.subscription_provider ?? view.name),
      amount: String(view.originalAmount || ''),
      currency: view.currency,
      billingCycle: view.billingCycle,
      startDate: view.startDate || todayInputDate(),
      nextRenewalDate: view.nextRenewalDate || nextRenewalDate(todayInputDate(), view.billingCycle) || todayInputDate(),
      paymentMethod: view.paymentMethod || 'card',
      status: view.status,
      isTrial: view.isTrial,
      trialEndsAt: view.trialEndsAt,
      serviceUrl: view.serviceUrl,
      notes: view.notes,
    });
    setFormOpen(true);
    setNotice('');
    setError('');
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async function writeExpense(payload: Record<string, unknown>, id?: string) {
    const db = supabase as any;
    let nextPayload = { ...payload };
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= OPTIONAL_EXPENSE_COLUMNS.length; attempt += 1) {
      const request = id
        ? db.from('expense_items').update(nextPayload).eq('id', id).eq('user_id', user?.id).select('*').maybeSingle()
        : db.from('expense_items').insert(nextPayload).select('*').single();
      const { data, error: saveError } = await request;
      if (!saveError) return data as SubscriptionRow;
      lastError = saveError;
      const missingColumn = missingColumnFromError(String(saveError.message ?? ''));
      if (
        !isSchemaColumnError(saveError) ||
        !missingColumn ||
        !OPTIONAL_EXPENSE_COLUMNS.includes(missingColumn as typeof OPTIONAL_EXPENSE_COLUMNS[number]) ||
        !(missingColumn in nextPayload)
      ) throw saveError;
      const { [missingColumn]: _removed, ...remainingPayload } = nextPayload;
      nextPayload = remainingPayload;
    }

    throw lastError instanceof Error ? lastError : new Error(copy.error);
  }

  async function saveSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setNotice('');
    setError('');
    if (!user) return setError(copy.authRequired);
    if (!form.name.trim()) return setError(copy.nameRequired);
    if (!formAmount || formAmount <= 0 || !projectedMonthly) return setError(copy.amountRequired);
    if (!localDate(form.nextRenewalDate)) return setError(copy.renewalRequired);

    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      amount: projectedMonthly,
      currency: formCurrency,
      category: 'subscriptions',
      date: form.nextRenewalDate,
      payment_method: form.paymentMethod || null,
      notes: form.notes || null,
      source: 'subscription',
      is_recurring: true,
      frequency: 'monthly',
      start_date: form.startDate || form.nextRenewalDate,
      end_date: form.status === 'cancelled' || form.status === 'expired' ? now.slice(0, 10) : null,
      enhanced: {
        source: 'subscription',
        subscription_category: form.category,
        subscription_type: form.category,
        subscription_provider: form.provider || form.name.trim(),
        subscription_service: form.name.trim(),
        service_label: form.name.trim(),
        subscription_status: form.status,
        billing_frequency: form.billingCycle,
        billing_amount: formAmount,
        billing_currency: formCurrency,
        monthly_amount: projectedMonthly,
        yearly_amount: projectedYearly,
        subscription_start_date: form.startDate || form.nextRenewalDate,
        next_renewal_date: form.nextRenewalDate,
        payment_method: form.paymentMethod || null,
        is_trial: form.isTrial,
        trial_end_date: form.isTrial ? form.trialEndsAt || null : null,
        service_url: form.serviceUrl || null,
        created_from: 'monthly_subscriptions_page',
      },
      updated_at: now,
    };

    try {
      const saved = await writeExpense(payload, form.id);
      setRows(current => form.id ? current.map(row => row.id === form.id ? saved : row) : [saved, ...current]);
      setForm(emptyForm(baseCurrency));
      setFormOpen(false);
      setNotice(copy.saved);
    } catch (err) {
      console.error('Monthly subscription save failed:', err);
      setError(copy.error);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(view: SubscriptionView, status: SubscriptionStatus) {
    if (!user) return;
    setNotice('');
    setError('');
    const meta = metadata(view.row);
    try {
      const saved = await writeExpense({
        enhanced: { ...meta, subscription_status: status },
        end_date: status === 'cancelled' || status === 'expired' ? todayInputDate() : null,
        updated_at: new Date().toISOString(),
      }, view.id);
      setRows(current => current.map(row => row.id === view.id ? { ...row, ...saved } : row));
    } catch (err) {
      console.error('Monthly subscription status update failed:', err);
      setError(copy.error);
    }
  }

  async function deleteRow(view: SubscriptionView) {
    if (!user) return;
    if (!window.confirm(copy.deleteConfirm)) return;
    setNotice('');
    setError('');
    const db = supabase as any;
    const { error: deleteError } = await db.from('expense_items').delete().eq('id', view.id).eq('user_id', user.id);
    if (deleteError) {
      setError(copy.error);
      return;
    }
    setRows(current => current.filter(item => item.id !== view.id));
    setNotice(copy.deleted);
  }

  function printSubscriptionsReport() {
    if (!rows.length) {
      setError(copy.exportDisabled);
      return;
    }
    window.setTimeout(() => window.print(), 80);
  }

  function renewalText(view: SubscriptionView) {
    if (view.daysUntilRenewal === null) return copy.missingDate;
    if (view.daysUntilRenewal === 0) return copy.today;
    if (view.daysUntilRenewal === 1) return copy.tomorrow;
    return `${copy.remaining} ${view.daysUntilRenewal} ${copy.day}`;
  }

  function onExamplesBackdropMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) closeExamples();
  }

  function onExampleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') closeExamples();
  }

  return (
    <div className="subscriptions-shell" dir={dir}>
      <DashboardPageShell ariaLabel={copy.title} className="subscriptions-main" contentClassName="subscriptions-content">
        <section className="subscriptions-hero">
          <div className="subscriptions-hero-copy">
            <span className="subscriptions-eyebrow"><CreditCard size={16} /> {copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
          <div className="subscriptions-hero-actions">
            <button type="button" className="subscriptions-primary" onClick={openNewForm}>
              <Plus size={18} />
              {copy.add}
            </button>
            <button
              type="button"
              className="subscriptions-secondary"
              onClick={printSubscriptionsReport}
              disabled={!rows.length}
              title={!rows.length ? copy.exportDisabled : undefined}
            >
              <Printer size={18} />
              {copy.export}
            </button>
            <Link href="/expenses" className="subscriptions-tertiary">{copy.back}</Link>
          </div>
        </section>

        {(notice || pageError) && (
          <section className={`subscriptions-notice ${pageError ? 'error' : 'success'}`} role={pageError ? 'alert' : 'status'} aria-live="polite">
            {pageError ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            <span>{pageError || notice}</span>
          </section>
        )}

        <section className="subscriptions-kpis" aria-label={copy.summaryMonthly}>
          <Kpi icon={ReceiptIcon} label={copy.summaryMonthly} value={formatSubscriptionMoney(totals.monthly, baseCurrency, locale)} />
          <Kpi icon={CalendarDays} label={copy.summaryAnnual} value={formatSubscriptionMoney(totals.yearly, baseCurrency, locale)} />
          <Kpi icon={CreditCard} label={copy.activeCount} value={String(totals.activeCount)} />
          <Kpi icon={Sparkles} label={copy.highest} value={totals.highest ? `${totals.highest.name} ? ${formatSubscriptionMoney(totals.highest.monthlyBase ?? 0, baseCurrency, locale)}` : formatSubscriptionMoney(0, baseCurrency, locale)} />
        </section>

        {formOpen && (
          <section ref={formRef} className="subscriptions-form-card" aria-labelledby="subscription-form-title">
            <div className="subscriptions-card-head">
              <div>
                <span>{form.id ? copy.update : copy.add}</span>
                <h2 id="subscription-form-title">{form.id ? copy.formTitleEdit : copy.formTitleAdd}</h2>
              </div>
              <button type="button" className="subscriptions-icon-button" onClick={() => { setFormOpen(false); setForm(emptyForm(baseCurrency)); }} aria-label={copy.cancel}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveSubscription} className="subscriptions-form-grid">
              <label>
                <span>{copy.name}</span>
                <input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                <span>{copy.provider}</span>
                <input value={form.provider} onChange={event => setForm(current => ({ ...current, provider: event.target.value }))} />
              </label>
              <label>
                <span>{copy.category}</span>
                <select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value as SubscriptionCategory }))}>
                  {SUBSCRIPTION_CATEGORIES.map(category => <option key={category} value={category}>{copy.categories[category]}</option>)}
                </select>
              </label>
              <label>
                <span>{copy.status}</span>
                <select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as SubscriptionStatus }))}>
                  {SUBSCRIPTION_STATUSES.map(status => <option key={status} value={status}>{copy.statuses[status]}</option>)}
                </select>
              </label>
              <label>
                <span>{copy.amount}</span>
                <input inputMode="decimal" dir="ltr" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: cleanNumber(event.target.value) }))} />
              </label>
              <label>
                <span>{copy.currency}</span>
                <CurrencySelect value={formCurrency} onChange={code => setForm(current => ({ ...current, currency: code }))} lang={locale} ariaLabel={copy.currency} />
              </label>
              <label>
                <span>{copy.billingCycle}</span>
                <select value={form.billingCycle} onChange={event => setForm(current => ({ ...current, billingCycle: event.target.value as BillingCycle }))}>
                  {BILLING_CYCLES.map(cycle => <option key={cycle} value={cycle}>{copy.cycles[cycle]}</option>)}
                </select>
              </label>
              <label>
                <span>{copy.paymentMethod}</span>
                <input value={form.paymentMethod} onChange={event => setForm(current => ({ ...current, paymentMethod: event.target.value }))} />
              </label>
              <label>
                <span>{copy.startDate}</span>
                <input type="date" value={form.startDate} onChange={event => setForm(current => ({ ...current, startDate: event.target.value }))} />
              </label>
              <label>
                <span>{copy.nextRenewal}</span>
                <input type="date" value={form.nextRenewalDate} onChange={event => setForm(current => ({ ...current, nextRenewalDate: event.target.value }))} />
              </label>
              <label className="subscriptions-checkbox-row">
                <input type="checkbox" checked={form.isTrial} onChange={event => setForm(current => ({ ...current, isTrial: event.target.checked, status: event.target.checked ? 'trial' : current.status }))} />
                <span>{copy.freeTrial}</span>
              </label>
              <label>
                <span>{copy.trialEnds}</span>
                <input type="date" value={form.trialEndsAt} onChange={event => setForm(current => ({ ...current, trialEndsAt: event.target.value }))} disabled={!form.isTrial} />
              </label>
              <label>
                <span>{copy.serviceUrl}</span>
                <input type="url" dir="ltr" value={form.serviceUrl} onChange={event => setForm(current => ({ ...current, serviceUrl: event.target.value }))} placeholder="https://example.com" />
              </label>
              <label className="subscriptions-notes-field">
                <span>{copy.notes}</span>
                <textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} />
              </label>
              <div className="subscriptions-impact-card">
                <div><span>{copy.monthlyEquivalent}</span><strong dir="ltr">{formatSubscriptionMoney(projectedMonthly, formCurrency, locale)}</strong></div>
                <div><span>{copy.annualEquivalent}</span><strong dir="ltr">{formatSubscriptionMoney(projectedYearly, formCurrency, locale)}</strong></div>
              </div>
              <div className="subscriptions-form-actions">
                <button type="button" className="subscriptions-secondary light" onClick={() => { setFormOpen(false); setForm(emptyForm(baseCurrency)); }}>{copy.cancel}</button>
                <button type="submit" className="subscriptions-primary" disabled={saving || authLoading || loading}>{saving ? copy.saving : form.id ? copy.update : copy.save}</button>
              </div>
            </form>
          </section>
        )}

        <section className="subscriptions-alerts">
          <div className="subscriptions-card-head">
            <div>
              <span>{copy.renewals30}: {totals.renewals30}</span>
              <h2>{copy.upcoming}</h2>
            </div>
            <CalendarClock size={22} />
          </div>
          {upcomingRenewals.length ? (
            <div className="subscriptions-alert-list">
              {upcomingRenewals.map(view => (
                <article key={view.id}>
                  <strong>{view.name}</strong>
                  <p>
                    {renewalText(view)} · {formatSubscriptionMoney(view.originalAmount, view.currency, locale)}
                  </p>
                  <div>
                    <button type="button" onClick={() => editRow(view)}>{copy.edit}</button>
                    <button type="button" onClick={() => void updateStatus(view, 'cancelled')}>{copy.markCancelled}</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="subscriptions-muted">{copy.noRenewals}</p>
          )}
        </section>

        <section className="subscriptions-filter-card">
          <div className="subscriptions-card-head">
            <div>
              <span>{filteredViews.length} {copy.results}</span>
              <h2>{copy.filters}</h2>
            </div>
            <Filter size={21} />
          </div>
          <div className="subscriptions-filter-grid">
            <label className="subscriptions-search-field">
              <Search size={17} />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.search} />
            </label>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as SubscriptionCategory | FilterValue)} aria-label={copy.categoryFilter}>
              <option value="all">{copy.categoryFilter}</option>
              {SUBSCRIPTION_CATEGORIES.map(category => <option key={category} value={category}>{copy.categories[category]}</option>)}
            </select>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as SubscriptionStatus | FilterValue)} aria-label={copy.statusFilter}>
              <option value="all">{copy.statusFilter}</option>
              {SUBSCRIPTION_STATUSES.map(status => <option key={status} value={status}>{copy.statuses[status]}</option>)}
            </select>
            <select value={cycleFilter} onChange={event => setCycleFilter(event.target.value as BillingCycle | FilterValue)} aria-label={copy.cycleFilter}>
              <option value="all">{copy.cycleFilter}</option>
              {BILLING_CYCLES.map(cycle => <option key={cycle} value={cycle}>{copy.cycles[cycle]}</option>)}
            </select>
            <select value={renewalFilter} onChange={event => setRenewalFilter(event.target.value as RenewalFilter)} aria-label={copy.renewalFilter}>
              {Object.entries(copy.renewalFilters).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select value={sortKey} onChange={event => setSortKey(event.target.value as SortKey)} aria-label={copy.sort}>
              {Object.entries(copy.sorts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <div className="subscriptions-active-filters">
              {search && <span>{search}</span>}
              {categoryFilter !== 'all' && <span>{copy.categories[categoryFilter]}</span>}
              {statusFilter !== 'all' && <span>{copy.statuses[statusFilter]}</span>}
              {cycleFilter !== 'all' && <span>{copy.cycles[cycleFilter]}</span>}
              {renewalFilter !== 'all' && <span>{copy.renewalFilters[renewalFilter]}</span>}
              <button type="button" onClick={clearFilters}>{copy.clear}</button>
            </div>
          )}
        </section>

        <section className="subscriptions-content-grid">
          <div className="subscriptions-list-card">
            <div className="subscriptions-card-head">
              <div>
                <span>{copy.listHint}</span>
                <h2>{copy.listTitle}</h2>
              </div>
              <button ref={examplesTriggerRef} type="button" className="subscriptions-secondary light" onClick={() => setExamplesOpen(true)}>
                <Sparkles size={17} />
                {copy.examples}
              </button>
            </div>

            {authLoading || loading ? (
              <div className="subscriptions-skeleton-list">
                {Array.from({ length: 3 }).map((_, index) => <span key={index} />)}
              </div>
            ) : !user ? (
              <EmptyState title={copy.authRequired} body="" action={copy.add} onPrimary={openNewForm} />
            ) : views.length === 0 ? (
              <EmptyState title={copy.emptyTitle} body={copy.emptyBody} action={copy.firstAdd} secondary={copy.examples} steps={copy.steps} onPrimary={openNewForm} onSecondary={() => setExamplesOpen(true)} />
            ) : filteredViews.length === 0 ? (
              <EmptyState title={locale === 'ar' ? 'لا توجد نتائج مطابقة' : locale === 'fr' ? 'Aucun résultat' : 'No matching subscriptions'} body={copy.emptyBody} action={copy.clear} onPrimary={clearFilters} />
            ) : (
              <div className="subscriptions-card-list">
                {filteredViews.map(view => {
                  const Icon = CATEGORY_ICONS[view.category];
                  const expanded = expandedIds.includes(view.id);
                  return (
                    <article key={view.id} className={`subscription-card ${view.status}`}>
                      <div className="subscription-summary">
                        <button
                          type="button"
                          className="subscription-expand"
                          aria-expanded={expanded}
                          aria-controls={`subscription-details-${view.id}`}
                          onClick={() => setExpandedIds(current => current.includes(view.id) ? current.filter(id => id !== view.id) : [...current, view.id])}
                        >
                          <ChevronDown size={18} className={expanded ? 'open' : ''} />
                        </button>
                        <span className="subscription-logo"><Icon size={19} /></span>
                        <div className="subscription-title">
                          <h3>{view.name}</h3>
                          <p>{copy.categories[view.category]} · {copy.cycles[view.billingCycle]}</p>
                        </div>
                        <div className="subscription-money">
                          <span>{copy.monthlyEquivalent}</span>
                          <strong dir="ltr">{formatSubscriptionMoney(view.monthlyNative, view.currency, locale)}</strong>
                        </div>
                        <div className="subscription-renewal">
                          <span>{copy.nextRenewal}</span>
                          <strong>{view.nextRenewalDate ? formatDate(view.nextRenewalDate, locale) : copy.missingDate}</strong>
                          <small>{renewalText(view)}</small>
                        </div>
                        <span className={`subscription-status ${view.status}`}>{copy.statuses[view.status]}</span>
                      </div>
                      {expanded && (
                        <div id={`subscription-details-${view.id}`} className="subscription-details">
                          <dl>
                            <div><dt>{copy.amount}</dt><dd dir="ltr">{formatSubscriptionMoney(view.originalAmount, view.currency, locale)}</dd></div>
                            <div><dt>{copy.annualEquivalent}</dt><dd dir="ltr">{formatSubscriptionMoney(view.annualNative, view.currency, locale)}</dd></div>
                            <div><dt>{copy.paymentMethod}</dt><dd>{view.paymentMethod || '-'}</dd></div>
                            <div><dt>{copy.startDate}</dt><dd>{view.startDate ? formatDate(view.startDate, locale) : '-'}</dd></div>
                            {view.isTrial && <div><dt>{copy.trialEnds}</dt><dd>{view.trialEndsAt ? formatDate(view.trialEndsAt, locale) : '-'}</dd></div>}
                            {view.notes && <div><dt>{copy.notes}</dt><dd>{view.notes}</dd></div>}
                          </dl>
                          <div className="subscription-actions">
                            <button type="button" onClick={() => editRow(view)}><Edit3 size={15} />{copy.edit}</button>
                            {view.status === 'paused' ? (
                              <button type="button" onClick={() => void updateStatus(view, 'active')}><CheckCircle2 size={15} />{copy.resume}</button>
                            ) : (
                              <button type="button" onClick={() => void updateStatus(view, 'paused')}><PauseCircle size={15} />{copy.pause}</button>
                            )}
                            <button type="button" onClick={() => void updateStatus(view, 'cancelled')}><X size={15} />{copy.markCancelled}</button>
                            {view.serviceUrl && <a href={view.serviceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />{copy.openSite}</a>}
                            <button type="button" className="danger" onClick={() => void deleteRow(view)}><Trash2 size={15} />{copy.delete}</button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="subscriptions-insights">
            <section>
              <div className="subscriptions-card-head compact"><h2>{copy.insights}</h2><Sparkles size={20} /></div>
              {insightItems.length ? insightItems.map(item => <p key={item}>{item}</p>) : <p>{copy.noInsights}</p>}
            </section>
            {categoryBreakdown.length > 0 && (
              <section>
                <div className="subscriptions-card-head compact"><h2>{copy.categoryBreakdown}</h2><BarChart3 size={20} /></div>
                <div className="subscription-bars">
                  {categoryBreakdown.map(item => (
                    <div key={item.category}>
                      <span>{copy.categories[item.category]}</span>
                      <strong dir="ltr">{formatSubscriptionMoney(item.amount, baseCurrency, locale)}</strong>
                      <i style={{ inlineSize: `${item.percent}%` }} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </section>

        {examplesOpen && (
          <div className="subscriptions-drawer-backdrop" role="presentation" onMouseDown={onExamplesBackdropMouseDown}>
            <div
              ref={examplesDialogRef}
              className="subscriptions-examples-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="subscription-examples-title"
              onKeyDown={onExampleDialogKeyDown}
            >
              <header>
                <div>
                  <span>THE SFM</span>
                  <h2 id="subscription-examples-title">{copy.examplesTitle}</h2>
                </div>
                <button type="button" onClick={closeExamples} aria-label={copy.cancel}><X size={18} /></button>
              </header>
              <label className="subscriptions-search-field examples-search">
                <Search size={17} />
                <input value={exampleSearch} onChange={event => { setExampleSearch(event.target.value); setExampleLimit(12); }} placeholder={copy.exampleSearch} />
              </label>
              <div className="examples-tabs" role="tablist" aria-label={copy.category}>
                {SUBSCRIPTION_CATEGORIES.map(category => (
                  <button key={category} type="button" className={exampleCategory === category ? 'active' : ''} onClick={() => { setExampleCategory(category); setExampleLimit(12); }}>
                    {copy.categories[category]}
                  </button>
                ))}
              </div>
              {exampleCategory === 'telecom' && (
                <div className="examples-tabs regions" role="tablist" aria-label={copy.provider}>
                  {TELECOM_REGIONS.map(region => (
                    <button key={region} type="button" className={exampleRegion === region ? 'active' : ''} onClick={() => { setExampleRegion(region); setExampleLimit(12); }}>
                      {copy.regions[region]}
                    </button>
                  ))}
                </div>
              )}
              <div className="examples-grid">
                {filteredExamples.slice(0, exampleLimit).map(example => (
                  <button key={example.id} type="button" onClick={() => selectExample(example)}>
                    <strong>{example.name}</strong>
                    <span>{copy.categories[example.category]}</span>
                  </button>
                ))}
              </div>
              {filteredExamples.length > exampleLimit && (
                <button type="button" className="subscriptions-secondary light load-more" onClick={() => setExampleLimit(current => current + 12)}>
                  {copy.loadMore}
                </button>
              )}
            </div>
          </div>
        )}

        <section className="subscriptions-print-report" aria-hidden="true">
          <header>
            <span>THE SFM</span>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </header>
          <div className="subscriptions-print-summary">
            <article><small>{copy.summaryMonthly}</small><strong>{formatSubscriptionMoney(totals.monthly, baseCurrency, locale)}</strong></article>
            <article><small>{copy.summaryAnnual}</small><strong>{formatSubscriptionMoney(totals.yearly, baseCurrency, locale)}</strong></article>
            <article><small>{copy.activeCount}</small><strong>{totals.activeCount}</strong></article>
            <article><small>{copy.renewals30}</small><strong>{totals.renewals30}</strong></article>
          </div>
          <div className="subscriptions-print-table">
            <div className="subscriptions-print-head"><span>{copy.name}</span><span>{copy.billingCycle}</span><span>{copy.amount}</span><span>{copy.monthlyEquivalent}</span><span>{copy.nextRenewal}</span></div>
            {views.map(view => (
              <div key={view.id} className="subscriptions-print-row">
                <span>{view.name}</span>
                <span>{copy.cycles[view.billingCycle]}</span>
                <span>{formatSubscriptionMoney(view.originalAmount, view.currency, locale)}</span>
                <span>{formatSubscriptionMoney(view.monthlyNative, view.currency, locale)}</span>
                <span>{view.nextRenewalDate ? formatDate(view.nextRenewalDate, locale) : copy.missingDate}</span>
              </div>
            ))}
          </div>
          <footer>{new Date().toLocaleDateString(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US')}</footer>
        </section>
      </DashboardPageShell>

      <style jsx global>{`
        .subscriptions-shell{min-height:100vh;background:var(--background);color:var(--foreground);font-family:var(--font-ui);overflow-x:hidden}
        .subscriptions-content{display:grid;gap:18px;min-width:0}
        .subscriptions-hero,.subscriptions-kpis article,.subscriptions-form-card,.subscriptions-alerts,.subscriptions-filter-card,.subscriptions-list-card,.subscriptions-insights section{border:1px solid color-mix(in srgb,var(--primary) 13%,transparent);background:var(--surface);border-radius:var(--radius-panel);box-shadow:var(--shadow-md)}
        .subscriptions-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:22px;background:var(--hero-gradient);color:var(--primary-foreground)}
        .subscriptions-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid color-mix(in srgb,var(--hero-foreground) 24%,transparent);background:color-mix(in srgb,var(--hero-foreground) 9%,transparent);border-radius:var(--radius-pill);padding:7px 11px;color:var(--hero-foreground-muted);font-weight:600;font-size:12px}
        .subscriptions-hero h1{margin:12px 0 7px;color:var(--primary-foreground);font-size:clamp(30px,4vw,46px);line-height:1.1;font-weight:600;letter-spacing:0}
        .subscriptions-hero p{margin:0;max-width:760px;color:var(--hero-foreground-muted);font-weight:500;line-height:1.75}
        .subscriptions-hero-actions,.subscriptions-form-actions,.subscription-actions,.subscriptions-alert-list article div{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
        .subscriptions-primary,.subscriptions-secondary,.subscriptions-tertiary,.subscription-actions button,.subscription-actions a,.subscriptions-alert-list button{min-height:44px;border-radius:var(--radius-control);border:1px solid transparent;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:600 13px var(--font-ui);text-decoration:none;cursor:pointer;transition:.18s ease}
        .subscriptions-primary{background:var(--primary);color:var(--primary-foreground);box-shadow:var(--shadow-md)}
        .subscriptions-secondary,.subscriptions-tertiary{background:color-mix(in srgb,var(--hero-foreground) 9%,transparent);color:var(--hero-foreground-muted);border-color:color-mix(in srgb,var(--hero-foreground) 20%,transparent)}
        .subscriptions-secondary.light,.subscription-actions button,.subscription-actions a,.subscriptions-alert-list button{background:var(--surface);color:var(--foreground-secondary);border-color:color-mix(in srgb,var(--primary) 16%,transparent)}
        .subscriptions-secondary:disabled{opacity:.55;cursor:not-allowed}
        .subscriptions-notice{border-radius:var(--radius-card);padding:12px 14px;display:flex;align-items:center;gap:10px;font-weight:600;border:1px solid color-mix(in srgb,var(--accent) 22%,transparent);background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--success)}.subscriptions-notice.error{border-color:color-mix(in srgb,var(--danger) 24%,transparent);background:color-mix(in srgb,var(--danger) 10%,transparent);color:var(--danger)}
        .subscriptions-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.subscriptions-kpis article{padding:15px;display:grid;gap:8px}.kpi-icon{width:38px;height:38px;border-radius:var(--radius-control);display:grid;place-items:center;color:var(--accent);background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 18%,transparent)}.subscriptions-kpis small,.subscriptions-card-head span,.subscriptions-form-card label span,.subscriptions-impact-card span,.subscription-card span,.subscription-card dt{color:var(--foreground-muted);font-weight:600;font-size:12px}.subscriptions-kpis strong{color:var(--foreground);font-size:19px;font-weight:600;line-height:1.3;overflow-wrap:anywhere}
        .subscriptions-card-head{display:flex;align-items:center;justify-content:space-between;gap:14px}.subscriptions-card-head h2{margin:4px 0 0;color:var(--foreground);font-size:22px;font-weight:600}.subscriptions-card-head.compact h2{font-size:18px;margin:0}.subscriptions-icon-button{width:40px;height:40px;border:1px solid color-mix(in srgb,var(--primary) 16%,transparent);border-radius:var(--radius-control);background:var(--surface);color:var(--foreground-secondary);display:grid;place-items:center;cursor:pointer}
        .subscriptions-form-card,.subscriptions-alerts,.subscriptions-filter-card,.subscriptions-list-card,.subscriptions-insights section{padding:18px;display:grid;gap:15px}.subscriptions-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.subscriptions-form-grid label{display:grid;gap:7px}.subscriptions-form-grid input,.subscriptions-form-grid select,.subscriptions-form-grid textarea,.subscriptions-form-grid .currency-trigger,.subscriptions-filter-grid select,.subscriptions-search-field input{width:100%;min-height:44px;border:1px solid color-mix(in srgb,var(--primary) 16%,transparent);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground);padding:0 11px;font:600 14px var(--font-ui);outline:0}.subscriptions-form-grid textarea{min-height:86px;padding:11px;resize:vertical}.subscriptions-notes-field{grid-column:1/-1}.subscriptions-checkbox-row{align-content:center;grid-template-columns:auto minmax(0,1fr);align-items:center}.subscriptions-checkbox-row input{width:18px;min-height:18px}.subscriptions-impact-card{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;border:1px solid color-mix(in srgb,var(--accent) 18%,transparent);background:var(--primary-soft);border-radius:var(--radius-card);padding:12px}.subscriptions-impact-card div{border-radius:var(--radius-control);background:var(--surface);border:1px solid color-mix(in srgb,var(--primary) 10%,transparent);padding:11px}.subscriptions-impact-card strong{display:block;margin-top:5px;color:var(--foreground);font-size:20px;font-weight:600}
        .subscriptions-alert-list{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.subscriptions-alert-list article{border:1px solid color-mix(in srgb,var(--warning) 22%,transparent);background:var(--warning-soft);border-radius:var(--radius-card);padding:12px}.subscriptions-alert-list strong{color:var(--foreground)}.subscriptions-alert-list p,.subscriptions-muted,.subscriptions-insights p{margin:7px 0;color:var(--foreground-muted);font-weight:500;line-height:1.65}
        .subscriptions-filter-grid{display:grid;grid-template-columns:1.5fr repeat(5,minmax(130px,1fr));gap:10px}.subscriptions-search-field{display:flex;align-items:center;gap:8px;min-height:44px;border:1px solid color-mix(in srgb,var(--primary) 16%,transparent);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground-muted);padding:0 11px}.subscriptions-search-field input{border:0;background:transparent;padding:0;min-height:40px}.subscriptions-active-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.subscriptions-active-filters span{border-radius:var(--radius-pill);background:color-mix(in srgb,var(--primary) 10%,transparent);color:var(--primary-active);padding:6px 10px;font-weight:600;font-size:12px}.subscriptions-active-filters button{border:0;background:var(--primary);color:var(--primary-foreground);border-radius:var(--radius-pill);min-height:32px;padding:0 11px;font-weight:600;cursor:pointer}
        .subscriptions-content-grid{display:grid;grid-template-columns:minmax(0,2.1fr) minmax(300px,.9fr);gap:16px;align-items:start}.subscriptions-insights{display:grid;gap:16px;position:sticky;top:16px}.subscriptions-card-list,.subscriptions-skeleton-list{display:grid;gap:10px}.subscriptions-skeleton-list span{height:86px;border-radius:var(--radius-card);background:var(--skeleton-gradient);background-size:200% 100%;animation:subShimmer 1.2s linear infinite}@keyframes subShimmer{to{background-position:-200% 0}}
        .subscription-card{border:1px solid color-mix(in srgb,var(--primary) 12%,transparent);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px}.subscription-summary{display:grid;grid-template-columns:auto auto minmax(190px,1fr) minmax(135px,.7fr) minmax(155px,.8fr) auto;gap:11px;align-items:center}.subscription-expand{width:36px;height:36px;border:1px solid color-mix(in srgb,var(--primary) 14%,transparent);border-radius:var(--radius-control);background:var(--surface);color:var(--foreground-secondary);display:grid;place-items:center;cursor:pointer}.subscription-expand svg{transition:.18s ease}.subscription-expand svg.open{transform:rotate(180deg)}.subscription-logo{width:42px;height:42px;border-radius:var(--radius-card);display:grid;place-items:center;color:var(--accent);background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 18%,transparent)}.subscription-title h3{margin:0;color:var(--foreground);font-size:17px;font-weight:600}.subscription-title p{margin:4px 0 0;color:var(--foreground-muted);font-weight:500}.subscription-money strong,.subscription-renewal strong{display:block;margin-top:4px;color:var(--foreground);font-weight:600}.subscription-renewal small{display:block;margin-top:3px;color:var(--accent);font-weight:600}.subscription-status{border-radius:var(--radius-pill);padding:7px 10px;background:color-mix(in srgb,var(--primary) 10%,transparent);color:var(--primary-active);font-weight:600;text-align:center}.subscription-status.active{background:var(--success-soft);color:var(--success)}.subscription-status.paused,.subscription-status.trial{background:var(--warning-soft);color:var(--warning)}.subscription-status.cancelled,.subscription-status.expired{background:var(--danger-soft);color:var(--danger)}.subscription-details{margin-top:12px;border-top:1px solid color-mix(in srgb,var(--primary) 10%,transparent);padding-top:12px;display:grid;gap:12px}.subscription-details dl{margin:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.subscription-details div{border:1px solid color-mix(in srgb,var(--primary) 10%,transparent);background:var(--surface);border-radius:var(--radius-control);padding:10px}.subscription-details dd{margin:4px 0 0;color:var(--foreground);font-weight:600;overflow-wrap:anywhere}.subscription-actions .danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 18%,transparent);background:var(--danger-soft)}
        .subscriptions-empty{border:1px dashed color-mix(in srgb,var(--primary) 24%,transparent);background:var(--surface-muted);border-radius:var(--radius-card);padding:22px;text-align:center;display:grid;gap:12px;justify-items:center}.subscriptions-empty h3{margin:0;color:var(--foreground);font-size:23px}.subscriptions-empty p{margin:0;max-width:560px;color:var(--foreground-muted);font-weight:500;line-height:1.75}.subscriptions-empty-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-width:720px}.subscriptions-empty-steps span{border:1px solid color-mix(in srgb,var(--primary) 12%,transparent);background:var(--surface);border-radius:var(--radius-control);padding:10px;color:var(--foreground-secondary);font-weight:600}.subscriptions-empty-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:center}
        .subscription-bars{display:grid;gap:10px}.subscription-bars div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.subscription-bars span{color:var(--foreground-secondary);font-weight:600}.subscription-bars strong{color:var(--foreground-muted);font-size:12px}.subscription-bars i{grid-column:1/-1;height:9px;border-radius:var(--radius-pill);background:var(--primary);display:block}
        .subscriptions-drawer-backdrop{position:fixed;z-index:80;inset:0;background:color-mix(in srgb,var(--shadow-color) 45%,transparent);display:flex;justify-content:flex-end}.subscriptions-examples-drawer{width:min(560px,100%);height:100%;background:var(--surface);color:var(--foreground);padding:20px;box-shadow:var(--shadow-md);display:grid;grid-template-rows:auto auto auto auto minmax(0,1fr) auto;gap:13px;overflow:auto}.subscriptions-examples-drawer header{display:flex;align-items:center;justify-content:space-between;gap:12px}.subscriptions-examples-drawer header span{color:var(--accent);font-weight:600;font-size:12px}.subscriptions-examples-drawer h2{margin:4px 0 0;font-size:24px}.subscriptions-examples-drawer header button{width:40px;height:var(--control-h);border:1px solid color-mix(in srgb,var(--primary) 16%,transparent);border-radius:var(--radius-control);background:var(--surface-muted);color:var(--foreground-secondary);display:grid;place-items:center;cursor:pointer}.examples-tabs{display:flex;gap:7px;overflow-x:auto;padding-bottom:3px}.examples-tabs button{flex:0 0 auto;min-height:38px;border:1px solid color-mix(in srgb,var(--primary) 16%,transparent);border-radius:var(--radius-pill);background:var(--surface-muted);color:var(--foreground-secondary);padding:0 12px;font:600 12px var(--font-ui);cursor:pointer}.examples-tabs button.active{background:var(--primary);color:var(--primary-foreground);border-color:var(--primary)}.examples-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;align-content:start}.examples-grid button{min-height:72px;text-align:start;border:1px solid color-mix(in srgb,var(--primary) 12%,transparent);background:var(--surface-muted);border-radius:var(--radius-card);padding:11px;cursor:pointer}.examples-grid strong{display:block;color:var(--foreground);font-weight:600}.examples-grid span{display:block;margin-top:5px;color:var(--foreground-muted);font-weight:500;font-size:12px}.load-more{width:100%}
        .subscription-money strong,.subscription-renewal strong,.subscriptions-kpis strong,.subscriptions-impact-card strong,.subscription-details dd,.subscription-bars strong,.subscriptions-print-summary strong,.subscriptions-print-row{font-family:var(--font-data)}
        .subscriptions-shell :is(button,a,input,select,textarea):focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow)}
        .subscriptions-print-report{display:none}
        @media(max-width:1180px){.subscriptions-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.subscriptions-content-grid{grid-template-columns:1fr}.subscriptions-insights{position:static}.subscriptions-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.subscriptions-search-field{grid-column:1/-1}.subscriptions-alert-list{grid-template-columns:repeat(2,minmax(0,1fr))}.subscription-summary{grid-template-columns:auto auto minmax(0,1fr);}.subscription-money,.subscription-renewal,.subscription-status{grid-column:auto / span 1}.subscription-details dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:720px){.subscriptions-content{gap:14px}.subscriptions-hero{grid-template-columns:1fr;padding:20px}.subscriptions-hero-actions,.subscriptions-form-actions{display:grid;grid-template-columns:1fr}.subscriptions-primary,.subscriptions-secondary,.subscriptions-tertiary{width:100%}.subscriptions-kpis,.subscriptions-form-grid,.subscriptions-impact-card,.subscriptions-filter-grid,.subscriptions-alert-list,.subscription-details dl,.subscriptions-empty-steps,.examples-grid{grid-template-columns:1fr}.subscription-summary{grid-template-columns:auto minmax(0,1fr) auto}.subscription-logo{grid-row:1}.subscription-title{grid-column:2}.subscription-expand{grid-column:3}.subscription-money,.subscription-renewal,.subscription-status{grid-column:1/-1}.subscription-actions{display:grid;grid-template-columns:1fr}.subscription-actions button,.subscription-actions a{width:100%}.subscriptions-drawer-backdrop{align-items:flex-end}.subscriptions-examples-drawer{width:100%;height:min(88dvh,760px);border-radius:var(--radius-panel) var(--radius-panel) 0 0;box-shadow:var(--shadow-md)}}
        @media print{@page{size:A4;margin:12mm}body *{visibility:hidden!important}.subscriptions-print-report,.subscriptions-print-report *{visibility:visible!important}.subscriptions-print-report{display:block!important;position:absolute;inset:0;width:100%;padding:0;background:var(--print-background);color:var(--print-foreground);font-family:var(--font-ui)}.subscriptions-print-report header{border-radius:var(--radius-card);background:var(--print-foreground);color:var(--print-background);padding:22px;margin-bottom:16px}.subscriptions-print-report header span{color:var(--print-foreground-secondary);font-weight:600}.subscriptions-print-report h1{margin:8px 0 6px;font-size:29px}.subscriptions-print-report p{margin:0;color:var(--print-foreground-secondary);font-weight:500}.subscriptions-print-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.subscriptions-print-summary article{border:1px solid var(--print-border);border-radius:var(--radius-control);padding:12px;background:var(--print-surface)}.subscriptions-print-summary small,.subscriptions-print-head{display:block;color:var(--print-foreground-muted);font-weight:600;font-size:12px}.subscriptions-print-summary strong{display:block;margin-top:7px;color:var(--print-foreground);font-size:16px}.subscriptions-print-table{border:1px solid var(--print-border);border-radius:var(--radius-card);overflow:hidden}.subscriptions-print-head,.subscriptions-print-row{display:grid;grid-template-columns:1.3fr .8fr .8fr .8fr .9fr;gap:8px;align-items:center;padding:10px 12px}.subscriptions-print-head{background:var(--print-surface);color:var(--print-foreground-secondary)}.subscriptions-print-row{border-top:1px solid var(--print-border);font-weight:500;color:var(--print-foreground-secondary)}.subscriptions-print-report footer{margin-top:14px;color:var(--print-foreground-muted);font-weight:600;text-align:center}}
      `}</style>
    </div>
  );
}

function ReceiptIcon({ size = 18 }: { size?: number }) {
  return <WalletCards size={size} />;
}

function Kpi({ icon: Icon, label, value }: { icon: LucideIcon | typeof ReceiptIcon; label: string; value: string }) {
  return (
    <article>
      <span className="kpi-icon"><Icon size={18} /></span>
      <small>{label}</small>
      <strong dir="auto">{value}</strong>
    </article>
  );
}

function EmptyState({
  title,
  body,
  action,
  secondary,
  steps,
  onPrimary,
  onSecondary,
}: {
  title: string;
  body: string;
  action: string;
  secondary?: string;
  steps?: readonly string[];
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="subscriptions-empty">
      <CreditCard size={32} />
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {steps && (
        <div className="subscriptions-empty-steps">
          {steps.map(step => <span key={step}>{step}</span>)}
        </div>
      )}
      <div className="subscriptions-empty-actions">
        <button type="button" className="subscriptions-primary" onClick={onPrimary}>{action}</button>
        {secondary && onSecondary && <button type="button" className="subscriptions-secondary light" onClick={onSecondary}>{secondary}</button>}
      </div>
    </div>
  );
}
