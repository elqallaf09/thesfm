import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { assertDisposableConfiguration, localOnlyFetch, LOCAL_API } from './local-rls-guard.mjs';

const status = JSON.parse(await readFile(process.argv[2], 'utf8'));
assertDisposableConfiguration(status, process.env.SFM_RLS_DISPOSABLE);
const options = { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: localOnlyFetch } };
const admin = createClient(LOCAL_API, status.SERVICE_ROLE_KEY, options);
const anonymous = createClient(LOCAL_API, status.ANON_KEY, options);
const users = [];
const passed = [];
const marker = `ei-isolation-${randomUUID()}`;
const descriptors = [
  {
    table: 'user_decisions',
    row: userId => ({ user_id: userId, decision_title: marker, decision_type: 'other', amount: 1, currency: 'KWD', inputs: { isolated_test: marker }, analysis: {}, status: 'draft' }),
    patch: { decision_title: `${marker}-updated` },
  },
  {
    table: 'notifications',
    row: userId => ({ user_id: userId, type: 'info', title: marker, source_module: 'economic_intelligence', event_key: marker, status: 'unread', metadata: { evidence_snapshot: { isolated_test: marker } } }),
    patch: { status: 'read', read: true },
  },
  {
    table: 'economic_intelligence_confirmations',
    row: userId => ({ user_id: userId, confirmation_key: 'no_debts' }),
    patch: { confirmed_at: new Date().toISOString() },
    forged: { confirmation_key: 'no_investments' },
  },
];

function record(label) {
  passed.push(label);
  console.log(`PASS ${label}`);
}
function successful(response, label) {
  assert.equal(response.error?.code ?? null, null, `${label}: ${response.error?.code ?? 'unknown error'}`);
  return response.data;
}
function denied(response, label) {
  assert.equal(response.error?.code, '42501', `${label}: expected an actual RLS/privilege denial.`);
  record(label);
}

async function makeUser(index) {
  const email = `${marker}-${index}@example.test`;
  const password = randomBytes(32).toString('base64url');
  const created = successful(await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Disposable isolation fixture' } }), 'create disposable user');
  assert.ok(created?.user?.id, 'The local Auth service must create a real user.');
  const user = { id: created.user.id, client: createClient(LOCAL_API, status.ANON_KEY, options) };
  users.push(user);
  const signedIn = successful(await user.client.auth.signInWithPassword({ email, password }), 'sign in disposable user');
  assert.equal(signedIn.user?.id, user.id);
  assert.ok(signedIn.session?.access_token, 'A real user session is required.');
  const claims = JSON.parse(Buffer.from(signedIn.session.access_token.split('.')[1], 'base64url').toString('utf8'));
  assert.equal(claims.sub, user.id);
  assert.equal(claims.role, 'authenticated', 'Never exercise data access as service_role.');
  record(`user ${index}: real authenticated session with matching subject`);
  return user;
}

async function checkDirection(descriptor, own, other, ownId, otherId, direction) {
  const { table, patch } = descriptor;
  const prefix = `${table} ${direction}`;
  const before = successful(await other.client.from(table).select('*').eq('id', otherId).single(), `${prefix} other baseline`);
  const visible = successful(await own.client.from(table).select('id,user_id').in('id', [ownId, otherId]), `${prefix} select`);
  assert.deepEqual(visible, [{ id: ownId, user_id: own.id }]);
  record(`${prefix}: reads own row, hides other user's row`);
  const update = successful(await own.client.from(table).update(patch).eq('id', otherId).select('id'), `${prefix} cross update`);
  assert.deepEqual(update, []);
  record(`${prefix}: cross-user update affects zero rows`);
  const deletion = successful(await own.client.from(table).delete().eq('id', otherId).select('id'), `${prefix} cross delete`);
  assert.deepEqual(deletion, []);
  record(`${prefix}: cross-user delete affects zero rows`);
  denied(await own.client.from(table).insert({ ...descriptor.row(other.id), ...descriptor.forged, id: randomUUID() }), `${prefix}: forged ownership insert denied`);
  denied(await own.client.from(table).update({ user_id: other.id }).eq('id', ownId).select('id'), `${prefix}: ownership transfer denied`);
  const after = successful(await other.client.from(table).select('*').eq('id', otherId).single(), `${prefix} other unchanged`);
  assert.deepEqual(after, before);
  record(`${prefix}: other user's complete row remains unchanged`);
  const ownUpdate = successful(await own.client.from(table).update(patch).eq('id', ownId).select('*').single(), `${prefix} own update`);
  assert.equal(ownUpdate.id, ownId);
  assert.equal(ownUpdate.user_id, own.id);
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'confirmed_at') assert.equal(Date.parse(ownUpdate[key]), Date.parse(value));
    else assert.deepEqual(ownUpdate[key], value);
  }
  record(`${prefix}: own update succeeds and returns the changed row`);
  if (table === 'notifications') {
    assert.ok(ownUpdate.opened_at, 'Reading must record opened_at.');
    assert.equal(ownUpdate.actioned_at, null, 'Reading is not a user action.');
    assert.equal(ownUpdate.resolved_at, null, 'Reading does not resolve the event.');
    assert.deepEqual(ownUpdate.metadata, { evidence_snapshot: { isolated_test: marker } });
    record(`${prefix}: read/open/action semantics and evidence survive the real trigger`);
  }
}

async function checkTable(descriptor, first, second) {
  const { table } = descriptor;
  const ids = [];
  for (const user of [first, second]) {
    const row = successful(await user.client.from(table).insert({ ...descriptor.row(user.id), id: randomUUID() }).select('id,user_id').single(), `${table} own insert`);
    assert.ok(row?.id);
    assert.equal(row.user_id, user.id);
    ids.push(row.id);
    record(`${table}: user-owned insert succeeds`);
  }
  await checkDirection(descriptor, first, second, ids[0], ids[1], 'A->B');
  await checkDirection(descriptor, second, first, ids[1], ids[0], 'B->A');
  const anonRead = await anonymous.from(table).select('id').in('id', ids);
  if (anonRead.error) assert.equal(anonRead.error.code, '42501');
  else assert.deepEqual(anonRead.data, []);
  record(`${table}: anonymous user cannot read either row`);
  denied(await anonymous.from(table).insert({ ...descriptor.row(first.id), ...descriptor.forged, id: randomUUID() }), `${table}: anonymous insert denied`);
  for (let index = 0; index < 2; index += 1) {
    const deleted = successful(await [first, second][index].client.from(table).delete().eq('id', ids[index]).select('id'), `${table} own delete`);
    assert.deepEqual(deleted, [{ id: ids[index] }]);
    record(`${table}: owner can delete their own row`);
  }
}

let failure;
try {
  const first = await makeUser('A');
  const second = await makeUser('B');
  assert.notEqual(first.id, second.id);
  for (const descriptor of descriptors) await checkTable(descriptor, first, second);
} catch (error) {
  failure = error;
} finally {
  for (const user of users) {
    try {
      successful(await admin.auth.admin.deleteUser(user.id), 'delete disposable auth user');
      record('disposable Auth user removed');
    } catch (error) { failure ??= error; }
  }
}
const result = { status: failure ? 'failed' : 'passed', scope: 'disposable local Supabase Auth + PostgREST + PostgreSQL, repository migrations', productionTouched: false, checkedAt: new Date().toISOString(), checkout: process.env.GITHUB_SHA ?? null, checksPassed: passed.length, checks: passed, failure: failure instanceof Error ? failure.message : null };
await writeFile(process.argv[3], `${JSON.stringify(result, null, 2)}\n`);
if (failure) throw failure;
console.log(`Verified ${passed.length} checks against real local Supabase services; production was not contacted.`);
