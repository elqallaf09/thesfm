import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('external Preview automation bypass wiring', () => {
  it('reads the approved process variable and maps only the required Vercel headers', () => {
    const setup = read('tests/smoke/preview-protection.global-setup.ts');

    expect(setup).toContain('process.env.VERCEL_AUTOMATION_BYPASS_SECRET');
    expect(setup).toContain("'x-vercel-protection-bypass': secret");
    expect(setup).toContain("'x-vercel-set-bypass-cookie': 'true'");
    expect(setup).toContain('VERCEL_AUTOMATION_BYPASS_SECRET is required');
    expect(setup).not.toMatch(/console\.|searchParams|argv|snapshot/i);
  });

  it('maps the GitHub secret explicitly into the Preview job environment', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).toContain('environment: Preview');
    expect(workflow).toContain('VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}');
    expect(workflow).toContain('playwright.preview.config.ts');
  });
});
