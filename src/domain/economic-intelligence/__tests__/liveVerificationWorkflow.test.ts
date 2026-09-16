import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/economic-intelligence-live-verify.yml', 'utf8');

describe('economic intelligence live verification workflow', () => {
  it('targets the exact READY deployment and never falls back to a generic production URL', () => {
    expect(workflow).toContain('sha: context.sha, environment, per_page: 100');
    expect(workflow).toContain('deployment.sha !== context.sha');
    expect(workflow).toContain("latest.state !== 'success'");
    expect(workflow).toContain("/^thesfm-[a-z0-9]+-mohammed-alqallaf-s-projects\\.vercel\\.app$/");
  });

  it('reruns when Economic Intelligence domain verification changes', () => {
    expect(workflow).toContain('- src/domain/economic-intelligence/**');
    expect(workflow).toContain('branches: [main, test/economic-intelligence-live-production-20260916]');
  });

  it('uses only the dedicated test account public auth path and no service-role credential', () => {
    expect(workflow).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    expect(workflow).toContain('E2E_USER_EMAIL');
    expect(workflow).toContain('E2E_USER_PASSWORD');
    expect(workflow).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(workflow).not.toContain('service_role');
  });

  it('verifies private authenticated reads before attempting a reversible confirmation', () => {
    expect(workflow).toContain("'/api/economic-intelligence/readiness'");
    expect(workflow).toContain("'/api/economic-intelligence/provenance'");
    expect(workflow).toContain("'/api/economic-intelligence/daily-brief?lang=ar'");
    expect(workflow).toContain('requirePrivateNoStore');
    expect(workflow).toContain('cleanupKey = candidate.key');
    expect(workflow).toContain("method: 'DELETE'");
    expect(workflow).toContain("lifecycle = 'verified_and_cleaned'");
  });

  it('does not publish personal financial values or response bodies in the verification summary', () => {
    expect(workflow).toContain("readiness: 'verified'");
    expect(workflow).toContain("provenance: 'verified'");
    expect(workflow).toContain("dailyBrief: 'verified'");
    expect(workflow).not.toContain('overallScore:');
    expect(workflow).not.toContain('historyCount:');
    expect(workflow).not.toContain('provenanceEntries:');
  });
});
