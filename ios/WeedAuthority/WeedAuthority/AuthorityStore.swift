import Foundation

@MainActor
@Observable
final class AuthorityStore {
    var selectedTab: AuthorityTab
    var recProfile: RecProfile {
        didSet {
            guard !suppressPersistence else { return }
            if selectedStateID != recProfile.stateId {
                selectedStateID = recProfile.stateId
            }
            persist()
        }
    }
    var purchaseEntries: [PurchaseEntry]
    var savedRetailerIDs: Set<String>
    var savedProductIDs: Set<String>
    var selectedStateID: String {
        didSet {
            guard !suppressPersistence else { return }
            if recProfile.stateId != selectedStateID {
                recProfile.stateId = selectedStateID
            }
            persist()
        }
    }
    var allotmentSnapshots: [String: AllotmentSnapshot]
    var hasUnlockedRecVault: Bool
    private(set) var storageErrorMessage: String?

    @ObservationIgnored private let legacyStorageKey = "weedauthority.local.state.v1"
    @ObservationIgnored private let defaults = UserDefaults.standard
    @ObservationIgnored private var suppressPersistence = false
    @ObservationIgnored private var storageWriteBlocked = false

    init() {
        selectedTab = .explore
        recProfile = RecProfile()
        purchaseEntries = []
        savedRetailerIDs = []
        savedProductIDs = []
        selectedStateID = "CA"
        allotmentSnapshots = [:]
        hasUnlockedRecVault = false
        storageErrorMessage = nil

        do {
            if let secureData = try SecureStateStore.load() {
                guard let state = try? JSONDecoder.authority.decode(PersistedState.self, from: secureData) else {
                    storageWriteBlocked = true
                    storageErrorMessage = "Your encrypted local data could not be read. It was left untouched."
                    applyLaunchTabPreference()
                    return
                }
                apply(state, migratingLegacyPurchases: false)
            } else if let legacyData = defaults.data(forKey: legacyStorageKey) {
                guard let state = try? JSONDecoder.authority.decode(PersistedState.self, from: legacyData) else {
                    storageWriteBlocked = true
                    storageErrorMessage = "Older local data could not be migrated. It was left untouched."
                    applyLaunchTabPreference()
                    return
                }
                apply(state, migratingLegacyPurchases: true)
                try writeSecureState()
                defaults.removeObject(forKey: legacyStorageKey)
            } else {
                try writeSecureState()
            }
        } catch {
            storageWriteBlocked = true
            storageErrorMessage = error.localizedDescription
        }

        applyLaunchTabPreference()
    }

    var selectedState: StateProgram {
        AuthorityContent.states.first(where: { $0.id == selectedStateID }) ?? AuthorityContent.states[0]
    }

    var recState: StateProgram {
        AuthorityContent.states.first(where: { $0.id == recProfile.stateId }) ?? selectedState
    }

    var savedRetailers: [Retailer] {
        AuthorityContent.retailers.filter { savedRetailerIDs.contains($0.id) }
    }

    var savedProducts: [Product] {
        AuthorityContent.products.filter { savedProductIDs.contains($0.id) }
    }

    func toggleRetailer(_ retailer: Retailer) {
        if savedRetailerIDs.contains(retailer.id) {
            savedRetailerIDs.remove(retailer.id)
        } else {
            savedRetailerIDs.insert(retailer.id)
        }
        persist()
    }

    func toggleProduct(_ product: Product) {
        if savedProductIDs.contains(product.id) {
            savedProductIDs.remove(product.id)
        } else {
            savedProductIDs.insert(product.id)
        }
        persist()
    }

    func updateRecProfile(_ profile: RecProfile) {
        recProfile = profile
        selectedStateID = profile.stateId
        persist()
    }

    func addPurchase(productName: String, amount: Double, unit: PurchaseUnit, retailerName: String) {
        let trimmedProduct = productName.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedRetailer = retailerName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard amount > 0, amount.isFinite else { return }
        purchaseEntries.insert(
            PurchaseEntry(
                productName: trimmedProduct.isEmpty ? "Cannabis purchase" : trimmedProduct,
                amount: amount,
                unit: unit,
                purchasedAt: .now,
                retailerName: trimmedRetailer.isEmpty ? "Retailer" : trimmedRetailer,
                stateID: recState.id
            ),
            at: 0
        )
        invalidateAllotment(for: recState.id)
        persist()
    }

    func deletePurchase(_ entry: PurchaseEntry) {
        purchaseEntries.removeAll { $0.id == entry.id }
        persist()
    }

    func usage(for unit: PurchaseUnit, in state: StateProgram) -> Double {
        let windowDays = state.id == "FL" && (unit == .gramsFlower || unit == .ouncesFlower)
            ? 35
            : state.defaultWindowDays
        let startDate = Calendar.current.date(byAdding: .day, value: -windowDays, to: .now) ?? .now
        return purchaseEntries
            .filter { $0.stateID == state.id && $0.unit == unit && $0.purchasedAt >= startDate }
            .reduce(0) { $0 + $1.amount }
    }

    func allotmentSnapshot(for stateID: String) -> AllotmentSnapshot? {
        allotmentSnapshots[stateID]
    }

    func saveConfirmedAllotment(_ snapshot: AllotmentSnapshot) {
        guard
            snapshot.userConfirmedAt != nil,
            !snapshot.measurements.isEmpty,
            AuthorityContent.states.contains(where: { $0.id == snapshot.stateID })
        else {
            return
        }
        allotmentSnapshots[snapshot.stateID] = snapshot
        persist()
    }

    func invalidateAllotment(for stateID: String) {
        guard var snapshot = allotmentSnapshots[stateID] else { return }
        snapshot.invalidate(at: .now)
        allotmentSnapshots[stateID] = snapshot
        persist()
    }

    func removeAllotment(for stateID: String) {
        allotmentSnapshots.removeValue(forKey: stateID)
        persist()
    }

    func lockRecVault() {
        hasUnlockedRecVault = false
    }

    func resetLocalData() {
        suppressPersistence = true
        selectedTab = .explore
        recProfile = RecProfile()
        purchaseEntries = []
        savedRetailerIDs = []
        savedProductIDs = []
        selectedStateID = "CA"
        allotmentSnapshots = [:]
        hasUnlockedRecVault = false
        suppressPersistence = false

        do {
            try SecureStateStore.delete()
            defaults.removeObject(forKey: legacyStorageKey)
            storageWriteBlocked = false
            storageErrorMessage = nil
        } catch {
            storageErrorMessage = "Local fields were cleared, but the encrypted storage item could not be deleted."
        }
    }

    func persist() {
        guard !suppressPersistence, !storageWriteBlocked else { return }
        do {
            try writeSecureState()
            storageErrorMessage = nil
        } catch {
            storageErrorMessage = error.localizedDescription
        }
    }

    private func writeSecureState() throws {
        let state = PersistedState(
            selectedTab: selectedTab,
            recProfile: recProfile,
            purchaseEntries: purchaseEntries,
            savedRetailerIDs: savedRetailerIDs,
            savedProductIDs: savedProductIDs,
            selectedStateID: selectedStateID,
            allotmentSnapshots: allotmentSnapshots
        )
        try SecureStateStore.save(JSONEncoder.authority.encode(state))
    }

    private func apply(_ state: PersistedState, migratingLegacyPurchases: Bool) {
        suppressPersistence = true
        selectedTab = state.selectedTab
        recProfile = state.recProfile
        selectedStateID = state.selectedStateID
        purchaseEntries = state.purchaseEntries.compactMap { entry in
            if migratingLegacyPurchases && entry.isKnownBundledSample {
                return nil
            }
            var migrated = entry
            if migrated.stateID == nil {
                migrated.stateID = state.selectedStateID
            }
            return migrated
        }
        savedRetailerIDs = state.savedRetailerIDs
        savedProductIDs = state.savedProductIDs
        allotmentSnapshots = state.allotmentSnapshots
        suppressPersistence = false
    }

    private func applyLaunchTabPreference() {
        guard
            let launchTab = defaults.string(forKey: "launchTab"),
            let tab = AuthorityTab(rawValue: launchTab)
        else {
            return
        }
        selectedTab = tab
    }
}

private struct PersistedState: Codable {
    let selectedTab: AuthorityTab
    let recProfile: RecProfile
    let purchaseEntries: [PurchaseEntry]
    let savedRetailerIDs: Set<String>
    let savedProductIDs: Set<String>
    let selectedStateID: String
    let allotmentSnapshots: [String: AllotmentSnapshot]

    private enum CodingKeys: String, CodingKey {
        case selectedTab
        case recProfile
        case purchaseEntries
        case savedRetailerIDs
        case savedProductIDs
        case selectedStateID
        case allotmentSnapshots
    }

    init(
        selectedTab: AuthorityTab,
        recProfile: RecProfile,
        purchaseEntries: [PurchaseEntry],
        savedRetailerIDs: Set<String>,
        savedProductIDs: Set<String>,
        selectedStateID: String,
        allotmentSnapshots: [String: AllotmentSnapshot]
    ) {
        self.selectedTab = selectedTab
        self.recProfile = recProfile
        self.purchaseEntries = purchaseEntries
        self.savedRetailerIDs = savedRetailerIDs
        self.savedProductIDs = savedProductIDs
        self.selectedStateID = selectedStateID
        self.allotmentSnapshots = allotmentSnapshots
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        selectedTab = try container.decodeIfPresent(AuthorityTab.self, forKey: .selectedTab) ?? .explore
        recProfile = try container.decodeIfPresent(RecProfile.self, forKey: .recProfile) ?? RecProfile()
        purchaseEntries = try container.decodeIfPresent([PurchaseEntry].self, forKey: .purchaseEntries) ?? []
        savedRetailerIDs = try container.decodeIfPresent(Set<String>.self, forKey: .savedRetailerIDs) ?? []
        savedProductIDs = try container.decodeIfPresent(Set<String>.self, forKey: .savedProductIDs) ?? []
        selectedStateID = try container.decodeIfPresent(String.self, forKey: .selectedStateID) ?? recProfile.stateId
        allotmentSnapshots = try container.decodeIfPresent([String: AllotmentSnapshot].self, forKey: .allotmentSnapshots) ?? [:]
    }
}

private extension PurchaseEntry {
    var isKnownBundledSample: Bool {
        productName == "Blue Citrus Gelato"
            && retailerName == "Greenline Reserve"
            && amount == 3.5
            && unit == .gramsFlower
    }
}

extension JSONEncoder {
    static var authority: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

extension JSONDecoder {
    static var authority: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
