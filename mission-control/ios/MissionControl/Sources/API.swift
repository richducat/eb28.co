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

/// The pairing holds a secret token, so it lives in the Keychain (this device only).
enum PairingStore {
    private static let service = "co.eb28.missioncontrol.pairing"

    static func load() -> Pairing? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(Pairing.self, from: data)
    }

    static func save(_ p: Pairing) {
        clear()
        guard let data = try? JSONEncoder().encode(p) else { return }
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                kSecValueData as String: data, kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        SecItemAdd(q as CFDictionary, nil)
    }

    static func clear() {
        SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service] as CFDictionary)
    }
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
final class API: NSObject, URLSessionDelegate {
    private(set) var pairing: Pairing?
    private var base: String?
    private lazy var session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.timeoutIntervalForRequest = 120
        c.waitsForConnectivity = false
        return URLSession(configuration: c, delegate: self, delegateQueue: nil)
    }()

    init(pairing: Pairing?) {
        self.pairing = pairing
        super.init()
    }

    func use(_ p: Pairing?) {
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
        let candidates = ([base].compactMap { $0 } + p.urls).reduce(into: [String]()) { if !$0.contains($1) { $0.append($1) } }
        var lastError: Error = APIError.unreachable
        for b in candidates {
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
                let (data, resp) = try await session.data(for: req)
                let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
                base = b
                if code == 401 { throw APIError.unauthorized }
                if code >= 400 {
                    let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
                    throw APIError.server(msg ?? "The Mac answered with an error (\(code)).")
                }
                return data
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

    // MARK: certificate pinning
    func urlSession(_ session: URLSession, didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust,
              let expected = pairing?.fp.lowercased(),
              let chain = SecTrustCopyCertificateChain(trust) as? [SecCertificate],
              let leaf = chain.first else {
            return completionHandler(.cancelAuthenticationChallenge, nil)
        }
        let der = SecCertificateCopyData(leaf) as Data
        let fp = SHA256.hash(data: der).map { String(format: "%02x", $0) }.joined()
        if fp == expected {
            completionHandler(.useCredential, URLCredential(trust: trust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
