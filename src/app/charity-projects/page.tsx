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
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/formatMoney';

type Lang = 'ar' | 'en' | 'fr';
type ProjectStatus = 'planning' | 'fundraising' | 'in_progress' | 'completed' | 'paused';
type ProjectCategory = 'ongoing' | 'sponsorship' | 'zakat' | 'sacrifice' | 'endowment' | 'mosque' | 'water_well' | 'education' | 'relief' | 'other';
type AssetType = 'cash' | 'savings' | 'investment' | 'gold' | 'silver' | 'non_zakat';

type CharityProject = {
  id: string;
  user_id: string;
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

function toNum(value: string | number | null | undefined) {
  return Number(String(value ?? 0).replace(/[^\d.-]/g, '')) || 0;
}

function formatFileSize(size?: number | null) {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

export default function CharityProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, dir } = useLanguage();
  const tr = TEXT[lang as Lang] ?? TEXT.ar;
  const db = supabase as any;

  const [projects, setProjects] = useState<CharityProject[]>([]);
  const [assets, setAssets] = useState<ZakatAsset[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [donations, setDonations] = useState<ProjectDonation[]>([]);
  const [documents, setDocuments] = useState<CharityDocument[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [projectOpen, setProjectOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [donationProject, setDonationProject] = useState<CharityProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [impactDonation, setImpactDonation] = useState('');
  const [selectedReportYear, setSelectedReportYear] = useState(String(new Date().getFullYear()));
  const [documentSearch, setDocumentSearch] = useState('');
  const [documentFilter, setDocumentFilter] = useState<'all' | DocumentCategory>('all');
  const [documentProjectFilter, setDocumentProjectFilter] = useState('');
  const [zakat, setZakat] = useState({ cash: '', investments: '', gold: '', silver: '', debts: '', goldPrice: '', silverPrice: '', nonZakat: false });
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

  const money = useCallback((amount: number, currency = 'KWD') => formatMoney(amount, currency, lang as Lang), [lang]);
  const dateLabel = useCallback((date?: string | null) => date ? new Date(`${date}T00:00:00`).toLocaleDateString(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US') : '-', [lang]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [projectRes, assetRes, commitmentRes, donationRes, documentRes, incomeRes, expenseRes] = await Promise.all([
        db.from('charity_projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('zakat_assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('charity_commitments').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
        db.from('charity_project_donations').select('*').eq('user_id', user.id).order('donation_date', { ascending: false }),
        db.from('charity_documents').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false }),
        db.from('monthly_income_sources').select('amount').eq('user_id', user.id),
        db.from('expense_items').select('amount').eq('user_id', user.id),
      ]);
      if (!projectRes.error) setProjects((projectRes.data ?? []) as CharityProject[]);
      if (!assetRes.error) setAssets((assetRes.data ?? []) as ZakatAsset[]);
      if (!commitmentRes.error) setCommitments((commitmentRes.data ?? []) as Commitment[]);
      if (!donationRes.error) setDonations((donationRes.data ?? []) as ProjectDonation[]);
      if (!documentRes.error) setDocuments((documentRes.data ?? []) as CharityDocument[]);
      if (!incomeRes.error) setIncomeTotal((incomeRes.data ?? []).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
      if (!expenseRes.error) setExpenseTotal((expenseRes.data ?? []).reduce((sum: number, row: any) => sum + toNum(row.amount), 0));
    } catch {
      setMessage(tr.error);
    }
  }, [db, tr.error, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProjectOpen(false);
        setDocumentOpen(false);
        setDonationProject(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const zakatableAmount = Math.max(0, toNum(zakat.cash) + toNum(zakat.investments) + toNum(zakat.gold) + toNum(zakat.silver) - toNum(zakat.debts));
  const zakatAmount = zakatableAmount * 0.025;
  const totalDonations = projects.reduce((sum, project) => sum + toNum(project.collected_amount), 0);
  const activeProjects = projects.filter(project => !['completed', 'paused'].includes(project.status)).length;
  const expectedCommitments = commitments.reduce((sum, item) => {
    const amount = toNum(item.amount);
    if (item.frequency === 'monthly') return sum + amount * 12;
    if (item.frequency === 'annual') return sum + amount;
    return sum + amount;
  }, 0) + projects.filter(project => project.status !== 'completed').reduce((sum, project) => sum + Math.max(0, toNum(project.target_amount) - toNum(project.collected_amount)), 0) + zakatAmount;
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

  const resetProjectForm = () => {
    setProjectForm({ name: '', category: 'ongoing', status: 'planning', target_amount: '', collected_amount: '', currency: 'KWD', start_date: today(), end_date: '', organization_name: '', notes: '' });
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
      organization_name: projectForm.organization_name || null,
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

  const saveDonation = async () => {
    if (!user || !donationProject || toNum(donationAmount) <= 0) return;
    setSaving(true);
    const amount = toNum(donationAmount);
    const { error } = await db.from('charity_project_donations').insert({
      user_id: user.id,
      project_id: donationProject.id,
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
    { icon: Coins, label: tr.estimatedZakat, value: money(zakatAmount) },
    { icon: ShieldCheck, label: tr.nextZakat, value: nextDue ? dateLabel(nextDue) : tr.noDueDate },
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
            <a className="dark-btn" href="#zakat-calculator">
              <Calculator size={17} /> {tr.zakatCalculator}
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

        <section className="main-grid">
          <article id="zakat-calculator" className="warm-card span-7">
            <div className="section-head">
              <div><small>2.5%</small><h2>{tr.smartZakat}</h2></div>
              <Coins size={24} />
            </div>
            <div className="form-grid">
              {[
                ['cash', tr.cash],
                ['investments', tr.investments],
                ['gold', tr.gold],
                ['silver', tr.silver],
                ['debts', tr.debts],
                ['goldPrice', tr.goldPrice],
                ['silverPrice', tr.silverPrice],
              ].map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input inputMode="decimal" value={(zakat as any)[key]} onChange={e => setZakat(prev => ({ ...prev, [key]: e.target.value }))} placeholder="0.000" />
                </label>
              ))}
              <label className="check-row">
                <input type="checkbox" checked={zakat.nonZakat} onChange={e => setZakat(prev => ({ ...prev, nonZakat: e.target.checked }))} />
                <span>{tr.nonZakat}</span>
              </label>
            </div>
            <div className="result-grid">
              <div><small>{tr.zakatableAmount}</small><strong>{money(zakatableAmount)}</strong></div>
              <div><small>{tr.zakatAmount}</small><strong>{money(zakatAmount)}</strong></div>
            </div>
            <p className="disclaimer">{tr.zakatDisclaimer}</p>
            <p className="nisab"><Sparkles size={15} /> {tr.nisabNote}</p>
          </article>

          <article className="warm-card span-5">
            <div className="section-head">
              <div><small>Hijri MVP</small><h2>{tr.hawlTracking}</h2></div>
              <CalendarDays size={24} />
            </div>
            <div className="form-grid one">
              <label><span>{tr.assetName}</span><input value={assetForm.asset_name} onChange={e => setAssetForm(prev => ({ ...prev, asset_name: e.target.value }))} /></label>
              <label><span>{tr.assetType}</span><select value={assetForm.asset_type} onChange={e => setAssetForm(prev => ({ ...prev, asset_type: e.target.value as AssetType, is_zakatable: e.target.value !== 'non_zakat' }))}>{assetTypes.map(type => <option key={type} value={type}>{tr[type]}</option>)}</select></label>
              <label><span>{tr.target}</span><input inputMode="decimal" value={assetForm.amount} onChange={e => setAssetForm(prev => ({ ...prev, amount: e.target.value }))} /></label>
              <label><span>{tr.ownershipDate}</span><input type="date" value={assetForm.ownership_date} onChange={e => setAssetForm(prev => ({ ...prev, ownership_date: e.target.value, zakat_due_date: addYear(e.target.value) }))} /></label>
              <label><span>{tr.dueDate}</span><input type="date" value={assetForm.zakat_due_date} onChange={e => setAssetForm(prev => ({ ...prev, zakat_due_date: e.target.value }))} /></label>
              <label className="check-row"><input type="checkbox" checked={assetForm.is_zakatable} onChange={e => setAssetForm(prev => ({ ...prev, is_zakatable: e.target.checked }))} /><span>{tr.reminder}</span></label>
              <button className="primary-wide" onClick={saveAsset}><Save size={16} /> {tr.addAsset}</button>
            </div>
          </article>
        </section>

        <section className="split-grid">
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

        <section className="warm-card">
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
                return (
                  <article className="project-card" key={project.id}>
                    <div className="project-top">
                      <div><strong>{project.name}</strong><span>{project.organization_name || 'THE SFM'}</span></div>
                      <b className={`status ${project.status}`}>{tr[project.status]}</b>
                    </div>
                    <div className="badge-row"><span>{tr[project.category] ?? tr.other}</span><span>{dateLabel(project.start_date)} - {dateLabel(project.end_date)}</span></div>
                    <div className="progress"><i style={{ width: `${progress}%` }} /></div>
                    <div className="money-row">
                      <div><small>{tr.target}</small><strong>{money(target, project.currency)}</strong></div>
                      <div><small>{tr.collected}</small><strong>{money(collected, project.currency)}</strong></div>
                      <div><small>{tr.remaining}</small><strong>{money(Math.max(0, target - collected), project.currency)}</strong></div>
                    </div>
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
                    <div className="card-actions">
                      <button aria-label={tr.view}><Eye size={15} /> {tr.view}</button>
                      <button onClick={() => setDonationProject(project)} aria-label={tr.addDonation}><HandCoins size={15} /> {tr.addDonation}</button>
                      <button aria-label={tr.edit}><Pencil size={15} /> {tr.edit}</button>
                      <button onClick={() => archiveProject(project)} aria-label={tr.archive}><Archive size={15} /> {tr.archive}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section id="document-vault" className="warm-card document-vault">
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

        <section className="split-grid">
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

          <article className="warm-card">
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
            <div className="future-list">
              {['Family collaboration', 'Beneficiary tracking', 'Licensed charity organization database', 'Automatic gold/silver Kuwait price API', 'Hijri calendar advanced reminders'].map(item => (
                <span key={item}>{item} <b>{tr.comingSoon}</b></span>
              ))}
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
              <label><span>{tr.startDate}</span><input type="date" value={projectForm.start_date} onChange={e => setProjectForm(prev => ({ ...prev, start_date: e.target.value }))} /></label>
              <label><span>{tr.endDate}</span><input type="date" value={projectForm.end_date} onChange={e => setProjectForm(prev => ({ ...prev, end_date: e.target.value }))} /></label>
              <label className="wide"><span>{tr.organization}</span><input value={projectForm.organization_name} onChange={e => setProjectForm(prev => ({ ...prev, organization_name: e.target.value }))} /></label>
              <label className="wide"><span>{tr.notes}</span><textarea value={projectForm.notes} onChange={e => setProjectForm(prev => ({ ...prev, notes: e.target.value }))} /></label>
              <div className="modal-actions"><button className="ghost-btn" onClick={() => setProjectOpen(false)}>{tr.cancel}</button><button className="gold-btn" disabled={saving} onClick={saveProject}>{tr.saveProject}</button></div>
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
                    const projectName = projects.find(project => project.id === donation.project_id)?.name ?? tr.donations;
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
        .charity-projects-page{min-height:100vh;background:#F5F1E8;color:#1A0F05;font-family:Tajawal,Arial,sans-serif;overflow-x:hidden}
        .charity-projects-content{display:grid;gap:18px;width:100%;max-width:100%;min-width:0}
        .charity-projects-content > *,.summary-grid > *,.main-grid > *,.split-grid > *,.template-grid > *,.project-grid > *{min-width:0}
        .cp-hero{width:100%;max-width:100%;display:flex;align-items:flex-end;justify-content:space-between;gap:20px;border-radius:26px;padding:30px;background:radial-gradient(circle at 18% 20%,rgba(239,159,39,.28),transparent 28%),linear-gradient(135deg,#1A0F05,#2B1A0F 58%,#8A5514 140%);color:#FFFDF8;box-shadow:0 18px 48px rgba(45,26,10,.18);overflow:hidden}
        .cp-hero span{color:#FAC775;font-size:12px;font-weight:800}.cp-hero h1{margin:8px 0;font-size:clamp(32px,5vw,54px);font-weight:900}.cp-hero p{max-width:760px;color:rgba(255,253,248,.78);font-size:16px;line-height:1.8}.hero-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
        button,a{font-family:inherit}.gold-btn,.dark-btn,.ghost-btn,.mini-gold,.primary-wide{border:0;border-radius:14px;min-height:44px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:800;cursor:pointer;text-decoration:none}.gold-btn,.mini-gold,.primary-wide{background:linear-gradient(135deg,#FAC775,#BA7517);color:#1A0F05}.dark-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#FFFDF8}.ghost-btn{background:#FFFDF8;border:1px solid rgba(186,117,23,.22);color:#3D2914}.mini-gold{min-height:36px;font-size:12px}
        .notice{border:1px solid rgba(186,117,23,.2);background:#FFF8EA;color:#854F0B;border-radius:14px;padding:12px 14px;font-weight:800}.warm-card{background:#FFFDF8;border:1px solid rgba(186,117,23,.14);border-radius:22px;padding:20px;box-shadow:0 8px 26px rgba(61,41,20,.05)}
        .summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.summary-card{display:grid;gap:8px}.summary-card span{width:40px;height:40px;border-radius:14px;background:#FAEEDA;color:#BA7517;display:grid;place-items:center}.summary-card small,.section-head small{color:#8A6A55;font-weight:800}.summary-card strong{font-size:20px;color:#3D2914;overflow-wrap:anywhere}
        .main-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:18px}.span-7,.span-5{grid-column:auto}.split-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}.section-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}.section-head h2{margin:0;color:#3D2914;font-size:21px}.section-head svg{color:#BA7517}
        .form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.form-grid.one{grid-template-columns:1fr}.form-grid label,.impact-input{display:grid;gap:7px;color:#3D2914;font-size:13px;font-weight:800}.form-grid input,.form-grid select,.form-grid textarea,.impact-input input{width:100%;border:1px solid rgba(186,117,23,.18);border-radius:13px;background:#F5F1E8;color:#1A0F05;min-height:46px;padding:0 12px;outline:none}.form-grid textarea{min-height:92px;padding-top:12px;resize:vertical}.form-grid input:focus,.form-grid select:focus,.form-grid textarea:focus,.impact-input input:focus{border-color:#EF9F27;box-shadow:0 0 0 3px rgba(239,159,39,.15);background:#FFFDF8}.wide{grid-column:1/-1}.check-row{display:flex!important;align-items:center;gap:9px}.check-row input{width:18px!important;min-height:18px!important}.primary-wide{width:100%}
        .result-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.result-grid div,.big-metric{background:#FAEEDA;border:1px solid rgba(186,117,23,.14);border-radius:16px;padding:14px}.result-grid small,.big-metric span{display:block;color:#854F0B;font-weight:800}.result-grid strong,.big-metric strong{display:block;margin-top:5px;color:#3D2914;font-size:24px}.disclaimer,.nisab,.muted{margin:12px 0 0;color:#7A6A55;line-height:1.8}.nisab{display:flex;gap:8px;align-items:flex-start;color:#854F0B;background:#FFF8EA;border-radius:13px;padding:10px}
        .template-grid,.project-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.template-card{text-align:start;border:1px solid rgba(186,117,23,.16);background:#FDF8EE;border-radius:16px;padding:14px;cursor:pointer}.template-card:hover{background:#FAEEDA}.template-card strong,.template-card span{display:block}.template-card span{margin-top:5px;color:#8A6A55}
        .project-card{border:1px solid rgba(186,117,23,.14);border-radius:18px;background:#FFFDF8;padding:16px;display:grid;gap:13px}.project-top{display:flex;justify-content:space-between;gap:12px;min-width:0}.project-top strong{display:block;color:#3D2914;font-size:17px;overflow-wrap:anywhere}.project-top span,.badge-row span,.project-card p{color:#7A6A55;font-size:12px;overflow-wrap:anywhere}.status,.badge-row span{border-radius:999px;padding:5px 9px;background:#FAEEDA;color:#854F0B;font-size:11px}.badge-row{display:flex;gap:8px;flex-wrap:wrap}.progress{height:9px;border-radius:99px;background:#F1E6D4;overflow:hidden}.progress i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#BA7517,#EF9F27)}.money-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.money-row div{background:#F7F0E4;border-radius:13px;padding:10px;min-width:0}.money-row small{display:block;color:#8A6A55}.money-row strong{display:block;color:#3D2914;font-size:13px;overflow-wrap:anywhere}.card-actions{display:flex;gap:8px;flex-wrap:wrap}.card-actions button{border:1px solid rgba(186,117,23,.16);background:#FFF8EA;color:#3D2914;border-radius:11px;min-height:36px;padding:0 10px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:800;font-size:12px}.doc-count-btn{justify-self:start;border:1px solid rgba(186,117,23,.16);background:#F7F0E4;color:#854F0B;border-radius:999px;min-height:34px;padding:0 12px;font-weight:900;cursor:pointer}
        .vault-head{align-items:flex-start}.vault-head p{margin:5px 0 0;color:#7A6A55;line-height:1.7}.document-tools{display:grid;grid-template-columns:minmax(0,1fr) minmax(190px,260px);gap:10px;margin-bottom:14px}.document-tools label{display:flex;align-items:center;gap:8px;border:1px solid rgba(186,117,23,.18);background:#F5F1E8;border-radius:14px;padding:0 12px;min-height:46px;color:#BA7517}.document-tools input,.document-tools select{width:100%;border:0;background:transparent;color:#1A0F05;outline:none;font:800 13px Tajawal,Arial,sans-serif}.document-tools select{border:1px solid rgba(186,117,23,.18);background:#F5F1E8;border-radius:14px;padding:0 12px;min-height:46px}.document-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.document-card{display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;border:1px solid rgba(186,117,23,.14);background:#FFFDF8;border-radius:18px;padding:14px;min-width:0}.document-icon{width:42px;height:42px;border-radius:14px;background:#FAEEDA;color:#BA7517;display:grid;place-items:center}.document-body{display:grid;gap:5px;min-width:0}.document-body strong{color:#3D2914;overflow-wrap:anywhere}.document-body span{justify-self:start;border-radius:999px;background:#F7F0E4;color:#854F0B;padding:4px 9px;font-size:11px;font-weight:900}.document-body small,.document-body em,.document-body p{color:#7A6A55;font-size:12px;line-height:1.6;overflow-wrap:anywhere}.document-body em{font-style:normal;color:#3D2914}.document-actions{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}.document-actions button{border:1px solid rgba(186,117,23,.16);background:#FFF8EA;color:#3D2914;border-radius:11px;min-height:36px;padding:0 10px;cursor:pointer;font-weight:900}.document-actions button:last-child{background:#FCEBEB;color:#791F1F;border-color:rgba(121,31,31,.14)}.empty-state.compact{padding:24px 12px}.file-chip{display:flex;align-items:center;gap:8px;border:1px solid rgba(186,117,23,.16);background:#FAEEDA;border-radius:14px;padding:10px;color:#3D2914;min-width:0}.file-chip span{font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-chip small{color:#854F0B;margin-inline-start:auto}.file-chip button{width:30px;height:30px;border-radius:10px;border:1px solid rgba(186,117,23,.18);background:#FFFDF8;display:grid;place-items:center;cursor:pointer}
        .empty-state{display:grid;place-items:center;text-align:center;padding:42px 16px;color:#8A6A55}.empty-state svg{color:#BA7517;margin-bottom:10px}.empty-state strong{color:#3D2914;font-size:18px}.impact-lines{display:grid;gap:9px}.impact-lines p{margin:0;border-radius:13px;background:#F5F1E8;padding:10px;color:#3D2914}.impact-lines .warn{background:#FAEEDA;color:#854F0B}.report-card{display:grid;grid-template-columns:minmax(0,1fr) 110px auto auto;gap:10px;align-items:end;border:1px solid rgba(186,117,23,.18);border-radius:16px;background:#FAEEDA;padding:14px;margin-bottom:12px}.report-card strong,.report-card span{display:block}.report-card strong{color:#3D2914}.report-card span{margin-top:4px;color:#854F0B;font-size:12px}.report-card select{height:42px;border:1px solid rgba(186,117,23,.25);border-radius:12px;background:#FFFDF8;color:#3D2914;padding:0 10px;font:800 13px Tajawal,Arial,sans-serif}.report-card button{height:42px;border:0;border-radius:12px;background:linear-gradient(135deg,#FAC775,#BA7517);color:#1A0F05;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:900 13px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap}.report-card button:disabled{opacity:.65;cursor:wait}.future-list{display:grid;gap:9px}.future-list span{display:flex;justify-content:space-between;gap:8px;border:1px solid rgba(186,117,23,.12);border-radius:12px;padding:10px;color:#3D2914}.future-list b{color:#BA7517}
        .modal-backdrop{position:fixed;inset:0;z-index:90;background:rgba(26,15,5,.46);display:grid;place-items:center;padding:18px}.modal{width:min(760px,100%);max-height:92dvh;overflow:auto;background:#FFFDF8;border:1px solid rgba(186,117,23,.18);border-radius:24px;padding:20px}.modal.small{width:min(420px,100%)}.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.modal-head h2{margin:0}.modal-head button{width:40px;height:40px;border-radius:12px;border:1px solid rgba(186,117,23,.18);background:#F5F1E8;display:grid;place-items:center;cursor:pointer}.modal-actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
        @media(max-width:1180px){.summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.main-grid,.split-grid{grid-template-columns:1fr}.project-grid,.document-grid{grid-template-columns:1fr}}
        @media(max-width:900px){.summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:760px){.cp-hero{display:grid;padding:22px}.hero-actions,.gold-btn,.dark-btn{width:100%}.summary-grid,.template-grid,.form-grid,.result-grid,.money-row,.report-card,.document-tools{grid-template-columns:1fr}.report-card button{width:100%}.document-card{grid-template-columns:36px minmax(0,1fr)}.document-actions button{flex:1}.modal-backdrop{align-items:end;padding:0}.modal{border-radius:24px 24px 0 0;max-height:94dvh;padding-bottom:calc(20px + env(safe-area-inset-bottom))}.modal-actions{display:grid}.card-actions button{flex:1}.warm-card{padding:16px}}
      `}</style>
    </div>
  );
}
