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

describe('workspace switcher — restrained active state (not an oversized solid block)', () => {
  it('drives the active fill from a translucent primary mix in both theme scopes', () => {
    const activeMatches = themes.match(/--workspace-switcher-item-active:\s*color-mix\(in srgb, var\(--primary\)/g);
    expect(activeMatches).toHaveLength(2);
    // The rejected "Variant 04" look reused the solid sidebar gradient — ensure the
    // switcher no longer borrows it.
    expect(themes).not.toContain('--workspace-switcher-item-active: var(--sidebar-item-bg-active)');
  });

  it('keeps the subtle bottom indicator that marks the active workspace', () => {
    expect(switcher).toContain(".sfm-workspace-tab[data-active='true']::after");
    expect(themes.match(/--workspace-switcher-indicator:/g)).toHaveLength(2);
  });

  it('defines header surface + edge glow tokens for both light and dark', () => {
    expect(themes.match(/--header-surface:/g)).toHaveLength(2);
    expect(themes.match(/--header-edge-glow:/g)).toHaveLength(2);
  });
});
