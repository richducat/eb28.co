import Foundation

@MainActor
@Observable
final class AuthorityStore {
    var selectedTab: AuthorityTab
    var recProfile: RecProfile
    var purchaseEntries: [PurchaseEntry]
    var savedRetailerIDs: Set<String>
    var savedProductIDs: Set<String>
    var selectedStateID: String
    var hasUnlockedRecVault: Bool

    @ObservationIgnored private let storageKey = "weedauthority.local.state.v1"
    @ObservationIgnored private let defaults = UserDefaults.standard

    init() {
        if
            let data = defaults.data(forKey: storageKey),
            let state = try? JSONDecoder.authority.decode(PersistedState.self, from: data)
        {
            selectedTab = state.selectedTab
            recProfile = state.recProfile
            purchaseEntries = state.purchaseEntries
            savedRetailerIDs = state.savedRetailerIDs
            savedProductIDs = state.savedProductIDs
            selectedStateID = state.selectedStateID
            hasUnlockedRecVault = false
        } else {
            selectedTab = .explore
            recProfile = RecProfile()
            purchaseEntries = [
                PurchaseEntry(productName: "Blue Citrus Gelato", amount: 3.5, unit: .gramsFlower, purchasedAt: Calendar.current.date(byAdding: .day, value: -2, to: .now) ?? .now, retailerName: "Greenline Reserve")
            ]
            savedRetailerIDs = ["ca-greenline"]
            savedProductIDs = ["blue-citrus"]
            selectedStateID = "CA"
            hasUnlockedRecVault = false
            persist()
        }
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
        guard amount > 0 else { return }
        purchaseEntries.insert(
            PurchaseEntry(
                productName: trimmedProduct.isEmpty ? "Cannabis purchase" : trimmedProduct,
                amount: amount,
                unit: unit,
                purchasedAt: .now,
                retailerName: trimmedRetailer.isEmpty ? "Retailer" : trimmedRetailer
            ),
            at: 0
        )
        persist()
    }

    func deletePurchase(_ entry: PurchaseEntry) {
        purchaseEntries.removeAll { $0.id == entry.id }
        persist()
    }

    func resetLocalData() {
        selectedTab = .explore
        recProfile = RecProfile()
        purchaseEntries = []
        savedRetailerIDs = []
        savedProductIDs = []
        selectedStateID = "CA"
        hasUnlockedRecVault = false
        persist()
    }

    func usage(for unit: PurchaseUnit, in state: StateProgram) -> Double {
        let startDate = Calendar.current.date(byAdding: .day, value: -state.defaultWindowDays, to: .now) ?? .now
        return purchaseEntries
            .filter { $0.unit == unit && $0.purchasedAt >= startDate }
            .reduce(0) { $0 + $1.amount }
    }

    func remainingFlowerGrams(in state: StateProgram) -> Double? {
        guard let limit = state.flowerLimitGrams else { return nil }
        let flowerGrams = usage(for: .gramsFlower, in: state) + (usage(for: .ouncesFlower, in: state) * 28.3495)
        return max(0, limit - flowerGrams)
    }

    func remainingConcentrateGrams(in state: StateProgram) -> Double? {
        guard let limit = state.concentrateLimitGrams else { return nil }
        return max(0, limit - usage(for: .gramsConcentrate, in: state))
    }

    func persist() {
        let state = PersistedState(
            selectedTab: selectedTab,
            recProfile: recProfile,
            purchaseEntries: purchaseEntries,
            savedRetailerIDs: savedRetailerIDs,
            savedProductIDs: savedProductIDs,
            selectedStateID: selectedStateID
        )

        if let data = try? JSONEncoder.authority.encode(state) {
            defaults.set(data, forKey: storageKey)
        }
    }
}

private struct PersistedState: Codable {
    let selectedTab: AuthorityTab
    let recProfile: RecProfile
    let purchaseEntries: [PurchaseEntry]
    let savedRetailerIDs: Set<String>
    let savedProductIDs: Set<String>
    let selectedStateID: String
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
