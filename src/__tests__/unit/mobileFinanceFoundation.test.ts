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
    const screens = read('apps/expo-go/src/WorkspaceScreens.tsx');
    expect(screens).toContain('useEffect(() => { void load(); }, [load])');
    expect(screens).toContain('activeDebtCount');
    expect(screens).toContain('/api/mobile/${product}/summary');
    expect(screens).toContain('ErrorNotice');
  });

  it('keeps Finance and Business refresh sessions in their own encrypted storage keys', () => {
    const session = read('apps/expo-go/src/session.ts');
    const storage = read('apps/expo-go/src/secureStorage.ts');
    expect(session).toContain('`sfm-${config.product}-session`');
    expect(session).toContain('await this.acceptSession(session, epoch)');
    expect(storage).toContain('SecureStore.setItemAsync');
    expect(storage).toContain('WHEN_UNLOCKED_THIS_DEVICE_ONLY');
  });

  it('does not persist a Swift first-factor session before its native MFA proof', () => {
    const session = read('ios-native/TheSFM/Core/Auth/AuthSessionStore.swift');
    const router = read('ios-native/TheSFM/App/AppRouter.swift');
    const records = read('ios-native/TheSFM/Core/Networking/MobileRecordsView.swift');

    expect(session).toContain('private var mfaChallenge: PendingMfa?');
    expect(session).toContain('func sendMfaEmail() async');
    expect(session).toContain('func verifyMfa(code: String) async');
    expect(session).toContain('private func verifyTotp(pending: PendingMfa, code: String)');
    expect(session).toContain('try await assertSessionSecurity(verified.accessToken)');
    expect(session).toContain('func cancelMfa() async');
    expect(session.indexOf('try await assertSessionSecurity(verified.accessToken)')).toBeLessThan(session.indexOf('save(verified)'));
    expect(router).toContain('if authSession.pendingMfaMethod != nil');
    expect(records).toContain('.fullScreenCover(isPresented: Binding(');
  });

  it('derives Finance and Business native report PDFs from the protected record API without combining currencies', () => {
    const records = read('ios-native/TheSFM/Core/Networking/MobileRecordsView.swift');
    const dashboard = read('ios-native/TheSFM/Features/Dashboard/DashboardView.swift');
    const business = read('ios-native/TheSFM/Features/Business/BusinessHomeView.swift');

    expect(records).toContain('struct MobileReportsView: View');
    expect(records).toContain('/api/mobile/\\(product)/records/\\(resource)');
    expect(records).toContain('value.count == 3');
    expect(records).toContain('report.isPartial');
    expect(records).toContain('MobileReportPDF.create');
    expect(dashboard).toContain('MobileReportsView(product: "finance")');
    expect(business).toContain('MobileReportsView(product: "business")');
  });

  it('uses a bounded mobile request and distinguishes invalid credentials from temporary connection errors', () => {
    const session = read('apps/expo-go/src/session.ts');
    const ui = read('apps/expo-go/src/ui.tsx');
    expect(session).toContain('controller.abort(), 15_000');
    expect(session).toContain('INVALID_CREDENTIALS');
    expect(session).toContain('AUTH_UNAVAILABLE');
    expect(ui).toContain('البريد أو كلمة المرور غير صحيحة.');
  });
  it('keeps income attachments owner-scoped across Expo and SwiftUI without persisting signed URLs', () => {
    const expoRecords = read('apps/expo-go/src/RecordsScreen.tsx');
    const expoSession = read('apps/expo-go/src/session.ts');
    const swiftRecords = read('ios-native/TheSFM/Core/Networking/MobileRecordsView.swift');
    const api = read('ios-native/TheSFM/Core/Networking/APIClient.swift');

    expect(expoRecords).toContain('DocumentPicker.getDocumentAsync');
    expect(expoRecords).toContain('attachmentPath');
    expect(expoRecords).toContain('Linking.openURL(result.attachment.url)');
    expect(expoSession).toContain('init.body instanceof FormData');
    expect(expoSession).toContain('multipart boundary');
    expect(swiftRecords).toContain('.fileImporter(isPresented: $attachmentImporting');
    expect(swiftRecords).toContain('MobileAttachmentAccess');
    expect(swiftRecords).toContain('openURL(result.attachment.url)');
    expect(api).toContain('func upload(_ path: String, fields: [String: String], file: MultipartFile) async throws');
    expect(api).toContain('multipart/form-data; boundary=');
  });
});
