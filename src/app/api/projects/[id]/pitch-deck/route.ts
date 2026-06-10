import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { personalIncomeRows } from '@/lib/data/financeData';

type Lang = 'ar' | 'en' | 'fr';
type PitchMode = 'generate' | 'improve_slide' | 'report_missing_data';
type SlideStatus = 'complete' | 'needs_data' | 'not_ready';
type DeckSource = 'ai' | 'rules';
type SlideId =
  | 'cover'
  | 'problem'
  | 'solution'
  | 'product'
  | 'market'
  | 'business_model'
  | 'competition'
  | 'go_to_market'
  | 'financial_plan'
  | 'roadmap'
  | 'risks'
  | 'funding_ask';

type PitchSlide = {
  id: SlideId;
  title: string;
  status: SlideStatus;
  content: {
    headline: string;
    bullets: string[];
    metrics: Array<{ label: string; value: string }>;
    notes: string;
  };
  missingData: Array<{ label: string; tab: 'overview' | 'feasibility' | 'financial' | 'tasks' | 'kpis' }>;
  suggestions: string[];
};

type PitchDeck = {
  projectName: string;
  language: Lang;
  completionPercent: number;
  readinessLabel: string;
  slides: PitchSlide[];
  generatedAt: string;
};

const TEXT = {
  ar: {
    noData: 'هذه البيانات غير مكتملة. أضفها من تبويب دراسة الجدوى أو النموذج المالي.',
    sourceMissing: 'مزود الذكاء الاصطناعي غير مفعل. تم إنشاء العرض بقواعد تحليلية.',
    disclaimer: 'هذا العرض تم إنشاؤه لأغراض التخطيط والعرض الأولي فقط. يجب مراجعة الأرقام والمعلومات قبل مشاركته مع المستثمرين أو الجهات الرسمية.',
    ready: 'جاهز للمراجعة',
    improve: 'يحتاج تحسين',
    notReady: 'غير جاهز للمستثمر',
    cover: 'الغلاف',
    problem: 'المشكلة',
    solution: 'الحل',
    product: 'المنتج أو الخدمة',
    market: 'فرصة السوق',
    businessModel: 'نموذج الربح',
    competition: 'المنافسون والميزة التنافسية',
    goToMarket: 'خطة دخول السوق',
    financialPlan: 'الخطة المالية',
    roadmap: 'خطة التنفيذ',
    risks: 'المخاطر وخطة التخفيف',
    fundingAsk: 'التمويل المطلوب والخطوة القادمة',
    complete: 'مكتملة',
    needsData: 'تحتاج بيانات',
    notReadyStatus: 'غير جاهزة',
    projectName: 'اسم المشروع',
    projectType: 'نوع المشروع',
    projectStatus: 'حالة المشروع',
    projectDescription: 'وصف المشروع',
    problemSolved: 'المشكلة التي يحلها المشروع',
    targetCustomers: 'شريحة العملاء المستهدفة',
    marketSize: 'حجم السوق المتوقع',
    competitiveAdvantage: 'الميزة التنافسية',
    pricingStrategy: 'استراتيجية التسعير',
    acquisitionChannels: 'قنوات الوصول للعملاء',
    competitors: 'المنافسون الرئيسيون',
    requiredCapital: 'رأس المال المطلوب',
    expectedRevenue: 'الإيرادات المتوقعة',
    operatingCosts: 'التكاليف التشغيلية',
    revenueStreams: 'مصادر الإيراد',
    tasksTimeline: 'المهام والمعالم',
    kpis: 'المؤشرات المالية',
    documents: 'مستندات المشروع',
    introHeadline: 'عرض استثماري أولي مبني على بيانات المشروع المسجلة في THE SFM.',
    missingHeadline: 'البيانات غير مكتملة',
    missingSuggestion: 'أكمل البيانات الناقصة قبل مشاركة هذا العرض مع مستثمرين أو جهات رسمية.',
    reviewSuggestion: 'راجع هذه الشريحة وتأكد من أن كل رقم مدخل ومحدث.',
    improveWording: 'صياغة الشريحة بصورة أكثر اختصارا ووضوحا.',
    projectStage: 'مرحلة المشروع',
    totalRevenue: 'إجمالي الإيرادات المتوقعة',
    totalProfit: 'إجمالي الربح المتوقع',
    roi: 'ROI',
    breakEven: 'نقطة التعادل',
    payback: 'فترة الاسترداد',
    taskProgress: 'تقدم المهام',
    completedMilestones: 'المعالم المكتملة',
    documentsCount: 'عدد المستندات',
  },
  en: {
    noData: 'This information is incomplete. Add it from the Feasibility or Financial Model tab.',
    sourceMissing: 'AI provider is not configured. The deck was generated with analytical rules.',
    disclaimer: 'This pitch deck is generated for planning and preliminary presentation purposes only. Review all numbers and information before sharing with investors or official entities.',
    ready: 'Ready for review',
    improve: 'Needs improvement',
    notReady: 'Not investor-ready',
    cover: 'Cover',
    problem: 'Problem',
    solution: 'Solution',
    product: 'Product / Service',
    market: 'Market Opportunity',
    businessModel: 'Business Model',
    competition: 'Competition & Advantage',
    goToMarket: 'Go-To-Market Plan',
    financialPlan: 'Financial Plan',
    roadmap: 'Execution Roadmap',
    risks: 'Risks & Mitigation',
    fundingAsk: 'Funding Ask / Next Step',
    complete: 'Complete',
    needsData: 'Needs data',
    notReadyStatus: 'Not ready',
    projectName: 'Project name',
    projectType: 'Project type',
    projectStatus: 'Project status',
    projectDescription: 'Project description',
    problemSolved: 'Problem solved by the project',
    targetCustomers: 'Target customer segment',
    marketSize: 'Expected market size',
    competitiveAdvantage: 'Competitive advantage',
    pricingStrategy: 'Pricing strategy',
    acquisitionChannels: 'Customer acquisition channels',
    competitors: 'Main competitors',
    requiredCapital: 'Required capital',
    expectedRevenue: 'Expected revenue',
    operatingCosts: 'Operating costs',
    revenueStreams: 'Revenue streams',
    tasksTimeline: 'Tasks and milestones',
    kpis: 'Financial KPIs',
    documents: 'Project documents',
    introHeadline: 'Preliminary investor deck based on recorded THE SFM project data.',
    missingHeadline: 'Information is incomplete',
    missingSuggestion: 'Complete missing data before sharing this deck with investors or official entities.',
    reviewSuggestion: 'Review this slide and confirm every number is entered and current.',
    improveWording: 'Make the slide wording more concise and clearer.',
    projectStage: 'Project stage',
    totalRevenue: 'Total projected revenue',
    totalProfit: 'Total projected profit',
    roi: 'ROI',
    breakEven: 'Break-even',
    payback: 'Payback period',
    taskProgress: 'Task progress',
    completedMilestones: 'Completed milestones',
    documentsCount: 'Documents count',
  },
  fr: {
    noData: 'Ces informations sont incomplètes. Ajoutez-les depuis l’onglet Faisabilité ou Modèle financier.',
    sourceMissing: 'Le fournisseur IA n’est pas configuré. Le pitch deck a été généré avec des règles analytiques.',
    disclaimer: 'Ce pitch deck est généré à des fins de planification et de présentation préliminaire uniquement. Vérifiez tous les chiffres et informations avant de le partager avec des investisseurs ou des organismes officiels.',
    ready: 'Prêt pour révision',
    improve: 'À améliorer',
    notReady: 'Pas prêt pour investisseur',
    cover: 'Couverture',
    problem: 'Problème',
    solution: 'Solution',
    product: 'Produit / Service',
    market: 'Opportunité de marché',
    businessModel: 'Modèle économique',
    competition: 'Concurrence & avantage',
    goToMarket: 'Plan de mise sur le marché',
    financialPlan: 'Plan financier',
    roadmap: 'Feuille de route',
    risks: 'Risques & mitigation',
    fundingAsk: 'Financement demandé / prochaine étape',
    complete: 'Complète',
    needsData: 'Données nécessaires',
    notReadyStatus: 'Non prête',
    projectName: 'Nom du projet',
    projectType: 'Type de projet',
    projectStatus: 'Statut du projet',
    projectDescription: 'Description du projet',
    problemSolved: 'Problème résolu par le projet',
    targetCustomers: 'Segment client cible',
    marketSize: 'Taille estimée du marché',
    competitiveAdvantage: 'Avantage concurrentiel',
    pricingStrategy: 'Stratégie de prix',
    acquisitionChannels: 'Canaux d’acquisition client',
    competitors: 'Principaux concurrents',
    requiredCapital: 'Capital requis',
    expectedRevenue: 'Revenu attendu',
    operatingCosts: 'Coûts opérationnels',
    revenueStreams: 'Sources de revenus',
    tasksTimeline: 'Tâches et jalons',
    kpis: 'KPI financiers',
    documents: 'Documents du projet',
    introHeadline: 'Pitch deck investisseur préliminaire basé sur les données enregistrées dans THE SFM.',
    missingHeadline: 'Informations incomplètes',
    missingSuggestion: 'Complétez les données manquantes avant de partager ce deck.',
    reviewSuggestion: 'Vérifiez cette diapositive et confirmez que chaque chiffre est saisi et à jour.',
    improveWording: 'Rendre le texte de la diapositive plus concis et plus clair.',
    projectStage: 'Phase du projet',
    totalRevenue: 'Revenu projeté total',
    totalProfit: 'Profit projeté total',
    roi: 'ROI',
    breakEven: 'Point mort',
    payback: 'Période de récupération',
    taskProgress: 'Progression des tâches',
    completedMilestones: 'Jalons terminés',
    documentsCount: 'Nombre de documents',
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

function textValue(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function toNum(value: unknown) {
  const number = Number(String(value ?? 0).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function money(value: unknown, currency = 'KWD') {
  const amount = toNum(value);
  return amount > 0 ? `${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ${currency}` : '';
}

function pct(value: unknown) {
  const number = toNum(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : '';
}

function missing(label: string, tab: PitchSlide['missingData'][number]['tab']) {
  return { label, tab };
}

function statusFor(missingCount: number, evidenceCount: number): SlideStatus {
  if (evidenceCount === 0 || missingCount >= 3) return 'not_ready';
  if (missingCount > 0) return 'needs_data';
  return 'complete';
}

function compact(values: string[]) {
  return values.map(value => String(value ?? '').trim()).filter(Boolean);
}

function slide(id: SlideId, title: string, missingData: PitchSlide['missingData'], content: PitchSlide['content'], suggestions: string[]): PitchSlide {
  const evidence = content.bullets.length + content.metrics.length + (content.headline ? 1 : 0);
  return {
    id,
    title,
    status: statusFor(missingData.length, evidence),
    content,
    missingData,
    suggestions,
  };
}

function taskStats(tasks: Array<Record<string, any>>, milestones: Array<Record<string, any>>) {
  const doneTasks = tasks.filter(task => String(task.status ?? '').toLowerCase() === 'done').length;
  const completedMilestones = milestones.filter(item => ['completed', 'done'].includes(String(item.status ?? '').toLowerCase())).length;
  return {
    progress: tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0,
    doneTasks,
    totalTasks: tasks.length,
    completedMilestones,
    totalMilestones: milestones.length,
  };
}

function buildRuleDeck(context: Record<string, any>, language: Lang): PitchDeck {
  const t = TEXT[language] ?? TEXT.en;
  const project = parseRecord(context.project);
  const notes = parseRecord(project.notes);
  const feasibility = parseRecord(context.feasibilityStudy);
  const market = parseRecord(feasibility.market_data);
  const technical = parseRecord(feasibility.technical_data);
  const financialFeasibility = parseRecord(feasibility.financial_data);
  const financialModel = parseRecord(context.financialModel);
  const assumptions = parseRecord(financialModel.assumptions);
  const revenueStreams = arrayValue(financialModel.revenue_streams);
  const costItems = arrayValue(financialModel.cost_items);
  const kpis = parseRecord(financialModel.kpis);
  const forecast = arrayValue(financialModel.forecast);
  const tasks = arrayValue(context.tasks);
  const milestones = arrayValue(context.milestones);
  const documents = arrayValue(context.documents);
  const taskSummary = taskStats(tasks, milestones);
  const currency = textValue(notes.currency, assumptions.currency, project.currency, 'KWD');
  const projectName = textValue(project.name, t.projectName);
  const projectType = textValue(notes.category, notes.project_type, project.category, t.projectType);
  const projectStatus = textValue(notes.status, project.status, notes.current_phase, t.projectStatus);
  const projectDescription = textValue(notes.description, notes.idea, project.description);
  const totalRevenue = textValue(money(kpis.totalRevenue, currency), forecast.length ? money(forecast.reduce((sum, row) => sum + toNum(row.revenue), 0), currency) : '');
  const totalProfit = textValue(money(kpis.totalProfit, currency), forecast.length ? money(forecast.reduce((sum, row) => sum + toNum(row.netProfit), 0), currency) : '');
  const requiredCapital = textValue(money(financialFeasibility.requiredCapital, currency), money(notes.capital, currency), money(project.budget, currency));
  const opex = textValue(money(financialFeasibility.monthlyOpex, currency), costItems.length ? money(costItems.reduce((sum, item) => sum + toNum(item.monthlyCost), 0), currency) : '');
  const revenueLabels = revenueStreams.map(item => textValue(item.name, item.title)).filter(Boolean);
  const riskBullets = compact([
    !context.hasFinancialModel ? t.requiredCapital : '',
    toNum(kpis.roi) < 0 ? t.roi : '',
    taskSummary.totalTasks > 0 && taskSummary.progress < 40 ? t.tasksTimeline : '',
    documents.length === 0 ? t.documents : '',
  ]);

  const slides = [
    slide('cover', t.cover, compact([
      !projectName || projectName === t.projectName ? t.projectName : '',
      !projectType || projectType === t.projectType ? t.projectType : '',
    ]).map(label => missing(label, 'overview')), {
      headline: projectName,
      bullets: compact([projectType, projectStatus, t.introHeadline]),
      metrics: compact([
        requiredCapital ? `${t.requiredCapital}|${requiredCapital}` : '',
        taskSummary.totalTasks ? `${t.taskProgress}|${taskSummary.progress}%` : '',
      ]).map(item => {
        const [label, value] = item.split('|');
        return { label, value };
      }),
      notes: t.disclaimer,
    }, [t.reviewSuggestion]),
    slide('problem', t.problem, compact([
      !market.problemSolved ? t.problemSolved : '',
      !market.targetCustomers ? t.targetCustomers : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.problemSolved, t.missingHeadline),
      bullets: compact([market.targetCustomers, market.marketSize]),
      metrics: [],
      notes: market.problemSolved ? t.reviewSuggestion : t.noData,
    }, [t.improveWording, t.missingSuggestion]),
    slide('solution', t.solution, compact([
      !projectDescription ? t.projectDescription : '',
      !market.competitiveAdvantage ? t.competitiveAdvantage : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.competitiveAdvantage, projectDescription, t.missingHeadline),
      bullets: compact([projectDescription, technical.requiredResources, technical.requiredTechnology]),
      metrics: [],
      notes: projectDescription ? t.reviewSuggestion : t.noData,
    }, [t.improveWording]),
    slide('product', t.product, compact([
      !projectDescription ? t.projectDescription : '',
      !technical.operationalSetup ? t.projectStage : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(projectDescription, t.missingHeadline),
      bullets: compact([technical.operationalSetup, technical.requiredResources, technical.implementationChallenges, projectStatus]),
      metrics: [],
      notes: t.reviewSuggestion,
    }, [t.missingSuggestion]),
    slide('market', t.market, compact([
      !market.targetCustomers ? t.targetCustomers : '',
      !market.marketSize ? t.marketSize : '',
      !market.acquisitionChannels ? t.acquisitionChannels : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.targetCustomers, t.missingHeadline),
      bullets: compact([market.marketSize, market.acquisitionChannels, market.pricingStrategy]),
      metrics: [],
      notes: market.marketSize ? t.reviewSuggestion : t.noData,
    }, [t.missingSuggestion]),
    slide('business_model', t.businessModel, compact([
      !revenueLabels.length ? t.revenueStreams : '',
      !market.pricingStrategy ? t.pricingStrategy : '',
    ]).map(label => missing(label, label === t.revenueStreams ? 'financial' : 'feasibility')), {
      headline: textValue(market.pricingStrategy, revenueLabels.join(', '), t.missingHeadline),
      bullets: compact([...revenueLabels, market.pricingStrategy, financialFeasibility.expectedProfitMargin]),
      metrics: compact([
        totalRevenue ? `${t.totalRevenue}|${totalRevenue}` : '',
        totalProfit ? `${t.totalProfit}|${totalProfit}` : '',
      ]).map(item => {
        const [label, value] = item.split('|');
        return { label, value };
      }),
      notes: t.reviewSuggestion,
    }, [t.improveWording]),
    slide('competition', t.competition, compact([
      !market.competitors ? t.competitors : '',
      !market.competitiveAdvantage ? t.competitiveAdvantage : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.competitiveAdvantage, t.missingHeadline),
      bullets: compact([market.competitors, market.competitiveAdvantage]),
      metrics: [],
      notes: market.competitors ? t.reviewSuggestion : t.noData,
    }, [t.missingSuggestion]),
    slide('go_to_market', t.goToMarket, compact([
      !market.acquisitionChannels ? t.acquisitionChannels : '',
      !market.pricingStrategy ? t.pricingStrategy : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.acquisitionChannels, t.missingHeadline),
      bullets: compact([market.acquisitionChannels, market.pricingStrategy, ...tasks.slice(0, 3).map(task => textValue(task.title))]),
      metrics: [],
      notes: t.reviewSuggestion,
    }, [t.improveWording]),
    slide('financial_plan', t.financialPlan, compact([
      !requiredCapital ? t.requiredCapital : '',
      !totalRevenue ? t.expectedRevenue : '',
      !opex ? t.operatingCosts : '',
    ]).map(label => missing(label, 'financial')), {
      headline: textValue(requiredCapital ? `${t.requiredCapital}: ${requiredCapital}` : '', t.missingHeadline),
      bullets: compact([totalRevenue ? `${t.totalRevenue}: ${totalRevenue}` : '', totalProfit ? `${t.totalProfit}: ${totalProfit}` : '', opex ? `${t.operatingCosts}: ${opex}` : '']),
      metrics: compact([
        requiredCapital ? `${t.requiredCapital}|${requiredCapital}` : '',
        kpis.roi !== undefined ? `${t.roi}|${pct(kpis.roi)}` : '',
        kpis.breakEvenMonth ? `${t.breakEven}|${kpis.breakEvenMonth}` : '',
        kpis.paybackPeriod ? `${t.payback}|${kpis.paybackPeriod}` : '',
      ]).map(item => {
        const [label, value] = item.split('|');
        return { label, value };
      }),
      notes: totalRevenue ? t.reviewSuggestion : t.noData,
    }, [t.missingSuggestion]),
    slide('roadmap', t.roadmap, compact([
      !taskSummary.totalTasks && !taskSummary.totalMilestones ? t.tasksTimeline : '',
    ]).map(label => missing(label, 'tasks')), {
      headline: taskSummary.totalTasks ? `${t.taskProgress}: ${taskSummary.progress}%` : t.missingHeadline,
      bullets: compact([...milestones.slice(0, 4).map(item => textValue(item.title)), ...tasks.slice(0, 4).map(item => textValue(item.title))]),
      metrics: [
        { label: t.taskProgress, value: `${taskSummary.progress}%` },
        { label: t.completedMilestones, value: `${taskSummary.completedMilestones}/${taskSummary.totalMilestones}` },
      ],
      notes: t.reviewSuggestion,
    }, [t.missingSuggestion]),
    slide('risks', t.risks, [], {
      headline: riskBullets.length ? t.risks : t.reviewSuggestion,
      bullets: riskBullets.length ? riskBullets : [t.reviewSuggestion],
      metrics: [{ label: t.documentsCount, value: String(documents.length) }],
      notes: t.disclaimer,
    }, [t.missingSuggestion]),
    slide('funding_ask', t.fundingAsk, compact([
      !requiredCapital ? t.requiredCapital : '',
      !financialFeasibility.capex ? 'CAPEX' : '',
    ]).map(label => missing(label, 'financial')), {
      headline: requiredCapital ? `${t.requiredCapital}: ${requiredCapital}` : t.missingHeadline,
      bullets: compact([financialFeasibility.capex ? `CAPEX: ${money(financialFeasibility.capex, currency)}` : '', technical.requiredResources, t.disclaimer]),
      metrics: requiredCapital ? [{ label: t.requiredCapital, value: requiredCapital }] : [],
      notes: requiredCapital ? t.reviewSuggestion : t.noData,
    }, [t.missingSuggestion]),
  ] satisfies PitchSlide[];

  const completionPercent = Math.round(slides.reduce((sum, item) => sum + (item.status === 'complete' ? 100 : item.status === 'needs_data' ? 50 : 0), 0) / slides.length);
  return {
    projectName,
    language,
    completionPercent,
    readinessLabel: completionPercent >= 80 ? t.ready : completionPercent >= 45 ? t.improve : t.notReady,
    slides,
    generatedAt: new Date().toISOString(),
  };
}

function mergeSavedDeck(deck: PitchDeck, savedDeck: unknown): PitchDeck {
  const saved = parseRecord(savedDeck);
  const savedSlides = arrayValue(saved.slides);
  if (!savedSlides.length) return deck;
  return {
    ...deck,
    slides: deck.slides.map(item => {
      const savedSlide = savedSlides.find(slideItem => slideItem.id === item.id);
      if (!savedSlide) return item;
      const savedContent = parseRecord(savedSlide.content);
      return {
        ...item,
        content: {
          ...item.content,
          headline: textValue(savedContent.headline, item.content.headline),
          bullets: Array.isArray(savedContent.bullets) ? savedContent.bullets.map(value => String(value)).filter(Boolean) : item.content.bullets,
          notes: textValue(savedContent.notes, item.content.notes),
        },
      };
    }),
  };
}

function normalizeDeck(value: unknown, fallback: PitchDeck): PitchDeck | null {
  const raw = parseRecord(value);
  const rawDeck = parseRecord(raw.deck ?? raw);
  const slides = arrayValue(rawDeck.slides);
  if (!slides.length) return null;
  const normalizedSlides = fallback.slides.map(baseSlide => {
    const incoming = slides.find(item => item.id === baseSlide.id);
    if (!incoming) return baseSlide;
    const content = parseRecord(incoming.content);
    const metrics = Array.isArray(content.metrics) ? content.metrics.map((metric: any) => ({
      label: String(metric?.label ?? ''),
      value: String(metric?.value ?? ''),
    })).filter(metric => metric.label && metric.value).slice(0, 5) : baseSlide.content.metrics;
    return {
      ...baseSlide,
      content: {
        headline: textValue(content.headline, baseSlide.content.headline),
        bullets: Array.isArray(content.bullets) ? content.bullets.map((bullet: unknown) => String(bullet)).filter(Boolean).slice(0, 6) : baseSlide.content.bullets,
        metrics,
        notes: textValue(content.notes, baseSlide.content.notes),
      },
      suggestions: Array.isArray(incoming.suggestions) ? incoming.suggestions.map((item: unknown) => String(item)).filter(Boolean).slice(0, 4) : baseSlide.suggestions,
    };
  });
  return { ...fallback, slides: normalizedSlides };
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

async function improveWithAi(deck: PitchDeck, context: Record<string, any>, mode: PitchMode, slideId?: string) {
  const provider = getProvider();
  if (!provider) return { source: 'rules' as DeckSource, deck };
  const languageName = deck.language === 'ar' ? 'Arabic' : deck.language === 'fr' ? 'French' : 'English';
  const prompt = [
    `Language: ${languageName}`,
    `Mode: ${mode}`,
    slideId ? `Slide to improve: ${slideId}` : '',
    'Improve wording and slide organization only. Use only the supplied deck and project context. Do not invent market size, revenue, traction, customers, competitors, funding numbers, legal status, or success claims.',
    'Keep missingData exactly truthful. Return valid JSON only in this format: {"deck":{"projectName":"","language":"ar|en|fr","completionPercent":0,"readinessLabel":"","slides":[{"id":"","title":"","status":"complete|needs_data|not_ready","content":{"headline":"","bullets":[],"metrics":[{"label":"","value":""}],"notes":""},"missingData":[{"label":"","tab":"overview|feasibility|financial|tasks|kpis"}],"suggestions":[]}]}}',
    `Current deck: ${JSON.stringify(deck).slice(0, 16000)}`,
    `Project context: ${JSON.stringify(context).slice(0, 10000)}`,
  ].filter(Boolean).join('\n\n');

  try {
    const { text } = await generateText({
      model: provider('claude-haiku-4-5-20251001'),
      system: 'You are an investor pitch deck editor for THE SFM. You output structured JSON only and never fabricate missing business data.',
      prompt,
      maxTokens: 3200,
    });
    const normalized = normalizeDeck(extractJson(text), deck);
    return { source: normalized ? 'ai' as DeckSource : 'rules' as DeckSource, deck: normalized ?? deck };
  } catch {
    return { source: 'rules' as DeckSource, deck };
  }
}

async function saveDeck(supabase: any, userId: string, projectId: string, deck: PitchDeck, source: DeckSource) {
  await supabase.from('project_pitch_decks').upsert({
    user_id: userId,
    project_id: projectId,
    language: deck.language,
    deck_data: deck,
    readiness_score: deck.completionPercent,
    source,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,project_id,language' });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase(token);
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 500 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { mode?: PitchMode; slideId?: string; language?: Lang };
  const mode: PitchMode = ['generate', 'improve_slide', 'report_missing_data'].includes(body.mode as PitchMode) ? body.mode as PitchMode : 'generate';
  const language: Lang = ['ar', 'en', 'fr'].includes(body.language as Lang) ? body.language as Lang : 'ar';
  const { id } = await params;

  const projectRes = await supabase.from('projects').select('*').eq('user_id', user.id).eq('id', id).maybeSingle();
  if (projectRes.error) return NextResponse.json({ success: false, error: 'Could not load project' }, { status: 500 });
  if (!projectRes.data) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

  const [feasibilityRes, financialRes, taskRes, milestoneRes, documentRes, deckRes, projectIncomeRes, projectExpenseRes, legacyExpenseRes, incomeRes] = await Promise.all([
    supabase.from('project_feasibility_studies').select('*').eq('user_id', user.id).eq('project_id', id).maybeSingle(),
    supabase.from('project_financial_models').select('*').eq('user_id', user.id).eq('project_id', id).maybeSingle(),
    supabase.from('project_tasks').select('*').eq('user_id', user.id).eq('project_id', id),
    supabase.from('project_milestones').select('*').eq('user_id', user.id).eq('project_id', id),
    supabase.from('project_documents').select('id,title,category,file_name,file_type,file_size,uploaded_at').eq('user_id', user.id).eq('project_id', id),
    supabase.from('project_pitch_decks').select('*').eq('user_id', user.id).eq('project_id', id).eq('language', language).maybeSingle(),
    supabase.from('project_income').select('id,title,amount,currency,income_date,created_at').eq('user_id', user.id).eq('project_id', id),
    supabase.from('project_expenses').select('id,title,amount,currency,expense_date,created_at').eq('user_id', user.id).eq('project_id', id),
    supabase.from('expense_items').select('id,name,amount,currency,created_at,enhanced').eq('user_id', user.id),
    supabase.from('monthly_income_sources').select('*').eq('user_id', user.id),
  ]);

  const legacyExpenses = (legacyExpenseRes.error ? [] : legacyExpenseRes.data ?? []).filter((item: any) => {
    const enhanced = parseRecord(item.enhanced);
    const linkedProjectExpenseId = String(enhanced.project_expense_id ?? enhanced.projectExpenseId ?? '').trim();
    if (linkedProjectExpenseId) return false;
    return enhanced.project_id === id || enhanced.projectId === id || enhanced.linked_project_id === id || enhanced.project?.id === id;
  });
  const expenses = [
    ...(projectExpenseRes.error ? [] : projectExpenseRes.data ?? []),
    ...legacyExpenses,
  ];

  const context = {
    project: projectRes.data,
    feasibilityStudy: feasibilityRes.error ? null : feasibilityRes.data,
    financialModel: financialRes.error ? null : financialRes.data,
    tasks: taskRes.error ? [] : taskRes.data ?? [],
    milestones: milestoneRes.error ? [] : milestoneRes.data ?? [],
    documents: documentRes.error ? [] : documentRes.data ?? [],
    projectIncome: projectIncomeRes.error ? [] : projectIncomeRes.data ?? [],
    projectIncomeTotal: projectIncomeRes.error ? 0 : (projectIncomeRes.data ?? []).reduce((sum: number, row: any) => sum + toNum(row.amount), 0),
    expenses,
    incomeTotal: incomeRes.error ? null : personalIncomeRows(incomeRes.data ?? []).reduce((sum: number, row: any) => sum + toNum(row.amount), 0),
    hasFinancialModel: !financialRes.error && !!financialRes.data,
  };

  const savedDeck = deckRes.error ? null : deckRes.data?.deck_data;
  const ruleDeck = mergeSavedDeck(buildRuleDeck(context, language), savedDeck);
  const aiResult = mode === 'report_missing_data' ? { source: 'rules' as DeckSource, deck: ruleDeck } : await improveWithAi(ruleDeck, context, mode, body.slideId);
  await saveDeck(supabase as any, user.id, id, aiResult.deck, aiResult.source).catch(() => undefined);

  return NextResponse.json({
    success: true,
    source: aiResult.source,
    message: aiResult.source === 'rules' ? TEXT[language].sourceMissing : undefined,
    deck: aiResult.deck,
  });
}
