import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
const criticalCss = fs.readFileSync(path.join(root, 'src/app/workspace-chrome-critical.css'), 'utf8');

describe('workspace chrome first-paint contract', () => {
  it('loads stable workspace geometry from the root layout', () => {
    expect(layout).toContain("import './workspace-chrome-critical.css';");
    expect(criticalCss).toContain("grid-template-areas: 'brand workspaces actions'");
    expect(criticalCss).toContain('grid-template-columns: var(--sidebar-w) minmax(0, 1fr)');
  });

  it('pre-styles streamed child controls before their component CSS arrives', () => {
    expect(criticalCss).toContain('.sfm-workspace-tabs');
    expect(criticalCss).toContain('.sfm-command-trigger');
    expect(criticalCss).toContain('.sfm-language-trigger');
    expect(criticalCss).toContain('.sfm-user-chip');
    expect(criticalCss).toContain('.sfm-shared-disclosure');
  });
});
