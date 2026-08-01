import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(join(process.cwd(), '.github/workflows/scanner-isolated-preview-validate.yml'), 'utf8');

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

describe('Supabase Preview Validate workflow safety invariants (unchanged by the concurrency fix)', () => {
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

  it('never materializes the baseline for an externally-reused branch', () => {
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
