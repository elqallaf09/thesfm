'use client';
import { useCallback, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { usePrivateResource } from '@/components/platform/usePrivateResource';
import { platformCopy, platformLanguage } from '@/components/platform/copy';
import styles from '@/components/platform/platform.module.css';
type Post = { id: string; author_id: string; display_name: string; body: string; created_at: string };
const copy = {
 ar: { title: 'SFMer', note: 'شارك أفكارك المالية مع الأعضاء المسجلين. الأسماء يختارها أصحابها وليست توثيقاً للهوية. لا تنشر معلومات الحسابات أو المحافظ الخاصة، ولا تعتمد على المنشورات وحدها لاتخاذ قرار استثماري.', name: 'اسم النشر', body: 'فكرتك أو سؤالك', publish: 'نشر للأعضاء', consent: 'أوافق على ظهور هذا النص واسم النشر للأعضاء المسجلين.', report: 'إبلاغ وإخفاء عني', reason: 'سبب الإبلاغ (5–500 حرف)', block: 'حظر الكاتب', unblock: 'إلغاء الحظر', blocked: 'الحسابات المحظورة', newest: 'أحدث المنشورات', previous: 'الصفحة السابقة', next: 'الصفحة التالية', edit: 'تعديل' },
 en: { title: 'SFMer', note: 'Share financial ideas with signed-in members. Display names are self-chosen and do not verify identity. Do not post private account or portfolio information, or rely on posts alone for investment decisions.', name: 'Display name', body: 'Your idea or question', publish: 'Publish to members', consent: 'I agree to show this text and display name to signed-in members.', report: 'Report and hide for me', reason: 'Report reason (5–500 characters)', block: 'Block author', unblock: 'Unblock', blocked: 'Blocked accounts', newest: 'Latest posts', previous: 'Previous page', next: 'Next page', edit: 'Edit' },
 fr: { title: 'SFMer', note: 'Partagez vos idées financières avec les membres connectés. Les pseudonymes ne constituent pas une vérification d’identité. Ne publiez pas de données privées et ne fondez pas vos décisions d’investissement uniquement sur ces publications.', name: 'Pseudonyme', body: 'Votre idée ou question', publish: 'Publier pour les membres', consent: 'J’accepte de rendre ce texte et mon pseudonyme visibles aux membres connectés.', report: 'Signaler et masquer pour moi', reason: 'Motif du signalement (5–500 caractères)', block: 'Bloquer l’auteur', unblock: 'Débloquer', blocked: 'Comptes bloqués', newest: 'Publications récentes', previous: 'Page précédente', next: 'Page suivante', edit: 'Modifier' },
};
export default function SFMerPage() {
 const { lang } = useLanguage(); const language = platformLanguage(lang); const text = copy[language]; const common = platformCopy[language];
 const [cursors, setCursors] = useState<Array<{ id: string; created_at: string }>>([]);
 const cursor = cursors.at(-1);
 const load = useCallback(async (userId: string) => {
  let query = supabase.from('sfmer_posts').select('id,author_id,display_name,body,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).limit(21);
  if (cursor) query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  const [posts, blocks] = await Promise.all([query, supabase.from('sfmer_blocks').select('blocked_user_id').eq('user_id',userId).limit(100)]);
  if (posts.error || blocks.error) throw new Error('LOAD_FAILED');
  return { posts: posts.data as Post[], blocks: blocks.data as Array<{ blocked_user_id: string }> };
 }, [cursor]);
 const { userId, data, loading, error, refresh } = usePrivateResource(load);
 const [name, setName] = useState(''); const [body, setBody] = useState(''); const [consent, setConsent] = useState(false);
 const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false);
 const [report, setReport] = useState<string | null>(null); const [reason, setReason] = useState('');
 const [editing, setEditing] = useState<string | null>(null);
 async function act(action: string, target?: string, value?: string) {
  if (!userId || busy) return; setBusy(true); setFailed(false);
  try { const result = await supabase.rpc('sfmer_action', { p_action: action, p_target: target ?? null, p_body: value ?? null, p_name: name.trim() });
   if (result.error) throw result.error;
   if (action === 'publish' || action === 'edit') { setBody(''); setConsent(false); setEditing(null); }
   setReport(null); setReason(''); await refresh();
  } catch { setFailed(true); } finally { setBusy(false); }
 }
 return <WorkspacePageContainer variant="reading" className={styles.page}><h1>{text.title}</h1><p>{text.note}</p>
  {!userId && !loading ? <p>{common.login}</p> : null}{loading ? <p role="status">{common.loading}</p> : null}
  {error || failed ? <p role="alert">{common.error} <Button variant="outline" onClick={() => void refresh()}>{common.retry}</Button></p> : null}
  {userId ? <form className={styles.card} onSubmit={event => { event.preventDefault(); if (consent) void act(editing ? 'edit' : 'publish',editing ?? undefined,body.trim()); }}>
   <label className={styles.field}>{text.name}<input required minLength={2} maxLength={60} value={name} onChange={event => setName(event.target.value)} className={styles.input} /></label>
   <label className={styles.field}>{text.body}<textarea required maxLength={2000} value={body} onChange={event => setBody(event.target.value)} className={styles.input} /></label>
   <label className={styles.row}><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />{text.consent}</label>
   <div className={styles.row}><Button disabled={busy || !consent || !body.trim() || name.trim().length < 2}>{editing ? common.save : text.publish}</Button>{editing ? <Button type="button" variant="outline" onClick={() => { setEditing(null); setBody(''); setConsent(false); }}>{common.cancel}</Button> : null}</div>
  </form> : null}
  <div className={styles.row}><h2>{text.newest}</h2><Button variant="outline" disabled={busy} onClick={() => { setCursors([]); void refresh(); }}>{common.refresh}</Button></div>
  {data?.posts.length === 0 ? <p>{common.empty}</p> : null}
  {data?.posts.slice(0,20).map(post => <article className={styles.card} key={post.id}>
   <h3 dir="auto">{post.display_name}</h3><time dir="ltr" dateTime={post.created_at}>{post.created_at.slice(0,19).replace('T',' ')} UTC</time><p dir="auto" className={styles.text}>{post.body}</p>
   <div className={styles.row}>{post.author_id === userId ? <><Button disabled={busy} variant="outline" onClick={() => { setEditing(post.id); setName(post.display_name); setBody(post.body); setConsent(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{text.edit}</Button><Button disabled={busy} variant="outline" onClick={() => void act('delete',post.id)}>{common.remove}</Button></> : <><Button disabled={busy} variant="outline" onClick={() => { setReport(post.id); setReason(''); }}>{text.report}</Button><Button disabled={busy} variant="outline" onClick={() => void act('block',post.id)}>{text.block}</Button></>}</div>
   {report === post.id ? <form className={styles.field} onSubmit={event => { event.preventDefault(); void act('report',post.id,reason.trim()); }}><label className={styles.field}>{text.reason}<textarea required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} className={styles.input} /></label><div className={styles.row}><Button disabled={busy || reason.trim().length < 5}>{text.report}</Button><Button type="button" variant="outline" onClick={() => setReport(null)}>{common.cancel}</Button></div></form> : null}
  </article>)}
  <div className={styles.row}><Button disabled={busy || loading || !cursors.length} variant="outline" onClick={() => setCursors(old => old.slice(0,-1))}>{text.previous}</Button><Button disabled={busy || loading || !data || data.posts.length <= 20} variant="outline" onClick={() => { const last = data?.posts[19]; if (last) setCursors(old => [...old, { id: last.id, created_at: last.created_at }]); }}>{text.next}</Button></div>
  {data?.blocks.length ? <section className={styles.card}><h2>{text.blocked}</h2>{data.blocks.map((block,index) => <div key={block.blocked_user_id} className={styles.row}><span>{text.blocked} {index+1}</span><Button disabled={busy} variant="outline" onClick={() => void act('unblock',block.blocked_user_id)}>{text.unblock}</Button></div>)}</section> : null}
 </WorkspacePageContainer>;
}
