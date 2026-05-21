import SwiftUI

struct ProView: View {
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AuthSession.self) private var auth
    @Environment(LibraryStore.self) private var library
    @Environment(AdMobManager.self) private var ads
    @State private var isWorking = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PremiumPanel {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            SmallCapsLabel(text: "Creator Pro", color: Theme.warning)
                            Spacer()
                            Image(systemName: "crown.fill")
                                .foregroundStyle(Theme.warning)
                        }
                        Text("Unlimited ringtone exports. No ads.")
                            .font(.system(size: 34, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(3)
                            .minimumScaleFactor(0.76)
                        Text("Create as many ringtone-ready files as you want for \(purchases.displayPrice)/month. Cancel anytime in Apple ID subscriptions.")
                            .foregroundStyle(Theme.muted)
                            .lineSpacing(4)

                        Button {
                            Task { await purchase() }
                        } label: {
                            HStack {
                                if isWorking {
                                    ProgressView().tint(.white)
                                }
                                Text(purchases.hasUnlimited ? "Unlimited Active" : "Unlock Unlimited")
                            }
                        }
                        .buttonStyle(GradientButtonStyle(disabled: purchases.hasUnlimited || isWorking))
                        .disabled(purchases.hasUnlimited || isWorking)

                        Button("Restore Purchases") {
                            Task {
                                await purchases.restorePurchases()
                                await auth.mirrorSubscription(status: purchases.hasUnlimited ? "unlimited" : "free", productID: purchases.hasUnlimited ? AppConfig.unlimitedProductID : nil)
                            }
                        }
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(Theme.cyan)
                    }
                }

                PremiumPanel {
                    VStack(alignment: .leading, spacing: 12) {
                        SmallCapsLabel(text: "Included", color: Theme.cyan)
                        FeatureRow(symbol: "infinity", title: "Unlimited exports", detail: "Keep creating ringtone-ready files without the three-credit cap.")
                        FeatureRow(symbol: "rectangle.slash", title: "No ads", detail: "Adaptive banners are removed across the app while Pro is active.")
                        FeatureRow(symbol: "waveform.badge.plus", title: "Premium tools", detail: "Trim, fade, preview, duplicate, favorite, and share files from one editor.")
                        FeatureRow(symbol: "icloud.and.arrow.up", title: "Cloud account credits", detail: "Your signup and credit state are managed remotely with Firebase.")
                    }
                }

                PremiumPanel {
                    VStack(alignment: .leading, spacing: 12) {
                        SmallCapsLabel(text: "Privacy & Account", color: Theme.warning)
                        Text("User audio stays on device. Firebase stores account and credit records only.")
                            .foregroundStyle(Theme.muted)
                        HStack {
                            Link("Privacy", destination: AppConfig.privacyURL)
                            Link("Terms", destination: AppConfig.termsURL)
                            Link("app-ads.txt", destination: AppConfig.appAdsTxtURL)
                        }
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Theme.cyan)

                        Button("Manage Ad Privacy") {
                            ads.presentPrivacyOptions(from: UIApplication.shared.topMostViewController)
                        }
                        .buttonStyle(.bordered)
                        .tint(Theme.cyan)

                        Button("Delete Account") {
                            Task { await auth.deleteAccount() }
                        }
                        .buttonStyle(.bordered)
                        .tint(.red)
                    }
                }

                if let message = purchases.message ?? auth.message ?? ads.message {
                    Text(message)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Theme.warning)
                        .padding(.horizontal, 4)
                }
            }
            .padding(16)
        }
    }

    private func purchase() async {
        isWorking = true
        defer { isWorking = false }
        let result = await purchases.purchaseUnlimited()
        if result == .success {
            await auth.mirrorSubscription(status: "unlimited", productID: AppConfig.unlimitedProductID)
        }
    }
}

struct FeatureRow: View {
    let symbol: String
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol)
                .foregroundStyle(Theme.cyan)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
            }
        }
    }
}
