import Foundation

struct APIClient {
    static let shared = APIClient(
        baseURL: SupabaseConfig.apiBaseURL,
        tokenProvider: { nil }
    )

    let baseURL: URL
    let tokenProvider: () async -> String?

    static func authorized(accessToken: String) -> APIClient {
        APIClient(baseURL: SupabaseConfig.apiBaseURL, tokenProvider: { accessToken })
    }

    func get<Response: Decodable>(_ path: String) async throws -> Response {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL, url.host == baseURL.host, url.scheme == baseURL.scheme else { throw APIClientError.invalidResponse }
        var request = URLRequest(url: url)
        request.timeoutInterval = 15
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = await tokenProvider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, 200..<300 ~= httpResponse.statusCode else {
            throw APIClientError.invalidResponse
        }

        return try JSONDecoder().decode(Response.self, from: data)
    }

    func send(_ path: String, method: String, body: Data) async throws {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL, url.host == baseURL.host, url.scheme == "https" else { throw APIClientError.invalidResponse }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = await tokenProvider() { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let response = response as? HTTPURLResponse, 200..<300 ~= response.statusCode else { throw APIClientError.invalidResponse }
    }
}

enum APIClientError: Error {
    case invalidResponse
}
