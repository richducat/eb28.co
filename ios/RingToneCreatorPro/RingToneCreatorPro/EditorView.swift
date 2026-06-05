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
    @State private var playbackTask: Task<Void, Never>?
    @State private var isPlaying = false
    @State private var isExporting = false
    @State private var exportURL: URL?
    @State private var showShare = false
    @State private var showInstallGuide = false

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
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        if let draft {
                            Task { await export(draft) }
                        }
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .disabled(isExporting || draft == nil)
                    .accessibilityLabel("Export Ringtone")
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
            .onDisappear {
                stopPlayback()
            }
            .sheet(isPresented: $showShare) {
                if let exportURL {
                    ShareSheet(items: [exportURL])
                }
            }
            .sheet(isPresented: $showInstallGuide) {
                if let exportURL {
                    InstallGuideView(exportURL: exportURL)
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

                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Trim")
                                        .font(.headline.weight(.bold))
                                        .foregroundStyle(.white)
                                    Spacer()
                                    Text("\(formatTime(draft.clipDuration)) clip")
                                        .font(.caption.weight(.black))
                                        .foregroundStyle(Theme.cyan)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Capsule().fill(Theme.cyan.opacity(0.12)))
                                        .overlay(Capsule().stroke(Theme.cyan.opacity(0.26), lineWidth: 1))
                                }
                                TrimRangeEditor(project: bindingProject)
                                HStack {
                                    Text(formatTime(draft.trimStart))
                                    Spacer()
                                    Text(formatTime(draft.trimEnd))
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

                            if exportURL != nil {
                                HStack {
                                    Button {
                                        showShare = true
                                    } label: {
                                        Label("Share File", systemImage: "square.and.arrow.up")
                                    }
                                    .buttonStyle(.borderedProminent)
                                    .tint(Theme.cyan)

                                    Button {
                                        showInstallGuide = true
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
            stopPlayback()
            return
        }

        do {
            let player = try AVAudioPlayer(contentsOf: project.sourceURL)
            player.currentTime = project.trimStart
            player.prepareToPlay()
            player.play()
            self.player = player
            isPlaying = true
            playbackTask?.cancel()
            playbackTask = Task { @MainActor in
                while !Task.isCancelled {
                    guard let player = self.player else { break }
                    if !player.isPlaying || player.currentTime >= project.trimEnd {
                        self.stopPlayback()
                        break
                    }
                    try? await Task.sleep(for: .milliseconds(80))
                }
            }
        } catch {
            library.message = error.localizedDescription
        }
    }

    private func stopPlayback() {
        playbackTask?.cancel()
        playbackTask = nil
        player?.stop()
        player = nil
        isPlaying = false
    }

    private func export(_ project: ToneProject) async {
        saveDraft()
        isExporting = true
        defer { isExporting = false }

        if !purchases.hasUnlimited {
            guard (auth.profile?.freeExportsRemaining ?? 0) > 0 else {
                auth.message = auth.profile == nil ? "Account credits are still syncing. Try again in a moment." : ToneError.creditLimitReached.localizedDescription
                library.sheet = .paywall
                return
            }
            guard FileManager.default.fileExists(atPath: project.sourceURL.path) else {
                library.message = "The source audio is missing. Re-import this tone and try again."
                return
            }
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
            library.message = "Ringtone exported. Share it or open the install guide below."
        } catch {
            library.message = error.localizedDescription
        }
    }

    private func formatTime(_ value: Double) -> String {
        let total = max(0, Int(value.rounded()))
        let minutes = total / 60
        let seconds = total % 60
        return minutes > 0 ? "\(minutes):\(String(format: "%02d", seconds))" : "\(seconds)s"
    }
}

struct TrimRangeEditor: View {
    @Binding var project: ToneProject
    @State private var dragStartRange: ClosedRange<Double>?

    private let minimumClipDuration: Double = 1
    private let maximumClipDuration: Double = 40

    var body: some View {
        VStack(spacing: 12) {
            GeometryReader { proxy in
                let width = max(proxy.size.width, 1)
                let height = max(proxy.size.height, 1)
                let duration = safeDuration
                let startX = xPosition(for: project.trimStart, width: width)
                let endX = xPosition(for: project.trimEnd, width: width)
                let rangeWidth = max(24, endX - startX)

                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Theme.ink.opacity(0.52))

                    waveformBars(height: height)
                        .padding(.horizontal, 12)

                    Rectangle()
                        .fill(.black.opacity(0.44))
                        .frame(width: max(0, startX))

                    Rectangle()
                        .fill(.black.opacity(0.44))
                        .frame(width: max(0, width - endX))
                        .offset(x: endX)

                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Theme.cyan.opacity(0.10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(Theme.cyan.opacity(0.75), lineWidth: 2)
                        )
                        .frame(width: rangeWidth, height: height)
                        .offset(x: min(startX, width - rangeWidth))
                        .contentShape(Rectangle())
                        .gesture(selectionDrag(width: width, duration: duration))

                    TrimHandle(edge: .leading)
                        .position(x: startX, y: height / 2)
                        .gesture(startHandleDrag(width: width))
                        .accessibilityLabel("Trim start")
                        .accessibilityValue(timeString(project.trimStart))

                    TrimHandle(edge: .trailing)
                        .position(x: endX, y: height / 2)
                        .gesture(endHandleDrag(width: width))
                        .accessibilityLabel("Trim end")
                        .accessibilityValue(timeString(project.trimEnd))

                    TimelineTickRow(duration: duration)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 7)
                        .frame(maxHeight: .infinity, alignment: .bottom)
                }
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Theme.line, lineWidth: 1)
                )
                .coordinateSpace(name: "trim-waveform")
            }
            .frame(height: 150)
            .accessibilityLabel("Ringtone trim selector")
            .accessibilityValue("\(timeString(project.trimStart)) to \(timeString(project.trimEnd))")

            HStack(spacing: 10) {
                NudgeButton(systemName: "backward.end.fill", label: "Move start earlier") {
                    setStart(project.trimStart - 0.25)
                }
                NudgeButton(systemName: "backward.fill", label: "Move clip earlier") {
                    moveSelection(by: -0.25)
                }
                Spacer(minLength: 8)
                Text("\(timeString(project.trimStart)) - \(timeString(project.trimEnd))")
                    .font(.caption.weight(.black))
                    .monospacedDigit()
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.82)
                Spacer(minLength: 8)
                NudgeButton(systemName: "forward.fill", label: "Move clip later") {
                    moveSelection(by: 0.25)
                }
                NudgeButton(systemName: "forward.end.fill", label: "Move end later") {
                    setEnd(project.trimEnd + 0.25)
                }
            }
        }
        .onAppear(perform: clampProjectRange)
        .onChange(of: project.duration) { _, _ in clampProjectRange() }
    }

    private var safeDuration: Double {
        max(1, project.duration)
    }

    private var minClip: Double {
        min(minimumClipDuration, safeDuration)
    }

    private var maxClip: Double {
        min(maximumClipDuration, safeDuration)
    }

    private func waveformBars(height: Double) -> some View {
        HStack(alignment: .center, spacing: 3) {
            ForEach(Array(project.waveform.enumerated()), id: \.offset) { index, value in
                let time = safeDuration * indexFraction(index)
                let selected = time >= project.trimStart && time <= project.trimEnd
                Capsule()
                    .fill(selected ? Theme.cyan : Theme.muted.opacity(0.28))
                    .frame(width: 3, height: max(10, height * 0.72 * value))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    private func startHandleDrag(width: Double) -> some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .named("trim-waveform"))
            .onChanged { value in
                setStart(seconds(for: value.location.x, width: width))
            }
            .onEnded { _ in
                clampProjectRange()
            }
    }

    private func endHandleDrag(width: Double) -> some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .named("trim-waveform"))
            .onChanged { value in
                setEnd(seconds(for: value.location.x, width: width))
            }
            .onEnded { _ in
                clampProjectRange()
            }
    }

    private func selectionDrag(width: Double, duration: Double) -> some Gesture {
        DragGesture(minimumDistance: 0, coordinateSpace: .named("trim-waveform"))
            .onChanged { value in
                if dragStartRange == nil {
                    dragStartRange = project.trimStart...project.trimEnd
                }
                guard let dragStartRange else { return }
                let delta = value.translation.width / width * duration
                let clipLength = dragStartRange.upperBound - dragStartRange.lowerBound
                let maxStart = max(0, duration - clipLength)
                let newStart = clamp(dragStartRange.lowerBound + delta, lower: 0, upper: maxStart)
                project.trimStart = newStart
                project.trimEnd = min(duration, newStart + clipLength)
            }
            .onEnded { _ in
                dragStartRange = nil
                clampProjectRange()
            }
    }

    private func setStart(_ value: Double) {
        let lower = max(0, project.trimEnd - maxClip)
        let upper = max(0, project.trimEnd - minClip)
        project.trimStart = clamp(value, lower: lower, upper: upper)
    }

    private func setEnd(_ value: Double) {
        let lower = min(safeDuration, project.trimStart + minClip)
        let upper = min(safeDuration, project.trimStart + maxClip)
        project.trimEnd = clamp(value, lower: lower, upper: upper)
    }

    private func moveSelection(by delta: Double) {
        let clipLength = min(max(project.clipDuration, minClip), maxClip)
        let maxStart = max(0, safeDuration - clipLength)
        let newStart = clamp(project.trimStart + delta, lower: 0, upper: maxStart)
        project.trimStart = newStart
        project.trimEnd = min(safeDuration, newStart + clipLength)
    }

    private func clampProjectRange() {
        project.trimStart = clamp(project.trimStart, lower: 0, upper: max(0, safeDuration - minClip))
        project.trimEnd = clamp(project.trimEnd, lower: project.trimStart + minClip, upper: safeDuration)
        if project.clipDuration > maxClip {
            project.trimEnd = min(safeDuration, project.trimStart + maxClip)
        }
    }

    private func xPosition(for seconds: Double, width: Double) -> Double {
        clamp(seconds / safeDuration * width, lower: 0, upper: width)
    }

    private func seconds(for x: Double, width: Double) -> Double {
        clamp(x / max(width, 1) * safeDuration, lower: 0, upper: safeDuration)
    }

    private func indexFraction(_ index: Int) -> Double {
        guard project.waveform.count > 1 else { return 0 }
        return Double(index) / Double(project.waveform.count - 1)
    }

    private func clamp(_ value: Double, lower: Double, upper: Double) -> Double {
        min(max(value, min(lower, upper)), max(lower, upper))
    }

    private func timeString(_ value: Double) -> String {
        let total = max(0, Int(value.rounded()))
        let minutes = total / 60
        let seconds = total % 60
        return minutes > 0 ? "\(minutes):\(String(format: "%02d", seconds))" : "\(seconds)s"
    }
}

private struct TrimHandle: View {
    enum Edge {
        case leading
        case trailing
    }

    let edge: Edge

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(.white)
                .frame(width: 18, height: 76)
                .shadow(color: Theme.cyan.opacity(0.32), radius: 14, y: 4)
            Image(systemName: edge == .leading ? "chevron.left" : "chevron.right")
                .font(.caption.weight(.black))
                .foregroundStyle(Theme.ink)
        }
        .frame(width: 44, height: 116)
        .contentShape(Rectangle())
    }
}

private struct NudgeButton: View {
    let systemName: String
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.caption.weight(.black))
                .foregroundStyle(.white)
                .frame(width: 34, height: 34)
                .background(Circle().fill(Theme.elevated))
                .overlay(Circle().stroke(Theme.line, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

private struct TimelineTickRow: View {
    let duration: Double

    var body: some View {
        HStack {
            tickLabel(0)
            Spacer()
            tickLabel(duration / 2)
            Spacer()
            tickLabel(duration)
        }
    }

    private func tickLabel(_ value: Double) -> some View {
        Text(timeString(value))
            .font(.caption2.weight(.bold))
            .monospacedDigit()
            .foregroundStyle(Theme.muted.opacity(0.82))
    }

    private func timeString(_ value: Double) -> String {
        let total = max(0, Int(value.rounded()))
        let minutes = total / 60
        let seconds = total % 60
        return minutes > 0 ? "\(minutes):\(String(format: "%02d", seconds))" : "\(seconds)s"
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
