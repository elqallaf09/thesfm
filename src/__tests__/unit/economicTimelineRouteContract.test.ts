import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('economic timeline outcome route', () => {
  it('posts opened, actioned and resolved events to the existing canonical API', () => {
    const source = readFileSync('src/app/decisions/timeline/page.tsx', 'utf8');
    expect(existsSync('src/app/api/economic-intelligence/event-outcomes/route.ts')).toBe(true);
    expect(source.match(/fetch\('\/api\/economic-intelligence\/event-outcomes'/g)).toHaveLength(3);
    expect(source).not.toContain("'/api/economic-intelligence/event-outcome'");
  });
});
