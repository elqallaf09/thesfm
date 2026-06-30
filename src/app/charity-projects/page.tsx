'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  Calculator,
  CalendarDays,
  Coins,
  Eye,
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
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PageTabs } from '@/components/layout/PageTabs';
import { EmptyState } from '@/components/layout/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { personalExpenseRows, personalIncomeRows } from '@/lib/data/financeData';

import type { Lang, CharityProject, ZakatAsset, Commitment, ProjectDonation, CharityDocument, ReminderType, ReminderStatus, ReminderPriority, BeneficiaryCategory, BeneficiaryStatus, ContributorRole, PaymentStatus, AssetType, DocumentCategory, CharityOrganization, CharityImpactMetric, CharityReminder, MetalsPriceResponse, ZakatCalculation, CharityBeneficiary, CharityContributor, CharityProjectsTab, OrganizationType, VerificationStatus, ProjectCategory, ProjectStatus } from './_types';
import { TEXT } from './_text';
import { categories, statuses, assetTypes, documentCategories, reminderTypes, reminderPriorities, beneficiaryCategories, beneficiaryStatuses, contributorRoles, paymentStatuses, organizationTypes, verificationStatuses, goldKarats, nonZakatOptions, allowedDocumentTypes, maxDocumentSize, templates, today, addYear, addDays, daysUntil, toNum, recordDate, isYear, isCurrentMonth, formatFileSize, cleanFileName, estimatedHijriDate } from './_utils';
import { ProjectModal } from './_ProjectModal';
import { ReminderModal } from './_ReminderModal';
import { DocumentModal } from './_DocumentModal';
import { BeneficiaryModal, BeneficiaryDetailsModal } from './_BeneficiaryModal';
import { ContributorModal } from './_ContributorModal';
import { CharityStyles } from './_styles';

export default function CharityProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const tr = TEXT[lang as Lang] ?? TEXT.ar;
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const unavailableLabel = lang === 'fr' ? 'Indisponible' : lang === 'en' ? 'Unavailable' : 'غير متاح';
  const zakatShortcut = {
    ar: {
      title: 'إدارة الزكاة',
      description: 'انتقل إلى صفحة الزكاة لحساب النصاب، تتبع الحول، وحفظ حسابات الزكاة.',
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
    description: 'انتقل إلى صفحة الزكاة لحساب النصاب، تتبع الحول، وحفظ حسابات الزكاة.',
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
  const [zakatHistory, setZakatHistory] = useState<ZakatCalculation[]>([]);
  const [organizations, setOrganizations] = useState<CharityOrganization[]>([]);
  const [impactMetrics, setImpactMetrics] = useState<CharityImpactMetric[]>([]);
  const [incomeThisYear, setIncomeThisYear] = useState(0);
  const [incomeThisMonth, setIncomeThisMonth] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<CharityProjectsTab>('overview');
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
  const [exportingExcel, setExportingExcel] = useState(false);
  const [loadingMetals, setLoadingMetals] = useState(false);
  const [priceMode, setPriceMode] = useState<'automatic' | 'manual'>('manual');
  const [nisabMethod, setNisabMethod] = useState<'gold' | 'silver' | 'conservative'>('conservative');
  const [metalsPrice, setMetalsPrice] = useState<MetalsPriceResponse | null>(null);
  const [impactDonation, setImpactDonation] = useState('');
  const [selectedReportYear, setSelectedReportYear] = useState(String(new Date().getFullYear()));
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentFilter, setDocumentFilter] = useState<'all' | DocumentCategory>('all');
  const [documentProjectFilter, setDocumentProjectFilter] = useState('');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [beneficiaryStatusFilter, setBeneficiaryStatusFilter] = useState<'all' | BeneficiaryStatus>('all');
  const [beneficiaryCategoryFilter, setBeneficiaryCategoryFilter] = useState<'all' | BeneficiaryCategory>('all');
  const [contributorProjectFilter, setContributorProjectFilter] = useState('');
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [organizationTypeFilter, setOrganizationTypeFilter] = useState<'all' | OrganizationType>('all');
  const [organizationVerificationFilter, setOrganizationVerificationFilter] = useState<'all' | VerificationStatus>('all');
  const [manualOrganization, setManualOrganization] = useState(false);
  const [impactMetricForm, setImpactMetricForm] = useState({ project_id: '', metric_name: '', metric_value: '', metric_unit: '', notes: '' });
  const [zakat, setZakat] = useState({
    cash: '',
    investments: '',
    gold: '',
    silver: '',
    debts: '',
    goldPrice: '',
    silverPrice: '',
    goldGrams: '',
    goldKarat: '24',
    goldDirectValue: '',
    silverGrams: '',
    silverDirectValue: '',
    nonZakatAssets: [] as string[],
    nonZakatOther: '',
  });
  const [assetForm, setAssetForm] = useState({ asset_name: '', asset_type: 'cash' as AssetType, amount: '', ownership_date: today(), zakat_due_date: addYear(today()), is_zakatable: true, notes: '' });
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
  const dateLabel = useCallback((date?: string | null) => date ? new Date(`${date}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US') : '-', [lang]);

  const loadMetalsPrices = useCallback(async () => {
    setLoadingMetals(true);
    try {
      const response = await fetch('/api/charity-projects/metals-prices');
      const data = await response.json() as MetalsPriceResponse;
      setMetalsPrice(data);
      if (data.success && data.source === 'api') {
        setPriceMode('automatic');
        setZakat(prev => ({
          ...prev,
          goldPrice: String(data.gold.pricePerGram24k || data.gold.pricePerGram || ''),
          silverPrice: String(data.silver.pricePerGram || ''),
        }));
      } else {
        setPriceMode('manual');
      }
    } catch {
      setPriceMode('manual');
      setMetalsPrice({
        success: false,
        source: 'manual',
        message: tr.apiNotConfigured,
        currency: 'KWD',
        gold: { pricePerGram: 0, unit: 'gram' },
        silver: { pricePerGram: 0, unit: 'gram' },
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setLoadingMetals(false);
    }
  }, [tr.apiNotConfigured]);

  const syncGeneratedReminders = useCallback(async (
    currentReminders: CharityReminder[],
    currentProjects: CharityProject[],
    currentAssets: ZakatAsset[],
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
    currentAssets.forEach(asset => {
      if (!asset.zakat_due_date || !asset.is_zakatable) return;
      const key = ['zakat', '', asset.id, '', asset.zakat_due_date].join('|');
      if (!exists.has(key)) generated.push({
        user_id: user.id,
        title: `${tr.zakat} - ${asset.asset_name}`,
        reminder_type: 'zakat',
        related_zakat_asset_id: asset.id,
        due_date: asset.zakat_due_date,
        hijri_date: estimatedHijriDate(asset.zakat_due_date, lang as Lang) || null,
        remind_before_days: 30,
        priority: 'high',
        notes: tr.hijriEstimated,
      });
    });
    currentCommitments.forEach(commitment => {
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
    currentProjects.forEach(project => {
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
  }, [db, lang, tr.commitments, tr.endDate, tr.hijriEstimated, tr.zakat, user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [projectRes, assetRes, commitmentRes, donationRes, documentRes, reminderRes, beneficiaryRes, contributorRes, zakatHistoryRes, organizationRes, impactMetricRes, legacyRes, incomeRes, expenseRes] = await Promise.all([
        db.from('charity_projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('zakat_assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('charity_commitments').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        db.from('charity_project_donations').select('*').eq('user_id', user.id).order('donation_date', { ascending: false }),
        db.from('charity_documents').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false }),
        db.from('charity_reminders').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
        db.from('charity_beneficiaries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('charity_project_contributors').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('zakat_calculations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
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
      const legacyDonations = legacyRes.error ? [] : (legacyRes.data ?? []).map((row: any): ProjectDonation => ({
        id: row.id,
        project_id: null,
        amount: toNum(row.amount),
        currency: 'KWD',
        donation_date: row.created_at,
        donation_type: 'charity',
        notes: row.name || null,
        created_at: row.created_at,
      }));
      if (!donationRes.error) setDonations([...(donationRes.data ?? []) as ProjectDonation[], ...legacyDonations]);
      if (!documentRes.error) setDocuments((documentRes.data ?? []) as CharityDocument[]);
      if (!beneficiaryRes.error) setBeneficiaries((beneficiaryRes.data ?? []) as CharityBeneficiary[]);
      if (!contributorRes.error) setContributors((contributorRes.data ?? []) as CharityContributor[]);
      if (!zakatHistoryRes.error) setZakatHistory((zakatHistoryRes.data ?? []) as ZakatCalculation[]);
      if (!organizationRes.error) setOrganizations((organizationRes.data ?? []) as CharityOrganization[]);
      if (!impactMetricRes.error) setImpactMetrics((impactMetricRes.data ?? []) as CharityImpactMetric[]);
      if (!reminderRes.error) {
        setReminders(loadedReminders);
        await syncGeneratedReminders(loadedReminders, loadedProjects, loadedAssets, loadedCommitments);
        const refreshed = await db.from('charity_reminders').select('*').eq('user_id', user.id).order('due_date', { ascending: true });
        if (!refreshed.error) setReminders((refreshed.data ?? []) as CharityReminder[]);
      }
      if (!incomeRes.error) {
        const rows = personalIncomeRows(incomeRes.data ?? []);
        const currentYear = new Date().getFullYear();
        setIncomeTotal(rows.reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
        setIncomeThisYear(rows.filter((row: any) => isYear(recordDate(row), currentYear)).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
        setIncomeThisMonth(rows.filter((row: any) => isCurrentMonth(recordDate(row))).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
      }
      if (!expenseRes.error) setExpenseTotal(personalExpenseRows(expenseRes.data ?? []).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
    } catch {
      setMessage(tr.error);
    }
  }, [db, syncGeneratedReminders, tr.error, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const savedGold = window.localStorage.getItem('sfm_charity_gold_price_kwd') ?? '';
    const savedSilver = window.localStorage.getItem('sfm_charity_silver_price_kwd') ?? '';
    const savedMethod = window.localStorage.getItem('sfm_charity_nisab_method');
    if (savedGold || savedSilver) {
      setZakat(prev => ({ ...prev, goldPrice: savedGold, silverPrice: savedSilver }));
    }
    if (savedMethod && ['gold', 'silver', 'conservative'].includes(savedMethod)) setNisabMethod(savedMethod as 'gold' | 'silver' | 'conservative');
    loadMetalsPrices();
  }, [loadMetalsPrices]);

  useEffect(() => {
    window.localStorage.setItem('sfm_charity_gold_price_kwd', zakat.goldPrice);
    window.localStorage.setItem('sfm_charity_silver_price_kwd', zakat.silverPrice);
  }, [zakat.goldPrice, zakat.silverPrice]);

  useEffect(() => {
    window.localStorage.setItem('sfm_charity_nisab_method', nisabMethod);
  }, [nisabMethod]);

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

  const goldPricesByKarat = {
    '24': toNum(zakat.goldPrice),
    '22': (metalsPrice?.gold.pricePerGram22k && metalsPrice.gold.pricePerGram22k > 0) ? metalsPrice.gold.pricePerGram22k : toNum(zakat.goldPrice) * (22 / 24),
    '21': (metalsPrice?.gold.pricePerGram21k && metalsPrice.gold.pricePerGram21k > 0) ? metalsPrice.gold.pricePerGram21k : toNum(zakat.goldPrice) * (21 / 24),
    '18': (metalsPrice?.gold.pricePerGram18k && metalsPrice.gold.pricePerGram18k > 0) ? metalsPrice.gold.pricePerGram18k : toNum(zakat.goldPrice) * (18 / 24),
  };
  const selectedGoldGramPrice = goldPricesByKarat[zakat.goldKarat as keyof typeof goldPricesByKarat] || 0;
  const zakatableGoldValue = toNum(zakat.goldDirectValue) > 0 ? toNum(zakat.goldDirectValue) : toNum(zakat.goldGrams) * selectedGoldGramPrice;
  const zakatableSilverValue = toNum(zakat.silverDirectValue) > 0 ? toNum(zakat.silverDirectValue) : toNum(zakat.silverGrams) * toNum(zakat.silverPrice);
  const zakatableAmount = Math.max(0, toNum(zakat.cash) + toNum(zakat.investments) + zakatableGoldValue + zakatableSilverValue - toNum(zakat.debts));
  const goldNisabValue = toNum(zakat.goldPrice) * 85;
  const silverNisabValue = toNum(zakat.silverPrice) * 595;
  const availableNisabValues = [goldNisabValue, silverNisabValue].filter(value => value > 0);
  const selectedNisabValue = nisabMethod === 'gold'
    ? goldNisabValue
    : nisabMethod === 'silver'
      ? silverNisabValue
      : availableNisabValues.length > 0 ? Math.min(...availableNisabValues) : 0;
  const hasCriticalPriceData = goldNisabValue > 0 && silverNisabValue > 0;
  const reachedNisab = selectedNisabValue > 0 && zakatableAmount >= selectedNisabValue;
  const zakatAmount = reachedNisab ? zakatableAmount * 0.025 : 0;
  const nisabDifference = selectedNisabValue > 0 ? zakatableAmount - selectedNisabValue : 0;
  const closeToNisab = selectedNisabValue > 0 && !reachedNisab && zakatableAmount >= selectedNisabValue * 0.85;
  const priceSourceLabel = metalsPrice?.source === 'api'
    ? tr.automaticPrice
    : metalsPrice?.source === 'fallback'
      ? tr.failedStatus
      : tr.manualPrice;
  const tValue = (key: string, fallback = key) => (tr as Record<string, string>)[key] ?? fallback;
  const reminderTypeLabel = (type: ReminderType) => type === 'general' ? tr.other : tValue(type, tr.other);
  const assetTypeLabel = (type: AssetType) => {
    if (type === 'savings') return tr.cashSavings;
    if (type === 'investment') return tr.investments;
    if (type === 'non_zakat') return tr.nonZakat;
    return tValue(type, tr.other);
  };
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
  const nisabMethodLabel = (method: string) => method === 'gold'
    ? tr.goldBased
    : method === 'silver'
      ? tr.silverBased
      : method === 'conservative'
        ? tr.conservative
        : method;
  const totalDonations = projects.reduce((sum, project) => sum + toNum(project.collected_amount), 0);
  const activeProjects = projects.filter(project => !['completed', 'paused'].includes(project.status)).length;
  const currentYear = new Date().getFullYear();
  const completedProjectsCount = projects.filter(project => project.status === 'completed').length;
  const donationsThisYear = donations.filter(donation => isYear(donation.donation_date || donation.created_at, currentYear));
  const donationsThisMonth = donations.filter(donation => isCurrentMonth(donation.donation_date || donation.created_at));
  const totalDonatedThisYear = donationsThisYear.reduce((sum, donation) => sum + toNum(donation.amount), 0);
  const totalDonatedThisMonth = donationsThisMonth.reduce((sum, donation) => sum + toNum(donation.amount), 0);
  const monthlySponsorshipsTotal = beneficiaries.filter(beneficiary => beneficiary.status === 'active').reduce((sum, beneficiary) => sum + toNum(beneficiary.monthly_support_amount), 0);
  const latestEstimatedZakat = zakatHistory[0]?.zakat_due ?? zakatAmount;
  const givingIncomeRatioYear = incomeThisYear > 0 ? (totalDonatedThisYear / incomeThisYear) * 100 : null;
  const givingIncomeRatioMonth = incomeThisMonth > 0 ? (totalDonatedThisMonth / incomeThisMonth) * 100 : null;
  const hasImpactData = projects.length > 0 || donations.length > 0 || beneficiaries.length > 0 || commitments.length > 0 || zakatHistory.length > 0 || impactMetrics.length > 0;
  const monthLabels = useMemo(() => Array.from({ length: 12 }, (_, index) => new Date(currentYear, index, 1).toLocaleDateString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' })), [currentYear, lang]);
  const impactByMonth = useMemo(() => monthLabels.map((label, index) => {
    const donationAmount = donations.filter(donation => {
      const value = donation.donation_date || donation.created_at;
      if (!isYear(value, currentYear)) return false;
      return new Date(`${value!.slice(0, 10)}T00:00:00`).getMonth() === index;
    }).reduce((sum, donation) => sum + toNum(donation.amount), 0);
    const sponsorshipAmount = beneficiaries.filter(beneficiary => beneficiary.status === 'active').reduce((sum, beneficiary) => sum + toNum(beneficiary.monthly_support_amount), 0);
    return { label, donationAmount, sponsorshipAmount };
  }), [beneficiaries, currentYear, donations, monthLabels]);
  const maxImpactMonth = Math.max(1, ...impactByMonth.map(item => item.donationAmount + item.sponsorshipAmount));
  const impactByCategory = useMemo(() => categories.map(category => {
    const projectCollected = projects.filter(project => project.category === category).reduce((sum, project) => sum + toNum(project.collected_amount), 0);
    const donationAmount = donations.filter(donation => donation.donation_type === category).reduce((sum, donation) => sum + toNum(donation.amount), 0);
    return { category, amount: projectCollected + donationAmount };
  }).filter(item => item.amount > 0), [donations, projects]);
  const maxImpactCategory = Math.max(1, ...impactByCategory.map(item => item.amount));
  const beneficiaryByCategory = beneficiaryCategories.map(category => ({
    category,
    count: beneficiaries.filter(beneficiary => beneficiary.category === category).length,
  })).filter(item => item.count > 0);
  const impactMetricsByProject = useMemo(() => impactMetrics.reduce<Record<string, CharityImpactMetric[]>>((acc, metric) => {
    acc[metric.project_id] = [...(acc[metric.project_id] || []), metric];
    return acc;
  }, {}), [impactMetrics]);
  const expectedCommitments = commitments.reduce((sum, item) => {
    const amount = toNum(item.amount);
    if (item.frequency === 'monthly') return sum + amount * 12;
    if (item.frequency === 'annual') return sum + amount;
    return sum + amount;
  }, 0) + projects.filter(project => project.status !== 'completed').reduce((sum, project) => sum + Math.max(0, toNum(project.target_amount) - toNum(project.collected_amount)), 0) + toNum(latestEstimatedZakat);
  const nextDue = assets.map(asset => asset.zakat_due_date).filter(Boolean).sort()[0];
  const reportYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    const add = (value?: string | null) => {
      if (!value) return;
      const year = new Date(`${value.slice(0, 10)}T00:00:00`).getFullYear();
      if (Number.isFinite(year)) years.add(year);
    };
    projects.forEach(project => {
      add(project.start_date);
      add(project.end_date);
    });
    assets.forEach(asset => add(asset.zakat_due_date || asset.ownership_date));
    commitments.forEach(commitment => add(commitment.next_due_date));
    donations.forEach(donation => add(donation.donation_date || donation.created_at));
    return Array.from(years).sort((a, b) => b - a);
  }, [assets, commitments, donations, projects]);
  const impactValue = toNum(impactDonation);
  const impactPct = incomeTotal > 0 && impactValue > 0 ? (impactValue / incomeTotal) * 100 : null;
  const remainingNet = incomeTotal - expenseTotal - impactValue;
  const hasReportData = projects.length > 0 || assets.length > 0 || commitments.length > 0 || donations.length > 0;
  const filteredDocuments = documents.filter(document => {
    const query = documentSearch.trim().toLowerCase();
    const matchesSearch = !query || [document.title, document.file_name, document.notes ?? ''].some(value => value.toLowerCase().includes(query));
    const matchesFilter = documentFilter === 'all' || document.category === documentFilter;
    const matchesProject = !documentProjectFilter || document.project_id === documentProjectFilter;
    return matchesSearch && matchesFilter && matchesProject;
  });
  const projectDocumentCounts = useMemo(() => documents.reduce<Record<string, number>>((acc, document) => {
    if (document.project_id) acc[document.project_id] = (acc[document.project_id] || 0) + 1;
    return acc;
  }, {}), [documents]);
  const projectBeneficiaryCounts = useMemo(() => beneficiaries.reduce<Record<string, number>>((acc, beneficiary) => {
    if (beneficiary.project_id) acc[beneficiary.project_id] = (acc[beneficiary.project_id] || 0) + 1;
    return acc;
  }, {}), [beneficiaries]);
  const filteredBeneficiaries = beneficiaries.filter(beneficiary => {
    const query = beneficiarySearch.trim().toLowerCase();
    const matchesSearch = !query || [beneficiary.display_name, beneficiary.reference_code ?? '', beneficiary.organization_name ?? '', beneficiary.country ?? ''].some(value => value.toLowerCase().includes(query));
    const matchesStatus = beneficiaryStatusFilter === 'all' || beneficiary.status === beneficiaryStatusFilter;
    const matchesCategory = beneficiaryCategoryFilter === 'all' || beneficiary.category === beneficiaryCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
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
  const organizationProjectCounts = useMemo(() => projects.reduce<Record<string, number>>((acc, project) => {
    if (project.organization_id) acc[project.organization_id] = (acc[project.organization_id] || 0) + 1;
    return acc;
  }, {}), [projects]);
  const activeBeneficiaries = beneficiaries.filter(beneficiary => beneficiary.status === 'active');
  const monthlySupportTotal = activeBeneficiaries.reduce((sum, beneficiary) => sum + toNum(beneficiary.monthly_support_amount), 0);
  const upcomingRenewals = beneficiaries.filter(beneficiary => beneficiary.next_renewal_date && daysUntil(beneficiary.next_renewal_date) <= 45 && daysUntil(beneficiary.next_renewal_date) >= 0);
  const projectContributorCounts = useMemo(() => contributors.reduce<Record<string, number>>((acc, contributor) => {
    acc[contributor.project_id] = (acc[contributor.project_id] || 0) + 1;
    return acc;
  }, {}), [contributors]);
  const filteredContributors = contributorProjectFilter ? contributors.filter(contributor => contributor.project_id === contributorProjectFilter) : contributors;
  const totalPledged = filteredContributors.reduce((sum, contributor) => sum + toNum(contributor.pledged_amount), 0);
  const totalPaid = filteredContributors.reduce((sum, contributor) => sum + toNum(contributor.paid_amount), 0);
  const lateContributors = filteredContributors.filter(contributor => contributor.due_date && daysUntil(contributor.due_date) < 0 && ['pending', 'partial'].includes(contributor.payment_status));
  const topContributor = filteredContributors.slice().sort((a, b) => toNum(b.paid_amount) - toNum(a.paid_amount))[0];
  const activeReminders = reminders
    .filter(reminder => reminder.status === 'active')
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const urgentReminders = activeReminders.filter(reminder => daysUntil(reminder.due_date) <= reminder.remind_before_days).slice(0, 3);
  const nextReminder = activeReminders[0] ?? null;
  const nextCharityDueDate = nextReminder?.due_date ?? nextDue ?? null;
  const calendarCards = [
    {
      icon: ShieldCheck,
      title: tr.nextZakatDue,
      value: nextDue ? dateLabel(nextDue) : unavailableLabel,
      description: nextDue ? tr.hijriEstimated : tr.zakatCalendarEmptyHint,
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
    setProjectForm({ name: '', category: 'ongoing', status: 'planning', target_amount: '', collected_amount: '', currency: 'KWD', start_date: today(), end_date: '', organization_id: '', organization_name: '', notes: '' });
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

  const saveAsset = async () => {
    if (!user || !assetForm.asset_name.trim()) return;
    const { error } = await db.from('zakat_assets').insert({
      user_id: user.id,
      ...assetForm,
      amount: toNum(assetForm.amount),
      zakat_due_date: assetForm.zakat_due_date || addYear(assetForm.ownership_date),
    });
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.saved);
      setAssetForm({ asset_name: '', asset_type: 'cash', amount: '', ownership_date: today(), zakat_due_date: addYear(today()), is_zakatable: true, notes: '' });
      loadData();
    }
  };

  const toggleNonZakatAsset = (asset: string) => {
    setZakat(prev => ({
      ...prev,
      nonZakatAssets: prev.nonZakatAssets.includes(asset)
        ? prev.nonZakatAssets.filter(item => item !== asset)
        : [...prev.nonZakatAssets, asset],
    }));
  };

  const saveZakatCalculation = async () => {
    if (!user) return;
    setSaving(true);
    const notes = [
      zakat.nonZakatAssets.length > 0 ? `${tr.nonZakatableAssets}: ${zakat.nonZakatAssets.map(asset => tr[asset as keyof typeof tr] ?? asset).join(', ')}` : '',
      zakat.nonZakatOther ? `${tr.other}: ${zakat.nonZakatOther}` : '',
    ].filter(Boolean).join(' | ');
    const { error } = await db.from('zakat_calculations').insert({
      user_id: user.id,
      currency: 'KWD',
      cash_amount: toNum(zakat.cash),
      investment_amount: toNum(zakat.investments),
      gold_value: zakatableGoldValue,
      silver_value: zakatableSilverValue,
      deductible_debts: toNum(zakat.debts),
      net_zakat_base: zakatableAmount,
      nisab_method: nisabMethod,
      gold_nisab_value: goldNisabValue,
      silver_nisab_value: silverNisabValue,
      selected_nisab_value: selectedNisabValue,
      zakat_due: zakatAmount,
      price_source: metalsPrice?.source ?? 'manual',
      notes: notes || null,
    });
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.calculationSaved);
    loadData();
  };

  const deleteZakatCalculation = async (calculation: ZakatCalculation) => {
    if (!user) return;
    const { error } = await db.from('zakat_calculations').delete().eq('id', calculation.id).eq('user_id', user.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.calculationDeleted);
      loadData();
    }
  };

  const saveImpactMetric = async () => {
    if (!user || !impactMetricForm.project_id || !impactMetricForm.metric_name.trim()) return;
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
    const { error } = await db.from('charity_project_donations').insert({
      user_id: user.id,
      project_id: donationProject.id,
      organization_id: donationProject.organization_id || null,
      amount,
      currency: donationProject.currency,
      donation_date: today(),
      donation_type: donationProject.category,
    });
    if (!error) {
      await db.from('charity_projects')
        .update({ collected_amount: toNum(donationProject.collected_amount) + amount })
        .eq('id', donationProject.id)
        .eq('user_id', user.id);
    }
    setSaving(false);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.saved);
      setDonationProject(null);
      setDonationAmount('');
      loadData();
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
    if (!user || !contributorForm.project_id || !contributorForm.contributor_name.trim()) return;
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

  const exportExcel = async () => {
    setExportingExcel(true);
    setMessage(hasReportData ? tr.preparingExcel : tr.emptyReportExported);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('No active session');
      const response = await fetch(`/api/charity-projects/export?year=${selectedReportYear}&format=csv&lang=${lang}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `charity-report-${selectedReportYear}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(tr.excelExported);
    } catch {
      setMessage(tr.excelExportFailed);
    } finally {
      setExportingExcel(false);
    }
  };

  const summaryCards = [
    { icon: HeartHandshake, label: tr.activeProjects, value: numberLabel(activeProjects) },
    { icon: HandCoins, label: tr.totalDonations, value: safeMoney(totalDonations) },
    { icon: CalendarDays, label: tr.nextDueDateKpi, value: nextCharityDueDate ? dateLabel(nextCharityDueDate) : unavailableLabel },
    { icon: Gift, label: tr.beneficiariesCountKpi, value: numberLabel(beneficiaries.length) },
    { icon: ShieldCheck, label: tr.upcomingRemindersKpi, value: numberLabel(activeReminders.length) },
  ];
  const charityTabs = [
    { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : lang === 'fr' ? 'Aperçu' : 'Overview' },
    { id: 'projects', label: tr.projects, count: projects.length },
    { id: 'beneficiaries', label: tr.beneficiaryTracking, count: beneficiaries.length },
    { id: 'contributors', label: tr.contributors, count: contributors.length },
    { id: 'documents', label: tr.documentVault, count: documents.length },
    { id: 'impact', label: tr.impactDashboard },
    { id: 'reports', label: tr.reports },
  ];

  return (
    <div className="charity-projects-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell contentClassName="charity-projects-content">
        <section className="cp-hero">
          <div>
            <span>{tr.breadcrumb}</span>
            <h1>{tr.title}</h1>
            <p>{tr.subtitle}</p>
          </div>
          <div className="hero-actions">
            <button className="gold-btn" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
              <Plus size={17} /> {tr.newProject}
            </button>
            <a className="dark-btn" href="/zakat">
              <Calculator size={17} /> {tr.zakatCalculator}
            </a>
            <a className="dark-btn" href="/documents">
              <FileText size={17} /> {tr.documentsCenter}
            </a>
            <LanguageSwitcher variant="dark" compact />
          </div>
        </section>

        {message && <div className="notice">{message}</div>}

        <section className="summary-grid">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <article className="warm-card summary-card" key={card.label}>
                <span><Icon size={18} /></span>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
              </article>
            );
          })}
        </section>

        <PageTabs
          tabs={charityTabs}
          active={activeTab}
          onChange={id => setActiveTab(id as CharityProjectsTab)}
          ariaLabel={tr.title}
          className="charity-tabs"
        />

        <section className="warm-card hijri-calendar" hidden={activeTab !== 'overview'}>
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
              <button className="ghost-btn" type="button" onClick={() => {
                document.getElementById('upcoming-reminders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>
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

        <section className="warm-card reminders-section" id="upcoming-reminders" hidden={activeTab !== 'overview'}>
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
                const relatedProject = projects.find(project => project.id === reminder.related_project_id)?.name;
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

        <section className="main-grid" hidden={activeTab !== 'projects'}>
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
          <article id="zakat-calculator" className="warm-card span-7">
            <div className="section-head">
              <div><small>2.5%</small><h2>{tr.smartZakat}</h2></div>
              <Coins size={24} />
            </div>
            <div className="zakat-premium-grid">
              <section className="zakat-panel">
                <h3>{tr.zakatInputs}</h3>
                <div className="form-grid">
                  <label><span>{tr.cashSavings}</span><input inputMode="decimal" value={zakat.cash} onChange={e => setZakat(prev => ({ ...prev, cash: e.target.value }))} placeholder="0.000" /></label>
                  <label><span>{tr.zakatableInvestments}</span><input inputMode="decimal" value={zakat.investments} onChange={e => setZakat(prev => ({ ...prev, investments: e.target.value }))} placeholder="0.000" /></label>
                  <label><span>{tr.debts}</span><input inputMode="decimal" value={zakat.debts} onChange={e => setZakat(prev => ({ ...prev, debts: e.target.value }))} placeholder="0.000" /></label>
                  <label><span>{tr.nisabMethod}</span><select value={nisabMethod} onChange={e => setNisabMethod(e.target.value as 'gold' | 'silver' | 'conservative')}><option value="gold">{tr.goldBased}</option><option value="silver">{tr.silverBased}</option><option value="conservative">{tr.conservative}</option></select></label>
                </div>
                <div className="asset-input-box">
                  <strong>{tr.goldHoldings}</strong>
                  <div className="form-grid">
                    <label><span>{tr.goldWeight}</span><input inputMode="decimal" value={zakat.goldGrams} onChange={e => setZakat(prev => ({ ...prev, goldGrams: e.target.value }))} placeholder="0" /></label>
                    <label><span>{tr.goldKarat}</span><select value={zakat.goldKarat} onChange={e => setZakat(prev => ({ ...prev, goldKarat: e.target.value }))}>{goldKarats.map(karat => <option key={karat} value={karat}>{karat}K</option>)}</select></label>
                    <label className="wide"><span>{tr.directGoldValue}</span><input inputMode="decimal" value={zakat.goldDirectValue} onChange={e => setZakat(prev => ({ ...prev, goldDirectValue: e.target.value }))} placeholder="0.000" /></label>
                  </div>
                </div>
                <div className="asset-input-box">
                  <strong>{tr.silverHoldings}</strong>
                  <div className="form-grid">
                    <label><span>{tr.silverWeight}</span><input inputMode="decimal" value={zakat.silverGrams} onChange={e => setZakat(prev => ({ ...prev, silverGrams: e.target.value }))} placeholder="0" /></label>
                    <label><span>{tr.directSilverValue}</span><input inputMode="decimal" value={zakat.silverDirectValue} onChange={e => setZakat(prev => ({ ...prev, silverDirectValue: e.target.value }))} placeholder="0.000" /></label>
                  </div>
                </div>
                <div className="non-zakat-box">
                  <strong>{tr.nonZakatableAssets}</strong>
                  <p>{tr.nonZakatHelper}</p>
                  <div className="chip-grid" role="group" aria-label={tr.nonZakatableAssets}>
                    {nonZakatOptions.map(option => (
                      <button
                        key={option}
                        type="button"
                        className={zakat.nonZakatAssets.includes(option) ? 'chip active' : 'chip'}
                        onClick={() => toggleNonZakatAsset(option)}
                        aria-pressed={zakat.nonZakatAssets.includes(option)}
                      >
                        {option === 'other' ? tr.other : tr[option]}
                      </button>
                    ))}
                  </div>
                  {zakat.nonZakatAssets.includes('other') && (
                    <label className="other-asset-input"><span>{tr.otherNonZakatAsset}</span><input value={zakat.nonZakatOther} onChange={e => setZakat(prev => ({ ...prev, nonZakatOther: e.target.value }))} /></label>
                  )}
                </div>
              </section>

              <section className="zakat-panel summary-panel">
                <h3>{tr.zakatSummaryTitle}</h3>
                <div className="price-status-grid">
                  <div className="price-card">
                    <small>{tr.goldPriceToday}</small>
                    <strong>{toNum(zakat.goldPrice) > 0 ? money(toNum(zakat.goldPrice)) : '-'}</strong>
                    <span>{metalsPrice?.success ? tr.liveStatus : tr.failedStatus}</span>
                  </div>
                  <div className="price-card">
                    <small>{tr.silverPriceToday}</small>
                    <strong>{toNum(zakat.silverPrice) > 0 ? money(toNum(zakat.silverPrice)) : '-'}</strong>
                    <span>{metalsPrice?.success ? tr.liveStatus : tr.failedStatus}</span>
                  </div>
                </div>
                <div className="price-meta">
                  <span>{tr.priceSource}: {priceSourceLabel}</span>
                  <span>{tr.lastUpdated}: {metalsPrice?.updatedAt ? dateLabel(metalsPrice.updatedAt) : '-'}</span>
                </div>
                <button className="primary-wide" type="button" onClick={loadMetalsPrices} disabled={loadingMetals} aria-label={tr.refreshPrices}>
                  <Sparkles size={16} /> {loadingMetals ? tr.automaticPrice : tr.refreshPrices}
                </button>
                {(!metalsPrice?.success || priceMode === 'manual') && (
                  <div className="manual-price-box">
                    <p>{tr.manualFallback}</p>
                    <div className="form-grid">
                      <label><span>{tr.goldPrice}</span><input inputMode="decimal" value={zakat.goldPrice} onChange={e => setZakat(prev => ({ ...prev, goldPrice: e.target.value }))} placeholder="0.000" /></label>
                      <label><span>{tr.silverPrice}</span><input inputMode="decimal" value={zakat.silverPrice} onChange={e => setZakat(prev => ({ ...prev, silverPrice: e.target.value }))} placeholder="0.000" /></label>
                    </div>
                  </div>
                )}
                <div className="result-grid">
                  <div><small>{tr.netZakatBase}</small><strong>{money(zakatableAmount)}</strong></div>
                  <div><small>{tr.goldNisab}</small><strong>{goldNisabValue > 0 ? money(goldNisabValue) : tr.enterPriceManually}</strong></div>
                  <div><small>{tr.silverNisab}</small><strong>{silverNisabValue > 0 ? money(silverNisabValue) : tr.enterPriceManually}</strong></div>
                  <div><small>{tr.usedNisab}</small><strong>{selectedNisabValue > 0 ? money(selectedNisabValue) : tr.enterPriceManually}</strong></div>
                  <div><small>{tr.differenceFromNisab}</small><strong>{selectedNisabValue > 0 ? money(Math.abs(nisabDifference)) : '-'}</strong></div>
                  <div><small>{tr.zakatRate}</small><strong>2.5%</strong></div>
                  <div className={reachedNisab ? 'nisab-reached' : 'nisab-missing'}><small>{tr.reachedNisabQuestion}</small><strong>{hasCriticalPriceData ? (reachedNisab ? tr.reachedNisab : tr.notReachedNisab) : tr.incompleteZakat}</strong></div>
                  <div><small>{tr.zakatDue}</small><strong>{hasCriticalPriceData ? money(zakatAmount) : '-'}</strong></div>
                </div>
                <p className="zakat-outcome">{hasCriticalPriceData ? (reachedNisab ? `${tr.dueSummary} ${money(zakatAmount)}` : tr.notDueSummary) : tr.incompleteZakat}</p>
              </section>

              <section className="zakat-panel guidance-panel">
                <h3>{tr.zakatGuidanceTitle}</h3>
                <div className="guidance-list">
                  {!hasCriticalPriceData && <p><AlertTriangle size={16} /> {tr.missingPricesNote}</p>}
                  {reachedNisab && <p><ShieldCheck size={16} /> {tr.aboveNisabNote}</p>}
                  {closeToNisab && <p><Sparkles size={16} /> {tr.closeToNisabNote}</p>}
                  {toNum(zakat.debts) > 0 && <p><Coins size={16} /> {tr.highDebtsNote}</p>}
                  <p><FileText size={16} /> {tr.zakatEstimateDisclaimer}</p>
                </div>
                <div className="hawl-mini-list">
                  <strong>{tr.hawlTracking}</strong>
                  {assets.length === 0 ? <span>{tr.noZakatHistory}</span> : assets.slice(0, 4).map(asset => {
                    const dueDays = asset.zakat_due_date ? daysUntil(asset.zakat_due_date) : null;
                    const label = !asset.ownership_date ? tr.missingOwnershipDate : dueDays !== null && dueDays <= 0 ? tr.completedHawl : tr.upcomingHawl;
                    return <div key={asset.id}><b>{asset.asset_name}</b><small>{label} • {dateLabel(asset.zakat_due_date || asset.ownership_date)}</small></div>;
                  })}
                </div>
                <button className="primary-wide" type="button" disabled={saving || !user} onClick={saveZakatCalculation}>
                  <Save size={16} /> {tr.saveZakatCalculation}
                </button>
                <p className="disclaimer">{tr.metalsDisclaimer}</p>
              </section>
            </div>

            <div className="zakat-history">
              <div className="section-head"><h3>{tr.zakatHistory}</h3></div>
              {zakatHistory.length === 0 ? <p className="muted">{tr.noZakatHistory}</p> : zakatHistory.map(item => (
                <div className="history-row" key={item.id}>
                  <span>{dateLabel(item.calculation_date)}</span>
                  <span>{money(toNum(item.net_zakat_base), item.currency)}</span>
                  <span>{nisabMethodLabel(item.nisab_method)}</span>
                  <strong>{money(toNum(item.zakat_due), item.currency)}</strong>
                  <small>{item.price_source || '-'}</small>
                  <button type="button" onClick={() => deleteZakatCalculation(item)} aria-label={tr.deleteAction}>{tr.deleteAction}</button>
                </div>
              ))}
            </div>
          </article>

          <article className="warm-card span-5">
            <div className="section-head">
              <div><small>Hijri MVP</small><h2>{tr.hawlTracking}</h2></div>
              <CalendarDays size={24} />
            </div>
            <div className="form-grid one">
              <label><span>{tr.assetName}</span><input value={assetForm.asset_name} onChange={e => setAssetForm(prev => ({ ...prev, asset_name: e.target.value }))} /></label>
              <label><span>{tr.assetType}</span><select value={assetForm.asset_type} onChange={e => setAssetForm(prev => ({ ...prev, asset_type: e.target.value as AssetType, is_zakatable: e.target.value !== 'non_zakat' }))}>{assetTypes.map(type => <option key={type} value={type}>{assetTypeLabel(type)}</option>)}</select></label>
              <label><span>{tr.target}</span><input inputMode="decimal" value={assetForm.amount} onChange={e => setAssetForm(prev => ({ ...prev, amount: e.target.value }))} /></label>
              <label><span>{tr.ownershipDate}</span><input type="date" value={assetForm.ownership_date} onChange={e => setAssetForm(prev => ({ ...prev, ownership_date: e.target.value, zakat_due_date: addYear(e.target.value) }))} /></label>
              <label><span>{tr.dueDate}</span><input type="date" value={assetForm.zakat_due_date} onChange={e => setAssetForm(prev => ({ ...prev, zakat_due_date: e.target.value }))} /></label>
              <label className="check-row"><input type="checkbox" checked={assetForm.is_zakatable} onChange={e => setAssetForm(prev => ({ ...prev, is_zakatable: e.target.checked }))} /><span>{tr.reminder}</span></label>
              <button className="primary-wide" onClick={saveAsset}><Save size={16} /> {tr.addAsset}</button>
            </div>
          </article>
        </section>

        <section className="split-grid" hidden={activeTab !== 'projects'}>
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
        </section>

        <section className="warm-card" id="charity-organization-directory" hidden={activeTab !== 'projects'}>
          <div className="vault-head section-head">
            <div>
              <h2>{tr.organizationDirectory}</h2>
              <p>{tr.organizationDirectoryDesc}</p>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="document-tools">
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
            <div className="empty-state compact">
              <ShieldCheck size={40} />
              <strong>{tr.organizationDirectory}</strong>
              <p>{tr.noOrganizationsAvailable}</p>
            </div>
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

        <section className="warm-card" id="impact-dashboard" hidden={activeTab !== 'impact' && activeTab !== 'overview'}>
          <div className="vault-head section-head">
            <div>
              <h2>{tr.impactDashboard}</h2>
              <p>{tr.impactDashboardDesc}</p>
            </div>
            <Sparkles size={22} />
          </div>
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
              <div className="impact-summary-grid">
                <div><small>{tr.totalDonated}</small><strong>{money(totalDonatedThisYear)}</strong></div>
                <div><small>{tr.activeCharityProjects}</small><strong>{activeProjects.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
                <div><small>{tr.completedProjects}</small><strong>{completedProjectsCount.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
                <div><small>{tr.beneficiariesSupported}</small><strong>{beneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
                <div><small>{tr.monthlySponsorships}</small><strong>{money(monthlySponsorshipsTotal)}</strong></div>
                <div><small>{tr.estimatedZakatImpact}</small><strong>{money(toNum(latestEstimatedZakat))}</strong></div>
              </div>

              <div className="impact-layout">
                <article className="impact-panel">
                  <h3>{tr.givingIncomeRatio}</h3>
                  {givingIncomeRatioYear === null ? <p className="muted">{tr.addIncomeForGivingRatio}</p> : (
                    <div className="ratio-grid">
                      <div><small>{tr.thisYear}</small><strong>{givingIncomeRatioYear.toFixed(1)}%</strong></div>
                      <div><small>{tr.currentMonth}</small><strong>{givingIncomeRatioMonth === null ? '-' : `${givingIncomeRatioMonth.toFixed(1)}%`}</strong></div>
                      <p>{tr.referenceBenchmark}: 2.5% / 10%</p>
                    </div>
                  )}
                </article>
                <article className="impact-panel">
                  <h3>{tr.yearlyImpactSummary}</h3>
                  <div className="impact-lines">
                    <p>{tr.totalDonated}: {money(totalDonatedThisYear)}</p>
                    <p>{tr.projects}: {projects.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
                    <p>{tr.beneficiariesSupported}: {beneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
                    <p>{tr.monthlySponsorships}: {money(monthlySponsorshipsTotal)}</p>
                  </div>
                </article>
              </div>

              <div className="impact-layout">
                <article className="impact-panel">
                  <h3>{tr.impactOverTime}</h3>
                  <div className="impact-bars" role="img" aria-label={tr.impactOverTime}>
                    {impactByMonth.map(month => {
                      const total = month.donationAmount + month.sponsorshipAmount;
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
                <div className="project-impact-grid">
                  {projects.map(project => {
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
                    <label><span>{tr.linkedProject}</span><select value={impactMetricForm.project_id} onChange={e => setImpactMetricForm(prev => ({ ...prev, project_id: e.target.value }))}><option value="">-</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
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

        <section className="warm-card" hidden={activeTab !== 'projects'}>
          <div className="section-head"><h2>{tr.projects}</h2><button className="mini-gold" onClick={() => setProjectOpen(true)}><Plus size={15} /> {tr.newProject}</button></div>
          {projects.length === 0 ? (
            <div className="empty-state">
              <HeartHandshake size={44} />
              <strong>{tr.emptyTitle}</strong>
              <p>{tr.emptyBody}</p>
              <button className="mini-gold" type="button" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
                <Plus size={15} /> {tr.newProject}
              </button>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map(project => {
                const target = toNum(project.target_amount);
                const collected = toNum(project.collected_amount);
                const progress = target > 0 ? Math.min(100, (collected / target) * 100) : 0;
                const projectContributors = contributors.filter(contributor => contributor.project_id === project.id);
                const contributorPaid = projectContributors.reduce((sum, contributor) => sum + toNum(contributor.paid_amount), 0);
                const contributorCoverage = target > 0 ? Math.min(100, (contributorPaid / target) * 100) : 0;
                const projectOrganization = project.organization_id ? organizationById[project.organization_id] : null;
                return (
                  <article className="project-card" key={project.id}>
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
                    <div className="progress"><i style={{ width: `${progress}%` }} /></div>
                    <div className="money-row">
                      <div><small>{tr.target}</small><strong>{money(target, project.currency)}</strong></div>
                      <div><small>{tr.collected}</small><strong>{money(collected, project.currency)}</strong></div>
                      <div><small>{tr.remaining}</small><strong>{money(Math.max(0, target - collected), project.currency)}</strong></div>
                    </div>
                    {projectContributors.length > 0 && (
                      <div className="collab-strip">
                        <span>{tr.contributorPayments}: {money(contributorPaid, project.currency)}</span>
                        <span>{tr.projectCoverage}: {contributorCoverage.toFixed(1)}%</span>
                      </div>
                    )}
                    {project.notes && <p>{project.notes}</p>}
                    <button
                      className="doc-count-btn"
                      type="button"
                      aria-label={tr.documentsCount.replace('{count}', String(projectDocumentCounts[project.id] || 0))}
                      onClick={() => {
                        setDocumentFilter('all');
                        setDocumentSearch('');
                        setDocumentProjectFilter(project.id);
                        window.setTimeout(() => window.document.getElementById('document-vault')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                      }}
                    >
                      {tr.documentsCount.replace('{count}', String(projectDocumentCounts[project.id] || 0))}
                    </button>
                    <button
                      className="doc-count-btn"
                      type="button"
                      aria-label={tr.beneficiariesCount.replace('{count}', String(projectBeneficiaryCounts[project.id] || 0))}
                      onClick={() => {
                        setBeneficiarySearch(project.name);
                        setBeneficiaryStatusFilter('all');
                        setBeneficiaryCategoryFilter('all');
                        window.setTimeout(() => window.document.getElementById('beneficiary-tracking')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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
                        window.setTimeout(() => window.document.getElementById('family-collaboration')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                      }}
                    >
                      {tr.contributorsCount.replace('{count}', String(projectContributorCounts[project.id] || 0))}
                    </button>
                    <div className="card-actions">
                      <button aria-label={tr.view}><Eye size={15} /> {tr.view}</button>
                      <button onClick={() => setDonationProject(project)} aria-label={tr.addDonation}><HandCoins size={15} /> {tr.addDonation}</button>
                      <button onClick={() => { resetContributorForm(project.id); setContributorOpen(true); }} aria-label={tr.addContributor}>{tr.addContributor}</button>
                      <button aria-label={tr.edit}><Pencil size={15} /> {tr.edit}</button>
                      <button onClick={() => archiveProject(project)} aria-label={tr.archive}><Archive size={15} /> {tr.archive}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="family-collaboration" className="warm-card family-collaboration" hidden={activeTab !== 'contributors'}>
          <div className="section-head vault-head">
            <div>
              <small>{tr.invitationsSoon}</small>
              <h2>{tr.familyCollaboration}</h2>
              <p>{tr.collaborationDesc}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => {
              resetContributorForm(contributorProjectFilter || projects[0]?.id || '');
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
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button type="button" onClick={() => { resetContributorForm(contributorProjectFilter || projects[0]?.id || ''); setContributorOpen(true); }}>{tr.addContributor}</button>
          </div>
          <div className="beneficiary-stats">
            <div><small>{tr.contributors}</small><strong>{filteredContributors.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
            <div><small>{tr.totalPledged}</small><strong>{money(totalPledged)}</strong></div>
            <div><small>{tr.totalPaid}</small><strong>{money(totalPaid)}</strong></div>
            <div><small>{tr.lateContribution}</small><strong>{lateContributors.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
          </div>
          {topContributor && <p className="nisab"><HandCoins size={15} /> {tr.topContributor}: {topContributor.contributor_name} - {money(toNum(topContributor.paid_amount), topContributor.currency)}</p>}
          {filteredContributors.length === 0 ? (
            <div className="empty-state compact">
              <HandCoins size={38} />
              <strong>{tr.invitationsSoon}</strong>
              <p>{tr.collaborationDesc}</p>
              <button className="mini-gold" type="button" onClick={() => {
                resetContributorForm(contributorProjectFilter || projects[0]?.id || '');
                setContributorOpen(true);
              }}>{tr.addContributor}</button>
            </div>
          ) : (
            <div className="contributor-grid">
              {filteredContributors.map(contributor => {
                const project = projects.find(item => item.id === contributor.project_id);
                const target = toNum(project?.target_amount);
                const percent = target > 0 ? (toNum(contributor.paid_amount) / target) * 100 : 0;
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
                      <div><small>{tr.projectCoverage}</small><strong>{percent.toFixed(1)}%</strong></div>
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

        <section id="beneficiary-tracking" className="warm-card beneficiary-tracking" hidden={activeTab !== 'beneficiaries'}>
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
            <div><small>{tr.totalBeneficiaries}</small><strong>{beneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
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
          </div>
          {filteredBeneficiaries.length === 0 ? (
            <div className="empty-state compact">
              <HeartHandshake size={38} />
              <strong>{tr.noBeneficiaries}</strong>
              <p>{tr.beneficiaryDesc}</p>
              <button className="mini-gold" type="button" onClick={() => {
                resetBeneficiaryForm();
                setBeneficiaryOpen(true);
              }}>{tr.addBeneficiary}</button>
            </div>
          ) : (
            <div className="beneficiary-grid">
              {filteredBeneficiaries.map(beneficiary => {
                const project = projects.find(item => item.id === beneficiary.project_id);
                const linkedDocuments = documents.filter(document => document.project_id && document.project_id === beneficiary.project_id).length;
                return (
                  <article className="beneficiary-card" key={beneficiary.id}>
                    <div className="project-top">
                      <div>
                        <strong>{beneficiary.display_name}</strong>
                        <span>{beneficiary.reference_code || tr.privacyNote}</span>
                      </div>
                      <b className={`status ${beneficiary.status}`}>{tr[beneficiary.status]}</b>
                    </div>
                    <div className="badge-row">
                      <span>{tr[beneficiary.category]}</span>
                      {project && <span>{project.name}</span>}
                      {beneficiary.next_renewal_date && <span>{tr.nextRenewal}: {dateLabel(beneficiary.next_renewal_date)}</span>}
                    </div>
                    <div className="money-row">
                      <div><small>{tr.monthlySupport}</small><strong>{money(toNum(beneficiary.monthly_support_amount), beneficiary.currency)}</strong></div>
                      <div><small>{tr.responsibleOrg}</small><strong>{beneficiary.organization_name || '-'}</strong></div>
                      <div><small>{tr.linkedDocuments}</small><strong>{linkedDocuments}</strong></div>
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

        <section id="document-vault" className="warm-card document-vault" hidden={activeTab !== 'documents'}>
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
            <div className="empty-state compact">
              <FileText size={38} />
              <strong>{tr.noDocuments}</strong>
              <p>{tr.documentVaultDesc}</p>
              <button className="mini-gold" type="button" onClick={() => {
                resetDocumentForm();
                setDocumentOpen(true);
              }}>
                <FileUp size={15} /> {tr.uploadDocument}
              </button>
            </div>
          ) : (
            <div className="document-grid">
              {filteredDocuments.map(document => {
                const linkedProject = projects.find(project => project.id === document.project_id)?.name;
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

        <section className="split-grid" hidden={activeTab !== 'reports'}>
          <article className="warm-card">
            <div className="section-head"><h2>{tr.impact}</h2><AlertTriangle size={22} /></div>
            <label className="impact-input"><span>{tr.donationAmount}</span><input inputMode="decimal" value={impactDonation} onChange={e => setImpactDonation(e.target.value)} placeholder="0.000" /></label>
            {incomeTotal <= 0 ? <p className="muted">{tr.incomeMissing}</p> : impactPct !== null && impactValue > 0 ? (
              <div className="impact-lines">
                <p>{tr.donationPercent.replace('{pct}', impactPct.toFixed(1))}</p>
                <p>{tr.remainingNet.replace('{amount}', money(remainingNet))}</p>
                {impactPct > 20 && <p className="warn">{tr.highWarning}</p>}
              </div>
            ) : <p className="muted">{tr.incomeMissing}</p>}
          </article>

          <article className="warm-card" id="charity-reports">
            <div className="section-head"><h2>{tr.futureTitle}</h2><Sparkles size={22} /></div>
            <div className="report-card">
              <div>
                <strong>{tr.annualPdfReport}</strong>
                <span>{tr.reportYear}</span>
              </div>
              <select value={selectedReportYear} onChange={e => setSelectedReportYear(e.target.value)} aria-label={tr.reportYear}>
                {reportYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              <button type="button" onClick={() => router.push(`/charity-projects/report?year=${selectedReportYear}`)} aria-label={tr.generateReport}>
                <FileText size={16} /> {tr.generateReport}
              </button>
              <button type="button" onClick={exportExcel} disabled={exportingExcel} aria-label={tr.exportExcel}>
                <FileText size={16} /> {exportingExcel ? tr.preparingExcel : tr.exportExcel}
              </button>
            </div>
          </article>
        </section>
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
        categories={categories}
        statuses={statuses}
      />

      <ReminderModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        tr={tr as Record<string, string>}
        lang={lang}
        reminderForm={reminderForm}
        setReminderForm={setReminderForm}
        projects={projects}
        assets={assets}
        commitments={commitments}
        saving={saving}
        saveReminder={saveReminder}
        resetReminderForm={resetReminderForm}
        reminderTypeLabel={reminderTypeLabel}
        reminderTypes={reminderTypes}
        reminderPriorities={reminderPriorities}
      />

      <DocumentModal
        open={documentOpen}
        onClose={() => setDocumentOpen(false)}
        tr={tr as Record<string, string>}
        projects={projects}
        donations={donations}
        assets={assets}
        commitments={commitments}
        documentForm={documentForm}
        setDocumentForm={setDocumentForm}
        documentFile={documentFile}
        setDocumentFile={setDocumentFile}
        uploadingDocument={uploadingDocument}
        uploadDocument={uploadDocument}
        money={money}
        toNum={toNum}
        formatFileSize={formatFileSize}
        documentCategories={documentCategories}
      />

      <BeneficiaryModal
        open={beneficiaryOpen}
        onClose={() => setBeneficiaryOpen(false)}
        tr={tr as Record<string, string>}
        lang={lang}
        beneficiaryForm={beneficiaryForm}
        setBeneficiaryForm={setBeneficiaryForm}
        projects={projects}
        documents={documents}
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
        projects={projects}
        documents={documents}
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
        projects={projects}
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
              <h2 id="charity-donation-modal-title">{tr.addDonation}</h2>
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
