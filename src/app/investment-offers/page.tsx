'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BriefcaseBusiness, FolderKanban, Loader2, Presentation } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageHero } from '@/components/layout/PageHero';
import { PageTabPanel, PageTabs, type PageTabItem } from '@/components/layout/PageTabs';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { computeReadiness } from '@/lib/investor/readiness';
import {
  EMPTY_WORKSPACE,
  isMissingTableError,
  loadRows,
  projectIdOf,
  uniqueDocumentRows,
  type Lang,
  type WorkspaceData,
} from './_data';
import { INVESTOR_TEXT } from './_text';
import { FinancialsTab, OverviewTab, ReadinessTab, type InvestorTabContext } from './_tabs';
import { DocumentsTab, PitchDeckTab, RisksTab } from './_tabsMaterials';
import { ActivityTab, SharingTab } from './_tabsInvestor';
import styles from './investor.module.css';

/**
 * Investor workspace (phase 2.9). Eight journey tabs backed exclusively by
 * real saved data: readiness is computed deterministically in
 * src/lib/investor/readiness.ts, sharing uses hashed secure links, and the
 * activity timeline shows only genuinely logged events.
 */
const INVESTOR_JOURNEY_TABS = [
  'overview',
  'readiness',
  'financials',
  'documents',
  'pitch-deck',
  'risks',
  'sharing',
  'activity',
] as const;
type InvestorJourneyTab = typeof INVESTOR_JOURNEY_TABS[number];
const INVESTOR_TABS_ID_BASE = 'investment-offers';

export default function InvestmentOffersPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const text = INVESTOR_TEXT[locale];

  const [data, setData] = useState<WorkspaceData>(EMPTY_WORKSPACE);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useUrlTabState<InvestorJourneyTab>({
    param: 'tab',
    values: INVESTOR_JOURNEY_TABS,
    defaultValue: 'overview',
    omitDefault: true,
  });

  const reload = useCallback(async () => {
    if (authLoading) return;
    if (!user || isGuest) {
      setData(EMPTY_WORKSPACE);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');

    const [
      projectsResult,
      feasibilityResult,
      financialResult,
      fundingResult,
      pitchDecksResult,
      strategicDocsResult,
      projectDocsResult,
      risksResult,
      linksResult,
      eventsResult,
      questionsResult,
      diligenceResult,
    ] = await Promise.all([
      loadRows('projects', user.id),
      loadRows('project_feasibility_studies', user.id),
      loadRows('project_financial_models', user.id),
      loadRows('project_funding_readiness', user.id),
      loadRows('project_pitch_decks', user.id),
      loadRows('project_strategic_documents', user.id),
      loadRows('project_documents', user.id),
      loadRows('project_risks', user.id),
      loadRows('project_investor_links', user.id),
      loadRows('project_investor_events', user.id),
      loadRows('project_investor_questions', user.id),
      loadRows('project_due_diligence_items', user.id),
    ]);

    const projects = projectsResult.rows.sort((left, right) => {
      const a = new Date(String(left.created_at ?? '')).getTime() || 0;
      const b = new Date(String(right.created_at ?? '')).getTime() || 0;
      return b - a;
    });

    // Missing tables (migration not applied yet) degrade to empty sections;
    // anything else is a real partial-load problem the user must know about.
    const errors = [
      projectsResult, feasibilityResult, financialResult, fundingResult, pitchDecksResult,
      strategicDocsResult, projectDocsResult, risksResult, linksResult, eventsResult,
      questionsResult, diligenceResult,
    ].map(result => result.error).filter(error => error && !isMissingTableError(error));

    const sortByCreated = (rows: typeof projects) => [...rows].sort((left, right) => {
      const a = new Date(String(left.created_at ?? '')).getTime() || 0;
      const b = new Date(String(right.created_at ?? '')).getTime() || 0;
      return b - a;
    });

    setData({
      projects,
      feasibilities: feasibilityResult.rows,
      financialModels: financialResult.rows,
      fundingReadiness: fundingResult.rows,
      pitchDecks: pitchDecksResult.rows,
      strategicDocuments: strategicDocsResult.rows,
      projectDocuments: uniqueDocumentRows(projectDocsResult.rows),
      risks: sortByCreated(risksResult.rows),
      links: sortByCreated(linksResult.rows),
      events: sortByCreated(eventsResult.rows),
      questions: sortByCreated(questionsResult.rows),
      diligenceItems: diligenceResult.rows,
    });
    setLoadError(errors.length ? text.partialLoad : '');

    const requestedProjectId = typeof window === 'undefined'
      ? ''
      : new URLSearchParams(window.location.search).get('project') || '';
    setSelectedProjectId(current => {
      if (current && projects.some(project => project.id === current)) return current;
      if (requestedProjectId && projects.some(project => project.id === requestedProjectId)) return requestedProjectId;
      return projects[0]?.id ?? '';
    });
    setLoading(false);
  }, [authLoading, isGuest, text.partialLoad, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const forProject = useCallback(
    <T extends Record<string, any>>(rows: T[]) => rows.filter(row => projectIdOf(row) === selectedProjectId),
    [selectedProjectId],
  );

  const ctx: InvestorTabContext | null = useMemo(() => {
    if (!user) return null;
    const project = data.projects.find(row => row.id === selectedProjectId) ?? null;
    if (!project) return null;
    const documents = [
      ...forProject(data.strategicDocuments),
      ...forProject(data.projectDocuments),
    ];
    const funding = forProject(data.fundingReadiness)[0] ?? null;
    const financialModel = forProject(data.financialModels)[0] ?? null;
    const feasibility = forProject(data.feasibilities)[0] ?? null;
    const pitchDeck = forProject(data.pitchDecks)[0] ?? null;
    const risks = forProject(data.risks);
    const links = forProject(data.links);
    const report = computeReadiness({
      project,
      feasibility,
      financialModel,
      funding,
      pitchDeck,
      documents,
      risks,
      links,
      contactEmail: user.email ?? null,
    });
    return {
      text,
      lang: locale,
      userId: user.id,
      project,
      feasibility,
      financialModel,
      funding,
      pitchDeck,
      documents,
      risks,
      links,
      events: forProject(data.events),
      questions: forProject(data.questions),
      diligenceStored: forProject(data.diligenceItems),
      report,
      reload,
      goToTab: (tab: string) => setActiveTab(tab as InvestorJourneyTab),
    };
  }, [data, forProject, locale, reload, selectedProjectId, setActiveTab, text, user]);

  const tabs: PageTabItem[] = [
    { id: 'overview', label: text.tabOverview },
    { id: 'readiness', label: text.tabReadiness },
    { id: 'financials', label: text.tabFinancials },
    { id: 'documents', label: text.tabDocuments, count: ctx?.documents.length ?? 0 },
    { id: 'pitch-deck', label: text.tabPitchDeck, count: ctx?.pitchDeck ? 1 : 0 },
    { id: 'risks', label: text.tabRisks, count: ctx?.risks.length ?? 0 },
    { id: 'sharing', label: text.tabSharing, count: ctx?.links.length ?? 0 },
    { id: 'activity', label: text.tabActivity, count: ctx?.events.length ?? 0 },
  ];

  return (
    <div className={`investment-offers-shell ${styles.shell}`} dir={dir}>
      <DashboardPageShell ariaLabel={text.title} contentClassName="investment-offers-content">
        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<Presentation size={30} />}
        />

        {authLoading || loading ? (
          <section className={styles.loadingBox} aria-live="polite">
            <Loader2 size={24} aria-hidden="true" className={styles.spinner} />
            <span>{text.loading}</span>
          </section>
        ) : !user || isGuest ? (
          <EmptyState
            icon={<Presentation size={34} />}
            title={text.signInTitle}
            description={text.signInBody}
            actions={<Link className={styles.primaryAction} href="/login">{text.signIn}</Link>}
          />
        ) : (
          <>
            {loadError ? (
              <div className={styles.warnBanner} role="status">
                <AlertTriangle size={17} aria-hidden="true" />
                <span>{loadError}</span>
              </div>
            ) : null}

            {data.projects.length === 0 ? (
              <EmptyState
                icon={<BriefcaseBusiness size={34} />}
                title={text.noProjectsTitle}
                description={text.noProjectsBody}
                actions={(
                  <Link className={styles.primaryAction} href="/projects">
                    <FolderKanban size={16} aria-hidden="true" /> {text.openProjects}
                  </Link>
                )}
              />
            ) : (
              <>
                <section className={styles.selectorSection}>
                  <ProjectSelector
                    projects={data.projects as Array<{ id: string } & Record<string, any>>}
                    selectedProjectId={selectedProjectId}
                    onChange={setSelectedProjectId}
                    readinessScore={ctx?.report.score ?? null}
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

                {ctx ? (
                  <>
                    <PageTabPanel idBase={INVESTOR_TABS_ID_BASE} value="overview" active={activeTab === 'overview'} className={styles.tabPanel}>
                      <OverviewTab ctx={ctx} />
                    </PageTabPanel>
                    <PageTabPanel idBase={INVESTOR_TABS_ID_BASE} value="readiness" active={activeTab === 'readiness'} className={styles.tabPanel}>
                      <ReadinessTab ctx={ctx} />
                    </PageTabPanel>
                    <PageTabPanel idBase={INVESTOR_TABS_ID_BASE} value="financials" active={activeTab === 'financials'} className={styles.tabPanel}>
                      <FinancialsTab ctx={ctx} />
                    </PageTabPanel>
                    <PageTabPanel idBase={INVESTOR_TABS_ID_BASE} value="documents" active={activeTab === 'documents'} className={styles.tabPanel}>
                      <DocumentsTab ctx={ctx} />
                    </PageTabPanel>
                    <PageTabPanel idBase={INVESTOR_TABS_ID_BASE} value="pitch-deck" active={activeTab === 'pitch-deck'} className={styles.tabPanel}>
                      <PitchDeckTab ctx={ctx} />
                    </PageTabPanel>
                    <PageTabPanel idBase={INVESTOR_TABS_ID_BASE} value="risks" active={activeTab === 'risks'} className={styles.tabPanel}>
                      <RisksTab ctx={ctx} />
                    </PageTabPanel>
                    <PageTabPanel idBase={INVESTOR_TABS_ID_BASE} value="sharing" active={activeTab === 'sharing'} className={styles.tabPanel}>
                      <SharingTab ctx={ctx} />
                    </PageTabPanel>
                    <PageTabPanel idBase={INVESTOR_TABS_ID_BASE} value="activity" active={activeTab === 'activity'} className={styles.tabPanel}>
                      <ActivityTab ctx={ctx} />
                    </PageTabPanel>
                  </>
                ) : null}

                <p className={styles.footNote}>{text.noFakeData}</p>
              </>
            )}
          </>
        )}
      </DashboardPageShell>
    </div>
  );
}
