import { createClient } from '@supabase/supabase-js';

const approvedPreviewRef = 'lwcaapfqxaoxkojehfdq';
const approvedPreviewOrigin = `https://${approvedPreviewRef}.supabase.co`;
const fixtureMetadataKey = 'sfm_preview_auth_fixture';
const fixtureVersion = 1;
const pageSize = 1000;
const maxUserPages = 100;

const adminPermissions = {
  admin_dashboard: true,
  company_reviews: true,
  instagram_automation: true,
  business_management: true,
  users_management: true,
  payments: true,
  reports: true,
  settings: true,
};

const command = process.argv[2];
if (!['provision', 'cleanup'].includes(command)) {
  throw new Error('Preview auth fixture command must be provision or cleanup.');
}

const config = readConfig();
const admin = createClient(config.origin, config.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

if (command === 'provision') {
  await provision();
} else {
  await cleanup();
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required Preview fixture environment variable: ${name}.`);
  return value;
}

function readConfig() {
  const rawOrigin = requiredEnvironment('SUPABASE_PREVIEW_URL');
  let origin;
  try {
    origin = new URL(rawOrigin);
  } catch {
    throw new Error('SUPABASE_PREVIEW_URL is not a valid URL.');
  }
  if (origin.origin !== approvedPreviewOrigin || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Preview auth fixtures may run only against the approved isolated Supabase Preview ref.');
  }

  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
  assertServiceKeyRef(serviceRoleKey);

  const credentials = [
    {
      role: 'user',
      email: requiredEnvironment('E2E_USER_EMAIL'),
      password: requiredEnvironment('E2E_USER_PASSWORD'),
    },
    {
      role: 'admin',
      email: requiredEnvironment('E2E_ADMIN_EMAIL'),
      password: requiredEnvironment('E2E_ADMIN_PASSWORD'),
    },
  ];
  if (normalizeEmail(credentials[0].email) === normalizeEmail(credentials[1].email)) {
    throw new Error('Preview user and admin fixtures must use distinct identities.');
  }

  return { origin: origin.origin, serviceRoleKey, credentials };
}

function assertServiceKeyRef(key) {
  const parts = key.split('.');
  if (parts.length !== 3) return;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (typeof payload.ref === 'string' && payload.ref !== approvedPreviewRef) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY belongs to a different Supabase project.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('different Supabase project')) throw error;
  }
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function marker(role) {
  return { version: fixtureVersion, preview_ref: approvedPreviewRef, role };
}

function isMarkedFixture(user, role) {
  const value = user?.app_metadata?.[fixtureMetadataKey];
  return Boolean(
    value
      && typeof value === 'object'
      && value.version === fixtureVersion
      && value.preview_ref === approvedPreviewRef
      && value.role === role,
  );
}

function safeOperationError(operation, error) {
  const status = Number.isInteger(error?.status) ? ` HTTP ${error.status}` : '';
  const code = typeof error?.code === 'string' && /^[A-Z0-9_-]{1,80}$/i.test(error.code)
    ? ` (${error.code})`
    : '';
  return new Error(`${operation} failed${status}${code}.`);
}

async function allUsers() {
  const users = [];
  for (let page = 1; page <= maxUserPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
    if (error) throw safeOperationError('Preview Auth user inventory', error);
    const next = Array.isArray(data?.users) ? data.users : [];
    users.push(...next);
    if (next.length < pageSize) return users;
  }
  throw new Error('Preview Auth user inventory exceeded the bounded page limit.');
}

async function findCredentialUser(credential) {
  const target = normalizeEmail(credential.email);
  const matches = (await allUsers()).filter(user => normalizeEmail(user.email ?? '') === target);
  if (matches.length > 1) throw new Error(`Duplicate Preview ${credential.role} fixture identities were detected.`);
  return matches[0] ?? null;
}

async function provisionAuthUser(credential) {
  const existing = await findCredentialUser(credential);
  if (existing && !isMarkedFixture(existing, credential.role)) {
    throw new Error(`Configured Preview ${credential.role} identity is not a marked synthetic fixture; refusing to alter it.`);
  }

  const appMetadata = {
    ...(existing?.app_metadata ?? {}),
    [fixtureMetadataKey]: marker(credential.role),
  };
  const userMetadata = {
    ...(existing?.user_metadata ?? {}),
    display_name: credential.role === 'admin' ? 'Preview RC Admin' : 'Preview RC User',
  };

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: credential.password,
      email_confirm: true,
      app_metadata: appMetadata,
      user_metadata: userMetadata,
    });
    if (error || !data?.user) throw safeOperationError(`Preview ${credential.role} fixture update`, error);
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: credential.email,
    password: credential.password,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });
  if (error || !data?.user) throw safeOperationError(`Preview ${credential.role} fixture creation`, error);
  return data.user;
}

async function provisionProfile(user, credential) {
  const now = new Date().toISOString();
  const { error } = await admin.from('profiles').upsert({
    id: user.id,
    email: normalizeEmail(credential.email),
    display_name: credential.role === 'admin' ? 'Preview RC Admin' : 'Preview RC User',
    onboarding_completed: true,
    onboarding_completed_at: now,
    onboarding_skipped: false,
    updated_at: now,
  }, { onConflict: 'id' });
  if (error) throw safeOperationError(`Preview ${credential.role} profile provisioning`, error);
}

async function provisionRole(user, credential) {
  if (credential.role === 'user') {
    const { error } = await admin.from('admin_roles').delete().eq('user_id', user.id);
    if (error) throw safeOperationError('Preview user role isolation', error);
    return 'none';
  }

  const { error } = await admin.from('admin_roles').upsert({
    user_id: user.id,
    email: normalizeEmail(credential.email),
    display_name: 'Preview RC Admin',
    role: 'admin',
    permissions: adminPermissions,
    is_active: true,
    created_by: null,
  }, { onConflict: 'user_id' });
  if (error) throw safeOperationError('Preview admin role provisioning', error);
  return 'admin:active';
}

async function verifyRole(user, credential) {
  const { data, error } = await admin
    .from('admin_roles')
    .select('user_id,role,is_active,permissions')
    .eq('user_id', user.id);
  if (error) throw safeOperationError(`Preview ${credential.role} role verification`, error);
  const rows = Array.isArray(data) ? data : [];
  if (credential.role === 'user') {
    if (rows.length !== 0) throw new Error('Preview user fixture unexpectedly has an admin role.');
    return 'none';
  }
  if (rows.length !== 1 || rows[0].role !== 'admin' || rows[0].is_active !== true) {
    throw new Error('Preview admin fixture does not have exactly one active admin role.');
  }
  if (rows[0].permissions?.admin_dashboard !== true) {
    throw new Error('Preview admin fixture is missing the admin observability permission.');
  }
  return 'admin:active';
}

async function verifyCredentialLifecycle(user, credential) {
  const auth = createClient(config.origin, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const first = await auth.auth.signInWithPassword({ email: credential.email, password: credential.password });
  if (first.error || first.data.user?.id !== user.id || !first.data.session?.access_token) {
    throw safeOperationError(`Preview ${credential.role} initial sign-in`, first.error);
  }
  const firstValidation = await auth.auth.getUser(first.data.session.access_token);
  if (firstValidation.error || firstValidation.data.user?.id !== user.id) {
    throw safeOperationError(`Preview ${credential.role} getUser validation`, firstValidation.error);
  }

  const signedOut = await auth.auth.signOut({ scope: 'local' });
  if (signedOut.error) throw safeOperationError(`Preview ${credential.role} logout`, signedOut.error);
  const cleared = await auth.auth.getSession();
  if (cleared.error || cleared.data.session !== null) {
    throw safeOperationError(`Preview ${credential.role} logout state verification`, cleared.error);
  }

  const second = await auth.auth.signInWithPassword({ email: credential.email, password: credential.password });
  if (second.error || second.data.user?.id !== user.id || !second.data.session?.access_token) {
    throw safeOperationError(`Preview ${credential.role} relogin`, second.error);
  }
  const secondValidation = await auth.auth.getUser(second.data.session.access_token);
  if (secondValidation.error || secondValidation.data.user?.id !== user.id) {
    throw safeOperationError(`Preview ${credential.role} relogin getUser validation`, secondValidation.error);
  }
  const finalSignOut = await auth.auth.signOut({ scope: 'local' });
  if (finalSignOut.error) throw safeOperationError(`Preview ${credential.role} final logout`, finalSignOut.error);
}

async function provision() {
  const safeUsers = [];
  for (const credential of config.credentials) {
    const user = await provisionAuthUser(credential);
    if (!isMarkedFixture(user, credential.role)) {
      throw new Error(`Preview ${credential.role} fixture marker verification failed.`);
    }
    await provisionProfile(user, credential);
    await provisionRole(user, credential);
    const roleState = await verifyRole(user, credential);
    await verifyCredentialLifecycle(user, credential);
    safeUsers.push({ userId: user.id, role: credential.role, roleState });
  }
  if (safeUsers[0].userId === safeUsers[1].userId) {
    throw new Error('Preview user and admin fixtures resolved to the same user ID.');
  }
  console.log(JSON.stringify({ event: 'preview-auth-fixtures-ready', previewRef: approvedPreviewRef, users: safeUsers }));
}

async function deleteRows(table, column, ids, operation) {
  if (ids.length === 0) return;
  const { error } = await admin.from(table).delete().in(column, ids);
  if (error) throw safeOperationError(operation, error);
}

async function rowCount(table, column, ids, operation) {
  if (ids.length === 0) return 0;
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true }).in(column, ids);
  if (error) throw safeOperationError(operation, error);
  return count ?? 0;
}

async function cleanup() {
  const fixtures = [];
  for (const credential of config.credentials) {
    const user = await findCredentialUser(credential);
    if (!user) continue;
    if (!isMarkedFixture(user, credential.role)) {
      throw new Error(`Configured Preview ${credential.role} identity is not a marked synthetic fixture; refusing cleanup.`);
    }
    fixtures.push({ user, credential });
  }

  const ids = fixtures.map(({ user }) => user.id);
  if (ids.length > 0) {
    const auditFilter = `actor_user_id.in.(${ids.join(',')}),target_user_id.in.(${ids.join(',')})`;
    const auditDelete = await admin.from('admin_audit_logs').delete().or(auditFilter);
    if (auditDelete.error) throw safeOperationError('Preview admin audit cleanup', auditDelete.error);
  }
  await deleteRows('admin_roles', 'user_id', ids, 'Preview admin role cleanup');
  await deleteRows('profiles', 'id', ids, 'Preview profile cleanup');

  const observabilityDelete = await admin
    .from('observability_events')
    .delete()
    .eq('metric_name', 'rc_preview_request_to_row');
  if (observabilityDelete.error) throw safeOperationError('Preview observability cleanup', observabilityDelete.error);

  for (const { user, credential } of fixtures) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw safeOperationError(`Preview ${credential.role} Auth cleanup`, error);
  }

  for (const credential of config.credentials) {
    if (await findCredentialUser(credential)) {
      throw new Error(`Preview ${credential.role} Auth cleanup left a synthetic user behind.`);
    }
  }

  const [profileCount, roleCount, actorAuditCount, targetAuditCount, observabilityResult] = await Promise.all([
    rowCount('profiles', 'id', ids, 'Preview profile cleanup verification'),
    rowCount('admin_roles', 'user_id', ids, 'Preview admin role cleanup verification'),
    rowCount('admin_audit_logs', 'actor_user_id', ids, 'Preview actor audit cleanup verification'),
    rowCount('admin_audit_logs', 'target_user_id', ids, 'Preview target audit cleanup verification'),
    admin.from('observability_events').select('*', { count: 'exact', head: true }).eq('metric_name', 'rc_preview_request_to_row'),
  ]);
  if (observabilityResult.error) {
    throw safeOperationError('Preview observability cleanup verification', observabilityResult.error);
  }
  const counts = {
    authUsers: 0,
    profiles: profileCount,
    adminRoles: roleCount,
    adminAuditRows: actorAuditCount + targetAuditCount,
    observabilityRows: observabilityResult.count ?? 0,
  };
  if (Object.values(counts).some(count => count !== 0)) {
    throw new Error('Preview synthetic resource cleanup did not reach zero.');
  }
  const safeUsers = fixtures.map(({ user, credential }) => ({
    userId: user.id,
    role: credential.role,
    roleState: 'removed',
  }));
  console.log(JSON.stringify({ event: 'preview-auth-fixtures-clean', previewRef: approvedPreviewRef, users: safeUsers, counts }));
}
