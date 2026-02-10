import Foundation
import SwiftData

@Model
final class FavoritePaper {
    var paperId: String
    var title: String
    var authors: String
    var journal: String
    var year: Int
    var doi: String?
    var summaryJa: String?
    var summaryEn: String?
    var summaryZhHans: String?
    var summaryKo: String?
    var savedAt: Date

    init(
        paperId: String,
        title: String,
        authors: String,
        journal: String,
        year: Int,
        doi: String? = nil,
        summaryJa: String? = nil,
        summaryEn: String? = nil,
        summaryZhHans: String? = nil,
        summaryKo: String? = nil,
        savedAt: Date = .now
    ) {
        self.paperId = paperId
        self.title = title
        self.authors = authors
        self.journal = journal
        self.year = year
        self.doi = doi
        self.summaryJa = summaryJa
        self.summaryEn = summaryEn
        self.summaryZhHans = summaryZhHans
        self.summaryKo = summaryKo
        self.savedAt = savedAt
    }

    func summary(for language: String) -> String? {
        switch language {
        case "ja": return summaryJa
        case "en": return summaryEn
        case "zh-Hans": return summaryZhHans
        case "ko": return summaryKo
        default: return summaryJa
        }
    }
}
