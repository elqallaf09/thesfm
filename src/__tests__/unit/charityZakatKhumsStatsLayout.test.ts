import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const charityPage = readFileSync(join(projectRoot, 'src/app/charity/page.tsx'), 'utf8');
const zakatPage = readFileSync(join(projectRoot, 'src/app/zakat/page.tsx'), 'utf8');
const khumsPage = readFileSync(join(projectRoot, 'src/app/khums/page.tsx'), 'utf8');

describe('charity / zakat / khums stats header layout', () => {
  it('uses page-specific stats grids instead of globally-overridden grid hooks', () => {
    expect(charityPage).toContain('className="charity-kpi-grid"');
    expect(zakatPage).toContain('className="zakat-summary-grid"');
    expect(khumsPage).toContain('className="khums-stat-grid"');

    expect(charityPage).not.toContain('className="kpi-g"');
    expect(zakatPage).not.toContain('className="summary-grid"');
    expect(khumsPage).not.toContain('className="stat-grid"');
  });

  it('keeps cards tall enough to prevent cramped stat content', () => {
    expect(charityPage).toContain('min-height: 128px');
    expect(zakatPage).toContain('min-height:136px');
    expect(khumsPage).toContain('min-height:136px');
  });

  it('isolates financial values with LTR direction in the rendered stat cards', () => {
    expect(charityPage).toContain('className="charity-kpi-value" dir="ltr"');
    expect(zakatPage).toContain("dir={card.unavailable ? dir : 'ltr'}");
    expect(khumsPage).toContain('<strong dir="ltr">{value}</strong>');
  });
});
