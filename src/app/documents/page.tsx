'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileCheck2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  HeartHandshake,
  Loader2,
  Paperclip,
  Presentation,
  ReceiptText,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserChip } from '@/components/UserChip';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { PageHero } from '@/components/layout/PageHero';
import { AppCard } from '@/components/layout/AppCard';
import { EmptyState } from '@/components/layout/EmptyState';
import { CardsGrid, StatGrid } from '@/components/layout/LayoutPrimitives';
import { PageTabs } from '@/components/layout/PageTabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useUnifiedDocuments } from '@/hooks/useUnifiedDocuments';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedDocument, UnifiedDocumentSourceModule } from '@/lib/documents/unifiedDocuments';

type Lang = 'ar' | 'en' | 'fr';
type FilterId = 'all' | UnifiedDocumentSourceModule;

const signedUrlExpirySeconds = 600;

const TEXT = {
  ar: {
    title: 'مركز المستندات',
    subtitle: 'كل مستنداتك المالية، التجارية، الخيرية، والتقارير في مكان واحد.',
    eyebrow: 'تنظيم آمن للمستندات',
    totalDocuments: 'إجمالي المستندات',
    projectDocuments: 'مستندات المشاريع',
    charityDocuments: 'مستندات الأعمال الخيرية',
    savedReports: 'التقارير المحفوظة',
    expenseAttachments: 'مرفقات المصروفات',
    uploadDocument: 'رفع مستند',
    uploadProject: 'رفع لمشروع',
    uploadCharity: 'رفع لمشروع خيري',
    uploadGeneral: 'رفع كمستند عام',
    generalComingSoon: 'تخزين المستندات العامة قريباً. استخدم صفحة المشروع أو المشروع الخيري حالياً.',
    searchDocuments: 'بحث في المستندات',
    searchInsideSoon: 'البحث داخل الملفات قريباً.',
    noDocuments: 'لا توجد مستندات محفوظة حتى الآن.',
    noDocumentsBody: 'ستظهر هنا مستندات المشاريع، الإيصالات، التقارير، والعروض الاستثمارية بعد حفظها في صفحاتها الأصلية.',
    loading: 'جاري تحميل المستندات...',
    loadError: 'تعذر تحميل بعض مصادر المستندات حالياً.',
    all: 'الكل',
    projects: 'المشاريع',
    charity: 'الأعمال الخيرية',
    income: 'الدخل',
    expenses: 'المصروفات',
    reports: 'التقارير',
    pitch_deck: 'العروض الاستثمارية',
    business: 'الأعمال',
    other: 'أخرى',
    report: 'تقرير',
    receipt: 'إيصال',
    invoice: 'فاتورة',
    contract: 'عقد',
    license: 'ترخيص',
    business_plan: 'خطة عمل',
    donation_receipt: 'إيصال تبرع',
    charity_certificate: 'شهادة جمعية',
    project_report: 'تقرير مشروع',
    zakat_document: 'زكاة',
    beneficiary_report: 'تقرير مستفيد',
    view: 'عرض',
    download: 'تحميل',
    openSource: 'فتح المصدر',
    delete: 'حذف',
    deleteFromSource: 'احذف المرفق من الصفحة الأصلية.',
    confirmDelete: 'هل تريد حذف هذا المستند؟',
    deleted: 'تم حذف المستند بنجاح.',
    deleteFailed: 'تعذر حذف المستند حالياً.',
    deleteStorageWarning: 'تم حذف السجل، لكن تعذر حذف الملف من التخزين حالياً.',
    openFailed: 'تعذر فتح المستند حالياً.',
    source: 'المصدر',
    category: 'التصنيف',
    related: 'مرتبط بـ',
    fileName: 'اسم الملف',
    fileSize: 'حجم الملف',
    uploadedAt: 'تاريخ الرفع',
    noFile: 'لا يوجد ملف قابل للتحميل لهذا السجل.',
    bytes: 'بايت',
    kb: 'KB',
    mb: 'MB',
  },
  en: {
    title: 'Documents Center',
    subtitle: 'All your financial, business, charity, and report documents in one place.',
    eyebrow: 'Secure document organization',
    totalDocuments: 'Total Documents',
    projectDocuments: 'Project Documents',
    charityDocuments: 'Charity Documents',
    savedReports: 'Saved Reports',
    expenseAttachments: 'Expense Attachments',
    uploadDocument: 'Upload Document',
    uploadProject: 'Upload to Project',
    uploadCharity: 'Upload to Charity Project',
    uploadGeneral: 'Upload as General Document',
    generalComingSoon: 'General document storage is coming soon. Use a project or charity project page for now.',
    searchDocuments: 'Search documents',
    searchInsideSoon: 'Search inside files coming soon.',
    noDocuments: 'No documents saved yet.',
    noDocumentsBody: 'Project documents, receipts, reports, and pitch decks will appear here after you save them in their source pages.',
    loading: 'Loading documents...',
    loadError: 'Could not load some document sources right now.',
    all: 'All',
    projects: 'Projects',
    charity: 'Charity',
    income: 'Income',
    expenses: 'Expenses',
    reports: 'Reports',
    pitch_deck: 'Pitch Decks',
    business: 'Business',
    other: 'Other',
    report: 'Report',
    receipt: 'Receipt',
    invoice: 'Invoice',
    contract: 'Contract',
    license: 'License',
    business_plan: 'Business Plan',
    donation_receipt: 'Donation Receipt',
    charity_certificate: 'Charity Certificate',
    project_report: 'Project Report',
    zakat_document: 'Zakat',
    beneficiary_report: 'Beneficiary Report',
    view: 'View',
    download: 'Download',
    openSource: 'Open Source',
    delete: 'Delete',
    deleteFromSource: 'Delete this attachment from its source page.',
    confirmDelete: 'Do you want to delete this document?',
    deleted: 'Document deleted successfully.',
    deleteFailed: 'Could not delete the document right now.',
    deleteStorageWarning: 'The record was deleted, but the storage file could not be removed right now.',
    openFailed: 'Could not open the document right now.',
    source: 'Source',
    category: 'Category',
    related: 'Related to',
    fileName: 'File name',
    fileSize: 'File size',
    uploadedAt: 'Upload date',
    noFile: 'No downloadable file is attached to this record.',
    bytes: 'bytes',
    kb: 'KB',
    mb: 'MB',
  },
  fr: {
    title: 'Centre des documents',
    subtitle: 'Tous vos documents financiers, commerciaux, caritatifs et rapports au même endroit.',
    eyebrow: 'Organisation sécurisée des documents',
    totalDocuments: 'Total des documents',
    projectDocuments: 'Documents de projet',
    charityDocuments: 'Documents caritatifs',
    savedReports: 'Rapports enregistrés',
    expenseAttachments: 'Pièces jointes de dépenses',
    uploadDocument: 'Téléverser un document',
    uploadProject: 'Téléverser vers un projet',
    uploadCharity: 'Téléverser vers un projet caritatif',
    uploadGeneral: 'Téléverser comme document général',
    generalComingSoon: 'Le stockage général des documents arrive bientôt. Utilisez une page projet ou caritative pour le moment.',
    searchDocuments: 'Rechercher des documents',
    searchInsideSoon: 'Recherche dans les fichiers bientôt disponible.',
    noDocuments: 'Aucun document enregistré pour le moment.',
    noDocumentsBody: 'Les documents de projet, reçus, rapports et pitch decks apparaîtront ici après leur enregistrement dans les pages sources.',
    loading: 'Chargement des documents...',
    loadError: 'Impossible de charger certaines sources de documents pour le moment.',
    all: 'Tout',
    projects: 'Projets',
    charity: 'Charité',
    income: 'Revenus',
    expenses: 'Dépenses',
    reports: 'Rapports',
    pitch_deck: 'Pitch Decks',
    business: 'Affaires',
    other: 'Autre',
    report: 'Rapport',
    receipt: 'Reçu',
    invoice: 'Facture',
    contract: 'Contrat',
    license: 'Licence',
    business_plan: 'Plan d’affaires',
    donation_receipt: 'Reçu de don',
    charity_certificate: 'Certificat d’association',
    project_report: 'Rapport de projet',
    zakat_document: 'Zakat',
    beneficiary_report: 'Rapport de bénéficiaire',
    view: 'Voir',
    download: 'Télécharger',
    openSource: 'Ouvrir la source',
    delete: 'Supprimer',
    deleteFromSource: 'Supprimez cette pièce jointe depuis sa page source.',
    confirmDelete: 'Voulez-vous supprimer ce document ?',
    deleted: 'Document supprimé avec succès.',
    deleteFailed: 'Impossible de supprimer le document pour le moment.',
    deleteStorageWarning: 'L’enregistrement a été supprimé, mais le fichier n’a pas pu être supprimé du stockage.',
    openFailed: 'Impossible d’ouvrir le document pour le moment.',
    source: 'Source',
    category: 'Catégorie',
    related: 'Lié à',
    fileName: 'Nom du fichier',
    fileSize: 'Taille du fichier',
    uploadedAt: 'Date de téléversement',
    noFile: 'Aucun fichier téléchargeable n’est attaché à cet enregistrement.',
    bytes: 'octets',
    kb: 'Ko',
    mb: 'Mo',
  },
} as const;

type DocumentText = Record<keyof typeof TEXT.ar, string>;

function localeFor(lang: Lang) {
  if (lang === 'ar') return 'ar-KW';
  if (lang === 'fr') return 'fr-FR';
  return 'en-US';
}

function dateLabel(value: string | undefined, lang: Lang) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleDateString(localeFor(lang), { year: 'numeric', month: 'short', day: 'numeric' });
}

function fileSizeLabel(value: number | undefined, text: DocumentText, lang: Lang) {
  if (typeof value !== 'number') return '—';
  const formatter = new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: 1 });
  if (value >= 1024 * 1024) return `${formatter.format(value / (1024 * 1024))} ${text.mb}`;
  if (value >= 1024) return `${formatter.format(value / 1024)} ${text.kb}`;
  return `${formatter.format(value)} ${text.bytes}`;
}

function extensionOf(fileName?: string) {
  const parts = String(fileName ?? '').split('.');
  return parts.length > 1 ? String(parts.pop()).toLowerCase() : '';
}

function categoryLabel(category: string | undefined, text: DocumentText) {
  const key = String(category ?? 'other') as keyof typeof TEXT.ar;
  return text[key] ?? text.other;
}

function sourceLabel(source: UnifiedDocumentSourceModule, text: DocumentText) {
  return text[source] ?? text.other;
}

function DocumentIcon({ document }: { document: UnifiedDocument }) {
  const extension = extensionOf(document.fileName);
  if (String(document.fileType ?? '').startsWith('image') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) return <FileImage size={22} />;
  if (['xls', 'xlsx', 'csv'].includes(extension)) return <FileSpreadsheet size={22} />;
  if (['zip', 'rar', '7z'].includes(extension)) return <FileArchive size={22} />;
  if (document.sourceModule === 'pitch_deck') return <Presentation size={22} />;
  return <FileText size={22} />;
}

function SourceIcon({ source }: { source: UnifiedDocumentSourceModule }) {
  if (source === 'projects') return <FolderKanban size={16} />;
  if (source === 'charity') return <HeartHandshake size={16} />;
  if (source === 'income') return <Paperclip size={16} />;
  if (source === 'expenses') return <ReceiptText size={16} />;
  if (source === 'pitch_deck') return <Presentation size={16} />;
  if (source === 'business') return <BriefcaseBusiness size={16} />;
  return <FileText size={16} />;
}

export default function DocumentsCenterPage() {
  const router = useRouter();
  const { lang, dir } = useLanguage();
  const locale = (lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar') as Lang;
  const text = TEXT[locale] as DocumentText;
  const { documents, loading, errors, reload } = useUnifiedDocuments();
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [uploadOptionsOpen, setUploadOptionsOpen] = useState(false);

  const summary = useMemo(() => ({
    total: documents.length,
    projects: documents.filter(item => item.sourceModule === 'projects').length,
    charity: documents.filter(item => item.sourceModule === 'charity').length,
    reports: documents.filter(item => item.sourceModule === 'reports').length,
    expenseAttachments: documents.filter(item => item.sourceModule === 'expenses').length,
  }), [documents]);

  const tabs = useMemo(() => {
    const sources: Array<{ id: FilterId; label: string }> = [
      { id: 'all', label: text.all },
      { id: 'projects', label: text.projects },
      { id: 'charity', label: text.charity },
      { id: 'income', label: text.income },
      { id: 'expenses', label: text.expenses },
      { id: 'reports', label: text.reports },
      { id: 'pitch_deck', label: text.pitch_deck },
      { id: 'business', label: text.business },
    ];
    return sources.map(tab => ({
      ...tab,
      count: tab.id === 'all'
        ? documents.length
        : documents.filter(item => item.sourceModule === tab.id).length,
    }));
  }, [documents, text]);

  const filteredDocuments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return documents.filter(document => {
      const matchesFilter = activeFilter === 'all' || document.sourceModule === activeFilter;
      const haystack = [
        document.title,
        document.fileName,
        document.relatedName,
        document.category,
        categoryLabel(document.category, text),
        sourceLabel(document.sourceModule, text),
        document.notes,
      ].join(' ').toLowerCase();
      return matchesFilter && (!needle || haystack.includes(needle));
    });
  }, [activeFilter, documents, search, text]);

  const openDocument = async (document: UnifiedDocument, download = false) => {
    setNotice('');

    if (document.bucket && document.filePath) {
      const signed = await supabase.storage
        .from(document.bucket)
        .createSignedUrl(document.filePath, signedUrlExpirySeconds, download && document.fileName ? { download: document.fileName } : undefined);

      if (signed.error || !signed.data?.signedUrl) {
        setNotice(text.openFailed);
        return;
      }

      if (download) {
        const link = window.document.createElement('a');
        link.href = signed.data.signedUrl;
        link.download = document.fileName ?? document.title;
        link.rel = 'noopener noreferrer';
        window.document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (document.actionUrl) router.push(document.actionUrl);
    else setNotice(text.noFile);
  };

  const deleteDocument = async (document: UnifiedDocument) => {
    setNotice('');
    if (!document.canDelete || !document.deleteTable) {
      setNotice(text.deleteFromSource);
      return;
    }
    if (!window.confirm(text.confirmDelete)) return;

    const { error } = await (supabase as any)
      .from(document.deleteTable)
      .delete()
      .eq('id', document.recordId);

    if (error) {
      setNotice(text.deleteFailed);
      return;
    }

    if (document.bucket && document.filePath) {
      const storageDelete = await supabase.storage.from(document.bucket).remove([document.filePath]);
      setNotice(storageDelete.error ? text.deleteStorageWarning : text.deleted);
    } else {
      setNotice(text.deleted);
    }
    await reload();
  };

  const hasLoadErrors = Object.keys(errors).length > 0;

  return (
    <div className="documents-center-shell" dir={dir}>
      <Sidebar />
      <DashboardPageShell ariaLabel={text.title} contentClassName="documents-center-content">
        <div className="sfm-page-topbar">
          <LanguageSwitcher />
          <UserChip />
        </div>

        <PageHero
          eyebrow={text.eyebrow}
          title={text.title}
          subtitle={text.subtitle}
          icon={<FileCheck2 size={28} />}
          actions={(
            <div className="documents-upload-wrap">
              <button
                type="button"
                className="documents-primary-action"
                onClick={() => setUploadOptionsOpen(open => !open)}
                aria-expanded={uploadOptionsOpen}
                aria-label={text.uploadDocument}
              >
                <Upload size={17} />
                {text.uploadDocument}
              </button>
              {uploadOptionsOpen ? (
                <div className="documents-upload-options" role="dialog" aria-label={text.uploadDocument}>
                  <Link href="/projects">
                    <FolderKanban size={17} />
                    {text.uploadProject}
                  </Link>
                  <Link href="/charity-projects#document-vault">
                    <HeartHandshake size={17} />
                    {text.uploadCharity}
                  </Link>
                  <button type="button" disabled aria-label={`${text.uploadGeneral}. ${text.generalComingSoon}`}>
                    <FileText size={17} />
                    <span>{text.uploadGeneral}</span>
                    <small>{text.generalComingSoon}</small>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        />

        {notice ? <div className="documents-notice" role="status">{notice}</div> : null}
        {hasLoadErrors ? <div className="documents-notice warning" role="status">{text.loadError}</div> : null}

        <StatGrid>
          <AppCard><DocumentMetric icon={<FileText size={19} />} label={text.totalDocuments} value={summary.total} /></AppCard>
          <AppCard><DocumentMetric icon={<FolderKanban size={19} />} label={text.projectDocuments} value={summary.projects} /></AppCard>
          <AppCard><DocumentMetric icon={<HeartHandshake size={19} />} label={text.charityDocuments} value={summary.charity} /></AppCard>
          <AppCard><DocumentMetric icon={<FileCheck2 size={19} />} label={text.savedReports} value={summary.reports} /></AppCard>
          <AppCard><DocumentMetric icon={<ReceiptText size={19} />} label={text.expenseAttachments} value={summary.expenseAttachments} /></AppCard>
        </StatGrid>

        <AppCard className="documents-tools">
          <label htmlFor="documents-search" className="documents-search-field">
            <Search size={17} aria-hidden="true" />
            <input
              id="documents-search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={text.searchDocuments}
              aria-label={text.searchDocuments}
            />
          </label>
          <p>{text.searchInsideSoon}</p>
        </AppCard>

        <PageTabs
          tabs={tabs}
          active={activeFilter}
          onChange={id => setActiveFilter(id as FilterId)}
          ariaLabel={text.title}
        />

        {loading ? (
          <EmptyState icon={<Loader2 className="spin" size={26} />} title={text.loading} />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={<FileText size={34} />}
            title={text.noDocuments}
            description={text.noDocumentsBody}
            actions={(
              <button type="button" className="documents-secondary-action" onClick={() => setUploadOptionsOpen(true)}>
                {text.uploadDocument}
              </button>
            )}
          />
        ) : (
          <CardsGrid className="documents-card-grid">
            {filteredDocuments.map(document => (
              <AppCard key={document.id} className="document-card">
                <div className="document-card-head">
                  <div className="document-card-icon" aria-hidden="true">
                    <DocumentIcon document={document} />
                  </div>
                  <div>
                    <span className="source-badge"><SourceIcon source={document.sourceModule} /> {sourceLabel(document.sourceModule, text)}</span>
                    <h2>{document.title}</h2>
                  </div>
                </div>

                <dl className="document-meta">
                  <div><dt>{text.category}</dt><dd>{categoryLabel(document.category, text)}</dd></div>
                  {document.relatedName ? <div><dt>{text.related}</dt><dd>{document.relatedName}</dd></div> : null}
                  <div><dt>{text.fileName}</dt><dd>{document.fileName || text.noFile}</dd></div>
                  <div><dt>{text.fileSize}</dt><dd>{fileSizeLabel(document.fileSize, text, locale)}</dd></div>
                  <div><dt>{text.uploadedAt}</dt><dd>{dateLabel(document.uploadedAt, locale)}</dd></div>
                </dl>

                {!document.canDelete && (document.sourceModule === 'income' || document.sourceModule === 'expenses') ? (
                  <p className="source-delete-note">{text.deleteFromSource}</p>
                ) : null}

                <div className="document-actions">
                  <button type="button" onClick={() => openDocument(document)} aria-label={`${text.view} ${document.title}`}>
                    <Eye size={15} />
                    {text.view}
                  </button>
                  <button
                    type="button"
                    onClick={() => openDocument(document, true)}
                    disabled={!document.filePath && !document.fileUrl}
                    aria-label={`${text.download} ${document.title}`}
                  >
                    <Download size={15} />
                    {text.download}
                  </button>
                  <Link href={document.actionUrl ?? '/documents'} aria-label={`${text.openSource} ${document.title}`}>
                    <ExternalLink size={15} />
                    {text.openSource}
                  </Link>
                  {document.canDelete ? (
                    <button type="button" className="danger" onClick={() => deleteDocument(document)} aria-label={`${text.delete} ${document.title}`}>
                      <Trash2 size={15} />
                      {text.delete}
                    </button>
                  ) : null}
                </div>
              </AppCard>
            ))}
          </CardsGrid>
        )}
      </DashboardPageShell>

      <style jsx global>{`
        .documents-center-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 18% 12%, rgba(29, 140, 255, .10), transparent 34%),
            linear-gradient(160deg, var(--sfm-background), #F8FBFF 62%, #E7F1FF 100%);
          color: var(--sfm-primary-dark);
          overflow-x: hidden;
        }
        .documents-center-content {
          display: grid;
          gap: var(--sfm-section-gap);
        }
        .sfm-page-topbar {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }
        .documents-upload-wrap {
          position: relative;
          display: inline-flex;
          justify-content: flex-end;
        }
        .documents-primary-action,
        .documents-secondary-action {
          min-height: 42px;
          border: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--sfm-primary), var(--sfm-accent));
          color: #FFFFFF;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font: 950 13px Tajawal, Arial, sans-serif;
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(29, 140, 255, .22);
        }
        .documents-secondary-action {
          background: #FFFFFF;
          color: var(--sfm-primary-dark);
          border: 1px solid rgba(29, 140, 255, .22);
          box-shadow: none;
        }
        .documents-upload-options {
          position: absolute;
          z-index: 20;
          inset-block-start: calc(100% + 10px);
          inset-inline-end: 0;
          width: min(340px, calc(100vw - 32px));
          display: grid;
          gap: 8px;
          padding: 10px;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 18px;
          background: #FFFFFF;
          box-shadow: 0 22px 60px rgba(3, 18, 37, .18);
        }
        .documents-upload-options a,
        .documents-upload-options button {
          min-height: 46px;
          border: 1px solid rgba(29, 140, 255, .14);
          border-radius: 14px;
          background: var(--sfm-light-card);
          color: var(--sfm-primary-dark);
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 12px;
          text-decoration: none;
          font: 900 13px Tajawal, Arial, sans-serif;
          text-align: start;
        }
        .documents-upload-options button {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          cursor: not-allowed;
          opacity: .74;
        }
        .documents-upload-options small {
          grid-column: 2;
          color: var(--sfm-muted);
          line-height: 1.5;
        }
        .documents-notice {
          border: 1px solid rgba(29, 140, 255, .2);
          background: #FFFFFF;
          color: var(--sfm-primary-dark);
          border-radius: 16px;
          padding: 12px 14px;
          font-weight: 900;
        }
        .documents-notice.warning {
          border-color: rgba(245, 158, 11, .26);
          color: #B45309;
          background: #FFFBEB;
        }
        .document-metric {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .document-metric > span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          border-radius: 14px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .document-metric p {
          margin: 0;
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 900;
        }
        .document-metric strong {
          display: block;
          color: var(--sfm-primary-dark);
          font-size: 24px;
          line-height: 1.1;
        }
        .documents-tools {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }
        .documents-search-field {
          min-height: 48px;
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(29, 140, 255, .18);
          background: var(--sfm-light-card);
          color: var(--sfm-primary);
          border-radius: 16px;
          padding: 0 12px;
          min-width: 0;
        }
        .documents-search-field input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--sfm-foreground);
          font: 900 14px Tajawal, Arial, sans-serif;
        }
        .documents-search-field input::placeholder {
          color: var(--sfm-muted);
        }
        .documents-tools p {
          margin: 0;
          color: var(--sfm-muted);
          font-weight: 900;
          line-height: 1.5;
        }
        .documents-card-grid {
          align-items: stretch;
        }
        .document-card {
          display: grid;
          gap: 15px;
          align-content: start;
          min-width: 0;
        }
        .document-card-head {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: start;
          gap: 12px;
          min-width: 0;
        }
        .document-card-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(29, 140, 255, .10);
          color: var(--sfm-primary);
        }
        .document-card h2 {
          margin: 8px 0 0;
          color: var(--sfm-primary-dark);
          font-size: 20px;
          line-height: 1.3;
          overflow-wrap: anywhere;
        }
        .source-badge {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 999px;
          background: rgba(24, 212, 212, .10);
          color: var(--sfm-primary-hover);
          padding: 5px 9px;
          font-size: 12px;
          font-weight: 950;
        }
        .document-meta {
          display: grid;
          gap: 8px;
          margin: 0;
        }
        .document-meta div {
          display: grid;
          grid-template-columns: minmax(100px, .38fr) minmax(0, 1fr);
          gap: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(29, 140, 255, .10);
          min-width: 0;
        }
        .document-meta dt {
          color: var(--sfm-muted);
          font-weight: 900;
        }
        .document-meta dd {
          margin: 0;
          color: var(--sfm-primary-dark);
          font-weight: 900;
          overflow-wrap: anywhere;
        }
        .source-delete-note {
          margin: 0;
          border: 1px dashed rgba(29, 140, 255, .22);
          border-radius: 13px;
          padding: 9px 10px;
          color: var(--sfm-muted);
          background: var(--sfm-light-card);
          font-weight: 900;
          line-height: 1.5;
        }
        .document-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .document-actions button,
        .document-actions a {
          min-height: 40px;
          border: 1px solid rgba(29, 140, 255, .18);
          border-radius: 13px;
          background: #FFFFFF;
          color: var(--sfm-primary-dark);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 10px;
          font: 950 12px Tajawal, Arial, sans-serif;
          text-decoration: none;
          cursor: pointer;
        }
        .document-actions button:hover,
        .document-actions button:focus-visible,
        .document-actions a:hover,
        .document-actions a:focus-visible,
        .documents-primary-action:focus-visible,
        .documents-secondary-action:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(24, 212, 212, .16);
          border-color: rgba(24, 212, 212, .38);
        }
        .document-actions button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }
        .document-actions .danger {
          color: #B91C1C;
          border-color: rgba(239, 68, 68, .22);
          background: #FEF2F2;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 920px) {
          .documents-tools {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 720px) {
          .sfm-page-topbar {
            display: none;
          }
          .documents-upload-wrap,
          .documents-primary-action,
          .documents-secondary-action {
            width: 100%;
          }
          .documents-upload-options {
            position: fixed;
            inset: auto 16px 16px;
            width: auto;
          }
          .document-meta div {
            grid-template-columns: 1fr;
          }
          .document-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function DocumentMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="document-metric">
      <span aria-hidden="true">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
