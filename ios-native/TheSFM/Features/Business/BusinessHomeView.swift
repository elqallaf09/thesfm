import SwiftUI

private struct BusinessRefreshKey: Hashable {
    let accessToken: String?
    let isDeviceLocked: Bool
}

struct BusinessHomeView: View {
    @EnvironmentObject private var authSession: AuthSessionStore
    @StateObject private var summaryStore = BusinessSummaryStore()

    var body: some View {
        NavigationStack {
            Group {
                if !authSession.isAuthenticated {
                    BusinessLoginView()
                } else if authSession.isDeviceLocked {
                    BusinessUnlockView(summaryStore: summaryStore)
                } else {
                    BusinessDashboardView(summaryStore: summaryStore)
                }
            }
            .navigationTitle("THE SFM Business")
            .navigationBarTitleDisplayMode(.inline)
        }
        .tint(.purple)
        .task(id: BusinessRefreshKey(accessToken: authSession.accessToken, isDeviceLocked: authSession.isDeviceLocked)) {
            guard !authSession.isDeviceLocked, let token = authSession.accessToken else { return }
            await summaryStore.load(accessToken: token)
        }
    }
}

private struct BusinessLoginView: View {
    @EnvironmentObject private var authSession: AuthSessionStore
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        Form {
            Section {
                VStack(alignment: .trailing, spacing: 10) {
                    Label("مساحة عملك", systemImage: "building.2.fill")
                        .font(.title2.weight(.bold))
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    Text("اعرض ملخص المشاريع والعملاء والفواتير والمبيعات من سجلات حسابك المحمية.")
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.trailing)
                }
                .padding(.vertical, 8)
            }
            Section("تسجيل الدخول") {
                TextField("البريد الإلكتروني", text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .multilineTextAlignment(.trailing)
                SecureField("كلمة المرور", text: $password)
                    .multilineTextAlignment(.trailing)
                Button(authSession.isAuthenticating ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول") {
                    Task { await authSession.signIn(email: email, password: password) }
                }
                .disabled(authSession.isAuthenticating || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty)
            }
            if let errorMessage = authSession.errorMessage {
                Section { Text(errorMessage).foregroundStyle(.red) }
            }
            Section {
                Text("تُحفظ الجلسة في Keychain الخاص بالتطبيق؛ لا تُحفظ كلمة المرور.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct BusinessUnlockView: View {
    @EnvironmentObject private var authSession: AuthSessionStore
    @ObservedObject var summaryStore: BusinessSummaryStore

    var body: some View {
        ContentUnavailableView {
            Label("بيانات أعمالك محمية", systemImage: "lock.shield.fill")
        } description: {
            Text("أكّد هويتك لعرض ملخص أعمالك.")
        } actions: {
            Button("فتح التطبيق") { Task { await authSession.unlock() } }
            Button("تسجيل الخروج", role: .destructive) {
                summaryStore.reset()
                authSession.signOut()
            }
        }
    }
}

private struct BusinessDashboardView: View {
    @EnvironmentObject private var authSession: AuthSessionStore
    @ObservedObject var summaryStore: BusinessSummaryStore

    var body: some View {
        List {
            Section {
                VStack(alignment: .trailing, spacing: 8) {
                    Text("ملخص أعمالك")
                        .font(.title2.weight(.bold))
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    Text("يُعرض فقط ما يملكه حسابك، دون حفظ الأرقام على الجهاز.")
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
                .padding(.vertical, 8)
            }

            if let summary = summaryStore.summary {
                Section("سجل الأعمال") {
                    BusinessMetricRow(title: "المشاريع", value: summary.projectCount.formatted(), symbol: "folder.fill")
                    BusinessMetricRow(title: "العملاء", value: summary.customerCount.formatted(), symbol: "person.2.fill")
                    BusinessMetricRow(title: "الموردون", value: summary.supplierCount.formatted(), symbol: "truck.box.fill")
                    BusinessMetricRow(title: "الموظفون النشطون", value: summary.activeEmployeeCount.formatted(), symbol: "person.crop.circle.badge.checkmark")
                }
                Section("الأداء الشهري") {
                    BusinessMetricRow(title: "المبيعات", value: money(summary.monthlySales, currency: summary.currency), symbol: "chart.line.uptrend.xyaxis")
                    BusinessMetricRow(title: "المصروفات التشغيلية", value: money(summary.monthlyOperatingExpenses, currency: summary.currency), symbol: "arrow.up.right.circle")
                    BusinessMetricRow(title: "الصافي التشغيلي", value: money(summary.monthlyOperatingNet, currency: summary.currency), symbol: "equal.circle.fill")
                }
                Section("الفواتير والتحصيل") {
                    BusinessMetricRow(title: "كل الفواتير", value: summary.invoiceCount.formatted(), symbol: "doc.text.fill")
                    BusinessMetricRow(title: "الفواتير المفتوحة", value: summary.openInvoiceCount.formatted(), symbol: "clock.badge.exclamationmark")
                    BusinessMetricRow(title: "المتأخر", value: summary.overdueInvoiceCount.formatted(), symbol: "exclamationmark.triangle.fill")
                    BusinessMetricRow(title: "المستحق", value: money(summary.outstandingInvoiceAmount, currency: summary.currency), symbol: "banknote.fill")
                }
                Text("آخر تحديث: \(summary.refreshedAt.formatted(date: .omitted, time: .shortened))")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            } else if summaryStore.isLoading {
                HStack { Spacer(); ProgressView("جارٍ تحميل ملخص الأعمال…"); Spacer() }
            } else if let errorMessage = summaryStore.errorMessage {
                ContentUnavailableView("تعذر تحميل ملخص الأعمال", systemImage: "wifi.exclamationmark", description: Text(errorMessage))
            } else {
                ContentUnavailableView("لا توجد بيانات للعرض", systemImage: "building.2")
            }

            Section {
                Button("تحديث البيانات", systemImage: "arrow.clockwise") {
                    Task {
                        guard let token = authSession.accessToken else { return }
                        await summaryStore.load(accessToken: token)
                    }
                }
                .disabled(summaryStore.isLoading)
                Button("تسجيل الخروج", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive) {
                    summaryStore.reset()
                    authSession.signOut()
                }
            }
        }
    }
}

private struct BusinessMetricRow: View {
    let title: String
    let value: String
    let symbol: String

    var body: some View {
        Label {
            HStack {
                Text(value).font(.headline.monospacedDigit())
                Spacer()
                Text(title)
            }
        } icon: {
            Image(systemName: symbol).foregroundStyle(.tint)
        }
        .accessibilityElement(children: .combine)
    }
}

@MainActor
private final class BusinessSummaryStore: ObservableObject {
    @Published private(set) var summary: MobileBusinessSummary?
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    func load(accessToken: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            let response: BusinessSummaryResponse = try await APIClient.authorized(accessToken: accessToken)
                .get("/api/mobile/business/summary")
            guard response.ok, let summary = response.summary else {
                throw BusinessSummaryError.unavailable
            }
            self.summary = summary
        } catch {
            errorMessage = "تعذر الاتصال ببيانات أعمالك. تحقق من الشبكة ثم أعد المحاولة."
        }
    }

    func reset() {
        summary = nil
        errorMessage = nil
        isLoading = false
    }
}

private struct BusinessSummaryResponse: Decodable {
    let ok: Bool
    let summary: MobileBusinessSummary?
}

private struct MobileBusinessSummary: Decodable {
    let currency: String?
    let projectCount: Int
    let customerCount: Int
    let supplierCount: Int
    let activeEmployeeCount: Int
    let invoiceCount: Int
    let openInvoiceCount: Int
    let overdueInvoiceCount: Int
    let outstandingInvoiceAmount: Double?
    let monthlySales: Double?
    let monthlyOperatingExpenses: Double?
    let monthlyOperatingNet: Double?
    let refreshedAt: Date
}

private enum BusinessSummaryError: Error {
    case unavailable
}

private func money(_ amount: Double?, currency: String?) -> String {
    guard let amount, let currency else { return "—" }
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = currency
    formatter.locale = Locale(identifier: "ar_KW")
    return formatter.string(from: NSNumber(value: amount)) ?? "—"
}
