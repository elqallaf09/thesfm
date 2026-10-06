import SwiftUI

@main
struct TheSFMBusinessApp: App {
    var body: some Scene {
        WindowGroup {
            BusinessHomeView()
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
