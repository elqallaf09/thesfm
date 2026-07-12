import { describe, expect, it } from 'vitest';
import {
  documentSharable,
  evaluateLinkState,
  INVESTOR_SECTIONS,
  normalizeSections,
  sectionAllowed,
} from '@/lib/investor/shareAccess';
import {
  generateInvestorToken,
  hashInvestorPassword,
  hashInvestorToken,
  verifyInvestorPassword,
  verifyInvestorPasswordAsync,
} from '@/lib/server/investorShare';

const NOW = new Date('2026-07-12T12:00:00Z').getTime();

describe('investor link state', () => {
  it('treats a link without expiry or revocation as active', () => {
    expect(evaluateLinkState({}, NOW)).toBe('active');
    expect(evaluateLinkState({ expires_at: '2026-08-01T00:00:00Z' }, NOW)).toBe('active');
  });

  it('expires links exactly at their expiry timestamp', () => {
    expect(evaluateLinkState({ expires_at: '2026-07-01T00:00:00Z' }, NOW)).toBe('expired');
    expect(evaluateLinkState({ expires_at: new Date(NOW).toISOString() }, NOW)).toBe('expired');
  });

  it('revocation always wins, even over a future expiry', () => {
    expect(evaluateLinkState({ revoked_at: '2026-07-10T00:00:00Z', expires_at: '2027-01-01T00:00:00Z' }, NOW)).toBe('revoked');
  });

  it('keeps only known sections and drops everything else', () => {
    expect(normalizeSections(['overview', 'financials', 'admin_notes', 42, 'documents'])).toEqual([
      'overview',
      'financials',
      'documents',
    ]);
    expect(normalizeSections('overview')).toEqual([]);
    expect(normalizeSections(null)).toEqual([]);
    expect(INVESTOR_SECTIONS).not.toContain('activity');
  });

  it('answers section permission from the stored allowlist', () => {
    const link = { visible_sections: ['overview', 'risks'] };
    expect(sectionAllowed(link, 'overview')).toBe(true);
    expect(sectionAllowed(link, 'risks')).toBe(true);
    expect(sectionAllowed(link, 'documents')).toBe(false);
  });

  it('treats documents as private unless explicitly marked sharable', () => {
    expect(documentSharable({})).toBe(false);
    expect(documentSharable({ visibility: 'private' })).toBe(false);
    expect(documentSharable({ visibility: 'internal' })).toBe(false);
    expect(documentSharable({ visibility: 'investor' })).toBe(true);
    expect(documentSharable({ visibility: 'Public' })).toBe(true);
    expect(documentSharable({ visibility: 'shared' })).toBe(true);
  });
});

describe('investor share crypto', () => {
  it('generates unique URL-safe tokens and stores only their hash', () => {
    const a = generateInvestorToken();
    const b = generateInvestorToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
    // Hash is deterministic and never equals the token itself.
    expect(hashInvestorToken(a)).toBe(hashInvestorToken(a));
    expect(hashInvestorToken(a)).not.toBe(a);
    expect(hashInvestorToken(a)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifies scrypt passwords and rejects wrong or malformed values', async () => {
    const stored = hashInvestorPassword('correct horse');
    expect(stored.startsWith('scrypt:')).toBe(true);
    expect(stored).not.toContain('correct horse');
    expect(verifyInvestorPassword('correct horse', stored)).toBe(true);
    expect(verifyInvestorPassword('wrong', stored)).toBe(false);
    expect(verifyInvestorPassword('correct horse', 'plain:abc')).toBe(false);
    expect(verifyInvestorPassword('correct horse', '')).toBe(false);
    expect(await verifyInvestorPasswordAsync('correct horse', stored)).toBe(true);
    expect(await verifyInvestorPasswordAsync('wrong', stored)).toBe(false);
    expect(await verifyInvestorPasswordAsync('correct horse', 'plain:abc')).toBe(false);
    expect(await verifyInvestorPasswordAsync('x'.repeat(1_025), stored)).toBe(false);
    // Per-link salt: same password never hashes identically twice.
    expect(hashInvestorPassword('correct horse')).not.toBe(stored);
  });
});
