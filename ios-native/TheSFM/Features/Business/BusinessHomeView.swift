import SwiftUI

struct BusinessHomeView: View {
    private let areas = [
        ("المشاريع", "ابدأ ونظّم سير العمل والمواعيد من مكان واحد.", "briefcase.fill"),
        ("العملاء", "احتفظ بعلاقات العملاء وبيانات التواصل في مساحة أعمالك.", "person.2.fill"),
        ("الفواتير", "أنشئ وتابع التحصيل عبر واجهة أعمال مستقلة.", "doc.text.fill"),
    ]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .trailing, spacing: 10) {
                        Label("THE SFM Business", systemImage: "building.2.fill")
                            .font(.title2.weight(.bold))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                        Text("مساحة عمل أصلية للمشاريع والعملاء والفواتير، منفصلة عن المال الشخصي والاستثمار.")
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    .padding(.vertical, 8)
                }
                Section("مساحة الأعمال") {
                    ForEach(areas, id: \.0) { area in
                        Label {
                            VStack(alignment: .trailing, spacing: 3) {
                                Text(area.0).font(.headline)
                                Text(area.1).font(.subheadline).foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .trailing)
                        } icon: {
                            Image(systemName: area.2).foregroundStyle(.tint)
                        }
                    }
                }
                Section {
                    Text("ستتصل كل وحدة بواجهة أعمال محمية خاصة بالمستخدم قبل عرض البيانات الحية.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.trailing)
                }
            }
            .navigationTitle("الأعمال")
        }
        .tint(.purple)
    }
}
