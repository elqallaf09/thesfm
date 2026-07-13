import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const guardSource = read('scripts/check-visual-system.mjs');

function probe(source: string, relativePath = 'src/probe.tsx') {
  const directory = mkdtempSync(join(tmpdir(), 'sfm-visual-guard-'));
  const file = join(directory, `probe${extname(relativePath) || '.tsx'}`);
  writeFileSync(file, source);

  try {
    const stdout = execFileSync(
      process.execPath,
      ['scripts/check-visual-system.mjs', '--probe-file', file, '--probe-as', relativePath],
      { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' },
    );
    return { passed: true, output: stdout };
  } catch (error) {
    const failed = error as Error & { stderr?: string; stdout?: string };
    return {
      passed: false,
      output: `${failed.stdout ?? ''}${failed.stderr ?? ''}`,
    };
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

describe('visual-system source guard', () => {
  it('is part of the consolidated launch validation', () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts: Record<string, string> };

    expect(packageJson.scripts['check:visual-system']).toBe('node scripts/check-visual-system.mjs');
    expect(packageJson.scripts['check:launch']).toContain('pnpm check:visual-system');
  });

  it('rejects raw palettes and font systems with zero production allowance', () => {
    expect(() => execFileSync(
      process.execPath,
      ['scripts/check-visual-system.mjs'],
      { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' },
    )).not.toThrow();
  });

  it('rejects built-in and raw arbitrary Tailwind depth utilities', () => {
    const result = probe(`
      export const legacyRadiusClass = 'rounded-lg';
      export const card = (
        <div className="rounded-lg rounded-4xl shadow-md drop-shadow-sm rounded-[13px] shadow-[0_2px_8px_var(--shadow-color)] rounded-(--legacy-radius) shadow-(--legacy-shadow)" />
      );
    `);

    expect(result.passed).toBe(false);
    expect(result.output).toContain('built-in or raw Tailwind depth utility');
    expect(result.output).toContain('rounded-lg');
  });

  it('allows semantic arbitrary Tailwind depth utilities and state resets', () => {
    const result = probe(`
      export const card = (
        <div className="rounded-[var(--radius-card)] rounded-[inherit] shadow-[var(--shadow-card)] shadow-[var(--active-indicator-shadow)] rounded-(--radius-card) shadow-(--shadow-card) shadow-card shadow-none dark:drop-shadow-none" />
      );
    `);

    expect(result).toMatchObject({ passed: true });
  });

  it('rejects raw CSS depth, drop-shadow filters, and literal shadow objects', () => {
    const cssResult = probe(`
      .card {
        border-radius: clamp(8px, 2vw, 18px);
        box-shadow: 0 4px 16px color-mix(in srgb, var(--shadow-color) 20%, transparent);
        filter: drop-shadow(0 2px 4px var(--shadow-color));
      }
    `, 'src/probe.css');
    const objectResult = probe(`export const options = { shadow: { type: 'outer', opacity: 0.2 } };`);

    expect(cssResult.passed).toBe(false);
    expect(cssResult.output).toContain('literal radius or shadow');
    expect(objectResult.passed).toBe(false);
    expect(objectResult.output).toContain('literal radius or shadow');
  });

  it('rejects bare presentation colours and direct fontFace strings', () => {
    const result = probe(`
      export const options = {
        color: 'AABBCC',
        fill: '11223344',
        "fontFace": 'Aptos',
      };
    `);

    expect(result.passed).toBe(false);
    expect(result.output).toContain('bare visual colour string');
    expect(result.output).toContain('legacy or direct font declaration');
  });

  it('keeps static visual output token-derived', () => {
    const result = probe(`
      export const options = {
        color: STATIC_PRESENTATION_VISUAL_TOKENS.primary,
        fill: STATIC_PRESENTATION_VISUAL_TOKENS.surface,
        fontFace: STATIC_PRESENTATION_VISUAL_TOKENS.fontUi,
        shadow: createStaticPresentationCardShadow(),
      };
    `);

    expect(result).toMatchObject({ passed: true });
  });

  it('detects legacy aliases inside granular foundation exceptions', () => {
    const themeResult = probe(`
      :root {
        --background: #F4F7FB;
        --sfm-light-background: var(--background);
        --film-gold: var(--warning);
      }
    `, 'src/styles/themes.css');
    const tokenResult = probe(`
      :root {
        --radius-card: 14px;
        --shadow-card: 0 4px 12px var(--shadow-color);
        --r-lg: var(--radius-card);
        --font-cairo: var(--font-ui);
      }
    `, 'src/styles/tokens.css');

    expect(themeResult.passed).toBe(false);
    expect(themeResult.output).toContain('legacy local visual alias');
    expect(tokenResult.passed).toBe(false);
    expect(tokenResult.output).toContain('legacy local visual alias');
  });

  it('rejects page-local palette families while allowing state and layout properties', () => {
    const aliasResult = probe(`
      :root {
        --news-bg: var(--background);
        --landing-heading: var(--foreground);
        --report-shadow: var(--shadow-card);
        --_sidebar-border: var(--border);
        --_mobile-surface: var(--surface);
      }
    `, 'src/probe.css');
    const layoutResult = probe(`
      :root {
        --market-ticker-gap: var(--space-2);
        --news-grid-gap: var(--space-3);
        --landing-hero-height: 40rem;
        --report-page-count: 0;
        --_sidebar-width: 14rem;
        --_mobile-open: 0;
        --paper-size: 210mm;
        --canvas-width: 60rem;
        --black-scholes-grid-gap: var(--space-2);
        --green-bond-grid-gap: var(--space-2);
      }
      .card { border-radius: var(--layout-card-radius); }
      .square { border-radius: 0; }
      .drawer { border-radius: var(--radius-panel) var(--radius-panel) 0 0; }
    `, 'src/probe.css');

    expect(aliasResult.passed).toBe(false);
    expect(aliasResult.output).toContain('legacy local visual alias');
    expect(layoutResult).toMatchObject({ passed: true });
  });

  it('does not confuse domain copy and prop values with Tailwind utilities', () => {
    const result = probe(`
      type Shape = 'rounded' | 'circle';
      export const formula = 'The weighted average is rounded down.';
      export const marketTickerGap = 'session gap';
    `);

    expect(result).toMatchObject({ passed: true });
  });

  it('enforces the zero-debt lock across runtime styles and standalone output', () => {
    const baseline = JSON.parse(read('scripts/visual-system-legacy-baseline.json')) as {
      version: number;
      files: Record<string, unknown>;
    };

    expect(baseline.version).toBe(2);
    expect(baseline.files).toEqual({});
    expect(guardSource).toContain("const scanRoots = ['src', 'public']");
    expect(guardSource).toContain("'.js'");
    expect(guardSource).toContain("'.json'");
    expect(guardSource).toContain("'.svg'");
    expect(guardSource).toContain("'.webmanifest'");
    expect(guardSource).toContain("'src/lib/visual-system/chartStyles.ts'");
    expect(guardSource).toContain('bareVisualColors');
    expect(guardSource).toContain('tailwindDepth');
    expect(guardSource).toContain('legacyAliases');
    expect(guardSource).toContain("process.argv.indexOf('--probe-file')");
    expect(guardSource).toContain('active production findings must be migrated, not allowlisted');
    expect(guardSource).toContain("'src/styles/static-tokens.ts'");
  });
});
