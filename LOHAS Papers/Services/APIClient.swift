import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case httpError(Int)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .networkError(let error): return error.localizedDescription
        case .httpError(let code): return "HTTP Error: \(code)"
        case .decodingError(let error): return "Decoding Error: \(error.localizedDescription)"
        }
    }
}

final class APIClient: Sendable {
    static let shared = APIClient()

    // Change this to your backend URL
    private let baseURL = "http://192.168.10.121:8000/api/v1"

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 120
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
    }

    // MARK: - Search

    func search(query: String, language: String, page: Int = 1, perPage: Int = 50, sortBy: String = "relevance") async throws -> SearchResult {
        let request = SearchRequest(
            query: query,
            language: language,
            page: page,
            perPage: perPage,
            sortBy: sortBy,
            filters: .default
        )

        return try await post(path: "/search", body: request)
    }

    // MARK: - Paper Summary

    func getPaperSummary(paperId: String, language: String) async throws -> PaperSummaryResponse {
        let encodedId = paperId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? paperId
        return try await get(path: "/paper/\(encodedId)/summary?language=\(language)")
    }

    // MARK: - Paper Detail

    func getPaperDetail(paperId: String, language: String) async throws -> PaperDetailResponse {
        let encodedId = paperId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? paperId
        return try await get(path: "/paper/\(encodedId)/detail?language=\(language)")
    }

    // MARK: - Fulltext Translation

    func getFulltextTranslation(paperId: String, language: String, difficulty: String) async throws -> FulltextTranslationResponse {
        let encodedId = paperId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? paperId
        return try await get(path: "/paper/\(encodedId)/fulltext?language=\(language)&difficulty=\(difficulty)", timeout: 180)
    }

    // MARK: - Batch Summary

    func batchSummaries(paperIds: [String], language: String) async throws -> BatchSummaryResponse {
        let request = BatchSummaryRequest(paperIds: paperIds, language: language)
        return try await post(path: "/summary/batch", body: request)
    }

    // MARK: - HTTP helpers

    private func get<T: Decodable>(path: String, timeout: TimeInterval? = nil) async throws -> T {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let timeout = timeout {
            request.timeoutInterval = timeout
        }

        return try await execute(request)
    }

    private func post<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        return try await execute(request)
    }

    private func execute<T: Decodable>(_ request: URLRequest) async throws -> T {
        let data: Data
        let response: URLResponse

        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        if let httpResponse = response as? HTTPURLResponse,
           !(200...299).contains(httpResponse.statusCode) {
            throw APIError.httpError(httpResponse.statusCode)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}
