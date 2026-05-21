import AVFoundation
import SwiftUI

struct EditorView: View {
    @Environment(LibraryStore.self) private var library
    @Environment(AuthSession.self) private var auth
    @Environment(PurchaseManager.self) private var purchases
    @Environment(\.dismiss) private var dismiss
    let projectID: UUID

    @State private var draft: ToneProject?
    @State private var player: AVAudioPlayer?
    @State private var isPlaying = false
    @State private var isExporting = false
    @State private var exportURL: URL?
    @State private var showShare = false

    var body: some View {
        NavigationStack {
            ZStack {
                PremiumBackground()
                content
            }
            .navigationTitle("Editor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        saveDraft()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        saveDraft()
                        dismiss()
                    }
                }
            }
            .onAppear {
                draft = library.projects.first { $0.id == projectID }
            }
            .sheet(isPresented: $showShare) {
                if let exportURL {
                    ShareSheet(items: [exportURL])
                }
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if let draft {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    PremiumPanel {
                        VStack(alignment: .leading, spacing: 14) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    SmallCapsLabel(text: draft.sourceKind.title, color: Theme.cyan)
                                    TextField("Tone name", text: binding(\.title))
                                        .font(.title2.weight(.black))
                                        .foregroundStyle(.white)
                                        .textFieldStyle(.plain)
                                }
                                Spacer()
                                Button {
                                    Task { await togglePlayback(draft) }
                                } label: {
                                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                                        .font(.title2.weight(.black))
                                        .foregroundStyle(.white)
                                        .frame(width: 54, height: 54)
                                        .background(Theme.accentGradient, in: Circle())
                                }
                            }

                            WaveformView(values: draft.waveform, trimStart: draft.trimStart, trimEnd: draft.trimEnd, duration: draft.duration)

                            VStack(alignment: .leading, spacing: 12) {
                                Text("Trim")
                                    .font(.headline.weight(.bold))
                                    .foregroundStyle(.white)
                                RangeSlider(project: bindingProject)
                                HStack {
                                    Text(formatSeconds(draft.trimStart))
                                    Spacer()
                                    Text("\(formatSeconds(draft.clipDuration)) clip")
                                    Spacer()
                                    Text(formatSeconds(draft.trimEnd))
                                }
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Theme.muted)
                            }
                        }
                    }

                    PremiumPanel {
                        VStack(alignment: .leading, spacing: 14) {
                            SmallCapsLabel(text: "Presets", color: Theme.warning)
                            HStack {
                                ForEach(ToneLengthPreset.allCases) { preset in
                                    Button(preset.rawValue) {
                                        applyPreset(preset)
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(preset.seconds == nil ? Theme.pink : Theme.cyan)
                                }
                            }

                            VStack(alignment: .leading) {
                                Text("Fade In \(String(format: "%.1f", draft.fadeIn))s")
                                    .foregroundStyle(.white)
                                Slider(value: binding(\.fadeIn), in: 0...3, step: 0.1)
                                    .tint(Theme.cyan)
                            }
                            VStack(alignment: .leading) {
                                Text("Fade Out \(String(format: "%.1f", draft.fadeOut))s")
                                    .foregroundStyle(.white)
                                Slider(value: binding(\.fadeOut), in: 0...3, step: 0.1)
                                    .tint(Theme.pink)
                            }
                        }
                    }

                    PremiumPanel {
                        VStack(alignment: .leading, spacing: 12) {
                            SmallCapsLabel(text: purchases.hasUnlimited ? "Unlimited Active" : "Export", color: purchases.hasUnlimited ? Theme.success : Theme.warning)
                            Text(purchases.hasUnlimited ? "Export unlimited ringtone files." : "\(auth.profile?.freeExportsRemaining ?? 0) free exports remain.")
                                .font(.headline.weight(.bold))
                                .foregroundStyle(.white)
                            Text("Exports are ringtone-ready `.m4r` files. Use the guide after export to install through GarageBand.")
                                .font(.subheadline)
                                .foregroundStyle(Theme.muted)

                            Button {
                                Task { await export(draft) }
                            } label: {
                                HStack {
                                    if isExporting {
                                        ProgressView().tint(.white)
                                    }
                                    Text(isExporting ? "Exporting" : "Export Ringtone")
                                }
                            }
                            .buttonStyle(GradientButtonStyle(disabled: isExporting))
                            .disabled(isExporting)

                            if let exportURL {
                                HStack {
                                    Button {
                                        showShare = true
                                    } label: {
                                        Label("Share File", systemImage: "square.and.arrow.up")
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(Theme.cyan)

                                    Button {
                                        library.sheet = .installGuide(exportURL)
                                    } label: {
                                        Label("Install Guide", systemImage: "questionmark.circle")
                                    }
                                    .buttonStyle(.bordered)
                                }
                            }

                            if let message = auth.message ?? purchases.message ?? library.message {
                                Text(message)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(Theme.warning)
                            }
                        }
                    }
                }
                .padding(16)
            }
        } else {
            EmptyState(title: "Project missing", detail: "The selected tone could not be found.", symbol: "exclamationmark.triangle.fill")
        }
    }

    private var bindingProject: Binding<ToneProject> {
        Binding(
            get: { draft ?? library.projects.first(where: { $0.id == projectID })! },
            set: { draft = $0 }
        )
    }

    private func binding<Value>(_ keyPath: WritableKeyPath<ToneProject, Value>) -> Binding<Value> {
        Binding(
            get: { draft![keyPath: keyPath] },
            set: { draft![keyPath: keyPath] = $0 }
        )
    }

    private func saveDraft() {
        guard let draft else { return }
        library.update(draft)
    }

    private func applyPreset(_ preset: ToneLengthPreset) {
        guard var draft else { return }
        if let seconds = preset.seconds {
            draft.trimEnd = min(draft.duration, draft.trimStart + seconds)
        }
        self.draft = draft
    }

    private func togglePlayback(_ project: ToneProject) async {
        if isPlaying {
            player?.stop()
            player = nil
            isPlaying = false
            return
        }

        do {
            let player = try AVAudioPlayer(contentsOf: project.sourceURL)
            player.currentTime = project.trimStart
            player.play()
            self.player = player
            isPlaying = true
        } catch {
            library.message = error.localizedDescription
        }
    }

    private func export(_ project: ToneProject) async {
        saveDraft()
        isExporting = true
        defer { isExporting = false }

        if !purchases.hasUnlimited {
            let consumed = await auth.consumeFreeExportCredit()
            guard consumed else {
                library.sheet = .paywall
                return
            }
        }

        do {
            let url = try await AudioRenderService.export(project: project)
            exportURL = url
            library.markExported(projectID: project.id, exportedURL: url)
            library.message = "Ringtone exported."
            library.sheet = .installGuide(url)
        } catch {
            library.message = error.localizedDescription
        }
    }

    private func formatSeconds(_ value: Double) -> String {
        "\(Int(value.rounded()))s"
    }
}

struct RangeSlider: View {
    @Binding var project: ToneProject

    var body: some View {
        VStack(spacing: 12) {
            Slider(
                value: Binding(
                    get: { project.trimStart },
                    set: { value in
                        project.trimStart = min(value, project.trimEnd - 1)
                    }
                ),
                in: 0...max(1, project.duration - 1),
                step: 0.1
            )
            .tint(Theme.cyan)

            Slider(
                value: Binding(
                    get: { project.trimEnd },
                    set: { value in
                        project.trimEnd = max(value, project.trimStart + 1)
                    }
                ),
                in: 1...max(1, project.duration),
                step: 0.1
            )
            .tint(Theme.pink)
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
