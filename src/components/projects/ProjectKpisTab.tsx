'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, AlertTriangle, BarChart3, ClipboardList, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { uniqueDocumentCount, toNum, clampPercent, safeDate, todayStart, isTaskDone, isTaskCancelled, isTaskLate, completedMilestone, taskProgress, milestoneProgress, projectDates, timelineProgress, getFinancialKpis, hasFinancialModel, feasibilityScore, actualProjectExpenseRows, buildRiskFlags, buildProjectKpiSummary, type ProjectKpiSummary, type ProjectFinancialModelKpiRow, type ProjectFeasibilityKpiRow, type ProjectKpiProject, type ActualExpenseRow, type ActualIncomeRow } from '@/lib/mobile/projectKpis';
export { buildProjectKpiSummary, emptyProjectKpiSummary, type ProjectKpiSummary, type ProjectKpiProject, type ProjectFinancialModelKpiRow, type ProjectFeasibilityKpiRow } from '@/lib/mobile/projectKpis';
import type { ProjectMilestoneRow, ProjectTaskRow } from './ProjectTasksTab';

type Lang = 'ar' | 'en' | 'fr';
const TEXT = {
  ar: {
    kpis: 'المؤشرات',
    projectHealthScore: 'درجة صحة المشروع',
    financialKpis: 'المؤشرات المالية',
    operationalKpis: 'المؤشرات التشغيلية',
    progressKpis: 'مؤشرات التقدم',
    actualVsPlanned: 'الفعلي مقابل المخطط',
    riskFlags: 'تنبيهات المخاطر',
    planningDisclaimer: 'هذا مؤشر تخطيطي داخلي وليس ضماناً لنجاح المشروع.',
    strong: 'قوي',
    good: 'جيد',
    needs_review: 'يحتاج مراجعة',
    high_risk: 'عالي المخاطر',
    insufficient: 'بيانات غير كافية',
    na: 'غير متاح',
    addFinancialModel: 'أضف النموذج المالي لعرض المؤشرات المالية.',
    insufficientData: 'بيانات غير كافية',
    roi: 'العائد على الاستثمار ROI',
    paybackPeriod: 'فترة الاسترداد',
    breakEvenMonth: 'نقطة التعادل',
    netMargin: 'هامش الربح الصافي',
    grossMargin: 'هامش الربح الإجمالي',
    burnRate: 'معدل الحرق',
    runway: 'مدة التشغيل المتبقية',
    totalProjectedRevenue: 'إجمالي الإيرادات المتوقعة',
    totalProjectedProfit: 'إجمالي الربح المتوقع',
    taskCompletionRate: 'معدل إنجاز المهام',
    overdueTasks: 'المهام المتأخرة',
    milestonesCompleted: 'المعالم المكتملة',
    upcomingDeadlines: 'المواعيد القادمة',
    documentsCount: 'عدد المستندات',
    openIssues: 'الملاحظات المفتوحة',
    taskProgress: 'تقدم المهام',
    milestoneProgress: 'تقدم المعالم',
    timelineProgress: 'تقدم الجدول الزمني',
    actualProgress: 'التقدم الفعلي',
    behindSchedule: 'التقدم الفعلي أقل من المخطط.',
    plannedBudget: 'الميزانية المخططة',
    actualCost: 'التكلفة الفعلية',
    plannedTimeline: 'الجدول المخطط',
    projectedRevenue: 'الإيرادات المتوقعة',
    actualIncome: 'الدخل الفعلي',
    projectedCosts: 'التكاليف المتوقعة',
    actualExpenses: 'المصاريف الفعلية',
    actualVsPlannedHint: 'اربط مصاريف ودخل المشروع لعرض مقارنة الفعلي بالمخطط.',
    financial_model_missing: 'النموذج المالي غير مكتمل',
    feasibility_incomplete: 'دراسة الجدوى غير مكتملة',
    overdue_tasks: 'يوجد مهام متأخرة',
    no_documents: 'لا توجد مستندات',
    project_end_passed: 'تاريخ نهاية المشروع تجاوز اليوم',
    expenses_exceed_budget: 'المصاريف تجاوزت الميزانية',
    negative_cash: 'التدفق النقدي المتوقع سلبي',
    payback_too_long: 'فترة الاسترداد طويلة',
    behind_schedule: 'التقدم الفعلي أقل من المخطط',
    noRiskFlags: 'لا توجد تنبيهات مخاطر حالياً.',
    healthFormula: 'الصحة = اكتمال النموذج المالي + الربح المتوقع + تقدم المهام + عدم وجود تأخير + درجة الجدوى + المستندات.',
  },
  en: {
    kpis: 'KPIs',
    projectHealthScore: 'Project Health Score',
    financialKpis: 'Financial KPIs',
    operationalKpis: 'Operational KPIs',
    progressKpis: 'Progress KPIs',
    actualVsPlanned: 'Actual vs Planned',
    riskFlags: 'Risk Flags',
    planningDisclaimer: 'This is a planning indicator, not a guarantee of business success.',
    strong: 'Strong',
    good: 'Good',
    needs_review: 'Needs Review',
    high_risk: 'High Risk',
    insufficient: 'Insufficient data',
    na: 'N/A',
    addFinancialModel: 'Add a financial model to view financial KPIs.',
    insufficientData: 'Insufficient data',
    roi: 'ROI',
    paybackPeriod: 'Payback Period',
    breakEvenMonth: 'Break-even Month',
    netMargin: 'Net Margin',
    grossMargin: 'Gross Margin',
    burnRate: 'Burn Rate',
    runway: 'Runway',
    totalProjectedRevenue: 'Total Projected Revenue',
    totalProjectedProfit: 'Total Projected Profit',
    taskCompletionRate: 'Task completion rate',
    overdueTasks: 'Overdue tasks',
    milestonesCompleted: 'Milestones completed',
    upcomingDeadlines: 'Upcoming deadlines',
    documentsCount: 'Documents count',
    openIssues: 'Open issues',
    taskProgress: 'Task progress',
    milestoneProgress: 'Milestone progress',
    timelineProgress: 'Timeline progress',
    actualProgress: 'Actual progress',
    behindSchedule: 'Actual progress is behind schedule.',
    plannedBudget: 'Planned budget',
    actualCost: 'Actual cost',
    plannedTimeline: 'Planned timeline',
    projectedRevenue: 'Projected revenue',
    actualIncome: 'Actual income',
    projectedCosts: 'Projected costs',
    actualExpenses: 'Actual expenses',
    actualVsPlannedHint: 'Link project income and expenses to view actual vs planned comparison.',
    financial_model_missing: 'Financial model missing',
    feasibility_incomplete: 'Feasibility study incomplete',
    overdue_tasks: 'Overdue tasks',
    no_documents: 'No documents uploaded',
    project_end_passed: 'Project end date passed',
    expenses_exceed_budget: 'Expenses exceed budget',
    negative_cash: 'Negative projected cash balance',
    payback_too_long: 'Payback period too long',
    behind_schedule: 'Actual progress is behind schedule',
    noRiskFlags: 'No current risk flags.',
    healthFormula: 'Health = financial model completeness + projected profit + task progress + no overdue tasks + feasibility score + documents.',
  },
  fr: {
    kpis: 'KPI',
    projectHealthScore: 'Score de santé du projet',
    financialKpis: 'KPI financiers',
    operationalKpis: 'KPI opérationnels',
    progressKpis: 'KPI de progression',
    actualVsPlanned: 'Réel vs prévu',
    riskFlags: 'Alertes de risque',
    planningDisclaimer: 'Il s’agit d’un indicateur de planification, pas d’une garantie de réussite.',
    strong: 'Fort',
    good: 'Bon',
    needs_review: 'À réviser',
    high_risk: 'Risque élevé',
    insufficient: 'Données insuffisantes',
    na: 'N/A',
    addFinancialModel: 'Ajoutez un modèle financier pour afficher les KPI financiers.',
    insufficientData: 'Données insuffisantes',
    roi: 'ROI',
    paybackPeriod: 'Période de récupération',
    breakEvenMonth: 'Mois du point mort',
    netMargin: 'Marge nette',
    grossMargin: 'Marge brute',
    burnRate: 'Taux de consommation',
    runway: 'Autonomie',
    totalProjectedRevenue: 'Revenus projetés totaux',
    totalProjectedProfit: 'Bénéfice projeté total',
    taskCompletionRate: 'Taux d’achèvement des tâches',
    overdueTasks: 'Tâches en retard',
    milestonesCompleted: 'Jalons terminés',
    upcomingDeadlines: 'Échéances à venir',
    documentsCount: 'Nombre de documents',
    openIssues: 'Points ouverts',
    taskProgress: 'Progression des tâches',
    milestoneProgress: 'Progression des jalons',
    timelineProgress: 'Progression du calendrier',
    actualProgress: 'Progression réelle',
    behindSchedule: 'La progression réelle est en retard sur le planning.',
    plannedBudget: 'Budget prévu',
    actualCost: 'Coût réel',
    plannedTimeline: 'Planning prévu',
    projectedRevenue: 'Revenus projetés',
    actualIncome: 'Revenus réels',
    projectedCosts: 'Coûts projetés',
    actualExpenses: 'Dépenses réelles',
    actualVsPlannedHint: 'Liez les revenus et dépenses du projet pour voir le réel vs prévu.',
    financial_model_missing: 'Modèle financier manquant',
    feasibility_incomplete: 'Étude de faisabilité incomplète',
    overdue_tasks: 'Tâches en retard',
    no_documents: 'Aucun document téléversé',
    project_end_passed: 'Date de fin du projet dépassée',
    expenses_exceed_budget: 'Les dépenses dépassent le budget',
    negative_cash: 'Solde de trésorerie projeté négatif',
    payback_too_long: 'Période de récupération trop longue',
    behind_schedule: 'Progression réelle en retard',
    noRiskFlags: 'Aucune alerte de risque actuellement.',
    healthFormula: 'Santé = complétude du modèle financier + profit projeté + progression des tâches + absence de retard + score de faisabilité + documents.',
  },
} as const;

type KpiTranslation = Record<keyof typeof TEXT.ar, string>;

function getLocale(lang?: string): Lang {
  return lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar';
}

export function ProjectKpisTab({
  userId,
  projectId,
  project,
  lang = 'ar',
  currency = 'KWD',
  onSummaryChange,
}: {
  userId: string;
  projectId: string;
  project: ProjectKpiProject | null;
  lang?: string;
  currency?: string;
  onSummaryChange?: (summary: ProjectKpiSummary) => void;
}) {
  const locale = getLocale(lang);
  const t = TEXT[locale] as KpiTranslation;
  const [loading, setLoading] = useState(true);
  const [financialModel, setFinancialModel] = useState<ProjectFinancialModelKpiRow | null>(null);
  const [feasibilityStudy, setFeasibilityStudy] = useState<ProjectFeasibilityKpiRow | null>(null);
  const [tasks, setTasks] = useState<ProjectTaskRow[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestoneRow[]>([]);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [linkedIncome, setLinkedIncome] = useState<ActualIncomeRow[]>([]);
  const [linkedExpenses, setLinkedExpenses] = useState<ActualExpenseRow[]>([]);

  const money = useCallback((amount: number | null) => {
    if (amount === null || !Number.isFinite(amount)) return t.na;
    return formatMoney(amount, currency || 'KWD', locale);
  }, [currency, locale, t.na]);

  const percent = useCallback((value: number | null) => {
    if (value === null || !Number.isFinite(value)) return t.na;
    return `${new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }).format(value)}%`;
  }, [locale, t.na]);

  const monthLabel = useCallback((value: number | null) => {
    if (value === null || !Number.isFinite(value)) return t.na;
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-KW-u-nu-latn' : locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 }).format(value);
  }, [locale, t.na]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [financialRes, feasibilityRes, taskRes, milestoneRes, documentRes, projectIncomeRes, projectExpenseRes, legacyExpenseRes] = await Promise.all([
      supabase.from('project_financial_models').select('*').eq('user_id', userId).eq('project_id', projectId).maybeSingle(),
      supabase.from('project_feasibility_studies').select('*').eq('user_id', userId).eq('project_id', projectId).maybeSingle(),
      supabase.from('project_tasks').select('*').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('project_milestones').select('*').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('project_documents').select('id,title,category,file_url,file_path,uploaded_at,created_at,updated_at').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('project_income').select('id, amount, currency, project_id, income_date, created_at').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('project_expenses').select('id, amount, currency, project_id, expense_date, created_at').eq('user_id', userId).eq('project_id', projectId),
      supabase.from('expense_items').select('id, amount, currency, enhanced, created_at').eq('user_id', userId),
    ]);
    setFinancialModel(financialRes.error ? null : financialRes.data as ProjectFinancialModelKpiRow | null);
    setFeasibilityStudy(feasibilityRes.error ? null : feasibilityRes.data as ProjectFeasibilityKpiRow | null);
    setTasks(taskRes.error ? [] : (taskRes.data ?? []) as ProjectTaskRow[]);
    setMilestones(milestoneRes.error ? [] : (milestoneRes.data ?? []) as ProjectMilestoneRow[]);
    setDocumentsCount(documentRes.error ? 0 : uniqueDocumentCount(documentRes.data ?? []));
    setLinkedIncome(projectIncomeRes.error ? [] : (projectIncomeRes.data ?? []) as ActualIncomeRow[]);
    const projectExpenseRows = projectExpenseRes.error ? [] : (projectExpenseRes.data ?? []) as ActualExpenseRow[];
    const legacyExpenseRows = legacyExpenseRes.error ? [] : actualProjectExpenseRows((legacyExpenseRes.data ?? []) as ActualExpenseRow[], projectId);
    setLinkedExpenses([...projectExpenseRows, ...legacyExpenseRows]);
    setLoading(false);
  }, [projectId, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const actualIncomeTotal = useMemo(() => linkedIncome.reduce((sum, row) => sum + toNum(row.amount), 0), [linkedIncome]);
  const actualExpenseTotal = useMemo(() => linkedExpenses.reduce((sum, row) => sum + toNum(row.amount), 0), [linkedExpenses]);
  const financial = useMemo(() => getFinancialKpis(financialModel), [financialModel]);
  const summary = useMemo(() => buildProjectKpiSummary({
    project,
    financialModel,
    feasibilityStudy,
    tasks,
    milestones,
    documentsCount,
    actualIncome: actualIncomeTotal,
    actualExpenses: actualExpenseTotal,
  }), [actualExpenseTotal, actualIncomeTotal, documentsCount, feasibilityStudy, financialModel, milestones, project, tasks]);
  const riskFlags = useMemo(() => buildRiskFlags({
    project,
    financialModel,
    feasibilityStudy,
    tasks,
    documentsCount,
    actualExpenses: actualExpenseTotal,
  }), [actualExpenseTotal, documentsCount, feasibilityStudy, financialModel, project, tasks]);
  const taskProgressValue = useMemo(() => taskProgress(tasks), [tasks]);
  const milestoneProgressValue = useMemo(() => milestoneProgress(milestones), [milestones]);
  const timelineProgressValue = useMemo(() => timelineProgress(project), [project]);
  const actualProgressValue = taskProgressValue ?? milestoneProgressValue;
  const behindSchedule = actualProgressValue !== null && timelineProgressValue !== null && actualProgressValue + 15 < timelineProgressValue;
  const completedMilestones = milestones.filter(completedMilestone).length;
  const upcomingDeadlines = tasks.filter(task => {
    const due = safeDate(task.due_date);
    return due && due >= todayStart() && !isTaskDone(task) && !isTaskCancelled(task);
  }).length;
  const plannedBudget = projectDates(project).budget;
  const hasActualIncomeData = linkedIncome.length > 0;
  const hasActualExpenseData = linkedExpenses.length > 0;
  const hasAnyKpiData = hasFinancialModel(financialModel) || tasks.length > 0 || milestones.length > 0 || documentsCount > 0 || feasibilityScore(feasibilityStudy) !== null || hasActualIncomeData || hasActualExpenseData;

  useEffect(() => {
    onSummaryChange?.(summary);
  }, [onSummaryChange, summary]);

  return (
    <section className="project-kpis-tab" role="tabpanel" aria-label={t.kpis}>
      <article className={`kpi-health-card ${summary.status}`}>
        <div
          className="health-score-ring"
          role="img"
          aria-label={`${t.projectHealthScore}: ${summary.score ?? 0}/100`}
        >
          <strong>{summary.score === null ? t.na : summary.score}</strong>
          <span>/100</span>
        </div>
        <div className="health-copy">
          <span>{t.projectHealthScore}</span>
          <h2>{t[summary.status]}</h2>
          <p>{t.planningDisclaimer}</p>
          <small>{t.healthFormula}</small>
        </div>
        {loading ? <span className="health-loading">{t.kpis}</span> : null}
      </article>

      {!hasAnyKpiData && !loading ? <div className="kpi-empty-note">{t.insufficientData}</div> : null}

      <div className="kpi-section-grid">
        <article className="kpi-card financial-kpi-card">
          <SectionTitle title={t.financialKpis} icon={<BarChart3 size={20} />} />
          {!hasFinancialModel(financialModel) ? <p className="kpi-hint">{t.addFinancialModel}</p> : null}
          <div className="kpi-metric-grid">
            <KpiMetric label={t.roi} value={percent(financial.roi)} />
            <KpiMetric label={t.paybackPeriod} value={monthLabel(financial.paybackPeriod)} />
            <KpiMetric label={t.breakEvenMonth} value={monthLabel(financial.breakEvenMonth)} />
            <KpiMetric label={t.netMargin} value={percent(financial.netMargin)} />
            <KpiMetric label={t.grossMargin} value={percent(financial.grossMargin)} />
            <KpiMetric label={t.burnRate} value={money(financial.burnRate)} />
            <KpiMetric label={t.runway} value={monthLabel(financial.runway)} />
            <KpiMetric label={t.totalProjectedRevenue} value={money(financial.totalRevenue)} />
            <KpiMetric label={t.totalProjectedProfit} value={money(financial.totalProfit)} />
          </div>
        </article>

        <article className="kpi-card">
          <SectionTitle title={t.operationalKpis} icon={<ClipboardList size={20} />} />
          <div className="kpi-metric-grid compact">
            <KpiMetric label={t.taskCompletionRate} value={percent(taskProgressValue)} />
            <KpiMetric label={t.overdueTasks} value={String(tasks.filter(isTaskLate).length)} />
            <KpiMetric label={t.milestonesCompleted} value={milestones.length ? `${completedMilestones}/${milestones.length}` : t.na} />
            <KpiMetric label={t.upcomingDeadlines} value={String(upcomingDeadlines)} />
            <KpiMetric label={t.documentsCount} value={String(documentsCount)} />
            <KpiMetric label={t.openIssues} value={t.na} />
          </div>
        </article>
      </div>

      <div className="kpi-section-grid">
        <article className="kpi-card">
          <SectionTitle title={t.progressKpis} icon={<Activity size={20} />} />
          <ProgressRow label={t.taskProgress} value={taskProgressValue} fallback={t.na} />
          <ProgressRow label={t.milestoneProgress} value={milestoneProgressValue} fallback={t.na} />
          <ProgressRow label={t.timelineProgress} value={timelineProgressValue} fallback={t.na} />
          <ProgressRow label={t.actualProgress} value={actualProgressValue} fallback={t.na} />
          {behindSchedule ? <div className="kpi-warning"><AlertTriangle size={16} />{t.behindSchedule}</div> : null}
        </article>

        <article className="kpi-card">
          <SectionTitle title={t.actualVsPlanned} icon={<Target size={20} />} />
          {!hasActualExpenseData && !hasActualIncomeData ? <p className="kpi-hint">{t.actualVsPlannedHint}</p> : null}
          <div className="actual-grid">
            <ComparisonItem label={t.plannedBudget} planned={money(plannedBudget > 0 ? plannedBudget : null)} actual={hasActualExpenseData ? money(actualExpenseTotal) : t.na} actualLabel={t.actualCost} />
            <ComparisonItem label={t.plannedTimeline} planned={percent(timelineProgressValue)} actual={percent(actualProgressValue)} actualLabel={t.actualProgress} />
            <ComparisonItem label={t.projectedRevenue} planned={money(financial.totalRevenue)} actual={hasActualIncomeData ? money(actualIncomeTotal) : t.na} actualLabel={t.actualIncome} />
            <ComparisonItem label={t.projectedCosts} planned={money(financial.totalCosts)} actual={hasActualExpenseData ? money(actualExpenseTotal) : t.na} actualLabel={t.actualExpenses} />
          </div>
        </article>
      </div>

      <article className="kpi-card">
        <SectionTitle title={t.riskFlags} icon={<AlertTriangle size={20} />} />
        {riskFlags.length === 0 ? <p className="kpi-hint">{t.noRiskFlags}</p> : null}
        <div className="risk-flag-list">
          {riskFlags.map(flag => (
            <span className="risk-flag" key={flag}>{t[flag]}</span>
          ))}
        </div>
      </article>

      <style jsx global>{`
        .project-kpis-tab{display:grid;gap:16px;min-width:0}.kpi-health-card,.kpi-card,.kpi-empty-note{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-card);padding:18px;box-shadow:var(--shadow-card);min-width:0}.kpi-health-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center;background:var(--primary-soft);color:var(--foreground)}.health-score-ring{width:118px;height:118px;border-radius:var(--radius-pill);display:grid;place-items:center;background:var(--primary-soft);border:3px solid var(--primary);box-shadow:var(--shadow-xs)}.health-score-ring strong{font-family:var(--font-data);font-size:30px;color:var(--foreground)}.health-score-ring span{font-size:12px;color:var(--foreground-muted);font-weight:600}.health-copy span,.health-loading{color:var(--foreground-muted);font-weight:600;font-size:12px}.health-copy h2{margin:6px 0;color:var(--foreground);font-size:28px}.health-copy p{margin:0;color:var(--foreground-muted);line-height:1.7}.health-copy small{display:block;margin-top:8px;color:var(--foreground-muted);line-height:1.6}.kpi-empty-note,.kpi-hint{color:var(--foreground-muted);line-height:1.7;font-weight:600}.kpi-section-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.financial-kpi-card{grid-column:1 / -1}.kpi-section-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.kpi-section-title h2{margin:0;color:var(--foreground);font-size:19px}.kpi-section-title svg{color:var(--primary)}.kpi-metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.kpi-metric-grid.compact{grid-template-columns:repeat(2,minmax(0,1fr))}.kpi-metric,.comparison-item{border:1px solid var(--border);background:var(--surface-muted);border-radius:var(--radius-card);padding:12px;min-width:0}.kpi-metric small,.comparison-item small{display:block;color:var(--foreground-muted);font-weight:600}.kpi-metric strong,.comparison-item strong{display:block;margin-top:6px;color:var(--foreground);font-family:var(--font-data);font-size:18px;overflow-wrap:anywhere}.progress-row{display:grid;gap:8px;margin-top:12px}.progress-label{display:flex;justify-content:space-between;gap:12px;color:var(--foreground-muted);font-weight:600}.progress-track{height:11px;border-radius:var(--radius-pill);background:var(--primary-soft);overflow:hidden}.progress-track span{display:block;height:100%;border-radius:var(--radius-pill);background:var(--primary)}.kpi-warning{margin-top:14px;border:1px solid var(--danger-soft);background:var(--danger-soft);color:var(--danger);border-radius:var(--radius-control);padding:11px 12px;font-weight:600;display:flex;align-items:center;gap:8px}.actual-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.comparison-values{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.comparison-values div{border-radius:var(--radius-control);background:var(--surface);padding:9px}.risk-flag-list{display:flex;flex-wrap:wrap;gap:8px}.risk-flag{display:inline-flex;border-radius:var(--radius-pill);background:var(--danger-soft);color:var(--danger);border:1px solid var(--danger-soft);padding:7px 11px;font-size:12px;font-weight:600}.kpi-health-card.strong .health-score-ring{background:var(--success-soft);border-color:var(--success)}.kpi-health-card.good .health-score-ring{background:var(--primary-soft);border-color:var(--primary)}.kpi-health-card.needs_review .health-score-ring{background:var(--warning-soft);border-color:var(--warning)}.kpi-health-card.high_risk .health-score-ring{background:var(--danger-soft);border-color:var(--danger)}.kpi-health-card.insufficient .health-score-ring{background:var(--surface-muted);border-color:var(--foreground-muted)}@media(max-width:1180px){.kpi-section-grid{grid-template-columns:1fr}.kpi-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.kpi-health-card{grid-template-columns:1fr;text-align:start}.health-score-ring{width:102px;height:102px}.kpi-metric-grid,.kpi-metric-grid.compact,.actual-grid,.comparison-values{grid-template-columns:1fr}.kpi-card,.kpi-health-card{padding:16px}.risk-flag-list{display:grid}}
      `}</style>
    </section>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: ReactNode }) {
  return <div className="kpi-section-title"><h2>{title}</h2>{icon}</div>;
}

function KpiMetric({ label, value }: { label: string; value: string }) {
  return <div className="kpi-metric"><small>{label}</small><strong>{value}</strong></div>;
}

function ProgressRow({ label, value, fallback }: { label: string; value: number | null; fallback: string }) {
  const percent = value === null ? 0 : clampPercent(value);
  return (
    <div className="progress-row">
      <div className="progress-label"><span>{label}</span><strong>{value === null ? fallback : `${Math.round(percent)}%`}</strong></div>
      <div className="progress-track" aria-label={label} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ComparisonItem({ label, planned, actual, actualLabel }: { label: string; planned: string; actual: string; actualLabel: string }) {
  return (
    <div className="comparison-item">
      <small>{label}</small>
      <div className="comparison-values">
        <div><small>{label}</small><strong>{planned}</strong></div>
        <div><small>{actualLabel}</small><strong>{actual}</strong></div>
      </div>
    </div>
  );
}
