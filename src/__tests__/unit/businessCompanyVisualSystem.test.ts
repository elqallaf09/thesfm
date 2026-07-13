import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const businessRoutes = {
  operations: read('src/app/business-operations/page.tsx'),
  employees: read('src/app/employees/page.tsx'),
  sales: read('src/app/sales/page.tsx'),
  commandCenter: read('src/app/command-center/page.tsx'),
  documents: read('src/app/documents/page.tsx'),
};

const companySurfaces = {
  action: read('src/components/company-listings/ActionButtonLink.tsx'),
  category: read('src/components/company-listings/CompanyCategoryPage.tsx'),
  details: read('src/components/company-listings/CompanyDetailsPage.tsx'),
  imageUpload: read('src/components/company-listings/CompanyImageUploadField.tsx'),
  result: read('src/components/company-listings/CompanyListingResultPage.tsx'),
  submit: read('src/components/company-listings/CompanySubmitForm.tsx'),
  owner: read('src/components/company-listings/OwnerCompaniesPage.tsx'),
};

const sources = { ...businessRoutes, ...companySurfaces };
const legacyVisuals = /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|oklch\(|(?:linear|radial|conic)-gradient\(|\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b/i;
const excessiveWeight = /font(?:-weight|Weight|):?\s*[:=]?\s*(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})\b|font:\s*(?:8|9)\d{2}/;

describe('business and company visual-system contract', () => {
  it.each(Object.entries(sources))('%s consumes centralized tokens without a route-owned palette or font', (_name, source) => {
    expect(source).not.toMatch(legacyVisuals);
    expect(source).not.toMatch(excessiveWeight);
    expect(source).not.toMatch(/(?:^|[\s:])(?:global\()?\.dark\b/m);
    expect(source).not.toContain('var(--sfm-');
  });

  it('keeps gradients limited to the intentional command and company hero surfaces', () => {
    expect(businessRoutes.commandCenter.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(companySurfaces.category.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(companySurfaces.details.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(companySurfaces.owner.match(/var\(--hero-gradient\)/g)).toHaveLength(1);

    for (const [name, source] of Object.entries(sources)) {
      if (['commandCenter', 'category', 'details', 'owner'].includes(name)) continue;
      expect(source.replaceAll('var(--skeleton-gradient)', '')).not.toContain('gradient');
    }
  });

  it('uses semantic surfaces, states, focus, and shared depth', () => {
    const combined = Object.values(sources).join('\n');
    for (const token of [
      '--surface', '--surface-muted', '--foreground', '--foreground-muted', '--border',
      '--primary', '--primary-soft', '--success', '--warning', '--danger', '--focus-ring',
      '--focus-shadow', '--shadow-card',
    ]) {
      expect(combined).toContain(`var(${token})`);
    }

    expect(businessRoutes.sales).toContain('font-family:var(--font-data)');
    expect(businessRoutes.employees).toContain('font-family:var(--font-data)');
    expect(businessRoutes.commandCenter).toContain('font-family: var(--font-data)');
    expect(businessRoutes.documents).toContain('font-family: var(--font-data)');
  });

  it('lets the workspace shell own route width and sidebar geometry', () => {
    expect(businessRoutes.commandCenter).toContain('.command-center-main {\n          width: 100%;\n          min-width: 0;');
    expect(businessRoutes.commandCenter).toContain('.command-center-content {\n          width: 100%;\n          max-width: none;');
    expect(businessRoutes.commandCenter).not.toMatch(/--sidebar|calc\(100%\s*-|margin-inline-start/i);

    expect(companySurfaces.details).toContain('<WorkspacePageContainer variant="wide" className="company-details-layout">');
    expect(companySurfaces.details).not.toContain('max-width: 1500px');
    expect(companySurfaces.owner).toContain('<WorkspacePageContainer variant="wide" className="owner-companies-layout">');
  });

  it('preserves responsive and bidirectional behavior without physical offsets', () => {
    expect(businessRoutes.employees).toContain('[dir="rtl"] .business-back-link svg{transform:scaleX(-1)}');
    expect(businessRoutes.sales).toContain('[dir="rtl"] .business-back-link svg{transform:scaleX(-1)}');
    expect(companySurfaces.owner).toContain('direction:${dir}');
    expect(companySurfaces.category).toContain('@media (max-width: 640px)');
    expect(companySurfaces.details).toContain('@media (max-width: 560px)');

    for (const source of Object.values(sources)) {
      expect(source).not.toMatch(/margin-(?:left|right):|padding-(?:left|right):|translateX\(/i);
    }
  });
});
