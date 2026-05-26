export type SmartTaskLang = 'ar' | 'en' | 'fr';
export type SmartTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SmartTaskStatus = 'open' | 'done' | 'dismissed';

export type SmartTask = {
  id: string;
  title: string;
  description?: string;
  sourceModule: string;
  sourceId?: string;
  priority: SmartTaskPriority;
  status: SmartTaskStatus;
  dueDate?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
};

export type SmartTaskProfile = {
  id?: string | null;
  display_name?: string | null;
  default_currency?: string | null;
  onboarding_completed?: boolean | null;
};

export type SmartTaskSourceData = {
  income?: any[];
  expenses?: any[];
  goals?: any[];
  savings?: any[];
  investments?: any[];
  marketWatchlist?: any[];
  marketPriceAlerts?: any[];
  projects?: any[];
  feasibilityStudies?: any[];
  financialModels?: any[];
  projectTasks?: any[];
  projectMilestones?: any[];
  projectDocuments?: any[];
  pitchDecks?: any[];
  fundingReadiness?: any[];
  jurisdictionAssessments?: any[];
  zakatCalculations?: any[];
  zakatAssets?: any[];
  charityProjects?: any[];
  charityReminders?: any[];
  charityBeneficiaries?: any[];
  charityContributors?: any[];
  charityCommitments?: any[];
  charityDocuments?: any[];
  notifications?: any[];
};

type Copy = {
  open: string;
  profileTitle: string;
  profileDescription: string;
  currencyTitle: string;
  currencyDescription: string;
  onboardingTitle: string;
  onboardingDescription: string;
  incomeTitle: string;
  incomeDescription: string;
  expenseTitle: string;
  expenseDescription: string;
  goalTitle: string;
  goalDescription: string;
  savingTitle: string;
  savingDescription: string;
  lateIncomeTitle: string;
  lateIncomeDescription: (name: string) => string;
  dueIncomeTitle: string;
  dueIncomeDescription: (name: string) => string;
  pendingIncomeTitle: string;
  pendingIncomeDescription: (name: string) => string;
  categorizeExpenseTitle: string;
  categorizeExpenseDescription: (count: number) => string;
  receiptFailedTitle: string;
  receiptFailedDescription: string;
  spendingTitle: string;
  spendingDescription: string;
  goalAmountTitle: string;
  goalAmountDescription: (name: string) => string;
  goalBehindTitle: string;
  goalBehindDescription: (name: string) => string;
  goalDueTitle: string;
  goalDueDescription: (name: string) => string;
  goalCompleteTitle: string;
  goalCompleteDescription: (name: string) => string;
  symbolTitle: string;
  symbolDescription: (name: string) => string;
  marketAlertTitle: string;
  marketAlertDescription: (symbol: string) => string;
  feasibilityTitle: string;
  feasibilityDescription: (name: string) => string;
  financialModelTitle: string;
  financialModelDescription: (name: string) => string;
  projectTaskTitle: string;
  projectTaskDescription: (name: string) => string;
  overdueTaskTitle: string;
  overdueTaskDescription: (name: string) => string;
  milestoneTitle: string;
  milestoneDescription: (name: string) => string;
  documentTitle: string;
  documentDescription: (name: string) => string;
  pitchDeckTitle: string;
  pitchDeckDescription: (name: string) => string;
  fundingTitle: string;
  fundingDescription: (name: string) => string;
  useFundsTitle: string;
  useFundsDescription: (name: string) => string;
  jurisdictionTitle: string;
  jurisdictionDescription: (name: string) => string;
  strategicDocsTitle: string;
  strategicDocsDescription: (name: string) => string;
  zakatAssetsTitle: string;
  zakatAssetsDescription: string;
  zakatCalculationTitle: string;
  zakatCalculationDescription: string;
  zakatDueTitle: string;
  zakatDueDescription: (name: string) => string;
  charitySetupTitle: string;
  charitySetupDescription: (name: string) => string;
  charityReminderTitle: string;
  charityReminderDescription: (name: string) => string;
  beneficiaryTitle: string;
  beneficiaryDescription: (name: string) => string;
  contributorTitle: string;
  contributorDescription: (name: string) => string;
  charityCommitmentTitle: string;
  charityCommitmentDescription: (name: string) => string;
  charityDocumentTitle: string;
  charityDocumentDescription: (name: string) => string;
  reportNeedsDataTitle: string;
  reportNeedsDataDescription: string;
  reportReadyTitle: string;
  reportReadyDescription: string;
  notificationTitle: string;
  notificationDescription: string;
  incomeFallback: string;
  expenseFallback: string;
  goalFallback: string;
  investmentFallback: string;
  projectFallback: string;
  taskFallback: string;
  milestoneFallback: string;
  zakatFallback: string;
  charityFallback: string;
  beneficiaryFallback: string;
  contributorFallback: string;
};

const COPY: Record<SmartTaskLang, Copy> = {
  ar: {
    open: 'فتح',
    profileTitle: 'أكمل الملف الشخصي',
    profileDescription: 'أضف بيانات حسابك الأساسية حتى تظهر التجربة بشكل أوضح.',
    currencyTitle: 'اختر العملة الافتراضية',
    currencyDescription: 'العملة الافتراضية تساعد النماذج والصفحات الجديدة على البدء بطريقة صحيحة.',
    onboardingTitle: 'أكمل إعداد الحساب',
    onboardingDescription: 'أكمل خطوات الإعداد حتى يعرف THE SFM ما الذي تريد متابعته.',
    incomeTitle: 'أضف أول دخل',
    incomeDescription: 'أضف دخلك الحقيقي لتفعيل الملخصات والتقارير المالية.',
    expenseTitle: 'أضف أول مصروف',
    expenseDescription: 'أضف مصروفاتك الحقيقية حتى تظهر الميزانية وصافي الرصيد.',
    goalTitle: 'أنشئ هدفاً مالياً',
    goalDescription: 'حدد هدفاً مالياً لتتبع التقدم والتنبيهات المرتبطة به.',
    savingTitle: 'أضف مدخرات أو استثماراً',
    savingDescription: 'أضف سجلاً حقيقياً للمدخرات أو الاستثمار حتى يكتمل ملخص الثروة.',
    lateIncomeTitle: 'راجع دخل متأخر',
    lateIncomeDescription: (name) => `الدخل "${name}" تجاوز تاريخ الاستحقاق ولم يتم تأكيده بعد.`,
    dueIncomeTitle: 'أكد دخل مستحق اليوم',
    dueIncomeDescription: (name) => `الدخل "${name}" مستحق اليوم ويحتاج متابعة.`,
    pendingIncomeTitle: 'أكد دخل بانتظار المراجعة',
    pendingIncomeDescription: (name) => `الدخل "${name}" مسجل كدخل بانتظار التأكيد.`,
    categorizeExpenseTitle: 'صنّف المصروفات غير المصنفة',
    categorizeExpenseDescription: (count) => `يوجد ${count} مصروف يحتاج تصنيفاً واضحاً.`,
    receiptFailedTitle: 'راجع إيصالاً فشل تحليله',
    receiptFailedDescription: 'يوجد إيصال لم يكتمل تحليله آلياً، ويمكنك حفظ المصروف يدوياً.',
    spendingTitle: 'راجع ارتفاع المصروفات',
    spendingDescription: 'مصروفات الشهر المسجلة أعلى من الدخل المسجل لهذا الشهر.',
    goalAmountTitle: 'أضف المبلغ الحالي للهدف',
    goalAmountDescription: (name) => `الهدف "${name}" يحتاج مبلغاً حالياً لحساب التقدم.`,
    goalBehindTitle: 'راجع هدفاً متأخراً عن الجدول',
    goalBehindDescription: (name) => `الهدف "${name}" أقل من المسار المتوقع حسب تاريخه ومبلغه الحالي.`,
    goalDueTitle: 'راجع هدفاً يقترب موعده',
    goalDueDescription: (name) => `الهدف "${name}" يقترب موعده ولم يكتمل بعد.`,
    goalCompleteTitle: 'راجع هدفاً وصل للمبلغ المستهدف',
    goalCompleteDescription: (name) => `الهدف "${name}" وصل إلى المبلغ المستهدف حسب البيانات المسجلة.`,
    symbolTitle: 'أضف رمز الأصل للتحليل',
    symbolDescription: (name) => `الاستثمار "${name}" لا يحتوي على رمز سوق للتحليل.`,
    marketAlertTitle: 'راجع تنبيه سوق مفعل',
    marketAlertDescription: (symbol) => `تنبيه السعر للرمز ${symbol} يحتاج مراجعة بناءً على حالته المحفوظة.`,
    feasibilityTitle: 'أكمل دراسة الجدوى',
    feasibilityDescription: (name) => `المشروع "${name}" لا يحتوي على دراسة جدوى محفوظة.`,
    financialModelTitle: 'أكمل النموذج المالي',
    financialModelDescription: (name) => `المشروع "${name}" لا يحتوي على نموذج مالي محفوظ.`,
    projectTaskTitle: 'أضف مهمة للمشروع',
    projectTaskDescription: (name) => `المشروع "${name}" لا يحتوي على مهام تنفيذية بعد.`,
    overdueTaskTitle: 'راجع مهمة مشروع متأخرة',
    overdueTaskDescription: (name) => `المهمة "${name}" تجاوزت تاريخ الاستحقاق ولم تكتمل.`,
    milestoneTitle: 'راجع معلماً قادماً',
    milestoneDescription: (name) => `المعلم "${name}" يقترب موعده حسب بيانات المشروع.`,
    documentTitle: 'ارفع مستندات المشروع',
    documentDescription: (name) => `المشروع "${name}" لا يحتوي على مستندات مرفوعة.`,
    pitchDeckTitle: 'جهز العرض الاستثماري',
    pitchDeckDescription: (name) => `المشروع "${name}" لديه بيانات أساسية ويمكن تجهيز Pitch Deck له.`,
    fundingTitle: 'أكمل جاهزية التمويل',
    fundingDescription: (name) => `المشروع "${name}" يحتاج سجل جاهزية تمويل لمتابعة حزمة المستثمر.`,
    useFundsTitle: 'أكمل خطة استخدام التمويل',
    useFundsDescription: (name) => `المشروع "${name}" يحتاج خطة واضحة لاستخدام التمويل.`,
    jurisdictionTitle: 'أكمل معالج اختيار الدولة',
    jurisdictionDescription: (name) => `المشروع "${name}" لا يحتوي على تقييم دولة تأسيس أو توسع محفوظ.`,
    strategicDocsTitle: 'جهز المستندات الاستراتيجية',
    strategicDocsDescription: (name) => `المشروع "${name}" لديه بيانات يمكن تنظيمها داخل مركز المستندات الاستراتيجية.`,
    zakatAssetsTitle: 'أضف أصول الزكاة',
    zakatAssetsDescription: 'توجد مدخرات أو استثمارات، لكن لا توجد أصول زكاة محفوظة بعد.',
    zakatCalculationTitle: 'احفظ حساب الزكاة',
    zakatCalculationDescription: 'توجد أصول زكاة محفوظة، لكن لا يوجد حساب زكاة محفوظ.',
    zakatDueTitle: 'راجع موعد الزكاة',
    zakatDueDescription: (name) => `الأصل "${name}" يقترب موعد زكاته حسب التاريخ المحفوظ.`,
    charitySetupTitle: 'أكمل إعداد المشروع الخيري',
    charitySetupDescription: (name) => `المشروع الخيري "${name}" يحتاج بيانات متابعة إضافية.`,
    charityReminderTitle: 'راجع تذكيراً خيرياً',
    charityReminderDescription: (name) => `التذكير "${name}" داخل فترة التنبيه المحفوظة.`,
    beneficiaryTitle: 'راجع تجديد مستفيد',
    beneficiaryDescription: (name) => `تجديد "${name}" يقترب حسب البيانات المحفوظة.`,
    contributorTitle: 'راجع مساهمة متأخرة',
    contributorDescription: (name) => `المساهمة "${name}" متأخرة ولم تسجل كمدفوعة بالكامل.`,
    charityCommitmentTitle: 'راجع التزاماً خيرياً',
    charityCommitmentDescription: (name) => `الالتزام "${name}" مستحق أو يقترب موعده.`,
    charityDocumentTitle: 'ارفع مستندات المشروع الخيري',
    charityDocumentDescription: (name) => `المشروع الخيري "${name}" لا يحتوي على مستندات مرفوعة.`,
    reportNeedsDataTitle: 'أكمل بيانات تقرير مالي',
    reportNeedsDataDescription: 'يوجد جزء من بيانات التقرير، لكن التقرير يحتاج دخلاً ومصروفات حقيقية ليكتمل.',
    reportReadyTitle: 'راجع تقريراً جاهزاً',
    reportReadyDescription: 'يوجد تقرير يمكن مراجعته لأن بياناته الأساسية متوفرة.',
    notificationTitle: 'راجع إشعاراً مهماً',
    notificationDescription: 'يوجد إشعار مهم يحتاج إجراءً أو مراجعة.',
    incomeFallback: 'دخل',
    expenseFallback: 'مصروف',
    goalFallback: 'هدف مالي',
    investmentFallback: 'استثمار',
    projectFallback: 'مشروع',
    taskFallback: 'مهمة',
    milestoneFallback: 'معلم',
    zakatFallback: 'أصل زكاة',
    charityFallback: 'مشروع خيري',
    beneficiaryFallback: 'مستفيد',
    contributorFallback: 'مساهم',
  },
  en: {
    open: 'Open',
    profileTitle: 'Complete your profile',
    profileDescription: 'Add the basic account details so your workspace is easier to understand.',
    currencyTitle: 'Choose your default currency',
    currencyDescription: 'A default currency helps new forms and summaries start from the right place.',
    onboardingTitle: 'Complete account setup',
    onboardingDescription: 'Finish setup so THE SFM knows what you want to track.',
    incomeTitle: 'Add first income',
    incomeDescription: 'Add real income to activate summaries and financial reports.',
    expenseTitle: 'Add first expense',
    expenseDescription: 'Add real expenses so budget and net balance can appear.',
    goalTitle: 'Create a financial goal',
    goalDescription: 'Set a goal to track progress and related alerts.',
    savingTitle: 'Add savings or an investment',
    savingDescription: 'Add a real savings or investment record to complete wealth summaries.',
    lateIncomeTitle: 'Review late income',
    lateIncomeDescription: (name) => `"${name}" passed its due date and has not been confirmed.`,
    dueIncomeTitle: 'Confirm income due today',
    dueIncomeDescription: (name) => `"${name}" is due today and needs follow-up.`,
    pendingIncomeTitle: 'Confirm pending income',
    pendingIncomeDescription: (name) => `"${name}" is recorded as pending confirmation.`,
    categorizeExpenseTitle: 'Categorize uncategorized expenses',
    categorizeExpenseDescription: (count) => `${count} expense record needs a clear category.`,
    receiptFailedTitle: 'Review failed receipt scan',
    receiptFailedDescription: 'A receipt scan did not complete; manual expense entry can still be saved.',
    spendingTitle: 'Review high monthly spending',
    spendingDescription: 'Recorded expenses are higher than recorded income for this month.',
    goalAmountTitle: 'Add current amount to goal',
    goalAmountDescription: (name) => `"${name}" needs a current amount to calculate progress.`,
    goalBehindTitle: 'Review goal behind schedule',
    goalBehindDescription: (name) => `"${name}" is behind its expected timeline based on date and current amount.`,
    goalDueTitle: 'Review approaching goal date',
    goalDueDescription: (name) => `"${name}" is approaching its target date and is not complete.`,
    goalCompleteTitle: 'Review completed goal',
    goalCompleteDescription: (name) => `"${name}" reached its target amount based on your records.`,
    symbolTitle: 'Add asset symbol for analysis',
    symbolDescription: (name) => `"${name}" does not have a market symbol for analysis.`,
    marketAlertTitle: 'Review triggered market alert',
    marketAlertDescription: (symbol) => `The price alert for ${symbol} needs review based on its saved state.`,
    feasibilityTitle: 'Complete feasibility study',
    feasibilityDescription: (name) => `"${name}" does not have a saved feasibility study.`,
    financialModelTitle: 'Complete financial model',
    financialModelDescription: (name) => `"${name}" does not have a saved financial model.`,
    projectTaskTitle: 'Add a project task',
    projectTaskDescription: (name) => `"${name}" does not have execution tasks yet.`,
    overdueTaskTitle: 'Review overdue project task',
    overdueTaskDescription: (name) => `"${name}" passed its due date and is not complete.`,
    milestoneTitle: 'Review upcoming milestone',
    milestoneDescription: (name) => `"${name}" is approaching based on project dates.`,
    documentTitle: 'Upload project documents',
    documentDescription: (name) => `"${name}" does not have uploaded documents.`,
    pitchDeckTitle: 'Prepare pitch deck',
    pitchDeckDescription: (name) => `"${name}" has core data available and can be prepared for a pitch deck.`,
    fundingTitle: 'Complete funding readiness',
    fundingDescription: (name) => `"${name}" needs a funding readiness record to track investor package status.`,
    useFundsTitle: 'Complete use-of-funds plan',
    useFundsDescription: (name) => `"${name}" needs a clear use-of-funds plan.`,
    jurisdictionTitle: 'Complete jurisdiction wizard',
    jurisdictionDescription: (name) => `"${name}" does not have a saved jurisdiction assessment.`,
    strategicDocsTitle: 'Prepare strategic documents',
    strategicDocsDescription: (name) => `"${name}" has data that can be organized in the Strategic Documents Hub.`,
    zakatAssetsTitle: 'Add zakat assets',
    zakatAssetsDescription: 'Savings or investments exist, but no zakat assets are saved yet.',
    zakatCalculationTitle: 'Save zakat calculation',
    zakatCalculationDescription: 'Zakat assets exist, but no saved zakat calculation was found.',
    zakatDueTitle: 'Review zakat due date',
    zakatDueDescription: (name) => `"${name}" is approaching its saved zakat due date.`,
    charitySetupTitle: 'Complete charity project setup',
    charitySetupDescription: (name) => `"${name}" needs additional tracking data.`,
    charityReminderTitle: 'Review charity reminder',
    charityReminderDescription: (name) => `"${name}" is inside its saved reminder window.`,
    beneficiaryTitle: 'Review beneficiary renewal',
    beneficiaryDescription: (name) => `"${name}" renewal is approaching based on saved data.`,
    contributorTitle: 'Review late contributor payment',
    contributorDescription: (name) => `"${name}" is overdue and not fully paid.`,
    charityCommitmentTitle: 'Review charity commitment',
    charityCommitmentDescription: (name) => `"${name}" is due or approaching.`,
    charityDocumentTitle: 'Upload charity project document',
    charityDocumentDescription: (name) => `"${name}" does not have uploaded documents.`,
    reportNeedsDataTitle: 'Complete financial report data',
    reportNeedsDataDescription: 'Some report data exists, but income and expenses are both required for the financial report.',
    reportReadyTitle: 'Review ready report',
    reportReadyDescription: 'A report can be reviewed because its required data exists.',
    notificationTitle: 'Review important notification',
    notificationDescription: 'An important notification needs action or review.',
    incomeFallback: 'Income',
    expenseFallback: 'Expense',
    goalFallback: 'Financial goal',
    investmentFallback: 'Investment',
    projectFallback: 'Project',
    taskFallback: 'Task',
    milestoneFallback: 'Milestone',
    zakatFallback: 'Zakat asset',
    charityFallback: 'Charity project',
    beneficiaryFallback: 'Beneficiary',
    contributorFallback: 'Contributor',
  },
  fr: {
    open: 'Ouvrir',
    profileTitle: 'Compléter votre profil',
    profileDescription: 'Ajoutez les informations de base du compte pour rendre votre espace plus clair.',
    currencyTitle: 'Choisir la devise par défaut',
    currencyDescription: 'Une devise par défaut aide les nouveaux formulaires et résumés à démarrer correctement.',
    onboardingTitle: 'Terminer la configuration',
    onboardingDescription: 'Terminez la configuration pour que THE SFM sache quoi suivre.',
    incomeTitle: 'Ajouter un premier revenu',
    incomeDescription: 'Ajoutez un revenu réel pour activer les résumés et rapports financiers.',
    expenseTitle: 'Ajouter une première dépense',
    expenseDescription: 'Ajoutez des dépenses réelles pour afficher le budget et le solde net.',
    goalTitle: 'Créer un objectif financier',
    goalDescription: 'Définissez un objectif pour suivre la progression et les alertes liées.',
    savingTitle: 'Ajouter une épargne ou un investissement',
    savingDescription: 'Ajoutez un enregistrement réel pour compléter les résumés de patrimoine.',
    lateIncomeTitle: 'Vérifier un revenu en retard',
    lateIncomeDescription: (name) => `"${name}" a dépassé sa date d’échéance et n’a pas été confirmé.`,
    dueIncomeTitle: 'Confirmer un revenu dû aujourd’hui',
    dueIncomeDescription: (name) => `"${name}" est dû aujourd’hui et nécessite un suivi.`,
    pendingIncomeTitle: 'Confirmer un revenu en attente',
    pendingIncomeDescription: (name) => `"${name}" est enregistré en attente de confirmation.`,
    categorizeExpenseTitle: 'Catégoriser les dépenses non classées',
    categorizeExpenseDescription: (count) => `${count} dépense nécessite une catégorie claire.`,
    receiptFailedTitle: 'Vérifier un scan de reçu échoué',
    receiptFailedDescription: 'Un scan de reçu n’a pas abouti; la saisie manuelle reste possible.',
    spendingTitle: 'Vérifier les dépenses mensuelles élevées',
    spendingDescription: 'Les dépenses enregistrées sont supérieures aux revenus enregistrés ce mois-ci.',
    goalAmountTitle: 'Ajouter le montant actuel de l’objectif',
    goalAmountDescription: (name) => `"${name}" nécessite un montant actuel pour calculer la progression.`,
    goalBehindTitle: 'Vérifier un objectif en retard',
    goalBehindDescription: (name) => `"${name}" est en retard selon sa date et son montant actuel.`,
    goalDueTitle: 'Vérifier un objectif proche',
    goalDueDescription: (name) => `"${name}" approche de sa date cible et n’est pas terminé.`,
    goalCompleteTitle: 'Vérifier un objectif atteint',
    goalCompleteDescription: (name) => `"${name}" a atteint son montant cible selon vos données.`,
    symbolTitle: 'Ajouter le symbole de l’actif',
    symbolDescription: (name) => `"${name}" n’a pas de symbole de marché pour l’analyse.`,
    marketAlertTitle: 'Vérifier une alerte de marché déclenchée',
    marketAlertDescription: (symbol) => `L’alerte de prix pour ${symbol} nécessite une vérification selon son état enregistré.`,
    feasibilityTitle: 'Compléter l’étude de faisabilité',
    feasibilityDescription: (name) => `"${name}" n’a pas d’étude de faisabilité enregistrée.`,
    financialModelTitle: 'Compléter le modèle financier',
    financialModelDescription: (name) => `"${name}" n’a pas de modèle financier enregistré.`,
    projectTaskTitle: 'Ajouter une tâche au projet',
    projectTaskDescription: (name) => `"${name}" n’a pas encore de tâches d’exécution.`,
    overdueTaskTitle: 'Vérifier une tâche projet en retard',
    overdueTaskDescription: (name) => `"${name}" a dépassé son échéance et n’est pas terminée.`,
    milestoneTitle: 'Vérifier un jalon à venir',
    milestoneDescription: (name) => `"${name}" approche selon les dates du projet.`,
    documentTitle: 'Téléverser les documents du projet',
    documentDescription: (name) => `"${name}" n’a pas de documents téléversés.`,
    pitchDeckTitle: 'Préparer le pitch deck',
    pitchDeckDescription: (name) => `"${name}" dispose de données de base et peut être préparé pour un pitch deck.`,
    fundingTitle: 'Compléter la préparation au financement',
    fundingDescription: (name) => `"${name}" nécessite un dossier de préparation au financement.`,
    useFundsTitle: 'Compléter le plan d’utilisation des fonds',
    useFundsDescription: (name) => `"${name}" nécessite un plan clair d’utilisation des fonds.`,
    jurisdictionTitle: 'Compléter l’assistant de juridiction',
    jurisdictionDescription: (name) => `"${name}" n’a pas d’évaluation de juridiction enregistrée.`,
    strategicDocsTitle: 'Préparer les documents stratégiques',
    strategicDocsDescription: (name) => `"${name}" contient des données à organiser dans le hub documentaire.`,
    zakatAssetsTitle: 'Ajouter les actifs zakat',
    zakatAssetsDescription: 'Une épargne ou des investissements existent, mais aucun actif zakat n’est enregistré.',
    zakatCalculationTitle: 'Enregistrer le calcul de zakat',
    zakatCalculationDescription: 'Des actifs zakat existent, mais aucun calcul de zakat enregistré n’a été trouvé.',
    zakatDueTitle: 'Vérifier l’échéance de zakat',
    zakatDueDescription: (name) => `"${name}" approche de sa date de zakat enregistrée.`,
    charitySetupTitle: 'Compléter le projet caritatif',
    charitySetupDescription: (name) => `"${name}" nécessite des données de suivi supplémentaires.`,
    charityReminderTitle: 'Vérifier un rappel caritatif',
    charityReminderDescription: (name) => `"${name}" est dans sa fenêtre de rappel enregistrée.`,
    beneficiaryTitle: 'Vérifier un renouvellement bénéficiaire',
    beneficiaryDescription: (name) => `Le renouvellement de "${name}" approche selon les données enregistrées.`,
    contributorTitle: 'Vérifier un paiement contributeur en retard',
    contributorDescription: (name) => `"${name}" est en retard et pas entièrement payé.`,
    charityCommitmentTitle: 'Vérifier un engagement caritatif',
    charityCommitmentDescription: (name) => `"${name}" est dû ou approche.`,
    charityDocumentTitle: 'Téléverser un document caritatif',
    charityDocumentDescription: (name) => `"${name}" n’a pas de documents téléversés.`,
    reportNeedsDataTitle: 'Compléter les données du rapport financier',
    reportNeedsDataDescription: 'Certaines données existent, mais revenus et dépenses sont requis pour le rapport financier.',
    reportReadyTitle: 'Vérifier un rapport prêt',
    reportReadyDescription: 'Un rapport peut être consulté car ses données requises existent.',
    notificationTitle: 'Vérifier une notification importante',
    notificationDescription: 'Une notification importante nécessite une action ou une vérification.',
    incomeFallback: 'Revenu',
    expenseFallback: 'Dépense',
    goalFallback: 'Objectif financier',
    investmentFallback: 'Investissement',
    projectFallback: 'Projet',
    taskFallback: 'Tâche',
    milestoneFallback: 'Jalon',
    zakatFallback: 'Actif zakat',
    charityFallback: 'Projet caritatif',
    beneficiaryFallback: 'Bénéficiaire',
    contributorFallback: 'Contributeur',
  },
};

const DAY_MS = 86_400_000;

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

function daysUntil(value: unknown, today = new Date()) {
  const date = parseDate(value);
  if (!date) return null;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((target - base) / DAY_MS);
}

function amount(value: unknown) {
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstText(row: any, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isClosedStatus(value: unknown) {
  const status = String(value ?? '').toLowerCase();
  return ['done', 'completed', 'complete', 'cancelled', 'closed', 'archived'].includes(status);
}

function currentMonthRows(rows: any[], dateKeys: string[]) {
  const now = new Date();
  return rows.filter(row => {
    const date = parseDate(firstText(row, dateKeys, ''));
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

function makeId(parts: Array<string | null | undefined>) {
  return `task:${parts.filter(Boolean).join(':')}`;
}

function hasJsonContent(value: unknown) {
  if (!value) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '{}' || trimmed === '[]') return false;
    try {
      return hasJsonContent(JSON.parse(trimmed));
    } catch {
      return true;
    }
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function hasProjectRecord(rows: any[] | undefined, projectId: string) {
  return (rows ?? []).some(row => String(row.project_id ?? '') === projectId);
}

function priorityFromDue(diff: number | null): SmartTaskPriority {
  if (diff !== null && diff < 0) return 'urgent';
  if (diff !== null && diff <= 7) return 'urgent';
  if (diff !== null && diff <= 30) return 'high';
  return 'medium';
}

function normalizeSourceModule(value: unknown) {
  const source = String(value ?? '').toLowerCase();
  if (source.includes('income')) return 'income';
  if (source.includes('expense')) return 'expense';
  if (source.includes('goal')) return 'goal';
  if (source.includes('market') || source.includes('watchlist')) return 'market';
  if (source.includes('project') || source.includes('task') || source.includes('milestone')) return 'project';
  if (source.includes('business') || source.includes('funding') || source.includes('jurisdiction')) return 'business';
  if (source.includes('zakat')) return 'zakat';
  if (source.includes('charity') || source.includes('beneficiary') || source.includes('contributor')) return 'charity';
  if (source.includes('report')) return 'report';
  return 'notification';
}

export function compareSmartTasks(a: SmartTask, b: SmartTask) {
  const priorityWeight: Record<SmartTaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const priorityDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
  if (priorityDiff !== 0) return priorityDiff;
  const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
  return aDue - bDue;
}

export function isTaskDueThisWeek(task: SmartTask, now = new Date()) {
  if (task.priority === 'urgent') return true;
  if (!task.dueDate) return false;
  const diff = daysUntil(task.dueDate, now);
  return diff !== null && diff >= 0 && diff <= 7;
}

export function isTaskDueToday(task: SmartTask, now = new Date()) {
  if (!task.dueDate) return false;
  return dateKey(parseDate(task.dueDate) ?? now) === dateKey(now);
}

export function generateSmartTasks({
  profile,
  data,
  lang,
}: {
  profile?: SmartTaskProfile | null;
  data: SmartTaskSourceData;
  lang: SmartTaskLang;
}) {
  const copy = COPY[lang] ?? COPY.ar;
  const now = new Date();
  const tasks: SmartTask[] = [];
  const add = (task: Omit<SmartTask, 'status' | 'actionLabel'> & { actionLabel?: string }) => {
    tasks.push({
      status: 'open',
      actionLabel: copy.open,
      ...task,
    });
  };

  if (!profile?.display_name) {
    add({
      id: makeId(['setup', 'profile']),
      title: copy.profileTitle,
      description: copy.profileDescription,
      sourceModule: 'setup',
      priority: 'medium',
      actionUrl: '/profile',
    });
  }
  if (!profile?.default_currency) {
    add({
      id: makeId(['setup', 'currency']),
      title: copy.currencyTitle,
      description: copy.currencyDescription,
      sourceModule: 'setup',
      priority: 'medium',
      actionUrl: '/profile#preferences',
    });
  }
  if (profile?.onboarding_completed !== true) {
    add({
      id: makeId(['setup', 'onboarding']),
      title: copy.onboardingTitle,
      description: copy.onboardingDescription,
      sourceModule: 'setup',
      priority: 'medium',
      actionUrl: '/setup',
    });
  }
  if ((data.income?.length ?? 0) === 0) {
    add({ id: makeId(['setup', 'income']), title: copy.incomeTitle, description: copy.incomeDescription, sourceModule: 'income', priority: 'medium', actionUrl: '/income' });
  }
  if ((data.expenses?.length ?? 0) === 0) {
    add({ id: makeId(['setup', 'expense']), title: copy.expenseTitle, description: copy.expenseDescription, sourceModule: 'expense', priority: 'medium', actionUrl: '/expenses' });
  }
  if ((data.goals?.length ?? 0) === 0) {
    add({ id: makeId(['setup', 'goal']), title: copy.goalTitle, description: copy.goalDescription, sourceModule: 'goal', priority: 'low', actionUrl: '/goals' });
  }
  if ((data.savings?.length ?? 0) === 0 && (data.investments?.length ?? 0) === 0) {
    add({ id: makeId(['setup', 'saving-or-investment']), title: copy.savingTitle, description: copy.savingDescription, sourceModule: 'savings', priority: 'low', actionUrl: '/savings' });
  }

  (data.income ?? []).forEach(row => {
    const name = firstText(row, ['source_name', 'name', 'description', 'income_type'], copy.incomeFallback);
    const status = String(row.status ?? row.workflowStatus ?? '').toLowerCase();
    const due = row.generated_for_date || row.received_date || row.expected_date || row.due_date;
    const diff = daysUntil(due, now);
    if (status === 'received' || row.confirmed_at) return;
    if (diff !== null && diff < 0) {
      add({ id: makeId(['income-late', row.id, String(due)]), title: copy.lateIncomeTitle, description: copy.lateIncomeDescription(name), sourceModule: 'income', sourceId: row.id, priority: 'urgent', dueDate: String(due), actionUrl: '/income' });
    } else if (diff === 0) {
      add({ id: makeId(['income-due', row.id, String(due)]), title: copy.dueIncomeTitle, description: copy.dueIncomeDescription(name), sourceModule: 'income', sourceId: row.id, priority: 'high', dueDate: String(due), actionUrl: '/income' });
    } else if (status === 'pending') {
      add({ id: makeId(['income-pending', row.id]), title: copy.pendingIncomeTitle, description: copy.pendingIncomeDescription(name), sourceModule: 'income', sourceId: row.id, priority: 'medium', dueDate: due ? String(due) : undefined, actionUrl: '/income' });
    }
  });

  const uncategorized = (data.expenses ?? []).filter(row => {
    const category = firstText(row, ['category', 'expense_category']).toLowerCase();
    return !category || ['uncategorized', 'other', 'general'].includes(category);
  });
  if (uncategorized.length > 0) {
    add({ id: makeId(['expenses', 'uncategorized']), title: copy.categorizeExpenseTitle, description: copy.categorizeExpenseDescription(uncategorized.length), sourceModule: 'expense', priority: 'medium', actionUrl: '/expenses' });
  }
  if ((data.expenses ?? []).some(row => ['failed', 'error'].includes(String(row.receipt_scan_status ?? row.ai_status ?? row.scan_status ?? '').toLowerCase()))) {
    add({ id: makeId(['expenses', 'receipt-failed']), title: copy.receiptFailedTitle, description: copy.receiptFailedDescription, sourceModule: 'expense', priority: 'medium', actionUrl: '/expenses' });
  }
  const monthIncome = currentMonthRows(data.income ?? [], ['received_date', 'generated_for_date', 'created_at']).reduce((sum, row) => sum + amount(row.amount), 0);
  const monthExpenses = currentMonthRows(data.expenses ?? [], ['expense_date', 'date', 'created_at']).reduce((sum, row) => sum + amount(row.amount), 0);
  if (monthIncome > 0 && monthExpenses > monthIncome) {
    add({ id: makeId(['expenses', 'over-income', dateKey(now)]), title: copy.spendingTitle, description: copy.spendingDescription, sourceModule: 'expense', priority: 'high', dueDate: dateKey(now), actionUrl: '/expenses' });
  }

  (data.goals ?? []).forEach(row => {
    const name = firstText(row, ['name', 'goal', 'title'], copy.goalFallback);
    const target = amount(row.target_amount ?? row.amount);
    const current = amount(row.current_amount ?? row.saved_amount);
    const targetDate = row.target_date || row.deadline || row.due_date;
    const diff = daysUntil(targetDate, now);
    const status = String(row.status ?? '').toLowerCase();
    if (target > 0 && !hasValue(row.current_amount ?? row.saved_amount)) {
      add({ id: makeId(['goal-current-amount', row.id]), title: copy.goalAmountTitle, description: copy.goalAmountDescription(name), sourceModule: 'goal', sourceId: row.id, priority: 'medium', actionUrl: '/goals' });
    }
    if (target > 0 && current >= target && !['done', 'completed', 'complete'].includes(status)) {
      add({ id: makeId(['goal-complete', row.id]), title: copy.goalCompleteTitle, description: copy.goalCompleteDescription(name), sourceModule: 'goal', sourceId: row.id, priority: 'medium', dueDate: targetDate ? String(targetDate) : undefined, actionUrl: '/goals' });
    } else if (diff !== null && diff >= 0 && diff <= 30 && target > 0 && current < target) {
      add({ id: makeId(['goal-due', row.id, String(targetDate)]), title: copy.goalDueTitle, description: copy.goalDueDescription(name), sourceModule: 'goal', sourceId: row.id, priority: diff <= 7 ? 'high' : 'medium', dueDate: String(targetDate), actionUrl: '/goals' });
    }
    const created = parseDate(row.created_at);
    const end = parseDate(targetDate);
    if (created && end && target > 0 && current < target) {
      const total = end.getTime() - created.getTime();
      const elapsed = now.getTime() - created.getTime();
      const expectedProgress = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0;
      const actualProgress = current / target;
      if (expectedProgress > 0.35 && actualProgress + 0.15 < expectedProgress) {
        add({ id: makeId(['goal-behind', row.id]), title: copy.goalBehindTitle, description: copy.goalBehindDescription(name), sourceModule: 'goal', sourceId: row.id, priority: 'high', dueDate: targetDate ? String(targetDate) : undefined, actionUrl: '/goals' });
      }
    }
  });

  (data.investments ?? []).forEach(row => {
    const symbol = firstText(row, ['symbol', 'ticker']);
    if (symbol) return;
    const name = firstText(row, ['asset_name', 'name', 'title'], copy.investmentFallback);
    add({ id: makeId(['investment-symbol', row.id]), title: copy.symbolTitle, description: copy.symbolDescription(name), sourceModule: 'market', sourceId: row.id, priority: 'low', actionUrl: '/invest' });
  });
  (data.marketPriceAlerts ?? []).forEach(row => {
    const status = String(row.status ?? '').toLowerCase();
    if (!['triggered', 'active_triggered', 'met'].includes(status)) return;
    const symbol = firstText(row, ['symbol'], '');
    if (!symbol) return;
    add({ id: makeId(['market-alert', row.id, status]), title: copy.marketAlertTitle, description: copy.marketAlertDescription(symbol), sourceModule: 'market', sourceId: row.id, priority: 'high', actionUrl: '/market-analysis' });
  });

  (data.projects ?? []).forEach(row => {
    const projectId = String(row.id ?? '');
    if (!projectId) return;
    const name = firstText(row, ['name', 'project_name', 'title'], copy.projectFallback);
    const projectUrl = `/projects/${projectId}`;
    const projectStatus = String(row.status ?? '').toLowerCase();
    const endDiff = daysUntil(row.end_date, now);
    if (endDiff !== null && endDiff < 0 && !isClosedStatus(projectStatus)) {
      add({ id: makeId(['project-ended', projectId, String(row.end_date)]), title: copy.overdueTaskTitle, description: copy.overdueTaskDescription(name), sourceModule: 'project', sourceId: projectId, priority: 'urgent', dueDate: String(row.end_date), actionUrl: projectUrl });
    }
    if (!hasProjectRecord(data.feasibilityStudies, projectId)) {
      add({ id: makeId(['project-feasibility', projectId]), title: copy.feasibilityTitle, description: copy.feasibilityDescription(name), sourceModule: 'project', sourceId: projectId, priority: 'high', actionUrl: projectUrl });
    }
    if (!hasProjectRecord(data.financialModels, projectId)) {
      add({ id: makeId(['project-financial-model', projectId]), title: copy.financialModelTitle, description: copy.financialModelDescription(name), sourceModule: 'project', sourceId: projectId, priority: 'high', actionUrl: projectUrl });
    }
    if (!hasProjectRecord(data.projectTasks, projectId)) {
      add({ id: makeId(['project-add-task', projectId]), title: copy.projectTaskTitle, description: copy.projectTaskDescription(name), sourceModule: 'project', sourceId: projectId, priority: 'medium', actionUrl: projectUrl });
    }
    if (!hasProjectRecord(data.projectDocuments, projectId)) {
      add({ id: makeId(['project-documents', projectId]), title: copy.documentTitle, description: copy.documentDescription(name), sourceModule: 'project', sourceId: projectId, priority: 'medium', actionUrl: projectUrl });
    }
    const hasFeasibility = hasProjectRecord(data.feasibilityStudies, projectId);
    const hasFinancial = hasProjectRecord(data.financialModels, projectId);
    const hasPitchDeck = hasProjectRecord(data.pitchDecks, projectId);
    if (hasFeasibility && hasFinancial && !hasPitchDeck) {
      add({ id: makeId(['project-pitch-deck', projectId]), title: copy.pitchDeckTitle, description: copy.pitchDeckDescription(name), sourceModule: 'business', sourceId: projectId, priority: 'medium', actionUrl: projectUrl });
    }
    const funding = (data.fundingReadiness ?? []).find(item => String(item.project_id ?? '') === projectId);
    if (!funding) {
      add({ id: makeId(['business-funding', projectId]), title: copy.fundingTitle, description: copy.fundingDescription(name), sourceModule: 'business', sourceId: projectId, priority: hasFeasibility || hasFinancial ? 'high' : 'medium', actionUrl: '/business-hub' });
    } else if (amount(funding.funding_needed) > 0 && !hasJsonContent(funding.use_of_funds)) {
      add({ id: makeId(['business-use-of-funds', projectId]), title: copy.useFundsTitle, description: copy.useFundsDescription(name), sourceModule: 'business', sourceId: projectId, priority: 'high', actionUrl: '/business-hub' });
    }
    if (!hasProjectRecord(data.jurisdictionAssessments, projectId)) {
      add({ id: makeId(['business-jurisdiction', projectId]), title: copy.jurisdictionTitle, description: copy.jurisdictionDescription(name), sourceModule: 'business', sourceId: projectId, priority: 'medium', actionUrl: '/business-hub' });
    }
    if ((hasFeasibility || hasFinancial || hasProjectRecord(data.projectDocuments, projectId)) && !hasPitchDeck) {
      add({ id: makeId(['business-documents', projectId]), title: copy.strategicDocsTitle, description: copy.strategicDocsDescription(name), sourceModule: 'business', sourceId: projectId, priority: 'low', actionUrl: '/business-hub' });
    }
  });

  (data.projectTasks ?? []).forEach(row => {
    const status = String(row.status ?? '').toLowerCase();
    const due = row.due_date;
    const diff = daysUntil(due, now);
    if (diff !== null && diff < 0 && !isClosedStatus(status)) {
      const name = firstText(row, ['title', 'name'], copy.taskFallback);
      add({ id: makeId(['task-overdue', row.id, String(due)]), title: copy.overdueTaskTitle, description: copy.overdueTaskDescription(name), sourceModule: 'project', sourceId: row.id, priority: 'urgent', dueDate: String(due), actionUrl: row.project_id ? `/projects/${row.project_id}` : '/projects' });
    }
  });
  (data.projectMilestones ?? []).forEach(row => {
    const due = row.target_date || row.due_date;
    const diff = daysUntil(due, now);
    if (diff !== null && diff >= 0 && diff <= 30 && !isClosedStatus(row.status)) {
      const name = firstText(row, ['title', 'name'], copy.milestoneFallback);
      add({ id: makeId(['milestone-upcoming', row.id, String(due)]), title: copy.milestoneTitle, description: copy.milestoneDescription(name), sourceModule: 'project', sourceId: row.id, priority: priorityFromDue(diff), dueDate: String(due), actionUrl: row.project_id ? `/projects/${row.project_id}` : '/projects' });
    }
  });

  if (((data.savings?.length ?? 0) > 0 || (data.investments?.length ?? 0) > 0) && (data.zakatAssets?.length ?? 0) === 0) {
    add({ id: makeId(['zakat-assets-from-wealth']), title: copy.zakatAssetsTitle, description: copy.zakatAssetsDescription, sourceModule: 'zakat', priority: 'medium', actionUrl: '/zakat' });
  }
  if ((data.zakatAssets?.length ?? 0) > 0 && (data.zakatCalculations?.length ?? 0) === 0) {
    add({ id: makeId(['zakat-calculation']), title: copy.zakatCalculationTitle, description: copy.zakatCalculationDescription, sourceModule: 'zakat', priority: 'medium', actionUrl: '/zakat' });
  }
  (data.zakatAssets ?? []).forEach(row => {
    if (row.is_zakatable === false) return;
    const due = row.zakat_due_date || row.due_date || row.hawl_date;
    const diff = daysUntil(due, now);
    if (diff === null || diff < 0 || diff > 30) return;
    const name = firstText(row, ['asset_name', 'name'], copy.zakatFallback);
    add({ id: makeId(['zakat-due', row.id, String(due)]), title: copy.zakatDueTitle, description: copy.zakatDueDescription(name), sourceModule: 'zakat', sourceId: row.id, priority: priorityFromDue(diff), dueDate: String(due), actionUrl: '/zakat' });
  });

  (data.charityProjects ?? []).forEach(row => {
    const projectId = String(row.id ?? '');
    const name = firstText(row, ['name', 'project_name', 'title'], copy.charityFallback);
    if (projectId && !hasProjectRecord(data.charityDocuments, projectId)) {
      add({ id: makeId(['charity-documents', projectId]), title: copy.charityDocumentTitle, description: copy.charityDocumentDescription(name), sourceModule: 'charity', sourceId: projectId, priority: 'low', actionUrl: '/charity-projects' });
    }
  });
  (data.charityReminders ?? []).forEach(row => {
    if (String(row.status ?? 'active').toLowerCase() !== 'active') return;
    const due = row.due_date;
    const diff = daysUntil(due, now);
    const remindBefore = amount(row.remind_before_days || 30);
    if (diff === null || diff < 0 || diff > remindBefore) return;
    const name = firstText(row, ['title'], copy.charityFallback);
    add({ id: makeId(['charity-reminder', row.id, String(due)]), title: copy.charityReminderTitle, description: copy.charityReminderDescription(name), sourceModule: row.reminder_type === 'zakat' ? 'zakat' : 'charity', sourceId: row.id, priority: priorityFromDue(diff), dueDate: String(due), actionUrl: row.reminder_type === 'zakat' ? '/zakat' : '/charity-projects' });
  });
  (data.charityBeneficiaries ?? []).forEach(row => {
    const due = row.next_renewal_date;
    const diff = daysUntil(due, now);
    if (diff === null || diff < 0 || diff > 30) return;
    const name = firstText(row, ['display_name', 'reference_code'], copy.beneficiaryFallback);
    add({ id: makeId(['beneficiary-renewal', row.id, String(due)]), title: copy.beneficiaryTitle, description: copy.beneficiaryDescription(name), sourceModule: 'charity', sourceId: row.id, priority: priorityFromDue(diff), dueDate: String(due), actionUrl: '/charity-projects' });
  });
  (data.charityContributors ?? []).forEach(row => {
    const due = row.due_date;
    const diff = daysUntil(due, now);
    const status = String(row.payment_status ?? '').toLowerCase();
    if (diff !== null && diff < 0 && ['pending', 'partial'].includes(status)) {
      const name = firstText(row, ['contributor_name'], copy.contributorFallback);
      add({ id: makeId(['contributor-late', row.id, String(due)]), title: copy.contributorTitle, description: copy.contributorDescription(name), sourceModule: 'charity', sourceId: row.id, priority: 'urgent', dueDate: String(due), actionUrl: '/charity-projects' });
    }
  });
  (data.charityCommitments ?? []).forEach(row => {
    const due = row.due_date || row.next_due_date;
    const diff = daysUntil(due, now);
    if (diff === null || diff < 0 || diff > 30 || isClosedStatus(row.status)) return;
    const name = firstText(row, ['title', 'name', 'commitment_name'], copy.charityFallback);
    add({ id: makeId(['charity-commitment', row.id, String(due)]), title: copy.charityCommitmentTitle, description: copy.charityCommitmentDescription(name), sourceModule: 'charity', sourceId: row.id, priority: priorityFromDue(diff), dueDate: String(due), actionUrl: '/charity-projects' });
  });

  if (((data.income?.length ?? 0) > 0 || (data.expenses?.length ?? 0) > 0) && !((data.income?.length ?? 0) > 0 && (data.expenses?.length ?? 0) > 0)) {
    add({ id: makeId(['report-needs-data', 'financial']), title: copy.reportNeedsDataTitle, description: copy.reportNeedsDataDescription, sourceModule: 'report', priority: 'medium', actionUrl: '/reports-center' });
  }
  if ((data.income?.length ?? 0) > 0 && (data.expenses?.length ?? 0) > 0) {
    add({ id: makeId(['report-ready', 'financial', dateKey(now)]), title: copy.reportReadyTitle, description: copy.reportReadyDescription, sourceModule: 'report', priority: 'low', dueDate: dateKey(now), actionUrl: '/reports-center' });
  }
  if ((data.projects?.length ?? 0) > 0) {
    add({ id: makeId(['report-ready', 'projects', dateKey(now)]), title: copy.reportReadyTitle, description: copy.reportReadyDescription, sourceModule: 'report', priority: 'low', dueDate: dateKey(now), actionUrl: '/reports-center' });
  }
  if ((data.zakatCalculations?.length ?? 0) > 0 || (data.charityProjects?.length ?? 0) > 0) {
    add({ id: makeId(['report-ready', 'zakat-charity', dateKey(now)]), title: copy.reportReadyTitle, description: copy.reportReadyDescription, sourceModule: 'report', priority: 'low', dueDate: dateKey(now), actionUrl: '/reports-center' });
  }

  (data.notifications ?? []).forEach(row => {
    const status = String(row.status ?? '').toLowerCase();
    if (status === 'archived' || row.read === true) return;
    const severity = String(row.severity ?? row.priority ?? '').toLowerCase();
    if (!['danger', 'warning', 'high', 'urgent'].includes(severity)) return;
    add({
      id: makeId(['notification', row.id]),
      title: firstText(row, ['title'], copy.notificationTitle),
      description: firstText(row, ['message'], copy.notificationDescription),
      sourceModule: normalizeSourceModule(row.source_module ?? row.type),
      sourceId: row.id,
      priority: severity === 'danger' || severity === 'urgent' ? 'urgent' : 'high',
      dueDate: row.due_date ? String(row.due_date) : undefined,
      actionUrl: firstText(row, ['action_url', 'link'], '/notifications'),
    });
  });

  return Array.from(new Map(tasks.map(task => [task.id, task])).values()).sort(compareSmartTasks);
}
