import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('THE SFM Investor iOS foundation', () => {
  it('defines a separate iPhone target, bundle identity, and shared scheme', () => {
    const project = read('ios-native/TheSFM.xcodeproj/project.pbxproj');
    const scheme = read('ios-native/TheSFM.xcodeproj/xcshareddata/xcschemes/TheSFMInvestor.xcscheme');

    expect(project).toContain('TheSFMInvestor */ = {');
    expect(project).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.thesfm.investor;');
    expect(project).toContain('PRODUCT_NAME = "THE SFM Investor";');
    expect(scheme).toContain('BlueprintName="TheSFMInvestor"');
  });

  it('uses a native RTL market directory and does not embed credentials', () => {
    const app = read('ios-native/TheSFM/Features/Investor/TheSFMInvestorApp.swift');
    const directory = read('ios-native/TheSFM/Features/Investor/InvestorMarketDirectory.swift');
    const view = read('ios-native/TheSFM/Features/Investor/InvestorDashboardView.swift');
    const expo = read('apps/expo-go/App.tsx');
    const android = read('apps/sfm-investor/android/app/src/main/java/com/thesfm/investor/MainActivity.kt');

    expect(app).toContain('@main');
    expect(app).toContain('.rightToLeft');
    expect(directory).toContain('api/markets');
    expect(directory).not.toContain('service_role');
    expect(view).toContain('NavigationStack');
    expect(view).toContain('List');
    expect(view).toContain('.searchable');
    expect(directory).toContain('limit", value: "60"');
    expect(view).toContain('Picker("فئة الأصل"');
    expect(expo).toContain('ابحث بالاسم أو الرمز');
    expect(expo).toContain('FilterPill');
    expect(android).toContain('OutlinedTextField');
    expect(android).toContain('FilterChip');
    expect(android).toContain('إعادة المحاولة');
  });
});

describe('THE SFM Business native foundation', () => {
  it('defines independent iPhone and Android/Huawei identities', () => {
    const project = read('ios-native/TheSFM.xcodeproj/project.pbxproj');
    const android = read('apps/sfm-business/android/app/build.gradle');
    const app = read('apps/sfm-business/android/app/src/main/java/com/thesfm/business/MainActivity.kt');

    expect(project).toContain('TheSFMBusiness */ = {');
    expect(project).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.thesfm.business;');
    expect(android).toContain("applicationId 'com.thesfm.business'");
    expect(android).toContain("huawei { dimension 'distribution' }");
    expect(android).not.toContain('com.google.gms.google-services');
    expect(app).toContain('LayoutDirection.Rtl');
    expect(app).toContain('LazyColumn');
    expect(app).toContain('BusinessSummaryClient.fetch');
    expect(app).toContain('SecureSessionStore');
    expect(app).toContain('تسجيل الخروج');
  });
});

describe('THE SFM TV Apple TV foundation', () => {
  it('defines a separate tvOS target alongside Android, Huawei, and LG TV packaging', () => {
    const project = read('ios-native/TheSFM.xcodeproj/project.pbxproj');
    const view = read('ios-native/TheSFM/Features/TV/MarketsTVHomeView.swift');
    const webos = read('apps/markets-tv/webos/appinfo.json');

    expect(project).toContain('TheSFMtv */ = {');
    expect(project).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.thesfm.tv;');
    expect(project).toContain('SUPPORTED_PLATFORMS = "appletvos appletvsimulator";');
    expect(view).toContain('.buttonStyle(.card)');
    expect(view).toContain('selectedChannel');
    expect(view).toContain('api/tv/snapshot');
    expect(view).toContain('MarketsTVSnapshotStore');
    expect(webos).toContain('com.thesfm.marketstv');
  });
});
