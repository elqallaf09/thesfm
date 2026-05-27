'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
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
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';

type Lang = 'ar' | 'en' | 'fr';
type Row = Record<string, any>;
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
  detail: string;
  href: string;
  actionLabel: string;
  icon: ReactNode;
};

const EMPTY_DATA: LoadState = {
  projects: [],
  pitchDecks: [],
  fundingReadiness: [],
  strategicDocuments: [],
  projectDocuments: [],
};

const TEXT = {
  ar: {
    title: 'العروض الاستثمارية',
    subtitle: 'مركز مختصر لمواد المستثمرين الجاهزة من مشاريعك: Pitch Deck، جاهزية التمويل، المستندات الاستراتيجية، واستخدام التمويل.',
    eyebrow: 'حزمة المستثمر من بيانات مشروعك الفعلية',
    loading: 'جاري تحميل مواد العروض الاستثمارية...',
    signInTitle: 'سجّل الدخول لعرض العروض الاستثمارية.',
    signInBody: 'لا يمكن عرض مواد المستثمرين بدون حساب وبيانات مشاريع محفوظة.',
    signIn: 'تسجيل الدخول',
    noProjectsTitle: 'أضف مشروعاً أولاً لإنشاء عرض استثماري.',
    noProjectsBody: 'لن تظهر عروض أو مواد مستثمرين قبل إضافة مشروع حقيقي.',
    openProjects: 'فتح مشاريعي',
    openBusinessHub: 'فتح مركز الأعمال',
    openProjectPitchDeck: 'فتح Pitch Deck للمشروع',
    openFundingReadiness: 'فتح جاهزية التمويل',
    selectProject: 'اختيار المشروع',
    selectProjectHint: 'اختر مشروعاً لعرض حالة مواد المستثمرين بناءً على بياناته الفعلية.',
    projects: 'المشاريع',
    pitchDecks: 'Pitch Deck',
    fundingReadiness: 'جاهزية التمويل',
    strategicDocuments: 'المستندات الاستراتيجية',
    useOfFunds: 'استخدام التمويل',
    investorPackage: 'حزمة المستثمر',
    ready: 'جاهز',
    needsData: 'يحتاج بيانات',
    insufficientData: 'بيانات غير كافية',
    availableProjects: 'مشاريع متاحة',
    savedPitchDecks: 'عروض محفوظة',
    fundingRecords: 'سجلات جاهزية التمويل',
    strategicDocs: 'مستندات استراتيجية',
    selectedProject: 'المشروع المحدد',
    packageProgress: 'اكتمال حزمة المستثمر',
    readyItems: 'عناصر جاهزة',
    noFakeOffers: 'لا يتم عرض مستثمرين، فرص تمويل، أو عروض وهمية. هذه الصفحة تعرض حالة المواد التي أنشأتها أو حفظتها فقط.',
    pitchDeckReady: 'يوجد Pitch Deck محفوظ لهذا المشروع.',
    pitchDeckMissing: 'أنشئ Pitch Deck من صفحة المشروع أو مركز الأعمال.',
    fundingReady: 'توجد بيانات جاهزية تمويل محفوظة لهذا المشروع.',
    fundingMissing: 'أكمل جاهزية التمويل لتوضيح احتياج المشروع وتمويله.',
    docsReady: 'توجد مستندات استراتيجية أو مستندات مشروع مرتبطة بهذا المشروع.',
    docsMissing: 'أضف المستندات الاستراتيجية أو مستندات المشروع المطلوبة.',
    fundsReady: 'تم حفظ توزيع استخدام التمويل لهذا المشروع.',
    fundsMissing: 'أكمل خطة استخدام التمويل في مركز الأعمال.',
    sourceNote: 'المصدر: بيانات المشاريع، Pitch Deck، جاهزية التمويل، ومستنداتك المحفوظة.',
    partialLoadError: 'تعذر تحميل بعض مصادر البيانات حالياً. تم عرض ما يمكن تحميله فقط.',
  },
  en: {
    title: 'Investment Offers',
    subtitle: 'A focused hub for investor-ready project materials: Pitch Deck, funding readiness, strategic documents, and use of funds.',
    eyebrow: 'Investor package from your real project data',
    loading: 'Loading investment offer materials...',
    signInTitle: 'Sign in to view investment offers.',
    signInBody: 'Investor materials require an account and saved project data.',
    signIn: 'Sign In',
    noProjectsTitle: 'Add a project first to create an investment offer.',
    noProjectsBody: 'Investor materials will not appear until you add a real project.',
    openProjects: 'Open My Projects',
    openBusinessHub: 'Open Business Hub',
    openProjectPitchDeck: 'Open Project Pitch Deck',
    openFundingReadiness: 'Open Funding Readiness',
    selectProject: 'Select Project',
    selectProjectHint: 'Choose a project to view investor material status from its real data.',
    projects: 'Projects',
    pitchDecks: 'Pitch Deck',
    fundingReadiness: 'Funding Readiness',
    strategicDocuments: 'Strategic Documents',
    useOfFunds: 'Use of Funds',
    investorPackage: 'Investor Package',
    ready: 'Ready',
    needsData: 'Needs Data',
    insufficientData: 'Insufficient data',
    availableProjects: 'Available Projects',
    savedPitchDecks: 'Saved Pitch Decks',
    fundingRecords: 'Funding Readiness Records',
    strategicDocs: 'Strategic Documents',
    selectedProject: 'Selected Project',
    packageProgress: 'Investor Package Completion',
    readyItems: 'Ready Items',
    noFakeOffers: 'No fake investors, funding opportunities, or offers are shown. This page only reflects materials you created or saved.',
    pitchDeckReady: 'A Pitch Deck is saved for this project.',
    pitchDeckMissing: 'Create a Pitch Deck from the project page or Business Hub.',
    fundingReady: 'Funding readiness data is saved for this project.',
    fundingMissing: 'Complete funding readiness to clarify the project funding need.',
    docsReady: 'Strategic documents or project documents are linked to this project.',
    docsMissing: 'Add strategic documents or the required project documents.',
    fundsReady: 'Use-of-funds allocation is saved for this project.',
    fundsMissing: 'Complete the use-of-funds plan in Business Hub.',
    sourceNote: 'Source: projects, Pitch Decks, funding readiness, and saved documents.',
    partialLoadError: 'Some data sources could not be loaded right now. Showing what is available.',
  },
  fr: {
    title: 'Offres d’investissement',
    subtitle: 'Un centre clair pour les éléments prêts pour investisseurs : Pitch Deck, préparation au financement, documents stratégiques et utilisation des fonds.',
    eyebrow: 'Dossier investisseur basé sur vos données projet réelles',
    loading: 'Chargement des éléments d’offre d’investissement...',
    signInTitle: 'Connectez-vous pour voir les offres d’investissement.',
    signInBody: 'Les éléments investisseurs nécessitent un compte et des données projet enregistrées.',
    signIn: 'Se connecter',
    noProjectsTitle: 'Ajoutez d’abord un projet pour créer une offre d’investissement.',
    noProjectsBody: 'Les éléments investisseurs n’apparaîtront qu’après l’ajout d’un projet réel.',
    openProjects: 'Ouvrir mes projets',
    openBusinessHub: 'Ouvrir le Centre d’affaires',
    openProjectPitchDeck: 'Ouvrir le Pitch Deck du projet',
    openFundingReadiness: 'Ouvrir la préparation au financement',
    selectProject: 'Sélectionner un projet',
    selectProjectHint: 'Choisissez un projet pour voir l’état des éléments investisseurs selon ses données réelles.',
    projects: 'Projets',
    pitchDecks: 'Pitch Deck',
    fundingReadiness: 'Préparation au financement',
    strategicDocuments: 'Documents stratégiques',
    useOfFunds: 'Utilisation des fonds',
    investorPackage: 'Dossier investisseur',
    ready: 'Prêt',
    needsData: 'Données requises',
    insufficientData: 'Données insuffisantes',
    availableProjects: 'Projets disponibles',
    savedPitchDecks: 'Pitch Decks enregistrés',
    fundingRecords: 'Dossiers de préparation',
    strategicDocs: 'Documents stratégiques',
    selectedProject: 'Projet sélectionné',
    packageProgress: 'Complétion du dossier investisseur',
    readyItems: 'Éléments prêts',
    noFakeOffers: 'Aucun investisseur, opportunité de financement ou offre fictive n’est affiché. Cette page reflète uniquement les éléments créés ou enregistrés.',
    pitchDeckReady: 'Un Pitch Deck est enregistré pour ce projet.',
    pitchDeckMissing: 'Créez un Pitch Deck depuis la page projet ou le Centre d’affaires.',
    fundingReady: 'Les données de préparation au financement sont enregistrées pour ce projet.',
    fundingMissing: 'Complétez la préparation au financement pour clarifier le besoin du projet.',
    docsReady: 'Des documents stratégiques ou documents projet sont liés à ce projet.',
    docsMissing: 'Ajoutez les documents stratégiques ou documents projet requis.',
    fundsReady: 'Le plan d’utilisation des fonds est enregistré pour ce projet.',
    fundsMissing: 'Complétez le plan d’utilisation des fonds dans le Centre d’affaires.',
    sourceNote: 'Source : projets, Pitch Decks, préparation au financement et documents enregistrés.',
    partialLoadError: 'Certaines sources de données n’ont pas pu être chargées. Les données disponibles sont affichées.',
  },
} as const;

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

function formatDate(value: unknown, lang: Lang) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return '';
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPercent(value: number | null, fallback: string) {
  if (value === null) return fallback;
  return `${Math.round(value)}%`;
}

async function loadRows(table: string, userId: string, options: { projectScoped?: boolean; select?: string } = {}) {
  try {
    const query = (supabase as any)
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

function StatusCard({ item, readyLabel, needsDataLabel }: { item: StatusCardItem; readyLabel: string; needsDataLabel: string }) {
  return (
    <AppCard className="investment-status-card">
      <div className="status-card-head">
        <span className="status-icon" aria-hidden="true">{item.icon}</span>
        <span className={item.ready ? 'status-badge ready' : 'status-badge missing'}>
          {item.ready ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertTriangle size={14} aria-hidden="true" />}
          {item.ready ? readyLabel : needsDataLabel}
        </span>
      </div>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      <small>{item.detail}</small>
      <Link href={item.href} aria-label={item.actionLabel}>{item.actionLabel}</Link>
    </AppCard>
  );
}

export default function InvestmentOffersPage() {
  const { user, loading: authLoading, isGuest } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const text = TEXT[locale];
  const [data, setData] = useState<LoadState>(EMPTY_DATA);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

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
      projectDocuments: projectDocsResult.rows,
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

  const statusCards: StatusCardItem[] = [
    {
      key: 'pitch',
      title: text.pitchDecks,
      description: selectedPitchDeck ? text.pitchDeckReady : text.pitchDeckMissing,
      ready: Boolean(selectedPitchDeck),
      detail: selectedPitchDeck ? formatPercent(pitchScore, text.ready) : text.insufficientData,
      href: projectPitchHref,
      actionLabel: text.openProjectPitchDeck,
      icon: <Presentation size={22} />,
    },
    {
      key: 'funding',
      title: text.fundingReadiness,
      description: hasFundingReadiness ? text.fundingReady : text.fundingMissing,
      ready: hasFundingReadiness,
      detail: formatPercent(fundingScore, text.insufficientData),
      href: businessHubFundingHref,
      actionLabel: text.openFundingReadiness,
      icon: <Gauge size={22} />,
    },
    {
      key: 'documents',
      title: text.strategicDocuments,
      description: hasStrategicDocuments ? text.docsReady : text.docsMissing,
      ready: hasStrategicDocuments,
      detail: hasStrategicDocuments ? `${selectedStrategicDocuments.length + selectedProjectDocuments.length}` : text.insufficientData,
      href: businessHubDocumentsHref,
      actionLabel: text.openBusinessHub,
      icon: <FileText size={22} />,
    },
    {
      key: 'funds',
      title: text.useOfFunds,
      description: hasUseOfFunds ? text.fundsReady : text.fundsMissing,
      ready: hasUseOfFunds,
      detail: hasUseOfFunds ? text.ready : text.insufficientData,
      href: businessHubFundingHref,
      actionLabel: text.openFundingReadiness,
      icon: <Landmark size={22} />,
    },
  ];

  const heroActions = (
    <>
      <Link className="investment-primary-action" href="/projects">{text.openProjects}</Link>
      <Link className="investment-secondary-action" href={businessHubDocumentsHref}>{text.openBusinessHub}</Link>
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
            actions={<Link className="investment-primary-action" href="/login">{text.signIn}</Link>}
          />
        ) : (
          <>
            {loadError && (
              <div className="investment-warning" role="status">
                <AlertTriangle size={17} aria-hidden="true" />
                <span>{loadError}</span>
              </div>
            )}

            <StatGrid>
              <StatCard label={text.availableProjects} value={data.projects.length} icon={<FolderKanban size={18} />} />
              <StatCard label={text.savedPitchDecks} value={data.pitchDecks.length} icon={<Presentation size={18} />} />
              <StatCard label={text.fundingRecords} value={data.fundingReadiness.length} icon={<Gauge size={18} />} />
              <StatCard label={text.strategicDocs} value={data.strategicDocuments.length + data.projectDocuments.filter(looksStrategicDocument).length} icon={<FileText size={18} />} />
            </StatGrid>

            {data.projects.length === 0 ? (
              <EmptyState
                icon={<BriefcaseBusiness size={34} />}
                title={text.noProjectsTitle}
                description={text.noProjectsBody}
                actions={<Link className="investment-primary-action" href="/projects">{text.openProjects}</Link>}
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

                <AppCard className="investment-package-card" tone="dark">
                  <div className="package-copy">
                    <span>{text.selectedProject}</span>
                    <h2>{selectedProjectName}</h2>
                    <p>{text.sourceNote}</p>
                    {selectedProjectUpdated && <small>{selectedProjectUpdated}</small>}
                  </div>
                  <div className="package-meter" aria-label={`${text.packageProgress}: ${packagePercent ?? 0}%`}>
                    <strong>{packagePercent ?? 0}%</strong>
                    <span>{text.packageProgress}</span>
                    <em>{readyCount}/4 {text.readyItems}</em>
                  </div>
                  <div className="package-actions">
                    <Link href={projectHref}>{text.openProjects}</Link>
                    <Link href={projectPitchHref}>{text.openProjectPitchDeck}</Link>
                  </div>
                </AppCard>

                <CardsGrid className="investment-status-grid">
                  {statusCards.map(item => (
                    <StatusCard key={item.key} item={item} readyLabel={text.ready} needsDataLabel={text.needsData} />
                  ))}
                </CardsGrid>

                <section className="investment-note">
                  <Target size={18} aria-hidden="true" />
                  <p>{text.noFakeOffers}</p>
                </section>
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
        .investment-primary-action,
        .investment-secondary-action,
        .investment-status-card a,
        .package-actions a {
          min-height: 42px;
          border-radius: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 950;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease, color .18s ease;
        }
        .investment-primary-action,
        .investment-status-card a,
        .package-actions a:first-child {
          border: 0;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          box-shadow: 0 12px 30px rgba(29, 140, 255, .22);
        }
        .investment-secondary-action,
        .package-actions a {
          border: 1px solid rgba(29, 140, 255, .20);
          background: #FFFFFF;
          color: var(--sfm-midnight);
        }
        .investment-primary-action:hover,
        .investment-secondary-action:hover,
        .investment-status-card a:hover,
        .package-actions a:hover,
        .investment-primary-action:focus-visible,
        .investment-secondary-action:focus-visible,
        .investment-status-card a:focus-visible,
        .package-actions a:focus-visible {
          outline: none;
          transform: translateY(-1px);
          border-color: rgba(24, 212, 212, .42);
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .14), 0 16px 36px rgba(29, 140, 255, .20);
        }
        .investment-primary-action:active,
        .investment-secondary-action:active,
        .investment-status-card a:active,
        .package-actions a:active {
          transform: translateY(0) scale(.98);
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
        .investment-package-card small {
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
        .investment-package-card {
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
        .investment-status-grid {
          grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
        }
        .investment-status-card {
          display: grid;
          gap: 12px;
          align-content: start;
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
        .investment-status-card h2 {
          margin: 0;
          color: var(--sfm-midnight);
          font-size: 20px;
          font-weight: 950;
          line-height: 1.25;
        }
        .investment-status-card p {
          margin: 0;
          color: var(--sfm-muted-readable, #475569);
          line-height: 1.7;
          font-weight: 850;
        }
        .investment-status-card small {
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
        .investment-status-card a {
          width: fit-content;
          max-width: 100%;
        }
        @keyframes investment-spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1120px) {
          .investment-package-card {
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
          .investment-package-card {
            grid-template-columns: 1fr;
          }
          .package-meter {
            width: min(150px, 58vw);
            justify-self: center;
          }
          .package-actions {
            grid-template-columns: 1fr;
          }
          .investment-primary-action,
          .investment-secondary-action,
          .investment-status-card a,
          .package-actions a {
            width: 100%;
          }
          .investment-loading,
          .investment-warning,
          .investment-note {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
