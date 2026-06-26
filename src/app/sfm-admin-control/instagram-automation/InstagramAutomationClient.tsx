'use client';

/* eslint-disable @next/next/no-img-element */

import { type CSSProperties, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  Instagram,
  Loader2,
  Send,
  ShieldCheck,
  UploadCloud,
  Video,
  XCircle,
  Trash2,
} from 'lucide-react';
import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/lib/translations';

type ContentType = 'reel' | 'post' | 'story';
type Status = 'draft' | 'approval_pending' | 'approved' | 'rejected' | 'publishing' | 'published' | 'failed';
type LocalizedText = { ar: string; en: string; fr: string };
type LocalizedList = { ar: string[]; en: string[]; fr: string[] };

type AutomationPost = {
  id: string;
  content_type: ContentType;
  topic: string;
  titles: LocalizedText;
  asset_prompts: LocalizedText;
  captions: LocalizedText;
  descriptions: LocalizedText;
  hashtags: LocalizedList;
  ctas: LocalizedText;
  asset_url: string | null;
  thumbnail_url: string | null;
  template_provider: string | null;
  telegram_chat_id: string | null;
  telegram_message_id: string | null;
  instagram_container_id: string | null;
  instagram_media_id: string | null;
  status: Status;
  approval_sent_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  review_notes: string | null;
  error_logs: unknown[];
  created_at: string;
  updated_at: string;
  language?: string | null;
  platform?: string | null;
};

type AutomationEvent = {
  id: string;
  post_id: string;
  event_type: string;
  status_from: Status | null;
  status_to: Status | null;
  message: string | null;
  created_at: string;
};

type FormState = {
  id: string;
  contentType: ContentType;
  platform: string;
  language: Lang;
  topic: string;
  titles: LocalizedText;
  assetPrompts: LocalizedText;
  captions: LocalizedText;
  descriptions: LocalizedText;
  hashtags: LocalizedList;
  ctas: LocalizedText;
  assetUrl: string;
  thumbnailUrl: string;
  templateProvider: string;
};

type Copy = {
  title: string;
  subtitle: string;
  admin: string;
  newDraft: string;
  saveDraft: string;
  updateDraft: string;
  sendApproval: string;
  approve: string;
  reject: string;
  publish: string;
  preview: string;
  drafts: string;
  deleteDraft: string;
  noDraftsYet: string;
  noDraftsBody: string;
  topic: string;
  contentType: string;
  titleField: string;
  prompt: string;
  caption: string;
  description: string;
  hashtags: string;
  cta: string;
  assetUrl: string;
  thumbnailUrl: string;
  templateProvider: string;
  platform: string;
  language: string;
  notes: string;
  timeline: string;
  noEvents: string;
  providerMissing: string;
  loadFailed: string;
  saved: string;
  statusDraft: string;
  statusPending: string;
  statusApproved: string;
  statusPublished: string;
  statusFailed: string;
  statusRejected: string;
  statusPublishing: string;
  permissionMessage: string;
  adminCodeTitle: string;
  adminCodeDesc: string;
  adminCodeLabel: string;
  adminCodeSubmit: string;
  adminCodeRetry: string;
  adminCodeLocked: string;
  adminCodeMissingConfig: string;
  adminCodeInvalid: string;
  adminCodeHelp: string;
  languages: Record<Lang, string>;
  contentTypes: Record<ContentType, string>;
};

const COPY: Record<Lang, Copy> = {
  ar: {
    title: 'لوحة أتمتة إنستغرام',
    subtitle:
      'إدارة نشر المحتوى بنظام واضح: إنشاء المسودات، مراجعتها، معالجتها، ثم النشر بعد الموافقة من نفس الشاشة.',
    admin: 'المسؤول',
    newDraft: 'مسودة جديدة',
    saveDraft: 'حفظ كمسودة',
    updateDraft: 'تحديث المسودة',
    sendApproval: 'إرسال للمراجعة',
    approve: 'موافقة',
    reject: 'رفض',
    publish: 'نشر بعد الموافقة',
    preview: 'معاينة',
    drafts: 'المسودات والمهام',
    deleteDraft: 'حذف',
    noDraftsYet: 'لا توجد مسودات حتى الآن',
    noDraftsBody: 'ابدأ بمسودة جديدة ثم حدد الحالة المناسبة للمحتوى.',
    topic: 'الموضوع',
    contentType: 'نوع المحتوى',
    titleField: 'العنوان',
    prompt: 'وصف الصورة',
    caption: 'النص (Caption)',
    description: 'وصف إضافي',
    hashtags: 'الوسوم',
    cta: 'دعوة للإجراء',
    assetUrl: 'رابط الصورة/الفيديو',
    thumbnailUrl: 'رابط الصورة المصغرة',
    templateProvider: 'مزود النموذج',
    platform: 'المنصة',
    language: 'اللغة',
    notes: 'ملاحظات المراجعة',
    timeline: 'سجل النشاطات',
    noEvents: 'لا توجد أنشطة حتى الآن.',
    providerMissing: 'مزود النشر أو المراجعة غير مُعد في الخادم.',
    loadFailed: 'تعذر تحميل مسودات أتمتة إنستغرام.',
    saved: 'تم حفظ المسودة.',
    statusDraft: 'مسودة',
    statusPending: 'بانتظار الموافقة',
    statusApproved: 'معتمد',
    statusPublished: 'منشور',
    statusFailed: 'فشل النشر',
    statusRejected: 'مرفوض',
    statusPublishing: 'جاري النشر',
    permissionMessage: 'تعذر التحقق من صلاحية المسؤول. يرجى تسجيل الدخول أو تحديث الصفحة.',
    adminCodeTitle: 'تحقق من صلاحية المسؤول',
    adminCodeDesc: 'تأكد من إدخال كلمة مرور المسؤول الصحيحة حتى يتم تفعيل أزرار الإدارة على الخادم فقط.',
    adminCodeLabel: 'رمز الأدمن',
    adminCodeSubmit: 'تفعيل',
    adminCodeRetry: 'جاري التفعيل...',
    adminCodeLocked: 'المحاولة مقفلة مؤقتاً، حاول لاحقاً.',
    adminCodeMissingConfig: 'إعدادات رمز الأدمن غير مكتملة.',
    adminCodeInvalid: 'رمز الأدمن غير صحيح.',
    adminCodeHelp:
      'يتم التحقق من الكود من جهة السيرفر وتُخزَّن جلسة الأدمن في كوكي آمنة، بدون عرض الكود في الكود العميل.',
    languages: { ar: 'العربية', en: 'الإنجليزية', fr: 'الفرنسية' },
    contentTypes: { reel: 'ريل', post: 'منشور', story: 'ستوري' },
  },
  en: {
    title: 'Instagram Automation',
    subtitle:
      'Run a complete content workflow: drafting, review, status tracking, and approval-based publishing from one dashboard.',
    admin: 'Admin',
    newDraft: 'New draft',
    saveDraft: 'Save draft',
    updateDraft: 'Update draft',
    sendApproval: 'Send for review',
    approve: 'Approve',
    reject: 'Reject',
    publish: 'Publish after approval',
    preview: 'Preview',
    drafts: 'Drafts and tasks',
    deleteDraft: 'Delete',
    noDraftsYet: 'No drafts yet',
    noDraftsBody: 'Create a real draft when your content is ready and start the workflow.',
    topic: 'Topic',
    contentType: 'Content type',
    titleField: 'Title',
    prompt: 'Image prompt',
    caption: 'Caption',
    description: 'Description',
    hashtags: 'Hashtags',
    cta: 'Call to action',
    assetUrl: 'Media/source link',
    thumbnailUrl: 'Thumbnail image',
    templateProvider: 'Template provider',
    platform: 'Platform',
    language: 'Language',
    notes: 'Review notes',
    timeline: 'Activity log',
    noEvents: 'No activity for this draft yet.',
    providerMissing: 'Approval or publishing provider is not configured on the server.',
    loadFailed: 'Unable to load Instagram automation data.',
    saved: 'Draft saved.',
    statusDraft: 'Draft',
    statusPending: 'Pending approval',
    statusApproved: 'Approved',
    statusPublished: 'Published',
    statusFailed: 'Failed',
    statusRejected: 'Rejected',
    statusPublishing: 'Publishing',
    permissionMessage:
      'Unable to verify admin permission. Please log in again or refresh the page.',
    adminCodeTitle: 'Verify admin permission',
    adminCodeDesc: 'Enter the admin code to unlock secure actions after server-side validation.',
    adminCodeLabel: 'Admin code',
    adminCodeSubmit: 'Activate',
    adminCodeRetry: 'Activating...',
    adminCodeLocked: 'Too many attempts. Try again shortly.',
    adminCodeMissingConfig: 'Admin code is not configured on the server.',
    adminCodeInvalid: 'Incorrect admin code.',
    adminCodeHelp: 'The code is validated on the server and stored in a secure http-only session cookie.',
    languages: { ar: 'Arabic', en: 'English', fr: 'French' },
    contentTypes: { reel: 'Reel', post: 'Post', story: 'Story' },
  },
  fr: {
    title: 'Automatisation Instagram',
    subtitle:
      'Gérez en une seule vue la création, la révision, le suivi des statuts et la publication approuvée.',
    admin: 'Administrateur',
    newDraft: 'Nouveau brouillon',
    saveDraft: 'Enregistrer',
    updateDraft: 'Mettre Ã  jour',
    sendApproval: 'Envoyer pour revue',
    approve: 'Approuver',
    reject: 'Refuser',
    publish: 'Publier aprÃ¨s approbation',
    preview: 'AperÃ§u',
    drafts: 'Brouillons et tÃ¢ches',
    deleteDraft: 'Supprimer',
    noDraftsYet: 'Aucun brouillon',
    noDraftsBody: 'CrÃ©ez un brouillon rÃ©el lorsque le contenu est prÃªt.',
    topic: 'Sujet',
    contentType: 'Type',
    titleField: 'Titre',
    prompt: 'Invite visuelle',
    caption: 'LÃ©gende',
    description: 'Description',
    hashtags: 'Hashtags',
    cta: 'CTA',
    assetUrl: 'Lien mÃ©dia/source',
    thumbnailUrl: 'Miniature',
    templateProvider: 'Fournisseur de modÃ¨le',
    platform: 'Plateforme',
    language: 'Langue',
    notes: 'Notes de revue',
    timeline: 'Journal',
    noEvents: 'Aucune activitÃ© pour ce brouillon.',
    providerMissing: 'Le fournisseur de publication ou de validation nâ€™est pas configurÃ©.',
    loadFailed: 'Impossible de charger les donnÃ©es.',
    saved: 'Brouillon enregistrÃ©.',
    statusDraft: 'Brouillon',
    statusPending: 'En attente',
    statusApproved: 'ApprouvÃ©',
    statusPublished: 'PubliÃ©',
    statusFailed: 'Ã‰chec',
    statusRejected: 'RefusÃ©',
    statusPublishing: 'Publication',
    permissionMessage:
      'Impossible de vÃ©rifier les droits administrateur. Veuillez vous reconnecter ou rafraîchir la page.',
    adminCodeTitle: 'VÃ©rifier l\'accÃ¨s administrateur',
    adminCodeDesc: 'Saisissez le code administrateur pour dÃ©bloquer les actions aprÃ¨s validation cÃ´tÃ© serveur.',
    adminCodeLabel: 'Code administrateur',
    adminCodeSubmit: 'Activer',
    adminCodeRetry: 'Activation...',
    adminCodeLocked: 'Trop de tentatives. RÃ©essayez plus tard.',
    adminCodeMissingConfig: 'Le code administrateur nâ€™est pas configurÃ©.',
    adminCodeInvalid: 'Code invalide.',
    adminCodeHelp: 'La vÃ©rification se fait uniquement côté serveur via un cookie de session httpOnly.',
    languages: { ar: 'Arabe', en: 'Anglais', fr: 'FranÃ§ais' },
    contentTypes: { reel: 'Reel', post: 'Post', story: 'Story' },
  },
};

const EMPTY_TEXT: LocalizedText = { ar: '', en: '', fr: '' };
const EMPTY_LIST: LocalizedList = { ar: [], en: [], fr: [] };
const DEFAULT_PLATFORM_OPTIONS = ['instagram', 'facebook', 'threads', 'x', 'other'];

function emptyForm(): FormState {
  return {
    id: '',
    contentType: 'post',
    platform: 'instagram',
    language: 'ar',
    topic: '',
    titles: { ...EMPTY_TEXT },
    assetPrompts: { ...EMPTY_TEXT },
    captions: { ...EMPTY_TEXT },
    descriptions: { ...EMPTY_TEXT },
    hashtags: { ...EMPTY_LIST },
    ctas: { ...EMPTY_TEXT },
    assetUrl: '',
    thumbnailUrl: '',
    templateProvider: '',
  };
}

function splitTags(value: string) {
  return value
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function joinTags(value: string[]) {
  return value.join(' ');
}

function dateLabel(value: string | null, lang: Lang) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-KW' : lang === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return '-';
  }
}

function isVideoUrl(url?: string | null) {
  return Boolean(url && /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url));
}

function mapStatusTone(status: Status) {
  if (status === 'published' || status === 'approved') return 'good';
  if (status === 'failed' || status === 'rejected') return 'bad';
  if (status === 'approval_pending' || status === 'publishing') return 'warn';
  return 'neutral';
}

function resolveErrorMessage(code: string, copy: Copy) {
  if (code === 'ADMIN_CODE_REQUIRED') return copy.permissionMessage;
  if (code === 'FORBIDDEN' || code === 'UNAUTHORIZED') return copy.permissionMessage;
  if (code === 'NOT_CONFIGURED' || code === 'TELEGRAM_NOT_CONFIGURED' || code === 'INSTAGRAM_NOT_CONFIGURED') return copy.providerMissing;
  if (code === 'INVALID_URL') return 'صيغة الرابط غير صحيحة.';
  if (code === 'VALIDATION_ERROR') return 'يرجى استكمال الحقول الأساسية.';
  if (code === 'PUBLISHED_POST_LOCKED') return 'لا يمكن تعديل أو حذف منشور منشور بالفعل.';
  if (code === 'NOT_FOUND') return 'السجل غير موجود.';
  if (code === 'DELETE_FAILED') return 'تعذر حذف المسودة.';
  if (code === 'REQUEST_FAILED') return 'تعذر تنفيذ العملية.';
  return copy.loadFailed;
}

function mapCodeToStatus(status: Status, copy: Copy) {
  if (status === 'draft') return copy.statusDraft;
  if (status === 'approval_pending') return copy.statusPending;
  if (status === 'approved') return copy.statusApproved;
  if (status === 'published') return copy.statusPublished;
  if (status === 'failed') return copy.statusFailed;
  if (status === 'rejected') return copy.statusRejected;
  if (status === 'publishing') return copy.statusPublishing;
  return status;
}

export default function InstagramAutomationClient({
  adminEmail,
  contentStyle,
}: {
  adminEmail: string;
  contentStyle?: CSSProperties;
}) {
  const { lang, dir } = useLanguage();
  const text = COPY[lang] ?? COPY.ar;
  const [posts, setPosts] = useState<AutomationPost[]>([]);
  const [events, setEvents] = useState<AutomationEvent[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [activeLanguage, setActiveLanguage] = useState<Lang>('ar');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [needsAdminCode, setNeedsAdminCode] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);
  const [adminCodeError, setAdminCodeError] = useState('');

  const selectedPost = useMemo(() => posts.find(post => post.id === selectedId) ?? posts[0] ?? null, [posts, selectedId]);
  const selectedEvents = useMemo(
    () => (selectedPost ? events.filter(event => event.post_id === selectedPost.id) : []),
    [events, selectedPost],
  );

  const statusCounts = useMemo(
    () => ({
      draft: posts.filter(post => post.status === 'draft').length,
      approval: posts.filter(post => post.status === 'approval_pending').length,
      approved: posts.filter(post => post.status === 'approved').length,
      published: posts.filter(post => post.status === 'published').length,
      failed: posts.filter(post => post.status === 'failed').length,
    }),
    [posts],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/instagram-automation/list', { cache: 'no-store' });
      if (response.status === 428) {
        setNeedsAdminCode(true);
        setError(text.permissionMessage);
        setPosts([]);
        setEvents([]);
        setSelectedId('');
        return;
      }
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        const code = String(payload.code || 'LOAD_FAILED');
        setError(resolveErrorMessage(code, text));
        return;
      }
      setPosts(payload.posts ?? []);
      setEvents(payload.events ?? []);
      if (!selectedId && payload.posts?.[0]?.id) setSelectedId(payload.posts[0].id);
      setNeedsAdminCode(false);
    } catch {
      setError(text.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [selectedId, text]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedPost) return;
    const normalizedLanguage = selectedPost.language === 'en' || selectedPost.language === 'fr' || selectedPost.language === 'ar'
      ? selectedPost.language
      : 'ar';
    setForm(current => ({
      ...current,
      id: selectedPost.id,
      contentType: selectedPost.content_type,
      platform: selectedPost.platform ?? 'instagram',
      language: normalizedLanguage,
      topic: selectedPost.topic,
      titles: selectedPost.titles ?? { ...EMPTY_TEXT },
      assetPrompts: selectedPost.asset_prompts ?? { ...EMPTY_TEXT },
      captions: selectedPost.captions ?? { ...EMPTY_TEXT },
      descriptions: selectedPost.descriptions ?? { ...EMPTY_TEXT },
      hashtags: selectedPost.hashtags ?? { ...EMPTY_LIST },
      ctas: selectedPost.ctas ?? { ...EMPTY_TEXT },
      assetUrl: selectedPost.asset_url ?? '',
      thumbnailUrl: selectedPost.thumbnail_url ?? '',
      templateProvider: selectedPost.template_provider ?? '',
    }));
    setActiveLanguage(normalizedLanguage);
    setNotes(selectedPost.review_notes ?? '');
  }, [selectedPost]);

  function updateLocalized(
    field: 'titles' | 'assetPrompts' | 'captions' | 'descriptions' | 'ctas',
    value: string,
  ) {
    setForm(current => ({
      ...current,
      [field]: { ...current[field], [activeLanguage]: value },
    }));
  }

  function updateTags(value: string) {
    setForm(current => ({
      ...current,
      hashtags: { ...current.hashtags, [activeLanguage]: splitTags(value) },
    }));
  }

  function setErrorFromCode(code: string, overrideMessage?: string) {
    if (code === 'ADMIN_CODE_REQUIRED') {
      setNeedsAdminCode(true);
      setError(text.permissionMessage);
      return;
    }
    setNeedsAdminCode(false);
    setError(overrideMessage ?? resolveErrorMessage(code, text));
  }

  async function callAction(
    path: string,
    body: Record<string, unknown>,
    successMessage: string,
    onSuccess?: () => void,
  ) {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (response.status === 428 || payload?.code === 'ADMIN_CODE_REQUIRED') {
        setErrorFromCode('ADMIN_CODE_REQUIRED');
        return false;
      }
      if (!response.ok || !payload?.ok) {
        setErrorFromCode(payload?.code ? String(payload.code) : 'REQUEST_FAILED');
        return false;
      }
      await load();
      onSuccess?.();
      setMessage(successMessage);
      return true;
    } catch {
      setError(text.loadFailed);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    await callAction(
      '/api/instagram-automation/create-draft',
      {
        ...form,
        platform: form.platform,
        language: form.language,
      },
      text.saved,
      () => setNeedsAdminCode(false),
    );
  }

  async function sendForApproval() {
    if (!selectedPost) return;
    await callAction(
      '/api/instagram-automation/send-approval',
      { id: selectedPost.id },
      'تم إرسال المسودة للمراجعة.',
    );
  }

  async function approveDraft() {
    if (!selectedPost) return;
    await callAction(
      '/api/instagram-automation/approve',
      { id: selectedPost.id, notes },
      'تم اعتماد المسودة.',
    );
  }

  async function rejectDraft() {
    if (!selectedPost) return;
    await callAction(
      '/api/instagram-automation/reject',
      { id: selectedPost.id, notes },
      'تم رفض المسودة.',
    );
  }

  async function publishDraft() {
    if (!selectedPost) return;
    await callAction(
      '/api/instagram-automation/publish',
      {
        id: selectedPost.id,
        language: form.language,
      },
      'تم بدء نشر المسودة.',
    );
  }

  async function deleteDraft() {
    if (!selectedPost) return;
    const ok = await callAction(
      '/api/instagram-automation/delete',
      { id: selectedPost.id },
      'تم حذف المسودة.',
    );
    if (ok) {
      setForm(emptyForm());
      setNotes('');
      setSelectedId('');
    }
  }

  async function submitAdminCode(event: FormEvent) {
    event.preventDefault();
    setSubmittingCode(true);
    setAdminCodeError('');
    try {
      const response = await fetch('/api/admin/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: adminCode }),
      });
      if (response.ok) {
        setNeedsAdminCode(false);
        setAdminCode('');
        setAdminCodeError('');
        setError('');
        setMessage('');
        await load();
        return;
      }
      if (response.status === 429) {
        setAdminCodeError(text.adminCodeLocked);
      } else if (response.status === 500) {
        setAdminCodeError(text.adminCodeMissingConfig);
      } else {
        setAdminCodeError(text.adminCodeInvalid);
      }
    } catch {
      setAdminCodeError(text.permissionMessage);
    } finally {
      setSubmittingCode(false);
    }
  }

  function newDraft() {
    setSelectedId('');
    setForm(emptyForm());
    setNotes('');
    setMessage('');
    setError('');
  }

  return (
    <AdminDashboardShell
      ariaLabel={text.title}
      contentClassName="instagram-admin-content"
      contentStyle={contentStyle}
    >
      <style>{`
        .instagram-admin-content{width:100%!important;max-width:none!important;min-width:0!important}
        .ig-admin{width:100%;margin:0;padding:14px;display:grid;gap:14px;color:var(--sfm-foreground);min-width:0}
        .ig-hero{
          border:1px solid rgba(29,140,255,.18);
          background:linear-gradient(135deg,#04152D,#0A2F4F 56%,#0F6B67);
          color:#fff;border-radius:24px;padding:20px;display:grid;gap:16px;grid-template-columns:1fr auto;align-items:center;
          min-width:0;box-shadow:0 18px 45px rgba(3,18,37,.18)
        }
        .ig-hero h1{margin:0;font-size:clamp(28px,4vw,44px);line-height:1.05;font-weight:900}
        .ig-hero p{margin:8px 0 0;max-width:800px;color:rgba(232,245,255,.85);line-height:1.75;font-weight:700}
        .ig-hero-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
        .ig-badge-strip{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .ig-badge-chip{
          border:1px solid rgba(255,255,255,.2);
          background:rgba(255,255,255,.1);
          border-radius:999px;
          padding:8px 12px;
          display:inline-flex;
          align-items:center;
          gap:8px;
          font:900 12px Tajawal,Arial,sans-serif;
          color:#fff;
        }
        .ig-panel{
          border:1px solid rgba(29,140,255,.14);
          background:var(--sfm-card);
          border-radius:20px;
          padding:14px;
          box-shadow:0 14px 32px rgba(3,18,37,.05);
          min-width:0;
          display:grid;
          gap:12px;
          align-content:start;
        }
        .ig-panel h2{
          margin:0;
          display:flex;
          align-items:center;
          gap:8px;
          font-size:18px;
          color:var(--sfm-midnight);
        }
        .ig-grid{
          display:grid;
          grid-template-columns:minmax(290px,.95fr) minmax(0,1.35fr) minmax(290px,1.05fr);
          gap:14px;
          align-items:start;
          min-width:0;
        }
        .ig-stack{display:grid;gap:12px;min-width:0}
        .ig-stats{
          display:grid;
          grid-template-columns:repeat(5,minmax(0,1fr));
          gap:10px;
          min-width:0;
        }
        .ig-stat{
          border:1px solid rgba(29,140,255,.16);
          background:var(--sfm-card);
          border-radius:15px;
          padding:12px;
          min-width:0;
        }
        .ig-stat span{color:var(--sfm-muted);font-size:12px;font-weight:900}
        .ig-stat strong{display:block;margin-top:4px;font-size:26px;font-weight:950;color:var(--sfm-primary-dark)}
        .ig-banner{
          border-radius:14px;
          padding:12px 14px;
          display:grid;
          gap:6px;
          font-weight:800;
          font-size:13px;
          min-width:0;
        }
        .ig-banner.ok{background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0}
        .ig-banner.error{background:#FFF1F2;color:#991B1B;border:1px solid #FECDD3}
        .ig-banner.warn{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A}
        .ig-badge{
          border:1px solid rgba(29,140,255,.2);
          border-radius:999px;
          background:var(--sfm-light-card);
          padding:4px 10px;
          font-size:11px;
          display:inline-flex;
          align-items:center;
          font-weight:900;
          color:var(--sfm-muted);
          white-space:nowrap;
        }
        .ig-badge.good{background:#ECFDF5;color:#065F46;border-color:#A7F3D0}
        .ig-badge.warn{background:#FFFBEB;color:#92400E;border-color:#FDE68A}
        .ig-badge.bad{background:#FFF1F2;color:#991B1B;border-color:#FECDD3}
        .ig-badge.neutral{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE}
        .ig-action{
          border:1px solid rgba(29,140,255,.18);
          border-radius:12px;
          min-height:42px;
          padding:0 12px;
          background:var(--sfm-card);
          color:var(--sfm-foreground);
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          cursor:pointer;
          font:900 13px Tajawal,Arial,sans-serif;
          transition:transform .16s ease,box-shadow .16s ease;
        }
        .ig-action.primary{background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#fff;border:0}
        .ig-action.secondary{background:var(--sfm-light-card)}
        .ig-action.danger{background:#FFF1F2;color:#B91C1C;border-color:#FECACA}
        .ig-action:disabled{opacity:.6;cursor:not-allowed}
        .ig-action:hover:not(:disabled),.ig-action:focus-visible:not(:disabled){transform:translateY(-1px);box-shadow:0 0 0 3px rgba(24,212,212,.14);outline:0}
        .ig-form{display:grid;gap:10px}
        .ig-form-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
          min-width:0;
        }
        .ig-field{display:grid;gap:6px;min-width:0}
        .ig-field.wide{grid-column:1/-1}
        .ig-field span{font-size:12px;font-weight:900;color:var(--sfm-muted)}
        .ig-field input,.ig-field textarea,.ig-field select{
          width:100%;
          min-width:0;
          border:1px solid rgba(29,140,255,.16);
          background:var(--sfm-light-card);
          color:var(--sfm-foreground);
          border-radius:12px;
          min-height:42px;
          padding:10px 12px;
          font:900 13px Tajawal,Arial,sans-serif;
        }
        .ig-field textarea{min-height:100px;resize:vertical;line-height:1.6}
        .ig-tabs{display:flex;gap:8px;flex-wrap:wrap}
        .ig-tabs button{
          min-height:36px;
          border-radius:999px;
          border:1px solid rgba(29,140,255,.18);
          background:var(--sfm-light-card);
          color:var(--sfm-primary-hover);
          padding:0 11px;
          font:900 12px Tajawal,Arial,sans-serif;
        }
        .ig-tabs button.active{background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#fff;border:0}
        .ig-actions{display:flex;gap:8px;flex-wrap:wrap}
        .ig-list{display:grid;gap:8px;max-height:640px;overflow:auto;padding-inline-end:2px}
        .ig-item{display:grid;gap:8px;border:1px solid rgba(29,140,255,.13);background:var(--sfm-light-card);border-radius:14px;padding:10px;text-align:start;min-width:0}
        .ig-item:hover{border-color:rgba(29,140,255,.45)}
        .ig-item.active{border-color:rgba(24,212,212,.55);box-shadow:0 0 0 3px rgba(24,212,212,.12);background:linear-gradient(135deg,rgba(47,214,192,.11),rgba(29,140,255,.05))}
        .ig-item strong{font-size:14px;display:block;overflow-wrap:anywhere;color:var(--sfm-midnight)}
        .ig-item small{font-size:11px;color:var(--sfm-muted);font-weight:900}
        .ig-item .ig-item-top{display:flex;gap:8px;align-items:center;justify-content:space-between;min-width:0}
        .ig-item .ig-item-top .left{display:flex;align-items:center;gap:8px;min-width:0;overflow:hidden}
        .ig-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .ig-media{
          border:1px solid rgba(29,140,255,.14);
          border-radius:16px;
          min-height:210px;
          background:var(--sfm-light-card);
          display:grid;
          place-items:center;
          overflow:hidden;
          position:relative;
        }
        .ig-media img,.ig-media video{width:100%;height:100%;object-fit:cover;max-height:360px}
        .ig-media-placeholder{display:grid;place-items:center;gap:8px;color:var(--sfm-muted);text-align:center}
        .ig-empty{
          border:1px dashed rgba(29,140,255,.28);
          background:var(--sfm-light-card);
          border-radius:14px;
          min-height:180px;
          display:grid;
          place-items:center;
          padding:18px;
          text-align:center;
          color:var(--sfm-muted);
          gap:8px;
        }
        .ig-empty strong{color:var(--sfm-midnight)}
        .ig-event-list{display:grid;gap:8px;max-height:230px;overflow:auto;padding-inline-end:2px}
        .ig-event{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:12px;padding:9px;display:grid;gap:5px}
        .ig-event strong{font-size:12px;color:var(--sfm-midnight)}
        .ig-event small{font-size:11px;color:var(--sfm-muted);font-weight:900}
        .ig-code-card{
          border:1px solid rgba(29,140,255,.22);
          background:var(--sfm-card);
          border-radius:16px;
          padding:12px;
          display:grid;
          gap:10px;
        }
        .ig-code-card p{margin:0;color:var(--sfm-muted);line-height:1.6;font-weight:800}
        .ig-code-card strong{color:#B91C1C}
        .ig-code-row{display:flex;gap:8px;flex-wrap:wrap}
        .ig-code-row input{flex:1;min-width:200px}
        .ig-subtle{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.7}
        .dark .ig-admin,.dark .ig-admin *{color:inherit}
        .dark .ig-hero,.dark .ig-admin .ig-panel{background:#0F1D31;border-color:#1D3050;box-shadow:none}
        .dark .ig-field input,.dark .ig-field textarea,.dark .ig-field select,.dark .ig-media,.dark .ig-stat,.dark .ig-action.secondary,.dark .ig-item,.dark .ig-event,.dark .ig-code-card,.dark .ig-empty{
          background:#101B2D;border-color:#1D3050}
        .dark .ig-hero p,.dark .ig-stat strong,.dark .ig-panel h2,.dark .ig-item strong,.dark .ig-event strong{color:#F8FCFF}
        .dark .ig-panel h2{color:#EAF1FF}
        @media(max-width:1200px){
          .ig-grid{grid-template-columns:minmax(0,1fr)}
          .ig-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
          .ig-form-grid{grid-template-columns:1fr}
        }
        @media(max-width:760px){
          .ig-admin{padding:10px}
          .ig-hero{grid-template-columns:1fr;padding:16px}
          .ig-hero-tools{justify-content:stretch}
          .ig-hero-tools>*{width:100%}
          .ig-stats,.ig-actions{display:grid;grid-template-columns:1fr}
          .ig-stats .ig-stat strong{font-size:30px}
        }
      `}</style>
      <main className="ig-admin" dir={dir}>
        <section className="ig-hero">
          <div>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="ig-hero-tools">
            <span className="ig-badge-chip"><Instagram size={16} /> {text.admin}: <strong dir="ltr">{adminEmail}</strong></span>
            <LanguageSwitcher compact variant="dark" />
            <ThemeToggle />
            <button className="ig-action secondary" type="button" onClick={newDraft}>
              <Edit3 size={16} />
              {text.newDraft}
            </button>
          </div>
        </section>

        <section className="ig-stats" aria-label="instagram automation summary">
          <div className="ig-stat"><span>{text.statusDraft}</span><strong>{statusCounts.draft}</strong></div>
          <div className="ig-stat"><span>{text.statusPending}</span><strong>{statusCounts.approval}</strong></div>
          <div className="ig-stat"><span>{text.statusApproved}</span><strong>{statusCounts.approved}</strong></div>
          <div className="ig-stat"><span>{text.statusPublished}</span><strong>{statusCounts.published}</strong></div>
          <div className="ig-stat"><span>{text.statusFailed}</span><strong>{statusCounts.failed}</strong></div>
        </section>

        {needsAdminCode || message || error ? (
          <div className={`ig-banner ${needsAdminCode || error ? 'error' : 'ok'}`} role={needsAdminCode || error ? 'alert' : 'status'}>
            {needsAdminCode || error ? <><AlertCircle size={16} />{error || text.permissionMessage}</> : <>{message}</>}
          </div>
        ) : null}

        {needsAdminCode ? (
          <section className="ig-code-card">
            <h2>{text.adminCodeTitle}</h2>
            <p>{text.adminCodeDesc}</p>
            <p className="ig-subtle">{text.adminCodeHelp}</p>
            <form className="ig-code-row" onSubmit={submitAdminCode}>
              <input
                type="password"
                value={adminCode}
                onChange={event => setAdminCode(event.target.value)}
                placeholder={text.adminCodeLabel}
                dir="ltr"
                autoComplete="off"
              />
              <button className="ig-action primary" type="submit" disabled={submittingCode || !adminCode.trim()}>
                {submittingCode ? text.adminCodeRetry : text.adminCodeSubmit}
              </button>
            </form>
            {adminCodeError ? <strong>{adminCodeError}</strong> : null}
          </section>
        ) : null}

        <section className="ig-grid">
          <section className="ig-stack">
            <section className="ig-panel">
              <h2><Video size={17} />{text.preview}</h2>
              <div className="ig-media">
                {form.assetUrl ? (
                  isVideoUrl(form.assetUrl) ? (
                    <video controls src={form.assetUrl} />
                  ) : (
                    <img src={form.thumbnailUrl || form.assetUrl} alt={form.titles[activeLanguage] || form.topic || text.preview} />
                  )
                ) : (
                  <div className="ig-media-placeholder">
                    <UploadCloud size={30} />
                    <span>{text.assetUrl}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <strong>{form.titles[activeLanguage] || form.topic || text.titleField}</strong>
                <p style={{ margin: 0, color: 'var(--sfm-muted)', fontWeight: 900, lineHeight: 1.7 }}>
                  {form.captions[activeLanguage] || form.descriptions[activeLanguage] || '-'}
                </p>
                {form.assetUrl ? (
                  <a className="ig-action secondary" href={form.assetUrl} target="_blank" rel="noopener noreferrer nofollow">
                    <ExternalLink size={15} />{text.preview}
                  </a>
                ) : null}
              </div>
            </section>

            <section className="ig-panel">
              <h2><Clock3 size={17} />{text.timeline}</h2>
              <div className="ig-meta">
                <span className="ig-badge">مسودة: {selectedPost ? mapCodeToStatus(selectedPost.status, text) : '-'}</span>
                {selectedPost ? <span className="ig-badge">{text.platform}: {selectedPost.platform ?? 'instagram'}</span> : null}
                {selectedPost ? <span className="ig-badge">{text.language}: {selectedPost.language ?? 'ar'}</span> : null}
              </div>
              {selectedEvents.length === 0 ? (
                <div className="ig-empty"><div><Clock3 size={24} /><strong>{text.noEvents}</strong></div></div>
              ) : (
                <div className="ig-event-list">
                  {selectedEvents.map(event => (
                    <article key={event.id} className="ig-event">
                      <strong>{event.event_type}</strong>
                      <small>{dateLabel(event.created_at, lang)}</small>
                      {event.message ? <small>{event.message}</small> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="ig-panel">
            <form className="ig-form" onSubmit={saveDraft}>
              <div className="ig-meta" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{form.id ? text.updateDraft : text.newDraft}</h2>
                <ShieldCheck size={18} />
              </div>

              <div className="ig-form-grid">
                <label className="ig-field">
                  <span>{text.platform}</span>
                  <select
                    value={form.platform}
                    onChange={event => setForm(current => ({ ...current, platform: event.target.value }))}
                  >
                    {DEFAULT_PLATFORM_OPTIONS.map(platform => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ig-field">
                  <span>{text.language}</span>
                  <select
                    value={form.language}
                    onChange={event => {
                      const next = event.target.value as Lang;
                      setForm(current => ({ ...current, language: next }));
                      setActiveLanguage(next);
                    }}
                  >
                    {(['ar', 'en', 'fr'] as Lang[]).map(item => (
                      <option key={item} value={item}>
                        {text.languages[item]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ig-field wide">
                  <span>{text.topic}</span>
                  <input
                    dir="rtl"
                    value={form.topic}
                    placeholder="مثال: إطلاق حملة عيد المرأة"
                    onChange={event => setForm(current => ({ ...current, topic: event.target.value }))}
                    required
                  />
                </label>
                <label className="ig-field wide">
                  <span>{text.contentType}</span>
                  <select value={form.contentType} onChange={event => setForm(current => ({ ...current, contentType: event.target.value as ContentType }))}>
                    <option value="post">{text.contentTypes.post}</option>
                    <option value="reel">{text.contentTypes.reel}</option>
                    <option value="story">{text.contentTypes.story}</option>
                  </select>
                </label>
                <div className="ig-field wide">
                  <span>{text.notes}</span>
                  <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="أضف الملاحظات إن وجدت" />
                </div>
                <label className="ig-field wide">
                  <span>{text.titleField}</span>
                  <input
                    value={form.titles[activeLanguage]}
                    onChange={event => updateLocalized('titles', event.target.value)}
                    placeholder="عنوان واضح وموجز"
                  />
                </label>
                <label className="ig-field wide">
                  <span>{text.prompt}</span>
                  <textarea
                    value={form.assetPrompts[activeLanguage]}
                    onChange={event => updateLocalized('assetPrompts', event.target.value)}
                    placeholder="اكتب وصف مظهر الصورة المطلوبة"
                  />
                </label>
                <label className="ig-field wide">
                  <span>{text.caption}</span>
                  <textarea
                    value={form.captions[activeLanguage]}
                    onChange={event => updateLocalized('captions', event.target.value)}
                    placeholder="النص الرئيسي للصورة"
                  />
                </label>
                <label className="ig-field">
                  <span>{text.hashtags}</span>
                  <input
                    dir="ltr"
                    value={joinTags(form.hashtags[activeLanguage])}
                    onChange={event => updateTags(event.target.value)}
                    placeholder="#tag1 #tag2"
                  />
                </label>
                <label className="ig-field">
                  <span>{text.cta}</span>
                  <input
                    value={form.ctas[activeLanguage]}
                    onChange={event => updateLocalized('ctas', event.target.value)}
                    placeholder="مثال: تابع الرابط"
                  />
                </label>
                <label className="ig-field wide">
                  <span>{text.assetUrl}</span>
                  <input dir="ltr" value={form.assetUrl} onChange={event => setForm(current => ({ ...current, assetUrl: event.target.value }))} placeholder="https://..." />
                </label>
                <label className="ig-field">
                  <span>{text.thumbnailUrl}</span>
                  <input
                    dir="ltr"
                    value={form.thumbnailUrl}
                    onChange={event => setForm(current => ({ ...current, thumbnailUrl: event.target.value }))}
                    placeholder="رابط الصورة المصغرة"
                  />
                </label>
                <label className="ig-field wide">
                  <span>{text.templateProvider}</span>
                  <input
                    value={form.templateProvider}
                    onChange={event => setForm(current => ({ ...current, templateProvider: event.target.value }))}
                    placeholder="openai"
                  />
                </label>
                <label className="ig-field">
                  <span>{text.description}</span>
                  <textarea
                    value={form.descriptions[activeLanguage]}
                    onChange={event => updateLocalized('descriptions', event.target.value)}
                    placeholder="معلومات إضافية للمراجعة"
                  />
                </label>
              </div>

              <label className="ig-field wide">
                <span>نسخة الكتابة حسب اللغة</span>
                <div className="ig-tabs">
                  {(['ar', 'en', 'fr'] as Lang[]).map(item => (
                    <button
                      key={item}
                      type="button"
                      className={activeLanguage === item ? 'active' : ''}
                      onClick={() => {
                        setActiveLanguage(item);
                        setForm(current => ({ ...current, language: item }));
                      }}
                    >
                      {text.languages[item]}
                    </button>
                  ))}
                </div>
              </label>

              <div className="ig-actions">
                <button className="ig-action primary" type="submit" disabled={saving || needsAdminCode}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {form.id ? text.updateDraft : text.saveDraft}
                </button>
                <button className="ig-action secondary" type="button" disabled={saving || !form.id || needsAdminCode} onClick={sendForApproval}>
                  <Send size={16} /> {text.sendApproval}
                </button>
                <button className="ig-action secondary" type="button" disabled={saving || !selectedPost || needsAdminCode} onClick={publishDraft}>
                  <UploadCloud size={16} /> {text.publish}
                </button>
                <button className="ig-action secondary" type="button" disabled={saving || !selectedPost || needsAdminCode} onClick={approveDraft}>
                  <CheckCircle2 size={16} /> {text.approve}
                </button>
                <button className="ig-action secondary" type="button" disabled={saving || !selectedPost || needsAdminCode} onClick={rejectDraft}>
                  <XCircle size={16} /> {text.reject}
                </button>
                <button className="ig-action danger" type="button" disabled={saving || !selectedPost || needsAdminCode} onClick={deleteDraft}>
                  <Trash2 size={16} /> {text.deleteDraft}
                </button>
              </div>
            </form>
          </section>

          <section className="ig-panel">
            <div className="ig-meta" style={{ justifyContent: 'space-between' }}>
              <h2>{text.drafts}</h2>
              <button
                className="ig-action secondary"
                type="button"
                onClick={() => void load()}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
                تحديث
              </button>
            </div>

            {loading ? (
              <div className="ig-empty"><strong><Loader2 size={24} className="animate-spin" /></strong></div>
            ) : posts.length === 0 ? (
              <div className="ig-empty">
                <div>
                  <Video size={28} />
                  <strong>{text.noDraftsYet}</strong>
                  <p>{text.noDraftsBody}</p>
                </div>
              </div>
            ) : (
              <div className="ig-list">
                {posts.map(post => {
                  const postStatus = mapCodeToStatus(post.status, text);
                  return (
                    <button key={post.id} type="button" className={`ig-item ${selectedPost?.id === post.id ? 'active' : ''}`} onClick={() => setSelectedId(post.id)}>
                      <div className="ig-item-top">
                        <div className="left">
                          <strong>{post.titles[lang] || post.titles.ar || post.topic}</strong>
                        </div>
                        <span className={`ig-badge ${mapStatusTone(post.status)}`}>{postStatus}</span>
                      </div>
                      <small>{dateLabel(post.updated_at, lang)} • {text.contentTypes[post.content_type]}</small>
                      <small>{post.topic || '-'}</small>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </main>
    </AdminDashboardShell>
  );
}
