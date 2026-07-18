import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const fixture = readSource('tests/smoke/preview-auth-fixtures.mjs');
const workflow = readSource('.github/workflows/ci.yml');

describe('Preview-only authentication fixtures', () => {
  it('hard-pins every fixture mutation to the isolated Preview project', () => {
    expect(fixture).toContain("const approvedPreviewRef = 'tilrkqdngnokvxuvllio'");
    expect(fixture).toContain('origin.origin !== approvedPreviewOrigin');
    expect(fixture).toContain("payload.ref !== approvedPreviewRef");
    expect(fixture).not.toMatch(/SUPABASE_(?:PRODUCTION|PROJECT)_URL/);
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
    expect(workflow.slice(cleanup, cleanup + 140)).toContain('if: always()');
  });
});
