'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  ShieldCheck,
  ShieldMinus,
  ShieldPlus,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react';
import { AdminDashboardShell } from '@/components/AdminDashboardShell';
import {
  ADMIN_PERMISSION_KEYS,
  countEnabledAdminPermissions,
  EMPTY_ADMIN_PERMISSIONS,
  type AdminPermission,
  type AdminPermissions,
} from '@/lib/adminPermissions';
import { useLanguage } from '@/hooks/useLanguage';

type RoleRecord = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: 'admin' | 'super_admin';
  permissions: AdminPermissions;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type SearchUser = {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: RoleRecord | null;
  currentRole: string | null;
  status: 'active_admin' | 'regular_user';
};

type AuditLog = {
  id: string;
  actor_email: string | null;
  target_email: string | null;
  action: string;
  created_at: string;
};

function emptyPermissions() {
  return { ...EMPTY_ADMIN_PERMISSIONS, admin_dashboard: true };
}

function dateLabel(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function permissionCountLabel(permissions: AdminPermissions) {
  return `${countEnabledAdminPermissions(permissions)} / ${ADMIN_PERMISSION_KEYS.length}`;
}

function normalizePermissions(value: RoleRecord | null) {
  return value?.permissions ? { ...EMPTY_ADMIN_PERMISSIONS, ...value.permissions } : emptyPermissions();
}

export default function AdminPermissionsClient({ actorEmail }: { actorEmail: string }) {
  const { t, lang, dir } = useLanguage();
  const locale = lang === 'ar' ? 'ar-KW-u-nu-latn' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const actionLabels: Record<string, string> = {
    grant_admin: t('admin_action_grant'),
    revoke_admin: t('admin_action_revoke'),
    update_permissions: t('admin_action_update'),
  };
  const permissionLabels: Record<AdminPermission, string> = {
    admin_dashboard: t('admin_permission_dashboard'),
    company_reviews: t('admin_permission_company_reviews'),
    instagram_automation: t('admin_permission_instagram'),
    business_management: t('admin_permission_business'),
    users_management: t('admin_permission_users'),
    payments: t('admin_permission_payments'),
    reports: t('admin_permission_reports'),
    settings: t('admin_permission_settings'),
  };
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>(() => emptyPermissions());
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const selectedRole = selectedUser?.role ?? roles.find(role => role.user_id === selectedUser?.id) ?? null;
  const activeRoles = useMemo(() => roles.filter(role => role.is_active), [roles]);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesResponse, logsResponse] = await Promise.all([
        fetch('/api/admin/roles', { cache: 'no-store' }),
        fetch('/api/admin/audit-logs', { cache: 'no-store' }),
      ]);

      if (!rolesResponse.ok || !logsResponse.ok) {
        setMessage({ tone: 'error', text: t('admin_permissions_load_error') });
        return;
      }

      const rolesPayload = await rolesResponse.json() as { roles?: RoleRecord[] };
      const logsPayload = await logsResponse.json() as { logs?: AuditLog[] };
      setRoles(rolesPayload.roles ?? []);
      setLogs(logsPayload.logs ?? []);
    } catch {
      setMessage({ tone: 'error', text: t('admin_server_error') });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const runSearch = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const cleaned = query.trim();
    if (cleaned.length < 2) {
      setResults([]);
      setMessage({ tone: 'error', text: t('admin_search_min') });
      return;
    }

    setSearching(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/search?query=${encodeURIComponent(cleaned)}`, { cache: 'no-store' });
      if (!response.ok) {
        setMessage({ tone: 'error', text: response.status === 403 ? t('admin_search_denied') : t('admin_search_error') });
        return;
      }
      const payload = await response.json() as { users?: SearchUser[] };
      setResults(payload.users ?? []);
      if (!payload.users?.length) setMessage({ tone: 'error', text: t('admin_no_results') });
    } catch {
      setMessage({ tone: 'error', text: t('admin_server_error') });
    } finally {
      setSearching(false);
    }
  }, [query, t]);

  function selectUser(user: SearchUser) {
    const role = user.role ?? roles.find(item => item.user_id === user.id) ?? null;
    setSelectedUser({ ...user, role });
    setPermissions(normalizePermissions(role));
    setMessage(null);
  }

  function togglePermission(key: AdminPermission) {
    setPermissions(current => ({ ...current, [key]: !current[key] }));
  }

  async function sendRoleAction(action: 'grant' | 'revoke' | 'update') {
    if (!selectedUser) {
      setMessage({ tone: 'error', text: t('admin_select_user_first') });
      return;
    }
    setBusyAction(action);
    setMessage(null);

    const endpoint = action === 'grant'
      ? '/api/admin/roles/grant'
      : action === 'revoke'
        ? '/api/admin/roles/revoke'
        : selectedRole
          ? `/api/admin/roles/${selectedRole.id}`
          : '';

    if (!endpoint) {
      setBusyAction('');
      setMessage({ tone: 'error', text: t('admin_no_active_role') });
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: action === 'update' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          email: selectedUser.email,
          permissions,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { code?: string; role?: RoleRecord };
      if (!response.ok) {
        const text = payload.code === 'SELF_ADMIN_CHANGE_NOT_ALLOWED'
          ? t('admin_self_change_error')
          : payload.code === 'SUPER_ADMIN_ENV_LOCKED'
            ? t('admin_super_locked_error')
            : t('admin_action_error');
        setMessage({ tone: 'error', text });
        return;
      }

      const success = action === 'grant'
        ? t('admin_grant_success')
        : action === 'revoke'
          ? t('admin_revoke_success')
          : t('admin_update_success');
      setMessage({ tone: 'ok', text: success });
      if (payload.role) {
        setSelectedUser(current => current ? { ...current, role: payload.role ?? current.role } : current);
        setPermissions(normalizePermissions(payload.role));
      }
      await loadAdminData();
      if (query.trim()) void runSearch();
    } catch {
      setMessage({ tone: 'error', text: t('admin_server_error') });
    } finally {
      setBusyAction('');
    }
  }

  return (
    <AdminDashboardShell contentClassName="admin-permissions-content" contentStyle={{ width: '100%', maxWidth: '100%' }}>
      <main className="admin-permissions" dir={dir}>
        <section className="ap-hero">
          <div>
            <span><ShieldCheck size={16} /> Super Admin</span>
            <h1>{t('admin_permissions_title')}</h1>
            <p>{t('admin_permissions_desc')}</p>
          </div>
          <strong dir="ltr">{actorEmail}</strong>
        </section>

        {message ? (
          <div className={`ap-message ${message.tone}`} role={message.tone === 'error' ? 'alert' : 'status'}>
            {message.tone === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            {message.text}
          </div>
        ) : null}

        <section className="ap-grid">
          <section className="ap-panel">
            <h2><Search size={18} /> {t('admin_user_search')}</h2>
            <form className="ap-search" onSubmit={runSearch}>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t('admin_search_placeholder')}
              />
              <button type="submit" disabled={searching}>
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {t('admin_search')}
              </button>
            </form>
            <div className="ap-results">
              {results.map(user => {
                const active = selectedUser?.id === user.id;
                return (
                  <button key={user.id} type="button" className={active ? 'active' : ''} onClick={() => selectUser(user)}>
                    <strong>{user.displayName || user.username || user.email}</strong>
                    <small dir="ltr">{user.email}</small>
                    <em>{user.role?.is_active ? user.role.role : t('admin_regular_user')}</em>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="ap-panel">
            <h2><UsersRound size={18} /> {t('admin_selected_user')}</h2>
            {selectedUser ? (
              <div className="ap-selected">
                <div>
                  <span>{t('admin_name')}</span>
                  <strong>{selectedUser.displayName || selectedUser.username || '-'}</strong>
                </div>
                <div>
                  <span>{t('admin_email')}</span>
                  <strong dir="ltr">{selectedUser.email}</strong>
                </div>
                <div>
                  <span>{t('admin_current_role')}</span>
                  <strong>{selectedRole?.is_active ? selectedRole.role : t('admin_no_active_role')}</strong>
                </div>
                <div>
                  <span>{t('admin_current_permissions')}</span>
                  <strong>{selectedRole ? permissionCountLabel(selectedRole.permissions) : '0 / 8'}</strong>
                </div>
              </div>
            ) : (
              <div className="ap-empty">{t('admin_select_from_results')}</div>
            )}
          </section>
        </section>

        <section className="ap-panel">
          <h2><SlidersHorizontal size={18} /> {t('admin_permissions')}</h2>
          <div className="ap-permissions">
            {ADMIN_PERMISSION_KEYS.map(key => (
              <label key={key} className={permissions[key] ? 'checked' : ''}>
                <input
                  type="checkbox"
                  checked={permissions[key]}
                  onChange={() => togglePermission(key)}
                />
                <span>{permissionLabels[key]}</span>
              </label>
            ))}
          </div>
          <div className="ap-actions">
            <button type="button" onClick={() => void sendRoleAction('grant')} disabled={!selectedUser || Boolean(busyAction)}>
              {busyAction === 'grant' ? <Loader2 size={16} className="animate-spin" /> : <ShieldPlus size={16} />}
              {t('admin_action_grant')}
            </button>
            <button type="button" onClick={() => void sendRoleAction('update')} disabled={!selectedRole || Boolean(busyAction)}>
              {busyAction === 'update' ? <Loader2 size={16} className="animate-spin" /> : <SlidersHorizontal size={16} />}
              {t('admin_action_update')}
            </button>
            <button type="button" className="danger" onClick={() => void sendRoleAction('revoke')} disabled={!selectedRole || Boolean(busyAction)}>
              {busyAction === 'revoke' ? <Loader2 size={16} className="animate-spin" /> : <ShieldMinus size={16} />}
              {t('admin_action_revoke')}
            </button>
          </div>
        </section>

        <section className="ap-panel">
          <h2><ShieldCheck size={18} /> {t('admin_current_admins')}</h2>
          <div className="ap-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('admin_name')}</th>
                  <th>{t('admin_email')}</th>
                  <th>{t('admin_role')}</th>
                  <th>{t('admin_permission_count')}</th>
                  <th>{t('admin_status')}</th>
                  <th>{t('admin_last_update')}</th>
                  <th>{t('admin_actions_label')}</th>
                </tr>
              </thead>
              <tbody>
                {(loading ? [] : roles).map(role => (
                  <tr key={role.id}>
                    <td>{role.display_name || '-'}</td>
                    <td dir="ltr">{role.email}</td>
                    <td>{role.role}</td>
                    <td>{permissionCountLabel(role.permissions)}</td>
                    <td>{role.is_active ? t('admin_active') : t('admin_revoked')}</td>
                    <td>{dateLabel(role.updated_at, locale)}</td>
                    <td>
                      <button
                        type="button"
                        className="ap-link-action"
                        onClick={() => selectUser({
                          id: role.user_id,
                          email: role.email,
                          username: null,
                          displayName: role.display_name,
                          role,
                          currentRole: role.role,
                          status: role.is_active ? 'active_admin' : 'regular_user',
                        })}
                      >
                        {t('admin_select')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && roles.length === 0 ? <div className="ap-empty">{t('admin_no_roles')}</div> : null}
            {loading ? <div className="ap-empty"><Loader2 size={18} className="animate-spin" /> {t('admin_loading_generic')}</div> : null}
          </div>
          <p className="ap-muted">{t('admin_active_count')} {activeRoles.length}</p>
        </section>

        <section className="ap-panel">
          <h2><Clock3 size={18} /> {t('admin_audit_log')}</h2>
          <div className="ap-table-wrap audit">
            <table>
              <thead>
                <tr>
                  <th>{t('admin_changed_by')}</th>
                  <th>{t('admin_target_user')}</th>
                  <th>{t('admin_action')}</th>
                  <th>{t('admin_date_time')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td dir="ltr">{log.actor_email || '-'}</td>
                    <td dir="ltr">{log.target_email || '-'}</td>
                    <td>{actionLabels[log.action] ?? log.action}</td>
                    <td>{dateLabel(log.created_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && logs.length === 0 ? <div className="ap-empty">{t('admin_no_audit')}</div> : null}
          </div>
        </section>
      </main>

      <style jsx>{`
        :global(.admin-permissions-content){width:100%!important;max-width:none!important}
        .admin-permissions{width:100%;max-width:1440px;margin:0 auto;padding:clamp(14px,2vw,28px);display:grid;gap:16px;font-family:Tajawal,Arial,sans-serif;color:var(--sfm-foreground)}
        .ap-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-radius:24px;padding:22px;background:linear-gradient(135deg,#061A2E,#0B2748 60%,#071E3A);color:#fff;box-shadow:0 18px 54px rgba(3,18,37,.16)}
        .ap-hero span{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(167,243,240,.24);border-radius:999px;padding:7px 11px;color:#A7F3F0;font-weight:950}
        .ap-hero h1{margin:12px 0 8px;font-size:clamp(28px,4vw,44px);font-weight:950;letter-spacing:0;line-height:1.1}
        .ap-hero p{margin:0;color:#DCEBFA;font-weight:850;line-height:1.8}
        .ap-hero strong{border:1px solid rgba(167,243,240,.22);border-radius:999px;padding:9px 12px;background:rgba(255,255,255,.08);font-size:12px}
        .ap-message{display:flex;align-items:center;gap:8px;border-radius:16px;padding:12px 14px;font-weight:900}
        .ap-message.ok{background:rgba(22,163,74,.10);border:1px solid rgba(22,163,74,.22);color:#15803D}
        .ap-message.error{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.20);color:#B91C1C}
        .ap-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .ap-panel{border:1px solid rgba(29,140,255,.12);background:var(--sfm-card-bg);border-radius:20px;padding:16px;box-shadow:0 12px 30px rgba(3,18,37,.05);display:grid;gap:13px;min-width:0}
        .ap-panel h2{margin:0;display:flex;align-items:center;gap:8px;font-size:18px;font-weight:950}
        .ap-panel h2 svg{color:#18D4D4}
        .ap-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}
        .ap-search input{min-height:44px;border-radius:14px;border:1px solid rgba(29,140,255,.16);background:var(--sfm-input-bg,#fff);color:var(--sfm-foreground);padding:0 12px;font:850 13px Tajawal,Arial,sans-serif}
        .ap-search button,.ap-actions button,.ap-link-action{min-height:42px;border:1px solid rgba(29,140,255,.18);border-radius:13px;background:linear-gradient(135deg,#1D8CFF,#18D4D4);color:#fff;padding:0 13px;font:950 13px Tajawal,Arial,sans-serif;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer}
        .ap-results{display:grid;gap:8px;max-height:340px;overflow:auto}
        .ap-results button{border:1px solid rgba(29,140,255,.12);background:rgba(29,140,255,.05);border-radius:14px;padding:11px;text-align:start;display:grid;gap:4px;cursor:pointer;color:var(--sfm-foreground)}
        .ap-results button.active{border-color:rgba(24,212,212,.5);box-shadow:0 0 0 3px rgba(24,212,212,.10)}
        .ap-results strong{font-weight:950}.ap-results small{color:var(--sfm-muted);font-weight:850}.ap-results em{font-style:normal;color:#0B76E0;font-weight:900;font-size:12px}
        .ap-selected{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .ap-selected div{border:1px solid rgba(148,163,184,.14);border-radius:14px;padding:12px;background:rgba(255,255,255,.35);display:grid;gap:4px;min-width:0}
        .ap-selected span,.ap-muted{color:var(--sfm-muted);font-size:12px;font-weight:900}.ap-selected strong{overflow-wrap:anywhere}
        .ap-permissions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .ap-permissions label{min-height:52px;border:1px solid rgba(29,140,255,.14);border-radius:14px;padding:11px;background:rgba(29,140,255,.05);display:flex;align-items:center;gap:9px;font-weight:900;cursor:pointer}
        .ap-permissions label.checked{border-color:rgba(22,163,74,.28);background:rgba(22,163,74,.08);color:#15803D}
        .ap-permissions input{width:18px;height:18px;accent-color:#18D4D4}
        .ap-actions{display:flex;gap:10px;flex-wrap:wrap}.ap-actions button.danger{background:rgba(220,38,38,.08);color:#B91C1C;border-color:rgba(220,38,38,.20)}.ap-actions button:disabled{opacity:.55;cursor:not-allowed}
        .ap-table-wrap{overflow:auto;border:1px solid rgba(148,163,184,.14);border-radius:16px}.ap-table-wrap.audit{max-height:420px}
        table{width:100%;border-collapse:collapse;min-width:760px}th,td{padding:10px;border-bottom:1px solid rgba(148,163,184,.16);text-align:start;font-size:12.5px;line-height:1.5}th{position:sticky;top:0;background:var(--sfm-card-bg);color:var(--sfm-muted);font-weight:950}td{font-weight:850}
        .ap-link-action{min-height:34px;background:rgba(29,140,255,.08);color:var(--sfm-foreground);box-shadow:none}
        .ap-empty{border:1px dashed rgba(29,140,255,.20);background:rgba(29,140,255,.055);border-radius:16px;padding:14px;color:var(--sfm-muted);font-weight:900;display:flex;align-items:center;justify-content:center;gap:8px;min-height:64px}
        :global(.dark) .ap-panel,:global(.dark) th{background:#102A45;border-color:rgba(255,255,255,.10)}:global(.dark) .ap-search input{background:#0F2942;border-color:rgba(255,255,255,.12);color:#F8FAFC}:global(.dark) .ap-selected div,:global(.dark) .ap-results button,:global(.dark) .ap-permissions label{background:rgba(15,41,66,.50);border-color:rgba(255,255,255,.10)}
        @media(max-width:1050px){.ap-grid{grid-template-columns:1fr}.ap-permissions{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:680px){.admin-permissions{padding:12px}.ap-hero{display:grid}.ap-hero strong{width:max-content;max-width:100%}.ap-search,.ap-selected,.ap-permissions{grid-template-columns:1fr}.ap-actions{display:grid}.ap-actions button{width:100%}table{min-width:680px}}
      `}</style>
    </AdminDashboardShell>
  );
}
