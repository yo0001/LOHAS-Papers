import Foundation

// MARK: - Difficulty Level

enum DifficultyLevel: String, CaseIterable, Identifiable, Sendable {
    case expert
    case layperson
    case children

    var id: String { rawValue }
}

// MARK: - Abstract Translations (3 difficulty levels)

struct AbstractTranslations: Codable, Sendable {
    let expert: String?
    let layperson: String?
    let children: String?

    func text(for level: DifficultyLevel) -> String? {
        switch level {
        case .expert: return expert
        case .layperson: return layperson
        case .children: return children
        }
    }
}

// MARK: - Fulltext Translation Models

struct FulltextSection: Codable, Identifiable, Sendable {
    var id: String { sectionName }

    let sectionName: String
    let original: String
    let translated: String

    enum CodingKeys: String, CodingKey {
        case sectionName = "section_name"
        case original, translated
    }
}

struct FulltextTranslationResponse: Codable, Sendable {
    let paperId: String
    let language: String
    let difficulty: String
    let sections: [FulltextSection]
    let cached: Bool

    enum CodingKeys: String, CodingKey {
        case paperId = "paper_id"
        case language, difficulty, sections, cached
    }
}

// MARK: - Summary Models

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
    let abstractTranslations: AbstractTranslations?
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
        case abstractTranslations = "abstract_translations"
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
