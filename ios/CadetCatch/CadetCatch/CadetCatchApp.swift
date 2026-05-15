import PhotosUI
import StoreKit
import SwiftUI
import UIKit
import Vision

@main
struct CadetCatchApp: App {
    @State private var store = CadetCatchStore()
    @State private var purchases = PurchaseManager()

    var body: some Scene {
        WindowGroup {
            AppFlowView()
                .environment(store)
                .environment(purchases)
                .preferredColorScheme(.light)
                .task {
                    await purchases.configure()
                }
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

    @ObservationIgnored private let storageKey = "cadetcatch.native.state.v2"
    @ObservationIgnored private let defaults = UserDefaults.standard

    init() {
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
        }
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

        lastScanMessage = "Purchase a one-time photo check or start monthly access to continue."
        persist()
        return false
    }

    func addSearchCredit() {
        searchCredits += 1
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

        Source: \(candidate.sourceHost)
        Confidence: \(candidate.confidence)%
        Reviewed: \(candidate.createdAt.formatted(date: .abbreviated, time: .shortened))
        """
        notes[key] = note
        persist()
        return note
    }

    func scanActiveCadet() async {
        guard let cadet = activeCadet else {
            lastScanMessage = "Add a cadet profile before scanning."
            return
        }

        guard !enabledSources.isEmpty else {
            lastScanMessage = "Add at least one enabled public source."
            return
        }

        let checkedSources = enabledSources
        let scanResult = await PublicPhotoScanner.scan(cadet: cadet, sources: checkedSources)
        candidates = scanResult.candidates
        lastScanMessage = scanResult.message

        let scannedAt = Date()
        for source in checkedSources {
            guard let index = sources.firstIndex(where: { $0.id == source.id }) else { continue }
            sources[index].lastCheckedAt = scannedAt
        }

        scanRecords.insert(
            ScanRecord(
                cadetName: cadet.name,
                checkedSourceCount: checkedSources.count,
                imageCount: scanResult.checkedImageCount,
                matchCount: scanResult.candidates.count,
                scannedAt: scannedAt
            ),
            at: 0
        )
        scanRecords = Array(scanRecords.prefix(20))
        selectedTab = .photos
        persist()
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
            unlockedImageURLs: unlockedImageURLs
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
}

enum CommerceProduct: String, CaseIterable, Identifiable {
    case oneTimeSearch = "co.eb28.cadetcatch.search.once"
    case photoUnlock = "co.eb28.cadetcatch.photo.unlock"
    case monthly = "co.eb28.cadetcatch.family.monthly"

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
        case .oneTimeSearch: "Run one additional public-source photo check."
        case .photoUnlock: "View, save, and share one matched photo."
        case .monthly: "Continuous photo checks and unlocked matches while active."
        }
    }

    var fallbackPrice: String {
        switch self {
        case .oneTimeSearch: "$2.00"
        case .photoUnlock: "$2.00"
        case .monthly: "$12.50/mo"
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

@MainActor
@Observable
final class PurchaseManager {
    var products: [Product] = []
    var entitledProductIDs: Set<String> = []
    var isLoadingProducts = false
    var lastMessage: String?

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
                if commerceProduct == .monthly {
                    entitledProductIDs.insert(transaction.productID)
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
        for await result in StoreKit.Transaction.currentEntitlements {
            guard let transaction = try? checkVerified(result) else { continue }
            activeIDs.insert(transaction.productID)
        }
        entitledProductIDs = activeIDs
    }

    private func handle(transactionResult: VerificationResult<StoreKit.Transaction>) async {
        guard let transaction = try? checkVerified(transactionResult) else {
            lastMessage = "A purchase could not be verified."
            return
        }

        if transaction.productID == CommerceProduct.monthly.rawValue {
            await refreshEntitlements()
        }
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
                name: "Coast Guard Academy",
                url: URL(string: "https://uscga.edu/")!,
                category: .academy
            ),
            PhotoSource(
                name: "DVIDS",
                url: URL(string: "https://www.dvidshub.net/")!,
                category: .publicAffairs
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
        case .sources: "Sources"
        case .more: "More"
        }
    }

    var symbol: String {
        switch self {
        case .home: "house.fill"
        case .photos: "photo.on.rectangle.angled"
        case .roster: "person.2.fill"
        case .sources: "link.badge.plus"
        case .more: "ellipsis.circle.fill"
        }
    }
}

enum PhotoScope: String, CaseIterable, Identifiable {
    case new = "New"
    case saved = "Saved"

    var id: String { rawValue }
}

struct ScanResult {
    var candidates: [PhotoCandidate]
    var checkedImageCount: Int
    var message: String
}

enum PublicPhotoScanner {
    static func scan(cadet: Cadet, sources: [PhotoSource]) async -> ScanResult {
        await Task.detached(priority: .userInitiated) {
            guard let reference = FaceMatcher.referencePrints(from: cadet.photoData) else {
                return ScanResult(
                    candidates: [],
                    checkedImageCount: 0,
                    message: "No face was detected in the cadet profile photo. Choose a clearer front-facing photo."
                )
            }

            var candidates: [PhotoCandidate] = []
            var checkedImages = 0
            var seenImages = Set<URL>()

            for source in sources {
                let imageURLs = await discoverImageURLs(from: source.url)
                for imageURL in imageURLs.prefix(24) {
                    guard !seenImages.contains(imageURL), candidates.count < 30 else { continue }
                    seenImages.insert(imageURL)
                    guard let imageData = await downloadImageData(from: imageURL) else { continue }
                    checkedImages += 1

                    guard let match = FaceMatcher.match(reference: reference, candidateImageData: imageData) else { continue }
                    guard match.confidence >= 62 else { continue }

                    candidates.append(
                        PhotoCandidate(
                            cadetID: cadet.id,
                            cadetName: cadet.name,
                            imageURL: imageURL,
                            confidence: match.confidence,
                            sourceName: source.name,
                            sourceHost: source.url.host() ?? source.url.absoluteString,
                            sourcePageURL: source.url,
                            detectedFaceCount: match.faceCount
                        )
                    )
                }
            }

            candidates.sort { $0.confidence > $1.confidence }
            let message: String
            if candidates.isEmpty {
                message = checkedImages == 0
                    ? "No usable public images were found in the enabled sources."
                    : "Images were checked, but no face matches passed the confidence threshold."
            } else {
                message = "\(candidates.count) possible match\(candidates.count == 1 ? "" : "es") found from public sources."
            }
            return ScanResult(candidates: candidates, checkedImageCount: checkedImages, message: message)
        }.value
    }

    private static func discoverImageURLs(from pageURL: URL) async -> [URL] {
        guard pageURL.scheme == "https" else { return [] }

        do {
            var request = URLRequest(url: pageURL)
            request.timeoutInterval = 10
            request.setValue("CadetCatch/1.0 public-source-check", forHTTPHeaderField: "User-Agent")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard
                let http = response as? HTTPURLResponse,
                200..<300 ~= http.statusCode,
                let html = String(data: data, encoding: .utf8)
            else {
                return []
            }
            return extractImageURLs(from: html, baseURL: pageURL)
        } catch {
            return []
        }
    }

    private static func downloadImageData(from url: URL) async -> Data? {
        guard url.scheme == "https" else { return nil }
        do {
            var request = URLRequest(url: url)
            request.timeoutInterval = 10
            request.setValue("CadetCatch/1.0 public-image-check", forHTTPHeaderField: "User-Agent")
            let (data, response) = try await URLSession.shared.data(for: request)
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

struct FaceMatch {
    var confidence: Int
    var faceCount: Int
}

enum FaceMatcher {
    static func referencePrints(from imageData: Data) -> [VNFeaturePrintObservation]? {
        let prints = featurePrints(in: imageData)
        return prints.isEmpty ? nil : prints
    }

    static func match(reference: [VNFeaturePrintObservation], candidateImageData: Data) -> FaceMatch? {
        let candidatePrints = featurePrints(in: candidateImageData)
        guard !candidatePrints.isEmpty else { return nil }

        var bestDistance = Float.greatestFiniteMagnitude
        for referencePrint in reference {
            for candidatePrint in candidatePrints {
                var distance = Float(0)
                do {
                    try referencePrint.computeDistance(&distance, to: candidatePrint)
                    bestDistance = min(bestDistance, distance)
                } catch {
                    continue
                }
            }
        }

        guard bestDistance.isFinite else { return nil }
        let confidence = max(0, min(99, Int((1.45 - Double(bestDistance)) * 76.0)))
        return FaceMatch(confidence: confidence, faceCount: candidatePrints.count)
    }

    private static func featurePrints(in imageData: Data) -> [VNFeaturePrintObservation] {
        guard let uiImage = UIImage(data: imageData), let cgImage = uiImage.cgImage else { return [] }

        let faceRequest = VNDetectFaceRectanglesRequest()
        let orientation = CGImagePropertyOrientation(uiImage.imageOrientation)
        let faceHandler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
        try? faceHandler.perform([faceRequest])

        let faceCrops = (faceRequest.results ?? [])
            .prefix(8)
            .compactMap { cropFace($0.boundingBox, from: cgImage) }

        let crops = faceCrops.isEmpty ? [cgImage] : faceCrops
        return crops.compactMap { featurePrint(from: $0) }
    }

    private static func featurePrint(from image: CGImage) -> VNFeaturePrintObservation? {
        let request = VNGenerateImageFeaturePrintRequest()
        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        do {
            try handler.perform([request])
            return request.results?.first as? VNFeaturePrintObservation
        } catch {
            return nil
        }
    }

    private static func cropFace(_ normalizedBox: CGRect, from image: CGImage) -> CGImage? {
        let width = CGFloat(image.width)
        let height = CGFloat(image.height)
        var rect = CGRect(
            x: normalizedBox.minX * width,
            y: (1 - normalizedBox.maxY) * height,
            width: normalizedBox.width * width,
            height: normalizedBox.height * height
        )
        let expansion = max(rect.width, rect.height) * 0.28
        rect = rect.insetBy(dx: -expansion, dy: -expansion)
        rect = rect.intersection(CGRect(x: 0, y: 0, width: width, height: height))
        guard rect.width > 24, rect.height > 24 else { return nil }
        return image.cropping(to: rect)
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
            ZStack(alignment: .bottomLeading) {
                Image("EagleLaunch")
                    .resizable()
                    .scaledToFill()
                    .frame(width: proxy.size.width, height: proxy.size.height)
                    .clipped()
                    .overlay {
                        LinearGradient(
                            colors: [
                                Theme.navyDark.opacity(0.18),
                                Theme.navyDark.opacity(0.60),
                                Theme.navyDark.opacity(0.96)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    }

                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("CadetCatch")
                            .font(.system(size: 34, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                        Text("Coast Guard Academy photo review")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.white.opacity(0.78))
                    }
                    .padding(.top, 42)

                    Spacer()

                    VStack(alignment: .leading, spacing: 14) {
                        Text("USCGC EAGLE")
                            .font(.caption.weight(.black))
                            .textCase(.uppercase)
                            .tracking(1.3)
                            .foregroundStyle(Theme.orange)
                        Text("Find cadet photos faster.")
                            .font(.system(size: 46, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(3)
                            .minimumScaleFactor(0.76)
                            .fixedSize(horizontal: false, vertical: true)
                        Text("Add a cadet profile, choose approved public sources, and review possible matches before anything is saved.")
                            .font(.body.weight(.medium))
                            .foregroundStyle(.white.opacity(0.82))
                            .lineLimit(4)
                            .lineSpacing(3)
                    }

                    VStack(spacing: 12) {
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
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 15)
                                .background(.black.opacity(0.58), in: RoundedRectangle(cornerRadius: 16))
                        }
                    }
                    .padding(.bottom, 20)
                }
                .frame(width: max(0, proxy.size.width - 48), height: proxy.size.height, alignment: .leading)
                .padding(.horizontal, 24)
            }
            .ignoresSafeArea()
        }
        .background(Theme.navyDark.ignoresSafeArea())
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

struct HomeView: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    @State private var isScanning = false
    @State private var scanProgress = 0.0
    @State private var showingPurchaseOptions = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                HeaderPanel()

                if store.cadets.isEmpty {
                    EmptyStateView(
                        symbol: "person.crop.circle.badge.plus",
                        title: "Add a cadet",
                        message: "A clear profile photo is required before CadetCatch can compare faces in public source images.",
                        buttonTitle: "Open Roster"
                    ) {
                        store.selectedTab = .roster
                    }
                } else {
                    ActiveCadetCard()
                    SourceSummaryCard()
                    ScanCard(isScanning: isScanning, scanProgress: scanProgress) {
                        Task { await runScan() }
                    } onShowPurchaseOptions: {
                        showingPurchaseOptions = true
                    }
                    RecentScansCard()
                }
            }
            .padding(16)
        }
        .background(Theme.background)
        .sheet(isPresented: $showingPurchaseOptions) {
            PurchaseOptionsSheet()
                .presentationDetents([.medium, .large])
        }
    }

    private func runScan() async {
        guard !isScanning else { return }
        guard store.activeCadet != nil else {
            store.lastScanMessage = "Add a cadet profile before checking photos."
            return
        }
        guard !store.enabledSources.isEmpty else {
            store.lastScanMessage = "Add at least one enabled public source."
            return
        }
        guard store.beginSearch(hasMonthlyAccess: purchases.hasMonthlyAccess) else {
            showingPurchaseOptions = true
            return
        }
        isScanning = true
        scanProgress = 0
        for step in 1...14 {
            try? await Task.sleep(for: .milliseconds(65))
            scanProgress = Double(step) / 14.0
        }
        await store.scanActiveCadet()
        isScanning = false
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
                MetricTile(value: "\(store.sources.count)", label: "Sources")
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
                Text("Public sources")
                    .font(.headline.weight(.black))
                    .foregroundStyle(Theme.navyDark)
                Spacer()
                Button("Manage") {
                    store.selectedTab = .sources
                }
                .font(.caption.weight(.black))
                .buttonStyle(.bordered)
                .tint(Theme.navy)
            }

            ForEach(store.enabledSources.prefix(3)) { source in
                HStack(spacing: 10) {
                    Image(systemName: source.category.symbol)
                        .foregroundStyle(Theme.orange)
                        .frame(width: 30, height: 30)
                        .background(Theme.orange.opacity(0.12), in: Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(source.name)
                            .font(.subheadline.weight(.bold))
                            .foregroundStyle(Theme.navyDark)
                        Text(source.url.host() ?? source.url.absoluteString)
                            .font(.caption)
                            .foregroundStyle(Theme.muted)
                    }
                    Spacer()
                }
            }
        }
        .appPanel()
    }
}

struct ScanCard: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    let isScanning: Bool
    let scanProgress: Double
    let onScan: () -> Void
    let onShowPurchaseOptions: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Photo check")
                        .font(.headline.weight(.black))
                        .foregroundStyle(Theme.navyDark)
                    Text("Compare the selected cadet photo against images found in enabled public sources.")
                        .font(.caption)
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(2)
                }
                Spacer()
            }

            HStack(spacing: 8) {
                Image(systemName: purchases.hasMonthlyAccess ? "checkmark.seal.fill" : "creditcard.fill")
                    .foregroundStyle(purchases.hasMonthlyAccess ? Theme.green : Theme.orange)
                Text(store.searchAccessLabel(hasMonthlyAccess: purchases.hasMonthlyAccess))
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Theme.navyDark)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Theme.background, in: RoundedRectangle(cornerRadius: 14))

            if isScanning {
                ProgressView(value: scanProgress)
                    .tint(Theme.orange)
                Text("Checking source images...")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Theme.muted)
            }

            if let message = store.lastScanMessage {
                Text(message)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(2)
            }

            Button(action: onScan) {
                Label(isScanning ? "Checking Sources" : scanButtonTitle, systemImage: scanButtonSymbol)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(isScanning)

            if !purchases.hasMonthlyAccess {
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
    }

    private var scanButtonTitle: String {
        store.canStartSearch(hasMonthlyAccess: purchases.hasMonthlyAccess) ? "Check Photos" : "Buy Photo Check"
    }

    private var scanButtonSymbol: String {
        store.canStartSearch(hasMonthlyAccess: purchases.hasMonthlyAccess) ? "face.dashed" : "lock.open.fill"
    }
}

struct RecentScansCard: View {
    @Environment(CadetCatchStore.self) private var store

    var body: some View {
        if !store.scanRecords.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("Recent checks")
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
                            Text("\(record.imageCount) images")
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
                        Link("Privacy", destination: URL(string: "https://eb28.co/cc/privacy/")!)
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
                    message: scope == .new ? "Run a photo check from Home after adding a cadet and enabling sources." : "Save reviewed photos to keep them here.",
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
    }
}

struct CandidateCard: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    let candidate: PhotoCandidate

    var body: some View {
        let unlocked = store.isUnlocked(candidate, hasMonthlyAccess: purchases.hasMonthlyAccess)

        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                CandidateImage(url: candidate.imageURL, mode: .fill)
                    .frame(height: 144)
                    .blur(radius: unlocked ? 0 : 9)
                    .clipped()

                Text("\(candidate.confidence)%")
                    .font(.caption.weight(.black))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 6)
                    .background(Theme.orange, in: Capsule())
                    .padding(8)

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
}

struct CandidateDetailView: View {
    @Environment(CadetCatchStore.self) private var store
    @Environment(PurchaseManager.self) private var purchases
    let candidate: PhotoCandidate
    @State private var draft: String?
    @State private var isUnlocking = false
    @State private var isSubscribing = false

    var body: some View {
        let unlocked = store.isUnlocked(candidate, hasMonthlyAccess: purchases.hasMonthlyAccess)

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

                    HStack(spacing: 10) {
                        DetailBadge(value: "\(candidate.confidence)%", label: "Confidence")
                        DetailBadge(value: "\(candidate.detectedFaceCount)", label: "Faces")
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text(candidate.sourceName)
                            .font(.title3.weight(.black))
                            .foregroundStyle(Theme.navyDark)
                        Text(candidate.sourceHost)
                            .font(.subheadline)
                            .foregroundStyle(Theme.muted)
                        if unlocked {
                            Link("Open source image", destination: candidate.imageURL)
                                .font(.subheadline.weight(.bold))
                        } else {
                            Text("Unlock this photo or start monthly access to view and save the image.")
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
}

struct CandidateImage: View {
    let url: URL
    let mode: ContentMode

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image.resizable().aspectRatio(contentMode: mode)
            case .empty:
                ZStack {
                    Rectangle().fill(Theme.border.opacity(0.45))
                    ProgressView().tint(Theme.orange)
                }
            case .failure:
                ZStack {
                    Rectangle().fill(Theme.border.opacity(0.45))
                    Image(systemName: "photo")
                        .foregroundStyle(Theme.muted)
                }
            @unknown default:
                Rectangle().fill(Theme.border.opacity(0.45))
            }
        }
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
                        message: "Add a cadet with a clear profile photo. The photo stays local on this device and is used for public-source comparison.",
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
                            Text("Use a clear face photo for best results.")
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

                Section {
                    Button {
                        guard let photoData else { return }
                        store.addCadet(
                            name: name,
                            unit: unit,
                            relation: relation.isEmpty ? "Family" : relation,
                            photoData: photoData
                        )
                        dismiss()
                    } label: {
                        Label("Save Cadet", systemImage: "checkmark.circle.fill")
                    }
                    .disabled(!canSave)
                }
            }
            .navigationTitle("Add Cadet")
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

struct SourcesView: View {
    @Environment(CadetCatchStore.self) private var store
    @State private var sourceName = ""
    @State private var sourceURL = ""
    @State private var category: SourceCategory = .custom
    @State private var validationMessage: String?

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Label("Public HTTPS sources only", systemImage: "lock.shield.fill")
                        .font(.headline.weight(.black))
                        .foregroundStyle(Theme.navyDark)
                    Text("CadetCatch checks public pages you approve. Private social or photo accounts require an owner-authorized connector before they can be scanned.")
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                }
                .padding(.vertical, 4)
            }

            Section("Add Source") {
                TextField("Source name", text: $sourceName)
                TextField("https://example.edu/gallery", text: $sourceURL)
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
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
                        validationMessage = "Enter a unique HTTPS URL and a source name."
                    }
                } label: {
                    Label("Add Source", systemImage: "plus.circle.fill")
                }
                if let validationMessage {
                    Text(validationMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            Section("Enabled Sources") {
                ForEach(store.sources) { source in
                    SourceRow(source: source)
                }
                .onDelete { offsets in
                    for index in offsets {
                        store.removeSource(store.sources[index])
                    }
                }
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
    @State private var query = ""
    @State private var showingResetAlert = false
    @State private var showingPurchaseOptions = false
    @State private var isRestoring = false

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
        List {
            Section("Photo Access") {
                HStack {
                    Label("Monthly Access", systemImage: purchases.hasMonthlyAccess ? "checkmark.seal.fill" : "lock.fill")
                    Spacer()
                    Text(purchases.hasMonthlyAccess ? "Active" : "Not Active")
                        .font(.caption.weight(.black))
                        .foregroundStyle(purchases.hasMonthlyAccess ? Theme.green : Theme.muted)
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
                Link(destination: URL(string: "https://eb28.co/cc/privacy/")!) {
                    Label("Privacy Policy", systemImage: "lock.shield")
                }
                Link(destination: URL(string: "https://eb28.co/cc/support/")!) {
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
            Text("This removes cadets, saved photos, source settings, and scan history from this device.")
        }
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
