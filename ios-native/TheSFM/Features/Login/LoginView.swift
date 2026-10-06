import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var authSession: AuthSessionStore
    @State private var usernameOrEmail = ""
    @State private var password = ""

    var body: some View {
        ZStack {
            AppTheme.Colors.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .trailing, spacing: 24) {
                    VStack(alignment: .trailing, spacing: 10) {
                        Text("THE SFM Finance")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(AppTheme.Colors.accent)

                        Text("تسجيل الدخول")
                            .font(.system(size: 38, weight: .heavy, design: .rounded))
                            .foregroundStyle(AppTheme.Colors.textPrimary)

                        Text("ادخل إلى حسابك لإدارة أموالك والتزاماتك من التطبيق.")
                            .font(.system(size: 17, weight: .semibold, design: .rounded))
                            .foregroundStyle(AppTheme.Colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .trailing)

                    SFMCard {
                        VStack(alignment: .trailing, spacing: 16) {
                            TextField("البريد الإلكتروني", text: $usernameOrEmail)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .padding()
                                .background(AppTheme.Colors.elevatedSurface)
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                            SecureField("كلمة المرور", text: $password)
                                .textContentType(.password)
                                .padding()
                                .background(AppTheme.Colors.elevatedSurface)
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                            Button {
                                Task {
                                    await authSession.signIn(email: usernameOrEmail, password: password)
                                }
                            } label: {
                                Group {
                                    if authSession.isAuthenticating {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Label("تسجيل الدخول", systemImage: "arrow.left.circle.fill")
                                    }
                                }
                                .font(.system(size: 18, weight: .bold, design: .rounded))
                                .frame(maxWidth: .infinity)
                                .padding()
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(AppTheme.Colors.accent)
                            .disabled(authSession.isAuthenticating)

                            if let errorMessage = authSession.errorMessage {
                                Text(errorMessage)
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                                    .foregroundStyle(.red)
                                    .multilineTextAlignment(.trailing)
                            }

                            Text("تُحفظ جلسة تسجيل الدخول في سلسلة مفاتيح الجهاز ولا تُخزن كلمة المرور.")
                                .font(.system(size: 13, weight: .medium, design: .rounded))
                                .foregroundStyle(AppTheme.Colors.textSecondary)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }
                .padding(24)
            }
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthSessionStore())
}
