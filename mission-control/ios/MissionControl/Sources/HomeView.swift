import SwiftUI

struct HomeView: View {
    @EnvironmentObject var model: AppModel
    @State private var biz = "all"

    private var greeting: String {
        let h = Calendar.current.component(.hour, from: Date())
        return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
    }

    private func filtered(_ jobs: [Job]) -> [Job] { biz == "all" ? jobs : jobs.filter { $0.business == biz } }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    header
                    if let b = model.board {
                        bizChips(b)
                        let needs = filtered(b.jobs("needs_you"))
                        section("What needs you", count: needs.count)
                        if needs.isEmpty {
                            Text("✅ You're clear. Nothing is waiting on you.")
                                .frame(maxWidth: .infinity).padding(24)
                                .background(Color.panel, in: RoundedRectangle(cornerRadius: 16))
                        }
                        ForEach(needs) { JobCard(job: $0, business: b.business($0.business)) }

                        let working = filtered(b.jobs("working"))
                        if !working.isEmpty {
                            section("Working now", count: working.count)
                            ForEach(working) { JobRow(job: $0, business: b.business($0.business)) }
                        }
                        let follow = filtered(b.jobs("follow_up"))
                        if !follow.isEmpty {
                            section("Follow up", count: follow.count)
                            ForEach(follow) { JobRow(job: $0, business: b.business($0.business)) }
                        }
                        let failed = filtered(b.jobs("failed"))
                        if !failed.isEmpty {
                            section("Failed", count: failed.count)
                            ForEach(failed) { JobRow(job: $0, business: b.business($0.business)) }
                        }
                    } else {
                        ConnectionState()
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .refreshable { await model.refresh() }
            .navigationDestination(for: Job.self) { JobDetail(job: $0) }
            .navigationTitle("Inbox")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(greeting), Richard").font(.title3.bold())
            if let c = model.board?.summary?.counts {
                Text("\(c["needs_you"] ?? 0) need you · \(c["working"] ?? 0) working · \(c["done"] ?? 0) done today")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            ConnectionPill()
        }
        .padding(.top, 8)
    }

    private func bizChips(_ b: Board) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                chip("All", id: "all", color: .gold)
                ForEach(b.businesses.filter { bz in b.all.contains { $0.business == bz.id && $0.status != "done" } }) { bz in
                    chip(bz.name, id: bz.id, color: Color(hex: bz.color))
                }
            }
        }
    }

    private func chip(_ name: String, id: String, color: Color) -> some View {
        Button {
            biz = id
        } label: {
            HStack(spacing: 6) {
                Circle().fill(color).frame(width: 8, height: 8)
                Text(name).font(.subheadline.weight(.medium))
            }
            .padding(.horizontal, 12).padding(.vertical, 7)
            .background(biz == id ? Color.white.opacity(0.18) : Color.panel, in: Capsule())
        }
        .buttonStyle(.plain)
    }

    private func section(_ title: String, count: Int) -> some View {
        Text("\(title.uppercased()) (\(count))")
            .font(.caption.weight(.bold)).foregroundStyle(.secondary)
            .padding(.top, 8)
    }
}

struct ConnectionPill: View {
    @EnvironmentObject var model: AppModel
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(model.connected ? Color.safe : Color.needs).frame(width: 7, height: 7)
            Text(model.connected ? "Connected to \(model.api.macName)\(model.lastSync.map { " · " + $0.formatted(date: .omitted, time: .shortened) } ?? "")" : "Not connected")
                .font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct ConnectionState: View {
    @EnvironmentObject var model: AppModel
    var body: some View {
        VStack(spacing: 12) {
            if let e = model.error {
                Image(systemName: "wifi.exclamationmark").font(.largeTitle).foregroundStyle(Color.amber)
                Text(e).multilineTextAlignment(.center).foregroundStyle(.secondary)
                Button("Try again") { Task { await model.refresh() } }.buttonStyle(.borderedProminent)
            } else {
                ProgressView()
                Text("Connecting to your Mac…").foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity).padding(.vertical, 60)
    }
}

/// A "needs you" item with one-tap answers, like the desktop Home queue.
struct JobCard: View {
    @EnvironmentObject var model: AppModel
    let job: Job
    let business: Business?
    @State private var other = false
    @State private var text = ""

    private var askColor: Color {
        switch job.ask {
        case "approve": return .amber
        case "fix": return .needs
        case "answer": return Color(hex: "#a78bfa")
        default: return Color(hex: "#38bdf8")
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text(job.askLabel).font(.caption2.weight(.heavy)).padding(.horizontal, 8).padding(.vertical, 3)
                    .background(askColor.opacity(0.22), in: Capsule()).foregroundStyle(askColor)
                if let business { Text(business.name).font(.caption2.weight(.bold)).padding(.horizontal, 8).padding(.vertical, 3).background(Color(hex: business.color).opacity(0.3), in: Capsule()) }
                Text(job.sourceLabel).font(.caption2).foregroundStyle(.secondary)
                Spacer()
                Text(Fmt.ago(job.lastActivity)).font(.caption2).foregroundStyle(.secondary)
            }
            NavigationLink(value: job) {
                Text(job.title).font(.headline).multilineTextAlignment(.leading).foregroundStyle(.primary)
            }
            if job.answerable {
                askBody
            } else {
                if let r = job.reason, !r.isEmpty { Text(r).font(.subheadline).foregroundStyle(.secondary).lineLimit(4) }
                actions
            }
        }
        .padding(14)
        .background(Color.panel, in: RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(askColor.opacity(0.5), lineWidth: 1))
        .task(id: job.id) { if job.answerable { await model.loadAsk(job) } }
    }

    @ViewBuilder private var askBody: some View {
        let ask = model.asks[job.id]
        let sending = model.busy.contains("ask:\(job.id)")
        if let run = ask?.run, run.status == "running" {
            HStack(spacing: 8) {
                ProgressView()
                Text(run.notes?.last ?? "The agent is working on your answer…").font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
            }
            .task(id: job.id) {
                // keep checking until the agent finishes, even when no new progress notes arrive
                while !Task.isCancelled, model.asks[job.id]?.run?.status == "running" {
                    try? await Task.sleep(nanoseconds: 4_000_000_000)
                    await model.loadAsk(job, force: true)
                }
            }
        } else if let ask {
            if let run = ask.run, let a = run.answer, !a.isEmpty {
                Text("Agent: \(a)").font(.footnote).foregroundStyle(.secondary).lineLimit(5)
                    .padding(10).background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
            }
            if let q = ask.question, !q.isEmpty, q != job.title {
                Text(q).font(.subheadline)
            }
            if let d = ask.detail, !d.isEmpty {
                Text(d).font(.caption.monospaced()).padding(8).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.4), in: RoundedRectangle(cornerRadius: 8))
            }
            VStack(spacing: 8) {
                ForEach(Array(ask.choices.enumerated()), id: \.offset) { i, o in
                    Button {
                        Task { await model.answer(job, text: o.reply, approve: o.approve == true) }
                    } label: {
                        HStack {
                            Text("\(i + 1)").font(.caption.weight(.heavy)).frame(width: 20)
                            Text(o.label).multilineTextAlignment(.leading)
                            Spacer()
                        }
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.bordered)
                    .tint(i == 0 ? .gold : .gray)
                    .disabled(sending)
                }
                if other {
                    HStack(alignment: .bottom) {
                        TextField("Type your answer…", text: $text, axis: .vertical)
                            .lineLimit(1...5)
                            .padding(10)
                            .background(Color.black.opacity(0.35), in: RoundedRectangle(cornerRadius: 10))
                        Button {
                            Task { await model.answer(job, text: text); text = ""; other = false }
                        } label: { Image(systemName: "arrow.up.circle.fill").font(.title) }
                        .disabled(sending || text.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                } else {
                    Button { other = true } label: { Label("Other…", systemImage: "pencil").frame(maxWidth: .infinity, alignment: .leading) }
                        .buttonStyle(.bordered).tint(.gray)
                }
            }
            if sending { ProgressView().frame(maxWidth: .infinity) }
        } else {
            Text("Loading the question…").font(.subheadline).foregroundStyle(.secondary)
        }
        actions
    }

    private var actions: some View {
        HStack {
            if job.isBot {
                Button("Restart") { Task { await model.restartBot(job) } }.buttonStyle(.borderedProminent)
            }
            Button("Done") { Task { await model.markDone(job) } }.buttonStyle(.bordered)
            Menu("Snooze") {
                Button("4 hours") { Task { await model.snooze(job, hours: 4) } }
                Button("Tomorrow") { Task { await model.snooze(job, hours: 16) } }
            }
            .buttonStyle(.bordered)
            Spacer()
        }
        .font(.subheadline)
        .tint(.gray)
        .disabled(model.busy.contains("job:\(job.id)"))
    }
}

struct JobRow: View {
    let job: Job
    let business: Business?
    var body: some View {
        NavigationLink(value: job) {
            HStack(spacing: 10) {
                Circle().fill(Color(hex: business?.color)).frame(width: 8, height: 8)
                VStack(alignment: .leading, spacing: 2) {
                    Text(job.title).font(.subheadline.weight(.medium)).lineLimit(1).foregroundStyle(.primary)
                    Text("\(job.sourceLabel) · \(job.reason ?? "")").font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
                Spacer()
                Text(Fmt.ago(job.lastActivity)).font(.caption2).foregroundStyle(.secondary)
            }
            .padding(12)
            .background(Color.panel, in: RoundedRectangle(cornerRadius: 12))
        }
    }
}

struct JobDetail: View {
    @EnvironmentObject var model: AppModel
    let job: Job
    var body: some View {
        List {
            Section {
                LabeledContent("Source", value: job.sourceLabel)
                LabeledContent("Status", value: job.status.replacingOccurrences(of: "_", with: " ").capitalized)
                if let b = model.board?.business(job.business) { LabeledContent("Business", value: b.name) }
                if let p = job.project, !p.isEmpty { LabeledContent("Project", value: p) }
                LabeledContent("Last activity", value: Fmt.ago(job.lastActivity))
            }
            if let r = job.reason, !r.isEmpty { Section("Why it's here") { Text(r) } }
            if let e = job.explanation, !e.isEmpty { Section("In plain words") { Text(e) } }
            if let m = job.lastMessage, !m.isEmpty { Section("Last message") { Text(m).font(.footnote) } }
            Section {
                Button("Mark done") { Task { await model.markDone(job) } }
                Button("Snooze 4 hours") { Task { await model.snooze(job, hours: 4) } }
                if job.isBot { Button("Restart bot") { Task { await model.restartBot(job) } } }
            }
        }
        .navigationTitle(job.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
