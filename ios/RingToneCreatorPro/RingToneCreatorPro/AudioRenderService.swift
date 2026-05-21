import AVFoundation
import Foundation

enum AudioRenderService {
    static func export(project: ToneProject) async throws -> URL {
        try FileManager.default.createDirectory(at: URL.exportDirectory, withIntermediateDirectories: true)

        let sourceAsset = AVURLAsset(url: project.sourceURL)
        guard !sourceAsset.hasProtectedContent else {
            throw ToneError.protectedMedia
        }

        let sourceTracks = try await sourceAsset.loadTracks(withMediaType: .audio)
        guard let sourceTrack = sourceTracks.first else {
            throw ToneError.noAudioTrack
        }

        let composition = AVMutableComposition()
        guard let compositionTrack = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
            throw ToneError.exportFailed
        }

        let start = CMTime(seconds: max(0, project.trimStart), preferredTimescale: 600)
        let duration = CMTime(seconds: min(40, max(1, project.clipDuration)), preferredTimescale: 600)
        try compositionTrack.insertTimeRange(CMTimeRange(start: start, duration: duration), of: sourceTrack, at: .zero)

        let audioMix = AVMutableAudioMix()
        let parameters = AVMutableAudioMixInputParameters(track: compositionTrack)
        parameters.setVolume(1, at: .zero)

        if project.fadeIn > 0 {
            parameters.setVolumeRamp(
                fromStartVolume: 0,
                toEndVolume: 1,
                timeRange: CMTimeRange(start: .zero, duration: CMTime(seconds: min(project.fadeIn, project.clipDuration / 2), preferredTimescale: 600))
            )
        }

        if project.fadeOut > 0 {
            let fadeDuration = min(project.fadeOut, project.clipDuration / 2)
            let fadeStart = max(0, project.clipDuration - fadeDuration)
            parameters.setVolumeRamp(
                fromStartVolume: 1,
                toEndVolume: 0,
                timeRange: CMTimeRange(
                    start: CMTime(seconds: fadeStart, preferredTimescale: 600),
                    duration: CMTime(seconds: fadeDuration, preferredTimescale: 600)
                )
            )
        }

        audioMix.inputParameters = [parameters]

        guard let exportSession = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetAppleM4A) else {
            throw ToneError.exportFailed
        }

        let safeName = project.title.sanitizedFilename
        let m4aURL = URL.exportDirectory.appendingPathComponent("\(safeName)-\(UUID().uuidString.prefix(6)).m4a")
        let m4rURL = m4aURL.deletingPathExtension().appendingPathExtension("m4r")
        [m4aURL, m4rURL].forEach { url in
            if FileManager.default.fileExists(atPath: url.path) {
                try? FileManager.default.removeItem(at: url)
            }
        }

        exportSession.outputURL = m4aURL
        exportSession.outputFileType = .m4a
        exportSession.audioMix = audioMix
        exportSession.shouldOptimizeForNetworkUse = true

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            exportSession.exportAsynchronously {
                switch exportSession.status {
                case .completed:
                    continuation.resume()
                case .failed, .cancelled:
                    continuation.resume(throwing: exportSession.error ?? ToneError.exportFailed)
                default:
                    continuation.resume(throwing: ToneError.exportFailed)
                }
            }
        }

        try FileManager.default.moveItem(at: m4aURL, to: m4rURL)
        return m4rURL
    }
}
