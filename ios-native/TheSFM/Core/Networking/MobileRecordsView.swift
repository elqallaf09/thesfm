import SwiftUI
import UIKit
import UniformTypeIdentifiers

private struct MobileResource: Decodable, Identifiable {
    let id: String
    let label: [String]
    let fields: [MobileField]
    let readOnly: Bool?
}
private struct MobileField: Decodable, Identifiable {
    var id: String { key }
    let key: String
    let label: [String]
    let type: String
    let required: Bool?
    let options: [String]?
}
private struct MobileManifest: Decodable { let resources: [MobileResource] }
private struct MobileRecordPage: Decodable { let records: [[String: MobileValue]]; let nextCursor: String? }
private enum MobileValue: Codable {
    case text(String), number(Double), bool(Bool), null
    init(from decoder: Decoder) throws {
        let value = try decoder.singleValueContainer()
        if value.decodeNil() { self = .null }
        else if let bool = try? value.decode(Bool.self) { self = .bool(bool) }
        else if let number = try? value.decode(Double.self) { self = .number(number) }
        else { self = .text(try value.decode(String.self)) }
    }
    func encode(to encoder: Encoder) throws {
        var value = encoder.singleValueContainer()
        switch self { case .text(let text): try value.encode(text); case .number(let number): try value.encode(number); case .bool(let bool): try value.encode(bool); case .null: try value.encodeNil() }
    }
    var text: String {
        switch self { case .text(let value): return value; case .number(let value): return value.formatted(.number.locale(Locale(identifier: "en_US"))); case .bool(let value): return value ? "true" : "false"; case .null: return "" }
    }
    var editableText: String { if case .number(let value) = self { return String(value) }; return text }
    var amount: Double? {
        switch self { case .number(let value): return value.isFinite && value >= 0 ? value : nil; case .text(let value): guard let number = Double(value), number.isFinite, number >= 0 else { return nil }; return number; default: return nil }
    }
    var string: String? { if case .text(let value) = self { return value }; return nil }
}

private struct MobileCurrencyReport: Identifiable {
    let id: String
    var receivedIncome = 0.0
    var expectedIncome = 0.0
    var expenses = 0.0
    var savings = 0.0
    var debtOutstanding = 0.0
    var completedSales = 0.0
    var pendingSales = 0.0
    var paidInvoices = 0.0
    var outstandingInvoices = 0.0
    var overdueInvoices = 0.0
    var operatingExpenses = 0.0
}

private struct MobileMonthlyReport {
    let product: String
    let period: String
    let currencies: [MobileCurrencyReport]
    let counts: [(String, Int)]
    let undatedRecords: Int
    let isPartial: Bool

    static func make(product: String, period: String, records: [String: [[String: MobileValue]]], isPartial: Bool) -> MobileMonthlyReport {
        var values: [String: MobileCurrencyReport] = [:]
        var undated = 0
        func currency(_ row: [String: MobileValue]) -> String? {
            guard let value = row["currency"]?.string?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased(), value.count == 3, value.allSatisfy({ $0.isASCII && $0.isLetter }) else { return nil }
            return value
        }
        func inPeriod(_ row: [String: MobileValue], _ key: String) -> Bool { row[key]?.string?.hasPrefix("\(period)-") == true }
        func add(_ row: [String: MobileValue], _ mutate: (inout MobileCurrencyReport, Double) -> Void) {
            guard let code = currency(row), let amount = row["amount"]?.amount else { return }
            var total = values[code] ?? MobileCurrencyReport(id: code)
            mutate(&total, amount); values[code] = total
        }
        func addRemainingDebt(_ row: [String: MobileValue]) {
            guard let code = currency(row), let amount = row["remaining_amount"]?.amount else { return }
            var total = values[code] ?? MobileCurrencyReport(id: code)
            total.debtOutstanding += amount; values[code] = total
        }
        if product == "finance" {
            for row in records["income"] ?? [] {
                guard inPeriod(row, "received_date") else { if row["received_date"]?.string == nil { undated += 1 }; continue }
                add(row) { total, amount in if row["status"]?.string == "expected" { total.expectedIncome += amount } else { total.receivedIncome += amount } }
            }
            for row in records["expenses"] ?? [] {
                guard inPeriod(row, "date") else { if row["date"]?.string == nil { undated += 1 }; continue }
                add(row) { $0.expenses += $1 }
            }
            for row in records["savings"] ?? [] {
                guard inPeriod(row, "saved_at") else { if row["saved_at"]?.string == nil { undated += 1 }; continue }
                add(row) { $0.savings += $1 }
            }
            for row in records["debts"] ?? [] { addRemainingDebt(row) }
        } else {
            for row in records["sales"] ?? [] {
                guard inPeriod(row, "sale_date") else { if row["sale_date"]?.string == nil { undated += 1 }; continue }
                add(row) { total, amount in if row["status"]?.string == "completed" { total.completedSales += amount } else if row["status"]?.string == "pending" { total.pendingSales += amount } }
            }
            for row in records["invoices"] ?? [] {
                guard inPeriod(row, "invoice_date") else { if row["invoice_date"]?.string == nil { undated += 1 }; continue }
                add(row) { total, amount in
                    if row["status"]?.string == "paid" { total.paidInvoices += amount }
                    else if row["status"]?.string == "sent" || row["status"]?.string == "overdue" { total.outstandingInvoices += amount; if row["status"]?.string == "overdue" { total.overdueInvoices += amount } }
                }
            }
            for row in records["operating-expenses"] ?? [] {
                guard inPeriod(row, "expense_date") else { if row["expense_date"]?.string == nil { undated += 1 }; continue }
                add(row) { $0.operatingExpenses += $1 }
            }
        }
        let count: [(String, Int)]
        if product == "finance" {
            count = [
                ("income", records["income"]?.count ?? 0),
                ("expenses", records["expenses"]?.count ?? 0),
                ("savings", records["savings"]?.count ?? 0),
                ("debts", records["debts"]?.count ?? 0),
                ("goals", records["goals"]?.count ?? 0),
            ]
        } else {
            let activeEmployees = (records["employees"] ?? []).filter { $0["status"]?.string == "active" }.count
            let openInvoices = (records["invoices"] ?? []).filter { $0["status"]?.string == "sent" || $0["status"]?.string == "overdue" }.count
            count = [
                ("projects", records["projects"]?.count ?? 0),
                ("customers", records["customers"]?.count ?? 0),
                ("suppliers", records["suppliers"]?.count ?? 0),
                ("employees", activeEmployees),
                ("invoices", openInvoices),
            ]
        }
        return MobileMonthlyReport(product: product, period: period, currencies: values.values.sorted { $0.id < $1.id }, counts: count, undatedRecords: undated, isPartial: isPartial)
    }
}

private func mobileReportLabel(_ key: String, language: String) -> String {
    let values: (String, String, String)
    switch key {
    case "income": values = ("الدخل", "Income", "Revenus")
    case "expenses": values = ("المصروفات", "Expenses", "Dépenses")
    case "savings": values = ("المدخرات", "Savings", "Épargne")
    case "debts": values = ("الديون", "Debts", "Dettes")
    case "goals": values = ("الأهداف", "Goals", "Objectifs")
    case "projects": values = ("المشاريع", "Projects", "Projets")
    case "customers": values = ("العملاء", "Customers", "Clients")
    case "suppliers": values = ("الموردون", "Suppliers", "Fournisseurs")
    case "employees": values = ("الموظفون النشطون", "Active employees", "Employés actifs")
    default: values = ("الفواتير المفتوحة", "Open invoices", "Factures ouvertes")
    }
    return language == "ar" ? values.0 : language == "fr" ? values.2 : values.1
}

/// Finance and Business reports use only the protected record API and retain each recorded currency.
struct MobileReportsView: View {
    let product: String
    @EnvironmentObject private var auth: AuthSessionStore
    @AppStorage("sfm-language") private var language = "ar"
    @State private var period = String(Calendar.current.dateComponents([.year, .month], from: .now).year ?? 2026) + "-" + String(format: "%02d", Calendar.current.component(.month, from: .now))
    @State private var report: MobileMonthlyReport?
    @State private var isLoading = false
    @State private var failed = false
    @State private var exportURL: URL?
    private var index: Int { language == "ar" ? 0 : language == "fr" ? 2 : 1 }
    private func tr(_ ar: String, _ en: String, _ fr: String) -> String { [ar, en, fr][index] }
    private var resourceIDs: [String] { product == "finance" ? ["income", "expenses", "savings", "debts", "goals"] : ["projects", "customers", "suppliers", "sales", "invoices", "employees", "operating-expenses"] }

    var body: some View {
        List {
            Section {
                Text(tr("يعتمد هذا التقرير على سجلات حسابك المحمّلة فقط، ولا يجمع بين العملات.", "This report uses only loaded records from your account and never combines currencies.", "Ce rapport utilise uniquement les enregistrements chargés depuis votre compte et ne combine jamais les devises."))
                    .font(.footnote).foregroundStyle(.secondary)
                HStack {
                    Button(tr("الشهر السابق", "Previous month", "Mois précédent")) { changeMonth(-1) }
                    Spacer()
                    Text(period).font(.headline.monospacedDigit())
                    Spacer()
                    Button(tr("الشهر التالي", "Next month", "Mois suivant")) { changeMonth(1) }
                }
                Button(tr("تحديث من حسابي", "Refresh from my account", "Actualiser depuis mon compte"), systemImage: "arrow.clockwise") { Task { await load() } }
                    .disabled(isLoading || auth.isDeviceLocked)
            }
            if isLoading { Section { ProgressView(tr("جارٍ إعداد التقرير…", "Preparing report…", "Préparation du rapport…")) } }
            if failed { Section { Text(tr("تعذر تحميل التقرير. تحقّق من الاتصال ثم أعد المحاولة.", "Could not load the report. Check your connection and retry.", "Impossible de charger le rapport. Vérifiez la connexion puis réessayez.")).foregroundStyle(.red) } }
            if let report {
                Section(tr("بيانات الحساب المستخدمة", "Account data used", "Données du compte utilisées")) {
                    ForEach(Array(report.counts.enumerated()), id: \.offset) { _, value in LabeledContent(mobileReportLabel(value.0, language: language), value: value.1.formatted()) }
                    if report.undatedRecords > 0 { LabeledContent(tr("سجلات بلا تاريخ تقرير", "Records without a reporting date", "Enregistrements sans date de rapport"), value: report.undatedRecords.formatted()) }
                }
                if report.isPartial { Section { Text(tr("قد يكون التقرير جزئياً: حُمّل أول 800 سجل فقط لكل قسم. راجع السجل التفصيلي قبل استخدامه ككشف كامل.", "This report may be partial: only the first 800 records in each section were loaded. Review the detailed section before using it as a complete statement.", "Ce rapport peut être partiel : seuls les 800 premiers enregistrements de chaque section ont été chargés. Consultez le détail avant de l’utiliser comme relevé complet.")).foregroundStyle(.orange) } }
                if report.currencies.isEmpty { Section { Text(tr("لا توجد سجلات نقدية مؤرخة لهذا الشهر.", "No dated monetary records are available for this month.", "Aucun enregistrement monétaire daté n’est disponible pour ce mois.")) } }
                ForEach(report.currencies) { currency in Section(currency.id) {
                    if product == "finance" {
                        money(tr("الدخل المستلم", "Received income", "Revenus reçus"), currency.receivedIncome, currency.id); money(tr("الدخل المتوقع", "Expected income", "Revenus prévus"), currency.expectedIncome, currency.id); money(tr("المصروفات", "Expenses", "Dépenses"), currency.expenses, currency.id); money(tr("النقد بعد المصروفات", "Cash after expenses", "Trésorerie après dépenses"), currency.receivedIncome - currency.expenses, currency.id); money(tr("المدخرات المضافة", "Savings added", "Épargne ajoutée"), currency.savings, currency.id); money(tr("الدين المتبقي", "Debt remaining", "Dette restante"), currency.debtOutstanding, currency.id)
                    } else {
                        money(tr("المبيعات المكتملة", "Completed sales", "Ventes finalisées"), currency.completedSales, currency.id); money(tr("المبيعات المعلقة", "Pending sales", "Ventes en attente"), currency.pendingSales, currency.id); money(tr("مصروفات التشغيل", "Operating expenses", "Charges d’exploitation"), currency.operatingExpenses, currency.id); money(tr("صافي التشغيل", "Operating net", "Solde d’exploitation"), currency.completedSales - currency.operatingExpenses, currency.id); money(tr("الفواتير المدفوعة", "Paid invoices", "Factures payées"), currency.paidInvoices, currency.id); money(tr("الفواتير المستحقة", "Outstanding invoices", "Factures impayées"), currency.outstandingInvoices, currency.id); money(tr("الفواتير المتأخرة", "Overdue invoices", "Factures en retard"), currency.overdueInvoices, currency.id)
                    }
                } }
                Section {
                    Button(tr("إعداد PDF للمشاركة", "Prepare PDF to share", "Préparer le PDF à partager"), systemImage: "square.and.arrow.up") { export(report) }
                    if let exportURL { ShareLink(item: exportURL, preview: SharePreview("THE SFM \(product.capitalized) \(period)")) { Label(tr("مشاركة PDF", "Share PDF", "Partager le PDF"), systemImage: "square.and.arrow.up") } }
                }
            }
        }
        .navigationTitle(product == "finance" ? tr("مركز التقارير", "Reports Center", "Centre des rapports") : tr("عمليات الأعمال", "Business operations", "Opérations d’affaires"))
        .task { await load() }
        .onChange(of: auth.identityRevision) { _, _ in report = nil; exportURL = nil }
    }

    @ViewBuilder private func money(_ title: String, _ value: Double, _ currency: String) -> some View { LabeledContent(title, value: "\(value.formatted(.number.precision(.fractionLength(0...3)))) \(currency)") }
    private func changeMonth(_ offset: Int) {
        let values = period.split(separator: "-").compactMap { Int($0) }
        guard values.count == 2, let date = Calendar(identifier: .gregorian).date(from: DateComponents(year: values[0], month: values[1])), let next = Calendar(identifier: .gregorian).date(byAdding: .month, value: offset, to: date) else { return }
        period = String(Calendar(identifier: .gregorian).component(.year, from: next)) + "-" + String(format: "%02d", Calendar(identifier: .gregorian).component(.month, from: next)); exportURL = nil
    }
    @MainActor private func load() async {
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }
        let revision = auth.identityRevision; isLoading = true; failed = false; defer { isLoading = false }
        do {
            var loaded: [String: [[String: MobileValue]]] = [:]; var partial = false
            for resource in resourceIDs {
                var rows: [[String: MobileValue]] = []; var cursor: String?; var pages = 0
                repeat {
                    var components = URLComponents(); components.path = "/api/mobile/\(product)/records/\(resource)"; components.queryItems = [URLQueryItem(name: "limit", value: "100")]
                    if let cursor { components.queryItems?.append(URLQueryItem(name: "cursor", value: cursor)) }
                    let page: MobileRecordPage = try await APIClient.authorized(accessToken: token).get(components.string!)
                    rows.append(contentsOf: page.records); cursor = page.nextCursor; pages += 1
                } while cursor != nil && pages < 8
                partial = partial || cursor != nil; loaded[resource] = rows
            }
            guard revision == auth.identityRevision, auth.isAuthenticated, !auth.isDeviceLocked else { return }
            report = MobileMonthlyReport.make(product: product, period: period, records: loaded, isPartial: partial); exportURL = nil
        } catch { failed = true }
    }
    @MainActor private func export(_ report: MobileMonthlyReport) {
        do { exportURL = try MobileReportPDF.create(report: report, language: language) } catch { failed = true }
    }
}

private enum MobileReportPDF {
    static func create(report: MobileMonthlyReport, language: String) throws -> URL {
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("the-sfm-\(report.product)-\(report.period)-report.pdf")
        try? FileManager.default.removeItem(at: file)
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: 612, height: 792))
        try renderer.writePDF(to: file) { context in
            context.beginPage(); var y: CGFloat = 42
            let title = "THE SFM \(report.product.capitalized) — \(report.period)"
            draw(title, at: &y, font: .boldSystemFont(ofSize: 18))
            draw(language == "ar" ? "ملخص من سجلات الحساب المحمّلة فقط. العملات منفصلة." : language == "fr" ? "Synthèse tirée uniquement des enregistrements chargés. Les devises restent séparées." : "Summary derived only from loaded account records. Currencies remain separate.", at: &y, font: .systemFont(ofSize: 10))
            if report.isPartial { draw(language == "ar" ? "تنبيه: قد يكون التقرير جزئياً؛ تم تحميل أول 800 سجل فقط لكل قسم." : language == "fr" ? "Attention : le rapport peut être partiel ; seuls les 800 premiers enregistrements par section ont été chargés." : "Notice: this report may be partial; only the first 800 records in each section were loaded.", at: &y, font: .systemFont(ofSize: 10)) }
            for value in report.counts { draw("\(mobileReportLabel(value.0, language: language)): \(value.1)", at: &y, font: .systemFont(ofSize: 11)) }
            if report.undatedRecords > 0 { draw("Undated records: \(report.undatedRecords)", at: &y, font: .systemFont(ofSize: 11)) }
            for currency in report.currencies {
                if y > 690 { context.beginPage(); y = 42 }
                draw(currency.id, at: &y, font: .boldSystemFont(ofSize: 14))
                let lines = report.product == "finance" ? ["Received income: \(currency.receivedIncome)", "Expected income: \(currency.expectedIncome)", "Expenses: \(currency.expenses)", "Cash after expenses: \(currency.receivedIncome - currency.expenses)", "Savings added: \(currency.savings)", "Debt remaining: \(currency.debtOutstanding)"] : ["Completed sales: \(currency.completedSales)", "Pending sales: \(currency.pendingSales)", "Operating expenses: \(currency.operatingExpenses)", "Operating net: \(currency.completedSales - currency.operatingExpenses)", "Paid invoices: \(currency.paidInvoices)", "Outstanding invoices: \(currency.outstandingInvoices)", "Overdue invoices: \(currency.overdueInvoices)"]
                for line in lines { draw("\(line) \(currency.id)", at: &y, font: .systemFont(ofSize: 10)) }
            }
        }
        return file
    }
    private static func draw(_ value: String, at y: inout CGFloat, font: UIFont) {
        let rect = CGRect(x: 42, y: y, width: 528, height: 38)
        value.draw(in: rect, withAttributes: [.font: font, .foregroundColor: UIColor.label]); y += 19
    }
}

/// Shared native SwiftUI resource workflow driven by the same versioned API as Expo and Kotlin.
struct MobileRecordsView: View {
    let product: String
    @EnvironmentObject private var auth: AuthSessionStore
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("sfm-language") private var language = "ar"
    @AppStorage("sfm-theme") private var theme = "system"
    @State private var resources: [MobileResource] = []
    @State private var email = ""
    @State private var password = ""
    @State private var failed = false
    @State private var busy = false
    private var index: Int { language == "ar" ? 0 : language == "fr" ? 2 : 1 }
    private func tr(_ ar: String, _ en: String, _ fr: String) -> String { [ar, en, fr][index] }
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker(tr("اللغة", "Language", "Langue"), selection: $language) {
                        Text("العربية").tag("ar"); Text("English").tag("en"); Text("Français").tag("fr")
                    }
                    Picker(tr("المظهر", "Appearance", "Apparence"), selection: $theme) {
                        Text(tr("حسب الجهاز", "System", "Système")).tag("system")
                        Text(tr("نهاري", "Light", "Clair")).tag("light")
                        Text(tr("ليلي", "Dark", "Sombre")).tag("dark")
                    }
                }
                if !auth.isAuthenticated {
                    TextField(tr("البريد الإلكتروني", "Email", "E-mail"), text: $email).textInputAutocapitalization(.never).keyboardType(.emailAddress)
                    SecureField(tr("كلمة المرور", "Password", "Mot de passe"), text: $password)
                    Button(tr("تسجيل الدخول بحساب الموقع", "Sign in with website account", "Se connecter au compte du site")) { Task { await auth.signIn(email: email, password: password); password = ""; await load() } }.disabled(auth.isAuthenticating || email.isEmpty || password.isEmpty)
                } else if auth.isDeviceLocked {
                    Button(tr("فتح بقفل الجهاز", "Unlock with device security", "Déverrouiller avec l’appareil")) { Task { await auth.unlock(); if !auth.isDeviceLocked { await load() } } }
                } else {
                    ForEach(resources) { resource in
                        NavigationLink(resource.label[index]) { MobileRecordList(product: product, resource: resource, language: language).environmentObject(auth) }
                    }
                    Button(tr("تحديث", "Refresh", "Actualiser")) { Task { await load() } }.disabled(busy)
                }
                if busy { ProgressView() }
                if failed || auth.errorMessage != nil { Text(tr("تعذر الطلب. تحقق من الاتصال والصلاحيات ثم أعد المحاولة.", "Request failed. Check connection and permissions, then retry.", "Échec de la requête. Vérifiez la connexion et les droits, puis réessayez.")).foregroundStyle(.red) }
                if auth.isAuthenticated { Button(tr("تسجيل الخروج", "Sign out", "Déconnexion"), role: .destructive) { resources = []; auth.signOut() } }
            }
            .navigationTitle("THE SFM \(product.capitalized)")
            .task(id: auth.isDeviceLocked) { if auth.isAuthenticated && !auth.isDeviceLocked { await load() } }
        }
        .environment(\.layoutDirection, language == "ar" ? .rightToLeft : .leftToRight)
        .preferredColorScheme(theme == "system" ? nil : theme == "dark" ? .dark : .light)
        .onChange(of: scenePhase) { _, phase in if phase != .active { auth.lock() } }
        .fullScreenCover(isPresented: Binding(
            get: { auth.pendingMfaMethod != nil },
            set: { showing in if !showing { Task { await auth.cancelMfa() } } }
        )) {
            MfaVerificationView()
                .environmentObject(auth)
                .interactiveDismissDisabled()
        }
    }
    @MainActor private func load() async {
        let revision = auth.identityRevision
        guard auth.isAuthenticated, !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }
        busy = true; failed = false; defer { busy = false }
        do { let manifest: MobileManifest = try await APIClient.authorized(accessToken: token).get("/api/mobile/\(product)/manifest"); guard revision == auth.identityRevision && auth.isAuthenticated && !auth.isDeviceLocked else { return }; resources = manifest.resources }
        catch { failed = true }
    }
}

private struct MobileRecordList: View {
    let product: String
    let resource: MobileResource
    let language: String
    @EnvironmentObject private var auth: AuthSessionStore
    @State private var rows: [[String: MobileValue]] = []
    @State private var cursor: String?
    @State private var failed = false
    @State private var busy = false
    @State private var editor: RecordEditorSelection?
    @State private var deleting: [String: MobileValue]?
    @State private var attachmentRecordId: String?
    @State private var attachmentImporting = false
    @State private var businessDocumentUploading = false
    @Environment(\.openURL) private var openURL
    private var index: Int { language == "ar" ? 0 : language == "fr" ? 2 : 1 }
    private func tr(_ ar: String, _ en: String, _ fr: String) -> String { [ar, en, fr][index] }
    var body: some View {
        List {
            if auth.isDeviceLocked { Text(tr("الحساب مقفل", "Account locked", "Compte verrouillé")) }
            else {
                if failed { Text(tr("تعذر الطلب. أعد المحاولة.", "Request failed. Retry.", "Échec de la requête. Réessayez.")).foregroundStyle(.red) }
                if busy { ProgressView() }
                if rows.isEmpty && !busy { Text(tr("لا توجد سجلات.", "No records.", "Aucun enregistrement.")) }
                ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                    Section {
                        ForEach(resource.fields) { field in if let value = row[field.key], !value.text.isEmpty { LabeledContent(field.label[index], value: value.text) } }
                        if product == "finance", (resource.id == "income" || resource.id == "expenses"), let id = row["id"]?.string {
                            if let name = (resource.id == "income" ? row["attachment_name"]?.string : row["receipt_file_name"]?.string), !name.isEmpty {
                                LabeledContent(tr("مرفق", "Attachment", "Pièce jointe"), value: name)
                                Button(tr("عرض المرفق", "View attachment", "Voir la pièce jointe")) { Task { await openAttachment(id) } }.disabled(busy)
                                Button(tr("إزالة المرفق", "Remove attachment", "Supprimer la pièce jointe"), role: .destructive) { Task { await detachAttachment(id) } }.disabled(busy)
                            }
                            Button(tr("إرفاق ملف", "Attach file", "Joindre un fichier")) { attachmentRecordId = id; attachmentImporting = true }.disabled(busy)
                        }
                        if product == "business", resource.id == "documents", let id = row["id"]?.string {
                            Text(tr("مستند مشروع خاص من حسابك في الموقع.", "Private project document from your website account.", "Document de projet privé provenant de votre compte du site."))
                                .font(.footnote).foregroundStyle(.secondary)
                            Button(tr("عرض المستند", "View document", "Voir le document")) { Task { await openAttachment(id) } }.disabled(busy)
                        }
                        if resource.readOnly != true {
                            Button(tr("تعديل", "Edit", "Modifier")) { editor = RecordEditorSelection(row: row) }
                            Button(tr("حذف", "Delete", "Supprimer"), role: .destructive) { deleting = row }
                        }
                    }
                }
                if let cursor { Button(tr("تحميل المزيد", "Load more", "Charger la suite")) { Task { await load(cursor) } }.disabled(busy) }
            }
        }
        .navigationTitle(resource.label[index])
        .toolbar {
            if !auth.isDeviceLocked && product == "business" && resource.id == "documents" {
                Button(tr("رفع مستند", "Upload document", "Téléverser un document"), systemImage: "arrow.up.doc") { businessDocumentUploading = true }
            }
            if !auth.isDeviceLocked && resource.readOnly != true { Button(tr("إضافة", "Add", "Ajouter")) { editor = RecordEditorSelection(row: [:]) } }
        }
        .task { await load() }
        .refreshable { await load() }
        .fileImporter(isPresented: $attachmentImporting, allowedContentTypes: [.pdf, .png, .jpeg, .webP], allowsMultipleSelection: false) { result in
            let recordId = attachmentRecordId
            attachmentRecordId = nil
            guard let recordId, case let .success(urls) = result, let url = urls.first else { return }
            Task { await uploadAttachment(url, recordId: recordId) }
        }
        .onChange(of: auth.isDeviceLocked) { _, locked in if locked { editor = nil; deleting = nil; rows = [] } }
        .onChange(of: auth.identityRevision) { _, _ in editor = nil; deleting = nil; rows = [] }
        .sheet(item: $editor) { selection in MobileRecordEditor(resource: resource, row: selection.row, language: language) { values in
            try await mutate(selection.row["id"] == nil ? "POST" : "PATCH", body: values.merging(selection.row["id"].map { ["id": $0] } ?? [:], uniquingKeysWith: { _, new in new }))
            editor = nil; await load()
        } }
        .sheet(isPresented: $businessDocumentUploading) {
            MobileBusinessDocumentUpload(language: language) { await load() }
                .environmentObject(auth)
        }
        .confirmationDialog(tr("حذف السجل من حساب الموقع؟", "Delete from website account?", "Supprimer du compte du site ?"), isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } })) {
            Button(tr("حذف", "Delete", "Supprimer"), role: .destructive) { if let id = deleting?["id"] { Task { do { try await mutate("DELETE", body: ["id": id]); deleting = nil; await load() } catch { failed = true } } } }
        }
    }
    @MainActor private func load(_ after: String? = nil) async {
        let revision = auth.identityRevision
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }
        busy = true; failed = false; defer { busy = false }
        do {
            var components = URLComponents(); components.path = "/api/mobile/\(product)/records/\(resource.id)"; components.queryItems = [URLQueryItem(name: "limit", value: "50")]
            if let after { components.queryItems?.append(URLQueryItem(name: "cursor", value: after)) }
            let page: MobileRecordPage = try await APIClient.authorized(accessToken: token).get(components.string!)
            guard revision == auth.identityRevision && auth.isAuthenticated && !auth.isDeviceLocked else { return }
            rows = after == nil ? page.records : rows + page.records; cursor = page.nextCursor
        } catch { failed = true }
    }
    @MainActor private func mutate(_ method: String, body: [String: MobileValue]) async throws {
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { throw APIClientError.invalidResponse }
        try await APIClient.authorized(accessToken: token).send("/api/mobile/\(product)/records/\(resource.id)", method: method, body: JSONEncoder().encode(body))
    }
    @MainActor private func openAttachment(_ recordId: String) async {
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }
        busy = true; failed = false; defer { busy = false }
        do {
            let result: MobileAttachmentAccess = try await APIClient.authorized(accessToken: token).get(attachmentPath(recordId))
            guard result.attachment.url.scheme == "https", result.attachment.url.host != nil else { throw APIClientError.invalidResponse }
            openURL(result.attachment.url)
        } catch { failed = true }
    }
    @MainActor private func detachAttachment(_ recordId: String) async {
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }
        busy = true; failed = false; defer { busy = false }
        do {
            try await APIClient.authorized(accessToken: token).send(attachmentPath(recordId), method: "DELETE", body: Data())
            await load()
        } catch { failed = true }
    }
    @MainActor private func uploadAttachment(_ url: URL, recordId: String) async {
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }
        busy = true; failed = false; defer { busy = false }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            let values = try url.resourceValues(forKeys: [.contentTypeKey, .fileSizeKey])
            guard let contentType = values.contentType, [.pdf, .png, .jpeg, .webP].contains(where: { contentType.conforms(to: $0) }), let mimeType = contentType.preferredMIMEType, let size = values.fileSize, size > 0, size <= 10 * 1024 * 1024 else { throw APIClientError.invalidResponse }
            let data = try Data(contentsOf: url, options: .mappedIfSafe)
            guard data.count == size else { throw APIClientError.invalidResponse }
            try await APIClient.authorized(accessToken: token).upload("/api/mobile/finance/records/\(resource.id)/attachment", fields: ["recordId": recordId], file: MultipartFile(name: url.lastPathComponent, mimeType: mimeType, data: data))
            await load()
        } catch { failed = true }
    }
    private func attachmentPath(_ recordId: String) -> String {
        "/api/mobile/\(product)/records/\(resource.id)/attachment?recordId=\(recordId)"
    }
}
private struct MobileAttachmentAccess: Decodable { let attachment: MobileSignedAttachment }
private struct MobileSignedAttachment: Decodable { let url: URL }
private struct MobileProjectOption: Identifiable { let id: String; let name: String }
private struct MobileBusinessDocumentUpload: View {
    let language: String
    let saved: () async -> Void
    @EnvironmentObject private var auth: AuthSessionStore
    @Environment(\.dismiss) private var dismiss
    @State private var projects: [MobileProjectOption] = []
    @State private var projectId = ""
    @State private var title = ""
    @State private var category = "business_plan"
    @State private var notes = ""
    @State private var fileURL: URL?
    @State private var importing = false
    @State private var loading = false
    @State private var failed = false

    private let categories = ["business_plan", "contract", "license", "invoice", "receipt", "supplier", "employee", "report", "financial", "legal", "other"]
    private var index: Int { language == "ar" ? 0 : language == "fr" ? 2 : 1 }
    private func tr(_ ar: String, _ en: String, _ fr: String) -> String { [ar, en, fr][index] }
    private var acceptedTypes: [UTType] { ["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx", "xls", "xlsx"].compactMap { UTType(filenameExtension: $0) } }
    private func categoryLabel(_ value: String) -> String {
        let labels: [String: [String]] = [
            "business_plan": ["خطة عمل", "Business plan", "Plan d'affaires"], "contract": ["عقد", "Contract", "Contrat"], "license": ["ترخيص", "License", "Licence"], "invoice": ["فاتورة", "Invoice", "Facture"], "receipt": ["إيصال", "Receipt", "Reçu"], "supplier": ["مورد", "Supplier", "Fournisseur"], "employee": ["موظف", "Employee", "Employé"], "report": ["تقرير", "Report", "Rapport"], "financial": ["مالي", "Financial", "Financier"], "legal": ["قانوني", "Legal", "Juridique"], "other": ["أخرى", "Other", "Autre"],
        ]
        return labels[value]?[index] ?? labels["other"]![index]
    }

    var body: some View {
        NavigationStack {
            Form {
                if loading { ProgressView() }
                if projects.isEmpty && !loading { Text(tr("لا توجد مشاريع. أنشئ مشروعاً من حساب الموقع أولاً.", "No projects are available. Create a project in your website account first.", "Aucun projet disponible. Créez d'abord un projet dans votre compte web.")) }
                else { Picker(tr("المشروع", "Project", "Projet"), selection: $projectId) { ForEach(projects, id: \.id) { Text($0.name).tag($0.id) } } }
                TextField(tr("عنوان المستند", "Document title", "Titre du document"), text: $title)
                Picker(tr("التصنيف", "Category", "Catégorie"), selection: $category) { ForEach(categories, id: \.self) { Text(categoryLabel($0)).tag($0) } }
                TextField(tr("ملاحظات", "Notes", "Notes"), text: $notes, axis: .vertical).lineLimit(2...5)
                Button(fileURL == nil ? tr("اختيار ملف", "Choose file", "Choisir un fichier") : fileURL!.lastPathComponent, systemImage: "doc") { importing = true }.disabled(loading)
                if failed { Text(tr("تعذر رفع المستند. تحقق من الملف والصلاحية وحاول مجدداً.", "The document could not be uploaded. Check the file and permissions, then try again.", "Impossible de téléverser le document. Vérifiez le fichier et les droits puis réessayez.")).foregroundStyle(.red) }
            }
            .navigationTitle(tr("رفع مستند", "Upload document", "Téléverser un document"))
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button(tr("رفع", "Upload", "Téléverser")) { Task { await upload() } }.disabled(loading || projectId.isEmpty || title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || fileURL == nil) }
                ToolbarItem(placement: .cancellationAction) { Button(tr("إلغاء", "Cancel", "Annuler")) { dismiss() }.disabled(loading) }
            }
        }
        .task { await loadProjects() }
        .fileImporter(isPresented: $importing, allowedContentTypes: acceptedTypes, allowsMultipleSelection: false) { result in
            if case let .success(urls) = result { fileURL = urls.first }
        }
    }

    @MainActor private func loadProjects() async {
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }
        loading = true; failed = false; defer { loading = false }
        do {
            let page: MobileRecordPage = try await APIClient.authorized(accessToken: token).get("/api/mobile/business/records/projects?limit=100")
            projects = page.records.compactMap { row in guard let id = row["id"]?.string else { return nil }; return MobileProjectOption(id: id, name: row["name"]?.string ?? id) }
            projectId = projects.first?.id ?? ""
        } catch { failed = true }
    }

    @MainActor private func upload() async {
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken(), let fileURL else { return }
        loading = true; failed = false; defer { loading = false }
        let scoped = fileURL.startAccessingSecurityScopedResource()
        defer { if scoped { fileURL.stopAccessingSecurityScopedResource() } }
        do {
            let values = try fileURL.resourceValues(forKeys: [.contentTypeKey, .fileSizeKey])
            guard let contentType = values.contentType, acceptedTypes.contains(where: { contentType.conforms(to: $0) }), let mimeType = contentType.preferredMIMEType, let size = values.fileSize, size > 0, size <= 10 * 1024 * 1024 else { throw APIClientError.invalidResponse }
            let data = try Data(contentsOf: fileURL, options: .mappedIfSafe)
            guard data.count == size else { throw APIClientError.invalidResponse }
            try await APIClient.authorized(accessToken: token).upload("/api/mobile/business/records/documents/attachment", fields: ["projectId": projectId, "title": title.trimmingCharacters(in: .whitespacesAndNewlines), "category": category, "notes": notes.trimmingCharacters(in: .whitespacesAndNewlines)], file: MultipartFile(name: fileURL.lastPathComponent, mimeType: mimeType, data: data))
            await saved(); dismiss()
        } catch { failed = true }
    }
}
private struct RecordEditorSelection: Identifiable { let id = UUID(); let row: [String: MobileValue] }
private struct MobileRecordEditor: View {
    let resource: MobileResource
    let row: [String: MobileValue]
    let language: String
    let save: ([String: MobileValue]) async throws -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var values: [String: String] = [:]
    @State private var failed = false
    @State private var busy = false
    private var index: Int { language == "ar" ? 0 : language == "fr" ? 2 : 1 }
    var body: some View {
        NavigationStack { Form {
            ForEach(resource.fields) { field in
                let binding = Binding(get: { values[field.key] ?? "" }, set: { values[field.key] = $0 })
                if field.type == "choice" { Picker(field.label[index], selection: binding) { ForEach(field.options ?? [], id: \.self) { Text($0).tag($0) } } }
                else if field.type == "boolean" { Toggle(field.label[index], isOn: Binding(get: { values[field.key] == "true" }, set: { values[field.key] = $0 ? "true" : "false" })) }
                else { TextField(field.label[index] + (field.required == true ? " *" : "") + (field.type == "date" ? " (YYYY-MM-DD)" : ""), text: binding).keyboardType(field.type == "number" ? .decimalPad : .default) }
            }
            if failed { Text(["تحقق من القيم والاتصال.", "Check values and connection.", "Vérifiez les valeurs et la connexion."][index]).foregroundStyle(.red) }
            Button(["حفظ", "Save", "Enregistrer"][index]) { Task { await submit() } }.disabled(busy)
            Button(["إلغاء", "Cancel", "Annuler"][index]) { dismiss() }.disabled(busy)
        }.navigationTitle(resource.label[index]) }.onAppear { if values.isEmpty { values = Dictionary(uniqueKeysWithValues: resource.fields.map { field in (field.key, row[field.key]?.editableText ?? field.options?.first ?? "") }) } }
    }
    @MainActor private func submit() async {
        var body: [String: MobileValue] = [:]; failed = false
        for field in resource.fields {
            let raw = (values[field.key] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if raw.isEmpty { if field.required == true { failed = true; return }; continue }
            if field.type == "number" { guard let number = Double(raw), number.isFinite, number >= 0 else { failed = true; return }; body[field.key] = .number(number) }
            else if field.type == "boolean" { body[field.key] = .bool(raw == "true") }
            else { body[field.key] = .text(field.type == "currency" ? raw.uppercased() : raw) }
        }
        busy = true; defer { busy = false }
        do { try await save(body) } catch { failed = true }
    }
}
