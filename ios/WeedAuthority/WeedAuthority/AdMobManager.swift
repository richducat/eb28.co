import Foundation
import GoogleMobileAds
import SwiftUI
import UIKit
import UserMessagingPlatform

@MainActor
@Observable
final class AdMobManager {
    var canRequestAds = ConsentInformation.shared.canRequestAds
    var privacyOptionsRequired = false
    var message: String?

    @ObservationIgnored private var didStart = false
    @ObservationIgnored private var didPrepareConsent = false

    var adUnitID: String {
        AppConfig.bannerAdUnitID
    }

    var hasConfiguredBanner: Bool {
        AppConfig.hasConfiguredAdMobIDs
    }

    func prepareConsent(from viewController: UIViewController?) {
        guard hasConfiguredBanner, !didPrepareConsent else { return }
        didPrepareConsent = true

        let parameters = RequestParameters()
        parameters.isTaggedForUnderAgeOfConsent = false

        ConsentInformation.shared.requestConsentInfoUpdate(with: parameters) { [weak self] error in
            Task { @MainActor in
                if let error {
                    self?.message = error.localizedDescription
                    self?.syncConsentState()
                    self?.startIfPossible()
                    return
                }

                do {
                    try await ConsentForm.loadAndPresentIfRequired(from: viewController)
                    self?.message = nil
                } catch {
                    self?.message = error.localizedDescription
                }

                self?.syncConsentState()
                self?.startIfPossible()
            }
        }
    }

    func presentPrivacyOptions(from viewController: UIViewController?) {
        guard hasConfiguredBanner else { return }

        Task { @MainActor in
            do {
                try await ConsentForm.presentPrivacyOptionsForm(from: viewController)
                message = "Ad privacy choices updated."
            } catch {
                message = error.localizedDescription
            }

            syncConsentState()
            startIfPossible()
        }
    }

    private func startIfPossible() {
        guard hasConfiguredBanner, canRequestAds, !didStart else { return }
        didStart = true
        MobileAds.shared.start()
    }

    private func syncConsentState() {
        canRequestAds = ConsentInformation.shared.canRequestAds
        privacyOptionsRequired = ConsentInformation.shared.privacyOptionsRequirementStatus == .required
    }
}

struct AdBannerView: UIViewControllerRepresentable {
    @Environment(AdMobManager.self) private var ads

    func makeUIViewController(context: Context) -> BannerHostController {
        let controller = BannerHostController()
        controller.configure(adUnitID: ads.adUnitID, canRequestAds: ads.canRequestAds)
        return controller
    }

    func updateUIViewController(_ uiViewController: BannerHostController, context: Context) {
        uiViewController.configure(adUnitID: ads.adUnitID, canRequestAds: ads.canRequestAds)
    }
}

final class BannerHostController: UIViewController, BannerViewDelegate {
    private var bannerView: BannerView?
    private var currentAdUnitID = ""
    private var canRequestAds = false
    private var lastLoadedWidth: CGFloat = 0

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        loadIfNeeded()
    }

    func configure(adUnitID: String, canRequestAds: Bool) {
        let normalizedID = adUnitID.trimmingCharacters(in: .whitespacesAndNewlines)
        if normalizedID != currentAdUnitID {
            clearBanner()
            currentAdUnitID = normalizedID
        }

        self.canRequestAds = canRequestAds
        if canRequestAds {
            loadIfNeeded()
        } else {
            clearBanner()
        }
    }

    private func loadIfNeeded() {
        guard canRequestAds else { return }
        guard currentAdUnitID.hasPrefix("ca-app-pub-"), !currentAdUnitID.contains("__") else { return }

        let width = max(view.bounds.width, UIScreen.main.bounds.width, 320)
        if bannerView != nil, abs(width - lastLoadedWidth) < 1 {
            return
        }

        clearBanner()
        lastLoadedWidth = width

        let banner = BannerView()
        banner.translatesAutoresizingMaskIntoConstraints = false
        banner.adUnitID = currentAdUnitID
        banner.rootViewController = self
        banner.delegate = self
        banner.adSize = largeAnchoredAdaptiveBanner(width: width)
        view.addSubview(banner)

        NSLayoutConstraint.activate([
            banner.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            banner.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])

        banner.load(Request())
        bannerView = banner
    }

    private func clearBanner() {
        bannerView?.delegate = nil
        bannerView?.removeFromSuperview()
        bannerView = nil
        lastLoadedWidth = 0
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
