import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const charityStyles = readFileSync(join(projectRoot, 'src/app/charity-projects/_styles.tsx'), 'utf8');
const charityPage = readFileSync(join(projectRoot, 'src/app/charity-projects/page.tsx'), 'utf8');
const pageTabs = readFileSync(join(projectRoot, 'src/components/layout/PageTabs.tsx'), 'utf8');

describe('charity projects page layout regression guard', () => {
  it('lets the workspace shell own width without viewport or sidebar arithmetic', () => {
    expect(charityStyles).toContain('max-width: 100%');
    expect(charityStyles).toContain('margin-inline: 0');
    expect(charityStyles).toContain('grid-template-columns: minmax(0, 1fr) auto');
    expect(charityStyles).not.toContain('var(--sidebar-w)');
    expect(charityStyles).not.toContain('100vw');
  });

  it('keeps KPI cards compact, complete, and dashboard-like', () => {
    expect(charityStyles).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))');
    expect(charityStyles).toContain('min-height: 112px');
    expect(charityStyles).toContain('font-size: clamp(1.2rem, 1.6vw, 1.55rem)');
    expect(charityPage).toContain('tr.nextDueDateKpi');
    expect(charityPage).toContain('tr.beneficiariesCountKpi');
  });

  it('keeps the Hijri calendar useful and empty states compact', () => {
    expect(charityPage).toContain('calendarCards');
    expect(charityPage).toContain('className="season-card"');
    expect(charityPage).toContain('className="charity-empty-state compact"');
    expect(charityStyles).toContain('.charity-projects-page .season-card');
    expect(charityStyles).toContain('min-height: 116px');
    expect(charityStyles).toContain('background: var(--surface-muted)');
    expect(charityStyles).not.toMatch(/\.empty-state(?:\.compact)?\{[^}]*min-height:\s*(?:[3-9]\d{2}|[1-9]\d{3})px/);
  });

  it('uses the charity-specific tab sizing hook without changing every page tab', () => {
    expect(charityPage).toContain('className="charity-tabs"');
    expect(charityPage).toContain("const CHARITY_PROJECTS_TABS = ['overview', 'projects', 'beneficiaries', 'donations', 'reports', 'impact', 'reminders', 'documents'] as const;");
    expect(pageTabs).toContain('.page-section-tabs.charity-tabs button');
    expect(charityStyles).toContain('grid-template-columns: repeat(8, minmax(0, 1fr))');
    expect(charityStyles).toMatch(/\.page-section-tabs-shell\.mobile-select \.page-section-tabs\.charity-tabs \{\s+display: none;/);
    expect(pageTabs).toContain('font-size: 13.5px');
  });

  it('keeps charity aggregates currency-safe and reports semantically reviewable', () => {
    expect(charityPage).toContain("const CHARITY_AGGREGATE_CURRENCY = 'KWD'");
    expect(charityPage).toContain('isAggregateCurrency(donation.currency)');
    expect(charityPage).toContain('selectedYearHasReportData');
    expect(charityPage).toContain('<table className="phase28-report-register">');
    expect(charityPage).toContain('<th scope="col">');
    expect(charityStyles).toContain('@media (max-width: 1024px)');
    expect(charityStyles).toMatch(/\.phase28-report-row > td::before \{\s+content: attr\(data-label\);/);
    expect(charityPage).not.toContain('referenceBenchmark}: 2.5% / 10%');
  });

  it('keeps voluntary charity and eligible Zakat project scopes independent', () => {
    expect(charityPage).toContain("const CHARITY_PROJECT_SCOPES = ['charity', 'zakat'] as const");
    expect(charityPage).toContain("param: 'scope'");
    expect(charityPage).toContain('isVoluntaryCharityRecord(project.category)');
    expect(charityPage).toContain('const filteredProjects = charityImpactProjects.filter(project =>');
    expect(charityPage).toContain("projectScope === 'zakat'");
    expect(charityPage).toContain('Zakat rules and calculations remain in the independent Zakat workflow.');
    expect(charityPage).toContain('!beneficiary.project_id || scopedProjectIds.has(beneficiary.project_id)');
    expect(charityPage).toContain("projectScope === 'zakat' ? (");
    expect(charityPage).toContain("router.push('/zakat?tab=reports')");
  });

  it('uses the encoded accounting month for legacy donations and supports timestamp labels', () => {
    expect(charityPage).toContain("const encodedMonth = encodedLegacyMonth(row.name)");
    expect(charityPage).toContain('donation_date: `${encodedMonth}-01`');
    expect(charityPage).toContain("/^\\d{4}-\\d{2}-\\d{2}$/.test(date)");
    expect(charityPage).not.toContain('donation_date: row.created_at');
  });

  it('does not call the legacy export API and rolls back partial donation writes', () => {
    expect(charityPage).not.toContain('/api/charity-projects/export');
    expect(charityPage).not.toContain('exportExcel');
    expect(charityPage).toContain(".select('id').single()");
    expect(charityPage).toContain('if (projectUpdateError)');
    expect(charityPage).toContain("db.from('charity_project_donations')");
    expect(charityPage).toContain('.delete()');
    expect(charityPage).toContain('aria-live="polite"');
  });

  it('compares contributor money only in the project currency', () => {
    expect(charityPage).toContain('hasSameExplicitCurrency(contributor.currency, project.currency)');
    expect(charityPage).toContain('matchingProjectContributors');
    expect(charityPage).toContain('hasComparableContributorData ? money(totalPledged, contributorSummaryCurrency ?? CHARITY_AGGREGATE_CURRENCY) : unavailableLabel');
    expect(charityPage).toContain('percent === null ? unavailableLabel');
  });

  it('uses explicit project filtering and does not relabel contributors as donors', () => {
    expect(charityPage).toContain('beneficiaryProjectFilter');
    expect(charityPage).toContain('beneficiary.project_id === beneficiaryProjectFilter');
    expect(charityPage).toContain('projectDonationRecords.length');
    expect(charityPage).toContain('tr.donorIdentityUnavailable');
    expect(charityPage).not.toContain('tr.donorCount}</small><strong>{numberLabel(projectContributors.length)');
  });

  it('keeps project and beneficiary metadata separated on narrow screens', () => {
    expect(charityPage).toContain('className="beneficiary-meta"');
    expect(charityPage).toContain('<small>{tr.country}</small>');
    expect(charityPage).toContain('<small>{tr.renewalPriority}</small>');
    expect(charityStyles).toContain('.phase28-project-meta,');
    expect(charityStyles).toContain('.beneficiary-meta,');
    expect(charityStyles).toContain(') > div {');
    expect(charityStyles).toContain('.charity-projects-page .project-support-grid');
    expect(charityStyles).toContain('@media (max-width: 720px)');
  });

  it('consumes the centralized visual system without a feature-local palette', () => {
    expect(charityStyles).toContain('font-family: var(--font-ui)');
    expect(charityStyles).toContain('font-family: var(--font-data)');
    expect(charityStyles).toContain('background: var(--hero-gradient)');
    expect(charityStyles).toContain('background: var(--surface)');
    expect(charityStyles).toContain('border: 1px solid var(--border)');
    expect(charityStyles).toContain('box-shadow: var(--shadow-card)');
    expect(charityStyles).toContain('background: var(--success-soft)');
    expect(charityStyles).toContain('background: var(--danger-soft)');
    expect(charityStyles).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(charityStyles).not.toMatch(/(?:rgb|hsl)a?\(/i);
    expect(charityStyles).not.toMatch(/(?:linear|radial)-gradient\(/i);
    expect(charityStyles).not.toMatch(/font-family:\s*[^;]*(?:Tajawal|Cairo|Arial)/i);
    expect(charityStyles).not.toContain('--charity-');
    expect(charityStyles).not.toContain('.dark .charity-projects-page');
  });
});
