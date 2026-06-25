import { describe, expect, it } from 'vitest';
import {
  formatCompanySocialHandle,
  isValidCompanySocialInput,
  normalizeCompanySocialUrl,
} from '@/lib/companySocialLinks';

describe('company social links', () => {
  it('normalizes X handles without accepting uploaded logo filenames', () => {
    expect(normalizeCompanySocialUrl('@the_sfm', 'twitter')).toBe('https://x.com/the_sfm');
    expect(formatCompanySocialHandle('https://twitter.com/the_sfm', 'twitter')).toBe('@the_sfm');
    expect(normalizeCompanySocialUrl('@logo-1782251683733-company.webp', 'twitter')).toBeNull();
    expect(isValidCompanySocialInput('@logo-1782251683733-company.webp', 'twitter')).toBe(false);
  });

  it('rejects image URLs and non-platform URLs for social fields', () => {
    expect(normalizeCompanySocialUrl('https://cdn.example.com/logo.webp', 'twitter')).toBeNull();
    expect(normalizeCompanySocialUrl('https://example.com/company', 'linkedin')).toBeNull();
    expect(normalizeCompanySocialUrl('https://www.instagram.com/the.sfm', 'instagram')).toBe('https://www.instagram.com/the.sfm');
    expect(normalizeCompanySocialUrl('https://www.linkedin.com/company/the-sfm', 'linkedin')).toBe('https://www.linkedin.com/company/the-sfm');
  });
});
