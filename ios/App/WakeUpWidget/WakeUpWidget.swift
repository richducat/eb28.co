import SwiftUI
import WidgetKit

private let widgetSuiteName = "group.com.eb28.alarmclock.shared"
private let widgetStateKey = "wakeUpWidgetState"

private struct StoredWidgetState: Codable {
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
    let updatedAt: String

    static let fallback = StoredWidgetState(
        colorSchemeKey: "standard",
        alarmHours: "06",
        alarmMinutes: "00",
        alarmAmPm: "AM",
        isAlarmActive: false,
        isMuted: false,
        selectedVoice: "standard",
        calendarLinked: false,
        countdownTarget: nil,
        upcomingEventSummary: nil,
        upcomingEventStart: nil,
        updatedAt: ""
    )
}

private struct WakeUpWidgetEntry: TimelineEntry {
    let date: Date
    let state: StoredWidgetState
}

private enum RetroTheme: String, CaseIterable {
    case standard
    case blue
    case green
    case red
    case yellow
    case purple

    init(key: String) {
        self = RetroTheme(rawValue: key) ?? .standard
    }

    var displayColor: Color {
        switch self {
        case .standard: return Color(hex: 0xFF8CE0)
        case .blue: return Color(hex: 0x79ECFF)
        case .green: return Color(hex: 0x7DFFBE)
        case .red: return Color(hex: 0xFF8E8E)
        case .yellow: return Color(hex: 0xFFF08A)
        case .purple: return Color(hex: 0xD08CFF)
        }
    }

    var glowColor: Color {
        switch self {
        case .standard: return Color(hex: 0xFF00AA)
        case .blue: return Color(hex: 0x00CCFF)
        case .green: return Color(hex: 0x00FF88)
        case .red: return Color(hex: 0xFF3B3B)
        case .yellow: return Color(hex: 0xFFE600)
        case .purple: return Color(hex: 0xAA00FF)
        }
    }

    var inactiveColor: Color {
        switch self {
        case .standard: return Color(hex: 0x5A2145)
        case .blue: return Color(hex: 0x123C52)
        case .green: return Color(hex: 0x163F2B)
        case .red: return Color(hex: 0x471D21)
        case .yellow: return Color(hex: 0x4A4320)
        case .purple: return Color(hex: 0x342046)
        }
    }
}

private struct WakeUpTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> WakeUpWidgetEntry {
        WakeUpWidgetEntry(date: Date(), state: .fallback)
    }

    func getSnapshot(in context: Context, completion: @escaping (WakeUpWidgetEntry) -> Void) {
        completion(WakeUpWidgetEntry(date: Date(), state: loadState()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WakeUpWidgetEntry>) -> Void) {
        let state = loadState()
        let calendar = Calendar.current
        let start = calendar.date(bySetting: .second, value: 0, of: Date()) ?? Date()
        let entries = (0..<60).compactMap { minuteOffset -> WakeUpWidgetEntry? in
            guard let entryDate = calendar.date(byAdding: .minute, value: minuteOffset, to: start) else {
                return nil
            }
            return WakeUpWidgetEntry(date: entryDate, state: state)
        }
        let refreshDate = calendar.date(byAdding: .minute, value: 60, to: start) ?? start.addingTimeInterval(3600)
        completion(Timeline(entries: entries, policy: .after(refreshDate)))
    }

    private func loadState() -> StoredWidgetState {
        guard
            let defaults = UserDefaults(suiteName: widgetSuiteName),
            let data = defaults.data(forKey: widgetStateKey),
            let decoded = try? JSONDecoder().decode(StoredWidgetState.self, from: data)
        else {
            return .fallback
        }

        return decoded
    }
}

private struct WakeUpWidgetView: View {
    @Environment(\.widgetFamily) private var family

    let entry: WakeUpTimelineProvider.Entry

    private var theme: RetroTheme {
        RetroTheme(key: entry.state.colorSchemeKey)
    }

    private var timeComponents: (hour: String, minute: String, meridiem: String) {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "hh:mm a"
        let formatted = formatter.string(from: entry.date)
        let pieces = formatted.split(separator: " ")
        let time = pieces.first?.split(separator: ":") ?? ["12", "00"]
        let meridiem = pieces.count > 1 ? String(pieces[1]) : "AM"
        return (String(time.first ?? "12"), String(time.last ?? "00"), meridiem)
    }

    private var dateLabel: String {
        entry.date.formatted(.dateTime.weekday(.abbreviated).month(.defaultDigits).day(.defaultDigits).year(.twoDigits))
            .uppercased()
    }

    private var nextEventDate: Date? {
        guard let upcomingEventStart = entry.state.upcomingEventStart else {
            return nil
        }

        return ISO8601DateFormatter().date(from: upcomingEventStart)
    }

    private var nextAlarmLabel: String {
        if let countdownTarget = entry.state.countdownTarget,
           let countdownDate = ISO8601DateFormatter().date(from: countdownTarget) {
            return "COUNTDOWN \(countdownDate.formatted(.dateTime.hour().minute()).uppercased())"
        }

        let activity = entry.state.isAlarmActive ? "ARMED" : "STANDBY"
        return "\(activity) \(entry.state.alarmHours):\(entry.state.alarmMinutes) \(entry.state.alarmAmPm)"
    }

    private var nextEventLine: String {
        guard entry.state.calendarLinked else {
            return "CALENDAR NOT CONNECTED"
        }

        guard let nextEventDate else {
            return "NO UPCOMING EVENT"
        }

        let header: String
        if Calendar.current.isDateInToday(nextEventDate) {
            header = "TODAY"
        } else if Calendar.current.isDateInTomorrow(nextEventDate) {
            header = "TOMORROW"
        } else {
            header = nextEventDate.formatted(.dateTime.month(.abbreviated).day()).uppercased()
        }

        let time = nextEventDate.formatted(.dateTime.hour().minute()).uppercased()
        let summary = (entry.state.upcomingEventSummary ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

        if summary.isEmpty {
            return "\(header) \(time)"
        }

        return "\(header) \(time) \(summary.uppercased())"
    }

    private func trimmed(_ value: String, limit: Int) -> String {
        let normalized = value
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard normalized.count > limit else {
            return normalized
        }

        guard limit > 3 else {
            return String(normalized.prefix(max(0, limit)))
        }

        let prefix = String(normalized.prefix(limit - 3))
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return "\(prefix)..."
    }

    private func normalizedLabel(_ value: String, fallback: String, limit: Int) -> String {
        let label = trimmed(value, limit: limit)
        return label.isEmpty ? fallback : label
    }

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                smallClock
            default:
                mediumClock
            }
        }
    }

    private var mediumClock: some View {
        GeometryReader { proxy in
            let size = proxy.size
            let padding = max(10, min(14, size.width * 0.04))
            let verticalSpacing = max(5, min(8, size.height * 0.045))
            let digitHeight = max(54, min(72, size.height * 0.43))
            let digitWidth = max(30, min(42, (size.width - padding * 2 - 36) / 4.45))
            let digitSpacing = max(3, min(5, digitWidth * 0.12))
            let colonSize = max(5, min(8, digitWidth * 0.18))
            let statusFont = max(7, min(9, size.height * 0.055))

            ZStack {
                RetroWidgetBackground(glowColor: theme.glowColor)

                VStack(alignment: .leading, spacing: verticalSpacing) {
                    HStack(alignment: .center, spacing: 6) {
                        Text(normalizedLabel(dateLabel, fallback: "TODAY", limit: 18))
                            .font(.system(size: max(9, min(12, size.height * 0.07)), weight: .black, design: .monospaced))
                            .foregroundStyle(Color(hex: 0x1AE7FF))
                            .shadow(color: Color(hex: 0x1AE7FF).opacity(0.6), radius: 8)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)
                            .truncationMode(.tail)

                        Spacer(minLength: 3)

                        HStack(spacing: 3) {
                            ForEach(RetroTheme.allCases, id: \.rawValue) { scheme in
                                Circle()
                                    .fill(scheme == theme ? scheme.glowColor : scheme.glowColor.opacity(0.45))
                                    .frame(width: scheme == theme ? 9 : 7, height: scheme == theme ? 9 : 7)
                                    .overlay(
                                        Circle()
                                            .stroke(Color.black.opacity(0.65), lineWidth: 1)
                                    )
                                    .shadow(color: scheme.glowColor.opacity(scheme == theme ? 0.9 : 0.2), radius: scheme == theme ? 5 : 0)
                            }
                        }
                        .layoutPriority(1)

                        HStack(alignment: .center, spacing: 4) {
                            Text("ALM")
                                .font(.system(size: 8, weight: .black, design: .monospaced))
                                .foregroundStyle(Color(hex: 0x7C88A3))
                                .lineLimit(1)
                            Circle()
                                .fill(entry.state.isAlarmActive ? theme.glowColor : Color(hex: 0x3E4458))
                                .frame(width: 7, height: 7)
                                .shadow(color: theme.glowColor.opacity(entry.state.isAlarmActive ? 0.8 : 0), radius: 5)
                        }
                    }

                    HStack(alignment: .center, spacing: max(3, min(6, size.width * 0.015))) {
                        SevenSegmentPair(value: timeComponents.hour, theme: theme, digitWidth: digitWidth, digitHeight: digitHeight, spacing: digitSpacing)
                        SevenSegmentColon(theme: theme, dotSize: colonSize)
                        SevenSegmentPair(value: timeComponents.minute, theme: theme, digitWidth: digitWidth, digitHeight: digitHeight, spacing: digitSpacing)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("AM")
                                .font(.system(size: max(9, min(12, size.height * 0.075)), weight: .black, design: .monospaced))
                                .foregroundStyle(timeComponents.meridiem == "AM" ? Color(hex: 0x1AE7FF) : Color(hex: 0x47506B))
                                .lineLimit(1)
                            Text("PM")
                                .font(.system(size: max(9, min(12, size.height * 0.075)), weight: .black, design: .monospaced))
                                .foregroundStyle(timeComponents.meridiem == "PM" ? Color(hex: 0x1AE7FF) : Color(hex: 0x47506B))
                                .lineLimit(1)
                        }
                        .padding(.leading, 1)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .layoutPriority(2)

                    VStack(alignment: .leading, spacing: 3) {
                        Text(normalizedLabel(nextAlarmLabel, fallback: "STANDBY", limit: 28))
                            .font(.system(size: statusFont, weight: .black, design: .monospaced))
                            .foregroundStyle(theme.displayColor)
                            .lineLimit(1)
                            .minimumScaleFactor(0.68)
                            .truncationMode(.tail)

                        Text(normalizedLabel(nextEventLine, fallback: "NO EVENT", limit: 34))
                            .font(.system(size: max(6, statusFont - 1), weight: .bold, design: .monospaced))
                            .foregroundStyle(Color(hex: 0x90A0BE))
                            .lineLimit(1)
                            .minimumScaleFactor(0.68)
                            .truncationMode(.tail)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(padding)
                .frame(width: size.width, height: size.height, alignment: .topLeading)
            }
            .frame(width: size.width, height: size.height)
            .clipped()
        }
        .wakeUpWidgetBackground()
    }

    private var smallClock: some View {
        GeometryReader { proxy in
            let size = proxy.size
            let padding = max(10, min(13, min(size.width, size.height) * 0.08))
            let digitHeight = max(42, min(56, size.height * 0.36))
            let digitWidth = max(22, min(30, (size.width - padding * 2 - 18) / 4.4))
            let digitSpacing = max(2, min(4, digitWidth * 0.13))
            let colonSize = max(4, min(6, digitWidth * 0.18))
            let statusFont = max(6, min(8, size.height * 0.05))

            ZStack {
                RetroWidgetBackground(glowColor: theme.glowColor)

                VStack(alignment: .leading, spacing: max(5, min(7, size.height * 0.04))) {
                    HStack(spacing: 6) {
                        Text(normalizedLabel(entry.date.formatted(.dateTime.weekday(.abbreviated)).uppercased(), fallback: "NOW", limit: 8))
                            .font(.system(size: max(10, min(13, size.height * 0.075)), weight: .black, design: .monospaced))
                            .foregroundStyle(Color(hex: 0x1AE7FF))
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)

                        Spacer(minLength: 2)

                        Text(timeComponents.meridiem)
                            .font(.system(size: 8, weight: .black, design: .monospaced))
                            .foregroundStyle(Color(hex: 0x90A0BE))
                            .lineLimit(1)

                        Circle()
                            .fill(entry.state.isAlarmActive ? theme.glowColor : Color(hex: 0x3E4458))
                            .frame(width: 8, height: 8)
                            .shadow(color: theme.glowColor.opacity(entry.state.isAlarmActive ? 0.75 : 0), radius: 7)
                    }

                    HStack(alignment: .center, spacing: 4) {
                        SevenSegmentPair(value: timeComponents.hour, theme: theme, digitWidth: digitWidth, digitHeight: digitHeight, spacing: digitSpacing)
                        SevenSegmentColon(theme: theme, dotSize: colonSize)
                        SevenSegmentPair(value: timeComponents.minute, theme: theme, digitWidth: digitWidth, digitHeight: digitHeight, spacing: digitSpacing)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .layoutPriority(2)

                    VStack(alignment: .leading, spacing: 3) {
                        Text(normalizedLabel(nextAlarmLabel, fallback: "STANDBY", limit: 18))
                            .font(.system(size: statusFont, weight: .black, design: .monospaced))
                            .foregroundStyle(theme.displayColor)
                            .lineLimit(1)
                            .minimumScaleFactor(0.62)
                            .truncationMode(.tail)

                        Text(normalizedLabel(nextEventLine, fallback: "NO EVENT", limit: 24))
                            .font(.system(size: max(5, statusFont - 1), weight: .bold, design: .monospaced))
                            .foregroundStyle(Color(hex: 0x90A0BE))
                            .lineLimit(2)
                            .minimumScaleFactor(0.62)
                            .truncationMode(.tail)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(padding)
                .frame(width: size.width, height: size.height, alignment: .topLeading)
            }
            .frame(width: size.width, height: size.height)
            .clipped()
        }
        .wakeUpWidgetBackground()
    }
}

private struct RetroWidgetBackground: View {
    let glowColor: Color

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(hex: 0x141B22),
                    Color(hex: 0x090D13)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Circle()
                .fill(glowColor.opacity(0.18))
                .blur(radius: 50)
                .frame(width: 200, height: 200)
                .offset(x: -95, y: -40)

            Circle()
                .fill(Color(hex: 0x00F0FF).opacity(0.08))
                .blur(radius: 36)
                .frame(width: 110, height: 110)
                .offset(x: 125, y: 55)

            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(Color.white.opacity(0.04), lineWidth: 1.5)
                .padding(5)
        }
    }
}

private struct SevenSegmentPair: View {
    let value: String
    let theme: RetroTheme
    let digitWidth: CGFloat
    let digitHeight: CGFloat
    let spacing: CGFloat

    var body: some View {
        HStack(spacing: spacing) {
            ForEach(Array(value.enumerated()), id: \.offset) { _, character in
                SevenSegmentDigit(character: character, theme: theme)
                    .frame(width: digitWidth, height: digitHeight)
            }
        }
    }
}

private struct SevenSegmentColon: View {
    let theme: RetroTheme
    let dotSize: CGFloat

    var body: some View {
        VStack(spacing: dotSize * 1.35) {
            Circle()
                .fill(theme.displayColor)
                .frame(width: dotSize, height: dotSize)
                .shadow(color: theme.glowColor.opacity(0.8), radius: 8)
            Circle()
                .fill(theme.displayColor)
                .frame(width: dotSize, height: dotSize)
                .shadow(color: theme.glowColor.opacity(0.8), radius: 8)
        }
        .padding(.horizontal, 2)
    }
}

private struct SevenSegmentDigit: View {
    let character: Character
    let theme: RetroTheme

    private var activeSegments: Set<Int> {
        switch character {
        case "0": return [0, 1, 2, 4, 5, 6]
        case "1": return [2, 5]
        case "2": return [0, 2, 3, 4, 6]
        case "3": return [0, 2, 3, 5, 6]
        case "4": return [1, 2, 3, 5]
        case "5": return [0, 1, 3, 5, 6]
        case "6": return [0, 1, 3, 4, 5, 6]
        case "7": return [0, 2, 5]
        case "8": return [0, 1, 2, 3, 4, 5, 6]
        case "9": return [0, 1, 2, 3, 5, 6]
        default: return []
        }
    }

    var body: some View {
        GeometryReader { geometry in
            let size = geometry.size
            let thickness = max(5, min(size.width, size.height) * 0.14)
            let halfHeight = (size.height - (thickness * 3)) / 2

            ZStack {
                segment(width: size.width - thickness * 0.65, height: thickness)
                    .position(x: size.width / 2, y: thickness / 2)
                    .opacity(activeSegments.contains(0) ? 1 : 0.16)
                segment(width: thickness, height: halfHeight)
                    .position(x: thickness / 2, y: halfHeight / 2 + thickness)
                    .opacity(activeSegments.contains(1) ? 1 : 0.16)
                segment(width: thickness, height: halfHeight)
                    .position(x: size.width - thickness / 2, y: halfHeight / 2 + thickness)
                    .opacity(activeSegments.contains(2) ? 1 : 0.16)
                segment(width: size.width - thickness * 0.65, height: thickness)
                    .position(x: size.width / 2, y: size.height / 2)
                    .opacity(activeSegments.contains(3) ? 1 : 0.16)
                segment(width: thickness, height: halfHeight)
                    .position(x: thickness / 2, y: size.height - halfHeight / 2 - thickness)
                    .opacity(activeSegments.contains(4) ? 1 : 0.16)
                segment(width: thickness, height: halfHeight)
                    .position(x: size.width - thickness / 2, y: size.height - halfHeight / 2 - thickness)
                    .opacity(activeSegments.contains(5) ? 1 : 0.16)
                segment(width: size.width - thickness * 0.65, height: thickness)
                    .position(x: size.width / 2, y: size.height - thickness / 2)
                    .opacity(activeSegments.contains(6) ? 1 : 0.16)
            }
        }
    }

    private func segment(width: CGFloat, height: CGFloat) -> some View {
        Capsule(style: .continuous)
            .fill(theme.displayColor)
            .frame(width: width, height: height)
            .shadow(color: theme.glowColor.opacity(0.9), radius: 16)
            .overlay(
                Capsule(style: .continuous)
                    .fill(theme.inactiveColor.opacity(0.35))
                    .blendMode(.screen)
            )
    }
}

private struct WakeUpWidget: Widget {
    let kind: String = "WakeUpWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WakeUpTimelineProvider()) { entry in
            WakeUpWidgetView(entry: entry)
        }
        .configurationDisplayName("Wake Up Ya Bish Clock")
        .description("A neon alarm clock widget that mirrors your active alarm and next event.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct WakeUpWidgetBundle: WidgetBundle {
    var body: some Widget {
        WakeUpWidget()
    }
}

private extension View {
    @ViewBuilder
    func wakeUpWidgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) {
                Color.clear
            }
        } else {
            self
        }
    }
}

private extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: 1
        )
    }
}
