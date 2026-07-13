import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const securityPage = readFileSync(join(process.cwd(), 'src/app/security/page.tsx'), 'utf8');

describe('security visual-system contract', () => {
  it('uses shared theme tokens without a page-owned palette or font stack', () => {
    expect(securityPage).not.toMatch(
      /#[0-9a-f]{3,8}\b|rgba?\(|(?:linear|radial|conic)-gradient\(|\b(?:Tajawal|Arial|Cairo)\b/i,
    );
    expect(securityPage).not.toMatch(/\.dark\b|:global\(\.dark\)/i);

    for (const token of [
      '--background',
      '--surface',
      '--foreground',
      '--border',
      '--primary',
      '--success-soft',
      '--warning-soft',
      '--danger-soft',
      '--info-soft',
      '--focus-ring',
      '--font-ui',
      '--font-data',
    ]) {
      expect(securityPage).toContain(`var(${token})`);
    }
  });

  it('keeps typography within the shared hierarchy', () => {
    expect(securityPage).not.toMatch(
      /font(?:-weight|Weight)?\s*:\s*(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})\b/,
    );
    expect(securityPage).toContain('font-family:var(--font-ui)');
    expect(securityPage).toContain('.security-score-copy h2{margin:10px 0 0;font-family:var(--font-data)');
    expect(securityPage).toContain('.manual-secret code{');
    expect(securityPage).toContain('font:600 13px/1.5 var(--font-data)');
  });

  it('retains a proportional, semantic and accessible security score', () => {
    expect(securityPage).toContain('role="img"');
    expect(securityPage).toContain('aria-label={`${security.score}/100`}');
    expect(securityPage).toContain('pathLength="100"');
    expect(securityPage).toContain('strokeDasharray={`${security.score} 100`}');
    expect(securityPage).toContain("'--ring-color': security.score >= 50 ? 'var(--success)' : 'var(--danger)'");
    expect(securityPage).toContain('.score-ring-value{stroke:var(--ring-color);stroke-linecap:round}');
  });

  it('uses semantic interaction states and stays inside the shared workspace shell', () => {
    expect(securityPage).toContain('<DashboardPageShell ariaLabel={text.title} contentClassName="security-content">');
    expect(securityPage).toContain('outline:2px solid var(--focus-ring)');
    expect(securityPage).toContain('background:var(--background-overlay)');
    expect(securityPage).not.toMatch(/100vw|calc\([^)]*(?:sidebar|100vw)|margin-(?:left|right)\s*:/i);
  });
});
