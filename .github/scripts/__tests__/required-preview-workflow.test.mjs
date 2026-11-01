const { test } = process.env.VITEST ? await import('vitest') : await import('node:test');
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  .split('\n').map(line => line.replace(/^            /, '')).join('\n');
const sha = 'a'.repeat(40);
const pr = { number: 310, state: 'open', user: { login: 'owner' },
  head: { sha, ref: 'feature/mobile', repo: { full_name: 'owner/repo' } },
  base: { sha: 'b'.repeat(40), ref: 'main' } };
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function resolve({ candidate = pr, current = candidate, comparison = 'ahead', inputs = { INPUT_TARGET_SHA: sha } } = {}) {
  const outputs = {};
  const github = { paginate: async () => [candidate], rest: {
    pulls: { get: async () => ({ data: current }) },
    repos: { listPullRequestsAssociatedWithCommit() {}, compareCommitsWithBasehead: async () => ({ data: { status: comparison } }) },
  } };
  const core = { setOutput: (key, value) => { outputs[key] = value; }, info() {}, setFailed: message => { throw new Error(message); } };
  await new AsyncFunction('github', 'context', 'core', 'process', resolver)(github,
    { repo: { owner: 'owner', repo: 'repo' }, payload: {} }, core, { env: inputs });
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
