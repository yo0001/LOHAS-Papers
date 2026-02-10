import SwiftUI

struct LanguagePicker: View {
    @Bindable var languageManager: LanguageManager

    var body: some View {
        Menu {
            ForEach(LanguageManager.AppLanguage.allCases) { lang in
                Button {
                    languageManager.current = lang
                } label: {
                    HStack {
                        Text(lang.displayName)
                        if lang == languageManager.current {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "globe")
                Text(languageManager.current.displayName)
                    .font(.caption)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color(.systemGray6))
            .clipShape(Capsule())
        }
    }
}
