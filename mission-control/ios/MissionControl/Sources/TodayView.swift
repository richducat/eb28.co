import SwiftUI

/// The day sheet: focus, schedule, what's due, tracking and notes.
struct TodayView: View {
    @EnvironmentObject var model: AppModel
    @State private var dueTab = "today"
    @State private var newTask = ""
    @State private var focus: [FocusItem] = []
    @State private var notes = ""
    @State private var notesTask: Task<Void, Never>?
    @State private var suggesting = false

    private var isToday: Bool { model.day == Fmt.ymd(Date()) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let t = model.today {
                        header(t)
                        focusCard
                        scheduleCard(t)
                        dueCard(t)
                        trackingCard(t)
                        notesCard
                        tomorrowCard(t)
                    } else {
                        ConnectionState()
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 30)
            }
            .refreshable { await model.refresh() }
            .navigationTitle(isToday ? "Today" : Fmt.relDay(model.day))
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button { model.shiftDay(-1) } label: { Image(systemName: "chevron.left") }
                    if !isToday { Button("Today") { model.shiftDay(0) } }
                    Button { model.shiftDay(1) } label: { Image(systemName: "chevron.right") }
                }
            }
            .onChange(of: model.today?.date) { _, _ in syncFromModel() }
            .onAppear { syncFromModel() }
        }
    }

    private func syncFromModel() {
        guard let t = model.today else { return }
        var f = t.sheet?.focus ?? []
        while f.count < 3 { f.append(FocusItem(text: "", done: false)) }
        focus = Array(f.prefix(3))
        notes = t.sheet?.notes ?? ""
    }

    // MARK: header

    private func header(_ t: TodayData) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(Fmt.day(t.date)?.formatted(.dateTime.weekday(.wide).month(.wide).day()) ?? t.date)
                .font(.subheadline).foregroundStyle(.secondary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    pill("calendar", "\(t.events.count) events", .gold)
                    pill("checkmark.circle", "\(t.due.today.count) due", .safe)
                    if !t.due.overdue.isEmpty { pill("exclamationmark.triangle", "\(t.due.overdue.count) overdue", .needs) }
                    if let n = t.stats?.needsYou, n > 0 { pill("tray.full", "\(n) need you", Color(hex: "#b794f6")) }
                }
            }
        }
    }

    private func pill(_ icon: String, _ text: String, _ color: Color) -> some View {
        Label(text, systemImage: icon)
            .font(.footnote.weight(.semibold))
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(color.opacity(0.16), in: Capsule())
            .foregroundStyle(color)
    }

    // MARK: focus

    private var focusCard: some View {
        Card(title: "Focus for the day", icon: "scope") {
            Button {
                suggesting = true
                Task {
                    let picks = await model.suggestFocus()
                    var next = focus
                    var k = 0
                    for i in 0..<next.count where next[i].text.isEmpty && k < picks.count { next[i].text = picks[k]; k += 1 }
                    focus = next
                    await model.saveFocus(next)
                    suggesting = false
                }
            } label: { Label(suggesting ? "Thinking…" : "Suggest", systemImage: "sparkles").font(.footnote) }
            .disabled(suggesting)
        } content: {
            ForEach(focus.indices, id: \.self) { i in
                HStack(spacing: 10) {
                    Button {
                        focus[i].done.toggle()
                        Task { await model.saveFocus(focus) }
                    } label: {
                        Image(systemName: focus[i].done ? "checkmark.circle.fill" : "circle")
                            .font(.title3).foregroundStyle(focus[i].done ? Color.safe : .secondary)
                    }
                    .disabled(focus[i].text.isEmpty)
                    TextField(["The one thing that would make today a win", "Second priority", "Third priority"][min(i, 2)], text: $focus[i].text)
                        .strikethrough(focus[i].done)
                        .foregroundStyle(focus[i].done ? .secondary : .primary)
                        .submitLabel(.done)
                        .onSubmit { Task { await model.saveFocus(focus) } }
                }
                .padding(.vertical, 4)
            }
        }
    }

    // MARK: schedule

    private func scheduleCard(_ t: TodayData) -> some View {
        Card(title: "Schedule", icon: "calendar") {
            EmptyView()
        } content: {
            let allDay = t.events.filter { $0.allDay == true }
            let timed = t.events.filter { $0.allDay != true }
            if t.events.isEmpty {
                Text("Nothing on the calendar. 🌤️").foregroundStyle(.secondary).padding(.vertical, 6)
            }
            if !allDay.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack { ForEach(allDay) { e in Text(e.title).font(.caption).padding(.horizontal, 8).padding(.vertical, 4).background(Color(hex: e.color).opacity(0.25), in: Capsule()) } }
                }
            }
            ForEach(timed) { e in
                let past = isToday && (e.endDate ?? .distantFuture) < Date()
                let live = isToday && (e.startDate ?? .distantFuture) <= Date() && (e.endDate ?? .distantPast) >= Date()
                HStack(alignment: .top, spacing: 10) {
                    VStack(alignment: .trailing, spacing: 0) {
                        Text(Fmt.time(e.startDate)).font(.footnote.weight(.semibold))
                        Text(Fmt.time(e.endDate)).font(.caption2).foregroundStyle(.secondary)
                    }
                    .frame(width: 66, alignment: .trailing)
                    RoundedRectangle(cornerRadius: 2).fill(Color(hex: e.color)).frame(width: 4)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(e.title).font(.subheadline.weight(.semibold)).lineLimit(2)
                            if live { Text("NOW").font(.caption2.weight(.heavy)).padding(.horizontal, 6).padding(.vertical, 2).background(Color.gold, in: Capsule()).foregroundStyle(.black) }
                        }
                        Text([e.calendar, e.location?.components(separatedBy: ",").first].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
                .opacity(past ? 0.45 : 1)
                .padding(.vertical, 3)
            }
        }
    }

    // MARK: due

    private func dueCard(_ t: TodayData) -> some View {
        let tabs: [(String, String, [DueItem])] = [("overdue", "Overdue", t.due.overdue), ("today", isToday ? "Today" : "This day", t.due.today), ("tomorrow", "Tomorrow", t.due.tomorrow), ("week", "7 days", t.due.week), ("later", "Later", t.due.later + t.due.someday)]
        let list = tabs.first { $0.0 == dueTab }?.2 ?? []
        return Card(title: "What's due", icon: "pin") {
            EmptyView()
        } content: {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(tabs, id: \.0) { k, label, items in
                        Button { dueTab = k } label: {
                            Text("\(label) \(items.count)")
                                .font(.footnote.weight(.semibold))
                                .padding(.horizontal, 10).padding(.vertical, 6)
                                .background(dueTab == k ? Color.white.opacity(0.16) : Color.white.opacity(0.05), in: Capsule())
                                .foregroundStyle(k == "overdue" && !items.isEmpty ? Color.needs : .primary)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            HStack {
                TextField("Add a task… “call the VA tomorrow 3pm #tyfys”", text: $newTask)
                    .submitLabel(.done)
                    .onSubmit { submitTask() }
                Button { submitTask() } label: { Image(systemName: "plus.circle.fill").font(.title2) }
                    .disabled(newTask.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(10)
            .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
            if list.isEmpty {
                Text(dueTab == "overdue" ? "Nothing overdue. 🎉" : "Nothing here.").foregroundStyle(.secondary).padding(.vertical, 6)
            }
            ForEach(list) { it in
                HStack(spacing: 10) {
                    if it.isTask {
                        Button { Task { await model.toggleTask(it.id, done: true) } } label: { Image(systemName: "circle").font(.title3).foregroundStyle(.secondary) }
                    } else {
                        Image(systemName: it.icon).frame(width: 22).foregroundStyle(Color.gold)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text((it.priority == "high" ? "★ " : "") + it.title).font(.subheadline).lineLimit(2)
                        let sub = [dueTab == "today" ? nil : it.due.map(Fmt.relDay), Fmt.time12(it.time).isEmpty ? nil : Fmt.time12(it.time), it.business.flatMap { model.board?.business($0)?.name }, it.note].compactMap { $0 }
                        if !sub.isEmpty { Text(sub.joined(separator: " · ")).font(.caption).foregroundStyle(.secondary) }
                    }
                    Spacer(minLength: 0)
                }
                .padding(.vertical, 3)
            }
        }
    }

    private func submitTask() {
        let text = newTask
        newTask = ""
        Task { await model.addTask(text, defaultDue: dueTab == "today" ? model.day : nil) }
    }

    // MARK: tracking

    private func trackingCard(_ t: TodayData) -> some View {
        let ticked = t.habits.filter { t.sheet?.habits?[$0.id] == true }.count
        return Card(title: "Daily tracking", icon: "chart.bar") {
            Text("\(ticked)/\(t.habits.count)").font(.footnote).foregroundStyle(.secondary)
        } content: {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(t.habits) { h in
                    let on = t.sheet?.habits?[h.id] == true
                    Button { Task { await model.toggleHabit(h.id) } } label: {
                        HStack {
                            Text(h.emoji)
                            Text(h.name).font(.footnote.weight(.medium)).lineLimit(1)
                            Spacer(minLength: 0)
                            if let s = t.streaks[h.id], s > 0 { Text("🔥\(s)").font(.caption2) }
                        }
                        .padding(.horizontal, 10).padding(.vertical, 9)
                        .background(on ? Color.safe.opacity(0.2) : Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(on ? Color.safe.opacity(0.6) : .clear))
                    }
                    .buttonStyle(.plain)
                }
            }
            if let s = t.stats {
                HStack {
                    stat(s.tasksDone, "tasks done")
                    stat(s.agentsDone, "agent jobs")
                    stat(s.repliesSent, "replies")
                    stat(s.events, "events")
                }
                .padding(.top, 4)
            }
        }
    }

    private func stat(_ v: Int?, _ k: String) -> some View {
        VStack(spacing: 2) {
            Text("\(v ?? 0)").font(.title3.bold().monospacedDigit())
            Text(k).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: notes + tomorrow

    private var notesCard: some View {
        Card(title: "Notes", icon: "note.text") { EmptyView() } content: {
            TextField("Wins, ideas, what happened today…", text: $notes, axis: .vertical)
                .lineLimit(4...12)
                .onChange(of: notes) { _, v in
                    notesTask?.cancel()
                    notesTask = Task {
                        try? await Task.sleep(nanoseconds: 900_000_000)
                        if !Task.isCancelled { await model.saveNotes(v) }
                    }
                }
        }
    }

    private func tomorrowCard(_ t: TodayData) -> some View {
        Card(title: isToday ? "Tomorrow" : "Next day", icon: "moon.stars") {
            Button("View") { model.shiftDay(1) }.font(.footnote)
        } content: {
            Text("\(t.tomorrowEvents.count) events · \(t.due.tomorrow.count) due").font(.caption).foregroundStyle(.secondary)
            ForEach(t.tomorrowEvents.filter { $0.allDay != true }.prefix(5)) { e in
                HStack(spacing: 8) {
                    Circle().fill(Color(hex: e.color)).frame(width: 7, height: 7)
                    Text(Fmt.time(e.startDate)).font(.footnote.weight(.semibold)).frame(width: 64, alignment: .leading)
                    Text(e.title).font(.footnote).lineLimit(1)
                }
            }
        }
    }
}

/// Rounded section card used across the app.
struct Card<Accessory: View, Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder var accessory: () -> Accessory
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label(title, systemImage: icon).font(.headline)
                Spacer()
                accessory()
            }
            content()
        }
        .padding(16)
        .background(Color.panel, in: RoundedRectangle(cornerRadius: 18))
    }
}

/// Two-week agenda across every calendar, with tasks on their due days.
struct CalendarAgendaView: View {
    @EnvironmentObject var model: AppModel
    @State private var start = Fmt.ymd(Date())
    @State private var data: CalendarRange?
    @State private var loading = false
    @State private var hideRoutines = false

    private var days: [String] { (0..<14).map { Fmt.addDays(start, $0) } }

    var body: some View {
        NavigationStack {
            List {
                if data == nil { ConnectionState().listRowBackground(Color.clear) }
                ForEach(days, id: \.self) { d in
                    let evs = (data?.events ?? []).filter { $0.day == d && !(hideRoutines && $0.recurring == true) }
                    let tks = (data?.tasks ?? []).filter { $0.due == d && $0.done != true }
                    if !evs.isEmpty || !tks.isEmpty {
                        Section {
                            ForEach(evs) { e in
                                HStack(spacing: 10) {
                                    RoundedRectangle(cornerRadius: 2).fill(Color(hex: e.color)).frame(width: 4, height: 34)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(e.title).font(.subheadline.weight(.medium)).lineLimit(2)
                                        Text([e.allDay == true ? "All day" : "\(Fmt.time(e.startDate)) – \(Fmt.time(e.endDate))", e.calendar].compactMap { $0 }.joined(separator: " · "))
                                            .font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            }
                            ForEach(tks) { t in
                                Label(t.title + (t.time.map { " · " + Fmt.time12($0) } ?? ""), systemImage: "checkmark.circle").font(.subheadline)
                            }
                        } header: {
                            Text(Fmt.relDay(d)).font(.subheadline.weight(.bold)).foregroundStyle(d == Fmt.ymd(Date()) ? Color.gold : .primary).textCase(nil)
                        }
                    }
                }
                if let errs = data?.errors, !errs.isEmpty { Text(errs.joined(separator: "\n")).font(.caption).foregroundStyle(Color.needs) }
            }
            .listStyle(.insetGrouped)
            .refreshable { await load() }
            .navigationTitle("Calendar")
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Menu {
                        Toggle("Hide daily routines", isOn: $hideRoutines)
                    } label: { Image(systemName: "line.3.horizontal.decrease.circle") }
                    Button { start = Fmt.addDays(start, -14); Task { await load() } } label: { Image(systemName: "chevron.left") }
                    Button { start = Fmt.ymd(Date()); Task { await load() } } label: { Text("Today") }
                    Button { start = Fmt.addDays(start, 14); Task { await load() } } label: { Image(systemName: "chevron.right") }
                }
            }
            .task { if data == nil { await load() } }
        }
    }

    private func load() async {
        loading = true
        data = await model.calendar(from: start, days: 14)
        loading = false
    }
}
