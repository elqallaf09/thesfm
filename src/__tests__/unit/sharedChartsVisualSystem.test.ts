import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

const businessChart = read('src/components/business/BusinessOperationsChartCard.tsx');
const aiCharts = read('src/components/ai/AiCharts.tsx');
const financeDashboard = read('src/components/finance/RouteDashboardPage.tsx');

describe('shared financial chart visual system', () => {
  it.each([businessChart, aiCharts, financeDashboard])('does not own a literal chart palette', source => {
    expect(source).not.toMatch(/(?<!&)#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i);
  });

  it('uses shared chart, status, label, tooltip, and data-font tokens', () => {
    const charts = `${businessChart}\n${aiCharts}`;
    for (const token of [
      '--chart-1',
      '--chart-grid',
      '--chart-label',
      '--surface-elevated',
      '--border',
      '--font-data',
      '--font-ui',
      '--success',
      '--danger',
      '--primary',
    ]) expect(charts, token).toContain(`var(${token})`);

    expect(financeDashboard).toContain("tone: 'var(--danger)'");
    expect(financeDashboard).toContain("tone: 'var(--success)'");
    expect(financeDashboard).toContain("tone: 'var(--warning)'");
    expect(financeDashboard).toContain("tone: 'var(--info)'");
  });
});
