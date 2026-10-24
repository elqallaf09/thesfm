import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('native Investor public-source feeds', () => {
  it('keeps Android news, calendar, and Shariah views bound to the existing website routes', () => {
    const activity = read('apps/native-shared/android/src/main/java/com/thesfm/mobile/MobileActivity.kt');

    expect(activity).toContain('loadInvestorFeed(kind: String, language: String, nextPage: Int = 1)');
    expect(activity).toContain('/api/market-news?language=${URLEncoder.encode(language, "UTF-8")}&page=$nextPage&pageSize=30');
    expect(activity).toContain('/api/economic-calendar?timezone=Asia%2FKuwait');
    expect(activity).toContain('/api/sharia-stocks/screening');
    expect(activity).toContain('openInvestorSource(source)');
  });

  it('keeps SwiftUI feeds native, source-linked, and without fabricated fallback rows', () => {
    const store = read('ios-native/TheSFM/Features/Investor/InvestorMarketDirectory.swift');
    const dashboard = read('ios-native/TheSFM/Features/Investor/InvestorDashboardView.swift');

    expect(store).toContain('enum InvestorPublicFeed');
    expect(store).toContain('endpoint = "api/market-news"');
    expect(store).toContain('URLQueryItem(name: "language", value: language)');
    expect(store).toContain('endpoint = "api/economic-calendar"');
    expect(store).toContain('URLQueryItem(name: "timezone", value: "Asia/Kuwait")');
    expect(store).toContain('api/sharia-stocks/screening');
    expect(dashboard).toContain('InvestorPublicFeedSection');
    expect(dashboard).toContain('url.scheme == "https"');
    expect(dashboard).toContain('never invents fallback items');
  });
});
