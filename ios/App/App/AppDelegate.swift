import UIKit
import Capacitor
import Foundation

private let bundledNotificationSounds = [
    "alarm_standard.caf",
    "alarm_zen.caf",
    "alarm_nuclear.caf",
    "alarm_quarter.caf",
    "alarm_spite.caf",
    "alarm_rainbow.caf",
    "alarm_metal.caf",
    "alarm_trap.caf",
    "alarm_break.caf"
]

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        installNotificationSounds()
        return true
    }

    private func installNotificationSounds() {
        guard let libraryDirectory = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else {
            return
        }

        let soundsDirectory = libraryDirectory.appendingPathComponent("Sounds", isDirectory: true)

        do {
            try FileManager.default.createDirectory(at: soundsDirectory, withIntermediateDirectories: true)

            for filename in bundledNotificationSounds {
                let destinationURL = soundsDirectory.appendingPathComponent(filename)
                if FileManager.default.fileExists(atPath: destinationURL.path) {
                    try FileManager.default.removeItem(at: destinationURL)
                }

                let possibleSources = [
                    Bundle.main.resourceURL?.appendingPathComponent("public/\(filename)"),
                    Bundle.main.resourceURL?.appendingPathComponent(filename)
                ].compactMap { $0 }

                guard let sourceURL = possibleSources.first(where: { FileManager.default.fileExists(atPath: $0.path) }) else {
                    NSLog("Wake Up Ya Bish: missing bundled notification sound %@", filename)
                    continue
                }

                try FileManager.default.copyItem(at: sourceURL, to: destinationURL)
            }
        } catch {
            NSLog("Wake Up Ya Bish: failed to install notification sounds %@", error.localizedDescription)
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
