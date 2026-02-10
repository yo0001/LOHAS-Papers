import Foundation
import Observation

@Observable
final class ResultsViewModel {
    var isLoadingMore: Bool = false
    var currentPage: Int = 1
    var hasMorePages: Bool = false

    private let languageManager: LanguageManager

    var lang: LanguageManager.AppLanguage {
        languageManager.current
    }

    init(languageManager: LanguageManager) {
        self.languageManager = languageManager
    }

    func configure(totalResults: Int, currentPage: Int, perPage: Int) {
        self.currentPage = currentPage
        self.hasMorePages = (currentPage * perPage) < totalResults
    }
}
