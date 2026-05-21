import MapKit
import SwiftUI

struct ExploreView: View {
    @Environment(AuthorityStore.self) private var store
    @State private var searchText = "Los Angeles"
    @State private var selectedType: RetailerType? = nil
    @State private var localPlaces: [AuthorityPlace] = []
    @State private var isSearching = false
    @State private var searchMessage = "Apple Maps search ready"
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 34.0407, longitude: -118.2468),
            span: MKCoordinateSpan(latitudeDelta: 0.18, longitudeDelta: 0.18)
        )
    )
    @State private var webDestination: WebDestination?

    private var filteredRetailers: [Retailer] {
        AuthorityContent.retailers.filter { retailer in
            let matchesType = selectedType == nil || retailer.types.contains(selectedType!)
            let locationText = "\(retailer.city) \(retailer.state) \(retailer.name)".lowercased()
            let matchesSearch = searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ||
            locationText.contains(searchText.lowercased())
            return matchesType && matchesSearch
        }
    }

    private var visibleRetailers: [Retailer] {
        filteredRetailers.isEmpty ? AuthorityContent.retailers : filteredRetailers
    }

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 22) {
                    hero
                    searchPanel
                    mapPanel
                    retailerList
                    statePanel
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .sheet(item: $webDestination) { destination in
                SafariSheet(url: destination.url)
                    .ignoresSafeArea()
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 18) {
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

            HStack(spacing: 10) {
                MetricView(value: "\(visibleRetailers.count)", label: "curated")
                MetricView(value: "\(AuthorityContent.states.count)", label: "states")
                MetricView(value: "\(store.savedRetailerIDs.count)", label: "saved")
            }
        }
        .padding(.top, 8)
    }

    private var searchPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Find", title: "Nearby legal retailers")

                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(Color.authorityMuted)
                    TextField("City, state, or ZIP", text: $searchText)
                        .textInputAutocapitalization(.words)
                        .submitLabel(.search)
                        .foregroundStyle(Color.authorityText)
                        .onSubmit {
                            Task { await runAppleMapsSearch() }
                        }
                    Button {
                        Task { await runAppleMapsSearch() }
                    } label: {
                        Image(systemName: isSearching ? "hourglass" : "location.magnifyingglass")
                            .foregroundStyle(Color.authorityInk)
                            .frame(width: 38, height: 38)
                            .background(Color.authorityGreen, in: Circle())
                    }
                    .disabled(isSearching)
                    .buttonStyle(.plain)
                }
                .padding(12)
                .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "All", selected: selectedType == nil) {
                            selectedType = nil
                        }
                        ForEach(RetailerType.allCases) { type in
                            FilterChip(title: type.rawValue, selected: selectedType == type) {
                                selectedType = selectedType == type ? nil : type
                            }
                        }
                    }
                }

                Text(searchMessage)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.authorityMuted)
            }
        }
    }

    private var mapPanel: some View {
        AuthorityPanel(padding: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Map(position: $cameraPosition) {
                    ForEach(visibleRetailers) { retailer in
                        Marker(retailer.name, systemImage: "cross.case.fill", coordinate: retailer.coordinate)
                            .tint(Color.authorityGreen)
                    }
                    ForEach(localPlaces) { place in
                        Marker(place.name, systemImage: "mappin.circle.fill", coordinate: CLLocationCoordinate2D(latitude: place.latitude, longitude: place.longitude))
                            .tint(Color.authorityGold)
                    }
                }
                .mapStyle(.standard(elevation: .realistic))
                .frame(height: 248)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                .overlay(alignment: .topLeading) {
                    Pill(text: localPlaces.isEmpty ? "Curated map" : "Apple Maps results", systemImage: "map", tint: localPlaces.isEmpty ? Color.authorityGreen : Color.authorityGold)
                        .padding(12)
                }
            }
        }
    }

    private var retailerList: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(eyebrow: "Retail", title: localPlaces.isEmpty ? "Authority picks" : "Apple Maps matches")

            if !localPlaces.isEmpty {
                ForEach(localPlaces.prefix(8)) { place in
                    LocalPlaceRow(place: place) { url in
                        webDestination = WebDestination(url: url)
                    }
                }
            } else {
                ForEach(visibleRetailers) { retailer in
                    RetailerRow(retailer: retailer, saved: store.savedRetailerIDs.contains(retailer.id)) {
                        store.toggleRetailer(retailer)
                    } openSource: {
                        webDestination = WebDestination(url: retailer.sourceURL)
                    }
                }
            }
        }
    }

    private var statePanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Compliance", title: "State rules change by market")
                Picker("State", selection: Bindable(store).selectedStateID) {
                    ForEach(AuthorityContent.states) { state in
                        Text(state.name).tag(state.id)
                    }
                }
                .pickerStyle(.menu)
                .tint(Color.authorityGreen)

                Text(store.selectedState.limitSummary)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(4)

                PrimaryActionButton(title: "Open official state source", systemImage: "safari") {
                    webDestination = WebDestination(url: store.selectedState.regulatorURL)
                }
            }
        }
    }

    @MainActor
    private func runAppleMapsSearch() async {
        let trimmed = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            searchMessage = "Enter a city, state, or ZIP to search Apple Maps."
            return
        }

        isSearching = true
        searchMessage = "Searching Apple Maps for cannabis retailers near \(trimmed)..."

        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = "cannabis dispensary \(trimmed)"
        request.resultTypes = .pointOfInterest

        do {
            let response = try await MKLocalSearch(request: request).start()
            localPlaces = response.mapItems.map(AuthorityPlace.init)
            if let first = localPlaces.first {
                cameraPosition = .region(
                    MKCoordinateRegion(
                        center: CLLocationCoordinate2D(latitude: first.latitude, longitude: first.longitude),
                        span: MKCoordinateSpan(latitudeDelta: 0.12, longitudeDelta: 0.12)
                    )
                )
            }
            searchMessage = localPlaces.isEmpty ? "No Apple Maps matches found. Try a larger city or state." : "\(localPlaces.count) Apple Maps matches found. Verify licenses before ordering."
        } catch {
            localPlaces = []
            searchMessage = "Apple Maps search failed. Curated retailers are still available."
        }

        isSearching = false
    }
}

private struct MetricView: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(value)
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundStyle(Color.authorityText)
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(Color.authorityMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(13)
        .background(Color.authorityRaised.opacity(0.82), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct FilterChip: View {
    let title: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(selected ? Color.authorityInk : Color.authorityText)
                .padding(.horizontal, 13)
                .padding(.vertical, 9)
                .background(selected ? Color.authorityGreen : Color.authorityRaised, in: Capsule())
        }
        .buttonStyle(.plain)
    }
}

private struct RetailerRow: View {
    let retailer: Retailer
    let saved: Bool
    let onSave: () -> Void
    let openSource: () -> Void

    var body: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(retailer.name)
                            .font(.system(.headline, design: .rounded, weight: .bold))
                            .foregroundStyle(Color.authorityText)
                        Text("\(retailer.city), \(retailer.state) - \(retailer.openStatus)")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.authorityMuted)
                    }
                    Spacer()
                    Button(action: onSave) {
                        Image(systemName: saved ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(saved ? Color.authorityGold : Color.authorityMuted)
                            .frame(width: 36, height: 36)
                            .background(Color.authorityRaised, in: Circle())
                    }
                    .buttonStyle(.plain)
                }

                HStack(spacing: 8) {
                    Pill(text: retailer.distanceText, systemImage: "location.fill")
                    Pill(text: String(format: "%.1f", retailer.rating), systemImage: "star.fill", tint: Color.authorityGold)
                    Pill(text: retailer.pickupETA, systemImage: "bag.fill", tint: Color.authorityText)
                }

                Text(retailer.highlights.joined(separator: " - "))
                    .font(.system(size: 13))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(3)

                HStack {
                    SecondaryActionButton(title: "Verify source", systemImage: "checkmark.seal", action: openSource)
                    Spacer()
                    Text(retailer.deliveryETA == "Unavailable" ? "Pickup only" : "Delivery \(retailer.deliveryETA)")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.authorityCoral)
                }
            }
        }
    }
}

private struct LocalPlaceRow: View {
    let place: AuthorityPlace
    let openURL: (URL) -> Void

    var body: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(place.name)
                            .font(.system(.headline, design: .rounded, weight: .bold))
                            .foregroundStyle(Color.authorityText)
                        Text(place.address.isEmpty ? "Address not listed" : place.address)
                            .font(.system(size: 13))
                            .foregroundStyle(Color.authorityMuted)
                    }
                    Spacer()
                    Pill(text: "Maps", systemImage: "map.fill", tint: Color.authorityGold)
                }

                HStack {
                    if !place.phone.isEmpty {
                        Link(destination: URL(string: "tel://\(place.phone.filter { $0.isNumber })")!) {
                            Label("Call", systemImage: "phone.fill")
                        }
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.authorityGreen)
                    }
                    if let url = place.url {
                        Button {
                            openURL(url)
                        } label: {
                            Label("Website", systemImage: "safari")
                        }
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.authorityGold)
                    }
                    Spacer()
                }
                Text("Verify state license and age requirements before ordering.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.authorityMuted)
            }
        }
    }
}
