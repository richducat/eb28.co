import Foundation
import XCTest

@MainActor
final class TLSHandshakeTests: XCTestCase {
    struct Fixture: Decodable {
        let fingerprintA: String
        let fingerprintB: String
        let control: String
        let urls: [String: String]
    }
    struct Event: Decodable {
        let event: String
        let synthetic_a: Bool?
        let synthetic_b: Bool?
    }
    private func fixture() throws -> Fixture {
        let path = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "runtime", withExtension: "json"), "Run scripts/test-tls-loopback.sh to start the synthetic fixture.")
        return try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: path))
    }
    private func pairing(_ f: Fixture, url: String, b: Bool = false) -> Pairing {
        Pairing(v: 1, name: "Synthetic TLS fixture", urls: [url], token: b ? "fixture-b-not-a-credential" : "fixture-a-not-a-credential", fp: b ? f.fingerprintB : f.fingerprintA)
    }
    private func control(_ f: Fixture, _ path: String) async throws -> Data {
        // Loopback fixture coordination only; production HTTPS requests always use API.
        let (data, response) = try await URLSession.shared.data(from: URL(string: f.control + path)!)
        XCTAssertEqual((response as? HTTPURLResponse)?.statusCode, 200)
        return data
    }
    private func events(_ f: Fixture, _ server: String) async throws -> [Event] {
        let data = try await control(f, "/state")
        return try JSONDecoder().decode([String: [Event]].self, from: data)[server] ?? []
    }
    private func waitForAccepted(_ f: Fixture, _ server: String) async throws {
        for _ in 0..<100 {
            if try await events(f, server).contains(where: { $0.event == "accepted" }) { return }
            try await Task.sleep(nanoseconds: 20_000_000)
        }
        XCTFail("Synthetic server did not accept the pending connection")
        throw URLError(.timedOut)
    }
    func testMatchingLeafPinSucceedsOverActualTLS() async throws {
        let f = try fixture()
        let api = API(pairing: pairing(f, url: f.urls["match_a"]!))
        let board: Board = try await api.get("/api/board")
        XCTAssertEqual(board.generatedAt, "match_a")
        let received = try await events(f, "match_a")
        XCTAssertTrue(received.contains(where: { $0.event == "handshake" }))
        XCTAssertTrue(received.contains(where: { $0.event == "request" && $0.synthetic_a == true }))
    }
    func testMismatchedLeafPinRejectsBeforeHTTPAuthorization() async throws {
        let f = try fixture()
        let api = API(pairing: pairing(f, url: f.urls["mismatch_b"]!))
        do {
            let _: Board = try await api.get("/api/board")
            XCTFail("Mismatched certificate was trusted")
        } catch { XCTAssertTrue(error is APIError) }
        let received = try await events(f, "mismatch_b")
        XCTAssertFalse(received.contains(where: { $0.event == "request" }))
        XCTAssertTrue(received.contains(where: { $0.event == "accepted" }))
    }
    func testOldRequestRetainsAPinAfterPairB() async throws {
        let f = try fixture()
        let api = API(pairing: pairing(f, url: f.urls["held_a"]!))
        let pending = Task { () -> Bool in
            do { let _: Board = try await api.get("/api/board"); return false }
            catch { return error is CancellationError }
        }
        try await waitForAccepted(f, "held_a")
        api.use(pairing(f, url: f.urls["match_a"]!, b: true))
        _ = try await control(f, "/release/held_a")
        let discarded = await pending.value
        XCTAssertTrue(discarded, "Stale result must be discarded")
        let received = try await events(f, "held_a")
        XCTAssertTrue(received.contains(where: { $0.event == "handshake" }))
        XCTAssertTrue(received.contains(where: { $0.event == "request" && $0.synthetic_a == true }))
        XCTAssertFalse(received.contains(where: { $0.synthetic_b == true }))
    }
    func testOldRequestCannotTrustBPinAfterPairB() async throws {
        let f = try fixture()
        let api = API(pairing: pairing(f, url: f.urls["held_b"]!))
        let pending = Task { () -> Bool in
            do { let _: Board = try await api.get("/api/board"); return false }
            catch { return error is CancellationError }
        }
        try await waitForAccepted(f, "held_b")
        api.use(pairing(f, url: f.urls["mismatch_b"]!, b: true))
        _ = try await control(f, "/release/held_b")
        let discarded = await pending.value
        XCTAssertTrue(discarded, "Stale result must be discarded")
        let received = try await events(f, "held_b")
        XCTAssertFalse(received.contains(where: { $0.event == "request" }), "B certificate must not receive A authorization")
    }
}
