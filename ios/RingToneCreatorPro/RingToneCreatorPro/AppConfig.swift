import Foundation
import SwiftUI

enum AppConfig {
    static let displayName = "Ring Tone Creator Pro"
    static let bundleID = "co.eb28.ringtonecreatorpro"
    static let appVersion = "1.0.0"
    static let buildNumber = "1"
    static let freeExportLimit = 3
    static let unlimitedProductID = "co.eb28.ringtonecreatorpro.unlimited.monthly"
    static let supportURL = URL(string: "https://eb28.co/ringtonecreatorpro/support/")!
    static let privacyURL = URL(string: "https://eb28.co/ringtonecreatorpro/privacy/")!
    static let termsURL = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
    static let appAdsTxtURL = URL(string: "https://eb28.co/app-ads.txt")!

    static var adMobAppID: String {
        Bundle.main.object(forInfoDictionaryKey: "GADApplicationIdentifier") as? String ?? ""
    }

    static var bannerAdUnitID: String {
        Bundle.main.object(forInfoDictionaryKey: "RINGTONE_GAD_BANNER_AD_UNIT_ID") as? String
            ?? ProcessInfo.processInfo.environment["RINGTONE_GAD_BANNER_AD_UNIT_ID"]
            ?? "ca-app-pub-3940256099942544/2435281174"
    }

    static var hasProductionAdMobIDs: Bool {
        adMobAppID.hasPrefix("ca-app-pub-") && !adMobAppID.contains("3940256099942544") && !adMobAppID.contains("__")
    }
}

enum Theme {
    static let ink = Color(red: 0.035, green: 0.039, blue: 0.055)
    static let graphite = Color(red: 0.085, green: 0.091, blue: 0.118)
    static let panel = Color(red: 0.117, green: 0.125, blue: 0.158)
    static let elevated = Color(red: 0.16, green: 0.168, blue: 0.21)
    static let cyan = Color(red: 0.08, green: 0.86, blue: 0.96)
    static let blue = Color(red: 0.19, green: 0.39, blue: 1.0)
    static let pink = Color(red: 1.0, green: 0.22, blue: 0.62)
    static let platinum = Color(red: 0.9, green: 0.92, blue: 0.95)
    static let muted = Color(red: 0.62, green: 0.66, blue: 0.74)
    static let line = Color.white.opacity(0.12)
    static let success = Color(red: 0.26, green: 0.85, blue: 0.55)
    static let warning = Color(red: 1.0, green: 0.74, blue: 0.27)

    static let heroGradient = LinearGradient(
        colors: [Color(red: 0.03, green: 0.04, blue: 0.07), Color(red: 0.07, green: 0.11, blue: 0.18), Color(red: 0.03, green: 0.04, blue: 0.07)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let accentGradient = LinearGradient(
        colors: [cyan, blue, pink],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

enum ToneError: LocalizedError {
    case firebaseNotConfigured
    case accountRequired
    case creditLimitReached
    case mediaUnavailable
    case protectedMedia
    case importFailed
    case recorderUnavailable
    case exportFailed
    case noAudioTrack

    var errorDescription: String? {
        switch self {
        case .firebaseNotConfigured:
            return "Firebase is not configured for this build."
        case .accountRequired:
            return "Sign in to use your three free ringtone exports."
        case .creditLimitReached:
            return "Your three free exports are used. Subscribe for unlimited ringtone exports."
        case .mediaUnavailable:
            return "This audio is not available on device. Download an unprotected file and try again."
        case .protectedMedia:
            return "Protected or streaming-only audio cannot be exported into a ringtone."
        case .importFailed:
            return "The file could not be imported."
        case .recorderUnavailable:
            return "The microphone recorder is not available."
        case .exportFailed:
            return "The ringtone export failed."
        case .noAudioTrack:
            return "No usable audio track was found."
        }
    }
}

extension URL {
    static var appDocuments: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    static var importDirectory: URL {
        appDocuments.appendingPathComponent("Imports", isDirectory: true)
    }

    static var exportDirectory: URL {
        appDocuments.appendingPathComponent("Exports", isDirectory: true)
    }

    static var recordingDirectory: URL {
        appDocuments.appendingPathComponent("Recordings", isDirectory: true)
    }
}

extension String {
    var sanitizedFilename: String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: " -_"))
        let scalars = unicodeScalars.map { allowed.contains($0) ? Character($0) : "-" }
        let value = String(scalars).trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? "Ring Tone" : value
    }
}
