import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('THE SFM Finance iOS foundation', () => {
  it('uses the Finance store identity rather than the former generic shell', () => {
    const project = read('ios-native/TheSFM.xcodeproj/project.pbxproj');

    expect(project).toContain('INFOPLIST_KEY_CFBundleDisplayName = "THE SFM Finance"');
    expect(project).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.thesfm.finance');
    expect(project).toContain('INFOPLIST_KEY_SFM_SUPABASE_URL = ""');
  });

  it('replaces fake access with configured Supabase email authentication and Keychain storage', () => {
    const session = read('ios-native/TheSFM/Core/Auth/AuthSessionStore.swift');
    const login = read('ios-native/TheSFM/Features/Login/LoginView.swift');

    expect(session).toContain('requestSession(grantType: String, body: [String: String])');
    expect(session).toContain('grantType: "refresh_token"');
    expect(session).toContain('kSecAttrAccessibleWhenUnlockedThisDeviceOnly');
    expect(session).toContain('return SecItemAdd(query as CFDictionary, nil) == errSecSuccess');
    expect(session).not.toContain('signInWithPlaceholderSession');
    expect(login).toContain('await authSession.signIn(email: usernameOrEmail, password: password)');
    expect(login).not.toContain('دخول تجريبي للواجهة');
  });

  it('loads its dashboard summary from the protected mobile endpoint', () => {
    const dashboard = read('ios-native/TheSFM/Features/Dashboard/DashboardView.swift');

    expect(dashboard).toContain('/api/mobile/finance/summary');
    expect(dashboard).toContain('APIClient.authorized(accessToken: token)');
    expect(dashboard).toContain('يعرض التطبيق ملخصًا من نفس القواعد المستخدمة في لوحة الموقع');
  });

  it('locks a restored session and requires device authentication before showing finance data', () => {
    const session = read('ios-native/TheSFM/Core/Auth/AuthSessionStore.swift');
    const router = read('ios-native/TheSFM/App/AppRouter.swift');
    const app = read('ios-native/TheSFM/App/TheSFMApp.swift');

    expect(session).toContain('context.evaluatePolicy');
    expect(session).toContain('isDeviceLocked = true');
    expect(router).toContain('if authSession.isDeviceLocked');
    expect(app).toContain('if phase != .active');
  });

  it('refreshes the Expo Go summary automatically and keeps the finance state transparent', () => {
    const expo = read('apps/expo-go/App.tsx');

    expect(expo).toContain('if (session) void loadSummary();');
    expect(expo).toContain('activeDebtCount.toLocaleString');
    expect(expo).toContain('آخر تحديث:');
    expect(expo).toContain('تعذر تحميل ملخصك. تحقق من الشبكة ثم أعد المحاولة.');
  });

  it('keeps Finance and Business refresh sessions in their own encrypted storage keys', () => {
    const expo = read('apps/expo-go/App.tsx');

    expect(expo).toContain("const FINANCE_SESSION_KEY = 'sfm-finance-session'");
    expect(expo).toContain("const BUSINESS_SESSION_KEY = 'sfm-business-session'");
    expect(expo).toContain('refreshSession(session, BUSINESS_SESSION_KEY)');
    expect(expo).toContain('SecureStore.setItemAsync(sessionKey, JSON.stringify(refreshed))');
  });

  it('uses a bounded mobile request and distinguishes invalid credentials from temporary connection errors', () => {
    const expo = read('apps/expo-go/App.tsx');

    expect(expo).toContain('async function fetchWithTimeout');
    expect(expo).toContain('controller.abort(), 15_000');
    expect(expo).toContain('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
  });
});
