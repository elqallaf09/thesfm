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
    const activity = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt');
    const storage = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileSession.kt');

    expect(activity).toContain('MaterialTheme');
    expect(activity).toContain('LayoutDirection.Rtl');
    expect(storage).toContain('AndroidKeyStore');
    expect(storage).toContain('AES/GCM/NoPadding');
    expect(storage).toContain('putString("encrypted-session", "$iv:$encrypted").commit()');
  });

  it('requests the protected financial summary and product resource manifest', () => {
    const activity = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt');
    const summary = read(`${root}/app/src/main/java/com/thesfm/finance/FinanceSummaryClient.kt`);

    expect(activity).toContain('/api/mobile/$productId/summary');
    expect(activity).toContain('/api/mobile/$productId/manifest');
    expect(summary).toContain('/api/mobile/finance/summary');
    expect(summary).toContain('Authorization", "Bearer $accessToken');
  });

  it('requires the device credential again after the app moves to the background', () => {
    const activity = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt');

    expect(activity).toContain('createConfirmDeviceCredentialIntent');
    expect(activity).toContain('override fun onStop()');
    expect(activity).toContain('locked.value && signedIn.value');
  });

  it('refreshes an expired access token using the encrypted refresh token instead of treating it as a new login', () => {
    const auth = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileSession.kt');

    expect(auth).toContain('current.expiresAtMillis > System.currentTimeMillis() + 60000');
    expect(auth).toContain('save(it, epoch)');
    expect(auth).toContain('token("refresh_token"');
    expect(auth).toContain('put("refresh_token", current.refreshToken)');
  });

  it('keeps first-factor credentials in memory until native MFA is verified', () => {
    const activity = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt');
    const auth = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileSession.kt');

    expect(auth).toContain('class PendingNativeMfa');
    expect(auth).toContain('fun sendMfaEmail(pending: PendingNativeMfa)');
    expect(auth).toContain('fun verifyMfa(pending: PendingNativeMfa, code: String)');
    expect(auth).toContain('assertSessionSecurity(verified, pending.epoch)');
    expect(auth).toContain('save(verified, pending.epoch)');
    expect(auth).toContain('fun cancelMfa(pending: PendingNativeMfa)');
    expect(auth.indexOf('assertSessionSecurity(verified, pending.epoch)')).toBeLessThan(auth.indexOf('save(verified, pending.epoch)'));
    expect(activity).toContain('pendingMfa.value != null');
    expect(activity).toContain('auth.sendMfaEmail(pending)');
    expect(activity).toContain('auth.verifyMfa(pending, mfaCode)');
    expect(activity).toContain('auth.cancelMfa(pending)');
  });

  it('derives Finance and Business report PDFs from protected records and uses user-selected storage', () => {
    const activity = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt');

    expect(activity).toContain('nativeMonthlyReport(auth, productId, reportPeriod.value)');
    expect(activity).toContain('records/$resource?limit=100');
    expect(activity).toContain('pages < 8');
    expect(activity).toContain('PdfDocument()');
    expect(activity).toContain('ActivityResultContracts.CreateDocument("application/pdf")');
    expect(activity).toContain('pendingReportPdf = null');
  });

  it('uses a protected owner-scoped income attachment flow in Compose', () => {
    const activity = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt');
    const auth = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileSession.kt');

    expect(activity).toContain('ActivityResultContracts.OpenDocument()');
    expect(activity).toContain('uploadIncomeAttachment(recordId, uri)');
    expect(activity).toContain('/api/mobile/finance/records/income/attachment?recordId=');
    expect(activity).toContain('Intent(Intent.ACTION_VIEW, Uri.parse(url))');
    expect(auth).toContain('fun uploadIncomeAttachment(recordId: String, name: String, mimeType: String, bytes: ByteArray)');
    expect(auth).toContain('multipartRequest("/api/mobile/$product/records/income/attachment"');
    expect(auth).toContain('multipart/form-data; boundary=$boundary');
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
    expect(activity).toContain('MobileActivity');
    expect(markets).toContain('/api/markets?limit=60&quality=complete');
  });
});
