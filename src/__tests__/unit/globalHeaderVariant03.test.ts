import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

const header = read('src/components/AppHeader.tsx');
const shell = read('src/components/WorkspaceShell.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const tokens = read('src/styles/tokens.css');
const themes = read('src/styles/themes.css');
const switcher = read('src/components/WorkspaceSwitcher.tsx');

describe('global header — Variant 03 premium floating shell', () => {
  it('defines the reserved-band and z-index layer tokens once in the foundation', () => {
    for (const token of [
      '--app-header-height',
      '--app-header-inset-block',
      '--app-header-inset-inline',
      '--app-header-gap-block',
      '--z-header',
      '--z-sidebar',
    ]) {
      expect(tokens.includes(`${token}:`), token).toBe(true);
    }
  });

  it('renders the header as a sticky, rounded, glowing floating card via tokens', () => {
    expect(header).toContain('position: sticky');
    expect(header).toContain('inset-block-start: var(--app-header-inset-block)');
    expect(header).toContain('z-index: var(--z-header');
    expect(header).toContain('border-radius: var(--radius-card)');
    expect(header).toContain('background: var(--header-surface');
    expect(header).toContain('box-shadow: var(--header-shadow), var(--header-edge-glow)');
    // Floating margin uses the inset tokens on all sides.
    expect(header).toContain('margin: var(--app-header-inset-block) var(--app-header-inset-inline) var(--app-header-gap-block)');
  });

  it('collapses to an edge-to-edge bar on mobile so it never overflows the viewport', () => {
    expect(header).toMatch(/@media \(max-width: 767px\)/);
    expect(header).toContain('--app-header-inset-block: 0px');
    expect(header).toContain('border-radius: 0');
  });

  it('groups utility controls without heavy per-control borders', () => {
    expect(header).toContain('border: 1px solid var(--header-control-border, transparent)');
    expect(header).toContain('background: var(--header-control-bg');
  });

  it('reserves the full header band in the shell and offsets the sidebar below it', () => {
    expect(shell).toContain('min-height: calc(100dvh - var(--app-header-height))');
    expect(sidebar).toContain('inset-block-start:var(--app-header-height)');
    expect(sidebar).toContain('z-index:var(--z-sidebar');
    // Sidebar height also derives from the reserved band (no overlap with the header).
    expect(sidebar).toContain('height:calc(100dvh - var(--app-header-height)');
  });
});

describe('workspace switcher — Variant 06: one sliding indicator, not four bordered buttons', () => {
  // Variant 03/04/05 each still rendered every item with its own visible
  // border/fill (03 translucent, 04 a rejected solid sidebar gradient, 05
  // merely muted the inactive ones) — reviewed and rejected as "still reads
  // as ordinary bordered text buttons." Variant 06 replaces per-item
  // surfaces entirely with one shared indicator element that slides behind
  // the active item.
  it('drives the indicator surface from a layered tonal gradient (still translucent, not a flat solid block) in both theme scopes', () => {
    const surfaceMatches = themes.match(/--workspace-switcher-active-surface:\s*linear-gradient\(180deg, color-mix\(in srgb, var\(--primary\)/g);
    expect(surfaceMatches).toHaveLength(2);
    // The rejected "Variant 04" look reused the solid sidebar gradient — ensure
    // the switcher still doesn't borrow it.
    expect(themes).not.toContain('--workspace-switcher-active-surface: var(--sidebar-item-bg-active)');
    // No per-item active fill/border tokens remain — only the shared indicator
    // carries a surface now.
    expect(themes).not.toMatch(/--workspace-switcher-item-active:/);
  });

  it('positions one shared sliding indicator instead of decorating every item', () => {
    expect(switcher).toContain('className="sfm-workspace-indicator"');
    expect(switcher).toContain('--indicator-x');
    expect(switcher).toContain('--indicator-w');
    expect(themes.match(/--workspace-switcher-item-border-active:/g)).toHaveLength(2);
    expect(themes.match(/--workspace-switcher-shadow-active:/g)).toHaveLength(2);
  });

  it('defines header surface + edge glow tokens for both light and dark', () => {
    expect(themes.match(/--header-surface:/g)).toHaveLength(2);
    expect(themes.match(/--header-edge-glow:/g)).toHaveLength(2);
  });
});
