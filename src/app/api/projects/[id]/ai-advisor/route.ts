import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { personalIncomeRows } from '@/lib/data/financeData';

type Lang = 'ar' | 'en' | 'fr';
type AdvisorMode = 'summary' | 'risks' | 'actions' | 'plan90' | 'report' | 'chat';
type AdvisorSource = 'ai' | 'rules';
type AdvisorStatus = 'strong' | 'needs_review' | 'high_risk' | 'incomplete';
type RiskLevel = 'low' | 'medium' | 'high';
type Priority = 'low' | 'medium' | 'high';
type PlanPeriod = 'days_1_30' | 'days_31_60' | 'days_61_90';
type TabTarget = 'overview' | 'feasibility' | 'financial' | 'tasks' | 'documents' | 'kpis';

type AdvisorResponse = {
  success: true;
  source: AdvisorSource;
  message?: string;
  summary: {
    status: AdvisorStatus;
    headline: string;
    explanation: string;
  };
  risks: Array<{
    level: RiskLevel;
    title: string;
    reason: string;
    suggestedAction: string;
  }>;
  nextActions: Array<{
    priority: Priority;
    title: string;
    description: string;
    estimatedImpact: string;
  }>;
  plan90: Array<{
    period: PlanPeriod;
    actions: string[];
  }>;
  missingData: Array<{
    field: string;
    whyItMatters: string;
    tab?: TabTarget;
  }>;
  disclaimer: string;
  chatAnswer?: {
    answer: string;
    assumptions: string[];
    suggestedActions: string[];
    disclaimer: string;
  };
};

const TEXT = {
  ar: {
    providerMissing: 'مزود الذكاء الاصطناعي غير مفعل. يتم عرض إرشادات مبنية على قواعد تحليلية.',
    disclaimer: 'هذا التحليل لأغراض التخطيط والمراجعة فقط، ولا يعتبر استشارة مالية أو قانونية أو ضمانا لنجاح المشروع.',
    incompleteHeadline: 'بيانات المشروع غير مكتملة',
    incompleteExplanation: 'توجد أقسام مهمة غير مكتملة، لذلك يعتمد التحليل على البيانات المتاحة فقط.',
    needsReviewHeadline: 'المشروع يحتاج مراجعة منظمة',
    needsReviewExplanation: 'توجد مؤشرات تحتاج متابعة قبل اتخاذ قرارات تمويل أو إطلاق أكبر.',
    highRiskHeadline: 'المشروع يحمل مخاطر مرتفعة',
    highRiskExplanation: 'تظهر البيانات المتاحة مؤشرات مالية أو تشغيلية تحتاج مراجعة عاجلة.',
    strongHeadline: 'المشروع منظم بشكل جيد',
    strongExplanation: 'تتوفر بيانات أساسية كافية ولا تظهر مخاطر مرتفعة من المؤشرات المسجلة.',
    financialMissingTitle: 'النموذج المالي غير مكتمل',
    financialMissingReason: 'لا توجد بيانات كافية عن الإيرادات أو التكاليف أو التدفق النقدي.',
    financialMissingAction: 'أكمل تبويب النموذج المالي قبل زيادة رأس المال أو عرض المشروع.',
    feasibilityMissingTitle: 'دراسة الجدوى غير مكتملة',
    feasibilityMissingReason: 'بيانات السوق أو الجدوى الفنية أو القانونية غير مكتملة.',
    feasibilityMissingAction: 'أكمل دراسة الجدوى لتوضيح المشكلة والعملاء والمنافسين والتراخيص.',
    overdueTasksTitle: 'يوجد مهام متأخرة',
    overdueTasksReason: 'بعض المهام تجاوزت تاريخ الاستحقاق ولم يتم إكمالها.',
    overdueTasksAction: 'راجع المهام المتأخرة وحدد ما يجب إنجازه قبل الانتقال للمرحلة التالية.',
    negativeRoiTitle: 'العائد المتوقع سلبي',
    negativeRoiReason: 'النموذج المالي يشير إلى ربحية إجمالية سالبة.',
    negativeRoiAction: 'راجع الإيرادات والتكاليف وافتراضات النمو قبل الالتزام بمصاريف إضافية.',
    paybackLongTitle: 'فترة الاسترداد طويلة',
    paybackLongReason: 'فترة الاسترداد المتوقعة تتجاوز 36 شهرا.',
    paybackLongAction: 'اختبر سيناريوهات تخفيض التكاليف أو تحسين الإيرادات.',
    noDocumentsTitle: 'لا توجد مستندات داعمة للمشروع',
    noDocumentsReason: 'لم يتم حفظ عقود أو تراخيص أو فواتير أو خطط عمل في خزنة المستندات.',
    noDocumentsAction: 'ارفع المستندات الأساسية لتقوية ملف المشروع.',
    endPassedTitle: 'تاريخ نهاية المشروع تجاوز اليوم',
    endPassedReason: 'تاريخ النهاية المسجل مضى ولم تظهر حالة مكتملة.',
    endPassedAction: 'حدّث الجدول الزمني أو غيّر حالة المشروع إذا اكتمل.',
    negativeCashTitle: 'التدفق النقدي المتوقع سلبي',
    negativeCashReason: 'النموذج المالي يحتوي على رصيد نقدي متوقع سلبي.',
    negativeCashAction: 'راجع المصروفات، الرصيد الافتتاحي، وخطة التمويل.',
    capitalSavingsTitle: 'رأس المال يستهلك نسبة كبيرة من المدخرات',
    capitalSavingsReason: 'رأس المال المسجل مرتفع مقارنة بالمدخرات المتاحة.',
    capitalSavingsAction: 'راجع حجم الالتزام المالي واحتفظ بهامش أمان شخصي.',
    completeFinancial: 'أكمل النموذج المالي',
    completeFinancialDesc: 'أضف مصادر الإيراد والتكاليف والتوقعات لفهم الربحية والتدفق النقدي.',
    completeFeasibility: 'أكمل دراسة الجدوى',
    completeFeasibilityDesc: 'حدد المشكلة والعملاء والمنافسين والتراخيص قبل مرحلة الإطلاق.',
    handleLateTasks: 'عالج المهام المتأخرة',
    handleLateTasksDesc: 'إغلاق المهام المتأخرة يحسن وضوح التنفيذ والجدول الزمني.',
    uploadDocs: 'ارفع مستندات المشروع',
    uploadDocsDesc: 'المستندات تساعد في توثيق العقود والتراخيص والفواتير المهمة.',
    reviewFinancials: 'راجع الافتراضات المالية',
    reviewFinancialsDesc: 'تحسين افتراضات الإيرادات والتكاليف يساعد في تقليل المخاطر.',
    earlyPlan: ['تحقق من المشكلة وشريحة العملاء.', 'أكمل دراسة الجدوى والنموذج المالي.', 'حدد التراخيص والمستندات المطلوبة.'],
    setupPlan: ['أغلق المهام المتأخرة والأولوية العالية.', 'راجع الميزانية والتدفق النقدي.', 'ارفع المستندات التشغيلية الأساسية.'],
    growthPlan: ['راجع مؤشرات الربحية والنمو.', 'حسن هوامش الربح وكفاءة التكاليف.', 'حوّل أفضل الإجراءات إلى مهام قابلة للتنفيذ.'],
    financialModel: 'النموذج المالي',
    feasibilityStudy: 'دراسة الجدوى',
    tasks: 'المهام',
    documents: 'المستندات',
    kpis: 'مؤشرات الأداء',
    chatFallback: 'بناء على البيانات المتاحة، لا يمكن إعطاء حكم نهائي. ركز على إكمال البيانات الناقصة ومعالجة المخاطر الظاهرة أولا.',
  },
  en: {
    providerMissing: 'AI provider is not configured. Showing rule-based project guidance.',
    disclaimer: 'This analysis is for planning and review purposes only and is not financial or legal advice or a guarantee of project success.',
    incompleteHeadline: 'Project data is incomplete',
    incompleteExplanation: 'Important sections are missing, so the analysis is limited to the available data.',
    needsReviewHeadline: 'The project needs structured review',
    needsReviewExplanation: 'Some indicators need attention before larger funding or launch decisions.',
    highRiskHeadline: 'The project shows elevated risk',
    highRiskExplanation: 'Available data shows financial or operational signals that need urgent review.',
    strongHeadline: 'The project is well organized',
    strongExplanation: 'Core planning data is available and no high-risk signals appear in the recorded indicators.',
    financialMissingTitle: 'Financial model is incomplete',
    financialMissingReason: 'Revenue, cost, or cash-flow data is not sufficient.',
    financialMissingAction: 'Complete the Financial Model tab before increasing capital or presenting the project.',
    feasibilityMissingTitle: 'Feasibility study is incomplete',
    feasibilityMissingReason: 'Market, technical, financial, or legal feasibility data is incomplete.',
    feasibilityMissingAction: 'Complete feasibility data for the problem, customers, competitors, and licenses.',
    overdueTasksTitle: 'There are overdue tasks',
    overdueTasksReason: 'Some tasks are past their due date and are not complete.',
    overdueTasksAction: 'Review overdue tasks and decide what must be completed before the next phase.',
    negativeRoiTitle: 'Projected ROI is negative',
    negativeRoiReason: 'The financial model indicates negative overall profitability.',
    negativeRoiAction: 'Review revenue, costs, and growth assumptions before committing more spend.',
    paybackLongTitle: 'Payback period is long',
    paybackLongReason: 'Expected payback period is longer than 36 months.',
    paybackLongAction: 'Test cost reduction or revenue improvement scenarios.',
    noDocumentsTitle: 'No supporting documents uploaded',
    noDocumentsReason: 'No contracts, licenses, invoices, or business plans are saved in the document vault.',
    noDocumentsAction: 'Upload core documents to strengthen the project file.',
    endPassedTitle: 'Project end date has passed',
    endPassedReason: 'The recorded end date is in the past and the project is not completed.',
    endPassedAction: 'Update the timeline or mark the project completed if it is finished.',
    negativeCashTitle: 'Projected cash balance is negative',
    negativeCashReason: 'The financial model includes a negative projected cash balance.',
    negativeCashAction: 'Review expenses, opening cash, and funding plan.',
    capitalSavingsTitle: 'Capital uses a large share of savings',
    capitalSavingsReason: 'Recorded capital is high compared with available savings.',
    capitalSavingsAction: 'Review the commitment size and keep a personal safety buffer.',
    completeFinancial: 'Complete the financial model',
    completeFinancialDesc: 'Add revenue streams, costs, and forecasts to understand profitability and cash flow.',
    completeFeasibility: 'Complete the feasibility study',
    completeFeasibilityDesc: 'Define the problem, customers, competitors, and licenses before launch.',
    handleLateTasks: 'Resolve overdue tasks',
    handleLateTasksDesc: 'Closing late tasks improves execution clarity and timeline confidence.',
    uploadDocs: 'Upload project documents',
    uploadDocsDesc: 'Documents help track contracts, licenses, and key invoices.',
    reviewFinancials: 'Review financial assumptions',
    reviewFinancialsDesc: 'Improving revenue and cost assumptions can reduce planning risk.',
    earlyPlan: ['Validate the problem and customer segment.', 'Complete feasibility and financial model data.', 'List required licenses and documents.'],
    setupPlan: ['Close overdue and high-priority tasks.', 'Review budget and cash-flow assumptions.', 'Upload key operational documents.'],
    growthPlan: ['Review profitability and growth KPIs.', 'Improve margins and cost efficiency.', 'Turn recommended actions into executable tasks.'],
    financialModel: 'Financial model',
    feasibilityStudy: 'Feasibility study',
    tasks: 'Tasks',
    documents: 'Documents',
    kpis: 'KPIs',
    chatFallback: 'Based on the available data, a final judgment is not possible. Focus first on completing missing data and addressing visible risks.',
  },
  fr: {
    providerMissing: 'Le fournisseur IA n’est pas configuré. Affichage d’une analyse basée sur des règles.',
    disclaimer: 'Cette analyse est fournie à des fins de planification et de révision uniquement. Elle ne constitue pas un conseil financier ou juridique ni une garantie de réussite du projet.',
    incompleteHeadline: 'Les données du projet sont incomplètes',
    incompleteExplanation: 'Des sections importantes manquent, donc l’analyse se limite aux données disponibles.',
    needsReviewHeadline: 'Le projet nécessite une revue structurée',
    needsReviewExplanation: 'Certains indicateurs doivent être examinés avant des décisions de financement ou de lancement.',
    highRiskHeadline: 'Le projet présente un risque élevé',
    highRiskExplanation: 'Les données disponibles montrent des signaux financiers ou opérationnels à revoir rapidement.',
    strongHeadline: 'Le projet est bien organisé',
    strongExplanation: 'Les données de planification essentielles sont disponibles et aucun signal de risque élevé n’apparaît.',
    financialMissingTitle: 'Le modèle financier est incomplet',
    financialMissingReason: 'Les données de revenus, coûts ou flux de trésorerie sont insuffisantes.',
    financialMissingAction: 'Complétez l’onglet Modèle financier avant d’augmenter le capital ou de présenter le projet.',
    feasibilityMissingTitle: 'L’étude de faisabilité est incomplète',
    feasibilityMissingReason: 'Les données de faisabilité marché, technique, financière ou juridique sont incomplètes.',
    feasibilityMissingAction: 'Complétez la faisabilité pour le problème, les clients, les concurrents et les licences.',
    overdueTasksTitle: 'Certaines tâches sont en retard',
    overdueTasksReason: 'Des tâches ont dépassé leur échéance et ne sont pas terminées.',
    overdueTasksAction: 'Revoyez les tâches en retard et décidez ce qui doit être terminé avant la prochaine phase.',
    negativeRoiTitle: 'Le ROI prévu est négatif',
    negativeRoiReason: 'Le modèle financier indique une rentabilité globale négative.',
    negativeRoiAction: 'Revoyez les revenus, coûts et hypothèses de croissance avant de dépenser davantage.',
    paybackLongTitle: 'La période de récupération est longue',
    paybackLongReason: 'La période de récupération attendue dépasse 36 mois.',
    paybackLongAction: 'Testez des scénarios de réduction des coûts ou d’amélioration des revenus.',
    noDocumentsTitle: 'Aucun document justificatif',
    noDocumentsReason: 'Aucun contrat, licence, facture ou plan d’affaires n’est enregistré.',
    noDocumentsAction: 'Téléversez les documents clés pour renforcer le dossier du projet.',
    endPassedTitle: 'La date de fin du projet est dépassée',
    endPassedReason: 'La date de fin enregistrée est passée et le projet n’est pas terminé.',
    endPassedAction: 'Mettez à jour le calendrier ou marquez le projet comme terminé.',
    negativeCashTitle: 'La trésorerie prévisionnelle est négative',
    negativeCashReason: 'Le modèle financier contient une trésorerie prévue négative.',
    negativeCashAction: 'Revoyez les dépenses, la trésorerie initiale et le plan de financement.',
    capitalSavingsTitle: 'Le capital utilise une grande part de l’épargne',
    capitalSavingsReason: 'Le capital enregistré est élevé par rapport à l’épargne disponible.',
    capitalSavingsAction: 'Revoyez le montant engagé et conservez une marge de sécurité personnelle.',
    completeFinancial: 'Compléter le modèle financier',
    completeFinancialDesc: 'Ajoutez revenus, coûts et prévisions pour comprendre la rentabilité et la trésorerie.',
    completeFeasibility: 'Compléter l’étude de faisabilité',
    completeFeasibilityDesc: 'Définissez le problème, les clients, les concurrents et les licences avant le lancement.',
    handleLateTasks: 'Résoudre les tâches en retard',
    handleLateTasksDesc: 'Clôturer les tâches en retard améliore la clarté d’exécution.',
    uploadDocs: 'Téléverser les documents du projet',
    uploadDocsDesc: 'Les documents aident à suivre les contrats, licences et factures clés.',
    reviewFinancials: 'Revoir les hypothèses financières',
    reviewFinancialsDesc: 'Améliorer les hypothèses de revenus et coûts peut réduire le risque.',
    earlyPlan: ['Valider le problème et le segment client.', 'Compléter la faisabilité et le modèle financier.', 'Lister les licences et documents requis.'],
    setupPlan: ['Clôturer les tâches en retard et prioritaires.', 'Revoir le budget et la trésorerie.', 'Téléverser les documents opérationnels clés.'],
    growthPlan: ['Revoir les KPI de rentabilité et croissance.', 'Améliorer les marges et l’efficacité des coûts.', 'Transformer les actions recommandées en tâches exécutables.'],
    financialModel: 'Modèle financier',
    feasibilityStudy: 'Étude de faisabilité',
    tasks: 'Tâches',
    documents: 'Documents',
    kpis: 'KPI',
    chatFallback: 'D’après les données disponibles, un jugement final n’est pas possible. Concentrez-vous d’abord sur les données manquantes et les risques visibles.',
  },
} as const;

function getSupabase(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function getProvider() {
  const gatewayToken = process.env.AI_GATEWAY_TOKEN;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (gatewayToken) {
    return createAnthropic({
      apiKey: gatewayToken,
      baseURL: 'https://ai-gateway.vercel.sh/v1/anthropic',
    });
  }
  return anthropicKey ? createAnthropic({ apiKey: anthropicKey }) : null;
}

function toNum(value: unknown) {
  const number = Number(String(value ?? 0).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function parseRecord(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function arrayValue(value: unknown): Array<Record<string, any>> {
  return Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Array<Record<string, any>> : [];
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function projectStatus(project: Record<string, any> | null) {
  const notes = parseRecord(project?.notes);
  return String(notes.status ?? project?.status ?? '').toLowerCase();
}

function projectCapital(project: Record<string, any> | null) {
  const notes = parseRecord(project?.notes);
  return toNum(notes.capital_amount ?? notes.capitalAmount ?? notes.capital ?? project?.capital_amount ?? project?.budget);
}

function projectEndDate(project: Record<string, any> | null) {
  const notes = parseRecord(project?.notes);
  return safeDate(notes.end_date ?? notes.endDate ?? project?.end_date);
}

function financialKpis(model: Record<string, any> | null) {
  const kpis = parseRecord(model?.kpis);
  const forecast = arrayValue(model?.forecast);
  const totalRevenue = toNullableNumber(kpis.totalRevenue) ?? (forecast.length ? forecast.reduce((sum, row) => sum + toNum(row.revenue), 0) : null);
  const totalProfit = toNullableNumber(kpis.totalProfit) ?? (forecast.length ? forecast.reduce((sum, row) => sum + toNum(row.netProfit), 0) : null);
  const negativeCash = forecast.some(row => toNum(row.cashBalance) < 0 || toNum(row.cash_balance) < 0);
  return {
    roi: toNullableNumber(kpis.roi),
    paybackPeriod: toNullableNumber(kpis.paybackPeriod),
    breakEvenMonth: toNullableNumber(kpis.breakEvenMonth),
    totalRevenue,
    totalProfit,
    negativeCash,
  };
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const number = toNum(value);
  return Number.isFinite(number) ? number : null;
}

function hasFinancialModel(model: Record<string, any> | null) {
  if (!model) return false;
  return Object.keys(parseRecord(model.assumptions)).length > 0
    || arrayValue(model.revenue_streams).length > 0
    || arrayValue(model.cost_items).length > 0
    || arrayValue(model.forecast).length > 0
    || Object.keys(parseRecord(model.kpis)).length > 0;
}

function feasibilityIncomplete(study: Record<string, any> | null) {
  if (!study) return true;
  const score = toNum(study.feasibility_score);
  const sections = ['market_data', 'technical_data', 'financial_data', 'legal_data'];
  const filledSections = sections.filter(section => Object.values(parseRecord(study[section])).some(value => String(value ?? '').trim()));
  return score < 70 || filledSections.length < 3 || String(study.feasibility_status ?? '').toLowerCase() === 'incomplete';
}

function taskStats(tasks: Array<Record<string, any>>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const late = tasks.filter(task => {
    const status = String(task.status ?? '').toLowerCase();
    const due = safeDate(task.due_date);
    return due && due < today && !['done', 'cancelled'].includes(status);
  }).length;
  const done = tasks.filter(task => String(task.status ?? '').toLowerCase() === 'done').length;
  return {
    total: tasks.length,
    done,
    late,
    progress: tasks.length ? Math.round(done / tasks.length * 100) : 0,
  };
}

function action(priority: Priority, title: string, description: string, estimatedImpact: string) {
  return { priority, title, description, estimatedImpact };
}

function missing(field: string, whyItMatters: string, tab: TabTarget) {
  return { field, whyItMatters, tab };
}

function buildRulesResponse(context: Record<string, any>, lang: Lang, mode: AdvisorMode, question?: string): AdvisorResponse {
  const t = TEXT[lang] ?? TEXT.en;
  const project = context.project as Record<string, any> | null;
  const financialModel = context.financialModel as Record<string, any> | null;
  const feasibilityStudy = context.feasibilityStudy as Record<string, any> | null;
  const tasks = arrayValue(context.tasks);
  const documentsCount = toNum(context.documentsCount);
  const savings = toNum(context.savingsTotal);
  const capital = projectCapital(project);
  const endDate = projectEndDate(project);
  const status = projectStatus(project);
  const taskSummary = taskStats(tasks);
  const kpis = financialKpis(financialModel);
  const financialMissing = !hasFinancialModel(financialModel);
  const feasibilityMissing = feasibilityIncomplete(feasibilityStudy);
  const risks: AdvisorResponse['risks'] = [];
  const missingData: AdvisorResponse['missingData'] = [];
  const nextActions: AdvisorResponse['nextActions'] = [];

  if (financialMissing) {
    risks.push({ level: 'medium', title: t.financialMissingTitle, reason: t.financialMissingReason, suggestedAction: t.financialMissingAction });
    missingData.push(missing(t.financialModel, t.financialMissingReason, 'financial'));
    nextActions.push(action('high', t.completeFinancial, t.completeFinancialDesc, t.financialMissingAction));
  }
  if (feasibilityMissing) {
    risks.push({ level: 'medium', title: t.feasibilityMissingTitle, reason: t.feasibilityMissingReason, suggestedAction: t.feasibilityMissingAction });
    missingData.push(missing(t.feasibilityStudy, t.feasibilityMissingReason, 'feasibility'));
    nextActions.push(action('high', t.completeFeasibility, t.completeFeasibilityDesc, t.feasibilityMissingAction));
  }
  if (taskSummary.late > 0) {
    risks.push({ level: 'high', title: t.overdueTasksTitle, reason: t.overdueTasksReason, suggestedAction: t.overdueTasksAction });
    nextActions.push(action('high', t.handleLateTasks, t.handleLateTasksDesc, t.overdueTasksAction));
  }
  if (kpis.roi !== null && kpis.roi < 0) {
    risks.push({ level: 'high', title: t.negativeRoiTitle, reason: t.negativeRoiReason, suggestedAction: t.negativeRoiAction });
    nextActions.push(action('high', t.reviewFinancials, t.reviewFinancialsDesc, t.negativeRoiAction));
  }
  if (kpis.paybackPeriod !== null && kpis.paybackPeriod > 36) {
    risks.push({ level: 'medium', title: t.paybackLongTitle, reason: t.paybackLongReason, suggestedAction: t.paybackLongAction });
  }
  if (documentsCount === 0) {
    risks.push({ level: 'low', title: t.noDocumentsTitle, reason: t.noDocumentsReason, suggestedAction: t.noDocumentsAction });
    missingData.push(missing(t.documents, t.noDocumentsReason, 'documents'));
    nextActions.push(action('medium', t.uploadDocs, t.uploadDocsDesc, t.noDocumentsAction));
  }
  if (endDate && endDate < new Date() && !['completed', 'complete', 'done'].includes(status)) {
    risks.push({ level: 'medium', title: t.endPassedTitle, reason: t.endPassedReason, suggestedAction: t.endPassedAction });
  }
  if (kpis.negativeCash) {
    risks.push({ level: 'high', title: t.negativeCashTitle, reason: t.negativeCashReason, suggestedAction: t.negativeCashAction });
  }
  if (savings > 0 && capital > savings * 0.5) {
    risks.push({ level: capital > savings ? 'high' : 'medium', title: t.capitalSavingsTitle, reason: t.capitalSavingsReason, suggestedAction: t.capitalSavingsAction });
  }
  if (taskSummary.total === 0) {
    missingData.push(missing(t.tasks, t.overdueTasksReason, 'tasks'));
  }
  if (!context.kpiAvailable) {
    missingData.push(missing(t.kpis, t.financialMissingReason, 'kpis'));
  }

  if (nextActions.length === 0) {
    nextActions.push(action('medium', t.reviewFinancials, t.reviewFinancialsDesc, t.needsReviewExplanation));
  }

  const highRisks = risks.filter(risk => risk.level === 'high').length;
  const availableBlocks = [!financialMissing, !feasibilityMissing, taskSummary.total > 0, documentsCount > 0].filter(Boolean).length;
  const summaryStatus: AdvisorStatus = highRisks > 0
    ? 'high_risk'
    : availableBlocks <= 1
      ? 'incomplete'
      : risks.length > 0
        ? 'needs_review'
        : 'strong';

  const summary = summaryStatus === 'high_risk'
    ? { status: summaryStatus, headline: t.highRiskHeadline, explanation: t.highRiskExplanation }
    : summaryStatus === 'incomplete'
      ? { status: summaryStatus, headline: t.incompleteHeadline, explanation: t.incompleteExplanation }
      : summaryStatus === 'strong'
        ? { status: summaryStatus, headline: t.strongHeadline, explanation: t.strongExplanation }
        : { status: summaryStatus, headline: t.needsReviewHeadline, explanation: t.needsReviewExplanation };

  const phase = status || String(parseRecord(project?.notes).current_phase ?? '').toLowerCase();
  const basePlan = ['idea', 'study', 'planning'].includes(phase)
    ? t.earlyPlan
    : ['setup', 'launch', 'active'].includes(phase)
      ? t.setupPlan
      : t.growthPlan;

  const plan90 = [
    { period: 'days_1_30' as const, actions: [...basePlan] },
    { period: 'days_31_60' as const, actions: nextActions.slice(0, 3).map(item => item.description) },
    { period: 'days_61_90' as const, actions: [t.reviewFinancialsDesc, t.handleLateTasksDesc, t.uploadDocsDesc] },
  ];

  const response: AdvisorResponse = {
    success: true,
    source: 'rules',
    message: t.providerMissing,
    summary,
    risks: risks.slice(0, 6),
    nextActions: nextActions.slice(0, 5),
    plan90,
    missingData,
    disclaimer: t.disclaimer,
  };

  if (mode === 'chat') {
    response.chatAnswer = {
      answer: `${t.chatFallback}${question ? ` ${question}` : ''}`,
      assumptions: missingData.slice(0, 3).map(item => item.field),
      suggestedActions: nextActions.slice(0, 3).map(item => item.title),
      disclaimer: t.disclaimer,
    };
  }
  return response;
}

function normalizeAdvisor(value: unknown, fallback: AdvisorResponse): AdvisorResponse | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, any>;
  const summaryRaw = raw.summary && typeof raw.summary === 'object' ? raw.summary as Record<string, any> : {};
  const status = ['strong', 'needs_review', 'high_risk', 'incomplete'].includes(summaryRaw.status) ? summaryRaw.status as AdvisorStatus : fallback.summary.status;
  const risks = Array.isArray(raw.risks) ? raw.risks.slice(0, 8).map((risk: any) => ({
    level: ['low', 'medium', 'high'].includes(risk?.level) ? risk.level as RiskLevel : 'medium',
    title: String(risk?.title || ''),
    reason: String(risk?.reason || ''),
    suggestedAction: String(risk?.suggestedAction || ''),
  })).filter((risk: any) => risk.title && risk.reason) : fallback.risks;
  const nextActions = Array.isArray(raw.nextActions) ? raw.nextActions.slice(0, 6).map((item: any) => ({
    priority: ['low', 'medium', 'high'].includes(item?.priority) ? item.priority as Priority : 'medium',
    title: String(item?.title || ''),
    description: String(item?.description || ''),
    estimatedImpact: String(item?.estimatedImpact || ''),
  })).filter((item: any) => item.title && item.description) : fallback.nextActions;
  const plan90 = Array.isArray(raw.plan90) ? raw.plan90.slice(0, 3).map((period: any, index: number) => ({
    period: ['days_1_30', 'days_31_60', 'days_61_90'].includes(period?.period) ? period.period as PlanPeriod : (['days_1_30', 'days_31_60', 'days_61_90'][index] as PlanPeriod),
    actions: Array.isArray(period?.actions) ? period.actions.map((actionItem: unknown) => String(actionItem)).filter(Boolean).slice(0, 5) : [],
  })) : fallback.plan90;
  const missingData = Array.isArray(raw.missingData) ? raw.missingData.slice(0, 10).map((item: any) => ({
    field: String(item?.field || ''),
    whyItMatters: String(item?.whyItMatters || ''),
    tab: ['overview', 'feasibility', 'financial', 'tasks', 'documents', 'kpis'].includes(item?.tab) ? item.tab as TabTarget : undefined,
  })).filter((item: any) => item.field && item.whyItMatters) : fallback.missingData;
  const chatRaw = raw.chatAnswer && typeof raw.chatAnswer === 'object' ? raw.chatAnswer as Record<string, any> : null;
  return {
    success: true,
    source: 'ai',
    summary: {
      status,
      headline: String(summaryRaw.headline || fallback.summary.headline),
      explanation: String(summaryRaw.explanation || fallback.summary.explanation),
    },
    risks,
    nextActions,
    plan90,
    missingData,
    disclaimer: String(raw.disclaimer || fallback.disclaimer),
    chatAnswer: chatRaw ? {
      answer: String(chatRaw.answer || ''),
      assumptions: Array.isArray(chatRaw.assumptions) ? chatRaw.assumptions.map((item: unknown) => String(item)).filter(Boolean) : [],
      suggestedActions: Array.isArray(chatRaw.suggestedActions) ? chatRaw.suggestedActions.map((item: unknown) => String(item)).filter(Boolean) : [],
      disclaimer: String(chatRaw.disclaimer || fallback.disclaimer),
    } : fallback.chatAnswer,
  };
}

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

async function runAi(context: Record<string, any>, fallback: AdvisorResponse, mode: AdvisorMode, lang: Lang, question?: string) {
  const provider = getProvider();
  if (!provider) return fallback;

  const languageName = lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : 'English';
  const prompt = [
    `Language: ${languageName}`,
    `Mode: ${mode}`,
    question ? `User question: ${question}` : '',
    'Use only the JSON project context. Do not invent market size, revenue, customers, funding, legal status, or success claims.',
    'If data is missing, explicitly list it in missingData. Keep the tone educational and planning-focused.',
    'Return valid JSON only with this shape: {"success":true,"source":"ai","summary":{"status":"strong|needs_review|high_risk|incomplete","headline":"","explanation":""},"risks":[{"level":"low|medium|high","title":"","reason":"","suggestedAction":""}],"nextActions":[{"priority":"low|medium|high","title":"","description":"","estimatedImpact":""}],"plan90":[{"period":"days_1_30|days_31_60|days_61_90","actions":[""]}],"missingData":[{"field":"","whyItMatters":"","tab":"overview|feasibility|financial|tasks|documents|kpis"}],"disclaimer":"","chatAnswer":{"answer":"","assumptions":[""],"suggestedActions":[""],"disclaimer":""}}',
    `Project context: ${JSON.stringify(context).slice(0, 18000)}`,
  ].filter(Boolean).join('\n\n');

  try {
    const { text } = await generateText({
      model: provider('claude-haiku-4-5-20251001'),
      system: 'You are a project planning analyst for THE SFM. You produce structured JSON only. You never fabricate missing project data or make guaranteed legal, financial, or success claims.',
      prompt,
      maxTokens: 1800,
    });
    return normalizeAdvisor(extractJson(text), fallback) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase(token);
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 500 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { mode?: AdvisorMode; question?: string; lang?: Lang };
  const mode: AdvisorMode = ['summary', 'risks', 'actions', 'plan90', 'report', 'chat'].includes(body.mode as AdvisorMode) ? body.mode as AdvisorMode : 'summary';
  const lang: Lang = ['ar', 'en', 'fr'].includes(body.lang as Lang) ? body.lang as Lang : 'en';
  const { id } = await params;

  const projectRes = await supabase.from('projects').select('*').eq('user_id', user.id).eq('id', id).maybeSingle();
  if (projectRes.error) return NextResponse.json({ success: false, error: 'Could not load project' }, { status: 500 });
  if (!projectRes.data) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

  const [
    feasibilityRes,
    financialRes,
    taskRes,
    milestoneRes,
    documentRes,
    savingsRes,
    projectIncomeRes,
    projectExpenseRes,
    legacyExpenseRes,
    incomeRes,
  ] = await Promise.all([
    (supabase as any).from('project_feasibility_studies').select('*').eq('user_id', user.id).eq('project_id', id).maybeSingle(),
    (supabase as any).from('project_financial_models').select('*').eq('user_id', user.id).eq('project_id', id).maybeSingle(),
    (supabase as any).from('project_tasks').select('*').eq('user_id', user.id).eq('project_id', id),
    (supabase as any).from('project_milestones').select('*').eq('user_id', user.id).eq('project_id', id),
    (supabase as any).from('project_documents').select('id,title,category,file_name,file_type,file_size,uploaded_at').eq('user_id', user.id).eq('project_id', id),
    supabase.from('savings_items').select('amount').eq('user_id', user.id),
    (supabase as any).from('project_income').select('id,title,amount,income_date,created_at').eq('user_id', user.id).eq('project_id', id),
    (supabase as any).from('project_expenses').select('id,title,amount,expense_date,created_at').eq('user_id', user.id).eq('project_id', id),
    (supabase as any).from('expense_items').select('id,name,amount,created_at,enhanced').eq('user_id', user.id),
    (supabase as any).from('monthly_income_sources').select('*').eq('user_id', user.id),
  ]);

  const legacyProjectExpenses = (legacyExpenseRes.error ? [] : legacyExpenseRes.data ?? []).filter((item: any) => {
    const enhanced = parseRecord(item.enhanced);
    const linkedProjectExpenseId = String(enhanced.project_expense_id ?? enhanced.projectExpenseId ?? '').trim();
    if (linkedProjectExpenseId) return false;
    return enhanced.project_id === id || enhanced.projectId === id || enhanced.linked_project_id === id || enhanced.project?.id === id;
  });
  const projectExpenses = [
    ...(projectExpenseRes.error ? [] : projectExpenseRes.data ?? []),
    ...legacyProjectExpenses,
  ];

  const context = {
    project: projectRes.data,
    feasibilityStudy: feasibilityRes.error ? null : feasibilityRes.data,
    financialModel: financialRes.error ? null : financialRes.data,
    tasks: taskRes.error ? [] : taskRes.data ?? [],
    milestones: milestoneRes.error ? [] : milestoneRes.data ?? [],
    documents: documentRes.error ? [] : documentRes.data ?? [],
    documentsCount: documentRes.error ? 0 : (documentRes.data ?? []).length,
    savingsTotal: savingsRes.error ? 0 : (savingsRes.data ?? []).reduce((sum: number, row: any) => sum + toNum(row.amount), 0),
    projectIncome: projectIncomeRes.error ? [] : projectIncomeRes.data ?? [],
    linkedIncomeTotal: projectIncomeRes.error ? 0 : (projectIncomeRes.data ?? []).reduce((sum: number, row: any) => sum + toNum(row.amount), 0),
    linkedExpenseTotal: projectExpenses.reduce((sum: number, row: any) => sum + toNum(row.amount), 0),
    incomeTotal: incomeRes.error ? null : personalIncomeRows(incomeRes.data ?? []).reduce((sum: number, row: any) => sum + toNum(row.amount), 0),
    kpiAvailable: !financialRes.error && !!financialRes.data,
  };

  const fallback = buildRulesResponse(context, lang, mode, body.question);
  const result = await runAi(context, fallback, mode, lang, body.question);
  return NextResponse.json(result);
}
