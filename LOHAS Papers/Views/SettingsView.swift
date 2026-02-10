import SwiftUI

struct SettingsView: View {
    let languageManager: LanguageManager

    @Environment(\.dismiss) private var dismiss

    var lang: LanguageManager.AppLanguage { languageManager.current }

    var body: some View {
        NavigationStack {
            List {
                // Language selection
                Section(lang.language) {
                    ForEach(LanguageManager.AppLanguage.allCases) { language in
                        Button {
                            languageManager.current = language
                        } label: {
                            HStack {
                                Text(language.displayName)
                                    .foregroundStyle(.primary)
                                Spacer()
                                if language == languageManager.current {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(.blue)
                                }
                            }
                        }
                    }
                }

                // Disclaimer
                Section(lang.disclaimer) {
                    Text(lang.disclaimerText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // About
                Section(lang.about) {
                    HStack {
                        Text("LOHAS Papers")
                        Spacer()
                        Text("v1.0.0")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle(lang.settings)
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
}
