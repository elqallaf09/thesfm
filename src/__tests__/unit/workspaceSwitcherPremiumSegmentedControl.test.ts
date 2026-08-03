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

describe('workspace switcher — one sliding indicator, not four outlined buttons', () => {
  it('gives every item no border, fill, or shadow of its own in either theme', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-item-bg')).toBe('transparent');
    }
    // Items only ever set background-color/color in their own rules — border
    // and box-shadow are not part of the per-item declaration at all anymore
    // (the indicator owns them).
    const tabBaseRule = switcher.match(/\.sfm-workspace-tab\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    expect(tabBaseRule).not.toMatch(/\bborder:/);
    expect(tabBaseRule).not.toMatch(/\bbox-shadow:/);
  });

  it('mutes inactive icon/text so only the active item under the indicator reads as selected', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-icon')).toBe('var(--foreground-muted)');
    }
  });

  it('keeps the indicator surface translucent/layered (Variant 03+ contract) with a distinct border', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-active-surface')).toMatch(/^linear-gradient\(180deg, color-mix\(in srgb, var\(--primary\)/);
      expect(tokenValue(block, '--workspace-switcher-item-border-active')).toMatch(/^color-mix\(in srgb, var\(--primary\)/);
    }
  });

  it('positions the indicator from the active tab\'s own physical layout box (RTL-safe, no scroll-offset arithmetic)', () => {
    expect(switcher).toContain('activeEl.offsetLeft');
    expect(switcher).toContain('activeEl.offsetWidth');
    expect(switcher).toContain("indicator.style.setProperty('--indicator-x'");
    expect(switcher).toContain("indicator.style.setProperty('--indicator-w'");
  });

  it('snaps into place without animating on first paint, then animates on every subsequent move', () => {
    expect(switcher).toContain('hasPositionedRef');
    expect(switcher).toContain("indicator.style.transitionDuration = '0s'");
  });

  it('disables indicator movement under prefers-reduced-motion', () => {
    const reducedMotionBlock = switcher.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\s*\}\n/)?.[1] ?? '';
    expect(reducedMotionBlock).toContain('.sfm-workspace-indicator');
  });

  it('keeps the active item selected while hovered/pressed via a container-level :has(), not JS hover state', () => {
    expect(switcher).not.toMatch(/onMouseEnter|onMouseLeave|onPointerEnter|onPointerLeave/);
    expect(switcher).toContain(":has(.sfm-workspace-tab[data-active='true']:hover");
    expect(switcher).toContain(":has(.sfm-workspace-tab[data-active='true']:active");
  });

  it('recomputes indicator position on container resize (reflow-safe for language/breakpoint width changes)', () => {
    expect(switcher).toContain('ResizeObserver');
    expect(switcher).toContain("window.addEventListener('resize', handleReflow)");
  });
});
