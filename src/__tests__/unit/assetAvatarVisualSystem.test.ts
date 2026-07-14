import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'src/components/asset/AssetAvatar.tsx'),
  'utf8',
);
const companyLogoSource = readFileSync(
  join(process.cwd(), 'src/components/asset/CompanyLogo.tsx'),
  'utf8',
);

describe('asset avatar visual-system guard', () => {
  it('uses an accessible foreground while retaining accent category cues', () => {
    for (const assetType of ['forex', 'gas']) {
      expect(source).toContain(
        `${assetType}: 'border-accent/25 bg-accent-soft text-foreground-secondary'`,
      );
    }

    expect(source).not.toMatch(
      /(?:forex|gas): 'border-accent\/25 bg-accent-soft text-accent'/,
    );
  });

  it('uses semantic radius and shadow tokens for asset marks', () => {
    const combinedSource = `${source}\n${companyLogoSource}`;

    expect(combinedSource).not.toMatch(
      /(?:^|\s)(?:hover:|focus:|active:)?shadow(?:-(?:sm|md|lg|xl|2xl|inner))?(?=\s|["'`}])/m,
    );
    expect(combinedSource).not.toMatch(
      /(?:^|\s)(?:sm:|md:|lg:|xl:|2xl:)?rounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full)|-\[(?:\d|\.))/m,
    );
    expect(combinedSource).toContain('rounded-[var(--radius-card)]');
    expect(companyLogoSource).toContain('rounded-[var(--radius-circle)]');
    expect(combinedSource).toContain('shadow-[var(--shadow-card)]');
  });
});
