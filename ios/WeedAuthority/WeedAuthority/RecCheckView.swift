import LocalAuthentication
import SwiftUI

struct RecCheckView: View {
    @Environment(AuthorityStore.self) private var store
    @Environment(\.openURL) private var openURL

    @State private var webDestination: WebDestination?
    @State private var showingAllotmentImport = false
    @State private var showingPurchaseSheet = false
    @State private var unlockMessage = "Unlock to view or change private rec data stored in the device-only Keychain."

    var body: some View {
        @Bindable var store = store

        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 22) {
                    header
                    vaultPanel(store: store)
                    statePanel(store: store)
                    allotmentPanel
                    purchaseHistory
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 32)
            }
            .toolbar(.hidden, for: .navigationBar)
            .sheet(item: $webDestination) { destination in
                SafariSheet(url: destination.url)
                    .ignoresSafeArea()
            }
            .sheet(isPresented: $showingAllotmentImport) {
                AllotmentImportSheet(program: store.recState)
            }
            .sheet(isPresented: $showingPurchaseSheet) {
                AddPurchaseSheet()
                    .presentationDetents([.medium, .large])
            }
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            AuthorityLogo()
            VStack(alignment: .leading, spacing: 2) {
                Text("Rec Check")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(Color.authorityText)
                Text("Official portal values, confirmed and kept private.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.authorityMuted)
            }
            Spacer()
        }
    }

    private func vaultPanel(store: AuthorityStore) -> some View {
        @Bindable var store = store

        return AuthorityPanel {
            VStack(alignment: .leading, spacing: 16) {
                SectionHeader(eyebrow: "Vault", title: store.hasUnlockedRecVault ? "Medical rec profile" : "Private rec vault")

                if store.hasUnlockedRecVault {
                    VStack(spacing: 12) {
                        Label("Unlocked for this foreground session", systemImage: "lock.open.fill")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(Color.authorityGreen)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        TextField("Legal name", text: $store.recProfile.legalName)
                            .textContentType(.name)
                            .textInputAutocapitalization(.words)
                            .authorityField()

                        Picker("Program state", selection: $store.recProfile.stateId) {
                            ForEach(AuthorityContent.states) { state in
                                Text(state.name).tag(state.id)
                            }
                        }
                        .pickerStyle(.menu)
                        .tint(Color.authorityGreen)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                        TextField("Card or registry number", text: $store.recProfile.cardNumber)
                            .textInputAutocapitalization(.characters)
                            .privacySensitive()
                            .authorityField()

                        TextField("Practitioner or clinic", text: $store.recProfile.practitioner)
                            .textInputAutocapitalization(.words)
                            .authorityField()

                        DatePicker("Expires", selection: $store.recProfile.expirationDate, displayedComponents: .date)
                            .datePickerStyle(.compact)
                            .foregroundStyle(Color.authorityText)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))

                        TextField("Private notes", text: $store.recProfile.notes, axis: .vertical)
                            .lineLimit(3...5)
                            .privacySensitive()
                            .authorityField()
                    }
                } else {
                    VStack(alignment: .leading, spacing: 13) {
                        Text(unlockMessage)
                            .font(.system(size: 14))
                            .foregroundStyle(Color.authorityMuted)
                            .lineSpacing(4)
                        if let storageError = store.storageErrorMessage {
                            Label(storageError, systemImage: "exclamationmark.shield.fill")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(Color.authorityCoral)
                        }
                        PrimaryActionButton(title: "Unlock rec vault", systemImage: "faceid") {
                            unlockVault()
                        }
                    }
                }
            }
        }
    }

    private func statePanel(store: AuthorityStore) -> some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: store.recState.id, title: store.recState.name)
                Text(store.recState.officialCheckSummary)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(4)
                HStack(spacing: 8) {
                    Pill(text: "Adult \(store.recState.adultUseAge)", systemImage: "person.fill", tint: Color.authorityGold)
                    Pill(text: "Medical", systemImage: "cross.case.fill")
                }
                PrimaryActionButton(title: store.recState.portalTitle, systemImage: "safari") {
                    openURL(store.recState.portalURL)
                }
                if store.recState.balanceCapability == .portalTextImport,
                   store.recState.hasAllowedImportPortal,
                   store.hasUnlockedRecVault {
                    SecondaryActionButton(title: "Import portal screenshot", systemImage: "text.viewfinder") {
                        showingAllotmentImport = true
                    }
                }
                SecondaryActionButton(title: "Open regulator source", systemImage: "checkmark.seal") {
                    webDestination = WebDestination(url: store.recState.regulatorURL)
                }
            }
        }
    }

    @ViewBuilder
    private var allotmentPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 16) {
                SectionHeader(
                    eyebrow: "Allotment",
                    title: "Confirmed portal snapshot",
                    actionTitle: store.hasUnlockedRecVault ? "Add receipt" : nil,
                    action: store.hasUnlockedRecVault ? { showingPurchaseSheet = true } : nil
                )

                if !store.hasUnlockedRecVault {
                    Label("Unlock the rec vault to view imported allotment values and purchase history.", systemImage: "lock.fill")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(Color.authorityMuted)
                } else if let snapshot = store.allotmentSnapshot(for: store.recState.id) {
                    snapshotContent(snapshot)
                } else if store.recState.balanceCapability == .portalTextImport,
                          store.recState.hasAllowedImportPortal {
                    Text("No confirmed snapshot yet. Sign in to the official portal in Safari, then import a screenshot or copy a displayed value manually.")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.authorityMuted)
                        .lineSpacing(4)
                    PrimaryActionButton(title: "Check official portal", systemImage: "safari") {
                        showingAllotmentImport = true
                    }
                } else {
                    Text("\(store.recState.name) does not publish a patient-facing remaining balance that Weed Authority can import. Use the official program and your dispensary for current eligibility.")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.authorityMuted)
                        .lineSpacing(4)
                }

                Divider().overlay(Color.white.opacity(0.08))
                Text(store.recState.limitSummary)
                    .font(.system(size: 12))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(3)
                Text("A saved value is a convenience copy, not authorization to purchase. The state registry and dispensary are authoritative.")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.authorityGold)
                    .lineSpacing(3)
            }
        }
    }

    @ViewBuilder
    private func snapshotContent(_ snapshot: AllotmentSnapshot) -> some View {
        let stale = snapshot.isStale()

        HStack(spacing: 10) {
            Image(systemName: stale ? "exclamationmark.arrow.triangle.2.circlepath" : "checkmark.shield.fill")
                .foregroundStyle(stale ? Color.authorityGold : Color.authorityGreen)
            VStack(alignment: .leading, spacing: 2) {
                Text(stale ? "Refresh required" : "User-confirmed snapshot")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(stale ? Color.authorityGold : Color.authorityGreen)
                Text(snapshotStatus(snapshot))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.authorityMuted)
            }
            Spacer()
        }
        .padding(12)
        .background((stale ? Color.authorityGold : Color.authorityGreen).opacity(0.08), in: RoundedRectangle(cornerRadius: 14))

        ForEach(snapshot.measurements) { measurement in
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(measurement.kind.displayTitle)
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.authorityText)
                        if let route = measurement.route {
                            Text(route)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Color.authorityMuted)
                        }
                    }
                    Spacer()
                    Text("\(measurement.amount.formatted(.number.precision(.fractionLength(0...3)))) \(measurement.unit.abbreviation)")
                        .font(.system(size: 21, weight: .black, design: .rounded))
                        .foregroundStyle(stale ? Color.authorityGold : Color.authorityGreen)
                }
                Text(measurement.sourceLabel)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(Color.authorityMuted)
            }
            .padding(13)
            .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .privacySensitive()
        }

        PrimaryActionButton(title: "Refresh from official portal", systemImage: "arrow.clockwise") {
            showingAllotmentImport = true
        }
        SecondaryActionButton(title: "Delete this snapshot", systemImage: "trash") {
            store.removeAllotment(for: store.recState.id)
        }
    }

    private var purchaseHistory: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(eyebrow: "History", title: "Private purchase ledger")

            if !store.hasUnlockedRecVault {
                EmptyStateView(
                    icon: "lock.fill",
                    title: "Ledger locked",
                    message: "Unlock the rec vault to view or add purchase entries."
                )
            } else if store.purchaseEntries.isEmpty {
                EmptyStateView(
                    icon: "receipt",
                    title: "No purchases logged",
                    message: "Add a receipt for your own records. New entries immediately mark a saved portal snapshot as stale."
                )
            } else {
                ForEach(store.purchaseEntries) { entry in
                    AuthorityPanel {
                        HStack(spacing: 12) {
                            Image(systemName: entry.unit == .milligramsTHC ? "drop.fill" : "leaf.fill")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundStyle(Color.authorityGreen)
                                .frame(width: 38, height: 38)
                                .background(Color.authorityRaised, in: Circle())
                            VStack(alignment: .leading, spacing: 4) {
                                Text(entry.productName)
                                    .font(.system(.headline, design: .rounded, weight: .bold))
                                    .foregroundStyle(Color.authorityText)
                                Text("\(entry.formattedAmount) - \(entry.retailerName)")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(Color.authorityMuted)
                                if let stateID = entry.stateID {
                                    Text(stateID)
                                        .font(.system(size: 10, weight: .bold, design: .rounded))
                                        .foregroundStyle(Color.authorityGold)
                                }
                            }
                            Spacer()
                            Button {
                                store.deletePurchase(entry)
                            } label: {
                                Image(systemName: "trash")
                                    .foregroundStyle(Color.authorityCoral)
                            }
                        }
                    }
                    .privacySensitive()
                }
            }
        }
    }

    private func snapshotStatus(_ snapshot: AllotmentSnapshot) -> String {
        if snapshot.invalidatedAt != nil {
            return "Out of date because a purchase was logged."
        }
        if snapshot.isStale() {
            return "Saved more than 24 hours ago."
        }
        return "Saved \(snapshot.capturedAt.formatted(.relative(presentation: .numeric)))."
    }

    private func unlockVault() {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            store.hasUnlockedRecVault = false
            unlockMessage = "Set a device passcode or biometric authentication in Settings before using the rec vault."
            return
        }

        context.evaluatePolicy(
            .deviceOwnerAuthentication,
            localizedReason: "Unlock your private local Weed Authority rec vault."
        ) { success, authenticationError in
            Task { @MainActor in
                store.hasUnlockedRecVault = success
                if success {
                    unlockMessage = "Vault unlocked."
                } else if authenticationError != nil {
                    unlockMessage = "Authentication did not complete. Your rec vault remains locked."
                }
            }
        }
    }
}

private struct AddPurchaseSheet: View {
    @Environment(AuthorityStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var productName = ""
    @State private var retailerName = ""
    @State private var amountText = ""
    @State private var unit: PurchaseUnit = .gramsFlower

    var body: some View {
        NavigationStack {
            ZStack {
                AuthorityBackground()
                VStack(spacing: 16) {
                    Text("Saving a purchase marks the current \(store.recState.name) portal snapshot as stale so it cannot look current after activity.")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.authorityGold)
                        .lineSpacing(3)
                    TextField("Product", text: $productName)
                        .authorityField()
                    TextField("Retailer", text: $retailerName)
                        .authorityField()
                    TextField("Amount", text: $amountText)
                        .keyboardType(.decimalPad)
                        .authorityField()
                    Picker("Unit", selection: $unit) {
                        ForEach(PurchaseUnit.allCases) { unit in
                            Text(unit.rawValue).tag(unit)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 120)

                    PrimaryActionButton(title: "Save purchase", systemImage: "plus") {
                        let amount = Double(amountText.replacingOccurrences(of: ",", with: ".")) ?? 0
                        store.addPurchase(productName: productName, amount: amount, unit: unit, retailerName: retailerName)
                        dismiss()
                    }
                    Spacer()
                }
                .padding(18)
            }
            .navigationTitle("Add purchase")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Color.authorityGreen)
                }
            }
        }
    }
}

private extension View {
    func authorityField() -> some View {
        font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Color.authorityText)
            .padding(.horizontal, 12)
            .padding(.vertical, 13)
            .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
