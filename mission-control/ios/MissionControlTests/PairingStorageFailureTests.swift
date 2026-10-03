import XCTest
import Foundation
import Security

/// In-memory Security status fixture: no credentials, sockets or real Keychain access.
private final class ControlledKeychain {
    var data: Data?
    var updateStatus: OSStatus?
    var addStatus: OSStatus?
    var deleteStatus: OSStatus?
    var calls: [String] = []
    func operations() -> PairingKeychainOperations {
        PairingKeychainOperations(
            copy: { _, out in
                guard let data = self.data else { return errSecItemNotFound }
                out?.pointee = data as CFData
                return errSecSuccess
            },
            add: { query in
                self.calls.append("add")
                if let status = self.addStatus { return status }
                guard self.data == nil else { return errSecDuplicateItem }
                self.data = (query as NSDictionary)[kSecValueData] as? Data
                return errSecSuccess
            },
            update: { _, attributes in
                self.calls.append("update")
                if let status = self.updateStatus { return status }
                guard self.data != nil else { return errSecItemNotFound }
                self.data = (attributes as NSDictionary)[kSecValueData] as? Data
                return errSecSuccess
            },
            delete: { _ in
                self.calls.append("delete")
                if let status = self.deleteStatus { return status }
                guard self.data != nil else { return errSecItemNotFound }
                self.data = nil
                return errSecSuccess
            })
    }
    func store() -> PairingKeychainStore { PairingKeychainStore(service: "synthetic-controlled-only", operations: operations()) }
}

@MainActor
final class PairingStorageFailureTests: XCTestCase {
    let a = Pairing(v: 1, name: "Synthetic A", urls: ["https://a.invalid"], token: "synthetic-a", fp: String(repeating: "a", count: 64))
    var b: Pairing { var p = a; p.name = "Synthetic B"; return p }
    func text(_ p: Pairing) -> String { String(data: try! JSONEncoder().encode(p), encoding: .utf8)! }
    func testFailedReplacementPreservesPriorPairingAndController() throws {
        let fixture = ControlledKeychain(); let store = fixture.store(); try store.save(a)
        fixture.calls = []; fixture.updateStatus = errSecInteractionNotAllowed
        let model = AppModel(api: API(pairing: a), savePairing: store.save, clearPairing: store.clear, setBadge: { _ in })
        model.connected = true; model.lastSync = Date(timeIntervalSince1970: 42)
        let context = model.responseContext
        XCTAssertFalse(model.pair(with: text(b)))
        XCTAssertEqual(model.pairing, a); XCTAssertEqual(model.api.pairing, a)
        XCTAssertEqual(model.responseContext, context); XCTAssertTrue(model.connected)
        XCTAssertEqual(model.lastSync, Date(timeIntervalSince1970: 42))
        XCTAssertEqual(store.load(), a); XCTAssertEqual(fixture.calls, ["update"])
        XCTAssertEqual(model.error, "Your Mac pairing could not be saved securely. Try again.")
    }
    func testFailedFirstAddDoesNotClaimPaired() {
        let fixture = ControlledKeychain(); fixture.addStatus = errSecInteractionNotAllowed; let store = fixture.store()
        let model = AppModel(api: API(pairing: nil), savePairing: store.save, clearPairing: store.clear, setBadge: { _ in })
        XCTAssertFalse(model.pair(with: text(a))); XCTAssertNil(model.pairing); XCTAssertNil(model.api.pairing)
        XCTAssertNil(store.load()); XCTAssertNotNil(model.error); XCTAssertEqual(fixture.calls, ["update", "add"])
    }
    func testFailedClearPreservesPairingAndInvalidatesPendingWork() throws {
        let fixture = ControlledKeychain(); let store = fixture.store(); try store.save(a)
        fixture.deleteStatus = errSecInteractionNotAllowed
        let model = AppModel(api: API(pairing: a), savePairing: store.save, clearPairing: store.clear, setBadge: { _ in })
        let context = model.responseContext; model.connected = true
        XCTAssertFalse(model.unpair()); XCTAssertEqual(model.pairing, a); XCTAssertEqual(model.api.pairing, a)
        XCTAssertEqual(store.load(), a); XCTAssertNotEqual(model.responseContext, context)
        XCTAssertFalse(model.connected); XCTAssertEqual(model.error, "Your Mac pairing could not be removed securely. Try again.")
        XCTAssertEqual(model.toast, model.error)
    }
    func testMissingItemClearSucceeds() throws {
        let fixture = ControlledKeychain(); let store = fixture.store()
        XCTAssertNoThrow(try store.clear())
        let model = AppModel(api: API(pairing: a), savePairing: store.save, clearPairing: store.clear, setBadge: { _ in })
        XCTAssertTrue(model.unpair()); XCTAssertNil(model.pairing); XCTAssertNil(model.api.pairing)
    }
    func testDuplicateAddRetriesUpdateAndPersistsReplacement() throws {
        let fixture = ControlledKeychain(); try fixture.store().save(a)
        var operations = fixture.operations(); let update = operations.update; var updates = 0
        operations.update = { query, values in updates += 1; return updates == 1 ? errSecItemNotFound : update(query, values) }
        fixture.addStatus = errSecDuplicateItem
        let store = PairingKeychainStore(service: "synthetic-controlled-only", operations: operations)
        try store.save(b); XCTAssertEqual(store.load(), b); XCTAssertEqual(updates, 2)
    }
    func testDuplicateAddFailedRetryThrowsExactStatus() {
        let fixture = ControlledKeychain(); var operations = fixture.operations(); var updates = 0
        operations.update = { _, _ in updates += 1; return updates == 1 ? errSecItemNotFound : errSecInteractionNotAllowed }
        operations.add = { _ in errSecDuplicateItem }
        let store = PairingKeychainStore(service: "synthetic-controlled-only", operations: operations)
        XCTAssertThrowsError(try store.save(a)) { XCTAssertEqual(($0 as? PairingStorageError)?.status, errSecInteractionNotAllowed) }
        XCTAssertEqual(updates, 2)
    }
    func testInvalidCodeDoesNotWriteOrReplacePairing() {
        var writes = 0
        let model = AppModel(api: API(pairing: a), savePairing: { _ in writes += 1 }, clearPairing: {}, setBadge: { _ in })
        XCTAssertFalse(model.pair(with: "invalid")); XCTAssertEqual(writes, 0); XCTAssertEqual(model.pairing, a)
    }
}
