'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookmarkPlus,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Gauge,
  Globe2,
  Landmark,
  LineChart,
  Loader2,
  LockKeyhole,
  Presentation,
  Scale,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { CurrencySelect } from '@/components/CurrencySelect';
import { PageTabPanel, PageTabs } from '@/components/layout/PageTabs';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';


// --- Extracted to _lib.ts ---
import {
  type Lang, type BusinessHubTab, type ReadinessStatus, type InvestorItemStatus,
  type UseOfFundsKey, type UseOfFundsEntry, type ProjectRow, type ModuleRows,
  type UseOfFundsState, type FundingReadinessRow, type FundingPlannerForm,
  type InvestorPackageItem, type StrategicDocumentStatus, type StrategicDocumentKey,
  type StrategicMissingAction, type StrategicDocumentItem, type DraftSection,
  type DocumentDraft, type JurisdictionWizardState, type JurisdictionAssessmentRow,
  type JurisdictionResult, type FundingProgramRow, type FundingProgramImportForm,
  type FundingShortlistRow, type FundingDirectoryFilters,
  EMPTY_MODULES, TEXT, STRATEGIC_TEXT, JURISDICTION_TEXT, FUNDING_DIRECTORY_TEXT,
  BUSINESS_TYPES, COUNTRIES, DELIVERY_MODELS, EXPANSION_OPTIONS,
  FUNDING_DATA_STATUSES, FUNDING_GOAL_OPTIONS, FUNDING_PROGRAM_TYPES, FUNDING_TYPES,
  JURISDICTION_STEPS, OFFICIAL_VERIFICATION_KEYS, OPERATIONAL_NEED_OPTIONS,
  SHORTLIST_STATUSES, TARGET_CUSTOMER_OPTIONS, USE_OF_FUNDS_KEYS,
  initialWizard, emptyFundingForm, emptyFundingDirectoryFilters, emptyFundingProgramImportForm,
  firstText, fundingRowToForm, normalizeBusinessHubTab, normalizeWizard,
  feasibilitySectionCount, moduleExists, calculateUseOfFundsTotals,
  getUseOfFundsStatusFromTotals, buildInvestorPackageItems, buildFundingWarnings,
  completionStatus, buildStrategicDocumentItems, hasFundingPlan,
  buildDueDiligenceItems, groupedDocumentCounts, filterFundingPrograms,
  buildFundingApplicationChecklist, buildJurisdictionResults, buildFundingFit,
  fundingProgramDataStatus, fundingProgramOfficialUrl, fundingProgramDocuments,
  fundingProgramLabel, fundingProgramSource, fundingDataStatusClass,
  fundingDataStatusLabel, fundingProgramTypeLabel, fundingTicketText,
  fundingProgramRequirements, fundingProgramDescription, shortlistStatusLabel,
  investorStatusLabel, statusClass, statusLabel, strategicStatusClass,
  strategicStatusLabel, toNumber, toRecord, percent, selectedLabel, optionLabel,
  buildDocumentDraft,
} from './_lib';
import { BUSINESS_HUB_STYLES } from './_styles';

const BUSINESS_HUB_TAB_IDS = ['readiness', 'funding', 'jurisdiction', 'documents', 'directory', 'copilot'] as const satisfies readonly BusinessHubTab[];
const BUSINESS_HUB_TABS_ID = 'business-hub-workspace';

export default function BusinessHubPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const text = useMemo(() => ({ ...TEXT[locale], ...STRATEGIC_TEXT[locale], ...JURISDICTION_TEXT[locale], ...FUNDING_DIRECTORY_TEXT[locale] }), [locale]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activeTab, setActiveTab] = useUrlTabState<BusinessHubTab>({
    param: 'tab',
    values: BUSINESS_HUB_TAB_IDS,
    defaultValue: 'readiness',
    omitDefault: true,
    legacyValueResolver: normalizeBusinessHubTab,
    legacyHash: true,
  });
  const [modules, setModules] = useState<ModuleRows>(EMPTY_MODULES);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [wizard, setWizard] = useState<JurisdictionWizardState>(initialWizard);
  const [wizardStep, setWizardStep] = useState(0);
  const [jurisdictionAssessment, setJurisdictionAssessment] = useState<JurisdictionAssessmentRow | null>(null);
  const [savingJurisdiction, setSavingJurisdiction] = useState(false);
  const [jurisdictionMessage, setJurisdictionMessage] = useState('');
  const [fundingRecord, setFundingRecord] = useState<FundingReadinessRow | null>(null);
  const [fundingForm, setFundingForm] = useState<FundingPlannerForm>(() => emptyFundingForm());
  const [savingFunding, setSavingFunding] = useState(false);
  const [fundingMessage, setFundingMessage] = useState('');
  const [documentDraft, setDocumentDraft] = useState<DocumentDraft | null>(null);
  const [fundingPrograms, setFundingPrograms] = useState<FundingProgramRow[]>([]);
  const [fundingShortlist, setFundingShortlist] = useState<FundingShortlistRow[]>([]);
  const [fundingDirectoryFilters, setFundingDirectoryFilters] = useState<FundingDirectoryFilters>(emptyFundingDirectoryFilters);
  const [fundingDirectoryMessage, setFundingDirectoryMessage] = useState('');
  const [selectedFundingProgramId, setSelectedFundingProgramId] = useState('');
  const [shortlistSavingId, setShortlistSavingId] = useState('');
  const [fundingProgramsReloadKey, setFundingProgramsReloadKey] = useState(0);
  const [fundingImportForm, setFundingImportForm] = useState<FundingProgramImportForm>(emptyFundingProgramImportForm);
  const [savingFundingProgram, setSavingFundingProgram] = useState(false);
  const [fundingImportMessage, setFundingImportMessage] = useState('');

  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }
    setLoadingProjects(true);
    setLoadError('');
    const db = supabase as any;
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError(text.loadError);
      setProjects([]);
    } else {
      const rows = (data ?? []) as ProjectRow[];
      const requestedProjectId = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('project') || '';
      const requestedProject = rows.some(project => project.id === requestedProjectId) ? requestedProjectId : '';
      setProjects(rows);
      setSelectedProjectId(current => current || requestedProject || rows[0]?.id || '');
    }
    setLoadingProjects(false);
  }, [text.loadError, user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    setDocumentDraft(null);
  }, [selectedProjectId]);

  useEffect(() => {
    let cancelled = false;
    async function loadModules() {
      if (!user || !selectedProjectId) {
        setModules(EMPTY_MODULES);
        return;
      }
      setLoadingModules(true);
      const userId = user.id;
      const db = supabase as any;
      async function rows(table: string) {
        const { data, error } = await db
          .from(table)
          .select('*')
          .eq('user_id', userId)
          .eq('project_id', selectedProjectId)
          .limit(500);
        return error ? [] : (data ?? []);
      }
      const [feasibility, financialModels, tasks, milestones, documents, pitchDecks] = await Promise.all([
        rows('project_feasibility_studies'),
        rows('project_financial_models'),
        rows('project_tasks'),
        rows('project_milestones'),
        rows('project_documents'),
        rows('project_pitch_decks'),
      ]);
      if (!cancelled) {
        setModules({ feasibility, financialModels, tasks, milestones, documents, pitchDecks });
        setLoadingModules(false);
      }
    }
    loadModules();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, user]);

  const selectedProject = useMemo(
    () => projects.find(project => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const selectedCurrency = selectedProject ? firstText(selectedProject, ['currency'], 'KWD') || 'KWD' : 'KWD';

  useEffect(() => {
    let cancelled = false;
    async function loadFundingReadiness() {
      setFundingMessage('');
      if (!user || !selectedProjectId) {
        setFundingRecord(null);
        setFundingForm(emptyFundingForm(selectedCurrency));
        return;
      }
      const db = supabase as any;
      const { data, error } = await db
        .from('project_funding_readiness')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', selectedProjectId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setFundingRecord(null);
        setFundingForm(emptyFundingForm(selectedCurrency));
        return;
      }
      const row = (data ?? null) as FundingReadinessRow | null;
      setFundingRecord(row);
      setFundingForm(fundingRowToForm(row, selectedCurrency));
    }
    loadFundingReadiness();
    return () => {
      cancelled = true;
    };
  }, [selectedCurrency, selectedProjectId, user]);

  useEffect(() => {
    let cancelled = false;
    async function loadFundingPrograms() {
      const db = supabase as any;
      const { data, error } = await db
        .from('funding_programs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) {
        setFundingPrograms([]);
        setFundingDirectoryMessage(text.loadError);
      } else {
        setFundingPrograms((data ?? []) as FundingProgramRow[]);
        setFundingDirectoryMessage('');
      }
    }
    loadFundingPrograms();
    return () => {
      cancelled = true;
    };
  }, [fundingProgramsReloadKey, text.loadError]);

  useEffect(() => {
    let cancelled = false;
    async function loadFundingShortlist() {
      if (!user || !selectedProjectId) {
        setFundingShortlist([]);
        return;
      }
      const db = supabase as any;
      const { data, error } = await db
        .from('project_funding_shortlist')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', selectedProjectId)
        .limit(500);
      if (cancelled) return;
      setFundingShortlist(error ? [] : ((data ?? []) as FundingShortlistRow[]));
    }
    loadFundingShortlist();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, user]);

  useEffect(() => {
    let cancelled = false;
    async function loadJurisdictionAssessment() {
      setJurisdictionMessage('');
      if (!user || !selectedProjectId) {
        setJurisdictionAssessment(null);
        setWizard(initialWizard);
        setWizardStep(0);
        return;
      }
      const db = supabase as any;
      const { data, error } = await db
        .from('project_jurisdiction_assessments')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', selectedProjectId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setJurisdictionAssessment(null);
        setWizard(prev => ({ ...prev, targetMarket: prev.targetMarket || '' }));
        return;
      }
      const row = (data ?? null) as JurisdictionAssessmentRow | null;
      setJurisdictionAssessment(row);
      setWizard(row?.inputs ? normalizeWizard(row.inputs) : initialWizard);
      setWizardStep(0);
    }
    loadJurisdictionAssessment();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, user]);

  const readiness = useMemo(() => {
    if (!selectedProject) return null;
    const feasibilitySections = feasibilitySectionCount(modules.feasibility[0]);
    const feasibility = feasibilitySections > 0;
    const feasibilityComplete = feasibilitySections >= 4;
    const financialModel = moduleExists(modules.financialModels, ['assumptions', 'revenue_streams', 'cost_items', 'forecast', 'kpis']);
    const tasksMilestones = modules.tasks.length > 0 || modules.milestones.length > 0;
    const documents = modules.documents.length > 0;
    const kpis = financialModel || feasibility || tasksMilestones || documents;
    const pitchDeck = moduleExists(modules.pitchDecks, ['deck_data', 'readiness_score']);
    const capitalAmount = findCapitalAmount(selectedProject, modules.feasibility[0], modules.financialModels[0]);
    const useOfFundsTotals = calculateUseOfFundsTotals(fundingForm);
    const useOfFundsStatus = getUseOfFundsStatusFromTotals(useOfFundsTotals);
    const basicFields = [
      firstText(selectedProject, ['name', 'project_name', 'title']),
      firstText(selectedProject, ['category', 'type', 'project_type']),
      capitalAmount,
      firstText(selectedProject, ['timeline', 'start_date', 'end_date', 'current_phase']),
    ].filter(Boolean).length;
    const basicScore = Math.round((basicFields / 4) * 15);
    const score =
      basicScore +
      (feasibility ? 20 : 0) +
      (financialModel ? 20 : 0) +
      (tasksMilestones ? 10 : 0) +
      (documents ? 10 : 0) +
      (kpis ? 10 : 0) +
      (pitchDeck ? 15 : 0);
    const packageItems = buildInvestorPackageItems({
      selectedProject,
      modules,
      text,
      basicFields,
      feasibility,
      feasibilityComplete,
      financialModel,
      pitchDeck,
      kpis,
      tasksMilestones,
      useOfFundsStatus,
    });
    const fundingScore =
      Math.round((basicFields / 4) * 10) +
      (feasibilityComplete ? 20 : feasibility ? 10 : 0) +
      (financialModel ? 20 : 0) +
      (pitchDeck ? 20 : 0) +
      (documents ? 10 : 0) +
      (kpis ? 10 : 0) +
      (tasksMilestones ? 5 : 0) +
      (useOfFundsStatus === 'complete' ? 5 : useOfFundsStatus === 'needs_review' ? 2 : 0);
    const fundingWarnings = buildFundingWarnings({
      text,
      financialModel,
      pitchDeck,
      documents,
      useOfFundsStatus,
      financialModelRow: modules.financialModels[0],
    });
    const fundingItems = packageItems.slice(0, 7).map(item => ({
      key: item.key,
      label: item.label,
      done: item.status === 'complete',
      href: item.href,
    }));
    return {
      score: Math.min(100, score),
      status: completionStatus(score),
      basicScore,
      feasibility,
      feasibilityComplete,
      financialModel,
      tasksMilestones,
      documents,
      kpis,
      pitchDeck,
      capitalAmount,
      fundingItems,
      fundingScore: Math.min(100, fundingScore),
      fundingStatus: completionStatus(fundingScore),
      packageItems,
      useOfFundsTotals,
      useOfFundsStatus,
      fundingWarnings,
    };
  }, [fundingForm, modules, selectedProject, text]);

  const strategicDocuments = useMemo(() => {
    if (!selectedProject || !readiness) {
      return { items: [] as StrategicDocumentItem[], score: null as number | null, dueDiligence: [] as Array<{ label: string; status: InvestorItemStatus }>, groupedDocuments: {} as Record<string, number> };
    }
    const items = buildStrategicDocumentItems({ selectedProject, modules, readiness, fundingRecord, text });
    const score =
      (items.find(item => item.key === 'businessPlan')?.status === 'ready' ? 20 : items.find(item => item.key === 'businessPlan')?.status === 'in_progress' ? 10 : 0) +
      (readiness.pitchDeck ? 15 : 0) +
      (readiness.financialModel ? 15 : 0) +
      (readiness.feasibility ? 15 : 0) +
      (readiness.documents ? 15 : 0) +
      (hasFundingPlan(fundingRecord, readiness.useOfFundsStatus) ? 10 : 0) +
      (readiness.kpis ? 10 : 0);
    return {
      items,
      score: Math.min(100, score),
      dueDiligence: buildDueDiligenceItems(modules, readiness, text),
      groupedDocuments: groupedDocumentCounts(modules.documents),
    };
  }, [fundingRecord, modules, readiness, selectedProject, text]);

  const fundingDirectoryOptions = useMemo(() => {
    const countries = Array.from(new Set(fundingPrograms.map(program => program.country).filter(Boolean).map(String))).sort();
    const currencies = Array.from(new Set(fundingPrograms.map(program => program.currency || 'KWD').filter(Boolean).map(String))).sort();
    return { countries, currencies };
  }, [fundingPrograms]);

  const filteredFundingPrograms = useMemo(
    () => filterFundingPrograms(fundingPrograms, fundingDirectoryFilters, locale),
    [fundingDirectoryFilters, fundingPrograms, locale],
  );

  const fundingApplicationChecklist = useMemo(
    () => buildFundingApplicationChecklist(readiness, modules, fundingRecord, text),
    [fundingRecord, modules, readiness, text],
  );

  const jurisdictionResults = useMemo(
    () => buildJurisdictionResults(wizard, text, locale),
    [locale, text, wizard],
  );

  const projectUrl = selectedProject ? `/projects/${selectedProject.id}` : '/projects';
  const pitchDeckUrl = selectedProject ? `/projects/${selectedProject.id}?tab=pitchDeck` : '/projects';
  const hubTabs = [
    { id: 'readiness', label: text.businessReadiness },
    { id: 'funding', label: text.fundingReadiness },
    { id: 'jurisdiction', label: text.jurisdictionWizard },
    { id: 'documents', label: text.strategicDocuments },
    { id: 'directory', label: text.fundingDirectory },
    { id: 'copilot', label: text.businessCopilot },
  ];

  const wizardMissing = useMemo(() => {
    const items: string[] = [];
    if (!selectedProjectId) items.push(text.selectProjectStep);
    if (!wizard.targetMarket) items.push(text.primaryMarket);
    if (!wizard.businessType) items.push(text.businessType);
    if (!wizard.industry.trim()) items.push(text.industry);
    if (!wizard.productService.trim()) items.push(text.productService);
    if (!wizard.deliveryModel) items.push(text.deliveryModel);
    if (wizard.targetCustomers.length === 0) items.push(text.targetCustomersStep);
    if (!wizard.expansionPlan) items.push(text.expansionPlan);
    return items;
  }, [selectedProjectId, text, wizard]);

  const updateWizard = <K extends keyof JurisdictionWizardState>(field: K, value: JurisdictionWizardState[K]) => {
    setWizard(prev => ({ ...prev, [field]: value }));
  };

  const toggleWizardList = (field: 'targetCustomers' | 'operationalNeeds' | 'fundingGoals', value: string) => {
    setWizard(prev => {
      const selected = prev[field].includes(value);
      return {
        ...prev,
        [field]: selected ? prev[field].filter(item => item !== value) : [...prev[field], value],
      };
    });
  };

  const updateUseOfFunds = (key: UseOfFundsKey, field: keyof UseOfFundsEntry, value: string) => {
    setFundingForm(prev => ({
      ...prev,
      useOfFunds: {
        ...prev.useOfFunds,
        [key]: {
          ...prev.useOfFunds[key],
          [field]: value,
        },
      },
    }));
  };

  const saveFundingReadiness = async () => {
    if (!user || !selectedProject || !readiness) return;
    setSavingFunding(true);
    setFundingMessage('');
    const useOfFundsPayload = USE_OF_FUNDS_KEYS.reduce<Record<string, { amount: number | null; percent: number | null }>>((acc, key) => {
      acc[key] = {
        amount: toNumber(fundingForm.useOfFunds[key].amount),
        percent: toNumber(fundingForm.useOfFunds[key].percent),
      };
      return acc;
    }, {});
    const checklist = readiness.packageItems.reduce<Record<string, InvestorItemStatus>>((acc, item) => {
      acc[item.key] = item.status;
      return acc;
    }, {});
    const payload = {
      user_id: user.id,
      project_id: selectedProject.id,
      funding_needed: toNumber(fundingForm.fundingNeeded) ?? 0,
      currency: fundingForm.currency || selectedCurrency || 'KWD',
      funding_type: fundingForm.fundingType || null,
      use_of_funds: useOfFundsPayload,
      readiness_score: readiness.fundingScore,
      checklist,
      notes: fundingForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const db = supabase as any;
    const { data, error } = await db
      .from('project_funding_readiness')
      .upsert(payload, { onConflict: 'user_id,project_id' })
      .select('*')
      .maybeSingle();
    if (error) {
      setFundingMessage(text.useOfFundsSaveError);
    } else {
      setFundingRecord((data ?? payload) as FundingReadinessRow);
      setFundingMessage(text.useOfFundsSaved);
    }
    setSavingFunding(false);
  };

  const saveJurisdictionAssessment = async () => {
    if (!user || !selectedProject) return;
    setSavingJurisdiction(true);
    setJurisdictionMessage('');
    const payload = {
      user_id: user.id,
      project_id: selectedProject.id,
      inputs: wizard,
      results: {
        source: 'rules',
        generated_at: new Date().toISOString(),
        jurisdictions: jurisdictionResults,
      },
      recommended_jurisdictions: jurisdictionResults.slice(0, 3).map(result => ({
        code: result.code,
        label: result.label,
        score: result.score,
      })),
      status: 'generated',
      updated_at: new Date().toISOString(),
    };
    const db = supabase as any;
    const { data, error } = await db
      .from('project_jurisdiction_assessments')
      .upsert(payload, { onConflict: 'user_id,project_id' })
      .select('*')
      .maybeSingle();
    if (error) {
      setJurisdictionMessage(text.assessmentSaveError);
    } else {
      setJurisdictionAssessment((data ?? payload) as JurisdictionAssessmentRow);
      setJurisdictionMessage(text.assessmentSaved);
    }
    setSavingJurisdiction(false);
  };

  const saveFundingProgramImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingFundingProgram) return;
    setSavingFundingProgram(true);
    setFundingImportMessage('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionData.session?.access_token) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }
      const response = await fetch('/api/funding-programs/admin', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name_ar: fundingImportForm.nameAr,
          name_en: fundingImportForm.nameEn,
          country: fundingImportForm.country,
          funding_type: fundingImportForm.fundingType,
          provider_type: fundingImportForm.providerType,
          currency: fundingImportForm.currency,
          min_amount: fundingImportForm.minAmount,
          max_amount: fundingImportForm.maxAmount,
          source_name: fundingImportForm.sourceName,
          official_url: fundingImportForm.officialUrl,
          business_activity: fundingImportForm.businessActivity,
          eligibility_requirements: fundingImportForm.eligibilityRequirements,
          required_documents: fundingImportForm.requiredDocuments,
          is_verified: fundingImportForm.isVerified,
        }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; code?: string } | null;
      if (!response.ok || !result?.ok) throw new Error(result?.code || 'save_failed');
      setFundingImportForm(emptyFundingProgramImportForm);
      setFundingImportMessage(text.fundingProgramSaved);
      setFundingProgramsReloadKey(value => value + 1);
    } catch {
      setFundingImportMessage(text.fundingProgramSaveError);
    } finally {
      setSavingFundingProgram(false);
    }
  };

  const saveFundingProgramToShortlist = async (program: FundingProgramRow) => {
    if (!user || !selectedProject) {
      setFundingDirectoryMessage(text.noProjectForShortlist);
      return;
    }
    setShortlistSavingId(program.id);
    setFundingDirectoryMessage('');
    const payload = {
      user_id: user.id,
      project_id: selectedProject.id,
      funding_program_id: program.id,
      status: 'saved',
      updated_at: new Date().toISOString(),
    };
    const db = supabase as any;
    const { data, error } = await db
      .from('project_funding_shortlist')
      .upsert(payload, { onConflict: 'user_id,project_id,funding_program_id' })
      .select('*')
      .maybeSingle();
    if (error) {
      setFundingDirectoryMessage(text.shortlistSaveError);
    } else {
      const row = (data ?? payload) as FundingShortlistRow;
      setFundingShortlist(prev => [...prev.filter(item => item.funding_program_id !== program.id), row]);
      setFundingDirectoryMessage(text.savedToShortlist);
    }
    setShortlistSavingId('');
  };

  const updateShortlistStatus = async (row: FundingShortlistRow, status: string) => {
    setShortlistSavingId(row.funding_program_id || row.id);
    const db = supabase as any;
    const { data, error } = await db
      .from('project_funding_shortlist')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', row.id)
      .eq('user_id', user?.id || '')
      .select('*')
      .maybeSingle();
    if (error) {
      setFundingDirectoryMessage(text.shortlistSaveError);
    } else {
      setFundingShortlist(prev => prev.map(item => item.id === row.id ? ((data ?? { ...row, status }) as FundingShortlistRow) : item));
      setFundingDirectoryMessage(text.savedToShortlist);
    }
    setShortlistSavingId('');
  };

  const removeShortlistItem = async (row: FundingShortlistRow) => {
    setShortlistSavingId(row.funding_program_id || row.id);
    const db = supabase as any;
    const { error } = await db
      .from('project_funding_shortlist')
      .delete()
      .eq('id', row.id)
      .eq('user_id', user?.id || '');
    if (error) {
      setFundingDirectoryMessage(text.shortlistSaveError);
    } else {
      setFundingShortlist(prev => prev.filter(item => item.id !== row.id));
      setFundingDirectoryMessage(text.shortlistRemoved);
    }
    setShortlistSavingId('');
  };

  const generateDocumentDraft = (type: DocumentDraft['type']) => {
    if (!selectedProject || !readiness) return;
    setDocumentDraft(buildDocumentDraft({
      kind: type,
      selectedProject,
      modules,
      readiness,
      fundingForm,
      selectedCurrency,
      locale,
      text,
    }));
    window.setTimeout(() => document.getElementById('strategic-document-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const printDocumentDraft = () => {
    if (!documentDraft) return;
    window.print();
  };

  if (authLoading || loadingProjects) {
    return (
      <div className="business-hub-shell" dir={dir}>
        <WorkspacePageContainer as="main" variant="wide" className="business-hub-main loading-state">
          <Loader2 className="spin" size={28} />
          <strong>{text.loading}</strong>
        </WorkspacePageContainer>
        <style>{BUSINESS_HUB_STYLES}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="business-hub-shell" dir={dir}>
        <WorkspacePageContainer as="main" variant="wide" className="business-hub-main">
          <section className="state-panel">
            <LockKeyhole size={30} />
            <h1>{text.title}</h1>
            <p>{text.signIn}</p>
          </section>
        </WorkspacePageContainer>
        <style>{BUSINESS_HUB_STYLES}</style>
      </div>
    );
  }

  return (
    <div className="business-hub-shell" dir={dir}>
      <WorkspacePageContainer as="main" variant="wide" className="business-hub-main">
        <div className="topbar">
          <div>
            <span>THE SFM</span>
            <strong>{text.title}</strong>
          </div>
        </div>

        <section className="business-hero">
          <div>
            <span className="eyebrow"><BriefcaseBusiness size={16} /> {text.badge}</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="hero-actions">
            <button type="button" onClick={() => document.getElementById('business-readiness')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} aria-label={text.startReadiness}>
              <Gauge size={16} /> {text.startReadiness}
            </button>
            <Link href="/projects" aria-label={text.openProjects}><FolderKanban size={16} /> {text.openProjects}</Link>
            <Link href={pitchDeckUrl} aria-label={text.createPitchDeck}><Presentation size={16} /> {text.createPitchDeck}</Link>
          </div>
        </section>

        {loadError && <div className="load-warning"><AlertTriangle size={16} /> {loadError}</div>}

        <section className="selector-panel" id="business-readiness">
          <div>
            <h2>{text.selectProject}</h2>
            <p>{text.selectProjectHint}</p>
          </div>
          <ProjectSelector
            projects={projects}
            selectedProjectId={selectedProjectId}
            onChange={setSelectedProjectId}
            readinessScore={readiness?.score ?? null}
            label={text.selectedProject}
            hint={text.selectProjectHint}
          />
        </section>

        <PageTabs
          tabs={hubTabs}
          active={activeTab}
          onChange={id => setActiveTab(id as BusinessHubTab)}
          ariaLabel={text.title}
          idBase={BUSINESS_HUB_TABS_ID}
          sticky
          mobileMode="auto"
        />

        <PageTabPanel idBase={BUSINESS_HUB_TABS_ID} value={activeTab} active>
        {projects.length === 0 ? (
          <section className="empty-state">
            <Building2 size={34} />
            <h2>{text.addProjectFirst}</h2>
            <p>{text.realDataOnly}</p>
            <Link href="/projects" aria-label={text.addProject}>{text.addProject}</Link>
          </section>
        ) : (
          <>
            {activeTab === 'readiness' && (
              <>
            <section className="readiness-head">
              <div>
                <h2>{text.businessReadiness}</h2>
                <p>{text.scoreFormula}</p>
              </div>
              <div className={`score-pill ${readiness ? statusClass(readiness.status) : ''}`}>
                {loadingModules ? <Loader2 className="spin" size={16} /> : null}
                <strong>{readiness ? percent(readiness.score, locale) : text.noScore}</strong>
                {readiness && <span>{statusLabel(readiness.status, text)}</span>}
              </div>
            </section>

            <section className="readiness-grid">
              <ReadinessCard title={text.projectReadiness} icon={<ClipboardCheck size={18} />} score={readiness?.basicScore ?? 0} max={15} ready={Boolean(readiness && readiness.basicScore >= 12)} lang={locale} text={text} />
              <ReadinessCard title={text.fundingReadiness} icon={<Landmark size={18} />} score={readiness?.fundingScore ?? 0} max={100} ready={Boolean(readiness && readiness.fundingScore >= 70)} lang={locale} text={text} percentMode />
              <ReadinessCard title={text.documentReadiness} icon={<FileText size={18} />} score={modules.documents.length} max={1} ready={Boolean(readiness?.documents)} lang={locale} text={text} suffix={modules.documents.length > 0 ? text.available : text.missing} />
              <ReadinessCard title={text.financialModelReadiness} icon={<BarChart3 size={18} />} score={readiness?.financialModel ? 1 : 0} max={1} ready={Boolean(readiness?.financialModel)} lang={locale} text={text} suffix={readiness?.financialModel ? text.available : text.missing} />
              <ReadinessCard title={text.pitchDeckReadiness} icon={<Presentation size={18} />} score={readiness?.pitchDeck ? 1 : 0} max={1} ready={Boolean(readiness?.pitchDeck)} lang={locale} text={text} suffix={readiness?.pitchDeck ? text.available : text.missing} />
            </section>
              </>
            )}

            {activeTab === 'funding' && (
            <section className="funding-module" id="funding-readiness-module">
              {selectedProject && readiness ? (
                <>
                  <div className="funding-header">
                    <div>
                      <span className="eyebrow"><Landmark size={16} /> {text.fundingReadiness}</span>
                      <h2>{text.fundingReadiness}</h2>
                      <p>{text.fundingScoreDisclaimer}</p>
                    </div>
                    <div className={`score-pill ${statusClass(readiness.fundingStatus)}`} role="progressbar" aria-label={text.fundingReadiness} aria-valuenow={readiness.fundingScore} aria-valuemin={0} aria-valuemax={100}>
                      <strong>{percent(readiness.fundingScore, locale)}</strong>
                      <span>{statusLabel(readiness.fundingStatus, text)}</span>
                    </div>
                  </div>

                  <div className="funding-layout">
                    <article className="warm-card use-funds-card">
                      <div className="card-title">
                        <div>
                          <h2>{text.useOfFundsPlan}</h2>
                          <p>{text.completeThese}</p>
                        </div>
                        <Landmark size={22} />
                      </div>
                      <div className="planner-grid">
                        <label className="field">
                          <span>{text.fundingNeeded}</span>
                          <input value={fundingForm.fundingNeeded} onChange={event => setFundingForm(prev => ({ ...prev, fundingNeeded: event.target.value }))} inputMode="decimal" placeholder="0" aria-label={text.fundingNeeded} />
                        </label>
                        <div className="field">
                          <CurrencySelect
                            value={fundingForm.currency || selectedCurrency || 'KWD'}
                            onChange={code => setFundingForm(prev => ({ ...prev, currency: code }))}
                            lang={locale}
                            label={text.currency}
                            ariaLabel={text.currency}
                          />
                        </div>
                        <SelectField label={text.targetFundingType} value={fundingForm.fundingType} onChange={value => setFundingForm(prev => ({ ...prev, fundingType: value }))} options={FUNDING_TYPES.map(item => ({ value: item.value, label: text[item.labelKey] }))} placeholder={text.choose} />
                      </div>
                      <div className="funds-table">
                        {USE_OF_FUNDS_KEYS.map(key => (
                          <div className="fund-row" key={key}>
                            <strong>{text[key]}</strong>
                            <label>
                              <span>{text.amount}</span>
                              <input value={fundingForm.useOfFunds[key].amount} onChange={event => updateUseOfFunds(key, 'amount', event.target.value)} inputMode="decimal" placeholder="0" aria-label={`${text[key]} ${text.amount}`} />
                            </label>
                            <label>
                              <span>{text.percentage}</span>
                              <input value={fundingForm.useOfFunds[key].percent} onChange={event => updateUseOfFunds(key, 'percent', event.target.value)} inputMode="decimal" placeholder="0" aria-label={`${text[key]} ${text.percentage}`} />
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="planner-totals">
                        <p><span>{text.percentageTotal}</span><strong>{percent(readiness.useOfFundsTotals.percentTotal, locale)}</strong></p>
                        <p><span>{text.amountPlanned}</span><strong>{formatMoney(readiness.useOfFundsTotals.amountTotal, fundingForm.currency || selectedCurrency, locale)}</strong></p>
                      </div>
                      {readiness.useOfFundsTotals.hasAny && !readiness.useOfFundsTotals.percentMatches && <div className="planner-warning"><AlertTriangle size={15} /> {text.allocationWarning}</div>}
                      {readiness.useOfFundsTotals.hasAny && !readiness.useOfFundsTotals.amountMatches && <div className="planner-warning"><AlertTriangle size={15} /> {text.amountTotalWarning}</div>}
                      <label className="field wide">
                        <span>{text.notes}</span>
                        <textarea value={fundingForm.notes} onChange={event => setFundingForm(prev => ({ ...prev, notes: event.target.value }))} rows={3} aria-label={text.notes} />
                      </label>
                      <div className="save-row">
                        <span className={`status-badge ${fundingRecord?.id ? 'ready-for-review' : 'not-ready'}`}>{fundingRecord?.id ? text.available : text.missing}</span>
                        <button type="button" onClick={saveFundingReadiness} disabled={savingFunding} aria-label={text.saveUseOfFunds}>
                          {savingFunding ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />} {savingFunding ? text.saving : text.saveUseOfFunds}
                        </button>
                      </div>
                      {fundingMessage && <p className="form-message">{fundingMessage}</p>}
                    </article>

                    <div className="funding-support-column">
                      <article className="warm-card investor-package">
                        <div className="card-title">
                          <div>
                            <h2>{text.investorPackage}</h2>
                            <p>{text.investorPackageIntro}</p>
                          </div>
                          <FileText size={22} />
                        </div>
                        <div className="package-grid">
                          {readiness.packageItems.map(item => (
                            <Link href={item.href} className="package-item" key={item.key} aria-label={item.label}>
                              <span className={`package-status ${item.status}`}>{item.status === 'complete' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}</span>
                              <strong>{item.label}</strong>
                              <small>{investorStatusLabel(item.status, text)}</small>
                            </Link>
                          ))}
                        </div>
                      </article>

                      <aside className="warm-card funding-side">
                        <div className="card-title">
                          <div>
                            <h2>{text.fundingWarnings}</h2>
                            <p>{text.realDataOnly}</p>
                          </div>
                          <AlertTriangle size={22} />
                        </div>
                        {readiness.fundingWarnings.length > 0 ? (
                          <ul className="warning-list">
                            {readiness.fundingWarnings.map(warning => <li key={warning}>{warning}</li>)}
                          </ul>
                        ) : (
                          <p className="trusted-note">{text.readyForReview}</p>
                        )}
                        {readiness.packageItems.some(item => item.status !== 'complete') && (
                          <div className="missing-box">
                            <strong>{text.improveFundingReadiness}</strong>
                            <ul>
                              {readiness.packageItems.filter(item => item.status !== 'complete').map(item => (
                                <li key={item.key}><Link href={item.href}>{item.label}</Link></li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="package-actions">
                          {readiness.pitchDeck && <Link href={`${projectUrl}?tab=pitchDeck`} aria-label={text.pitchDeck}>{text.pitchDeck}</Link>}
                          {readiness.financialModel && <Link href={`${projectUrl}?tab=financial`} aria-label={text.financialModel}>{text.financialModel}</Link>}
                          {readiness.documents && <Link href={`${projectUrl}?tab=documents`} aria-label={text.documents}>{text.documents}</Link>}
                          <button type="button" disabled aria-disabled="true" aria-label={text.prepareInvestorPackage}>{text.prepareInvestorPackage} - {text.exportComingSoon}</button>
                        </div>
                      </aside>
                    </div>
                  </div>
                </>
              ) : (
                <div className="funding-empty">
                  <Landmark size={28} />
                  <strong>{text.noProjectSelectedFunding}</strong>
                </div>
              )}
            </section>
            )}

            {activeTab === 'directory' && (
            <section className="funding-directory-module" id="funding-directory-module">
              <div className="directory-header">
                <div>
                  <span className="eyebrow"><BookmarkPlus size={16} /> {text.fundingDirectory}</span>
                  <h2>{text.fundingDirectory}</h2>
                  <p>{text.fundingDirectoryDescription}</p>
                </div>
                <span className="status-badge needs-improvement">{text.officialVerificationRequired}</span>
              </div>

              <div className="directory-filters" role="search">
                <label className="field">
                  <span>{text.searchFundingPrograms}</span>
                  <div className="search-field">
                    <Search size={16} />
                    <input value={fundingDirectoryFilters.search} onChange={event => setFundingDirectoryFilters(prev => ({ ...prev, search: event.target.value }))} aria-label={text.searchFundingPrograms} />
                  </div>
                </label>
                <label className="field">
                  <span>{text.fundingType}</span>
                  <select value={fundingDirectoryFilters.fundingType} onChange={event => setFundingDirectoryFilters(prev => ({ ...prev, fundingType: event.target.value }))} aria-label={text.fundingType}>
                    <option value="">{text.allTypes}</option>
                    {FUNDING_PROGRAM_TYPES.map(item => <option key={item.value} value={item.value}>{text[item.labelKey]}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>{text.country}</span>
                  <select value={fundingDirectoryFilters.country} onChange={event => setFundingDirectoryFilters(prev => ({ ...prev, country: event.target.value }))} aria-label={text.country}>
                    <option value="">{text.allCountries}</option>
                    {fundingDirectoryOptions.countries.map(country => <option key={country} value={country}>{country}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>{text.verificationStatus}</span>
                  <select value={fundingDirectoryFilters.dataStatus} onChange={event => setFundingDirectoryFilters(prev => ({ ...prev, dataStatus: event.target.value }))} aria-label={text.verificationStatus}>
                    <option value="">{text.allStatuses}</option>
                    {FUNDING_DATA_STATUSES.map(item => <option key={item.value} value={item.value}>{text[item.labelKey]}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>{text.currency}</span>
                  <select value={fundingDirectoryFilters.currency} onChange={event => setFundingDirectoryFilters(prev => ({ ...prev, currency: event.target.value }))} aria-label={text.currency}>
                    <option value="">{text.allCurrencies}</option>
                    {fundingDirectoryOptions.currencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}
                  </select>
                </label>
              </div>

              <div className="directory-layout">
                <article className="warm-card directory-main">
                  <div className="card-title">
                    <div>
                      <h2>{text.fundingDirectory}</h2>
                      <p>{text.realDataOnly}</p>
                    </div>
                    <Landmark size={22} />
                  </div>
                  {fundingDirectoryMessage && <p className="form-message">{fundingDirectoryMessage}</p>}
                  {filteredFundingPrograms.length === 0 ? (
                    <div className="directory-empty">
                      <BookmarkPlus size={28} />
                      <strong>{text.noFundingPrograms}</strong>
                      <p>{text.noFundingProgramsDescription}</p>
                      <div className="directory-empty-actions">
                        <a href="#funding-program-import" aria-label={text.addFundingProgram}><BookmarkPlus size={15} /> {text.addFundingProgram}</a>
                        <a href="https://www.google.com/search?q=official%20SME%20funding%20programs" target="_blank" rel="noreferrer" aria-label={text.searchOfficialSources}><Search size={15} /> {text.searchOfficialSources}</a>
                      </div>
                      <div className="directory-category-chips" aria-label={text.fundingCategories}>
                        {FUNDING_PROGRAM_TYPES.slice(0, 7).map(item => (
                          <span key={item.value}>{text[item.labelKey]}</span>
                        ))}
                      </div>
                      <div className="directory-missing-list">
                        <b>{text.missingProjectRequirements}</b>
                        {fundingApplicationChecklist.filter(item => item.status !== 'complete').length > 0 ? (
                          <ul>
                            {fundingApplicationChecklist.filter(item => item.status !== 'complete').map(item => (
                              <li key={item.label}>{item.label}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>{selectedProject ? text.readyForReview : text.noProjectSelectedFunding}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="program-grid">
                      {filteredFundingPrograms.map(program => {
                        const shortlist = fundingShortlist.find(item => item.funding_program_id === program.id) ?? null;
                        const fit = buildFundingFit(program, selectedProject, readiness, fundingRecord, fundingApplicationChecklist, text);
                        const expanded = selectedFundingProgramId === program.id;
                        const savingThisProgram = shortlistSavingId === program.id;
                        const programStatus = fundingProgramDataStatus(program);
                        const officialUrl = fundingProgramOfficialUrl(program);
                        const requiredDocuments = fundingProgramDocuments(program);
                        return (
                          <article className="program-card" key={program.id}>
                            <div className="program-card-head">
                              <div>
                                <h3>{fundingProgramLabel(program, locale)}</h3>
                                <p>{fundingProgramSource(program, text)}</p>
                              </div>
                              <span className={`status-badge ${fundingDataStatusClass(programStatus)}`}>{fundingDataStatusLabel(programStatus, text)}</span>
                            </div>
                            <div className="program-meta">
                              <p><span>{text.fundingType}</span><strong>{fundingProgramTypeLabel(program.funding_type, text)}</strong></p>
                              <p><span>{text.country}</span><strong>{program.country || text.officialVerificationRequired}</strong></p>
                              <p><span>{text.currency}</span><strong>{program.currency || 'KWD'}</strong></p>
                              <p><span>{text.ticketRange}</span><strong>{fundingTicketText(program, text, locale)}</strong></p>
                            </div>
                            {programStatus !== 'verified' && <p className="directory-warning"><AlertTriangle size={14} /> {text.unverifiedWarning}</p>}
                            {selectedProject && (
                              <div className="funding-fit-box">
                                <b>{text.fundingFitForProject}</b>
                                {fit.score !== null && <span>{percent(fit.score, locale)}</span>}
                                <p>{fit.confirmed ? text.verified : (fit.notes[0] || text.fitCannotBeConfirmed)}</p>
                              </div>
                            )}
                            {selectedProject && !fit.projectReady && fit.missing.length > 0 && (
                              <div className="project-not-ready-box">
                                <strong>{text.projectNotReadyToApply}</strong>
                                <ul>
                                  {fit.missing.map(item => <li key={item}>{item}</li>)}
                                </ul>
                              </div>
                            )}
                            <div className="program-actions">
                              <button type="button" onClick={() => setSelectedFundingProgramId(expanded ? '' : program.id)} aria-label={text.viewDetails}>{text.viewDetails}</button>
                              {officialUrl ? (
                                <a href={officialUrl} target="_blank" rel="noreferrer" aria-label={text.applicationLink}>{text.applicationLink} <ArrowRight size={14} /></a>
                              ) : (
                                <button type="button" disabled aria-disabled="true" aria-label={text.applicationLink}>{text.applicationLink}</button>
                              )}
                              {shortlist ? (
                                <>
                                  <label className="compact-select">
                                    <span>{text.updateStatus}</span>
                                    <select value={shortlist.status || 'saved'} onChange={event => updateShortlistStatus(shortlist, event.target.value)} disabled={shortlistSavingId === program.id} aria-label={text.updateStatus}>
                                      {SHORTLIST_STATUSES.map(status => <option key={status.value} value={status.value}>{text[status.labelKey]}</option>)}
                                    </select>
                                  </label>
                                  <button type="button" onClick={() => removeShortlistItem(shortlist)} disabled={shortlistSavingId === program.id} aria-label={text.remove}><Trash2 size={14} /> {text.remove}</button>
                                </>
                              ) : (
                                <button type="button" onClick={() => saveFundingProgramToShortlist(program)} disabled={savingThisProgram || !selectedProject} aria-label={text.saveToShortlist}>
                                  {savingThisProgram ? <Loader2 className="spin" size={14} /> : <BookmarkPlus size={14} />} {text.saveToShortlist}
                                </button>
                              )}
                            </div>
                            {expanded && (
                              <div className="program-detail">
                                <p><b>{text.eligibilitySummary}</b><span>{fundingProgramRequirements(program, locale) || text.officialVerificationRequired}</span></p>
                                <p><b>{text.description}</b><span>{fundingProgramDescription(program, locale) || text.officialVerificationRequired}</span></p>
                                {requiredDocuments.length > 0 && <p><b>{text.requiredDocumentsInput}</b><span>{requiredDocuments.join(' · ')}</span></p>}
                                <p><b>{text.dataSource}</b><span>{officialUrl ? <a href={officialUrl} target="_blank" rel="noreferrer">{officialUrl}</a> : text.officialVerificationRequired}</span></p>
                                {shortlist && <p><b>{text.selectedShortlistStatus}</b><span>{shortlistStatusLabel(shortlist.status, text)}</span></p>}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </article>

                <aside className="warm-card directory-side">
                  <div className="card-title">
                    <div>
                      <h2>{text.applicationChecklist}</h2>
                      <p>{selectedProject ? firstText(selectedProject, ['name', 'project_name', 'title'], text.selectedProject) : text.noProjectSelectedFunding}</p>
                    </div>
                    <ClipboardCheck size={22} />
                  </div>
                  <div className="check-list">
                    {fundingApplicationChecklist.map(item => (
                      <div className="check-row" key={item.label}>
                        <span className={item.status === 'complete' ? 'done' : 'todo'}>{item.status === 'complete' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}</span>
                        <strong>{item.label}</strong>
                        <small>{investorStatusLabel(item.status, text)}</small>
                      </div>
                    ))}
                  </div>
                  <p className="trusted-note">{text.fitCannotBeConfirmed}</p>
                  <div className="funding-admin-import" id="funding-program-import">
                    <h3>{text.adminImportTitle}</h3>
                    <p>{text.adminImportDescription}</p>
                    <form className="funding-admin-form" onSubmit={saveFundingProgramImport}>
                      <label className="field">
                        <span>{text.addFundingProgram}</span>
                        <input value={fundingImportForm.nameAr} onChange={event => setFundingImportForm(prev => ({ ...prev, nameAr: event.target.value }))} placeholder={text.addFundingProgram} required />
                      </label>
                      <label className="field">
                        <span>{text.fundingProgramEnglishName}</span>
                        <input value={fundingImportForm.nameEn} onChange={event => setFundingImportForm(prev => ({ ...prev, nameEn: event.target.value }))} placeholder={text.fundingProgramEnglishName} />
                      </label>
                      <label className="field">
                        <span>{text.fundingType}</span>
                        <select value={fundingImportForm.fundingType} onChange={event => setFundingImportForm(prev => ({ ...prev, fundingType: event.target.value }))}>
                          {FUNDING_PROGRAM_TYPES.slice(0, 7).map(item => <option key={item.value} value={item.value}>{text[item.labelKey]}</option>)}
                        </select>
                      </label>
                      <label className="field">
                        <span>{text.country}</span>
                        <input value={fundingImportForm.country} onChange={event => setFundingImportForm(prev => ({ ...prev, country: event.target.value }))} placeholder={text.country} />
                      </label>
                      <label className="field">
                        <span>{text.providerType}</span>
                        <input value={fundingImportForm.providerType} onChange={event => setFundingImportForm(prev => ({ ...prev, providerType: event.target.value }))} placeholder={text.providerType} />
                      </label>
                      <label className="field">
                        <span>{text.sourceName}</span>
                        <input value={fundingImportForm.sourceName} onChange={event => setFundingImportForm(prev => ({ ...prev, sourceName: event.target.value }))} placeholder={text.sourceName} />
                      </label>
                      <label className="field">
                        <span>{text.currency}</span>
                        <input value={fundingImportForm.currency} onChange={event => setFundingImportForm(prev => ({ ...prev, currency: event.target.value.toUpperCase() }))} placeholder="KWD" maxLength={8} />
                      </label>
                      <label className="field">
                        <span>{text.minAmount}</span>
                        <input type="number" min="0" value={fundingImportForm.minAmount} onChange={event => setFundingImportForm(prev => ({ ...prev, minAmount: event.target.value }))} placeholder="0" />
                      </label>
                      <label className="field">
                        <span>{text.maxAmount}</span>
                        <input type="number" min="0" value={fundingImportForm.maxAmount} onChange={event => setFundingImportForm(prev => ({ ...prev, maxAmount: event.target.value }))} placeholder="0" />
                      </label>
                      <label className="field">
                        <span>{text.businessActivity}</span>
                        <input value={fundingImportForm.businessActivity} onChange={event => setFundingImportForm(prev => ({ ...prev, businessActivity: event.target.value }))} placeholder={text.businessActivity} />
                      </label>
                      <label className="field wide">
                        <span>{text.officialUrl}</span>
                        <input type="url" value={fundingImportForm.officialUrl} onChange={event => setFundingImportForm(prev => ({ ...prev, officialUrl: event.target.value }))} placeholder="https://..." required />
                      </label>
                      <label className="field wide">
                        <span>{text.eligibilityRequirementsInput}</span>
                        <textarea value={fundingImportForm.eligibilityRequirements} onChange={event => setFundingImportForm(prev => ({ ...prev, eligibilityRequirements: event.target.value }))} rows={3} placeholder={text.eligibilityRequirementsInput} />
                      </label>
                      <label className="field wide">
                        <span>{text.requiredDocumentsInput}</span>
                        <textarea value={fundingImportForm.requiredDocuments} onChange={event => setFundingImportForm(prev => ({ ...prev, requiredDocuments: event.target.value }))} rows={3} placeholder={text.requiredDocumentsInput} />
                      </label>
                      <label className="field checkbox-field wide">
                        <input type="checkbox" checked={fundingImportForm.isVerified} onChange={event => setFundingImportForm(prev => ({ ...prev, isVerified: event.target.checked }))} />
                        <span>{text.markAsVerified}</span>
                      </label>
                      <button type="submit" disabled={savingFundingProgram}>
                        {savingFundingProgram ? <Loader2 className="spin" size={15} /> : <BookmarkPlus size={15} />} {text.addFundingProgram}
                      </button>
                    </form>
                    {fundingImportMessage && <p className="form-message">{fundingImportMessage}</p>}
                  </div>
                </aside>
              </div>
            </section>
            )}

            {activeTab === 'copilot' && (
            <section className="hub-grid two">
              <article className="warm-card">
                <div className="card-title">
                  <div>
                    <h2>{text.businessCopilot}</h2>
                    <p>{text.copilotText}</p>
                  </div>
                  <Bot size={22} />
                </div>
                <div className="copilot-panel">
                  <div>
                    <span>{text.selectedProject}</span>
                    <strong>{selectedProject ? firstText(selectedProject, ['name', 'project_name', 'title'], text.insufficient) : text.insufficient}</strong>
                  </div>
                  <Link href={selectedProject ? `/projects/${selectedProject.id}?tab=ai` : '/projects'} aria-label={text.openCopilot}>
                    {text.openCopilot} <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            </section>
            )}
          </>
        )}

        {activeTab === 'jurisdiction' && (
        <section className="jurisdiction-module" id="jurisdiction-wizard-module">
          <div className="jurisdiction-header">
            <div>
              <span className="eyebrow"><Globe2 size={16} /> {text.jurisdictionWizard}</span>
              <h2>{text.jurisdictionWizard}</h2>
              <p>{text.jurisdictionWizardDescription}</p>
            </div>
            <span className="status-badge needs-improvement">{text.notVerifiedYet}</span>
          </div>

          <div className="jurisdiction-stepper" role="tablist" aria-label={text.jurisdictionWizard}>
            {JURISDICTION_STEPS.map((step, index) => (
              <button key={step} type="button" className={wizardStep === index ? 'active' : ''} onClick={() => setWizardStep(index)} aria-label={`${text.stepOf} ${index + 1}: ${text[step]}`}>
                <span>{index + 1}</span>
                {text[step]}
              </button>
            ))}
          </div>

          <div className="jurisdiction-layout">
            <article className="warm-card wizard-card">
              <div className="card-title">
                <div>
                  <h2>{text[JURISDICTION_STEPS[wizardStep]]}</h2>
                  <p>{text.basedOnInputsOnly}</p>
                </div>
                <Scale size={22} />
              </div>

              {wizardStep === 0 && (
                <div className="wizard-form">
                  <div className="wizard-project-selector">
                    <ProjectSelector
                      projects={projects}
                      selectedProjectId={selectedProjectId}
                      onChange={setSelectedProjectId}
                      readinessScore={readiness?.score ?? null}
                      label={text.selectProjectStep}
                      hint={text.selectProjectHint}
                      compact
                    />
                  </div>
                  <SelectField label={text.primaryMarket} value={wizard.targetMarket} onChange={value => updateWizard('targetMarket', value)} options={COUNTRIES.map(item => ({ value: item.value, label: item.label[locale] }))} placeholder={text.choose} />
                  {projects.length === 0 && <div className="planner-warning"><AlertTriangle size={15} /> {text.addProjectFirst}</div>}
                </div>
              )}

              {wizardStep === 1 && (
                <div className="wizard-form">
                  <SelectField label={text.businessType} value={wizard.businessType} onChange={value => updateWizard('businessType', value)} options={BUSINESS_TYPES.map(item => ({ value: item.value, label: item.label[locale] }))} placeholder={text.choose} />
                  <label className="field"><span>{text.industry}</span><input value={wizard.industry} onChange={event => updateWizard('industry', event.target.value)} aria-label={text.industry} /></label>
                  <label className="field"><span>{text.productService}</span><input value={wizard.productService} onChange={event => updateWizard('productService', event.target.value)} aria-label={text.productService} /></label>
                  <SelectField label={text.deliveryModel} value={wizard.deliveryModel} onChange={value => updateWizard('deliveryModel', value)} options={DELIVERY_MODELS.map(item => ({ value: item.value, label: text[item.labelKey] }))} placeholder={text.choose} />
                </div>
              )}

              {wizardStep === 2 && (
                <div className="choice-grid">
                  {TARGET_CUSTOMER_OPTIONS.map(option => (
                    <label className="choice-pill" key={option.value}>
                      <input type="checkbox" checked={wizard.targetCustomers.includes(option.value)} onChange={() => toggleWizardList('targetCustomers', option.value)} />
                      <span>{text[option.labelKey]}</span>
                    </label>
                  ))}
                </div>
              )}

              {wizardStep === 3 && (
                <div className="choice-grid">
                  {OPERATIONAL_NEED_OPTIONS.map(option => (
                    <label className="choice-pill" key={option.value}>
                      <input type="checkbox" checked={wizard.operationalNeeds.includes(option.value)} onChange={() => toggleWizardList('operationalNeeds', option.value)} />
                      <span>{text[option.labelKey]}</span>
                    </label>
                  ))}
                </div>
              )}

              {wizardStep === 4 && (
                <div className="wizard-form">
                  <label className="field"><span>{text.availableCapital}</span><input value={wizard.availableCapital} onChange={event => updateWizard('availableCapital', event.target.value)} inputMode="decimal" aria-label={text.availableCapital} /></label>
                  <label className="field"><span>{text.fundingNeeded}</span><input value={wizard.fundingNeeded} onChange={event => updateWizard('fundingNeeded', event.target.value)} inputMode="decimal" aria-label={text.fundingNeeded} /></label>
                  <div className="choice-grid wide">
                    {FUNDING_GOAL_OPTIONS.map(option => (
                      <label className="choice-pill" key={option.value}>
                        <input type="checkbox" checked={wizard.fundingGoals.includes(option.value)} onChange={() => toggleWizardList('fundingGoals', option.value)} />
                        <span>{text[option.labelKey]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 5 && (
                <div className="choice-grid">
                  {EXPANSION_OPTIONS.map(option => (
                    <label className="choice-pill" key={option.value}>
                      <input type="radio" name="expansion-plan" checked={wizard.expansionPlan === option.value} onChange={() => updateWizard('expansionPlan', option.value)} />
                      <span>{text[option.labelKey]}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="wizard-controls">
                <button type="button" onClick={() => setWizardStep(step => Math.max(0, step - 1))} disabled={wizardStep === 0} aria-label={text.previous}>{text.previous}</button>
                <button type="button" onClick={() => setWizardStep(step => Math.min(JURISDICTION_STEPS.length - 1, step + 1))} disabled={wizardStep === JURISDICTION_STEPS.length - 1} aria-label={text.next}>{text.next}</button>
                <button type="button" onClick={() => setWizardStep(JURISDICTION_STEPS.length - 1)} aria-label={text.generateComparison}>{text.generateComparison}</button>
              </div>
            </article>

            <aside className="warm-card wizard-output">
              <div className="card-title">
                <div>
                  <h2>{text.topMatches}</h2>
                  <p>{text.requiresOfficialVerification}</p>
                </div>
                <Scale size={22} />
              </div>
              <div className="jurisdiction-summary">
                <p><b>{text.selectedProject}</b><span>{selectedProject ? firstText(selectedProject, ['name', 'project_name', 'title'], text.insufficient) : text.addProjectFirst}</span></p>
                <p><b>{text.primaryMarket}</b><span>{selectedLabel(COUNTRIES, wizard.targetMarket, locale) || text.missing}</span></p>
                <p><b>{text.expansionPlan}</b><span>{optionLabel(EXPANSION_OPTIONS, wizard.expansionPlan, text) || text.missing}</span></p>
              </div>
              {wizardMissing.length > 0 && (
                <div className="missing-box">
                  <strong>{text.missingWizardData}</strong>
                  <ul>{wizardMissing.map(item => <li key={item}>{item}</li>)}</ul>
                </div>
              )}
              <div className="top-match-list">
                {jurisdictionResults.slice(0, 3).map(result => (
                  <div key={result.code}>
                    <strong>{result.label}</strong>
                    <span>{text.matchScore}: {percent(result.score, locale)}</span>
                  </div>
                ))}
              </div>
              <button className="primary-action" type="button" onClick={saveJurisdictionAssessment} disabled={!selectedProject || savingJurisdiction} aria-label={text.saveAssessment}>
                {savingJurisdiction ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />} {savingJurisdiction ? text.saving : text.saveAssessment}
              </button>
              <span className={`status-badge ${jurisdictionAssessment?.id ? 'ready-for-review' : 'not-ready'}`}>
                {jurisdictionAssessment?.id ? text.available : text.missing}
              </span>
              {jurisdictionMessage && <p className="form-message">{jurisdictionMessage}</p>}
              <button className="secondary-action" type="button" disabled aria-disabled="true" aria-label={text.addAssessmentToPackage}>{text.addAssessmentToPackage} - {text.comingSoon}</button>
            </aside>
          </div>

          <div className="jurisdiction-results">
            <div className="section-title-row">
              <h3>{text.topMatches}</h3>
              <span>{text.notVerifiedYet}</span>
            </div>
            <div className="jurisdiction-cards">
              {jurisdictionResults.map(result => (
                <article className="jurisdiction-card" key={result.code}>
                  <div className="jurisdiction-card-head">
                    <div>
                      <h4>{result.label}</h4>
                      <small>{result.region} - {text.notVerifiedYet}</small>
                    </div>
                    <strong>{percent(result.score, locale)}</strong>
                  </div>
                  <div className="jurisdiction-columns">
                    <div><b>{text.strengths}</b><ul>{result.strengths.map(item => <li key={item}>{item}</li>)}</ul></div>
                    <div><b>{text.limitations}</b><ul>{result.limitations.slice(0, 4).map(item => <li key={item}>{item}</li>)}</ul></div>
                    <div><b>{text.suitableFor}</b><ul>{result.suitableFor.slice(0, 4).map(item => <li key={item}>{item}</li>)}</ul></div>
                    <div><b>{text.nextSteps}</b><ul>{result.nextSteps.slice(0, 4).map(item => <li key={item}>{item}</li>)}</ul></div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="warm-card comparison-card">
            <div className="card-title">
              <div>
                <h2>{text.comparisonMatrix}</h2>
                <p>{text.basedOnInputsOnly}</p>
              </div>
              <BarChart3 size={22} />
            </div>
            <div className="matrix-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{text.primaryMarket}</th>
                    <th>{text.matchScore}</th>
                    <th>{text.targetMarketFit}</th>
                    <th>{text.operationalFit}</th>
                    <th>{text.fundingFit}</th>
                    <th>{text.expansionFit}</th>
                    <th>{text.verificationPenalty}</th>
                  </tr>
                </thead>
                <tbody>
                  {jurisdictionResults.map(result => (
                    <tr key={result.code}>
                      <td>{result.label}</td>
                      <td>{percent(result.score, locale)}</td>
                      <td>{text.basedOnInputsOnly}</td>
                      <td>{text.requiresOfficialVerification}</td>
                      <td>{text.requiresOfficialVerification}</td>
                      <td>{optionLabel(EXPANSION_OPTIONS, wizard.expansionPlan, text) || text.missing}</td>
                      <td>{text.notVerifiedYet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hub-grid two">
            <article className="warm-card">
              <div className="card-title">
                <div>
                  <h2>{text.officialVerificationRequired}</h2>
                  <p>{text.requiresOfficialVerification}</p>
                </div>
                <AlertTriangle size={22} />
              </div>
              <ul className="plain-list">
                {OFFICIAL_VERIFICATION_KEYS.map(key => <li key={key}>{text[key]}</li>)}
              </ul>
            </article>
            <article className="warm-card">
              <div className="card-title">
                <div>
                  <h2>{text.legalDisclaimer}</h2>
                  <p>{text.jurisdictionDisclaimerFull}</p>
                </div>
                <ShieldCheck size={22} />
              </div>
              <p className="trusted-note">{text.saveBeforeSharing}</p>
            </article>
          </div>
        </section>
        )}

        {activeTab === 'documents' && (
        <section className="strategic-documents-module" id="strategic-documents">
          <div className="documents-header">
            <div>
              <span className="eyebrow"><ShieldCheck size={16} /> {text.strategicDocuments}</span>
              <h2>{text.strategicDocuments}</h2>
              <p>{text.strategicDocumentsDescription}</p>
            </div>
            {selectedProject && strategicDocuments.score !== null ? (
              <div className={`score-pill ${statusClass(completionStatus(strategicDocuments.score))}`} role="progressbar" aria-label={text.documentReadinessScore} aria-valuenow={strategicDocuments.score} aria-valuemin={0} aria-valuemax={100}>
                <strong>{percent(strategicDocuments.score, locale)}</strong>
                <span>{text.documentReadinessScore}</span>
              </div>
            ) : null}
          </div>

          {!selectedProject ? (
            <div className="funding-empty">
              <FileText size={28} />
              <strong>{text.noProjectSelectedDocuments}</strong>
            </div>
          ) : (
            <div className="documents-layout">
              <article className="warm-card documents-main">
                <div className="document-card-grid">
                  {strategicDocuments.items.map(item => (
                    <div className="strategic-doc-card" key={item.key}>
                      <div className="doc-card-head">
                        <FileText size={19} />
                        <div>
                          <h3>{item.title}</h3>
                          <span className={`status-badge ${strategicStatusClass(item.status)}`}>{strategicStatusLabel(item.status, text)}</span>
                        </div>
                      </div>
                      <p>{item.description}</p>
                      {item.missing.length > 0 ? (
                        <div className="doc-missing">
                          <strong>{text.missingData}</strong>
                          <div>
                            {item.missing.map(action => (
                              <Link href={action.href} key={`${item.key}-${action.label}`}>{action.label}</Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="trusted-note">{text.readyForReviewText}</p>
                      )}
                      <div className="doc-actions">
                        <Link href={item.href} aria-label={`${text.preview} ${item.title}`}>{text.preview}</Link>
                        {item.key === 'businessPlan' && <button type="button" onClick={() => generateDocumentDraft('businessPlan')} aria-label={text.generateBusinessPlanDraft}>{text.generateBusinessPlanDraft}</button>}
                        {item.key === 'executiveSummary' && <button type="button" onClick={() => generateDocumentDraft('executiveSummary')} aria-label={text.generateExecutiveSummary}>{text.generateExecutiveSummary}</button>}
                        {item.key === 'investmentMemo' && <button type="button" onClick={() => generateDocumentDraft('investmentMemo')} aria-label={text.generateInvestmentMemo}>{text.generateInvestmentMemo}</button>}
                        {item.key !== 'businessPlan' && item.key !== 'executiveSummary' && item.key !== 'investmentMemo' && <button type="button" disabled aria-disabled="true" aria-label={text.exportSoon}>{text.exportSoon}</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <aside className="warm-card documents-side">
                <div className="card-title">
                  <div>
                    <h2>{text.dueDiligenceChecklist}</h2>
                    <p>{text.realDataOnly}</p>
                  </div>
                  <ClipboardCheck size={22} />
                </div>
                <div className="dd-list">
                  {strategicDocuments.dueDiligence.map(item => (
                    <div className="dd-row" key={item.label}>
                      <span className={`package-status ${item.status}`}>{item.status === 'complete' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}</span>
                      <strong>{item.label}</strong>
                      <small>{investorStatusLabel(item.status, text)}</small>
                    </div>
                  ))}
                </div>
                <div className="document-vault-summary">
                  <p><span>{text.documentCountLabel}</span><strong>{modules.documents.length}</strong></p>
                  {modules.documents.length === 0 ? (
                    <div className="planner-warning"><AlertTriangle size={15} /> {text.documentVaultEmpty}</div>
                  ) : (
                    <div className="category-list">
                      <strong>{text.groupedDocuments}</strong>
                      {Object.entries(strategicDocuments.groupedDocuments).map(([category, count]) => (
                        <span key={category}>{category}: {count}</span>
                      ))}
                    </div>
                  )}
                  <Link href={`${projectUrl}?tab=documents`} className="inline-link" aria-label={text.openDocumentsTab}>{text.openDocumentsTab}</Link>
                </div>
              </aside>
            </div>
          )}

          {documentDraft && (
            <article className="warm-card draft-preview" id="strategic-document-preview">
              <div className="card-title">
                <div>
                  <h2>{documentDraft.title}</h2>
                  <p>{text.planningOnlyDisclaimer}</p>
                </div>
                <span className="status-badge needs-improvement">{text.contentSource}: {text.rulesSource}</span>
              </div>
              <div className="draft-actions">
                <button type="button" onClick={printDocumentDraft} aria-label={text.printSavePdf}>{text.printSavePdf}</button>
                <button type="button" disabled aria-disabled="true" aria-label={text.exportSoon}>{text.exportSoon}</button>
              </div>
              <div className="draft-sections">
                {documentDraft.sections.map(section => (
                  <section key={section.title}>
                    <h3>{section.title}</h3>
                    <ul>
                      {section.lines.map((line, index) => <li key={`${section.title}-${index}`}>{line || text.incompleteInfo}</li>)}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          )}
        </section>
        )}

        {activeTab === 'readiness' && <section className="hub-grid two">
          <article className="warm-card">
            <div className="card-title">
              <div>
                <h2>{text.linkedModules}</h2>
                <p>{text.realDataOnly}</p>
              </div>
              <LineChart size={22} />
            </div>
            <div className="module-links">
              <Link className="module-link-button" href={projectUrl}><FolderKanban size={16} /> <span>{text.openProjects}</span></Link>
              <Link className="module-link-button" href="/reports-center"><FileText size={16} /> <span>{text.openReports}</span></Link>
              <Link className="module-link-button" href="/market-analysis"><LineChart size={16} /> <span>{text.openMarket}</span></Link>
              <Link className="module-link-button" href="/zakat"><Scale size={16} /> <span>{text.openZakat}</span></Link>
            </div>
            <div className="mini-metrics">
              <p><span>{text.projectCount}</span><strong>{projects.length}</strong></p>
              <p><span>{text.tasksCount}</span><strong>{modules.tasks.length}</strong></p>
              <p><span>{text.documentsCount}</span><strong>{modules.documents.length}</strong></p>
              <p><span>{text.capitalRequired}</span><strong>{readiness?.capitalAmount !== null && readiness?.capitalAmount !== undefined ? formatMoney(readiness.capitalAmount, selectedCurrency, locale) : text.insufficient}</strong></p>
            </div>
          </article>
        </section>}
        </PageTabPanel>
      </WorkspacePageContainer>
      <style>{BUSINESS_HUB_STYLES}</style>
    </div>
  );
}

function findCapitalAmount(project: ProjectRow, feasibility?: any, financialModel?: any) {
  const notes = toRecord(project.notes);
  const feasibilityFinancial = toRecord(feasibility?.financial_data);
  const assumptions = toRecord(financialModel?.assumptions);
  const candidates = [
    project.capital_amount,
    project.target_amount,
    project.budget,
    notes.capital_amount,
    notes.target_amount,
    notes.required_capital,
    feasibilityFinancial.requiredCapital,
    feasibilityFinancial.required_capital,
    feasibilityFinancial.capital,
    assumptions.initialCapital,
    assumptions.initial_capital,
  ];
  for (const value of candidates) {
    const parsed = toNumber(value);
    if (parsed !== null && parsed > 0) return parsed;
  }
  return null;
}

function ReadinessCard({
  title,
  icon,
  score,
  max,
  ready,
  lang,
  text,
  suffix,
  percentMode = false,
}: {
  title: string;
  icon: React.ReactNode;
  score: number;
  max: number;
  ready: boolean;
  lang: Lang;
  text: typeof TEXT[Lang];
  suffix?: string;
  percentMode?: boolean;
}) {
  const value = percentMode ? score : Math.round((score / max) * 100);
  return (
    <article className="readiness-card">
      <div className="readiness-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <strong>{suffix ?? percent(value, lang)}</strong>
        <span className={ready ? 'status-badge ready-for-review' : 'status-badge not-ready'}>{ready ? text.available : text.missing}</span>
      </div>
      <div className="progress-bar" aria-label={title} role="progressbar" aria-valuenow={Math.max(0, Math.min(100, value))} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </article>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} aria-label={label}>
        <option value="">{placeholder}</option>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
