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
import { Sidebar } from '@/components/Sidebar';
import { CurrencySelect } from '@/components/CurrencySelect';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PageTabs } from '@/components/layout/PageTabs';
import { ProjectSelector } from '@/components/projects/ProjectSelector';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
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
  normalizeBusinessHubTab, firstText, fundingRowToForm, normalizeWizard,
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

export default function BusinessHubPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const text = useMemo(() => ({ ...TEXT[locale], ...STRATEGIC_TEXT[locale], ...JURISDICTION_TEXT[locale], ...FUNDING_DIRECTORY_TEXT[locale] }), [locale]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [activeTab, setActiveTab] = useState<BusinessHubTab>('readiness');
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requestedTab = normalizeBusinessHubTab(params.get('tab')) ?? normalizeBusinessHubTab(window.location.hash);
    if (requestedTab) setActiveTab(requestedTab);
  }, []);

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
        <Sidebar />
        <main className="business-hub-main loading-state">
          <Loader2 className="spin" size={28} />
          <strong>{text.loading}</strong>
        </main>
        <style>{styles}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="business-hub-shell" dir={dir}>
        <Sidebar />
        <main className="business-hub-main">
          <section className="state-panel">
            <LockKeyhole size={30} />
            <h1>{text.title}</h1>
            <p>{text.signIn}</p>
          </section>
        </main>
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="business-hub-shell" dir={dir}>
      <Sidebar />
      <main className="business-hub-main">
        <div className="topbar">
          <div>
            <span>THE SFM</span>
            <strong>{text.title}</strong>
          </div>
          <LanguageSwitcher variant="gold" compact />
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
        />

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
              <Link href={projectUrl}><FolderKanban size={16} /> {text.openProjects}</Link>
              <Link href="/reports-center"><FileText size={16} /> {text.openReports}</Link>
              <Link href="/market-analysis"><LineChart size={16} /> {text.openMarket}</Link>
              <Link href="/zakat"><Scale size={16} /> {text.openZakat}</Link>
            </div>
            <div className="mini-metrics">
              <p><span>{text.projectCount}</span><strong>{projects.length}</strong></p>
              <p><span>{text.tasksCount}</span><strong>{modules.tasks.length}</strong></p>
              <p><span>{text.documentsCount}</span><strong>{modules.documents.length}</strong></p>
              <p><span>{text.capitalRequired}</span><strong>{readiness?.capitalAmount !== null && readiness?.capitalAmount !== undefined ? formatMoney(readiness.capitalAmount, selectedCurrency, locale) : text.insufficient}</strong></p>
            </div>
          </article>
        </section>}
      </main>
      <style>{styles}</style>
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

const styles = `
  .business-hub-shell{min-height:100vh;background:var(--sfm-background);color:var(--sfm-primary-dark);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
  .business-hub-main{width:calc(100% - 230px);max-width:1320px;margin:0 auto;margin-inline-start:230px;margin-inline-end:auto;padding:22px 24px 60px;display:grid;gap:18px;min-width:0;overflow-x:hidden}
  [dir="ltr"] .business-hub-main{margin-inline-start:230px;margin-inline-end:auto}
  .topbar{display:flex;align-items:center;justify-content:space-between;gap:14px}.topbar span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:900}.topbar strong{display:block;color:var(--sfm-primary-dark);font-size:24px;font-weight:950}
  .loading-state{min-height:100vh;place-items:center;color:var(--sfm-primary);font-weight:950}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .business-hero{background:linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 145%);color:var(--sfm-card);border-radius:30px;padding:clamp(24px,5vw,48px);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end;box-shadow:0 24px 80px rgba(3,18,37,.22);min-width:0;overflow:hidden}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.22);background:rgba(167,243,240,.1);border-radius:999px;padding:8px 13px;color:var(--sfm-soft-cyan);font-size:12px;font-weight:950}
  .business-hero h1{margin:18px 0 10px;font-size:clamp(34px,7vw,66px);line-height:1;font-weight:950;letter-spacing:0}.business-hero p{margin:0;max-width:820px;color:rgba(234,246,255,.76);font-size:clamp(15px,2vw,19px);line-height:1.8;font-weight:800}
  .hero-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}.hero-actions a,.hero-actions button,.empty-state a,.module-links a,.copilot-panel a{border:0;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 13px Tajawal,Arial,sans-serif;cursor:pointer;min-height:44px;padding:0 16px;text-decoration:none;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
  .hero-actions button,.empty-state a,.copilot-panel a{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;box-shadow:0 10px 24px rgba(167,243,240,.22)}.hero-actions button:hover,.empty-state a:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(167,243,240,.32)}.hero-actions a{background:rgba(255,255,255,.12);color:#FFFFFF;border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(10px);box-shadow:0 8px 20px rgba(3,18,37,.16),inset 0 1px 0 rgba(255,255,255,.18)}
  .hero-actions a:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.44);transform:translateY(-1px);box-shadow:0 12px 28px rgba(3,18,37,.22),inset 0 1px 0 rgba(255,255,255,.22)}.load-warning{display:flex;align-items:center;gap:8px;background:#FFF7ED;border:1px solid rgba(154,94,13,.18);color:#7A4B09;border-radius:15px;padding:12px 14px;font-weight:900}
  .selector-panel,.readiness-head,.warm-card,.empty-state,.state-panel{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:22px;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0}
  .selector-panel{padding:16px;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.42fr);gap:16px;align-items:end}.selector-panel h2,.readiness-head h2,.card-title h2,.empty-state h2,.state-panel h1{margin:0;color:var(--sfm-midnight);font-size:22px;font-weight:950}.selector-panel p,.readiness-head p,.card-title p,.empty-state p,.state-panel p{margin:6px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.7}
  .selector-panel label,.field{display:grid;gap:7px;min-width:0}.selector-panel label span,.field span{font-size:12px;font-weight:950;color:var(--sfm-muted)}.selector-panel select,.field select,.field input,.field textarea{width:100%;min-width:0;border:1px solid rgba(29,140,255,.2);background:var(--sfm-card);color:var(--sfm-deep-navy);border-radius:14px;min-height:44px;padding:0 12px;font:900 13px Tajawal,Arial,sans-serif;outline:none}.field textarea{min-height:86px;padding:11px 12px;line-height:1.6;resize:vertical}.selector-panel select:focus,.field select:focus,.field input:focus,.field textarea:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}
  .empty-state,.state-panel{min-height:300px;display:grid;place-items:center;text-align:center;padding:30px}.empty-state svg,.state-panel svg{color:var(--sfm-primary)}.empty-state p,.state-panel p{max-width:560px}.empty-state a{margin-top:8px}
  .readiness-head{padding:18px;display:flex;align-items:center;justify-content:space-between;gap:16px}.score-pill{display:grid;place-items:center;text-align:center;min-width:140px;border-radius:18px;background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.16);padding:12px}.score-pill strong{font-size:24px;color:var(--sfm-primary-dark)}.score-pill span{font-size:12px;font-weight:950;color:var(--sfm-primary-hover)}
  .readiness-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;min-width:0}.readiness-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:20px;padding:15px;box-shadow:0 14px 38px rgba(3,18,37,.06);display:grid;gap:12px;min-width:0}.readiness-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary)}.readiness-card h3{margin:0;color:var(--sfm-midnight);font-size:15px;font-weight:950;line-height:1.35}.readiness-card strong{display:block;margin:5px 0;color:var(--sfm-primary-dark);font-size:20px;overflow-wrap:anywhere}
  .status-badge{display:inline-flex;width:max-content;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950}.status-badge.ready-for-review,.status-badge.good{background:#ECFDF5;color:#047857}.status-badge.needs-improvement{background:#FFF7ED;color:#B45309}.status-badge.not-ready{background:#FEF2F2;color:#B91C1C}
  .progress-bar{height:9px;border-radius:999px;background:rgba(29,140,255,.10);overflow:hidden}.progress-bar span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--sfm-soft-cyan),var(--sfm-primary))}
  .funding-module{display:grid;gap:14px;min-width:0}.funding-header{background:linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 145%);color:var(--sfm-card);border-radius:24px;padding:22px;display:flex;justify-content:space-between;gap:16px;align-items:center;min-width:0;overflow:hidden;box-shadow:0 18px 48px rgba(3,18,37,.16)}.funding-header h2{margin:12px 0 8px;font-size:clamp(26px,4vw,40px);font-weight:950}.funding-header p{margin:0;color:rgba(234,246,255,.72);line-height:1.7;font-weight:850}.funding-header .score-pill{background:rgba(234,246,255,.1);border-color:rgba(167,243,240,.2)}.funding-header .score-pill strong{color:var(--sfm-card)}.funding-header .score-pill span{color:var(--sfm-soft-cyan)}
  .funding-layout{display:grid;grid-template-columns:minmax(0,1.32fr) minmax(320px,.78fr);gap:16px;align-items:start;min-width:0;direction:ltr}.funding-layout>*{direction:inherit}[dir="rtl"] .funding-layout>*{direction:rtl}.funding-support-column{display:grid;gap:16px;align-content:start;min-width:0}.use-funds-card,.investor-package,.funding-side{align-self:start}.package-grid{display:grid;gap:10px}.package-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:11px;color:var(--sfm-primary-dark);text-decoration:none;min-width:0}.package-item strong{min-width:0;overflow-wrap:anywhere}.package-item small{font-size:11px;font-weight:950;color:var(--sfm-muted)}.package-status{width:30px;height:30px;border-radius:11px;display:grid;place-items:center}.package-status.complete{background:#ECFDF5;color:#047857}.package-status.needs_review{background:#FFF7ED;color:#B45309}.package-status.missing{background:#FEF2F2;color:#B91C1C}
  .planner-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.planner-grid .field:last-child{grid-column:1 / -1}.funds-table{display:grid;gap:9px;margin-top:14px}.fund-row{display:grid;grid-template-columns:minmax(120px,.75fr) repeat(2,minmax(0,1fr));gap:9px;align-items:end;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:10px;min-width:0}.fund-row strong{color:var(--sfm-midnight);line-height:1.35}.fund-row label{display:grid;gap:5px;min-width:0}.fund-row label span{font-size:11px;color:var(--sfm-muted);font-weight:950}.fund-row input{width:100%;min-width:0;border:1px solid rgba(29,140,255,.18);border-radius:12px;background:var(--sfm-card);min-height:38px;padding:0 10px;font:900 12px Tajawal,Arial,sans-serif;outline:none}.fund-row input:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.12)}
  .planner-totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.planner-totals p{margin:0;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px}.planner-totals span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}.planner-totals strong{display:block;margin-top:5px;color:var(--sfm-primary-dark);overflow-wrap:anywhere}.planner-warning{display:flex;align-items:center;gap:7px;margin-top:10px;border:1px solid rgba(154,94,13,.18);background:#FFF7ED;color:#7A4B09;border-radius:14px;padding:10px 12px;font-size:12px;font-weight:950}.field.wide{margin-top:12px}.save-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.save-row button,.package-actions button{border:0;border-radius:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.save-row button:disabled,.package-actions button:disabled{opacity:.62;cursor:not-allowed}.form-message{margin:10px 0 0;color:var(--sfm-muted);font-weight:900}
  .funding-side{position:static;top:auto}.warning-list{margin:0;padding-inline-start:18px;color:#B91C1C;line-height:1.8;font-weight:900}.missing-box a{color:var(--sfm-primary-hover);font-weight:950;text-decoration:none}.package-actions{display:grid;gap:9px;margin-top:14px}.package-actions a{min-height:42px;border-radius:14px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);color:var(--sfm-midnight);text-decoration:none;display:flex;align-items:center;justify-content:center;font-weight:950}.funding-empty{background:var(--sfm-card);border:1px dashed rgba(29,140,255,.24);border-radius:22px;padding:28px;display:grid;place-items:center;text-align:center;color:var(--sfm-muted);gap:8px}.funding-empty svg{color:var(--sfm-primary)}
  .funding-directory-module{display:grid;gap:14px;min-width:0}.directory-header{background:linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-midnight) 58%,var(--sfm-card-dark) 145%);color:var(--sfm-card);border-radius:24px;padding:22px;display:flex;justify-content:space-between;gap:16px;align-items:center;min-width:0;overflow:hidden;box-shadow:0 18px 48px rgba(3,18,37,.16)}.directory-header h2{margin:12px 0 8px;font-size:clamp(26px,4vw,40px);font-weight:950}.directory-header p{margin:0;color:rgba(234,246,255,.74);line-height:1.7;font-weight:850}.directory-filters{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:20px;padding:14px;display:grid;grid-template-columns:minmax(220px,1.3fr) repeat(4,minmax(150px,1fr));gap:10px;min-width:0}.search-field{position:relative;min-width:0}.search-field svg{position:absolute;inset-inline-start:12px;top:50%;transform:translateY(-50%);color:var(--sfm-primary)}.search-field input{padding-inline-start:38px!important}.directory-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.34fr);gap:16px;align-items:start;min-width:0}.directory-main,.directory-side{min-width:0}.directory-side{position:sticky;top:18px}.directory-empty{min-height:240px;display:grid;place-items:center;text-align:center;gap:8px;border:1px dashed rgba(29,140,255,.24);background:var(--sfm-light-card);border-radius:18px;padding:24px;color:var(--sfm-muted)}.directory-empty strong{color:var(--sfm-midnight);font-size:18px}.directory-empty p{max-width:560px;margin:0;line-height:1.7;font-weight:850}.directory-empty-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin-top:8px}.directory-empty-actions a{min-height:40px;border-radius:13px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 13px;text-decoration:none;font:950 12px Tajawal,Arial,sans-serif}.directory-empty-actions a:first-child{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 10px 22px rgba(29,140,255,.2)}.directory-empty-actions a:last-child{background:var(--sfm-card);color:var(--sfm-primary-hover);border:1px solid rgba(29,140,255,.18)}.directory-category-chips{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;max-width:720px}.directory-category-chips span{border:1px solid rgba(29,140,255,.14);background:#fff;border-radius:999px;color:var(--sfm-primary-dark);padding:7px 10px;font-size:11px;font-weight:950}.directory-missing-list{width:min(100%,560px);border:1px solid rgba(154,94,13,.18);background:#FFF7ED;border-radius:15px;padding:12px;text-align:initial;color:#7A4B09}.directory-missing-list b{display:block;margin-bottom:6px}.directory-missing-list ul{margin:0;padding-inline-start:18px;display:grid;gap:4px}.directory-missing-list p{margin:0}.program-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}.program-card{border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:18px;padding:14px;display:grid;gap:12px;min-width:0}.program-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.program-card-head h3{margin:0;color:var(--sfm-midnight);font-size:18px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}.program-card-head p{margin:5px 0 0;color:var(--sfm-muted);font-size:12px;font-weight:900}.program-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.program-meta p{margin:0;border:1px solid rgba(29,140,255,.1);background:var(--sfm-card);border-radius:13px;padding:10px;min-width:0}.program-meta span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:950}.program-meta strong{display:block;margin-top:4px;color:var(--sfm-primary-dark);overflow-wrap:anywhere}.directory-warning,.funding-fit-box{border:1px solid rgba(154,94,13,.18);background:#FFF7ED;color:#7A4B09;border-radius:14px;padding:10px 12px;font-size:12px;font-weight:950;line-height:1.6}.directory-warning{display:flex;gap:7px;align-items:flex-start}.funding-fit-box{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:start}.funding-fit-box p{grid-column:1 / -1;margin:0;color:var(--sfm-muted)}.funding-fit-box span{color:var(--sfm-primary)}.project-not-ready-box{border:1px solid rgba(190,18,60,.14);background:#FFF1F2;color:#9F1239;border-radius:14px;padding:10px 12px;font-size:12px;font-weight:950;line-height:1.6}.project-not-ready-box strong{display:block;margin-bottom:5px}.project-not-ready-box ul{margin:0;padding-inline-start:18px;display:grid;gap:3px}.program-actions{display:flex;gap:8px;flex-wrap:wrap}.program-actions button,.program-actions a,.compact-select select{min-height:38px;border-radius:12px;border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);color:var(--sfm-midnight);padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:950 12px Tajawal,Arial,sans-serif;text-decoration:none;cursor:pointer}.program-actions button:not(:disabled){background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;border:0}.program-actions button:disabled{opacity:.6;cursor:not-allowed}.compact-select{display:grid;gap:4px}.compact-select span{font-size:10px;color:var(--sfm-muted);font-weight:950}.program-detail{display:grid;gap:8px;border-top:1px solid rgba(29,140,255,.12);padding-top:10px}.program-detail p{margin:0;display:grid;grid-template-columns:minmax(110px,.32fr) minmax(0,1fr);gap:8px;color:var(--sfm-midnight);font-weight:850;line-height:1.6}.program-detail b{color:var(--sfm-primary-hover)}.program-detail span{min-width:0;overflow-wrap:anywhere}.program-detail a{color:var(--sfm-primary-hover)}.funding-admin-import{margin-top:14px;border-top:1px solid rgba(29,140,255,.12);padding-top:14px;display:grid;gap:10px}.funding-admin-import h3{margin:0;color:var(--sfm-midnight);font-size:16px;font-weight:950}.funding-admin-import p{margin:0;color:var(--sfm-muted);font-weight:850;line-height:1.7}.funding-admin-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.funding-admin-form .wide{grid-column:1 / -1}.funding-admin-form textarea{resize:vertical;min-height:78px}.checkbox-field{display:flex!important;align-items:center;gap:8px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:13px;padding:10px}.checkbox-field input{width:auto!important;min-height:auto!important}.funding-admin-form button[type=submit]{grid-column:1 / -1;border:0;border-radius:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.funding-admin-form button[type=submit]:disabled{opacity:.62;cursor:not-allowed}
  .jurisdiction-module{display:grid;gap:14px;min-width:0}.jurisdiction-header{background:linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 145%);color:var(--sfm-card);border-radius:24px;padding:22px;display:flex;justify-content:space-between;gap:16px;align-items:center;min-width:0;overflow:hidden;box-shadow:0 18px 48px rgba(3,18,37,.16)}.jurisdiction-header h2{margin:12px 0 8px;font-size:clamp(26px,4vw,40px);font-weight:950}.jurisdiction-header p{margin:0;color:rgba(234,246,255,.74);line-height:1.7;font-weight:850}.jurisdiction-stepper{display:flex;gap:8px;overflow-x:auto;padding:2px 1px 8px;scrollbar-width:thin}.jurisdiction-stepper button{flex:0 0 auto;min-height:42px;border-radius:999px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-muted);padding:0 12px;display:flex;align-items:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.jurisdiction-stepper button span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover)}.jurisdiction-stepper button.active{background:var(--sfm-midnight);color:var(--sfm-soft-cyan)}.jurisdiction-stepper button.active span{background:var(--sfm-soft-cyan);color:var(--sfm-primary-dark)}.jurisdiction-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(310px,.5fr);gap:16px;align-items:start;min-width:0}.choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0}.choice-grid.wide{grid-column:1 / -1}.choice-pill{border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:15px;padding:11px;display:flex;align-items:center;gap:9px;color:var(--sfm-midnight);font-weight:950;min-width:0}.choice-pill input{accent-color:var(--sfm-primary)}.choice-pill span{min-width:0;overflow-wrap:anywhere}.wizard-controls{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.wizard-controls button,.primary-action,.secondary-action{border:0;border-radius:14px;min-height:42px;padding:0 13px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.wizard-controls button,.primary-action{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.wizard-controls button:disabled,.primary-action:disabled,.secondary-action:disabled{opacity:.58;cursor:not-allowed}.secondary-action{width:100%;margin-top:10px;background:var(--sfm-light-card);color:var(--sfm-muted);border:1px solid rgba(29,140,255,.14)}.top-match-list{display:grid;gap:9px;margin-top:12px}.top-match-list div{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px;min-width:0}.top-match-list strong,.top-match-list span{min-width:0;overflow-wrap:anywhere}.primary-action{width:100%;margin-top:12px}.jurisdiction-results{display:grid;gap:12px}.section-title-row{display:flex;justify-content:space-between;gap:12px;align-items:center}.section-title-row h3{margin:0;color:var(--sfm-midnight);font-size:22px;font-weight:950}.section-title-row span{border-radius:999px;background:#FFF7ED;color:#B45309;padding:7px 10px;font-size:12px;font-weight:950}.jurisdiction-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.jurisdiction-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:20px;padding:15px;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0}.jurisdiction-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.jurisdiction-card-head h4{margin:0;color:var(--sfm-midnight);font-size:19px;font-weight:950}.jurisdiction-card-head small{display:block;margin-top:4px;color:var(--sfm-muted);font-weight:900}.jurisdiction-card-head strong{font-size:22px;color:var(--sfm-primary)}.jurisdiction-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.jurisdiction-columns div{border:1px solid rgba(29,140,255,.1);background:var(--sfm-light-card);border-radius:14px;padding:10px;min-width:0}.jurisdiction-columns b{display:block;color:var(--sfm-primary-hover);margin-bottom:6px}.jurisdiction-columns ul{margin:0;padding-inline-start:18px;color:var(--sfm-midnight);line-height:1.7;font-weight:850;overflow-wrap:anywhere}.comparison-card{min-width:0}.matrix-scroll{overflow-x:auto;max-width:100%;border-radius:15px;border:1px solid rgba(29,140,255,.12)}.matrix-scroll table{width:100%;min-width:760px;border-collapse:collapse;background:var(--sfm-light-card)}.matrix-scroll th,.matrix-scroll td{text-align:start;border-bottom:1px solid rgba(29,140,255,.1);padding:11px;color:var(--sfm-midnight);font-size:12px;line-height:1.5}.matrix-scroll th{color:var(--sfm-primary-hover);background:rgba(29,140,255,.10);font-weight:950}
  .strategic-documents-module{display:grid;gap:14px;min-width:0}.documents-header{background:linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-midnight) 62%,var(--sfm-card-dark) 140%);color:var(--sfm-card);border-radius:24px;padding:22px;display:flex;justify-content:space-between;gap:16px;align-items:center;min-width:0;overflow:hidden;box-shadow:0 18px 48px rgba(3,18,37,.14)}.documents-header h2{margin:12px 0 8px;font-size:clamp(26px,4vw,40px);font-weight:950}.documents-header p{margin:0;color:rgba(234,246,255,.72);line-height:1.7;font-weight:850}.documents-header .score-pill{background:rgba(234,246,255,.1);border-color:rgba(167,243,240,.2)}.documents-header .score-pill strong{color:var(--sfm-card)}.documents-header .score-pill span{color:var(--sfm-soft-cyan)}.documents-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.35fr);gap:16px;align-items:start;min-width:0}.documents-main{min-width:0}.document-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}.strategic-doc-card{border:1px solid rgba(29,140,255,.13);background:var(--sfm-light-card);border-radius:18px;padding:14px;display:grid;gap:11px;min-width:0}.doc-card-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}.doc-card-head svg{color:var(--sfm-primary)}.doc-card-head h3{margin:0 0 7px;color:var(--sfm-midnight);font-size:17px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}.strategic-doc-card p{margin:0;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.65}.doc-missing{border:1px dashed rgba(29,140,255,.24);background:var(--sfm-card);border-radius:14px;padding:10px;display:grid;gap:8px;min-width:0}.doc-missing strong{color:var(--sfm-primary-hover);font-size:12px}.doc-missing div{display:flex;flex-wrap:wrap;gap:7px}.doc-missing a,.inline-link{border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);text-decoration:none;font-size:11px;font-weight:950;padding:7px 9px}.doc-actions{display:flex;gap:8px;flex-wrap:wrap}.doc-actions a,.doc-actions button,.draft-actions button{border:0;border-radius:13px;min-height:38px;padding:0 11px;display:inline-flex;align-items:center;justify-content:center;background:var(--sfm-card);color:var(--sfm-midnight);border:1px solid rgba(29,140,255,.14);font:950 12px Tajawal,Arial,sans-serif;text-decoration:none;cursor:pointer}.doc-actions button:not(:disabled),.draft-actions button:not(:disabled){background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;border:0}.doc-actions button:disabled,.draft-actions button:disabled{opacity:.62;cursor:not-allowed}.documents-side{position:sticky;top:18px}.dd-list{display:grid;gap:9px}.dd-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px;min-width:0}.dd-row strong{font-size:13px;color:var(--sfm-midnight);overflow-wrap:anywhere}.dd-row small{font-size:11px;font-weight:950;color:var(--sfm-muted)}.document-vault-summary{display:grid;gap:10px;margin-top:14px}.document-vault-summary p{margin:0;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px}.document-vault-summary span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}.document-vault-summary strong{display:block;color:var(--sfm-primary-dark);font-size:19px}.category-list{display:grid;gap:7px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px}.category-list strong{font-size:13px}.category-list span{border-bottom:1px solid rgba(29,140,255,.08);padding-bottom:6px}.draft-preview{scroll-margin-top:24px}.draft-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.draft-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.draft-sections section{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:17px;padding:14px;min-width:0}.draft-sections h3{margin:0 0 8px;color:var(--sfm-midnight);font-size:16px;font-weight:950}.draft-sections ul{margin:0;padding-inline-start:18px;color:var(--sfm-midnight);line-height:1.75;font-weight:850;overflow-wrap:anywhere}
  .hub-grid{display:grid;gap:16px;min-width:0}.hub-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.wizard-layout{grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);align-items:start}.warm-card{padding:18px}.card-title{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.card-title svg{color:var(--sfm-primary);flex:0 0 auto}
  .check-list,.document-grid,.module-links{display:grid;gap:10px}.check-row,.document-link{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:11px;text-decoration:none;color:var(--sfm-primary-dark);min-width:0}.check-row strong,.document-link span{min-width:0;font-weight:950;overflow-wrap:anywhere}.check-row small,.document-link small{color:var(--sfm-muted);font-size:11px;font-weight:950}.done,.todo{width:28px;height:28px;border-radius:11px;display:grid;place-items:center}.done{background:#ECFDF5;color:#047857}.todo{background:#FEF2F2;color:#B91C1C}.document-link.disabled{opacity:.68;cursor:not-allowed}
  .copilot-panel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:16px;padding:14px}.copilot-panel span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}.copilot-panel strong{display:block;margin-top:5px;color:var(--sfm-primary-dark);overflow-wrap:anywhere}
  .wizard-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wizard-project-selector{grid-column:1 / -1;min-width:0}.wizard-output{position:sticky;top:18px}.jurisdiction-summary{display:grid;gap:8px;margin:12px 0}.jurisdiction-summary p{margin:0;display:grid;grid-template-columns:minmax(120px,.42fr) minmax(0,1fr);gap:10px;border-bottom:1px solid rgba(29,140,255,.1);padding-bottom:8px}.jurisdiction-summary b{color:var(--sfm-muted)}.jurisdiction-summary span{font-weight:950;color:var(--sfm-primary-dark)}.plain-list,.missing-box ul{margin:12px 0 0;padding-inline-start:18px;color:var(--sfm-muted);line-height:1.8;font-weight:850}.missing-box{margin-top:12px;border:1px dashed rgba(29,140,255,.24);background:var(--sfm-light-card);border-radius:15px;padding:12px}.missing-box strong{color:var(--sfm-primary-hover)}.trusted-note{margin:12px 0 0;color:var(--sfm-muted);font-weight:900;line-height:1.7}
  .module-links{grid-template-columns:repeat(2,minmax(0,1fr))}.module-links a{background:var(--sfm-light-card);color:var(--sfm-midnight);border:1px solid rgba(29,140,255,.14);min-height:46px}.mini-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.mini-metrics p{margin:0;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px;min-width:0}.mini-metrics span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}.mini-metrics strong{display:block;margin-top:5px;color:var(--sfm-primary-dark);overflow-wrap:anywhere}
  a:focus-visible,button:focus-visible,select:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.18)}
  @media(max-width:1260px){.readiness-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.hub-grid.two,.wizard-layout,.funding-layout,.documents-layout,.jurisdiction-layout,.directory-layout{grid-template-columns:1fr}.wizard-output,.funding-side,.documents-side,.directory-side{position:static}.directory-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:1024px){.business-hub-main{width:100%;max-width:100%;margin-inline-start:0;margin-inline-end:0;padding:calc(84px + env(safe-area-inset-top)) 16px 24px}.business-hero{grid-template-columns:1fr}.hero-actions{justify-content:stretch}.hero-actions a,.hero-actions button{flex:1 1 180px}.selector-panel{grid-template-columns:1fr}.funding-header,.documents-header,.jurisdiction-header,.directory-header{display:grid}.funding-header .score-pill,.documents-header .score-pill{width:100%}.jurisdiction-header .status-badge,.directory-header .status-badge{width:max-content}.program-grid{grid-template-columns:1fr}}
  @media(max-width:720px){.topbar{align-items:flex-start}.business-hero{border-radius:22px}.hero-actions{display:grid}.hero-actions a,.hero-actions button{width:100%}.readiness-head{display:grid}.score-pill{width:100%}.readiness-grid,.wizard-form,.module-links,.mini-metrics,.planner-grid,.planner-totals,.document-card-grid,.draft-sections,.jurisdiction-cards,.jurisdiction-columns,.choice-grid,.directory-filters,.program-meta,.funding-admin-form{grid-template-columns:1fr}.copilot-panel{grid-template-columns:1fr}.check-row,.document-link,.package-item,.dd-row{grid-template-columns:auto minmax(0,1fr)}.check-row small,.document-link small,.package-item small,.dd-row small{grid-column:2}.fund-row{grid-template-columns:1fr}.jurisdiction-summary p,.program-detail p{grid-template-columns:1fr}.section-title-row,.jurisdiction-card-head,.program-card-head{display:grid}.wizard-controls button,.program-actions button,.program-actions a{flex:1 1 140px}}
`;
