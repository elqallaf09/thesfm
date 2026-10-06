import SwiftUI

@main
struct TheSFMInvestorApp: App {
    var body: some Scene {
        WindowGroup {
            InvestorDashboardView()
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
