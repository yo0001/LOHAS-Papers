import Foundation

struct SearchResult: Codable, Sendable {
    let aiSummary: AISummary
    let papers: [PaperResult]
    let totalResults: Int
    let page: Int
    let perPage: Int
    let cached: Bool

    enum CodingKeys: String, CodingKey {
        case aiSummary = "ai_summary"
        case papers
        case totalResults = "total_results"
        case page
        case perPage = "per_page"
        case cached
    }
}

struct SearchRequest: Codable, Sendable {
    let query: String
    let language: String
    let page: Int
    let perPage: Int
    let sortBy: String
    let filters: SearchFilters

    enum CodingKeys: String, CodingKey {
        case query, language, page
        case perPage = "per_page"
        case sortBy = "sort_by"
        case filters
    }
}

struct SearchFilters: Codable, Sendable {
    var yearFrom: Int?
    var yearTo: Int?
    var studyType: String?
    var openAccessOnly: Bool

    enum CodingKeys: String, CodingKey {
        case yearFrom = "year_from"
        case yearTo = "year_to"
        case studyType = "study_type"
        case openAccessOnly = "open_access_only"
    }

    static let `default` = SearchFilters(
        yearFrom: nil,
        yearTo: nil,
        studyType: nil,
        openAccessOnly: false
    )
}
