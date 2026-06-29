import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const charityStyles = readFileSync(join(projectRoot, 'src/app/charity-projects/_styles.tsx'), 'utf8');
const charityPage = readFileSync(join(projectRoot, 'src/app/charity-projects/page.tsx'), 'utf8');
const pageTabs = readFileSync(join(projectRoot, 'src/components/layout/PageTabs.tsx'), 'utf8');

describe('charity projects page layout regression guard', () => {
  it('keeps the page inside a readable sidebar-safe content container', () => {
    expect(charityStyles).toContain('max-inline-size: min(1520px, 100%)');
    expect(charityStyles).toContain('margin-inline-start: var(--sidebar-w)');
    expect(charityStyles).toContain('margin-inline:auto');
    expect(charityStyles).toContain('grid-template-columns:minmax(0,1fr) auto');
  });

  it('keeps KPI cards compact, complete, and dashboard-like', () => {
    expect(charityStyles).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))');
    expect(charityStyles).toContain('min-height: 112px');
    expect(charityStyles).toContain('font-size: clamp(20px, 1.6vw, 25px)');
    expect(charityPage).toContain('tr.nextDueDateKpi');
    expect(charityPage).toContain('tr.beneficiariesCountKpi');
  });

  it('keeps the Hijri calendar useful and empty states compact', () => {
    expect(charityPage).toContain('calendarCards');
    expect(charityPage).toContain('className="season-card"');
    expect(charityPage).toContain('className="charity-empty-state compact"');
    expect(charityStyles).toContain('.charity-projects-page .season-card');
    expect(charityStyles).toContain('min-height: 136px !important');
    expect(charityStyles).not.toMatch(/\.empty-state(?:\.compact)?\{[^}]*min-height:\s*(?:[3-9]\d{2}|[1-9]\d{3})px/);
  });

  it('uses the charity-specific tab sizing hook without changing every page tab', () => {
    expect(charityPage).toContain('className="charity-tabs"');
    expect(pageTabs).toContain('.page-section-tabs.charity-tabs button');
    expect(pageTabs).toContain('grid-template-columns: repeat(7, minmax(0, 1fr))');
    expect(pageTabs).toContain('font-size: 13.5px');
  });
});
