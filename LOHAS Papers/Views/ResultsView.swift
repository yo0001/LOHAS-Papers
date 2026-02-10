import SwiftUI

struct ResultsView: View {
    @Bindable var searchVM: SearchViewModel
    let languageManager: LanguageManager

    var lang: LanguageManager.AppLanguage { languageManager.current }

    var body: some View {
        Group {
            if searchVM.isSearching {
                LoadingView(message: lang.loadingSummary)
            } else if let error = searchVM.errorMessage {
                errorView(error)
            } else if let result = searchVM.searchResult {
                if result.papers.isEmpty {
                    emptyView
                } else {
                    resultsList(result)
                }
            }
        }
        .navigationTitle(searchVM.query)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                LanguagePicker(languageManager: languageManager)
            }
        }
    }

    // MARK: - Results list

    private func resultsList(_ result: SearchResult) -> some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // AI Summary
                if !result.aiSummary.text.isEmpty {
                    AISummaryView(
                        summary: result.aiSummary,
                        totalResults: result.totalResults,
                        language: lang
                    )
                }

                // Result count
                HStack {
                    Text("\(result.totalResults) results")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                }

                // Paper cards
                ForEach(result.papers) { paper in
                    NavigationLink {
                        PaperDetailView(
                            paper: paper,
                            languageManager: languageManager
                        )
                    } label: {
                        PaperCardView(paper: paper, language: lang)
                    }
                    .buttonStyle(.plain)
                    .task {
                        await searchVM.loadMoreIfNeeded(currentPaper: paper)
                    }
                }

                // Loading more indicator
                if searchVM.isLoadingMore {
                    ProgressView()
                        .padding()
                }
            }
            .padding()
        }
    }

    // MARK: - Empty & Error

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text(lang.noResults)
                .font(.headline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            Text(message)
                .font(.headline)
                .foregroundStyle(.secondary)
            Button(lang.retry) {
                // Retry would need modelContext — simplified here
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
