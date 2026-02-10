import SwiftUI

struct EvidenceBadge: View {
    let level: String?
    let language: LanguageManager.AppLanguage

    var body: some View {
        if level != nil {
            Text(label)
                .font(.caption2)
                .fontWeight(.semibold)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(color.opacity(0.15))
                .foregroundStyle(color)
                .clipShape(Capsule())
        }
    }

    private var label: String {
        switch level {
        case "high": return language.evidenceHigh
        case "moderate": return language.evidenceModerate
        case "low": return language.evidenceLow
        default: return level ?? ""
        }
    }

    private var color: Color {
        switch level {
        case "high": return .green
        case "moderate": return .orange
        case "low": return .red
        default: return .gray
        }
    }
}
