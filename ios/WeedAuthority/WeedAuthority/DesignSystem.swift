import SwiftUI

extension Color {
    static let authorityInk = Color(red: 0.02, green: 0.027, blue: 0.025)
    static let authorityPanel = Color(red: 0.055, green: 0.070, blue: 0.062)
    static let authorityRaised = Color(red: 0.095, green: 0.113, blue: 0.101)
    static let authorityGreen = Color(red: 0.388, green: 0.973, blue: 0.671)
    static let authorityGold = Color(red: 0.906, green: 0.701, blue: 0.361)
    static let authorityCoral = Color(red: 1.000, green: 0.408, blue: 0.337)
    static let authorityText = Color(red: 0.942, green: 0.957, blue: 0.925)
    static let authorityMuted = Color(red: 0.650, green: 0.693, blue: 0.640)
}

extension LinearGradient {
    static let authorityHero = LinearGradient(
        colors: [
            .authorityInk,
            Color(red: 0.035, green: 0.105, blue: 0.075),
            Color(red: 0.112, green: 0.084, blue: 0.040)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

struct AuthorityBackground: View {
    var body: some View {
        ZStack {
            Color.authorityInk.ignoresSafeArea()
            LinearGradient.authorityHero
                .opacity(0.58)
                .ignoresSafeArea()
            GeometryReader { proxy in
                Canvas { context, size in
                    let columns = 6
                    let rows = 12
                    let cellWidth = size.width / CGFloat(columns)
                    let cellHeight = size.height / CGFloat(rows)
                    var path = Path()

                    for column in 0...columns {
                        let x = CGFloat(column) * cellWidth
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: size.height))
                    }

                    for row in 0...rows {
                        let y = CGFloat(row) * cellHeight
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: size.width, y: y))
                    }

                    context.stroke(path, with: .color(.white.opacity(0.035)), lineWidth: 1)
                }
                .frame(width: proxy.size.width, height: proxy.size.height)
            }
            .ignoresSafeArea()
        }
    }
}

struct AuthorityLogo: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.authorityGreen)
                .frame(width: 48, height: 48)
                .shadow(color: Color.authorityGreen.opacity(0.38), radius: 22, y: 10)
            Image(systemName: "checkmark.shield.fill")
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(Color.authorityInk)
        }
        .accessibilityLabel("Weed Authority")
    }
}

struct SectionHeader: View {
    let eyebrow: String
    let title: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        HStack(alignment: .lastTextBaseline) {
            VStack(alignment: .leading, spacing: 5) {
                Text(eyebrow.uppercased())
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.authorityGreen)
                Text(title)
                    .font(.system(.title3, design: .rounded, weight: .bold))
                    .foregroundStyle(Color.authorityText)
                    .lineLimit(2)
            }
            Spacer()
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color.authorityGold)
            }
        }
    }
}

struct AuthorityPanel<Content: View>: View {
    var padding: CGFloat = 16
    @ViewBuilder let content: Content

    var body: some View {
        content
            .padding(padding)
            .background(Color.authorityPanel.opacity(0.82), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(.white.opacity(0.08), lineWidth: 1)
            )
    }
}

struct Pill: View {
    let text: String
    var systemImage: String?
    var tint: Color = .authorityGreen

    var body: some View {
        HStack(spacing: 7) {
            if let systemImage {
                Image(systemName: systemImage)
                    .font(.system(size: 12, weight: .bold))
            }
            Text(text)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .lineLimit(1)
        }
        .foregroundStyle(tint)
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(tint.opacity(0.13), in: Capsule())
        .overlay(Capsule().stroke(tint.opacity(0.24), lineWidth: 1))
    }
}

struct PrimaryActionButton: View {
    let title: String
    let systemImage: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: systemImage)
                Text(title)
                    .lineLimit(1)
                Spacer()
                Image(systemName: "arrow.right")
            }
            .font(.system(size: 15, weight: .bold, design: .rounded))
            .foregroundStyle(Color.authorityInk)
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.authorityGreen, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct SecondaryActionButton: View {
    let title: String
    let systemImage: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: systemImage)
                Text(title)
                    .lineLimit(1)
            }
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .foregroundStyle(Color.authorityText)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(Color.authorityGold)
            Text(title)
                .font(.system(.headline, design: .rounded, weight: .bold))
                .foregroundStyle(Color.authorityText)
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(Color.authorityMuted)
                .multilineTextAlignment(.center)
                .lineSpacing(3)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(Color.authorityPanel.opacity(0.7), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}
