import SwiftUI

@main
struct TheSFMBusinessApp: App {
    @StateObject private var authSession = AuthSessionStore(
        applicationName: "THE SFM Business",
        keychainService: "com.thesfm.business"
    )

    var body: some Scene {
        WindowGroup {
            BusinessHomeView()
                .environmentObject(authSession)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
