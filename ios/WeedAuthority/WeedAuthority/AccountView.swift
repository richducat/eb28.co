import SwiftUI

struct AccountView: View {
    @Environment(AuthorityStore.self) private var store
    @Environment(AdMobManager.self) private var ads
    @State private var webDestination: WebDestination?
    @State private var showingResetConfirmation = false

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 22) {
                    header
                    privacyPanel
                    adPrivacyPanel
                    savedPanel
                    supportPanel
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
            .alert("Delete local Weed Authority data?", isPresented: $showingResetConfirmation) {
                Button("Delete", role: .destructive) {
                    store.resetLocalData()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This clears rec profile fields, saved retailers, saved products, and purchase entries from this iPhone.")
            }
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            AuthorityLogo()
            VStack(alignment: .leading, spacing: 2) {
                Text("Account")
                    .font(.system(size: 24, weight: .black, design: .rounded))
                    .foregroundStyle(Color.authorityText)
                Text("Private by default. No account required.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.authorityMuted)
            }
            Spacer()
        }
    }

    private var privacyPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Privacy", title: "Local-first data")
                Text("Weed Authority does not require login. Rec profile fields, saved items, and purchase entries are stored with Apple local storage on this device.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(4)
                HStack(spacing: 10) {
                    SecondaryActionButton(title: "Privacy", systemImage: "hand.raised.fill") {
                        webDestination = WebDestination(url: AppConfig.privacyURL)
                    }
                    SecondaryActionButton(title: "Terms", systemImage: "doc.text.fill") {
                        webDestination = WebDestination(url: AppConfig.termsURL)
                    }
                }
                PrimaryActionButton(title: "Delete local data", systemImage: "trash.fill") {
                    showingResetConfirmation = true
                }
            }
        }
    }

    private var adPrivacyPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Ads", title: "Ad-supported banners")
                Text("Weed Authority uses Google AdMob banner ads. Your rec profile, saved products, saved retailers, and purchase ledger stay local on this device.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(4)
                if let message = ads.message {
                    Text(message)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.authorityGold)
                }
                HStack(spacing: 10) {
                    SecondaryActionButton(title: "Ad choices", systemImage: "slider.horizontal.3") {
                        ads.presentPrivacyOptions(from: UIApplication.shared.topMostViewController)
                    }
                    SecondaryActionButton(title: "Google privacy", systemImage: "shield.lefthalf.filled") {
                        webDestination = WebDestination(url: AppConfig.googlePrivacyURL)
                    }
                }
            }
        }
    }

    private var savedPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Saved", title: "Your local stash board")
                HStack(spacing: 10) {
                    SavedMetric(value: "\(store.savedRetailerIDs.count)", label: "retailers")
                    SavedMetric(value: "\(store.savedProductIDs.count)", label: "products")
                    SavedMetric(value: "\(store.purchaseEntries.count)", label: "receipts")
                }
            }
        }
    }

    private var supportPanel: some View {
        AuthorityPanel {
            VStack(alignment: .leading, spacing: 14) {
                SectionHeader(eyebrow: "Launch", title: "Support and review")
                Text("Support covers state source updates, retailer verification issues, privacy requests, and App Store review questions.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.authorityMuted)
                    .lineSpacing(4)
                PrimaryActionButton(title: "Open support", systemImage: "message.fill") {
                    webDestination = WebDestination(url: AppConfig.supportURL)
                }
            }
        }
    }
}

private struct SavedMetric: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.system(size: 23, weight: .black, design: .rounded))
                .foregroundStyle(Color.authorityGreen)
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(Color.authorityMuted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(13)
        .background(Color.authorityRaised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
