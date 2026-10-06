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

    expect(app).toContain('@main');
    expect(app).toContain('.rightToLeft');
    expect(directory).toContain('api/markets');
    expect(directory).not.toContain('service_role');
    expect(view).toContain('NavigationStack');
    expect(view).toContain('List');
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
    expect(webos).toContain('com.thesfm.marketstv');
  });
});
