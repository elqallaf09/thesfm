import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('Supabase API key compatibility boundary', () => {
  it('prefers a publishable key while preserving legacy generated consumers', () => {
    const config = source('next.config.ts');

    expect(config).toContain('process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()');
    expect(config).toContain('process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()');
    expect(config).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY: SUPABASE_PUBLIC_KEY');
  });

  it('never maps a privileged Supabase key into the client environment', () => {
    const config = source('next.config.ts');
    const publicMapping = config.slice(config.indexOf('env: {'), config.indexOf('serverExternalPackages'));

    expect(publicMapping).not.toMatch(/SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/);
  });
});
