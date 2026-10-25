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
                MobileTeamsView().tabItem { Label("Teams", systemImage: "person.3") }
                MobileDecisionsView().tabItem { Label("Decisions", systemImage: "scale.3d") }
                BusinessHomeView().tabItem { Label("الرئيسية", systemImage: "house") }
                MobileRecordsView(product: "business").tabItem { Label("إدارة الأعمال", systemImage: "briefcase") }
            }
                .environmentObject(authSession)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
