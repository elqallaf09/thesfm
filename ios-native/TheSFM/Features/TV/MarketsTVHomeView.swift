import SwiftUI

private struct TVSnapshot: Decodable {
    let quotes: [TVQuote]
    let generatedAt: String
    let available: Int
    let total: Int
}

private struct TVQuote: Decodable, Identifiable {
    let symbol: String
    let displaySymbol: String?
    let name: String
    let nameAr: String
    let currency: String?
    let price: Double?
    let changePercent: Double?
    let source: String?
    let status: String

    var id: String { displaySymbol?.isEmpty == false ? displaySymbol! : symbol }
    var title: String { nameAr.isEmpty ? name : nameAr }
    var code: String { displaySymbol?.isEmpty == false ? displaySymbol! : symbol }
}

@MainActor
private final class MarketsTVSnapshotStore: ObservableObject {
    @Published private(set) var quotes: [TVQuote] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?
    @Published private(set) var generatedAt: String?
    @Published private(set) var available = 0
    @Published private(set) var total = 0

    func refresh(group: String = "global") async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            guard var components = URLComponents(
                url: SupabaseConfig.apiBaseURL.appending(path: "api/tv/snapshot"),
                resolvingAgainstBaseURL: false
            ) else { throw URLError(.badURL) }
            components.queryItems = [
                URLQueryItem(name: "group", value: group),
                URLQueryItem(name: "pageSize", value: "6"),
            ]
            guard let url = components.url else { throw URLError(.badURL) }

            var request = URLRequest(url: url)
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            request.timeoutInterval = 20
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
                throw URLError(.badServerResponse)
            }
            let snapshot = try JSONDecoder().decode(TVSnapshot.self, from: data)
            quotes = snapshot.quotes
            generatedAt = snapshot.generatedAt
            available = snapshot.available
            total = snapshot.total
        } catch {
            quotes = []
            errorMessage = "تعذر تحديث بيانات الأسواق الآن. تحقق من الاتصال ثم أعد المحاولة."
        }
    }
}

struct MarketsTVHomeView: View {
    @StateObject private var snapshot = MarketsTVSnapshotStore()
    @State private var selectedChannel = "الأسواق العالمية"

    private let channels = [
        ("الأسواق الكويتية", "أخبار وأسعار ومؤشرات", "building.columns.fill", "gulf"),
        ("الأسواق العالمية", "المتابعة عبر المناطق والأسهم", "globe.americas.fill", "global"),
        ("العملات والسلع", "عرض سريع للحركة العالمية", "dollarsign.arrow.circlepath", "commodities"),
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
                                Task { await snapshot.refresh(group: channel.3) }
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

                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("القناة المختارة: \(selectedChannel)")
                                    .font(.title3.weight(.semibold))
                                    .foregroundStyle(.cyan)
                                Text("\(snapshot.available) من \(snapshot.total) أسعار متاحة")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("تحديث", systemImage: "arrow.clockwise") {
                                if let channel = channels.first(where: { $0.0 == selectedChannel }) {
                                    Task { await snapshot.refresh(group: channel.3) }
                                }
                            }
                            .disabled(snapshot.isLoading)
                        }

                        if snapshot.isLoading {
                            ProgressView("جارٍ تحديث الأسواق…")
                        } else if let errorMessage = snapshot.errorMessage {
                            ContentUnavailableView("تعذر تحميل الأسواق", systemImage: "wifi.exclamationmark", description: Text(errorMessage))
                        } else if snapshot.quotes.isEmpty {
                            ContentUnavailableView("لا توجد أسعار متاحة الآن", systemImage: "chart.line.uptrend.xyaxis")
                        } else {
                            HStack(spacing: 18) {
                                ForEach(snapshot.quotes) { quote in
                                    TVQuoteCard(quote: quote)
                                }
                            }
                        }
                    }
                }
                .padding(60)
            }
            .navigationTitle("THE SFM TV")
        }
        .tint(.cyan)
        .task { await snapshot.refresh() }
    }
}

private struct TVQuoteCard: View {
    let quote: TVQuote

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(quote.title).font(.headline).lineLimit(1)
            Text(quote.code).font(.subheadline.weight(.semibold)).monospaced().foregroundStyle(.cyan)
            Text(priceText).font(.title2.weight(.bold)).monospacedDigit()
            Text(changeText).font(.subheadline.weight(.semibold)).foregroundStyle(changeColor)
            Text([quote.currency, quote.source, quote.status].compactMap { $0 }.joined(separator: " · "))
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(width: 250, height: 170, alignment: .leading)
        .padding(22)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private var priceText: String {
        guard let price = quote.price else { return "—" }
        return price.formatted(.number.precision(.fractionLength(0 ... 4)))
    }

    private var changeText: String {
        guard let change = quote.changePercent else { return "لا توجد حركة متاحة" }
        return String(format: "%+.2f%%", change)
    }

    private var changeColor: Color {
        guard let change = quote.changePercent else { return .secondary }
        return change < 0 ? .red : change > 0 ? .green : .secondary
    }
}
