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

                // Translated Abstract (3 difficulty levels)
                if let detail = viewModel.detail {
                    translationSection(detail)
                } else if viewModel.isLoading {
                    VStack(spacing: 8) {
                        ProgressView()
                        Text(lang.loadingSummary)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                }

                // Original Abstract
                abstractSection

                // Fulltext Translation
                fulltextSection

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

    // MARK: - Translation Section

    private func translationSection(_ detail: PaperDetailResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(lang.abstractTranslated)
                .font(.headline)

            difficultySelectorView

            translationTextView(detail)

            keyFindingsView(detail)
        }
    }

    private var difficultySelectorView: some View {
        HStack(spacing: 0) {
            ForEach(DifficultyLevel.allCases) { level in
                difficultyButton(level)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func difficultyButton(_ level: DifficultyLevel) -> some View {
        let isSelected = viewModel.selectedDifficulty == level
        let bgColor: Color = isSelected ? Color.accentColor.opacity(0.15) : Color(.systemGray6)
        let fgColor: Color = isSelected ? Color.accentColor : Color.secondary
        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                viewModel.selectedDifficulty = level
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: lang.difficultyIcon(level))
                    .font(.caption2)
                Text(lang.difficultyName(level))
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
            .background(bgColor)
            .foregroundStyle(fgColor)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func translationTextView(_ detail: PaperDetailResponse) -> some View {
        let translationText = detail.abstractTranslations?.text(for: viewModel.selectedDifficulty)
        if let text = translationText, !text.isEmpty {
            translationBubble(text)
                .id(viewModel.selectedDifficulty)
        } else if let summary = detail.summary, !summary.isEmpty {
            translationBubble(summary)
        }
    }

    private func translationBubble(_ text: String) -> some View {
        Text(text)
            .font(.body)
            .lineSpacing(4)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemGray6).opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    @ViewBuilder
    private func keyFindingsView(_ detail: PaperDetailResponse) -> some View {
        if !detail.keyFindings.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text(lang.keyFindings)
                    .font(.headline)
                    .padding(.top, 4)

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

    // MARK: - Fulltext Translation

    /// Show fulltext button if PDF URL available from either search result or detail API
    private var hasPdfUrl: Bool {
        paper.pdfUrl != nil || viewModel.detail?.pdfUrl != nil
    }

    @ViewBuilder
    private var fulltextSection: some View {
        if hasPdfUrl {
            VStack(alignment: .leading, spacing: 12) {
                if viewModel.showFulltext {
                    fulltextContentView
                } else {
                    fulltextButtonView
                }
            }
        }
    }

    private var fulltextButtonView: some View {
        VStack(spacing: 8) {
            Button {
                Task {
                    await viewModel.loadFulltext(paperId: paper.id)
                }
            } label: {
                HStack {
                    if viewModel.isLoadingFulltext {
                        ProgressView()
                            .controlSize(.small)
                        Text(lang.fulltextLoading)
                            .font(.subheadline)
                    } else {
                        Image(systemName: "doc.text.fill")
                        Text(lang.fulltextTranslation)
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.orange.opacity(0.1))
                .foregroundStyle(.orange)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(viewModel.isLoadingFulltext)

            if let error = viewModel.fulltextError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var fulltextContentView: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with difficulty selector
            Text(lang.fulltextTranslation)
                .font(.headline)

            fulltextDifficultySelectorView

            // Sections
            if let response = viewModel.fulltextResponse {
                ForEach(response.sections) { section in
                    fulltextSectionItem(section)
                }
            }

            // Error
            if let error = viewModel.fulltextError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            // Loading overlay for difficulty change
            if viewModel.isLoadingFulltext {
                HStack {
                    ProgressView()
                        .controlSize(.small)
                    Text(lang.fulltextLoading)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding()
            }
        }
    }

    private var fulltextDifficultySelectorView: some View {
        HStack(spacing: 0) {
            ForEach(DifficultyLevel.allCases) { level in
                fulltextDifficultyButton(level)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func fulltextDifficultyButton(_ level: DifficultyLevel) -> some View {
        let isSelected = viewModel.selectedDifficulty == level
        let bgColor: Color = isSelected ? Color.orange.opacity(0.15) : Color(.systemGray6)
        let fgColor: Color = isSelected ? Color.orange : Color.secondary
        return Button {
            viewModel.selectedDifficulty = level
            Task {
                await viewModel.loadFulltext(paperId: paper.id, difficulty: level)
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: lang.difficultyIcon(level))
                    .font(.caption2)
                Text(lang.difficultyName(level))
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity)
            .background(bgColor)
            .foregroundStyle(fgColor)
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isLoadingFulltext)
    }

    private func fulltextSectionItem(_ section: FulltextSection) -> some View {
        DisclosureGroup(section.sectionName) {
            VStack(alignment: .leading, spacing: 8) {
                Text(section.translated)
                    .font(.body)
                    .lineSpacing(4)

                DisclosureGroup(lang.fulltextShowOriginal) {
                    Text(section.original)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.top, 4)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .padding(.top, 8)
        }
        .padding(12)
        .background(Color(.systemGray6).opacity(0.3))
        .clipShape(RoundedRectangle(cornerRadius: 10))
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
