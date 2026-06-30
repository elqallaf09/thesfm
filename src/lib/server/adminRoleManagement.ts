import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  EMPTY_ADMIN_PERMISSIONS,
  normalizeAdminPermissions,
  type AdminPermissions,
} from '@/lib/adminPermissions';
import { isSuperAdminEmail, type AdminRoleRow } from '@/lib/server/adminAccess';

type DbClient = SupabaseClient<any, 'public', any>;

type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
};

export type AdminUserResult = {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: AdminRoleRow | null;
};

export function adminJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(init?.headers ?? {}),
    },
  });
}

export function cleanString(value: unknown, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export function cleanEmail(value: unknown) {
  const email = cleanString(value, 320).toLowerCase();
  return email && email.includes('@') ? email : '';
}

export function parsePermissionsForWrite(value: unknown) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return normalizeAdminPermissions(value);
  }
  return { ...EMPTY_ADMIN_PERMISSIONS, admin_dashboard: true };
}

function authUserDisplayName(user: User | null | undefined) {
  const metadata = user?.user_metadata && typeof user.user_metadata === 'object'
    ? user.user_metadata as Record<string, unknown>
    : {};
  const candidate = metadata.display_name ?? metadata.full_name ?? metadata.name ?? metadata.username;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

async function findAuthUserByEmail(admin: DbClient, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data.users ?? [];
    const found = users.find(user => user.email?.trim().toLowerCase() === email);
    if (found) return found;
    if (users.length < 1000) break;
  }
  return null;
}

async function searchAuthUsers(admin: DbClient, query: string) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const matches = new Map<string, User>();
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data.users ?? [];
    for (const user of users) {
      const metadata = user.user_metadata && typeof user.user_metadata === 'object'
        ? user.user_metadata as Record<string, unknown>
        : {};
      const searchable = [
        user.email,
        metadata.display_name,
        metadata.full_name,
        metadata.name,
        metadata.username,
      ]
        .filter((item): item is string => typeof item === 'string')
        .join(' ')
        .toLowerCase();
      if (searchable.includes(needle)) matches.set(user.id, user);
    }
    if (users.length < 1000 || matches.size >= 20) break;
  }
  return Array.from(matches.values()).slice(0, 20);
}

async function profilesByIds(admin: DbClient, userIds: string[]) {
  if (!userIds.length) return new Map<string, ProfileRow>();
  const { data, error } = await admin
    .from('profiles')
    .select('id,email,username,display_name')
    .in('id', userIds);
  if (error) {
    console.error('[admin-roles] profile lookup failed', { code: error.code, message: error.message });
    return new Map<string, ProfileRow>();
  }
  return new Map((data ?? []).map(row => [String(row.id), row as ProfileRow]));
}

async function rolesByUserIds(admin: DbClient, userIds: string[]) {
  if (!userIds.length) return new Map<string, AdminRoleRow>();
  const { data, error } = await admin
    .from('admin_roles')
    .select('id,user_id,email,display_name,role,permissions,is_active,created_by,created_at,updated_at')
    .in('user_id', userIds);
  if (error) {
    console.error('[admin-roles] role lookup failed', { code: error.code, message: error.message });
    return new Map<string, AdminRoleRow>();
  }
  return new Map((data ?? []).map(row => [String(row.user_id), row as AdminRoleRow]));
}

async function searchProfiles(admin: DbClient, query: string) {
  const safeQuery = query.replace(/[%,()]/g, ' ').trim();
  if (safeQuery.length < 2) return [];
  const pattern = `%${safeQuery}%`;
  const { data, error } = await admin
    .from('profiles')
    .select('id,email,username,display_name')
    .or(`email.ilike.${pattern},username.ilike.${pattern},display_name.ilike.${pattern}`)
    .limit(20);

  if (error) {
    console.error('[admin-roles] profile search failed', { code: error.code, message: error.message });
    return [];
  }
  return (data ?? []) as ProfileRow[];
}

function roleToClient(role: AdminRoleRow | null) {
  if (!role) return null;
  return {
    id: role.id,
    user_id: role.user_id,
    email: role.email,
    display_name: role.display_name,
    role: role.role,
    permissions: normalizeAdminPermissions(role.permissions),
    is_active: role.is_active,
    created_by: role.created_by,
    created_at: role.created_at,
    updated_at: role.updated_at,
  };
}

function userToResult(user: User | null, profile: ProfileRow | null, role: AdminRoleRow | null): AdminUserResult | null {
  const id = user?.id ?? profile?.id;
  if (!id) return null;
  const email = user?.email?.trim().toLowerCase() || profile?.email?.trim().toLowerCase() || '';
  if (!email) return null;
  return {
    id,
    email,
    username: profile?.username ?? null,
    displayName: profile?.display_name ?? authUserDisplayName(user),
    role,
  };
}

export function adminUserToClient(user: AdminUserResult) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: roleToClient(user.role),
    currentRole: user.role?.is_active ? user.role.role : null,
    status: user.role?.is_active ? 'active_admin' : 'regular_user',
  };
}

export async function searchUsersForAdmin(admin: DbClient, query: string) {
  const cleaned = cleanString(query, 120);
  if (cleaned.length < 2) return [];

  const authMatches = await searchAuthUsers(admin, cleaned);
  const profileMatches = await searchProfiles(admin, cleaned);
  const ids = new Set<string>([
    ...authMatches.map(user => user.id),
    ...profileMatches.map(profile => profile.id),
  ]);

  const [profiles, roles] = await Promise.all([
    profilesByIds(admin, Array.from(ids)),
    rolesByUserIds(admin, Array.from(ids)),
  ]);

  const byId = new Map<string, AdminUserResult>();
  for (const user of authMatches) {
    const result = userToResult(user, profiles.get(user.id) ?? null, roles.get(user.id) ?? null);
    if (result) byId.set(result.id, result);
  }
  for (const profile of profileMatches) {
    const existing = byId.get(profile.id);
    if (existing) {
      byId.set(profile.id, {
        ...existing,
        username: profile.username ?? existing.username,
        displayName: profile.display_name ?? existing.displayName,
      });
      continue;
    }
    const result = userToResult(null, profile, roles.get(profile.id) ?? null);
    if (result) byId.set(result.id, result);
  }

  return Array.from(byId.values()).slice(0, 20);
}

export async function resolveTargetUser(
  admin: DbClient,
  input: { user_id?: unknown; userId?: unknown; email?: unknown; username?: unknown },
): Promise<AdminUserResult | null> {
  const userId = cleanString(input.user_id ?? input.userId, 80);
  const email = cleanEmail(input.email);
  const username = cleanString(input.username, 80).toLowerCase();

  if (userId) {
    const [userResult, profiles, roles] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      profilesByIds(admin, [userId]),
      rolesByUserIds(admin, [userId]),
    ]);
    if (userResult.error && !profiles.has(userId)) return null;
    return userToResult(userResult.data.user ?? null, profiles.get(userId) ?? null, roles.get(userId) ?? null);
  }

  if (email) {
    const authUser = await findAuthUserByEmail(admin, email);
    if (authUser) {
      const [profiles, roles] = await Promise.all([
        profilesByIds(admin, [authUser.id]),
        rolesByUserIds(admin, [authUser.id]),
      ]);
      return userToResult(authUser, profiles.get(authUser.id) ?? null, roles.get(authUser.id) ?? null);
    }

    const { data } = await admin
      .from('profiles')
      .select('id,email,username,display_name')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const roles = await rolesByUserIds(admin, [String(data.id)]);
    return userToResult(null, data as ProfileRow, roles.get(String(data.id)) ?? null);
  }

  if (username) {
    const { data } = await admin
      .from('profiles')
      .select('id,email,username,display_name')
      .ilike('username', username)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const roles = await rolesByUserIds(admin, [String(data.id)]);
    return userToResult(null, data as ProfileRow, roles.get(String(data.id)) ?? null);
  }

  return null;
}

export function roleSnapshot(role: AdminRoleRow | null | undefined) {
  if (!role) return null;
  return roleToClient(role);
}

export async function logAdminAudit(
  admin: DbClient,
  input: {
    actor: User;
    target: AdminUserResult;
    action: 'grant_admin' | 'revoke_admin' | 'update_permissions';
    oldValue?: unknown;
    newValue?: unknown;
  },
) {
  const { error } = await admin.from('admin_audit_logs').insert({
    actor_user_id: input.actor.id,
    actor_email: input.actor.email ?? null,
    target_user_id: input.target.id,
    target_email: input.target.email,
    action: input.action,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
  });
  if (error) {
    console.error('[admin-roles] audit insert failed', { code: error.code, message: error.message });
  }
}

export function validateAdminRoleChange(actor: User, target: AdminUserResult) {
  if (actor.id === target.id) {
    return { ok: false as const, code: 'SELF_ADMIN_CHANGE_NOT_ALLOWED', status: 400 };
  }
  if (isSuperAdminEmail(target.email)) {
    return { ok: false as const, code: 'SUPER_ADMIN_ENV_LOCKED', status: 400 };
  }
  return { ok: true as const };
}

export function permissionsToJson(permissions: AdminPermissions) {
  return JSON.parse(JSON.stringify(permissions)) as Record<string, boolean>;
}
