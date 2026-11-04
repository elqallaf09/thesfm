// Revalidate immediately before spending or mutating isolated Preview resources.
export async function validatePreviewTarget({ github, repo, pr, sha }) {
  const name = `${repo.owner}/${repo.repo}`;
  if (!/^[a-f0-9]{40}$/.test(sha ?? '') || pr.head?.sha !== sha
    || pr.head?.repo?.full_name !== name || pr.base?.repo?.full_name !== name
    || pr.base?.ref !== 'main' || !pr.head?.ref || ['main', 'master'].includes(pr.head.ref)
    || pr.user?.login === 'dependabot[bot]') throw new Error('Invalid same-repository Preview target.');
  if (pr.state === 'open') {
    if (!/^[a-f0-9]{40}$/.test(pr.base.sha ?? '')) throw new Error('Missing current base commit.');
    const { data } = await github.rest.repos.compareCommitsWithBasehead({ ...repo, basehead: `${pr.base.sha}...${sha}` });
    if (!['ahead', 'identical'].includes(data.status)) throw new Error('Update the PR with current main before provisioning a Preview.');
    return;
  }
  if (pr.state !== 'closed' || pr.merged !== true || !/^[a-f0-9]{40}$/.test(pr.merge_commit_sha ?? ''))
    throw new Error('Closed unmerged PR cannot authorize a Preview.');
  const [head, merged] = await Promise.all([sha, pr.merge_commit_sha].map(ref => github.rest.repos.getCommit({ ...repo, ref })));
  const tree = head.data.commit?.tree?.sha;
  if (!/^[a-f0-9]{40}$/.test(tree ?? '') || tree !== merged.data.commit?.tree?.sha)
    throw new Error('Merged tree differs from the built application; refusing stale validation.');
  const { data } = await github.rest.repos.compareCommitsWithBasehead({ ...repo, basehead: `${pr.merge_commit_sha}...main`, per_page: 100 });
  if (!['ahead', 'identical'].includes(data.status) || !Array.isArray(data.files) || data.files.length >= 300
    || data.files.some(file => !file.filename.startsWith('.github/') || (file.previous_filename && !file.previous_filename.startsWith('.github/'))))
    throw new Error('Application changed after merge; refusing validation of obsolete binaries.');
}
