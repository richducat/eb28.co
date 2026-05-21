import SafariServices
import SwiftUI

struct RootView: View {
    @Environment(AuthorityStore.self) private var store

    var body: some View {
        @Bindable var store = store

        ZStack {
            AuthorityBackground()
            TabView(selection: $store.selectedTab) {
                ExploreView()
                    .tag(AuthorityTab.explore)
                    .tabItem {
                        Label(AuthorityTab.explore.title, systemImage: AuthorityTab.explore.icon)
                    }

                RecCheckView()
                    .tag(AuthorityTab.rec)
                    .tabItem {
                        Label(AuthorityTab.rec.title, systemImage: AuthorityTab.rec.icon)
                    }

                DealsView()
                    .tag(AuthorityTab.deals)
                    .tabItem {
                        Label(AuthorityTab.deals.title, systemImage: AuthorityTab.deals.icon)
                    }

                LearnView()
                    .tag(AuthorityTab.learn)
                    .tabItem {
                        Label(AuthorityTab.learn.title, systemImage: AuthorityTab.learn.icon)
                    }

                AccountView()
                    .tag(AuthorityTab.account)
                    .tabItem {
                        Label(AuthorityTab.account.title, systemImage: AuthorityTab.account.icon)
                    }
            }
            .tint(Color.authorityGreen)
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
