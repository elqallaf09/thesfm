import SwiftUI

@main
struct TheSFMApp: App {
    @StateObject private var authSession = AuthSessionStore()

    var body: some Scene {
        WindowGroup {
            AppRouter()
                .environmentObject(authSession)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
