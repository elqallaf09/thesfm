import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');

describe('authenticated Preview CI policy', () => {
  it('treats only unavailable integration outcomes as not applicable', () => {
    expect(workflow).toContain("['skipped', 'cancelled'].includes(check.conclusion)");
    expect(workflow).toContain("check.status === 'completed' && check.conclusion !== 'success'");
    expect(workflow).toContain('core.setFailed(`Exact-SHA Supabase Preview check entered');
  });
});
