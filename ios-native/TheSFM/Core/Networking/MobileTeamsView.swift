import SwiftUI

private struct MobileTeam: Decodable, Identifiable { let id: String; let name: String; let owner_id: String }
private struct MobileTeamMember: Decodable, Identifiable { let user_id: String; let role: String; let display_name: String; var id: String { user_id } }
private struct MobileTeamNote: Decodable, Identifiable { let id: String; let body: String; let created_at: String }
private struct MobileTeamTask: Decodable, Identifiable { let id: String; let title: String; let status: String; let due_date: String? }
private struct MobileTeamsResponse: Decodable { let teams: [MobileTeam] }
private struct MobileTeamDetail: Decodable { let team: MobileTeam; let members: [MobileTeamMember]; let notes: [MobileTeamNote]; let tasks: [MobileTeamTask] }
private struct MobileTeamAction: Encodable { let action: String; let teamId: String?; let nickname: String?; let value: String? }
private struct MobileTeamActionResponse: Decodable { let result: MobileTeamActionResult? }
private struct MobileTeamActionResult: Decodable { let id: String?; let code: String? }

/// Native team collaboration via the existing MFA-gated, RLS-protected RPCs.
struct MobileTeamsView: View {
    @EnvironmentObject private var auth: AuthSessionStore
    @AppStorage("sfm-language") private var language = "ar"
    @State private var teams: [MobileTeam] = []
    @State private var detail: MobileTeamDetail?
    @State private var nickname = ""; @State private var name = ""; @State private var inviteCode = ""; @State private var note = ""; @State private var task = ""
    @State private var invitation = ""; @State private var loading = false; @State private var failed = false
    private var index: Int { language == "ar" ? 0 : language == "fr" ? 2 : 1 }
    private func tr(_ ar: String, _ en: String, _ fr: String) -> String { [ar, en, fr][index] }
    var body: some View { NavigationStack { Form {
        Section { Text(tr("تتم مشاركة الملاحظات والمهام التي تنشرها فقط؛ تبقى سجلاتك المالية خاصة.", "Only notes and tasks you publish are shared; financial records stay private.", "Seules vos notes et tâches publiées sont partagées ; vos dossiers financiers restent privés.")).font(.footnote) } header: { Text(tr("فرق العمل", "Teams", "Équipes")) }
        if failed { ContentUnavailableView(tr("تعذر تحميل الفرق", "Could not load teams", "Impossible de charger les équipes"), systemImage: "wifi.exclamationmark") }
        Section(tr("إنشاء أو انضمام", "Create or join", "Créer ou rejoindre")) { TextField(tr("اسمك في الفريق", "Your team name", "Votre nom"), text: $nickname); TextField(tr("اسم الفريق", "Team name", "Nom de l’équipe"), text: $name); Button(tr("إنشاء فريق", "Create team", "Créer une équipe")) { Task { await action("create", name) } }.disabled(disabled || nickname.count < 2 || name.count < 2); TextField(tr("رمز الدعوة", "Invitation code", "Code d’invitation"), text: $inviteCode).textInputAutocapitalization(.never); Button(tr("انضمام", "Join", "Rejoindre")) { Task { await action("join", inviteCode) } }.disabled(disabled || inviteCode.isEmpty) }
        Section(tr("فرقك", "Your teams", "Vos équipes")) { if teams.isEmpty && !loading { Text(tr("لا توجد فرق بعد.", "No teams yet.", "Aucune équipe.")) }; ForEach(teams) { team in Button(team.name) { Task { await load(team.id) } } } }
        if let detail { Section(detail.team.name) { Button(tr("تحديث", "Refresh", "Actualiser")) { Task { await load(detail.team.id) } }; ForEach(detail.members) { member in LabeledContent(member.display_name, value: member.role) }; Button(tr("إنشاء دعوة", "Create invitation", "Créer une invitation")) { Task { await action("invite") } }.disabled(disabled); if !invitation.isEmpty { Text(invitation).textSelection(.enabled).font(.footnote.monospaced()) }; Button(tr("إلغاء الدعوات", "Revoke invitations", "Révoquer les invitations"), role: .destructive) { Task { await action("revoke_invites") } }.disabled(disabled); Button(tr("مغادرة الفريق", "Leave team", "Quitter l’équipe"), role: .destructive) { Task { await action("leave"); self.detail = nil } }.disabled(disabled) }
            Section(tr("ملاحظات", "Notes", "Notes")) { TextField(tr("ملاحظة للفريق", "Team note", "Note d’équipe"), text: $note, axis: .vertical); Button(tr("نشر", "Post", "Publier")) { Task { await action("note", note); note = "" } }.disabled(disabled || note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty); ForEach(detail.notes) { item in VStack(alignment: .leading) { Text(item.body); Text(item.created_at).font(.caption).foregroundStyle(.secondary) } } }
            Section(tr("المهام", "Tasks", "Tâches")) { TextField(tr("مهمة", "Task", "Tâche"), text: $task); Button(tr("إضافة مهمة", "Add task", "Ajouter")) { Task { await action("task_create", task); task = "" } }.disabled(disabled || task.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty); ForEach(detail.tasks) { item in LabeledContent(item.title, value: item.status + (item.due_date.map { " · \($0)" } ?? "")) } }
        }
        if loading { Section { ProgressView() } }
    }.navigationTitle(tr("فرق العمل", "Teams", "Équipes")).task { await load() }.refreshable { await load(detail?.team.id) } } }
    private var disabled: Bool { loading || auth.isDeviceLocked }
    @MainActor private func load(_ teamId: String? = nil) async { guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }; loading = true; failed = false; defer { loading = false }; do { let client = APIClient.authorized(accessToken: token); let list: MobileTeamsResponse = try await client.get("/api/mobile/business/teams"); teams = list.teams; if let teamId { let value: MobileTeamDetail = try await client.get("/api/mobile/business/teams?teamId=\(teamId)"); detail = value } } catch { failed = true } }
    @MainActor private func action(_ action: String, _ value: String = "") async { guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }; loading = true; failed = false; defer { loading = false }; do { let body = try JSONEncoder().encode(MobileTeamAction(action: action, teamId: detail?.team.id, nickname: nickname, value: value)); let response: MobileTeamActionResponse = try await APIClient.authorized(accessToken: token).send("/api/mobile/business/teams", method: "POST", body: body, as: MobileTeamActionResponse.self); if action == "invite" { invitation = response.result?.code ?? "" }; await load(detail?.team.id ?? response.result?.id) } catch { failed = true } }
}
