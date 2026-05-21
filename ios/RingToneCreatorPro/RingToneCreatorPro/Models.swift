import Foundation

enum AppTab: String, CaseIterable, Identifiable, Codable {
    case create
    case library
    case browse
    case pro

    var id: String { rawValue }

    var title: String {
        switch self {
        case .create: "Create"
        case .library: "Library"
        case .browse: "Browse"
        case .pro: "Pro"
        }
    }

    var symbol: String {
        switch self {
        case .create: "waveform.badge.plus"
        case .library: "music.note.list"
        case .browse: "sparkles"
        case .pro: "crown.fill"
        }
    }
}

enum ToneSourceKind: String, Codable, CaseIterable, Identifiable {
    case files
    case video
    case music
    case recording
    case starter
    case share

    var id: String { rawValue }

    var title: String {
        switch self {
        case .files: "Files"
        case .video: "Video Audio"
        case .music: "Music"
        case .recording: "Recording"
        case .starter: "Starter Tone"
        case .share: "Shared File"
        }
    }

    var symbol: String {
        switch self {
        case .files: "folder.fill"
        case .video: "video.fill"
        case .music: "music.note"
        case .recording: "mic.fill"
        case .starter: "sparkles"
        case .share: "square.and.arrow.down.fill"
        }
    }
}

enum ToneLengthPreset: String, CaseIterable, Identifiable {
    case text = "8 sec"
    case short = "15 sec"
    case classic = "30 sec"
    case custom = "Custom"

    var id: String { rawValue }

    var seconds: Double? {
        switch self {
        case .text: 8
        case .short: 15
        case .classic: 30
        case .custom: nil
        }
    }
}

struct ToneProject: Identifiable, Codable, Hashable {
    var id: UUID
    var title: String
    var sourceKind: ToneSourceKind
    var sourceURL: URL
    var importedAt: Date
    var updatedAt: Date
    var duration: Double
    var trimStart: Double
    var trimEnd: Double
    var fadeIn: Double
    var fadeOut: Double
    var waveform: [Double]
    var isFavorite: Bool
    var exportedURL: URL?

    var clipDuration: Double {
        max(0, trimEnd - trimStart)
    }

    static func new(title: String, kind: ToneSourceKind, sourceURL: URL, duration: Double, waveform: [Double]) -> ToneProject {
        let end = min(max(duration, 1), 30)
        return ToneProject(
            id: UUID(),
            title: title,
            sourceKind: kind,
            sourceURL: sourceURL,
            importedAt: Date(),
            updatedAt: Date(),
            duration: duration,
            trimStart: 0,
            trimEnd: end,
            fadeIn: 0.35,
            fadeOut: 0.45,
            waveform: waveform,
            isFavorite: false,
            exportedURL: nil
        )
    }
}

struct StarterTone: Identifiable, Hashable {
    let id: String
    let title: String
    let category: String
    let mood: String
    let filename: String
    let colorName: String

    var fileURL: URL? {
        Bundle.main.url(forResource: filename, withExtension: "wav", subdirectory: "Resources/StarterTones")
            ?? Bundle.main.url(forResource: filename, withExtension: "wav")
    }
}

struct UserProfile: Identifiable, Equatable {
    let id: String
    var email: String
    var freeExportLimit: Int
    var freeExportsUsed: Int
    var subscriptionStatusMirror: String
    var appVersion: String
    var lastExportAt: Date?

    var freeExportsRemaining: Int {
        max(0, freeExportLimit - freeExportsUsed)
    }
}

enum AuthMode {
    case signIn
    case signUp

    var title: String {
        switch self {
        case .signIn: "Sign In"
        case .signUp: "Create Account"
        }
    }

    var actionTitle: String {
        switch self {
        case .signIn: "Sign In"
        case .signUp: "Start With 3 Free"
        }
    }
}

enum SheetDestination: Identifiable, Hashable {
    case editor(UUID)
    case installGuide(URL)
    case account
    case paywall

    var id: String {
        switch self {
        case .editor(let id): "editor-\(id.uuidString)"
        case .installGuide: "install-guide"
        case .account: "account"
        case .paywall: "paywall"
        }
    }
}
