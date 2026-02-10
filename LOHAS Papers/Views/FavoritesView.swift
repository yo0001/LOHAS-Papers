import SwiftUI
import SwiftData

struct FavoritesView: View {
    let languageManager: LanguageManager

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \FavoritePaper.savedAt, order: .reverse) private var favorites: [FavoritePaper]

    var lang: LanguageManager.AppLanguage { languageManager.current }

    var body: some View {
        NavigationStack {
            Group {
                if favorites.isEmpty {
                    emptyView
                } else {
                    List {
                        ForEach(favorites, id: \.paperId) { fav in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(fav.title)
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .lineLimit(2)

                                HStack(spacing: 4) {
                                    Text(fav.authors)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(1)
                                    if fav.year > 0 {
                                        Text("·")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                        Text(String(fav.year))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }

                                if let summary = fav.summary(for: lang.rawValue), !summary.isEmpty {
                                    Text(summary)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(3)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                        .onDelete(perform: deleteFavorites)
                    }
                }
            }
            .navigationTitle(lang.favorites)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(lang.done) {
                        dismiss()
                    }
                }
            }
        }
    }

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "heart")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text(lang.favorites)
                .font(.headline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func deleteFavorites(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(favorites[index])
        }
        try? modelContext.save()
    }
}
