import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('SFM historical store source contract', () => {
  it('keeps the persistence module provider-agnostic', () => {
    const source = readFileSync('src/lib/sfm-market/store.ts', 'utf8').toLowerCase();
    expect(source).toContain("sfm_market_observations");
    expect(source).toContain('rights_review_required');
    expect(source).toContain('internal_only');
    expect(source).not.toContain('fetchyahoo');
    expect(source).not.toContain('yahoo finance');
  });

  it('does not expose browser read policies for the evidence ledger', () => {
    const sql = readFileSync('supabase/migrations/20260917044000_create_sfm_market_observations.sql', 'utf8').toLowerCase();
    expect(sql).not.toMatch(/create\s+policy[\s\S]*to\s+(anon|authenticated)/i);
    expect(sql).not.toMatch(/grant\s+select[^;]*to\s+(anon|authenticated)/i);
  });
});
