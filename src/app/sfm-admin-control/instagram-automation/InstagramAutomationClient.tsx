'use client';

/* eslint-disable @next/next/no-img-element */

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  Instagram,
  Loader2,
  Megaphone,
  PlayCircle,
  RefreshCw,
  Save,
  Send,
  Video,
  XCircle,
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
  rejected_at: string | null;
  published_at: string | null;
  review_notes: string | null;
  error_logs: unknown[];
  created_at: string;
  updated_at: string;
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
  retry: string;
  preview: string;
  drafts: string;
  emptyTitle: string;
  emptyBody: string;
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
  notes: string;
  timeline: string;
  noEvents: string;
  providerMissing: string;
  loadFailed: string;
  saved: string;
  notConfigured: string;
  languages: Record<Lang, string>;
  contentTypes: Record<ContentType, string>;
  statuses: Record<Status, string>;
};

const COPY: Record<Lang, Copy> = {
  ar: {
    title: 'أتمتة محتوى إنستغرام',
    subtitle: 'إدارة مسار إنشاء المحتوى وإرساله للموافقة ثم نشره من لوحة إدارة المنصة.',
    admin: 'المشرف',
    newDraft: 'مسودة جديدة',
    saveDraft: 'حفظ المسودة',
    updateDraft: 'تحديث المسودة',
    sendApproval: 'إرسال للموافقة',
    approve: 'اعتماد',
    reject: 'رفض',
    publish: 'نشر',
    retry: 'إعادة المحاولة',
    preview: 'معاينة',
    drafts: 'المسودات والمهام',
    emptyTitle: 'لا توجد مسودات حتى الآن',
    emptyBody: 'أنشئ مسودة حقيقية عند توفر موضوع ومحتوى جاهز. لن يتم عرض أي بيانات تجريبية.',
    topic: 'الموضوع',
    contentType: 'نوع المحتوى',
    titleField: 'العنوان',
    prompt: 'وصف الأصل المرئي',
    caption: 'التعليق',
    description: 'الوصف',
    hashtags: 'الوسوم',
    cta: 'دعوة الإجراء',
    assetUrl: 'رابط الأصل',
    thumbnailUrl: 'رابط الصورة المصغرة',
    templateProvider: 'مزود القالب',
    notes: 'ملاحظات المراجعة',
    timeline: 'سجل النشاط',
    noEvents: 'لا توجد أحداث لهذه المسودة بعد.',
    providerMissing: 'مزود الموافقات أو النشر غير مهيأ على الخادم.',
    loadFailed: 'تعذر تحميل بيانات أتمتة إنستغرام.',
    saved: 'تم حفظ المسودة.',
    notConfigured: 'المزود غير مهيأ',
    languages: { ar: 'العربية', en: 'الإنجليزية', fr: 'الفرنسية' },
    contentTypes: { reel: 'ريل', post: 'منشور', story: 'قصة' },
    statuses: {
      draft: 'مسودة',
      approval_pending: 'بانتظار الموافقة',
      approved: 'معتمد',
      rejected: 'مرفوض',
      publishing: 'قيد النشر',
      published: 'منشور',
      failed: 'فشل',
    },
  },
  en: {
    title: 'Instagram Automation',
    subtitle: 'Manage the generate, approval, and publishing workflow from Platform Admin.',
    admin: 'Admin',
    newDraft: 'New draft',
    saveDraft: 'Save draft',
    updateDraft: 'Update draft',
    sendApproval: 'Send for approval',
    approve: 'Approve',
    reject: 'Reject',
    publish: 'Publish',
    retry: 'Retry',
    preview: 'Preview',
    drafts: 'Drafts and jobs',
    emptyTitle: 'No drafts yet',
    emptyBody: 'Create a real draft when content is ready. No demo records are shown.',
    topic: 'Topic',
    contentType: 'Content type',
    titleField: 'Title',
    prompt: 'Asset prompt',
    caption: 'Caption',
    description: 'Description',
    hashtags: 'Hashtags',
    cta: 'CTA',
    assetUrl: 'Asset URL',
    thumbnailUrl: 'Thumbnail URL',
    templateProvider: 'Template provider',
    notes: 'Review notes',
    timeline: 'Activity log',
    noEvents: 'No events for this draft yet.',
    providerMissing: 'The approval or publishing provider is not configured on the server.',
    loadFailed: 'Unable to load Instagram automation data.',
    saved: 'Draft saved.',
    notConfigured: 'Provider not configured',
    languages: { ar: 'Arabic', en: 'English', fr: 'French' },
    contentTypes: { reel: 'Reel', post: 'Post', story: 'Story' },
    statuses: {
      draft: 'Draft',
      approval_pending: 'Approval pending',
      approved: 'Approved',
      rejected: 'Rejected',
      publishing: 'Publishing',
      published: 'Published',
      failed: 'Failed',
    },
  },
  fr: {
    title: 'Automatisation Instagram',
    subtitle: 'Gérez la création, la validation et la publication depuis l’administration.',
    admin: 'Administrateur',
    newDraft: 'Nouveau brouillon',
    saveDraft: 'Enregistrer',
    updateDraft: 'Mettre à jour',
    sendApproval: 'Envoyer pour validation',
    approve: 'Valider',
    reject: 'Refuser',
    publish: 'Publier',
    retry: 'Réessayer',
    preview: 'Aperçu',
    drafts: 'Brouillons et tâches',
    emptyTitle: 'Aucun brouillon',
    emptyBody: 'Créez un brouillon réel lorsque le contenu est prêt. Aucune donnée de démonstration n’est affichée.',
    topic: 'Sujet',
    contentType: 'Type',
    titleField: 'Titre',
    prompt: 'Prompt visuel',
    caption: 'Légende',
    description: 'Description',
    hashtags: 'Hashtags',
    cta: 'CTA',
    assetUrl: 'URL du média',
    thumbnailUrl: 'URL miniature',
    templateProvider: 'Fournisseur de modèle',
    notes: 'Notes de revue',
    timeline: 'Journal',
    noEvents: 'Aucun événement pour ce brouillon.',
    providerMissing: 'Le fournisseur de validation ou de publication n’est pas configuré côté serveur.',
    loadFailed: 'Impossible de charger les données Instagram.',
    saved: 'Brouillon enregistré.',
    notConfigured: 'Fournisseur non configuré',
    languages: { ar: 'Arabe', en: 'Anglais', fr: 'Français' },
    contentTypes: { reel: 'Reel', post: 'Post', story: 'Story' },
    statuses: {
      draft: 'Brouillon',
      approval_pending: 'En validation',
      approved: 'Validé',
      rejected: 'Refusé',
      publishing: 'Publication',
      published: 'Publié',
      failed: 'Échec',
    },
  },
};

const EMPTY_TEXT: LocalizedText = { ar: '', en: '', fr: '' };
const EMPTY_LIST: LocalizedList = { ar: [], en: [], fr: [] };

function emptyForm(): FormState {
  return {
    id: '',
    contentType: 'post',
    topic: '',
    titles: { ...EMPTY_TEXT },
    assetPrompts: { ...EMPTY_TEXT },
    captions: { ...EMPTY_TEXT },
    descriptions: { ...EMPTY_TEXT },
    hashtags: { ar: [], en: [], fr: [] },
    ctas: { ...EMPTY_TEXT },
    assetUrl: '',
    thumbnailUrl: '',
    templateProvider: '',
  };
}

function splitTags(value: string) {
  return value.split(/[,\s]+/).map(item => item.trim()).filter(Boolean);
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

function statusTone(status: Status) {
  if (status === 'published' || status === 'approved') return 'good';
  if (status === 'failed' || status === 'rejected') return 'bad';
  if (status === 'approval_pending' || status === 'publishing') return 'warn';
  return 'neutral';
}

function isVideoUrl(url?: string | null) {
  return Boolean(url && /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url));
}

export default function InstagramAutomationClient({ adminEmail }: { adminEmail: string }) {
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

  const selectedPost = useMemo(() => posts.find(post => post.id === selectedId) ?? posts[0] ?? null, [posts, selectedId]);
  const selectedEvents = useMemo(
    () => selectedPost ? events.filter(event => event.post_id === selectedPost.id) : [],
    [events, selectedPost],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/instagram-automation/list', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(String(payload.code || 'LOAD_FAILED'));
      setPosts(payload.posts ?? []);
      setEvents(payload.events ?? []);
      if (!selectedId && payload.posts?.[0]?.id) setSelectedId(payload.posts[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'LOAD_FAILED');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedPost) return;
    setForm({
      id: selectedPost.id,
      contentType: selectedPost.content_type,
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
    });
    setNotes(selectedPost.review_notes ?? '');
  }, [selectedPost]);

  function updateLocalized(field: 'titles' | 'assetPrompts' | 'captions' | 'descriptions' | 'ctas', value: string) {
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

  async function callAction(path: string, body: Record<string, unknown>) {
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
      if (!response.ok || !payload.ok) throw new Error(String(payload.code || 'REQUEST_FAILED'));
      await load();
      if (payload.post?.id) setSelectedId(payload.post.id);
      setMessage(text.saved);
      return true;
    } catch (err) {
      const code = err instanceof Error ? err.message : 'REQUEST_FAILED';
      setError(code.includes('NOT_CONFIGURED') || code.includes('TELEGRAM') ? text.providerMissing : code);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    await callAction('/api/instagram-automation/create-draft', form);
  }

  function newDraft() {
    setSelectedId('');
    setForm(emptyForm());
    setNotes('');
    setMessage('');
    setError('');
  }

  const statusCounts = useMemo(() => ({
    draft: posts.filter(post => post.status === 'draft').length,
    approval: posts.filter(post => post.status === 'approval_pending').length,
    published: posts.filter(post => post.status === 'published').length,
    failed: posts.filter(post => post.status === 'failed').length,
  }), [posts]);

  return (
    <AdminDashboardShell
      ariaLabel={text.title}
      contentClassName="instagram-admin-content"
    >
      <style>{`
        .instagram-admin-content{width:100%!important;max-width:none!important;min-width:0!important}
        .ig-admin{width:100%;max-width:1440px;margin-inline:auto;padding:24px;display:grid;gap:18px;min-width:0;color:var(--sfm-foreground)}
        .ig-hero{border:1px solid rgba(47,214,192,.2);background:linear-gradient(135deg,#031225,#0A2E4D 58%,#0F766E);color:#fff;border-radius:24px;padding:22px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;box-shadow:0 18px 44px rgba(3,18,37,.18);overflow:hidden}
        .ig-hero h1{margin:0;font-size:clamp(26px,4vw,40px);font-weight:950;letter-spacing:0}
        .ig-hero p{margin:8px 0 0;color:rgba(234,246,255,.78);font-weight:800;line-height:1.7;max-width:760px}
        .ig-hero-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
        .ig-admin-chip{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);color:#fff;border-radius:999px;min-height:40px;padding:0 12px;display:inline-flex;align-items:center;gap:8px;font-weight:900;font-size:12px}
        .ig-primary,.ig-secondary,.ig-danger{min-height:42px;border-radius:14px;border:0;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;text-decoration:none;transition:transform .16s ease,box-shadow .16s ease,opacity .16s ease}
        .ig-primary{background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#fff;box-shadow:0 12px 24px rgba(29,140,255,.2)}
        .ig-secondary{background:var(--sfm-card);color:var(--sfm-primary-hover);border:1px solid rgba(29,140,255,.18)}
        .ig-danger{background:#FFF1F2;color:#BE123C;border:1px solid rgba(190,18,60,.18)}
        .ig-primary:hover,.ig-secondary:hover,.ig-danger:hover,.ig-primary:focus-visible,.ig-secondary:focus-visible,.ig-danger:focus-visible{transform:translateY(-1px);outline:0;box-shadow:0 0 0 3px rgba(24,212,212,.18)}
        .ig-primary:disabled,.ig-secondary:disabled,.ig-danger:disabled{opacity:.58;cursor:not-allowed;transform:none}
        .ig-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;min-width:0}
        .ig-stat{border:1px solid rgba(29,140,255,.12);background:var(--sfm-card);border-radius:18px;padding:15px;display:grid;gap:6px;min-width:0;box-shadow:0 12px 30px rgba(3,18,37,.06)}
        .ig-stat span{color:var(--sfm-muted);font-size:12px;font-weight:900}
        .ig-stat strong{font-size:28px;font-weight:950;color:var(--sfm-primary-dark);line-height:1}
        .ig-layout{display:grid;grid-template-columns:minmax(320px,.78fr) minmax(0,1.4fr) minmax(300px,.82fr);gap:14px;align-items:start;min-width:0}
        .ig-panel{border:1px solid rgba(29,140,255,.12);background:var(--sfm-card);border-radius:20px;padding:16px;box-shadow:0 12px 32px rgba(3,18,37,.06);min-width:0}
        .ig-panel h2,.ig-panel h3{margin:0;color:var(--sfm-midnight);font-weight:950}
        .ig-panel h2{font-size:18px}.ig-panel h3{font-size:16px}
        .ig-list{display:grid;gap:8px;margin-top:12px;max-height:680px;overflow:auto;padding-inline-end:2px}
        .ig-row{width:100%;border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:15px;padding:12px;display:grid;gap:8px;text-align:start;cursor:pointer;color:var(--sfm-foreground)}
        .ig-row.active{border-color:rgba(47,214,192,.45);box-shadow:0 0 0 3px rgba(47,214,192,.12);background:linear-gradient(135deg,rgba(47,214,192,.12),rgba(29,140,255,.06))}
        .ig-row strong{font-size:14px;color:var(--sfm-midnight);overflow-wrap:anywhere}
        .ig-row small{color:var(--sfm-muted);font-weight:800}
        .ig-badges{display:flex;gap:6px;flex-wrap:wrap}
        .ig-badge{border-radius:999px;padding:5px 8px;font-size:11px;font-weight:950;border:1px solid rgba(29,140,255,.12);background:#fff;color:var(--sfm-primary-hover)}
        .ig-badge.good{background:#ECFDF5;color:#047857;border-color:#A7F3D0}.ig-badge.warn{background:#FFFBEB;color:#B45309;border-color:#FDE68A}.ig-badge.bad{background:#FFF1F2;color:#BE123C;border-color:#FECDD3}.ig-badge.neutral{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE}
        .ig-form{display:grid;gap:12px}
        .ig-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .ig-field{display:grid;gap:6px;min-width:0}
        .ig-field.wide{grid-column:1/-1}
        .ig-field span{font-size:12px;font-weight:950;color:var(--sfm-muted)}
        .ig-field input,.ig-field textarea,.ig-field select{width:100%;min-width:0;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:13px;min-height:42px;padding:10px 12px;font:850 13px Tajawal,Arial,sans-serif;outline:none}
        .ig-field textarea{min-height:92px;resize:vertical;line-height:1.55}
        .ig-field input:focus,.ig-field textarea:focus,.ig-field select:focus{border-color:rgba(47,214,192,.55);box-shadow:0 0 0 3px rgba(47,214,192,.13)}
        .ig-lang-tabs{display:flex;gap:7px;flex-wrap:wrap}
        .ig-lang-tabs button{min-height:36px;border-radius:999px;border:1px solid rgba(29,140,255,.14);background:var(--sfm-light-card);color:var(--sfm-primary-hover);padding:0 11px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .ig-lang-tabs button.active{background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#fff;border:0}
        .ig-actions{display:flex;gap:8px;flex-wrap:wrap}
        .ig-preview{display:grid;gap:12px}
        .ig-media{border:1px solid rgba(29,140,255,.12);background:var(--sfm-light-card);border-radius:18px;min-height:220px;display:grid;place-items:center;overflow:hidden;position:relative}
        .ig-media img,.ig-media video{width:100%;height:100%;max-height:360px;object-fit:cover}
        .ig-media-placeholder{display:grid;place-items:center;gap:8px;color:var(--sfm-muted);text-align:center;padding:24px;font-weight:900}
        .ig-preview-text{display:grid;gap:8px}
        .ig-preview-text strong{font-size:18px;color:var(--sfm-midnight);overflow-wrap:anywhere}
        .ig-preview-text p{margin:0;color:var(--sfm-muted);font-weight:800;line-height:1.7;overflow-wrap:anywhere}
        .ig-event-list{display:grid;gap:8px;margin-top:12px;max-height:320px;overflow:auto}
        .ig-event{border:1px solid rgba(29,140,255,.1);background:var(--sfm-light-card);border-radius:14px;padding:10px;display:grid;gap:4px}
        .ig-event strong{font-size:12px;color:var(--sfm-midnight)}.ig-event small{font-size:11px;color:var(--sfm-muted);font-weight:800}
        .ig-empty{min-height:260px;border:1px dashed rgba(29,140,255,.24);background:var(--sfm-light-card);border-radius:18px;padding:26px;display:grid;place-items:center;text-align:center;color:var(--sfm-muted)}
        .ig-empty div{display:grid;gap:8px;max-width:420px}.ig-empty strong{color:var(--sfm-midnight);font-size:18px}
        .ig-message{border-radius:14px;padding:11px 12px;font-size:13px;font-weight:900}.ig-message.ok{background:#ECFDF5;color:#047857}.ig-message.error{background:#FFF1F2;color:#BE123C}
        .dark .ig-stat,.dark .ig-panel{background:#0F1D31;border-color:#1D3050;box-shadow:none}.dark .ig-row,.dark .ig-field input,.dark .ig-field textarea,.dark .ig-field select,.dark .ig-media,.dark .ig-event,.dark .ig-empty,.dark .ig-secondary,.dark .ig-lang-tabs button{background:#101B2D;border-color:#1D3050;color:#E8EEF6}.dark .ig-panel h2,.dark .ig-panel h3,.dark .ig-row strong,.dark .ig-stat strong,.dark .ig-preview-text strong,.dark .ig-event strong,.dark .ig-empty strong{color:#F8FCFF}.dark .ig-badge{background:#132238;border-color:#1D3050;color:#D5F8FF}.dark .ig-preview-text p,.dark .ig-field span,.dark .ig-row small,.dark .ig-event small{color:#A9B8CA}
        @media(max-width:1180px){.ig-layout{grid-template-columns:minmax(0,1fr)}.ig-list{max-height:none}.ig-preview{grid-template-columns:1fr 1fr}.ig-preview .ig-event-panel{grid-column:1/-1}}
        @media(max-width:760px){.ig-admin{padding:16px}.ig-hero{grid-template-columns:1fr;border-radius:20px}.ig-hero-actions{justify-content:stretch}.ig-hero-actions>*{width:100%;justify-content:center}.ig-stats,.ig-form-grid,.ig-preview{grid-template-columns:1fr}.ig-actions{display:grid}.ig-actions button{width:100%}}
      `}</style>
      <main className="ig-admin" dir={dir}>
        <section className="ig-hero">
          <div>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </div>
          <div className="ig-hero-actions">
            <span className="ig-admin-chip"><Instagram size={16} /> {text.admin}: <b dir="ltr">{adminEmail}</b></span>
            <LanguageSwitcher compact variant="dark" />
            <ThemeToggle />
            <button className="ig-primary" type="button" onClick={newDraft}>
              <Edit3 size={16} /> {text.newDraft}
            </button>
          </div>
        </section>

        <section className="ig-stats" aria-label="Instagram automation summary">
          <div className="ig-stat"><span>{text.statuses.draft}</span><strong>{statusCounts.draft}</strong></div>
          <div className="ig-stat"><span>{text.statuses.approval_pending}</span><strong>{statusCounts.approval}</strong></div>
          <div className="ig-stat"><span>{text.statuses.published}</span><strong>{statusCounts.published}</strong></div>
          <div className="ig-stat"><span>{text.statuses.failed}</span><strong>{statusCounts.failed}</strong></div>
        </section>

        {message ? <div className="ig-message ok" role="status">{message}</div> : null}
        {error ? <div className="ig-message error" role="alert">{error === 'LOAD_FAILED' ? text.loadFailed : error}</div> : null}

        <section className="ig-layout">
          <aside className="ig-panel">
            <div className="ig-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{text.drafts}</h2>
              <button className="ig-secondary" type="button" onClick={load} disabled={loading}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              </button>
            </div>
            {loading ? (
              <div className="ig-empty"><div><Loader2 size={28} className="animate-spin" /><strong>{text.drafts}</strong></div></div>
            ) : posts.length === 0 ? (
              <div className="ig-empty">
                <div>
                  <Megaphone size={34} />
                  <strong>{text.emptyTitle}</strong>
                  <p>{text.emptyBody}</p>
                </div>
              </div>
            ) : (
              <div className="ig-list">
                {posts.map(post => (
                  <button
                    key={post.id}
                    type="button"
                    className={`ig-row${selectedPost?.id === post.id ? ' active' : ''}`}
                    onClick={() => setSelectedId(post.id)}
                  >
                    <div className="ig-badges">
                      <span className={`ig-badge ${statusTone(post.status)}`}>{text.statuses[post.status]}</span>
                      <span className="ig-badge">{text.contentTypes[post.content_type]}</span>
                    </div>
                    <strong>{post.titles[lang] || post.titles.ar || post.topic}</strong>
                    <small>{dateLabel(post.updated_at, lang)}</small>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="ig-panel">
            <form className="ig-form" onSubmit={saveDraft}>
              <div className="ig-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{form.id ? text.updateDraft : text.newDraft}</h2>
                <div className="ig-lang-tabs">
                  {(['ar', 'en', 'fr'] as Lang[]).map(item => (
                    <button key={item} type="button" className={activeLanguage === item ? 'active' : ''} onClick={() => setActiveLanguage(item)}>
                      {text.languages[item]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ig-form-grid">
                <label className="ig-field">
                  <span>{text.topic}</span>
                  <input value={form.topic} onChange={event => setForm(current => ({ ...current, topic: event.target.value }))} required />
                </label>
                <label className="ig-field">
                  <span>{text.contentType}</span>
                  <select value={form.contentType} onChange={event => setForm(current => ({ ...current, contentType: event.target.value as ContentType }))}>
                    <option value="post">{text.contentTypes.post}</option>
                    <option value="reel">{text.contentTypes.reel}</option>
                    <option value="story">{text.contentTypes.story}</option>
                  </select>
                </label>
                <label className="ig-field wide">
                  <span>{text.titleField}</span>
                  <input value={form.titles[activeLanguage]} onChange={event => updateLocalized('titles', event.target.value)} />
                </label>
                <label className="ig-field wide">
                  <span>{text.prompt}</span>
                  <textarea value={form.assetPrompts[activeLanguage]} onChange={event => updateLocalized('assetPrompts', event.target.value)} />
                </label>
                <label className="ig-field wide">
                  <span>{text.caption}</span>
                  <textarea value={form.captions[activeLanguage]} onChange={event => updateLocalized('captions', event.target.value)} />
                </label>
                <label className="ig-field wide">
                  <span>{text.description}</span>
                  <textarea value={form.descriptions[activeLanguage]} onChange={event => updateLocalized('descriptions', event.target.value)} />
                </label>
                <label className="ig-field">
                  <span>{text.hashtags}</span>
                  <input dir="ltr" value={joinTags(form.hashtags[activeLanguage])} onChange={event => updateTags(event.target.value)} />
                </label>
                <label className="ig-field">
                  <span>{text.cta}</span>
                  <input value={form.ctas[activeLanguage]} onChange={event => updateLocalized('ctas', event.target.value)} />
                </label>
                <label className="ig-field wide">
                  <span>{text.assetUrl}</span>
                  <input dir="ltr" value={form.assetUrl} onChange={event => setForm(current => ({ ...current, assetUrl: event.target.value }))} />
                </label>
                <label className="ig-field">
                  <span>{text.thumbnailUrl}</span>
                  <input dir="ltr" value={form.thumbnailUrl} onChange={event => setForm(current => ({ ...current, thumbnailUrl: event.target.value }))} />
                </label>
                <label className="ig-field">
                  <span>{text.templateProvider}</span>
                  <input value={form.templateProvider} onChange={event => setForm(current => ({ ...current, templateProvider: event.target.value }))} />
                </label>
              </div>
              <div className="ig-actions">
                <button className="ig-primary" type="submit" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {form.id ? text.updateDraft : text.saveDraft}
                </button>
                {form.id ? (
                  <>
                    <button className="ig-secondary" type="button" disabled={saving || selectedPost?.status === 'published'} onClick={() => callAction('/api/instagram-automation/send-approval', { id: form.id })}>
                      <Send size={16} /> {text.sendApproval}
                    </button>
                    <button className="ig-secondary" type="button" disabled={saving || selectedPost?.status === 'published'} onClick={() => callAction('/api/instagram-automation/approve', { id: form.id, notes })}>
                      <CheckCircle2 size={16} /> {text.approve}
                    </button>
                    <button className="ig-danger" type="button" disabled={saving || selectedPost?.status === 'published'} onClick={() => callAction('/api/instagram-automation/reject', { id: form.id, notes })}>
                      <XCircle size={16} /> {text.reject}
                    </button>
                    <button className="ig-primary" type="button" disabled={saving || !['approved', 'failed'].includes(selectedPost?.status ?? 'draft')} onClick={() => callAction('/api/instagram-automation/publish', { id: form.id, language: activeLanguage })}>
                      <PlayCircle size={16} /> {selectedPost?.status === 'failed' ? text.retry : text.publish}
                    </button>
                  </>
                ) : null}
              </div>
              <label className="ig-field">
                <span>{text.notes}</span>
                <textarea value={notes} onChange={event => setNotes(event.target.value)} />
              </label>
            </form>
          </section>

          <aside className="ig-preview">
            <section className="ig-panel">
              <h3>{text.preview}</h3>
              <div className="ig-media" style={{ marginTop: 12 }}>
                {form.assetUrl ? (
                  isVideoUrl(form.assetUrl) ? (
                    <video controls src={form.assetUrl} />
                  ) : (
                    <img src={form.thumbnailUrl || form.assetUrl} alt={form.titles[activeLanguage] || form.topic || text.preview} />
                  )
                ) : (
                  <div className="ig-media-placeholder">
                    <Video size={34} />
                    <span>{text.assetUrl}</span>
                  </div>
                )}
              </div>
              <div className="ig-preview-text" style={{ marginTop: 12 }}>
                <strong>{form.titles[activeLanguage] || form.topic || text.titleField}</strong>
                <p>{form.captions[activeLanguage] || form.descriptions[activeLanguage] || '-'}</p>
                {form.assetUrl ? (
                  <a className="ig-secondary" href={form.assetUrl} target="_blank" rel="noopener noreferrer nofollow">
                    <ExternalLink size={15} /> {text.preview}
                  </a>
                ) : null}
              </div>
            </section>
            <section className="ig-panel ig-event-panel">
              <h3>{text.timeline}</h3>
              {selectedEvents.length === 0 ? (
                <div className="ig-empty" style={{ minHeight: 160 }}><div><Clock3 size={24} /><p>{text.noEvents}</p></div></div>
              ) : (
                <div className="ig-event-list">
                  {selectedEvents.map(event => (
                    <div key={event.id} className="ig-event">
                      <strong>{event.event_type}</strong>
                      <small>{dateLabel(event.created_at, lang)}</small>
                      {event.message ? <small>{event.message}</small> : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>
      </main>
    </AdminDashboardShell>
  );
}
