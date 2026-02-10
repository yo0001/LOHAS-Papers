import SwiftUI

struct AISummaryView: View {
    let summary: AISummary
    let totalResults: Int
    let language: LanguageManager.AppLanguage

    @State private var isExpanded = true

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: "brain.head.profile")
                    .foregroundStyle(.indigo)
                Text(language.aiAnswer)
                    .font(.headline)
                    .foregroundStyle(.indigo)
                Spacer()
                Button {
                    withAnimation { isExpanded.toggle() }
                } label: {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundStyle(.secondary)
                }
            }

            if isExpanded {
                // AI text
                Text(summary.text)
                    .font(.subheadline)
                    .lineSpacing(4)

                // Paper count
                HStack {
                    Image(systemName: "book.closed")
                        .font(.caption)
                    Text(language.basedOnPapers(totalResults))
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color.indigo.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
