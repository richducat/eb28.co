import XCTest
import Foundation
import Combine

/// Every request stays inside URLProtocol; there is no socket or production credential.
final class HeldProtocol: URLProtocol {
    static let lock = NSLock()
    static var handlers: [String: (HeldProtocol) -> Void] = [:]
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.lock.lock(); let handler = Self.handlers[request.value(forHTTPHeaderField: "X-Test-Session") ?? ""]; Self.lock.unlock()
        guard let handler else { fatalError("Unexpected transport request") }
        handler(self)
    }
    override func stopLoading() {}
    func reply(_ json: String = "{}", status: Int = 200) {
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(json.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    func fail() { client?.urlProtocol(self, didFailWithError: URLError(.cannotConnectToHost)) }
    static func install(id: String, _ handler: @escaping (HeldProtocol) -> Void) {
        lock.lock(); self.handlers[id] = handler; lock.unlock()
    }
}

@MainActor
final class PairingOwnershipTests: XCTestCase {
    private let transportID = UUID().uuidString
    private func install(_ handler: @escaping (HeldProtocol) -> Void) { HeldProtocol.install(id: transportID, handler) }
    private func configuration() -> URLSessionConfiguration {
        let c = URLSessionConfiguration.ephemeral
        c.protocolClasses = [HeldProtocol.self]
        c.httpAdditionalHeaders = ["X-Test-Session": transportID]
        return c
    }
    let a = Pairing(v: 1, name: "Synthetic A", urls: ["https://a.invalid"], token: "synthetic-a", fp: String(repeating: "a", count: 64))
    let b = Pairing(v: 1, name: "Synthetic B", urls: ["https://b.invalid"], token: "synthetic-b", fp: String(repeating: "b", count: 64))
    func model() -> AppModel {
        let c = configuration()
        return AppModel(api: API(pairing: a, configuration: c), savePairing: { _ in }, clearPairing: {}, setBadge: { _ in })
    }
    func pairB(_ m: AppModel) { XCTAssertTrue(m.pair(with: String(data: try! JSONEncoder().encode(b), encoding: .utf8)!)) }
    func normalReply(_ p: HeldProtocol) {
        if p.request.url!.path == "/api/board" { p.reply("{\"generatedAt\":\"\(p.request.url!.host!)\"}") }
        else if p.request.url!.path == "/api/today" {
            let date = URLComponents(url: p.request.url!, resolvingAgainstBaseURL: false)!.queryItems!.first!.value!
            p.reply("{\"date\":\"\(date)\",\"events\":[],\"tomorrowEvents\":[],\"due\":{\"overdue\":[],\"today\":[],\"tomorrow\":[],\"week\":[],\"later\":[],\"someday\":[]},\"habits\":[],\"streaks\":{},\"needsYou\":[]}")
        } else { p.reply() }
    }
    func testUnpairDiscardsPendingBoardSuccess() async {
        let m = model(); let started = expectation(description: "A held")
        var pending: HeldProtocol!
        install { p in
            if p.request.url!.path == "/api/board" { pending = p; started.fulfill() }
            else { self.normalReply(p) }
        }
        let task = Task { await m.refresh() }
        await fulfillment(of: [started], timeout: 3)
        m.unpair(); pending.reply("{\"generatedAt\":\"old-A\"}")
        await task.value
        XCTAssertNil(m.pairing); XCTAssertNil(m.board); XCTAssertNil(m.today)
        XCTAssertFalse(m.connected); XCTAssertNil(m.lastSync)
    }
    func testOldUnauthorizedDoesNotUnpairB() async {
        let m = model(); let started = expectation(description: "A held")
        var pending: HeldProtocol!
        install { p in
            if p.request.url!.host == "a.invalid" && p.request.url!.path == "/api/board" { pending = p; started.fulfill() }
            else { self.normalReply(p) }
        }
        let task = Task { await m.refresh() }
        await fulfillment(of: [started], timeout: 3)
        pairB(m); pending.reply(status: 401); await task.value
        XCTAssertEqual(m.pairing, b)
        await m.refresh()
        XCTAssertEqual(m.board?.generatedAt, "b.invalid"); XCTAssertTrue(m.connected)
    }
    func testCurrentRefreshAndCurrentUnauthorized() async {
        let m = model()
        install { self.normalReply($0) }
        await m.refresh()
        XCTAssertEqual(m.board?.generatedAt, "a.invalid"); XCTAssertEqual(m.today?.date, m.day)
        XCTAssertTrue(m.connected); XCTAssertNotNil(m.lastSync)
        install { $0.reply(status: 401) }
        await m.refresh()
        XCTAssertNil(m.pairing); XCTAssertNil(m.board); XCTAssertNil(m.today); XCTAssertFalse(m.connected)
    }
    func testDaySelectionDiscardsPendingToday() async {
        let m = model(); let started = expectation(description: "old day held")
        let newStarted = expectation(description: "new day held")
        let published = expectation(description: "new day published before old reply")
        let oldDay = m.day, newDay = Fmt.addDays(m.day, 1)
        var pending: HeldProtocol!, newer: HeldProtocol!
        let subscription = m.$today.sink { if $0?.date == newDay { published.fulfill() } }
        install { p in
            let date = URLComponents(url: p.request.url!, resolvingAgainstBaseURL: false)?.queryItems?.first?.value
            if date == oldDay { pending = p; started.fulfill() }
            else if date == newDay { newer = p; newStarted.fulfill() }
            else { self.normalReply(p) }
        }
        let task = Task { await m.loadToday() }
        await fulfillment(of: [started], timeout: 3)
        m.shiftDay(1)
        await fulfillment(of: [newStarted], timeout: 3)
        self.normalReply(newer)
        await fulfillment(of: [published], timeout: 3)
        self.normalReply(pending); await task.value
        XCTAssertEqual(m.today?.date, newDay)
        withExtendedLifetime(subscription) {}
    }
    func testStaleTransportDoesNotRetryAAfterPairB() async {
        let c = configuration()
        var multi = a; multi.urls.append("https://a-fallback.invalid")
        let api = API(pairing: multi, configuration: c)
        let started = expectation(description: "A first address held")
        let fallback = expectation(description: "stale A fallback forbidden"); fallback.isInverted = true
        var pending: HeldProtocol!
        install { p in
            if p.request.url!.host == "a.invalid" { pending = p; started.fulfill() }
            else { fallback.fulfill(); p.reply() }
        }
        let task = Task { try? await api.get("/api/board", as: Board.self) }
        await fulfillment(of: [started], timeout: 3)
        api.use(b); pending.fail(); _ = await task.value
        await fulfillment(of: [fallback], timeout: 0.1)
    }
    func testOldTransportCannotPreferAForB() async {
        let m = model(); let started = expectation(description: "A held")
        var pending: HeldProtocol!; let wrongHost = expectation(description: "B token never sent to A"); wrongHost.isInverted = true
        install { p in
            if p.request.value(forHTTPHeaderField: "Authorization") == "Bearer synthetic-b" && p.request.url!.host == "a.invalid" { wrongHost.fulfill() }
            if p.request.value(forHTTPHeaderField: "Authorization") == "Bearer synthetic-a" { pending = p; started.fulfill() }
            else { self.normalReply(p) }
        }
        let task = Task { try? await m.api.get("/api/board", as: Board.self) }
        await fulfillment(of: [started], timeout: 3)
        m.api.use(b); pending.reply(); _ = await task.value
        let _: Board? = try? await m.api.get("/api/board")
        await fulfillment(of: [wrongHost], timeout: 0.1)
    }
    func testOldAskDoesNotPopulateNewPair() async {
        let m = model(); let started = expectation(description: "ask held"); var pending: HeldProtocol!
        install { p in
            if p.request.url!.path == "/api/ask" { pending = p; started.fulfill() } else { self.normalReply(p) }
        }
        let j = Job(id: "old", source: "codex", title: "Synthetic", status: "needs_you")
        let task = Task { await m.loadAsk(j) }
        await fulfillment(of: [started], timeout: 3)
        pairB(m); pending.reply("{\"question\":\"old-A\"}"); await task.value
        XCTAssertNil(m.asks[j.id])
    }
    func testUnpairDiscardsPendingSecondaryRefresh() async {
        let m = model(); let started = expectation(description: "trading held")
        var pending: HeldProtocol!
        install { p in
            if p.request.url!.path == "/api/trading" { pending = p; started.fulfill() }
            else { self.normalReply(p) }
        }
        let task = Task { await m.refresh() }
        await fulfillment(of: [started], timeout: 3)
        m.unpair(); pending.reply("{\"at\":\"old-A\"}"); await task.value
        XCTAssertNil(m.trading); XCTAssertNil(m.board); XCTAssertNil(m.today)
    }
    func testRePairingSameCodeStillDiscardsOldUnauthorized() async {
        let m = model(); let started = expectation(description: "first board held")
        var pending: HeldProtocol!
        install { p in
            if pending == nil && p.request.url!.path == "/api/board" { pending = p; started.fulfill() }
            else { self.normalReply(p) }
        }
        let task = Task { await m.refresh() }
        await fulfillment(of: [started], timeout: 3)
        XCTAssertTrue(m.pair(with: String(data: try! JSONEncoder().encode(a), encoding: .utf8)!))
        pending.reply(status: 401); await task.value
        XCTAssertEqual(m.pairing, a)
    }
    func testFocusSuggestionDiscardedAfterDayChange() async {
        let m = model(); let started = expectation(description: "suggestion held")
        var pending: HeldProtocol!
        install { p in
            if p.request.url!.path == "/api/today/suggest" { pending = p; started.fulfill() }
            else { self.normalReply(p) }
        }
        let task = Task { await m.suggestFocus() }
        await fulfillment(of: [started], timeout: 3)
        m.shiftDay(1); pending.reply("{\"focus\":[\"old day\"]}")
        let result = await task.value
        XCTAssertTrue(result.isEmpty)
    }
    func testCurrentPairCanStillUseFallback() async {
        let c = configuration()
        var multi = a; multi.urls.append("https://a-fallback.invalid")
        let api = API(pairing: multi, configuration: c)
        install { p in
            if p.request.url!.host == "a.invalid" { p.fail() }
            else { p.reply("{\"generatedAt\":\"fallback\"}") }
        }
        let result: Board? = try? await api.get("/api/board")
        XCTAssertEqual(result?.generatedAt, "fallback")
    }
    func testOldActionCannotShowSuccessAfterUnpair() async {
        let m = model(); let started = expectation(description: "action held"); var pending: HeldProtocol!
        install { p in pending = p; started.fulfill() }
        let task = Task { await m.addTask("synthetic", defaultDue: nil) }
        await fulfillment(of: [started], timeout: 3)
        m.unpair(); pending.reply("{\"id\":\"old\",\"title\":\"old-A\"}"); await task.value
        XCTAssertNil(m.toast); XCTAssertTrue(m.busy.isEmpty)
    }
}
