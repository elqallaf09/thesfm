import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const { requiresMobilePreview } = createRequire(import.meta.url)('../../../.github/scripts/mobile-preview-policy.cjs');

describe('authenticated Preview CI policy', () => {
  it('treats only unavailable integration outcomes as not applicable', () => {
    expect(workflow).toContain("['skipped', 'cancelled'].includes(check.conclusion)");
    expect(workflow).toContain("check.status === 'completed' && check.conclusion !== 'success'");
    expect(workflow).toContain('core.setFailed(`Exact-SHA Supabase Preview check entered');
  });
  it('requires account validation for all mobile clients and their backend, including renamed files', () => {
    for (const filename of ['apps/expo-go/App.tsx', 'apps/native-shared/android/Session.kt', 'apps/sfm-finance/android/app/build.gradle', 'apps/sfm-investor/android/app/build.gradle', 'apps/sfm-business/android/app/build.gradle', 'ios-native/TheSFM/App.swift', 'src/app/api/mobile/account/route.ts', 'src/lib/server/mobileAccess.ts', 'src/lib/mobile/resourceContract.ts']) {
      expect(requiresMobilePreview([{ filename }])).toBe(true);
      expect(requiresMobilePreview([{ filename: 'archive/old.ts', previous_filename: filename }])).toBe(true);
    }
    expect(requiresMobilePreview([{ filename: 'docs/mobile-feature-parity-plan.md' }, { filename: 'src/lib/trader/scannerService.ts' }])).toBe(false);
    expect(workflow).toContain('if (mobilePreviewRequired)');
  });
});
