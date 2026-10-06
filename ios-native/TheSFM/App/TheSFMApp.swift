import SwiftUI

@main
struct TheSFMApp: App {
    @StateObject private var authSession = AuthSessionStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            AppRouter()
                .environmentObject(authSession)
                .environment(\.layoutDirection, .rightToLeft)
                .onChange(of: scenePhase) { _, phase in
                    if phase != .active {
                        authSession.lock()
                    }
                }
        }
    }
}
