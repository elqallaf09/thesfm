'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Banknote,
  BellRing,
  BookOpenCheck,
  CalendarClock,
  FileCheck2,
  FolderHeart,
  HandCoins,
  HeartHandshake,
  Landmark,
  ReceiptText,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatFinancialCurrency, formatFinancialNumber } from '@/lib/financialDisplay';
import { isInCalendarYear, LEGACY_CHARITY_PREFIX, parseLegacyCharityRow, toFiniteNumber, type LegacyCharityRow } from './_data';
import { CHARITY_TEXT } from './_text';
import styles from './charity.module.css';

type CharityProject = {
  id: string;
  name: string;
  category: string | null;
  status: string;
  target_amount: number | null;
  collected_amount: number | null;
  currency: string | null;
  organization_name: string | null;
  created_at?: string | null;
};

type ProjectDonation = {
  id: string;
  project_id: string | null;
  amount: number | null;
  currency: string | null;
  donation_date: string | null;
  donation_type: string | null;
  notes: string | null;
  created_at: string | null;
};

type CharityDocument = {
  id: string;
  title: string;
  category: string;
  file_url: string | null;
  uploaded_at: string | null;
};

type CharityReminder = {
  id: string;
  title: string;
  due_date: string;
  status: string;
};

type Beneficiary = {
  id: string;
  status: string;
  project_id: string | null;
};

type ImpactMetric = {
  id: string;
  project_id: string | null;
  metric_name: string;
  metric_value: number | null;
  metric_unit: string | null;
};

type ZakatCalculation = {
  id: string;
  calculation_date: string | null;
  currency: string | null;
  zakat_due: number | null;
  created_at?: string | null;
};

type KhumsYear = {
  id: string;
  start_date: string;
  end_date: string;
  currency: string | null;
  khums_due: number | null;
  created_at: string | null;
};

type KhumsPayment = {
  id: string;
  khums_year_id: string | null;
  amount: number | null;
  currency: string | null;
  payment_date: string | null;
};

type KhumsReminder = {
  id: string;
  khums_year_id: string | null;
  reminder_date: string;
  status: string;
  notes: string | null;
};

type CenterData = {
  projects: CharityProject[];
  projectDonations: ProjectDonation[];
  documents: CharityDocument[];
  reminders: CharityReminder[];
  beneficiaries: Beneficiary[];
  impactMetrics: ImpactMetric[];
  zakatHistory: ZakatCalculation[];
  khumsYears: KhumsYear[];
  khumsPayments: KhumsPayment[];
  khumsReminders: KhumsReminder[];
  legacyRows: LegacyCharityRow[];
};

type DonationView = {
  id: string;
  name: string;
  kind: 'general' | 'project' | 'zakat' | 'khums';
  amount: number;
  currency: string;
  date: string | null;
  accountingDate: string | null;
};

type ReminderView = {
  id: string;
  title: string;
  date: string;
  href: string;
};

const EMPTY_DATA: CenterData = {
  projects: [],
  projectDonations: [],
  documents: [],
  reminders: [],
  beneficiaries: [],
  impactMetrics: [],
  zakatHistory: [],
  khumsYears: [],
  khumsPayments: [],
  khumsReminders: [],
  legacyRows: [],
};

function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const result = new Date(value.length === 10 ? `${value}T00:00:00` : value).getTime();
  return Number.isFinite(result) ? result : 0;
}

function isZakatDonation(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized.includes('zakat') || normalized.includes('زكاة') || normalized.includes('زكاه');
}

function isKhumsDonation(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized.includes('khums') || normalized.includes('خمس');
}

export default function CharityCenterPage() {
  const { user, loading: authLoading } = useAuth();
  const { dir, lang } = useLanguage();
  const tr = CHARITY_TEXT[lang];
  const [data, setData] = useState<CenterData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const [failedSources, setFailedSources] = useState(0);
  const db = supabase as any;

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setReady(false);
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      setData(EMPTY_DATA);
      setFailedSources(0);
      setReady(true);
      return () => {
        cancelled = true;
      };
    }

    const userId = user.id;

    async function loadCenter() {
      setReady(false);
      const results = await Promise.all([
        db.from('charity_projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        db.from('charity_project_donations').select('*').eq('user_id', userId).order('donation_date', { ascending: false }),
        db.from('charity_documents').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false }),
        db.from('charity_reminders').select('*').eq('user_id', userId).order('due_date', { ascending: true }),
        db.from('charity_beneficiaries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        db.from('charity_project_impact_metrics').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        db.from('zakat_calculations').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
        db.from('khums_years').select('*').eq('user_id', userId).order('end_date', { ascending: false }),
        db.from('khums_payments').select('*').eq('user_id', userId).order('payment_date', { ascending: false }),
        db.from('khums_reminders').select('*').eq('user_id', userId).order('reminder_date', { ascending: true }),
        db.from('expense_items').select('id,user_id,name,amount,created_at').eq('user_id', userId).like('name', `${LEGACY_CHARITY_PREFIX}:%`).order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;
      const [projects, projectDonations, documents, reminders, beneficiaries, impactMetrics, zakatHistory, khumsYears, khumsPayments, khumsReminders, legacyRows] = results;
      setFailedSources(results.filter(result => Boolean(result.error)).length);
      setData({
        projects: projects.error ? [] : (projects.data ?? []) as CharityProject[],
        projectDonations: projectDonations.error ? [] : (projectDonations.data ?? []) as ProjectDonation[],
        documents: documents.error ? [] : (documents.data ?? []) as CharityDocument[],
        reminders: reminders.error ? [] : (reminders.data ?? []) as CharityReminder[],
        beneficiaries: beneficiaries.error ? [] : (beneficiaries.data ?? []) as Beneficiary[],
        impactMetrics: impactMetrics.error ? [] : (impactMetrics.data ?? []) as ImpactMetric[],
        zakatHistory: zakatHistory.error ? [] : (zakatHistory.data ?? []) as ZakatCalculation[],
        khumsYears: khumsYears.error ? [] : (khumsYears.data ?? []) as KhumsYear[],
        khumsPayments: khumsPayments.error ? [] : (khumsPayments.data ?? []) as KhumsPayment[],
        khumsReminders: khumsReminders.error ? [] : (khumsReminders.data ?? []) as KhumsReminder[],
        legacyRows: legacyRows.error ? [] : (legacyRows.data ?? []) as LegacyCharityRow[],
      });
      setReady(true);
    }

    void loadCenter();
    return () => {
      cancelled = true;
    };
  }, [authLoading, db, user]);

  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const dateLabel = (value: string | null | undefined) => {
    if (!value) return tr.unavailable;
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(date.getTime())) return tr.unavailable;
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  };
  const money = (value: unknown, currency = 'KWD') => formatFinancialCurrency(value, currency || 'KWD', lang);
  const count = (value: number) => formatFinancialNumber(value, lang, { maximumFractionDigits: 0 });

  const summary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const latestZakat = data.zakatHistory[0] ?? null;
    const khumsYearsByEndDate = data.khumsYears
      .filter(year => timestamp(year.end_date) > 0)
      .sort((a, b) => timestamp(b.end_date) - timestamp(a.end_date));
    const currentKhumsYear = khumsYearsByEndDate.find(year => (
      timestamp(year.start_date) > 0
      && timestamp(year.start_date) <= startToday.getTime()
      && timestamp(year.end_date) >= startToday.getTime()
    )) ?? khumsYearsByEndDate[0] ?? null;
    const projectById = new Map(data.projects.map(project => [project.id, project]));
    const zakatProjectIds = new Set(
      data.projects.filter(project => isZakatDonation(project.category)).map(project => project.id),
    );
    const khumsProjectIds = new Set(
      data.projects.filter(project => isKhumsDonation(project.category)).map(project => project.id),
    );
    const charityProjectIds = new Set(
      data.projects
        .filter(project => !zakatProjectIds.has(project.id) && !khumsProjectIds.has(project.id))
        .map(project => project.id),
    );
    const isZakatProjectDonation = (donation: ProjectDonation) => (
      isZakatDonation(donation.donation_type)
      || Boolean(donation.project_id && zakatProjectIds.has(donation.project_id))
    );
    const isKhumsProjectDonation = (donation: ProjectDonation) => (
      isKhumsDonation(donation.donation_type)
      || Boolean(donation.project_id && khumsProjectIds.has(donation.project_id))
    );
    const legacyDonations: DonationView[] = data.legacyRows.map(row => {
      const parsed = parseLegacyCharityRow(row, tr.generalDonation);
      return {
        id: `legacy-${parsed.id}`,
        name: parsed.name,
        kind: 'general',
        amount: parsed.amount,
        currency: 'KWD',
        date: parsed.created_at ?? `${parsed.month}-01`,
        accountingDate: `${parsed.month}-01`,
      };
    });
    const projectDonations: DonationView[] = data.projectDonations.map(donation => {
      const project = donation.project_id ? projectById.get(donation.project_id) : null;
      const zakat = isZakatProjectDonation(donation);
      const khums = isKhumsProjectDonation(donation);
      const donationDate = donation.donation_date || donation.created_at;
      return {
        id: `project-${donation.id}`,
        name: project?.name || donation.notes || (zakat ? tr.zakatPayment : tr.projectDonation),
        kind: zakat ? 'zakat' : khums ? 'khums' : 'project',
        amount: toFiniteNumber(donation.amount),
        currency: donation.currency || 'KWD',
        date: donationDate,
        accountingDate: donationDate,
      };
    });
    const donations = [...legacyDonations, ...projectDonations].sort((a, b) => timestamp(b.date) - timestamp(a.date));
    const latestZakatDate = latestZakat?.calculation_date || latestZakat?.created_at || null;
    const zakatCurrency = latestZakat?.currency || 'KWD';
    const zakatPaid = data.projectDonations
      .filter(isZakatProjectDonation)
      .filter(donation => donation.currency === zakatCurrency)
      .filter(donation => !latestZakatDate || timestamp(donation.donation_date || donation.created_at) >= timestamp(latestZakatDate))
      .reduce((total, donation) => total + toFiniteNumber(donation.amount), 0);
    const khumsCurrency = currentKhumsYear?.currency || 'KWD';
    const khumsPaid = currentKhumsYear
      ? data.khumsPayments
        .filter(payment => payment.khums_year_id === currentKhumsYear.id)
        .filter(payment => payment.currency === khumsCurrency)
        .reduce((total, payment) => total + toFiniteNumber(payment.amount), 0)
      : 0;
    const zakatDue = toFiniteNumber(latestZakat?.zakat_due);
    const khumsDue = toFiniteNumber(currentKhumsYear?.khums_due);
    const paidThisYear = legacyDonations
      .filter(donation => isInCalendarYear(donation.accountingDate, currentYear))
      .reduce((total, donation) => total + donation.amount, 0)
      + data.projectDonations
        .filter(donation => isInCalendarYear(donation.donation_date || donation.created_at, currentYear))
        .filter(donation => donation.currency === 'KWD')
        .reduce((total, donation) => total + toFiniteNumber(donation.amount), 0)
      + data.khumsPayments
        .filter(payment => isInCalendarYear(payment.payment_date, currentYear))
        .filter(payment => payment.currency === 'KWD')
        .reduce((total, payment) => total + toFiniteNumber(payment.amount), 0);

    const reminders: ReminderView[] = [
      ...data.reminders
        .filter(reminder => reminder.status === 'active')
        .map(reminder => ({ id: `charity-${reminder.id}`, title: reminder.title, date: reminder.due_date, href: '/charity-projects?tab=reminders' })),
      ...data.khumsReminders
        .filter(reminder => reminder.status === 'active')
        .filter(reminder => reminder.khums_year_id === currentKhumsYear?.id)
        .map(reminder => ({ id: `khums-${reminder.id}`, title: reminder.notes || tr.khums, date: reminder.reminder_date, href: '/khums' })),
    ].sort((a, b) => timestamp(a.date) - timestamp(b.date));
    const overdueReminder = reminders.find(reminder => timestamp(reminder.date) < startToday.getTime()) ?? null;
    const nextReminder = overdueReminder ?? reminders.find(reminder => timestamp(reminder.date) >= startToday.getTime()) ?? null;
    const activeProjects = data.projects.filter(project => charityProjectIds.has(project.id) && !['completed', 'paused'].includes(project.status));
    const supportedIds = new Set(data.projectDonations
      .filter(donation => (
        Boolean(donation.project_id)
        && charityProjectIds.has(donation.project_id as string)
        && !isZakatProjectDonation(donation)
        && !isKhumsProjectDonation(donation)
      ))
      .map(donation => donation.project_id as string));
    const supportedProjects = activeProjects.filter(project => supportedIds.has(project.id));
    const displayedProjects = supportedProjects.slice(0, 3);
    const charityBeneficiaries = data.beneficiaries.filter(beneficiary => (
      !beneficiary.project_id || charityProjectIds.has(beneficiary.project_id)
    ));
    const charityImpactMetrics = data.impactMetrics.filter(metric => (
      !metric.project_id || charityProjectIds.has(metric.project_id)
    ));
    const activeBeneficiaries = charityBeneficiaries.filter(beneficiary => beneficiary.status === 'active').length;

    return {
      latestZakat,
      currentKhumsYear,
      zakatDue,
      zakatPaid,
      zakatRemaining: Math.max(zakatDue - zakatPaid, 0),
      khumsDue,
      khumsPaid,
      khumsRemaining: Math.max(khumsDue - khumsPaid, 0),
      paidThisYear,
      donations,
      nextReminder,
      overdueReminder,
      displayedProjects,
      activeBeneficiaries,
      totalBeneficiaries: charityBeneficiaries.length,
      impactMetrics: charityImpactMetrics,
      supportedProjectCount: supportedIds.size,
    };
  }, [data, tr.generalDonation, tr.khums, tr.projectDonation, tr.zakatPayment]);

  const pathways: Array<{ href: string; title: string; description: string; icon: LucideIcon }> = [
    { href: '/zakat', title: tr.navZakat, description: tr.navZakatDesc, icon: Scale },
    { href: '/khums', title: tr.navKhums, description: tr.navKhumsDesc, icon: Landmark },
    { href: '/charity/donations', title: tr.navDonations, description: tr.navDonationsDesc, icon: HandCoins },
    { href: '/charity-projects?tab=projects', title: tr.navProjects, description: tr.navProjectsDesc, icon: FolderHeart },
    { href: '/charity-projects?tab=beneficiaries', title: tr.navBeneficiaries, description: tr.navBeneficiariesDesc, icon: UsersRound },
    { href: '/charity-projects?tab=reports', title: tr.navReports, description: tr.navReportsDesc, icon: ReceiptText },
    { href: '/charity-projects?tab=impact', title: tr.navImpact, description: tr.navImpactDesc, icon: Sparkles },
    { href: '/charity-projects?tab=reminders', title: tr.navReminders, description: tr.navRemindersDesc, icon: BellRing },
  ];

  const recommendation = summary.overdueReminder
    ? { title: tr.recommendationOverdueTitle, body: tr.recommendationOverdueBody, href: summary.overdueReminder.href }
    : summary.latestZakat && summary.zakatRemaining > 0
      ? { title: tr.recommendationZakatTitle, body: tr.recommendationZakatBody, href: '/zakat' }
      : summary.currentKhumsYear && summary.khumsRemaining > 0
        ? { title: tr.recommendationKhumsTitle, body: tr.recommendationKhumsBody, href: '/khums' }
        : summary.donations.length === 0
          ? { title: tr.recommendationDonationTitle, body: tr.recommendationDonationBody, href: '/charity/donations' }
          : { title: tr.recommendationReportsTitle, body: tr.recommendationReportsBody, href: '/charity-projects?tab=reports' };

  const recentDocuments = data.documents.slice(0, 3);
  const documentKind = (category: string) => {
    if (category === 'donation_receipt') return tr.receipt;
    if (category === 'charity_certificate') return tr.certificate;
    if (category.includes('report')) return tr.report;
    return tr.document;
  };

  if (authLoading || !ready) {
    return (
      <div dir={dir} lang={lang}>
        <DashboardPageShell ariaLabel={tr.centerAria} className={styles.shell} contentClassName={styles.shellContent}>
          <div className={styles.page} dir={dir} lang={lang} data-charity-experience="center">
            <div className={styles.loadingState} role="status" aria-live="polite">
              <span className={styles.loadingMark} aria-hidden="true"><HeartHandshake size={28} /></span>
              <span>{tr.loading}</span>
            </div>
          </div>
        </DashboardPageShell>
      </div>
    );
  }

  return (
    <div dir={dir} lang={lang}>
      <DashboardPageShell ariaLabel={tr.centerAria} className={styles.shell} contentClassName={styles.shellContent}>
        <div className={styles.page} dir={dir} lang={lang} data-charity-experience="center">
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>{tr.eyebrow}</span>
              <h1>{tr.centerTitle}</h1>
              <p>{tr.centerSubtitle}</p>
            </div>
            <div className={styles.languageControl}>
              <LanguageSwitcher variant="dark" compact />
            </div>
            <div className={styles.heroPrinciple}>
              <ShieldCheck aria-hidden="true" size={22} />
              <div>
                <strong>{tr.centerPrinciple}</strong>
                <span>{tr.centerPrincipleNote}</span>
              </div>
            </div>
          </header>

          {failedSources > 0 && (
            <div className={styles.notice} role="status">
              <BookOpenCheck aria-hidden="true" size={20} />
              <span>{tr.partialData}</span>
            </div>
          )}

          <section className={styles.obligationBoard} aria-label={tr.centerPrinciple}>
            <article className={styles.obligationLane}>
              <div className={styles.laneHeader}>
                <span className={styles.laneIcon}><Scale aria-hidden="true" size={22} /></span>
                <div>
                  <h2>{tr.zakat}</h2>
                  <span className={styles.independentBadge}>{tr.independent}</span>
                </div>
              </div>
              <p className={styles.laneRule}>{tr.zakatRule}</p>
              <div className={styles.primaryFigure}>
                <span>{tr.amountDue}</span>
                <strong title={tr.zakatRule}>{summary.latestZakat ? money(summary.zakatDue, summary.latestZakat.currency || 'KWD') : tr.unavailable}</strong>
                {!summary.latestZakat && <small>{tr.noZakatCalculation}</small>}
              </div>
              <dl className={styles.balanceGrid}>
                <div>
                  <dt>{tr.paidToward}</dt>
                  <dd>{summary.latestZakat ? money(summary.zakatPaid, summary.latestZakat.currency || 'KWD') : tr.unavailable}</dd>
                </div>
                <div>
                  <dt>{tr.remaining}</dt>
                  <dd>{summary.latestZakat ? money(summary.zakatRemaining, summary.latestZakat.currency || 'KWD') : tr.unavailable}</dd>
                </div>
              </dl>
              <dl className={styles.evidenceList}>
                <div><dt>{tr.formula}</dt><dd>{tr.zakatFormula}</dd></div>
                <div><dt>{tr.calculationSource}</dt><dd>{tr.sourceSavedZakat}</dd></div>
                <div><dt>{tr.lastUpdated}</dt><dd>{dateLabel(summary.latestZakat?.calculation_date || summary.latestZakat?.created_at)}</dd></div>
              </dl>
              <Link href="/zakat" className={styles.laneLink}>{tr.openZakat}<ArrowUpRight aria-hidden="true" size={18} /></Link>
            </article>

            <div className={styles.ledgerDivider} aria-hidden="true"><span /></div>

            <article className={styles.obligationLane}>
              <div className={styles.laneHeader}>
                <span className={styles.laneIcon}><Landmark aria-hidden="true" size={22} /></span>
                <div>
                  <h2>{tr.khums}</h2>
                  <span className={styles.independentBadge}>{tr.independent}</span>
                </div>
              </div>
              <p className={styles.laneRule}>{tr.khumsRule}</p>
              <div className={styles.primaryFigure}>
                <span>{tr.amountDue}</span>
                <strong title={tr.khumsRule}>{summary.currentKhumsYear ? money(summary.khumsDue, summary.currentKhumsYear.currency || 'KWD') : tr.unavailable}</strong>
                {!summary.currentKhumsYear && <small>{tr.noKhumsYear}</small>}
              </div>
              <dl className={styles.balanceGrid}>
                <div>
                  <dt>{tr.paidToward}</dt>
                  <dd>{summary.currentKhumsYear ? money(summary.khumsPaid, summary.currentKhumsYear.currency || 'KWD') : tr.unavailable}</dd>
                </div>
                <div>
                  <dt>{tr.remaining}</dt>
                  <dd>{summary.currentKhumsYear ? money(summary.khumsRemaining, summary.currentKhumsYear.currency || 'KWD') : tr.unavailable}</dd>
                </div>
              </dl>
              <dl className={styles.evidenceList}>
                <div><dt>{tr.formula}</dt><dd>{tr.khumsFormula}</dd></div>
                <div><dt>{tr.calculationSource}</dt><dd>{tr.sourceSavedKhums}</dd></div>
                <div><dt>{tr.currentYear}</dt><dd>{summary.currentKhumsYear ? `${dateLabel(summary.currentKhumsYear.start_date)} — ${dateLabel(summary.currentKhumsYear.end_date)}` : tr.unavailable}</dd></div>
              </dl>
              <Link href="/khums" className={styles.laneLink}>{tr.openKhums}<ArrowUpRight aria-hidden="true" size={18} /></Link>
            </article>
          </section>

          <section className={styles.statusGrid} aria-label={tr.paidThisYear}>
            <article className={styles.statusCard}>
              <span className={styles.statusIcon}><Banknote aria-hidden="true" size={21} /></span>
              <div>
                <h2>{tr.paidThisYear}</h2>
                <strong>{money(summary.paidThisYear)}</strong>
                <p>{tr.paidThisYearHelp}</p>
              </div>
            </article>
            <article className={styles.statusCard}>
              <span className={styles.statusIcon}><Scale aria-hidden="true" size={21} /></span>
              <div className={styles.splitStatus}>
                <h2>{tr.splitRemaining}</h2>
                <div>
                  <span>{tr.zakat}</span>
                  <strong>{summary.latestZakat ? money(summary.zakatRemaining, summary.latestZakat.currency || 'KWD') : tr.unavailable}</strong>
                </div>
                <div>
                  <span>{tr.khums}</span>
                  <strong>{summary.currentKhumsYear ? money(summary.khumsRemaining, summary.currentKhumsYear.currency || 'KWD') : tr.unavailable}</strong>
                </div>
                <p>{tr.splitRemainingHelp}</p>
              </div>
            </article>
            <article className={styles.statusCard}>
              <span className={styles.statusIcon}><CalendarClock aria-hidden="true" size={21} /></span>
              <div>
                <h2>{tr.nextReminder}</h2>
                {summary.nextReminder ? (
                  <>
                    <strong>{dateLabel(summary.nextReminder.date)}</strong>
                    <p>{summary.nextReminder.title}</p>
                    <span className={summary.overdueReminder ? styles.overdueBadge : styles.upcomingBadge}>
                      {summary.overdueReminder ? tr.overdue : tr.upcoming}
                    </span>
                  </>
                ) : (
                  <strong className={styles.noValue}>{tr.noReminder}</strong>
                )}
              </div>
            </article>
          </section>

          <section className={styles.recommendation} aria-labelledby="charity-recommendation-title">
            <div className={styles.recommendationIcon}><Sparkles aria-hidden="true" size={24} /></div>
            <div>
              <span>{tr.recommendedAction}</span>
              <h2 id="charity-recommendation-title">{recommendation.title}</h2>
              <p>{recommendation.body}</p>
            </div>
            <Link href={recommendation.href} className={styles.primaryAction}>{tr.takeAction}<ArrowUpRight aria-hidden="true" size={18} /></Link>
          </section>

          <section className={styles.section} aria-labelledby="charity-pathways-title">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionKicker}>{tr.centerPrinciple}</span>
                <h2 id="charity-pathways-title">{tr.pathwaysTitle}</h2>
                <p>{tr.pathwaysSubtitle}</p>
              </div>
            </div>
            <nav className={styles.pathwayGrid} aria-label={tr.pathwaysTitle}>
              {pathways.map(item => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={styles.pathwayCard}>
                    <span className={styles.pathwayIcon}><Icon aria-hidden="true" size={21} /></span>
                    <span className={styles.pathwayCopy}><strong>{item.title}</strong><small>{item.description}</small></span>
                    <ArrowUpRight className={styles.pathwayArrow} aria-hidden="true" size={18} />
                  </Link>
                );
              })}
            </nav>
          </section>

          <div className={styles.contentGrid}>
            <section className={`${styles.panel} ${styles.donationsPanel}`} aria-labelledby="recent-donations-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>{tr.tracked}</span>
                  <h2 id="recent-donations-title">{tr.recentDonations}</h2>
                  <p>{tr.recentDonationsSubtitle}</p>
                </div>
                <Link href="/charity/donations" className={styles.textLink}>{tr.viewAll}<ArrowUpRight aria-hidden="true" size={16} /></Link>
              </div>
              {summary.donations.length > 0 ? (
                <ul className={styles.recordList}>
                  {summary.donations.slice(0, 4).map(donation => (
                    <li key={donation.id}>
                      <span className={styles.recordIcon}><HandCoins aria-hidden="true" size={18} /></span>
                      <span className={styles.recordCopy}>
                        <strong>{donation.name}</strong>
                        <small>{donation.kind === 'zakat' ? tr.zakatPayment : donation.kind === 'khums' ? tr.khums : donation.kind === 'project' ? tr.projectDonation : tr.generalDonation} · {dateLabel(donation.date)}</small>
                      </span>
                      <strong className={styles.recordAmount}>{money(donation.amount, donation.currency)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={HandCoins} title={tr.noDonationsTitle} body={tr.noDonationsBody} action={tr.recordDonation} href="/charity/donations" />
              )}
            </section>

            <section className={`${styles.panel} ${styles.projectsPanel}`} aria-labelledby="supported-projects-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>{tr.active}</span>
                  <h2 id="supported-projects-title">{tr.supportedProjects}</h2>
                  <p>{tr.supportedProjectsSubtitle}</p>
                </div>
              </div>
              {summary.displayedProjects.length > 0 ? (
                <ul className={styles.projectList}>
                  {summary.displayedProjects.map(project => {
                    const target = toFiniteNumber(project.target_amount);
                    const raised = toFiniteNumber(project.collected_amount);
                    const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
                    return (
                      <li key={project.id}>
                        <div className={styles.projectTopline}>
                          <div><strong>{project.name}</strong><small>{project.organization_name || tr.active}</small></div>
                          <span>{count(Math.round(progress))}%</span>
                        </div>
                        <div className={styles.progressTrack} role="progressbar" aria-label={`${tr.projectProgress}: ${project.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                          <span style={{ width: `${progress}%` }} />
                        </div>
                        <dl className={styles.projectAmounts}>
                          <div><dt>{tr.raised}</dt><dd>{money(raised, project.currency || 'KWD')}</dd></div>
                          <div><dt>{tr.remainingToTarget}</dt><dd>{money(Math.max(target - raised, 0), project.currency || 'KWD')}</dd></div>
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={FolderHeart} title={tr.noProjectsTitle} body={tr.noProjectsBody} action={tr.exploreProjects} href="/charity-projects?tab=projects" />
              )}
              {summary.displayedProjects.length > 0 && <Link href="/charity-projects?tab=projects" className={styles.panelAction}>{tr.exploreProjects}<ArrowUpRight aria-hidden="true" size={17} /></Link>}
            </section>

            <section className={`${styles.panel} ${styles.beneficiariesPanel}`} aria-labelledby="beneficiaries-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>{tr.beneficiarySummary}</span>
                  <h2 id="beneficiaries-title">{tr.beneficiarySummary}</h2>
                </div>
              </div>
              <div className={styles.beneficiaryFigures}>
                <div><span>{tr.activeBeneficiaries}</span><strong>{count(summary.activeBeneficiaries)}</strong></div>
                <div><span>{tr.totalBeneficiaries}</span><strong>{count(summary.totalBeneficiaries)}</strong></div>
              </div>
              <Link href="/charity-projects?tab=beneficiaries" className={styles.panelAction}>{tr.viewBeneficiaries}<ArrowUpRight aria-hidden="true" size={17} /></Link>
            </section>

            <section className={`${styles.panel} ${styles.documentsPanel}`} aria-labelledby="documents-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>{tr.calculationSource}</span>
                  <h2 id="documents-title">{tr.receiptsReports}</h2>
                  <p>{tr.receiptsReportsSubtitle}</p>
                </div>
                <Link href="/charity-projects?tab=reports" className={styles.textLink}>{tr.viewReports}<ArrowUpRight aria-hidden="true" size={16} /></Link>
              </div>
              {recentDocuments.length > 0 ? (
                <ul className={styles.recordList}>
                  {recentDocuments.map(document => (
                    <li key={document.id}>
                      <span className={styles.recordIcon}><FileCheck2 aria-hidden="true" size={18} /></span>
                      <span className={styles.recordCopy}>
                        <strong>{document.title}</strong>
                        <small>{documentKind(document.category)} · {dateLabel(document.uploaded_at)}</small>
                      </span>
                      {document.file_url && <a href={document.file_url} target="_blank" rel="noreferrer" className={styles.inlineAction}>{tr.openDocument}</a>}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={ReceiptText} title={tr.noReportsTitle} body={tr.noReportsBody} action={tr.viewReports} href="/charity-projects?tab=reports" />
              )}
            </section>

            <section className={`${styles.panel} ${styles.impactPanel}`} aria-labelledby="impact-title">
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.sectionKicker}>{tr.impactTitle}</span>
                  <h2 id="impact-title">{tr.impactTitle}</h2>
                  <p>{tr.impactSubtitle}</p>
                </div>
              </div>
              <dl className={styles.impactGrid}>
                <div><dt>{tr.givingThisYear}</dt><dd>{money(summary.paidThisYear)}</dd></div>
                <div><dt>{tr.projectsSupported}</dt><dd>{count(summary.supportedProjectCount)}</dd></div>
                <div><dt>{tr.peopleSupported}</dt><dd>{count(summary.activeBeneficiaries)}</dd></div>
              </dl>
              {summary.impactMetrics.length > 0 && (
                <ul className={styles.metricChips}>
                  {summary.impactMetrics.slice(0, 3).map(metric => (
                    <li key={metric.id}><strong>{count(toFiniteNumber(metric.metric_value))}</strong><span>{metric.metric_unit || metric.metric_name}</span></li>
                  ))}
                </ul>
              )}
              <Link href="/charity-projects?tab=impact" className={styles.panelAction}>{tr.viewImpact}<ArrowUpRight aria-hidden="true" size={17} /></Link>
            </section>
          </div>
        </div>
      </DashboardPageShell>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action, href }: { icon: LucideIcon; title: string; body: string; action: string; href: string }) {
  return (
    <div className={styles.emptyState}>
      <span><Icon aria-hidden="true" size={22} /></span>
      <strong>{title}</strong>
      <p>{body}</p>
      <Link href={href}>{action}<ArrowUpRight aria-hidden="true" size={16} /></Link>
    </div>
  );
}
