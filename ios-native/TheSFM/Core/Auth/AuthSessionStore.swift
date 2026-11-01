import Combine
import Foundation
import LocalAuthentication
import Security
import SwiftUI
import UIKit

enum NativeMfaMethod: String {
    case totp
    case email
}

@MainActor
final class AuthSessionStore: ObservableObject {
    @Published private(set) var isAuthenticated = false
    @Published private(set) var isAuthenticating = false
    @Published private(set) var isDeviceLocked = false
    @Published private(set) var accessToken: String?
    @Published private(set) var errorMessage: String?
    /** The password-only token stays in memory; only the method is observable. */
    @Published private(set) var pendingMfaMethod: NativeMfaMethod?

    private let storage: SecureSessionStorage
    private let applicationName: String
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    private var sessionGeneration = UUID()
    private var refreshTask: Task<StoredSession, Error>?
    private var mfaChallenge: PendingMfa?
    var identityRevision: UUID { sessionGeneration }

    init(applicationName: String = "THE SFM Finance", keychainService: String = "com.thesfm.finance") {
        self.applicationName = applicationName
        self.storage = SecureSessionStorage(service: keychainService)
        restoreSession()
    }

    func restoreSession() {
        mfaChallenge = nil
        pendingMfaMethod = nil
        guard let storedSession = storage.load() else {
            storage.remove()
            isAuthenticated = false
            accessToken = nil
            return
        }

        guard storedSession.expiresAt > Date().addingTimeInterval(60) else {
            accessToken = storedSession.accessToken
            isAuthenticated = true
            isDeviceLocked = true
            Task { await refresh(storedSession) }
            return
        }

        accessToken = storedSession.accessToken
        isAuthenticated = true
        isDeviceLocked = true
    }

    func signIn(email: String, password: String) async {
        let normalizedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedEmail.isEmpty, !password.isEmpty else {
            errorMessage = "أدخل البريد الإلكتروني وكلمة المرور."
            return
        }
        guard SupabaseConfig.isConfigured else {
            errorMessage = "لم تُضبط خدمة تسجيل الدخول لهذا الإصدار بعد."
            return
        }

        resetForCredentialChange()
        let generation = sessionGeneration

        isAuthenticating = true
        errorMessage = nil
        defer { isAuthenticating = false }

        do {
            let session = try await requestSession(
                grantType: "password",
                body: ["email": normalizedEmail, "password": password]
            )
            guard generation == sessionGeneration else { return }
            do {
                try await assertSessionSecurity(session.accessToken)
            } catch AuthenticationError.mfaRequired(let method) {
                beginMfa(method: method, session: session, generation: generation)
                return
            }
            guard generation == sessionGeneration else { return }
            save(session)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Sends (or resends) the account's existing email-MFA code. The challenge
    /// and the first-factor session are kept in memory only.
    func sendMfaEmail() async {
        guard let pending = validPendingMfa(), pending.method == .email else {
            errorMessage = AuthenticationError.challengeExpired.errorDescription
            return
        }
        isAuthenticating = true
        errorMessage = nil
        defer { isAuthenticating = false }
        do {
            let endpoint = SupabaseConfig.apiBaseURL
                .appendingPathComponent("api")
                .appendingPathComponent("auth")
                .appendingPathComponent("mfa")
                .appendingPathComponent("mobile-email")
            let data = try await mfaRequest(endpoint, method: "POST", body: ["action": "start"], accessToken: pending.session.accessToken, includePublicKey: false)
            let response = try decoder.decode(EmailMfaStartResponse.self, from: data)
            guard !response.challenge.isEmpty, isCurrent(pending) else { throw AuthenticationError.challengeExpired }
            var updated = pending
            updated.emailChallenge = response.challenge
            mfaChallenge = updated
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Verifies the website MFA factor. A resulting session is rechecked by the
    /// server before it is written to Keychain.
    func verifyMfa(code: String) async {
        guard code.range(of: "^[0-9]{6}$", options: .regularExpression) != nil else {
            errorMessage = AuthenticationError.invalidCode.errorDescription
            return
        }
        guard let pending = validPendingMfa() else {
            errorMessage = AuthenticationError.challengeExpired.errorDescription
            return
        }
        isAuthenticating = true
        errorMessage = nil
        defer { isAuthenticating = false }
        do {
            let verified: StoredSession
            if pending.method == .totp {
                verified = try await verifyTotp(pending: pending, code: code)
            } else {
                guard let challenge = pending.emailChallenge else { throw AuthenticationError.challengeRequired }
                let endpoint = SupabaseConfig.apiBaseURL
                    .appendingPathComponent("api")
                    .appendingPathComponent("auth")
                    .appendingPathComponent("mfa")
                    .appendingPathComponent("mobile-email")
                let data = try await mfaRequest(endpoint, method: "POST", body: ["action": "verify", "challenge": challenge, "code": code], accessToken: pending.session.accessToken, includePublicKey: false)
                verified = try session(from: data)
            }
            guard isCurrent(pending) else { throw AuthenticationError.challengeExpired }
            do {
                try await assertSessionSecurity(verified.accessToken)
            } catch AuthenticationError.mfaRequired(_) {
                throw AuthenticationError.mfaNotVerified
            }
            guard isCurrent(pending) else { throw AuthenticationError.challengeExpired }
            mfaChallenge = nil
            pendingMfaMethod = nil
            save(verified)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Removes local state before best-effort first-factor logout. This cannot
    /// revoke a previously persisted session belonging to another account.
    func cancelMfa() async {
        guard let pending = mfaChallenge else { return }
        discardPendingMfa(pending)
        guard let baseURL = SupabaseConfig.url, let anonKey = SupabaseConfig.anonKey else { return }
        let endpoint = baseURL
            .appendingPathComponent("auth")
            .appendingPathComponent("v1")
            .appendingPathComponent("logout")
            .appending(queryItems: [URLQueryItem(name: "scope", value: "local")])
        _ = try? await mfaRequest(endpoint, method: "POST", body: nil, accessToken: pending.session.accessToken, includePublicKey: true, publicKey: anonKey)
    }

    func signOut() {
        sessionGeneration = UUID()
        refreshTask?.cancel()
        refreshTask = nil
        mfaChallenge = nil
        pendingMfaMethod = nil
        storage.remove()
        isAuthenticated = false
        accessToken = nil
        isDeviceLocked = false
        errorMessage = nil
    }

    func lock() {
        guard isAuthenticated, pendingMfaMethod == nil else { return }
        isDeviceLocked = true
        errorMessage = nil
    }

    func unlock() async {
        guard isAuthenticated, pendingMfaMethod == nil else { return }

        let context = LAContext()
        var policyError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &policyError) else {
            errorMessage = "فعّل رمز مرور الجهاز لاستخدام القفل الآمن."
            return
        }

        do {
            try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: "تأكيد هويتك لعرض بياناتك المحمية في \(applicationName)."
            )
            isDeviceLocked = false
            errorMessage = nil
        } catch {
            errorMessage = "تعذر تأكيد هويتك. حاول مرة أخرى."
        }
    }

    private func refresh(_ storedSession: StoredSession) async {
        let generation = sessionGeneration
        do {
            if refreshTask == nil {
                refreshTask = Task { try await self.requestSession(grantType: "refresh_token", body: ["refresh_token": storedSession.refreshToken]) }
            }
            guard let task = refreshTask else { return }
            let session = try await task.value
            guard generation == sessionGeneration else { return }
            refreshTask = nil
            do {
                try await assertSessionSecurity(session.accessToken)
            } catch AuthenticationError.mfaRequired(let method) {
                beginMfa(method: method, session: session, generation: generation)
                return
            }
            guard generation == sessionGeneration else { return }
            save(session)
        } catch {
            guard generation == sessionGeneration else { return }
            refreshTask = nil
            if let error = error as? AuthenticationError, case .invalidCredentials = error { signOut() }
            else { errorMessage = "تعذر تحديث الجلسة الآن. تحقق من الاتصال وأعد المحاولة." }
        }
    }

    func validAccessToken() async -> String? {
        let generation = sessionGeneration
        guard pendingMfaMethod == nil, let stored = storage.load(), isAuthenticated else { return nil }
        if stored.expiresAt <= Date().addingTimeInterval(60) { await refresh(stored) }
        guard generation == sessionGeneration, pendingMfaMethod == nil, let active = storage.load(), isAuthenticated, active.expiresAt > Date() else { return nil }
        do { try await assertSessionSecurity(active.accessToken) }
        catch AuthenticationError.mfaRequired(let method) {
            beginMfa(method: method, session: active, generation: generation)
            return nil
        }
        catch { errorMessage = error.localizedDescription; return nil }
        return active.accessToken
    }

    private func resetForCredentialChange() {
        sessionGeneration = UUID()
        refreshTask?.cancel()
        refreshTask = nil
        mfaChallenge = nil
        pendingMfaMethod = nil
        storage.remove()
        isAuthenticated = false
        accessToken = nil
        isDeviceLocked = false
    }

    private func beginMfa(method: NativeMfaMethod, session: StoredSession, generation: UUID) {
        guard generation == sessionGeneration else { return }
        // The candidate session is never stored, published, or passed to views.
        storage.remove()
        isAuthenticated = false
        accessToken = nil
        isDeviceLocked = false
        mfaChallenge = PendingMfa(method: method, session: session, generation: generation)
        pendingMfaMethod = method
        errorMessage = nil
    }

    private func discardPendingMfa(_ pending: PendingMfa) {
        guard mfaChallenge?.id == pending.id else { return }
        sessionGeneration = UUID()
        refreshTask?.cancel()
        refreshTask = nil
        mfaChallenge = nil
        pendingMfaMethod = nil
        storage.remove()
        isAuthenticated = false
        accessToken = nil
        isDeviceLocked = false
        errorMessage = nil
    }

    private func validPendingMfa() -> PendingMfa? {
        guard let pending = mfaChallenge, isCurrent(pending) else {
            mfaChallenge = nil
            pendingMfaMethod = nil
            return nil
        }
        return pending
    }

    private func isCurrent(_ pending: PendingMfa) -> Bool {
        pending.generation == sessionGeneration && mfaChallenge?.id == pending.id && pending.expiresAt > Date()
    }

    private func verifyTotp(pending: PendingMfa, code: String) async throws -> StoredSession {
        guard let baseURL = SupabaseConfig.url, let anonKey = SupabaseConfig.anonKey else { throw AuthenticationError.missingConfiguration }
        let userEndpoint = baseURL.appendingPathComponent("auth").appendingPathComponent("v1").appendingPathComponent("user")
        let userData = try await mfaRequest(userEndpoint, method: "GET", body: nil, accessToken: pending.session.accessToken, includePublicKey: true, publicKey: anonKey)
        let account = try decoder.decode(SupabaseMfaAccount.self, from: userData)
        guard let factor = account.factors.first(where: { $0.factorType == "totp" && $0.status == "verified" }), isCurrent(pending) else { throw AuthenticationError.challengeExpired }
        let factorEndpoint = baseURL.appendingPathComponent("auth").appendingPathComponent("v1").appendingPathComponent("factors").appendingPathComponent(factor.id)
        let challengeData = try await mfaRequest(factorEndpoint.appendingPathComponent("challenge"), method: "POST", body: [:], accessToken: pending.session.accessToken, includePublicKey: true, publicKey: anonKey)
        let challenge = try decoder.decode(SupabaseMfaChallenge.self, from: challengeData)
        guard !challenge.id.isEmpty, isCurrent(pending) else { throw AuthenticationError.challengeExpired }
        let verified = try await mfaRequest(factorEndpoint.appendingPathComponent("verify"), method: "POST", body: ["challenge_id": challenge.id, "code": code], accessToken: pending.session.accessToken, includePublicKey: true, publicKey: anonKey)
        return try session(from: verified)
    }

    private func assertSessionSecurity(_ token: String) async throws {
        let endpoint = SupabaseConfig.apiBaseURL.appendingPathComponent("api/mobile/session")
        guard endpoint.scheme == "https" else { throw AuthenticationError.unavailable }
        var request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthenticationError.unavailable }
        if http.statusCode == 403,
           let result = try? decoder.decode(SessionSecurityResponse.self, from: data),
           result.code == "MFA_REQUIRED",
           let method = result.mfaType.flatMap(NativeMfaMethod.init(rawValue:)) {
            throw AuthenticationError.mfaRequired(method)
        }
        guard 200..<300 ~= http.statusCode,
              (try? decoder.decode(SessionSecurityResponse.self, from: data))?.ok == true else {
            throw http.statusCode == 401 ? AuthenticationError.invalidCredentials : AuthenticationError.unavailable
        }
    }

    private func requestSession(grantType: String, body: [String: String]) async throws -> StoredSession {
        guard let baseURL = SupabaseConfig.url, let anonKey = SupabaseConfig.anonKey else {
            throw AuthenticationError.missingConfiguration
        }

        let endpoint = baseURL
            .appendingPathComponent("auth")
            .appendingPathComponent("v1")
            .appendingPathComponent("token")
            .appending(queryItems: [URLQueryItem(name: "grant_type", value: grantType)])
        guard endpoint.scheme == "https" else { throw AuthenticationError.unavailable }

        var request = URLRequest(url: endpoint)
        request.timeoutInterval = 15
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthenticationError.unavailable
        }
        guard 200..<300 ~= httpResponse.statusCode else {
            throw [400, 401, 403].contains(httpResponse.statusCode) ? AuthenticationError.invalidCredentials : AuthenticationError.unavailable
        }

        let responseBody = try decoder.decode(SupabaseSessionResponse.self, from: data)
        return StoredSession(
            accessToken: responseBody.accessToken,
            refreshToken: responseBody.refreshToken,
            expiresAt: Date().addingTimeInterval(TimeInterval(responseBody.expiresIn))
        )
    }

    private func session(from data: Data) throws -> StoredSession {
        let response = try decoder.decode(SupabaseSessionResponse.self, from: data)
        guard !response.accessToken.isEmpty, !response.refreshToken.isEmpty, response.expiresIn > 0 else { throw AuthenticationError.unavailable }
        return StoredSession(accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAt: Date().addingTimeInterval(TimeInterval(response.expiresIn)))
    }

    private func mfaRequest(_ endpoint: URL, method: String, body: [String: Any]?, accessToken: String, includePublicKey: Bool, publicKey: String? = nil) async throws -> Data {
        guard endpoint.scheme == "https" else { throw AuthenticationError.unavailable }
        var request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        if includePublicKey {
            guard let publicKey else { throw AuthenticationError.missingConfiguration }
            request.setValue(publicKey, forHTTPHeaderField: "apikey")
        }
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AuthenticationError.unavailable }
        guard 200..<300 ~= http.statusCode else { throw mfaFailure(status: http.statusCode, data: data) }
        return data
    }

    private func mfaFailure(status: Int, data: Data) -> AuthenticationError {
        let failure = try? decoder.decode(MfaFailureResponse.self, from: data)
        switch failure?.code {
        case "INVALID_CODE", "challenge_failed": return .invalidCode
        case "CHALLENGE_EXPIRED", "CHALLENGE_REQUIRED": return .challengeExpired
        case "MFA_REQUIRED": return .mfaNotVerified
        default: return [400, 401, 403].contains(status) ? .invalidCredentials : .unavailable
        }
    }

    private func save(_ session: StoredSession) {
        guard pendingMfaMethod == nil else { return }
        guard let data = try? encoder.encode(session) else {
            errorMessage = "تعذر حفظ جلسة تسجيل الدخول بأمان."
            return
        }

        guard storage.save(data) else {
            errorMessage = "تعذر حفظ جلسة تسجيل الدخول بأمان."
            return
        }
        accessToken = session.accessToken
        isAuthenticated = true
    }
}

private struct SupabaseSessionResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
    }
}

private struct StoredSession: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
}

private struct PendingMfa {
    let id = UUID()
    let method: NativeMfaMethod
    let session: StoredSession
    let generation: UUID
    let expiresAt = Date().addingTimeInterval(10 * 60)
    var emailChallenge: String?
}

private struct SessionSecurityResponse: Decodable {
    let ok: Bool?
    let code: String?
    let mfaType: String?
}

private struct EmailMfaStartResponse: Decodable { let challenge: String }
private struct SupabaseMfaAccount: Decodable { let factors: [SupabaseMfaFactor] }
private struct SupabaseMfaFactor: Decodable {
    let id: String
    let factorType: String
    let status: String
    enum CodingKeys: String, CodingKey { case id, factorType = "factor_type", status }
}
private struct SupabaseMfaChallenge: Decodable { let id: String }
private struct MfaFailureResponse: Decodable { let code: String? }

private enum AuthenticationError: LocalizedError {
    case missingConfiguration
    case unavailable
    case invalidCredentials
    case mfaRequired(NativeMfaMethod)
    case invalidCode
    case challengeExpired
    case challengeRequired
    case mfaNotVerified

    var errorDescription: String? {
        switch self {
        case .missingConfiguration:
            return "لم تُضبط خدمة تسجيل الدخول لهذا الإصدار بعد."
        case .unavailable:
            return "تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى."
        case .invalidCredentials:
            return "البريد الإلكتروني أو كلمة المرور غير صحيحين."
        case .mfaRequired(_):
            return "Additional account verification is required before private data can be displayed."
        case .invalidCode:
            return "The verification code is incorrect. Try again."
        case .challengeExpired:
            return "Verification expired. Sign in again."
        case .challengeRequired:
            return "Send an email code first."
        case .mfaNotVerified:
            return "Additional verification did not complete."
        }
    }
}

struct MfaVerificationView: View {
    @EnvironmentObject private var auth: AuthSessionStore
    @AppStorage("sfm-language") private var language = "ar"
    @State private var code = ""

    private func text(_ ar: String, _ en: String, _ fr: String) -> String {
        language == "fr" ? fr : language == "en" ? en : ar
    }

    var body: some View {
        let method = auth.pendingMfaMethod
        ZStack {
            Color(uiColor: .systemBackground).ignoresSafeArea()
            ScrollView {
                VStack(alignment: .trailing, spacing: 18) {
                    Image(systemName: "lock.shield.fill")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundStyle(.tint)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    Text(text("تحقق إضافي", "Additional verification", "Vérification supplémentaire"))
                        .font(.largeTitle.weight(.bold))
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    Text(method == .totp
                        ? text("أدخل الرمز من تطبيق المصادقة لإكمال تسجيل الدخول.", "Enter the code from your authenticator app to finish signing in.", "Saisissez le code de votre application d’authentification pour terminer la connexion.")
                        : text("أرسل رمزاً إلى بريد حسابك ثم أدخله لإكمال تسجيل الدخول.", "Send a code to your account email, then enter it to finish signing in.", "Envoyez un code à l’adresse e-mail de votre compte, puis saisissez-le pour terminer la connexion."))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.trailing)
                    if method == .email {
                        Button(text("إرسال أو إعادة إرسال الرمز", "Send or resend code", "Envoyer ou renvoyer le code")) {
                            Task { await auth.sendMfaEmail() }
                        }
                        .buttonStyle(.bordered)
                        .disabled(auth.isAuthenticating)
                    }
                    TextField(text("رمز التحقق", "Verification code", "Code de vérification"), text: $code)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .multilineTextAlignment(.center)
                        .font(.title2.monospacedDigit())
                        .onChange(of: code) { _, value in code = String(value.filter(\.isNumber).prefix(6)) }
                        .padding()
                        .background(Color(uiColor: .secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    Button {
                        Task { await auth.verifyMfa(code: code) }
                    } label: {
                        if auth.isAuthenticating { ProgressView().frame(maxWidth: .infinity) }
                        else { Text(text("تحقق", "Verify", "Vérifier")).frame(maxWidth: .infinity) }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(auth.isAuthenticating || code.count != 6 || method == nil)
                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    Button(text("إلغاء والعودة لتسجيل الدخول", "Cancel and return to sign in", "Annuler et revenir à la connexion"), role: .destructive) {
                        Task { await auth.cancelMfa() }
                    }
                    .disabled(auth.isAuthenticating)
                    .frame(maxWidth: .infinity)
                }
                .padding(24)
                .frame(maxWidth: 620)
            }
        }
        .environment(\.layoutDirection, language == "ar" ? .rightToLeft : .leftToRight)
    }
}

private struct SecureSessionStorage {
    private let service: String
    private let account = "supabase-session"

    init(service: String) {
        self.service = service
    }

    func load() -> StoredSession? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else {
            return nil
        }
        return try? JSONDecoder().decode(StoredSession.self, from: data)
    }

    func save(_ data: Data) -> Bool {
        let deleteStatus = SecItemDelete(baseQuery as CFDictionary)
        guard deleteStatus == errSecSuccess || deleteStatus == errSecItemNotFound else {
            return false
        }

        var query = baseQuery
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
    }

    func remove() {
        _ = SecItemDelete(baseQuery as CFDictionary)
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}
