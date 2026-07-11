'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  FileText,
  FolderKanban,
  Gauge,
  Landmark,
  Loader2,
  Presentation,
  Target,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { CardsGrid, StatGrid } from '@/components/layout/LayoutPrimitives';
import { PageHero } from '@/components/layout/PageHero';
import { PageTabPanel, PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { supabase } from '@/integrations/supabase/client';
import type { TR } from '@/lib/translations';

type Lang = 'ar' | 'en' | 'fr';
type Row = Record<string, any>;
type InvestorJourneyTab = typeof INVESTOR_JOURNEY_TABS[number];
type ProjectRow = Row & { id: string; name?: string | null; created_at?: string | null; updated_at?: string | null };
type LoadState = {
  projects: ProjectRow[];
  pitchDecks: Row[];
  fundingReadiness: Row[];
  strategicDocuments: Row[];
  projectDocuments: Row[];
};
type StatusCardItem = {
  key: string;
  title: string;
  description: string;
  ready: boolean;
  href: string;
  actionLabel: string;
  icon: ReactNode;
  actionIcon: ReactNode;
};

type DisclosureDetail = {
  label: string;
  value: ReactNode;
  dir?: 'auto' | 'ltr' | 'rtl';
};

const INVESTOR_JOURNEY_TABS = ['overview', 'readiness', 'financials', 'documents', 'pitch-deck'] as const;
const INVESTOR_TABS_ID_BASE = 'investment-offers';

const EMPTY_DATA: LoadState = {
  projects: [],
  pitchDecks: [],
  fundingReadiness: [],
  strategicDocuments: [],
  projectDocuments: [],
};

const TEXT_KEYS = {
  title: 'investment_offers_title',
  subtitle: 'investment_offers_subtitle',
  eyebrow: 'investment_offers_eyebrow',
  loading: 'investment_offers_loading',
  signInTitle: 'investment_offers_sign_in_title',
  signInBody: 'investment_offers_sign_in_body',
  signIn: 'investment_offers_sign_in',
  noProjectsTitle: 'investment_offers_no_projects_title',
  noProjectsBody: 'investment_offers_no_projects_body',
  openProjects: 'investment_offers_open_projects',
  openBusinessHub: 'investment_offers_open_business_hub',
  openProjectPitchDeck: 'investment_offers_open_project_pitch_deck',
  createProjectPitchDeck: 'investment_offers_create_project_pitch_deck',
  openFundingReadiness: 'investment_offers_open_funding_readiness',
  selectProject: 'investment_offers_select_project',
  selectProjectHint: 'investment_offers_select_project_hint',
  availableProjects: 'investment_offers_available_projects',
  savedPitchDecks: 'investment_offers_saved_pitch_decks',
  fundingRecords: 'investment_offers_funding_records',
  strategicDocs: 'investment_offers_strategic_docs',
  selectedProject: 'investment_offers_selected_project',
  packageProgress: 'investment_offers_package_progress',
  readyItems: 'investment_offers_ready_items',
  noFakeOffers: 'investment_offers_no_fake_offers',
  pitchDecks: 'investment_offers_pitch_decks',
  fundingReadiness: 'investment_offers_funding_readiness',
  strategicDocuments: 'investment_offers_strategic_documents',
  useOfFunds: 'investment_offers_use_of_funds',
  ready: 'investment_offers_ready',
  needsData: 'investment_offers_needs_data',
  insufficientData: 'investment_offers_insufficient_data',
  pitchDeckReady: 'investment_offers_pitch_deck_ready',
  pitchDeckMissing: 'investment_offers_pitch_deck_missing',
  fundingReady: 'investment_offers_funding_ready',
  fundingMissing: 'investment_offers_funding_missing',
  docsReady: 'investment_offers_docs_ready',
  docsMissing: 'investment_offers_docs_missing',
  fundsReady: 'investment_offers_funds_ready',
  fundsMissing: 'investment_offers_funds_missing',
  sourceNote: 'investment_offers_source_note',
  partialLoadError: 'investment_offers_partial_load_error',
  tabOverview: 'investment_offers_tab_overview',
  tabReadiness: 'investment_offers_tab_readiness',
  tabFinancials: 'investment_offers_tab_financials',
  tabDocuments: 'investment_offers_tab_documents',
  tabPitchDeck: 'investment_offers_tab_pitch_deck',
  workspaceTotals: 'investment_offers_workspace_totals',
  missingItems: 'investment_offers_missing_items',
  nextAction: 'investment_offers_next_action',
  packageReady: 'investment_offers_package_ready',
  packageReadyBody: 'investment_offers_package_ready_body',
  investorActivityUnavailable: 'investment_offers_investor_activity_unavailable',
  fundingNeed: 'investment_offers_funding_need',
  fundingType: 'investment_offers_funding_type',
  financialDetails: 'investment_offers_financial_details',
  lastUpdated: 'investment_offers_last_updated',
  notes: 'investment_offers_notes',
  notRecorded: 'investment_offers_not_recorded',
  useOfFundsBreakdown: 'investment_offers_use_of_funds_breakdown',
  amount: 'investment_offers_amount',
  allocation: 'investment_offers_allocation',
  fundsProduct: 'investment_offers_funds_product',
  fundsMarketing: 'investment_offers_funds_marketing',
  fundsOperations: 'investment_offers_funds_operations',
  fundsHiring: 'investment_offers_funds_hiring',
  fundsLicensesLegal: 'investment_offers_funds_licenses_legal',
  fundsEmergencyReserve: 'investment_offers_funds_emergency_reserve',
  fundsOther: 'investment_offers_funds_other',
  strategicDocumentSource: 'investment_offers_strategic_document_source',
  projectDocumentSource: 'investment_offers_project_document_source',
  documentCategory: 'investment_offers_document_category',
  fileName: 'investment_offers_file_name',
  dataSource: 'investment_offers_data_source',
  pitchDeckDetails: 'investment_offers_pitch_deck_details',
  pitchSlides: 'investment_offers_pitch_slides',
  deckLanguage: 'investment_offers_deck_language',
  noSlideDetails: 'investment_offers_no_slide_details',
} as const satisfies Record<string, keyof typeof TR>;

function textValue(row: Row | null | undefined, keys: string[], fallback = '') {
  if (!row) return fallback;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function projectId(row: Row) {
  return String(row.project_id ?? row.projectId ?? '');
}

function isMissingTableError(message: string) {
  return /does not exist|schema cache|not find|relation/i.test(message);
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric > 0 : true;
  }
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasMeaningfulValue);
  return Boolean(value);
}

function looksStrategicDocument(row: Row) {
  const haystack = [
    row.document_type,
    row.type,
    row.category,
    row.title,
    row.name,
    row.file_name,
    row.notes,
  ].join(' ').toLowerCase();
  return [
    'strategic',
    'business_plan',
    'business plan',
    'investment_memo',
    'investment memo',
    'pitch_deck',
    'pitch deck',
    'executive_summary',
    'executive summary',
    'due_diligence',
    'due diligence',
    'funding',
  ].some(keyword => haystack.includes(keyword));
}

function rowTimestamp(row: Row) {
  return new Date(String(row.updated_at ?? row.uploaded_at ?? row.created_at ?? '')).getTime() || 0;
}

function uniqueDocumentRows(rows: Row[]) {
  const grouped = new Map<string, Row>();
  for (const row of rows) {
    const sourceUrl = String(row.source_url ?? row.sourceUrl ?? '').trim().toLowerCase();
    const key = sourceUrl
      ? [
        row.user_id,
        projectId(row),
        row.category || '',
        sourceUrl,
        row.document_type || row.documentType || row.type || 'uploaded_file',
      ].join('|')
      : `record:${row.id}`;
    const current = grouped.get(key);
    if (!current || rowTimestamp(row) >= rowTimestamp(current)) grouped.set(key, row);
  }
  return Array.from(grouped.values()).sort((left, right) => rowTimestamp(right) - rowTimestamp(left));
}

function formatDate(value: unknown, lang: Lang) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return '';
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPercent(value: number | null, fallback: string) {
  if (value === null) return fallback;
  return `${Math.round(value)}%`;
}

function recordValue(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rowArray(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) as Row[]
    : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => String(item ?? '').trim()).filter(Boolean)
    : [];
}

function formatFundingAmount(value: unknown, currency: unknown, lang: Lang, fallback: string) {
  const amount = numberValue(value);
  if (amount === null || amount <= 0) return fallback;

  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const currencyCode = String(currency ?? '').trim().toUpperCase();
  try {
    if (/^[A-Z]{3}$/.test(currencyCode)) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 3,
      }).format(amount);
    }
  } catch {
    // Fall through to a truthful number plus the stored currency value.
  }
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(amount);
  return currencyCode ? `${formatted} ${currencyCode}` : formatted;
}

function DisclosureCard({
  summary,
  meta,
  open,
  onOpenChange,
  children,
}: {
  summary: string;
  meta?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details className="investment-disclosure" open={open} onToggle={event => onOpenChange(event.currentTarget.open)}>
      <summary>
        <span className="investment-disclosure-title">{summary}</span>
        {meta ? <span className="investment-disclosure-meta">{meta}</span> : null}
        <ChevronDown className="investment-disclosure-chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="investment-disclosure-content">{children}</div>
    </details>
  );
}

function DetailList({ items }: { items: DisclosureDetail[] }) {
  return (
    <dl className="investment-detail-list">
      {items.map(item => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd dir={item.dir}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

async function loadRows(table: string, userId: string, options: { projectScoped?: boolean; select?: string } = {}) {
  try {
    const query = supabase
      .from(table)
      .select(options.select ?? '*')
      .eq('user_id', userId)
      .limit(1000);
    const { data, error } = await query;
    if (error) return { rows: [] as Row[], error: error.message ?? 'Load error' };
    return { rows: (data ?? []) as Row[], error: '' };
  } catch (error) {
    return { rows: [] as Row[], error: error instanceof Error ? error.message : 'Load error' };
  }
}

function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <AppCard className="investment-stat">
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </AppCard>
  );
}

function InvestmentActionButton({
  href,
  label,
  icon,
  variant = 'primary',
  className = '',
  showArrow = true,
  loading = false,
  disabled = false,
}: {
  href: string;
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  showArrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isUnavailable = loading || disabled;

  return (
    <Link
      className={`investment-action-button ${variant} ${loading ? 'is-loading' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}
      href={href}
      aria-label={label}
      aria-disabled={isUnavailable || undefined}
      tabIndex={isUnavailable ? -1 : undefined}
      onClick={event => {
        if (isUnavailable) event.preventDefault();
      }}
    >
      {loading || icon ? (
        <span className="investment-action-icon" aria-hidden="true">
          {loading ? <Loader2 className="investment-action-spinner" size={16} /> : icon}
        </span>
      ) : null}
      <span className="investment-action-label">{label}</span>
      {showArrow ? <ArrowUpRight className="investment-action-arrow" size={14} aria-hidden="true" /> : null}
    </Link>
  );
}

function StatusCard({ item, readyLabel, needsDataLabel }: { item: StatusCardItem; readyLabel: string; needsDataLabel: string }) {
  return (
    <AppCard className="investment-status-card">
      <div className="investment-status-main">
        <div className="status-card-head">
          <span className="status-icon" aria-hidden="true">{item.icon}</span>
          <span className={item.ready ? 'status-badge ready' : 'status-badge missing'}>
            {item.ready ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
            {item.ready ? readyLabel : needsDataLabel}
          </span>
        </div>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
      </div>
      <div className="investment-status-footer">
        <InvestmentActionButton
          className="investment-status-action"
          href={item.href}
          label={item.actionLabel}
          icon={item.actionIcon}
          variant="primary"
        />
      </div>
    </AppCard>
  );
}

export default function InvestmentOffersPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const { lang, dir, t } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const text = useMemo(() => (
    Object.fromEntries(
      Object.entries(TEXT_KEYS).map(([name, key]) => [name, t(key)]),
    ) as Record<keyof typeof TEXT_KEYS, string>
  ), [t]);
  const [data, setData] = useState<LoadState>(EMPTY_DATA);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useUrlTabState<InvestorJourneyTab>({
    param: 'tab',
    values: INVESTOR_JOURNEY_TABS,
    defaultValue: 'overview',
    omitDefault: true,
  });
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});

  const setDisclosureOpen = useCallback((key: string, open: boolean) => {
    setOpenDetails(current => current[key] === open ? current : { ...current, [key]: open });
  }, []);

  const reload = useCallback(async () => {
    if (authLoading) return;
    if (!user || isGuest) {
      setData(EMPTY_DATA);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    const [projectsResult, pitchDecksResult, fundingResult, strategicDocsResult, projectDocsResult] = await Promise.all([
      loadRows('projects', user.id),
      loadRows('project_pitch_decks', user.id),
      loadRows('project_funding_readiness', user.id),
      loadRows('project_strategic_documents', user.id),
      loadRows('project_documents', user.id),
    ]);

    const projects = (projectsResult.rows as ProjectRow[]).sort((left, right) => {
      const a = new Date(String(left.created_at ?? '')).getTime() || 0;
      const b = new Date(String(right.created_at ?? '')).getTime() || 0;
      return b - a;
    });

    const errors = [projectsResult, pitchDecksResult, fundingResult, strategicDocsResult, projectDocsResult]
      .map(result => result.error)
      .filter(error => error && !isMissingTableError(error));

    setData({
      projects,
      pitchDecks: pitchDecksResult.rows,
      fundingReadiness: fundingResult.rows,
      strategicDocuments: strategicDocsResult.rows,
      projectDocuments: uniqueDocumentRows(projectDocsResult.rows),
    });
    setLoadError(errors.length ? text.partialLoadError : '');

    const requestedProjectId = typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('project') || '';
    setSelectedProjectId(current => {
      if (current && projects.some(project => project.id === current)) return current;
      if (requestedProjectId && projects.some(project => project.id === requestedProjectId)) return requestedProjectId;
      return projects[0]?.id ?? '';
    });
    setLoading(false);
  }, [authLoading, isGuest, text.partialLoadError, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const selectedProject = useMemo(
    () => data.projects.find(project => project.id === selectedProjectId) ?? null,
    [data.projects, selectedProjectId],
  );
  const selectedPitchDeck = useMemo(
    () => data.pitchDecks.find(row => projectId(row) === selectedProjectId) ?? null,
    [data.pitchDecks, selectedProjectId],
  );
  const selectedFunding = useMemo(
    () => data.fundingReadiness.find(row => projectId(row) === selectedProjectId) ?? null,
    [data.fundingReadiness, selectedProjectId],
  );
  const selectedStrategicDocuments = useMemo(
    () => data.strategicDocuments.filter(row => projectId(row) === selectedProjectId),
    [data.strategicDocuments, selectedProjectId],
  );
  const selectedProjectDocuments = useMemo(
    () => data.projectDocuments.filter(row => projectId(row) === selectedProjectId && looksStrategicDocument(row)),
    [data.projectDocuments, selectedProjectId],
  );
  const selectedDocuments = useMemo(() => [
    ...selectedStrategicDocuments.map(row => ({ row, origin: 'strategic' as const })),
    ...selectedProjectDocuments.map(row => ({ row, origin: 'project' as const })),
  ], [selectedProjectDocuments, selectedStrategicDocuments]);
  const selectedPitchSlides = useMemo(
    () => rowArray(recordValue(selectedPitchDeck?.deck_data).slides),
    [selectedPitchDeck],
  );
  const useOfFundsRows = useMemo(() => {
    const labels: Record<string, string> = {
      product: text.fundsProduct,
      marketing: text.fundsMarketing,
      operations: text.fundsOperations,
      hiring: text.fundsHiring,
      licensesLegal: text.fundsLicensesLegal,
      emergencyReserve: text.fundsEmergencyReserve,
      other: text.fundsOther,
    };
    return Object.entries(recordValue(selectedFunding?.use_of_funds))
      .map(([key, value]) => {
        const entry = recordValue(value);
        const amount = numberValue(Object.keys(entry).length ? entry.amount : value);
        const percent = numberValue(entry.percent);
        return { key, label: labels[key] ?? key, amount, percent, meaningful: hasMeaningfulValue(value) };
      })
      .filter(entry => entry.meaningful);
  }, [selectedFunding, text]);

  const fundingScore = numberValue(selectedFunding?.readiness_score);
  const pitchScore = numberValue(selectedPitchDeck?.readiness_score);
  const hasFundingReadiness = Boolean(selectedFunding && fundingScore !== null && fundingScore > 0);
  const hasStrategicDocuments = selectedStrategicDocuments.length > 0 || selectedProjectDocuments.length > 0;
  const hasUseOfFunds = hasMeaningfulValue(selectedFunding?.use_of_funds);
  const readyCount = [selectedPitchDeck, hasFundingReadiness, hasStrategicDocuments, hasUseOfFunds].filter(Boolean).length;
  const packagePercent = selectedProject ? Math.round((readyCount / 4) * 100) : null;
  const projectHref = selectedProject ? `/projects/${selectedProject.id}` : '/projects';
  const projectPitchHref = selectedProject ? `/projects/${selectedProject.id}?tab=pitchDeck` : '/projects';
  const businessHubDocumentsHref = selectedProject ? `/business-hub?tab=documents&project=${selectedProject.id}` : '/business-hub?tab=documents';
  const businessHubFundingHref = selectedProject ? `/business-hub?tab=funding&project=${selectedProject.id}` : '/business-hub?tab=funding';
  const selectedProjectName = selectedProject ? textValue(selectedProject, ['name', 'project_name', 'title'], selectedProject.id) : text.insufficientData;
  const selectedProjectUpdated = selectedProject ? formatDate(selectedProject.updated_at ?? selectedProject.created_at, locale) : '';
  const selectedFundingUpdated = selectedFunding ? formatDate(selectedFunding.updated_at ?? selectedFunding.created_at, locale) : '';
  const selectedPitchUpdated = selectedPitchDeck ? formatDate(selectedPitchDeck.updated_at ?? selectedPitchDeck.created_at, locale) : '';
  const fundingAmount = formatFundingAmount(selectedFunding?.funding_needed, selectedFunding?.currency, locale, text.insufficientData);

  const statusCards: StatusCardItem[] = [
    {
      key: 'pitch',
      title: text.pitchDecks,
      description: selectedPitchDeck ? text.pitchDeckReady : text.pitchDeckMissing,
      ready: Boolean(selectedPitchDeck),
      href: projectPitchHref,
      actionLabel: selectedPitchDeck ? text.openProjectPitchDeck : text.createProjectPitchDeck,
      icon: <Presentation size={22} />,
      actionIcon: <Presentation size={16} aria-hidden="true" />,
    },
    {
      key: 'funding',
      title: text.fundingReadiness,
      description: hasFundingReadiness ? text.fundingReady : text.fundingMissing,
      ready: hasFundingReadiness,
      href: businessHubFundingHref,
      actionLabel: text.openFundingReadiness,
      icon: <Gauge size={22} />,
      actionIcon: <Gauge size={16} aria-hidden="true" />,
    },
    {
      key: 'documents',
      title: text.strategicDocuments,
      description: hasStrategicDocuments ? text.docsReady : text.docsMissing,
      ready: hasStrategicDocuments,
      href: businessHubDocumentsHref,
      actionLabel: text.openBusinessHub,
      icon: <FileText size={22} />,
      actionIcon: <BriefcaseBusiness size={16} aria-hidden="true" />,
    },
    {
      key: 'funds',
      title: text.useOfFunds,
      description: hasUseOfFunds ? text.fundsReady : text.fundsMissing,
      ready: hasUseOfFunds,
      href: businessHubFundingHref,
      actionLabel: text.openFundingReadiness,
      icon: <Landmark size={22} />,
      actionIcon: <Landmark size={16} aria-hidden="true" />,
    },
  ];
  const missingStatusItems = statusCards.filter(item => !item.ready);
  const nextAction = missingStatusItems[0] ?? null;
  const tabs: PageTabItem[] = [
    { id: 'overview', label: text.tabOverview },
    { id: 'readiness', label: text.tabReadiness },
    { id: 'financials', label: text.tabFinancials },
    { id: 'documents', label: text.tabDocuments, count: selectedDocuments.length },
    { id: 'pitch-deck', label: text.tabPitchDeck, count: selectedPitchDeck ? 1 : 0 },
  ];

  const heroActions = (
    <>
      <InvestmentActionButton
        className="investment-secondary-action"
        href="/projects"
        label={text.openProjects}
        icon={<FolderKanban size={16} />}
        variant="secondary"
      />
      <InvestmentActionButton
        className="investment-primary-action"
        href={businessHubDocumentsHref}
        label={text.openBusinessHub}
        icon={<BriefcaseBusiness size={16} />}
        variant="primary"
      />
    </>
  );

  return (
    <div className="investment-offers-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="investment-offers-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<Presentation size={30} />}
          actions={heroActions}
        />

        {authLoading || loading ? (
          <section className="investment-loading" aria-live="polite">
            <Loader2 size={24} aria-hidden="true" />
            <span>{text.loading}</span>
          </section>
        ) : !user || isGuest ? (
          <EmptyState
            icon={<Presentation size={34} />}
            title={text.signInTitle}
            description={text.signInBody}
            actions={<InvestmentActionButton className="investment-primary-action" href="/login" label={text.signIn} showArrow={false} />}
          />
        ) : (
          <>
            {loadError && (
              <div className="investment-warning" role="status">
                <AlertTriangle size={17} aria-hidden="true" />
                <span>{loadError}</span>
              </div>
            )}

            {data.projects.length === 0 ? (
              <EmptyState
                icon={<BriefcaseBusiness size={34} />}
                title={text.noProjectsTitle}
                description={text.noProjectsBody}
                actions={(
                  <InvestmentActionButton
                    className="investment-primary-action"
                    href="/projects"
                    label={text.openProjects}
                    icon={<FolderKanban size={16} />}
                    variant="primary"
                  />
                )}
              />
            ) : (
              <>
                <section className="investment-selector-section">
                  <ProjectSelector
                    projects={data.projects}
                    selectedProjectId={selectedProjectId}
                    onChange={setSelectedProjectId}
                    readinessScore={fundingScore}
                    label={text.selectProject}
                    hint={text.selectProjectHint}
                    addProjectHref="/projects"
                    openProjectHref={projectId => `/projects/${projectId}`}
                  />
                </section>

                <PageTabs
                  idBase={INVESTOR_TABS_ID_BASE}
                  tabs={tabs}
                  active={activeTab}
                  onChange={id => setActiveTab(id as InvestorJourneyTab)}
                  ariaLabel={text.title}
                  sticky
                  mobileMode="auto"
                />

                <PageTabPanel
                  idBase={INVESTOR_TABS_ID_BASE}
                  value="overview"
                  active={activeTab === 'overview'}
                  className="investment-tab-panel"
                >
                  <div className="investment-tab-heading">
                    <div>
                      <span>{text.tabOverview}</span>
                      <h2>{selectedProjectName}</h2>
                    </div>
                    <p>{text.sourceNote}</p>
                  </div>

                  <AppCard className="investment-package-card" tone="dark">
                    <div className="package-copy">
                      <span>{text.selectedProject}</span>
                      <h2>{selectedProjectName}</h2>
                      <p>{nextAction ? nextAction.description : text.packageReadyBody}</p>
                      {selectedProjectUpdated && <small>{selectedProjectUpdated}</small>}
                    </div>
                    <div className="package-meter" aria-label={`${text.packageProgress}: ${packagePercent ?? 0}%`}>
                      <strong>{packagePercent ?? 0}%</strong>
                      <span>{text.packageProgress}</span>
                      <em>{readyCount}/4 {text.readyItems}</em>
                    </div>
                    <div className="package-actions">
                      <InvestmentActionButton
                        className="investment-package-action"
                        href={projectHref}
                        label={text.openProjects}
                        icon={<FolderKanban size={16} />}
                        variant="secondary"
                      />
                      <InvestmentActionButton
                        className="investment-package-action"
                        href={nextAction?.href ?? projectPitchHref}
                        label={nextAction?.actionLabel ?? text.openProjectPitchDeck}
                        icon={nextAction ? nextAction.actionIcon : <Presentation size={16} />}
                        variant="primary"
                      />
                    </div>
                  </AppCard>

                  <div className="investment-overview-grid">
                    <AppCard className="investment-next-action-card">
                      <span>{text.nextAction}</span>
                      <h3>{nextAction?.title ?? text.packageReady}</h3>
                      <p>{nextAction?.description ?? text.packageReadyBody}</p>
                      <InvestmentActionButton
                        href={nextAction?.href ?? projectPitchHref}
                        label={nextAction?.actionLabel ?? text.openProjectPitchDeck}
                        icon={nextAction ? nextAction.actionIcon : <Presentation size={16} />}
                        variant="primary"
                      />
                    </AppCard>
                    <AppCard className="investment-missing-card">
                      <span>{text.missingItems}</span>
                      <strong>{missingStatusItems.length}</strong>
                      {missingStatusItems.length ? (
                        <ul>
                          {missingStatusItems.map(item => <li key={item.key}>{item.title}</li>)}
                        </ul>
                      ) : <p>{text.packageReadyBody}</p>}
                    </AppCard>
                  </div>

                  <DisclosureCard
                    summary={text.workspaceTotals}
                    meta={data.projects.length}
                    open={Boolean(openDetails['workspace-totals'])}
                    onOpenChange={open => setDisclosureOpen('workspace-totals', open)}
                  >
                    <StatGrid>
                      <StatCard label={text.availableProjects} value={data.projects.length} icon={<FolderKanban size={18} />} />
                      <StatCard label={text.savedPitchDecks} value={data.pitchDecks.length} icon={<Presentation size={18} />} />
                      <StatCard label={text.fundingRecords} value={data.fundingReadiness.length} icon={<Gauge size={18} />} />
                      <StatCard label={text.strategicDocs} value={data.strategicDocuments.length + data.projectDocuments.filter(looksStrategicDocument).length} icon={<FileText size={18} />} />
                    </StatGrid>
                  </DisclosureCard>

                  <section className="investment-note">
                    <Target size={18} aria-hidden="true" />
                    <div>
                      <p>{text.noFakeOffers}</p>
                      <small>{text.investorActivityUnavailable}</small>
                    </div>
                  </section>
                </PageTabPanel>

                <PageTabPanel
                  idBase={INVESTOR_TABS_ID_BASE}
                  value="readiness"
                  active={activeTab === 'readiness'}
                  className="investment-tab-panel"
                >
                  <div className="investment-tab-heading">
                    <div>
                      <span>{text.packageProgress}</span>
                      <h2>{text.tabReadiness}</h2>
                    </div>
                    <p>{readyCount}/4 {text.readyItems}</p>
                  </div>
                  <CardsGrid className="investment-status-grid">
                    {statusCards.map(item => (
                      <StatusCard key={item.key} item={item} readyLabel={text.ready} needsDataLabel={text.needsData} />
                    ))}
                  </CardsGrid>
                </PageTabPanel>

                <PageTabPanel
                  idBase={INVESTOR_TABS_ID_BASE}
                  value="financials"
                  active={activeTab === 'financials'}
                  className="investment-tab-panel"
                >
                  <div className="investment-tab-heading has-action">
                    <div>
                      <span>{text.fundingReadiness}</span>
                      <h2>{text.tabFinancials}</h2>
                    </div>
                    <InvestmentActionButton
                      href={businessHubFundingHref}
                      label={text.openFundingReadiness}
                      icon={<Gauge size={16} />}
                      variant="primary"
                    />
                  </div>

                  <StatGrid>
                    <StatCard label={text.fundingReadiness} value={formatPercent(fundingScore, text.insufficientData)} icon={<Gauge size={18} />} />
                    <StatCard label={text.fundingNeed} value={fundingAmount} icon={<Landmark size={18} />} />
                    <StatCard label={text.useOfFunds} value={hasUseOfFunds ? text.ready : text.needsData} icon={<Target size={18} />} />
                  </StatGrid>

                  {!selectedFunding ? (
                    <EmptyState
                      icon={<Gauge size={34} />}
                      title={text.fundingReadiness}
                      description={text.fundingMissing}
                      actions={<InvestmentActionButton href={businessHubFundingHref} label={text.openFundingReadiness} icon={<Gauge size={16} />} />}
                    />
                  ) : (
                    <div className="investment-disclosure-list">
                      <DisclosureCard
                        summary={text.financialDetails}
                        meta={formatPercent(fundingScore, text.insufficientData)}
                        open={Boolean(openDetails[`${selectedProjectId}:financial-details`])}
                        onOpenChange={open => setDisclosureOpen(`${selectedProjectId}:financial-details`, open)}
                      >
                        <DetailList items={[
                          { label: text.fundingNeed, value: fundingAmount },
                          { label: text.fundingType, value: textValue(selectedFunding, ['funding_type'], text.notRecorded), dir: 'auto' },
                          { label: text.fundingReadiness, value: formatPercent(fundingScore, text.insufficientData) },
                          { label: text.lastUpdated, value: selectedFundingUpdated || text.notRecorded },
                          { label: text.notes, value: textValue(selectedFunding, ['notes'], text.notRecorded), dir: 'auto' },
                        ]} />
                      </DisclosureCard>

                      <DisclosureCard
                        summary={text.useOfFundsBreakdown}
                        meta={useOfFundsRows.length}
                        open={Boolean(openDetails[`${selectedProjectId}:use-of-funds`])}
                        onOpenChange={open => setDisclosureOpen(`${selectedProjectId}:use-of-funds`, open)}
                      >
                        {useOfFundsRows.length ? (
                          <div className="investment-allocation-list">
                            {useOfFundsRows.map(item => (
                              <div key={item.key}>
                                <strong>{item.label}</strong>
                                <span>{text.amount}: {item.amount === null ? text.notRecorded : formatFundingAmount(item.amount, selectedFunding.currency, locale, text.notRecorded)}</span>
                                <span>{text.allocation}: {item.percent === null ? text.notRecorded : `${item.percent}%`}</span>
                              </div>
                            ))}
                          </div>
                        ) : <p className="investment-detail-empty">{text.fundsMissing}</p>}
                      </DisclosureCard>
                    </div>
                  )}
                </PageTabPanel>

                <PageTabPanel
                  idBase={INVESTOR_TABS_ID_BASE}
                  value="documents"
                  active={activeTab === 'documents'}
                  className="investment-tab-panel"
                >
                  <div className="investment-tab-heading has-action">
                    <div>
                      <span>{selectedDocuments.length}</span>
                      <h2>{text.tabDocuments}</h2>
                    </div>
                    <InvestmentActionButton
                      href={businessHubDocumentsHref}
                      label={text.openBusinessHub}
                      icon={<FileText size={16} />}
                      variant="primary"
                    />
                  </div>

                  {selectedDocuments.length === 0 ? (
                    <EmptyState
                      icon={<FileText size={34} />}
                      title={text.strategicDocuments}
                      description={text.docsMissing}
                      actions={<InvestmentActionButton href={businessHubDocumentsHref} label={text.openBusinessHub} icon={<FileText size={16} />} />}
                    />
                  ) : (
                    <div className="investment-disclosure-list">
                      {selectedDocuments.map(({ row, origin }, index) => {
                        const rowId = String(row.id ?? `${origin}-${index}`);
                        const disclosureKey = `${selectedProjectId}:document:${origin}:${rowId}`;
                        const title = textValue(row, ['title', 'name', 'file_name'], text.insufficientData);
                        const category = textValue(row, ['document_type', 'type', 'category', 'file_type'], text.notRecorded);
                        const updatedAt = formatDate(row.updated_at ?? row.uploaded_at ?? row.created_at, locale) || text.notRecorded;
                        return (
                          <DisclosureCard
                            key={`${origin}:${rowId}`}
                            summary={title}
                            meta={category}
                            open={Boolean(openDetails[disclosureKey])}
                            onOpenChange={open => setDisclosureOpen(disclosureKey, open)}
                          >
                            <DetailList items={[
                              { label: text.documentCategory, value: category, dir: 'auto' },
                              { label: text.dataSource, value: origin === 'strategic' ? text.strategicDocumentSource : text.projectDocumentSource },
                              { label: text.fileName, value: textValue(row, ['file_name'], text.notRecorded), dir: 'auto' },
                              { label: text.lastUpdated, value: updatedAt },
                              { label: text.notes, value: textValue(row, ['notes'], text.notRecorded), dir: 'auto' },
                            ]} />
                          </DisclosureCard>
                        );
                      })}
                    </div>
                  )}
                </PageTabPanel>

                <PageTabPanel
                  idBase={INVESTOR_TABS_ID_BASE}
                  value="pitch-deck"
                  active={activeTab === 'pitch-deck'}
                  className="investment-tab-panel"
                >
                  <div className="investment-tab-heading has-action">
                    <div>
                      <span>{text.pitchDecks}</span>
                      <h2>{text.tabPitchDeck}</h2>
                    </div>
                    <InvestmentActionButton
                      href={projectPitchHref}
                      label={selectedPitchDeck ? text.openProjectPitchDeck : text.createProjectPitchDeck}
                      icon={<Presentation size={16} />}
                      variant="primary"
                    />
                  </div>

                  {!selectedPitchDeck ? (
                    <EmptyState
                      icon={<Presentation size={34} />}
                      title={text.pitchDecks}
                      description={text.pitchDeckMissing}
                      actions={<InvestmentActionButton href={projectPitchHref} label={text.createProjectPitchDeck} icon={<Presentation size={16} />} />}
                    />
                  ) : (
                    <>
                      <StatGrid>
                        <StatCard label={text.fundingReadiness} value={formatPercent(pitchScore, text.insufficientData)} icon={<Gauge size={18} />} />
                        <StatCard label={text.pitchSlides} value={selectedPitchSlides.length} icon={<Presentation size={18} />} />
                        <StatCard label={text.deckLanguage} value={textValue(selectedPitchDeck, ['language'], text.notRecorded)} icon={<FileText size={18} />} />
                      </StatGrid>

                      <div className="investment-disclosure-list">
                        <DisclosureCard
                          summary={text.pitchDeckDetails}
                          meta={selectedPitchUpdated || text.notRecorded}
                          open={Boolean(openDetails[`${selectedProjectId}:pitch-details`])}
                          onOpenChange={open => setDisclosureOpen(`${selectedProjectId}:pitch-details`, open)}
                        >
                          <DetailList items={[
                            { label: text.fundingReadiness, value: formatPercent(pitchScore, text.insufficientData) },
                            { label: text.deckLanguage, value: textValue(selectedPitchDeck, ['language'], text.notRecorded), dir: 'auto' },
                            { label: text.dataSource, value: textValue(selectedPitchDeck, ['source'], text.notRecorded), dir: 'auto' },
                            { label: text.lastUpdated, value: selectedPitchUpdated || text.notRecorded },
                          ]} />
                        </DisclosureCard>

                        {selectedPitchSlides.length ? selectedPitchSlides.map((slide, index) => {
                          const slideId = String(slide.id ?? index);
                          const disclosureKey = `${selectedProjectId}:pitch-slide:${slideId}`;
                          const content = recordValue(slide.content);
                          const headline = textValue(content, ['headline']);
                          const bullets = stringArray(content.bullets);
                          const missingData = rowArray(slide.missingData)
                            .map(item => textValue(item, ['label']))
                            .filter(Boolean);
                          const hasSlideDetail = Boolean(headline || bullets.length || missingData.length);
                          return (
                            <DisclosureCard
                              key={slideId}
                              summary={textValue(slide, ['title'], `${text.pitchSlides} ${index + 1}`)}
                              meta={textValue(slide, ['status'], text.notRecorded)}
                              open={Boolean(openDetails[disclosureKey])}
                              onOpenChange={open => setDisclosureOpen(disclosureKey, open)}
                            >
                              {hasSlideDetail ? (
                                <div className="investment-slide-detail">
                                  {headline ? <p>{headline}</p> : null}
                                  {bullets.length ? <ul>{bullets.map((bullet, bulletIndex) => <li key={`${slideId}:bullet:${bulletIndex}`}>{bullet}</li>)}</ul> : null}
                                  {missingData.length ? (
                                    <div className="investment-slide-missing">
                                      <strong>{text.missingItems}</strong>
                                      <ul>{missingData.map((item, itemIndex) => <li key={`${slideId}:missing:${itemIndex}`}>{item}</li>)}</ul>
                                    </div>
                                  ) : null}
                                </div>
                              ) : <p className="investment-detail-empty">{text.noSlideDetails}</p>}
                            </DisclosureCard>
                          );
                        }) : <p className="investment-detail-empty standalone">{text.noSlideDetails}</p>}
                      </div>
                    </>
                  )}
                </PageTabPanel>
              </>
            )}
          </>
        )}
      </DashboardPageShell>

      <style jsx>{`
        .investment-offers-shell {
          min-height: 100vh;
          min-height: 100dvh;
          background:
            radial-gradient(circle at 18% 10%, rgba(29, 140, 255, .10), transparent 34%),
            linear-gradient(160deg, var(--sfm-background) 0%, #F8FBFF 58%, #E7F1FF 100%);
          color: var(--sfm-foreground);
          font-family: Tajawal, Arial, sans-serif;
          overflow-x: clip;
        }
        .investment-offers-content {
          display: grid;
          gap: 18px;
          min-width: 0;
        }
        :global(.investment-action-button) {
          min-height: 50px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 22px;
          font-size: 13px;
          font-weight: 950;
          line-height: 1.2;
          text-decoration: none;
          cursor: pointer;
          min-width: 0;
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid rgba(24, 212, 212, .42);
          background:
            linear-gradient(135deg, #061629 0%, #0A2C46 44%, #0D5365 74%, #18D4D4 140%);
          color: #FFFFFF;
          box-shadow:
            0 16px 34px rgba(3, 18, 37, .18),
            0 8px 22px rgba(24, 212, 212, .16),
            inset 0 1px 0 rgba(255, 255, 255, .16);
          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease,
            background .18s ease,
            color .18s ease,
            opacity .18s ease;
        }
        :global(.investment-action-button)::before {
          content: '';
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, .16), transparent 42%),
            radial-gradient(circle at 82% 18%, rgba(167, 243, 240, .22), transparent 34%);
          pointer-events: none;
          z-index: -1;
        }
        :global(.investment-action-button)::after {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(90deg, transparent, rgba(167, 243, 240, .22), transparent);
          opacity: 0;
          transform: translateX(-22%);
          transition: opacity .18s ease, transform .18s ease;
          pointer-events: none;
          z-index: -1;
        }
        :global(.investment-action-button.primary) {
          color: #FFFFFF;
        }
        :global(.investment-action-button.secondary) {
          background:
            linear-gradient(135deg, #071A30 0%, #0B3753 50%, #0F6170 86%, #18D4D4 150%);
          color: #FFFFFF;
        }
        :global(.investment-action-icon) {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          border-radius: 999px;
          display: inline-grid;
          place-items: center;
          color: #DFFBFF;
          background: rgba(255, 255, 255, .14);
          border: 1px solid rgba(255, 255, 255, .16);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .16);
        }
        :global(.investment-action-label) {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #FFFFFF;
        }
        :global(.investment-action-arrow) {
          flex: 0 0 auto;
          color: #A7F3F0;
        }
        [dir='rtl'] :global(.investment-action-arrow) {
          transform: scaleX(-1);
        }
        :global(.investment-action-button):hover,
        :global(.investment-action-button):focus-visible {
          outline: none;
          transform: translateY(-2px);
          border-color: rgba(167, 243, 240, .68);
          box-shadow:
            0 0 0 3px rgba(24, 212, 212, .18),
            0 20px 42px rgba(3, 18, 37, .22),
            0 12px 28px rgba(24, 212, 212, .20),
            inset 0 1px 0 rgba(255, 255, 255, .20);
        }
        :global(.investment-action-button):hover::after,
        :global(.investment-action-button):focus-visible::after {
          opacity: 1;
          transform: translateX(16%);
        }
        :global(.investment-action-button):active {
          transform: translateY(0) scale(.985);
          box-shadow:
            0 8px 20px rgba(3, 18, 37, .20),
            inset 0 2px 10px rgba(3, 18, 37, .18);
        }
        :global(.investment-action-button[aria-disabled='true']),
        :global(.investment-action-button.is-disabled),
        :global(.investment-action-button.is-loading) {
          cursor: not-allowed;
          opacity: .68;
          transform: none;
          box-shadow: none;
        }
        :global(.investment-action-spinner) {
          animation: investment-spin 1s linear infinite;
        }
        .investment-selector-section :global(.project-selector-change),
        .investment-selector-section :global(.project-selector-action) {
          min-height: 48px;
          border-radius: 999px;
          border: 1px solid rgba(24, 212, 212, .42);
          background:
            linear-gradient(135deg, #061629 0%, #0A2C46 44%, #0D5365 74%, #18D4D4 140%);
          color: #FFFFFF;
          padding: 0 20px;
          font-size: 13px;
          font-weight: 950;
          box-shadow:
            0 14px 30px rgba(3, 18, 37, .16),
            0 8px 20px rgba(24, 212, 212, .14),
            inset 0 1px 0 rgba(255, 255, 255, .16);
        }
        .investment-selector-section :global(.project-selector-action.secondary),
        .investment-selector-section :global(.project-selector-action.add-primary) {
          border-color: rgba(24, 212, 212, .42);
          background:
            linear-gradient(135deg, #071A30 0%, #0B3753 50%, #0F6170 86%, #18D4D4 150%);
          color: #FFFFFF;
        }
        .investment-selector-section :global(.project-selector-change svg),
        .investment-selector-section :global(.project-selector-action svg) {
          color: #A7F3F0;
        }
        .investment-selector-section :global(.project-selector-action:not(.disabled):hover),
        .investment-selector-section :global(.project-selector-action:not(.disabled):focus-visible) {
          border-color: rgba(167, 243, 240, .68);
          background:
            linear-gradient(135deg, #09213A 0%, #0D3D5D 48%, #11717B 88%, #20E2E2 150%);
          color: #FFFFFF;
          box-shadow:
            0 0 0 3px rgba(24, 212, 212, .16),
            0 18px 38px rgba(3, 18, 37, .20),
            0 10px 24px rgba(24, 212, 212, .18);
          transform: translateY(-2px);
        }
        .investment-selector-section :global(.project-selector-action.disabled) {
          border-color: rgba(29, 140, 255, .14);
          background: #EAF1F8;
          color: #64748B;
          box-shadow: none;
          opacity: .72;
        }
        .investment-loading,
        .investment-warning,
        .investment-note {
          border: 1px solid rgba(29, 140, 255, .16);
          border-radius: 18px;
          background: rgba(255, 255, 255, .84);
          box-shadow: 0 12px 30px rgba(3, 18, 37, .06);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--sfm-midnight);
          font-weight: 900;
          min-width: 0;
        }
        .investment-loading svg {
          animation: investment-spin 1s linear infinite;
          color: var(--sfm-primary);
        }
        .investment-warning {
          border-color: rgba(245, 158, 11, .24);
          background: #FFFBEB;
          color: #92400E;
        }
        .investment-note {
          align-items: flex-start;
          background: rgba(24, 212, 212, .08);
          border-color: rgba(24, 212, 212, .20);
        }
        .investment-note svg {
          flex: 0 0 auto;
          color: var(--sfm-primary);
          margin-top: 3px;
        }
        .investment-note p {
          margin: 0;
          color: var(--sfm-midnight);
          line-height: 1.7;
          overflow-wrap: anywhere;
        }
        .investment-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .investment-stat > span {
          width: 42px;
          height: 42px;
          border-radius: 15px;
          display: grid;
          place-items: center;
          color: var(--sfm-primary);
          background: linear-gradient(135deg, rgba(29, 140, 255, .12), rgba(24, 212, 212, .14));
          border: 1px solid rgba(29, 140, 255, .13);
        }
        .investment-stat div {
          display: grid;
          gap: 5px;
          min-width: 0;
        }
        .investment-stat small,
        :global(.investment-package-card) small {
          color: var(--sfm-muted-readable, #475569);
          font-size: 12px;
          font-weight: 900;
        }
        .investment-stat strong {
          color: var(--sfm-primary-dark);
          font-size: 26px;
          font-weight: 950;
          line-height: 1;
        }
        .investment-selector-section {
          min-width: 0;
        }
        :global(.investment-package-card) {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          gap: 18px;
          align-items: center;
          overflow: hidden;
        }
        .package-copy {
          min-width: 0;
          display: grid;
          gap: 7px;
        }
        .package-copy span {
          color: var(--sfm-soft-cyan);
          font-size: 12px;
          font-weight: 950;
        }
        .package-copy h2 {
          margin: 0;
          color: #FFFFFF;
          font-size: clamp(24px, 4vw, 36px);
          line-height: 1.12;
          overflow-wrap: anywhere;
        }
        .package-copy p {
          margin: 0;
          color: rgba(234, 246, 255, .78);
          line-height: 1.7;
          font-weight: 850;
        }
        .package-copy small {
          color: var(--sfm-soft-cyan);
        }
        .package-meter {
          width: 150px;
          aspect-ratio: 1;
          border-radius: 50%;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 4px;
          text-align: center;
          border: 1px solid rgba(167, 243, 240, .20);
          background:
            radial-gradient(circle at 50% 50%, rgba(3, 18, 37, .82) 0 58%, transparent 60%),
            conic-gradient(var(--sfm-accent) ${packagePercent ?? 0}%, rgba(255, 255, 255, .14) 0);
          box-shadow: 0 18px 48px rgba(3, 18, 37, .26);
        }
        .package-meter strong {
          color: #FFFFFF;
          font-size: 30px;
          font-weight: 950;
          line-height: 1;
        }
        .package-meter span,
        .package-meter em {
          color: var(--sfm-soft-cyan);
          font-size: 11px;
          font-style: normal;
          font-weight: 900;
          line-height: 1.35;
        }
        .package-actions {
          display: grid;
          gap: 9px;
          min-width: min(180px, 100%);
        }
        :global(.investment-status-grid) {
          grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
        }
        :global(.investment-status-card) {
          display: flex;
          flex-direction: column;
          gap: 0;
          height: 100%;
          min-width: 0;
        }
        .investment-status-main {
          display: grid;
          gap: 12px;
          align-content: start;
          flex: 1 1 auto;
          min-width: 0;
        }
        .status-card-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .status-icon {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, rgba(29, 140, 255, .12), rgba(24, 212, 212, .14));
          color: var(--sfm-primary);
          border: 1px solid rgba(29, 140, 255, .12);
        }
        .status-badge {
          min-height: 30px;
          border-radius: 999px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }
        .status-badge.ready {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid rgba(16, 185, 129, .22);
        }
        .status-badge.missing {
          background: #FFFBEB;
          color: #92400E;
          border: 1px solid rgba(245, 158, 11, .24);
        }
        :global(.investment-status-card) h2 {
          margin: 0;
          color: var(--sfm-midnight);
          font-size: 20px;
          font-weight: 950;
          line-height: 1.25;
        }
        :global(.investment-status-card) p {
          margin: 0;
          color: var(--sfm-muted-readable, #475569);
          line-height: 1.7;
          font-weight: 850;
        }
        :global(.investment-status-card) small {
          width: fit-content;
          max-width: 100%;
          border-radius: 999px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary-hover);
          border: 1px solid rgba(29, 140, 255, .14);
          padding: 6px 10px;
          font-weight: 950;
          overflow-wrap: anywhere;
        }
        .investment-status-footer {
          display: flex;
          align-items: center;
          justify-content: stretch;
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(29, 140, 255, .11);
          min-width: 0;
        }
        :global(.investment-status-action) {
          width: 100%;
          max-width: 100%;
          min-height: 50px;
          border-radius: 999px;
          padding-inline: 18px;
          align-self: auto;
          margin-top: 0;
          line-height: 1.2;
          white-space: nowrap;
        }
        :global(.investment-status-action) :global(.investment-action-label) {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        :global(.investment-tab-panel) {
          display: grid;
          gap: 16px;
          min-width: 0;
          outline: none;
        }
        :global(.investment-tab-panel):focus-visible {
          border-radius: 16px;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--sfm-primary) 24%, transparent);
        }
        .investment-tab-heading {
          min-width: 0;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          padding: 2px 2px 0;
        }
        .investment-tab-heading > div {
          min-width: 0;
          display: grid;
          gap: 5px;
        }
        .investment-tab-heading span {
          color: var(--sfm-primary);
          font-size: 12px;
          font-weight: 950;
        }
        .investment-tab-heading h2,
        :global(.investment-next-action-card) h3 {
          margin: 0;
          color: var(--sfm-heading, var(--sfm-midnight));
          overflow-wrap: anywhere;
        }
        .investment-tab-heading h2 {
          font-size: clamp(22px, 3vw, 30px);
          line-height: 1.2;
        }
        .investment-tab-heading p {
          max-width: 560px;
          margin: 0;
          color: var(--sfm-muted-readable, #475569);
          line-height: 1.65;
          font-weight: 800;
        }
        .investment-tab-heading.has-action {
          align-items: center;
        }
        .investment-overview-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(240px, .6fr);
          gap: 14px;
          min-width: 0;
        }
        :global(.investment-next-action-card),
        :global(.investment-missing-card) {
          min-width: 0;
          display: grid;
          align-content: start;
          gap: 10px;
        }
        :global(.investment-next-action-card) > span,
        :global(.investment-missing-card) > span {
          color: var(--sfm-primary);
          font-size: 12px;
          font-weight: 950;
        }
        :global(.investment-next-action-card) h3 {
          font-size: 21px;
        }
        :global(.investment-next-action-card) p,
        :global(.investment-missing-card) p {
          margin: 0;
          color: var(--sfm-muted-readable, #475569);
          line-height: 1.65;
          font-weight: 800;
        }
        :global(.investment-next-action-card) :global(.investment-action-button) {
          width: fit-content;
          max-width: 100%;
          margin-top: 3px;
        }
        :global(.investment-missing-card) > strong {
          color: var(--sfm-heading, var(--sfm-midnight));
          font-size: 34px;
          line-height: 1;
        }
        :global(.investment-missing-card) ul,
        .investment-slide-detail ul,
        .investment-slide-missing ul {
          margin: 0;
          padding-inline-start: 20px;
          color: var(--sfm-body, var(--sfm-foreground));
          line-height: 1.65;
          font-weight: 800;
        }
        .investment-disclosure-list {
          display: grid;
          gap: 10px;
          min-width: 0;
        }
        :global(.investment-disclosure) {
          min-width: 0;
          border: 1px solid var(--sfm-border);
          border-radius: var(--sfm-light-radius-card, 16px);
          background: var(--sfm-card);
          overflow: hidden;
          box-shadow: 0 8px 24px color-mix(in srgb, var(--sfm-heading) 6%, transparent);
        }
        :global(.investment-disclosure) > summary {
          min-height: 52px;
          list-style: none;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto 20px;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          color: var(--sfm-heading, var(--sfm-midnight));
          cursor: pointer;
        }
        :global(.investment-disclosure) > summary::-webkit-details-marker {
          display: none;
        }
        :global(.investment-disclosure) > summary:focus-visible {
          outline: 3px solid color-mix(in srgb, var(--sfm-primary) 28%, transparent);
          outline-offset: -3px;
        }
        :global(.investment-disclosure-title) {
          min-width: 0;
          font-weight: 950;
          overflow-wrap: anywhere;
        }
        :global(.investment-disclosure-meta) {
          max-width: min(260px, 34vw);
          border-radius: 999px;
          padding: 4px 9px;
          background: color-mix(in srgb, var(--sfm-primary) 9%, transparent);
          color: var(--sfm-primary-hover, var(--sfm-primary));
          font-size: 11px;
          font-weight: 900;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        :global(.investment-disclosure-chevron) {
          color: var(--sfm-muted-readable, #475569);
          transition: transform .18s ease;
        }
        :global(.investment-disclosure)[open] :global(.investment-disclosure-chevron) {
          transform: rotate(180deg);
        }
        :global(.investment-disclosure-content) {
          min-width: 0;
          border-top: 1px solid var(--sfm-border);
          padding: 14px;
        }
        :global(.investment-detail-list) {
          margin: 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }
        :global(.investment-detail-list) > div {
          min-width: 0;
          border-radius: 12px;
          background: var(--sfm-light-card, color-mix(in srgb, var(--sfm-card) 92%, var(--sfm-primary)));
          padding: 10px 11px;
        }
        :global(.investment-detail-list) dt {
          color: var(--sfm-muted-readable, #475569);
          font-size: 11px;
          font-weight: 900;
        }
        :global(.investment-detail-list) dd {
          margin: 4px 0 0;
          color: var(--sfm-body, var(--sfm-foreground));
          font-weight: 850;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        .investment-allocation-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr));
          gap: 9px;
        }
        .investment-allocation-list > div {
          min-width: 0;
          display: grid;
          gap: 5px;
          border-radius: 12px;
          background: var(--sfm-light-card, color-mix(in srgb, var(--sfm-card) 92%, var(--sfm-primary)));
          padding: 11px;
        }
        .investment-allocation-list strong {
          color: var(--sfm-heading, var(--sfm-midnight));
          overflow-wrap: anywhere;
        }
        .investment-allocation-list span {
          color: var(--sfm-muted-readable, #475569);
          font-size: 12px;
          font-weight: 800;
          overflow-wrap: anywhere;
        }
        .investment-slide-detail {
          display: grid;
          gap: 12px;
          min-width: 0;
        }
        .investment-slide-detail > p,
        .investment-detail-empty {
          margin: 0;
          color: var(--sfm-body, var(--sfm-foreground));
          line-height: 1.7;
          font-weight: 800;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }
        .investment-slide-missing {
          display: grid;
          gap: 7px;
          border-inline-start: 3px solid var(--sfm-warning, #D97706);
          padding-inline-start: 12px;
        }
        .investment-slide-missing strong {
          color: var(--sfm-heading, var(--sfm-midnight));
        }
        .investment-detail-empty.standalone {
          border: 1px dashed var(--sfm-border);
          border-radius: 14px;
          background: var(--sfm-card);
          padding: 14px;
        }
        .investment-note > div {
          min-width: 0;
          display: grid;
          gap: 4px;
        }
        .investment-note small {
          color: var(--sfm-muted-readable, #475569);
          line-height: 1.55;
          font-weight: 800;
        }
        @keyframes investment-spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1120px) {
          :global(.investment-package-card) {
            grid-template-columns: minmax(0, 1fr) auto;
          }
          .package-actions {
            grid-column: 1 / -1;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 720px) {
          .investment-offers-content {
            gap: 16px;
          }
          :global(.investment-package-card) {
            grid-template-columns: 1fr;
          }
          .package-meter {
            width: min(150px, 58vw);
            justify-self: center;
          }
          .package-actions {
            grid-template-columns: 1fr;
          }
          .investment-tab-heading,
          .investment-tab-heading.has-action {
            align-items: stretch;
            flex-direction: column;
          }
          .investment-tab-heading :global(.investment-action-button),
          :global(.investment-next-action-card) :global(.investment-action-button) {
            width: 100%;
          }
          .investment-overview-grid,
          :global(.investment-detail-list) {
            grid-template-columns: minmax(0, 1fr);
          }
          :global(.investment-disclosure) > summary {
            grid-template-columns: minmax(0, 1fr) 18px;
          }
          :global(.investment-disclosure-meta) {
            grid-column: 1 / 2;
            grid-row: 2;
            width: fit-content;
            max-width: 100%;
          }
          :global(.investment-disclosure-chevron) {
            grid-column: 2;
            grid-row: 1 / 3;
          }
          :global(.investment-primary-action),
          :global(.investment-secondary-action),
          :global(.investment-status-action),
          :global(.investment-package-action) {
            width: 100%;
          }
          .investment-loading,
          .investment-warning,
          .investment-note {
            align-items: flex-start;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.investment-disclosure-chevron) {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
