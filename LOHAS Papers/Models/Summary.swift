import Foundation

struct PaperSummaryResponse: Codable, Sendable {
    let paperId: String
    let language: String
    let summary: String
    let cached: Bool
    let generatedAt: String?

    enum CodingKeys: String, CodingKey {
        case paperId = "paper_id"
        case language, summary, cached
        case generatedAt = "generated_at"
    }
}

struct BatchSummaryRequest: Codable, Sendable {
    let paperIds: [String]
    let language: String

    enum CodingKeys: String, CodingKey {
        case paperIds = "paper_ids"
        case language
    }
}

struct BatchSummaryItem: Codable, Sendable {
    let paperId: String
    let summary: String
    let cached: Bool

    enum CodingKeys: String, CodingKey {
        case paperId = "paper_id"
        case summary, cached
    }
}

struct BatchSummaryResponse: Codable, Sendable {
    let summaries: [BatchSummaryItem]
}

struct AuthorDetail: Codable, Sendable {
    let name: String
    let affiliation: String?
}

struct PaperDetailResponse: Codable, Identifiable, Sendable {
    var id: String { paperId }

    let paperId: String
    let titleOriginal: String
    let titleTranslated: String?
    let authors: [AuthorDetail]
    let journal: String?
    let year: Int?
    let doi: String?
    let abstractOriginal: String?
    let abstractTranslated: String?
    let summary: String?
    let keyFindings: [String]
    let citationCount: Int
    let referencesCount: Int
    let isOpenAccess: Bool
    let pdfUrl: String?
    let semanticScholarUrl: String?
    let pubmedUrl: String?

    enum CodingKeys: String, CodingKey {
        case paperId = "paper_id"
        case titleOriginal = "title_original"
        case titleTranslated = "title_translated"
        case authors, journal, year, doi
        case abstractOriginal = "abstract_original"
        case abstractTranslated = "abstract_translated"
        case summary
        case keyFindings = "key_findings"
        case citationCount = "citation_count"
        case referencesCount = "references_count"
        case isOpenAccess = "is_open_access"
        case pdfUrl = "pdf_url"
        case semanticScholarUrl = "semantic_scholar_url"
        case pubmedUrl = "pubmed_url"
    }
}
