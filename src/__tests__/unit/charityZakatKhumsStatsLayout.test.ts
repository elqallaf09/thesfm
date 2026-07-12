import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const charityPage = readFileSync(join(projectRoot, 'src/app/charity/page.tsx'), 'utf8');
const charityStyles = readFileSync(join(projectRoot, 'src/app/charity/charity.module.css'), 'utf8');
const zakatPage = readFileSync(join(projectRoot, 'src/app/zakat/page.tsx'), 'utf8');
const khumsPage = readFileSync(join(projectRoot, 'src/app/khums/page.tsx'), 'utf8');

describe('charity / zakat / khums stats header layout', () => {
  it('uses page-specific stats grids instead of globally-overridden grid hooks', () => {
    expect(charityPage).toContain('className={styles.statusGrid}');
    expect(charityStyles).toContain('.statusGrid {');
    expect(zakatPage).toContain('className="zakat-summary-grid"');
    expect(khumsPage).toContain('className="khums-stat-grid"');

    expect(charityPage).not.toContain('className="charity-kpi-grid"');
    expect(charityPage).not.toContain('className="kpi-g"');
    expect(zakatPage).not.toContain('className="summary-grid"');
    expect(khumsPage).not.toContain('className="stat-grid"');
  });

  it('keeps cards spacious enough for explanations and evidence', () => {
    expect(charityStyles).toContain('padding: 19px');
    expect(zakatPage).toContain('min-height:258px');
    expect(khumsPage).toContain('min-height:214px');
  });

  it('isolates financial values with LTR direction in the rendered stat cards', () => {
    expect(charityStyles).toContain('direction: ltr');
    expect(charityStyles).toContain('unicode-bidi: isolate');
    expect(zakatPage).toContain("dir={card.unavailable ? dir : 'ltr'}");
    expect(khumsPage).toContain('<strong dir="ltr">{value}</strong>');
  });
});
