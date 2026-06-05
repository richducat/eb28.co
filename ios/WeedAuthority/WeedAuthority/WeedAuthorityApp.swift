import SwiftUI

@main
struct WeedAuthorityApp: App {
    @State private var store = AuthorityStore()
    @State private var ads = AdMobManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(ads)
                .preferredColorScheme(.dark)
        }
    }
}
