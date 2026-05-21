import LocalAuthentication
import SwiftUI

struct RecCheckView: View {
    @Environment(AuthorityStore.self) private var store
    @State private var webDestination: WebDestination?
    @State private var showingPurchaseSheet = false
    @State private var unlockMessage = "Your rec profile is stored locally on this iPhone."

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
            .sheet(isPresented: $showingPurchaseSheet) {
                AddPurchaseSheet()
                    .presentationDetents([.medium, .large])
            }
            .onChange(of: store.recProfile) { _, _ in
                store.persist()
            }
            .onChange(of: store.recProfile.stateId) { _, newValue in
                store.selectedStateID = newValue
                store.persist()
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
                Text("Card, portal, and allotment in one private place.")
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
                            .authorityField()

                        Toggle(isOn: $store.recProfile.acceptedPrivacy) {
                            Text("Keep this local-only vault on this iPhone")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(Color.authorityText)
                        }
                        .tint(Color.authorityGreen)
                    }
                } else {
                    VStack(alignment: .leading, spacing: 13) {
                        Text(unlockMessage)
                            .font(.system(size: 14))
                            .foregroundStyle(Color.authorityMuted)
                            .lineSpacing(4)
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
                    webDestination = WebDestination(url: store.recState.portalURL)
                }
                SecondaryActionButton(title: "Open regulator source", systemImage: "checkmark.seal") {
                    webDestination = WebDestination(url: store.recState.regulatorURL)
                }
            }
        }
    }

    private var allotmentPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 16) {
                SectionHeader(
                    eyebrow: "Allotment",
                    title: "Private purchase ledger",
                    actionTitle: "Add",
                    action: { showingPurchaseSheet = true }
                )

                Text(store.recState.limitSummary)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(4)

                HStack(spacing: 10) {
                    AllotmentGauge(
                        title: "Flower",
                        valueText: flowerRemainingText,
                        detail: "\(store.recState.defaultWindowDays)-day window",
                        tint: Color.authorityGreen
                    )
                    AllotmentGauge(
                        title: "Concentrate",
                        valueText: concentrateRemainingText,
                        detail: "where tracked",
                        tint: Color.authorityGold
                    )
                }

                Text("The state registry, retailer point-of-sale, or physician recommendation controls official eligibility. This ledger is for planning and receipt tracking.")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(3)
            }
        }
    }

    private var purchaseHistory: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(eyebrow: "History", title: "Recent purchases")

            if store.purchaseEntries.isEmpty {
                EmptyStateView(
                    icon: "receipt",
                    title: "No purchases logged",
                    message: "Add receipts manually to estimate your personal rolling window before visiting a retailer."
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
                }
            }
        }
    }

    private var flowerRemainingText: String {
        guard let remaining = store.remainingFlowerGrams(in: store.recState) else {
            return "Portal"
        }
        return "\(remaining.formatted(.number.precision(.fractionLength(0...1)))) g"
    }

    private var concentrateRemainingText: String {
        guard let remaining = store.remainingConcentrateGrams(in: store.recState) else {
            return "Portal"
        }
        return "\(remaining.formatted(.number.precision(.fractionLength(0...1)))) g"
    }

    private func unlockVault() {
        let context = LAContext()
        var error: NSError?

        if context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) {
            context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock your local Weed Authority rec vault.") { success, _ in
                Task { @MainActor in
                    store.hasUnlockedRecVault = success
                    unlockMessage = success ? "Vault unlocked." : "Authentication was cancelled."
                }
            }
        } else {
            store.hasUnlockedRecVault = true
            unlockMessage = "Device authentication is not configured, so the local vault is unlocked for this session."
        }
    }
}

private struct AllotmentGauge: View {
    let title: String
    let valueText: String
    let detail: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .black, design: .rounded))
                .foregroundStyle(Color.authorityMuted)
            Text(valueText)
                .font(.system(size: 24, weight: .black, design: .rounded))
                .foregroundStyle(tint)
                .minimumScaleFactor(0.7)
            Text(detail)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color.authorityMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
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
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundStyle(Color.authorityGreen)
                }
            }
        }
    }
}

private extension View {
    func authorityField() -> some View {
        self
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Color.authorityText)
            .padding(.horizontal, 12)
            .padding(.vertical, 13)
            .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
