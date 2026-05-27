'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  Calculator,
  CalendarDays,
  Coins,
  Eye,
  FileText,
  FileUp,
  Gift,
  HandCoins,
  HeartHandshake,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { CurrencySelect } from '@/components/CurrencySelect';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PageTabs } from '@/components/layout/PageTabs';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';
import { personalExpenseRows } from '@/lib/data/financeData';

type Lang = 'ar' | 'en' | 'fr';
type ProjectStatus = 'planning' | 'fundraising' | 'in_progress' | 'completed' | 'paused';
type ProjectCategory = 'ongoing' | 'sponsorship' | 'zakat' | 'sacrifice' | 'endowment' | 'mosque' | 'water_well' | 'education' | 'relief' | 'other';
type AssetType = 'cash' | 'savings' | 'investment' | 'gold' | 'silver' | 'non_zakat';
type OrganizationType = 'charity' | 'zakat_house' | 'humanitarian' | 'waqf' | 'mosque' | 'education' | 'relief' | 'other';
type VerificationStatus = 'verified' | 'pending_review' | 'unverified' | 'rejected';
type CharityProjectsTab = 'overview' | 'projects' | 'beneficiaries' | 'contributors' | 'documents' | 'impact' | 'reports';

type CharityProject = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  name: string;
  category: ProjectCategory;
  status: ProjectStatus;
  target_amount: number;
  collected_amount: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  organization_name: string | null;
  notes: string | null;
};

type ZakatAsset = {
  id: string;
  asset_name: string;
  asset_type: AssetType;
  amount: number;
  currency: string;
  ownership_date: string | null;
  zakat_due_date: string | null;
  is_zakatable: boolean;
};

type Commitment = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'annual' | 'once';
  next_due_date: string | null;
  category: ProjectCategory;
  status: string;
};

type ProjectDonation = {
  id: string;
  project_id: string | null;
  organization_id?: string | null;
  amount: number;
  currency: string;
  donation_date: string | null;
  donation_type: string | null;
  notes: string | null;
  created_at: string | null;
};

type CharityDocument = {
  id: string;
  user_id: string;
  project_id: string | null;
  donation_id: string | null;
  zakat_asset_id: string | null;
  commitment_id: string | null;
  title: string;
  category: DocumentCategory;
  file_url: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  notes: string | null;
  uploaded_at: string | null;
};

type DocumentCategory = 'donation_receipt' | 'charity_certificate' | 'project_report' | 'zakat_document' | 'beneficiary_report' | 'other';
type ReminderType = 'zakat' | 'hawl' | 'ramadan' | 'dhul_hijjah' | 'arafah' | 'sacrifice' | 'sponsorship' | 'project_milestone' | 'general';
type ReminderStatus = 'active' | 'completed' | 'dismissed';
type ReminderPriority = 'low' | 'normal' | 'high';
type BeneficiaryCategory = 'orphan' | 'family' | 'student' | 'medical' | 'elderly' | 'refugee' | 'project_group' | 'other';
type BeneficiaryStatus = 'active' | 'paused' | 'completed' | 'needs_review';
type ContributorRole = 'owner' | 'contributor' | 'viewer';
type PaymentStatus = 'pending' | 'paid' | 'partial' | 'late' | 'cancelled';

type CharityOrganization = {
  id: string;
  name_ar: string;
  name_en: string | null;
  name_fr: string | null;
  license_number: string | null;
  country: string | null;
  city: string | null;
  organization_type: OrganizationType;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  verification_status: VerificationStatus;
  transparency_score: number;
  efficiency_score: number;
  track_record_score: number;
  notes: string | null;
  data_source: string | null;
  is_active: boolean;
};

type CharityImpactMetric = {
  id: string;
  user_id: string;
  project_id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  notes: string | null;
  created_at: string | null;
};

type CharityReminder = {
  id: string;
  user_id: string;
  title: string;
  reminder_type: ReminderType;
  related_project_id: string | null;
  related_zakat_asset_id: string | null;
  related_commitment_id: string | null;
  due_date: string;
  hijri_date: string | null;
  remind_before_days: number;
  status: ReminderStatus;
  priority: ReminderPriority;
  notes: string | null;
};

type MetalsPriceResponse = {
  success: boolean;
  source: 'api' | 'manual' | 'fallback';
  currency: 'KWD';
  gold: { pricePerGram: number; pricePerGram24k?: number; pricePerGram22k?: number; pricePerGram21k?: number; pricePerGram18k?: number; unit: 'gram' };
  silver: { pricePerGram: number; unit: 'gram' };
  updatedAt: string;
  message?: string;
};

type ZakatCalculation = {
  id: string;
  calculation_date: string | null;
  currency: string;
  cash_amount: number;
  investment_amount: number;
  gold_value: number;
  silver_value: number;
  deductible_debts: number;
  net_zakat_base: number;
  nisab_method: string;
  gold_nisab_value: number;
  silver_nisab_value: number;
  selected_nisab_value: number;
  zakat_due: number;
  price_source: string | null;
  notes: string | null;
};

type CharityBeneficiary = {
  id: string;
  user_id: string;
  project_id: string | null;
  reference_code: string | null;
  display_name: string;
  category: BeneficiaryCategory;
  organization_name: string | null;
  country: string | null;
  city: string | null;
  monthly_support_amount: number;
  currency: string;
  sponsorship_start_date: string | null;
  sponsorship_end_date: string | null;
  next_renewal_date: string | null;
  status: BeneficiaryStatus;
  notes: string | null;
};

type CharityContributor = {
  id: string;
  user_id: string;
  project_id: string;
  contributor_name: string;
  contributor_email: string | null;
  role: ContributorRole;
  pledged_amount: number;
  paid_amount: number;
  currency: string;
  payment_status: PaymentStatus;
  due_date: string | null;
  notes: string | null;
};

const TEXT = {
  ar: {
    title: 'المشاريع الخيرية',
    subtitle: 'خطط للزكاة، الصدقات، الكفالات، والمشاريع الخيرية طويلة الأمد بذكاء.',
    breadcrumb: 'THE SFM / المشاريع الخيرية',
    newProject: '+ مشروع خيري جديد',
    zakatCalculator: 'حاسبة الزكاة',
    activeProjects: 'إجمالي المشاريع النشطة',
    totalDonations: 'إجمالي التبرعات هذا العام',
    commitments: 'الالتزامات الخيرية المتوقعة',
    estimatedZakat: 'زكاة المال المتوقعة',
    nextZakat: 'أقرب موعد زكاة',
    noDueDate: 'لا يوجد موعد',
    smartZakat: 'حاسبة الزكاة الذكية',
    cash: 'المدخرات النقدية',
    investments: 'الاستثمارات',
    gold: 'الذهب',
    silver: 'الفضة',
    debts: 'الديون المستحقة',
    nonZakat: 'أصول غير خاضعة للزكاة',
    goldPrice: 'سعر غرام الذهب',
    silverPrice: 'سعر غرام الفضة',
    zakatableAmount: 'المبلغ الخاضع للزكاة',
    zakatAmount: 'قيمة الزكاة 2.5%',
    zakatDisclaimer: 'هذه الحاسبة تقديرية لأغراض تنظيمية، ويُفضّل مراجعة جهة شرعية مختصة للحالات الخاصة.',
    nisabNote: 'سيتم ربط أسعار الذهب والفضة لاحقاً لحساب النصاب تلقائياً. الإدخال اليدوي متاح حالياً.',
    hawlTracking: 'تتبع الحول الهجري',
    assetName: 'اسم الأصل',
    assetType: 'نوع الأصل',
    ownershipDate: 'تاريخ التملك',
    dueDate: 'موعد الزكاة المتوقع',
    reminder: 'تذكير قبل 30 يوماً',
    addAsset: 'حفظ أصل الزكاة',
    projects: 'مشاريعك الخيرية',
    templates: 'قوالب المشاريع',
    forecast: 'التزاماتك الخيرية المتوقعة للسنة',
    forecastEmpty: 'أضف الزكاة أو الكفالات أو المشاريع لحساب الالتزامات المتوقعة.',
    impact: 'تحليل أثر التبرع',
    donationAmount: 'مبلغ التبرع',
    incomeMissing: 'أضف بيانات الدخل لعرض تحليل أثر التبرع على الميزانية.',
    donationPercent: 'هذا التبرع يعادل {pct}% من دخلك الشهري.',
    remainingNet: 'بعد هذا التبرع، صافي ميزانيتك الشهرية المتوقع: {amount}.',
    highWarning: 'تنبيه: هذا التبرع مرتفع مقارنة بدخلك هذا الشهر.',
    emptyTitle: 'لا توجد مشاريع خيرية حتى الآن.',
    emptyBody: 'ابدأ بإنشاء مشروع خيري لتتبع الهدف والتبرعات والتقدم.',
    target: 'الهدف المالي',
    collected: 'المحصّل',
    remaining: 'المتبقي',
    organization: 'الجهة المنفذة',
    category: 'الفئة',
    status: 'الحالة',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    notes: 'ملاحظات',
    linkedDonations: 'التبرعات المرتبطة',
    view: 'عرض التفاصيل',
    addDonation: 'إضافة تبرع',
    edit: 'تعديل',
    archive: 'أرشفة',
    saveProject: 'حفظ المشروع',
    cancel: 'إلغاء',
    projectName: 'اسم المشروع',
    comingSoon: 'قريباً',
    futureTitle: 'ميزات قادمة',
    annualPdfReport: 'تقرير الأعمال الخيرية السنوي PDF',
    generateReport: 'إنشاء التقرير',
    reportYear: 'سنة التقرير',
    exportExcel: 'تصدير Excel',
    preparingExcel: 'جاري تجهيز ملف Excel...',
    excelExported: 'تم تصدير ملف Excel بنجاح.',
    excelExportFailed: 'تعذر تصدير ملف Excel.',
    emptyReportExported: 'لا توجد بيانات كافية، سيتم تصدير تقرير فارغ.',
    documentVault: 'خزنة المستندات',
    documentVaultDesc: 'احفظ إيصالات التبرعات، شهادات الجمعيات، وتقارير المشاريع في مكان واحد.',
    documentsCenter: 'مركز المستندات',
    uploadDocument: 'رفع مستند',
    documentTitle: 'عنوان المستند',
    documentCategory: 'التصنيف',
    linkProject: 'ربط بمشروع',
    linkDonation: 'ربط بتبرع',
    linkZakatAsset: 'ربط بأصل زكاة',
    linkCommitment: 'ربط بالتزام',
    chooseFile: 'اختر الملف',
    searchDocuments: 'بحث في المستندات',
    allCategories: 'كل التصنيفات',
    noDocuments: 'لا توجد مستندات محفوظة حتى الآن.',
    fileTooLarge: 'حجم الملف كبير جداً.',
    unsupportedFileType: 'نوع الملف غير مدعوم.',
    uploadFailed: 'تعذر رفع المستند.',
    documentUploaded: 'تم رفع المستند بنجاح.',
    documentDeleted: 'تم حذف المستند بنجاح.',
    openDocumentFailed: 'تعذر فتح المستند حالياً.',
    confirmDeleteDocument: 'هل تريد حذف هذا المستند؟',
    viewDocument: 'عرض',
    downloadDocument: 'تحميل',
    deleteDocument: 'حذف',
    documentsCount: 'المستندات: {count}',
    searchInsideSoon: 'البحث داخل الملفات قريباً.',
    donation_receipt: 'إيصال تبرع',
    charity_certificate: 'شهادة جمعية',
    project_report: 'تقرير مشروع',
    zakat_document: 'مستند زكاة',
    beneficiary_report: 'تقرير مستفيد',
    hijriCalendar: 'التقويم الخيري الهجري',
    hijriCalendarDesc: 'تابع الزكاة، الحول، رمضان، ذي الحجة، الأضحية، الكفالات، ومواعيد المشاريع من مكان واحد.',
    upcomingReminders: 'التذكيرات القادمة',
    addReminder: '+ إضافة تذكير',
    reminderTitle: 'عنوان التذكير',
    reminderType: 'نوع التذكير',
    hijriDate: 'التاريخ الهجري',
    remindBefore: 'ذكرني قبل',
    priority: 'الأولوية',
    hijriEstimated: 'التاريخ الهجري تقديري',
    preciseHijriLater: 'سيتم تفعيل التاريخ الهجري الدقيق لاحقاً.',
    completedAction: 'تم',
    dismissAction: 'تجاهل',
    deleteAction: 'حذف',
    noReminders: 'لا توجد تذكيرات قادمة حتى الآن.',
    reminderSaved: 'تم حفظ التذكير بنجاح.',
    reminderUpdated: 'تم تحديث التذكير.',
    reminderDeleted: 'تم حذف التذكير.',
    confirmDeleteReminder: 'هل تريد حذف هذا التذكير؟',
    daysBefore: 'قبل {days} يوم',
    daysRemaining: 'باقي {days} يوم',
    dueToday: 'مستحق اليوم',
    overdue: 'متأخر {days} يوم',
    smartAlerts: 'تنبيهات ذكية',
    noUrgentAlerts: 'لا توجد تنبيهات عاجلة حالياً.',
    seasonalReminders: 'مواسم خيرية',
    notificationNote: 'هذه التذكيرات تظهر داخل صفحة المشاريع الخيرية حالياً، ولم يتم تفعيل الإشعارات الخارجية بعد.',
    ramadanPlanning: 'رمضان',
    lastTenNights: 'العشر الأواخر',
    arafahDay: 'يوم عرفة',
    eidAdha: 'الأضحية',
    zakatAnnualReview: 'مراجعة الزكاة السنوية',
    low: 'منخفضة',
    normal: 'عادية',
    high: 'عالية',
    active: 'نشط',
    dismissed: 'متجاهل',
    hawl: 'الحول',
    ramadan: 'رمضان',
    dhul_hijjah: 'ذو الحجة',
    arafah: 'عرفة',
    project_milestone: 'مرحلة مشروع',
    goldNisab: 'النصاب حسب الذهب',
    silverNisab: 'النصاب حسب الفضة',
    reachedNisabQuestion: 'هل بلغت النصاب؟',
    reachedNisab: 'أنت بلغت النصاب',
    notReachedNisab: 'لم تبلغ النصاب بعد',
    automaticPrice: 'السعر التلقائي',
    manualPrice: 'السعر اليدوي',
    nisabMethod: 'طريقة حساب النصاب',
    goldBased: 'حسب الذهب',
    silverBased: 'حسب الفضة',
    conservative: 'الأكثر احتياطاً',
    metalsStatus: 'حالة أسعار الذهب والفضة',
    lastUpdated: 'آخر تحديث',
    priceSource: 'مصدر السعر',
    apiNotConfigured: 'واجهة أسعار المعادن غير مفعّلة حالياً. أدخل السعر يدوياً.',
    metalsConversionWarning: 'تعذر تحويل أسعار الذهب إلى الدينار الكويتي تلقائياً. أدخل السعر يدوياً.',
    enterPriceManually: 'أدخل السعر يدوياً',
    refreshPrices: 'تحديث الأسعار',
    metalsDisclaimer: 'أسعار الذهب والفضة تقديرية وقد تختلف حسب العيار والمصدر وسعر السوق المحلي. استخدم الأسعار كمرجع، وراجع جهة مختصة للحالات الشرعية الخاصة.',
    zakatInputs: 'بيانات الزكاة',
    zakatSummaryTitle: 'ملخص الزكاة',
    zakatGuidanceTitle: 'التوضيح الشرعي والتنظيمي',
    cashSavings: 'النقد والمدخرات',
    zakatableInvestments: 'الاستثمارات القابلة للزكاة',
    goldHoldings: 'الذهب',
    goldWeight: 'وزن الذهب بالغرام',
    goldKarat: 'عيار الذهب',
    directGoldValue: 'أو أدخل القيمة مباشرة',
    silverHoldings: 'الفضة',
    silverWeight: 'وزن الفضة بالغرام',
    directSilverValue: 'أو أدخل القيمة مباشرة',
    nonZakatableAssets: 'أصول غير خاضعة للزكاة',
    personalHome: 'السكن الشخصي',
    personalCar: 'سيارة خاصة',
    householdFurniture: 'أثاث المنزل',
    personalTools: 'أدوات شخصية',
    residentialLand: 'أرض للسكن',
    personalUseAssets: 'أصول للاستخدام الشخصي',
    otherNonZakatAsset: 'وصف الأصل غير الخاضع للزكاة',
    nonZakatHelper: 'استبعد الأصول غير الخاضعة للزكاة مثل السكن الشخصي والسيارة الخاصة والأثاث المستخدم.',
    goldPriceToday: 'سعر الذهب اليوم',
    silverPriceToday: 'سعر الفضة اليوم',
    liveStatus: 'مباشر',
    manualStatus: 'يدوي',
    failedStatus: 'تعذر التحديث',
    manualFallback: 'تعذر تحميل أسعار الذهب والفضة. يمكنك إدخال السعر يدوياً مؤقتاً.',
    usedNisab: 'النصاب المستخدم في الحساب',
    netZakatBase: 'صافي الوعاء الزكوي',
    zakatDue: 'قيمة الزكاة المستحقة',
    zakatRate: 'نسبة الزكاة 2.5%',
    dueSummary: 'بلغت النصاب، والزكاة التقديرية المستحقة هي:',
    notDueSummary: 'لم تبلغ النصاب حسب البيانات المدخلة حالياً.',
    incompleteZakat: 'أكمل بيانات الأسعار أو الأصول لحساب الزكاة بدقة.',
    differenceFromNisab: 'الفرق عن النصاب',
    calculationMethod: 'طريقة الحساب',
    saveZakatCalculation: 'حفظ حساب الزكاة',
    zakatHistory: 'سجل حسابات الزكاة',
    noZakatHistory: 'لا توجد حسابات زكاة محفوظة حتى الآن.',
    calculationSaved: 'تم حفظ حساب الزكاة.',
    calculationDeleted: 'تم حذف حساب الزكاة.',
    completedHawl: 'اكتمل الحول',
    upcomingHawl: 'الحول قادم',
    missingOwnershipDate: 'تاريخ التملك غير مكتمل',
    closeToNisabNote: 'أنت قريب من النصاب. راقب المدخرات والاستثمارات خلال الفترة القادمة.',
    aboveNisabNote: 'الزكاة التقديرية ظاهرة بناءً على البيانات المدخلة. راجع الحالات الخاصة مع جهة مختصة.',
    missingPricesNote: 'تعذر حساب النصاب تلقائياً بسبب عدم توفر أسعار الذهب والفضة.',
    highDebtsNote: 'الديون المستحقة أثرت على صافي الوعاء الزكوي.',
    zakatEstimateDisclaimer: 'هذه الحاسبة تقديرية لأغراض التنظيم والمتابعة، ولا تعتبر فتوى شرعية. للحالات الخاصة، راجع جهة شرعية مختصة.',
    organizationDirectory: 'دليل الجهات الخيرية',
    organizationDirectoryDesc: 'اختر جهة خيرية موثوقة واربطها بمشاريعك وتبرعاتك لمتابعة الشفافية والتنظيم.',
    searchOrganization: 'بحث عن جهة خيرية',
    allOrganizations: 'كل الجهات',
    verifiedOrganizations: 'الجهات الموثقة',
    pendingReview: 'قيد المراجعة',
    unverified: 'غير موثقة',
    verified: 'موثقة',
    rejected: 'مرفوضة',
    organizationType: 'نوع الجهة',
    viewDetails: 'عرض التفاصيل',
    selectOrganization: 'اختيار الجهة',
    licenseNumber: 'رقم الترخيص',
    trustIndicators: 'مؤشرات الثقة',
    transparency: 'الشفافية',
    efficiency: 'الكفاءة',
    trackRecord: 'السجل السابق',
    notReviewedYet: 'لم يتم تقييم الجهة بعد',
    manualOrganizationEntry: 'لم أجد الجهة، إدخال يدوي',
    selectExecutingOrganization: 'اختيار الجهة المنفذة',
    verificationDisclaimer: 'حالة التوثيق في هذا الدليل لأغراض تنظيمية داخل التطبيق، ولا تغني عن التحقق من المصادر الرسمية قبل التبرع.',
    noOrganizationsAvailable: 'لا توجد جهات خيرية مضافة في الدليل حالياً. يمكن إضافة الجهات لاحقاً من خلال لوحة إدارة أو ملف استيراد موثوق.',
    dataSource: 'مصدر البيانات',
    unverifiedOrganizationWarning: 'هذه الجهة غير موثقة داخل التطبيق. تحقق من المصدر الرسمي قبل التبرع.',
    charity: 'جمعية خيرية',
    zakat_house: 'بيت زكاة',
    humanitarian: 'إنسانية',
    waqf: 'وقف',
    impactDashboard: 'لوحة الأثر',
    impactDashboardDesc: 'شاهد أثر تبرعاتك ومشاريعك الخيرية بناءً على بياناتك المسجلة.',
    notEnoughImpactData: 'لا توجد بيانات كافية لعرض الأثر حتى الآن.',
    totalDonated: 'إجمالي التبرعات',
    activeCharityProjects: 'المشاريع النشطة',
    completedProjects: 'المشاريع المكتملة',
    beneficiariesSupported: 'المستفيدون المدعومون',
    monthlySponsorships: 'الكفالات الشهرية',
    estimatedZakatImpact: 'الزكاة المقدرة',
    projectImpactProgress: 'تقدم أثر المشاريع',
    completionRate: 'نسبة الإنجاز',
    givingIncomeRatio: 'نسبة العطاء من الدخل',
    impactOverTime: 'تطور الأثر خلال السنة',
    impactByCategory: 'توزيع الأثر حسب النوع',
    beneficiaryImpact: 'أثر المستفيدين',
    yearlyImpactSummary: 'ملخص أثر السنة',
    customImpactIndicators: 'مؤشرات أثر مخصصة',
    addImpactMetric: 'إضافة مؤشر أثر',
    metricName: 'اسم المؤشر',
    metricValue: 'قيمة المؤشر',
    metricUnit: 'وحدة المؤشر',
    referenceBenchmark: 'مؤشر مرجعي',
    addIncomeForGivingRatio: 'أضف بيانات الدخل لحساب نسبة العطاء من الدخل.',
    customImpactHint: 'يمكنك إضافة مؤشرات أثر مخصصة لكل مشروع لعرض نتائج أدق.',
    projectContributions: 'مساهمات المشاريع',
    sponsorshipAmount: 'مبلغ الكفالات',
    currentMonth: 'الشهر الحالي',
    thisYear: 'هذا العام',
    metricSaved: 'تم حفظ مؤشر الأثر.',
    beneficiaryTracking: 'إدارة المستفيدين',
    beneficiaryDesc: 'تابع الكفالات والحالات الخيرية والمستفيدين المرتبطين بمشاريعك بشكل منظم وآمن.',
    privacyNote: 'استخدم رقماً مرجعياً أو اسماً مختصراً بدلاً من البيانات الشخصية الحساسة.',
    addBeneficiary: '+ إضافة مستفيد',
    shortName: 'الاسم المختصر / المرجع',
    referenceNumber: 'الرقم المرجعي',
    beneficiaryType: 'نوع المستفيد',
    linkedProject: 'المشروع المرتبط',
    responsibleOrg: 'الجهة المسؤولة',
    country: 'الدولة',
    city: 'المدينة',
    monthlySupport: 'مبلغ الكفالة الشهري',
    currency: 'العملة',
    sponsorshipStart: 'تاريخ بداية الكفالة',
    sponsorshipEnd: 'تاريخ نهاية الكفالة',
    nextRenewal: 'تاريخ التجديد القادم',
    totalBeneficiaries: 'إجمالي المستفيدين',
    activeSponsorships: 'الكفالات النشطة',
    monthlySupportTotal: 'الدعم الشهري',
    upcomingRenewals: 'تجديدات قادمة',
    searchBeneficiaries: 'بحث في المستفيدين',
    allStatuses: 'كل الحالات',
    allTypes: 'كل الفئات',
    noBeneficiaries: 'لا توجد سجلات مستفيدين حتى الآن.',
    addSupport: 'إضافة دعم',
    linkedDocuments: 'المستندات المرتبطة',
    beneficiariesCount: 'المستفيدون: {count}',
    beneficiarySaved: 'تم حفظ المستفيد بنجاح.',
    beneficiaryDeleted: 'تم حذف المستفيد.',
    confirmDeleteBeneficiary: 'هل تريد حذف هذا المستفيد؟',
    renewalReminderCreated: 'تم إنشاء تذكير التجديد.',
    familyCollaboration: 'التعاون العائلي',
    collaborationDesc: 'أضف أفراد العائلة أو المساهمين للمشروع وتابع مساهمة كل شخص ونسبة التغطية.',
    addContributor: '+ إضافة مساهم',
    contributorName: 'اسم المساهم',
    emailOptional: 'البريد الإلكتروني اختياري',
    role: 'الدور',
    pledgedAmount: 'المبلغ المتعهد به',
    paidAmount: 'المبلغ المدفوع',
    paymentStatus: 'حالة الدفع',
    markPaid: 'تحديد كمدفوع',
    totalPledged: 'إجمالي التعهدات',
    totalPaid: 'إجمالي المدفوع',
    contributors: 'عدد المساهمين',
    projectCoverage: 'نسبة تغطية المشروع',
    contributorSummary: 'ملخص المساهمين',
    contributorPayments: 'مساهمات المساهمين',
    recordedDonations: 'التبرعات المسجلة',
    invitationsSoon: 'إرسال الدعوات قريباً',
    emailSaved: 'تم حفظ البريد للمتابعة. إرسال الدعوات سيكون متاحاً لاحقاً.',
    contributorSaved: 'تم حفظ المساهم بنجاح.',
    contributorDeleted: 'تم حذف المساهم.',
    contributorPaid: 'تم تحديث مساهمة المساهم.',
    confirmDeleteContributor: 'هل تريد حذف هذا المساهم؟',
    lateContribution: 'مساهمة متأخرة',
    contributorsCount: 'المساهمون: {count}',
    topContributor: 'أعلى مساهم',
    owner: 'مالك',
    contributor: 'مساهم',
    viewer: 'مشاهد',
    pending: 'بانتظار',
    paid: 'مدفوع',
    partial: 'جزئي',
    late: 'متأخر',
    cancelled: 'ملغي',
    needs_review: 'يحتاج مراجعة',
    orphan: 'يتيم',
    family: 'أسرة',
    student: 'طالب',
    medical: 'حالة طبية',
    elderly: 'كبار السن',
    refugee: 'لاجئ',
    project_group: 'مجموعة مشروع',
    saved: 'تم الحفظ بنجاح.',
    error: 'تعذر تنفيذ العملية حالياً.',
    planning: 'تخطيط',
    fundraising: 'جاري الجمع',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتمل',
    paused: 'متوقف',
    ongoing: 'صدقة جارية',
    sponsorship: 'كفالة',
    zakat: 'زكاة',
    sacrifice: 'أضحية',
    endowment: 'وقف',
    mosque: 'بناء مسجد',
    water_well: 'بئر ماء',
    education: 'تعليم',
    relief: 'إغاثة',
    other: 'أخرى',
    monthly: 'شهري',
    annual: 'سنوي',
    once: 'مرة واحدة',
  },
  en: {
    title: 'Charity Projects',
    subtitle: 'Plan zakat, donations, sponsorships, and long-term charity projects intelligently.',
    breadcrumb: 'THE SFM / Charity Projects',
    newProject: '+ New Charity Project',
    zakatCalculator: 'Zakat Calculator',
    activeProjects: 'Active Projects',
    totalDonations: 'Total Donations This Year',
    commitments: 'Expected Charity Commitments',
    estimatedZakat: 'Estimated Zakat',
    nextZakat: 'Next Zakat Due Date',
    noDueDate: 'No due date',
    smartZakat: 'Smart Zakat Calculator',
    cash: 'Cash savings',
    investments: 'Investments',
    gold: 'Gold',
    silver: 'Silver',
    debts: 'Deductible debts',
    nonZakat: 'Non-zakat assets',
    goldPrice: 'Gold price per gram',
    silverPrice: 'Silver price per gram',
    zakatableAmount: 'Zakatable amount',
    zakatAmount: 'Zakat amount 2.5%',
    zakatDisclaimer: 'This calculator is an estimate for planning purposes. Please consult a qualified religious authority for special cases.',
    nisabNote: 'Gold and silver prices will be connected later to calculate nisab automatically. Manual input is available now.',
    hawlTracking: 'Hijri Hawl Tracking',
    assetName: 'Asset name',
    assetType: 'Asset type',
    ownershipDate: 'Ownership date',
    dueDate: 'Expected zakat due date',
    reminder: 'Reminder 30 days before due date',
    addAsset: 'Save zakat asset',
    projects: 'Your Charity Projects',
    templates: 'Project Templates',
    forecast: 'Expected Charity Commitments This Year',
    forecastEmpty: 'Add zakat, sponsorships, or projects to calculate expected commitments.',
    impact: 'Impact Analysis',
    donationAmount: 'Donation amount',
    incomeMissing: 'Add income data to analyze donation impact on your budget.',
    donationPercent: 'This donation equals {pct}% of your monthly income.',
    remainingNet: 'After this donation, expected monthly net is {amount}.',
    highWarning: 'Warning: this donation is high compared with your income this month.',
    emptyTitle: 'No charity projects yet.',
    emptyBody: 'Start by creating a charity project to track goals, donations, and progress.',
    target: 'Financial target',
    collected: 'Collected',
    remaining: 'Remaining',
    organization: 'Executing organization',
    category: 'Category',
    status: 'Status',
    startDate: 'Start date',
    endDate: 'End date',
    notes: 'Notes',
    linkedDonations: 'Linked donations',
    view: 'View details',
    addDonation: 'Add donation',
    edit: 'Edit',
    archive: 'Archive',
    saveProject: 'Save project',
    cancel: 'Cancel',
    projectName: 'Project name',
    comingSoon: 'Coming soon',
    futureTitle: 'Future features',
    annualPdfReport: 'Annual Charity PDF Report',
    generateReport: 'Generate Report',
    reportYear: 'Report year',
    exportExcel: 'Export Excel',
    preparingExcel: 'Preparing Excel file...',
    excelExported: 'Excel file exported successfully.',
    excelExportFailed: 'Could not export Excel file.',
    emptyReportExported: 'Not enough data. An empty report will be exported.',
    documentVault: 'Document Vault',
    documentVaultDesc: 'Store donation receipts, charity certificates, and project reports in one place.',
    documentsCenter: 'Documents Center',
    uploadDocument: 'Upload Document',
    documentTitle: 'Document title',
    documentCategory: 'Category',
    linkProject: 'Link to project',
    linkDonation: 'Link to donation',
    linkZakatAsset: 'Link to zakat asset',
    linkCommitment: 'Link to commitment',
    chooseFile: 'Choose file',
    searchDocuments: 'Search documents',
    allCategories: 'All categories',
    noDocuments: 'No documents saved yet.',
    fileTooLarge: 'File is too large.',
    unsupportedFileType: 'Unsupported file type.',
    uploadFailed: 'Upload failed.',
    documentUploaded: 'Document uploaded successfully.',
    documentDeleted: 'Document deleted successfully.',
    openDocumentFailed: 'Could not open the document right now.',
    confirmDeleteDocument: 'Do you want to delete this document?',
    viewDocument: 'View',
    downloadDocument: 'Download',
    deleteDocument: 'Delete',
    documentsCount: 'Documents: {count}',
    searchInsideSoon: 'Search inside files coming soon.',
    donation_receipt: 'Donation receipt',
    charity_certificate: 'Charity certificate',
    project_report: 'Project report',
    zakat_document: 'Zakat document',
    beneficiary_report: 'Beneficiary report',
    hijriCalendar: 'Hijri Charity Calendar',
    hijriCalendarDesc: 'Track zakat, hawl, Ramadan, Dhul Hijjah, sacrifice, sponsorships, and project deadlines in one place.',
    upcomingReminders: 'Upcoming Reminders',
    addReminder: '+ Add Reminder',
    reminderTitle: 'Reminder title',
    reminderType: 'Reminder type',
    hijriDate: 'Hijri date',
    remindBefore: 'Remind me before',
    priority: 'Priority',
    hijriEstimated: 'Hijri date is estimated',
    preciseHijriLater: 'Precise Hijri dates will be enabled later.',
    completedAction: 'Completed',
    dismissAction: 'Dismiss',
    deleteAction: 'Delete',
    noReminders: 'No upcoming reminders yet.',
    reminderSaved: 'Reminder saved successfully.',
    reminderUpdated: 'Reminder updated.',
    reminderDeleted: 'Reminder deleted.',
    confirmDeleteReminder: 'Do you want to delete this reminder?',
    daysBefore: '{days} days before',
    daysRemaining: '{days} days remaining',
    dueToday: 'Due today',
    overdue: '{days} days overdue',
    smartAlerts: 'Smart Alerts',
    noUrgentAlerts: 'No urgent alerts right now.',
    seasonalReminders: 'Islamic charity seasons',
    notificationNote: 'These reminders appear inside Charity Projects for now. External notifications are not enabled yet.',
    ramadanPlanning: 'Ramadan planning',
    lastTenNights: 'Last 10 nights',
    arafahDay: 'Arafah day',
    eidAdha: 'Eid Al-Adha / sacrifice',
    zakatAnnualReview: 'Annual zakat review',
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    active: 'Active',
    dismissed: 'Dismissed',
    hawl: 'Hawl',
    ramadan: 'Ramadan',
    dhul_hijjah: 'Dhul Hijjah',
    arafah: 'Arafah',
    project_milestone: 'Project milestone',
    goldNisab: 'Gold-based Nisab',
    silverNisab: 'Silver-based Nisab',
    reachedNisabQuestion: 'Have you reached Nisab?',
    reachedNisab: 'You have reached Nisab',
    notReachedNisab: 'You have not reached Nisab yet',
    automaticPrice: 'Automatic price',
    manualPrice: 'Manual price',
    nisabMethod: 'Nisab calculation method',
    goldBased: 'Gold-based',
    silverBased: 'Silver-based',
    conservative: 'More conservative',
    metalsStatus: 'Gold and Silver Price Status',
    lastUpdated: 'Last updated',
    priceSource: 'Price source',
    apiNotConfigured: 'Metals price API is not configured. Please enter prices manually.',
    metalsConversionWarning: 'Could not automatically convert metal prices to KWD. Please enter the price manually.',
    enterPriceManually: 'Enter price manually',
    refreshPrices: 'Refresh prices',
    metalsDisclaimer: 'Gold and silver prices are estimates and may vary by purity, source, and local market price. Use these prices as a reference and consult a qualified authority for specific religious cases.',
    zakatInputs: 'Zakat Inputs',
    zakatSummaryTitle: 'Zakat Summary',
    zakatGuidanceTitle: 'Religious & Planning Notes',
    cashSavings: 'Cash / Savings',
    zakatableInvestments: 'Zakatable investments',
    goldHoldings: 'Gold holdings',
    goldWeight: 'Gold weight in grams',
    goldKarat: 'Gold karat',
    directGoldValue: 'Or enter value directly',
    silverHoldings: 'Silver holdings',
    silverWeight: 'Silver weight in grams',
    directSilverValue: 'Or enter value directly',
    nonZakatableAssets: 'Non-zakatable assets',
    personalHome: 'Personal home',
    personalCar: 'Personal car',
    householdFurniture: 'Household furniture',
    personalTools: 'Personal tools',
    residentialLand: 'Residential land',
    personalUseAssets: 'Personal-use assets',
    otherNonZakatAsset: 'Describe other non-zakatable asset',
    nonZakatHelper: 'Exclude non-zakatable assets such as a personal home, private car, and used household furniture.',
    goldPriceToday: 'Gold price today',
    silverPriceToday: 'Silver price today',
    liveStatus: 'Live',
    manualStatus: 'Manual',
    failedStatus: 'Update failed',
    manualFallback: 'Could not load gold and silver prices. You can enter prices manually temporarily.',
    usedNisab: 'Selected Nisab',
    netZakatBase: 'Net zakat base',
    zakatDue: 'Zakat due',
    zakatRate: 'Zakat rate 2.5%',
    dueSummary: 'You have reached Nisab. Estimated zakat due is:',
    notDueSummary: 'You have not reached Nisab based on the current inputs.',
    incompleteZakat: 'Complete price or asset data to calculate zakat accurately.',
    differenceFromNisab: 'Difference from Nisab',
    calculationMethod: 'Calculation method',
    saveZakatCalculation: 'Save Zakat Calculation',
    zakatHistory: 'Zakat History',
    noZakatHistory: 'No saved zakat calculations yet.',
    calculationSaved: 'Zakat calculation saved.',
    calculationDeleted: 'Zakat calculation deleted.',
    completedHawl: 'Hawl completed',
    upcomingHawl: 'Hawl upcoming',
    missingOwnershipDate: 'Ownership date incomplete',
    closeToNisabNote: 'You are close to Nisab. Monitor savings and investments in the coming period.',
    aboveNisabNote: 'The estimated zakat is based on your inputs. Consult a qualified authority for special cases.',
    missingPricesNote: 'Nisab could not be calculated automatically because gold and silver prices are unavailable.',
    highDebtsNote: 'Deductible debts affected the net zakat base.',
    zakatEstimateDisclaimer: 'This calculator is an estimate for planning and tracking. It is not a religious ruling. For special cases, consult a qualified authority.',
    organizationDirectory: 'Charity Organization Directory',
    organizationDirectoryDesc: 'Choose a trusted charity organization and link it to your projects and donations for better transparency and organization.',
    searchOrganization: 'Search charity organization',
    allOrganizations: 'All organizations',
    verifiedOrganizations: 'Verified organizations',
    pendingReview: 'Pending review',
    unverified: 'Unverified',
    verified: 'Verified',
    rejected: 'Rejected',
    organizationType: 'Organization type',
    viewDetails: 'View details',
    selectOrganization: 'Select organization',
    licenseNumber: 'License number',
    trustIndicators: 'Trust Indicators',
    transparency: 'Transparency',
    efficiency: 'Efficiency',
    trackRecord: 'Track record',
    notReviewedYet: 'Not reviewed yet',
    manualOrganizationEntry: 'I cannot find the organization, enter manually',
    selectExecutingOrganization: 'Select executing organization',
    verificationDisclaimer: 'The verification status in this directory is for in-app organization purposes and does not replace checking official sources before donating.',
    noOrganizationsAvailable: 'No charity organizations are currently available in the directory. Organizations can be added later through an admin panel or trusted import file.',
    dataSource: 'Data source',
    unverifiedOrganizationWarning: 'This organization is not verified inside the app. Check the official source before donating.',
    charity: 'Charity',
    zakat_house: 'Zakat house',
    humanitarian: 'Humanitarian',
    waqf: 'Waqf',
    impactDashboard: 'Impact Dashboard',
    impactDashboardDesc: 'See the impact of your donations and charity projects based on your recorded data.',
    notEnoughImpactData: 'Not enough data to show impact yet.',
    totalDonated: 'Total donated',
    activeCharityProjects: 'Active charity projects',
    completedProjects: 'Completed projects',
    beneficiariesSupported: 'Beneficiaries supported',
    monthlySponsorships: 'Monthly sponsorships',
    estimatedZakatImpact: 'Estimated zakat',
    projectImpactProgress: 'Project impact progress',
    completionRate: 'Completion rate',
    givingIncomeRatio: 'Giving-to-Income Ratio',
    impactOverTime: 'Impact Over Time',
    impactByCategory: 'Impact by Category',
    beneficiaryImpact: 'Beneficiary impact',
    yearlyImpactSummary: 'Yearly impact summary',
    customImpactIndicators: 'Custom impact indicators',
    addImpactMetric: 'Add impact metric',
    metricName: 'Metric name',
    metricValue: 'Metric value',
    metricUnit: 'Metric unit',
    referenceBenchmark: 'Reference benchmark',
    addIncomeForGivingRatio: 'Add income data to calculate your giving-to-income ratio.',
    customImpactHint: 'You can add custom impact indicators to each project for more accurate results.',
    projectContributions: 'Project contributions',
    sponsorshipAmount: 'Sponsorship amount',
    currentMonth: 'Current month',
    thisYear: 'This year',
    metricSaved: 'Impact metric saved.',
    beneficiaryTracking: 'Beneficiary Tracking',
    beneficiaryDesc: 'Track sponsorships, charity cases, and beneficiaries linked to your projects in an organized and secure way.',
    privacyNote: 'Use a reference number or short label instead of sensitive personal information.',
    addBeneficiary: '+ Add Beneficiary',
    shortName: 'Short name / label',
    referenceNumber: 'Reference number',
    beneficiaryType: 'Beneficiary type',
    linkedProject: 'Linked project',
    responsibleOrg: 'Responsible organization',
    country: 'Country',
    city: 'City',
    monthlySupport: 'Monthly support amount',
    currency: 'Currency',
    sponsorshipStart: 'Sponsorship start date',
    sponsorshipEnd: 'Sponsorship end date',
    nextRenewal: 'Next renewal date',
    totalBeneficiaries: 'Total Beneficiaries',
    activeSponsorships: 'Active Sponsorships',
    monthlySupportTotal: 'Monthly Support',
    upcomingRenewals: 'Upcoming Renewals',
    searchBeneficiaries: 'Search beneficiaries',
    allStatuses: 'All statuses',
    allTypes: 'All categories',
    noBeneficiaries: 'No beneficiaries yet.',
    addSupport: 'Add support',
    linkedDocuments: 'Linked documents',
    beneficiariesCount: 'Beneficiaries: {count}',
    beneficiarySaved: 'Beneficiary saved successfully.',
    beneficiaryDeleted: 'Beneficiary deleted.',
    confirmDeleteBeneficiary: 'Do you want to delete this beneficiary?',
    renewalReminderCreated: 'Renewal reminder created.',
    familyCollaboration: 'Family Collaboration',
    collaborationDesc: 'Add family members or contributors to a project and track each person’s contribution and coverage percentage.',
    addContributor: '+ Add Contributor',
    contributorName: 'Contributor name',
    emailOptional: 'Email optional',
    role: 'Role',
    pledgedAmount: 'Pledged amount',
    paidAmount: 'Paid amount',
    paymentStatus: 'Payment status',
    markPaid: 'Mark as Paid',
    totalPledged: 'Total pledged',
    totalPaid: 'Total paid',
    contributors: 'Contributors',
    projectCoverage: 'Project coverage',
    contributorSummary: 'Contributors Summary',
    contributorPayments: 'Contributor payments',
    recordedDonations: 'Recorded donations',
    invitationsSoon: 'Invitations coming soon',
    emailSaved: 'Email saved for follow-up. Sending invitations will be available later.',
    contributorSaved: 'Contributor saved successfully.',
    contributorDeleted: 'Contributor deleted.',
    contributorPaid: 'Contributor payment updated.',
    confirmDeleteContributor: 'Do you want to delete this contributor?',
    lateContribution: 'Late contribution',
    contributorsCount: 'Contributors: {count}',
    topContributor: 'Top contributor',
    owner: 'Owner',
    contributor: 'Contributor',
    viewer: 'Viewer',
    pending: 'Pending',
    paid: 'Paid',
    partial: 'Partial',
    late: 'Late',
    cancelled: 'Cancelled',
    needs_review: 'Needs review',
    orphan: 'Orphan',
    family: 'Family',
    student: 'Student',
    medical: 'Medical',
    elderly: 'Elderly',
    refugee: 'Refugee',
    project_group: 'Project group',
    saved: 'Saved successfully.',
    error: 'This action could not be completed right now.',
    planning: 'Planning',
    fundraising: 'Fundraising',
    in_progress: 'In progress',
    completed: 'Completed',
    paused: 'Paused',
    ongoing: 'Ongoing charity',
    sponsorship: 'Sponsorship',
    zakat: 'Zakat',
    sacrifice: 'Sacrifice',
    endowment: 'Endowment',
    mosque: 'Mosque construction',
    water_well: 'Water well',
    education: 'Education',
    relief: 'Relief',
    other: 'Other',
    monthly: 'Monthly',
    annual: 'Annual',
    once: 'One-time',
  },
  fr: {
    title: 'Projets caritatifs',
    subtitle: 'Planifiez la zakat, les dons, les parrainages et les projets caritatifs à long terme intelligemment.',
    breadcrumb: 'THE SFM / Projets caritatifs',
    newProject: '+ Nouveau projet caritatif',
    zakatCalculator: 'Calculateur de zakat',
    activeProjects: 'Projets actifs',
    totalDonations: 'Total des dons cette année',
    commitments: 'Engagements caritatifs prévus',
    estimatedZakat: 'Zakat estimée',
    nextZakat: 'Prochaine échéance de zakat',
    noDueDate: 'Aucune échéance',
    smartZakat: 'Calculateur intelligent de zakat',
    cash: 'Épargne en espèces',
    investments: 'Investissements',
    gold: 'Or',
    silver: 'Argent',
    debts: 'Dettes déductibles',
    nonZakat: 'Actifs non soumis à la zakat',
    goldPrice: "Prix de l'or par gramme",
    silverPrice: "Prix de l'argent par gramme",
    zakatableAmount: 'Montant soumis à la zakat',
    zakatAmount: 'Montant de zakat 2,5 %',
    zakatDisclaimer: 'Ce calculateur fournit une estimation à des fins d’organisation. Consultez une autorité religieuse qualifiée pour les cas particuliers.',
    nisabNote: "Les prix de l’or et de l’argent seront connectés plus tard pour calculer le nisab automatiquement. La saisie manuelle est disponible.",
    hawlTracking: 'Suivi du hawl hijri',
    assetName: "Nom de l'actif",
    assetType: "Type d'actif",
    ownershipDate: "Date d'acquisition",
    dueDate: 'Date de zakat prévue',
    reminder: "Rappel 30 jours avant l'échéance",
    addAsset: "Enregistrer l'actif",
    projects: 'Vos projets caritatifs',
    templates: 'Modèles de projets',
    forecast: 'Engagements caritatifs prévus cette année',
    forecastEmpty: 'Ajoutez la zakat, les parrainages ou les projets pour calculer les engagements prévus.',
    impact: "Analyse d'impact",
    donationAmount: 'Montant du don',
    incomeMissing: 'Ajoutez vos revenus pour analyser l’impact du don sur votre budget.',
    donationPercent: 'Ce don représente {pct}% de votre revenu mensuel.',
    remainingNet: 'Après ce don, le net mensuel prévu est {amount}.',
    highWarning: 'Attention : ce don est élevé par rapport à votre revenu ce mois-ci.',
    emptyTitle: 'Aucun projet caritatif pour le moment.',
    emptyBody: 'Créez un projet caritatif pour suivre les objectifs, les dons et la progression.',
    target: 'Objectif financier',
    collected: 'Collecté',
    remaining: 'Restant',
    organization: 'Organisation exécutante',
    category: 'Catégorie',
    status: 'Statut',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    notes: 'Notes',
    linkedDonations: 'Dons liés',
    view: 'Voir les détails',
    addDonation: 'Ajouter un don',
    edit: 'Modifier',
    archive: 'Archiver',
    saveProject: 'Enregistrer le projet',
    cancel: 'Annuler',
    projectName: 'Nom du projet',
    comingSoon: 'Bientôt',
    futureTitle: 'Fonctionnalités à venir',
    annualPdfReport: 'Rapport annuel caritatif PDF',
    generateReport: 'Générer le rapport',
    reportYear: 'Année du rapport',
    exportExcel: 'Exporter Excel',
    preparingExcel: 'Préparation du fichier Excel...',
    excelExported: 'Fichier Excel exporté avec succès.',
    excelExportFailed: 'Impossible d’exporter le fichier Excel.',
    emptyReportExported: 'Données insuffisantes. Un rapport vide sera exporté.',
    documentVault: 'Coffre de documents',
    documentVaultDesc: 'Conservez les reçus de dons, les certificats d’associations et les rapports de projets au même endroit.',
    documentsCenter: 'Centre des documents',
    uploadDocument: 'Téléverser un document',
    documentTitle: 'Titre du document',
    documentCategory: 'Catégorie',
    linkProject: 'Lier à un projet',
    linkDonation: 'Lier à un don',
    linkZakatAsset: 'Lier à un actif de zakat',
    linkCommitment: 'Lier à un engagement',
    chooseFile: 'Choisir un fichier',
    searchDocuments: 'Rechercher des documents',
    allCategories: 'Toutes les catégories',
    noDocuments: 'Aucun document enregistré pour le moment.',
    fileTooLarge: 'Le fichier est trop volumineux.',
    unsupportedFileType: 'Type de fichier non pris en charge.',
    uploadFailed: 'Impossible de téléverser le fichier.',
    documentUploaded: 'Document téléversé avec succès.',
    documentDeleted: 'Document supprimé avec succès.',
    openDocumentFailed: 'Impossible d’ouvrir le document pour le moment.',
    confirmDeleteDocument: 'Voulez-vous supprimer ce document ?',
    viewDocument: 'Voir',
    downloadDocument: 'Télécharger',
    deleteDocument: 'Supprimer',
    documentsCount: 'Documents : {count}',
    searchInsideSoon: 'Recherche dans les fichiers bientôt disponible.',
    donation_receipt: 'Reçu de don',
    charity_certificate: 'Certificat d’association',
    project_report: 'Rapport de projet',
    zakat_document: 'Document de zakat',
    beneficiary_report: 'Rapport de bénéficiaire',
    hijriCalendar: 'Calendrier caritatif hijri',
    hijriCalendarDesc: 'Suivez la zakat, le hawl, Ramadan, Dhul Hijjah, le sacrifice, les parrainages et les échéances de projets.',
    upcomingReminders: 'Rappels à venir',
    addReminder: '+ Ajouter un rappel',
    reminderTitle: 'Titre du rappel',
    reminderType: 'Type de rappel',
    hijriDate: 'Date hijri',
    remindBefore: 'Me rappeler avant',
    priority: 'Priorité',
    hijriEstimated: 'La date hijri est estimée',
    preciseHijriLater: 'Les dates hijri précises seront activées ultérieurement.',
    completedAction: 'Terminé',
    dismissAction: 'Ignorer',
    deleteAction: 'Supprimer',
    noReminders: 'Aucun rappel à venir pour le moment.',
    reminderSaved: 'Rappel enregistré avec succès.',
    reminderUpdated: 'Rappel mis à jour.',
    reminderDeleted: 'Rappel supprimé.',
    confirmDeleteReminder: 'Voulez-vous supprimer ce rappel ?',
    daysBefore: '{days} jours avant',
    daysRemaining: '{days} jours restants',
    dueToday: "Échéance aujourd'hui",
    overdue: 'En retard de {days} jours',
    smartAlerts: 'Alertes intelligentes',
    noUrgentAlerts: 'Aucune alerte urgente pour le moment.',
    seasonalReminders: 'Saisons caritatives islamiques',
    notificationNote: 'Ces rappels apparaissent dans Projets caritatifs pour le moment. Les notifications externes ne sont pas encore activées.',
    ramadanPlanning: 'Ramadan',
    lastTenNights: 'Les 10 dernières nuits',
    arafahDay: 'Jour de Arafah',
    eidAdha: 'Aïd Al-Adha / sacrifice',
    zakatAnnualReview: 'Révision annuelle de la zakat',
    low: 'Faible',
    normal: 'Normale',
    high: 'Élevée',
    active: 'Actif',
    dismissed: 'Ignoré',
    hawl: 'Hawl',
    ramadan: 'Ramadan',
    dhul_hijjah: 'Dhul Hijjah',
    arafah: 'Arafah',
    project_milestone: 'Jalon de projet',
    goldNisab: 'Nisab basé sur l’or',
    silverNisab: 'Nisab basé sur l’argent',
    reachedNisabQuestion: 'Avez-vous atteint le nisab ?',
    reachedNisab: 'Vous avez atteint le nisab',
    notReachedNisab: 'Vous n’avez pas encore atteint le nisab',
    automaticPrice: 'Prix automatique',
    manualPrice: 'Prix manuel',
    nisabMethod: 'Méthode de calcul du nisab',
    goldBased: 'Basé sur l’or',
    silverBased: 'Basé sur l’argent',
    conservative: 'Plus prudent',
    metalsStatus: 'État des prix de l’or et de l’argent',
    lastUpdated: 'Dernière mise à jour',
    priceSource: 'Source du prix',
    apiNotConfigured: 'L’API des prix des métaux n’est pas configurée. Veuillez saisir les prix manuellement.',
    metalsConversionWarning: 'Impossible de convertir automatiquement les prix des métaux en KWD. Veuillez saisir le prix manuellement.',
    enterPriceManually: 'Saisir le prix manuellement',
    refreshPrices: 'Actualiser les prix',
    metalsDisclaimer: 'Les prix de l’or et de l’argent sont estimatifs et peuvent varier selon la pureté, la source et le marché local. Utilisez-les comme référence et consultez une autorité qualifiée pour les cas religieux spécifiques.',
    zakatInputs: 'Données de zakat',
    zakatSummaryTitle: 'Résumé de la zakat',
    zakatGuidanceTitle: 'Notes religieuses et d’organisation',
    cashSavings: 'Espèces / épargne',
    zakatableInvestments: 'Investissements soumis à la zakat',
    goldHoldings: 'Or',
    goldWeight: 'Poids de l’or en grammes',
    goldKarat: 'Carat de l’or',
    directGoldValue: 'Ou saisir la valeur directement',
    silverHoldings: 'Argent',
    silverWeight: 'Poids de l’argent en grammes',
    directSilverValue: 'Ou saisir la valeur directement',
    nonZakatableAssets: 'Actifs non soumis à la zakat',
    personalHome: 'Résidence personnelle',
    personalCar: 'Voiture personnelle',
    householdFurniture: 'Mobilier du foyer',
    personalTools: 'Objets personnels',
    residentialLand: 'Terrain résidentiel',
    personalUseAssets: 'Actifs à usage personnel',
    otherNonZakatAsset: 'Décrire un autre actif non soumis à la zakat',
    nonZakatHelper: 'Excluez les actifs non soumis à la zakat comme la résidence personnelle, la voiture privée et le mobilier utilisé.',
    goldPriceToday: 'Prix de l’or aujourd’hui',
    silverPriceToday: 'Prix de l’argent aujourd’hui',
    liveStatus: 'Direct',
    manualStatus: 'Manuel',
    failedStatus: 'Échec de mise à jour',
    manualFallback: 'Impossible de charger les prix de l’or et de l’argent. Vous pouvez saisir les prix manuellement temporairement.',
    usedNisab: 'Nisab utilisé',
    netZakatBase: 'Base nette de zakat',
    zakatDue: 'Zakat due',
    zakatRate: 'Taux de zakat 2,5 %',
    dueSummary: 'Vous avez atteint le nisab. La zakat estimée due est :',
    notDueSummary: 'Vous n’avez pas atteint le nisab selon les données actuelles.',
    incompleteZakat: 'Complétez les prix ou les actifs pour calculer la zakat avec précision.',
    differenceFromNisab: 'Écart par rapport au nisab',
    calculationMethod: 'Méthode de calcul',
    saveZakatCalculation: 'Enregistrer le calcul de zakat',
    zakatHistory: 'Historique des calculs de zakat',
    noZakatHistory: 'Aucun calcul de zakat enregistré pour le moment.',
    calculationSaved: 'Calcul de zakat enregistré.',
    calculationDeleted: 'Calcul de zakat supprimé.',
    completedHawl: 'Hawl terminé',
    upcomingHawl: 'Hawl à venir',
    missingOwnershipDate: 'Date d’acquisition incomplète',
    closeToNisabNote: 'Vous êtes proche du nisab. Surveillez l’épargne et les investissements prochainement.',
    aboveNisabNote: 'La zakat estimée est basée sur vos données. Consultez une autorité qualifiée pour les cas particuliers.',
    missingPricesNote: 'Le nisab ne peut pas être calculé automatiquement car les prix de l’or et de l’argent sont indisponibles.',
    highDebtsNote: 'Les dettes déductibles ont affecté la base nette de zakat.',
    zakatEstimateDisclaimer: 'Ce calculateur fournit une estimation à des fins d’organisation et de suivi. Il ne constitue pas un avis religieux. Pour les cas particuliers, consultez une autorité qualifiée.',
    organizationDirectory: 'Répertoire des organisations caritatives',
    organizationDirectoryDesc: 'Choisissez une organisation caritative fiable et liez-la à vos projets et dons pour plus de transparence et d’organisation.',
    searchOrganization: 'Rechercher une organisation caritative',
    allOrganizations: 'Toutes les organisations',
    verifiedOrganizations: 'Organisations vérifiées',
    pendingReview: 'En cours d’examen',
    unverified: 'Non vérifiée',
    verified: 'Vérifiée',
    rejected: 'Rejetée',
    organizationType: 'Type d’organisation',
    viewDetails: 'Voir les détails',
    selectOrganization: 'Sélectionner l’organisation',
    licenseNumber: 'Numéro de licence',
    trustIndicators: 'Indicateurs de confiance',
    transparency: 'Transparence',
    efficiency: 'Efficacité',
    trackRecord: 'Historique',
    notReviewedYet: 'Pas encore évaluée',
    manualOrganizationEntry: 'Je ne trouve pas l’organisation, saisie manuelle',
    selectExecutingOrganization: 'Sélectionner l’organisation exécutante',
    verificationDisclaimer: 'Le statut de vérification dans ce répertoire sert à l’organisation dans l’application et ne remplace pas la vérification auprès des sources officielles avant de faire un don.',
    noOrganizationsAvailable: 'Aucune organisation caritative n’est actuellement disponible dans le répertoire. Les organisations pourront être ajoutées plus tard via un panneau d’administration ou un fichier d’import fiable.',
    dataSource: 'Source des données',
    unverifiedOrganizationWarning: 'Cette organisation n’est pas vérifiée dans l’application. Vérifiez la source officielle avant de faire un don.',
    charity: 'Association caritative',
    zakat_house: 'Maison de zakat',
    humanitarian: 'Humanitaire',
    waqf: 'Waqf',
    impactDashboard: 'Tableau d’impact',
    impactDashboardDesc: 'Visualisez l’impact de vos dons et projets caritatifs à partir de vos données enregistrées.',
    notEnoughImpactData: 'Données insuffisantes pour afficher l’impact pour le moment.',
    totalDonated: 'Total donné',
    activeCharityProjects: 'Projets actifs',
    completedProjects: 'Projets terminés',
    beneficiariesSupported: 'Bénéficiaires soutenus',
    monthlySponsorships: 'Parrainages mensuels',
    estimatedZakatImpact: 'Zakat estimée',
    projectImpactProgress: 'Progression de l’impact des projets',
    completionRate: 'Taux d’achèvement',
    givingIncomeRatio: 'Ratio dons / revenus',
    impactOverTime: 'Évolution de l’impact',
    impactByCategory: 'Impact par catégorie',
    beneficiaryImpact: 'Impact des bénéficiaires',
    yearlyImpactSummary: 'Résumé annuel de l’impact',
    customImpactIndicators: 'Indicateurs d’impact personnalisés',
    addImpactMetric: 'Ajouter un indicateur d’impact',
    metricName: 'Nom de l’indicateur',
    metricValue: 'Valeur de l’indicateur',
    metricUnit: 'Unité de l’indicateur',
    referenceBenchmark: 'Indicateur de référence',
    addIncomeForGivingRatio: 'Ajoutez vos revenus pour calculer le ratio dons / revenus.',
    customImpactHint: 'Vous pouvez ajouter des indicateurs d’impact personnalisés à chaque projet pour des résultats plus précis.',
    projectContributions: 'Contributions aux projets',
    sponsorshipAmount: 'Montant des parrainages',
    currentMonth: 'Mois en cours',
    thisYear: 'Cette année',
    metricSaved: 'Indicateur d’impact enregistré.',
    beneficiaryTracking: 'Suivi des bénéficiaires',
    beneficiaryDesc: 'Suivez les parrainages, les cas caritatifs et les bénéficiaires liés à vos projets de manière organisée et sécurisée.',
    privacyNote: 'Utilisez un numéro de référence ou un libellé court au lieu de données personnelles sensibles.',
    addBeneficiary: '+ Ajouter un bénéficiaire',
    shortName: 'Nom court / libellé',
    referenceNumber: 'Numéro de référence',
    beneficiaryType: 'Type de bénéficiaire',
    linkedProject: 'Projet lié',
    responsibleOrg: 'Organisation responsable',
    country: 'Pays',
    city: 'Ville',
    monthlySupport: 'Montant du soutien mensuel',
    currency: 'Devise',
    sponsorshipStart: 'Date de début du parrainage',
    sponsorshipEnd: 'Date de fin du parrainage',
    nextRenewal: 'Prochaine date de renouvellement',
    totalBeneficiaries: 'Total des bénéficiaires',
    activeSponsorships: 'Parrainages actifs',
    monthlySupportTotal: 'Soutien mensuel',
    upcomingRenewals: 'Renouvellements à venir',
    searchBeneficiaries: 'Rechercher des bénéficiaires',
    allStatuses: 'Tous les statuts',
    allTypes: 'Toutes les catégories',
    noBeneficiaries: 'Aucun bénéficiaire pour le moment.',
    addSupport: 'Ajouter un soutien',
    linkedDocuments: 'Documents liés',
    beneficiariesCount: 'Bénéficiaires : {count}',
    beneficiarySaved: 'Bénéficiaire enregistré avec succès.',
    beneficiaryDeleted: 'Bénéficiaire supprimé.',
    confirmDeleteBeneficiary: 'Voulez-vous supprimer ce bénéficiaire ?',
    renewalReminderCreated: 'Rappel de renouvellement créé.',
    familyCollaboration: 'Collaboration familiale',
    collaborationDesc: 'Ajoutez des membres de la famille ou des contributeurs à un projet et suivez la contribution de chacun.',
    addContributor: '+ Ajouter un contributeur',
    contributorName: 'Nom du contributeur',
    emailOptional: 'E-mail facultatif',
    role: 'Rôle',
    pledgedAmount: 'Montant promis',
    paidAmount: 'Montant payé',
    paymentStatus: 'Statut du paiement',
    markPaid: 'Marquer comme payé',
    totalPledged: 'Total promis',
    totalPaid: 'Total payé',
    contributors: 'Contributeurs',
    projectCoverage: 'Couverture du projet',
    contributorSummary: 'Résumé des contributeurs',
    contributorPayments: 'Paiements des contributeurs',
    recordedDonations: 'Dons enregistrés',
    invitationsSoon: 'Invitations bientôt disponibles',
    emailSaved: 'E-mail enregistré pour le suivi. L’envoi d’invitations sera disponible plus tard.',
    contributorSaved: 'Contributeur enregistré avec succès.',
    contributorDeleted: 'Contributeur supprimé.',
    contributorPaid: 'Paiement du contributeur mis à jour.',
    confirmDeleteContributor: 'Voulez-vous supprimer ce contributeur ?',
    lateContribution: 'Contribution en retard',
    contributorsCount: 'Contributeurs : {count}',
    topContributor: 'Meilleur contributeur',
    owner: 'Propriétaire',
    contributor: 'Contributeur',
    viewer: 'Lecteur',
    pending: 'En attente',
    paid: 'Payé',
    partial: 'Partiel',
    late: 'En retard',
    cancelled: 'Annulé',
    needs_review: 'À réviser',
    orphan: 'Orphelin',
    family: 'Famille',
    student: 'Étudiant',
    medical: 'Médical',
    elderly: 'Personne âgée',
    refugee: 'Réfugié',
    project_group: 'Groupe de projet',
    saved: 'Enregistré avec succès.',
    error: "Impossible d'effectuer cette action pour le moment.",
    planning: 'Planification',
    fundraising: 'Collecte',
    in_progress: 'En cours',
    completed: 'Terminé',
    paused: 'En pause',
    ongoing: 'Aumône continue',
    sponsorship: 'Parrainage',
    zakat: 'Zakat',
    sacrifice: 'Sacrifice',
    endowment: 'Waqf',
    mosque: 'Construction de mosquée',
    water_well: "Puits d'eau",
    education: 'Éducation',
    relief: 'Secours',
    other: 'Autre',
    monthly: 'Mensuel',
    annual: 'Annuel',
    once: 'Unique',
  },
} as const;

const categories: ProjectCategory[] = ['ongoing', 'sponsorship', 'zakat', 'sacrifice', 'endowment', 'mosque', 'water_well', 'education', 'relief', 'other'];
const statuses: ProjectStatus[] = ['planning', 'fundraising', 'in_progress', 'completed', 'paused'];
const assetTypes: AssetType[] = ['cash', 'savings', 'investment', 'gold', 'silver', 'non_zakat'];
const documentCategories: DocumentCategory[] = ['donation_receipt', 'charity_certificate', 'project_report', 'zakat_document', 'beneficiary_report', 'other'];
const reminderTypes: ReminderType[] = ['zakat', 'hawl', 'ramadan', 'dhul_hijjah', 'arafah', 'sacrifice', 'sponsorship', 'project_milestone', 'general'];
const reminderPriorities: ReminderPriority[] = ['low', 'normal', 'high'];
const beneficiaryCategories: BeneficiaryCategory[] = ['orphan', 'family', 'student', 'medical', 'elderly', 'refugee', 'project_group', 'other'];
const beneficiaryStatuses: BeneficiaryStatus[] = ['active', 'paused', 'completed', 'needs_review'];
const contributorRoles: ContributorRole[] = ['owner', 'contributor', 'viewer'];
const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'partial', 'late', 'cancelled'];
const organizationTypes: OrganizationType[] = ['charity', 'zakat_house', 'humanitarian', 'waqf', 'mosque', 'education', 'relief', 'other'];
const verificationStatuses: VerificationStatus[] = ['verified', 'pending_review', 'unverified'];
const goldKarats = ['24', '22', '21', '18'] as const;
const nonZakatOptions = ['personalHome', 'personalCar', 'householdFurniture', 'personalTools', 'residentialLand', 'personalUseAssets', 'other'] as const;
const allowedDocumentTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const maxDocumentSize = 10 * 1024 * 1024;

const templates = [
  { category: 'sponsorship' as ProjectCategory, amount: 300, months: 12, ar: 'كفالة يتيم لمدة سنة', en: 'Orphan sponsorship for one year', fr: "Parrainage d'orphelin pendant un an", subAr: '25 د.ك × 12 شهر', subEn: 'KWD 25 x 12 months', subFr: '25 KWD x 12 mois' },
  { category: 'water_well' as ProjectCategory, amount: 1200, months: 6, ar: 'حفر بئر ماء', en: 'Water well', fr: "Puits d'eau", subAr: '800 - 2000 د.ك', subEn: 'KWD 800 - 2000', subFr: '800 - 2000 KWD' },
  { category: 'endowment' as ProjectCategory, amount: 250, months: 0, ar: 'وقف مصاحف', en: 'Quran endowment', fr: 'Waqf de Corans', subAr: 'مساهمة مستمرة', subEn: 'Ongoing contribution', subFr: 'Contribution continue' },
  { category: 'education' as ProjectCategory, amount: 3000, months: 6, ar: 'بناء فصل دراسي', en: 'Build a classroom', fr: 'Construire une salle de classe', subAr: '3000 د.ك على 6 شهور', subEn: 'KWD 3000 over 6 months', subFr: '3000 KWD sur 6 mois' },
  { category: 'sacrifice' as ProjectCategory, amount: 90, months: 12, ar: 'أضحية', en: 'Sacrifice', fr: 'Sacrifice', subAr: 'سنوي عند عيد الأضحى', subEn: 'Annual at Eid al-Adha', subFr: "Annuel à l'Aïd al-Adha" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addYear(date: string) {
  const d = date ? new Date(`${date}T00:00:00`) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const d = date ? new Date(`${date}T00:00:00`) : new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(date: string) {
  const start = new Date(`${today()}T00:00:00`).getTime();
  const end = new Date(`${date}T00:00:00`).getTime();
  return Math.round((end - start) / 86400000);
}

function toNum(value: string | number | null | undefined) {
  return Number(String(value ?? 0).replace(/[^\d.-]/g, '')) || 0;
}

function recordDate(row: any) {
  return row?.donation_date || row?.received_date || row?.generated_for_date || row?.date || row?.created_at || null;
}

function isYear(value: string | null | undefined, year: number) {
  if (!value) return false;
  return new Date(`${value.slice(0, 10)}T00:00:00`).getFullYear() === year;
}

function isCurrentMonth(value: string | null | undefined) {
  if (!value) return false;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function formatFileSize(size?: number | null) {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

function estimatedHijriDate(date?: string | null, lang: Lang = 'ar') {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : lang === 'fr' ? 'fr-FR-u-ca-islamic-umalqura' : 'en-US-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return '';
  }
}

export default function CharityProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const tr = TEXT[lang as Lang] ?? TEXT.ar;
  const zakatShortcut = {
    ar: {
      title: 'إدارة الزكاة',
      description: 'انتقل إلى صفحة الزكاة لحساب النصاب، تتبع الحول، وحفظ حسابات الزكاة.',
      button: 'فتح صفحة الزكاة',
    },
    en: {
      title: 'Manage Zakat',
      description: 'Open the Zakat page to calculate nisab, track hawl, and save zakat calculations.',
      button: 'Open Zakat Page',
    },
    fr: {
      title: 'Gérer la zakat',
      description: 'Ouvrez la page Zakat pour calculer le nisab, suivre le hawl et enregistrer les calculs de zakat.',
      button: 'Ouvrir la page Zakat',
    },
  }[lang as Lang] ?? {
    title: 'إدارة الزكاة',
    description: 'انتقل إلى صفحة الزكاة لحساب النصاب، تتبع الحول، وحفظ حسابات الزكاة.',
    button: 'فتح صفحة الزكاة',
  };
  const db = supabase as any;

  const [projects, setProjects] = useState<CharityProject[]>([]);
  const [assets, setAssets] = useState<ZakatAsset[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [donations, setDonations] = useState<ProjectDonation[]>([]);
  const [documents, setDocuments] = useState<CharityDocument[]>([]);
  const [reminders, setReminders] = useState<CharityReminder[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<CharityBeneficiary[]>([]);
  const [contributors, setContributors] = useState<CharityContributor[]>([]);
  const [zakatHistory, setZakatHistory] = useState<ZakatCalculation[]>([]);
  const [organizations, setOrganizations] = useState<CharityOrganization[]>([]);
  const [impactMetrics, setImpactMetrics] = useState<CharityImpactMetric[]>([]);
  const [incomeThisYear, setIncomeThisYear] = useState(0);
  const [incomeThisMonth, setIncomeThisMonth] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<CharityProjectsTab>('overview');
  const [projectOpen, setProjectOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<CharityReminder | null>(null);
  const [beneficiaryOpen, setBeneficiaryOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<CharityBeneficiary | null>(null);
  const [beneficiaryDetails, setBeneficiaryDetails] = useState<CharityBeneficiary | null>(null);
  const [contributorOpen, setContributorOpen] = useState(false);
  const [editingContributor, setEditingContributor] = useState<CharityContributor | null>(null);
  const [donationProject, setDonationProject] = useState<CharityProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [loadingMetals, setLoadingMetals] = useState(false);
  const [priceMode, setPriceMode] = useState<'automatic' | 'manual'>('manual');
  const [nisabMethod, setNisabMethod] = useState<'gold' | 'silver' | 'conservative'>('conservative');
  const [metalsPrice, setMetalsPrice] = useState<MetalsPriceResponse | null>(null);
  const [impactDonation, setImpactDonation] = useState('');
  const [selectedReportYear, setSelectedReportYear] = useState(String(new Date().getFullYear()));
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentFilter, setDocumentFilter] = useState<'all' | DocumentCategory>('all');
  const [documentProjectFilter, setDocumentProjectFilter] = useState('');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [beneficiaryStatusFilter, setBeneficiaryStatusFilter] = useState<'all' | BeneficiaryStatus>('all');
  const [beneficiaryCategoryFilter, setBeneficiaryCategoryFilter] = useState<'all' | BeneficiaryCategory>('all');
  const [contributorProjectFilter, setContributorProjectFilter] = useState('');
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [organizationTypeFilter, setOrganizationTypeFilter] = useState<'all' | OrganizationType>('all');
  const [organizationVerificationFilter, setOrganizationVerificationFilter] = useState<'all' | VerificationStatus>('all');
  const [manualOrganization, setManualOrganization] = useState(false);
  const [impactMetricForm, setImpactMetricForm] = useState({ project_id: '', metric_name: '', metric_value: '', metric_unit: '', notes: '' });
  const [zakat, setZakat] = useState({
    cash: '',
    investments: '',
    gold: '',
    silver: '',
    debts: '',
    goldPrice: '',
    silverPrice: '',
    goldGrams: '',
    goldKarat: '24',
    goldDirectValue: '',
    silverGrams: '',
    silverDirectValue: '',
    nonZakatAssets: [] as string[],
    nonZakatOther: '',
  });
  const [assetForm, setAssetForm] = useState({ asset_name: '', asset_type: 'cash' as AssetType, amount: '', ownership_date: today(), zakat_due_date: addYear(today()), is_zakatable: true, notes: '' });
  const [projectForm, setProjectForm] = useState({
    name: '',
    category: 'ongoing' as ProjectCategory,
    status: 'planning' as ProjectStatus,
    target_amount: '',
    collected_amount: '',
    currency: 'KWD',
    start_date: today(),
    end_date: '',
    organization_id: '',
    organization_name: '',
    notes: '',
  });
  const [donationAmount, setDonationAmount] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    category: 'donation_receipt' as DocumentCategory,
    project_id: '',
    donation_id: '',
    zakat_asset_id: '',
    commitment_id: '',
    notes: '',
  });
  const [reminderForm, setReminderForm] = useState({
    title: '',
    reminder_type: 'general' as ReminderType,
    due_date: today(),
    remind_before_days: '30',
    priority: 'normal' as ReminderPriority,
    related_project_id: '',
    related_zakat_asset_id: '',
    related_commitment_id: '',
    notes: '',
  });
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    project_id: '',
    reference_code: '',
    display_name: '',
    category: 'other' as BeneficiaryCategory,
    organization_name: '',
    country: '',
    city: '',
    monthly_support_amount: '',
    currency: 'KWD',
    sponsorship_start_date: '',
    sponsorship_end_date: '',
    next_renewal_date: '',
    status: 'active' as BeneficiaryStatus,
    notes: '',
  });
  const [contributorForm, setContributorForm] = useState({
    project_id: '',
    contributor_name: '',
    contributor_email: '',
    role: 'contributor' as ContributorRole,
    pledged_amount: '',
    paid_amount: '',
    currency: 'KWD',
    payment_status: 'pending' as PaymentStatus,
    due_date: '',
    notes: '',
  });

  const money = useCallback((amount: number, currency = 'KWD') => formatMoney(amount, currency, lang as Lang), [lang]);
  const dateLabel = useCallback((date?: string | null) => date ? new Date(`${date}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US') : '-', [lang]);

  const loadMetalsPrices = useCallback(async () => {
    setLoadingMetals(true);
    try {
      const response = await fetch('/api/charity-projects/metals-prices');
      const data = await response.json() as MetalsPriceResponse;
      setMetalsPrice(data);
      if (data.success && data.source === 'api') {
        setPriceMode('automatic');
        setZakat(prev => ({
          ...prev,
          goldPrice: String(data.gold.pricePerGram24k || data.gold.pricePerGram || ''),
          silverPrice: String(data.silver.pricePerGram || ''),
        }));
      } else {
        setPriceMode('manual');
      }
    } catch {
      setPriceMode('manual');
      setMetalsPrice({
        success: false,
        source: 'manual',
        message: tr.apiNotConfigured,
        currency: 'KWD',
        gold: { pricePerGram: 0, unit: 'gram' },
        silver: { pricePerGram: 0, unit: 'gram' },
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setLoadingMetals(false);
    }
  }, [tr.apiNotConfigured]);

  const syncGeneratedReminders = useCallback(async (
    currentReminders: CharityReminder[],
    currentProjects: CharityProject[],
    currentAssets: ZakatAsset[],
    currentCommitments: Commitment[],
  ) => {
    if (!user) return;
    const exists = new Set(currentReminders.map(reminder => [
      reminder.reminder_type,
      reminder.related_project_id ?? '',
      reminder.related_zakat_asset_id ?? '',
      reminder.related_commitment_id ?? '',
      reminder.due_date,
    ].join('|')));

    const generated: any[] = [];
    currentAssets.forEach(asset => {
      if (!asset.zakat_due_date || !asset.is_zakatable) return;
      const key = ['zakat', '', asset.id, '', asset.zakat_due_date].join('|');
      if (!exists.has(key)) generated.push({
        user_id: user.id,
        title: `${tr.zakat} - ${asset.asset_name}`,
        reminder_type: 'zakat',
        related_zakat_asset_id: asset.id,
        due_date: asset.zakat_due_date,
        hijri_date: estimatedHijriDate(asset.zakat_due_date, lang as Lang) || null,
        remind_before_days: 30,
        priority: 'high',
        notes: tr.hijriEstimated,
      });
    });
    currentCommitments.forEach(commitment => {
      if (!commitment.next_due_date || commitment.status !== 'active') return;
      const type = commitment.category === 'sponsorship' ? 'sponsorship' : 'general';
      const key = [type, '', '', commitment.id, commitment.next_due_date].join('|');
      if (!exists.has(key)) generated.push({
        user_id: user.id,
        title: `${tr.commitments}: ${commitment.name}`,
        reminder_type: type,
        related_commitment_id: commitment.id,
        due_date: commitment.next_due_date,
        hijri_date: estimatedHijriDate(commitment.next_due_date, lang as Lang) || null,
        remind_before_days: 7,
        priority: type === 'sponsorship' ? 'high' : 'normal',
      });
    });
    currentProjects.forEach(project => {
      if (!project.end_date || ['completed', 'paused'].includes(project.status)) return;
      const key = ['project_milestone', project.id, '', '', project.end_date].join('|');
      if (!exists.has(key)) generated.push({
        user_id: user.id,
        title: `${tr.endDate}: ${project.name}`,
        reminder_type: 'project_milestone',
        related_project_id: project.id,
        due_date: project.end_date,
        hijri_date: estimatedHijriDate(project.end_date, lang as Lang) || null,
        remind_before_days: 14,
        priority: 'normal',
      });
    });

    if (generated.length > 0) {
      await db.from('charity_reminders').insert(generated);
    }
  }, [db, lang, tr.commitments, tr.endDate, tr.hijriEstimated, tr.zakat, user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [projectRes, assetRes, commitmentRes, donationRes, documentRes, reminderRes, beneficiaryRes, contributorRes, zakatHistoryRes, organizationRes, impactMetricRes, legacyRes, incomeRes, expenseRes] = await Promise.all([
        db.from('charity_projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('zakat_assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('charity_commitments').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        db.from('charity_project_donations').select('*').eq('user_id', user.id).order('donation_date', { ascending: false }),
        db.from('charity_documents').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false }),
        db.from('charity_reminders').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
        db.from('charity_beneficiaries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('charity_project_contributors').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('zakat_calculations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
        db.from('charity_organizations').select('*').eq('is_active', true).order('name_ar', { ascending: true }),
        db.from('charity_project_impact_metrics').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('expense_items').select('id,name,amount,created_at').eq('user_id', user.id).like('name', 'خيرية:%'),
        db.from('monthly_income_sources').select('*').eq('user_id', user.id),
        db.from('expense_items').select('*').eq('user_id', user.id),
      ]);
      const loadedProjects = !projectRes.error ? (projectRes.data ?? []) as CharityProject[] : [];
      const loadedAssets = !assetRes.error ? (assetRes.data ?? []) as ZakatAsset[] : [];
      const loadedCommitments = !commitmentRes.error ? (commitmentRes.data ?? []) as Commitment[] : [];
      const loadedReminders = !reminderRes.error ? (reminderRes.data ?? []) as CharityReminder[] : [];
      if (!projectRes.error) setProjects(loadedProjects);
      if (!assetRes.error) setAssets(loadedAssets);
      if (!commitmentRes.error) setCommitments(loadedCommitments);
      const legacyDonations = legacyRes.error ? [] : (legacyRes.data ?? []).map((row: any): ProjectDonation => ({
        id: row.id,
        project_id: null,
        amount: toNum(row.amount),
        currency: 'KWD',
        donation_date: row.created_at,
        donation_type: 'charity',
        notes: row.name || null,
        created_at: row.created_at,
      }));
      if (!donationRes.error) setDonations([...(donationRes.data ?? []) as ProjectDonation[], ...legacyDonations]);
      if (!documentRes.error) setDocuments((documentRes.data ?? []) as CharityDocument[]);
      if (!beneficiaryRes.error) setBeneficiaries((beneficiaryRes.data ?? []) as CharityBeneficiary[]);
      if (!contributorRes.error) setContributors((contributorRes.data ?? []) as CharityContributor[]);
      if (!zakatHistoryRes.error) setZakatHistory((zakatHistoryRes.data ?? []) as ZakatCalculation[]);
      if (!organizationRes.error) setOrganizations((organizationRes.data ?? []) as CharityOrganization[]);
      if (!impactMetricRes.error) setImpactMetrics((impactMetricRes.data ?? []) as CharityImpactMetric[]);
      if (!reminderRes.error) {
        setReminders(loadedReminders);
        await syncGeneratedReminders(loadedReminders, loadedProjects, loadedAssets, loadedCommitments);
        const refreshed = await db.from('charity_reminders').select('*').eq('user_id', user.id).order('due_date', { ascending: true });
        if (!refreshed.error) setReminders((refreshed.data ?? []) as CharityReminder[]);
      }
      if (!incomeRes.error) {
        const rows = incomeRes.data ?? [];
        const currentYear = new Date().getFullYear();
        setIncomeTotal(rows.reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
        setIncomeThisYear(rows.filter((row: any) => isYear(recordDate(row), currentYear)).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
        setIncomeThisMonth(rows.filter((row: any) => isCurrentMonth(recordDate(row))).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
      }
      if (!expenseRes.error) setExpenseTotal(personalExpenseRows(expenseRes.data ?? []).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
    } catch {
      setMessage(tr.error);
    }
  }, [db, syncGeneratedReminders, tr.error, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const savedGold = window.localStorage.getItem('sfm_charity_gold_price_kwd') ?? '';
    const savedSilver = window.localStorage.getItem('sfm_charity_silver_price_kwd') ?? '';
    const savedMethod = window.localStorage.getItem('sfm_charity_nisab_method');
    if (savedGold || savedSilver) {
      setZakat(prev => ({ ...prev, goldPrice: savedGold, silverPrice: savedSilver }));
    }
    if (savedMethod && ['gold', 'silver', 'conservative'].includes(savedMethod)) setNisabMethod(savedMethod as 'gold' | 'silver' | 'conservative');
    loadMetalsPrices();
  }, [loadMetalsPrices]);

  useEffect(() => {
    window.localStorage.setItem('sfm_charity_gold_price_kwd', zakat.goldPrice);
    window.localStorage.setItem('sfm_charity_silver_price_kwd', zakat.silverPrice);
  }, [zakat.goldPrice, zakat.silverPrice]);

  useEffect(() => {
    window.localStorage.setItem('sfm_charity_nisab_method', nisabMethod);
  }, [nisabMethod]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProjectOpen(false);
        setDocumentOpen(false);
        setReminderOpen(false);
        setBeneficiaryOpen(false);
        setBeneficiaryDetails(null);
        setContributorOpen(false);
        setDonationProject(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goldPricesByKarat = {
    '24': toNum(zakat.goldPrice),
    '22': (metalsPrice?.gold.pricePerGram22k && metalsPrice.gold.pricePerGram22k > 0) ? metalsPrice.gold.pricePerGram22k : toNum(zakat.goldPrice) * (22 / 24),
    '21': (metalsPrice?.gold.pricePerGram21k && metalsPrice.gold.pricePerGram21k > 0) ? metalsPrice.gold.pricePerGram21k : toNum(zakat.goldPrice) * (21 / 24),
    '18': (metalsPrice?.gold.pricePerGram18k && metalsPrice.gold.pricePerGram18k > 0) ? metalsPrice.gold.pricePerGram18k : toNum(zakat.goldPrice) * (18 / 24),
  };
  const selectedGoldGramPrice = goldPricesByKarat[zakat.goldKarat as keyof typeof goldPricesByKarat] || 0;
  const zakatableGoldValue = toNum(zakat.goldDirectValue) > 0 ? toNum(zakat.goldDirectValue) : toNum(zakat.goldGrams) * selectedGoldGramPrice;
  const zakatableSilverValue = toNum(zakat.silverDirectValue) > 0 ? toNum(zakat.silverDirectValue) : toNum(zakat.silverGrams) * toNum(zakat.silverPrice);
  const zakatableAmount = Math.max(0, toNum(zakat.cash) + toNum(zakat.investments) + zakatableGoldValue + zakatableSilverValue - toNum(zakat.debts));
  const goldNisabValue = toNum(zakat.goldPrice) * 85;
  const silverNisabValue = toNum(zakat.silverPrice) * 595;
  const availableNisabValues = [goldNisabValue, silverNisabValue].filter(value => value > 0);
  const selectedNisabValue = nisabMethod === 'gold'
    ? goldNisabValue
    : nisabMethod === 'silver'
      ? silverNisabValue
      : availableNisabValues.length > 0 ? Math.min(...availableNisabValues) : 0;
  const hasCriticalPriceData = goldNisabValue > 0 && silverNisabValue > 0;
  const reachedNisab = selectedNisabValue > 0 && zakatableAmount >= selectedNisabValue;
  const zakatAmount = reachedNisab ? zakatableAmount * 0.025 : 0;
  const nisabDifference = selectedNisabValue > 0 ? zakatableAmount - selectedNisabValue : 0;
  const closeToNisab = selectedNisabValue > 0 && !reachedNisab && zakatableAmount >= selectedNisabValue * 0.85;
  const priceSourceLabel = metalsPrice?.source === 'api'
    ? tr.automaticPrice
    : metalsPrice?.source === 'fallback'
      ? tr.failedStatus
      : tr.manualPrice;
  const tValue = (key: string, fallback = key) => (tr as Record<string, string>)[key] ?? fallback;
  const reminderTypeLabel = (type: ReminderType) => type === 'general' ? tr.other : tValue(type, tr.other);
  const assetTypeLabel = (type: AssetType) => {
    if (type === 'savings') return tr.cashSavings;
    if (type === 'investment') return tr.investments;
    if (type === 'non_zakat') return tr.nonZakat;
    return tValue(type, tr.other);
  };
  const organizationName = (organization?: CharityOrganization | null) => {
    if (!organization) return '';
    if (lang === 'ar') return organization.name_ar;
    if (lang === 'fr') return organization.name_fr || organization.name_en || organization.name_ar;
    return organization.name_en || organization.name_ar;
  };
  const organizationById = useMemo(() => organizations.reduce<Record<string, CharityOrganization>>((acc, organization) => {
    acc[organization.id] = organization;
    return acc;
  }, {}), [organizations]);
  const organizationLabel = (id?: string | null, fallback?: string | null) => organizationName(id ? organizationById[id] : null) || fallback || '-';
  const verificationLabel = (status?: string | null) => {
    if (status === 'verified') return tr.verified;
    if (status === 'pending_review') return tr.pendingReview;
    if (status === 'rejected') return tr.rejected;
    return tr.unverified;
  };
  const selectedOrganization = projectForm.organization_id ? organizationById[projectForm.organization_id] : null;
  const nisabMethodLabel = (method: string) => method === 'gold'
    ? tr.goldBased
    : method === 'silver'
      ? tr.silverBased
      : method === 'conservative'
        ? tr.conservative
        : method;
  const totalDonations = projects.reduce((sum, project) => sum + toNum(project.collected_amount), 0);
  const activeProjects = projects.filter(project => !['completed', 'paused'].includes(project.status)).length;
  const currentYear = new Date().getFullYear();
  const completedProjectsCount = projects.filter(project => project.status === 'completed').length;
  const donationsThisYear = donations.filter(donation => isYear(donation.donation_date || donation.created_at, currentYear));
  const donationsThisMonth = donations.filter(donation => isCurrentMonth(donation.donation_date || donation.created_at));
  const totalDonatedThisYear = donationsThisYear.reduce((sum, donation) => sum + toNum(donation.amount), 0);
  const totalDonatedThisMonth = donationsThisMonth.reduce((sum, donation) => sum + toNum(donation.amount), 0);
  const monthlySponsorshipsTotal = beneficiaries.filter(beneficiary => beneficiary.status === 'active').reduce((sum, beneficiary) => sum + toNum(beneficiary.monthly_support_amount), 0);
  const latestEstimatedZakat = zakatHistory[0]?.zakat_due ?? zakatAmount;
  const givingIncomeRatioYear = incomeThisYear > 0 ? (totalDonatedThisYear / incomeThisYear) * 100 : null;
  const givingIncomeRatioMonth = incomeThisMonth > 0 ? (totalDonatedThisMonth / incomeThisMonth) * 100 : null;
  const hasImpactData = projects.length > 0 || donations.length > 0 || beneficiaries.length > 0 || commitments.length > 0 || zakatHistory.length > 0 || impactMetrics.length > 0;
  const monthLabels = useMemo(() => Array.from({ length: 12 }, (_, index) => new Date(currentYear, index, 1).toLocaleDateString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' })), [currentYear, lang]);
  const impactByMonth = useMemo(() => monthLabels.map((label, index) => {
    const donationAmount = donations.filter(donation => {
      const value = donation.donation_date || donation.created_at;
      if (!isYear(value, currentYear)) return false;
      return new Date(`${value!.slice(0, 10)}T00:00:00`).getMonth() === index;
    }).reduce((sum, donation) => sum + toNum(donation.amount), 0);
    const sponsorshipAmount = beneficiaries.filter(beneficiary => beneficiary.status === 'active').reduce((sum, beneficiary) => sum + toNum(beneficiary.monthly_support_amount), 0);
    return { label, donationAmount, sponsorshipAmount };
  }), [beneficiaries, currentYear, donations, monthLabels]);
  const maxImpactMonth = Math.max(1, ...impactByMonth.map(item => item.donationAmount + item.sponsorshipAmount));
  const impactByCategory = useMemo(() => categories.map(category => {
    const projectCollected = projects.filter(project => project.category === category).reduce((sum, project) => sum + toNum(project.collected_amount), 0);
    const donationAmount = donations.filter(donation => donation.donation_type === category).reduce((sum, donation) => sum + toNum(donation.amount), 0);
    return { category, amount: projectCollected + donationAmount };
  }).filter(item => item.amount > 0), [donations, projects]);
  const maxImpactCategory = Math.max(1, ...impactByCategory.map(item => item.amount));
  const beneficiaryByCategory = beneficiaryCategories.map(category => ({
    category,
    count: beneficiaries.filter(beneficiary => beneficiary.category === category).length,
  })).filter(item => item.count > 0);
  const impactMetricsByProject = useMemo(() => impactMetrics.reduce<Record<string, CharityImpactMetric[]>>((acc, metric) => {
    acc[metric.project_id] = [...(acc[metric.project_id] || []), metric];
    return acc;
  }, {}), [impactMetrics]);
  const expectedCommitments = commitments.reduce((sum, item) => {
    const amount = toNum(item.amount);
    if (item.frequency === 'monthly') return sum + amount * 12;
    if (item.frequency === 'annual') return sum + amount;
    return sum + amount;
  }, 0) + projects.filter(project => project.status !== 'completed').reduce((sum, project) => sum + Math.max(0, toNum(project.target_amount) - toNum(project.collected_amount)), 0) + toNum(latestEstimatedZakat);
  const nextDue = assets.map(asset => asset.zakat_due_date).filter(Boolean).sort()[0];
  const reportYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    const add = (value?: string | null) => {
      if (!value) return;
      const year = new Date(`${value.slice(0, 10)}T00:00:00`).getFullYear();
      if (Number.isFinite(year)) years.add(year);
    };
    projects.forEach(project => {
      add(project.start_date);
      add(project.end_date);
    });
    assets.forEach(asset => add(asset.zakat_due_date || asset.ownership_date));
    commitments.forEach(commitment => add(commitment.next_due_date));
    donations.forEach(donation => add(donation.donation_date || donation.created_at));
    return Array.from(years).sort((a, b) => b - a);
  }, [assets, commitments, donations, projects]);
  const impactValue = toNum(impactDonation);
  const impactPct = incomeTotal > 0 && impactValue > 0 ? (impactValue / incomeTotal) * 100 : null;
  const remainingNet = incomeTotal - expenseTotal - impactValue;
  const hasReportData = projects.length > 0 || assets.length > 0 || commitments.length > 0 || donations.length > 0;
  const filteredDocuments = documents.filter(document => {
    const query = documentSearch.trim().toLowerCase();
    const matchesSearch = !query || [document.title, document.file_name, document.notes ?? ''].some(value => value.toLowerCase().includes(query));
    const matchesFilter = documentFilter === 'all' || document.category === documentFilter;
    const matchesProject = !documentProjectFilter || document.project_id === documentProjectFilter;
    return matchesSearch && matchesFilter && matchesProject;
  });
  const projectDocumentCounts = useMemo(() => documents.reduce<Record<string, number>>((acc, document) => {
    if (document.project_id) acc[document.project_id] = (acc[document.project_id] || 0) + 1;
    return acc;
  }, {}), [documents]);
  const projectBeneficiaryCounts = useMemo(() => beneficiaries.reduce<Record<string, number>>((acc, beneficiary) => {
    if (beneficiary.project_id) acc[beneficiary.project_id] = (acc[beneficiary.project_id] || 0) + 1;
    return acc;
  }, {}), [beneficiaries]);
  const filteredBeneficiaries = beneficiaries.filter(beneficiary => {
    const query = beneficiarySearch.trim().toLowerCase();
    const matchesSearch = !query || [beneficiary.display_name, beneficiary.reference_code ?? '', beneficiary.organization_name ?? '', beneficiary.country ?? ''].some(value => value.toLowerCase().includes(query));
    const matchesStatus = beneficiaryStatusFilter === 'all' || beneficiary.status === beneficiaryStatusFilter;
    const matchesCategory = beneficiaryCategoryFilter === 'all' || beneficiary.category === beneficiaryCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const filteredOrganizations = organizations.filter(organization => {
    const query = organizationSearch.trim().toLowerCase();
    const localizedName = organizationName(organization).toLowerCase();
    const matchesSearch = !query || [
      localizedName,
      organization.name_ar,
      organization.name_en ?? '',
      organization.name_fr ?? '',
      organization.license_number ?? '',
      organization.country ?? '',
      organization.city ?? '',
    ].some(value => value.toLowerCase().includes(query));
    const matchesType = organizationTypeFilter === 'all' || organization.organization_type === organizationTypeFilter;
    const matchesVerification = organizationVerificationFilter === 'all' || organization.verification_status === organizationVerificationFilter;
    return matchesSearch && matchesType && matchesVerification;
  });
  const organizationProjectCounts = useMemo(() => projects.reduce<Record<string, number>>((acc, project) => {
    if (project.organization_id) acc[project.organization_id] = (acc[project.organization_id] || 0) + 1;
    return acc;
  }, {}), [projects]);
  const activeBeneficiaries = beneficiaries.filter(beneficiary => beneficiary.status === 'active');
  const monthlySupportTotal = activeBeneficiaries.reduce((sum, beneficiary) => sum + toNum(beneficiary.monthly_support_amount), 0);
  const upcomingRenewals = beneficiaries.filter(beneficiary => beneficiary.next_renewal_date && daysUntil(beneficiary.next_renewal_date) <= 45 && daysUntil(beneficiary.next_renewal_date) >= 0);
  const projectContributorCounts = useMemo(() => contributors.reduce<Record<string, number>>((acc, contributor) => {
    acc[contributor.project_id] = (acc[contributor.project_id] || 0) + 1;
    return acc;
  }, {}), [contributors]);
  const filteredContributors = contributorProjectFilter ? contributors.filter(contributor => contributor.project_id === contributorProjectFilter) : contributors;
  const totalPledged = filteredContributors.reduce((sum, contributor) => sum + toNum(contributor.pledged_amount), 0);
  const totalPaid = filteredContributors.reduce((sum, contributor) => sum + toNum(contributor.paid_amount), 0);
  const lateContributors = filteredContributors.filter(contributor => contributor.due_date && daysUntil(contributor.due_date) < 0 && ['pending', 'partial'].includes(contributor.payment_status));
  const topContributor = filteredContributors.slice().sort((a, b) => toNum(b.paid_amount) - toNum(a.paid_amount))[0];
  const activeReminders = reminders
    .filter(reminder => reminder.status === 'active')
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const urgentReminders = activeReminders.filter(reminder => daysUntil(reminder.due_date) <= reminder.remind_before_days).slice(0, 3);
  const seasonalCards = [
    { title: tr.ramadanPlanning },
    { title: tr.lastTenNights },
    { title: tr.arafahDay },
    { title: tr.eidAdha },
    { title: tr.zakatAnnualReview },
  ];

  const resetProjectForm = () => {
    setProjectForm({ name: '', category: 'ongoing', status: 'planning', target_amount: '', collected_amount: '', currency: 'KWD', start_date: today(), end_date: '', organization_id: '', organization_name: '', notes: '' });
    setManualOrganization(false);
  };

  const resetReminderForm = () => {
    setEditingReminder(null);
    setReminderForm({ title: '', reminder_type: 'general', due_date: today(), remind_before_days: '30', priority: 'normal', related_project_id: '', related_zakat_asset_id: '', related_commitment_id: '', notes: '' });
  };

  const resetBeneficiaryForm = () => {
    setEditingBeneficiary(null);
    setBeneficiaryForm({ project_id: '', reference_code: '', display_name: '', category: 'other', organization_name: '', country: '', city: '', monthly_support_amount: '', currency: 'KWD', sponsorship_start_date: '', sponsorship_end_date: '', next_renewal_date: '', status: 'active', notes: '' });
  };

  const openBeneficiaryEditor = (beneficiary: CharityBeneficiary) => {
    setEditingBeneficiary(beneficiary);
    setBeneficiaryForm({
      project_id: beneficiary.project_id ?? '',
      reference_code: beneficiary.reference_code ?? '',
      display_name: beneficiary.display_name,
      category: beneficiary.category,
      organization_name: beneficiary.organization_name ?? '',
      country: beneficiary.country ?? '',
      city: beneficiary.city ?? '',
      monthly_support_amount: String(beneficiary.monthly_support_amount ?? ''),
      currency: beneficiary.currency || 'KWD',
      sponsorship_start_date: beneficiary.sponsorship_start_date ?? '',
      sponsorship_end_date: beneficiary.sponsorship_end_date ?? '',
      next_renewal_date: beneficiary.next_renewal_date ?? '',
      status: beneficiary.status,
      notes: beneficiary.notes ?? '',
    });
    setBeneficiaryOpen(true);
  };

  const resetContributorForm = (projectId = '') => {
    setEditingContributor(null);
    setContributorForm({ project_id: projectId, contributor_name: '', contributor_email: '', role: 'contributor', pledged_amount: '', paid_amount: '', currency: 'KWD', payment_status: 'pending', due_date: '', notes: '' });
  };

  const openContributorEditor = (contributor: CharityContributor) => {
    setEditingContributor(contributor);
    setContributorForm({
      project_id: contributor.project_id,
      contributor_name: contributor.contributor_name,
      contributor_email: contributor.contributor_email ?? '',
      role: contributor.role,
      pledged_amount: String(contributor.pledged_amount ?? ''),
      paid_amount: String(contributor.paid_amount ?? ''),
      currency: contributor.currency || 'KWD',
      payment_status: contributor.payment_status,
      due_date: contributor.due_date ?? '',
      notes: contributor.notes ?? '',
    });
    setContributorOpen(true);
  };

  const openReminderEditor = (reminder: CharityReminder) => {
    setEditingReminder(reminder);
    setReminderForm({
      title: reminder.title,
      reminder_type: reminder.reminder_type,
      due_date: reminder.due_date,
      remind_before_days: String(reminder.remind_before_days),
      priority: reminder.priority,
      related_project_id: reminder.related_project_id ?? '',
      related_zakat_asset_id: reminder.related_zakat_asset_id ?? '',
      related_commitment_id: reminder.related_commitment_id ?? '',
      notes: reminder.notes ?? '',
    });
    setReminderOpen(true);
  };

  const reminderTimingLabel = (reminder: CharityReminder) => {
    const days = daysUntil(reminder.due_date);
    if (days === 0) return tr.dueToday;
    if (days < 0) return tr.overdue.replace('{days}', String(Math.abs(days)));
    return tr.daysRemaining.replace('{days}', String(days));
  };

  const openTemplate = (template: typeof templates[number]) => {
    const end = template.months > 0 ? new Date() : null;
    if (end) end.setMonth(end.getMonth() + template.months);
    setProjectForm({
      name: template[lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en'],
      category: template.category,
      status: 'planning',
      target_amount: String(template.amount),
      collected_amount: '',
      currency: 'KWD',
      start_date: today(),
      end_date: end ? end.toISOString().slice(0, 10) : '',
      organization_id: '',
      organization_name: '',
      notes: '',
    });
    setProjectOpen(true);
  };

  const saveProject = async () => {
    if (!user || !projectForm.name.trim()) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      ...projectForm,
      target_amount: toNum(projectForm.target_amount),
      collected_amount: toNum(projectForm.collected_amount),
      end_date: projectForm.end_date || null,
      organization_id: projectForm.organization_id || null,
      organization_name: manualOrganization ? projectForm.organization_name || null : organizationLabel(projectForm.organization_id, projectForm.organization_name),
      notes: projectForm.notes || null,
    };
    const { error } = await db.from('charity_projects').insert(payload);
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.saved);
    setProjectOpen(false);
    resetProjectForm();
    loadData();
  };

  const saveAsset = async () => {
    if (!user || !assetForm.asset_name.trim()) return;
    const { error } = await db.from('zakat_assets').insert({
      user_id: user.id,
      ...assetForm,
      amount: toNum(assetForm.amount),
      zakat_due_date: assetForm.zakat_due_date || addYear(assetForm.ownership_date),
    });
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.saved);
      setAssetForm({ asset_name: '', asset_type: 'cash', amount: '', ownership_date: today(), zakat_due_date: addYear(today()), is_zakatable: true, notes: '' });
      loadData();
    }
  };

  const toggleNonZakatAsset = (asset: string) => {
    setZakat(prev => ({
      ...prev,
      nonZakatAssets: prev.nonZakatAssets.includes(asset)
        ? prev.nonZakatAssets.filter(item => item !== asset)
        : [...prev.nonZakatAssets, asset],
    }));
  };

  const saveZakatCalculation = async () => {
    if (!user) return;
    setSaving(true);
    const notes = [
      zakat.nonZakatAssets.length > 0 ? `${tr.nonZakatableAssets}: ${zakat.nonZakatAssets.map(asset => tr[asset as keyof typeof tr] ?? asset).join(', ')}` : '',
      zakat.nonZakatOther ? `${tr.other}: ${zakat.nonZakatOther}` : '',
    ].filter(Boolean).join(' | ');
    const { error } = await db.from('zakat_calculations').insert({
      user_id: user.id,
      currency: 'KWD',
      cash_amount: toNum(zakat.cash),
      investment_amount: toNum(zakat.investments),
      gold_value: zakatableGoldValue,
      silver_value: zakatableSilverValue,
      deductible_debts: toNum(zakat.debts),
      net_zakat_base: zakatableAmount,
      nisab_method: nisabMethod,
      gold_nisab_value: goldNisabValue,
      silver_nisab_value: silverNisabValue,
      selected_nisab_value: selectedNisabValue,
      zakat_due: zakatAmount,
      price_source: metalsPrice?.source ?? 'manual',
      notes: notes || null,
    });
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.calculationSaved);
    loadData();
  };

  const deleteZakatCalculation = async (calculation: ZakatCalculation) => {
    if (!user) return;
    const { error } = await db.from('zakat_calculations').delete().eq('id', calculation.id).eq('user_id', user.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.calculationDeleted);
      loadData();
    }
  };

  const saveImpactMetric = async () => {
    if (!user || !impactMetricForm.project_id || !impactMetricForm.metric_name.trim()) return;
    const { error } = await db.from('charity_project_impact_metrics').insert({
      user_id: user.id,
      project_id: impactMetricForm.project_id,
      metric_name: impactMetricForm.metric_name.trim(),
      metric_value: Math.max(0, toNum(impactMetricForm.metric_value)),
      metric_unit: impactMetricForm.metric_unit || null,
      notes: impactMetricForm.notes || null,
    });
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.metricSaved);
    setImpactMetricForm({ project_id: '', metric_name: '', metric_value: '', metric_unit: '', notes: '' });
    loadData();
  };

  const saveDonation = async () => {
    if (!user || !donationProject || toNum(donationAmount) <= 0) return;
    setSaving(true);
    const amount = toNum(donationAmount);
    const { error } = await db.from('charity_project_donations').insert({
      user_id: user.id,
      project_id: donationProject.id,
      organization_id: donationProject.organization_id || null,
      amount,
      currency: donationProject.currency,
      donation_date: today(),
      donation_type: donationProject.category,
    });
    if (!error) {
      await db.from('charity_projects')
        .update({ collected_amount: toNum(donationProject.collected_amount) + amount })
        .eq('id', donationProject.id)
        .eq('user_id', user.id);
    }
    setSaving(false);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.saved);
      setDonationProject(null);
      setDonationAmount('');
      loadData();
    }
  };

  const archiveProject = async (project: CharityProject) => {
    if (!user) return;
    const { error } = await db.from('charity_projects').update({ status: 'paused' }).eq('id', project.id).eq('user_id', user.id);
    if (error) setMessage(tr.error);
    else loadData();
  };

  const resetDocumentForm = () => {
    setDocumentForm({ title: '', category: 'donation_receipt', project_id: '', donation_id: '', zakat_asset_id: '', commitment_id: '', notes: '' });
    setDocumentFile(null);
  };

  const uploadDocument = async () => {
    if (!user) return;
    if (!documentForm.title.trim() || !documentFile) {
      setMessage(tr.uploadFailed);
      return;
    }
    if (!allowedDocumentTypes.includes(documentFile.type)) {
      setMessage(tr.unsupportedFileType);
      return;
    }
    if (documentFile.size > maxDocumentSize) {
      setMessage(tr.fileTooLarge);
      return;
    }

    setUploadingDocument(true);
    const documentId = crypto.randomUUID();
    const year = new Date().getFullYear();
    const filePath = `${user.id}/charity-documents/${year}/${documentId}-${cleanFileName(documentFile.name)}`;

    try {
      const upload = await supabase.storage.from('charity-documents').upload(filePath, documentFile, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const { error } = await db.from('charity_documents').insert({
        id: documentId,
        user_id: user.id,
        title: documentForm.title.trim(),
        category: documentForm.category,
        project_id: documentForm.project_id || null,
        donation_id: documentForm.donation_id || null,
        zakat_asset_id: documentForm.zakat_asset_id || null,
        commitment_id: documentForm.commitment_id || null,
        file_url: filePath,
        file_path: filePath,
        file_name: documentFile.name,
        file_type: documentFile.type,
        file_size: documentFile.size,
        notes: documentForm.notes || null,
      });
      if (error) throw error;
      setMessage(tr.documentUploaded);
      setDocumentOpen(false);
      resetDocumentForm();
      loadData();
    } catch {
      setMessage(tr.uploadFailed);
    } finally {
      setUploadingDocument(false);
    }
  };

  const openDocument = async (document: CharityDocument, download = false) => {
    const { data, error } = await supabase.storage.from('charity-documents').createSignedUrl(document.file_path, 600);
    if (error || !data?.signedUrl) {
      setMessage(tr.openDocumentFailed);
      return;
    }
    if (download) {
      const link = window.document.createElement('a');
      link.href = data.signedUrl;
      link.download = document.file_name;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const deleteDocument = async (document: CharityDocument) => {
    if (!window.confirm(tr.confirmDeleteDocument)) return;
    const { error } = await db.from('charity_documents').delete().eq('id', document.id).eq('user_id', user?.id);
    if (error) {
      setMessage(tr.error);
      return;
    }
    await supabase.storage.from('charity-documents').remove([document.file_path]);
    setMessage(tr.documentDeleted);
    loadData();
  };

  const saveReminder = async () => {
    if (!user || !reminderForm.title.trim() || !reminderForm.due_date) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      title: reminderForm.title.trim(),
      reminder_type: reminderForm.reminder_type,
      related_project_id: reminderForm.related_project_id || null,
      related_zakat_asset_id: reminderForm.related_zakat_asset_id || null,
      related_commitment_id: reminderForm.related_commitment_id || null,
      due_date: reminderForm.due_date,
      hijri_date: estimatedHijriDate(reminderForm.due_date, lang as Lang) || null,
      remind_before_days: Math.max(0, Math.round(toNum(reminderForm.remind_before_days))),
      status: 'active',
      priority: reminderForm.priority,
      notes: reminderForm.notes || null,
    };
    const { error } = editingReminder
      ? await db.from('charity_reminders').update(payload).eq('id', editingReminder.id).eq('user_id', user.id)
      : await db.from('charity_reminders').insert(payload);
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(editingReminder ? tr.reminderUpdated : tr.reminderSaved);
    setReminderOpen(false);
    resetReminderForm();
    loadData();
  };

  const updateReminderStatus = async (reminder: CharityReminder, status: ReminderStatus) => {
    const { error } = await db.from('charity_reminders').update({ status }).eq('id', reminder.id).eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.reminderUpdated);
      loadData();
    }
  };

  const deleteReminder = async (reminder: CharityReminder) => {
    if (!window.confirm(tr.confirmDeleteReminder)) return;
    const { error } = await db.from('charity_reminders').delete().eq('id', reminder.id).eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.reminderDeleted);
      loadData();
    }
  };

  const saveBeneficiary = async () => {
    if (!user || !beneficiaryForm.display_name.trim()) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      project_id: beneficiaryForm.project_id || null,
      reference_code: beneficiaryForm.reference_code || null,
      display_name: beneficiaryForm.display_name.trim(),
      category: beneficiaryForm.category,
      organization_name: beneficiaryForm.organization_name || null,
      country: beneficiaryForm.country || null,
      city: beneficiaryForm.city || null,
      monthly_support_amount: Math.max(0, toNum(beneficiaryForm.monthly_support_amount)),
      currency: beneficiaryForm.currency || 'KWD',
      sponsorship_start_date: beneficiaryForm.sponsorship_start_date || null,
      sponsorship_end_date: beneficiaryForm.sponsorship_end_date || null,
      next_renewal_date: beneficiaryForm.next_renewal_date || null,
      status: beneficiaryForm.status,
      notes: beneficiaryForm.notes || null,
    };
    const { data, error } = editingBeneficiary
      ? await db.from('charity_beneficiaries').update(payload).eq('id', editingBeneficiary.id).eq('user_id', user.id).select().single()
      : await db.from('charity_beneficiaries').insert(payload).select().single();
    if (!error && beneficiaryForm.next_renewal_date && data?.id) {
      await db.from('charity_reminders').insert({
        user_id: user.id,
        title: `${tr.sponsorship}: ${beneficiaryForm.display_name.trim()}`,
        reminder_type: 'sponsorship',
        due_date: beneficiaryForm.next_renewal_date,
        hijri_date: estimatedHijriDate(beneficiaryForm.next_renewal_date, lang as Lang) || null,
        remind_before_days: 30,
        status: 'active',
        priority: 'normal',
        notes: `beneficiary:${data.id}`,
      });
    }
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(tr.beneficiarySaved);
    setBeneficiaryOpen(false);
    resetBeneficiaryForm();
    loadData();
  };

  const deleteBeneficiary = async (beneficiary: CharityBeneficiary) => {
    if (!window.confirm(tr.confirmDeleteBeneficiary)) return;
    const { error } = await db.from('charity_beneficiaries').delete().eq('id', beneficiary.id).eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.beneficiaryDeleted);
      loadData();
    }
  };

  const saveContributor = async () => {
    if (!user || !contributorForm.project_id || !contributorForm.contributor_name.trim()) return;
    setSaving(true);
    const pledged = Math.max(0, toNum(contributorForm.pledged_amount));
    const paid = Math.max(0, toNum(contributorForm.paid_amount));
    const payload = {
      user_id: user.id,
      project_id: contributorForm.project_id,
      contributor_name: contributorForm.contributor_name.trim(),
      contributor_email: contributorForm.contributor_email || null,
      role: contributorForm.role,
      pledged_amount: pledged,
      paid_amount: paid,
      currency: contributorForm.currency || 'KWD',
      payment_status: paid >= pledged && pledged > 0 ? 'paid' : contributorForm.payment_status,
      due_date: contributorForm.due_date || null,
      notes: contributorForm.notes || null,
    };
    const { error } = editingContributor
      ? await db.from('charity_project_contributors').update(payload).eq('id', editingContributor.id).eq('user_id', user.id)
      : await db.from('charity_project_contributors').insert(payload);
    setSaving(false);
    if (error) {
      setMessage(tr.error);
      return;
    }
    setMessage(contributorForm.contributor_email ? tr.emailSaved : tr.contributorSaved);
    setContributorOpen(false);
    resetContributorForm();
    loadData();
  };

  const markContributorPaid = async (contributor: CharityContributor) => {
    const { error } = await db.from('charity_project_contributors')
      .update({ paid_amount: toNum(contributor.pledged_amount), payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', contributor.id)
      .eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.contributorPaid);
      loadData();
    }
  };

  const deleteContributor = async (contributor: CharityContributor) => {
    if (!window.confirm(tr.confirmDeleteContributor)) return;
    const { error } = await db.from('charity_project_contributors').delete().eq('id', contributor.id).eq('user_id', user?.id);
    if (error) setMessage(tr.error);
    else {
      setMessage(tr.contributorDeleted);
      loadData();
    }
  };

  const exportExcel = async () => {
    setExportingExcel(true);
    setMessage(hasReportData ? tr.preparingExcel : tr.emptyReportExported);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('No active session');
      const response = await fetch(`/api/charity-projects/export?year=${selectedReportYear}&format=csv&lang=${lang}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `charity-report-${selectedReportYear}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(tr.excelExported);
    } catch {
      setMessage(tr.excelExportFailed);
    } finally {
      setExportingExcel(false);
    }
  };

  const summaryCards = [
    { icon: HeartHandshake, label: tr.activeProjects, value: activeProjects.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US') },
    { icon: HandCoins, label: tr.totalDonations, value: money(totalDonations) },
    { icon: CalendarDays, label: tr.commitments, value: expectedCommitments > 0 ? money(expectedCommitments) : '0' },
    { icon: Coins, label: tr.estimatedZakat, value: money(toNum(latestEstimatedZakat)) },
    { icon: ShieldCheck, label: tr.nextZakat, value: nextDue ? dateLabel(nextDue) : tr.noDueDate },
  ];
  const charityTabs = [
    { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : lang === 'fr' ? 'Aperçu' : 'Overview' },
    { id: 'projects', label: tr.projects, count: projects.length },
    { id: 'beneficiaries', label: tr.beneficiaryTracking, count: beneficiaries.length },
    { id: 'contributors', label: tr.contributors, count: contributors.length },
    { id: 'documents', label: tr.documentVault, count: documents.length },
    { id: 'impact', label: tr.impactDashboard },
    { id: 'reports', label: lang === 'ar' ? 'التقارير' : lang === 'fr' ? 'Rapports' : 'Reports' },
  ];

  return (
    <div className="charity-projects-page" dir={dir}>
      <Sidebar />
      <DashboardPageShell contentClassName="charity-projects-content">
        <section className="cp-hero">
          <div>
            <span>{tr.breadcrumb}</span>
            <h1>{tr.title}</h1>
            <p>{tr.subtitle}</p>
          </div>
          <div className="hero-actions">
            <button className="gold-btn" onClick={() => { resetProjectForm(); setProjectOpen(true); }}>
              <Plus size={17} /> {tr.newProject}
            </button>
            <a className="dark-btn" href="/zakat">
              <Calculator size={17} /> {tr.zakatCalculator}
            </a>
            <a className="dark-btn" href="/documents">
              <FileText size={17} /> {tr.documentsCenter}
            </a>
            <LanguageSwitcher variant="dark" compact />
          </div>
        </section>

        {message && <div className="notice">{message}</div>}

        <section className="summary-grid">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <article className="warm-card summary-card" key={card.label}>
                <span><Icon size={18} /></span>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
              </article>
            );
          })}
        </section>

        <PageTabs
          tabs={charityTabs}
          active={activeTab}
          onChange={id => setActiveTab(id as CharityProjectsTab)}
          ariaLabel={tr.title}
        />

        <section className="warm-card hijri-calendar" hidden={activeTab !== 'overview'}>
          <div className="section-head vault-head">
            <div>
              <small>{tr.hijriEstimated}</small>
              <h2>{tr.hijriCalendar}</h2>
              <p>{tr.hijriCalendarDesc}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => {
              resetReminderForm();
              setReminderOpen(true);
            }}>
              <CalendarDays size={16} /> {tr.addReminder}
            </button>
          </div>
          <div className="calendar-grid">
            <article className="alert-panel">
              <strong>{tr.smartAlerts}</strong>
              {urgentReminders.length === 0 ? <p>{tr.noUrgentAlerts}</p> : urgentReminders.map(reminder => (
                <div className="alert-line" key={reminder.id}>
                  <b>{reminder.title}</b>
                  <span>{reminderTimingLabel(reminder)} • {dateLabel(reminder.due_date)}</span>
                </div>
              ))}
            </article>
            <article className="season-panel">
              <strong>{tr.seasonalReminders}</strong>
              <div className="season-grid">
                {seasonalCards.map(card => (
                  <span key={card.title}>
                    <b>{card.title}</b>
                    <small>{tr.preciseHijriLater}</small>
                  </span>
                ))}
              </div>
            </article>
          </div>
          <p className="nisab"><CalendarDays size={15} /> {tr.notificationNote}</p>
        </section>

        <section className="warm-card" hidden={activeTab !== 'overview'}>
          <div className="section-head">
            <h2>{tr.upcomingReminders}</h2>
            <button className="mini-gold" type="button" onClick={() => {
              resetReminderForm();
              setReminderOpen(true);
            }}>{tr.addReminder}</button>
          </div>
          {activeReminders.length === 0 ? (
            <div className="empty-state compact">
              <CalendarDays size={38} />
              <strong>{tr.noReminders}</strong>
            </div>
          ) : (
            <div className="reminder-grid">
              {activeReminders.map(reminder => {
                const relatedProject = projects.find(project => project.id === reminder.related_project_id)?.name;
                const relatedAsset = assets.find(asset => asset.id === reminder.related_zakat_asset_id)?.asset_name;
                const relatedCommitment = commitments.find(commitment => commitment.id === reminder.related_commitment_id)?.name;
                return (
                  <article className={`reminder-card ${reminder.priority}`} key={reminder.id}>
                    <div className="reminder-top">
                      <div>
                        <strong>{reminder.title}</strong>
                        <span>{reminderTypeLabel(reminder.reminder_type)}</span>
                      </div>
                      <b>{tr[reminder.priority]}</b>
                    </div>
                    <div className="badge-row">
                      <span>{dateLabel(reminder.due_date)}</span>
                      {reminder.hijri_date && <span>{tr.hijriDate}: {reminder.hijri_date}</span>}
                      <span>{tr.daysBefore.replace('{days}', String(reminder.remind_before_days))}</span>
                    </div>
                    <small>{reminderTimingLabel(reminder)} • {tr.hijriEstimated}</small>
                    {(relatedProject || relatedAsset || relatedCommitment) && <p>{relatedProject || relatedAsset || relatedCommitment}</p>}
                    {reminder.notes && <p>{reminder.notes}</p>}
                    <div className="card-actions">
                      <button type="button" onClick={() => updateReminderStatus(reminder, 'completed')} aria-label={tr.completedAction}>{tr.completedAction}</button>
                      <button type="button" onClick={() => updateReminderStatus(reminder, 'dismissed')} aria-label={tr.dismissAction}>{tr.dismissAction}</button>
                      <button type="button" onClick={() => openReminderEditor(reminder)} aria-label={tr.edit}>{tr.edit}</button>
                      <button type="button" onClick={() => deleteReminder(reminder)} aria-label={tr.deleteAction}>{tr.deleteAction}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="main-grid" hidden={activeTab !== 'projects'}>
          <article className="warm-card span-7 zakat-shortcut-card">
            <div className="section-head">
              <div><small>{tr.zakat}</small><h2>{zakatShortcut.title}</h2></div>
              <Calculator size={24} />
            </div>
            <p className="muted">{zakatShortcut.description}</p>
            <a className="primary-wide" href="/zakat">
              <Calculator size={16} /> {zakatShortcut.button}
            </a>
          </article>
          <article id="zakat-calculator" className="warm-card span-7">
            <div className="section-head">
              <div><small>2.5%</small><h2>{tr.smartZakat}</h2></div>
              <Coins size={24} />
            </div>
            <div className="zakat-premium-grid">
              <section className="zakat-panel">
                <h3>{tr.zakatInputs}</h3>
                <div className="form-grid">
                  <label><span>{tr.cashSavings}</span><input inputMode="decimal" value={zakat.cash} onChange={e => setZakat(prev => ({ ...prev, cash: e.target.value }))} placeholder="0.000" /></label>
                  <label><span>{tr.zakatableInvestments}</span><input inputMode="decimal" value={zakat.investments} onChange={e => setZakat(prev => ({ ...prev, investments: e.target.value }))} placeholder="0.000" /></label>
                  <label><span>{tr.debts}</span><input inputMode="decimal" value={zakat.debts} onChange={e => setZakat(prev => ({ ...prev, debts: e.target.value }))} placeholder="0.000" /></label>
                  <label><span>{tr.nisabMethod}</span><select value={nisabMethod} onChange={e => setNisabMethod(e.target.value as 'gold' | 'silver' | 'conservative')}><option value="gold">{tr.goldBased}</option><option value="silver">{tr.silverBased}</option><option value="conservative">{tr.conservative}</option></select></label>
                </div>
                <div className="asset-input-box">
                  <strong>{tr.goldHoldings}</strong>
                  <div className="form-grid">
                    <label><span>{tr.goldWeight}</span><input inputMode="decimal" value={zakat.goldGrams} onChange={e => setZakat(prev => ({ ...prev, goldGrams: e.target.value }))} placeholder="0" /></label>
                    <label><span>{tr.goldKarat}</span><select value={zakat.goldKarat} onChange={e => setZakat(prev => ({ ...prev, goldKarat: e.target.value }))}>{goldKarats.map(karat => <option key={karat} value={karat}>{karat}K</option>)}</select></label>
                    <label className="wide"><span>{tr.directGoldValue}</span><input inputMode="decimal" value={zakat.goldDirectValue} onChange={e => setZakat(prev => ({ ...prev, goldDirectValue: e.target.value }))} placeholder="0.000" /></label>
                  </div>
                </div>
                <div className="asset-input-box">
                  <strong>{tr.silverHoldings}</strong>
                  <div className="form-grid">
                    <label><span>{tr.silverWeight}</span><input inputMode="decimal" value={zakat.silverGrams} onChange={e => setZakat(prev => ({ ...prev, silverGrams: e.target.value }))} placeholder="0" /></label>
                    <label><span>{tr.directSilverValue}</span><input inputMode="decimal" value={zakat.silverDirectValue} onChange={e => setZakat(prev => ({ ...prev, silverDirectValue: e.target.value }))} placeholder="0.000" /></label>
                  </div>
                </div>
                <div className="non-zakat-box">
                  <strong>{tr.nonZakatableAssets}</strong>
                  <p>{tr.nonZakatHelper}</p>
                  <div className="chip-grid" role="group" aria-label={tr.nonZakatableAssets}>
                    {nonZakatOptions.map(option => (
                      <button
                        key={option}
                        type="button"
                        className={zakat.nonZakatAssets.includes(option) ? 'chip active' : 'chip'}
                        onClick={() => toggleNonZakatAsset(option)}
                        aria-pressed={zakat.nonZakatAssets.includes(option)}
                      >
                        {option === 'other' ? tr.other : tr[option]}
                      </button>
                    ))}
                  </div>
                  {zakat.nonZakatAssets.includes('other') && (
                    <label className="other-asset-input"><span>{tr.otherNonZakatAsset}</span><input value={zakat.nonZakatOther} onChange={e => setZakat(prev => ({ ...prev, nonZakatOther: e.target.value }))} /></label>
                  )}
                </div>
              </section>

              <section className="zakat-panel summary-panel">
                <h3>{tr.zakatSummaryTitle}</h3>
                <div className="price-status-grid">
                  <div className="price-card">
                    <small>{tr.goldPriceToday}</small>
                    <strong>{toNum(zakat.goldPrice) > 0 ? money(toNum(zakat.goldPrice)) : '-'}</strong>
                    <span>{metalsPrice?.success ? tr.liveStatus : tr.failedStatus}</span>
                  </div>
                  <div className="price-card">
                    <small>{tr.silverPriceToday}</small>
                    <strong>{toNum(zakat.silverPrice) > 0 ? money(toNum(zakat.silverPrice)) : '-'}</strong>
                    <span>{metalsPrice?.success ? tr.liveStatus : tr.failedStatus}</span>
                  </div>
                </div>
                <div className="price-meta">
                  <span>{tr.priceSource}: {priceSourceLabel}</span>
                  <span>{tr.lastUpdated}: {metalsPrice?.updatedAt ? dateLabel(metalsPrice.updatedAt) : '-'}</span>
                </div>
                <button className="primary-wide" type="button" onClick={loadMetalsPrices} disabled={loadingMetals} aria-label={tr.refreshPrices}>
                  <Sparkles size={16} /> {loadingMetals ? tr.automaticPrice : tr.refreshPrices}
                </button>
                {(!metalsPrice?.success || priceMode === 'manual') && (
                  <div className="manual-price-box">
                    <p>{tr.manualFallback}</p>
                    <div className="form-grid">
                      <label><span>{tr.goldPrice}</span><input inputMode="decimal" value={zakat.goldPrice} onChange={e => setZakat(prev => ({ ...prev, goldPrice: e.target.value }))} placeholder="0.000" /></label>
                      <label><span>{tr.silverPrice}</span><input inputMode="decimal" value={zakat.silverPrice} onChange={e => setZakat(prev => ({ ...prev, silverPrice: e.target.value }))} placeholder="0.000" /></label>
                    </div>
                  </div>
                )}
                <div className="result-grid">
                  <div><small>{tr.netZakatBase}</small><strong>{money(zakatableAmount)}</strong></div>
                  <div><small>{tr.goldNisab}</small><strong>{goldNisabValue > 0 ? money(goldNisabValue) : tr.enterPriceManually}</strong></div>
                  <div><small>{tr.silverNisab}</small><strong>{silverNisabValue > 0 ? money(silverNisabValue) : tr.enterPriceManually}</strong></div>
                  <div><small>{tr.usedNisab}</small><strong>{selectedNisabValue > 0 ? money(selectedNisabValue) : tr.enterPriceManually}</strong></div>
                  <div><small>{tr.differenceFromNisab}</small><strong>{selectedNisabValue > 0 ? money(Math.abs(nisabDifference)) : '-'}</strong></div>
                  <div><small>{tr.zakatRate}</small><strong>2.5%</strong></div>
                  <div className={reachedNisab ? 'nisab-reached' : 'nisab-missing'}><small>{tr.reachedNisabQuestion}</small><strong>{hasCriticalPriceData ? (reachedNisab ? tr.reachedNisab : tr.notReachedNisab) : tr.incompleteZakat}</strong></div>
                  <div><small>{tr.zakatDue}</small><strong>{hasCriticalPriceData ? money(zakatAmount) : '-'}</strong></div>
                </div>
                <p className="zakat-outcome">{hasCriticalPriceData ? (reachedNisab ? `${tr.dueSummary} ${money(zakatAmount)}` : tr.notDueSummary) : tr.incompleteZakat}</p>
              </section>

              <section className="zakat-panel guidance-panel">
                <h3>{tr.zakatGuidanceTitle}</h3>
                <div className="guidance-list">
                  {!hasCriticalPriceData && <p><AlertTriangle size={16} /> {tr.missingPricesNote}</p>}
                  {reachedNisab && <p><ShieldCheck size={16} /> {tr.aboveNisabNote}</p>}
                  {closeToNisab && <p><Sparkles size={16} /> {tr.closeToNisabNote}</p>}
                  {toNum(zakat.debts) > 0 && <p><Coins size={16} /> {tr.highDebtsNote}</p>}
                  <p><FileText size={16} /> {tr.zakatEstimateDisclaimer}</p>
                </div>
                <div className="hawl-mini-list">
                  <strong>{tr.hawlTracking}</strong>
                  {assets.length === 0 ? <span>{tr.noZakatHistory}</span> : assets.slice(0, 4).map(asset => {
                    const dueDays = asset.zakat_due_date ? daysUntil(asset.zakat_due_date) : null;
                    const label = !asset.ownership_date ? tr.missingOwnershipDate : dueDays !== null && dueDays <= 0 ? tr.completedHawl : tr.upcomingHawl;
                    return <div key={asset.id}><b>{asset.asset_name}</b><small>{label} • {dateLabel(asset.zakat_due_date || asset.ownership_date)}</small></div>;
                  })}
                </div>
                <button className="primary-wide" type="button" disabled={saving || !user} onClick={saveZakatCalculation}>
                  <Save size={16} /> {tr.saveZakatCalculation}
                </button>
                <p className="disclaimer">{tr.metalsDisclaimer}</p>
              </section>
            </div>

            <div className="zakat-history">
              <div className="section-head"><h3>{tr.zakatHistory}</h3></div>
              {zakatHistory.length === 0 ? <p className="muted">{tr.noZakatHistory}</p> : zakatHistory.map(item => (
                <div className="history-row" key={item.id}>
                  <span>{dateLabel(item.calculation_date)}</span>
                  <span>{money(toNum(item.net_zakat_base), item.currency)}</span>
                  <span>{nisabMethodLabel(item.nisab_method)}</span>
                  <strong>{money(toNum(item.zakat_due), item.currency)}</strong>
                  <small>{item.price_source || '-'}</small>
                  <button type="button" onClick={() => deleteZakatCalculation(item)} aria-label={tr.deleteAction}>{tr.deleteAction}</button>
                </div>
              ))}
            </div>
          </article>

          <article className="warm-card span-5">
            <div className="section-head">
              <div><small>Hijri MVP</small><h2>{tr.hawlTracking}</h2></div>
              <CalendarDays size={24} />
            </div>
            <div className="form-grid one">
              <label><span>{tr.assetName}</span><input value={assetForm.asset_name} onChange={e => setAssetForm(prev => ({ ...prev, asset_name: e.target.value }))} /></label>
              <label><span>{tr.assetType}</span><select value={assetForm.asset_type} onChange={e => setAssetForm(prev => ({ ...prev, asset_type: e.target.value as AssetType, is_zakatable: e.target.value !== 'non_zakat' }))}>{assetTypes.map(type => <option key={type} value={type}>{assetTypeLabel(type)}</option>)}</select></label>
              <label><span>{tr.target}</span><input inputMode="decimal" value={assetForm.amount} onChange={e => setAssetForm(prev => ({ ...prev, amount: e.target.value }))} /></label>
              <label><span>{tr.ownershipDate}</span><input type="date" value={assetForm.ownership_date} onChange={e => setAssetForm(prev => ({ ...prev, ownership_date: e.target.value, zakat_due_date: addYear(e.target.value) }))} /></label>
              <label><span>{tr.dueDate}</span><input type="date" value={assetForm.zakat_due_date} onChange={e => setAssetForm(prev => ({ ...prev, zakat_due_date: e.target.value }))} /></label>
              <label className="check-row"><input type="checkbox" checked={assetForm.is_zakatable} onChange={e => setAssetForm(prev => ({ ...prev, is_zakatable: e.target.checked }))} /><span>{tr.reminder}</span></label>
              <button className="primary-wide" onClick={saveAsset}><Save size={16} /> {tr.addAsset}</button>
            </div>
          </article>
        </section>

        <section className="split-grid" hidden={activeTab !== 'projects'}>
          <article className="warm-card">
            <div className="section-head"><h2>{tr.templates}</h2><Gift size={22} /></div>
            <div className="template-grid">
              {templates.map(template => (
                <button key={template.ar} className="template-card" onClick={() => openTemplate(template)}>
                  <strong>{template[lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en']}</strong>
                  <span>{template[lang === 'ar' ? 'subAr' : lang === 'fr' ? 'subFr' : 'subEn']}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="warm-card">
            <div className="section-head"><h2>{tr.forecast}</h2><FileText size={22} /></div>
            {expectedCommitments > 0 ? (
              <div className="big-metric">
                <strong>{money(expectedCommitments)}</strong>
                <span>{tr.commitments}</span>
              </div>
            ) : <p className="muted">{tr.forecastEmpty}</p>}
          </article>
        </section>

        <section className="warm-card" id="charity-organization-directory" hidden={activeTab !== 'projects'}>
          <div className="vault-head section-head">
            <div>
              <h2>{tr.organizationDirectory}</h2>
              <p>{tr.organizationDirectoryDesc}</p>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="document-tools">
            <label aria-label={tr.searchOrganization}><Search size={16} /><input value={organizationSearch} onChange={e => setOrganizationSearch(e.target.value)} placeholder={tr.searchOrganization} /></label>
            <select value={organizationVerificationFilter} onChange={e => setOrganizationVerificationFilter(e.target.value as 'all' | VerificationStatus)} aria-label={tr.verifiedOrganizations}>
              <option value="all">{tr.allOrganizations}</option>
              {verificationStatuses.map(status => <option key={status} value={status}>{verificationLabel(status)}</option>)}
            </select>
            <select value={organizationTypeFilter} onChange={e => setOrganizationTypeFilter(e.target.value as 'all' | OrganizationType)} aria-label={tr.organizationType}>
              <option value="all">{tr.organizationType}</option>
              {organizationTypes.map(type => <option key={type} value={type}>{tValue(type, tr.other)}</option>)}
            </select>
          </div>
          {organizations.length === 0 ? (
            <div className="empty-state compact">
              <ShieldCheck size={40} />
              <strong>{tr.organizationDirectory}</strong>
              <p>{tr.noOrganizationsAvailable}</p>
            </div>
          ) : (
            <div className="organization-grid">
              {filteredOrganizations.map(organization => {
                const reviewed = toNum(organization.transparency_score) > 0 || toNum(organization.efficiency_score) > 0 || toNum(organization.track_record_score) > 0;
                return (
                  <article className="organization-card" key={organization.id}>
                    <div className="organization-top">
                      <div>
                        <strong>{organizationName(organization)}</strong>
                        <span>{[organization.country, organization.city].filter(Boolean).join(' / ') || 'Kuwait'}</span>
                      </div>
                      <b className={`verify-badge ${organization.verification_status}`}>{verificationLabel(organization.verification_status)}</b>
                    </div>
                    <div className="badge-row">
                      <span>{tValue(organization.organization_type, tr.other)}</span>
                      {organization.license_number && <span>{tr.licenseNumber}: {organization.license_number}</span>}
                      <span>{tr.projects}: {organizationProjectCounts[organization.id] || 0}</span>
                    </div>
                    <div className="trust-box">
                      <strong>{tr.trustIndicators}</strong>
                      {reviewed ? (
                        <div className="trust-grid">
                          <span>{tr.transparency}: {organization.transparency_score}/100</span>
                          <span>{tr.efficiency}: {organization.efficiency_score}/100</span>
                          <span>{tr.trackRecord}: {organization.track_record_score}/100</span>
                        </div>
                      ) : <p>{tr.notReviewedYet}</p>}
                    </div>
                    <div className="org-contact">
                      {organization.website_url && <a href={organization.website_url} target="_blank" rel="noreferrer">{organization.website_url}</a>}
                      {organization.phone && <span>{organization.phone}</span>}
                      {organization.email && <span>{organization.email}</span>}
                      {organization.data_source && <small>{tr.dataSource}: {organization.data_source}</small>}
                    </div>
                    {organization.verification_status !== 'verified' && <p className="privacy-note">{tr.unverifiedOrganizationWarning}</p>}
                    <div className="card-actions">
                      <button type="button" aria-label={tr.selectOrganization} onClick={() => {
                        setProjectForm(prev => ({ ...prev, organization_id: organization.id, organization_name: organizationName(organization) }));
                        setManualOrganization(false);
                        setProjectOpen(true);
                      }}>{tr.selectOrganization}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <p className="disclaimer">{tr.verificationDisclaimer}</p>
        </section>

        <section className="warm-card" id="impact-dashboard" hidden={activeTab !== 'impact' && activeTab !== 'overview'}>
          <div className="vault-head section-head">
            <div>
              <h2>{tr.impactDashboard}</h2>
              <p>{tr.impactDashboardDesc}</p>
            </div>
            <Sparkles size={22} />
          </div>
          {!hasImpactData ? (
            <div className="empty-state compact">
              <HeartHandshake size={42} />
              <strong>{tr.notEnoughImpactData}</strong>
              <p>{tr.customImpactHint}</p>
            </div>
          ) : (
            <>
              <div className="impact-summary-grid">
                <div><small>{tr.totalDonated}</small><strong>{money(totalDonatedThisYear)}</strong></div>
                <div><small>{tr.activeCharityProjects}</small><strong>{activeProjects.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
                <div><small>{tr.completedProjects}</small><strong>{completedProjectsCount.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
                <div><small>{tr.beneficiariesSupported}</small><strong>{beneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
                <div><small>{tr.monthlySponsorships}</small><strong>{money(monthlySponsorshipsTotal)}</strong></div>
                <div><small>{tr.estimatedZakatImpact}</small><strong>{money(toNum(latestEstimatedZakat))}</strong></div>
              </div>

              <div className="impact-layout">
                <article className="impact-panel">
                  <h3>{tr.givingIncomeRatio}</h3>
                  {givingIncomeRatioYear === null ? <p className="muted">{tr.addIncomeForGivingRatio}</p> : (
                    <div className="ratio-grid">
                      <div><small>{tr.thisYear}</small><strong>{givingIncomeRatioYear.toFixed(1)}%</strong></div>
                      <div><small>{tr.currentMonth}</small><strong>{givingIncomeRatioMonth === null ? '-' : `${givingIncomeRatioMonth.toFixed(1)}%`}</strong></div>
                      <p>{tr.referenceBenchmark}: 2.5% / 10%</p>
                    </div>
                  )}
                </article>
                <article className="impact-panel">
                  <h3>{tr.yearlyImpactSummary}</h3>
                  <div className="impact-lines">
                    <p>{tr.totalDonated}: {money(totalDonatedThisYear)}</p>
                    <p>{tr.projects}: {projects.length.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
                    <p>{tr.beneficiariesSupported}: {beneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</p>
                    <p>{tr.monthlySponsorships}: {money(monthlySponsorshipsTotal)}</p>
                  </div>
                </article>
              </div>

              <div className="impact-layout">
                <article className="impact-panel">
                  <h3>{tr.impactOverTime}</h3>
                  <div className="impact-bars" role="img" aria-label={tr.impactOverTime}>
                    {impactByMonth.map(month => {
                      const total = month.donationAmount + month.sponsorshipAmount;
                      return (
                        <div key={month.label} className="impact-bar-row">
                          <span>{month.label}</span>
                          <i><b style={{ width: `${Math.min(100, (total / maxImpactMonth) * 100)}%` }} /></i>
                          <strong>{money(total)}</strong>
                        </div>
                      );
                    })}
                  </div>
                </article>
                <article className="impact-panel">
                  <h3>{tr.impactByCategory}</h3>
                  {impactByCategory.length === 0 ? <p className="muted">{tr.notEnoughImpactData}</p> : (
                    <div className="impact-bars" role="img" aria-label={tr.impactByCategory}>
                      {impactByCategory.map(item => (
                        <div key={item.category} className="impact-bar-row">
                          <span>{tValue(item.category, tr.other)}</span>
                          <i><b style={{ width: `${Math.min(100, (item.amount / maxImpactCategory) * 100)}%` }} /></i>
                          <strong>{money(item.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              </div>

              <article className="impact-panel">
                <h3>{tr.projectImpactProgress}</h3>
                <div className="project-impact-grid">
                  {projects.map(project => {
                    const target = toNum(project.target_amount);
                    const collected = toNum(project.collected_amount);
                    const progress = target > 0 ? Math.min(100, (collected / target) * 100) : 0;
                    return (
                      <div className="project-impact-card" key={project.id}>
                        <strong>{project.name}</strong>
                        <span>{organizationLabel(project.organization_id, project.organization_name)}</span>
                        <div className="progress"><i style={{ width: `${progress}%` }} /></div>
                        <div className="badge-row">
                          <span>{tr.completionRate}: {progress.toFixed(1)}%</span>
                          <span>{tr.collected}: {money(collected, project.currency)}</span>
                          <span>{tr.target}: {money(target, project.currency)}</span>
                          <span>{tr.beneficiariesSupported}: {projectBeneficiaryCounts[project.id] || 0}</span>
                          <span>{tr.documentsCount.replace('{count}', String(projectDocumentCounts[project.id] || 0))}</span>
                        </div>
                        {(impactMetricsByProject[project.id] || []).length > 0 && <div className="metric-chip-row">{impactMetricsByProject[project.id].map(metric => <span key={metric.id}>{metric.metric_name}: {toNum(metric.metric_value).toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')} {metric.metric_unit || ''}</span>)}</div>}
                      </div>
                    );
                  })}
                </div>
                <p className="disclaimer">{tr.customImpactHint}</p>
              </article>

              <div className="impact-layout">
                <article className="impact-panel">
                  <h3>{tr.beneficiaryImpact}</h3>
                  {beneficiaryByCategory.length === 0 ? <p className="muted">{tr.noBeneficiaries}</p> : <div className="metric-chip-row">{beneficiaryByCategory.map(item => <span key={item.category}>{tValue(item.category, tr.other)}: {item.count}</span>)}</div>}
                </article>
                <article className="impact-panel">
                  <h3>{tr.customImpactIndicators}</h3>
                  <div className="form-grid">
                    <label><span>{tr.linkedProject}</span><select value={impactMetricForm.project_id} onChange={e => setImpactMetricForm(prev => ({ ...prev, project_id: e.target.value }))}><option value="">-</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
                    <label><span>{tr.metricName}</span><input value={impactMetricForm.metric_name} onChange={e => setImpactMetricForm(prev => ({ ...prev, metric_name: e.target.value }))} /></label>
                    <label><span>{tr.metricValue}</span><input inputMode="decimal" value={impactMetricForm.metric_value} onChange={e => setImpactMetricForm(prev => ({ ...prev, metric_value: e.target.value }))} /></label>
                    <label><span>{tr.metricUnit}</span><input value={impactMetricForm.metric_unit} onChange={e => setImpactMetricForm(prev => ({ ...prev, metric_unit: e.target.value }))} /></label>
                    <label className="wide"><span>{tr.notes}</span><textarea value={impactMetricForm.notes} onChange={e => setImpactMetricForm(prev => ({ ...prev, notes: e.target.value }))} /></label>
                    <button className="primary-wide wide" type="button" onClick={saveImpactMetric}><Save size={16} /> {tr.addImpactMetric}</button>
                  </div>
                </article>
              </div>
            </>
          )}
        </section>

        <section className="warm-card" hidden={activeTab !== 'projects'}>
          <div className="section-head"><h2>{tr.projects}</h2><button className="mini-gold" onClick={() => setProjectOpen(true)}>{tr.newProject}</button></div>
          {projects.length === 0 ? (
            <div className="empty-state">
              <HeartHandshake size={44} />
              <strong>{tr.emptyTitle}</strong>
              <p>{tr.emptyBody}</p>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map(project => {
                const target = toNum(project.target_amount);
                const collected = toNum(project.collected_amount);
                const progress = target > 0 ? Math.min(100, (collected / target) * 100) : 0;
                const projectContributors = contributors.filter(contributor => contributor.project_id === project.id);
                const contributorPaid = projectContributors.reduce((sum, contributor) => sum + toNum(contributor.paid_amount), 0);
                const contributorCoverage = target > 0 ? Math.min(100, (contributorPaid / target) * 100) : 0;
                const projectOrganization = project.organization_id ? organizationById[project.organization_id] : null;
                return (
                  <article className="project-card" key={project.id}>
                    <div className="project-top">
                      <div><strong>{project.name}</strong><span>{organizationLabel(project.organization_id, project.organization_name)}</span></div>
                      <b className={`status ${project.status}`}>{tr[project.status]}</b>
                    </div>
                    <div className="org-strip">
                      <span>{tr.organization}</span>
                      <b className={`verify-badge ${projectOrganization?.verification_status ?? 'unverified'}`}>{verificationLabel(projectOrganization?.verification_status)}</b>
                      {projectOrganization?.license_number && <small>{tr.licenseNumber}: {projectOrganization.license_number}</small>}
                    </div>
                    {projectOrganization && projectOrganization.verification_status !== 'verified' && <p className="privacy-note">{tr.unverifiedOrganizationWarning}</p>}
                    <div className="badge-row"><span>{tr[project.category] ?? tr.other}</span><span>{dateLabel(project.start_date)} - {dateLabel(project.end_date)}</span></div>
                    <div className="progress"><i style={{ width: `${progress}%` }} /></div>
                    <div className="money-row">
                      <div><small>{tr.target}</small><strong>{money(target, project.currency)}</strong></div>
                      <div><small>{tr.collected}</small><strong>{money(collected, project.currency)}</strong></div>
                      <div><small>{tr.remaining}</small><strong>{money(Math.max(0, target - collected), project.currency)}</strong></div>
                    </div>
                    {projectContributors.length > 0 && (
                      <div className="collab-strip">
                        <span>{tr.contributorPayments}: {money(contributorPaid, project.currency)}</span>
                        <span>{tr.projectCoverage}: {contributorCoverage.toFixed(1)}%</span>
                      </div>
                    )}
                    {project.notes && <p>{project.notes}</p>}
                    <button
                      className="doc-count-btn"
                      type="button"
                      aria-label={tr.documentsCount.replace('{count}', String(projectDocumentCounts[project.id] || 0))}
                      onClick={() => {
                        setDocumentFilter('all');
                        setDocumentSearch('');
                        setDocumentProjectFilter(project.id);
                        window.setTimeout(() => window.document.getElementById('document-vault')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                      }}
                    >
                      {tr.documentsCount.replace('{count}', String(projectDocumentCounts[project.id] || 0))}
                    </button>
                    <button
                      className="doc-count-btn"
                      type="button"
                      aria-label={tr.beneficiariesCount.replace('{count}', String(projectBeneficiaryCounts[project.id] || 0))}
                      onClick={() => {
                        setBeneficiarySearch(project.name);
                        setBeneficiaryStatusFilter('all');
                        setBeneficiaryCategoryFilter('all');
                        window.setTimeout(() => window.document.getElementById('beneficiary-tracking')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                      }}
                    >
                      {tr.beneficiariesCount.replace('{count}', String(projectBeneficiaryCounts[project.id] || 0))}
                    </button>
                    <button
                      className="doc-count-btn"
                      type="button"
                      aria-label={tr.contributorsCount.replace('{count}', String(projectContributorCounts[project.id] || 0))}
                      onClick={() => {
                        setContributorProjectFilter(project.id);
                        window.setTimeout(() => window.document.getElementById('family-collaboration')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                      }}
                    >
                      {tr.contributorsCount.replace('{count}', String(projectContributorCounts[project.id] || 0))}
                    </button>
                    <div className="card-actions">
                      <button aria-label={tr.view}><Eye size={15} /> {tr.view}</button>
                      <button onClick={() => setDonationProject(project)} aria-label={tr.addDonation}><HandCoins size={15} /> {tr.addDonation}</button>
                      <button onClick={() => { resetContributorForm(project.id); setContributorOpen(true); }} aria-label={tr.addContributor}>{tr.addContributor}</button>
                      <button aria-label={tr.edit}><Pencil size={15} /> {tr.edit}</button>
                      <button onClick={() => archiveProject(project)} aria-label={tr.archive}><Archive size={15} /> {tr.archive}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="family-collaboration" className="warm-card family-collaboration" hidden={activeTab !== 'contributors'}>
          <div className="section-head vault-head">
            <div>
              <small>{tr.invitationsSoon}</small>
              <h2>{tr.familyCollaboration}</h2>
              <p>{tr.collaborationDesc}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => {
              resetContributorForm(contributorProjectFilter || projects[0]?.id || '');
              setContributorOpen(true);
            }}>{tr.addContributor}</button>
          </div>
          <div className="report-card">
            <div>
              <strong>{tr.contributorSummary}</strong>
              <span>{tr.recordedDonations} / {tr.contributorPayments}</span>
            </div>
            <select value={contributorProjectFilter} onChange={e => setContributorProjectFilter(e.target.value)} aria-label={tr.projects}>
              <option value="">{tr.projects}</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <button type="button" onClick={() => { resetContributorForm(contributorProjectFilter || projects[0]?.id || ''); setContributorOpen(true); }}>{tr.addContributor}</button>
          </div>
          <div className="beneficiary-stats">
            <div><small>{tr.contributors}</small><strong>{filteredContributors.length.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
            <div><small>{tr.totalPledged}</small><strong>{money(totalPledged)}</strong></div>
            <div><small>{tr.totalPaid}</small><strong>{money(totalPaid)}</strong></div>
            <div><small>{tr.lateContribution}</small><strong>{lateContributors.length.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
          </div>
          {topContributor && <p className="nisab"><HandCoins size={15} /> {tr.topContributor}: {topContributor.contributor_name} - {money(toNum(topContributor.paid_amount), topContributor.currency)}</p>}
          {filteredContributors.length === 0 ? (
            <div className="empty-state compact">
              <HandCoins size={38} />
              <strong>{tr.invitationsSoon}</strong>
            </div>
          ) : (
            <div className="contributor-grid">
              {filteredContributors.map(contributor => {
                const project = projects.find(item => item.id === contributor.project_id);
                const target = toNum(project?.target_amount);
                const percent = target > 0 ? (toNum(contributor.paid_amount) / target) * 100 : 0;
                const computedLate = contributor.due_date && daysUntil(contributor.due_date) < 0 && ['pending', 'partial'].includes(contributor.payment_status);
                return (
                  <article className="contributor-card" key={contributor.id}>
                    <div className="project-top">
                      <div>
                        <strong>{contributor.contributor_name}</strong>
                        <span>{project?.name || tr.projects}</span>
                      </div>
                      <b className={`status ${computedLate ? 'late' : contributor.payment_status}`}>{computedLate ? tr.late : tr[contributor.payment_status]}</b>
                    </div>
                    <div className="badge-row">
                      <span>{tr[contributor.role]}</span>
                      {contributor.due_date && <span>{tr.dueDate}: {dateLabel(contributor.due_date)}</span>}
                      {computedLate && <span>{tr.lateContribution}</span>}
                    </div>
                    <div className="money-row">
                      <div><small>{tr.pledgedAmount}</small><strong>{money(toNum(contributor.pledged_amount), contributor.currency)}</strong></div>
                      <div><small>{tr.paidAmount}</small><strong>{money(toNum(contributor.paid_amount), contributor.currency)}</strong></div>
                      <div><small>{tr.projectCoverage}</small><strong>{percent.toFixed(1)}%</strong></div>
                    </div>
                    <div className="card-actions">
                      <button type="button" onClick={() => openContributorEditor(contributor)} aria-label={tr.edit}>{tr.edit}</button>
                      <button type="button" onClick={() => markContributorPaid(contributor)} aria-label={tr.markPaid}>{tr.markPaid}</button>
                      <button type="button" onClick={() => deleteContributor(contributor)} aria-label={tr.deleteAction}>{tr.deleteAction}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="beneficiary-tracking" className="warm-card beneficiary-tracking" hidden={activeTab !== 'beneficiaries'}>
          <div className="section-head vault-head">
            <div>
              <small>{tr.privacyNote}</small>
              <h2>{tr.beneficiaryTracking}</h2>
              <p>{tr.beneficiaryDesc}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => {
              resetBeneficiaryForm();
              setBeneficiaryOpen(true);
            }}>{tr.addBeneficiary}</button>
          </div>
          <div className="beneficiary-stats">
            <div><small>{tr.totalBeneficiaries}</small><strong>{beneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
            <div><small>{tr.activeSponsorships}</small><strong>{activeBeneficiaries.length.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
            <div><small>{tr.monthlySupportTotal}</small><strong>{money(monthlySupportTotal)}</strong></div>
            <div><small>{tr.upcomingRenewals}</small><strong>{upcomingRenewals.length.toLocaleString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US')}</strong></div>
          </div>
          <div className="document-tools">
            <label>
              <Search size={16} />
              <input value={beneficiarySearch} onChange={e => setBeneficiarySearch(e.target.value)} placeholder={tr.searchBeneficiaries} aria-label={tr.searchBeneficiaries} />
            </label>
            <select value={beneficiaryStatusFilter} onChange={e => setBeneficiaryStatusFilter(e.target.value as 'all' | BeneficiaryStatus)} aria-label={tr.allStatuses}>
              <option value="all">{tr.allStatuses}</option>
              {beneficiaryStatuses.map(status => <option key={status} value={status}>{tr[status]}</option>)}
            </select>
            <select value={beneficiaryCategoryFilter} onChange={e => setBeneficiaryCategoryFilter(e.target.value as 'all' | BeneficiaryCategory)} aria-label={tr.allTypes}>
              <option value="all">{tr.allTypes}</option>
              {beneficiaryCategories.map(category => <option key={category} value={category}>{tr[category]}</option>)}
            </select>
          </div>
          {filteredBeneficiaries.length === 0 ? (
            <div className="empty-state compact">
              <HeartHandshake size={38} />
              <strong>{tr.noBeneficiaries}</strong>
            </div>
          ) : (
            <div className="beneficiary-grid">
              {filteredBeneficiaries.map(beneficiary => {
                const project = projects.find(item => item.id === beneficiary.project_id);
                const linkedDocuments = documents.filter(document => document.project_id && document.project_id === beneficiary.project_id).length;
                return (
                  <article className="beneficiary-card" key={beneficiary.id}>
                    <div className="project-top">
                      <div>
                        <strong>{beneficiary.display_name}</strong>
                        <span>{beneficiary.reference_code || tr.privacyNote}</span>
                      </div>
                      <b className={`status ${beneficiary.status}`}>{tr[beneficiary.status]}</b>
                    </div>
                    <div className="badge-row">
                      <span>{tr[beneficiary.category]}</span>
                      {project && <span>{project.name}</span>}
                      {beneficiary.next_renewal_date && <span>{tr.nextRenewal}: {dateLabel(beneficiary.next_renewal_date)}</span>}
                    </div>
                    <div className="money-row">
                      <div><small>{tr.monthlySupport}</small><strong>{money(toNum(beneficiary.monthly_support_amount), beneficiary.currency)}</strong></div>
                      <div><small>{tr.responsibleOrg}</small><strong>{beneficiary.organization_name || '-'}</strong></div>
                      <div><small>{tr.linkedDocuments}</small><strong>{linkedDocuments}</strong></div>
                    </div>
                    <div className="card-actions">
                      <button type="button" onClick={() => setBeneficiaryDetails(beneficiary)} aria-label={tr.view}>{tr.view}</button>
                      <button type="button" onClick={() => openBeneficiaryEditor(beneficiary)} aria-label={tr.edit}>{tr.edit}</button>
                      <button type="button" onClick={() => setDonationProject(project ?? null)} disabled={!project} aria-label={tr.addSupport}>{tr.addSupport}</button>
                      <button type="button" onClick={() => deleteBeneficiary(beneficiary)} aria-label={tr.deleteAction}>{tr.deleteAction}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="document-vault" className="warm-card document-vault" hidden={activeTab !== 'documents'}>
          <div className="section-head vault-head">
            <div>
              <small>{tr.searchInsideSoon}</small>
              <h2>{tr.documentVault}</h2>
              <p>{tr.documentVaultDesc}</p>
            </div>
            <button className="mini-gold" type="button" onClick={() => {
              resetDocumentForm();
              setDocumentOpen(true);
            }}>
              <FileUp size={16} /> {tr.uploadDocument}
            </button>
          </div>

          <div className="document-tools">
            <label>
              <Search size={16} />
              <input
                value={documentSearch}
                onChange={e => {
                  setDocumentSearch(e.target.value);
                  setDocumentProjectFilter('');
                }}
                placeholder={tr.searchDocuments}
                aria-label={tr.searchDocuments}
              />
            </label>
            <select
              value={documentFilter}
              onChange={e => {
                setDocumentFilter(e.target.value as 'all' | DocumentCategory);
                setDocumentProjectFilter('');
              }}
              aria-label={tr.allCategories}
            >
              <option value="all">{tr.allCategories}</option>
              {documentCategories.map(category => <option key={category} value={category}>{tr[category]}</option>)}
            </select>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="empty-state compact">
              <FileText size={38} />
              <strong>{tr.noDocuments}</strong>
            </div>
          ) : (
            <div className="document-grid">
              {filteredDocuments.map(document => {
                const linkedProject = projects.find(project => project.id === document.project_id)?.name;
                return (
                  <article className="document-card" key={document.id}>
                    <div className="document-icon"><FileText size={20} /></div>
                    <div className="document-body">
                      <strong>{document.title}</strong>
                      <span>{tr[document.category] ?? tr.other}</span>
                      <small>{document.file_name} • {formatFileSize(document.file_size)} • {dateLabel(document.uploaded_at)}</small>
                      {linkedProject && <em>{tr.projectName}: {linkedProject}</em>}
                      {document.notes && <p>{document.notes}</p>}
                    </div>
                    <div className="document-actions">
                      <button type="button" onClick={() => openDocument(document)} aria-label={tr.viewDocument}>{tr.viewDocument}</button>
                      <button type="button" onClick={() => openDocument(document, true)} aria-label={tr.downloadDocument}>{tr.downloadDocument}</button>
                      <button type="button" onClick={() => deleteDocument(document)} aria-label={tr.deleteDocument}>{tr.deleteDocument}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="split-grid" hidden={activeTab !== 'reports'}>
          <article className="warm-card">
            <div className="section-head"><h2>{tr.impact}</h2><AlertTriangle size={22} /></div>
            <label className="impact-input"><span>{tr.donationAmount}</span><input inputMode="decimal" value={impactDonation} onChange={e => setImpactDonation(e.target.value)} placeholder="0.000" /></label>
            {incomeTotal <= 0 ? <p className="muted">{tr.incomeMissing}</p> : impactPct !== null && impactValue > 0 ? (
              <div className="impact-lines">
                <p>{tr.donationPercent.replace('{pct}', impactPct.toFixed(1))}</p>
                <p>{tr.remainingNet.replace('{amount}', money(remainingNet))}</p>
                {impactPct > 20 && <p className="warn">{tr.highWarning}</p>}
              </div>
            ) : <p className="muted">{tr.incomeMissing}</p>}
          </article>

          <article className="warm-card" id="charity-reports">
            <div className="section-head"><h2>{tr.futureTitle}</h2><Sparkles size={22} /></div>
            <div className="report-card">
              <div>
                <strong>{tr.annualPdfReport}</strong>
                <span>{tr.reportYear}</span>
              </div>
              <select value={selectedReportYear} onChange={e => setSelectedReportYear(e.target.value)} aria-label={tr.reportYear}>
                {reportYears.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              <button type="button" onClick={() => router.push(`/charity-projects/report?year=${selectedReportYear}`)} aria-label={tr.generateReport}>
                <FileText size={16} /> {tr.generateReport}
              </button>
              <button type="button" onClick={exportExcel} disabled={exportingExcel} aria-label={tr.exportExcel}>
                <FileText size={16} /> {exportingExcel ? tr.preparingExcel : tr.exportExcel}
              </button>
            </div>
          </article>
        </section>
      </DashboardPageShell>

      {projectOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head"><h2>{tr.newProject}</h2><button aria-label={tr.cancel} onClick={() => setProjectOpen(false)}><X size={18} /></button></div>
            <div className="form-grid">
              <label className="wide"><span>{tr.projectName}</span><input value={projectForm.name} onChange={e => setProjectForm(prev => ({ ...prev, name: e.target.value }))} /></label>
              <label><span>{tr.category}</span><select value={projectForm.category} onChange={e => setProjectForm(prev => ({ ...prev, category: e.target.value as ProjectCategory }))}>{categories.map(category => <option key={category} value={category}>{tr[category]}</option>)}</select></label>
              <label><span>{tr.status}</span><select value={projectForm.status} onChange={e => setProjectForm(prev => ({ ...prev, status: e.target.value as ProjectStatus }))}>{statuses.map(status => <option key={status} value={status}>{tr[status]}</option>)}</select></label>
              <label><span>{tr.target}</span><input inputMode="decimal" value={projectForm.target_amount} onChange={e => setProjectForm(prev => ({ ...prev, target_amount: e.target.value }))} /></label>
              <label><span>{tr.collected}</span><input inputMode="decimal" value={projectForm.collected_amount} onChange={e => setProjectForm(prev => ({ ...prev, collected_amount: e.target.value }))} /></label>
              <div className="currency-field"><CurrencySelect value={projectForm.currency || 'KWD'} onChange={value => setProjectForm(prev => ({ ...prev, currency: value }))} lang={lang} label={tr.currency} ariaLabel={tr.currency} /></div>
              <label><span>{tr.startDate}</span><input type="date" value={projectForm.start_date} onChange={e => setProjectForm(prev => ({ ...prev, start_date: e.target.value }))} /></label>
              <label><span>{tr.endDate}</span><input type="date" value={projectForm.end_date} onChange={e => setProjectForm(prev => ({ ...prev, end_date: e.target.value }))} /></label>
              <label className="wide">
                <span>{tr.selectExecutingOrganization}</span>
                <select
                  value={projectForm.organization_id}
                  disabled={manualOrganization}
                  onChange={e => {
                    const organization = organizationById[e.target.value];
                    setProjectForm(prev => ({ ...prev, organization_id: e.target.value, organization_name: organizationName(organization) }));
                  }}
                >
                  <option value="">-</option>
                  {organizations.map(organization => <option key={organization.id} value={organization.id}>{organizationName(organization)} - {verificationLabel(organization.verification_status)}</option>)}
                </select>
              </label>
              {selectedOrganization && selectedOrganization.verification_status !== 'verified' && <p className="privacy-note wide">{tr.unverifiedOrganizationWarning}</p>}
              <label className="check-row wide">
                <input type="checkbox" checked={manualOrganization} onChange={e => {
                  setManualOrganization(e.target.checked);
                  if (e.target.checked) setProjectForm(prev => ({ ...prev, organization_id: '' }));
                }} />
                <span>{tr.manualOrganizationEntry}</span>
              </label>
              {manualOrganization && <label className="wide"><span>{tr.organization}</span><input value={projectForm.organization_name} onChange={e => setProjectForm(prev => ({ ...prev, organization_name: e.target.value }))} /></label>}
              <label className="wide"><span>{tr.notes}</span><textarea value={projectForm.notes} onChange={e => setProjectForm(prev => ({ ...prev, notes: e.target.value }))} /></label>
              <div className="modal-actions"><button className="ghost-btn" onClick={() => setProjectOpen(false)}>{tr.cancel}</button><button className="gold-btn" disabled={saving} onClick={saveProject}>{tr.saveProject}</button></div>
            </div>
          </div>
        </div>
      )}

      {reminderOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h2>{tr.addReminder}</h2>
              <button aria-label={tr.cancel} onClick={() => { setReminderOpen(false); resetReminderForm(); }}><X size={18} /></button>
            </div>
            <div className="form-grid">
              <label className="wide">
                <span>{tr.reminderTitle}</span>
                <input value={reminderForm.title} onChange={e => setReminderForm(prev => ({ ...prev, title: e.target.value }))} />
              </label>
              <label>
                <span>{tr.reminderType}</span>
                <select value={reminderForm.reminder_type} onChange={e => setReminderForm(prev => ({ ...prev, reminder_type: e.target.value as ReminderType }))}>
                  {reminderTypes.map(type => <option key={type} value={type}>{reminderTypeLabel(type)}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.dueDate}</span>
                <input type="date" value={reminderForm.due_date} onChange={e => setReminderForm(prev => ({ ...prev, due_date: e.target.value }))} />
              </label>
              <label>
                <span>{tr.remindBefore}</span>
                <input inputMode="numeric" value={reminderForm.remind_before_days} onChange={e => setReminderForm(prev => ({ ...prev, remind_before_days: e.target.value }))} />
              </label>
              <label>
                <span>{tr.priority}</span>
                <select value={reminderForm.priority} onChange={e => setReminderForm(prev => ({ ...prev, priority: e.target.value as ReminderPriority }))}>
                  {reminderPriorities.map(priority => <option key={priority} value={priority}>{tr[priority]}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.linkProject}</span>
                <select value={reminderForm.related_project_id} onChange={e => setReminderForm(prev => ({ ...prev, related_project_id: e.target.value }))}>
                  <option value="">-</option>
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.linkZakatAsset}</span>
                <select value={reminderForm.related_zakat_asset_id} onChange={e => setReminderForm(prev => ({ ...prev, related_zakat_asset_id: e.target.value }))}>
                  <option value="">-</option>
                  {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.asset_name}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.linkCommitment}</span>
                <select value={reminderForm.related_commitment_id} onChange={e => setReminderForm(prev => ({ ...prev, related_commitment_id: e.target.value }))}>
                  <option value="">-</option>
                  {commitments.map(commitment => <option key={commitment.id} value={commitment.id}>{commitment.name}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.hijriDate}</span>
                <input value={estimatedHijriDate(reminderForm.due_date, lang as Lang) || tr.hijriEstimated} readOnly />
              </label>
              <label className="wide">
                <span>{tr.notes}</span>
                <textarea value={reminderForm.notes} onChange={e => setReminderForm(prev => ({ ...prev, notes: e.target.value }))} />
              </label>
              <div className="modal-actions">
                <button className="ghost-btn" onClick={() => { setReminderOpen(false); resetReminderForm(); }}>{tr.cancel}</button>
                <button className="gold-btn" disabled={saving} onClick={saveReminder}>{tr.addReminder}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {documentOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h2>{tr.uploadDocument}</h2>
              <button aria-label={tr.cancel} onClick={() => setDocumentOpen(false)}><X size={18} /></button>
            </div>
            <div className="form-grid">
              <label className="wide">
                <span>{tr.documentTitle}</span>
                <input value={documentForm.title} onChange={e => setDocumentForm(prev => ({ ...prev, title: e.target.value }))} />
              </label>
              <label>
                <span>{tr.documentCategory}</span>
                <select value={documentForm.category} onChange={e => setDocumentForm(prev => ({ ...prev, category: e.target.value as DocumentCategory }))}>
                  {documentCategories.map(category => <option key={category} value={category}>{tr[category]}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.linkProject}</span>
                <select value={documentForm.project_id} onChange={e => setDocumentForm(prev => ({ ...prev, project_id: e.target.value }))}>
                  <option value="">-</option>
                  {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.linkDonation}</span>
                <select value={documentForm.donation_id} onChange={e => setDocumentForm(prev => ({ ...prev, donation_id: e.target.value }))}>
                  <option value="">-</option>
                  {donations.map(donation => {
                    const projectName = projects.find(project => project.id === donation.project_id)?.name ?? tr.linkedDonations;
                    return <option key={donation.id} value={donation.id}>{projectName} - {money(toNum(donation.amount), donation.currency)}</option>;
                  })}
                </select>
              </label>
              <label>
                <span>{tr.linkZakatAsset}</span>
                <select value={documentForm.zakat_asset_id} onChange={e => setDocumentForm(prev => ({ ...prev, zakat_asset_id: e.target.value }))}>
                  <option value="">-</option>
                  {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.asset_name}</option>)}
                </select>
              </label>
              <label>
                <span>{tr.linkCommitment}</span>
                <select value={documentForm.commitment_id} onChange={e => setDocumentForm(prev => ({ ...prev, commitment_id: e.target.value }))}>
                  <option value="">-</option>
                  {commitments.map(commitment => <option key={commitment.id} value={commitment.id}>{commitment.name}</option>)}
                </select>
              </label>
              <label className="wide">
                <span>{tr.chooseFile}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    setDocumentFile(file);
                    if (file && !documentForm.title.trim()) {
                      setDocumentForm(prev => ({ ...prev, title: file.name.replace(/\.[^.]+$/, '') }));
                    }
                  }}
                />
              </label>
              {documentFile && (
                <div className="file-chip wide">
                  <FileText size={16} />
                  <span>{documentFile.name}</span>
                  <small>{formatFileSize(documentFile.size)}</small>
                  <button type="button" onClick={() => setDocumentFile(null)} aria-label={tr.deleteDocument}><X size={14} /></button>
                </div>
              )}
              <label className="wide">
                <span>{tr.notes}</span>
                <textarea value={documentForm.notes} onChange={e => setDocumentForm(prev => ({ ...prev, notes: e.target.value }))} />
              </label>
              <div className="modal-actions">
                <button className="ghost-btn" onClick={() => setDocumentOpen(false)}>{tr.cancel}</button>
                <button className="gold-btn" disabled={uploadingDocument} onClick={uploadDocument}>{tr.uploadDocument}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {beneficiaryOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h2>{tr.addBeneficiary}</h2>
              <button aria-label={tr.cancel} onClick={() => { setBeneficiaryOpen(false); resetBeneficiaryForm(); }}><X size={18} /></button>
            </div>
            <div className="form-grid">
              <label><span>{tr.shortName}</span><input value={beneficiaryForm.display_name} onChange={e => setBeneficiaryForm(prev => ({ ...prev, display_name: e.target.value }))} /></label>
              <label><span>{tr.referenceNumber}</span><input value={beneficiaryForm.reference_code} onChange={e => setBeneficiaryForm(prev => ({ ...prev, reference_code: e.target.value }))} /></label>
              <label><span>{tr.beneficiaryType}</span><select value={beneficiaryForm.category} onChange={e => setBeneficiaryForm(prev => ({ ...prev, category: e.target.value as BeneficiaryCategory }))}>{beneficiaryCategories.map(category => <option key={category} value={category}>{tr[category]}</option>)}</select></label>
              <label><span>{tr.linkedProject}</span><select value={beneficiaryForm.project_id} onChange={e => setBeneficiaryForm(prev => ({ ...prev, project_id: e.target.value }))}><option value="">-</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label><span>{tr.responsibleOrg}</span><input value={beneficiaryForm.organization_name} onChange={e => setBeneficiaryForm(prev => ({ ...prev, organization_name: e.target.value }))} /></label>
              <label><span>{tr.country}</span><input value={beneficiaryForm.country} onChange={e => setBeneficiaryForm(prev => ({ ...prev, country: e.target.value }))} /></label>
              <label><span>{tr.city}</span><input value={beneficiaryForm.city} onChange={e => setBeneficiaryForm(prev => ({ ...prev, city: e.target.value }))} /></label>
              <label><span>{tr.monthlySupport}</span><input inputMode="decimal" value={beneficiaryForm.monthly_support_amount} onChange={e => setBeneficiaryForm(prev => ({ ...prev, monthly_support_amount: e.target.value }))} /></label>
              <div className="currency-field"><CurrencySelect value={beneficiaryForm.currency || 'KWD'} onChange={value => setBeneficiaryForm(prev => ({ ...prev, currency: value }))} lang={lang} label={tr.currency} ariaLabel={tr.currency} /></div>
              <label><span>{tr.sponsorshipStart}</span><input type="date" value={beneficiaryForm.sponsorship_start_date} onChange={e => setBeneficiaryForm(prev => ({ ...prev, sponsorship_start_date: e.target.value }))} /></label>
              <label><span>{tr.sponsorshipEnd}</span><input type="date" value={beneficiaryForm.sponsorship_end_date} onChange={e => setBeneficiaryForm(prev => ({ ...prev, sponsorship_end_date: e.target.value }))} /></label>
              <label><span>{tr.nextRenewal}</span><input type="date" value={beneficiaryForm.next_renewal_date} onChange={e => setBeneficiaryForm(prev => ({ ...prev, next_renewal_date: e.target.value }))} /></label>
              <label><span>{tr.status}</span><select value={beneficiaryForm.status} onChange={e => setBeneficiaryForm(prev => ({ ...prev, status: e.target.value as BeneficiaryStatus }))}>{beneficiaryStatuses.map(status => <option key={status} value={status}>{tr[status]}</option>)}</select></label>
              <label className="wide"><span>{tr.notes}</span><textarea value={beneficiaryForm.notes} onChange={e => setBeneficiaryForm(prev => ({ ...prev, notes: e.target.value }))} /></label>
              <p className="privacy-note wide">{tr.privacyNote}</p>
              <div className="modal-actions">
                <button className="ghost-btn" onClick={() => { setBeneficiaryOpen(false); resetBeneficiaryForm(); }}>{tr.cancel}</button>
                <button className="gold-btn" disabled={saving} onClick={saveBeneficiary}>{tr.addBeneficiary}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contributorOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-head">
              <h2>{tr.addContributor}</h2>
              <button aria-label={tr.cancel} onClick={() => { setContributorOpen(false); resetContributorForm(); }}><X size={18} /></button>
            </div>
            <div className="form-grid">
              <label className="wide"><span>{tr.linkedProject}</span><select value={contributorForm.project_id} onChange={e => setContributorForm(prev => ({ ...prev, project_id: e.target.value }))}><option value="">-</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label><span>{tr.contributorName}</span><input value={contributorForm.contributor_name} onChange={e => setContributorForm(prev => ({ ...prev, contributor_name: e.target.value }))} /></label>
              <label><span>{tr.emailOptional}</span><input type="email" value={contributorForm.contributor_email} onChange={e => setContributorForm(prev => ({ ...prev, contributor_email: e.target.value }))} /></label>
              <label><span>{tr.role}</span><select value={contributorForm.role} onChange={e => setContributorForm(prev => ({ ...prev, role: e.target.value as ContributorRole }))}>{contributorRoles.map(role => <option key={role} value={role}>{tr[role]}</option>)}</select></label>
              <label><span>{tr.paymentStatus}</span><select value={contributorForm.payment_status} onChange={e => setContributorForm(prev => ({ ...prev, payment_status: e.target.value as PaymentStatus }))}>{paymentStatuses.map(status => <option key={status} value={status}>{tr[status]}</option>)}</select></label>
              <label><span>{tr.pledgedAmount}</span><input inputMode="decimal" value={contributorForm.pledged_amount} onChange={e => setContributorForm(prev => ({ ...prev, pledged_amount: e.target.value }))} /></label>
              <label><span>{tr.paidAmount}</span><input inputMode="decimal" value={contributorForm.paid_amount} onChange={e => setContributorForm(prev => ({ ...prev, paid_amount: e.target.value }))} /></label>
              <div className="currency-field"><CurrencySelect value={contributorForm.currency || 'KWD'} onChange={value => setContributorForm(prev => ({ ...prev, currency: value }))} lang={lang} label={tr.currency} ariaLabel={tr.currency} /></div>
              <label><span>{tr.dueDate}</span><input type="date" value={contributorForm.due_date} onChange={e => setContributorForm(prev => ({ ...prev, due_date: e.target.value }))} /></label>
              <label className="wide"><span>{tr.notes}</span><textarea value={contributorForm.notes} onChange={e => setContributorForm(prev => ({ ...prev, notes: e.target.value }))} /></label>
              <p className="privacy-note wide">{tr.invitationsSoon}</p>
              <div className="modal-actions">
                <button className="ghost-btn" onClick={() => { setContributorOpen(false); resetContributorForm(); }}>{tr.cancel}</button>
                <button className="gold-btn" disabled={saving} onClick={saveContributor}>{tr.addContributor}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {beneficiaryDetails && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal small">
            <div className="modal-head">
              <h2>{beneficiaryDetails.display_name}</h2>
              <button aria-label={tr.cancel} onClick={() => setBeneficiaryDetails(null)}><X size={18} /></button>
            </div>
            <div className="details-list">
              <p><b>{tr.referenceNumber}</b><span>{beneficiaryDetails.reference_code || '-'}</span></p>
              <p><b>{tr.beneficiaryType}</b><span>{tr[beneficiaryDetails.category]}</span></p>
              <p><b>{tr.linkedProject}</b><span>{projects.find(project => project.id === beneficiaryDetails.project_id)?.name || '-'}</span></p>
              <p><b>{tr.monthlySupport}</b><span>{money(toNum(beneficiaryDetails.monthly_support_amount), beneficiaryDetails.currency)}</span></p>
              <p><b>{tr.sponsorshipStart}</b><span>{dateLabel(beneficiaryDetails.sponsorship_start_date)}</span></p>
              <p><b>{tr.sponsorshipEnd}</b><span>{dateLabel(beneficiaryDetails.sponsorship_end_date)}</span></p>
              <p><b>{tr.nextRenewal}</b><span>{dateLabel(beneficiaryDetails.next_renewal_date)}</span></p>
              <p><b>{tr.linkedDocuments}</b><span>{documents.filter(document => document.project_id && document.project_id === beneficiaryDetails.project_id).length}</span></p>
              {beneficiaryDetails.notes && <p><b>{tr.notes}</b><span>{beneficiaryDetails.notes}</span></p>}
            </div>
          </div>
        </div>
      )}

      {donationProject && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal small">
            <div className="modal-head"><h2>{tr.addDonation}</h2><button aria-label={tr.cancel} onClick={() => setDonationProject(null)}><X size={18} /></button></div>
            <label className="impact-input"><span>{donationProject.name}</span><input inputMode="decimal" value={donationAmount} onChange={e => setDonationAmount(e.target.value)} placeholder="0.000" /></label>
            <div className="modal-actions"><button className="ghost-btn" onClick={() => setDonationProject(null)}>{tr.cancel}</button><button className="gold-btn" disabled={saving} onClick={saveDonation}>{tr.addDonation}</button></div>
          </div>
        </div>
      )}

      <style jsx>{`
        .charity-projects-page{min-height:100vh;background:var(--sfm-background);color:var(--sfm-deep-navy);font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
        .charity-projects-content{display:grid;gap:18px;width:100%;max-width:100%;min-width:0}
        .charity-projects-content > *,.summary-grid > *,.main-grid > *,.split-grid > *,.template-grid > *,.project-grid > *,.calendar-grid > *,.reminder-grid > *{min-width:0}
        .cp-hero{width:100%;max-width:100%;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;border-radius:26px;padding:30px;background:radial-gradient(circle at 18% 20%,rgba(24,212,212,.28),transparent 28%),linear-gradient(135deg,var(--sfm-deep-navy),var(--sfm-primary-dark) 58%,var(--sfm-card-dark) 140%);color:var(--sfm-card);box-shadow:0 18px 48px rgba(3,18,37,.18);overflow:hidden}
        .cp-hero span{color:var(--sfm-soft-cyan);font-size:12px;font-weight:800}.cp-hero h1{margin:8px 0;font-size:clamp(32px,5vw,54px);font-weight:900}.cp-hero p{max-width:760px;color:rgba(234,246,255,.78);font-size:16px;line-height:1.8}.hero-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        button,a{font-family:inherit}.gold-btn,.dark-btn,.ghost-btn,.mini-gold,.primary-wide{border:0;border-radius:14px;min-height:44px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:800;cursor:pointer;text-decoration:none}.gold-btn,.mini-gold,.primary-wide{background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-deep-navy)}.dark-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:var(--sfm-card)}.ghost-btn{background:var(--sfm-card);border:1px solid rgba(29,140,255,.22);color:var(--sfm-midnight)}.mini-gold{min-height:36px;font-size:12px}
        .notice{border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-primary-hover);border-radius:14px;padding:12px 14px;font-weight:800}.warm-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.14);border-radius:22px;padding:20px;box-shadow:0 8px 26px rgba(3,18,37,.05)}
        .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.summary-card{display:grid;gap:8px}.summary-card span{width:40px;height:40px;border-radius:14px;background:rgba(29,140,255,.10);color:var(--sfm-primary);display:grid;place-items:center}.summary-card small,.section-head small{color:#8A6A55;font-weight:800}.summary-card strong{font-size:20px;color:var(--sfm-midnight);overflow-wrap:anywhere}
        .main-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:18px}.main-grid > #zakat-calculator,.main-grid > #zakat-calculator + .span-5{display:none}.zakat-shortcut-card{align-self:start}.zakat-shortcut-card .primary-wide{margin-top:14px}.span-7,.span-5{grid-column:auto}.split-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}.section-head h2{margin:0;color:var(--sfm-midnight);font-size:21px}.section-head svg{color:var(--sfm-primary)}
        .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.form-grid.one{grid-template-columns:1fr}.form-grid label,.impact-input,.currency-field{display:grid;gap:7px;color:var(--sfm-midnight);font-size:13px;font-weight:800;min-width:0}.form-grid input,.form-grid select,.form-grid textarea,.impact-input input{width:100%;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-background);color:var(--sfm-deep-navy);min-height:46px;padding:0 12px;outline:none}.form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}.form-grid input:focus,.form-grid select:focus,.form-grid textarea:focus,.impact-input input:focus{border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.15);background:var(--sfm-card)}.wide{grid-column:1/-1}.check-row{display:flex!important;align-items:center;gap:9px}.check-row input{width:18px!important;min-height:18px!important}.primary-wide{width:100%}
        .zakat-premium-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(280px,.82fr);gap:14px;align-items:start}.zakat-panel{display:grid;gap:14px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:20px;padding:16px;min-width:0}.zakat-panel h3,.zakat-history h3{margin:0;color:var(--sfm-midnight);font-size:17px}.asset-input-box,.non-zakat-box,.manual-price-box,.hawl-mini-list{border:1px solid rgba(29,140,255,.13);background:var(--sfm-card);border-radius:16px;padding:13px;display:grid;gap:10px;min-width:0}.asset-input-box strong,.non-zakat-box strong,.hawl-mini-list strong{color:var(--sfm-midnight)}.non-zakat-box p,.manual-price-box p{margin:0;color:var(--sfm-muted);line-height:1.7;font-size:13px}.chip-grid{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:999px;min-height:36px;padding:0 12px;font-weight:900;cursor:pointer}.chip.active{background:var(--sfm-midnight);color:var(--sfm-card);border-color:var(--sfm-midnight)}.other-asset-input{display:grid;gap:7px;color:var(--sfm-midnight);font-weight:800}.other-asset-input input{width:100%;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-background);color:var(--sfm-deep-navy);min-height:44px;padding:0 12px;outline:none}.price-status-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.price-card{background:var(--sfm-midnight);border:1px solid rgba(167,243,240,.18);border-radius:16px;padding:14px;color:var(--sfm-card);min-width:0}.price-card small,.price-card span{display:block;color:var(--sfm-soft-cyan);font-weight:800}.price-card strong{display:block;margin:5px 0;color:var(--sfm-card);font-size:20px;overflow-wrap:anywhere}.price-meta{display:flex;flex-wrap:wrap;gap:8px;color:var(--sfm-primary-hover);font-size:12px;font-weight:900}.price-meta span{border-radius:999px;background:rgba(29,140,255,.10);padding:6px 10px}.zakat-outcome{margin:0;border-radius:15px;background:#ECFDF5;color:#047857;padding:12px;font-weight:900;line-height:1.7}.guidance-list{display:grid;gap:8px}.guidance-list p{margin:0;display:flex;gap:8px;align-items:flex-start;border-radius:14px;background:var(--sfm-card);border:1px solid rgba(29,140,255,.12);padding:10px;color:var(--sfm-midnight);line-height:1.6}.guidance-list svg{color:var(--sfm-primary);flex:0 0 auto;margin-top:2px}.hawl-mini-list div{display:grid;gap:2px;border-radius:12px;background:var(--sfm-light-card);padding:9px}.hawl-mini-list b{color:var(--sfm-midnight)}.hawl-mini-list small,.hawl-mini-list span{color:var(--sfm-muted)}.zakat-history{margin-top:14px;border-top:1px solid rgba(29,140,255,.14);padding-top:14px}.history-row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr .7fr auto;gap:8px;align-items:center;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:14px;padding:10px;margin-top:8px;min-width:0}.history-row span,.history-row small,.history-row strong{min-width:0;overflow-wrap:anywhere;color:var(--sfm-midnight)}.history-row small{color:var(--sfm-primary-hover)}.history-row button{border:1px solid rgba(121,31,31,.14);background:#FEF2F2;color:#B91C1C;border-radius:10px;min-height:34px;padding:0 10px;font-weight:900;cursor:pointer}
        .result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:0}.result-grid div,.big-metric{background:rgba(29,140,255,.10);border:1px solid rgba(29,140,255,.14);border-radius:16px;padding:14px}.result-grid small,.big-metric span{display:block;color:var(--sfm-primary-hover);font-weight:800}.result-grid strong,.big-metric strong{display:block;margin-top:5px;color:var(--sfm-midnight);font-size:24px;overflow-wrap:anywhere}.disclaimer,.nisab,.muted{margin:12px 0 0;color:var(--sfm-muted);line-height:1.8}.nisab{display:flex;gap:8px;align-items:flex-start;color:var(--sfm-primary-hover);background:var(--sfm-light-card);border-radius:13px;padding:10px}
        .nisab-reached{background:#ECFDF5!important}.nisab-reached small,.nisab-reached strong{color:#047857!important}.nisab-missing{background:rgba(29,140,255,.10)!important}.metals-status{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(4,minmax(0,1fr)) auto;gap:10px;align-items:stretch;margin-top:14px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:18px;padding:12px}.metals-status div{min-width:0}.metals-status strong,.metals-status b,.metals-status span,.metals-status small{display:block}.metals-status strong,.metals-status b{color:var(--sfm-midnight);overflow-wrap:anywhere}.metals-status span,.metals-status small{color:var(--sfm-primary-hover);font-size:12px;line-height:1.5}.metals-status button{border:0;border-radius:12px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-deep-navy);padding:0 12px;font:900 12px Tajawal,Arial,sans-serif;cursor:pointer}.metals-status button:disabled{opacity:.65;cursor:wait}
        .template-grid,.project-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.template-card{text-align:start;border:1px solid rgba(29,140,255,.16);background:#FDF8EE;border-radius:16px;padding:14px;cursor:pointer}.template-card:hover{background:rgba(29,140,255,.10)}.template-card strong,.template-card span{display:block}.template-card span{margin-top:5px;color:#8A6A55}
        .project-card{border:1px solid rgba(29,140,255,.14);border-radius:18px;background:var(--sfm-card);padding:16px;display:grid;gap:13px}.project-top{display:flex;justify-content:space-between;gap:12px;min-width:0}.project-top strong{display:block;color:var(--sfm-midnight);font-size:17px;overflow-wrap:anywhere}.project-top span,.badge-row span,.project-card p{color:var(--sfm-muted);font-size:12px;overflow-wrap:anywhere}.status,.badge-row span{border-radius:999px;padding:5px 9px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);font-size:11px}.badge-row{display:flex;gap:8px;flex-wrap:wrap}.progress{height:9px;border-radius:99px;background:#F1E6D4;overflow:hidden}.progress i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent))}.money-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.money-row div{background:var(--sfm-light-card);border-radius:13px;padding:10px;min-width:0}.money-row small{display:block;color:#8A6A55}.money-row strong{display:block;color:var(--sfm-midnight);font-size:13px;overflow-wrap:anywhere}.card-actions{display:flex;gap:8px;flex-wrap:wrap}.card-actions button{border:1px solid rgba(29,140,255,.16);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:11px;min-height:36px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:800;font-size:12px}.doc-count-btn{justify-self:start;border:1px solid rgba(29,140,255,.16);background:var(--sfm-light-card);color:var(--sfm-primary-hover);border-radius:999px;min-height:34px;padding:0 12px;font-weight:900;cursor:pointer}
        .vault-head{align-items:flex-start}.vault-head p{margin:5px 0 0;color:var(--sfm-muted);line-height:1.7}.document-tools{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,260px) minmax(190px,260px);gap:10px;margin-bottom:14px}.document-tools label{display:flex;align-items:center;gap:8px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-background);border-radius:14px;padding:0 12px;min-height:46px;color:var(--sfm-primary)}.document-tools input,.document-tools select{width:100%;border:0;background:transparent;color:var(--sfm-deep-navy);outline:none;font:800 13px Tajawal,Arial,sans-serif}.document-tools select{border:1px solid rgba(29,140,255,.18);background:var(--sfm-background);border-radius:14px;padding:0 12px;min-height:46px}.document-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.document-card{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);border-radius:18px;padding:14px;min-width:0}.document-icon{width:42px;height:42px;border-radius:14px;background:rgba(29,140,255,.10);color:var(--sfm-primary);display:grid;place-items:center}.document-body{display:grid;gap:5px;min-width:0}.document-body strong{color:var(--sfm-midnight);overflow-wrap:anywhere}.document-body span{justify-self:start;border-radius:999px;background:var(--sfm-light-card);color:var(--sfm-primary-hover);padding:4px 9px;font-size:11px;font-weight:900}.document-body small,.document-body em,.document-body p{color:var(--sfm-muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.document-body em{font-style:normal;color:var(--sfm-midnight)}.document-actions{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}.document-actions button{border:1px solid rgba(29,140,255,.16);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:11px;min-height:36px;padding:0 10px;cursor:pointer;font-weight:900}.document-actions button:last-child{background:#FEF2F2;color:#B91C1C;border-color:rgba(121,31,31,.14)}.empty-state.compact{padding:24px 12px}.file-chip{display:flex;align-items:center;gap:8px;border:1px solid rgba(29,140,255,.16);background:rgba(29,140,255,.10);border-radius:14px;padding:10px;color:var(--sfm-midnight);min-width:0}.file-chip span{font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-chip small{color:var(--sfm-primary-hover);margin-inline-start:auto}.file-chip button{width:30px;height:30px;border-radius:10px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-card);display:grid;place-items:center;cursor:pointer}
        .beneficiary-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}.beneficiary-stats div{border:1px solid rgba(29,140,255,.14);background:#FDF8EE;border-radius:16px;padding:12px}.beneficiary-stats small,.details-list b{display:block;color:var(--sfm-primary-hover);font-weight:900}.beneficiary-stats strong{display:block;margin-top:4px;color:var(--sfm-midnight);font-size:18px}.beneficiary-grid,.contributor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.beneficiary-card,.contributor-card{border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);border-radius:18px;padding:14px;display:grid;gap:12px}.privacy-note{margin:0;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:13px;padding:10px;color:var(--sfm-primary-hover);line-height:1.7}.details-list{display:grid;gap:9px}.details-list p{margin:0;border:1px solid rgba(29,140,255,.12);background:#FDF8EE;border-radius:12px;padding:10px}.details-list span{display:block;color:var(--sfm-midnight);margin-top:3px;overflow-wrap:anywhere}.collab-strip{display:flex;flex-wrap:wrap;gap:8px}.collab-strip span{border-radius:999px;background:#FDF8EE;border:1px solid rgba(29,140,255,.14);color:var(--sfm-primary-hover);padding:6px 10px;font-size:12px;font-weight:900}
        .organization-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.organization-card{border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);border-radius:18px;padding:15px;display:grid;gap:12px;min-width:0}.organization-top{display:flex;justify-content:space-between;gap:12px;min-width:0}.organization-top strong{display:block;color:var(--sfm-midnight);font-size:17px;overflow-wrap:anywhere}.organization-top span,.org-contact span,.org-contact small{display:block;color:var(--sfm-muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere}.verify-badge{align-self:start;border-radius:999px;padding:5px 9px;font-size:11px;white-space:nowrap;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover)}.verify-badge.verified{background:#ECFDF5;color:#047857}.verify-badge.pending_review{background:#E6F1FB;color:#0C447C}.verify-badge.rejected{background:#FEF2F2;color:#B91C1C}.trust-box{border:1px solid rgba(29,140,255,.12);background:#FDF8EE;border-radius:14px;padding:11px;display:grid;gap:8px}.trust-box strong{color:var(--sfm-midnight)}.trust-box p{margin:0;color:var(--sfm-muted)}.trust-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.trust-grid span{border-radius:12px;background:var(--sfm-card);color:var(--sfm-primary-hover);padding:8px;font-size:12px;font-weight:900}.org-contact{display:grid;gap:4px}.org-contact a{color:#0C447C;overflow-wrap:anywhere}.org-strip{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border:1px solid rgba(29,140,255,.12);background:#FDF8EE;border-radius:14px;padding:9px;color:var(--sfm-midnight)}.org-strip span,.org-strip small{color:var(--sfm-muted);font-size:12px}.org-strip b{font-size:11px}
        .impact-summary-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:14px}.impact-summary-grid div,.impact-panel{border:1px solid rgba(29,140,255,.14);background:#FDF8EE;border-radius:18px;padding:14px;min-width:0}.impact-summary-grid small,.ratio-grid small{display:block;color:var(--sfm-primary-hover);font-weight:900}.impact-summary-grid strong,.ratio-grid strong{display:block;color:var(--sfm-midnight);font-size:18px;margin-top:5px;overflow-wrap:anywhere}.impact-layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px}.impact-panel h3{margin:0 0 12px;color:var(--sfm-midnight)}.ratio-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.ratio-grid div{border-radius:14px;background:var(--sfm-card);padding:12px}.ratio-grid p{grid-column:1/-1;margin:0;color:var(--sfm-primary-hover)}.impact-bars{display:grid;gap:8px}.impact-bar-row{display:grid;grid-template-columns:70px minmax(0,1fr) 120px;gap:8px;align-items:center}.impact-bar-row span,.impact-bar-row strong{color:var(--sfm-midnight);font-size:12px;overflow-wrap:anywhere}.impact-bar-row i{display:block;height:10px;border-radius:99px;background:#F1E6D4;overflow:hidden}.impact-bar-row b{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--sfm-primary),var(--sfm-accent))}.project-impact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.project-impact-card{display:grid;gap:9px;border:1px solid rgba(29,140,255,.12);background:var(--sfm-card);border-radius:16px;padding:12px}.project-impact-card strong{color:var(--sfm-midnight)}.project-impact-card>span{color:var(--sfm-muted);font-size:12px}.metric-chip-row{display:flex;flex-wrap:wrap;gap:8px}.metric-chip-row span{border-radius:999px;background:var(--sfm-light-card);border:1px solid rgba(29,140,255,.14);color:var(--sfm-primary-hover);padding:6px 10px;font-size:12px;font-weight:900}
        .calendar-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.alert-panel,.season-panel{border:1px solid rgba(29,140,255,.14);background:#FDF8EE;border-radius:18px;padding:14px;display:grid;gap:10px}.alert-panel strong,.season-panel strong{color:var(--sfm-midnight)}.alert-panel p{margin:0;color:var(--sfm-muted)}.alert-line{border-radius:14px;background:var(--sfm-card);border:1px solid rgba(29,140,255,.12);padding:10px;display:grid;gap:4px}.alert-line b{color:var(--sfm-midnight)}.alert-line span{color:var(--sfm-primary-hover);font-size:12px}.season-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.season-grid span{border-radius:14px;background:var(--sfm-card);border:1px solid rgba(29,140,255,.12);padding:10px;display:grid;gap:5px}.season-grid b{color:var(--sfm-midnight)}.season-grid small{color:#8A6A55;line-height:1.5}.reminder-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.reminder-card{border:1px solid rgba(29,140,255,.14);background:var(--sfm-card);border-radius:18px;padding:14px;display:grid;gap:10px}.reminder-card.high{border-color:rgba(121,31,31,.2);background:#FFF8F8}.reminder-card.low{background:#F9FBF6}.reminder-top{display:flex;justify-content:space-between;gap:10px;min-width:0}.reminder-top strong{display:block;color:var(--sfm-midnight);overflow-wrap:anywhere}.reminder-top span,.reminder-card small,.reminder-card p{color:var(--sfm-muted);line-height:1.6}.reminder-top b{align-self:start;border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:5px 9px;font-size:11px;white-space:nowrap}
        .empty-state{display:grid;place-items:center;text-align:center;padding:42px 16px;color:#8A6A55}.empty-state svg{color:var(--sfm-primary);margin-bottom:10px}.empty-state strong{color:var(--sfm-midnight);font-size:18px}.impact-lines{display:grid;gap:9px}.impact-lines p{margin:0;border-radius:13px;background:var(--sfm-background);padding:10px;color:var(--sfm-midnight)}.impact-lines .warn{background:rgba(29,140,255,.10);color:var(--sfm-primary-hover)}.report-card{display:grid;grid-template-columns:minmax(0,1fr) 110px auto auto;gap:10px;align-items:end;border:1px solid rgba(29,140,255,.18);border-radius:16px;background:rgba(29,140,255,.10);padding:14px;margin-bottom:12px}.report-card strong,.report-card span{display:block}.report-card strong{color:var(--sfm-midnight)}.report-card span{margin-top:4px;color:var(--sfm-primary-hover);font-size:12px}.report-card select{height:42px;border:1px solid rgba(29,140,255,.25);border-radius:12px;background:var(--sfm-card);color:var(--sfm-midnight);padding:0 10px;font:800 13px Tajawal,Arial,sans-serif}.report-card button{height:42px;border:0;border-radius:12px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:var(--sfm-deep-navy);padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.report-card button:disabled{opacity:.65;cursor:wait}.future-list{display:grid;gap:9px}.future-list span{display:flex;justify-content:space-between;gap:8px;border:1px solid rgba(29,140,255,.12);border-radius:12px;padding:10px;color:var(--sfm-midnight)}.future-list b{color:var(--sfm-primary)}
        .modal-backdrop{position:fixed;inset:0;z-index:90;background:rgba(3,18,37,.46);display:grid;place-items:center;padding:18px}.modal{width:min(760px,100%);max-height:92dvh;overflow:auto;background:var(--sfm-card);border:1px solid rgba(29,140,255,.18);border-radius:24px;padding:20px}.modal.small{width:min(420px,100%)}.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.modal-head h2{margin:0}.modal-head button{width:40px;height:40px;border-radius:12px;border:1px solid rgba(29,140,255,.18);background:var(--sfm-background);display:grid;place-items:center;cursor:pointer}.modal-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
        @media(max-width:1180px){.summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.main-grid,.split-grid,.calendar-grid,.zakat-premium-grid,.impact-layout{grid-template-columns:1fr}.impact-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.project-grid,.document-grid,.reminder-grid,.beneficiary-grid,.contributor-grid,.organization-grid,.project-impact-grid{grid-template-columns:1fr}.metals-status{grid-template-columns:repeat(2,minmax(0,1fr))}.metals-status button{min-height:42px}}
        @media(max-width:900px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:760px){.cp-hero{display:grid;padding:22px}.hero-actions,.gold-btn,.dark-btn{width:100%}.summary-grid,.template-grid,.form-grid,.result-grid,.money-row,.report-card,.document-tools,.season-grid,.metals-status,.beneficiary-stats,.price-status-grid,.trust-grid,.impact-summary-grid,.ratio-grid{grid-template-columns:1fr}.history-row,.impact-bar-row{grid-template-columns:1fr}.report-card button{width:100%}.document-card{grid-template-columns:36px minmax(0,1fr)}.document-actions button{flex:1}.modal-backdrop{align-items:end;padding:0}.modal{border-radius:24px 24px 0 0;max-height:94dvh;padding-bottom:calc(20px + env(safe-area-inset-bottom))}.modal-actions{display:grid}.card-actions button{flex:1}.warm-card{padding:16px}}
      `}</style>
    </div>
  );
}
