import Foundation

struct PaperSummaryMap: Codable, Sendable {
    var ja: String?
    var en: String?
    var zhHans: String?
    var ko: String?

    enum CodingKeys: String, CodingKey {
        case ja
        case en
        case zhHans = "zh-Hans"
        case ko
    }

    func summary(for language: String) -> String? {
        switch language {
        case "ja": return ja
        case "en": return en
        case "zh-Hans": return zhHans
        case "ko": return ko
        default: return ja
        }
    }
}

struct PaperResult: Codable, Identifiable, Sendable {
    let id: String
    let title: String
    let titleTranslated: String?
    let authors: [String]
    let journal: String?
    let year: Int?
    let doi: String?
    let citationCount: Int
    let studyType: String?
    let evidenceLevel: String?
    let isOpenAccess: Bool
    let pdfUrl: String?
    let abstractOriginal: String?
    var summary: PaperSummaryMap
    let relevanceScore: Double
    let aiRelevanceReason: String?

    enum CodingKeys: String, CodingKey {
        case id, title, authors, journal, year, doi
        case titleTranslated = "title_translated"
        case citationCount = "citation_count"
        case studyType = "study_type"
        case evidenceLevel = "evidence_level"
        case isOpenAccess = "is_open_access"
        case pdfUrl = "pdf_url"
        case abstractOriginal = "abstract_original"
        case summary
        case relevanceScore = "relevance_score"
        case aiRelevanceReason = "ai_relevance_reason"
    }

    var authorsDisplay: String {
        if authors.isEmpty { return "" }
        if authors.count <= 2 { return authors.joined(separator: ", ") }
        return "\(authors[0]) et al."
    }
}

struct AISummary: Codable, Sendable {
    let text: String
    let language: String
    let generatedQueries: [String]

    enum CodingKeys: String, CodingKey {
        case text, language
        case generatedQueries = "generated_queries"
    }
}
