'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Download, Eye, FileSpreadsheet, FileText, Image as ImageIcon, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Lang = 'ar' | 'en' | 'fr';
type ProjectDocumentCategory =
  | 'business_plan'
  | 'contract'
  | 'license'
  | 'invoice'
  | 'receipt'
  | 'supplier'
  | 'employee'
  | 'report'
  | 'financial'
  | 'legal'
  | 'other';

export type ProjectDocumentRow = {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  category: ProjectDocumentCategory | string | null;
  file_url?: string | null;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | string | null;
  source_url?: string | null;
  document_type?: string | null;
  status?: string | null;
  notes: string | null;
  uploaded_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const TEXT = {
  ar: {
    documentVault: 'خزنة مستندات المشروع',
    documentVaultDesc: 'احفظ خطط العمل، العقود، التراخيص، الفواتير، وتقارير المشروع في مكان واحد.',
    uploadDocument: '+ رفع مستند',
    uploadDocumentShort: 'رفع مستند',
    documentTitle: 'عنوان المستند',
    category: 'التصنيف',
    chooseFile: 'اختر الملف',
    notes: 'ملاحظات',
    searchDocuments: 'بحث في المستندات',
    allCategories: 'كل التصنيفات',
    noDocuments: 'لا توجد مستندات محفوظة لهذا المشروع حتى الآن.',
    fileTooLarge: 'حجم الملف أكبر من 10MB.',
    unsupportedFileType: 'نوع الملف غير مدعوم.',
    uploadFailed: 'تعذر رفع المستند.',
    documentUploaded: 'تم رفع المستند بنجاح.',
    documentDeleted: 'تم حذف المستند بنجاح.',
    openDocumentFailed: 'تعذر فتح المستند حالياً.',
    deleteStorageWarning: 'تم حذف السجل، لكن تعذر حذف الملف من التخزين حالياً.',
    confirmDeleteDocument: 'هل تريد حذف هذا المستند؟',
    view: 'عرض',
    download: 'تحميل',
    delete: 'حذف',
    fileType: 'نوع الملف',
    fileSize: 'حجم الملف',
    uploadedAt: 'تاريخ الرفع',
    fileName: 'اسم الملف',
    close: 'إغلاق',
    cancel: 'إلغاء',
    titleRequired: 'عنوان المستند مطلوب.',
    fileRequired: 'الملف مطلوب.',
    bytes: 'بايت',
    kilobytes: 'KB',
    megabytes: 'MB',
    business_plan: 'خطة عمل',
    contract: 'عقد',
    license: 'ترخيص',
    invoice: 'فاتورة',
    receipt: 'إيصال',
    supplier: 'مورد',
    employee: 'موظف',
    report: 'تقرير',
    financial: 'مالي',
    legal: 'قانوني',
    other: 'أخرى',
  },
  en: {
    documentVault: 'Project Document Vault',
    documentVaultDesc: 'Store business plans, contracts, licenses, invoices, and project reports in one place.',
    uploadDocument: '+ Upload Document',
    uploadDocumentShort: 'Upload Document',
    documentTitle: 'Document title',
    category: 'Category',
    chooseFile: 'Choose file',
    notes: 'Notes',
    searchDocuments: 'Search documents',
    allCategories: 'All categories',
    noDocuments: 'No documents saved for this project yet.',
    fileTooLarge: 'File is larger than 10MB.',
    unsupportedFileType: 'Unsupported file type.',
    uploadFailed: 'Upload failed.',
    documentUploaded: 'Document uploaded successfully.',
    documentDeleted: 'Document deleted successfully.',
    openDocumentFailed: 'Could not open the document right now.',
    deleteStorageWarning: 'The record was deleted, but the storage file could not be removed right now.',
    confirmDeleteDocument: 'Do you want to delete this document?',
    view: 'View',
    download: 'Download',
    delete: 'Delete',
    fileType: 'File type',
    fileSize: 'File size',
    uploadedAt: 'Upload date',
    fileName: 'File name',
    close: 'Close',
    cancel: 'Cancel',
    titleRequired: 'Document title is required.',
    fileRequired: 'File is required.',
    bytes: 'bytes',
    kilobytes: 'KB',
    megabytes: 'MB',
    business_plan: 'Business Plan',
    contract: 'Contract',
    license: 'License',
    invoice: 'Invoice',
    receipt: 'Receipt',
    supplier: 'Supplier',
    employee: 'Employee',
    report: 'Report',
    financial: 'Financial',
    legal: 'Legal',
    other: 'Other',
  },
  fr: {
    documentVault: 'Coffre de documents du projet',
    documentVaultDesc: 'Conservez les plans d’affaires, contrats, licences, factures et rapports du projet au même endroit.',
    uploadDocument: '+ Téléverser un document',
    uploadDocumentShort: 'Téléverser un document',
    documentTitle: 'Titre du document',
    category: 'Catégorie',
    chooseFile: 'Choisir un fichier',
    notes: 'Notes',
    searchDocuments: 'Rechercher des documents',
    allCategories: 'Toutes les catégories',
    noDocuments: 'Aucun document enregistré pour ce projet pour le moment.',
    fileTooLarge: 'Le fichier dépasse 10MB.',
    unsupportedFileType: 'Type de fichier non pris en charge.',
    uploadFailed: 'Impossible de téléverser le document.',
    documentUploaded: 'Document téléversé avec succès.',
    documentDeleted: 'Document supprimé avec succès.',
    openDocumentFailed: 'Impossible d’ouvrir le document pour le moment.',
    deleteStorageWarning: 'L’enregistrement a été supprimé, mais le fichier n’a pas pu être supprimé du stockage.',
    confirmDeleteDocument: 'Voulez-vous supprimer ce document ?',
    view: 'Voir',
    download: 'Télécharger',
    delete: 'Supprimer',
    fileType: 'Type de fichier',
    fileSize: 'Taille du fichier',
    uploadedAt: 'Date de téléversement',
    fileName: 'Nom du fichier',
    close: 'Fermer',
    cancel: 'Annuler',
    titleRequired: 'Le titre du document est obligatoire.',
    fileRequired: 'Le fichier est obligatoire.',
    bytes: 'octets',
    kilobytes: 'Ko',
    megabytes: 'Mo',
    business_plan: 'Plan d’affaires',
    contract: 'Contrat',
    license: 'Licence',
    invoice: 'Facture',
    receipt: 'Reçu',
    supplier: 'Fournisseur',
    employee: 'Employé',
    report: 'Rapport',
    financial: 'Financier',
    legal: 'Juridique',
    other: 'Autre',
  },
} as const;

type DocumentTranslation = Record<keyof typeof TEXT.ar, string>;

const categories: ProjectDocumentCategory[] = [
  'business_plan',
  'contract',
  'license',
  'invoice',
  'receipt',
  'supplier',
  'employee',
  'report',
  'financial',
  'legal',
  'other',
];

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const allowedExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'xls', 'xlsx']);
const maxDocumentSize = 10 * 1024 * 1024;
const signedUrlExpirySeconds = 600;
const fileAccept = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  ...Array.from(allowedMimeTypes),
].join(',');

function getLocale(lang?: string): Lang {
  return lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar';
}

function getExtension(fileName?: string | null) {
  const parts = String(fileName ?? '').split('.');
  return parts.length > 1 ? String(parts.pop()).toLowerCase() : '';
}

function hasAllowedFileType(file: File) {
  const extension = getExtension(file.name);
  return allowedExtensions.has(extension) || allowedMimeTypes.has(file.type);
}

function cleanFileName(name: string) {
  const extension = getExtension(name);
  const base = name.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'document';
  return extension ? `${base}.${extension}` : base;
}

function makeUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function fileSizeLabel(value: unknown, locale: Lang, t: DocumentTranslation) {
  const bytes = toNumber(value);
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: 1 });
  if (bytes >= 1024 * 1024) return `${formatter.format(bytes / (1024 * 1024))} ${t.megabytes}`;
  if (bytes >= 1024) return `${formatter.format(bytes / 1024)} ${t.kilobytes}`;
  return `${formatter.format(bytes)} ${t.bytes}`;
}

function dateLabel(value: string | null | undefined, locale: Lang) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleDateString(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US');
}

function categoryLabel(category: string | null | undefined, t: DocumentTranslation) {
  const key = categories.includes(category as ProjectDocumentCategory) ? category as ProjectDocumentCategory : 'other';
  return t[key];
}

function documentDateValue(doc: ProjectDocumentRow) {
  return new Date(String(doc.updated_at ?? doc.uploaded_at ?? doc.created_at ?? '')).getTime() || 0;
}

function uniqueDocumentKey(doc: ProjectDocumentRow) {
  const sourceUrl = String(doc.source_url ?? '').trim().toLowerCase();
  if (!sourceUrl) return `record:${doc.id}`;
  return [
    doc.user_id,
    doc.project_id,
    doc.category || 'other',
    sourceUrl,
    doc.document_type || 'uploaded_file',
  ].join('|');
}

function uniqueLatestDocuments(rows: ProjectDocumentRow[]) {
  const grouped = new Map<string, ProjectDocumentRow>();
  for (const row of rows) {
    const key = uniqueDocumentKey(row);
    const current = grouped.get(key);
    if (!current || documentDateValue(row) >= documentDateValue(current)) grouped.set(key, row);
  }
  return Array.from(grouped.values()).sort((left, right) => documentDateValue(right) - documentDateValue(left));
}

function fileIcon(fileName: string, fileType?: string | null): ReactNode {
  const extension = getExtension(fileName);
  if (String(fileType ?? '').startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) return <ImageIcon size={22} />;
  if (['xls', 'xlsx'].includes(extension)) return <FileSpreadsheet size={22} />;
  return <FileText size={22} />;
}

export function ProjectDocumentsTab({
  userId,
  projectId,
  lang = 'ar',
  onDocumentsCountChange,
}: {
  userId: string;
  projectId: string;
  lang?: string;
  onDocumentsCountChange?: (count: number) => void;
}) {
  const locale = getLocale(lang);
  const t = TEXT[locale] as DocumentTranslation;
  const [documents, setDocuments] = useState<ProjectDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProjectDocumentCategory>('all');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: '',
    category: 'business_plan' as ProjectDocumentCategory,
    notes: '',
  });

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('project_documents')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false });
    if (!error) setDocuments(uniqueLatestDocuments((data ?? []) as ProjectDocumentRow[]));
    setLoading(false);
  }, [projectId, userId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    onDocumentsCountChange?.(documents.length);
  }, [documents.length, onDocumentsCountChange]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredDocuments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return documents.filter(doc => {
      const categoryMatch = categoryFilter === 'all' || doc.category === categoryFilter;
      const textMatch = !needle || [doc.title, doc.file_name, doc.notes].some(value => String(value ?? '').toLowerCase().includes(needle));
      return categoryMatch && textMatch;
    });
  }, [categoryFilter, documents, search]);

  const resetForm = () => {
    setForm({ title: '', category: 'business_plan', notes: '' });
    setDocumentFile(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const uploadDocument = async () => {
    setMessage('');
    if (!form.title.trim()) {
      setMessage(t.titleRequired);
      return;
    }
    if (!documentFile) {
      setMessage(t.fileRequired);
      return;
    }
    if (!hasAllowedFileType(documentFile)) {
      setMessage(t.unsupportedFileType);
      return;
    }
    if (documentFile.size > maxDocumentSize) {
      setMessage(t.fileTooLarge);
      return;
    }

    setUploading(true);
    const documentId = makeUuid();
    const filePath = `${userId}/projects/${projectId}/${documentId}-${cleanFileName(documentFile.name)}`;
    const sourceUrl = '';
    const documentType = 'uploaded_file';
    const now = new Date().toISOString();

    try {
      const upload = await supabase.storage.from('project-documents').upload(filePath, documentFile, {
        cacheControl: '3600',
        contentType: documentFile.type || undefined,
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const basePayload = {
        title: form.title.trim(),
        category: form.category,
        file_url: null,
        file_path: filePath,
        file_name: documentFile.name,
        file_type: documentFile.type || getExtension(documentFile.name),
        file_size: documentFile.size,
        notes: form.notes.trim() || null,
        source_url: sourceUrl || null,
        document_type: documentType,
        status: 'uploaded',
        updated_at: now,
      };

      let existingId = '';
      if (sourceUrl) {
        const existing = await (supabase as any)
          .from('project_documents')
          .select('id,file_path')
          .eq('user_id', userId)
          .eq('project_id', projectId)
          .eq('category', form.category)
          .eq('source_url', sourceUrl)
          .eq('document_type', documentType)
          .maybeSingle();
        if (existing.error) throw existing.error;
        existingId = existing.data?.id ?? '';
      }

      const { data, error } = existingId
        ? await (supabase as any)
          .from('project_documents')
          .update(basePayload)
          .eq('id', existingId)
          .eq('user_id', userId)
          .select('*')
          .single()
        : await (supabase as any)
          .from('project_documents')
          .insert({
            id: documentId,
            user_id: userId,
            project_id: projectId,
            ...basePayload,
          })
          .select('*')
          .single();
      if (error) {
        await supabase.storage.from('project-documents').remove([filePath]);
        throw error;
      }

      setDocuments(prev => uniqueLatestDocuments([data as ProjectDocumentRow, ...prev]));
      setMessage(t.documentUploaded);
      closeModal();
    } catch {
      setMessage(t.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (doc: ProjectDocumentRow, download = false) => {
    const signed = download
      ? await supabase.storage.from('project-documents').createSignedUrl(doc.file_path, signedUrlExpirySeconds, { download: doc.file_name })
      : await supabase.storage.from('project-documents').createSignedUrl(doc.file_path, signedUrlExpirySeconds);

    if (signed.error || !signed.data?.signedUrl) {
      setMessage(t.openDocumentFailed);
      return;
    }

    if (download) {
      const link = window.document.createElement('a');
      link.href = signed.data.signedUrl;
      link.download = doc.file_name;
      link.rel = 'noopener noreferrer';
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    window.open(signed.data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const deleteDocument = async (doc: ProjectDocumentRow) => {
    if (!window.confirm(t.confirmDeleteDocument)) return;
    const { error } = await (supabase as any)
      .from('project_documents')
      .delete()
      .eq('id', doc.id)
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) {
      setMessage(t.uploadFailed);
      return;
    }

    setDocuments(prev => prev.filter(item => item.id !== doc.id));
    const storageDelete = await supabase.storage.from('project-documents').remove([doc.file_path]);
    setMessage(storageDelete.error ? t.deleteStorageWarning : t.documentDeleted);
  };

  return (
    <section className="project-documents-tab" role="tabpanel" aria-label={t.documentVault}>
      <article className="documents-hero-card">
        <div>
          <span>{t.documentVault}</span>
          <h2>{t.documentVault}</h2>
          <p>{t.documentVaultDesc}</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)} aria-label={t.uploadDocumentShort}>
          <Plus size={17} />
          {t.uploadDocument}
        </button>
      </article>

      {message ? <div className="documents-notice" role="status">{message}</div> : null}

      <article className="documents-tools-card">
        <label className="document-search-field" htmlFor="project-document-search">
          <Search size={17} />
          <input
            id="project-document-search"
            value={search}
            placeholder={t.searchDocuments}
            onChange={event => setSearch(event.target.value)}
            aria-label={t.searchDocuments}
          />
        </label>
        <label className="document-filter-field" htmlFor="project-document-category-filter">
          <span>{t.category}</span>
          <select
            id="project-document-category-filter"
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value as 'all' | ProjectDocumentCategory)}
            aria-label={t.category}
          >
            <option value="all">{t.allCategories}</option>
            {categories.map(category => (
              <option value={category} key={category}>{t[category]}</option>
            ))}
          </select>
        </label>
      </article>

      <div className="documents-grid">
        {loading ? <p className="documents-empty">{t.documentVault}</p> : null}
        {!loading && filteredDocuments.length === 0 ? (
          <article className="documents-empty">
            <FileText size={34} />
            <p>{t.noDocuments}</p>
          </article>
        ) : null}

        {filteredDocuments.map(doc => (
          <article className="project-document-card" key={doc.id}>
            <div className="document-card-heading">
              <div className="document-file-icon">{fileIcon(doc.file_name, doc.file_type)}</div>
              <div>
                <h3>{doc.title}</h3>
                <span>{categoryLabel(doc.category, t)}</span>
              </div>
            </div>

            <dl className="document-meta-list">
              <div><dt>{t.fileName}</dt><dd>{doc.file_name}</dd></div>
              <div><dt>{t.fileType}</dt><dd>{getExtension(doc.file_name).toUpperCase() || doc.file_type || '—'}</dd></div>
              <div><dt>{t.fileSize}</dt><dd>{fileSizeLabel(doc.file_size, locale, t)}</dd></div>
              <div><dt>{t.uploadedAt}</dt><dd>{dateLabel(doc.uploaded_at, locale)}</dd></div>
            </dl>

            {doc.notes ? <p className="document-notes">{doc.notes}</p> : null}

            <div className="document-card-actions">
              <button type="button" onClick={() => openDocument(doc)} aria-label={t.view}><Eye size={15} />{t.view}</button>
              <button type="button" onClick={() => openDocument(doc, true)} aria-label={t.download}><Download size={15} />{t.download}</button>
              <button type="button" onClick={() => deleteDocument(doc)} aria-label={t.delete}><Trash2 size={15} />{t.delete}</button>
            </div>
          </article>
        ))}
      </div>

      {modalOpen ? (
        <div className="documents-modal-backdrop" role="dialog" aria-modal="true" aria-label={t.uploadDocumentShort}>
          <div className="documents-modal">
            <div className="documents-modal-heading">
              <h2>{t.uploadDocumentShort}</h2>
              <button type="button" onClick={closeModal} aria-label={t.close}><X size={18} /></button>
            </div>

            <div className="documents-modal-grid">
              <label className="documents-field" htmlFor="project-document-title">
                <span>{t.documentTitle}</span>
                <input
                  id="project-document-title"
                  value={form.title}
                  onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
                />
              </label>

              <label className="documents-field" htmlFor="project-document-category">
                <span>{t.category}</span>
                <select
                  id="project-document-category"
                  value={form.category}
                  onChange={event => setForm(prev => ({ ...prev, category: event.target.value as ProjectDocumentCategory }))}
                >
                  {categories.map(category => (
                    <option value={category} key={category}>{t[category]}</option>
                  ))}
                </select>
              </label>

              <label className="documents-field wide" htmlFor="project-document-file">
                <span>{t.chooseFile}</span>
                <input
                  id="project-document-file"
                  type="file"
                  accept={fileAccept}
                  onChange={event => setDocumentFile(event.target.files?.[0] ?? null)}
                />
              </label>

              {documentFile ? (
                <div className="selected-document-file wide">
                  <Upload size={16} />
                  <span>{documentFile.name}</span>
                  <small>{fileSizeLabel(documentFile.size, locale, t)}</small>
                  <button type="button" onClick={() => setDocumentFile(null)} aria-label={t.delete}><X size={14} /></button>
                </div>
              ) : null}

              <label className="documents-field wide" htmlFor="project-document-notes">
                <span>{t.notes}</span>
                <textarea
                  id="project-document-notes"
                  rows={3}
                  value={form.notes}
                  onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
                />
              </label>
            </div>

            <div className="documents-modal-actions">
              <button type="button" onClick={closeModal}>{t.cancel}</button>
              <button type="button" className="documents-primary-btn" disabled={uploading} onClick={uploadDocument}>
                <Upload size={16} />
                {uploading ? t.uploadDocumentShort : t.uploadDocumentShort}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .project-documents-tab{display:grid;gap:16px;min-width:0}.documents-hero-card,.documents-tools-card,.project-document-card,.documents-empty{background:var(--sfm-card);border:1px solid rgba(29,140,255,.16);border-radius:20px;padding:18px;box-shadow:0 14px 34px rgba(3,18,37,.07);min-width:0}.documents-hero-card{display:flex;justify-content:space-between;align-items:center;gap:16px;background:radial-gradient(circle at 12% 0%,rgba(167,243,240,.32),transparent 28%),linear-gradient(135deg,var(--sfm-primary-dark),var(--sfm-midnight) 60%,var(--sfm-card-dark) 138%);color:var(--sfm-card)}.documents-hero-card span{color:var(--sfm-soft-cyan);font-size:12px;font-weight:950}.documents-hero-card h2{margin:6px 0;color:var(--sfm-card);font-size:26px}.documents-hero-card p{margin:0;color:rgba(234,246,255,.78);line-height:1.75;max-width:720px}.documents-hero-card button,.documents-primary-btn{min-height:44px;border:0;border-radius:14px;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF;padding:0 16px;font-family:inherit;font-weight:950;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;white-space:nowrap}.documents-notice{border:1px solid rgba(29,140,255,.2);background:var(--sfm-light-card);color:var(--sfm-midnight);border-radius:15px;padding:12px 14px;font-weight:900}.documents-tools-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.28fr);gap:12px;align-items:end}.document-search-field,.document-filter-field,.documents-field{display:grid;gap:7px;min-width:0}.document-search-field{position:relative}.document-search-field svg{position:absolute;inset-inline-start:12px;top:50%;transform:translateY(-50%);color:var(--sfm-primary)}.document-search-field input{padding-inline-start:38px}.document-search-field input,.document-filter-field select,.documents-field input,.documents-field textarea,.documents-field select{width:100%;min-width:0;border:1px solid rgba(29,140,255,.2);background:var(--sfm-card);color:var(--sfm-foreground);border-radius:13px;padding:11px 12px;font-family:inherit;font-weight:800;outline:none}.document-filter-field span,.documents-field span{font-weight:900;color:var(--sfm-muted)}.documents-field textarea{resize:vertical;line-height:1.6}.document-search-field input:focus,.document-filter-field select:focus,.documents-field input:focus,.documents-field textarea:focus,.documents-field select:focus,.documents-hero-card button:focus-visible,.document-card-actions button:focus-visible,.documents-modal-heading button:focus-visible,.documents-modal-actions button:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.15)}.documents-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;min-width:0}.documents-empty{grid-column:1 / -1;display:grid;place-items:center;text-align:center;min-height:180px;color:var(--sfm-muted);font-weight:900}.documents-empty svg{color:var(--sfm-primary)}.project-document-card{display:grid;gap:14px}.document-card-heading{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center}.document-file-icon{width:46px;height:46px;border-radius:15px;background:var(--sfm-light-card);color:var(--sfm-primary);display:grid;place-items:center;border:1px solid rgba(29,140,255,.12)}.document-card-heading h3{margin:0;color:var(--sfm-primary-dark);font-size:18px;overflow-wrap:anywhere}.document-card-heading span{display:inline-flex;margin-top:7px;border-radius:999px;background:rgba(29,140,255,.10);color:var(--sfm-primary-hover);padding:4px 9px;font-size:12px;font-weight:950}.document-meta-list{display:grid;gap:8px;margin:0}.document-meta-list div{display:grid;grid-template-columns:minmax(90px,.34fr) minmax(0,1fr);gap:10px;border-bottom:1px solid rgba(29,140,255,.08);padding-bottom:8px}.document-meta-list dt{color:var(--sfm-muted);font-weight:900}.document-meta-list dd{margin:0;color:var(--sfm-primary-dark);font-weight:900;overflow-wrap:anywhere}.document-notes{margin:0;color:var(--sfm-muted);line-height:1.65}.document-card-actions{display:flex;flex-wrap:wrap;gap:7px}.document-card-actions button{min-height:36px;border:1px solid rgba(29,140,255,.16);border-radius:11px;background:var(--sfm-light-card);color:var(--sfm-midnight);padding:0 10px;font-family:inherit;font-weight:900;display:inline-flex;align-items:center;gap:6px;cursor:pointer}.document-card-actions button:hover{background:rgba(29,140,255,.10)}.documents-modal-backdrop{position:fixed;inset:0;z-index:150;background:rgba(3,18,37,.48);display:grid;place-items:center;padding:18px}.documents-modal{width:min(720px,100%);max-height:min(86dvh,800px);overflow:auto;background:var(--sfm-card);border:1px solid rgba(29,140,255,.2);border-radius:22px;padding:18px;box-shadow:0 24px 70px rgba(3,18,37,.25)}.documents-modal-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.documents-modal-heading h2{margin:0;color:var(--sfm-midnight)}.documents-modal-heading button{width:38px;height:38px;border:1px solid rgba(29,140,255,.16);border-radius:12px;background:var(--sfm-light-card);color:var(--sfm-midnight);display:grid;place-items:center;cursor:pointer}.documents-modal-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.documents-field.wide,.selected-document-file.wide{grid-column:1 / -1}.selected-document-file{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:9px;align-items:center;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);border-radius:14px;padding:10px;color:var(--sfm-midnight);font-weight:900}.selected-document-file svg{color:var(--sfm-primary)}.selected-document-file span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.selected-document-file small{color:var(--sfm-muted);font-weight:900}.selected-document-file button{width:30px;height:30px;border:1px solid rgba(29,140,255,.16);border-radius:10px;background:var(--sfm-card);color:var(--sfm-midnight);display:grid;place-items:center;cursor:pointer}.documents-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}.documents-modal-actions button{min-height:42px;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:var(--sfm-light-card);color:var(--sfm-midnight);padding:0 14px;font-family:inherit;font-weight:950;display:inline-flex;align-items:center;gap:8px;cursor:pointer}.documents-modal-actions .documents-primary-btn{border:0;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));color:#FFFFFF}.documents-primary-btn:disabled{opacity:.66;cursor:not-allowed}@media(max-width:1180px){.documents-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.documents-hero-card{display:grid}.documents-hero-card button{width:100%}.documents-tools-card,.documents-grid,.documents-modal-grid{grid-template-columns:1fr}.documents-modal-backdrop{align-items:end;padding:10px}.documents-modal{max-height:88dvh;border-radius:20px 20px 0 0}.documents-modal-actions{display:grid;grid-template-columns:1fr}.documents-modal-actions button{width:100%;justify-content:center}.document-meta-list div{grid-template-columns:1fr}.document-card-actions{display:grid;grid-template-columns:1fr}.document-card-actions button{width:100%;justify-content:center}.selected-document-file{grid-template-columns:auto minmax(0,1fr) auto}.selected-document-file small{grid-column:2 / 3}}
      `}</style>
    </section>
  );
}
