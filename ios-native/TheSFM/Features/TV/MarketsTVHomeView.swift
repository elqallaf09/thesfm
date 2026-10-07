import SwiftUI

struct MarketsTVHomeView: View {
    @State private var selectedChannel: String?

    private let channels = [
        ("الأسواق الكويتية", "أخبار وأسعار ومؤشرات", "building.columns.fill"),
        ("الأسواق العالمية", "المتابعة عبر المناطق والأسهم", "globe.americas.fill"),
        ("العملات والسلع", "عرض سريع للحركة العالمية", "dollarsign.arrow.circlepath"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 34) {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("THE SFM TV", systemImage: "tv.fill")
                            .font(.largeTitle.weight(.bold))
                        Text("متابعة الأسواق والأخبار على الشاشة الكبيرة.")
                            .font(.title3)
                            .foregroundStyle(.secondary)
                        Text("المعلومات للمتابعة وليست توصية استثمارية.")
                            .font(.footnote)
                            .foregroundStyle(.tertiary)
                    }

                    HStack(spacing: 24) {
                        ForEach(channels, id: \.0) { channel in
                            Button {
                                selectedChannel = channel.0
                            } label: {
                                VStack(alignment: .leading, spacing: 18) {
                                    Image(systemName: channel.2)
                                        .font(.system(size: 42, weight: .semibold))
                                        .foregroundStyle(.cyan)
                                    Text(channel.0).font(.title2.weight(.bold))
                                    Text(channel.1).font(.body).foregroundStyle(.secondary)
                                }
                                .frame(width: 300, height: 210, alignment: .leading)
                                .padding(24)
                                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                                        .stroke(selectedChannel == channel.0 ? Color.cyan : .clear, lineWidth: 3)
                                )
                            }
                            .buttonStyle(.card)
                            .accessibilityHint(selectedChannel == channel.0 ? "القناة المختارة" : "اختر قناة السوق")
                        }
                    }

                    if let selectedChannel {
                        Label("القناة المختارة: \(selectedChannel)", systemImage: "checkmark.circle.fill")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(.cyan)
                            .accessibilityLabel("القناة المختارة: \(selectedChannel)")
                    }
                }
                .padding(60)
            }
            .navigationTitle("THE SFM TV")
        }
        .tint(.cyan)
    }
}
