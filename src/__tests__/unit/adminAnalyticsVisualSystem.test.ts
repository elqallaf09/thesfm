import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const adminClient = readFileSync(
  join(process.cwd(), 'src/app/sfm-admin-control/AdminAnalyticsClient.tsx'),
  'utf8',
);
const adminStyles = adminClient.slice(adminClient.indexOf('const adminStyles = `'));

describe('administration analytics visual system', () => {
  it('uses the shared semantic theme with one intentional hero gradient', () => {
    expect(adminStyles).toContain('font-family:var(--font-ui)');
    expect(adminStyles).toContain('background:var(--surface)');
    expect(adminStyles).toContain('border:1px solid var(--border)');
    expect(adminStyles).toContain('box-shadow:var(--shadow-card)');
    expect(adminStyles).toContain('background:var(--success-soft)');
    expect(adminStyles).toContain('background:var(--warning-soft)');
    expect(adminStyles).toContain('background:var(--danger-soft)');
    expect(adminStyles).toContain('font-family:var(--font-data)');
    expect(adminStyles.match(/background:var\(--hero-gradient\)/g)).toHaveLength(1);
    expect(adminStyles).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|(?:linear|radial|conic)-gradient\(/i);
    expect(adminStyles).not.toMatch(/\b(?:Tajawal|Arial)\b|:global\(\.dark\)/i);
    expect(adminStyles).not.toMatch(/font(?:-weight|):\s*(?:[89]00|[7-9][5-9]0)/);
  });

  it('retains the analytics geometry and responsive table behavior', () => {
    expect(adminStyles).toContain('max-width:1500px');
    expect(adminStyles).toContain('table{width:100%;border-collapse:collapse;min-width:680px}');
    expect(adminStyles).toContain('@media(max-width:1200px)');
    expect(adminStyles).toContain('@media(max-width:1100px)');
    expect(adminStyles).toContain('@media(max-width:720px)');
  });
});
