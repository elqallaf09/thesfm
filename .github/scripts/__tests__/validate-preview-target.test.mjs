const { test } = process.env.VITEST ? await import('vitest') : await import('node:test');
import assert from 'node:assert/strict';
import { validatePreviewTarget } from '../validate-preview-target.mjs';

const sha = 'a'.repeat(40), merge = 'b'.repeat(40), tree = 'c'.repeat(40);
const repo = { owner: 'elqallaf09', repo: 'thesfm' };
function setup() {
  return { repo, sha, pr: {
    state: 'closed', merged: true, merge_commit_sha: merge,
    head: { sha, ref: 'feat/mobile', repo: { full_name: 'elqallaf09/thesfm' } },
    base: { sha: 'd'.repeat(40), ref: 'main', repo: { full_name: 'elqallaf09/thesfm' } },
  }, github: { rest: { repos: {
    getCommit: async () => ({ data: { commit: { tree: { sha: tree } } } }),
    compareCommitsWithBasehead: async () => ({ data: { status: 'ahead', files: [{ filename: '.github/workflows/fix.yml' }] } }),
  } } } };
}

test('accepts a merged exact tree with only subsequent validation infrastructure changes', async () => {
  await validatePreviewTarget(setup());
});

test('rejects a closed unmerged or changed head and a fork', async () => {
  for (const edit of [a => { a.pr.merged = false; }, a => { a.pr.head.sha = merge; },
    a => { a.pr.head.repo.full_name = 'evil/fork'; }, a => { a.pr.base.ref = 'other'; }]) {
    const args = setup(); edit(args);
    await assert.rejects(validatePreviewTarget(args));
  }
});

test('rejects a merge that changed the application tree', async () => {
  const args = setup();
  args.github.rest.repos.getCommit = async ({ ref }) => ({ data: { commit: { tree: { sha: ref === sha ? tree : merge } } } });
  await assert.rejects(validatePreviewTarget(args), /Merged tree/);
});

test('rejects application drift, renames out of runtime code, incomplete comparisons and rewritten main', async () => {
  for (const data of [
    { status: 'ahead', files: [{ filename: 'apps/expo-go/app.config.js' }] },
    { status: 'ahead', files: [{ filename: '.github/x', previous_filename: 'src/auth.ts' }] },
    { status: 'ahead', files: Array(300).fill({ filename: '.github/x' }) },
    { status: 'diverged', files: [] }, { status: 'ahead' },
  ]) {
    const args = setup();
    args.github.rest.repos.compareCommitsWithBasehead = async () => ({ data });
    await assert.rejects(validatePreviewTarget(args));
  }
});

test('open PR still requires an up-to-date branch', async () => {
  const args = setup(); args.pr.state = 'open';
  args.github.rest.repos.compareCommitsWithBasehead = async () => ({ data: { status: 'diverged' } });
  await assert.rejects(validatePreviewTarget(args), /current main/);
});
