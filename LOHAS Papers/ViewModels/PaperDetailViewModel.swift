import Foundation
import Observation
import SwiftData

@Observable
final class PaperDetailViewModel {
    var detail: PaperDetailResponse?
    var isLoading: Bool = false
    var errorMessage: String?
    var isFavorite: Bool = false

    private let languageManager: LanguageManager

    var lang: LanguageManager.AppLanguage {
        languageManager.current
    }

    init(languageManager: LanguageManager) {
        self.languageManager = languageManager
    }

    func loadDetail(paperId: String) async {
        isLoading = true
        errorMessage = nil

        do {
            detail = try await APIClient.shared.getPaperDetail(
                paperId: paperId,
                language: languageManager.current.rawValue
            )
        } catch {
            errorMessage = languageManager.current.errorGeneric
        }

        isLoading = false
    }

    func checkFavoriteStatus(paperId: String, modelContext: ModelContext) {
        let descriptor = FetchDescriptor<FavoritePaper>(
            predicate: #Predicate { $0.paperId == paperId }
        )
        isFavorite = ((try? modelContext.fetch(descriptor))?.isEmpty == false)
    }

    func toggleFavorite(paper: PaperResult, modelContext: ModelContext) {
        if isFavorite {
            // Remove from favorites
            let paperId = paper.id
            let descriptor = FetchDescriptor<FavoritePaper>(
                predicate: #Predicate { $0.paperId == paperId }
            )
            if let existing = try? modelContext.fetch(descriptor) {
                for item in existing {
                    modelContext.delete(item)
                }
            }
            isFavorite = false
        } else {
            // Add to favorites
            let fav = FavoritePaper(
                paperId: paper.id,
                title: paper.title,
                authors: paper.authorsDisplay,
                journal: paper.journal ?? "",
                year: paper.year ?? 0,
                doi: paper.doi,
                summaryJa: paper.summary.ja,
                summaryEn: paper.summary.en,
                summaryZhHans: paper.summary.zhHans,
                summaryKo: paper.summary.ko
            )
            modelContext.insert(fav)
            isFavorite = true
        }

        try? modelContext.save()
    }
}
