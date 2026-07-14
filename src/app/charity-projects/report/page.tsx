'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CircleAlert, Info, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { formatMoney } from '@/lib/formatMoney';

type Lang = 'ar' | 'en' | 'fr';

type Project = {
  id: string;
  name: string;
  category: string | null;
  status: string | null;
  target_amount: number | null;
  collected_amount: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  organization_name: string | null;
  notes: string | null;
  created_at: string | null;
};

type Donation = {
  id: string;
  project_id: string | null;
  project_name?: string;
  amount: number | null;
  currency: string | null;
  donation_date: string | null;
  donation_type: string | null;
  notes: string | null;
  created_at: string | null;
  date_scope?: 'recorded-date' | 'encoded-month';
  encoded_month?: string | null;
};

type Commitment = {
  id: string;
  name: string;
  amount: number | null;
  currency: string | null;
  frequency: string | null;
  next_due_date: string | null;
  category: string | null;
  status: string | null;
};

type Beneficiary = {
  id: string;
  project_id: string | null;
  display_name: string | null;
  category: string | null;
  status: string | null;
  monthly_support_amount: number | null;
  currency: string | null;
  sponsorship_start_date: string | null;
  sponsorship_end_date: string | null;
  created_at: string | null;
  scope?: 'annual' | 'project';
};

type ImpactMetric = {
  id: string;
  project_id: string;
  metric_name: string;
  metric_value: number | null;
  metric_unit: string | null;
  notes: string | null;
  created_at: string | null;
  scope?: 'annual' | 'project';
};

type LegacyCharityRow = {
  id: string;
  name: string | null;
  amount: number | null;
  created_at: string | null;
};

const LEGACY_CHARITY_PREFIX = '\u062e\u064a\u0631\u064a\u0629';
const KWD = 'KWD';

const TEXT = {
  ar: {
    title: 'التقرير السنوي للأعمال الخيرية',
    preview: 'سجل خيري مستقل وقابل للطباعة',
    print: 'طباعة / حفظ PDF',
    back: 'العودة إلى التقارير',
    generatedOn: 'تاريخ الإنشاء',
    year: 'السنة',
    user: 'المستخدم',
    executive: 'الملخص التنفيذي',
    projects: 'المشاريع الخيرية ضمن السنة',
    donations: 'سجل التبرعات',
    commitments: 'الالتزامات الخيرية المتوقعة',
    impact: 'ملخص الأثر',
    totalDonations: 'تبرعات KWD خلال السنة',
    projectCount: 'المشاريع المتداخلة مع السنة',
    completedProjects: 'المشاريع المكتملة',
    expectedCommitments: 'التزامات KWD المتوقعة',
    linkedDonations: 'عدد التبرعات',
    noData: 'لا توجد بيانات خيرية ضمن هذا النطاق.',
    loading: 'جارٍ إعداد التقرير الخيري…',
    loadError: 'تعذر تحميل بعض بيانات التقرير. أعد المحاولة قبل اعتماد النسخة المطبوعة.',
    target: 'الهدف',
    collected: 'المحصّل',
    progress: 'التقدم',
    organization: 'الجهة',
    dates: 'فترة المشروع',
    date: 'فترة التبرع',
    amount: 'المبلغ',
    type: 'الفئة',
    project: 'المشروع',
    notes: 'الملاحظات',
    status: 'الحالة',
    frequency: 'التكرار',
    nextDue: 'الاستحقاق التالي',
    beneficiary: 'المستفيد',
    support: 'الدعم الشهري',
    scope: 'نطاق السجل',
    monthlyAnnualized: 'التزامات KWD الشهرية × 12',
    annualCommitments: 'التزامات KWD الأخرى',
    totalExpected: 'إجمالي التزامات KWD المتوقعة',
    impactEmpty: 'لا توجد بيانات أثر خيري موثقة ضمن هذا النطاق.',
    beneficiaries: 'المستفيدون المرتبطون بالمشاريع',
    beneficiaryCount: 'عدد المستفيدين',
    annualizedSupport: 'دعم KWD الشهري × 12',
    customMetrics: 'مؤشرات الأثر المرتبطة بالمشاريع',
    currencyScopeTitle: 'نطاق العملة',
    currencyScope: 'تُجمع الأرقام المالية فقط عندما تكون العملة مسجلة صراحةً بالدينار الكويتي (KWD). تبقى العملات الأخرى أو غير المحددة ظاهرة في الصفوف التفصيلية ولا تُحوّل أو تُضاف إلى الإجماليات.',
    intervalScope: 'يظهر المشروع عندما تتداخل فترة بدايته ونهايته مع السنة المحددة. عند غياب تاريخ البداية، يُستخدم تاريخ إنشاء المشروع كبداية موثقة.',
    annualScope: 'ضمن السنة',
    projectScope: 'مرتبط بمشروع ضمن السنة — لا يوجد تاريخ صالح للسجل',
    projectScopedBeneficiaries: 'سجلات المستفيدين التي لا تتضمن فترة رعاية صالحة تُعرض فقط لارتباطها بمشروع متداخل مع السنة، ولا تُعامل كسجلات سنوية مؤكدة.',
    projectScopedImpact: 'مؤشرات الأثر التي لا تتضمن تاريخاً صالحاً تُعرض فقط لارتباطها بمشروع متداخل مع السنة، ولا تُعامل كقياسات سنوية مؤكدة.',
    encodedMonth: 'الشهر المسجل في قيد التبرع',
    recordedDate: 'تاريخ التبرع',
    unknownCurrency: 'عملة غير محددة',
    reportBoundary: 'هذا تقرير خيري فقط. لا يتضمن حسابات الزكاة أو الخمس ولا يجمع قواعدهما أو مبالغهما.',
    disclaimer: 'أُنشئ هذا التقرير بواسطة THE SFM للتنظيم والمتابعة الشخصية. وهو ليس فتوى شرعية ولا تقريراً مالياً رسمياً ما لم تراجعه جهة مختصة.',
  },
  en: {
    title: 'Annual Charity Report',
    preview: 'Independent, printable charity ledger',
    print: 'Print / Save PDF',
    back: 'Back to reports',
    generatedOn: 'Generated on',
    year: 'Year',
    user: 'User',
    executive: 'Executive Summary',
    projects: 'Charity projects in year scope',
    donations: 'Donation records',
    commitments: 'Expected charity commitments',
    impact: 'Impact summary',
    totalDonations: 'KWD donations in year',
    projectCount: 'Projects overlapping the year',
    completedProjects: 'Completed projects',
    expectedCommitments: 'Expected KWD commitments',
    linkedDonations: 'Donation records',
    noData: 'No charity data exists in this scope.',
    loading: 'Preparing the charity report…',
    loadError: 'Some report data could not be loaded. Try again before relying on the printed copy.',
    target: 'Target',
    collected: 'Raised',
    progress: 'Progress',
    organization: 'Organization',
    dates: 'Project interval',
    date: 'Donation period',
    amount: 'Amount',
    type: 'Category',
    project: 'Project',
    notes: 'Notes',
    status: 'Status',
    frequency: 'Frequency',
    nextDue: 'Next due',
    beneficiary: 'Beneficiary',
    support: 'Monthly support',
    scope: 'Record scope',
    monthlyAnnualized: 'Monthly KWD commitments × 12',
    annualCommitments: 'Other KWD commitments',
    totalExpected: 'Total expected KWD commitments',
    impactEmpty: 'No verified charity impact data exists in this scope.',
    beneficiaries: 'Project-linked beneficiaries',
    beneficiaryCount: 'Beneficiary count',
    annualizedSupport: 'Monthly KWD support × 12',
    customMetrics: 'Project-linked impact indicators',
    currencyScopeTitle: 'Currency scope',
    currencyScope: 'Financial totals include only records explicitly stored in Kuwaiti dinar (KWD). Other or missing currencies remain visible in detail rows and are neither converted nor added to totals.',
    intervalScope: 'A project appears when its start-to-end interval overlaps the selected year. If no start date exists, the project creation date is used as the documented start.',
    annualScope: 'Selected-year record',
    projectScope: 'Project-scoped — no usable record date',
    projectScopedBeneficiaries: 'Beneficiary records without a usable sponsorship interval appear only because they link to a project overlapping the year; they are not presented as confirmed annual records.',
    projectScopedImpact: 'Impact metrics without a usable date appear only because they link to a project overlapping the year; they are not presented as confirmed annual measurements.',
    encodedMonth: 'Month encoded in donation record',
    recordedDate: 'Donation date',
    unknownCurrency: 'Currency not recorded',
    reportBoundary: 'This is a charity-only report. It excludes Zakat and Khums calculations and never combines their rules or amounts.',
    disclaimer: 'This report was generated by THE SFM for personal organization and tracking. It is not a religious ruling or official financial report unless reviewed by a qualified authority.',
  },
  fr: {
    title: 'Rapport caritatif annuel',
    preview: 'Registre caritatif indépendant et imprimable',
    print: 'Imprimer / Enregistrer en PDF',
    back: 'Retour aux rapports',
    generatedOn: 'Généré le',
    year: 'Année',
    user: 'Utilisateur',
    executive: 'Résumé exécutif',
    projects: "Projets caritatifs dans le périmètre de l’année",
    donations: 'Registre des dons',
    commitments: 'Engagements caritatifs prévus',
    impact: "Résumé de l’impact",
    totalDonations: "Dons en KWD pendant l’année",
    projectCount: "Projets chevauchant l’année",
    completedProjects: 'Projets terminés',
    expectedCommitments: 'Engagements prévus en KWD',
    linkedDonations: 'Nombre de dons',
    noData: 'Aucune donnée caritative dans ce périmètre.',
    loading: 'Préparation du rapport caritatif…',
    loadError: "Certaines données n’ont pas pu être chargées. Réessayez avant d’utiliser la copie imprimée.",
    target: 'Objectif',
    collected: 'Collecté',
    progress: 'Progression',
    organization: 'Organisation',
    dates: 'Période du projet',
    date: 'Période du don',
    amount: 'Montant',
    type: 'Catégorie',
    project: 'Projet',
    notes: 'Notes',
    status: 'Statut',
    frequency: 'Fréquence',
    nextDue: 'Prochaine échéance',
    beneficiary: 'Bénéficiaire',
    support: 'Soutien mensuel',
    scope: 'Périmètre',
    monthlyAnnualized: 'Engagements mensuels en KWD × 12',
    annualCommitments: 'Autres engagements en KWD',
    totalExpected: 'Total des engagements prévus en KWD',
    impactEmpty: "Aucune donnée d’impact caritatif vérifiée dans ce périmètre.",
    beneficiaries: 'Bénéficiaires liés aux projets',
    beneficiaryCount: 'Nombre de bénéficiaires',
    annualizedSupport: 'Soutien mensuel en KWD × 12',
    customMetrics: "Indicateurs d’impact liés aux projets",
    currencyScopeTitle: 'Périmètre monétaire',
    currencyScope: 'Les totaux financiers incluent uniquement les enregistrements explicitement libellés en dinar koweïtien (KWD). Les autres devises, ou les devises absentes, restent visibles dans les lignes détaillées et ne sont ni converties ni additionnées.',
    intervalScope: "Un projet apparaît lorsque son intervalle de début à fin chevauche l’année sélectionnée. Sans date de début, la date de création du projet sert de début documenté.",
    annualScope: "Enregistrement de l’année",
    projectScope: 'Lié au projet — aucune date exploitable',
    projectScopedBeneficiaries: "Les bénéficiaires sans période de parrainage exploitable apparaissent uniquement parce qu’ils sont liés à un projet chevauchant l’année ; ils ne sont pas présentés comme des enregistrements annuels confirmés.",
    projectScopedImpact: "Les indicateurs sans date exploitable apparaissent uniquement parce qu’ils sont liés à un projet chevauchant l’année ; ils ne sont pas présentés comme des mesures annuelles confirmées.",
    encodedMonth: 'Mois encodé dans le don',
    recordedDate: 'Date du don',
    unknownCurrency: 'Devise non renseignée',
    reportBoundary: 'Ce rapport est exclusivement caritatif. Il exclut les calculs de Zakat et de Khums et ne combine jamais leurs règles ou leurs montants.',
    disclaimer: "Ce rapport a été généré par THE SFM à des fins d’organisation et de suivi personnel. Il ne constitue ni un avis religieux ni un rapport financier officiel sans validation par une autorité compétente.",
  },
} as const;

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizedCurrency(value?: string | null) {
  const code = String(value ?? '').trim().toUpperCase();
  return code || null;
}

function isExplicitKwd(value?: string | null) {
  return normalizedCurrency(value) === KWD;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const dayMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dayMatch
    ? new Date(Date.UTC(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3])))
    : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function yearBounds(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  };
}

function overlapsYear(startValue: string | null, endValue: string | null, year: number, fallbackStart?: string | null) {
  const { start: yearStart, end: yearEnd } = yearBounds(year);
  const start = parseDate(startValue) ?? parseDate(fallbackStart);
  const end = parseDate(endValue);
  if (!start && !end) return false;
  return (!start || start <= yearEnd) && (!end || end >= yearStart);
}

function hasUsableInterval(startValue?: string | null, endValue?: string | null) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  return Boolean((start || end) && (!start || !end || start <= end));
}

function isInYear(value: string | null | undefined, year: number) {
  const date = parseDate(value);
  return Boolean(date && date.getUTCFullYear() === year);
}

function encodedMonthFromLegacyName(value?: string | null) {
  const month = String(value ?? '').split(':')[1] ?? '';
  return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month) ? month : null;
}

function isZakat(value?: string | null) {
  return String(value ?? '').trim().toLowerCase() === 'zakat';
}

function isKhums(value?: string | null) {
  return String(value ?? '').trim().toLowerCase() === 'khums';
}

function isVoluntaryCharity(value?: string | null) {
  return !isZakat(value) && !isKhums(value);
}

function selectedReportYear(raw: string | null) {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2200 ? parsed : new Date().getFullYear();
}

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const language = (lang === 'en' || lang === 'fr' ? lang : 'ar') as Lang;
  const tr = TEXT[language];
  const db = supabase as any;
  const selectedYear = selectedReportYear(searchParams?.get('year') ?? null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [impactMetrics, setImpactMetrics] = useState<ImpactMetric[]>([]);
  const [projectNames, setProjectNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const locale = language === 'ar' ? 'ar-KW-u-nu-latn' : language === 'fr' ? 'fr-FR-u-nu-latn' : 'en-US-u-nu-latn';
  const number = useCallback((value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value), [locale]);
  const money = useCallback((amount: number, currency?: string | null) => {
    const code = normalizedCurrency(currency);
    return code ? formatMoney(amount, code, language) : `${number(amount)} · ${tr.unknownCurrency}`;
  }, [language, number, tr.unknownCurrency]);
  const dateLabel = useCallback((value?: string | null) => {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) : '—';
  }, [locale]);
  const monthLabel = useCallback((value?: string | null) => {
    const match = String(value ?? '').match(/^(\d{4})-(\d{2})$/);
    if (!match) return '—';
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (authLoading) return;
      if (!user) {
        if (!cancelled) {
          setProjects([]);
          setDonations([]);
          setCommitments([]);
          setBeneficiaries([]);
          setImpactMetrics([]);
          setProjectNames(new Map());
          setLoadFailed(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setLoadFailed(false);
      const [projectRes, donationRes, commitmentRes, beneficiaryRes, metricRes, legacyRes] = await Promise.all([
        db.from('charity_projects').select('*').eq('user_id', user.id),
        db.from('charity_project_donations').select('*').eq('user_id', user.id),
        db.from('charity_commitments').select('*').eq('user_id', user.id),
        db.from('charity_beneficiaries').select('*').eq('user_id', user.id),
        db.from('charity_project_impact_metrics').select('*').eq('user_id', user.id),
        db.from('expense_items').select('id,name,amount,created_at').eq('user_id', user.id).like('name', `${LEGACY_CHARITY_PREFIX}:%`),
      ]);
      if (cancelled) return;

      const hasError = [projectRes, donationRes, commitmentRes, beneficiaryRes, metricRes, legacyRes].some(result => Boolean(result.error));
      const loadedProjects = projectRes.error ? [] : (projectRes.data ?? []) as Project[];
      const charityProjects = loadedProjects.filter(project => isVoluntaryCharity(project.category));
      const charityProjectIds = new Set(charityProjects.map(project => project.id));
      const annualProjects = charityProjects.filter(project => overlapsYear(project.start_date, project.end_date, selectedYear, project.created_at));
      const annualProjectIds = new Set(annualProjects.map(project => project.id));
      const names = new Map(charityProjects.map(project => [project.id, project.name]));

      const linkedDonations = (donationRes.error ? [] : (donationRes.data ?? []) as Donation[])
        .filter(donation => isVoluntaryCharity(donation.donation_type) && (!donation.project_id || charityProjectIds.has(donation.project_id)))
        .filter(donation => isInYear(donation.donation_date ?? donation.created_at, selectedYear))
        .map(donation => ({
          ...donation,
          project_name: donation.project_id ? names.get(donation.project_id) : undefined,
          date_scope: 'recorded-date' as const,
        }));

      const legacyDonations = (legacyRes.error ? [] : (legacyRes.data ?? []) as LegacyCharityRow[])
        .map((row): Donation => {
          const encodedMonth = encodedMonthFromLegacyName(row.name);
          const nameParts = String(row.name ?? '').split(':');
          return {
            id: row.id,
            project_id: null,
            project_name: undefined,
            amount: safeNumber(row.amount),
            currency: KWD,
            donation_date: encodedMonth ? `${encodedMonth}-01` : null,
            donation_type: 'charity',
            notes: nameParts.slice(2).join(':').trim() || null,
            created_at: row.created_at,
            date_scope: 'encoded-month',
            encoded_month: encodedMonth,
          };
        })
        .filter(donation => donation.encoded_month?.startsWith(`${selectedYear}-`));

      const annualCommitments = (commitmentRes.error ? [] : (commitmentRes.data ?? []) as Commitment[])
        .filter(commitment => isVoluntaryCharity(commitment.category))
        .filter(commitment => parseDate(commitment.next_due_date)
          ? isInYear(commitment.next_due_date, selectedYear)
          : selectedYear === new Date().getFullYear());

      const scopedBeneficiaries = (beneficiaryRes.error ? [] : (beneficiaryRes.data ?? []) as Beneficiary[])
        .filter(beneficiary => !beneficiary.project_id || charityProjectIds.has(beneficiary.project_id))
        .reduce<Beneficiary[]>((items, beneficiary) => {
          const hasAnyIntervalDate = Boolean(parseDate(beneficiary.sponsorship_start_date) || parseDate(beneficiary.sponsorship_end_date));
          const hasInterval = hasUsableInterval(beneficiary.sponsorship_start_date, beneficiary.sponsorship_end_date);
          if (hasAnyIntervalDate && !hasInterval) return items;
          if (hasInterval) {
            if (overlapsYear(beneficiary.sponsorship_start_date, beneficiary.sponsorship_end_date, selectedYear)) {
              items.push({ ...beneficiary, scope: 'annual' });
            }
            return items;
          }
          if (beneficiary.project_id && annualProjectIds.has(beneficiary.project_id)) {
            items.push({ ...beneficiary, scope: 'project' });
          }
          return items;
        }, []);

      const scopedMetrics = (metricRes.error ? [] : (metricRes.data ?? []) as ImpactMetric[])
        .filter(metric => charityProjectIds.has(metric.project_id))
        .reduce<ImpactMetric[]>((items, metric) => {
          if (parseDate(metric.created_at)) {
            if (isInYear(metric.created_at, selectedYear)) items.push({ ...metric, scope: 'annual' });
            return items;
          }
          if (annualProjectIds.has(metric.project_id)) items.push({ ...metric, scope: 'project' });
          return items;
        }, []);

      setProjects(annualProjects);
      setDonations([...linkedDonations, ...legacyDonations].sort((a, b) => String(b.donation_date ?? '').localeCompare(String(a.donation_date ?? ''))));
      setCommitments(annualCommitments);
      setBeneficiaries(scopedBeneficiaries);
      setImpactMetrics(scopedMetrics);
      setProjectNames(names);
      setLoadFailed(hasError);
      setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [authLoading, db, selectedYear, user]);

  const totals = useMemo(() => {
    const totalDonations = donations
      .filter(item => isExplicitKwd(item.currency))
      .reduce((sum, item) => sum + safeNumber(item.amount), 0);
    const monthlyCommitments = commitments
      .filter(item => item.frequency === 'monthly' && isExplicitKwd(item.currency))
      .reduce((sum, item) => sum + safeNumber(item.amount) * 12, 0);
    const otherCommitments = commitments
      .filter(item => item.frequency !== 'monthly' && isExplicitKwd(item.currency))
      .reduce((sum, item) => sum + safeNumber(item.amount), 0);
    const expectedCommitments = monthlyCommitments + otherCommitments;
    const monthlySupport = beneficiaries
      .filter(item => item.status === 'active' && isExplicitKwd(item.currency))
      .reduce((sum, item) => sum + safeNumber(item.monthly_support_amount), 0);
    return { totalDonations, monthlyCommitments, otherCommitments, expectedCommitments, monthlySupport };
  }, [beneficiaries, commitments, donations]);

  const generatedDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const userName = user?.user_metadata?.full_name || user?.email || '—';
  const projectScopedBeneficiaryCount = beneficiaries.filter(item => item.scope === 'project').length;
  const projectScopedMetricCount = impactMetrics.filter(item => item.scope === 'project').length;

  return (
    <main className="report-page" dir={dir} lang={language} data-charity-experience="report">
      <div className="report-actions no-print">
        <button type="button" onClick={() => router.push('/charity-projects?tab=reports')} aria-label={tr.back}>
          <ArrowLeft aria-hidden="true" className="back-icon" size={17} /> {tr.back}
        </button>
        <button type="button" onClick={() => window.print()} aria-label={tr.print}>
          <Printer aria-hidden="true" size={17} /> {tr.print}
        </button>
      </div>

      <article className="report-sheet" aria-labelledby="charity-report-title">
        <header className="cover">
          <div className="brand">
            <Image src="/sfm-logo.png" alt="THE SFM" width={54} height={54} priority className="sfm-brand-mark sfm-brand-mark--report" />
            <div><strong>THE SFM</strong><span>{tr.preview}</span></div>
          </div>
          <h1 id="charity-report-title">{tr.title}</h1>
          <p className="boundary"><Info aria-hidden="true" size={17} />{tr.reportBoundary}</p>
          <div className="cover-meta">
            <span>{tr.year}: <b>{selectedYear}</b></span>
            <span>{tr.generatedOn}: <b>{generatedDate}</b></span>
            <span>{tr.user}: <b>{userName}</b></span>
          </div>
        </header>

        {loading ? (
          <section className="section loading-state" aria-live="polite"><span className="loading-dot" aria-hidden="true" />{tr.loading}</section>
        ) : (
          <>
            {loadFailed && <div className="load-warning" role="alert"><CircleAlert aria-hidden="true" size={19} />{tr.loadError}</div>}

            <section className="section" aria-labelledby="executive-heading">
              <h2 id="executive-heading">{tr.executive}</h2>
              <div className="summary-grid">
                <Metric label={tr.totalDonations} value={money(totals.totalDonations, KWD)} />
                <Metric label={tr.projectCount} value={number(projects.length)} />
                <Metric label={tr.completedProjects} value={number(projects.filter(project => project.status === 'completed').length)} />
                <Metric label={tr.expectedCommitments} value={money(totals.expectedCommitments, KWD)} />
                <Metric label={tr.linkedDonations} value={number(donations.length)} />
              </div>
              <ScopeNote title={tr.currencyScopeTitle}>{tr.currencyScope}</ScopeNote>
            </section>

            <section className="section" aria-labelledby="projects-heading">
              <h2 id="projects-heading">{tr.projects}</h2>
              <p className="section-intro">{tr.intervalScope}</p>
              {projects.length ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <caption className="sr-only">{tr.projects}</caption>
                    <thead><tr><th scope="col">{tr.project}</th><th scope="col">{tr.type}</th><th scope="col">{tr.target}</th><th scope="col">{tr.collected}</th><th scope="col">{tr.progress}</th><th scope="col">{tr.organization}</th><th scope="col">{tr.dates}</th></tr></thead>
                    <tbody>{projects.map(project => {
                      const target = safeNumber(project.target_amount);
                      const collected = safeNumber(project.collected_amount);
                      const progress = target > 0 ? Math.min(100, (collected / target) * 100) : 0;
                      return (
                        <tr key={project.id}>
                          <td data-label={tr.project}>{project.name}</td>
                          <td data-label={tr.type}>{project.category || '—'}</td>
                          <td data-label={tr.target}>{money(target, project.currency)}</td>
                          <td data-label={tr.collected}>{money(collected, project.currency)}</td>
                          <td data-label={tr.progress}><span className="progress-value">{number(progress)}%</span></td>
                          <td data-label={tr.organization}>{project.organization_name || '—'}</td>
                          <td data-label={tr.dates}>{dateLabel(project.start_date ?? project.created_at)} – {dateLabel(project.end_date)}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              ) : <p className="empty">{tr.noData}</p>}
            </section>

            <section className="section" aria-labelledby="donations-heading">
              <h2 id="donations-heading">{tr.donations}</h2>
              <ScopeNote title={tr.currencyScopeTitle}>{tr.currencyScope}</ScopeNote>
              {donations.length ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <caption className="sr-only">{tr.donations}</caption>
                    <thead><tr><th scope="col">{tr.date}</th><th scope="col">{tr.amount}</th><th scope="col">{tr.type}</th><th scope="col">{tr.project}</th><th scope="col">{tr.scope}</th><th scope="col">{tr.notes}</th></tr></thead>
                    <tbody>{donations.map(donation => (
                      <tr key={`${donation.date_scope ?? 'record'}-${donation.id}`}>
                        <td data-label={tr.date}>{donation.date_scope === 'encoded-month' ? monthLabel(donation.encoded_month) : dateLabel(donation.donation_date ?? donation.created_at)}</td>
                        <td data-label={tr.amount}>{money(safeNumber(donation.amount), donation.currency)}</td>
                        <td data-label={tr.type}>{donation.donation_type || '—'}</td>
                        <td data-label={tr.project}>{donation.project_name || '—'}</td>
                        <td data-label={tr.scope}>{donation.date_scope === 'encoded-month' ? tr.encodedMonth : tr.recordedDate}</td>
                        <td data-label={tr.notes}>{donation.notes || '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <p className="empty">{tr.noData}</p>}
            </section>

            <section className="section" aria-labelledby="commitments-heading">
              <h2 id="commitments-heading">{tr.commitments}</h2>
              <div className="summary-grid three">
                <Metric label={tr.monthlyAnnualized} value={money(totals.monthlyCommitments, KWD)} />
                <Metric label={tr.annualCommitments} value={money(totals.otherCommitments, KWD)} />
                <Metric label={tr.totalExpected} value={money(totals.expectedCommitments, KWD)} />
              </div>
              <ScopeNote title={tr.currencyScopeTitle}>{tr.currencyScope}</ScopeNote>
              {commitments.length ? (
                <div className="table-wrap compact-table">
                  <table className="data-table">
                    <caption className="sr-only">{tr.commitments}</caption>
                    <thead><tr><th scope="col">{tr.type}</th><th scope="col">{tr.amount}</th><th scope="col">{tr.frequency}</th><th scope="col">{tr.nextDue}</th><th scope="col">{tr.status}</th></tr></thead>
                    <tbody>{commitments.map(commitment => (
                      <tr key={commitment.id}>
                        <td data-label={tr.type}>{commitment.name}</td>
                        <td data-label={tr.amount}>{money(safeNumber(commitment.amount), commitment.currency)}</td>
                        <td data-label={tr.frequency}>{commitment.frequency || '—'}</td>
                        <td data-label={tr.nextDue}>{dateLabel(commitment.next_due_date)}</td>
                        <td data-label={tr.status}>{commitment.status || '—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : null}
            </section>

            <section className="section" aria-labelledby="impact-heading">
              <h2 id="impact-heading">{tr.impact}</h2>
              {projects.length || beneficiaries.length || impactMetrics.length ? (
                <>
                  <div className="summary-grid three">
                    <Metric label={tr.totalDonations} value={money(totals.totalDonations, KWD)} />
                    <Metric label={tr.beneficiaryCount} value={number(beneficiaries.length)} />
                    <Metric label={tr.annualizedSupport} value={money(totals.monthlySupport * 12, KWD)} />
                  </div>

                  <h3>{tr.beneficiaries}</h3>
                  {projectScopedBeneficiaryCount > 0 && <ScopeNote title={tr.scope}>{tr.projectScopedBeneficiaries}</ScopeNote>}
                  {beneficiaries.length ? (
                    <div className="table-wrap compact-table">
                      <table className="data-table">
                        <caption className="sr-only">{tr.beneficiaries}</caption>
                        <thead><tr><th scope="col">{tr.beneficiary}</th><th scope="col">{tr.project}</th><th scope="col">{tr.type}</th><th scope="col">{tr.support}</th><th scope="col">{tr.status}</th><th scope="col">{tr.scope}</th></tr></thead>
                        <tbody>{beneficiaries.map(beneficiary => (
                          <tr key={beneficiary.id}>
                            <td data-label={tr.beneficiary}>{beneficiary.display_name || '—'}</td>
                            <td data-label={tr.project}>{beneficiary.project_id ? projectNames.get(beneficiary.project_id) || '—' : '—'}</td>
                            <td data-label={tr.type}>{beneficiary.category || '—'}</td>
                            <td data-label={tr.support}>{money(safeNumber(beneficiary.monthly_support_amount), beneficiary.currency)}</td>
                            <td data-label={tr.status}>{beneficiary.status || '—'}</td>
                            <td data-label={tr.scope}>{beneficiary.scope === 'project' ? tr.projectScope : tr.annualScope}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <p className="empty">{tr.noData}</p>}

                  <h3>{tr.customMetrics}</h3>
                  {projectScopedMetricCount > 0 && <ScopeNote title={tr.scope}>{tr.projectScopedImpact}</ScopeNote>}
                  {impactMetrics.length ? (
                    <div className="table-wrap compact-table">
                      <table className="data-table">
                        <caption className="sr-only">{tr.customMetrics}</caption>
                        <thead><tr><th scope="col">{tr.project}</th><th scope="col">{tr.type}</th><th scope="col">{tr.amount}</th><th scope="col">{tr.scope}</th><th scope="col">{tr.notes}</th></tr></thead>
                        <tbody>{impactMetrics.map(metric => (
                          <tr key={metric.id}>
                            <td data-label={tr.project}>{projectNames.get(metric.project_id) || '—'}</td>
                            <td data-label={tr.type}>{metric.metric_name}</td>
                            <td data-label={tr.amount}>{number(safeNumber(metric.metric_value))} {metric.metric_unit || ''}</td>
                            <td data-label={tr.scope}>{metric.scope === 'project' ? tr.projectScope : tr.annualScope}</td>
                            <td data-label={tr.notes}>{metric.notes || '—'}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  ) : <p className="empty">{tr.impactEmpty}</p>}
                </>
              ) : <p className="empty">{tr.impactEmpty}</p>}
            </section>
          </>
        )}

        <footer>
          <p>{tr.disclaimer}</p>
          <span>THE SFM · {tr.generatedOn} {generatedDate}</span>
        </footer>
      </article>

      <style jsx global>{`
        .report-page {
          min-height: 100vh;
          width: 100%;
          overflow-x: clip;
          background: var(--background);
          color: var(--foreground);
          font-family: var(--font-ui);
          padding: clamp(12px, 3vw, 28px);
        }
        .report-actions { max-width: 1040px; margin: 0 auto 16px; display: flex; justify-content: space-between; gap: 10px; }
        .report-actions button {
          min-height: 44px; border-radius: var(--radius-card); border: 1px solid var(--border); background: var(--surface);
          color: var(--foreground); padding: 9px 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font: 600 13px var(--font-ui); cursor: pointer; box-shadow: var(--shadow-card);
        }
        .report-actions button:last-child { background: var(--primary); border-color: var(--primary); color: var(--primary-foreground); }
        .report-actions button:hover { transform: translateY(-1px); }
        .report-actions button:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 3px; }
        [dir="rtl"] .report-actions .back-icon { transform: rotate(180deg); }
        .report-sheet {
          max-width: 1040px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-panel); box-shadow: var(--shadow-card); overflow: hidden;
        }
        .cover { background: var(--hero-gradient); color: var(--hero-foreground); padding: clamp(24px, 5vw, 40px); }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand img { border-radius: var(--radius-card); background: color-mix(in srgb, var(--hero-foreground) 94%, transparent); }
        .brand strong { display: block; color: var(--hero-foreground-muted); font-size: 18px; letter-spacing: .04em; }
        .brand span { display: block; color: color-mix(in srgb, var(--hero-foreground) 76%, transparent); font-size: 12px; margin-top: 2px; }
        .cover h1 { margin: 28px 0 10px; max-width: 760px; color: var(--hero-foreground); font-size: clamp(30px, 5vw, 44px); line-height: 1.15; }
        .boundary { max-width: 780px; margin: 0 0 18px; display: flex; align-items: flex-start; gap: 8px; color: color-mix(in srgb, var(--hero-foreground) 86%, transparent); line-height: 1.7; }
        .boundary svg { flex: 0 0 auto; margin-top: 4px; color: var(--hero-foreground-muted); }
        .cover-meta { display: flex; gap: 10px; flex-wrap: wrap; }
        .cover-meta span { border: 1px solid color-mix(in srgb, var(--hero-foreground) 24%, transparent); background: color-mix(in srgb, var(--hero-foreground) 9%, transparent); border-radius: var(--radius-pill); padding: 7px 12px; color: color-mix(in srgb, var(--hero-foreground) 82%, transparent); }
        .cover-meta b { color: var(--hero-foreground); }
        .section { padding: clamp(20px, 4vw, 32px); border-bottom: 1px solid var(--border); }
        .section h2 { margin: 0 0 14px; color: var(--foreground); font-size: clamp(21px, 3vw, 25px); }
        .section h3 { margin: 26px 0 10px; color: var(--success); font-size: 17px; }
        .section-intro { max-width: 780px; margin: -4px 0 16px; color: var(--foreground-muted); line-height: 1.75; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: 12px; }
        .metric { min-width: 0; border: 1px solid var(--border); background: var(--surface-muted); border-radius: var(--radius-card); padding: 16px; }
        .metric small { display: block; color: var(--foreground-muted); font-weight: 600; line-height: 1.5; }
        .metric strong { display: block; margin-top: 7px; color: var(--foreground); font-family: var(--font-data); font-size: clamp(18px, 2.4vw, 22px); overflow-wrap: anywhere; }
        .scope-note { margin-top: 14px; border-inline-start: 4px solid var(--accent); border-radius: var(--radius-control); background: color-mix(in srgb, var(--accent) 9%, transparent); padding: 12px 14px; display: flex; align-items: flex-start; gap: 9px; color: var(--foreground-muted); line-height: 1.7; }
        .scope-note svg { flex: 0 0 auto; margin-top: 3px; color: var(--accent); }
        .scope-note strong { display: block; color: var(--foreground); }
        .scope-note p { margin: 2px 0 0; }
        .table-wrap { max-width: 100%; margin-top: 14px; overflow: clip; border: 1px solid var(--border); border-radius: var(--radius-card); }
        .data-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
        .data-table th, .data-table td { min-width: 0; padding: 11px 10px; border-bottom: 1px solid var(--border); text-align: start; vertical-align: top; overflow-wrap: anywhere; }
        .data-table th { color: var(--foreground); background: var(--surface-muted); font-weight: 600; }
        .data-table tbody tr:last-child td { border-bottom: 0; }
        .data-table tbody tr:nth-child(even) { background: color-mix(in srgb, var(--accent) 4%, transparent); }
        .progress-value { color: var(--success); font-family: var(--font-data); font-weight: 600; }
        .empty { margin: 0; border: 1px dashed var(--border); border-radius: var(--radius-card); background: var(--surface-muted); padding: 20px; color: var(--foreground-muted); line-height: 1.8; }
        .load-warning { margin: 20px clamp(20px, 4vw, 32px) 0; border: 1px solid var(--danger); border-radius: var(--radius-card); background: color-mix(in srgb, var(--danger) 10%, transparent); color: var(--foreground); padding: 12px 14px; display: flex; align-items: flex-start; gap: 9px; line-height: 1.6; }
        .loading-state { display: flex; align-items: center; gap: 10px; color: var(--foreground-muted); }
        .loading-dot { width: 12px; height: 12px; border-radius: var(--radius-pill); background: var(--primary); box-shadow: var(--shadow-card); animation: report-pulse 1.2s ease-in-out infinite; }
        .report-sheet footer { padding: 22px clamp(20px, 4vw, 32px); background: var(--surface-muted); color: var(--foreground-muted); font-size: 12px; line-height: 1.8; }
        .report-sheet footer p { max-width: 820px; margin: 0; }
        .report-sheet footer span { display: block; margin-top: 8px; color: var(--success); font-weight: 600; }
        .sr-only { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0, 0, 0, 0) !important; white-space: nowrap !important; border: 0 !important; }
        @keyframes report-pulse { 50% { opacity: .5; transform: scale(.8); } }

        @media (max-width: 900px) {
          .data-table, .data-table tbody, .data-table tr, .data-table td { display: block; width: 100%; }
          .data-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
          .data-table tbody { padding: 8px; }
          .data-table tr { border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface) !important; padding: 7px 10px; }
          .data-table tr + tr { margin-top: 8px; }
          .data-table td { display: grid; grid-template-columns: minmax(7rem, 41%) minmax(0, 1fr); gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
          .data-table td:last-child { border-bottom: 0; }
          .data-table td::before { content: attr(data-label); color: var(--foreground-muted); font-weight: 600; }
        }
        @media (max-width: 720px) {
          .report-actions { display: grid; grid-template-columns: 1fr; }
          .report-sheet { border-radius: var(--radius-card); }
          .cover-meta { display: grid; grid-template-columns: 1fr; }
          .cover-meta span { border-radius: var(--radius-control); }
        }
        @media (max-width: 390px) {
          .report-page { padding: 8px; }
          .report-sheet { border-radius: var(--radius-card); }
          .cover, .section { padding-inline: 16px; }
          .data-table td { display: block; }
          .data-table td::before { display: block; margin-bottom: 3px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .report-actions button, .loading-dot { animation: none; transition: none; }
          .report-actions button:hover { transform: none; }
        }
        @media print {
          @page { margin: 12mm; }
          .no-print { display: none !important; }
          .report-page { background: var(--print-background) !important; color: var(--print-foreground) !important; padding: 0; overflow: visible; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .report-sheet { max-width: none; border: 0; border-radius: 0; box-shadow: none; background: var(--print-surface) !important; }
          .cover { background: var(--print-foreground) !important; }
          .section { break-inside: auto; border-color: var(--print-border) !important; }
          .metric, .scope-note, .data-table tr { break-inside: avoid; }
          .metric, .report-sheet footer, .data-table th { background: var(--print-surface) !important; color: var(--print-foreground) !important; }
          .table-wrap { overflow: visible; border-color: var(--print-border) !important; }
          .data-table { display: table !important; color: var(--print-foreground) !important; }
          .data-table thead { display: table-header-group !important; position: static !important; width: auto !important; height: auto !important; overflow: visible !important; clip: auto !important; white-space: normal !important; }
          .data-table tbody { display: table-row-group !important; padding: 0 !important; }
          .data-table tr { display: table-row !important; width: auto !important; border: 0 !important; padding: 0 !important; }
          .data-table td { display: table-cell !important; width: auto !important; padding: 8px 7px !important; border-bottom: 1px solid var(--print-border) !important; }
          .data-table td::before { display: none !important; content: none !important; }
          .report-sheet footer { color: var(--print-foreground-muted) !important; }
        }
      `}</style>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><small>{label}</small><strong>{value}</strong></div>;
}

function ScopeNote({ title, children }: { title: string; children: string }) {
  return (
    <aside className="scope-note">
      <Info aria-hidden="true" size={18} />
      <div><strong>{title}</strong><p>{children}</p></div>
    </aside>
  );
}

export default function CharityReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportContent />
    </Suspense>
  );
}
