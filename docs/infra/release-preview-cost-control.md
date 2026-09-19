# Release Preview cost control

Development-branch automatic Vercel deployments remain disabled in `vercel.json`.
The required authenticated Preview check must still run before merging.

The CI authenticated-preview job now creates a single isolated Preview only after
typecheck, lint, translations, launch guards, unit tests, the full migration chain,
production build, browser tests and the Lighthouse advisory have completed.
It uses the existing protected `Preview` environment and its `VERCEL_TOKEN` and
`SUPABASE_ACCESS_TOKEN`; no new secret is committed or exported as an artifact.

- Only same-repository feature branches are eligible; stale PR heads and the
  Vercel Production branch are rejected. The branch must contain current main
  before a Preview is created, avoiding builds that cannot yet be merged.
- The exact successful Supabase Preview check supplies the isolated project ref.
  Production refs and credentials for another project are rejected.
- Database variables are scoped to that branch and the Preview target only.
  Service-role values use Vercel's sensitive variable type.
- The deployment is pinned to the full commit SHA. CI verifies its project,
  source, target and isolation metadata before accepting its URL.
- Reruns reuse a READY or pending deployment. Failed builds and uncertain API
  responses do not automatically create a second deployment.
- A GitHub deployment status means the build is READY, not that authentication
  passed. Existing fixture provisioning, isolation probes, complete remote smoke
  tests and unconditional fixture cleanup remain required.

If `VERCEL_TOKEN` is missing or insufficient, configure the existing protected
Preview environment and rerun the failed job. Do not remove authentication checks
or substitute the Production database. Native applications and broker/bank
integrations remain separate roadmap work.

API contracts: [deployment creation](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment)
and [branch-scoped environment variables](https://vercel.com/docs/rest-api/projects/create-one-or-more-environment-variables).
