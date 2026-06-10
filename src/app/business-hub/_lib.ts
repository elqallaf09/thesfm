import { formatMoney } from '@/lib/formatMoney';

export type Lang = 'ar' | 'en' | 'fr';
export type BusinessHubTab = 'readiness' | 'funding' | 'jurisdiction' | 'documents' | 'directory' | 'copilot';
export type ReadinessStatus = 'not_ready' | 'needs_improvement' | 'good' | 'ready_for_review';
export type InvestorItemStatus = 'complete' | 'missing' | 'needs_review';
export type UseOfFundsKey = 'product' | 'marketing' | 'operations' | 'hiring' | 'licensesLegal' | 'emergencyReserve' | 'other';
export type UseOfFundsEntry = { amount: string; percent: string };

export type ProjectRow = Record<string, any> & {
  id: string;
  user_id?: string;
  name?: string | null;
  budget?: string | number | null;
  timeline?: string | null;
  notes?: Record<string, any> | string | null;
  created_at?: string | null;
};

export type ModuleRows = {
  feasibility: any[];
  financialModels: any[];
  tasks: any[];
  milestones: any[];
  documents: any[];
  pitchDecks: any[];
};

export type UseOfFundsState = Record<UseOfFundsKey, UseOfFundsEntry>;

export type FundingReadinessRow = {
  id?: string;
  funding_needed?: number | string | null;
  currency?: string | null;
  funding_type?: string | null;
  use_of_funds?: Record<string, unknown> | null;
  readiness_score?: number | string | null;
  checklist?: Record<string, unknown> | null;
  notes?: string | null;
};

export type FundingPlannerForm = {
  fundingNeeded: string;
  currency: string;
  fundingType: string;
  useOfFunds: UseOfFundsState;
  notes: string;
};
export type InvestorPackageItem = { key: string; label: string; status: InvestorItemStatus; href: string };
export type StrategicDocumentStatus = 'ready' | 'needs_data' | 'unavailable' | 'in_progress';
export type StrategicDocumentKey =
  | 'businessPlan'
  | 'pitchDeck'
  | 'financialModel'
  | 'feasibilityStudy'
  | 'investmentMemo'
  | 'dueDiligencePack'
  | 'executiveSummary'
  | 'launchPlan90';
export type StrategicMissingAction = { label: string; href: string };
export type StrategicDocumentItem = {
  key: StrategicDocumentKey;
  title: string;
  status: StrategicDocumentStatus;
  href: string;
  description: string;
  missing: StrategicMissingAction[];
};
export type DraftSection = { title: string; lines: string[]; missing?: string[] };
export type DocumentDraft = { type: 'businessPlan' | 'executiveSummary' | 'investmentMemo'; title: string; source: 'rules'; sections: DraftSection[] };
export type JurisdictionWizardState = {
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
export type JurisdictionAssessmentRow = {
  id?: string;
  inputs?: Record<string, unknown> | null;
  results?: Record<string, unknown> | null;
  recommended_jurisdictions?: unknown[] | null;
  status?: string | null;
};
export type JurisdictionResult = {
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
export type FundingProgramRow = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  name_fr?: string | null;
  funding_type?: string | null;
  country?: string | null;
  region?: string | null;
  provider_name?: string | null;
  provider_type?: string | null;
  website_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  description_fr?: string | null;
  eligibility_summary_ar?: string | null;
  eligibility_summary_en?: string | null;
  eligibility_summary_fr?: string | null;
  eligibility_requirements?: unknown;
  required_documents?: unknown;
  typical_ticket_min?: string | number | null;
  typical_ticket_max?: string | number | null;
  min_amount?: string | number | null;
  max_amount?: string | number | null;
  currency?: string | null;
  application_url?: string | null;
  official_url?: string | null;
  application_deadline?: string | null;
  data_status?: string | null;
  data_source_url?: string | null;
  is_verified?: boolean | null;
  source_name?: string | null;
  business_activity?: string | null;
  required_readiness_score?: string | number | null;
  notes?: string | null;
};
export type FundingProgramImportForm = {
  nameAr: string;
  nameEn: string;
  country: string;
  fundingType: string;
  providerType: string;
  currency: string;
  minAmount: string;
  maxAmount: string;
  sourceName: string;
  officialUrl: string;
  businessActivity: string;
  eligibilityRequirements: string;
  requiredDocuments: string;
  isVerified: boolean;
};
export type FundingShortlistRow = {
  id: string;
  user_id: string;
  project_id: string;
  funding_program_id?: string | null;
  status?: string | null;
  notes?: string | null;
};
export type FundingDirectoryFilters = {
  search: string;
  country: string;
  fundingType: string;
  dataStatus: string;
  currency: string;
};

export const EMPTY_MODULES: ModuleRows = {
  feasibility: [],
  financialModels: [],
  tasks: [],
  milestones: [],
  documents: [],
  pitchDecks: [],
};

export const TEXT = {
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

export const STRATEGIC_TEXT = {
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

export const JURISDICTION_TEXT = {
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
    nextSteps: 'الخطوات التالية',
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
    nextSteps: 'Next steps',
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
    nextSteps: 'Prochaines étapes',
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

export const FUNDING_DIRECTORY_TEXT = {
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
    noFundingProgramsDescription: 'لا توجد مصادر تمويل رسمية مربوطة حالياً. أضف برنامجاً موثقاً من الإدارة أو ابحث في المصادر الرسمية قبل عرض أي جهة للمستخدمين.',
    addFundingProgram: 'إضافة برنامج تمويل',
    fundingProgramEnglishName: 'اسم البرنامج بالإنجليزية',
    searchOfficialSources: 'البحث في المصادر الرسمية',
    fundingCategories: 'فئات تمويل يمكن إضافتها',
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
    projectNotReadyToApply: 'مشروعك غير جاهز للتقديم حالياً',
    missingProjectRequirements: 'المتطلبات الناقصة',
    adminImportTitle: 'إضافة برنامج تمويل رسمي',
    adminImportDescription: 'أدخل برنامجاً موثقاً يدوياً من مصدر رسمي. لن يتم عرض أي مزود غير محفوظ في قاعدة البيانات.',
    sourceName: 'اسم المصدر أو الجهة',
    officialUrl: 'الرابط الرسمي',
    providerType: 'نوع الجهة',
    businessActivity: 'النشاط المناسب',
    minAmount: 'أقل مبلغ',
    maxAmount: 'أعلى مبلغ',
    eligibilityRequirementsInput: 'متطلبات الأهلية',
    requiredDocumentsInput: 'المستندات المطلوبة',
    markAsVerified: 'موثق من مصدر رسمي',
    fundingProgramSaved: 'تمت إضافة برنامج التمويل.',
    fundingProgramSaveError: 'تعذر إضافة برنامج التمويل حالياً.',
    selfFunding: 'تمويل ذاتي',
    smeFinancing: 'تمويل المشاريع الصغيرة والمتوسطة',
    governmentSupport: 'دعم حكومي',
    startupGrant: 'منح الشركات الناشئة',
    investorFunding: 'تمويل المستثمرين',
    revenueBasedFinancing: 'تمويل مبني على الإيرادات',
    crowdfunding: 'تمويل جماعي',
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
    noFundingProgramsDescription: 'No official funding sources are connected yet. Add a verified program from the admin/import section or research official sources before showing providers to users.',
    addFundingProgram: 'Add funding program',
    fundingProgramEnglishName: 'Program name in English',
    searchOfficialSources: 'Search official sources',
    fundingCategories: 'Funding categories to add',
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
    projectNotReadyToApply: 'Your project is not ready to apply yet',
    missingProjectRequirements: 'Missing project requirements',
    adminImportTitle: 'Add official funding program',
    adminImportDescription: 'Enter a manually verified program from an official source. No provider appears unless it is stored in the database.',
    sourceName: 'Source or provider name',
    officialUrl: 'Official URL',
    providerType: 'Provider type',
    businessActivity: 'Suitable activity',
    minAmount: 'Minimum amount',
    maxAmount: 'Maximum amount',
    eligibilityRequirementsInput: 'Eligibility requirements',
    requiredDocumentsInput: 'Required documents',
    markAsVerified: 'Verified from official source',
    fundingProgramSaved: 'Funding program added.',
    fundingProgramSaveError: 'Could not add the funding program right now.',
    selfFunding: 'Self-funding',
    smeFinancing: 'SME financing',
    governmentSupport: 'Government support',
    startupGrant: 'Startup grants',
    investorFunding: 'Investor funding',
    revenueBasedFinancing: 'Revenue-based financing',
    crowdfunding: 'Crowdfunding',
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
    noFundingProgramsDescription: 'Aucune source de financement officielle n’est connectée pour le moment. Ajoutez un programme vérifié depuis l’import admin ou recherchez les sources officielles avant d’afficher des fournisseurs.',
    addFundingProgram: 'Ajouter un programme',
    fundingProgramEnglishName: 'Nom du programme en anglais',
    searchOfficialSources: 'Rechercher les sources officielles',
    fundingCategories: 'Catégories de financement à ajouter',
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
    projectNotReadyToApply: 'Votre projet n’est pas encore prêt à candidater',
    missingProjectRequirements: 'Exigences manquantes du projet',
    adminImportTitle: 'Ajouter un programme officiel',
    adminImportDescription: 'Saisissez un programme vérifié manuellement depuis une source officielle. Aucun fournisseur n’apparaît s’il n’est pas enregistré en base.',
    sourceName: 'Source ou fournisseur',
    officialUrl: 'URL officielle',
    providerType: 'Type de fournisseur',
    businessActivity: 'Activité adaptée',
    minAmount: 'Montant minimum',
    maxAmount: 'Montant maximum',
    eligibilityRequirementsInput: 'Critères d’éligibilité',
    requiredDocumentsInput: 'Documents requis',
    markAsVerified: 'Vérifié depuis une source officielle',
    fundingProgramSaved: 'Programme de financement ajouté.',
    fundingProgramSaveError: 'Impossible d’ajouter le programme pour le moment.',
    selfFunding: 'Autofinancement',
    smeFinancing: 'Financement PME',
    governmentSupport: 'Soutien gouvernemental',
    startupGrant: 'Subventions startup',
    investorFunding: 'Financement investisseurs',
    revenueBasedFinancing: 'Financement basé sur les revenus',
    crowdfunding: 'Financement participatif',
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

export const COUNTRIES = [
  { value: 'kuwait', label: { ar: 'الكويت', en: 'Kuwait', fr: 'Koweït' } },
  { value: 'saudi-arabia', label: { ar: 'السعودية', en: 'Saudi Arabia', fr: 'Arabie saoudite' } },
  { value: 'uae', label: { ar: 'الإمارات', en: 'UAE', fr: 'EAU' } },
  { value: 'qatar', label: { ar: 'قطر', en: 'Qatar', fr: 'Qatar' } },
  { value: 'bahrain', label: { ar: 'البحرين', en: 'Bahrain', fr: 'Bahreïn' } },
  { value: 'oman', label: { ar: 'عُمان', en: 'Oman', fr: 'Oman' } },
  { value: 'global-other', label: { ar: 'عالمي / أخرى', en: 'Global / Other', fr: 'Global / Autre' } },
];

export const BUSINESS_TYPES = [
  { value: 'ecommerce', label: { ar: 'متجر إلكتروني', en: 'E-commerce', fr: 'E-commerce' } },
  { value: 'restaurant', label: { ar: 'مطعم / كافيه', en: 'Restaurant / Cafe', fr: 'Restaurant / Café' } },
  { value: 'services', label: { ar: 'خدمات', en: 'Services', fr: 'Services' } },
  { value: 'saas', label: { ar: 'SaaS / تطبيق', en: 'SaaS / App', fr: 'SaaS / Application' } },
  { value: 'trading', label: { ar: 'تجارة عامة', en: 'General Trading', fr: 'Commerce général' } },
  { value: 'real-estate', label: { ar: 'عقار', en: 'Real Estate', fr: 'Immobilier' } },
  { value: 'other', label: { ar: 'مشروع آخر', en: 'Other Project', fr: 'Autre projet' } },
];

export const FUNDING_TYPES = [
  { value: 'self_funded', labelKey: 'selfFunded' },
  { value: 'bank_loan', labelKey: 'bankLoan' },
  { value: 'investor_partner', labelKey: 'investorPartner' },
  { value: 'government_fund', labelKey: 'governmentFund' },
  { value: 'angel_investor', labelKey: 'angelInvestor' },
  { value: 'venture_capital', labelKey: 'ventureCapital' },
  { value: 'islamic_finance', labelKey: 'islamicFinance' },
] as const;

export const FUNDING_PROGRAM_TYPES = [
  { value: 'bank_loan', labelKey: 'bankLoanDirectory' },
  { value: 'sme_financing', labelKey: 'smeFinancing' },
  { value: 'government_support', labelKey: 'governmentSupport' },
  { value: 'startup_grant', labelKey: 'startupGrant' },
  { value: 'investor_funding', labelKey: 'investorFunding' },
  { value: 'revenue_based_financing', labelKey: 'revenueBasedFinancing' },
  { value: 'crowdfunding', labelKey: 'crowdfunding' },
  { value: 'self_funding', labelKey: 'selfFunding' },
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

export const FUNDING_DATA_STATUSES = [
  { value: 'verified', labelKey: 'verified' },
  { value: 'pending_review', labelKey: 'pendingReview' },
  { value: 'unverified', labelKey: 'unverified' },
  { value: 'outdated', labelKey: 'outdated' },
] as const;

export const SHORTLIST_STATUSES = [
  { value: 'saved', labelKey: 'saved' },
  { value: 'reviewing', labelKey: 'reviewing' },
  { value: 'preparing', labelKey: 'preparing' },
  { value: 'applied', labelKey: 'applied' },
  { value: 'rejected', labelKey: 'rejected' },
  { value: 'accepted', labelKey: 'accepted' },
  { value: 'archived', labelKey: 'archived' },
] as const;

export const emptyFundingDirectoryFilters: FundingDirectoryFilters = {
  search: '',
  country: '',
  fundingType: '',
  dataStatus: '',
  currency: '',
};

export const emptyFundingProgramImportForm: FundingProgramImportForm = {
  nameAr: '',
  nameEn: '',
  country: '',
  fundingType: 'bank_loan',
  providerType: '',
  currency: 'KWD',
  minAmount: '',
  maxAmount: '',
  sourceName: '',
  officialUrl: '',
  businessActivity: '',
  eligibilityRequirements: '',
  requiredDocuments: '',
  isVerified: false,
};

export const USE_OF_FUNDS_KEYS: UseOfFundsKey[] = [
  'product',
  'marketing',
  'operations',
  'hiring',
  'licensesLegal',
  'emergencyReserve',
  'other',
];

export const DELIVERY_MODELS = [
  { value: 'digital', labelKey: 'digital' },
  { value: 'physical', labelKey: 'physical' },
  { value: 'hybrid', labelKey: 'hybrid' },
] as const;

export const TARGET_CUSTOMER_OPTIONS = [
  { value: 'b2c', labelKey: 'individuals' },
  { value: 'b2b', labelKey: 'companies' },
  { value: 'government', labelKey: 'governmentCustomers' },
  { value: 'international', labelKey: 'internationalCustomers' },
  { value: 'gcc', labelKey: 'gccCustomers' },
] as const;

export const OPERATIONAL_NEED_OPTIONS = [
  { value: 'physical_office', labelKey: 'physicalOffice' },
  { value: 'warehouse', labelKey: 'warehouse' },
  { value: 'employees', labelKey: 'employeesNeed' },
  { value: 'foreign_hiring', labelKey: 'foreignHiring' },
  { value: 'payment_gateway', labelKey: 'paymentGateway' },
  { value: 'import_export', labelKey: 'importExport' },
  { value: 'licenses', labelKey: 'licensesNeed' },
  { value: 'investor_friendly', labelKey: 'investorFriendly' },
] as const;

export const FUNDING_GOAL_OPTIONS = [
  { value: 'investors', labelKey: 'wantsInvestors' },
  { value: 'bank_loan', labelKey: 'wantsBankLoan' },
  { value: 'government_support', labelKey: 'wantsGovernmentSupport' },
  { value: 'islamic_finance', labelKey: 'wantsIslamicFinance' },
] as const;

export const EXPANSION_OPTIONS = [
  { value: 'local_only', labelKey: 'localOnly' },
  { value: 'gcc', labelKey: 'gccExpansionPlan' },
  { value: 'mena', labelKey: 'menaExpansion' },
  { value: 'global', labelKey: 'globalExpansion' },
  { value: 'cross_border', labelKey: 'crossBorderEcommerce' },
] as const;

export const JURISDICTION_STEPS = [
  'selectProjectStep',
  'businessActivity',
  'targetCustomersStep',
  'operationalNeeds',
  'capitalFunding',
  'expansionPlan',
] as const;

export const OFFICIAL_VERIFICATION_KEYS = [
  'requiredLicenseType',
  'corporateTaxFees',
  'foreignOwnership',
  'officeAddress',
  'hiringVisa',
  'businessActivityRequirements',
  'paymentGatewayRequirements',
  'importExportRequirements',
] as const;

export const initialWizard: JurisdictionWizardState = {
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

export const emptyUseOfFunds = (): UseOfFundsState => ({
  product: { amount: '', percent: '' },
  marketing: { amount: '', percent: '' },
  operations: { amount: '', percent: '' },
  hiring: { amount: '', percent: '' },
  licensesLegal: { amount: '', percent: '' },
  emergencyReserve: { amount: '', percent: '' },
  other: { amount: '', percent: '' },
});

export const emptyFundingForm = (currency = 'KWD'): FundingPlannerForm => ({
  fundingNeeded: '',
  currency,
  fundingType: '',
  useOfFunds: emptyUseOfFunds(),
  notes: '',
});

export function toRecord(value: unknown): Record<string, any> {
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

export function firstText(row: Record<string, any> | null | undefined, keys: string[], fallback = '') {
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

export function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function hasObjectData(value: unknown) {
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

export function moduleExists(rows: any[], fields: string[] = []) {
  if (!rows.length) return false;
  if (!fields.length) return true;
  return rows.some(row => fields.some(field => hasObjectData(row?.[field])));
}

export function completionStatus(score: number): ReadinessStatus {
  if (score >= 85) return 'ready_for_review';
  if (score >= 65) return 'good';
  if (score >= 35) return 'needs_improvement';
  return 'not_ready';
}

export function statusClass(status: ReadinessStatus) {
  return status.replaceAll('_', '-');
}

export function statusLabel(status: ReadinessStatus, text: typeof TEXT[Lang]) {
  if (status === 'ready_for_review') return text.readyForReview;
  if (status === 'needs_improvement') return text.needsImprovement;
  if (status === 'good') return text.good;
  return text.notReady;
}

export function investorStatusLabel(status: InvestorItemStatus, text: typeof TEXT[Lang]) {
  if (status === 'complete') return text.complete;
  if (status === 'needs_review') return text.needsReviewItem;
  return text.missingItem;
}

export function percent(value: number, lang: Lang) {
  return `${new Intl.NumberFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 0 }).format(value)}%`;
}

export function selectedLabel(options: Array<{ value: string; label: Record<Lang, string> }>, value: string, lang: Lang) {
  return options.find(item => item.value === value)?.label[lang] ?? '';
}

export function normalizeWizard(value: unknown): JurisdictionWizardState {
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

export function optionLabel(options: ReadonlyArray<{ value: string; labelKey: string }>, value: string, text: Record<string, string>) {
  const item = options.find(option => option.value === value);
  return item ? text[item.labelKey] : '';
}

export function checkboxLabels(options: ReadonlyArray<{ value: string; labelKey: string }>, values: string[], text: Record<string, string>) {
  return values.map(value => optionLabel(options, value, text)).filter(Boolean);
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildJurisdictionResults(wizard: JurisdictionWizardState, text: Record<string, string>, lang: Lang): JurisdictionResult[] {
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

export function fundingProgramLabel(program: FundingProgramRow, lang: Lang) {
  if (lang === 'fr') return program.name_fr || program.name_en || program.name_ar;
  if (lang === 'en') return program.name_en || program.name_ar;
  return program.name_ar || program.name_en || '';
}

export function fundingProgramDescription(program: FundingProgramRow, lang: Lang) {
  if (lang === 'fr') return program.description_fr || program.description_en || program.description_ar || '';
  if (lang === 'en') return program.description_en || program.description_ar || '';
  return program.description_ar || program.description_en || '';
}

export function fundingProgramEligibility(program: FundingProgramRow, lang: Lang) {
  if (lang === 'fr') return program.eligibility_summary_fr || program.eligibility_summary_en || program.eligibility_summary_ar || '';
  if (lang === 'en') return program.eligibility_summary_en || program.eligibility_summary_ar || '';
  return program.eligibility_summary_ar || program.eligibility_summary_en || '';
}

export function fundingArrayText(value: unknown) {
  if (Array.isArray(value)) return value.map(item => String(item ?? '').trim()).filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).map(item => String(item ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/\r?\n|;/).map(item => item.trim()).filter(Boolean);
  return [];
}

export function fundingProgramRequirements(program: FundingProgramRow, lang: Lang) {
  const structured = fundingArrayText(program.eligibility_requirements);
  if (structured.length) return structured.join(' · ');
  return fundingProgramEligibility(program, lang);
}

export function fundingProgramDocuments(program: FundingProgramRow) {
  return fundingArrayText(program.required_documents);
}

export function fundingProgramSource(program: FundingProgramRow, text: Record<string, string>) {
  return program.source_name || program.provider_name || program.provider_type || text.officialVerificationRequired;
}

export function fundingProgramOfficialUrl(program: FundingProgramRow) {
  return program.official_url || program.application_url || program.website_url || program.data_source_url || '';
}

export function fundingProgramDataStatus(program: FundingProgramRow) {
  if (program.is_verified === true) return 'verified';
  if (program.is_verified === false) return 'unverified';
  return program.data_status || 'unverified';
}

export function fundingProgramTypeLabel(value: string | null | undefined, text: Record<string, string>) {
  return optionLabel(FUNDING_PROGRAM_TYPES, value || 'other', text) || text.other;
}

export function fundingDataStatusLabel(value: string | null | undefined, text: Record<string, string>) {
  return optionLabel(FUNDING_DATA_STATUSES, value || 'unverified', text) || text.unverified;
}

export function shortlistStatusLabel(value: string | null | undefined, text: Record<string, string>) {
  return optionLabel(SHORTLIST_STATUSES, value || 'saved', text) || text.saved;
}

export function fundingDataStatusClass(value: string | null | undefined) {
  if (value === 'verified') return 'ready-for-review';
  if (value === 'pending_review') return 'needs-improvement';
  return 'not-ready';
}

export function normalizedFundingPreference(value?: string | null) {
  if (value === 'self_funded') return 'self_funding';
  if (value === 'angel_investor') return 'angel';
  if (value === 'investor_partner') return 'strategic_partner';
  if (value === 'government_fund') return 'government_support';
  if (value === 'grant') return 'startup_grant';
  return value || '';
}

export function fundingTicketText(program: FundingProgramRow, text: Record<string, string>, lang: Lang) {
  const min = toNumber(program.min_amount) ?? toNumber(program.typical_ticket_min);
  const max = toNumber(program.max_amount) ?? toNumber(program.typical_ticket_max);
  const currency = program.currency || 'KWD';
  if (min !== null && max !== null) return `${formatMoney(min, currency, lang)} - ${formatMoney(max, currency, lang)}`;
  if (min !== null) return formatMoney(min, currency, lang);
  if (max !== null) return formatMoney(max, currency, lang);
  return text.insufficient;
}

export function programMatchesSearch(program: FundingProgramRow, search: string, lang: Lang) {
  const value = search.trim().toLowerCase();
  if (!value) return true;
  const fields = [
    fundingProgramLabel(program, lang),
    program.provider_name,
    program.provider_type,
    program.source_name,
    program.country,
    program.region,
    program.business_activity,
    fundingProgramDescription(program, lang),
    fundingProgramRequirements(program, lang),
  ];
  return fields.some(field => String(field ?? '').toLowerCase().includes(value));
}

export function filterFundingPrograms(programs: FundingProgramRow[], filters: FundingDirectoryFilters, lang: Lang) {
  return programs.filter(program => {
    if (!programMatchesSearch(program, filters.search, lang)) return false;
    if (filters.country && program.country !== filters.country) return false;
    if (filters.fundingType && program.funding_type !== filters.fundingType) return false;
    if (filters.dataStatus && fundingProgramDataStatus(program) !== filters.dataStatus) return false;
    if (filters.currency && (program.currency || 'KWD') !== filters.currency) return false;
    return true;
  });
}

export function buildFundingFit(
  program: FundingProgramRow,
  selectedProject: ProjectRow | null,
  readiness: any,
  fundingRecord: FundingReadinessRow | null,
  checklist: Array<{ label: string; status: InvestorItemStatus }>,
  text: Record<string, string>,
) {
  if (!selectedProject || !readiness) {
    return { score: null as number | null, notes: [text.noProjectForShortlist], missing: [] as string[], projectReady: false, confirmed: false };
  }

  const notes: string[] = [];
  let score = 0;
  const projectCountry = firstText(selectedProject, ['country', 'target_market', 'market', 'location'], '');
  if (projectCountry && program.country && projectCountry.toLowerCase() === String(program.country).toLowerCase()) {
    score += 20;
  } else if (!projectCountry || !program.country) {
    notes.push(text.officialVerificationRequired);
  }

  const projectActivity = firstText(selectedProject, ['category', 'type', 'project_type', 'business_type', 'industry'], '').toLowerCase();
  const programActivity = String(program.business_activity || '').toLowerCase();
  if (projectActivity && programActivity) {
    score += projectActivity.includes(programActivity) || programActivity.includes(projectActivity) ? 15 : 5;
  } else if (!programActivity) {
    score += 6;
  }

  const preferredFundingType = normalizedFundingPreference(fundingRecord?.funding_type);
  if (preferredFundingType && preferredFundingType === program.funding_type) {
    score += 20;
  } else if (!preferredFundingType) {
    notes.push(text.targetFundingType);
  } else if (
    preferredFundingType === 'strategic_partner' &&
    (program.funding_type === 'investor_funding' || program.funding_type === 'venture_capital' || program.funding_type === 'angel')
  ) {
    score += 14;
  }

  const fundingNeeded = toNumber(fundingRecord?.funding_needed) ?? readiness.capitalAmount ?? null;
  const min = toNumber(program.min_amount) ?? toNumber(program.typical_ticket_min);
  const max = toNumber(program.max_amount) ?? toNumber(program.typical_ticket_max);
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

  const requiredReadiness = toNumber(program.required_readiness_score) ?? 70;
  const readinessScore = toNumber(readiness.fundingScore) ?? toNumber(readiness.score) ?? 0;
  const missing = checklist.filter(item => item.status !== 'complete').map(item => item.label);
  const projectReady = readinessScore >= requiredReadiness && missing.length === 0;
  if (readinessScore < requiredReadiness || missing.length > 0) {
    notes.push(text.projectNotReadyToApply);
  } else {
    score += 10;
  }

  const confirmed = fundingProgramDataStatus(program) === 'verified' && notes.length === 0;
  if (!confirmed) notes.unshift(text.fitCannotBeConfirmed);
  return { score: clampScore(score), notes: Array.from(new Set(notes)).slice(0, 4), missing, projectReady, confirmed };
}

export function buildFundingApplicationChecklist(readiness: any, modules: ModuleRows, fundingRecord: FundingReadinessRow | null, text: Record<string, string>) {
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

export function fundingRowToForm(row: FundingReadinessRow | null, fallbackCurrency: string): FundingPlannerForm {
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

export function calculateUseOfFundsTotals(form: FundingPlannerForm) {
  const fundingNeeded = toNumber(form.fundingNeeded) ?? 0;
  const amountTotal = USE_OF_FUNDS_KEYS.reduce((sum, key) => sum + (toNumber(form.useOfFunds[key].amount) ?? 0), 0);
  const percentTotal = USE_OF_FUNDS_KEYS.reduce((sum, key) => sum + (toNumber(form.useOfFunds[key].percent) ?? 0), 0);
  const hasAny = fundingNeeded > 0 || amountTotal > 0 || percentTotal > 0;
  const amountMatches = fundingNeeded > 0 && Math.abs(amountTotal - fundingNeeded) < 0.01;
  const percentMatches = Math.abs(percentTotal - 100) < 0.01;
  return { fundingNeeded, amountTotal, percentTotal, amountMatches, percentMatches, hasAny };
}

export function getUseOfFundsStatusFromTotals(totals: ReturnType<typeof calculateUseOfFundsTotals>): InvestorItemStatus {
  if (totals.fundingNeeded > 0 && totals.amountMatches && totals.percentMatches) return 'complete';
  if (totals.hasAny) return 'needs_review';
  return 'missing';
}

export function feasibilitySectionCount(row?: any) {
  if (!row) return 0;
  return ['market_data', 'technical_data', 'financial_data', 'legal_data'].filter(key => hasObjectData(row[key])).length;
}

export function documentHasCategory(documents: any[], categories: string[]) {
  return documents.some(document => categories.includes(String(document?.category ?? '').toLowerCase()));
}

export function maybeDocumentStatus(documents: any[], categories: string[]): InvestorItemStatus {
  if (documentHasCategory(documents, categories)) return 'complete';
  return documents.length > 0 ? 'needs_review' : 'missing';
}

export function getFinancialPayback(financialModelRow: any): number | null {
  const kpis = toRecord(financialModelRow?.kpis);
  for (const key of ['paybackPeriod', 'payback_period', 'paybackMonths', 'payback_months']) {
    const value = toNumber(kpis[key]);
    if (value !== null) return value;
  }
  return null;
}

export function buildInvestorPackageItems({
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

export function buildFundingWarnings({
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

export function strategicStatusLabel(status: StrategicDocumentStatus, text: Record<string, string>) {
  if (status === 'ready') return text.readyDocument;
  if (status === 'in_progress') return text.inProgress;
  if (status === 'unavailable') return text.currentlyUnavailable;
  return text.needsData;
}

export function strategicStatusClass(status: StrategicDocumentStatus) {
  if (status === 'ready') return 'ready-for-review';
  if (status === 'in_progress') return 'needs-improvement';
  if (status === 'unavailable') return 'not-ready';
  return 'not-ready';
}

export function missingAction(label: string, href: string): StrategicMissingAction {
  return { label, href };
}

export function addIfMissing(actions: StrategicMissingAction[], condition: boolean, label: string, href: string) {
  if (!condition) actions.push(missingAction(label, href));
}

export function hasFundingPlan(fundingRecord: FundingReadinessRow | null, useOfFundsStatus?: InvestorItemStatus) {
  return Boolean(fundingRecord?.id) || useOfFundsStatus === 'complete';
}

export function buildStrategicDocumentItems({
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

export function buildDueDiligenceItems(modules: ModuleRows, readiness: any, text: Record<string, string>) {
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

export function groupedDocumentCounts(documents: any[]) {
  return documents.reduce<Record<string, number>>((acc, document) => {
    const category = String(document?.category || 'other');
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});
}

export function getValueOrMissing(value: unknown, text: Record<string, string>) {
  if (value === null || value === undefined || value === '') return text.incompleteInfo;
  return String(value);
}

export function financialKpiLine(label: string, value: unknown, text: Record<string, string>, currency?: string, locale?: Lang) {
  const numeric = toNumber(value);
  if (numeric !== null && currency && locale) return `${label}: ${formatMoney(numeric, currency, locale)}`;
  return `${label}: ${getValueOrMissing(value, text)}`;
}

export function buildDocumentDraft({
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

export function normalizeBusinessHubTab(value: string | null | undefined): BusinessHubTab | null {
  const normalized = String(value ?? '').replace(/^#/, '').trim().toLowerCase();
  if (!normalized) return null;
  if (['readiness', 'business-readiness'].includes(normalized)) return 'readiness';
  if (['funding', 'funding-readiness', 'use-of-funds'].includes(normalized)) return 'funding';
  if (['jurisdiction', 'jurisdiction-wizard'].includes(normalized)) return 'jurisdiction';
  if (['documents', 'strategic-documents', 'pitch-decks', 'investment-offers', 'investor-package'].includes(normalized)) return 'documents';
  if (['directory', 'funding-directory'].includes(normalized)) return 'directory';
  if (['copilot', 'business-copilot', 'ai'].includes(normalized)) return 'copilot';
  return null;
}

