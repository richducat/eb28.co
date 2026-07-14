import SwiftUI

@main
struct WeedAuthorityApp: App {
    @State private var store = AuthorityStore()
    @State private var ads = AdMobManager()
    @State private var gate = LocationGate()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .environment(ads)
                .environment(gate)
                .preferredColorScheme(.dark)
        }
    }
}
