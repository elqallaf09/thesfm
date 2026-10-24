import SwiftUI

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
        .toolbar { if !auth.isDeviceLocked && resource.readOnly != true { Button(tr("إضافة", "Add", "Ajouter")) { editor = RecordEditorSelection(row: [:]) } } }
        .task { await load() }
        .refreshable { await load() }
        .onChange(of: auth.isDeviceLocked) { _, locked in if locked { editor = nil; deleting = nil; rows = [] } }
        .onChange(of: auth.identityRevision) { _, _ in editor = nil; deleting = nil; rows = [] }
        .sheet(item: $editor) { selection in MobileRecordEditor(resource: resource, row: selection.row, language: language) { values in
            try await mutate(selection.row["id"] == nil ? "POST" : "PATCH", body: values.merging(selection.row["id"].map { ["id": $0] } ?? [:], uniquingKeysWith: { _, new in new }))
            editor = nil; await load()
        } }
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
