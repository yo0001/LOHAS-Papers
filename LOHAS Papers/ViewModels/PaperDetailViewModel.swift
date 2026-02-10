import Foundation
import Observation
import SwiftData

@Observable
final class PaperDetailViewModel {
    var detail: PaperDetailResponse?
    var isLoading: Bool = false
    var errorMessage: String?
    var isFavorite: Bool = false
    var selectedDifficulty: DifficultyLevel = .layperson

    // Fulltext translation
    var fulltextResponse: FulltextTranslationResponse?
    var isLoadingFulltext: Bool = false
    var showFulltext: Bool = false
    var fulltextError: String?

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

    func loadFulltext(paperId: String, difficulty: DifficultyLevel? = nil) async {
        let diff = difficulty ?? selectedDifficulty
        isLoadingFulltext = true
        fulltextError = nil

        print("[Fulltext] Starting loadFulltext for \(paperId), difficulty: \(diff.rawValue)")

        do {
            let response = try await APIClient.shared.getFulltextTranslation(
                paperId: paperId,
                language: languageManager.current.rawValue,
                difficulty: diff.rawValue
            )
            print("[Fulltext] Success: \(response.sections.count) sections")
            fulltextResponse = response
            showFulltext = true
        } catch let APIError.httpError(code) where code == 404 {
            print("[Fulltext] 404 - Not available")
            fulltextError = languageManager.current.fulltextNotAvailable
        } catch let APIError.httpError(code) where code == 422 {
            print("[Fulltext] 422 - PDF extraction failed")
            fulltextError = languageManager.current.fulltextPdfError
        } catch let APIError.httpError(code) {
            print("[Fulltext] HTTP error: \(code)")
            fulltextError = languageManager.current.errorGeneric
        } catch let APIError.networkError(underlying) {
            print("[Fulltext] Network error: \(underlying)")
            fulltextError = languageManager.current.errorNetwork
        } catch let APIError.decodingError(underlying) {
            print("[Fulltext] Decoding error: \(underlying)")
            fulltextError = languageManager.current.errorGeneric
        } catch {
            print("[Fulltext] Unknown error: \(error)")
            fulltextError = languageManager.current.errorGeneric
        }

        isLoadingFulltext = false
        print("[Fulltext] Done. showFulltext=\(showFulltext), error=\(fulltextError ?? "nil")")
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
