import SwiftUI

struct BrowseView: View {
    @Environment(LibraryStore.self) private var library
    @State private var selectedCategory = "All"

    private var categories: [String] {
        ["All"] + Array(Set(library.starterTones.map(\.category))).sorted()
    }

    private var visibleTones: [StarterTone] {
        selectedCategory == "All" ? library.starterTones : library.starterTones.filter { $0.category == selectedCategory }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PremiumPanel {
                    VStack(alignment: .leading, spacing: 10) {
                        SmallCapsLabel(text: "Starter Library", color: Theme.cyan)
                        Text("Premium starter tones ready to customize.")
                            .font(.title2.weight(.black))
                            .foregroundStyle(.white)
                        Text("Use these sounds as fast templates, then trim, fade, rename, and export them like any imported sound.")
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                    }
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(categories, id: \.self) { category in
                            Button(category) {
                                selectedCategory = category
                            }
                            .font(.caption.weight(.black))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(Capsule().fill(selectedCategory == category ? Theme.cyan.opacity(0.24) : Theme.panel))
                            .foregroundStyle(selectedCategory == category ? Theme.cyan : Theme.muted)
                        }
                    }
                }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(visibleTones) { tone in
                        StarterToneCard(tone: tone)
                    }
                }
            }
            .padding(16)
        }
    }
}

struct StarterToneCard: View {
    @Environment(LibraryStore.self) private var library
    let tone: StarterTone

    var body: some View {
        Button {
            Task { await library.importStarterTone(tone) }
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                ZStack {
                    RoundedRectangle(cornerRadius: 18)
                        .fill(Theme.accentGradient)
                        .frame(height: 78)
                    Image(systemName: "waveform")
                        .font(.system(size: 32, weight: .black))
                        .foregroundStyle(.white)
                }
                Text(tone.title)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                Text(tone.mood)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
                    .lineLimit(2)
                Text(tone.category)
                    .font(.caption2.weight(.black))
                    .foregroundStyle(Theme.cyan)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.panel.opacity(0.82), in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
