import Capacitor
import Foundation
import StoreKit
import SwiftUI

private enum WakeUpPurchasesError: LocalizedError {
    case missingProductId
    case productNotFound(String)
    case purchaseVerificationFailed(String)
    case unsupportedPurchaseResult
    case storefrontAlreadyPresented
    case bridgeUnavailable

    var errorDescription: String? {
        switch self {
        case .missingProductId:
            return "Missing productId."
        case .productNotFound(let productId):
            return "Unable to find App Store product \(productId)."
        case .purchaseVerificationFailed(let message):
            return "Purchase verification failed: \(message)"
        case .unsupportedPurchaseResult:
            return "The App Store returned an unsupported purchase result."
        case .storefrontAlreadyPresented:
            return "The App Store purchase sheet is already open."
        case .bridgeUnavailable:
            return "Unable to present the App Store purchase sheet right now."
        }
    }
}

private final class WakeUpStoreSheetDelegate: NSObject, UIAdaptivePresentationControllerDelegate {
    private let onDismiss: () -> Void

    init(onDismiss: @escaping () -> Void) {
        self.onDismiss = onDismiss
    }

    func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        onDismiss()
    }
}

@available(iOS 17.0, *)
private struct WakeUpSubscriptionStoreSheet: View {
    let productIds: [String]
    let onDone: () -> Void

    var body: some View {
        NavigationStack {
            SubscriptionStoreView(productIDs: productIds)
                .subscriptionStoreButtonLabel(.multiline)
                .navigationTitle("Remove Ads")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Done", action: onDone)
                    }
                }
        }
    }
}

@objc(WakeUpPurchasesPlugin)
public class WakeUpPurchasesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WakeUpPurchasesPlugin"
    public let jsName = "WakeUpPurchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "canMakePayments", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSubscriptionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchaseSubscription", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]

    private let dateFormatter = ISO8601DateFormatter()
    private let productLookupRetryNanoseconds: [UInt64] = [
        0,
        1_000_000_000,
        2_000_000_000,
        4_000_000_000
    ]
    private var storefrontCall: CAPPluginCall?
    private var storefrontController: UIViewController?
    private var storefrontProductId: String?
    private var storefrontPresentationDelegate: WakeUpStoreSheetDelegate?

    @objc public func canMakePayments(_ call: CAPPluginCall) {
        call.resolve([
            "canMakePayments": SKPaymentQueue.canMakePayments()
        ])
    }

    @objc public func getProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let productIds = try extractProductIds(call)
                let products = try await loadProducts(productIds: productIds)
                call.resolve([
                    "available": !products.isEmpty,
                    "canMakePayments": SKPaymentQueue.canMakePayments(),
                    "products": products.map(productPayload)
                ])
            } catch WakeUpPurchasesError.productNotFound {
                call.resolve([
                    "available": false,
                    "canMakePayments": SKPaymentQueue.canMakePayments(),
                    "products": []
                ])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc public func getSubscriptionStatus(_ call: CAPPluginCall) {
        Task {
            do {
                let productId = try extractProductId(call)
                let product = await optionalProduct(productId: productId)
                let entitlement = try await currentEntitlement(for: productId)
                var payload = statusPayload(productId: productId, product: product, entitlement: entitlement)
                payload["available"] = true
                payload["canMakePayments"] = SKPaymentQueue.canMakePayments()
                payload["source"] = "status"
                payload["productMissing"] = product == nil
                call.resolve(payload)
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc public func purchaseSubscription(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let productId = try extractProductId(call)

                if #available(iOS 17.0, *) {
                    try presentSubscriptionStore(call: call, productIds: [productId], productId: productId)
                    return
                }

                Task {
                    await self.performDirectPurchase(call: call, productId: productId)
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    @objc public func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                let productId = try extractProductId(call)
                try await AppStore.sync()
                let product = await optionalProduct(productId: productId)
                let entitlement = try await currentEntitlement(for: productId)
                var payload = statusPayload(productId: productId, product: product, entitlement: entitlement)
                payload["available"] = true
                payload["canMakePayments"] = SKPaymentQueue.canMakePayments()
                payload["restored"] = true
                payload["source"] = "restore"
                call.resolve(payload)
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    private func extractProductIds(_ call: CAPPluginCall) throws -> [String] {
        if let ids = call.getArray("productIds", String.self), !ids.isEmpty {
            return ids
        }
        return [try extractProductId(call)]
    }

    private func extractProductId(_ call: CAPPluginCall) throws -> String {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            throw WakeUpPurchasesError.missingProductId
        }
        return productId
    }

    private func loadProducts(productIds: [String]) async throws -> [Product] {
        let requestedIds = Array(Set(productIds)).sorted()

        guard !requestedIds.isEmpty else {
            return []
        }

        for (index, delay) in productLookupRetryNanoseconds.enumerated() {
            if delay > 0 {
                try await Task.sleep(nanoseconds: delay)
            }

            let products = try await Product.products(for: requestedIds).sorted(by: { $0.id < $1.id })
            let matchingProducts = products.filter { requestedIds.contains($0.id) }

            if !matchingProducts.isEmpty {
                return matchingProducts
            }

            if index < productLookupRetryNanoseconds.count - 1 {
                try? await AppStore.sync()
            }
        }

        if requestedIds.count == 1, let productId = requestedIds.first {
            throw WakeUpPurchasesError.productNotFound(productId)
        }

        throw WakeUpPurchasesError.productNotFound(requestedIds.joined(separator: ", "))
    }

    private func loadProduct(productId: String) async throws -> Product {
        guard let product = try await loadProducts(productIds: [productId]).first else {
            throw WakeUpPurchasesError.productNotFound(productId)
        }

        return product
    }

    private func optionalProduct(productId: String) async -> Product? {
        do {
            return try await loadProduct(productId: productId)
        } catch {
            return nil
        }
    }

    private func performDirectPurchase(call: CAPPluginCall, productId: String) async {
        do {
            let product = try await loadProduct(productId: productId)
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                let transaction = try verified(verification)
                await transaction.finish()
                var payload = statusPayload(productId: productId, product: product, entitlement: transaction)
                payload["available"] = true
                payload["canMakePayments"] = SKPaymentQueue.canMakePayments()
                payload["source"] = "purchase"
                call.resolve(payload)
            case .pending:
                var payload = statusPayload(productId: productId, product: product, entitlement: nil)
                payload["available"] = true
                payload["canMakePayments"] = SKPaymentQueue.canMakePayments()
                payload["pending"] = true
                payload["source"] = "purchase"
                call.resolve(payload)
            case .userCancelled:
                var payload = statusPayload(productId: productId, product: product, entitlement: try await currentEntitlement(for: productId))
                payload["available"] = true
                payload["canMakePayments"] = SKPaymentQueue.canMakePayments()
                payload["cancelled"] = true
                payload["source"] = "purchase"
                call.resolve(payload)
            @unknown default:
                throw WakeUpPurchasesError.unsupportedPurchaseResult
            }
        } catch {
            call.reject(error.localizedDescription)
        }
    }

    @available(iOS 17.0, *)
    @MainActor
    private func presentSubscriptionStore(call: CAPPluginCall, productIds: [String], productId: String) throws {
        guard storefrontCall == nil else {
            throw WakeUpPurchasesError.storefrontAlreadyPresented
        }

        guard let bridgeViewController = bridge?.viewController else {
            throw WakeUpPurchasesError.bridgeUnavailable
        }

        storefrontCall = call
        storefrontProductId = productId

        let sheetView = WakeUpSubscriptionStoreSheet(productIds: productIds) { [weak self] in
            self?.dismissPresentedSubscriptionStore()
        }
        let hostingController = UIHostingController(rootView: sheetView)
        let navigationController = UINavigationController(rootViewController: hostingController)
        navigationController.modalPresentationStyle = .formSheet

        let presentationDelegate = WakeUpStoreSheetDelegate { [weak self] in
            self?.finishPresentedSubscriptionStore()
        }
        navigationController.presentationController?.delegate = presentationDelegate

        storefrontController = navigationController
        storefrontPresentationDelegate = presentationDelegate

        bridgeViewController.present(navigationController, animated: true)
    }

    private func dismissPresentedSubscriptionStore() {
        storefrontController?.dismiss(animated: true) { [weak self] in
            self?.finishPresentedSubscriptionStore()
        }
    }

    private func finishPresentedSubscriptionStore() {
        guard let call = storefrontCall, let productId = storefrontProductId else {
            storefrontController = nil
            storefrontPresentationDelegate = nil
            return
        }

        storefrontCall = nil
        storefrontController = nil
        storefrontProductId = nil
        storefrontPresentationDelegate = nil

        Task {
            do {
                let product = await optionalProduct(productId: productId)
                let entitlement = try await currentEntitlement(for: productId)
                var payload = statusPayload(productId: productId, product: product, entitlement: entitlement)
                payload["available"] = true
                payload["canMakePayments"] = SKPaymentQueue.canMakePayments()
                payload["source"] = "storefront"
                payload["cancelled"] = entitlement == nil
                call.resolve(payload)
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    private func currentEntitlement(for productId: String) async throws -> StoreKit.Transaction? {
        for await verification in StoreKit.Transaction.currentEntitlements {
            let transaction = try verified(verification)

            guard transaction.productID == productId else {
                continue
            }

            guard transaction.revocationDate == nil else {
                continue
            }

            guard !transaction.isUpgraded else {
                continue
            }

            if let expirationDate = transaction.expirationDate, expirationDate <= Date() {
                continue
            }

            return transaction
        }

        return nil
    }

    private func verified<T>(_ verification: VerificationResult<T>) throws -> T {
        switch verification {
        case .verified(let safe):
            return safe
        case .unverified(_, let error):
            throw WakeUpPurchasesError.purchaseVerificationFailed(error.localizedDescription)
        }
    }

    private func statusPayload(productId: String, product: Product?, entitlement: StoreKit.Transaction?) -> JSObject {
        var payload: JSObject = [
            "productId": productId,
            "isSubscribed": entitlement != nil,
            "displayName": product?.displayName ?? "Remove Ads",
            "description": product?.description ?? "Hide sponsored panels and keep the alarm dashboard clean.",
            "displayPrice": product?.displayPrice ?? "$0.99"
        ]

        if let product = product {
            payload["productType"] = product.type.rawValue

            if let subscription = product.subscription {
                payload["subscriptionPeriodValue"] = subscription.subscriptionPeriod.value
                payload["subscriptionPeriodUnit"] = subscriptionUnitName(subscription.subscriptionPeriod.unit)
            }
        } else {
            payload["subscriptionPeriodValue"] = 1
            payload["subscriptionPeriodUnit"] = "month"
        }

        if let entitlement = entitlement {
            payload["purchaseDate"] = isoDate(entitlement.purchaseDate)
            payload["expirationDate"] = isoDate(entitlement.expirationDate)
            payload["revocationDate"] = isoDate(entitlement.revocationDate)
        }

        return payload
    }

    private func productPayload(product: Product) -> JSObject {
        var payload: JSObject = [
            "productId": product.id,
            "displayName": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice,
            "productType": product.type.rawValue
        ]

        if let subscription = product.subscription {
            payload["subscriptionPeriodValue"] = subscription.subscriptionPeriod.value
            payload["subscriptionPeriodUnit"] = subscriptionUnitName(subscription.subscriptionPeriod.unit)
        }

        return payload
    }

    private func subscriptionUnitName(_ unit: Product.SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day:
            return "day"
        case .week:
            return "week"
        case .month:
            return "month"
        case .year:
            return "year"
        @unknown default:
            return "month"
        }
    }

    private func isoDate(_ date: Date?) -> String? {
        guard let date = date else {
            return nil
        }
        return dateFormatter.string(from: date)
    }
}
