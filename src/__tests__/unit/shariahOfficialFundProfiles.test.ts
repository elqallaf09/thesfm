import { describe, expect, it } from 'vitest';
import {
  officialFundEvidenceProfile,
  officialFundEvidenceSymbols,
  validateOfficialFundPage,
} from '@/lib/market/shariahOfficialFundProfiles';

describe('official conventional fund evidence profiles', () => {
  it('covers the conventional equity and physical-metal funds under review', () => {
    expect(officialFundEvidenceSymbols().sort()).toEqual(['GLD', 'QQQ', 'SLV', 'VOO', 'VTI']);
  });

  it('does not treat published Shariah funds as conventional fund profiles', () => {
    for (const symbol of ['HLAL', 'SPUS', 'UMMA', 'SPRE', 'SPSK']) {
      expect(officialFundEvidenceProfile(symbol)).toBeNull();
    }
  });

  it('requires exact official HTTPS hosts and exact fund identity', () => {
    const qqq = officialFundEvidenceProfile('QQQ')!;
    const text = `${'x'.repeat(600)} Invesco QQQ tracks the Nasdaq-100 Index.`;
    expect(validateOfficialFundPage(qqq, qqq.officialUrl, text)).toMatchObject({
      evidenceType: 'equity_index_fund',
      provider: 'Invesco',
      structuralVerified: false,
    });
    expect(() => validateOfficialFundPage(qqq, 'https://evil.example/qqq', text)).toThrow('fund_official_profile_redirected');
    expect(() => validateOfficialFundPage(qqq, qqq.officialUrl, `${'x'.repeat(600)} unrelated fund`)).toThrow('fund_official_profile_identity_mismatch');
  });

  it('recognizes source-backed physical metal structure without calling it Shariah certification', () => {
    const gld = officialFundEvidenceProfile('GLD')!;
    const gldText = `${'x'.repeat(600)} SPDR Gold Shares GLD is backed by a physical asset. Gold Custodians include named banks.`;
    expect(validateOfficialFundPage(gld, gld.officialUrl, gldText)).toMatchObject({
      evidenceType: 'physical_metal_trust',
      structuralVerified: true,
    });

    const slv = officialFundEvidenceProfile('SLV')!;
    const slvText = `${'x'.repeat(600)} iShares Silver Trust SLV seeks exposure to silver bullion. Ounces in Trust are published daily.`;
    expect(validateOfficialFundPage(slv, slv.officialUrl, slvText)).toMatchObject({
      evidenceType: 'physical_metal_trust',
      structuralVerified: true,
    });
  });
});
