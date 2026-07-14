import Foundation

enum AppConfig {
    static let privacyURL = URL(string: "https://eb28.co/weedauthority/privacy/")!
    static let supportURL = URL(string: "https://eb28.co/weedauthority/support/")!
    static let termsURL = URL(string: "https://eb28.co/weedauthority/terms/")!
    static let googlePrivacyURL = URL(string: "https://policies.google.com/privacy")!
    static let appAdsTxtURL = URL(string: "https://eb28.co/app-ads.txt")!

    static var adMobAppID: String {
        Bundle.main.object(forInfoDictionaryKey: "GADApplicationIdentifier") as? String ?? ""
    }

    static var bannerAdUnitID: String {
        Bundle.main.object(forInfoDictionaryKey: "WEEDAUTHORITY_GAD_BANNER_AD_UNIT_ID") as? String
            ?? ProcessInfo.processInfo.environment["WEEDAUTHORITY_GAD_BANNER_AD_UNIT_ID"]
            ?? ""
    }

    static var hasConfiguredAdMobIDs: Bool {
        adMobAppID.hasPrefix("ca-app-pub-")
            && bannerAdUnitID.hasPrefix("ca-app-pub-")
            && !adMobAppID.contains("__")
            && !bannerAdUnitID.contains("__")
    }
}
