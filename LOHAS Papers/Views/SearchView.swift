import SwiftUI
import SwiftData

struct SearchView: View {
    @Environment(\.modelContext) private var modelContext
    @State var searchVM: SearchViewModel
    let languageManager: LanguageManager

    @State private var showResults = false
    @State private var showSettings = false
    @State private var showFavorites = false

    var lang: LanguageManager.AppLanguage { languageManager.current }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                searchBar

                // Content
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Recent searches
                        if !searchVM.recentSearches.isEmpty {
                            recentSearchesSection
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("LOHAS Papers")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    LanguagePicker(languageManager: languageManager)
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        showFavorites = true
                    } label: {
                        Image(systemName: "heart")
                    }
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
            .navigationDestination(isPresented: $showResults) {
                ResultsView(
                    searchVM: searchVM,
                    languageManager: languageManager
                )
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(languageManager: languageManager)
            }
            .sheet(isPresented: $showFavorites) {
                FavoritesView(languageManager: languageManager)
            }
            .onAppear {
                searchVM.loadRecentSearches(modelContext: modelContext)
            }
            .onChange(of: languageManager.current) { _, newValue in
                Task {
                    await searchVM.onLanguageChanged(to: newValue)
                }
            }
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 12) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField(lang.searchPlaceholder, text: $searchVM.query)
                    .textFieldStyle(.plain)
                    .submitLabel(.search)
                    .onSubmit { performSearch() }

                if !searchVM.query.isEmpty {
                    Button {
                        searchVM.query = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(12)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            if !searchVM.query.isEmpty {
                Button(lang.searchButton) {
                    performSearch()
                }
                .fontWeight(.semibold)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    // MARK: - Recent Searches

    private var recentSearchesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(lang.recentSearches)
                    .font(.headline)
                Spacer()
                Button(lang.clearHistory) {
                    searchVM.clearHistory(modelContext: modelContext)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            ForEach(searchVM.recentSearches, id: \.persistentModelID) { item in
                Button {
                    searchVM.query = item.query
                    performSearch()
                } label: {
                    HStack {
                        Image(systemName: "clock.arrow.circlepath")
                            .foregroundStyle(.secondary)
                            .font(.caption)
                        Text(item.query)
                            .foregroundStyle(.primary)
                            .font(.subheadline)
                        Spacer()
                        Text("\(item.resultCount)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 6)
                }
            }
        }
    }

    // MARK: - Actions

    private func performSearch() {
        showResults = true
        Task {
            await searchVM.search(modelContext: modelContext)
        }
    }
}
