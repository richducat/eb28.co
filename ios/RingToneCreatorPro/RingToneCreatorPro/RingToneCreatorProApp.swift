import FirebaseCore
import SwiftUI

@main
struct RingToneCreatorProApp: App {
    @State private var auth = AuthSession()
    @State private var library = LibraryStore()
    @State private var purchases = PurchaseManager()
    @State private var ads = AdMobManager()

    init() {
        FirebaseBootstrap.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)
                .environment(library)
                .environment(purchases)
                .environment(ads)
                .preferredColorScheme(.dark)
                .task {
                    await auth.start()
                    await purchases.configure()
                    ads.startIfPossible()
                }
                .onOpenURL { url in
                    Task {
                        await library.importSharedURL(url)
                    }
                }
        }
    }
}

enum FirebaseBootstrap {
    static func configure() {
        guard FirebaseApp.app() == nil else { return }

        guard
            let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
            let values = NSDictionary(contentsOfFile: path) as? [String: Any],
            let apiKey = values["API_KEY"] as? String,
            let appID = values["GOOGLE_APP_ID"] as? String,
            !apiKey.contains("__REPLACE"),
            !appID.contains("__REPLACE"),
            let options = FirebaseOptions(contentsOfFile: path)
        else {
            return
        }

        FirebaseApp.configure(options: options)
    }
}
