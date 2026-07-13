import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const profilePage = readFileSync(join(process.cwd(), 'src/app/profile/page.tsx'), 'utf8');
const profileStyles = profilePage.slice(profilePage.indexOf('<style jsx global>'));

describe('profile visual-system contract', () => {
  it('uses the shared semantic palette without a page-owned theme', () => {
    expect(profilePage).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i);
    expect(profilePage).not.toMatch(/--profile-|var\(--sfm-|\.dark\s+\.profile/i);

    for (const token of [
      '--background',
      '--surface',
      '--surface-muted',
      '--foreground',
      '--foreground-secondary',
      '--foreground-muted',
      '--border',
      '--primary',
      '--accent',
      '--success-soft',
      '--warning-soft',
      '--danger-soft',
      '--info-soft',
      '--focus-ring',
    ]) {
      expect(profileStyles).toContain(`var(${token})`);
    }
  });

  it('reserves the centralized gradient for the profile identity hero', () => {
    expect(profilePage).not.toMatch(/(?:linear|radial|conic)-gradient\(/i);
    expect(profilePage.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(profileStyles).toMatch(/\.hero-card\s*\{[\s\S]*?background:\s*var\(--hero-gradient\);/);
    expect(profileStyles).toMatch(/\.profile-card\s*\{[\s\S]*?background:\s*var\(--surface\);/);
    expect(profileStyles).toMatch(/\.feature-card\s*\{[\s\S]*?background:\s*var\(--surface-muted\);/);
  });

  it('uses IBM Plex UI typography and caps explicit weights at 700', () => {
    expect(profilePage).not.toMatch(/\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto|Noto Sans Arabic)\b/i);
    expect(profileStyles).toContain('font-family: var(--font-ui);');
    expect(profilePage).not.toMatch(
      /font(?:-weight|Weight)?\s*:\s*(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})\b/,
    );
  });

  it('keeps status, focus, and depth treatments semantic', () => {
    expect(profileStyles).toContain('box-shadow: var(--shadow-card);');
    expect(profileStyles).toContain('box-shadow: var(--shadow-popover);');
    expect(profileStyles).toContain('outline: 2px solid var(--focus-ring);');
    expect(profileStyles).toContain('background: var(--success-soft);');
    expect(profileStyles).toContain('background: var(--warning-soft);');
    expect(profileStyles).toContain('background: var(--danger-soft);');
    expect(profileStyles).toContain('background: var(--info-soft);');
  });

  it('preserves RTL, responsive, reduced-motion, and switch semantics', () => {
    expect(profileStyles).toContain('[dir="ltr"] .toggle.on i');
    expect(profileStyles).toContain('@media (max-width: 1180px)');
    expect(profileStyles).toContain('@media (max-width: 720px)');
    expect(profileStyles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(profilePage).toContain('role="switch"');
    expect(profilePage).toContain('aria-checked={checked}');
    expect(profilePage).toContain('aria-pressed={value === id}');
  });
});
