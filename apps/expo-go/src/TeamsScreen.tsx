import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { MobileRequestError, type MobileSessionClient } from './session';
import { Button, Busy, ErrorNotice, Input, Label, Panel, useUI } from './ui';

type Team = { id: string; name: string; owner_id: string };
type Member = { user_id: string; role: string; display_name: string };
type Note = { id: string; author_id: string; body: string; created_at: string };
type Task = { id: string; title: string; status: 'todo' | 'doing' | 'done'; due_date: string | null; author_id: string; assignee_id: string | null };
type Detail = { team: Team; members: Member[]; notes: Note[]; tasks: Task[] };

export function TeamsScreen({ client }: { client: MobileSessionClient }) {
  const { t, rtl } = useUI(); const [teams, setTeams] = useState<Team[]>([]); const [detail, setDetail] = useState<Detail | null>(null);
  const [nickname, setNickname] = useState(''); const [name, setName] = useState(''); const [code, setCode] = useState(''); const [note, setNote] = useState(''); const [task, setTask] = useState('');
  const [invitation, setInvitation] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const tr = (ar: string, en: string, fr: string) => t([ar, en, fr]);
  const load = useCallback(async (teamId?: string) => { setBusy(true); setError(''); try { const list = await client.request<{ teams: Team[] }>('/api/mobile/business/teams'); setTeams(list.teams); if (teamId) setDetail(await client.request<Detail>(`/api/mobile/business/teams?teamId=${encodeURIComponent(teamId)}`)); } catch (reason) { setError(reason instanceof MobileRequestError ? reason.code : 'TEAMS_UNAVAILABLE'); } finally { setBusy(false); } }, [client]);
  useEffect(() => { void load(); }, [load]);
  const act = async (action: string, value = '', taskId?: string) => {
    setBusy(true); setError(''); try {
      const result = await client.request<{ result?: { code?: string; id?: string } }>('/api/mobile/business/teams', { method: 'POST', body: JSON.stringify({ action, teamId: detail?.team.id, nickname, value, taskId }) });
      if (action === 'invite') setInvitation(String(result.result?.code ?? ''));
      const id = detail?.team.id ?? (result.result?.id ? String(result.result.id) : undefined); await load(id);
    } catch (reason) { setError(reason instanceof MobileRequestError ? reason.code : 'ACTION_UNAVAILABLE'); } finally { setBusy(false); }
  };
  return <ScrollView contentContainerStyle={{ padding: 14, gap: 12, maxWidth: 900, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
    <Panel><Label large>{tr('فرق العمل', 'Teams', 'Équipes')}</Label><Label>{tr('الملاحظات والمهام التي تنشرها فقط مشتركة؛ سجلاتك المالية تبقى خاصة.', 'Only notes and tasks you publish are shared; financial records stay private.', 'Seules vos notes et tâches publiées sont partagées ; vos dossiers financiers restent privés.')}</Label></Panel>
    {error ? <ErrorNotice code={error} /> : null}{busy ? <Busy /> : null}
    <Panel><Input label={tr('اسمك في الفريق', 'Your team name', 'Votre nom dans l’équipe')} value={nickname} onChange={setNickname} /><Input label={tr('اسم الفريق الجديد', 'New team name', 'Nom de la nouvelle équipe')} value={name} onChange={setName} /><Button label={tr('إنشاء فريق', 'Create team', 'Créer une équipe')} disabled={busy || nickname.trim().length < 2 || name.trim().length < 2} onPress={() => { void act('create', name); }} /><Input label={tr('رمز الدعوة', 'Invitation code', 'Code d’invitation')} value={code} onChange={setCode} /><Button label={tr('انضمام', 'Join', 'Rejoindre')} disabled={busy || nickname.trim().length < 2 || !code.trim()} onPress={() => { void act('join', code); }} /></Panel>
    <Panel><Label>{tr('فرقك', 'Your teams', 'Vos équipes')}</Label>{teams.length === 0 && !busy ? <Label>{tr('لا توجد فرق بعد.', 'No teams yet.', 'Aucune équipe.')}</Label> : null}{teams.map(team => <Button key={team.id} label={team.name} selected={detail?.team.id === team.id} onPress={() => { void load(team.id); }} />)}</Panel>
    {detail ? <><Panel><View style={{ flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><Label large>{detail.team.name}</Label><Button label={tr('تحديث', 'Refresh', 'Actualiser')} disabled={busy} onPress={() => { void load(detail.team.id); }} /></View><Label>{tr('الأعضاء', 'Members', 'Membres')}</Label>{detail.members.map(member => <Label key={member.user_id}>{`${member.display_name} · ${member.role}`}</Label>)}<Button label={tr('إنشاء دعوة', 'Create invitation', 'Créer une invitation')} disabled={busy} onPress={() => { void act('invite'); }} />{invitation ? <Label>{`${tr('رمز لمرة واحدة:', 'One-time code:', 'Code à usage unique :')} ${invitation}`}</Label> : null}<Button label={tr('إلغاء الدعوات المعلقة', 'Revoke pending invitations', 'Révoquer les invitations')} disabled={busy} onPress={() => { void act('revoke_invites'); }} /><Button label={tr('مغادرة الفريق', 'Leave team', 'Quitter l’équipe')} disabled={busy} onPress={() => { void act('leave'); setDetail(null); }} /></Panel>
      <Panel><Label>{tr('ملاحظة للفريق', 'Team note', 'Note d’équipe')}</Label><Input label={tr('النص', 'Text', 'Texte')} value={note} onChange={setNote} /><Button label={tr('نشر', 'Post', 'Publier')} disabled={busy || !note.trim()} onPress={() => { void act('note', note); setNote(''); }} />{detail.notes.map(item => <Panel key={item.id}><Label>{item.body}</Label><Label>{item.created_at.slice(0, 16).replace('T', ' ')}</Label><Button label={tr('حذف', 'Delete', 'Supprimer')} disabled={busy} onPress={() => { void act('delete_note', item.id); }} /></Panel>)}</Panel>
      <Panel><Label>{tr('مهام الفريق', 'Team tasks', 'Tâches')}</Label><Input label={tr('مهمة', 'Task', 'Tâche')} value={task} onChange={setTask} /><Button label={tr('إضافة مهمة', 'Add task', 'Ajouter')} disabled={busy || !task.trim()} onPress={() => { void act('task_create', task); setTask(''); }} />{detail.tasks.map(item => <Panel key={item.id}><Label>{item.title}</Label><Label>{`${item.status}${item.due_date ? ` · ${item.due_date}` : ''}`}</Label><View style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 6, flexWrap: 'wrap' }}>{(['todo', 'doing', 'done'] as const).map(status => <Button key={status} label={status} selected={item.status === status} disabled={busy} onPress={() => { void act('task_status', status, item.id); }} />)}<Button label={tr('حذف', 'Delete', 'Supprimer')} disabled={busy} onPress={() => { void act('task_delete', '', item.id); }} /></View></Panel>)}</Panel></> : null}
  </ScrollView>;
}
