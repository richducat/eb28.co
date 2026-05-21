import SwiftUI

struct PremiumBackground: View {
    var body: some View {
        ZStack {
            Theme.heroGradient
            RadialGradient(colors: [Theme.cyan.opacity(0.24), .clear], center: .topTrailing, startRadius: 20, endRadius: 380)
            RadialGradient(colors: [Theme.pink.opacity(0.18), .clear], center: .bottomLeading, startRadius: 40, endRadius: 420)
        }
        .ignoresSafeArea()
    }
}

struct PremiumPanel<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Theme.panel.opacity(0.82))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Theme.line, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.22), radius: 24, y: 12)
    }
}

struct GradientButtonStyle: ButtonStyle {
    var disabled = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.bold))
            .foregroundStyle(disabled ? Theme.muted : .white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background {
                if disabled {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Theme.elevated)
                } else {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Theme.accentGradient)
                }
            }
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

struct SmallCapsLabel: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption.weight(.black))
            .tracking(1.4)
            .textCase(.uppercase)
            .foregroundStyle(color)
    }
}

struct CreditBadge: View {
    let profile: UserProfile?
    let hasUnlimited: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: hasUnlimited ? "infinity" : "bolt.fill")
            Text(hasUnlimited ? "Unlimited" : "\(profile?.freeExportsRemaining ?? 0) Free")
        }
        .font(.caption.weight(.black))
        .foregroundStyle(hasUnlimited ? Theme.success : Theme.warning)
        .padding(.horizontal, 11)
        .padding(.vertical, 7)
        .background(Capsule().fill((hasUnlimited ? Theme.success : Theme.warning).opacity(0.14)))
        .overlay(Capsule().stroke((hasUnlimited ? Theme.success : Theme.warning).opacity(0.36), lineWidth: 1))
    }
}

struct WaveformView: View {
    let values: [Double]
    let trimStart: Double
    let trimEnd: Double
    let duration: Double

    var body: some View {
        GeometryReader { proxy in
            let width = max(proxy.size.width, 1)
            let startX = width * trimStart / max(duration, 1)
            let endX = width * trimEnd / max(duration, 1)

            ZStack(alignment: .leading) {
                HStack(alignment: .center, spacing: 3) {
                    ForEach(Array(values.enumerated()), id: \.offset) { index, value in
                        Capsule()
                            .fill(indexFraction(index) >= trimStart / max(duration, 1) && indexFraction(index) <= trimEnd / max(duration, 1) ? Theme.cyan : Theme.muted.opacity(0.24))
                            .frame(width: 3, height: max(10, proxy.size.height * value))
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

                RoundedRectangle(cornerRadius: 14)
                    .stroke(Theme.cyan.opacity(0.72), lineWidth: 2)
                    .frame(width: max(12, endX - startX), height: proxy.size.height)
                    .offset(x: startX)
            }
        }
        .frame(height: 118)
        .padding(.vertical, 8)
        .accessibilityLabel("Audio waveform with selected trim range")
    }

    private func indexFraction(_ index: Int) -> Double {
        guard values.count > 1 else { return 0 }
        return Double(index) / Double(values.count - 1)
    }
}

struct EmptyState: View {
    let title: String
    let detail: String
    let symbol: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 34, weight: .bold))
                .foregroundStyle(Theme.cyan)
            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(.white)
            Text(detail)
                .font(.subheadline)
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
    }
}
