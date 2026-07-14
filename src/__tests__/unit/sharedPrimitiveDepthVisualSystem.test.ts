import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const uiDirectory = resolve(process.cwd(), 'src/components/ui');
const primitiveFiles = readdirSync(uiDirectory)
  .filter(file => /\.(?:ts|tsx)$/.test(file))
  .sort();

const classPrefix = String.raw`(?:[^\s"'\x60]+:)*`;
const classBoundary = String.raw`(?:^|[\s"'\x60])`;
const classEnd = String.raw`(?=[\s"'\x60])`;
const legacyShadowClass = new RegExp(
  `${classBoundary}${classPrefix}(?:shadow|shadow-(?:sm|md|lg|xl|2xl|inner)|drop-shadow(?:-[^\\s"'\\x60]+)?)${classEnd}`,
  'm',
);
const legacyRadiusClass = new RegExp(
  `${classBoundary}${classPrefix}(?:rounded|rounded-(?:full|sm|md|lg|xl|2xl|3xl)|rounded-(?:[trblse]{1,2})-(?:sm|md|lg|xl|2xl|3xl)|rounded(?:-[trblse]{1,2})?-\\[(?!var\\(|inherit\\])[^\\]]+\\])${classEnd}`,
  'm',
);

describe('shared primitive semantic depth', () => {
  it('keeps every shared primitive on centralized radius and shadow tokens', () => {
    const offenders = primitiveFiles.flatMap(file => {
      const source = readFileSync(resolve(uiDirectory, file), 'utf8');
      const findings: string[] = [];

      if (legacyShadowClass.test(source)) findings.push(`${file}: legacy shadow utility`);
      if (legacyRadiusClass.test(source)) findings.push(`${file}: legacy radius utility`);

      return findings;
    });

    expect(offenders).toEqual([]);
  });

  it('uses semantic popover depth for overlay primitives', () => {
    const overlayPrimitives = [
      'alert-dialog.tsx',
      'context-menu.tsx',
      'hover-card.tsx',
      'menubar.tsx',
      'navigation-menu.tsx',
      'popover.tsx',
      'tooltip.tsx',
    ];

    for (const file of overlayPrimitives) {
      const source = readFileSync(resolve(uiDirectory, file), 'utf8');
      expect(source, file).toContain('shadow-[var(--shadow-popover)]');
    }
  });
});
