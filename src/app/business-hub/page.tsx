'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PageTabs } from '@/components/layout/PageTabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';

type Lang = 'ar' | 'en' | 'fr';
type BusinessHubTab = 'readiness' | 'funding' | 'jurisdiction' | 'documents' | 'directory' | 'copilot';
type ReadinessStatus = 'not_ready' | 'needs_improvement' | 'good' | 'ready_for_review';
type InvestorItemStatus = 'complete' | 'missing' | 'needs_review';
type UseOfFundsKey = 'product' | 'marketing' | 'operations' | 'hiring' | 'licensesLegal' | 'emergencyReserve' | 'other';
type UseOfFundsEntry = { amount: string; percent: string };

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

type UseOfFundsState = Record<UseOfFundsKey, UseOfFundsEntry>;

type FundingReadinessRow = {
  id?: string;
  funding_needed?: number | string | null;
  currency?: string | null;
  funding_type?: string | null;
  use_of_funds?: Record<string, unknown> | null;
  readiness_score?: number | string | null;
  checklist?: Record<string, unknown> | null;
  notes?: string | null;
};

type FundingPlannerForm = {
  fundingNeeded: string;
  currency: string;
  fundingType: string;
  useOfFunds: UseOfFundsState;
  notes: string;
};
type InvestorPackageItem = { key: string; label: string; status: InvestorItemStatus; href: string };
type StrategicDocumentStatus = 'ready' | 'needs_data' | 'unavailable' | 'in_progress';
type StrategicDocumentKey =
  | 'businessPlan'
  | 'pitchDeck'
  | 'financialModel'
  | 'feasibilityStudy'
  | 'investmentMemo'
  | 'dueDiligencePack'
  | 'executiveSummary'
  | 'launchPlan90';
type StrategicMissingAction = { label: string; href: string };
type StrategicDocumentItem = {
  key: StrategicDocumentKey;
  title: string;
  status: StrategicDocumentStatus;
  href: string;
  description: string;
  missing: StrategicMissingAction[];
};
type DraftSection = { title: string; lines: string[]; missing?: string[] };
type DocumentDraft = { type: 'businessPlan' | 'executiveSummary' | 'investmentMemo'; title: string; source: 'rules'; sections: DraftSection[] };
type JurisdictionWizardState = {
  targetMarket: string;
  businessType: string;
  industry: string;
  productService: string;
  deliveryModel: string;
  targetCustomers: string[];
  operationalNeeds: string[];
  availableCapital: string;
  fundingNeeded: string;
  fundingGoals: string[];
  expansionPlan: string;
};
type JurisdictionAssessmentRow = {
  id?: string;
  inputs?: Record<string, unknown> | null;
  results?: Record<string, unknown> | null;
  recommended_jurisdictions?: unknown[] | null;
  status?: string | null;
};
type JurisdictionResult = {
  code: string;
  label: string;
  region: string;
  score: number;
  strengths: string[];
  limitations: string[];
  verificationItems: string[];
  suitableFor: string[];
  riskNotes: string[];
  nextSteps: string[];
};
type FundingProgramRow = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  name_fr?: string | null;
  funding_type?: string | null;
  country?: string | null;
  region?: string | null;
  provider_name?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  description_fr?: string | null;
  eligibility_summary_ar?: string | null;
  eligibility_summary_en?: string | null;
  eligibility_summary_fr?: string | null;
  typical_ticket_min?: string | number | null;
  typical_ticket_max?: string | number | null;
  currency?: string | null;
  application_url?: string | null;
  application_deadline?: string | null;
  data_status?: string | null;
  data_source_url?: string | null;
  notes?: string | null;
};
type FundingShortlistRow = {
  id: string;
  user_id: string;
  project_id: string;
  funding_program_id?: string | null;
  status?: string | null;
  notes?: string | null;
};
type FundingDirectoryFilters = {
  search: string;
  country: string;
  fundingType: string;
  dataStatus: string;
  currency: string;
};

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
    noProjectSelectedFunding: 'اختر مشروعاً لعرض جاهزية التمويل.',
    investorPackage: 'حزمة المستثمر',
    investorPackageIntro: 'هذه الحزمة تعرض حالة العناصر المطلوبة فقط، ولا تعني قبولاً أو أهلية للتمويل.',
    useOfFundsPlan: 'خطة استخدام التمويل',
    fundingNeeded: 'إجمالي التمويل المطلوب',
    currency: 'العملة',
    targetFundingType: 'نوع التمويل المستهدف',
    complete: 'مكتمل',
    missingItem: 'ناقص',
    needsReviewItem: 'يحتاج مراجعة',
    projectSummary: 'ملخص المشروع',
    legalDocuments: 'المستندات القانونية',
    licenses: 'التراخيص',
    keyContracts: 'العقود المهمة',
    executionPlan: 'خطة التنفيذ',
    selfFunded: 'تمويل ذاتي',
    bankLoan: 'قرض بنكي',
    investorPartner: 'شريك مستثمر',
    governmentFund: 'صندوق حكومي',
    angelInvestor: 'مستثمر ملائكي',
    ventureCapital: 'رأس مال جريء',
    islamicFinance: 'تمويل إسلامي',
    product: 'المنتج / التطوير',
    marketing: 'التسويق',
    operations: 'التشغيل',
    hiring: 'التوظيف',
    licensesLegal: 'التراخيص / القانوني',
    emergencyReserve: 'احتياطي طوارئ',
    other: 'أخرى',
    amount: 'المبلغ',
    percentage: 'النسبة %',
    percentageTotal: 'إجمالي النسب',
    amountPlanned: 'إجمالي المبالغ المخططة',
    allocationWarning: 'يجب أن يكون إجمالي النسب 100%.',
    amountTotalWarning: 'إجمالي المبالغ لا يساوي التمويل المطلوب.',
    saveUseOfFunds: 'حفظ خطة استخدام التمويل',
    saving: 'جاري الحفظ...',
    useOfFundsSaved: 'تم حفظ خطة استخدام التمويل.',
    useOfFundsSaveError: 'تعذر حفظ خطة استخدام التمويل حالياً.',
    fundingScoreDisclaimer: 'هذه درجة استعداد وتحضير فقط، وليست ضماناً للحصول على تمويل.',
    fundingWarnings: 'تنبيهات الجاهزية',
    improveFundingReadiness: 'لرفع جاهزية التمويل، أكمل:',
    financialModelMissingWarning: 'النموذج المالي غير مكتمل، وهذا يضعف جاهزية التمويل.',
    pitchDeckMissingWarning: 'العرض الاستثماري غير موجود.',
    documentsMissingWarning: 'لا توجد مستندات داعمة للمشروع.',
    useOfFundsMissingWarning: 'لا توجد خطة واضحة لاستخدام التمويل.',
    paybackLongWarning: 'فترة الاسترداد طويلة حسب النموذج المالي.',
    prepareInvestorPackage: 'تجهيز حزمة المستثمر',
    exportComingSoon: 'تصدير الحزمة قريباً',
    notes: 'ملاحظات',
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
    noProjectSelectedFunding: 'Select a project to view funding readiness.',
    investorPackage: 'Investor Package',
    investorPackageIntro: 'This package shows preparation status only. It does not mean funding approval or eligibility.',
    useOfFundsPlan: 'Use of Funds Plan',
    fundingNeeded: 'Total funding needed',
    currency: 'Currency',
    targetFundingType: 'Target Funding Type',
    complete: 'Complete',
    missingItem: 'Missing',
    needsReviewItem: 'Needs review',
    projectSummary: 'Project Summary',
    legalDocuments: 'Legal Documents',
    licenses: 'Licenses',
    keyContracts: 'Key Contracts',
    executionPlan: 'Execution Plan',
    selfFunded: 'Self-funded',
    bankLoan: 'Bank loan',
    investorPartner: 'Investor partner',
    governmentFund: 'Government fund',
    angelInvestor: 'Angel investor',
    ventureCapital: 'Venture capital',
    islamicFinance: 'Islamic finance',
    product: 'Product / development',
    marketing: 'Marketing',
    operations: 'Operations',
    hiring: 'Hiring',
    licensesLegal: 'Licenses / legal',
    emergencyReserve: 'Emergency reserve',
    other: 'Other',
    amount: 'Amount',
    percentage: 'Percentage %',
    percentageTotal: 'Percentage total',
    amountPlanned: 'Planned amount total',
    allocationWarning: 'Percentages should total 100%.',
    amountTotalWarning: 'Planned amounts do not equal funding needed.',
    saveUseOfFunds: 'Save Use of Funds Plan',
    saving: 'Saving...',
    useOfFundsSaved: 'Use of funds plan saved.',
    useOfFundsSaveError: 'Could not save the use of funds plan right now.',
    fundingScoreDisclaimer: 'This is a preparation score only, not a guarantee of funding.',
    fundingWarnings: 'Readiness Warnings',
    improveFundingReadiness: 'To improve funding readiness, complete:',
    financialModelMissingWarning: 'The financial model is incomplete, which weakens funding readiness.',
    pitchDeckMissingWarning: 'The pitch deck does not exist.',
    documentsMissingWarning: 'There are no supporting project documents.',
    useOfFundsMissingWarning: 'There is no clear use-of-funds plan.',
    paybackLongWarning: 'Payback period is long based on the financial model.',
    prepareInvestorPackage: 'Prepare Investor Package',
    exportComingSoon: 'Package export coming soon',
    notes: 'Notes',
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
    noProjectSelectedFunding: 'Sélectionnez un projet pour voir la préparation au financement.',
    investorPackage: 'Dossier investisseur',
    investorPackageIntro: 'Ce dossier affiche seulement l’état de préparation. Il ne signifie pas une approbation ou une éligibilité au financement.',
    useOfFundsPlan: 'Plan d’utilisation des fonds',
    fundingNeeded: 'Financement total nécessaire',
    currency: 'Devise',
    targetFundingType: 'Type de financement visé',
    complete: 'Complète',
    missingItem: 'Manquant',
    needsReviewItem: 'À réviser',
    projectSummary: 'Résumé du projet',
    legalDocuments: 'Documents juridiques',
    licenses: 'Licences',
    keyContracts: 'Contrats clés',
    executionPlan: 'Plan d’exécution',
    selfFunded: 'Autofinancé',
    bankLoan: 'Prêt bancaire',
    investorPartner: 'Partenaire investisseur',
    governmentFund: 'Fonds gouvernemental',
    angelInvestor: 'Investisseur providentiel',
    ventureCapital: 'Capital-risque',
    islamicFinance: 'Finance islamique',
    product: 'Produit / développement',
    marketing: 'Marketing',
    operations: 'Opérations',
    hiring: 'Recrutement',
    licensesLegal: 'Licences / juridique',
    emergencyReserve: 'Réserve d’urgence',
    other: 'Autre',
    amount: 'Montant',
    percentage: 'Pourcentage %',
    percentageTotal: 'Total des pourcentages',
    amountPlanned: 'Total des montants prévus',
    allocationWarning: 'Les pourcentages doivent totaliser 100 %.',
    amountTotalWarning: 'Les montants prévus ne correspondent pas au financement nécessaire.',
    saveUseOfFunds: 'Enregistrer le plan d’utilisation des fonds',
    saving: 'Enregistrement...',
    useOfFundsSaved: 'Plan d’utilisation des fonds enregistré.',
    useOfFundsSaveError: 'Impossible d’enregistrer le plan d’utilisation des fonds pour le moment.',
    fundingScoreDisclaimer: 'Il s’agit seulement d’un score de préparation, pas d’une garantie de financement.',
    fundingWarnings: 'Alertes de préparation',
    improveFundingReadiness: 'Pour améliorer la préparation au financement, complétez :',
    financialModelMissingWarning: 'Le modèle financier est incomplet, ce qui affaiblit la préparation au financement.',
    pitchDeckMissingWarning: 'Le pitch deck n’existe pas.',
    documentsMissingWarning: 'Il n’y a pas de documents de soutien pour le projet.',
    useOfFundsMissingWarning: 'Il n’y a pas de plan clair d’utilisation des fonds.',
    paybackLongWarning: 'La période de récupération est longue selon le modèle financier.',
    prepareInvestorPackage: 'Préparer le dossier investisseur',
    exportComingSoon: 'Export du dossier bientôt disponible',
    notes: 'Notes',
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

const STRATEGIC_TEXT = {
  ar: {
    strategicDocumentsDescription: 'اجمع مستندات مشروعك المهمة في مكان واحد وجهّزها للمراجعة أو التمويل أو الشراكات.',
    noProjectSelectedDocuments: 'اختر مشروعاً لعرض مستنداته الاستراتيجية.',
    readyDocument: 'جاهز',
    needsData: 'يحتاج بيانات',
    currentlyUnavailable: 'غير متاح حالياً',
    inProgress: 'قيد التحضير',
    executiveSummary: 'الملخص التنفيذي',
    launchPlan90: 'خطة إطلاق 90 يوم',
    documentReadinessScore: 'جاهزية المستندات',
    generateBusinessPlanDraft: 'إنشاء مسودة خطة العمل',
    generateExecutiveSummary: 'إنشاء الملخص التنفيذي',
    generateInvestmentMemo: 'إنشاء مذكرة الاستثمار',
    preview: 'معاينة',
    printSavePdf: 'طباعة / حفظ PDF',
    exportSoon: 'تصدير قريباً',
    contentSource: 'مصدر المحتوى',
    rulesSource: 'قواعد تحليلية',
    missingData: 'البيانات الناقصة',
    incompleteInfo: 'هذه البيانات غير مكتملة.',
    completeFeasibility: 'أكمل دراسة الجدوى',
    addFinancialModel: 'أضف النموذج المالي',
    uploadDocuments: 'ارفع مستندات المشروع',
    createPitchDeckAction: 'أنشئ العرض الاستثماري',
    completeUseOfFunds: 'أكمل خطة استخدام التمويل',
    addKpis: 'أكمل مؤشرات الأداء',
    addTasksMilestones: 'أضف المهام والمعالم',
    documentVaultEmpty: 'لا توجد مستندات مرفوعة لهذا المشروع.',
    documentCountLabel: 'عدد مستندات المشروع',
    groupedDocuments: 'المستندات حسب التصنيف',
    openDocumentsTab: 'فتح تبويب المستندات',
    dueDiligenceChecklist: 'حزمة الفحص النافي للجهالة',
    licenseRegistration: 'السجل أو الترخيص',
    invoices: 'الفواتير',
    riskReport: 'تقرير المخاطر',
    teamInfo: 'بيانات الفريق إن وجدت',
    projectSummarySection: 'ملخص المشروع',
    problemSection: 'المشكلة',
    solutionSection: 'الحل',
    marketSection: 'السوق',
    productServiceSection: 'المنتج أو الخدمة',
    businessModelSection: 'نموذج الربح',
    operationsPlanSection: 'خطة التشغيل',
    financialSummarySection: 'الملخص المالي',
    revenueStreamsLabel: 'مصادر الإيرادات',
    roiLabel: 'العائد على الاستثمار ROI',
    risksSection: 'المخاطر',
    nextStepsSection: 'الخطوات القادمة',
    opportunitySection: 'الفرصة',
    fundingNeedSection: 'التمويل المطلوب',
    useOfFundsSection: 'استخدام التمويل',
    milestonesSection: 'المعالم',
    recommendationStatusSection: 'حالة المراجعة',
    planningOnlyDisclaimer: 'هذا المحتوى مسودة تخطيطية للمراجعة فقط، ولا يعتبر مستنداً قانونياً أو مالياً معتمداً.',
    readyForReviewText: 'جاهز للمراجعة بناءً على البيانات المتاحة.',
  },
  en: {
    strategicDocumentsDescription: 'Collect your key business documents in one place and prepare them for review, funding, or partnerships.',
    noProjectSelectedDocuments: 'Select a project to view its strategic documents.',
    readyDocument: 'Ready',
    needsData: 'Needs Data',
    currentlyUnavailable: 'Currently Unavailable',
    inProgress: 'In Progress',
    executiveSummary: 'Executive Summary',
    launchPlan90: '90-Day Launch Plan',
    documentReadinessScore: 'Document Readiness',
    generateBusinessPlanDraft: 'Generate Business Plan Draft',
    generateExecutiveSummary: 'Generate Executive Summary',
    generateInvestmentMemo: 'Generate Investment Memo',
    preview: 'Preview',
    printSavePdf: 'Print / Save PDF',
    exportSoon: 'Export coming soon',
    contentSource: 'Content source',
    rulesSource: 'Rules',
    missingData: 'Missing Data',
    incompleteInfo: 'This information is incomplete.',
    completeFeasibility: 'Complete Feasibility',
    addFinancialModel: 'Add Financial Model',
    uploadDocuments: 'Upload Documents',
    createPitchDeckAction: 'Create Pitch Deck',
    completeUseOfFunds: 'Complete Use of Funds Plan',
    addKpis: 'Complete KPIs',
    addTasksMilestones: 'Add Tasks and Milestones',
    documentVaultEmpty: 'No documents uploaded for this project.',
    documentCountLabel: 'Project documents count',
    groupedDocuments: 'Documents by category',
    openDocumentsTab: 'Open Documents tab',
    dueDiligenceChecklist: 'Due Diligence Pack',
    licenseRegistration: 'License/registration',
    invoices: 'Invoices',
    riskReport: 'Risk report',
    teamInfo: 'Team information if available',
    projectSummarySection: 'Project summary',
    problemSection: 'Problem',
    solutionSection: 'Solution',
    marketSection: 'Market',
    productServiceSection: 'Product / service',
    businessModelSection: 'Business model',
    operationsPlanSection: 'Operations plan',
    financialSummarySection: 'Financial summary',
    revenueStreamsLabel: 'Revenue streams',
    roiLabel: 'ROI',
    risksSection: 'Risks',
    nextStepsSection: 'Next steps',
    opportunitySection: 'Opportunity',
    fundingNeedSection: 'Funding need',
    useOfFundsSection: 'Use of funds',
    milestonesSection: 'Milestones',
    recommendationStatusSection: 'Recommendation status',
    planningOnlyDisclaimer: 'This content is a planning draft for review only and is not an approved legal or financial document.',
    readyForReviewText: 'Ready for review based on available data.',
  },
  fr: {
    strategicDocumentsDescription: 'Regroupez vos documents d’affaires essentiels en un seul endroit et préparez-les pour la révision, le financement ou les partenariats.',
    noProjectSelectedDocuments: 'Sélectionnez un projet pour afficher ses documents stratégiques.',
    readyDocument: 'Prêt',
    needsData: 'Données requises',
    currentlyUnavailable: 'Indisponible',
    inProgress: 'En cours',
    executiveSummary: 'Résumé exécutif',
    launchPlan90: 'Plan de lancement 90 jours',
    documentReadinessScore: 'Préparation des documents',
    generateBusinessPlanDraft: 'Générer le brouillon du plan d’affaires',
    generateExecutiveSummary: 'Générer le résumé exécutif',
    generateInvestmentMemo: 'Générer le mémo d’investissement',
    preview: 'Aperçu',
    printSavePdf: 'Imprimer / Enregistrer PDF',
    exportSoon: 'Export bientôt disponible',
    contentSource: 'Source du contenu',
    rulesSource: 'Règles',
    missingData: 'Données manquantes',
    incompleteInfo: 'Ces informations sont incomplètes.',
    completeFeasibility: 'Compléter la faisabilité',
    addFinancialModel: 'Ajouter le modèle financier',
    uploadDocuments: 'Téléverser des documents',
    createPitchDeckAction: 'Créer le Pitch Deck',
    completeUseOfFunds: 'Compléter le plan d’utilisation des fonds',
    addKpis: 'Compléter les KPI',
    addTasksMilestones: 'Ajouter tâches et jalons',
    documentVaultEmpty: 'Aucun document téléversé pour ce projet.',
    documentCountLabel: 'Nombre de documents du projet',
    groupedDocuments: 'Documents par catégorie',
    openDocumentsTab: 'Ouvrir l’onglet Documents',
    dueDiligenceChecklist: 'Dossier de due diligence',
    licenseRegistration: 'Licence / enregistrement',
    invoices: 'Factures',
    riskReport: 'Rapport des risques',
    teamInfo: 'Informations sur l’équipe si disponibles',
    projectSummarySection: 'Résumé du projet',
    problemSection: 'Problème',
    solutionSection: 'Solution',
    marketSection: 'Marché',
    productServiceSection: 'Produit / service',
    businessModelSection: 'Modèle économique',
    operationsPlanSection: 'Plan opérationnel',
    financialSummarySection: 'Résumé financier',
    revenueStreamsLabel: 'Sources de revenus',
    roiLabel: 'ROI',
    risksSection: 'Risques',
    nextStepsSection: 'Prochaines étapes',
    opportunitySection: 'Opportunité',
    fundingNeedSection: 'Besoin de financement',
    useOfFundsSection: 'Utilisation des fonds',
    milestonesSection: 'Jalons',
    recommendationStatusSection: 'Statut de recommandation',
    planningOnlyDisclaimer: 'Ce contenu est un brouillon de planification à réviser uniquement et ne constitue pas un document juridique ou financier approuvé.',
    readyForReviewText: 'Prêt pour révision selon les données disponibles.',
  },
} as const;

const JURISDICTION_TEXT = {
  ar: {
    jurisdictionWizardDescription: 'قارن بين الدول والأسواق لتحديد المكان الأنسب لتأسيس أو توسيع مشروعك، بناءً على بيانات مشروعك واحتياجاتك.',
    selectProjectStep: 'اختر المشروع',
    businessActivity: 'النشاط التجاري',
    targetCustomersStep: 'العملاء المستهدفون',
    operationalNeeds: 'الاحتياجات التشغيلية',
    capitalFunding: 'رأس المال والتمويل',
    expansionPlan: 'خطة التوسع',
    stepOf: 'خطوة',
    previous: 'السابق',
    next: 'التالي',
    generateComparison: 'إنشاء المقارنة',
    saveAssessment: 'حفظ نتيجة اختيار الدولة',
    assessmentSaved: 'تم حفظ نتيجة اختيار الدولة.',
    assessmentSaveError: 'تعذر حفظ نتيجة اختيار الدولة حالياً.',
    primaryMarket: 'السوق أو الدولة الأساسية',
    industry: 'القطاع',
    productService: 'المنتج أو الخدمة',
    deliveryModel: 'رقمي / فعلي / مختلط',
    digital: 'رقمي',
    physical: 'فعلي',
    hybrid: 'مختلط',
    individuals: 'الأفراد',
    companies: 'الشركات',
    governmentCustomers: 'الجهات الحكومية',
    internationalCustomers: 'عملاء دوليون',
    gccCustomers: 'عملاء خليجيون',
    physicalOffice: 'مكتب فعلي',
    warehouse: 'مستودع',
    employeesNeed: 'موظفون',
    foreignHiring: 'عمالة وافدة',
    paymentGateway: 'بوابة دفع',
    importExport: 'استيراد / تصدير',
    licensesNeed: 'تراخيص',
    investorFriendly: 'بيئة مناسبة للمستثمرين',
    availableCapital: 'رأس المال المتاح',
    wantsInvestors: 'أبحث عن مستثمرين',
    wantsBankLoan: 'قرض بنكي',
    wantsGovernmentSupport: 'دعم حكومي',
    wantsIslamicFinance: 'تمويل إسلامي',
    localOnly: 'محلي فقط',
    gccExpansionPlan: 'توسع خليجي',
    menaExpansion: 'توسع في الشرق الأوسط',
    globalExpansion: 'توسع عالمي',
    crossBorderEcommerce: 'تجارة إلكترونية عابرة للحدود',
    matchScore: 'درجة الملاءمة',
    strengths: 'نقاط القوة',
    limitations: 'القيود',
    verificationInfo: 'معلومات تحتاج تحقق',
    suitableFor: 'مناسب لـ',
    riskNotes: 'ملاحظات المخاطر',
    topMatches: 'أفضل الخيارات المبدئية',
    comparisonMatrix: 'جدول المقارنة',
    officialVerificationRequired: 'تحقق رسمي مطلوب',
    legalDisclaimer: 'تنبيه قانوني وتنظيمي',
    jurisdictionDisclaimerFull: 'هذه الأداة لأغراض التخطيط الأولي فقط، ولا تعتبر استشارة قانونية أو ضريبية. يجب التحقق من الجهات الرسمية أو مستشار مختص قبل اتخاذ قرار التأسيس.',
    notVerifiedYet: 'غير موثق بعد',
    requiresOfficialVerification: 'تحتاج هذه المعلومة إلى تحقق من مصدر رسمي.',
    addAssessmentToPackage: 'إضافة نتيجة اختيار الدولة إلى حزمة المستثمر',
    requiredLicenseType: 'نوع الرخصة المطلوبة',
    corporateTaxFees: 'ضريبة الشركات / الرسوم',
    foreignOwnership: 'متطلبات الملكية الأجنبية',
    officeAddress: 'متطلبات المكتب أو العنوان',
    hiringVisa: 'متطلبات العمالة والتأشيرات',
    businessActivityRequirements: 'متطلبات النشاط التجاري',
    paymentGatewayRequirements: 'متطلبات بوابات الدفع',
    importExportRequirements: 'متطلبات الاستيراد والتصدير إن وجدت',
    targetMarketFit: 'تطابق السوق المستهدف',
    operationalFit: 'تطابق الاحتياجات التشغيلية',
    fundingFit: 'تطابق التمويل',
    expansionFit: 'تطابق خطة التوسع',
    verificationPenalty: 'خصم نقص التحقق الرسمي',
    matchesSelectedMarket: 'يتطابق مع السوق الأساسي الذي اخترته.',
    matchesGccExpansion: 'يناسب تفضيل التوسع الخليجي مبدئياً.',
    matchesGlobalExpansion: 'يناسب التوسع العالمي أو التجارة العابرة للحدود مبدئياً.',
    localFocusFit: 'يناسب التركيز المحلي حسب مدخلاتك.',
    investorSetupRequiresVerification: 'إعداد مناسب للمستثمرين يحتاج تحققاً رسمياً في هذه الدولة.',
    importExportRequiresVerification: 'متطلبات الاستيراد والتصدير تحتاج تحققاً رسمياً.',
    paymentGatewayRequiresVerification: 'متطلبات بوابات الدفع تحتاج تحققاً من مزودي الخدمة والجهات الرسمية.',
    licenseRequiresVerification: 'نوع الترخيص والمتطلبات التنظيمية تحتاج تحققاً رسمياً.',
    physicalNeedsRequireVerification: 'متطلبات المكتب أو المستودع أو العنوان تحتاج تحققاً رسمياً.',
    fundingSupportRequiresVerification: 'برامج الدعم أو التمويل لا تُعرض إلا بعد تحقق رسمي.',
    basedOnInputsOnly: 'النتيجة مبنية على مدخلاتك فقط وليست توصية قانونية أو ضريبية.',
    saveBeforeSharing: 'احفظ النتيجة وراجعها مع مستشار مختص قبل مشاركة حزمة المستثمر.',
  },
  en: {
    jurisdictionWizardDescription: 'Compare countries and markets to identify the most suitable place to establish or expand your business, based on your project data and needs.',
    selectProjectStep: 'Select Project',
    businessActivity: 'Business Activity',
    targetCustomersStep: 'Target Customers',
    operationalNeeds: 'Operational Needs',
    capitalFunding: 'Capital and Funding',
    expansionPlan: 'Expansion Plan',
    stepOf: 'Step',
    previous: 'Previous',
    next: 'Next',
    generateComparison: 'Generate comparison',
    saveAssessment: 'Save jurisdiction assessment',
    assessmentSaved: 'Jurisdiction assessment saved.',
    assessmentSaveError: 'Could not save the jurisdiction assessment right now.',
    primaryMarket: 'Primary market or jurisdiction',
    industry: 'Industry',
    productService: 'Product or service',
    deliveryModel: 'Digital / physical / hybrid',
    digital: 'Digital',
    physical: 'Physical',
    hybrid: 'Hybrid',
    individuals: 'Individuals',
    companies: 'Companies',
    governmentCustomers: 'Government entities',
    internationalCustomers: 'International customers',
    gccCustomers: 'GCC customers',
    physicalOffice: 'Physical office',
    warehouse: 'Warehouse',
    employeesNeed: 'Employees',
    foreignHiring: 'Foreign hiring',
    paymentGateway: 'Payment gateway',
    importExport: 'Import / export',
    licensesNeed: 'Licenses',
    investorFriendly: 'Investor-friendly jurisdiction',
    availableCapital: 'Available capital',
    wantsInvestors: 'Looking for investors',
    wantsBankLoan: 'Bank loan',
    wantsGovernmentSupport: 'Government support',
    wantsIslamicFinance: 'Islamic finance',
    localOnly: 'Local only',
    gccExpansionPlan: 'GCC expansion',
    menaExpansion: 'MENA expansion',
    globalExpansion: 'Global expansion',
    crossBorderEcommerce: 'Cross-border e-commerce',
    matchScore: 'Match Score',
    strengths: 'Strengths',
    limitations: 'Limitations',
    verificationInfo: 'Information requiring verification',
    suitableFor: 'Suitable for',
    riskNotes: 'Risk notes',
    topMatches: 'Top Matches',
    comparisonMatrix: 'Comparison Matrix',
    officialVerificationRequired: 'Official Verification Required',
    legalDisclaimer: 'Legal disclaimer',
    jurisdictionDisclaimerFull: 'This tool is for initial planning only and is not legal or tax advice. Verify with official authorities or qualified advisors before making incorporation decisions.',
    notVerifiedYet: 'Not verified yet',
    requiresOfficialVerification: 'This information requires verification from an official source.',
    addAssessmentToPackage: 'Add jurisdiction assessment to investor package',
    requiredLicenseType: 'Required license type',
    corporateTaxFees: 'Corporate tax / fees',
    foreignOwnership: 'Foreign ownership requirements',
    officeAddress: 'Office/address requirements',
    hiringVisa: 'Hiring and visa requirements',
    businessActivityRequirements: 'Business activity requirements',
    paymentGatewayRequirements: 'Payment gateway requirements',
    importExportRequirements: 'Import/export requirements if applicable',
    targetMarketFit: 'Target market fit',
    operationalFit: 'Operational fit',
    fundingFit: 'Funding fit',
    expansionFit: 'Expansion fit',
    verificationPenalty: 'Missing official verification penalty',
    matchesSelectedMarket: 'Matches the primary market you selected.',
    matchesGccExpansion: 'Initially fits a GCC expansion preference.',
    matchesGlobalExpansion: 'Initially fits global expansion or cross-border commerce.',
    localFocusFit: 'Fits a local-focus setup based on your inputs.',
    investorSetupRequiresVerification: 'Investor-friendly setup requires official verification in this jurisdiction.',
    importExportRequiresVerification: 'Import/export requirements require official verification.',
    paymentGatewayRequiresVerification: 'Payment gateway requirements require verification with providers and official authorities.',
    licenseRequiresVerification: 'License type and regulatory requirements require official verification.',
    physicalNeedsRequireVerification: 'Office, warehouse, or address requirements require official verification.',
    fundingSupportRequiresVerification: 'Support or funding programs are not shown unless officially verified.',
    basedOnInputsOnly: 'The score is based on your inputs only and is not legal or tax advice.',
    saveBeforeSharing: 'Save the result and review it with a qualified advisor before sharing the investor package.',
  },
  fr: {
    jurisdictionWizardDescription: 'Comparez les pays et marchés pour identifier le lieu le plus adapté à la création ou l’expansion de votre entreprise, selon les données de votre projet.',
    selectProjectStep: 'Sélectionner le projet',
    businessActivity: 'Activité commerciale',
    targetCustomersStep: 'Clients cibles',
    operationalNeeds: 'Besoins opérationnels',
    capitalFunding: 'Capital et financement',
    expansionPlan: 'Plan d’expansion',
    stepOf: 'Étape',
    previous: 'Précédent',
    next: 'Suivant',
    generateComparison: 'Générer la comparaison',
    saveAssessment: 'Enregistrer l’évaluation de juridiction',
    assessmentSaved: 'Évaluation de juridiction enregistrée.',
    assessmentSaveError: 'Impossible d’enregistrer l’évaluation de juridiction pour le moment.',
    primaryMarket: 'Marché ou juridiction principale',
    industry: 'Secteur',
    productService: 'Produit ou service',
    deliveryModel: 'Numérique / physique / hybride',
    digital: 'Numérique',
    physical: 'Physique',
    hybrid: 'Hybride',
    individuals: 'Particuliers',
    companies: 'Entreprises',
    governmentCustomers: 'Entités gouvernementales',
    internationalCustomers: 'Clients internationaux',
    gccCustomers: 'Clients du GCC',
    physicalOffice: 'Bureau physique',
    warehouse: 'Entrepôt',
    employeesNeed: 'Employés',
    foreignHiring: 'Recrutement étranger',
    paymentGateway: 'Passerelle de paiement',
    importExport: 'Import / export',
    licensesNeed: 'Licences',
    investorFriendly: 'Juridiction adaptée aux investisseurs',
    availableCapital: 'Capital disponible',
    wantsInvestors: 'Recherche d’investisseurs',
    wantsBankLoan: 'Prêt bancaire',
    wantsGovernmentSupport: 'Soutien gouvernemental',
    wantsIslamicFinance: 'Finance islamique',
    localOnly: 'Local uniquement',
    gccExpansionPlan: 'Expansion GCC',
    menaExpansion: 'Expansion MENA',
    globalExpansion: 'Expansion mondiale',
    crossBorderEcommerce: 'E-commerce transfrontalier',
    matchScore: 'Score d’adéquation',
    strengths: 'Forces',
    limitations: 'Limites',
    verificationInfo: 'Informations à vérifier',
    suitableFor: 'Adapté à',
    riskNotes: 'Notes de risque',
    topMatches: 'Meilleures options initiales',
    comparisonMatrix: 'Tableau comparatif',
    officialVerificationRequired: 'Vérification officielle requise',
    legalDisclaimer: 'Avertissement juridique',
    jurisdictionDisclaimerFull: 'Cet outil est destiné à la planification initiale uniquement et ne constitue pas un conseil juridique ou fiscal. Vérifiez auprès des autorités officielles ou de conseillers qualifiés avant toute décision.',
    notVerifiedYet: 'Pas encore vérifié',
    requiresOfficialVerification: 'Cette information nécessite une vérification auprès d’une source officielle.',
    addAssessmentToPackage: 'Ajouter l’évaluation de juridiction au dossier investisseur',
    requiredLicenseType: 'Type de licence requis',
    corporateTaxFees: 'Impôt société / frais',
    foreignOwnership: 'Exigences de propriété étrangère',
    officeAddress: 'Exigences de bureau/adresse',
    hiringVisa: 'Exigences d’emploi et de visa',
    businessActivityRequirements: 'Exigences liées à l’activité',
    paymentGatewayRequirements: 'Exigences de passerelle de paiement',
    importExportRequirements: 'Exigences import/export le cas échéant',
    targetMarketFit: 'Adéquation au marché cible',
    operationalFit: 'Adéquation opérationnelle',
    fundingFit: 'Adéquation au financement',
    expansionFit: 'Adéquation à l’expansion',
    verificationPenalty: 'Pénalité de vérification officielle manquante',
    matchesSelectedMarket: 'Correspond au marché principal sélectionné.',
    matchesGccExpansion: 'Correspond initialement à une préférence d’expansion GCC.',
    matchesGlobalExpansion: 'Correspond initialement à l’expansion mondiale ou au commerce transfrontalier.',
    localFocusFit: 'Correspond à une implantation locale selon vos données.',
    investorSetupRequiresVerification: 'Une configuration adaptée aux investisseurs nécessite une vérification officielle dans cette juridiction.',
    importExportRequiresVerification: 'Les exigences import/export nécessitent une vérification officielle.',
    paymentGatewayRequiresVerification: 'Les exigences de paiement nécessitent une vérification auprès des fournisseurs et autorités.',
    licenseRequiresVerification: 'Le type de licence et les exigences réglementaires nécessitent une vérification officielle.',
    physicalNeedsRequireVerification: 'Les exigences de bureau, entrepôt ou adresse nécessitent une vérification officielle.',
    fundingSupportRequiresVerification: 'Les programmes de soutien ou financement ne sont affichés qu’après vérification officielle.',
    basedOnInputsOnly: 'Le score est basé uniquement sur vos données et ne constitue pas un conseil juridique ou fiscal.',
    saveBeforeSharing: 'Enregistrez le résultat et révisez-le avec un conseiller qualifié avant de partager le dossier investisseur.',
  },
} as const;

const FUNDING_DIRECTORY_TEXT = {
  ar: {
    fundingDirectory: 'دليل التمويل',
    fundingDirectoryDescription: 'استعرض خيارات التمويل المناسبة لمشروعك وقارن المتطلبات بناءً على بيانات موثقة أو مدخلة من الإدارة.',
    searchFundingPrograms: 'بحث في خيارات التمويل',
    fundingType: 'نوع التمويل',
    country: 'الدولة',
    verificationStatus: 'حالة التحقق',
    allTypes: 'كل أنواع التمويل',
    allCountries: 'كل الدول',
    allStatuses: 'كل حالات التحقق',
    allCurrencies: 'كل العملات',
    viewDetails: 'عرض التفاصيل',
    applicationLink: 'رابط التقديم',
    noFundingPrograms: 'لا توجد برامج تمويل متاحة حالياً',
    noFundingProgramsDescription: 'لا توجد برامج تمويل مضافة حالياً. يمكن إضافتها لاحقاً من خلال ملف استيراد موثوق أو لوحة إدارة.',
    verified: 'موثق',
    pendingReview: 'قيد المراجعة',
    unverified: 'غير موثق',
    outdated: 'قديم',
    unverifiedWarning: 'هذه البيانات غير موثقة. تحقق من المصدر الرسمي قبل الاعتماد عليها.',
    officialVerificationRequired: 'تحتاج تحقق من مصدر رسمي',
    fundingFitForProject: 'مدى ملاءمة خيار التمويل للمشروع',
    fitCannotBeConfirmed: 'لا يمكن تأكيد الملاءمة بدون متطلبات موثقة.',
    saveToShortlist: 'حفظ في القائمة المختصرة',
    updateStatus: 'تحديث الحالة',
    remove: 'إزالة',
    savedToShortlist: 'تم حفظ خيار التمويل في القائمة المختصرة.',
    shortlistSaveError: 'تعذر حفظ خيار التمويل حالياً.',
    shortlistRemoved: 'تمت إزالة خيار التمويل من القائمة المختصرة.',
    applicationChecklist: 'متطلبات التقديم العامة',
    bankStatementFinancials: 'كشف حساب / بيانات مالية إن وجدت',
    dataSource: 'مصدر البيانات',
    ticketRange: 'نطاق التمويل',
    eligibilitySummary: 'ملخص الأهلية',
    description: 'الوصف',
    provider: 'الجهة',
    selectedShortlistStatus: 'حالة القائمة المختصرة',
    saved: 'محفوظ',
    reviewing: 'قيد المراجعة',
    preparing: 'قيد التجهيز',
    applied: 'تم التقديم',
    rejected: 'مرفوض',
    accepted: 'مقبول',
    archived: 'مؤرشف',
    noProjectForShortlist: 'اختر مشروعاً لحفظ خيار التمويل.',
    selfFunding: 'تمويل ذاتي',
    accelerator: 'مسرّعة / حاضنة أعمال',
    incubator: 'حاضنة أعمال',
    grant: 'منحة',
    strategicPartner: 'شريك استراتيجي',
    angel: 'مستثمر ملائكي',
    ventureCapitalDirectory: 'رأس مال جريء',
    governmentFundDirectory: 'صندوق حكومي',
    bankLoanDirectory: 'قرض بنكي',
    islamicFinanceDirectory: 'تمويل إسلامي',
  },
  en: {
    fundingDirectory: 'Funding Directory',
    fundingDirectoryDescription: 'Explore funding options for your project and compare requirements based on verified or admin-entered data.',
    searchFundingPrograms: 'Search funding programs',
    fundingType: 'Funding type',
    country: 'Country',
    verificationStatus: 'Verification status',
    allTypes: 'All funding types',
    allCountries: 'All countries',
    allStatuses: 'All verification statuses',
    allCurrencies: 'All currencies',
    viewDetails: 'View details',
    applicationLink: 'Application link',
    noFundingPrograms: 'No funding programs available',
    noFundingProgramsDescription: 'No funding programs are available yet. They can be added later through a trusted import file or admin panel.',
    verified: 'Verified',
    pendingReview: 'Pending review',
    unverified: 'Unverified',
    outdated: 'Outdated',
    unverifiedWarning: 'This data is not verified. Check the official source before relying on it.',
    officialVerificationRequired: 'Needs official verification',
    fundingFitForProject: 'Funding Fit for Project',
    fitCannotBeConfirmed: 'Fit cannot be confirmed without verified requirements.',
    saveToShortlist: 'Save to Shortlist',
    updateStatus: 'Update Status',
    remove: 'Remove',
    savedToShortlist: 'Funding option saved to shortlist.',
    shortlistSaveError: 'Could not save the funding option right now.',
    shortlistRemoved: 'Funding option removed from shortlist.',
    applicationChecklist: 'General application checklist',
    bankStatementFinancials: 'Bank statement / financial records if available',
    dataSource: 'Data source',
    ticketRange: 'Ticket range',
    eligibilitySummary: 'Eligibility summary',
    description: 'Description',
    provider: 'Provider',
    selectedShortlistStatus: 'Shortlist status',
    saved: 'Saved',
    reviewing: 'Reviewing',
    preparing: 'Preparing',
    applied: 'Applied',
    rejected: 'Rejected',
    accepted: 'Accepted',
    archived: 'Archived',
    noProjectForShortlist: 'Select a project to save this funding option.',
    selfFunding: 'Self-funding',
    accelerator: 'Accelerator / Incubator',
    incubator: 'Incubator',
    grant: 'Grant',
    strategicPartner: 'Strategic partner',
    angel: 'Angel investor',
    ventureCapitalDirectory: 'Venture capital',
    governmentFundDirectory: 'Government fund',
    bankLoanDirectory: 'Bank loan',
    islamicFinanceDirectory: 'Islamic finance',
  },
  fr: {
    fundingDirectory: 'Répertoire de financement',
    fundingDirectoryDescription: 'Explorez les options de financement adaptées à votre projet et comparez les exigences à partir de données vérifiées ou saisies par l’administration.',
    searchFundingPrograms: 'Rechercher des programmes de financement',
    fundingType: 'Type de financement',
    country: 'Pays',
    verificationStatus: 'Statut de vérification',
    allTypes: 'Tous les types de financement',
    allCountries: 'Tous les pays',
    allStatuses: 'Tous les statuts de vérification',
    allCurrencies: 'Toutes les devises',
    viewDetails: 'Voir les détails',
    applicationLink: 'Lien de candidature',
    noFundingPrograms: 'Aucun programme de financement disponible',
    noFundingProgramsDescription: 'Aucun programme de financement n’est disponible pour le moment. Ils pourront être ajoutés plus tard via un fichier d’import fiable ou un panneau d’administration.',
    verified: 'Vérifié',
    pendingReview: 'En cours de révision',
    unverified: 'Non vérifié',
    outdated: 'Obsolète',
    unverifiedWarning: 'Ces données ne sont pas vérifiées. Consultez la source officielle avant de vous y fier.',
    officialVerificationRequired: 'Nécessite une vérification officielle',
    fundingFitForProject: 'Adéquation du financement au projet',
    fitCannotBeConfirmed: 'L’adéquation ne peut pas être confirmée sans exigences vérifiées.',
    saveToShortlist: 'Enregistrer dans la présélection',
    updateStatus: 'Mettre à jour le statut',
    remove: 'Supprimer',
    savedToShortlist: 'Option de financement enregistrée dans la présélection.',
    shortlistSaveError: 'Impossible d’enregistrer l’option de financement pour le moment.',
    shortlistRemoved: 'Option de financement supprimée de la présélection.',
    applicationChecklist: 'Exigences générales de candidature',
    bankStatementFinancials: 'Relevé bancaire / données financières si disponibles',
    dataSource: 'Source des données',
    ticketRange: 'Fourchette de financement',
    eligibilitySummary: 'Résumé d’éligibilité',
    description: 'Description',
    provider: 'Fournisseur',
    selectedShortlistStatus: 'Statut de présélection',
    saved: 'Enregistré',
    reviewing: 'En révision',
    preparing: 'En préparation',
    applied: 'Candidature envoyée',
    rejected: 'Rejeté',
    accepted: 'Accepté',
    archived: 'Archivé',
    noProjectForShortlist: 'Sélectionnez un projet pour enregistrer cette option.',
    selfFunding: 'Autofinancement',
    accelerator: 'Accélérateur / Incubateur',
    incubator: 'Incubateur',
    grant: 'Subvention',
    strategicPartner: 'Partenaire stratégique',
    angel: 'Investisseur providentiel',
    ventureCapitalDirectory: 'Capital-risque',
    governmentFundDirectory: 'Fonds gouvernemental',
    bankLoanDirectory: 'Prêt bancaire',
    islamicFinanceDirectory: 'Finance islamique',
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

const FUNDING_TYPES = [
  { value: 'self_funded', labelKey: 'selfFunded' },
  { value: 'bank_loan', labelKey: 'bankLoan' },
  { value: 'investor_partner', labelKey: 'investorPartner' },
  { value: 'government_fund', labelKey: 'governmentFund' },
  { value: 'angel_investor', labelKey: 'angelInvestor' },
  { value: 'venture_capital', labelKey: 'ventureCapital' },
  { value: 'islamic_finance', labelKey: 'islamicFinance' },
] as const;

const FUNDING_PROGRAM_TYPES = [
  { value: 'self_funding', labelKey: 'selfFunding' },
  { value: 'bank_loan', labelKey: 'bankLoanDirectory' },
  { value: 'government_fund', labelKey: 'governmentFundDirectory' },
  { value: 'angel', labelKey: 'angel' },
  { value: 'venture_capital', labelKey: 'ventureCapitalDirectory' },
  { value: 'accelerator', labelKey: 'accelerator' },
  { value: 'incubator', labelKey: 'incubator' },
  { value: 'islamic_finance', labelKey: 'islamicFinanceDirectory' },
  { value: 'grant', labelKey: 'grant' },
  { value: 'strategic_partner', labelKey: 'strategicPartner' },
  { value: 'other', labelKey: 'other' },
] as const;

const FUNDING_DATA_STATUSES = [
  { value: 'verified', labelKey: 'verified' },
  { value: 'pending_review', labelKey: 'pendingReview' },
  { value: 'unverified', labelKey: 'unverified' },
  { value: 'outdated', labelKey: 'outdated' },
] as const;

const SHORTLIST_STATUSES = [
  { value: 'saved', labelKey: 'saved' },
  { value: 'reviewing', labelKey: 'reviewing' },
  { value: 'preparing', labelKey: 'preparing' },
  { value: 'applied', labelKey: 'applied' },
  { value: 'rejected', labelKey: 'rejected' },
  { value: 'accepted', labelKey: 'accepted' },
  { value: 'archived', labelKey: 'archived' },
] as const;

const emptyFundingDirectoryFilters: FundingDirectoryFilters = {
  search: '',
  country: '',
  fundingType: '',
  dataStatus: '',
  currency: '',
};

const USE_OF_FUNDS_KEYS: UseOfFundsKey[] = [
  'product',
  'marketing',
  'operations',
  'hiring',
  'licensesLegal',
  'emergencyReserve',
  'other',
];

const DELIVERY_MODELS = [
  { value: 'digital', labelKey: 'digital' },
  { value: 'physical', labelKey: 'physical' },
  { value: 'hybrid', labelKey: 'hybrid' },
] as const;

const TARGET_CUSTOMER_OPTIONS = [
  { value: 'b2c', labelKey: 'individuals' },
  { value: 'b2b', labelKey: 'companies' },
  { value: 'government', labelKey: 'governmentCustomers' },
  { value: 'international', labelKey: 'internationalCustomers' },
  { value: 'gcc', labelKey: 'gccCustomers' },
] as const;

const OPERATIONAL_NEED_OPTIONS = [
  { value: 'physical_office', labelKey: 'physicalOffice' },
  { value: 'warehouse', labelKey: 'warehouse' },
  { value: 'employees', labelKey: 'employeesNeed' },
  { value: 'foreign_hiring', labelKey: 'foreignHiring' },
  { value: 'payment_gateway', labelKey: 'paymentGateway' },
  { value: 'import_export', labelKey: 'importExport' },
  { value: 'licenses', labelKey: 'licensesNeed' },
  { value: 'investor_friendly', labelKey: 'investorFriendly' },
] as const;

const FUNDING_GOAL_OPTIONS = [
  { value: 'investors', labelKey: 'wantsInvestors' },
  { value: 'bank_loan', labelKey: 'wantsBankLoan' },
  { value: 'government_support', labelKey: 'wantsGovernmentSupport' },
  { value: 'islamic_finance', labelKey: 'wantsIslamicFinance' },
] as const;

const EXPANSION_OPTIONS = [
  { value: 'local_only', labelKey: 'localOnly' },
  { value: 'gcc', labelKey: 'gccExpansionPlan' },
  { value: 'mena', labelKey: 'menaExpansion' },
  { value: 'global', labelKey: 'globalExpansion' },
  { value: 'cross_border', labelKey: 'crossBorderEcommerce' },
] as const;

const JURISDICTION_STEPS = [
  'selectProjectStep',
  'businessActivity',
  'targetCustomersStep',
  'operationalNeeds',
  'capitalFunding',
  'expansionPlan',
] as const;

const OFFICIAL_VERIFICATION_KEYS = [
  'requiredLicenseType',
  'corporateTaxFees',
  'foreignOwnership',
  'officeAddress',
  'hiringVisa',
  'businessActivityRequirements',
  'paymentGatewayRequirements',
  'importExportRequirements',
] as const;

const initialWizard: JurisdictionWizardState = {
  targetMarket: '',
  businessType: '',
  industry: '',
  productService: '',
  deliveryModel: '',
  targetCustomers: [],
  operationalNeeds: [],
  availableCapital: '',
  fundingNeeded: '',
  fundingGoals: [],
  expansionPlan: '',
};

const emptyUseOfFunds = (): UseOfFundsState => ({
  product: { amount: '', percent: '' },
  marketing: { amount: '', percent: '' },
  operations: { amount: '', percent: '' },
  hiring: { amount: '', percent: '' },
  licensesLegal: { amount: '', percent: '' },
  emergencyReserve: { amount: '', percent: '' },
  other: { amount: '', percent: '' },
});

const emptyFundingForm = (currency = 'KWD'): FundingPlannerForm => ({
  fundingNeeded: '',
  currency,
  fundingType: '',
  useOfFunds: emptyUseOfFunds(),
  notes: '',
});

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

function investorStatusLabel(status: InvestorItemStatus, text: typeof TEXT[Lang]) {
  if (status === 'complete') return text.complete;
  if (status === 'needs_review') return text.needsReviewItem;
  return text.missingItem;
}

function percent(value: number, lang: Lang) {
  return `${new Intl.NumberFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 }).format(value)}%`;
}

function selectedLabel(options: Array<{ value: string; label: Record<Lang, string> }>, value: string, lang: Lang) {
  return options.find(item => item.value === value)?.label[lang] ?? '';
}

function normalizeWizard(value: unknown): JurisdictionWizardState {
  const row = toRecord(value);
  return {
    targetMarket: typeof row.targetMarket === 'string' ? row.targetMarket : '',
    businessType: typeof row.businessType === 'string' ? row.businessType : '',
    industry: typeof row.industry === 'string' ? row.industry : '',
    productService: typeof row.productService === 'string' ? row.productService : '',
    deliveryModel: typeof row.deliveryModel === 'string' ? row.deliveryModel : '',
    targetCustomers: Array.isArray(row.targetCustomers) ? row.targetCustomers.map(String) : [],
    operationalNeeds: Array.isArray(row.operationalNeeds) ? row.operationalNeeds.map(String) : [],
    availableCapital: row.availableCapital === undefined || row.availableCapital === null ? '' : String(row.availableCapital),
    fundingNeeded: row.fundingNeeded === undefined || row.fundingNeeded === null ? '' : String(row.fundingNeeded),
    fundingGoals: Array.isArray(row.fundingGoals) ? row.fundingGoals.map(String) : [],
    expansionPlan: typeof row.expansionPlan === 'string' ? row.expansionPlan : '',
  };
}

function optionLabel(options: ReadonlyArray<{ value: string; labelKey: string }>, value: string, text: Record<string, string>) {
  const item = options.find(option => option.value === value);
  return item ? text[item.labelKey] : '';
}

function checkboxLabels(options: ReadonlyArray<{ value: string; labelKey: string }>, values: string[], text: Record<string, string>) {
  return values.map(value => optionLabel(options, value, text)).filter(Boolean);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildJurisdictionResults(wizard: JurisdictionWizardState, text: Record<string, string>, lang: Lang): JurisdictionResult[] {
  const targetLabels = checkboxLabels(TARGET_CUSTOMER_OPTIONS, wizard.targetCustomers, text);
  const delivery = optionLabel(DELIVERY_MODELS, wizard.deliveryModel, text);
  const expansion = optionLabel(EXPANSION_OPTIONS, wizard.expansionPlan, text);
  const verificationItems = OFFICIAL_VERIFICATION_KEYS.map(key => text[key]);
  return COUNTRIES.map(country => {
    const isGcc = country.value !== 'global-other';
    const isSelectedMarket = wizard.targetMarket === country.value;
    const isGlobal = country.value === 'global-other';
    const hasGccFocus = wizard.targetCustomers.includes('gcc') || wizard.expansionPlan === 'gcc';
    const hasGlobalFocus = wizard.targetCustomers.includes('international') || wizard.expansionPlan === 'global' || wizard.expansionPlan === 'cross_border';
    let targetFit = wizard.targetMarket ? 10 : 12;
    if (isSelectedMarket) targetFit = 25;
    else if (hasGccFocus && isGcc) targetFit = 20;
    else if (hasGlobalFocus && isGlobal) targetFit = 22;

    let operationalFit = 12;
    if (wizard.deliveryModel === 'digital' && !wizard.operationalNeeds.includes('physical_office') && !wizard.operationalNeeds.includes('warehouse')) operationalFit += 5;
    if ((wizard.deliveryModel === 'physical' || wizard.deliveryModel === 'hybrid') && isSelectedMarket) operationalFit += 6;
    if (wizard.operationalNeeds.includes('investor_friendly') && !isGlobal) operationalFit += 3;
    if (wizard.operationalNeeds.length > 0) operationalFit += 2;
    operationalFit = Math.min(25, operationalFit);

    let fundingFit = wizard.fundingGoals.length ? 10 : 12;
    if (wizard.fundingGoals.includes('investors') && wizard.operationalNeeds.includes('investor_friendly')) fundingFit += 5;
    if (wizard.fundingGoals.includes('bank_loan')) fundingFit += 2;
    if (wizard.fundingGoals.includes('islamic_finance')) fundingFit += 2;
    if (wizard.fundingGoals.includes('government_support')) fundingFit += 1;
    fundingFit = Math.min(20, fundingFit);

    let expansionFit = 10;
    if (wizard.expansionPlan === 'local_only') expansionFit = isSelectedMarket ? 20 : 8;
    if (wizard.expansionPlan === 'gcc') expansionFit = isGcc ? 20 : 10;
    if (wizard.expansionPlan === 'mena') expansionFit = isGcc ? 16 : 12;
    if (wizard.expansionPlan === 'global' || wizard.expansionPlan === 'cross_border') expansionFit = isGlobal ? 20 : 14;

    const score = clampScore(targetFit + operationalFit + fundingFit + expansionFit - 10);
    const strengths = [
      isSelectedMarket ? text.matchesSelectedMarket : '',
      hasGccFocus && isGcc ? text.matchesGccExpansion : '',
      hasGlobalFocus && isGlobal ? text.matchesGlobalExpansion : '',
      wizard.expansionPlan === 'local_only' && isSelectedMarket ? text.localFocusFit : '',
    ].filter(Boolean);
    if (strengths.length === 0) strengths.push(text.basedOnInputsOnly);

    const limitations = [text.requiresOfficialVerification, text.notVerifiedYet];
    if (wizard.operationalNeeds.includes('investor_friendly')) limitations.push(text.investorSetupRequiresVerification);
    if (wizard.operationalNeeds.includes('import_export')) limitations.push(text.importExportRequiresVerification);
    if (wizard.operationalNeeds.includes('payment_gateway')) limitations.push(text.paymentGatewayRequiresVerification);
    if (wizard.operationalNeeds.includes('licenses')) limitations.push(text.licenseRequiresVerification);
    if (wizard.operationalNeeds.includes('physical_office') || wizard.operationalNeeds.includes('warehouse')) limitations.push(text.physicalNeedsRequireVerification);
    if (wizard.fundingGoals.includes('government_support')) limitations.push(text.fundingSupportRequiresVerification);

    const suitableFor = [delivery, expansion, ...targetLabels].filter(Boolean);
    const riskNotes = [text.basedOnInputsOnly, text.requiresOfficialVerification];
    const nextSteps = [
      text.requiredLicenseType,
      text.officeAddress,
      text.corporateTaxFees,
      wizard.operationalNeeds.includes('import_export') ? text.importExportRequirements : '',
      wizard.operationalNeeds.includes('payment_gateway') ? text.paymentGatewayRequirements : '',
    ].filter(Boolean);

    return {
      code: country.value,
      label: country.label[lang],
      region: isGlobal ? 'Global' : 'GCC',
      score,
      strengths,
      limitations,
      verificationItems,
      suitableFor: suitableFor.length ? suitableFor : [text.basedOnInputsOnly],
      riskNotes,
      nextSteps,
    };
  }).sort((a, b) => b.score - a.score);
}

function fundingProgramLabel(program: FundingProgramRow, lang: Lang) {
  if (lang === 'fr') return program.name_fr || program.name_en || program.name_ar;
  if (lang === 'en') return program.name_en || program.name_ar;
  return program.name_ar || program.name_en || '';
}

function fundingProgramDescription(program: FundingProgramRow, lang: Lang) {
  if (lang === 'fr') return program.description_fr || program.description_en || program.description_ar || '';
  if (lang === 'en') return program.description_en || program.description_ar || '';
  return program.description_ar || program.description_en || '';
}

function fundingProgramEligibility(program: FundingProgramRow, lang: Lang) {
  if (lang === 'fr') return program.eligibility_summary_fr || program.eligibility_summary_en || program.eligibility_summary_ar || '';
  if (lang === 'en') return program.eligibility_summary_en || program.eligibility_summary_ar || '';
  return program.eligibility_summary_ar || program.eligibility_summary_en || '';
}

function fundingProgramTypeLabel(value: string | null | undefined, text: Record<string, string>) {
  return optionLabel(FUNDING_PROGRAM_TYPES, value || 'other', text) || text.other;
}

function fundingDataStatusLabel(value: string | null | undefined, text: Record<string, string>) {
  return optionLabel(FUNDING_DATA_STATUSES, value || 'unverified', text) || text.unverified;
}

function shortlistStatusLabel(value: string | null | undefined, text: Record<string, string>) {
  return optionLabel(SHORTLIST_STATUSES, value || 'saved', text) || text.saved;
}

function fundingDataStatusClass(value: string | null | undefined) {
  if (value === 'verified') return 'ready-for-review';
  if (value === 'pending_review') return 'needs-improvement';
  return 'not-ready';
}

function normalizedFundingPreference(value?: string | null) {
  if (value === 'self_funded') return 'self_funding';
  if (value === 'angel_investor') return 'angel';
  if (value === 'investor_partner') return 'strategic_partner';
  return value || '';
}

function fundingTicketText(program: FundingProgramRow, text: Record<string, string>, lang: Lang) {
  if (program.data_status !== 'verified') return text.officialVerificationRequired;
  const min = toNumber(program.typical_ticket_min);
  const max = toNumber(program.typical_ticket_max);
  const currency = program.currency || 'KWD';
  if (min !== null && max !== null) return `${formatMoney(min, currency, lang)} - ${formatMoney(max, currency, lang)}`;
  if (min !== null) return formatMoney(min, currency, lang);
  if (max !== null) return formatMoney(max, currency, lang);
  return text.insufficient;
}

function programMatchesSearch(program: FundingProgramRow, search: string, lang: Lang) {
  const value = search.trim().toLowerCase();
  if (!value) return true;
  const fields = [
    fundingProgramLabel(program, lang),
    program.provider_name,
    program.country,
    program.region,
    fundingProgramDescription(program, lang),
    fundingProgramEligibility(program, lang),
  ];
  return fields.some(field => String(field ?? '').toLowerCase().includes(value));
}

function filterFundingPrograms(programs: FundingProgramRow[], filters: FundingDirectoryFilters, lang: Lang) {
  return programs.filter(program => {
    if (!programMatchesSearch(program, filters.search, lang)) return false;
    if (filters.country && program.country !== filters.country) return false;
    if (filters.fundingType && program.funding_type !== filters.fundingType) return false;
    if (filters.dataStatus && (program.data_status || 'unverified') !== filters.dataStatus) return false;
    if (filters.currency && (program.currency || 'KWD') !== filters.currency) return false;
    return true;
  });
}

function buildFundingFit(program: FundingProgramRow, selectedProject: ProjectRow | null, readiness: any, fundingRecord: FundingReadinessRow | null, text: Record<string, string>) {
  if (!selectedProject || !readiness) {
    return { score: null as number | null, notes: [text.noProjectForShortlist], confirmed: false };
  }

  const notes: string[] = [];
  let score = 0;
  const projectCountry = firstText(selectedProject, ['country', 'target_market', 'market', 'location'], '');
  if (projectCountry && program.country && projectCountry.toLowerCase() === String(program.country).toLowerCase()) {
    score += 20;
  } else if (!projectCountry || !program.country) {
    notes.push(text.officialVerificationRequired);
  }

  const preferredFundingType = normalizedFundingPreference(fundingRecord?.funding_type);
  if (preferredFundingType && preferredFundingType === program.funding_type) {
    score += 20;
  } else if (!preferredFundingType) {
    notes.push(text.targetFundingType);
  }

  const fundingNeeded = toNumber(fundingRecord?.funding_needed) ?? readiness.capitalAmount ?? null;
  const min = program.data_status === 'verified' ? toNumber(program.typical_ticket_min) : null;
  const max = program.data_status === 'verified' ? toNumber(program.typical_ticket_max) : null;
  if (fundingNeeded !== null && (min !== null || max !== null)) {
    const minOk = min === null || fundingNeeded >= min;
    const maxOk = max === null || fundingNeeded <= max;
    score += minOk && maxOk ? 20 : 8;
  } else {
    notes.push(text.fitCannotBeConfirmed);
  }

  if (readiness.pitchDeck) score += 15;
  if (readiness.financialModel) score += 15;
  if (readiness.feasibility) score += 10;
  if (readiness.documents) score += 5;
  if (readiness.useOfFundsStatus === 'complete') score += 5;

  const confirmed = program.data_status === 'verified' && notes.length === 0;
  if (!confirmed) notes.unshift(text.fitCannotBeConfirmed);
  return { score: clampScore(score), notes: Array.from(new Set(notes)).slice(0, 4), confirmed };
}

function buildFundingApplicationChecklist(readiness: any, modules: ModuleRows, fundingRecord: FundingReadinessRow | null, text: Record<string, string>) {
  const legalDocs = maybeDocumentStatus(modules.documents, ['legal']);
  const licenseDocs = maybeDocumentStatus(modules.documents, ['license']);
  const financialDocs = maybeDocumentStatus(modules.documents, ['financial', 'bank_statement', 'statement']);
  const useOfFundsStatus = readiness?.useOfFundsStatus ?? (fundingRecord?.id ? 'needs_review' : 'missing');
  return [
    { label: text.pitchDeck, status: readiness?.pitchDeck ? 'complete' : 'missing' },
    { label: text.financialModel, status: readiness?.financialModel ? 'complete' : 'missing' },
    { label: text.feasibilityStudy, status: readiness?.feasibility ? 'complete' : 'missing' },
    { label: text.useOfFundsPlan, status: useOfFundsStatus },
    { label: text.legalDocuments, status: legalDocs },
    { label: text.licenses, status: licenseDocs },
    { label: text.kpiSignals, status: readiness?.kpis ? 'complete' : 'missing' },
    { label: text.bankStatementFinancials, status: financialDocs },
  ] as Array<{ label: string; status: InvestorItemStatus }>;
}

function fundingRowToForm(row: FundingReadinessRow | null, fallbackCurrency: string): FundingPlannerForm {
  const savedFunds = toRecord(row?.use_of_funds);
  const useOfFunds = emptyUseOfFunds();
  USE_OF_FUNDS_KEYS.forEach(key => {
    const item = toRecord(savedFunds[key]);
    useOfFunds[key] = {
      amount: item.amount === undefined || item.amount === null ? '' : String(item.amount),
      percent: item.percent === undefined || item.percent === null ? '' : String(item.percent),
    };
  });
  return {
    fundingNeeded: row?.funding_needed === undefined || row?.funding_needed === null || Number(row.funding_needed) === 0 ? '' : String(row.funding_needed),
    currency: row?.currency || fallbackCurrency || 'KWD',
    fundingType: row?.funding_type || '',
    useOfFunds,
    notes: row?.notes || '',
  };
}

function calculateUseOfFundsTotals(form: FundingPlannerForm) {
  const fundingNeeded = toNumber(form.fundingNeeded) ?? 0;
  const amountTotal = USE_OF_FUNDS_KEYS.reduce((sum, key) => sum + (toNumber(form.useOfFunds[key].amount) ?? 0), 0);
  const percentTotal = USE_OF_FUNDS_KEYS.reduce((sum, key) => sum + (toNumber(form.useOfFunds[key].percent) ?? 0), 0);
  const hasAny = fundingNeeded > 0 || amountTotal > 0 || percentTotal > 0;
  const amountMatches = fundingNeeded > 0 && Math.abs(amountTotal - fundingNeeded) < 0.01;
  const percentMatches = Math.abs(percentTotal - 100) < 0.01;
  return { fundingNeeded, amountTotal, percentTotal, amountMatches, percentMatches, hasAny };
}

function getUseOfFundsStatusFromTotals(totals: ReturnType<typeof calculateUseOfFundsTotals>): InvestorItemStatus {
  if (totals.fundingNeeded > 0 && totals.amountMatches && totals.percentMatches) return 'complete';
  if (totals.hasAny) return 'needs_review';
  return 'missing';
}

function feasibilitySectionCount(row?: any) {
  if (!row) return 0;
  return ['market_data', 'technical_data', 'financial_data', 'legal_data'].filter(key => hasObjectData(row[key])).length;
}

function documentHasCategory(documents: any[], categories: string[]) {
  return documents.some(document => categories.includes(String(document?.category ?? '').toLowerCase()));
}

function maybeDocumentStatus(documents: any[], categories: string[]): InvestorItemStatus {
  if (documentHasCategory(documents, categories)) return 'complete';
  return documents.length > 0 ? 'needs_review' : 'missing';
}

function getFinancialPayback(financialModelRow: any): number | null {
  const kpis = toRecord(financialModelRow?.kpis);
  for (const key of ['paybackPeriod', 'payback_period', 'paybackMonths', 'payback_months']) {
    const value = toNumber(kpis[key]);
    if (value !== null) return value;
  }
  return null;
}

function buildInvestorPackageItems({
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
}: {
  selectedProject: ProjectRow;
  modules: ModuleRows;
  text: Record<string, string>;
  basicFields: number;
  feasibility: boolean;
  feasibilityComplete: boolean;
  financialModel: boolean;
  pitchDeck: boolean;
  kpis: boolean;
  tasksMilestones: boolean;
  useOfFundsStatus: InvestorItemStatus;
}): InvestorPackageItem[] {
  const base = `/projects/${selectedProject.id}`;
  const summaryStatus: InvestorItemStatus = basicFields >= 3 ? 'complete' : basicFields > 0 ? 'needs_review' : 'missing';
  const feasibilityStatus: InvestorItemStatus = feasibilityComplete ? 'complete' : feasibility ? 'needs_review' : 'missing';
  const executionStatus: InvestorItemStatus = modules.tasks.length > 0 && modules.milestones.length > 0 ? 'complete' : tasksMilestones ? 'needs_review' : 'missing';
  return [
    { key: 'pitchDeck', label: text.pitchDeck, status: pitchDeck ? 'complete' : 'missing', href: `${base}?tab=pitchDeck` },
    { key: 'financialModel', label: text.financialModel, status: financialModel ? 'complete' : 'missing', href: `${base}?tab=financial` },
    { key: 'feasibility', label: text.feasibilityStudy, status: feasibilityStatus, href: `${base}?tab=feasibility` },
    { key: 'projectSummary', label: text.projectSummary, status: summaryStatus, href: base },
    { key: 'useOfFunds', label: text.useOfFundsPlan, status: useOfFundsStatus, href: '#funding-readiness-module' },
    { key: 'kpis', label: text.kpiSignals, status: kpis ? 'complete' : 'missing', href: `${base}?tab=kpis` },
    { key: 'legalDocuments', label: text.legalDocuments, status: maybeDocumentStatus(modules.documents, ['legal']), href: `${base}?tab=documents` },
    { key: 'licenses', label: text.licenses, status: maybeDocumentStatus(modules.documents, ['license']), href: `${base}?tab=documents` },
    { key: 'keyContracts', label: text.keyContracts, status: maybeDocumentStatus(modules.documents, ['contract']), href: `${base}?tab=documents` },
    { key: 'executionPlan', label: text.executionPlan, status: executionStatus, href: `${base}?tab=tasks` },
  ];
}

function buildFundingWarnings({
  text,
  financialModel,
  pitchDeck,
  documents,
  useOfFundsStatus,
  financialModelRow,
}: {
  text: Record<string, string>;
  financialModel: boolean;
  pitchDeck: boolean;
  documents: boolean;
  useOfFundsStatus: InvestorItemStatus;
  financialModelRow: any;
}) {
  const warnings: string[] = [];
  if (!financialModel) warnings.push(text.financialModelMissingWarning);
  if (!pitchDeck) warnings.push(text.pitchDeckMissingWarning);
  if (!documents) warnings.push(text.documentsMissingWarning);
  if (useOfFundsStatus !== 'complete') warnings.push(text.useOfFundsMissingWarning);
  const payback = getFinancialPayback(financialModelRow);
  if (payback !== null && payback > 36) warnings.push(text.paybackLongWarning);
  return warnings;
}

function strategicStatusLabel(status: StrategicDocumentStatus, text: Record<string, string>) {
  if (status === 'ready') return text.readyDocument;
  if (status === 'in_progress') return text.inProgress;
  if (status === 'unavailable') return text.currentlyUnavailable;
  return text.needsData;
}

function strategicStatusClass(status: StrategicDocumentStatus) {
  if (status === 'ready') return 'ready-for-review';
  if (status === 'in_progress') return 'needs-improvement';
  if (status === 'unavailable') return 'not-ready';
  return 'not-ready';
}

function missingAction(label: string, href: string): StrategicMissingAction {
  return { label, href };
}

function addIfMissing(actions: StrategicMissingAction[], condition: boolean, label: string, href: string) {
  if (!condition) actions.push(missingAction(label, href));
}

function hasFundingPlan(fundingRecord: FundingReadinessRow | null, useOfFundsStatus?: InvestorItemStatus) {
  return Boolean(fundingRecord?.id) || useOfFundsStatus === 'complete';
}

function buildStrategicDocumentItems({
  selectedProject,
  modules,
  readiness,
  fundingRecord,
  text,
}: {
  selectedProject: ProjectRow;
  modules: ModuleRows;
  readiness: any;
  fundingRecord: FundingReadinessRow | null;
  text: Record<string, string>;
}): StrategicDocumentItem[] {
  const base = `/projects/${selectedProject.id}`;
  const hasOverview = Boolean(firstText(selectedProject, ['name', 'project_name', 'title'])) && Boolean(firstText(selectedProject, ['category', 'type', 'project_type', 'description', 'summary']));
  const feasibility = Boolean(readiness?.feasibility);
  const feasibilityComplete = Boolean(readiness?.feasibilityComplete);
  const financialModel = Boolean(readiness?.financialModel);
  const pitchDeck = Boolean(readiness?.pitchDeck);
  const kpis = Boolean(readiness?.kpis);
  const tasksMilestones = Boolean(readiness?.tasksMilestones);
  const documents = modules.documents.length > 0;
  const fundingPlan = hasFundingPlan(fundingRecord, readiness?.useOfFundsStatus);
  const hasLegalDocs = documentHasCategory(modules.documents, ['legal']);
  const hasLicenses = documentHasCategory(modules.documents, ['license']);
  const hasContracts = documentHasCategory(modules.documents, ['contract']);
  const overviewAction = missingAction(text.projectSummary, base);
  const feasibilityAction = missingAction(text.completeFeasibility, `${base}?tab=feasibility`);
  const financialAction = missingAction(text.addFinancialModel, `${base}?tab=financial`);
  const documentsAction = missingAction(text.uploadDocuments, `${base}?tab=documents`);
  const pitchDeckAction = missingAction(text.createPitchDeckAction, `${base}?tab=pitchDeck`);
  const kpisAction = missingAction(text.addKpis, `${base}?tab=kpis`);
  const tasksAction = missingAction(text.addTasksMilestones, `${base}?tab=tasks`);
  const fundingAction = missingAction(text.completeUseOfFunds, '#funding-readiness-module');

  const businessPlanMissing = [overviewAction];
  addIfMissing(businessPlanMissing, feasibilityComplete, text.completeFeasibility, `${base}?tab=feasibility`);
  addIfMissing(businessPlanMissing, financialModel, text.addFinancialModel, `${base}?tab=financial`);
  addIfMissing(businessPlanMissing, tasksMilestones, text.addTasksMilestones, `${base}?tab=tasks`);
  const businessPlanReady = hasOverview && feasibilityComplete && financialModel && tasksMilestones;

  const pitchMissing: StrategicMissingAction[] = [];
  addIfMissing(pitchMissing, pitchDeck || (hasOverview && feasibility && financialModel), text.createPitchDeckAction, `${base}?tab=pitchDeck`);

  const investmentMissing: StrategicMissingAction[] = [];
  addIfMissing(investmentMissing, hasOverview, text.projectSummary, base);
  addIfMissing(investmentMissing, financialModel, text.addFinancialModel, `${base}?tab=financial`);
  addIfMissing(investmentMissing, kpis, text.addKpis, `${base}?tab=kpis`);
  addIfMissing(investmentMissing, fundingPlan, text.completeUseOfFunds, '#funding-readiness-module');
  addIfMissing(investmentMissing, feasibility, text.completeFeasibility, `${base}?tab=feasibility`);

  const dueDiligenceMissing: StrategicMissingAction[] = [];
  addIfMissing(dueDiligenceMissing, documents, text.uploadDocuments, `${base}?tab=documents`);
  addIfMissing(dueDiligenceMissing, financialModel, text.addFinancialModel, `${base}?tab=financial`);
  addIfMissing(dueDiligenceMissing, feasibility, text.completeFeasibility, `${base}?tab=feasibility`);
  addIfMissing(dueDiligenceMissing, hasLegalDocs || hasLicenses || hasContracts, text.legalDocuments, `${base}?tab=documents`);

  const executiveMissing: StrategicMissingAction[] = [];
  addIfMissing(executiveMissing, hasOverview, text.projectSummary, base);
  addIfMissing(executiveMissing, feasibility || financialModel, text.completeFeasibility, `${base}?tab=feasibility`);

  return [
    {
      key: 'businessPlan',
      title: text.businessPlan,
      status: businessPlanReady ? 'ready' : feasibility || financialModel || tasksMilestones ? 'in_progress' : 'needs_data',
      href: base,
      description: text.generateBusinessPlanDraft,
      missing: businessPlanMissing.filter(action => action !== overviewAction || !hasOverview),
    },
    {
      key: 'pitchDeck',
      title: text.pitchDeck,
      status: pitchDeck ? 'ready' : hasOverview && (feasibility || financialModel) ? 'in_progress' : 'needs_data',
      href: `${base}?tab=pitchDeck`,
      description: text.createPitchDeckAction,
      missing: pitchMissing,
    },
    {
      key: 'financialModel',
      title: text.financialModel,
      status: financialModel ? 'ready' : 'needs_data',
      href: `${base}?tab=financial`,
      description: text.addFinancialModel,
      missing: financialModel ? [] : [financialAction],
    },
    {
      key: 'feasibilityStudy',
      title: text.feasibilityStudy,
      status: feasibilityComplete ? 'ready' : feasibility ? 'in_progress' : 'needs_data',
      href: `${base}?tab=feasibility`,
      description: text.completeFeasibility,
      missing: feasibilityComplete ? [] : [feasibilityAction],
    },
    {
      key: 'investmentMemo',
      title: text.investmentMemo,
      status: investmentMissing.length === 0 ? 'ready' : investmentMissing.length <= 2 ? 'in_progress' : 'needs_data',
      href: base,
      description: text.generateInvestmentMemo,
      missing: investmentMissing,
    },
    {
      key: 'dueDiligencePack',
      title: text.dueDiligenceChecklist,
      status: dueDiligenceMissing.length === 0 ? 'ready' : documents ? 'in_progress' : 'needs_data',
      href: `${base}?tab=documents`,
      description: text.openDocumentsTab,
      missing: dueDiligenceMissing,
    },
    {
      key: 'executiveSummary',
      title: text.executiveSummary,
      status: executiveMissing.length === 0 ? 'ready' : hasOverview ? 'in_progress' : 'needs_data',
      href: base,
      description: text.generateExecutiveSummary,
      missing: executiveMissing,
    },
    {
      key: 'launchPlan90',
      title: text.launchPlan90,
      status: tasksMilestones ? 'ready' : 'needs_data',
      href: `${base}?tab=tasks`,
      description: text.addTasksMilestones,
      missing: tasksMilestones ? [] : [tasksAction],
    },
  ];
}

function buildDueDiligenceItems(modules: ModuleRows, readiness: any, text: Record<string, string>) {
  return [
    { label: text.licenseRegistration, status: maybeDocumentStatus(modules.documents, ['license']) },
    { label: text.keyContracts, status: maybeDocumentStatus(modules.documents, ['contract']) },
    { label: text.invoices, status: maybeDocumentStatus(modules.documents, ['invoice', 'receipt']) },
    { label: text.financialModel, status: readiness?.financialModel ? 'complete' : 'missing' },
    { label: text.feasibilityStudy, status: readiness?.feasibility ? 'complete' : 'missing' },
    { label: text.legalDocuments, status: maybeDocumentStatus(modules.documents, ['legal']) },
    { label: text.riskReport, status: readiness?.fundingWarnings?.length ? 'needs_review' : readiness?.kpis ? 'complete' : 'missing' },
    { label: text.teamInfo, status: 'needs_review' },
  ] as Array<{ label: string; status: InvestorItemStatus }>;
}

function groupedDocumentCounts(documents: any[]) {
  return documents.reduce<Record<string, number>>((acc, document) => {
    const category = String(document?.category || 'other');
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});
}

function getValueOrMissing(value: unknown, text: Record<string, string>) {
  if (value === null || value === undefined || value === '') return text.incompleteInfo;
  return String(value);
}

function financialKpiLine(label: string, value: unknown, text: Record<string, string>, currency?: string, locale?: Lang) {
  const numeric = toNumber(value);
  if (numeric !== null && currency && locale) return `${label}: ${formatMoney(numeric, currency, locale)}`;
  return `${label}: ${getValueOrMissing(value, text)}`;
}

function buildDocumentDraft({
  kind,
  selectedProject,
  modules,
  readiness,
  fundingForm,
  selectedCurrency,
  locale,
  text,
}: {
  kind: DocumentDraft['type'];
  selectedProject: ProjectRow;
  modules: ModuleRows;
  readiness: any;
  fundingForm: FundingPlannerForm;
  selectedCurrency: string;
  locale: Lang;
  text: Record<string, string>;
}): DocumentDraft {
  const feasibility = modules.feasibility[0] ?? {};
  const market = toRecord(feasibility.market_data);
  const technical = toRecord(feasibility.technical_data);
  const financial = toRecord(feasibility.financial_data);
  const financialModel = modules.financialModels[0] ?? {};
  const kpis = toRecord(financialModel.kpis);
  const assumptions = toRecord(financialModel.assumptions);
  const revenueStreams = Array.isArray(financialModel.revenue_streams) ? financialModel.revenue_streams : [];
  const projectName = firstText(selectedProject, ['name', 'project_name', 'title'], text.incompleteInfo);
  const projectType = firstText(selectedProject, ['category', 'type', 'project_type'], text.incompleteInfo);
  const description = firstText(selectedProject, ['description', 'summary', 'notes'], '');
  const fundingNeeded = toNumber(fundingForm.fundingNeeded) ?? readiness?.capitalAmount ?? toNumber(financial.requiredCapital) ?? null;
  const useOfFundsLines = USE_OF_FUNDS_KEYS
    .map(key => {
      const amount = toNumber(fundingForm.useOfFunds[key].amount);
      const percentValue = toNumber(fundingForm.useOfFunds[key].percent);
      if (amount === null && percentValue === null) return '';
      const amountText = amount !== null ? formatMoney(amount, fundingForm.currency || selectedCurrency, locale) : text.incompleteInfo;
      const percentText = percentValue !== null ? percent(percentValue, locale) : text.incompleteInfo;
      return `${text[key]}: ${amountText} / ${percentText}`;
    })
    .filter(Boolean);
  const riskLines = readiness?.fundingWarnings?.length ? readiness.fundingWarnings : [text.incompleteInfo];
  const milestoneLines = [
    `${text.tasksCount}: ${modules.tasks.length}`,
    `${text.milestonesSection}: ${modules.milestones.length}`,
  ];

  if (kind === 'executiveSummary') {
    return {
      type: kind,
      title: text.executiveSummary,
      source: 'rules',
      sections: [
        { title: text.projectSummarySection, lines: [`${text.selectedProject}: ${projectName}`, `${text.businessType}: ${projectType}`, description || text.incompleteInfo] },
        { title: text.opportunitySection, lines: [firstText(market, ['targetCustomerSegment', 'target_customer_segment', 'customerSegment'], text.incompleteInfo), firstText(market, ['problemSolved', 'problem_solved', 'problem'], text.incompleteInfo)] },
        { title: text.financialSummarySection, lines: [financialKpiLine(text.capitalRequired, fundingNeeded, text, fundingForm.currency || selectedCurrency, locale), `${text.roiLabel}: ${getValueOrMissing(kpis.roi ?? kpis.ROI, text)}`, `${text.fundingReadiness}: ${readiness ? percent(readiness.fundingScore, locale) : text.incompleteInfo}`] },
        { title: text.nextStepsSection, lines: readiness?.packageItems?.filter((item: InvestorPackageItem) => item.status !== 'complete').slice(0, 5).map((item: InvestorPackageItem) => item.label) ?? [text.incompleteInfo] },
      ],
    };
  }

  if (kind === 'investmentMemo') {
    return {
      type: kind,
      title: text.investmentMemo,
      source: 'rules',
      sections: [
        { title: text.projectSummarySection, lines: [`${text.selectedProject}: ${projectName}`, `${text.businessType}: ${projectType}`, description || text.incompleteInfo] },
        { title: text.opportunitySection, lines: [firstText(market, ['expectedMarketSize', 'expected_market_size', 'marketSize'], text.incompleteInfo), firstText(market, ['targetCustomerSegment', 'target_customer_segment'], text.incompleteInfo)] },
        { title: text.financialSummarySection, lines: [financialKpiLine(text.fundingNeeded, fundingNeeded, text, fundingForm.currency || selectedCurrency, locale), `${text.financialModel}: ${readiness?.financialModel ? text.readyDocument : text.needsData}`, `${text.roiLabel}: ${getValueOrMissing(kpis.roi ?? kpis.ROI, text)}`, `${text.fundingReadiness}: ${readiness ? percent(readiness.fundingScore, locale) : text.incompleteInfo}`] },
        { title: text.useOfFundsSection, lines: useOfFundsLines.length ? useOfFundsLines : [text.incompleteInfo] },
        { title: text.risksSection, lines: riskLines },
        { title: text.milestonesSection, lines: milestoneLines },
        { title: text.recommendationStatusSection, lines: [text.planningOnlyDisclaimer] },
      ],
    };
  }

  return {
    type: kind,
    title: text.businessPlan,
    source: 'rules',
    sections: [
      { title: text.projectSummarySection, lines: [`${text.selectedProject}: ${projectName}`, `${text.businessType}: ${projectType}`, description || text.incompleteInfo] },
      { title: text.problemSection, lines: [firstText(market, ['problemSolved', 'problem_solved', 'problem'], text.incompleteInfo), firstText(market, ['targetCustomerSegment', 'target_customer_segment'], text.incompleteInfo)] },
      { title: text.solutionSection, lines: [firstText(selectedProject, ['solution', 'value_proposition'], ''), firstText(market, ['competitiveAdvantage', 'competitive_advantage'], text.incompleteInfo)].filter(Boolean) },
      { title: text.marketSection, lines: [firstText(market, ['expectedMarketSize', 'expected_market_size', 'marketSize'], text.incompleteInfo), firstText(market, ['mainCompetitors', 'main_competitors', 'competitors'], text.incompleteInfo)] },
      { title: text.productServiceSection, lines: [firstText(selectedProject, ['product', 'service', 'description'], text.incompleteInfo), firstText(technical, ['requiredTechnologyTools', 'technology_tools', 'required_technology'], text.incompleteInfo)] },
      { title: text.businessModelSection, lines: [firstText(market, ['pricingStrategy', 'pricing_strategy'], text.incompleteInfo), revenueStreams.length ? `${text.revenueStreamsLabel}: ${revenueStreams.length}` : text.incompleteInfo] },
      { title: text.operationsPlanSection, lines: [firstText(technical, ['requiredResources', 'required_resources'], text.incompleteInfo), `${text.tasksCount}: ${modules.tasks.length}`, `${text.milestonesSection}: ${modules.milestones.length}`] },
      { title: text.financialSummarySection, lines: [financialKpiLine(text.capitalRequired, fundingNeeded ?? assumptions.initialCapital, text, fundingForm.currency || selectedCurrency, locale), `${text.roiLabel}: ${getValueOrMissing(kpis.roi ?? kpis.ROI, text)}`, `${text.financialModel}: ${readiness?.financialModel ? text.readyDocument : text.needsData}`] },
      { title: text.risksSection, lines: riskLines },
      { title: text.nextStepsSection, lines: readiness?.packageItems?.filter((item: InvestorPackageItem) => item.status !== 'complete').slice(0, 5).map((item: InvestorPackageItem) => item.label) ?? [text.incompleteInfo] },
    ],
  };
}

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
        .from('business_funding_programs')
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
  }, [text.loadError]);

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
                        <label className="field">
                          <span>{text.currency}</span>
                          <input value={fundingForm.currency} onChange={event => setFundingForm(prev => ({ ...prev, currency: event.target.value.toUpperCase() }))} maxLength={8} aria-label={text.currency} />
                        </label>
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
                    </div>
                  ) : (
                    <div className="program-grid">
                      {filteredFundingPrograms.map(program => {
                        const shortlist = fundingShortlist.find(item => item.funding_program_id === program.id) ?? null;
                        const fit = buildFundingFit(program, selectedProject, readiness, fundingRecord, text);
                        const expanded = selectedFundingProgramId === program.id;
                        const savingThisProgram = shortlistSavingId === program.id;
                        const programStatus = program.data_status || 'unverified';
                        return (
                          <article className="program-card" key={program.id}>
                            <div className="program-card-head">
                              <div>
                                <h3>{fundingProgramLabel(program, locale)}</h3>
                                <p>{program.provider_name || text.officialVerificationRequired}</p>
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
                            <div className="program-actions">
                              <button type="button" onClick={() => setSelectedFundingProgramId(expanded ? '' : program.id)} aria-label={text.viewDetails}>{text.viewDetails}</button>
                              {program.application_url ? (
                                <a href={program.application_url} target="_blank" rel="noreferrer" aria-label={text.applicationLink}>{text.applicationLink} <ArrowRight size={14} /></a>
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
                                <p><b>{text.eligibilitySummary}</b><span>{fundingProgramEligibility(program, locale) || text.officialVerificationRequired}</span></p>
                                <p><b>{text.description}</b><span>{fundingProgramDescription(program, locale) || text.officialVerificationRequired}</span></p>
                                <p><b>{text.dataSource}</b><span>{program.data_source_url ? <a href={program.data_source_url} target="_blank" rel="noreferrer">{program.data_source_url}</a> : text.officialVerificationRequired}</span></p>
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
                  <label className="field">
                    <span>{text.selectProjectStep}</span>
                    <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} disabled={!projects.length} aria-label={text.selectProjectStep}>
                      {projects.length === 0 ? <option value="">{text.addProjectFirst}</option> : projects.map(project => (
                        <option key={project.id} value={project.id}>{firstText(project, ['name', 'project_name', 'title'], project.id)}</option>
                      ))}
                    </select>
                  </label>
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
  .hero-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}.hero-actions a,.hero-actions button,.empty-state a,.module-links a,.copilot-panel a{border:0;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;min-height:42px;padding:0 13px;text-decoration:none}
  .hero-actions button,.empty-state a,.copilot-panel a{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.hero-actions a{background:rgba(234,246,255,.12);color:var(--sfm-card);border:1px solid rgba(167,243,240,.18)}
  .load-warning{display:flex;align-items:center;gap:8px;background:#FFF7ED;border:1px solid rgba(154,94,13,.18);color:#7A4B09;border-radius:15px;padding:12px 14px;font-weight:900}
  .selector-panel,.readiness-head,.warm-card,.empty-state,.state-panel{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:22px;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0}
  .selector-panel{padding:16px;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.42fr);gap:16px;align-items:end}.selector-panel h2,.readiness-head h2,.card-title h2,.empty-state h2,.state-panel h1{margin:0;color:var(--sfm-midnight);font-size:22px;font-weight:950}.selector-panel p,.readiness-head p,.card-title p,.empty-state p,.state-panel p{margin:6px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.7}
  .selector-panel label,.field{display:grid;gap:7px;min-width:0}.selector-panel label span,.field span{font-size:12px;font-weight:950;color:var(--sfm-muted)}.selector-panel select,.field select,.field input,.field textarea{width:100%;min-width:0;border:1px solid rgba(29,140,255,.2);background:var(--sfm-card);color:var(--sfm-deep-navy);border-radius:14px;min-height:44px;padding:0 12px;font:900 13px Tajawal,Arial,sans-serif;outline:none}.field textarea{min-height:86px;padding:11px 12px;line-height:1.6;resize:vertical}.selector-panel select:focus,.field select:focus,.field input:focus,.field textarea:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}
  .empty-state,.state-panel{min-height:300px;display:grid;place-items:center;text-align:center;padding:30px}.empty-state svg,.state-panel svg{color:var(--sfm-primary)}.empty-state p,.state-panel p{max-width:560px}.empty-state a{margin-top:8px}
  .readiness-head{padding:18px;display:flex;align-items:center;justify-content:space-between;gap:16px}.score-pill{display:grid;place-items:center;text-align:center;min-width:140px;border-radius:18px;background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.16);padding:12px}.score-pill strong{font-size:24px;color:var(--sfm-primary-dark)}.score-pill span{font-size:12px;font-weight:950;color:var(--sfm-primary-hover)}
  .readiness-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;min-width:0}.readiness-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:20px;padding:15px;box-shadow:0 14px 38px rgba(3,18,37,.06);display:grid;gap:12px;min-width:0}.readiness-icon{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary)}.readiness-card h3{margin:0;color:var(--sfm-midnight);font-size:15px;font-weight:950;line-height:1.35}.readiness-card strong{display:block;margin:5px 0;color:var(--sfm-primary-dark);font-size:20px;overflow-wrap:anywhere}
  .status-badge{display:inline-flex;width:max-content;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950}.status-badge.ready-for-review,.status-badge.good{background:#ECFDF5;color:#047857}.status-badge.needs-improvement{background:#FFF7ED;color:#B45309}.status-badge.not-ready{background:#FEF2F2;color:#B91C1C}
  .progress-bar{height:9px;border-radius:999px;background:rgba(29,140,255,.10);overflow:hidden}.progress-bar span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--sfm-soft-cyan),var(--sfm-primary))}
  .funding-module{display:grid;gap:14px;min-width:0}.funding-header{background:linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 145%);color:var(--sfm-card);border-radius:24px;padding:22px;display:flex;justify-content:space-between;gap:16px;align-items:center;min-width:0;overflow:hidden;box-shadow:0 18px 48px rgba(3,18,37,.16)}.funding-header h2{margin:12px 0 8px;font-size:clamp(26px,4vw,40px);font-weight:950}.funding-header p{margin:0;color:rgba(234,246,255,.72);line-height:1.7;font-weight:850}.funding-header .score-pill{background:rgba(234,246,255,.1);border-color:rgba(167,243,240,.2)}.funding-header .score-pill strong{color:var(--sfm-card)}.funding-header .score-pill span{color:var(--sfm-soft-cyan)}
  .funding-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1.2fr) minmax(280px,.72fr);gap:16px;align-items:start;min-width:0}.package-grid{display:grid;gap:10px}.package-item{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:11px;color:var(--sfm-primary-dark);text-decoration:none;min-width:0}.package-item strong{min-width:0;overflow-wrap:anywhere}.package-item small{font-size:11px;font-weight:950;color:var(--sfm-muted)}.package-status{width:30px;height:30px;border-radius:11px;display:grid;place-items:center}.package-status.complete{background:#ECFDF5;color:#047857}.package-status.needs_review{background:#FFF7ED;color:#B45309}.package-status.missing{background:#FEF2F2;color:#B91C1C}
  .planner-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.planner-grid .field:last-child{grid-column:1 / -1}.funds-table{display:grid;gap:9px;margin-top:14px}.fund-row{display:grid;grid-template-columns:minmax(120px,.75fr) repeat(2,minmax(0,1fr));gap:9px;align-items:end;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:10px;min-width:0}.fund-row strong{color:var(--sfm-midnight);line-height:1.35}.fund-row label{display:grid;gap:5px;min-width:0}.fund-row label span{font-size:11px;color:var(--sfm-muted);font-weight:950}.fund-row input{width:100%;min-width:0;border:1px solid rgba(29,140,255,.18);border-radius:12px;background:var(--sfm-card);min-height:38px;padding:0 10px;font:900 12px Tajawal,Arial,sans-serif;outline:none}.fund-row input:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.12)}
  .planner-totals{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.planner-totals p{margin:0;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px}.planner-totals span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}.planner-totals strong{display:block;margin-top:5px;color:var(--sfm-primary-dark);overflow-wrap:anywhere}.planner-warning{display:flex;align-items:center;gap:7px;margin-top:10px;border:1px solid rgba(154,94,13,.18);background:#FFF7ED;color:#7A4B09;border-radius:14px;padding:10px 12px;font-size:12px;font-weight:950}.field.wide{margin-top:12px}.save-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.save-row button,.package-actions button{border:0;border-radius:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.save-row button:disabled,.package-actions button:disabled{opacity:.62;cursor:not-allowed}.form-message{margin:10px 0 0;color:var(--sfm-muted);font-weight:900}
  .funding-side{position:sticky;top:18px}.warning-list{margin:0;padding-inline-start:18px;color:#B91C1C;line-height:1.8;font-weight:900}.missing-box a{color:var(--sfm-primary-hover);font-weight:950;text-decoration:none}.package-actions{display:grid;gap:9px;margin-top:14px}.package-actions a{min-height:42px;border-radius:14px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);color:var(--sfm-midnight);text-decoration:none;display:flex;align-items:center;justify-content:center;font-weight:950}.funding-empty{background:var(--sfm-card);border:1px dashed rgba(29,140,255,.24);border-radius:22px;padding:28px;display:grid;place-items:center;text-align:center;color:var(--sfm-muted);gap:8px}.funding-empty svg{color:var(--sfm-primary)}
  .funding-directory-module{display:grid;gap:14px;min-width:0}.directory-header{background:linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-midnight) 58%,var(--sfm-card-dark) 145%);color:var(--sfm-card);border-radius:24px;padding:22px;display:flex;justify-content:space-between;gap:16px;align-items:center;min-width:0;overflow:hidden;box-shadow:0 18px 48px rgba(3,18,37,.16)}.directory-header h2{margin:12px 0 8px;font-size:clamp(26px,4vw,40px);font-weight:950}.directory-header p{margin:0;color:rgba(234,246,255,.74);line-height:1.7;font-weight:850}.directory-filters{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:20px;padding:14px;display:grid;grid-template-columns:minmax(220px,1.3fr) repeat(4,minmax(150px,1fr));gap:10px;min-width:0}.search-field{position:relative;min-width:0}.search-field svg{position:absolute;inset-inline-start:12px;top:50%;transform:translateY(-50%);color:var(--sfm-primary)}.search-field input{padding-inline-start:38px!important}.directory-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.34fr);gap:16px;align-items:start;min-width:0}.directory-main,.directory-side{min-width:0}.directory-side{position:sticky;top:18px}.directory-empty{min-height:240px;display:grid;place-items:center;text-align:center;gap:8px;border:1px dashed rgba(29,140,255,.24);background:var(--sfm-light-card);border-radius:18px;padding:24px;color:var(--sfm-muted)}.directory-empty strong{color:var(--sfm-midnight);font-size:18px}.directory-empty p{max-width:560px;margin:0;line-height:1.7;font-weight:850}.program-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}.program-card{border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:18px;padding:14px;display:grid;gap:12px;min-width:0}.program-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.program-card-head h3{margin:0;color:var(--sfm-midnight);font-size:18px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}.program-card-head p{margin:5px 0 0;color:var(--sfm-muted);font-size:12px;font-weight:900}.program-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.program-meta p{margin:0;border:1px solid rgba(29,140,255,.1);background:var(--sfm-card);border-radius:13px;padding:10px;min-width:0}.program-meta span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:950}.program-meta strong{display:block;margin-top:4px;color:var(--sfm-primary-dark);overflow-wrap:anywhere}.directory-warning,.funding-fit-box{border:1px solid rgba(154,94,13,.18);background:#FFF7ED;color:#7A4B09;border-radius:14px;padding:10px 12px;font-size:12px;font-weight:950;line-height:1.6}.directory-warning{display:flex;gap:7px;align-items:flex-start}.funding-fit-box{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:start}.funding-fit-box p{grid-column:1 / -1;margin:0;color:var(--sfm-muted)}.funding-fit-box span{color:var(--sfm-primary)}.program-actions{display:flex;gap:8px;flex-wrap:wrap}.program-actions button,.program-actions a,.compact-select select{min-height:38px;border-radius:12px;border:1px solid rgba(29,140,255,.16);background:var(--sfm-card);color:var(--sfm-midnight);padding:0 10px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:950 12px Tajawal,Arial,sans-serif;text-decoration:none;cursor:pointer}.program-actions button:not(:disabled){background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;border:0}.program-actions button:disabled{opacity:.6;cursor:not-allowed}.compact-select{display:grid;gap:4px}.compact-select span{font-size:10px;color:var(--sfm-muted);font-weight:950}.program-detail{display:grid;gap:8px;border-top:1px solid rgba(29,140,255,.12);padding-top:10px}.program-detail p{margin:0;display:grid;grid-template-columns:minmax(110px,.32fr) minmax(0,1fr);gap:8px;color:var(--sfm-midnight);font-weight:850;line-height:1.6}.program-detail b{color:var(--sfm-primary-hover)}.program-detail span{min-width:0;overflow-wrap:anywhere}.program-detail a{color:var(--sfm-primary-hover)}
  .jurisdiction-module{display:grid;gap:14px;min-width:0}.jurisdiction-header{background:linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 145%);color:var(--sfm-card);border-radius:24px;padding:22px;display:flex;justify-content:space-between;gap:16px;align-items:center;min-width:0;overflow:hidden;box-shadow:0 18px 48px rgba(3,18,37,.16)}.jurisdiction-header h2{margin:12px 0 8px;font-size:clamp(26px,4vw,40px);font-weight:950}.jurisdiction-header p{margin:0;color:rgba(234,246,255,.74);line-height:1.7;font-weight:850}.jurisdiction-stepper{display:flex;gap:8px;overflow-x:auto;padding:2px 1px 8px;scrollbar-width:thin}.jurisdiction-stepper button{flex:0 0 auto;min-height:42px;border-radius:999px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-muted);padding:0 12px;display:flex;align-items:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.jurisdiction-stepper button span{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover)}.jurisdiction-stepper button.active{background:var(--sfm-midnight);color:var(--sfm-soft-cyan)}.jurisdiction-stepper button.active span{background:var(--sfm-soft-cyan);color:var(--sfm-primary-dark)}.jurisdiction-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(310px,.5fr);gap:16px;align-items:start;min-width:0}.choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0}.choice-grid.wide{grid-column:1 / -1}.choice-pill{border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:15px;padding:11px;display:flex;align-items:center;gap:9px;color:var(--sfm-midnight);font-weight:950;min-width:0}.choice-pill input{accent-color:var(--sfm-primary)}.choice-pill span{min-width:0;overflow-wrap:anywhere}.wizard-controls{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.wizard-controls button,.primary-action,.secondary-action{border:0;border-radius:14px;min-height:42px;padding:0 13px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}.wizard-controls button,.primary-action{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.wizard-controls button:disabled,.primary-action:disabled,.secondary-action:disabled{opacity:.58;cursor:not-allowed}.secondary-action{width:100%;margin-top:10px;background:var(--sfm-light-card);color:var(--sfm-muted);border:1px solid rgba(29,140,255,.14)}.top-match-list{display:grid;gap:9px;margin-top:12px}.top-match-list div{display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px;min-width:0}.top-match-list strong,.top-match-list span{min-width:0;overflow-wrap:anywhere}.primary-action{width:100%;margin-top:12px}.jurisdiction-results{display:grid;gap:12px}.section-title-row{display:flex;justify-content:space-between;gap:12px;align-items:center}.section-title-row h3{margin:0;color:var(--sfm-midnight);font-size:22px;font-weight:950}.section-title-row span{border-radius:999px;background:#FFF7ED;color:#B45309;padding:7px 10px;font-size:12px;font-weight:950}.jurisdiction-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.jurisdiction-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:20px;padding:15px;box-shadow:0 14px 38px rgba(3,18,37,.06);min-width:0}.jurisdiction-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.jurisdiction-card-head h4{margin:0;color:var(--sfm-midnight);font-size:19px;font-weight:950}.jurisdiction-card-head small{display:block;margin-top:4px;color:var(--sfm-muted);font-weight:900}.jurisdiction-card-head strong{font-size:22px;color:var(--sfm-primary)}.jurisdiction-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.jurisdiction-columns div{border:1px solid rgba(29,140,255,.1);background:var(--sfm-light-card);border-radius:14px;padding:10px;min-width:0}.jurisdiction-columns b{display:block;color:var(--sfm-primary-hover);margin-bottom:6px}.jurisdiction-columns ul{margin:0;padding-inline-start:18px;color:var(--sfm-midnight);line-height:1.7;font-weight:850;overflow-wrap:anywhere}.comparison-card{min-width:0}.matrix-scroll{overflow-x:auto;max-width:100%;border-radius:15px;border:1px solid rgba(29,140,255,.12)}.matrix-scroll table{width:100%;min-width:760px;border-collapse:collapse;background:var(--sfm-light-card)}.matrix-scroll th,.matrix-scroll td{text-align:start;border-bottom:1px solid rgba(29,140,255,.1);padding:11px;color:var(--sfm-midnight);font-size:12px;line-height:1.5}.matrix-scroll th{color:var(--sfm-primary-hover);background:rgba(29,140,255,.10);font-weight:950}
  .strategic-documents-module{display:grid;gap:14px;min-width:0}.documents-header{background:linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-midnight) 62%,var(--sfm-card-dark) 140%);color:var(--sfm-card);border-radius:24px;padding:22px;display:flex;justify-content:space-between;gap:16px;align-items:center;min-width:0;overflow:hidden;box-shadow:0 18px 48px rgba(3,18,37,.14)}.documents-header h2{margin:12px 0 8px;font-size:clamp(26px,4vw,40px);font-weight:950}.documents-header p{margin:0;color:rgba(234,246,255,.72);line-height:1.7;font-weight:850}.documents-header .score-pill{background:rgba(234,246,255,.1);border-color:rgba(167,243,240,.2)}.documents-header .score-pill strong{color:var(--sfm-card)}.documents-header .score-pill span{color:var(--sfm-soft-cyan)}.documents-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.35fr);gap:16px;align-items:start;min-width:0}.documents-main{min-width:0}.document-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}.strategic-doc-card{border:1px solid rgba(29,140,255,.13);background:var(--sfm-light-card);border-radius:18px;padding:14px;display:grid;gap:11px;min-width:0}.doc-card-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}.doc-card-head svg{color:var(--sfm-primary)}.doc-card-head h3{margin:0 0 7px;color:var(--sfm-midnight);font-size:17px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}.strategic-doc-card p{margin:0;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.65}.doc-missing{border:1px dashed rgba(29,140,255,.24);background:var(--sfm-card);border-radius:14px;padding:10px;display:grid;gap:8px;min-width:0}.doc-missing strong{color:var(--sfm-primary-hover);font-size:12px}.doc-missing div{display:flex;flex-wrap:wrap;gap:7px}.doc-missing a,.inline-link{border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);text-decoration:none;font-size:11px;font-weight:950;padding:7px 9px}.doc-actions{display:flex;gap:8px;flex-wrap:wrap}.doc-actions a,.doc-actions button,.draft-actions button{border:0;border-radius:13px;min-height:38px;padding:0 11px;display:inline-flex;align-items:center;justify-content:center;background:var(--sfm-card);color:var(--sfm-midnight);border:1px solid rgba(29,140,255,.14);font:950 12px Tajawal,Arial,sans-serif;text-decoration:none;cursor:pointer}.doc-actions button:not(:disabled),.draft-actions button:not(:disabled){background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;border:0}.doc-actions button:disabled,.draft-actions button:disabled{opacity:.62;cursor:not-allowed}.documents-side{position:sticky;top:18px}.dd-list{display:grid;gap:9px}.dd-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px;min-width:0}.dd-row strong{font-size:13px;color:var(--sfm-midnight);overflow-wrap:anywhere}.dd-row small{font-size:11px;font-weight:950;color:var(--sfm-muted)}.document-vault-summary{display:grid;gap:10px;margin-top:14px}.document-vault-summary p{margin:0;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px}.document-vault-summary span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}.document-vault-summary strong{display:block;color:var(--sfm-primary-dark);font-size:19px}.category-list{display:grid;gap:7px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px}.category-list strong{font-size:13px}.category-list span{border-bottom:1px solid rgba(29,140,255,.08);padding-bottom:6px}.draft-preview{scroll-margin-top:24px}.draft-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.draft-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.draft-sections section{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:17px;padding:14px;min-width:0}.draft-sections h3{margin:0 0 8px;color:var(--sfm-midnight);font-size:16px;font-weight:950}.draft-sections ul{margin:0;padding-inline-start:18px;color:var(--sfm-midnight);line-height:1.75;font-weight:850;overflow-wrap:anywhere}
  .hub-grid{display:grid;gap:16px;min-width:0}.hub-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.wizard-layout{grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);align-items:start}.warm-card{padding:18px}.card-title{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.card-title svg{color:var(--sfm-primary);flex:0 0 auto}
  .check-list,.document-grid,.module-links{display:grid;gap:10px}.check-row,.document-link{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:11px;text-decoration:none;color:var(--sfm-primary-dark);min-width:0}.check-row strong,.document-link span{min-width:0;font-weight:950;overflow-wrap:anywhere}.check-row small,.document-link small{color:var(--sfm-muted);font-size:11px;font-weight:950}.done,.todo{width:28px;height:28px;border-radius:11px;display:grid;place-items:center}.done{background:#ECFDF5;color:#047857}.todo{background:#FEF2F2;color:#B91C1C}.document-link.disabled{opacity:.68;cursor:not-allowed}
  .copilot-panel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:16px;padding:14px}.copilot-panel span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}.copilot-panel strong{display:block;margin-top:5px;color:var(--sfm-primary-dark);overflow-wrap:anywhere}
  .wizard-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wizard-output{position:sticky;top:18px}.jurisdiction-summary{display:grid;gap:8px;margin:12px 0}.jurisdiction-summary p{margin:0;display:grid;grid-template-columns:minmax(120px,.42fr) minmax(0,1fr);gap:10px;border-bottom:1px solid rgba(29,140,255,.1);padding-bottom:8px}.jurisdiction-summary b{color:var(--sfm-muted)}.jurisdiction-summary span{font-weight:950;color:var(--sfm-primary-dark)}.plain-list,.missing-box ul{margin:12px 0 0;padding-inline-start:18px;color:var(--sfm-muted);line-height:1.8;font-weight:850}.missing-box{margin-top:12px;border:1px dashed rgba(29,140,255,.24);background:var(--sfm-light-card);border-radius:15px;padding:12px}.missing-box strong{color:var(--sfm-primary-hover)}.trusted-note{margin:12px 0 0;color:var(--sfm-muted);font-weight:900;line-height:1.7}
  .module-links{grid-template-columns:repeat(2,minmax(0,1fr))}.module-links a{background:var(--sfm-light-card);color:var(--sfm-midnight);border:1px solid rgba(29,140,255,.14);min-height:46px}.mini-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.mini-metrics p{margin:0;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px;min-width:0}.mini-metrics span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:950}.mini-metrics strong{display:block;margin-top:5px;color:var(--sfm-primary-dark);overflow-wrap:anywhere}
  a:focus-visible,button:focus-visible,select:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.18)}
  @media(max-width:1260px){.readiness-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.hub-grid.two,.wizard-layout,.funding-layout,.documents-layout,.jurisdiction-layout,.directory-layout{grid-template-columns:1fr}.wizard-output,.funding-side,.documents-side,.directory-side{position:static}.directory-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:1024px){.business-hub-main{width:100%;max-width:100%;margin-inline-start:0;margin-inline-end:0;padding:calc(84px + env(safe-area-inset-top)) 16px 24px}.business-hero{grid-template-columns:1fr}.hero-actions{justify-content:stretch}.hero-actions a,.hero-actions button{flex:1 1 180px}.selector-panel{grid-template-columns:1fr}.funding-header,.documents-header,.jurisdiction-header,.directory-header{display:grid}.funding-header .score-pill,.documents-header .score-pill{width:100%}.jurisdiction-header .status-badge,.directory-header .status-badge{width:max-content}.program-grid{grid-template-columns:1fr}}
  @media(max-width:720px){.topbar{align-items:flex-start}.business-hero{border-radius:22px}.hero-actions{display:grid}.hero-actions a,.hero-actions button{width:100%}.readiness-head{display:grid}.score-pill{width:100%}.readiness-grid,.wizard-form,.module-links,.mini-metrics,.planner-grid,.planner-totals,.document-card-grid,.draft-sections,.jurisdiction-cards,.jurisdiction-columns,.choice-grid,.directory-filters,.program-meta{grid-template-columns:1fr}.copilot-panel{grid-template-columns:1fr}.check-row,.document-link,.package-item,.dd-row{grid-template-columns:auto minmax(0,1fr)}.check-row small,.document-link small,.package-item small,.dd-row small{grid-column:2}.fund-row{grid-template-columns:1fr}.jurisdiction-summary p,.program-detail p{grid-template-columns:1fr}.section-title-row,.jurisdiction-card-head,.program-card-head{display:grid}.wizard-controls button,.program-actions button,.program-actions a{flex:1 1 140px}}
`;
