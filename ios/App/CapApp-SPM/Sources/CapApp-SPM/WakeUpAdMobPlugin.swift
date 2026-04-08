import Capacitor
import Foundation
import GoogleMobileAds
import UIKit

@objc(WakeUpAdMobPlugin)
public class WakeUpAdMobPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WakeUpAdMobPlugin"
    public let jsName = "WakeUpAdMob"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "showBanner", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hideBanner", returnType: CAPPluginReturnPromise)
    ]

    private weak var bannerView: BannerView?
    private var hasConfiguredAppId = false

    public override func load() {
        super.load()
        let appId = (Bundle.main.object(forInfoDictionaryKey: "GADApplicationIdentifier") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        hasConfiguredAppId = !appId.isEmpty

        guard hasConfiguredAppId else {
            NSLog("Wake Up Ya Bish: AdMob app id missing, banner bridge is disabled for this build.")
            return
        }

        MobileAds.shared.start(completionHandler: nil)
    }

    @objc public func showBanner(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let bridgeViewController = self.bridge?.viewController else {
                call.reject("Unable to access the iOS root view controller.")
                return
            }

            guard self.hasConfiguredAppId else {
                call.reject("AdMob is not configured for this build.")
                return
            }

            guard let adUnitId = call.getString("adUnitId"), !adUnitId.isEmpty else {
                call.reject("Missing banner ad unit id.")
                return
            }

            _ = call.getBool("isTest") ?? false

            self.bannerView?.removeFromSuperview()

            let bannerView = BannerView(adSize: AdSizeBanner)
            bannerView.translatesAutoresizingMaskIntoConstraints = false
            bannerView.adUnitID = adUnitId
            bannerView.rootViewController = bridgeViewController

            bridgeViewController.view.addSubview(bannerView)
            NSLayoutConstraint.activate([
                bannerView.centerXAnchor.constraint(equalTo: bridgeViewController.view.centerXAnchor),
                bannerView.bottomAnchor.constraint(equalTo: bridgeViewController.view.safeAreaLayoutGuide.bottomAnchor, constant: -8)
            ])

            bannerView.load(Request())
            self.bannerView = bannerView

            call.resolve([
                "visible": true,
                "adUnitId": adUnitId
            ])
        }
    }

    @objc public func hideBanner(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.bannerView?.removeFromSuperview()
            self.bannerView = nil
            call.resolve(["visible": false])
        }
    }
}
