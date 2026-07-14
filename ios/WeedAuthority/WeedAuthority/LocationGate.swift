import CoreLocation
import Foundation
import SwiftUI

/// Restricts retail-facing features to U.S. states with a regulated cannabis
/// program supported by the app. Fails closed: retail features stay locked
/// until the device is confirmed to be inside a supported state.
@MainActor
@Observable
final class LocationGate: NSObject {
    enum Status: Equatable {
        case notStarted
        case checking
        case allowed(stateID: String)
        case outsideSupportedRegion(detail: String)
        case permissionNeeded
        case locationUnavailable
    }

    var status: Status = .notStarted

    static let supportedStateIDs: Set<String> = Set(AuthorityContent.states.map(\.id))

    @ObservationIgnored private let manager = CLLocationManager()
    @ObservationIgnored private let geocoder = CLGeocoder()
    @ObservationIgnored private var hasStarted = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    var allowedStateID: String? {
        if case .allowed(let stateID) = status { return stateID }
        return nil
    }

    func start() {
        guard !hasStarted else { return }
        hasStarted = true
        status = .checking
        evaluateAuthorization()
    }

    func refresh() {
        status = .checking
        evaluateAuthorization()
    }

    private func evaluateAuthorization() {
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .denied, .restricted:
            status = .permissionNeeded
        case .authorizedWhenInUse, .authorizedAlways:
            status = .checking
            manager.requestLocation()
        @unknown default:
            status = .permissionNeeded
        }
    }

    private func resolve(location: CLLocation) {
        geocoder.reverseGeocodeLocation(location) { [weak self] placemarks, _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                guard let placemark = placemarks?.first else {
                    self.status = .locationUnavailable
                    return
                }
                let country = placemark.isoCountryCode ?? ""
                let region = placemark.administrativeArea ?? ""
                if country == "US", Self.supportedStateIDs.contains(region) {
                    self.status = .allowed(stateID: region)
                } else if country == "US" {
                    self.status = .outsideSupportedRegion(detail: "Your state does not have a supported legal cannabis program in this app yet.")
                } else {
                    self.status = .outsideSupportedRegion(detail: "Retail features are only available inside supported U.S. states.")
                }
            }
        }
    }
}

extension LocationGate: CLLocationManagerDelegate {
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let authorization = manager.authorizationStatus
        Task { @MainActor in
            switch authorization {
            case .notDetermined:
                break
            case .denied, .restricted:
                self.status = .permissionNeeded
            case .authorizedWhenInUse, .authorizedAlways:
                self.status = .checking
                self.manager.requestLocation()
            @unknown default:
                self.status = .permissionNeeded
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in
            self.resolve(location: location)
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.status = .locationUnavailable
        }
    }
}

/// Wraps retail-facing content and only reveals it while the device is
/// confirmed inside a supported legal state.
struct GeoGatedView<Content: View>: View {
    @Environment(LocationGate.self) private var gate
    let featureTitle: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        switch gate.status {
        case .notStarted:
            RegionGateView(
                icon: "location.circle.fill",
                title: "Confirm your location",
                message: "\(featureTitle) is only available in supported U.S. states with legal cannabis programs. Location stays off until you choose to check it.",
                showsProgress: false,
                actionTitle: "Check my location",
                action: { gate.start() }
            )
        case .allowed:
            content()
        case .checking:
            RegionGateView(
                icon: "location.viewfinder",
                title: "Confirming your location",
                message: "\(featureTitle) is only available in supported U.S. states with legal cannabis programs. Weed Authority checks your location before showing retail content.",
                showsProgress: true,
                actionTitle: nil,
                action: nil
            )
        case .permissionNeeded:
            RegionGateView(
                icon: "location.slash.fill",
                title: "Location required",
                message: "Cannabis rules differ by state, so \(featureTitle.lowercased()) stays locked until Weed Authority can confirm you are in a supported legal state. Allow While Using in Settings, then try again.",
                showsProgress: false,
                actionTitle: "Open Settings",
                action: {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
            )
        case .outsideSupportedRegion(let detail):
            RegionGateView(
                icon: "map.circle.fill",
                title: "Not available in your location",
                message: "\(detail) Supported states: \(AuthorityContent.states.map(\.name).joined(separator: ", ")). Education and official state resources remain available in Learn.",
                showsProgress: false,
                actionTitle: "Check again",
                action: nil
            )
        case .locationUnavailable:
            RegionGateView(
                icon: "exclamationmark.triangle.fill",
                title: "Could not confirm location",
                message: "Weed Authority could not confirm you are in a supported legal state, so \(featureTitle.lowercased()) stays locked. Check your connection and try again.",
                showsProgress: false,
                actionTitle: "Try again",
                action: nil
            )
        }
    }
}

private struct RegionGateView: View {
    @Environment(LocationGate.self) private var gate
    let icon: String
    let title: String
    let message: String
    let showsProgress: Bool
    let actionTitle: String?
    let action: (() -> Void)?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 22) {
                HStack(spacing: 12) {
                    AuthorityLogo()
                    VStack(alignment: .leading, spacing: 2) {
                        Text("WEED AUTHORITY")
                            .font(.system(size: 24, weight: .black, design: .rounded))
                            .foregroundStyle(Color.authorityText)
                        Text("Legal cannabis, checked before you go.")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.authorityMuted)
                    }
                    Spacer()
                    Pill(text: "21+ / MED", systemImage: "lock.shield", tint: Color.authorityGold)
                }
                .padding(.top, 8)

                AuthorityPanel {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(spacing: 12) {
                            Image(systemName: icon)
                                .font(.system(size: 28, weight: .bold))
                                .foregroundStyle(Color.authorityGreen)
                            Text(title)
                                .font(.system(size: 20, weight: .black, design: .rounded))
                                .foregroundStyle(Color.authorityText)
                        }

                        Text(message)
                            .font(.system(size: 14))
                            .foregroundStyle(Color.authorityMuted)
                            .lineSpacing(4)

                        if showsProgress {
                            ProgressView()
                                .tint(Color.authorityGreen)
                                .frame(maxWidth: .infinity)
                        }

                        if let actionTitle {
                            PrimaryActionButton(title: actionTitle, systemImage: "arrow.clockwise") {
                                if let action {
                                    action()
                                } else {
                                    gate.refresh()
                                }
                            }
                        }
                    }
                }

                AuthorityPanel {
                    VStack(alignment: .leading, spacing: 12) {
                        SectionHeader(eyebrow: "Why", title: "Regulated market protections")
                        Text("Weed Authority only surfaces retailer discovery and product deals inside U.S. states with a regulated cannabis program, and always links to official state license sources. The app does not sell cannabis or process payment.")
                            .font(.system(size: 13))
                            .foregroundStyle(Color.authorityMuted)
                            .lineSpacing(4)
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 32)
        }
    }
}
