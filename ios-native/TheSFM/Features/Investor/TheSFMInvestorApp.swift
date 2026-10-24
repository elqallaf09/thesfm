import SwiftUI

@main
struct TheSFMInvestorApp: App {
    @StateObject private var authSession = AuthSessionStore(applicationName: "THE SFM Investor", keychainService: "com.thesfm.investor")
    var body: some Scene {
        WindowGroup {
            TabView {
                InvestorDashboardView().tabItem { Label("الأسواق", systemImage: "chart.line.uptrend.xyaxis") }
                MobileRecordsView(product: "investor").tabItem { Label("حسابي والمحفظة", systemImage: "wallet.pass") }
            }
                .environmentObject(authSession)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
