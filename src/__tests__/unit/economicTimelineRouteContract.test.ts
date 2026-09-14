import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('economic timeline outcome route', () => {
  it('records timeline views as opened only and reserves actioned for explicit user actions', () => {
    const source = readFileSync('src/app/decisions/timeline/page.tsx', 'utf8');
    expect(existsSync('src/app/api/economic-intelligence/event-outcomes/route.ts')).toBe(true);
    expect(source.match(/fetch\('\/api\/economic-intelligence\/event-outcomes'/g)).toHaveLength(2);
    expect(source).toContain("action: 'opened'");
    expect(source).toContain("action: 'resolved'");
    expect(source).not.toContain("action: 'actioned'");
    expect(source).not.toContain("'/api/economic-intelligence/event-outcome'");
  });
});
