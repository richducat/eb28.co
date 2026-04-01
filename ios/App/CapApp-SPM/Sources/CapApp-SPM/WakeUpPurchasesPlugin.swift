import Capacitor
import Foundation
import StoreKit

private enum WakeUpPurchasesError: LocalizedError {
    case missingProductId
    case productNotFound(String)
    case purchaseVerificationFailed(String)
    case unsupportedPurchaseResult

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

    @objc public func canMakePayments(_ call: CAPPluginCall) {
        call.resolve([
            "canMakePayments": SKPaymentQueue.canMakePayments()
        ])
    }

    @objc public func getProducts(_ call: CAPPluginCall) {
        Task {
            do {
                let productIds = try extractProductIds(call)
                let products = try await Product.products(for: productIds).sorted(by: { $0.id < $1.id })
                call.resolve([
                    "available": true,
                    "canMakePayments": SKPaymentQueue.canMakePayments(),
                    "products": products.map(productPayload)
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
                let product = try await Product.products(for: [productId]).first
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
        Task {
            do {
                let productId = try extractProductId(call)
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
    }

    @objc public func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                let productId = try extractProductId(call)
                try await AppStore.sync()
                let product = try await Product.products(for: [productId]).first
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

    private func loadProduct(productId: String) async throws -> Product {
        guard let product = try await Product.products(for: [productId]).first else {
            throw WakeUpPurchasesError.productNotFound(productId)
        }
        return product
    }

    private func currentEntitlement(for productId: String) async throws -> Transaction? {
        for await verification in Transaction.currentEntitlements {
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

    private func statusPayload(productId: String, product: Product?, entitlement: Transaction?) -> JSObject {
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
