import Foundation

struct APIClient {
    static let shared = APIClient(
        baseURL: URL(string: "https://www.the-sfm.com")!,
        tokenProvider: { nil }
    )

    let baseURL: URL
    let tokenProvider: () async -> String?

    func get<Response: Decodable>(_ path: String) async throws -> Response {
        let url = baseURL.appending(path: path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
        var request = URLRequest(url: url)
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
}

enum APIClientError: Error {
    case invalidResponse
}
