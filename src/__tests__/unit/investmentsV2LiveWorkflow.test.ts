import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/investments-v2-live-verify.yml', 'utf8');

describe('Investments v2 live verification workflow', () => {
  it('resolves an exact-sha Vercel deployment instead of a generic site URL', () => {
    expect(workflow).toContain('sha: context.sha, environment, per_page: 100');
    expect(workflow).toContain('deployment.sha !== context.sha');
    expect(workflow).toContain("latest.state !== 'success'");
    expect(workflow).toContain("/^thesfm-[a-z0-9]+-mohammed-alqallaf-s-projects\\.vercel\\.app$/");
  });

  it('uses only the dedicated E2E account public auth path', () => {
    expect(workflow).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(workflow).toContain('E2E_USER_EMAIL');
    expect(workflow).toContain('E2E_USER_PASSWORD');
    expect(workflow).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).not.toContain('service_role');
  });

  it('requires production readiness but verifies fail-closed behavior on preview', () => {
    expect(workflow).toContain("const isProduction = process.env.IS_PRODUCTION === 'true'");
    expect(workflow).toContain('if (isProduction && !ready)');
    expect(workflow).toContain("positions.response.status !== 409");
    expect(workflow).toContain("INVESTMENT_CANONICAL_NOT_READY");
  });

  it('checks privacy controls without logging holdings or financial values', () => {
    expect(workflow).toContain('requireNoStore');
    expect(workflow).toContain("['legacy_snapshot', 'legacy_investment_item_id', 'user_id']");
    expect(workflow).not.toContain('JSON.stringify(positions.payload.positions, null, 2)');
    expect(workflow).not.toContain('current_total_value');
    expect(workflow).not.toContain('purchase_unit_price');
  });
});
