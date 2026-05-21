import SwiftUI

struct LibraryView: View {
    @Environment(LibraryStore.self) private var library

    var body: some View {
        @Bindable var library = library

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                TextField("Search tones", text: $library.searchText)
                    .padding(14)
                    .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                if !library.favoriteProjects.isEmpty {
                    section(title: "Favorites", projects: library.favoriteProjects)
                }

                section(title: "Recent Projects", projects: library.filteredProjects)
            }
            .padding(16)
        }
    }

    @ViewBuilder
    private func section(title: String, projects: [ToneProject]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            SmallCapsLabel(text: title, color: Theme.cyan)
            if projects.isEmpty {
                PremiumPanel {
                    EmptyState(title: "No tones yet", detail: "Create or import your first ringtone from the Create tab.", symbol: "music.note.list")
                }
            } else {
                ForEach(projects) { project in
                    ToneProjectRow(project: project)
                }
            }
        }
    }
}

struct ToneProjectRow: View {
    @Environment(LibraryStore.self) private var library
    let project: ToneProject

    var body: some View {
        PremiumPanel {
            HStack(spacing: 12) {
                Image(systemName: project.sourceKind.symbol)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(Theme.cyan)
                    .frame(width: 42, height: 42)
                    .background(Theme.cyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 13))

                VStack(alignment: .leading, spacing: 4) {
                    Text(project.title)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.white)
                    Text("\(project.sourceKind.title) - \(Int(project.clipDuration)) sec - \(project.exportedURL == nil ? "Draft" : "Exported")")
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                }

                Spacer()

                Button {
                    library.toggleFavorite(project)
                } label: {
                    Image(systemName: project.isFavorite ? "heart.fill" : "heart")
                        .foregroundStyle(project.isFavorite ? Theme.pink : Theme.muted)
                }

                Button {
                    library.sheet = .editor(project.id)
                } label: {
                    Image(systemName: "chevron.right.circle.fill")
                        .foregroundStyle(Theme.cyan)
                }
            }
        }
        .contextMenu {
            Button("Duplicate", systemImage: "plus.square.on.square") {
                library.duplicate(project)
            }
            Button(project.isFavorite ? "Remove Favorite" : "Favorite", systemImage: "heart") {
                library.toggleFavorite(project)
            }
            Button("Delete", systemImage: "trash", role: .destructive) {
                library.delete(project)
            }
        }
    }
}
