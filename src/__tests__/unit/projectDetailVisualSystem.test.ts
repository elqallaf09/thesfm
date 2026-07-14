import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const routeFiles = [
  'src/app/projects/[id]/page.tsx',
  'src/app/projects/[id]/_components.tsx',
  'src/app/projects/[id]/_DeleteModal.tsx',
  'src/app/projects/[id]/_ExpenseModal.tsx',
  'src/app/projects/[id]/_FeasibilityTab.tsx',
  'src/app/projects/[id]/_IncomeModal.tsx',
  'src/app/projects/[id]/_styles.tsx',
];

const directVisualDependencies = [
  'src/components/projects/ProjectAiAdvisorTab.tsx',
  'src/components/projects/ProjectDocumentsTab.tsx',
  'src/components/projects/ProjectFinancialModelTab.tsx',
  'src/components/projects/ProjectKpisTab.tsx',
  'src/components/projects/ProjectPitchDeckTab.tsx',
  'src/components/projects/ProjectTasksTab.tsx',
];

const sources = new Map(
  [...routeFiles, ...directVisualDependencies].map(file => [
    file,
    readFileSync(join(process.cwd(), file), 'utf8'),
  ]),
);

const route = sources.get('src/app/projects/[id]/page.tsx') ?? '';
const styles = sources.get('src/app/projects/[id]/_styles.tsx') ?? '';
const combined = [...sources.values()].join('\n');
const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('project-detail visual-system contract', () => {
  it('covers every directly rendered project workspace tab', () => {
    for (const component of [
      'ProjectAiAdvisorTab',
      'ProjectDocumentsTab',
      'ProjectFinancialModelTab',
      'ProjectKpisTab',
      'ProjectPitchDeckTab',
      'ProjectTasksTab',
    ]) {
      expect(route).toContain(component);
    }

    expect(directVisualDependencies).toHaveLength(6);
  });

  it('uses only centralized semantic colors, typography, radii, and shadows', () => {
    expect(combined).not.toMatch(
      /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|oklch\(|var\(--sfm-|\.(?:dark|light)\b/i,
    );
    expect(combined).not.toMatch(
      /\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b|font-weight:\s*(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|[1-9]\d{3,})/i,
    );
    expect(combined).not.toMatch(/border-radius:\s*(?:\d|calc|min|max|clamp)/i);
    expect(combined).not.toMatch(/box-shadow:(?!var\(|none)[^;}]+/i);

    for (const token of [
      '--background', '--surface', '--surface-muted', '--foreground',
      '--foreground-muted', '--border', '--border-strong',
      '--primary', '--primary-hover', '--primary-soft', '--primary-foreground',
      '--accent', '--accent-soft', '--success', '--success-soft', '--warning',
      '--warning-soft', '--danger', '--danger-soft', '--focus-shadow',
      '--shadow-card', '--shadow-popover', '--radius-control', '--radius-card',
      '--radius-panel', '--radius-pill',
    ]) {
      expect(combined).toContain(`var(${token})`);
    }
  });

  it('keeps one intentional project hero and flat tab-level summary surfaces', () => {
    expect(combined).not.toMatch(/(?:linear|radial|conic)-gradient\(/i);
    expect(combined.match(/var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(styles).toContain('.workspace-hero{');
    expect(styles).toContain('background:var(--hero-gradient);color:var(--hero-foreground)');

    for (const source of directVisualDependencies.map(file => sources.get(file) ?? '')) {
      expect(source).not.toContain('var(--hero-gradient)');
    }
    expect(globals).not.toMatch(
      /:is\([^)]*\.ai-status-card[^)]*\)\s*\{[^}]*background:\s*var\(--hero-gradient\)/,
    );
    expect(globals).not.toMatch(
      /\.ai-status-card\s*\{[^}]*background:\s*var\(--hero-gradient\)/,
    );
    expect(combined).toContain('background:var(--primary-soft)');
  });

  it('keeps financial values in the data font without applying mono globally', () => {
    expect(styles).toContain('.project-workspace{');
    expect(styles).toContain('font-family:var(--font-ui)');
    expect(styles).toContain('font-family:var(--font-data)');
    expect(styles).not.toMatch(/\.project-workspace\{[^}]*font-family:var\(--font-data\)/);
    expect(combined).toContain('.forecast-table td{font-family:var(--font-data)}');
    expect(combined).toContain('.summary-card strong{display:block;margin-top:6px;color:var(--foreground);font-family:var(--font-data)');
  });

  it('preserves semantic project states, accessible scores, and print contrast', () => {
    for (const stateToken of [
      '.status-pill.feasible{background:var(--success-soft);color:var(--success)',
      '.status-pill.needs_review{background:var(--warning-soft);color:var(--warning)',
      '.status-pill.high_risk{background:var(--danger-soft);color:var(--danger)',
      '.timeline-bar.done{background:var(--success)',
      '.timeline-bar.late{background:var(--danger)',
      '.kpi-health-card.insufficient .health-score-ring{background:var(--surface-muted);border-color:var(--foreground-muted)',
    ]) {
      expect(combined).toContain(stateToken);
    }

    expect(combined.match(/role="img"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(combined).toContain('aria-label={`${tr.feasibilityScore}: ${feasibilityMetrics.score}/100`}');
    expect(combined).toContain('aria-label={`${t.readiness}: ${deck?.completionPercent ?? 0}/100`}');
    expect(combined).toContain('var(--print-background)');
    expect(combined).toContain('var(--print-foreground)');
    expect(combined).toContain('var(--print-border)');
  });

  it('preserves full-width shell ownership, RTL/LTR behavior, and mobile stacking', () => {
    expect(styles).not.toMatch(/margin-inline-start:\s*var\(--sidebar|calc\(100vw|\b100vw\b/i);
    expect(styles).not.toContain('.sfm-dashboard-page-shell');
    expect(combined).not.toMatch(/calc\(100vw|\b100vw\b/i);
    expect(combined).toContain('[dir="rtl"] .milestone-marker{transform:translateX(50%)}');
    expect(combined).toContain("dir={lang === 'ar' ? 'rtl' : 'ltr'}");
    expect(combined).toContain('@media(max-width:760px)');
    expect(combined).toContain('grid-template-columns:1fr');
    expect(combined).toContain('min-height:44px');
    expect(styles).toContain('@media(prefers-reduced-motion:reduce)');
    expect(combined).toContain('calc(var(--global-header-height) + 16px)');
    expect(combined).toContain('calc(var(--global-header-height) + 14px)');
    expect(combined).not.toContain('<main className="slide-stage"');
  });
});
