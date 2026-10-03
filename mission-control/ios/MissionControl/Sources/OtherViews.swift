import SwiftUI

// MARK: Chief of Staff

struct ChatView: View {
    @EnvironmentObject var model: AppModel
    @State private var text = ""
    @AppStorage("cosProfile") private var profile = "hermes-cos"

    private var chats: [Chat] { (model.cos?.chats ?? []).filter { $0.profile == nil || $0.profile == profile }.reversed() }
    private var running: Bool { chats.contains { $0.status == "running" } }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Who", selection: $profile) {
                    ForEach(model.cos?.profiles ?? []) { Text($0.name).tag($0.id) }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)

                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            if chats.isEmpty {
                                Text("Ask or assign work to the chief of staff configured on your Mac. Available tools and services depend on that configuration.")
                                    .foregroundStyle(.secondary).padding()
                            }
                            ForEach(chats) { c in
                                bubble(c.q, mine: true)
                                if c.status == "running" {
                                    HStack { ProgressView(); Text("Thinking…").foregroundStyle(.secondary) }.padding(.leading, 8)
                                } else if let a = c.a, !a.isEmpty {
                                    bubble(a, mine: false, failed: c.status == "failed")
                                }
                            }
                            Color.clear.frame(height: 1).id("end")
                        }
                        .padding()
                    }
                    .onChange(of: chats.count) { _, _ in withAnimation { proxy.scrollTo("end") } }
                    .onAppear { proxy.scrollTo("end") }
                }
                .refreshable { await model.refresh() }

                HStack(alignment: .bottom, spacing: 8) {
                    TextField("Ask or assign anything…", text: $text, axis: .vertical)
                        .lineLimit(1...5)
                        .padding(10)
                        .background(Color.panel, in: RoundedRectangle(cornerRadius: 14))
                    Button {
                        let t = text
                        text = ""
                        Task { await model.sendCos(t, profile: profile) }
                    } label: { Image(systemName: "arrow.up.circle.fill").font(.system(size: 32)) }
                    .disabled(text.trimmingCharacters(in: .whitespaces).isEmpty || model.busy.contains("cos"))
                }
                .padding()
            }
            .navigationTitle("Chief of Staff")
            .navigationBarTitleDisplayMode(.inline)
            .task(id: running) {
                // while an answer is cooking, check more often than the normal 20s
                while running && !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 4_000_000_000)
                    await model.refresh()
                }
            }
        }
    }

    private func bubble(_ s: String, mine: Bool, failed: Bool = false) -> some View {
        HStack {
            if mine { Spacer(minLength: 40) }
            Text(s)
                .textSelection(.enabled)
                .padding(12)
                .background(mine ? Color.gold.opacity(0.25) : (failed ? Color.needs.opacity(0.2) : Color.panel), in: RoundedRectangle(cornerRadius: 16))
            if !mine { Spacer(minLength: 40) }
        }
    }
}

// MARK: Trading (watch-only)

struct TradingView: View {
    @EnvironmentObject var model: AppModel
    @State private var confirmHalt = false

    var body: some View {
        Group {
            List {
                if let s = model.trading {
                    Section {
                        killSwitch(s)
                        HStack {
                            stat("Watched", Fmt.usd(s.totals?.usd))
                            stat("P&L", Fmt.usd(s.totals?.pnl), color: (s.totals?.pnl ?? 0) < 0 ? .needs : .safe)
                        }
                    } footer: {
                        Text("Watch-only. Nothing in Mission Control can buy, sell or move funds. Updated \(Fmt.ago(s.at)).")
                    }
                    if let flags = s.flags, !flags.isEmpty {
                        Section("Flags") {
                            ForEach(flags) { f in
                                Label(f.text, systemImage: f.level == "red" ? "exclamationmark.octagon.fill" : "exclamationmark.triangle.fill")
                                    .foregroundStyle(f.level == "red" ? Color.needs : Color.amber)
                            }
                        }
                    }
                    Section("Desks") {
                        ForEach(s.killSwitch?.projects ?? []) { d in
                            VStack(alignment: .leading, spacing: 3) {
                                HStack {
                                    Circle().fill(color(d.state)).frame(width: 9, height: 9)
                                    Text(d.name).font(.headline)
                                    Spacer()
                                    Text(label(d.state)).font(.caption).foregroundStyle(color(d.state))
                                }
                                if let det = d.detail { Text(det).font(.caption).foregroundStyle(.secondary) }
                            }
                        }
                    }
                    Section("Wallets") {
                        ForEach(s.wallets ?? []) { w in
                            DisclosureGroup {
                                ForEach((w.tokens ?? []).filter { ($0.usd ?? 0) > 0.01 || ($0.amount ?? 0) > 0 }.prefix(12)) { t in
                                    HStack { Text(t.symbol ?? "?"); Spacer(); Text(Fmt.num(t.amount)).foregroundStyle(.secondary); Text(Fmt.usd(t.usd)).frame(width: 80, alignment: .trailing) }
                                        .font(.footnote)
                                }
                            } label: {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(w.label ?? w.chain ?? "Wallet").font(.subheadline.weight(.semibold))
                                        Text("\(w.chain ?? "") · \(w.role ?? "watch-only")").font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Text(Fmt.usd(w.usd)).font(.subheadline.monospacedDigit())
                                }
                            }
                        }
                    }
                    if let poly = s.polymarket?.filter({ $0.ok == true }), !poly.isEmpty {
                        Section("Polymarket") {
                            ForEach(poly) { p in
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(p.wallet ?? "Polymarket").font(.subheadline)
                                        Text("\(p.open ?? 0) open of \(p.count ?? 0) · last trade \(Fmt.ago(p.lastTradeAt))").font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Text(Fmt.usd(p.cashPnl)).foregroundStyle((p.cashPnl ?? 0) < 0 ? Color.needs : Color.safe)
                                }
                            }
                        }
                    }
                    if let items = s.checklist?.filter({ $0.status != "done" }), !items.isEmpty {
                        Section("Safety checklist (\(items.count) open)") {
                            ForEach(items) { i in
                                HStack(alignment: .top) {
                                    Text(i.priority ?? "").font(.caption2.weight(.heavy)).foregroundStyle(i.priority == "P0" ? Color.needs : Color.amber)
                                    Text(i.text).font(.footnote)
                                }
                            }
                        }
                    }
                    if let alerts = s.alerts, !alerts.isEmpty {
                        Section("Recent alerts") {
                            ForEach(alerts.prefix(15)) { a in
                                VStack(alignment: .leading) {
                                    Text(a.text).font(.footnote)
                                    Text(Fmt.ago(a.at)).font(.caption2).foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                } else {
                    ConnectionState()
                }
            }
            .refreshable { await model.refresh() }
            .navigationTitle("Trading")
            .confirmationDialog("Turn the kill switch ON and halt all trading?", isPresented: $confirmHalt, titleVisibility: .visible) {
                Button("Halt everything", role: .destructive) { Task { await model.haltTrading() } }
            }
        }
    }

    private func killSwitch(_ s: Trading) -> some View {
        let on = s.killSwitch?.master != false
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: on ? "bell.fill" : "bell.badge.fill").font(.title2).foregroundStyle(on ? Color.safe : Color.needs)
                VStack(alignment: .leading) {
                    Text(on ? "HALTED · SAFE" : "KILL SWITCH OFF").font(.headline.monospaced()).foregroundStyle(on ? Color.safe : Color.needs)
                    Text(on ? "Master kill switch is on. Nothing can trade." : "Trading is not halted.").font(.caption).foregroundStyle(.secondary)
                }
            }
            if !on {
                Button { confirmHalt = true } label: { Label("Halt everything now", systemImage: "hand.raised.fill").frame(maxWidth: .infinity) }
                    .buttonStyle(.borderedProminent).tint(.red)
            }
        }
        .padding(.vertical, 4)
    }

    private func stat(_ k: String, _ v: String, color: Color = .primary) -> some View {
        VStack(alignment: .leading) {
            Text(k).font(.caption).foregroundStyle(.secondary)
            Text(v).font(.title3.bold().monospacedDigit()).foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func color(_ s: String?) -> Color { s == "safe" ? .safe : s == "unsafe" ? .needs : .amber }
    private func label(_ s: String?) -> String { s == "safe" ? "Halted (safe)" : s == "unsafe" ? "LIVE / unsafe" : "Unknown" }
}

// MARK: TYFYS

struct TyfysView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        Group {
            List {
                if let t = model.tyfys, t.ok == true, let k = t.kpis {
                    Section {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            kpi("Active", k.active)
                            kpi("Overdue", k.overdue, warn: true)
                            kpi("In appeal", k.inAppeal)
                            kpi("Stalled", k.stalled, warn: true)
                            kpi("New (30d)", k.newThisMonth)
                            kpi("Win rate", k.winRate, suffix: "%")
                        }
                        .padding(.vertical, 6)
                    } footer: { Text("Zoho CRM snapshot \(Fmt.ago(t.fetchedAt)) · initials only") }
                    ForEach(t.lanes ?? []) { lane in
                        Section {
                            ForEach((lane.cases ?? []).prefix(8)) { c in
                                HStack {
                                    Circle().fill(c.flag == "red" ? Color.needs : c.flag == "amber" ? Color.amber : Color.safe).frame(width: 8, height: 8)
                                    Text(c.initials ?? "—").font(.subheadline.monospaced().weight(.semibold)).frame(width: 36, alignment: .leading)
                                    VStack(alignment: .leading) {
                                        Text(c.stage ?? "").font(.footnote)
                                        Text(c.owner ?? "").font(.caption2).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Text("\(c.days ?? 0)d").font(.footnote.monospacedDigit()).foregroundStyle(c.flag == "red" ? Color.needs : .secondary)
                                }
                            }
                            if (lane.cases?.count ?? 0) > 8 { Text("+\((lane.cases?.count ?? 0) - 8) more").font(.caption).foregroundStyle(.secondary) }
                        } header: {
                            HStack {
                                Text(lane.name)
                                Spacer()
                                if let r = lane.redCount, r > 0 { Text("\(r) overdue").foregroundStyle(Color.needs) }
                                Text("\(lane.cases?.count ?? 0)")
                            }
                        }
                    }
                } else if let t = model.tyfys, t.ok == false {
                    Text(t.reason ?? "No TYFYS snapshot yet.").foregroundStyle(.secondary)
                } else {
                    ConnectionState()
                }
            }
            .refreshable { await model.refresh() }
            .navigationTitle("Thank You For Your Service")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func kpi(_ k: String, _ v: Int?, warn: Bool = false, suffix: String = "") -> some View {
        VStack(spacing: 2) {
            Text(v.map { "\($0)\(suffix)" } ?? "—").font(.title2.bold().monospacedDigit()).foregroundStyle(warn && (v ?? 0) > 0 ? Color.needs : .primary)
            Text(k).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: More

struct MoreView: View {
    @EnvironmentObject var model: AppModel
    @State private var confirmUnpair = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink { TradingView() } label: { Label("Trading", systemImage: "chart.line.uptrend.xyaxis") }
                    NavigationLink { TyfysView() } label: { Label("TYFYS pipeline", systemImage: "flag") }
                }
                Section("Connection") {
                    ConnectionPill()
                    if let e = model.error, !model.connected { Text(e).font(.footnote).foregroundStyle(.secondary) }
                    Button("Refresh now") { Task { await model.refresh() } }
                }
                if let u = model.usage {
                    Section("Fuel") {
                        if let p = u.codex?.primary?.usedPercent {
                            VStack(alignment: .leading) {
                                HStack { Text("Codex (weekly)"); Spacer(); Text("\(Int(100 - p))% left").foregroundStyle(.secondary) }
                                ProgressView(value: max(0, 100 - p), total: 100).tint(p > 85 ? .red : .gold)
                            }
                        }
                        if let t = u.claude?.tokens5h {
                            HStack { Text("Claude (5h activity)"); Spacer(); Text(Fmt.num(t / 1_000_000) + "M tokens").foregroundStyle(.secondary) }
                        }
                        HStack { Text("Local Qwen"); Spacer(); Text(u.local?.ok == true ? "free · running" : "off").foregroundStyle(.secondary) }
                    }
                }
                if let bots = model.board?.all.filter({ $0.isBot }), !bots.isEmpty {
                    Section("Bots") {
                        ForEach(bots) { b in
                            HStack {
                                Circle().fill(b.status == "working" || b.status == "done" ? Color.safe : b.status == "failed" ? Color.needs : Color.amber).frame(width: 8, height: 8)
                                VStack(alignment: .leading) {
                                    Text(b.title).font(.subheadline)
                                    Text(b.reason ?? "").font(.caption).foregroundStyle(.secondary).lineLimit(2)
                                }
                            }
                        }
                    }
                }
                Section("Help & Privacy") {
                    SupportPrivacyLinks()
                }
                Section {
                    Button("Unpair this phone", role: .destructive) { confirmUnpair = true }
                } footer: {
                    Text("Works on the same Wi-Fi as your Mac. To stop all phones, use Mission Control → Phone → New code on the Mac.")
                }
            }
            .navigationTitle("More")
            .confirmationDialog("Unpair from \(model.api.macName)?", isPresented: $confirmUnpair, titleVisibility: .visible) {
                Button("Unpair", role: .destructive) { model.unpair() }
            }
        }
    }
}
