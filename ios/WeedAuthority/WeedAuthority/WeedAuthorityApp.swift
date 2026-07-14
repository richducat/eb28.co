import SwiftUI

@main
struct WeedAuthorityApp: App {
    @Environment(\.scenePhase) private var scenePhase
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
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase != .active {
                        store.lockRecVault()
                    }
                }
        }
    }
}
