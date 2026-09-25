import { ensureReleasePreview } from './ensure-release-preview.mjs';

// Fail early on configuration errors without starting a paid Preview build.
// The later authenticated-preview job still owns the complete release gates.
export async function preflightReleasePreview({ github, context, core, env = process.env,
  fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const sha = context.payload.pull_request?.head?.sha;
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Missing exact Preview commit.');
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { data } = await github.rest.checks.listForRef({ ...context.repo, ref: sha, per_page: 100 });
    const checks = data.check_runs.filter(check => check.name === 'Supabase Preview' && check.app?.slug === 'supabase');
    if (checks.some(check => check.status === 'completed' && ['skipped', 'cancelled'].includes(check.conclusion))) {
      core.info('No isolated Supabase Preview is available; configuration preflight is not applicable.');
      return;
    }
    if (checks.some(check => check.status === 'completed' && check.conclusion !== 'success')) {
      throw new Error('The isolated Supabase Preview check failed.');
    }
    const successful = checks.filter(check => check.status === 'completed' && check.conclusion === 'success');
    if (successful.length) {
      const refs = new Set(successful.map(check => {
        const match = /^https:\/\/supabase\.com\/dashboard\/project\/([a-z0-9]{20})\/?$/.exec(check.details_url ?? '');
        if (!match) throw new Error('Invalid isolated Supabase Preview URL.');
        return match[1];
      }));
      if (refs.size !== 1) throw new Error('Ambiguous isolated Supabase Preview identity.');
      const [ref] = refs;
      await ensureReleasePreview({ github, context, core, fetchImpl, sleep, configureOnly: true,
        env: { ...env, SUPABASE_PREVIEW_REF: ref, SUPABASE_PREVIEW_URL: `https://${ref}.supabase.co` } });
      return;
    }
    await sleep(10_000);
  }
  throw new Error('No isolated Supabase Preview was ready for configuration preflight.');
}
