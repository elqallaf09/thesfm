'use client';

import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Search,
  TrendingUp,
  UploadCloud,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { CurrencySelect } from '@/components/CurrencySelect';
import { EmptyState } from '@/components/layout/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { normalizeDigits } from '@/lib/locale';
import { normalizeNumberInput } from '@/lib/money';
import { supabase } from '@/integrations/supabase/client';
import {
  buildClientBundles,
  buildReminderCandidates,
  calculateDashboardMetrics,
  calculateNextPaymentDate,
  addDays,
  clientInitials,
  effectivePaymentStatus,
  formatDate,
  formatMoney,
  isDateInput,
  isPaymentOpen,
  latestPayment,
  nextOpenPayment,
  normalizePaymentStatus,
  normalizeSubscriptionLang,
  normalizeSubscriptionStatus,
  normalizeSubscriptionType,
  parseAmountInput,
  paymentStatusLabel,
  reminderCandidateAmount,
  reminderCandidateCurrency,
  reminderLabel,
  sanitizeColorTag,
  SUBSCRIPTION_ASSET_BUCKET,
  SUBSCRIPTION_TEXT,
  subscriptionStatusLabel,
  subscriptionTypeLabel,
  todayIso,
  type ActivityLogRow,
  type ClientBundle,
  type ClientFileRow,
  type ClientNoteRow,
  type ClientRow,
  type DashboardMetrics,
  type PaymentAction,
  type PaymentHistoryRow,
  type PaymentRow,
  type ReminderNotificationRow,
  type SubscriptionLang,
  type SubscriptionRow,
  type SubscriptionStatus,
  type SubscriptionType,
} from '@/lib/businessSubscriptions';
import { downloadCsv, downloadXlsx, printPdf } from '@/lib/businessReports';

type ViewTab = 'clients' | 'calendar' | 'notifications' | 'statistics';
type PeriodFilter = 'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'overdue' | 'cancelled' | 'paused';

type FormState = {
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes: string;
  amount: string;
  currency: string;
  subscriptionType: SubscriptionType;
  customIntervalDays: string;
  startDate: string;
  nextPaymentDate: string;
  automaticRenewal: boolean;
  status: SubscriptionStatus;
  colorTag: string;
};

type Props = {
  clientId?: string;
};

type ReminderRuntimeEmailItem = {
  id: string;
  at: string;
  recipientType: 'customer' | 'subscriber' | null;
  status: 'sent' | 'skipped' | 'failed' | 'not_eligible';
  reason: string | null;
  message?: string | null;
  failureReason?: string | null;
  validationStatus?: string | null;
  smtpCalled?: boolean;
  reminderType: string | null;
  customerId: string | null;
  customerExists?: boolean;
  customerName: string | null;
  customerEmail: string | null;
  subscriberId?: string | null;
  subscriberName?: string | null;
  subscriberEmail: string | null;
  businessName?: string | null;
  dueDate: string | null;
  amount?: string | null;
  to: string[];
  from: string[];
  smtp?: {
    responseCode?: number;
    response?: string | null;
    command?: string | null;
    rejected?: string[];
    envelope?: {
      from?: string;
      to?: string[];
    } | null;
    stack?: string | null;
  } | null;
};

type ReminderRunSummaryState = {
  checkedCount: number;
  eligibleCount: number;
  sentCount: number;
  skippedCount: number;
  notEligibleCount: number;
  alreadySentCount: number;
  failedCount: number;
  byRecipient?: {
    sentCustomer: number;
    sentSubscriber: number;
    skippedCustomer: number;
    skippedSubscriber: number;
    failedCustomer: number;
    failedSubscriber: number;
  };
  skipReasons: Array<{
    reminderId: string | null;
    reminderType: string | null;
    customerName: string | null;
    customerEmail: string | null;
    subscriberEmail: string | null;
    dueDate: string | null;
    reasonCode: string | null;
    reasonMessage: string | null;
    recipient: string | null;
  }>;
};

type ReminderRuntimeStatus = {
  smtp: {
    configured: boolean;
    missing: string[];
  };
  emailRemindersActive: boolean;
  lastRun: {
    run_type: string;
    status: string;
    finished_at: string | null;
    candidates_count: number;
    processed_count: number;
    email_sent_count: number;
    email_failed_count: number;
    message: string | null;
    metadata?: Record<string, unknown> | null;
    summary?: ReminderRunSummaryState | null;
  } | null;
  lastEmailSentAt: string | null;
  lastCustomerEmail: ReminderRuntimeEmailItem | null;
  lastSubscriberEmail: ReminderRuntimeEmailItem | null;
  lastEmailFailure: {
    at: string;
    reason: string;
    reminderType: string | null;
    dueDate: string | null;
    customerId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    subscriberEmail?: string | null;
    recipientType?: 'customer' | 'subscriber' | null;
    status?: 'sent' | 'skipped' | 'failed' | 'not_eligible';
    failureReason?: string | null;
    validationStatus?: string | null;
    smtpCalled?: boolean;
    customerExists?: boolean;
    to: string[];
    from: string[];
    smtp?: {
      responseCode?: number;
      response?: string | null;
      command?: string | null;
      rejected?: string[];
      envelope?: {
        from?: string;
        to?: string[];
      };
      stack?: string | null;
    } | null;
  } | null;
};

const REMINDER_CONTROL_TEXT = {
  ar: {
    emailStatus: 'حالة تفعيل التنبيهات',
    active: 'تنبيهات البريد فعّالة',
    smtpMissing: 'إعدادات SMTP ناقصة',
    lastCheck: 'آخر فحص للتذكيرات',
    lastEmail: 'آخر بريد مرسل',
    lastCustomerEmail: 'آخر بريد للعميل',
    lastSubscriberEmail: 'آخر بريد للمشترك',
    customerSendStatus: 'حالة إرسال العميل',
    subscriberSendStatus: 'حالة إرسال المشترك',
    customerFailureReason: 'سبب فشل العميل',
    subscriberFailureReason: 'سبب فشل المشترك',
    failedReason: 'سبب الفشل الأخير',
    runNow: 'تشغيل فحص التذكيرات الآن',
    running: 'جارٍ فحص التذكيرات...',
    sendTest: 'إرسال بريد اختبار',
    sendingTest: 'جارٍ إرسال بريد الاختبار...',
    checkComplete: 'اكتمل فحص التذكيرات.',
    testSent: 'تم إرسال بريد الاختبار بنجاح.',
    details: 'التفاصيل',
    unavailable: 'غير متاح',
    customerName: 'اسم العميل',
    customerEmail: 'بريد العميل',
    subscriberEmail: 'بريد المشترك',
    validationStatus: 'حالة التحقق',
    reminderType: 'نوع التذكير',
    dueDate: 'تاريخ الاستحقاق',
    sent: 'تم الإرسال',
    skipped: 'تم التخطي',
    failed: 'فشل الإرسال',
  },
  en: {
    emailStatus: 'Email reminder status',
    active: 'Email reminders active',
    smtpMissing: 'SMTP settings missing',
    lastCheck: 'Last reminder check',
    lastEmail: 'Last email sent',
    lastCustomerEmail: 'Last customer email',
    lastSubscriberEmail: 'Last subscriber email',
    customerSendStatus: 'Customer send status',
    subscriberSendStatus: 'Subscriber send status',
    customerFailureReason: 'Customer failure reason',
    subscriberFailureReason: 'Subscriber failure reason',
    failedReason: 'Last failed reason',
    runNow: 'Run Reminder Check Now',
    running: 'Checking reminders...',
    sendTest: 'Send Test Email',
    sendingTest: 'Sending test email...',
    checkComplete: 'Reminder check completed.',
    testSent: 'Test email sent.',
    details: 'Details',
    customerName: 'Customer name',
    customerEmail: 'Customer email',
    subscriberEmail: 'Subscriber email',
    validationStatus: 'Validation status',
    reminderType: 'Reminder type',
    dueDate: 'Due date',
    sent: 'Sent',
    skipped: 'Skipped',
    failed: 'Failed',
    unavailable: 'Unavailable',
  },
  fr: {
    emailStatus: 'Etat des rappels e-mail',
    active: 'Rappels e-mail actifs',
    smtpMissing: 'Parametres SMTP manquants',
    lastCheck: 'Derniere verification',
    lastEmail: 'Dernier e-mail envoye',
    lastCustomerEmail: 'Dernier e-mail client',
    lastSubscriberEmail: 'Dernier e-mail abonne',
    customerSendStatus: 'Statut envoi client',
    subscriberSendStatus: 'Statut envoi abonne',
    customerFailureReason: 'Erreur client',
    subscriberFailureReason: 'Erreur abonne',
    failedReason: 'Derniere erreur',
    runNow: 'Lancer la verification',
    running: 'Verification en cours...',
    sendTest: 'Envoyer un e-mail test',
    sendingTest: 'Envoi du test...',
    checkComplete: 'Verification terminee.',
    testSent: 'E-mail test envoye.',
    details: 'Détails',
    unavailable: 'Indisponible',
    customerName: 'Client',
    customerEmail: 'E-mail client',
    subscriberEmail: 'E-mail abonne',
    validationStatus: 'Statut validation',
    reminderType: 'Type de rappel',
    dueDate: 'Echeance',
    sent: 'Envoye',
    skipped: 'Ignore',
    failed: 'Echec',
  },
} as const;

function reminderControlCopy(locale: SubscriptionLang) {
  const extra = {
    ar: {
      sendActualReminder: 'إرسال تذكير لهذا العميل',
      sendingActualReminder: 'جاري إرسال التذكير...',
      checkedCount: 'تم فحصها',
      eligibleCount: 'مؤهلة',
      sentCount: 'مرسلة',
      skippedCount: 'متخطاة',
      failedCount: 'فشلت',
      notEligibleCount: 'غير مؤهلة',
      skipReasons: 'أسباب التخطي',
      notEligible: 'غير مؤهل حالياً',
    },
    en: {
      sendActualReminder: 'Send Reminder To This Customer',
      sendingActualReminder: 'Sending reminder...',
      checkedCount: 'Checked',
      eligibleCount: 'Eligible',
      sentCount: 'Sent',
      skippedCount: 'Skipped',
      failedCount: 'Failed',
      notEligibleCount: 'Not eligible',
      skipReasons: 'Skip reasons',
      notEligible: 'Not eligible now',
    },
    fr: {
      sendActualReminder: 'Envoyer le rappel client',
      sendingActualReminder: 'Envoi du rappel...',
      checkedCount: 'Verifies',
      eligibleCount: 'Eligibles',
      sentCount: 'Envoyes',
      skippedCount: 'Ignores',
      failedCount: 'Echecs',
      notEligibleCount: 'Non eligibles',
      skipReasons: 'Raisons',
      notEligible: 'Non eligible',
    },
  } as const;

  return {
    ...REMINDER_CONTROL_TEXT[locale],
    ...extra[locale],
  };
}

const subscriptionTypes: SubscriptionType[] = ['monthly', 'weekly', 'quarterly', 'semi_annual', 'yearly', 'custom'];
const subscriptionStatuses: SubscriptionStatus[] = ['active', 'paused', 'cancelled', 'expired'];
const colorTags = ['#1D8CFF', '#18D4D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

function emptyForm(currency = 'KWD'): FormState {
  const today = todayIso();
  return {
    fullName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    notes: '',
    amount: '',
    currency,
    subscriptionType: 'monthly',
    customIntervalDays: '30',
    startDate: today,
    nextPaymentDate: today,
    automaticRenewal: true,
    status: 'active',
    colorTag: '#1D8CFF',
  };
}

function dbErrorText(error: unknown) {
  if (!error || typeof error !== 'object') return String(error ?? '');
  const value = error as { code?: unknown; message?: unknown; details?: unknown };
  return [value.code, value.message, value.details].filter(Boolean).join(' ');
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kuwait';
  } catch {
    return 'Asia/Kuwait';
  }
}

function formatDateTime(value: unknown, lang: SubscriptionLang = 'ar') {
  if (!value) return REMINDER_CONTROL_TEXT[lang].unavailable;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return REMINDER_CONTROL_TEXT[lang].unavailable;
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function reminderRunSummaryText(summary: ReminderRunSummaryState | null | undefined, locale: SubscriptionLang) {
  const copy = reminderControlCopy(locale);
  if (!summary) return copy.checkComplete;
  return [
    `${copy.checkedCount}: ${summary.checkedCount}`,
    `${copy.eligibleCount}: ${summary.eligibleCount}`,
    `${copy.sentCount}: ${summary.sentCount}`,
    `${copy.skippedCount}: ${summary.skippedCount}`,
    `${copy.failedCount}: ${summary.failedCount}`,
    `${copy.notEligibleCount}: ${summary.notEligibleCount}`,
  ].join(' · ');
}

function isSafeUploadType(file: File) {
  return ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(file.type);
}

function fileExtension(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (ext) return ext;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'application/pdf') return 'pdf';
  return 'bin';
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function actionToStatus(action: PaymentAction, existing: PaymentRow, amount: number) {
  if (action === 'missed') return 'missed';
  if (action === 'late') return 'late';
  if (action === 'refund') return 'refunded';
  if (action === 'advance') return 'advance';
  const nextPaid = action === 'partial'
    ? Math.min(Number(existing.amount_due), Number(existing.amount_paid || 0) + amount)
    : Number(existing.amount_due);
  return nextPaid >= Number(existing.amount_due) ? 'paid' : 'partial';
}

function fileColumns(lang: SubscriptionLang, currency: string) {
  const text = SUBSCRIPTION_TEXT[lang];
  return [
    { key: 'name', label: text.fullName, value: (row: ClientBundle) => row.client.full_name },
    { key: 'phone', label: text.phone, value: (row: ClientBundle) => row.client.phone },
    { key: 'status', label: text.status, value: (row: ClientBundle) => subscriptionStatusLabel(row.subscription?.status, lang) },
    { key: 'type', label: text.subscriptionType, value: (row: ClientBundle) => subscriptionTypeLabel(row.subscription?.subscription_type, lang) },
    { key: 'amount', label: text.amount, value: (row: ClientBundle) => formatMoney(row.subscription?.amount ?? 0, row.subscription?.currency || currency, lang) },
    { key: 'next', label: text.nextPaymentDate, value: (row: ClientBundle) => formatDate(row.subscription?.next_payment_date, lang) },
  ];
}

function PaymentStatusPill({ status, lang }: { status: string | null | undefined; lang: SubscriptionLang }) {
  const normalized = normalizePaymentStatus(status);
  return <span className={`sub-status payment ${normalized}`}>{paymentStatusLabel(normalized, lang)}</span>;
}

function SubscriptionStatusPill({ status, lang }: { status: string | null | undefined; lang: SubscriptionLang }) {
  const normalized = normalizeSubscriptionStatus(status);
  return <span className={`sub-status subscription ${normalized}`}>{subscriptionStatusLabel(normalized, lang)}</span>;
}

function assetPathFromValue(value: string | null | undefined) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) return text.replace(/^\/+/, '');
  try {
    const url = new URL(text);
    const publicMarker = `/storage/v1/object/public/${SUBSCRIPTION_ASSET_BUCKET}/`;
    const signedMarker = `/storage/v1/object/sign/${SUBSCRIPTION_ASSET_BUCKET}/`;
    const publicIndex = url.pathname.indexOf(publicMarker);
    if (publicIndex >= 0) return decodeURIComponent(url.pathname.slice(publicIndex + publicMarker.length));
    const signedIndex = url.pathname.indexOf(signedMarker);
    if (signedIndex >= 0) return decodeURIComponent(url.pathname.slice(signedIndex + signedMarker.length));
  } catch {
    return null;
  }
  return null;
}

function isExternalAssetUrl(value: string | null | undefined) {
  return /^https?:\/\//i.test(String(value ?? '').trim());
}

function ClientAvatar({ client, imageUrl, size = 'md' }: { client: ClientRow; imageUrl?: string; size?: 'sm' | 'md' | 'lg' }) {
  const color = sanitizeColorTag(client.color_tag);
  const initials = clientInitials(client.full_name);
  return (
    <span className={`client-avatar ${size}`} style={{ '--client-color': color } as React.CSSProperties}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={client.full_name} />
      ) : (
        <b>{initials}</b>
      )}
    </span>
  );
}

function KpiCard({ label, value, icon, tone = 'blue' }: { label: string; value: string; icon: ReactNode; tone?: string }) {
  return (
    <article className={`subscription-kpi ${tone}`}>
      <span className="kpi-icon" aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

export default function SubscriptionManagerPage({ clientId }: Props) {
  const { user, session, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = normalizeSubscriptionLang(lang);
  const text = SUBSCRIPTION_TEXT[locale];
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [history, setHistory] = useState<PaymentHistoryRow[]>([]);
  const [notes, setNotes] = useState<ClientNoteRow[]>([]);
  const [files, setFiles] = useState<ClientFileRow[]>([]);
  const [activity, setActivity] = useState<ActivityLogRow[]>([]);
  const [notifications, setNotifications] = useState<ReminderNotificationRow[]>([]);
  const [reminderStatus, setReminderStatus] = useState<ReminderRuntimeStatus | null>(null);
  const [reminderStatusLoading, setReminderStatusLoading] = useState(false);
  const [reminderCheckRunning, setReminderCheckRunning] = useState(false);
  const [singleReminderSending, setSingleReminderSending] = useState<string | null>(null);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [assetUrlMap, setAssetUrlMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ClientBundle | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubscriptionStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | SubscriptionType>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [tab, setTab] = useState<ViewTab>(clientId ? 'clients' : 'clients');
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(clientId ?? null);
  const [noteDraft, setNoteDraft] = useState('');
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const loadedOnce = useRef(false);

  const bundles = useMemo(() => buildClientBundles({
    clients,
    subscriptions,
    payments,
    history,
    notes,
    files,
    activity,
    notifications,
  }), [activity, clients, files, history, notes, notifications, payments, subscriptions]);

  const defaultCurrency = subscriptions[0]?.currency || 'KWD';
  const metrics = useMemo(() => calculateDashboardMetrics(bundles), [bundles]);
  const reminderCandidates = useMemo(() => buildReminderCandidates(bundles), [bundles]);
  const selectedBundle = useMemo(
    () => bundles.find(bundle => bundle.client.id === (selectedBundleId || clientId)) ?? bundles[0] ?? null,
    [bundles, clientId, selectedBundleId],
  );

  const assetDisplayUrl = useCallback((value: string | null | undefined) => {
    const path = assetPathFromValue(value);
    if (path && assetUrlMap[path]) return assetUrlMap[path];
    return isExternalAssetUrl(value) ? String(value) : '';
  }, [assetUrlMap]);

  const authReminderHeaders = useCallback(() => {
    if (!session?.access_token) return null;
    return {
      Authorization: `Bearer ${session.access_token}`,
      'x-client-timezone': browserTimezone(),
    };
  }, [session?.access_token]);

  const loadReminderStatus = useCallback(async () => {
    const headers = authReminderHeaders();
    if (!headers) return;
    setReminderStatusLoading(true);
    try {
      const response = await fetch('/api/business/subscriptions/reminders/status', { headers });
      const payload = await response.json().catch(() => null) as ReminderRuntimeStatus & { ok?: boolean } | null;
      if (response.ok && payload) {
        setReminderStatus(payload);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[business-subscriptions] reminder status failed', dbErrorText(err));
    } finally {
      setReminderStatusLoading(false);
    }
  }, [authReminderHeaders]);

  const runReminderCheckNow = useCallback(async () => {
    const headers = authReminderHeaders();
    if (!headers) return;
    setReminderCheckRunning(true);
    setError('');
    setNotice('');
    try {
      const params = new URLSearchParams({ timezone: browserTimezone() });
      const response = await fetch(`/api/business/subscriptions/reminders?${params.toString()}`, { headers });
      const payload = await response.json().catch(() => null) as { ok?: boolean; code?: string; message?: string; summary?: ReminderRunSummaryState | null } | null;
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || payload?.code || 'reminder_check_failed');
      setNotice(reminderRunSummaryText(payload.summary, locale));
      await loadReminderStatus();
    } catch (err) {
      setError(dbErrorText(err) || text.saveFailed);
    } finally {
      setReminderCheckRunning(false);
    }
  }, [authReminderHeaders, loadReminderStatus, locale, text.saveFailed]);

  const sendTestEmail = useCallback(async () => {
    const headers = authReminderHeaders();
    if (!headers) return;
    setTestEmailSending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/business/subscriptions/reminders/test-email', {
        method: 'POST',
        headers,
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; code?: string; message?: string; missing?: string[] } | null;
      if (!response.ok || !payload?.ok) {
        const missing = payload?.missing?.length ? `: ${payload.missing.join(', ')}` : '';
        throw new Error(`${payload?.message || payload?.code || 'smtp_test_failed'}${missing}`);
      }
      setNotice(payload?.message || REMINDER_CONTROL_TEXT[locale].testSent);
      await loadReminderStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : dbErrorText(err);
      setError(errorMessage || text.saveFailed);
      await loadReminderStatus();
    } finally {
      setTestEmailSending(false);
    }
  }, [authReminderHeaders, loadReminderStatus, locale, text.saveFailed]);

  const sendActualReminder = useCallback(async (reminderId: string) => {
    const headers = authReminderHeaders();
    if (!headers || !reminderId) return;
    setSingleReminderSending(reminderId);
    setError('');
    setNotice('');
    try {
      const params = new URLSearchParams({
        timezone: browserTimezone(),
        reminderId,
        force: '1',
      });
      const response = await fetch(`/api/business/subscriptions/reminders?${params.toString()}`, { headers });
      const payload = await response.json().catch(() => null) as { ok?: boolean; code?: string; message?: string; summary?: ReminderRunSummaryState | null } | null;
      if (!response.ok || !payload?.ok) throw new Error(payload?.message || payload?.code || 'reminder_send_failed');
      setNotice(reminderRunSummaryText(payload.summary, locale));
      await loadReminderStatus();
    } catch (err) {
      setError(dbErrorText(err) || text.saveFailed);
      await loadReminderStatus();
    } finally {
      setSingleReminderSending(null);
    }
  }, [authReminderHeaders, loadReminderStatus, locale, text.saveFailed]);

  const filteredBundles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = todayIso();
    return bundles.filter(bundle => {
      const subscription = bundle.subscription;
      const openPayment = nextOpenPayment(bundle.payments);
      const searchable = [
        bundle.client.full_name,
        bundle.client.phone,
        bundle.client.whatsapp,
        bundle.client.email,
        subscription?.amount,
        subscription?.currency,
        subscription?.subscription_type,
        subscription?.status,
        openPayment?.status,
        openPayment?.due_date,
      ].map(item => String(item ?? '').toLowerCase()).join(' ');
      if (q && !searchable.includes(q)) return false;
      if (statusFilter !== 'all' && normalizeSubscriptionStatus(subscription?.status) !== statusFilter) return false;
      if (typeFilter !== 'all' && normalizeSubscriptionType(subscription?.subscription_type) !== typeFilter) return false;
      if (periodFilter === 'cancelled' && normalizeSubscriptionStatus(subscription?.status) !== 'cancelled') return false;
      if (periodFilter === 'paused' && normalizeSubscriptionStatus(subscription?.status) !== 'paused') return false;
      if (periodFilter === 'today' && openPayment && openPayment.due_date !== today) return false;
      if (periodFilter === 'tomorrow' && openPayment && openPayment.due_date !== addDays(today, 1)) return false;
      if (periodFilter === 'week' && openPayment) {
        const distance = new Date(`${openPayment.due_date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime();
        if (distance < 0 || distance > 7 * 86400000) return false;
      }
      if (periodFilter === 'month' && openPayment && openPayment.due_date.slice(0, 7) !== today.slice(0, 7)) return false;
      if (periodFilter === 'overdue' && (!openPayment || effectivePaymentStatus(openPayment) !== 'overdue')) return false;
      return true;
    });
  }, [bundles, periodFilter, query, statusFilter, typeFilter]);

  const refreshSignedAssetUrls = useCallback(async (clientRows: ClientRow[], fileRows: ClientFileRow[]) => {
    const paths = Array.from(new Set([
      ...clientRows.flatMap(client => [client.avatar_url, client.profile_photo_url]),
      ...fileRows.map(file => file.file_url),
    ].map(assetPathFromValue).filter((value): value is string => Boolean(value))));

    if (!paths.length) {
      setAssetUrlMap({});
      return;
    }

    const { data, error: signedUrlError } = await supabase.storage
      .from(SUBSCRIPTION_ASSET_BUCKET)
      .createSignedUrls(paths, 60 * 60);

    if (signedUrlError) {
      if (process.env.NODE_ENV === 'development') console.warn('[business-subscriptions] signed URL generation failed', signedUrlError.message);
      setAssetUrlMap({});
      return;
    }

    const nextMap: Record<string, string> = {};
    data?.forEach((entry, index) => {
      if (entry?.signedUrl) nextMap[paths[index]] = entry.signedUrl;
    });
    setAssetUrlMap(nextMap);
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [
        clientsResult,
        subscriptionsResult,
        paymentsResult,
        historyResult,
        notesResult,
        filesResult,
        activityResult,
        notificationResult,
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('user_id', user.id).order('due_date', { ascending: false }),
        supabase.from('payment_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('client_notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('client_files').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('activity_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('subscription_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
      ]);

      const firstError = [
        clientsResult.error,
        subscriptionsResult.error,
        paymentsResult.error,
        historyResult.error,
        notesResult.error,
        filesResult.error,
        activityResult.error,
        notificationResult.error,
      ].find(Boolean);
      if (firstError) throw firstError;

      const nextClients = asArray(clientsResult.data) as ClientRow[];
      const nextFiles = asArray(filesResult.data) as ClientFileRow[];

      setClients(nextClients);
      setSubscriptions(asArray(subscriptionsResult.data) as SubscriptionRow[]);
      setPayments(asArray(paymentsResult.data) as PaymentRow[]);
      setHistory(asArray(historyResult.data) as PaymentHistoryRow[]);
      setNotes(asArray(notesResult.data) as ClientNoteRow[]);
      setFiles(nextFiles);
      setActivity(asArray(activityResult.data) as ActivityLogRow[]);
      setNotifications(asArray(notificationResult.data) as ReminderNotificationRow[]);
      await refreshSignedAssetUrls(nextClients, nextFiles);

      if (!loadedOnce.current && session?.access_token) {
        loadedOnce.current = true;
        const params = new URLSearchParams({ source: 'page_load', timezone: browserTimezone() });
        void fetch(`/api/business/subscriptions/reminders?${params.toString()}`, {
          headers: { Authorization: `Bearer ${session.access_token}`, 'x-client-timezone': browserTimezone() },
        }).then(() => undefined).catch(() => undefined);
      }
      void loadReminderStatus();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[business-subscriptions] load failed', dbErrorText(err));
      }
      setError(text.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [loadReminderStatus, refreshSignedAssetUrls, session?.access_token, text.loadFailed, user?.id]);

  useEffect(() => {
    if (!authLoading) void loadData();
  }, [authLoading, loadData]);

  useEffect(() => {
    if (clientId) setSelectedBundleId(clientId);
  }, [clientId]);

  function openCreateForm() {
    setEditingBundle(null);
    setForm(emptyForm(defaultCurrency));
    setAvatarFile(null);
    setProfileFile(null);
    setFormOpen(true);
  }

  function openEditForm(bundle: ClientBundle) {
    const subscription = bundle.subscription;
    setEditingBundle(bundle);
    setForm({
      fullName: bundle.client.full_name,
      phone: bundle.client.phone,
      whatsapp: bundle.client.whatsapp ?? '',
      email: bundle.client.email ?? '',
      address: bundle.client.address ?? '',
      notes: bundle.client.notes ?? '',
      amount: String(subscription?.amount ?? ''),
      currency: subscription?.currency || defaultCurrency,
      subscriptionType: normalizeSubscriptionType(subscription?.subscription_type),
      customIntervalDays: String(subscription?.custom_interval_days ?? 30),
      startDate: subscription?.start_date || todayIso(),
      nextPaymentDate: subscription?.next_payment_date || todayIso(),
      automaticRenewal: subscription?.automatic_renewal ?? true,
      status: normalizeSubscriptionStatus(subscription?.status),
      colorTag: sanitizeColorTag(bundle.client.color_tag),
    });
    setAvatarFile(null);
    setProfileFile(null);
    setFormOpen(true);
  }

  async function uploadAsset(file: File, folder: string) {
    if (!user?.id || !file) return null;
    if (!isSafeUploadType(file) || file.size > 10 * 1024 * 1024) throw new Error('unsupported_file');
    const path = `${user.id}/${folder}/${crypto.randomUUID()}.${fileExtension(file)}`;
    const { error: uploadError } = await supabase.storage.from(SUBSCRIPTION_ASSET_BUCKET).upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    return path;
  }

  async function syncOpenPaymentForSubscription(input: {
    clientId: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    dueDate: string;
    status: SubscriptionStatus;
  }) {
    if (!user?.id || input.status !== 'active') return;
    const openPayment = payments.find(payment =>
      payment.subscription_id === input.subscriptionId &&
      isPaymentOpen(payment)
    );

    if (openPayment) {
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          amount_due: input.amount,
          currency: input.currency,
          due_date: input.dueDate,
        })
        .eq('id', openPayment.id)
        .eq('user_id', user.id);
      if (paymentUpdateError) throw paymentUpdateError;
      return;
    }

    const { error: paymentInsertError } = await supabase.from('payments').insert({
      user_id: user.id,
      client_id: input.clientId,
      subscription_id: input.subscriptionId,
      amount_due: input.amount,
      amount_paid: 0,
      currency: input.currency,
      due_date: input.dueDate,
      status: 'pending',
    });
    if (paymentInsertError) throw paymentInsertError;
  }

  async function saveClient(event: FormEvent) {
    event.preventDefault();
    if (!user?.id) return;
    const amount = parseAmountInput(form.amount);
    if (!form.fullName.trim() || !form.phone.trim() || !isDateInput(form.nextPaymentDate) || !isDateInput(form.startDate)) {
      setError(text.formRequired);
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(text.formInvalidAmount);
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const avatarUrl = avatarFile ? await uploadAsset(avatarFile, 'avatars') : editingBundle?.client.avatar_url ?? null;
      const profileUrl = profileFile ? await uploadAsset(profileFile, 'profiles') : editingBundle?.client.profile_photo_url ?? null;
      const clientPayload = {
        user_id: user.id,
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        color_tag: sanitizeColorTag(form.colorTag),
        avatar_url: avatarUrl,
        profile_photo_url: profileUrl,
      };

      if (editingBundle) {
        const { error: clientError } = await supabase.from('clients').update(clientPayload).eq('id', editingBundle.client.id).eq('user_id', user.id);
        if (clientError) throw clientError;
        if (editingBundle.subscription) {
          const { data: updatedSubscription, error: subscriptionError } = await supabase.from('subscriptions').update({
            amount,
            currency: form.currency,
            subscription_type: form.subscriptionType,
            custom_interval_days: form.subscriptionType === 'custom' ? Number(form.customIntervalDays || 30) : null,
            start_date: form.startDate,
            next_payment_date: form.nextPaymentDate,
            automatic_renewal: form.automaticRenewal,
            status: form.status,
          }).eq('id', editingBundle.subscription.id).eq('user_id', user.id).select('id,next_payment_date').single();
          if (subscriptionError) throw subscriptionError;
          if (updatedSubscription?.next_payment_date !== form.nextPaymentDate) throw new Error('next_payment_date_not_saved');
          await syncOpenPaymentForSubscription({
            clientId: editingBundle.client.id,
            subscriptionId: editingBundle.subscription.id,
            amount,
            currency: form.currency,
            dueDate: form.nextPaymentDate,
            status: form.status,
          });
        }
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          client_id: editingBundle.client.id,
          subscription_id: editingBundle.subscription?.id ?? null,
          event_type: 'client_updated',
          title: 'client_updated',
          description: form.fullName.trim(),
        });
      } else {
        const { data: createdClient, error: clientError } = await supabase
          .from('clients')
          .insert(clientPayload)
          .select('*')
          .single();
        if (clientError) throw clientError;
        const { data: createdSubscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            client_id: createdClient.id,
            amount,
            currency: form.currency,
            subscription_type: form.subscriptionType,
            custom_interval_days: form.subscriptionType === 'custom' ? Number(form.customIntervalDays || 30) : null,
            start_date: form.startDate,
            next_payment_date: form.nextPaymentDate,
            automatic_renewal: form.automaticRenewal,
            status: form.status,
          })
          .select('*')
          .single();
        if (subscriptionError) throw subscriptionError;
        if (createdSubscription.next_payment_date !== form.nextPaymentDate) throw new Error('next_payment_date_not_saved');
        const { error: paymentError } = await supabase.from('payments').insert({
          user_id: user.id,
          client_id: createdClient.id,
          subscription_id: createdSubscription.id,
          amount_due: amount,
          amount_paid: 0,
          currency: form.currency,
          due_date: form.nextPaymentDate,
          status: 'pending',
        });
        if (paymentError) throw paymentError;
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          client_id: createdClient.id,
          subscription_id: createdSubscription.id,
          event_type: 'client_created',
          title: 'client_created',
          description: form.fullName.trim(),
        });
      }

      setNotice(text.saved);
      setFormOpen(false);
      await loadData();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[business-subscriptions] save failed', dbErrorText(err));
      setError(text.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(bundle: ClientBundle) {
    if (!user?.id) return;
    const confirmed = window.confirm(`${text.delete}: ${bundle.client.full_name}?`);
    if (!confirmed) return;
    setError('');
    const { error: deleteError } = await supabase.from('clients').delete().eq('id', bundle.client.id).eq('user_id', user.id);
    if (deleteError) {
      setError(text.saveFailed);
      return;
    }
    setNotice(text.deleted);
    if (selectedBundleId === bundle.client.id) setSelectedBundleId(null);
    await loadData();
  }

  async function insertIncomeFromPayment(bundle: ClientBundle, payment: PaymentRow, amount: number, action: PaymentAction) {
    if (!user?.id || amount <= 0 || (action !== 'paid' && action !== 'advance' && action !== 'partial')) return;
    const { error: incomeError } = await supabase.from('monthly_income_sources').insert({
      user_id: user.id,
      category: 'business_subscription',
      label: `Subscription payment - ${bundle.client.full_name}`,
      amount,
      currency: payment.currency || bundle.subscription?.currency || 'KWD',
      income_type: 'business_subscription',
      status: 'received',
      received_date: todayIso(),
      source_name: 'business_subscriptions',
      notes: `Client: ${bundle.client.full_name}; Payment: ${payment.id}`,
      is_recurring: false,
      calculation_mode: 'full_month',
      start_date: todayIso(),
      is_active: true,
    });
    if (incomeError && process.env.NODE_ENV === 'development') {
      console.warn('[business-subscriptions] income integration skipped', dbErrorText(incomeError));
    }
  }

  async function createNextPaymentIfNeeded(bundle: ClientBundle, payment: PaymentRow) {
    if (!user?.id || !bundle.subscription) return;
    if (normalizeSubscriptionStatus(bundle.subscription.status) !== 'active' || bundle.subscription.automatic_renewal === false) return;
    const nextDate = calculateNextPaymentDate(payment.due_date, bundle.subscription.subscription_type, bundle.subscription.custom_interval_days);
    const existing = bundle.payments.some(item => item.subscription_id === bundle.subscription?.id && item.due_date === nextDate);
    await supabase.from('subscriptions').update({ next_payment_date: nextDate }).eq('id', bundle.subscription.id).eq('user_id', user.id);
    if (!existing) {
      await supabase.from('payments').insert({
        user_id: user.id,
        client_id: bundle.client.id,
        subscription_id: bundle.subscription.id,
        amount_due: bundle.subscription.amount,
        amount_paid: 0,
        currency: bundle.subscription.currency || 'KWD',
        due_date: nextDate,
        status: 'pending',
      });
    }
  }

  async function handlePaymentAction(bundle: ClientBundle, payment: PaymentRow, action: PaymentAction) {
    if (!user?.id) return;
    const due = Number(payment.amount_due) || 0;
    const currentPaid = Number(payment.amount_paid) || 0;
    let amount = action === 'paid' ? due : due - currentPaid;
    if (action === 'partial' || action === 'advance' || action === 'refund') {
      const raw = window.prompt(text.amount, String(Math.max(0, action === 'refund' ? currentPaid : amount).toFixed(3)));
      if (raw === null) return;
      amount = parseAmountInput(raw);
      if (!Number.isFinite(amount) || amount < 0) {
        setError(text.formInvalidAmount);
        return;
      }
    }
    setError('');
    setNotice('');
    try {
      const nextStatus = actionToStatus(action, payment, amount);
      const amountPaid = action === 'partial'
        ? Math.min(due, currentPaid + amount)
        : action === 'refund'
          ? Math.max(0, currentPaid - amount)
          : (nextStatus === 'paid' || nextStatus === 'advance') ? Math.max(currentPaid, amount || due) : currentPaid;
      const paidAt = nextStatus === 'paid' || nextStatus === 'advance' ? new Date().toISOString() : payment.paid_at;
      const { data: updatedPayment, error: paymentError } = await supabase
        .from('payments')
        .update({
          status: nextStatus,
          amount_paid: amountPaid,
          paid_at: paidAt,
        })
        .eq('id', payment.id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (paymentError) throw paymentError;
      await supabase.from('payment_history').insert({
        user_id: user.id,
        payment_id: payment.id,
        client_id: bundle.client.id,
        subscription_id: bundle.subscription?.id ?? null,
        action,
        amount,
        currency: payment.currency || bundle.subscription?.currency || 'KWD',
        metadata: { previousStatus: payment.status, nextStatus },
      });
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        client_id: bundle.client.id,
        subscription_id: bundle.subscription?.id ?? null,
        payment_id: payment.id,
        event_type: `payment_${action}`,
        title: `payment_${action}`,
        description: `${bundle.client.full_name} - ${formatMoney(amount, payment.currency || bundle.subscription?.currency || 'KWD', locale)}`,
      });
      if (nextStatus === 'paid' || nextStatus === 'advance') {
        await insertIncomeFromPayment(bundle, updatedPayment as PaymentRow, amountPaid || amount || due, action);
        await createNextPaymentIfNeeded(bundle, updatedPayment as PaymentRow);
      }
      setNotice(text.paymentUpdated);
      await loadData();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[business-subscriptions] payment action failed', dbErrorText(err));
      setError(text.paymentActionFailed);
    }
  }

  async function addNote(bundle: ClientBundle) {
    if (!user?.id || !noteDraft.trim()) return;
    const { error: noteError } = await supabase.from('client_notes').insert({
      user_id: user.id,
      client_id: bundle.client.id,
      note: noteDraft.trim(),
    });
    if (noteError) {
      setError(text.saveFailed);
      return;
    }
    setNoteDraft('');
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      client_id: bundle.client.id,
      subscription_id: bundle.subscription?.id ?? null,
      event_type: 'note_added',
      title: 'note_added',
      description: bundle.client.full_name,
    });
    await loadData();
  }

  async function uploadClientFile(bundle: ClientBundle) {
    if (!user?.id || !fileUpload) return;
    try {
      if (!isSafeUploadType(fileUpload) || fileUpload.size > 10 * 1024 * 1024) throw new Error('unsupported_file');
      const path = `${user.id}/files/${bundle.client.id}/${crypto.randomUUID()}.${fileExtension(fileUpload)}`;
      const { error: uploadError } = await supabase.storage.from(SUBSCRIPTION_ASSET_BUCKET).upload(path, fileUpload);
      if (uploadError) throw uploadError;
      const { error: fileError } = await supabase.from('client_files').insert({
        user_id: user.id,
        client_id: bundle.client.id,
        file_name: fileUpload.name,
        file_url: path,
        file_type: fileUpload.type,
        file_size: fileUpload.size,
      });
      if (fileError) throw fileError;
      setFileUpload(null);
      await loadData();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.warn('[business-subscriptions] file upload failed', dbErrorText(err));
      setError(text.saveFailed);
    }
  }

  function exportRows(kind: 'csv' | 'xlsx' | 'pdf' | 'print') {
    const columns = fileColumns(locale, defaultCurrency);
    const rows = filteredBundles;
    if (kind === 'csv') downloadCsv('business-subscriptions.csv', rows, columns);
    if (kind === 'xlsx') void downloadXlsx('business-subscriptions.xlsx', rows, columns, 'Subscriptions');
    if (kind === 'pdf' || kind === 'print') {
      printPdf({
        title: text.pageTitle,
        lang: locale,
        columns,
        rows,
        totals: [
          { label: text.totalClients, value: String(metrics.totalClients) },
          { label: text.monthlyRevenue, value: formatMoney(metrics.monthlyRevenue, defaultCurrency, locale) },
          { label: text.outstandingRevenue, value: formatMoney(metrics.outstandingRevenue, defaultCurrency, locale) },
        ],
      });
    }
  }

  const kpiCards = [
    { label: text.totalClients, value: String(metrics.totalClients), icon: <UserRound size={20} />, tone: 'blue' },
    { label: text.activeSubscriptions, value: String(metrics.activeSubscriptions), icon: <CheckCircle2 size={20} />, tone: 'green' },
    { label: text.expiringTomorrow, value: String(metrics.expiringTomorrow), icon: <Clock3 size={20} />, tone: 'amber' },
    { label: text.dueToday, value: String(metrics.dueToday), icon: <CalendarDays size={20} />, tone: 'cyan' },
    { label: text.overduePayments, value: String(metrics.overduePayments), icon: <AlertTriangle size={20} />, tone: 'red' },
    { label: text.monthlyRevenue, value: formatMoney(metrics.monthlyRevenue, defaultCurrency, locale), icon: <TrendingUp size={20} />, tone: 'blue' },
    { label: text.expectedRevenueThisMonth, value: formatMoney(metrics.expectedRevenueThisMonth, defaultCurrency, locale), icon: <WalletCards size={20} />, tone: 'cyan' },
    { label: text.collectedRevenue, value: formatMoney(metrics.collectedRevenue, defaultCurrency, locale), icon: <CreditCard size={20} />, tone: 'green' },
    { label: text.outstandingRevenue, value: formatMoney(metrics.outstandingRevenue, defaultCurrency, locale), icon: <Bell size={20} />, tone: 'amber' },
  ];

  const profileMode = Boolean(clientId);

  return (
    <div className="subscription-manager-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.pageTitle} contentClassName="subscription-manager-content">
        <div className="subscription-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <section className="subscription-hero">
          <div>
            <span className="subscription-eyebrow">{text.businessBadge}</span>
            <h1>{profileMode ? text.clientProfile : text.pageTitle}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="subscription-hero-actions">
            {profileMode ? (
              <Link className="subscription-secondary-btn" href="/business/subscriptions">
                <ArrowLeft size={17} aria-hidden="true" />
                {text.clientList}
              </Link>
            ) : null}
            <button className="subscription-primary-btn" type="button" onClick={openCreateForm}>
              <Plus size={18} aria-hidden="true" />
              {text.addClient}
            </button>
            <button className="subscription-secondary-btn" type="button" onClick={() => exportRows('csv')} disabled={!filteredBundles.length}>
              <Download size={16} aria-hidden="true" />
              {text.exportCsv}
            </button>
            <button className="subscription-secondary-btn" type="button" onClick={() => exportRows('pdf')} disabled={!filteredBundles.length}>
              <FileText size={16} aria-hidden="true" />
              {text.exportPdf}
            </button>
          </div>
        </section>

        {error ? (
          <div className="subscription-alert error" role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={loadData}><RefreshCw size={15} />{text.retry}</button>
          </div>
        ) : null}
        {notice ? (
          <div className="subscription-alert success" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{notice}</span>
          </div>
        ) : null}

        {authLoading || loading ? (
          <LoadingState text={text.loading} />
        ) : !user ? (
          <EmptyState title={text.signIn} description={text.noDataBody} icon={<UserRound size={28} />} />
        ) : profileMode ? (
          <ClientProfileView
            bundle={selectedBundle}
            text={text}
            locale={locale}
            defaultCurrency={defaultCurrency}
            onEdit={bundle => openEditForm(bundle)}
            onDelete={deleteClient}
            onPaymentAction={handlePaymentAction}
            noteDraft={noteDraft}
            setNoteDraft={setNoteDraft}
            onAddNote={addNote}
            fileUpload={fileUpload}
            setFileUpload={setFileUpload}
            onUploadFile={uploadClientFile}
            getAssetUrl={assetDisplayUrl}
          />
        ) : (
          <>
            <section className="subscription-kpi-grid" aria-label={text.statistics}>
              {kpiCards.map(item => (
                <KpiCard key={item.label} {...item} />
              ))}
            </section>

            <div className="subscription-tabs" role="tablist" aria-label={text.pageTitle}>
              {([
                ['clients', text.clientList, UserRound],
                ['calendar', text.calendar, CalendarDays],
                ['notifications', text.notifications, Bell],
                ['statistics', text.statistics, TrendingUp],
              ] as const).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={tab === id ? 'active' : ''}
                  onClick={() => setTab(id)}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {tab === 'clients' ? (
              <ClientsWorkspace
                bundles={filteredBundles}
                allBundles={bundles}
                text={text}
                locale={locale}
                defaultCurrency={defaultCurrency}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                periodFilter={periodFilter}
                setPeriodFilter={setPeriodFilter}
                onOpenCreate={openCreateForm}
                onEdit={openEditForm}
                onDelete={deleteClient}
                onPaymentAction={handlePaymentAction}
                onExport={exportRows}
                setSelectedBundleId={setSelectedBundleId}
                getAssetUrl={assetDisplayUrl}
                reminderStatus={reminderStatus}
                reminderStatusLoading={reminderStatusLoading}
                reminderCheckRunning={reminderCheckRunning}
                singleReminderSending={singleReminderSending}
                testEmailSending={testEmailSending}
                onRunReminderCheck={runReminderCheckNow}
                onSendActualReminder={sendActualReminder}
                onSendTestEmail={sendTestEmail}
              />
            ) : null}
            {tab === 'calendar' ? <CalendarView bundles={bundles} text={text} locale={locale} defaultCurrency={defaultCurrency} /> : null}
            {tab === 'notifications' ? (
              <NotificationCenter
                candidates={reminderCandidates}
                notifications={notifications}
                text={text}
                locale={locale}
                reminderStatus={reminderStatus}
                reminderStatusLoading={reminderStatusLoading}
                reminderCheckRunning={reminderCheckRunning}
                singleReminderSending={singleReminderSending}
                testEmailSending={testEmailSending}
                onRunReminderCheck={runReminderCheckNow}
                onSendActualReminder={sendActualReminder}
                onSendTestEmail={sendTestEmail}
              />
            ) : null}
            {tab === 'statistics' ? <StatisticsView bundles={bundles} metrics={metrics} text={text} locale={locale} defaultCurrency={defaultCurrency} /> : null}
          </>
        )}

        {formOpen ? (
          <ClientFormModal
            text={text}
            locale={locale}
            form={form}
            setForm={setForm}
            saving={saving}
            editing={Boolean(editingBundle)}
            avatarFile={avatarFile}
            profileFile={profileFile}
            setAvatarFile={setAvatarFile}
            setProfileFile={setProfileFile}
            onClose={() => setFormOpen(false)}
            onSubmit={saveClient}
          />
        ) : null}
      </DashboardPageShell>
      <style jsx global>{subscriptionManagerStyles}</style>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="subscription-loading" role="status" aria-live="polite">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>{text}</span>
      <div className="subscription-skeleton-grid" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, index) => <i key={index} />)}
      </div>
    </div>
  );
}

type ClientsWorkspaceProps = {
  bundles: ClientBundle[];
  allBundles: ClientBundle[];
  text: typeof SUBSCRIPTION_TEXT[SubscriptionLang];
  locale: SubscriptionLang;
  defaultCurrency: string;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: 'all' | SubscriptionStatus;
  setStatusFilter: (value: 'all' | SubscriptionStatus) => void;
  typeFilter: 'all' | SubscriptionType;
  setTypeFilter: (value: 'all' | SubscriptionType) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (value: PeriodFilter) => void;
  onOpenCreate: () => void;
  onEdit: (bundle: ClientBundle) => void;
  onDelete: (bundle: ClientBundle) => void;
  onPaymentAction: (bundle: ClientBundle, payment: PaymentRow, action: PaymentAction) => void;
  onExport: (kind: 'csv' | 'xlsx' | 'pdf' | 'print') => void;
  setSelectedBundleId: (id: string) => void;
  getAssetUrl: (value: string | null | undefined) => string;
  reminderStatus: ReminderRuntimeStatus | null;
  reminderStatusLoading: boolean;
  reminderCheckRunning: boolean;
  singleReminderSending: string | null;
  testEmailSending: boolean;
  onRunReminderCheck: () => void;
  onSendActualReminder: (reminderId: string) => void;
  onSendTestEmail: () => void;
};

function reminderEmailStatusText(status: ReminderRuntimeEmailItem['status'] | null | undefined, locale: SubscriptionLang) {
  const copy = reminderControlCopy(locale);
  if (status === 'sent') return copy.sent;
  if (status === 'skipped') return copy.skipped;
  if (status === 'failed') return copy.failed;
  if (status === 'not_eligible') return copy.notEligible;
  return copy.unavailable;
}

function reminderEmailFailureText(item: ReminderRuntimeEmailItem | null) {
  if (!item || item.status === 'sent') return null;
  return item.message || item.reason || null;
}

function ReminderRecipientCard({
  item,
  recipientType,
  locale,
}: {
  item: ReminderRuntimeEmailItem | null;
  recipientType: 'customer' | 'subscriber';
  locale: SubscriptionLang;
}) {
  const copy = reminderControlCopy(locale);
  const isCustomer = recipientType === 'customer';
  const failure = reminderEmailFailureText(item);
  return (
    <div className={`subscription-reminder-recipient-card ${item?.status ?? 'empty'}`}>
      <span>{isCustomer ? copy.lastCustomerEmail : copy.lastSubscriberEmail}</span>
      <strong>{formatDateTime(item?.at, locale)}</strong>
      <dl>
        <div>
          <dt>{isCustomer ? copy.customerSendStatus : copy.subscriberSendStatus}</dt>
          <dd>{reminderEmailStatusText(item?.status, locale)}</dd>
        </div>
        {item?.customerName ? (
          <div>
            <dt>{copy.customerName}</dt>
            <dd>{item.customerName}</dd>
          </div>
        ) : null}
        {item?.customerEmail ? (
          <div>
            <dt>{copy.customerEmail}</dt>
            <dd>{item.customerEmail}</dd>
          </div>
        ) : null}
        {item?.subscriberEmail ? (
          <div>
            <dt>{copy.subscriberEmail}</dt>
            <dd>{item.subscriberEmail}</dd>
          </div>
        ) : null}
        {item?.reminderType ? (
          <div>
            <dt>{copy.reminderType}</dt>
            <dd>{item.reminderType}</dd>
          </div>
        ) : null}
        {item?.validationStatus ? (
          <div>
            <dt>{copy.validationStatus}</dt>
            <dd>{item.validationStatus}</dd>
          </div>
        ) : null}
        {item?.dueDate ? (
          <div>
            <dt>{copy.dueDate}</dt>
            <dd>{formatDate(item.dueDate, locale)}</dd>
          </div>
        ) : null}
        {failure ? (
          <div className="subscription-reminder-recipient-failure">
            <dt>{isCustomer ? copy.customerFailureReason : copy.subscriberFailureReason}</dt>
            <dd>{failure}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function ReminderStatusCard({
  status,
  loading,
  locale,
  onRunReminderCheck,
  onSendTestEmail,
  reminderCheckRunning,
  testEmailSending,
}: {
  status: ReminderRuntimeStatus | null;
  loading: boolean;
  locale: SubscriptionLang;
  onRunReminderCheck: () => void;
  onSendTestEmail: () => void;
  reminderCheckRunning: boolean;
  testEmailSending: boolean;
}) {
  const copy = reminderControlCopy(locale);
  const missing = status?.smtp.missing ?? [];
  const active = Boolean(status?.emailRemindersActive);
  const lastRunAt = status?.lastRun?.finished_at || null;
  const lastFailure = status?.lastEmailFailure;
  const lastRunMessage = status?.lastRun?.message?.trim() || null;
  const summary = status?.lastRun?.summary ?? null;
  const fallbackStatus: ReminderRuntimeEmailItem['status'] | null = status?.lastRun
    ? summary?.notEligibleCount || status.lastRun.candidates_count === 0
      ? 'not_eligible'
      : summary?.skippedCount
        ? 'skipped'
        : null
    : null;
  const customerStatus = status?.lastCustomerEmail?.status ?? fallbackStatus;
  const subscriberStatus = status?.lastSubscriberEmail?.status ?? fallbackStatus;
  const showRawDetails = process.env.NODE_ENV !== 'production' || Boolean(lastFailure?.smtp);
  return (
    <article className={`subscription-reminder-status ${active ? 'active' : 'warning'}`}>
      <header>
        <span aria-hidden="true">{active ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}</span>
        <div>
          <h3>{copy.emailStatus}</h3>
          <p>{loading ? copy.unavailable : active ? copy.active : copy.smtpMissing}</p>
        </div>
      </header>
      {!active && missing.length ? <div className="subscription-reminder-missing">{missing.join(', ')}</div> : null}
      {lastRunMessage ? (
        <div className="subscription-reminder-failure">
          <span>{copy.lastCheck}</span>
          <strong>{lastRunMessage}</strong>
        </div>
      ) : null}
      <div className="subscription-reminder-status-grid">
        <div><span>{copy.lastCheck}</span><strong>{formatDateTime(lastRunAt, locale)}</strong></div>
        <div><span>{copy.lastEmail}</span><strong>{formatDateTime(status?.lastEmailSentAt, locale)}</strong></div>
        <div><span>{copy.customerSendStatus}</span><strong>{reminderEmailStatusText(customerStatus, locale)}</strong></div>
        <div><span>{copy.subscriberSendStatus}</span><strong>{reminderEmailStatusText(subscriberStatus, locale)}</strong></div>
      </div>
      {summary ? (
        <div className="subscription-reminder-status-grid">
          <div><span>{copy.checkedCount}</span><strong>{summary.checkedCount}</strong></div>
          <div><span>{copy.eligibleCount}</span><strong>{summary.eligibleCount}</strong></div>
          <div><span>{copy.sentCount}</span><strong>{summary.sentCount}</strong></div>
          <div><span>{copy.skippedCount}</span><strong>{summary.skippedCount}</strong></div>
          <div><span>{copy.failedCount}</span><strong>{summary.failedCount}</strong></div>
          <div><span>{copy.notEligibleCount}</span><strong>{summary.notEligibleCount}</strong></div>
        </div>
      ) : null}
      {summary?.skipReasons?.length ? (
        <div className="subscription-reminder-failure">
          <span>{copy.skipReasons}</span>
          {summary.skipReasons.slice(0, 4).map((item, index) => (
            <strong key={`${item.reminderId ?? index}-${item.recipient ?? 'both'}`}>
              {[item.customerName, item.reasonMessage || item.reasonCode, item.recipient].filter(Boolean).join(' · ')}
            </strong>
          ))}
        </div>
      ) : null}
      <div className="subscription-reminder-recipient-grid">
        <ReminderRecipientCard item={status?.lastCustomerEmail ?? null} recipientType="customer" locale={locale} />
        <ReminderRecipientCard item={status?.lastSubscriberEmail ?? null} recipientType="subscriber" locale={locale} />
      </div>
      {lastFailure ? (
        <div className="subscription-reminder-failure">
          <span>{copy.failedReason}</span>
          <strong>{lastFailure.reason}</strong>
          <div style={{ marginTop: 8 }}>
            {lastFailure.customerName ? <div>{copy.customerName}: {lastFailure.customerName}</div> : null}
            {lastFailure.customerEmail ? <div>{copy.customerEmail}: {lastFailure.customerEmail}</div> : null}
            {lastFailure.subscriberEmail ? <div>{copy.subscriberEmail}: {lastFailure.subscriberEmail}</div> : null}
            {lastFailure.reminderType ? <div>{copy.reminderType}: {lastFailure.reminderType}</div> : null}
            {lastFailure.dueDate ? <div>{copy.dueDate}: {formatDate(lastFailure.dueDate, locale)}</div> : null}
            {lastFailure.validationStatus ? <div>{copy.validationStatus}: {lastFailure.validationStatus}</div> : null}
          </div>
          {(showRawDetails && lastFailure.smtp) ? (
            <details style={{ marginTop: 8 }}>
              <summary>{copy.details}</summary>
              {lastFailure.to.length ? <div>to: {lastFailure.to.join(', ')}</div> : null}
              {lastFailure.from.length ? <div>from: {lastFailure.from.join(', ')}</div> : null}
              {lastFailure.smtp.responseCode ? <div>responseCode: {lastFailure.smtp.responseCode}</div> : null}
              {lastFailure.smtp.command ? <div>command: {lastFailure.smtp.command}</div> : null}
              {lastFailure.smtp.response ? <div>response: {lastFailure.smtp.response}</div> : null}
              {lastFailure.smtp.rejected?.length ? <div>rejected: {lastFailure.smtp.rejected.join(', ')}</div> : null}
              {lastFailure.smtp.envelope ? <div>envelope: {JSON.stringify(lastFailure.smtp.envelope)}</div> : null}
              {lastFailure.smtp.stack ? <div>stack: {lastFailure.smtp.stack}</div> : null}
            </details>
          ) : null}
        </div>
      ) : null}
      <div className="subscription-reminder-actions">
        <button className="subscription-secondary-btn compact" type="button" onClick={onRunReminderCheck} disabled={reminderCheckRunning}>
          {reminderCheckRunning ? <Loader2 className="spin" size={15} /> : <RefreshCw size={15} />}
          {reminderCheckRunning ? copy.running : copy.runNow}
        </button>
        <button className="subscription-secondary-btn compact" type="button" onClick={onSendTestEmail} disabled={testEmailSending}>
          {testEmailSending ? <Loader2 className="spin" size={15} /> : <Mail size={15} />}
          {testEmailSending ? copy.sendingTest : copy.sendTest}
        </button>
      </div>
    </article>
  );
}

function ClientsWorkspace(props: ClientsWorkspaceProps) {
  const {
    bundles,
    allBundles,
    text,
    locale,
    defaultCurrency,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    periodFilter,
    setPeriodFilter,
    onOpenCreate,
    onEdit,
    onDelete,
    onPaymentAction,
    onExport,
    setSelectedBundleId,
    getAssetUrl,
    reminderStatus,
    reminderStatusLoading,
    reminderCheckRunning,
    singleReminderSending,
    testEmailSending,
    onRunReminderCheck,
    onSendActualReminder,
    onSendTestEmail,
  } = props;
  const hasFilters = Boolean(query || statusFilter !== 'all' || typeFilter !== 'all' || periodFilter !== 'all');

  if (!allBundles.length) {
    return (
      <EmptyState
        title={text.noData}
        description={text.noDataBody}
        icon={<UserRound size={30} />}
        actions={<button className="subscription-primary-btn" type="button" onClick={onOpenCreate}><Plus size={18} />{text.addFirstClient}</button>}
      />
    );
  }

  return (
    <section className="subscription-workspace-grid">
      <div className="subscription-main-column">
        <div className="subscription-toolbar">
          <label className="subscription-search">
            <Search size={17} aria-hidden="true" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.search} />
          </label>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'all' | SubscriptionStatus)} aria-label={text.status}>
            <option value="all">{text.allStatuses}</option>
            {subscriptionStatuses.map(status => <option key={status} value={status}>{subscriptionStatusLabel(status, locale)}</option>)}
          </select>
          <select value={typeFilter} onChange={event => setTypeFilter(event.target.value as 'all' | SubscriptionType)} aria-label={text.subscriptionType}>
            <option value="all">{text.allTypes}</option>
            {subscriptionTypes.map(type => <option key={type} value={type}>{subscriptionTypeLabel(type, locale)}</option>)}
          </select>
          <select value={periodFilter} onChange={event => setPeriodFilter(event.target.value as PeriodFilter)} aria-label={text.allPayments}>
            <option value="all">{text.allPayments}</option>
            <option value="today">{text.today}</option>
            <option value="tomorrow">{text.tomorrow}</option>
            <option value="week">{text.thisWeek}</option>
            <option value="month">{text.thisMonth}</option>
            <option value="overdue">{text.overdue}</option>
            <option value="cancelled">{text.cancelled}</option>
            <option value="paused">{text.paused}</option>
          </select>
          {hasFilters ? <button className="subscription-clear-btn" type="button" onClick={() => { setQuery(''); setStatusFilter('all'); setTypeFilter('all'); setPeriodFilter('all'); }}>{text.clearFilters}</button> : null}
        </div>

        <div className="subscription-export-row">
          <span>{bundles.length} / {allBundles.length}</span>
          <div>
            <button type="button" onClick={() => onExport('xlsx')}><FileSpreadsheet size={15} />{text.exportExcel}</button>
            <button type="button" onClick={() => onExport('print')}><Printer size={15} />{text.print}</button>
          </div>
        </div>

        {!bundles.length ? (
          <EmptyState title={text.noMatches} description={text.noDataBody} icon={<Search size={28} />} actions={<button className="subscription-secondary-btn" type="button" onClick={() => { setQuery(''); setStatusFilter('all'); setTypeFilter('all'); setPeriodFilter('all'); }}>{text.clearFilters}</button>} />
        ) : (
          <div className="subscription-client-list">
            {bundles.map(bundle => (
              <ClientCard
                key={bundle.client.id}
                bundle={bundle}
                text={text}
                locale={locale}
                defaultCurrency={defaultCurrency}
                onEdit={onEdit}
                onDelete={onDelete}
                onPaymentAction={onPaymentAction}
                setSelectedBundleId={setSelectedBundleId}
                avatarUrl={getAssetUrl(bundle.client.avatar_url)}
              />
            ))}
          </div>
        )}
      </div>
      <aside className="subscription-side-panel">
        <h2>{text.notifications}</h2>
        <ReminderStatusCard
          status={reminderStatus}
          loading={reminderStatusLoading}
          locale={locale}
          reminderCheckRunning={reminderCheckRunning}
          testEmailSending={testEmailSending}
          onRunReminderCheck={onRunReminderCheck}
          onSendTestEmail={onSendTestEmail}
        />
        {buildReminderCandidates(allBundles).slice(0, 5).map(candidate => (
          <article key={candidate.dedupeKey} className="subscription-reminder-mini">
            <button
              className="subscription-secondary-btn compact"
              type="button"
              onClick={() => onSendActualReminder(candidate.dedupeKey)}
              disabled={singleReminderSending === candidate.dedupeKey}
            >
              {singleReminderSending === candidate.dedupeKey ? <Loader2 className="spin" size={14} /> : <Mail size={14} />}
              {singleReminderSending === candidate.dedupeKey
                ? reminderControlCopy(locale).sendingActualReminder
                : reminderControlCopy(locale).sendActualReminder}
            </button>
            <strong>{candidate.client.full_name}</strong>
            <span>{reminderLabel(candidate.reminderType, locale)} · {formatMoney(reminderCandidateAmount(candidate), reminderCandidateCurrency(candidate, defaultCurrency), locale)}</span>
          </article>
        ))}
        {!buildReminderCandidates(allBundles).length ? <div className="subscription-empty-mini">{text.noData}</div> : null}
        <div className="subscription-integration-note">
          <CheckCircle2 size={17} aria-hidden="true" />
          <span>{text.integrations}</span>
        </div>
      </aside>
    </section>
  );
}

function ClientCard({
  bundle,
  text,
  locale,
  defaultCurrency,
  avatarUrl,
  onEdit,
  onDelete,
  onPaymentAction,
  setSelectedBundleId,
}: {
  bundle: ClientBundle;
  text: typeof SUBSCRIPTION_TEXT[SubscriptionLang];
  locale: SubscriptionLang;
  defaultCurrency: string;
  avatarUrl: string;
  onEdit: (bundle: ClientBundle) => void;
  onDelete: (bundle: ClientBundle) => void;
  onPaymentAction: (bundle: ClientBundle, payment: PaymentRow, action: PaymentAction) => void;
  setSelectedBundleId: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const subscription = bundle.subscription;
  const openPayment = nextOpenPayment(bundle.payments);
  const lastPaid = latestPayment(bundle.payments, ['paid', 'advance']);
  const currency = subscription?.currency || defaultCurrency;
  return (
    <article className="subscription-client-card">
      <div className="subscription-client-head">
        <ClientAvatar client={bundle.client} imageUrl={avatarUrl} />
        <div className="subscription-client-title">
          <h3>{bundle.client.full_name}</h3>
          <span dir="ltr">{bundle.client.phone}</span>
        </div>
        <SubscriptionStatusPill status={subscription?.status} lang={locale} />
        <button type="button" className="icon-button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="subscription-client-metrics">
        <div><span>{text.amount}</span><strong>{formatMoney(subscription?.amount ?? 0, currency, locale)}</strong></div>
        <div><span>{text.subscriptionType}</span><strong>{subscriptionTypeLabel(subscription?.subscription_type, locale)}</strong></div>
        <div><span>{text.nextPayment}</span><strong>{formatDate(openPayment?.due_date || subscription?.next_payment_date, locale)}</strong></div>
        <div><span>{text.outstandingBalance}</span><strong>{formatMoney(openPayment ? Math.max(0, Number(openPayment.amount_due) - Number(openPayment.amount_paid || 0)) : 0, currency, locale)}</strong></div>
      </div>
      <div className="subscription-card-actions">
        <Link className="subscription-secondary-btn compact" href={`/business/subscriptions/${bundle.client.id}`} onClick={() => setSelectedBundleId(bundle.client.id)}>
          <UserRound size={15} />{text.openProfile}
        </Link>
        {openPayment ? <button className="subscription-primary-btn compact" type="button" onClick={() => onPaymentAction(bundle, openPayment, 'paid')}><CheckCircle2 size={15} />{text.markPaid}</button> : null}
        <button className="subscription-secondary-btn compact" type="button" onClick={() => onEdit(bundle)}><Edit3 size={15} />{text.edit}</button>
      </div>
      {expanded ? (
        <div className="subscription-card-details">
          <div className="detail-row"><span>{text.email}</span><strong dir="auto">{bundle.client.email || text.unavailable}</strong></div>
          <div className="detail-row"><span>{text.whatsapp}</span><strong dir="ltr">{bundle.client.whatsapp || text.unavailable}</strong></div>
          <div className="detail-row"><span>{text.lastPayment}</span><strong>{lastPaid ? formatDate(lastPaid.paid_at || lastPaid.due_date, locale) : text.unavailable}</strong></div>
          <div className="payment-action-grid">
            {openPayment ? (
              <>
                <button type="button" onClick={() => onPaymentAction(bundle, openPayment, 'partial')}>{text.partialPayment}</button>
                <button type="button" onClick={() => onPaymentAction(bundle, openPayment, 'advance')}>{text.advancePayment}</button>
                <button type="button" onClick={() => onPaymentAction(bundle, openPayment, 'missed')}>{text.missedPayment}</button>
                <button type="button" onClick={() => onPaymentAction(bundle, openPayment, 'late')}>{text.latePayment}</button>
                <button type="button" onClick={() => onPaymentAction(bundle, openPayment, 'refund')}>{text.refund}</button>
              </>
            ) : null}
            <button type="button" className="danger" onClick={() => onDelete(bundle)}>{text.delete}</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ClientProfileView({
  bundle,
  text,
  locale,
  defaultCurrency,
  onEdit,
  onDelete,
  onPaymentAction,
  noteDraft,
  setNoteDraft,
  onAddNote,
  fileUpload,
  setFileUpload,
  onUploadFile,
  getAssetUrl,
}: {
  bundle: ClientBundle | null;
  text: typeof SUBSCRIPTION_TEXT[SubscriptionLang];
  locale: SubscriptionLang;
  defaultCurrency: string;
  onEdit: (bundle: ClientBundle) => void;
  onDelete: (bundle: ClientBundle) => void;
  onPaymentAction: (bundle: ClientBundle, payment: PaymentRow, action: PaymentAction) => void;
  noteDraft: string;
  setNoteDraft: (value: string) => void;
  onAddNote: (bundle: ClientBundle) => void;
  fileUpload: File | null;
  setFileUpload: (value: File | null) => void;
  onUploadFile: (bundle: ClientBundle) => void;
  getAssetUrl: (value: string | null | undefined) => string;
}) {
  if (!bundle) {
    return <EmptyState title={text.noData} description={text.noDataBody} icon={<UserRound size={28} />} />;
  }
  const subscription = bundle.subscription;
  const currency = subscription?.currency || defaultCurrency;
  const openPayment = nextOpenPayment(bundle.payments);
  const lastPaid = latestPayment(bundle.payments, ['paid', 'advance']);
  const avatarUrl = getAssetUrl(bundle.client.avatar_url);
  const profilePhotoUrl = getAssetUrl(bundle.client.profile_photo_url);
  const outstanding = bundle.payments
    .filter(payment => ['pending', 'partial', 'late', 'missed', 'overdue'].includes(effectivePaymentStatus(payment)))
    .reduce((sum, payment) => sum + Math.max(0, Number(payment.amount_due) - Number(payment.amount_paid || 0)), 0);

  return (
    <section className="subscription-profile-grid">
      <div className="subscription-profile-main">
        <article className="subscription-profile-hero">
          {profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="profile-cover" src={profilePhotoUrl} alt="" />
          ) : null}
          <div className="profile-identity">
            <ClientAvatar client={bundle.client} imageUrl={avatarUrl} size="lg" />
            <div>
              <h2>{bundle.client.full_name}</h2>
              <p dir="ltr">{bundle.client.phone}</p>
              <SubscriptionStatusPill status={subscription?.status} lang={locale} />
            </div>
          </div>
          <div className="subscription-card-actions">
            <button className="subscription-secondary-btn compact" type="button" onClick={() => onEdit(bundle)}><Edit3 size={15} />{text.edit}</button>
            <button className="subscription-secondary-btn compact danger-soft" type="button" onClick={() => onDelete(bundle)}><X size={15} />{text.delete}</button>
          </div>
        </article>

        <section className="subscription-panel-grid">
          <InfoPanel title={text.clientProfile} icon={<UserRound size={18} />}>
            <div className="detail-row"><span>{text.phone}</span><strong dir="ltr">{bundle.client.phone}</strong></div>
            <div className="detail-row"><span>{text.whatsapp}</span><strong dir="ltr">{bundle.client.whatsapp || text.unavailable}</strong></div>
            <div className="detail-row"><span>{text.email}</span><strong dir="auto">{bundle.client.email || text.unavailable}</strong></div>
            <div className="detail-row"><span>{text.address}</span><strong>{bundle.client.address || text.unavailable}</strong></div>
            <div className="detail-row"><span>{text.notes}</span><strong>{bundle.client.notes || text.unavailable}</strong></div>
          </InfoPanel>

          <InfoPanel title={text.subscriptionHistory} icon={<CreditCard size={18} />}>
            <div className="detail-row"><span>{text.amount}</span><strong>{formatMoney(subscription?.amount ?? 0, currency, locale)}</strong></div>
            <div className="detail-row"><span>{text.subscriptionType}</span><strong>{subscriptionTypeLabel(subscription?.subscription_type, locale)}</strong></div>
            <div className="detail-row"><span>{text.startDate}</span><strong>{formatDate(subscription?.start_date, locale)}</strong></div>
            <div className="detail-row"><span>{text.nextPayment}</span><strong>{formatDate(openPayment?.due_date || subscription?.next_payment_date, locale)}</strong></div>
            <div className="detail-row"><span>{text.automaticRenewal}</span><strong>{subscription?.automatic_renewal === false ? 'No' : 'Yes'}</strong></div>
          </InfoPanel>
        </section>

        <InfoPanel title={text.paymentTimeline} icon={<CalendarDays size={18} />}>
          <div className="subscription-timeline">
            {bundle.payments.length ? bundle.payments.map(payment => (
              <article key={payment.id}>
                <PaymentStatusPill status={effectivePaymentStatus(payment)} lang={locale} />
                <strong>{formatMoney(payment.amount_due, payment.currency || currency, locale)}</strong>
                <span>{formatDate(payment.due_date, locale)}</span>
                {['pending', 'partial', 'late', 'missed', 'overdue'].includes(effectivePaymentStatus(payment)) ? (
                  <div className="payment-action-grid compact">
                    <button type="button" onClick={() => onPaymentAction(bundle, payment, 'paid')}>{text.markPaid}</button>
                    <button type="button" onClick={() => onPaymentAction(bundle, payment, 'partial')}>{text.partialPayment}</button>
                    <button type="button" onClick={() => onPaymentAction(bundle, payment, 'late')}>{text.latePayment}</button>
                  </div>
                ) : null}
              </article>
            )) : <div className="subscription-empty-mini">{text.noData}</div>}
          </div>
        </InfoPanel>

        <section className="subscription-panel-grid">
          <InfoPanel title={text.notes} icon={<FileText size={18} />}>
            <div className="subscription-note-form">
              <textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder={text.notes} />
              <button className="subscription-primary-btn compact" type="button" onClick={() => onAddNote(bundle)}>{text.addNote}</button>
            </div>
            {bundle.notes.map(note => <p className="subscription-note" key={note.id}>{note.note}</p>)}
          </InfoPanel>
          <InfoPanel title={text.files} icon={<UploadCloud size={18} />}>
            <div className="subscription-file-form">
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={event => setFileUpload(event.target.files?.[0] ?? null)} />
              <button className="subscription-primary-btn compact" type="button" disabled={!fileUpload} onClick={() => onUploadFile(bundle)}>{text.uploadFile}</button>
            </div>
            {bundle.files.map(file => {
              const href = getAssetUrl(file.file_url);
              return href ? (
                <a key={file.id} className="subscription-file-link" href={href} target="_blank" rel="noopener noreferrer nofollow">{file.file_name}</a>
              ) : (
                <span key={file.id} className="subscription-file-link unavailable">{file.file_name}</span>
              );
            })}
          </InfoPanel>
        </section>
      </div>
      <aside className="subscription-profile-side">
        <KpiCard label={text.outstandingBalance} value={formatMoney(outstanding, currency, locale)} icon={<WalletCards size={20} />} tone="amber" />
        <KpiCard label={text.lastPayment} value={lastPaid ? formatDate(lastPaid.paid_at || lastPaid.due_date, locale) : text.unavailable} icon={<CheckCircle2 size={20} />} tone="green" />
        <KpiCard label={text.nextPayment} value={formatDate(openPayment?.due_date || subscription?.next_payment_date, locale)} icon={<Clock3 size={20} />} tone="cyan" />
        <InfoPanel title={text.activityLog} icon={<Activity size={18} />}>
          <div className="subscription-activity-list">
            {bundle.activity.slice(0, 8).map(item => (
              <article key={item.id}>
                <strong>{item.title}</strong>
                <span>{formatDate(item.created_at, locale)}</span>
              </article>
            ))}
            {!bundle.activity.length ? <div className="subscription-empty-mini">{text.noData}</div> : null}
          </div>
        </InfoPanel>
      </aside>
    </section>
  );
}

function InfoPanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <article className="subscription-info-panel">
      <header><span>{icon}</span><h2>{title}</h2></header>
      {children}
    </article>
  );
}

function CalendarView({ bundles, text, locale, defaultCurrency }: { bundles: ClientBundle[]; text: typeof SUBSCRIPTION_TEXT[SubscriptionLang]; locale: SubscriptionLang; defaultCurrency: string }) {
  const today = todayIso();
  const month = today.slice(0, 7);
  const monthPayments = bundles.flatMap(bundle => bundle.payments.map(payment => ({ bundle, payment }))).filter(item => item.payment.due_date.slice(0, 7) === month);
  const days = Array.from({ length: new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate() }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
  return (
    <section className="subscription-calendar-card">
      <header><h2>{text.calendar}</h2><p>{text.integrations}</p></header>
      <div className="subscription-calendar-legend">
        <span className="paid">{text.paidColor}</span>
        <span className="tomorrow">{text.tomorrowColor}</span>
        <span className="today">{text.dueTodayColor}</span>
        <span className="overdue">{text.overdueColor}</span>
        <span className="upcoming">{text.upcomingColor}</span>
      </div>
      <div className="subscription-calendar-grid">
        {days.map(day => {
          const items = monthPayments.filter(item => item.payment.due_date === day);
          return (
            <article key={day} className={day === today ? 'is-today' : ''}>
              <strong>{Number(day.slice(8, 10))}</strong>
              {items.slice(0, 3).map(item => {
                const status = effectivePaymentStatus(item.payment);
                return (
                  <span className={`calendar-dot ${status}`} key={item.payment.id}>
                    {item.bundle.client.full_name} · {formatMoney(item.payment.amount_due, item.payment.currency || defaultCurrency, locale)}
                  </span>
                );
              })}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NotificationCenter({
  candidates,
  notifications,
  text,
  locale,
  reminderStatus,
  reminderStatusLoading,
  reminderCheckRunning,
  singleReminderSending,
  testEmailSending,
  onRunReminderCheck,
  onSendActualReminder,
  onSendTestEmail,
}: {
  candidates: ReturnType<typeof buildReminderCandidates>;
  notifications: ReminderNotificationRow[];
  text: typeof SUBSCRIPTION_TEXT[SubscriptionLang];
  locale: SubscriptionLang;
  reminderStatus: ReminderRuntimeStatus | null;
  reminderStatusLoading: boolean;
  reminderCheckRunning: boolean;
  singleReminderSending: string | null;
  testEmailSending: boolean;
  onRunReminderCheck: () => void;
  onSendActualReminder: (reminderId: string) => void;
  onSendTestEmail: () => void;
}) {
  const reminderCopy = reminderControlCopy(locale);
  return (
    <section className="subscription-notification-grid">
      <InfoPanel title={text.notifications} icon={<Bell size={18} />}>
        <ReminderStatusCard
          status={reminderStatus}
          loading={reminderStatusLoading}
          locale={locale}
          reminderCheckRunning={reminderCheckRunning}
          testEmailSending={testEmailSending}
          onRunReminderCheck={onRunReminderCheck}
          onSendTestEmail={onSendTestEmail}
        />
        <div className="subscription-notification-list">
          {candidates.map(candidate => (
            <article key={candidate.dedupeKey}>
              <button
                className="subscription-secondary-btn compact"
                type="button"
                onClick={() => onSendActualReminder(candidate.dedupeKey)}
                disabled={singleReminderSending === candidate.dedupeKey}
              >
                {singleReminderSending === candidate.dedupeKey ? <Loader2 className="spin" size={14} /> : <Mail size={14} />}
                {singleReminderSending === candidate.dedupeKey
                  ? reminderCopy.sendingActualReminder
                  : reminderCopy.sendActualReminder}
              </button>
              <strong>{candidate.client.full_name}</strong>
              <span>{reminderLabel(candidate.reminderType, locale)} · {formatDate(candidate.dueDate, locale)}</span>
            </article>
          ))}
          {!candidates.length ? <div className="subscription-empty-mini">{text.noData}</div> : null}
        </div>
      </InfoPanel>
      <InfoPanel title={text.activityLog} icon={<Mail size={18} />}>
        <div className="subscription-notification-list">
          {notifications.slice(0, 16).map(item => (
            <article key={item.id}>
              <strong>{reminderLabel(item.reminder_type, locale)}</strong>
              <span>{item.channel} · {item.status} · {formatDate(item.created_at, locale)}</span>
            </article>
          ))}
          {!notifications.length ? <div className="subscription-empty-mini">{text.emailReady}</div> : null}
        </div>
      </InfoPanel>
    </section>
  );
}

function StatisticsView({ bundles, metrics, text, locale, defaultCurrency }: { bundles: ClientBundle[]; metrics: DashboardMetrics; text: typeof SUBSCRIPTION_TEXT[SubscriptionLang]; locale: SubscriptionLang; defaultCurrency: string }) {
  const active = bundles.filter(bundle => normalizeSubscriptionStatus(bundle.subscription?.status) === 'active').length;
  const renewalRate = bundles.length ? Math.round((active / bundles.length) * 100) : 0;
  const categories = [
    { label: text.expectedRevenueThisMonth, value: metrics.expectedRevenueThisMonth },
    { label: text.collectedRevenue, value: metrics.collectedRevenue },
    { label: text.outstandingRevenue, value: metrics.outstandingRevenue },
  ];
  const max = Math.max(...categories.map(item => item.value), 1);
  return (
    <section className="subscription-stat-grid">
      <InfoPanel title={text.statistics} icon={<TrendingUp size={18} />}>
        <div className="subscription-chart-bars">
          {categories.map(item => (
            <article key={item.label}>
              <span>{item.label}</span>
              <div><i style={{ inlineSize: `${Math.max(5, (item.value / max) * 100)}%` }} /></div>
              <strong>{formatMoney(item.value, defaultCurrency, locale)}</strong>
            </article>
          ))}
        </div>
      </InfoPanel>
      <InfoPanel title={text.activeSubscriptions} icon={<CheckCircle2 size={18} />}>
        <div className="subscription-renewal-ring" style={{ '--renewal': `${renewalRate}%` } as React.CSSProperties}>
          <strong>{renewalRate}%</strong>
          <span>{text.activeSubscriptions}</span>
        </div>
      </InfoPanel>
    </section>
  );
}

function ClientFormModal({
  text,
  locale,
  form,
  setForm,
  saving,
  editing,
  avatarFile,
  profileFile,
  setAvatarFile,
  setProfileFile,
  onClose,
  onSubmit,
}: {
  text: typeof SUBSCRIPTION_TEXT[SubscriptionLang];
  locale: SubscriptionLang;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  saving: boolean;
  editing: boolean;
  avatarFile: File | null;
  profileFile: File | null;
  setAvatarFile: (value: File | null) => void;
  setProfileFile: (value: File | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleFile(setter: (file: File | null) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => setter(event.target.files?.[0] ?? null);
  }

  return (
    <div className="subscription-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="subscription-modal" role="dialog" aria-modal="true" aria-labelledby="subscription-form-title">
        <header>
          <div>
            <span>{text.businessBadge}</span>
            <h2 id="subscription-form-title">{editing ? text.updateClient : text.addClient}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={20} /></button>
        </header>
        <form className="subscription-form-grid" onSubmit={onSubmit}>
          <Field label={text.fullName} value={form.fullName} onChange={value => update('fullName', value)} required />
          <Field label={text.phone} value={form.phone} onChange={value => update('phone', value)} required dir="ltr" inputMode="tel" />
          <Field label={text.whatsapp} value={form.whatsapp} onChange={value => update('whatsapp', value)} dir="ltr" inputMode="tel" />
          <Field label={text.email} value={form.email} onChange={value => update('email', value)} dir="ltr" inputMode="email" />
          <Field label={text.address} value={form.address} onChange={value => update('address', value)} span />
          <Field label={text.notes} value={form.notes} onChange={value => update('notes', value)} span textarea />
          <label>
            <span>{text.amount} *</span>
            <input value={form.amount} onChange={event => update('amount', normalizeNumberInput(event.target.value))} inputMode="decimal" required />
          </label>
          <label>
            <span>{text.currency}</span>
            <CurrencySelect value={form.currency} onChange={value => update('currency', value)} />
          </label>
          <label>
            <span>{text.subscriptionType}</span>
            <select value={form.subscriptionType} onChange={event => update('subscriptionType', event.target.value as SubscriptionType)}>
              {subscriptionTypes.map(type => <option key={type} value={type}>{subscriptionTypeLabel(type, locale)}</option>)}
            </select>
          </label>
          {form.subscriptionType === 'custom' ? (
            <label>
              <span>{text.custom}</span>
              <input value={form.customIntervalDays} onChange={event => update('customIntervalDays', normalizeNumberInput(event.target.value).replace(/\D/g, ''))} inputMode="numeric" />
            </label>
          ) : null}
          <label>
            <span>{text.startDate}</span>
            <input type="date" value={form.startDate} onChange={event => update('startDate', event.target.value)} required />
          </label>
          <label>
            <span>{text.nextPaymentDate}</span>
            <input type="date" value={form.nextPaymentDate} onChange={event => update('nextPaymentDate', event.target.value)} required />
          </label>
          <label>
            <span>{text.status}</span>
            <select value={form.status} onChange={event => update('status', event.target.value as SubscriptionStatus)}>
              {subscriptionStatuses.map(status => <option key={status} value={status}>{subscriptionStatusLabel(status, locale)}</option>)}
            </select>
          </label>
          <label className="subscription-switch-field">
            <span>{text.automaticRenewal}</span>
            <input type="checkbox" checked={form.automaticRenewal} onChange={event => update('automaticRenewal', event.target.checked)} />
          </label>
          <label>
            <span>{text.colorTag}</span>
            <div className="subscription-color-palette">
              {colorTags.map(color => (
                <button key={color} type="button" className={form.colorTag === color ? 'active' : ''} onClick={() => update('colorTag', color)} style={{ backgroundColor: color }} aria-label={color} />
              ))}
            </div>
          </label>
          <label>
            <span>{text.avatarUpload}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile(setAvatarFile)} />
            {avatarFile ? <small>{avatarFile.name}</small> : null}
          </label>
          <label>
            <span>{text.profileUpload}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile(setProfileFile)} />
            {profileFile ? <small>{profileFile.name}</small> : null}
          </label>
          <div className="subscription-form-actions">
            <button type="button" className="subscription-secondary-btn" onClick={onClose}>{text.cancelled}</button>
            <button type="submit" className="subscription-primary-btn" disabled={saving}>
              {saving ? <Loader2 className="spin" size={17} /> : <CheckCircle2 size={17} />}
              {editing ? text.updateClient : text.saveClient}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, textarea = false, span = false, required = false, dir, inputMode }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean; span?: boolean; required?: boolean; dir?: 'ltr' | 'rtl'; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  const normalizeInput = (nextValue: string) => inputMode === 'decimal' || inputMode === 'numeric' || inputMode === 'tel'
    ? normalizeDigits(nextValue)
    : nextValue;

  return (
    <label className={span ? 'span-2' : ''}>
      <span>{label}{required ? ' *' : ''}</span>
      {textarea ? (
        <textarea value={value} onChange={event => onChange(event.target.value)} rows={3} />
      ) : (
        <input value={value} onChange={event => onChange(normalizeInput(event.target.value))} required={required} dir={dir} inputMode={inputMode} />
      )}
    </label>
  );
}

const subscriptionManagerStyles = `
  .subscription-manager-shell {
    min-height: 100vh;
    background: var(--sfm-page-gradient);
    color: var(--sfm-foreground);
    font-family: Tajawal, Arial, sans-serif;
  }

  .subscription-manager-content {
    display: grid;
    gap: 18px;
    max-width: 1480px;
    margin-inline: auto;
  }

  .subscription-topbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  }

  .subscription-hero {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(47, 214, 192, 0.22);
    border-radius: var(--r-2xl);
    background:
      radial-gradient(circle at 12% 18%, rgba(24, 212, 212, 0.24), transparent 32%),
      linear-gradient(135deg, #031225, #0b3558 58%, #0f766e 130%);
    color: #fff;
    padding: clamp(22px, 3vw, 34px);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    box-shadow: 0 24px 60px rgba(3, 18, 37, 0.18);
  }

  .subscription-eyebrow {
    display: inline-flex;
    width: max-content;
    border: 1px solid rgba(167, 243, 240, 0.28);
    background: rgba(255, 255, 255, 0.09);
    color: #A7F3F0;
    border-radius: 999px;
    padding: 7px 11px;
    font-size: 0.78rem;
    font-weight: 950;
  }

  .subscription-hero h1 {
    margin: 12px 0 8px;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 1.08;
    font-weight: 950;
    letter-spacing: 0;
  }

  .subscription-hero p {
    margin: 0;
    max-width: 760px;
    color: rgba(234, 246, 255, 0.78);
    line-height: 1.8;
    font-weight: 800;
  }

  .subscription-hero-actions,
  .subscription-card-actions,
  .subscription-export-row,
  .subscription-export-row div {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .subscription-hero-actions {
    justify-content: flex-end;
  }

  .subscription-primary-btn,
  .subscription-secondary-btn,
  .subscription-clear-btn,
  .subscription-export-row button,
  .payment-action-grid button {
    min-height: 44px;
    border-radius: var(--r-md);
    border: 1px solid transparent;
    padding: 0 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: inherit;
    font-weight: 950;
    cursor: pointer;
    text-decoration: none;
    transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, background 0.16s ease;
  }

  .subscription-primary-btn {
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
    color: #fff;
    box-shadow: 0 16px 36px rgba(29, 140, 255, 0.24);
  }

  .subscription-secondary-btn,
  .subscription-clear-btn,
  .subscription-export-row button {
    background: var(--sfm-card);
    color: var(--sfm-primary-hover);
    border-color: rgba(29, 140, 255, 0.18);
  }

  .subscription-secondary-btn.compact,
  .subscription-primary-btn.compact,
  .subscription-export-row button,
  .payment-action-grid button {
    min-height: 38px;
    padding-inline: 12px;
    border-radius: var(--r-md);
    font-size: 0.82rem;
  }

  .subscription-primary-btn:hover,
  .subscription-secondary-btn:hover,
  .subscription-clear-btn:hover,
  .subscription-export-row button:hover,
  .payment-action-grid button:hover,
  .icon-button:hover {
    transform: translateY(-1px);
  }

  .subscription-primary-btn:focus-visible,
  .subscription-secondary-btn:focus-visible,
  .subscription-clear-btn:focus-visible,
  .subscription-export-row button:focus-visible,
  .payment-action-grid button:focus-visible,
  .icon-button:focus-visible {
    outline: 3px solid rgba(24, 212, 212, 0.30);
    outline-offset: 2px;
  }

  .subscription-primary-btn:disabled,
  .subscription-secondary-btn:disabled,
  .subscription-export-row button:disabled {
    opacity: 0.56;
    cursor: not-allowed;
    transform: none;
  }

  .subscription-kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 13px;
  }

  .subscription-kpi {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.16);
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(12px);
    border-radius: var(--r-2xl);
    padding: 15px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 12px;
    align-items: center;
    box-shadow: 0 18px 44px rgba(3, 18, 37, 0.08);
    animation: subscription-card-in 0.22s ease both;
  }

  @keyframes subscription-card-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .kpi-icon {
    width: 42px;
    height: 42px;
    border-radius: var(--r-lg);
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
  }

  .subscription-kpi.green .kpi-icon { background: linear-gradient(135deg, #059669, #10B981); }
  .subscription-kpi.amber .kpi-icon { background: linear-gradient(135deg, #B45309, #F59E0B); }
  .subscription-kpi.red .kpi-icon { background: linear-gradient(135deg, #B91C1C, #EF4444); }
  .subscription-kpi.cyan .kpi-icon { background: linear-gradient(135deg, #0891B2, #18D4D4); }

  .subscription-kpi small {
    display: block;
    color: var(--sfm-muted);
    font-size: 0.8rem;
    font-weight: 900;
  }

  .subscription-kpi strong {
    display: block;
    margin-top: 5px;
    color: var(--sfm-foreground);
    font-size: clamp(1rem, 1.4vw, 1.32rem);
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .subscription-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 2px 8px;
  }

  .subscription-tabs button {
    flex: 0 0 auto;
    min-height: 44px;
    border: 1px solid rgba(29, 140, 255, 0.18);
    border-radius: 999px;
    background: var(--sfm-card);
    color: var(--sfm-muted-readable);
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    font-weight: 950;
    cursor: pointer;
  }

  .subscription-tabs button.active {
    background: var(--sfm-midnight);
    color: var(--sfm-soft-cyan);
    border-color: rgba(47, 214, 192, 0.30);
  }

  .subscription-workspace-grid,
  .subscription-profile-grid,
  .subscription-notification-grid,
  .subscription-stat-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 0.34fr);
    gap: 16px;
    align-items: start;
  }

  .subscription-main-column,
  .subscription-profile-main {
    min-width: 0;
    display: grid;
    gap: 14px;
  }

  .subscription-side-panel,
  .subscription-profile-side,
  .subscription-calendar-card,
  .subscription-info-panel {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.16);
    background: var(--sfm-card);
    border-radius: var(--r-2xl);
    padding: 16px;
    box-shadow: 0 16px 40px rgba(3, 18, 37, 0.07);
  }

  .subscription-side-panel,
  .subscription-profile-side {
    position: sticky;
    top: 18px;
    display: grid;
    gap: 12px;
  }

  .subscription-toolbar {
    border: 1px solid rgba(29, 140, 255, 0.16);
    background: var(--sfm-card);
    border-radius: var(--r-xl);
    padding: 12px;
    display: grid;
    grid-template-columns: minmax(220px, 1.1fr) repeat(3, minmax(150px, 0.44fr)) auto;
    gap: 10px;
    align-items: center;
  }

  .subscription-search {
    min-width: 0;
    min-height: 44px;
    border: 1px solid rgba(29, 140, 255, 0.18);
    border-radius: var(--r-md);
    background: var(--sfm-light-card);
    display: flex;
    align-items: center;
    gap: 8px;
    padding-inline: 12px;
    color: var(--sfm-muted-readable);
  }

  .subscription-search input,
  .subscription-toolbar select,
  .subscription-form-grid input,
  .subscription-form-grid select,
  .subscription-form-grid textarea,
  .subscription-note-form textarea,
  .subscription-file-form input {
    width: 100%;
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.18);
    background: var(--sfm-light-card);
    color: var(--sfm-foreground);
    border-radius: var(--r-md);
    min-height: 44px;
    padding: 10px 12px;
    font-family: inherit;
    font-weight: 850;
  }

  .subscription-search input {
    border: 0;
    background: transparent;
    padding: 0;
    outline: 0;
  }

  .subscription-form-grid input:focus,
  .subscription-form-grid select:focus,
  .subscription-form-grid textarea:focus,
  .subscription-note-form textarea:focus,
  .subscription-file-form input:focus,
  .subscription-toolbar select:focus,
  .subscription-search:focus-within {
    outline: 3px solid rgba(24, 212, 212, 0.20);
    border-color: rgba(24, 212, 212, 0.44);
  }

  .subscription-export-row {
    justify-content: space-between;
    color: var(--sfm-muted-readable);
    font-weight: 900;
  }

  .subscription-client-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .subscription-client-card {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.16);
    background: var(--sfm-card);
    border-radius: var(--r-2xl);
    padding: 15px;
    display: grid;
    gap: 13px;
    box-shadow: 0 14px 34px rgba(3, 18, 37, 0.07);
  }

  .subscription-client-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    gap: 11px;
    align-items: center;
  }

  .client-avatar {
    width: 44px;
    height: 44px;
    border-radius: var(--r-lg);
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(135deg, var(--client-color), #18D4D4);
    box-shadow: 0 12px 24px rgba(3, 18, 37, 0.12);
    overflow: hidden;
    flex: 0 0 auto;
  }

  .client-avatar.sm { width: 36px; height: 36px; border-radius: var(--r-md); }
  .client-avatar.lg { width: 74px; height: 74px; border-radius: var(--r-2xl); }
  .client-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .client-avatar b { font-size: 0.86rem; font-weight: 950; }
  .client-avatar.lg b { font-size: 1.2rem; }

  .subscription-client-title {
    min-width: 0;
  }

  .subscription-client-title h3 {
    margin: 0;
    color: var(--sfm-foreground);
    font-size: 1rem;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .subscription-client-title span,
  .subscription-side-panel p,
  .subscription-info-panel p,
  .subscription-kpi small {
    color: var(--sfm-muted-readable);
  }

  .subscription-client-metrics,
  .subscription-panel-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .subscription-client-metrics div,
  .detail-row,
  .subscription-reminder-mini,
  .subscription-notification-list article,
  .subscription-timeline article,
  .subscription-activity-list article {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.12);
    background: var(--sfm-light-card);
    border-radius: var(--r-lg);
    padding: 10px;
  }

  .subscription-client-metrics span,
  .detail-row span,
  .subscription-timeline span,
  .subscription-notification-list span,
  .subscription-activity-list span,
  .subscription-reminder-mini span {
    display: block;
    color: var(--sfm-muted-readable);
    font-size: 0.76rem;
    font-weight: 900;
  }

  .subscription-client-metrics strong,
  .detail-row strong,
  .subscription-timeline strong,
  .subscription-notification-list strong,
  .subscription-activity-list strong,
  .subscription-reminder-mini strong {
    display: block;
    margin-top: 4px;
    color: var(--sfm-foreground);
    font-size: 0.88rem;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .subscription-reminder-mini,
  .subscription-notification-list article {
    display: grid;
    gap: 8px;
  }

  .subscription-reminder-mini button,
  .subscription-notification-list article button {
    justify-self: start;
    min-height: 36px;
    width: max-content;
    max-width: 100%;
    white-space: normal;
  }

  .subscription-card-details {
    display: grid;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(29, 140, 255, 0.12);
  }

  .payment-action-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .payment-action-grid.compact {
    margin-top: 8px;
  }

  .payment-action-grid button {
    background: var(--sfm-card);
    color: var(--sfm-primary-hover);
    border-color: rgba(29, 140, 255, 0.16);
  }

  .payment-action-grid .danger,
  .danger-soft {
    color: #B91C1C;
    border-color: rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.08);
  }

  .sub-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 0.74rem;
    font-weight: 950;
    white-space: nowrap;
    border: 1px solid transparent;
  }

  .sub-status.active,
  .sub-status.paid,
  .sub-status.advance {
    color: #047857;
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.20);
  }

  .sub-status.paused,
  .sub-status.partial,
  .sub-status.pending {
    color: #92400E;
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.22);
  }

  .sub-status.cancelled,
  .sub-status.expired,
  .sub-status.overdue,
  .sub-status.late,
  .sub-status.missed,
  .sub-status.refunded {
    color: #B91C1C;
    background: rgba(239, 68, 68, 0.10);
    border-color: rgba(239, 68, 68, 0.22);
  }

  .icon-button {
    width: 40px;
    height: 40px;
    border: 1px solid rgba(29, 140, 255, 0.16);
    border-radius: var(--r-md);
    background: var(--sfm-light-card);
    color: var(--sfm-primary-hover);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .subscription-alert {
    border-radius: var(--r-lg);
    padding: 12px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 900;
  }

  .subscription-alert.error {
    color: #B91C1C;
    background: rgba(239, 68, 68, 0.10);
    border: 1px solid rgba(239, 68, 68, 0.22);
  }

  .subscription-alert.success {
    color: #047857;
    background: rgba(16, 185, 129, 0.10);
    border: 1px solid rgba(16, 185, 129, 0.22);
  }

  .subscription-alert button {
    margin-inline-start: auto;
    min-height: 36px;
    border-radius: var(--r-md);
    border: 1px solid rgba(29, 140, 255, 0.18);
    background: var(--sfm-card);
    color: inherit;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding-inline: 12px;
    font-family: inherit;
    font-weight: 950;
    cursor: pointer;
  }

  .subscription-loading {
    min-height: 52vh;
    display: grid;
    gap: 16px;
    align-content: center;
    justify-items: center;
    color: var(--sfm-muted-readable);
    font-weight: 900;
  }

  .spin {
    animation: subscription-spin 0.9s linear infinite;
  }

  @keyframes subscription-spin {
    to { transform: rotate(360deg); }
  }

  .subscription-skeleton-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .subscription-skeleton-grid i {
    height: 110px;
    border-radius: var(--r-xl);
    background: linear-gradient(90deg, rgba(148, 163, 184, 0.12), rgba(34, 211, 238, 0.13), rgba(148, 163, 184, 0.12));
    background-size: 220% 100%;
    animation: subscription-shimmer 1.15s linear infinite;
  }

  @keyframes subscription-shimmer {
    to { background-position: -220% 0; }
  }

  .subscription-profile-hero {
    position: relative;
    overflow: hidden;
    min-height: 220px;
    border: 1px solid rgba(29, 140, 255, 0.16);
    border-radius: var(--r-2xl);
    background: linear-gradient(135deg, var(--sfm-card), var(--sfm-light-card));
    padding: 18px;
    display: grid;
    align-content: end;
    gap: 14px;
    box-shadow: 0 18px 44px rgba(3, 18, 37, 0.08);
  }

  .profile-cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.22;
  }

  .profile-identity {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .profile-identity h2 {
    margin: 0;
    color: var(--sfm-foreground);
    font-size: clamp(1.5rem, 3vw, 2.3rem);
    font-weight: 950;
  }

  .profile-identity p {
    margin: 5px 0 8px;
    color: var(--sfm-muted-readable);
    font-weight: 900;
  }

  .subscription-info-panel {
    display: grid;
    gap: 12px;
  }

  .subscription-info-panel header {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .subscription-info-panel header span {
    width: 36px;
    height: 36px;
    border-radius: var(--r-md);
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
  }

  .subscription-info-panel h2,
  .subscription-side-panel h2,
  .subscription-calendar-card h2 {
    margin: 0;
    color: var(--sfm-foreground);
    font-size: 1rem;
    font-weight: 950;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .subscription-timeline,
  .subscription-notification-list,
  .subscription-activity-list {
    display: grid;
    gap: 10px;
  }

  .subscription-note-form,
  .subscription-file-form {
    display: grid;
    gap: 10px;
  }

  .subscription-note {
    margin: 0;
    border: 1px solid rgba(29, 140, 255, 0.12);
    background: var(--sfm-light-card);
    border-radius: var(--r-md);
    padding: 10px;
    color: var(--sfm-muted-readable);
    line-height: 1.7;
    font-weight: 850;
  }

  .subscription-file-link {
    min-height: 40px;
    border: 1px solid rgba(29, 140, 255, 0.14);
    border-radius: var(--r-md);
    background: var(--sfm-light-card);
    color: var(--sfm-primary-hover);
    padding: 10px 12px;
    text-decoration: none;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .subscription-file-link.unavailable {
    color: var(--sfm-muted-readable);
    border-style: dashed;
  }

  .subscription-calendar-card {
    display: grid;
    gap: 14px;
  }

  .subscription-calendar-card header p {
    margin: 6px 0 0;
    color: var(--sfm-muted-readable);
    font-weight: 850;
  }

  .subscription-calendar-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .subscription-calendar-legend span {
    border-radius: 999px;
    padding: 5px 9px;
    font-size: 0.74rem;
    font-weight: 950;
    background: var(--sfm-light-card);
    border: 1px solid rgba(29, 140, 255, 0.14);
  }

  .subscription-calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 8px;
  }

  .subscription-calendar-grid article {
    min-height: 100px;
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.12);
    border-radius: var(--r-lg);
    background: var(--sfm-light-card);
    padding: 9px;
    display: grid;
    align-content: start;
    gap: 6px;
  }

  .subscription-calendar-grid article.is-today {
    border-color: rgba(24, 212, 212, 0.42);
    box-shadow: 0 0 0 3px rgba(24, 212, 212, 0.12);
  }

  .calendar-dot {
    border-radius: var(--r-sm);
    padding: 5px 6px;
    font-size: 0.68rem;
    font-weight: 900;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: rgba(29, 140, 255, 0.10);
    color: var(--sfm-primary-hover);
  }

  .calendar-dot.paid,
  .calendar-dot.advance { background: rgba(16, 185, 129, 0.12); color: #047857; }
  .calendar-dot.overdue,
  .calendar-dot.late,
  .calendar-dot.missed { background: rgba(185, 28, 28, 0.12); color: #991B1B; }

  .subscription-chart-bars {
    display: grid;
    gap: 12px;
  }

  .subscription-chart-bars article {
    display: grid;
    grid-template-columns: minmax(140px, 0.3fr) minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  .subscription-chart-bars span {
    color: var(--sfm-muted-readable);
    font-weight: 900;
  }

  .subscription-chart-bars div {
    height: 12px;
    border-radius: 999px;
    background: rgba(29, 140, 255, 0.10);
    overflow: hidden;
  }

  .subscription-chart-bars i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--sfm-primary), var(--sfm-accent));
  }

  .subscription-renewal-ring {
    width: 180px;
    height: 180px;
    margin: 10px auto;
    border-radius: 50%;
    display: grid;
    place-items: center;
    text-align: center;
    background: conic-gradient(var(--sfm-accent) var(--renewal), rgba(29, 140, 255, 0.12) 0);
    box-shadow: inset 0 0 0 18px var(--sfm-card);
  }

  .subscription-renewal-ring strong,
  .subscription-renewal-ring span {
    grid-area: 1 / 1;
  }

  .subscription-renewal-ring strong {
    color: var(--sfm-foreground);
    font-size: 2rem;
    font-weight: 950;
    transform: translateY(-8px);
  }

  .subscription-renewal-ring span {
    color: var(--sfm-muted-readable);
    font-weight: 900;
    transform: translateY(24px);
  }

  .subscription-empty-mini {
    border: 1px dashed rgba(29, 140, 255, 0.24);
    background: var(--sfm-light-card);
    color: var(--sfm-muted-readable);
    border-radius: var(--r-lg);
    padding: 16px;
    text-align: center;
    font-weight: 900;
  }

  .subscription-integration-note {
    border: 1px solid rgba(16, 185, 129, 0.22);
    background: rgba(16, 185, 129, 0.10);
    color: #047857;
    border-radius: var(--r-lg);
    padding: 12px;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-weight: 900;
    line-height: 1.6;
  }

  .subscription-reminder-status {
    border: 1px solid rgba(29, 140, 255, 0.14);
    background: var(--sfm-light-card);
    border-radius: var(--r-lg);
    padding: 12px;
    display: grid;
    gap: 10px;
  }

  .subscription-reminder-status.active {
    border-color: rgba(16, 185, 129, 0.22);
    background: rgba(16, 185, 129, 0.08);
  }

  .subscription-reminder-status.warning {
    border-color: rgba(245, 158, 11, 0.26);
    background: rgba(245, 158, 11, 0.08);
  }

  .subscription-reminder-status header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: start;
  }

  .subscription-reminder-status header > span {
    width: 34px;
    height: 34px;
    border-radius: var(--r-md);
    display: grid;
    place-items: center;
    color: #fff;
    background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
  }

  .subscription-reminder-status h3 {
    margin: 0;
    color: var(--sfm-foreground);
    font-size: 0.95rem;
    font-weight: 950;
  }

  .subscription-reminder-status p {
    margin: 3px 0 0;
    color: var(--sfm-muted-readable);
    font-size: 0.82rem;
    font-weight: 900;
  }

  .subscription-reminder-missing,
  .subscription-reminder-failure {
    border: 1px dashed rgba(185, 28, 28, 0.22);
    background: rgba(239, 68, 68, 0.08);
    color: #991B1B;
    border-radius: var(--r-md);
    padding: 9px 10px;
    font-size: 0.78rem;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .subscription-reminder-status-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .subscription-reminder-status-grid div {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.12);
    background: var(--sfm-card);
    border-radius: var(--r-md);
    padding: 9px;
  }

  .subscription-reminder-status-grid span,
  .subscription-reminder-failure span {
    display: block;
    color: var(--sfm-muted-readable);
    font-size: 0.72rem;
    font-weight: 900;
  }

  .subscription-reminder-status-grid strong,
  .subscription-reminder-failure strong {
    display: block;
    margin-top: 4px;
    color: var(--sfm-foreground);
    font-size: 0.78rem;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .subscription-reminder-recipient-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .subscription-reminder-recipient-card {
    min-width: 0;
    border: 1px solid rgba(29, 140, 255, 0.12);
    background: var(--sfm-card);
    border-radius: var(--r-md);
    padding: 10px;
    display: grid;
    gap: 8px;
  }

  .subscription-reminder-recipient-card.sent {
    border-color: rgba(16, 185, 129, 0.20);
  }

  .subscription-reminder-recipient-card.failed,
  .subscription-reminder-recipient-card.skipped {
    border-color: rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.07);
  }

  .subscription-reminder-recipient-card > span,
  .subscription-reminder-recipient-card dt {
    color: var(--sfm-muted-readable);
    font-size: 0.72rem;
    font-weight: 900;
  }

  .subscription-reminder-recipient-card > strong,
  .subscription-reminder-recipient-card dd {
    margin: 0;
    color: var(--sfm-foreground);
    font-size: 0.78rem;
    font-weight: 950;
    overflow-wrap: anywhere;
  }

  .subscription-reminder-recipient-card dl {
    margin: 0;
    display: grid;
    gap: 7px;
  }

  .subscription-reminder-recipient-card dl div {
    display: grid;
    gap: 2px;
  }

  .subscription-reminder-recipient-failure dd {
    color: #991B1B;
  }

  .subscription-reminder-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .subscription-reminder-actions .subscription-secondary-btn {
    width: 100%;
    min-height: 42px;
  }

  .subscription-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(3, 18, 37, 0.54);
    display: grid;
    place-items: center;
    padding: 18px;
  }

  .subscription-modal {
    width: min(980px, 100%);
    max-height: min(92vh, 980px);
    overflow: auto;
    border: 1px solid rgba(29, 140, 255, 0.18);
    border-radius: var(--r-2xl);
    background: var(--sfm-card);
    box-shadow: 0 34px 100px rgba(3, 18, 37, 0.28);
    padding: 20px;
  }

  .subscription-modal > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .subscription-modal > header span {
    color: var(--sfm-primary-hover);
    font-weight: 950;
    font-size: 0.78rem;
  }

  .subscription-modal h2 {
    margin: 5px 0 0;
    color: var(--sfm-foreground);
    font-size: 1.5rem;
    font-weight: 950;
  }

  .subscription-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .subscription-form-grid label {
    min-width: 0;
    display: grid;
    gap: 7px;
    color: var(--sfm-muted-readable);
    font-weight: 900;
  }

  .subscription-form-grid .span-2,
  .subscription-form-actions {
    grid-column: 1 / -1;
  }

  .subscription-form-grid textarea {
    resize: vertical;
    line-height: 1.7;
  }

  .subscription-switch-field {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .subscription-switch-field input {
    width: 22px;
    height: 22px;
    min-height: auto;
  }

  .subscription-color-palette {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .subscription-color-palette button {
    width: 34px;
    height: var(--control-h-sm);
    border-radius: 999px;
    border: 2px solid transparent;
    cursor: pointer;
  }

  .subscription-color-palette button.active {
    border-color: var(--sfm-foreground);
    box-shadow: 0 0 0 3px rgba(24, 212, 212, 0.22);
  }

  .subscription-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
    padding-top: 8px;
  }

  .dark .subscription-kpi,
  .dark .subscription-client-card,
  .dark .subscription-side-panel,
  .dark .subscription-profile-side,
  .dark .subscription-calendar-card,
  .dark .subscription-info-panel,
  .dark .subscription-modal {
    background: rgba(15, 29, 49, 0.92);
    border-color: rgba(47, 214, 192, 0.20);
    box-shadow: 0 18px 46px rgba(0, 0, 0, 0.28);
  }

  .dark .subscription-client-metrics div,
  .dark .detail-row,
  .dark .subscription-reminder-mini,
  .dark .subscription-reminder-status,
  .dark .subscription-reminder-status-grid div,
  .dark .subscription-reminder-recipient-card,
  .dark .subscription-notification-list article,
  .dark .subscription-timeline article,
  .dark .subscription-activity-list article,
  .dark .subscription-search,
  .dark .subscription-toolbar,
  .dark .subscription-calendar-grid article,
  .dark .subscription-empty-mini,
  .dark .subscription-note,
  .dark .subscription-file-link,
  .dark .subscription-form-grid input,
  .dark .subscription-form-grid select,
  .dark .subscription-form-grid textarea,
  .dark .subscription-note-form textarea,
  .dark .subscription-file-form input {
    background: rgba(19, 36, 58, 0.92);
    border-color: rgba(47, 214, 192, 0.16);
  }

  .dark .subscription-kpi small,
  .dark .subscription-client-title span,
  .dark .subscription-client-metrics span,
  .dark .detail-row span,
  .dark .subscription-side-panel p {
    color: #B8C7D9;
  }

  .dark .subscription-integration-note {
    color: #86EFAC;
    background: rgba(16, 185, 129, 0.14);
  }

  .dark .subscription-reminder-status.active {
    background: rgba(16, 185, 129, 0.12);
  }

  .dark .subscription-reminder-status.warning,
  .dark .subscription-reminder-missing,
  .dark .subscription-reminder-failure,
  .dark .subscription-reminder-recipient-card.failed,
  .dark .subscription-reminder-recipient-card.skipped {
    color: #FCD34D;
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.24);
  }

  @media (max-width: 1220px) {
    .subscription-kpi-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .subscription-client-list {
      grid-template-columns: 1fr;
    }

    .subscription-toolbar {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 980px) {
    .subscription-workspace-grid,
    .subscription-profile-grid,
    .subscription-notification-grid,
    .subscription-stat-grid {
      grid-template-columns: 1fr;
    }

    .subscription-side-panel,
    .subscription-profile-side {
      position: static;
    }

    .subscription-kpi-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .subscription-calendar-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .subscription-topbar,
    .subscription-hero,
    .subscription-hero-actions,
    .subscription-form-actions {
      display: grid;
      justify-content: stretch;
    }

    .subscription-primary-btn,
    .subscription-secondary-btn,
    .subscription-clear-btn {
      width: 100%;
    }

    .subscription-kpi-grid,
    .subscription-toolbar,
    .subscription-client-metrics,
    .subscription-panel-grid,
    .subscription-reminder-status-grid,
    .subscription-reminder-recipient-grid,
    .subscription-reminder-actions,
    .subscription-form-grid,
    .subscription-skeleton-grid,
    .subscription-chart-bars article {
      grid-template-columns: 1fr;
    }

    .subscription-client-head {
      grid-template-columns: auto minmax(0, 1fr) auto;
    }

    .subscription-client-head .sub-status {
      grid-column: 1 / -1;
      width: max-content;
    }

    .subscription-modal-backdrop {
      align-items: end;
      padding: 10px;
    }

    .subscription-modal {
      border-radius: var(--r-2xl) var(--r-2xl) 0 0;
      max-height: 92vh;
      padding: 16px;
    }

    .subscription-calendar-grid {
      grid-template-columns: 1fr;
    }
  }
`;

