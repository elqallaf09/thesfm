import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'src/app/reset-password/page.tsx'),
  'utf8',
);
const styles = source.slice(source.indexOf('<style jsx global>'));

describe('reset-password visual-system contract', () => {
  it('uses only centralized semantic colors and the shared UI font', () => {
    expect(styles).toContain('background: var(--background)');
    expect(styles).toContain('background: var(--surface-elevated)');
    expect(styles).toContain('background: var(--primary)');
    expect(styles).toContain('color: var(--primary-foreground)');
    expect(styles).toContain('font-family: var(--font-ui)');
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i);
    expect(styles).not.toMatch(/(?:linear|radial|conic)-gradient\(/i);
    expect(styles).not.toMatch(/\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b/i);
    expect(styles).not.toMatch(/\.dark\b|html\[data-theme/i);
  });

  it('keeps status, focus, and disabled states semantic and readable', () => {
    for (const token of [
      '--danger',
      '--danger-soft',
      '--warning',
      '--success',
      '--success-soft',
      '--focus-ring',
      '--focus-shadow',
      '--control-disabled',
      '--foreground-subtle',
    ]) {
      expect(styles).toContain(token);
    }
    expect(styles).not.toMatch(/font-weight:\s*(?:[89]\d\d|[89]00)|font:\s*(?:[89]\d\d|[89]00)/);
  });
});
