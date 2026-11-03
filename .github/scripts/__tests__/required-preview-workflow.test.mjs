const { test } = process.env.VITEST ? await import('vitest') : await import('node:test');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validatePreviewTarget } from '../validate-preview-target.mjs';
import { spawnSync } from 'node:child_process';

const workflow = name => readFileSync(new URL(`../../workflows/${name}.yml`, import.meta.url), 'utf8');
const ci = workflow('ci');
const gate = ci.slice(ci.indexOf('      - name: Require the selected authenticated validation to pass'))
  .split('        run: |\n')[1].split('\n').map(line => line.replace(/^          /, '')).join('\n');

test('the required check rejects failed, cancelled, skipped, or missing selected validation', () => {
  for (const required of ['true', 'false', '']) {
    for (const result of ['success', 'failure', 'cancelled', 'skipped', '']) {
      for (const configuration of ['success', 'failure', 'skipped']) {
        const env = { ...process.env, CONFIGURATION_RESULT: configuration, MOBILE_REQUIRED: required,
          MOBILE_RESULT: required === 'true' ? result : 'skipped',
          EXTERNAL_RESULT: required === 'false' ? result : 'skipped' };
        const execution = spawnSync('bash', ['-e', '-c', gate], { env, encoding: 'utf8' });
        const expected = configuration === 'success' && required !== '' && result === 'success';
        assert.equal(execution.status === 0, expected, JSON.stringify({ required, result, configuration }));
      }
    }
  }
});

const resolver = workflow('supabase-preview-validate').split('      - name: Resolve exact target SHA\n')[1]
  .split('\n  validate-required-secrets:')[0].split('          script: |\n')[1]
  .split('\n').map(line => line.replace(/^            /, '')).join('\n')
  // Vitest's VM cannot import from new AsyncFunction. Inject the real helper
  // through its argument instead; the workflow keeps its normal Node import.
  .replace(/const \{ validatePreviewTarget \} = await import\([^\n]+\);/, '');
const sha = 'a'.repeat(40);
const pr = { number: 310, state: 'open', user: { login: 'owner' },
  head: { sha, ref: 'feature/mobile', repo: { full_name: 'owner/repo' } },
  base: { sha: 'b'.repeat(40), ref: 'main', repo: { full_name: 'owner/repo' } } };
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function resolve({ candidate = pr, current = candidate, comparison = 'ahead', inputs = { INPUT_TARGET_SHA: sha } } = {}) {
  const outputs = {};
  const github = { paginate: async () => [candidate], rest: {
    pulls: { get: async () => ({ data: current }) },
    repos: { listPullRequestsAssociatedWithCommit() {}, compareCommitsWithBasehead: async () => ({ data: { status: comparison } }) },
  } };
  const core = { setOutput: (key, value) => { outputs[key] = value; }, info() {}, setFailed: message => { throw new Error(message); } };
  await new AsyncFunction('github', 'context', 'core', 'process', 'validatePreviewTarget', resolver)(github,
    { repo: { owner: 'owner', repo: 'repo' }, payload: {} }, core, { env: { ...inputs, GITHUB_WORKSPACE: fileURLToPath(new URL('../../../', import.meta.url)) } }, validatePreviewTarget);
  return outputs;
}

test('reusable calls resolve typed inputs without depending on a workflow_dispatch event', async () => {
  assert.deepEqual(await resolve(), { sha, pr_number: '310' });
  assert.deepEqual(await resolve({ inputs: { INPUT_TARGET_PR: '310' } }), { sha, pr_number: '310' });
});

test('provisioning rejects stale heads, forks, closed PRs, dependency bots, and outdated main', async () => {
  for (const options of [
    { current: { ...pr, head: { ...pr.head, sha: 'c'.repeat(40) } } },
    { candidate: { ...pr, head: { ...pr.head, repo: { full_name: 'attacker/repo' } } } },
    { candidate: { ...pr, state: 'closed' } },
    { current: { ...pr, user: { login: 'dependabot[bot]' } } },
    { current: { ...pr, head: { ...pr.head, ref: 'main' } } },
    { comparison: 'diverged' },
    { inputs: { INPUT_TARGET_SHA: 'not-a-sha' } },
    { inputs: { INPUT_TARGET_SHA: sha, INPUT_TARGET_PR: '310' } },
  ]) await assert.rejects(resolve(options));
});


test('concurrent runs and retries create distinct workflow-owned branch names', () => {
  const create = workflow('supabase-preview-validate')
    .split('      - name: Step 3 — create a workflow-owned ephemeral branch (no explicit/external branch found)')[1]
    .split('        run: |\n')[1].split('\n      - name:')[0]
    .replace(/\$\{\{ needs.resolve-target.outputs.pr_number \}\}/g, '334')
    .replace(/\$\{\{ needs.resolve-target.outputs.sha \}\}/g, sha);
  const names = [];
  for (const [run, attempt] of [['100', '1'], ['101', '1'], ['100', '2']]) {
    const result = spawnSync('bash', ['-eu', '-c', 'node() { printf "%s\\n" "$@"; };\n' + create], {
      encoding: 'utf8', env: { ...process.env, GITHUB_RUN_ID: run, GITHUB_RUN_ATTEMPT: attempt, SUPABASE_PRODUCTION_REF: 'b'.repeat(20) },
    });
    assert.equal(result.status, 0, result.stderr);
    const args = result.stdout.trim().split('\n');
    const name = args[args.indexOf('--branch-name') + 1];
    assert.match(name, /^ci-pr-334-\d+-\d+$/);
    assert.equal(args[args.indexOf('--sha') + 1], sha);
    names.push(name);
  }
  assert.equal(new Set(names).size, 3);
});
