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
                if auth.firebaseReady && !auth.isSignedIn {
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
                        .safeAreaInset(edge: .top) {
                            if !auth.firebaseReady {
                                BackendSetupBanner()
                            }
                        }
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

struct BackendSetupBanner: View {
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "icloud.slash")
                .foregroundStyle(Theme.warning)
            VStack(alignment: .leading, spacing: 3) {
                Text("Account sync is being configured")
                    .font(.caption.weight(.black))
                    .foregroundStyle(.white)
                Text("You can explore the app. Free export signup needs the production Firebase config.")
                    .font(.caption2)
                    .foregroundStyle(Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Theme.elevated.opacity(0.96))
        .overlay(Rectangle().fill(Theme.line).frame(height: 1), alignment: .bottom)
    }
}
