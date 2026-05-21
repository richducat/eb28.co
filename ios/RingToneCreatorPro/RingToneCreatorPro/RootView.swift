import SwiftUI

struct RootView: View {
    @Environment(AuthSession.self) private var auth
    @Environment(LibraryStore.self) private var library
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AdMobManager.self) private var ads

    var body: some View {
        @Bindable var library = library

        ZStack {
            PremiumBackground()

            Group {
                if !auth.firebaseReady {
                    FirebaseSetupRequiredView()
                } else if !auth.isSignedIn {
                    AuthView()
                } else {
                    MainTabView()
                }
            }
        }
        .sheet(item: $library.sheet) { destination in
            switch destination {
            case .editor(let id):
                EditorView(projectID: id)
            case .installGuide(let url):
                InstallGuideView(exportURL: url)
            case .account:
                AccountView()
            case .paywall:
                PaywallView()
            }
        }
        .task {
            if let root = UIApplication.shared.topMostViewController {
                ads.prepareConsent(from: root)
            }
        }
        .onChange(of: purchases.hasUnlimited) { _, hasUnlimited in
            Task {
                await auth.mirrorSubscription(status: hasUnlimited ? "unlimited" : "free", productID: hasUnlimited ? AppConfig.unlimitedProductID : nil)
            }
        }
    }
}

struct FirebaseSetupRequiredView: View {
    @Environment(AuthSession.self) private var auth

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            SmallCapsLabel(text: "Setup Required", color: Theme.warning)
            Text("Firebase signup is wired, but this build needs the real Firebase app config.")
                .font(.largeTitle.weight(.black))
                .foregroundStyle(.white)
                .lineLimit(4)
                .minimumScaleFactor(0.72)
            Text("Replace `GoogleService-Info.plist` with the Firebase iOS app config for `co.eb28.ringtonecreatorpro`, enable Email/Password Auth, and deploy the included Firestore rules. The app will then use remote account records and remote export credits.")
                .font(.body)
                .foregroundStyle(Theme.muted)
                .lineSpacing(4)
            if let message = auth.message {
                Text(message)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.warning)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }
}

struct MainTabView: View {
    @Environment(LibraryStore.self) private var library
    @Environment(AuthSession.self) private var auth
    @Environment(PurchaseManager.self) private var purchases
    @Environment(AdMobManager.self) private var ads

    var body: some View {
        @Bindable var library = library

        TabView(selection: $library.selectedTab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack {
                    tabContent(tab)
                        .navigationTitle(tab.title)
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .topBarLeading) {
                                CreditBadge(profile: auth.profile, hasUnlimited: purchases.hasUnlimited)
                            }
                            ToolbarItem(placement: .topBarTrailing) {
                                Button {
                                    library.sheet = .account
                                } label: {
                                    Image(systemName: "person.crop.circle")
                                }
                                .accessibilityLabel("Account")
                            }
                        }
                }
                .tabItem {
                    Label(tab.title, systemImage: tab.symbol)
                }
                .tag(tab)
            }
        }
        .tint(Theme.cyan)
        .safeAreaInset(edge: .bottom) {
            if !purchases.hasUnlimited && ads.hasConfiguredBanner {
                AdBannerView()
                    .frame(height: 58)
                    .background(Theme.ink.opacity(0.96))
            }
        }
    }

    @ViewBuilder
    private func tabContent(_ tab: AppTab) -> some View {
        switch tab {
        case .create:
            CreateView()
        case .library:
            LibraryView()
        case .browse:
            BrowseView()
        case .pro:
            ProView()
        }
    }
}
