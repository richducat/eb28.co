import SafariServices
import SwiftUI

struct RootView: View {
    @Environment(AuthorityStore.self) private var store
    @Environment(AdMobManager.self) private var ads

    var body: some View {
        @Bindable var store = store

        ZStack {
            AuthorityBackground()
            TabView(selection: $store.selectedTab) {
                ExploreView()
                    .safeAreaInset(edge: .bottom) {
                        adBanner
                    }
                    .tag(AuthorityTab.explore)
                    .tabItem {
                        Label(AuthorityTab.explore.title, systemImage: AuthorityTab.explore.icon)
                    }

                RecCheckView()
                    .safeAreaInset(edge: .bottom) {
                        adBanner
                    }
                    .tag(AuthorityTab.rec)
                    .tabItem {
                        Label(AuthorityTab.rec.title, systemImage: AuthorityTab.rec.icon)
                    }

                DealsView()
                    .safeAreaInset(edge: .bottom) {
                        adBanner
                    }
                    .tag(AuthorityTab.deals)
                    .tabItem {
                        Label(AuthorityTab.deals.title, systemImage: AuthorityTab.deals.icon)
                    }

                LearnView()
                    .safeAreaInset(edge: .bottom) {
                        adBanner
                    }
                    .tag(AuthorityTab.learn)
                    .tabItem {
                        Label(AuthorityTab.learn.title, systemImage: AuthorityTab.learn.icon)
                    }

                AccountView()
                    .safeAreaInset(edge: .bottom) {
                        adBanner
                    }
                    .tag(AuthorityTab.account)
                    .tabItem {
                        Label(AuthorityTab.account.title, systemImage: AuthorityTab.account.icon)
                    }
            }
            .tint(Color.authorityGreen)
        }
        .task {
            ads.prepareConsent(from: UIApplication.shared.topMostViewController)
        }
    }

    @ViewBuilder
    private var adBanner: some View {
        if ads.hasConfiguredBanner && ads.canRequestAds {
            AdBannerView()
                .frame(height: 62)
                .frame(maxWidth: .infinity)
                .background(Color.authorityInk.opacity(0.96))
        }
    }
}

struct SafariSheet: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: url)
        controller.preferredBarTintColor = UIColor(Color.authorityInk)
        controller.preferredControlTintColor = UIColor(Color.authorityGreen)
        return controller
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
