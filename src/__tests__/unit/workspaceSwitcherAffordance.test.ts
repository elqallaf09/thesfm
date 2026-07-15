import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');
const switcher = read('src/components/WorkspaceSwitcher.tsx');
const themes = read('src/styles/themes.css');

describe('workspace switcher interaction affordance contract', () => {
  it('keeps every destination a full-area semantic link with route-driven selection', () => {
    expect(switcher).toContain('<Link');
    expect(switcher).toContain('href={destination}');
    expect(switcher).toContain("aria-current={current ? 'page' : undefined}");
    expect(switcher).toContain('data-workspace-id={workspace.id}');
    expect(switcher).not.toMatch(/onClick=|router\.push|<button[^>]*>\s*<Link|<Link[^>]*>\s*<button/);
  });

  it('uses tokenized button surfaces and a practical mobile touch target', () => {
    expect(switcher).toContain('min-height: var(--control-h)');
    expect(switcher).toContain('background: var(--workspace-switcher-item-bg)');
    expect(switcher).toContain('border: 1px solid var(--workspace-switcher-item-border)');
    expect(switcher).toContain('box-shadow: var(--workspace-switcher-shadow)');
    expect(switcher).toContain('cursor: pointer');
    expect(switcher).toContain('touch-action: manipulation');
    expect(switcher).toContain('overflow-x: auto');
    expect(switcher).toContain('scroll-snap-type: inline proximity');
  });

  it('defines hover, pressed, focus-visible, selected, reduced-motion, and disabled states', () => {
    expect(switcher).toContain(".sfm-workspace-tab:hover:not([aria-disabled='true'])");
    expect(switcher).toContain(".sfm-workspace-tab:active:not([aria-disabled='true'])");
    expect(switcher).toContain('.sfm-workspace-tab:focus-visible');
    expect(switcher).toContain(".sfm-workspace-tab[data-active='true']::after");
    expect(switcher).toContain(".sfm-workspace-tab[aria-disabled='true']");
    expect(switcher).toContain('@media (prefers-reduced-motion: reduce)');
    expect(switcher).not.toMatch(/scale\s*\(/);
  });

  it('provides the complete workspace token family in both theme scopes', () => {
    const requiredTokens = [
      '--workspace-switcher-bg',
      '--workspace-switcher-border',
      '--workspace-switcher-item-bg',
      '--workspace-switcher-item-hover',
      '--workspace-switcher-item-pressed',
      '--workspace-switcher-item-active',
      '--workspace-switcher-item-border',
      '--workspace-switcher-item-text',
      '--workspace-switcher-item-text-active',
      '--workspace-switcher-icon',
      '--workspace-switcher-focus',
      '--workspace-switcher-shadow',
    ] as const;

    for (const token of requiredTokens) {
      expect(themes.match(new RegExp(`${token}:`, 'g')), token).toHaveLength(2);
    }
  });
});
