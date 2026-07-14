'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  Calculator,
  CalendarDays,
  FileText,
  FileUp,
  Gift,
  HandCoins,
  HeartHandshake,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageTabPanel } from '@/components/layout/PageTabs';
import { EmptyState } from '@/components/layout/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';

import type { Lang, CharityProject, ZakatAsset, Commitment, ProjectDonation, CharityDocument, ReminderType, ReminderStatus, ReminderPriority, BeneficiaryCategory, BeneficiaryStatus, ContributorRole, PaymentStatus, DocumentCategory, CharityOrganization, CharityImpactMetric, CharityReminder, CharityBeneficiary, CharityContributor, CharityProjectsTab, OrganizationType, VerificationStatus, ProjectCategory, ProjectStatus } from './_types';
import { TEXT } from './_text';
import { categories, statuses, documentCategories, reminderTypes, reminderPriorities, beneficiaryCategories, beneficiaryStatuses, contributorRoles, paymentStatuses, organizationTypes, verificationStatuses, allowedDocumentTypes, maxDocumentSize, templates, today, addDays, daysUntil, toNum, recordDate, isYear, isCurrentMonth, formatFileSize, cleanFileName, estimatedHijriDate } from './_utils';
import { ProjectModal } from './_ProjectModal';
import { ReminderModal } from './_ReminderModal';
import { DocumentModal } from './_DocumentModal';
import { BeneficiaryModal, BeneficiaryDetailsModal } from './_BeneficiaryModal';
import { ContributorModal } from './_ContributorModal';
import { CharityStyles } from './_styles';
import {
  CharityActionButton,
  CharityEmptyState,
  CharityReportCard,
  CharitySectionHeader,
  CharityStatCard,
  CharityTabs,
} from './_dashboardComponents';

const CHARITY_PROJECTS_TABS = ['overview', 'projects', 'beneficiaries', 'donations', 'reports', 'impact', 'reminders', 'documents'] as const;
const CHARITY_PROJECTS_TABS_ID = 'charity-projects-workspace';
const CHARITY_AGGREGATE_CURRENCY = 'KWD';
const CHARITY_PROJECT_SCOPES = ['charity', 'zakat'] as const;

function isAggregateCurrency(currency?: string | null) {
  return currency === CHARITY_AGGREGATE_CURRENCY;
}

function normalizedRecordKind(value?: string | null) {
  return String(value ?? '').trim().toLowerCase();
}

function isZakatRecord(value?: string | null) {
  return normalizedRecordKind(value) === 'zakat';
}

function isKhumsRecord(value?: string | null) {
  return normalizedRecordKind(value) === 'khums';
}

function isVoluntaryCharityRecord(value?: string | null) {
  return !isZakatRecord(value) && !isKhumsRecord(value);
}

function normalizedCurrency(value?: string | null) {
  const currency = String(value ?? '').trim().toUpperCase();
  return currency || null;
}

function hasSameExplicitCurrency(left?: string | null, right?: string | null) {
  const leftCurrency = normalizedCurrency(left);
  const rightCurrency = normalizedCurrency(right);
  return Boolean(leftCurrency && rightCurrency && leftCurrency === rightCurrency);
}

function encodedLegacyMonth(value?: string | null) {
  const month = String(value ?? '').split(':')[1] ?? '';
  return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month) ? month : null;
}

export default function CharityProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const baseTr = TEXT[lang as Lang] ?? TEXT.ar;
  const localCopy = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const phaseCopy = {
    tabOverview: localCopy('نظرة عامة', 'Overview', 'Aperçu'),
    tabProjects: localCopy('المشاريع', 'Projects', 'Projets'),
    tabBeneficiaries: localCopy('المستفيدون', 'Beneficiaries', 'Bénéficiaires'),
    tabDonations: localCopy('التبرعات', 'Donations', 'Dons'),
    tabReports: localCopy('التقارير', 'Reports', 'Rapports'),
    tabImpact: localCopy('الأثر', 'Impact', 'Impact'),
    tabReminders: localCopy('التذكيرات', 'Reminders', 'Rappels'),
    tabDocuments: localCopy('المستندات والإيصالات', 'Documents & Receipts', 'Documents et reçus'),
    nextCharityReminder: localCopy('تذكير خيري قادم', 'Next charity reminder', 'Prochain rappel caritatif'),
    noReminderScheduled: localCopy('لا يوجد تذكير خيري مجدول', 'No charity reminder scheduled', 'Aucun rappel caritatif planifié'),
    projectArtwork: localCopy('صورة توضيحية للمشروع', 'Project artwork', 'Illustration du projet'),
    projectProgress: localCopy('تقدم المشروع', 'Project progress', 'Progression du projet'),
    raised: localCopy('المبلغ المحصل', 'Raised', 'Collecté'),
    remaining: localCopy('المتبقي', 'Remaining', 'Restant'),
    donorCount: localCopy('المتبرعون', 'Donors', 'Donateurs'),
    donorIdentityUnavailable: localCopy('هوية المتبرع غير مسجلة', 'Donor identity not recorded', 'Identité du donateur non enregistrée'),
    location: localCopy('الموقع', 'Location', 'Lieu'),
    transparency: localCopy('الشفافية', 'Transparency', 'Transparence'),
    notRecorded: localCopy('غير مسجل', 'Not recorded', 'Non renseigné'),
    notReviewed: localCopy('لم تتم المراجعة', 'Not reviewed', 'Non évalué'),
    projectVerification: localCopy('التحقق من الجهة', 'Organization verification', 'Vérification de l’organisme'),
    donationsTitle: localCopy('سجل التبرعات', 'Donation center', 'Centre des dons'),
    donationsDescription: localCopy('راجع التبرعات المسجلة وإيصالاتها وادعم مشروعاً مستقلاً.', 'Review recorded donations and receipts, or support an independent project.', 'Consultez les dons et reçus enregistrés, ou soutenez un projet indépendant.'),
    donationsThisYear: localCopy('تبرعات هذا العام', 'Donated this year', 'Dons cette année'),
    donationRecords: localCopy('سجلات التبرع', 'Donation records', 'Dons enregistrés'),
    projectsSupported: localCopy('المشاريع المدعومة', 'Projects supported', 'Projets soutenus'),
    allProjects: localCopy('كل المشاريع', 'All projects', 'Tous les projets'),
    latestDonation: localCopy('آخر تبرع', 'Latest donation', 'Dernier don'),
    noDonations: localCopy('لا توجد تبرعات بعد', 'No donations yet', 'Aucun don pour le moment'),
    noDonationsBody: localCopy('ابدأ من مشروع موثوق وسيظهر سجل التبرع والإيصال هنا.', 'Support a trusted project and its donation record and receipt will appear here.', 'Soutenez un projet fiable ; le don et son reçu apparaîtront ici.'),
    receiptAvailable: localCopy('إيصال متاح', 'Receipt available', 'Reçu disponible'),
    noReceipt: localCopy('لا يوجد إيصال مرتبط', 'No linked receipt', 'Aucun reçu associé'),
    openReceipt: localCopy('فتح الإيصال', 'Open receipt', 'Ouvrir le reçu'),
    recordedStatus: localCopy('مسجل', 'Recorded', 'Enregistré'),
    renewalPriority: localCopy('أولوية التجديد', 'Renewal priority', 'Priorité de renouvellement'),
    priorityOverdue: localCopy('متأخر', 'Overdue', 'En retard'),
    priorityHigh: localCopy('عالية', 'High', 'Élevée'),
    priorityMedium: localCopy('متوسطة', 'Medium', 'Moyenne'),
    priorityRoutine: localCopy('اعتيادية', 'Routine', 'Normale'),
    priorityUnknown: localCopy('غير محددة', 'Not determined', 'Non déterminée'),
    beneficiaryVerification: localCopy('التحقق من المستفيد', 'Beneficiary verification', 'Vérification du bénéficiaire'),
    verificationNotRecorded: localCopy('لا توجد نتيجة تحقق مسجلة', 'No verification result recorded', 'Aucun résultat de vérification enregistré'),
    projectDocuments: localCopy('مستندات المشروع', 'Project documents', 'Documents du projet'),
    projectSupportHistory: localCopy('سجل دعم المشروع', 'Project support history', 'Historique de soutien du projet'),
    noProjectSupportHistory: localCopy('لا يوجد دعم مسجل لهذا المشروع', 'No support recorded for this project', 'Aucun soutien enregistré pour ce projet'),
    loading: localCopy('جارٍ تحميل بيانات الأعمال الخيرية…', 'Loading charity records…', 'Chargement des données caritatives…'),
    zakatProjectScope: localCopy('تعرض هذه الصفحة مشاريع الزكاة المؤهلة فقط. تبقى أحكام الزكاة وحسابها في مسار الزكاة المستقل.', 'This view shows eligible Zakat projects only. Zakat rules and calculations remain in the independent Zakat workflow.', 'Cette vue affiche uniquement les projets éligibles à la zakat. Les règles et calculs restent dans le parcours Zakat indépendant.'),
    openZakatWorkflow: localCopy('فتح مسار الزكاة', 'Open Zakat workflow', 'Ouvrir le parcours Zakat'),
    supportRecords: localCopy('سجلات الدعم', 'Support records', 'Soutiens enregistrés'),
    lastSupport: localCopy('آخر دعم', 'Last support', 'Dernier soutien'),
    projectLevelScope: localCopy('بيانات على مستوى المشروع، وليست تحققاً فردياً.', 'Project-level data; not individual verification.', 'Données au niveau du projet, sans vérification individuelle.'),
    reportsLedger: localCopy('سجل التقارير والإيصالات', 'Reports and receipts register', 'Registre des rapports et reçus'),
    reportAmount: localCopy('المبلغ', 'Amount', 'Montant'),
    reportCategory: localCopy('الفئة', 'Category', 'Catégorie'),
    reportCalculation: localCopy('الحساب', 'Calculation', 'Calcul'),
    reportPayment: localCopy('الدفع', 'Payment', 'Paiement'),
    reportReceipt: localCopy('الإيصال', 'Receipt', 'Reçu'),
    reportPdf: localCopy('ملف PDF', 'PDF', 'PDF'),
    reportStatus: localCopy('الحالة', 'Status', 'Statut'),
    charityReport: localCopy('تقرير الصدقة', 'Charity report', 'Rapport caritatif'),
    separateWorkflow: localCopy('يُدار في مساره الديني المستقل', 'Managed in its independent religious workflow', 'Géré dans son parcours religieux indépendant'),
    openZakatReport: localCopy('فتح تقارير الزكاة', 'Open Zakat reports', 'Ouvrir les rapports de zakat'),
    openKhumsReport: localCopy('فتح تقارير الخمس', 'Open Khums reports', 'Ouvrir les rapports du khums'),
    khumsLabel: localCopy('الخمس', 'Khums', 'Khums'),
    readyStatus: localCopy('جاهز', 'Ready', 'Prêt'),
    needsDataStatus: localCopy('بانتظار البيانات', 'Needs data', 'Données requises'),
    notApplicable: localCopy('لا ينطبق', 'Not applicable', 'Sans objet'),
    recordedPayment: localCopy('دفعات مسجلة', 'Recorded payments', 'Paiements enregistrés'),
    aggregateCurrencyNote: localCopy('تعرض الإجماليات المالية المجمعة سجلات الدينار الكويتي فقط؛ وتبقى العملة الأصلية ظاهرة في كل سجل تفصيلي.', 'Aggregated financial totals include KWD records only; each detail record keeps its original currency.', 'Les totaux financiers agrégés incluent uniquement les écritures en KWD ; chaque ligne détaillée conserve sa devise d’origine.'),
  };
  const tr = { ...baseTr, ...phaseCopy };
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const unavailableLabel = tr.unavailable ?? (lang === 'fr' ? 'Indisponible' : lang === 'en' ? 'Unavailable' : 'غير متاح');
  const zakatShortcut = {
    ar: {
      title: 'إدارة الزكاة',
      description: 'انتقل إلى صفحة الزكاة لحساب النصاب، وتتبع الحول، وحفظ حسابات الزكاة.',
      button: 'فتح صفحة الزكاة',
    },
    en: {
      title: 'Manage Zakat',
      description: 'Open the Zakat page to calculate nisab, track hawl, and save zakat calculations.',
      button: 'Open Zakat Page',
    },
    fr: {
      title: 'Gérer la zakat',
      description: 'Ouvrez la page Zakat pour calculer le nisab, suivre le hawl et enregistrer les calculs de zakat.',
      button: 'Ouvrir la page Zakat',
    },
  }[lang as Lang] ?? {
    title: 'إدارة الزكاة',
    description: 'انتقل إلى صفحة الزكاة لحساب النصاب، وتتبع الحول، وحفظ حسابات الزكاة.',
    button: 'فتح صفحة الزكاة',
  };
  const db = supabase as any;

  const [projects, setProjects] = useState<CharityProject[]>([]);
  const [assets, setAssets] = useState<ZakatAsset[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [donations, setDonations] = useState<ProjectDonation[]>([]);
  const [documents, setDocuments] = useState<CharityDocument[]>([]);
  const [reminders, setReminders] = useState<CharityReminder[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<CharityBeneficiary[]>([]);
  const [contributors, setContributors] = useState<CharityContributor[]>([]);
  const [organizations, setOrganizations] = useState<CharityOrganization[]>([]);
  const [impactMetrics, setImpactMetrics] = useState<CharityImpactMetric[]>([]);
  const [incomeThisYear, setIncomeThisYear] = useState(0);
  const [incomeThisMonth, setIncomeThisMonth] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [projectScope] = useUrlTabState<(typeof CHARITY_PROJECT_SCOPES)[number]>({
    param: 'scope',
    values: CHARITY_PROJECT_SCOPES,
    defaultValue: 'charity',
    omitDefault: true,
  });
  const [activeTab, setActiveTab] = useUrlTabState<CharityProjectsTab>({
    param: 'tab',
    values: CHARITY_PROJECTS_TABS,
    defaultValue: 'overview',
    omitDefault: true,
    legacyHash: true,
    legacyValueResolver: value => {
      if (value === '#beneficiary-tracking') return 'beneficiaries';
      if (value === '#charity-reports') return 'reports';
      if (value === '#document-vault') return 'documents';
      if (value === '#impact-dashboard') return 'impact';
      if (value === '#upcoming-reminders') return 'reminders';
      if (value === 'contributors' || value === '#family-collaboration') return 'donations';
      return null;
    },
  });
  const [projectOpen, setProjectOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<CharityReminder | null>(null);
  const [beneficiaryOpen, setBeneficiaryOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<CharityBeneficiary | null>(null);
  const [beneficiaryDetails, setBeneficiaryDetails] = useState<CharityBeneficiary | null>(null);
  const [contributorOpen, setContributorOpen] = useState(false);
  const [editingContributor, setEditingContributor] = useState<CharityContributor | null>(null);
  const [donationProject, setDonationProject] = useState<CharityProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [impactDonation, setImpactDonation] = useState('');
  const [selectedReportYear, setSelectedReportYear] = useState(String(new Date().getFullYear()));
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [projectCategoryFilter, setProjectCategoryFilter] = useState<'all' | ProjectCategory>('all');
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentFilter, setDocumentFilter] = useState<'all' | DocumentCategory>('all');
  const [documentProjectFilter, setDocumentProjectFilter] = useState('');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [beneficiaryProjectFilter, setBeneficiaryProjectFilter] = useState('');
  const [beneficiaryStatusFilter, setBeneficiaryStatusFilter] = useState<'all' | BeneficiaryStatus>('all');
  const [beneficiaryCategoryFilter, setBeneficiaryCategoryFilter] = useState<'all' | BeneficiaryCategory>('all');
  const [contributorProjectFilter, setContributorProjectFilter] = useState('');
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [organizationTypeFilter, setOrganizationTypeFilter] = useState<'all' | OrganizationType>('all');
  const [organizationVerificationFilter, setOrganizationVerificationFilter] = useState<'all' | VerificationStatus>('all');
  const [manualOrganization, setManualOrganization] = useState(false);
  const [impactMetricForm, setImpactMetricForm] = useState({ project_id: '', metric_name: '', metric_value: '', metric_unit: '', notes: '' });
  const [projectForm, setProjectForm] = useState({
    name: '',
    category: 'ongoing' as ProjectCategory,
    status: 'planning' as ProjectStatus,
    target_amount: '',
    collected_amount: '',
    currency: 'KWD',
    start_date: today(),
    end_date: '',
    organization_id: '',
    organization_name: '',
    notes: '',
  });
  const [donationAmount, setDonationAmount] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    category: 'donation_receipt' as DocumentCategory,
    project_id: '',
    donation_id: '',
    zakat_asset_id: '',
    commitment_id: '',
    notes: '',
  });
  const [reminderForm, setReminderForm] = useState({
    title: '',
    reminder_type: 'general' as ReminderType,
    due_date: today(),
    remind_before_days: '30',
    priority: 'normal' as ReminderPriority,
    related_project_id: '',
    related_zakat_asset_id: '',
    related_commitment_id: '',
    notes: '',
  });
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    project_id: '',
    reference_code: '',
    display_name: '',
    category: 'other' as BeneficiaryCategory,
    organization_name: '',
    country: '',
    city: '',
    monthly_support_amount: '',
    currency: 'KWD',
    sponsorship_start_date: '',
    sponsorship_end_date: '',
    next_renewal_date: '',
    status: 'active' as BeneficiaryStatus,
    notes: '',
  });
  const [contributorForm, setContributorForm] = useState({
    project_id: '',
    contributor_name: '',
    contributor_email: '',
    role: 'contributor' as ContributorRole,
    pledged_amount: '',
    paid_amount: '',
    currency: 'KWD',
    payment_status: 'pending' as PaymentStatus,
    due_date: '',
    notes: '',
  });

  const money = useCallback((amount: number, currency = 'KWD') => formatMoney(amount, currency, lang as Lang), [lang]);
  const safeMoney = useCallback((amount: number | null | undefined, currency = 'KWD') => (
    typeof amount === 'number' && Number.isFinite(amount) ? formatMoney(amount, currency, lang as Lang) : unavailableLabel
  ), [lang, unavailableLabel]);
  const numberLabel = useCallback((value: number) => value.toLocaleString(locale), [locale]);
  const dateLabel = useCallback((date?: string | null) => {
    if (!date) return '-';
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
    if (!Number.isFinite(parsed.getTime())) return '-';
    return parsed.toLocaleDateString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US');
  }, [lang]);

  const syncGeneratedReminders = useCallback(async (
    currentReminders: CharityReminder[],
    currentProjects: CharityProject[],
    currentCommitments: Commitment[],
  ) => {
    if (!user) return;
    const exists = new Set(currentReminders.map(reminder => [
      reminder.reminder_type,
      reminder.related_project_id ?? '',
      reminder.related_zakat_asset_id ?? '',
      reminder.related_commitment_id ?? '',
      reminder.due_date,
    ].join('|')));

    const generated: any[] = [];
    currentCommitments.filter(commitment => isVoluntaryCharityRecord(commitment.category)).forEach(commitment => {
      if (!commitment.next_due_date || commitment.status !== 'active') return;
      const type = commitment.category === 'sponsorship' ? 'sponsorship' : 'general';
      const key = [type, '', '', commitment.id, commitment.next_due_date].join('|');
      if (!exists.has(key)) generated.push({
        user_id: user.id,
        title: `${tr.commitments}: ${commitment.name}`,
        reminder_type: type,
        related_commitment_id: commitment.id,
        due_date: commitment.next_due_date,
        hijri_date: estimatedHijriDate(commitment.next_due_date, lang as Lang) || null,
        remind_before_days: 7,
        priority: type === 'sponsorship' ? 'high' : 'normal',
      });
    });
    currentProjects.filter(project => isVoluntaryCharityRecord(project.category)).forEach(project => {
      if (!project.end_date || ['completed', 'paused'].includes(project.status)) return;
      const key = ['project_milestone', project.id, '', '', project.end_date].join('|');
      if (!exists.has(key)) generated.push({
        user_id: user.id,
        title: `${tr.endDate}: ${project.name}`,
        reminder_type: 'project_milestone',
        related_project_id: project.id,
        due_date: project.end_date,
        hijri_date: estimatedHijriDate(project.end_date, lang as Lang) || null,
        remind_before_days: 14,
        priority: 'normal',
      });
    });

    if (generated.length > 0) {
      await db.from('charity_reminders').insert(generated);
    }
  }, [db, lang, tr.commitments, tr.endDate, user]);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [projectRes, assetRes, commitmentRes, donationRes, documentRes, reminderRes, beneficiaryRes, contributorRes, organizationRes, impactMetricRes, legacyRes, incomeRes, expenseRes] = await Promise.all([
        db.from('charity_projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('zakat_assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('charity_commitments').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        db.from('charity_project_donations').select('*').eq('user_id', user.id).order('donation_date', { ascending: false }),
        db.from('charity_documents').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false }),
        db.from('charity_reminders').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
        db.from('charity_beneficiaries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('charity_project_contributors').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('charity_organizations').select('*').eq('is_active', true).order('name_ar', { ascending: true }),
        db.from('charity_project_impact_metrics').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('expense_items').select('id,name,amount,created_at').eq('user_id', user.id).like('name', 'خيرية:%'),
        db.from('monthly_income_sources').select('*').eq('user_id', user.id),
        db.from('expense_items').select('*').eq('user_id', user.id),
      ]);
      const loadedProjects = !projectRes.error ? (projectRes.data ?? []) as CharityProject[] : [];
      const loadedAssets = !assetRes.error ? (assetRes.data ?? []) as ZakatAsset[] : [];
      const loadedCommitments = !commitmentRes.error ? (commitmentRes.data ?? []) as Commitment[] : [];
      const loadedReminders = !reminderRes.error ? (reminderRes.data ?? []) as CharityReminder[] : [];
      if (!projectRes.error) setProjects(loadedProjects);
      if (!assetRes.error) setAssets(loadedAssets);
      if (!commitmentRes.error) setCommitments(loadedCommitments);
      const legacyDonations = legacyRes.error ? [] : (legacyRes.data ?? []).reduce((items: ProjectDonation[], row: any) => {
        const encodedMonth = encodedLegacyMonth(row.name);
        if (!encodedMonth) return items;
        items.push({
          id: row.id,
          project_id: null,
          amount: toNum(row.amount),
          currency: 'KWD',
          donation_date: `${encodedMonth}-01`,
          donation_type: 'charity',
          notes: row.name || null,
          created_at: row.created_at,
        });
        return items;
      }, []);
      if (!donationRes.error) setDonations([...(donationRes.data ?? []) as ProjectDonation[], ...legacyDonations]);
      if (!documentRes.error) setDocuments((documentRes.data ?? []) as CharityDocument[]);
      if (!beneficiaryRes.error) setBeneficiaries((beneficiaryRes.data ?? []) as CharityBeneficiary[]);
      if (!contributorRes.error) setContributors((contributorRes.data ?? []) as CharityContributor[]);
      if (!organizationRes.error) setOrganizations((organizationRes.data ?? []) as CharityOrganization[]);
      if (!impactMetricRes.error) setImpactMetrics((impactMetricRes.data ?? []) as CharityImpactMetric[]);
      if (!reminderRes.error) {
        setReminders(loadedReminders);
        await syncGeneratedReminders(loadedReminders, loadedProjects, loadedCommitments);
        const refreshed = await db.from('charity_reminders').select('*').eq('user_id', user.id).order('due_date', { ascending: true });
        if (!refreshed.error) setReminders((refreshed.data ?? []) as CharityReminder[]);
      }
      if (!incomeRes.error) {
        const rows = personalIncomeRows(incomeRes.data ?? []).filter((row: any) => isAggregateCurrency(row.currency));
        const currentYear = new Date().getFullYear();
        setIncomeTotal(rows.reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
        setIncomeThisYear(rows.filter((row: any) => isYear(recordDate(row), currentYear)).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
        setIncomeThisMonth(rows.filter((row: any) => isCurrentMonth(recordDate(row))).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
      }
      if (!expenseRes.error) setExpenseTotal(personalExpenseRows(expenseRes.data ?? []).filter((row: any) => isAggregateCurrency(row.currency)).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
    } catch {
      setMessage(tr.error);
    } finally {
      setLoading(false);
    }
  }, [db, syncGeneratedReminders, tr.error, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProjectOpen(false);
        setDocumentOpen(false);
        setReminderOpen(false);
        setBeneficiaryOpen(false);
        setBeneficiaryDetails(null);
        setContributorOpen(false);
        setDonationProject(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tValue = (key: string, fallback = key) => (tr as Record<string, string>)[key] ?? fallback;
  const reminderTypeLabel = (type: ReminderType) => type === 'general' ? tr.other : tValue(type, tr.other);
  const organizationName = (organization?: CharityOrganization | null) => {
    if (!organization) return '';
    if (lang === 'ar') return organization.name_ar;
    if (lang === 'fr') return organization.name_fr || organization.name_en || organization.name_ar;
    return organization.name_en || organization.name_ar;
  };
  const organizationById = useMemo(() => organizations.reduce<Record<string, CharityOrganization>>((acc, organization) => {
    acc[organization.id] = organization;
    return acc;
  }, {}), [organizations]);
  const organizationLabel = (id?: string | null, fallback?: string | null) => organizationName(id ? organizationById[id] : null) || fallback || '-';
  const verificationLabel = (status?: string | null) => {
    if (status === 'verified') return tr.verified;
    if (status === 'pending_review') return tr.pendingReview;
    if (status === 'rejected') return tr.rejected;
    return tr.unverified;
  };
  const selectedOrganization = projectForm.organization_id ? organizationById[projectForm.organization_id] : null;
  const charityImpactProjects = useMemo(() => projects.filter(project => projectScope === 'zakat'
    ? isZakatRecord(project.category)
    : isVoluntaryCharityRecord(project.category)), [projectScope, projects]);
  const scopedProjectIds = useMemo(() => new Set(charityImpactProjects.map(project => project.id)), [charityImpactProjects]);
  const voluntaryProjects = useMemo(() => projects.filter(project => isVoluntaryCharityRecord(project.category)), [projects]);
  const voluntaryProjectIds = useMemo(() => new Set(voluntaryProjects.map(project => project.id)), [voluntaryProjects]);
  const religiousProjectIds = useMemo(() => new Set(projects
    .filter(project => isZakatRecord(project.category) || isKhumsRecord(project.category))
    .map(project => project.id)), [projects]);
  const charityDonations = useMemo(() => donations.filter(donation => {
    if (projectScope === 'zakat') {
      if (isKhumsRecord(donation.donation_type)) return false;
      return donation.project_id ? scopedProjectIds.has(donation.project_id) : isZakatRecord(donation.donation_type);
    }
    return isVoluntaryCharityRecord(donation.donation_type)
      && (!donation.project_id || (scopedProjectIds.has(donation.project_id) && !religiousProjectIds.has(donation.project_id)));
  }), [donations, projectScope, religiousProjectIds, scopedProjectIds]);
  const charityCommitments = useMemo(() => commitments.filter(commitment => projectScope === 'zakat'
    ? isZakatRecord(commitment.category)
    : isVoluntaryCharityRecord(commitment.category)), [commitments, projectScope]);
  const charityBeneficiaries = useMemo(() => beneficiaries.filter(beneficiary => projectScope === 'zakat'
    ? Boolean(beneficiary.project_id && scopedProjectIds.has(beneficiary.project_id))
    : !beneficiary.project_id || scopedProjectIds.has(beneficiary.project_id)), [beneficiaries, projectScope, scopedProjectIds]);
  const charityContributors = useMemo(() => contributors.filter(contributor => scopedProjectIds.has(contributor.project_id)), [contributors, scopedProjectIds]);
  const charityImpactRecords = useMemo(() => impactMetrics.filter(metric => scopedProjectIds.has(metric.project_id)), [impactMetrics, scopedProjectIds]);
  const voluntaryDonations = useMemo(() => donations.filter(donation => isVoluntaryCharityRecord(donation.donation_type)
    && (!donation.project_id || voluntaryProjectIds.has(donation.project_id))), [donations, voluntaryProjectIds]);
  const voluntaryCommitments = useMemo(() => commitments.filter(commitment => isVoluntaryCharityRecord(commitment.category)), [commitments]);
  const scopedDonationIds = useMemo(() => new Set(charityDonations.map(donation => donation.id)), [charityDonations]);
  const scopedCommitmentIds = useMemo(() => new Set(charityCommitments.map(commitment => commitment.id)), [charityCommitments]);
  const voluntaryDonationIds = useMemo(() => new Set(voluntaryDonations.map(donation => donation.id)), [voluntaryDonations]);
  const voluntaryCommitmentIds = useMemo(() => new Set(voluntaryCommitments.map(commitment => commitment.id)), [voluntaryCommitments]);
  const charityDocuments = useMemo(() => documents.filter(document => {
    if (projectScope === 'zakat') {
      if (document.category === 'zakat_document' || document.zakat_asset_id) return true;
      if (document.project_id) return scopedProjectIds.has(document.project_id);
      if (document.donation_id) return scopedDonationIds.has(document.donation_id);
      if (document.commitment_id) return scopedCommitmentIds.has(document.commitment_id);
      return false;
    }
    if (document.category === 'zakat_document' || document.zakat_asset_id) return false;
    if (document.project_id && !scopedProjectIds.has(document.project_id)) return false;
    if (document.donation_id && !scopedDonationIds.has(document.donation_id)) return false;
    if (document.commitment_id && !scopedCommitmentIds.has(document.commitment_id)) return false;
    return true;
  }), [documents, projectScope, scopedCommitmentIds, scopedDonationIds, scopedProjectIds]);
  const voluntaryDocuments = useMemo(() => documents.filter(document => {
    if (document.category === 'zakat_document' || document.zakat_asset_id) return false;
    if (document.project_id && !voluntaryProjectIds.has(document.project_id)) return false;
    if (document.donation_id && !voluntaryDonationIds.has(document.donation_id)) return false;
    if (document.commitment_id && !voluntaryCommitmentIds.has(document.commitment_id)) return false;
    return true;
  }), [documents, voluntaryCommitmentIds, voluntaryDonationIds, voluntaryProjectIds]);
  const aggregateProjects = useMemo(() => charityImpactProjects.filter(project => isAggregateCurrency(project.currency)), [charityImpactProjects]);
  const aggregateDonations = useMemo(() => charityDonations.filter(donation => isAggregateCurrency(donation.currency)), [charityDonations]);
  const aggregateCommitments = useMemo(() => charityCommitments.filter(commitment => isAggregateCurrency(commitment.currency)), [charityCommitments]);
  const aggregateBeneficiaries = useMemo(() => charityBeneficiaries.filter(beneficiary => isAggregateCurrency(beneficiary.currency)), [charityBeneficiaries]);
  const totalDonations = aggregateProjects.reduce((sum, project) => sum + toNum(project.collected_amount), 0);
  const activeProjects = charityImpactProjects.filter(project => !['completed', 'paused'].includes(project.status)).length;
  const currentYear = new Date().getFullYear();
  const completedProjectsCount = charityImpactProjects.filter(project => project.status === 'completed').length;
  const donationsThisYear = aggregateDonations.filter(donation => isYear(donation.donation_date || donation.created_at, currentYear));
  const donationsThisMonth = aggregateDonations.filter(donation => isCurrentMonth(donation.donation_date || donation.created_at));
  const totalDonatedThisYear = donationsThisYear.reduce((sum, donation) => sum + toNum(donation.amount), 0);
  const totalDonatedThisMonth = donationsThisMonth.reduce((sum, donation) => sum + toNum(donation.amount), 0);
  const latestDonation = charityDonations.slice().sort((a, b) => (recordDate(b) || '').localeCompare(recordDate(a) || ''))[0] ?? null;
  const supportedProjectCount = new Set(charityDonations.map(donation => donation.project_id).filter(Boolean)).size;
  const monthlySponsorshipsTotal = aggregateBeneficiaries.filter(beneficiary => beneficiary.status === 'active').reduce((sum, beneficiary) => sum + toNum(beneficiary.monthly_support_amount), 0);
  const givingIncomeRatioYear = incomeThisYear > 0 ? (totalDonatedThisYear / incomeThisYear) * 100 : null;
  const givingIncomeRatioMonth = incomeThisMonth > 0 ? (totalDonatedThisMonth / incomeThisMonth) * 100 : null;
  const hasImpactData = charityImpactProjects.length > 0 || charityDonations.length > 0 || charityBeneficiaries.length > 0 || charityCommitments.length > 0 || charityImpactRecords.length > 0;
  const monthLabels = useMemo(() => Array.from({ length: 12 }, (_, index) => new Date(currentYear, index, 1).toLocaleDateString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' })), [currentYear, lang]);
  const impactByMonth = useMemo(() => monthLabels.map((label, index) => {
    const donationAmount = aggregateDonations.filter(donation => {
      const value = donation.donation_date || donation.created_at;
      if (!isYear(value, currentYear)) return false;
      return new Date(`${value!.slice(0, 10)}T00:00:00`).getMonth() === index;
    }).reduce((sum, donation) => sum + toNum(donation.amount), 0);
    return { label, donationAmount };
  }), [aggregateDonations, currentYear, monthLabels]);
  const maxImpactMonth = Math.max(1, ...impactByMonth.map(item => item.donationAmount));
  const impactByCategory = useMemo(() => categories.filter(category => category !== 'zakat').map(category => {
    const projectCollected = aggregateProjects.filter(project => project.category === category).reduce((sum, project) => sum + toNum(project.collected_amount), 0);
    return { category, amount: projectCollected };
  }).filter(item => item.amount > 0), [aggregateProjects]);
  const maxImpactCategory = Math.max(1, ...impactByCategory.map(item => item.amount));
  const beneficiaryByCategory = beneficiaryCategories.map(category => ({
    category,
    count: charityBeneficiaries.filter(beneficiary => beneficiary.category === category).length,
  })).filter(item => item.count > 0);
  const impactMetricsByProject = useMemo(() => charityImpactRecords.reduce<Record<string, CharityImpactMetric[]>>((acc, metric) => {
    acc[metric.project_id] = [...(acc[metric.project_id] || []), metric];
    return acc;
  }, {}), [charityImpactRecords]);
  const expectedCommitments = aggregateCommitments.reduce((sum, item) => {
    const amount = toNum(item.amount);
    if (item.frequency === 'monthly') return sum + amount * 12;
    if (item.frequency === 'annual') return sum + amount;
    return sum + amount;
  }, 0) + aggregateProjects.filter(project => project.status !== 'completed').reduce((sum, project) => sum + Math.max(0, toNum(project.target_amount) - toNum(project.collected_amount)), 0);
  const reportYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    const add = (value?: string | null) => {
      if (!value) return;
      const year = new Date(`${value.slice(0, 10)}T00:00:00`).getFullYear();
      if (Number.isFinite(year)) years.add(year);
    };
    voluntaryProjects.forEach(project => {
      add(project.start_date);
      add(project.end_date);
    });
    voluntaryCommitments.forEach(commitment => add(commitment.next_due_date));
    voluntaryDonations.forEach(donation => add(donation.donation_date || donation.created_at));
    return Array.from(years).sort((a, b) => b - a);
  }, [voluntaryCommitments, voluntaryDonations, voluntaryProjects]);
  const impactValue = toNum(impactDonation);
  const impactPct = incomeTotal > 0 && impactValue > 0 ? (impactValue / incomeTotal) * 100 : null;
  const remainingNet = incomeTotal - expenseTotal - impactValue;
  const selectedReportDonations = voluntaryDonations.filter(donation => isYear(donation.donation_date || donation.created_at, Number(selectedReportYear)));
  const selectedReportAmount = selectedReportDonations.filter(donation => isAggregateCurrency(donation.currency)).reduce((sum, donation) => sum + toNum(donation.amount), 0);
  const selectedReportProjects = voluntaryProjects.filter(project => {
    const yearStart = `${selectedReportYear}-01-01`;
    const yearEnd = `${selectedReportYear}-12-31`;
    return (!project.start_date || project.start_date <= yearEnd) && (!project.end_date || project.end_date >= yearStart);
  });
  const selectedReportCommitments = voluntaryCommitments.filter(commitment => commitment.next_due_date
    ? isYear(commitment.next_due_date, Number(selectedReportYear))
    : Number(selectedReportYear) === currentYear);
  const selectedYearHasReportData = selectedReportDonations.length > 0 || selectedReportProjects.length > 0 || selectedReportCommitments.length > 0;
  const selectedReportReceipts = voluntaryDocuments.filter(document => document.category === 'donation_receipt' && selectedReportDonations.some(donation => donation.id === document.donation_id));
  const filteredProjects = charityImpactProjects.filter(project => {
    const query = projectSearch.trim().toLowerCase();
    const matchesSearch = !query || [
      project.name,
      project.organization_name ?? '',
      organizationLabel(project.organization_id, project.organization_name),
      project.notes ?? '',
    ].some(value => value.toLowerCase().includes(query));
    const matchesStatus = projectStatusFilter === 'all' || project.status === projectStatusFilter;
    const matchesCategory = projectCategoryFilter === 'all' || project.category === projectCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const filteredDocuments = charityDocuments.filter(document => {
    const query = documentSearch.trim().toLowerCase();
    const matchesSearch = !query || [document.title, document.file_name, document.notes ?? ''].some(value => value.toLowerCase().includes(query));
    const matchesFilter = documentFilter === 'all' || document.category === documentFilter;
    const matchesProject = !documentProjectFilter || document.project_id === documentProjectFilter;
    return matchesSearch && matchesFilter && matchesProject;
  });
  const projectDocumentCounts = useMemo(() => charityDocuments.reduce<Record<string, number>>((acc, document) => {
    if (document.project_id) acc[document.project_id] = (acc[document.project_id] || 0) + 1;
    return acc;
  }, {}), [charityDocuments]);
  const projectBeneficiaryCounts = useMemo(() => charityBeneficiaries.reduce<Record<string, number>>((acc, beneficiary) => {
    if (beneficiary.project_id) acc[beneficiary.project_id] = (acc[beneficiary.project_id] || 0) + 1;
    return acc;
  }, {}), [charityBeneficiaries]);
  const filteredBeneficiaries = charityBeneficiaries.filter(beneficiary => {
    const query = beneficiarySearch.trim().toLowerCase();
    const matchesSearch = !query || [beneficiary.display_name, beneficiary.reference_code ?? '', beneficiary.organization_name ?? '', beneficiary.country ?? ''].some(value => value.toLowerCase().includes(query));
    const matchesStatus = beneficiaryStatusFilter === 'all' || beneficiary.status === beneficiaryStatusFilter;
    const matchesCategory = beneficiaryCategoryFilter === 'all' || beneficiary.category === beneficiaryCategoryFilter;
    const matchesProject = !beneficiaryProjectFilter || beneficiary.project_id === beneficiaryProjectFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesProject;
  });
  const filteredOrganizations = organizations.filter(organization => {
    const query = organizationSearch.trim().toLowerCase();
    const localizedName = organizationName(organization).toLowerCase();
    const matchesSearch = !query || [
      localizedName,
      organization.name_ar,
      organization.name_en ?? '',
      organization.name_fr ?? '',
      organization.license_number ?? '',
      organization.country ?? '',
      organization.city ?? '',
    ].some(value => value.toLowerCase().includes(query));
    const matchesType = organizationTypeFilter === 'all' || organization.organization_type === organizationTypeFilter;
    const matchesVerification = organizationVerificationFilter === 'all' || organization.verification_status === organizationVerificationFilter;
    return matchesSearch && matchesType && matchesVerification;
  });
  const organizationProjectCounts = useMemo(() => charityImpactProjects.reduce<Record<string, number>>((acc, project) => {
    if (project.organization_id) acc[project.organization_id] = (acc[project.organization_id] || 0) + 1;
    return acc;
  }, {}), [charityImpactProjects]);
  const activeBeneficiaries = charityBeneficiaries.filter(beneficiary => beneficiary.status === 'active');
  const monthlySupportTotal = activeBeneficiaries.filter(beneficiary => isAggregateCurrency(beneficiary.currency)).reduce((sum, beneficiary) => sum + toNum(beneficiary.monthly_support_amount), 0);
  const upcomingRenewals = charityBeneficiaries.filter(beneficiary => beneficiary.next_renewal_date && daysUntil(beneficiary.next_renewal_date) <= 45 && daysUntil(beneficiary.next_renewal_date) >= 0);
  const projectContributorCounts = useMemo(() => charityContributors.reduce<Record<string, number>>((acc, contributor) => {
    acc[contributor.project_id] = (acc[contributor.project_id] || 0) + 1;
    return acc;
  }, {}), [charityContributors]);
  const filteredContributors = contributorProjectFilter ? charityContributors.filter(contributor => contributor.project_id === contributorProjectFilter) : charityContributors;
  const selectedContributorProject = contributorProjectFilter
    ? charityImpactProjects.find(project => project.id === contributorProjectFilter) ?? null
    : null;
  const contributorSummaryCurrency = selectedContributorProject
    ? normalizedCurrency(selectedContributorProject.currency)
    : CHARITY_AGGREGATE_CURRENCY;
  const comparableContributors = filteredContributors.filter(contributor => selectedContributorProject
    ? hasSameExplicitCurrency(contributor.currency, selectedContributorProject.currency)
    : normalizedCurrency(contributor.currency) === CHARITY_AGGREGATE_CURRENCY);
  const totalPledged = comparableContributors.reduce((sum, contributor) => sum + toNum(contributor.pledged_amount), 0);
  const totalPaid = comparableContributors.reduce((sum, contributor) => sum + toNum(contributor.paid_amount), 0);
  const hasComparableContributorData = Boolean(contributorSummaryCurrency && comparableContributors.length > 0);
  const lateContributors = filteredContributors.filter(contributor => contributor.due_date && daysUntil(contributor.due_date) < 0 && ['pending', 'partial'].includes(contributor.payment_status));
  const topContributor = comparableContributors.slice().sort((a, b) => toNum(b.paid_amount) - toNum(a.paid_amount))[0] ?? null;
  const activeReminders = reminders
    .filter(reminder => reminder.status === 'active' && reminder.reminder_type !== 'zakat' && reminder.reminder_type !== 'hawl')
    .filter(reminder => !reminder.related_project_id || voluntaryProjectIds.has(reminder.related_project_id))
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const urgentReminders = activeReminders.filter(reminder => daysUntil(reminder.due_date) <= reminder.remind_before_days).slice(0, 3);
  const nextReminder = activeReminders[0] ?? null;
  const nextCharityDueDate = nextReminder?.due_date ?? null;
  const calendarCards = [
    {
      icon: CalendarDays,
      title: tr.nextCharityReminder,
      value: nextReminder ? dateLabel(nextReminder.due_date) : unavailableLabel,
      description: nextReminder ? nextReminder.title : tr.noReminderScheduled,
    },
    {
      icon: CalendarDays,
      title: tr.ramadanPlanning,
      value: tr.ramadan,
      description: tr.ramadanPlanningDesc,
    },
    {
      icon: Sparkles,
      title: tr.lastTenNights,
      value: tr.lastTenNights,
      description: tr.lastTenNightsDesc,
    },
    {
      icon: Gift,
      title: tr.eidAdha,
      value: tr.sacrifice,
      description: tr.eidAdhaDesc,
    },
    {
      icon: HandCoins,
      title: tr.monthlyCharity,
      value: tr.monthly,
      description: tr.monthlyCharityDesc,
    },
    {
      icon: HeartHandshake,
      title: tr.charityReminders,
      value: activeReminders.length > 0 ? numberLabel(activeReminders.length) : unavailableLabel,
      description: activeReminders.length > 0 ? tr.upcomingReminders : tr.reminderEmptyBody,
    },
  ];

  const resetProjectForm = () => {
    setProjectForm({ name: '', category: projectScope === 'zakat' ? 'zakat' : 'ongoing', status: 'planning', target_amount: '', collected_amount: '', currency: 'KWD', start_date: today(), end_date: '', organization_id: '', organization_name: '', notes: '' });
    setManualOrganization(false);
  };

  const resetReminderForm = () => {
    setEditingReminder(null);
    setReminderForm({ title: '', reminder_type: 'general', due_date: today(), remind_before_days: '30', priority: 'normal', related_project_id: '', related_zakat_asset_id: '', related_commitment_id: '', notes: '' });
  };

  const resetBeneficiaryForm = () => {
    setEditingBeneficiary(null);
    setBeneficiaryForm({ project_id: '', reference_code: '', display_name: '', category: 'other', organization_name: '', country: '', city: '', monthly_support_amount: '', currency: 'KWD', sponsorship_start_date: '', sponsorship_end_date: '', next_renewal_date: '', status: 'active', notes: '' });
  };

  const openBeneficiaryEditor = (beneficiary: CharityBeneficiary) => {
    setEditingBeneficiary(beneficiary);
    setBeneficiaryForm({
      project_id: beneficiary.project_id ?? '',
      reference_code: beneficiary.reference_code ?? '',
      display_name: beneficiary.display_name,
      category: beneficiary.category,
      organization_name: beneficiary.organization_name ?? '',
      country: beneficiary.country ?? '',
      city: beneficiary.city ?? '',
      monthly_support_amount: String(beneficiary.monthly_support_amount ?? ''),
      currency: beneficiary.currency || 'KWD',
      sponsorship_start_date: beneficiary.sponsorship_start_date ?? '',
      sponsorship_end_date: beneficiary.sponsorship_end_date ?? '',
      next_renewal_date: beneficiary.next_renewal_date ?? '',
      status: beneficiary.status,
      notes: beneficiary.notes ?? '',
    });
    setBeneficiaryOpen(true);
  };

  const resetContributorForm = (projectId = '') => {
    setEditingContributor(null);
    setContributorForm({ project_id: projectId, contributor_name: '', contributor_email: '', role: 'contributor', pledged_amount: '', paid_amount: '', currency: 'KWD', payment_status: 'pending', due_date: '', notes: '' });
  };

  const openContributorEditor = (contributor: CharityContributor) => {
    setEditingContributor(contributor);
    setContributorForm({
      project_id: contributor.project_id,
      contributor_name: contributor.contributor_name,
      contributor_email: contributor.contributor_email ?? '',
      role: contributor.role,
      pledged_amount: String(contributor.pledged_amount ?? ''),
      paid_amount: String(contributor.paid_amount ?? ''),
      currency: contributor.currency || 'KWD',
      payment_status: contributor.payment_status,
      due_date: contributor.due_date ?? '',
      notes: contributor.notes ?? '',
    });
    setContributorOpen(true);
  };

  const openReminderEditor = (reminder: CharityReminder) => {
    setEditingReminder(reminder);
    setReminderForm({
      title: reminder.title,
      reminder_type: reminder.reminder_type,
      due_date: reminder.due_date,
      remind_before_days: String(reminder.remind_before_days),
      priority: reminder.priority,
      related_project_id: reminder.related_project_id ?? '',
      related_zakat_asset_id: reminder.related_zakat_asset_id ?? '',
      related_commitment_id: reminder.related_commitment_id ?? '',
      notes: reminder.notes ?? '',
    });
    setReminderOpen(true);
  };

  const reminderTimingLabel = (reminder: CharityReminder) => {
    const days = daysUntil(reminder.due_date);
    if (days === 0) return tr.dueToday;
    if (days < 0) return tr.overdue.replace('{days}', String(Math.abs(days)));
    return tr.daysRemaining.replace('{days}', String(days));
  };

  const openTemplate = (template: typeof templates[number]) => {
    const end = template.months > 0 ? new Date() : null;
    if (end) end.setMonth(end.getMonth() + template.months);
    setProjectForm({
      name: template[lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en'],
      category: template.category,
      status: 'planning',
      target_amount: String(template.amount),
      collected_amount: '',
      currency: 'KWD',
      start_date: today(),
      end_date: end ? end.toISOString().slice(0, 10) : '',
      organization_id: '',
      organization_name: '',
      notes: '',
    });
    setProjectOpen(true);
  };

  const saveProject = async () => {
    if (!user || !projectForm.name.trim()) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      ...projectForm,
      category: projectScope === 'zakat' ? 'zakat' : (isVoluntaryCharityRecord(projectForm.category) ? projectForm.category : 'ongoing'),
      target_amount: toNum(projectForm.target_amount),
      collected_amount: toNum(projectForm.collected_amount),
      end_date: projectForm.end_date || null,
      organization_id: projectForm.organization_id || null,
      organization_name: manualOrganization ? projectForm.organization_name || null : organizationLabel(projectForm.organization_id, projectForm.organization_name),
      notes: projectForm.notes || null,
    };
    const { error } = await db.from('charity_projects').insert(payload);
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.saved);
    setProjectOpen(false);
    resetProjectForm();
    loadData();
  };

  const saveImpactMetric = async () => {
    if (!user || !impactMetricForm.project_id || !scopedProjectIds.has(impactMetricForm.project_id) || !impactMetricForm.metric_name.trim()) return;
    const { error } = await db.from('charity_project_impact_metrics').insert({
      user_id: user.id,
      project_id: impactMetricForm.project_id,
      metric_name: impactMetricForm.metric_name.trim(),
      metric_value: Math.max(0, toNum(impactMetricForm.metric_value)),
      metric_unit: impactMetricForm.metric_unit || null,
      notes: impactMetricForm.notes || null,
    });
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.metricSaved);
    setImpactMetricForm({ project_id: '', metric_name: '', metric_value: '', metric_unit: '', notes: '' });
    loadData();
  };

  const saveDonation = async () => {
    if (!user || !donationProject || toNum(donationAmount) <= 0) return;
    setSaving(true);
    const amount = toNum(donationAmount);
    try {
      const { data: insertedDonation, error: insertError } = await db.from('charity_project_donations').insert({
        user_id: user.id,
        project_id: donationProject.id,
        organization_id: donationProject.organization_id || null,
        amount,
        currency: donationProject.currency,
        donation_date: today(),
        donation_type: donationProject.category,
      }).select('id').single();
      if (insertError || !insertedDonation?.id) {
        setMessage(tr.error);
        return;
      }

      const { error: projectUpdateError } = await db.from('charity_projects')
        .update({ collected_amount: toNum(donationProject.collected_amount) + amount })
        .eq('id', donationProject.id)
        .eq('user_id', user.id);
      if (projectUpdateError) {
        await db.from('charity_project_donations')
          .delete()
          .eq('id', insertedDonation.id)
          .eq('user_id', user.id);
        setMessage(tr.error);
        await loadData();
        return;
      }

      setMessage(tr.saved);
      setDonationProject(null);
      setDonationAmount('');
      await loadData();
    } catch {
      setMessage(tr.error);
    } finally {
      setSaving(false);
    }
  };

  const archiveProject = async (project: CharityProject) => {
    if (!user) return;
    const { error } = await db.from('charity_projects').update({ status: 'paused' }).eq('id', project.id).eq('user_id', user.id);
    if (error) setMessage(tr.error);
    else loadData();
  };

  const resetDocumentForm = () => {
    setDocumentForm({ title: '', category: 'donation_receipt', project_id: '', donation_id: '', zakat_asset_id: '', commitment_id: '', notes: '' });
    setDocumentFile(null);
  };

  const uploadDocument = async () => {
    if (!user) return;
    if (!documentForm.title.trim() || !documentFile) {
      setMessage(tr.uploadFailed);
      return;
    }
    const hasOutOfScopeLink = (documentForm.project_id && !scopedProjectIds.has(documentForm.project_id))
      || (documentForm.donation_id && !scopedDonationIds.has(documentForm.donation_id))
      || (documentForm.commitment_id && !scopedCommitmentIds.has(documentForm.commitment_id))
      || (projectScope === 'charity' && (documentForm.category === 'zakat_document' || Boolean(documentForm.zakat_asset_id)));
    if (hasOutOfScopeLink) {
      setMessage(tr.uploadFailed);
      return;
    }
    if (!allowedDocumentTypes.includes(documentFile.type)) {
      setMessage(tr.unsupportedFileType);
      return;
    }
    if (documentFile.size > maxDocumentSize) {
      setMessage(tr.fileTooLarge);
      return;
    }

    setUploadingDocument(true);
    const documentId = crypto.randomUUID();
    const year = new Date().getFullYear();
    const filePath = `${user.id}/charity-documents/${year}/${documentId}-${cleanFileName(documentFile.name)}`;

    try {
      const upload = await supabase.storage.from('charity-documents').upload(filePath, documentFile, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const { error } = await db.from('charity_documents').insert({
        id: documentId,
        user_id: user.id,
        title: documentForm.title.trim(),
        category: documentForm.category,
        project_id: documentForm.project_id || null,
        donation_id: documentForm.donation_id || null,
        zakat_asset_id: documentForm.zakat_asset_id || null,
        commitment_id: documentForm.commitment_id || null,
        file_url: filePath,
        file_path: filePath,
        file_name: documentFile.name,
        file_type: documentFile.type,
        file_size: documentFile.size,
        notes: documentForm.notes || null,
      });
      if (error) throw error;
      setMessage(tr.documentUploaded);
      setDocumentOpen(false);
      resetDocumentForm();
      loadData();
    } catch {
      setMessage(tr.uploadFailed);
    } finally {
      setUploadingDocument(false);
    }
  };

  const openDocument = async (document: CharityDocument, download = false) => {
    const { data, error } = await supabase.storage.from('charity-documents').createSignedUrl(document.file_path, 600);
    if (error || !data?.signedUrl) {
      setMessage(tr.openDocumentFailed);
      return;
    }
    if (download) {
      const link = window.document.createElement('a');
      link.href = data.signedUrl;
      link.download = document.file_name;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const deleteDocument = async (document: CharityDocument) => {
    if (!window.confirm(tr.confirmDeleteDocument)) return;
    const { error } = await db.from('charity_documents').delete().eq('id', document.id).eq('user_id', user?.id);
    if (error) {
      setMessage(tr.error);
      return;
    }
    await supabase.storage.from('charity-documents').remove([document.file_path]);
    setMessage(tr.documentDeleted);
    loadData();
  };

  const saveReminder = async () => {
    if (!user || !reminderForm.title.trim() || !reminderForm.due_date) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      title: reminderForm.title.trim(),
      reminder_type: reminderForm.reminder_type,
      related_project_id: reminderForm.related_project_id || null,
      related_zakat_asset_id: reminderForm.related_zakat_asset_id || null,
      related_commitment_id: reminderForm.related_commitment_id || null,
      due_date: reminderForm.due_date,
      hijri_date: estimatedHijriDate(reminderForm.due_date, lang as Lang) || null,
      remind_before_days: Math.max(0, Math.round(toNum(reminderForm.remind_before_days))),
      status: 'active',
      priority: reminderForm.priority,
      notes: reminderForm.notes || null,
    };
    const { error } = editingReminder
      ? await db.from('charity_reminders').update(payload).eq('id', editingReminder.id).eq('user_id', user.id)
      : await db.from('charity_reminders').insert(payload);
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(editingReminder ? tr.reminderUpdated : tr.reminderSaved);
    setReminderOpen(false);
    resetReminderForm();
    loadData();
  };

  const updateReminderStatus = async (reminder: CharityReminder, status: ReminderStatus) => {
    const { error } = await db.from('charity_reminders').update({ status }).eq('id', reminder.id).eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.reminderUpdated);
      loadData();
    }
  };

  const deleteReminder = async (reminder: CharityReminder) => {
    if (!window.confirm(tr.confirmDeleteReminder)) return;
    const { error } = await db.from('charity_reminders').delete().eq('id', reminder.id).eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.reminderDeleted);
      loadData();
    }
  };

  const saveBeneficiary = async () => {
    if (!user || !beneficiaryForm.display_name.trim()) return;
    if (beneficiaryForm.project_id && !scopedProjectIds.has(beneficiaryForm.project_id)) {
      setMessage(tr.error);
      return;
    }
    if (projectScope === 'zakat' && !beneficiaryForm.project_id) {
      setMessage(tr.error);
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      project_id: beneficiaryForm.project_id || null,
      reference_code: beneficiaryForm.reference_code || null,
      display_name: beneficiaryForm.display_name.trim(),
      category: beneficiaryForm.category,
      organization_name: beneficiaryForm.organization_name || null,
      country: beneficiaryForm.country || null,
      city: beneficiaryForm.city || null,
      monthly_support_amount: Math.max(0, toNum(beneficiaryForm.monthly_support_amount)),
      currency: beneficiaryForm.currency || 'KWD',
      sponsorship_start_date: beneficiaryForm.sponsorship_start_date || null,
      sponsorship_end_date: beneficiaryForm.sponsorship_end_date || null,
      next_renewal_date: beneficiaryForm.next_renewal_date || null,
      status: beneficiaryForm.status,
      notes: beneficiaryForm.notes || null,
    };
    const { data, error } = editingBeneficiary
      ? await db.from('charity_beneficiaries').update(payload).eq('id', editingBeneficiary.id).eq('user_id', user.id).select().single()
      : await db.from('charity_beneficiaries').insert(payload).select().single();
    if (!error && beneficiaryForm.next_renewal_date && data?.id) {
      await db.from('charity_reminders').insert({
        user_id: user.id,
        title: `${tr.sponsorship}: ${beneficiaryForm.display_name.trim()}`,
        reminder_type: 'sponsorship',
        due_date: beneficiaryForm.next_renewal_date,
        hijri_date: estimatedHijriDate(beneficiaryForm.next_renewal_date, lang as Lang) || null,
        remind_before_days: 30,
        status: 'active',
        priority: 'normal',
        notes: `beneficiary:${data.id}`,
      });
    }
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.beneficiarySaved);
    setBeneficiaryOpen(false);
    resetBeneficiaryForm();
    loadData();
  };

  const deleteBeneficiary = async (beneficiary: CharityBeneficiary) => {
    if (!window.confirm(tr.confirmDeleteBeneficiary)) return;
    const { error } = await db.from('charity_beneficiaries').delete().eq('id', beneficiary.id).eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.beneficiaryDeleted);
      loadData();
    }
  };

  const saveContributor = async () => {
    if (!user || !contributorForm.project_id || !scopedProjectIds.has(contributorForm.project_id) || !contributorForm.contributor_name.trim()) return;
    setSaving(true);
    const pledged = Math.max(0, toNum(contributorForm.pledged_amount));
    const paid = Math.max(0, toNum(contributorForm.paid_amount));
    const payload = {
      user_id: user.id,
      project_id: contributorForm.project_id,
      contributor_name: contributorForm.contributor_name.trim(),
      contributor_email: contributorForm.contributor_email || null,
      role: contributorForm.role,
      pledged_amount: pledged,
      paid_amount: paid,
      currency: contributorForm.currency || 'KWD',
      payment_status: paid >= pledged && pledged > 0 ? 'paid' : contributorForm.payment_status,
      due_date: contributorForm.due_date || null,
      notes: contributorForm.notes || null,
    };
    const { error } = editingContributor
      ? await db.from('charity_project_contributors').update(payload).eq('id', editingContributor.id).eq('user_id', user.id)
      : await db.from('charity_project_contributors').insert(payload);
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(contributorForm.contributor_email ? tr.emailSaved : tr.contributorSaved);
    setContributorOpen(false);
    resetContributorForm();
    loadData();
  };

  const markContributorPaid = async (contributor: CharityContributor) => {
    const { error } = await db.from('charity_project_contributors')
      .update({ paid_amount: toNum(contributor.pledged_amount), payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', contributor.id)
      .eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.contributorPaid);
      loadData();
    }
  };

  const deleteContributor = async (contributor: CharityContributor) => {
    if (!window.confirm(tr.confirmDeleteContributor)) return;
    const { error } = await db.from('charity_project_contributors').delete().eq('id', contributor.id).eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.contributorDeleted);
      loadData();
    }
  };

  const summaryCards = [
    { icon: HeartHandshake, label: tr.activeProjects, value: numberLabel(activeProjects) },
    { icon: HandCoins, label: tr.totalDonations, value: safeMoney(totalDonations) },
    { icon: CalendarDays, label: tr.nextDueDateKpi, value: nextCharityDueDate ? dateLabel(nextCharityDueDate) : unavailableLabel },
    { icon: Gift, label: tr.beneficiariesCountKpi, value: numberLabel(charityBeneficiaries.length) },
    { icon: ShieldCheck, label: tr.upcomingRemindersKpi, value: numberLabel(activeReminders.length) },
  ];
  const projectStatusCards = statuses.map(status => ({
    label: tr[status],
    value: numberLabel(charityImpactProjects.filter(project => project.status === status).length),
  }));
  const charityTabs: Array<{ id: CharityProjectsTab; label: string; count?: number }> = [
    { id: 'overview', label: tr.tabOverview },
    { id: 'projects', label: tr.tabProjects, count: charityImpactProjects.length },
    { id: 'beneficiaries', label: tr.tabBeneficiaries, count: charityBeneficiaries.length },
    { id: 'donations', label: tr.tabDonations, count: charityDonations.length },
    { id: 'reports', label: tr.tabReports },
    { id: 'impact', label: tr.tabImpact },
    { id: 'reminders', label: tr.tabReminders, count: activeReminders.length },
    { id: 'documents', label: tr.tabDocuments, count: charityDocuments.length },
  ];

  return (
    <div className="charity-projects-page" dir={dir} data-charity-experience="projects">
      <DashboardPageShell contentClassName="charity-projects-content">
        <section className="cp-hero">
          <div>
            <span>{tr.breadcrumb}</span>
            <h1>{tr.title}</h1>
            <p>{tr.subtitle}</p>
          </div>
          <div className="hero-actions">
            <CharityActionButton variant="primary" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
              <Plus size={17} /> {tr.newProject}
            </CharityActionButton>
            <CharityActionButton variant="secondary" type="button" onClick={() => { resetReminderForm(); setReminderOpen(true); }}>
              <CalendarDays size={17} /> {tr.addReminder}
            </CharityActionButton>
            <CharityActionButton variant="secondary" type="button" onClick={() => setActiveTab('reports')}>
              <FileText size={17} /> {tr.reports}
            </CharityActionButton>
            <CharityActionButton variant="ghost" type="button" onClick={() => { resetDocumentForm(); setDocumentOpen(true); }}>
              <FileUp size={17} /> {tr.uploadDocument}
            </CharityActionButton>
          </div>
        </section>

        {loading && <div className="notice" role="status" aria-live="polite" aria-atomic="true">{tr.loading}</div>}
        {message && <div className="notice" role="status" aria-live="polite" aria-atomic="true">{message}</div>}
        {projectScope === 'zakat' && <div className="notice scope-notice"><span>{tr.zakatProjectScope}</span> <a href="/zakat">{tr.openZakatWorkflow}</a></div>}

        <section className="summary-grid">
          {summaryCards.map(card => (
            <CharityStatCard key={card.label} icon={card.icon} label={card.label} value={card.value} />
          ))}
        </section>
        <p className="aggregate-scope-note">{tr.aggregateCurrencyNote}</p>

        <CharityTabs
          tabs={charityTabs}
          active={activeTab}
          onChange={setActiveTab}
          ariaLabel={tr.title}
          className="charity-tabs"
        />

        <PageTabPanel idBase={CHARITY_PROJECTS_TABS_ID} value="overview" active={activeTab === 'overview'}>
        <section className="charity-overview-grid">
          <div className="overview-main-stack">
            <section className="warm-card hijri-calendar">
              <div className="section-head vault-head">
                <div>
                  <small>{tr.hijriEstimated}</small>
                  <h2>{tr.hijriCalendar}</h2>
                  <p>{tr.hijriCalendarDesc}</p>
                </div>
                <div className="section-actions">
                  <button className="mini-gold" type="button" onClick={() => {
                    resetReminderForm();
                    setReminderOpen(true);
                  }}>
                    <CalendarDays size={16} /> {tr.addReminder}
                  </button>
                  <button className="ghost-btn" type="button" onClick={() => setActiveTab('reminders')}>
                    <Pencil size={16} /> {tr.editReminders}
                  </button>
                </div>
              </div>
              <div className="calendar-grid">
                <article className="season-panel calendar-season-panel">
                  <strong>{tr.seasonalReminders}</strong>
                  <div className="season-grid">
                    {calendarCards.map(card => {
                      const Icon = card.icon;
                      return (
                        <article className="season-card" key={card.title}>
                          <div className="season-card-icon"><Icon size={18} /></div>
                          <div>
                            <b>{card.title}</b>
                            <strong>{card.value}</strong>
                            <small>{card.description}</small>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </article>
                <article className="alert-panel calendar-alert-panel">
                  <strong>{tr.smartAlerts}</strong>
                  {urgentReminders.length === 0 ? <p>{tr.noUrgentAlerts}</p> : urgentReminders.map(reminder => (
                    <div className="alert-line" key={reminder.id}>
                      <b>{reminder.title}</b>
                      <span>{reminderTimingLabel(reminder)} • {dateLabel(reminder.due_date)}</span>
                    </div>
                  ))}
                </article>
              </div>
              <p className="nisab"><CalendarDays size={15} /> {tr.notificationNote}</p>
            </section>

            <section className="warm-card overview-impact-card">
              <div className="section-head vault-head">
                <div>
                  <small>{tr.impactDashboard}</small>
                  <h2>{tr.impactDashboard}</h2>
                  <p>{tr.impactDashboardDesc}</p>
                </div>
                <button className="mini-gold" type="button" onClick={() => setActiveTab('impact')}>
                  <Sparkles size={15} /> {tr.impactDashboard}
                </button>
              </div>
              <div className="impact-summary-grid compact-impact">
                <div><small>{tr.totalDonations}</small><strong>{hasImpactData ? money(totalDonations) : unavailableLabel}</strong></div>
                <div><small>{tr.beneficiariesCountKpi}</small><strong>{numberLabel(charityBeneficiaries.length)}</strong></div>
                <div><small>{tr.completedProjects}</small><strong>{numberLabel(completedProjectsCount)}</strong></div>
                <div><small>{tr.activeCharityProjects}</small><strong>{numberLabel(activeProjects)}</strong></div>
              </div>
              {!hasImpactData && (
                <EmptyState
                  className="charity-empty-state compact"
                  icon={<Sparkles size={28} />}
                  title={tr.notEnoughImpactData}
                  description={tr.impactEmptyBody}
                  actions={(
                    <button className="mini-gold" type="button" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
                      <Plus size={15} /> {tr.newProject}
                    </button>
                  )}
                />
              )}
            </section>
          </div>

          <div className="overview-side-stack">
            <section className="warm-card reminders-section" id="upcoming-reminders">
              <div className="section-head">
                <div>
                  <small>{tr.charityReminders}</small>
                  <h2>{tr.upcomingReminders}</h2>
                </div>
                <button className="mini-gold" type="button" onClick={() => {
                  resetReminderForm();
                  setReminderOpen(true);
                }}><CalendarDays size={16} /> {tr.addReminder}</button>
              </div>
              {activeReminders.length === 0 ? (
                <EmptyState
                  className="charity-empty-state compact"
                  icon={<CalendarDays size={28} />}
                  title={tr.noReminders}
                  description={tr.reminderEmptyBody}
                  actions={(
                    <button className="mini-gold" type="button" onClick={() => {
                      resetReminderForm();
                      setReminderOpen(true);
                    }}>
                      <CalendarDays size={15} /> {tr.addReminder}
                    </button>
                  )}
                />
              ) : (
                <div className="reminder-grid">
                  {activeReminders.map(reminder => {
                    const relatedProject = voluntaryProjects.find(project => project.id === reminder.related_project_id)?.name;
                    const relatedAsset = assets.find(asset => asset.id === reminder.related_zakat_asset_id)?.asset_name;
                    const relatedCommitment = commitments.find(commitment => commitment.id === reminder.related_commitment_id)?.name;
                    return (
                      <article className={`reminder-card ${reminder.priority}`} key={reminder.id}>
                        <div className="reminder-top">
                          <div>
                            <strong>{reminder.title}</strong>
                            <span>{reminderTypeLabel(reminder.reminder_type)}</span>
                          </div>
                          <b>{tr[reminder.priority]}</b>
                        </div>
                        <div className="badge-row">
                          <span>{dateLabel(reminder.due_date)}</span>
                          {reminder.hijri_date && <span>{tr.hijriDate}: {reminder.hijri_date}</span>}
                          <span>{tr.daysBefore.replace('{days}', String(reminder.remind_before_days))}</span>
                        </div>
                        <small>{reminderTimingLabel(reminder)} • {tr.hijriEstimated}</small>
                        {(relatedProject || relatedAsset || relatedCommitment) && <p>{relatedProject || relatedAsset || relatedCommitment}</p>}
                        {reminder.notes && <p>{reminder.notes}</p>}
                        <div className="card-actions">
                          <button type="button" onClick={() => updateReminderStatus(reminder, 'completed')} aria-label={tr.completedAction}>{tr.completedAction}</button>
                          <button type="button" onClick={() => updateReminderStatus(reminder, 'dismissed')} aria-label={tr.dismissAction}>{tr.dismissAction}</button>
                          <button type="button" onClick={() => openReminderEditor(reminder)} aria-label={tr.edit}>{tr.edit}</button>
                          <button type="button" onClick={() => deleteReminder(reminder)} aria-label={tr.deleteAction}>{tr.deleteAction}</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="main-grid quick-action-grid">
          <article className="warm-card span-7 zakat-shortcut-card">
            <div className="section-head">
              <div><small>{tr.zakat}</small><h2>{zakatShortcut.title}</h2></div>
              <Calculator size={24} />
            </div>
            <p className="muted">{zakatShortcut.description}</p>
            <a className="primary-wide" href="/zakat">
              <Calculator size={16} /> {zakatShortcut.button}
            </a>
          </article>
          <article className="warm-card quick-action-card">
            <div className="section-head">
              <div><small>{tr.projects}</small><h2>{tr.newProject}</h2></div>
              <Plus size={22} />
            </div>
            <p className="muted">{tr.emptyBody}</p>
            <button className="primary-wide" type="button" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
              <Plus size={16} /> {tr.newProject}
            </button>
          </article>
          <article className="warm-card quick-action-card">
            <div className="section-head">
              <div><small>{tr.upcomingReminders}</small><h2>{tr.addReminder}</h2></div>
              <CalendarDays size={22} />
            </div>
            <p className="muted">{tr.reminderEmptyBody}</p>
            <button className="primary-wide" type="button" onClick={() => { resetReminderForm(); setReminderOpen(true); }}>
              <CalendarDays size={16} /> {tr.addReminder}
            </button>
          </article>
          <article className="warm-card quick-action-card">
            <div className="section-head">
              <div><small>{tr.reports}</small><h2>{tr.generateReport}</h2></div>
              <FileText size={22} />
            </div>
            <p className="muted">{tr.emptyReportsBody}</p>
            <button className="primary-wide" type="button" onClick={() => setActiveTab('reports')}>
              <FileText size={16} /> {tr.reports}
            </button>
          </article>
        </section>
          </div>
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={CHARITY_PROJECTS_TABS_ID} value="projects" active={activeTab === 'projects'}>
        <section className="warm-card project-dashboard">
          <div className="section-head vault-head">
            <div>
              <small>{tr.projects}</small>
              <h2>{tr.projects}</h2>
              <p>{tr.projectListDesc}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
              <Plus size={15} /> {tr.newProject}
            </button>
          </div>
          <div className="status-metric-grid">
            {projectStatusCards.map(card => (
              <div key={card.label}>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
          <div className="document-tools project-tools">
            <label>
              <Search size={16} />
              <input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder={tr.searchProjects} aria-label={tr.searchProjects} />
            </label>
            <select value={projectStatusFilter} onChange={e => setProjectStatusFilter(e.target.value as 'all' | ProjectStatus)} aria-label={tr.allStatuses}>
              <option value="all">{tr.allStatuses}</option>
              {statuses.map(status => <option key={status} value={status}>{tr[status]}</option>)}
            </select>
            <select value={projectCategoryFilter} onChange={e => setProjectCategoryFilter(e.target.value as 'all' | ProjectCategory)} aria-label={tr.allTypes}>
              <option value="all">{tr.allTypes}</option>
              {(projectScope === 'zakat' ? categories.filter(category => category === 'zakat') : categories.filter(category => category !== 'zakat')).map(category => <option key={category} value={category}>{tr[category]}</option>)}
            </select>
          </div>
          {filteredProjects.length === 0 ? (
            <EmptyState
              className="charity-empty-state compact"
              icon={<HeartHandshake size={28} />}
              title={charityImpactProjects.length === 0 ? tr.emptyTitle : tr.noFilteredProjects}
              description={charityImpactProjects.length === 0 ? tr.emptyBody : tr.noFilteredProjectsBody}
              actions={(
                <button className="mini-gold" type="button" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
                  <Plus size={15} /> {tr.newProject}
                </button>
              )}
            />
          ) : (
            <div className="project-grid">
              {filteredProjects.map(project => {
                const target = toNum(project.target_amount);
                const collected = toNum(project.collected_amount);
                const progress = target > 0 ? Math.min(100, (collected / target) * 100) : 0;
                const projectContributors = charityContributors.filter(contributor => contributor.project_id === project.id);
                const matchingProjectContributors = projectContributors.filter(contributor => hasSameExplicitCurrency(contributor.currency, project.currency));
                const projectDonationRecords = charityDonations.filter(donation => donation.project_id === project.id);
                const contributorPaid = matchingProjectContributors.reduce((sum, contributor) => sum + toNum(contributor.paid_amount), 0);
                const contributorCoverage = matchingProjectContributors.length > 0 && target > 0 ? Math.min(100, (contributorPaid / target) * 100) : null;
                const projectOrganization = project.organization_id ? organizationById[project.organization_id] : null;
                const ArtworkIcon = project.category === 'education' ? FileText
                  : project.category === 'relief' ? HandCoins
                    : project.category === 'mosque' ? CalendarDays
                      : project.category === 'endowment' ? Archive
                        : project.category === 'sponsorship' || project.category === 'sacrifice' ? Gift
                          : project.category === 'zakat' ? ShieldCheck
                            : HeartHandshake;
                return (
                  <article className="project-card" key={project.id}>
                    <div className={`phase28-project-artwork artwork-${project.category}`} role="img" aria-label={`${tr.projectArtwork}: ${tr[project.category] ?? tr.other}`}>
                      <ArtworkIcon size={34} aria-hidden="true" />
                      <span>{tr[project.category] ?? tr.other}</span>
                    </div>
                    <div className="project-top">
                      <div><strong>{project.name}</strong><span>{organizationLabel(project.organization_id, project.organization_name)}</span></div>
                      <b className={`status ${project.status}`}>{tr[project.status]}</b>
                    </div>
                    <div className="org-strip">
                      <span>{tr.organization}</span>
                      <b className={`verify-badge ${projectOrganization?.verification_status ?? 'unverified'}`}>{verificationLabel(projectOrganization?.verification_status)}</b>
                      {projectOrganization?.license_number && <small>{tr.licenseNumber}: {projectOrganization.license_number}</small>}
                    </div>
                    {projectOrganization && projectOrganization.verification_status !== 'verified' && <p className="privacy-note">{tr.unverifiedOrganizationWarning}</p>}
                    <div className="badge-row"><span>{tr[project.category] ?? tr.other}</span><span>{dateLabel(project.start_date)} - {dateLabel(project.end_date)}</span></div>
                    <div className="project-progress-label"><span>{tr.projectProgress}</span><strong>{progress.toFixed(0)}%</strong></div>
                    <div className="progress" role="progressbar" aria-label={`${tr.projectProgress}: ${project.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><i style={{ width: `${progress}%` }} /></div>
                    <div className="money-row">
                      <div><small>{tr.target}</small><strong>{money(target, project.currency)}</strong></div>
                      <div><small>{tr.raised}</small><strong>{money(collected, project.currency)}</strong></div>
                      <div><small>{tr.remaining}</small><strong>{money(Math.max(0, target - collected), project.currency)}</strong></div>
                    </div>
                    <div className="phase28-project-meta">
                      <div><small>{tr.donorCount}</small><strong>{tr.donorIdentityUnavailable}</strong></div>
                      <div><small>{tr.donationRecords}</small><strong>{numberLabel(projectDonationRecords.length)}</strong></div>
                      <div><small>{tr.location}</small><strong>{[projectOrganization?.country, projectOrganization?.city].filter(Boolean).join(' / ') || tr.notRecorded}</strong></div>
                      <div><small>{tr.transparency}</small><strong>{toNum(projectOrganization?.transparency_score) > 0 ? `${projectOrganization?.transparency_score}/100` : tr.notReviewed}</strong></div>
                      <div><small>{tr.projectVerification}</small><strong>{verificationLabel(projectOrganization?.verification_status)}</strong></div>
                    </div>
                    {projectContributors.length > 0 && (
                      <div className="collab-strip">
                        <span>{tr.contributorPayments}: {matchingProjectContributors.length > 0 ? money(contributorPaid, project.currency) : unavailableLabel}</span>
                        <span>{tr.projectCoverage}: {contributorCoverage === null ? unavailableLabel : `${contributorCoverage.toFixed(1)}%`}</span>
                      </div>
                    )}
                    {project.notes && <p>{project.notes}</p>}
                    <div className="project-linked-actions">
                      <button
                        className="doc-count-btn"
                        type="button"
                        aria-label={tr.documentsCount.replace('{count}', String(projectDocumentCounts[project.id] || 0))}
                        onClick={() => {
                          setDocumentFilter('all');
                          setDocumentSearch('');
                          setDocumentProjectFilter(project.id);
                          setActiveTab('documents');
                        }}
                      >
                        {tr.documentsCount.replace('{count}', String(projectDocumentCounts[project.id] || 0))}
                      </button>
                      <button
                        className="doc-count-btn"
                        type="button"
                        aria-label={tr.beneficiariesCount.replace('{count}', String(projectBeneficiaryCounts[project.id] || 0))}
                        onClick={() => {
                          setBeneficiarySearch('');
                          setBeneficiaryProjectFilter(project.id);
                          setBeneficiaryStatusFilter('all');
                          setBeneficiaryCategoryFilter('all');
                          setActiveTab('beneficiaries');
                        }}
                      >
                        {tr.beneficiariesCount.replace('{count}', String(projectBeneficiaryCounts[project.id] || 0))}
                      </button>
                      <button
                        className="doc-count-btn"
                        type="button"
                        aria-label={tr.contributorsCount.replace('{count}', String(projectContributorCounts[project.id] || 0))}
                        onClick={() => {
                          setContributorProjectFilter(project.id);
                          setActiveTab('donations');
                        }}
                      >
                        {tr.contributorsCount.replace('{count}', String(projectContributorCounts[project.id] || 0))}
                      </button>
                    </div>
                    <div className="card-actions">
                      <button type="button" onClick={() => setDonationProject(project)} aria-label={tr.addDonation}><HandCoins size={15} /> {tr.addDonation}</button>
                      <button type="button" onClick={() => { resetContributorForm(project.id); setContributorOpen(true); }} aria-label={tr.addContributor}>{tr.addContributor}</button>
                      <button type="button" onClick={() => archiveProject(project)} aria-label={tr.archive}><Archive size={15} /> {tr.archive}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
            </section>

        {projectScope === 'charity' && <section className="split-grid project-support-grid">
          <article className="warm-card">
            <div className="section-head"><h2>{tr.templates}</h2><Gift size={22} /></div>
            <div className="template-grid">
              {templates.map(template => (
                <button key={template.ar} className="template-card" onClick={() => openTemplate(template)}>
                  <strong>{template[lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en']}</strong>
                  <span>{template[lang === 'ar' ? 'subAr' : lang === 'fr' ? 'subFr' : 'subEn']}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="warm-card">
            <div className="section-head"><h2>{tr.forecast}</h2><FileText size={22} /></div>
            {expectedCommitments > 0 ? (
              <div className="big-metric">
                <strong>{money(expectedCommitments)}</strong>
                <span>{tr.commitments}</span>
              </div>
            ) : <p className="muted">{tr.forecastEmpty}</p>}
          </article>
        </section>}

        <section className="warm-card" id="charity-organization-directory">
          <div className="vault-head section-head">
            <div>
              <h2>{tr.organizationDirectory}</h2>
              <p>{tr.organizationDirectoryDesc}</p>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="document-tools document-tools-two">
            <label aria-label={tr.searchOrganization}><Search size={16} /><input value={organizationSearch} onChange={e => setOrganizationSearch(e.target.value)} placeholder={tr.searchOrganization} /></label>
            <select value={organizationVerificationFilter} onChange={e => setOrganizationVerificationFilter(e.target.value as 'all' | VerificationStatus)} aria-label={tr.verifiedOrganizations}>
              <option value="all">{tr.allOrganizations}</option>
              {verificationStatuses.map(status => <option key={status} value={status}>{verificationLabel(status)}</option>)}
            </select>
            <select value={organizationTypeFilter} onChange={e => setOrganizationTypeFilter(e.target.value as 'all' | OrganizationType)} aria-label={tr.organizationType}>
              <option value="all">{tr.organizationType}</option>
              {organizationTypes.map(type => <option key={type} value={type}>{tValue(type, tr.other)}</option>)}
            </select>
          </div>
          {organizations.length === 0 ? (
            <EmptyState
              className="charity-empty-state compact"
              icon={<ShieldCheck size={28} />}
              title={tr.organizationDirectory}
              description={tr.noOrganizationsAvailable}
            />
          ) : (
            <div className="organization-grid">
              {filteredOrganizations.map(organization => {
                const reviewed = toNum(organization.transparency_score) > 0 || toNum(organization.efficiency_score) > 0 || toNum(organization.track_record_score) > 0;
                return (
                  <article className="organization-card" key={organization.id}>
                    <div className="organization-top">
                      <div>
                        <strong>{organizationName(organization)}</strong>
                        <span>{[organization.country, organization.city].filter(Boolean).join(' / ') || 'Kuwait'}</span>
                      </div>
                      <b className={`verify-badge ${organization.verification_status}`}>{verificationLabel(organization.verification_status)}</b>
                    </div>
                    <div className="badge-row">
                      <span>{tValue(organization.organization_type, tr.other)}</span>
                      {organization.license_number && <span>{tr.licenseNumber}: {organization.license_number}</span>}
                      <span>{tr.projects}: {organizationProjectCounts[organization.id] || 0}</span>
                    </div>
                    <div className="trust-box">
                      <strong>{tr.trustIndicators}</strong>
                      {reviewed ? (
                        <div className="trust-grid">
                          <span>{tr.transparency}: {organization.transparency_score}/100</span>
                          <span>{tr.efficiency}: {organization.efficiency_score}/100</span>
                          <span>{tr.trackRecord}: {organization.track_record_score}/100</span>
                        </div>
                      ) : <p>{tr.notReviewedYet}</p>}
                    </div>
                    <div className="org-contact">
                      {organization.website_url && <a href={organization.website_url} target="_blank" rel="noreferrer">{organization.website_url}</a>}
                      {organization.phone && <span>{organization.phone}</span>}
                      {organization.email && <span>{organization.email}</span>}
                      {organization.data_source && <small>{tr.dataSource}: {organization.data_source}</small>}
                    </div>
                    {organization.verification_status !== 'verified' && <p className="privacy-note">{tr.unverifiedOrganizationWarning}</p>}
                    <div className="card-actions">
                      <button type="button" aria-label={tr.selectOrganization} onClick={() => {
                        setProjectForm(prev => ({ ...prev, organization_id: organization.id, organization_name: organizationName(organization) }));
                        setManualOrganization(false);
                        setProjectOpen(true);
                      }}>{tr.selectOrganization}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className="disclaimer">{tr.verificationDisclaimer}</p>
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={CHARITY_PROJECTS_TABS_ID} value="impact" active={activeTab === 'impact'}>
        <section className="warm-card" id="impact-dashboard">
          <div className="vault-head section-head">
            <div>
              <h2>{tr.impactDashboard}</h2>
              <p>{tr.impactDashboardDesc}</p>
            </div>
            <Sparkles size={22} />
          </div>
          <div className="impact-summary-grid">
            <div><small>{tr.totalDonations}</small><strong>{hasImpactData ? money(totalDonations) : unavailableLabel}</strong></div>
            <div><small>{tr.beneficiariesCountKpi}</small><strong>{numberLabel(charityBeneficiaries.length)}</strong></div>
            <div><small>{tr.completedProjects}</small><strong>{numberLabel(completedProjectsCount)}</strong></div>
            <div><small>{tr.activeCharityProjects}</small><strong>{numberLabel(activeProjects)}</strong></div>
            <div><small>{tr.monthlySponsorships}</small><strong>{hasImpactData ? money(monthlySponsorshipsTotal) : unavailableLabel}</strong></div>
            <div><small>{tr.supportRecords}</small><strong>{numberLabel(charityDonations.length + charityContributors.length)}</strong></div>
          </div>
          <p className="aggregate-scope-note">{tr.aggregateCurrencyNote}</p>
          {!hasImpactData ? (
            <EmptyState
              className="charity-empty-state compact"
              icon={<HeartHandshake size={28} />}
              title={tr.notEnoughImpactData}
              description={tr.impactEmptyBody}
              actions={(
                <button className="mini-gold" type="button" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
                  <Plus size={15} /> {tr.newProject}
                </button>
              )}
            />
          ) : (
            <>
              <div className="impact-layout">
                <article className="impact-panel">
                  <h3>{tr.givingIncomeRatio}</h3>
                  {givingIncomeRatioYear === null ? <p className="muted">{tr.addIncomeForGivingRatio}</p> : (
                    <div className="ratio-grid">
                      <div><small>{tr.thisYear}</small><strong>{givingIncomeRatioYear.toFixed(1)}%</strong></div>
                      <div><small>{tr.currentMonth}</small><strong>{givingIncomeRatioMonth === null ? '-' : `${givingIncomeRatioMonth.toFixed(1)}%`}</strong></div>
                      <p>{tr.aggregateCurrencyNote}</p>
                    </div>
                  )}
                </article>
                <article className="impact-panel">
                  <h3>{tr.yearlyImpactSummary}</h3>
                  <div className="impact-lines">
                    <p>{tr.totalDonated}: {money(totalDonatedThisYear)}</p>
                    <p>{tr.projects}: {charityImpactProjects.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
                    <p>{tr.beneficiariesSupported}: {charityBeneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
                    <p>{tr.monthlySponsorships}: {money(monthlySponsorshipsTotal)}</p>
                  </div>
                </article>
              </div>

              <div className="impact-layout">
                <article className="impact-panel">
                  <h3>{tr.impactOverTime}</h3>
                  <div className="impact-bars" role="img" aria-label={tr.impactOverTime}>
                    {impactByMonth.map(month => {
                      const total = month.donationAmount;
                      return (
                        <div key={month.label} className="impact-bar-row">
                          <span>{month.label}</span>
                          <i><b style={{ width: `${Math.min(100, (total / maxImpactMonth) * 100)}%` }} /></i>
                          <strong>{money(total)}</strong>
                        </div>
                      );
                    })}
                  </div>
                </article>
                <article className="impact-panel">
                  <h3>{tr.impactByCategory}</h3>
                  {impactByCategory.length === 0 ? <p className="muted">{tr.notEnoughImpactData}</p> : (
                    <div className="impact-bars" role="img" aria-label={tr.impactByCategory}>
                      {impactByCategory.map(item => (
                        <div key={item.category} className="impact-bar-row">
                          <span>{tValue(item.category, tr.other)}</span>
                          <i><b style={{ width: `${Math.min(100, (item.amount / maxImpactCategory) * 100)}%` }} /></i>
                          <strong>{money(item.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>

              <article className="impact-panel">
                <h3>{tr.projectImpactProgress}</h3>
                {charityImpactProjects.length === 0 ? <p className="muted">{tr.emptyBody}</p> : (
                  <div className="project-impact-grid">
                    {charityImpactProjects.map(project => {
                      const target = toNum(project.target_amount);
                      const collected = toNum(project.collected_amount);
                      const progress = target > 0 ? Math.min(100, (collected / target) * 100) : 0;
                      return (
                        <div className="project-impact-card" key={project.id}>
                          <strong>{project.name}</strong>
                          <span>{organizationLabel(project.organization_id, project.organization_name)}</span>
                          <div className="progress"><i style={{ width: `${progress}%` }} /></div>
                          <div className="badge-row">
                            <span>{tr.completionRate}: {progress.toFixed(1)}%</span>
                            <span>{tr.collected}: {money(collected, project.currency)}</span>
                            <span>{tr.target}: {money(target, project.currency)}</span>
                            <span>{tr.beneficiariesSupported}: {projectBeneficiaryCounts[project.id] || 0}</span>
                            <span>{tr.documentsCount.replace('{count}', String(projectDocumentCounts[project.id] || 0))}</span>
                          </div>
                          {(impactMetricsByProject[project.id] || []).length > 0 && <div className="metric-chip-row">{impactMetricsByProject[project.id].map(metric => <span key={metric.id}>{metric.metric_name}: {toNum(metric.metric_value).toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')} {metric.metric_unit || ''}</span>)}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="disclaimer">{tr.customImpactHint}</p>
              </article>

              <div className="impact-layout">
                <article className="impact-panel">
                  <h3>{tr.beneficiaryImpact}</h3>
                  {beneficiaryByCategory.length === 0 ? <p className="muted">{tr.noBeneficiaries}</p> : <div className="metric-chip-row">{beneficiaryByCategory.map(item => <span key={item.category}>{tValue(item.category, tr.other)}: {item.count}</span>)}</div>}
                </article>
                <article className="impact-panel">
                  <h3>{tr.customImpactIndicators}</h3>
                  <div className="form-grid">
                    <label><span>{tr.linkedProject}</span><select value={impactMetricForm.project_id} onChange={e => setImpactMetricForm(prev => ({ ...prev, project_id: e.target.value }))}><option value="">-</option>{charityImpactProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                    <label><span>{tr.metricName}</span><input value={impactMetricForm.metric_name} onChange={e => setImpactMetricForm(prev => ({ ...prev, metric_name: e.target.value }))} /></label>
                    <label><span>{tr.metricValue}</span><input inputMode="decimal" value={impactMetricForm.metric_value} onChange={e => setImpactMetricForm(prev => ({ ...prev, metric_value: e.target.value }))} /></label>
                    <label><span>{tr.metricUnit}</span><input value={impactMetricForm.metric_unit} onChange={e => setImpactMetricForm(prev => ({ ...prev, metric_unit: e.target.value }))} /></label>
                    <label className="wide"><span>{tr.notes}</span><textarea value={impactMetricForm.notes} onChange={e => setImpactMetricForm(prev => ({ ...prev, notes: e.target.value }))} /></label>
                    <button className="primary-wide wide" type="button" onClick={saveImpactMetric}><Save size={16} /> {tr.addImpactMetric}</button>
                  </div>
                </article>
              </div>
            </>
          )}
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={CHARITY_PROJECTS_TABS_ID} value="donations" active={activeTab === 'donations'}>
        <section className="warm-card donation-center">
          <div className="section-head vault-head">
            <div>
              <small>{tr.tabDonations}</small>
              <h2>{tr.donationsTitle}</h2>
              <p>{tr.donationsDescription}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => setActiveTab('projects')}>
              <HeartHandshake size={16} /> {tr.tabProjects}
            </button>
          </div>
          <div className="beneficiary-stats donation-stats">
            <div><small>{tr.donationsThisYear}</small><strong>{money(totalDonatedThisYear)}</strong></div>
            <div><small>{tr.donationRecords}</small><strong>{numberLabel(charityDonations.length)}</strong></div>
            <div><small>{tr.projectsSupported}</small><strong>{numberLabel(supportedProjectCount)}</strong></div>
            <div><small>{tr.latestDonation}</small><strong>{latestDonation ? dateLabel(recordDate(latestDonation)) : unavailableLabel}</strong></div>
          </div>
          {charityDonations.length === 0 ? (
            <EmptyState
              className="charity-empty-state compact"
              icon={<HandCoins size={28} />}
              title={tr.noDonations}
              description={tr.noDonationsBody}
              actions={<button className="mini-gold" type="button" onClick={() => setActiveTab('projects')}>{tr.tabProjects}</button>}
            />
          ) : (
            <div className="donation-records">
              {charityDonations.slice().sort((a, b) => (recordDate(b) || '').localeCompare(recordDate(a) || '')).map(donation => {
                const project = charityImpactProjects.find(item => item.id === donation.project_id);
                const receipt = documents.find(document => document.donation_id === donation.id && document.category === 'donation_receipt');
                return (
                  <article className="donation-record" key={donation.id}>
                    <div>
                      <strong>{money(toNum(donation.amount), donation.currency)}</strong>
                      <span>{project?.name || tr.notRecorded}</span>
                    </div>
                    <div className="donation-record-meta">
                      <span>{dateLabel(recordDate(donation))}</span>
                      <span>{donation.donation_type || tr.other}</span>
                      <b>{tr.recordedStatus}</b>
                    </div>
                    <div className="card-actions">
                      {receipt ? (
                        <button type="button" onClick={() => openDocument(receipt)} aria-label={tr.openReceipt}>{tr.openReceipt}</button>
                      ) : <span className="muted">{tr.noReceipt}</span>}
                      {project && <button type="button" onClick={() => setDonationProject(project)}>{tr.addDonation}</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="family-collaboration" className="warm-card family-collaboration">
          <div className="section-head vault-head">
            <div>
              <small>{tr.contributors}</small>
              <h2>{tr.familyCollaboration}</h2>
              <p>{tr.collaborationDesc}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => {
              resetContributorForm(contributorProjectFilter || charityImpactProjects[0]?.id || '');
              setContributorOpen(true);
            }}>{tr.addContributor}</button>
          </div>
          <div className="report-card">
            <div>
              <strong>{tr.contributorSummary}</strong>
              <span>{tr.recordedDonations} / {tr.contributorPayments}</span>
            </div>
            <select value={contributorProjectFilter} onChange={e => setContributorProjectFilter(e.target.value)} aria-label={tr.projects}>
              <option value="">{tr.projects}</option>
              {charityImpactProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button type="button" onClick={() => { resetContributorForm(contributorProjectFilter || charityImpactProjects[0]?.id || ''); setContributorOpen(true); }}>{tr.addContributor}</button>
          </div>
          <div className="beneficiary-stats">
            <div><small>{tr.contributors}</small><strong>{filteredContributors.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
            <div><small>{tr.totalPledged}</small><strong>{hasComparableContributorData ? money(totalPledged, contributorSummaryCurrency ?? CHARITY_AGGREGATE_CURRENCY) : unavailableLabel}</strong></div>
            <div><small>{tr.totalPaid}</small><strong>{hasComparableContributorData ? money(totalPaid, contributorSummaryCurrency ?? CHARITY_AGGREGATE_CURRENCY) : unavailableLabel}</strong></div>
            <div><small>{tr.lateContribution}</small><strong>{lateContributors.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
          </div>
          <p className="nisab"><HandCoins size={15} /> {tr.topContributor}: {topContributor ? `${topContributor.contributor_name} - ${money(toNum(topContributor.paid_amount), topContributor.currency)}` : unavailableLabel}</p>
          {filteredContributors.length === 0 ? (
            <EmptyState
              className="charity-empty-state compact"
              icon={<HandCoins size={28} />}
              title={tr.noContributors}
              description={tr.contributorsEmptyBody}
              actions={(
                <button className="mini-gold" type="button" onClick={() => {
                  resetContributorForm(contributorProjectFilter || charityImpactProjects[0]?.id || '');
                  setContributorOpen(true);
                }}>{tr.addContributor}</button>
              )}
            />
          ) : (
            <div className="contributor-grid">
              {filteredContributors.map(contributor => {
                const project = charityImpactProjects.find(item => item.id === contributor.project_id);
                const target = toNum(project?.target_amount);
                const percent = project && hasSameExplicitCurrency(contributor.currency, project.currency) && target > 0
                  ? (toNum(contributor.paid_amount) / target) * 100
                  : null;
                const computedLate = contributor.due_date && daysUntil(contributor.due_date) < 0 && ['pending', 'partial'].includes(contributor.payment_status);
                return (
                  <article className="contributor-card" key={contributor.id}>
                    <div className="project-top">
                      <div>
                        <strong>{contributor.contributor_name}</strong>
                        <span>{project?.name || tr.projects}</span>
                      </div>
                      <b className={`status ${computedLate ? 'late' : contributor.payment_status}`}>{computedLate ? tr.late : tr[contributor.payment_status]}</b>
                    </div>
                    <div className="badge-row">
                      <span>{tr[contributor.role]}</span>
                      {contributor.due_date && <span>{tr.dueDate}: {dateLabel(contributor.due_date)}</span>}
                      {computedLate && <span>{tr.lateContribution}</span>}
                    </div>
                    <div className="money-row">
                      <div><small>{tr.pledgedAmount}</small><strong>{money(toNum(contributor.pledged_amount), contributor.currency)}</strong></div>
                      <div><small>{tr.paidAmount}</small><strong>{money(toNum(contributor.paid_amount), contributor.currency)}</strong></div>
                      <div><small>{tr.projectCoverage}</small><strong>{percent === null ? unavailableLabel : `${percent.toFixed(1)}%`}</strong></div>
                    </div>
                    <div className="card-actions">
                      <button type="button" onClick={() => openContributorEditor(contributor)} aria-label={tr.edit}>{tr.edit}</button>
                      <button type="button" onClick={() => markContributorPaid(contributor)} aria-label={tr.markPaid}>{tr.markPaid}</button>
                      <button type="button" onClick={() => deleteContributor(contributor)} aria-label={tr.deleteAction}>{tr.deleteAction}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={CHARITY_PROJECTS_TABS_ID} value="beneficiaries" active={activeTab === 'beneficiaries'}>
        <section id="beneficiary-tracking" className="warm-card beneficiary-tracking">
          <div className="section-head vault-head">
            <div>
              <small>{tr.privacyNote}</small>
              <h2>{tr.beneficiaryTracking}</h2>
              <p>{tr.beneficiaryDesc}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => {
              resetBeneficiaryForm();
              setBeneficiaryOpen(true);
            }}>{tr.addBeneficiary}</button>
          </div>
          <div className="beneficiary-stats">
            <div><small>{tr.totalBeneficiaries}</small><strong>{charityBeneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
            <div><small>{tr.activeSponsorships}</small><strong>{activeBeneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
            <div><small>{tr.monthlySupportTotal}</small><strong>{money(monthlySupportTotal)}</strong></div>
            <div><small>{tr.upcomingRenewals}</small><strong>{upcomingRenewals.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
          </div>
          <div className="document-tools">
            <label>
              <Search size={16} />
              <input value={beneficiarySearch} onChange={e => setBeneficiarySearch(e.target.value)} placeholder={tr.searchBeneficiaries} aria-label={tr.searchBeneficiaries} />
            </label>
            <select value={beneficiaryStatusFilter} onChange={e => setBeneficiaryStatusFilter(e.target.value as 'all' | BeneficiaryStatus)} aria-label={tr.allStatuses}>
              <option value="all">{tr.allStatuses}</option>
              {beneficiaryStatuses.map(status => <option key={status} value={status}>{tr[status]}</option>)}
            </select>
            <select value={beneficiaryCategoryFilter} onChange={e => setBeneficiaryCategoryFilter(e.target.value as 'all' | BeneficiaryCategory)} aria-label={tr.allTypes}>
              <option value="all">{tr.allTypes}</option>
              {beneficiaryCategories.map(category => <option key={category} value={category}>{tr[category]}</option>)}
            </select>
            <select value={beneficiaryProjectFilter} onChange={e => setBeneficiaryProjectFilter(e.target.value)} aria-label={tr.linkedProject}>
              <option value="">{tr.allProjects}</option>
              {charityImpactProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          {filteredBeneficiaries.length === 0 ? (
            <EmptyState
              className="charity-empty-state compact"
              icon={<HeartHandshake size={28} />}
              title={tr.noBeneficiaries}
              description={tr.beneficiariesEmptyBody}
              actions={(
                <button className="mini-gold" type="button" onClick={() => {
                  resetBeneficiaryForm();
                  setBeneficiaryOpen(true);
                }}>{tr.addBeneficiary}</button>
              )}
            />
          ) : (
            <div className="beneficiary-grid">
              {filteredBeneficiaries.map(beneficiary => {
                const project = charityImpactProjects.find(item => item.id === beneficiary.project_id);
                const linkedDocuments = documents.filter(document => document.project_id && document.project_id === beneficiary.project_id).length;
                const renewalDays = beneficiary.next_renewal_date ? daysUntil(beneficiary.next_renewal_date) : null;
                const renewalPriority = renewalDays === null ? tr.priorityUnknown
                  : renewalDays < 0 ? tr.priorityOverdue
                    : renewalDays <= 14 ? tr.priorityHigh
                      : renewalDays <= 45 ? tr.priorityMedium
                        : tr.priorityRoutine;
                const projectSupport = charityDonations
                  .filter(donation => donation.project_id && donation.project_id === beneficiary.project_id)
                  .sort((a, b) => (recordDate(b) || '').localeCompare(recordDate(a) || ''));
                const lastProjectSupport = projectSupport[0] ?? null;
                return (
                  <article className="beneficiary-card" key={beneficiary.id}>
                    <div className="project-top">
                      <div>
                        <strong>{beneficiary.display_name}</strong>
                        <span>{beneficiary.reference_code || tr.privacyNote}</span>
                      </div>
                      <b className={`status ${beneficiary.status}`}>{tr[beneficiary.status]}</b>
                    </div>
                    <div className="beneficiary-meta">
                      <div><small>{tr.category}</small><strong>{tr[beneficiary.category]}</strong></div>
                      <div><small>{tr.country}</small><strong>{beneficiary.country || tr.notRecorded}</strong></div>
                      <div><small>{tr.linkedProject}</small><strong>{project?.name || tr.notRecorded}</strong></div>
                      <div><small>{tr.nextRenewal}</small><strong>{beneficiary.next_renewal_date ? dateLabel(beneficiary.next_renewal_date) : tr.notRecorded}</strong></div>
                      <div><small>{tr.renewalPriority}</small><strong>{renewalPriority}</strong></div>
                    </div>
                    <div className="money-row">
                      <div><small>{tr.monthlySupport}</small><strong>{money(toNum(beneficiary.monthly_support_amount), beneficiary.currency)}</strong></div>
                      <div><small>{tr.responsibleOrg}</small><strong>{beneficiary.organization_name || tr.notRecorded}</strong></div>
                      <div><small>{tr.projectDocuments}</small><strong>{numberLabel(linkedDocuments)}</strong></div>
                    </div>
                    <div className="beneficiary-assurance">
                      <div><small>{tr.beneficiaryVerification}</small><strong>{tr.verificationNotRecorded}</strong></div>
                      <div>
                        <small>{tr.projectSupportHistory}</small>
                        <strong>{projectSupport.length > 0 ? `${tr.supportRecords}: ${numberLabel(projectSupport.length)}` : tr.noProjectSupportHistory}</strong>
                        {lastProjectSupport && <span>{tr.lastSupport}: {dateLabel(recordDate(lastProjectSupport))}</span>}
                      </div>
                      <p>{tr.projectLevelScope}</p>
                    </div>
                    <div className="card-actions">
                      <button type="button" onClick={() => setBeneficiaryDetails(beneficiary)} aria-label={tr.view}>{tr.view}</button>
                      <button type="button" onClick={() => openBeneficiaryEditor(beneficiary)} aria-label={tr.edit}>{tr.edit}</button>
                      <button type="button" onClick={() => setDonationProject(project ?? null)} disabled={!project} aria-label={tr.addSupport}>{tr.addSupport}</button>
                      <button type="button" onClick={() => deleteBeneficiary(beneficiary)} aria-label={tr.deleteAction}>{tr.deleteAction}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={CHARITY_PROJECTS_TABS_ID} value="documents" active={activeTab === 'documents'}>
        <section id="document-vault" className="warm-card document-vault">
          <div className="section-head vault-head">
            <div>
              <small>{tr.searchInsideSoon}</small>
              <h2>{tr.documentVault}</h2>
              <p>{tr.documentVaultDesc}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => {
              resetDocumentForm();
              setDocumentOpen(true);
            }}>
              <FileUp size={16} /> {tr.uploadDocument}
            </button>
          </div>

          <div className="document-tools">
            <label>
              <Search size={16} />
              <input
                value={documentSearch}
                onChange={e => {
                  setDocumentSearch(e.target.value);
                  setDocumentProjectFilter('');
                }}
                placeholder={tr.searchDocuments}
                aria-label={tr.searchDocuments}
              />
            </label>
            <select
              value={documentFilter}
              onChange={e => {
                setDocumentFilter(e.target.value as 'all' | DocumentCategory);
                setDocumentProjectFilter('');
              }}
              aria-label={tr.allCategories}
            >
              <option value="all">{tr.allCategories}</option>
              {documentCategories.map(category => <option key={category} value={category}>{tr[category]}</option>)}
            </select>
          </div>

          {filteredDocuments.length === 0 ? (
            <EmptyState
              className="charity-empty-state compact"
              icon={<FileText size={28} />}
              title={tr.noDocuments}
              description={tr.documentsEmptyBody}
              actions={(
                <button className="mini-gold" type="button" onClick={() => {
                  resetDocumentForm();
                  setDocumentOpen(true);
                }}>
                  <FileUp size={15} /> {tr.uploadDocument}
                </button>
              )}
            />
          ) : (
            <div className="document-grid">
              {filteredDocuments.map(document => {
                const linkedProject = charityImpactProjects.find(project => project.id === document.project_id)?.name;
                return (
                  <article className="document-card" key={document.id}>
                    <div className="document-icon"><FileText size={20} /></div>
                    <div className="document-body">
                      <strong>{document.title}</strong>
                      <span>{tr[document.category] ?? tr.other}</span>
                      <small>{document.file_name} • {formatFileSize(document.file_size)} • {dateLabel(document.uploaded_at)}</small>
                      {linkedProject && <em>{tr.projectName}: {linkedProject}</em>}
                      {document.notes && <p>{document.notes}</p>}
                    </div>
                    <div className="document-actions">
                      <button type="button" onClick={() => openDocument(document)} aria-label={tr.viewDocument}>{tr.viewDocument}</button>
                      <button type="button" onClick={() => openDocument(document, true)} aria-label={tr.downloadDocument}>{tr.downloadDocument}</button>
                      <button type="button" onClick={() => deleteDocument(document)} aria-label={tr.deleteDocument}>{tr.deleteDocument}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        </PageTabPanel>

        <PageTabPanel idBase={CHARITY_PROJECTS_TABS_ID} value="reports" active={activeTab === 'reports'}>
        {projectScope === 'zakat' ? (
          <section className="warm-card report-dashboard" id="zakat-project-reports">
            <CharitySectionHeader
              eyebrow={tr.zakat}
              title={tr.openZakatReport}
              description={tr.zakatProjectScope}
              icon={<FileText size={22} />}
            />
            <CharityEmptyState
              icon={<FileText size={28} />}
              title={tr.separateWorkflow}
              description={tr.zakatProjectScope}
              action={<button className="mini-gold" type="button" onClick={() => router.push('/zakat?tab=reports')}>{tr.openZakatReport}</button>}
            />
          </section>
        ) : (
        <section className="warm-card report-dashboard" id="charity-reports">
          <CharitySectionHeader
            eyebrow={tr.reports}
            title={tr.reports}
            description={tr.reportsDesc}
            icon={<FileText size={22} />}
          />
          <div className="report-toolbar">
            <label>
              <span>{tr.reportYear}</span>
              <select value={selectedReportYear} onChange={e => setSelectedReportYear(e.target.value)} aria-label={tr.reportYear}>
                {reportYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <div className="section-actions">
              <button className="mini-gold" type="button" onClick={() => router.push(`/charity-projects/report?year=${selectedReportYear}`)} disabled={!selectedYearHasReportData} aria-label={tr.exportPdf}>
                <FileText size={16} /> {tr.exportPdf}
              </button>
            </div>
          </div>
          <p className="aggregate-scope-note">{tr.aggregateCurrencyNote}</p>
          <table className="phase28-report-register">
            <caption>{tr.reportsLedger}</caption>
            <thead>
              <tr>
                <th scope="col">{tr.reportYear}</th><th scope="col">{tr.reportAmount}</th><th scope="col">{tr.reportCategory}</th><th scope="col">{tr.reportCalculation}</th>
                <th scope="col">{tr.reportPayment}</th><th scope="col">{tr.reportReceipt}</th><th scope="col">{tr.reportPdf}</th><th scope="col">{tr.reportStatus}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="phase28-report-row">
                <td data-label={tr.reportYear}>{selectedReportYear}</td>
                <td data-label={tr.reportAmount}><strong>{money(selectedReportAmount)}</strong></td>
                <td data-label={tr.reportCategory}>{tr.charityReport}</td>
                <td data-label={tr.reportCalculation}>Σ {tr.donationRecords}</td>
                <td data-label={tr.reportPayment}>{selectedReportDonations.length > 0 ? tr.recordedPayment : tr.notRecorded}</td>
                <td data-label={tr.reportReceipt}><button type="button" onClick={() => { setDocumentProjectFilter(''); setDocumentSearch(''); setDocumentFilter('donation_receipt'); setActiveTab('documents'); }} disabled={selectedReportReceipts.length === 0}>{selectedReportReceipts.length > 0 ? numberLabel(selectedReportReceipts.length) : tr.noReceipt}</button></td>
                <td data-label={tr.reportPdf}><button type="button" onClick={() => router.push(`/charity-projects/report?year=${selectedReportYear}`)} disabled={!selectedYearHasReportData}>{tr.exportPdf}</button></td>
                <td data-label={tr.reportStatus}><b>{selectedYearHasReportData ? tr.readyStatus : tr.needsDataStatus}</b></td>
              </tr>
              <tr className="phase28-report-row separate-workflow-row">
                <td data-label={tr.reportYear}>{selectedReportYear}</td>
                <td data-label={tr.reportAmount}><strong>{unavailableLabel}</strong></td>
                <td data-label={tr.reportCategory}>{tr.zakat}</td>
                <td data-label={tr.reportCalculation}>{tr.separateWorkflow}</td>
                <td data-label={tr.reportPayment}>{tr.separateWorkflow}</td>
                <td data-label={tr.reportReceipt}>{tr.separateWorkflow}</td>
                <td data-label={tr.reportPdf}><button type="button" onClick={() => router.push('/zakat?tab=reports')}>{tr.openZakatReport}</button></td>
                <td data-label={tr.reportStatus}><b>{tr.separateWorkflow}</b></td>
              </tr>
              <tr className="phase28-report-row separate-workflow-row">
                <td data-label={tr.reportYear}>{selectedReportYear}</td>
                <td data-label={tr.reportAmount}><strong>{unavailableLabel}</strong></td>
                <td data-label={tr.reportCategory}>{tr.khumsLabel}</td>
                <td data-label={tr.reportCalculation}>{tr.separateWorkflow}</td>
                <td data-label={tr.reportPayment}>{tr.separateWorkflow}</td>
                <td data-label={tr.reportReceipt}>{tr.separateWorkflow}</td>
                <td data-label={tr.reportPdf}><button type="button" onClick={() => router.push('/khums?tab=reports')}>{tr.openKhumsReport}</button></td>
                <td data-label={tr.reportStatus}><b>{tr.separateWorkflow}</b></td>
              </tr>
            </tbody>
          </table>
          {!selectedYearHasReportData && (
            <CharityEmptyState
              icon={<AlertTriangle size={28} />}
              title={tr.notEnoughReportData}
              description={tr.emptyReportsBody}
              action={(
                <button className="mini-gold" type="button" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
                  <Plus size={15} /> {tr.newProject}
                </button>
              )}
            />
          )}
          <div className="report-grid">
            <CharityReportCard
              icon={<FileText size={20} />}
              title={tr.yearlyCharityReport}
              description={tr.yearlyReportDesc}
              action={<button type="button" onClick={() => router.push(`/charity-projects/report?year=${selectedReportYear}`)} disabled={!selectedYearHasReportData}>{tr.generateReport}</button>}
            />
            <CharityReportCard
              icon={<HandCoins size={20} />}
              title={tr.donationsReport}
              description={tr.donationsReportDesc}
              action={<button type="button" onClick={() => router.push(`/charity-projects/report?year=${selectedReportYear}`)} disabled={!selectedYearHasReportData}>{tr.generateReport}</button>}
            />
            <CharityReportCard
              icon={<HeartHandshake size={20} />}
              title={tr.beneficiariesReport}
              description={tr.beneficiariesReportDesc}
              action={<button type="button" onClick={() => setActiveTab('beneficiaries')} disabled={charityBeneficiaries.length === 0}>{tr.beneficiaryTracking}</button>}
            />
            <CharityReportCard className="impact-report-card" icon={<Sparkles size={20} />} title={tr.impact} description={tr.incomeMissing}>
              <label className="impact-input"><span>{tr.donationAmount}</span><input inputMode="decimal" value={impactDonation} onChange={e => setImpactDonation(e.target.value)} placeholder="0.000" /></label>
              {incomeTotal <= 0 ? <p className="muted">{tr.incomeMissing}</p> : impactPct !== null && impactValue > 0 ? (
                <div className="impact-lines">
                  <p>{tr.donationPercent.replace('{pct}', impactPct.toFixed(1))}</p>
                  <p>{tr.remainingNet.replace('{amount}', money(remainingNet))}</p>
                  {impactPct > 20 && <p className="warn">{tr.highWarning}</p>}
                </div>
              ) : <p className="muted">{tr.incomeMissing}</p>}
            </CharityReportCard>
          </div>
        </section>
        )}
        </PageTabPanel>

        <PageTabPanel idBase={CHARITY_PROJECTS_TABS_ID} value="reminders" active={activeTab === 'reminders'}>
          <section className="warm-card reminders-section" id="upcoming-reminders-workspace">
            <div className="section-head vault-head">
              <div><small>{tr.charityReminders}</small><h2>{tr.upcomingReminders}</h2><p>{tr.reminderEmptyBody}</p></div>
              <button className="mini-gold" type="button" onClick={() => { resetReminderForm(); setReminderOpen(true); }}>
                <CalendarDays size={16} /> {tr.addReminder}
              </button>
            </div>
            {activeReminders.length === 0 ? (
              <EmptyState
                className="charity-empty-state compact"
                icon={<CalendarDays size={28} />}
                title={tr.noReminders}
                description={tr.reminderEmptyBody}
                actions={<button className="mini-gold" type="button" onClick={() => { resetReminderForm(); setReminderOpen(true); }}>{tr.addReminder}</button>}
              />
            ) : (
              <div className="reminder-grid phase28-reminder-grid">
                {activeReminders.map(reminder => (
                  <article className={`reminder-card ${reminder.priority}`} key={reminder.id}>
                    <div className="reminder-top"><div><strong>{reminder.title}</strong><span>{reminderTypeLabel(reminder.reminder_type)}</span></div><b>{tr[reminder.priority]}</b></div>
                    <div className="badge-row"><span>{dateLabel(reminder.due_date)}</span><span>{reminderTimingLabel(reminder)}</span></div>
                    {reminder.notes && <p>{reminder.notes}</p>}
                    <div className="card-actions">
                      <button type="button" onClick={() => updateReminderStatus(reminder, 'completed')}>{tr.completedAction}</button>
                      <button type="button" onClick={() => updateReminderStatus(reminder, 'dismissed')}>{tr.dismissAction}</button>
                      <button type="button" onClick={() => openReminderEditor(reminder)}>{tr.edit}</button>
                      <button type="button" onClick={() => deleteReminder(reminder)}>{tr.deleteAction}</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </PageTabPanel>
      </DashboardPageShell>


      <ProjectModal
        open={projectOpen}
        onClose={() => setProjectOpen(false)}
        tr={tr as Record<string, string>}
        lang={lang}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        organizations={organizations}
        organizationById={organizationById}
        organizationName={organizationName}
        verificationLabel={verificationLabel}
        selectedOrganization={selectedOrganization ?? undefined}
        manualOrganization={manualOrganization}
        setManualOrganization={setManualOrganization}
        saving={saving}
        saveProject={saveProject}
        categories={projectScope === 'zakat' ? categories.filter(category => category === 'zakat') : categories.filter(category => category !== 'zakat')}
        statuses={statuses}
      />

      <ReminderModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        tr={tr as Record<string, string>}
        lang={lang}
        reminderForm={reminderForm}
        setReminderForm={setReminderForm}
        projects={voluntaryProjects}
        assets={[]}
        commitments={voluntaryCommitments}
        saving={saving}
        saveReminder={saveReminder}
        resetReminderForm={resetReminderForm}
        reminderTypeLabel={reminderTypeLabel}
        reminderTypes={reminderTypes.filter(type => type !== 'zakat' && type !== 'hawl')}
        reminderPriorities={reminderPriorities}
      />

      <DocumentModal
        open={documentOpen}
        onClose={() => setDocumentOpen(false)}
        tr={tr as Record<string, string>}
        projects={charityImpactProjects}
        donations={charityDonations}
        assets={projectScope === 'zakat' ? assets : []}
        commitments={charityCommitments}
        documentForm={documentForm}
        setDocumentForm={setDocumentForm}
        documentFile={documentFile}
        setDocumentFile={setDocumentFile}
        uploadingDocument={uploadingDocument}
        uploadDocument={uploadDocument}
        money={money}
        toNum={toNum}
        formatFileSize={formatFileSize}
        documentCategories={projectScope === 'zakat' ? documentCategories : documentCategories.filter(category => category !== 'zakat_document')}
      />

      <BeneficiaryModal
        open={beneficiaryOpen}
        onClose={() => setBeneficiaryOpen(false)}
        tr={tr as Record<string, string>}
        lang={lang}
        beneficiaryForm={beneficiaryForm}
        setBeneficiaryForm={setBeneficiaryForm}
        projects={charityImpactProjects}
        documents={charityDocuments}
        saving={saving}
        saveBeneficiary={saveBeneficiary}
        resetBeneficiaryForm={resetBeneficiaryForm}
        beneficiaryDetails={beneficiaryDetails}
        setBeneficiaryDetails={setBeneficiaryDetails}
        money={money}
        toNum={toNum}
        dateLabel={dateLabel}
        beneficiaryCategories={beneficiaryCategories}
        beneficiaryStatuses={beneficiaryStatuses}
      />

      <BeneficiaryDetailsModal
        beneficiaryDetails={beneficiaryDetails}
        setBeneficiaryDetails={setBeneficiaryDetails}
        tr={tr as Record<string, string>}
        projects={charityImpactProjects}
        documents={charityDocuments}
        money={money}
        toNum={toNum}
        dateLabel={dateLabel}
      />

      <ContributorModal
        open={contributorOpen}
        onClose={() => setContributorOpen(false)}
        tr={tr as Record<string, string>}
        lang={lang}
        contributorForm={contributorForm}
        setContributorForm={setContributorForm}
        projects={charityImpactProjects}
        saving={saving}
        saveContributor={saveContributor}
        resetContributorForm={resetContributorForm}
        contributorRoles={contributorRoles}
        paymentStatuses={paymentStatuses}
      />

      {donationProject && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal small" role="dialog" aria-modal="true" aria-labelledby="charity-donation-modal-title">
            <div className="modal-head">
              <div>
                <span className="modal-kicker">{tr.donationAmount}</span>
                <h2 id="charity-donation-modal-title">{tr.addDonation}</h2>
              </div>
              <button type="button" aria-label={tr.cancel} onClick={() => setDonationProject(null)}><X size={18} /></button>
            </div>
            <label className="impact-input"><span>{donationProject.name}</span><input inputMode="decimal" value={donationAmount} onChange={e => setDonationAmount(e.target.value)} placeholder="0.000" /></label>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setDonationProject(null)}>{tr.cancel}</button>
              <button type="button" className="gold-btn" disabled={saving} onClick={saveDonation}>{tr.addDonation}</button>
            </div>
          </div>
        </div>
      )}

      <CharityStyles />
    </div>
  );
}
