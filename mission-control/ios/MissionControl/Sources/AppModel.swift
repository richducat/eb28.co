import Foundation
import SwiftUI
import UIKit
import UserNotifications

@MainActor
final class AppModel: ObservableObject {
    @Published var pairing: Pairing?
    @Published var board: Board?
    @Published var trading: Trading?
    @Published var tyfys: Tyfys?
    @Published var cos: CosResponse?
    @Published var usage: Usage?
    @Published var asks: [String: Ask] = [:]
    @Published var connected = false
    @Published var error: String?
    @Published var toast: String?
    @Published var lastSync: Date?
    @Published var busy: Set<String> = []
    @Published var today: TodayData?
    /// nil = follow today (so the app rolls over at midnight); set when Richard pages to another day
    @Published var pinnedDay: String?
    var day: String { pinnedDay ?? Fmt.ymd(Date()) }

    let api: API
    private var poller: Task<Void, Never>?

    init() {
        #if DEBUG
        // simulator testing only: pair from a launch environment variable (no camera there)
        if let code = ProcessInfo.processInfo.environment["MC_PAIRING"], let dp = Pairing.parse(code) { PairingStore.save(dp) }
        #endif
        let p = PairingStore.load()
        pairing = p
        api = API(pairing: p)
    }

    // MARK: pairing

    func pair(with text: String) -> Bool {
        guard let p = Pairing.parse(text) else { return false }
        PairingStore.save(p)
        api.use(p)
        pairing = p
        Task { await refresh() }
        return true
    }

    func unpair() {
        PairingStore.clear()
        api.use(nil)
        pairing = nil
        board = nil; trading = nil; tyfys = nil; cos = nil; usage = nil; asks = [:]
        connected = false
    }

    // MARK: loading

    func startPolling() {
        poller?.cancel()
        poller = Task { [weak self] in
            while !Task.isCancelled {
                await self?.refresh()
                try? await Task.sleep(nanoseconds: 20_000_000_000)
            }
        }
    }

    func stopPolling() {
        poller?.cancel()
        poller = nil
    }

    func refresh() async {
        guard pairing != nil else { return }
        do {
            let b: Board = try await api.get("/api/board")
            board = b
            connected = true
            error = nil
            lastSync = Date()
        } catch {
            connected = false
            self.error = error.localizedDescription
            if case APIError.unauthorized = error { unpair() }
            return
        }
        await loadToday()
        async let t: Trading? = try? api.get("/api/trading")
        async let y: Tyfys? = try? api.get("/api/tyfys")
        async let c: CosResponse? = try? api.get("/api/cos")
        async let u: Usage? = try? api.get("/api/usage")
        let (tt, yy, cc, uu) = await (t, y, c, u)
        if let tt { trading = tt }
        if let yy { tyfys = yy }
        if let cc { cos = cc }
        if let uu { usage = uu }
        // drop answers for jobs that no longer need Richard
        let waiting = Set((board?.jobs("needs_you") ?? []).map(\.id))
        asks = asks.filter { waiting.contains($0.key) }
        updateBadge()
    }

    private func updateBadge() {
        let n = board?.jobs("needs_you").count ?? 0
        Badge.set(n)
    }

    func loadAsk(_ job: Job, force: Bool = false) async {
        if !force, let a = asks[job.id], a.run?.status != "running" { return }
        let path = "/api/ask?id=" + (job.id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed.subtracting(CharacterSet(charactersIn: "&=+:#?/"))) ?? job.id)
        if let a: Ask = try? await api.get(path) { asks[job.id] = a }
    }

    // MARK: today

    func loadToday() async {
        if let t: TodayData = try? await api.get("/api/today?date=\(day)") { today = t }
    }

    func shiftDay(_ n: Int) {
        let next = n == 0 ? Fmt.ymd(Date()) : Fmt.addDays(day, n)
        pinnedDay = next == Fmt.ymd(Date()) ? nil : next
        today = nil
        Task { await loadToday() }
    }

    func toggleTask(_ id: String, done: Bool) async {
        await act("task:\(id)") {
            let _: TaskItem = try await api.post("/api/tasks", ["id": id, "patch": ["done": done]])
            return done ? "Task done ✓" : nil
        }
    }

    func addTask(_ text: String, defaultDue: String?) async {
        let q = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return }
        await act("addtask") {
            var add: [String: Any] = ["text": q]
            if let defaultDue { add["defaultDue"] = defaultDue }
            let t: TaskItem = try await api.post("/api/tasks", ["add": add])
            return "Added: \(t.title)\(t.due.map { " · " + Fmt.relDay($0) } ?? "")"
        }
    }

    func toggleHabit(_ id: String) async {
        await act("habit:\(id)") {
            let _: DaySheet = try await api.post("/api/day", ["date": day, "habit": id])
            return nil
        }
    }

    func saveFocus(_ items: [FocusItem]) async {
        let body = items.filter { !$0.text.trimmingCharacters(in: .whitespaces).isEmpty }.map { ["text": $0.text, "done": $0.done] as [String: Any] }
        let _: DaySheet? = try? await api.post("/api/day", ["date": day, "focus": body])
        await loadToday()
    }

    func saveNotes(_ notes: String, for date: String) async {
        let _: DaySheet? = try? await api.post("/api/day", ["date": date, "notes": notes])
    }

    func suggestFocus() async -> [String] {
        // the local model can take a minute; give it time
        (try? await api.post("/api/today/suggest", ["date": day], as: FocusSuggestion.self, timeout: 100))?.focus ?? []
    }

    func calendar(from start: String, days: Int) async -> CalendarRange? {
        try? await api.get("/api/calendar?start=\(start)&end=\(Fmt.addDays(start, days))")
    }

    // MARK: actions

    private func act(_ key: String, _ work: () async throws -> String?) async {
        busy.insert(key)
        defer { busy.remove(key) }
        do {
            if let msg = try await work() { flash(msg) }
            await refresh()
        } catch {
            flash(error.localizedDescription)
        }
    }

    func flash(_ msg: String) {
        toast = msg
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if toast == msg { toast = nil }
        }
    }

    func answer(_ job: Job, text: String, approve: Bool = false) async {
        let reply = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !reply.isEmpty else { return flash("Type an answer first.") }
        await act("ask:\(job.id)") {
            if asks[job.id]?.kind == "decision" {
                let _: OK = try await api.post("/api/decision", ["id": job.id, "answer": reply])
                return "Answer sent to your Chief of Staff ✓"
            }
            let r: ReplyResult = try await api.post("/api/reply", ["id": job.id, "text": reply, "approve": approve])
            if r.needsLogin == true { return "Claude needs a one-time sign-in on the Mac (Home → Connect Claude)." }
            if r.ok == false { return r.error ?? "The agent didn't take the reply." }
            await loadAsk(job, force: true)
            return "Sent to the agent ✓"
        }
    }

    func markDone(_ job: Job) async {
        await act("job:\(job.id)") {
            let _: OK = try await api.post("/api/job/override", ["id": job.id, "status": "done", "reason": "Marked done from iPhone."])
            return "Marked done"
        }
    }

    func snooze(_ job: Job, hours: Double) async {
        await act("job:\(job.id)") {
            let _: OK = try await api.post("/api/job/override", ["id": job.id, "snoozedUntil": Fmt.isoNow(plusHours: hours)])
            return "Snoozed \(Int(hours))h"
        }
    }

    func snooze(_ job: Job, until iso: String) async {
        await act("job:\(job.id)") {
            let _: OK = try await api.post("/api/job/override", ["id": job.id, "snoozedUntil": iso])
            return "Snoozed until tomorrow"
        }
    }

    func restartBot(_ job: Job) async {
        await act("job:\(job.id)") {
            let r: OK = try await api.post("/api/bots/restart", ["id": job.id])
            return r.ok == true ? "Restarting \(job.title)" : (r.error ?? "Restart refused.")
        }
    }

    func sendCos(_ text: String, profile: String) async {
        let q = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return }
        await act("cos") {
            let _: Chat = try await api.post("/api/cos", ["text": q, "profile": profile])
            return nil
        }
    }

    func haltTrading() async {
        await act("halt") {
            let _: Trading = try await api.post("/api/trading/killswitch", ["engage": true])
            return "Kill switch ON: all trading halted"
        }
    }
}

/// App icon badge = how many things need Richard.
enum Badge {
    private static var asked = false
    static func set(_ n: Int) {
        let center = UNUserNotificationCenter.current()
        if !asked {
            asked = true
            center.requestAuthorization(options: [.badge]) { _, _ in }
        }
        center.setBadgeCount(n) { _ in }
    }
}
