import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var authSession: AuthSessionStore
    @State private var selectedTab: MainTab = .home
    @State private var summary: MobileFinanceSummary?
    @State private var isSummaryLoading = true
    @State private var summaryError: String?
    @State private var lastSummaryUpdatedAt: Date?

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeDashboardScreen(
                    summary: summary,
                    isLoading: isSummaryLoading,
                    errorMessage: summaryError,
                    lastUpdatedAt: lastSummaryUpdatedAt,
                    onRefresh: { Task { await loadSummary() } },
                    signOut: authSession.signOut
                )
            }
            .tabItem { Label("الرئيسية", systemImage: "house.fill") }
            .tag(MainTab.home)

            MobileRecordsView(product: "finance")
                .tabItem { Label("أموالي", systemImage: "wallet.pass") }
                .tag(MainTab.expenses)
        }
        .tint(AppTheme.Colors.accent)
        .environment(\.layoutDirection, .rightToLeft)
        .task(id: authSession.accessToken) {
            await loadSummary()
        }
    }

    private func loadSummary() async {
        guard let token = authSession.accessToken else {
            summary = nil
            isSummaryLoading = false
            return
        }

        isSummaryLoading = true
        summaryError = nil
        defer { isSummaryLoading = false }

        do {
            let response: MobileFinanceSummaryResponse = try await APIClient.authorized(accessToken: token)
                .get("/api/mobile/finance/summary")
            guard response.ok, let receivedSummary = response.summary else {
                summaryError = "تعذر تحميل ملخصك المالي الآن."
                return
            }
            summary = receivedSummary
            lastSummaryUpdatedAt = .now
        } catch {
            summaryError = "تعذر الاتصال ببياناتك المالية. تحقق من الشبكة ثم أعد المحاولة."
        }
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
    let summary: MobileFinanceSummary?
    let isLoading: Bool
    let errorMessage: String?
    let lastUpdatedAt: Date?
    let onRefresh: () -> Void
    let signOut: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                SFMHeroSection(
                    title: "الصفحة الرئيسية",
                    subtitle: "نظرة تنفيذية على أموالك والتزاماتك من بيانات THE SFM.",
                    systemImage: "sparkles"
                )

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                    SFMMetricTile(title: "المركز المالي", value: money(summary?.trackedPosition), symbol: "banknote")
                    SFMMetricTile(title: "الدخل الشهري", value: money(summary?.monthlyIncome), symbol: "arrow.down.left.circle")
                    SFMMetricTile(title: "المصروفات الشهرية", value: money(summary?.monthlyExpenses), symbol: "arrow.up.right.circle")
                    SFMMetricTile(title: "صافي الشهر", value: money(summary?.monthlyNet), symbol: "chart.line.uptrend.xyaxis")
                    SFMMetricTile(title: "الديون النشطة", value: debtCount(summary?.activeDebtCount), symbol: "creditcard.trianglebadge.exclamationmark")
                }

                if isLoading {
                    ProgressView("جارٍ تحديث ملخصك المالي…")
                        .tint(AppTheme.Colors.accent)
                } else if let errorMessage {
                    SFMActionCard(title: "تعذر تحميل البيانات", bodyText: errorMessage, symbol: "wifi.exclamationmark")
                } else {
                    SFMActionCard(
                        title: "بياناتك المالية",
                        bodyText: "يعرض التطبيق ملخصًا من نفس القواعد المستخدمة في لوحة الموقع، من دون حفظ الأرقام على الجهاز.",
                        symbol: "lock.shield"
                    )
                }

                if let lastUpdatedAt {
                    Text("آخر تحديث: \(lastUpdatedAt.formatted(date: .omitted, time: .shortened))")
                        .font(.footnote)
                        .foregroundStyle(AppTheme.Colors.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }

                Button(action: onRefresh) {
                    Label("تحديث البيانات", systemImage: "arrow.clockwise")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SFMSecondaryButtonStyle())

                Button(role: .destructive, action: signOut) {
                    Label("تسجيل الخروج", systemImage: "rectangle.portrait.and.arrow.right")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SFMSecondaryButtonStyle())
            }
            .padding(20)
        }
        .background(AppTheme.Colors.background.ignoresSafeArea())
        .navigationTitle("THE SFM Finance")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func money(_ amount: Double?) -> String {
        guard let amount, let currency = summary?.currency else { return "—" }
        return MoneyFormatter.format(Decimal(amount), currencyCode: currency)
    }

    private func debtCount(_ count: Int?) -> String {
        guard let count else { return "—" }
        return count.formatted()
    }
}

private struct MobileFinanceSummaryResponse: Decodable {
    let ok: Bool
    let summary: MobileFinanceSummary?
}

private struct MobileFinanceSummary: Decodable {
    let currency: String?
    let monthlyIncome: Double?
    let monthlyExpenses: Double?
    let monthlyNet: Double?
    let trackedPosition: Double?
    let activeDebtCount: Int

    enum CodingKeys: String, CodingKey {
        case currency
        case monthlyIncome = "monthlyIncome"
        case monthlyExpenses = "monthlyExpenses"
        case monthlyNet = "monthlyNet"
        case trackedPosition = "trackedPosition"
        case activeDebtCount = "activeDebtCount"
    }
}

private struct FinancePreviewScreen: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let cards: [PreviewCard]

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                SFMHeroSection(
                    title: title,
                    subtitle: subtitle,
                    systemImage: systemImage
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
                    systemImage: "square.grid.2x2.fill"
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

                Text("THE SFM Finance")
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
