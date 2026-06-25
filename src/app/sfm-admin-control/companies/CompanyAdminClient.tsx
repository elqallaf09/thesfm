'use client';

import { type FormEvent, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CheckCircle2, LogIn, LogOut, Plus, Save, X } from 'lucide-react';
import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { COMPANY_CATEGORIES, type CompanyCategory, type CompanyListing } from '@/lib/companyListings';
import type { Lang } from '@/lib/translations';

type CompanyStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_changes' | 'inactive';
type Tab = CompanyStatus;

type Company = CompanyListing;

interface Props {
  companies: Company[];
  adminEmail: string;
}

type AdminCompanyForm = {
  companyName: string;
  category: CompanyCategory;
  status: CompanyStatus;
  country: string;
  city: string;
  fullAddress: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  email: string;
  phone: string;
  whatsapp: string;
  linkedinUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  logoUrl: string;
  coverImageUrl: string;
  foundedYear: string;
  licenseNumber: string;
  regulatorName: string;
  services: string;
  isFeatured: boolean;
  adminNotes: string;
};

const TABS: Tab[] = ['pending_review', 'needs_changes', 'approved', 'rejected', 'inactive'];

const STATUS_COLORS: Record<CompanyStatus, string> = {
  pending_review: '#F59E0B',
  needs_changes: '#3B82F6',
  approved: '#10B981',
  rejected: '#EF4444',
  inactive: '#6B7280',
};

const CATEGORY_LABELS: Record<Lang, Record<CompanyCategory, string>> = {
  ar: {
    investment: 'شركات الاستثمار',
    trading: 'شركات التداول',
    accounting: 'المحاسبة والضرائب',
    feasibility: 'دراسات الجدوى',
    financial_consulting: 'الاستشارات المالية',
  },
  en: {
    investment: 'Investment companies',
    trading: 'Trading companies',
    accounting: 'Accounting and tax',
    feasibility: 'Feasibility studies',
    financial_consulting: 'Financial consulting',
  },
  fr: {
    investment: 'Sociétés d’investissement',
    trading: 'Sociétés de trading',
    accounting: 'Comptabilité et fiscalité',
    feasibility: 'Études de faisabilité',
    financial_consulting: 'Conseil financier',
  },
};

function createEmptyAdminCompanyForm(): AdminCompanyForm {
  return {
    companyName: '',
    category: 'investment',
    status: 'approved',
    country: '',
    city: '',
    fullAddress: '',
    shortDescription: '',
    longDescription: '',
    websiteUrl: '',
    email: '',
    phone: '',
    whatsapp: '',
    linkedinUrl: '',
    twitterUrl: '',
    instagramUrl: '',
    logoUrl: '',
    coverImageUrl: '',
    foundedYear: '',
    licenseNumber: '',
    regulatorName: '',
    services: '',
    isFeatured: false,
    adminNotes: '',
  };
}

const COPY = {
  ar: {
    adminFallback: 'أدمن THE SFM',
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    title: 'مراجعة طلبات الشركات',
    subtitle: 'مراجعة وإدارة طلبات إدراج الشركات في الدليل',
    addCompany: 'إضافة شركة',
    addCompanyTitle: 'إضافة شركة من لوحة الأدمن',
    addCompanySubtitle: 'تُضاف الشركة مباشرة دون دفع، مع الاحتفاظ بمسار الدفع للمستخدمين العاديين.',
    requiredFields: 'الحقول الأساسية',
    contactFields: 'بيانات التواصل',
    mediaFields: 'الشعار والروابط',
    detailsFields: 'تفاصيل إضافية',
    companyName: 'اسم الشركة',
    shortDescription: 'وصف مختصر',
    longDescription: 'وصف تفصيلي',
    fullAddress: 'العنوان التفصيلي',
    phone: 'الهاتف',
    whatsapp: 'واتساب',
    logoUrl: 'رابط الشعار',
    coverImageUrl: 'رابط صورة الغلاف',
    linkedinUrl: 'LinkedIn',
    twitterUrl: 'X / Twitter',
    instagramUrl: 'Instagram',
    foundedYear: 'سنة التأسيس',
    licenseNumber: 'رقم الترخيص',
    regulatorName: 'الجهة الرقابية',
    services: 'الخدمات',
    featured: 'شركة مميزة',
    saveCompany: 'حفظ الشركة',
    savingCompany: 'جارٍ الحفظ...',
    createSuccess: 'تمت إضافة الشركة بنجاح دون دفع.',
    createValidationError: 'يرجى إدخال اسم الشركة والتصنيف، والتحقق من الروابط وبيانات التواصل.',
    imageResolveError: 'تعذر التحقق من رابط الشعار أو صورة الغلاف.',
    createForbidden: 'لا تملك صلاحية إضافة الشركات من لوحة الأدمن.',
    createServiceError: 'تعذر حفظ الشركة حالياً.',
    close: 'إغلاق',
    optionalPlaceholder: 'اختياري',
    empty: 'لا توجد شركات في هذه الفئة',
    company: 'الشركة',
    category: 'الفئة',
    location: 'الموقع',
    submittedAt: 'تاريخ التقديم',
    status: 'الحالة',
    review: 'مراجعة',
    country: 'الدولة',
    city: 'المدينة',
    email: 'البريد',
    website: 'الموقع',
    reviewedBy: 'راجعه',
    reviewedAt: 'وقت المراجعة',
    notesLabel: 'ملاحظات الأدمن',
    notesHint: 'مطلوبة للرفض أو طلب التعديل',
    notesPlaceholder: 'أضف ملاحظة للمراجع أو صاحب الشركة...',
    noteRequired: 'يجب إضافة ملاحظة عند الرفض أو طلب التعديل.',
    serverError: 'خطأ في الخادم',
    unknownError: 'حدث خطأ',
    updated: 'تم تحديث الحالة إلى:',
    approve: 'قبول',
    requestChanges: 'طلب تعديل',
    reject: 'رفض',
    dash: 'غير محدد',
    statuses: {
      pending_review: 'قيد المراجعة',
      needs_changes: 'تحتاج تعديل',
      approved: 'مقبولة',
      rejected: 'مرفوضة',
      inactive: 'غير نشطة',
    },
    pendingUpdate: 'تعديل بانتظار المراجعة',
    deletionRequest: 'طلب حذف / إلغاء نشر',
    acceptUpdate: 'قبول التعديلات',
    acceptDeletion: 'قبول الحذف',
  },
  en: {
    adminFallback: 'THE SFM Admin',
    signIn: 'Sign in',
    signOut: 'Sign out',
    title: 'Company Requests Review',
    subtitle: 'Review and manage company listing requests in the directory',
    addCompany: 'Add Company',
    addCompanyTitle: 'Add company from admin',
    addCompanySubtitle: 'Create an approved listing directly while keeping the paid user submission flow unchanged.',
    requiredFields: 'Required fields',
    contactFields: 'Contact details',
    mediaFields: 'Logo and links',
    detailsFields: 'Additional details',
    companyName: 'Company name',
    shortDescription: 'Short description',
    longDescription: 'Detailed description',
    fullAddress: 'Full address',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    logoUrl: 'Logo URL',
    coverImageUrl: 'Cover image URL',
    linkedinUrl: 'LinkedIn',
    twitterUrl: 'X / Twitter',
    instagramUrl: 'Instagram',
    foundedYear: 'Founded year',
    licenseNumber: 'License number',
    regulatorName: 'Regulator',
    services: 'Services',
    featured: 'Featured company',
    saveCompany: 'Save company',
    savingCompany: 'Saving...',
    createSuccess: 'Company added successfully without payment.',
    createValidationError: 'Enter the company name and category, and check links/contact fields.',
    imageResolveError: 'Could not verify the logo or cover image link.',
    createForbidden: 'You are not authorized to add companies from admin.',
    createServiceError: 'Could not save the company right now.',
    close: 'Close',
    optionalPlaceholder: 'Optional',
    empty: 'No companies in this category',
    company: 'Company',
    category: 'Category',
    location: 'Location',
    submittedAt: 'Submitted',
    status: 'Status',
    review: 'Review',
    country: 'Country',
    city: 'City',
    email: 'Email',
    website: 'Website',
    reviewedBy: 'Reviewed by',
    reviewedAt: 'Reviewed at',
    notesLabel: 'Admin notes',
    notesHint: 'Required for rejection or change requests',
    notesPlaceholder: 'Add a note for the reviewer or company owner...',
    noteRequired: 'Please add a note when rejecting or requesting changes.',
    serverError: 'Server error',
    unknownError: 'Something went wrong',
    updated: 'Status updated to:',
    approve: 'Approve',
    requestChanges: 'Request changes',
    reject: 'Reject',
    dash: 'Not set',
    statuses: {
      pending_review: 'Pending review',
      needs_changes: 'Needs changes',
      approved: 'Approved',
      rejected: 'Rejected',
      inactive: 'Inactive',
    },
    pendingUpdate: 'Pending update',
    deletionRequest: 'Deletion request',
    acceptUpdate: 'Approve update',
    acceptDeletion: 'Approve deletion',
  },
  fr: {
    adminFallback: 'Admin THE SFM',
    signIn: 'Connexion',
    signOut: 'Déconnexion',
    title: 'Révision des demandes de sociétés',
    subtitle: 'Réviser et gérer les demandes d’ajout de sociétés dans l’annuaire',
    addCompany: 'Ajouter une société',
    addCompanyTitle: 'Ajouter une société depuis l’admin',
    addCompanySubtitle: 'Créer une fiche approuvée directement sans modifier le parcours payant des utilisateurs.',
    requiredFields: 'Champs requis',
    contactFields: 'Coordonnées',
    mediaFields: 'Logo et liens',
    detailsFields: 'Détails supplémentaires',
    companyName: 'Nom de la société',
    shortDescription: 'Description courte',
    longDescription: 'Description détaillée',
    fullAddress: 'Adresse complète',
    phone: 'Téléphone',
    whatsapp: 'WhatsApp',
    logoUrl: 'URL du logo',
    coverImageUrl: 'URL de l’image de couverture',
    linkedinUrl: 'LinkedIn',
    twitterUrl: 'X / Twitter',
    instagramUrl: 'Instagram',
    foundedYear: 'Année de création',
    licenseNumber: 'Numéro de licence',
    regulatorName: 'Régulateur',
    services: 'Services',
    featured: 'Société mise en avant',
    saveCompany: 'Enregistrer',
    savingCompany: 'Enregistrement...',
    createSuccess: 'Société ajoutée avec succès sans paiement.',
    createValidationError: 'Indiquez le nom, la catégorie et vérifiez les liens/coordonnées.',
    imageResolveError: 'Impossible de vérifier le logo ou l’image de couverture.',
    createForbidden: 'Vous n’êtes pas autorisé à ajouter des sociétés depuis l’admin.',
    createServiceError: 'Impossible d’enregistrer la société pour le moment.',
    close: 'Fermer',
    optionalPlaceholder: 'Facultatif',
    empty: 'Aucune société dans cette catégorie',
    company: 'Société',
    category: 'Catégorie',
    location: 'Emplacement',
    submittedAt: 'Soumise le',
    status: 'Statut',
    review: 'Réviser',
    country: 'Pays',
    city: 'Ville',
    email: 'E-mail',
    website: 'Site web',
    reviewedBy: 'Révisé par',
    reviewedAt: 'Révisé le',
    notesLabel: 'Notes admin',
    notesHint: 'Requises pour refuser ou demander des modifications',
    notesPlaceholder: 'Ajoutez une note pour le réviseur ou le propriétaire...',
    noteRequired: 'Ajoutez une note pour refuser ou demander des modifications.',
    serverError: 'Erreur serveur',
    unknownError: 'Une erreur est survenue',
    updated: 'Statut mis à jour :',
    approve: 'Approuver',
    requestChanges: 'Demander modifications',
    reject: 'Refuser',
    dash: 'Non défini',
    statuses: {
      pending_review: 'En révision',
      needs_changes: 'Modifications requises',
      approved: 'Approuvée',
      rejected: 'Refusée',
      inactive: 'Inactive',
    },
    pendingUpdate: 'Modification en attente',
    deletionRequest: 'Demande de suppression',
    acceptUpdate: 'Approuver la modification',
    acceptDeletion: 'Approuver la suppression',
  },
} satisfies Record<Lang, Record<string, unknown> & { statuses: Record<CompanyStatus, string> }>;

function formatDate(iso: string | null, lang: Lang) {
  if (!iso) return COPY[lang].dash as string;
  const locale = lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

function CompanyAdminLogo({ company }: { company: Company }) {
  const [failed, setFailed] = useState(false);
  if (company.logo_url && !failed) {
    return (
      <Image
        src={company.logo_url}
        alt={company.company_name ? `${company.company_name} logo` : 'Company logo'}
        className="ca-logo"
        width={36}
        height={36}
        unoptimized
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }
  return <div className="ca-logo-placeholder">{company.company_name?.[0] ?? '?'}</div>;
}

export default function CompanyAdminClient({ companies: initial, adminEmail }: Props) {
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const { lang, dir } = useLanguage();
  const text = COPY[lang] ?? COPY.ar;
  const [companies, setCompanies] = useState<Company[]>(initial);
  const [activeTab, setActiveTab] = useState<Tab>('pending_review');
  const [selected, setSelected] = useState<Company | null>(null);
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AdminCompanyForm>(() => createEmptyAdminCompanyForm());
  const [addSaving, setAddSaving] = useState(false);
  const [addFeedback, setAddFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const tabCounts = useMemo(() => {
    const map: Partial<Record<Tab, number>> = {};
    for (const company of companies) {
      map[company.status] = (map[company.status] ?? 0) + 1;
    }
    return map;
  }, [companies]);

  const filtered = companies.filter(company => company.status === activeTab);
  const categoryLabels = CATEGORY_LABELS[lang] ?? CATEGORY_LABELS.ar;

  async function handleSignOut() {
    await signOut();
    router.replace('/login?next=/sfm-admin-control/companies');
  }

  function openPanel(company: Company) {
    setSelected(company);
    setNote(company.admin_notes ?? '');
    setFeedback(null);
  }

  function closePanel() {
    setSelected(null);
    setNote('');
    setFeedback(null);
  }

  function openAddCompany() {
    setAddForm(createEmptyAdminCompanyForm());
    setAddFeedback(null);
    setAddOpen(true);
  }

  function closeAddCompany() {
    if (addSaving) return;
    setAddOpen(false);
    setAddFeedback(null);
  }

  function updateAddForm<Field extends keyof AdminCompanyForm>(field: Field, value: AdminCompanyForm[Field]) {
    setAddForm(previous => ({ ...previous, [field]: value }));
  }

  function adminCreateErrorMessage(code: unknown) {
    if (code === 'FORBIDDEN') return text.createForbidden as string;
    if (code === 'IMAGE_URL_NOT_RESOLVED') return text.imageResolveError as string;
    if (code === 'VALIDATION_ERROR' || code === 'BAD_REQUEST') return text.createValidationError as string;
    return text.createServiceError as string;
  }

  async function submitAdminCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddSaving(true);
    setAddFeedback(null);
    try {
      const response = await fetch('/api/company-listings/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const payload = await response.json() as { ok?: boolean; item?: Company; code?: string };
      if (!response.ok || !payload.ok || !payload.item) {
        throw new Error(adminCreateErrorMessage(payload.code));
      }
      setCompanies(previous => [payload.item as Company, ...previous]);
      setActiveTab(payload.item.status);
      setAddFeedback({ type: 'ok', msg: text.createSuccess as string });
      setAddForm(createEmptyAdminCompanyForm());
      setTimeout(() => {
        setAddOpen(false);
        setAddFeedback(null);
      }, 900);
    } catch (error) {
      setAddFeedback({ type: 'err', msg: error instanceof Error ? error.message : text.createServiceError as string });
    } finally {
      setAddSaving(false);
    }
  }

  async function submitAction(newStatus: CompanyStatus) {
    if (!selected) return;
    if ((newStatus === 'rejected' || newStatus === 'needs_changes') && !note.trim()) {
      setFeedback({ type: 'err', msg: text.noteRequired as string });
      return;
    }
    const visibleReviewNote = newStatus === 'rejected' || newStatus === 'needs_changes'
      ? note.trim() || null
      : null;

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/companies/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: selected.id,
            status: newStatus,
            adminNotes: visibleReviewNote,
            adminEmail,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? text.serverError);
        setCompanies(previous =>
          previous.map(company =>
            company.id === selected.id
              ? {
                  ...company,
                  status: newStatus,
                  admin_notes: visibleReviewNote,
                  reviewed_by: adminEmail,
                  reviewed_at: new Date().toISOString(),
                  update_status: 'none',
                  deletion_requested: newStatus === 'approved' || newStatus === 'inactive' ? false : company.deletion_requested,
                  deletion_requested_at: newStatus === 'approved' || newStatus === 'inactive' ? null : company.deletion_requested_at,
                }
              : company,
          ),
        );
        setFeedback({ type: 'ok', msg: `${text.updated} ${text.statuses[newStatus]}` });
        setTimeout(closePanel, 1200);
      } catch (error: unknown) {
        setFeedback({ type: 'err', msg: error instanceof Error ? error.message : text.unknownError as string });
      }
    });
  }

  return (
    <AdminDashboardShell
      ariaLabel={text.title as string}
      contentClassName="company-admin-dashboard-content"
      contentStyle={{ maxWidth: 'none', width: '100%' }}
    >
      <style>{`
        .company-admin-dashboard-content{width:100%!important;max-width:none!important;min-width:0!important}
        .ca-page{width:100%;max-width:min(1500px,100%);margin-inline:auto;background:transparent;padding:0;direction:${dir};font-family:inherit;color:var(--sfm-foreground);min-width:0}
        .ca-topbar{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.35rem;flex-wrap:wrap}
        .ca-admin-chip{min-height:42px;border-radius:999px;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.12);color:var(--sfm-foreground);padding:0 .95rem;display:inline-flex;align-items:center;gap:.45rem;font-size:.82rem;font-weight:900}
        .ca-toolbar{display:flex;align-items:center;gap:.65rem;flex-wrap:wrap}
        .ca-toolbar .sfm-language-trigger{background:#fff;color:#061b33;border-color:rgba(29,140,255,.28);box-shadow:0 10px 26px rgba(3,18,37,.12)}
        .ca-toolbar .sfm-language-trigger:hover,.ca-toolbar .sfm-language-trigger:focus-visible{border-color:rgba(47,214,192,.60);color:#075985;box-shadow:0 0 0 4px rgba(47,214,192,.14),0 12px 28px rgba(3,18,37,.14)}
        .ca-auth-action{min-height:44px;border:1px solid rgba(47,214,192,.22);border-radius:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;padding:0 .95rem;display:inline-flex;align-items:center;justify-content:center;gap:.45rem;font:900 .84rem Tajawal,Arial,sans-serif;text-decoration:none;cursor:pointer;box-shadow:0 12px 28px rgba(29,140,255,.18);transition:transform .18s ease,box-shadow .18s ease}
        .ca-auth-action:hover,.ca-auth-action:focus-visible{transform:translateY(-1px);outline:none;box-shadow:0 14px 34px rgba(29,140,255,.26)}
        .ca-auth-action.secondary{background:#405766;color:#fff;border-color:rgba(47,214,192,.24);box-shadow:0 12px 24px rgba(15,29,49,.12)}
        .dark .ca-auth-action.secondary,.dark .ca-admin-chip{background:#0f1d31;border-color:#1d3050;color:#e8eef6}
        .dark .ca-toolbar .sfm-language-trigger{background:#0f1d31;border-color:#1d3050;color:#e8eef6;box-shadow:0 10px 24px rgba(0,0,0,.18)}
        .ca-header{margin-bottom:1.4rem;display:flex;align-items:flex-end;justify-content:space-between;gap:1rem;border:1px solid rgba(29,140,255,.12);background:var(--sfm-card-bg,var(--sfm-card));border-radius:22px;padding:1.25rem 1.35rem;box-shadow:0 14px 34px rgba(3,18,37,.06);min-width:0}
        .ca-header-copy{min-width:0;max-width:820px}
        .ca-header h1{font-size:clamp(1.7rem,2.2vw,2.35rem);font-weight:950;color:var(--sfm-foreground);margin:0 0 .35rem;line-height:1.15}
        .ca-header p{color:#64748b;font-size:.9rem;margin:0}.dark .ca-header p{color:#94a3b8}
        .ca-primary-add{min-height:46px;border:0;border-radius:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;padding:0 1.1rem;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;font:900 .9rem Tajawal,Arial,sans-serif;cursor:pointer;box-shadow:0 16px 34px rgba(29,140,255,.22);white-space:nowrap;transition:transform .18s ease,box-shadow .18s ease}
        .ca-primary-add:hover,.ca-primary-add:focus-visible{transform:translateY(-1px);outline:none;box-shadow:0 18px 40px rgba(29,140,255,.30)}
        .ca-tabs{display:flex;gap:.55rem;margin-bottom:1.2rem;overflow-x:auto;scrollbar-width:thin;padding:.15rem .1rem .55rem;min-width:0}
        .ca-tab{flex:0 0 auto;min-height:42px;padding:.45rem 1rem;border-radius:999px;border:1.5px solid transparent;font-size:.85rem;font-weight:850;cursor:pointer;transition:all .15s;background:var(--sfm-card);color:var(--sfm-foreground);white-space:nowrap}
        .ca-tab:hover{border-color:var(--sfm-primary)}.ca-tab.active{background:var(--sfm-primary);color:#fff;border-color:var(--sfm-primary)}
        .ca-badge{display:inline-flex;align-items:center;justify-content:center;min-width:1.2rem;height:1.2rem;border-radius:999px;font-size:.72rem;font-weight:800;padding:0 .35rem;background:rgba(255,255,255,.25);margin-inline-start:.35rem}
        .ca-tab:not(.active) .ca-badge{background:var(--sfm-primary);color:#fff}
        .ca-card{background:var(--sfm-card);border:1px solid rgba(29,140,255,.12);border-radius:18px;overflow:auto;box-shadow:0 12px 30px rgba(3,18,37,.06);max-width:100%;min-width:0}.dark .ca-card{box-shadow:0 4px 18px rgba(0,0,0,.22);border-color:rgba(255,255,255,.08)}
        .ca-table{width:100%;border-collapse:collapse;font-size:.87rem;min-width:760px}.ca-table th{position:sticky;top:0;z-index:1;padding:.75rem 1rem;text-align:start;background:rgba(11,118,224,.06);color:#64748b;font-weight:800;font-size:.78rem;border-bottom:1px solid rgba(0,0,0,.06)}
        .dark .ca-table th{background:rgba(11,118,224,.08);color:#94a3b8;border-bottom-color:rgba(255,255,255,.06)}
        .ca-table td{padding:.75rem 1rem;border-bottom:1px solid rgba(0,0,0,.05);color:var(--sfm-foreground);vertical-align:middle}.dark .ca-table td{border-bottom-color:rgba(255,255,255,.05)}
        .ca-table tr:last-child td{border-bottom:none}.ca-table tr:hover td{background:rgba(11,118,224,.04)}.dark .ca-table tr:hover td{background:rgba(11,118,224,.08)}
        .ca-logo{width:36px;height:36px;border-radius:8px;object-fit:cover;background:#e2e8f0}.dark .ca-logo{background:#1e3a5f}
        .ca-logo-placeholder{width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#0b76e0,#18d4d4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.95rem;font-weight:800}
        .ca-status-badge{display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .7rem;border-radius:999px;font-size:.78rem;font-weight:800}
        .ca-request-badge{display:inline-flex;align-items:center;gap:.35rem;margin-top:.35rem;padding:.25rem .6rem;border-radius:999px;background:rgba(245,158,11,.14);color:#b45309;font-size:.72rem;font-weight:900}
        .ca-review-btn{min-height:36px;padding:.35rem .9rem;border-radius:8px;border:1.5px solid var(--sfm-primary);color:var(--sfm-primary);background:transparent;font-size:.82rem;font-weight:800;cursor:pointer;transition:all .15s}.ca-review-btn:hover{background:var(--sfm-primary);color:#fff}
        .ca-empty{text-align:center;padding:3rem 1rem;color:#64748b;font-size:.95rem;font-weight:800}.dark .ca-empty{color:#94a3b8}
        .ca-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem}
        .ca-panel{background:var(--sfm-card);border-radius:18px;width:100%;max-width:580px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);direction:${dir}}
        .ca-panel-header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;border-bottom:1px solid rgba(0,0,0,.07)}.dark .ca-panel-header{border-bottom-color:rgba(255,255,255,.07)}
        .ca-panel-header h2{margin:0;font-size:1.1rem;font-weight:800;color:var(--sfm-foreground)}.ca-close{background:none;border:0;font-size:1.4rem;color:#64748b;cursor:pointer;line-height:1;padding:0}.ca-close:hover{color:var(--sfm-foreground)}
        .ca-panel-body{padding:1.5rem;display:flex;flex-direction:column;gap:1rem}.ca-info-row{display:flex;gap:.5rem;font-size:.87rem;color:var(--sfm-foreground);overflow-wrap:anywhere}.ca-info-row strong{color:#64748b;min-width:92px}.dark .ca-info-row strong{color:#94a3b8}
        .ca-desc{font-size:.85rem;color:#64748b;line-height:1.6;background:rgba(11,118,224,.04);padding:.75rem 1rem;border-radius:10px}.dark .ca-desc{color:#94a3b8;background:rgba(11,118,224,.08)}
        .ca-note-label{font-size:.85rem;font-weight:800;color:var(--sfm-foreground);margin-bottom:.4rem}.ca-note-textarea{width:100%;border-radius:10px;border:1.5px solid rgba(0,0,0,.12);padding:.75rem 1rem;font-size:.87rem;font-family:inherit;resize:vertical;min-height:80px;background:var(--sfm-input-bg,#f8fbff);color:var(--sfm-foreground);box-sizing:border-box}.dark .ca-note-textarea{border-color:rgba(255,255,255,.12)}.ca-note-textarea:focus{outline:none;border-color:var(--sfm-primary)}
        .ca-actions{display:flex;gap:.75rem;flex-wrap:wrap}.ca-action-btn{flex:1;min-width:100px;padding:.6rem 1rem;border-radius:10px;border:0;font-size:.87rem;font-weight:900;cursor:pointer;transition:all .15s}.ca-action-btn:disabled{opacity:.5;cursor:not-allowed}
        .ca-btn-approve{background:#10b981;color:#fff}.ca-btn-changes{background:#3b82f6;color:#fff}.ca-btn-reject{background:#ef4444;color:#fff}
        .ca-feedback{padding:.65rem 1rem;border-radius:10px;font-size:.85rem;font-weight:800}.ca-feedback.ok{background:#d1fae5;color:#065f46}.ca-feedback.err{background:#fee2e2;color:#991b1b}.dark .ca-feedback.ok{background:rgba(16,185,129,.15);color:#6ee7b7}.dark .ca-feedback.err{background:rgba(239,68,68,.15);color:#fca5a5}
        .ca-add-panel{max-width:880px}
        .ca-add-intro{display:flex;align-items:flex-start;gap:.85rem;border:1px solid rgba(29,140,255,.14);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.08));border-radius:16px;padding:1rem;margin-bottom:.25rem}
        .ca-add-intro svg{color:var(--sfm-primary);flex:0 0 auto;margin-top:.1rem}
        .ca-add-intro h3{margin:0 0 .25rem;font-size:1rem;color:var(--sfm-foreground)}
        .ca-add-intro p{margin:0;color:#64748b;line-height:1.65;font-size:.86rem}.dark .ca-add-intro p{color:#a8b6ca}
        .ca-add-section{border:1px solid rgba(29,140,255,.14);border-radius:16px;padding:1rem;background:rgba(255,255,255,.62)}.dark .ca-add-section{background:rgba(15,29,49,.44);border-color:rgba(148,163,184,.16)}
        .ca-add-section-title{margin:0 0 .85rem;font-size:.88rem;font-weight:950;color:var(--sfm-primary)}
        .ca-add-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem}
        .ca-field{display:grid;gap:.38rem;min-width:0}
        .ca-field.full{grid-column:1/-1}
        .ca-field span{font-size:.78rem;font-weight:900;color:#475569}.dark .ca-field span{color:#cbd5e1}
        .ca-input,.ca-select,.ca-textarea{width:100%;min-width:0;border:1.5px solid rgba(29,140,255,.18);border-radius:12px;background:var(--sfm-input-bg,#f8fbff);color:var(--sfm-foreground);padding:.72rem .8rem;font-family:inherit;font-size:.88rem;font-weight:800;box-sizing:border-box}
        .ca-textarea{resize:vertical;min-height:82px;line-height:1.6}
        .ca-input:focus,.ca-select:focus,.ca-textarea:focus{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}
        .ca-check-row{display:flex;align-items:center;gap:.55rem;min-height:44px;font-size:.86rem;font-weight:900;color:var(--sfm-foreground)}
        .ca-check-row input{width:18px;height:18px;accent-color:var(--sfm-primary)}
        .ca-add-actions{display:flex;gap:.75rem;justify-content:flex-end;flex-wrap:wrap}
        .ca-secondary-btn,.ca-save-btn{min-height:44px;border-radius:12px;padding:0 1rem;font:900 .86rem Tajawal,Arial,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.45rem}
        .ca-secondary-btn{border:1px solid rgba(100,116,139,.22);background:var(--sfm-card);color:var(--sfm-foreground)}
        .ca-save-btn{border:0;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#fff;box-shadow:0 12px 28px rgba(29,140,255,.18)}
        .ca-save-btn:disabled,.ca-secondary-btn:disabled{opacity:.6;cursor:not-allowed}
        @media(max-width:900px){.ca-header{display:grid;align-items:start;padding:1rem}.ca-primary-add{width:100%}.ca-add-grid{grid-template-columns:1fr}}
        @media(max-width:700px){.ca-topbar{align-items:stretch}.ca-toolbar,.ca-admin-chip,.ca-auth-action{width:100%}.ca-toolbar{display:grid;grid-template-columns:1fr 44px}.ca-auth-action{grid-column:1/-1}.ca-table{min-width:620px}.ca-add-actions{display:grid;grid-template-columns:1fr}.ca-save-btn,.ca-secondary-btn{width:100%}}
      `}</style>

      <div className="ca-page">
        <div className="ca-topbar">
          <div className="ca-admin-chip">{adminEmail || user?.email || text.adminFallback as string}</div>
          <div className="ca-toolbar">
            <LanguageSwitcher variant="light" compact />
            <ThemeToggle />
            {user ? (
              <button type="button" className="ca-auth-action secondary" onClick={() => void handleSignOut()} disabled={authLoading}>
                <LogOut size={16} />
                {text.signOut as string}
              </button>
            ) : (
              <Link className="ca-auth-action" href="/login?next=/sfm-admin-control/companies">
                <LogIn size={16} />
                {text.signIn as string}
              </Link>
            )}
          </div>
        </div>

        <div className="ca-header">
          <div className="ca-header-copy">
            <h1>{text.title as string}</h1>
            <p>{text.subtitle as string}</p>
          </div>
          <button type="button" className="ca-primary-add" onClick={openAddCompany}>
            <Plus size={18} />
            {text.addCompany as string}
          </button>
        </div>

        <div className="ca-tabs">
          {TABS.map(tab => (
            <button key={tab} className={`ca-tab${activeTab === tab ? ' active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tabCounts[tab] ? <span className="ca-badge">{tabCounts[tab]}</span> : null}
              {text.statuses[tab]}
            </button>
          ))}
        </div>

        <div className="ca-card">
          {filtered.length === 0 ? (
            <div className="ca-empty">{text.empty as string}</div>
          ) : (
            <table className="ca-table">
              <thead>
                <tr>
                  <th>{text.company as string}</th>
                  <th>{text.category as string}</th>
                  <th>{text.location as string}</th>
                  <th>{text.submittedAt as string}</th>
                  <th>{text.status as string}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map(company => (
                  <tr key={company.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                        <CompanyAdminLogo company={company} />
                        <div>
                          <div style={{ fontWeight: 800 }}>{company.company_name}</div>
                          {company.update_status === 'pending_update' && <div className="ca-request-badge">{text.pendingUpdate as string}</div>}
                          {company.deletion_requested && <div className="ca-request-badge">{text.deletionRequest as string}</div>}
                          {company.email && <div style={{ fontSize: '.75rem', color: '#94A3B8' }}>{company.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{company.category ?? text.dash as string}</td>
                    <td>{[company.city, company.country].filter(Boolean).join(lang === 'ar' ? '، ' : ', ') || text.dash as string}</td>
                    <td style={{ fontSize: '.8rem', color: '#94A3B8' }}>{formatDate(company.created_at ?? null, lang)}</td>
                    <td>
                      <span className="ca-status-badge" style={{ background: `${STATUS_COLORS[company.status]}18`, color: STATUS_COLORS[company.status] }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[company.status], display: 'inline-block' }} />
                        {text.statuses[company.status]}
                      </span>
                    </td>
                    <td>
                      <button className="ca-review-btn" onClick={() => openPanel(company)}>
                        {text.review as string}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {addOpen && (
        <div className="ca-overlay" onClick={event => { if (event.target === event.currentTarget) closeAddCompany(); }}>
          <div className="ca-panel ca-add-panel" role="dialog" aria-modal="true" aria-labelledby="admin-add-company-title">
            <div className="ca-panel-header">
              <h2 id="admin-add-company-title">{text.addCompanyTitle as string}</h2>
              <button className="ca-close" onClick={closeAddCompany} aria-label={text.close as string} disabled={addSaving}>
                <X size={20} />
              </button>
            </div>
            <form className="ca-panel-body" onSubmit={submitAdminCompany}>
              <div className="ca-add-intro">
                <CheckCircle2 size={22} />
                <div>
                  <h3>{text.addCompany as string}</h3>
                  <p>{text.addCompanySubtitle as string}</p>
                </div>
              </div>

              <section className="ca-add-section">
                <h3 className="ca-add-section-title">{text.requiredFields as string}</h3>
                <div className="ca-add-grid">
                  <label className="ca-field">
                    <span>{text.companyName as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.companyName}
                      onChange={event => updateAddForm('companyName', event.target.value)}
                      required
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.category as string}</span>
                    <select
                      className="ca-select"
                      value={addForm.category}
                      onChange={event => updateAddForm('category', event.target.value as CompanyCategory)}
                    >
                      {COMPANY_CATEGORIES.map(category => (
                        <option key={category} value={category}>{categoryLabels[category]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="ca-field">
                    <span>{text.status as string}</span>
                    <select
                      className="ca-select"
                      value={addForm.status}
                      onChange={event => updateAddForm('status', event.target.value as CompanyStatus)}
                    >
                      {TABS.map(status => (
                        <option key={status} value={status}>{text.statuses[status]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="ca-field">
                    <span>{text.country as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.country}
                      onChange={event => updateAddForm('country', event.target.value)}
                      placeholder={text.optionalPlaceholder as string}
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.city as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.city}
                      onChange={event => updateAddForm('city', event.target.value)}
                      placeholder={text.optionalPlaceholder as string}
                    />
                  </label>
                  <label className="ca-field full">
                    <span>{text.shortDescription as string}</span>
                    <textarea
                      className="ca-textarea"
                      value={addForm.shortDescription}
                      onChange={event => updateAddForm('shortDescription', event.target.value)}
                      rows={2}
                      placeholder={text.optionalPlaceholder as string}
                    />
                  </label>
                </div>
              </section>

              <section className="ca-add-section">
                <h3 className="ca-add-section-title">{text.contactFields as string}</h3>
                <div className="ca-add-grid">
                  <label className="ca-field">
                    <span>{text.website as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.websiteUrl}
                      onChange={event => updateAddForm('websiteUrl', event.target.value)}
                      placeholder="https://example.com"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.email as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.email}
                      onChange={event => updateAddForm('email', event.target.value)}
                      placeholder="name@example.com"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.phone as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.phone}
                      onChange={event => updateAddForm('phone', event.target.value)}
                      placeholder="+965 00000000"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.whatsapp as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.whatsapp}
                      onChange={event => updateAddForm('whatsapp', event.target.value)}
                      placeholder="+965 00000000"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-field full">
                    <span>{text.fullAddress as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.fullAddress}
                      onChange={event => updateAddForm('fullAddress', event.target.value)}
                      placeholder={text.optionalPlaceholder as string}
                    />
                  </label>
                </div>
              </section>

              <section className="ca-add-section">
                <h3 className="ca-add-section-title">{text.mediaFields as string}</h3>
                <div className="ca-add-grid">
                  <label className="ca-field">
                    <span>{text.logoUrl as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.logoUrl}
                      onChange={event => updateAddForm('logoUrl', event.target.value)}
                      placeholder="https://example.com/logo.png"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.coverImageUrl as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.coverImageUrl}
                      onChange={event => updateAddForm('coverImageUrl', event.target.value)}
                      placeholder="https://example.com/cover.jpg"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.linkedinUrl as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.linkedinUrl}
                      onChange={event => updateAddForm('linkedinUrl', event.target.value)}
                      placeholder="company-name"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.twitterUrl as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.twitterUrl}
                      onChange={event => updateAddForm('twitterUrl', event.target.value)}
                      placeholder="@company"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.instagramUrl as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.instagramUrl}
                      onChange={event => updateAddForm('instagramUrl', event.target.value)}
                      placeholder="@company"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-check-row">
                    <input
                      type="checkbox"
                      checked={addForm.isFeatured}
                      onChange={event => updateAddForm('isFeatured', event.target.checked)}
                    />
                    {text.featured as string}
                  </label>
                </div>
              </section>

              <section className="ca-add-section">
                <h3 className="ca-add-section-title">{text.detailsFields as string}</h3>
                <div className="ca-add-grid">
                  <label className="ca-field">
                    <span>{text.foundedYear as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.foundedYear}
                      onChange={event => updateAddForm('foundedYear', event.target.value)}
                      inputMode="numeric"
                      dir="ltr"
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.licenseNumber as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.licenseNumber}
                      onChange={event => updateAddForm('licenseNumber', event.target.value)}
                    />
                  </label>
                  <label className="ca-field">
                    <span>{text.regulatorName as string}</span>
                    <input
                      className="ca-input"
                      value={addForm.regulatorName}
                      onChange={event => updateAddForm('regulatorName', event.target.value)}
                    />
                  </label>
                  <label className="ca-field full">
                    <span>{text.services as string}</span>
                    <textarea
                      className="ca-textarea"
                      value={addForm.services}
                      onChange={event => updateAddForm('services', event.target.value)}
                      rows={3}
                      placeholder={text.optionalPlaceholder as string}
                    />
                  </label>
                  <label className="ca-field full">
                    <span>{text.longDescription as string}</span>
                    <textarea
                      className="ca-textarea"
                      value={addForm.longDescription}
                      onChange={event => updateAddForm('longDescription', event.target.value)}
                      rows={4}
                      placeholder={text.optionalPlaceholder as string}
                    />
                  </label>
                  <label className="ca-field full">
                    <span>{text.notesLabel as string}</span>
                    <textarea
                      className="ca-textarea"
                      value={addForm.adminNotes}
                      onChange={event => updateAddForm('adminNotes', event.target.value)}
                      rows={2}
                      placeholder={text.optionalPlaceholder as string}
                    />
                  </label>
                </div>
              </section>

              {addFeedback && <div className={`ca-feedback ${addFeedback.type}`}>{addFeedback.msg}</div>}

              <div className="ca-add-actions">
                <button type="button" className="ca-secondary-btn" onClick={closeAddCompany} disabled={addSaving}>
                  {text.close as string}
                </button>
                <button type="submit" className="ca-save-btn" disabled={addSaving}>
                  <Save size={16} />
                  {addSaving ? text.savingCompany as string : text.saveCompany as string}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="ca-overlay" onClick={event => { if (event.target === event.currentTarget) closePanel(); }}>
          <div className="ca-panel">
            <div className="ca-panel-header">
              <h2>{selected.company_name}</h2>
              <button className="ca-close" onClick={closePanel} aria-label="Close">×</button>
            </div>
            <div className="ca-panel-body">
              <div className="ca-info-row"><strong>{text.category as string}:</strong> {selected.category ?? text.dash as string}</div>
              <div className="ca-info-row"><strong>{text.country as string}:</strong> {selected.country ?? text.dash as string}</div>
              <div className="ca-info-row"><strong>{text.city as string}:</strong> {selected.city ?? text.dash as string}</div>
              {selected.email && <div className="ca-info-row"><strong>{text.email as string}:</strong> {selected.email}</div>}
              {selected.website_url && (
                <div className="ca-info-row">
                  <strong>{text.website as string}:</strong>
                  <a href={selected.website_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sfm-primary)' }}>
                    {selected.website_url}
                  </a>
                </div>
              )}
              {selected.short_description && <div className="ca-desc">{selected.short_description}</div>}
              {selected.update_status === 'pending_update' && <div className="ca-desc">{text.pendingUpdate as string}</div>}
              {selected.deletion_requested && <div className="ca-desc">{text.deletionRequest as string}</div>}
              <div className="ca-info-row">
                <strong>{text.status as string}:</strong>
                <span className="ca-status-badge" style={{ background: `${STATUS_COLORS[selected.status]}18`, color: STATUS_COLORS[selected.status] }}>
                  {text.statuses[selected.status]}
                </span>
              </div>
              {selected.reviewed_by && <div className="ca-info-row"><strong>{text.reviewedBy as string}:</strong> {selected.reviewed_by}</div>}
              {selected.reviewed_at && <div className="ca-info-row"><strong>{text.reviewedAt as string}:</strong> {formatDate(selected.reviewed_at, lang)}</div>}

              <div>
                <div className="ca-note-label">
                  {text.notesLabel as string} <span style={{ color: '#EF4444' }}>*</span> ({text.notesHint as string})
                </div>
                <textarea
                  className="ca-note-textarea"
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder={text.notesPlaceholder as string}
                  rows={3}
                />
              </div>

              {feedback && <div className={`ca-feedback ${feedback.type}`}>{feedback.msg}</div>}

              <div className="ca-actions">
                {selected.update_status === 'pending_update' ? (
                  <button className="ca-action-btn ca-btn-approve" disabled={isPending} onClick={() => submitAction('approved')}>
                    {text.acceptUpdate as string}
                  </button>
                ) : null}
                {selected.deletion_requested ? (
                  <button className="ca-action-btn ca-btn-reject" disabled={isPending} onClick={() => submitAction('inactive')}>
                    {text.acceptDeletion as string}
                  </button>
                ) : null}
                <button className="ca-action-btn ca-btn-approve" disabled={isPending} onClick={() => submitAction('approved')}>
                  {text.approve as string}
                </button>
                <button className="ca-action-btn ca-btn-changes" disabled={isPending} onClick={() => submitAction('needs_changes')}>
                  {text.requestChanges as string}
                </button>
                <button className="ca-action-btn ca-btn-reject" disabled={isPending} onClick={() => submitAction('rejected')}>
                  {text.reject as string}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminDashboardShell>
  );
}
