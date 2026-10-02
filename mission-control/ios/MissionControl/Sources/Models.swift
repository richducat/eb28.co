import Foundation
import SwiftUI

// Everything is optional on purpose: Mission Control on the Mac can add fields at any time.

struct Board: Decodable {
    var generatedAt: String?
    var columns: [Column] = []
    var businesses: [Business] = []
    var summary: Summary?

    struct Summary: Decodable { var counts: [String: Int]? }

    func jobs(_ status: String) -> [Job] { columns.first { $0.id == status }?.jobs ?? [] }
    var all: [Job] { columns.flatMap(\.jobs) }
    func business(_ id: String?) -> Business? { businesses.first { $0.id == id } }

    enum CodingKeys: String, CodingKey { case generatedAt, columns, businesses, summary }
    init(from d: Decoder) throws {
        let c = try d.container(keyedBy: CodingKeys.self)
        generatedAt = try? c.decodeIfPresent(String.self, forKey: .generatedAt)
        columns = (try? c.decodeIfPresent([Column].self, forKey: .columns)) ?? []
        businesses = (try? c.decodeIfPresent([Business].self, forKey: .businesses)) ?? []
        summary = try? c.decodeIfPresent(Summary.self, forKey: .summary)
    }
}

struct Column: Decodable, Identifiable {
    var id: String
    var title: String?
    var jobs: [Job] = []
}

struct Business: Decodable, Identifiable, Hashable {
    var id: String
    var name: String
    var full: String?
    var color: String?
}

struct Job: Decodable, Identifiable, Hashable {
    var id: String
    var source: String
    var title: String
    var status: String
    var reason: String?
    var lastActivity: String?
    var lastMessage: String?
    var business: String?
    var ask: String?
    var explanation: String?
    var project: String?

    /// Agents Mission Control can answer from here (same rule as the desktop Home).
    var answerable: Bool { status == "needs_you" && ["claude-code", "codex", "hermes"].contains(source) }
    var isBot: Bool { source == "bot" }

    var sourceLabel: String {
        switch source {
        case "claude-code": return "Claude Code"
        case "codex": return "Codex"
        case "hermes": return "Hermes"
        case "bot": return "Bot"
        case "trading": return "Trading"
        case "automation": return "Automation"
        case "manual": return "Tracked"
        default: return source.capitalized
        }
    }

    var askLabel: String {
        switch ask {
        case "approve": return "APPROVE"
        case "answer": return "ANSWER"
        case "fix": return "FIX"
        default: return "REVIEW"
        }
    }
}

struct AskOption: Decodable, Hashable {
    var label: String
    var reply: String
    var approve: Bool?
}

struct ReplyRun: Decodable {
    var status: String?
    var answer: String?
    var notes: [String]?
}

struct Ask: Decodable {
    var kind: String?
    var question: String?
    var detail: String?
    var context: String?
    var options: [AskOption]?
    var suggested: [AskOption]?
    var canReply: Bool?
    var run: ReplyRun?

    var choices: [AskOption] { (suggested?.isEmpty == false ? suggested : options) ?? [] }
}

struct ReplyResult: Decodable {
    var ok: Bool?
    var needsLogin: Bool?
    var error: String?
    var status: String?
}

struct OK: Decodable { var ok: Bool?; var error: String? }

struct CosResponse: Decodable {
    var profiles: [Profile] = []
    var chats: [Chat] = []
    struct Profile: Decodable, Identifiable, Hashable { var id: String; var name: String }
}

struct Chat: Decodable, Identifiable, Hashable {
    var id: String
    var profile: String?
    var q: String
    var a: String?
    var status: String?
    var at: String?
}

struct Trading: Decodable {
    var at: String?
    var watchOnly: Bool?
    var killSwitch: KillSwitch?
    var totals: Totals?
    var wallets: [Wallet]?
    var polymarket: [Poly]?
    var flags: [Flag]?
    var checklist: [Item]?
    var alerts: [Alert]?

    struct KillSwitch: Decodable { var master: Bool?; var projects: [Desk]?; var allSafe: Bool?; var unsafeCount: Int? }
    struct Desk: Decodable, Identifiable { var id: String; var name: String; var state: String?; var detail: String? }
    struct Totals: Decodable { var usd: Double?; var pnl: Double?; var exposure: Double? }
    struct Wallet: Decodable, Identifiable {
        var label: String?; var chain: String?; var address: String?; var role: String?; var ok: Bool?; var usd: Double?; var tokens: [Token]?
        var id: String { (address ?? "") + (chain ?? "") }
    }
    struct Token: Decodable, Identifiable { var symbol: String?; var amount: Double?; var usd: Double?; var mint: String?; var id: String { mint ?? symbol ?? UUID().uuidString } }
    struct Poly: Decodable, Identifiable { var wallet: String?; var ok: Bool?; var open: Int?; var count: Int?; var cashPnl: Double?; var lastTradeAt: String?; var id: String { wallet ?? "poly" } }
    struct Flag: Decodable, Identifiable { var level: String; var text: String; var id: String { level + text } }
    struct Item: Decodable, Identifiable { var id: String; var priority: String?; var text: String; var status: String? }
    struct Alert: Decodable, Identifiable { var at: String?; var level: String?; var text: String; var id: String { (at ?? "") + text } }
}

struct Tyfys: Decodable {
    var ok: Bool?
    var reason: String?
    var fetchedAt: String?
    var kpis: KPIs?
    var lanes: [Lane]?
    var owners: [Owner]?

    struct KPIs: Decodable { var active: Int?; var stalled: Int?; var overdue: Int?; var inAppeal: Int?; var newThisMonth: Int?; var won: Int?; var lost: Int?; var winRate: Int? }
    struct Lane: Decodable, Identifiable { var id: String; var name: String; var redCount: Int?; var amberCount: Int?; var cases: [Case]? }
    struct Case: Decodable, Identifiable { var id: String; var initials: String?; var stage: String?; var owner: String?; var days: Int?; var flag: String? }
    struct Owner: Decodable, Identifiable { var name: String; var n: Int; var id: String { name } }
}

struct Usage: Decodable {
    var codex: Codex?
    var claude: Claude?
    var local: Local?
    struct Codex: Decodable { var ok: Bool?; var primary: Window?; var limited: Bool? }
    struct Window: Decodable { var usedPercent: Double?; var resetsAt: String? }
    struct Claude: Decodable { var ok: Bool?; var tokens5h: Double?; var sessions5h: Int? }
    struct Local: Decodable { var ok: Bool?; var loaded: [String]? }
}

// MARK: formatting helpers

extension Color {
    init(hex: String?) {
        let h = (hex ?? "#6b7280").trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let v = UInt64(h, radix: 16) ?? 0x6b7280
        self.init(red: Double((v >> 16) & 0xff) / 255, green: Double((v >> 8) & 0xff) / 255, blue: Double(v & 0xff) / 255)
    }
    static let gold = Color(hex: "#d4af37")
    static let panel = Color(white: 0.11)
    static let needs = Color(hex: "#ff5a5f")
    static let safe = Color(hex: "#2fd17a")
    static let amber = Color(hex: "#f2b33d")
}

enum Fmt {
    private static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let isoPlain = ISO8601DateFormatter()

    static func date(_ s: String?) -> Date? {
        guard let s else { return nil }
        return iso.date(from: s) ?? isoPlain.date(from: s)
    }

    static func ago(_ s: String?) -> String {
        guard let d = date(s) else { return "" }
        let m = Int(-d.timeIntervalSinceNow / 60)
        if m < 1 { return "just now" }
        if m < 60 { return "\(m)m ago" }
        if m < 60 * 24 { return "\(m / 60)h ago" }
        return "\(m / 1440)d ago"
    }

    static func usd(_ v: Double?) -> String {
        guard let v else { return "—" }
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "USD"
        f.maximumFractionDigits = abs(v) >= 1000 ? 0 : 2
        return f.string(from: NSNumber(value: v)) ?? "$\(v)"
    }

    static func num(_ v: Double?) -> String {
        guard let v else { return "—" }
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.maximumFractionDigits = v < 1 ? 4 : 2
        return f.string(from: NSNumber(value: v)) ?? "\(v)"
    }

    static func isoNow(plusHours h: Double) -> String {
        iso.string(from: Date().addingTimeInterval(h * 3600))
    }
}
