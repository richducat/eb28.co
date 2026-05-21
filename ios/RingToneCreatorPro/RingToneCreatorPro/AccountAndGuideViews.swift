import SwiftUI

struct AccountView: View {
    @Environment(AuthSession.self) private var auth
    @Environment(PurchaseManager.self) private var purchases
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                PremiumBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        PremiumPanel {
                            VStack(alignment: .leading, spacing: 12) {
                                SmallCapsLabel(text: "Account", color: Theme.cyan)
                                Text(auth.profile?.email ?? "Signed in")
                                    .font(.title2.weight(.black))
                                    .foregroundStyle(.white)
                                Text(purchases.hasUnlimited ? "Unlimited exports active" : "\(auth.profile?.freeExportsRemaining ?? 0) free exports remain")
                                    .foregroundStyle(purchases.hasUnlimited ? Theme.success : Theme.warning)
                                    .font(.headline.weight(.bold))
                            }
                        }

                        PremiumPanel {
                            VStack(spacing: 12) {
                                Button {
                                    auth.signOut()
                                    dismiss()
                                } label: {
                                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.bordered)
                                .tint(Theme.cyan)

                                Button(role: .destructive) {
                                    Task {
                                        await auth.deleteAccount()
                                        dismiss()
                                    }
                                } label: {
                                    Label("Delete Account", systemImage: "trash")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.bordered)
                            }
                        }

                        PremiumPanel {
                            VStack(alignment: .leading, spacing: 10) {
                                SmallCapsLabel(text: "Legal", color: Theme.warning)
                                Link("Privacy Policy", destination: AppConfig.privacyURL)
                                Link("Terms of Use", destination: AppConfig.termsURL)
                                Link("Support", destination: AppConfig.supportURL)
                            }
                            .foregroundStyle(Theme.cyan)
                            .font(.headline.weight(.bold))
                        }

                        if let message = auth.message {
                            Text(message)
                                .foregroundStyle(Theme.warning)
                                .font(.caption.weight(.semibold))
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

struct PaywallView: View {
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AuthSession.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            ZStack {
                PremiumBackground()
                VStack(alignment: .leading, spacing: 18) {
                    SmallCapsLabel(text: "Unlimited", color: Theme.warning)
                    Text("Your free exports are used.")
                        .font(.system(size: 36, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text("Upgrade for \(purchases.displayPrice)/month to create unlimited ringtone-ready files and remove ads.")
                        .foregroundStyle(Theme.muted)
                        .lineSpacing(4)

                    Button {
                        Task {
                            isWorking = true
                            let result = await purchases.purchaseUnlimited()
                            isWorking = false
                            if result == .success {
                                await auth.mirrorSubscription(status: "unlimited", productID: AppConfig.unlimitedProductID)
                                dismiss()
                            }
                        }
                    } label: {
                        HStack {
                            if isWorking {
                                ProgressView().tint(.white)
                            }
                            Text("Unlock Unlimited")
                        }
                    }
                    .buttonStyle(GradientButtonStyle(disabled: isWorking))
                    .disabled(isWorking)

                    Button("Restore Purchases") {
                        Task {
                            await purchases.restorePurchases()
                            await auth.mirrorSubscription(status: purchases.hasUnlimited ? "unlimited" : "free", productID: purchases.hasUnlimited ? AppConfig.unlimitedProductID : nil)
                        }
                    }
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(Theme.cyan)

                    Spacer()

                    HStack {
                        Link("Privacy", destination: AppConfig.privacyURL)
                        Link("Terms", destination: AppConfig.termsURL)
                    }
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Theme.muted)
                }
                .padding(24)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}

struct InstallGuideView: View {
    @Environment(\.dismiss) private var dismiss
    let exportURL: URL
    @State private var showShare = false

    var body: some View {
        NavigationStack {
            ZStack {
                PremiumBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        PremiumPanel {
                            VStack(alignment: .leading, spacing: 12) {
                                SmallCapsLabel(text: "Export Complete", color: Theme.success)
                                Text(exportURL.lastPathComponent)
                                    .font(.title2.weight(.black))
                                    .foregroundStyle(.white)
                                Text("Your ringtone-ready file is saved. Use GarageBand to assign it as a ringtone or text tone.")
                                    .foregroundStyle(Theme.muted)
                            }
                        }

                        PremiumPanel {
                            VStack(alignment: .leading, spacing: 14) {
                                SmallCapsLabel(text: "GarageBand Install Steps", color: Theme.warning)
                                GuideStep(number: "1", title: "Share the file", detail: "Tap Share File and choose GarageBand. If GarageBand is not installed, install it from the App Store first.")
                                GuideStep(number: "2", title: "Open in GarageBand", detail: "Long-press the imported project, then choose Share.")
                                GuideStep(number: "3", title: "Choose Ringtone", detail: "Select Ringtone, name it, and export.")
                                GuideStep(number: "4", title: "Assign", detail: "Tap Use sound as, then choose Standard Ringtone, Text Tone, or a contact.")
                            }
                        }

                        Button {
                            showShare = true
                        } label: {
                            Label("Share File", systemImage: "square.and.arrow.up")
                        }
                        .buttonStyle(GradientButtonStyle())
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Install")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .sheet(isPresented: $showShare) {
                ShareSheet(items: [exportURL])
            }
        }
    }
}

struct GuideStep: View {
    let number: String
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.caption.weight(.black))
                .foregroundStyle(.black)
                .frame(width: 26, height: 26)
                .background(Theme.cyan, in: Circle())
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(.white)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
                    .lineSpacing(2)
            }
        }
    }
}
