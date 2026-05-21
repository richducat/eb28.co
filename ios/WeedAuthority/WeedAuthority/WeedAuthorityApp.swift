import SwiftUI

@main
struct WeedAuthorityApp: App {
    @State private var store = AuthorityStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .preferredColorScheme(.dark)
        }
    }
}
