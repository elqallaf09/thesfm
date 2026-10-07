import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('THE SFM Finance Android foundation', () => {
  const root = 'apps/sfm-finance/android';

  it('defines separate Play and Huawei distribution variants without Google services in the Huawei base', () => {
    const gradle = read(`${root}/app/build.gradle`);

    expect(gradle).toContain("play { dimension 'distribution' }");
    expect(gradle).toContain("huawei { dimension 'distribution' }");
    expect(gradle).toContain("applicationId 'com.thesfm.finance'");
    expect(gradle).not.toContain('com.google.gms.google-services');
  });

  it('uses native Compose UI and Android Keystore-encrypted session storage', () => {
    const activity = read(`${root}/app/src/main/java/com/thesfm/finance/MainActivity.kt`);
    const storage = read(`${root}/app/src/main/java/com/thesfm/finance/SecureSessionStore.kt`);

    expect(activity).toContain('MaterialTheme');
    expect(activity).toContain('LayoutDirection.Rtl');
    expect(storage).toContain('AndroidKeyStore');
    expect(storage).toContain('AES/GCM/NoPadding');
    expect(storage).toContain('preferences.edit().putString(SESSION_KEY, encrypt(json)).commit()');
  });

  it('requests the protected financial summary instead of shipping account rows into the app', () => {
    const activity = read(`${root}/app/src/main/java/com/thesfm/finance/MainActivity.kt`);
    const summary = read(`${root}/app/src/main/java/com/thesfm/finance/FinanceSummaryClient.kt`);

    expect(activity).toContain('FinanceSummaryClient.fetch(activeSession.accessToken)');
    expect(summary).toContain('/api/mobile/finance/summary');
    expect(summary).toContain('Authorization", "Bearer $accessToken');
  });

  it('requires the device credential again after the app moves to the background', () => {
    const activity = read(`${root}/app/src/main/java/com/thesfm/finance/MainActivity.kt`);

    expect(activity).toContain('keyguard.createConfirmDeviceCredentialIntent');
    expect(activity).toContain('event == Lifecycle.Event.ON_STOP');
    expect(activity).toContain('if (isDeviceLocked)');
  });

  it('refreshes an expired access token using the encrypted refresh token instead of treating it as a new login', () => {
    const activity = read(`${root}/app/src/main/java/com/thesfm/finance/MainActivity.kt`);
    const auth = read(`${root}/app/src/main/java/com/thesfm/finance/SupabaseAuthClient.kt`);

    expect(activity).toContain('sessionNeedsRefresh(savedSession)');
    expect(activity).toContain('SupabaseAuthClient.refresh(activeSession.refreshToken)');
    expect(auth).toContain('grantType = "refresh_token"');
    expect(auth).toContain('put("refresh_token", refreshToken)');
  });

  it('keeps the existing SFM TV host available for a no-GMS Huawei build', () => {
    const tvGradle = read('apps/markets-tv/android/app/build.gradle');

    expect(tvGradle).toContain("play { dimension 'distribution' }");
    expect(tvGradle).toContain("huawei { dimension 'distribution' }");
    expect(tvGradle).not.toContain('com.google.gms.google-services');
  });

  it('keeps the Investor app as a separate native Android and Huawei product', () => {
    const investorGradle = read('apps/sfm-investor/android/app/build.gradle');
    const activity = read('apps/sfm-investor/android/app/src/main/java/com/thesfm/investor/MainActivity.kt');
    const markets = read('apps/sfm-investor/android/app/src/main/java/com/thesfm/investor/MarketDirectoryClient.kt');

    expect(investorGradle).toContain("applicationId 'com.thesfm.investor'");
    expect(investorGradle).toContain("huawei { dimension 'distribution' }");
    expect(investorGradle).not.toContain('com.google.gms.google-services');
    expect(activity).toContain('LayoutDirection.Rtl');
    expect(markets).toContain('/api/markets?limit=60&quality=complete');
  });
});
