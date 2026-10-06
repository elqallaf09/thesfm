import SwiftUI

struct AppRouter: View {
    @EnvironmentObject private var authSession: AuthSessionStore

    var body: some View {
        Group {
            if authSession.isAuthenticated {
                if authSession.isDeviceLocked {
                    AppUnlockView()
                } else {
                    DashboardView()
                }
            } else {
                LoginView()
            }
        }
        .tint(AppTheme.Colors.accent)
    }
}

private struct AppUnlockView: View {
    @EnvironmentObject private var authSession: AuthSessionStore

    var body: some View {
        ZStack {
            AppTheme.Colors.background.ignoresSafeArea()

            VStack(alignment: .trailing, spacing: 20) {
                Image(systemName: "lock.shield.fill")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundStyle(AppTheme.Colors.accent)
                    .frame(maxWidth: .infinity, alignment: .trailing)

                Text("THE SFM Finance")
                    .font(.headline)
                    .foregroundStyle(AppTheme.Colors.accent)

                Text("تأكيد هويتك")
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(AppTheme.Colors.textPrimary)

                Text("نحمي ملخصك المالي عند عودة التطبيق من الخلفية.")
                    .font(.body)
                    .foregroundStyle(AppTheme.Colors.textSecondary)
                    .multilineTextAlignment(.trailing)

                Button {
                    Task { await authSession.unlock() }
                } label: {
                    Label("فتح التطبيق", systemImage: "faceid")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SFMPrimaryButtonStyle())
                .accessibilityHint("يستخدم Face ID أو رمز مرور الجهاز")

                if let errorMessage = authSession.errorMessage {
                    Text(errorMessage)
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.trailing)
                }

                Button("تسجيل الخروج", role: .destructive, action: authSession.signOut)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(24)
        }
    }
}
