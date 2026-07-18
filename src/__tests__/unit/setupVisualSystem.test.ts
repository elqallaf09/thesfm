import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const setupPage = readFileSync(join(process.cwd(), 'src/app/setup/page.tsx'), 'utf8');
const rawDepthPattern = /(?:border-radius\s*:\s*|borderRadius\s*:\s*['"`]?)(?:(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)?(?:\s+(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))*|[^;}\n]*,\s*(?:var\([^;}\n]*,\s*)?(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem))|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))[^;}\n]+|boxShadow\s*:\s*(?!\s*['"`]?(?:var\(|none\b))[^,}\n]+/i;

describe('setup visual-system contract', () => {
  it('uses shared semantic colors and typography without a local palette', () => {
    expect(setupPage).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|(?:linear|radial|conic)-gradient\(|\b(?:Tajawal|Arial)\b/i,
    );
    expect(setupPage).not.toContain(':global(.dark)');
    expect(setupPage).not.toMatch(rawDepthPattern);

    for (const token of [
      '--background',
      '--surface',
      '--foreground',
      '--border',
      '--primary',
      '--success-soft',
      '--danger-soft',
      '--focus-ring',
      '--font-ui',
      '--font-data',
    ]) {
      expect(setupPage).toContain(`var(${token})`);
    }
  });

  it('reserves the shared gradient for the onboarding hero only', () => {
    expect(setupPage.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(setupPage).toContain('.setup-hero{');
    expect(setupPage).toContain('background:var(--hero-gradient)');
  });

  it('caps setup typography at the supported 700 weight with a clear hierarchy', () => {
    expect(setupPage).not.toMatch(
      /font(?:-weight|Weight)?\s*:\s*(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})\b/,
    );

    for (const weight of [400, 500, 600, 700]) {
      expect(setupPage).toContain(`font-weight:${weight}`);
    }
  });

  it('keeps layout within the workspace shell without viewport arithmetic', () => {
    expect(setupPage).not.toMatch(/100vw|calc\([^)]*(?:sidebar|100vw)|translateX\(/i);
    expect(setupPage).toContain('<DashboardPageShell');
    expect(setupPage).toContain('className="account-setup-workspace-page"');
    expect(setupPage).toContain('contentClassName="setup-content"');
  });
});
