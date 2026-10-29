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

struct InvestorRecordedHistoryPoint: Decodable, Identifiable {
    let observationKey: String
    let observedAt: String
    let price: Double

    var id: String { observationKey }
}

private struct InvestorRecordedHistoryEnvelope: Decodable {
    struct History: Decodable {
        let points: [InvestorRecordedHistoryPoint]
        let pointCount: Int
        let source: String?
        let generatedAt: String?
    }
    let history: History
}

struct InvestorTechnicalSnapshot: Decodable {
    let technicalAvailable: Bool?
    let trend: String?
    let rsi: InvestorFeedScalar?
    let samples: InvestorFeedScalar?
    let technicalAsOf: String?
    let source: String?
    let upstreamProvider: String?
    let indicators: [String: InvestorFeedScalar]?
}

@MainActor
final class InvestorMarketAnalysisStore: ObservableObject {
    @Published private(set) var points: [InvestorRecordedHistoryPoint] = []
    @Published private(set) var pointCount = 0
    @Published private(set) var historySource: String?
    @Published private(set) var historyGeneratedAt: String?
    @Published private(set) var technical: InvestorTechnicalSnapshot?
    @Published private(set) var isLoading = false
    @Published private(set) var historyUnavailable = false
    @Published private(set) var technicalUnavailable = false

    func refresh(symbol: String) async {
        isLoading = true
        defer { isLoading = false }
        let historyResult: Result<InvestorRecordedHistoryEnvelope, Error> = await request(path: "api/sfm-market/v1/history/\(symbol.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? symbol)?limit=60")
        let technicalResult: Result<InvestorTechnicalSnapshot, Error> = await request(path: "api/sfm-market/v1/trader/technical/\(symbol.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? symbol)")
        switch historyResult {
        case .success(let result):
            points = result.history.points
            pointCount = result.history.pointCount
            historySource = result.history.source
            historyGeneratedAt = result.history.generatedAt
            historyUnavailable = false
        case .failure:
            points = []
            pointCount = 0
            historySource = nil
            historyGeneratedAt = nil
            historyUnavailable = true
        }
        switch technicalResult {
        case .success(let result):
            technical = result
            technicalUnavailable = false
        case .failure:
            technical = nil
            technicalUnavailable = true
        }
    }

    private func request<T: Decodable>(path: String) async -> Result<T, Error> {
        do {
            let url = SupabaseConfig.apiBaseURL.appending(path: path)
            var request = URLRequest(url: url)
            request.timeoutInterval = 15
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw URLError(.badServerResponse) }
            return .success(try JSONDecoder().decode(T.self, from: data))
        } catch { return .failure(error) }
    }
}

enum InvestorPublicFeed: String, CaseIterable, Identifiable {
    case markets, news, calendar, screening
    var id: String { rawValue }
}

struct InvestorFeedScalar: Decodable {
    let text: String
    init(from decoder: Decoder) throws {
        let value = try decoder.singleValueContainer()
        if value.decodeNil() { text = "" }
        else if let string = try? value.decode(String.self) { text = string }
        else if let number = try? value.decode(Double.self) { text = number.formatted(.number) }
        else if let boolean = try? value.decode(Bool.self) { text = boolean ? "true" : "false" }
        else { text = "" }
    }
}

struct InvestorPublicFeedItem: Decodable, Identifiable {
    private let stableID: String?
    private let fallbackID: String
    let title: String?
    let summary: String?
    let symbol: String?
    let source: String?
    let date: String?
    let country: String?
    let currency: String?
    let status: String?
    let actual: InvestorFeedScalar?
    let forecast: InvestorFeedScalar?
    let previous: InvestorFeedScalar?
    let originalURL: String?

    var id: String { stableID ?? symbol ?? title ?? fallbackID }

    private enum CodingKeys: String, CodingKey {
        case id, title, headline, translatedTitle, eventName, name, displayName, summary, translatedSummary
        case symbol, displaySymbol, source, sourceName, provider, screeningSource, publishedAt, dateTimeUtc, dateTime, lastScreenedAt
        case country, currency, shariahStatus, actual, forecast, previous, originalUrl, canonicalUrl, url, sourceUrl
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        func text(_ keys: [CodingKeys]) -> String? {
            for key in keys {
                if let value = try? values.decode(String.self, forKey: key), !value.isEmpty { return value }
                if let value = try? values.decode(InvestorFeedScalar.self, forKey: key), !value.text.isEmpty { return value.text }
            }
            return nil
        }
        stableID = text([.id])
        title = text([.translatedTitle, .title, .headline, .eventName, .displayName, .name])
        summary = text([.translatedSummary, .summary])
        symbol = text([.displaySymbol, .symbol])
        source = text([.sourceName, .source, .provider, .screeningSource])
        date = text([.publishedAt, .dateTimeUtc, .dateTime, .lastScreenedAt])
        country = text([.country])
        currency = text([.currency])
        status = text([.shariahStatus])
        actual = try? values.decode(InvestorFeedScalar.self, forKey: .actual)
        forecast = try? values.decode(InvestorFeedScalar.self, forKey: .forecast)
        previous = try? values.decode(InvestorFeedScalar.self, forKey: .previous)
        originalURL = text([.originalUrl, .canonicalUrl, .url, .sourceUrl])
        fallbackID = UUID().uuidString
    }
}

private struct InvestorPublicFeedEnvelope: Decodable {
    let items: [InvestorPublicFeedItem]?
    let events: [InvestorPublicFeedItem]?
}

@MainActor
final class InvestorPublicFeedStore: ObservableObject {
    @Published private(set) var items: [InvestorPublicFeedItem] = []
    @Published private(set) var isLoading = false
    @Published private(set) var errorMessage: String?

    func refresh(_ feed: InvestorPublicFeed, language: String) async {
        guard feed != .markets else { return }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        let endpoint: String
        let queryItems: [URLQueryItem]
        switch feed {
        case .news:
            endpoint = "api/market-news"
            queryItems = [
                URLQueryItem(name: "language", value: language),
                URLQueryItem(name: "page", value: "1"),
                URLQueryItem(name: "pageSize", value: "30"),
            ]
        case .calendar:
            endpoint = "api/economic-calendar"
            queryItems = [URLQueryItem(name: "timezone", value: "Asia/Kuwait")]
        case .screening:
            endpoint = "api/sharia-stocks/screening"
            queryItems = []
        case .markets: return
        }
        do {
            guard var components = URLComponents(url: SupabaseConfig.apiBaseURL.appending(path: endpoint), resolvingAgainstBaseURL: false) else {
                throw URLError(.badURL)
            }
            components.queryItems = queryItems
            guard let url = components.url else { throw URLError(.badURL) }
            var request = URLRequest(url: url)
            request.setValue("application/json", forHTTPHeaderField: "Accept")
            request.timeoutInterval = 15
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw URLError(.badServerResponse) }
            let result = try JSONDecoder().decode(InvestorPublicFeedEnvelope.self, from: data)
            items = feed == .calendar ? result.events ?? [] : result.items ?? []
        } catch {
            items = []
            errorMessage = "DATA_UNAVAILABLE"
        }
    }
}
