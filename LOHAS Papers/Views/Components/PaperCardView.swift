import SwiftUI

struct PaperCardView: View {
    let paper: PaperResult
    let language: LanguageManager.AppLanguage

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title (translated if available)
            Text(paper.titleTranslated ?? paper.title)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(3)

            // Journal, Year, Citations
            HStack(spacing: 4) {
                if let journal = paper.journal {
                    Text(journal)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                if let year = paper.year {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(String(year))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                if paper.citationCount > 0 {
                    Text("·")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Image(systemName: "quote.bubble")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text("\(paper.citationCount)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Badges
            HStack(spacing: 6) {
                EvidenceBadge(level: paper.evidenceLevel, language: language)

                if paper.isOpenAccess {
                    Text(language.openAccess)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.blue.opacity(0.15))
                        .foregroundStyle(.blue)
                        .clipShape(Capsule())
                }

                if let studyType = paper.studyType, studyType != "other" {
                    Text(studyType.replacingOccurrences(of: "-", with: " ").capitalized)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.purple.opacity(0.1))
                        .foregroundStyle(.purple)
                        .clipShape(Capsule())
                }
            }

            // Summary
            if let summary = paper.summary.summary(for: language.rawValue), !summary.isEmpty {
                Text(summary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(4)
            }

            // Authors
            if !paper.authors.isEmpty {
                Text(paper.authorsDisplay)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.06), radius: 4, y: 2)
    }
}
