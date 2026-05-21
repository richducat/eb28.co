import Foundation
import GoogleMobileAds
import SwiftUI
import UIKit
import UserMessagingPlatform

@MainActor
@Observable
final class AdMobManager {
    var canRequestAds = false
    var privacyOptionsRequired = false
    var message: String?

    @ObservationIgnored private var didStart = false

    var adUnitID: String {
        AppConfig.bannerAdUnitID
    }

    var hasConfiguredBanner: Bool {
        AppConfig.hasProductionAdMobIDs
    }

    func startIfPossible() {
        guard hasConfiguredBanner, !didStart else { return }
        didStart = true
        MobileAds.shared.start()
    }

    func prepareConsent(from viewController: UIViewController?) {
        guard hasConfiguredBanner else { return }

        let parameters = RequestParameters()
        parameters.isTaggedForUnderAgeOfConsent = false

        ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { [weak self] error in
            Task { @MainActor in
                if let error {
                    self?.message = error.localizedDescription
                    self?.canRequestAds = ConsentInformation.shared.canRequestAds
                    self?.privacyOptionsRequired = ConsentInformation.shared.privacyOptionsRequirementStatus == .required
                    return
                }

                ConsentForm.loadAndPresentIfRequired(from: viewController) { formError in
                    Task { @MainActor in
                        self?.message = formError?.localizedDescription
                        self?.canRequestAds = ConsentInformation.shared.canRequestAds
                        self?.privacyOptionsRequired = ConsentInformation.shared.privacyOptionsRequirementStatus == .required
                        self?.startIfPossible()
                    }
                }
            }
        }
    }

    func presentPrivacyOptions(from viewController: UIViewController?) {
        ConsentForm.presentPrivacyOptionsForm(from: viewController) { [weak self] error in
            Task { @MainActor in
                self?.message = error?.localizedDescription ?? "Ad privacy choices updated."
                self?.canRequestAds = ConsentInformation.shared.canRequestAds
                self?.privacyOptionsRequired = ConsentInformation.shared.privacyOptionsRequirementStatus == .required
            }
        }
    }
}

struct AdBannerView: UIViewControllerRepresentable {
    @Environment(AdMobManager.self) private var ads

    func makeUIViewController(context: Context) -> BannerHostController {
        let controller = BannerHostController()
        controller.adUnitID = ads.adUnitID
        return controller
    }

    func updateUIViewController(_ uiViewController: BannerHostController, context: Context) {
        uiViewController.adUnitID = ads.adUnitID
        uiViewController.loadIfNeeded()
    }
}

final class BannerHostController: UIViewController, BannerViewDelegate {
    var adUnitID: String = ""
    private var bannerView: BannerView?
    private var didLoad = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
    }

    func loadIfNeeded() {
        guard AppConfig.hasProductionAdMobIDs else { return }
        guard !didLoad else { return }
        didLoad = true

        let banner = BannerView()
        banner.translatesAutoresizingMaskIntoConstraints = false
        banner.adUnitID = adUnitID
        banner.rootViewController = self
        banner.delegate = self
        view.addSubview(banner)
        NSLayoutConstraint.activate([
            banner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            banner.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])

        let width = max(view.bounds.width, UIScreen.main.bounds.width, 320)
        banner.adSize = currentOrientationAnchoredAdaptiveBanner(width: width)
        banner.load(Request())
        bannerView = banner
    }
}

extension UIApplication {
    var topMostViewController: UIViewController? {
        connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow)?
            .rootViewController?
            .topMostPresented
    }
}

private extension UIViewController {
    var topMostPresented: UIViewController {
        presentedViewController?.topMostPresented ?? self
    }
}
