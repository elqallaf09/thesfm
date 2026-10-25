import SwiftUI

private struct MobileTeam: Decodable, Identifiable { let id: String; let name: String; let owner_id: String }
private struct MobileTeamMember: Decodable, Identifiable { let user_id: String; let role: String; let display_name: String; var id: String { user_id } }
private struct MobileTeamNote: Decodable, Identifiable { let id: String; let author_id: String; let body: String; let created_at: String }
private struct MobileTeamTask: Decodable, Identifiable { let id: String; let title: String; let status: String; let due_date: String?; let author_id: String; let assignee_id: String? }
private struct MobileTeamsResponse: Decodable { let teams: [MobileTeam] }
private struct MobileTeamDetail: Decodable { let viewerId: String; let team: MobileTeam; let members: [MobileTeamMember]; let notes: [MobileTeamNote]; let tasks: [MobileTeamTask] }
private struct MobileTeamAction: Encodable { let action: String; let teamId: String?; let nickname: String?; let value: String?; let taskId: String?; let assigneeId: String?; let due: String? }
private struct MobileTeamActionResponse: Decodable { let result: MobileTeamActionResult? }
private struct MobileTeamActionResult: Decodable { let id: String?; let code: String? }

/// Native team collaboration via the existing MFA-gated, RLS-protected RPCs.
struct MobileTeamsView: View {
    @EnvironmentObject private var auth: AuthSessionStore
    @AppStorage("sfm-language") private var language = "ar"
    @State private var teams: [MobileTeam] = []
    @State private var detail: MobileTeamDetail?
    @State private var nickname = ""
    @State private var name = ""
    @State private var inviteCode = ""
    @State private var note = ""
    @State private var task = ""
    @State private var taskAssignee = ""
    @State private var taskDue = ""
    @State private var invitation = ""
    @State private var invitationTeamId = ""
    @State private var loading = false
    @State private var failed = false

    private var index: Int { language == "ar" ? 0 : language == "fr" ? 2 : 1 }
    private var owner: Bool { detail.map { $0.team.owner_id == $0.viewerId } ?? false }
    private var disabled: Bool { loading || auth.isDeviceLocked }
    private func tr(_ ar: String, _ en: String, _ fr: String) -> String { [ar, en, fr][index] }
    private func taskLabel(_ status: String) -> String {
        switch status {
        case "todo": return tr("قيد الانتظار", "To do", "À faire")
        case "doing": return tr("قيد التنفيذ", "In progress", "En cours")
        default: return tr("مكتملة", "Done", "Terminée")
        }
    }

    var body: some View {
        NavigationStack { Form {
            Section { Text(tr("لا تُشارك إلا الملاحظات والمهام التي تنشرها؛ تبقى سجلاتك المالية خاصة.", "Only notes and tasks you publish are shared; financial records stay private.", "Seules vos notes et tâches publiées sont partagées ; vos dossiers financiers restent privés.")).font(.footnote) } header: { Text(tr("فرق العمل", "Teams", "Équipes")) }
            if failed { ContentUnavailableView(tr("تعذّر تحميل الفرق", "Could not load teams", "Impossible de charger les équipes"), systemImage: "wifi.exclamationmark") }
            Section(tr("إنشاء فريق أو الانضمام", "Create or join", "Créer ou rejoindre")) {
                TextField(tr("اسمك في الفريق", "Your team name", "Votre nom"), text: $nickname)
                TextField(tr("اسم الفريق", "Team name", "Nom de l'équipe"), text: $name)
                Button(tr("إنشاء فريق", "Create team", "Créer une équipe")) { Task { await action("create", name) } }.disabled(disabled || nickname.count < 2 || name.count < 2)
                TextField(tr("رمز الدعوة", "Invitation code", "Code d'invitation"), text: $inviteCode).textInputAutocapitalization(.never)
                Button(tr("انضمام", "Join", "Rejoindre")) { Task { await action("join", inviteCode) } }.disabled(disabled || nickname.count < 2 || inviteCode.isEmpty)
            }
            Section(tr("فرقك", "Your teams", "Vos équipes")) {
                if teams.isEmpty && !loading { Text(tr("لا توجد فرق بعد.", "No teams yet.", "Aucune équipe.")) }
                ForEach(teams) { team in Button(team.name) { Task { await load(team.id) } } }
            }
            if let detail {
                Section(detail.team.name) {
                    Button(tr("تحديث", "Refresh", "Actualiser")) { Task { await load(detail.team.id) } }
                    Text(tr("الأعضاء", "Members", "Membres")).font(.headline)
                    ForEach(detail.members) { member in HStack {
                        VStack(alignment: .leading) { Text(member.display_name); Text(member.role == "owner" ? tr("المالك", "Owner", "Propriétaire") : tr("عضو", "Member", "Membre")).font(.caption).foregroundStyle(.secondary) }
                        Spacer()
                        if owner && member.role != "owner" { Button(tr("إزالة", "Remove", "Retirer"), role: .destructive) { Task { await action("remove_member", member.user_id) } }.disabled(disabled) }
                    } }
                    if owner {
                        Button(tr("إنشاء دعوة", "Create invitation", "Créer une invitation")) { Task { await action("invite") } }.disabled(disabled)
                        if !invitation.isEmpty && invitationTeamId == detail.team.id { Text(tr("شارك هذا الرمز مع الشخص المقصود فقط. يُستخدم مرة واحدة وينتهي خلال 7 أيام.", "Share this code only with the intended person. It works once and expires after 7 days.", "Partagez ce code uniquement avec la personne concernée. Il est à usage unique et expire après 7 jours.")).font(.footnote); Text(invitation).textSelection(.enabled).font(.footnote.monospaced()) }
                        Button(tr("إلغاء الدعوات المعلقة", "Revoke pending invitations", "Révoquer les invitations"), role: .destructive) { Task { await action("revoke_invites") } }.disabled(disabled)
                    } else {
                        Button(tr("مغادرة الفريق", "Leave team", "Quitter l'équipe"), role: .destructive) { Task { if await action("leave") { self.detail = nil } } }.disabled(disabled)
                    }
                }
                Section(tr("الملاحظات", "Notes", "Notes")) {
                    TextField(tr("ملاحظة للفريق", "Team note", "Note d'équipe"), text: $note, axis: .vertical)
                    Button(tr("نشر", "Post", "Publier")) { Task { if await action("note", note) { note = "" } } }.disabled(disabled || note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    ForEach(detail.notes) { item in VStack(alignment: .leading, spacing: 4) {
                        Text(item.body); Text(item.created_at).font(.caption).foregroundStyle(.secondary)
                        if owner || item.author_id == detail.viewerId { Button(tr("حذف", "Delete", "Supprimer"), role: .destructive) { Task { await action("delete_note", item.id) } }.disabled(disabled) }
                    } }
                }
                Section(tr("مهام الفريق", "Team tasks", "Tâches")) {
                    TextField(tr("مهمة", "Task", "Tâche"), text: $task)
                    Picker(tr("المكلّف", "Assignee", "Responsable"), selection: $taskAssignee) { Text(tr("غير مكلّفة", "Unassigned", "Non attribuée")).tag(""); ForEach(detail.members) { member in Text(member.display_name).tag(member.user_id) } }
                    TextField(tr("تاريخ الاستحقاق (YYYY-MM-DD، اختياري)", "Due date (YYYY-MM-DD, optional)", "Échéance (AAAA-MM-JJ, facultatif)"), text: $taskDue).textInputAutocapitalization(.never)
                    Button(tr("إضافة مهمة", "Add task", "Ajouter")) { Task { if await action("task_create", task, assigneeId: taskAssignee.isEmpty ? nil : taskAssignee, due: taskDue.isEmpty ? nil : taskDue) { task = "" } } }.disabled(disabled || task.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    ForEach(detail.tasks) { item in VStack(alignment: .leading, spacing: 5) {
                        Text(item.title); Text(taskLabel(item.status) + (item.due_date.map { " · \($0)" } ?? "")).font(.caption).foregroundStyle(.secondary)
                        if let assignee = item.assignee_id { Text("\(tr("المكلّف:", "Assignee:", "Responsable :")) \(detail.members.first(where: { $0.user_id == assignee })?.display_name ?? "-")").font(.caption) }
                        if owner || item.author_id == detail.viewerId || item.assignee_id == detail.viewerId { Picker(tr("الحالة", "Status", "Statut"), selection: Binding(get: { item.status }, set: { value in Task { await action("task_status", value, taskId: item.id) } })) { Text(taskLabel("todo")).tag("todo"); Text(taskLabel("doing")).tag("doing"); Text(taskLabel("done")).tag("done") }.disabled(disabled) }
                        if owner || item.author_id == detail.viewerId { Button(tr("حذف", "Delete", "Supprimer"), role: .destructive) { Task { await action("task_delete", taskId: item.id) } }.disabled(disabled) }
                    } }
                }
            }
            if loading { Section { ProgressView() } }
        }.navigationTitle(tr("فرق العمل", "Teams", "Équipes")).task { await load() }.refreshable { await load(detail?.team.id) } }
    }

    @MainActor private func load(_ teamId: String? = nil) async {
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return }
        loading = true; failed = false; defer { loading = false }
        do {
            let client = APIClient.authorized(accessToken: token)
            let list: MobileTeamsResponse = try await client.get("/api/mobile/business/teams")
            teams = list.teams
            if let teamId { detail = try await client.get("/api/mobile/business/teams?teamId=\(teamId)") }
        } catch { failed = true }
    }

    @MainActor @discardableResult private func action(_ action: String, _ value: String = "", taskId: String? = nil, assigneeId: String? = nil, due: String? = nil) async -> Bool {
        guard !auth.isDeviceLocked, let token = await auth.validAccessToken() else { return false }
        loading = true; failed = false; defer { loading = false }
        do {
            let body = try JSONEncoder().encode(MobileTeamAction(action: action, teamId: detail?.team.id, nickname: nickname, value: value, taskId: taskId, assigneeId: assigneeId, due: due))
            let response: MobileTeamActionResponse = try await APIClient.authorized(accessToken: token).send("/api/mobile/business/teams", method: "POST", body: body, as: MobileTeamActionResponse.self)
            if action == "invite" { invitation = response.result?.code ?? ""; invitationTeamId = detail?.team.id ?? "" }
            if action == "revoke_invites" { invitation = ""; invitationTeamId = "" }
            let selected = action == "create" || action == "join" ? response.result?.id : action == "leave" ? nil : detail?.team.id
            await load(selected)
            return true
        } catch { failed = true; return false }
    }
}
