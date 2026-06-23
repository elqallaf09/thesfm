import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var authSession: AuthSessionStore
    @State private var selectedTab: MainTab = .home

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeDashboardScreen {
                    authSession.signOut()
                }
            }
            .tabItem { Label("الرئيسية", systemImage: "house.fill") }
            .tag(MainTab.home)

            NavigationStack {
                FinancePreviewScreen(
                    title: "المصاريف",
                    subtitle: "سجل المصروفات والاشتراكات والديون الشهرية في مكان واحد.",
                    systemImage: "creditcard.fill",
                    primaryAction: "إضافة مصروف",
                    cards: [
                        PreviewCard(title: "إجمالي المصروفات", value: "بانتظار الربط", note: "لا يتم عرض أرقام قبل جلب بياناتك."),
                        PreviewCard(title: "الاشتراكات الشهرية", value: "جاهزة للإضافة", note: "Netflix وAI والاتصالات والإنترنت."),
                    ]
                )
            }
            .tabItem { Label("المصاريف", systemImage: "creditcard") }
            .tag(MainTab.expenses)

            NavigationStack {
                FinancePreviewScreen(
                    title: "الاستثمار",
                    subtitle: "تابع المحفظة والأسعار والتنبيهات بشكل مباشر عند ربط البيانات.",
                    systemImage: "chart.line.uptrend.xyaxis",
                    primaryAction: "إضافة استثمار",
                    cards: [
                        PreviewCard(title: "قيمة المحفظة", value: "بانتظار الأسعار", note: "تحديث حي عند توفر مزود البيانات."),
                        PreviewCard(title: "المخاطر", value: "غير محسوبة", note: "تحسب من تنوع الأصول وحركة السوق."),
                    ]
                )
            }
            .tabItem { Label("الاستثمار", systemImage: "chart.line.uptrend.xyaxis") }
            .tag(MainTab.investments)

            NavigationStack {
                FinancePreviewScreen(
                    title: "المشاريع",
                    subtitle: "حوّل أفكارك إلى خطة عمل وعرض استثماري قابل للمشاركة.",
                    systemImage: "briefcase.fill",
                    primaryAction: "فتح المشاريع",
                    cards: [
                        PreviewCard(title: "العروض الاستثمارية", value: "PDF وPowerPoint", note: "تصدير احترافي من بيانات المشروع."),
                        PreviewCard(title: "جاهزية المشروع", value: "تحليل منظم", note: "يعتمد على البيانات التي تضيفها فقط."),
                    ]
                )
            }
            .tabItem { Label("المشاريع", systemImage: "briefcase") }
            .tag(MainTab.projects)

            NavigationStack {
                MoreScreen {
                    authSession.signOut()
                }
            }
            .tabItem { Label("المزيد", systemImage: "square.grid.2x2.fill") }
            .tag(MainTab.more)
        }
        .tint(AppTheme.Colors.accent)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

private enum MainTab: Hashable {
    case home
    case expenses
    case investments
    case projects
    case more
}

private struct HomeDashboardScreen: View {
    let signOut: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                SFMHeroSection(
                    title: "الصفحة الرئيسية",
                    subtitle: "نظرة تنفيذية على أموالك ومشاريعك واستثماراتك، جاهزة للربط مع بيانات THE SFM.",
                    systemImage: "sparkles",
                    primaryAction: "عرض كل المهام"
                )

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                    SFMMetricTile(title: "إجمالي الأصول", value: "بانتظار الربط", symbol: "banknote")
                    SFMMetricTile(title: "المشاريع النشطة", value: "لا توجد بيانات", symbol: "briefcase")
                    SFMMetricTile(title: "المصاريف المتكررة", value: "جاهزة", symbol: "repeat")
                    SFMMetricTile(title: "التنبيهات", value: "0", symbol: "bell")
                }

                SFMActionCard(
                    title: "تجربة iOS Native",
                    bodyText: "هذه الواجهة مبنية بتبويبات SwiftUI، بطاقات قابلة للقراءة، وأزرار مناسبة للمس على الهاتف. الخطوة التالية هي ربطها بنفس API وSupabase المستخدمين في الموقع.",
                    symbol: "iphone"
                )

                Button(role: .destructive, action: signOut) {
                    Label("تسجيل الخروج", systemImage: "rectangle.portrait.and.arrow.right")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SFMSecondaryButtonStyle())
            }
            .padding(20)
        }
        .background(AppTheme.Colors.background.ignoresSafeArea())
        .navigationTitle("THE SFM")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct FinancePreviewScreen: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let primaryAction: String
    let cards: [PreviewCard]

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                SFMHeroSection(
                    title: title,
                    subtitle: subtitle,
                    systemImage: systemImage,
                    primaryAction: primaryAction
                )

                ForEach(cards) { card in
                    SFMCard {
                        VStack(alignment: .trailing, spacing: 10) {
                            Text(card.title)
                                .font(.system(.headline, design: .rounded).weight(.bold))
                                .foregroundStyle(AppTheme.Colors.textSecondary)

                            Text(card.value)
                                .font(.system(.title2, design: .rounded).weight(.heavy))
                                .foregroundStyle(AppTheme.Colors.textPrimary)

                            Text(card.note)
                                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                                .foregroundStyle(AppTheme.Colors.textSecondary)
                                .multilineTextAlignment(.trailing)
                        }
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                }
            }
            .padding(20)
        }
        .background(AppTheme.Colors.background.ignoresSafeArea())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct MoreScreen: View {
    let signOut: () -> Void

    private let links = [
        ("الدعم", "questionmark.circle.fill"),
        ("الإعدادات", "gearshape.fill"),
        ("سياسة الخصوصية", "lock.fill"),
        ("الشروط والأحكام", "doc.text.fill"),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                SFMHeroSection(
                    title: "المزيد",
                    subtitle: "إعدادات الحساب، الدعم، والسياسات في واجهة واحدة واضحة.",
                    systemImage: "square.grid.2x2.fill",
                    primaryAction: "إدارة الحساب"
                )

                ForEach(links, id: \.0) { item in
                    SFMActionCard(title: item.0, bodyText: "سيتم ربط هذا القسم مع شاشة الموقع المقابلة عند تفعيل التنقل الكامل.", symbol: item.1)
                }

                Button(role: .destructive, action: signOut) {
                    Label("تسجيل الخروج", systemImage: "rectangle.portrait.and.arrow.right")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SFMSecondaryButtonStyle())
            }
            .padding(20)
        }
        .background(AppTheme.Colors.background.ignoresSafeArea())
        .navigationTitle("المزيد")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct SFMHeroSection: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let primaryAction: String

    var body: some View {
        VStack(alignment: .trailing, spacing: 18) {
            HStack {
                Image(systemName: systemImage)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(AppTheme.Colors.accent)
                    .frame(width: 50, height: 50)
                    .background(AppTheme.Colors.elevatedSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

                Spacer()

                Text("THE SFM")
                    .font(.system(.headline, design: .rounded).weight(.heavy))
                    .foregroundStyle(AppTheme.Colors.accent)
            }

            VStack(alignment: .trailing, spacing: 10) {
                Text(title)
                    .font(.system(size: 38, weight: .heavy, design: .rounded))
                    .foregroundStyle(AppTheme.Colors.textPrimary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.72)

                Text(subtitle)
                    .font(.system(.body, design: .rounded).weight(.semibold))
                    .foregroundStyle(AppTheme.Colors.textSecondary)
                    .lineSpacing(4)
                    .multilineTextAlignment(.trailing)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)

            Button(action: {}) {
                Label(primaryAction, systemImage: "arrow.left")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SFMPrimaryButtonStyle())
        }
        .padding(22)
        .background(AppTheme.heroGradient)
        .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .stroke(AppTheme.Colors.border, lineWidth: 1)
        )
    }
}

private struct SFMMetricTile: View {
    let title: String
    let value: String
    let symbol: String

    var body: some View {
        SFMCard {
            VStack(alignment: .trailing, spacing: 12) {
                Image(systemName: symbol)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(AppTheme.Colors.accent)

                Text(title)
                    .font(.system(.subheadline, design: .rounded).weight(.bold))
                    .foregroundStyle(AppTheme.Colors.textSecondary)

                Text(value)
                    .font(.system(.headline, design: .rounded).weight(.heavy))
                    .foregroundStyle(AppTheme.Colors.textPrimary)
                    .multilineTextAlignment(.trailing)
                    .minimumScaleFactor(0.78)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }
}

private struct SFMActionCard: View {
    let title: String
    let bodyText: String
    let symbol: String

    var body: some View {
        SFMCard {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: symbol)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(AppTheme.Colors.accent)
                    .frame(width: 44, height: 44)
                    .background(AppTheme.Colors.elevatedSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                VStack(alignment: .trailing, spacing: 7) {
                    Text(title)
                        .font(.system(.headline, design: .rounded).weight(.heavy))
                        .foregroundStyle(AppTheme.Colors.textPrimary)
                    Text(bodyText)
                        .font(.system(.subheadline, design: .rounded).weight(.semibold))
                        .foregroundStyle(AppTheme.Colors.textSecondary)
                        .multilineTextAlignment(.trailing)
                        .lineSpacing(3)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
    }
}

private struct PreviewCard: Identifiable {
    let id = UUID()
    let title: String
    let value: String
    let note: String
}

private struct SFMPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.headline, design: .rounded).weight(.heavy))
            .foregroundStyle(Color.white)
            .padding(.vertical, 14)
            .padding(.horizontal, 18)
            .frame(minHeight: 52)
            .background(
                LinearGradient(colors: [AppTheme.Colors.accentBlue, AppTheme.Colors.accent], startPoint: .leading, endPoint: .trailing)
            )
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.button, style: .continuous))
            .opacity(configuration.isPressed ? 0.84 : 1)
    }
}

private struct SFMSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.headline, design: .rounded).weight(.heavy))
            .foregroundStyle(AppTheme.Colors.textPrimary)
            .padding(.vertical, 13)
            .padding(.horizontal, 18)
            .frame(minHeight: 50)
            .background(AppTheme.Colors.elevatedSurface)
            .clipShape(RoundedRectangle(cornerRadius: AppTheme.Radius.button, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.Radius.button, style: .continuous)
                    .stroke(AppTheme.Colors.border, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

#Preview {
    DashboardView()
        .environmentObject(AuthSessionStore())
}
