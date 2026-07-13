import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const files = [
  'OperationsCenterClient.tsx',
  'components/ActionCenterList.tsx',
  'components/ErrorCenterTable.tsx',
  'components/FeatureHealthGrid.tsx',
  'components/HealthScoreCard.tsx',
  'components/JobSourceCard.tsx',
  'components/NotInstrumentedNote.tsx',
  'components/RootCauseAccordion.tsx',
  'components/SymbolCoverageCard.tsx',
  'tabs/AiTab.tsx',
  'tabs/LogsTab.tsx',
  'tabs/PerformanceTab.tsx',
  'tabs/ShariahTab.tsx',
] as const;

const sources = files.map(file => readFileSync(
  join(process.cwd(), 'src/app/sfm-admin-control/market-diagnostics', file),
  'utf8',
));
const combined = sources.join('\n');
const shariaAdmin = readFileSync(
  join(process.cwd(), 'src/app/sfm-admin-control/shariah/ShariahAdminClient.tsx'),
  'utf8',
);

describe('Administration market diagnostics visual-system contract', () => {
  it('keeps the full active dependency set free of local palettes and typography', () => {
    expect(combined).not.toMatch(
      /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|oklch\(|(?:linear|radial|conic)-gradient\(|\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b|font-weight:\s*(?:8\d{2}|9\d{2})/i,
    );
    expect(combined).not.toMatch(/border-radius:\s*999px|border-radius:\s*var\([^;]*,\s*\d+(?:\.\d+)?(?:px|rem)/i);
  });

  it('uses flat semantic surfaces, radii, focusable controls, and state colors', () => {
    expect(combined).toContain('var(--surface-elevated)');
    expect(combined).toContain('var(--radius-card)');
    expect(combined).toContain('var(--radius-pill)');
    expect(combined).toContain('var(--primary-foreground)');
    expect(combined).toContain('var(--success)');
    expect(combined).toContain('var(--danger)');
    expect(combined).toContain('.market-diagnostics-admin { width: 100%; max-width: none; margin: 0; padding: 0;');
    expect(combined).not.toContain('max-width: 1160px');
  });

  it('reserves the data font for operational metrics', () => {
    expect(combined).toContain('.ops-health-score-percent { font: 600 26px var(--font-data)');
    expect(combined).toContain('.ops-shariah-counts strong { display: block; color: var(--foreground); font: 600 20px/1 var(--font-data)');
    expect(combined).toContain('.ops-ai-usage-summary strong { display: block; color: var(--foreground); font: 600 20px var(--font-data)');
  });

  it('keeps Sharia administration on the same semantic and accessible contract', () => {
    expect(shariaAdmin).not.toMatch(
      /#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|(?:linear|radial|conic)-gradient\(|\b(?:Tajawal|Cairo|Arial)\b|var\(--sfm-|font-weight:\s*(?:8\d{2}|9\d{2})/i,
    );
    expect(shariaAdmin).toContain('font:600 26px/1 var(--font-data)');
    expect(shariaAdmin).toContain('background:var(--success-soft);color:var(--success)');
    expect(shariaAdmin).toContain('outline:2px solid var(--focus-ring)');
  });
});
