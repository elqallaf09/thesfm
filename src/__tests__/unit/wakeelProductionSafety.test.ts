import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Wakeel production safety', () => {
  it('does not ship the legacy fake portfolio or test-user identity', () => {
    const api = readFileSync('src/app/api/wakeel/route.ts', 'utf8');
    const ui = readFileSync('src/components/Wakeel.tsx', 'utf8');
    expect(`${api}\n${ui}`).not.toContain('test-user');
    expect(`${api}\n${ui}`).not.toContain('220000');
    expect(api).not.toContain('GEMINI_API_KEY');
    expect(api).toContain('WAKEEL_FINANCIAL_CONTEXT_NOT_CONFIGURED');
    expect(existsSync('src/lib/supabase/portfolio.ts')).toBe(false);
  });
});
