import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('TTS route security', () => {
  it('uses verified session security rather than a caller-supplied user header', () => {
    const source = readFileSync('src/app/api/tts/route.ts', 'utf8');
    expect(source).toContain('inspectSessionSecurity');
    expect(source).toContain('checkRateLimit');
    expect(source).toContain('AbortSignal.timeout');
    expect(source).not.toContain("headers.get('x-user-id')");
  });
});
