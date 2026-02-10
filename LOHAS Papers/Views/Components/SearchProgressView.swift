import SwiftUI

struct SearchProgressView: View {
    let language: LanguageManager.AppLanguage

    @State private var currentPhase: Int = 0
    @State private var progress: Double = 0.0
    @State private var timer: Timer?

    private var phases: [(icon: String, text: String)] {
        [
            ("magnifyingglass", language.searchPhase1),
            ("text.magnifyingglass", language.searchPhase2),
            ("sparkles", language.searchPhase3),
            ("doc.text", language.searchPhase4),
        ]
    }

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            // Animated icon
            Image(systemName: phases[currentPhase].icon)
                .font(.system(size: 40))
                .foregroundStyle(Color.accentColor)
                .symbolEffect(.pulse, options: .repeating)
                .id(currentPhase)
                .transition(.opacity)

            // Phase text
            Text(phases[currentPhase].text)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
                .id("text-\(currentPhase)")
                .transition(.opacity)

            // Progress bar
            VStack(spacing: 8) {
                ProgressView(value: progress)
                    .tint(Color.accentColor)
                    .frame(maxWidth: 240)

                Text(progressPercentText)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .monospacedDigit()
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .animation(.easeInOut(duration: 0.4), value: currentPhase)
        .onAppear {
            startProgress()
        }
        .onDisappear {
            timer?.invalidate()
            timer = nil
        }
    }

    private var progressPercentText: String {
        let pct = Int(progress * 100)
        return "\(pct)%"
    }

    private func startProgress() {
        progress = 0.0
        currentPhase = 0

        // Simulate progress over ~15 seconds
        // Phase 0: 0-25% (searching papers) ~2s
        // Phase 1: 25-50% (analyzing relevance) ~3s
        // Phase 2: 50-80% (generating summaries) ~7s
        // Phase 3: 80-95% (preparing results) ~3s
        // Stays at 95% until actual completion

        let interval: TimeInterval = 0.1
        timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { _ in
            withAnimation(.linear(duration: interval)) {
                if progress < 0.25 {
                    progress += 0.012
                    currentPhase = 0
                } else if progress < 0.50 {
                    progress += 0.008
                    currentPhase = 1
                } else if progress < 0.80 {
                    progress += 0.004
                    currentPhase = 2
                } else if progress < 0.95 {
                    progress += 0.005
                    currentPhase = 3
                } else {
                    // Stay at 95% — will be dismissed when results arrive
                    progress = 0.95
                }
            }
        }
    }
}
