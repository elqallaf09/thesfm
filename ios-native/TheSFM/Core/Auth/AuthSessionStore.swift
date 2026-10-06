import Combine
import Foundation
import LocalAuthentication
import Security

@MainActor
final class AuthSessionStore: ObservableObject {
    @Published private(set) var isAuthenticated = false
    @Published private(set) var isAuthenticating = false
    @Published private(set) var isDeviceLocked = false
    @Published private(set) var accessToken: String?
    @Published private(set) var errorMessage: String?

    private let storage = SecureSessionStorage()
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init() {
        restoreSession()
    }

    func restoreSession() {
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

        isAuthenticating = true
        errorMessage = nil
        defer { isAuthenticating = false }

        do {
            let session = try await requestSession(
                grantType: "password",
                body: ["email": normalizedEmail, "password": password]
            )
            save(session)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func signOut() {
        storage.remove()
        isAuthenticated = false
        accessToken = nil
        isDeviceLocked = false
        errorMessage = nil
    }

    func lock() {
        guard isAuthenticated else { return }
        isDeviceLocked = true
        errorMessage = nil
    }

    func unlock() async {
        guard isAuthenticated else { return }

        let context = LAContext()
        var policyError: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &policyError) else {
            errorMessage = "فعّل رمز مرور الجهاز لاستخدام القفل الآمن."
            return
        }

        do {
            try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: "تأكيد هويتك لعرض ملخصك المالي في THE SFM Finance."
            )
            isDeviceLocked = false
            errorMessage = nil
        } catch {
            errorMessage = "تعذر تأكيد هويتك. حاول مرة أخرى."
        }
    }

    private func refresh(_ storedSession: StoredSession) async {
        do {
            let session = try await requestSession(
                grantType: "refresh_token",
                body: ["refresh_token": storedSession.refreshToken]
            )
            save(session)
        } catch {
            storage.remove()
            isAuthenticated = false
            accessToken = nil
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

        var request = URLRequest(url: endpoint)
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
            throw AuthenticationError.invalidCredentials
        }

        let responseBody = try decoder.decode(SupabaseSessionResponse.self, from: data)
        return StoredSession(
            accessToken: responseBody.accessToken,
            refreshToken: responseBody.refreshToken,
            expiresAt: Date().addingTimeInterval(TimeInterval(responseBody.expiresIn))
        )
    }

    private func save(_ session: StoredSession) {
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

private enum AuthenticationError: LocalizedError {
    case missingConfiguration
    case unavailable
    case invalidCredentials

    var errorDescription: String? {
        switch self {
        case .missingConfiguration:
            return "لم تُضبط خدمة تسجيل الدخول لهذا الإصدار بعد."
        case .unavailable:
            return "تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى."
        case .invalidCredentials:
            return "البريد الإلكتروني أو كلمة المرور غير صحيحين."
        }
    }
}

private struct SecureSessionStorage {
    private let service = "com.thesfm.finance"
    private let account = "supabase-session"

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
