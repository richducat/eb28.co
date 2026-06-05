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
    let habitDay: Int?
    let habitProgress: Int?
    let habitCompletedToday: Bool?
    let habitTitle: String?
    let quoteText: String?
    let quoteAuthor: String?
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
        habitDay: 1,
        habitProgress: 2,
        habitCompletedToday: false,
        habitTitle: "Daily Mission",
        quoteText: "When one part of your day gets disrupted, do not call the whole day ruined. Ask what is my next best move now, and do only that.",
        quoteAuthor: "Wake Up Ya Bish",
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

    private var habitDay: Int {
        min(67, max(1, entry.state.habitDay ?? 1))
    }

    private var habitProgress: Int {
        let fallback = Int((Double(habitDay) / 67.0) * 100.0)
        return min(100, max(0, entry.state.habitProgress ?? fallback))
    }

    private var habitTitle: String {
        normalizedLabel(entry.state.habitTitle ?? "Daily Mission", fallback: "Daily Mission", limit: 26)
    }

    private var quoteText: String {
        normalizedLabel(entry.state.quoteText ?? StoredWidgetState.fallback.quoteText ?? "", fallback: "Make the next best move.", limit: 170)
    }

    private var quoteAuthor: String {
        normalizedLabel(entry.state.quoteAuthor ?? StoredWidgetState.fallback.quoteAuthor ?? "", fallback: "Wake Up Ya Bish", limit: 28)
    }

    private var nextAlarmLabel: String {
        if let countdownTarget = entry.state.countdownTarget,
           let countdownDate = ISO8601DateFormatter().date(from: countdownTarget) {
            return "TIMER \(countdownDate.formatted(.dateTime.hour().minute()).uppercased())"
        }

        let activity = entry.state.isAlarmActive ? "ARMED" : "STANDBY"
        return "\(activity) \(entry.state.alarmHours):\(entry.state.alarmMinutes) \(entry.state.alarmAmPm)"
    }

    private var nextEventLine: String {
        guard entry.state.calendarLinked else {
            return "CALENDAR OFFLINE"
        }

        guard let nextEventDate else {
            return "NO NEXT EVENT"
        }

        let day: String
        if Calendar.current.isDateInToday(nextEventDate) {
            day = "TODAY"
        } else if Calendar.current.isDateInTomorrow(nextEventDate) {
            day = "TOMORROW"
        } else {
            day = nextEventDate.formatted(.dateTime.month(.abbreviated).day()).uppercased()
        }

        let time = nextEventDate.formatted(.dateTime.hour().minute()).uppercased()
        let summary = normalizedLabel(entry.state.upcomingEventSummary ?? "", fallback: "", limit: 30)

        return summary.isEmpty ? "\(day) \(time)" : "\(day) \(time) \(summary.uppercased())"
    }

    private var completedLabel: String {
        (entry.state.habitCompletedToday ?? false) ? "MISSION DONE" : "MISSION OPEN"
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
                smallConsole
            case .systemLarge:
                largeConsole
            default:
                mediumConsole
            }
        }
        .widgetURL(URL(string: "wakeupyabish://open"))
    }

    private var largeConsole: some View {
        GeometryReader { proxy in
            let size = proxy.size
            let padding = max(15, min(22, size.width * 0.055))

            ZStack {
                NeonConsoleBackground(theme: theme)

                VStack(alignment: .leading, spacing: 14) {
                    PremiumHeader(theme: theme, status: entry.state.isAlarmActive ? "ALARM LIVE" : "READY")

                    HStack(alignment: .top, spacing: 14) {
                        TimePanel(
                            hour: timeComponents.hour,
                            minute: timeComponents.minute,
                            meridiem: timeComponents.meridiem,
                            dateLabel: dateLabel,
                            theme: theme,
                            compact: false
                        )
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 10) {
                            NeonMetric(label: "NEXT", value: normalizedLabel(nextAlarmLabel, fallback: "STANDBY", limit: 22), color: theme.displayColor)
                            NeonMetric(label: "CAL", value: normalizedLabel(nextEventLine, fallback: "NO EVENT", limit: 32), color: Color(hex: 0x79ECFF))
                        }
                        .frame(maxWidth: .infinity)
                    }

                    HabitConsole(
                        day: habitDay,
                        progress: habitProgress,
                        title: habitTitle,
                        status: completedLabel,
                        theme: theme
                    )

                    HStack(spacing: 8) {
                        StatusPill(label: entry.state.isMuted ? "SILENT" : "SOUND ON", color: Color(hex: 0xFFF08A))
                        StatusPill(label: entry.state.calendarLinked ? "CAL LINKED" : "CAL OFF", color: Color(hex: 0x79ECFF))
                        StatusPill(label: entry.state.selectedVoice.uppercased(), color: theme.displayColor)
                    }
                }
                .padding(padding)
                .frame(width: size.width, height: size.height, alignment: .topLeading)
            }
            .frame(width: size.width, height: size.height)
            .clipped()
        }
        .wakeUpWidgetBackground()
    }

    private var mediumConsole: some View {
        GeometryReader { proxy in
            let size = proxy.size
            let padding = max(10, min(15, size.width * 0.04))

            ZStack {
                NeonConsoleBackground(theme: theme)

                VStack(alignment: .leading, spacing: 9) {
                    PremiumHeader(theme: theme, status: entry.state.isAlarmActive ? "ARMED" : "READY")

                    HStack(alignment: .center, spacing: 11) {
                        TimePanel(
                            hour: timeComponents.hour,
                            minute: timeComponents.minute,
                            meridiem: timeComponents.meridiem,
                            dateLabel: dateLabel,
                            theme: theme,
                            compact: true
                        )
                        .frame(maxWidth: .infinity)

                        VStack(alignment: .leading, spacing: 8) {
                            Text(normalizedLabel(nextAlarmLabel, fallback: "STANDBY", limit: 22))
                                .font(.system(size: 9, weight: .black, design: .monospaced))
                                .foregroundStyle(theme.displayColor)
                                .lineLimit(1)
                                .minimumScaleFactor(0.65)

                            Text(normalizedLabel(nextEventLine, fallback: "NO EVENT", limit: 30))
                                .font(.system(size: 8, weight: .bold, design: .monospaced))
                                .foregroundStyle(Color(hex: 0x9FB3CE))
                                .lineLimit(2)
                                .minimumScaleFactor(0.65)

                            MiniProgress(label: "DAY \(habitDay)", progress: habitProgress, color: Color(hex: 0xFFF08A))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(padding)
                .frame(width: size.width, height: size.height, alignment: .topLeading)
            }
            .frame(width: size.width, height: size.height)
            .clipped()
        }
        .wakeUpWidgetBackground()
    }

    private var smallConsole: some View {
        GeometryReader { proxy in
            let size = proxy.size
            let padding = max(10, min(13, min(size.width, size.height) * 0.08))

            ZStack {
                NeonConsoleBackground(theme: theme)

                VStack(alignment: .leading, spacing: 7) {
                    HStack(spacing: 6) {
                        Image(systemName: "waveform.path.ecg")
                            .font(.system(size: 15, weight: .black))
                            .foregroundStyle(Color(hex: 0x79ECFF))
                            .shadow(color: Color(hex: 0x79ECFF).opacity(0.8), radius: 7)

                        Text("WAKE")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .foregroundStyle(theme.displayColor)
                            .lineLimit(1)

                        Spacer(minLength: 2)

                        Circle()
                            .fill(entry.state.isAlarmActive ? theme.glowColor : Color(hex: 0x3E4458))
                            .frame(width: 8, height: 8)
                            .shadow(color: theme.glowColor.opacity(entry.state.isAlarmActive ? 0.8 : 0), radius: 7)
                    }

                    TimePanel(
                        hour: timeComponents.hour,
                        minute: timeComponents.minute,
                        meridiem: timeComponents.meridiem,
                        dateLabel: dateLabel,
                        theme: theme,
                        compact: true
                    )

                    Text(normalizedLabel(nextAlarmLabel, fallback: "STANDBY", limit: 18))
                        .font(.system(size: 8, weight: .black, design: .monospaced))
                        .foregroundStyle(theme.displayColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.62)

                    MiniProgress(label: "DAY \(habitDay)", progress: habitProgress, color: Color(hex: 0xFFF08A))
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

private struct PremiumHeader: View {
    let theme: RetroTheme
    let status: String

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: "waveform.path.ecg")
                .font(.system(size: 15, weight: .black))
                .foregroundStyle(Color(hex: 0x79ECFF))
                .shadow(color: Color(hex: 0x79ECFF).opacity(0.85), radius: 8)

            Text("WAKE UP")
                .font(.system(size: 11, weight: .black, design: .rounded))
                .foregroundStyle(theme.displayColor)
                .lineLimit(1)

            Text("YA BISH")
                .font(.system(size: 11, weight: .black, design: .rounded))
                .foregroundStyle(Color(hex: 0xFFF08A))
                .lineLimit(1)

            Spacer(minLength: 4)

            StatusPill(label: status, color: Color(hex: 0x79ECFF))
        }
    }
}

private struct TimePanel: View {
    let hour: String
    let minute: String
    let meridiem: String
    let dateLabel: String
    let theme: RetroTheme
    let compact: Bool

    var body: some View {
        GeometryReader { geometry in
            let size = geometry.size
            let digitHeight = compact ? max(38, min(55, size.height * 0.62)) : max(54, min(72, size.height * 0.55))
            let digitWidth = compact ? max(20, min(30, (size.width - 27) / 4.4)) : max(29, min(40, (size.width - 34) / 4.5))
            let digitSpacing = max(2, min(5, digitWidth * 0.12))
            let colonSize = max(4, min(7, digitWidth * 0.18))

            VStack(alignment: .leading, spacing: compact ? 4 : 8) {
                HStack(spacing: 5) {
                    Text(dateLabel)
                        .font(.system(size: compact ? 8 : 9, weight: .black, design: .monospaced))
                        .foregroundStyle(Color(hex: 0x79ECFF))
                        .lineLimit(1)
                        .minimumScaleFactor(0.68)

                    Spacer(minLength: 3)

                    Text(meridiem)
                        .font(.system(size: compact ? 8 : 10, weight: .black, design: .monospaced))
                        .foregroundStyle(Color(hex: 0xFFF08A))
                }

                HStack(alignment: .center, spacing: max(3, min(6, size.width * 0.015))) {
                    SevenSegmentPair(value: hour, theme: theme, digitWidth: digitWidth, digitHeight: digitHeight, spacing: digitSpacing)
                    SevenSegmentColon(theme: theme, dotSize: colonSize)
                    SevenSegmentPair(value: minute, theme: theme, digitWidth: digitWidth, digitHeight: digitHeight, spacing: digitSpacing)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(minHeight: compact ? 76 : 98)
    }
}

private struct HabitConsole: View {
    let day: Int
    let progress: Int
    let title: String
    let status: String
    let theme: RetroTheme

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("HABIT DAY \(day)")
                        .font(.system(size: 15, weight: .black, design: .rounded))
                        .foregroundStyle(Color(hex: 0xFFF08A))
                        .lineLimit(1)
                    Text(title.uppercased())
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundStyle(Color.white.opacity(0.78))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }

                Spacer(minLength: 8)

                Text(status)
                    .font(.system(size: 9, weight: .black, design: .monospaced))
                    .foregroundStyle(status.contains("DONE") ? Color(hex: 0x7DFFBE) : theme.displayColor)
                    .lineLimit(1)
            }

            MiniProgress(label: "\(progress)% COMPLETE", progress: progress, color: theme.displayColor)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(Color(hex: 0x120916).opacity(0.78))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color(hex: 0xFFF08A).opacity(0.58), lineWidth: 1.5)
        )
        .shadow(color: Color(hex: 0xFFF08A).opacity(0.24), radius: 14)
    }
}

private struct NeonMetric: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.system(size: 8, weight: .black, design: .monospaced))
                .foregroundStyle(color.opacity(0.75))
                .lineLimit(1)

            Text(value.uppercased())
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(color)
                .lineLimit(2)
                .minimumScaleFactor(0.64)
        }
        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(hex: 0x090D13).opacity(0.72))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(color.opacity(0.42), lineWidth: 1)
        )
    }
}

private struct MiniProgress: View {
    let label: String
    let progress: Int
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(size: 8, weight: .black, design: .monospaced))
                    .foregroundStyle(color)
                    .lineLimit(1)
                Spacer(minLength: 4)
                Text("\(progress)%")
                    .font(.system(size: 8, weight: .black, design: .monospaced))
                    .foregroundStyle(Color.white.opacity(0.76))
                    .lineLimit(1)
            }

            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.12))
                    Capsule()
                        .fill(color)
                        .frame(width: proxy.size.width * CGFloat(min(100, max(0, progress))) / 100.0)
                        .shadow(color: color.opacity(0.8), radius: 7)
                }
            }
            .frame(height: 7)
        }
    }
}

private struct StatusPill: View {
    let label: String
    let color: Color

    var body: some View {
        Text(label)
            .font(.system(size: 8, weight: .black, design: .monospaced))
            .foregroundStyle(color)
            .lineLimit(1)
            .minimumScaleFactor(0.68)
            .padding(.horizontal, 7)
            .padding(.vertical, 4)
            .background(Capsule().fill(color.opacity(0.13)))
            .overlay(Capsule().stroke(color.opacity(0.5), lineWidth: 1))
    }
}

private struct NeonConsoleBackground: View {
    let theme: RetroTheme

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(hex: 0x2E1A28),
                    Color(hex: 0x120916),
                    Color(hex: 0x080B12)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            GridLines(step: 18)
                .stroke(Color(hex: 0xFF00FF).opacity(0.16), lineWidth: 1)

            GridLines(step: 54)
                .stroke(Color(hex: 0x79ECFF).opacity(0.12), lineWidth: 1.25)

            RadialGradient(
                colors: [theme.glowColor.opacity(0.24), Color.clear],
                center: .topLeading,
                startRadius: 12,
                endRadius: 170
            )

            RadialGradient(
                colors: [Color(hex: 0xFFF08A).opacity(0.16), Color.clear],
                center: .bottomTrailing,
                startRadius: 4,
                endRadius: 140
            )
        }
    }
}

private struct HabitTrackerWidgetView: View {
    @Environment(\.widgetFamily) private var family

    let entry: WakeUpTimelineProvider.Entry

    private var theme: RetroTheme {
        RetroTheme(key: entry.state.colorSchemeKey)
    }

    private var habitDay: Int {
        min(67, max(1, entry.state.habitDay ?? 1))
    }

    private var habitProgress: Int {
        let fallback = Int((Double(habitDay) / 67.0) * 100.0)
        return min(100, max(0, entry.state.habitProgress ?? fallback))
    }

    private var habitTitle: String {
        normalizedLabel(entry.state.habitTitle ?? "Daily Mission", fallback: "Daily Mission", limit: family == .systemLarge ? 46 : 30)
    }

    private var completedLabel: String {
        (entry.state.habitCompletedToday ?? false) ? "MISSION DONE" : "MISSION OPEN"
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

        return "\(String(normalized.prefix(limit - 3)).trimmingCharacters(in: .whitespacesAndNewlines))..."
    }

    private func normalizedLabel(_ value: String, fallback: String, limit: Int) -> String {
        let label = trimmed(value, limit: limit)
        return label.isEmpty ? fallback : label
    }

    var body: some View {
        GeometryReader { proxy in
            let size = proxy.size
            let padding = max(13, min(20, min(size.width, size.height) * 0.095))
            let ringSize = family == .systemSmall
                ? min(size.width, size.height) * 0.54
                : min(size.width * 0.38, size.height * 0.7)

            ZStack {
                NeonConsoleBackground(theme: theme)

                if family == .systemSmall {
                    VStack(alignment: .leading, spacing: 8) {
                        WidgetLabel(systemImage: "checkmark.circle.fill", title: "HABIT", color: theme.displayColor)
                        Spacer(minLength: 2)
                        CircularProgressBadge(progress: habitProgress, color: Color(hex: 0x79ECFF), size: ringSize)
                            .frame(maxWidth: .infinity)
                        Spacer(minLength: 2)
                        Text("DAY \(habitDay)")
                            .font(.system(size: 16, weight: .black, design: .rounded))
                            .foregroundStyle(Color(hex: 0xFFF08A))
                        Text(completedLabel)
                            .font(.system(size: 8, weight: .black, design: .monospaced))
                            .foregroundStyle(Color.white.opacity(0.76))
                            .lineLimit(1)
                    }
                    .padding(padding)
                } else {
                    HStack(spacing: family == .systemLarge ? 18 : 14) {
                        CircularProgressBadge(progress: habitProgress, color: Color(hex: 0x79ECFF), size: ringSize)

                        VStack(alignment: .leading, spacing: family == .systemLarge ? 12 : 8) {
                            WidgetLabel(systemImage: "bolt.fill", title: "HABIT TRACKER", color: theme.displayColor)

                            Text("DAY \(habitDay)")
                                .font(.system(size: family == .systemLarge ? 34 : 24, weight: .black, design: .rounded))
                                .foregroundStyle(Color(hex: 0xFFF08A))
                                .lineLimit(1)

                            Text(habitTitle.uppercased())
                                .font(.system(size: family == .systemLarge ? 14 : 10, weight: .black, design: .monospaced))
                                .foregroundStyle(Color.white.opacity(0.82))
                                .lineLimit(family == .systemLarge ? 3 : 2)
                                .minimumScaleFactor(0.72)

                            MiniProgress(label: completedLabel, progress: habitProgress, color: theme.displayColor)

                            if family == .systemLarge {
                                HStack(spacing: 8) {
                                    StatusPill(label: "67 DAY TARGET", color: Color(hex: 0x79ECFF))
                                    StatusPill(label: "\(habitProgress)%", color: Color(hex: 0xFFF08A))
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(padding)
                }
            }
            .frame(width: size.width, height: size.height)
            .clipped()
        }
        .wakeUpWidgetBackground()
        .widgetURL(URL(string: "wakeupyabish://habit"))
    }
}

private struct QuoteOfDayWidgetView: View {
    @Environment(\.widgetFamily) private var family

    let entry: WakeUpTimelineProvider.Entry

    private var theme: RetroTheme {
        RetroTheme(key: entry.state.colorSchemeKey)
    }

    private var quoteText: String {
        normalizedLabel(entry.state.quoteText ?? StoredWidgetState.fallback.quoteText ?? "", fallback: "Make the next best move.", limit: family == .systemSmall ? 88 : 190)
    }

    private var quoteAuthor: String {
        normalizedLabel(entry.state.quoteAuthor ?? StoredWidgetState.fallback.quoteAuthor ?? "", fallback: "Wake Up Ya Bish", limit: 28)
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

        return "\(String(normalized.prefix(limit - 3)).trimmingCharacters(in: .whitespacesAndNewlines))..."
    }

    private func normalizedLabel(_ value: String, fallback: String, limit: Int) -> String {
        let label = trimmed(value, limit: limit)
        return label.isEmpty ? fallback : label
    }

    var body: some View {
        GeometryReader { proxy in
            let size = proxy.size
            let padding = max(14, min(22, min(size.width, size.height) * 0.1))

            ZStack {
                NeonConsoleBackground(theme: theme)

                VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 12) {
                    WidgetLabel(systemImage: "quote.opening", title: "QUOTE OF THE DAY", color: Color(hex: 0x79ECFF))

                    Spacer(minLength: 0)

                    Text("\"\(quoteText)\"")
                        .font(.system(size: family == .systemSmall ? 13 : family == .systemLarge ? 22 : 18, weight: .black, design: .rounded))
                        .foregroundStyle(Color.white)
                        .lineLimit(family == .systemSmall ? 5 : family == .systemLarge ? 7 : 4)
                        .minimumScaleFactor(0.7)
                        .shadow(color: Color.white.opacity(0.32), radius: 7)

                    Spacer(minLength: 0)

                    HStack {
                        Text(quoteAuthor.uppercased())
                            .font(.system(size: family == .systemSmall ? 8 : 10, weight: .black, design: .monospaced))
                            .foregroundStyle(theme.displayColor)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)

                        Spacer(minLength: 8)

                        StatusPill(label: "TODAY", color: Color(hex: 0xFFF08A))
                    }
                }
                .padding(padding)
            }
            .frame(width: size.width, height: size.height)
            .clipped()
        }
        .wakeUpWidgetBackground()
        .widgetURL(URL(string: "wakeupyabish://quote"))
    }
}

private struct WidgetLabel: View {
    let systemImage: String
    let title: String
    let color: Color

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: systemImage)
                .font(.system(size: 13, weight: .black))
                .foregroundStyle(color)
                .shadow(color: color.opacity(0.8), radius: 7)

            Text(title)
                .font(.system(size: 10, weight: .black, design: .monospaced))
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.68)
        }
    }
}

private struct CircularProgressBadge: View {
    let progress: Int
    let color: Color
    let size: CGFloat

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.16), lineWidth: max(7, size * 0.085))

            Circle()
                .trim(from: 0, to: CGFloat(min(100, max(0, progress))) / 100.0)
                .stroke(
                    color,
                    style: StrokeStyle(lineWidth: max(7, size * 0.085), lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .shadow(color: color.opacity(0.88), radius: 10)

            VStack(spacing: 2) {
                Text("\(progress)%")
                    .font(.system(size: max(17, size * 0.22), weight: .black, design: .rounded))
                    .foregroundStyle(Color.white)
                    .minimumScaleFactor(0.72)
                Text("DONE")
                    .font(.system(size: max(7, size * 0.08), weight: .black, design: .monospaced))
                    .foregroundStyle(Color(hex: 0xFFF08A))
            }
        }
        .frame(width: size, height: size)
    }
}

private struct GridLines: Shape {
    let step: CGFloat

    func path(in rect: CGRect) -> Path {
        var path = Path()
        var x = rect.minX
        while x <= rect.maxX {
            path.move(to: CGPoint(x: x, y: rect.minY))
            path.addLine(to: CGPoint(x: x, y: rect.maxY))
            x += step
        }

        var y = rect.minY
        while y <= rect.maxY {
            path.move(to: CGPoint(x: rect.minX, y: y))
            path.addLine(to: CGPoint(x: rect.maxX, y: y))
            y += step
        }

        return path
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
            let thickness = max(4, min(size.width, size.height) * 0.14)
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
            .shadow(color: theme.glowColor.opacity(0.9), radius: 14)
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
        .configurationDisplayName("Wake Up Ya Bish")
        .description("Premium neon alarm, calendar, and habit console for your Home Screen.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .disableContentMarginsIfNeeded()
    }
}

private struct WakeUpHabitWidget: Widget {
    let kind: String = "WakeUpHabitWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WakeUpTimelineProvider()) { entry in
            HabitTrackerWidgetView(entry: entry)
        }
        .configurationDisplayName("Wake Up Habit Tracker")
        .description("Track your 67-day mission from a premium neon iOS widget.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .disableContentMarginsIfNeeded()
    }
}

private struct WakeUpQuoteWidget: Widget {
    let kind: String = "WakeUpQuoteWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WakeUpTimelineProvider()) { entry in
            QuoteOfDayWidgetView(entry: entry)
        }
        .configurationDisplayName("Wake Up Quote")
        .description("A daily motivational quote in the Wake Up Ya Bish retro style.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .disableContentMarginsIfNeeded()
    }
}

@main
struct WakeUpWidgetBundle: WidgetBundle {
    var body: some Widget {
        WakeUpWidget()
        WakeUpHabitWidget()
        WakeUpQuoteWidget()
    }
}

private extension View {
    @ViewBuilder
    func wakeUpWidgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) {
                Color(hex: 0x090D13)
            }
        } else {
            background(Color(hex: 0x090D13))
        }
    }
}

private extension WidgetConfiguration {
    func disableContentMarginsIfNeeded() -> some WidgetConfiguration {
        #if compiler(>=5.9)
        if #available(iOSApplicationExtension 17.0, *) {
            return self.contentMarginsDisabled()
        }
        #endif
        return self
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
