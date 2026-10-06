import Foundation

enum SupabaseConfig {
    static var apiBaseURL: URL {
        setting("SFM_API_BASE_URL").flatMap(URL.init(string:)) ?? URL(string: "https://www.the-sfm.com")!
    }

    static var url: URL? {
        setting("SFM_SUPABASE_URL").flatMap(URL.init(string:))
    }

    static var anonKey: String? {
        setting("SFM_SUPABASE_ANON_KEY")
    }

    static var isConfigured: Bool {
        url != nil && anonKey != nil
    }

    private static func setting(_ key: String) -> String? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
            return nil
        }

        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !trimmed.hasPrefix("$(") else {
            return nil
        }
        return trimmed
    }
}
