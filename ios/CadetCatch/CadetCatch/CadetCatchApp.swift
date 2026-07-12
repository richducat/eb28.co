import CoreML
import CoreImage
import CryptoKit
import Photos
import PhotosUI
import StoreKit
import SwiftUI
import UIKit
import Vision
import ActivityKit
import FirebaseAnalytics
import FirebaseCore

enum CadetCatchAnalyticsEvent: String {
    case rosterCreated = "roster_created"
    case photoCheckStarted = "photo_check_started"
    case photoCheckCompleted = "photo_check_completed"
    case paywallView = "paywall_view"
}

@MainActor
enum CadetCatchAnalytics {
    private static let loggedTransactionIDsKey = "cadetcatch.analytics.logged-transactions.v1"
    private(set) static var isConfigured = false

    static func configure() {
        guard FirebaseApp.app() == nil else {
            isConfigured = true
            return
        }

        guard
            let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
            let options = FirebaseOptions(contentsOfFile: path),
            !options.googleAppID.isEmpty,
            options.projectID?.isEmpty == false
        else {
            #if DEBUG
            print("CadetCatch analytics disabled: Firebase app configuration is missing.")
            #endif
            return
        }

        FirebaseApp.configure(options: options)
        Analytics.setUserProperty("false", forName: "allow_ad_personalization_signals")
        isConfigured = true
    }

    static func log(_ event: CadetCatchAnalyticsEvent, parameters: [String: Any]? = nil) {
        guard isConfigured else { return }
        Analytics.logEvent(event.rawValue, parameters: parameters)
    }

    static func logVerifiedTransaction(_ transaction: StoreKit.Transaction) {
        guard isConfigured else { return }

        let transactionID = String(transaction.id)
        let defaults = UserDefaults.standard
        var loggedIDs = Set(defaults.stringArray(forKey: loggedTransactionIDsKey) ?? [])
        guard loggedIDs.insert(transactionID).inserted else { return }

        Analytics.logTransaction(transaction)
        defaults.set(Array(loggedIDs.sorted().suffix(200)), forKey: loggedTransactionIDsKey)
    }
}

@main
struct CadetCatchApp: App {
    @State private var store = CadetCatchStore()
    @State private var purchases = PurchaseManager()
    @State private var access = AccessManager()

    init() {
        CadetCatchAnalytics.configure()
    }

    var body: some Scene {
        WindowGroup {
            AppFlowView()
                .environment(store)
                .environment(purchases)
                .environment(access)
                .preferredColorScheme(.light)
                .task {
                    await purchases.configure()
                    if access.isConfigured {
                        await access.refreshStatus()
                    }
                }
        }
    }
}

@Observable
@MainActor
final class ScannerProgress {
    var totalPhotosFound = 0
    var photosScanned = 0
    var photosMatched = 0
    var startDate: Date? = nil
    var isScanning = false
    var message: String = ""
    var isCancelled = false
    
    var progressString: String {
        if !message.isEmpty { return message }
        guard totalPhotosFound > 0, let start = startDate else { return "Searching event photos..." }
        let elapsed = Date().timeIntervalSince(start)
        let percent = Int((Double(photosScanned) / Double(totalPhotosFound)) * 100)
        
        let timeLeftString: String
        if photosScanned > 5 {
            let avgTime = elapsed / Double(photosScanned)
            let remaining = Double(totalPhotosFound - photosScanned) * avgTime
            let minutes = Int(remaining) / 60
            if minutes > 0 {
                timeLeftString = "\(minutes) minutes left"
            } else {
                timeLeftString = "Less than a minute left"
            }
        } else {
            timeLeftString = "Calculating time left..."
        }
        
        return "\(photosMatched) possible match\(photosMatched == 1 ? "" : "es") found • \(percent)% complete • \(timeLeftString)"
    }

    func reset() {
        totalPhotosFound = 0
        photosScanned = 0
        photosMatched = 0
        startDate = Date()
        isScanning = true
        isCancelled = false
        message = ""
    }
}

enum SearchTolerance: String, CaseIterable, Codable, Identifiable {
    case high
    case medium
    case low

    var id: String { rawValue }

    var title: String {
        switch self {
        case .high: "High"
        case .medium: "Medium"
        case .low: "Low"
        }
    }

    var subtitle: String {
        switch self {
        case .high: "Strict"
        case .medium: "Balanced"
        case .low: "Broad"
        }
    }

    var minimumScore: Double {
        switch self {
        case .high: 0.80
        case .medium: 0.65
        case .low: 0.55
        }
    }

    var scoreLabel: String {
        "\(Int((minimumScore * 100).rounded()))%+"
    }

    var helpTitle: String {
        "\(title) match range"
    }

    var helpText: String {
        switch self {
        case .high:
            "Shows only the closest-looking photos. Best for clear, front-facing pictures and fewer lookalikes."
        case .medium:
            "Looks a little wider for different angles, lighting, and expressions while still filtering weaker guesses."
        case .low:
            "Broadest search for side profiles or tough angles. Review these results carefully because lookalikes are more likely."
        }
    }
}

@MainActor
@Observable
final class CadetCatchStore {
    var hasSeenOnboarding: Bool
    var selectedTab: AppTab
    var cadets: [Cadet]
    var activeCadetID: Cadet.ID?
    var candidates: [PhotoCandidate]
    var savedCandidates: [PhotoCandidate]
    var scanRecords: [ScanRecord]
    var sources: [PhotoSource]
    var notes: [String: String]
    var lastScanMessage: String?
    var previewSearchUsed: Bool
    var searchCredits: Int
    var unlockedImageURLs: Set<String>
    var searchTolerance: SearchTolerance
    
    final class ActivityWrapper: @unchecked Sendable {
        let activity: Activity<ScanActivityAttributes>
        init(_ activity: Activity<ScanActivityAttributes>) { self.activity = activity }
    }
    
    // Advanced Telemetry & Cancellation
    @ObservationIgnored var scanTask: Task<Void, Never>?
    @ObservationIgnored var currentActivity: ActivityWrapper?
    var scanProgress = ScannerProgress()
    var showScanReceipt = false

    @ObservationIgnored private let storageKey = "cadetcatch.native.state.v1"
    @ObservationIgnored private let defaults = UserDefaults.standard

    init() {
        #if DEBUG
        if let state = CadetCatchDebugFixture.seededState() {
            hasSeenOnboarding = state.hasSeenOnboarding
            selectedTab = state.selectedTab
            cadets = state.cadets
            activeCadetID = state.activeCadetID
            candidates = state.candidates
            savedCandidates = state.savedCandidates
            scanRecords = state.scanRecords
            sources = state.sources
            notes = state.notes
            lastScanMessage = state.lastScanMessage
            previewSearchUsed = state.previewSearchUsed ?? false
            searchCredits = state.searchCredits ?? 0
            unlockedImageURLs = state.unlockedImageURLs ?? []
            searchTolerance = state.searchTolerance ?? .high
            normalizeParentFacingState()
            return
        }
        #endif

        if
            let data = defaults.data(forKey: storageKey),
            let state = try? JSONDecoder.cadetCatch.decode(PersistedState.self, from: data)
        {
            hasSeenOnboarding = state.hasSeenOnboarding
            selectedTab = state.selectedTab
            cadets = state.cadets
            activeCadetID = state.activeCadetID
            candidates = state.candidates
            savedCandidates = state.savedCandidates
            scanRecords = state.scanRecords
            sources = state.sources
            notes = state.notes
            lastScanMessage = state.lastScanMessage
            previewSearchUsed = state.previewSearchUsed ?? false
            searchCredits = state.searchCredits ?? 0
            unlockedImageURLs = state.unlockedImageURLs ?? []
            searchTolerance = state.searchTolerance ?? .high
            normalizeParentFacingState()
        } else {
            hasSeenOnboarding = false
            selectedTab = .home
            cadets = []
            activeCadetID = nil
            candidates = []
            savedCandidates = []
            scanRecords = []
            sources = PhotoSource.defaultSources
            notes = [:]
            lastScanMessage = nil
            previewSearchUsed = false
            searchCredits = 0
            unlockedImageURLs = []
            searchTolerance = .high
        }
    }

    private func normalizeParentFacingState() {
        cadets = cadets.map { cadet in
            var cleaned = cadet
            if cleaned.name == "Synthetic QA Cadet" {
                cleaned.name = "Sample Cadet"
            }
            if cleaned.unit == "Fixture Unit" {
                cleaned.unit = "Sample Unit"
            }
            if cleaned.relation == "QA" {
                cleaned.relation = "Family"
            }
            return cleaned
        }

        candidates = candidates.map(Self.parentFacingCandidate)
        savedCandidates = savedCandidates.map(Self.parentFacingCandidate)
        scanRecords = scanRecords.map { record in
            var cleaned = record
            if cleaned.cadetName == "Synthetic QA Cadet" {
                cleaned.cadetName = "Sample Cadet"
            }
            return cleaned
        }
        sources = sources.map { source in
            var cleaned = source
            if cleaned.name == "PDUDDY Archive (Server)" {
                cleaned.name = "PDUDDY Event Photos"
            } else if cleaned.name == "Synthetic Multi-Face QA Source" {
                cleaned.name = "Sample Event Photos"
            }
            return cleaned
        }
        notes = notes.mapValues { note in
            note
                .replacingOccurrences(of: "Synthetic QA Cadet", with: "Sample Cadet")
                .replacingOccurrences(of: "CadetCatch Photo Index", with: "CadetCatch Photos")
                .replacingOccurrences(of: "CadetCatch Search API", with: "CadetCatch")
                .replacingOccurrences(of: "Source:", with: "Collection:")
        }
    }

    private static func parentFacingCandidate(_ candidate: PhotoCandidate) -> PhotoCandidate {
        var cleaned = candidate
        if cleaned.cadetName == "Synthetic QA Cadet" {
            cleaned.cadetName = "Sample Cadet"
        }
        if cleaned.sourceName == "CadetCatch Photo Index" || cleaned.sourceName == "Synthetic Multi-Face QA Source" {
            cleaned.sourceName = "CadetCatch Photos"
        }
        if cleaned.sourceHost == "CadetCatch Search API" || cleaned.sourceHost.contains("api.cadetcatch.com") {
            cleaned.sourceHost = "CadetCatch"
        }
        return cleaned
    }

    var activeCadet: Cadet? {
        cadets.first(where: { $0.id == activeCadetID }) ?? cadets.first
    }

    var enabledSources: [PhotoSource] {
        sources.filter(\.enabled)
    }

    var previewSearchAvailable: Bool {
        !previewSearchUsed
    }

    func canStartSearch(hasMonthlyAccess: Bool) -> Bool {
        hasMonthlyAccess || searchCredits > 0 || previewSearchAvailable
    }

    func searchAccessLabel(hasMonthlyAccess: Bool) -> String {
        if hasMonthlyAccess {
            return "Monthly access active"
        }
        if searchCredits == 1 {
            return "1 photo check available"
        }
        if searchCredits > 1 {
            return "\(searchCredits) photo checks available"
        }
        if previewSearchAvailable {
            return "Preview photo check available"
        }
        return "Purchase required for another check"
    }

    func beginSearch(hasMonthlyAccess: Bool) -> Bool {
        if hasMonthlyAccess {
            return true
        }

        if searchCredits > 0 {
            searchCredits -= 1
            persist()
            return true
        }

        if previewSearchAvailable {
            previewSearchUsed = true
            persist()
            return true
        }

        lastScanMessage = "Purchase one more photo search or start monthly access to continue."
        persist()
        return false
    }

    func addSearchCredit() {
        searchCredits += 1
        persist()
    }

    func updateSearchTolerance(_ tolerance: SearchTolerance) {
        guard searchTolerance != tolerance else { return }
        searchTolerance = tolerance
        persist()
    }

    func isUnlocked(_ candidate: PhotoCandidate, hasMonthlyAccess: Bool) -> Bool {
        hasMonthlyAccess || unlockedImageURLs.contains(candidate.imageURL.absoluteString)
    }

    func unlock(_ candidate: PhotoCandidate) {
        unlockedImageURLs.insert(candidate.imageURL.absoluteString)
        persist()
    }

    func completeOnboarding() {
        hasSeenOnboarding = true
        persist()
    }

    func addCadet(name: String, unit: String, relation: String, photoData: Data) {
        let isFirstCadet = cadets.isEmpty
        let cadet = Cadet(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            unit: unit.trimmingCharacters(in: .whitespacesAndNewlines),
            relation: relation.trimmingCharacters(in: .whitespacesAndNewlines),
            photoData: photoData
        )
        cadets.append(cadet)
        activeCadetID = cadet.id
        selectedTab = .home
        persist()
        if isFirstCadet {
            CadetCatchAnalytics.log(.rosterCreated)
        }
    }

    func selectCadet(_ cadet: Cadet) {
        activeCadetID = cadet.id
        persist()
    }

    func addSource(name: String, urlText: String, category: SourceCategory) -> Bool {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanURL = urlText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard
            !cleanName.isEmpty,
            let components = URLComponents(string: cleanURL),
            components.scheme == "https",
            components.host?.isEmpty == false,
            let url = components.url,
            !sources.contains(where: { $0.url == url })
        else {
            return false
        }

        sources.insert(PhotoSource(name: cleanName, url: url, category: category), at: 0)
        persist()
        return true
    }

    func toggleSource(_ source: PhotoSource) {
        guard let index = sources.firstIndex(where: { $0.id == source.id }) else { return }
        sources[index].enabled.toggle()
        persist()
    }

    func removeSource(_ source: PhotoSource) {
        sources.removeAll { $0.id == source.id }
        persist()
    }

    func isSaved(_ candidate: PhotoCandidate) -> Bool {
        savedCandidates.contains(where: { $0.imageURL == candidate.imageURL && $0.cadetID == candidate.cadetID })
    }

    func save(_ candidate: PhotoCandidate) {
        guard !isSaved(candidate) else { return }
        savedCandidates.insert(candidate, at: 0)
        persist()
    }

    func removeSaved(_ candidate: PhotoCandidate) {
        savedCandidates.removeAll { $0.imageURL == candidate.imageURL && $0.cadetID == candidate.cadetID }
        persist()
    }

    func draftNote(for candidate: PhotoCandidate) -> String {
        let key = candidate.id.uuidString
        if let note = notes[key] {
            return note
        }

        let note = """
        I found a possible photo from \(candidate.sourceName) for \(candidate.cadetName).

        Collection: \(candidate.sourceHost)
        Reviewed: \(candidate.createdAt.formatted(date: .abbreviated, time: .shortened))
        """
        notes[key] = note
        persist()
        return note
    }

    func scanActiveCadet() async {
        guard let cadet = activeCadet else {
            lastScanMessage = "Add a cadet profile before searching."
            return
        }

        scanProgress.reset()
        CadetCatchAnalytics.log(.photoCheckStarted)
        scanProgress.message = "Sending your cadet photo for matching..."
        showScanReceipt = false
        
        do {
            let attributes = ScanActivityAttributes(cadetName: cadet.name)
            let initialState = ScanActivityAttributes.ContentState(progressString: "Uploading cadet photo...", isScanning: true)
            if let activity = try? Activity.request(attributes: attributes, content: .init(state: initialState, staleDate: nil)) {
                currentActivity = ActivityWrapper(activity)
            }
        }
        
        scanTask = Task { @MainActor in
            let tolerance = searchTolerance
            let scanResult = await PublicPhotoScanner.scan(cadet: cadet, searchTolerance: tolerance, progress: scanProgress) { [weak self] stateString in
                Task { @MainActor in
                    if let wrapper = self?.currentActivity {
                        Task {
                            await wrapper.activity.update(ActivityContent(state: ScanActivityAttributes.ContentState(progressString: stateString, isScanning: true), staleDate: nil))
                        }
                    }
                }
            }
            
            candidates = scanResult.candidates

            guard !Task.isCancelled else {
                scanProgress.isScanning = false
                scanProgress.isCancelled = true
                showScanReceipt = true
                if let wrapper = currentActivity {
                    Task { await wrapper.activity.end(ActivityContent(state: ScanActivityAttributes.ContentState(progressString: "Search Stopped", isScanning: false), staleDate: nil), dismissalPolicy: .default) }
                }
                return
            }
            lastScanMessage = scanResult.message

            if scanResult.isCompleted {
                CadetCatchAnalytics.log(
                    .photoCheckCompleted,
                    parameters: ["result": scanResult.outcome.rawValue]
                )
            }

            let scannedAt = Date()

            scanRecords.insert(
                ScanRecord(
                    cadetName: cadet.name,
                    checkedSourceCount: 1,
                    imageCount: scanResult.checkedImageCount,
                    matchCount: scanResult.candidates.count,
                    scannedAt: scannedAt
                ),
                at: 0
            )
            scanRecords = Array(scanRecords.prefix(20))
            selectedTab = .photos
            scanProgress.isScanning = false
            showScanReceipt = true
            persist()
            if let wrapper = currentActivity {
                Task { await wrapper.activity.end(ActivityContent(state: ScanActivityAttributes.ContentState(progressString: "Search Complete", isScanning: false), staleDate: nil), dismissalPolicy: .default) }
            }
        }
    }
    
    func stopScan() {
        scanTask?.cancel()
    }

    func resetLocalData() {
        hasSeenOnboarding = false
        selectedTab = .home
        cadets = []
        activeCadetID = nil
        candidates = []
        savedCandidates = []
        scanRecords = []
        sources = PhotoSource.defaultSources
        notes = [:]
        lastScanMessage = nil
        previewSearchUsed = false
        searchCredits = 0
        unlockedImageURLs = []
        searchTolerance = .high
        defaults.removeObject(forKey: storageKey)
    }

    private func persist() {
        let state = PersistedState(
            hasSeenOnboarding: hasSeenOnboarding,
            selectedTab: selectedTab,
            cadets: cadets,
            activeCadetID: activeCadetID,
            candidates: candidates,
            savedCandidates: savedCandidates,
            scanRecords: scanRecords,
            sources: sources,
            notes: notes,
            lastScanMessage: lastScanMessage,
            previewSearchUsed: previewSearchUsed,
            searchCredits: searchCredits,
            unlockedImageURLs: unlockedImageURLs,
            searchTolerance: searchTolerance
        )

        if let data = try? JSONEncoder.cadetCatch.encode(state) {
            defaults.set(data, forKey: storageKey)
        }
    }
}

private struct PersistedState: Codable {
    var hasSeenOnboarding: Bool
    var selectedTab: AppTab
    var cadets: [Cadet]
    var activeCadetID: Cadet.ID?
    var candidates: [PhotoCandidate]
    var savedCandidates: [PhotoCandidate]
    var scanRecords: [ScanRecord]
    var sources: [PhotoSource]
    var notes: [String: String]
    var lastScanMessage: String?
    var previewSearchUsed: Bool?
    var searchCredits: Int?
    var unlockedImageURLs: Set<String>?
    var searchTolerance: SearchTolerance?
}

#if DEBUG
private enum CadetCatchDebugFixture {
    static let launchArgument = "--cadetcatch-ui-test-hard-match"
    static let sourcePageURL = URL(string: "https://cadetcatch.local/qa/index.html")!
    static let sourceImageURL = URL(string: "https://cadetcatch.local/qa/synthetic-hard-source.jpg")!

    static var isEnabled: Bool {
        ProcessInfo.processInfo.arguments.contains(launchArgument)
    }

    static func seededState() -> PersistedState? {
        guard isEnabled, let profileData = data(fromEnvironment: "CADETCATCH_UI_TEST_PROFILE_JPEG_BASE64") else {
            return nil
        }

        let cadet = Cadet(
            name: "Sample Cadet",
            unit: "Sample Unit",
            relation: "Family",
            photoData: profileData
        )

        return PersistedState(
            hasSeenOnboarding: true,
            selectedTab: .home,
            cadets: [cadet],
            activeCadetID: cadet.id,
            candidates: [],
            savedCandidates: [],
            scanRecords: [],
            sources: [
                PhotoSource(
                    name: "Sample Event Photos",
                    url: sourcePageURL,
                    category: .custom
                )
            ],
            notes: [:],
            lastScanMessage: nil,
            previewSearchUsed: false,
            searchCredits: 1,
            unlockedImageURLs: [sourceImageURL.absoluteString],
            searchTolerance: .high
        )
    }

    static func imageURLs(from pageURL: URL) -> [URL]? {
        guard isEnabled, pageURL == sourcePageURL else { return nil }
        return [sourceImageURL]
    }

    static func imageData(for url: URL) -> Data? {
        guard isEnabled, url == sourceImageURL else { return nil }
        return data(fromEnvironment: "CADETCATCH_UI_TEST_SOURCE_JPEG_BASE64")
    }

    private static func data(fromEnvironment key: String) -> Data? {
        guard let encoded = ProcessInfo.processInfo.environment[key] else { return nil }
        return Data(base64Encoded: encoded)
    }
}
#endif

enum CommerceProduct: String, CaseIterable, Identifiable {
    case oneTimeSearch = "co.eb28.cadetcatch.search.once.v1"
    case photoUnlock = "co.eb28.cadetcatch.photo.unlock.v1"
    case monthly = "co.eb28.cadetcatch.family.monthly.v1"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .oneTimeSearch: "One-Time Photo Check"
        case .photoUnlock: "Unlock One Photo"
        case .monthly: "Family Monthly"
        }
    }

    var detail: String {
        switch self {
        case .oneTimeSearch: "Run one additional photo search."
        case .photoUnlock: "View, save, and share one matched photo."
        case .monthly: "Continuous photo checks and unlocked matches while active."
        }
    }

    var fallbackPrice: String {
        switch self {
        case .oneTimeSearch: "$1.99"
        case .photoUnlock: "$1.99"
        case .monthly: "$12.99/mo"
        }
    }
}

enum PurchaseOutcome: Equatable {
    case success
    case cancelled
    case pending
    case failed(String)

    var completed: Bool {
        if case .success = self { return true }
        return false
    }
}

struct SubscriptionLinkPayload: Codable, Equatable {
    var productID: String
    var transactionID: String
    var originalTransactionID: String

    private enum CodingKeys: String, CodingKey {
        case productID = "product_id"
        case transactionID = "transaction_id"
        case originalTransactionID = "original_transaction_id"
    }
}

@MainActor
@Observable
final class PurchaseManager {
    var products: [Product] = []
    var entitledProductIDs: Set<String> = []
    var isLoadingProducts = false
    var lastMessage: String?
    var monthlySubscriptionLink: SubscriptionLinkPayload?

    @ObservationIgnored private var updatesTask: Task<Void, Never>?

    var hasMonthlyAccess: Bool {
        entitledProductIDs.contains(CommerceProduct.monthly.rawValue)
    }

    func configure() async {
        if updatesTask == nil {
            updatesTask = Task { [weak self] in
                for await result in StoreKit.Transaction.updates {
                    await self?.handle(transactionResult: result)
                }
            }
        }

        await loadProducts()
        await refreshEntitlements()
    }

    func product(for commerceProduct: CommerceProduct) -> Product? {
        products.first { $0.id == commerceProduct.rawValue }
    }

    func displayPrice(for commerceProduct: CommerceProduct) -> String {
        product(for: commerceProduct)?.displayPrice ?? commerceProduct.fallbackPrice
    }

    func loadProducts() async {
        guard !isLoadingProducts else { return }
        isLoadingProducts = true
        defer { isLoadingProducts = false }

        do {
            let loaded = try await Product.products(for: CommerceProduct.allCases.map(\.rawValue))
            let order = Dictionary(uniqueKeysWithValues: CommerceProduct.allCases.enumerated().map { ($0.element.rawValue, $0.offset) })
            products = loaded.sorted { first, second in
                (order[first.id] ?? Int.max) < (order[second.id] ?? Int.max)
            }
            if loaded.isEmpty {
                lastMessage = "In-app purchases are not available for this build yet."
            }
        } catch {
            lastMessage = "Unable to load purchases. Try again later."
        }
    }

    func purchase(_ commerceProduct: CommerceProduct) async -> PurchaseOutcome {
        if products.isEmpty {
            await loadProducts()
        }

        guard let product = product(for: commerceProduct) else {
            let message = "This purchase is not configured in App Store Connect yet."
            lastMessage = message
            return .failed(message)
        }

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                CadetCatchAnalytics.logVerifiedTransaction(transaction)
                if commerceProduct == .monthly {
                    entitledProductIDs.insert(transaction.productID)
                    monthlySubscriptionLink = Self.subscriptionLinkPayload(from: transaction)
                }
                await transaction.finish()
                lastMessage = "\(commerceProduct.title) is active."
                return .success
            case .userCancelled:
                lastMessage = nil
                return .cancelled
            case .pending:
                lastMessage = "Purchase is pending approval."
                return .pending
            @unknown default:
                let message = "Purchase could not be completed."
                lastMessage = message
                return .failed(message)
            }
        } catch {
            let message = "Purchase failed. Please try again."
            lastMessage = message
            return .failed(message)
        }
    }

    func restorePurchases() async {
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            lastMessage = hasMonthlyAccess ? "Monthly access restored." : "No active monthly purchase was found."
        } catch {
            lastMessage = "Restore failed. Please try again."
        }
    }

    func refreshEntitlements() async {
        var activeIDs = Set<String>()
        var activeMonthlyLink: SubscriptionLinkPayload?
        for await result in StoreKit.Transaction.currentEntitlements {
            guard let transaction = try? checkVerified(result) else { continue }
            activeIDs.insert(transaction.productID)
            if transaction.productID == CommerceProduct.monthly.rawValue {
                activeMonthlyLink = Self.subscriptionLinkPayload(from: transaction)
            }
        }
        entitledProductIDs = activeIDs
        monthlySubscriptionLink = activeMonthlyLink
    }

    private func handle(transactionResult: VerificationResult<StoreKit.Transaction>) async {
        guard let transaction = try? checkVerified(transactionResult) else {
            lastMessage = "A purchase could not be verified."
            return
        }

        if transaction.productID == CommerceProduct.monthly.rawValue {
            monthlySubscriptionLink = Self.subscriptionLinkPayload(from: transaction)
            await refreshEntitlements()
        }
        CadetCatchAnalytics.logVerifiedTransaction(transaction)
        await transaction.finish()
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value):
            return value
        case .unverified:
            throw StoreKitError.notAvailableInStorefront
        }
    }

    private static func subscriptionLinkPayload(from transaction: StoreKit.Transaction) -> SubscriptionLinkPayload {
        SubscriptionLinkPayload(
            productID: transaction.productID,
            transactionID: String(transaction.id),
            originalTransactionID: String(transaction.originalID)
        )
    }
}

enum AccessInviteRole: String, CaseIterable, Codable, Identifiable {
    case spouseOrFamily = "spouse_or_family"
    case cadet

    var id: String { rawValue }

    var title: String {
        switch self {
        case .spouseOrFamily: "Spouse or family"
        case .cadet: "Cadet"
        }
    }

    var helperText: String {
        switch self {
        case .spouseOrFamily:
            "Included for one spouse or immediate family member."
        case .cadet:
            "Included for your cadet."
        }
    }
}

struct AccessStatus: Codable, Equatable {
    var active: Bool
    var accessType: String?
    var role: String?
    var desktopAddOnActive: Bool
    var expiresAt: String?

    private enum CodingKeys: String, CodingKey {
        case active
        case accessType = "access_type"
        case role
        case desktopAddOnActive = "desktop_add_on_active"
        case expiresAt = "expires_at"
    }
}

struct AccessInvitation: Codable, Equatable, Identifiable {
    var id: String { role.rawValue }
    var role: AccessInviteRole
    var recipientEmail: String
    var status: String
    var redeemedAt: String?

    private enum CodingKeys: String, CodingKey {
        case role
        case recipientEmail = "recipient_email"
        case status
        case redeemedAt = "redeemed_at"
    }
}

@MainActor
@Observable
final class AccessManager {
    var accountEmail: String
    var status: AccessStatus?
    var invitations: [AccessInvitation] = []
    var isLoading = false
    var lastMessage: String?

    @ObservationIgnored private let defaults = UserDefaults.standard
    @ObservationIgnored private let accountEmailKey = "cadetcatch.access.accountEmail"
    @ObservationIgnored private let deviceIDKey = "cadetcatch.access.deviceID"

    init() {
        accountEmail = defaults.string(forKey: accountEmailKey) ?? ""
    }

    var isConfigured: Bool {
        normalizedEmail != nil
    }

    var hasActiveAppAccess: Bool {
        status?.active == true
    }

    var desktopAccessActive: Bool {
        status?.desktopAddOnActive == true
    }

    var deviceID: String {
        if let existing = defaults.string(forKey: deviceIDKey), !existing.isEmpty {
            return existing
        }
        let generated = UUID().uuidString
        defaults.set(generated, forKey: deviceIDKey)
        return generated
    }

    func saveAccountEmail() {
        guard let normalizedEmail else {
            lastMessage = "Enter the email you use for CadetCatch access."
            return
        }
        accountEmail = normalizedEmail
        defaults.set(normalizedEmail, forKey: accountEmailKey)
        lastMessage = "Account email saved."
    }

    func refreshStatus() async {
        guard let normalizedEmail else {
            lastMessage = "Enter your account email first."
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            var components = URLComponents(url: AccessAPI.statusURL, resolvingAgainstBaseURL: false)!
            components.queryItems = [
                URLQueryItem(name: "device_id", value: deviceID),
                URLQueryItem(name: "email", value: normalizedEmail)
            ]
            guard let url = components.url else { throw AccessAPI.AccessError.invalidRequest }
            let status: AccessStatus = try await AccessAPI.get(url)
            self.status = status
            lastMessage = status.active ? "CadetCatch access is active." : "No active account access was found."
            await refreshInvitations()
        } catch {
            status = nil
            lastMessage = "Account access could not be verified yet."
        }
    }

    func linkMonthlySubscription(_ payload: SubscriptionLinkPayload?) async {
        guard let payload else {
            lastMessage = "Start or restore Family Monthly before linking access."
            return
        }
        guard let normalizedEmail else {
            lastMessage = "Enter your account email before linking monthly access."
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let request = SubscriptionLinkRequest(
                deviceID: deviceID,
                email: normalizedEmail,
                productID: payload.productID,
                transactionID: payload.transactionID,
                originalTransactionID: payload.originalTransactionID
            )
            let status: AccessStatus = try await AccessAPI.post(request, to: AccessAPI.subscriptionLinkURL)
            self.status = status
            lastMessage = "Monthly access linked to \(normalizedEmail)."
            await refreshInvitations()
        } catch {
            lastMessage = "Monthly access could not be linked yet."
        }
    }

    func refreshInvitations() async {
        guard let normalizedEmail else { return }

        do {
            var components = URLComponents(url: AccessAPI.invitationsURL, resolvingAgainstBaseURL: false)!
            components.queryItems = [
                URLQueryItem(name: "device_id", value: deviceID),
                URLQueryItem(name: "email", value: normalizedEmail)
            ]
            guard let url = components.url else { throw AccessAPI.AccessError.invalidRequest }
            let response: InvitationsResponse = try await AccessAPI.get(url)
            invitations = response.invitations
        } catch {
            invitations = []
        }
    }

    func sendInvitation(role: AccessInviteRole, recipientEmail: String, monthlyLink: SubscriptionLinkPayload?) async {
        guard let normalizedOwnerEmail = normalizedEmail else {
            lastMessage = "Enter your account email before sending invites."
            return
        }
        guard let recipient = Self.normalizeEmail(recipientEmail) else {
            lastMessage = "Enter a valid email for \(role.title.lowercased())."
            return
        }
        let originalTransactionID = monthlyLink?.originalTransactionID
        guard originalTransactionID != nil || hasActiveAppAccess else {
            lastMessage = "Link Family Monthly or verify full account access before sending invites."
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let request = InvitationRequest(
                deviceID: deviceID,
                ownerEmail: normalizedOwnerEmail,
                originalTransactionID: originalTransactionID,
                role: role.rawValue,
                recipientEmail: recipient
            )
            let response: InvitationSendResponse = try await AccessAPI.post(request, to: AccessAPI.invitationsURL)
            lastMessage = response.sent ? "\(role.title) invite sent to \(recipient)." : "Invite was not sent."
            await refreshInvitations()
        } catch {
            lastMessage = "\(role.title) invite could not be sent yet."
        }
    }

    private var normalizedEmail: String? {
        Self.normalizeEmail(accountEmail)
    }

    private static func normalizeEmail(_ email: String) -> String? {
        let cleaned = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard cleaned.contains("@"), cleaned.contains(".") else { return nil }
        return cleaned
    }
}

private enum AccessAPI {
    static let baseURL = URL(string: "https://api.cadetcatch.com")!
    static let statusURL = baseURL.appending(path: "access/status")
    static let subscriptionLinkURL = baseURL.appending(path: "access/subscription/link")
    static let invitationsURL = baseURL.appending(path: "access/invitations")

    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 25
        config.timeoutIntervalForResource = 45
        return URLSession(configuration: config)
    }()

    enum AccessError: Error {
        case invalidRequest
        case invalidResponse
        case server(statusCode: Int)
    }

    static func get<T: Decodable>(_ url: URL) async throws -> T {
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AccessError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else { throw AccessError.server(statusCode: http.statusCode) }
        return try JSONDecoder().decode(T.self, from: data)
    }

    static func post<Body: Encodable, Response: Decodable>(_ body: Body, to url: URL) async throws -> Response {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AccessError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else { throw AccessError.server(statusCode: http.statusCode) }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}

private struct SubscriptionLinkRequest: Encodable {
    var deviceID: String
    var email: String
    var productID: String
    var transactionID: String
    var originalTransactionID: String

    private enum CodingKeys: String, CodingKey {
        case deviceID = "device_id"
        case email
        case productID = "product_id"
        case transactionID = "transaction_id"
        case originalTransactionID = "original_transaction_id"
    }
}

private struct InvitationRequest: Encodable {
    var deviceID: String
    var ownerEmail: String
    var originalTransactionID: String?
    var role: String
    var recipientEmail: String

    private enum CodingKeys: String, CodingKey {
        case deviceID = "device_id"
        case ownerEmail = "owner_email"
        case originalTransactionID = "original_transaction_id"
        case role
        case recipientEmail = "recipient_email"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(deviceID, forKey: .deviceID)
        try container.encode(ownerEmail, forKey: .ownerEmail)
        try container.encodeIfPresent(originalTransactionID, forKey: .originalTransactionID)
        try container.encode(role, forKey: .role)
        try container.encode(recipientEmail, forKey: .recipientEmail)
    }
}

private struct InvitationsResponse: Decodable {
    var invitations: [AccessInvitation]
}

private struct InvitationSendResponse: Decodable {
    var sent: Bool
}

struct Cadet: Identifiable, Codable, Hashable {
    var id = UUID()
    var name: String
    var unit: String
    var relation: String
    var photoData: Data
    var createdAt = Date()
}

struct PhotoCandidate: Identifiable, Codable, Hashable {
    var id = UUID()
    var cadetID: Cadet.ID
    var cadetName: String
    var imageURL: URL
    var confidence: Int
    var sourceName: String
    var sourceHost: String
    var sourcePageURL: URL
    var detectedFaceCount: Int
    var createdAt = Date()
}

struct ScanRecord: Identifiable, Codable, Hashable {
    var id = UUID()
    var cadetName: String
    var checkedSourceCount: Int
    var imageCount: Int
    var matchCount: Int
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
                name: "PDUDDY Event Photos",
                url: URL(string: "https://tyfys.net/cadetcatch/api.php")!,
                category: .custom
            ),
            PhotoSource(
                name: "Coast Guard Academy",
                url: URL(string: "https://uscga.edu/")!,
                category: .academy
            )
        ]
    }
}

enum SourceCategory: String, CaseIterable, Identifiable, Codable {
    case academy
    case publicAffairs
    case family
    case custom

    var id: String { rawValue }

    var title: String {
        switch self {
        case .academy: "Academy"
        case .publicAffairs: "Public Affairs"
        case .family: "Family Upload"
        case .custom: "Custom"
        }
    }

    var symbol: String {
        switch self {
        case .academy: "building.columns.fill"
        case .publicAffairs: "megaphone.fill"
        case .family: "person.2.fill"
        case .custom: "link"
        }
    }
}

enum AppTab: String, CaseIterable, Identifiable, Codable {
    case home
    case photos
    case roster
    case sources
    case more

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Home"
        case .photos: "Photos"
        case .roster: "Roster"
        case .sources: "Info"
        case .more: "More"
        }
    }

    var symbol: String {
        switch self {
        case .home: "house.fill"
        case .photos: "photo.on.rectangle.angled"
        case .roster: "person.2.fill"
        case .sources: "info.circle"
        case .more: "ellipsis.circle.fill"
        }
    }
}

enum PhotoScope: String, CaseIterable, Identifiable {
    case new = "New"
    case saved = "Saved"

    var id: String { rawValue }
}

enum PhotoCheckOutcome: String {
    case matched
    case noMatch = "no_match"
    case cancelled
    case invalidPhoto = "invalid_photo"
    case noFace = "no_face"
    case multipleFaces = "multiple_faces"
    case failed

    var isCompleted: Bool {
        self == .matched || self == .noMatch
    }
}

struct ScanResult {
    var candidates: [PhotoCandidate]
    var checkedImageCount: Int
    var message: String
    var outcome: PhotoCheckOutcome

    var isCompleted: Bool {
        outcome.isCompleted
    }
}

private enum CadetCatchSearchAPI {
    static let searchURL = URL(string: "https://api.cadetcatch.com/search")!

    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 45
        config.timeoutIntervalForResource = 90
        return URLSession(configuration: config)
    }()

    enum SearchError: Error {
        case invalidImage
        case invalidResponse
        case noFaceDetected
        case multipleFacesDetected
        case server(statusCode: Int)
    }

    struct APIErrorResponse: Decodable, Sendable {
        let error: String?
        let detail: String?

        var message: String? {
            error ?? detail
        }
    }

    struct SearchResponse: Decodable, Sendable {
        let queryFacesDetected: Int
        let queryFaceIndexUsed: Int?
        let matchesReturned: Int
        let matches: [SearchMatch]

        private enum CodingKeys: String, CodingKey {
            case queryFacesDetected = "query_faces_detected"
            case queryFaceIndexUsed = "query_face_index_used"
            case matchesReturned = "matches_returned"
            case matches
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            queryFacesDetected = try container.decode(Int.self, forKey: .queryFacesDetected)
            queryFaceIndexUsed = try container.decodeIfPresent(Int.self, forKey: .queryFaceIndexUsed)
            matches = try container.decodeIfPresent([SearchMatch].self, forKey: .matches) ?? []
            matchesReturned = try container.decodeIfPresent(Int.self, forKey: .matchesReturned) ?? matches.count
        }
    }

    struct SearchMatch: Decodable, Sendable {
        let score: Double
        let photoFile: String?
        let photoUrl: String?
        let bbox: [Double]?
        let faceIndex: Int?
        let detScore: Double?

        private enum CodingKeys: String, CodingKey {
            case score
            case photoFile = "photo_file"
            case originalFilename = "original_filename"
            case photoId = "photo_id"
            case photoUrl = "photo_url"
            case originalUrl = "original_url"
            case thumbnailUrl = "thumbnail_url"
            case bbox
            case faceIndex = "face_index"
            case detScore = "det_score"
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            score = try container.decode(Double.self, forKey: .score)
            photoFile = try container.decodeIfPresent(String.self, forKey: .photoFile)
                ?? container.decodeIfPresent(String.self, forKey: .originalFilename)
                ?? container.decodeIfPresent(String.self, forKey: .photoId)
            photoUrl = try container.decodeIfPresent(String.self, forKey: .photoUrl)
                ?? container.decodeIfPresent(String.self, forKey: .originalUrl)
                ?? container.decodeIfPresent(String.self, forKey: .thumbnailUrl)
            bbox = try container.decodeIfPresent([Double].self, forKey: .bbox)
            faceIndex = try container.decodeIfPresent(Int.self, forKey: .faceIndex)
            detScore = try container.decodeIfPresent(Double.self, forKey: .detScore)
        }

        func photoCandidate(cadet: Cadet, sourcePageURL: URL) -> PhotoCandidate? {
            guard let url = resolvedPhotoURL else { return nil }
            let scorePercent = max(0, min(99, Int((score * 100).rounded())))
            return PhotoCandidate(
                cadetID: cadet.id,
                cadetName: cadet.name,
                imageURL: url,
                confidence: scorePercent,
                sourceName: "CadetCatch Photos",
                sourceHost: "CadetCatch",
                sourcePageURL: sourcePageURL,
                detectedFaceCount: 1
            )
        }

        private var resolvedPhotoURL: URL? {
            if let photoUrl, !photoUrl.isEmpty {
                if let absolute = URL(string: photoUrl), absolute.scheme == "https" {
                    return absolute
                }
                let apiBase = URL(string: "https://api.cadetcatch.com")!
                if let relative = URL(string: photoUrl, relativeTo: apiBase)?.absoluteURL, relative.scheme == "https" {
                    return relative
                }
            }
            return nil
        }
    }

    static func search(photoData: Data, topK: Int = 50, minScore: Double = 0.80, faceIndex: Int = 0) async throws -> SearchResponse {
        guard let uploadData = normalizedUploadData(from: photoData) else {
            throw SearchError.invalidImage
        }

        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: searchURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = multipartBody(
            boundary: boundary,
            fields: [
                "top_k": "\(topK)",
                "min_score": String(format: "%.2f", minScore),
                "face_index": "\(faceIndex)"
            ],
            fileData: uploadData
        )

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw SearchError.invalidResponse
        }
        let decoder = JSONDecoder()
        guard (200..<300).contains(http.statusCode) else {
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                try throwSearchErrorIfKnown(errorResponse)
            }
            throw SearchError.server(statusCode: http.statusCode)
        }

        do {
            return try decoder.decode(SearchResponse.self, from: data)
        } catch {
            if let errorResponse = try? decoder.decode(APIErrorResponse.self, from: data) {
                try throwSearchErrorIfKnown(errorResponse)
            }
            throw error
        }
    }

    private static func throwSearchErrorIfKnown(_ response: APIErrorResponse) throws {
        guard let message = response.message?.lowercased() else { return }
        if message.contains("no face") || message.contains("no faces") {
            throw SearchError.noFaceDetected
        }
        if message.contains("multiple face") || message.contains("multiple faces") || message.contains("more than one face") {
            throw SearchError.multipleFacesDetected
        }
    }

    private static func normalizedUploadData(from photoData: Data) -> Data? {
        guard let image = UIImage(data: photoData) else { return nil }
        return image.jpegData(compressionQuality: 0.9) ?? photoData
    }

    private static func multipartBody(boundary: String, fields: [String: String], fileData: Data) -> Data {
        var body = Data()
        for (name, value) in fields {
            body.appendUTF8("--\(boundary)\r\n")
            body.appendUTF8("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n")
            body.appendUTF8("\(value)\r\n")
        }
        body.appendUTF8("--\(boundary)\r\n")
        body.appendUTF8("Content-Disposition: form-data; name=\"file\"; filename=\"cadet.jpg\"\r\n")
        body.appendUTF8("Content-Type: image/jpeg\r\n\r\n")
        body.append(fileData)
        body.appendUTF8("\r\n--\(boundary)--\r\n")
        return body
    }
}

enum PublicPhotoScanner {
    static let bulkSession: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 45
        config.timeoutIntervalForResource = 300
        config.httpMaximumConnectionsPerHost = 15
        return URLSession(configuration: config)
    }()

    static func scan(
        cadet: Cadet,
        searchTolerance: SearchTolerance,
        progress: ScannerProgress,
        onProgress: @escaping @Sendable (String) -> Void = { _ in }
    ) async -> ScanResult {
        await update(progress, message: "Sending your cadet photo for matching...", total: 1, scanned: 0, matched: 0, onProgress: onProgress)

        do {
            let response = try await CadetCatchSearchAPI.search(
                photoData: cadet.photoData,
                minScore: searchTolerance.minimumScore
            )
            if Task.isCancelled {
                return ScanResult(candidates: [], checkedImageCount: 0, message: "Search Stopped", outcome: .cancelled)
            }

            guard response.queryFacesDetected > 0 else {
                await update(progress, message: "No face detected. Choose a clearer, front-facing cadet photo.", total: 1, scanned: 1, matched: 0, onProgress: onProgress)
                return ScanResult(candidates: [], checkedImageCount: 0, message: "No face detected. Choose a clearer, front-facing cadet photo.", outcome: .noFace)
            }

            guard response.queryFacesDetected == 1 else {
                await update(progress, message: "Multiple faces detected. Choose a photo with only your cadet visible.", total: 1, scanned: 1, matched: 0, onProgress: onProgress)
                return ScanResult(candidates: [], checkedImageCount: 0, message: "Multiple faces detected. Choose a photo with only your cadet visible.", outcome: .multipleFaces)
            }

            let candidates = response.matches.compactMap { match in
                match.photoCandidate(cadet: cadet, sourcePageURL: CadetCatchSearchAPI.searchURL)
            }

            guard !candidates.isEmpty else {
                await update(progress, message: "No matching event photos found yet.", total: 1, scanned: 1, matched: 0, onProgress: onProgress)
                return ScanResult(candidates: [], checkedImageCount: response.matchesReturned, message: "No matching event photos found yet.", outcome: .noMatch)
            }

            await update(
                progress,
                message: "\(candidates.count) possible match\(candidates.count == 1 ? "" : "es") found.",
                total: 1,
                scanned: 1,
                matched: candidates.count,
                onProgress: onProgress
            )
            return ScanResult(
                candidates: candidates,
                checkedImageCount: response.matchesReturned,
                message: "\(candidates.count) possible match\(candidates.count == 1 ? "" : "es") found.",
                outcome: .matched
            )
        } catch CadetCatchSearchAPI.SearchError.invalidImage {
            await update(progress, message: "Could not read that cadet photo. Choose a different image.", total: 1, scanned: 1, matched: 0, onProgress: onProgress)
            return ScanResult(candidates: [], checkedImageCount: 0, message: "Could not read that cadet photo. Choose a different image.", outcome: .invalidPhoto)
        } catch CadetCatchSearchAPI.SearchError.noFaceDetected {
            await update(progress, message: "No face detected. Choose a clearer, front-facing cadet photo.", total: 1, scanned: 1, matched: 0, onProgress: onProgress)
            return ScanResult(candidates: [], checkedImageCount: 0, message: "No face detected. Choose a clearer, front-facing cadet photo.", outcome: .noFace)
        } catch CadetCatchSearchAPI.SearchError.multipleFacesDetected {
            await update(progress, message: "Multiple faces detected. Choose a photo with only your cadet visible.", total: 1, scanned: 1, matched: 0, onProgress: onProgress)
            return ScanResult(candidates: [], checkedImageCount: 0, message: "Multiple faces detected. Choose a photo with only your cadet visible.", outcome: .multipleFaces)
        } catch {
            await update(progress, message: "We could not search photos right now. Check your connection and try again.", total: 1, scanned: 1, matched: 0, onProgress: onProgress)
            return ScanResult(candidates: [], checkedImageCount: 0, message: "We could not search photos right now. Check your connection and try again.", outcome: .failed)
        }
    }

    @MainActor
    private static func update(
        _ progress: ScannerProgress,
        message: String,
        total: Int,
        scanned: Int,
        matched: Int,
        onProgress: @escaping @Sendable (String) -> Void
    ) {
        progress.message = message
        progress.totalPhotosFound = total
        progress.photosScanned = scanned
        progress.photosMatched = matched
        onProgress(progress.progressString)
    }

    private static func discoverImageURLs(from pageURL: URL) async -> [URL] {
        if Task.isCancelled { return [] }
        guard pageURL.scheme == "https" else { return [] }

        let urlString = pageURL.absoluteString
        #if DEBUG
        if let fixtureURLs = CadetCatchDebugFixture.imageURLs(from: pageURL) {
            return fixtureURLs
        }
        #endif

        if urlString.contains("drive.google.com/drive/") && urlString.contains("folders/") {
            let authManager = await MainActor.run { GoogleDriveAuthManager.shared }
            let isSignedIn = await MainActor.run { authManager.isSignedIn }
            let folderId: String? = {
                if let range = urlString.range(of: "folders/([a-zA-Z0-9_-]+)", options: .regularExpression) {
                    return String(urlString[range]).replacingOccurrences(of: "folders/", with: "")
                }
                return nil
            }()
            
            if let folderId = folderId, isSignedIn {
                let images = await authManager.fetchImages(folderId: folderId)
                if !images.isEmpty {
                    return images
                }
            }
        }

        do {
            var request = URLRequest(url: pageURL)
            request.timeoutInterval = 20
            request.setValue("CadetCatch/1.0 public-source-check", forHTTPHeaderField: "User-Agent")
            let (data, response) = try await bulkSession.data(for: request)
            if Task.isCancelled { return [] }
            guard
                let http = response as? HTTPURLResponse,
                200..<300 ~= http.statusCode,
                let html = String(data: data, encoding: .utf8)
            else {
                return []
            }
            if urlString.contains("tyfys.net") && urlString.hasSuffix("api.php") {
                struct APIResponse: Decodable {
                    let photos: [String]
                }
                if let response = try? JSONDecoder().decode(APIResponse.self, from: data) {
                    let baseURL = pageURL.deletingLastPathComponent()
                    return response.photos.compactMap { baseURL.appendingPathComponent($0) }
                }
                return []
            }
            
            if urlString.contains("drive.google.com/drive/") {
                let fileIdRegex = try! NSRegularExpression(pattern: #"\[\[null,"([a-zA-Z0-9_-]+)"\],null,null,null,"image/"#)
                let matches = fileIdRegex.matches(in: html, range: NSRange(html.startIndex..., in: html))
                var ids = Set<String>()
                for match in matches {
                    if let range = Range(match.range(at: 1), in: html) {
                        ids.insert(String(html[range]))
                    }
                }
                return ids.compactMap { URL(string: "https://drive.google.com/uc?id=\($0)") }
            }
            
            return extractImageURLs(from: html, baseURL: pageURL)
        } catch {
            return []
        }
    }

    private static func downloadImageData(from url: URL) async -> Data? {
        guard url.scheme == "https" else { return nil }
        #if DEBUG
        if let fixtureData = CadetCatchDebugFixture.imageData(for: url) {
            return fixtureData
        }
        #endif

        do {
            var request = URLRequest(url: url)
            request.timeoutInterval = 30
            request.setValue("CadetCatch/1.0 public-image-check", forHTTPHeaderField: "User-Agent")
            let (data, response) = try await bulkSession.data(for: request)
            guard
                let http = response as? HTTPURLResponse,
                200..<300 ~= http.statusCode,
                data.count < 12_000_000
            else {
                return nil
            }
            return data
        } catch {
            return nil
        }
    }

    private static func extractImageURLs(from html: String, baseURL: URL) -> [URL] {
        let patterns = [
            "<img[^>]+src=[\"']([^\"']+)[\"']",
            "<meta[^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"'][^>]+content=[\"']([^\"']+)[\"']",
            "<source[^>]+srcset=[\"']([^\"']+)[\"']"
        ]

        var urls: [URL] = []
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { continue }
            let range = NSRange(html.startIndex..<html.endIndex, in: html)
            regex.matches(in: html, range: range).forEach { match in
                guard let captureRange = Range(match.range(at: 1), in: html) else { return }
                let rawValue = String(html[captureRange])
                    .split(separator: ",")
                    .first?
                    .split(separator: " ")
                    .first
                    .map(String.init) ?? ""
                guard !rawValue.hasPrefix("data:") else { return }
                guard let resolvedURL = URL(string: rawValue, relativeTo: baseURL)?.absoluteURL else { return }
                guard resolvedURL.scheme == "https" else { return }
                urls.append(resolvedURL)
            }
        }

        var seen = Set<URL>()
        return urls.filter { url in
            guard !seen.contains(url) else { return false }
            seen.insert(url)
            return true
        }
    }
}

enum PhotoCandidatePreview {
    static func makeData(from imageData: Data) -> Data? {
        guard let image = UIImage(data: imageData) else { return nil }

        let maxDimension: CGFloat = 1_200
        let originalSize = image.size
        let longestSide = max(originalSize.width, originalSize.height)
        let targetSize: CGSize
        if longestSide > maxDimension {
            let scale = maxDimension / longestSide
            targetSize = CGSize(width: originalSize.width * scale, height: originalSize.height * scale)
        } else {
            targetSize = originalSize
        }

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = true

        let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
        let preview = renderer.image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: targetSize))
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        return preview.jpegData(compressionQuality: 0.84)
    }

    static func storePreview(from imageData: Data, for url: URL) {
        guard
            let previewData = makeData(from: imageData),
            let fileURL = durablePreviewFileURL(for: url)
        else {
            return
        }
        try? FileManager.default.createDirectory(
            at: fileURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try? previewData.write(to: fileURL, options: .atomic)
    }

    static func data(for url: URL) -> Data? {
        if let fileURL = durablePreviewFileURL(for: url), let data = try? Data(contentsOf: fileURL) {
            return data
        }

        guard
            let legacyFileURL = legacyCachePreviewFileURL(for: url),
            let legacyData = try? Data(contentsOf: legacyFileURL)
        else {
            return nil
        }

        if let durableFileURL = durablePreviewFileURL(for: url) {
            try? FileManager.default.createDirectory(
                at: durableFileURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            try? legacyData.write(to: durableFileURL, options: .atomic)
        }
        return legacyData
    }

    private static func durablePreviewFileURL(for url: URL) -> URL? {
        guard let supportDirectory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else {
            return nil
        }
        return supportDirectory
            .appendingPathComponent("CadetCatchMatchPreviews", isDirectory: true)
            .appendingPathComponent(cacheKey(for: url))
            .appendingPathExtension("jpg")
    }

    private static func legacyCachePreviewFileURL(for url: URL) -> URL? {
        guard let cachesDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            return nil
        }
        return cachesDirectory
            .appendingPathComponent("CadetCatchMatchPreviews", isDirectory: true)
            .appendingPathComponent(cacheKey(for: url))
            .appendingPathExtension("jpg")
    }

    private static func cacheKey(for url: URL) -> String {
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

struct FaceMatch {
    var confidence: Int
    var faceCount: Int
}

enum FaceMatcher {
    struct FaceDescriptor: @unchecked Sendable {
        let embedding: [Float]

        init(embedding: [Float]) {
            self.embedding = embedding
        }
    }

    private enum Configuration {
        static let minimumAcceptedConfidence = 80
        static let maxFacesPerImage = 8
        static let embeddingDimension = 128
        static let alignedFaceSize = 112
        static let minimumCosineSimilarity: Float = 0.42
        static let strongCosineSimilarity: Float = 0.72
    }

    static var minimumAcceptedConfidence: Int { Configuration.minimumAcceptedConfidence }

    static var isEngineAvailable: Bool { FaceEmbeddingModel.shared.isAvailable }

    static func referencePrints(from imageData: Data) -> [FaceDescriptor]? {
        let descriptors = faceDescriptors(in: imageData)
        return descriptors.isEmpty ? nil : descriptors
    }

    static func match(reference: [FaceDescriptor], candidateImageURL: URL? = nil, candidateImageData: Data) -> FaceMatch? {
        let candidateDescriptors: [FaceDescriptor]
        if let candidateImageURL, let cachedDescriptors = EmbeddingCache.descriptors(for: candidateImageURL) {
            candidateDescriptors = cachedDescriptors
        } else {
            candidateDescriptors = faceDescriptors(in: candidateImageData)
            if let candidateImageURL, !candidateDescriptors.isEmpty {
                EmbeddingCache.store(candidateDescriptors, for: candidateImageURL)
            }
        }
        guard !candidateDescriptors.isEmpty else { return nil }

        var bestConfidence = 0
        for referenceDescriptor in reference {
            for candidateDescriptor in candidateDescriptors {
                guard let confidence = confidence(for: referenceDescriptor, comparedTo: candidateDescriptor) else {
                    continue
                }
                bestConfidence = max(bestConfidence, confidence)
            }
        }

        guard bestConfidence > 0 else { return nil }
        return FaceMatch(confidence: bestConfidence, faceCount: candidateDescriptors.count)
    }

    private static func faceDescriptors(in imageData: Data) -> [FaceDescriptor] {
        guard let uiImage = UIImage(data: imageData), let cgImage = uiImage.cgImage else {
            return []
        }
        let preferredOrientation = CGImagePropertyOrientation(uiImage.imageOrientation)

        var descriptors: [FaceDescriptor] = []
        for orientation in candidateOrientations(startingWith: preferredOrientation) {
            let observations = detectFaces(in: cgImage, orientation: orientation)
            let found = descriptorsFromDetectedFaces(observations, in: cgImage)
            if !found.isEmpty {
                descriptors = found
                break
            }
        }

        return descriptors
    }

    private static func descriptorsFromDetectedFaces(_ observations: [VNFaceObservation], in image: CGImage) -> [FaceDescriptor] {
        observations.compactMap { observation in
            for faceImage in candidateFaceImages(observation, from: image) {
                if let embedding = FaceEmbeddingModel.shared.embedding(from: faceImage) {
                    return FaceDescriptor(embedding: embedding)
                }
            }
            return nil
        }
    }

    private static func detectFaces(in image: CGImage, orientation: CGImagePropertyOrientation) -> [VNFaceObservation] {
        let landmarkRequest = VNDetectFaceLandmarksRequest()
        let landmarkHandler = VNImageRequestHandler(cgImage: image, orientation: orientation, options: [:])
        try? landmarkHandler.perform([landmarkRequest])
        if let results = landmarkRequest.results, !results.isEmpty {
            return Array(results
                .sorted { area(of: $0.boundingBox) > area(of: $1.boundingBox) }
                .prefix(Configuration.maxFacesPerImage))
        }

        let rectangleRequest = VNDetectFaceRectanglesRequest()
        let rectangleHandler = VNImageRequestHandler(cgImage: image, orientation: orientation, options: [:])
        guard (try? rectangleHandler.perform([rectangleRequest])) != nil, let results = rectangleRequest.results else {
            return coreImageFaceObservations(in: image, orientation: orientation)
        }

        let visionResults = Array(results
            .sorted { area(of: $0.boundingBox) > area(of: $1.boundingBox) }
            .prefix(Configuration.maxFacesPerImage))
        if !visionResults.isEmpty {
            return visionResults
        }

        return coreImageFaceObservations(in: image, orientation: orientation)
    }

    private static func coreImageFaceObservations(in image: CGImage, orientation: CGImagePropertyOrientation) -> [VNFaceObservation] {
        guard
            let detector = CIDetector(
                ofType: CIDetectorTypeFace,
                context: nil,
                options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]
            )
        else {
            return []
        }

        let extent = CGRect(x: 0, y: 0, width: image.width, height: image.height)
        let features = detector.features(
            in: CIImage(cgImage: image),
            options: [CIDetectorImageOrientation: Int(orientation.rawValue)]
        )

        return Array(features.compactMap { feature -> VNFaceObservation? in
            guard let faceFeature = feature as? CIFaceFeature else {
                return nil
            }

            let bounds = faceFeature.bounds.intersection(extent)
            guard bounds.width > 0, bounds.height > 0 else {
                return nil
            }

            return VNFaceObservation(boundingBox: CGRect(
                x: bounds.minX / extent.width,
                y: bounds.minY / extent.height,
                width: bounds.width / extent.width,
                height: bounds.height / extent.height
            ))
        }
        .sorted { area(of: $0.boundingBox) > area(of: $1.boundingBox) }
        .prefix(Configuration.maxFacesPerImage))
    }

    private static func candidateFaceImages(_ observation: VNFaceObservation, from image: CGImage) -> [CGImage] {
        var images: [CGImage] = []
        if
            let sourcePoints = fiveLandmarkPoints(for: observation, in: image),
            let transform = affineTransform(from: sourcePoints, to: targetLandmarkPoints()),
            let aligned = drawAlignedImage(image, transform: transform)
        {
            images.append(aligned)
        }

        if let crop = cropFace(observation, from: image), let resized = resizeFaceImage(crop) {
            images.append(resized)
        }

        return images
    }

    private static func fiveLandmarkPoints(for observation: VNFaceObservation, in image: CGImage) -> [CGPoint]? {
        guard
            let landmarks = observation.landmarks,
            let leftEye = center(of: landmarks.leftPupil ?? landmarks.leftEye),
            let rightEye = center(of: landmarks.rightPupil ?? landmarks.rightEye),
            let nose = center(of: landmarks.nose ?? landmarks.noseCrest),
            let mouthRegion = landmarks.outerLips
        else {
            return nil
        }

        let mouthPoints = normalizedPoints(in: mouthRegion)
        guard
            let mouthLeft = mouthPoints.min(by: { $0.x < $1.x }),
            let mouthRight = mouthPoints.max(by: { $0.x < $1.x })
        else {
            return nil
        }

        let eyes = [
            imagePoint(leftEye, in: observation, image: image),
            imagePoint(rightEye, in: observation, image: image)
        ].sorted { $0.x < $1.x }

        let mouthCorners = [
            imagePoint(mouthLeft, in: observation, image: image),
            imagePoint(mouthRight, in: observation, image: image)
        ].sorted { $0.x < $1.x }

        return [
            eyes[0],
            eyes[1],
            imagePoint(nose, in: observation, image: image),
            mouthCorners[0],
            mouthCorners[1]
        ]
    }

    private static func targetLandmarkPoints() -> [CGPoint] {
        [
            CGPoint(x: 38.2946, y: 51.6963),
            CGPoint(x: 73.5318, y: 51.5014),
            CGPoint(x: 56.0252, y: 71.7366),
            CGPoint(x: 41.5493, y: 92.3655),
            CGPoint(x: 70.7299, y: 92.2041)
        ]
    }

    private static func imagePoint(_ point: CGPoint, in observation: VNFaceObservation, image: CGImage) -> CGPoint {
        let box = observation.boundingBox
        let normalizedX = box.minX + point.x * box.width
        let normalizedY = box.minY + point.y * box.height
        return CGPoint(
            x: normalizedX * CGFloat(image.width),
            y: (1 - normalizedY) * CGFloat(image.height)
        )
    }

    private static func drawAlignedImage(_ image: CGImage, transform: CGAffineTransform) -> CGImage? {
        let size = CGSize(width: Configuration.alignedFaceSize, height: Configuration.alignedFaceSize)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let renderedImage = UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor.black.setFill()
            context.cgContext.fill(CGRect(origin: .zero, size: size))
            context.cgContext.interpolationQuality = .high
            context.cgContext.concatenate(transform)
            UIImage(cgImage: image).draw(in: CGRect(x: 0, y: 0, width: CGFloat(image.width), height: CGFloat(image.height)))
        }
        return renderedImage.cgImage
    }

    private static func resizeFaceImage(_ image: CGImage) -> CGImage? {
        let size = CGSize(width: Configuration.alignedFaceSize, height: Configuration.alignedFaceSize)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let renderedImage = UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor.black.setFill()
            context.cgContext.fill(CGRect(origin: .zero, size: size))
            context.cgContext.interpolationQuality = .high
            UIImage(cgImage: image).draw(in: CGRect(origin: .zero, size: size))
        }
        return renderedImage.cgImage
    }

    // Least-squares similarity transform (rotation + uniform scale + translation).
    // A full affine fit can shear the face when landmarks are noisy, which degrades embeddings.
    private static func affineTransform(from sourcePoints: [CGPoint], to targetPoints: [CGPoint]) -> CGAffineTransform? {
        guard sourcePoints.count == targetPoints.count, sourcePoints.count >= 2 else {
            return nil
        }

        let count = CGFloat(sourcePoints.count)
        var sumSourceX: CGFloat = 0, sumSourceY: CGFloat = 0
        var sumTargetX: CGFloat = 0, sumTargetY: CGFloat = 0
        for index in sourcePoints.indices {
            sumSourceX += sourcePoints[index].x
            sumSourceY += sourcePoints[index].y
            sumTargetX += targetPoints[index].x
            sumTargetY += targetPoints[index].y
        }
        let meanSource = CGPoint(x: sumSourceX / count, y: sumSourceY / count)
        let meanTarget = CGPoint(x: sumTargetX / count, y: sumTargetY / count)

        var crossSum: CGFloat = 0
        var rotationSum: CGFloat = 0
        var sourceVariance: CGFloat = 0
        for index in sourcePoints.indices {
            let sx = sourcePoints[index].x - meanSource.x
            let sy = sourcePoints[index].y - meanSource.y
            let tx = targetPoints[index].x - meanTarget.x
            let ty = targetPoints[index].y - meanTarget.y
            crossSum += sx * tx + sy * ty
            rotationSum += sx * ty - sy * tx
            sourceVariance += sx * sx + sy * sy
        }
        guard sourceVariance > 0.000001 else { return nil }

        let a = crossSum / sourceVariance
        let b = rotationSum / sourceVariance
        let translateX = meanTarget.x - a * meanSource.x + b * meanSource.y
        let translateY = meanTarget.y - b * meanSource.x - a * meanSource.y

        guard a.isFinite, b.isFinite, translateX.isFinite, translateY.isFinite, (a * a + b * b) > 0.000001 else {
            return nil
        }

        return CGAffineTransform(a: a, b: b, c: -b, d: a, tx: translateX, ty: translateY)
    }

    private final class FaceEmbeddingModel: @unchecked Sendable {
        static let shared = FaceEmbeddingModel()

        private let model: MLModel?

        var isAvailable: Bool { model != nil }

        private init() {
            let configuration = MLModelConfiguration()
            #if targetEnvironment(simulator)
            configuration.computeUnits = .cpuOnly
            #else
            configuration.computeUnits = .all
            #endif

            guard
                let modelURL = Bundle.main.url(forResource: "SFaceEmbedding", withExtension: "mlmodelc") ??
                    Bundle.main.url(forResource: "SFaceEmbedding", withExtension: "mlpackage")
            else {
                model = nil
                return
            }

            model = try? MLModel(contentsOf: modelURL, configuration: configuration)
        }

        func embedding(from image: CGImage) -> [Float]? {
            guard
                let model,
                let input = Self.inputArray(from: image),
                let provider = try? MLDictionaryFeatureProvider(dictionary: [
                    "data": MLFeatureValue(multiArray: input)
                ]),
                let output = try? model.prediction(from: provider),
                let embeddingArray = output.featureValue(for: "embedding")?.multiArrayValue
            else {
                return nil
            }

            return Self.normalizedEmbedding(from: embeddingArray)
        }

        private static func inputArray(from image: CGImage) -> MLMultiArray? {
            let size = Configuration.alignedFaceSize
            let pixelCount = size * size
            var pixels = [UInt8](repeating: 0, count: pixelCount * 4)
            guard
                let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
                let context = CGContext(
                    data: &pixels,
                    width: size,
                    height: size,
                    bitsPerComponent: 8,
                    bytesPerRow: size * 4,
                    space: colorSpace,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
                )
            else {
                return nil
            }

            context.interpolationQuality = .high
            context.draw(image, in: CGRect(x: 0, y: 0, width: CGFloat(size), height: CGFloat(size)))

            guard let array = try? MLMultiArray(
                shape: [1, 3, size, size].map { NSNumber(value: $0) },
                dataType: .float32
            ) else {
                return nil
            }

            let strides = array.strides.map(\.intValue)
            let pointer = array.dataPointer.bindMemory(to: Float.self, capacity: 3 * pixelCount)

            for y in 0..<size {
                for x in 0..<size {
                    let pixelOffset = (y * size + x) * 4
                    let red = Float(pixels[pixelOffset])
                    let green = Float(pixels[pixelOffset + 1])
                    let blue = Float(pixels[pixelOffset + 2])
                    pointer[0 * strides[0] + 0 * strides[1] + y * strides[2] + x * strides[3]] = red
                    pointer[0 * strides[0] + 1 * strides[1] + y * strides[2] + x * strides[3]] = green
                    pointer[0 * strides[0] + 2 * strides[1] + y * strides[2] + x * strides[3]] = blue
                }
            }

            return array
        }

        private static func normalizedEmbedding(from array: MLMultiArray) -> [Float]? {
            guard array.count == Configuration.embeddingDimension else {
                return nil
            }

            let pointer = array.dataPointer.bindMemory(to: Float.self, capacity: array.count)
            var values = (0..<array.count).map { pointer[$0] }
            let norm = sqrt(values.reduce(Float(0)) { $0 + ($1 * $1) })
            guard norm > 0 else {
                return nil
            }
            values = values.map { $0 / norm }
            return values
        }
    }

    private enum EmbeddingCache {
        private struct Payload: Codable {
            let modelVersion: String
            let embeddings: [[Float]]
        }

        private static let modelVersion = "sface-2021dec-coreml-fp16-v1"

        static func descriptors(for url: URL) -> [FaceDescriptor]? {
            guard
                let cacheURL = cacheFileURL(for: url),
                let data = try? Data(contentsOf: cacheURL),
                let payload = try? JSONDecoder().decode(Payload.self, from: data),
                payload.modelVersion == modelVersion,
                !payload.embeddings.isEmpty
            else {
                return nil
            }

            return payload.embeddings.map { FaceDescriptor(embedding: $0) }
        }

        static func store(_ descriptors: [FaceDescriptor], for url: URL) {
            let embeddings = descriptors.map(\.embedding)
            guard
                !embeddings.isEmpty,
                let cacheURL = cacheFileURL(for: url)
            else {
                return
            }

            try? FileManager.default.createDirectory(
                at: cacheURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            let payload = Payload(modelVersion: modelVersion, embeddings: embeddings)
            guard let data = try? JSONEncoder().encode(payload) else {
                return
            }
            try? data.write(to: cacheURL, options: .atomic)
        }

        private static func cacheFileURL(for url: URL) -> URL? {
            guard let cachesDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
                return nil
            }
            return cachesDirectory
                .appendingPathComponent("CadetCatchFaceEmbeddings", isDirectory: true)
                .appendingPathComponent(cacheKey(for: url))
                .appendingPathExtension("json")
        }

        private static func cacheKey(for url: URL) -> String {
            let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
            return digest.map { String(format: "%02x", $0) }.joined()
        }
    }

    private static func confidence(for reference: FaceDescriptor, comparedTo candidate: FaceDescriptor) -> Int? {
        guard
            let similarity = cosineSimilarity(reference.embedding, candidate.embedding),
            similarity >= Configuration.minimumCosineSimilarity
        else {
            return nil
        }

        return confidenceScore(forCosineSimilarity: similarity)
    }

    private static func confidenceScore(forCosineSimilarity similarity: Float) -> Int {
        let normalized = (similarity - Configuration.minimumCosineSimilarity) / (Configuration.strongCosineSimilarity - Configuration.minimumCosineSimilarity)
        return max(Configuration.minimumAcceptedConfidence, min(99, Configuration.minimumAcceptedConfidence + Int((normalized * 19).rounded())))
    }

    private static func cosineSimilarity(_ reference: [Float], _ candidate: [Float]) -> Float? {
        guard reference.count == candidate.count, reference.count == Configuration.embeddingDimension else { return nil }
        var dot = Float(0)
        var referenceNorm = Float(0)
        var candidateNorm = Float(0)
        for index in reference.indices {
            dot += reference[index] * candidate[index]
            referenceNorm += reference[index] * reference[index]
            candidateNorm += candidate[index] * candidate[index]
        }
        guard referenceNorm > 0, candidateNorm > 0 else { return nil }
        return dot / (sqrt(referenceNorm) * sqrt(candidateNorm))
    }

    private static func cropFace(_ observation: VNFaceObservation, from image: CGImage) -> CGImage? {
        let normalizedBox = structuralFaceBox(for: observation) ?? observation.boundingBox
        let width = CGFloat(image.width)
        let height = CGFloat(image.height)
        var rect = CGRect(
            x: normalizedBox.minX * width,
            y: (1 - normalizedBox.maxY) * height,
            width: normalizedBox.width * width,
            height: normalizedBox.height * height
        )
        rect = rect.insetBy(dx: -(rect.width * 0.08), dy: -(rect.height * 0.1))
        rect = rect.intersection(CGRect(x: 0, y: 0, width: width, height: height))
        guard rect.width > 24, rect.height > 24 else { return nil }
        return image.cropping(to: rect)
    }

    private static func structuralFaceBox(for observation: VNFaceObservation) -> CGRect? {
        guard let landmarks = observation.landmarks else { return nil }

        let regions = [
            landmarks.leftEyebrow,
            landmarks.rightEyebrow,
            landmarks.leftEye,
            landmarks.rightEye,
            landmarks.nose,
            landmarks.noseCrest,
            landmarks.outerLips,
            landmarks.innerLips,
            landmarks.faceContour
        ]

        let points = regions
            .compactMap { $0 }
            .flatMap(normalizedPoints(in:))
        guard !points.isEmpty else { return nil }

        let minX = points.map(\.x).min() ?? 0
        let maxX = points.map(\.x).max() ?? 1
        let minY = points.map(\.y).min() ?? 0
        let maxY = points.map(\.y).max() ?? 1

        let bounds = observation.boundingBox
        let cropMinX = bounds.minX + bounds.width * max(minX - 0.18, 0)
        let cropMaxX = bounds.minX + bounds.width * min(maxX + 0.18, 1)
        let cropMinY = bounds.minY + bounds.height * max(minY - 0.12, 0)
        let cropMaxY = bounds.minY + bounds.height * min(maxY + 0.2, 1)

        guard cropMaxX > cropMinX, cropMaxY > cropMinY else { return nil }
        return CGRect(
            x: cropMinX,
            y: cropMinY,
            width: cropMaxX - cropMinX,
            height: cropMaxY - cropMinY
        )
    }

    private static func area(of rect: CGRect) -> CGFloat {
        rect.width * rect.height
    }

    private static func center(of region: VNFaceLandmarkRegion2D?) -> CGPoint? {
        guard let region else { return nil }
        let points = normalizedPoints(in: region)
        guard !points.isEmpty else { return nil }
        let sum = points.reduce(CGPoint.zero) { partial, point in
            CGPoint(x: partial.x + point.x, y: partial.y + point.y)
        }
        let count = CGFloat(points.count)
        return CGPoint(x: sum.x / count, y: sum.y / count)
    }

    private static func normalizedPoints(in region: VNFaceLandmarkRegion2D) -> [CGPoint] {
        let rawPoints = region.normalizedPoints
        return (0..<region.pointCount).map { index in
            let point = rawPoints[index]
            return CGPoint(x: CGFloat(point.x), y: CGFloat(point.y))
        }
    }

    private static func candidateOrientations(startingWith preferred: CGImagePropertyOrientation) -> [CGImagePropertyOrientation] {
        var orientations: [CGImagePropertyOrientation] = [preferred]
        for orientation in [CGImagePropertyOrientation.up, .right, .left, .down] where !orientations.contains(orientation) {
            orientations.append(orientation)
        }
        return orientations
    }

}

extension CGImagePropertyOrientation {
    init(_ orientation: UIImage.Orientation) {
        switch orientation {
        case .up: self = .up
        case .down: self = .down
        case .left: self = .left
        case .right: self = .right
        case .upMirrored: self = .upMirrored
        case .downMirrored: self = .downMirrored
        case .leftMirrored: self = .leftMirrored
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
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

private extension Data {
    mutating func appendUTF8(_ string: String) {
        append(Data(string.utf8))
    }
}

enum Theme {
    static let navy = Color(red: 0.13, green: 0.24, blue: 0.44)
    static let navyDark = Color(red: 0.02, green: 0.07, blue: 0.14)
    static let orange = Color(red: 0.95, green: 0.33, blue: 0.11)
    static let background = Color(red: 0.94, green: 0.96, blue: 0.98)
    static let panel = Color.white
    static let muted = Color(red: 0.36, green: 0.42, blue: 0.51)
    static let border = Color(red: 0.78, green: 0.82, blue: 0.88)
    static let green = Color(red: 0.22, green: 0.67, blue: 0.41)
    static let softRed = Color(red: 0.73, green: 0.35, blue: 0.29)
}

struct AppFlowView: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        Group {
            if store.hasSeenOnboarding {
                MainTabView()
            } else {
                LaunchView()
            }
        }
    }
}

struct LaunchView: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        GeometryReader { proxy in
            VStack(spacing: 0) {
                // Ship separated at the top
                Image("EagleLaunch")
                    .resizable()
                    .scaledToFill()
                    .frame(width: proxy.size.width, height: proxy.size.height * 0.45)
                    .clipped()

                // Text at the bottom
                VStack(alignment: .leading, spacing: 30) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("CadetCatch")
                            .font(.system(size: 38, weight: .black, design: .rounded))
                            .foregroundStyle(Theme.navyDark)
                        Text("USCGC EAGLE")
                            .font(.caption.weight(.black))
                            .textCase(.uppercase)
                            .tracking(1.5)
                            .foregroundStyle(Theme.orange)
                    }

                    VStack(alignment: .leading, spacing: 14) {
                        Text("Find cadet photos instantly.")
                            .font(.system(size: 32, weight: .black, design: .rounded))
                            .foregroundStyle(Theme.navyDark)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)
                            
                        Text("Welcome parents! Add a clear photo of your cadet and CadetCatch will look through event photos for possible matches.")
                            .font(.body.weight(.medium))
                            .foregroundStyle(Theme.muted)
                            .lineSpacing(4)
                    }

                    Spacer()

                    VStack(spacing: 16) {
                        Button {
                            store.selectedTab = .roster
                            store.completeOnboarding()
                        } label: {
                            Text("Add Cadet Profile")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(PrimaryButtonStyle())

                        Button {
                            store.completeOnboarding()
                        } label: {
                            Text("Continue")
                                .font(.headline.weight(.bold))
                                .foregroundStyle(Theme.navyDark)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .background(Color.blue.opacity(0.15), in: RoundedRectangle(cornerRadius: 16))
                        }
                    }
                    .padding(.bottom, 24)
                }
                .padding(.horizontal, 28)
                .padding(.top, 32)
                .frame(width: proxy.size.width, height: proxy.size.height * 0.55, alignment: .topLeading)
                .background(Theme.background)
            }
            .ignoresSafeArea(edges: .top)
        }
        .background(Theme.background)
    }
}

struct MainTabView: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        @Bindable var store = store

        TabView(selection: $store.selectedTab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack {
                    content(for: tab)
                        .navigationTitle(tab.title)
                        .navigationBarTitleDisplayMode(.large)
                        .toolbarBackground(Theme.background, for: .navigationBar)
                }
                .tabItem {
                    Label(tab.title, systemImage: tab.symbol)
                }
                .tag(tab)
            }
        }
        .tint(Theme.orange)
        .toolbarBackground(Theme.background, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .sheet(isPresented: $store.showScanReceipt) {
            ScanReceiptSheet()
                .presentationDetents([.medium])
        }
    }

    @ViewBuilder
    private func content(for tab: AppTab) -> some View {
        switch tab {
        case .home: HomeView()
        case .photos: PhotosView()
        case .roster: RosterView()
        case .sources: SourcesView()
        case .more: MoreView()
        }
    }
}

struct ScanReceiptSheet: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: store.scanProgress.isCancelled ? "exclamationmark.triangle.fill" : "checkmark.seal.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(store.scanProgress.isCancelled ? Theme.orange : Theme.green)
                    .padding(.top, 24)
                
                Text(store.scanProgress.isCancelled ? "Search Stopped" : "Search Complete")
                    .font(.title2.weight(.black))
                    .foregroundStyle(Theme.navyDark)
                
                if store.scanProgress.isCancelled {
                    Text("The search was stopped early. Here are the partial results.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                VStack(spacing: 16) {
                    receiptRow("Reference Photo", store.scanProgress.photosScanned > 0 ? "Analyzed" : "Queued")
                    receiptRow("Photo Search", store.scanProgress.isCancelled ? "Stopped" : "Completed")
                    receiptRow("Matches Found", "\(store.scanProgress.photosMatched)")
                    
                    if let start = store.scanProgress.startDate {
                        let elapsed = Date().timeIntervalSince(start)
                        let minutes = Int(elapsed) / 60
                        let seconds = Int(elapsed) % 60
                        receiptRow("Time Elapsed", String(format: "%dm %ds", minutes, seconds))
                    }
                }
                .padding()
                .background(Color.white, in: RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
                .padding(.horizontal, 24)
                
                Spacer()
                
                Button("View Matches") {
                    dismiss()
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding()
            }
            .background(Theme.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(Theme.muted)
                            .font(.title3)
                    }
                }
            }
        }
    }
    
    private func receiptRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.navy)
            Spacer()
            Text(value)
                .font(.headline.weight(.black))
                .foregroundStyle(Theme.navyDark)
        }
    }
}

struct HomeView: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AccessManager.self) private var access
    @State private var showingPurchaseOptions = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HeaderPanel()

                if store.cadets.isEmpty {
                    EmptyStateView(
                        symbol: "person.crop.circle.badge.plus",
                        title: "Add a cadet",
                        message: "A clear profile photo is required before CadetCatch can search event photos.",
                        buttonTitle: "Open Roster"
                    ) {
                        store.selectedTab = .roster
                    }
                } else {
                    ActiveCadetCard()
                    SourceSummaryCard()
                    ScanCard {
                        Task { await runScan() }
                    } onShowPurchaseOptions: {
                        showingPurchaseOptions = true
                    }
                    RecentScansCard()
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 140)
        }
        .background(Theme.background)
        .sheet(isPresented: $showingPurchaseOptions) {
            PurchaseOptionsSheet()
                .presentationDetents([.medium, .large])
        }
    }

    private func runScan() async {
        guard !store.scanProgress.isScanning else { return }
        guard store.activeCadet != nil else {
            store.lastScanMessage = "Add a cadet profile before searching photos."
            return
        }
        guard store.beginSearch(hasMonthlyAccess: hasFullAccess) else {
            showingPurchaseOptions = true
            return
        }
        await store.scanActiveCadet()
    }

    private var hasFullAccess: Bool {
        purchases.hasMonthlyAccess || access.hasActiveAppAccess
    }
}

struct HeaderPanel: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Good morning")
                        .font(.title2.weight(.black))
                        .foregroundStyle(.white)
                    Text(store.activeCadet.map { "\($0.name) is selected." } ?? "Set up a cadet profile to begin.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.82))
                }
                Spacer()
                Text(store.activeCadet?.initials ?? "CC")
                    .font(.headline.weight(.black))
                    .foregroundStyle(.white)
                    .frame(width: 54, height: 54)
                    .background(Theme.orange, in: Circle())
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 10) {
                MetricTile(value: "\(store.sources.count)", label: "Collections")
                MetricTile(value: "\(store.savedCandidates.count)", label: "Saved")
                MetricTile(value: "\(store.candidates.count)", label: "New")
            }
        }
        .padding(18)
        .background {
            ZStack {
                Theme.navy
                Circle()
                    .stroke(.white.opacity(0.08), lineWidth: 12)
                    .frame(width: 360, height: 360)
                    .offset(x: 170, y: -110)
                Circle()
                    .stroke(.white.opacity(0.06), lineWidth: 12)
                    .frame(width: 470, height: 470)
                    .offset(x: 210, y: -120)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 24))
    }
}

struct ActiveCadetCard: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        if let cadet = store.activeCadet {
            HStack(spacing: 14) {
                CadetAvatar(cadet: cadet, size: 70)
                VStack(alignment: .leading, spacing: 5) {
                    Text(cadet.name)
                        .font(.headline.weight(.black))
                        .foregroundStyle(Theme.navyDark)
                    Text(cadet.unit.isEmpty ? "No unit entered" : cadet.unit)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.orange)
                    Text(cadet.relation)
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                }
                Spacer()
                Button("Change") {
                    store.selectedTab = .roster
                }
                .font(.caption.weight(.black))
                .buttonStyle(.bordered)
                .tint(Theme.navy)
            }
            .appPanel()
        }
    }
}

struct SourceSummaryCard: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Event photo collection")
                    .font(.headline.weight(.black))
                    .foregroundStyle(Theme.navyDark)
                Spacer()
                Button("Details") {
                    store.selectedTab = .sources
                }
                .font(.caption.weight(.black))
                .buttonStyle(.bordered)
                .tint(Theme.navy)
            }

            HStack(spacing: 10) {
                Image(systemName: "photo.stack")
                    .foregroundStyle(Theme.orange)
                    .frame(width: 34, height: 34)
                    .background(Theme.orange.opacity(0.12), in: Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text("Ready to search")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Theme.navyDark)
                    Text("Your selected cadet photo is used to find possible matches in the event photos.")
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(2)
                }
                Spacer()
            }
        }
        .appPanel()
    }
}

struct ScanCard: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AccessManager.self) private var access
    @State private var explainedTolerance: SearchTolerance?
    let onScan: () -> Void
    let onShowPurchaseOptions: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Find photos")
                        .font(.headline.weight(.black))
                        .foregroundStyle(Theme.navyDark)
                    Text("Use the selected cadet photo to look for possible full-photo matches.")
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(2)
                }
                Spacer()
            }

            HStack(spacing: 8) {
                Image(systemName: hasFullAccess ? "checkmark.seal.fill" : "creditcard.fill")
                    .foregroundStyle(hasFullAccess ? Theme.green : Theme.orange)
                Text(store.searchAccessLabel(hasMonthlyAccess: hasFullAccess))
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Theme.navyDark)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Theme.background, in: RoundedRectangle(cornerRadius: 14))

            SearchToleranceControl(explainedTolerance: $explainedTolerance)

            if store.scanProgress.isScanning {
                VStack(spacing: 12) {
                    ProgressView()
                        .tint(Theme.orange)
                    Text(store.scanProgress.progressString)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Theme.muted)
                        .multilineTextAlignment(.center)
                        
                    Button(action: {
                        store.stopScan()
                    }) {
                        Text("Stop Search")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.white)
                            .padding(.vertical, 8)
                            .padding(.horizontal, 16)
                            .background(Theme.orange, in: Capsule())
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }

            if let message = store.lastScanMessage {
                Text(message)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(2)
            }

            Button(action: onScan) {
                Label(store.scanProgress.isScanning ? "Searching Photos" : scanButtonTitle, systemImage: scanButtonSymbol)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(store.scanProgress.isScanning)

            if !hasFullAccess {
                Button(action: onShowPurchaseOptions) {
                    Text("View Purchase Options")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(Theme.navy)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                }
            }
        }
        .appPanel()
        .alert(item: $explainedTolerance) { tolerance in
            Alert(
                title: Text(tolerance.helpTitle),
                message: Text(tolerance.helpText),
                dismissButton: .default(Text("OK"))
            )
        }
    }

    private var scanButtonTitle: String {
        store.canStartSearch(hasMonthlyAccess: hasFullAccess) ? "Search Photos" : "Buy Photo Search"
    }

    private var scanButtonSymbol: String {
        store.canStartSearch(hasMonthlyAccess: hasFullAccess) ? "face.dashed" : "lock.open.fill"
    }

    private var hasFullAccess: Bool {
        purchases.hasMonthlyAccess || access.hasActiveAppAccess
    }
}

struct SearchToleranceControl: View {
    @Environment(CadetCatchStore.self) private var store
    @Binding var explainedTolerance: SearchTolerance?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Match range")
                        .font(.caption.weight(.black))
                        .foregroundStyle(Theme.navyDark)
                    Text("Lower finds more possible matches; higher is more exact.")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
            }

            HStack(spacing: 8) {
                ForEach(SearchTolerance.allCases) { tolerance in
                    toleranceButton(tolerance)
                }
            }
        }
        .padding(12)
        .background(Theme.background, in: RoundedRectangle(cornerRadius: 14))
    }

    private func toleranceButton(_ tolerance: SearchTolerance) -> some View {
        let isSelected = store.searchTolerance == tolerance

        return ZStack(alignment: .topTrailing) {
            Button {
                store.updateSearchTolerance(tolerance)
            } label: {
                VStack(spacing: 7) {
                    Text(tolerance.title)
                        .font(.caption.weight(.black))
                        .lineLimit(1)
                        .minimumScaleFactor(0.82)

                    Text(tolerance.subtitle)
                        .font(.caption2.weight(.bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.82)

                    Text(tolerance.scoreLabel)
                        .font(.caption2.monospacedDigit().weight(.black))
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, minHeight: 74)
                .padding(.horizontal, 6)
                .contentShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(tolerance.title) match range, \(tolerance.subtitle), \(tolerance.scoreLabel)")
            .accessibilityAddTraits(isSelected ? .isSelected : [])

            Button {
                explainedTolerance = tolerance
            } label: {
                Image(systemName: "info.circle")
                    .font(.caption.weight(.bold))
                    .frame(width: 26, height: 26)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(tolerance.title) match range details")
            .padding(3)
        }
        .foregroundStyle(isSelected ? .white : Theme.navyDark)
        .background(isSelected ? Theme.navy : Color.white, in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Theme.navy : Theme.border, lineWidth: 1)
        )
    }
}

struct RecentScansCard: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        if !store.scanRecords.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("Recent searches")
                    .font(.headline.weight(.black))
                    .foregroundStyle(Theme.navyDark)
                ForEach(store.scanRecords.prefix(3)) { record in
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(record.cadetName)
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(Theme.navyDark)
                            Text(record.scannedAt.formatted(date: .abbreviated, time: .shortened))
                                .font(.caption)
                                .foregroundStyle(Theme.muted)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 3) {
                            Text("\(record.matchCount)")
                                .font(.title3.weight(.black))
                                .foregroundStyle(Theme.orange)
                            Text("\(record.imageCount) found")
                                .font(.caption)
                                .foregroundStyle(Theme.muted)
                        }
                    }
                }
            }
            .appPanel()
        }
    }
}

struct PurchaseOptionsSheet: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    @Environment(\.dismiss) private var dismiss
    @State private var busyProduct: CommerceProduct?
    @State private var isRestoring = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Photo Access")
                            .font(.title2.weight(.black))
                            .foregroundStyle(Theme.navyDark)
                        Text("Choose a one-time check or monthly access. Results remain covered until a photo unlock or monthly access is active.")
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                            .lineSpacing(3)
                    }
                    .appPanel()

                    CommerceOptionCard(product: .monthly, busyProduct: busyProduct) {
                        await buy(.monthly)
                    }

                    CommerceOptionCard(product: .oneTimeSearch, busyProduct: busyProduct) {
                        let outcome = await buy(.oneTimeSearch, shouldDismiss: false)
                        if outcome.completed {
                            store.addSearchCredit()
                            dismiss()
                        }
                    }

                    if let message = purchases.lastMessage {
                        Text(message)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Theme.muted)
                            .padding(.horizontal, 2)
                    }

                    Button {
                        Task {
                            isRestoring = true
                            await purchases.restorePurchases()
                            isRestoring = false
                        }
                    } label: {
                        Label(isRestoring ? "Restoring" : "Restore Purchases", systemImage: "arrow.clockwise")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(Theme.navy)
                    .disabled(isRestoring || busyProduct != nil)

                    HStack(spacing: 14) {
                        Link("Privacy", destination: URL(string: "https://cadetcatch.com/privacy/")!)
                        Link("Terms", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                    }
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Theme.navy)
                    .frame(maxWidth: .infinity)
                }
                .padding(16)
            }
            .background(Theme.background)
            .navigationTitle("Purchases")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                CadetCatchAnalytics.log(.paywallView)
                await purchases.loadProducts()
            }
        }
    }

    @discardableResult
    private func buy(_ product: CommerceProduct, shouldDismiss: Bool = true) async -> PurchaseOutcome {
        guard busyProduct == nil else { return .pending }
        busyProduct = product
        let outcome = await purchases.purchase(product)
        busyProduct = nil
        if shouldDismiss, outcome.completed {
            dismiss()
        }
        return outcome
    }
}

struct CommerceOptionCard: View {
    @Environment(PurchaseManager.self) private var purchases
    let product: CommerceProduct
    let busyProduct: CommerceProduct?
    let action: () async -> Void

    var body: some View {
        let isBusy = busyProduct == product
        let isAvailable = purchases.product(for: product) != nil

        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: product == .monthly ? "calendar.badge.checkmark" : "magnifyingglass")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(Theme.orange)
                    .frame(width: 42, height: 42)
                    .background(Theme.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 13))

                VStack(alignment: .leading, spacing: 4) {
                    Text(product.title)
                        .font(.headline.weight(.black))
                        .foregroundStyle(Theme.navyDark)
                    Text(product.detail)
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(2)
                }
                Spacer()
                Text(purchases.displayPrice(for: product))
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(Theme.navy)
            }

            Button {
                Task { await action() }
            } label: {
                HStack {
                    if isBusy {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isAvailable ? "Continue" : "Not Available")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(isBusy || busyProduct != nil || !isAvailable)
        }
        .appPanel()
    }
}

struct PhotosView: View {
    @Environment(CadetCatchStore.self) private var store
    @State private var scope: PhotoScope = .new
    @State private var selectedCandidate: PhotoCandidate?

    var visibleCandidates: [PhotoCandidate] {
        scope == .new ? store.candidates : store.savedCandidates
    }

    var body: some View {
        VStack(spacing: 12) {
            Picker("Photos", selection: $scope) {
                ForEach(PhotoScope.allCases) { scope in
                    Text(scope.rawValue).tag(scope)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 12)

            if visibleCandidates.isEmpty {
                EmptyStateView(
                    symbol: scope == .new ? "photo.on.rectangle.angled" : "archivebox",
                    title: scope == .new ? "No photos ready" : "Saved is empty",
                    message: scope == .new ? "Run a photo search from Home after adding a cadet." : "Save reviewed photos to keep them here.",
                    buttonTitle: scope == .new ? "Open Home" : "Show New"
                ) {
                    if scope == .new {
                        store.selectedTab = .home
                    } else {
                        scope = .new
                    }
                }
                .padding(16)
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 158), spacing: 12)], spacing: 12) {
                        ForEach(visibleCandidates) { candidate in
                            CandidateCard(candidate: candidate)
                                .onTapGesture {
                                    selectedCandidate = candidate
                                }
                        }
                    }
                    .padding(16)
                }
            }
        }
        .background(Theme.background)
        .sheet(item: $selectedCandidate) { candidate in
            CandidateDetailView(candidate: candidate)
                .presentationDetents([.large])
        }
        #if DEBUG
        .onAppear {
            guard
                ProcessInfo.processInfo.arguments.contains("--cadetcatch-screenshot-photo-detail"),
                selectedCandidate == nil,
                let firstCandidate = visibleCandidates.first
            else { return }
            selectedCandidate = firstCandidate
        }
        #endif
    }
}

struct CandidateCard: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AccessManager.self) private var access
    let candidate: PhotoCandidate

    var body: some View {
        let unlocked = store.isUnlocked(candidate, hasMonthlyAccess: hasFullAccess)

        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                CandidateImage(url: candidate.imageURL, mode: .fill)
                    .frame(height: 144)
                    .blur(radius: unlocked ? 0 : 9)
                    .clipped()

                if !unlocked {
                    LockedImageOverlay(label: "Unlock to View")
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(candidate.cadetName)
                    .font(.subheadline.weight(.black))
                    .foregroundStyle(Theme.navyDark)
                    .lineLimit(1)
                Text(candidate.sourceName)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
                    .lineLimit(1)
                if store.isSaved(candidate) {
                    Label("Saved", systemImage: "bookmark.fill")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Theme.orange)
                } else if !unlocked {
                    Label("Covered", systemImage: "lock.fill")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Theme.navy)
                }
            }
            .padding(12)
        }
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.border, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 18))
    }

    private var hasFullAccess: Bool {
        purchases.hasMonthlyAccess || access.hasActiveAppAccess
    }
}

struct CandidateDetailView: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AccessManager.self) private var access
    let candidate: PhotoCandidate
    @State private var draft: String?
    @State private var isUnlocking = false
    @State private var isSubscribing = false
    @State private var saveToPhotosState: SaveToPhotosState = .idle

    var body: some View {
        let unlocked = store.isUnlocked(candidate, hasMonthlyAccess: hasFullAccess)

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ZStack {
                        CandidateImage(url: candidate.imageURL, mode: .fit)
                            .frame(maxWidth: .infinity, minHeight: 280)
                            .blur(radius: unlocked ? 0 : 12)
                            .background(.black, in: RoundedRectangle(cornerRadius: 22))
                            .clipShape(RoundedRectangle(cornerRadius: 22))

                        if !unlocked {
                            LockedImageOverlay(label: "Photo Covered")
                                .clipShape(RoundedRectangle(cornerRadius: 22))
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text(candidate.sourceName)
                            .font(.title3.weight(.black))
                            .foregroundStyle(Theme.navyDark)
                        Text(candidate.sourceHost)
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                        if unlocked {
                            Link("Open full photo", destination: candidate.imageURL)
                                .font(.subheadline.weight(.bold))
                            Button {
                                Task { await saveMatchedPhotoToLibrary() }
                            } label: {
                                HStack {
                                    if saveToPhotosState == .saving {
                                        ProgressView().tint(.white)
                                    }
                                    Label(saveToPhotosState.buttonTitle, systemImage: saveToPhotosState.buttonIcon)
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            .disabled(saveToPhotosState == .saving)

                            if let message = saveToPhotosState.message {
                                Text(message)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(saveToPhotosState == .saved ? .green : Theme.muted)
                            }

                            if saveToPhotosState == .permissionDenied {
                                Button("Open Settings") {
                                    openPhotoSettings()
                                }
                                .font(.caption.weight(.bold))
                                .foregroundStyle(Theme.orange)
                            }
                        } else {
                            Text("Unlock this photo or start monthly access to view the image.")
                                .font(.subheadline)
                                .foregroundStyle(Theme.muted)
                                .lineSpacing(3)
                        }
                    }
                    .appPanel()

                    if unlocked {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Review note")
                                .font(.headline.weight(.black))
                                .foregroundStyle(Theme.navyDark)
                            Text(draft ?? "Create a plain record of this reviewed candidate.")
                                .font(.subheadline)
                                .foregroundStyle(Theme.muted)
                                .lineSpacing(3)
                            HStack {
                                Button("Create Note") {
                                    draft = store.draftNote(for: candidate)
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(Theme.navy)

                                if let draft {
                                    ShareLink(item: draft) {
                                        Label("Share", systemImage: "square.and.arrow.up")
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(Theme.orange)
                                }
                            }
                        }
                        .appPanel()
                    } else {
                        LockedPurchasePanel(
                            isUnlocking: isUnlocking,
                            isSubscribing: isSubscribing,
                            unlockPrice: purchases.displayPrice(for: .photoUnlock),
                            monthlyPrice: purchases.displayPrice(for: .monthly),
                            onUnlock: { Task { await unlockPhoto() } },
                            onSubscribe: { Task { await subscribe() } }
                        )
                    }

                    if let message = purchases.lastMessage, !unlocked {
                        Text(message)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Theme.muted)
                    }
                }
                .padding(16)
            }
            .background(Theme.background)
            .navigationTitle("Photo Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if unlocked {
                    Button {
                        if store.isSaved(candidate) {
                            store.removeSaved(candidate)
                        } else {
                            store.save(candidate)
                        }
                    } label: {
                        Image(systemName: store.isSaved(candidate) ? "bookmark.fill" : "bookmark")
                    }
                }
            }
        }
    }

    private func unlockPhoto() async {
        guard !isUnlocking else { return }
        isUnlocking = true
        let outcome = await purchases.purchase(.photoUnlock)
        if outcome.completed {
            store.unlock(candidate)
        }
        isUnlocking = false
    }

    private func subscribe() async {
        guard !isSubscribing else { return }
        isSubscribing = true
        _ = await purchases.purchase(.monthly)
        isSubscribing = false
    }

    private func saveMatchedPhotoToLibrary() async {
        guard saveToPhotosState != .saving else { return }
        saveToPhotosState = .saving

        do {
            try await PhotoLibrarySaver.savePhoto(from: candidate.imageURL, fallbackData: PhotoCandidatePreview.data(for: candidate.imageURL))
            saveToPhotosState = .saved
        } catch PhotoLibrarySaveError.permissionDenied {
            saveToPhotosState = .permissionDenied
        } catch PhotoLibrarySaveError.invalidImageData {
            saveToPhotosState = .invalidImage
        } catch {
            saveToPhotosState = .failed
        }
    }

    private func openPhotoSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }

    private var hasFullAccess: Bool {
        purchases.hasMonthlyAccess || access.hasActiveAppAccess
    }
}

enum SaveToPhotosState: Equatable {
    case idle
    case saving
    case saved
    case permissionDenied
    case invalidImage
    case failed

    var buttonTitle: String {
        switch self {
        case .saving: "Saving..."
        case .saved: "Saved to Photos"
        default: "Save to Photos"
        }
    }

    var buttonIcon: String {
        switch self {
        case .saving: "arrow.down.circle"
        case .saved: "checkmark.circle.fill"
        default: "square.and.arrow.down"
        }
    }

    var message: String? {
        switch self {
        case .idle, .saving:
            nil
        case .saved:
            "Saved to your iPhone Photos library."
        case .permissionDenied:
            "Photos permission is denied or restricted. Allow Photos access in Settings to save this image."
        case .invalidImage:
            "This photo could not be saved. Try opening the full photo and saving from Safari."
        case .failed:
            "Save failed. Check your connection and try again."
        }
    }
}

enum PhotoLibrarySaveError: Error {
    case permissionDenied
    case invalidImageData
    case saveFailed
}

struct PhotoLibrarySaver {
    static func savePhoto(from url: URL, fallbackData: Data? = nil) async throws {
        let status = await addOnlyAuthorizationStatus()
        guard status == .authorized || status == .limited else {
            throw PhotoLibrarySaveError.permissionDenied
        }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard !data.isEmpty, UIImage(data: data) != nil else {
                throw PhotoLibrarySaveError.invalidImageData
            }

            try await writePhoto(data: data, originalFilename: originalFilename(for: url, response: response))
        } catch {
            guard let fallbackData, !fallbackData.isEmpty, UIImage(data: fallbackData) != nil else {
                throw error
            }
            try await writePhoto(data: fallbackData, originalFilename: originalFallbackFilename(for: url))
        }
    }

    private static func addOnlyAuthorizationStatus() async -> PHAuthorizationStatus {
        let currentStatus = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        guard currentStatus == .notDetermined else { return currentStatus }

        return await withCheckedContinuation { continuation in
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                continuation.resume(returning: status)
            }
        }
    }

    private static func writePhoto(data: Data, originalFilename: String) async throws {
        try await withCheckedThrowingContinuation { continuation in
            PHPhotoLibrary.shared().performChanges {
                let request = PHAssetCreationRequest.forAsset()
                let options = PHAssetResourceCreationOptions()
                options.originalFilename = originalFilename
                request.addResource(with: .photo, data: data, options: options)
            } completionHandler: { success, error in
                if success {
                    continuation.resume(returning: ())
                } else {
                    continuation.resume(throwing: error ?? PhotoLibrarySaveError.saveFailed)
                }
            }
        }
    }

    private static func originalFilename(for url: URL, response: URLResponse) -> String {
        let responseName = response.suggestedFilename?.trimmingCharacters(in: .whitespacesAndNewlines)
        let urlName = url.lastPathComponent.removingPercentEncoding?.trimmingCharacters(in: .whitespacesAndNewlines)

        if let responseName, !responseName.isEmpty {
            return responseName
        }
        if let urlName, !urlName.isEmpty {
            return urlName
        }
        return "CadetCatch-\(Int(Date().timeIntervalSince1970)).jpg"
    }

    private static func originalFallbackFilename(for url: URL) -> String {
        let stem = url.deletingPathExtension().lastPathComponent
            .removingPercentEncoding?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if let stem, !stem.isEmpty {
            return "\(stem)-CadetCatch-preview.jpg"
        }
        return "CadetCatch-preview-\(Int(Date().timeIntervalSince1970)).jpg"
    }
}

private enum RemotePhotoImageLoader {
    static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        config.urlCache = URLCache.shared
        return URLSession(configuration: config)
    }()

    static func imageData(from url: URL) async throws -> Data {
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8", forHTTPHeaderField: "Accept")
        request.setValue("CadetCatch/1.0 photo-preview", forHTTPHeaderField: "User-Agent")
        URLCache.shared.removeCachedResponse(for: request)

        let (data, response) = try await session.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200...299).contains(httpResponse.statusCode) {
            throw URLError(.badServerResponse)
        }
        guard !data.isEmpty else {
            throw URLError(.zeroByteResource)
        }
        return data
    }
}

struct CandidateImage: View {
    let url: URL
    let mode: ContentMode
    @State private var loadedImage: UIImage?
    @State private var isLoading = false
    @State private var didFail = false
    @State private var reloadToken = UUID()

    var body: some View {
        Group {
            if let loadedImage {
                Image(uiImage: loadedImage)
                    .resizable()
                    .aspectRatio(contentMode: mode)
            } else if isLoading {
                loadingPlaceholder
            } else if didFail {
                failurePlaceholder
            } else {
                loadingPlaceholder
            }
        }
        .task(id: "\(url.absoluteString)-\(reloadToken.uuidString)") {
            await loadImage()
        }
    }

    private var loadingPlaceholder: some View {
        ZStack {
            Rectangle().fill(Theme.border.opacity(0.45))
            ProgressView().tint(Theme.orange)
        }
    }

    private var failurePlaceholder: some View {
        ZStack {
            Rectangle().fill(Theme.border.opacity(0.45))
            Button {
                reloadToken = UUID()
            } label: {
                VStack(spacing: 8) {
                    Image(systemName: "arrow.clockwise.circle.fill")
                        .font(.title2.weight(.semibold))
                    Text("Reload photo")
                        .font(.caption.weight(.bold))
                }
                .foregroundStyle(Theme.muted)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Reload photo preview")
        }
    }

    @MainActor
    private func loadImage() async {
        loadedImage = nil
        didFail = false
        isLoading = true

        if let previewImageData = PhotoCandidatePreview.data(for: url), let image = UIImage(data: previewImageData) {
            loadedImage = image
            isLoading = false
            return
        }

        for attempt in 1...3 {
            do {
                let data = try await RemotePhotoImageLoader.imageData(from: url)
                guard let image = UIImage(data: data) else {
                    throw PhotoLibrarySaveError.invalidImageData
                }
                PhotoCandidatePreview.storePreview(from: data, for: url)
                loadedImage = image
                isLoading = false
                return
            } catch is CancellationError {
                isLoading = false
                return
            } catch {
                if attempt < 3 {
                    try? await Task.sleep(nanoseconds: UInt64(attempt) * 450_000_000)
                    continue
                }
            }
        }

        isLoading = false
        didFail = true
    }
}

struct LockedImageOverlay: View {
    let label: String

    var body: some View {
        ZStack {
            Theme.navyDark.opacity(0.62)
            VStack(spacing: 8) {
                Image(systemName: "lock.fill")
                    .font(.title3.weight(.black))
                    .foregroundStyle(.white)
                Text(label)
                    .font(.caption.weight(.black))
                    .textCase(.uppercase)
                    .tracking(0.9)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
            }
            .padding(12)
            .background(.black.opacity(0.46), in: RoundedRectangle(cornerRadius: 14))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct LockedPurchasePanel: View {
    let isUnlocking: Bool
    let isSubscribing: Bool
    let unlockPrice: String
    let monthlyPrice: String
    let onUnlock: () -> Void
    let onSubscribe: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Unlock this match")
                .font(.headline.weight(.black))
                .foregroundStyle(Theme.navyDark)
            Text("The match is covered until a purchase is active. Unlock one photo or use monthly access for all current and future matches.")
                .font(.subheadline)
                .foregroundStyle(Theme.muted)
                .lineSpacing(3)

            VStack(spacing: 10) {
                Button(action: onUnlock) {
                    HStack {
                        if isUnlocking {
                            ProgressView().tint(.white)
                        }
                        Text("Unlock Photo \(unlockPrice)")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(isUnlocking || isSubscribing)

                Button(action: onSubscribe) {
                    HStack {
                        if isSubscribing {
                            ProgressView().tint(Theme.navy)
                        }
                        Text("Monthly Access \(monthlyPrice)")
                            .font(.headline.weight(.bold))
                    }
                    .foregroundStyle(Theme.navy)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.background, in: RoundedRectangle(cornerRadius: 16))
                }
                .disabled(isUnlocking || isSubscribing)
            }
        }
        .appPanel()
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
                        title: "Roster is empty",
                        message: "Add a cadet with a clear profile photo. The photo is used only when you start a search.",
                        buttonTitle: "Add Cadet"
                    ) {
                        showingAddCadet = true
                    }
                    .padding(.top, 60)
                } else {
                    ForEach(store.cadets) { cadet in
                        Button {
                            store.selectCadet(cadet)
                            store.selectedTab = .home
                        } label: {
                            HStack(spacing: 14) {
                                CadetAvatar(cadet: cadet, size: 64)
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(cadet.name)
                                        .font(.headline.weight(.black))
                                        .foregroundStyle(Theme.navyDark)
                                    Text(cadet.unit.isEmpty ? "No unit entered" : cadet.unit)
                                        .font(.caption.weight(.bold))
                                        .foregroundStyle(Theme.orange)
                                    Text(cadet.relation)
                                        .font(.caption)
                                        .foregroundStyle(Theme.muted)
                                }
                                Spacer()
                                Image(systemName: store.activeCadet?.id == cadet.id ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(store.activeCadet?.id == cadet.id ? Theme.green : Theme.muted)
                            }
                            .appPanel()
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
    @State private var relation = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var photoData: Data?

    var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && photoData != nil
    }

    var body: some View {
        let photoButtonTitle = photoData == nil ? "Choose Profile Photo" : "Replace Photo"

        NavigationStack {
            Form {
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 12) {
                            CadetAvatar(data: photoData, fallback: name, size: 116)
                            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                                Label(photoButtonTitle, systemImage: "photo.badge.plus")
                            }
                            .buttonStyle(.bordered)
                            .tint(Theme.orange)
                            Text("Use a clear single-face photo for best results.")
                                .font(.caption)
                                .foregroundStyle(Theme.muted)
                        }
                        Spacer()
                    }
                }

                Section("Cadet") {
                    TextField("Name", text: $name)
                    TextField("Unit or company", text: $unit)
                    TextField("Relationship", text: $relation)
                }
            }
            .navigationTitle("Add Cadet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let photoData else { return }
                        store.addCadet(
                            name: name,
                            unit: unit,
                            relation: relation.isEmpty ? "Family" : relation,
                            photoData: photoData
                        )
                        dismiss()
                    }
                    .font(.headline)
                    .disabled(!canSave)
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

struct SourcesView: View {
    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    Label("How photo matching works", systemImage: "photo.on.rectangle.angled")
                        .font(.headline.weight(.black))
                        .foregroundStyle(Theme.navyDark)
                    Text("Choose one clear photo of your cadet. CadetCatch compares it with event photos and shows possible matches for you to review.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(3)
                }
                .padding(.vertical, 4)
            }

            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Your photo stays focused on search", systemImage: "lock.shield.fill")
                        .font(.headline.weight(.black))
                        .foregroundStyle(Theme.navyDark)
                    Text("Your selected cadet photo is used for matching. New event photos are added by the CadetCatch team as they become available.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(3)
                }
                .padding(.vertical, 4)
            }

            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Review every possible match", systemImage: "person.crop.rectangle.stack")
                        .font(.headline.weight(.black))
                        .foregroundStyle(Theme.navyDark)
                    Text("Lower match ranges can find more angled photos, but they can also include lookalikes. Check each photo before saving or sharing.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(3)
                }
                .padding(.vertical, 4)
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.background)
    }
}

struct SourceRow: View {
    @Environment(CadetCatchStore.self) private var store
    let source: PhotoSource

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: source.category.symbol)
                .foregroundStyle(Theme.orange)
                .frame(width: 34, height: 34)
                .background(Theme.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 4) {
                Text(source.name)
                    .font(.subheadline.weight(.bold))
                Text(source.url.host() ?? source.url.absoluteString)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
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
        .padding(.vertical, 5)
    }
}

struct MoreView: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AccessManager.self) private var access
    @State private var query = ""
    @State private var showingResetAlert = false
    @State private var showingPurchaseOptions = false
    @State private var isRestoring = false
    @State private var spouseOrFamilyEmail = ""
    @State private var cadetInviteEmail = ""

    var filteredEntries: [JargonEntry] {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return JargonEntry.entries
        }
        return JargonEntry.entries.filter {
            $0.term.localizedCaseInsensitiveContains(query) ||
            $0.meaning.localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        @Bindable var access = access

        List {
            Section("Account & Desktop") {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Use the same email for CadetCatch on iPhone and desktop.")
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                    TextField("email@example.com", text: $access.accountEmail)
                        .keyboardType(.emailAddress)
                        .textContentType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    HStack {
                        Button {
                            access.saveAccountEmail()
                            Task { await access.refreshStatus() }
                        } label: {
                            Label("Save & Check", systemImage: "person.crop.circle.badge.checkmark")
                        }
                        .disabled(access.isLoading)

                        if purchases.hasMonthlyAccess {
                            Button {
                                Task { await access.linkMonthlySubscription(purchases.monthlySubscriptionLink) }
                            } label: {
                                Label("Link Monthly", systemImage: "link")
                            }
                            .disabled(access.isLoading)
                        }
                    }
                }

                HStack {
                    Label("Desktop Access", systemImage: access.desktopAccessActive ? "desktopcomputer" : "lock.fill")
                    Spacer()
                    Text(access.desktopAccessActive ? "Active" : "Not Active")
                        .font(.caption.weight(.black))
                        .foregroundStyle(access.desktopAccessActive ? Theme.green : Theme.muted)
                }

                Text("Desktop access unlocks only after the $7.99 add-on is verified on your CadetCatch account.")
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
            }

            Section("Photo Access") {
                HStack {
                    Label("Full App Access", systemImage: hasFullAccess ? "checkmark.seal.fill" : "lock.fill")
                    Spacer()
                    Text(hasFullAccess ? "Active" : "Not Active")
                        .font(.caption.weight(.black))
                        .foregroundStyle(hasFullAccess ? Theme.green : Theme.muted)
                }
                if access.hasActiveAppAccess && !purchases.hasMonthlyAccess {
                    Text("Access is active for this account email.")
                        .font(.caption)
                        .foregroundStyle(Theme.green)
                }
                Button {
                    showingPurchaseOptions = true
                } label: {
                    Label("Purchase Options", systemImage: "creditcard")
                }
                Button {
                    Task {
                        isRestoring = true
                        await purchases.restorePurchases()
                        isRestoring = false
                    }
                } label: {
                    Label(isRestoring ? "Restoring" : "Restore Purchases", systemImage: "arrow.clockwise")
                }
                .disabled(isRestoring)
                if let message = purchases.lastMessage {
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                }
            }

            Section("Share Access") {
                Text("Family Monthly includes one spouse or family login and one cadet login. Invites are sent by email and must be redeemed with that same email.")
                    .font(.caption)
                    .foregroundStyle(Theme.muted)

                AccessInviteRow(
                    role: .spouseOrFamily,
                    email: $spouseOrFamilyEmail,
                    invitation: access.invitations.first { $0.role == .spouseOrFamily },
                    isEnabled: canManageInvites
                ) {
                    Task {
                        await access.sendInvitation(
                            role: .spouseOrFamily,
                            recipientEmail: spouseOrFamilyEmail,
                            monthlyLink: purchases.monthlySubscriptionLink
                        )
                    }
                }

                AccessInviteRow(
                    role: .cadet,
                    email: $cadetInviteEmail,
                    invitation: access.invitations.first { $0.role == .cadet },
                    isEnabled: canManageInvites
                ) {
                    Task {
                        await access.sendInvitation(
                            role: .cadet,
                            recipientEmail: cadetInviteEmail,
                            monthlyLink: purchases.monthlySubscriptionLink
                        )
                    }
                }

                if !canManageInvites {
                    Text("Start Family Monthly or verify full account access before sending spouse or cadet invites.")
                        .font(.caption)
                        .foregroundStyle(Theme.orange)
                }

                if let message = access.lastMessage {
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                }
            }

            Section("Decoder") {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Theme.muted)
                    TextField("PT, liberty, formation", text: $query)
                }
                ForEach(filteredEntries) { entry in
                    VStack(alignment: .leading, spacing: 5) {
                        Text(entry.term)
                            .font(.headline.weight(.black))
                        Text(entry.meaning)
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                    }
                    .padding(.vertical, 4)
                }
            }

            Section("Data") {
                Button(role: .destructive) {
                    showingResetAlert = true
                } label: {
                    Label("Reset Local Data", systemImage: "trash")
                }
            }

            Section("Links") {
                Link(destination: URL(string: "https://cadetcatch.com/privacy/")!) {
                    Label("Privacy Policy", systemImage: "lock.shield")
                }
                Link(destination: URL(string: "https://cadetcatch.com/support/")!) {
                    Label("Support", systemImage: "questionmark.circle")
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.background)
        .sheet(isPresented: $showingPurchaseOptions) {
            PurchaseOptionsSheet()
                .presentationDetents([.medium, .large])
        }
        .alert("Reset CadetCatch?", isPresented: $showingResetAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Reset", role: .destructive) {
                store.resetLocalData()
            }
        } message: {
            Text("This removes cadets, saved photos, and search history from this device.")
        }
        .task {
            await access.refreshStatus()
        }
    }

    private var hasFullAccess: Bool {
        purchases.hasMonthlyAccess || access.hasActiveAppAccess
    }

    private var canManageInvites: Bool {
        hasFullAccess && access.isConfigured && !access.isLoading
    }
}

struct AccessInviteRow: View {
    let role: AccessInviteRole
    @Binding var email: String
    let invitation: AccessInvitation?
    let isEnabled: Bool
    let onSend: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(role.title)
                        .font(.headline.weight(.bold))
                    Text(role.helperText)
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                }
                Spacer()
                Text(statusText)
                    .font(.caption.weight(.black))
                    .foregroundStyle(statusColor)
            }

            TextField("email@example.com", text: $email)
                .keyboardType(.emailAddress)
                .textContentType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            Button(action: onSend) {
                Label(invitation == nil ? "Send Invite" : "Resend Invite", systemImage: "envelope.fill")
            }
            .disabled(!isEnabled)
        }
        .padding(.vertical, 4)
    }

    private var statusText: String {
        guard let invitation else { return "Available" }
        if invitation.status == "redeemed" { return "Redeemed" }
        if invitation.status == "sent" { return "Sent" }
        return invitation.status.capitalized
    }

    private var statusColor: Color {
        guard let invitation else { return Theme.muted }
        if invitation.status == "redeemed" { return Theme.green }
        if invitation.status == "sent" { return Theme.navy }
        return Theme.muted
    }
}

struct JargonEntry: Identifiable, Hashable {
    var id: String { term }
    let term: String
    let meaning: String

    static let entries = [
        JargonEntry(term: "PT", meaning: "Physical training such as conditioning, runs, or fitness testing."),
        JargonEntry(term: "Swab Summer", meaning: "The Coast Guard Academy basic training period for incoming cadets."),
        JargonEntry(term: "Rack", meaning: "A bed. Hitting the rack means going to sleep."),
        JargonEntry(term: "Chow", meaning: "Food or mealtime."),
        JargonEntry(term: "Liberty", meaning: "Approved free time away from normal duties."),
        JargonEntry(term: "Formation", meaning: "A structured group assembly for accountability, instruction, inspection, or movement."),
        JargonEntry(term: "Bravo Zulu", meaning: "Well done."),
        JargonEntry(term: "Company", meaning: "A cadet unit or organizational group.")
    ]
}

struct CadetAvatar: View {
    var data: Data?
    var fallback: String?
    let size: CGFloat

    init(cadet: Cadet, size: CGFloat) {
        data = cadet.photoData
        fallback = cadet.name
        self.size = size
    }

    init(data: Data?, fallback: String?, size: CGFloat) {
        self.data = data
        self.fallback = fallback
        self.size = size
    }

    var initials: String {
        let parts = (fallback ?? "").split(separator: " ")
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
                Theme.navy
                Text(initials)
                    .font(.system(size: size * 0.28, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(Theme.orange, lineWidth: max(1, size * 0.025)))
    }
}

private extension Cadet {
    var initials: String {
        let parts = name.split(separator: " ")
        let letters = parts.prefix(2).compactMap(\.first)
        return letters.isEmpty ? "CC" : String(letters).uppercased()
    }
}

struct MetricTile: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title3.weight(.black))
                .foregroundStyle(.white)
            Text(label)
                .font(.caption2.weight(.bold))
                .textCase(.uppercase)
                .foregroundStyle(.white.opacity(0.75))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(.black.opacity(0.16), in: RoundedRectangle(cornerRadius: 14))
    }
}

struct DetailBadge: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.headline.weight(.black))
                .foregroundStyle(Theme.orange)
            Text(label)
                .font(.caption2.weight(.bold))
                .textCase(.uppercase)
                .foregroundStyle(Theme.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Theme.panel, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.border, lineWidth: 1))
    }
}

struct EmptyStateView: View {
    let symbol: String
    let title: String
    let message: String
    let buttonTitle: String
    let action: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: symbol)
                .font(.system(size: 44, weight: .semibold))
                .foregroundStyle(Theme.muted)
            Text(title)
                .font(.title3.weight(.black))
                .foregroundStyle(Theme.navyDark)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Theme.muted)
                .multilineTextAlignment(.center)
                .lineSpacing(3)
            Button(buttonTitle, action: action)
                .buttonStyle(PrimaryButtonStyle())
                .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .appPanel()
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.black))
            .foregroundStyle(.white)
            .padding(.vertical, 15)
            .padding(.horizontal, 18)
            .background(Theme.orange.opacity(configuration.isPressed ? 0.82 : 1), in: RoundedRectangle(cornerRadius: 16))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

extension View {
    func appPanel() -> some View {
        padding(16)
            .background(Theme.panel, in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.border, lineWidth: 1))
    }
}
