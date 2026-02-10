import SwiftUI
import SwiftData

struct PaperDetailView: View {
    let paper: PaperResult
    let languageManager: LanguageManager

    @Environment(\.modelContext) private var modelContext
    @State private var viewModel: PaperDetailViewModel
    @State private var showOriginalAbstract = false

    var lang: LanguageManager.AppLanguage { languageManager.current }

    init(paper: PaperResult, languageManager: LanguageManager) {
        self.paper = paper
        self.languageManager = languageManager
        self._viewModel = State(initialValue: PaperDetailViewModel(languageManager: languageManager))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Title (translated if available)
                Text(paper.titleTranslated ?? paper.title)
                    .font(.title3)
                    .fontWeight(.bold)

                // Original title (if translated)
                if paper.titleTranslated != nil {
                    Text(paper.title)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // Meta info
                metaSection

                // Badges
                badgesSection

                // Summary
                if let detail = viewModel.detail {
                    summarySection(detail)
                } else if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding()
                }

                // Abstract
                abstractSection

                // Links
                linksSection

                Spacer(minLength: 40)
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    viewModel.toggleFavorite(paper: paper, modelContext: modelContext)
                } label: {
                    Image(systemName: viewModel.isFavorite ? "heart.fill" : "heart")
                        .foregroundStyle(viewModel.isFavorite ? .red : .secondary)
                }
            }
        }
        .task {
            viewModel.checkFavoriteStatus(paperId: paper.id, modelContext: modelContext)
            await viewModel.loadDetail(paperId: paper.id)
        }
    }

    // MARK: - Meta

    private var metaSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            if !paper.authors.isEmpty {
                Text(paper.authorsDisplay)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 8) {
                if let journal = paper.journal {
                    Text(journal)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if let year = paper.year {
                    Text(String(year))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if paper.citationCount > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "quote.bubble")
                        .font(.caption2)
                    Text("\(lang.citations): \(paper.citationCount)")
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Badges

    private var badgesSection: some View {
        HStack(spacing: 8) {
            EvidenceBadge(level: paper.evidenceLevel, language: lang)

            if paper.isOpenAccess {
                Text(lang.openAccess)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.blue.opacity(0.15))
                    .foregroundStyle(.blue)
                    .clipShape(Capsule())
            }
        }
    }

    // MARK: - Summary

    private func summarySection(_ detail: PaperDetailResponse) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if let summary = detail.summary, !summary.isEmpty {
                Text(lang.abstract)
                    .font(.headline)

                Text(summary)
                    .font(.body)
                    .lineSpacing(4)
            }

            if !detail.keyFindings.isEmpty {
                Text(lang.keyFindings)
                    .font(.headline)
                    .padding(.top, 8)

                ForEach(detail.keyFindings, id: \.self) { finding in
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                            .font(.caption)
                            .padding(.top, 2)
                        Text(finding)
                            .font(.subheadline)
                    }
                }
            }
        }
    }

    // MARK: - Abstract

    private var abstractSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let abstract = paper.abstractOriginal, !abstract.isEmpty {
                DisclosureGroup(lang.abstractOriginal) {
                    Text(abstract)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                }
            }
        }
    }

    // MARK: - Links

    private var linksSection: some View {
        VStack(spacing: 12) {
            if let pdfUrl = paper.pdfUrl, let url = URL(string: pdfUrl) {
                Link(destination: url) {
                    HStack {
                        Image(systemName: "doc.richtext")
                        Text(lang.viewPDF)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            if let doi = paper.doi, let url = URL(string: "https://doi.org/\(doi)") {
                Link(destination: url) {
                    HStack {
                        Image(systemName: "link")
                        Text("DOI: \(doi)")
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }
}
