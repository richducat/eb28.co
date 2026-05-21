import Foundation
import StoreKit

enum PurchaseResultState: Equatable {
    case success
    case cancelled
    case pending
    case failed(String)
}

@MainActor
@Observable
final class PurchaseManager {
    var products: [Product] = []
    var entitledProductIDs: Set<String> = []
    var isLoading = false
    var message: String?

    @ObservationIgnored private var updatesTask: Task<Void, Never>?

    var hasUnlimited: Bool {
        entitledProductIDs.contains(AppConfig.unlimitedProductID)
    }

    var displayPrice: String {
        products.first(where: { $0.id == AppConfig.unlimitedProductID })?.displayPrice ?? "$0.99"
    }

    func configure() async {
        if updatesTask == nil {
            updatesTask = Task { [weak self] in
                for await result in Transaction.updates {
                    await self?.handle(transactionResult: result)
                }
            }
        }

        await loadProducts()
        await refreshEntitlements()
    }

    func loadProducts() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            products = try await Product.products(for: [AppConfig.unlimitedProductID])
            if products.isEmpty {
                message = "The unlimited subscription is not available yet. Confirm the product ID in App Store Connect."
            }
        } catch {
            message = "Unable to load subscription products."
        }
    }

    func purchaseUnlimited() async -> PurchaseResultState {
        if products.isEmpty {
            await loadProducts()
        }

        guard let product = products.first(where: { $0.id == AppConfig.unlimitedProductID }) else {
            let text = "The unlimited subscription is not available yet."
            message = text
            return .failed(text)
        }

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                entitledProductIDs.insert(transaction.productID)
                await transaction.finish()
                message = "Unlimited exports are active."
                return .success
            case .userCancelled:
                message = nil
                return .cancelled
            case .pending:
                message = "Purchase approval is pending."
                return .pending
            @unknown default:
                let text = "Purchase could not be completed."
                message = text
                return .failed(text)
            }
        } catch {
            let text = error.localizedDescription
            message = text
            return .failed(text)
        }
    }

    func restorePurchases() async {
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            message = hasUnlimited ? "Unlimited exports restored." : "No active unlimited subscription was found."
        } catch {
            message = "Restore failed. Please try again."
        }
    }

    func refreshEntitlements() async {
        var activeIDs = Set<String>()
        for await result in Transaction.currentEntitlements {
            guard let transaction = try? checkVerified(result) else { continue }
            activeIDs.insert(transaction.productID)
        }
        entitledProductIDs = activeIDs
    }

    private func handle(transactionResult: VerificationResult<Transaction>) async {
        guard let transaction = try? checkVerified(transactionResult) else {
            message = "The App Store could not verify that transaction."
            return
        }
        await refreshEntitlements()
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
