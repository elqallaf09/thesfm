import SwiftUI

@main
struct TheSFMBusinessApp: App {
    @StateObject private var authSession = AuthSessionStore(
        applicationName: "THE SFM Business",
        keychainService: "com.thesfm.business"
    )

    var body: some Scene {
        WindowGroup {
            TabView {
                BusinessHomeView().tabItem { Label("الرئيسية", systemImage: "house") }
                MobileRecordsView(product: "business").tabItem { Label("إدارة الأعمال", systemImage: "briefcase") }
            }
                .environmentObject(authSession)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
