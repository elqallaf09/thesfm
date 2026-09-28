'use client';

import { SFMerProfile } from '@/components/platform/SFMerProfile';
import { useCallback, useRef, useState } from 'react';
import {
  Ban,
  Check,
  Clipboard,
  Copy,
  Flag,
  MessageCircle,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { usePrivateResource } from '@/components/platform/usePrivateResource';
import { platformCopy, platformLanguage } from '@/components/platform/copy';
import styles from '@/components/platform/platform.module.css';

type CommunityProfile = { user_id: string; handle: string; display_name: string; bio: string };
type Post = { id: string; author_id: string; display_name: string; body: string; created_at: string };

const copy = {
  ar: {
    title: 'SFMer',
    eyebrow: 'مجتمع THE SFM',
    heading: 'مساحة هادئة للأفكار المالية التي تستحق النقاش',
    note: 'شارك قراءة أو سؤالاً أو فكرة واضحة مع الأعضاء المسجلين. تظهر الأسماء كما يختارها أصحابها ولا تمثل توثيقاً للهوية أو الخبرة.',
    memberOnly: 'المحتوى يظهر للأعضاء المسجلين فقط',
    name: 'اسم النشر', nameHint: 'الاسم الذي سيظهر مع منشورك', body: 'فكرتك أو سؤالك', bodyHint: 'اكتب السياق الذي يحتاجه القارئ ليفهم فكرتك…',
    publish: 'نشر للأعضاء', publishing: 'جارٍ النشر…', consent: 'أوافق على إظهار هذا النص واسم النشر للأعضاء المسجلين.', consentTitle: 'تأكيد النشر للأعضاء', consentHint: 'لا تضف أرقام حسابات أو محافظ خاصة، ولا تعتمد على المنشورات وحدها لاتخاذ قرار استثماري.',
    compose: 'اكتب منشوراً', composeHint: 'أضف سياقاً قصيراً، وحدد السؤال أو الملاحظة بوضوح.', promptQuestion: 'اطرح سؤالاً', promptIdea: 'شارك قراءة', promptWatch: 'لفتة متابعة',
    questionDraft: 'ما أثر هذا التغير في السوق على القطاعات المرتبطة به؟ وما المؤشرات التي تتابعونها؟', ideaDraft: 'قراءة أولية: أرى أن الخبر يحتاج إلى متابعة عبر البيانات التالية قبل بناء أي قرار.', watchDraft: 'نقطة متابعة للأسبوع: سأراقب هذا المؤشر وأشارك ما يتغير مع صدور البيانات التالية.',
    report: 'إبلاغ وإخفاء', reason: 'سبب الإبلاغ (5–500 حرف)', block: 'حظر الكاتب', unblock: 'إلغاء الحظر', blocked: 'الحسابات المحظورة', newest: 'أحدث المنشورات', feedHint: 'الأحدث أولاً · اقْرأ السياق قبل التفاعل', previous: 'السابق', next: 'التالي', edit: 'تعديل', delete: 'حذف', cancel: 'إلغاء', copy: 'نسخ', copied: 'تم النسخ',
    noPostsTitle: 'ابدأ أول نقاش في المساحة', noPostsBody: 'شارك سؤالاً محدداً أو قراءة موجزة. المنشور الأفضل يوضح المعلومة التي تنطلق منها وما الذي تريد من الأعضاء مناقشته.', startPost: 'اكتب أول منشور', profile: 'ملفك العام', member: 'عضو في المجتمع', reportOpen: 'اكتب سبباً يساعد فريق الإشراف على المراجعة.', editOpen: 'أنت تعدّل هذا المنشور الآن.',
  },
  en: {
    title: 'SFMer', eyebrow: 'THE SFM community', heading: 'A calmer place for financial ideas worth discussing', note: 'Share a reading, a question, or a well-framed idea with signed-in members. Display names are self-chosen and do not verify identity or expertise.', memberOnly: 'Visible to signed-in members only',
    name: 'Display name', nameHint: 'The name shown alongside your post', body: 'Your idea or question', bodyHint: 'Give readers the context they need to understand your point…', publish: 'Publish to members', publishing: 'Publishing…', consent: 'I agree to show this text and display name to signed-in members.', consentTitle: 'Confirm member-only publishing', consentHint: 'Do not add private account or portfolio details, and do not rely on posts alone for investment decisions.',
    compose: 'Write a post', composeHint: 'Add concise context and make the question or observation clear.', promptQuestion: 'Ask a question', promptIdea: 'Share a read', promptWatch: 'Watch item', questionDraft: 'How could this market move affect the sectors linked to it, and which indicators are you watching?', ideaDraft: 'Initial read: I think this development needs to be checked against the following data before it informs a decision.', watchDraft: 'A point for the week: I will watch this indicator and share what changes when the next data release arrives.',
    report: 'Report and hide', reason: 'Report reason (5–500 characters)', block: 'Block author', unblock: 'Unblock', blocked: 'Blocked accounts', newest: 'Latest posts', feedHint: 'Newest first · read the context before responding', previous: 'Previous', next: 'Next', edit: 'Edit', delete: 'Delete', cancel: 'Cancel', copy: 'Copy', copied: 'Copied',
    noPostsTitle: 'Start the first discussion here', noPostsBody: 'Share a specific question or a concise read. The strongest post states what it is based on and what you want members to discuss.', startPost: 'Write the first post', profile: 'Your public profile', member: 'Community member', reportOpen: 'Add a reason that helps the moderation team review this post.', editOpen: 'You are editing this post now.',
  },
  fr: {
    title: 'SFMer', eyebrow: 'Communauté THE SFM', heading: 'Un espace plus calme pour les idées financières qui méritent débat', note: 'Partagez une lecture, une question ou une idée bien formulée avec les membres connectés. Les noms affichés sont choisis par leurs auteurs et ne vérifient ni identité ni expertise.', memberOnly: 'Visible uniquement aux membres connectés',
    name: 'Nom affiché', nameHint: 'Le nom qui accompagne votre publication', body: 'Votre idée ou votre question', bodyHint: 'Donnez le contexte nécessaire pour comprendre votre point de vue…', publish: 'Publier pour les membres', publishing: 'Publication…', consent: 'J’accepte de montrer ce texte et mon nom affiché aux membres connectés.', consentTitle: 'Confirmer la publication réservée aux membres', consentHint: 'N’ajoutez pas de données privées de compte ou de portefeuille et ne fondez pas une décision d’investissement uniquement sur ces publications.',
    compose: 'Écrire une publication', composeHint: 'Ajoutez un contexte concis et formulez clairement la question ou l’observation.', promptQuestion: 'Poser une question', promptIdea: 'Partager une lecture', promptWatch: 'Point à suivre', questionDraft: 'Comment ce mouvement de marché peut-il affecter les secteurs liés, et quels indicateurs suivez-vous ?', ideaDraft: 'Lecture initiale : ce développement doit être vérifié avec les données suivantes avant d’éclairer une décision.', watchDraft: 'Point de la semaine : je suivrai cet indicateur et partagerai les changements à la prochaine publication de données.',
    report: 'Signaler et masquer', reason: 'Motif du signalement (5–500 caractères)', block: 'Bloquer l’auteur', unblock: 'Débloquer', blocked: 'Comptes bloqués', newest: 'Publications récentes', feedHint: 'Les plus récentes d’abord · lisez le contexte avant de réagir', previous: 'Précédent', next: 'Suivant', edit: 'Modifier', delete: 'Supprimer', cancel: 'Annuler', copy: 'Copier', copied: 'Copié',
    noPostsTitle: 'Lancez la première discussion', noPostsBody: 'Partagez une question précise ou une lecture concise. Une publication utile indique sa base et ce que vous souhaitez discuter avec les membres.', startPost: 'Écrire la première publication', profile: 'Votre profil public', member: 'Membre de la communauté', reportOpen: 'Ajoutez un motif utile à l’équipe de modération.', editOpen: 'Vous modifiez cette publication.',
  },
};

function localeFor(language: 'ar' | 'en' | 'fr') {
  return language === 'ar' ? 'ar-KW' : language === 'fr' ? 'fr-FR' : 'en-GB';
}

function initials(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || 'S';
}

export default function SFMerPage() {
  const { lang } = useLanguage();
  const language = platformLanguage(lang);
  const text = copy[language];
  const common = platformCopy[language];
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [cursors, setCursors] = useState<Array<{ id: string; created_at: string }>>([]);
  const cursor = cursors.at(-1);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async (userId: string) => {
    let query = supabase.from('sfmer_posts').select('id,author_id,display_name,body,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(21);
    if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    const [posts, blocks] = await Promise.all([query, supabase.from('sfmer_blocks').select('blocked_user_id').eq('user_id', userId).limit(100)]);
    if (posts.error || blocks.error) throw new Error('LOAD_FAILED');
    const ids = [...new Set(posts.data.map((post) => String(post.author_id)))];
    const profiles = ids.length ? await supabase.from('sfmer_profiles').select('user_id,handle,display_name,bio').in('user_id', ids) : { data: [], error: null };
    if (profiles.error) throw new Error('LOAD_FAILED');
    return { posts: posts.data as Post[], blocks: blocks.data as Array<{ blocked_user_id: string }>, profiles: profiles.data as CommunityProfile[] };
  }, [cursor]);

  const { userId, data, loading, error, refresh } = usePrivateResource(load);

  async function act(action: string, target?: string, value?: string) {
    if (!userId || busy) return;
    setBusy(true); setFailed(false);
    try {
      const result = await supabase.rpc('sfmer_action', { p_action: action, p_target: target ?? null, p_body: value ?? null, p_name: name.trim() });
      if (result.error) throw result.error;
      if (action === 'publish' || action === 'edit') { setBody(''); setConsent(false); setEditing(null); }
      setReport(null); setReason(''); await refresh();
    } catch { setFailed(true); } finally { setBusy(false); }
  }

  function setPrompt(value: string) {
    setBody(value);
    window.requestAnimationFrame(() => bodyRef.current?.focus());
  }

  async function copyPost(post: Post) {
    try {
      await navigator.clipboard.writeText(`${post.display_name}\n\n${post.body}`);
      setCopied(post.id);
      window.setTimeout(() => setCopied((current) => current === post.id ? null : current), 1600);
    } catch { /* Clipboard permission is controlled by the browser; avoid a false success state. */ }
  }

  function startEditing(post: Post) {
    setEditing(post.id); setName(post.display_name); setBody(post.body); setConsent(false); setReport(null);
    window.scrollTo({ top: 0, behavior: 'smooth' }); window.setTimeout(() => bodyRef.current?.focus(), 250);
  }

  const dateFormatter = new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'medium', timeStyle: 'short' });

  return <WorkspacePageContainer variant="reading" className={styles.page}>
    <section className={styles.communityHero} aria-labelledby="sfmer-heading">
      <div className={styles.heroPattern} aria-hidden="true"><span /><span /><span /></div>
      <div className={styles.heroContent}>
        <div className={styles.heroKicker}><UsersRound size={16} /><span>{text.eyebrow}</span></div>
        <h1 id="sfmer-heading">{text.title}</h1><h2>{text.heading}</h2><p>{text.note}</p>
      </div>
      <div className={styles.heroTrust}><ShieldCheck size={20} /><div><strong>{text.memberOnly}</strong><span>{text.consentHint}</span></div></div>
    </section>

    {!userId && !loading ? <section className={styles.loginCard}><ShieldCheck size={20} /><p>{common.login}</p></section> : null}
    {loading ? <p className={styles.loading} role="status">{common.loading}</p> : null}
    {error || failed ? <p className={styles.error} role="alert">{common.error} <button className={styles.inlineButton} type="button" onClick={() => void refresh()}>{common.retry}</button></p> : null}

    {userId ? <>
      <div className={styles.profileWrap}><span>{text.profile}</span><SFMerProfile key={userId} language={language} /></div>
      <section className={styles.composer} aria-labelledby="compose-heading">
        <div className={styles.composerTopline}><div className={styles.composerAvatar} aria-hidden="true">{initials(name)}</div><div><p>{text.member}</p><h2 id="compose-heading">{editing ? text.editOpen : text.compose}</h2></div>{editing ? <button className={styles.dismissEdit} type="button" onClick={() => { setEditing(null); setBody(''); setConsent(false); }} aria-label={text.cancel}><X size={17} /></button> : null}</div>
        <form onSubmit={(event) => { event.preventDefault(); if (consent) void act(editing ? 'edit' : 'publish', editing ?? undefined, body.trim()); }}>
          <div className={styles.promptRow} aria-label={text.composeHint}><button type="button" onClick={() => setPrompt(text.questionDraft)}><MessageCircle size={15} />{text.promptQuestion}</button><button type="button" onClick={() => setPrompt(text.ideaDraft)}><Sparkles size={15} />{text.promptIdea}</button><button type="button" onClick={() => setPrompt(text.watchDraft)}><Clipboard size={15} />{text.promptWatch}</button></div>
          <div className={styles.composerFields}>
            <label className={styles.field}><span>{text.name}<small>{text.nameHint}</small></span><input required minLength={2} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} className={styles.input} /></label>
            <label className={styles.field}><span>{text.body}<small>{text.bodyHint}</small></span><textarea ref={bodyRef} required maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} className={`${styles.input} ${styles.bodyInput}`} /></label>
          </div>
          <div className={styles.composerFooter}>
            <label className={`${styles.consentCard} ${consent ? styles.consentChecked : ''}`}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span className={styles.consentMark} aria-hidden="true">{consent ? <Check size={15} /> : null}</span><span><b>{text.consentTitle}</b><small>{text.consent}</small></span></label>
            <div className={styles.publishArea}><span>{body.length}/2000</span><button className={styles.publishButton} disabled={busy || !consent || !body.trim() || name.trim().length < 2}><Send size={16} />{busy ? text.publishing : editing ? common.save : text.publish}</button></div>
          </div>
        </form>
      </section>
    </> : null}

    <section className={styles.feedSection} aria-labelledby="feed-heading">
      <div className={styles.feedHeader}><div><span>{text.feedHint}</span><h2 id="feed-heading">{text.newest}</h2></div><button className={styles.refreshButton} type="button" disabled={busy || loading} onClick={() => { setCursors([]); void refresh(); }}><RefreshCw size={15} />{common.refresh}</button></div>
      {data?.posts.length === 0 ? <section className={styles.emptyFeed}><div className={styles.emptyIcon}><MessageCircle size={24} /></div><div><h3>{text.noPostsTitle}</h3><p>{text.noPostsBody}</p></div>{userId ? <button type="button" className={styles.startPost} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); window.setTimeout(() => bodyRef.current?.focus(), 250); }}><Send size={16} />{text.startPost}</button> : null}</section> : null}
      <div className={styles.postList}>{data?.posts.slice(0, 20).map((post) => {
        const profile = data.profiles.find((item) => item.user_id === post.author_id); const displayName = profile?.display_name ?? post.display_name;
        return <article className={styles.post} key={post.id}><div className={styles.postAvatar} aria-hidden="true">{initials(displayName)}</div><div className={styles.postMain}>
          <header className={styles.postHeader}><div><h3 dir="auto">{displayName}</h3><div className={styles.postMeta}>{profile ? <span dir="ltr">@{profile.handle}</span> : <span>{text.member}</span>}<time dir="ltr" dateTime={post.created_at}>{dateFormatter.format(new Date(post.created_at))}</time></div></div>{post.author_id === userId ? <span className={styles.ownerTag}>{text.member}</span> : null}</header>
          {profile?.bio ? <p className={styles.profileBio} dir="auto">{profile.bio}</p> : null}<p dir="auto" className={styles.text}>{post.body}</p>
          <footer className={styles.postActions}><button type="button" onClick={() => void copyPost(post)}><Copy size={15} />{copied === post.id ? text.copied : text.copy}</button>{post.author_id === userId ? <><button type="button" onClick={() => startEditing(post)}><Pencil size={15} />{text.edit}</button><button type="button" className={styles.destructiveAction} disabled={busy} onClick={() => void act('delete', post.id)}><Trash2 size={15} />{text.delete}</button></> : <><button type="button" onClick={() => { setReport(post.id); setReason(''); }}><Flag size={15} />{text.report}</button><button type="button" className={styles.destructiveAction} disabled={busy} onClick={() => void act('block', post.id)}><Ban size={15} />{text.block}</button></>}</footer>
          {report === post.id ? <form className={styles.reportPanel} onSubmit={(event) => { event.preventDefault(); void act('report', post.id, reason.trim()); }}><p>{text.reportOpen}</p><label className={styles.field}><span>{text.reason}</span><textarea required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className={`${styles.input} ${styles.reportInput}`} /></label><div><button className={styles.reportButton} disabled={busy || reason.trim().length < 5}><Flag size={15} />{text.report}</button><button type="button" className={styles.cancelButton} onClick={() => setReport(null)}>{text.cancel}</button></div></form> : null}
        </div></article>;
      })}</div>
      <nav className={styles.pagination} aria-label={text.newest}><button disabled={busy || loading || !cursors.length} type="button" onClick={() => setCursors((current) => current.slice(0, -1))}>{text.previous}</button><button disabled={busy || loading || !data || data.posts.length <= 20} type="button" onClick={() => { const last = data?.posts[19]; if (last) setCursors((current) => [...current, { id: last.id, created_at: last.created_at }]); }}>{text.next}</button></nav>
    </section>

    {data?.blocks.length ? <section className={styles.blockedPanel}><div><Ban size={18} /><h2>{text.blocked}</h2></div>{data.blocks.map((block, index) => <div className={styles.blockedRow} key={block.blocked_user_id}><span>{text.blocked} {index + 1}</span><button type="button" disabled={busy} onClick={() => void act('unblock', block.blocked_user_id)}>{text.unblock}</button></div>)}</section> : null}
  </WorkspacePageContainer>;
}
