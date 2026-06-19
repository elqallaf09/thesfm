import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var authSession: AuthSessionStore

    var body: some View {
        ZStack {
            AppTheme.Colors.background.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .trailing, spacing: 20) {
                    hero
                    readinessCards
                    nextSteps
                }
                .padding(20)
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .trailing, spacing: 18) {
            HStack {
                Button {
                    authSession.signOut()
                } label: {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 18, weight: .bold))
                }
                .buttonStyle(.bordered)

                Spacer()

                Text("THE SFM")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(AppTheme.Colors.accent)
            }

            Text("لوحة القيادة")
                .font(.system(size: 42, weight: .heavy, design: .rounded))
                .foregroundStyle(AppTheme.Colors.textPrimary)
                .frame(maxWidth: .infinity, alignment: .trailing)

            Text("نسخة iOS الأصلية جاهزة للربط ببيانات Supabase والـ API.")
                .font(.system(size: 18, weight: .semibold, design: .rounded))
                .foregroundStyle(AppTheme.Colors.textSecondary)
                .multilineTextAlignment(.trailing)

            Text("لا توجد بيانات مالية معروضة قبل الربط الحقيقي.")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(AppTheme.Colors.textPrimary)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(AppTheme.Colors.elevatedSurface)
                .clipShape(Capsule())
        }
        .padding(24)
        .background(AppTheme.heroGradient)
        .clipShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .stroke(AppTheme.Colors.border, lineWidth: 1)
        )
    }

    private var readinessCards: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
            statusCard(title: "المصادقة", value: "بانتظار Supabase", icon: "person.crop.circle.badge.checkmark")
            statusCard(title: "المصاريف", value: "قراءة فقط لاحقاً", icon: "creditcard")
            statusCard(title: "الاستثمارات", value: "API جاهز", icon: "chart.line.uptrend.xyaxis")
            statusCard(title: "الوضع الليلي", value: "مفعل", icon: "moon")
        }
    }

    private var nextSteps: some View {
        SFMCard {
            VStack(alignment: .trailing, spacing: 14) {
                Label("الخطوات التالية", systemImage: "checklist")
                    .font(.system(size: 22, weight: .heavy, design: .rounded))
                    .foregroundStyle(AppTheme.Colors.textPrimary)

                Text("ربط Supabase Auth، قراءة الملف الشخصي، ثم مقارنة إجماليات لوحة القيادة مع الموقع قبل إضافة شاشات التعديل.")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(AppTheme.Colors.textSecondary)
                    .multilineTextAlignment(.trailing)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }

    private func statusCard(title: String, value: String, icon: String) -> some View {
        SFMCard {
            VStack(alignment: .trailing, spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(AppTheme.Colors.accent)

                Text(title)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(AppTheme.Colors.textSecondary)

                Text(value)
                    .font(.system(size: 17, weight: .heavy, design: .rounded))
                    .foregroundStyle(AppTheme.Colors.textPrimary)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }
}

#Preview {
    DashboardView()
        .environmentObject(AuthSessionStore())
}
