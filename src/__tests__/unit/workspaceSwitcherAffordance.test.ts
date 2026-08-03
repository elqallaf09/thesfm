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

  it('renders one shared segmented track with a single sliding active-indicator layer', () => {
    // 52px: a decisive step above the shared --control-h (44px) so the
    // switcher, as the header's signature control, clearly reads as more
    // prominent than an ordinary form control.
    expect(switcher).toContain('min-height: 52px');
    expect(switcher).toContain('background: var(--workspace-switcher-bg)');
    expect(switcher).toContain('box-shadow: var(--workspace-switcher-frame-shadow)');
    expect(switcher).toContain('cursor: pointer');
    expect(switcher).toContain('touch-action: manipulation');
    expect(switcher).toContain('overflow-x: auto');
    expect(switcher).toContain('scroll-snap-type: inline proximity');

    // Exactly one indicator element, positioned behind the items (z-index 0
    // vs. 1) and driven by JS-measured custom properties rather than a
    // per-item border/fill — this is what makes it read as one segmented
    // control instead of four independently bordered buttons.
    expect(switcher.match(/sfm-workspace-indicator/g)?.length).toBeGreaterThanOrEqual(2); // ref'd span + its style rule
    expect(switcher).toContain("ref={indicatorRef}");
    expect(switcher).toContain('aria-hidden="true"');
    expect(switcher).toContain('transform: translateX(var(--indicator-x, 0px))');
    expect(switcher).toContain('width: var(--indicator-w, 0px)');
    expect(switcher).toContain('background: var(--workspace-switcher-active-surface)');
    expect(switcher).toContain('z-index: 0');
    expect(switcher).toContain('z-index: 1');
    expect(switcher).toContain('pointer-events: none');
  });

  it('gives every item no border, fill, or shadow of its own in either theme — only the shared indicator carries a surface', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-item-bg')).toBe('transparent');
    }
    // Items only ever set background-color/color in their own rules — border
    // and box-shadow are not part of the per-item declaration at all (the
    // indicator owns them).
    const tabBaseRule = switcher.match(/\.sfm-workspace-tab\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    expect(tabBaseRule).not.toMatch(/\bborder:/);
    expect(tabBaseRule).not.toMatch(/\bbox-shadow:/);
  });

  it('mutes inactive icon/text so only the active item under the indicator reads as selected', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-icon')).toBe('var(--foreground-muted)');
    }
  });

  it('keeps the indicator surface translucent/layered (not a flat solid block) with a distinct border, in both theme scopes', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-active-surface')).toMatch(/^linear-gradient\(180deg, color-mix\(in srgb, var\(--primary\)/);
      expect(tokenValue(block, '--workspace-switcher-item-border-active')).toMatch(/^color-mix\(in srgb, var\(--primary\)/);
    }
    expect(themes).not.toContain('--workspace-switcher-active-surface: var(--sidebar-item-bg-active)');
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
    expect(switcher).toContain(".sfm-workspace-tab:hover:not([aria-disabled='true']):not([data-disabled='true'])");
    expect(switcher).toContain(".sfm-workspace-tab:active:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true'])");
    expect(switcher).toContain('.sfm-workspace-tab:focus-visible');
    expect(switcher).toContain(".sfm-workspace-tab[data-active='true']");
    expect(switcher).toContain(".sfm-workspace-tab[aria-disabled='true']");
    expect(switcher).toContain('.sfm-workspace-indicator');

    const reducedMotionBlock = switcher.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\s*\}\n/)?.[1] ?? '';
    expect(reducedMotionBlock).toContain('.sfm-workspace-indicator');
  });

  it("keeps the active tab's own selected look stable while hovered/pressed (no reversion to the plain-hover tint, no JS hover state)", () => {
    // The plain hover/press background rules explicitly exclude the active
    // item, so hovering/pressing the selected tab never paints a flat tint
    // over the indicator sitting beneath it.
    expect(switcher).toContain(":hover:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true']) {");
    expect(switcher).toContain(":active:not([data-active='true']):not([aria-disabled='true']):not([data-disabled='true']) {");
    // The indicator itself still responds to hover/press on the active tab,
    // via a container-level :has() (no JS hover state, no scale() ban to
    // work around — a tiny press-scale on the indicator is intentional here).
    expect(switcher).toContain(":has(.sfm-workspace-tab[data-active='true']:hover");
    expect(switcher).toContain(":has(.sfm-workspace-tab[data-active='true']:active");
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
      '--workspace-switcher-item-border-active',
      '--workspace-switcher-shadow-active',
    ] as const;

    for (const token of requiredTokens) {
      expect(themes.match(new RegExp(`${token}:`, 'g')), token).toHaveLength(2);
    }
  });
});
