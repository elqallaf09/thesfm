'use client';

import { useCallback, useState } from 'react';
import { Flag, MessageCircle, PenLine, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import { SFMerProfile } from '@/components/platform/SFMerProfile';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { usePrivateResource } from '@/components/platform/usePrivateResource';
import { platformCopy, platformLanguage } from '@/components/platform/copy';
import styles from './SFMerPage.module.css';

type CommunityProfile = { user_id: string; handle: string; display_name: string; bio: string };
type Post = { id: string; author_id: string; display_name: string; body: string; created_at: string };

const copy = {
  ar: {
    title: 'SFMer', eyebrow: 'مساحة الأعضاء',
    note: 'شارك أفكارك المالية مع الأعضاء المسجلين. الأسماء يختارها أصحابها وليست توثيقاً للهوية. لا تنشر معلومات الحسابات أو المحافظ الخاصة، ولا تعتمد على المنشورات وحدها لاتخاذ قرار استثماري.',
    spaceStatus: 'نقاش مسؤول بين الأعضاء', spaceDetail: 'شارك الفكرة بوضوح، واطلب السياق قبل أن تبني عليها قراراً.',
    compose: 'اكتب منشوراً', composeHint: 'فكرة واحدة، وسؤال واضح أو سياق مفيد. هذا يجعل النقاش أسهل للمتابعة.',
    name: 'اسم النشر', body: 'فكرتك أو سؤالك', publish: 'نشر للأعضاء', consent: 'أوافق على ظهور هذا النص واسم النشر للأعضاء المسجلين.',
    safetyTitle: 'قواعد المساحة', safetyDetail: 'لا تنشر بيانات خاصة أو توصيات حاسمة. ناقش الفكرة، وراجع المصادر، واتخذ قرارك بنفسك.',
    feedKicker: 'المحادثة', newest: 'أحدث المنشورات', feedDetail: 'تُرتَّب المنشورات من الأحدث إلى الأقدم.',
    emptyTitle: 'كن أول من يفتح نقاشاً', emptyDetail: 'اكتب سؤالاً أو فكرةً مختصرة لتظهر للأعضاء المسجلين هنا.',
    report: 'إبلاغ وإخفاء عني', reason: 'سبب الإبلاغ (5–500 حرف)', block: 'حظر الكاتب', unblock: 'إلغاء الحظر', blocked: 'الحسابات المحظورة', previous: 'الصفحة السابقة', next: 'الصفحة التالية', edit: 'تعديل',
    guestTitle: 'سجّل الدخول للمشاركة', guestDetail: 'المناقشات وملفات الأعضاء متاحة للحسابات المسجلة فقط.', login: 'الذهاب إلى تسجيل الدخول',
  },
  en: {
    title: 'SFMer', eyebrow: 'Member space',
    note: 'Share financial ideas with signed-in members. Display names are self-chosen and do not verify identity. Do not post private account or portfolio information, or rely on posts alone for investment decisions.',
    spaceStatus: 'Thoughtful member discussion', spaceDetail: 'Share a clear idea, then ask for context before acting on it.',
    compose: 'Start a post', composeHint: 'One clear idea, question, or useful context makes discussion easier to follow.',
    name: 'Display name', body: 'Your idea or question', publish: 'Publish to members', consent: 'I agree to show this text and display name to signed-in members.',
    safetyTitle: 'Community rules', safetyDetail: 'Do not share private data or definitive recommendations. Discuss the idea, check sources, and make your own decision.',
    feedKicker: 'Conversation', newest: 'Latest posts', feedDetail: 'Posts are shown from newest to oldest.',
    emptyTitle: 'Start the first conversation', emptyDetail: 'Share a concise question or idea for signed-in members to see here.',
    report: 'Report and hide for me', reason: 'Report reason (5–500 characters)', block: 'Block author', unblock: 'Unblock', blocked: 'Blocked accounts', previous: 'Previous page', next: 'Next page', edit: 'Edit',
    guestTitle: 'Sign in to participate', guestDetail: 'Discussion and member profiles are available to signed-in accounts only.', login: 'Go to sign in',
  },
  fr: {
    title: 'SFMer', eyebrow: 'Espace membres',
    note: 'Partagez vos idées financières avec les membres connectés. Les pseudonymes ne constituent pas une vérification d’identité. Ne publiez pas de données privées et ne fondez pas vos décisions d’investissement uniquement sur ces publications.',
    spaceStatus: 'Échanges responsables entre membres', spaceDetail: 'Partagez une idée claire, puis demandez du contexte avant d’agir.',
    compose: 'Créer une publication', composeHint: 'Une idée, une question ou un contexte clair rend la discussion plus simple à suivre.',
    name: 'Pseudonyme', body: 'Votre idée ou question', publish: 'Publier pour les membres', consent: 'J’accepte de rendre ce texte et mon pseudonyme visibles aux membres connectés.',
    safetyTitle: 'Règles de l’espace', safetyDetail: 'Ne partagez pas de données privées ni de recommandations définitives. Discutez, vérifiez les sources et prenez votre propre décision.',
    feedKicker: 'Conversation', newest: 'Publications récentes', feedDetail: 'Les publications sont affichées de la plus récente à la plus ancienne.',
    emptyTitle: 'Lancez la première discussion', emptyDetail: 'Partagez une question ou une idée concise qui apparaîtra ici pour les membres connectés.',
    report: 'Signaler et masquer pour moi', reason: 'Motif du signalement (5–500 caractères)', block: 'Bloquer l’auteur', unblock: 'Débloquer', blocked: 'Comptes bloqués', previous: 'Précédent', next: 'Suivant', edit: 'Modifier',
    guestTitle: 'Connectez-vous pour participer', guestDetail: 'Les discussions et profils sont réservés aux comptes connectés.', login: 'Se connecter',
  },
};

function formatPostTime(value: string, language: 'ar' | 'en' | 'fr') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = language === 'ar' ? 'ar-KW' : language === 'fr' ? 'fr-FR' : 'en-GB';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date);
}

export default function SFMerPage() {
  const { lang } = useLanguage();
  const language = platformLanguage(lang);
  const text = copy[language];
  const common = platformCopy[language];
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

  const load = useCallback(async (userId: string) => {
    let query = supabase.from('sfmer_posts').select('id,author_id,display_name,body,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(21);
    if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
    const [posts, blocks] = await Promise.all([query, supabase.from('sfmer_blocks').select('blocked_user_id').eq('user_id', userId).limit(100)]);
    if (posts.error || blocks.error) throw new Error('LOAD_FAILED');
    const ids = [...new Set(posts.data.map(post => String(post.author_id)))];
    const profiles = ids.length ? await supabase.from('sfmer_profiles').select('user_id,handle,display_name,bio').in('user_id', ids) : { data: [], error: null };
    if (profiles.error) throw new Error('LOAD_FAILED');
    return { posts: posts.data as Post[], blocks: blocks.data as Array<{ blocked_user_id: string }>, profiles: profiles.data as CommunityProfile[] };
  }, [cursor]);

  const { userId, data, loading, error, refresh } = usePrivateResource(load);
  const visiblePosts = data?.posts.slice(0, 20) ?? [];

  async function act(action: string, target?: string, value?: string) {
    if (!userId || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const result = await supabase.rpc('sfmer_action', { p_action: action, p_target: target ?? null, p_body: value ?? null, p_name: name.trim() });
      if (result.error) throw result.error;
      if (action === 'publish' || action === 'edit') { setBody(''); setConsent(false); setEditing(null); }
      setReport(null);
      setReason('');
      await refresh();
    } catch { setFailed(true); } finally { setBusy(false); }
  }

  return <WorkspacePageContainer variant="wide" className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.kicker}><UsersRound size={16} aria-hidden="true" />{text.eyebrow}</p><h1>{text.title}</h1><p>{text.note}</p></div>
      <div className={styles.heroSignal}><span><ShieldCheck size={16} aria-hidden="true" />{text.spaceStatus}</span><p>{text.spaceDetail}</p></div>
    </header>

    {!userId && !loading ? <section className={styles.guestCard}><MessageCircle size={26} aria-hidden="true" /><div><h2>{text.guestTitle}</h2><p>{text.guestDetail}</p></div><Button asChild><a href="/login">{text.login}</a></Button></section> : null}
    {loading ? <p className={styles.feedback} role="status">{common.loading}</p> : null}
    {error || failed ? <p className={styles.feedback} role="alert">{common.error} <Button variant="outline" onClick={() => void refresh()}>{common.retry}</Button></p> : null}

    {userId ? <div className={styles.communityGrid}>
      <aside className={styles.composerRail}>
        <section className={styles.composer}>
          <div className={styles.sectionHeader}><span className={styles.sectionIcon}><PenLine size={18} aria-hidden="true" /></span><div><h2>{editing ? text.edit : text.compose}</h2><p>{text.composeHint}</p></div></div>
          <form onSubmit={event => { event.preventDefault(); if (consent) void act(editing ? 'edit' : 'publish', editing ?? undefined, body.trim()); }}>
            <label className={styles.field}>{text.name}<input required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label>
            <label className={styles.field}>{text.body}<textarea required rows={6} maxLength={2000} value={body} onChange={event => setBody(event.target.value)} /></label>
            <label className={styles.consent}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{text.consent}</span></label>
            <div className={styles.composerActions}><Button type="submit" disabled={busy || !consent || !body.trim() || name.trim().length < 2}>{editing ? common.save : text.publish}</Button>{editing ? <Button type="button" variant="outline" onClick={() => { setEditing(null); setBody(''); setConsent(false); }}>{common.cancel}</Button> : null}</div>
          </form>
        </section>
        <SFMerProfile key={userId} language={language} className={styles.profile} />
        <section className={styles.safetyCard}><ShieldCheck size={18} aria-hidden="true" /><div><h2>{text.safetyTitle}</h2><p>{text.safetyDetail}</p></div></section>
      </aside>

      <section className={styles.feed} aria-label={text.newest}>
        <header className={styles.feedHeader}><div><p className={styles.kicker}><MessageCircle size={16} aria-hidden="true" />{text.feedKicker}</p><h2>{text.newest}</h2><p>{text.feedDetail}</p></div><Button variant="outline" className={styles.refreshButton} disabled={busy || loading} onClick={() => { setCursors([]); void refresh(); }}><RefreshCw size={16} aria-hidden="true" />{common.refresh}</Button></header>
        {visiblePosts.length === 0 && !loading ? <div className={styles.emptyFeed}><MessageCircle size={26} aria-hidden="true" /><h3>{text.emptyTitle}</h3><p>{text.emptyDetail}</p></div> : null}
        <div className={styles.postList}>{visiblePosts.map(post => {
          const profile = data?.profiles.find(item => item.user_id === post.author_id);
          const ownPost = post.author_id === userId;
          return <article className={styles.post} key={post.id}>
            <header className={styles.postHeader}><div className={styles.avatar} aria-hidden="true">{(profile?.display_name ?? post.display_name).trim().slice(0, 1)}</div><div><h3 dir="auto">{profile?.display_name ?? post.display_name}</h3>{profile?.handle ? <span dir="ltr">@{profile.handle}</span> : null}</div><time dir="ltr" dateTime={post.created_at}>{formatPostTime(post.created_at, language)}</time></header>
            {profile?.bio ? <p className={styles.bio} dir="auto">{profile.bio}</p> : null}<p className={styles.postBody} dir="auto">{post.body}</p>
            <div className={styles.postActions}>{ownPost ? <><Button variant="outline" disabled={busy} onClick={() => { setEditing(post.id); setName(post.display_name); setBody(post.body); setConsent(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{text.edit}</Button><Button variant="outline" disabled={busy} onClick={() => void act('delete', post.id)}>{common.remove}</Button></> : <><Button variant="outline" disabled={busy} onClick={() => { setReport(post.id); setReason(''); }}><Flag size={15} aria-hidden="true" />{text.report}</Button><Button variant="outline" disabled={busy} onClick={() => void act('block', post.id)}>{text.block}</Button></>}</div>
            {report === post.id ? <form className={styles.reportForm} onSubmit={event => { event.preventDefault(); void act('report', post.id, reason.trim()); }}><label className={styles.field}>{text.reason}<textarea required rows={3} minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label><div><Button type="submit" disabled={busy || reason.trim().length < 5}>{text.report}</Button><Button type="button" variant="outline" onClick={() => setReport(null)}>{common.cancel}</Button></div></form> : null}
          </article>;
        })}</div>
        <nav className={styles.pagination} aria-label={text.newest}><Button disabled={busy || loading || !cursors.length} variant="outline" onClick={() => setCursors(old => old.slice(0, -1))}>{text.previous}</Button><Button disabled={busy || loading || !data || data.posts.length <= 20} variant="outline" onClick={() => { const last = data?.posts[19]; if (last) setCursors(old => [...old, { id: last.id, created_at: last.created_at }]); }}>{text.next}</Button></nav>
        {data?.blocks.length ? <section className={styles.blocked}><h3>{text.blocked}</h3>{data.blocks.map((block, index) => <div key={block.blocked_user_id}><span>{text.blocked} {index + 1}</span><Button disabled={busy} variant="outline" onClick={() => void act('unblock', block.blocked_user_id)}>{text.unblock}</Button></div>)}</section> : null}
      </section>
    </div> : null}
  </WorkspacePageContainer>;
}
