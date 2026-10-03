import CryptoKit
import Foundation
import Security

/// What the phone learns from the QR code in Mission Control → Phone on the Mac.
struct Pairing: Codable, Equatable {
    var v: Int
    var name: String
    var urls: [String]
    var token: String
    var fp: String

    static func parse(_ text: String) -> Pairing? {
        guard let data = text.trimmingCharacters(in: .whitespacesAndNewlines).data(using: .utf8),
              let p = try? JSONDecoder().decode(Pairing.self, from: data),
              !p.token.isEmpty, p.fp.count == 64, !p.urls.isEmpty else { return nil }
        return p
    }
}

/// Security operations are injectable so failure behavior is tested without a real credential.
struct PairingKeychainOperations {
    var copy: (CFDictionary, UnsafeMutablePointer<CFTypeRef?>?) -> OSStatus = { SecItemCopyMatching($0, $1) }
    var add: (CFDictionary) -> OSStatus = { SecItemAdd($0, nil) }
    var update: (CFDictionary, CFDictionary) -> OSStatus = { SecItemUpdate($0, $1) }
    var delete: (CFDictionary) -> OSStatus = { SecItemDelete($0) }
}

struct PairingStorageError: LocalizedError {
    let operation: String
    let status: OSStatus
    var errorDescription: String? {
        "Your Mac pairing could not be \(operation == "remove" ? "removed" : "saved") securely. Try again."
    }
}

struct PairingKeychainStore {
    let service: String
    var operations = PairingKeychainOperations()
    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service]
    }

    func load() -> Pairing? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard operations.copy(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(Pairing.self, from: data)
    }

    func save(_ p: Pairing) throws {
        let data = try JSONEncoder().encode(p)
        let attributes: [String: Any] = [kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        // Update in place: a failed replacement must not erase the previous pairing.
        let updated = operations.update(query as CFDictionary, attributes as CFDictionary)
        if updated == errSecSuccess { return }
        guard updated == errSecItemNotFound else { throw PairingStorageError(operation: "save", status: updated) }
        let added = operations.add(query.merging(attributes) { _, new in new } as CFDictionary)
        // An item could appear between update and add. Replace it once, never delete it.
        if added == errSecDuplicateItem {
            let retried = operations.update(query as CFDictionary, attributes as CFDictionary)
            guard retried == errSecSuccess else { throw PairingStorageError(operation: "save", status: retried) }
        } else if added != errSecSuccess {
            throw PairingStorageError(operation: "save", status: added)
        }
    }

    func clear() throws {
        let status = operations.delete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw PairingStorageError(operation: "remove", status: status)
        }
    }
}

/// The pairing holds a secret token, so it lives in the Keychain (this device only).
enum PairingStore {
    private static let store = PairingKeychainStore(service: "co.eb28.missioncontrol.pairing")
    static func load() -> Pairing? { store.load() }
    static func save(_ p: Pairing) throws { try store.save(p) }
    static func clear() throws { try store.clear() }
}

enum APIError: LocalizedError {
    case notPaired, unreachable, server(String), unauthorized

    var errorDescription: String? {
        switch self {
        case .notPaired: return "Not paired with a Mac yet."
        case .unreachable: return "Can't reach your Mac. Make sure you're on the same Wi-Fi and Mission Control is open."
        case .unauthorized: return "This phone was unpaired. Scan the code in Mission Control → Phone again."
        case .server(let m): return m
        }
    }
}

/// Talks to Mission Control on the Mac over HTTPS, trusting only the certificate whose
/// fingerprint came in the pairing code (certificate pinning).
@MainActor
final class API {
    private var generation = UUID()
    private(set) var pairing: Pairing?
    private var base: String?
    private let configuration: URLSessionConfiguration
    private lazy var session: URLSession = {
        let c = configuration
        c.timeoutIntervalForRequest = 120
        c.waitsForConnectivity = false
        return URLSession(configuration: c)
    }()

    init(pairing: Pairing?, configuration: URLSessionConfiguration = .ephemeral) {
        self.configuration = configuration
        self.pairing = pairing
    }

    func use(_ p: Pairing?) {
        generation = UUID()
        pairing = p
        base = nil
    }

    var macName: String { pairing?.name ?? "" }

    func get<T: Decodable>(_ path: String, as: T.Type = T.self) async throws -> T {
        try decode(await send("GET", path, body: nil))
    }

    @discardableResult
    func post<T: Decodable>(_ path: String, _ body: [String: Any], as: T.Type = T.self, timeout: TimeInterval = 45) async throws -> T {
        try decode(await send("POST", path, body: body, timeout: timeout))
    }

    private func decode<T: Decodable>(_ data: Data) throws -> T {
        do { return try JSONDecoder().decode(T.self, from: data) } catch {
            throw APIError.server("Unexpected reply from the Mac (\(error.localizedDescription)).")
        }
    }

    /// Try the address that worked last, then every address in the pairing code.
    private func send(_ method: String, _ path: String, body: [String: Any]?, timeout: TimeInterval = 15) async throws -> Data {
        guard let p = pairing else { throw APIError.notPaired }
        let owner = generation
        let pin = CertificatePinningDelegate(fingerprint: p.fp)
        let candidates = ([base].compactMap { $0 } + p.urls).reduce(into: [String]()) { if !$0.contains($1) { $0.append($1) } }
        var lastError: Error = APIError.unreachable
        for b in candidates {
            guard generation == owner else { throw CancellationError() }
            guard let url = URL(string: b + path) else { continue }
            var req = URLRequest(url: url)
            req.httpMethod = method
            req.timeoutInterval = timeout
            req.setValue("Bearer \(p.token)", forHTTPHeaderField: "Authorization")
            if let body {
                req.setValue("application/json", forHTTPHeaderField: "Content-Type")
                req.httpBody = try JSONSerialization.data(withJSONObject: body)
            }
            do {
                let (data, resp) = try await session.data(for: req, delegate: pin)
                guard generation == owner else { throw CancellationError() }
                let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
                base = b
                if code == 401 { throw APIError.unauthorized }
                if code >= 400 {
                    let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
                    throw APIError.server(msg ?? "The Mac answered with an error (\(code)).")
                }
                return data
            } catch where generation != owner {
                throw CancellationError()
            } catch let e as APIError {
                throw e
            } catch let e as URLError where body != nil && ![.cannotConnectToHost, .cannotFindHost, .notConnectedToInternet, .dnsLookupFailed, .networkConnectionLost].contains(e.code) {
                // the Mac may have received this action (e.g. a slow restart): never send it twice
                throw e.code == .timedOut ? APIError.server("Your Mac is taking a while. Check back in a moment before trying again.") : APIError.unreachable
            } catch {
                lastError = APIError.unreachable
                continue
            }
        }
        throw lastError
    }

}

/// Each request retains its original pairing fingerprint across suspension.
private final class CertificatePinningDelegate: NSObject, URLSessionTaskDelegate {
    let fingerprint: String
    init(fingerprint: String) { self.fingerprint = fingerprint.lowercased() }

    func urlSession(_ session: URLSession, task: URLSessionTask, didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust,
              let chain = SecTrustCopyCertificateChain(trust) as? [SecCertificate],
              let leaf = chain.first else {
            return completionHandler(.cancelAuthenticationChallenge, nil)
        }
        let der = SecCertificateCopyData(leaf) as Data
        let fp = SHA256.hash(data: der).map { String(format: "%02x", $0) }.joined()
        if fp == fingerprint {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
