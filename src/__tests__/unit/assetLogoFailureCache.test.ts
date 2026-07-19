import { beforeEach, describe, expect, it } from 'vitest';
import {
  ASSET_LOGO_FAILURE_TTL_MS,
  cacheAssetLogoFailure,
  isAssetLogoFailureCached,
  resetAssetLogoFailureCache,
} from '@/lib/assetLogoFailureCache';

const MISSING_LOGO = 'https://financialmodelingprep.com/image-stock/ZZZZ.png';
const VALID_LOGO = 'https://cdn.simpleicons.org/nvidia';

describe('asset logo negative lookup cache', () => {
  beforeEach(() => resetAssetLogoFailureCache());

  it('caches a failed URL without suppressing unrelated valid logos', () => {
    cacheAssetLogoFailure(MISSING_LOGO, 1_000);

    expect(isAssetLogoFailureCached(MISSING_LOGO, 1_001)).toBe(true);
    expect(isAssetLogoFailureCached(VALID_LOGO, 1_001)).toBe(false);
  });

  it('expires failures so a repaired upstream logo can be retried later', () => {
    cacheAssetLogoFailure(MISSING_LOGO, 2_000);

    expect(isAssetLogoFailureCached(MISSING_LOGO, 2_000 + ASSET_LOGO_FAILURE_TTL_MS - 1)).toBe(true);
    expect(isAssetLogoFailureCached(MISSING_LOGO, 2_000 + ASSET_LOGO_FAILURE_TTL_MS)).toBe(false);
  });

  it('ignores empty URLs', () => {
    cacheAssetLogoFailure('   ', 3_000);
    expect(isAssetLogoFailureCached('   ', 3_001)).toBe(false);
  });
});
