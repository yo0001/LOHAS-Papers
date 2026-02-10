import Foundation
import SwiftData

@Model
final class SearchHistory {
    #Unique<SearchHistory>([\.query])

    var query: String
    var timestamp: Date
    var resultCount: Int
    var language: String

    init(query: String, timestamp: Date = .now, resultCount: Int, language: String) {
        self.query = query
        self.timestamp = timestamp
        self.resultCount = resultCount
        self.language = language
    }
}
