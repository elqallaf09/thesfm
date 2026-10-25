import SwiftUI

private struct MobileDecisionAnalysis: Codable { let score: Double?; let status: String?; let netAfterDecision: Double?; let savingsAfterDecision: Double?; let missingData: [String]?; let riskFlags: [String]? }
private struct MobileDecision: Codable, Identifiable { let id: String; let decision_title: String?; let estimated_cost: Double?; let currency: String?; let status: String?; let created_at: String?; let analysis: MobileDecisionAnalysis? }
private struct MobileDecisionPage: Decodable { var decisions: [MobileDecision]; let canWrite: Bool; let canDelete: Bool }
private struct MobileDecisionInput: Encodable { let title: String; let decisionType: String; let estimatedCost: Double; let monthlyImpact: Double; let expectedBenefit: String; let riskLevel: String; let targetDate: String?; let notes: String; let currency: String; let locale: String }
private struct MobileDecisionSaved: Decodable { let decision: MobileDecision; let analysis: MobileDecisionAnalysis }
private struct MobileDecisionAccount: Decodable { let profile: MobileDecisionProfile? }
private struct MobileDecisionProfile: Decodable { let preferred_currency: String?; let default_currency: String? }

/// Business decisions call the MFA/RLS-protected endpoint; raw account rows never persist on-device.
struct MobileDecisionsView: View {
    @EnvironmentObject private var auth: AuthSessionStore
    @AppStorage("sfm-language") private var language = "ar"
    @State private var page: MobileDecisionPage?
    @State private var title = ""; @State private var type = "purchase"; @State private var cost = ""; @State private var monthlyImpact = ""; @State private var benefit = ""; @State private var risk = "medium"; @State private var targetDate = ""; @State private var notes = ""
    @State private var currency = "KWD"; @State private var analysis: MobileDecisionAnalysis?; @State private var selectedID = ""; @State private var deleteCandidate: MobileDecision?; @State private var loading = false; @State private var failed = false

    private var index: Int { language == "ar" ? 0 : language == "fr" ? 2 : 1 }
    private func tr(_ ar: String, _ en: String, _ fr: String) -> String { [ar, en, fr][index] }
    private var disabled: Bool { loading || auth.isDeviceLocked }
    private var types: [(String, String)] { [("purchase", tr("شراء", "Purchase", "Achat")), ("investment", tr("استثمار", "Investment", "Investissement")), ("project", tr("مشروع", "Project", "Projet")), ("debt_saving", tr("قرض / دين", "Loan / debt", "Prêt / dette")), ("charity_zakat", tr("زكاة / صدقة", "Zakat / charity", "Zakat / charité")), ("budget", tr("ميزانية", "Budget", "Budget"))] }
    private var riskScore: String { guard let score = analysis?.score else { return "-" }; return "\(Int(max(0, min(100, 100 - score)).rounded()))%" }
    private var statusLabel: String { switch analysis?.status { case "initially_suitable": return tr("مناسب مبدئيًا", "Initially suitable", "Adaptée initialement"); case "high_risk": return tr("مخاطر مرتفعة", "High risk", "Risque élevé"); case "needs_review": return tr("تحتاج مراجعة", "Needs review", "À examiner"); default: return tr("بيانات غير كافية", "Insufficient data", "Données insuffisantes") } }

    var body: some View {
        NavigationStack { Form {
            Section { Text(tr("يدخل القرار فقط من هاتفك؛ بيانات الحساب الحية تُحلل في الخادم المحمي ولا تحفظ في الجهاز.", "Only the decision leaves your phone; live account data is analyzed on the protected server.", "Seule la décision quitte le téléphone ; les données du compte sont analysées sur le serveur protégé.")).font(.footnote) } header: { Text(tr("مركز القرارات", "Decision center", "Centre de décisions")) }
            if failed { ContentUnavailableView(tr("تعذر تحميل القرارات", "Could not load decisions", "Impossible de charger les décisions"), systemImage: "wifi.exclamationmark") }
            if page?.canWrite == true { Section(tr("حلل قرارًا", "Analyze a decision", "Analyser une décision")) {
                TextField(tr("عنوان القرار", "Decision title", "Titre de la décision"), text: $title)
                Picker(tr("نوع القرار", "Decision type", "Type de décision"), selection: $type) { ForEach(types, id: \.0) { Text($0.1).tag($0.0) } }
                TextField(tr("التكلفة المقدرة", "Estimated cost", "Coût estimé"), text: $cost).keyboardType(.decimalPad)
                TextField(tr("الأثر الشهري", "Monthly impact", "Impact mensuel"), text: $monthlyImpact).keyboardType(.decimalPad)
                TextField(tr("الفائدة المتوقعة %", "Expected benefit %", "Bénéfice attendu %"), text: $benefit).keyboardType(.decimalPad)
                Picker(tr("مستوى المخاطر", "Risk level", "Niveau de risque"), selection: $risk) { Text(tr("منخفض", "Low", "Faible")).tag("low"); Text(tr("متوسط", "Medium", "Moyen")).tag("medium"); Text(tr("مرتفع", "High", "Élevé")).tag("high") }
                TextField(tr("التاريخ المستهدف YYYY-MM-DD", "Target date YYYY-MM-DD", "Date cible AAAA-MM-JJ"), text: $targetDate).textInputAutocapitalization(.never)
                TextField(tr("ملاحظات", "Notes", "Notes"), text: $notes, axis: .vertical)
                Text(tr("عملة الحساب: ", "Account currency: ", "Devise du compte : ") + currency).font(.footnote).foregroundStyle(.secondary)
                Button(tr("حلل واحفظ", "Analyze and save", "Analyser et enregistrer")) { Task { await save() } }.disabled(disabled || title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || Double(cost) == nil || (Double(cost) ?? 0) <= 0)
            } } else if page != nil { Section { Text(tr("لا تملك صلاحية تحرير قرارات الأعمال.", "You do not have permission to edit business decisions.", "Vous n’avez pas le droit de modifier les décisions professionnelles.")) } }
            Section(tr("نتيجة التحليل", "Analysis result", "Résultat de l'analyse")) { if let analysis {
                Text(tr("المخاطر: ", "Risk: ", "Risque : ") + riskScore); Text(tr("الحالة: ", "Status: ", "Statut : ") + statusLabel); metric(tr("الصافي بعد القرار", "Net after decision", "Solde après décision"), analysis.netAfterDecision); metric(tr("المدخرات بعد القرار", "Savings after decision", "Épargne après décision"), analysis.savingsAfterDecision)
                if let missing = analysis.missingData, !missing.isEmpty { Text(tr("بيانات ناقصة: ", "Missing data: ", "Données manquantes : ") + missing.joined(separator: ", ")).font(.footnote).foregroundStyle(.secondary) }
                if let flags = analysis.riskFlags, !flags.isEmpty { Text(tr("تنبيهات: ", "Warnings: ", "Alertes : ") + flags.joined(separator: ", ")).font(.footnote).foregroundStyle(.secondary) }
            } else { Text(tr("أدخل قرارًا لتحليل أثره من بيانات حسابك.", "Enter a decision to analyze its impact using your account data.", "Saisissez une décision pour analyser son impact avec les données de votre compte.")).foregroundStyle(.secondary) } }
            Section(tr("القرارات السابقة", "Previous decisions", "Décisions précédentes")) { if let decisions = page?.decisions, !decisions.isEmpty { ForEach(decisions) { decision in VStack(alignment: .leading, spacing: 5) {
                let itemTitle = decision.decision_title ?? "-"
                let itemAmount = money(decision.estimated_cost, currency: decision.currency ?? currency)
                Button { selectedID = decision.id; analysis = decision.analysis } label: { VStack(alignment: .leading, spacing: 3) { Text(itemTitle); Text(itemAmount).font(.caption).foregroundStyle(.secondary) } }.buttonStyle(.plain)
                Text((decision.status ?? "-") + decisionDate(decision.created_at)).font(.caption).foregroundStyle(.secondary)
                if page?.canDelete == true { Button(tr("حذف", "Delete", "Supprimer"), role: .destructive) { deleteCandidate = decision }.disabled(disabled) }
            }.listRowBackground(selectedID == decision.id ? Color.accentColor.opacity(0.12) : nil) } } else { Text(tr("لا توجد قرارات محفوظة بعد.", "No saved decisions yet.", "Aucune décision enregistrée.")).foregroundStyle(.secondary) } }
            if loading { Section { ProgressView() } }
        }.navigationTitle(tr("القرارات", "Decisions", "Décisions")).task(id: auth.accessToken) { page = nil; analysis = nil; selectedID = ""; await load() }.refreshable { await load() }
        .confirmationDialog(tr("حذف القرار؟", "Delete decision?", "Supprimer la décision ?"), item: $deleteCandidate) { decision in Button(tr("حذف نهائي", "Delete permanently", "Supprimer définitivement"), role: .destructive) { Task { await remove(decision) } } } message: { Text(tr("سيحذف من حسابك ولا يمكن التراجع عن ذلك.", "It will be removed from your account and cannot be undone.", "Elle sera supprimée de votre compte et ne pourra pas être restaurée.")) }
        }
    }

    @ViewBuilder private func metric(_ label: String, _ value: Double?) -> some View { Text(label + ": " + (value.map { money($0, currency: currency) } ?? "-")) }
    private func decisionDate(_ value: String?) -> String { value.map { " · " + String($0.prefix(10)) } ?? "" }
    private func money(_ value: Double?, currency: String) -> String { guard let value else { return "-" }; return value.formatted(.currency(code: currency)) }
    @MainActor private func load() async { guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }; loading = true; failed = false; defer { loading = false }; do { async let decisions: MobileDecisionPage = APIClient.authorized(accessToken: token).get("/api/mobile/business/decisions"); async let account: MobileDecisionAccount = APIClient.authorized(accessToken: token).get("/api/mobile/account"); let (nextPage, nextAccount) = try await (decisions, account); page = nextPage; currency = nextAccount.profile?.preferred_currency ?? nextAccount.profile?.default_currency ?? "KWD"; if let first = nextPage.decisions.first { selectedID = first.id; analysis = first.analysis } } catch { failed = true } }
    @MainActor private func save() async { guard !auth.isDeviceLocked, let token = await auth.validAccessToken(), let estimatedCost = Double(cost), estimatedCost > 0, page?.canWrite == true else { return }; loading = true; failed = false; defer { loading = false }; do { let body = MobileDecisionInput(title: title.trimmingCharacters(in: .whitespacesAndNewlines), decisionType: type, estimatedCost: estimatedCost, monthlyImpact: max(0, Double(monthlyImpact) ?? 0), expectedBenefit: benefit, riskLevel: risk, targetDate: targetDate.isEmpty ? nil : targetDate, notes: notes, currency: currency, locale: language); let result: MobileDecisionSaved = try await APIClient.authorized(accessToken: token).send("/api/mobile/business/decisions", method: "POST", body: JSONEncoder().encode(body), as: MobileDecisionSaved.self); page?.decisions.removeAll { $0.id == result.decision.id }; page?.decisions.insert(result.decision, at: 0); selectedID = result.decision.id; analysis = result.analysis; title = ""; cost = ""; monthlyImpact = ""; benefit = ""; targetDate = ""; notes = "" } catch { failed = true } }
    @MainActor private func remove(_ decision: MobileDecision) async { guard !auth.isDeviceLocked, let token = await auth.validAccessToken(), page?.canDelete == true else { return }; loading = true; failed = false; defer { loading = false }; do { let body = try JSONSerialization.data(withJSONObject: ["id": decision.id]); try await APIClient.authorized(accessToken: token).send("/api/mobile/business/decisions", method: "DELETE", body: body); page?.decisions.removeAll { $0.id == decision.id }; if selectedID == decision.id { selectedID = ""; analysis = nil } } catch { failed = true } }
}
