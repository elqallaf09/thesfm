'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Bot, Coins, ClipboardList, FileText, Globe2, Pencil, Plus, Target } from 'lucide-react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import {
  ProjectKpisTab, buildProjectKpiSummary, emptyProjectKpiSummary, type ProjectKpiSummary,
} from '@/components/projects/ProjectKpisTab';
import {
  ProjectTasksTab, buildProjectTasksSummary, emptyProjectTasksSummary,
  type ProjectMilestoneRow, type ProjectTaskRow, type ProjectTasksSummary,
} from '@/components/projects/ProjectTasksTab';
import { PageTabPanel, PageTabs } from '@/components/layout/PageTabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUrlTabState } from '@/hooks/useUrlTabState';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { buildFeasibilityStudyExportRow, printFeasibilityStudyToPdf } from '@/lib/reports/feasibilityStudyExport';
import { useCurrency } from '@/lib/useCurrency';

const ProjectAiAdvisorTab = dynamic(() => import('@/components/projects/ProjectAiAdvisorTab').then(m => m.ProjectAiAdvisorTab), { ssr: false, loading: () => <LazyTabSkeleton /> });
const ProjectDocumentsTab = dynamic(() => import('@/components/projects/ProjectDocumentsTab').then(m => m.ProjectDocumentsTab), { ssr: false, loading: () => <LazyTabSkeleton /> });
const ProjectFinancialModelTab = dynamic(() => import('@/components/projects/ProjectFinancialModelTab').then(m => m.ProjectFinancialModelTab), { ssr: false, loading: () => <LazyTabSkeleton /> });
const ProjectPitchDeckTab = dynamic(() => import('@/components/projects/ProjectPitchDeckTab').then(m => m.ProjectPitchDeckTab), { ssr: false, loading: () => <LazyTabSkeleton /> });

import type {
  Lang, TabId, RiskLevel, FeasibilitySection, FeasibilityStatus, FeasibilityForm,
  ProjectRow, ProjectExpenseRow, ProjectExpenseForm, ProjectExpenseReceiptAnalysis,
  ProjectExpenseAiAnalysis, ProjectIncomeRow, ProjectIncomeForm,
  FeasibilityStudyRow, DeleteTarget, SavingsRow,
} from './_types';
import { TEXT } from './_text';
import type { Translation } from './_text';
import {
  LazyTabSkeleton, tabs, sectionWeights, createEmptyFeasibility, parseNotes,
  uniqueProjectDocumentCount, toNum, normalizeCurrencyCode, normalizeProjectExpenseRow,
  safeDate, todayInputValue, emptyProjectExpenseForm, emptyProjectIncomeForm,
  normalizeStatus, normalizeType, riskCopyKey, normalizeFeasibilityRow,
  sectionCompletion, clampScore,
} from './_utils';
import { OverviewTab, EmptyState } from './_components';
import { FeasibilityTab } from './_FeasibilityTab';
import { ExpenseModal } from './_ExpenseModal';
import { IncomeModal } from './_IncomeModal';
import { DeleteModal } from './_DeleteModal';
import { WorkspaceStyles } from './_styles';

const PROJECT_TAB_IDS = tabs.map(tab => tab.id) as TabId[];
const PROJECT_TABS_ID = 'project-workspace';

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : String(params?.id ?? '');
  const { user, loading } = useAuth();
  const { lang, dir } = useLanguage();
  const { currency: userCurrency } = useCurrency();
  const tr = (TEXT[lang as Lang] ?? TEXT.ar) as Translation;

  // ── Core state ──────────────────────────────────────────────────────────
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [projectIncome, setProjectIncome] = useState<ProjectIncomeRow[]>([]);
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpenseRow[]>([]);
  const [savings, setSavings] = useState(0);
  const [loadingProject, setLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useUrlTabState<TabId>({
    param: 'tab',
    values: PROJECT_TAB_IDS,
    defaultValue: 'overview',
    omitDefault: true,
  });

  // ── Feasibility state ─────────────────────────────────────────────────
  const [feasibility, setFeasibility] = useState<FeasibilityForm>(() => createEmptyFeasibility());
  const [feasibilityId, setFeasibilityId] = useState<string | null>(null);
  const [feasibilityUpdatedAt, setFeasibilityUpdatedAt] = useState<string | null>(null);
  const [savingFeasibility, setSavingFeasibility] = useState(false);
  const [exportingFeasibilityPdf, setExportingFeasibilityPdf] = useState(false);
  const [notice, setNotice] = useState('');

  // ── Tab summary state ─────────────────────────────────────────────────
  const [taskSummary, setTaskSummary] = useState<ProjectTasksSummary>(emptyProjectTasksSummary);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [kpiSummary, setKpiSummary] = useState<ProjectKpiSummary>(emptyProjectKpiSummary);

  // ── Expense modal state ───────────────────────────────────────────────
  const [projectExpenseOpen, setProjectExpenseOpen] = useState(false);
  const [projectExpenseSaving, setProjectExpenseSaving] = useState(false);
  const [projectExpenseError, setProjectExpenseError] = useState('');
  const [projectExpenseForm, setProjectExpenseForm] = useState<ProjectExpenseForm>(() => emptyProjectExpenseForm(normalizeCurrencyCode(userCurrency, 'KWD')));
  const [editingProjectExpenseId, setEditingProjectExpenseId] = useState<string | null>(null);
  const [receiptReading, setReceiptReading] = useState(false);
  const [expenseAnalyzing, setExpenseAnalyzing] = useState(false);
  const [projectExpenseAiError, setProjectExpenseAiError] = useState('');
  const [projectExpenseReceiptAnalysis, setProjectExpenseReceiptAnalysis] = useState<ProjectExpenseReceiptAnalysis | null>(null);
  const [projectExpenseAiAnalysis, setProjectExpenseAiAnalysis] = useState<ProjectExpenseAiAnalysis | null>(null);

  // ── Income modal state ────────────────────────────────────────────────
  const [projectIncomeOpen, setProjectIncomeOpen] = useState(false);
  const [projectIncomeSaving, setProjectIncomeSaving] = useState(false);
  const [projectIncomeError, setProjectIncomeError] = useState('');
  const [projectIncomeForm, setProjectIncomeForm] = useState<ProjectIncomeForm>(() => emptyProjectIncomeForm(userCurrency || 'KWD'));
  const [editingProjectIncomeId, setEditingProjectIncomeId] = useState<string | null>(null);

  // ── Delete modal state ────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ── Derived values ────────────────────────────────────────────────────
  const money = useCallback((amount: number, currency?: string | null) =>
    formatMoney(amount, currency || 'KWD', lang as Lang), [lang]);

  const dateLabel = useCallback((value?: string | null) => {
    const date = safeDate(value);
    return date ? date.toLocaleDateString(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US') : tr.noDate;
  }, [lang, tr.noDate]);

  const projectCurrency = useMemo(() => {
    const notes = parseNotes(project?.notes);
    return String(notes.currency ?? notes.default_currency ?? userCurrency ?? 'KWD');
  }, [project?.notes, userCurrency]);

  // ── Feasibility sections ──────────────────────────────────────────────
  const feasibilitySections = useMemo(() => [
    { id: 'market' as const, title: tr.marketFeasibility, icon: Target, fields: [
      { id: 'marketSize', label: tr.marketSize },
      { id: 'targetCustomers', label: tr.targetCustomers },
      { id: 'problemSolved', label: tr.problemSolved },
      { id: 'competitors', label: tr.competitors },
      { id: 'competitiveAdvantage', label: tr.competitiveAdvantage },
      { id: 'pricingStrategy', label: tr.pricingStrategy },
      { id: 'acquisitionChannels', label: tr.acquisitionChannels },
    ]},
    { id: 'technical' as const, title: tr.technicalFeasibility, icon: ClipboardList, fields: [
      { id: 'requiredResources', label: tr.requiredResources },
      { id: 'requiredTechnology', label: tr.requiredTechnology },
      { id: 'operationalSetup', label: tr.operationalSetup },
      { id: 'keySuppliers', label: tr.keySuppliers },
      { id: 'teamSize', label: tr.teamSize },
      { id: 'implementationChallenges', label: tr.implementationChallenges },
    ]},
    { id: 'financial' as const, title: tr.financialFeasibility, icon: Coins, fields: [
      { id: 'requiredCapital', label: tr.requiredCapital, type: 'number' as const },
      { id: 'capex', label: tr.capex, type: 'number' as const },
      { id: 'monthlyOpex', label: tr.monthlyOpex, type: 'number' as const },
      { id: 'expectedMonthlyRevenue', label: tr.expectedMonthlyRevenue, type: 'number' as const },
      { id: 'expectedProfitMargin', label: tr.expectedProfitMargin, type: 'number' as const },
      { id: 'breakEvenPoint', label: tr.breakEvenPoint },
      { id: 'paybackPeriod', label: tr.paybackPeriod },
    ]},
    { id: 'legal' as const, title: tr.legalFeasibility, icon: FileText, fields: [
      { id: 'targetCountry', label: tr.targetCountry, type: 'select' as const },
      { id: 'licenseType', label: tr.licenseType },
      { id: 'governmentEntities', label: tr.governmentEntities },
      { id: 'legalRequirements', label: tr.legalRequirements },
      { id: 'insuranceObligations', label: tr.insuranceObligations },
      { id: 'legalNotes', label: tr.legalNotes },
    ]},
  ], [tr]);

  const fieldMap = useMemo(() => ({
    market: feasibilitySections.find(s => s.id === 'market')?.fields.map(f => f.id) ?? [],
    technical: feasibilitySections.find(s => s.id === 'technical')?.fields.map(f => f.id) ?? [],
    financial: feasibilitySections.find(s => s.id === 'financial')?.fields.map(f => f.id) ?? [],
    legal: feasibilitySections.find(s => s.id === 'legal')?.fields.map(f => f.id) ?? [],
  }), [feasibilitySections]);

  // ── Feasibility metrics ───────────────────────────────────────────────
  const feasibilityMetrics = useMemo(() => {
    const requiredCapital = toNum(feasibility.financial.requiredCapital);
    const capex = toNum(feasibility.financial.capex);
    const monthlyOpex = toNum(feasibility.financial.monthlyOpex);
    const expectedMonthlyRevenue = toNum(feasibility.financial.expectedMonthlyRevenue);
    const monthlyProfit = expectedMonthlyRevenue - monthlyOpex;
    const annualProfit = monthlyProfit * 12;
    const breakEvenMonths = capex > 0 && monthlyProfit > 0 ? capex / monthlyProfit : null;
    const roi = requiredCapital > 0 ? (annualProfit / requiredCapital) * 100 : null;
    const hasFinancialInput = [requiredCapital, capex, monthlyOpex, expectedMonthlyRevenue].some(v => v > 0);
    let score = (Object.keys(sectionWeights) as FeasibilitySection[]).reduce((sum, s) =>
      sum + sectionCompletion(feasibility[s], fieldMap[s]) * sectionWeights[s], 0);
    if (hasFinancialInput && monthlyProfit <= 0) score -= 15;
    if (breakEvenMonths !== null && breakEvenMonths > 36) score -= 10;
    if (requiredCapital <= 0) score -= 10;
    const roundedScore = clampScore(score);
    const missingSections = (Object.keys(sectionWeights) as FeasibilitySection[]).filter(s =>
      sectionCompletion(feasibility[s], fieldMap[s]) < 0.5).length;
    const status: FeasibilityStatus = roundedScore < 50 || (hasFinancialInput && monthlyProfit <= 0)
      ? 'high_risk'
      : roundedScore < 75 || (breakEvenMonths !== null && breakEvenMonths > 36)
        ? 'needs_review' : 'feasible';
    return { requiredCapital, capex, monthlyOpex, expectedMonthlyRevenue, monthlyProfit, annualProfit, breakEvenMonths, roi, hasFinancialInput, score: roundedScore, status, missingSections };
  }, [feasibility, fieldMap]);

  // ── Financial model ───────────────────────────────────────────────────
  const model = useMemo(() => {
    const notes = parseNotes(project?.notes);
    const capital = toNum(notes.capital ?? notes.capital_amount ?? project?.budget);
    const plannedIncome = toNum(notes.monthlyRevenue ?? notes.monthly_revenue ?? notes.total_income);
    const plannedExpenses = toNum(notes.monthlyExpenses ?? notes.monthly_expenses ?? notes.total_expenses);
    const actualProjectIncome = projectIncome.reduce((sum, row) => sum + toNum(row.amount), 0);
    const actualProjectExpenses = projectExpenses.reduce((sum, row) => sum + toNum(row.amount), 0);
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const monthlyProjectIncome = projectIncome.filter(r => String(r.income_date ?? r.created_at ?? '').slice(0, 7) === currentMonthKey).reduce((sum, r) => sum + toNum(r.amount), 0);
    const personalIncomeProjectIncome = projectIncome.filter(r => r.transferred_to_personal_income === true).reduce((sum, r) => sum + toNum(r.amount), 0);
    const monthlyProjectExpenses = projectExpenses.filter(r => String(r.expense_date ?? r.created_at ?? '').slice(0, 7) === currentMonthKey).reduce((sum, r) => sum + toNum(r.amount), 0);
    const personalBudgetProjectExpenses = projectExpenses.filter(r => r.paid_from_personal_budget === true).reduce((sum, r) => sum + toNum(r.amount), 0);
    const monthlyIncome = actualProjectIncome > 0 ? actualProjectIncome : plannedIncome;
    const monthlyExpenses = actualProjectExpenses > 0 ? actualProjectExpenses : plannedExpenses;
    const currentProfit = toNum(notes.currentProfit ?? notes.current_profit);
    const target = toNum(notes.target_amount ?? notes.targetAmount ?? notes.expectedProfit ?? notes.expected_profit);
    const net = monthlyIncome - monthlyExpenses + currentProfit;
    const remainingBudget = capital - monthlyExpenses;
    const progress = target > 0 ? Math.min(100, Math.max(0, (Math.max(currentProfit, monthlyIncome) / target) * 100)) : 0;
    const startDate = notes.startDate ?? notes.start_date ?? project?.created_at ?? null;
    const endDate = notes.endDate ?? notes.end_date ?? null;
    const start = safeDate(startDate);
    const end = safeDate(endDate);
    const today = new Date();
    const daysRemaining = end ? Math.ceil((end.getTime() - today.getTime()) / 86400000) : null;
    const duration = start && end ? Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000)) : null;
    const progressRecord = typeof notes.progress === 'object' && notes.progress ? notes.progress : {};
    const phase = notes.current_phase || Object.entries(progressRecord).reverse().find(([, done]) => done)?.[0] || notes.startTimeline || project?.timeline || tr.noData;
    const statusKey = normalizeStatus(notes.status);
    const typeKey = normalizeType(notes.type);
    const overdue = daysRemaining !== null && daysRemaining < 0 && statusKey !== 'completed';
    const missingFinancial = capital <= 0 && monthlyIncome <= 0 && monthlyExpenses <= 0 && target <= 0;
    const expensesOverCapital = capital > 0 && monthlyExpenses > capital;
    const savingsPressure = savings > 0 && capital > savings;
    const riskScore = [overdue, expensesOverCapital, savingsPressure, missingFinancial].filter(Boolean).length;
    const risk: RiskLevel = riskScore >= 2 ? 'high' : riskScore === 1 ? 'medium' : 'low';
    return {
      notes, capital, monthlyIncome, plannedIncome, actualProjectIncome, monthlyProjectIncome,
      personalIncomeProjectIncome, monthlyExpenses, plannedExpenses, actualProjectExpenses,
      monthlyProjectExpenses, personalBudgetProjectExpenses, currentProfit, target, net,
      remainingBudget, progress, startDate, endDate, daysRemaining, duration, phase,
      statusKey, typeKey, risk,
      priority: notes.priority || (risk === 'high' ? tr.high : risk === 'medium' ? tr.medium : tr.low),
      description: notes.idea || notes.description || notes.notes || '',
    };
  }, [project, projectExpenses, projectIncome, savings, tr.high, tr.low, tr.medium, tr.noData]);

  // ── Data loading ──────────────────────────────────────────────────────
  const loadProject = useCallback(async () => {
    if (!user || !id) return;
    setLoadingProject(true);
    const [projectRes, savingsRes, feasibilityRes, taskRes, milestoneRes, documentsRes, financialRes, projectIncomeRes, projectExpensesRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).eq('id', id).maybeSingle(),
      supabase.from('savings_items').select('amount').eq('user_id', user.id),
      supabase.from('project_feasibility_studies').select('*').eq('user_id', user.id).eq('project_id', id).maybeSingle(),
      supabase.from('project_tasks').select('*').eq('user_id', user.id).eq('project_id', id),
      supabase.from('project_milestones').select('*').eq('user_id', user.id).eq('project_id', id),
      supabase.from('project_documents').select('id,category,source_url,document_type,uploaded_at,created_at,updated_at').eq('user_id', user.id).eq('project_id', id),
      supabase.from('project_financial_models').select('*').eq('user_id', user.id).eq('project_id', id).maybeSingle(),
      supabase.from('project_income').select('*').eq('user_id', user.id).eq('project_id', id).order('income_date', { ascending: false }),
      supabase.from('project_expenses').select('*').eq('user_id', user.id).eq('project_id', id).order('expense_date', { ascending: false }),
    ]);
    const loadedProject = projectRes.error ? null : (projectRes.data as ProjectRow | null);
    const loadedTasks = taskRes.error ? [] : (taskRes.data ?? []) as ProjectTaskRow[];
    const loadedMilestones = milestoneRes.error ? [] : (milestoneRes.data ?? []) as ProjectMilestoneRow[];
    const loadedDocumentsCount = documentsRes.error ? 0 : uniqueProjectDocumentCount(documentsRes.data ?? []);
    const loadedFeasibility = !feasibilityRes.error && feasibilityRes.data ? feasibilityRes.data as FeasibilityStudyRow : null;
    const loadedProjectIncome = projectIncomeRes.error ? [] : (projectIncomeRes.data ?? []) as ProjectIncomeRow[];
    const loadedProjectExpenses = projectExpensesRes.error ? [] : ((projectExpensesRes.data ?? []) as ProjectExpenseRow[]).map(normalizeProjectExpenseRow);
    setProject(loadedProject);
    setProjectIncome(loadedProjectIncome);
    setProjectExpenses(loadedProjectExpenses);
    if (!savingsRes.error) {
      setSavings(((savingsRes.data ?? []) as SavingsRow[]).reduce((sum, r) => sum + toNum(r.amount), 0));
    }
    if (loadedFeasibility) {
      setFeasibilityId(loadedFeasibility.id);
      setFeasibilityUpdatedAt(loadedFeasibility.updated_at ?? loadedFeasibility.created_at ?? null);
      setFeasibility(normalizeFeasibilityRow(loadedFeasibility, loadedProject));
    } else {
      setFeasibilityId(null);
      setFeasibilityUpdatedAt(null);
      setFeasibility(normalizeFeasibilityRow(null, loadedProject));
    }
    setTaskSummary(buildProjectTasksSummary(loadedTasks, loadedMilestones));
    setDocumentsCount(loadedDocumentsCount);
    setKpiSummary(buildProjectKpiSummary({
      project: loadedProject, financialModel: financialRes.error ? null : financialRes.data,
      feasibilityStudy: loadedFeasibility, tasks: loadedTasks, milestones: loadedMilestones,
      documentsCount: loadedDocumentsCount,
      actualIncome: loadedProjectIncome.reduce((sum, r) => sum + toNum(r.amount), 0),
      actualExpenses: loadedProjectExpenses.reduce((sum, r) => sum + toNum(r.amount), 0),
    }));
    setLoadingProject(false);
  }, [id, user]);

  useEffect(() => {
    if (!loading && user) loadProject();
    if (!loading && !user) setLoadingProject(false);
  }, [loadProject, loading, user]);

  // ── Keyboard Escape ───────────────────────────────────────────────────
  useEffect(() => {
    if (!projectExpenseOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setProjectExpenseOpen(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [projectExpenseOpen]);
  useEffect(() => {
    if (!projectIncomeOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setProjectIncomeOpen(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [projectIncomeOpen]);
  useEffect(() => {
    if (!deleteTarget) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setDeleteTarget(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [deleteTarget]);

  // ── Feasibility handlers ──────────────────────────────────────────────
  const updateFeasibility = (section: FeasibilitySection, field: string, value: string) => {
    setNotice('');
    setFeasibility(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const saveFeasibility = async () => {
    if (!user || !project) return;
    setSavingFeasibility(true);
    setNotice('');
    const savedAt = new Date().toISOString();
    const payload = {
      id: feasibilityId ?? undefined, user_id: user.id, project_id: project.id,
      market_data: feasibility.market, technical_data: feasibility.technical,
      financial_data: feasibility.financial, legal_data: feasibility.legal,
      feasibility_score: feasibilityMetrics.score, feasibility_status: feasibilityMetrics.status,
      updated_at: savedAt,
    };
    const { data, error } = await supabase.from('project_feasibility_studies')
      .upsert(payload, { onConflict: 'user_id,project_id' }).select('id, updated_at').single();
    setSavingFeasibility(false);
    if (error) { setNotice(tr.feasibilitySaveError); return; }
    setFeasibilityId(data?.id ?? feasibilityId);
    setFeasibilityUpdatedAt(data?.updated_at ?? savedAt);
    setNotice(tr.feasibilitySaved);
  };

  const exportFeasibilityPdf = async () => {
    if (!project || !feasibilityId) { setNotice(tr.saveFeasibilityBeforeExport); return; }
    setExportingFeasibilityPdf(true);
    setNotice('');
    try {
      const row = buildFeasibilityStudyExportRow({
        projectName: projectTitle, currency: projectCurrency,
        financialData: feasibility.financial,
        feasibilityScore: feasibilityMetrics.score, feasibilityStatus: feasibilityMetrics.status,
        reportDate: feasibilityUpdatedAt,
      }, lang as Lang);
      printFeasibilityStudyToPdf({ title: tr.exportFeasibilityPdf, rows: [row], lang: lang as Lang, dir: dir as 'rtl' | 'ltr' });
      setNotice(tr.feasibilityPdfExported);
    } catch (err) {
      console.error('Feasibility PDF export failed', err);
      setNotice(tr.feasibilityPdfExportError);
    } finally { setExportingFeasibilityPdf(false); }
  };

  // ── Expense handlers ──────────────────────────────────────────────────
  const resetProjectExpenseAiState = () => {
    setProjectExpenseAiError(''); setProjectExpenseReceiptAnalysis(null);
    setProjectExpenseAiAnalysis(null); setReceiptReading(false); setExpenseAnalyzing(false);
  };

  const openProjectExpenseModal = () => {
    setProjectExpenseError(''); resetProjectExpenseAiState();
    setEditingProjectExpenseId(null);
    setProjectExpenseForm(emptyProjectExpenseForm(normalizeCurrencyCode(projectCurrency, 'KWD')));
    setProjectExpenseOpen(true);
  };

  const openEditProjectExpenseModal = (expense: ProjectExpenseRow) => {
    setProjectExpenseError(''); resetProjectExpenseAiState();
    setEditingProjectExpenseId(expense.id);
    setProjectExpenseAiAnalysis(expense.ai_analysis ?? null);
    setProjectExpenseForm({
      title: expense.title ?? '', amount: String(expense.amount ?? ''),
      currency: normalizeCurrencyCode(expense.currency, 'KWD'),
      expenseDate: String(expense.expense_date ?? '').slice(0, 10) || todayInputValue(),
      category: expense.category || 'general', paymentMethod: expense.payment_method || '',
      notes: expense.notes || '', receiptFile: null,
      paidFromPersonalBudget: expense.paid_from_personal_budget === true,
    });
    setProjectExpenseOpen(true);
  };

  const applyReceiptAnalysisToExpenseForm = (analysis: ProjectExpenseReceiptAnalysis) => {
    const { extracted } = analysis;
    setProjectExpenseForm(prev => ({
      ...prev,
      title: (extracted.title ?? '') || (extracted.vendorName ?? '') || prev.title,
      amount: extracted.amount && extracted.amount > 0 ? String(extracted.amount) : prev.amount,
      currency: normalizeCurrencyCode(extracted.currency, prev.currency || projectCurrency || 'KWD'),
      expenseDate: (extracted.invoiceDate ?? '') || prev.expenseDate,
      category: (extracted.category ?? '') || prev.category,
      notes: (extracted.notes ?? '') || prev.notes,
    }));
  };

  const readProjectExpenseReceipt = async () => {
    if (!projectExpenseForm.receiptFile) { setProjectExpenseAiError(tr.receiptReadError); return; }
    setReceiptReading(true); setProjectExpenseAiError(''); setProjectExpenseReceiptAnalysis(null);
    try {
      const formData = new FormData();
      formData.append('file', projectExpenseForm.receiptFile);
      formData.append('defaultCurrency', normalizeCurrencyCode(projectExpenseForm.currency, projectCurrency || 'KWD'));
      const res = await fetch('/api/invoices/analyze', { method: 'POST', body: formData });
      const payload = await res.json().catch(() => null) as any;
      if (!res.ok || !payload?.ok) { setProjectExpenseAiError(payload?.message || tr.receiptReadError); return; }
      const analysis: ProjectExpenseReceiptAnalysis = {
        extracted: {
          title: payload.extracted?.title ?? payload.extracted?.vendorName ?? null,
          vendorName: payload.extracted?.vendorName ?? null,
          amount: typeof payload.extracted?.amount === 'number' ? payload.extracted.amount : null,
          currency: payload.extracted?.currency ?? null,
          invoiceDate: payload.extracted?.invoiceDate ?? null,
          category: payload.analysis?.suggestedCategory ?? payload.extracted?.category ?? null,
          notes: payload.extracted?.notes ?? null,
        },
        confidence: payload.confidence ?? {},
        warnings: Array.isArray(payload.analysis?.warnings) ? payload.analysis.warnings : [],
        summary: payload.analysis?.summary ?? null,
      };
      setProjectExpenseReceiptAnalysis(analysis);
      applyReceiptAnalysisToExpenseForm(analysis);
      setNotice(tr.receiptReadSuccess);
    } catch (err) {
      console.error('Receipt analysis failed', { message: err instanceof Error ? err.message : 'unknown' });
      setProjectExpenseAiError(tr.receiptReadError);
    } finally { setReceiptReading(false); }
  };

  const analyzeProjectExpense = async () => {
    if (!user || !project) return;
    const amount = toNum(projectExpenseForm.amount);
    if (amount <= 0) { setProjectExpenseAiError(tr.requiredExpenseAmount); return; }
    setExpenseAnalyzing(true); setProjectExpenseAiError('');
    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      if (!token) { setProjectExpenseAiError(tr.aiExpenseAnalysisError); return; }
      const res = await fetch(`/api/projects/${project.id}/expense-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          lang,
          expense: {
            title: projectExpenseForm.title.trim(), amount,
            currency: normalizeCurrencyCode(projectExpenseForm.currency, projectCurrency || 'KWD'),
            date: projectExpenseForm.expenseDate || todayInputValue(),
            category: projectExpenseForm.category || 'general',
            paymentMethod: projectExpenseForm.paymentMethod || null,
            notes: projectExpenseForm.notes.trim() || null,
            hasReceipt: Boolean(projectExpenseForm.receiptFile || projectExpenseReceiptAnalysis),
            expenseId: editingProjectExpenseId,
          },
        }),
      });
      const payload = await res.json().catch(() => null) as any;
      if (!res.ok || !payload?.ok) { setProjectExpenseAiError(payload?.message || tr.aiExpenseAnalysisError); return; }
      setProjectExpenseAiAnalysis(payload.analysis as ProjectExpenseAiAnalysis);
    } catch (err) {
      console.error('Expense analysis failed', { message: err instanceof Error ? err.message : 'unknown' });
      setProjectExpenseAiError(tr.aiExpenseAnalysisError);
    } finally { setExpenseAnalyzing(false); }
  };

  const uploadProjectExpenseReceipt = async (file: File, expenseId: string) => {
    if (!user || !file) return null;
    const safeName = file.name.replace(/[^\w.-]+/g, '-');
    const path = `${user.id}/project-expenses/${expenseId}-${safeName}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
    if (error) return null;
    return supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl;
  };

  const saveProjectExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !project) return;
    const title = projectExpenseForm.title.trim();
    const amount = toNum(projectExpenseForm.amount);
    if (!title) { setProjectExpenseError(tr.requiredExpenseName); return; }
    if (amount <= 0) { setProjectExpenseError(tr.requiredExpenseAmount); return; }
    setProjectExpenseSaving(true); setProjectExpenseError('');
    const existingExpense = editingProjectExpenseId ? projectExpenses.find(r => r.id === editingProjectExpenseId) ?? null : null;
    const shouldRemoveLinkedPersonal = Boolean(existingExpense?.personal_expense_id && !projectExpenseForm.paidFromPersonalBudget);
    if (shouldRemoveLinkedPersonal && !window.confirm(tr.updateLinkedPersonalExpenseConfirm)) { setProjectExpenseSaving(false); return; }
    const expenseId = editingProjectExpenseId ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    const receiptUrl = projectExpenseForm.receiptFile ? await uploadProjectExpenseReceipt(projectExpenseForm.receiptFile, expenseId) : null;
    const payload = {
      id: expenseId, user_id: user.id, project_id: project.id, title, amount,
      currency: normalizeCurrencyCode(projectExpenseForm.currency, 'KWD'),
      expense_date: projectExpenseForm.expenseDate || todayInputValue(),
      category: projectExpenseForm.category || 'general',
      payment_method: projectExpenseForm.paymentMethod || null,
      notes: projectExpenseForm.notes.trim() || null,
      receipt_url: receiptUrl ?? existingExpense?.receipt_url ?? null,
      ai_analysis: projectExpenseAiAnalysis ?? existingExpense?.ai_analysis ?? null,
      paid_from_personal_budget: projectExpenseForm.paidFromPersonalBudget,
      personal_expense_id: shouldRemoveLinkedPersonal ? null : existingExpense?.personal_expense_id ?? null,
      updated_at: new Date().toISOString(),
    };
    const q = supabase.from('project_expenses');
    const { data, error } = editingProjectExpenseId
      ? await q.update(payload).eq('id', editingProjectExpenseId).eq('user_id', user.id).select('*').single()
      : await q.insert(payload).select('*').single();
    if (error) { setProjectExpenseSaving(false); setProjectExpenseError(tr.projectExpenseSaveError); return; }
    let created = normalizeProjectExpenseRow(data as ProjectExpenseRow);
    if (projectExpenseForm.paidFromPersonalBudget) {
      const pp = {
        user_id: user.id, name: `${tr.projectExpense}: ${title}`, amount,
        currency: payload.currency, category: 'project_expense', date: payload.expense_date,
        payment_method: payload.payment_method, notes: payload.notes, receipt_image_url: receiptUrl,
        project_id: project.id, project_expense_id: created.id, paid_from_personal_budget: true,
        enhanced: { source: 'project_expense', project_id: project.id, project_expense_id: created.id, project_name: project.name ?? '', paid_from_personal_budget: true, ai_analysis: projectExpenseAiAnalysis ?? existingExpense?.ai_analysis ?? null },
        updated_at: new Date().toISOString(),
      };
      const pr = created.personal_expense_id
        ? await supabase.from('expense_items').update(pp).eq('id', created.personal_expense_id).eq('user_id', user.id).select('id').single()
        : await supabase.from('expense_items').insert(pp).select('id').single();
      if (!pr.error && pr.data?.id) {
        await supabase.from('project_expenses').update({ personal_expense_id: pr.data.id }).eq('id', created.id).eq('user_id', user.id);
        created = { ...created, personal_expense_id: pr.data.id };
      }
    } else if (shouldRemoveLinkedPersonal && existingExpense?.personal_expense_id) {
      await supabase.from('expense_items').delete().eq('id', existingExpense.personal_expense_id).eq('user_id', user.id);
      created = { ...created, personal_expense_id: null };
    }
    setProjectExpenses(prev => editingProjectExpenseId ? prev.map(r => r.id === editingProjectExpenseId ? created : r) : [created, ...prev]);
    setNotice(editingProjectExpenseId ? tr.projectExpenseUpdated : tr.projectExpenseSaved);
    setProjectExpenseSaving(false); setProjectExpenseOpen(false);
    setEditingProjectExpenseId(null); resetProjectExpenseAiState();
    setProjectExpenseForm(emptyProjectExpenseForm(normalizeCurrencyCode(projectCurrency, 'KWD')));
  };

  // ── Income handlers ───────────────────────────────────────────────────
  const openProjectIncomeModal = () => {
    setProjectIncomeError(''); setEditingProjectIncomeId(null);
    setProjectIncomeForm(emptyProjectIncomeForm(projectCurrency));
    setProjectIncomeOpen(true);
  };

  const openEditProjectIncomeModal = (income: ProjectIncomeRow) => {
    setProjectIncomeError(''); setEditingProjectIncomeId(income.id);
    setProjectIncomeForm({
      title: income.title ?? '', amount: String(income.amount ?? ''),
      currency: income.currency || projectCurrency,
      incomeDate: String(income.income_date ?? '').slice(0, 10) || todayInputValue(),
      category: income.category || 'general', source: income.source || '',
      description: income.description || '', notes: income.notes || '',
      transferredToPersonalIncome: income.transferred_to_personal_income === true,
    });
    setProjectIncomeOpen(true);
  };

  const saveProjectIncome = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !project) return;
    const title = projectIncomeForm.title.trim();
    const amount = toNum(projectIncomeForm.amount);
    if (!title) { setProjectIncomeError(tr.requiredIncomeName); return; }
    if (amount <= 0) { setProjectIncomeError(tr.requiredIncomeAmount); return; }
    setProjectIncomeSaving(true); setProjectIncomeError('');
    const existingIncome = editingProjectIncomeId ? projectIncome.find(r => r.id === editingProjectIncomeId) ?? null : null;
    const shouldRemoveLinkedPersonal = Boolean(existingIncome?.personal_income_id && !projectIncomeForm.transferredToPersonalIncome);
    if (shouldRemoveLinkedPersonal && !window.confirm(tr.updateLinkedPersonalIncomeConfirm)) { setProjectIncomeSaving(false); return; }
    const incomeId = editingProjectIncomeId ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    const now = new Date().toISOString();
    const payload = {
      id: incomeId, user_id: user.id, project_id: project.id, title, amount,
      currency: projectIncomeForm.currency || projectCurrency,
      income_date: projectIncomeForm.incomeDate || todayInputValue(),
      category: projectIncomeForm.category || 'general',
      source: projectIncomeForm.source.trim() || null,
      description: projectIncomeForm.description.trim() || null,
      notes: projectIncomeForm.notes.trim() || null,
      transferred_to_personal_income: projectIncomeForm.transferredToPersonalIncome,
      personal_income_id: shouldRemoveLinkedPersonal ? null : existingIncome?.personal_income_id ?? null,
      updated_at: now,
    };
    const qi = supabase.from('project_income');
    const { data, error } = editingProjectIncomeId
      ? await qi.update(payload).eq('id', editingProjectIncomeId).eq('user_id', user.id).select('*').single()
      : await qi.insert(payload).select('*').single();
    if (error) { setProjectIncomeSaving(false); setProjectIncomeError(tr.projectIncomeSaveError); return; }
    let created = data as ProjectIncomeRow;
    if (projectIncomeForm.transferredToPersonalIncome) {
      const pp = {
        user_id: user.id, label: `${tr.projectIncome}: ${title}`, category: 'project_income',
        amount, amount_kwd: payload.currency === 'KWD' ? amount : null, exchange_rate: null,
        income_type: 'other', status: 'received', received_date: payload.income_date,
        currency: payload.currency, source_name: payload.source || project.name || tr.projectIncome,
        notes: payload.notes, is_recurring: false, frequency: null,
        recurrence_start_date: null, recurrence_end_date: null, parent_recurring_income_id: null,
        generated_for_date: null, confirmed_at: now, project_id: project.id,
        project_income_id: created.id, transferred_to_personal_income: true, updated_at: now,
      };
      const pr = created.personal_income_id
        ? await supabase.from('monthly_income_sources').update(pp).eq('id', created.personal_income_id).eq('user_id', user.id).select('id').single()
        : await supabase.from('monthly_income_sources').insert(pp).select('id').single();
      if (!pr.error && pr.data?.id) {
        await supabase.from('project_income').update({ personal_income_id: pr.data.id }).eq('id', created.id).eq('user_id', user.id);
        created = { ...created, personal_income_id: pr.data.id };
      }
    } else if (shouldRemoveLinkedPersonal && existingIncome?.personal_income_id) {
      await supabase.from('monthly_income_sources').delete().eq('id', existingIncome.personal_income_id).eq('user_id', user.id);
      created = { ...created, personal_income_id: null };
    }
    setProjectIncome(prev => editingProjectIncomeId ? prev.map(r => r.id === editingProjectIncomeId ? created : r) : [created, ...prev]);
    setNotice(editingProjectIncomeId ? tr.projectIncomeUpdated : tr.projectIncomeSaved);
    setProjectIncomeSaving(false); setProjectIncomeOpen(false);
    setEditingProjectIncomeId(null);
    setProjectIncomeForm(emptyProjectIncomeForm(projectCurrency));
  };

  // ── Delete handlers ───────────────────────────────────────────────────
  const requestDeleteProjectIncome = (row: ProjectIncomeRow) => { setDeleteError(''); setDeleteTarget({ type: 'income', row }); };
  const requestDeleteProjectExpense = (row: ProjectExpenseRow) => { setDeleteError(''); setDeleteTarget({ type: 'expense', row }); };

  const confirmDeleteTransaction = async (deleteLinkedPersonal: boolean) => {
    if (!user || !deleteTarget) return;
    setDeleteSaving(true); setDeleteError('');
    if (deleteTarget.type === 'income') {
      const row = deleteTarget.row;
      if (deleteLinkedPersonal && row.personal_income_id) {
        await supabase.from('monthly_income_sources').delete().eq('id', row.personal_income_id).eq('user_id', user.id);
      }
      const { error } = await supabase.from('project_income').delete().eq('id', row.id).eq('user_id', user.id);
      setDeleteSaving(false);
      if (error) { setDeleteError(tr.projectIncomeDeleteError); return; }
      setProjectIncome(prev => prev.filter(i => i.id !== row.id));
      setNotice(tr.projectIncomeDeleted); setDeleteTarget(null);
      return;
    }
    const row = deleteTarget.row;
    if (deleteLinkedPersonal && row.personal_expense_id) {
      await supabase.from('expense_items').delete().eq('id', row.personal_expense_id).eq('user_id', user.id);
    }
    const { error } = await supabase.from('project_expenses').delete().eq('id', row.id).eq('user_id', user.id);
    setDeleteSaving(false);
    if (error) { setDeleteError(tr.projectExpenseDeleteError); return; }
    setProjectExpenses(prev => prev.filter(i => i.id !== row.id));
    setNotice(tr.projectExpenseDeleted); setDeleteTarget(null);
  };

  // ── Label helpers ─────────────────────────────────────────────────────
  const tabLabel = (tab: TabId) => tab === 'financial' ? tr.financial : tr[tab as keyof Translation] as string;
  const statusLabel = (s: FeasibilityStatus) => s === 'feasible' ? tr.feasible : s === 'high_risk' ? tr.highRisk : tr.needsReview;
  const numericLabel = (value: number | null, suffix = '') => {
    if (value === null || !Number.isFinite(value)) return tr.noData;
    return `${new Intl.NumberFormat(lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }).format(value)}${suffix}`;
  };
  const moneyOrNoData = (v: number) => (v > 0 || v < 0 ? money(v, projectCurrency) : tr.noData);

  const projectTitle = project?.name || tr.projectName;
  const statusProjectLabel = tr[model.statusKey as keyof Translation] as string;
  const typeLabel = tr[model.typeKey as keyof Translation] as string;
  const riskText = tr[riskCopyKey(model.risk) as keyof Translation] as string;
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const heroMetrics = [
    { label: tr.projectType, value: typeLabel },
    { label: tr.status, value: statusProjectLabel },
    { label: tr.capital, value: money(model.capital, projectCurrency) },
    { label: tr.financialTarget, value: model.target > 0 ? money(model.target, projectCurrency) : tr.noData },
    { label: tr.startDate, value: dateLabel(model.startDate) },
    { label: tr.endDate, value: dateLabel(model.endDate) },
  ];

  // ── Early-return states ───────────────────────────────────────────────
  if (loading || loadingProject) {
    return (
      <div className="project-workspace" dir={dir}>
        <DashboardPageShell contentClassName="workspace-content">
          <div className="state-card">{tr.workspace}</div>
        </DashboardPageShell>
        <WorkspaceStyles />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="project-workspace" dir={dir}>
        <DashboardPageShell contentClassName="workspace-content">
          <EmptyState title={tr.signIn} button={tr.back} onClick={() => router.push('/projects')} />
        </DashboardPageShell>
        <WorkspaceStyles />
      </div>
    );
  }
  if (!project) {
    return (
      <div className="project-workspace" dir={dir}>
        <DashboardPageShell contentClassName="workspace-content">
          <EmptyState title={tr.notFound} button={tr.back} onClick={() => router.push('/projects')} />
        </DashboardPageShell>
        <WorkspaceStyles />
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <div className="project-workspace" dir={dir}>
      <DashboardPageShell contentClassName="workspace-content">
        <section className="workspace-hero">
          <div className="hero-copy">
            <Link href="/projects" className="back-link" aria-label={tr.back}>
              <BackIcon size={17} aria-hidden="true" /> {tr.back}
            </Link>
            <span>{tr.workspace}</span>
            <h1>{project.emoji || '🚀'} {projectTitle}</h1>
            <p>{model.description || tr.projectSummary}</p>
          </div>
          <div className="hero-actions">
            <button className="hero-action-btn primary" type="button" onClick={() => router.push('/projects')}><Pencil size={16} /> {tr.editProject}</button>
            <button className="hero-action-btn" type="button" onClick={openProjectExpenseModal}><Plus size={16} /> {tr.addExpense}</button>
            <button className="hero-action-btn" type="button" onClick={openProjectIncomeModal}><Plus size={16} /> {tr.addIncome}</button>
            <button className="hero-action-btn" type="button" onClick={() => setActiveTab('ai')}><Bot size={16} /> {tr.analyzeProject}</button>
            <button className="hero-action-btn" type="button" onClick={() => router.push(`/business-hub?project=${project.id}#jurisdiction-wizard-module`)}>
              <Globe2 size={16} /> {tr.chooseJurisdiction}
            </button>
          </div>
          <div className="hero-metrics">
            {heroMetrics.map(item => (
              <div key={item.label}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <PageTabs
          tabs={tabs.map(tab => ({ id: tab.id, label: tabLabel(tab.id) }))}
          active={activeTab}
          onChange={id => setActiveTab(id as TabId)}
          ariaLabel={tr.workspace}
          idBase={PROJECT_TABS_ID}
          sticky
          mobileMode="auto"
        />

        <PageTabPanel idBase={PROJECT_TABS_ID} value={activeTab} active>
        {activeTab === 'overview' ? (
          <OverviewTab
            tr={tr} projectTitle={projectTitle} model={model} typeLabel={typeLabel}
            statusLabel={statusProjectLabel} riskText={riskText} taskSummary={taskSummary}
            documentsCount={documentsCount} kpiSummary={kpiSummary}
            projectIncome={projectIncome} projectExpenses={projectExpenses}
            openProjectIncomeModal={openProjectIncomeModal}
            openProjectExpenseModal={openProjectExpenseModal}
            onEditProjectIncome={openEditProjectIncomeModal}
            onEditProjectExpense={openEditProjectExpenseModal}
            onDeleteProjectIncome={requestDeleteProjectIncome}
            onDeleteProjectExpense={requestDeleteProjectExpense}
            money={money} projectCurrency={projectCurrency} dateLabel={dateLabel}
            setActiveTab={setActiveTab} routerPush={router.push}
          />
        ) : activeTab === 'feasibility' ? (
          <FeasibilityTab
            tr={tr} feasibilityMetrics={feasibilityMetrics}
            feasibilitySections={feasibilitySections} fieldMap={fieldMap}
            feasibility={feasibility} notice={notice} money={money}
            projectCurrency={projectCurrency} updateFeasibility={updateFeasibility}
            saveFeasibility={saveFeasibility} exportFeasibilityPdf={exportFeasibilityPdf}
            savingFeasibility={savingFeasibility} exportingFeasibilityPdf={exportingFeasibilityPdf}
            numericLabel={numericLabel} statusLabel={statusLabel} moneyOrNoData={moneyOrNoData}
          />
        ) : activeTab === 'financial' ? (
          <ProjectFinancialModelTab userId={user.id} projectId={project.id}
            initialCapital={model.capital} defaultCurrency={projectCurrency}
            actualIncome={model.actualProjectIncome} actualExpenses={model.actualProjectExpenses} lang={lang} />
        ) : activeTab === 'tasks' ? (
          <ProjectTasksTab userId={user.id} projectId={project.id}
            currency={projectCurrency} lang={lang} onSummaryChange={setTaskSummary} />
        ) : activeTab === 'documents' ? (
          <ProjectDocumentsTab userId={user.id} projectId={project.id}
            lang={lang} onDocumentsCountChange={setDocumentsCount} />
        ) : activeTab === 'kpis' ? (
          <ProjectKpisTab userId={user.id} projectId={project.id} project={project}
            currency={projectCurrency} lang={lang} onSummaryChange={setKpiSummary} />
        ) : activeTab === 'ai' ? (
          <ProjectAiAdvisorTab projectId={project.id} lang={lang as Lang}
            onNavigateTab={tab => setActiveTab(tab)} />
        ) : activeTab === 'pitchDeck' ? (
          <ProjectPitchDeckTab projectId={project.id} lang={lang as Lang}
            onNavigateTab={tab => setActiveTab(tab)} />
        ) : (
          <section className="placeholder-grid">
            {tabs.filter(t => t.id === activeTab).map(tab => {
              const Icon = tab.icon;
              const hint = tab.hintKey ? tr[tab.hintKey as keyof Translation] as string : tr.comingSoon;
              return (
                <article className="warm-card placeholder-card" key={tab.id}>
                  <Icon size={34} />
                  <h2>{tabLabel(tab.id)}</h2>
                  <p>{hint}</p>
                  <span>{tr.comingSoon}</span>
                </article>
              );
            })}
          </section>
        )}
        </PageTabPanel>
      </DashboardPageShell>

      {projectExpenseOpen ? (
        <ExpenseModal
          open={projectExpenseOpen} onClose={() => setProjectExpenseOpen(false)}
          tr={tr} lang={lang as Lang} projectCurrency={projectCurrency}
          editingProjectExpenseId={editingProjectExpenseId}
          projectExpenseSaving={projectExpenseSaving} projectExpenseError={projectExpenseError}
          projectExpenseForm={projectExpenseForm} setProjectExpenseForm={setProjectExpenseForm}
          receiptReading={receiptReading} expenseAnalyzing={expenseAnalyzing}
          projectExpenseAiError={projectExpenseAiError}
          projectExpenseReceiptAnalysis={projectExpenseReceiptAnalysis}
          projectExpenseAiAnalysis={projectExpenseAiAnalysis}
          setProjectExpenseReceiptAnalysis={setProjectExpenseReceiptAnalysis}
          setProjectExpenseAiError={setProjectExpenseAiError}
          readProjectExpenseReceipt={readProjectExpenseReceipt}
          analyzeProjectExpense={analyzeProjectExpense}
          applyReceiptAnalysisToExpenseForm={applyReceiptAnalysisToExpenseForm}
          saveProjectExpense={saveProjectExpense}
        />
      ) : null}

      {projectIncomeOpen ? (
        <IncomeModal
          open={projectIncomeOpen} onClose={() => setProjectIncomeOpen(false)}
          tr={tr} lang={lang as Lang} projectCurrency={projectCurrency}
          editingProjectIncomeId={editingProjectIncomeId}
          projectIncomeSaving={projectIncomeSaving} projectIncomeError={projectIncomeError}
          projectIncomeForm={projectIncomeForm} setProjectIncomeForm={setProjectIncomeForm}
          saveProjectIncome={saveProjectIncome}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteModal
          deleteTarget={deleteTarget} onClose={() => setDeleteTarget(null)}
          deleteError={deleteError} deleteSaving={deleteSaving}
          confirmDeleteTransaction={confirmDeleteTransaction} tr={tr}
        />
      ) : null}

      <WorkspaceStyles />
    </div>
  );
}
