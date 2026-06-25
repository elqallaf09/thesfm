import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const charityStyles = readFileSync(join(projectRoot, 'src/app/charity-projects/_styles.tsx'), 'utf8');
const charityPage = readFileSync(join(projectRoot, 'src/app/charity-projects/page.tsx'), 'utf8');
const pageTabs = readFileSync(join(projectRoot, 'src/components/layout/PageTabs.tsx'), 'utf8');

describe('charity projects page layout regression guard', () => {
  it('keeps the page inside a readable sidebar-safe content container', () => {
    expect(charityStyles).toContain('max-width:1440px');
    expect(charityStyles).toContain('margin-inline:auto');
    expect(charityStyles).toContain('grid-template-columns:minmax(0,1fr) auto');
  });

  it('keeps summary cards as real cards instead of collapsed strips', () => {
    expect(charityStyles).toContain('repeat(auto-fit,minmax(220px,1fr))');
    expect(charityStyles).toContain('min-height:132px');
    expect(charityStyles).toContain('font-size:clamp(22px,2vw,28px)');
  });

  it('keeps the Hijri calendar and empty states structurally separated', () => {
    expect(charityStyles).toContain('grid-template-columns:minmax(280px,.82fr) minmax(0,1.18fr)');
    expect(charityStyles).toContain('.season-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))');
    expect(charityStyles).toContain('.empty-state.compact{min-height:170px');
    expect(charityStyles).not.toMatch(/\.empty-state(?:\.compact)?\{[^}]*min-height:\s*(?:[3-9]\d{2}|[1-9]\d{3})px/);
  });

  it('uses the charity-specific tab sizing hook without changing every page tab', () => {
    expect(charityPage).toContain('className="charity-tabs"');
    expect(pageTabs).toContain('.page-section-tabs.charity-tabs button');
    expect(pageTabs).toContain('font-size: 13.5px');
  });
});
