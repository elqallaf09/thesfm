import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');
const switcher = read('src/components/WorkspaceSwitcher.tsx');
const themes = read('src/styles/themes.css');

function themeBlock(source: string, selector: '\\:root' | '\\.dark') {
  const pattern = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = source.match(pattern);
  if (!match) throw new Error(`Could not locate ${selector} block in themes.css`);
  return match[1];
}

const rootBlock = themeBlock(themes, '\\:root');
const darkBlock = themeBlock(themes, '\\.dark');

function tokenValue(block: string, token: string) {
  const match = block.match(new RegExp(`${token}:\\s*([^;]+);`));
  if (!match) throw new Error(`Token ${token} not found`);
  return match[1].trim();
}

describe('workspace switcher interaction affordance contract', () => {
  it('keeps every destination a full-area semantic link with route-driven selection', () => {
    expect(switcher).toContain('<Link');
    expect(switcher).toContain('href={destination}');
    expect(switcher).toContain("aria-current={current ? 'page' : undefined}");
    expect(switcher).toContain('data-workspace-id={workspace.id}');
    expect(switcher).toContain('prefetch={false}');
    expect(switcher).not.toMatch(/onClick=|router\.push|<button[^>]*>\s*<Link|<Link[^>]*>\s*<button/);
    // No selected-workspace state: the active tab is derived from the
    // pathname on every render, never stored in component state.
    expect(switcher).not.toMatch(/useState/);
  });

  it('renders items flush on the header (no separate track surface) with a single sliding underline indicator', () => {
    // Institutional-dock treatment: items sit directly on the header's own
    // navy background rather than inside a separately-elevated pill track.
    expect(switcher).toContain('min-height: 44px');
    expect(switcher).toContain('background: var(--workspace-switcher-bg)');
    expect(switcher).toContain('cursor: pointer');
    expect(switcher).toContain('touch-action: manipulation');
    expect(switcher).toContain('overflow-x: auto');
    expect(switcher).toContain('scroll-snap-type: inline mandatory');

    // Exactly one indicator element, positioned behind the items (z-index 0
    // vs. 1) and driven by JS-measured custom properties rather than a
    // per-item border/fill.
    expect(switcher.match(/sfm-workspace-indicator/g)?.length).toBeGreaterThanOrEqual(2); // ref'd span + its style rule
    expect(switcher).toContain("ref={indicatorRef}");
    expect(switcher).toContain('aria-hidden="true"');
    expect(switcher).toContain('transform: translateX(var(--indicator-x, 0px))');
    expect(switcher).toContain('width: var(--indicator-w, 0px)');
    expect(switcher).toContain('background: var(--workspace-switcher-active-surface)');
    expect(switcher).toContain('z-index: 0');
    expect(switcher).toContain('z-index: 1');
    expect(switcher).toContain('pointer-events: none');

    // The indicator is a slim underline (height, not a filled chip that
    // covers the tab) — anchored to the bottom edge.
    expect(switcher).toContain('inset-block-end: 0');
    expect(switcher).toContain('height: 2px');
  });

  it('gives every item no border, fill, or shadow of its own in either theme — only the shared underline carries the accent', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-item-bg')).toBe('transparent');
      expect(tokenValue(block, '--workspace-switcher-bg')).toBe('transparent');
      expect(tokenValue(block, '--workspace-switcher-frame-shadow')).toBe('none');
    }
    const tabBaseRule = switcher.match(/\.sfm-workspace-tab\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    expect(tabBaseRule).not.toMatch(/\bborder:/);
    expect(tabBaseRule).not.toMatch(/\bbox-shadow:/);
  });

  it('mutes inactive icon/text (theme-invariant navy-dock tokens) so only the active item under the underline reads as selected', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-icon')).toBe('var(--header-dock-icon)');
      expect(tokenValue(block, '--workspace-switcher-item-text')).toBe('var(--header-dock-text-muted)');
    }
  });

  it('drives the active state from THE SFM\'s teal brand accent, not the indigo used everywhere else', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-active-surface')).toBe('var(--accent)');
      expect(tokenValue(block, '--workspace-switcher-icon-active')).toBe('var(--accent)');
      // Active text stays the dock's own white/near-white token, not
      // accent-tinted — legible against the navy surface at every weight.
      expect(tokenValue(block, '--workspace-switcher-item-text-active')).toBe('var(--header-dock-text)');
    }
    expect(themes).not.toContain('--workspace-switcher-active-surface: var(--sidebar-item-bg-active)');
    expect(themes).not.toMatch(/--workspace-switcher-item-border-active:/);
    expect(themes).not.toMatch(/--workspace-switcher-shadow-active:/);
  });

  it('measures the active item off physical offsetLeft/offsetWidth (RTL-safe without a dir branch)', () => {
    expect(switcher).toContain('activeEl.offsetLeft');
    expect(switcher).toContain('activeEl.offsetWidth');
    expect(switcher).toContain("indicator.style.setProperty('--indicator-x'");
    expect(switcher).toContain("indicator.style.setProperty('--indicator-w'");
    // getBoundingClientRect + scrollLeft arithmetic is the classic RTL trap
    // this component deliberately avoids.
    expect(switcher).not.toContain('getBoundingClientRect');
  });

  it('snaps into place without animating on first paint, then animates on every subsequent move', () => {
    expect(switcher).toContain('hasPositionedRef');
    expect(switcher).toContain("indicator.style.transitionDuration = '0s'");
  });

  it('recomputes indicator position on container resize (reflow-safe for language/breakpoint width changes)', () => {
    expect(switcher).toContain('ResizeObserver');
    expect(switcher).toContain("window.addEventListener('resize', handleReflow)");
  });

  it('defines hover, pressed, focus-visible, selected, reduced-motion, and disabled states', () => {
    expect(switcher).toContain(".sfm-workspace-tab:hover:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true'])");
    expect(switcher).toContain(".sfm-workspace-tab:active:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true'])");
    expect(switcher).toContain('.sfm-workspace-tab:focus-visible');
    expect(switcher).toContain(".sfm-workspace-tab[data-active='true']");
    expect(switcher).toContain(".sfm-workspace-tab[aria-disabled='true']");
    expect(switcher).toContain('.sfm-workspace-indicator');

    const reducedMotionBlock = switcher.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\s*\}\n/)?.[1] ?? '';
    expect(reducedMotionBlock).toContain('.sfm-workspace-indicator');
  });

  it('keeps the active tab visually stable via CSS state selectors, not JS hover state', () => {
    expect(switcher).toContain(":hover:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true']) {");
    expect(switcher).toContain(":active:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true']) {");
    expect(switcher).not.toMatch(/onMouseEnter|onMouseLeave|onPointerEnter|onPointerLeave/);
  });

  it('provides the complete workspace token family in both theme scopes', () => {
    const requiredTokens = [
      '--workspace-switcher-bg',
      '--workspace-switcher-border',
      '--workspace-switcher-item-bg',
      '--workspace-switcher-item-hover',
      '--workspace-switcher-item-pressed',
      '--workspace-switcher-item-text',
      '--workspace-switcher-item-text-active',
      '--workspace-switcher-icon',
      '--workspace-switcher-icon-active',
      '--workspace-switcher-focus',
      '--workspace-switcher-active-surface',
    ] as const;

    for (const token of requiredTokens) {
      expect(themes.match(new RegExp(`${token}:`, 'g')), token).toHaveLength(2);
    }
  });
});
