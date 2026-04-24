import Capacitor
import Foundation
import GoogleMobileAds
import UIKit
import UserMessagingPlatform

@objc(WakeUpAdMobPlugin)
public class WakeUpAdMobPlugin: CAPPlugin, CAPBridgedPlugin, BannerViewDelegate {
    public let identifier = "WakeUpAdMobPlugin"
    public let jsName = "WakeUpAdMob"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "showBanner", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hideBanner", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "presentPrivacyOptions", returnType: CAPPluginReturnPromise)
    ]

    private weak var bannerContainerView: UIView?
    private weak var bannerRootViewController: UIViewController?
    private var bannerView: BannerView?
    private var currentAdUnitId: String?
    private var hasStartedMobileAds = false
    private var consentPreparedThisSession = false
    private var consentPreparationInFlight = false
    private var pendingConsentCompletions: [(Bool, Bool, String?) -> Void] = []

    public override func load() {
        super.load()
        NSLog("Wake Up Ya Bish: AdMob bridge loaded.")
    }

    @objc public func showBanner(_ call: CAPPluginCall) {
        let adUnitId = call.getString("adUnitId")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        guard adUnitId.hasPrefix("ca-app-pub-") else {
            call.reject("A valid AdMob banner ad unit id is required.")
            return
        }

        DispatchQueue.main.async {
            guard let rootViewController = self.bridge?.viewController else {
                call.reject("Unable to locate a root view controller for AdMob.")
                return
            }

            let containerView = rootViewController.view ?? self.bridge?.webView
            guard let containerView else {
                call.reject("Unable to locate a container view for AdMob.")
                return
            }

            self.prepareConsent(from: rootViewController) { canRequestAds, privacyOptionsRequired, consentMessage in
                DispatchQueue.main.async {
                    guard canRequestAds else {
                        self.removeBanner()
                        var payload: [String: Any] = [
                            "visible": false,
                            "adUnitId": adUnitId,
                            "canRequestAds": false,
                            "privacyOptionsRequired": privacyOptionsRequired,
                            "consentMessage": consentMessage ?? "Ad consent is not ready on this device yet."
                        ]
                        payload.merge(self.bannerMetrics(for: nil, in: containerView)) { _, new in new }
                        call.resolve(payload)
                        return
                    }

                    self.startMobileAdsIfNeeded()

                    let bannerView = self.ensureBannerView(
                        in: containerView,
                        rootViewController: rootViewController,
                        adUnitId: adUnitId
                    )
                    let availableWidth = max(containerView.safeAreaLayoutGuide.layoutFrame.width, 320)
                    bannerView.adSize = currentOrientationAnchoredAdaptiveBanner(width: availableWidth)
                    bannerView.load(Request())

                    var payload: [String: Any] = [
                        "visible": true,
                        "adUnitId": adUnitId,
                        "canRequestAds": true,
                        "privacyOptionsRequired": privacyOptionsRequired
                    ]

                    if let consentMessage, !consentMessage.isEmpty {
                        payload["consentMessage"] = consentMessage
                    }

                    payload.merge(self.bannerMetrics(for: bannerView, in: containerView)) { _, new in new }

                    call.resolve(payload)
                }
            }
        }
    }

    @objc public func hideBanner(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let containerView = self.bannerContainerView ?? self.bridge?.viewController?.view ?? self.bridge?.webView
            self.removeBanner()

            var payload: [String: Any] = [
                "visible": false,
                "disabled": false,
                "canRequestAds": ConsentInformation.shared.canRequestAds,
                "privacyOptionsRequired": self.isPrivacyOptionsRequired
            ]
            payload.merge(self.bannerMetrics(for: nil, in: containerView)) { _, new in new }
            call.resolve(payload)
        }
    }

    @objc public func presentPrivacyOptions(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let rootViewController = self.bridge?.viewController else {
                call.reject("Unable to locate a root view controller for ad privacy options.")
                return
            }

            ConsentForm.presentPrivacyOptionsForm(from: rootViewController) { error in
                if !ConsentInformation.shared.canRequestAds {
                    self.removeBanner()
                }

                var payload: [String: Any] = [
                    "presented": error == nil,
                    "available": error == nil,
                    "canRequestAds": ConsentInformation.shared.canRequestAds,
                    "privacyOptionsRequired": self.isPrivacyOptionsRequired
                ]

                if let error {
                    NSLog("Wake Up Ya Bish: Ad privacy options unavailable: %@", error.localizedDescription)
                    payload["message"] = error.localizedDescription
                } else {
                    payload["message"] = "Ad privacy choices updated."
                }

                call.resolve(payload)
            }
        }
    }

    private var isPrivacyOptionsRequired: Bool {
        ConsentInformation.shared.privacyOptionsRequirementStatus == .required
    }

    private func bannerMetrics(for bannerView: BannerView?, in containerView: UIView?) -> [String: Any] {
        let adSize = bannerView?.adSize.size ?? .zero
        let measuredSize = bannerView?.bounds.size ?? .zero
        let width = adSize.width > 0 ? adSize.width : measuredSize.width
        let height = adSize.height > 0 ? adSize.height : measuredSize.height
        let safeAreaBottom = containerView?.safeAreaInsets.bottom ?? 0

        return [
            "bannerHeight": Double(height),
            "bannerWidth": Double(width),
            "safeAreaBottom": Double(safeAreaBottom)
        ]
    }

    private func prepareConsent(
        from viewController: UIViewController?,
        completion: @escaping (Bool, Bool, String?) -> Void
    ) {
        if consentPreparedThisSession {
            completion(
                ConsentInformation.shared.canRequestAds,
                isPrivacyOptionsRequired,
                nil
            )
            return
        }

        pendingConsentCompletions.append(completion)

        guard !consentPreparationInFlight else {
            return
        }

        consentPreparationInFlight = true

        let parameters = RequestParameters()
        parameters.isTaggedForUnderAgeOfConsent = false

        ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { error in
            if let error {
                NSLog("Wake Up Ya Bish: consent info update failed: %@", error.localizedDescription)
                self.finishConsentPreparation(errorMessage: error.localizedDescription)
                return
            }

            ConsentForm.loadAndPresentIfRequired(from: viewController) { formError in
                if let formError {
                    NSLog("Wake Up Ya Bish: consent form handling failed: %@", formError.localizedDescription)
                }

                self.finishConsentPreparation(errorMessage: formError?.localizedDescription)
            }
        }
    }

    private func finishConsentPreparation(errorMessage: String?) {
        consentPreparedThisSession = true
        consentPreparationInFlight = false

        let canRequestAds = ConsentInformation.shared.canRequestAds
        let privacyOptionsRequired = isPrivacyOptionsRequired
        let completions = pendingConsentCompletions
        pendingConsentCompletions.removeAll()

        completions.forEach { completion in
            completion(canRequestAds, privacyOptionsRequired, errorMessage)
        }
    }

    private func startMobileAdsIfNeeded() {
        guard !hasStartedMobileAds else {
            return
        }

        hasStartedMobileAds = true
        MobileAds.shared.start()
        NSLog("Wake Up Ya Bish: AdMob SDK started.")
    }

    private func ensureBannerView(
        in containerView: UIView,
        rootViewController: UIViewController,
        adUnitId: String
    ) -> BannerView {
        if let bannerView,
           bannerContainerView === containerView,
           bannerRootViewController === rootViewController {
            if currentAdUnitId != adUnitId {
                bannerView.adUnitID = adUnitId
                currentAdUnitId = adUnitId
            }
            bannerView.rootViewController = rootViewController
            bannerView.isHidden = false
            containerView.bringSubviewToFront(bannerView)
            return bannerView
        }

        removeBanner()

        let bannerView = BannerView()
        bannerView.translatesAutoresizingMaskIntoConstraints = false
        bannerView.adUnitID = adUnitId
        bannerView.rootViewController = rootViewController
        bannerView.delegate = self
        bannerView.isHidden = false

        containerView.addSubview(bannerView)
        NSLayoutConstraint.activate([
            bannerView.centerXAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.centerXAnchor),
            bannerView.bottomAnchor.constraint(equalTo: containerView.safeAreaLayoutGuide.bottomAnchor)
        ])
        containerView.bringSubviewToFront(bannerView)

        self.bannerView = bannerView
        self.bannerContainerView = containerView
        self.bannerRootViewController = rootViewController
        self.currentAdUnitId = adUnitId

        return bannerView
    }

    private func removeBanner() {
        bannerView?.delegate = nil
        bannerView?.removeFromSuperview()
        bannerView = nil
        bannerContainerView = nil
        bannerRootViewController = nil
        currentAdUnitId = nil
    }

    public func bannerViewDidReceiveAd(_ bannerView: BannerView) {
        NSLog("Wake Up Ya Bish: AdMob banner loaded.")
    }

    public func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: any Error) {
        NSLog("Wake Up Ya Bish: AdMob banner failed to load: %@", error.localizedDescription)
    }
}
