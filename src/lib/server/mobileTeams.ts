import { recordIdSchema } from '@/lib/mobile/resourceValidation';
import { mobileAccess, mobileResponse } from '@/lib/server/mobileAccess';
import { rateLimitRequest } from '@/lib/server/rateLimiter';

const teamActions = new Set(['create', 'join', 'invite', 'revoke_invites', 'note', 'delete_note', 'leave', 'remove_member', 'task_create', 'task_status', 'task_delete']);
const taskStatuses = new Set(['todo', 'doing', 'done']);

function text(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'string' && value.trim().length >= minimum && value.trim().length <= maximum ? value.trim() : null;
}

function id(value: unknown) {
  const result = recordIdSchema.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * The web client already uses these RLS-protected tables and MFA-gated RPCs.
 * Keep the native boundary narrow: it validates intent but never impersonates a
 * user, exposes invitations to non-owners, or bypasses the database policy.
 */
export async function handleMobileBusinessTeams(request: Request) {
  const access = await mobileAccess(request);
  if (access.response) return access.response;
  const limited = rateLimitRequest(request, { max: 40, windowMs: 60_000, prefix: `mobile-business-teams:${access.userId}` });
  if (limited) return limited;

  if (request.method === 'GET') {
    const teamId = id(new URL(request.url).searchParams.get('teamId'));
    const teams = await access.client.from('sfm_teams').select('id,name,owner_id,created_at').order('created_at', { ascending: false }).limit(100);
    if (teams.error) return mobileResponse({ ok: false, code: 'TEAMS_UNAVAILABLE' }, 503);
    if (!teamId) return mobileResponse({ ok: true, teams: teams.data ?? [] });
    const team = (teams.data ?? []).find(row => row.id === teamId);
    if (!team) return mobileResponse({ ok: false, code: 'TEAM_UNAVAILABLE' }, 404);
    const [members, notes, tasks] = await Promise.all([
      access.client.from('sfm_team_members').select('user_id,role,display_name').eq('team_id', teamId).order('joined_at').limit(100),
      access.client.from('sfm_team_notes').select('id,author_id,body,created_at').eq('team_id', teamId).order('created_at', { ascending: false }).limit(50),
      access.client.from('sfm_team_tasks').select('id,title,status,due_date,author_id,assignee_id').eq('team_id', teamId).order('created_at', { ascending: false }).limit(1000),
    ]);
    if (members.error || notes.error || tasks.error) return mobileResponse({ ok: false, code: 'TEAM_UNAVAILABLE' }, 503);
    return mobileResponse({ ok: true, viewerId: access.userId, team, members: members.data ?? [], notes: notes.data ?? [], tasks: tasks.data ?? [] });
  }

  if (request.method !== 'POST') return mobileResponse({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return mobileResponse({ ok: false, code: 'INVALID_ACTION' }, 400); }
  const action = typeof body.action === 'string' ? body.action : '';
  if (!teamActions.has(action)) return mobileResponse({ ok: false, code: 'INVALID_ACTION' }, 400);
  const teamId = id(body.teamId);
  const nickname = text(body.nickname, 2, 60);
  const value = typeof body.value === 'string' ? body.value.trim() : '';
  let result;
  if (action === 'create') {
    const name = text(value, 2, 80);
    if (!nickname || !name) return mobileResponse({ ok: false, code: 'INVALID_ACTION' }, 400);
    result = await access.client.rpc('sfm_team_action', { p_action: 'create', p_name: nickname, p_value: name });
  } else if (action === 'join') {
    if (!nickname || !text(value, 1, 100)) return mobileResponse({ ok: false, code: 'INVALID_ACTION' }, 400);
    result = await access.client.rpc('sfm_team_action', { p_action: 'join', p_name: nickname, p_value: value });
  } else if (action.startsWith('task_')) {
    if (!teamId) return mobileResponse({ ok: false, code: 'INVALID_ACTION' }, 400);
    const taskAction = action.slice(5);
    const taskId = id(body.taskId);
    if (taskAction === 'create') {
      const title = text(value, 1, 240); const assignee = body.assigneeId == null ? null : id(body.assigneeId);
      const due = body.due == null || body.due === '' ? null : /^\d{4}-\d{2}-\d{2}$/.test(String(body.due)) ? String(body.due) : null;
      if (!title || (body.assigneeId != null && !assignee) || (body.due && !due)) return mobileResponse({ ok: false, code: 'INVALID_ACTION' }, 400);
      result = await access.client.rpc('sfm_team_task', { p_team: teamId, p_action: 'create', p_title: title, p_assignee: assignee, p_due: due });
    } else if (taskAction === 'status' && taskId && taskStatuses.has(value)) {
      result = await access.client.rpc('sfm_team_task', { p_team: teamId, p_action: 'status', p_id: taskId, p_status: value });
    } else if (taskAction === 'delete' && taskId) {
      result = await access.client.rpc('sfm_team_task', { p_team: teamId, p_action: 'delete', p_id: taskId });
    } else return mobileResponse({ ok: false, code: 'INVALID_ACTION' }, 400);
  } else {
    if (!teamId) return mobileResponse({ ok: false, code: 'INVALID_ACTION' }, 400);
    const actionValue = action === 'note' ? text(value, 1, 4000) : ['delete_note', 'remove_member'].includes(action) ? id(value) : action === 'leave' || action === 'invite' || action === 'revoke_invites' ? null : null;
    if ((action === 'note' || action === 'delete_note' || action === 'remove_member') && !actionValue) return mobileResponse({ ok: false, code: 'INVALID_ACTION' }, 400);
    result = await access.client.rpc('sfm_team_action', { p_action: action, p_team: teamId, p_value: actionValue, p_name: 'Member' });
  }
  if (result.error) return mobileResponse({ ok: false, code: 'ACTION_UNAVAILABLE' }, 403);
  return mobileResponse({ ok: true, result: result.data ?? {} });
}
