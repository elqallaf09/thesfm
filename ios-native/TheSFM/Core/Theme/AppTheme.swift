import SwiftUI
import UIKit

enum AppTheme {
    enum Colors {
        static let background = adaptive(
            light: UIColor(red: 0.93, green: 0.97, blue: 1.00, alpha: 1),
            dark: UIColor(red: 0.02, green: 0.09, blue: 0.14, alpha: 1)
        )
        static let surface = adaptive(
            light: UIColor.white,
            dark: UIColor(red: 0.05, green: 0.17, blue: 0.27, alpha: 1)
        )
        static let elevatedSurface = adaptive(
            light: UIColor(red: 0.90, green: 0.97, blue: 0.99, alpha: 1),
            dark: UIColor(red: 0.08, green: 0.23, blue: 0.36, alpha: 1)
        )
        static let accent = Color(red: 0.10, green: 0.82, blue: 0.82)
        static let accentBlue = Color(red: 0.12, green: 0.58, blue: 1.00)
        static let textPrimary = adaptive(
            light: UIColor(red: 0.04, green: 0.09, blue: 0.16, alpha: 1),
            dark: UIColor.white
        )
        static let textSecondary = adaptive(
            light: UIColor(red: 0.30, green: 0.39, blue: 0.50, alpha: 1),
            dark: UIColor(red: 0.74, green: 0.83, blue: 0.90, alpha: 1)
        )
        static let border = adaptive(
            light: UIColor(red: 0.76, green: 0.90, blue: 0.95, alpha: 1),
            dark: UIColor.white.withAlphaComponent(0.12)
        )

        private static func adaptive(light: UIColor, dark: UIColor) -> Color {
            Color(uiColor: UIColor { traitCollection in
                traitCollection.userInterfaceStyle == .dark ? dark : light
            })
        }
    }

    enum Radius {
        static let card: CGFloat = 24
        static let button: CGFloat = 18
    }

    static var heroGradient: LinearGradient {
        LinearGradient(
            colors: [Colors.surface, Colors.elevatedSurface.opacity(0.95)],
            startPoint: .topTrailing,
            endPoint: .bottomLeading
        )
    }
}

struct SFMCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(20)
            .background(AppTheme.Colors.surface)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.card, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.Radius.card, style: .continuous)
                    .stroke(AppTheme.Colors.border, lineWidth: 1)
            )
    }
}
