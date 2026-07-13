import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const projectsPage = readFileSync(join(process.cwd(), 'src/app/projects/page.tsx'), 'utf8');

describe('projects page visual-system contract', () => {
  it('uses shared semantic colors instead of a page-owned palette', () => {
    expect(projectsPage).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|oklch\(/i);
    expect(projectsPage).not.toMatch(/--sfm-|\b(?:cyan|sky)-(?:50|100|200)\b/i);
    expect(projectsPage).not.toMatch(/\.(?:dark|light)\b/);

    for (const token of [
      '--background',
      '--surface',
      '--surface-elevated',
      '--surface-muted',
      '--foreground',
      '--foreground-secondary',
      '--foreground-muted',
      '--border',
      '--border-strong',
      '--primary',
      '--primary-hover',
      '--primary-soft',
      '--accent',
      '--accent-soft',
      '--success',
      '--success-soft',
      '--warning',
      '--warning-soft',
      '--danger',
      '--danger-soft',
      '--info',
      '--info-soft',
      '--focus-ring',
      '--chart-grid',
    ]) {
      expect(projectsPage).toContain(`var(${token})`);
    }
  });

  it('keeps cards and controls flat and reserves no local gradient treatment', () => {
    expect(projectsPage).not.toMatch(/(?:linear|radial|conic)-gradient\(|var\(--hero-gradient\)/i);
    expect(projectsPage).toContain('.pc{background:var(--surface);border:1px solid var(--border)');
    expect(projectsPage).toContain('.pbtn-g,.pbtn-d{background:var(--primary);color:var(--primary-foreground)');
    expect(projectsPage).toContain('.need-chip.active{background:var(--primary-soft);border-color:var(--primary)');
  });

  it('uses the shared UI font and limits mono typography to financial data', () => {
    expect(projectsPage).toContain('.pp{font-family:var(--font-ui)');
    expect(projectsPage).toContain('fontFamily: \'var(--font-data)\'');
    expect(projectsPage).not.toMatch(/\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b/i);
    expect(projectsPage).not.toMatch(/@import\s+url\([^)]*fonts/i);
  });

  it('caps typography at 700 and maps project states to semantic status tokens', () => {
    expect(projectsPage).not.toMatch(
      /font(?:-weight|Weight)?\s*:\s*['"]?(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})\b/,
    );

    const statusConfig = projectsPage.slice(
      projectsPage.indexOf('const STATUS_CONFIG'),
      projectsPage.indexOf('const emptyForm'),
    );

    for (const pair of [
      ["'\u0641\u0643\u0631\u0629'", '--info-soft'],
      ["'\u0642\u064a\u062f \u0627\u0644\u062a\u0646\u0641\u064a\u0630'", '--warning-soft'],
      ["'\u0646\u0634\u0637'", '--success-soft'],
      ["'\u0645\u062a\u0648\u0642\u0641'", '--danger-soft'],
      ["'\u0645\u0643\u062a\u0645\u0644'", '--accent-soft'],
    ]) {
      const statusStart = statusConfig.indexOf(pair[0]);
      expect(statusStart).toBeGreaterThan(-1);
      expect(statusConfig.slice(statusStart, statusStart + 260)).toContain(`var(${pair[1]})`);
    }
  });

  it('uses shared focus, shadow, and reduced-motion behavior', () => {
    expect(projectsPage).toContain('box-shadow:var(--shadow-card)');
    expect(projectsPage).toContain('box-shadow:var(--focus-shadow)');
    expect(projectsPage).toContain('outline:2px solid var(--focus-ring)');
    expect(projectsPage).toContain('@media(prefers-reduced-motion:reduce)');
  });

  it('keeps project controls keyboard operable and exposes selection and expansion state', () => {
    expect(projectsPage).toContain('htmlFor="project-name"');
    expect(projectsPage).toContain('aria-valuetext=');
    expect(projectsPage).toContain('aria-pressed={active}');
    expect(projectsPage).toContain('aria-pressed={done}');
    expect(projectsPage).toContain('aria-expanded={Boolean(project.expanded)}');
    expect(projectsPage).toContain('aria-controls={`project-details-${project.id}`}');
    expect(projectsPage).toMatch(/<Link\b[^>]*href=\{`\/projects\/\$\{project\.id\}`\}/);
    expect(projectsPage).not.toMatch(/<div\s+key=\{s\.id\}\s+onClick=/);
  });
});
