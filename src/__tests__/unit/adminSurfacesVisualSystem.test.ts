import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const surfaces = {
  permissions: read('src/app/sfm-admin-control/admin-permissions/AdminPermissionsClient.tsx'),
  companies: read('src/app/sfm-admin-control/companies/CompanyAdminClient.tsx'),
  providers: read('src/app/sfm-admin-control/news-providers/NewsProvidersAdminClient.tsx'),
  instagram: read('src/app/sfm-admin-control/instagram-automation/InstagramAutomationClient.tsx'),
};

const legacyVisuals = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|(?:linear|radial|conic)-gradient\(|\b(?:Tajawal|Arial|Cairo|Inter|Helvetica)\b/i;
const excessiveWeight = /font(?:-weight|Weight|):?\s*[:=]?\s*(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})\b/;

describe('authorized administration surfaces visual-system contract', () => {
  it.each(Object.entries(surfaces))('%s uses centralized color, typography, depth, and theme tokens', (_name, source) => {
    expect(source).not.toMatch(legacyVisuals);
    expect(source).not.toMatch(excessiveWeight);
    expect(source).not.toMatch(/(?:^|[\s:])(?:global\()?\.dark\b/m);
    expect(source).not.toContain('var(--sfm-');
    expect(source).toContain('var(--font-ui)');
    expect(source).toContain('var(--surface)');
    expect(source).toContain('var(--foreground)');
    expect(source).toContain('var(--border)');
    expect(source).toContain('var(--focus-shadow)');
  });

  it('keeps gradients limited to the shared branded hero token', () => {
    expect(surfaces.permissions.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(surfaces.instagram.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(surfaces.companies).not.toContain('gradient');
    expect(surfaces.providers).not.toContain('gradient');
  });

  it('uses semantic status colors and data typography where values are financial or numeric', () => {
    for (const source of Object.values(surfaces)) {
      expect(source).toMatch(/var\(--(?:success|warning|danger|info)(?:-soft)?\)/);
    }
    expect(surfaces.companies).toContain("approved: 'success'");
    expect(surfaces.companies).toContain("rejected: 'danger'");
    expect(surfaces.companies).toContain('.ca-status-dot');
    expect(surfaces.providers).toContain('font-family:var(--font-data)');
    expect(surfaces.instagram).toContain('font-family:var(--font-data)');
  });

  it('preserves full-width shells, responsive grids, tables, and dialog geometry', () => {
    expect(surfaces.permissions).toContain('contentClassName="admin-permissions-content"');
    expect(surfaces.permissions).toContain('@media(max-width:680px)');
    expect(surfaces.permissions).toContain('table{width:100%;border-collapse:collapse;min-width:760px}');
    expect(surfaces.companies).toContain('contentClassName="company-admin-dashboard-content"');
    expect(surfaces.companies).toContain('role="dialog" aria-modal="true"');
    expect(surfaces.companies).toContain('@media(max-width:700px)');
    expect(surfaces.providers).toContain('contentClassName="news-provider-admin-content"');
    expect(surfaces.providers).toContain('@media(max-width:640px)');
    expect(surfaces.instagram).toContain('contentClassName="instagram-admin-content"');
    expect(surfaces.instagram).toContain('@media(max-width:760px)');
    for (const source of Object.values(surfaces)) {
      expect(source).not.toMatch(/<main\b/);
    }
  });
});
