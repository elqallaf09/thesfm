const { test } = process.env.VITEST ? await import('vitest') : await import('node:test');
import assert from 'node:assert/strict';
import { preflightReleasePreview } from '../preflight-release-preview.mjs';
import { ensureReleasePreview } from '../ensure-release-preview.mjs';

const sha = 'a'.repeat(40);
const ref = 'b'.repeat(20);
const project = 'prj_AumPZoHxwpIUVJID2gQBx30ZmciV';
const jwt = role => `test.${Buffer.from(JSON.stringify({ ref, role })).toString('base64url')}.test`;
const source = { type: 'github', repoId: 1236791806, ref: 'feat/test', sha };
const meta = { githubCommitSha: sha, sfmPreviewRef: ref, sfmPreviewVersion: '1' };
const ready = { id: 'dpl_Test', projectId: project, target: null, gitSource: source, meta,
  readyState: 'READY', url: 'isolated-test.vercel.app' };

function setup({ existing = false, transform = value => value, stale = false, behind = false, fail = false } = {}) {
  const calls = []; const masks = []; const outputs = [];
  const env = { VERCEL_TOKEN: 'test-vercel', SUPABASE_ACCESS_TOKEN: 'test-supabase',
    SUPABASE_PREVIEW_REF: ref, SUPABASE_PRODUCTION_REF: 'c'.repeat(20), SUPABASE_PREVIEW_URL: `https://${ref}.supabase.co` };
  const context = { repo: { owner: 'elqallaf09', repo: 'thesfm' }, payload: { pull_request: {
    number: 199, head: { sha, ref: 'feat/test', repo: { id: 1236791806, full_name: 'elqallaf09/thesfm' } },
  } } };
  const github = { rest: {
    pulls: { get: async () => ({ data: { state: 'open', head: { sha: stale ? 'd'.repeat(40) : sha }, base: { sha: 'e'.repeat(40) } } }) },
    repos: {
      compareCommitsWithBasehead: async () => ({ data: { status: behind ? 'diverged' : 'ahead' } }),
      listDeployments: async () => ({ data: existing ? [{ id: 9, sha, ref: sha, payload: { vercelDeploymentId: ready.id } }] : [] }),
      createDeployment: async body => { calls.push(['github-create', body]); return { data: { id: 9 } }; },
      createDeploymentStatus: async body => { calls.push(['github-status', body]); },
    },
  } };
  const core = { setSecret: value => masks.push(value), setOutput: (...values) => outputs.push(values), info: () => {} };
  const fetchImpl = async (input, init) => {
    const url = new URL(input); const body = init.body ? JSON.parse(init.body) : null;
    calls.push([url.pathname, body]);
    assert.equal(init.redirect, 'error'); assert.ok(init.signal instanceof AbortSignal);
    if (fail) throw new Error('credential-that-must-not-escape');
    let data;
    if (url.hostname === 'api.supabase.com') data = ['anon', 'service_role'].map(role => ({ name: role, type: 'legacy', api_key: jwt(role) }));
    else if (url.pathname.startsWith('/v9/projects/')) data = { id: project, link: { productionBranch: 'main' } };
    else if (url.pathname === '/v6/deployments') data = { deployments: existing ? [{ uid: ready.id, meta, target: null }] : [] };
    else if (url.pathname.endsWith('/env')) data = { created: body };
    else data = transform(ready);
    return { ok: true, json: async () => data };
  };
  return { args: { github, context, core, env, fetchImpl, sleep: async () => {} }, calls, masks, outputs };
}

test('creates one pinned Preview with branch-only configuration and no production deployment', async () => {
  const fixture = setup();
  assert.equal(await ensureReleasePreview(fixture.args), 'https://isolated-test.vercel.app');
  const variables = fixture.calls.filter(([path]) => path.endsWith('/env')).map(([, body]) => body);
  assert.equal(variables.length, 8);
  for (const item of variables) {
    assert.deepEqual(item.target, ['preview']); assert.equal(item.gitBranch, 'feat/test');
    if (item.key.includes('SERVICE_ROLE')) assert.equal(item.type, 'sensitive');
    if (item.key.startsWith('NEXT_PUBLIC_')) assert.notEqual(item.value, jwt('service_role'));
  }
  const creations = fixture.calls.filter(([path]) => path === '/v13/deployments');
  assert.equal(creations.length, 1);
  assert.deepEqual(creations[0][1].gitSource, source);
  assert.equal(creations[0][1].target, undefined);
  assert.deepEqual(fixture.masks, [jwt('service_role'), jwt('anon')]);
  assert.equal(fixture.calls.find(([name]) => name === 'github-create')[1].production_environment, false);
});

test('rerun reuses the existing deployment without fetching keys, changing env or rebuilding', async () => {
  const fixture = setup({ existing: true });
  await ensureReleasePreview(fixture.args);
  assert.equal(fixture.calls.filter(([, body]) => body).length, 1); // ready status only
  assert.equal(fixture.masks.length, 0);
  assert.ok(!fixture.calls.some(([path]) => path.includes('api-keys') || path.endsWith('/env') || path === 'github-create'));
});

test('rejects forks, production refs, stale heads and missing tokens before any mutation', async () => {
  for (const mutate of [
    f => { f.args.context.payload.pull_request.head.repo.full_name = 'someone/fork'; },
    f => { f.args.context.payload.pull_request.head.ref = 'main'; },
    f => { f.args.env.SUPABASE_PREVIEW_REF = f.args.env.SUPABASE_PRODUCTION_REF; },
    f => { f.args.env.VERCEL_TOKEN = ''; },
    f => { f.args.env.SUPABASE_PREVIEW_URL = 'https://elsewhere.example'; },
  ]) {
    const fixture = setup(); mutate(fixture);
    await assert.rejects(ensureReleasePreview(fixture.args));
    assert.equal(fixture.calls.length, 0);
  }
  const fixture = setup({ stale: true });
  await assert.rejects(ensureReleasePreview(fixture.args), /stale/);
  assert.equal(fixture.calls.length, 0);
  const oldBase = setup({ behind: true });
  await assert.rejects(ensureReleasePreview(oldBase.args), /current main/);
  assert.equal(oldBase.calls.length, 0);
});

test('never treats wrong SHA, project, isolation, target or host as ready', async () => {
  for (const change of [{ gitSource: { ...source, sha: 'f'.repeat(40) } }, { projectId: 'another-project' },
    { meta: { ...meta, sfmPreviewRef: 'c'.repeat(20) } }, { target: 'production' },
    { url: 'vercel.app.attacker.example' }, { readyState: 'ERROR' }]) {
    const fixture = setup({ existing: true, transform: data => ({ ...data, ...change }) });
    await assert.rejects(ensureReleasePreview(fixture.args));
    assert.equal(fixture.outputs.length, 0);
    assert.ok(!fixture.calls.some(([name]) => name === 'github-status'));
  }
});

test('does not expose network exceptions or retry a failed API mutation', async () => {
  const fixture = setup({ fail: true });
  await assert.rejects(ensureReleasePreview(fixture.args), error => !error.message.includes('credential-that-must-not-escape'));
  assert.equal(fixture.calls.length, 1);
});


test('configuration preflight never creates a deployment or reports a release URL', async () => {
  const fixture = setup();
  await ensureReleasePreview({ ...fixture.args, configureOnly: true });
  assert.equal(fixture.calls.filter(([path]) => path.endsWith('/env')).length, 8);
  assert.ok(!fixture.calls.some(([path]) => path === '/v13/deployments' || path.startsWith('github-')));
  assert.deepEqual(fixture.outputs, []);
});

test('HTTP diagnostics expose only the variable name and sanitized API code', async () => {
  for (const code of ['invalid_request', 'ENV_CONFLICT', 'secret value with whitespace']) {
    const fixture = setup();
    const original = fixture.args.fetchImpl;
    fixture.args.fetchImpl = async (url, init) => new URL(url).pathname.endsWith('/env')
      ? { ok: false, status: 400, json: async () => ({ error: { code, message: jwt('service_role') } }) }
      : original(url, init);
    await assert.rejects(ensureReleasePreview(fixture.args), error => {
      assert.equal(error.message, `Vercel NEXT_PUBLIC_SUPABASE_URL failed HTTP 400 (${code !== 'secret value with whitespace' ? code : 'unclassified'}).`);
      return true;
    });
    assert.deepEqual(fixture.outputs, []);
  }
});

test('preflight resolves only the exact-SHA Supabase integration and configures without deploying', async () => {
  const fixture = setup(); let polls = 0;
  fixture.args.github.rest.checks = { listForRef: async request => {
    assert.equal(request.ref, sha); polls += 1;
    return { data: { check_runs: polls === 1 ? [] : [{ name: 'Supabase Preview', app: { slug: 'supabase' },
      status: 'completed', conclusion: 'success', details_url: `https://supabase.com/dashboard/project/${ref}` }] } };
  } };
  await preflightReleasePreview(fixture.args);
  assert.equal(polls, 2);
  assert.equal(fixture.calls.filter(([path]) => path.endsWith('/env')).length, 8);
  assert.ok(!fixture.calls.some(([path]) => path === '/v13/deployments'));
});

test('preflight rejects untrusted, malformed, ambiguous and Production database checks', async () => {
  const check = { name: 'Supabase Preview', app: { slug: 'supabase' }, status: 'completed', conclusion: 'success',
    details_url: `https://supabase.com/dashboard/project/${ref}` };
  for (const checks of [
    [{ ...check, app: { slug: 'other-app' } }],
    [{ ...check, details_url: 'https://attacker.example/project/' + ref }],
    [check, { ...check, details_url: 'https://supabase.com/dashboard/project/' + 'd'.repeat(20) }],
    [{ ...check, details_url: 'https://supabase.com/dashboard/project/' + 'c'.repeat(20) }],
  ]) {
    const fixture = setup();
    fixture.args.github.rest.checks = { listForRef: async () => ({ data: { check_runs: checks } }) };
    await assert.rejects(preflightReleasePreview(fixture.args));
    assert.equal(fixture.calls.length, 0);
  }
});
