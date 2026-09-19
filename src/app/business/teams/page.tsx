'use client';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { usePrivateResource } from '@/components/platform/usePrivateResource';
import { platformCopy, platformLanguage } from '@/components/platform/copy';
import styles from '@/components/platform/platform.module.css';
type Team = { id: string; name: string; owner_id: string };
type Member = { user_id: string; role: string; team_id: string; display_name: string };
type Note = { id: string; team_id: string; author_id: string; body: string; created_at: string };
async function load() {
 const teams = await supabase.from('sfm_teams').select('id,name,owner_id').order('created_at', { ascending: false }).limit(100);
 if (teams.error) throw teams.error;
 return teams.data as Team[];
}
const copy = {
 ar: { nickname: 'اسمك الظاهر للفريق', title: 'فرق العمل', note: 'مساحة مشتركة للملاحظات. تُشارك هنا فقط المعلومات التي تنشرها بنفسك؛ تبقى سجلاتك المالية الشخصية خاصة.', name: 'اسم الفريق', create: 'إنشاء فريق', code: 'رمز الدعوة', join: 'الانضمام', invite: 'إنشاء دعوة', inviteNote: 'انسخ الرمز وشاركه مع الشخص المطلوب. يُستخدم مرة واحدة وتنتهي صلاحيته بعد 7 أيام.', revoke: 'إلغاء كل الدعوات المعلقة', members: 'الأعضاء', owner: 'مالك', member: 'عضو', leave: 'مغادرة الفريق', remove: 'إزالة العضو', body: 'ملاحظة للفريق', publish: 'نشر الملاحظة', latest: 'آخر 50 ملاحظة', choose: 'اختر الفريق', copied: 'تم النسخ', copy: 'نسخ الرمز' },
 en: { nickname: 'Your team display name', title: 'Teams', note: 'A shared notes workspace. Only information you explicitly post here is shared; your personal financial records stay private.', name: 'Team name', create: 'Create team', code: 'Invitation code', join: 'Join', invite: 'Create invitation', inviteNote: 'Copy this code and share it with the intended person. It works once and expires after 7 days.', revoke: 'Revoke all pending invitations', members: 'Members', owner: 'Owner', member: 'Member', leave: 'Leave team', remove: 'Remove member', body: 'Team note', publish: 'Post note', latest: 'Latest 50 notes', choose: 'Choose team', copied: 'Copied', copy: 'Copy code' },
 fr: { nickname: 'Votre nom dans l’équipe', title: 'Équipes', note: 'Un espace de notes partagées. Seules les informations que vous publiez ici sont partagées ; vos données financières personnelles restent privées.', name: 'Nom de l’équipe', create: 'Créer une équipe', code: 'Code d’invitation', join: 'Rejoindre', invite: 'Créer une invitation', inviteNote: 'Copiez ce code pour la personne concernée. Il est à usage unique et expire après 7 jours.', revoke: 'Révoquer toutes les invitations en attente', members: 'Membres', owner: 'Propriétaire', member: 'Membre', leave: 'Quitter l’équipe', remove: 'Retirer le membre', body: 'Note d’équipe', publish: 'Publier la note', latest: '50 dernières notes', choose: 'Choisir une équipe', copied: 'Copié', copy: 'Copier le code' },
};
export default function TeamsPage() {
 const { lang } = useLanguage(); const language = platformLanguage(lang); const text = copy[language]; const common = platformCopy[language];
 const { userId, data, loading, error, refresh } = usePrivateResource(load);
 const [nickname, setNickname] = useState(''); const [name, setName] = useState(''); const [code, setCode] = useState(''); const [selected, setSelected] = useState('');
 const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false);
 async function action(kind: string) {
  if (!userId || busy) return; setBusy(true); setFailed(false);
  try { const result = await supabase.rpc('sfm_team_action', { p_action: kind, p_name: nickname.trim(), p_value: kind === 'create' ? name.trim() : code.trim() });
   if (result.error) throw result.error;
   setName(''); setCode(''); setSelected(String(result.data.id)); await refresh();
  } catch { setFailed(true); } finally { setBusy(false); }
 }
 const team = data?.find(item => item.id === selected);
 return <WorkspacePageContainer className={styles.page}><h1>{text.title}</h1><p>{text.note}</p>
  {loading ? <p role="status">{common.loading}</p> : null}{!userId && !loading ? <p>{common.login}</p> : null}
  {error || failed ? <p role="alert">{common.error} <Button onClick={() => void refresh()} variant="outline">{common.retry}</Button></p> : null}
  {userId ? <><label className={styles.field}>{text.nickname}<input className={styles.input} value={nickname} minLength={2} maxLength={60} onChange={event => setNickname(event.target.value)} /></label><form className={styles.card} onSubmit={event => { event.preventDefault(); void action('create'); }}><label className={styles.field}>{text.name}<input required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} className={styles.input} /></label><Button disabled={busy || nickname.trim().length < 2 || name.trim().length < 2}>{text.create}</Button></form>
   <form className={styles.card} onSubmit={event => { event.preventDefault(); void action('join'); }}><label className={styles.field}>{text.code}<input required value={code} maxLength={100} onChange={event => setCode(event.target.value)} className={styles.input} autoComplete="off" /></label><Button disabled={busy || nickname.trim().length < 2 || !code.trim()}>{text.join}</Button></form></> : null}
  {data ? <label className={styles.field}>{text.choose}<select className={styles.input} value={selected} onChange={event => setSelected(event.target.value)}><option value="">{text.choose}</option>{data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
  {data?.length === 0 ? <p>{common.empty}</p> : null}
  {team && userId ? <TeamDetail key={`${userId}:${team.id}`} team={team} userId={userId} language={language} onLeave={() => { setSelected(''); void refresh(); }} /> : null}
 </WorkspacePageContainer>;
}
function TeamDetail({ team, userId, language, onLeave }: { team: Team; userId: string; language: 'ar' | 'en' | 'fr'; onLeave: () => void }) {
 const text = copy[language]; const common = platformCopy[language];
 // Stable loader identity; remounting for a different team clears notes and invitations.
 const [loader] = useState(() => async () => {
  const [members, notes] = await Promise.all([
   supabase.from('sfm_team_members').select('user_id,role,team_id,display_name').eq('team_id',team.id).order('joined_at').limit(100),
   supabase.from('sfm_team_notes').select('id,team_id,author_id,body,created_at').eq('team_id',team.id).order('created_at',{ascending:false}).limit(50),
  ]);
  if (members.error || notes.error) throw new Error('LOAD_FAILED');
  return { members: members.data as Member[], notes: notes.data as Note[] };
 });
 const { data, loading, error, refresh } = usePrivateResource(loader);
 const [body, setBody] = useState(''); const [invitation, setInvitation] = useState(''); const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false); const [copied, setCopied] = useState(false);
 const owner = team.owner_id === userId;
 async function act(action: string, value?: string) {
  if (busy) return; setBusy(true); setFailed(false);
  try {
   const result = await supabase.rpc('sfm_team_action', { p_action: action, p_team: team.id, p_value: value ?? null });
   if (result.error) throw result.error;
   if (action === 'invite') { setInvitation(String(result.data.code)); setCopied(false); }
   if (action === 'revoke_invites') setInvitation('');
   if (action === 'note') setBody('');
   if (action === 'leave') onLeave(); else await refresh();
  } catch { setFailed(true); } finally { setBusy(false); }
 }
 return <section className={styles.card}><h2>{team.name}</h2>
  {loading ? <p role="status">{common.loading}</p> : null}{failed || error ? <p role="alert">{common.error}</p> : null}
  <div className={styles.row}><Button disabled={busy} variant="outline" onClick={() => void refresh()}>{common.refresh}</Button>{owner ? <><Button disabled={busy} onClick={() => void act('invite')}>{text.invite}</Button><Button disabled={busy} variant="outline" onClick={() => void act('revoke_invites')}>{text.revoke}</Button></> : <Button disabled={busy} variant="outline" onClick={() => void act('leave')}>{text.leave}</Button>}</div>
  {invitation ? <div className={styles.card}><p>{text.inviteNote}</p><label className={styles.field}>{text.code}<input className={styles.input} readOnly value={invitation} dir="ltr" onFocus={event => event.target.select()} /></label><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(invitation); setCopied(true); } catch { setCopied(false); } }}>{copied ? text.copied : text.copy}</Button></div> : null}
  <h3>{text.members}</h3>{data?.members.map(member => <div className={styles.row} key={member.user_id}><span dir="auto" className={styles.text}>{member.display_name}</span><span>{member.role === 'owner' ? text.owner : text.member}</span>{owner && member.role !== 'owner' ? <Button disabled={busy} variant="outline" onClick={() => void act('remove_member',member.user_id)}>{text.remove}</Button> : null}</div>)}
  <form className={styles.field} onSubmit={event => { event.preventDefault(); void act('note',body.trim()); }}><label className={styles.field}>{text.body}<textarea className={styles.input} required maxLength={4000} value={body} onChange={event => setBody(event.target.value)} /></label><Button disabled={busy || !body.trim()}>{text.publish}</Button></form>
  <h3>{text.latest}</h3>{data?.notes.length === 0 ? <p>{common.empty}</p> : null}{data?.notes.map(note => <article className={styles.card} key={note.id}><p className={styles.text} dir="auto">{note.body}</p><small dir="ltr">{note.created_at.slice(0,19).replace('T',' ')} UTC</small>{owner || note.author_id === userId ? <Button variant="outline" disabled={busy} onClick={() => void act('delete_note',note.id)}>{common.remove}</Button> : null}</article>)}
 </section>;
}
