'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileText,
  FolderKanban,
  Gauge,
  Globe2,
  Pencil,
  Presentation,
  Plus,
  ReceiptText,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardPageShell } from '@/components/DashboardPageShell';
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
import { AppModal } from '@/components/ui/AppModal';
import { CurrencySelect } from '@/components/CurrencySelect';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { getCurrency } from '@/lib/currencies';
import { formatMoney } from '@/lib/formatMoney';
import { buildFeasibilityStudyExportRow, printFeasibilityStudyToPdf } from '@/lib/reports/feasibilityStudyExport';
import { useCurrency } from '@/lib/useCurrency';

const ProjectAiAdvisorTab = dynamic(() => import('@/components/projects/ProjectAiAdvisorTab').then(mod => mod.ProjectAiAdvisorTab), {
  ssr: false,
  loading: () => <LazyTabSkeleton />,
});

const ProjectDocumentsTab = dynamic(() => import('@/components/projects/ProjectDocumentsTab').then(mod => mod.ProjectDocumentsTab), {
  ssr: false,
  loading: () => <LazyTabSkeleton />,
});

const ProjectFinancialModelTab = dynamic(() => import('@/components/projects/ProjectFinancialModelTab').then(mod => mod.ProjectFinancialModelTab), {
  ssr: false,
  loading: () => <LazyTabSkeleton />,
});

const ProjectPitchDeckTab = dynamic(() => import('@/components/projects/ProjectPitchDeckTab').then(mod => mod.ProjectPitchDeckTab), {
  ssr: false,
  loading: () => <LazyTabSkeleton />,
});

type Lang = 'ar' | 'en' | 'fr';
type TabId = 'overview' | 'feasibility' | 'financial' | 'tasks' | 'documents' | 'kpis' | 'ai' | 'pitchDeck';
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
  created_at?: string | null;
  updated_at?: string | null;
};

type ProjectExpenseRow = {
  id: string;
  user_id?: string | null;
  project_id?: string | null;
  title: string | null;
  amount: number | string | null;
  currency: string | null;
  expense_date: string | null;
  category: string | null;
  payment_method: string | null;
  notes: string | null;
  receipt_url?: string | null;
  ai_analysis?: ProjectExpenseAiAnalysis | null;
  paid_from_personal_budget?: boolean | null;
  personal_expense_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProjectExpenseForm = {
  title: string;
  amount: string;
  currency: string;
  expenseDate: string;
  category: string;
  paymentMethod: string;
  notes: string;
  receiptFile: File | null;
  paidFromPersonalBudget: boolean;
};

type ProjectExpenseReceiptAnalysis = {
  extracted: {
    title?: string | null;
    vendorName?: string | null;
    amount?: number | null;
    currency?: string | null;
    invoiceDate?: string | null;
    category?: string | null;
    notes?: string | null;
  };
  confidence?: {
    invoiceNumber?: number;
    amount?: number;
    currency?: number;
    invoiceDate?: number;
  };
  warnings?: string[];
  summary?: string | null;
};

type ProjectExpenseAiAnalysis = {
  source?: 'ai' | 'rules';
  summary?: string;
  necessity?: string;
  category?: string;
  budgetImpact?: string;
  amountLevel?: 'low' | 'normal' | 'high' | 'unknown';
  fundingReadinessImpact?: string;
  suggestedAction?: 'approve' | 'review' | 'reduce' | 'move_category' | 'attach_document';
  warnings?: string[];
  budget?: {
    plannedBudget?: number | null;
    existingExpenses?: number;
    expenseAmount?: number;
    remainingAfterExpense?: number | null;
    percentageUsed?: number | null;
    categoryWarning?: string | null;
  };
};

type ProjectIncomeRow = {
  id: string;
  user_id?: string | null;
  project_id?: string | null;
  title: string | null;
  amount: number | string | null;
  currency: string | null;
  income_date: string | null;
  category: string | null;
  source: string | null;
  description: string | null;
  notes: string | null;
  transferred_to_personal_income?: boolean | null;
  personal_income_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProjectIncomeForm = {
  title: string;
  amount: string;
  currency: string;
  incomeDate: string;
  category: string;
  source: string;
  description: string;
  notes: string;
  transferredToPersonalIncome: boolean;
};

type MoneyFormatter = (value: number, currency?: string | null) => string;
type CurrencyAmountRow = {
  amount: number | string | null;
  currency?: string | null;
};

type DeleteTarget =
  | { type: 'income'; row: ProjectIncomeRow }
  | { type: 'expense'; row: ProjectExpenseRow };

function LazyTabSkeleton() {
  return (
    <section className="warm-card lazy-tab-skeleton" aria-hidden="true">
      <span />
      <i />
      <i />
      <i />
    </section>
  );
}

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
    projectExpenses: 'مصروفات المشروع',
    expenseName: 'اسم المصروف',
    amount: 'المبلغ',
    currency: 'العملة',
    date: 'التاريخ',
    category: 'التصنيف',
    paymentMethod: 'طريقة الدفع',
    notes: 'ملاحظات',
    receipt: 'إيصال أو فاتورة اختيارية',
    aiReceiptReading: 'قراءة الإيصال بالذكاء الاصطناعي',
    aiReceiptHelper: 'ارفع صورة أو PDF للفاتورة ليتم تحليلها تلقائياً.',
    readReceipt: 'قراءة الإيصال',
    analyzeExpense: 'تحليل المصروف',
    readingReceipt: 'جاري قراءة الإيصال...',
    analyzingExpense: 'جاري تحليل المصروف...',
    receiptReadSuccess: 'تم استخراج البيانات، يرجى مراجعتها قبل الحفظ.',
    receiptReadError: 'تعذر تحليل الإيصال حالياً، يمكنك إدخال البيانات يدوياً.',
    extractedReceiptTitle: 'نتيجة قراءة الإيصال',
    applyExtractedData: 'تطبيق البيانات',
    clearAiResult: 'مسح النتيجة',
    confidence: 'الثقة',
    vendorName: 'اسم المورد',
    notClear: 'غير واضح',
    aiExpenseAnalysis: 'تحليل المصروف',
    aiExpenseAnalysisError: 'تعذر تحليل المصروف حالياً، يمكنك الحفظ يدوياً.',
    budgetImpact: 'أثره على الميزانية',
    remainingBudgetAfterExpense: 'المتبقي بعد هذا المصروف',
    budgetUsedPercent: 'نسبة استخدام الميزانية',
    noProjectBudgetForAnalysis: 'لا توجد ميزانية محددة لهذا المشروع، أضف ميزانية للحصول على تحليل أدق.',
    suggestedAction: 'الإجراء المقترح',
    expenseAction_approve: 'اعتماد',
    expenseAction_review: 'مراجعة',
    expenseAction_reduce: 'تخفيض',
    expenseAction_move_category: 'نقل لتصنيف آخر',
    expenseAction_attach_document: 'إرفاق مستند داعم',
    amountLevel: 'مستوى المبلغ',
    amountLevel_low: 'منخفض',
    amountLevel_normal: 'طبيعي',
    amountLevel_high: 'مرتفع',
    amountLevel_unknown: 'غير محدد',
    paidFromPersonalBudget: 'تم الدفع من ميزانيتي الشخصية',
    doNotIncludeInPersonalBudget: 'لا يؤثر هذا المصروف على مصروفاتك الشخصية إلا إذا اخترت ذلك.',
    includeInPersonalBudget: 'سيظهر هذا المصروف أيضاً في صفحة المصروفات الشخصية بعلامة مصروف مشروع.',
    projectExpense: 'مصروف مشروع',
    totalProjectExpenses: 'إجمالي مصروفات المشروع',
    projectExpensesThisMonth: 'مصروفات هذا الشهر',
    personalBudgetProjectExpenses: 'مدفوع من الميزانية الشخصية',
    noProjectExpensesYet: 'لا توجد مصروفات مسجلة لهذا المشروع.',
    actualVsPlanned: 'الفعلي مقابل المخطط',
    saveProjectExpense: 'حفظ مصروف المشروع',
    cancel: 'إلغاء',
    general: 'عام',
    operations: 'تشغيل',
    marketingExpense: 'تسويق',
    payroll: 'رواتب',
    rent: 'إيجار',
    equipment: 'معدات',
    licenses: 'تراخيص',
    cash: 'نقداً',
    card: 'بطاقة',
    transfer: 'تحويل',
    projectExpenseSaved: 'تم حفظ مصروف المشروع.',
    projectExpenseSaveError: 'تعذر حفظ مصروف المشروع حالياً.',
    requiredExpenseName: 'أدخل اسم المصروف.',
    requiredExpenseAmount: 'أدخل مبلغاً صحيحاً.',
    missingDataChecklist: 'بيانات تحتاج متابعة',
    addProjectExpensesHint: 'أضف مصروفات المشروع لعرض الفعلي مقابل المخطط.',
    addFinancialModelHint: 'أضف النموذج المالي لحساب جاهزية المشروع.',
    addTasksHint: 'أضف المهام لعرض تقدم المشروع.',
    addIncome: 'إضافة دخل للمشروع',
    projectIncome: 'دخل المشروع',
    incomeName: 'اسم الدخل',
    incomeSource: 'المصدر / التصنيف',
    source: 'المصدر',
    transferredToPersonalIncome: 'تم تحويله إلى دخلي الشخصي',
    doNotIncludeInPersonalIncome: 'لا يؤثر هذا الدخل على دخلك الشخصي إلا إذا اخترت ذلك.',
    includeInPersonalIncome: 'سيظهر هذا الدخل أيضاً في صفحة الدخل الشخصي بعلامة دخل مشروع.',
    totalProjectIncome: 'إجمالي دخل المشروع',
    projectIncomeThisMonth: 'دخل هذا الشهر',
    personalIncomeProjectIncome: 'الدخل المحوّل للدخل الشخصي',
    noProjectIncomeYet: 'لا توجد إيرادات مسجلة لهذا المشروع.',
    actualVsExpected: 'الفعلي مقابل المتوقع',
    saveProjectIncome: 'حفظ دخل المشروع',
    projectIncomeSaved: 'تم حفظ دخل المشروع.',
    projectIncomeSaveError: 'تعذر حفظ دخل المشروع حالياً.',
    requiredIncomeName: 'أدخل اسم الدخل.',
    requiredIncomeAmount: 'أدخل مبلغاً صحيحاً.',
    salesIncome: 'مبيعات',
    servicesIncome: 'خدمات',
    rentalIncome: 'إيجار',
    investmentIncome: 'استثمار',
    otherIncomeSource: 'مصدر آخر',
    analyzeProject: 'تحليل المشروع',
    chooseJurisdiction: 'اختيار دولة التأسيس',
    back: 'العودة إلى مشاريعي',
    signIn: 'سجّل الدخول لعرض تفاصيل مشاريعك.',
    notFound: 'لم يتم العثور على المشروع.',
    overview: 'نظرة عامة',
    feasibility: 'دراسة الجدوى',
    financial: 'النموذج المالي',
    tasks: 'المهام',
    documents: 'المستندات',
    documentsCenter: 'مركز المستندات',
    kpis: 'المؤشرات',
    ai: 'مستشار AI',
    pitchDeck: 'العرض الاستثماري',
    comingSoon: 'سيتم تفعيل هذا القسم في المرحلة القادمة.',
    projectSummary: 'ملخص المشروع',
    financialSnapshot: 'اللقطة المالية',
    timelineSnapshot: 'ملخص الجدول الزمني',
    timelineInsufficient: 'لا توجد بيانات كافية لعرض ملخص الجدول الزمني.',
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
    pitchDeckHint: 'عرض استثماري منظم مبني على بيانات المشروع الحقيقية.',
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
    creatingFeasibilityPdf: 'جاري إنشاء PDF...',
    feasibilityPdfExported: 'تم تصدير PDF بنجاح',
    feasibilityPdfExportError: 'تعذر تصدير PDF، حاول مرة أخرى',
    saveFeasibilityBeforeExport: 'احفظ دراسة الجدوى أولاً قبل التصدير',
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
    edit: 'تعديل',
    delete: 'حذف',
    showMore: 'عرض المزيد',
    showLess: 'عرض أقل',
    recentActivity: 'النشاط الأخير',
    nextSteps: 'الخطوات التالية',
    projectStatus: 'حالة المشروع',
    editProjectIncome: 'تعديل دخل المشروع',
    editProjectExpense: 'تعديل مصروف المشروع',
    deleteProjectIncome: 'حذف دخل المشروع',
    deleteProjectExpense: 'حذف مصروف المشروع',
    saveEdit: 'حفظ التعديل',
    deleteFromProjectOnly: 'حذف من المشروع فقط',
    deleteFromBothProjectAndPersonalRecords: 'حذف من المشروع والسجل الشخصي',
    deleteProjectIncomeBody: 'هل تريد حذف دخل المشروع؟ سيتم حذف هذا الدخل من المشروع فقط.',
    deleteProjectExpenseBody: 'هل تريد حذف مصروف المشروع؟ سيتم حذف هذا المصروف من المشروع فقط.',
    linkedIncomeDeletePrompt: 'هذا الدخل مرتبط أيضاً بالدخل الشخصي. اختر ما تريد حذفه.',
    linkedExpenseDeletePrompt: 'هذا المصروف مرتبط أيضاً بمصاريفك الشخصية. اختر ما تريد حذفه.',
    projectIncomeUpdated: 'تم تحديث دخل المشروع.',
    projectExpenseUpdated: 'تم تحديث مصروف المشروع.',
    projectIncomeDeleted: 'تم حذف دخل المشروع.',
    projectExpenseDeleted: 'تم حذف مصروف المشروع.',
    projectIncomeDeleteError: 'تعذر حذف دخل المشروع حالياً.',
    projectExpenseDeleteError: 'تعذر حذف مصروف المشروع حالياً.',
    updateLinkedPersonalIncomeConfirm: 'هذا الدخل مرتبط بالدخل الشخصي. هل تريد إزالة النسخة الشخصية أيضاً؟',
    updateLinkedPersonalExpenseConfirm: 'هذا المصروف مرتبط بالمصاريف الشخصية. هل تريد إزالة النسخة الشخصية أيضاً؟',
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
    projectExpenses: 'Project Expenses',
    expenseName: 'Expense name',
    amount: 'Amount',
    currency: 'Currency',
    date: 'Date',
    category: 'Category',
    paymentMethod: 'Payment method',
    notes: 'Notes',
    receipt: 'Optional receipt or invoice',
    aiReceiptReading: 'AI receipt reading',
    aiReceiptHelper: 'Upload a receipt or invoice image/PDF so it can be analyzed automatically.',
    readReceipt: 'Read receipt',
    analyzeExpense: 'Analyze expense',
    readingReceipt: 'Reading receipt...',
    analyzingExpense: 'Analyzing expense...',
    receiptReadSuccess: 'Data was extracted. Please review it before saving.',
    receiptReadError: 'Could not analyze the receipt right now. You can enter the data manually.',
    extractedReceiptTitle: 'Receipt reading result',
    applyExtractedData: 'Apply data',
    clearAiResult: 'Clear result',
    confidence: 'Confidence',
    vendorName: 'Vendor name',
    notClear: 'Unclear',
    aiExpenseAnalysis: 'Expense analysis',
    aiExpenseAnalysisError: 'Could not analyze the expense right now. You can still save it manually.',
    budgetImpact: 'Budget impact',
    remainingBudgetAfterExpense: 'Remaining after this expense',
    budgetUsedPercent: 'Budget used',
    noProjectBudgetForAnalysis: 'No budget is defined for this project. Add a budget for more accurate analysis.',
    suggestedAction: 'Suggested action',
    expenseAction_approve: 'Approve',
    expenseAction_review: 'Review',
    expenseAction_reduce: 'Reduce',
    expenseAction_move_category: 'Move category',
    expenseAction_attach_document: 'Attach supporting document',
    amountLevel: 'Amount level',
    amountLevel_low: 'Low',
    amountLevel_normal: 'Normal',
    amountLevel_high: 'High',
    amountLevel_unknown: 'Unknown',
    paidFromPersonalBudget: 'Paid from personal budget',
    doNotIncludeInPersonalBudget: 'This expense will not affect your personal spending unless you choose that.',
    includeInPersonalBudget: 'This expense will also appear on the personal expenses page marked as Project Expense.',
    projectExpense: 'Project Expense',
    totalProjectExpenses: 'Total Project Expenses',
    projectExpensesThisMonth: 'Project expenses this month',
    personalBudgetProjectExpenses: 'Paid from personal budget',
    noProjectExpensesYet: 'No project expenses have been recorded for this project.',
    actualVsPlanned: 'Actual vs Planned',
    saveProjectExpense: 'Save Project Expense',
    cancel: 'Cancel',
    general: 'General',
    operations: 'Operations',
    marketingExpense: 'Marketing',
    payroll: 'Payroll',
    rent: 'Rent',
    equipment: 'Equipment',
    licenses: 'Licenses',
    cash: 'Cash',
    card: 'Card',
    transfer: 'Transfer',
    projectExpenseSaved: 'Project expense saved.',
    projectExpenseSaveError: 'Could not save the project expense right now.',
    requiredExpenseName: 'Enter the expense name.',
    requiredExpenseAmount: 'Enter a valid amount.',
    missingDataChecklist: 'Missing data checklist',
    addProjectExpensesHint: 'Add project expenses to show actual vs planned.',
    addFinancialModelHint: 'Add the financial model to calculate project readiness.',
    addTasksHint: 'Add tasks to show project progress.',
    addIncome: 'Add Project Income',
    projectIncome: 'Project Income',
    incomeName: 'Income name',
    incomeSource: 'Source / category',
    source: 'Source',
    transferredToPersonalIncome: 'Transferred to personal income',
    doNotIncludeInPersonalIncome: 'This income does not affect your personal income unless you choose it.',
    includeInPersonalIncome: 'This income will also appear on the personal income page with a Project Income label.',
    totalProjectIncome: 'Total Project Income',
    projectIncomeThisMonth: 'Project income this month',
    personalIncomeProjectIncome: 'Transferred to personal income',
    noProjectIncomeYet: 'No income is recorded for this project yet.',
    actualVsExpected: 'Actual vs Expected',
    saveProjectIncome: 'Save Project Income',
    projectIncomeSaved: 'Project income saved.',
    projectIncomeSaveError: 'Could not save project income right now.',
    requiredIncomeName: 'Enter income name.',
    requiredIncomeAmount: 'Enter a valid amount.',
    salesIncome: 'Sales',
    servicesIncome: 'Services',
    rentalIncome: 'Rental',
    investmentIncome: 'Investment',
    otherIncomeSource: 'Other source',
    analyzeProject: 'Analyze Project',
    chooseJurisdiction: 'Choose Jurisdiction',
    back: 'Back to My Projects',
    signIn: 'Sign in to view your project details.',
    notFound: 'Project not found.',
    overview: 'Overview',
    feasibility: 'Feasibility',
    financial: 'Financial Model',
    tasks: 'Tasks',
    documents: 'Documents',
    documentsCenter: 'Documents Center',
    kpis: 'KPIs',
    ai: 'AI Advisor',
    pitchDeck: 'Pitch Deck',
    comingSoon: 'This section will be activated in the next phase.',
    projectSummary: 'Project Summary',
    financialSnapshot: 'Financial Snapshot',
    timelineSnapshot: 'Timeline Snapshot',
    timelineInsufficient: 'Not enough data to show the timeline summary.',
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
    pitchDeckHint: 'Structured investor deck based on real project data.',
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
    creatingFeasibilityPdf: 'Creating PDF...',
    feasibilityPdfExported: 'PDF exported successfully',
    feasibilityPdfExportError: 'Could not export PDF, please try again',
    saveFeasibilityBeforeExport: 'Save the feasibility study before exporting',
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
    edit: 'Edit',
    delete: 'Delete',
    showMore: 'Show more',
    showLess: 'Show less',
    recentActivity: 'Recent Activity',
    nextSteps: 'Next Steps',
    projectStatus: 'Project Status',
    editProjectIncome: 'Edit Project Income',
    editProjectExpense: 'Edit Project Expense',
    deleteProjectIncome: 'Delete Project Income',
    deleteProjectExpense: 'Delete Project Expense',
    saveEdit: 'Save Changes',
    deleteFromProjectOnly: 'Delete from project only',
    deleteFromBothProjectAndPersonalRecords: 'Delete from project and personal records',
    deleteProjectIncomeBody: 'Do you want to delete this project income? This will delete it from the project only.',
    deleteProjectExpenseBody: 'Do you want to delete this project expense? This will delete it from the project only.',
    linkedIncomeDeletePrompt: 'This income is also linked to personal income. Choose what you want to delete.',
    linkedExpenseDeletePrompt: 'This expense is also linked to personal expenses. Choose what you want to delete.',
    projectIncomeUpdated: 'Project income updated.',
    projectExpenseUpdated: 'Project expense updated.',
    projectIncomeDeleted: 'Project income deleted.',
    projectExpenseDeleted: 'Project expense deleted.',
    projectIncomeDeleteError: 'Could not delete project income right now.',
    projectExpenseDeleteError: 'Could not delete project expense right now.',
    updateLinkedPersonalIncomeConfirm: 'This income is linked to personal income. Do you want to remove the personal copy too?',
    updateLinkedPersonalExpenseConfirm: 'This expense is linked to personal expenses. Do you want to remove the personal copy too?',
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
    projectExpenses: 'Dépenses du projet',
    expenseName: 'Nom de la dépense',
    amount: 'Montant',
    currency: 'Devise',
    date: 'Date',
    category: 'Catégorie',
    paymentMethod: 'Mode de paiement',
    notes: 'Notes',
    receipt: 'Reçu ou facture optionnel',
    aiReceiptReading: 'Lecture IA du reçu',
    aiReceiptHelper: 'Importez une image ou un PDF de reçu/facture pour une analyse automatique.',
    readReceipt: 'Lire le reçu',
    analyzeExpense: 'Analyser la dépense',
    readingReceipt: 'Lecture du reçu...',
    analyzingExpense: 'Analyse de la dépense...',
    receiptReadSuccess: 'Les données ont été extraites. Vérifiez-les avant l’enregistrement.',
    receiptReadError: 'Impossible d’analyser le reçu pour le moment. Vous pouvez saisir les données manuellement.',
    extractedReceiptTitle: 'Résultat de lecture du reçu',
    applyExtractedData: 'Appliquer les données',
    clearAiResult: 'Effacer le résultat',
    confidence: 'Confiance',
    vendorName: 'Nom du fournisseur',
    notClear: 'Peu clair',
    aiExpenseAnalysis: 'Analyse de la dépense',
    aiExpenseAnalysisError: 'Impossible d’analyser la dépense pour le moment. Vous pouvez l’enregistrer manuellement.',
    budgetImpact: 'Impact sur le budget',
    remainingBudgetAfterExpense: 'Restant après cette dépense',
    budgetUsedPercent: 'Budget utilisé',
    noProjectBudgetForAnalysis: 'Aucun budget n’est défini pour ce projet. Ajoutez un budget pour une analyse plus précise.',
    suggestedAction: 'Action suggérée',
    expenseAction_approve: 'Approuver',
    expenseAction_review: 'Vérifier',
    expenseAction_reduce: 'Réduire',
    expenseAction_move_category: 'Changer de catégorie',
    expenseAction_attach_document: 'Joindre un document',
    amountLevel: 'Niveau du montant',
    amountLevel_low: 'Faible',
    amountLevel_normal: 'Normal',
    amountLevel_high: 'Élevé',
    amountLevel_unknown: 'Inconnu',
    paidFromPersonalBudget: 'Payé depuis mon budget personnel',
    doNotIncludeInPersonalBudget: 'Cette dépense n’affecte pas vos dépenses personnelles sauf si vous le choisissez.',
    includeInPersonalBudget: 'Cette dépense apparaîtra aussi dans les dépenses personnelles avec le libellé Dépense de projet.',
    projectExpense: 'Dépense de projet',
    totalProjectExpenses: 'Total des dépenses du projet',
    projectExpensesThisMonth: 'Dépenses du projet ce mois-ci',
    personalBudgetProjectExpenses: 'Payé depuis le budget personnel',
    noProjectExpensesYet: 'Aucune dépense enregistrée pour ce projet.',
    actualVsPlanned: 'Réel vs prévu',
    saveProjectExpense: 'Enregistrer la dépense',
    cancel: 'Annuler',
    general: 'Général',
    operations: 'Opérations',
    marketingExpense: 'Marketing',
    payroll: 'Salaires',
    rent: 'Loyer',
    equipment: 'Équipement',
    licenses: 'Licences',
    cash: 'Espèces',
    card: 'Carte',
    transfer: 'Virement',
    projectExpenseSaved: 'Dépense du projet enregistrée.',
    projectExpenseSaveError: 'Impossible d’enregistrer la dépense du projet pour le moment.',
    requiredExpenseName: 'Saisissez le nom de la dépense.',
    requiredExpenseAmount: 'Saisissez un montant valide.',
    missingDataChecklist: 'Données à compléter',
    addProjectExpensesHint: 'Ajoutez les dépenses du projet pour afficher le réel vs prévu.',
    addFinancialModelHint: 'Ajoutez le modèle financier pour calculer la préparation du projet.',
    addTasksHint: 'Ajoutez des tâches pour afficher l’avancement du projet.',
    addIncome: 'Ajouter un revenu',
    projectIncome: 'Revenu du projet',
    incomeName: 'Nom du revenu',
    incomeSource: 'Source / catégorie',
    source: 'Source',
    transferredToPersonalIncome: 'Transféré vers mon revenu personnel',
    doNotIncludeInPersonalIncome: 'Ce revenu n’affecte pas votre revenu personnel sauf si vous le choisissez.',
    includeInPersonalIncome: 'Ce revenu apparaîtra aussi sur la page des revenus personnels avec une étiquette Revenu de projet.',
    totalProjectIncome: 'Total des revenus du projet',
    projectIncomeThisMonth: 'Revenus du projet ce mois-ci',
    personalIncomeProjectIncome: 'Transféré vers le revenu personnel',
    noProjectIncomeYet: 'Aucun revenu enregistré pour ce projet.',
    actualVsExpected: 'Réel vs attendu',
    saveProjectIncome: 'Enregistrer le revenu du projet',
    projectIncomeSaved: 'Revenu du projet enregistré.',
    projectIncomeSaveError: 'Impossible d’enregistrer le revenu du projet pour le moment.',
    requiredIncomeName: 'Saisissez le nom du revenu.',
    requiredIncomeAmount: 'Saisissez un montant valide.',
    salesIncome: 'Ventes',
    servicesIncome: 'Services',
    rentalIncome: 'Location',
    investmentIncome: 'Investissement',
    otherIncomeSource: 'Autre source',
    analyzeProject: 'Analyser le projet',
    chooseJurisdiction: 'Choisir la juridiction',
    back: 'Retour à mes projets',
    signIn: 'Connectez-vous pour voir les détails de vos projets.',
    notFound: 'Projet introuvable.',
    overview: 'Vue d’ensemble',
    feasibility: 'Faisabilité',
    financial: 'Modèle financier',
    tasks: 'Tâches',
    documents: 'Documents',
    documentsCenter: 'Centre des documents',
    kpis: 'KPI',
    ai: 'Conseiller IA',
    pitchDeck: 'Pitch Deck',
    comingSoon: 'Cette section sera activée dans la prochaine phase.',
    projectSummary: 'Résumé du projet',
    financialSnapshot: 'Aperçu financier',
    timelineSnapshot: 'Aperçu du calendrier',
    timelineInsufficient: 'Données insuffisantes pour afficher le résumé du calendrier.',
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
    pitchDeckHint: 'Pitch deck structuré basé sur les données réelles du projet.',
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
    creatingFeasibilityPdf: 'Création du PDF...',
    feasibilityPdfExported: 'PDF exporté avec succès',
    feasibilityPdfExportError: 'Impossible d’exporter le PDF, veuillez réessayer',
    saveFeasibilityBeforeExport: 'Enregistrez l’étude de faisabilité avant l’export',
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
    edit: 'Modifier',
    delete: 'Supprimer',
    showMore: 'Afficher plus',
    showLess: 'Afficher moins',
    recentActivity: 'Activité récente',
    nextSteps: 'Prochaines étapes',
    projectStatus: 'Statut du projet',
    editProjectIncome: 'Modifier le revenu du projet',
    editProjectExpense: 'Modifier la dépense du projet',
    deleteProjectIncome: 'Supprimer le revenu du projet',
    deleteProjectExpense: 'Supprimer la dépense du projet',
    saveEdit: 'Enregistrer les modifications',
    deleteFromProjectOnly: 'Supprimer du projet uniquement',
    deleteFromBothProjectAndPersonalRecords: 'Supprimer du projet et des dossiers personnels',
    deleteProjectIncomeBody: 'Voulez-vous supprimer ce revenu du projet ? Il sera supprimé du projet uniquement.',
    deleteProjectExpenseBody: 'Voulez-vous supprimer cette dépense du projet ? Elle sera supprimée du projet uniquement.',
    linkedIncomeDeletePrompt: 'Ce revenu est aussi lié au revenu personnel. Choisissez ce que vous voulez supprimer.',
    linkedExpenseDeletePrompt: 'Cette dépense est aussi liée aux dépenses personnelles. Choisissez ce que vous voulez supprimer.',
    projectIncomeUpdated: 'Revenu du projet mis à jour.',
    projectExpenseUpdated: 'Dépense du projet mise à jour.',
    projectIncomeDeleted: 'Revenu du projet supprimé.',
    projectExpenseDeleted: 'Dépense du projet supprimée.',
    projectIncomeDeleteError: 'Impossible de supprimer le revenu du projet pour le moment.',
    projectExpenseDeleteError: 'Impossible de supprimer la dépense du projet pour le moment.',
    updateLinkedPersonalIncomeConfirm: 'Ce revenu est lié au revenu personnel. Voulez-vous aussi supprimer la copie personnelle ?',
    updateLinkedPersonalExpenseConfirm: 'Cette dépense est liée aux dépenses personnelles. Voulez-vous aussi supprimer la copie personnelle ?',
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
  { id: 'pitchDeck', icon: Presentation, hintKey: 'pitchDeckHint' },
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

function normalizeCurrencyCode(value: unknown, fallback = 'KWD') {
  const code = String(value ?? '').trim().toUpperCase();
  return code || fallback;
}

function formatProjectExpenseMoney(amount: number, currency?: string | null) {
  const code = normalizeCurrencyCode(currency, 'KWD');
  const meta = getCurrency(code);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(safeAmount);
  const symbol = code === 'KWD' ? 'د.ك' : code === 'USD' ? '$' : (meta.symbolAr || meta.symbolEn || code);
  return `${formatted} ${symbol}`;
}

function normalizeProjectExpenseRow(row: ProjectExpenseRow): ProjectExpenseRow {
  return {
    ...row,
    currency: normalizeCurrencyCode(row.currency, 'KWD'),
  };
}

function formatRowMoney(row: CurrencyAmountRow, money: MoneyFormatter, fallbackCurrency = 'KWD') {
  return money(toNum(row.amount), normalizeCurrencyCode(row.currency, fallbackCurrency));
}

function formatRowsByCurrency(rows: CurrencyAmountRow[], money: MoneyFormatter, fallbackCurrency = 'KWD') {
  const totals = new Map<string, number>();
  rows.forEach(row => {
    const currency = normalizeCurrencyCode(row.currency, fallbackCurrency);
    totals.set(currency, (totals.get(currency) ?? 0) + toNum(row.amount));
  });
  return [...totals.entries()]
    .filter(([, total]) => total !== 0)
    .map(([currency, total]) => money(total, currency))
    .join(' + ');
}

function normalizeProjectExpenseCategory(value?: string | null) {
  const category = String(value ?? '').trim().toLowerCase();
  if (!category) return 'general';
  if (['operations', 'operational', 'bills', 'utilities', 'maintenance'].includes(category)) return 'operations';
  if (['marketing', 'marketingexpense', 'ads', 'advertising'].includes(category)) return 'marketingExpense';
  if (['salary', 'salaries', 'payroll', 'wages'].includes(category)) return 'payroll';
  if (['rent', 'lease'].includes(category)) return 'rent';
  if (['equipment', 'technology', 'software', 'tools', 'subscriptions'].includes(category)) return 'equipment';
  if (['license', 'licenses', 'government', 'legal'].includes(category)) return 'licenses';
  return 'general';
}

function formatPercentValue(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${Math.round(value)}%`;
}

function confidencePercent(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const normalized = value > 1 ? value : value * 100;
  return `${Math.round(Math.max(0, Math.min(100, normalized)))}%`;
}

function safeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyProjectExpenseForm(currency = 'KWD'): ProjectExpenseForm {
  return {
    title: '',
    amount: '',
    currency,
    expenseDate: todayInputValue(),
    category: 'general',
    paymentMethod: '',
    notes: '',
    receiptFile: null,
    paidFromPersonalBudget: false,
  };
}

function emptyProjectIncomeForm(currency = 'KWD'): ProjectIncomeForm {
  return {
    title: '',
    amount: '',
    currency,
    incomeDate: todayInputValue(),
    category: 'general',
    source: '',
    description: '',
    notes: '',
    transferredToPersonalIncome: false,
  };
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

function uniqueProjectDocumentCount(rows: any[] = []) {
  const grouped = new Map<string, any>();
  const timestamp = (row: any) => new Date(String(row?.updated_at ?? row?.uploaded_at ?? row?.created_at ?? '')).getTime() || 0;
  for (const row of rows) {
    const sourceUrl = String(row?.source_url ?? '').trim().toLowerCase();
    const key = sourceUrl
      ? [row?.category || '', sourceUrl, row?.document_type || 'uploaded_file'].join('|')
      : `record:${row?.id}`;
    const current = grouped.get(key);
    if (!current || timestamp(row) >= timestamp(current)) grouped.set(key, row);
  }
  return grouped.size;
}

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : String(params?.id ?? '');
  const { user, loading } = useAuth();
  const { lang, dir } = useLanguage();
  const { currency: userCurrency } = useCurrency();
  const tr = (TEXT[lang as Lang] ?? TEXT.ar) as Translation;
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [projectIncome, setProjectIncome] = useState<ProjectIncomeRow[]>([]);
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpenseRow[]>([]);
  const [savings, setSavings] = useState(0);
  const [loadingProject, setLoadingProject] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null;
    if (tab && tabs.some(item => item.id === tab)) setActiveTab(tab);
  }, [searchParams]);
  const [feasibility, setFeasibility] = useState<FeasibilityForm>(() => createEmptyFeasibility());
  const [feasibilityId, setFeasibilityId] = useState<string | null>(null);
  const [feasibilityUpdatedAt, setFeasibilityUpdatedAt] = useState<string | null>(null);
  const [savingFeasibility, setSavingFeasibility] = useState(false);
  const [exportingFeasibilityPdf, setExportingFeasibilityPdf] = useState(false);
  const [notice, setNotice] = useState('');
  const [taskSummary, setTaskSummary] = useState<ProjectTasksSummary>(emptyProjectTasksSummary);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [kpiSummary, setKpiSummary] = useState<ProjectKpiSummary>(emptyProjectKpiSummary);
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
  const [projectIncomeOpen, setProjectIncomeOpen] = useState(false);
  const [projectIncomeSaving, setProjectIncomeSaving] = useState(false);
  const [projectIncomeError, setProjectIncomeError] = useState('');
  const [projectIncomeForm, setProjectIncomeForm] = useState<ProjectIncomeForm>(() => emptyProjectIncomeForm(userCurrency || 'KWD'));
  const [editingProjectIncomeId, setEditingProjectIncomeId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const money = useCallback((amount: number, currency?: string | null) => formatMoney(amount, currency || 'KWD', lang as Lang), [lang]);
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
    const [projectRes, savingsRes, feasibilityRes, taskRes, milestoneRes, documentsRes, financialRes, projectIncomeRes, projectExpensesRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).eq('id', id).maybeSingle(),
      supabase.from('savings_items').select('amount').eq('user_id', user.id),
      supabase
        .from('project_feasibility_studies')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id)
        .maybeSingle(),
      supabase
        .from('project_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id),
      supabase
        .from('project_milestones')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id),
      supabase
        .from('project_documents')
        .select('id,category,source_url,document_type,uploaded_at,created_at,updated_at')
        .eq('user_id', user.id)
        .eq('project_id', id),
      supabase
        .from('project_financial_models')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id)
        .maybeSingle(),
      supabase
        .from('project_income')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id)
        .order('income_date', { ascending: false }),
      supabase
        .from('project_expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', id)
        .order('expense_date', { ascending: false }),
    ]);
    const loadedProject = projectRes.error ? null : (projectRes.data as ProjectRow | null);
    const loadedTasks = taskRes.error ? [] : (taskRes.data ?? []) as ProjectTaskRow[];
    const loadedMilestones = milestoneRes.error ? [] : (milestoneRes.data ?? []) as ProjectMilestoneRow[];
    const loadedDocumentsCount = documentsRes.error ? 0 : uniqueProjectDocumentCount(documentsRes.data ?? []);
    const loadedFeasibility = !feasibilityRes.error && feasibilityRes.data ? feasibilityRes.data as FeasibilityStudyRow : null;
    const loadedProjectIncome = projectIncomeRes.error ? [] : (projectIncomeRes.data ?? []) as ProjectIncomeRow[];
    const loadedProjectExpenses = projectExpensesRes.error
      ? []
      : ((projectExpensesRes.data ?? []) as ProjectExpenseRow[]).map(normalizeProjectExpenseRow);
    setProject(loadedProject);
    setProjectIncome(loadedProjectIncome);
    setProjectExpenses(loadedProjectExpenses);
    if (!savingsRes.error) {
      setSavings(((savingsRes.data ?? []) as SavingsRow[]).reduce((sum, row) => sum + toNum(row.amount), 0));
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
      project: loadedProject,
      financialModel: financialRes.error ? null : financialRes.data,
      feasibilityStudy: loadedFeasibility,
      tasks: loadedTasks,
      milestones: loadedMilestones,
      documentsCount: loadedDocumentsCount,
      actualIncome: loadedProjectIncome.reduce((sum, row) => sum + toNum(row.amount), 0),
      actualExpenses: loadedProjectExpenses.reduce((sum, row) => sum + toNum(row.amount), 0),
    }));
    setLoadingProject(false);
  }, [id, user]);

  useEffect(() => {
    if (!loading && user) loadProject();
    if (!loading && !user) setLoadingProject(false);
  }, [loadProject, loading, user]);

  const projectCurrency = useMemo(() => {
    const notes = parseNotes(project?.notes);
    return String(notes.currency ?? notes.default_currency ?? userCurrency ?? 'KWD');
  }, [project?.notes, userCurrency]);

  const model = useMemo(() => {
    const notes = parseNotes(project?.notes);
    const capital = toNum(notes.capital ?? notes.capital_amount ?? project?.budget);
    const plannedIncome = toNum(notes.monthlyRevenue ?? notes.monthly_revenue ?? notes.total_income);
    const plannedExpenses = toNum(notes.monthlyExpenses ?? notes.monthly_expenses ?? notes.total_expenses);
    const actualProjectIncome = projectIncome.reduce((sum, row) => sum + toNum(row.amount), 0);
    const actualProjectExpenses = projectExpenses.reduce((sum, row) => sum + toNum(row.amount), 0);
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const monthlyProjectIncome = projectIncome
      .filter(row => String(row.income_date ?? row.created_at ?? '').slice(0, 7) === currentMonthKey)
      .reduce((sum, row) => sum + toNum(row.amount), 0);
    const personalIncomeProjectIncome = projectIncome
      .filter(row => row.transferred_to_personal_income === true)
      .reduce((sum, row) => sum + toNum(row.amount), 0);
    const monthlyProjectExpenses = projectExpenses
      .filter(row => String(row.expense_date ?? row.created_at ?? '').slice(0, 7) === currentMonthKey)
      .reduce((sum, row) => sum + toNum(row.amount), 0);
    const personalBudgetProjectExpenses = projectExpenses
      .filter(row => row.paid_from_personal_budget === true)
      .reduce((sum, row) => sum + toNum(row.amount), 0);
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
      notes,
      capital,
      monthlyIncome,
      plannedIncome,
      actualProjectIncome,
      monthlyProjectIncome,
      personalIncomeProjectIncome,
      monthlyExpenses,
      plannedExpenses,
      actualProjectExpenses,
      monthlyProjectExpenses,
      personalBudgetProjectExpenses,
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
  }, [project, projectExpenses, projectIncome, savings, tr.high, tr.low, tr.medium, tr.noData]);

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
    const savedAt = new Date().toISOString();
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
      updated_at: savedAt,
    };
    const { data, error } = await supabase
      .from('project_feasibility_studies')
      .upsert(payload, { onConflict: 'user_id,project_id' })
      .select('id, updated_at')
      .single();
    setSavingFeasibility(false);
    if (error) {
      setNotice(tr.feasibilitySaveError);
      return;
    }
    setFeasibilityId(data?.id ?? feasibilityId);
    setFeasibilityUpdatedAt(data?.updated_at ?? savedAt);
    setNotice(tr.feasibilitySaved);
  };

  const exportFeasibilityPdf = async () => {
    if (!project || !feasibilityId) {
      setNotice(tr.saveFeasibilityBeforeExport);
      return;
    }
    setExportingFeasibilityPdf(true);
    setNotice('');
    try {
      const row = buildFeasibilityStudyExportRow({
        projectName: projectTitle,
        currency: projectCurrency,
        financialData: feasibility.financial,
        feasibilityScore: feasibilityMetrics.score,
        feasibilityStatus: feasibilityMetrics.status,
        reportDate: feasibilityUpdatedAt,
      }, lang as Lang);
      printFeasibilityStudyToPdf({
        title: tr.exportFeasibilityPdf,
        rows: [row],
        lang: lang as Lang,
        dir: dir as 'rtl' | 'ltr',
      });
      setNotice(tr.feasibilityPdfExported);
    } catch (error) {
      console.error('Feasibility PDF export failed', error);
      setNotice(tr.feasibilityPdfExportError);
    } finally {
      setExportingFeasibilityPdf(false);
    }
  };

  const resetProjectExpenseAiState = () => {
    setProjectExpenseAiError('');
    setProjectExpenseReceiptAnalysis(null);
    setProjectExpenseAiAnalysis(null);
    setReceiptReading(false);
    setExpenseAnalyzing(false);
  };

  const openProjectExpenseModal = () => {
    setProjectExpenseError('');
    resetProjectExpenseAiState();
    setEditingProjectExpenseId(null);
    setProjectExpenseForm(emptyProjectExpenseForm(normalizeCurrencyCode(projectCurrency, 'KWD')));
    setProjectExpenseOpen(true);
  };

  const openEditProjectExpenseModal = (expense: ProjectExpenseRow) => {
    setProjectExpenseError('');
    resetProjectExpenseAiState();
    setEditingProjectExpenseId(expense.id);
    setProjectExpenseAiAnalysis(expense.ai_analysis ?? null);
    setProjectExpenseForm({
      title: expense.title ?? '',
      amount: String(expense.amount ?? ''),
      currency: normalizeCurrencyCode(expense.currency, 'KWD'),
      expenseDate: String(expense.expense_date ?? '').slice(0, 10) || todayInputValue(),
      category: expense.category || 'general',
      paymentMethod: expense.payment_method || '',
      notes: expense.notes || '',
      receiptFile: null,
      paidFromPersonalBudget: expense.paid_from_personal_budget === true,
    });
    setProjectExpenseOpen(true);
  };

  const openProjectIncomeModal = () => {
    setProjectIncomeError('');
    setEditingProjectIncomeId(null);
    setProjectIncomeForm(emptyProjectIncomeForm(projectCurrency));
    setProjectIncomeOpen(true);
  };

  const openEditProjectIncomeModal = (income: ProjectIncomeRow) => {
    setProjectIncomeError('');
    setEditingProjectIncomeId(income.id);
    setProjectIncomeForm({
      title: income.title ?? '',
      amount: String(income.amount ?? ''),
      currency: income.currency || projectCurrency,
      incomeDate: String(income.income_date ?? '').slice(0, 10) || todayInputValue(),
      category: income.category || 'general',
      source: income.source || '',
      description: income.description || '',
      notes: income.notes || '',
      transferredToPersonalIncome: income.transferred_to_personal_income === true,
    });
    setProjectIncomeOpen(true);
  };

  useEffect(() => {
    if (!projectExpenseOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProjectExpenseOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [projectExpenseOpen]);

  useEffect(() => {
    if (!projectIncomeOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProjectIncomeOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [projectIncomeOpen]);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDeleteTarget(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteTarget]);

  const uploadProjectExpenseReceipt = async (file: File, expenseId: string) => {
    if (!user || !file) return null;
    const safeName = file.name.replace(/[^\w.-]+/g, '-');
    const path = `${user.id}/project-expenses/${expenseId}-${safeName}`;
    const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
    if (error) return null;
    return supabase.storage.from('receipts').getPublicUrl(path).data.publicUrl;
  };

  const applyReceiptAnalysisToExpenseForm = (analysis: ProjectExpenseReceiptAnalysis) => {
    const extracted = analysis.extracted;
    const title = safeText(extracted.title) || safeText(extracted.vendorName);
    setProjectExpenseForm(prev => ({
      ...prev,
      title: title || prev.title,
      amount: extracted.amount && extracted.amount > 0 ? String(extracted.amount) : prev.amount,
      currency: normalizeCurrencyCode(extracted.currency, prev.currency || projectCurrency || 'KWD'),
      expenseDate: safeText(extracted.invoiceDate) || prev.expenseDate,
      category: normalizeProjectExpenseCategory(extracted.category || prev.category),
      notes: safeText(extracted.notes) || prev.notes,
    }));
  };

  const readProjectExpenseReceipt = async () => {
    if (!projectExpenseForm.receiptFile) {
      setProjectExpenseAiError(tr.receiptReadError);
      return;
    }
    setReceiptReading(true);
    setProjectExpenseAiError('');
    setProjectExpenseReceiptAnalysis(null);
    try {
      const formData = new FormData();
      formData.append('file', projectExpenseForm.receiptFile);
      formData.append('defaultCurrency', normalizeCurrencyCode(projectExpenseForm.currency, projectCurrency || 'KWD'));
      const response = await fetch('/api/invoices/analyze', { method: 'POST', body: formData });
      const payload = await response.json().catch(() => null) as any;
      if (!response.ok || !payload?.ok) {
        setProjectExpenseAiError(payload?.message || tr.receiptReadError);
        return;
      }
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
    } catch (error) {
      console.error('Project expense receipt analysis failed', {
        errorName: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : 'receipt_analysis_failed',
      });
      setProjectExpenseAiError(tr.receiptReadError);
    } finally {
      setReceiptReading(false);
    }
  };

  const analyzeProjectExpense = async () => {
    if (!user || !project) return;
    const amount = toNum(projectExpenseForm.amount);
    if (amount <= 0) {
      setProjectExpenseAiError(tr.requiredExpenseAmount);
      return;
    }
    setExpenseAnalyzing(true);
    setProjectExpenseAiError('');
    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      if (!token) {
        setProjectExpenseAiError(tr.aiExpenseAnalysisError);
        return;
      }
      const response = await fetch(`/api/projects/${project.id}/expense-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lang,
          expense: {
            title: projectExpenseForm.title.trim(),
            amount,
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
      const payload = await response.json().catch(() => null) as any;
      if (!response.ok || !payload?.ok) {
        setProjectExpenseAiError(payload?.message || tr.aiExpenseAnalysisError);
        return;
      }
      setProjectExpenseAiAnalysis(payload.analysis as ProjectExpenseAiAnalysis);
    } catch (error) {
      console.error('Project expense analysis failed', {
        errorName: error instanceof Error ? error.name : 'unknown',
        message: error instanceof Error ? error.message : 'expense_analysis_failed',
      });
      setProjectExpenseAiError(tr.aiExpenseAnalysisError);
    } finally {
      setExpenseAnalyzing(false);
    }
  };

  const saveProjectExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !project) return;
    const title = projectExpenseForm.title.trim();
    const amount = toNum(projectExpenseForm.amount);
    if (!title) {
      setProjectExpenseError(tr.requiredExpenseName);
      return;
    }
    if (amount <= 0) {
      setProjectExpenseError(tr.requiredExpenseAmount);
      return;
    }

    setProjectExpenseSaving(true);
    setProjectExpenseError('');
    const existingExpense = editingProjectExpenseId ? projectExpenses.find(row => row.id === editingProjectExpenseId) ?? null : null;
    const shouldRemoveLinkedPersonal = Boolean(existingExpense?.personal_expense_id && !projectExpenseForm.paidFromPersonalBudget);
    if (shouldRemoveLinkedPersonal && !window.confirm(tr.updateLinkedPersonalExpenseConfirm)) {
      setProjectExpenseSaving(false);
      return;
    }
    const expenseId = editingProjectExpenseId ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    const receiptUrl = projectExpenseForm.receiptFile ? await uploadProjectExpenseReceipt(projectExpenseForm.receiptFile, expenseId) : null;
    const payload = {
      id: expenseId,
      user_id: user.id,
      project_id: project.id,
      title,
      amount,
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

    const projectExpenseQuery = supabase.from('project_expenses');
    const { data, error } = editingProjectExpenseId
      ? await projectExpenseQuery.update(payload).eq('id', editingProjectExpenseId).eq('user_id', user.id).select('*').single()
      : await projectExpenseQuery.insert(payload).select('*').single();

    if (error) {
      setProjectExpenseSaving(false);
      setProjectExpenseError(tr.projectExpenseSaveError);
      return;
    }

    let createdExpense = normalizeProjectExpenseRow(data as ProjectExpenseRow);
    if (projectExpenseForm.paidFromPersonalBudget) {
      const personalPayload = {
        user_id: user.id,
        name: `${tr.projectExpense}: ${title}`,
        amount,
        currency: payload.currency,
        category: 'project_expense',
        date: payload.expense_date,
        payment_method: payload.payment_method,
        notes: payload.notes,
        receipt_image_url: receiptUrl,
        project_id: project.id,
        project_expense_id: createdExpense.id,
        paid_from_personal_budget: true,
        enhanced: {
          source: 'project_expense',
          project_id: project.id,
          project_expense_id: createdExpense.id,
          project_name: project.name ?? '',
          paid_from_personal_budget: true,
          ai_analysis: projectExpenseAiAnalysis ?? existingExpense?.ai_analysis ?? null,
        },
        updated_at: new Date().toISOString(),
      };
      const personalResult = createdExpense.personal_expense_id
        ? await supabase
          .from('expense_items')
          .update(personalPayload)
          .eq('id', createdExpense.personal_expense_id)
          .eq('user_id', user.id)
          .select('id')
          .single()
        : await supabase
          .from('expense_items')
          .insert(personalPayload)
          .select('id')
          .single();
      if (!personalResult.error && personalResult.data?.id) {
        await supabase
          .from('project_expenses')
          .update({ personal_expense_id: personalResult.data.id })
          .eq('id', createdExpense.id)
          .eq('user_id', user.id);
        createdExpense = { ...createdExpense, personal_expense_id: personalResult.data.id };
      }
    } else if (shouldRemoveLinkedPersonal && existingExpense?.personal_expense_id) {
      await supabase
        .from('expense_items')
        .delete()
        .eq('id', existingExpense.personal_expense_id)
        .eq('user_id', user.id);
      createdExpense = { ...createdExpense, personal_expense_id: null };
    }

    setProjectExpenses(prev => editingProjectExpenseId
      ? prev.map(row => row.id === editingProjectExpenseId ? createdExpense : row)
      : [createdExpense, ...prev]);
    setNotice(editingProjectExpenseId ? tr.projectExpenseUpdated : tr.projectExpenseSaved);
    setProjectExpenseSaving(false);
    setProjectExpenseOpen(false);
    setEditingProjectExpenseId(null);
    resetProjectExpenseAiState();
    setProjectExpenseForm(emptyProjectExpenseForm(normalizeCurrencyCode(projectCurrency, 'KWD')));
  };

  const saveProjectIncome = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !project) return;
    const title = projectIncomeForm.title.trim();
    const amount = toNum(projectIncomeForm.amount);
    if (!title) {
      setProjectIncomeError(tr.requiredIncomeName);
      return;
    }
    if (amount <= 0) {
      setProjectIncomeError(tr.requiredIncomeAmount);
      return;
    }

    setProjectIncomeSaving(true);
    setProjectIncomeError('');
    const existingIncome = editingProjectIncomeId ? projectIncome.find(row => row.id === editingProjectIncomeId) ?? null : null;
    const shouldRemoveLinkedPersonal = Boolean(existingIncome?.personal_income_id && !projectIncomeForm.transferredToPersonalIncome);
    if (shouldRemoveLinkedPersonal && !window.confirm(tr.updateLinkedPersonalIncomeConfirm)) {
      setProjectIncomeSaving(false);
      return;
    }
    const incomeId = editingProjectIncomeId ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    const now = new Date().toISOString();
    const payload = {
      id: incomeId,
      user_id: user.id,
      project_id: project.id,
      title,
      amount,
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

    const projectIncomeQuery = supabase.from('project_income');
    const { data, error } = editingProjectIncomeId
      ? await projectIncomeQuery.update(payload).eq('id', editingProjectIncomeId).eq('user_id', user.id).select('*').single()
      : await projectIncomeQuery.insert(payload).select('*').single();

    if (error) {
      setProjectIncomeSaving(false);
      setProjectIncomeError(tr.projectIncomeSaveError);
      return;
    }

    let createdIncome = data as ProjectIncomeRow;
    if (projectIncomeForm.transferredToPersonalIncome) {
      const personalPayload = {
        user_id: user.id,
        label: `${tr.projectIncome}: ${title}`,
        category: 'project_income',
        amount,
        amount_kwd: payload.currency === 'KWD' ? amount : null,
        exchange_rate: null,
        income_type: 'other',
        status: 'received',
        received_date: payload.income_date,
        currency: payload.currency,
        source_name: payload.source || project.name || tr.projectIncome,
        notes: payload.notes,
        is_recurring: false,
        frequency: null,
        recurrence_start_date: null,
        recurrence_end_date: null,
        parent_recurring_income_id: null,
        generated_for_date: null,
        confirmed_at: now,
        project_id: project.id,
        project_income_id: createdIncome.id,
        transferred_to_personal_income: true,
        updated_at: now,
      };
      const personalResult = createdIncome.personal_income_id
        ? await supabase
          .from('monthly_income_sources')
          .update(personalPayload)
          .eq('id', createdIncome.personal_income_id)
          .eq('user_id', user.id)
          .select('id')
          .single()
        : await supabase
          .from('monthly_income_sources')
          .insert(personalPayload)
          .select('id')
          .single();
      if (!personalResult.error && personalResult.data?.id) {
        await supabase
          .from('project_income')
          .update({ personal_income_id: personalResult.data.id })
          .eq('id', createdIncome.id)
          .eq('user_id', user.id);
        createdIncome = { ...createdIncome, personal_income_id: personalResult.data.id };
      }
    } else if (shouldRemoveLinkedPersonal && existingIncome?.personal_income_id) {
      await supabase
        .from('monthly_income_sources')
        .delete()
        .eq('id', existingIncome.personal_income_id)
        .eq('user_id', user.id);
      createdIncome = { ...createdIncome, personal_income_id: null };
    }

    setProjectIncome(prev => editingProjectIncomeId
      ? prev.map(row => row.id === editingProjectIncomeId ? createdIncome : row)
      : [createdIncome, ...prev]);
    setNotice(editingProjectIncomeId ? tr.projectIncomeUpdated : tr.projectIncomeSaved);
    setProjectIncomeSaving(false);
    setProjectIncomeOpen(false);
    setEditingProjectIncomeId(null);
    setProjectIncomeForm(emptyProjectIncomeForm(projectCurrency));
  };

  const requestDeleteProjectIncome = (row: ProjectIncomeRow) => {
    setDeleteError('');
    setDeleteTarget({ type: 'income', row });
  };

  const requestDeleteProjectExpense = (row: ProjectExpenseRow) => {
    setDeleteError('');
    setDeleteTarget({ type: 'expense', row });
  };

  const confirmDeleteTransaction = async (deleteLinkedPersonal: boolean) => {
    if (!user || !deleteTarget) return;
    setDeleteSaving(true);
    setDeleteError('');

    if (deleteTarget.type === 'income') {
      const row = deleteTarget.row;
      if (deleteLinkedPersonal && row.personal_income_id) {
        await supabase
          .from('monthly_income_sources')
          .delete()
          .eq('id', row.personal_income_id)
          .eq('user_id', user.id);
      }
      const { error } = await supabase
        .from('project_income')
        .delete()
        .eq('id', row.id)
        .eq('user_id', user.id);
      setDeleteSaving(false);
      if (error) {
        setDeleteError(tr.projectIncomeDeleteError);
        return;
      }
      setProjectIncome(prev => prev.filter(item => item.id !== row.id));
      setNotice(tr.projectIncomeDeleted);
      setDeleteTarget(null);
      return;
    }

    const row = deleteTarget.row;
    if (deleteLinkedPersonal && row.personal_expense_id) {
      await supabase
        .from('expense_items')
        .delete()
        .eq('id', row.personal_expense_id)
        .eq('user_id', user.id);
    }
    const { error } = await supabase
      .from('project_expenses')
      .delete()
      .eq('id', row.id)
      .eq('user_id', user.id);
    setDeleteSaving(false);
    if (error) {
      setDeleteError(tr.projectExpenseDeleteError);
      return;
    }
    setProjectExpenses(prev => prev.filter(item => item.id !== row.id));
    setNotice(tr.projectExpenseDeleted);
    setDeleteTarget(null);
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

  const moneyOrNoData = (value: number) => (value > 0 || value < 0 ? money(value, projectCurrency) : tr.noData);

  const projectTitle = project?.name || tr.projectName;
  const statusProjectLabel = tr[model.statusKey];
  const typeLabel = tr[model.typeKey];
  const riskText = tr[riskCopyKey(model.risk)];
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const heroMetrics = [
    { label: tr.projectType, value: typeLabel },
    { label: tr.status, value: statusProjectLabel },
    { label: tr.capital, value: money(model.capital, projectCurrency) },
    { label: tr.financialTarget, value: model.target > 0 ? money(model.target, projectCurrency) : tr.noData },
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
            <Link href="/projects" className="back-link" aria-label={tr.back}><BackIcon size={17} aria-hidden="true" /> {tr.back}</Link>
            <span>{tr.workspace}</span>
            <h1>{project.emoji || '🚀'} {projectTitle}</h1>
            <p>{model.description || tr.projectSummary}</p>
          </div>
          <div className="hero-actions">
            <button type="button" onClick={() => router.push('/projects')}><Pencil size={16} /> {tr.editProject}</button>
            <button type="button" onClick={openProjectExpenseModal}><Plus size={16} /> {tr.addExpense}</button>
            <button type="button" onClick={openProjectIncomeModal}><Plus size={16} /> {tr.addIncome}</button>
            <button type="button" onClick={() => setActiveTab('ai')}><Bot size={16} /> {tr.analyzeProject}</button>
            <button type="button" onClick={() => router.push(`/business-hub?project=${project.id}#jurisdiction-wizard-module`)}><Globe2 size={16} /> {tr.chooseJurisdiction}</button>
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
            projectIncome={projectIncome}
            projectExpenses={projectExpenses}
            openProjectIncomeModal={openProjectIncomeModal}
            openProjectExpenseModal={openProjectExpenseModal}
            onEditProjectIncome={openEditProjectIncomeModal}
            onEditProjectExpense={openEditProjectExpenseModal}
            onDeleteProjectIncome={requestDeleteProjectIncome}
            onDeleteProjectExpense={requestDeleteProjectExpense}
            money={money}
            projectCurrency={projectCurrency}
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
              <Metric label={tr.monthlyProfitEstimate} value={feasibilityMetrics.hasFinancialInput ? money(feasibilityMetrics.monthlyProfit, projectCurrency) : tr.noData} />
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
                  <Metric label={tr.monthlyProfitEstimate} value={feasibilityMetrics.hasFinancialInput ? money(feasibilityMetrics.monthlyProfit, projectCurrency) : tr.noData} />
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
                    title={savingFeasibility ? tr.saveFeasibilityStudy : undefined}
                  >
                    <Save size={16} />
                    {savingFeasibility ? tr.saveFeasibilityStudy : tr.saveFeasibilityStudy}
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={exportFeasibilityPdf}
                    disabled={exportingFeasibilityPdf}
                    aria-disabled={exportingFeasibilityPdf}
                    aria-label={tr.exportFeasibilityPdf}
                    title={exportingFeasibilityPdf ? tr.creatingFeasibilityPdf : undefined}
                  >
                    <FileText size={16} />
                    {exportingFeasibilityPdf ? tr.creatingFeasibilityPdf : tr.exportFeasibilityPdf}
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
            defaultCurrency={projectCurrency}
            actualIncome={model.actualProjectIncome}
            actualExpenses={model.actualProjectExpenses}
            lang={lang}
          />
        ) : activeTab === 'tasks' ? (
          <ProjectTasksTab
            userId={user.id}
            projectId={project.id}
            currency={projectCurrency}
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
            currency={projectCurrency}
            lang={lang}
            onSummaryChange={setKpiSummary}
          />
        ) : activeTab === 'ai' ? (
          <ProjectAiAdvisorTab
            projectId={project.id}
            lang={lang as Lang}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        ) : activeTab === 'pitchDeck' ? (
          <ProjectPitchDeckTab
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

      {projectExpenseOpen ? (
        <AppModal
          open={projectExpenseOpen}
          title={editingProjectExpenseId ? tr.editProjectExpense : tr.addExpense}
          subtitle={tr.doNotIncludeInPersonalBudget}
          closeLabel={tr.cancel}
          onClose={() => setProjectExpenseOpen(false)}
          size="md"
          className="expense-modal"
          bodyClassName="project-transaction-modal-body"
          footerClassName="modal-actions"
          footer={(
            <>
              <button type="button" className="secondary-action" onClick={() => setProjectExpenseOpen(false)}>{tr.cancel}</button>
              <button type="submit" form="project-expense-form" className="primary-save" disabled={projectExpenseSaving}>
                <Save size={16} />
                {projectExpenseSaving ? (editingProjectExpenseId ? tr.saveEdit : tr.saveProjectExpense) : (editingProjectExpenseId ? tr.saveEdit : tr.saveProjectExpense)}
              </button>
            </>
          )}
        >
            {projectExpenseError ? <div className="modal-error" role="alert">{projectExpenseError}</div> : null}

            <form id="project-expense-form" className="project-expense-form-grid" onSubmit={saveProjectExpense}>
              <label className="form-field wide">
                <span>{tr.expenseName}</span>
                <input
                  value={projectExpenseForm.title}
                  onChange={event => setProjectExpenseForm(prev => ({ ...prev, title: event.target.value }))}
                  placeholder={tr.expenseName}
                  required
                />
              </label>

              <label className="form-field">
                <span>{tr.amount}</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={projectExpenseForm.amount}
                  onChange={event => setProjectExpenseForm(prev => ({ ...prev, amount: event.target.value }))}
                  required
                />
              </label>

              <div className="form-field">
                <span>{tr.currency}</span>
                <CurrencySelect
                  value={projectExpenseForm.currency}
                  onChange={value => setProjectExpenseForm(prev => ({ ...prev, currency: value }))}
                  lang={lang as Lang}
                  ariaLabel={tr.currency}
                  className="project-currency-select"
                />
              </div>

              <label className="form-field">
                <span>{tr.date}</span>
                <input
                  type="date"
                  value={projectExpenseForm.expenseDate}
                  onChange={event => setProjectExpenseForm(prev => ({ ...prev, expenseDate: event.target.value }))}
                />
              </label>

              <label className="form-field">
                <span>{tr.category}</span>
                <select value={projectExpenseForm.category} onChange={event => setProjectExpenseForm(prev => ({ ...prev, category: event.target.value }))}>
                  {['general', 'operations', 'marketingExpense', 'payroll', 'rent', 'equipment', 'licenses'].map(item => (
                    <option key={item} value={item}>{tr[item as keyof Translation] as string}</option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>{tr.paymentMethod}</span>
                <select value={projectExpenseForm.paymentMethod} onChange={event => setProjectExpenseForm(prev => ({ ...prev, paymentMethod: event.target.value }))}>
                  <option value="">-</option>
                  {['cash', 'card', 'transfer'].map(item => (
                    <option key={item} value={item}>{tr[item as keyof Translation] as string}</option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>{tr.receipt}</span>
                <small>{tr.aiReceiptHelper}</small>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={event => {
                    setProjectExpenseAiError('');
                    setProjectExpenseReceiptAnalysis(null);
                    setProjectExpenseForm(prev => ({ ...prev, receiptFile: event.target.files?.[0] ?? null }));
                  }}
                />
                {projectExpenseForm.receiptFile ? <em>{projectExpenseForm.receiptFile.name}</em> : null}
              </label>

              <section className="project-expense-ai-panel wide" aria-label={tr.aiReceiptReading}>
                <div className="project-expense-ai-head">
                  <span className="project-expense-ai-icon"><Bot size={18} /></span>
                  <div>
                    <strong>{tr.aiReceiptReading}</strong>
                    <small>{tr.aiReceiptHelper}</small>
                  </div>
                </div>
                <div className="project-expense-ai-actions">
                  <button type="button" className="secondary-action" onClick={readProjectExpenseReceipt} disabled={receiptReading || !projectExpenseForm.receiptFile}>
                    <ReceiptText size={16} />
                    {receiptReading ? tr.readingReceipt : tr.readReceipt}
                  </button>
                  <button type="button" className="primary-save" onClick={analyzeProjectExpense} disabled={expenseAnalyzing}>
                    <Bot size={16} />
                    {expenseAnalyzing ? tr.analyzingExpense : tr.analyzeExpense}
                  </button>
                </div>

                {projectExpenseAiError ? <div className="project-expense-ai-alert" role="alert">{projectExpenseAiError}</div> : null}

                {projectExpenseReceiptAnalysis ? (
                  <article className="project-expense-ai-result">
                    <div className="project-expense-ai-result-head">
                      <strong>{tr.extractedReceiptTitle}</strong>
                      <span>{projectExpenseReceiptAnalysis.warnings?.length ? tr.needsReview : tr.receiptReadSuccess}</span>
                    </div>
                    <div className="project-expense-extracted-grid">
                      <div><span>{tr.expenseName}</span><b>{projectExpenseReceiptAnalysis.extracted.title || tr.notClear}</b></div>
                      <div><span>{tr.vendorName}</span><b>{projectExpenseReceiptAnalysis.extracted.vendorName || tr.notClear}</b></div>
                      <div><span>{tr.amount}</span><b>{projectExpenseReceiptAnalysis.extracted.amount ? formatProjectExpenseMoney(projectExpenseReceiptAnalysis.extracted.amount, projectExpenseReceiptAnalysis.extracted.currency || projectExpenseForm.currency) : tr.notClear}</b></div>
                      <div><span>{tr.currency}</span><b>{projectExpenseReceiptAnalysis.extracted.currency || tr.notClear}</b></div>
                      <div><span>{tr.date}</span><b>{projectExpenseReceiptAnalysis.extracted.invoiceDate || tr.notClear}</b></div>
                      <div><span>{tr.category}</span><b>{projectExpenseReceiptAnalysis.extracted.category ? tr[normalizeProjectExpenseCategory(projectExpenseReceiptAnalysis.extracted.category) as keyof Translation] : tr.notClear}</b></div>
                    </div>
                    <div className="project-expense-confidence-row">
                      <span>{tr.confidence}: {confidencePercent(projectExpenseReceiptAnalysis.confidence?.amount) || tr.needsReview}</span>
                      {projectExpenseReceiptAnalysis.warnings?.length ? <span>{tr.needsReview}</span> : null}
                    </div>
                    <div className="project-expense-ai-actions compact">
                      <button type="button" className="secondary-action" onClick={() => applyReceiptAnalysisToExpenseForm(projectExpenseReceiptAnalysis)}>{tr.applyExtractedData}</button>
                      <button type="button" className="secondary-action" onClick={() => setProjectExpenseReceiptAnalysis(null)}>{tr.clearAiResult}</button>
                    </div>
                  </article>
                ) : null}

                {projectExpenseAiAnalysis ? (
                  <article className="project-expense-ai-result analysis">
                    <div className="project-expense-ai-result-head">
                      <strong>{tr.aiExpenseAnalysis}</strong>
                      <span>{projectExpenseAiAnalysis.source === 'rules' ? tr.needsReview : tr.aiReceiptReading}</span>
                    </div>
                    <p>{projectExpenseAiAnalysis.summary || projectExpenseAiAnalysis.budgetImpact || tr.aiExpenseAnalysis}</p>
                    <div className="project-expense-analysis-grid">
                      <div><span>{tr.category}</span><b>{projectExpenseAiAnalysis.category || tr.notClear}</b></div>
                      <div><span>{tr.amountLevel}</span><b>{tr[`amountLevel_${projectExpenseAiAnalysis.amountLevel || 'unknown'}` as keyof Translation] || tr.amountLevel_unknown}</b></div>
                      <div><span>{tr.suggestedAction}</span><b>{tr[`expenseAction_${projectExpenseAiAnalysis.suggestedAction || 'review'}` as keyof Translation] || tr.expenseAction_review}</b></div>
                      <div><span>{tr.budgetImpact}</span><b>{projectExpenseAiAnalysis.budgetImpact || tr.notClear}</b></div>
                    </div>
                    {projectExpenseAiAnalysis.budget?.plannedBudget ? (
                      <div className="project-expense-budget-impact">
                        <span>{tr.remainingBudgetAfterExpense}: <b>{formatProjectExpenseMoney(projectExpenseAiAnalysis.budget.remainingAfterExpense ?? 0, projectExpenseForm.currency)}</b></span>
                        <span>{tr.budgetUsedPercent}: <b>{formatPercentValue(projectExpenseAiAnalysis.budget.percentageUsed) || tr.notClear}</b></span>
                      </div>
                    ) : (
                      <small className="project-expense-budget-note">{tr.noProjectBudgetForAnalysis}</small>
                    )}
                    {projectExpenseAiAnalysis.warnings?.length ? (
                      <ul className="project-expense-warning-list">
                        {projectExpenseAiAnalysis.warnings.map(item => <li key={item}>{item}</li>)}
                      </ul>
                    ) : null}
                  </article>
                ) : null}
              </section>

              <label className="form-field wide">
                <span>{tr.notes}</span>
                <textarea
                  rows={3}
                  value={projectExpenseForm.notes}
                  onChange={event => setProjectExpenseForm(prev => ({ ...prev, notes: event.target.value }))}
                />
              </label>

              <label className={`budget-checkbox wide ${projectExpenseForm.paidFromPersonalBudget ? 'selected' : ''}`}>
                <input
                  className="budget-checkbox-input"
                  type="checkbox"
                  checked={projectExpenseForm.paidFromPersonalBudget}
                  onChange={event => setProjectExpenseForm(prev => ({ ...prev, paidFromPersonalBudget: event.target.checked }))}
                />
                <span className="budget-checkbox-indicator" aria-hidden="true">
                  <CheckCircle2 size={18} />
                </span>
                <span className="budget-checkbox-copy">
                  <strong>{tr.paidFromPersonalBudget}</strong>
                  <small>{projectExpenseForm.paidFromPersonalBudget ? tr.includeInPersonalBudget : tr.doNotIncludeInPersonalBudget}</small>
                </span>
              </label>
            </form>
        </AppModal>
      ) : null}

      {projectIncomeOpen ? (
        <AppModal
          open={projectIncomeOpen}
          title={editingProjectIncomeId ? tr.editProjectIncome : tr.addIncome}
          subtitle={tr.doNotIncludeInPersonalIncome}
          closeLabel={tr.cancel}
          onClose={() => setProjectIncomeOpen(false)}
          size="md"
          className="expense-modal"
          bodyClassName="project-transaction-modal-body"
          footerClassName="modal-actions"
          footer={(
            <>
              <button type="button" className="secondary-action" onClick={() => setProjectIncomeOpen(false)}>{tr.cancel}</button>
              <button type="submit" form="project-income-form" className="primary-save" disabled={projectIncomeSaving}>
                <Save size={16} />
                {projectIncomeSaving ? (editingProjectIncomeId ? tr.saveEdit : tr.saveProjectIncome) : (editingProjectIncomeId ? tr.saveEdit : tr.saveProjectIncome)}
              </button>
            </>
          )}
        >
            {projectIncomeError ? <div className="modal-error" role="alert">{projectIncomeError}</div> : null}

            <form id="project-income-form" className="project-expense-form-grid" onSubmit={saveProjectIncome}>
              <label className="form-field wide">
                <span>{tr.incomeName}</span>
                <input
                  value={projectIncomeForm.title}
                  onChange={event => setProjectIncomeForm(prev => ({ ...prev, title: event.target.value }))}
                  placeholder={tr.incomeName}
                  required
                />
              </label>

              <label className="form-field">
                <span>{tr.amount}</span>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={projectIncomeForm.amount}
                  onChange={event => setProjectIncomeForm(prev => ({ ...prev, amount: event.target.value }))}
                  required
                />
              </label>

              <div className="form-field">
                <span>{tr.currency}</span>
                <CurrencySelect
                  value={projectIncomeForm.currency}
                  onChange={value => setProjectIncomeForm(prev => ({ ...prev, currency: value }))}
                  lang={lang as Lang}
                  ariaLabel={tr.currency}
                  className="project-currency-select"
                />
              </div>

              <label className="form-field">
                <span>{tr.date}</span>
                <input
                  type="date"
                  value={projectIncomeForm.incomeDate}
                  onChange={event => setProjectIncomeForm(prev => ({ ...prev, incomeDate: event.target.value }))}
                />
              </label>

              <label className="form-field">
                <span>{tr.incomeSource}</span>
                <select value={projectIncomeForm.category} onChange={event => setProjectIncomeForm(prev => ({ ...prev, category: event.target.value }))}>
                  {['general', 'salesIncome', 'servicesIncome', 'rentalIncome', 'investmentIncome', 'otherIncomeSource'].map(item => (
                    <option key={item} value={item}>{tr[item as keyof Translation] as string}</option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>{tr.source}</span>
                <input
                  value={projectIncomeForm.source}
                  onChange={event => setProjectIncomeForm(prev => ({ ...prev, source: event.target.value }))}
                  placeholder={tr.source}
                />
              </label>

              <label className="form-field wide">
                <span>{tr.description}</span>
                <textarea
                  rows={3}
                  value={projectIncomeForm.description}
                  onChange={event => setProjectIncomeForm(prev => ({ ...prev, description: event.target.value }))}
                />
              </label>

              <label className="form-field wide">
                <span>{tr.notes}</span>
                <textarea
                  rows={3}
                  value={projectIncomeForm.notes}
                  onChange={event => setProjectIncomeForm(prev => ({ ...prev, notes: event.target.value }))}
                />
              </label>

              <label className={`budget-checkbox wide ${projectIncomeForm.transferredToPersonalIncome ? 'selected' : ''}`}>
                <input
                  className="budget-checkbox-input"
                  type="checkbox"
                  checked={projectIncomeForm.transferredToPersonalIncome}
                  onChange={event => setProjectIncomeForm(prev => ({ ...prev, transferredToPersonalIncome: event.target.checked }))}
                />
                <span className="budget-checkbox-indicator" aria-hidden="true">
                  <CheckCircle2 size={18} />
                </span>
                <span className="budget-checkbox-copy">
                  <strong>{tr.transferredToPersonalIncome}</strong>
                  <small>{projectIncomeForm.transferredToPersonalIncome ? tr.includeInPersonalIncome : tr.doNotIncludeInPersonalIncome}</small>
                </span>
              </label>
            </form>
        </AppModal>
      ) : null}

      {deleteTarget ? (
        <AppModal
          open={Boolean(deleteTarget)}
          title={deleteTarget.type === 'income' ? tr.deleteProjectIncome : tr.deleteProjectExpense}
          subtitle={deleteTarget.type === 'income' ? tr.deleteProjectIncomeBody : tr.deleteProjectExpenseBody}
          closeLabel={tr.cancel}
          onClose={() => setDeleteTarget(null)}
          size="sm"
          className="delete-modal"
          footerClassName="modal-actions"
          footer={(
            <>
              <button type="button" className="secondary-action" onClick={() => setDeleteTarget(null)} disabled={deleteSaving}>{tr.cancel}</button>
              <button type="button" className="danger-action" onClick={() => confirmDeleteTransaction(false)} disabled={deleteSaving}>{tr.deleteFromProjectOnly}</button>
              {((deleteTarget.type === 'income' && deleteTarget.row.personal_income_id) || (deleteTarget.type === 'expense' && deleteTarget.row.personal_expense_id)) ? (
                <button type="button" className="danger-action strong" onClick={() => confirmDeleteTransaction(true)} disabled={deleteSaving}>{tr.deleteFromBothProjectAndPersonalRecords}</button>
              ) : null}
            </>
          )}
        >
            {((deleteTarget.type === 'income' && deleteTarget.row.personal_income_id) || (deleteTarget.type === 'expense' && deleteTarget.row.personal_expense_id)) ? (
              <p className="delete-linked-note">{deleteTarget.type === 'income' ? tr.linkedIncomeDeletePrompt : tr.linkedExpenseDeletePrompt}</p>
            ) : null}
            {deleteError ? <div className="modal-error" role="alert">{deleteError}</div> : null}
        </AppModal>
      ) : null}

      <style jsx global>{`
        .project-workspace{min-height:100vh;background:var(--sfm-background);color:var(--sfm-primary-dark);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}.project-workspace .sfm-dashboard-page-shell{width:auto;max-width:none;margin:0;margin-inline-start:var(--sidebar-w);margin-inline-end:0;padding:var(--sfm-page-pad-y,24px) var(--sfm-page-pad-x,24px) 60px;overflow-x:clip}.project-workspace .sfm-dashboard-page-content{width:100%;max-width:var(--sfm-page-max,1320px);margin:0 auto;min-width:0}.workspace-content{display:grid;gap:18px;min-width:0}.workspace-hero{position:relative;overflow:hidden;border-radius:24px;padding:26px;background:radial-gradient(circle at 14% 10%,rgba(167,243,240,.26),transparent 30%),linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 50%,var(--sfm-card-dark) 138%);color:var(--sfm-card);box-shadow:0 22px 55px rgba(3,18,37,.18);display:grid;gap:20px;min-width:0}.hero-copy span{color:var(--sfm-soft-cyan);font-size:12px;font-weight:900}.back-link{width:max-content;min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;margin-bottom:14px;border-radius:999px;border:1px solid rgba(167,243,240,.30);background:rgba(255,255,255,.10);color:#FFFFFF;padding:0 16px;font-size:13px;font-weight:950;box-shadow:0 12px 28px rgba(0,0,0,.14),inset 0 0 0 1px rgba(255,255,255,.04);transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease}.back-link svg{flex:0 0 auto}.back-link:hover{transform:translateY(-1px);background:rgba(34,211,238,.15);border-color:rgba(167,243,240,.46);box-shadow:0 16px 34px rgba(0,0,0,.18),0 0 0 1px rgba(167,243,240,.08)}.back-link:active{transform:translateY(0) scale(.99)}.back-link:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.28),0 12px 28px rgba(0,0,0,.14)}.hero-copy h1{margin:8px 0;font-size:clamp(30px,5vw,48px);font-weight:950;line-height:1.08}.hero-copy p{margin:0;color:rgba(234,246,255,.76);line-height:1.8;max-width:820px}.hero-actions{display:flex;flex-wrap:wrap;gap:10px}.hero-actions button{min-height:42px;border-radius:13px;border:1px solid rgba(167,243,240,.28);background:rgba(255,255,255,.10);color:var(--sfm-card);padding:0 14px;display:inline-flex;align-items:center;gap:8px;font-weight:900;font-family:inherit;cursor:pointer}.hero-actions button:first-child,.primary-save{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.hero-metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.hero-metrics div{border:1px solid rgba(167,243,240,.18);background:rgba(234,246,255,.08);border-radius:16px;padding:12px;min-width:0}.hero-metrics small{display:block;color:var(--sfm-soft-cyan);font-weight:900}.hero-metrics strong{display:block;margin-top:5px;color:var(--sfm-card);overflow-wrap:anywhere}.workspace-tabs{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:thin}.workspace-tabs button{flex:0 0 auto;min-height:42px;border:1px solid rgba(29,140,255,.18);border-radius:999px;background:var(--sfm-card);color:var(--sfm-muted);padding:0 14px;display:flex;align-items:center;gap:8px;font-weight:900;font-family:inherit;cursor:pointer}.workspace-tabs button.active,.workspace-tabs button:focus-visible{background:var(--sfm-midnight);color:var(--sfm-soft-cyan);outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16)}.overview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:16px;align-items:start}.overview-grid>.warm-card{grid-column:auto;min-width:0}.warm-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);border-radius:20px;padding:18px;box-shadow:0 14px 34px rgba(3,18,37,.07);min-width:0}.lazy-tab-skeleton{min-height:300px;display:grid;gap:14px;align-content:start}.lazy-tab-skeleton span,.lazy-tab-skeleton i{display:block;border-radius:999px;background:linear-gradient(90deg,rgba(148,163,184,.12),rgba(34,211,238,.13),rgba(148,163,184,.12));background-size:200% 100%;animation:project-tab-shimmer 1.25s linear infinite}.lazy-tab-skeleton span{width:42%;height:18px}.lazy-tab-skeleton i{height:42px}.lazy-tab-skeleton i:nth-child(3){width:82%}.lazy-tab-skeleton i:nth-child(4){width:64%}@keyframes project-tab-shimmer{to{background-position:-200% 0}}.span-6{grid-column:auto}.card-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.card-title h2{margin:0;color:var(--sfm-midnight);font-size:19px}.card-title svg{color:var(--sfm-primary)}.details-list{display:grid;gap:10px;margin:0}.details-list div{display:grid;grid-template-columns:minmax(120px,.35fr) minmax(0,1fr);gap:12px;border-bottom:1px solid rgba(29,140,255,.1);padding-bottom:10px}.details-list dt,.metric small{color:var(--sfm-muted);font-weight:900}.details-list dd{margin:0;color:var(--sfm-primary-dark);font-weight:900;overflow-wrap:anywhere}.badge{display:inline-flex;border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:5px 10px;font-size:12px}.badge.completed{background:#ECFDF5;color:#047857}.badge.paused{background:#FEF2F2;color:#B91C1C}.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.metric,.timeline-list .metric{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px;min-width:0;writing-mode:horizontal-tb;text-orientation:mixed}.metric strong{display:block;margin-top:6px;color:var(--sfm-primary-dark);font-size:18px;overflow-wrap:anywhere}.progress-bar{height:10px;border-radius:999px;background:rgba(29,140,255,.10);overflow:hidden;margin-top:14px}.progress-bar span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--sfm-soft-cyan),var(--sfm-primary))}.timeline-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.timeline-empty{margin:0;border:1px dashed rgba(29,140,255,.24);background:var(--sfm-light-card);color:var(--sfm-muted);border-radius:15px;padding:14px;line-height:1.7;font-weight:900;text-align:start}.risk-card,.quick-card{grid-column:auto}.overview-grid>.task-overview-card,.overview-grid>.kpi-overview-card{grid-column:1 / -1}.risk-badge{display:inline-flex;border-radius:999px;padding:8px 12px;font-weight:950;margin-bottom:10px}.risk-card.low .risk-badge{background:#ECFDF5;color:#047857}.risk-card.medium .risk-badge{background:#FFF7ED;color:#B45309}.risk-card.high .risk-badge{background:#FEF2F2;color:#B91C1C}.risk-card p,.ai-placeholder p{margin:0;color:var(--sfm-muted);line-height:1.7}.overview-link-btn{margin-top:14px;min-height:42px;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;padding:0 14px;font-weight:950;font-family:inherit;cursor:pointer}.overview-link-btn:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16)}.quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.quick-grid button{min-height:44px;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-light-card);color:var(--sfm-midnight);font-weight:900;font-family:inherit;cursor:pointer}.quick-grid button:hover,.quick-grid button:focus-visible{background:rgba(29,140,255,.10);outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.14)}.feasibility-tab{display:grid;gap:16px;min-width:0}.feasibility-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px;align-items:stretch}.score-card{display:grid;align-content:start}.score-row{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:center}.score-number{width:104px;height:104px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--sfm-primary) var(--score-angle, 270deg),rgba(29,140,255,.10) 0);position:relative;box-shadow:inset 0 0 0 12px var(--sfm-light-card)}.score-number strong{font-size:30px;color:var(--sfm-primary-dark)}.score-number span{font-size:12px;color:var(--sfm-muted);font-weight:900}.status-pill{display:inline-flex;border-radius:999px;padding:7px 11px;font-weight:950;font-size:12px}.status-pill.feasible{background:#ECFDF5;color:#047857}.status-pill.needs_review{background:#FFF7ED;color:#B45309}.status-pill.high_risk{background:#FEF2F2;color:#B91C1C}.score-row p{margin:10px 0 0;color:var(--sfm-muted);line-height:1.6}.notice{border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:15px;padding:12px 14px;font-weight:900}.feasibility-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(290px,.85fr);gap:16px;align-items:start}.feasibility-sections{display:grid;gap:16px;min-width:0}.feasibility-side{display:grid;gap:16px;min-width:0;position:sticky;top:16px}.section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.section-heading small{display:inline-flex;border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:5px 10px;font-weight:950}.section-heading h2{margin:8px 0 0;color:var(--sfm-midnight);font-size:20px}.section-heading svg{color:var(--sfm-primary)}.feasibility-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.form-field{display:grid;gap:7px;min-width:0}.form-field span{font-weight:900;color:var(--sfm-muted)}.form-field input,.form-field textarea,.form-field select{width:100%;min-width:0;border:1px solid rgba(29,140,255,.2);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:13px;padding:11px 12px;font-family:inherit;font-weight:800;outline:none}.form-field textarea{resize:vertical;line-height:1.6}.form-field input:focus,.form-field textarea:focus,.form-field select:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.15)}.calculations-card{display:grid;gap:10px}.future-actions{display:grid;gap:10px}.future-actions button{min-height:44px;border-radius:13px;border:1px solid rgba(29,140,255,.18);font-family:inherit;font-weight:950;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.future-actions button:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.16)}.primary-save:disabled{opacity:.66;cursor:not-allowed}.disabled-btn{background:var(--sfm-light-card);color:var(--sfm-muted);cursor:not-allowed}.disabled-btn span{border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:3px 8px;font-size:11px}.placeholder-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}.placeholder-card{min-height:280px;display:grid;place-items:center;text-align:center;align-content:center}.placeholder-card svg{color:var(--sfm-primary)}.placeholder-card h2{margin:12px 0 6px;color:var(--sfm-midnight)}.placeholder-card p{margin:0;max-width:620px;color:var(--sfm-muted);line-height:1.8}.placeholder-card span{margin-top:14px;border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:7px 12px;font-weight:900}.state-card{border-radius:20px;background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);padding:24px;color:var(--sfm-midnight);font-weight:900}.empty-state{min-height:360px;display:grid;place-items:center;text-align:center}.empty-state article{background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);border-radius:22px;padding:28px;box-shadow:0 14px 34px rgba(3,18,37,.07)}.empty-state button{margin-top:16px;min-height:42px;border:0;border-radius:13px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;padding:0 16px;font-weight:900;font-family:inherit;cursor:pointer}@media(max-width:1180px){.hero-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.feasibility-layout{grid-template-columns:1fr}.feasibility-side{position:static}}@media(max-width:1024px){.project-workspace .sfm-dashboard-page-shell{margin-inline:0;padding:calc(74px + env(safe-area-inset-top)) 16px 44px}.project-workspace .sfm-dashboard-page-content{max-width:100%}}@media(max-width:760px){.workspace-hero{padding:22px}.back-link{width:100%;min-height:44px}.hero-actions{display:grid;grid-template-columns:1fr}.hero-actions button{width:100%;justify-content:center}.hero-metrics,.metric-grid,.timeline-list,.quick-grid,.feasibility-summary-grid,.feasibility-form-grid{grid-template-columns:1fr}.details-list div{grid-template-columns:1fr}.warm-card{padding:16px}.overview-grid{grid-template-columns:1fr}.overview-grid>.warm-card{grid-column:1 / -1}.overview-link-btn{width:100%}.score-row{grid-template-columns:1fr}.score-number{width:92px;height:92px}.section-heading{align-items:flex-start}.placeholder-card{min-height:220px}}
      `}</style>
      <style jsx global>{`
        .project-overview{display:grid;gap:16px;min-width:0}
        .future-actions .secondary-action{background:var(--sfm-light-card);color:var(--sfm-midnight)}
        .future-actions .secondary-action:hover:not(:disabled),.future-actions .secondary-action:focus-visible{background:rgba(29,140,255,.10);border-color:rgba(24,212,212,.44)}
        .future-actions .secondary-action:disabled{opacity:.66;cursor:not-allowed}
        .overview-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;align-items:stretch}
        .overview-main-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.75fr);gap:16px;align-items:start;min-width:0}
        .overview-main-column,.overview-side-column{display:grid;gap:16px;min-width:0}
        .overview-side-column{position:sticky;top:16px}
        .project-summary-card{display:grid;gap:12px}
        .project-description{margin:0;color:var(--sfm-primary-dark);font-weight:850;line-height:1.8;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
        .project-description.expanded{display:block;overflow:visible}
        .text-toggle{justify-self:start;min-height:34px;border:1px solid rgba(29,140,255,.18);border-radius:999px;background:rgba(29,140,255,.08);color:var(--sfm-primary-hover);padding:0 12px;font-family:inherit;font-weight:950;cursor:pointer}
        .compact-details{grid-template-columns:repeat(2,minmax(0,1fr));display:grid}
        .compact-details div{grid-template-columns:1fr;gap:4px}
        .project-transactions-card{display:grid;gap:14px}
        .transaction-list{display:grid;gap:10px}
        .transaction-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:16px;padding:12px;min-width:0}
        .transaction-main{display:grid;gap:4px;min-width:0}
        .transaction-main strong{color:var(--sfm-midnight);font-weight:950;overflow-wrap:anywhere}
        .transaction-main span{color:var(--sfm-muted);font-size:12px;font-weight:850}
        .transaction-main small{justify-self:start;border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:4px 8px;font-weight:950;font-size:11px}
        .transaction-amount{color:var(--sfm-primary-dark);font-weight:950;white-space:nowrap}
        .transaction-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
        .transaction-actions button{min-height:34px;border:1px solid rgba(29,140,255,.18);border-radius:11px;background:var(--sfm-card);color:var(--sfm-midnight);padding:0 10px;font-family:inherit;font-weight:950;display:inline-flex;align-items:center;gap:5px;cursor:pointer}
        .transaction-actions button.danger,.danger-action{min-height:42px;border:1px solid rgba(220,38,38,.22);border-radius:13px;background:#FEF2F2;color:#B91C1C;padding:0 14px;font-family:inherit;font-weight:950;cursor:pointer}
        .danger-action.strong{background:#B91C1C;color:#FFFFFF}
        .activity-list{display:grid;gap:10px}
        .activity-list div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:11px}
        .activity-list span{color:var(--sfm-midnight);font-weight:950;overflow-wrap:anywhere}
        .activity-list small{color:var(--sfm-muted);font-weight:850}
        .activity-list strong{grid-row:1 / span 2;grid-column:2;color:var(--sfm-primary-dark);font-weight:950;white-space:nowrap;align-self:center}
        .overview-side-column .quick-grid{grid-template-columns:1fr}
        .overview-side-column .quick-grid button{justify-content:flex-start;padding:0 12px;display:flex;align-items:center;gap:8px;text-align:start}
        .delete-modal{width:min(620px,100%);border:1px solid rgba(167,243,240,.22);border-radius:24px;background:var(--sfm-card);box-shadow:0 30px 80px rgba(3,18,37,.35);padding:22px;display:grid;gap:16px;color:var(--sfm-primary-dark)}
        .delete-linked-note{border:1px solid rgba(245,158,11,.22);background:#FFFBEB;color:#92400E;border-radius:14px;padding:10px 12px;margin-top:10px!important;font-weight:900}
        .dark .project-description,.dark .transaction-amount,.dark .activity-list strong{color:var(--foreground)}
        .dark .transaction-row,.dark .activity-list div,.dark .delete-modal{background:var(--card);border-color:var(--border)}
        .dark .transaction-main strong,.dark .activity-list span{color:var(--foreground)}
        .dark .transaction-actions button{background:var(--sfm-card-elevated,#0F335C);color:var(--foreground);border-color:var(--border)}
        .dark .quick-card .quick-grid button{background:rgba(47,214,192,.12);border-color:rgba(167,243,240,.30);color:#EAF6FF;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
        .dark .quick-card .quick-grid button svg{color:#67E8F9}
        .dark .quick-card .quick-grid button:hover,.dark .quick-card .quick-grid button:focus-visible{background:rgba(47,214,192,.18);border-color:rgba(103,232,249,.58);color:#FFFFFF;box-shadow:0 0 0 3px rgba(47,214,192,.18)}
        .dark .quick-card .quick-grid button:disabled,.dark .future-actions button:disabled,.dark .primary-save:disabled{opacity:.6;color:#CBD5E1;cursor:not-allowed}
        .dark .future-actions .secondary-action,.dark .project-workspace .secondary-action{background:rgba(255,255,255,.08);border-color:rgba(167,243,240,.26);color:#EAF6FF}
        .dark .future-actions .secondary-action:hover:not(:disabled),.dark .future-actions .secondary-action:focus-visible{background:rgba(47,214,192,.15);border-color:rgba(103,232,249,.50);color:#FFFFFF}
        .dark .project-workspace .action-empty{background:linear-gradient(135deg,rgba(47,214,192,.12),rgba(29,140,255,.10)),#0B2746;border-color:rgba(103,232,249,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
        .dark .project-workspace .action-empty-icon{background:rgba(47,214,192,.16);border-color:rgba(103,232,249,.34);color:#67E8F9}
        .dark .project-workspace .action-empty strong{color:#F8FAFC}
        .dark .project-workspace .action-empty p{color:#CBD5E1}
        .dark .project-workspace .action-empty button{background:linear-gradient(135deg,#1D8CFF,#18D4D4);border-color:rgba(103,232,249,.55);color:#FFFFFF;box-shadow:0 12px 28px rgba(24,212,212,.18)}
        .dark .project-workspace .action-empty button:hover,.dark .project-workspace .action-empty button:focus-visible{background:linear-gradient(135deg,#2563EB,#22D3EE);color:#FFFFFF}
        .project-workspace .overview-grid{grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));align-items:stretch}
        .project-workspace .project-income-card,.project-workspace .project-expenses-card,.project-workspace .missing-data-card{grid-column:1 / -1}
        .project-workspace .expense-list{display:grid;gap:10px;margin-top:12px}
        .project-workspace .expense-list div{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px}
        .project-workspace .expense-list span{font-weight:900;color:var(--sfm-midnight);overflow-wrap:anywhere}
        .project-workspace .expense-list strong{color:var(--sfm-primary-dark);white-space:nowrap}
        .project-workspace .expense-list small{border-radius:999px;background:rgba(29,140,255,.1);color:var(--sfm-primary-hover);padding:4px 8px;font-weight:900}
        .project-workspace .action-empty{border:1px dashed rgba(29,140,255,.24);background:var(--sfm-light-card);border-radius:16px;padding:16px;display:grid;gap:12px}
        .project-workspace .action-empty p{margin:0;color:var(--sfm-muted);font-weight:900;line-height:1.7}
        .project-workspace .action-empty button,.project-workspace .secondary-action{min-height:42px;border-radius:13px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);color:var(--sfm-midnight);font-family:inherit;font-weight:950;cursor:pointer;padding:0 14px}
        .project-workspace .quick-grid button{min-height:52px;border-color:rgba(29,140,255,.26);background:rgba(29,140,255,.09);color:var(--sfm-midnight);font-weight:950;transition:background .18s ease,border-color .18s ease,color .18s ease,box-shadow .18s ease,transform .18s ease}
        .project-workspace .quick-grid button svg{color:var(--sfm-primary);flex:0 0 auto}
        .project-workspace .quick-grid button:hover,.project-workspace .quick-grid button:focus-visible{background:rgba(29,140,255,.14);border-color:rgba(24,212,212,.48);color:var(--sfm-primary-dark);box-shadow:0 0 0 3px rgba(24,212,212,.16);transform:translateY(-1px)}
        .project-workspace .quick-grid button:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .project-workspace .action-empty{grid-template-columns:auto minmax(0,1fr);align-items:center;border-style:solid;border-color:rgba(29,140,255,.24);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(24,212,212,.06)),var(--sfm-light-card);padding:18px}
        .project-workspace .action-empty-icon{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:rgba(24,212,212,.12);border:1px solid rgba(24,212,212,.28);color:var(--sfm-primary);box-shadow:0 10px 24px rgba(3,18,37,.08)}
        .project-workspace .action-empty strong{display:block;color:var(--sfm-midnight);font-weight:950;line-height:1.55;overflow-wrap:anywhere}
        .project-workspace .action-empty p{margin:4px 0 0;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.55}
        .project-workspace .action-empty button{grid-column:1 / -1;justify-self:start;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:rgba(24,212,212,.48);color:#fff;box-shadow:0 10px 24px rgba(29,140,255,.18)}
        .project-workspace .action-empty button:hover,.project-workspace .action-empty button:focus-visible{outline:none;background:linear-gradient(135deg,var(--sfm-primary-hover),var(--sfm-soft-cyan));box-shadow:0 0 0 3px rgba(24,212,212,.18),0 14px 30px rgba(29,140,255,.20)}
        .dark .quick-card .quick-grid button{background:rgba(47,214,192,.12);border-color:rgba(167,243,240,.30);color:#EAF6FF;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
        .dark .quick-card .quick-grid button svg{color:#67E8F9}
        .dark .quick-card .quick-grid button:hover,.dark .quick-card .quick-grid button:focus-visible{background:rgba(47,214,192,.18);border-color:rgba(103,232,249,.58);color:#FFFFFF;box-shadow:0 0 0 3px rgba(47,214,192,.18)}
        .dark .quick-card .quick-grid button:disabled,.dark .future-actions button:disabled,.dark .primary-save:disabled{opacity:.6;color:#CBD5E1;cursor:not-allowed}
        .dark .future-actions .secondary-action,.dark .project-workspace .secondary-action{background:rgba(255,255,255,.08);border-color:rgba(167,243,240,.26);color:#EAF6FF}
        .dark .future-actions .secondary-action:hover:not(:disabled),.dark .future-actions .secondary-action:focus-visible{background:rgba(47,214,192,.15);border-color:rgba(103,232,249,.50);color:#FFFFFF}
        .dark .project-workspace .action-empty{background:linear-gradient(135deg,rgba(47,214,192,.12),rgba(29,140,255,.10)),#0B2746;border-color:rgba(103,232,249,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
        .dark .project-workspace .action-empty-icon{background:rgba(47,214,192,.16);border-color:rgba(103,232,249,.34);color:#67E8F9}
        .dark .project-workspace .action-empty strong{color:#F8FAFC}
        .dark .project-workspace .action-empty p{color:#CBD5E1}
        .dark .project-workspace .action-empty button{background:linear-gradient(135deg,#1D8CFF,#18D4D4);border-color:rgba(103,232,249,.55);color:#FFFFFF;box-shadow:0 12px 28px rgba(24,212,212,.18)}
        .dark .project-workspace .action-empty button:hover,.dark .project-workspace .action-empty button:focus-visible{background:linear-gradient(135deg,#2563EB,#22D3EE);color:#FFFFFF}
        .project-workspace .missing-data-card ul{margin:0;padding-inline-start:20px;color:var(--sfm-muted);font-weight:900;line-height:1.8}
        .expense-modal-backdrop{position:fixed;inset:0;z-index:80;background:rgba(3,18,37,.55);backdrop-filter:blur(8px);display:grid;place-items:center;padding:20px}
        .expense-modal{width:min(760px,100%);max-height:calc(100vh - 40px);overflow:auto;border:1px solid rgba(167,243,240,.22);border-radius:24px;background:var(--sfm-card);box-shadow:0 30px 80px rgba(3,18,37,.35);padding:22px;display:grid;gap:16px;color:var(--sfm-primary-dark)}
        .modal-header{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
        .modal-header span{display:inline-flex;border-radius:999px;background:rgba(29,140,255,.1);color:var(--sfm-primary-hover);padding:6px 10px;font-size:12px;font-weight:950}
        .modal-header h2{margin:10px 0 6px;color:var(--sfm-midnight);font-size:24px}
        .modal-header p{margin:0;color:var(--sfm-muted);line-height:1.7;font-weight:850}
        .icon-button{width:40px;height:40px;border-radius:13px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-light-card);color:var(--sfm-midnight);display:grid;place-items:center;cursor:pointer}
        .modal-error{border:1px solid rgba(220,38,38,.22);background:#FEF2F2;color:#B91C1C;border-radius:14px;padding:12px;font-weight:900}
        .project-expense-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .project-expense-form-grid .wide{grid-column:1 / -1}
        .project-expense-form-grid .form-field small{display:block;margin-top:4px;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.55}
        .project-expense-form-grid .form-field em{display:block;margin-top:7px;width:fit-content;max-width:100%;font-style:normal;border-radius:999px;background:rgba(29,140,255,.09);border:1px solid rgba(29,140,255,.14);color:var(--sfm-primary-hover);padding:5px 9px;font-size:11px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .project-currency-select{min-width:0}
        .project-currency-select .currency-trigger{min-height:48px;border-radius:13px;padding-inline:12px}
        .project-currency-select .currency-trigger-content{column-gap:9px}
        .project-currency-select .currency-trigger-symbol{min-inline-size:42px}
        .project-expense-ai-panel{display:grid;gap:12px;border:1px solid rgba(29,140,255,.15);border-radius:18px;background:linear-gradient(135deg,rgba(29,140,255,.07),rgba(24,212,212,.05)),var(--sfm-light-card);padding:14px;min-width:0}
        .project-expense-ai-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:11px;align-items:start;min-width:0}
        .project-expense-ai-icon{width:38px;height:38px;border-radius:13px;background:rgba(24,212,212,.13);border:1px solid rgba(24,212,212,.20);color:var(--sfm-primary);display:grid;place-items:center}
        .project-expense-ai-head strong{display:block;color:var(--sfm-midnight);font-weight:950;line-height:1.45;overflow-wrap:anywhere}
        .project-expense-ai-head small{display:block;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.7;margin-top:3px;overflow-wrap:anywhere}
        .project-expense-ai-actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end}
        .project-expense-ai-actions.compact{justify-content:flex-start}
        .project-expense-ai-actions button{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-weight:950}
        .project-expense-ai-actions button:disabled{opacity:.62;cursor:not-allowed}
        .project-expense-ai-alert{border:1px solid rgba(245,158,11,.26);background:rgba(245,158,11,.10);color:#92400E;border-radius:14px;padding:11px 12px;font-size:13px;font-weight:900;line-height:1.65}
        .project-expense-ai-result{display:grid;gap:11px;border:1px solid rgba(29,140,255,.13);background:var(--sfm-card);border-radius:16px;padding:13px;min-width:0;box-shadow:0 10px 24px rgba(3,18,37,.05)}
        .project-expense-ai-result-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;min-width:0}
        .project-expense-ai-result-head strong{color:var(--sfm-midnight);font-weight:950;line-height:1.45}
        .project-expense-ai-result-head span,.project-expense-confidence-row span{border-radius:999px;background:rgba(16,185,129,.10);border:1px solid rgba(16,185,129,.18);color:#047857;padding:5px 8px;font-size:11px;font-weight:950;line-height:1.35;text-align:center}
        .project-expense-extracted-grid,.project-expense-analysis-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .project-expense-extracted-grid div,.project-expense-analysis-grid div{min-width:0;border:1px solid rgba(29,140,255,.10);background:var(--sfm-light-card);border-radius:13px;padding:9px;display:grid;gap:4px}
        .project-expense-extracted-grid span,.project-expense-analysis-grid span{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.4}
        .project-expense-extracted-grid b,.project-expense-analysis-grid b{color:var(--sfm-midnight);font-size:13px;font-weight:950;line-height:1.55;overflow-wrap:anywhere}
        .project-expense-confidence-row,.project-expense-budget-impact{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .project-expense-ai-result p{margin:0;color:var(--sfm-midnight);font-weight:900;line-height:1.8;overflow-wrap:anywhere}
        .project-expense-budget-impact span,.project-expense-budget-note{display:inline-flex;width:fit-content;max-width:100%;border-radius:13px;background:rgba(29,140,255,.08);border:1px solid rgba(29,140,255,.12);color:var(--sfm-muted);padding:8px 10px;font-size:12px;font-weight:900;line-height:1.6;overflow-wrap:anywhere}
        .project-expense-budget-impact b{color:var(--sfm-primary-dark)}
        .project-expense-warning-list{margin:0;padding-inline-start:20px;color:#92400E;font-size:12px;font-weight:900;line-height:1.7}
        .budget-checkbox{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:flex-start;width:100%;min-width:0;border:1px solid rgba(29,140,255,.18);border-radius:16px;background:var(--sfm-light-card);padding-block:15px;padding-inline:18px;cursor:pointer;overflow:visible;transition:border-color .18s ease,background .18s ease,box-shadow .18s ease,transform .18s ease}
        .budget-checkbox:hover{border-color:rgba(24,212,212,.42);transform:translateY(-1px)}
        .budget-checkbox.selected,.budget-checkbox:has(.budget-checkbox-input:checked){border-color:rgba(24,212,212,.62);background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(24,212,212,.11)),var(--sfm-light-card);box-shadow:inset 0 0 0 1px rgba(24,212,212,.18),0 12px 28px rgba(3,18,37,.07)}
        .budget-checkbox:has(.budget-checkbox-input:focus-visible){box-shadow:0 0 0 3px rgba(24,212,212,.18),0 12px 28px rgba(3,18,37,.07)}
        .budget-checkbox-input{position:absolute;inline-size:1px;block-size:1px;opacity:0;pointer-events:none}
        .budget-checkbox-indicator{inline-size:28px;block-size:28px;min-inline-size:28px;border-radius:999px;border:1px solid rgba(29,140,255,.28);background:var(--sfm-card);color:transparent;display:grid;place-items:center;margin-block-start:1px;box-shadow:inset 0 0 0 4px rgba(29,140,255,.06)}
        .budget-checkbox.selected .budget-checkbox-indicator,.budget-checkbox:has(.budget-checkbox-input:checked) .budget-checkbox-indicator{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:rgba(24,212,212,.70);color:#FFFFFF;box-shadow:0 8px 18px rgba(29,140,255,.22)}
        .budget-checkbox-copy{display:grid;gap:5px;min-width:0}
        .budget-checkbox strong{color:var(--sfm-midnight);line-height:1.45;overflow-wrap:anywhere}
        .budget-checkbox small{color:var(--sfm-muted);line-height:1.65;font-weight:850;overflow-wrap:anywhere}
        .modal-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
        .modal-actions .primary-save{min-height:44px;border:0;border-radius:13px;padding:0 16px;display:inline-flex;align-items:center;gap:8px;font-family:inherit;font-weight:950;cursor:pointer}
        @media(max-width:1180px){.overview-main-layout{grid-template-columns:1fr}.overview-side-column{position:static}.compact-details{grid-template-columns:1fr 1fr}}
        @media(max-width:760px){.overview-kpi-grid,.compact-details{grid-template-columns:1fr}.transaction-row,.activity-list div{grid-template-columns:1fr}.transaction-actions{justify-content:stretch}.transaction-actions button{flex:1;justify-content:center}.expense-modal-backdrop{align-items:end;padding:12px}.expense-modal,.delete-modal{border-radius:22px 22px 0 0;max-height:88vh;overflow:auto}.project-expense-form-grid,.project-expense-extracted-grid,.project-expense-analysis-grid{grid-template-columns:1fr}.project-expense-ai-actions{display:grid;grid-template-columns:1fr}.project-expense-ai-actions button{width:100%}.project-expense-ai-result-head{display:grid}.modal-actions{display:grid;grid-template-columns:1fr}.modal-actions button{width:100%}.project-workspace .expense-list div{grid-template-columns:1fr}.project-workspace .project-income-card,.project-workspace .project-expenses-card,.project-workspace .missing-data-card{grid-column:1 / -1}.project-workspace .quick-grid button{min-height:54px}.project-workspace .action-empty{grid-template-columns:1fr;text-align:start}.project-workspace .action-empty button{width:100%;justify-self:stretch}}
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
  projectIncome,
  projectExpenses,
  openProjectIncomeModal,
  openProjectExpenseModal,
  onEditProjectIncome,
  onEditProjectExpense,
  onDeleteProjectIncome,
  onDeleteProjectExpense,
  money,
  projectCurrency,
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
  projectIncome: ProjectIncomeRow[];
  projectExpenses: ProjectExpenseRow[];
  openProjectIncomeModal: () => void;
  openProjectExpenseModal: () => void;
  onEditProjectIncome: (row: ProjectIncomeRow) => void;
  onEditProjectExpense: (row: ProjectExpenseRow) => void;
  onDeleteProjectIncome: (row: ProjectIncomeRow) => void;
  onDeleteProjectExpense: (row: ProjectExpenseRow) => void;
  money: MoneyFormatter;
  projectCurrency: string;
  dateLabel: (value?: string | null) => string;
  setActiveTab: (tab: TabId) => void;
  routerPush: (href: string) => void;
}) {
  const hasTimelineData = Boolean(model.startDate || model.endDate || model.daysRemaining !== null || model.duration !== null);
  const hasProjectIncome = projectIncome.length > 0;
  const hasProjectExpenses = projectExpenses.length > 0;
  const actualVsExpected = model.plannedIncome > 0
    ? `${Math.round((model.actualProjectIncome / model.plannedIncome) * 100)}%`
    : tr.noData;
  const actualVsPlanned = model.plannedExpenses > 0
    ? `${Math.round((model.actualProjectExpenses / model.plannedExpenses) * 100)}%`
    : tr.noData;
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const recentActivity = [...projectIncome.map(row => ({
    id: `income-${row.id}`,
    kind: 'income' as const,
    type: tr.projectIncome,
    title: row.title || tr.projectIncome,
    amount: toNum(row.amount),
    currency: normalizeCurrencyCode(row.currency, projectCurrency),
    date: row.income_date ?? row.created_at ?? null,
  })), ...projectExpenses.map(row => ({
    id: `expense-${row.id}`,
    kind: 'expense' as const,
    type: tr.projectExpenses,
    title: row.title || tr.projectExpense,
    amount: -toNum(row.amount),
    currency: normalizeCurrencyCode(row.currency, 'KWD'),
    date: row.expense_date ?? row.created_at ?? null,
  }))]
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    .slice(0, 5);
  const totalProjectIncome = formatRowsByCurrency(projectIncome, money, projectCurrency);
  const totalProjectExpenses = formatRowsByCurrency(projectExpenses, formatProjectExpenseMoney, 'KWD');

  return (
    <section className="project-overview">
      <div className="overview-kpi-grid">
        <Metric label={tr.projectHealthScore} value={kpiSummary.score === null ? tr.noData : `${kpiSummary.score}/100`} />
        <Metric label={tr.financialSnapshot} value={money(model.net, projectCurrency)} />
        <Metric label={tr.timelineSnapshot} value={model.daysRemaining === null ? tr.noData : String(model.daysRemaining)} />
        <Metric label={tr.riskSnapshot} value={tr[model.risk as RiskLevel]} />
        <Metric label={tr.projectProgress} value={`${taskSummary.progressPercent}%`} />
        <Metric label={tr.documents} value={String(documentsCount)} />
      </div>

      <div className="overview-main-layout">
        <div className="overview-main-column">
          <article className="warm-card project-summary-card">
            <CardTitle icon={<FolderKanban size={20} />} title={tr.projectSummary} />
            <p className={`project-description ${summaryExpanded ? 'expanded' : ''}`}>{model.description || tr.noData}</p>
            {model.description ? (
              <button type="button" className="text-toggle" onClick={() => setSummaryExpanded(value => !value)}>
                {summaryExpanded ? tr.showLess : tr.showMore}
              </button>
            ) : null}
            <dl className="details-list compact-details">
              <div><dt>{tr.projectType}</dt><dd>{typeLabel}</dd></div>
              <div><dt>{tr.status}</dt><dd><span className={`badge ${model.statusKey}`}>{statusLabel}</span></dd></div>
              <div><dt>{tr.priority}</dt><dd>{model.priority}</dd></div>
              <div><dt>{tr.currentPhase}</dt><dd>{String(model.phase)}</dd></div>
              <div><dt>{tr.startDate}</dt><dd>{dateLabel(model.startDate)}</dd></div>
              <div><dt>{tr.endDate}</dt><dd>{dateLabel(model.endDate)}</dd></div>
            </dl>
          </article>

          <ProjectTransactionSection
            kind="income"
            tr={tr}
            rows={projectIncome}
            model={model}
            money={money}
            projectCurrency={projectCurrency}
            dateLabel={dateLabel}
            actualRatio={actualVsExpected}
            onAdd={openProjectIncomeModal}
            onEdit={onEditProjectIncome}
            onDelete={onDeleteProjectIncome}
          />

          <ProjectTransactionSection
            kind="expense"
            tr={tr}
            rows={projectExpenses}
            model={model}
            money={money}
            projectCurrency={projectCurrency}
            dateLabel={dateLabel}
            actualRatio={actualVsPlanned}
            onAdd={openProjectExpenseModal}
            onEdit={onEditProjectExpense}
            onDelete={onDeleteProjectExpense}
          />

          <article className="warm-card">
            <CardTitle icon={<Coins size={20} />} title={tr.financialSnapshot} />
            <div className="metric-grid">
              <Metric label={tr.capital} value={money(model.capital, projectCurrency)} />
              <Metric label={tr.totalIncome} value={totalProjectIncome || tr.noData} />
              <Metric label={tr.totalExpenses} value={totalProjectExpenses || tr.noData} />
              <Metric label={tr.netResult} value={money(model.actualProjectIncome - model.actualProjectExpenses, projectCurrency)} />
              <Metric label={tr.remainingBudget} value={money(model.remainingBudget, projectCurrency)} />
              <Metric label={tr.targetProgress} value={`${model.progress.toFixed(0)}%`} />
            </div>
            <div className="progress-bar" aria-label={tr.targetProgress}>
              <span style={{ width: `${model.progress}%` }} />
            </div>
          </article>

          <article className="warm-card">
            <CardTitle icon={<CheckCircle2 size={20} />} title={tr.recentActivity} />
            {recentActivity.length ? (
              <div className="activity-list">
                {recentActivity.map(item => (
                  <div key={item.id}>
                    <span>{item.title}</span>
                    <small>{item.type} · {dateLabel(item.date)}</small>
                    <strong>{item.kind === 'expense' ? formatProjectExpenseMoney(item.amount, item.currency) : money(item.amount, item.currency)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="timeline-empty">{tr.noData}</p>
            )}
          </article>
        </div>

        <aside className="overview-side-column">
          <article className="warm-card quick-card">
            <CardTitle icon={<CheckCircle2 size={20} />} title={tr.quickActions} />
            <div className="quick-grid">
              <button type="button" onClick={openProjectExpenseModal}><ReceiptText size={16} /> {tr.addExpense}</button>
              <button type="button" onClick={openProjectIncomeModal}><Coins size={16} /> {tr.addIncome}</button>
              <button type="button" onClick={() => setActiveTab('tasks')}><ClipboardList size={16} /> {tr.addTask}</button>
              <button type="button" onClick={() => setActiveTab('feasibility')}><FileText size={16} /> {tr.generateFeasibility}</button>
              <button type="button" onClick={() => setActiveTab('financial')}><BarChart3 size={16} /> {tr.createFinancialModel}</button>
              <button type="button" onClick={() => routerPush('/documents')}><FileText size={16} /> {tr.documentsCenter}</button>
            </div>
          </article>

          <article className="warm-card missing-data-card">
            <CardTitle icon={<AlertTriangle size={20} />} title={tr.missingDataChecklist} />
            <ul>
              {!hasProjectExpenses ? <li>{tr.addProjectExpensesHint}</li> : null}
              {kpiSummary.score === null ? <li>{tr.addFinancialModelHint}</li> : null}
              {taskSummary.totalTasks === 0 ? <li>{tr.addTasksHint}</li> : null}
              {hasProjectExpenses && kpiSummary.score !== null && taskSummary.totalTasks > 0 ? <li>{tr.noRiskFlags}</li> : null}
            </ul>
          </article>

          <article className="warm-card">
            <CardTitle icon={<CalendarDays size={20} />} title={tr.nextSteps} />
            {hasTimelineData ? (
              <div className="timeline-list">
                <Metric label={tr.nextMilestone} value={dateLabel(taskSummary.nextMilestone)} />
                <Metric label={tr.upcomingDeadlines} value={dateLabel(taskSummary.upcomingDeadline)} />
                <Metric label={tr.daysRemaining} value={model.daysRemaining === null ? tr.noData : String(model.daysRemaining)} />
              </div>
            ) : (
              <p className="timeline-empty">{tr.timelineInsufficient}</p>
            )}
          </article>

          <article className={`warm-card risk-card ${model.risk}`}>
            <CardTitle icon={<AlertTriangle size={20} />} title={tr.projectStatus} />
            <div className="risk-badge">{tr[model.risk as RiskLevel]}</div>
            <p>{riskText}</p>
          </article>
        </aside>
      </div>
    </section>
  );
}

function ProjectTransactionSection({
  kind,
  tr,
  rows,
  model,
  money,
  projectCurrency,
  dateLabel,
  actualRatio,
  onAdd,
  onEdit,
  onDelete,
}: {
  kind: 'income' | 'expense';
  tr: Translation;
  rows: ProjectIncomeRow[] | ProjectExpenseRow[];
  model: any;
  money: MoneyFormatter;
  projectCurrency: string;
  dateLabel: (value?: string | null) => string;
  actualRatio: string;
  onAdd: () => void;
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
}) {
  const isIncome = kind === 'income';
  const title = isIncome ? tr.projectIncome : tr.projectExpenses;
  const emptyText = isIncome ? tr.noProjectIncomeYet : tr.noProjectExpensesYet;
  const addText = isIncome ? tr.addIncome : tr.addExpense;
  const Icon = isIncome ? Coins : ReceiptText;
  const fallbackCurrency = isIncome ? projectCurrency : 'KWD';
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthRows = rows.filter(row => {
    const income = row as ProjectIncomeRow;
    const expense = row as ProjectExpenseRow;
    const date = isIncome ? income.income_date ?? income.created_at : expense.expense_date ?? expense.created_at;
    return String(date ?? '').slice(0, 7) === currentMonthKey;
  }) as CurrencyAmountRow[];
  const personalRows = rows.filter(row => isIncome
    ? (row as ProjectIncomeRow).transferred_to_personal_income === true
    : (row as ProjectExpenseRow).paid_from_personal_budget === true
  ) as CurrencyAmountRow[];
  const rowMoney: MoneyFormatter = isIncome ? money : formatProjectExpenseMoney;
  const totalDisplay = formatRowsByCurrency(rows as CurrencyAmountRow[], rowMoney, fallbackCurrency);
  const monthDisplay = formatRowsByCurrency(monthRows, rowMoney, fallbackCurrency);
  const personalDisplay = formatRowsByCurrency(personalRows, rowMoney, fallbackCurrency);

  return (
    <article className="warm-card project-transactions-card">
      <CardTitle icon={<Icon size={20} />} title={title} />
      {rows.length ? (
        <>
          <div className="metric-grid">
            <Metric label={isIncome ? tr.totalProjectIncome : tr.totalProjectExpenses} value={totalDisplay || rowMoney(isIncome ? model.actualProjectIncome : model.actualProjectExpenses, fallbackCurrency)} />
            <Metric label={isIncome ? tr.projectIncomeThisMonth : tr.projectExpensesThisMonth} value={monthDisplay || rowMoney(isIncome ? model.monthlyProjectIncome : model.monthlyProjectExpenses, fallbackCurrency)} />
            <Metric label={isIncome ? tr.personalIncomeProjectIncome : tr.personalBudgetProjectExpenses} value={personalDisplay || rowMoney(isIncome ? model.personalIncomeProjectIncome : model.personalBudgetProjectExpenses, fallbackCurrency)} />
            <Metric label={isIncome ? tr.actualVsExpected : tr.actualVsPlanned} value={actualRatio} />
          </div>
          <div className="transaction-list">
            {rows.slice(0, 6).map(row => {
              const income = row as ProjectIncomeRow;
              const expense = row as ProjectExpenseRow;
              const date = isIncome ? income.income_date ?? income.created_at : expense.expense_date ?? expense.created_at;
              const badge = isIncome
                ? income.transferred_to_personal_income ? tr.transferredToPersonalIncome : ''
                : expense.paid_from_personal_budget ? tr.paidFromPersonalBudget : '';
              return (
                <div className="transaction-row" key={row.id}>
                  <div className="transaction-main">
                    <strong>{row.title || title}</strong>
                    <span>{dateLabel(date)} · {String(row.category || tr.general)}</span>
                    {badge ? <small>{badge}</small> : null}
                  </div>
                  <div className="transaction-amount">{formatRowMoney(row as CurrencyAmountRow, rowMoney, fallbackCurrency)}</div>
                  <div className="transaction-actions">
                    <button type="button" onClick={() => onEdit(row)} aria-label={`${tr.edit} ${row.title || title}`}>
                      <Pencil size={15} />
                      {tr.edit}
                    </button>
                    <button type="button" className="danger" onClick={() => onDelete(row)} aria-label={`${tr.delete} ${row.title || title}`}>
                      <Trash2 size={15} />
                      {tr.delete}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="action-empty">
          <span className="action-empty-icon" aria-hidden="true"><Icon size={22} /></span>
          <div>
            <strong>{emptyText}</strong>
            <p>{isIncome ? tr.projectIncome : tr.projectExpenses}</p>
          </div>
          <button type="button" onClick={onAdd}>
            <Icon size={16} />
            {addText}
          </button>
        </div>
      )}
    </article>
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
        <FolderKanban size={42} color="var(--sfm-primary)" />
        <h1>{title}</h1>
        <button type="button" onClick={onClick}>{button}</button>
      </article>
    </div>
  );
}
