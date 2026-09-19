import { resolvePreviewCredentials } from './resolve-preview-credentials.mjs';

const project = 'prj_AumPZoHxwpIUVJID2gQBx30ZmciV';
const team = 'team_bbZHtZJklSZDa3vvhiG5B7PL';
const repository = 'elqallaf09/thesfm';
const repoId = 1236791806;

// Called only after the release checks. Reuse the same immutable deployment on
// retries; never force a rebuild or modify Production environment variables.
export async function ensureReleasePreview({ github, context, core, env = process.env,
  fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const pr = context.payload.pull_request;
  const sha = pr?.head?.sha;
  const branch = pr?.head?.ref;
  const ref = env.SUPABASE_PREVIEW_REF;
  if (`${context.repo.owner}/${context.repo.repo}` !== repository
    || pr?.head?.repo?.full_name !== repository || pr?.head?.repo?.id !== repoId
    || !/^[a-f0-9]{40}$/.test(sha ?? '') || !/^[A-Za-z0-9._/-]+$/.test(branch ?? '')
    || ['main', 'master'].includes(branch) || branch.startsWith('refs/')) {
    throw new Error('Preview requires an exact commit from a same-repository feature branch.');
  }
  if (!/^[a-z0-9]{20}$/.test(ref ?? '') || !/^[a-z0-9]{20}$/.test(env.SUPABASE_PRODUCTION_REF ?? '')
    || ref === env.SUPABASE_PRODUCTION_REF || env.SUPABASE_PREVIEW_URL !== `https://${ref}.supabase.co`) {
    throw new Error('Preview requires a verified isolated database, never Production.');
  }
  if (!env.VERCEL_TOKEN?.trim()) throw new Error('VERCEL_TOKEN is required in the protected Preview environment.');

  const request = async (path, body) => {
    const url = new URL(path, 'https://api.vercel.com');
    url.searchParams.set('teamId', team);
    let response;
    try {
      response = await fetchImpl(url, {
        method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch { throw new Error('Vercel request failed; no automatic mutation retry was attempted.'); }
    if (!response.ok) throw new Error(`Vercel request failed HTTP ${response.status}.`);
    const data = await response.json().catch(() => null);
    if (!data || data.error || data.failed?.length) throw new Error('Vercel returned an unsuccessful response.');
    return data;
  };
  const assertCurrent = async () => {
    const { data } = await github.rest.pulls.get({ ...context.repo, pull_number: pr.number });
    if (data.state !== 'open' || data.head.sha !== sha) throw new Error('Pull request changed; refusing a stale deployment.');
  };
  await assertCurrent();
  const settings = await request(`/v9/projects/${project}`);
  if (settings.id !== project || !settings.link?.productionBranch || settings.link.productionBranch === branch) {
    throw new Error('Unable to verify that the requested branch is not the Production branch.');
  }

  // Filter server-side by SHA, then verify the immutable source and isolation
  // marker again in the deployment detail response before using its URL.
  const found = [];
  let until;
  for (let page = 0; page < 10; page += 1) {
    const list = await request(`/v6/deployments?projectId=${project}&limit=100&meta-githubCommitSha=${sha}${until ? `&until=${until}` : ''}`);
    if (!Array.isArray(list.deployments)) throw new Error('Invalid deployment lookup response.');
    found.push(...list.deployments);
    if (!list.pagination?.next || !list.deployments.length) { until = null; break; }
    if (!Number.isSafeInteger(list.pagination.next) || list.pagination.next === until) throw new Error('Invalid deployment pagination.');
    until = list.pagination.next;
  }
  if (until) throw new Error('Deployment lookup was incomplete; refusing to create a possible duplicate.');
  const candidates = found.filter(item => item.meta?.githubCommitSha === sha && item.target !== 'production');
  if (candidates.some(item => item.meta?.sfmPreviewRef !== ref || item.meta?.sfmPreviewVersion !== '1')) {
    throw new Error('An existing Preview lacks verified isolation metadata; inspect it before proceeding.');
  }
  let deployment;
  if (candidates.length) {
    const candidate = candidates.sort((a, b) => b.created - a.created)[0];
    if (!/^dpl_[A-Za-z0-9]+$/.test(candidate.uid ?? candidate.id ?? '')) throw new Error('Invalid deployment identifier.');
    deployment = await request(`/v13/deployments/${candidate.uid ?? candidate.id}`);
  } else {
    const serviceKey = await resolvePreviewCredentials(env, fetchImpl);
    core.setSecret(serviceKey);
    let keysResponse;
    try {
      keysResponse = await fetchImpl(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, {
        headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}` },
        redirect: 'error', signal: AbortSignal.timeout(15_000),
      });
    } catch { throw new Error('Isolated public-key lookup failed.'); }
    if (!keysResponse.ok) throw new Error('Isolated public-key lookup was unsuccessful.');
    const keys = await keysResponse.json().catch(() => null);
    const anon = Array.isArray(keys) ? keys.filter(key => key.disabled !== true && key.name === 'anon'
      && (key.type === 'legacy' || key.type === undefined)) : [];
    const publicKey = anon.length === 1 ? anon[0].api_key : null;
    let claims;
    try { claims = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString('utf8')); } catch { /* fail below */ }
    if (typeof publicKey !== 'string' || publicKey.split('.').length !== 3 || /\s/.test(publicKey) || claims?.ref !== ref || claims?.role !== 'anon'
      || (typeof claims.exp === 'number' && claims.exp * 1000 <= Date.now())) {
      throw new Error('Public credential does not belong to the isolated Preview database.');
    }
    core.setSecret(publicKey);
    const variables = {
      NEXT_PUBLIC_SUPABASE_URL: env.SUPABASE_PREVIEW_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
      DATABASE_SERVICE_ROLE_KEY: serviceKey,
      NEXT_PUBLIC_OBSERVABILITY_ENABLED: 'true',
      NEXT_PUBLIC_OBSERVABILITY_SAMPLE_RATE: '0.1',
      TRADER_NATIVE_EDUCATION_ENABLED: 'true',
    };
    await assertCurrent();
    for (const [key, value] of Object.entries(variables)) {
      const result = await request(`/v10/projects/${project}/env?upsert=true`, {
        key, value, type: key.includes('SERVICE_ROLE') ? 'sensitive' : 'plain', target: ['preview'], gitBranch: branch,
      });
      if (result.created?.key !== key || result.created?.gitBranch !== branch
        || result.created?.target?.length !== 1 || result.created.target[0] !== 'preview') {
        throw new Error('Environment update did not confirm the isolated branch scope.');
      }
    }
    await assertCurrent();
    deployment = await request('/v13/deployments', {
      name: 'thesfm', project,
      // Omitted target means Preview. Production branch was rejected above.
      gitSource: { type: 'github', repoId, ref: branch, sha },
      meta: { githubCommitSha: sha, githubCommitRef: branch, sfmPreviewRef: ref, sfmPreviewVersion: '1' },
    });
  }
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (!/^dpl_[A-Za-z0-9]+$/.test(deployment.id ?? '') || deployment.projectId !== project
      || (deployment.target != null && deployment.target !== 'preview') || deployment.gitSource?.sha !== sha
      || deployment.gitSource?.type !== 'github' || String(deployment.gitSource?.repoId) !== String(repoId)
      || deployment.meta?.sfmPreviewRef !== ref || deployment.meta?.sfmPreviewVersion !== '1') {
      throw new Error('Deployment identity or database isolation did not match the requested Preview.');
    }
    if (['ERROR', 'CANCELED'].includes(deployment.readyState)) throw new Error('Preview build failed; inspect this deployment instead of creating another.');
    if (deployment.readyState === 'READY') break;
    await sleep(10_000);
    deployment = await request(`/v13/deployments/${deployment.id}`);
  }
  if (deployment.readyState !== 'READY') throw new Error('Preview remains pending; rerun to reuse this deployment.');
  if (!/^[a-zA-Z0-9-]+\.vercel\.app$/.test(deployment.url ?? '')) throw new Error('Invalid Preview URL.');
  await assertCurrent();
  const url = `https://${deployment.url}`;
  const existing = await github.rest.repos.listDeployments({ ...context.repo, sha, environment: 'Preview', per_page: 100 });
  let record = existing.data.find(item => item.sha === sha && item.ref === sha && item.payload?.vercelDeploymentId === deployment.id);
  if (!record) {
    const result = await github.rest.repos.createDeployment({ ...context.repo, ref: sha, environment: 'Preview',
      auto_merge: false, required_contexts: [], production_environment: false, transient_environment: true,
      payload: { vercelDeploymentId: deployment.id, supabasePreviewRef: ref },
      description: 'Isolated release Preview; authenticated smoke still required.' });
    record = result.data;
  }
  if (!Number.isSafeInteger(record.id)) throw new Error('GitHub did not register the Preview deployment.');
  await github.rest.repos.createDeploymentStatus({ ...context.repo, deployment_id: record.id, state: 'success',
    environment_url: url, auto_inactive: false, description: 'READY build; authenticated smoke is a separate required check.' });
  core.setOutput('url', url);
  core.info(`Verified isolated Preview ${deployment.id} for ${sha}.`);
  return url;
}
