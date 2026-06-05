import Capacitor
import Foundation
import WidgetKit

private let wakeUpWidgetSuiteName = "group.com.eb28.alarmclock.shared"
private let wakeUpWidgetStateKey = "wakeUpWidgetState"

private struct WakeUpWidgetStatePayload: Codable {
    let colorSchemeKey: String
    let alarmHours: String
    let alarmMinutes: String
    let alarmAmPm: String
    let isAlarmActive: Bool
    let isMuted: Bool
    let selectedVoice: String
    let calendarLinked: Bool
    let countdownTarget: String?
    let upcomingEventSummary: String?
    let upcomingEventStart: String?
    let habitDay: Int
    let habitProgress: Int
    let habitCompletedToday: Bool
    let habitTitle: String
    let quoteText: String
    let quoteAuthor: String
    let updatedAt: String
}

@objc(WakeUpWidgetBridgePlugin)
public class WakeUpWidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WakeUpWidgetBridgePlugin"
    public let jsName = "WakeUpWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncWidgetState", returnType: CAPPluginReturnPromise)
    ]

    private let encoder = JSONEncoder()
    private let isoFormatter = ISO8601DateFormatter()

    @objc public func syncWidgetState(_ call: CAPPluginCall) {
        guard let sharedDefaults = UserDefaults(suiteName: wakeUpWidgetSuiteName) else {
            call.reject("Unable to access the shared widget container.")
            return
        }

        let payload = WakeUpWidgetStatePayload(
            colorSchemeKey: call.getString("colorSchemeKey") ?? "standard",
            alarmHours: call.getString("alarmHours") ?? "06",
            alarmMinutes: call.getString("alarmMinutes") ?? "00",
            alarmAmPm: call.getString("alarmAmPm") ?? "AM",
            isAlarmActive: call.getBool("isAlarmActive") ?? false,
            isMuted: call.getBool("isMuted") ?? false,
            selectedVoice: call.getString("selectedVoice") ?? "standard",
            calendarLinked: call.getBool("calendarLinked") ?? false,
            countdownTarget: call.getString("countdownTarget"),
            upcomingEventSummary: call.getString("upcomingEventSummary"),
            upcomingEventStart: call.getString("upcomingEventStart"),
            habitDay: min(67, max(1, call.getInt("habitDay") ?? 1)),
            habitProgress: min(100, max(0, call.getInt("habitProgress") ?? 0)),
            habitCompletedToday: call.getBool("habitCompletedToday") ?? false,
            habitTitle: call.getString("habitTitle") ?? "Daily Mission",
            quoteText: call.getString("quoteText") ?? "When one part of your day gets disrupted, do not call the whole day ruined. Ask what is my next best move now, and do only that.",
            quoteAuthor: call.getString("quoteAuthor") ?? "Wake Up Ya Bish",
            updatedAt: isoFormatter.string(from: Date())
        )

        do {
            let data = try encoder.encode(payload)
            sharedDefaults.set(data, forKey: wakeUpWidgetStateKey)
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve([
                "synced": true,
                "suiteName": wakeUpWidgetSuiteName
            ])
        } catch {
            call.reject("Widget sync failed: \(error.localizedDescription)")
        }
    }
}
