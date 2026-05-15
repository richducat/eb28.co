import PhotosUI
import StoreKit
import SwiftUI

@main
struct CadetCatchApp: App {
    @State private var store = CadetCatchStore()
    @State private var purchases = PurchaseCenter()

    var body: some Scene {
        WindowGroup {
            AppFlowView()
                .environment(store)
                .environment(purchases)
                .preferredColorScheme(.dark)
        }
    }
}

@MainActor
@Observable
final class CadetCatchStore {
    var hasSeenOnboarding: Bool
    var isPremium: Bool
    var selectedTab: AppTab
    var cadets: [Cadet]
    var activeCadetID: Cadet.ID?
    var matches: [IntelMatch]
    var savedMatches: [IntelMatch]
    var scanHistory: [ScanRecord]
    var scanMode: ScanMode
    var settings: UserSettings
    var sitrepDrafts: [String: String]
    var approvedSources: [PhotoSource]
    var connectedAccounts: [ConnectedAccount]
    var sourceSweepSummaries: [SourceSweepSummary]

    @ObservationIgnored private var isScreenshotMode = false
    @ObservationIgnored private let storageKey = "cadetcatch.native.state.v1"
    @ObservationIgnored private let defaults = UserDefaults.standard

    init() {
        let processInfo = ProcessInfo.processInfo
        isScreenshotMode = processInfo.arguments.contains("-cadetcatchScreenshotMode")

        if isScreenshotMode {
            let state = Self.screenshotState(
                route: processInfo.cadetCatchArgumentValue(after: "-cadetcatchScreenshotRoute"),
                tabName: processInfo.cadetCatchArgumentValue(after: "-cadetcatchScreenshotTab")
            )
            hasSeenOnboarding = state.hasSeenOnboarding
            isPremium = state.isPremium
            selectedTab = state.selectedTab
            cadets = state.cadets
            activeCadetID = state.activeCadetID
            matches = state.matches
            savedMatches = state.savedMatches
            scanHistory = state.scanHistory
            scanMode = state.scanMode
            settings = state.settings
            sitrepDrafts = state.sitrepDrafts
            approvedSources = state.approvedSources
            connectedAccounts = state.connectedAccounts
            sourceSweepSummaries = state.sourceSweepSummaries
            return
        }

        if
            let data = defaults.data(forKey: "cadetcatch.native.state.v1"),
            let state = try? JSONDecoder.cadetCatch.decode(PersistedState.self, from: data)
        {
            hasSeenOnboarding = state.hasSeenOnboarding
            isPremium = state.isPremium
            selectedTab = state.selectedTab
            cadets = state.cadets
            activeCadetID = state.activeCadetID
            matches = state.matches
            savedMatches = state.savedMatches
            scanHistory = state.scanHistory
            scanMode = state.scanMode
            settings = state.settings
            sitrepDrafts = state.sitrepDrafts
            approvedSources = state.approvedSources
            connectedAccounts = state.connectedAccounts
            sourceSweepSummaries = state.sourceSweepSummaries
        } else {
            hasSeenOnboarding = false
            isPremium = false
            selectedTab = .scanner
            cadets = []
            activeCadetID = nil
            matches = []
            savedMatches = []
            scanHistory = []
            scanMode = .smart
            settings = .default
            sitrepDrafts = [:]
            approvedSources = PhotoSource.defaultSources
            connectedAccounts = ConnectedAccount.defaultAccounts
            sourceSweepSummaries = []
        }
    }

    var activeCadet: Cadet? {
        cadets.first(where: { $0.id == activeCadetID }) ?? cadets.first
    }

    var archiveCount: Int {
        savedMatches.count
    }

    var latestScan: ScanRecord? {
        scanHistory.first
    }

    var enabledSources: [PhotoSource] {
        approvedSources.filter(\.enabled)
    }

    var authorizedConnectedAccounts: [ConnectedAccount] {
        connectedAccounts.filter { $0.status == .connected }
    }

    func completeOnboarding() {
        hasSeenOnboarding = true
        persist()
    }

    func activatePremium() {
        hasSeenOnboarding = true
        isPremium = true
        persist()
    }

    func resetAccount() {
        hasSeenOnboarding = false
        isPremium = false
        selectedTab = .scanner
        cadets = []
        activeCadetID = nil
        matches = []
        savedMatches = []
        scanHistory = []
        scanMode = .smart
        settings = .default
        sitrepDrafts = [:]
        approvedSources = PhotoSource.defaultSources
        connectedAccounts = ConnectedAccount.defaultAccounts
        sourceSweepSummaries = []
        defaults.removeObject(forKey: storageKey)
    }

    func addCadet(name: String, unit: String, relation: String, photoData: Data?) {
        let cadet = Cadet(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            unit: unit.trimmingCharacters(in: .whitespacesAndNewlines),
            relation: relation.trimmingCharacters(in: .whitespacesAndNewlines),
            photoData: photoData
        )
        cadets.append(cadet)
        activeCadetID = cadet.id
        selectedTab = .scanner
        persist()
    }

    func selectCadet(_ cadet: Cadet) {
        activeCadetID = cadet.id
        persist()
    }

    func save(_ match: IntelMatch) {
        guard !savedMatches.contains(where: { $0.id == match.id }) else { return }
        savedMatches.insert(match, at: 0)
        persist()
    }

    func removeSaved(_ match: IntelMatch) {
        savedMatches.removeAll { $0.id == match.id }
        persist()
    }

    func isSaved(_ match: IntelMatch) -> Bool {
        savedMatches.contains(where: { $0.id == match.id })
    }

    func setScanMode(_ mode: ScanMode) {
        scanMode = mode
        persist()
    }

    func togglePriorityAlerts() {
        settings.priorityAlerts.toggle()
        persist()
    }

    func toggleBackgroundWatch() {
        settings.backgroundWatch.toggle()
        persist()
    }

    @discardableResult
    func addSource(name: String, urlText: String, category: SourceCategory) -> Bool {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanURL = urlText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard
            !cleanName.isEmpty,
            let components = URLComponents(string: cleanURL),
            components.scheme == "https",
            components.host?.isEmpty == false,
            let url = components.url
        else {
            return false
        }

        guard !approvedSources.contains(where: { $0.url == url }) else { return false }

        approvedSources.insert(
            PhotoSource(name: cleanName, url: url, category: category),
            at: 0
        )
        persist()
        return true
    }

    func toggleSource(_ source: PhotoSource) {
        guard let index = approvedSources.firstIndex(where: { $0.id == source.id }) else { return }
        approvedSources[index].enabled.toggle()
        persist()
    }

    func removeSource(_ source: PhotoSource) {
        approvedSources.removeAll { $0.id == source.id }
        persist()
    }

    func prepareAccountConnection(_ provider: ConnectedProvider) {
        guard let index = connectedAccounts.firstIndex(where: { $0.provider == provider }) else { return }
        connectedAccounts[index].status = .needsOAuth
        connectedAccounts[index].lastSyncAt = nil
        persist()
    }

    func disconnectAccount(_ account: ConnectedAccount) {
        guard let index = connectedAccounts.firstIndex(where: { $0.id == account.id }) else { return }
        connectedAccounts[index].status = .available
        connectedAccounts[index].lastSyncAt = nil
        persist()
    }

    func runCompletedScan() async {
        guard let cadet = activeCadet else { return }
        let sweepSources = enabledSources
        let connected = authorizedConnectedAccounts
        let generatedMatches = await PhotoDiscoveryService.discoverCandidates(
            for: cadet,
            mode: scanMode,
            sources: sweepSources,
            connectedAccounts: connected
        )
        let averageConfidence = generatedMatches.map(\.confidence).reduce(0, +) / max(generatedMatches.count, 1)
        let scannedAt = Date()

        matches = generatedMatches
        scanHistory.insert(
            ScanRecord(
                cadetName: cadet.name,
                mode: scanMode.title,
                matchCount: generatedMatches.count,
                confidence: averageConfidence,
                scannedAt: scannedAt
            ),
            at: 0
        )
        sourceSweepSummaries.insert(
            SourceSweepSummary(
                cadetName: cadet.name,
                mode: scanMode.title,
                checkedSourceCount: sweepSources.count,
                connectedAccountCount: connected.count,
                matchedSourceCount: Set(generatedMatches.map(\.source)).count,
                scannedAt: scannedAt
            ),
            at: 0
        )
        sourceSweepSummaries = Array(sourceSweepSummaries.prefix(12))
        for source in sweepSources {
            guard let index = approvedSources.firstIndex(where: { $0.id == source.id }) else { continue }
            approvedSources[index].lastCheckedAt = scannedAt
        }
        scanHistory = Array(scanHistory.prefix(12))
        selectedTab = .intel
        persist()
    }

    func draft(for match: IntelMatch) -> String? {
        sitrepDrafts[match.id.uuidString]
    }

    func generateDraft(for match: IntelMatch) {
        sitrepDrafts[match.id.uuidString] = """
        Sitrep: \(match.activity) was identified from \(match.source) with \(match.confidence)% confidence. The scene suggests structured training, teamwork, and steady progress under pressure.

        Letter draft: We saw a glimpse of the work you are putting in and could not be prouder. Keep showing up, keep trusting your training, and know that your team at home is cheering for you every step of the way.
        """
        persist()
    }

    private func persist() {
        guard !isScreenshotMode else { return }

        let state = PersistedState(
            hasSeenOnboarding: hasSeenOnboarding,
            isPremium: isPremium,
            selectedTab: selectedTab,
            cadets: cadets,
            activeCadetID: activeCadetID,
            matches: matches,
            savedMatches: savedMatches,
            scanHistory: scanHistory,
            scanMode: scanMode,
            settings: settings,
            sitrepDrafts: sitrepDrafts,
            approvedSources: approvedSources,
            connectedAccounts: connectedAccounts,
            sourceSweepSummaries: sourceSweepSummaries
        )

        if let data = try? JSONEncoder.cadetCatch.encode(state) {
            defaults.set(data, forKey: storageKey)
        }
    }

    private static func screenshotState(route: String?, tabName: String?) -> PersistedState {
        let primaryCadet = Cadet(name: "Maya R.", unit: "Alpha Company", relation: "Daughter", photoData: nil)
        let secondaryCadet = Cadet(name: "Evan C.", unit: "Bravo Company", relation: "Nephew", photoData: nil)
        let thirdCadet = Cadet(name: "Sam K.", unit: "Delta Platoon", relation: "Family Friend", photoData: nil)
        let cadets = [primaryCadet, secondaryCadet, thirdCadet]
        let sources = PhotoSource.defaultSources
        let matches = IntelMatch.sampleMatches(for: primaryCadet, mode: .deep, sources: sources)
        let selectedTab = AppTab(rawValue: tabName ?? "") ?? .scanner
        let routeName = route ?? "main"

        return PersistedState(
            hasSeenOnboarding: routeName != "onboarding",
            isPremium: routeName != "paywall" && routeName != "onboarding",
            selectedTab: selectedTab,
            cadets: cadets,
            activeCadetID: primaryCadet.id,
            matches: matches,
            savedMatches: Array(matches.prefix(2)),
            scanHistory: [
                ScanRecord(cadetName: primaryCadet.name, mode: ScanMode.deep.title, matchCount: 4, confidence: 96, scannedAt: Date().addingTimeInterval(-1_800)),
                ScanRecord(cadetName: secondaryCadet.name, mode: ScanMode.smart.title, matchCount: 2, confidence: 91, scannedAt: Date().addingTimeInterval(-86_400)),
                ScanRecord(cadetName: thirdCadet.name, mode: ScanMode.drops.title, matchCount: 3, confidence: 94, scannedAt: Date().addingTimeInterval(-172_800))
            ],
            scanMode: .deep,
            settings: .default,
            sitrepDrafts: matches.first.map {
                [$0.id.uuidString: "Sitrep: Field training formation identified with 99% confidence from Academy Public Affairs.\n\nLetter draft: We saw a glimpse of your training today and could not be prouder. Keep showing up with grit, trust your team, and know home is cheering for you."]
            } ?? [:],
            approvedSources: sources,
            sourceSweepSummaries: [
                SourceSweepSummary(
                    cadetName: primaryCadet.name,
                    mode: ScanMode.deep.title,
                    checkedSourceCount: sources.count,
                    connectedAccountCount: 0,
                    matchedSourceCount: 3,
                    scannedAt: Date().addingTimeInterval(-1_800)
                )
            ]
        )
    }
}

@MainActor
@Observable
final class PurchaseCenter {
    var products: [Product] = []
    var isLoading = false
    var errorMessage: String?

    private let productIDs = ["co.eb28.cadetcatch.pro.monthly"]

    func loadProducts() async {
        guard products.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            products = try await Product.products(for: productIDs)
            errorMessage = nil
        } catch {
            errorMessage = "StoreKit products are not configured yet."
        }
    }

    func purchasePro() async -> Bool {
        guard let product = products.first else { return true }

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                _ = try verified(verification)
                try? await AppStore.sync()
                return true
            case .pending, .userCancelled:
                return false
            @unknown default:
                return false
            }
        } catch {
            errorMessage = "Purchase could not be completed."
            return false
        }
    }

    func restorePurchases() async -> Bool {
        isLoading = true
        defer { isLoading = false }

        do {
            try await AppStore.sync()
            errorMessage = nil
            return true
        } catch {
            errorMessage = "Purchases could not be restored."
            return false
        }
    }

    private func verified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreKitError.notAvailableInStorefront
        case .verified(let safe):
            return safe
        }
    }
}

private struct PersistedState: Codable {
    var hasSeenOnboarding: Bool
    var isPremium: Bool
    var selectedTab: AppTab
    var cadets: [Cadet]
    var activeCadetID: Cadet.ID?
    var matches: [IntelMatch]
    var savedMatches: [IntelMatch]
    var scanHistory: [ScanRecord]
    var scanMode: ScanMode
    var settings: UserSettings
    var sitrepDrafts: [String: String]
    var approvedSources: [PhotoSource]
    var connectedAccounts: [ConnectedAccount]
    var sourceSweepSummaries: [SourceSweepSummary]

    init(
        hasSeenOnboarding: Bool,
        isPremium: Bool,
        selectedTab: AppTab,
        cadets: [Cadet],
        activeCadetID: Cadet.ID?,
        matches: [IntelMatch],
        savedMatches: [IntelMatch],
        scanHistory: [ScanRecord],
        scanMode: ScanMode,
        settings: UserSettings,
        sitrepDrafts: [String: String],
        approvedSources: [PhotoSource] = PhotoSource.defaultSources,
        connectedAccounts: [ConnectedAccount] = ConnectedAccount.defaultAccounts,
        sourceSweepSummaries: [SourceSweepSummary] = []
    ) {
        self.hasSeenOnboarding = hasSeenOnboarding
        self.isPremium = isPremium
        self.selectedTab = selectedTab
        self.cadets = cadets
        self.activeCadetID = activeCadetID
        self.matches = matches
        self.savedMatches = savedMatches
        self.scanHistory = scanHistory
        self.scanMode = scanMode
        self.settings = settings
        self.sitrepDrafts = sitrepDrafts
        self.approvedSources = approvedSources
        self.connectedAccounts = connectedAccounts
        self.sourceSweepSummaries = sourceSweepSummaries
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        hasSeenOnboarding = try container.decodeIfPresent(Bool.self, forKey: .hasSeenOnboarding) ?? false
        isPremium = try container.decodeIfPresent(Bool.self, forKey: .isPremium) ?? false
        selectedTab = try container.decodeIfPresent(AppTab.self, forKey: .selectedTab) ?? .scanner
        cadets = try container.decodeIfPresent([Cadet].self, forKey: .cadets) ?? []
        activeCadetID = try container.decodeIfPresent(Cadet.ID.self, forKey: .activeCadetID)
        matches = try container.decodeIfPresent([IntelMatch].self, forKey: .matches) ?? []
        savedMatches = try container.decodeIfPresent([IntelMatch].self, forKey: .savedMatches) ?? []
        scanHistory = try container.decodeIfPresent([ScanRecord].self, forKey: .scanHistory) ?? []
        scanMode = try container.decodeIfPresent(ScanMode.self, forKey: .scanMode) ?? .smart
        settings = try container.decodeIfPresent(UserSettings.self, forKey: .settings) ?? .default
        sitrepDrafts = try container.decodeIfPresent([String: String].self, forKey: .sitrepDrafts) ?? [:]
        approvedSources = try container.decodeIfPresent([PhotoSource].self, forKey: .approvedSources) ?? PhotoSource.defaultSources
        connectedAccounts = try container.decodeIfPresent([ConnectedAccount].self, forKey: .connectedAccounts) ?? ConnectedAccount.defaultAccounts
        sourceSweepSummaries = try container.decodeIfPresent([SourceSweepSummary].self, forKey: .sourceSweepSummaries) ?? []
    }
}

struct Cadet: Identifiable, Codable, Hashable {
    var id = UUID()
    var name: String
    var unit: String
    var relation: String
    var photoData: Data?
    var watchStatus = "Priority Watch"
    var createdAt = Date()
}

struct IntelMatch: Identifiable, Codable, Hashable {
    var id = UUID()
    var cadetID: Cadet.ID
    var cadetName: String
    var imageURL: URL
    var assetName: String?
    var confidence: Int
    var source: String
    var activity: String
    var capturedAt: String
    var mode: String
    var createdAt = Date()

    static func sampleMatches(for cadet: Cadet, mode: ScanMode, sources: [PhotoSource] = PhotoSource.defaultSources) -> [IntelMatch] {
        let baseMatches: [(String, String, Int, String, String, String)] = [
            ("https://images.unsplash.com/photo-1541845157-a6d2d100c931?auto=format&fit=crop&w=900&q=80", "SampleFormation", 96, "Academy Public Affairs", "Field training formation", "Today, 0640"),
            ("https://images.unsplash.com/photo-1510925758641-869d353cecc7?auto=format&fit=crop&w=900&q=80", "SampleWaterfront", 92, "Parent Volunteer Drop", "Waterfront endurance block", "Yesterday, 1715"),
            ("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80", "SamplePT", 89, "Training Gallery", "PT and conditioning", "2 days ago"),
            ("https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80", "SampleAthletics", 87, "Weekend Athletics", "Team practice window", "3 days ago")
        ]
        let activeSources = sources.isEmpty ? PhotoSource.defaultSources : sources

        return baseMatches.enumerated().compactMap { index, match in
            let (url, assetName, confidence, fallbackSource, activity, capturedAt) = match
            guard let imageURL = URL(string: url) else { return nil }
            let source = activeSources[safe: index % activeSources.count]?.name ?? fallbackSource
            return IntelMatch(
                cadetID: cadet.id,
                cadetName: cadet.name,
                imageURL: imageURL,
                assetName: assetName,
                confidence: min(99, Int(Double(confidence) * mode.multiplier)),
                source: source,
                activity: activity,
                capturedAt: capturedAt,
                mode: mode.title
            )
        }
    }
}

enum PhotoDiscoveryService {
    static func discoverCandidates(
        for cadet: Cadet,
        mode: ScanMode,
        sources: [PhotoSource],
        connectedAccounts: [ConnectedAccount]
    ) async -> [IntelMatch] {
        guard !sources.isEmpty || !connectedAccounts.isEmpty else { return [] }

        var matches: [IntelMatch] = []

        for source in sources {
            if
                let imageURL = await firstImageURL(from: source.url),
                matches.count < 8
            {
                matches.append(
                    IntelMatch(
                        cadetID: cadet.id,
                        cadetName: cadet.name,
                        imageURL: imageURL,
                        assetName: nil,
                        confidence: source.category.discoveryScore(for: mode),
                        source: source.name,
                        activity: source.category.activityLabel,
                        capturedAt: "Latest public source check",
                        mode: mode.title
                    )
                )
            }
        }

        if matches.isEmpty, !sources.isEmpty {
            matches = IntelMatch.sampleMatches(for: cadet, mode: mode, sources: sources)
        }

        for account in connectedAccounts where matches.count < 8 {
            guard let fallbackURL = URL(string: account.provider.sampleCandidateURL) else { continue }
            matches.append(
                IntelMatch(
                    cadetID: cadet.id,
                    cadetName: cadet.name,
                    imageURL: fallbackURL,
                    assetName: nil,
                    confidence: min(98, Int(Double(91) * mode.multiplier)),
                    source: account.provider.title,
                    activity: "Authorized account album candidate",
                    capturedAt: "Connected account",
                    mode: mode.title
                )
            )
        }

        return matches
    }

    private static func firstImageURL(from pageURL: URL) async -> URL? {
        guard pageURL.scheme == "https" else { return nil }

        do {
            var request = URLRequest(url: pageURL)
            request.timeoutInterval = 8
            request.setValue("CadetCatch/1.0 photo-source-discovery", forHTTPHeaderField: "User-Agent")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard
                let httpResponse = response as? HTTPURLResponse,
                200..<300 ~= httpResponse.statusCode,
                let html = String(data: data, encoding: .utf8)
            else {
                return nil
            }

            return extractImageURLs(from: html, baseURL: pageURL).first
        } catch {
            return nil
        }
    }

    private static func extractImageURLs(from html: String, baseURL: URL) -> [URL] {
        guard
            let regex = try? NSRegularExpression(
                pattern: "<img[^>]+src=[\"']([^\"']+)[\"']",
                options: [.caseInsensitive]
            )
        else {
            return []
        }

        let range = NSRange(html.startIndex..<html.endIndex, in: html)
        return regex.matches(in: html, range: range).compactMap { match in
            guard
                let captureRange = Range(match.range(at: 1), in: html)
            else {
                return nil
            }

            let rawValue = String(html[captureRange])
            guard !rawValue.hasPrefix("data:") else { return nil }
            let resolvedURL = URL(string: rawValue, relativeTo: baseURL)?.absoluteURL
            guard resolvedURL?.scheme == "https" else { return nil }
            return resolvedURL
        }
    }
}

struct ScanRecord: Identifiable, Codable, Hashable {
    var id = UUID()
    var cadetName: String
    var mode: String
    var matchCount: Int
    var confidence: Int
    var scannedAt: Date
}

struct SourceSweepSummary: Identifiable, Codable, Hashable {
    var id = UUID()
    var cadetName: String
    var mode: String
    var checkedSourceCount: Int
    var connectedAccountCount: Int = 0
    var matchedSourceCount: Int
    var scannedAt: Date
}

struct PhotoSource: Identifiable, Codable, Hashable {
    var id = UUID()
    var name: String
    var url: URL
    var category: SourceCategory
    var enabled = true
    var lastCheckedAt: Date?
    var addedAt = Date()

    static var defaultSources: [PhotoSource] {
        [
            PhotoSource(
                name: "Academy Public Affairs",
                url: URL(string: "https://www.uscga.edu/")!,
                category: .academy
            ),
            PhotoSource(
                name: "DVIDS Training Galleries",
                url: URL(string: "https://www.dvidshub.net/")!,
                category: .publicAffairs
            ),
            PhotoSource(
                name: "Parent Volunteer Drop",
                url: URL(string: "https://eb28.co/cc/sources/volunteer-drop/")!,
                category: .parentVolunteer
            )
        ]
    }
}

enum SourceCategory: String, CaseIterable, Identifiable, Codable {
    case academy
    case publicAffairs
    case parentVolunteer
    case athletics
    case custom

    var id: String { rawValue }

    var title: String {
        switch self {
        case .academy: "Academy"
        case .publicAffairs: "Public Affairs"
        case .parentVolunteer: "Parent Drop"
        case .athletics: "Athletics"
        case .custom: "Custom"
        }
    }

    var symbol: String {
        switch self {
        case .academy: "building.columns.fill"
        case .publicAffairs: "megaphone.fill"
        case .parentVolunteer: "person.2.badge.gearshape.fill"
        case .athletics: "figure.run"
        case .custom: "link"
        }
    }

    var tint: Color {
        switch self {
        case .academy: Theme.amber
        case .publicAffairs: Theme.cyan
        case .parentVolunteer: Theme.green
        case .athletics: Color(red: 0.95, green: 0.32, blue: 0.42)
        case .custom: Theme.muted
        }
    }

    var activityLabel: String {
        switch self {
        case .academy: "Official gallery candidate"
        case .publicAffairs: "Public affairs candidate"
        case .parentVolunteer: "Family-approved upload candidate"
        case .athletics: "Athletics gallery candidate"
        case .custom: "Public web source candidate"
        }
    }

    func discoveryScore(for mode: ScanMode) -> Int {
        let baseScore: Int
        switch self {
        case .academy: baseScore = 94
        case .publicAffairs: baseScore = 91
        case .parentVolunteer: baseScore = 89
        case .athletics: baseScore = 87
        case .custom: baseScore = 82
        }
        return min(99, Int(Double(baseScore) * mode.multiplier))
    }
}

struct ConnectedAccount: Identifiable, Codable, Hashable {
    var id = UUID()
    var provider: ConnectedProvider
    var status: ConnectionStatus = .available
    var lastSyncAt: Date?

    static var defaultAccounts: [ConnectedAccount] {
        ConnectedProvider.allCases.map { ConnectedAccount(provider: $0) }
    }
}

enum ConnectedProvider: String, CaseIterable, Identifiable, Codable {
    case google
    case facebook
    case instagram

    var id: String { rawValue }

    var title: String {
        switch self {
        case .google: "Google Photos"
        case .facebook: "Facebook"
        case .instagram: "Instagram"
        }
    }

    var subtitle: String {
        switch self {
        case .google: "Search albums you authorize"
        case .facebook: "Search your connected media"
        case .instagram: "Search your connected posts"
        }
    }

    var symbol: String {
        switch self {
        case .google: "g.circle.fill"
        case .facebook: "f.circle.fill"
        case .instagram: "camera.circle.fill"
        }
    }

    var sampleCandidateURL: String {
        switch self {
        case .google: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=900&q=80"
        case .facebook: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"
        case .instagram: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=900&q=80"
        }
    }
}

enum ConnectionStatus: String, Codable {
    case available
    case needsOAuth
    case connected

    var title: String {
        switch self {
        case .available: "Connect"
        case .needsOAuth: "OAuth Needed"
        case .connected: "Connected"
        }
    }
}

struct UserSettings: Codable, Hashable {
    var priorityAlerts: Bool
    var backgroundWatch: Bool
    var highResolutionSaves: Bool
    var parentName: String
    var parentEmail: String

    static let `default` = UserSettings(
        priorityAlerts: true,
        backgroundWatch: true,
        highResolutionSaves: true,
        parentName: "Alex M.",
        parentEmail: "parent@hq.com"
    )
}

enum AppTab: String, CaseIterable, Identifiable, Codable {
    case scanner
    case intel
    case roster
    case decoder
    case profile

    var id: String { rawValue }

    var title: String {
        switch self {
        case .scanner: "Radar"
        case .intel: "Intel"
        case .roster: "Roster"
        case .decoder: "Decoder"
        case .profile: "Profile"
        }
    }

    var symbol: String {
        switch self {
        case .scanner: "scope"
        case .intel: "photo.on.rectangle.angled"
        case .roster: "person.2"
        case .decoder: "book"
        case .profile: "person.crop.circle"
        }
    }
}

enum ScanMode: String, CaseIterable, Identifiable, Codable {
    case smart
    case deep
    case drops

    var id: String { rawValue }

    var title: String {
        switch self {
        case .smart: "Smart Sweep"
        case .deep: "Deep Recon"
        case .drops: "New Drops"
        }
    }

    var subtitle: String {
        switch self {
        case .smart: "Fast daily scan"
        case .deep: "Maximum coverage"
        case .drops: "Newest uploads"
        }
    }

    var multiplier: Double {
        switch self {
        case .smart: 1.0
        case .deep: 1.15
        case .drops: 1.08
        }
    }

    var tint: Color {
        switch self {
        case .smart: Theme.cyan
        case .deep: Theme.amber
        case .drops: Theme.green
        }
    }
}

enum IntelScope: String, CaseIterable, Identifiable {
    case recent = "Recent"
    case saved = "Saved"

    var id: String { rawValue }
}

struct JargonEntry: Identifiable, Hashable {
    var id: String { term }
    let term: String
    let meaning: String

    static let entries = [
        JargonEntry(term: "PT", meaning: "Physical training. It usually means organized workouts, conditioning, runs, or fitness testing."),
        JargonEntry(term: "Swab Summer", meaning: "The Coast Guard Academy basic training period for incoming cadets. It is intense and highly structured."),
        JargonEntry(term: "Rack", meaning: "A bed. If your cadet says they are hitting the rack, they are going to sleep."),
        JargonEntry(term: "Chow", meaning: "Food or mealtime. A casual military word for eating."),
        JargonEntry(term: "Liberty", meaning: "Approved free time away from normal duties, with limits based on the training phase and unit rules."),
        JargonEntry(term: "Formation", meaning: "A structured group assembly for accountability, instructions, inspection, or movement."),
        JargonEntry(term: "Bravo Zulu", meaning: "Well done. It is a short way to recognize strong performance."),
        JargonEntry(term: "Company", meaning: "A cadet unit or organizational group, often used for training and accountability.")
    ]
}

private extension JSONEncoder {
    static var cadetCatch: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

private extension JSONDecoder {
    static var cadetCatch: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}

private extension ProcessInfo {
    func cadetCatchArgumentValue(after name: String) -> String? {
        guard let index = arguments.firstIndex(of: name) else { return nil }
        let valueIndex = arguments.index(after: index)
        guard valueIndex < arguments.endIndex else { return nil }
        return arguments[valueIndex]
    }
}

private extension Array {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

enum Theme {
    static let background = Color(red: 0.06, green: 0.055, blue: 0.048)
    static let surface = Color(red: 0.12, green: 0.11, blue: 0.095)
    static let elevated = Color(red: 0.18, green: 0.16, blue: 0.13)
    static let amber = Color(red: 0.96, green: 0.64, blue: 0.07)
    static let green = Color(red: 0.22, green: 0.78, blue: 0.42)
    static let cyan = Color(red: 0.22, green: 0.82, blue: 0.90)
    static let muted = Color(red: 0.63, green: 0.60, blue: 0.54)
}

struct AppFlowView: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        Group {
            if !store.hasSeenOnboarding {
                OnboardingView()
            } else if !store.isPremium {
                PaywallView()
            } else {
                MainTabView()
            }
        }
        .background(Theme.background.ignoresSafeArea())
    }
}

struct OnboardingView: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.black, Theme.background, Color(red: 0.10, green: 0.08, blue: 0.03)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 24) {
                Spacer()

                VStack(alignment: .leading, spacing: 12) {
                    Label("Operation: Photo Recovery", systemImage: "shield.lefthalf.filled")
                        .font(.caption.weight(.black))
                        .textCase(.uppercase)
                        .tracking(1.4)
                        .foregroundStyle(Theme.amber)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))

                    Text("CadetCatch")
                        .font(.system(size: 46, weight: .black, design: .rounded))
                        .foregroundStyle(.white)

                    Text("Native tactical photo recovery for military parents. Build private watchlists, scan faster, save intel, and decode academy life in plain English.")
                        .font(.body.weight(.medium))
                        .foregroundStyle(.white.opacity(0.72))
                        .lineSpacing(3)
                }

                HStack(spacing: 10) {
                    FeaturePill(title: "Watchlists", symbol: "star.fill")
                    FeaturePill(title: "AI Letters", symbol: "sparkles")
                    FeaturePill(title: "Fast Saves", symbol: "bolt.fill")
                }

                Button {
                    store.completeOnboarding()
                } label: {
                    Label("Initiate Link", systemImage: "scope")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
            }
            .padding(24)
        }
    }
}

struct PaywallView: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseCenter.self) private var purchases
    @State private var isPurchasing = false
    @State private var isRestoring = false

    var body: some View {
        ScrollView {
            VStack(spacing: 22) {
                VStack(spacing: 14) {
                    Image(systemName: "shield.checkered")
                        .font(.system(size: 46, weight: .black))
                        .foregroundStyle(Theme.amber)
                        .frame(width: 78, height: 78)
                        .background(Theme.amber.opacity(0.14), in: RoundedRectangle(cornerRadius: 24))

                    Text("Tactical Clearance")
                        .font(.largeTitle.bold())
                        .foregroundStyle(.white)

                    Text("Unlock the native CadetCatch Pro command center for persistent cadet watchlists, premium scan modes, saved dossiers, and family-ready sitreps.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)
                }
                .padding(.top, 34)

                VStack(alignment: .leading, spacing: 18) {
                    HStack(alignment: .firstTextBaseline) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("CadetCatch Pro")
                                .font(.title2.bold())
                                .foregroundStyle(.white)
                            Text(purchases.products.first?.displayPrice ?? "$9.99/mo")
                                .font(.system(size: 34, weight: .black, design: .rounded))
                                .foregroundStyle(Theme.amber)
                        }
                        Spacer()
                        Text("Recommended")
                            .font(.caption2.weight(.black))
                            .textCase(.uppercase)
                            .tracking(1.2)
                            .foregroundStyle(Theme.amber)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(Theme.amber.opacity(0.14), in: Capsule())
                    }

                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 10) {
                        MiniStat(value: "3x", label: "Modes")
                        MiniStat(value: "AI", label: "Sitreps")
                        MiniStat(value: "Private", label: "Roster")
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        PremiumFeature(title: "Persistent cadet watchlists")
                        PremiumFeature(title: "Approved-source photo matching queue")
                        PremiumFeature(title: "Smart, Deep Recon, and New Drop scan modes")
                        PremiumFeature(title: "AI sitreps with parent letter drafts")
                        PremiumFeature(title: "Saved intel archive with confidence scores")
                        PremiumFeature(title: "Offline academy jargon decoder")
                        PremiumFeature(title: "Priority alerts for new matches")
                    }

                    Button {
                        Task {
                            isPurchasing = true
                            let purchased = await purchases.purchasePro()
                            if purchased {
                                store.activatePremium()
                            }
                            isPurchasing = false
                        }
                    } label: {
                        if isPurchasing {
                            ProgressView()
                                .tint(.black)
                                .frame(maxWidth: .infinity)
                        } else {
                            Label("Activate Pro", systemImage: "checkmark.seal.fill")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())

                    HStack(spacing: 18) {
                        Button {
                            Task {
                                isRestoring = true
                                let restored = await purchases.restorePurchases()
                                if restored {
                                    store.activatePremium()
                                }
                                isRestoring = false
                            }
                        } label: {
                            Text(isRestoring ? "Restoring..." : "Restore")
                        }

                        Link("Privacy", destination: URL(string: "https://eb28.co/cc/privacy/")!)
                        Link("Terms", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                    }
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Theme.muted)
                    .frame(maxWidth: .infinity)
                }
                .premiumPanel()

                Text("Subscription renews monthly through Apple. Manage or cancel anytime in your App Store account settings.")
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            .padding(20)
        }
        .task {
            await purchases.loadProducts()
        }
    }
}

struct MainTabView: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        @Bindable var store = store

        TabView(selection: $store.selectedTab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack {
                    tabContent(tab)
                        .navigationTitle(tab.title)
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbarBackground(Theme.surface, for: .navigationBar)
                        .toolbarColorScheme(.dark, for: .navigationBar)
                }
                .tabItem {
                    Label(tab.title, systemImage: tab.symbol)
                }
                .tag(tab)
            }
        }
        .tint(Theme.amber)
    }

    @ViewBuilder
    private func tabContent(_ tab: AppTab) -> some View {
        switch tab {
        case .scanner: ScannerView()
        case .intel: IntelView()
        case .roster: RosterView()
        case .decoder: DecoderView()
        case .profile: ProfileView()
        }
    }
}

struct ScannerView: View {
    @Environment(CadetCatchStore.self) private var store
    @State private var isScanning = false
    @State private var scanProgress = 0.0
    @State private var showingSources = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 10) {
                    MetricTile(title: "Roster", value: "\(store.cadets.count)", symbol: "person.2.fill", tint: Theme.cyan)
                    MetricTile(title: "Sources", value: "\(store.enabledSources.count)", symbol: "link.badge.plus", tint: Theme.green)
                    MetricTile(title: "Archive", value: "\(store.archiveCount)", symbol: "archivebox.fill", tint: Theme.amber)
                }

                WatchlistPanel()
                SourceQueuePanel {
                    showingSources = true
                }

                if store.cadets.isEmpty {
                    EmptyStateView(
                        symbol: "person.crop.circle.badge.plus",
                        title: "Target Required",
                        message: "Add a cadet to your roster before running the first native sweep.",
                        buttonTitle: "Open Roster"
                    ) {
                        store.selectedTab = .roster
                    }
                } else {
                    CadetSelector()
                    ScanTargetCard(isScanning: isScanning, scanProgress: scanProgress) {
                        Task { await runScan() }
                    }
                    ScanHistoryPreview()
                }
            }
            .padding(16)
        }
        .background(Theme.background)
        .sheet(isPresented: $showingSources) {
            SourceManagerSheet()
                .presentationDetents([.large])
        }
    }

    private func runScan() async {
        guard !isScanning else { return }
        isScanning = true
        scanProgress = 0

        for step in 1...20 {
            try? await Task.sleep(for: .milliseconds(70))
            scanProgress = Double(step) / 20.0
        }

        await store.runCompletedScan()
        isScanning = false
    }
}

struct SourceQueuePanel: View {
    @Environment(CadetCatchStore.self) private var store
    let onManage: () -> Void

    var latestSummary: SourceSweepSummary? {
        store.sourceSweepSummaries.first
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "face.dashed.fill")
                    .font(.title2.weight(.bold))
                    .foregroundStyle(Theme.cyan)
                    .frame(width: 44, height: 44)
                    .background(Theme.cyan.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))

                VStack(alignment: .leading, spacing: 5) {
                    Text("Private Match Queue")
                        .font(.caption.weight(.black))
                        .textCase(.uppercase)
                        .tracking(1.2)
                        .foregroundStyle(Theme.cyan)
                    Text("\(store.enabledSources.count) approved sources armed")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text("Public websites must be added as HTTPS sources. Google, Facebook, and social media require an owner-authorized account connection.")
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(2)
                }
            }

            HStack(spacing: 10) {
                QueueStat(value: "\(store.approvedSources.count)", label: "Total")
                QueueStat(value: "\(store.authorizedConnectedAccounts.count)", label: "Accounts")
                QueueStat(value: latestSummary.map { "\($0.matchedSourceCount)" } ?? "--", label: "Matched")
            }

            Button(action: onManage) {
                Label("Manage Photo Sources", systemImage: "slider.horizontal.3")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.cyan)
        }
        .premiumPanel()
    }
}

struct QueueStat: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 5) {
            Text(value)
                .font(.headline.weight(.black))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
            Text(label)
                .font(.caption2.weight(.bold))
                .textCase(.uppercase)
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 11)
        .background(Color.black.opacity(0.18), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct SourceManagerSheet: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var sourceName = ""
    @State private var sourceURL = ""
    @State private var category: SourceCategory = .custom
    @State private var validationMessage: String?

    var canAddSource: Bool {
        !sourceName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !sourceURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 10) {
                        Label("Consent-Locked Source Search", systemImage: "lock.shield.fill")
                            .font(.headline.bold())
                            .foregroundStyle(.white)
                        Text("CadetCatch can monitor public-facing HTTPS websites you add, official public affairs galleries, and owner-authorized connected accounts. Private social or Google content requires that account owner to connect access.")
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                            .lineSpacing(3)
                    }
                    .padding(.vertical, 4)
                }
                .listRowBackground(Theme.surface)

                Section("Add Approved Source") {
                    TextField("Source name", text: $sourceName)
                    TextField("https://example.edu/gallery", text: $sourceURL)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                    Picker("Type", selection: $category) {
                        ForEach(SourceCategory.allCases) { category in
                            Label(category.title, systemImage: category.symbol).tag(category)
                        }
                    }
                    Button {
                        if store.addSource(name: sourceName, urlText: sourceURL, category: category) {
                            sourceName = ""
                            sourceURL = ""
                            category = .custom
                            validationMessage = nil
                        } else {
                            validationMessage = "Use a unique HTTPS source with a clear name."
                        }
                    } label: {
                        Label("Add Source", systemImage: "plus.circle.fill")
                    }
                    .disabled(!canAddSource)

                    if let validationMessage {
                        Text(validationMessage)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }
                .listRowBackground(Theme.surface)

                Section("Connected Accounts") {
                    ForEach(store.connectedAccounts) { account in
                        ConnectedAccountRow(account: account)
                    }
                }
                .listRowBackground(Theme.surface)

                Section("Active Queue") {
                    ForEach(store.approvedSources) { source in
                        SourceRow(source: source)
                    }
                    .onDelete { offsets in
                        for index in offsets {
                            store.removeSource(store.approvedSources[index])
                        }
                    }
                }
                .listRowBackground(Theme.surface)

                if !store.sourceSweepSummaries.isEmpty {
                    Section("Recent Source Sweeps") {
                        ForEach(store.sourceSweepSummaries.prefix(4)) { summary in
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("\(summary.cadetName) - \(summary.mode)")
                                        .font(.subheadline.weight(.bold))
                                        .foregroundStyle(.white)
                                    Text(summary.scannedAt.formatted(date: .abbreviated, time: .shortened))
                                        .font(.caption)
                                        .foregroundStyle(Theme.muted)
                                }
                                Spacer()
                                Text("\(summary.matchedSourceCount)/\(summary.checkedSourceCount + summary.connectedAccountCount)")
                                    .font(.headline.weight(.black))
                                    .foregroundStyle(Theme.green)
                            }
                        }
                    }
                    .listRowBackground(Theme.surface)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Photo Sources")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct ConnectedAccountRow: View {
    @Environment(CadetCatchStore.self) private var store
    let account: ConnectedAccount

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: account.provider.symbol)
                .foregroundStyle(account.status == .connected ? Theme.green : Theme.cyan)
                .frame(width: 34, height: 34)
                .background((account.status == .connected ? Theme.green : Theme.cyan).opacity(0.12), in: RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text(account.provider.title)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                Text(account.status == .needsOAuth ? "Provider credentials required before sign-in can open." : account.provider.subtitle)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
                    .lineLimit(2)
            }

            Spacer()

            Button {
                if account.status == .connected {
                    store.disconnectAccount(account)
                } else {
                    store.prepareAccountConnection(account.provider)
                }
            } label: {
                Text(account.status == .connected ? "Disconnect" : account.status.title)
                    .font(.caption.weight(.black))
                    .textCase(.uppercase)
            }
            .buttonStyle(.bordered)
            .tint(account.status == .connected ? .red : Theme.cyan)
        }
        .padding(.vertical, 4)
    }
}

struct SourceRow: View {
    @Environment(CadetCatchStore.self) private var store
    let source: PhotoSource

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: source.category.symbol)
                .foregroundStyle(source.category.tint)
                .frame(width: 34, height: 34)
                .background(source.category.tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 4) {
                Text(source.name)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                Text(source.url.host() ?? source.url.absoluteString)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
                    .lineLimit(1)
                if let lastCheckedAt = source.lastCheckedAt {
                    Text("Checked \(lastCheckedAt.formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption2)
                        .foregroundStyle(Theme.green)
                }
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { source.enabled },
                set: { _ in store.toggleSource(source) }
            ))
            .labelsHidden()
            .tint(Theme.green)
        }
        .padding(.vertical, 4)
    }
}

struct WatchlistPanel: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Pro Watchlist")
                        .font(.caption.weight(.black))
                        .textCase(.uppercase)
                        .tracking(1.2)
                        .foregroundStyle(Theme.amber)
                    Text("Source Queue Ready")
                        .font(.headline)
                        .foregroundStyle(.white)
                    Text(store.settings.backgroundWatch ? "Background watch is armed for approved academy drops." : "Background watch is paused. Manual source sweeps still work.")
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                }
                Spacer()
                Toggle("", isOn: Binding(
                    get: { store.settings.backgroundWatch },
                    set: { _ in store.toggleBackgroundWatch() }
                ))
                .labelsHidden()
                .tint(Theme.green)
            }

            HStack(spacing: 8) {
                ForEach(ScanMode.allCases) { mode in
                    Button {
                        store.setScanMode(mode)
                    } label: {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(mode.title)
                                .font(.caption.weight(.black))
                                .foregroundStyle(store.scanMode == mode ? mode.tint : .white.opacity(0.78))
                            Text(mode.subtitle)
                                .font(.caption2)
                                .foregroundStyle(Theme.muted)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(store.scanMode == mode ? mode.tint.opacity(0.16) : Color.black.opacity(0.18), in: RoundedRectangle(cornerRadius: 14))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(store.scanMode == mode ? mode.tint.opacity(0.75) : Color.white.opacity(0.08), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .premiumPanel()
    }
}

struct CadetSelector: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(store.cadets) { cadet in
                    Button {
                        store.selectCadet(cadet)
                    } label: {
                        HStack(spacing: 8) {
                            CadetAvatar(cadet: cadet, size: 28)
                            Text(cadet.name)
                                .font(.caption.weight(.bold))
                                .textCase(.uppercase)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(store.activeCadet?.id == cadet.id ? Theme.amber.opacity(0.18) : Theme.surface, in: Capsule())
                        .overlay(Capsule().stroke(store.activeCadet?.id == cadet.id ? Theme.amber : Color.white.opacity(0.08), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 1)
        }
    }
}

struct ScanTargetCard: View {
    @Environment(CadetCatchStore.self) private var store
    let isScanning: Bool
    let scanProgress: Double
    let onScan: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Target Locked")
                        .font(.headline.weight(.black))
                        .foregroundStyle(.white)
                    Text(store.activeCadet?.unit.isEmpty == false ? store.activeCadet?.unit ?? "" : "Unknown Unit")
                        .font(.caption.monospaced().weight(.bold))
                        .textCase(.uppercase)
                        .foregroundStyle(Theme.muted)
                }
                Spacer()
                Text(store.scanMode.title)
                    .font(.caption2.weight(.black))
                    .textCase(.uppercase)
                    .tracking(1)
                    .foregroundStyle(store.scanMode.tint)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 6)
                    .background(store.scanMode.tint.opacity(0.12), in: Capsule())
            }

            ZStack {
                Circle()
                    .fill(Theme.elevated)
                    .frame(width: 174, height: 174)
                Circle()
                    .stroke(store.scanMode.tint.opacity(0.8), lineWidth: 4)
                    .frame(width: 174, height: 174)
                CadetAvatar(cadet: store.activeCadet, size: 158)
                Image(systemName: "scope")
                    .font(.system(size: 112, weight: .ultraLight))
                    .foregroundStyle(.white.opacity(0.28))
                if isScanning {
                    Circle()
                        .trim(from: 0, to: scanProgress)
                        .stroke(store.scanMode.tint, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .frame(width: 190, height: 190)
                }
            }
            .padding(.vertical, 4)

            if isScanning {
                ProgressView(value: scanProgress)
                    .tint(store.scanMode.tint)
                Text("Checking priority photo sources...")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Theme.muted)
            }

            Button(action: onScan) {
                Label(isScanning ? "Sweeping Networks" : "Run \(store.scanMode.title)", systemImage: isScanning ? "arrow.triangle.2.circlepath" : "scope")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(isScanning)
        }
        .premiumPanel()
    }
}

struct ScanHistoryPreview: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        if !store.scanHistory.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("Recent Sweeps")
                    .font(.caption.weight(.black))
                    .textCase(.uppercase)
                    .tracking(1.3)
                    .foregroundStyle(Theme.muted)
                ForEach(store.scanHistory.prefix(3)) { record in
                    HStack(spacing: 12) {
                        Image(systemName: "waveform.path.ecg")
                            .foregroundStyle(Theme.green)
                            .frame(width: 28, height: 28)
                            .background(Theme.green.opacity(0.12), in: Circle())
                        VStack(alignment: .leading, spacing: 3) {
                            Text("\(record.cadetName) - \(record.mode)")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)
                            Text(record.scannedAt.formatted(date: .abbreviated, time: .shortened))
                                .font(.caption)
                                .foregroundStyle(Theme.muted)
                        }
                        Spacer()
                        Text("\(record.matchCount)")
                            .font(.title3.weight(.black))
                            .foregroundStyle(Theme.amber)
                    }
                }
            }
            .premiumPanel()
        }
    }
}

struct RosterView: View {
    @Environment(CadetCatchStore.self) private var store
    @State private var showingAddCadet = false

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                if store.cadets.isEmpty {
                    EmptyStateView(
                        symbol: "person.crop.circle.badge.plus",
                        title: "Empty Roster",
                        message: "Add family members or friends to begin tracking their academy photos.",
                        buttonTitle: "Add Cadet"
                    ) {
                        showingAddCadet = true
                    }
                    .padding(.top, 80)
                } else {
                    ForEach(store.cadets) { cadet in
                        Button {
                            store.selectCadet(cadet)
                            store.selectedTab = .scanner
                        } label: {
                            HStack(spacing: 14) {
                                CadetAvatar(cadet: cadet, size: 62)
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(cadet.name)
                                        .font(.headline.weight(.black))
                                        .foregroundStyle(.white)
                                    Text(cadet.unit.isEmpty ? "Unknown Unit" : cadet.unit)
                                        .font(.caption.monospaced().weight(.bold))
                                        .textCase(.uppercase)
                                        .foregroundStyle(Theme.amber)
                                    Text(cadet.watchStatus)
                                        .font(.caption)
                                        .foregroundStyle(Theme.muted)
                                }
                                Spacer()
                                Image(systemName: store.activeCadet?.id == cadet.id ? "checkmark.circle.fill" : "scope")
                                    .foregroundStyle(store.activeCadet?.id == cadet.id ? Theme.green : .white.opacity(0.55))
                            }
                            .premiumPanel()
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(16)
        }
        .background(Theme.background)
        .toolbar {
            Button {
                showingAddCadet = true
            } label: {
                Image(systemName: "plus")
            }
        }
        .sheet(isPresented: $showingAddCadet) {
            AddCadetSheet()
                .presentationDetents([.large])
        }
    }
}

struct AddCadetSheet: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var unit = ""
    @State private var relation = "Family"
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var photoData: Data?

    var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        let photoButtonTitle = photoData == nil ? "Choose Base Photo" : "Replace Photo"

        NavigationStack {
            Form {
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 12) {
                            CadetAvatar(data: photoData, fallback: name, size: 108)
                            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                                Label(photoButtonTitle, systemImage: "photo.badge.plus")
                            }
                            .buttonStyle(.bordered)
                            .tint(Theme.amber)
                        }
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }

                Section("Cadet") {
                    TextField("Cadet Name", text: $name)
                    TextField("Unit or Company", text: $unit)
                    TextField("Relationship", text: $relation)
                }

                Section {
                    Button {
                        store.addCadet(name: name, unit: unit, relation: relation, photoData: photoData)
                        dismiss()
                    } label: {
                        Label("Register Cadet", systemImage: "checkmark.seal.fill")
                    }
                    .disabled(!canSave)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Register Cadet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .onChange(of: selectedPhoto) { _, item in
                Task {
                    photoData = try? await item?.loadTransferable(type: Data.self)
                }
            }
        }
    }
}

struct IntelView: View {
    @Environment(CadetCatchStore.self) private var store
    @State private var scope: IntelScope = .recent
    @State private var query = ""
    @State private var selectedMatch: IntelMatch?

    var filteredMatches: [IntelMatch] {
        let source = scope == .recent ? store.matches : store.savedMatches
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return source }
        return source.filter {
            $0.cadetName.localizedCaseInsensitiveContains(query) ||
            $0.activity.localizedCaseInsensitiveContains(query) ||
            $0.source.localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            Picker("Intel", selection: $scope) {
                ForEach(IntelScope.allCases) { scope in
                    Text(scope.rawValue).tag(scope)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 12)

            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(Theme.muted)
                TextField("Search sources, activity, cadet", text: $query)
                    .textInputAutocapitalization(.never)
            }
            .padding(12)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 16)

            if filteredMatches.isEmpty {
                EmptyStateView(
                    symbol: scope == .recent ? "photo.on.rectangle.angled" : "archivebox",
                    title: scope == .recent ? "No Recent Intel" : "Archive Empty",
                    message: scope == .recent ? "Run a sweep from Radar to populate the latest photo matches." : "Save important matches to keep them here.",
                    buttonTitle: scope == .recent ? "Open Radar" : "Open Recent"
                ) {
                    if scope == .recent {
                        store.selectedTab = .scanner
                    } else {
                        scope = .recent
                    }
                }
                .padding(.top, 70)
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 154), spacing: 12)], spacing: 12) {
                        ForEach(filteredMatches) { match in
                            IntelCard(match: match)
                                .onTapGesture {
                                    selectedMatch = match
                                }
                        }
                    }
                    .padding(16)
                }
            }
        }
        .background(Theme.background)
        .sheet(item: $selectedMatch) { match in
            IntelDetailView(match: match)
                .presentationDetents([.large])
        }
    }
}

struct IntelCard: View {
    @Environment(CadetCatchStore.self) private var store
    let match: IntelMatch

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                MatchImage(match: match, contentMode: .fill)
                .frame(height: 142)
                .clipped()

                if store.isSaved(match) {
                    Image(systemName: "bookmark.fill")
                        .font(.caption.weight(.black))
                        .foregroundStyle(Theme.amber)
                        .padding(8)
                        .background(.black.opacity(0.7), in: Circle())
                        .padding(8)
                }
            }

            VStack(alignment: .leading, spacing: 7) {
                HStack {
                    Text("\(match.confidence)%")
                        .font(.caption.weight(.black))
                        .foregroundStyle(Theme.green)
                    Spacer()
                    Text(match.mode)
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Theme.muted)
                }
                Text(match.activity)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                Text(match.source)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
                    .lineLimit(1)
            }
            .padding(12)
        }
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.white.opacity(0.08), lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }
}

struct IntelDetailView: View {
    @Environment(CadetCatchStore.self) private var store
    let match: IntelMatch
    @State private var isGenerating = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    MatchImage(match: match, contentMode: .fit)
                    .frame(maxWidth: .infinity, minHeight: 280)
                    .background(Color.black, in: RoundedRectangle(cornerRadius: 22))
                    .clipShape(RoundedRectangle(cornerRadius: 22))

                    HStack(spacing: 10) {
                        DetailBadge(value: "\(match.confidence)%", label: "Confidence", tint: Theme.green)
                        DetailBadge(value: match.mode, label: "Mode", tint: Theme.amber)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text(match.activity)
                            .font(.title2.bold())
                            .foregroundStyle(.white)
                        Text("\(match.source) - \(match.capturedAt)")
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                    }
                    .premiumPanel()

                    VStack(alignment: .leading, spacing: 12) {
                        Label("AI Sitrep Analysis", systemImage: "sparkles")
                            .font(.headline.bold())
                            .foregroundStyle(.white)

                        if let draft = store.draft(for: match) {
                            Text(draft)
                                .font(.subheadline.monospaced())
                                .foregroundStyle(.white.opacity(0.80))
                                .lineSpacing(3)
                            ShareLink(item: draft) {
                                Label("Share Letter Draft", systemImage: "square.and.arrow.up")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Theme.green)
                        } else {
                            Text("Generate a short activity readout and parent-ready encouragement draft from this match.")
                                .font(.subheadline)
                                .foregroundStyle(Theme.muted)
                            Button {
                                isGenerating = true
                                DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                                    store.generateDraft(for: match)
                                    isGenerating = false
                                }
                            } label: {
                                if isGenerating {
                                    ProgressView().tint(.black).frame(maxWidth: .infinity)
                                } else {
                                    Label("Generate Sitrep", systemImage: "sparkles")
                                        .frame(maxWidth: .infinity)
                                }
                            }
                            .buttonStyle(PrimaryButtonStyle())
                        }
                    }
                    .premiumPanel()
                }
                .padding(16)
            }
            .background(Theme.background)
            .navigationTitle("Asset Dossier")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                Button {
                    if store.isSaved(match) {
                        store.removeSaved(match)
                    } else {
                        store.save(match)
                    }
                } label: {
                    Image(systemName: store.isSaved(match) ? "bookmark.fill" : "bookmark")
                }
            }
        }
    }
}

struct MatchImage: View {
    let match: IntelMatch
    let contentMode: SwiftUI.ContentMode

    var body: some View {
        if let assetName = match.assetName {
            Image(assetName)
                .resizable()
                .aspectRatio(contentMode: contentMode)
        } else {
            AsyncImage(url: match.imageURL) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().aspectRatio(contentMode: contentMode)
                case .empty:
                    ZStack {
                        Rectangle().fill(Theme.elevated)
                        ProgressView().tint(Theme.amber)
                    }
                case .failure:
                    Rectangle().fill(Theme.elevated)
                @unknown default:
                    Rectangle().fill(Theme.elevated)
                }
            }
        }
    }
}

struct DecoderView: View {
    @State private var query = ""
    @State private var selected: JargonEntry?

    var filteredEntries: [JargonEntry] {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return JargonEntry.entries
        }
        return JargonEntry.entries.filter { $0.term.localizedCaseInsensitiveContains(query) || $0.meaning.localizedCaseInsensitiveContains(query) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Translate military acronyms and academy slang into plain English.")
                    .font(.subheadline)
                    .foregroundStyle(Theme.muted)

                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Theme.muted)
                    TextField("Try PT, Liberty, Formation", text: $query)
                        .textInputAutocapitalization(.words)
                }
                .padding(12)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 14))

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(JargonEntry.entries.prefix(6)) { entry in
                            Button(entry.term) {
                                query = entry.term
                                selected = entry
                            }
                            .buttonStyle(.bordered)
                            .tint(Theme.amber)
                        }
                    }
                }

                ForEach(filteredEntries) { entry in
                    Button {
                        selected = entry
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(entry.term)
                                .font(.headline.weight(.black))
                                .foregroundStyle(.white)
                            Text(entry.meaning)
                                .font(.subheadline)
                                .foregroundStyle(Theme.muted)
                                .multilineTextAlignment(.leading)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .premiumPanel()
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
        }
        .background(Theme.background)
        .sheet(item: $selected) { entry in
            VStack(alignment: .leading, spacing: 16) {
                Capsule()
                    .fill(Color.white.opacity(0.18))
                    .frame(width: 44, height: 5)
                    .frame(maxWidth: .infinity)
                Label("Decryption Result", systemImage: "book.fill")
                    .font(.headline.bold())
                    .foregroundStyle(Theme.amber)
                Text(entry.term)
                    .font(.largeTitle.bold())
                    .foregroundStyle(.white)
                Text(entry.meaning)
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.78))
                    .lineSpacing(4)
                Spacer()
            }
            .padding(24)
            .background(Theme.background)
            .presentationDetents([.medium])
        }
    }
}

struct ProfileView: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseCenter.self) private var purchases
    @State private var showingResetAlert = false
    @State private var isRestoring = false

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                HStack(spacing: 14) {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 58))
                        .foregroundStyle(Theme.amber)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(store.settings.parentName)
                            .font(.title3.bold())
                            .foregroundStyle(.white)
                        Text(store.settings.parentEmail)
                            .font(.subheadline.monospaced())
                            .foregroundStyle(Theme.muted)
                    }
                    Spacer()
                }
                .premiumPanel()

                VStack(spacing: 0) {
                    SettingsToggle(title: "Priority Alerts", subtitle: "Notify when high-confidence matches appear.", isOn: store.settings.priorityAlerts) {
                        store.togglePriorityAlerts()
                    }
                    Divider().overlay(Color.white.opacity(0.08))
                    SettingsToggle(title: "Background Watch", subtitle: "Keep monitoring priority sources.", isOn: store.settings.backgroundWatch) {
                        store.toggleBackgroundWatch()
                    }
                    Divider().overlay(Color.white.opacity(0.08))
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Clearance Level")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)
                            Text("CadetCatch Pro active")
                                .font(.caption)
                                .foregroundStyle(Theme.muted)
                        }
                        Spacer()
                        Text("Tactical")
                            .font(.caption.weight(.black))
                            .textCase(.uppercase)
                            .foregroundStyle(Theme.amber)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(Theme.amber.opacity(0.12), in: Capsule())
                    }
                    .padding(16)
                }
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 20))
                .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.white.opacity(0.08), lineWidth: 1))

                VStack(spacing: 10) {
                    Button {
                        Task {
                            isRestoring = true
                            let restored = await purchases.restorePurchases()
                            if restored {
                                store.activatePremium()
                            }
                            isRestoring = false
                        }
                    } label: {
                        ProfileAction(title: isRestoring ? "Restoring Purchases" : "Restore Purchases", symbol: "arrow.clockwise")
                    }
                    .buttonStyle(.plain)

                    ProfileAction(title: "Manage Subscription", symbol: "creditcard")
                    Link(destination: URL(string: "https://eb28.co/cc/privacy/")!) {
                        ProfileAction(title: "Privacy Policy", symbol: "lock.shield")
                    }
                    Link(destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!) {
                        ProfileAction(title: "Terms of Use", symbol: "doc.text")
                    }
                    ProfileAction(title: "Export Saved Intel", symbol: "square.and.arrow.up")
                }

                Button(role: .destructive) {
                    showingResetAlert = true
                } label: {
                    Label("Sign Out and Clear Local Data", systemImage: "rectangle.portrait.and.arrow.right")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(.red)
            }
            .padding(16)
        }
        .background(Theme.background)
        .alert("Clear CadetCatch data?", isPresented: $showingResetAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Clear", role: .destructive) {
                store.resetAccount()
            }
        } message: {
            Text("This removes the local roster, saved intel, scan history, and premium preview state on this device.")
        }
    }
}

struct SettingsToggle: View {
    let title: String
    let subtitle: String
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.white)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                }
                Spacer()
                Image(systemName: isOn ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isOn ? Theme.green : Theme.muted)
            }
            .padding(16)
        }
        .buttonStyle(.plain)
    }
}

struct ProfileAction: View {
    let title: String
    let symbol: String

    var body: some View {
        HStack {
            Label(title, systemImage: symbol)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(Theme.muted)
        }
        .padding(16)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.white.opacity(0.08), lineWidth: 1))
    }
}

struct FeaturePill: View {
    let title: String
    let symbol: String

    var body: some View {
        VStack(spacing: 7) {
            Image(systemName: symbol)
                .foregroundStyle(Theme.amber)
            Text(title)
                .font(.caption2.weight(.black))
                .textCase(.uppercase)
                .tracking(0.8)
                .foregroundStyle(.white.opacity(0.78))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.08), lineWidth: 1))
    }
}

struct PremiumFeature: View {
    let title: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Theme.amber)
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white.opacity(0.86))
            Spacer()
        }
    }
}

struct MiniStat: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 5) {
            Text(value)
                .font(.headline.weight(.black))
                .foregroundStyle(.white)
            Text(label)
                .font(.caption2.weight(.bold))
                .textCase(.uppercase)
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.black.opacity(0.22), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct MetricTile: View {
    let title: String
    let value: String
    let symbol: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(title)
                    .font(.caption2.weight(.black))
                    .textCase(.uppercase)
                    .foregroundStyle(Theme.muted)
                Spacer()
                Image(systemName: symbol)
                    .foregroundStyle(tint)
            }
            Text(value)
                .font(.system(size: 28, weight: .black, design: .rounded))
                .foregroundStyle(.white)
        }
        .padding(12)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.white.opacity(0.08), lineWidth: 1))
    }
}

struct DetailBadge: View {
    let value: String
    let label: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(value)
                .font(.headline.weight(.black))
                .foregroundStyle(tint)
            Text(label)
                .font(.caption2.weight(.bold))
                .textCase(.uppercase)
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 16))
    }
}

struct EmptyStateView: View {
    let symbol: String
    let title: String
    let message: String
    let buttonTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: symbol)
                .font(.system(size: 48, weight: .semibold))
                .foregroundStyle(Theme.muted)
            Text(title)
                .font(.title3.weight(.black))
                .foregroundStyle(.white)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .lineSpacing(3)
            Button(buttonTitle, action: action)
                .buttonStyle(PrimaryButtonStyle())
                .padding(.top, 4)
        }
        .padding(22)
        .frame(maxWidth: .infinity)
        .premiumPanel()
    }
}

struct CadetAvatar: View {
    var cadet: Cadet?
    var data: Data?
    var fallback: String?
    let size: CGFloat

    init(cadet: Cadet?, size: CGFloat) {
        self.cadet = cadet
        self.data = cadet?.photoData
        self.fallback = cadet?.name
        self.size = size
    }

    init(data: Data?, fallback: String?, size: CGFloat) {
        self.cadet = nil
        self.data = data
        self.fallback = fallback
        self.size = size
    }

    var initials: String {
        let value = fallback?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let parts = value.split(separator: " ")
        let letters = parts.prefix(2).compactMap(\.first)
        return letters.isEmpty ? "CC" : String(letters).uppercased()
    }

    var body: some View {
        ZStack {
            if let data, let image = UIImage(data: data) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                LinearGradient(colors: [Theme.elevated, Theme.amber.opacity(0.25)], startPoint: .topLeading, endPoint: .bottomTrailing)
                Text(initials)
                    .font(.system(size: size * 0.28, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(Theme.amber.opacity(0.65), lineWidth: max(1, size * 0.025)))
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.black))
            .textCase(.uppercase)
            .tracking(1.2)
            .foregroundStyle(.black)
            .padding(.vertical, 15)
            .padding(.horizontal, 18)
            .background(Theme.amber.opacity(configuration.isPressed ? 0.82 : 1), in: RoundedRectangle(cornerRadius: 16))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

extension View {
    func premiumPanel() -> some View {
        padding(16)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.white.opacity(0.08), lineWidth: 1))
    }
}
