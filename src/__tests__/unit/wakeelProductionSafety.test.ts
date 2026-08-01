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

  it('keeps retired root-level prototype drops and patch scripts out of production', () => {
    const retiredPaths = [
      'components/Wakeel.jsx',
      'components/Wakeel.tsx',
      'lib/wakeel.ts',
      'lib/supabase/portfolio.ts',
      'lib/supabase/server.ts',
      'wakeel-admin',
      'wakeel-tracking',
      'fix-arabic-tts-v2.py',
      'fix-arabic-tts.py',
      'fix-encoding.py',
      'fix-wakeel-component.py',
      'fix-wakeel-voice.py',
      'replace-browser-speak.py',
    ];

    for (const retiredPath of retiredPaths) expect(existsSync(retiredPath)).toBe(false);
  });
});
