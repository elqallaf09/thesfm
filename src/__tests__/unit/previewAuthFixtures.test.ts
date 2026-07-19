import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const fixture = readSource('tests/smoke/preview-auth-fixtures.mjs');
const observability = readSource('tests/smoke/observability-preview.spec.ts');
const workflow = readSource('.github/workflows/ci.yml');
const authenticatedPreviewJob = workflow.slice(workflow.indexOf('  authenticated-preview:'));

describe('Preview-only authentication fixtures', () => {
  it('dynamically pins every fixture mutation to the verified isolated Preview project', () => {
    expect(fixture).toContain("const previewRef = requiredPreviewRef();");
    expect(fixture).toContain("requiredEnvironment('SUPABASE_PREVIEW_REF')");
    expect(fixture).toContain("requiredEnvironment('SUPABASE_PRODUCTION_REF')");
    expect(fixture).toContain("if (previewRef === productionRef)");
    expect(fixture).toContain('origin.origin !== approvedPreviewOrigin');
    expect(fixture).toContain("payload.ref !== previewRef");
    expect(fixture).not.toMatch(/SUPABASE_(?:PRODUCTION|PROJECT)_URL/);
    expect(observability).toContain('function requiredPreviewServiceOrigin()');
    expect(observability).toContain('Preview observability validation may never target the Production Supabase ref.');
  });

  it('uses protected environment credentials without putting them in arguments or logs', () => {
    for (const name of [
      'E2E_USER_EMAIL',
      'E2E_USER_PASSWORD',
      'E2E_ADMIN_EMAIL',
      'E2E_ADMIN_PASSWORD',
    ]) {
      expect(fixture).toContain(`requiredEnvironment('${name}')`);
    }
    expect(fixture).not.toMatch(/console\.(?:log|info|warn|error)\([^\n]*(?:email|password)/i);
    expect(workflow).not.toMatch(/preview-auth-fixtures\.mjs\s+(?:provision|cleanup)\s+--/);
    expect(authenticatedPreviewJob).toContain(
      'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_PREVIEW_SERVICE_ROLE_KEY }}',
    );
    expect(authenticatedPreviewJob).not.toContain(
      'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
    );
    expect(authenticatedPreviewJob).toContain('SUPABASE_PRODUCTION_REF: ${{ vars.SUPABASE_PRODUCTION_REF }}');
    expect(authenticatedPreviewJob).toContain('checks: read');
    expect(authenticatedPreviewJob).toContain('Resolve active isolated Supabase Preview ref for exact SHA');
    expect(authenticatedPreviewJob).toContain("core.exportVariable('SUPABASE_PREVIEW_REF', previewRef);");
    expect(authenticatedPreviewJob).not.toMatch(/SUPABASE_PREVIEW_URL:\s*https:\/\//);
    expect(authenticatedPreviewJob.indexOf('actions/checkout@v4')).toBeLessThan(
      authenticatedPreviewJob.indexOf('Resolve active isolated Supabase Preview ref for exact SHA'),
    );
  });

  it('is idempotent, refuses real users, validates JWTs, and removes synthetic resources', () => {
    expect(fixture).toContain('admin.auth.admin.listUsers');
    expect(fixture).toContain('admin.auth.admin.createUser');
    expect(fixture).toContain('admin.auth.admin.updateUserById');
    expect(fixture).toContain('not a marked synthetic fixture; refusing to alter it');
    expect(fixture).toContain("auth.auth.getUser(first.data.session.access_token)");
    expect(fixture).toContain("auth.auth.signOut({ scope: 'local' })");
    expect(fixture).toContain('admin.auth.admin.deleteUser');
    expect(fixture).toContain("deleteRows('admin_roles'");
    expect(fixture).toContain("deleteRows('profiles'");
    expect(fixture).toContain(".eq('metric_name', 'rc_preview_request_to_row')");
  });

  it('provisions before validation and performs cleanup unconditionally', () => {
    const provision = workflow.indexOf('Provision isolated Preview auth fixtures');
    const observability = workflow.indexOf('Validate authenticated request-to-row observability and isolation');
    const remote = workflow.indexOf('Run complete authenticated remote smoke suite');
    const cleanup = workflow.indexOf('Cleanup isolated Preview auth fixtures');
    expect(provision).toBeGreaterThan(-1);
    expect(provision).toBeLessThan(observability);
    expect(observability).toBeLessThan(remote);
    expect(remote).toBeLessThan(cleanup);
    const cleanupBlock = workflow.slice(cleanup, cleanup + 420);
    expect(cleanupBlock).toContain('if: always()');
    expect(cleanupBlock).toContain('SUPABASE_PREVIEW_REF');
    expect(cleanupBlock).toContain('no fixture cleanup was required');
  });
});
