import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const personalizedRoutes = [
  'src/app/api/economic-intelligence/advisor-grounding/route.ts',
  'src/app/api/economic-intelligence/advisor-chat/route.ts',
  'src/app/api/economic-intelligence/proactive-events/route.ts',
  'src/app/api/economic-intelligence/decision-memory/route.ts',
  'src/app/api/economic-intelligence/daily-brief/route.ts',
  'src/app/api/economic-intelligence/provenance/route.ts',
  'src/app/api/economic-intelligence/readiness/route.ts',
  'src/app/api/economic-intelligence/event-outcomes/route.ts',
];

describe('Economic Intelligence personalized API privacy contracts', () => {
  it.each(personalizedRoutes)('%s declares private no-store response handling', (path) => {
    const source = read(path);
    expect(source.toLowerCase()).toContain('private, no-store');
  });

  it.each([
    'src/app/api/economic-intelligence/advisor-grounding/route.ts',
    'src/app/api/economic-intelligence/advisor-chat/route.ts',
    'src/app/api/economic-intelligence/proactive-events/route.ts',
  ])('%s applies the private policy beyond success responses', (path) => {
    const source = read(path);
    expect(source).toContain('const NO_STORE');
    expect(source).toMatch(/UNAUTHENTICATED[\s\S]*?headers:\s*NO_STORE/);
    expect(source).toMatch(/APPLICATION_RATE_LIMITED[\s\S]*?\.\.\.NO_STORE/);
  });
});
