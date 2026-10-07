import Foundation

struct InvestorInstrument: Decodable, Identifiable {
    let symbol: String
    let displaySymbol: String?
    let name: String
    let displayName: String?
    let assetType: String?
    let marketName: String?
    let currency: String?
    let source: String?
    let sector: String?
    let shariahStatus: String?

    var id: String { displaySymbol ?? symbol }
    var title: String { displayName?.isEmpty == false ? displayName! : name }
    var code: String { displaySymbol?.isEmpty == false ? displaySymbol! : symbol }
}

private struct InvestorMarketDirectoryResponse: Decodable {
    let markets: [InvestorInstrument]
}

@MainActor
final class InvestorMarketDirectoryStore: ObservableObject {
    @Published private(set) var instruments: [InvestorInstrument] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    func refresh() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            guard var components = URLComponents(url: SupabaseConfig.apiBaseURL.appending(path: "api/markets"), resolvingAgainstBaseURL: false) else {
                throw URLError(.badURL)
            }
            components.queryItems = [
                URLQueryItem(name: "limit", value: "60"),
                URLQueryItem(name: "quality", value: "complete"),
            ]
            guard let url = components.url else { throw URLError(.badURL) }

            var request = URLRequest(url: url)
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            request.timeoutInterval = 15
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
                throw URLError(.badServerResponse)
            }
            instruments = try JSONDecoder().decode(InvestorMarketDirectoryResponse.self, from: data).markets
        } catch {
            instruments = []
            errorMessage = "تعذر تحميل دليل الأسواق الآن. تحقق من الاتصال ثم أعد المحاولة."
        }
    }
}
