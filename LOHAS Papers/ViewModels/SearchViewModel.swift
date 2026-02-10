import Foundation
import Observation
import SwiftData

@Observable
final class SearchViewModel {
    var query: String = ""
    var isSearching: Bool = false
    var isLoadingMore: Bool = false
    var errorMessage: String?
    var searchResult: SearchResult?
    var recentSearches: [SearchHistory] = []

    // Pagination
    private(set) var currentPage: Int = 1
    private(set) var allPapers: [PaperResult] = []
    private(set) var hasMorePages: Bool = false

    private let languageManager: LanguageManager
    private let perPage = 50

    var lang: LanguageManager.AppLanguage {
        languageManager.current
    }

    init(languageManager: LanguageManager) {
        self.languageManager = languageManager
    }

    func search(modelContext: ModelContext) async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        isSearching = true
        errorMessage = nil
        searchResult = nil
        allPapers = []
        currentPage = 1
        hasMorePages = false

        do {
            let result = try await APIClient.shared.search(
                query: trimmed,
                language: languageManager.current.rawValue,
                page: 1,
                perPage: perPage
            )
            allPapers = result.papers
            hasMorePages = result.totalResults > perPage
            searchResult = result

            // Save to search history (update existing or insert new)
            let queryToFind = trimmed
            var descriptor = FetchDescriptor<SearchHistory>(
                predicate: #Predicate { $0.query == queryToFind }
            )
            descriptor.fetchLimit = 1
            if let existing = try? modelContext.fetch(descriptor).first {
                existing.timestamp = .now
                existing.resultCount = result.totalResults
                existing.language = languageManager.current.rawValue
            } else {
                let history = SearchHistory(
                    query: trimmed,
                    resultCount: result.totalResults,
                    language: languageManager.current.rawValue
                )
                modelContext.insert(history)
            }
            try? modelContext.save()
            loadRecentSearches(modelContext: modelContext)
        } catch {
            errorMessage = languageManager.current.errorNetwork
        }

        isSearching = false
    }

    func loadMoreIfNeeded(currentPaper: PaperResult) async {
        // Trigger load when showing the last 5 papers
        guard hasMorePages, !isLoadingMore else { return }
        let thresholdIndex = allPapers.index(allPapers.endIndex, offsetBy: -5, limitedBy: allPapers.startIndex) ?? allPapers.startIndex
        guard let paperIndex = allPapers.firstIndex(where: { $0.id == currentPaper.id }),
              paperIndex >= thresholdIndex else { return }

        await loadNextPage()
    }

    func loadNextPage() async {
        guard hasMorePages, !isLoadingMore else { return }
        guard let result = searchResult else { return }

        isLoadingMore = true
        let nextPage = currentPage + 1

        do {
            let moreResult = try await APIClient.shared.search(
                query: query.trimmingCharacters(in: .whitespacesAndNewlines),
                language: languageManager.current.rawValue,
                page: nextPage,
                perPage: perPage
            )

            currentPage = nextPage
            allPapers.append(contentsOf: moreResult.papers)
            hasMorePages = allPapers.count < result.totalResults && !moreResult.papers.isEmpty

            // Update searchResult with combined papers
            searchResult = SearchResult(
                aiSummary: result.aiSummary,
                papers: allPapers,
                totalResults: result.totalResults,
                page: nextPage,
                perPage: perPage,
                cached: result.cached
            )
        } catch {
            // Silently fail — user can scroll again to retry
        }

        isLoadingMore = false
    }

    func loadRecentSearches(modelContext: ModelContext) {
        let descriptor = FetchDescriptor<SearchHistory>(
            sortBy: [SortDescriptor(\.timestamp, order: .reverse)]
        )
        recentSearches = (try? modelContext.fetch(descriptor))?.prefix(10).map { $0 } ?? []
    }

    func clearHistory(modelContext: ModelContext) {
        do {
            try modelContext.delete(model: SearchHistory.self)
            try modelContext.save()
            recentSearches = []
        } catch {
            // Silently fail
        }
    }

    func onLanguageChanged(to newLanguage: LanguageManager.AppLanguage) async {
        guard let result = searchResult else { return }

        // Re-fetch summaries in new language
        let paperIds = result.papers.map { $0.id }
        guard !paperIds.isEmpty else { return }

        do {
            let batchResult = try await APIClient.shared.batchSummaries(
                paperIds: paperIds,
                language: newLanguage.rawValue
            )

            // Update summaries in current result
            var updatedPapers = result.papers
            let summaryMap = Dictionary(
                batchResult.summaries.map { ($0.paperId, $0.summary) },
                uniquingKeysWith: { _, last in last }
            )

            for i in updatedPapers.indices {
                if let newSummary = summaryMap[updatedPapers[i].id] {
                    switch newLanguage {
                    case .ja: updatedPapers[i].summary.ja = newSummary
                    case .en: updatedPapers[i].summary.en = newSummary
                    case .zhHans: updatedPapers[i].summary.zhHans = newSummary
                    case .ko: updatedPapers[i].summary.ko = newSummary
                    }
                }
            }

            searchResult = SearchResult(
                aiSummary: result.aiSummary,
                papers: updatedPapers,
                totalResults: result.totalResults,
                page: result.page,
                perPage: result.perPage,
                cached: result.cached
            )
        } catch {
            // Keep existing results on failure
        }
    }
}
