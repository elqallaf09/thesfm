'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileText,
  FolderKanban,
  Gauge,
  Pencil,
  Plus,
  Save,
  Target,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { ProjectAiAdvisorTab } from '@/components/projects/ProjectAiAdvisorTab';
import { ProjectDocumentsTab } from '@/components/projects/ProjectDocumentsTab';
import { ProjectFinancialModelTab } from '@/components/projects/ProjectFinancialModelTab';
import {
  ProjectKpisTab,
  buildProjectKpiSummary,
  emptyProjectKpiSummary,
  type ProjectKpiSummary,
} from '@/components/projects/ProjectKpisTab';
import {
  ProjectTasksTab,
  buildProjectTasksSummary,
  emptyProjectTasksSummary,
  type ProjectMilestoneRow,
  type ProjectTaskRow,
  type ProjectTasksSummary,
} from '@/components/projects/ProjectTasksTab';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';

type Lang = 'ar' | 'en' | 'fr';
type TabId = 'overview' | 'feasibility' | 'financial' | 'tasks' | 'documents' | 'kpis' | 'ai';
type RiskLevel = 'low' | 'medium' | 'high';
type FeasibilitySection = 'market' | 'technical' | 'financial' | 'legal';
type FeasibilityStatus = 'feasible' | 'needs_review' | 'high_risk';

type ProjectRow = {
  id: string;
  user_id: string;
  name: string | null;
  emoji?: string | null;
  budget?: string | number | null;
  timeline?: string | null;
  duration_unit?: string | null;
  steps?: unknown;
  notes?: Record<string, any> | string | null;
  created_at?: string | null;
};

type SavingsRow = { amount?: string | number | null };

type FeasibilityForm = {
  market: Record<string, string>;
  technical: Record<string, string>;
  financial: Record<string, string>;
  legal: Record<string, string>;
};

type FeasibilityStudyRow = {
  id: string;
  market_data: Record<string, string> | null;
  technical_data: Record<string, string> | null;
  financial_data: Record<string, string> | null;
  legal_data: Record<string, string> | null;
  feasibility_score: number | null;
  feasibility_status: string | null;
};

const TEXT = {
  ar: {
    workspace: 'مساحة المشروع',
    projectName: 'اسم المشروع',
    projectType: 'نوع المشروع',
    status: 'الحالة',
    capital: 'رأس المال',
    financialTarget: 'الهدف المالي',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    editProject: 'تعديل المشروع',
    addExpense: 'إضافة مصروف للمشروع',
    addIncome: 'إضافة دخل للمشروع',
    analyzeProject: 'تحليل المشروع',
    back: 'العودة إلى مشاريعي',
    signIn: 'سجّل الدخول لعرض تفاصيل مشاريعك.',
    notFound: 'لم يتم العثور على المشروع.',
    overview: 'نظرة عامة',
    feasibility: 'دراسة الجدوى',
    financial: 'النموذج المالي',
    tasks: 'المهام',
    documents: 'المستندات',
    kpis: 'المؤشرات',
    ai: 'مستشار AI',
    comingSoon: 'سيتم تفعيل هذا القسم في المرحلة القادمة.',
    projectSummary: 'ملخص المشروع',
    financialSnapshot: 'اللقطة المالية',
    timelineSnapshot: 'ملخص الجدول الزمني',
    riskSnapshot: 'ملخص المخاطر',
    quickActions: 'إجراءات سريعة',
    description: 'الوصف',
    priority: 'الأولوية',
    currentPhase: 'المرحلة الحالية',
    totalIncome: 'إجمالي دخل المشروع',
    totalExpenses: 'إجمالي مصروفات المشروع',
    netResult: 'الصافي',
    remainingBudget: 'الميزانية المتبقية',
    targetProgress: 'التقدم نحو الهدف',
    daysRemaining: 'الأيام المتبقية',
    duration: 'مدة المشروع',
    noDate: 'غير محدد',
    noData: 'بيانات غير كافية',
    low: 'منخفض',
    medium: 'متوسط',
    high: 'مرتفع',
    riskLowText: 'المؤشرات الحالية تبدو مستقرة لهذا المشروع.',
    riskMediumText: 'يحتاج المشروع إلى متابعة مالية وتشغيلية منتظمة.',
    riskHighText: 'المشروع يحتاج مراجعة عاجلة للمخاطر والميزانية.',
    addTask: 'إضافة مهمة',
    generateFeasibility: 'إنشاء دراسة جدوى',
    createFinancialModel: 'إنشاء نموذج مالي',
    idea: 'فكرة',
    study: 'دراسة',
    setup: 'تأسيس',
    launch: 'إطلاق',
    growth: 'نمو',
    paused: 'متوقف',
    completed: 'مكتمل',
    ecommerce: 'متجر إلكتروني',
    restaurant: 'مطعم / كافيه',
    services: 'خدمات',
    saas: 'SaaS / تطبيق',
    trading: 'تجارة عامة',
    realEstate: 'عقار',
    otherProject: 'مشروع آخر',
    feasibilityHint: 'دراسة جدوى تشمل السوق، التكاليف، المنافسين، التراخيص، والمخاطر.',
    financialHint: 'نموذج مالي يتضمن الإيرادات، المصاريف، التدفق النقدي، ونقطة التعادل.',
    tasksHint: 'لوحة مهام وخط زمني لتنفيذ المشروع.',
    documentsHint: 'خزنة مستندات للعقود والتراخيص والفواتير.',
    kpisHint: 'مؤشرات أداء المشروع والربحية والتقدم.',
    aiHint: 'مستشار ذكي يقرأ بيانات مشروعك ويقترح الخطوات القادمة.',
    feasibilitySummary: 'ملخص دراسة الجدوى',
    marketFeasibility: 'الجدوى السوقية',
    technicalFeasibility: 'الجدوى الفنية',
    financialFeasibility: 'الجدوى المالية',
    legalFeasibility: 'الجدوى القانونية والتنظيمية',
    marketSize: 'حجم السوق المتوقع',
    targetCustomers: 'شريحة العملاء المستهدفة',
    problemSolved: 'المشكلة التي يحلها المشروع',
    competitors: 'المنافسون الرئيسيون',
    competitiveAdvantage: 'ميزة المشروع التنافسية',
    pricingStrategy: 'استراتيجية التسعير',
    acquisitionChannels: 'قنوات الوصول للعملاء',
    requiredResources: 'الموارد المطلوبة',
    requiredTechnology: 'التكنولوجيا أو الأدوات المطلوبة',
    operationalSetup: 'الموقع أو البنية التشغيلية',
    keySuppliers: 'الموردون الرئيسيون',
    teamSize: 'عدد الموظفين المطلوب',
    implementationChallenges: 'صعوبات التنفيذ المتوقعة',
    requiredCapital: 'رأس المال المطلوب',
    capex: 'التكاليف التأسيسية CAPEX',
    monthlyOpex: 'التكاليف التشغيلية الشهرية OPEX',
    expectedMonthlyRevenue: 'الإيرادات الشهرية المتوقعة',
    expectedProfitMargin: 'هامش الربح المتوقع %',
    breakEvenPoint: 'نقطة التعادل التقريبية',
    paybackPeriod: 'فترة الاسترداد المتوقعة',
    targetCountry: 'الدولة / السوق المستهدف',
    licenseType: 'نوع الترخيص المطلوب',
    governmentEntities: 'الجهات الحكومية ذات العلاقة',
    legalRequirements: 'متطلبات قانونية خاصة',
    insuranceObligations: 'التأمينات أو الالتزامات النظامية',
    legalNotes: 'ملاحظات قانونية',
    kuwait: 'الكويت',
    saudiArabia: 'السعودية',
    uae: 'الإمارات',
    qatar: 'قطر',
    bahrain: 'البحرين',
    oman: 'عُمان',
    globalOther: 'عالمي / أخرى',
    feasibilityScore: 'درجة الجدوى',
    feasible: 'قابل للتنفيذ',
    needsReview: 'يحتاج مراجعة',
    highRisk: 'مخاطرة مرتفعة',
    monthlyProfitEstimate: 'الربح الشهري المتوقع',
    breakEvenEstimate: 'نقطة التعادل المقدرة',
    roiEstimate: 'تقدير العائد السنوي ROI',
    missingSections: 'الأقسام غير المكتملة',
    saveFeasibilityStudy: 'حفظ دراسة الجدوى',
    feasibilitySaved: 'تم حفظ دراسة الجدوى.',
    feasibilitySaveError: 'تعذر حفظ دراسة الجدوى حالياً.',
    aiFeasibilityAnalysis: 'تحليل AI لدراسة الجدوى',
    aiFeasibilitySoon: 'سيتم تفعيل تحليل الذكاء الاصطناعي المتقدم في مرحلة لاحقة.',
    exportFeasibilityPdf: 'تصدير دراسة الجدوى PDF',
    comingSoonShort: 'قريباً',
    internalScoreDisclaimer: 'هذه درجة تخطيط داخلية وليست توصية مضمونة لنجاح المشروع.',
    months: 'شهر',
    projectProgress: 'تقدم المشروع',
    totalTasks: 'إجمالي المهام',
    completedTasks: 'المهام المكتملة',
    lateTasks: 'المهام المتأخرة',
    upcomingDeadlines: 'المواعيد القادمة',
    nextMilestone: 'المعلم القادم',
    estimatedTaskCosts: 'تكلفة المهام المتوقعة',
    documentsCount: 'عدد المستندات',
    projectHealthScore: 'درجة صحة المشروع',
    strong: 'قوي',
    good: 'جيد',
    needs_review: 'يحتاج مراجعة',
    high_risk: 'عالي المخاطر',
    insufficient: 'بيانات غير كافية',
    topRiskFlag: 'أبرز تنبيه مخاطر',
    openKpis: 'فتح المؤشرات',
    noRiskFlags: 'لا توجد تنبيهات مخاطر حالياً.',
    financial_model_missing: 'النموذج المالي غير مكتمل',
    feasibility_incomplete: 'دراسة الجدوى غير مكتملة',
    overdue_tasks: 'يوجد مهام متأخرة',
    no_documents: 'لا توجد مستندات',
    project_end_passed: 'تاريخ نهاية المشروع تجاوز اليوم',
    expenses_exceed_budget: 'المصاريف تجاوزت الميزانية',
    negative_cash: 'التدفق النقدي المتوقع سلبي',
    payback_too_long: 'فترة الاسترداد طويلة',
    behind_schedule: 'التقدم الفعلي أقل من المخطط',
  },
  en: {
    workspace: 'Project Workspace',
    projectName: 'Project name',
    projectType: 'Project type',
    status: 'Status',
    capital: 'Capital',
    financialTarget: 'Financial target',
    startDate: 'Start date',
    endDate: 'End date',
    editProject: 'Edit Project',
    addExpense: 'Add Project Expense',
    addIncome: 'Add Project Income',
    analyzeProject: 'Analyze Project',
    back: 'Back to My Projects',
    signIn: 'Sign in to view your project details.',
    notFound: 'Project not found.',
    overview: 'Overview',
    feasibility: 'Feasibility',
    financial: 'Financial Model',
    tasks: 'Tasks',
    documents: 'Documents',
    kpis: 'KPIs',
    ai: 'AI Advisor',
    comingSoon: 'This section will be activated in the next phase.',
    projectSummary: 'Project Summary',
    financialSnapshot: 'Financial Snapshot',
    timelineSnapshot: 'Timeline Snapshot',
    riskSnapshot: 'Risk Snapshot',
    quickActions: 'Quick Actions',
    description: 'Description',
    priority: 'Priority',
    currentPhase: 'Current phase',
    totalIncome: 'Total project income',
    totalExpenses: 'Total project expenses',
    netResult: 'Net result',
    remainingBudget: 'Remaining budget',
    targetProgress: 'Progress toward target',
    daysRemaining: 'Days remaining',
    duration: 'Project duration',
    noDate: 'Not set',
    noData: 'Not enough data',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    riskLowText: 'Current indicators look stable for this project.',
    riskMediumText: 'This project needs regular financial and operational review.',
    riskHighText: 'This project needs urgent risk and budget review.',
    addTask: 'Add task',
    generateFeasibility: 'Generate feasibility',
    createFinancialModel: 'Create financial model',
    idea: 'Idea',
    study: 'Study',
    setup: 'Setup',
    launch: 'Launch',
    growth: 'Growth',
    paused: 'Paused',
    completed: 'Completed',
    ecommerce: 'E-commerce',
    restaurant: 'Restaurant / Cafe',
    services: 'Services',
    saas: 'SaaS / App',
    trading: 'General Trading',
    realEstate: 'Real Estate',
    otherProject: 'Other Project',
    feasibilityHint: 'A feasibility study covering market, costs, competitors, licenses, and risks.',
    financialHint: 'A financial model covering revenue, expenses, cash flow, and break-even point.',
    tasksHint: 'A task board and timeline for project execution.',
    documentsHint: 'A document vault for contracts, licenses, and invoices.',
    kpisHint: 'Project performance, profitability, and progress KPIs.',
    aiHint: 'An intelligent advisor that reads your project data and suggests next steps.',
    feasibilitySummary: 'Feasibility Summary',
    marketFeasibility: 'Market Feasibility',
    technicalFeasibility: 'Technical Feasibility',
    financialFeasibility: 'Financial Feasibility',
    legalFeasibility: 'Legal / Regulatory Feasibility',
    marketSize: 'Expected market size',
    targetCustomers: 'Target customer segment',
    problemSolved: 'Problem solved by the project',
    competitors: 'Main competitors',
    competitiveAdvantage: 'Competitive advantage',
    pricingStrategy: 'Pricing strategy',
    acquisitionChannels: 'Customer acquisition channels',
    requiredResources: 'Required resources',
    requiredTechnology: 'Required technology/tools',
    operationalSetup: 'Location or operational setup',
    keySuppliers: 'Key suppliers',
    teamSize: 'Required team size',
    implementationChallenges: 'Expected implementation challenges',
    requiredCapital: 'Required capital',
    capex: 'Setup costs CAPEX',
    monthlyOpex: 'Monthly operating costs OPEX',
    expectedMonthlyRevenue: 'Expected monthly revenue',
    expectedProfitMargin: 'Expected profit margin %',
    breakEvenPoint: 'Estimated break-even point',
    paybackPeriod: 'Expected payback period',
    targetCountry: 'Country / target market',
    licenseType: 'Required license type',
    governmentEntities: 'Relevant government entities',
    legalRequirements: 'Special legal requirements',
    insuranceObligations: 'Insurance or regulatory obligations',
    legalNotes: 'Legal notes',
    kuwait: 'Kuwait',
    saudiArabia: 'Saudi Arabia',
    uae: 'UAE',
    qatar: 'Qatar',
    bahrain: 'Bahrain',
    oman: 'Oman',
    globalOther: 'Global / Other',
    feasibilityScore: 'Feasibility Score',
    feasible: 'Feasible',
    needsReview: 'Needs Review',
    highRisk: 'High Risk',
    monthlyProfitEstimate: 'Monthly profit estimate',
    breakEvenEstimate: 'Break-even estimate',
    roiEstimate: 'Annual ROI estimate',
    missingSections: 'Missing sections',
    saveFeasibilityStudy: 'Save Feasibility Study',
    feasibilitySaved: 'Feasibility study saved.',
    feasibilitySaveError: 'Could not save the feasibility study right now.',
    aiFeasibilityAnalysis: 'AI Feasibility Analysis',
    aiFeasibilitySoon: 'Advanced AI analysis will be enabled in a later phase.',
    exportFeasibilityPdf: 'Export Feasibility PDF',
    comingSoonShort: 'Coming soon',
    internalScoreDisclaimer: 'This is an internal planning score, not a guaranteed business recommendation.',
    months: 'months',
    projectProgress: 'Project Progress',
    totalTasks: 'Total tasks',
    completedTasks: 'Completed tasks',
    lateTasks: 'Late tasks',
    upcomingDeadlines: 'Upcoming deadlines',
    nextMilestone: 'Next milestone',
    estimatedTaskCosts: 'Estimated Task Costs',
    documentsCount: 'Documents count',
    projectHealthScore: 'Project Health Score',
    strong: 'Strong',
    good: 'Good',
    needs_review: 'Needs Review',
    high_risk: 'High Risk',
    insufficient: 'Insufficient data',
    topRiskFlag: 'Top risk flag',
    openKpis: 'Open KPIs',
    noRiskFlags: 'No current risk flags.',
    financial_model_missing: 'Financial model missing',
    feasibility_incomplete: 'Feasibility study incomplete',
    overdue_tasks: 'Overdue tasks',
    no_documents: 'No documents uploaded',
    project_end_passed: 'Project end date passed',
    expenses_exceed_budget: 'Expenses exceed budget',
    negative_cash: 'Negative projected cash balance',
    payback_too_long: 'Payback period too long',
    behind_schedule: 'Actual progress is behind schedule',
  },
  fr: {
    workspace: 'Espace projet',
    projectName: 'Nom du projet',
    projectType: 'Type de projet',
    status: 'Statut',
    capital: 'Capital',
    financialTarget: 'Objectif financier',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    editProject: 'Modifier le projet',
    addExpense: 'Ajouter une dépense',
    addIncome: 'Ajouter un revenu',
    analyzeProject: 'Analyser le projet',
    back: 'Retour à mes projets',
    signIn: 'Connectez-vous pour voir les détails de vos projets.',
    notFound: 'Projet introuvable.',
    overview: 'Vue d’ensemble',
    feasibility: 'Faisabilité',
    financial: 'Modèle financier',
    tasks: 'Tâches',
    documents: 'Documents',
    kpis: 'KPI',
    ai: 'Conseiller IA',
    comingSoon: 'Cette section sera activée dans la prochaine phase.',
    projectSummary: 'Résumé du projet',
    financialSnapshot: 'Aperçu financier',
    timelineSnapshot: 'Aperçu du calendrier',
    riskSnapshot: 'Aperçu des risques',
    quickActions: 'Actions rapides',
    description: 'Description',
    priority: 'Priorité',
    currentPhase: 'Phase actuelle',
    totalIncome: 'Revenus du projet',
    totalExpenses: 'Dépenses du projet',
    netResult: 'Résultat net',
    remainingBudget: 'Budget restant',
    targetProgress: 'Progression vers l’objectif',
    daysRemaining: 'Jours restants',
    duration: 'Durée du projet',
    noDate: 'Non défini',
    noData: 'Données insuffisantes',
    low: 'Faible',
    medium: 'Moyen',
    high: 'Élevé',
    riskLowText: 'Les indicateurs actuels semblent stables pour ce projet.',
    riskMediumText: 'Ce projet nécessite un suivi financier et opérationnel régulier.',
    riskHighText: 'Ce projet nécessite une revue urgente des risques et du budget.',
    addTask: 'Ajouter une tâche',
    generateFeasibility: 'Créer une faisabilité',
    createFinancialModel: 'Créer un modèle financier',
    idea: 'Idée',
    study: 'Étude',
    setup: 'Mise en place',
    launch: 'Lancement',
    growth: 'Croissance',
    paused: 'En pause',
    completed: 'Terminé',
    ecommerce: 'E-commerce',
    restaurant: 'Restaurant / Café',
    services: 'Services',
    saas: 'SaaS / Application',
    trading: 'Commerce général',
    realEstate: 'Immobilier',
    otherProject: 'Autre projet',
    feasibilityHint: 'Une étude couvrant le marché, les coûts, les concurrents, les licences et les risques.',
    financialHint: 'Un modèle financier couvrant les revenus, les dépenses, la trésorerie et le seuil de rentabilité.',
    tasksHint: 'Un tableau de tâches et un calendrier pour exécuter le projet.',
    documentsHint: 'Un coffre de documents pour les contrats, licences et factures.',
    kpisHint: 'Indicateurs de performance, rentabilité et progression du projet.',
    aiHint: 'Un conseiller intelligent qui lit vos données et suggère les prochaines étapes.',
    feasibilitySummary: 'Résumé de faisabilité',
    marketFeasibility: 'Faisabilité du marché',
    technicalFeasibility: 'Faisabilité technique',
    financialFeasibility: 'Faisabilité financière',
    legalFeasibility: 'Faisabilité juridique et réglementaire',
    marketSize: 'Taille estimée du marché',
    targetCustomers: 'Segment client cible',
    problemSolved: 'Problème résolu par le projet',
    competitors: 'Principaux concurrents',
    competitiveAdvantage: 'Avantage concurrentiel',
    pricingStrategy: 'Stratégie de prix',
    acquisitionChannels: 'Canaux d’acquisition client',
    requiredResources: 'Ressources nécessaires',
    requiredTechnology: 'Technologies/outils nécessaires',
    operationalSetup: 'Emplacement ou configuration opérationnelle',
    keySuppliers: 'Fournisseurs clés',
    teamSize: 'Taille d’équipe requise',
    implementationChallenges: 'Difficultés de mise en œuvre prévues',
    requiredCapital: 'Capital requis',
    capex: 'Coûts de démarrage CAPEX',
    monthlyOpex: 'Coûts opérationnels mensuels OPEX',
    expectedMonthlyRevenue: 'Revenu mensuel attendu',
    expectedProfitMargin: 'Marge bénéficiaire estimée %',
    breakEvenPoint: 'Point mort estimé',
    paybackPeriod: 'Période de récupération estimée',
    targetCountry: 'Pays / marché cible',
    licenseType: 'Type de licence requis',
    governmentEntities: 'Entités gouvernementales concernées',
    legalRequirements: 'Exigences légales particulières',
    insuranceObligations: 'Assurances ou obligations réglementaires',
    legalNotes: 'Notes juridiques',
    kuwait: 'Koweït',
    saudiArabia: 'Arabie saoudite',
    uae: 'Émirats arabes unis',
    qatar: 'Qatar',
    bahrain: 'Bahreïn',
    oman: 'Oman',
    globalOther: 'Global / Autre',
    feasibilityScore: 'Score de faisabilité',
    feasible: 'Faisable',
    needsReview: 'À réviser',
    highRisk: 'Risque élevé',
    monthlyProfitEstimate: 'Bénéfice mensuel estimé',
    breakEvenEstimate: 'Seuil de rentabilité estimé',
    roiEstimate: 'ROI annuel estimé',
    missingSections: 'Sections manquantes',
    saveFeasibilityStudy: 'Enregistrer l’étude de faisabilité',
    feasibilitySaved: 'Étude de faisabilité enregistrée.',
    feasibilitySaveError: 'Impossible d’enregistrer l’étude de faisabilité pour le moment.',
    aiFeasibilityAnalysis: 'Analyse IA de faisabilité',
    aiFeasibilitySoon: 'L’analyse IA avancée sera activée dans une phase ultérieure.',
    exportFeasibilityPdf: 'Exporter l’étude PDF',
    comingSoonShort: 'Bientôt',
    internalScoreDisclaimer: 'Il s’agit d’un score interne de planification, pas d’une recommandation commerciale garantie.',
    months: 'mois',
    projectProgress: 'Progression du projet',
    totalTasks: 'Total des tâches',
    completedTasks: 'Tâches terminées',
    lateTasks: 'Tâches en retard',
    upcomingDeadlines: 'Échéances à venir',
    nextMilestone: 'Prochain jalon',
    estimatedTaskCosts: 'Coûts estimés des tâches',
    documentsCount: 'Nombre de documents',
    projectHealthScore: 'Score de santé du projet',
    strong: 'Fort',
    good: 'Bon',
    needs_review: 'À réviser',
    high_risk: 'Risque élevé',
    insufficient: 'Données insuffisantes',
    topRiskFlag: 'Principale alerte de risque',
    openKpis: 'Ouvrir les KPI',
    noRiskFlags: 'Aucune alerte de risque actuellement.',
    financial_model_missing: 'Modèle financier manquant',
    feasibility_incomplete: 'Étude de faisabilité incomplète',
    overdue_tasks: 'Tâches en retard',
    no_documents: 'Aucun document téléversé',
    project_end_passed: 'Date de fin du projet dépassée',
    expenses_exceed_budget: 'Les dépenses dépassent le budget',
    negative_cash: 'Solde de trésorerie projeté négatif',
    payback_too_long: 'Période de récupération trop longue',
    behind_schedule: 'Progression réelle en retard',
  },
} as const;

type Translation = Record<keyof typeof TEXT.ar, string>;

const tabs: Array<{ id: TabId; icon: typeof FolderKanban; hintKey?: keyof typeof TEXT.ar }> = [
  { id: 'overview', icon: FolderKanban },
  { id: 'feasibility', icon: FileText, hintKey: 'feasibilityHint' },
  { id: 'financial', icon: BarChart3, hintKey: 'financialHint' },
  { id: 'tasks', icon: ClipboardList, hintKey: 'tasksHint' },
  { id: 'documents', icon: FileText, hintKey: 'documentsHint' },
  { id: 'kpis', icon: Gauge, hintKey: 'kpisHint' },
  { id: 'ai', icon: Bot, hintKey: 'aiHint' },
];

const sectionWeights: Record<FeasibilitySection, number> = {
  market: 25,
  technical: 20,
  financial: 35,
  legal: 20,
};

const countryOptions = ['kuwait', 'saudiArabia', 'uae', 'qatar', 'bahrain', 'oman', 'globalOther'] as const;

function createEmptyFeasibility(): FeasibilityForm {
  return { market: {}, technical: {}, financial: {}, legal: {} };
}

function parseNotes(value: ProjectRow['notes']) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function toNum(value: unknown) {
  return Number(String(value ?? 0).replace(/[^\d.-]/g, '')) || 0;
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeStatus(raw: unknown): 'idea' | 'study' | 'setup' | 'launch' | 'growth' | 'paused' | 'completed' {
  const value = String(raw ?? '').trim().toLowerCase();
  if (['completed', 'complete', 'مكتمل', 'terminé'].includes(value)) return 'completed';
  if (['paused', 'متوقف', 'en pause'].includes(value)) return 'paused';
  if (['growth', 'نمو', 'نشط', 'active'].includes(value)) return 'growth';
  if (['launch', 'إطلاق', 'launched'].includes(value)) return 'launch';
  if (['setup', 'تأسيس', 'قيد التنفيذ', 'in_progress', 'in progress'].includes(value)) return 'setup';
  if (['study', 'دراسة', 'planning'].includes(value)) return 'study';
  return 'idea';
}

function normalizeType(raw: unknown): 'ecommerce' | 'restaurant' | 'services' | 'saas' | 'trading' | 'realEstate' | 'otherProject' {
  const value = String(raw ?? '').trim().toLowerCase();
  if (!value) return 'otherProject';
  if (value.includes('متجر') || value.includes('e-commerce') || value.includes('ecommerce')) return 'ecommerce';
  if (value.includes('مطعم') || value.includes('كاف') || value.includes('restaurant') || value.includes('cafe')) return 'restaurant';
  if (value.includes('خدمات') || value.includes('service')) return 'services';
  if (value.includes('saas') || value.includes('تطبيق') || value.includes('تقنية') || value.includes('برمج')) return 'saas';
  if (value.includes('تجارة') || value.includes('trading') || value.includes('توزيع')) return 'trading';
  if (value.includes('عقار') || value.includes('real estate')) return 'realEstate';
  return 'otherProject';
}

function riskCopyKey(risk: RiskLevel) {
  if (risk === 'high') return 'riskHighText';
  if (risk === 'medium') return 'riskMediumText';
  return 'riskLowText';
}

function defaultFeasibilityFromProject(project: ProjectRow | null): FeasibilityForm {
  const notes = parseNotes(project?.notes);
  return {
    market: {
      problemSolved: String(notes.idea ?? notes.description ?? ''),
    },
    technical: {},
    financial: {
      requiredCapital: String(notes.capital ?? notes.capital_amount ?? project?.budget ?? ''),
      monthlyOpex: String(notes.monthlyExpenses ?? notes.monthly_expenses ?? ''),
      expectedMonthlyRevenue: String(notes.monthlyRevenue ?? notes.monthly_revenue ?? ''),
      expectedProfitMargin: String(notes.expectedProfitMargin ?? notes.expected_profit_margin ?? ''),
    },
    legal: {},
  };
}

function normalizeFeasibilityRow(row: FeasibilityStudyRow | null, project: ProjectRow | null): FeasibilityForm {
  if (!row) return defaultFeasibilityFromProject(project);
  return {
    market: row.market_data ?? {},
    technical: row.technical_data ?? {},
    financial: row.financial_data ?? {},
    legal: row.legal_data ?? {},
  };
}

function hasValue(value: unknown) {
  return String(value ?? '').trim().length > 0;
}

function sectionCompletion(data: Record<string, string>, fields: string[]) {
  if (!fields.length) return 0;
  const filled = fields.filter(field => hasValue(data[field])).length;
  return filled / fields.length;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : String(params?.id ?? '');
  const { user, loading } = useAuth();
  const { lang, dir } = useLanguage();
  const tr = (TEXT[lang as Lang] ?? TEXT.ar) as Translation;
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [savings, setSavings] = useState(0);
  const [loadingProject, setLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [feasibility, setFeasibility] = useState<FeasibilityForm>(() => createEmptyFeasibility());
  const [feasibilityId, setFeasibilityId] = useState<string | null>(null);
  const [savingFeasibility, setSavingFeasibility] = useState(false);
  const [notice, setNotice] = useState('');
  const [taskSummary, setTaskSummary] = useState<ProjectTasksSummary>(emptyProjectTasksSummary);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [kpiSummary, setKpiSummary] = useState<ProjectKpiSummary>(emptyProjectKpiSummary);

  const money = useCallback((amount: number, currency = 'KWD') => formatMoney(amount, currency, lang as Lang), [lang]);
  const dateLabel = useCallback((value?: string | null) => {
    const date = safeDate(value);
    return date ? date.toLocaleDateString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US') : tr.noDate;
  }, [lang, tr.noDate]);

  const feasibilitySections = useMemo(() => [
    {
      id: 'market' as const,
      title: tr.marketFeasibility,
      icon: Target,
      fields: [
        { id: 'marketSize', label: tr.marketSize },
        { id: 'targetCustomers', label: tr.targetCustomers },
        { id: 'problemSolved', label: tr.problemSolved },
        { id: 'competitors', label: tr.competitors },
        { id: 'competitiveAdvantage', label: tr.competitiveAdvantage },
        { id: 'pricingStrategy', label: tr.pricingStrategy },
        { id: 'acquisitionChannels', label: tr.acquisitionChannels },
      ],
    },
    {
      id: 'technical' as const,
      title: tr.technicalFeasibility,
      icon: ClipboardList,
      fields: [
        { id: 'requiredResources', label: tr.requiredResources },
        { id: 'requiredTechnology', label: tr.requiredTechnology },
        { id: 'operationalSetup', label: tr.operationalSetup },
        { id: 'keySuppliers', label: tr.keySuppliers },
        { id: 'teamSize', label: tr.teamSize },
        { id: 'implementationChallenges', label: tr.implementationChallenges },
      ],
    },
    {
      id: 'financial' as const,
      title: tr.financialFeasibility,
      icon: Coins,
      fields: [
        { id: 'requiredCapital', label: tr.requiredCapital, type: 'number' },
        { id: 'capex', label: tr.capex, type: 'number' },
        { id: 'monthlyOpex', label: tr.monthlyOpex, type: 'number' },
        { id: 'expectedMonthlyRevenue', label: tr.expectedMonthlyRevenue, type: 'number' },
        { id: 'expectedProfitMargin', label: tr.expectedProfitMargin, type: 'number' },
        { id: 'breakEvenPoint', label: tr.breakEvenPoint },
        { id: 'paybackPeriod', label: tr.paybackPeriod },
      ],
    },
    {
      id: 'legal' as const,
      title: tr.legalFeasibility,
      icon: FileText,
      fields: [
        { id: 'targetCountry', label: tr.targetCountry, type: 'select' },
        { id: 'licenseType', label: tr.licenseType },
        { id: 'governmentEntities', label: tr.governmentEntities },
        { id: 'legalRequirements', label: tr.legalRequirements },
        { id: 'insuranceObligations', label: tr.insuranceObligations },
        { id: 'legalNotes', label: tr.legalNotes },
      ],
    },
  ], [tr]);

  const fieldMap = useMemo(() => ({
    market: feasibilitySections.find(section => section.id === 'market')?.fields.map(field => field.id) ?? [],
    technical: feasibilitySections.find(section => section.id === 'technical')?.fields.map(field => field.id) ?? [],
    financial: feasibilitySections.find(section => section.id === 'financial')?.fields.map(field => field.id) ?? [],
    legal: feasibilitySections.find(section => section.id === 'legal')?.fields.map(field => field.id) ?? [],
  }), [feasibilitySections]);

  const feasibilityMetrics = useMemo(() => {
    const requiredCapital = toNum(feasibility.financial.requiredCapital);
    const capex = toNum(feasibility.financial.capex);
    const monthlyOpex = toNum(feasibility.financial.monthlyOpex);
    const expectedMonthlyRevenue = toNum(feasibility.financial.expectedMonthlyRevenue);
    const monthlyProfit = expectedMonthlyRevenue - monthlyOpex;
    const annualProfit = monthlyProfit * 12;
    const breakEvenMonths = capex > 0 && monthlyProfit > 0 ? capex / monthlyProfit : null;
    const roi = requiredCapital > 0 ? (annualProfit / requiredCapital) * 100 : null;
    const hasFinancialInput = [requiredCapital, capex, monthlyOpex, expectedMonthlyRevenue].some(value => value > 0);
    let score = (Object.keys(sectionWeights) as FeasibilitySection[]).reduce((sum, section) => {
      return sum + sectionCompletion(feasibility[section], fieldMap[section]) * sectionWeights[section];
    }, 0);
    if (hasFinancialInput && monthlyProfit <= 0) score -= 15;
    if (breakEvenMonths !== null && breakEvenMonths > 36) score -= 10;
    if (requiredCapital <= 0) score -= 10;
    const roundedScore = clampScore(score);
    const missingSections = (Object.keys(sectionWeights) as FeasibilitySection[]).filter(section => {
      return sectionCompletion(feasibility[section], fieldMap[section]) < 0.5;
    }).length;
    const status: FeasibilityStatus = roundedScore < 50 || (hasFinancialInput && monthlyProfit <= 0)
      ? 'high_risk'
      : roundedScore < 75 || (breakEvenMonths !== null && breakEvenMonths > 36)
        ? 'needs_review'
        : 'feasible';
    return {
      requiredCapital,
      capex,
      monthlyOpex,
      expectedMonthlyRevenue,
      monthlyProfit,
      annualProfit,
      breakEvenMonths,
      roi,
      hasFinancialInput,
      score: roundedScore,
      status,
      missingSections,
    };
  }, [feasibility, fieldMap]);

  const loadProject = useCallback(async () => {
    if (!user || !id) return;
    setLoadingProject(true);
    const [projectRes, savingsRes, feasibilityRes, taskRes, milestoneRes, documentsRes, financialRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).eq('id', id).maybeSingle(),
      supabase.from('savings_items').select('amount').eq('user_id', user.id),
      (supabase as any)
        .from('project_feasibility_studies')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id)
        .maybeSingle(),
      (supabase as any)
        .from('project_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id),
      (supabase as any)
        .from('project_milestones')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id),
      (supabase as any)
        .from('project_documents')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', id),
      (supabase as any)
        .from('project_financial_models')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id)
        .maybeSingle(),
    ]);
    const loadedProject = projectRes.error ? null : (projectRes.data as ProjectRow | null);
    const loadedTasks = taskRes.error ? [] : (taskRes.data ?? []) as ProjectTaskRow[];
    const loadedMilestones = milestoneRes.error ? [] : (milestoneRes.data ?? []) as ProjectMilestoneRow[];
    const loadedDocumentsCount = documentsRes.error ? 0 : (documentsRes.data ?? []).length;
    const loadedFeasibility = !feasibilityRes.error && feasibilityRes.data ? feasibilityRes.data as FeasibilityStudyRow : null;
    setProject(loadedProject);
    if (!savingsRes.error) {
      setSavings(((savingsRes.data ?? []) as SavingsRow[]).reduce((sum, row) => sum + toNum(row.amount), 0));
    }
    if (loadedFeasibility) {
      setFeasibilityId(loadedFeasibility.id);
      setFeasibility(normalizeFeasibilityRow(loadedFeasibility, loadedProject));
    } else {
      setFeasibilityId(null);
      setFeasibility(normalizeFeasibilityRow(null, loadedProject));
    }
    setTaskSummary(buildProjectTasksSummary(loadedTasks, loadedMilestones));
    setDocumentsCount(loadedDocumentsCount);
    setKpiSummary(buildProjectKpiSummary({
      project: loadedProject,
      financialModel: financialRes.error ? null : financialRes.data,
      feasibilityStudy: loadedFeasibility,
      tasks: loadedTasks,
      milestones: loadedMilestones,
      documentsCount: loadedDocumentsCount,
    }));
    setLoadingProject(false);
  }, [id, user]);

  useEffect(() => {
    if (!loading && user) loadProject();
    if (!loading && !user) setLoadingProject(false);
  }, [loadProject, loading, user]);

  const model = useMemo(() => {
    const notes = parseNotes(project?.notes);
    const capital = toNum(notes.capital ?? notes.capital_amount ?? project?.budget);
    const monthlyIncome = toNum(notes.monthlyRevenue ?? notes.monthly_revenue ?? notes.total_income);
    const monthlyExpenses = toNum(notes.monthlyExpenses ?? notes.monthly_expenses ?? notes.total_expenses);
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
      notes,
      capital,
      monthlyIncome,
      monthlyExpenses,
      currentProfit,
      target,
      net,
      remainingBudget,
      progress,
      startDate,
      endDate,
      daysRemaining,
      duration,
      phase,
      statusKey,
      typeKey,
      risk,
      priority: notes.priority || (risk === 'high' ? tr.high : risk === 'medium' ? tr.medium : tr.low),
      description: notes.idea || notes.description || notes.notes || '',
    };
  }, [project, savings, tr.high, tr.low, tr.medium, tr.noData]);

  const updateFeasibility = (section: FeasibilitySection, field: string, value: string) => {
    setNotice('');
    setFeasibility(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const saveFeasibility = async () => {
    if (!user || !project) return;
    setSavingFeasibility(true);
    setNotice('');
    const payload = {
      id: feasibilityId ?? undefined,
      user_id: user.id,
      project_id: project.id,
      market_data: feasibility.market,
      technical_data: feasibility.technical,
      financial_data: feasibility.financial,
      legal_data: feasibility.legal,
      feasibility_score: feasibilityMetrics.score,
      feasibility_status: feasibilityMetrics.status,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await (supabase as any)
      .from('project_feasibility_studies')
      .upsert(payload, { onConflict: 'user_id,project_id' })
      .select('id')
      .single();
    setSavingFeasibility(false);
    if (error) {
      setNotice(tr.feasibilitySaveError);
      return;
    }
    setFeasibilityId(data?.id ?? feasibilityId);
    setNotice(tr.feasibilitySaved);
  };

  const tabLabel = (tab: TabId) => {
    if (tab === 'financial') return tr.financial;
    return tr[tab];
  };

  const statusLabel = (status: FeasibilityStatus) => {
    if (status === 'feasible') return tr.feasible;
    if (status === 'high_risk') return tr.highRisk;
    return tr.needsReview;
  };

  const numericLabel = (value: number | null, suffix = '') => {
    if (value === null || !Number.isFinite(value)) return tr.noData;
    return `${new Intl.NumberFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 }).format(value)}${suffix}`;
  };

  const moneyOrNoData = (value: number) => (value > 0 || value < 0 ? money(value) : tr.noData);

  const projectTitle = project?.name || tr.projectName;
  const statusProjectLabel = tr[model.statusKey];
  const typeLabel = tr[model.typeKey];
  const riskText = tr[riskCopyKey(model.risk)];

  const heroMetrics = [
    { label: tr.projectType, value: typeLabel },
    { label: tr.status, value: statusProjectLabel },
    { label: tr.capital, value: money(model.capital) },
    { label: tr.financialTarget, value: model.target > 0 ? money(model.target) : tr.noData },
    { label: tr.startDate, value: dateLabel(model.startDate) },
    { label: tr.endDate, value: dateLabel(model.endDate) },
  ];

  if (loading || loadingProject) {
    return (
      <div className="project-workspace" dir={dir}>
        <Sidebar />
        <DashboardPageShell contentClassName="workspace-content">
          <div className="state-card">{tr.workspace}</div>
        </DashboardPageShell>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="project-workspace" dir={dir}>
        <Sidebar />
        <DashboardPageShell contentClassName="workspace-content">
          <EmptyState title={tr.signIn} button={tr.back} onClick={() => router.push('/projects')} />
        </DashboardPageShell>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-workspace" dir={dir}>
        <Sidebar />
        <DashboardPageShell contentClassName="workspace-content">
          <EmptyState title={tr.notFound} button={tr.back} onClick={() => router.push('/projects')} />
        </DashboardPageShell>
      </div>
    );
  }

  return (
    <div className="project-workspace" dir={dir}>
      <Sidebar />
      <DashboardPageShell contentClassName="workspace-content">
        <section className="workspace-hero">
          <div className="hero-copy">
            <Link href="/projects" className="back-link"><ArrowLeft size={16} /> {tr.back}</Link>
            <span>{tr.workspace}</span>
            <h1>{project.emoji || '🚀'} {projectTitle}</h1>
            <p>{model.description || tr.projectSummary}</p>
          </div>
          <div className="hero-actions">
            <button type="button" onClick={() => router.push('/projects')}><Pencil size={16} /> {tr.editProject}</button>
            <button type="button" onClick={() => router.push('/expenses/add')}><Plus size={16} /> {tr.addExpense}</button>
            <button type="button" onClick={() => router.push('/income/add')}><Plus size={16} /> {tr.addIncome}</button>
            <button type="button" onClick={() => setActiveTab('ai')}><Bot size={16} /> {tr.analyzeProject}</button>
            <LanguageSwitcher variant="dark" compact />
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

        <nav className="workspace-tabs" role="tablist" aria-label={tr.workspace}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={event => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                  const index = tabs.findIndex(item => item.id === activeTab);
                  const next = event.key === 'ArrowRight' ? index + 1 : index - 1;
                  setActiveTab(tabs[(next + tabs.length) % tabs.length].id);
                }}
              >
                <Icon size={16} />
                {tabLabel(tab.id)}
              </button>
            );
          })}
        </nav>

        {activeTab === 'overview' ? (
          <OverviewTab
            tr={tr}
            projectTitle={projectTitle}
            model={model}
            typeLabel={typeLabel}
            statusLabel={statusProjectLabel}
            riskText={riskText}
            taskSummary={taskSummary}
            documentsCount={documentsCount}
            kpiSummary={kpiSummary}
            money={money}
            dateLabel={dateLabel}
            setActiveTab={setActiveTab}
            routerPush={router.push}
          />
        ) : activeTab === 'feasibility' ? (
          <section className="feasibility-tab" role="tabpanel">
            <div className="feasibility-summary-grid">
              <article className={`warm-card score-card ${feasibilityMetrics.status}`}>
                <CardTitle icon={<Target size={20} />} title={tr.feasibilitySummary} />
                <div className="score-row">
                  <div className="score-number" style={{ '--score-angle': `${feasibilityMetrics.score * 3.6}deg` } as CSSProperties}>
                    <strong>{feasibilityMetrics.score}</strong>
                    <span>/100</span>
                  </div>
                  <div>
                    <span className={`status-pill ${feasibilityMetrics.status}`}>{statusLabel(feasibilityMetrics.status)}</span>
                    <p>{tr.internalScoreDisclaimer}</p>
                  </div>
                </div>
              </article>
              <Metric label={tr.requiredCapital} value={moneyOrNoData(feasibilityMetrics.requiredCapital)} />
              <Metric label={tr.monthlyProfitEstimate} value={feasibilityMetrics.hasFinancialInput ? money(feasibilityMetrics.monthlyProfit) : tr.noData} />
              <Metric label={tr.breakEvenEstimate} value={feasibilityMetrics.breakEvenMonths === null ? tr.noData : `${numericLabel(feasibilityMetrics.breakEvenMonths)} ${tr.months}`} />
              <Metric label={tr.roiEstimate} value={feasibilityMetrics.roi === null ? tr.noData : numericLabel(feasibilityMetrics.roi, '%')} />
              <Metric label={tr.missingSections} value={String(feasibilityMetrics.missingSections)} />
            </div>

            {notice ? <div className="notice" role="status">{notice}</div> : null}

            <div className="feasibility-layout">
              <div className="feasibility-sections">
                {feasibilitySections.map(section => {
                  const Icon = section.icon;
                  return (
                    <article className="warm-card feasibility-section" key={section.id}>
                      <div className="section-heading">
                        <div>
                          <small>{Math.round(sectionCompletion(feasibility[section.id], fieldMap[section.id]) * 100)}%</small>
                          <h2>{section.title}</h2>
                        </div>
                        <Icon size={22} />
                      </div>
                      <div className="feasibility-form-grid">
                        {section.fields.map(field => {
                          const value = feasibility[section.id][field.id] ?? '';
                          const inputId = `${section.id}-${field.id}`;
                          const fieldType = 'type' in field ? field.type : undefined;
                          if (fieldType === 'select') {
                            return (
                              <label className="form-field" htmlFor={inputId} key={field.id}>
                                <span>{field.label}</span>
                                <select id={inputId} value={value} onChange={event => updateFeasibility(section.id, field.id, event.target.value)}>
                                  <option value="">{tr.noData}</option>
                                  {countryOptions.map(country => (
                                    <option value={country} key={country}>{tr[country]}</option>
                                  ))}
                                </select>
                              </label>
                            );
                          }
                          return (
                            <label className="form-field" htmlFor={inputId} key={field.id}>
                              <span>{field.label}</span>
                              {fieldType === 'number' ? (
                                <input
                                  id={inputId}
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={value}
                                  onChange={event => updateFeasibility(section.id, field.id, event.target.value)}
                                />
                              ) : (
                                <textarea
                                  id={inputId}
                                  rows={3}
                                  value={value}
                                  onChange={event => updateFeasibility(section.id, field.id, event.target.value)}
                                />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>

              <aside className="feasibility-side">
                <article className="warm-card calculations-card">
                  <CardTitle icon={<Coins size={20} />} title={tr.financialFeasibility} />
                  <Metric label={tr.monthlyProfitEstimate} value={feasibilityMetrics.hasFinancialInput ? money(feasibilityMetrics.monthlyProfit) : tr.noData} />
                  <Metric label={tr.breakEvenEstimate} value={feasibilityMetrics.breakEvenMonths === null ? tr.noData : `${numericLabel(feasibilityMetrics.breakEvenMonths)} ${tr.months}`} />
                  <Metric label={tr.roiEstimate} value={feasibilityMetrics.roi === null ? tr.noData : numericLabel(feasibilityMetrics.roi, '%')} />
                </article>

                <article className="warm-card ai-placeholder">
                  <CardTitle icon={<Bot size={20} />} title={tr.aiFeasibilityAnalysis} />
                  <p>{tr.aiFeasibilitySoon}</p>
                </article>

                <article className="warm-card future-actions">
                  <button
                    type="button"
                    className="primary-save"
                    onClick={saveFeasibility}
                    disabled={savingFeasibility}
                    aria-label={tr.saveFeasibilityStudy}
                  >
                    <Save size={16} />
                    {savingFeasibility ? tr.saveFeasibilityStudy : tr.saveFeasibilityStudy}
                  </button>
                  <button type="button" className="disabled-btn" disabled aria-disabled="true">
                    <FileText size={16} />
                    {tr.exportFeasibilityPdf}
                    <span>{tr.comingSoonShort}</span>
                  </button>
                </article>
              </aside>
            </div>
          </section>
        ) : activeTab === 'financial' ? (
          <ProjectFinancialModelTab
            userId={user.id}
            projectId={project.id}
            initialCapital={model.capital}
            defaultCurrency={String(model.notes.currency ?? 'KWD')}
            lang={lang}
          />
        ) : activeTab === 'tasks' ? (
          <ProjectTasksTab
            userId={user.id}
            projectId={project.id}
            currency={String(model.notes.currency ?? 'KWD')}
            lang={lang}
            onSummaryChange={setTaskSummary}
          />
        ) : activeTab === 'documents' ? (
          <ProjectDocumentsTab
            userId={user.id}
            projectId={project.id}
            lang={lang}
            onDocumentsCountChange={setDocumentsCount}
          />
        ) : activeTab === 'kpis' ? (
          <ProjectKpisTab
            userId={user.id}
            projectId={project.id}
            project={project}
            currency={String(model.notes.currency ?? 'KWD')}
            lang={lang}
            onSummaryChange={setKpiSummary}
          />
        ) : activeTab === 'ai' ? (
          <ProjectAiAdvisorTab
            projectId={project.id}
            lang={lang as Lang}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        ) : (
          <section className="placeholder-grid">
            {tabs.filter(tab => tab.id === activeTab).map(tab => {
              const Icon = tab.icon;
              const hint = tab.hintKey ? tr[tab.hintKey] : tr.comingSoon;
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
      </DashboardPageShell>

      <style jsx global>{`
        .project-workspace{min-height:100vh;background:#F5F1E8;color:#2B1A0F;font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}.workspace-content{display:grid;gap:18px;min-width:0}.workspace-hero{position:relative;overflow:hidden;border-radius:24px;padding:26px;background:radial-gradient(circle at 14% 10%,rgba(250,199,117,.26),transparent 30%),linear-gradient(135deg,#1A0F05,#2B1A0F 50%,#8A5514 138%);color:#FFFDF8;box-shadow:0 22px 55px rgba(61,41,20,.18);display:grid;gap:20px;min-width:0}.hero-copy span,.back-link{color:#FAC775;font-size:12px;font-weight:900}.back-link{display:inline-flex;align-items:center;gap:7px;text-decoration:none;margin-bottom:10px}.hero-copy h1{margin:8px 0;font-size:clamp(30px,5vw,48px);font-weight:950;line-height:1.08}.hero-copy p{margin:0;color:rgba(255,253,248,.76);line-height:1.8;max-width:820px}.hero-actions{display:flex;flex-wrap:wrap;gap:10px}.hero-actions button{min-height:42px;border-radius:13px;border:1px solid rgba(250,199,117,.28);background:rgba(20,12,6,.48);color:#FFFDF8;padding:0 14px;display:inline-flex;align-items:center;gap:8px;font-weight:900;font-family:inherit;cursor:pointer}.hero-actions button:first-child,.primary-save{background:linear-gradient(135deg,#FAC775,#EF9F27);color:#251407}.hero-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.hero-metrics div{border:1px solid rgba(250,199,117,.18);background:rgba(255,253,248,.08);border-radius:16px;padding:12px;min-width:0}.hero-metrics small{display:block;color:#FAC775;font-weight:900}.hero-metrics strong{display:block;margin-top:5px;color:#FFFDF8;overflow-wrap:anywhere}.workspace-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:thin}.workspace-tabs button{flex:0 0 auto;min-height:42px;border:1px solid rgba(186,117,23,.18);border-radius:999px;background:#FFFDF8;color:#5B4332;padding:0 14px;display:flex;align-items:center;gap:8px;font-weight:900;font-family:inherit;cursor:pointer}.workspace-tabs button.active,.workspace-tabs button:focus-visible{background:#3D2914;color:#FAC775;outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.16)}.overview-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px}.warm-card{background:#FFFDF8;border:1px solid rgba(186,117,23,.16);border-radius:20px;padding:18px;box-shadow:0 14px 34px rgba(61,41,20,.07);min-width:0}.span-6{grid-column:span 6}.card-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.card-title h2{margin:0;color:#3D2914;font-size:19px}.card-title svg{color:#BA7517}.details-list{display:grid;gap:10px;margin:0}.details-list div{display:grid;grid-template-columns:minmax(120px,.35fr) minmax(0,1fr);gap:12px;border-bottom:1px solid rgba(186,117,23,.1);padding-bottom:10px}.details-list dt,.metric small{color:#7A6A55;font-weight:900}.details-list dd{margin:0;color:#2B1A0F;font-weight:900;overflow-wrap:anywhere}.badge{display:inline-flex;border-radius:999px;background:#FAEEDA;color:#854F0B;padding:5px 10px;font-size:12px}.badge.completed{background:#EAF3DE;color:#27500A}.badge.paused{background:#FCEBEB;color:#791F1F}.metric-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.metric,.timeline-list .metric{border:1px solid rgba(186,117,23,.12);background:#FFF8EA;border-radius:15px;padding:12px;min-width:0}.metric strong{display:block;margin-top:6px;color:#2B1A0F;font-size:18px;overflow-wrap:anywhere}.progress-bar{height:10px;border-radius:999px;background:#FAEEDA;overflow:hidden;margin-top:14px}.progress-bar span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#FAC775,#BA7517)}.timeline-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.risk-card,.quick-card,.task-overview-card,.kpi-overview-card{grid-column:span 6}.risk-badge{display:inline-flex;border-radius:999px;padding:8px 12px;font-weight:950;margin-bottom:10px}.risk-card.low .risk-badge{background:#EAF3DE;color:#27500A}.risk-card.medium .risk-badge{background:#FFF4DE;color:#9A5E0D}.risk-card.high .risk-badge{background:#FCEBEB;color:#791F1F}.risk-card p,.ai-placeholder p{margin:0;color:#5B4332;line-height:1.7}.overview-link-btn{margin-top:14px;min-height:42px;border:1px solid rgba(186,117,23,.18);border-radius:13px;background:linear-gradient(135deg,#FAC775,#EF9F27);color:#251407;padding:0 14px;font-weight:950;font-family:inherit;cursor:pointer}.overview-link-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.16)}.quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.quick-grid button{min-height:44px;border:1px solid rgba(186,117,23,.18);border-radius:13px;background:#FFF8EA;color:#3D2914;font-weight:900;font-family:inherit;cursor:pointer}.quick-grid button:hover,.quick-grid button:focus-visible{background:#FAEEDA;outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.14)}.feasibility-tab{display:grid;gap:16px;min-width:0}.feasibility-summary-grid{display:grid;grid-template-columns:1.6fr repeat(5,minmax(0,1fr));gap:12px;align-items:stretch}.score-card{display:grid;align-content:start}.score-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:center}.score-number{width:104px;height:104px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#BA7517 var(--score-angle, 270deg),#FAEEDA 0);position:relative;box-shadow:inset 0 0 0 12px #FFF8EA}.score-number strong{font-size:30px;color:#2B1A0F}.score-number span{font-size:12px;color:#7A6A55;font-weight:900}.status-pill{display:inline-flex;border-radius:999px;padding:7px 11px;font-weight:950;font-size:12px}.status-pill.feasible{background:#EAF3DE;color:#27500A}.status-pill.needs_review{background:#FFF4DE;color:#9A5E0D}.status-pill.high_risk{background:#FCEBEB;color:#791F1F}.score-row p{margin:10px 0 0;color:#5B4332;line-height:1.6}.notice{border:1px solid rgba(186,117,23,.2);background:#FFF8EA;color:#3D2914;border-radius:15px;padding:12px 14px;font-weight:900}.feasibility-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(290px,.85fr);gap:16px;align-items:start}.feasibility-sections{display:grid;gap:16px;min-width:0}.feasibility-side{display:grid;gap:16px;min-width:0;position:sticky;top:16px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.section-heading small{display:inline-flex;border-radius:999px;background:#FAEEDA;color:#854F0B;padding:5px 10px;font-weight:950}.section-heading h2{margin:8px 0 0;color:#3D2914;font-size:20px}.section-heading svg{color:#BA7517}.feasibility-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.form-field{display:grid;gap:7px;min-width:0}.form-field span{font-weight:900;color:#5B4332}.form-field input,.form-field textarea,.form-field select{width:100%;min-width:0;border:1px solid rgba(186,117,23,.2);background:#FFFDF8;color:#1A1A1A;border-radius:13px;padding:11px 12px;font-family:inherit;font-weight:800;outline:none}.form-field textarea{resize:vertical;line-height:1.6}.form-field input:focus,.form-field textarea:focus,.form-field select:focus{border-color:#EF9F27;box-shadow:0 0 0 3px rgba(239,159,39,.15)}.calculations-card{display:grid;gap:10px}.future-actions{display:grid;gap:10px}.future-actions button{min-height:44px;border-radius:13px;border:1px solid rgba(186,117,23,.18);font-family:inherit;font-weight:950;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.future-actions button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.16)}.primary-save:disabled{opacity:.66;cursor:not-allowed}.disabled-btn{background:#FFF8EA;color:#7A6A55;cursor:not-allowed}.disabled-btn span{border-radius:999px;background:#FAEEDA;color:#854F0B;padding:3px 8px;font-size:11px}.placeholder-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}.placeholder-card{min-height:280px;display:grid;place-items:center;text-align:center;align-content:center}.placeholder-card svg{color:#BA7517}.placeholder-card h2{margin:12px 0 6px;color:#3D2914}.placeholder-card p{margin:0;max-width:620px;color:#5B4332;line-height:1.8}.placeholder-card span{margin-top:14px;border-radius:999px;background:#FAEEDA;color:#854F0B;padding:7px 12px;font-weight:900}.state-card{border-radius:20px;background:#FFFDF8;border:1px solid rgba(186,117,23,.16);padding:24px;color:#3D2914;font-weight:900}.empty-state{min-height:360px;display:grid;place-items:center;text-align:center}.empty-state article{background:#FFFDF8;border:1px solid rgba(186,117,23,.16);border-radius:22px;padding:28px;box-shadow:0 14px 34px rgba(61,41,20,.07)}.empty-state button{margin-top:16px;min-height:42px;border:0;border-radius:13px;background:linear-gradient(135deg,#FAC775,#EF9F27);color:#251407;padding:0 16px;font-weight:900;font-family:inherit;cursor:pointer}@media(max-width:1280px){.feasibility-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.score-card{grid-column:1 / -1}}@media(max-width:1180px){.hero-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.span-6,.risk-card,.quick-card,.task-overview-card,.kpi-overview-card{grid-column:1 / -1}.feasibility-layout{grid-template-columns:1fr}.feasibility-side{position:static}}@media(max-width:760px){.workspace-hero{padding:22px}.hero-actions{display:grid;grid-template-columns:1fr}.hero-actions button{width:100%;justify-content:center}.hero-metrics,.metric-grid,.timeline-list,.quick-grid,.feasibility-summary-grid,.feasibility-form-grid{grid-template-columns:1fr}.details-list div{grid-template-columns:1fr}.warm-card{padding:16px}.overview-grid{grid-template-columns:1fr}.overview-link-btn{width:100%}.score-row{grid-template-columns:1fr}.score-number{width:92px;height:92px}.section-heading{align-items:flex-start}.placeholder-card{min-height:220px}}
      `}</style>
    </div>
  );
}

function OverviewTab({
  tr,
  projectTitle,
  model,
  typeLabel,
  statusLabel,
  riskText,
  taskSummary,
  documentsCount,
  kpiSummary,
  money,
  dateLabel,
  setActiveTab,
  routerPush,
}: {
  tr: Translation;
  projectTitle: string;
  model: any;
  typeLabel: string;
  statusLabel: string;
  riskText: string;
  taskSummary: ProjectTasksSummary;
  documentsCount: number;
  kpiSummary: ProjectKpiSummary;
  money: (value: number) => string;
  dateLabel: (value?: string | null) => string;
  setActiveTab: (tab: TabId) => void;
  routerPush: (href: string) => void;
}) {
  return (
    <section className="overview-grid">
      <article className="warm-card span-6">
        <CardTitle icon={<FolderKanban size={20} />} title={tr.projectSummary} />
        <dl className="details-list">
          <div><dt>{tr.projectName}</dt><dd>{projectTitle}</dd></div>
          <div><dt>{tr.description}</dt><dd>{model.description || tr.noData}</dd></div>
          <div><dt>{tr.projectType}</dt><dd>{typeLabel}</dd></div>
          <div><dt>{tr.status}</dt><dd><span className={`badge ${model.statusKey}`}>{statusLabel}</span></dd></div>
          <div><dt>{tr.priority}</dt><dd>{model.priority}</dd></div>
          <div><dt>{tr.currentPhase}</dt><dd>{String(model.phase)}</dd></div>
        </dl>
      </article>

      <article className="warm-card span-6">
        <CardTitle icon={<Coins size={20} />} title={tr.financialSnapshot} />
        <div className="metric-grid">
          <Metric label={tr.capital} value={money(model.capital)} />
          <Metric label={tr.totalIncome} value={model.monthlyIncome > 0 ? money(model.monthlyIncome) : tr.noData} />
          <Metric label={tr.totalExpenses} value={model.monthlyExpenses > 0 ? money(model.monthlyExpenses) : tr.noData} />
          <Metric label={tr.netResult} value={money(model.net)} />
          <Metric label={tr.remainingBudget} value={money(model.remainingBudget)} />
          <Metric label={tr.targetProgress} value={`${model.progress.toFixed(0)}%`} />
        </div>
        <div className="progress-bar" aria-label={tr.targetProgress}>
          <span style={{ width: `${model.progress}%` }} />
        </div>
      </article>

      <article className="warm-card">
        <CardTitle icon={<CalendarDays size={20} />} title={tr.timelineSnapshot} />
        <div className="timeline-list">
          <Metric label={tr.startDate} value={dateLabel(model.startDate)} />
          <Metric label={tr.endDate} value={dateLabel(model.endDate)} />
          <Metric label={tr.daysRemaining} value={model.daysRemaining === null ? tr.noData : String(model.daysRemaining)} />
          <Metric label={tr.duration} value={model.duration === null ? tr.noData : `${model.duration}`} />
          <Metric label={tr.currentPhase} value={String(model.phase)} />
        </div>
      </article>

      <article className={`warm-card risk-card ${model.risk}`}>
        <CardTitle icon={<AlertTriangle size={20} />} title={tr.riskSnapshot} />
        <div className="risk-badge">{tr[model.risk as RiskLevel]}</div>
        <p>{riskText}</p>
      </article>

      <article className="warm-card task-overview-card">
        <CardTitle icon={<ClipboardList size={20} />} title={tr.projectProgress} />
        <div className="metric-grid">
          <Metric label={tr.totalTasks} value={String(taskSummary.totalTasks)} />
          <Metric label={tr.completedTasks} value={String(taskSummary.completedTasks)} />
          <Metric label={tr.lateTasks} value={String(taskSummary.lateTasks)} />
          <Metric label={tr.upcomingDeadlines} value={dateLabel(taskSummary.upcomingDeadline)} />
          <Metric label={tr.nextMilestone} value={dateLabel(taskSummary.nextMilestone)} />
          <Metric label={tr.estimatedTaskCosts} value={money(taskSummary.estimatedTaskCosts)} />
          <Metric label={tr.documentsCount} value={String(documentsCount)} />
        </div>
        <div className="progress-bar" aria-label={tr.projectProgress}>
          <span style={{ width: `${taskSummary.progressPercent}%` }} />
        </div>
      </article>

      <article className={`warm-card kpi-overview-card ${kpiSummary.status}`}>
        <CardTitle icon={<Gauge size={20} />} title={tr.projectHealthScore} />
        <div className="metric-grid">
          <Metric label={tr.projectHealthScore} value={kpiSummary.score === null ? tr.noData : `${kpiSummary.score}/100`} />
          <Metric label={tr.status} value={tr[kpiSummary.status]} />
          <Metric label={tr.projectProgress} value={kpiSummary.taskProgress === null ? tr.noData : `${kpiSummary.taskProgress}%`} />
          <Metric label={tr.lateTasks} value={String(kpiSummary.lateTasks)} />
          <Metric
            label={tr.topRiskFlag}
            value={kpiSummary.topRiskCode ? tr[kpiSummary.topRiskCode] : tr.noRiskFlags}
          />
        </div>
        <button type="button" className="overview-link-btn" onClick={() => setActiveTab('kpis')} aria-label={tr.openKpis}>
          {tr.openKpis}
        </button>
      </article>

      <article className="warm-card quick-card">
        <CardTitle icon={<CheckCircle2 size={20} />} title={tr.quickActions} />
        <div className="quick-grid">
          <button type="button" onClick={() => routerPush('/expenses/add')}>{tr.addExpense}</button>
          <button type="button" onClick={() => routerPush('/income/add')}>{tr.addIncome}</button>
          <button type="button" onClick={() => setActiveTab('tasks')}>{tr.addTask}</button>
          <button type="button" onClick={() => setActiveTab('feasibility')}>{tr.generateFeasibility}</button>
          <button type="button" onClick={() => setActiveTab('financial')}>{tr.createFinancialModel}</button>
        </div>
      </article>
    </section>
  );
}

function CardTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="card-title"><h2>{title}</h2>{icon}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><small>{label}</small><strong>{value}</strong></div>;
}

function EmptyState({ title, button, onClick }: { title: string; button: string; onClick: () => void }) {
  return (
    <div className="empty-state">
      <article>
        <FolderKanban size={42} color="#BA7517" />
        <h1>{title}</h1>
        <button type="button" onClick={onClick}>{button}</button>
      </article>
    </div>
  );
}
