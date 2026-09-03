import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
const criticalCss = fs.readFileSync(path.join(root, 'src/app/workspace-chrome-critical.css'), 'utf8');
const header = fs.readFileSync(path.join(root, 'src/components/AppHeader.tsx'), 'utf8');
const globals = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');

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

  it('is the single owner of pre-paint header geometry (globals.css must not carry a second, driftable copy)', () => {
    // A duplicate .sfm-global-header critical-CSS block lived in globals.css
    // for most of this PR's history, went unsynced for multiple rounds, and
    // — because it loaded before this file in the root layout — silently
    // won the cascade over both this file's and AppHeader.tsx's real values.
    // Only one file may own this pre-paint rule going forward.
    expect(globals).not.toMatch(/\.sfm-global-header\s*\{/);
  });

  it('keeps its pre-paint header geometry numerically in sync with the live AppHeader.tsx styled-jsx', () => {
    // Extracts the numeric grid-template-columns/height values from both
    // files and asserts they match, so a future round that tunes one and
    // forgets the other fails CI instead of shipping a silent first-paint
    // flash.
    const criticalGridColumns = criticalCss.match(/\.sfm-global-header\s*\{[^}]*grid-template-columns:\s*([^;]+);/)?.[1];
    const headerGridColumns = header.match(/\.sfm-global-header\s*\{[^}]*grid-template-columns:\s*([^;]+);/)?.[1];
    expect(criticalGridColumns).toBeTruthy();
    expect(criticalGridColumns).toBe(headerGridColumns);

    const criticalHeaderHeight = criticalCss.match(/:root\s*\{\s*--global-header-height:\s*([^;]+);/)?.[1];
    const headerHeaderHeight = header.match(/:root\s*\{\s*--global-header-height:\s*([^;]+);/)?.[1];
    expect(criticalHeaderHeight).toBeTruthy();
    expect(criticalHeaderHeight).toBe(headerHeaderHeight);
  });
});
