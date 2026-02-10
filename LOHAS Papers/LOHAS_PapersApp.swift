//
//  LOHAS_PapersApp.swift
//  LOHAS Papers
//
//  Created by 上原吉敬 on 2026/02/10.
//

import SwiftUI
import SwiftData

@main
struct LOHAS_PapersApp: App {
    @State private var languageManager = LanguageManager()

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            SearchHistory.self,
            FavoritePaper.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            // Schema changed — delete old database and retry
            let url = modelConfiguration.url
            let dir = url.deletingLastPathComponent()
            let base = url.deletingPathExtension().lastPathComponent
            for suffix in ["", "-wal", "-shm"] {
                let file = dir.appendingPathComponent(base + ".store" + suffix)
                try? FileManager.default.removeItem(at: file)
            }
            // Also try the exact URL
            try? FileManager.default.removeItem(at: url)

            do {
                return try ModelContainer(for: schema, configurations: [modelConfiguration])
            } catch {
                fatalError("Could not create ModelContainer: \(error)")
            }
        }
    }()

    var body: some Scene {
        WindowGroup {
            SearchView(
                searchVM: SearchViewModel(languageManager: languageManager),
                languageManager: languageManager
            )
        }
        .modelContainer(sharedModelContainer)
    }
}
