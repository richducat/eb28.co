import MediaPlayer
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

struct CreateView: View {
    @Environment(LibraryStore.self) private var library
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AuthSession.self) private var auth
    @State private var isFileImporterPresented = false
    @State private var selectedVideoItem: PhotosPickerItem?
    @State private var isMusicPickerPresented = false
    @State private var selectedMediaItem: MPMediaItem?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                hero
                sourceGrid
                activeProjectPanel
                installGuidePanel
            }
            .padding(16)
        }
        .fileImporter(
            isPresented: $isFileImporterPresented,
            allowedContentTypes: [.audio, .movie, .mpeg4Movie, .quickTimeMovie],
            allowsMultipleSelection: false
        ) { result in
            if case .success(let urls) = result, let url = urls.first {
                Task { await library.importURL(url, kind: .files) }
            }
        }
        .onChange(of: selectedVideoItem) { _, item in
            Task { await library.importVideoSelection(item) }
        }
        .sheet(isPresented: $isMusicPickerPresented) {
            MusicPicker(selectedItem: $selectedMediaItem)
        }
        .onChange(of: selectedMediaItem?.persistentID) { _, _ in
            Task { await library.importMusicItem(selectedMediaItem) }
        }
    }

    private var hero: some View {
        PremiumPanel {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    SmallCapsLabel(text: "Studio", color: Theme.cyan)
                    Spacer()
                    CreditBadge(profile: auth.profile, hasUnlimited: purchases.hasUnlimited)
                }
                Text("Turn any sound into a polished iPhone ringtone.")
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(3)
                    .minimumScaleFactor(0.76)
                Text("Import audio, extract video sound, record a voice clip, trim the best hook, add fades, then export ringtone-ready `.m4r` files.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(3)

                Button {
                    if let id = library.activeProject?.id {
                        library.sheet = .editor(id)
                    } else {
                        isFileImporterPresented = true
                    }
                } label: {
                    Label(library.activeProject == nil ? "Import First Sound" : "Open Editor", systemImage: "slider.horizontal.3")
                }
                .buttonStyle(GradientButtonStyle())
            }
        }
    }

    private var sourceGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            SourceButton(title: "Files", detail: "MP3, M4A, WAV", symbol: "folder.fill") {
                isFileImporterPresented = true
            }

            PhotosPicker(selection: $selectedVideoItem, matching: .videos) {
                SourceButtonLabel(title: "Video", detail: "Extract audio", symbol: "video.fill")
            }
            .buttonStyle(.plain)

            SourceButton(title: "Music", detail: "Local owned files", symbol: "music.note") {
                isMusicPickerPresented = true
            }

            SourceButton(title: library.isRecording ? "Stop" : "Record", detail: "Voice or sound", symbol: library.isRecording ? "stop.circle.fill" : "mic.fill") {
                Task {
                    if library.isRecording {
                        await library.stopRecording()
                    } else {
                        await library.startRecording()
                    }
                }
            }
        }
    }

    private var activeProjectPanel: some View {
        PremiumPanel {
            if let project = library.activeProject {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Image(systemName: project.sourceKind.symbol)
                            .foregroundStyle(Theme.cyan)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(project.title)
                                .font(.headline.weight(.bold))
                                .foregroundStyle(.white)
                            Text("\(project.sourceKind.title) - \(Int(project.clipDuration)) sec selected")
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
                    }

                    WaveformView(values: project.waveform, trimStart: project.trimStart, trimEnd: project.trimEnd, duration: project.duration)

                    HStack {
                        Button {
                            library.sheet = .editor(project.id)
                        } label: {
                            Label("Edit", systemImage: "waveform")
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Theme.cyan)

                        Button {
                            library.duplicate(project)
                        } label: {
                            Label("Duplicate", systemImage: "plus.square.on.square")
                        }
                        .buttonStyle(.bordered)
                    }
                }
            } else {
                EmptyState(title: "No tone loaded", detail: "Import audio or choose a starter tone to open the premium editor.", symbol: "waveform.path")
            }
        }
    }

    private var installGuidePanel: some View {
        PremiumPanel {
            VStack(alignment: .leading, spacing: 10) {
                SmallCapsLabel(text: "Install", color: Theme.warning)
                Text("Export to GarageBand")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                Text("iOS apps export ringtone files. GarageBand handles the final system ringtone assignment, so the app includes a step-by-step guide after every export.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(3)
            }
        }
    }
}

struct SourceButton: View {
    let title: String
    let detail: String
    let symbol: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            SourceButtonLabel(title: title, detail: detail, symbol: symbol)
        }
        .buttonStyle(.plain)
    }
}

struct SourceButtonLabel: View {
    let title: String
    let detail: String
    let symbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: symbol)
                .font(.title2.weight(.bold))
                .foregroundStyle(Theme.cyan)
                .frame(width: 42, height: 42)
                .background(Theme.cyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
            Text(title)
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
            Text(detail)
                .font(.caption)
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Theme.panel.opacity(0.8), in: RoundedRectangle(cornerRadius: 20))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Theme.line, lineWidth: 1))
    }
}

struct MusicPicker: UIViewControllerRepresentable {
    @Binding var selectedItem: MPMediaItem?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> MPMediaPickerController {
        let picker = MPMediaPickerController(mediaTypes: .music)
        picker.allowsPickingMultipleItems = false
        picker.showsCloudItems = false
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: MPMediaPickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    final class Coordinator: NSObject, MPMediaPickerControllerDelegate {
        let parent: MusicPicker

        init(parent: MusicPicker) {
            self.parent = parent
        }

        func mediaPicker(_ mediaPicker: MPMediaPickerController, didPickMediaItems mediaItemCollection: MPMediaItemCollection) {
            parent.selectedItem = mediaItemCollection.items.first
            parent.dismiss()
        }

        func mediaPickerDidCancel(_ mediaPicker: MPMediaPickerController) {
            parent.dismiss()
        }
    }
}
