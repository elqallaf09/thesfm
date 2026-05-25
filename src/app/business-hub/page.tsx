'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
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
  ShieldCheck,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';

type Lang = 'ar' | 'en' | 'fr';
type ReadinessStatus = 'not_ready' | 'needs_improvement' | 'good' | 'ready_for_review';
type WizardField = 'targetMarket' | 'businessType' | 'capitalRange' | 'customers' | 'needsInvestors' | 'gccExpansion';

type ProjectRow = Record<string, any> & {
  id: string;
  user_id?: string;
  name?: string | null;
  budget?: string | number | null;
  timeline?: string | null;
  notes?: Record<string, any> | string | null;
  created_at?: string | null;
};

type ModuleRows = {
  feasibility: any[];
  financialModels: any[];
  tasks: any[];
  milestones: any[];
  documents: any[];
  pitchDecks: any[];
};

type WizardState = Record<WizardField, string>;

const EMPTY_MODULES: ModuleRows = {
  feasibility: [],
  financialModels: [],
  tasks: [],
  milestones: [],
  documents: [],
  pitchDecks: [],
};

const TEXT = {
  ar: {
    title: 'مركز الأعمال',
    subtitle: 'حوّل أفكارك ومشاريعك إلى خطط أعمال قابلة للتمويل والنمو، بناءً على بياناتك الفعلية فقط.',
    badge: 'طبقة استراتيجية فوق مشاريعك',
    startReadiness: 'ابدأ تقييم الجاهزية',
    openProjects: 'افتح مشاريعي',
    createPitchDeck: 'إنشاء Pitch Deck',
    signIn: 'سجّل الدخول لعرض مركز الأعمال.',
    loading: 'جاري تحميل بيانات الأعمال...',
    loadError: 'تعذر تحميل بيانات مركز الأعمال حالياً.',
    selectProject: 'اختيار المشروع',
    selectProjectHint: 'اختر مشروعاً لعرض الجاهزية بناءً على بياناته الفعلية.',
    addProjectFirst: 'أضف مشروعاً أولاً لعرض جاهزية الأعمال.',
    addProject: 'إضافة مشروع',
    realDataOnly: 'لا يتم عرض أي أرقام أو توصيات إلا من بياناتك المسجلة.',
    businessReadiness: 'لوحة جاهزية الأعمال',
    projectReadiness: 'جاهزية المشروع',
    fundingReadiness: 'جاهزية التمويل',
    documentReadiness: 'جاهزية المستندات',
    financialModelReadiness: 'جاهزية النموذج المالي',
    pitchDeckReadiness: 'جاهزية العرض الاستثماري',
    basicProjectInfo: 'البيانات الأساسية للمشروع',
    feasibilityStudy: 'دراسة الجدوى',
    financialModel: 'النموذج المالي',
    tasksMilestones: 'المهام والمعالم',
    documents: 'المستندات',
    kpiSignals: 'مؤشرات الأداء',
    pitchDeck: 'العرض الاستثماري',
    capitalRequired: 'رأس المال المطلوب',
    useOfFunds: 'استخدام التمويل',
    available: 'متوفر',
    missing: 'غير مكتمل',
    notReady: 'غير جاهز',
    needsImprovement: 'يحتاج تحسين',
    good: 'جيد',
    readyForReview: 'جاهز للمراجعة',
    scoreFormula: 'الدرجة محسوبة من اكتمال بيانات المشروع والوحدات المرتبطة به فقط.',
    noScore: 'لا يتم حساب الجاهزية قبل اختيار مشروع.',
    jurisdictionWizard: 'معالج اختيار الدولة',
    jurisdictionIntro: 'أجب عن الأسئلة الأساسية لتكوين قائمة مراجعة تنظيمية أولية بدون أي أرقام أو نصائح قانونية مخترعة.',
    targetMarket: 'السوق المستهدف',
    businessType: 'نوع النشاط',
    capitalRange: 'نطاق رأس المال',
    customers: 'العملاء',
    needsInvestors: 'هل يحتاج مستثمرين؟',
    gccExpansion: 'هل توجد رغبة في التوسع الخليجي؟',
    choose: 'اختر',
    yes: 'نعم',
    no: 'لا',
    notSure: 'غير متأكد',
    b2b: 'B2B',
    b2c: 'B2C',
    government: 'حكومي',
    mixed: 'مختلط',
    smallCapital: 'أقل من 5,000',
    mediumCapital: '5,000 - 25,000',
    growthCapital: '25,000 - 100,000',
    enterpriseCapital: 'أكثر من 100,000',
    needsReviewStatus: 'يحتاج مراجعة',
    comparisonChecklist: 'قائمة المقارنة',
    missingWizardData: 'البيانات الناقصة',
    officialRequirements: 'متطلبات التسجيل والترخيص من المصادر الرسمية',
    officialTaxZakat: 'التزامات الضرائب أو الزكاة من المصادر الرسمية',
    bankingDocs: 'متطلبات الحساب البنكي والمستندات',
    investorRules: 'قواعد المستثمرين والملكية من الجهات الرسمية',
    trustedSourceNeeded: 'تحتاج هذه المعلومة إلى مصدر موثوق أو إدخال من المستخدم.',
    jurisdictionDisclaimer: 'هذه الأداة تنظيمية أولية ولا تعتبر استشارة قانونية أو ضريبية. تحقق من المصادر الرسمية قبل اتخاذ القرار.',
    fundingChecklist: 'قائمة جاهزية التمويل',
    completeThese: 'أكمل العناصر الناقصة قبل مشاركة المشروع مع ممولين أو مستثمرين.',
    strategicDocuments: 'مركز المستندات الاستراتيجية',
    businessPlan: 'خطة العمل',
    investmentMemo: 'مذكرة الاستثمار',
    dueDiligencePack: 'حزمة العناية الواجبة',
    comingSoon: 'قريباً',
    openTool: 'فتح الأداة',
    openMarket: 'فتح تحليلات السوق',
    openReports: 'فتح مركز التقارير',
    openZakat: 'فتح الزكاة',
    businessCopilot: 'مستشار الأعمال الذكي',
    copilotText: 'اختر مشروعاً ليقرأ المستشار بياناته ويقترح الخطوات القادمة.',
    openCopilot: 'فتح مستشار المشروع',
    linkedModules: 'روابط استراتيجية',
    projectCount: 'عدد المشاريع',
    selectedProject: 'المشروع المختار',
    insufficient: 'بيانات غير كافية',
    documentsCount: 'عدد المستندات',
    tasksCount: 'عدد المهام',
  },
  en: {
    title: 'Business Hub',
    subtitle: 'Turn your ideas and projects into fundable, scalable business plans based only on your real data.',
    badge: 'Strategic layer above your projects',
    startReadiness: 'Start Readiness Check',
    openProjects: 'Open My Projects',
    createPitchDeck: 'Create Pitch Deck',
    signIn: 'Sign in to view the Business Hub.',
    loading: 'Loading business data...',
    loadError: 'Could not load Business Hub data right now.',
    selectProject: 'Select Project',
    selectProjectHint: 'Choose a project to view readiness from its real data.',
    addProjectFirst: 'Add a project first to view business readiness.',
    addProject: 'Add Project',
    realDataOnly: 'No numbers or recommendations are shown unless they come from your saved data.',
    businessReadiness: 'Business Readiness Dashboard',
    projectReadiness: 'Project Readiness',
    fundingReadiness: 'Funding Readiness',
    documentReadiness: 'Document Readiness',
    financialModelReadiness: 'Financial Model Readiness',
    pitchDeckReadiness: 'Pitch Deck Readiness',
    basicProjectInfo: 'Basic project info',
    feasibilityStudy: 'Feasibility Study',
    financialModel: 'Financial Model',
    tasksMilestones: 'Tasks and milestones',
    documents: 'Documents',
    kpiSignals: 'KPI signals',
    pitchDeck: 'Pitch Deck',
    capitalRequired: 'Capital required',
    useOfFunds: 'Use of funds',
    available: 'Available',
    missing: 'Missing',
    notReady: 'Not Ready',
    needsImprovement: 'Needs Improvement',
    good: 'Good',
    readyForReview: 'Ready for Review',
    scoreFormula: 'The score is calculated only from project data and connected modules.',
    noScore: 'Readiness is not calculated until a project is selected.',
    jurisdictionWizard: 'Jurisdiction Wizard',
    jurisdictionIntro: 'Answer the basic questions to create an initial planning checklist without invented legal or tax numbers.',
    targetMarket: 'Target market',
    businessType: 'Business type',
    capitalRange: 'Capital range',
    customers: 'Customers',
    needsInvestors: 'Needs investors?',
    gccExpansion: 'Wants GCC expansion?',
    choose: 'Choose',
    yes: 'Yes',
    no: 'No',
    notSure: 'Not sure',
    b2b: 'B2B',
    b2c: 'B2C',
    government: 'Government',
    mixed: 'Mixed',
    smallCapital: 'Under 5,000',
    mediumCapital: '5,000 - 25,000',
    growthCapital: '25,000 - 100,000',
    enterpriseCapital: 'Over 100,000',
    needsReviewStatus: 'Needs review',
    comparisonChecklist: 'Comparison checklist',
    missingWizardData: 'Missing data',
    officialRequirements: 'Official registration and licensing requirements',
    officialTaxZakat: 'Tax or zakat obligations from official sources',
    bankingDocs: 'Bank account and documentation requirements',
    investorRules: 'Investor and ownership rules from official authorities',
    trustedSourceNeeded: 'This information requires a trusted source or user input.',
    jurisdictionDisclaimer: 'This is an initial planning tool and is not legal or tax advice. Check official sources before making a decision.',
    fundingChecklist: 'Funding readiness checklist',
    completeThese: 'Complete missing items before sharing the project with funders or investors.',
    strategicDocuments: 'Strategic Documents Hub',
    businessPlan: 'Business Plan',
    investmentMemo: 'Investment Memo',
    dueDiligencePack: 'Due Diligence Pack',
    comingSoon: 'Coming Soon',
    openTool: 'Open tool',
    openMarket: 'Open Market Analysis',
    openReports: 'Open Reports Center',
    openZakat: 'Open Zakat',
    businessCopilot: 'Business Co-pilot',
    copilotText: 'Choose a project so the advisor can read its data and suggest next steps.',
    openCopilot: 'Open Project Advisor',
    linkedModules: 'Strategic links',
    projectCount: 'Projects count',
    selectedProject: 'Selected project',
    insufficient: 'Insufficient data',
    documentsCount: 'Documents count',
    tasksCount: 'Tasks count',
  },
  fr: {
    title: 'Centre d’affaires',
    subtitle: 'Transformez vos idées et projets en plans d’affaires finançables et évolutifs, uniquement à partir de vos données réelles.',
    badge: 'Couche stratégique au-dessus de vos projets',
    startReadiness: 'Commencer le diagnostic',
    openProjects: 'Ouvrir mes projets',
    createPitchDeck: 'Créer un Pitch Deck',
    signIn: 'Connectez-vous pour afficher le Centre d’affaires.',
    loading: 'Chargement des données business...',
    loadError: 'Impossible de charger les données du Centre d’affaires pour le moment.',
    selectProject: 'Sélectionner un projet',
    selectProjectHint: 'Choisissez un projet pour afficher la préparation à partir de ses données réelles.',
    addProjectFirst: "Ajoutez d'abord un projet pour afficher la préparation de l'entreprise.",
    addProject: 'Ajouter un projet',
    realDataOnly: "Aucun chiffre ni recommandation n'est affiché sans données enregistrées.",
    businessReadiness: "Tableau de préparation de l'entreprise",
    projectReadiness: 'Préparation du projet',
    fundingReadiness: 'Préparation au financement',
    documentReadiness: 'Préparation des documents',
    financialModelReadiness: 'Préparation du modèle financier',
    pitchDeckReadiness: 'Préparation du Pitch Deck',
    basicProjectInfo: 'Informations de base du projet',
    feasibilityStudy: 'Étude de faisabilité',
    financialModel: 'Modèle financier',
    tasksMilestones: 'Tâches et jalons',
    documents: 'Documents',
    kpiSignals: 'Signaux KPI',
    pitchDeck: 'Pitch Deck',
    capitalRequired: 'Capital requis',
    useOfFunds: 'Utilisation des fonds',
    available: 'Disponible',
    missing: 'Manquant',
    notReady: 'Non prêt',
    needsImprovement: 'À améliorer',
    good: 'Bon',
    readyForReview: 'Prêt pour révision',
    scoreFormula: 'Le score est calculé uniquement à partir du projet et des modules connectés.',
    noScore: "La préparation n'est pas calculée avant de choisir un projet.",
    jurisdictionWizard: 'Assistant de juridiction',
    jurisdictionIntro: 'Répondez aux questions de base pour créer une liste initiale sans chiffres juridiques ou fiscaux inventés.',
    targetMarket: 'Marché cible',
    businessType: "Type d'activité",
    capitalRange: 'Fourchette de capital',
    customers: 'Clients',
    needsInvestors: 'Besoin d’investisseurs ?',
    gccExpansion: 'Expansion GCC souhaitée ?',
    choose: 'Choisir',
    yes: 'Oui',
    no: 'Non',
    notSure: 'Pas sûr',
    b2b: 'B2B',
    b2c: 'B2C',
    government: 'Gouvernement',
    mixed: 'Mixte',
    smallCapital: 'Moins de 5 000',
    mediumCapital: '5 000 - 25 000',
    growthCapital: '25 000 - 100 000',
    enterpriseCapital: 'Plus de 100 000',
    needsReviewStatus: 'À réviser',
    comparisonChecklist: 'Liste de comparaison',
    missingWizardData: 'Données manquantes',
    officialRequirements: 'Exigences officielles d’enregistrement et de licence',
    officialTaxZakat: 'Obligations fiscales ou zakat depuis des sources officielles',
    bankingDocs: 'Exigences bancaires et documentaires',
    investorRules: 'Règles des investisseurs et de propriété depuis les autorités officielles',
    trustedSourceNeeded: 'Cette information nécessite une source fiable ou une saisie utilisateur.',
    jurisdictionDisclaimer: 'Cet outil est destiné à la planification initiale et ne constitue pas un conseil juridique ou fiscal. Vérifiez les sources officielles avant toute décision.',
    fundingChecklist: 'Liste de préparation au financement',
    completeThese: 'Complétez les éléments manquants avant de partager le projet avec des financeurs ou investisseurs.',
    strategicDocuments: 'Centre des documents stratégiques',
    businessPlan: 'Business Plan',
    investmentMemo: 'Investment Memo',
    dueDiligencePack: 'Due Diligence Pack',
    comingSoon: 'Bientôt disponible',
    openTool: "Ouvrir l'outil",
    openMarket: "Ouvrir l'analyse du marché",
    openReports: 'Ouvrir le Centre des rapports',
    openZakat: 'Ouvrir Zakat',
    businessCopilot: "Co-pilote d'affaires",
    copilotText: 'Choisissez un projet afin que le conseiller lise ses données et propose les prochaines étapes.',
    openCopilot: 'Ouvrir le conseiller projet',
    linkedModules: 'Liens stratégiques',
    projectCount: 'Nombre de projets',
    selectedProject: 'Projet sélectionné',
    insufficient: 'Données insuffisantes',
    documentsCount: 'Nombre de documents',
    tasksCount: 'Nombre de tâches',
  },
} as const;

const COUNTRIES = [
  { value: 'kuwait', label: { ar: 'الكويت', en: 'Kuwait', fr: 'Koweït' } },
  { value: 'saudi-arabia', label: { ar: 'السعودية', en: 'Saudi Arabia', fr: 'Arabie saoudite' } },
  { value: 'uae', label: { ar: 'الإمارات', en: 'UAE', fr: 'EAU' } },
  { value: 'qatar', label: { ar: 'قطر', en: 'Qatar', fr: 'Qatar' } },
  { value: 'bahrain', label: { ar: 'البحرين', en: 'Bahrain', fr: 'Bahreïn' } },
  { value: 'oman', label: { ar: 'عُمان', en: 'Oman', fr: 'Oman' } },
  { value: 'global-other', label: { ar: 'عالمي / أخرى', en: 'Global / Other', fr: 'Global / Autre' } },
];

const BUSINESS_TYPES = [
  { value: 'ecommerce', label: { ar: 'متجر إلكتروني', en: 'E-commerce', fr: 'E-commerce' } },
  { value: 'restaurant', label: { ar: 'مطعم / كافيه', en: 'Restaurant / Cafe', fr: 'Restaurant / Café' } },
  { value: 'services', label: { ar: 'خدمات', en: 'Services', fr: 'Services' } },
  { value: 'saas', label: { ar: 'SaaS / تطبيق', en: 'SaaS / App', fr: 'SaaS / Application' } },
  { value: 'trading', label: { ar: 'تجارة عامة', en: 'General Trading', fr: 'Commerce général' } },
  { value: 'real-estate', label: { ar: 'عقار', en: 'Real Estate', fr: 'Immobilier' } },
  { value: 'other', label: { ar: 'مشروع آخر', en: 'Other Project', fr: 'Autre projet' } },
];

const CUSTOMER_TYPES = [
  { value: 'b2b', labelKey: 'b2b' },
  { value: 'b2c', labelKey: 'b2c' },
  { value: 'government', labelKey: 'government' },
  { value: 'mixed', labelKey: 'mixed' },
] as const;

const CAPITAL_RANGES = [
  { value: 'under-5000', labelKey: 'smallCapital' },
  { value: '5000-25000', labelKey: 'mediumCapital' },
  { value: '25000-100000', labelKey: 'growthCapital' },
  { value: 'over-100000', labelKey: 'enterpriseCapital' },
] as const;

const YES_NO = [
  { value: 'yes', labelKey: 'yes' },
  { value: 'no', labelKey: 'no' },
  { value: 'not-sure', labelKey: 'notSure' },
] as const;

const initialWizard: WizardState = {
  targetMarket: '',
  businessType: '',
  capitalRange: '',
  customers: '',
  needsInvestors: '',
  gccExpansion: '',
};

function toRecord(value: unknown): Record<string, any> {
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

function firstText(row: Record<string, any> | null | undefined, keys: string[], fallback = '') {
  if (!row) return fallback;
  const notes = toRecord(row.notes);
  for (const key of keys) {
    const direct = row[key];
    const noted = notes[key];
    const value = direct ?? noted;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasObjectData(value: unknown) {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(item => {
    if (item === null || item === undefined) return false;
    if (typeof item === 'string') return item.trim().length > 0;
    if (typeof item === 'number') return Number.isFinite(item);
    if (Array.isArray(item)) return item.length > 0;
    if (typeof item === 'object') return Object.keys(item as Record<string, unknown>).length > 0;
    return Boolean(item);
  });
  if (typeof value === 'string') return value.trim().length > 0;
  return Boolean(value);
}

function moduleExists(rows: any[], fields: string[] = []) {
  if (!rows.length) return false;
  if (!fields.length) return true;
  return rows.some(row => fields.some(field => hasObjectData(row?.[field])));
}

function completionStatus(score: number): ReadinessStatus {
  if (score >= 85) return 'ready_for_review';
  if (score >= 65) return 'good';
  if (score >= 35) return 'needs_improvement';
  return 'not_ready';
}

function statusClass(status: ReadinessStatus) {
  return status.replaceAll('_', '-');
}

function statusLabel(status: ReadinessStatus, text: typeof TEXT[Lang]) {
  if (status === 'ready_for_review') return text.readyForReview;
  if (status === 'needs_improvement') return text.needsImprovement;
  if (status === 'good') return text.good;
  return text.notReady;
}

function percent(value: number, lang: Lang) {
  return `${new Intl.NumberFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 }).format(value)}%`;
}

function selectedLabel(options: Array<{ value: string; label: Record<Lang, string> }>, value: string, lang: Lang) {
  return options.find(item => item.value === value)?.label[lang] ?? '';
}

export default function BusinessHubPage() {
  const { user, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const text = TEXT[locale];
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [modules, setModules] = useState<ModuleRows>(EMPTY_MODULES);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [wizard, setWizard] = useState<WizardState>(initialWizard);

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
      setProjects(rows);
      setSelectedProjectId(current => current || rows[0]?.id || '');
    }
    setLoadingProjects(false);
  }, [text.loadError, user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    let cancelled = false;
    async function loadModules() {
      if (!user || !selectedProjectId) {
        setModules(EMPTY_MODULES);
        return;
      }
      setLoadingModules(true);
      const db = supabase as any;
      async function rows(table: string) {
        const { data, error } = await db
          .from(table)
          .select('*')
          .eq('user_id', user.id)
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

  const readiness = useMemo(() => {
    if (!selectedProject) return null;
    const feasibility = moduleExists(modules.feasibility, ['market_data', 'technical_data', 'financial_data', 'legal_data', 'feasibility_score']);
    const financialModel = moduleExists(modules.financialModels, ['assumptions', 'revenue_streams', 'cost_items', 'forecast', 'kpis']);
    const tasksMilestones = modules.tasks.length > 0 || modules.milestones.length > 0;
    const documents = modules.documents.length > 0;
    const kpis = financialModel || feasibility || tasksMilestones || documents;
    const pitchDeck = moduleExists(modules.pitchDecks, ['deck_data', 'readiness_score']);
    const capitalAmount = findCapitalAmount(selectedProject, modules.feasibility[0], modules.financialModels[0]);
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
    const fundingItems = [
      { key: 'pitchDeck', label: text.pitchDeck, done: pitchDeck, href: selectedProject ? `/projects/${selectedProject.id}?tab=pitchDeck` : '/projects' },
      { key: 'financialModel', label: text.financialModel, done: financialModel, href: selectedProject ? `/projects/${selectedProject.id}?tab=financial` : '/projects' },
      { key: 'feasibility', label: text.feasibilityStudy, done: feasibility, href: selectedProject ? `/projects/${selectedProject.id}?tab=feasibility` : '/projects' },
      { key: 'documents', label: text.documents, done: documents, href: selectedProject ? `/projects/${selectedProject.id}?tab=documents` : '/projects' },
      { key: 'kpis', label: text.kpiSignals, done: kpis, href: selectedProject ? `/projects/${selectedProject.id}?tab=kpis` : '/projects' },
      { key: 'capital', label: text.capitalRequired, done: capitalAmount !== null, href: selectedProject ? `/projects/${selectedProject.id}` : '/projects' },
      { key: 'useOfFunds', label: text.useOfFunds, done: hasUseOfFunds(selectedProject, modules.feasibility[0]), href: selectedProject ? `/projects/${selectedProject.id}?tab=feasibility` : '/projects' },
    ];
    return {
      score: Math.min(100, score),
      status: completionStatus(score),
      basicScore,
      feasibility,
      financialModel,
      tasksMilestones,
      documents,
      kpis,
      pitchDeck,
      capitalAmount,
      fundingItems,
      fundingScore: Math.round((fundingItems.filter(item => item.done).length / fundingItems.length) * 100),
    };
  }, [modules, selectedProject, text]);

  const projectUrl = selectedProject ? `/projects/${selectedProject.id}` : '/projects';
  const pitchDeckUrl = selectedProject ? `/projects/${selectedProject.id}?tab=pitchDeck` : '/projects';

  const wizardMissing = useMemo(
    () => (Object.keys(wizard) as WizardField[]).filter(key => !wizard[key]),
    [wizard],
  );

  const updateWizard = (field: WizardField, value: string) => {
    setWizard(prev => ({ ...prev, [field]: value }));
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
          <label>
            <span>{text.selectProject}</span>
            <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} disabled={!projects.length} aria-label={text.selectProject}>
              {projects.length === 0 ? (
                <option value="">{text.addProjectFirst}</option>
              ) : projects.map(project => (
                <option key={project.id} value={project.id}>{firstText(project, ['name', 'project_name', 'title'], project.id)}</option>
              ))}
            </select>
          </label>
        </section>

        {projects.length === 0 ? (
          <section className="empty-state">
            <Building2 size={34} />
            <h2>{text.addProjectFirst}</h2>
            <p>{text.realDataOnly}</p>
            <Link href="/projects" aria-label={text.addProject}>{text.addProject}</Link>
          </section>
        ) : (
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

            <section className="hub-grid two">
              <article className="warm-card">
                <div className="card-title">
                  <div>
                    <h2>{text.fundingChecklist}</h2>
                    <p>{text.completeThese}</p>
                  </div>
                  <Landmark size={22} />
                </div>
                <div className="check-list">
                  {readiness?.fundingItems.map(item => (
                    <Link href={item.href} className="check-row" key={item.key} aria-label={item.label}>
                      <span className={item.done ? 'done' : 'todo'}>{item.done ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}</span>
                      <strong>{item.label}</strong>
                      <small>{item.done ? text.available : text.missing}</small>
                    </Link>
                  ))}
                </div>
              </article>

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
          </>
        )}

        <section className="hub-grid wizard-layout">
          <article className="warm-card wizard-card">
            <div className="card-title">
              <div>
                <h2>{text.jurisdictionWizard}</h2>
                <p>{text.jurisdictionIntro}</p>
              </div>
              <Globe2 size={22} />
            </div>

            <div className="wizard-form">
              <SelectField label={text.targetMarket} value={wizard.targetMarket} onChange={value => updateWizard('targetMarket', value)} options={COUNTRIES.map(item => ({ value: item.value, label: item.label[locale] }))} placeholder={text.choose} />
              <SelectField label={text.businessType} value={wizard.businessType} onChange={value => updateWizard('businessType', value)} options={BUSINESS_TYPES.map(item => ({ value: item.value, label: item.label[locale] }))} placeholder={text.choose} />
              <SelectField label={text.capitalRange} value={wizard.capitalRange} onChange={value => updateWizard('capitalRange', value)} options={CAPITAL_RANGES.map(item => ({ value: item.value, label: text[item.labelKey] }))} placeholder={text.choose} />
              <SelectField label={text.customers} value={wizard.customers} onChange={value => updateWizard('customers', value)} options={CUSTOMER_TYPES.map(item => ({ value: item.value, label: text[item.labelKey] }))} placeholder={text.choose} />
              <SelectField label={text.needsInvestors} value={wizard.needsInvestors} onChange={value => updateWizard('needsInvestors', value)} options={YES_NO.map(item => ({ value: item.value, label: text[item.labelKey] }))} placeholder={text.choose} />
              <SelectField label={text.gccExpansion} value={wizard.gccExpansion} onChange={value => updateWizard('gccExpansion', value)} options={YES_NO.map(item => ({ value: item.value, label: text[item.labelKey] }))} placeholder={text.choose} />
            </div>
          </article>

          <aside className="warm-card wizard-output">
            <div className="card-title">
              <div>
                <h2>{text.comparisonChecklist}</h2>
                <p>{text.jurisdictionDisclaimer}</p>
              </div>
              <Scale size={22} />
            </div>
            <span className="status-badge needs-improvement">{text.needsReviewStatus}</span>
            <div className="jurisdiction-summary">
              <p><b>{text.targetMarket}</b><span>{selectedLabel(COUNTRIES, wizard.targetMarket, locale) || text.missing}</span></p>
              <p><b>{text.businessType}</b><span>{selectedLabel(BUSINESS_TYPES, wizard.businessType, locale) || text.missing}</span></p>
            </div>
            <ul className="plain-list">
              <li>{text.officialRequirements}</li>
              <li>{text.officialTaxZakat}</li>
              <li>{text.bankingDocs}</li>
              <li>{text.investorRules}</li>
            </ul>
            {wizardMissing.length > 0 && (
              <div className="missing-box">
                <strong>{text.missingWizardData}</strong>
                <ul>
                  {wizardMissing.map(field => <li key={field}>{text[field]}</li>)}
                </ul>
              </div>
            )}
            <p className="trusted-note">{text.trustedSourceNeeded}</p>
          </aside>
        </section>

        <section className="hub-grid two">
          <article className="warm-card">
            <div className="card-title">
              <div>
                <h2>{text.strategicDocuments}</h2>
                <p>{text.realDataOnly}</p>
              </div>
              <ShieldCheck size={22} />
            </div>
            <div className="document-grid">
              <DocumentLink title={text.businessPlan} href="/projects" status={text.comingSoon} disabled />
              <DocumentLink title={text.pitchDeck} href={pitchDeckUrl} status={readiness?.pitchDeck ? text.available : text.missing} />
              <DocumentLink title={text.financialModel} href={selectedProject ? `/projects/${selectedProject.id}?tab=financial` : '/projects'} status={readiness?.financialModel ? text.available : text.missing} />
              <DocumentLink title={text.feasibilityStudy} href={selectedProject ? `/projects/${selectedProject.id}?tab=feasibility` : '/projects'} status={readiness?.feasibility ? text.available : text.missing} />
              <DocumentLink title={text.investmentMemo} href="/projects" status={text.comingSoon} disabled />
              <DocumentLink title={text.dueDiligencePack} href="/projects" status={text.comingSoon} disabled />
            </div>
          </article>

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
        </section>
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

function hasUseOfFunds(project: ProjectRow, feasibility?: any) {
  const notes = toRecord(project.notes);
  const financial = toRecord(feasibility?.financial_data);
  return Boolean(
    firstText({ ...project, notes }, ['use_of_funds', 'funding_use', 'fundingPurpose']) ||
    firstText(financial, ['useOfFunds', 'use_of_funds', 'funding_use']),
  );
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

function DocumentLink({ title, href, status, disabled = false }: { title: string; href: string; status: string; disabled?: boolean }) {
  const content = (
    <>
      <FileText size={17} />
      <span>{title}</span>
      <small>{status}</small>
    </>
  );
  if (disabled) return <div className="document-link disabled" aria-disabled="true">{content}</div>;
  return <Link className="document-link" href={href} aria-label={title}>{content}</Link>;
}

const styles = `
  .business-hub-shell{min-height:100vh;background:#F5F1E8;color:#2B1A0F;font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
  .business-hub-main{width:calc(100% - 230px);max-width:1320px;margin:0 auto;margin-inline-start:230px;margin-inline-end:auto;padding:22px 24px 60px;display:grid;gap:18px;min-width:0;overflow-x:hidden}
  [dir="ltr"] .business-hub-main{margin-inline-start:230px;margin-inline-end:auto}
  .topbar{display:flex;align-items:center;justify-content:space-between;gap:14px}.topbar span{display:block;color:#9A6C3C;font-size:12px;font-weight:900}.topbar strong{display:block;color:#2B1A0F;font-size:24px;font-weight:950}
  .loading-state{min-height:100vh;place-items:center;color:#BA7517;font-weight:950}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  .business-hero{background:linear-gradient(135deg,#1A0F05,#2B1A0F 58%,#8A5514 145%);color:#FFFDF8;border-radius:30px;padding:clamp(24px,5vw,48px);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:end;box-shadow:0 24px 80px rgba(43,26,15,.22);min-width:0;overflow:hidden}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(250,199,117,.22);background:rgba(250,199,117,.1);border-radius:999px;padding:8px 13px;color:#FAC775;font-size:12px;font-weight:950}
  .business-hero h1{margin:18px 0 10px;font-size:clamp(34px,7vw,66px);line-height:1;font-weight:950;letter-spacing:0}.business-hero p{margin:0;max-width:820px;color:rgba(255,253,248,.76);font-size:clamp(15px,2vw,19px);line-height:1.8;font-weight:800}
  .hero-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}.hero-actions a,.hero-actions button,.empty-state a,.module-links a,.copilot-panel a{border:0;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;min-height:42px;padding:0 13px;text-decoration:none}
  .hero-actions button,.empty-state a,.copilot-panel a{background:linear-gradient(135deg,#BA7517,#EF9F27);color:#211207}.hero-actions a{background:rgba(255,253,248,.12);color:#FFFDF8;border:1px solid rgba(250,199,117,.18)}
  .load-warning{display:flex;align-items:center;gap:8px;background:#FFF4DE;border:1px solid rgba(154,94,13,.18);color:#7A4B09;border-radius:15px;padding:12px 14px;font-weight:900}
  .selector-panel,.readiness-head,.warm-card,.empty-state,.state-panel{background:#FFFDF8;border:1px solid rgba(186,117,23,.14);border-radius:22px;box-shadow:0 14px 38px rgba(43,26,15,.06);min-width:0}
  .selector-panel{padding:16px;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.42fr);gap:16px;align-items:end}.selector-panel h2,.readiness-head h2,.card-title h2,.empty-state h2,.state-panel h1{margin:0;color:#3D2914;font-size:22px;font-weight:950}.selector-panel p,.readiness-head p,.card-title p,.empty-state p,.state-panel p{margin:6px 0 0;color:#6D5647;font-size:13px;font-weight:850;line-height:1.7}
  .selector-panel label,.field{display:grid;gap:7px;min-width:0}.selector-panel label span,.field span{font-size:12px;font-weight:950;color:#7A5A3C}.selector-panel select,.field select{width:100%;min-width:0;border:1px solid rgba(186,117,23,.2);background:#FFFDF8;color:#1A0F05;border-radius:14px;min-height:44px;padding:0 12px;font:900 13px Tajawal,Arial,sans-serif;outline:none}.selector-panel select:focus,.field select:focus{border-color:#EF9F27;box-shadow:0 0 0 3px rgba(239,159,39,.14)}
  .empty-state,.state-panel{min-height:300px;display:grid;place-items:center;text-align:center;padding:30px}.empty-state svg,.state-panel svg{color:#BA7517}.empty-state p,.state-panel p{max-width:560px}.empty-state a{margin-top:8px}
  .readiness-head{padding:18px;display:flex;align-items:center;justify-content:space-between;gap:16px}.score-pill{display:grid;place-items:center;text-align:center;min-width:140px;border-radius:18px;background:#FFF8EA;border:1px solid rgba(186,117,23,.16);padding:12px}.score-pill strong{font-size:24px;color:#2B1A0F}.score-pill span{font-size:12px;font-weight:950;color:#854F0B}
  .readiness-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;min-width:0}.readiness-card{background:#FFFDF8;border:1px solid rgba(186,117,23,.14);border-radius:20px;padding:15px;box-shadow:0 14px 38px rgba(43,26,15,.06);display:grid;gap:12px;min-width:0}.readiness-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:#FAEEDA;color:#BA7517}.readiness-card h3{margin:0;color:#3D2914;font-size:15px;font-weight:950;line-height:1.35}.readiness-card strong{display:block;margin:5px 0;color:#2B1A0F;font-size:20px;overflow-wrap:anywhere}
  .status-badge{display:inline-flex;width:max-content;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950}.status-badge.ready-for-review,.status-badge.good{background:#EAF3DE;color:#27500A}.status-badge.needs-improvement{background:#FFF4DE;color:#9A5E0D}.status-badge.not-ready{background:#FCEBEB;color:#791F1F}
  .progress-bar{height:9px;border-radius:999px;background:#FAEEDA;overflow:hidden}.progress-bar span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#FAC775,#BA7517)}
  .hub-grid{display:grid;gap:16px;min-width:0}.hub-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.wizard-layout{grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);align-items:start}.warm-card{padding:18px}.card-title{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.card-title svg{color:#BA7517;flex:0 0 auto}
  .check-list,.document-grid,.module-links{display:grid;gap:10px}.check-row,.document-link{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(186,117,23,.12);background:#FFF8EA;border-radius:15px;padding:11px;text-decoration:none;color:#2B1A0F;min-width:0}.check-row strong,.document-link span{min-width:0;font-weight:950;overflow-wrap:anywhere}.check-row small,.document-link small{color:#7A5A3C;font-size:11px;font-weight:950}.done,.todo{width:28px;height:28px;border-radius:11px;display:grid;place-items:center}.done{background:#EAF3DE;color:#27500A}.todo{background:#FCEBEB;color:#791F1F}.document-link.disabled{opacity:.68;cursor:not-allowed}
  .copilot-panel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid rgba(186,117,23,.12);background:#FFF8EA;border-radius:16px;padding:14px}.copilot-panel span{display:block;color:#7A5A3C;font-size:12px;font-weight:950}.copilot-panel strong{display:block;margin-top:5px;color:#2B1A0F;overflow-wrap:anywhere}
  .wizard-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wizard-output{position:sticky;top:18px}.jurisdiction-summary{display:grid;gap:8px;margin:12px 0}.jurisdiction-summary p{margin:0;display:grid;grid-template-columns:minmax(120px,.42fr) minmax(0,1fr);gap:10px;border-bottom:1px solid rgba(186,117,23,.1);padding-bottom:8px}.jurisdiction-summary b{color:#7A5A3C}.jurisdiction-summary span{font-weight:950;color:#2B1A0F}.plain-list,.missing-box ul{margin:12px 0 0;padding-inline-start:18px;color:#5B4332;line-height:1.8;font-weight:850}.missing-box{margin-top:12px;border:1px dashed rgba(186,117,23,.24);background:#FFF8EA;border-radius:15px;padding:12px}.missing-box strong{color:#854F0B}.trusted-note{margin:12px 0 0;color:#7A5A3C;font-weight:900;line-height:1.7}
  .module-links{grid-template-columns:repeat(2,minmax(0,1fr))}.module-links a{background:#FFF8EA;color:#3D2914;border:1px solid rgba(186,117,23,.14);min-height:46px}.mini-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.mini-metrics p{margin:0;border:1px solid rgba(186,117,23,.12);background:#FFF8EA;border-radius:15px;padding:12px;min-width:0}.mini-metrics span{display:block;color:#7A5A3C;font-size:12px;font-weight:950}.mini-metrics strong{display:block;margin-top:5px;color:#2B1A0F;overflow-wrap:anywhere}
  a:focus-visible,button:focus-visible,select:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(239,159,39,.18)}
  @media(max-width:1260px){.readiness-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.hub-grid.two,.wizard-layout{grid-template-columns:1fr}.wizard-output{position:static}}
  @media(max-width:1024px){.business-hub-main{width:100%;max-width:100%;margin-inline-start:0;margin-inline-end:0;padding:calc(84px + env(safe-area-inset-top)) 16px 24px}.business-hero{grid-template-columns:1fr}.hero-actions{justify-content:stretch}.hero-actions a,.hero-actions button{flex:1 1 180px}.selector-panel{grid-template-columns:1fr}}
  @media(max-width:720px){.topbar{align-items:flex-start}.business-hero{border-radius:22px}.hero-actions{display:grid}.hero-actions a,.hero-actions button{width:100%}.readiness-head{display:grid}.score-pill{width:100%}.readiness-grid,.wizard-form,.module-links,.mini-metrics{grid-template-columns:1fr}.copilot-panel{grid-template-columns:1fr}.check-row,.document-link{grid-template-columns:auto minmax(0,1fr)}.check-row small,.document-link small{grid-column:2}.jurisdiction-summary p{grid-template-columns:1fr}}
`;
