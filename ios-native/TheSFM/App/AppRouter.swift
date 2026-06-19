import SwiftUI

struct AppRouter: View {
    @EnvironmentObject private var authSession: AuthSessionStore

    var body: some View {
        Group {
            if authSession.isAuthenticated {
                DashboardView()
            } else {
                LoginView()
            }
        }
        .tint(AppTheme.Colors.accent)
    }
}
