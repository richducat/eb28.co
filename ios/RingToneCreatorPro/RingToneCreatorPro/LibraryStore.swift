import AVFoundation
import Foundation
import MediaPlayer
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

@MainActor
@Observable
final class LibraryStore {
    var selectedTab: AppTab = .create
    var projects: [ToneProject] = []
    var activeProjectID: UUID?
    var sheet: SheetDestination?
    var isImporting = false
    var isRecording = false
    var message: String?
    var searchText = ""

    @ObservationIgnored private let storageKey = "ringtonecreatorpro.library.v1"
    @ObservationIgnored private var recorder: AVAudioRecorder?

    let starterTones: [StarterTone] = [
        StarterTone(id: "neon-pulse", title: "Neon Pulse", category: "Electronic", mood: "Bright, modern", filename: "neon-pulse", colorName: "Cyan"),
        StarterTone(id: "platinum-chime", title: "Platinum Chime", category: "Minimal", mood: "Premium, clean", filename: "platinum-chime", colorName: "Platinum"),
        StarterTone(id: "velvet-alert", title: "Velvet Alert", category: "Luxury", mood: "Smooth, warm", filename: "velvet-alert", colorName: "Pink"),
        StarterTone(id: "orbit-tone", title: "Orbit Tone", category: "Sci-Fi", mood: "Wide, futuristic", filename: "orbit-tone", colorName: "Blue"),
        StarterTone(id: "focus-tap", title: "Focus Tap", category: "Text Tones", mood: "Short, crisp", filename: "focus-tap", colorName: "Cyan"),
        StarterTone(id: "golden-rise", title: "Golden Rise", category: "Morning", mood: "Warm, confident", filename: "golden-rise", colorName: "Gold")
    ]

    init() {
        prepareDirectories()
        load()
    }

    var activeProject: ToneProject? {
        guard let activeProjectID else { return projects.first }
        return projects.first { $0.id == activeProjectID }
    }

    var filteredProjects: [ToneProject] {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return projects.sorted { $0.updatedAt > $1.updatedAt }
        }

        return projects
            .filter { $0.title.localizedCaseInsensitiveContains(searchText) || $0.sourceKind.title.localizedCaseInsensitiveContains(searchText) }
            .sorted { $0.updatedAt > $1.updatedAt }
    }

    var favoriteProjects: [ToneProject] {
        projects.filter(\.isFavorite).sorted { $0.updatedAt > $1.updatedAt }
    }

    func importSharedURL(_ url: URL) async {
        await importURL(url, kind: .share)
    }

    func importURL(_ url: URL, kind: ToneSourceKind) async {
        isImporting = true
        defer { isImporting = false }

        do {
            let copiedURL = try copyIntoImports(url)
            try await createProject(from: copiedURL, kind: kind, title: copiedURL.deletingPathExtension().lastPathComponent)
        } catch {
            message = error.localizedDescription
        }
    }

    func importVideoSelection(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        isImporting = true
        defer { isImporting = false }

        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                throw ToneError.importFailed
            }
            let output = URL.importDirectory.appendingPathComponent("video-\(UUID().uuidString).mov")
            try data.write(to: output, options: .atomic)
            try await createProject(from: output, kind: .video, title: "Video Audio")
        } catch {
            message = error.localizedDescription
        }
    }

    func importMusicItem(_ item: MPMediaItem?) async {
        guard let item else { return }
        guard let assetURL = item.assetURL else {
            message = ToneError.mediaUnavailable.localizedDescription
            return
        }

        await importURL(assetURL, kind: .music)
    }

    func importStarterTone(_ tone: StarterTone) async {
        guard let url = tone.fileURL else {
            message = "Starter tone is missing from the app bundle."
            return
        }
        await importURL(url, kind: .starter)
    }

    func startRecording() async {
        do {
            let granted = await requestMicrophoneAccess()
            guard granted else {
                message = "Microphone access is required to record a ringtone."
                return
            }

            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
            try session.setActive(true)

            let url = URL.recordingDirectory.appendingPathComponent("recording-\(UUID().uuidString).m4a")
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44_100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]
            let recorder = try AVAudioRecorder(url: url, settings: settings)
            recorder.prepareToRecord()
            recorder.record()
            self.recorder = recorder
            isRecording = true
            message = "Recording started."
        } catch {
            message = error.localizedDescription
        }
    }

    func stopRecording() async {
        guard let recorder else { return }
        recorder.stop()
        self.recorder = nil
        isRecording = false
        await importURL(recorder.url, kind: .recording)
        message = "Recording saved to your editor."
    }

    func duplicate(_ project: ToneProject) {
        var copy = project
        copy.id = UUID()
        copy.title = "\(project.title) Copy"
        copy.importedAt = Date()
        copy.updatedAt = Date()
        copy.exportedURL = nil
        projects.insert(copy, at: 0)
        activeProjectID = copy.id
        save()
    }

    func toggleFavorite(_ project: ToneProject) {
        guard let index = projects.firstIndex(where: { $0.id == project.id }) else { return }
        projects[index].isFavorite.toggle()
        projects[index].updatedAt = Date()
        save()
    }

    func update(_ project: ToneProject) {
        guard let index = projects.firstIndex(where: { $0.id == project.id }) else { return }
        var updated = project
        updated.updatedAt = Date()
        projects[index] = updated
        activeProjectID = updated.id
        save()
    }

    func delete(_ project: ToneProject) {
        projects.removeAll { $0.id == project.id }
        if activeProjectID == project.id {
            activeProjectID = projects.first?.id
        }
        save()
    }

    func markExported(projectID: UUID, exportedURL: URL) {
        guard let index = projects.firstIndex(where: { $0.id == projectID }) else { return }
        projects[index].exportedURL = exportedURL
        projects[index].updatedAt = Date()
        save()
    }

    private func createProject(from url: URL, kind: ToneSourceKind, title: String) async throws {
        let asset = AVURLAsset(url: url)
        if asset.hasProtectedContent {
            throw ToneError.protectedMedia
        }

        let tracks = try await asset.loadTracks(withMediaType: .audio)
        guard !tracks.isEmpty else {
            throw ToneError.noAudioTrack
        }

        let durationTime = try await asset.load(.duration)
        let duration = max(1, min(CMTimeGetSeconds(durationTime), 600))
        let waveform = WaveformFactory.makeWaveform(seed: url.absoluteString, duration: duration)
        let project = ToneProject.new(
            title: title.sanitizedFilename,
            kind: kind,
            sourceURL: url,
            duration: duration,
            waveform: waveform
        )
        projects.insert(project, at: 0)
        activeProjectID = project.id
        sheet = .editor(project.id)
        save()
    }

    private func copyIntoImports(_ sourceURL: URL) throws -> URL {
        prepareDirectories()
        let didAccess = sourceURL.startAccessingSecurityScopedResource()
        defer {
            if didAccess {
                sourceURL.stopAccessingSecurityScopedResource()
            }
        }

        let name = sourceURL.deletingPathExtension().lastPathComponent.sanitizedFilename
        let ext = sourceURL.pathExtension.isEmpty ? "m4a" : sourceURL.pathExtension
        let destination = URL.importDirectory.appendingPathComponent("\(name)-\(UUID().uuidString.prefix(8)).\(ext)")
        if FileManager.default.fileExists(atPath: destination.path) {
            try FileManager.default.removeItem(at: destination)
        }
        try FileManager.default.copyItem(at: sourceURL, to: destination)
        return destination
    }

    private func prepareDirectories() {
        [URL.importDirectory, URL.exportDirectory, URL.recordingDirectory].forEach { url in
            try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        }
    }

    private func requestMicrophoneAccess() async -> Bool {
        await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
    }

    private func load() {
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let decoded = try? JSONDecoder().decode([ToneProject].self, from: data)
        else { return }
        projects = decoded
        activeProjectID = decoded.first?.id
    }

    private func save() {
        guard let encoded = try? JSONEncoder().encode(projects) else { return }
        UserDefaults.standard.set(encoded, forKey: storageKey)
    }
}

enum WaveformFactory {
    static func makeWaveform(seed: String, duration: Double) -> [Double] {
        var hash = abs(seed.hashValue)
        let count = 96
        return (0..<count).map { index in
            hash = (hash &* 1_103_515_245 &+ 12_345) & 0x7fffffff
            let noise = Double(hash % 1000) / 1000.0
            let wave = abs(sin((Double(index) / Double(count)) * .pi * max(4, duration / 3)))
            return min(1, max(0.08, wave * 0.64 + noise * 0.36))
        }
    }
}
