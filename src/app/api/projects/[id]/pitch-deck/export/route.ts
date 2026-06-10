import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  buildPitchDeckPowerPoint,
  type PitchDeckExportData,
  type PitchDeckLanguage,
  type PitchDeckSlide,
  type PitchDeckSlideStatus,
} from '@/lib/projects/pitchDeckPowerPoint';

export const runtime = 'nodejs';

type DeckSource = 'ai' | 'rules';
type TabTarget = 'overview' | 'feasibility' | 'financial' | 'tasks' | 'kpis';

const EXPORT_TEXT = {
  ar: {
    noData: 'هذه البيانات غير مكتملة. أكملها من تبويب دراسة الجدوى أو النموذج المالي.',
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
    projectName: 'اسم المشروع',
    projectType: 'نوع المشروع',
    projectStatus: 'حالة المشروع',
    description: 'وصف المشروع',
    targetCustomers: 'شريحة العملاء المستهدفة',
    problemSolved: 'المشكلة التي يحلها المشروع',
    competitiveAdvantage: 'الميزة التنافسية',
    marketSize: 'حجم السوق المتوقع',
    competitors: 'المنافسون الرئيسيون',
    acquisitionChannels: 'قنوات الوصول للعملاء',
    pricingStrategy: 'استراتيجية التسعير',
    requiredCapital: 'رأس المال المطلوب',
    expectedRevenue: 'الإيرادات المتوقعة',
    operatingCosts: 'التكاليف التشغيلية',
    revenueStreams: 'مصادر الإيراد',
    taskProgress: 'تقدم المهام',
    documentsCount: 'عدد المستندات',
    milestones: 'المعالم',
    intro: 'عرض استثماري أولي مبني على بيانات المشروع المسجلة في THE SFM فقط.',
    missingHeadline: 'البيانات غير مكتملة',
    disclaimer: 'هذا العرض تم إنشاؤه لأغراض التخطيط والعرض الأولي فقط. يجب مراجعة جميع الأرقام والمعلومات قبل مشاركته مع المستثمرين أو الجهات الرسمية.',
    review: 'راجع هذه الشريحة وتأكد من أن كل رقم مدخل ومحدث.',
    missingSuggestion: 'أكمل البيانات الناقصة قبل مشاركة هذا العرض.',
  },
  en: {
    noData: 'This information is incomplete. Complete it from the Feasibility or Financial Model tab.',
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
    projectName: 'Project name',
    projectType: 'Project type',
    projectStatus: 'Project status',
    description: 'Project description',
    targetCustomers: 'Target customer segment',
    problemSolved: 'Problem solved by the project',
    competitiveAdvantage: 'Competitive advantage',
    marketSize: 'Expected market size',
    competitors: 'Main competitors',
    acquisitionChannels: 'Customer acquisition channels',
    pricingStrategy: 'Pricing strategy',
    requiredCapital: 'Required capital',
    expectedRevenue: 'Expected revenue',
    operatingCosts: 'Operating costs',
    revenueStreams: 'Revenue streams',
    taskProgress: 'Task progress',
    documentsCount: 'Documents count',
    milestones: 'Milestones',
    intro: 'Preliminary investor deck based only on recorded THE SFM project data.',
    missingHeadline: 'Information is incomplete',
    disclaimer: 'This pitch deck is generated for planning and preliminary presentation purposes only. Review all numbers and information before sharing with investors or official entities.',
    review: 'Review this slide and confirm every number is entered and current.',
    missingSuggestion: 'Complete missing data before sharing this deck.',
  },
  fr: {
    noData: 'Ces informations sont incomplètes. Complétez-les depuis l’onglet Faisabilité ou Modèle financier.',
    ready: 'Prêt pour révision',
    improve: 'À améliorer',
    notReady: 'Pas prêt pour investisseur',
    cover: 'Couverture',
    problem: 'Problème',
    solution: 'Solution',
    product: 'Produit / Service',
    market: 'Opportunité de marché',
    businessModel: 'Modèle économique',
    competition: 'Concurrence et avantage',
    goToMarket: 'Plan de mise sur le marché',
    financialPlan: 'Plan financier',
    roadmap: 'Feuille de route',
    risks: 'Risques et mitigation',
    fundingAsk: 'Financement demandé / prochaine étape',
    projectName: 'Nom du projet',
    projectType: 'Type de projet',
    projectStatus: 'Statut du projet',
    description: 'Description du projet',
    targetCustomers: 'Segment client cible',
    problemSolved: 'Problème résolu par le projet',
    competitiveAdvantage: 'Avantage concurrentiel',
    marketSize: 'Taille estimée du marché',
    competitors: 'Principaux concurrents',
    acquisitionChannels: 'Canaux d’acquisition client',
    pricingStrategy: 'Stratégie de prix',
    requiredCapital: 'Capital requis',
    expectedRevenue: 'Revenu attendu',
    operatingCosts: 'Coûts opérationnels',
    revenueStreams: 'Sources de revenus',
    taskProgress: 'Progression des tâches',
    documentsCount: 'Nombre de documents',
    milestones: 'Jalons',
    intro: 'Pitch deck préliminaire basé uniquement sur les données enregistrées dans THE SFM.',
    missingHeadline: 'Informations incomplètes',
    disclaimer: 'Ce pitch deck est généré à des fins de planification et de présentation préliminaire uniquement. Vérifiez tous les chiffres et informations avant de le partager.',
    review: 'Vérifiez cette diapositive et confirmez que chaque chiffre est saisi et à jour.',
    missingSuggestion: 'Complétez les données manquantes avant de partager ce deck.',
  },
} as const;

const SLIDE_IDS = [
  'cover',
  'problem',
  'solution',
  'product',
  'market',
  'business_model',
  'competition',
  'go_to_market',
  'financial_plan',
  'roadmap',
  'risks',
  'funding_ask',
] as const;

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
  return Number.isFinite(number) && number !== 0 ? `${number.toFixed(1)}%` : '';
}

function compact(values: string[]) {
  return values.map(value => String(value ?? '').trim()).filter(Boolean);
}

function missing(label: string, tab: TabTarget) {
  return { label, tab };
}

function statusFor(missingCount: number, evidenceCount: number): PitchDeckSlideStatus {
  if (evidenceCount === 0 || missingCount >= 3) return 'not_ready';
  if (missingCount > 0) return 'needs_data';
  return 'complete';
}

function makeSlide(
  id: string,
  title: string,
  missingData: PitchDeckSlide['missingData'],
  content: PitchDeckSlide['content'],
  suggestions: string[],
): PitchDeckSlide {
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

function taskSummary(tasks: Array<Record<string, any>>, milestones: Array<Record<string, any>>) {
  const doneTasks = tasks.filter(task => String(task.status ?? '').toLowerCase() === 'done').length;
  const completedMilestones = milestones.filter(item => ['completed', 'done'].includes(String(item.status ?? '').toLowerCase())).length;
  return {
    progress: tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0,
    doneTasks,
    totalTasks: tasks.length,
    completedMilestones,
    totalMilestones: milestones.length,
  };
}

function normalizeSavedDeck(value: unknown, fallback: PitchDeckExportData): PitchDeckExportData | null {
  const saved = parseRecord(value);
  const rawDeck = parseRecord(saved.deck ?? saved);
  const slides = arrayValue(rawDeck.slides);
  if (!slides.length) return null;

  const normalizedSlides = fallback.slides.map(baseSlide => {
    const incoming = slides.find(item => item.id === baseSlide.id);
    if (!incoming) return baseSlide;
    const content = parseRecord(incoming.content);
    const metrics = Array.isArray(content.metrics)
      ? content.metrics.map((metric: any) => ({
        label: String(metric?.label ?? ''),
        value: String(metric?.value ?? ''),
      })).filter(metric => metric.label && metric.value).slice(0, 5)
      : baseSlide.content.metrics;
    return {
      ...baseSlide,
      title: textValue(incoming.title, baseSlide.title),
      status: ['complete', 'needs_data', 'not_ready'].includes(String(incoming.status)) ? incoming.status as PitchDeckSlideStatus : baseSlide.status,
      content: {
        headline: textValue(content.headline, baseSlide.content.headline),
        bullets: Array.isArray(content.bullets) ? content.bullets.map((item: unknown) => String(item)).filter(Boolean).slice(0, 6) : baseSlide.content.bullets,
        metrics,
        notes: textValue(content.notes, baseSlide.content.notes),
      },
      missingData: Array.isArray(incoming.missingData)
        ? incoming.missingData.map((item: any) => ({
          label: String(item?.label ?? ''),
          tab: String(item?.tab ?? 'overview'),
        })).filter(item => item.label).slice(0, 6)
        : baseSlide.missingData,
      suggestions: Array.isArray(incoming.suggestions) ? incoming.suggestions.map((item: unknown) => String(item)).filter(Boolean).slice(0, 4) : baseSlide.suggestions,
    };
  });

  return {
    projectName: textValue(rawDeck.projectName, fallback.projectName),
    language: ['ar', 'en', 'fr'].includes(String(rawDeck.language)) ? rawDeck.language as PitchDeckLanguage : fallback.language,
    completionPercent: Number.isFinite(Number(rawDeck.completionPercent)) ? Number(rawDeck.completionPercent) : fallback.completionPercent,
    readinessLabel: textValue(rawDeck.readinessLabel, fallback.readinessLabel),
    generatedAt: textValue(rawDeck.generatedAt, fallback.generatedAt),
    slides: normalizedSlides,
  };
}

function buildRuleDeck(context: Record<string, any>, language: PitchDeckLanguage): PitchDeckExportData {
  const t = EXPORT_TEXT[language] ?? EXPORT_TEXT.en;
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
  const summary = taskSummary(tasks, milestones);
  const currency = textValue(notes.currency, assumptions.currency, project.currency, 'KWD');

  const projectName = textValue(project.name, project.title, t.projectName);
  const projectType = textValue(notes.category, notes.project_type, project.category, project.type);
  const projectStatus = textValue(notes.status, project.status, notes.current_phase, project.current_phase);
  const description = textValue(notes.description, notes.idea, project.description);
  const requiredCapital = textValue(
    money(financialFeasibility.requiredCapital, currency),
    money(project.capital_amount, currency),
    money(project.target_amount, currency),
    money(project.budget, currency),
  );
  const totalRevenue = textValue(
    money(kpis.totalRevenue, currency),
    forecast.length ? money(forecast.reduce((sum, row) => sum + toNum(row.revenue), 0), currency) : '',
  );
  const totalProfit = textValue(
    money(kpis.totalProfit, currency),
    forecast.length ? money(forecast.reduce((sum, row) => sum + toNum(row.netProfit), 0), currency) : '',
  );
  const operatingCosts = textValue(
    money(financialFeasibility.monthlyOpex, currency),
    costItems.length ? money(costItems.reduce((sum, item) => sum + toNum(item.monthlyCost), 0), currency) : '',
  );
  const revenueLabels = revenueStreams.map(item => textValue(item.name, item.title)).filter(Boolean);
  const documentMetric = { label: t.documentsCount, value: String(documents.length) };

  const slides: PitchDeckSlide[] = [
    makeSlide('cover', t.cover, compact([
      !projectName || projectName === t.projectName ? t.projectName : '',
      !projectType ? t.projectType : '',
    ]).map(label => missing(label, 'overview')), {
      headline: projectName,
      bullets: compact([projectType, projectStatus, t.intro]),
      metrics: compact([
        requiredCapital ? `${t.requiredCapital}|${requiredCapital}` : '',
        summary.totalTasks ? `${t.taskProgress}|${summary.progress}%` : '',
      ]).map(item => {
        const [label, value] = item.split('|');
        return { label, value };
      }),
      notes: t.disclaimer,
    }, [t.review]),
    makeSlide('problem', t.problem, compact([
      !market.problemSolved ? t.problemSolved : '',
      !market.targetCustomers ? t.targetCustomers : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.problemSolved, t.missingHeadline),
      bullets: compact([market.targetCustomers, market.marketSize]),
      metrics: [],
      notes: market.problemSolved ? t.review : t.noData,
    }, [t.missingSuggestion]),
    makeSlide('solution', t.solution, compact([
      !description ? t.description : '',
      !market.competitiveAdvantage ? t.competitiveAdvantage : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.competitiveAdvantage, description, t.missingHeadline),
      bullets: compact([description, technical.requiredResources, technical.requiredTechnology]),
      metrics: [],
      notes: description ? t.review : t.noData,
    }, [t.missingSuggestion]),
    makeSlide('product', t.product, compact([
      !description ? t.description : '',
    ]).map(label => missing(label, 'overview')), {
      headline: textValue(description, t.missingHeadline),
      bullets: compact([technical.operationalSetup, technical.requiredResources, projectStatus]),
      metrics: [],
      notes: t.review,
    }, [t.missingSuggestion]),
    makeSlide('market', t.market, compact([
      !market.targetCustomers ? t.targetCustomers : '',
      !market.marketSize ? t.marketSize : '',
      !market.acquisitionChannels ? t.acquisitionChannels : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.targetCustomers, t.missingHeadline),
      bullets: compact([market.marketSize, market.acquisitionChannels, market.pricingStrategy]),
      metrics: [],
      notes: market.marketSize ? t.review : t.noData,
    }, [t.missingSuggestion]),
    makeSlide('business_model', t.businessModel, compact([
      !revenueLabels.length ? t.revenueStreams : '',
      !market.pricingStrategy ? t.pricingStrategy : '',
    ]).map(label => missing(label, label === t.revenueStreams ? 'financial' : 'feasibility')), {
      headline: textValue(market.pricingStrategy, revenueLabels.join(', '), t.missingHeadline),
      bullets: compact([...revenueLabels, market.pricingStrategy]),
      metrics: compact([
        totalRevenue ? `${t.expectedRevenue}|${totalRevenue}` : '',
        totalProfit ? `Profit|${totalProfit}` : '',
      ]).map(item => {
        const [label, value] = item.split('|');
        return { label, value };
      }),
      notes: t.review,
    }, [t.missingSuggestion]),
    makeSlide('competition', t.competition, compact([
      !market.competitors ? t.competitors : '',
      !market.competitiveAdvantage ? t.competitiveAdvantage : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.competitiveAdvantage, t.missingHeadline),
      bullets: compact([market.competitors, market.competitiveAdvantage]),
      metrics: [],
      notes: market.competitors ? t.review : t.noData,
    }, [t.missingSuggestion]),
    makeSlide('go_to_market', t.goToMarket, compact([
      !market.acquisitionChannels ? t.acquisitionChannels : '',
    ]).map(label => missing(label, 'feasibility')), {
      headline: textValue(market.acquisitionChannels, t.missingHeadline),
      bullets: compact([market.acquisitionChannels, market.pricingStrategy, ...tasks.slice(0, 3).map(task => textValue(task.title))]),
      metrics: [],
      notes: t.review,
    }, [t.missingSuggestion]),
    makeSlide('financial_plan', t.financialPlan, compact([
      !requiredCapital ? t.requiredCapital : '',
      !totalRevenue ? t.expectedRevenue : '',
      !operatingCosts ? t.operatingCosts : '',
    ]).map(label => missing(label, 'financial')), {
      headline: textValue(requiredCapital ? `${t.requiredCapital}: ${requiredCapital}` : '', t.missingHeadline),
      bullets: compact([
        totalRevenue ? `${t.expectedRevenue}: ${totalRevenue}` : '',
        totalProfit ? `Profit: ${totalProfit}` : '',
        operatingCosts ? `${t.operatingCosts}: ${operatingCosts}` : '',
      ]),
      metrics: compact([
        requiredCapital ? `${t.requiredCapital}|${requiredCapital}` : '',
        pct(kpis.roi) ? `ROI|${pct(kpis.roi)}` : '',
        kpis.breakEvenMonth ? `Break-even|${String(kpis.breakEvenMonth)}` : '',
        kpis.paybackPeriod ? `Payback|${String(kpis.paybackPeriod)}` : '',
      ]).map(item => {
        const [label, value] = item.split('|');
        return { label, value };
      }),
      notes: totalRevenue ? t.review : t.noData,
    }, [t.missingSuggestion]),
    makeSlide('roadmap', t.roadmap, compact([
      !summary.totalTasks && !summary.totalMilestones ? `${t.taskProgress} / ${t.milestones}` : '',
    ]).map(label => missing(label, 'tasks')), {
      headline: summary.totalTasks ? `${t.taskProgress}: ${summary.progress}%` : t.missingHeadline,
      bullets: compact([...milestones.slice(0, 4).map(item => textValue(item.title)), ...tasks.slice(0, 4).map(item => textValue(item.title))]),
      metrics: [
        { label: t.taskProgress, value: `${summary.progress}%` },
        { label: t.milestones, value: `${summary.completedMilestones}/${summary.totalMilestones}` },
      ],
      notes: t.review,
    }, [t.missingSuggestion]),
    makeSlide('risks', t.risks, [], {
      headline: t.risks,
      bullets: compact([
        !context.hasFinancialModel ? t.requiredCapital : '',
        toNum(kpis.roi) < 0 ? 'ROI' : '',
        documents.length === 0 ? t.documentsCount : '',
        summary.totalTasks > 0 && summary.progress < 40 ? t.taskProgress : '',
      ]).length
        ? compact([
          !context.hasFinancialModel ? t.requiredCapital : '',
          toNum(kpis.roi) < 0 ? 'ROI' : '',
          documents.length === 0 ? t.documentsCount : '',
          summary.totalTasks > 0 && summary.progress < 40 ? t.taskProgress : '',
        ])
        : [t.review],
      metrics: [documentMetric],
      notes: t.disclaimer,
    }, [t.missingSuggestion]),
    makeSlide('funding_ask', t.fundingAsk, compact([
      !requiredCapital ? t.requiredCapital : '',
      !financialFeasibility.capex ? 'CAPEX' : '',
    ]).map(label => missing(label, 'financial')), {
      headline: requiredCapital ? `${t.requiredCapital}: ${requiredCapital}` : t.missingHeadline,
      bullets: compact([financialFeasibility.capex ? `CAPEX: ${money(financialFeasibility.capex, currency)}` : '', technical.requiredResources, t.disclaimer]),
      metrics: requiredCapital ? [{ label: t.requiredCapital, value: requiredCapital }] : [],
      notes: requiredCapital ? t.review : t.noData,
    }, [t.missingSuggestion]),
  ];

  const orderedSlides = SLIDE_IDS.map(id => slides.find(slide => slide.id === id)).filter(Boolean) as PitchDeckSlide[];
  const completionPercent = Math.round(orderedSlides.reduce((sum, item) => sum + (item.status === 'complete' ? 100 : item.status === 'needs_data' ? 50 : 0), 0) / orderedSlides.length);
  return {
    projectName,
    language,
    completionPercent,
    readinessLabel: completionPercent >= 80 ? t.ready : completionPercent >= 45 ? t.improve : t.notReady,
    slides: orderedSlides,
    generatedAt: new Date().toISOString(),
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

async function improveWithAi(deck: PitchDeckExportData, context: Record<string, any>) {
  const provider = getProvider();
  if (!provider) return { source: 'rules' as DeckSource, deck };

  const languageName = deck.language === 'ar' ? 'Arabic' : deck.language === 'fr' ? 'French' : 'English';
  const prompt = [
    `Language: ${languageName}`,
    'Improve pitch deck wording only. Use only the provided project context and existing deck.',
    'Do not invent market size, revenue, traction, customers, competitors, funding numbers, legal approvals, or success claims.',
    'Keep missingData truthful. Return valid JSON only in this format: {"deck":{"projectName":"","language":"ar|en|fr","completionPercent":0,"readinessLabel":"","slides":[{"id":"","title":"","status":"complete|needs_data|not_ready","content":{"headline":"","bullets":[],"metrics":[{"label":"","value":""}],"notes":""},"missingData":[{"label":"","tab":"overview|feasibility|financial|tasks|kpis"}],"suggestions":[]}]}}',
    `Deck: ${JSON.stringify(deck).slice(0, 16000)}`,
    `Project context: ${JSON.stringify(context).slice(0, 10000)}`,
  ].join('\n\n');

  try {
    const { text } = await generateText({
      model: provider('claude-haiku-4-5-20251001'),
      system: 'You are a THE SFM pitch deck editor. Output JSON only and never fabricate missing project data.',
      prompt,
      maxTokens: 3200,
    });
    const normalized = normalizeSavedDeck(extractJson(text), deck);
    return { source: normalized ? 'ai' as DeckSource : 'rules' as DeckSource, deck: normalized ?? deck };
  } catch {
    return { source: 'rules' as DeckSource, deck };
  }
}

function safeFilename(name: string) {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\w\u0600-\u06FF-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `project-pitch-deck-${slug || 'project'}.pptx`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase(token);
  if (!supabase) return NextResponse.json({ success: false, error: 'Supabase is not configured' }, { status: 500 });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { language?: PitchDeckLanguage };
  const language: PitchDeckLanguage = ['ar', 'en', 'fr'].includes(body.language as PitchDeckLanguage) ? body.language as PitchDeckLanguage : 'ar';
  const { id } = await params;

  const projectRes = await supabase.from('projects').select('*').eq('user_id', user.id).eq('id', id).maybeSingle();
  if (projectRes.error) return NextResponse.json({ success: false, error: 'Could not load project' }, { status: 500 });
  if (!projectRes.data) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

  const [feasibilityRes, financialRes, taskRes, milestoneRes, documentRes, savedDeckRes] = await Promise.all([
    supabase.from('project_feasibility_studies').select('*').eq('user_id', user.id).eq('project_id', id).maybeSingle(),
    supabase.from('project_financial_models').select('*').eq('user_id', user.id).eq('project_id', id).maybeSingle(),
    supabase.from('project_tasks').select('*').eq('user_id', user.id).eq('project_id', id),
    supabase.from('project_milestones').select('*').eq('user_id', user.id).eq('project_id', id),
    supabase.from('project_documents').select('id,title,category,file_name,file_type,file_size,uploaded_at').eq('user_id', user.id).eq('project_id', id),
    supabase.from('project_pitch_decks').select('*').eq('user_id', user.id).eq('project_id', id).eq('language', language).maybeSingle(),
  ]);

  const context = {
    project: projectRes.data,
    feasibilityStudy: feasibilityRes.error ? null : feasibilityRes.data,
    financialModel: financialRes.error ? null : financialRes.data,
    tasks: taskRes.error ? [] : taskRes.data ?? [],
    milestones: milestoneRes.error ? [] : milestoneRes.data ?? [],
    documents: documentRes.error ? [] : documentRes.data ?? [],
    hasFinancialModel: !financialRes.error && !!financialRes.data,
  };

  const ruleDeck = buildRuleDeck(context, language);
  const savedDeck = savedDeckRes.error ? null : normalizeSavedDeck(savedDeckRes.data?.deck_data, ruleDeck);
  let deck = savedDeck ?? ruleDeck;
  let source: DeckSource = savedDeck ? (savedDeckRes.data?.source === 'ai' ? 'ai' : 'rules') : 'rules';

  if (!savedDeck) {
    const aiResult = await improveWithAi(ruleDeck, context);
    deck = aiResult.deck;
    source = aiResult.source;
    await supabase.from('project_pitch_decks').upsert({
      user_id: user.id,
      project_id: id,
      language,
      deck_data: deck,
      readiness_score: deck.completionPercent,
      source,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,project_id,language' }).then(() => undefined, () => undefined);
  }

  const buffer = await buildPitchDeckPowerPoint(deck, source);
  const filename = safeFilename(deck.projectName);

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'no-store',
      'X-Pitch-Deck-Source': source,
    },
  });
}
