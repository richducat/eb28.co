import SwiftUI

@main
struct LimitlessCreditGPSApp: App {
    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(red: 2 / 255, green: 6 / 255, blue: 23 / 255)
                    .ignoresSafeArea()
                WebShellView()
            }
            .preferredColorScheme(.dark)
        }
    }
}
