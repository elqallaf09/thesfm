import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(join(process.cwd(), '.github/workflows/supabase-preview-validate.yml'), 'utf8');

// Two SIGTERM cancellations mid-`supabase db reset` were traced to this
// workflow's own concurrency configuration: `cancel-in-progress: true`
// meant a later dispatch for the same target_pr could kill an
// already-running, stateful validation run partway through a live database
// reset. Queuing instead of cancelling is the fix — these assertions guard
// against that regressing.
describe('Supabase Preview Validate workflow concurrency', () => {
  const concurrencyBlock = workflow.match(/^concurrency:\n([\s\S]*?)\n\n/m)?.[1] ?? '';

  it('never cancels an in-progress run for the same target', () => {
    expect(concurrencyBlock).toMatch(/cancel-in-progress:\s*false/);
  });

  it('scopes the concurrency group by workflow name, not just the target input', () => {
    expect(concurrencyBlock).toMatch(/group:\s*\$\{\{\s*github\.workflow\s*\}\}-/);
  });

  it('still serializes on the same target_pr / target_sha / cleanup_branch_id input', () => {
    expect(concurrencyBlock).toContain('inputs.target_pr || inputs.target_sha || inputs.cleanup_branch_id');
  });
});

describe('Supabase Preview Validate workflow safety invariants', () => {
  it('always runs the cleanup job regardless of prior job outcomes', () => {
    const cleanupJob = workflow.match(/\n {2}cleanup:\n([\s\S]*?)(?:\n {2}\S|$)/)?.[1] ?? '';
    expect(cleanupJob.length).toBeGreaterThan(0);
    expect(cleanupJob).toMatch(/if:\s*always\(\)/);
  });

  it('never uses supabase db reset — replaced by bounded Management API baseline materialization', () => {
    expect(workflow).not.toMatch(/pnpm dlx supabase db reset/);
    expect(workflow).toContain('materialize-baseline');
  });

  it('still refuses to write when the resolved ref could be Production', () => {
    expect(workflow).toContain('--production-ref "${SUPABASE_PRODUCTION_REF}"');
    expect(workflow).toContain('Fail-closed identity assertion');
    expect(workflow).toContain('Resolved Preview ref matches SUPABASE_PRODUCTION_REF');
  });

  it('never materializes the baseline for a branch this run did not create itself', () => {
    expect(workflow).toContain("needs.provision-preview.outputs.source != 'workflow_created'");
    expect(workflow).toContain('must be recreated');
  });

  it('fails closed on a partial baseline mismatch instead of attempting automated repair', () => {
    expect(workflow).toContain("baseline_state == 'partial'");
    expect(workflow).toMatch(/never (?:auto-repaired|attempts to automatically repair)/);
  });

  it('never uses migration repair to manufacture a result', () => {
    expect(workflow).not.toMatch(/supabase migration repair/);
  });
});

// Reconciliation onto current main (PR #85's scanner fix + the pre-existing
// rollout/authenticated-smoke capabilities) added an explicit preview_ref
// override as a new top resolution tier, ahead of the external-check and
// workflow-created tiers this workflow already had.
describe('Supabase Preview Validate workflow preview-ref resolution order', () => {
  it('validates an explicit preview_ref input before falling through to the external check', () => {
    expect(workflow).toContain('Step 1 — validate an explicit preview_ref override');
    expect(workflow).toMatch(/ref\s*=~\s*\^\[a-z0-9\]\{20\}\$|\^\[a-z0-9\]\{20\}\$/);
    expect(workflow).toContain('preview_ref must not equal SUPABASE_PRODUCTION_REF');
  });

  it('resolves in explicit > external > workflow-created priority order', () => {
    const finalizeStep = workflow.match(/Finalize resolved ref and source[\s\S]*?(?=\n {6}- name:|\n {2}migration-validation:)/)?.[0] ?? '';
    const explicitIdx = finalizeStep.indexOf('source=explicit_ref');
    const externalIdx = finalizeStep.indexOf('source=externally_reused');
    const createdIdx = finalizeStep.indexOf('source=workflow_created');
    expect(explicitIdx).toBeGreaterThan(-1);
    expect(externalIdx).toBeGreaterThan(explicitIdx);
    expect(createdIdx).toBeGreaterThan(externalIdx);
  });

  it('skips the external check and branch creation once an explicit ref is already resolved', () => {
    expect(workflow).toContain("if: steps.explicit.outputs.ref == ''\n        uses: actions/github-script");
    expect(workflow).toContain("if: steps.explicit.outputs.ref == '' && steps.external.outputs.ref == ''");
  });

  it('does not require a static SUPABASE_PREVIEW_SERVICE_ROLE_KEY secret — keys are resolved dynamically per branch', () => {
    const secretsJob = workflow.match(/\n {2}validate-required-secrets:\n([\s\S]*?)(?:\n {2}\S)/)?.[1] ?? '';
    expect(secretsJob).not.toContain('secrets.SUPABASE_PREVIEW_SERVICE_ROLE_KEY');
    expect(workflow).toContain('no static SUPABASE_PREVIEW_SERVICE_ROLE_KEY secret is used');
  });
});

// The rollout and authenticated-smoke reusable workflows both existed on
// main before this reconciliation, gated on their own preview_ref input.
// They must consume the ONE resolved ref this workflow computes (whichever
// tier it came from), not a raw, unvalidated pass-through of the top-level
// preview_ref input — otherwise activating rollout against an
// externally-reused or workflow-created branch would silently target the
// wrong (or an empty) project.
describe('Supabase Preview Validate workflow optional rollout / authenticated-smoke wiring', () => {
  it('wires the rollout job to the resolved preview ref, not the raw input', () => {
    const rolloutJob = workflow.match(/\n {2}rollout:\n([\s\S]*?)(?:\n {2}\S)/)?.[1] ?? '';
    expect(rolloutJob).toContain('preview_ref: ${{ needs.provision-preview.outputs.ref }}');
    expect(rolloutJob).toContain('inputs.activate_rollout');
  });

  it('wires the authenticated-preview job to the resolved preview ref and exact target SHA', () => {
    const authJob = workflow.match(/\n {2}authenticated-preview:\n([\s\S]*?)(?:\n {2}\S)/)?.[1] ?? '';
    expect(authJob).toContain('preview_ref: ${{ needs.provision-preview.outputs.ref }}');
    expect(authJob).toContain('target_sha: ${{ needs.resolve-target.outputs.sha }}');
    expect(authJob).toContain('inputs.run_authenticated_smoke');
  });

  it('cleanup waits for rollout and authenticated-preview so the branch is never deleted out from under them', () => {
    const cleanupJob = workflow.match(/\n {2}cleanup:\n([\s\S]*?)(?:\n {2}\S|$)/)?.[1] ?? '';
    expect(cleanupJob).toMatch(/needs:\s*\[[^\]]*\brollout\b[^\]]*\]/);
    expect(cleanupJob).toMatch(/needs:\s*\[[^\]]*\bauthenticated-preview\b[^\]]*\]/);
  });
});
