import Foundation
import Combine

@MainActor
final class AuthSessionStore: ObservableObject {
    @Published private(set) var isAuthenticated = false
    @Published private(set) var accessToken: String?

    func restoreSession() {
        // TODO: Restore a Supabase session from Keychain.
        isAuthenticated = false
        accessToken = nil
    }

    func signInWithPlaceholderSession() {
        // Temporary shell action for routing only. Replace with Supabase Auth.
        isAuthenticated = true
        accessToken = nil
    }

    func signOut() {
        isAuthenticated = false
        accessToken = nil
    }
}
