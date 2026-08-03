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

describe('workspace switcher — one segmented control, not four outlined buttons', () => {
  it('gives inactive items no border, fill, or shadow of their own in both themes', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-item-bg')).toBe('transparent');
      expect(tokenValue(block, '--workspace-switcher-item-border')).toBe('transparent');
      expect(tokenValue(block, '--workspace-switcher-shadow')).toBe('none');
    }
  });

  it('mutes inactive icon/text so only the active item reads as selected', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-icon')).toBe('var(--foreground-muted)');
    }
  });

  it('keeps the active fill translucent (Variant 03 contract) with a distinct border', () => {
    for (const block of [rootBlock, darkBlock]) {
      expect(tokenValue(block, '--workspace-switcher-item-active')).toMatch(/^color-mix\(in srgb, var\(--primary\)/);
      expect(tokenValue(block, '--workspace-switcher-item-border-active')).toMatch(/^color-mix\(in srgb, var\(--primary\)/);
    }
  });

  it('preserves the active pill fill, border, and icon color while hovered (no reversion to the generic hover tint)', () => {
    expect(switcher).toContain(
      ".sfm-workspace-tab[data-active='true']:hover:not([aria-disabled='true']):not([data-disabled='true']) {",
    );
    const activeHoverRule = switcher.match(
      /\.sfm-workspace-tab\[data-active='true'\]:hover:not\(\[aria-disabled='true'\]\):not\(\[data-disabled='true'\]\) \{([\s\S]*?)\}/,
    )?.[1] ?? '';
    expect(activeHoverRule).toContain('background: var(--workspace-switcher-item-active-hover)');
    expect(activeHoverRule).toContain('border-color: var(--workspace-switcher-item-border-active)');
    expect(activeHoverRule).toContain('color: var(--workspace-switcher-item-text-active)');

    expect(switcher).toContain(
      ".sfm-workspace-tab[data-active='true']:hover:not([aria-disabled='true']):not([data-disabled='true']) svg {",
    );
  });
});
